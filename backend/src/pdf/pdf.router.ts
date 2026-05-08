import { Router, type Request, type Response } from "express";
import multer from "multer";
import fs from "fs";
import { db } from "../db/index.js";
import { pdfDocuments } from "../db/schema.js";
import { authenticate } from "../auth/auth.middleware.js";
import { processPdf, getUserPdfs, deletePdf } from "./pdf.service.js";

// Ensure uploads directory exists
fs.mkdirSync("uploads", { recursive: true });

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const router = Router();

router.use(authenticate);

// POST /upload - Upload a PDF
router.post("/upload", upload.single("pdf"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No PDF file provided" });
      return;
    }

    const userId = req.user!.userId;
    const { filename, originalname, size } = req.file;

    // Create pdf_documents record
    const [pdfRecord] = await db
      .insert(pdfDocuments)
      .values({
        userId,
        filename,
        originalName: originalname,
        size,
        status: "uploading",
      })
      .returning();

    // Process PDF in the background (fire and forget)
    processPdf(pdfRecord.id, req.file.path).catch((err) => {
      console.error(`Background PDF processing failed for ${pdfRecord.id}:`, err);
    });

    res.status(201).json(pdfRecord);
  } catch (error) {
    console.error("PDF upload error:", error);
    res.status(500).json({ error: "Failed to upload PDF" });
  }
});

// GET / - List user's PDFs
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const pdfs = await getUserPdfs(userId);
    res.json(pdfs);
  } catch (error) {
    console.error("PDF list error:", error);
    res.status(500).json({ error: "Failed to list PDFs" });
  }
});

// DELETE /:id - Delete a PDF
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const pdfId = req.params.id as string;

    const deleted = await deletePdf(pdfId, userId);

    if (!deleted) {
      res.status(404).json({ error: "PDF not found or not owned by user" });
      return;
    }

    res.json({ message: "PDF deleted successfully" });
  } catch (error) {
    console.error("PDF delete error:", error);
    res.status(500).json({ error: "Failed to delete PDF" });
  }
});

export default router;
