import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Upload,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Gift,
  RefreshCw,
  Tag,
  Edit2,
  Trash2,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { api } from "../../../utils/api";
import { SubscriptionSummary, SubscriptionInvoice } from "../../../types";
import { useToast } from "../../common/ToastContext";
import { useConfirm } from "../../common/ConfirmContext";
import { RenewSubscriptionModal } from "./RenewSubscriptionModal";
import { UploadPaymentProofModal } from "./UploadPaymentProofModal";

interface SubscriptionTabProps {
  tenantId?: string;
}

export const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ tenantId }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoice | null>(null);

  // Referral code management state
  const [isEditingReferral, setIsEditingReferral] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [applyingReferral, setApplyingReferral] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const summaryUrl = tenantId ? `/api/subscription/summary?tenantId=${tenantId}` : "/api/subscription/summary";
      const [sumRes, invRes] = await Promise.all([
        api.get<{ success: boolean; data: SubscriptionSummary }>(summaryUrl),
        api.get<{ success: boolean; data: SubscriptionInvoice[] }>("/api/subscription/invoices"),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (invRes.success && invRes.data) {
        setInvoices(invRes.data);
      }
    } catch (err) {
      console.error("Gagal memuat data langganan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId]);

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
      const res = await api.post<{ success: boolean; message?: string }>("/api/subscription/apply-referral", {
        tenantId: summary?.tenantId || tenantId,
        referralCode: cleanCode,
      });

      if (res.success) {
        toast.success(
          "Kode Referral Berhasil Diterapkan!",
          res.message || "Tarif perpanjangan outlet kini hemat menjadi Rp 55.000/bulan."
        );
        setIsEditingReferral(false);
        setReferralInput("");
        await fetchData();
      } else {
        setReferralError(res.message || "Kode referral tidak valid atau sudah kedaluwarsa.");
        toast.error("Gagal Menerapkan", res.message || "Kode referral tidak valid.");
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
          outlet akan kembali ke tarif normal <strong>Rp 60.000 / bulan</strong>.
        </span>
      ),
      confirmText: "Ya, Copot Kode",
      cancelText: "Batal",
      variant: "warning",
    });

    if (!ok) return;

    try {
      const res = await api.post<{ success: boolean; message?: string }>("/api/subscription/remove-referral", {
        tenantId: summary.tenantId || tenantId,
      });

      if (res.success) {
        toast.info("Kode Referral Dicopot", res.message || "Tarif outlet kini kembali ke standar Rp 60.000/bulan.");
        setIsEditingReferral(false);
        await fetchData();
      } else {
        toast.error("Gagal Mencopot", res.message || "Terjadi kesalahan.");
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message);
    }
  };

  const handleOpenUpload = (invoice: SubscriptionInvoice) => {
    setSelectedInvoice(invoice);
    setIsUploadModalOpen(true);
  };

  const getStatusBadge = (status: SubscriptionInvoice["status"]) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Lunas / Aktif
          </span>
        );
      case "pending_verification":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full">
            <Clock className="w-3 h-3 animate-spin" /> Menunggu Verifikasi
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-rose-50 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-full">
            <AlertCircle className="w-3 h-3" /> Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-full">
            Belum Dibayar
          </span>
        );
    }
  };

  if (loading && !summary) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
        <span>Memuat data langganan...</span>
      </div>
    );
  }

  const isExpired = summary ? summary.daysRemaining <= 0 : false;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span>Langganan & Masa Aktif</span>
            {summary?.isTrial && (
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm">
                <Gift className="w-3.5 h-3.5" /> Trial Aktif
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pantau status masa aktif aplikasi kasir dan kelola perpanjangan tagihan outlet Anda.
          </p>
        </div>

        <button
          onClick={() => setIsRenewModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 hover:opacity-95 active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Perpanjang Langganan</span>
        </button>
      </div>

      {/* 3 Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Status */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Status Akun
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isExpired
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600"
                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600"
              }`}
            >
              {isExpired ? <AlertCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {isExpired
                ? "Kedaluwarsa"
                : summary?.isTrial
                ? "Masa Uji Coba Gratis"
                : "Langganan Aktif"}
            </h3>
            <span className="text-xs text-slate-500 block mt-0.5">
              {isExpired
                ? "Segera perpanjang agar kasir tetap aktif"
                : "Seluruh fitur sistem beroperasi normal"}
            </span>
          </div>
        </div>

        {/* Card 2: Sisa Hari */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Sisa Masa Aktif
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3
              className={`text-xl font-extrabold ${
                isExpired
                  ? "text-rose-600"
                  : summary && summary.daysRemaining <= 3
                  ? "text-amber-600"
                  : "text-indigo-600 dark:text-indigo-400"
              }`}
            >
              {summary ? (isExpired ? "Habis" : `${summary.daysRemaining} Hari Lagi`) : "-"}
            </h3>
            <span className="text-xs text-slate-500 block mt-0.5">
              Berlaku hingga: {summary?.subscriptionUntil || "-"}
            </span>
          </div>
        </div>

        {/* Card 3: Kode Referral Asal */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Diskon & Kode Promo
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                {summary?.referralCodeUsed ? summary.referralCodeUsed : "Standar"}
              </h3>
              {!isEditingReferral && (
                summary?.referralCodeUsed ? (
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setReferralInput(summary.referralCodeUsed || "");
                        setReferralError(null);
                        setIsEditingReferral(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                    >
                      Ganti
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={handleRemoveReferral}
                      className="text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      Copot
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setReferralInput("");
                      setReferralError(null);
                      setIsEditingReferral(true);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                  >
                    + Terapkan
                  </button>
                )
              )}
            </div>
            <span className="text-xs text-slate-500 block mt-0.5">
              {summary?.referralCodeUsed
                ? "Diskon perpanjangan aktif (Rp 55.000/bln)"
                : "Tarif standar Rp 60.000/bln (hemat dengan referral)"}
            </span>
          </div>

          {/* Form inline bila edit aktif */}
          {isEditingReferral && (
            <form onSubmit={handleApplyReferral} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={referralInput}
                  onChange={(e) => {
                    setReferralInput(e.target.value.toUpperCase());
                    if (referralError) setReferralError(null);
                  }}
                  placeholder="Kode referral..."
                  className="flex-1 px-3 py-1.5 text-xs font-mono font-bold uppercase border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  autoFocus
                  disabled={applyingReferral}
                />
                <button
                  type="submit"
                  disabled={applyingReferral || !referralInput.trim()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer flex items-center gap-1"
                >
                  {applyingReferral ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  <span>Simpan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingReferral(false)}
                  disabled={applyingReferral}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {referralError && (
                <div className="text-[11px] text-rose-600 font-medium">{referralError}</div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Informasi Rekening Pembayaran Platform */}
      {summary?.platformBank && summary.platformBank.bankName && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Rekening Pembayaran Resmi Platform
              </span>
              <h3 className="text-lg font-bold mt-1">
                Transfer ke {summary.platformBank.bankName}
              </h3>
              <div className="flex items-center gap-3 mt-3">
                <div className="text-2xl font-mono font-black tracking-wider text-emerald-400 bg-white/10 px-3 py-1 rounded-xl">
                  {summary.platformBank.bankAccountNumber}
                </div>
                <span className="text-xs text-slate-300">
                  a.n. <strong>{summary.platformBank.bankAccountName}</strong>
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-400 max-w-xs leading-relaxed">
              Setelah transfer, unggah foto bukti pembayaran pada daftar tagihan di bawah agar otomatis diverifikasi oleh sistem.
            </div>
          </div>
        </div>
      )}

      {/* Tabel Riwayat Invoice */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Riwayat Tagihan & Invoice Langganan
            </h3>
            <span className="text-xs text-slate-500">
              Daftar seluruh transaksi perpanjangan masa aktif outlet
            </span>
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Muat Ulang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">No. Invoice</th>
                <th className="py-3.5 px-4 font-semibold">Tanggal</th>
                <th className="py-3.5 px-4 font-semibold">Durasi</th>
                <th className="py-3.5 px-4 font-semibold">Total Biaya</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Belum ada riwayat tagihan langganan.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                      #{inv.invoiceNo}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {inv.durationMonths} Bulan
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                      Rp {inv.finalAmount.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      {inv.status === "unpaid" || inv.status === "rejected" ? (
                        <button
                          onClick={() => handleOpenUpload(inv)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold transition-all inline-flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Unggah Bukti</span>
                        </button>
                      ) : inv.status === "pending_verification" ? (
                        <span className="text-slate-400 italic">Sedang Ditinjau</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">Terverifikasi</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <RenewSubscriptionModal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        onSuccess={fetchData}
        tenantId={tenantId || summary?.tenantId || ""}
      />

      <UploadPaymentProofModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        invoice={selectedInvoice}
        onSuccess={fetchData}
      />
    </div>
  );
};
