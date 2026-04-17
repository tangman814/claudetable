import { useState } from "react";
import useSWR, { mutate } from "swr";
import { zonesApi, tablesApi } from "../../api";
import { useUiStore } from "../../store/uiStore";
import { cn } from "../../lib/cn";
import type { Zone, Table } from "../../../../shared/types";

// ─── Zone Panel ───────────────────────────────────────────────────────────────

function ZonePanel({
  zones,
  selectedZoneId,
  onSelect,
}: {
  zones: Zone[];
  selectedZoneId: number | null;
  onSelect: (id: number) => void;
}) {
  const { addToast } = useUiStore();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await zonesApi.create({ name: newName.trim(), sortOrder: zones.length + 1 });
      mutate("zones");
      setNewName("");
      setAdding(false);
      addToast("分區已新增", "success");
    } catch {
      addToast("新增失敗", "error");
    }
  };

  const handleEdit = async (id: number) => {
    try {
      await zonesApi.update(id, { name: editForm.name, description: editForm.description || undefined });
      mutate("zones");
      setEditingId(null);
      addToast("分區已更新", "success");
    } catch {
      addToast("更新失敗", "error");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await zonesApi.delete(id);
      mutate("zones");
      setConfirmDeleteId(null);
      addToast("分區已刪除", "success");
    } catch {
      addToast("刪除失敗（請先刪除此分區的所有桌位）", "error");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">分區管理</h2>
        <button
          onClick={() => { setAdding(true); setNewName(""); }}
          className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded-md"
        >
          + 新增分區
        </button>
      </div>

      {adding && (
        <div className="px-4 py-3 bg-sky-50 border-b border-sky-100 flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="分區名稱（如：1F、2F）"
            className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <button onClick={handleAdd} className="text-sm bg-sky-600 text-white px-3 py-1.5 rounded">確定</button>
          <button onClick={() => setAdding(false)} className="text-sm text-slate-500 px-2">取消</button>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {zones.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-8">尚無分區，請新增</div>
        )}
        {zones.map((zone) => (
          <div key={zone.id}>
            {editingId === zone.id ? (
              <div className="px-4 py-3 bg-slate-50 space-y-2">
                <input
                  autoFocus
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="分區名稱"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                <input
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="說明（選填）"
                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(zone.id)} className="text-sm bg-sky-600 text-white px-3 py-1.5 rounded">儲存</button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-slate-500 px-2">取消</button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => onSelect(zone.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                  selectedZoneId === zone.id ? "bg-sky-50 border-l-2 border-sky-500" : "hover:bg-slate-50"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 text-sm">{zone.name}</div>
                  {zone.description && (
                    <div className="text-xs text-slate-400 truncate">{zone.description}</div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(zone.id); setEditForm({ name: zone.name, description: zone.description ?? "" }); }}
                  className="text-xs text-slate-400 hover:text-sky-600 px-1"
                >
                  編輯
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(zone.id); }}
                  className="text-xs text-slate-400 hover:text-red-500 px-1"
                >
                  刪除
                </button>
              </div>
            )}

            {/* Delete confirm */}
            {confirmDeleteId === zone.id && (
              <div className="px-4 py-3 bg-red-50 border-t border-red-100 text-sm">
                <p className="text-red-700 mb-2">確定刪除「{zone.name}」？（須先刪除此分區所有桌位）</p>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(zone.id)} className="text-sm bg-red-600 text-white px-3 py-1.5 rounded">確定刪除</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-sm text-slate-500 px-2">取消</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Table Panel ──────────────────────────────────────────────────────────────

const SHAPE_OPTIONS = [
  { value: "rect", label: "方桌" },
  { value: "round", label: "圓桌" },
];

interface TableForm {
  tableNumber: string;
  suggestedCapacity: number;
  shape: "rect" | "round";
  label: string;
}

const emptyTableForm: TableForm = {
  tableNumber: "",
  suggestedCapacity: 4,
  shape: "rect",
  label: "",
};

function TablePanel({ zoneId, zoneName }: { zoneId: number; zoneName: string }) {
  const { addToast } = useUiStore();
  const { data } = useSWR(`tables-zone-${zoneId}`, () =>
    tablesApi.list(zoneId).then((r) => r.data)
  );
  const tables = data ?? [];

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<TableForm>(emptyTableForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TableForm>(emptyTableForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const refresh = () => mutate(`tables-zone-${zoneId}`);

  const handleAdd = async () => {
    if (!form.tableNumber.trim() || form.suggestedCapacity < 1) return;
    try {
      await tablesApi.create({
        zoneId,
        tableNumber: form.tableNumber.trim(),
        suggestedCapacity: form.suggestedCapacity,
        shape: form.shape,
        label: form.label || undefined,
      });
      refresh();
      setForm(emptyTableForm);
      setAdding(false);
      addToast("桌位已新增", "success");
    } catch {
      addToast("新增失敗（桌號可能重複）", "error");
    }
  };

  const handleEdit = async (id: number) => {
    if (!editForm.tableNumber.trim()) return;
    try {
      await tablesApi.update(id, {
        tableNumber: editForm.tableNumber.trim(),
        suggestedCapacity: editForm.suggestedCapacity,
        shape: editForm.shape,
        label: editForm.label || undefined,
      });
      refresh();
      setEditingId(null);
      addToast("桌位已更新", "success");
    } catch {
      addToast("更新失敗", "error");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await tablesApi.update(id, { isActive: 0 });
      refresh();
      setConfirmDeleteId(null);
      addToast("桌位已停用", "success");
    } catch {
      addToast("操作失敗", "error");
    }
  };

  const activeTables = tables.filter((t: Table) => t.isActive === 1);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          桌位管理 <span className="text-slate-400 font-normal">— {zoneName}</span>
        </h2>
        <button
          onClick={() => { setAdding(true); setForm(emptyTableForm); }}
          className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded-md"
        >
          + 新增桌位
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="px-4 py-3 bg-sky-50 border-b border-sky-100 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">桌號 *</label>
              <input
                autoFocus
                value={form.tableNumber}
                onChange={(e) => setForm((f) => ({ ...f, tableNumber: e.target.value }))}
                placeholder="如：A1、OUT1"
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">建議容量 *</label>
              <input
                type="number"
                min={1}
                max={50}
                value={form.suggestedCapacity}
                onChange={(e) => setForm((f) => ({ ...f, suggestedCapacity: Number(e.target.value) }))}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">桌型</label>
              <select
                value={form.shape}
                onChange={(e) => setForm((f) => ({ ...f, shape: e.target.value as "rect" | "round" }))}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                {SHAPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">備註（選填）</label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="窗邊、包廂..."
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="text-sm bg-sky-600 text-white px-3 py-1.5 rounded">確定新增</button>
            <button onClick={() => setAdding(false)} className="text-sm text-slate-500 px-2">取消</button>
          </div>
        </div>
      )}

      {/* Table list */}
      <div className="divide-y divide-slate-100">
        {activeTables.length === 0 && !adding && (
          <div className="text-center text-slate-400 text-sm py-8">此分區尚無桌位</div>
        )}
        {activeTables.map((table: Table) => (
          <div key={table.id}>
            {editingId === table.id ? (
              <div className="px-4 py-3 bg-slate-50 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-0.5 block">桌號</label>
                    <input
                      autoFocus
                      value={editForm.tableNumber}
                      onChange={(e) => setEditForm((f) => ({ ...f, tableNumber: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-0.5 block">建議容量</label>
                    <input
                      type="number"
                      min={1}
                      value={editForm.suggestedCapacity}
                      onChange={(e) => setEditForm((f) => ({ ...f, suggestedCapacity: Number(e.target.value) }))}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-0.5 block">桌型</label>
                    <select
                      value={editForm.shape}
                      onChange={(e) => setEditForm((f) => ({ ...f, shape: e.target.value as "rect" | "round" }))}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      {SHAPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-0.5 block">備註</label>
                    <input
                      value={editForm.label}
                      onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(table.id)} className="text-sm bg-sky-600 text-white px-3 py-1.5 rounded">儲存</button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-slate-500 px-2">取消</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <div className="text-lg shrink-0">{table.shape === "round" ? "⭕" : "⬜"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm bg-slate-100 px-2 py-0.5 rounded">
                      {table.tableNumber}
                    </span>
                    <span className="text-xs text-slate-500">容量 {table.suggestedCapacity} 人</span>
                    {table.label && <span className="text-xs text-slate-400">{table.label}</span>}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingId(table.id);
                    setEditForm({
                      tableNumber: table.tableNumber,
                      suggestedCapacity: table.suggestedCapacity,
                      shape: table.shape,
                      label: table.label ?? "",
                    });
                  }}
                  className="text-xs text-slate-400 hover:text-sky-600 px-1"
                >
                  編輯
                </button>
                <button
                  onClick={() => setConfirmDeleteId(table.id)}
                  className="text-xs text-slate-400 hover:text-red-500 px-1"
                >
                  停用
                </button>
              </div>
            )}

            {confirmDeleteId === table.id && (
              <div className="px-4 py-3 bg-red-50 border-t border-red-100 text-sm">
                <p className="text-red-700 mb-2">確定停用桌位「{table.tableNumber}」？</p>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(table.id)} className="text-sm bg-red-600 text-white px-3 py-1.5 rounded">確定停用</button>
                  <button onClick={() => setConfirmDeleteId(null)} className="text-sm text-slate-500 px-2">取消</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PIN Change Panel ─────────────────────────────────────────────────────────

function PinPanel() {
  const { addToast } = useUiStore();
  const [form, setForm] = useState({ currentPin: "", newPin: "", confirmPin: "" });
  const [saving, setSaving] = useState(false);

  const handleChange = async () => {
    if (form.newPin.length < 4) { addToast("新 PIN 碼至少 4 位數", "error"); return; }
    if (!/^\d+$/.test(form.newPin)) { addToast("PIN 碼必須為數字", "error"); return; }
    if (form.newPin !== form.confirmPin) { addToast("兩次輸入的 PIN 碼不一致", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/auth/pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPin: form.currentPin, newPin: form.newPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      addToast("PIN 碼已更新", "success");
      setForm({ currentPin: "", newPin: "", confirmPin: "" });
    } catch (e: unknown) {
      addToast((e as Error).message || "更新失敗", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">🔐 變更登入 PIN 碼</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">目前 PIN 碼</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={form.currentPin}
            onChange={(e) => setForm((f) => ({ ...f, currentPin: e.target.value }))}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">新 PIN 碼（4-8 位數字）</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={form.newPin}
            onChange={(e) => setForm((f) => ({ ...f, newPin: e.target.value }))}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">確認新 PIN 碼</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={8}
            value={form.confirmPin}
            onChange={(e) => setForm((f) => ({ ...f, confirmPin: e.target.value }))}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      </div>
      <button
        onClick={handleChange}
        disabled={saving}
        className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg"
      >
        {saving ? "更新中..." : "更新 PIN 碼"}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ZoneTablesPage() {
  const { data: zonesData } = useSWR("zones", () => zonesApi.list().then((r) => r.data));
  const zones = zonesData ?? [];
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);

  // Auto-select first zone
  const effectiveZoneId = selectedZoneId ?? zones[0]?.id ?? null;
  const selectedZone = zones.find((z: Zone) => z.id === effectiveZoneId);

  return (
    <div className="p-4 md:p-5 max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">分區與桌位管理</h1>
        <p className="text-sm text-slate-500 mt-0.5">管理餐廳分區（1F / 2F / 外場）及各桌位設定</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Left: Zone list */}
        <ZonePanel
          zones={zones}
          selectedZoneId={effectiveZoneId}
          onSelect={(id) => setSelectedZoneId(id)}
        />

        {/* Right: Tables for selected zone */}
        {effectiveZoneId && selectedZone ? (
          <TablePanel zoneId={effectiveZoneId} zoneName={selectedZone.name} />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 text-sm py-16">
            請先選擇一個分區
          </div>
        )}
      </div>

      {/* PIN management */}
      <PinPanel />
    </div>
  );
}
