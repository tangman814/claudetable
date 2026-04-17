import useSWR from "swr";
import { reservationsApi } from "../api";

export function useReservations(date?: string, status?: string) {
  const key = `reservations-${date ?? "all"}-${status ?? "all"}`;
  return useSWR(
    key,
    () => reservationsApi.list({ date, status }).then((r) => r.data),
    { refreshInterval: 15000 }
  );
}
