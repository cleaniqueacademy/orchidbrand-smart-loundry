import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  Store,
  Calendar,
  Mail,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Check,
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between selection:bg-emerald-500 selection:text-white font-sans">
      {/* Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/laundry-cleanique.png"
              alt="Laundry Cleanique"
              className="h-10 w-auto object-contain"
            />
          </div>
          <button
            onClick={() => navigateTo("/")}
            className="text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Masuk ke Akun
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col justify-center items-center text-center w-full">
        {/* Animated Badge / Icon */}
        <div className="relative mb-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-900/15">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 p-1.5 bg-white rounded-full shadow-md text-amber-500">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 text-emerald-800 text-xs font-bold rounded-full mb-3">
          <span>Pendaftaran Berhasil • Akun Aktif</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Selamat Datang di Laundry Cleanique!
        </h1>
        <p className="text-slate-500 mt-2 text-xs sm:text-sm max-w-md leading-relaxed">
          Kelola Mudah, Tumbuh Lebih Terarah. Outlet Anda siap beroperasi dengan sistem kasir cerdas & nota WhatsApp otomatis.
        </p>

        {/* Kartu Rincian Akun */}
        <div className="w-full mt-6 p-5 sm:p-6 bg-white rounded-3xl border border-slate-200/90 shadow-sm text-left space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Nama Outlet</span>
                <span className="text-sm sm:text-base font-bold text-slate-900">
                  {successData?.outletName || "Outlet Laundry Anda"}
                </span>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              Trial 7 Hari Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[10px] text-slate-400 block font-medium">Email Login</span>
                <span className="text-xs font-semibold text-slate-800 truncate block">
                  {successData?.email || "-"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Masa Trial Hingga</span>
                <span className="text-xs font-semibold text-emerald-700">
                  {successData?.subscriptionUntil || "7 Hari Mendatang"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Panduan Langkah Awal */}
        <div className="w-full mt-4 p-4 sm:p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100/90 text-left">
          <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2.5">
            Langkah Cepat Memulai:
          </h4>
          <div className="space-y-2 text-xs text-slate-700">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                1
              </span>
              <span>Masuk menggunakan email dan kata sandi yang baru saja Anda daftarkan.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                2
              </span>
              <span>Hubungkan WhatsApp toko via scan QR untuk pengiriman nota otomatis.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                3
              </span>
              <span>Sesuaikan tarif layanan dan buat nota kasir perdana Anda.</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="w-full mt-6">
          <button
            onClick={() => navigateTo("/")}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white font-bold text-sm sm:text-base shadow-md shadow-emerald-900/15 hover:shadow-lg hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Masuk ke Akun</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-5 text-center text-xs text-slate-400 border-t border-slate-200/80">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistem Terenkripsi & Data Outlet Terisolasi</span>
        </div>
        <span>© 2026 Laundry Cleanique System. Seluruh hak cipta dilindungi.</span>
      </footer>
    </div>
  );
};
