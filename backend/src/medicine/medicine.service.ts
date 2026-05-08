import { db } from "../db/index.js";
import { dosageCards, patients, patientMedications } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { llm } from "../lib/llm.js";
import { getRetriever } from "../lib/vectorstore.js";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function checkInteractions(medicineNames: string[]) {
  if (medicineNames.length < 2) return [];

  const retriever = await getRetriever(3);
  const interactions: Array<{
    drug1: string;
    drug2: string;
    severity: string;
    description: string;
  }> = [];

  // Query for each pair
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < medicineNames.length; i++) {
    for (let j = i + 1; j < medicineNames.length; j++) {
      pairs.push([medicineNames[i], medicineNames[j]]);
    }
  }

  for (const [drug1, drug2] of pairs) {
    const docs = await retriever.invoke(
      `drug interaction between ${drug1} and ${drug2}`
    );
    const context = docs.map((d) => d.pageContent).join("\n");

    const result = await llm.invoke([
      new SystemMessage(`You are a drug interaction analysis specialist. Analyze potential interactions between medications using the provided medical context.

Medical context:
${context || "No specific interaction data found in the knowledge base."}

Return ONLY a valid JSON object with this exact structure:
{
  "severity": "mild" | "moderate" | "severe" | "contraindicated",
  "description": "A clear, concise description of the interaction, mechanism, risks, and recommendations. If no interaction data is found, explain what is generally known about these drugs being taken together."
}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no code fences.`),
      new HumanMessage(
        `Analyze the interaction between ${drug1} and ${drug2}.`
      ),
    ]);

    const content =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);

    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      interactions.push({
        drug1,
        drug2,
        severity: parsed.severity || "unknown",
        description: parsed.description || content,
      });
    } catch {
      interactions.push({
        drug1,
        drug2,
        severity: "unknown",
        description: content,
      });
    }
  }

  return interactions;
}

export async function generateDosageCard(patientId: string, userId: string) {
  const patient = await db.query.patients.findFirst({
    where: and(eq(patients.id, patientId), eq(patients.userId, userId)),
    with: { medications: true },
  });

  if (!patient) return null;

  const activeMeds = patient.medications.filter((m) => m.isActive);

  // Enrich medications with RAG context
  const retriever = await getRetriever();
  const enrichedMeds = await Promise.all(
    activeMeds.map(async (med) => {
      const docs = await retriever.invoke(
        `${med.medicineName} dosage administration food interaction warnings side effects`
      );
      const ragContext = docs.map((d) => d.pageContent).join("\n");
      return {
        name: med.medicineName,
        dosage: med.dosage || "Not specified",
        frequency: med.frequency || "Not specified",
        route: med.route || "Not specified",
        foodInteraction: med.foodInteraction || "",
        warnings: med.warnings || [],
        ragContext: ragContext.slice(0, 500),
      };
    })
  );

  // Use LLM to generate a structured dosage card with enriched data
  const result = await llm.invoke([
    new SystemMessage(`You are a medical assistant that generates structured dosage card data.
Given patient information and medication data (including context from medical documents), return a JSON object with this exact structure:
{
  "patientName": "string",
  "allergies": ["string"],
  "medications": [
    {
      "name": "string",
      "dosage": "string",
      "frequency": "string",
      "timing": "string (when to take: morning, evening, with meals, etc.)",
      "withFood": "string (food interaction notes)",
      "warnings": ["string"]
    }
  ],
  "generalNotes": ["string (important notes for the patient)"]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation, no code fences.`),
    new HumanMessage(`Generate a dosage card for this patient:

Patient: ${patient.name}
Date of Birth: ${patient.dateOfBirth || "N/A"}
Gender: ${patient.gender || "N/A"}
Allergies: ${(patient.allergies || []).join(", ") || "None"}

Medications:
${enrichedMeds.map((m) => `- ${m.name} (${m.dosage}, ${m.frequency}, route: ${m.route})
  Food interaction: ${m.foodInteraction || "None known"}
  Current warnings: ${m.warnings.length > 0 ? m.warnings.join(", ") : "None"}
  Medical context: ${m.ragContext}`).join("\n\n")}`),
  ]);

  const content =
    typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content);

  let cardData: Record<string, unknown>;
  try {
    const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    cardData = JSON.parse(cleaned);
  } catch {
    // Fallback: build from DB data if LLM output isn't valid JSON
    cardData = {
      patientName: patient.name,
      allergies: patient.allergies || [],
      medications: enrichedMeds.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        timing: m.route,
        withFood: m.foodInteraction,
        warnings: m.warnings,
      })),
      generalNotes: [],
    };
  }

  // Generate HTML for printing
  const htmlContent = generateCardHtml(cardData, patient.name);

  // Upsert — update existing card if one exists for this patient
  const existingCard = await db.query.dosageCards.findFirst({
    where: and(eq(dosageCards.patientId, patientId), eq(dosageCards.userId, userId)),
  });

  const title = `Dosage Card - ${patient.name} - ${new Date().toLocaleDateString()}`;

  let card;
  if (existingCard) {
    [card] = await db
      .update(dosageCards)
      .set({ title, cardData, htmlContent })
      .where(eq(dosageCards.id, existingCard.id))
      .returning();
  } else {
    [card] = await db
      .insert(dosageCards)
      .values({ patientId, userId, title, cardData, htmlContent })
      .returning();
  }

  return card;
}

export function generateCardHtml(
  cardData: Record<string, unknown>,
  patientName: string
): string {
  const meds = (cardData.medications as Array<Record<string, unknown>>) || [];
  const allergies = (cardData.allergies as string[]) || [];
  const notes = (cardData.generalNotes as string[]) || [];

  const medsRows = meds
    .map(
      (m) => `
    <tr>
      <td>${m.name || ""}</td>
      <td>${m.dosage || ""}</td>
      <td>${m.frequency || ""}</td>
      <td>${m.timing || ""}</td>
      <td>${m.withFood || ""}</td>
      <td>${Array.isArray(m.warnings) ? m.warnings.join(", ") : ""}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Dosage Card - ${patientName}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 14px; }
  th { background: #1e40af; color: white; }
  .allergies { background: #fef2f2; border: 1px solid #ef4444; padding: 8px; border-radius: 4px; margin: 8px 0; }
  .notes { background: #f0f9ff; border: 1px solid #3b82f6; padding: 8px; border-radius: 4px; margin: 8px 0; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>Dosage Card</h1>
<p><strong>Patient:</strong> ${patientName}</p>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
${allergies.length ? `<div class="allergies"><strong>Allergies:</strong> ${allergies.join(", ")}</div>` : ""}
<table><thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Timing</th><th>Food</th><th>Warnings</th></tr></thead><tbody>${medsRows}</tbody></table>
${notes.length ? `<div class="notes"><strong>Notes:</strong><ul>${notes.map((n) => `<li>${n}</li>`).join("")}</ul></div>` : ""}
<p style="font-size:12px;color:#666;margin-top:24px;">Generated by MedAssist. For reference only — consult your healthcare provider.</p>
</body></html>`;
}

export async function getDosageCard(cardId: string) {
  return db.query.dosageCards.findFirst({
    where: eq(dosageCards.id, cardId),
  });
}

export async function deleteDosageCard(cardId: string) {
  const result = await db
    .delete(dosageCards)
    .where(eq(dosageCards.id, cardId))
    .returning();
  return result.length > 0;
}

export async function getDosageCards(patientId: string) {
  return db.query.dosageCards.findMany({
    where: eq(dosageCards.patientId, patientId),
    orderBy: dosageCards.createdAt,
  });
}
