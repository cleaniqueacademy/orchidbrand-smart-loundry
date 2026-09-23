import React from "react";
import { CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";

interface ReferralBadgeProps {
  loading: boolean;
  valid: boolean | null;
  codeName?: string;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  message?: string;
}

export const ReferralBadge: React.FC<ReferralBadgeProps> = ({
  loading,
  valid,
  codeName,
  discountType,
  discountValue,
  message,
}) => {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Memeriksa kode promo...</span>
      </div>
    );
  }

  if (valid === true) {
    const discountText =
      discountType === "percent"
        ? `${discountValue}%`
        : `Rp ${Number(discountValue || 0).toLocaleString("id-ID")}`;

    return (
      <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            Kode <strong>{codeName}</strong> aktif! Hemat {discountText}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-200/60 dark:bg-emerald-800/60 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-md font-bold">
          <Sparkles className="w-3 h-3" /> Berhasil
        </span>
      </div>
    );
  }

  if (valid === false && message) {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>{message} — Pendaftaran tetap dapat dilanjutkan dengan akun reguler.</span>
      </div>
    );
  }

  return null;
};
