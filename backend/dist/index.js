"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const path_1 = __importDefault(require("path"));
const zones_1 = __importDefault(require("./routes/zones"));
const tables_1 = __importDefault(require("./routes/tables"));
const customers_1 = __importDefault(require("./routes/customers"));
const reservations_1 = __importDefault(require("./routes/reservations"));
const availability_1 = __importDefault(require("./routes/availability"));
const settings_1 = __importDefault(require("./routes/settings"));
const auth_1 = __importDefault(require("./routes/auth"));
const auth_2 = require("./middleware/auth");
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 3001;
const isProd = process.env.NODE_ENV === "production";
// ── CORS (dev only) ───────────────────────────────────────────────────────────
if (!isProd) {
    app.use((0, cors_1.default)({ origin: "http://localhost:5173", credentials: true }));
}
app.use(express_1.default.json());
// ── Session ───────────────────────────────────────────────────────────────────
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET ?? "claudetable-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // set true if behind HTTPS proxy on Railway
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
}));
// Request logger (dev only)
if (!isProd) {
    app.use((req, _res, next) => {
        console.log(`${new Date().toISOString().slice(11, 19)} ${req.method} ${req.path}`);
        next();
    });
}
// ── Auth routes (public) ──────────────────────────────────────────────────────
app.use("/api/v1/auth", auth_1.default);
// ── Protected API routes ──────────────────────────────────────────────────────
app.use("/api/v1/zones", auth_2.requireAuth, zones_1.default);
app.use("/api/v1/tables", auth_2.requireAuth, tables_1.default);
app.use("/api/v1/customers", auth_2.requireAuth, customers_1.default);
app.use("/api/v1/reservations", auth_2.requireAuth, reservations_1.default);
app.use("/api/v1/availability", auth_2.requireAuth, availability_1.default);
app.use("/api/v1/settings", auth_2.requireAuth, settings_1.default);
app.get("/api/v1/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
});
// ── Production: serve frontend static files ───────────────────────────────────
if (isProd) {
    // In production, CWD is /app (project root); frontend/dist is at /app/frontend/dist
    const frontendDist = path_1.default.join(process.cwd(), "frontend", "dist");
    app.use(express_1.default.static(frontendDist));
    app.get("*", (_req, res) => {
        res.sendFile(path_1.default.join(frontendDist, "index.html"));
    });
}
app.use(errorHandler_1.notFound);
app.use(errorHandler_1.errorHandler);
app.listen(PORT, () => {
    console.log(`ClaudeTable backend running on http://localhost:${PORT}`);
});
exports.default = app;
