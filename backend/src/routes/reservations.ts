import { Router } from "express";
import { db } from "../db/client";
import { reservations, reservationTables, tables, customers, zones } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  CreateReservationSchema,
  UpdateReservationSchema,
  ReassignTableSchema,
} from "@claudetable/shared";
import {
  generateReservationNo,
  computeEndTime,
  getTableConflicts,
  getReservationFull,
} from "../services/reservationService";

const router = Router();

/**
 * Remove a table from any other active reservation that conflicts with the given time window.
 * This lets a new reservation "take" a table that was previously assigned elsewhere.
 */
function stealTableFromConflicts(
  tableId: number,
  date: string,
  startTime: string,
  endTime: string,
  excludeReservationId?: number
) {
  const conflicts = getTableConflicts(tableId, date, startTime, endTime, excludeReservationId);
  for (const conflict of conflicts) {
    db.delete(reservationTables)
      .where(and(
        eq(reservationTables.reservationId, conflict.reservationId),
        eq(reservationTables.tableId, tableId)
      ))
      .run();
  }
}

// ─── List reservations (by date + optional status) ───────────────────────────
router.get("/", (req, res) => {
  const { date, status } = req.query;

  let query = db
    .select({
      id: reservations.id,
      reservationNo: reservations.reservationNo,
      customerId: reservations.customerId,
      customerName: customers.name,
      customerPhone: customers.phone,
      partySize: reservations.partySize,
      date: reservations.date,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      durationMinutes: reservations.durationMinutes,
      status: reservations.status,
      specialRequests: reservations.specialRequests,
      internalNotes: reservations.internalNotes,
      createdAt: reservations.createdAt,
      updatedAt: reservations.updatedAt,
    })
    .from(reservations)
    .innerJoin(customers, eq(reservations.customerId, customers.id));

  const conditions = [];
  if (date) conditions.push(eq(reservations.date, date as string));
  if (status) conditions.push(eq(reservations.status, status as any));

  const rows = conditions.length
    ? query.where(and(...conditions)).orderBy(reservations.startTime).all()
    : query.orderBy(sql`${reservations.date} DESC, ${reservations.startTime}`).limit(100).all();

  // Attach table info and compute capacity warning dynamically
  const enriched = rows.map((r) => {
    const linkedTables = db
      .select({
        tableNumber: tables.tableNumber,
        tableId: tables.id,
        zoneId: tables.zoneId,
        suggestedCapacity: tables.suggestedCapacity,
      })
      .from(reservationTables)
      .innerJoin(tables, eq(reservationTables.tableId, tables.id))
      .where(eq(reservationTables.reservationId, r.id))
      .all();

    const totalCapacity = linkedTables.reduce((sum, t) => sum + t.suggestedCapacity, 0);
    const capacityWarning = linkedTables.length > 0 && r.partySize > totalCapacity ? 1 : 0;
    return { ...r, tables: linkedTables.map((t) => ({ ...t, capacityWarning })) };
  });

  res.json({ data: enriched });
});

// ─── Get single reservation ───────────────────────────────────────────────────
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const data = getReservationFull(id);
  if (!data) {
    res.status(404).json({ error: "NotFound", message: "Reservation not found" });
    return;
  }
  res.json({ data });
});

// ─── Create reservation ───────────────────────────────────────────────────────
router.post("/", (req, res) => {
  const body = CreateReservationSchema.parse(req.body);
  const duration = body.durationMinutes ?? 150;
  const endTime = computeEndTime(body.startTime, duration);
  const reservationNo = generateReservationNo(body.date);

  // Check each table for conflicts (warning only — we don't block)
  const tableIds = body.tableIds ?? [];
  const warnings: Record<number, boolean> = {};
  for (const tableId of tableIds) {
    const tableRow = db.select().from(tables).where(eq(tables.id, tableId)).limit(1).all()[0];
    if (!tableRow) continue;
    const conflicts = getTableConflicts(tableId, body.date, body.startTime, endTime);
    warnings[tableId] = conflicts.length > 0;
  }

  // Create reservation
  const [res_] = db.insert(reservations).values({
    reservationNo,
    customerId: body.customerId,
    partySize: body.partySize,
    date: body.date,
    startTime: body.startTime,
    endTime,
    durationMinutes: duration,
    status: "confirmed",
    specialRequests: body.specialRequests ?? null,
    internalNotes: body.internalNotes ?? null,
    createdBy: body.createdBy ?? null,
  }).returning().all();

  // Compute total capacity of all selected tables upfront
  const totalCapacity = tableIds.reduce((sum, tid) => {
    const t = db.select({ cap: tables.suggestedCapacity }).from(tables).where(eq(tables.id, tid)).limit(1).all()[0];
    return sum + (t?.cap ?? 0);
  }, 0);
  const hasCapacityWarning = tableIds.length > 0 && body.partySize > totalCapacity;

  // Link tables — steal from conflicting reservations, then insert
  for (const tableId of tableIds) {
    stealTableFromConflicts(tableId, body.date, body.startTime, endTime, res_.id);
    db.insert(reservationTables).values({
      reservationId: res_.id,
      tableId,
      capacityWarning: hasCapacityWarning ? 1 : 0,
    }).run();
  }

  // Increment customer visit count
  db.update(customers)
    .set({ visitCount: sql`${customers.visitCount} + 1`, updatedAt: new Date().toISOString() })
    .where(eq(customers.id, body.customerId))
    .run();

  const full = getReservationFull(res_.id);
  res.status(201).json({
    data: full,
    message: Object.values(warnings).some(Boolean)
      ? "Reservation created with table time conflicts — please review"
      : "Reservation created successfully",
    warnings,
  });
});

