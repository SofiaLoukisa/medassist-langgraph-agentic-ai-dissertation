import { Router, type Request, type Response } from "express";

function paramId(req: Request, key = "id"): string {
  return req.params[key] as string;
}
import { z } from "zod";
import { authenticate } from "../auth/auth.middleware.js";
import {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  addMedication,
  updateMedication,
  deleteMedication,
  generateAiSummary,
} from "./patient.service.js";
import { getDosageCards, generateDosageCard, deleteDosageCard } from "../medicine/medicine.service.js";

const router = Router();
router.use(authenticate);

const createPatientSchema = z.object({
  name: z.string().min(1),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  illnessHistory: z.string().optional(),
});

const createMedSchema = z.object({
  medicineName: z.string().min(1),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  foodInteraction: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// POST / - Create patient
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = createPatientSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const patient = await createPatient(req.user!.userId, parsed.data);
    res.status(201).json(patient);
  } catch (error) {
    console.error("Create patient error:", error);
    res.status(500).json({ error: "Failed to create patient" });
  }
});

// GET / - List patients
router.get("/", async (req: Request, res: Response) => {
  try {
    const list = await getPatients(req.user!.userId);
    res.json(list);
  } catch (error) {
    console.error("List patients error:", error);
    res.status(500).json({ error: "Failed to list patients" });
  }
});

// GET /:id - Get patient with medications
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const patient = await getPatientById(paramId(req), req.user!.userId);
    if (!patient) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    res.json(patient);
  } catch (error) {
    console.error("Get patient error:", error);
    res.status(500).json({ error: "Failed to get patient" });
  }
});

// PUT /:id - Update patient
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const updated = await updatePatient(paramId(req), req.user!.userId, req.body);
    if (!updated) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    res.json(updated);
  } catch (error) {
    console.error("Update patient error:", error);
    res.status(500).json({ error: "Failed to update patient" });
  }
});

// DELETE /:id - Delete patient
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await deletePatient(paramId(req), req.user!.userId);
    if (!deleted) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    res.json({ message: "Patient deleted" });
  } catch (error) {
    console.error("Delete patient error:", error);
    res.status(500).json({ error: "Failed to delete patient" });
  }
});

// POST /:id/medications - Add medication
router.post("/:id/medications", async (req: Request, res: Response) => {
  try {
    const parsed = createMedSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const med = await addMedication(paramId(req), parsed.data);
    res.status(201).json(med);
  } catch (error) {
    console.error("Add medication error:", error);
    res.status(500).json({ error: "Failed to add medication" });
  }
});

// PUT /:id/medications/:medId - Update medication
router.put("/:id/medications/:medId", async (req: Request, res: Response) => {
  try {
    const updated = await updateMedication(paramId(req, "medId"), req.body);
    if (!updated) {
      res.status(404).json({ error: "Medication not found" });
      return;
    }
    res.json(updated);
  } catch (error) {
    console.error("Update medication error:", error);
    res.status(500).json({ error: "Failed to update medication" });
  }
});

// DELETE /:id/medications/:medId - Delete medication
router.delete("/:id/medications/:medId", async (req: Request, res: Response) => {
  try {
    const deleted = await deleteMedication(paramId(req, "medId"));
    if (!deleted) {
      res.status(404).json({ error: "Medication not found" });
      return;
    }
    res.json({ message: "Medication deleted" });
  } catch (error) {
    console.error("Delete medication error:", error);
    res.status(500).json({ error: "Failed to delete medication" });
  }
});

// POST /:id/summary - Generate AI summary
router.post("/:id/summary", async (req: Request, res: Response) => {
  try {
    const summary = await generateAiSummary(paramId(req), req.user!.userId);
    if (!summary) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    res.json({ summary });
  } catch (error) {
    console.error("Generate summary error:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

// POST /:id/dosage-cards - Generate dosage card
router.post("/:id/dosage-cards", async (req: Request, res: Response) => {
  try {
    const card = await generateDosageCard(paramId(req), req.user!.userId);
    if (!card) {
      res.status(404).json({ error: "Patient not found" });
      return;
    }
    res.status(201).json(card);
  } catch (error) {
    console.error("Generate dosage card error:", error);
    res.status(500).json({ error: "Failed to generate dosage card" });
  }
});

// DELETE /:id/dosage-cards/:cardId - Delete dosage card
router.delete("/:id/dosage-cards/:cardId", async (req: Request, res: Response) => {
  try {
    const deleted = await deleteDosageCard(paramId(req, "cardId"));
    if (!deleted) {
      res.status(404).json({ error: "Dosage card not found" });
      return;
    }
    res.json({ message: "Dosage card deleted" });
  } catch (error) {
    console.error("Delete dosage card error:", error);
    res.status(500).json({ error: "Failed to delete dosage card" });
  }
});

// GET /:id/dosage-cards - List dosage cards
router.get("/:id/dosage-cards", async (req: Request, res: Response) => {
  try {
    const cards = await getDosageCards(paramId(req));
    res.json(cards);
  } catch (error) {
    console.error("List dosage cards error:", error);
    res.status(500).json({ error: "Failed to list dosage cards" });
  }
});

export default router;
