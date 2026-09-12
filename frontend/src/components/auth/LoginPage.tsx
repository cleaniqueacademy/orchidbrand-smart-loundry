import React, { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Store,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { User } from "../../types";

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Silakan isi email dan kata sandi Anda.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Gagal masuk ke sistem. Periksa email atau kata sandi Anda.");
        setLoading(false);
        return;
      }

      setSuccessMessage("Login berhasil! Mengalihkan ke dashboard...");
      setTimeout(() => { onLoginSuccess(data.user); }, 600);
    } catch {
      setErrorMessage("Terjadi kesalahan koneksi ke server. Pastikan backend aktif.");
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex flex-col justify-center items-center p-4 sm:p-6 text-white selection:bg-white selection:text-blue-900">
      {/* Background Decorative Accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-700/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-800/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white shadow-2xl mb-3">
            <Sparkles className="w-7 h-7 text-sky-300" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Orchid Brand
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mt-0.5">
            Smart Laundry Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-2xl shadow-blue-950/50 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
              Selamat Datang Kembali
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Masukkan kredensial akun untuk mengakses operasional laundry Anda.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Email Pengguna
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@orchidbrand.com"
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition bg-zinc-50/50 hover:bg-white focus:bg-white text-zinc-900 placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition bg-zinc-50/50 hover:bg-white focus:bg-white text-zinc-900 placeholder:text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-600 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-900/30 transition disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memvalidasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-6 pt-5 border-t border-blue-100">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2.5 text-center">
              Pilihan Akun Demo (Klik untuk Isi Cepat)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("admin@orchidbrand.com", "admin123")}
                className="p-2.5 rounded-xl border border-zinc-200 hover:border-blue-300 hover:bg-blue-50 text-left transition flex flex-col gap-1 group"
              >
                <div className="flex items-center gap-1.5 text-zinc-900 font-bold text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>Super Admin</span>
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  admin@orchidbrand.com
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  pass: admin123
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill("budi@laundrymelati.com", "budi123")}
                className="p-2.5 rounded-xl border border-zinc-200 hover:border-blue-300 hover:bg-blue-50 text-left transition flex flex-col gap-1 group"
              >
                <div className="flex items-center gap-1.5 text-zinc-900 font-bold text-xs">
                  <Store className="w-3.5 h-3.5 text-sky-600" />
                  <span>Owner Cabang</span>
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  budi@laundrymelati.com
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">
                  pass: budi123
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Notice */}
        <div className="mt-6 text-center text-[11px] text-blue-300 leading-relaxed">
          <p>
            Sistem langganan offline Orchid Brand.
            <br />
            Status akun dan masa aktif dikelola secara terpusat oleh Super Admin.
          </p>
        </div>
      </div>
    </div>
  );
};
