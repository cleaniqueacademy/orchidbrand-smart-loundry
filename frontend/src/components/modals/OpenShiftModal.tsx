import React, { useState } from "react";
import { X, DollarSign, Clock, ShieldCheck, Sparkles } from "lucide-react";

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashierName: string;
  onConfirmOpen: (startingCash: number, notes?: string) => Promise<boolean>;
}

const PRESET_AMOUNTS = [50000, 100000, 150000, 200000, 300000];

export const OpenShiftModal: React.FC<OpenShiftModalProps> = ({
  isOpen,
  onClose,
  cashierName,
  onConfirmOpen,
}) => {
  const [startingCash, setStartingCash] = useState<number>(100000);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const success = await onConfirmOpen(startingCash, notes);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base flex items-center gap-2">
                Buka Shift Kasir
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Ready
                </span>
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Input modal kas awal sebelum memulai transaksi kasir
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Info Card */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Kasir Bertugas: {cashierName}</div>
              <div className="text-[11px] text-blue-700 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>
                  Waktu Buka: {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                </span>
              </div>
            </div>
          </div>

          {/* Starting Cash Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Modal Awal Uang Kembalian (Rp) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-sm text-zinc-400">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="5000"
                required
                value={startingCash || ""}
                onChange={(e) => setStartingCash(Number(e.target.value) || 0)}
                placeholder="Contoh: 100000"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 font-bold text-base focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all placeholder:font-normal placeholder:text-zinc-400"
              />
            </div>
            {startingCash > 0 && (
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Terbaca: Rp {startingCash.toLocaleString("id-ID")}
              </p>
            )}
          </div>

          {/* Preset Buttons */}
          <div>
            <span className="block text-[11px] font-medium text-zinc-500 mb-2">
              Pilihan Cepat Nominal:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  type="button"
                  key={amt}
                  onClick={() => setStartingCash(amt)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    startingCash === amt
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                      : "bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200"
                  }`}
                >
                  Rp {(amt / 1000).toLocaleString("id-ID")} rb
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStartingCash(0)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  startingCash === 0
                    ? "bg-zinc-900 text-white border-zinc-900 shadow-2xs"
                    : "bg-zinc-50 hover:bg-zinc-100 text-zinc-500 border-zinc-200"
                }`}
              >
                Rp 0 (Tanpa Modal)
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Catatan Pembukaan Shift (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Pecahan 10rb x 5, 5rb x 10"
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
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isSubmitting ? "Membuka Shift..." : "Buka Shift Sekarang"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
