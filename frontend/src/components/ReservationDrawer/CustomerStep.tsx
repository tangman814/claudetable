import { useState, useEffect } from "react";
import { customersApi } from "../../api";
import type { Customer } from "../../../../shared/types";
import { normalizePhone } from "../../lib/phoneUtils";

interface Props {
  onSelect: (customer: Customer) => void;
  initial?: Customer | null;
}

export function CustomerStep({ onSelect, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(initial ?? null);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // 電話優先搜尋：有電話時用正規化電話搜尋，否則用姓名
  const normalizedPhone = normalizePhone(phone.trim());
  const query = normalizedPhone.length >= 4 ? normalizedPhone : name.trim();
  useEffect(() => {
    if (selected) return;
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await customersApi.search({ q: query });
        setResults(res.data);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, selected]);

  async function handleCreate() {
    if (!name.trim() || !phone.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await customersApi.create({ name: name.trim(), phone: normalizePhone(phone.trim()) });
      setSelected(res.data);
      onSelect(res.data);
    } catch (e: unknown) {
      setError((e as Error).message || "建立失敗");
    } finally {
      setCreating(false);
    }
  }

  function handleSelect(c: Customer) {
    setSelected(c);
    setName(c.name);
    setPhone(c.phone);
    onSelect(c);
  }

  function handleReset() {
    setSelected(null);
    setResults([]);
    setError("");
  }

  // ── Selected state ──────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-semibold text-slate-800">{selected.name}</div>
            <div className="text-sm text-slate-500">{selected.phone}</div>
            {selected.email && <div className="text-xs text-slate-400">{selected.email}</div>}
            {selected.notes && <div className="text-xs text-amber-600 mt-1">📝 {selected.notes}</div>}
            <div className="text-xs text-slate-400 mt-1">到訪 {selected.visitCount} 次</div>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded px-2 py-0.5"
          >
            更換
          </button>
        </div>
      </div>
    );
  }

  // ── Search + create form ────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">姓名</label>
          <input
            type="text"
            placeholder="王大明"
            value={name}
            onChange={(e) => { setName(e.target.value); setSelected(null); }}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">電話</label>
          <input
            type="tel"
            placeholder="0912345678"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setSelected(null); }}
            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      </div>

      {/* Search status */}
      {searching && (
        <div className="text-xs text-slate-400">搜尋中...</div>
      )}

      {/* Matching results */}
      {!searching && results.length > 0 && (
        <div>
          <div className="text-xs text-slate-500 mb-1">符合的客戶記錄 — 點選即帶入</div>
          <div className="border border-slate-200 rounded divide-y divide-slate-100 max-h-44 overflow-y-auto">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className="w-full text-left px-3 py-2.5 hover:bg-sky-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{c.name}</span>
                  <span className="text-xs text-slate-400">到訪 {c.visitCount} 次</span>
                </div>
                <div className="text-xs text-slate-500">{c.phone}</div>
                {c.notes && <div className="text-xs text-amber-600">{c.notes}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No match message */}
      {!searching && results.length === 0 && query.length >= 2 && (
        <div className="text-xs text-slate-400">查無相符客戶</div>
      )}

      {/* Create new customer button — only show when both fields filled */}
      {name.trim() && phone.trim() && (
        <div className="pt-1">
          {error && <div className="text-xs text-red-600 mb-1.5">{error}</div>}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg transition-colors"
          >
            {creating ? "建立中..." : `新增客戶：${name.trim()}（${phone.trim()}）`}
          </button>
        </div>
      )}
    </div>
  );
}
