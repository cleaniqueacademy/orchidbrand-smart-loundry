import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  AlertTriangle,
  Clock,
  RefreshCw,
  MessageCircle,
  Building,
  CreditCard,
  Tag,
  Loader2,
  X,
  Trash2,
  Edit2,
  Check,
  Printer,
  Store,
  Users,
  ShieldCheck,
  Crown,
  QrCode,
  Download,
  ExternalLink,
} from "lucide-react";
import { authHeaders } from "../../utils/api";
import { useToast } from "../common/ToastContext";
import { useConfirm } from "../common/ConfirmContext";
import { AccountTier } from "../../types";
import { QrisPreviewModal } from "../modals/QrisPreviewModal";

interface SubscriptionSummaryData {
  tenantId: string;
  outletName: string;
  isTrial: boolean;
  isActive: boolean;
  subscriptionUntil: string | null;
  daysRemaining: number;
  status: string;
  tier?: AccountTier;
  referralCodeUsed?: string | null;
  pendingInvoice?: any | null;
}

interface PlatformPublicSettings {
  platformName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  qrisInfo?: string;
  supportPhone?: string;
}

interface SubscriptionStatusCardProps {
  tenantId: string;
  currentTier?: AccountTier;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({
  tenantId,
  currentTier = "pro",
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [summary, setSummary] = useState<SubscriptionSummaryData | null>(null);
  const [settings, setSettings] = useState<PlatformPublicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upgrade / Plan Selection State
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "premium">("pro");
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);
  const [downloadingQris, setDownloadingQris] = useState(false);

  const handleDownloadQris = async () => {
    setDownloadingQris(true);
    try {
      const response = await fetch("/qris.png");
      if (!response.ok) throw new Error("Gagal mengambil file gambar");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "QRIS-Laundry-Cleanique.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Gambar QRIS berhasil diunduh.");
    } catch {
      const link = document.createElement("a");
      link.href = "/qris.png";
      link.download = "QRIS-Laundry-Cleanique.png";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloadingQris(false), 400);
    }
  };

  // State pengelolaan kode referral
  const [isEditingReferral, setIsEditingReferral] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [applyingReferral, setApplyingReferral] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/subscription/summary?tenantId=${tenantId}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSummary(data.data);
        if (data.data.tier === "premium") {
          setSelectedPlan("premium");
        }
      } else {
        setError(data.message || "Gagal memuat status langganan.");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat data langganan.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditReferral = () => {
    setReferralInput(summary?.referralCodeUsed || "");
    setReferralError(null);
    setIsEditingReferral(true);
  };

  const handleCancelEditReferral = () => {
    setIsEditingReferral(false);
    setReferralError(null);
  };

  const handleApplyReferral = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = referralInput.trim().toUpperCase();
    if (!cleanCode) {
      setReferralError("Silakan masukkan kode referral.");
      return;
    }

    setApplyingReferral(true);
    setReferralError(null);

    try {
      const res = await fetch("/api/subscription/apply-referral", {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: summary?.tenantId || tenantId,
          referralCode: cleanCode,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(
          "Kode Referral Berhasil Diterapkan!",
          json.message || `Tarif perpanjangan Paket Pro hemat menjadi Rp 55.000/bulan.`
        );
        setIsEditingReferral(false);
        setReferralInput("");
        await fetchSummary();
      } else {
        setReferralError(json.message || "Kode referral tidak valid atau sudah kedaluwarsa.");
        toast.error("Gagal Menerapkan", json.message || "Kode referral tidak valid.");
      }
    } catch (err: any) {
      setReferralError(err.message || "Terjadi kesalahan jaringan.");
      toast.error("Kesalahan Jaringan", err.message);
    } finally {
      setApplyingReferral(false);
    }
  };

  const handleRemoveReferral = async () => {
    if (!summary?.referralCodeUsed) return;
    const ok = await confirm({
      title: "Copot Kode Referral?",
      description: (
        <span>
          Apakah Anda yakin ingin melepas kode referral{" "}
          <strong>{summary.referralCodeUsed}</strong>? Tarif perpanjangan bulanan
          outlet akan kembali ke tarif standar <strong>Rp 60.000 / bulan</strong>.
        </span>
      ),
      confirmText: "Ya, Copot Kode",
      cancelText: "Batal",
      variant: "warning",
    });

    if (!ok) return;

    try {
      const res = await fetch("/api/subscription/remove-referral", {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: summary?.tenantId || tenantId,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.info("Kode Referral Dicopot", json.message || "Tarif outlet kini kembali ke standar Rp 60.000/bulan.");
        setIsEditingReferral(false);
        await fetchSummary();
      } else {
        toast.error("Gagal Mencopot", json.message || "Terjadi kesalahan.");
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message);
    }
  };

  const fetchPlatformSettings = async () => {
    try {
      const res = await fetch("/api/platform-settings/public");
      const json = await res.json();
      if (json.success && json.data) {
        setSettings(json.data);
      }
    } catch {}
  };

  useEffect(() => {
    if (tenantId) {
      fetchSummary();
      fetchPlatformSettings();
    }
  }, [tenantId]);

  // Loading Skeleton
  if (loading) {
    return (
      <div className="space-y-4 opacity-75">
        <div className="bg-zinc-100 rounded-2xl border border-zinc-200/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 bg-zinc-200 rounded w-32" />
              <div className="h-7 bg-zinc-200 rounded w-48" />
            </div>
            <div className="h-10 bg-zinc-200 rounded-xl w-32" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            <div className="h-16 bg-zinc-200/70 rounded-xl" />
            <div className="h-16 bg-zinc-200/70 rounded-xl" />
            <div className="h-16 bg-zinc-200/70 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error State with Retry
  if (error || !summary) {
    return (
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
        <h3 className="font-bold text-zinc-900 text-sm">Belum Dapat Memuat Data Langganan</h3>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          {error || "Data outlet sedang diproses atau belum terhubung."}
        </p>
        <button
          onClick={fetchSummary}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
        </button>
      </div>
    );
  }

  const isExpiringSoon = summary.daysRemaining >= 0 && summary.daysRemaining <= 7;
  const isExpired = summary.daysRemaining < 0;
  const hasReferral = Boolean(summary.referralCodeUsed);

  // Dynamic pricing based on selected plan
  const proMonthly = hasReferral ? 55000 : 60000;
  const premiumMonthly = 100000;
  const effectiveRate = selectedPlan === "premium" ? premiumMonthly : proMonthly;
  const totalAmount = effectiveRate * durationMonths;

  const statusColor = isExpired
    ? "from-rose-500/10 via-rose-500/5 to-transparent border-rose-200"
    : isExpiringSoon
    ? "from-amber-500/10 via-amber-500/5 to-transparent border-amber-200"
    : "from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200";

  const statusText = isExpired
    ? "Masa Aktif Kedaluwarsa"
    : summary.isTrial
    ? "Masa Trial Gratis (7 Hari)"
    : "Langganan Aktif";

  const adminPhone = settings?.supportPhone || "081234567890";
  const cleanPhone = adminPhone.replace(/[^0-9]/g, "").replace(/^0/, "62");

  const planActionTitle =
    selectedPlan === "premium"
      ? "Upgrade / Perpanjang ke Paket Premium (Rp 100.000/bln)"
      : "Perpanjang Paket Pro (Rp 60.000/bln)";

  const waMessage = encodeURIComponent(
    `Halo Admin Laundry Cleanique,\n` +
      `Saya pemilik outlet *${summary.outletName}* (ID: ${summary.tenantId}).\n` +
      `Saya ingin *${planActionTitle}*.\n` +
      `• Durasi: *${durationMonths} Bulan*\n` +
      `• Total Tagihan: *Rp ${totalAmount.toLocaleString("id-ID")}*\n` +
      `${hasReferral && selectedPlan === "pro" ? `• Status Referral: Menggunakan kode *${summary.referralCodeUsed}* (Diskon Rp 5.000/bln)\n` : ""}` +
      `Berikut saya lampirkan bukti transfer pembayaran perpanjangan/upgrade saya. Mohon dibantu verifikasi masa aktifnya. Terima kasih!`
  );

  return (
    <div className="space-y-6">
      {/* Status Utama */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${statusColor} bg-white rounded-2xl border p-6 shadow-2xs space-y-5`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold mb-1.5 whitespace-nowrap shrink-0">
              {isExpired ? (
                <span className="whitespace-nowrap shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-rose-700 bg-rose-100">
                  {statusText}
                </span>
              ) : isExpiringSoon ? (
                <span className="whitespace-nowrap shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-amber-800 bg-amber-100">
                  Segera Berakhir
                </span>
              ) : (
                <span className="whitespace-nowrap shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-emerald-800 bg-emerald-100">
                  {statusText}
                </span>
              )}
              {summary.isTrial && (
                <span className="whitespace-nowrap shrink-0 bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  TRIAL 7 HARI
                </span>
              )}
              <span className="whitespace-nowrap shrink-0 bg-zinc-100 text-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-zinc-200">
                Tier: {(summary.tier || currentTier).toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-zinc-900">{summary.outletName}</h3>
            <p className="text-xs text-zinc-500">ID Outlet: <span className="font-mono">{summary.tenantId}</span></p>
          </div>

          {/* Tombol Hubungi Admin via WhatsApp */}
          <a
            href={`https://wa.me/${cleanPhone}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer text-center"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Kirim Bukti & Konfirmasi via WA Admin</span>
          </a>
        </div>

        {/* 3 Metrik Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-white border border-blue-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-semibold text-blue-800">Masa Aktif Hingga</span>
              <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-zinc-900 font-bold text-sm tracking-tight">
              {formatDate(summary.subscriptionUntil)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white border border-amber-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-semibold text-amber-800">Sisa Waktu</span>
              <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`font-bold text-sm tracking-tight ${isExpired ? "text-rose-600" : isExpiringSoon ? "text-amber-600" : "text-emerald-700"}`}>
              {isExpired ? "Sudah Berakhir" : `${summary.daysRemaining} Hari Lagi`}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white border border-indigo-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-semibold text-indigo-800">Paket Pilihan Anda</span>
              <div className="w-7 h-7 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="font-bold text-sm text-indigo-700 tracking-tight">
              Rp {effectiveRate.toLocaleString("id-ID")} / bulan
            </div>
          </div>
        </div>

        {/* Manajemen & Status Kode Referral */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            hasReferral
              ? "bg-emerald-50/50 border-emerald-200/90"
              : "bg-zinc-50/80 border-zinc-200/80"
          }`}
        >
          {!isEditingReferral ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                    hasReferral
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                  }`}
                >
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-700">Kode Referral:</span>
                    {hasReferral ? (
                      <>
                        <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-lg bg-white text-emerald-800 border border-emerald-300 shadow-2xs tracking-wider">
                          {summary.referralCodeUsed}
                        </span>
                        <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Diskon Rp 5.000/bln Aktif
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-500 font-medium">
                        Tidak ada kode referral (Tarif Standar Pro Rp 60.000/bln)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                    {hasReferral
                      ? "Kode referral terverifikasi. Outlet Anda menikmati tarif hemat Rp 55.000/bulan untuk Paket Pro."
                      : "Punya kode referral dari tim Cleanique? Terapkan sekarang untuk mendapatkan tarif hemat Rp 55.000/bulan untuk Paket Pro."}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {hasReferral ? (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenEditReferral}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 transition shadow-2xs cursor-pointer active:scale-95"
                      title="Ganti dengan kode referral lain"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Ganti Kode</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveReferral}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer active:scale-95"
                      title="Copot kode referral"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Copot</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenEditReferral}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition cursor-pointer active:scale-95"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>+ Terapkan Kode Referral</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Form Edit / Input Kode Referral */
            <form onSubmit={handleApplyReferral} className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{hasReferral ? "Ganti Kode Referral" : "Terapkan Kode Referral Marketing"}</span>
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Masukkan kode promo / referral resmi dari tim Cleanique untuk mengaktifkan tarif hemat Rp 55.000/bulan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEditReferral}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-200/60 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1 max-w-sm">
                  <Tag className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={referralInput}
                    onChange={(e) => {
                      setReferralInput(e.target.value.toUpperCase());
                      if (referralError) setReferralError(null);
                    }}
                    placeholder="Contoh: CLEANHEMAT"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold tracking-wider uppercase border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white shadow-2xs"
                    autoFocus
                    disabled={applyingReferral}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={applyingReferral || !referralInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                  >
                    {applyingReferral ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Memverifikasi...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Terapkan Kode</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelEditReferral}
                    disabled={applyingReferral}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-200/60 transition cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>

              {referralError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                  <span>{referralError}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </motion.div>

      {/* === PILIHAN GANTI / UPGRADE PAKET LANGGANAN === */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xs p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h4 className="font-bold text-zinc-900 text-sm">Ganti / Upgrade Paket Langganan</h4>
            <p className="text-xs text-zinc-500">Pilih paket lisensi yang sesuai dengan skala bisnis laundry Anda</p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Tarif Transparan
          </span>
        </div>

        {/* Pilihan Paket Pro vs Premium Side by Side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card Paket Pro */}
          <div
            onClick={() => setSelectedPlan("pro")}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedPlan === "pro"
                ? "border-blue-600 bg-blue-50/30 shadow-xs ring-2 ring-blue-600/20"
                : "border-zinc-200 hover:border-zinc-300 bg-white"
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
                  Rp {proMonthly.toLocaleString("id-ID")}{" "}
                  <span className="text-xs font-normal text-zinc-500">/ bulan</span>
                </div>
                {hasReferral && (
                  <div className="text-[11px] text-emerald-600 font-semibold">
                    Diskon kode {summary.referralCodeUsed} aktif
                  </div>
                )}
                <p className="text-[11px] text-zinc-500 mt-1">
                  Ideal untuk outlet mandiri dengan 1 kasir & pembukuan kas otomatis.
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
                  <span>Laporan Keuangan & Buku Kas</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>1 Gerai Cabang Toko</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-2 border-t border-zinc-200/60 text-[11px] text-blue-700 font-semibold text-center">
              {selectedPlan === "pro" ? "✓ Paket Aktif Terpilih" : "Pilih Paket Pro"}
            </div>
          </div>

          {/* Card Paket Premium (Rp 100.000) - COMING SOON */}
          <div
            onClick={() => {
              toast.info(
                "Paket Premium Segera Hadir! 👑",
                "Fitur Paket Premium (multi-cabang, manajemen staf, dll.) sedang dalam tahap finalisasi dan akan segera dirilis."
              );
            }}
            className="p-4 rounded-2xl border-2 border-dashed border-amber-200 hover:border-amber-300 bg-amber-50/20 transition-all cursor-pointer relative flex flex-col justify-between group shadow-2xs"
            title="Paket Premium sedang dalam pengembangan (Coming Soon)"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                  Paket Premium
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                  <Crown className="w-3 h-3 text-amber-600" />
                  Coming Soon
                </span>
              </div>

              <div className="mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative inline-flex items-center select-none py-0.5">
                    <span className="text-xl font-black text-zinc-900 tracking-tight filter blur-[4px] select-none opacity-60">
                      Rp 100.000
                    </span>
                    <span className="text-xs font-normal text-zinc-500 ml-1 filter blur-[3px] select-none opacity-60">
                      / bulan
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full shadow-2xs">
                    Segera Diumumkan
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Solusi multi-cabang, thermal printer kasir Bluetooth, dan kelola banyak kasir.
                </p>
              </div>

              <ul className="space-y-1.5 text-xs text-zinc-600 border-t border-zinc-200/60 pt-3">
                <li className="flex items-center gap-2 font-semibold text-zinc-900">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Semua fitur Paket Pro</span>
                </li>
                <li className="flex items-center gap-2">
                  <Printer className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Koneksi Thermal Printer POS (Bluetooth/USB)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Multi-Cabang (Hingga 5 Gerai)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Manajemen Multi-Karyawan & Hak Akses Kasir</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-2.5 border-t border-amber-200/80">
              <div className="text-[11px] text-amber-800 font-semibold text-center flex items-center justify-center gap-1.5 bg-amber-100/70 hover:bg-amber-100 py-1.5 px-2 rounded-xl border border-amber-300/80 transition-colors">
                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Segera Hadir di Pembaruan Mendatang</span>
              </div>
            </div>
          </div>
        </div>

        {/* Durasi & Rincian Total Bayar */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-zinc-800 block">Pilih Durasi Pembayaran:</span>
            <div className="flex gap-2">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDurationMonths(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    durationMonths === m
                      ? "bg-zinc-900 text-white shadow-xs"
                      : "bg-white text-zinc-700 hover:bg-zinc-100 border border-zinc-200"
                  }`}
                >
                  {m} Bulan
                </button>
              ))}
            </div>
          </div>

          <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200">
            <span className="text-xs text-zinc-500 block">Total Tagihan:</span>
            <span className="text-xl font-black text-zinc-900 font-mono">
              Rp {totalAmount.toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] text-zinc-500 block">
              {durationMonths} bulan × Rp {effectiveRate.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </div>

      {/* Petunjuk Pembayaran QRIS Statis Resmi */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between gap-2.5 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-2xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-zinc-900 text-sm">Metode Pembayaran Resmi SaaS Cleanique (QRIS Statis)</h4>
              <p className="text-[11px] text-zinc-500">Seluruh pembayaran langganan resmi dilakukan melalui scan QRIS statis di bawah ini</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-2xs">
            GoPay Merchant / QRIS GPN
          </span>
        </div>

        {/* QRIS Container Full Width */}
        <div className="p-5 sm:p-6 rounded-xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 border-2 border-emerald-500/30 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                QRIS Statis Resmi Laundry Cleanique
              </span>
            </div>
            <span className="text-xs text-zinc-500 font-medium">
              Bebas Biaya Admin • Instan
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6 pt-1">
            <div
              onClick={() => setIsQrisModalOpen(true)}
              className="relative group shrink-0 cursor-pointer"
              title="Klik untuk membuka modal QRIS layar penuh"
            >
              <div className="p-3 bg-white rounded-2xl border border-emerald-200/90 shadow-md group-hover:border-emerald-500 transition-colors">
                <img
                  src="/qris.png"
                  alt="QRIS Laundry Cleanique"
                  className="w-44 h-44 object-contain rounded-xl"
                />
              </div>
              <div className="absolute inset-0 bg-emerald-900/60 backdrop-blur-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 text-center p-2">
                <QrCode className="w-5 h-5 text-emerald-300" />
                <span>Buka Modal QRIS</span>
                <span className="text-[10px] text-emerald-200 font-normal">Klik untuk perbesar</span>
              </div>
            </div>

            <div className="space-y-3 text-center md:text-left flex-1 min-w-0">
              <div>
                <div className="text-[11px] text-emerald-800 font-semibold uppercase tracking-wider">Merchant Name</div>
                <div className="text-lg font-black text-zinc-900">LAUNDRY CLEANIQUE</div>
              </div>
              <div>
                <div className="text-[11px] text-zinc-500 font-semibold">NMID (National Merchant ID)</div>
                <div className="text-xs font-mono font-bold text-zinc-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg inline-block border border-emerald-200/60">
                  ID1026618371243
                </div>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed max-w-xl">
                Dapat discan dari seluruh aplikasi mobile banking (<strong>BCA, Mandiri, BRI, BNI, BSI, CIMB</strong>, dll) dan e-wallet (<strong>GoPay, OVO, Dana, ShopeePay, LinkAja</strong>) di Indonesia.
              </p>

              <div className="pt-1 flex flex-wrap gap-2.5 justify-center md:justify-start">
                <button
                  type="button"
                  onClick={handleDownloadQris}
                  disabled={downloadingQris}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-70"
                >
                  {downloadingQris ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunduh...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Gambar QRIS</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsQrisModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold border border-zinc-200 transition cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Buka Modal QRIS (Layar Penuh)</span>
                </button>
              </div>

              <div className="text-[11px] text-zinc-500 bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                Setelah transaksi berhasil, simpan tangkapan layar bukti transfer untuk diunggah pada tabel invoice langganan agar akun Anda langsung diverifikasi otomatis.
              </div>
            </div>
          </div>
        </div>
      </div>

      <QrisPreviewModal
        isOpen={isQrisModalOpen}
        onClose={() => setIsQrisModalOpen(false)}
        qrisUrl="/qris.png"
        merchantName="LAUNDRY CLEANIQUE"
        nmid="ID1026618371243"
        downloadFileName="QRIS-Laundry-Cleanique.png"
      />
    </div>
  );
};
