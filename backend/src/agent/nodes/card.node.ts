import { AIMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import { llm, streamingLlm } from "../../lib/llm.js";
import { getRetriever } from "../../lib/vectorstore.js";
import { db } from "../../db/index.js";
import { patients, patientMedications } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { AgentStateType } from "../state.js";
import { CARD_PROMPT } from "../prompts.js";

export async function cardGenerateNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  let patientData: Record<string, unknown> = {};
  let medications: Array<Record<string, unknown>> = [];

  // Fetch patient info if patientId is available
  if (state.patientId) {
    const patientRows = await db
      .select()
      .from(patients)
      .where(eq(patients.id, state.patientId))
      .limit(1);

    if (patientRows.length > 0) {
      const patient = patientRows[0];
      patientData = {
        name: patient.name,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        allergies: patient.allergies,
        illnessHistory: patient.illnessHistory,
      };

      // Fetch active medications
      const meds = await db
        .select()
        .from(patientMedications)
        .where(eq(patientMedications.patientId, state.patientId));

      medications = meds
        .filter((m) => m.isActive)
        .map((m) => ({
          name: m.medicineName,
          dosage: m.dosage,
          frequency: m.frequency,
          route: m.route,
          startDate: m.startDate,
          endDate: m.endDate,
          foodInteraction: m.foodInteraction,
          warnings: m.warnings,
        }));
    }
  }

  // Enrich with RAG data for each medication
  const retriever = await getRetriever();
  const retrievedDocs: Array<{
    content: string;
    source: string;
    score: number;
  }> = [];

  for (const med of medications) {
    const docs = await retriever.invoke(
      `${med.name} dosage administration warnings`
    );
    for (const doc of docs) {
      retrievedDocs.push({
        content: doc.pageContent,
        source: (doc.metadata?.pdfName as string) || (doc.metadata?.source as string) || "unknown",
        score: (doc.metadata?.score as number) ?? 0,
      });
    }
  }

  const enrichedContext = retrievedDocs
    .map((d) => d.content)
    .join("\n\n");

  const patientDataText = JSON.stringify(
    {
      patient: patientData,
      medications,
      additionalContext: enrichedContext,
    },
    null,
    2
  );

  const systemPrompt = CARD_PROMPT.replace("{patientData}", patientDataText);

  // Also consider the user's message for any extra instructions
  const lastMessage = state.messages[state.messages.length - 1];
  const userContent =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  console.log(`[Card] Generating dosage card for patient=${state.patientId}, medications=${medications.length}, ragDocs=${retrievedDocs.length}`);
  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userContent),
  ]);

  const responseText =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  // Try to parse the JSON from the response
  let generatedCard: Record<string, unknown> | null = null;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      generatedCard = JSON.parse(jsonMatch[0]);
    }
  } catch {
    generatedCard = {
      raw: responseText,
      parseError: true,
    };
  }

  return {
    generatedCard,
    retrievedDocs,
  };
}

export async function cardRespondNode(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const card = state.generatedCard;

  let responseText: string;

  if (!card) {
    responseText =
      "I was unable to generate a dosage card. Please ensure a patient is selected and they have active medications on record.";
  } else if (card.parseError) {
    responseText = `Here is the dosage card information:\n\n${card.raw}`;
  } else {
    // Format the card nicely
    const cardJson = JSON.stringify(card, null, 2);

    console.log(`[Card] Formatting dosage card response`);
    const response = await streamingLlm.invoke([
      new SystemMessage(
        "You are MedAssist. Format the following dosage card JSON into a clear, readable message for healthcare professionals. Include all medications, timings, warnings, and interactions in an organized format. Also include the raw JSON at the end wrapped in a code block for system use."
      ),
      new HumanMessage(cardJson),
    ]);

    responseText =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);
  }

  return {
    messages: [new AIMessage(responseText)],
  };
}
