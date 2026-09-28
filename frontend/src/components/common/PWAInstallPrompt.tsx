import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Smartphone,
  Laptop,
  Share,
  CheckCircle2,
  X,
  Sparkles,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Rocket,
  MoreVertical,
  PlusSquare,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Local storage keys (dengan prefix orchid_ agar tidak terhapus saat logout cleanique_*)
const PWA_INSTALLED_KEY = "orchid_pwa_installed";
const PWA_DISMISSED_KEY = "orchid_pwa_dismissed";
const LEGACY_INSTALLED_KEY = "cleanique_pwa_installed";
const LEGACY_DISMISSED_KEY = "cleanique_pwa_dismissed";
const LEGACY_DISMISS_UNTIL_KEY = "cleanique_pwa_prompt_dismissed_until";

// Helper publik untuk membuka panduan PWA dari bagian mana saja di aplikasi
export const openPWAInstallGuide = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("open-pwa-install"));
  }
};

const checkIsInstalled = (): boolean => {
  try {
    if (localStorage.getItem(PWA_INSTALLED_KEY) === "true") return true;
    if (localStorage.getItem(LEGACY_INSTALLED_KEY) === "true") return true;
  } catch {}

  if (typeof window !== "undefined") {
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    if (isStandaloneMode) {
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, "true");
        localStorage.setItem(LEGACY_INSTALLED_KEY, "true");
      } catch {}
      return true;
    }
  }
  return false;
};

