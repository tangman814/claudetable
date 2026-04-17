import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import DailyViewPage from "./pages/DailyView";
import GanttPage from "./pages/Gantt";
import FloorPlanPage from "./pages/FloorPlan";
import ReservationsPage from "./pages/Reservations";
import CustomersPage from "./pages/Customers";
import ZoneTablesPage from "./pages/ZoneTables";
import LoginPage from "./pages/Login";

// ── Auth state ────────────────────────────────────────────────────────────────

function useAuthCheck() {
  const [auth, setAuth] = useState<"loading" | "ok" | "no">("loading");

  useEffect(() => {
    fetch("/api/v1/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAuth(d.authenticated ? "ok" : "no"))
      .catch(() => setAuth("no"));
  }, []);

  return auth;
}

// ── Protected Route wrapper ───────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuthCheck();

  if (auth === "loading") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm">載入中...</div>
      </div>
    );
  }

  if (auth === "no") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected shell */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DailyViewPage />} />
          <Route path="gantt" element={<GanttPage />} />
          <Route path="floor-plan" element={<FloorPlanPage />} />
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="zone-tables" element={<ZoneTablesPage />} />
          {/* Keep old /settings URL working */}
          <Route path="settings" element={<Navigate to="/zone-tables" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
