import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { generateDosageCard } from "../../medicine/medicine.service.js";
import type { RunnableConfig } from "@langchain/core/runnables";

export const createDosageCardTool = tool(
  async ({ patientId }, config?: RunnableConfig) => {
    const userId = config?.configurable?.userId as string | undefined;
    if (!userId) {
      return JSON.stringify({ error: "No user context available" });
    }

    const card = await generateDosageCard(patientId, userId);

    if (!card) {
      return JSON.stringify({ error: "Patient not found or has no active medications." });
    }

    return JSON.stringify({
      success: true,
      cardId: card.id,
      title: card.title,
      cardData: card.cardData,
    });
  },
  {
    name: "create_dosage_card",
    description:
      "Generate and save a dosage card for a patient. Fetches the patient's active medications, enriches them with information from the medical knowledge base, and saves the card to the database. Returns structured medication data for you to present to the user in a clear, readable format.",
    schema: z.object({
      patientId: z
        .string()
        .uuid()
        .describe("The UUID of the patient to create the dosage card for"),
    }),
  }
);
