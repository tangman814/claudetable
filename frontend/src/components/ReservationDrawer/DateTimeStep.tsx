import { generateTimeSlots, toDateStr, addDays } from "../../lib/timeUtils";
import { cn } from "../../lib/cn";

interface Props {
  date: string;
  time: string;
  duration: number;
  peakHours: string[];
  onDateChange: (d: string) => void;
  onTimeChange: (t: string) => void;
  onDurationChange: (d: number) => void;
}

const SLOTS = generateTimeSlots("17:00", "00:00", 30);

export function DateTimeStep({ date, time, duration, peakHours, onDateChange, onTimeChange, onDurationChange }: Props) {
  const today = toDateStr(new Date());

  return (
    <div className="space-y-4">
      {/* Date navigation */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">日期</label>
        <div className="flex gap-1 flex-wrap">
          {[-1, 0, 1, 2, 3].map((offset) => {
            const d = addDays(today, offset);
            const label = offset === -1 ? "昨日" : offset === 0 ? "今日" : offset === 1 ? "明日" : d.slice(5);
            return (
              <button
                key={d}
                onClick={() => onDateChange(d)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs border transition-colors",
                  date === d
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                )}
              >
                {label}
              </button>
            );
          })}
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      </div>

      {/* Time slots */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          時段（尖峰：{peakHours.join("、")}）
        </label>
        <div className="grid grid-cols-4 gap-1 max-h-48 overflow-y-auto">
          {SLOTS.map((slot) => {
            const isPeak = peakHours.includes(slot);
            return (
              <button
                key={slot}
                onClick={() => onTimeChange(slot)}
                className={cn(
                  "py-1.5 text-xs rounded border transition-colors",
                  time === slot
                    ? "bg-sky-600 text-white border-sky-600"
                    : isPeak
                    ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {slot}
                {isPeak && <span className="block text-amber-500">★</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          用餐時間（分鐘）
        </label>
        <div className="flex gap-2">
          {[90, 120, 150, 180].map((d) => (
            <button
              key={d}
              onClick={() => onDurationChange(d)}
              className={cn(
                "flex-1 py-1.5 text-xs rounded border transition-colors",
                duration === d
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {d}分
            </button>
          ))}
          <input
            type="number"
            min={30}
            max={360}
            value={duration}
            onChange={(e) => onDurationChange(Number(e.target.value))}
            className="w-16 border border-slate-300 rounded px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      </div>
    </div>
  );
}
