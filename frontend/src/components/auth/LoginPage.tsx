import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { User } from "../../types";
import { InactiveAccountModal } from "../modals/InactiveAccountModal";

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

const SAVED_EMAIL_KEY = "cleanique_saved_email";

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
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
  const [activeDemoRole, setActiveDemoRole] = useState<string | null>(null);

  // Quick fill demo accounts
  const demoAccounts = [
    {
      role: "owner",
      title: "Owner",
      fullName: "Owner Outlet",
      subtitle: "Laundry Melati",
      email: "budi@laundrymelati.com",
      password: "budi123",
      icon: Store,
    },
    {
      role: "staff",
      title: "Kasir",
      fullName: "Kasir / Staf",
      subtitle: "Shift Operasional",
      email: "kasir@laundrymelati.com",
      password: "kasir123",
      icon: UserCheck,
    },
    {
      role: "admin",
      title: "Super Admin",
      fullName: "Super Admin",
      subtitle: "HQ Platform",
      email: "admin@cleaniquelaundry.com",
      password: "admin123",
      icon: Building2,
    },
  ];

  const handleSelectDemo = (account: (typeof demoAccounts)[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveDemoRole(account.role);
    setErrorMessage("");
  };

  const handleClearDemo = () => {
    setEmail("");
    setPassword("");
    setActiveDemoRole(null);
    setErrorMessage("");
  };

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
    <main className="min-h-screen w-full bg-[#f8fafc] lg:bg-[#07131b] font-sans text-slate-900 selection:bg-emerald-500 selection:text-white lg:grid lg:grid-cols-[1.12fr_1fr] lg:h-screen lg:overflow-hidden">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: HERO & BRANDING SHOWCASE (Desktop Only)                     */}
      {/* ========================================================================= */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden h-full bg-gradient-to-br from-[#051119] via-[#091e2b] to-[#0a2926] p-6 xl:p-10 2xl:p-12 text-slate-100 border-r border-white/5">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-[450px] w-[450px] rounded-full bg-emerald-500/15 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-32 right-0 h-[450px] w-[450px] rounded-full bg-teal-400/15 blur-[150px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />

        {/* Top Header: Logo & System Indicator */}
        <div className="relative z-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/laundry-cleanique-outline.png"
              alt="Laundry Cleanique"
              className="h-9 xl:h-10 w-auto object-contain filter drop-shadow-md"
            />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur-md shadow-xs">
            <span>Platform Cloud v2.0 • Online</span>
          </div>
        </div>

        {/* Hero Middle Content */}
        <div className="relative z-10 my-auto max-w-xl py-3 xl:py-6 space-y-4 xl:space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 px-3.5 py-1 text-xs font-semibold text-emerald-200 backdrop-blur-md shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            Smart Laundry Management Platform
          </div>

          <h1 className="text-2xl xl:text-3xl 2xl:text-4xl font-extrabold tracking-tight text-white leading-[1.2]">
            Kendalikan Operasional & Kasir Laundry{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
              dalam Satu Layar.
            </span>
          </h1>

          <p className="text-xs xl:text-sm leading-relaxed text-slate-300/85 max-w-lg">
            Sistem terintegrasi untuk kasir POS cepat, cetak struk thermal 58/80mm, pelacakan resi online, serta notifikasi otomatis WhatsApp ke pelanggan.
          </p>

          {/* Interactive Feature Cards */}
          <div className="grid grid-cols-2 gap-3 pt-0.5">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-md transition-all duration-300 hover:border-emerald-400/30 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-emerald-950/20">
              <div className="flex items-center gap-2 mb-1">
                <div className="rounded-xl bg-emerald-500/20 p-1.5 text-emerald-300">
                  <Store className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-white">Kasir POS & Shift</span>
              </div>
              <p className="text-[11px] xl:text-xs text-slate-300/75 leading-relaxed">
                Timbang kiloan/satuan instan, quick pay QRIS/Tunai, dan rekonsiliasi kas laci.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-md transition-all duration-300 hover:border-teal-400/30 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-teal-950/20">
              <div className="flex items-center gap-2 mb-1">
                <div className="rounded-xl bg-teal-500/20 p-1.5 text-teal-300">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-white">WhatsApp Otomatis</span>
              </div>
              <p className="text-[11px] xl:text-xs text-slate-300/75 leading-relaxed">
                Struk digital langsung ke WA pelanggan saat order dibuat & selesai dicuci.
              </p>
            </div>
          </div>

          {/* Live WhatsApp Notification Preview */}
          <div className="rounded-2xl border border-emerald-500/20 bg-slate-900/70 p-3.5 backdrop-blur-lg shadow-xl shadow-black/30">
            <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-white/5">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Pratinjau Pesan Pelanggan
              </span>
              <span className="text-slate-400 text-[10px]">Baru saja</span>
            </div>
            <div className="mt-2 flex items-start gap-2.5">
              <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                <MessageCircle className="h-3.5 w-3.5" />
              </div>
              <div className="text-xs text-slate-200 leading-relaxed">
                <span className="font-semibold text-white">Cleanique Outlet:</span> Halo Kak Budi, cucian Anda nota{" "}
                <span className="font-mono text-emerald-300 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  #INV-2026-081
                </span>{" "}
                sudah <span className="text-emerald-400 font-semibold">Selesai & Siap Diambil</span>. Jam operasional toko hari ini s/d 16:00. Terima kasih!
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Footer */}
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-3 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>PT Indotech Berkah Abadi</span>
          </div>
          <span className="text-slate-500 font-medium">© 2026 Laundry Cleanique</span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: LOGIN FORM (Mobile & Desktop)                               */}
      {/* ========================================================================= */}
      <section className="flex flex-col justify-center items-center bg-[#f8fafc] px-4 py-8 sm:px-8 md:px-10 overflow-y-auto min-h-screen lg:h-screen">
        <div className="w-full max-w-[420px] my-auto">
          {/* Mobile Top Brand Header */}
          <div className="mb-6 flex flex-col items-center text-center lg:hidden">
            <img
              src="/laundry-cleanique.png"
              alt="Laundry Cleanique"
              className="h-11 w-auto object-contain mb-2.5 drop-shadow-sm"
            />
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
              Sistem Operasional & Kasir Laundry
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-4 text-left sm:text-left">
            <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900 leading-snug">
              Masuk ke Ruang Kerja
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Masukkan email dan kata sandi akun outlet Anda untuk memulai shift.
            </p>
          </div>

          {/* DEMO ACCOUNTS SEGMENTED SWITCHER */}
          <div className="mb-4 rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Coba Akun Demo
              </span>
              {activeDemoRole ? (
                <button
                  type="button"
                  onClick={handleClearDemo}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">1-klik isi otomatis</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {demoAccounts.map((account) => {
                const isSelected = activeDemoRole === account.role;
                const IconComponent = account.icon;
                return (
                  <button
                    key={account.role}
                    type="button"
                    onClick={() => handleSelectDemo(account)}
                    className={`group relative flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all duration-150 ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 shadow-xs ring-1 ring-emerald-500/20"
                        : "border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <IconComponent
                        className={`h-3.5 w-3.5 ${
                          isSelected ? "text-emerald-700" : "text-slate-500 group-hover:text-slate-700"
                        }`}
                      />
                      {isSelected && <Check className="h-3 w-3 text-emerald-600" />}
                    </div>
                    <span className="text-[11px] font-bold leading-tight truncate w-full">
                      {account.title}
                    </span>
                    <span className="text-[9px] text-slate-500 leading-tight mt-0.5 truncate w-full">
                      {account.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
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
            className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-[0_10px_35px_-10px_rgba(15,23,42,0.06)] space-y-4"
          >
            {/* EMAIL INPUT */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Alamat Email
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (activeDemoRole) setActiveDemoRole(null);
                  }}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (activeDemoRole) setActiveDemoRole(null);
                  }}
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
                <span className="font-medium">Ingat akun saya</span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="relative mt-2 flex w-full h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 px-4 text-sm font-bold text-white shadow-md shadow-emerald-900/15 transition-all duration-200 hover:from-emerald-700 hover:to-teal-800 hover:shadow-lg hover:shadow-emerald-900/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-100" />
                  <span>Memvalidasi Akun…</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
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
                  className="font-bold text-emerald-700 hover:text-emerald-800 underline-offset-4 hover:underline"
                >
                  Mulai Trial 7 Hari Gratis
                </button>
              </p>
            </div>
          </form>

          {/* BOTTOM SECURITY NOTE */}
          <div className="mt-4 text-center">
            <p className="text-[11px] leading-relaxed text-slate-400">
              Dilindungi enkripsi end-to-end, multi-role RBAC, & audit shift kasir.
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
