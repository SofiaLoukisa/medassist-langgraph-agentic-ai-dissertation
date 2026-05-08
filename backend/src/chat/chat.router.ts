import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { authenticate } from "../auth/auth.middleware.js";
import {
  createSession,
  getSessions,
  getSessionWithMessages,
  deleteSession,
  sendMessage,
} from "./chat.service.js";

const router = Router();
router.use(authenticate);

const createSessionSchema = z.object({
  patientId: z.string().uuid().optional(),
  title: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

// POST /sessions - Create session
router.post("/sessions", async (req: Request, res: Response) => {
  try {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const session = await createSession(
      req.user!.userId,
      parsed.data.patientId,
      parsed.data.title
    );
    res.status(201).json(session);
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// GET /sessions - List sessions
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const sessions = await getSessions(req.user!.userId);
    res.json(sessions);
  } catch (error) {
    console.error("List sessions error:", error);
    res.status(500).json({ error: "Failed to list sessions" });
  }
});

// GET /sessions/:id - Get session with messages
router.get("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const session = await getSessionWithMessages(
      req.params.id as string,
      req.user!.userId
    );
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(session);
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({ error: "Failed to get session" });
  }
});

// POST /sessions/:id/messages - Send message with SSE streaming
router.post("/sessions/:id/messages", async (req: Request, res: Response) => {
  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  await sendMessage(
    req.params.id as string,
    req.user!.userId,
    parsed.data.content,
    // onToken
    (token: string) => {
      res.write(`data: ${JSON.stringify({ type: "token", content: token })}\n\n`);
    },
    // onToolEvent
    (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
    // onDone
    (fullResponse: string, sources: unknown[], toolsUsed: string[]) => {
      res.write(
        `data: ${JSON.stringify({ type: "done", content: fullResponse, sources, toolsUsed })}\n\n`
      );
      res.end();
    },
    // onError
    (error: string) => {
      res.write(`data: ${JSON.stringify({ type: "error", error })}\n\n`);
      res.end();
    }
  );
});

// DELETE /sessions/:id - Delete session
router.delete("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await deleteSession(req.params.id as string, req.user!.userId);
    if (!deleted) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json({ message: "Session deleted" });
  } catch (error) {
    console.error("Delete session error:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

export default router;
