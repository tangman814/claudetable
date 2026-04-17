import { api } from "./client";
import type {
  Zone, CreateZone, UpdateZone,
  Table, CreateTable, UpdateTable,
  Customer, CreateCustomer, UpdateCustomer,
  Reservation, CreateReservation, UpdateReservation,
  TableAvailability, ScheduleResponse,
  Settings,
} from "../../../shared/types";

// ─── Zones ────────────────────────────────────────────────────────────────────
export const zonesApi = {
  list: () => api.get<{ data: Zone[] }>("/zones"),
  create: (body: CreateZone) => api.post<{ data: Zone }>("/zones", body),
  update: (id: number, body: UpdateZone) => api.patch<{ data: Zone }>(`/zones/${id}`, body),
  delete: (id: number) => api.delete<{ data: { deleted: boolean } }>(`/zones/${id}`),
};

// ─── Tables ───────────────────────────────────────────────────────────────────
export const tablesApi = {
  list: (zoneId?: number) =>
    api.get<{ data: Table[] }>(`/tables${zoneId ? `?zoneId=${zoneId}` : ""}`),
  create: (body: CreateTable) => api.post<{ data: Table }>("/tables", body),
  update: (id: number, body: UpdateTable) => api.patch<{ data: Table }>(`/tables/${id}`, body),
  updatePosition: (id: number, x: number, y: number) =>
    api.patch<{ data: Table }>(`/tables/${id}/position`, { xPosition: x, yPosition: y }),
  delete: (id: number) => api.delete<{ data: { deleted: boolean } }>(`/tables/${id}`),
};

// ─── Customers ────────────────────────────────────────────────────────────────
export const customersApi = {
  search: (params: { phone?: string; name?: string; q?: string }) => {
    const qs = toQs(params);
    return api.get<{ data: Customer[] }>(`/customers?${qs}`);
  },
  get: (id: number) => api.get<{ data: Customer & { reservations: Reservation[] } }>(`/customers/${id}`),
  create: (body: CreateCustomer) => api.post<{ data: Customer }>("/customers", body),
  update: (id: number, body: UpdateCustomer) => api.patch<{ data: Customer }>(`/customers/${id}`, body),
};

/** Remove undefined/null values before building query string */
function toQs(params: Record<string, string | undefined | null>): string {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) clean[k] = v;
  }
  return new URLSearchParams(clean).toString();
}

// ─── Reservations ─────────────────────────────────────────────────────────────
export const reservationsApi = {
  list: (params: { date?: string; status?: string }) => {
    const qs = toQs(params);
    return api.get<{ data: Reservation[] }>(`/reservations?${qs}`);
  },
  get: (id: number) => api.get<{ data: Reservation }>(`/reservations/${id}`),
  create: (body: CreateReservation) =>
    api.post<{ data: Reservation; message: string; warnings: Record<number, boolean> }>("/reservations", body),
  update: (id: number, body: UpdateReservation) =>
    api.patch<{ data: Reservation }>(`/reservations/${id}`, body),
  cancel: (id: number) => api.delete<{ data: { cancelled: boolean } }>(`/reservations/${id}`),
  addTable: (id: number, tableId: number) =>
    api.post<{ data: unknown; conflictWarning: boolean }>(`/reservations/${id}/tables`, { tableId }),
  removeTable: (id: number, tableId: number) =>
    api.delete(`/reservations/${id}/tables/${tableId}`),
  reassignTable: (id: number, fromTableId: number, toTableId: number) =>
    api.patch<{ data: Reservation; conflictWarning: boolean }>(
      `/reservations/${id}/tables/reassign`,
      { fromTableId, toTableId }
    ),
};

// ─── Availability ─────────────────────────────────────────────────────────────
export const availabilityApi = {
  get: (date: string, time: string, duration = 150, excludeReservationId?: number) =>
    api.get<{ data: TableAvailability[] }>(
      `/availability?date=${date}&time=${time}&duration=${duration}${excludeReservationId ? `&excludeReservationId=${excludeReservationId}` : ""}`
    ),
  schedule: (date: string) =>
    api.get<{ data: ScheduleResponse }>(`/availability/schedule?date=${date}`),
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get<{ data: Settings }>("/settings"),
  update: (body: Partial<Settings>) => api.patch<{ data: Settings }>("/settings", body),
};
