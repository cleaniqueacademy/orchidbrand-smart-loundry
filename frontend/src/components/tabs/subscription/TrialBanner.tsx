import React from "react";
import { AlertTriangle, Clock, Gift, ArrowRight } from "lucide-react";
import { TabType } from "../../../types";

interface TrialBannerProps {
  isTrial: boolean;
  daysRemaining: number;
  subscriptionUntil?: string | null;
  setActiveTab: (tab: TabType) => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  isTrial,
  daysRemaining,
  subscriptionUntil,
  setActiveTab,
}) => {
  // Hanya tampilkan jika status trial ATAU sisa hari <= 3
  if (!isTrial && daysRemaining > 3) return null;

  const isExpired = daysRemaining <= 0;
  const isUrgent = daysRemaining <= 2;

  return (
    <div
      onClick={() => setActiveTab("subscription")}
      className={`w-full cursor-pointer px-4 py-2 transition-all flex items-center justify-between text-xs font-semibold shadow-sm ${
        isExpired
          ? "bg-gradient-to-r from-rose-600 to-red-600 text-white"
          : isUrgent
          ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
      }`}
    >
      <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1">
        {isExpired ? (
          <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
        ) : isTrial ? (
          <Gift className="w-4 h-4 shrink-0" />
        ) : (
          <Clock className="w-4 h-4 shrink-0" />
        )}

        <span>
          {isExpired ? (
            <>
              <strong>Masa aktif telah berakhir.</strong> Segera perpanjang langganan agar operasional kasir tetap berjalan lancar!
            </>
          ) : isTrial ? (
            <>
              <strong>Masa Trial Gratis:</strong> Tersisa{" "}
              <span className="underline font-bold">{daysRemaining} hari lagi</span>
              {subscriptionUntil ? ` (hingga ${subscriptionUntil})` : ""}.
            </>
          ) : (
            <>
              <strong>Peringatan Masa Aktif:</strong> Langganan Anda berakhir dalam {daysRemaining} hari.
            </>
          )}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all">
        <span>Perpanjang Sekarang</span>
        <ArrowRight className="w-3 h-3" />
      </div>
    </div>
  );
};
