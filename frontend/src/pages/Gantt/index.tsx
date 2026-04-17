import { useEffect, useRef, useState } from "react";
import { useUiStore } from "../../store/uiStore";
import { useSchedule } from "../../hooks/useSchedule";
import { TimeAxis } from "./TimeAxis";
import { ReservationBar } from "./ReservationBar";
import { currentTimeLeft, formatDateDisplay } from "../../lib/timeUtils";
import type { GanttSlot, Table } from "../../../../shared/types";
import { cn } from "../../lib/cn";

export default function GanttPage() {
  const { activeDate } = useUiStore();
  const { data: schedule, isLoading } = useSchedule(activeDate);
  const [nowLeft, setNowLeft] = useState<number | null>(null);

  // Update current time line every minute
  useEffect(() => {
    const update = () => setNowLeft(currentTimeLeft());
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-slate-400">載入中...</div>;
  }

  const tables = schedule?.tables ?? [];
  const slots = schedule?.slots ?? [];

  const slotsByTable: Record<number, GanttSlot[]> = {};
  for (const slot of slots) {
    if (!slotsByTable[slot.tableId]) slotsByTable[slot.tableId] = [];
    slotsByTable[slot.tableId].push(slot);
  }

  // Group tables by zone
  const zoneMap: Record<string, { zoneId: number; tables: Table[] }> = {};
  for (const t of tables) {
    const key = (t as Table & { zoneName?: string }).zoneName ?? `Zone${t.zoneId}`;
    if (!zoneMap[key]) zoneMap[key] = { zoneId: t.zoneId, tables: [] };
    zoneMap[key].tables.push(t);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center gap-4">
        <h1 className="text-base font-semibold text-slate-800">甘特圖</h1>
        <span className="text-sm text-slate-500">{formatDateDisplay(activeDate)}</span>
        <div className="flex gap-3 ml-auto text-xs">
          {[
            { label: "已確認", color: "bg-sky-500" },
            { label: "入座中", color: "bg-green-500" },
            { label: "已完成", color: "bg-slate-400" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded", s.color)} />
              <span className="text-slate-500">{s.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded ring-2 ring-amber-400 bg-sky-500" />
            <span className="text-slate-500">超額警告</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex" style={{ minWidth: 900 }}>
          {/* Left column header */}
          <div className="w-28 shrink-0 bg-slate-50 border-r border-slate-200 border-b border-slate-200 flex items-center px-3">
            <span className="text-xs text-slate-400">桌號</span>
          </div>

          {/* Time axis */}
          <div className="flex-1 relative">
            <TimeAxis interval={60} />
          </div>
        </div>

        {/* Table rows */}
        {Object.entries(zoneMap).map(([zoneName, { tables: zoneTables }]) => (
          <div key={zoneName}>
            {/* Zone header */}
            <div className="flex bg-slate-100 border-b border-slate-200" style={{ minWidth: 900 }}>
              <div className="w-28 shrink-0 px-3 py-1 border-r border-slate-200">
                <span className="text-xs font-semibold text-slate-500">{zoneName}</span>
              </div>
              <div className="flex-1" />
            </div>

            {zoneTables.map((table) => {
              const tableSlots = slotsByTable[table.id] ?? [];
              return (
                <div
                  key={table.id}
                  className="flex border-b border-slate-100 hover:bg-slate-50/50"
                  style={{ minWidth: 900, height: 52 }}
                >
                  {/* Table label */}
                  <div className="w-28 shrink-0 border-r border-slate-200 flex flex-col justify-center px-3">
                    <span className="text-xs font-semibold text-slate-700">{table.tableNumber}</span>
                    <span className="text-[10px] text-slate-400">{table.suggestedCapacity}人</span>
                  </div>

                  {/* Bars area */}
                  <div className="flex-1 relative">
                    {/* Hour grid lines */}
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px bg-slate-100"
                        style={{ left: `${(i / 7) * 100}%` }}
                      />
                    ))}

                    {/* Current time line */}
                    {nowLeft !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10 pointer-events-none"
                        style={{ left: `${nowLeft}%` }}
                      />
                    )}

                    {/* Reservation bars */}
                    {tableSlots.map((slot) => (
                      <ReservationBar
                        key={`${slot.reservationId}-${slot.tableId}`}
                        slot={slot}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
