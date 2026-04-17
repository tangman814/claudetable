import { Router } from "express";
import { db } from "../db/client";
import { settings } from "../db/schema";
import { eq } from "drizzle-orm";
import { getStoredPin } from "../middleware/auth";
import { z } from "zod";

const router = Router();

// POST /api/v1/auth/login
router.post("/login", (req, res) => {
  const { pin } = z.object({ pin: z.string().min(1) }).parse(req.body);

  if (pin === getStoredPin()) {
    (req.session as any).authenticated = true;
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: "InvalidPin", message: "PIN 碼錯誤" });
  }
});

// POST /api/v1/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /api/v1/auth/me
router.get("/me", (req, res) => {
  res.json({ authenticated: !!(req.session as any)?.authenticated });
});

// PATCH /api/v1/auth/pin  — change PIN
router.patch("/pin", (req, res) => {
  // Must be authenticated to change PIN
  if (!(req.session as any)?.authenticated) {
    res.status(401).json({ error: "Unauthorized", message: "請先登入" });
    return;
  }
  const { currentPin, newPin } = z.object({
    currentPin: z.string().min(1),
    newPin: z.string().min(4).max(8).regex(/^\d+$/, "PIN 碼必須為數字"),
  }).parse(req.body);

  if (currentPin !== getStoredPin()) {
    res.status(400).json({ error: "InvalidPin", message: "目前 PIN 碼錯誤" });
    return;
  }

  const now = new Date().toISOString();
  const existing = db.select().from(settings).where(eq(settings.key, "pin")).limit(1).all()[0];
  if (existing) {
    db.update(settings).set({ value: newPin, updatedAt: now }).where(eq(settings.key, "pin")).run();
  } else {
    db.insert(settings).values({ key: "pin", value: newPin }).run();
  }

  res.json({ ok: true, message: "PIN 碼已更新" });
});

export default router;
