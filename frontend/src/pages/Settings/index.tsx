import { useState, useEffect } from "react";
import { useSettings } from "../../hooks/useSettings";
import { settingsApi } from "../../api";
import { mutate } from "swr";
import { useUiStore } from "../../store/uiStore";
import type { Settings } from "../../../../shared/types";

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const { addToast } = useUiStore();
  const [form, setForm] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update(form);
      mutate("settings");
      addToast("設定已儲存", "success");
    } catch {
      addToast("儲存失敗", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 max-w-lg">
      <h1 className="text-xl font-bold text-slate-800 mb-5">系統設定</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <Field label="餐廳名稱">
          <input
            type="text"
            value={form.restaurantName ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, restaurantName: e.target.value }))}
            className="input-base"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="開始營業">
            <input
              type="time"
              value={form.openTime ?? "17:00"}
              onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))}
              className="input-base"
            />
          </Field>
          <Field label="結束營業">
            <input
              type="time"
              value={form.closeTime ?? "00:00"}
              onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))}
              className="input-base"
            />
          </Field>
        </div>

        <Field label="預設用餐時間（分鐘）">
          <input
            type="number"
            min={30}
            max={360}
            value={form.defaultDurationMinutes ?? 150}
            onChange={(e) => setForm((f) => ({ ...f, defaultDurationMinutes: Number(e.target.value) }))}
            className="input-base w-28"
          />
        </Field>

        <Field label="尖峰時段（以逗號分隔）">
          <input
            type="text"
            value={(form.peakHours ?? []).join(",")}
            onChange={(e) =>
              setForm((f) => ({ ...f, peakHours: e.target.value.split(",").map((s) => s.trim()) }))
            }
            placeholder="18:00,21:00"
            className="input-base"
          />
          <p className="text-xs text-slate-400 mt-1">格式：HH:MM，以逗號分隔</p>
        </Field>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg font-medium mt-2"
        >
          {saving ? "儲存中..." : "儲存設定"}
        </button>
      </div>

      <style>{`.input-base { width: 100%; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 14px; outline: none; } .input-base:focus { ring: 2px; border-color: #0ea5e9; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
