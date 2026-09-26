import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Store,
  UserCheck,
  Building2,
  HelpCircle,
  MessageCircle,
  X,
  Check,
  RotateCcw,
  Receipt,
  Smartphone,
  Bot,
} from "lucide-react";
import { User } from "../../types";
import { InactiveAccountModal } from "../modals/InactiveAccountModal";

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const SAVED_EMAIL_KEY = "cleanique_saved_email";

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const pageRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem(SAVED_EMAIL_KEY) || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [inactiveAccountUser, setInactiveAccountUser] = useState<any | null>(null);

  // GSAP Entrance Animations
  useEffect(() => {
    if (!pageRef.current) return;
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

      // 2. Left Hero section items stagger entrance
      gsap.fromTo(
        ".gsap-login-hero",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.08,
          duration: 0.75,
          ease: "power3.out",
          delay: 0.08,
        }
      );

      // 3. Feature Cards Staggered Pop
      gsap.fromTo(
        ".gsap-feature-card",
        { opacity: 0, y: 20, scale: 0.94 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          stagger: 0.09,
          duration: 0.65,
          ease: "back.out(1.4)",
          delay: 0.28,
        }
      );

      // 4. Right Form Container Entrance
      gsap.fromTo(
        ".gsap-login-form-container",
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

      // 5. Right Form Elements Staggered Fade-Up
      gsap.fromTo(
        ".gsap-login-form-elem",
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.06,
          duration: 0.6,
          ease: "power2.out",
          delay: 0.25,
        }
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(e.getModifierState("CapsLock"));
  };

  const executeLogin = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setErrorMessage("Masukkan alamat email dan kata sandi untuk melanjutkan.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (rememberMe) {
        localStorage.setItem(SAVED_EMAIL_KEY, normalizedEmail);
      } else {
        localStorage.removeItem(SAVED_EMAIL_KEY);
      }
    } catch {}

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (
          (data.code === "ACCOUNT_INACTIVE" || data.code === "SUBSCRIPTION_EXPIRED") &&
          data.user
        ) {
          setInactiveAccountUser(data.user);
        }
        setErrorMessage(data.message || "Email atau kata sandi tidak sesuai.");
        setLoading(false);
        return;
      }

      if (data.token) {
        localStorage.setItem("cleanique_token", data.token);
      }

      setSuccessMessage("Berhasil masuk! Membuka ruang kerja Anda…");
      window.setTimeout(() => {
        onLoginSuccess(data.user);
      }, 400);
    } catch {
      setErrorMessage("Koneksi ke server terputus. Silakan coba lagi beberapa saat lagi.");
      setLoading(false);
    }
  };

  const goToRegister = () => {
    const query = window.location.search;
    window.history.pushState({}, "", `/register${query}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <main
      ref={pageRef}
      className="min-h-screen w-full bg-[#f8fafc] lg:bg-[#07131b] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white lg:grid lg:grid-cols-[1.12fr_1fr] lg:h-screen lg:overflow-hidden"
    >
      {/* ========================================================================= */}
      {/* LEFT COLUMN: HERO & BRANDING SHOWCASE (Desktop Only)                     */}
      {/* ========================================================================= */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden h-full bg-gradient-to-br from-[#051119] via-[#091e2b] to-[#0a2926] px-6 xl:px-10 2xl:px-12 pt-5 pb-7 xl:pb-9 text-slate-100 border-r border-white/5">
        {/* Ambient Glows */}
        <div className="gsap-glow-orb pointer-events-none absolute -top-32 -left-32 h-[450px] w-[450px] rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="gsap-glow-orb pointer-events-none absolute -bottom-32 right-0 h-[450px] w-[450px] rounded-full bg-teal-400/15 blur-[150px]" />
        <div className="gsap-glow-orb pointer-events-none absolute top-1/2 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />

        {/* Top Header: Logo & System Indicator */}
        <div className="relative z-10 flex items-center justify-between shrink-0 gsap-login-hero">
          <div className="flex items-center gap-3">
            <img
              src="/laundry-cleanique-outline.png"
              alt="Laundry Cleanique"
              className="h-7 xl:h-8 w-auto object-contain filter drop-shadow-md"
            />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 backdrop-blur-md shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Platform Manajemen Laundry</span>
          </div>
        </div>

        {/* Hero Middle Content */}
        <div className="relative z-10 my-auto max-w-xl py-1 space-y-2 xl:space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-emerald-200 backdrop-blur-md shadow-xs gsap-login-hero">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            Simple to Use. Built to Perform.
          </div>

          <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-extrabold tracking-tight text-white leading-snug gsap-login-hero">
            Kelola Mudah,{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
              Tumbuh Lebih Terarah.
            </span>
          </h1>

          <p className="text-[11px] xl:text-xs leading-relaxed text-slate-300/85 max-w-lg gsap-login-hero">
            Solusi kasir POS cepat, nota WhatsApp otomatis, rekapitulasi kas laci, dan asisten AI pintar dalam satu sistem yang ringkas.
          </p>

          {/* Interactive Feature Cards Grid (4 Key Highlights) */}
          <div className="grid grid-cols-2 gap-2 xl:gap-2.5 pt-0.5">
            {/* Card 1 */}
            <div className="gsap-feature-card group rounded-xl border border-white/10 bg-white/[0.04] p-2 xl:p-2.5 backdrop-blur-md transition-all duration-300 hover:border-emerald-400/40 hover:bg-white/[0.08] hover:shadow-lg hover:shadow-emerald-950/25 hover:-translate-y-0.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="rounded-md bg-emerald-500/20 p-1 text-emerald-300 group-hover:scale-110 transition-transform">
                  <Store className="h-3 w-3" />
                </div>
                <span className="text-[11px] font-bold text-white tracking-wide">Kasir POS & Shift</span>
              </div>
              <p className="text-[10px] xl:text-[10.5px] text-slate-300/75 leading-snug">
                Timbang kiloan, cetak struk thermal, & rekap kas laci tanpa ribet.
              </p>
            </div>

            {/* Card 2 */}
            <div className="gsap-feature-card group rounded-xl border border-white/10 bg-white/[0.04] p-2 xl:p-2.5 backdrop-blur-md transition-all duration-300 hover:border-teal-400/40 hover:bg-white/[0.08] hover:shadow-lg hover:shadow-teal-950/25 hover:-translate-y-0.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="rounded-md bg-teal-500/20 p-1 text-teal-300 group-hover:scale-110 transition-transform">
                  <MessageCircle className="h-3 w-3" />
                </div>
                <span className="text-[11px] font-bold text-white tracking-wide">Nota WhatsApp Otomatis</span>
              </div>
              <p className="text-[10px] xl:text-[10.5px] text-slate-300/75 leading-snug">
                Kirim nota digital & info cucian selesai langsung ke nomor pelanggan.
              </p>
            </div>

            {/* Card 3 */}
            <div className="gsap-feature-card group rounded-xl border border-white/10 bg-white/[0.04] p-2 xl:p-2.5 backdrop-blur-md transition-all duration-300 hover:border-cyan-400/40 hover:bg-white/[0.08] hover:shadow-lg hover:shadow-cyan-950/25 hover:-translate-y-0.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="rounded-md bg-cyan-500/20 p-1 text-cyan-300 group-hover:scale-110 transition-transform">
                  <Bot className="h-3 w-3" />
                </div>
                <span className="text-[11px] font-bold text-white tracking-wide">Asisten AI Bisnis</span>
              </div>
              <p className="text-[10px] xl:text-[10.5px] text-slate-300/75 leading-snug">
                Konsultasi finansial, ide promo, dan audit efisiensi bahan 24/7.
              </p>
            </div>

            {/* Card 4 */}
            <div className="gsap-feature-card group rounded-xl border border-white/10 bg-white/[0.04] p-2 xl:p-2.5 backdrop-blur-md transition-all duration-300 hover:border-emerald-400/40 hover:bg-white/[0.08] hover:shadow-lg hover:shadow-emerald-950/25 hover:-translate-y-0.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="rounded-md bg-emerald-500/20 p-1 text-emerald-300 group-hover:scale-110 transition-transform">
                  <Receipt className="h-3 w-3" />
                </div>
                <span className="text-[11px] font-bold text-white tracking-wide">Laporan & Keuangan</span>
              </div>
              <p className="text-[10px] xl:text-[10.5px] text-slate-300/75 leading-snug">
                Pantau omzet harian, performa staf, dan laba-rugi secara akurat.
              </p>
            </div>
          </div>

          {/* Trust Highlights Badges */}
          <div className="flex items-center flex-wrap gap-1.5 pt-0.5 gsap-login-hero">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-slate-300">
              <ShieldCheck className="h-3 w-3 text-emerald-400" /> Data Outlet Aman & Terisolasi
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-slate-300">
              <Smartphone className="h-3 w-3 text-teal-400" /> Akses dari HP, Tablet, & PC
            </span>
          </div>
        </div>

        {/* Desktop Footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3 pb-1 text-[11px] xl:text-xs text-slate-400 shrink-0 gsap-login-hero">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>PT Indotech Berkah Abadi</span>
          </div>
          <span className="text-slate-500 font-medium">© 2026 Laundry Cleanique</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: LOGIN FORM (Mobile & Desktop)                               */}
      {/* ========================================================================= */}
      <section className="flex flex-col justify-center items-center bg-[#f8fafc] px-4 py-8 sm:px-8 md:px-10 overflow-y-auto min-h-screen lg:h-screen">
        <div className="gsap-login-form-container w-full max-w-[420px] my-auto">
          {/* Mobile Top Brand Header */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden gsap-login-form-elem">
            <img
              src="/laundry-cleanique.png"
              alt="Laundry Cleanique"
              className="h-11 w-auto object-contain mb-2.5 drop-shadow-sm"
            />
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
              Simple to Use. Built to Perform.
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-4 text-left sm:text-left gsap-login-form-elem">
            <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900 leading-snug">
              Masuk ke Akun
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Kelola Mudah, Tumbuh Lebih Terarah.
            </p>
          </div>

          {/* ERROR ALERT */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                role="alert"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/95 p-3 text-xs sm:text-sm text-rose-800 shadow-xs"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <span className="leading-snug">{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SUCCESS ALERT */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                role="status"
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/95 p-3 text-xs sm:text-sm text-emerald-800 shadow-xs"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span className="leading-snug">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* LOGIN FORM CARD */}
          <form
            onSubmit={executeLogin}
            className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-[0_10px_35px_-10px_rgba(15,23,42,0.06)] space-y-4 gsap-login-form-elem"
          >
            {/* EMAIL INPUT */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@outlet.com"
                  className="w-full h-11 sm:h-12 rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-3.5 text-base sm:text-sm text-slate-900 placeholder-slate-400 transition-all duration-150 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-600/10 disabled:opacity-60"
                />
              </div>
            </div>

            {/* PASSWORD INPUT */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Kata Sandi
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline transition-colors"
                >
                  Lupa sandi?
                </button>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  value={password}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyDown}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
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

              {/* CAPS LOCK WARNING */}
              {capsLockActive && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-600">
                  <AlertCircle className="h-3 w-3" /> Caps Lock aktif
                </p>
              )}
            </div>

            {/* REMEMBER ME CHECKBOX */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 hover:text-slate-800">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 focus:ring-offset-0 cursor-pointer"
                />
                <span className="font-medium">Ingat saya</span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="relative mt-2 flex w-full h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 px-4 text-sm font-bold text-white shadow-md shadow-emerald-900/15 transition-all duration-200 hover:from-emerald-700 hover:to-teal-800 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-100" />
                  <span>Memeriksa Akun…</span>
                </>
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* REGISTER CALLOUT */}
            <div className="border-t border-slate-100 pt-3.5 text-center">
              <p className="text-xs text-slate-500">
                Belum punya akun outlet?{" "}
                <button
                  type="button"
                  onClick={goToRegister}
                  className="font-bold text-emerald-700 hover:text-emerald-800 underline-offset-4 hover:underline cursor-pointer"
                >
                  Mulai Trial 7 Hari Gratis
                </button>
              </p>
            </div>
          </form>

          {/* BOTTOM SECURITY NOTE */}
          <div className="mt-4 text-center gsap-login-form-elem">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Aman & terenkripsi • Multi-cabang • Akses dari HP, tablet, & PC
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FORGOT PASSWORD MODAL                                                     */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-slate-800 border border-slate-100"
            >
              <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Bantuan Reset Kata Sandi</h3>
                    <p className="text-xs text-slate-500">Panduan pemulihan akun Laundry Cleanique</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs text-slate-600 leading-relaxed">
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                  <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-blue-600" /> 1. Untuk Staf / Kasir Outlet:
                  </p>
                  <p>
                    Silakan hubungi <strong>Pemilik Outlet (Owner)</strong> Anda. Pemilik dapat mengatur ulang kata sandi staf secara instan melalui menu <em>Manajemen Staf</em> di dashboard.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
                  <p className="font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-emerald-600" /> 2. Untuk Pemilik Outlet (Owner):
                  </p>
                  <p>
                    Jika Anda lupa kata sandi akun Owner, hubungi Customer Care & Tim Support Pusat melalui WhatsApp resmi untuk verifikasi identitas outlet.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <a
                  href="https://wa.me/6281299881122?text=Halo%20Admin%20Cleanique,%20saya%20membutuhkan%20bantuan%20reset%20kata%20sandi%20akun%20outlet."
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full sm:w-auto flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" /> Hubungi WhatsApp Support
                </a>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INACTIVE ACCOUNT MODAL */}
      <InactiveAccountModal
        isOpen={!!inactiveAccountUser}
        user={inactiveAccountUser}
        onClose={() => setInactiveAccountUser(null)}
        isDismissable
      />
    </main>
  );
};
