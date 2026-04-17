import { useState } from "react";
import { useReservations } from "../../hooks/useReservations";
import { useUiStore } from "../../store/uiStore";
import { StatusBadge } from "../../components/StatusBadge";
import { reservationsApi } from "../../api";
import { mutate } from "swr";
import type { Reservation } from "../../../../shared/types";

export default function ReservationsPage() {
  const { activeDate, openDrawer, addToast } = useUiStore();
  const [filter, setFilter] = useState<string>("all");
  const { data: reservations, isLoading } = useReservations(
    filter === "all" ? undefined : activeDate,
    filter !== "all" && filter !== "date" ? filter : undefined
  );

  const handleCancel = async (id: number) => {
    if (!confirm("確定要取消此訂位？")) return;
    try {
      await reservationsApi.cancel(id);
      addToast("訂位已取消", "success");
      mutate(`reservations-${activeDate}-all`);
    } catch {
      addToast("取消失敗", "error");
    }
  };

  return (
    <div className="p-5 max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">訂位管理</h1>
        <button
          onClick={() => openDrawer()}
          className="bg-sky-600 hover:bg-sky-500 text-white text-sm px-4 py-2 rounded-lg font-medium"
        >
          + 新增訂位
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: "all", label: "全部" },
          { value: "date", label: `${activeDate} 當日` },
          { value: "confirmed", label: "已確認" },
          { value: "seated", label: "入座中" },
          { value: "completed", label: "已完成" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filter === f.value
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center text-slate-400 py-10">載入中...</div>
        ) : !reservations?.length ? (
          <div className="text-center text-slate-400 py-10">無訂位記錄</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5">訂位編號</th>
                <th className="text-left px-4 py-2.5">日期時段</th>
                <th className="text-left px-4 py-2.5">客戶</th>
                <th className="text-left px-4 py-2.5">人數</th>
                <th className="text-left px-4 py-2.5">桌號</th>
                <th className="text-left px-4 py-2.5">狀態</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.map((r) => {
                const res = r as Reservation & {
                  customerName?: string;
                  customerPhone?: string;
                  tables?: { tableNumber: string; capacityWarning: number }[];
                };
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{r.reservationNo}</td>
                    <td className="px-4 py-2.5">
                      <div className="text-slate-700">{r.date}</div>
                      <div className="text-xs text-slate-400">{r.startTime}–{r.endTime}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-800">{res.customerName}</div>
                      <div className="text-xs text-slate-400">{res.customerPhone}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{r.partySize}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">
                      {res.tables?.map((t) => t.tableNumber).join("、") ?? "—"}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => openDrawer(r.id)} className="text-xs text-sky-600 hover:text-sky-700">編輯</button>
                        {r.status !== "cancelled" && (
                          <button onClick={() => handleCancel(r.id)} className="text-xs text-red-500 hover:text-red-600">取消</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
