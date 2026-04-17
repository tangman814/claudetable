"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailability = getAvailability;
exports.getSchedule = getSchedule;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const reservationService_1 = require("./reservationService");
/**
 * Get availability for all tables for a given date/time slot.
 */
function getAvailability(date, startTime, endTime, excludeReservationId) {
    const allTables = client_1.db
        .select({
        id: schema_1.tables.id,
        tableNumber: schema_1.tables.tableNumber,
        zoneId: schema_1.tables.zoneId,
        zoneName: schema_1.zones.name,
        suggestedCapacity: schema_1.tables.suggestedCapacity,
        isActive: schema_1.tables.isActive,
    })
        .from(schema_1.tables)
        .innerJoin(schema_1.zones, (0, drizzle_orm_1.eq)(schema_1.tables.zoneId, schema_1.zones.id))
        .where((0, drizzle_orm_1.eq)(schema_1.tables.isActive, 1))
        .all();
    return allTables.map((table) => {
        const conflicts = (0, reservationService_1.getTableConflicts)(table.id, date, startTime, endTime, excludeReservationId);
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
function getSchedule(date) {
    // Get all active tables with zone info
    const allTables = client_1.db
        .select({
        id: schema_1.tables.id,
        zoneId: schema_1.tables.zoneId,
        zoneName: schema_1.zones.name,
        tableNumber: schema_1.tables.tableNumber,
        label: schema_1.tables.label,
        suggestedCapacity: schema_1.tables.suggestedCapacity,
        xPosition: schema_1.tables.xPosition,
        yPosition: schema_1.tables.yPosition,
        width: schema_1.tables.width,
        height: schema_1.tables.height,
        shape: schema_1.tables.shape,
        isActive: schema_1.tables.isActive,
        createdAt: schema_1.tables.createdAt,
        updatedAt: schema_1.tables.updatedAt,
    })
        .from(schema_1.tables)
        .innerJoin(schema_1.zones, (0, drizzle_orm_1.eq)(schema_1.tables.zoneId, schema_1.zones.id))
        .where((0, drizzle_orm_1.eq)(schema_1.tables.isActive, 1))
        .orderBy(schema_1.zones.sortOrder, schema_1.tables.tableNumber)
        .all();
    // Get all reservation-table slots for this date
    const slots = client_1.db
        .select({
        tableId: schema_1.reservationTables.tableId,
        reservationId: schema_1.reservations.id,
        reservationNo: schema_1.reservations.reservationNo,
        startTime: schema_1.reservations.startTime,
        endTime: schema_1.reservations.endTime,
        customerName: schema_1.customers.name,
        partySize: schema_1.reservations.partySize,
        status: schema_1.reservations.status,
        capacityWarning: schema_1.reservationTables.capacityWarning,
        suggestedCapacity: schema_1.tables.suggestedCapacity,
    })
        .from(schema_1.reservationTables)
        .innerJoin(schema_1.reservations, (0, drizzle_orm_1.eq)(schema_1.reservationTables.reservationId, schema_1.reservations.id))
        .innerJoin(schema_1.customers, (0, drizzle_orm_1.eq)(schema_1.reservations.customerId, schema_1.customers.id))
        .innerJoin(schema_1.tables, (0, drizzle_orm_1.eq)(schema_1.reservationTables.tableId, schema_1.tables.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.reservations.date, date), (0, drizzle_orm_1.sql) `${schema_1.reservations.status} NOT IN ('cancelled', 'no-show')`))
        .all();
    return { date, tables: allTables, slots };
}
