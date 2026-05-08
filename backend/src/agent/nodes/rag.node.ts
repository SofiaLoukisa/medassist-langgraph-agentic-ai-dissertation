import { AIMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import { streamingLlm } from "../../lib/llm.js";
import { getRetriever } from "../../lib/vectorstore.js";
import { AgentStateType } from "../state.js";
import { RAG_PROMPT } from "../prompts.js";

export async function ragRetrieveNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  const query =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  const retriever = await getRetriever();
  const docs = await retriever.invoke(query);

  const retrievedDocs = docs.map((doc) => ({
    content: doc.pageContent,
    source: (doc.metadata?.pdfName as string) || (doc.metadata?.source as string) || "unknown",
    score: (doc.metadata?.score as number) ?? 0,
  }));

  return { retrievedDocs };
}

export async function ragRespondNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  const userQuestion =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  const contextText = state.retrievedDocs
    .map(
      (doc, i) =>
        `[Source ${i + 1}: ${doc.source}]\n${doc.content}`
    )
    .join("\n\n---\n\n");

  const systemPrompt = RAG_PROMPT.replace("{context}", contextText);

  const response = await streamingLlm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userQuestion),
  ]);

  const responseContent =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return {
    messages: [new AIMessage(responseContent)],
  };
}
