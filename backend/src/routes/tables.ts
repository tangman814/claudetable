import { Router } from "express";
import { db } from "../db/client";
import { tables, zones } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { CreateTableSchema, UpdateTableSchema, UpdateTablePositionSchema } from "@claudetable/shared";

const router = Router();

router.get("/", (req, res) => {
  const zoneId = req.query.zoneId ? Number(req.query.zoneId) : undefined;

  const query = db
    .select({
      id: tables.id,
      zoneId: tables.zoneId,
      zoneName: zones.name,
      tableNumber: tables.tableNumber,
      label: tables.label,
      suggestedCapacity: tables.suggestedCapacity,
      xPosition: tables.xPosition,
      yPosition: tables.yPosition,
      width: tables.width,
      height: tables.height,
      shape: tables.shape,
      isActive: tables.isActive,
      createdAt: tables.createdAt,
      updatedAt: tables.updatedAt,
    })
    .from(tables)
    .innerJoin(zones, eq(tables.zoneId, zones.id));

  const rows = zoneId
    ? query.where(eq(tables.zoneId, zoneId)).orderBy(tables.tableNumber).all()
    : query.orderBy(zones.sortOrder, tables.tableNumber).all();

  res.json({ data: rows });
});

router.post("/", (req, res) => {
  const body = CreateTableSchema.parse(req.body);
  const [created] = db
    .insert(tables)
    .values({
      zoneId: body.zoneId,
      tableNumber: body.tableNumber,
      label: body.label ?? null,
      suggestedCapacity: body.suggestedCapacity,
      xPosition: body.xPosition ?? 0,
      yPosition: body.yPosition ?? 0,
      width: body.width ?? 70,
      height: body.height ?? 70,
      shape: body.shape ?? "rect",
    })
    .returning().all();
  res.status(201).json({ data: created });
});

router.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateTableSchema.parse(req.body);
  const now = new Date().toISOString();
  const [updated] = db
    .update(tables)
    .set({ ...body, updatedAt: now })
    .where(eq(tables.id, id))
    .returning().all();
  if (!updated) {
    res.status(404).json({ error: "NotFound", message: "Table not found" });
    return;
  }
  res.json({ data: updated });
});

router.patch("/:id/position", (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateTablePositionSchema.parse(req.body);
  const now = new Date().toISOString();
  const [updated] = db
    .update(tables)
    .set({ xPosition: body.xPosition, yPosition: body.yPosition, updatedAt: now })
    .where(eq(tables.id, id))
    .returning().all();
  if (!updated) {
    res.status(404).json({ error: "NotFound", message: "Table not found" });
    return;
  }
  res.json({ data: updated });
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const now = new Date().toISOString();
  db.update(tables).set({ isActive: 0, updatedAt: now }).where(eq(tables.id, id)).run();
  res.json({ data: { deleted: true } });
});

export default router;
