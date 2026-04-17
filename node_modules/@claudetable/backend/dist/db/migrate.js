"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const migrator_1 = require("drizzle-orm/better-sqlite3/migrator");
const client_1 = require("./client");
const path_1 = __importDefault(require("path"));
const migrationsFolder = path_1.default.join(__dirname, "migrations");
console.log("Running migrations...");
(0, migrator_1.migrate)(client_1.db, { migrationsFolder });
console.log("Migrations complete.");
client_1.sqlite.close();
