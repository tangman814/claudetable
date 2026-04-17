import { Router } from "express";
import { db } from "../db/client";
import { settings } from "../db/schema";
import { eq } from "drizzle-orm";
import { SettingsSchema } from "@claudetable/shared";

const router = Router();

function getAllSettings() {
  const rows = db.select().from(settings).all();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  return {
    restaurantName: map.restaurantName ?? "餐廳",
    openTime: map.openTime ?? "17:00",
    closeTime: map.closeTime ?? "00:00",
    defaultDurationMinutes: Number(map.defaultDurationMinutes ?? 150),
    peakHours: JSON.parse(map.peakHours ?? '["18:00","21:00"]'),
  };
}

router.get("/", (_req, res) => {
  res.json({ data: getAllSettings() });
});

router.patch("/", (req, res) => {
  const body = SettingsSchema.partial().parse(req.body);
  const now = new Date().toISOString();

  const entries: [string, string][] = [];
  if (body.restaurantName !== undefined) entries.push(["restaurantName", body.restaurantName]);
  if (body.openTime !== undefined) entries.push(["openTime", body.openTime]);
  if (body.closeTime !== undefined) entries.push(["closeTime", body.closeTime]);
  if (body.defaultDurationMinutes !== undefined) entries.push(["defaultDurationMinutes", String(body.defaultDurationMinutes)]);
  if (body.peakHours !== undefined) entries.push(["peakHours", JSON.stringify(body.peakHours)]);

  for (const [key, value] of entries) {
    const existing = db.select().from(settings).where(eq(settings.key, key)).limit(1).all()[0];
    if (existing) {
      db.update(settings).set({ value, updatedAt: now }).where(eq(settings.key, key)).run();
    } else {
      db.insert(settings).values({ key, value }).run();
    }
  }

  res.json({ data: getAllSettings() });
});

export default router;
