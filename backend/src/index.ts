import express from "express";
import cors from "cors";
import session from "express-session";
import connectSqlite3 from "connect-sqlite3";
import path from "path";
import zonesRouter from "./routes/zones";
import tablesRouter from "./routes/tables";
import customersRouter from "./routes/customers";
import reservationsRouter from "./routes/reservations";
import availabilityRouter from "./routes/availability";
import settingsRouter from "./routes/settings";
import authRouter from "./routes/auth";
import { requireAuth } from "./middleware/auth";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT ?? 3001;
const isProd = process.env.NODE_ENV === "production";

// ── CORS (dev only) ───────────────────────────────────────────────────────────
if (!isProd) {
  app.use(cors({ origin: "http://localhost:5173", credentials: true }));
}

app.use(express.json());

// ── Session ───────────────────────────────────────────────────────────────────
const SQLiteStore = connectSqlite3(session);
const dbDir = path.dirname(process.env.DB_PATH ?? path.join(__dirname, "..", "..", "claudetable.db"));

app.use(
  session({
    store: new (SQLiteStore as any)({
      db: "sessions.db",
      dir: dbDir,
    }),
    secret: process.env.SESSION_SECRET ?? "claudetable-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd, // true in production (Zeabur/Railway provide HTTPS)
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// Request logger (dev only)
if (!isProd) {
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString().slice(11, 19)} ${req.method} ${req.path}`);
    next();
  });
}

// ── Auth routes (public) ──────────────────────────────────────────────────────
app.use("/api/v1/auth", authRouter);

// ── Protected API routes ──────────────────────────────────────────────────────
app.use("/api/v1/zones", requireAuth, zonesRouter);
app.use("/api/v1/tables", requireAuth, tablesRouter);
app.use("/api/v1/customers", requireAuth, customersRouter);
app.use("/api/v1/reservations", requireAuth, reservationsRouter);
app.use("/api/v1/availability", requireAuth, availabilityRouter);
app.use("/api/v1/settings", requireAuth, settingsRouter);

app.get("/api/v1/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// ── Production: serve frontend static files ───────────────────────────────────
if (isProd) {
  // In production, CWD is /app (project root); frontend/dist is at /app/frontend/dist
  const frontendDist = path.join(process.cwd(), "frontend", "dist");
  app.use(express.static(frontendDist));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`ClaudeTable backend running on http://localhost:${PORT}`);
});

export default app;
