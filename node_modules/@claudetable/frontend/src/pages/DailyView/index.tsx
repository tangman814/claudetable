import { mutate } from "swr";
import { useUiStore } from "../../store/uiStore";
import { useReservations } from "../../hooks/useReservations";
import { reservationsApi } from "../../api";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDateDisplay } from "../../lib/timeUtils";
import type { Reservation, ReservationStatus } from "../../../../shared/types";
import { cn } from "../../lib/cn";

const STATUS_OPTIONS: { value: ReservationStatus; label: string }[] = [
  { value: "confirmed", label: "已確認" },
  { value: "seated", label: "入座中" },
  { value: "completed", label: "已完成" },
  { value: "no-show", label: "未到場" },
  { value: "cancelled", label: "已取消" },
];

type RichReservation = Reservation & {
  customerName?: string;
  customerPhone?: string;
  tables?: { tableNumber: string; capacityWarning: number }[];
};

export default function DailyViewPage() {
  const { activeDate, openDrawer, addToast } = useUiStore();
  const { data: reservations, isLoading } = useReservations(activeDate);

  const active = (reservations ?? []).filter(
    (r) => r.status !== "cancelled" && r.status !== "no-show"
  ) as RichReservation[];

  const totalCovers = active.reduce((sum, r) => sum + r.partySize, 0);
  const seated = active.filter((r) => r.status === "seated").length;
  const confirmed = active.filter((r) => r.status === "confirmed").length;
  const overCapacity = active.filter((r) => r.tables?.some((t) => t.capacityWarning === 1)).length;

  // Unassigned = active reservations with no tables
  const unassigned = active.filter((r) => !r.tables || r.tables.length === 0);

  const handleStatusChange = async (id: number, status: ReservationStatus) => {
    try {
      await reservationsApi.update(id, { status });
      mutate(`reservations-${activeDate}-all`);
      mutate(`schedule-${activeDate}`);
      addToast("狀態已更新", "success");
    } catch {
      addToast("更新失敗", "error");
    }
  };

  return (
    <div className="p-4 md:p-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">今日總覽</h1>
          <p className="text-sm text-slate-500 mt-0.5">{formatDateDisplay(activeDate)}</p>
        </div>
        <button
          onClick={() => openDrawer()}
          className="bg-sky-600 hover:bg-sky-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + 新增訂位
        </button>
      </div>

      {/* Stats row — 2 cols on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="今日總人數" value={totalCovers} color="text-sky-600" />
        <StatCard label="已確認" value={confirmed} color="text-blue-600" />
        <StatCard label="入座中" value={seated} color="text-green-600" />
        {unassigned.length > 0 ? (
          <StatCard label="未配桌" value={unassigned.length} color="text-orange-500" />
        ) : overCapacity > 0 ? (
          <StatCard label="超額警告" value={overCapacity} color="text-amber-600" />
        ) : null}
      </div>

      {/* Unassigned reservations warning block */}
      {unassigned.length > 0 && (
        <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-orange-700">
              ⚠️ {unassigned.length} 筆訂位尚未安排桌位
            </span>
          </div>
          <div className="space-y-2">
            {unassigned.map((r) => (
              <div key={r.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                <div>
                  <span className="text-sm font-medium text-slate-800">{r.customerName}</span>
                  <span className="text-xs text-slate-500 ml-2">{r.startTime} · {r.partySize} 人</span>
                </div>
                <button
                  onClick={() => openDrawer(r.id)}
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium border border-orange-300 rounded px-2 py-0.5"
                >
                  安排桌位
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reservation list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">訂位清單</h2>
          <span className="text-xs text-slate-400">{active.length} 筆</span>
        </div>

        {isLoading ? (
          <div className="text-center text-slate-400 text-sm py-10">載入中...</div>
        ) : active.length === 0 ? (
          <div className="text-center text-slate-400 text-sm py-10">今日無訂位</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(reservations ?? []).map((r) => {
              const res = r as RichReservation;
              const hasWarning = res.tables?.some((t) => t.capacityWarning === 1);
              const noTable = !res.tables || res.tables.length === 0;

              return (
                <div key={r.id} className={cn(
                  "flex items-center gap-3 md:gap-4 px-4 py-3 hover:bg-slate-50",
                  hasWarning && "border-l-2 border-amber-400",
                  noTable && r.status !== "cancelled" && r.status !== "no-show" && "border-l-2 border-orange-400"
                )}>
                  {/* Time */}
                  <div className="text-sm font-mono font-semibold text-slate-700 w-12 shrink-0">
                    {r.startTime}
                  </div>

                  {/* Customer */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800 text-sm">{res.customerName}</span>
                      <StatusBadge status={r.status} />
                      {hasWarning && <span className="text-xs text-amber-600">⚠️ 超額</span>}
                      {noTable && r.status !== "cancelled" && r.status !== "no-show" && (
                        <span className="text-xs text-orange-500 font-medium">未配桌</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {res.customerPhone} · {r.partySize} 人 ·{" "}
                      {res.tables && res.tables.length > 0
                        ? res.tables.map((t) => t.tableNumber).join("、")
                        : "待安排"}
                    </div>
                    {r.specialRequests && (
                      <div className="text-xs text-amber-600 mt-0.5 truncate">{r.specialRequests}</div>
                    )}
                  </div>

                  {/* Reservation number — hidden on mobile */}
                  <div className="text-xs font-mono text-slate-400 shrink-0 hidden md:block">
                    {r.reservationNo}
                  </div>

                  {/* Quick status change */}
                  {r.status !== "completed" && r.status !== "cancelled" && (
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value as ReservationStatus)}
                      className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-400 shrink-0"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {/* Edit */}
                  <button
                    onClick={() => openDrawer(r.id)}
                    className="text-xs text-sky-600 hover:text-sky-700 shrink-0"
                  >
                    編輯
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
