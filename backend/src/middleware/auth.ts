import type { Request, Response, NextFunction } from "express";
import { db } from "../db/client";
import { settings } from "../db/schema";
import { eq } from "drizzle-orm";

/** Read PIN from settings table (default: "1234") */
function getStoredPin(): string {
  const row = db.select().from(settings).where(eq(settings.key, "pin")).limit(1).all()[0];
  return row?.value ?? "1234";
}

/** Middleware: require valid session or 401 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if ((req.session as any)?.authenticated) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized", message: "請先輸入 PIN 碼登入" });
}

export { getStoredPin };
