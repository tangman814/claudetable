import useSWR from "swr";
import { settingsApi } from "../api";

export function useSettings() {
  return useSWR("settings", () => settingsApi.get().then((r) => r.data));
}
