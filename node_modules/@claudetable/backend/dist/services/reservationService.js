"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReservationNo = generateReservationNo;
exports.computeEndTime = computeEndTime;
exports.timesOverlap = timesOverlap;
exports.getTableConflicts = getTableConflicts;
exports.getReservationFull = getReservationFull;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Generate next reservation number for a given date.
 * Format: R{YYYYMMDD}-{NNN} (e.g. R20260415-003)
 */
function generateReservationNo(date) {
    const dateStr = date.replace(/-/g, "");
    const prefix = `R${dateStr}-`;
    const latest = client_1.db
        .select({ reservationNo: schema_1.reservations.reservationNo })
        .from(schema_1.reservations)
        .where((0, drizzle_orm_1.sql) `${schema_1.reservations.reservationNo} LIKE ${prefix + "%"}`)
        .orderBy((0, drizzle_orm_1.sql) `${schema_1.reservations.reservationNo} DESC`)
        .limit(1)
        .all();
    if (latest.length === 0) {
        return `${prefix}001`;
    }
    const lastNo = latest[0].reservationNo;
    const seq = parseInt(lastNo.split("-")[1] ?? "0", 10);
    return `${prefix}${String(seq + 1).padStart(3, "0")}`;
}
/**
 * Compute end time from start time + duration.
 */
function computeEndTime(startTime, durationMinutes) {
    // Handle midnight crossover: "17:00" + 420 min = "00:00"
    const [h, m] = startTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}
/**
 * Check if two time ranges overlap.
 * All times are HH:MM strings. Handles midnight crossover by converting to minutes from 00:00.
 */
function timesOverlap(aStart, aEnd, bStart, bEnd) {
    const toMin = (t) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    };
    let aS = toMin(aStart), aE = toMin(aEnd);
    let bS = toMin(bStart), bE = toMin(bEnd);
    // Handle midnight crossover (e.g. 22:00 → 01:00 = 22*60 → 25*60 logically)
    if (aE <= aS)
        aE += 24 * 60;
    if (bE <= bS)
        bE += 24 * 60;
    return aS < bE && aE > bS;
}
/**
 * Check if a given table has conflicting reservations in a time window.
 * Returns array of conflicting reservation IDs.
 */
function getTableConflicts(tableId, date, startTime, endTime, excludeReservationId) {
    const rows = client_1.db
        .select({
        reservationId: schema_1.reservations.id,
        reservationNo: schema_1.reservations.reservationNo,
        startTime: schema_1.reservations.startTime,
        endTime: schema_1.reservations.endTime,
        partySize: schema_1.reservations.partySize,
        customerName: schema_1.customers.name,
    })
        .from(schema_1.reservationTables)
        .innerJoin(schema_1.reservations, (0, drizzle_orm_1.eq)(schema_1.reservationTables.reservationId, schema_1.reservations.id))
        .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.reservations.customerId, schema_1.customers.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservationTables.tableId, tableId), (0, drizzle_orm_1.eq)(schema_1.reservations.date, date), (0, drizzle_orm_1.sql) `${schema_1.reservations.status} NOT IN ('cancelled', 'no-show')`))
        .all();
    return rows.filter((r) => {
        if (excludeReservationId && r.reservationId === excludeReservationId)
            return false;
        return timesOverlap(startTime, endTime, r.startTime, r.endTime);
    });
}
/**
 * Get full reservation with customer and table details.
 */
function getReservationFull(id) {
    const res = client_1.db
        .select()
        .from(schema_1.reservations)
        .where((0, drizzle_orm_1.eq)(schema_1.reservations.id, id))
        .limit(1)
        .all()[0];
    if (!res)
        return null;
    const customer = client_1.db
        .select()
        .from(schema_1.customers)
        .where((0, drizzle_orm_1.eq)(schema_1.customers.id, res.customerId))
        .limit(1)
        .all()[0];
    const linkedTables = client_1.db
        .select({
        id: schema_1.reservationTables.id,
        tableId: schema_1.tables.id,
        tableNumber: schema_1.tables.tableNumber,
        zoneId: schema_1.tables.zoneId,
        suggestedCapacity: schema_1.tables.suggestedCapacity,
    })
        .from(schema_1.reservationTables)
        .innerJoin(schema_1.tables, (0, drizzle_orm_1.eq)(schema_1.reservationTables.tableId, schema_1.tables.id))
        .where((0, drizzle_orm_1.eq)(schema_1.reservationTables.reservationId, id))
        .all();
    // Compute capacity warning dynamically: partySize > sum of all linked tables
    const totalCapacity = linkedTables.reduce((sum, t) => sum + t.suggestedCapacity, 0);
    const capacityWarning = linkedTables.length > 0 && res.partySize > totalCapacity ? 1 : 0;
    const linkedTablesWithWarning = linkedTables.map((t) => ({ ...t, capacityWarning }));
    return { ...res, customer, tables: linkedTablesWithWarning };
}
