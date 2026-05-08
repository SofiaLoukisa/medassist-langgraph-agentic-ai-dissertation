import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "../../db/index.js";
import { patients, patientMedications } from "../../db/schema.js";
import { eq, ilike, and } from "drizzle-orm";
import type { RunnableConfig } from "@langchain/core/runnables";

export const searchPatientsTool = tool(
  async ({ query }, config?: RunnableConfig) => {
    const userId = config?.configurable?.userId as string | undefined;
    if (!userId) {
      return JSON.stringify({ error: "No user context available" });
    }

    const results = await db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.userId, userId),
          ilike(patients.name, `%${query}%`)
        )
      )
      .limit(10);

    if (results.length === 0) {
      return JSON.stringify({
        message: `No patients found matching "${query}". You can create a new patient using the create_patient tool.`,
        patients: [],
      });
    }

    // Fetch medication counts for each patient
    const patientsWithMeds = await Promise.all(
      results.map(async (p) => {
        const meds = await db
          .select()
          .from(patientMedications)
          .where(
            and(
              eq(patientMedications.patientId, p.id),
              eq(patientMedications.isActive, true)
            )
          );
        return {
          id: p.id,
          name: p.name,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
          allergies: p.allergies,
          activeMedicationCount: meds.length,
          medications: meds.map((m) => m.medicineName),
        };
      })
    );

    return JSON.stringify({ patients: patientsWithMeds });
  },
  {
    name: "search_patients",
    description:
      "Search for patients by name. Returns matching patients with their IDs, basic info, and active medication names. Use this to find a patient's ID before creating dosage cards or adding medications.",
    schema: z.object({
      query: z
        .string()
        .describe("The patient name or partial name to search for"),
    }),
  }
);
