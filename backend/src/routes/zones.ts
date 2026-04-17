import { Router } from "express";
import { db } from "../db/client";
import { zones } from "../db/schema";
import { eq } from "drizzle-orm";
import { CreateZoneSchema, UpdateZoneSchema } from "@claudetable/shared";

const router = Router();

router.get("/", (_req, res) => {
  const data = db.select().from(zones).orderBy(zones.sortOrder).all();
  res.json({ data });
});

router.post("/", (req, res) => {
  const body = CreateZoneSchema.parse(req.body);
  const [created] = db
    .insert(zones)
    .values({
      name: body.name,
      description: body.description ?? null,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning().all();
  res.status(201).json({ data: created });
});

router.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateZoneSchema.parse(req.body);
  const [updated] = db
    .update(zones)
    .set({ ...body })
    .where(eq(zones.id, id))
    .returning().all();
  if (!updated) {
    res.status(404).json({ error: "NotFound", message: "Zone not found" });
    return;
  }
  res.json({ data: updated });
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  db.delete(zones).where(eq(zones.id, id)).run();
  res.json({ data: { deleted: true } });
});

export default router;
