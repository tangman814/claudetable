import { create } from "zustand";
import { toDateStr } from "../lib/timeUtils";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

interface UiState {
  // Active date for all views
  activeDate: string;
  setActiveDate: (date: string) => void;

  // Active zone for floor plan
  activeZoneId: number | null;
  setActiveZoneId: (id: number | null) => void;

  // Reservation drawer
  drawerOpen: boolean;
  drawerReservationId: number | null;
  openDrawer: (reservationId?: number) => void;
  closeDrawer: () => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (message: string, type?: Toast["type"]) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeDate: toDateStr(new Date()),
  setActiveDate: (date) => set({ activeDate: date }),

  activeZoneId: null,
  setActiveZoneId: (id) => set({ activeZoneId: id }),

  drawerOpen: false,
  drawerReservationId: null,
  openDrawer: (reservationId) =>
    set({ drawerOpen: true, drawerReservationId: reservationId ?? null }),
  closeDrawer: () => set({ drawerOpen: false, drawerReservationId: null }),

  toasts: [],
  addToast: (message, type = "info") =>
    set((s) => ({
      toasts: [
        ...s.toasts,
        { id: Date.now().toString(), message, type },
      ],
    })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
