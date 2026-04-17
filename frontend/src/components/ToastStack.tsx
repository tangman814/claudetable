import { useEffect } from "react";
import { useUiStore } from "../store/uiStore";
import { cn } from "../lib/cn";

export function ToastStack() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onRemove,
}: {
  toast: { id: string; message: string; type: string };
  onRemove: (id: string) => void;
}) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onRemove]);

  const colorMap: Record<string, string> = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    warning: "bg-amber-500 text-white",
    info: "bg-slate-700 text-white",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto px-4 py-2 rounded-lg shadow-lg text-sm max-w-xs",
        colorMap[toast.type] ?? colorMap.info
      )}
    >
      {toast.message}
    </div>
  );
}
