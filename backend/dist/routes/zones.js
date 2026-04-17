"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@claudetable/shared");
const router = (0, express_1.Router)();
router.get("/", (_req, res) => {
    const data = client_1.db.select().from(schema_1.zones).orderBy(schema_1.zones.sortOrder).all();
    res.json({ data });
});
router.post("/", (req, res) => {
    const body = shared_1.CreateZoneSchema.parse(req.body);
    const [created] = client_1.db
        .insert(schema_1.zones)
        .values({
        name: body.name,
        description: body.description ?? null,
        sortOrder: body.sortOrder ?? 0,
    })
        .returning().all();
    res.status(201).json({ data: created });
});
router.patch("/:id", (req, res) => {
    const id = Number(req.params.id);
    const body = shared_1.UpdateZoneSchema.parse(req.body);
    const [updated] = client_1.db
        .update(schema_1.zones)
        .set({ ...body })
        .where((0, drizzle_orm_1.eq)(schema_1.zones.id, id))
        .returning().all();
    if (!updated) {
        res.status(404).json({ error: "NotFound", message: "Zone not found" });
        return;
    }
    res.json({ data: updated });
});
router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);
    client_1.db.delete(schema_1.zones).where((0, drizzle_orm_1.eq)(schema_1.zones.id, id)).run();
    res.json({ data: { deleted: true } });
});
exports.default = router;
