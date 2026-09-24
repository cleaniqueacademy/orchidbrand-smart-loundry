import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Store,
  Calendar,
  Mail,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { navigateTo } from "../../utils/routeUtils";

export const RegisterSuccessPage: React.FC = () => {
  const [successData, setSuccessData] = useState<{
    outletName: string;
    ownerName: string;
    email: string;
    trialDays: number;
    subscriptionUntil: string;
  } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("signup_success_data");
    if (raw) {
      try {
        setSuccessData(JSON.parse(raw));
      } catch {}
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/laundry-cleanique.png" alt="Laundry Cleanique" className="h-10 w-auto object-contain object-left" />
            <div>
              <span className="font-extrabold text-lg tracking-tight text-emerald-700 dark:text-emerald-300">Laundry Cleanique</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block -mt-1 font-medium">
                Smart Laundry System
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center items-center text-center">
        {/* Animated Badge / Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 animate-bounce duration-1000">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <div className="absolute -top-2 -right-2 p-2 bg-white dark:bg-slate-900 rounded-full shadow-md text-amber-500 animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full mb-3">
          <span>Pendaftaran Berhasil & Akun Aktif</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Selamat Datang di Laundry Cleanique!
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm sm:text-base max-w-lg">
          Outlet Anda telah berhasil didaftarkan. Nikmati kemudahan pengelolaan kasir laundry cerdas dan WhatsApp notifikasi secara gratis.
        </p>

        {/* Kartu Rincian Akun */}
        <div className="w-full mt-8 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-200/40 dark:shadow-none text-left space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">Nama Outlet</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {successData?.outletName || "Outlet Laundry Anda"}
                </span>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold rounded-full">
              Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Email Login</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {successData?.email || "-"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Trial Gratis Hingga</span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {successData?.subscriptionUntil || "Menunggu data aktivasi"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Panduan Langkah Awal */}
        <div className="w-full mt-6 p-5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-left">
          <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-3">
            3 Langkah Memulai Operasional:
          </h4>
          <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                1
              </span>
              <span>Masuk menggunakan email dan kata sandi yang baru saja Anda daftarkan.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                2
              </span>
              <span>Hubungkan WhatsApp outlet Anda via scan QR untuk notifikasi nota otomatis.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                3
              </span>
              <span>Sesuaikan daftar harga layanan laundry pada menu Pengaturan &gt; Master Layanan.</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="w-full mt-8">
          <button
            onClick={() => navigateTo("/")}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-base shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            <span>Masuk ke Dashboard Aplikasi</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
        © 2026 Laundry Cleanique System. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
};
