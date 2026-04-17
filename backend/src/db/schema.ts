import { sqliteTable, integer, text, real, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─── Zones ───────────────────────────────────────────────────────────────────

export const zones = sqliteTable("zones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

// ─── Tables ──────────────────────────────────────────────────────────────────

export const tables = sqliteTable("tables", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  zoneId: integer("zone_id").notNull().references(() => zones.id),
  tableNumber: text("table_number").notNull().unique(),
  label: text("label"),
  suggestedCapacity: integer("suggested_capacity").notNull(),
  xPosition: real("x_position").default(0).notNull(),
  yPosition: real("y_position").default(0).notNull(),
  width: real("width").default(70).notNull(),
  height: real("height").default(70).notNull(),
  shape: text("shape", { enum: ["rect", "round"] }).default("rect").notNull(),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

// ─── Customers ───────────────────────────────────────────────────────────────

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  notes: text("notes"),
  visitCount: integer("visit_count").default(0).notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

// ─── Reservations ────────────────────────────────────────────────────────────

export const reservations = sqliteTable("reservations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reservationNo: text("reservation_no").notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  partySize: integer("party_size").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(), // HH:MM
  durationMinutes: integer("duration_minutes").default(150).notNull(),
  status: text("status", {
    enum: ["confirmed", "seated", "completed", "cancelled", "no-show"],
  }).default("confirmed").notNull(),
  specialRequests: text("special_requests"),
  internalNotes: text("internal_notes"),
  createdBy: text("created_by"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

// ─── Reservation Tables (junction) ───────────────────────────────────────────

export const reservationTables = sqliteTable(
  "reservation_tables",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    reservationId: integer("reservation_id").notNull().references(() => reservations.id, { onDelete: "cascade" }),
    tableId: integer("table_id").notNull().references(() => tables.id),
    capacityWarning: integer("capacity_warning").default(0).notNull(),
  },
  (t) => ({
    uniq: unique().on(t.reservationId, t.tableId),
  })
);

// ─── Settings ────────────────────────────────────────────────────────────────

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});
