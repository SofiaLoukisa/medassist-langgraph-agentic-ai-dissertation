import { Router, type Request, type Response, type Router as RouterType } from "express";
import { z } from "zod";
import { registerUser, loginUser, getUserById } from "./auth.service.js";
import { authenticate } from "./auth.middleware.js";

const router: RouterType = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { email, password, name } = parsed.data;
    const user = await registerUser(email, password, name);
    res.status(201).json({ user });
  } catch (err: any) {
    if (err.message === "EMAIL_EXISTS") {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
      return;
    }

    const { email, password } = parsed.data;
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err: any) {
    if (err.message === "INVALID_CREDENTIALS") {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /me
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await getUserById(req.user!.userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({ user });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
