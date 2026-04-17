import useSWR from "swr";
import { tablesApi, zonesApi } from "../api";

export function useTables(zoneId?: number) {
  return useSWR(
    `tables-${zoneId ?? "all"}`,
    () => tablesApi.list(zoneId).then((r) => r.data)
  );
}

export function useZones() {
  return useSWR("zones", () => zonesApi.list().then((r) => r.data));
}
