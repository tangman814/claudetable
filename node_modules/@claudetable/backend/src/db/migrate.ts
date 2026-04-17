import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./client";
import path from "path";

const migrationsFolder = path.join(__dirname, "migrations");

console.log("Running migrations...");
migrate(db, { migrationsFolder });
console.log("Migrations complete.");

sqlite.close();
