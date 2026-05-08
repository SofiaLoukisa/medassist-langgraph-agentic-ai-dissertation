import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { authenticate } from "../auth/auth.middleware.js";
import {
  createBookmark,
  getBookmarks,
  deleteBookmark,
} from "./bookmark.service.js";

const router = Router();
router.use(authenticate);

const createBookmarkSchema = z.object({
  messageId: z.string().uuid(),
  sessionId: z.string().uuid(),
  note: z.string().optional(),
});

// POST / - Create bookmark
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = createBookmarkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten().fieldErrors });
      return;
    }
    const bookmark = await createBookmark(
      req.user!.userId,
      parsed.data.messageId,
      parsed.data.sessionId,
      parsed.data.note
    );
    res.status(201).json(bookmark);
  } catch (error) {
    console.error("Create bookmark error:", error);
    res.status(500).json({ error: "Failed to create bookmark" });
  }
});

// GET / - List bookmarks
router.get("/", async (req: Request, res: Response) => {
  try {
    const list = await getBookmarks(req.user!.userId);
    res.json(list);
  } catch (error) {
    console.error("List bookmarks error:", error);
    res.status(500).json({ error: "Failed to list bookmarks" });
  }
});

// DELETE /:id - Delete bookmark
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await deleteBookmark(req.params.id as string, req.user!.userId);
    if (!deleted) {
      res.status(404).json({ error: "Bookmark not found" });
      return;
    }
    res.json({ message: "Bookmark deleted" });
  } catch (error) {
    console.error("Delete bookmark error:", error);
    res.status(500).json({ error: "Failed to delete bookmark" });
  }
});

export default router;
