import { Router } from "express";
import { db } from "../db/client";
import { customers, reservations } from "../db/schema";
import { eq, like, or, sql } from "drizzle-orm";
import { CreateCustomerSchema, UpdateCustomerSchema } from "@claudetable/shared";

const router = Router();

router.get("/", (req, res) => {
  const { phone, name, q } = req.query;

  let rows;
  if (q) {
    // Search both name and phone simultaneously
    rows = db.select().from(customers)
      .where(or(
        like(customers.name, `%${q}%`),
        like(customers.phone, `%${q}%`)
      ))
      .orderBy(sql`${customers.visitCount} DESC`)
      .limit(20).all();
  } else if (phone) {
    rows = db.select().from(customers)
      .where(like(customers.phone, `%${phone}%`))
      .limit(20).all();
  } else if (name) {
    rows = db.select().from(customers)
      .where(like(customers.name, `%${name}%`))
      .limit(20).all();
  } else {
    rows = db.select().from(customers)
      .orderBy(sql`${customers.visitCount} DESC`)
      .limit(50).all();
  }

  res.json({ data: rows });
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const customer = db.select().from(customers).where(eq(customers.id, id)).limit(1).all()[0];
  if (!customer) {
    res.status(404).json({ error: "NotFound", message: "Customer not found" });
    return;
  }

  const history = db.select().from(reservations)
    .where(eq(reservations.customerId, id))
    .orderBy(sql`${reservations.date} DESC, ${reservations.startTime} DESC`)
    .limit(20).all();

  res.json({ data: { ...customer, reservations: history } });
});

router.post("/", (req, res) => {
  const body = CreateCustomerSchema.parse(req.body);
  const now = new Date().toISOString();

  // Check for duplicate phone
  const existing = db.select().from(customers).where(eq(customers.phone, body.phone)).limit(1).all()[0];
  if (existing) {
    res.status(409).json({ error: "Conflict", message: "Phone number already registered", data: existing });
    return;
  }

  const [created] = db.insert(customers).values({
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
  const body = UpdateCustomerSchema.parse(req.body);
  const now = new Date().toISOString();
  const [updated] = db.update(customers)
    .set({ ...body, updatedAt: now })
    .where(eq(customers.id, id))
    .returning().all();
  if (!updated) {
    res.status(404).json({ error: "NotFound", message: "Customer not found" });
    return;
  }
  res.json({ data: updated });
});

export default router;
