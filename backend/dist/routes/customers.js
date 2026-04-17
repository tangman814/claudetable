"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const shared_1 = require("@claudetable/shared");
const router = (0, express_1.Router)();
router.get("/", (req, res) => {
    const { phone, name, q } = req.query;
    let rows;
    if (q) {
        // Search both name and phone simultaneously
        rows = client_1.db.select().from(schema_1.customers)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.customers.name, `%${q}%`), (0, drizzle_orm_1.like)(schema_1.customers.phone, `%${q}%`)))
            .orderBy((0, drizzle_orm_1.sql) `${schema_1.customers.visitCount} DESC`)
            .limit(20).all();
    }
    else if (phone) {
        rows = client_1.db.select().from(schema_1.customers)
            .where((0, drizzle_orm_1.like)(schema_1.customers.phone, `%${phone}%`))
            .limit(20).all();
    }
    else if (name) {
        rows = client_1.db.select().from(schema_1.customers)
            .where((0, drizzle_orm_1.like)(schema_1.customers.name, `%${name}%`))
            .limit(20).all();
    }
    else {
        rows = client_1.db.select().from(schema_1.customers)
            .orderBy((0, drizzle_orm_1.sql) `${schema_1.customers.visitCount} DESC`)
            .limit(50).all();
    }
    res.json({ data: rows });
});
router.get("/:id", (req, res) => {
    const id = Number(req.params.id);
    const customer = client_1.db.select().from(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.id, id)).limit(1).all()[0];
    if (!customer) {
        res.status(404).json({ error: "NotFound", message: "Customer not found" });
        return;
    }
    const history = client_1.db.select().from(schema_1.reservations)
        .where((0, drizzle_orm_1.eq)(schema_1.reservations.customerId, id))
        .orderBy((0, drizzle_orm_1.sql) `${schema_1.reservations.date} DESC, ${schema_1.reservations.startTime} DESC`)
        .limit(20).all();
    res.json({ data: { ...customer, reservations: history } });
});
router.post("/", (req, res) => {
    const body = shared_1.CreateCustomerSchema.parse(req.body);
    const now = new Date().toISOString();
    // Check for duplicate phone
    const existing = client_1.db.select().from(schema_1.customers).where((0, drizzle_orm_1.eq)(schema_1.customers.phone, body.phone)).limit(1).all()[0];
    if (existing) {
        res.status(409).json({ error: "Conflict", message: "Phone number already registered", data: existing });
        return;
    }
    const [created] = client_1.db.insert(schema_1.customers).values({
        name: body.name,
        phone: body.phone,
        email: body.email ?? null,
        notes: body.notes ?? null,
        visitCount: 0,
    }).returning().all();
    res.status(201).json({ data: created });
});
router.patch("/:id", (req, res) => {
    const id = Number(req.params.id);
    const body = shared_1.UpdateCustomerSchema.parse(req.body);
    const now = new Date().toISOString();
    const [updated] = client_1.db.update(schema_1.customers)
        .set({ ...body, updatedAt: now })
        .where((0, drizzle_orm_1.eq)(schema_1.customers.id, id))
        .returning().all();
    if (!updated) {
        res.status(404).json({ error: "NotFound", message: "Customer not found" });
        return;
    }
    res.json({ data: updated });
});
exports.default = router;
