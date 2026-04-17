"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@claudetable/shared");
const router = (0, express_1.Router)();
router.get("/", (req, res) => {
    const zoneId = req.query.zoneId ? Number(req.query.zoneId) : undefined;
    const query = client_1.db
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
        .innerJoin(schema_1.zones, (0, drizzle_orm_1.eq)(schema_1.tables.zoneId, schema_1.zones.id));
    const rows = zoneId
        ? query.where((0, drizzle_orm_1.eq)(schema_1.tables.zoneId, zoneId)).orderBy(schema_1.tables.tableNumber).all()
        : query.orderBy(schema_1.zones.sortOrder, schema_1.tables.tableNumber).all();
    res.json({ data: rows });
});
router.post("/", (req, res) => {
    const body = shared_1.CreateTableSchema.parse(req.body);
    const [created] = client_1.db
        .insert(schema_1.tables)
        .values({
        zoneId: body.zoneId,
        tableNumber: body.tableNumber,
        label: body.label ?? null,
        suggestedCapacity: body.suggestedCapacity,
        xPosition: body.xPosition ?? 0,
        yPosition: body.yPosition ?? 0,
        width: body.width ?? 70,
        height: body.height ?? 70,
        shape: body.shape ?? "rect",
    })
        .returning().all();
    res.status(201).json({ data: created });
});
router.patch("/:id", (req, res) => {
    const id = Number(req.params.id);
    const body = shared_1.UpdateTableSchema.parse(req.body);
    const now = new Date().toISOString();
    const [updated] = client_1.db
        .update(schema_1.tables)
        .set({ ...body, updatedAt: now })
        .where((0, drizzle_orm_1.eq)(schema_1.tables.id, id))
        .returning().all();
    if (!updated) {
        res.status(404).json({ error: "NotFound", message: "Table not found" });
        return;
    }
    res.json({ data: updated });
});
router.patch("/:id/position", (req, res) => {
    const id = Number(req.params.id);
    const body = shared_1.UpdateTablePositionSchema.parse(req.body);
    const now = new Date().toISOString();
    const [updated] = client_1.db
        .update(schema_1.tables)
        .set({ xPosition: body.xPosition, yPosition: body.yPosition, updatedAt: now })
        .where((0, drizzle_orm_1.eq)(schema_1.tables.id, id))
        .returning().all();
    if (!updated) {
        res.status(404).json({ error: "NotFound", message: "Table not found" });
        return;
    }
    res.json({ data: updated });
});
router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);
    const now = new Date().toISOString();
    client_1.db.update(schema_1.tables).set({ isActive: 0, updatedAt: now }).where((0, drizzle_orm_1.eq)(schema_1.tables.id, id)).run();
    res.json({ data: { deleted: true } });
});
exports.default = router;
