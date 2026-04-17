"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// POST /api/v1/auth/login
router.post("/login", (req, res) => {
    const { pin } = zod_1.z.object({ pin: zod_1.z.string().min(1) }).parse(req.body);
    if (pin === (0, auth_1.getStoredPin)()) {
        req.session.authenticated = true;
        res.json({ ok: true });
    }
    else {
        res.status(401).json({ error: "InvalidPin", message: "PIN 碼錯誤" });
    }
});
// POST /api/v1/auth/logout
router.post("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ ok: true });
    });
});
// GET /api/v1/auth/me
router.get("/me", (req, res) => {
    res.json({ authenticated: !!req.session?.authenticated });
});
// PATCH /api/v1/auth/pin  — change PIN
router.patch("/pin", (req, res) => {
    // Must be authenticated to change PIN
    if (!req.session?.authenticated) {
        res.status(401).json({ error: "Unauthorized", message: "請先登入" });
        return;
    }
    const { currentPin, newPin } = zod_1.z.object({
        currentPin: zod_1.z.string().min(1),
        newPin: zod_1.z.string().min(4).max(8).regex(/^\d+$/, "PIN 碼必須為數字"),
    }).parse(req.body);
    if (currentPin !== (0, auth_1.getStoredPin)()) {
        res.status(400).json({ error: "InvalidPin", message: "目前 PIN 碼錯誤" });
        return;
    }
    const now = new Date().toISOString();
    const existing = client_1.db.select().from(schema_1.settings).where((0, drizzle_orm_1.eq)(schema_1.settings.key, "pin")).limit(1).all()[0];
    if (existing) {
        client_1.db.update(schema_1.settings).set({ value: newPin, updatedAt: now }).where((0, drizzle_orm_1.eq)(schema_1.settings.key, "pin")).run();
    }
    else {
        client_1.db.insert(schema_1.settings).values({ key: "pin", value: newPin }).run();
    }
    res.json({ ok: true, message: "PIN 碼已更新" });
});
exports.default = router;
