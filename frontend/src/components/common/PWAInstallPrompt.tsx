import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Smartphone,
  Laptop,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  HelpCircle,
  Check,
  ChevronRight,
  ChevronLeft,
  Store,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_STORAGE_KEY = "cleanique_pwa_prompt_dismissed_until";

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [isPwaTabOpen, setIsPwaTabOpen] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<"ios" | "android" | "desktop">(() => {
    if (typeof window === "undefined") return "android";
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return "ios";
    if (/android/.test(ua)) return "android";
    return "desktop";
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const sideTabRef = useRef<HTMLElement>(null);

  // Otomatis menutup side tab saat mengklik area lain
  useEffect(() => {
    if (!isPwaTabOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (sideTabRef.current && !sideTabRef.current.contains(e.target as Node)) {
        setIsPwaTabOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [isPwaTabOpen]);

  useEffect(() => {
    // 1. Cek apakah sudah berjalan di mode standalone (PWA terpasang)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    const alreadyStandalone = checkStandalone();
    if (alreadyStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Tangkap event native beforeinstallprompt (Chrome / Android / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Cek apakah baru saja di-dismiss
      try {
        const dismissedUntil = localStorage.getItem(DISMISS_STORAGE_KEY);
        if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
          return;
        }
      } catch {}

      setShowToast(true);
    };

    // 3. Tangkap event appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowToast(false);
      setShowGuideModal(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 4. Timer fallback untuk memunculkan toast di iOS / browser lain yang tidak emit beforeinstallprompt
    const fallbackTimer = setTimeout(() => {
      if (!checkStandalone()) {
        try {
          const dismissedUntil = localStorage.getItem(DISMISS_STORAGE_KEY);
          if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
            return;
          }
        } catch {}
        setShowToast(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
          setShowToast(false);
        }
        setDeferredPrompt(null);
      } catch {
        setShowGuideModal(true);
      }
    } else {
      // Browser belum / tidak mendukung direct prompt (e.g. iOS Safari) -> Tampilkan modal panduan lengkap
      setShowGuideModal(true);
    }
  };

  const handleDismiss = () => {
    setShowToast(false);
    try {
      // Ingat penutupan selama 24 jam
      localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    } catch {}
  };

  if (isStandalone || isInstalled) {
    return null;
  }

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FLOATING PWA TOAST / BANNER (Pojok Kanan Bawah)                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 z-40 max-w-sm sm:max-w-md w-auto"
          >
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-4 text-white shadow-2xl backdrop-blur-md ring-1 ring-white/10">
              {/* Ambient Glow */}
              <div className="pointer-events-none absolute -top-12 -right-12 h-28 w-28 rounded-full bg-emerald-500/20 blur-2xl" />

              <div className="flex items-start gap-3.5">
                {/* Brand / App Icon */}
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-md shadow-emerald-950/40 border border-emerald-500/20">
                  <img src="/logo.png" alt="Cleanique Logo" className="h-full w-full object-contain" />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] text-slate-950">
                    <Sparkles className="h-2.5 w-2.5" />
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 pr-6">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      Pasang Aplikasi Cleanique
                    </h4>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                      PWA
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] sm:text-xs text-slate-300/85 leading-relaxed">
                    Akses kasir POS lebih cepat langsung dari layar utama HP / Desktop tanpa bilah browser.
                  </p>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-950/30 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Pasang Sekarang</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGuideModal(true)}
                      className="rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Panduan
                    </button>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  aria-label="Tutup notifikasi pasang aplikasi"
                  onClick={handleDismiss}
                  className="absolute top-3 right-3 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Docked PWA Install Tab on Corner Screen Edge (Hanya muncul jika diklik, tidak muncul saat hover) */}
      {!showToast && (
        <aside
          ref={sideTabRef}
          aria-label="PWA Install Shortcut"
          className="fixed right-0 bottom-6 sm:bottom-8 z-30 flex items-center animate-fade-in"
        >
          <div
            className={`flex items-stretch bg-gradient-to-l from-emerald-800 via-teal-900 to-slate-900 text-white rounded-l-2xl shadow-xl shadow-emerald-950/40 border-y border-l border-emerald-500/30 overflow-hidden transition-all duration-300 ease-out ${
              isPwaTabOpen
                ? "translate-x-0"
                : "translate-x-[calc(100%-34px)]"
            }`}
          >
            {/* Arrow Peek Handle - Always visible on the corner edge when closed */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsPwaTabOpen((prev) => !prev);
              }}
              className="w-[34px] px-2 py-2.5 hover:bg-white/10 text-emerald-300 hover:text-white flex items-center justify-center border-r border-emerald-500/20 cursor-pointer relative shrink-0 transition-colors"
              title={isPwaTabOpen ? "Sembunyikan tab PWA (Hanya arrow)" : "Pasang Aplikasi Cleanique (PWA)"}
              aria-label={isPwaTabOpen ? "Sembunyikan tab PWA" : "Pasang Aplikasi Cleanique (PWA)"}
            >
              {isPwaTabOpen ? (
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {/* Main Action Trigger (Expands when hovered or when arrow is clicked) */}
            <button
              type="button"
              onClick={() => {
                handleInstallClick();
                setIsPwaTabOpen(false);
              }}
              className="flex items-center gap-2 pl-2.5 pr-3 py-2.5 hover:bg-white/10 active:scale-95 transition-all text-left cursor-pointer shrink-0"
              title="Pasang Cleanique sebagai aplikasi PWA"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Download className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col pr-1">
                <span className="text-[11px] font-bold tracking-wide text-white leading-none">
                  Install PWA
                </span>
                <span className="text-[9px] text-emerald-300 font-medium leading-tight mt-0.5">
                  Aplikasi Kasir POS
                </span>
              </div>
            </button>

            {/* Guide Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowGuideModal(true);
                setIsPwaTabOpen(false);
              }}
              className="px-2.5 py-2.5 hover:bg-white/10 text-slate-300 hover:text-white transition flex items-center justify-center border-l border-emerald-500/20 cursor-pointer text-[10px] font-semibold"
              title="Buka panduan instalasi PWA"
              aria-label="Buka panduan instalasi PWA"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
            </button>
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* 2. PWA MANUAL INSTALL GUIDE MODAL                                         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-3xl bg-white p-5 sm:p-7 shadow-2xl text-slate-800 border border-slate-100"
            >
              {/* Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-1 border border-slate-200 shadow-xs h-11 w-11 flex items-center justify-center shrink-0">
                    <img src="/logo.png" alt="Cleanique Logo" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Pasang Aplikasi Cleanique (PWA)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Gunakan layaknya aplikasi native di perangkat Anda
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Platform Selector Tabs */}
              <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveGuideTab("android")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                    activeGuideTab === "android"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Android</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGuideTab("ios")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                    activeGuideTab === "ios"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Share className="h-3.5 w-3.5" />
                  <span>iPhone / iPad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveGuideTab("desktop")}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                    activeGuideTab === "desktop"
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Laptop className="h-3.5 w-3.5" />
                  <span>Desktop</span>
                </button>
              </div>

              {/* Instructions per Platform */}
              <div className="py-4">
                {activeGuideTab === "ios" && (
                  <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                    <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-100">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Buka di Browser Safari</p>
                        <p className="text-slate-600 mt-0.5">
                          Pastikan Anda membuka tautan sistem ini melalui browser bawaan <strong>Safari</strong> di perangkat iOS Anda.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Ketuk Tombol Bagikan (Share)</p>
                        <p className="text-slate-600 mt-0.5">
                          Ketuk ikon kotak berpanah ke atas <span className="font-semibold text-emerald-700">📤 Bagikan (Share)</span> di bilah navigasi bawah Safari.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Pilih Tambahkan ke Layar Utama</p>
                        <p className="text-slate-600 mt-0.5">
                          Gulir ke bawah dan ketuk opsi <span className="font-semibold text-emerald-700">"Tambahkan ke Layar Utama" (Add to Home Screen) ➕</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeGuideTab === "android" && (
                  <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                    <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-100">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Ketuk Menu Titik Tiga (⋮)</p>
                        <p className="text-slate-600 mt-0.5">
                          Buka browser Chrome di ponsel Android Anda, lalu ketuk menu <span className="font-semibold">⋮</span> di pojok kanan atas layar.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Pilih "Instal Aplikasi"</p>
                        <p className="text-slate-600 mt-0.5">
                          Pilih menu <span className="font-semibold text-emerald-700">"Instal Aplikasi"</span> atau <span className="font-semibold text-emerald-700">"Tambahkan ke Layar Utama"</span>.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Konfirmasi Pemasangan</p>
                        <p className="text-slate-600 mt-0.5">
                          Ketuk <strong>Instal</strong>. Ikon Cleanique POS akan langsung tersedia di beranda HP Anda layaknya aplikasi Play Store.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeGuideTab === "desktop" && (
                  <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                    <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-100">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Perhatikan Address Bar Browser</p>
                        <p className="text-slate-600 mt-0.5">
                          Pada Google Chrome atau Microsoft Edge, perhatikan ikon <span className="font-semibold text-emerald-700">💻 Instal / Pasang</span> di sebelah kanan kolom URL.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Klik Pasang Aplikasi</p>
                        <p className="text-slate-600 mt-0.5">
                          Klik tombol <strong>Instal</strong> pada dialog konfirmasi.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs">
                        3
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Aplikasi Mandiri Siap Digunakan</p>
                        <p className="text-slate-600 mt-0.5">
                          Cleanique POS akan berjalan sebagai jendela aplikasi desktop mandiri tanpa gangguan tab browser.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct trigger if deferredPrompt exists */}
              {deferredPrompt && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs sm:text-sm shadow-md hover:from-emerald-700 hover:to-teal-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Lanjutkan Pasang Otomatis</span>
                  </button>
                </div>
              )}

              {/* Footer Close */}
              <div className="mt-3 text-right">
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
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
