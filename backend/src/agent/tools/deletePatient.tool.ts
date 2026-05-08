import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { deletePatient } from "../../patient/patient.service.js";
import type { RunnableConfig } from "@langchain/core/runnables";

export const deletePatientTool = tool(
  async ({ patientId }, config?: RunnableConfig) => {
    const userId = config?.configurable?.userId as string | undefined;
    if (!userId) {
      return JSON.stringify({ error: "No user context available" });
    }

    const deleted = await deletePatient(patientId, userId);
    if (!deleted) {
      return JSON.stringify({ error: "Patient not found or could not be deleted." });
    }

    return JSON.stringify({
      message: "Patient deleted successfully.",
      patientId,
    });
  },
  {
    name: "delete_patient",
    description:
      "Delete a patient record by ID. This permanently removes the patient and all associated data (medications, dosage cards). Always confirm with the user before deleting. Use search_patients first to find the correct patient.",
    schema: z.object({
      patientId: z
        .string()
        .uuid()
        .describe("The UUID of the patient to delete"),
    }),
  }
);
