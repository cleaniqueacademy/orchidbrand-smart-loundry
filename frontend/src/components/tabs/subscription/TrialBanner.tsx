import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, Gift, ArrowRight, X } from "lucide-react";
import { TabType } from "../../../types";

interface TrialBannerProps {
  userId?: string;
  isTrial: boolean;
  daysRemaining: number;
  subscriptionUntil?: string | null;
  setActiveTab: (tab: TabType) => void;
}

export const TrialBanner: React.FC<TrialBannerProps> = ({
  userId,
  isTrial,
  daysRemaining,
  subscriptionUntil,
  setActiveTab,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    if (!userId) {
      setIsDismissed(false);
      return;
    }
    const storageKey = `cleanique_trial_banner_dismissed_${userId}`;
    const dismissedUntil = localStorage.getItem(storageKey);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }
  }, [userId]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userId) {
      const storageKey = `cleanique_trial_banner_dismissed_${userId}`;
      const expireTime = Date.now() + 24 * 60 * 60 * 1000; // Sembunyikan 24 jam
      localStorage.setItem(storageKey, String(expireTime));
    }
    setIsDismissed(true);
  };

  // Jangan tampilkan jika sudah ditutup dalam 24 jam terakhir
  if (isDismissed) return null;

  // Hanya tampilkan jika status trial ATAU sisa hari <= 3
  if (!isTrial && daysRemaining > 3) return null;

  const isExpired = daysRemaining <= 0;
  const isUrgent = daysRemaining <= 2;

  return (
    <div
      onClick={() => setActiveTab("subscription")}
      className={`w-full cursor-pointer px-4 py-2 transition-all flex items-center justify-between text-xs font-semibold shadow-xs ${
        isExpired
          ? "bg-rose-600 text-white"
          : isUrgent
          ? "bg-amber-600 text-white"
          : "bg-blue-700 text-white"
      }`}
    >
      <div className="flex items-center gap-2 max-w-4xl mx-auto flex-1 mr-2">
        {isExpired ? (
          <AlertTriangle className="w-4 h-4 shrink-0" />
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

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all">
          <span>Perpanjang Sekarang</span>
          <ArrowRight className="w-3 h-3" />
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-lg bg-black/15 hover:bg-black/30 text-white/90 hover:text-white transition-all cursor-pointer"
          title="Tutup pengingat selama 24 jam"
          aria-label="Tutup pengingat"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
