"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@claudetable/shared");
const router = (0, express_1.Router)();
function getAllSettings() {
    const rows = client_1.db.select().from(schema_1.settings).all();
    const map = {};
    for (const r of rows)
        map[r.key] = r.value;
    return {
        restaurantName: map.restaurantName ?? "餐廳",
        openTime: map.openTime ?? "17:00",
        closeTime: map.closeTime ?? "00:00",
        defaultDurationMinutes: Number(map.defaultDurationMinutes ?? 150),
        peakHours: JSON.parse(map.peakHours ?? '["18:00","21:00"]'),
    };
}
router.get("/", (_req, res) => {
    res.json({ data: getAllSettings() });
});
router.patch("/", (req, res) => {
    const body = shared_1.SettingsSchema.partial().parse(req.body);
    const now = new Date().toISOString();
    const entries = [];
    if (body.restaurantName !== undefined)
        entries.push(["restaurantName", body.restaurantName]);
    if (body.openTime !== undefined)
        entries.push(["openTime", body.openTime]);
    if (body.closeTime !== undefined)
        entries.push(["closeTime", body.closeTime]);
    if (body.defaultDurationMinutes !== undefined)
        entries.push(["defaultDurationMinutes", String(body.defaultDurationMinutes)]);
    if (body.peakHours !== undefined)
        entries.push(["peakHours", JSON.stringify(body.peakHours)]);
    for (const [key, value] of entries) {
        const existing = client_1.db.select().from(schema_1.settings).where((0, drizzle_orm_1.eq)(schema_1.settings.key, key)).limit(1).all()[0];
        if (existing) {
            client_1.db.update(schema_1.settings).set({ value, updatedAt: now }).where((0, drizzle_orm_1.eq)(schema_1.settings.key, key)).run();
        }
        else {
            client_1.db.insert(schema_1.settings).values({ key, value }).run();
        }
    }
    res.json({ data: getAllSettings() });
});
exports.default = router;
