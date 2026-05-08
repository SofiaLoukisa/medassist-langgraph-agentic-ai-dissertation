import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "../../db/index.js";
import { patients, patientMedications } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const addMedicationTool = tool(
  async ({ patientId, medicineName, dosage, frequency, route }) => {
    // Verify patient exists
    const patientRows = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (patientRows.length === 0) {
      return JSON.stringify({ error: "Patient not found. Use search_patients to find the correct patient ID." });
    }

    const [medication] = await db
      .insert(patientMedications)
      .values({
        patientId,
        medicineName,
        dosage: dosage || null,
        frequency: frequency || null,
        route: route || null,
      })
      .returning();

    return JSON.stringify({
      message: `Medication "${medicineName}" added to patient "${patientRows[0].name}".`,
      medicationId: medication.id,
      patientId,
      patientName: patientRows[0].name,
      medicineName: medication.medicineName,
      dosage: medication.dosage,
      frequency: medication.frequency,
      route: medication.route,
    });
  },
  {
    name: "add_medication",
    description:
      "Add a medication to a patient's active medication list. Requires the patient's ID (use search_patients first to find it). The medication will be marked as active.",
    schema: z.object({
      patientId: z
        .string()
        .uuid()
        .describe("The UUID of the patient to add medication to"),
      medicineName: z.string().describe("Name of the medication"),
      dosage: z
        .string()
        .optional()
        .describe("Dosage amount (e.g., '5mg', '10mg twice daily')"),
      frequency: z
        .string()
        .optional()
        .describe("How often to take (e.g., 'once daily', 'twice daily')"),
      route: z
        .string()
        .optional()
        .describe("Administration route (e.g., 'oral', 'topical', 'IV')"),
    }),
  }
);
