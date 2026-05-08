import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "../../db/index.js";
import { patients, patientMedications } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const createPatientCardTool = tool(
  async ({ patientId }) => {
    // Fetch patient
    const patientRows = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (patientRows.length === 0) {
      return JSON.stringify({ error: "Patient not found" });
    }

    const patient = patientRows[0];

    // Fetch medications
    const meds = await db
      .select()
      .from(patientMedications)
      .where(eq(patientMedications.patientId, patientId));

    const activeMeds = meds.filter((m) => m.isActive);
    const inactiveMeds = meds.filter((m) => !m.isActive);

    return JSON.stringify({
      success: true,
      patientName: patient.name,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      allergies: patient.allergies || [],
      illnessHistory: patient.illnessHistory || "None recorded",
      aiSummary: patient.aiSummary || null,
      activeMedications: activeMeds.map((m) => ({
        name: m.medicineName,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route,
        startDate: m.startDate,
        foodInteraction: m.foodInteraction,
        warnings: m.warnings,
      })),
      pastMedications: inactiveMeds.map((m) => ({
        name: m.medicineName,
        dosage: m.dosage,
        endDate: m.endDate,
      })),
    });
  },
  {
    name: "create_patient_card",
    description:
      "Create a patient summary card with demographics, allergies, active and past medications, and health history. Returns structured patient data for you to present to the user in a clear, readable format.",
    schema: z.object({
      patientId: z
        .string()
        .uuid()
        .describe("The UUID of the patient to create the summary card for"),
    }),
  }
);