// ─── Update reservation ───────────────────────────────────────────────────────
router.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = UpdateReservationSchema.parse(req.body);
  const now = new Date().toISOString();

  const existing = db.select().from(reservations).where(eq(reservations.id, id)).limit(1).all()[0];
  if (!existing) {
    res.status(404).json({ error: "NotFound", message: "Reservation not found" });
    return;
  }

  const updateData: Record<string, unknown> = { ...body, updatedAt: now };

  // Recompute end time if startTime or duration changes
  const newStartTime = body.startTime ?? existing.startTime;
  const newDuration = body.durationMinutes ?? existing.durationMinutes;
  if (body.startTime || body.durationMinutes) {
    updateData.endTime = computeEndTime(newStartTime, newDuration);
  }

  const [updated] = db.update(reservations).set(updateData as any).where(eq(reservations.id, id)).returning().all();
  const full = getReservationFull(updated.id);
  res.json({ data: full });
});

// ─── Cancel / Delete reservation ─────────────────────────────────────────────
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const now = new Date().toISOString();
  const [updated] = db
    .update(reservations)
    .set({ status: "cancelled", updatedAt: now })
    .where(eq(reservations.id, id))
    .returning().all();
  if (!updated) {
    res.status(404).json({ error: "NotFound", message: "Reservation not found" });
    return;
  }
  res.json({ data: { cancelled: true } });
});

// ─── Add table to reservation ────────────────────────────────────────────────
router.post("/:id/tables", (req, res) => {
  const reservationId = Number(req.params.id);
  const { tableId } = req.body as { tableId: number };

  const reservation = db.select().from(reservations).where(eq(reservations.id, reservationId)).limit(1).all()[0];
  if (!reservation) {
    res.status(404).json({ error: "NotFound", message: "Reservation not found" });
    return;
  }

  const tableRow = db.select().from(tables).where(eq(tables.id, tableId)).limit(1).all()[0];
  const conflicts = getTableConflicts(tableId, reservation.date, reservation.startTime, reservation.endTime, reservationId);

  // Total capacity = existing tables + this new table
  const existingTables = db.select({ cap: tables.suggestedCapacity })
    .from(reservationTables)
    .innerJoin(tables, eq(reservationTables.tableId, tables.id))
    .where(eq(reservationTables.reservationId, reservationId))
    .all();
  const totalCapacity = existingTables.reduce((s, t) => s + t.cap, 0) + (tableRow?.suggestedCapacity ?? 0);
  const capWarning = reservation.partySize > totalCapacity;

  // Take the table from any conflicting reservation
  stealTableFromConflicts(tableId, reservation.date, reservation.startTime, reservation.endTime, reservationId);

  db.insert(reservationTables).values({
    reservationId,
    tableId,
    capacityWarning: capWarning ? 1 : 0,
  }).run();

  res.json({
    data: { reservationId, tableId },
    message: conflicts.length > 0 ? "Table added with time conflict warning" : "Table added",
    conflictWarning: conflicts.length > 0,
  });
});

// ─── Remove table from reservation ───────────────────────────────────────────
router.delete("/:id/tables/:tableId", (req, res) => {
  const reservationId = Number(req.params.id);
  const tableId = Number(req.params.tableId);
  db.delete(reservationTables)
    .where(and(eq(reservationTables.reservationId, reservationId), eq(reservationTables.tableId, tableId)))
    .run();
  res.json({ data: { removed: true } });
});

// ─── Reassign: move reservation from table A → table B ───────────────────────
router.patch("/:id/tables/reassign", (req, res) => {
  const reservationId = Number(req.params.id);
  const body = ReassignTableSchema.parse(req.body);

  const reservation = db.select().from(reservations).where(eq(reservations.id, reservationId)).limit(1).all()[0];
  if (!reservation) {
    res.status(404).json({ error: "NotFound", message: "Reservation not found" });
    return;
  }

  // Check conflict at destination (warn, don't block)
  const conflicts = getTableConflicts(
    body.toTableId,
    reservation.date,
    reservation.startTime,
    reservation.endTime,
    reservationId
  );

  const targetTable = db.select().from(tables).where(eq(tables.id, body.toTableId)).limit(1).all()[0];

  // Total capacity: all current tables except the one being replaced, plus the new one
  const currentTables = db.select({ tableId: reservationTables.tableId, cap: tables.suggestedCapacity })
    .from(reservationTables)
    .innerJoin(tables, eq(reservationTables.tableId, tables.id))
    .where(eq(reservationTables.reservationId, reservationId))
    .all();
  const totalCapacity = currentTables
    .filter((t) => t.tableId !== body.fromTableId)
    .reduce((s, t) => s + t.cap, 0) + (targetTable?.suggestedCapacity ?? 0);
  const capWarning = reservation.partySize > totalCapacity;

  // Remove old junction
  db.delete(reservationTables)
    .where(and(eq(reservationTables.reservationId, reservationId), eq(reservationTables.tableId, body.fromTableId)))
    .run();

  // Insert new junction
  db.insert(reservationTables).values({
    reservationId,
    tableId: body.toTableId,
    capacityWarning: capWarning ? 1 : 0,
  }).run();

  const full = getReservationFull(reservationId);
  res.json({
    data: full,
    message: conflicts.length > 0 ? "Reassigned with time conflict at destination table" : "Reassigned successfully",
    conflictWarning: conflicts.length > 0,
  });
});

export default router;
