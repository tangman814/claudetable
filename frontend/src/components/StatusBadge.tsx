import type { ReservationStatus } from "../../../shared/types";
import { cn } from "../lib/cn";

const STATUS_CONFIG: Record<ReservationStatus, { label: string; classes: string }> = {
  confirmed: { label: "已確認", classes: "bg-sky-100 text-sky-700 border-sky-200" },
  seated:    { label: "入座中", classes: "bg-green-100 text-green-700 border-green-200" },
  completed: { label: "已完成", classes: "bg-slate-100 text-slate-600 border-slate-200" },
  cancelled: { label: "已取消", classes: "bg-red-50 text-red-500 border-red-200" },
  "no-show": { label: "未到場", classes: "bg-orange-100 text-orange-600 border-orange-200" },
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border", config.classes)}>
      {config.label}
    </span>
  );
}
