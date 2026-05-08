import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./env.js";
import authRouter from "./auth/auth.router.js";
import pdfRouter from "./pdf/pdf.router.js";
import chatRouter from "./chat/chat.router.js";
import patientRouter from "./patient/patient.router.js";
import medicineRouter from "./medicine/medicine.router.js";
import bookmarkRouter from "./bookmark/bookmark.router.js";

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/pdfs", pdfRouter);
app.use("/api/chat", chatRouter);
app.use("/api/patients", patientRouter);
app.use("/api/medicines", medicineRouter);
app.use("/api/bookmarks", bookmarkRouter);

app.listen(env.PORT, () => {
  console.log(`MedAssist API running on port ${env.PORT}`);
});

export default app;
