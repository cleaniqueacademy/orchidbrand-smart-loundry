import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  Store,
  Tag,
  UserRound,
  Sparkles,
  ShieldCheck,
  Check,
  RotateCcw,
} from "lucide-react";
import { api } from "../../utils/api";
import { getReferralQueryParam, navigateTo } from "../../utils/routeUtils";
import { ReferralBadge } from "./ReferralBadge";
import { RegisterPriceSummary } from "./RegisterPriceSummary";

type FormState = {
  outletName: string;
  ownerName: string;
  phone: string;
  email: string;
  password: string;
  city: string;
  address: string;
  referralCode: string;
};

type Plan = {
  pricePerMonth?: number;
  trialDays?: number;
  name?: string;
  code?: string;
};

type ReferralValidation = {
  loading: boolean;
  valid: boolean | null;
  codeName?: string;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  message?: string;
};

export const RegisterPage: React.FC = () => {
  const [form, setForm] = useState<FormState>({
    outletName: "",
    ownerName: "",
    phone: "",
    email: "",
    password: "",
    city: "",
    address: "",
    referralCode: "",
  });

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [refValidation, setRefValidation] = useState<ReferralValidation>({
    loading: false,
    valid: null,
  });

  useEffect(() => {
    // Ambil paket publik default
    api
      .get<{ success: boolean; data?: Plan[] }>("/api/plans/public")
      .then((res) => {
        const item =
          res.data?.find((entry: any) => entry.code === "standard" || entry.code === "basic") ||
          res.data?.[0];
        if (item) setPlan(item);
      })
      .catch(() => {
        // Fallback default jika endpoint bermasalah
        setPlan({
          name: "Standard",
          pricePerMonth: 99000,
          trialDays: 7,
        });
      });

    // Auto-fill kode referral dari URL ?ref=...
    const referral = getReferralQueryParam();
    if (referral) {
      const cleanRef = referral.trim().toUpperCase();
      setForm((current) => ({ ...current, referralCode: cleanRef }));
      validateReferralCode(cleanRef);
    }
  }, []);

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "referralCode" && refValidation.valid !== null) {
      setRefValidation({ loading: false, valid: null });
    }
  };

  const validateReferralCode = async (codeToVerify?: string) => {
    const code = (codeToVerify || form.referralCode).trim().toUpperCase();
    if (!code) {
      setRefValidation({ loading: false, valid: null });
      return;
    }

    setRefValidation({ loading: true, valid: null });
    try {
      const result = await api.get<{
        success: boolean;
        valid?: boolean;
        message?: string;
        data?: {
          code: string;
          discountType: "percent" | "fixed";
          discountValue: number;
        };
      }>(`/api/signup/check-referral?code=${encodeURIComponent(code)}`);

      if (result.success && result.valid !== false) {
        setRefValidation({
          loading: false,
          valid: true,
          codeName: result.data?.code || code,
          discountType: result.data?.discountType || "percent",
          discountValue: result.data?.discountValue ?? 10,
        });
      } else {
        setRefValidation({
          loading: false,
          valid: false,
          message: result.message || "Kode referral tidak aktif atau tidak ditemukan.",
        });
      }
    } catch {
      setRefValidation({
        loading: false,
        valid: false,
        message: "Kode referral belum dapat diverifikasi saat ini.",
      });
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Kata sandi minimal 8 karakter demi keamanan akun Anda.");
      return;
    }

    setLoading(true);
    try {
      const result = await api.post<{
        success: boolean;
        message?: string;
        data?: unknown;
      }>("/api/public/signup", form);

      if (!result.success || !result.data) {
        setError(result.message || "Pendaftaran belum dapat diproses. Silakan periksa kembali data Anda.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("signup_success_data", JSON.stringify(result.data));
      navigateTo("/register/success");
    } catch (err: any) {
      setError(err?.message || "Terjadi gangguan saat membuat akun. Silakan coba lagi.");
      setLoading(false);
    }
  };

  const trialDays = plan?.trialDays || 7;
  const basePrice = plan?.pricePerMonth || 99000;

  return (
    <main className="min-h-screen w-full bg-[#f8fafc] lg:bg-[#07131b] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white lg:grid lg:grid-cols-[1fr_1.25fr]">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: HERO & BRANDING (Desktop Only)                               */}
      {/* ========================================================================= */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-y-auto bg-gradient-to-br from-[#051119] via-[#091e2b] to-[#0a2926] p-8 xl:p-12 text-slate-100 border-r border-white/5">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-[450px] w-[450px] rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-[450px] w-[450px] rounded-full bg-teal-400/15 blur-[150px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <img
            src="/laundry-cleanique-outline.png"
            alt="Laundry Cleanique"
            className="h-10 xl:h-11 w-auto object-contain filter drop-shadow-md"
          />
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur-md shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>Registrasi Akun Mitra Baru</span>
          </div>
        </div>

        {/* Middle Hero Content */}
        <div className="relative z-10 my-auto max-w-xl py-6 xl:py-8 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 backdrop-blur-md shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            Free Trial 7 Hari Tanpa Biaya Awal
          </div>

          <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold tracking-tight text-white leading-[1.18]">
            Mulai Kelola Bisnis Laundry Anda{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
              dengan Lebih Teratur.
            </span>
          </h1>

          <p className="text-sm xl:text-base leading-relaxed text-slate-300/85 max-w-lg">
            Daftarkan outlet Anda dalam 2 menit. Nikmati kemudahan kasir POS cepat, cetak struk thermal 58/80mm, serta pengiriman nota otomatis ke WhatsApp pelanggan.
          </p>

          {/* Benefits List */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>Setup instan akun Owner & database cabang terisolasi</span>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>Gratis 7 hari pertama, tanpa perlu kartu kredit</span>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>Gateway WhatsApp terintegrasi via scan QR langsung</span>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-200">
              <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>Portal publik cek resi mandiri bagi pelanggan</span>
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Enkripsi 256-Bit SSL • Data Terisolasi Multi-Tenant</span>
          </div>
          <span className="text-slate-500 font-medium">© 2026 Laundry Cleanique</span>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: REGISTRATION FORM (Mobile & Desktop)                        */}
      {/* ========================================================================= */}
      <section className="flex flex-col justify-start items-center bg-[#f8fafc] px-4 py-8 sm:px-8 md:px-10 lg:py-12 overflow-y-auto min-h-screen">
        <div className="w-full max-w-2xl my-auto">
          {/* Mobile Top Brand Header */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <img
              src="/laundry-cleanique.png"
              alt="Laundry Cleanique"
              className="h-11 w-auto object-contain mb-2.5 drop-shadow-sm"
            />
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              Registrasi Outlet Baru • Free Trial
            </div>
          </div>

          {/* Form Header with Login Link */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-snug">
                Buat Akun Outlet
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
                Isi data outlet dan akun pengelola untuk memulai masa uji coba 7 hari gratis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo("/")}
              className="shrink-0 text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 hover:underline px-3 py-1.5 rounded-xl hover:bg-emerald-50/80 transition-colors"
            >
              Sudah punya akun? Masuk
            </button>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/95 p-3.5 text-xs sm:text-sm text-rose-800 shadow-xs"
            >
              <div className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 font-bold">⚠️</div>
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* REGISTRATION FORM CARD */}
          <form
            onSubmit={submit}
            className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-8 shadow-[0_10px_35px_-10px_rgba(15,23,42,0.06)] space-y-6"
          >
            {/* SECTION 1: IDENTITAS OUTLET & PEMILIK */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-800">
                  1
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Identitas Outlet & Pemilik
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nama Outlet */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Outlet Laundry
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Store className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      disabled={loading}
                      value={form.outletName}
                      onChange={(e) => update("outletName", e.target.value)}
                      placeholder="Contoh: Cleanique Melati"
                      className="w-full h-11 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-base sm:text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Nama Pemilik */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Lengkap Pemilik
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      disabled={loading}
                      value={form.ownerName}
                      onChange={(e) => update("ownerName", e.target.value)}
                      placeholder="Nama lengkap Anda"
                      className="w-full h-11 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-base sm:text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Nomor WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor WhatsApp Aktif
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      disabled={loading}
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full h-11 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-base sm:text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Email Login */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Alamat Email Login
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      disabled={loading}
                      value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="nama@outlet.com"
                      className="w-full h-11 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-base sm:text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: LOKASI & KATA SANDI */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-800">
                  2
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Lokasi & Keamanan Akun
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Kota */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kota / Kabupaten
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      disabled={loading}
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="Contoh: Surabaya"
                      className="w-full h-11 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-base sm:text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Alamat */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Alamat Lengkap Outlet
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      disabled={loading}
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      placeholder="Jl. Mawar No. 10"
                      className="w-full h-11 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-base sm:text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              {/* Kata Sandi */}
              <div className="mt-3.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kata Sandi Baru (Min. 8 Karakter)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    disabled={loading}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="Buat kata sandi yang aman"
                    className="w-full h-11 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-11 text-base sm:text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 3: KODE REFERRAL / PROMO */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-extrabold text-emerald-800">
                  3
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Kode Referral / Kupon Diskon (Opsional)
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Tag className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    disabled={loading}
                    value={form.referralCode}
                    onChange={(e) => update("referralCode", e.target.value.toUpperCase())}
                    placeholder="Masukkan kode promo jika ada"
                    className="w-full h-11 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-base sm:text-sm font-mono text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                  />
                </div>
                <button
                  type="button"
                  disabled={loading || !form.referralCode.trim() || refValidation.loading}
                  onClick={() => validateReferralCode()}
                  className="h-11 sm:h-12 px-4 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-800 font-bold text-xs sm:text-sm hover:bg-emerald-100/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
                >
                  {refValidation.loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span>Terapkan</span>
                  )}
                </button>
              </div>

              {/* Referral Validation Status Badge */}
              <div className="mt-2.5">
                <ReferralBadge
                  loading={refValidation.loading}
                  valid={refValidation.valid}
                  codeName={refValidation.codeName}
                  discountType={refValidation.discountType}
                  discountValue={refValidation.discountValue}
                  message={refValidation.message}
                />
              </div>
            </div>

            {/* SECTION 4: PRATINJAU HARGA & TRIAL */}
            <div className="pt-2 border-t border-slate-100">
              <RegisterPriceSummary
                basePrice={basePrice}
                discountType={refValidation.valid ? refValidation.discountType : undefined}
                discountValue={refValidation.valid ? refValidation.discountValue : 0}
                trialDays={trialDays}
              />
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="relative flex w-full h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 px-4 text-sm sm:text-base font-bold text-white shadow-md shadow-emerald-900/15 transition-all duration-200 hover:from-emerald-700 hover:to-teal-800 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-100" />
                  <span>Menyiapkan Akun Outlet…</span>
                </>
              ) : (
                <>
                  <span>Buat Akun & Mulai Trial 7 Hari</span>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </>
              )}
            </button>

            {/* TERMS & PRIVACY */}
            <p className="text-center text-[11px] leading-relaxed text-slate-400">
              Dengan membuat akun, Anda menyetujui Ketentuan Layanan & Kebijakan Privasi Laundry Cleanique.
            </p>
          </form>

          {/* BOTTOM GUARANTEE NOTE */}
          <div className="mt-6 text-center">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Butuh bantuan pendaftaran? Hubungi Tim Customer Care Cleanique melalui WhatsApp resmi.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};
