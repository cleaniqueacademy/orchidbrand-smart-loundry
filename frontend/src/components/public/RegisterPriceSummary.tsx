import React from "react";
import { Check, Gift, Sparkles, ShieldCheck } from "lucide-react";

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
    <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-500/5 p-4 sm:p-5 shadow-xs">
      {/* Badge Trial Gratis */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold rounded-full shadow-sm mb-3">
        <Gift className="w-3.5 h-3.5" />
        <span>GRATIS {trialDays} HARI PERTAMA</span>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-emerald-600" />
        Akses Uji Coba Penuh
      </h3>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
        Nikmati seluruh fitur kasir POS, cetak struk thermal, dan WhatsApp notifikasi otomatis tanpa biaya pendaftaran.
      </p>

      {/* Rincian Harga */}
      <div className="mt-4 pt-3.5 border-t border-slate-200/80 space-y-2 text-xs">
        <div className="flex justify-between items-center text-slate-600">
          <span>Biaya hari ini ({trialDays} hari pertama)</span>
          <span className="font-bold text-emerald-600 text-sm">
            Rp 0 (Gratis)
          </span>
        </div>

        <div className="flex justify-between items-center text-slate-600">
          <span>Biaya langganan normal</span>
          <span className={discountAmount > 0 ? "line-through text-slate-400" : "font-semibold text-slate-800"}>
            Rp {basePrice.toLocaleString("id-ID")}/bln
          </span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between items-center text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-1 rounded-lg">
            <span>Diskon Promo Referral</span>
            <span>- Rp {discountAmount.toLocaleString("id-ID")}</span>
          </div>
        )}

        <div className="pt-2.5 border-t border-slate-200/90 flex justify-between items-baseline">
          <div>
            <span className="text-xs font-semibold text-slate-700 block">
              Biaya setelah trial berakhir
            </span>
            <span className="text-[10px] text-slate-400">
              (Dapat dibatalkan kapan saja)
            </span>
          </div>
          <div className="text-right">
            <span className="text-lg sm:text-xl font-extrabold text-emerald-700">
              Rp {finalPriceAfterTrial.toLocaleString("id-ID")}
            </span>
            <span className="text-xs text-slate-500 font-medium">/bulan</span>
          </div>
        </div>
      </div>

      {/* Keuntungan Paket */}
      <div className="mt-4 pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Akses instan setelah registrasi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Tanpa perlu kartu kredit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>WhatsApp support prioritas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Data aman terisolasi</span>
        </div>
      </div>
    </div>
  );
};
