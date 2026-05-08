import { AIMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import { llm, streamingLlm } from "../../lib/llm.js";
import { getRetriever } from "../../lib/vectorstore.js";
import { AgentStateType } from "../state.js";
import { INTERACTION_PROMPT } from "../prompts.js";
import { z } from "zod";

const drugExtractionSchema = z.object({
  drugs: z.array(z.string()).describe("List of drug/medicine names mentioned"),
});

export async function interactionCheckNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  const userContent =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  // Extract drug names from the message
  const structuredLlm = llm.withStructuredOutput(drugExtractionSchema);
  const extraction = await structuredLlm.invoke([
    new HumanMessage(
      `Extract all medicine/drug names from this message. Return them as a list.\n\nMessage: "${userContent}"`
    ),
  ]);

  const drugs = extraction.drugs;
  const retriever = await getRetriever();
  const allRetrievedDocs: Array<{
    content: string;
    source: string;
    score: number;
  }> = [];
  const interactionResults: Array<{
    drug1: string;
    drug2: string;
    severity: string;
    description: string;
  }> = [];

  // Query for each pair of drugs
  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const query = `drug interaction between ${drugs[i]} and ${drugs[j]}`;
      const docs = await retriever.invoke(query);

      const mappedDocs = docs.map((doc) => ({
        content: doc.pageContent,
        source: (doc.metadata?.pdfName as string) || (doc.metadata?.source as string) || "unknown",
        score: (doc.metadata?.score as number) ?? 0,
      }));

      allRetrievedDocs.push(...mappedDocs);

      const contextText = mappedDocs
        .map((d) => d.content)
        .join("\n");

      // Analyze this specific interaction
      const interactionSchema = z.object({
        severity: z
          .enum(["mild", "moderate", "severe", "contraindicated", "unknown"])
          .describe("Severity of the interaction"),
        description: z
          .string()
          .describe("Description of the interaction"),
      });

      const analysisLlm = llm.withStructuredOutput(interactionSchema);
      const analysis = await analysisLlm.invoke([
        new HumanMessage(
          `Based on this context, analyze the interaction between ${drugs[i]} and ${drugs[j]}.\n\nContext: ${contextText}\n\nIf no interaction info is found, use severity "unknown" and note that no data was found.`
        ),
      ]);

      interactionResults.push({
        drug1: drugs[i],
        drug2: drugs[j],
        severity: analysis.severity,
        description: analysis.description,
      });
    }
  }

  return {
    interactionResults,
    retrievedDocs: allRetrievedDocs,
  };
}

export async function interactionRespondNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  const userContent =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  const interactionsText = state.interactionResults
    .map(
      (r) =>
        `- ${r.drug1} + ${r.drug2}: [${r.severity.toUpperCase()}] ${r.description}`
    )
    .join("\n");

  const systemPrompt = INTERACTION_PROMPT.replace(
    "{interactions}",
    interactionsText
  );

  const response = await streamingLlm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userContent),
  ]);

  const responseContent =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return {
    messages: [new AIMessage(responseContent)],
  };
}
