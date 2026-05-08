import { db } from "../db/index.js";
import {
  patients,
  patientMedications,
  type NewPatient,
  type NewPatientMedication,
} from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { llm } from "../lib/llm.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function createPatient(
  userId: string,
  data: Omit<NewPatient, "id" | "userId" | "createdAt" | "updatedAt">
) {
  const [patient] = await db
    .insert(patients)
    .values({ ...data, userId })
    .returning();
  return patient;
}

export async function getPatients(userId: string) {
  return db.query.patients.findMany({
    where: eq(patients.userId, userId),
    orderBy: patients.name,
  });
}

export async function getPatientById(patientId: string, userId: string) {
  return db.query.patients.findFirst({
    where: and(eq(patients.id, patientId), eq(patients.userId, userId)),
    with: { medications: true },
  });
}

export async function updatePatient(
  patientId: string,
  userId: string,
  data: Partial<Omit<NewPatient, "id" | "userId" | "createdAt" | "updatedAt">>
) {
  const [updated] = await db
    .update(patients)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(patients.id, patientId), eq(patients.userId, userId)))
    .returning();
  return updated;
}

export async function deletePatient(patientId: string, userId: string) {
  const result = await db
    .delete(patients)
    .where(and(eq(patients.id, patientId), eq(patients.userId, userId)))
    .returning();
  return result.length > 0;
}

export async function addMedication(
  patientId: string,
  data: Omit<NewPatientMedication, "id" | "patientId" | "createdAt" | "updatedAt">
) {
  const [med] = await db
    .insert(patientMedications)
    .values({ ...data, patientId })
    .returning();
  return med;
}

export async function updateMedication(
  medicationId: string,
  data: Partial<Omit<NewPatientMedication, "id" | "patientId" | "createdAt" | "updatedAt">>
) {
  const [updated] = await db
    .update(patientMedications)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(patientMedications.id, medicationId))
    .returning();
  return updated;
}

export async function deleteMedication(medicationId: string) {
  const result = await db
    .delete(patientMedications)
    .where(eq(patientMedications.id, medicationId))
    .returning();
  return result.length > 0;
}

export async function generateAiSummary(patientId: string, userId: string) {
  const patient = await getPatientById(patientId, userId);
  if (!patient) return null;

  const medsText = patient.medications
    .filter((m) => m.isActive)
    .map((m) => `- ${m.medicineName} ${m.dosage || ""} ${m.frequency || ""}`)
    .join("\n");

  const result = await llm.invoke([
    new SystemMessage(`You are a clinical documentation specialist. Generate professional patient summaries in clear, readable markdown prose.

IMPORTANT: Return ONLY a markdown-formatted clinical summary (2-3 paragraphs). Do NOT return JSON. Do NOT use code blocks. Write in natural medical language with proper headings, bullet points, and paragraphs as appropriate.`),
    new HumanMessage(`Generate a concise clinical summary for this patient:

Name: ${patient.name}
Date of Birth: ${patient.dateOfBirth || "N/A"}
Gender: ${patient.gender || "N/A"}
Allergies: ${patient.allergies?.join(", ") || "None reported"}
Illness History: ${patient.illnessHistory || "N/A"}

Active Medications:
${medsText || "None"}

Include key medical considerations, potential concerns (especially drug-allergy conflicts), and monitoring recommendations.`),
  ]);
  const summary = typeof result.content === "string" ? result.content : JSON.stringify(result.content);

  await db
    .update(patients)
    .set({ aiSummary: summary, updatedAt: new Date() })
    .where(eq(patients.id, patientId));

  return summary;
}
