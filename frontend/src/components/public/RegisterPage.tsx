import React, { useState, useEffect } from "react";
import {
  Store,
  User,
  Phone,
  Mail,
  Lock,
  MapPin,
  Tag,
  ArrowRight,
  Loader2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { api } from "../../utils/api";
import { getReferralQueryParam, navigateTo } from "../../utils/routeUtils";
import { ReferralBadge } from "./ReferralBadge";
import { RegisterPriceSummary } from "./RegisterPriceSummary";

export const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    outletName: "",
    ownerName: "",
    phone: "",
    email: "",
    password: "",
    city: "",
    address: "",
    referralCode: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Status validasi kode referral
  const [refLoading, setRefLoading] = useState(false);
  const [refStatus, setRefStatus] = useState<{
    valid: boolean | null;
    codeName?: string;
    discountType?: "percent" | "fixed";
    discountValue?: number;
    message?: string;
  }>({ valid: null });

  // Inisialisasi kode referral dari query param ?ref= jika ada
  useEffect(() => {
    const urlRef = getReferralQueryParam();
    if (urlRef) {
      setFormData((prev) => ({ ...prev, referralCode: urlRef.toUpperCase() }));
      validateReferralCode(urlRef);
    }
  }, []);

  const validateReferralCode = async (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setRefStatus({ valid: null });
      return;
    }

    setRefLoading(true);
    try {
      const res = await api.get<{
        success: boolean;
        message?: string;
        data?: {
          code: string;
          name: string;
          discountType: "percent" | "fixed";
          discountValue: number;
        };
      }>(`/api/public/referral/validate?code=${encodeURIComponent(clean)}`);

      if (res.success && res.data) {
        setRefStatus({
          valid: true,
          codeName: res.data.code,
          discountType: res.data.discountType,
          discountValue: res.data.discountValue,
        });
      } else {
        setRefStatus({
          valid: false,
          message: res.message || "Kode referral tidak valid",
        });
      }
    } catch (err: any) {
      setRefStatus({
        valid: false,
        message: err.message || "Kode referral tidak ditemukan",
      });
    } finally {
      setRefLoading(false);
    }
  };

  const handleReferralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setFormData((prev) => ({ ...prev, referralCode: val }));

    // Debounce validasi referral
    const timeoutId = setTimeout(() => {
      validateReferralCode(val);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        data?: {
          userId: string;
          tenantId: string;
          outletName: string;
          ownerName: string;
          email: string;
          trialDays: number;
          subscriptionUntil: string;
        };
      }>("/api/public/signup", formData);

      if (res.success && res.data) {
        // Simpan info sukses sementara ke sessionStorage untuk ditampilkan di halaman sukses
        sessionStorage.setItem("signup_success_data", JSON.stringify(res.data));
        navigateTo("/register/success");
      } else {
        setErrorMsg(res.message || "Pendaftaran gagal. Silakan periksa kembali data Anda.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses pendaftaran.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Navbar Minimalis */}
      <header className="w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Orchid Brand
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block -mt-1 font-medium">
                Smart Laundry System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
              Sudah memiliki akun?
            </span>
            <button
              onClick={() => navigateTo("/")}
              className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all"
            >
              Masuk
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start w-full">
          {/* Kolom Kiri: Form Registrasi */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-xl shadow-slate-200/40 dark:shadow-none">
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Mulai Usaha Laundry Cerdas Anda</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Pendaftaran Akun Baru
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Lengkapi formulir di bawah ini untuk mengaktifkan sistem POS kasir dan WhatsApp gateway Anda.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama Outlet & Pemilik */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Laundry / Outlet *
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Orchid Clean Rungkut"
                      value={formData.outletName}
                      onChange={(e) => setFormData({ ...formData, outletName: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nama Pemilik / Pengelola *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Nama lengkap Anda"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* No WA & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Nomor WhatsApp Aktif *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Akun Login *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="email@laundryanda.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Kata Sandi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kata Sandi *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* Kota & Alamat */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kota / Kabupaten
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Surabaya"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Alamat Lengkap Outlet
                  </label>
                  <input
                    type="text"
                    placeholder="Nama jalan, nomor ruko, atau patokan"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* Kode Referral */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Kode Referral / Promo Affiliate (Opsional)
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Contoh: ORCHIDHEMAT"
                    value={formData.referralCode}
                    onChange={handleReferralChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm uppercase tracking-wider font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="mt-2">
                  <ReferralBadge
                    loading={refLoading}
                    valid={refStatus.valid}
                    codeName={refStatus.codeName}
                    discountType={refStatus.discountType}
                    discountValue={refStatus.discountValue}
                    message={refStatus.message}
                  />
                </div>
              </div>

              {/* Tombol Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-base shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Menyiapkan Outlet Anda...</span>
                    </>
                  ) : (
                    <>
                      <span>Daftar Sekarang & Mulai Trial 7 Hari</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2">
                Dengan mendaftar, Anda menyetujui Ketentuan Layanan & Kebijakan Privasi Orchid Brand.
              </p>
            </form>
          </div>

          {/* Kolom Kanan: Rincian Paket & Manfaat */}
          <div className="lg:col-span-5 space-y-6">
            <RegisterPriceSummary
              basePrice={150000}
              discountType={refStatus.valid ? refStatus.discountType : undefined}
              discountValue={refStatus.valid ? refStatus.discountValue : 0}
              trialDays={7}
            />

            {/* Jaminan & Keamanan */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Keamanan Data Terjamin
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Data pelanggan, nota, dan keuangan Anda terisolasi aman dengan sistem multi-tenant cloud modern.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
        © 2026 Orchid Brand Smart Laundry System. Seluruh hak cipta dilindungi.
      </footer>
    </div>
  );
};
