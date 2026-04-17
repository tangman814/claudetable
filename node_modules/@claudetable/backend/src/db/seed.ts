import { db, sqlite } from "./client";
import { zones, tables, customers, reservations, reservationTables, settings } from "./schema";

// Ensure schema exists (run inline DDL if not using migrations in seed)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER NOT NULL REFERENCES zones(id),
    table_number TEXT NOT NULL UNIQUE,
    label TEXT,
    suggested_capacity INTEGER NOT NULL,
    x_position REAL NOT NULL DEFAULT 0,
    y_position REAL NOT NULL DEFAULT 0,
    width REAL NOT NULL DEFAULT 70,
    height REAL NOT NULL DEFAULT 70,
    shape TEXT NOT NULL DEFAULT 'rect',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    notes TEXT,
    visit_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_no TEXT NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    party_size INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 150,
    status TEXT NOT NULL DEFAULT 'confirmed',
    special_requests TEXT,
    internal_notes TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS reservation_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id INTEGER NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    table_id INTEGER NOT NULL REFERENCES tables(id),
    capacity_warning INTEGER NOT NULL DEFAULT 0,
    UNIQUE(reservation_id, table_id)
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_reservations_date_status ON reservations(date, status);
  CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
  CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
  CREATE INDEX IF NOT EXISTS idx_reservation_tables_table ON reservation_tables(table_id);
