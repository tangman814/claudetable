import { db } from "../db/client";
import { reservations, reservationTables, tables, customers, zones } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getTableConflicts, timesOverlap } from "./reservationService";

/**
 * Get availability for all tables for a given date/time slot.
 */
export function getAvailability(date: string, startTime: string, endTime: string, excludeReservationId?: number) {
  const allTables = db
    .select({
      id: tables.id,
      tableNumber: tables.tableNumber,
      zoneId: tables.zoneId,
      zoneName: zones.name,
      suggestedCapacity: tables.suggestedCapacity,
      isActive: tables.isActive,
    })
    .from(tables)
    .innerJoin(zones, eq(tables.zoneId, zones.id))
    .where(eq(tables.isActive, 1))
    .all();

  return allTables.map((table) => {
    const conflicts = getTableConflicts(table.id, date, startTime, endTime, excludeReservationId);
    return {
      tableId: table.id,
      tableNumber: table.tableNumber,
      zoneId: table.zoneId,
      zoneName: table.zoneName,
      suggestedCapacity: table.suggestedCapacity,
      isActive: table.isActive,
      isAvailable: conflicts.length === 0,
      conflictingReservations: conflicts.map((c) => ({
        reservationId: c.reservationId,
        reservationNo: c.reservationNo,
        startTime: c.startTime,
        endTime: c.endTime,
        partySize: c.partySize,
        customerName: c.customerName,
      })),
    };
  });
}

/**
 * Assemble full schedule (Gantt data) for a date.
 * Returns all active tables and all reservation slots for that day.
 */
export function getSchedule(date: string) {
  // Get all active tables with zone info
  const allTables = db
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
    .innerJoin(zones, eq(tables.zoneId, zones.id))
    .where(eq(tables.isActive, 1))
    .orderBy(zones.sortOrder, tables.tableNumber)
    .all();

  // Get all reservation-table slots for this date
  const slots = db
    .select({
      tableId: reservationTables.tableId,
      reservationId: reservations.id,
      reservationNo: reservations.reservationNo,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      customerName: customers.name,
      partySize: reservations.partySize,
      status: reservations.status,
      capacityWarning: reservationTables.capacityWarning,
      suggestedCapacity: tables.suggestedCapacity,
    })
    .from(reservationTables)
    .innerJoin(reservations, eq(reservationTables.reservationId, reservations.id))
    .innerJoin(customers, eq(reservations.customerId, customers.id))
    .innerJoin(tables, eq(reservationTables.tableId, tables.id))
    .where(
      and(
        eq(reservations.date, date),
        sql`${reservations.status} NOT IN ('cancelled', 'no-show')`
      )
    )
    .all();

  return { date, tables: allTables, slots };
}
