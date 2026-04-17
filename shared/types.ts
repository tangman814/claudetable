import { z } from "zod";

// ─── Zones ───────────────────────────────────────────────────────────────────

export const ZoneSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number(),
  createdAt: z.string(),
});

export const CreateZoneSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
});

export const UpdateZoneSchema = CreateZoneSchema.partial();

export type Zone = z.infer<typeof ZoneSchema>;
export type CreateZone = z.infer<typeof CreateZoneSchema>;
export type UpdateZone = z.infer<typeof UpdateZoneSchema>;

// ─── Tables ──────────────────────────────────────────────────────────────────

export const TableSchema = z.object({
  id: z.number(),
  zoneId: z.number(),
  tableNumber: z.string(),
  label: z.string().nullable(),
  suggestedCapacity: z.number(),
  xPosition: z.number(),
  yPosition: z.number(),
  width: z.number(),
  height: z.number(),
  shape: z.enum(["rect", "round"]),
  isActive: z.number(), // 1 | 0
  createdAt: z.string(),
  updatedAt: z.string(),
  // joined
  zoneName: z.string().optional(),
});

export const CreateTableSchema = z.object({
  zoneId: z.number(),
  tableNumber: z.string().min(1),
  label: z.string().optional(),
  suggestedCapacity: z.number().min(1),
  xPosition: z.number().optional(),
  yPosition: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  shape: z.enum(["rect", "round"]).optional(),
});

export const UpdateTableSchema = CreateTableSchema.partial().extend({
  isActive: z.number().optional(),
});

export const UpdateTablePositionSchema = z.object({
  xPosition: z.number(),
  yPosition: z.number(),
});

export type Table = z.infer<typeof TableSchema>;
export type CreateTable = z.infer<typeof CreateTableSchema>;
export type UpdateTable = z.infer<typeof UpdateTableSchema>;

// ─── Customers ───────────────────────────────────────────────────────────────

export const CustomerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable(),
  notes: z.string().nullable(),
  visitCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

export type Customer = z.infer<typeof CustomerSchema>;
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomer = z.infer<typeof UpdateCustomerSchema>;

// ─── Reservations ────────────────────────────────────────────────────────────

export const ReservationStatusSchema = z.enum([
  "confirmed",
  "seated",
  "completed",
  "cancelled",
  "no-show",
]);

export const ReservationSchema = z.object({
  id: z.number(),
  reservationNo: z.string(),
  customerId: z.number(),
  partySize: z.number(),
  date: z.string(), // YYYY-MM-DD
  startTime: z.string(), // HH:MM
  endTime: z.string(), // HH:MM
  durationMinutes: z.number(),
  status: ReservationStatusSchema,
  specialRequests: z.string().nullable(),
  internalNotes: z.string().nullable(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // joined
  customer: CustomerSchema.optional(),
  tables: z.array(
    z.object({
      id: z.number(),
      tableId: z.number(),
      tableNumber: z.string(),
      zoneId: z.number(),
      zoneName: z.string(),
      suggestedCapacity: z.number(),
      capacityWarning: z.number(),
    })
  ).optional(),
});

export const CreateReservationSchema = z.object({
  customerId: z.number(),
  partySize: z.number().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().min(30).optional(),
  specialRequests: z.string().optional(),
  internalNotes: z.string().optional(),
  createdBy: z.string().optional(),
  tableIds: z.array(z.number()).optional(),
});

export const UpdateReservationSchema = z.object({
  customerId: z.number().optional(),
  partySize: z.number().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  durationMinutes: z.number().min(30).optional(),
  status: ReservationStatusSchema.optional(),
  specialRequests: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
});

export const ReassignTableSchema = z.object({
  fromTableId: z.number(),
  toTableId: z.number(),
});

export type Reservation = z.infer<typeof ReservationSchema>;
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;
export type CreateReservation = z.infer<typeof CreateReservationSchema>;
export type UpdateReservation = z.infer<typeof UpdateReservationSchema>;

// ─── Availability / Schedule ─────────────────────────────────────────────────

export const TableAvailabilitySchema = z.object({
  tableId: z.number(),
  tableNumber: z.string(),
  zoneId: z.number(),
  zoneName: z.string(),
  suggestedCapacity: z.number(),
  isActive: z.number(),
  isAvailable: z.boolean(),
  conflictingReservations: z.array(
    z.object({
      reservationId: z.number(),
      reservationNo: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      partySize: z.number(),
      customerName: z.string(),
    })
  ),
});

export const GanttSlotSchema = z.object({
  tableId: z.number(),
  reservationId: z.number(),
  reservationNo: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  customerName: z.string(),
  partySize: z.number(),
  status: ReservationStatusSchema,
  capacityWarning: z.number(),
  suggestedCapacity: z.number(),
});

export const ScheduleResponseSchema = z.object({
  date: z.string(),
  tables: z.array(TableSchema),
  slots: z.array(GanttSlotSchema),
});

export type TableAvailability = z.infer<typeof TableAvailabilitySchema>;
export type GanttSlot = z.infer<typeof GanttSlotSchema>;
export type ScheduleResponse = z.infer<typeof ScheduleResponseSchema>;

// ─── Settings ────────────────────────────────────────────────────────────────

export const SettingsSchema = z.object({
  restaurantName: z.string(),
  openTime: z.string(), // HH:MM
  closeTime: z.string(), // HH:MM
  defaultDurationMinutes: z.number(),
  peakHours: z.array(z.string()), // ["18:00", "21:00"]
});

export type Settings = z.infer<typeof SettingsSchema>;

// ─── API Response wrapper ────────────────────────────────────────────────────

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type ApiError = {
  error: string;
  message: string;
  details?: unknown;
};
