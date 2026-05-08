import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "../../db/index.js";
import { patients } from "../../db/schema.js";
import type { RunnableConfig } from "@langchain/core/runnables";

export const createPatientTool = tool(
  async ({ name, dateOfBirth, gender, allergies }, config?: RunnableConfig) => {
    const userId = config?.configurable?.userId as string | undefined;
    if (!userId) {
      return JSON.stringify({ error: "No user context available" });
    }

    const [patient] = await db
      .insert(patients)
      .values({
        userId,
        name,
        dateOfBirth: dateOfBirth || null,
        gender: gender || null,
        allergies: allergies || [],
      })
      .returning();

    return JSON.stringify({
      message: `Patient "${patient.name}" created successfully.`,
      id: patient.id,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      allergies: patient.allergies,
    });
  },
  {
    name: "create_patient",
    description:
      "Create a new patient record. Use this when the user mentions a patient that doesn't exist yet. Returns the new patient's ID which can be used with other tools.",
    schema: z.object({
      name: z.string().describe("Full name of the patient"),
      dateOfBirth: z
        .string()
        .optional()
        .describe("Date of birth in YYYY-MM-DD format"),
      gender: z
        .string()
        .optional()
        .describe("Gender of the patient (male, female, other)"),
      allergies: z
        .array(z.string())
        .optional()
        .describe("List of known allergies"),
    }),
  }
);
