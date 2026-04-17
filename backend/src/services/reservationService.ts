import { db } from "../db/client";
import { reservations, reservationTables, tables, customers } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { addMinutes, format, parse } from "date-fns";

/**
 * Generate next reservation number for a given date.
 * Format: R{YYYYMMDD}-{NNN} (e.g. R20260415-003)
 */
export function generateReservationNo(date: string): string {
  const dateStr = date.replace(/-/g, "");
  const prefix = `R${dateStr}-`;

  const latest = db
    .select({ reservationNo: reservations.reservationNo })
    .from(reservations)
    .where(sql`${reservations.reservationNo} LIKE ${prefix + "%"}`)
    .orderBy(sql`${reservations.reservationNo} DESC`)
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
export function computeEndTime(startTime: string, durationMinutes: number): string {
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
export function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  let aS = toMin(aStart), aE = toMin(aEnd);
  let bS = toMin(bStart), bE = toMin(bEnd);

  // Handle midnight crossover (e.g. 22:00 → 01:00 = 22*60 → 25*60 logically)
  if (aE <= aS) aE += 24 * 60;
  if (bE <= bS) bE += 24 * 60;

  return aS < bE && aE > bS;
}

/**
 * Check if a given table has conflicting reservations in a time window.
 * Returns array of conflicting reservation IDs.
 */
export function getTableConflicts(
  tableId: number,
  date: string,
  startTime: string,
  endTime: string,
  excludeReservationId?: number
) {
  const rows = db
    .select({
      reservationId: reservations.id,
      reservationNo: reservations.reservationNo,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      partySize: reservations.partySize,
      customerName: customers.name,
    })
    .from(reservationTables)
    .innerJoin(reservations, eq(reservationTables.reservationId, reservations.id))
    .innerJoin(customers, eq(reservations.customerId, customers.id))
    .where(
      and(
        eq(reservationTables.tableId, tableId),
        eq(reservations.date, date),
        sql`${reservations.status} NOT IN ('cancelled', 'no-show')`
      )
    )
    .all();

  return rows.filter((r) => {
    if (excludeReservationId && r.reservationId === excludeReservationId) return false;
    return timesOverlap(startTime, endTime, r.startTime, r.endTime);
  });
}

/**
 * Get full reservation with customer and table details.
 */
export function getReservationFull(id: number) {
  const res = db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
    .limit(1)
    .all()[0];

  if (!res) return null;

  const customer = db
    .select()
    .from(customers)
    .where(eq(customers.id, res.customerId))
    .limit(1)
    .all()[0];

  const linkedTables = db
    .select({
      id: reservationTables.id,
      tableId: tables.id,
      tableNumber: tables.tableNumber,
      zoneId: tables.zoneId,
      suggestedCapacity: tables.suggestedCapacity,
    })
    .from(reservationTables)
    .innerJoin(tables, eq(reservationTables.tableId, tables.id))
    .where(eq(reservationTables.reservationId, id))
    .all();

  // Compute capacity warning dynamically: partySize > sum of all linked tables
  const totalCapacity = linkedTables.reduce((sum, t) => sum + t.suggestedCapacity, 0);
  const capacityWarning = linkedTables.length > 0 && res.partySize > totalCapacity ? 1 : 0;
  const linkedTablesWithWarning = linkedTables.map((t) => ({ ...t, capacityWarning }));

  return { ...res, customer, tables: linkedTablesWithWarning };
}
