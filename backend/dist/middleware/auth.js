"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.getStoredPin = getStoredPin;
const client_1 = require("../db/client");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
/** Read PIN from settings table (default: "1234") */
function getStoredPin() {
    const row = client_1.db.select().from(schema_1.settings).where((0, drizzle_orm_1.eq)(schema_1.settings.key, "pin")).limit(1).all()[0];
    return row?.value ?? "1234";
}
/** Middleware: require valid session or 401 */
function requireAuth(req, res, next) {
    if (req.session?.authenticated) {
        next();
        return;
    }
    res.status(401).json({ error: "Unauthorized", message: "請先輸入 PIN 碼登入" });
}
