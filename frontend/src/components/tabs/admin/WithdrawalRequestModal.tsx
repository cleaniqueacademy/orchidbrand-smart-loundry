import React, { useState } from "react";
import { DollarSign, AlertCircle, CheckCircle, CreditCard, X } from "lucide-react";
import { MarketingProfile } from "../../../types";

interface WithdrawalRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: MarketingProfile;
  availableBalance: number;
  onSubmit: (payload: {
    amount: number;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    notes?: string;
  }) => Promise<{ success: boolean; message?: string }>;
}

export const WithdrawalRequestModal: React.FC<WithdrawalRequestModalProps> = ({
  isOpen,
  onClose,
  profile,
  availableBalance,
  onSubmit,
}) => {
  const [amount, setAmount] = useState<string>("");
  const [bankName, setBankName] = useState<string>(profile?.bankName || "");
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(
    profile?.bankAccountNumber || ""
  );
  const [bankAccountName, setBankAccountName] = useState<string>(
    profile?.bankAccountName || ""
  );
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = Number(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numAmount <= 0) {
      setError("Nominal penarikan harus lebih dari Rp 0");
      return;
    }

    if (numAmount > availableBalance) {
      setError(
        `Nominal melebihi saldo tersedia (Maksimal Rp ${availableBalance.toLocaleString("id-ID")})`
      );
      return;
    }

    if (!bankName.trim() || !bankAccountNumber.trim() || !bankAccountName.trim()) {
      setError("Informasi rekening bank / e-wallet tujuan wajib diisi lengkap");
      return;
    }

    setSubmitting(true);
    try {
      const res = await onSubmit({
        amount: numAmount,
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim(),
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.message || "Gagal mengajukan penarikan");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  const setFullBalance = () => {
    setAmount(availableBalance.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                Tarik Saldo Komisi
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pencairan dana insentif marketing ke rekening
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Info Saldo */}
          <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-400">
                Saldo Siap Ditarik
              </div>
              <div className="text-xl font-bold text-emerald-900 dark:text-emerald-300 font-mono mt-0.5">
                Rp {availableBalance.toLocaleString("id-ID")}
              </div>
            </div>
            {availableBalance > 0 && (
              <button
                type="button"
                onClick={setFullBalance}
                className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs cursor-pointer"
              >
                Tarik Semua
              </button>
            )}
          </div>

          {/* Input Nominal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nominal Penarikan (Rp) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                max={availableBalance}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-800 dark:text-white font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            {/* Quick buttons */}
            <div className="flex gap-1.5 mt-2">
              {[25000, 50000, 100000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset.toString())}
                  disabled={preset > availableBalance}
                  className="px-2 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {preset.toLocaleString("id-ID")}
                </button>
              ))}
            </div>
          </div>

          {/* Rekening Tujuan */}
          <div className="space-y-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              <span>Rekening / E-Wallet Tujuan Transfer</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nama Bank / E-Wallet (BCA, Mandiri, BRI, Dana, GoPay, dll) *
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="misal: BCA / Mandiri / GoPay"
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Nomor Rekening / No. HP *
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="1234567890"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Atas Nama Pemilik *
                </label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="Nama sesuai buku tabungan"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="misal: transfer via BI Fast / QRIS"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || availableBalance <= 0 || numAmount <= 0}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {submitting ? "Memproses..." : "Ajukan Penarikan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

