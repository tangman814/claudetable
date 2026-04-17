import { useState } from "react";
import useSWR from "swr";
import { customersApi } from "../../api";
import type { Customer } from "../../../../shared/types";

export default function CustomersPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useSWR(
    query ? `customers-search-${query}` : "customers-top",
    () =>
      query
        ? customersApi.search({ q: query }).then((r) => r.data)
        : customersApi.search({}).then((r) => r.data)
  );

  return (
    <div className="p-5 max-w-3xl">
      <h1 className="text-xl font-bold text-slate-800 mb-4">客戶資料</h1>
      <input
        type="text"
        placeholder="搜尋姓名或電話..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-sky-400"
      />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="text-center text-slate-400 py-10">載入中...</div>
        ) : !data?.length ? (
          <div className="text-center text-slate-400 py-10">無客戶資料</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-2.5">姓名</th>
                <th className="text-left px-4 py-2.5">電話</th>
                <th className="text-left px-4 py-2.5">Email</th>
                <th className="text-left px-4 py-2.5">到訪次數</th>
                <th className="text-left px-4 py-2.5">備註</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data as Customer[]).map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{c.phone}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{c.email ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{c.visitCount}</td>
                  <td className="px-4 py-2.5 text-xs text-amber-600">{c.notes ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
