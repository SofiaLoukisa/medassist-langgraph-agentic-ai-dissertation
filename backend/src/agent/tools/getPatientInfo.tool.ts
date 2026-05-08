import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "../../db/index.js";
import { patients, patientMedications } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

export const getPatientInfoTool = tool(
  async ({ patientId }) => {
    const patientRows = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (patientRows.length === 0) {
      return JSON.stringify({ error: "Patient not found" });
    }

    const patient = patientRows[0];

    const meds = await db
      .select()
      .from(patientMedications)
      .where(eq(patientMedications.patientId, patientId));

    const activeMeds = meds.filter((m) => m.isActive);
    const inactiveMeds = meds.filter((m) => !m.isActive);

    return JSON.stringify({
      id: patient.id,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      allergies: patient.allergies,
      illnessHistory: patient.illnessHistory,
      aiSummary: patient.aiSummary,
      activeMedications: activeMeds.map((m) => ({
        id: m.id,
        name: m.medicineName,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route,
        foodInteraction: m.foodInteraction,
        warnings: m.warnings,
      })),
      pastMedications: inactiveMeds.map((m) => ({
        id: m.id,
        name: m.medicineName,
        dosage: m.dosage,
      })),
    });
  },
  {
    name: "get_patient_info",
    description:
      "Get detailed information about a specific patient including their demographics, allergies, illness history, and all medications (active and past). Use this after finding a patient's ID with search_patients.",
    schema: z.object({
      patientId: z
        .string()
        .uuid()
        .describe("The UUID of the patient to look up"),
    }),
  }
);
