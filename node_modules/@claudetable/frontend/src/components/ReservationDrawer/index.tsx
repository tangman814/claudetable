import { useState, useEffect } from "react";
import { mutate } from "swr";
import { useUiStore } from "../../store/uiStore";
import { reservationsApi } from "../../api";
import { useSettings } from "../../hooks/useSettings";
import type { Customer, Reservation } from "../../../../shared/types";
import { CustomerStep } from "./CustomerStep";
import { DateTimeStep } from "./DateTimeStep";
import { TableSelectorStep } from "./TableSelectorStep";
import { cn } from "../../lib/cn";

const STEPS = ["日期時段", "選桌", "客戶資訊", "確認"];

interface FormState {
  customer: Customer | null;
  date: string;
  time: string;
  duration: number;
  partySize: number;
  tableIds: number[];
  specialRequests: string;
}

// Extended type for reservation list rows (includes joined fields)
type RichReservation = Reservation & {
  tables?: { tableId: number; tableNumber: string; zoneId: number; zoneName?: string; suggestedCapacity: number; capacityWarning: number }[];
};

export function ReservationDrawer() {
  const { drawerOpen, drawerReservationId, closeDrawer, addToast, activeDate } = useUiStore();
  const { data: settings } = useSettings();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // For edit mode: track the original tableIds so we can diff on save
  const [originalTableIds, setOriginalTableIds] = useState<number[]>([]);
  const [originalDate, setOriginalDate] = useState("");

  const defaultForm = (): FormState => ({
    customer: null,
    date: activeDate,
    time: "18:00",
    duration: settings?.defaultDurationMinutes ?? 150,
    partySize: 2,
    tableIds: [],
    specialRequests: "",
  });

  const [form, setForm] = useState<FormState>(defaultForm());

  // ── Load existing reservation for edit mode ────────────────────────────────
  useEffect(() => {
    if (!drawerOpen) return;

    if (drawerReservationId) {
      setLoadingEdit(true);
      reservationsApi.get(drawerReservationId)
        .then((r) => {
          const res = r.data as RichReservation;
          const existingTableIds = (res.tables ?? []).map((t) => t.tableId);
          setOriginalTableIds(existingTableIds);
          setOriginalDate(res.date);
          setForm({
            customer: res.customer ?? null,
            date: res.date,
            time: res.startTime,
            duration: res.durationMinutes,
            partySize: res.partySize,
            tableIds: existingTableIds,
            specialRequests: res.specialRequests ?? "",
          });
          setStep(0);
        })
        .catch(() => addToast("載入訂位資料失敗", "error"))
        .finally(() => setLoadingEdit(false));
    } else {
      // New reservation
      setOriginalTableIds([]);
      setOriginalDate("");
      setStep(0);
      setForm(defaultForm());
    }
  }, [drawerOpen, drawerReservationId]);

  const isEdit = !!drawerReservationId;

  const canNext = () => {
    if (step === 0) return !!form.date && !!form.time;
    if (step === 1) return true; // optional
    if (step === 2) return !!form.customer;
    return true;
  };

  // ── Submit: create or update ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.customer) return;
    setSubmitting(true);
    try {
      if (isEdit) {
        // PATCH reservation fields
        await reservationsApi.update(drawerReservationId!, {
          customerId: form.customer.id,
          partySize: form.partySize,
          date: form.date,
          startTime: form.time,
          durationMinutes: form.duration,
          specialRequests: form.specialRequests || null,
        });

        // Reconcile tables: add new, remove old
        const toAdd = form.tableIds.filter((id) => !originalTableIds.includes(id));
        const toRemove = originalTableIds.filter((id) => !form.tableIds.includes(id));
        for (const tableId of toAdd) {
          await reservationsApi.addTable(drawerReservationId!, tableId);
        }
        for (const tableId of toRemove) {
          await reservationsApi.removeTable(drawerReservationId!, tableId);
        }

        addToast("訂位已更新", "success");
        mutate(`reservations-${form.date}-all`);
        if (originalDate && originalDate !== form.date) {
          mutate(`reservations-${originalDate}-all`);
        }
        mutate(`schedule-${form.date}`);
      } else {
        // POST new reservation
        await reservationsApi.create({
          customerId: form.customer.id,
          partySize: form.partySize,
          date: form.date,
          startTime: form.time,
          durationMinutes: form.duration,
          tableIds: form.tableIds.length > 0 ? form.tableIds : undefined,
          specialRequests: form.specialRequests || undefined,
          createdBy: "櫃檯",
        });
        addToast("訂位建立成功！", "success");
        mutate(`reservations-${form.date}-all`);
        mutate(`schedule-${form.date}`);
      }
      closeDrawer();
    } catch (e: unknown) {
      addToast((e as Error).message || (isEdit ? "更新訂位失敗" : "建立訂位失敗"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!drawerOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={closeDrawer} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[420px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">
            {isEdit ? "編輯訂位" : "新增訂位"}
          </h2>
          <button onClick={closeDrawer} className="text-slate-400 hover:text-slate-600 text-lg">×</button>
        </div>

        {/* Step indicators */}
        <div className="flex px-5 py-3 gap-1 border-b border-slate-100">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div className={cn(
                "w-5 h-5 rounded-full text-xs flex items-center justify-center font-semibold shrink-0",
                i < step ? "bg-sky-600 text-white" : i === step ? "bg-sky-100 text-sky-700 ring-2 ring-sky-600" : "bg-slate-100 text-slate-400"
              )}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={cn("text-xs hidden md:inline", i === step ? "text-sky-700 font-medium" : "text-slate-400")}>{label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-1" />}
            </div>
          ))}
        </div>

        {/* Loading overlay for edit mode */}
        {loadingEdit ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            載入訂位資料...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">

            {/* Step 0: 日期時段 + 人數 */}
            {step === 0 && (
              <div>
                <div className="text-sm font-medium text-slate-700 mb-3">選擇日期與時段</div>
                <DateTimeStep
                  date={form.date}
                  time={form.time}
                  duration={form.duration}
                  peakHours={settings?.peakHours ?? ["18:00", "21:00"]}
                  onDateChange={(d) => setForm((f) => ({ ...f, date: d }))}
                  onTimeChange={(t) => setForm((f) => ({ ...f, time: t }))}
                  onDurationChange={(d) => setForm((f) => ({ ...f, duration: d }))}
                />
                <div className="mt-4">
                  <label className="block text-xs font-medium text-slate-500 mb-1">用餐人數</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.partySize}
                    onChange={(e) => setForm((f) => ({ ...f, partySize: Number(e.target.value) }))}
                    className="w-24 border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>
            )}

            {/* Step 1: 選桌（可略過） */}
            {step === 1 && (
              <div>
                <div className="text-sm font-medium text-slate-700 mb-1">
                  選擇桌位
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    {form.date} {form.time}，{form.partySize} 人
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  可直接點「下一步」略過，稍後再安排桌位。已佔用桌位可強制選取（將從原訂位移除）。
                </p>
                <TableSelectorStep
                  date={form.date}
                  time={form.time}
                  duration={form.duration}
                  partySize={form.partySize}
                  selectedTableIds={form.tableIds}
                  excludeReservationId={isEdit ? drawerReservationId ?? undefined : undefined}
                  onToggleTable={(id) =>
                    setForm((f) => ({
                      ...f,
                      tableIds: f.tableIds.includes(id)
                        ? f.tableIds.filter((t) => t !== id)
                        : [...f.tableIds, id],
                    }))
                  }
                />
              </div>
            )}

            {/* Step 2: 客戶資訊 */}
            {step === 2 && (
              <div>
                <div className="text-sm font-medium text-slate-700 mb-3">客戶資訊</div>
                <CustomerStep
                  onSelect={(c) => setForm((f) => ({ ...f, customer: c }))}
                  initial={form.customer}
                />
              </div>
            )}

            {/* Step 3: 確認 */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-slate-700">確認訂位資訊</div>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                  <Row label="日期" value={form.date} />
                  <Row label="時段" value={`${form.time}（${form.duration} 分鐘）`} />
                  <Row label="人數" value={`${form.partySize} 人`} />
                  <Row
                    label="桌號"
                    value={
                      form.tableIds.length > 0
                        ? `${form.tableIds.length} 張桌`
                        : "未配桌（稍後安排）"
                    }
                  />
                  <Row label="客戶" value={form.customer?.name ?? "-"} />
                  <Row label="電話" value={form.customer?.phone ?? "-"} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">特殊需求備註</label>
                  <textarea
                    value={form.specialRequests}
                    onChange={(e) => setForm((f) => ({ ...f, specialRequests: e.target.value }))}
                    rows={3}
                    placeholder="過敏、慶生、特殊安排..."
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {!loadingEdit && (
          <div className="flex gap-2 px-5 py-4 border-t border-slate-200">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 border border-slate-300 text-slate-600 text-sm py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                上一步
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext()}
                className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
              >
                {step === 1 && form.tableIds.length === 0 ? "略過，下一步" : "下一步"}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.customer}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg font-medium transition-colors"
              >
                {submitting
                  ? isEdit ? "更新中..." : "建立中..."
                  : isEdit ? "確認更新訂位" : "確認建立訂位"
                }
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
