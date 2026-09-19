import React, { useState } from "react";
import { X, CheckCircle2, AlertTriangle, AlertCircle, Calculator, Clock, Store } from "lucide-react";
import { CashierShift } from "../../types";

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift: CashierShift | null;
  onConfirmClose: (actualCashTotal: number, notes?: string) => Promise<any>;
}

export const CloseShiftModal: React.FC<CloseShiftModalProps> = ({
  isOpen,
  onClose,
  currentShift,
  onConfirmClose,
}) => {
  const [actualCashInput, setActualCashInput] = useState<number | "">("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !currentShift) return null;

  const startingCash = currentShift.startingCash || 0;
  const systemCash = currentShift.systemCashTotal || 0;
  const expectedCash = startingCash + systemCash;
  const actualCash = typeof actualCashInput === "number" ? actualCashInput : 0;
  const hasInput = actualCashInput !== "";
  const discrepancy = actualCash - expectedCash;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasInput) {
      alert("Silakan masukkan jumlah uang fisik riil di laci kasir");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await onConfirmClose(actualCash, notes);
      if (res) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openedTimeStr = new Date(currentShift.openedAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const openedDateStr = new Date(currentShift.openedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">
                Tutup Shift & Rekonsiliasi Laci
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Hitung uang fisik di laci dan bandingkan dengan pencatatan sistem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Shift Detail Banner */}
          <div className="p-3 rounded-xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-zinc-500" />
              <span className="font-semibold text-zinc-800">
                {currentShift.cashierName || "Kasir"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-500 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Dibuka: {openedDateStr}, {openedTimeStr} WIB</span>
            </div>
          </div>

          {/* Breakdown Calculator Card */}
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-zinc-600">
              <span>Modal Awal Uang Kembalian</span>
              <span className="font-semibold text-zinc-900">
                Rp {startingCash.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between items-center text-zinc-600">
              <span>
                Total Uang Masuk Tunai Sistem ({currentShift.ordersCount || 0} order)
              </span>
              <span className="font-semibold text-emerald-600">
                + Rp {systemCash.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="pt-2 border-t border-zinc-200 flex justify-between items-center font-bold text-sm text-zinc-900">
              <span>Target Total Uang Fisik di Laci</span>
              <span className="text-zinc-900">
                Rp {expectedCash.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Actual Cash Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-800 mb-1.5">
              Hitungan Uang Fisik Riil di Laci (Rp) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-zinc-400">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={actualCashInput}
                onChange={(e) =>
                  setActualCashInput(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Masukkan total uang fisik yang dihitung di laci"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-zinc-300 text-zinc-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all placeholder:font-normal placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Discrepancy Status Card */}
          {hasInput && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                discrepancy === 0
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : discrepancy > 0
                  ? "bg-amber-50/80 border-amber-200 text-amber-900"
                  : "bg-rose-50/80 border-rose-200 text-rose-900"
              }`}
            >
              {discrepancy === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : discrepancy > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>
                    {discrepancy === 0
                      ? "Status: Rekonsiliasi PAS / COCOK"
                      : discrepancy > 0
                      ? "Status: SELISIH LEBIH (Kelebihan Uang)"
                      : "Status: SELISIH KURANG (Kekurangan Uang)"}
                  </span>
                  <span className="font-black text-sm">
                    {discrepancy === 0
                      ? "Rp 0"
                      : (discrepancy > 0 ? "+" : "") +
                        `Rp ${discrepancy.toLocaleString("id-ID")}`}
                  </span>
                </div>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {discrepancy === 0
                    ? "Uang fisik di laci sesuai 100% dengan total transaksi sistem."
                    : discrepancy > 0
                    ? "Terdapat uang fisik lebih banyak dibanding pencatatan kas sistem."
                    : "Uang fisik di laci lebih sedikit dibanding pencatatan kas sistem. Pastikan semua nota tunai sudah terdata."}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Catatan Serah Terima / Keterangan Selisih (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Selisih uang tip dari pelanggan Rp 2.000 / Diserahkan ke shift sore"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all resize-none placeholder:text-zinc-400"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 text-xs font-semibold hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasInput}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Menyimpan & Menutup Shift..." : "Konfirmasi Tutup Shift"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
