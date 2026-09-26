import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  ArrowRight,
  ArrowLeft,
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
  Gift,
  HelpCircle,
  X,
  ChevronRight,
  Laptop,
  Smartphone,
  Receipt,
  MessageCircle,
  Bot,
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
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeStep, setWelcomeStep] = useState<number>(0);
  const [refValidation, setRefValidation] = useState<ReferralValidation>({
    loading: false,
    valid: null,
  });

  const registerPageRef = useRef<HTMLDivElement>(null);

  // GSAP Entrance Animations
  useEffect(() => {
    if (!registerPageRef.current) return;
    const ctx = gsap.context(() => {
      // 1. Ambient Background Glow Orbs Breathing Loop
      gsap.to(".gsap-glow-orb", {
        y: -14,
        x: 8,
        scale: 1.05,
        duration: 4.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.7,
      });

      // 2. Left side elements stagger entrance
      gsap.fromTo(
        ".gsap-reg-hero",
        { opacity: 0, y: 22 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.08,
          duration: 0.75,
          ease: "power3.out",
          delay: 0.08,
        }
      );

      // 3. Staggered Benefits List Items
      gsap.fromTo(
        ".gsap-reg-benefit",
        { opacity: 0, x: -16 },
        {
          opacity: 1,
          x: 0,
          stagger: 0.07,
          duration: 0.55,
          ease: "back.out(1.3)",
          delay: 0.25,
        }
      );

      // 4. Right side registration form container
      gsap.fromTo(
        ".gsap-reg-form-container",
        { opacity: 0, y: 20, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: "power3.out",
          delay: 0.15,
        }
      );

      // 5. Right side registration form inner elements
      gsap.fromTo(
        ".gsap-reg-form",
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.05,
          duration: 0.6,
          ease: "power2.out",
          delay: 0.25,
        }
      );
    }, registerPageRef);

    return () => ctx.revert();
  }, []);

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
        setPlan({
          name: "Standard",
          pricePerMonth: 60000,
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
  const basePrice = plan?.pricePerMonth || 60000;

  return (
    <main
      ref={registerPageRef}
      className="min-h-screen w-full bg-[#f8fafc] lg:bg-[#07131b] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white lg:grid lg:grid-cols-[0.95fr_1.3fr] lg:h-screen lg:overflow-hidden"
    >
      {/* ========================================================================= */}
      {/* LEFT COLUMN: HERO & BRANDING (Desktop Only)                               */}
      {/* ========================================================================= */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden h-full bg-gradient-to-br from-[#051119] via-[#091e2b] to-[#0a2926] px-6 xl:px-10 2xl:px-12 pt-5 pb-7 xl:pb-9 text-slate-100 border-r border-white/5">
        {/* Ambient Glows */}
        <div className="gsap-glow-orb pointer-events-none absolute -top-32 -left-32 h-[450px] w-[450px] rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="gsap-glow-orb pointer-events-none absolute -bottom-32 right-0 h-[450px] w-[450px] rounded-full bg-teal-400/15 blur-[150px]" />
        <div className="gsap-glow-orb pointer-events-none absolute top-1/2 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center justify-between shrink-0 gsap-reg-hero">
          <img
            src="/laundry-cleanique-outline.png"
            alt="Laundry Cleanique"
            className="h-7 xl:h-8 w-auto object-contain filter drop-shadow-md"
          />
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 backdrop-blur-md shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Platform Manajemen Laundry</span>
          </div>
        </div>

        {/* Middle Hero Content */}
        <div className="relative z-10 my-auto max-w-lg py-1 space-y-2 xl:space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-200 backdrop-blur-md shadow-xs gsap-reg-hero">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            Simple to Use. Built to Perform.
          </div>

          <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-extrabold tracking-tight text-white leading-snug gsap-reg-hero">
            Kelola Mudah,{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
              Tumbuh Lebih Terarah.
            </span>
          </h1>

          <p className="text-[11px] xl:text-xs leading-relaxed text-slate-300/85 max-w-md gsap-reg-hero">
            Daftarkan outlet Anda dalam 2 menit. Nikmati kasir modern, nota WhatsApp otomatis, dan pencatatan shift kas yang anti-selisih.
          </p>

          {/* Benefits List */}
          <div className="space-y-1.5 pt-0.5 gsap-reg-hero">
            <div className="gsap-reg-benefit flex items-center gap-2.5 text-xs text-slate-200">
              <div className="h-4.5 w-4.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span>Setup instan & database outlet terisolasi aman</span>
            </div>
            <div className="gsap-reg-benefit flex items-center gap-2.5 text-xs text-slate-200">
              <div className="h-4.5 w-4.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span>Gratis {trialDays} hari pertama, tanpa perlu kartu kredit</span>
            </div>
            <div className="gsap-reg-benefit flex items-center gap-2.5 text-xs text-slate-200">
              <div className="h-4.5 w-4.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span>Nota otomatis terkirim ke WhatsApp pelanggan</span>
            </div>
            <div className="gsap-reg-benefit flex items-center gap-2.5 text-xs text-slate-200">
              <div className="h-4.5 w-4.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5" />
              </div>
              <span>Asisten AI bisnis untuk analisa omzet & keuangan</span>
            </div>
          </div>

          {/* Trial Guarantee Highlight Card */}
          <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-2.5 xl:p-3 backdrop-blur-md gsap-reg-hero">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-emerald-400" />
                Garansi Trial {trialDays} Hari Penuh
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9.5px] font-bold text-emerald-300 border border-emerald-500/30">
                100% Fitur Terbuka
              </span>
            </div>
            <p className="text-[10px] xl:text-[10.5px] text-slate-300/80 leading-snug">
              Coba seluruh fitur kasir, cetak struk thermal, manajemen shift, dan laporan omzet harian tanpa biaya pendaftaran.
            </p>
          </div>

          {/* Quick Trigger to Welcoming Screen */}
          <div className="pt-0.5 gsap-reg-hero">
            <button
              type="button"
              onClick={() => {
                setWelcomeStep(0);
                setShowWelcomeModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-white/10 hover:border-emerald-400/40 transition-all backdrop-blur-xs cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Panduan Paket & Fitur Lengkap</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Desktop Footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3 pb-1 text-[11px] xl:text-xs text-slate-400 shrink-0 gsap-reg-hero">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>PT Indotech Berkah Abadi</span>
          </div>
          <span className="text-slate-500 font-medium">© 2026 Laundry Cleanique</span>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: REGISTRATION FORM (Ringkas & Bebas Scroll Panjang)           */}
      {/* ========================================================================= */}
      <section className="flex flex-col justify-center items-center bg-[#f8fafc] px-4 py-6 sm:px-8 md:px-10 lg:py-6 overflow-y-auto lg:h-screen">
        <div className="gsap-reg-form-container w-full max-w-2xl my-auto">
          {/* Mobile Top Brand Header */}
          <div className="mb-4 flex flex-col items-center text-center lg:hidden gsap-reg-form">
            <img
              src="/laundry-cleanique.png"
              alt="Laundry Cleanique"
              className="h-10 w-auto object-contain mb-2 drop-shadow-sm"
            />
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-semibold text-emerald-800">
              Simple to Use. Built to Perform.
            </div>
          </div>

          {/* Form Header with Login Link & Welcome Trigger */}
          <div className="mb-3.5 flex items-center justify-between gap-3 gsap-reg-form">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Daftar Akun Baru
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 leading-normal">
                Kelola Mudah, Tumbuh Lebih Terarah.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateTo("/")}
              className="shrink-0 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              Sudah punya akun? Masuk
            </button>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/95 p-3 text-xs text-rose-800 shadow-xs"
            >
              <div className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 font-bold">⚠️</div>
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* COMPACT REGISTRATION FORM CARD */}
          <form
            onSubmit={submit}
            className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_10px_35px_-10px_rgba(15,23,42,0.06)] space-y-3.5 gsap-reg-form"
          >
            {/* 2-COLUMN INPUT GRID (4 di Kiri, 4 di Kanan agar Ringkas & Rapi) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* === KOLOM 1: IDENTITAS OUTLET & KONTAK === */}
              <div className="space-y-3">
                {/* Nama Outlet */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Outlet
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Store className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      disabled={loading}
                      value={form.outletName}
                      onChange={(e) => update("outletName", e.target.value)}
                      placeholder="Contoh: Cleanique Melati"
                      className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Nama Pemilik */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Pemilik
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      disabled={loading}
                      value={form.ownerName}
                      onChange={(e) => update("ownerName", e.target.value)}
                      placeholder="Nama lengkap pengelola"
                      className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Nomor WhatsApp */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nomor WhatsApp
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      disabled={loading}
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Email Login */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
                      className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>

              {/* === KOLOM 2: LOKASI, KEAMANAN & KODE REFERRAL === */}
              <div className="space-y-3">
                {/* Kota */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kota
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      disabled={loading}
                      value={form.city}
                      onChange={(e) => update("city", e.target.value)}
                      placeholder="Contoh: Surabaya"
                      className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Alamat */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Alamat
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      disabled={loading}
                      value={form.address}
                      onChange={(e) => update("address", e.target.value)}
                      placeholder="Jl. Mawar No. 10"
                      className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Kata Sandi */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
                      placeholder="Minimal 8 karakter"
                      className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-10 text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showPassword ? "Sembunyikan sandi" : "Lihat sandi"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Kode Referral */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kode Referral (Opsional)
                  </label>
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Tag className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        disabled={loading}
                        value={form.referralCode}
                        onChange={(e) => update("referralCode", e.target.value.toUpperCase())}
                        placeholder="Kode kupon promo"
                        className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={loading || !form.referralCode.trim() || refValidation.loading}
                      onClick={() => validateReferralCode()}
                      className="h-10 sm:h-11 px-3.5 rounded-xl border border-emerald-600 bg-emerald-50 text-emerald-800 font-bold text-xs hover:bg-emerald-100/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      {refValidation.loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span>Terapkan</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* REFERRAL BADGE IF ACTIVE / ERROR */}
            {refValidation.valid !== null && (
              <div className="pt-0.5">
                <ReferralBadge
                  loading={refValidation.loading}
                  valid={refValidation.valid}
                  codeName={refValidation.codeName}
                  discountType={refValidation.discountType}
                  discountValue={refValidation.discountValue}
                  message={refValidation.message}
                />
              </div>
            )}

            {/* RINGKASAN HARGA SATU BARIS (Menggantikan Kartu Harga Besar) */}
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-emerald-50/90 border border-emerald-200/90 px-3.5 py-2.5 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs shrink-0">
                  <Gift className="h-4 w-4" />
                </span>
                <div className="leading-tight">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Trial {trialDays} Hari:</span>
                    <span className="text-emerald-700 font-extrabold text-sm">Rp 0 (Gratis)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Setelah trial: Rp {basePrice.toLocaleString("id-ID")}/bulan • Tanpa kartu kredit
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWelcomeStep(1); // Langsung ke step rincian harga
                  setShowWelcomeModal(true);
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100/60 hover:border-emerald-300 transition-colors shrink-0 shadow-2xs cursor-pointer"
              >
                <span>Rincian Paket</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="relative flex w-full h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 px-4 text-sm font-bold text-white shadow-md shadow-emerald-900/15 transition-all duration-200 hover:from-emerald-700 hover:to-teal-800 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-100" />
                  <span>Menyiapkan Akun Outlet…</span>
                </>
              ) : (
                <>
                  <span>Daftar & Mulai Trial 7 Hari</span>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </>
              )}
            </button>

            {/* TERMS & PRIVACY */}
            <p className="text-center text-[10px] sm:text-[11px] leading-tight text-slate-400">
              Dengan mendaftar, Anda menyetujui Ketentuan & Privasi Laundry Cleanique.
            </p>
          </form>

          {/* BOTTOM GUARANTEE NOTE */}
          <div className="mt-3 text-center gsap-reg-form">
            <button
              type="button"
              onClick={() => {
                setWelcomeStep(0);
                setShowWelcomeModal(true);
              }}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
            >
              Pelajari panduan paket & fitur lengkap →
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* WELCOMING & PRICING MODAL SCREEN (Dengan Tombol Next-Next Interaktif)     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xl rounded-3xl bg-white p-5 sm:p-7 shadow-2xl text-slate-800 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-2xl bg-emerald-100 p-2 text-emerald-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                      Panduan Paket & Fitur
                    </h3>
                    <p className="text-xs text-slate-500">
                      Langkah 0{welcomeStep + 1} dari 03 • Informasi Resmi Cleanique
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWelcomeModal(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Dynamic Body based on Step */}
              <div className="py-4 overflow-y-auto flex-1">
                {/* === STEP 0: FITUR UNGGULAN & SISTEM POS === */}
                {welcomeStep === 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3.5"
                  >
                    <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-4 border border-emerald-200/80">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5 mb-1">
                        <Store className="h-3.5 w-3.5 text-emerald-600" />
                        Laundry Cleanique
                      </span>
                      <h4 className="text-lg font-extrabold text-slate-900 leading-snug">
                        Kelola Mudah, Tumbuh Lebih Terarah.
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Satu aplikasi terpadu untuk operasional kasir, notifikasi pelanggan, dan pantau keuangan laundry tanpa ribet.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Receipt className="h-4 w-4 text-emerald-700" />
                          <span className="font-bold text-slate-800">Kasir POS & Struk</span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-relaxed">
                          Timbang cepat kiloan & satuan, cetak nota thermal Bluetooth/USB dengan QR Code.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageCircle className="h-4 w-4 text-teal-700" />
                          <span className="font-bold text-slate-800">WhatsApp Otomatis</span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-relaxed">
                          Kirim nota digital & info cucian siap diambil langsung ke WhatsApp tanpa simpan nomor.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Store className="h-4 w-4 text-emerald-700" />
                          <span className="font-bold text-slate-800">Shift & Rekap Kas</span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-relaxed">
                          Kontrol uang fisik di laci kasir vs pencatatan sistem, hindari kebocoran kas 100%.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Bot className="h-4 w-4 text-teal-700" />
                          <span className="font-bold text-slate-800">Asisten AI Bisnis</span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-relaxed">
                          Konsultasi keuangan, analisa efisiensi bahan, dan strategi omzet toko siap bantu 24/7.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* === STEP 1: TRANSPARANSI HARGA & FREE TRIAL 7 HARI === */}
                {welcomeStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3"
                  >
                    <div className="rounded-2xl bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                      <p className="font-bold flex items-center gap-1.5 mb-0.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Transparansi Biaya Tanpa Jebakan:
                      </p>
                      <p className="text-emerald-800 text-[11px]">
                        Semua outlet baru menikmati masa trial 7 hari penuh dengan biaya <strong>Rp 0 (Gratis)</strong>. Tidak memerlukan kartu kredit untuk memulai.
                      </p>
                    </div>

                    {/* Komponen Ringkasan Harga Lengkap */}
                    <RegisterPriceSummary
                      basePrice={basePrice}
                      discountType={refValidation.valid ? refValidation.discountType : undefined}
                      discountValue={refValidation.valid ? refValidation.discountValue : 0}
                      trialDays={trialDays}
                    />
                  </motion.div>
                )}

                {/* === STEP 2: SETUP INSTAN DALAM 2 MENIT === */}
                {welcomeStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-3.5"
                  >
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                      <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                        Simple to Use. Built to Perform.
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Outlet Anda langsung aktif dan siap beroperasi dalam hitungan menit:
                      </p>

                      <div className="mt-4 space-y-3 text-xs text-slate-700">
                        <div className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-extrabold text-xs">
                            1
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">Kirim Formulir Pendaftaran</p>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              Lengkapi nama outlet, kontak WhatsApp, dan email login di formulir utama.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-extrabold text-xs">
                            2
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">Scan WhatsApp Outlet</p>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              Login ke dashboard, hubungkan nomor WhatsApp toko via scan QR di menu Pengaturan.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white font-extrabold text-xs">
                            3
                          </span>
                          <div>
                            <p className="font-bold text-slate-900">Mulai Terima Order Perdana</p>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              Sesuaikan tarif kiloan/satuan dan cetak nota kasir pertama Anda dengan mudah!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-emerald-50/80 p-3 border border-emerald-200/90 text-xs text-emerald-900 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
                      <span>Data bisnis Anda dienkripsi dan terisolasi aman antar cabang.</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Modal Stepper Dots & Navigation Buttons (Next / Prev / Finish) */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                {/* Stepper Dots Indicator */}
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Langkah ${idx + 1}`}
                      onClick={() => setWelcomeStep(idx)}
                      className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                        welcomeStep === idx
                          ? "w-6 bg-emerald-600"
                          : "w-2 bg-slate-200 hover:bg-slate-300"
                      }`}
                    />
                  ))}
                </div>

                {/* Buttons Navigation */}
                <div className="flex items-center gap-2">
                  {welcomeStep > 0 && (
                    <button
                      type="button"
                      onClick={() => setWelcomeStep((prev) => prev - 1)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Sebelumnya</span>
                    </button>
                  )}

                  {welcomeStep < 2 ? (
                    <button
                      type="button"
                      onClick={() => setWelcomeStep((prev) => prev + 1)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      <span>Selanjutnya</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowWelcomeModal(false)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-800 transition-all cursor-pointer"
                    >
                      <span>Mulai Isi Formulir</span>
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
};
