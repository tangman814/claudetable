"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settings = exports.reservationTables = exports.reservations = exports.customers = exports.tables = exports.zones = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
// ─── Zones ───────────────────────────────────────────────────────────────────
exports.zones = (0, sqlite_core_1.sqliteTable)("zones", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)("name").notNull(),
    description: (0, sqlite_core_1.text)("description"),
    sortOrder: (0, sqlite_core_1.integer)("sort_order").default(0).notNull(),
    createdAt: (0, sqlite_core_1.text)("created_at").default((0, drizzle_orm_1.sql) `(datetime('now'))`).notNull(),
});
// ─── Tables ──────────────────────────────────────────────────────────────────
exports.tables = (0, sqlite_core_1.sqliteTable)("tables", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    zoneId: (0, sqlite_core_1.integer)("zone_id").notNull().references(() => exports.zones.id),
    tableNumber: (0, sqlite_core_1.text)("table_number").notNull().unique(),
    label: (0, sqlite_core_1.text)("label"),
    suggestedCapacity: (0, sqlite_core_1.integer)("suggested_capacity").notNull(),
    xPosition: (0, sqlite_core_1.real)("x_position").default(0).notNull(),
    yPosition: (0, sqlite_core_1.real)("y_position").default(0).notNull(),
    width: (0, sqlite_core_1.real)("width").default(70).notNull(),
    height: (0, sqlite_core_1.real)("height").default(70).notNull(),
    shape: (0, sqlite_core_1.text)("shape", { enum: ["rect", "round"] }).default("rect").notNull(),
    isActive: (0, sqlite_core_1.integer)("is_active").default(1).notNull(),
    createdAt: (0, sqlite_core_1.text)("created_at").default((0, drizzle_orm_1.sql) `(datetime('now'))`).notNull(),
    updatedAt: (0, sqlite_core_1.text)("updated_at").default((0, drizzle_orm_1.sql) `(datetime('now'))`).notNull(),
});
// ─── Customers ───────────────────────────────────────────────────────────────
exports.customers = (0, sqlite_core_1.sqliteTable)("customers", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    name: (0, sqlite_core_1.text)("name").notNull(),
    phone: (0, sqlite_core_1.text)("phone").notNull().unique(),
    email: (0, sqlite_core_1.text)("email"),
    notes: (0, sqlite_core_1.text)("notes"),
    visitCount: (0, sqlite_core_1.integer)("visit_count").default(0).notNull(),
    createdAt: (0, sqlite_core_1.text)("created_at").default((0, drizzle_orm_1.sql) `(datetime('now'))`).notNull(),
    updatedAt: (0, sqlite_core_1.text)("updated_at").default((0, drizzle_orm_1.sql) `(datetime('now'))`).notNull(),
});
// ─── Reservations ────────────────────────────────────────────────────────────
exports.reservations = (0, sqlite_core_1.sqliteTable)("reservations", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    reservationNo: (0, sqlite_core_1.text)("reservation_no").notNull().unique(),
    customerId: (0, sqlite_core_1.integer)("customer_id").notNull().references(() => exports.customers.id),
    partySize: (0, sqlite_core_1.integer)("party_size").notNull(),
    date: (0, sqlite_core_1.text)("date").notNull(), // YYYY-MM-DD
    startTime: (0, sqlite_core_1.text)("start_time").notNull(), // HH:MM
    endTime: (0, sqlite_core_1.text)("end_time").notNull(), // HH:MM
    durationMinutes: (0, sqlite_core_1.integer)("duration_minutes").default(150).notNull(),
    status: (0, sqlite_core_1.text)("status", {
        enum: ["confirmed", "seated", "completed", "cancelled", "no-show"],
    }).default("confirmed").notNull(),
    specialRequests: (0, sqlite_core_1.text)("special_requests"),
    internalNotes: (0, sqlite_core_1.text)("internal_notes"),
    createdBy: (0, sqlite_core_1.text)("created_by"),
    createdAt: (0, sqlite_core_1.text)("created_at").default((0, drizzle_orm_1.sql) `(datetime('now'))`).notNull(),
    updatedAt: (0, sqlite_core_1.text)("updated_at").default((0, drizzle_orm_1.sql) `(datetime('now'))`).notNull(),
});
// ─── Reservation Tables (junction) ───────────────────────────────────────────
exports.reservationTables = (0, sqlite_core_1.sqliteTable)("reservation_tables", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    reservationId: (0, sqlite_core_1.integer)("reservation_id").notNull().references(() => exports.reservations.id, { onDelete: "cascade" }),
    tableId: (0, sqlite_core_1.integer)("table_id").notNull().references(() => exports.tables.id),
    capacityWarning: (0, sqlite_core_1.integer)("capacity_warning").default(0).notNull(),
}, (t) => ({
    uniq: (0, sqlite_core_1.unique)().on(t.reservationId, t.tableId),
}));
// ─── Settings ────────────────────────────────────────────────────────────────
exports.settings = (0, sqlite_core_1.sqliteTable)("settings", {
    id: (0, sqlite_core_1.integer)("id").primaryKey({ autoIncrement: true }),
    key: (0, sqlite_core_1.text)("key").notNull().unique(),
    value: (0, sqlite_core_1.text)("value").notNull(),
    updatedAt: (0, sqlite_core_1.text)("updated_at").default((0, drizzle_orm_1.sql) `(datetime('now'))`).notNull(),
});
