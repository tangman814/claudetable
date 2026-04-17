import useSWR from "swr";
import { availabilityApi } from "../api";

export function useSchedule(date: string) {
  return useSWR(
    date ? `schedule-${date}` : null,
    () => availabilityApi.schedule(date).then((r) => r.data),
    { refreshInterval: 30000 }
  );
}
