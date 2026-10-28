import React, { useState } from "react";
import { CheckCircle2, XCircle, CreditCard, X, AlertCircle } from "lucide-react";
import { MarketingWithdrawal } from "../../../types";

interface ProcessWithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawal: MarketingWithdrawal | null;
  onConfirm: (
    id: string,
    status: "paid" | "rejected",
    notes?: string,
    proofUrl?: string
  ) => Promise<{ success: boolean; message?: string }>;
}

export const ProcessWithdrawalModal: React.FC<ProcessWithdrawalModalProps> = ({
  isOpen,
  onClose,
  withdrawal,
  onConfirm,
}) => {
  const [proofUrl, setProofUrl] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !withdrawal) return null;

  const handleProcessPaid = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await onConfirm(
        withdrawal.id,
        "paid",
        notes.trim() || undefined,
        proofUrl.trim() || undefined
      );
      if (res.success) {
        onClose();
      } else {
        setError(res.message || "Gagal memproses penarikan");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessReject = async () => {
    const reason = prompt("Masukkan alasan penolakan penarikan dana:");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Alasan penolakan wajib diisi");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await onConfirm(withdrawal.id, "rejected", reason.trim());
      if (res.success) {
        onClose();
      } else {
        setError(res.message || "Gagal menolak penarikan");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Proses Transfer Pencairan
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Verifikasi & tandai transfer dana ke tim marketing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Rincian Permohonan */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">Penerima Insentif:</span>
              <span className="font-bold text-slate-800 dark:text-white">
                {withdrawal.marketingName || "Tim Marketing"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Nominal Transfer:</span>
              <span className="text-base font-extrabold text-emerald-600 font-mono">
                Rp {withdrawal.amount.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Bank / E-Wallet:</span>
              <span className="font-semibold text-slate-800 dark:text-white uppercase">
                {withdrawal.bankName || "-"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">No. Rekening / No. HP:</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {withdrawal.bankAccountNumber || "-"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Atas Nama:</span>
              <span className="font-semibold text-slate-800 dark:text-white">
                {withdrawal.bankAccountName || "-"}
              </span>
            </div>

            {withdrawal.notes && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[11px] text-slate-500 italic">
                Catatan marketing: "{withdrawal.notes}"
              </div>
            )}
          </div>

          {/* Form input konfirmasi transfer */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bukti Transfer (URL Bukti / Gambar - Opsional)
              </label>
              <input
                type="text"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://... atau nomor referensi struk"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Catatan Transfer Admin (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="misal: Transfer via BCA Mobile ref #10293"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/80 dark:bg-blue-950/20 rounded-xl border border-blue-200 text-[11px] text-blue-700 dark:text-blue-300">
            💡 Mengonfirmasi transfer ini akan otomatis mencatat pengeluaran di Buku Kas Platform (platformCashflow) sebesar Rp {withdrawal.amount.toLocaleString("id-ID")}.
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleProcessReject}
              disabled={submitting}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              Tolak Permohonan
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessPaid}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? "Memproses..." : "Tandai Sudah Ditransfer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

