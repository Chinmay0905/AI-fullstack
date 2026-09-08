import { Router } from "express";
import { z } from "zod";
import { User } from "../models/User";
import { hashPassword, verifyPassword } from "../auth/password";
import { requireAuth } from "../auth/middleware";

const router = Router();

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "password must be at least 8 characters"),
});

router.post("/register", async (req, res) => {
  const parsed = CredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  const { email, password } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." } });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash });

  req.session.userId = user._id.toString();
  res.status(201).json({ id: user._id, email: user.email });
});

router.post("/login", async (req, res) => {
  const parsed = CredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message } });
    return;
  }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Incorrect email or password." } });
    return;
  }

  req.session.userId = user._id.toString();
  res.json({ id: user._id, email: user.email });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("aipk.sid");
    res.status(204).end();
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId).select("email");
  if (!user) {
    // Session points at a user that no longer exists — treat as signed out.
    req.session.destroy(() => undefined);
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Sign in required." } });
    return;
  }
  res.json({ id: user._id, email: user.email });
});

export default router;
