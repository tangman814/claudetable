import { generateGanttTicks } from "../../lib/timeUtils";

const TICKS_60 = generateGanttTicks(60);
const TICKS_30 = generateGanttTicks(30);

export function TimeAxis({ interval = 60 }: { interval?: 30 | 60 }) {
  const ticks = interval === 30 ? TICKS_30 : TICKS_60;

  return (
    <div className="relative h-8 bg-slate-50 border-b border-slate-200">
      {ticks.map((tick) => (
        <div
          key={tick.time}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: `${tick.left}%`, transform: "translateX(-50%)" }}
        >
          <span className="text-[10px] text-slate-400 pt-1 whitespace-nowrap">{tick.time}</span>
          <div className="w-px h-2 bg-slate-300 mt-0.5" />
        </div>
      ))}
    </div>
  );
}
