import React from "react";
import { Check, ShieldCheck, Zap, Gift } from "lucide-react";

interface RegisterPriceSummaryProps {
  basePrice: number;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  trialDays: number;
}

export const RegisterPriceSummary: React.FC<RegisterPriceSummaryProps> = ({
  basePrice,
  discountType,
  discountValue = 0,
  trialDays,
}) => {
  let discountAmount = 0;
  if (discountType === "percent" && discountValue > 0) {
    discountAmount = Math.round((basePrice * discountValue) / 100);
  } else if (discountType === "fixed" && discountValue > 0) {
    discountAmount = Math.min(basePrice, discountValue);
  }

  const finalPriceAfterTrial = Math.max(0, basePrice - discountAmount);

  return (
    <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-pink-950/30 rounded-3xl p-6 border border-indigo-200/60 dark:border-indigo-800/40 shadow-xl backdrop-blur-md">
      {/* Badge Trial Gratis */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold rounded-full shadow-md shadow-emerald-500/20 mb-4">
        <Gift className="w-3.5 h-3.5" />
        <span>GRATIS {trialDays} HARI PERTAMA</span>
      </div>

      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
        Masa Uji Coba Penuh
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
        Coba seluruh fitur kasir POS, nota digital, dan WhatsApp notifikasi otomatis tanpa risiko.
      </p>

      {/* Rincian Harga */}
      <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
        <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
          <span>Biaya hari ini ({trialDays} hari pertama)</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">
            Rp 0 (Gratis)
          </span>
        </div>

        <div className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
          <span>Biaya langganan normal</span>
          <span className={discountAmount > 0 ? "line-through text-slate-400" : "font-medium"}>
            Rp {basePrice.toLocaleString("id-ID")}/bln
          </span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>Diskon Promo Referral</span>
            <span>- Rp {discountAmount.toLocaleString("id-ID")}</span>
          </div>
        )}

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-baseline">
          <div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Biaya setelah trial berakhir
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              (Dapat dibatalkan kapan saja)
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
              Rp {finalPriceAfterTrial.toLocaleString("id-ID")}
            </span>
            <span className="text-xs text-slate-500 font-medium">/bulan</span>
          </div>
        </div>
      </div>

      {/* Keuntungan Paket */}
      <div className="mt-6 space-y-2.5">
        <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5" />
          </div>
          <span>Akses instan setelah pendaftaran selesai</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5" />
          </div>
          <span>Tidak memerlukan kartu kredit untuk mendaftar</span>
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5" />
          </div>
          <span>Dukungan CS WhatsApp penuh</span>
        </div>
      </div>
    </div>
  );
};
