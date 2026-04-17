import { useEffect, useState } from "react";
import { availabilityApi } from "../../api";
import type { TableAvailability } from "../../../../shared/types";
import { cn } from "../../lib/cn";

interface Props {
  date: string;
  time: string;
  duration: number;
  partySize: number;
  selectedTableIds: number[];
  excludeReservationId?: number;
  onToggleTable: (id: number) => void;
}

export function TableSelectorStep({ date, time, duration, partySize, selectedTableIds, excludeReservationId, onToggleTable }: Props) {
  const [availability, setAvailability] = useState<TableAvailability[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date || !time) return;
    setLoading(true);
    availabilityApi.get(date, time, duration, excludeReservationId)
      .then((r) => setAvailability(r.data))
      .finally(() => setLoading(false));
  }, [date, time, duration, excludeReservationId]);

  // Group by zone
  const byZone: Record<string, TableAvailability[]> = {};
  for (const t of availability) {
    if (t.isActive === 0) continue; // skip inactive tables
    if (!byZone[t.zoneName]) byZone[t.zoneName] = [];
    byZone[t.zoneName].push(t);
  }

  const totalSelectedCapacity = availability
    .filter((t) => selectedTableIds.includes(t.tableId))
    .reduce((sum, t) => sum + t.suggestedCapacity, 0);

  const capacityWarning = partySize > totalSelectedCapacity && selectedTableIds.length > 0;

  // Tables being "stolen" from other reservations
  const stolenTables = availability.filter(
    (t) => selectedTableIds.includes(t.tableId) && !t.isAvailable
  );

  return (
    <div className="space-y-3">
      {/* Party size display */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">人數：{partySize} 人</span>
        {selectedTableIds.length > 0 && (
          <span className="text-xs text-slate-500">
            · 已選容量：{totalSelectedCapacity} 人
          </span>
        )}
      </div>

      {/* Capacity warning */}
      {capacityWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs text-amber-700">
          ⚠️ 人數（{partySize}）超過已選桌位建議容量（{totalSelectedCapacity}），系統仍可完成訂位。
        </div>
      )}

      {/* Steal warning */}
      {stolenTables.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded px-3 py-2 text-xs text-orange-700">
          ⚡ 已選擇 {stolenTables.length} 張正在使用中的桌位，儲存後將從原訂位移除。
        </div>
      )}

      {/* Selected chips */}
      {selectedTableIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTableIds.map((id) => {
            const t = availability.find((a) => a.tableId === id);
            const isStolen = t && !t.isAvailable;
            return (
              <button
                key={id}
                onClick={() => onToggleTable(id)}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border",
                  isStolen
                    ? "bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200"
                    : "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200"
                )}
              >
                {t?.tableNumber ?? id} ×
              </button>
            );
          })}
        </div>
      )}

      {/* Table grid by zone */}
      {loading ? (
        <div className="text-xs text-slate-400 text-center py-4">載入中...</div>
      ) : (
        Object.entries(byZone).map(([zoneName, zoneTables]) => (
          <div key={zoneName}>
            <div className="text-xs font-semibold text-slate-500 mb-1.5">{zoneName}</div>
            <div className="grid grid-cols-4 gap-1.5">
              {zoneTables.map((t) => {
                const isSelected = selectedTableIds.includes(t.tableId);
                const isOccupied = !t.isAvailable;
                return (
                  <button
                    key={t.tableId}
                    onClick={() => onToggleTable(t.tableId)}
                    className={cn(
                      "rounded border p-1.5 text-xs transition-colors text-center",
                      isSelected && !isOccupied
                        ? "bg-sky-600 text-white border-sky-600"
                        : isSelected && isOccupied
                        ? "bg-orange-500 text-white border-orange-500"
                        : isOccupied
                        ? "bg-red-50 text-red-400 border-red-200 hover:bg-red-100"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-sky-50 hover:border-sky-300"
                    )}
                  >
                    <div className="font-semibold">{t.tableNumber}</div>
                    <div className="text-[10px] opacity-80">{t.suggestedCapacity}人</div>
                    {isOccupied && !isSelected && (
                      <div className="text-[9px] text-red-400">已佔用</div>
                    )}
                    {isOccupied && isSelected && (
                      <div className="text-[9px] text-orange-100">強取</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
