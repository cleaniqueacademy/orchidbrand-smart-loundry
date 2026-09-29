import React, { useState } from "react";
import {
  Check,
  CreditCard,
  MessageCircle,
  RefreshCw,
  LogOut,
  Building,
  Store,
  Printer,
  Users,
  Tag,
  ShieldCheck,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { User, AccountTier } from "../../types";
import { useToast } from "../common/ToastContext";
import { authHeaders } from "../../utils/api";

interface SubscriptionPaywallModalProps {
  isOpen: boolean;
  user: User | null;
  onRefreshStatus?: () => Promise<boolean | void> | void;
  onLogout?: () => void;
}

const DEFAULT_SUPPORT_PHONE = "081234567890";
const PRO_MONTHLY_RATE = 60000;
const PRO_REFERRAL_DISCOUNT = 5000;
const PREMIUM_MONTHLY_RATE = 100000;

export const SubscriptionPaywallModal: React.FC<SubscriptionPaywallModalProps> = ({
  isOpen,
  user,
  onRefreshStatus,
  onLogout,
}) => {
  const toast = useToast();

  const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium">("pro");
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [referralInput, setReferralInput] = useState<string>("");
  const [appliedReferral, setAppliedReferral] = useState<string | null>(null);
  const [checkingReferral, setCheckingReferral] = useState<boolean>(false);
  const [referralMessage, setReferralMessage] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<boolean>(false);

  if (!isOpen || !user) return null;

  // Calculate pricing
  const isPro = selectedPlan === "pro";
  const baseMonthly = isPro ? PRO_MONTHLY_RATE : PREMIUM_MONTHLY_RATE;
  const discountPerMonth = isPro && appliedReferral ? PRO_REFERRAL_DISCOUNT : 0;
  const effectiveMonthly = baseMonthly - discountPerMonth;
  const totalAmount = effectiveMonthly * durationMonths;

  // Clean WhatsApp Number
  const cleanPhone = DEFAULT_SUPPORT_PHONE.replace(/[^0-9]/g, "").replace(/^0/, "62");

  const planName = selectedPlan === "premium" ? "Paket Premium (Rp 100.000/bln)" : "Paket Pro (Rp 60.000/bln)";
  const waText = encodeURIComponent(
    `Halo Admin Laundry Cleanique,\n` +
      `Saya baru saja login ke sistem dengan akun:\n` +
      `• Nama: *${user.name}*\n` +
      `• Email: *${user.email}*\n` +
      `• Outlet: *${user.tenantName || "Laundry Baru"}* (ID: ${user.tenantId || "Free User"})\n\n` +
      `Saya ingin mengaktifkan langganan:\n` +
      `• Pilihan Paket: *${planName}*\n` +
      `• Durasi: *${durationMonths} Bulan*\n` +
      `${appliedReferral ? `• Kode Referral: *${appliedReferral}* (Diskon Rp 5.000/bln)\n` : ""}` +
      `• Total Tagihan: *Rp ${totalAmount.toLocaleString("id-ID")}*\n\n` +
      `Berikut saya lampirkan bukti transfer pembayaran saya. Mohon dibantu aktivasi akun outlet saya agar modal tertutup dan saya dapat mulai beroperasi. Terima kasih!`
  );

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = referralInput.trim().toUpperCase();
    if (!clean) return;

    setCheckingReferral(true);
    setReferralMessage(null);

    try {
      const res = await fetch(`/api/subscription/pricing?planId=${selectedPlan}&referralCode=${clean}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success && data.data && data.data.discountAmount > 0) {
        setAppliedReferral(clean);
        setReferralMessage(`Kode ${clean} aktif! Hemat Rp 5.000/bulan.`);
        toast.success("Kode Referral Valid", "Potongan tarif berhasil diterapkan.");
      } else {
        setAppliedReferral(null);
        setReferralMessage("Kode referral tidak valid atau sudah kedaluwarsa.");
        toast.error("Kode Tidak Valid", "Silakan periksa kembali kode referral Anda.");
      }
    } catch {
      // Safe fallback offline check
      if (clean === "CLEANHEMAT" || clean.length >= 4) {
        setAppliedReferral(clean);
        setReferralMessage(`Kode ${clean} diterapkan. Hemat Rp 5.000/bulan.`);
      } else {
        setReferralMessage("Kode tidak valid.");
      }
    } finally {
      setCheckingReferral(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!onRefreshStatus) return;
    setCheckingStatus(true);
    try {
      const isNowActive = await onRefreshStatus();
      if (isNowActive) {
        toast.success("Akun Aktif!", "Langganan Anda telah terverifikasi. Selamat bekerja!");
      } else {
        toast.info(
          "Belum Terverifikasi",
          "Status langganan masih diproses. Jika sudah transfer, pastikan telah mengirim bukti via WhatsApp ke Admin."
        );
      }
    } catch {
      toast.error("Gagal Memeriksa", "Koneksi ke server bermasalah, silakan coba sesaat lagi.");
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-zinc-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Gradient Banner */}
        <div className="h-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 w-full" />

        <div className="p-5 sm:p-7 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Akun Free User • Butuh Langganan Aktif</span>
            </div>
            <h2 id="paywall-modal-title" className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              Pilih Paket Langganan Laundry Cleanique
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 max-w-lg mx-auto leading-relaxed">
              Halo <span className="font-semibold text-zinc-900">{user.name}</span>, Anda berhasil login ke sistem.
              Untuk mulai mencatat order kasir, cetak nota, dan laporan keuangan toko, aktifkan paket langganan Anda.
            </p>
          </div>

          {/* Plan Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Card Paket Pro */}
            <div
              onClick={() => setSelectedPlan("pro")}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedPlan === "pro"
                  ? "border-blue-600 bg-blue-50/40 shadow-xs"
                  : "border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50/50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                    Paket Pro
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedPlan === "pro" ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-300"
                    }`}
                  >
                    {selectedPlan === "pro" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xl font-black text-zinc-900 tracking-tight">
                    Rp {(appliedReferral ? 55000 : 60000).toLocaleString("id-ID")}{" "}
                    <span className="text-xs font-normal text-zinc-500">/ bulan</span>
                  </div>
                  {appliedReferral && (
                    <div className="text-[11px] text-emerald-600 font-semibold line-through">
                      Rp 60.000 / bulan
                    </div>
                  )}
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Cocok untuk pemilik 1 gerai laundry yang ingin operasional kasir & buku kas rapi.
                  </p>
                </div>

                <ul className="space-y-1.5 text-xs text-zinc-600 border-t border-zinc-200/60 pt-3">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Kasir POS & Transaksi Realtime</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Notifikasi WhatsApp ke Pelanggan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Laporan Omzet, Laba Rugi & Buku Kas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>1 Cabang Gerai Laundry</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>50 Kuota Asisten AI Harian</span>
                  </li>
                </ul>
              </div>

              <div className="mt-4 pt-2 border-t border-zinc-200/60 text-[11px] text-blue-700 font-medium text-center">
                {selectedPlan === "pro" ? "✓ Paket Dipilih" : "Klik untuk Memilih"}
              </div>
            </div>

            {/* Card Paket Premium (Rp 100.000) */}
            <div
              onClick={() => setSelectedPlan("premium")}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedPlan === "premium"
                  ? "border-blue-700 bg-blue-50/40 shadow-xs"
                  : "border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50/50"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                    Paket Premium
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedPlan === "premium"
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-zinc-300"
                    }`}
                  >
                    {selectedPlan === "premium" && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xl font-black text-zinc-900 tracking-tight">
                    Rp 100.000 <span className="text-xs font-normal text-zinc-500">/ bulan</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Solusi enterprise multi-cabang, printer thermal POS, dan kelola banyak kasir.
                  </p>
                </div>

                <ul className="space-y-1.5 text-xs text-zinc-600 border-t border-zinc-200/60 pt-3">
                  <li className="flex items-center gap-2 font-medium text-zinc-900">
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Semua fitur Paket Pro</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Koneksi Thermal Printer POS (Bluetooth/USB)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Multi-Cabang (Hingga 10 Gerai)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Manajemen Multi-Karyawan & Hak Akses Kasir</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>Prioritas Dukungan Teknis Admin</span>
                  </li>
                </ul>
              </div>

              <div className="mt-4 pt-2 border-t border-zinc-200/60 text-[11px] text-indigo-700 font-medium text-center">
                {selectedPlan === "premium" ? "✓ Paket Dipilih" : "Klik untuk Memilih"}
              </div>
            </div>
          </div>

          {/* Duration & Referral Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Duration Selector */}
            <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 space-y-2">
              <label className="text-xs font-bold text-zinc-800 block">Pilih Durasi Langganan</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDurationMonths(m)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      durationMonths === m
                        ? "bg-zinc-900 text-white shadow-xs"
                        : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200"
                    }`}
                  >
                    {m} Bln
                  </button>
                ))}
              </div>
            </div>

            {/* Referral Code Form */}
            <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 space-y-2">
              <label className="text-xs font-bold text-zinc-800 block">Punya Kode Referral?</label>
              <form onSubmit={handleApplyReferral} className="flex gap-1.5">
                <input
                  type="text"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  placeholder="Contoh: CLEANHEMAT"
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={checkingReferral || !referralInput.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {checkingReferral ? "..." : "Terapkan"}
                </button>
              </form>
              {referralMessage && (
                <div
                  className={`text-[11px] font-medium ${
                    appliedReferral ? "text-emerald-700" : "text-rose-600"
                  }`}
                >
                  {referralMessage}
                </div>
              )}
            </div>
          </div>

          {/* Payment Account Details */}
          <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/60 rounded-2xl border border-zinc-200 p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200/70 text-xs">
              <div className="flex items-center gap-2 text-zinc-700 font-bold">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Rekening Resmi Admin Laundry Cleanique</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">BCA & QRIS</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-zinc-500 block text-[11px]">Bank BCA (Transfer Bank)</span>
                <span className="font-mono font-extrabold text-sm text-zinc-900 tracking-wider">
                  8295-0192-8812
                </span>
                <span className="text-zinc-600 text-[11px] block">a.n. Cleanique Laundry Indonesia</span>
              </div>

              <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-200">
                <span className="text-zinc-500 block text-[11px]">Total yang Harus Ditransfer</span>
                <span className="text-lg font-black text-blue-700 font-mono">
                  Rp {totalAmount.toLocaleString("id-ID")}
                </span>
                <span className="text-zinc-500 text-[10px] block">
                  ({durationMonths} bulan • {selectedPlan === "premium" ? "Paket Premium" : "Paket Pro"})
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-1">
            {/* Primary WA Button */}
            <a
              href={`https://wa.me/${cleanPhone}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer text-center text-sm"
            >
              <MessageCircle className="w-5 h-5 fill-white/20 text-white" />
              <span>Konfirmasi & Kirim Bukti via WhatsApp Admin</span>
            </a>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              {/* Secondary Status Refresh Button */}
              {onRefreshStatus && (
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={checkingStatus}
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingStatus ? "animate-spin text-blue-600" : ""}`} />
                  <span>{checkingStatus ? "Memeriksa..." : "Periksa Status Aktivasi"}</span>
                </button>
              )}

              {/* Logout Button */}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-zinc-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Akun</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Support Info */}
        <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-2.5 text-center text-[11px] text-zinc-400">
          Laundry Cleanique • Sistem Manajemen Laundry Multi-Cabang Modern
        </div>
      </div>
    </div>
  );
};
