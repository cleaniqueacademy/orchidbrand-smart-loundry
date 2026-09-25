import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  MessageCircle,
  Building,
  CreditCard,
  Sparkles,
  QrCode,
  Tag,
  Loader2,
  X,
  Trash2,
  Edit2,
  Check,
} from "lucide-react";
import { authHeaders } from "../../utils/api";
import { useToast } from "../common/ToastContext";
import { useConfirm } from "../common/ConfirmContext";

interface SubscriptionSummaryData {
  tenantId: string;
  outletName: string;
  isTrial: boolean;
  isActive: boolean;
  subscriptionUntil: string | null;
  daysRemaining: number;
  status: string;
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
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export const SubscriptionStatusCard: React.FC<SubscriptionStatusCardProps> = ({ tenantId }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [summary, setSummary] = useState<SubscriptionSummaryData | null>(null);
  const [settings, setSettings] = useState<PlatformPublicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          json.message || `Tarif perpanjangan outlet kini hemat menjadi Rp 55.000/bulan.`
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
  const monthlyRate = hasReferral ? 55000 : 60000;

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

  const waMessage = encodeURIComponent(
    `Halo Admin Laundry Cleanique,\nSaya pemilik outlet *${summary.outletName}* (ID: ${summary.tenantId}).\nSaya ingin memperpanjang masa aktif outlet saya.\n` +
      `Status Referral: ${hasReferral ? `Menggunakan kode *${summary.referralCodeUsed}* (Tarif: Rp 55.000/bln)` : "Tanpa Referral (Tarif: Rp 60.000/bln)"}.\n` +
      `Berikut saya lampirkan bukti transfer pembayaran perpanjangan saya. Mohon dibantu perpanjangan masa aktifnya. Terima kasih!`
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
            <div className="inline-flex items-center gap-1.5 text-xs font-bold mb-1.5">
              {isExpired ? (
                <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" /> {statusText}
                </span>
              ) : isExpiringSoon ? (
                <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  <AlertTriangle className="w-3.5 h-3.5" /> Segera Berakhir
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {statusText}
                </span>
              )}
              {summary.isTrial && (
                <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  TRIAL 7 HARI
                </span>
              )}
            </div>
            <h3 className="text-lg font-extrabold text-zinc-900">{summary.outletName}</h3>
            <p className="text-xs text-zinc-500">ID Outlet: <span className="font-mono">{summary.tenantId}</span></p>
          </div>

          {/* Tombol Hubungi Admin via WhatsApp */}
          <a
            href={`https://wa.me/${cleanPhone}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer text-center"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Kirim Bukti & Perpanjang via WA Admin</span>
          </a>
        </div>

        {/* 3 Metrik Utama */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5">
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">Masa Aktif Hingga</span>
            <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span>{formatDate(summary.subscriptionUntil)}</span>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5">
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">Sisa Waktu</span>
            <div className="flex items-center gap-2 font-bold text-sm">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className={isExpired ? "text-rose-600" : isExpiringSoon ? "text-amber-600" : "text-emerald-700"}>
                {isExpired ? "Sudah Berakhir" : `${summary.daysRemaining} Hari Lagi`}
              </span>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3.5">
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">Tarif Perpanjangan Anda</span>
            <div className="flex items-center gap-2 font-bold text-sm text-indigo-600">
              <CreditCard className="w-4 h-4" />
              <span>Rp {monthlyRate.toLocaleString("id-ID")} / bulan</span>
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
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          Diskon Rp 5.000/bln Aktif
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-zinc-500 font-medium">
                        Tidak ada kode referral (Tarif Standar Rp 60.000/bln)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                    {hasReferral
                      ? "Kode referral terverifikasi. Outlet Anda menikmati tarif hemat Rp 55.000/bulan."
                      : "Punya kode referral dari Admin Marketing Cleanique? Terapkan sekarang untuk mendapatkan tarif hemat Rp 55.000/bulan."}
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
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/25 transition cursor-pointer active:scale-95"
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
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
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
                    placeholder="Contoh: CLEANHEMAT / BUDI10"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold tracking-wider uppercase border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white shadow-2xs"
                    autoFocus
                    disabled={applyingReferral}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={applyingReferral || !referralInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 active:scale-95"
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

      {/* Petunjuk Pembayaran Transfer / QRIS */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 shadow-2xs">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-zinc-900 text-sm">Rekening Pembayaran Resmi Admin Pusat</h4>
            <p className="text-[11px] text-zinc-500">Kirim pembayaran perpanjangan ke salah satu rekening resmi di bawah</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rekening Bank */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100/60 border border-zinc-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Transfer Bank {settings?.bankName || "BCA"}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Bank Resmi</span>
            </div>
            <div className="text-lg font-mono font-extrabold text-zinc-900 tracking-wider">
              {settings?.bankAccountNumber || "8295-0192-8812"}
            </div>
            <div className="text-xs text-zinc-600 font-medium">
              a.n. {settings?.bankAccountName || "Cleanique Laundry Indonesia"}
            </div>
          </div>

          {/* QRIS / Catatan */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100/60 border border-zinc-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Metode QRIS & Konfirmasi
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Semua E-Wallet</span>
            </div>
            <div className="text-xs text-zinc-600 leading-relaxed">
              Tersedia transfer via BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, dan QRIS.
            </div>
            <div className="text-[11px] text-zinc-500">
              Admin akan langsung memperpanjang masa aktif outlet Anda begitu bukti transfer diterima.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
