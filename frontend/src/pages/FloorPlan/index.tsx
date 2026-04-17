import { useState, useCallback } from "react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import type Konva from "konva";
import { useZones, useTables } from "../../hooks/useTables";
import { useSchedule } from "../../hooks/useSchedule";
import { useUiStore } from "../../store/uiStore";
import { tablesApi } from "../../api";
import { mutate } from "swr";
import { ReassignModal } from "./ReassignModal";
import { formatDateDisplay } from "../../lib/timeUtils";
import type { Table, GanttSlot } from "../../../../shared/types";
import { cn } from "../../lib/cn";

type ReassignState = {
  reservationId: number;
  reservationNo: string;
  customerName: string;
  fromTableId: number;
  fromTableNumber: string;
  toTableId: number;
  toTableNumber: string;
} | null;

/** Compute table fill color based on occupancy */
function tableColor(tableId: number, slots: GanttSlot[], reassignSourceId: number | null): string {
  if (reassignSourceId === tableId) return "#f59e0b"; // amber — source of reassign
  const occupied = slots.filter((s) => s.tableId === tableId && s.status !== "cancelled" && s.status !== "no-show");
  if (occupied.length === 0) return "#22c55e"; // green — free
  const seated = occupied.find((s) => s.status === "seated");
  if (seated) return "#ef4444"; // red — in use
  return "#0ea5e9"; // sky — confirmed/upcoming
}

/** Compute stroke color for reassign target candidate */
function strokeColor(isReassignTarget: boolean): string {
  return isReassignTarget ? "#7c3aed" : "#94a3b8";
}

