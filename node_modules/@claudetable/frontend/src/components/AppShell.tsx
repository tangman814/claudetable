import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useUiStore } from "../store/uiStore";
import { addDays, formatDateDisplay, toDateStr } from "../lib/timeUtils";
import { ToastStack } from "./ToastStack";
import { ReservationDrawer } from "./ReservationDrawer";
import { cn } from "../lib/cn";

const NAV_ITEMS = [
  { to: "/", label: "今日總覽", icon: "🏠" },
  { to: "/gantt", label: "甘特圖", icon: "📊" },
  { to: "/floor-plan", label: "平面桌圖", icon: "🗺️" },
  { to: "/reservations", label: "訂位管理", icon: "📋" },
  { to: "/customers", label: "客戶資料", icon: "👥" },
  { to: "/zone-tables", label: "分區桌位", icon: "⚙️" },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { activeDate, setActiveDate, openDrawer } = useUiStore();

  return (
    <>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-700">
        <div className="text-lg font-bold text-sky-400">🦞 ClaudeTable</div>
        <div className="text-xs text-slate-400 mt-0.5">海鮮餐廳訂位系統</div>
      </div>

      {/* Date Navigator */}
      <div className="px-3 py-3 border-b border-slate-700">
        <div className="flex items-center gap-1 mb-1">
          <button
            onClick={() => setActiveDate(addDays(activeDate, -1))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 text-sm"
          >
            ‹
          </button>
          <button
            onClick={() => setActiveDate(toDateStr(new Date()))}
            className="flex-1 text-center text-xs text-sky-400 hover:text-sky-300 font-medium"
          >
            今日
          </button>
          <button
            onClick={() => setActiveDate(addDays(activeDate, 1))}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400 text-sm"
          >
            ›
          </button>
        </div>
        <div className="text-xs text-slate-300 text-center leading-snug">
          {formatDateDisplay(activeDate)}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-sky-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              )
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Quick add */}
      <div className="px-3 py-3 border-t border-slate-700">
        <button
          onClick={() => { openDrawer(); onNavigate?.(); }}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          + 新增訂位
        </button>
      </div>
    </>
  );
}

export function AppShell() {
  const { activeDate, setActiveDate, openDrawer } = useUiStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* ── Desktop Sidebar (md+) ── */}
      <aside className="hidden md:flex w-52 shrink-0 bg-slate-900 text-white flex-col shadow-xl z-10">
        <NavContent />
      </aside>

      {/* ── Mobile: Hamburger overlay ── */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          {/* Slide-in menu */}
          <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-50 md:hidden">
            <div className="flex items-center justify-end px-4 py-3 border-b border-slate-700">
              <button
                onClick={() => setMenuOpen(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            <NavContent onNavigate={() => setMenuOpen(false)} />
          </aside>
        </>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Mobile TopBar (< md) ── */}
        <header className="flex md:hidden items-center h-14 px-4 bg-slate-900 text-white shrink-0 gap-3 shadow-sm">
          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(true)}
            className="text-slate-300 hover:text-white text-xl leading-none"
          >
            ☰
          </button>

          {/* Logo */}
          <span className="text-sky-400 font-bold text-sm flex-1">🦞 ClaudeTable</span>

          {/* Date nav */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveDate(addDays(activeDate, -1))}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400"
            >
              ‹
            </button>
            <button
              onClick={() => setActiveDate(toDateStr(new Date()))}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium px-1"
            >
              今日
            </button>
            <button
              onClick={() => setActiveDate(addDays(activeDate, 1))}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-700 text-slate-400"
            >
              ›
            </button>
          </div>

          {/* Quick add */}
          <button
            onClick={() => openDrawer()}
            className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
          >
            +
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <ToastStack />
      <ReservationDrawer />
    </div>
  );
}
