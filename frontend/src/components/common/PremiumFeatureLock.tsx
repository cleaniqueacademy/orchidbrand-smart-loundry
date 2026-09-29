import React, { useState } from "react";
import {
  Crown,
  Lock,
  CheckCircle2,
  Bell,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import {
  PremiumFeatureKey,
  PREMIUM_FEATURES_REGISTRY,
} from "../../types";
import { useToast } from "./ToastContext";

export interface PremiumFeatureLockProps {
  readonly feature: PremiumFeatureKey;
  readonly children: React.ReactNode;
  readonly isLocked?: boolean;
  readonly customTitle?: string;
  readonly customSubtitle?: string;
  readonly onLearnMore?: () => void;
}

export const PremiumFeatureLock: React.FC<PremiumFeatureLockProps> = ({
  feature,
  children,
  isLocked = true,
  customTitle,
  customSubtitle,
  onLearnMore,
}) => {
  const toast = useToast();
  const [notified, setNotified] = useState(false);

  // Jika fitur tidak dikunci, tampilkan children normal tanpa overlay
  if (!isLocked) {
    return <>{children}</>;
  }

  const meta = PREMIUM_FEATURES_REGISTRY[feature];
  const title = customTitle || meta?.title || "Fitur Paket Premium";
  const subtitle =
    customSubtitle ||
    meta?.subtitle ||
    "Tingkatkan paket operasional outlet Anda untuk membuka fitur eksklusif ini.";
  const capabilities = meta?.capabilities || [];

  const handleNotifyMe = () => {
    setNotified(true);
    toast.success(
      "Pengingat Diaktifkan! 🔔",
      `Anda akan mendapatkan notifikasi pertama kali saat fitur "${title}" resmi diluncurkan pada Paket Premium.`
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40">
      {/* ─── Layer Konten Di Bawah (Disabled, Blurred & Non-Interactive) ─── */}
      <div
        className="pointer-events-none select-none filter blur-[2px] opacity-40 grayscale-[15%] transition-all duration-300"
        aria-hidden="true"
        tabIndex={-1}
      >
        {children}
      </div>

      {/* ─── Layer Glassmorphism Overlay (Coming Soon Notice) ─── */}
      <div className="absolute inset-0 z-20 flex items-center justify-center p-4 sm:p-6 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xs transition-all">
        <div className="relative w-full max-w-lg rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-lg text-center animate-in fade-in zoom-in-95 duration-200">
          {/* Badge Crown Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-semibold tracking-wide uppercase mb-3">
            <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Paket Premium</span>
            <span className="w-1 h-1 rounded-full bg-amber-500 mx-0.5" />
            <span className="text-amber-700 dark:text-amber-400 font-bold">Coming Soon</span>
          </div>

          {/* Feature Title & Subtitle */}
          <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
            {subtitle}
          </p>

          {/* Feature Capabilities Checklist */}
          {capabilities.length > 0 && (
            <div className="mt-4 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 text-left space-y-2">
              <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                <span>Manfaat Utama Fitur Ini:</span>
              </div>
              {capabilities.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-tight">{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleNotifyMe}
              disabled={notified}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs ${
                notified
                  ? "bg-emerald-600 text-white cursor-default"
                  : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.98]"
              }`}
            >
              {notified ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pengingat Aktif</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>Beri Tahu Saat Tersedia</span>
                </>
              )}
            </button>

            {onLearnMore && (
              <button
                type="button"
                onClick={onLearnMore}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <span>Pelajari Paket</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Safe Tier Notice Footer */}
          <div className="mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            <Lock className="w-3 h-3 text-zinc-400" />
            <span>Saat ini akun Anda menggunakan paket Free/Pro aktif.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