export default function FloorPlanPage() {
  const { activeDate } = useUiStore();
  const { data: zones } = useZones();
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);
  const { data: allTables } = useTables();
  const { data: schedule } = useSchedule(activeDate);
  const slots = schedule?.slots ?? [];

  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [reassignSource, setReassignSource] = useState<{
    tableId: number;
    reservationId: number;
    reservationNo: string;
    customerName: string;
    tableNumber: string;
  } | null>(null);
  const [reassignModal, setReassignModal] = useState<ReassignState>(null);

  const zoneList = zones ?? [];
  const effectiveZoneId = activeZoneId ?? (zoneList[0]?.id ?? null);
  const zoneTables = (allTables ?? []).filter((t) => t.zoneId === effectiveZoneId);

  const selectedTable = zoneTables.find((t) => t.id === selectedTableId);
  const selectedTableSlots = selectedTable
    ? slots.filter((s) => s.tableId === selectedTable.id)
    : [];

  const handleTableDragEnd = useCallback(
    async (table: Table, e: Konva.KonvaEventObject<DragEvent>) => {
      const x = e.target.x();
      const y = e.target.y();
      await tablesApi.updatePosition(table.id, x, y);
      mutate(`tables-${effectiveZoneId}`);
      mutate("tables-all");
    },
    [effectiveZoneId]
  );

  const handleTableClick = (table: Table) => {
    if (reassignSource) {
      // Clicking a different table as target
      if (table.id === reassignSource.tableId) {
        setReassignSource(null);
        return;
      }
      setReassignModal({
        reservationId: reassignSource.reservationId,
        reservationNo: reassignSource.reservationNo,
        customerName: reassignSource.customerName,
        fromTableId: reassignSource.tableId,
        fromTableNumber: reassignSource.tableNumber,
        toTableId: table.id,
        toTableNumber: table.tableNumber,
      });
      return;
    }
    setSelectedTableId((prev) => (prev === table.id ? null : table.id));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center gap-4 flex-wrap">
        <h1 className="text-base font-semibold text-slate-800">平面桌圖</h1>
        <span className="text-sm text-slate-500">{formatDateDisplay(activeDate)}</span>

        {/* Legend */}
        <div className="flex gap-3 ml-auto text-xs">
          {[
            { label: "空閒", color: "bg-green-500" },
            { label: "已訂位", color: "bg-sky-500" },
            { label: "入座中", color: "bg-red-500" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded-sm", s.color)} />
              <span className="text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Reassign mode badge */}
        {reassignSource && (
          <div className="bg-violet-100 text-violet-700 text-xs px-3 py-1 rounded-full border border-violet-200 animate-pulse">
            挪動模式：{reassignSource.customerName}（{reassignSource.tableNumber}）→ 點選目標桌
            <button className="ml-2 hover:text-violet-900" onClick={() => setReassignSource(null)}>✕</button>
          </div>
        )}
      </div>

      {/* Zone tabs */}
      <div className="flex border-b border-slate-200 bg-white px-5 gap-0.5">
        {zoneList.map((zone) => (
          <button
            key={zone.id}
            onClick={() => { setActiveZoneId(zone.id); setSelectedTableId(null); }}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              (activeZoneId === zone.id || (!activeZoneId && zoneList[0]?.id === zone.id))
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {zone.name}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-slate-100 p-2">
          <Stage width={700} height={550} className="bg-white rounded-lg shadow-inner border border-slate-200">
            <Layer>
              {zoneTables.map((table) => {
                const isRound = table.shape === "round";
                const fill = tableColor(table.id, slots, reassignSource?.tableId ?? null);
                const stroke = strokeColor(!!reassignSource && reassignSource.tableId !== table.id);
                const isSelected = selectedTableId === table.id;

                return (
                  <Group
                    key={table.id}
                    x={table.xPosition}
                    y={table.yPosition}
                    draggable={!reassignSource}
                    onClick={() => handleTableClick(table)}
                    onDragEnd={(e) => handleTableDragEnd(table, e)}
                    onMouseEnter={(e) => { const container = e.target.getStage()?.container(); if (container) container.style.cursor = reassignSource ? "pointer" : "grab"; }}
                    onMouseLeave={(e) => { const container = e.target.getStage()?.container(); if (container) container.style.cursor = "default"; }}
                  >
                    {isRound ? (
                      <Circle
                        x={table.width / 2}
                        y={table.height / 2}
                        radius={table.width / 2}
                        fill={fill}
                        stroke={isSelected ? "#0f172a" : stroke}
                        strokeWidth={isSelected ? 3 : 1.5}
                        shadowBlur={isSelected ? 8 : 0}
                        shadowColor="rgba(0,0,0,0.2)"
                      />
                    ) : (
                      <Rect
                        width={table.width}
                        height={table.height}
                        fill={fill}
                        stroke={isSelected ? "#0f172a" : stroke}
                        strokeWidth={isSelected ? 3 : 1.5}
                        cornerRadius={6}
                        shadowBlur={isSelected ? 8 : 0}
                        shadowColor="rgba(0,0,0,0.2)"
                      />
                    )}
                    {/* Table number */}
                    <Text
                      x={isRound ? 0 : 0}
                      y={isRound ? table.height / 2 - 12 : table.height / 2 - 12}
                      width={table.width}
                      align="center"
                      text={table.tableNumber}
                      fontSize={12}
                      fontStyle="bold"
                      fill="white"
                    />
                    {/* Capacity */}
                    <Text
                      x={0}
                      y={isRound ? table.height / 2 + 2 : table.height / 2 + 2}
                      width={table.width}
                      align="center"
                      text={`${table.suggestedCapacity}人`}
                      fontSize={10}
                      fill="rgba(255,255,255,0.85)"
                    />
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </div>

        {/* Right panel — table detail */}
        {selectedTable && (
          <div className="w-64 shrink-0 bg-white border-l border-slate-200 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-base font-bold text-slate-800">{selectedTable.tableNumber}</div>
                <div className="text-xs text-slate-500">建議容量：{selectedTable.suggestedCapacity} 人</div>
              </div>
              <button onClick={() => setSelectedTableId(null)} className="text-slate-400 hover:text-slate-600 text-sm">×</button>
            </div>

            {selectedTableSlots.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-6">今日無訂位</div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-500 mb-1">今日訂位</div>
                {selectedTableSlots.map((slot) => (
                  <div key={`${slot.reservationId}-${slot.tableId}`} className="bg-slate-50 rounded-lg p-2.5 text-xs border border-slate-100">
                    <div className="font-semibold text-slate-800">{slot.customerName}</div>
                    <div className="text-slate-500">{slot.startTime} – {slot.endTime}</div>
                    <div className="text-slate-500">{slot.partySize} 人 · {slot.reservationNo}</div>
                    {slot.status !== "completed" && slot.status !== "cancelled" && (
                      <button
                        onClick={() => {
                          setReassignSource({
                            tableId: selectedTable.id,
                            reservationId: slot.reservationId,
                            reservationNo: slot.reservationNo,
                            customerName: slot.customerName,
                            tableNumber: selectedTable.tableNumber,
                          });
                          setSelectedTableId(null);
                        }}
                        className="mt-1.5 w-full text-center text-violet-600 hover:text-violet-700 text-xs py-1 border border-violet-200 rounded hover:bg-violet-50 transition-colors"
                      >
                        挪動此桌
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reassign modal */}
      {reassignModal && (
        <ReassignModal
          {...reassignModal}
          onClose={() => { setReassignModal(null); setReassignSource(null); }}
        />
      )}
    </div>
  );
}
