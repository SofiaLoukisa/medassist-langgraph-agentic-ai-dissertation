import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { authenticate } from "../auth/auth.middleware.js";
import { checkInteractions, getDosageCard } from "./medicine.service.js";

const router = Router();
router.use(authenticate);

const interactionSchema = z.object({
  medicines: z.array(z.string().min(1)).min(2, "At least 2 medicines required"),
});

// POST /check-interactions
router.post("/check-interactions", async (req: Request, res: Response) => {
  try {
    const parsed = interactionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const results = await checkInteractions(parsed.data.medicines);
    res.json({ interactions: results });
  } catch (error) {
    console.error("Check interactions error:", error);
    res.status(500).json({ error: "Failed to check interactions" });
  }
});

// GET /dosage-cards/:id
router.get("/dosage-cards/:id", async (req: Request, res: Response) => {
  try {
    const card = await getDosageCard(req.params.id as string);
    if (!card) {
      res.status(404).json({ error: "Dosage card not found" });
      return;
    }
    res.json(card);
  } catch (error) {
    console.error("Get dosage card error:", error);
    res.status(500).json({ error: "Failed to get dosage card" });
  }
});

export default router;
