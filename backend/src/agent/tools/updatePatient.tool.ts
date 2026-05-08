import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { updatePatient } from "../../patient/patient.service.js";
import type { RunnableConfig } from "@langchain/core/runnables";

export const updatePatientTool = tool(
  async ({ patientId, name, dateOfBirth, gender, allergies, illnessHistory }, config?: RunnableConfig) => {
    const userId = config?.configurable?.userId as string | undefined;
    if (!userId) {
      return JSON.stringify({ error: "No user context available" });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (dateOfBirth !== undefined) data.dateOfBirth = dateOfBirth;
    if (gender !== undefined) data.gender = gender;
    if (allergies !== undefined) data.allergies = allergies;
    if (illnessHistory !== undefined) data.illnessHistory = illnessHistory;

    const updated = await updatePatient(patientId, userId, data);
    if (!updated) {
      return JSON.stringify({ error: "Patient not found or could not be updated." });
    }

    return JSON.stringify({
      message: `Patient "${updated.name}" updated successfully.`,
      id: updated.id,
      name: updated.name,
      dateOfBirth: updated.dateOfBirth,
      gender: updated.gender,
      allergies: updated.allergies,
      illnessHistory: updated.illnessHistory,
    });
  },
  {
    name: "update_patient",
    description:
      "Update an existing patient's information. Only provided fields will be updated. Use search_patients first to find the patient ID.",
    schema: z.object({
      patientId: z
        .string()
        .uuid()
        .describe("The UUID of the patient to update"),
      name: z.string().optional().describe("Updated full name"),
      dateOfBirth: z
        .string()
        .optional()
        .describe("Updated date of birth in YYYY-MM-DD format"),
      gender: z
        .string()
        .optional()
        .describe("Updated gender (male, female, other)"),
      allergies: z
        .array(z.string())
        .optional()
        .describe("Updated list of known allergies (replaces existing list)"),
      illnessHistory: z
        .string()
        .optional()
        .describe("Updated illness history text"),
    }),
  }
);
