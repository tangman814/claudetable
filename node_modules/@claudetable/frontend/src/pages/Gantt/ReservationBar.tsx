import { useState } from "react";
import type { GanttSlot } from "../../../../shared/types";
import { ganttLeft, ganttWidth, timeToMinutes } from "../../lib/timeUtils";
import { cn } from "../../lib/cn";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-sky-500 border-sky-600",
  seated:    "bg-green-500 border-green-600",
  completed: "bg-slate-400 border-slate-500",
  cancelled: "bg-red-300 border-red-400",
  "no-show": "bg-orange-400 border-orange-500",
};

interface Props {
  slot: GanttSlot;
  onClick?: (slot: GanttSlot) => void;
}

export function ReservationBar({ slot, onClick }: Props) {
  const [showPopover, setShowPopover] = useState(false);
  const left = ganttLeft(slot.startTime);
  // Compute duration from start/end times (handle midnight crossover)
  const startMins = timeToMinutes(slot.startTime);
  const rawEnd = timeToMinutes(slot.endTime);
  const endMins = rawEnd < startMins ? rawEnd + 24 * 60 : rawEnd;
  const width = ganttWidth(endMins - startMins);
  const colorClass = STATUS_COLORS[slot.status] ?? STATUS_COLORS.confirmed;

  return (
    <div
      className="absolute top-1 bottom-1 rounded cursor-pointer select-none group"
      style={{ left: `${left}%`, width: `${width}%`, minWidth: 40 }}
      onClick={() => onClick?.(slot)}
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      <div
        className={cn(
          "w-full h-full rounded border flex items-center px-1.5 overflow-hidden text-white text-xs font-medium shadow-sm",
          colorClass,
          slot.capacityWarning ? "ring-2 ring-amber-400 ring-offset-0" : ""
        )}
      >
        <span className="truncate">
          {slot.customerName}
          <span className="ml-1 opacity-75">×{slot.partySize}</span>
        </span>
      </div>

      {/* Popover */}
      {showPopover && (
        <div className="absolute bottom-full left-0 mb-1 z-30 bg-slate-800 text-white text-xs rounded-lg shadow-xl p-3 w-52 pointer-events-none">
          <div className="font-semibold">{slot.customerName}</div>
          <div className="text-slate-300 mt-0.5">訂位編號：{slot.reservationNo}</div>
          <div className="text-slate-300">{slot.startTime} – {slot.endTime}</div>
          <div className="text-slate-300">{slot.partySize} 人</div>
          {slot.capacityWarning === 1 && (
            <div className="text-amber-400 mt-1">⚠️ 超過建議容量</div>
          )}
        </div>
      )}
    </div>
  );
}
