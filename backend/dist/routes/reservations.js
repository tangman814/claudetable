"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@claudetable/shared");
const reservationService_1 = require("../services/reservationService");
const router = (0, express_1.Router)();
/**
 * Remove a table from any other active reservation that conflicts with the given time window.
 * This lets a new reservation "take" a table that was previously assigned elsewhere.
 */
function stealTableFromConflicts(tableId, date, startTime, endTime, excludeReservationId) {
    const conflicts = (0, reservationService_1.getTableConflicts)(tableId, date, startTime, endTime, excludeReservationId);
    for (const conflict of conflicts) {
        client_1.db.delete(schema_1.reservationTables)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservationTables.reservationId, conflict.reservationId), (0, drizzle_orm_1.eq)(schema_1.reservationTables.tableId, tableId)))
            .run();
    }
}
// ─── List reservations (by date + optional status) ───────────────────────────
router.get("/", (req, res) => {
    const { date, status } = req.query;
    let query = client_1.db
        .select({
        id: schema_1.reservations.id,
        reservationNo: schema_1.reservations.reservationNo,
        customerId: schema_1.reservations.customerId,
        customerName: schema_1.customers.name,
        customerPhone: schema_1.customers.phone,
        partySize: schema_1.reservations.partySize,
        date: schema_1.reservations.date,
        startTime: schema_1.reservations.startTime,
        endTime: schema_1.reservations.endTime,
        durationMinutes: schema_1.reservations.durationMinutes,
        status: schema_1.reservations.status,
        specialRequests: schema_1.reservations.specialRequests,
        internalNotes: schema_1.reservations.internalNotes,
        createdAt: schema_1.reservations.createdAt,
        updatedAt: schema_1.reservations.updatedAt,
    })
        .from(schema_1.reservations)
        .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.reservations.customerId, schema_1.customers.id));
    const conditions = [];
    if (date)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.reservations.date, date));
    if (status)
        conditions.push((0, drizzle_orm_1.eq)(schema_1.reservations.status, status));
    const rows = conditions.length
        ? query.where((0, drizzle_orm_1.and)(...conditions)).orderBy(schema_1.reservations.startTime).all()
        : query.orderBy((0, drizzle_orm_1.sql) `${schema_1.reservations.date} DESC, ${schema_1.reservations.startTime}`).limit(100).all();
    // Attach table info and compute capacity warning dynamically
    const enriched = rows.map((r) => {
        const linkedTables = client_1.db
            .select({
            tableNumber: schema_1.tables.tableNumber,
            tableId: schema_1.tables.id,
            zoneId: schema_1.tables.zoneId,
            suggestedCapacity: schema_1.tables.suggestedCapacity,
        })
            .from(schema_1.reservationTables)
            .innerJoin(schema_1.tables, (0, drizzle_orm_1.eq)(schema_1.reservationTables.tableId, schema_1.tables.id))
            .where((0, drizzle_orm_1.eq)(schema_1.reservationTables.reservationId, r.id))
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
    const data = (0, reservationService_1.getReservationFull)(id);
    if (!data) {
        res.status(404).json({ error: "NotFound", message: "Reservation not found" });
        return;
    }
    res.json({ data });
});
// ─── Create reservation ───────────────────────────────────────────────────────
router.post("/", (req, res) => {
    const body = shared_1.CreateReservationSchema.parse(req.body);
    const duration = body.durationMinutes ?? 150;
    const endTime = (0, reservationService_1.computeEndTime)(body.startTime, duration);
    const reservationNo = (0, reservationService_1.generateReservationNo)(body.date);
    // Check each table for conflicts (warning only — we don't block)
    const tableIds = body.tableIds ?? [];
    const warnings = {};
    for (const tableId of tableIds) {
        const tableRow = client_1.db.select().from(schema_1.tables).where((0, drizzle_orm_1.eq)(schema_1.tables.id, tableId)).limit(1).all()[0];
        if (!tableRow)
            continue;
        const conflicts = (0, reservationService_1.getTableConflicts)(tableId, body.date, body.startTime, endTime);
        warnings[tableId] = conflicts.length > 0;
    }
    // Create reservation
    const [res_] = client_1.db.insert(schema_1.reservations).values({
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
        const t = client_1.db.select({ cap: schema_1.tables.suggestedCapacity }).from(schema_1.tables).where((0, drizzle_orm_1.eq)(schema_1.tables.id, tid)).limit(1).all()[0];
        return sum + (t?.cap ?? 0);
    }, 0);
    const hasCapacityWarning = tableIds.length > 0 && body.partySize > totalCapacity;
    // Link tables — steal from conflicting reservations, then insert
    for (const tableId of tableIds) {
        stealTableFromConflicts(tableId, body.date, body.startTime, endTime, res_.id);
        client_1.db.insert(schema_1.reservationTables).values({
            reservationId: res_.id,
            tableId,
            capacityWarning: hasCapacityWarning ? 1 : 0,
        }).run();
    }
    // Increment customer visit count
    client_1.db.update(schema_1.customers)
        .set({ visitCount: (0, drizzle_orm_1.sql) `${schema_1.customers.visitCount} + 1`, updatedAt: new Date().toISOString() })
        .where((0, drizzle_orm_1.eq)(schema_1.customers.id, body.customerId))
        .run();
    const full = (0, reservationService_1.getReservationFull)(res_.id);
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
    const body = shared_1.UpdateReservationSchema.parse(req.body);
    const now = new Date().toISOString();
    const existing = client_1.db.select().from(schema_1.reservations).where((0, drizzle_orm_1.eq)(schema_1.reservations.id, id)).limit(1).all()[0];
    if (!existing) {
        res.status(404).json({ error: "NotFound", message: "Reservation not found" });
        return;
    }
    const updateData = { ...body, updatedAt: now };
    // Recompute end time if startTime or duration changes
    const newStartTime = body.startTime ?? existing.startTime;
    const newDuration = body.durationMinutes ?? existing.durationMinutes;
    if (body.startTime || body.durationMinutes) {
        updateData.endTime = (0, reservationService_1.computeEndTime)(newStartTime, newDuration);
    }
    const [updated] = client_1.db.update(schema_1.reservations).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.reservations.id, id)).returning().all();
    const full = (0, reservationService_1.getReservationFull)(updated.id);
    res.json({ data: full });
});
// ─── Cancel / Delete reservation ─────────────────────────────────────────────
router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);
    const now = new Date().toISOString();
    const [updated] = client_1.db
        .update(schema_1.reservations)
        .set({ status: "cancelled", updatedAt: now })
        .where((0, drizzle_orm_1.eq)(schema_1.reservations.id, id))
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
    const { tableId } = req.body;
    const reservation = client_1.db.select().from(schema_1.reservations).where((0, drizzle_orm_1.eq)(schema_1.reservations.id, reservationId)).limit(1).all()[0];
    if (!reservation) {
        res.status(404).json({ error: "NotFound", message: "Reservation not found" });
        return;
    }
    const tableRow = client_1.db.select().from(schema_1.tables).where((0, drizzle_orm_1.eq)(schema_1.tables.id, tableId)).limit(1).all()[0];
    const conflicts = (0, reservationService_1.getTableConflicts)(tableId, reservation.date, reservation.startTime, reservation.endTime, reservationId);
    // Total capacity = existing tables + this new table
    const existingTables = client_1.db.select({ cap: schema_1.tables.suggestedCapacity })
        .from(schema_1.reservationTables)
        .innerJoin(schema_1.tables, (0, drizzle_orm_1.eq)(schema_1.reservationTables.tableId, schema_1.tables.id))
        .where((0, drizzle_orm_1.eq)(schema_1.reservationTables.reservationId, reservationId))
        .all();
    const totalCapacity = existingTables.reduce((s, t) => s + t.cap, 0) + (tableRow?.suggestedCapacity ?? 0);
    const capWarning = reservation.partySize > totalCapacity;
    // Take the table from any conflicting reservation
    stealTableFromConflicts(tableId, reservation.date, reservation.startTime, reservation.endTime, reservationId);
    client_1.db.insert(schema_1.reservationTables).values({
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
    client_1.db.delete(schema_1.reservationTables)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservationTables.reservationId, reservationId), (0, drizzle_orm_1.eq)(schema_1.reservationTables.tableId, tableId)))
        .run();
    res.json({ data: { removed: true } });
});
// ─── Reassign: move reservation from table A → table B ───────────────────────
router.patch("/:id/tables/reassign", (req, res) => {
    const reservationId = Number(req.params.id);
    const body = shared_1.ReassignTableSchema.parse(req.body);
    const reservation = client_1.db.select().from(schema_1.reservations).where((0, drizzle_orm_1.eq)(schema_1.reservations.id, reservationId)).limit(1).all()[0];
    if (!reservation) {
        res.status(404).json({ error: "NotFound", message: "Reservation not found" });
        return;
    }
    // Check conflict at destination (warn, don't block)
    const conflicts = (0, reservationService_1.getTableConflicts)(body.toTableId, reservation.date, reservation.startTime, reservation.endTime, reservationId);
    const targetTable = client_1.db.select().from(schema_1.tables).where((0, drizzle_orm_1.eq)(schema_1.tables.id, body.toTableId)).limit(1).all()[0];
    // Total capacity: all current tables except the one being replaced, plus the new one
    const currentTables = client_1.db.select({ tableId: schema_1.reservationTables.tableId, cap: schema_1.tables.suggestedCapacity })
        .from(schema_1.reservationTables)
        .innerJoin(schema_1.tables, (0, drizzle_orm_1.eq)(schema_1.reservationTables.tableId, schema_1.tables.id))
        .where((0, drizzle_orm_1.eq)(schema_1.reservationTables.reservationId, reservationId))
        .all();
    const totalCapacity = currentTables
        .filter((t) => t.tableId !== body.fromTableId)
        .reduce((s, t) => s + t.cap, 0) + (targetTable?.suggestedCapacity ?? 0);
    const capWarning = reservation.partySize > totalCapacity;
    // Remove old junction
    client_1.db.delete(schema_1.reservationTables)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservationTables.reservationId, reservationId), (0, drizzle_orm_1.eq)(schema_1.reservationTables.tableId, body.fromTableId)))
        .run();
    // Insert new junction
    client_1.db.insert(schema_1.reservationTables).values({
        reservationId,
        tableId: body.toTableId,
        capacityWarning: capWarning ? 1 : 0,
    }).run();
    const full = (0, reservationService_1.getReservationFull)(reservationId);
    res.json({
        data: full,
        message: conflicts.length > 0 ? "Reassigned with time conflict at destination table" : "Reassigned successfully",
        conflictWarning: conflicts.length > 0,
    });
});
exports.default = router;
