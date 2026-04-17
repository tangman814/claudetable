import { useState } from "react";
import { reservationsApi } from "../../api";
import { mutate } from "swr";
import { useUiStore } from "../../store/uiStore";

interface Props {
  reservationId: number;
  reservationNo: string;
  customerName: string;
  fromTableNumber: string;
  toTableNumber: string;
  fromTableId: number;
  toTableId: number;
  onClose: () => void;
}

export function ReassignModal({
  reservationId,
  reservationNo,
  customerName,
  fromTableNumber,
  toTableNumber,
  fromTableId,
  toTableId,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const { activeDate, addToast } = useUiStore();

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await reservationsApi.reassignTable(reservationId, fromTableId, toTableId);
      if (res.conflictWarning) {
        addToast(`已挪動，但目標桌 ${toTableNumber} 有時段衝突，請確認`, "warning");
      } else {
        addToast(`${customerName} 已從 ${fromTableNumber} 挪動至 ${toTableNumber}`, "success");
      }
      mutate(`schedule-${activeDate}`);
      mutate(`reservations-${activeDate}-all`);
      onClose();
    } catch (e: unknown) {
      addToast((e as Error).message || "挪動失敗", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-80 z-10">
        <h3 className="text-base font-semibold text-slate-800 mb-3">確認桌位挪動</h3>
        <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1.5 mb-4">
          <div className="flex justify-between">
            <span className="text-slate-500">訂位編號</span>
            <span className="font-mono text-slate-700">{reservationNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">客戶</span>
            <span className="font-medium text-slate-800">{customerName}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">桌位變更</span>
            <span className="font-semibold">
              <span className="text-red-500">{fromTableNumber}</span>
              <span className="text-slate-400 mx-1">→</span>
              <span className="text-green-600">{toTableNumber}</span>
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          此操作將把該訂位的桌位從 {fromTableNumber} 改為 {toTableNumber}。目標桌若已有時段衝突，系統仍會執行但會顯示警告。
        </p>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-300 text-slate-600 text-sm py-2 rounded-lg hover:bg-slate-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg font-medium"
          >
            {loading ? "挪動中..." : "確認挪動"}
          </button>
        </div>
      </div>
    </div>
  );
}