`);

// Clear existing data
sqlite.exec("DELETE FROM reservation_tables");
sqlite.exec("DELETE FROM reservations");
sqlite.exec("DELETE FROM customers");
sqlite.exec("DELETE FROM tables");
sqlite.exec("DELETE FROM zones");
sqlite.exec("DELETE FROM settings");

// ─── Zones ───────────────────────────────────────────────────────────────────
const [zone1F] = db.insert(zones).values({ name: "1F", description: "一樓室內", sortOrder: 1 }).returning().all();
const [zone2F] = db.insert(zones).values({ name: "2F", description: "二樓室內", sortOrder: 2 }).returning().all();
const [zoneOut] = db.insert(zones).values({ name: "外場", description: "戶外露台", sortOrder: 3 }).returning().all();

console.log("Zones created:", zone1F.id, zone2F.id, zoneOut.id);

// ─── Tables 1F ───────────────────────────────────────────────────────────────
const tables1F = db.insert(tables).values([
  { zoneId: zone1F.id, tableNumber: "A1", suggestedCapacity: 2, xPosition: 60,  yPosition: 60,  shape: "round" },
  { zoneId: zone1F.id, tableNumber: "A2", suggestedCapacity: 2, xPosition: 160, yPosition: 60,  shape: "round" },
  { zoneId: zone1F.id, tableNumber: "B1", suggestedCapacity: 4, xPosition: 60,  yPosition: 180, shape: "rect" },
  { zoneId: zone1F.id, tableNumber: "B2", suggestedCapacity: 4, xPosition: 180, yPosition: 180, shape: "rect" },
  { zoneId: zone1F.id, tableNumber: "B3", suggestedCapacity: 4, xPosition: 300, yPosition: 180, shape: "rect" },
  { zoneId: zone1F.id, tableNumber: "C1", suggestedCapacity: 6, xPosition: 60,  yPosition: 310, shape: "rect", width: 100, height: 70 },
  { zoneId: zone1F.id, tableNumber: "C2", suggestedCapacity: 6, xPosition: 200, yPosition: 310, shape: "rect", width: 100, height: 70 },
  { zoneId: zone1F.id, tableNumber: "C3", suggestedCapacity: 8, xPosition: 340, yPosition: 310, shape: "rect", width: 120, height: 70 },
]).returning().all();

// ─── Tables 2F ───────────────────────────────────────────────────────────────
const tables2F = db.insert(tables).values([
  { zoneId: zone2F.id, tableNumber: "D1", suggestedCapacity: 4, xPosition: 60,  yPosition: 60,  shape: "rect" },
  { zoneId: zone2F.id, tableNumber: "D2", suggestedCapacity: 4, xPosition: 180, yPosition: 60,  shape: "rect" },
  { zoneId: zone2F.id, tableNumber: "D3", suggestedCapacity: 4, xPosition: 300, yPosition: 60,  shape: "rect" },
  { zoneId: zone2F.id, tableNumber: "E1", suggestedCapacity: 6, xPosition: 60,  yPosition: 180, shape: "rect", width: 100 },
  { zoneId: zone2F.id, tableNumber: "E2", suggestedCapacity: 6, xPosition: 210, yPosition: 180, shape: "rect", width: 100 },
  { zoneId: zone2F.id, tableNumber: "F1", suggestedCapacity: 10, xPosition: 60, yPosition: 310, shape: "rect", width: 160, height: 80 },
]).returning().all();

// ─── Tables 外場 ─────────────────────────────────────────────────────────────
const tablesOut = db.insert(tables).values([
  { zoneId: zoneOut.id, tableNumber: "OUT1", suggestedCapacity: 4, xPosition: 60,  yPosition: 60,  shape: "round", width: 80, height: 80 },
  { zoneId: zoneOut.id, tableNumber: "OUT2", suggestedCapacity: 4, xPosition: 200, yPosition: 60,  shape: "round", width: 80, height: 80 },
  { zoneId: zoneOut.id, tableNumber: "OUT3", suggestedCapacity: 6, xPosition: 60,  yPosition: 200, shape: "round", width: 90, height: 90 },
  { zoneId: zoneOut.id, tableNumber: "OUT4", suggestedCapacity: 6, xPosition: 200, yPosition: 200, shape: "round", width: 90, height: 90 },
]).returning().all();

console.log("Tables created:", tables1F.length, tables2F.length, tablesOut.length);

// ─── Customers ───────────────────────────────────────────────────────────────
const [cust1] = db.insert(customers).values({ name: "王大明", phone: "0912-345-678", notes: "VIP 常客", visitCount: 12 }).returning().all();
const [cust2] = db.insert(customers).values({ name: "林小美", phone: "0923-456-789", email: "lin@example.com" }).returning().all();
const [cust3] = db.insert(customers).values({ name: "陳建國", phone: "0934-567-890", notes: "海鮮過敏確認" }).returning().all();
const [cust4] = db.insert(customers).values({ name: "張家豪", phone: "0945-678-901" }).returning().all();

// ─── Today's reservations (sample) ──────────────────────────────────────────
const _now = new Date();
const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;

const [res1] = db.insert(reservations).values({
  reservationNo: `R${today.replace(/-/g, "")}-001`,
  customerId: cust1.id,
  partySize: 4,
  date: today,
  startTime: "18:00",
  endTime: "20:30",
  durationMinutes: 150,
  status: "confirmed",
  createdBy: "系統",
}).returning().all();

const [res2] = db.insert(reservations).values({
  reservationNo: `R${today.replace(/-/g, "")}-002`,
  customerId: cust2.id,
  partySize: 2,
  date: today,
  startTime: "18:30",
  endTime: "21:00",
  durationMinutes: 150,
  status: "confirmed",
  createdBy: "系統",
}).returning().all();

const [res3] = db.insert(reservations).values({
  reservationNo: `R${today.replace(/-/g, "")}-003`,
  customerId: cust3.id,
  partySize: 22,
  date: today,
  startTime: "19:00",
  endTime: "21:30",
  durationMinutes: 150,
  status: "confirmed",
  specialRequests: "大團體包廂需求，請安排連續桌位",
  createdBy: "系統",
}).returning().all();

const [res4] = db.insert(reservations).values({
  reservationNo: `R${today.replace(/-/g, "")}-004`,
  customerId: cust4.id,
  partySize: 6,
  date: today,
  startTime: "21:00",
  endTime: "23:30",
  durationMinutes: 150,
  status: "confirmed",
  createdBy: "系統",
}).returning().all();

// ─── Reservation Table links ──────────────────────────────────────────────────
// res1 → B1 (4 pax, capacity 4, no warning)
db.insert(reservationTables).values({ reservationId: res1.id, tableId: tables1F[3].id, capacityWarning: 0 }).run();

// res2 → A1 (2 pax, capacity 2, no warning)
db.insert(reservationTables).values({ reservationId: res2.id, tableId: tables1F[0].id, capacityWarning: 0 }).run();

// res3 → C1 + C2 + C3 (22 pax, total capacity 8+8+... warning expected)
db.insert(reservationTables).values({ reservationId: res3.id, tableId: tables1F[5].id, capacityWarning: 1 }).run();
db.insert(reservationTables).values({ reservationId: res3.id, tableId: tables1F[6].id, capacityWarning: 1 }).run();
db.insert(reservationTables).values({ reservationId: res3.id, tableId: tables1F[7].id, capacityWarning: 1 }).run();

// res4 → E1 (6 pax, capacity 6, no warning)
db.insert(reservationTables).values({ reservationId: res4.id, tableId: tables2F[3].id, capacityWarning: 0 }).run();

// ─── Settings ────────────────────────────────────────────────────────────────
db.insert(settings).values([
  { key: "restaurantName", value: "鮮味海鮮餐廳" },
  { key: "openTime", value: "17:00" },
  { key: "closeTime", value: "00:00" },
  { key: "defaultDurationMinutes", value: "150" },
  { key: "peakHours", value: JSON.stringify(["18:00", "21:00"]) },
]).run();

console.log("Seed complete! Database ready at claudetable.db");
sqlite.close();