const checkIsDismissed = (): boolean => {
  try {
    if (localStorage.getItem(PWA_DISMISSED_KEY) === "true") return true;
    if (localStorage.getItem(LEGACY_DISMISSED_KEY) === "true") return true;
    const oldUntil = localStorage.getItem(LEGACY_DISMISS_UNTIL_KEY);
    if (oldUntil && Number(oldUntil) > Date.now()) return true;
  } catch {}
  return false;
};

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkIsInstalled());
  const [isDismissed, setIsDismissed] = useState<boolean>(() => checkIsDismissed());
  const [showToast, setShowToast] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<"ios" | "android" | "desktop">(() => {
    if (typeof window === "undefined") return "android";
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    if (/android/.test(ua)) return "android";
    return "desktop";
  });

  useEffect(() => {
    // 1. Jika sudah terpasang, langsung set status dan hentikan listener prompt
    if (checkIsInstalled()) {
      setIsInstalled(true);
      return;
    }

    // 2. Tangkap event native beforeinstallprompt (Chrome / Android / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Jangan tampilkan jika sudah di-dismiss atau sudah di-install
      if (checkIsDismissed() || checkIsInstalled()) {
        return;
      }

      setShowToast(true);
    };

    // 3. Tangkap event appinstalled ketika instalasi berhasil
    const handleAppInstalled = () => {
      try {
        localStorage.setItem(PWA_INSTALLED_KEY, "true");
        localStorage.setItem(LEGACY_INSTALLED_KEY, "true");
      } catch {}
      setIsInstalled(true);
      setShowToast(false);
      setShowGuideModal(false);
      setDeferredPrompt(null);
    };

    // 4. Listener kustom untuk membuka modal panduan instalasi secara manual
    const handleManualOpen = () => {
      setShowGuideModal(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("open-pwa-install", handleManualOpen);

    // 5. Timer fallback untuk memunculkan notifikasi di browser tanpa event beforeinstallprompt (misal Safari iOS)
    let fallbackTimer: any = null;
    if (!checkIsDismissed() && !checkIsInstalled()) {
      fallbackTimer = setTimeout(() => {
        if (!checkIsInstalled() && !checkIsDismissed()) {
          setShowToast(true);
        }
      }, 2500);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("open-pwa-install", handleManualOpen);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          try {
            localStorage.setItem(PWA_INSTALLED_KEY, "true");
            localStorage.setItem(LEGACY_INSTALLED_KEY, "true");
          } catch {}
          setIsInstalled(true);
          setShowToast(false);
          setShowGuideModal(false);
        }
        setDeferredPrompt(null);
      } catch {
        setShowGuideModal(true);
      }
    } else {
      // Browser belum / tidak mendukung direct prompt (misal Safari di iOS) -> Buka panduan
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setShowToast(false);
    setIsDismissed(true);
    try {
      localStorage.setItem(PWA_DISMISSED_KEY, "true");
      localStorage.setItem(LEGACY_DISMISSED_KEY, "true");
    } catch {}
  };

  // Jangan render apapun jika aplikasi sudah terpasang
  if (isInstalled) {
    return null;
  }

  // Jika sudah ditutup oleh user dan tidak sedang membuka modal panduan manual, jangan render apapun
  if (isDismissed && !showGuideModal) {
    return null;
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FLOATING MODERN PWA INSTALL POPUP CARD                                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showToast && !isDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 35, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-sm sm:max-w-md w-auto"
          >
            <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl border border-zinc-200/90 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)] p-4 sm:p-5 text-zinc-900 ring-1 ring-black/5">
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

              {/* Ambient Glow */}
              <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl" />

              {/* Close Button */}
              <button
                type="button"
                aria-label="Tutup notifikasi pasang aplikasi"
                title="Tutup & jangan tampilkan lagi"
                onClick={handleDismiss}
                className="absolute top-3.5 right-3.5 rounded-full p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header: Brand Icon & App Details */}
              <div className="flex items-start gap-3.5 pr-6">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-1.5 border border-emerald-100/90 shadow-xs">
                  <img
                    src="/icon-192.png"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/logo.png";
                    }}
                    alt="Cleanique Logo"
                    className="h-full w-full object-contain rounded-xl"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
                    <Sparkles className="h-2.5 w-2.5" />
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60 uppercase tracking-wide">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Aplikasi Kasir POS
                    </span>
                  </div>

                  <h4 className="mt-1 text-sm sm:text-base font-bold text-zinc-900 tracking-tight leading-snug">
                    Pasang Cleanique POS
                  </h4>

                  <p className="mt-0.5 text-[11px] text-zinc-500 flex items-center gap-1.5">
                    {activeGuideTab === "ios" ? (
                      <>
                        <Share className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>Tersedia untuk iPhone & iPad (Safari)</span>
                      </>
                    ) : activeGuideTab === "android" ? (
                      <>
                        <Smartphone className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>Tersedia untuk Android & Chrome</span>
                      </>
                    ) : (
                      <>
                        <Laptop className="h-3 w-3 text-emerald-600 shrink-0" />
                        <span>Tersedia untuk Desktop / PC / Mac</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Value Proposition & Feature Highlights */}
              <div className="mt-3">
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Buka aplikasi kasir langsung dari layar utama perangkat Anda layaknya aplikasi native tanpa bilah tab browser.
                </p>

                {/* 3 Benefit Pills */}
                <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-zinc-50/90 p-2 border border-zinc-100 flex flex-col items-center">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-bold text-zinc-800 mt-1">Buka Instan</span>
                    <span className="text-[9px] text-zinc-400">Tanpa ketik URL</span>
                  </div>
                  <div className="rounded-xl bg-zinc-50/90 p-2 border border-zinc-100 flex flex-col items-center">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span className="text-[10px] font-bold text-zinc-800 mt-1">Layar Penuh</span>
                    <span className="text-[9px] text-zinc-400">Bebas bilah URL</span>
                  </div>
                  <div className="rounded-xl bg-zinc-50/90 p-2 border border-zinc-100 flex flex-col items-center">
                    <Rocket className="w-4 h-4 text-teal-600" />
                    <span className="text-[10px] font-bold text-zinc-800 mt-1">Lebih Cepat</span>
                    <span className="text-[9px] text-zinc-400">Kinerja maksimal</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-3.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Pasang Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 active:scale-[0.98] transition-colors cursor-pointer"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Panduan</span>
                </button>
              </div>

              {/* Dismiss Link */}
              <div className="mt-2.5 text-center">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-[11px] text-zinc-400 hover:text-zinc-600 font-medium transition-colors cursor-pointer"
                >
                  Nanti saja, jangan ingatkan lagi
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 2. PWA MANUAL INSTALL GUIDE MODAL                                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg rounded-3xl bg-white p-5 sm:p-7 shadow-2xl text-zinc-800 border border-zinc-100 overflow-hidden"
            >
              {/* Top Gradient Stripe */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-1.5 border border-emerald-100 shadow-xs h-11 w-11 flex items-center justify-center shrink-0">
                    <img
                      src="/icon-192.png"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/logo.png";
                      }}
                      alt="Cleanique Logo"
                      className="h-full w-full object-contain rounded-xl"
                    />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                      Panduan Pasang Aplikasi PWA
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Gunakan Cleanique seperti aplikasi resmi di ponsel / komputer Anda
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors cursor-pointer"
                  title="Tutup panduan"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Platform Selector Tabs */}
              <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-zinc-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveGuideTab("android")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeGuideTab === "android"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Android</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGuideTab("ios")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeGuideTab === "ios"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Share className="h-3.5 w-3.5" />
                  <span>iPhone / iPad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGuideTab("desktop")}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                    activeGuideTab === "desktop"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Laptop className="h-3.5 w-3.5" />
                  <span>Desktop</span>
                </button>
              </div>

              {/* Step by Step Instructions per Platform */}
              <div className="py-4">
                {activeGuideTab === "ios" && (
                  <div className="space-y-2.5 text-xs text-zinc-700 leading-relaxed">
                    <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/60 p-3.5 border border-emerald-100">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">Buka di Browser Safari</p>
                        <p className="text-zinc-600 mt-0.5">
                          Pastikan Anda membuka website Cleanique melalui browser bawaan <strong>Safari</strong> pada iPhone atau iPad Anda.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-3.5 border border-zinc-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">Ketuk Tombol Bagikan (Share)</p>
                        <p className="text-zinc-600 mt-0.5">
                          Ketuk ikon kotak berpanah ke atas <span className="font-semibold text-emerald-700 inline-flex items-center gap-1"><Share className="w-3.5 h-3.5 inline" /> Bagikan (Share)</span> di bilah navigasi bawah Safari.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-3.5 border border-zinc-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">Pilih Tambahkan ke Layar Utama</p>
                        <p className="text-zinc-600 mt-0.5">
                          Gulir ke bawah dan ketuk opsi <span className="font-semibold text-emerald-700 inline-flex items-center gap-1">"Tambahkan ke Layar Utama" (Add to Home Screen) <PlusSquare className="w-3.5 h-3.5 inline" /></span>. Ikon Cleanique akan langsung muncul di beranda HP Anda!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeGuideTab === "android" && (
                  <div className="space-y-2.5 text-xs text-zinc-700 leading-relaxed">
                    <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/60 p-3.5 border border-emerald-100">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">Buka di Google Chrome</p>
                        <p className="text-zinc-600 mt-0.5">
                          Buka Google Chrome di ponsel Android Anda, lalu ketuk menu <strong className="text-zinc-900 inline-flex items-center gap-0.5">titik tiga (<MoreVertical className="w-3 h-3 inline" />)</strong> di pojok kanan atas layar.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-3.5 border border-zinc-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">Pilih "Instal Aplikasi"</p>
                        <p className="text-zinc-600 mt-0.5">
                          Pilih menu <span className="font-semibold text-emerald-700">"Instal Aplikasi"</span> atau <span className="font-semibold text-emerald-700">"Tambahkan ke Layar Utama"</span>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-3.5 border border-zinc-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">Konfirmasi Pemasangan</p>
                        <p className="text-zinc-600 mt-0.5">
                          Ketuk <strong>Instal</strong>. Aplikasi Cleanique POS langsung siap digunakan tanpa membuka Chrome lagi.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeGuideTab === "desktop" && (
                  <div className="space-y-2.5 text-xs text-zinc-700 leading-relaxed">
                    <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/60 p-3.5 border border-emerald-100">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">Perhatikan Address Bar Browser</p>
                        <p className="text-zinc-600 mt-0.5">
                          Di Google Chrome atau Microsoft Edge, perhatikan ikon <span className="font-semibold text-emerald-700 inline-flex items-center gap-1"><Download className="w-3.5 h-3.5 inline" /> Instal / Pasang</span> di sebelah kanan kolom alamat URL.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-3.5 border border-zinc-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">Klik Pasang Aplikasi</p>
                        <p className="text-zinc-600 mt-0.5">
                          Klik tombol <strong>Instal</strong> pada jendela dialog kecil yang muncul dari browser.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-3.5 border border-zinc-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-xs">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">Aplikasi Mandiri Siap Digunakan</p>
                        <p className="text-zinc-600 mt-0.5">
                          Cleanique POS akan terbuka dalam jendela aplikasi desktop mandiri yang terpisah dan bebas gangguan tab browser.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct trigger if deferredPrompt exists */}
              {deferredPrompt && (
                <div className="pt-1 pb-3">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full h-11 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-700/20 hover:from-emerald-700 hover:to-teal-800 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <Download className="h-4 w-4" />
                    <span>Lanjutkan Pasang Otomatis Sekarang</span>
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Aman & tersertifikasi PWA Standar</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Tutup Panduan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
