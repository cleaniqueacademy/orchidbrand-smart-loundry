import React, { useState, useEffect } from "react";
import {
  Clock,
  AlertCircle,
  CreditCard,
  Building2,
  Smartphone,
  Wallet,
  Upload,
  ShieldCheck,
  Gift,
  RefreshCw,
  Tag,
  Edit2,
  X,
  Loader2,
  Check,
  CheckCircle2,
  Copy,
  QrCode,
  Download,
  ExternalLink,
  Zap,
  ArrowRight,
} from "lucide-react";
import WhatsAppIcon from "../../common/WhatsAppIcon";
import { api } from "../../../utils/api";
import { SubscriptionSummary, SubscriptionInvoice } from "../../../types";
import { useToast } from "../../common/ToastContext";
import { useConfirm } from "../../common/ConfirmContext";
import { RenewSubscriptionModal } from "./RenewSubscriptionModal";
import { UploadPaymentProofModal } from "./UploadPaymentProofModal";
import { QrisPreviewModal } from "../../modals/QrisPreviewModal";

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
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);
  const [downloadingQris, setDownloadingQris] = useState(false);

  const [activePaymentMethod, setActivePaymentMethod] = useState<"qris" | "bank" | "ewallet">("qris");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Tersalin", `${label} berhasil disalin ke clipboard.`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const handleDownloadQris = async () => {
    setDownloadingQris(true);
    const targetQrisUrl = summary?.platformBank?.qrisInfo || "/qris.png";
    try {
      const response = await fetch(targetQrisUrl);
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
      link.href = targetQrisUrl;
      link.download = "QRIS-Laundry-Cleanique.png";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Gambar QRIS dibuka untuk diunduh.");
    } finally {
      setTimeout(() => setDownloadingQris(false), 400);
    }
  };

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
          <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            Lunas &amp; Aktif
          </span>
        );
      case "pending_verification":
        return (
          <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
            Menunggu Verifikasi
          </span>
        );
      case "rejected":
        return (
          <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full">
            Pembayaran Ditolak
          </span>
        );
      default:
        return (
          <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-full">
            Belum Dibayar
          </span>
        );
    }
  };

  if (loading && !summary) {
    return (
      <div className="p-8 text-center text-xs text-zinc-400">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
        <span>Memuat data langganan...</span>
      </div>
    );
  }

  const isExpired = summary ? summary.daysRemaining <= 0 : false;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Langganan &amp; Masa Aktif</span>
            {summary?.isTrial && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Gift className="w-3 h-3 text-emerald-600" /> Trial Aktif
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Pantau status masa aktif aplikasi kasir dan kelola perpanjangan tagihan outlet Anda.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRenewModalOpen(true)}
          className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Perpanjang Langganan</span>
        </button>
      </div>

      {/* 2. 3 Overview Cards (Sesuai Design System Orders & Cashflow) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Status Akun */}
        <div
          className={`p-3.5 sm:p-5 rounded-2xl border shadow-sm relative overflow-hidden group transition ${
            isExpired
              ? "bg-gradient-to-br from-rose-50/90 via-pink-50/40 to-white border-rose-200/90 hover:border-rose-300"
              : "bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-white border-blue-200/90 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={isExpired ? "text-rose-800" : "text-blue-800"}>
              Status Akun
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs text-white shrink-0 ${
                isExpired ? "bg-rose-500" : "bg-blue-600"
              }`}
            >
              {isExpired ? <AlertCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {isExpired
              ? "Kedaluwarsa"
              : summary?.isTrial
              ? "Trial 7 Hari"
              : "Langganan Aktif"}
          </div>
          <p className={`text-[11px] font-medium mt-1 truncate ${isExpired ? "text-rose-700/90" : "text-blue-700/90"}`}>
            {isExpired
              ? "Segera perpanjang agar kasir tetap aktif"
              : "Seluruh fitur sistem beroperasi normal"}
          </p>
        </div>

        {/* Card 2: Sisa Masa Aktif */}
        <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-3.5 sm:p-5 rounded-2xl border border-amber-200/90 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>Sisa Masa Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold mt-2.5 tracking-tight ${
              isExpired
                ? "text-rose-600"
                : summary && summary.daysRemaining <= 3
                ? "text-amber-600"
                : "text-zinc-900"
            }`}
          >
            {summary ? (isExpired ? "Habis" : `${summary.daysRemaining} Hari Lagi`) : "-"}
          </div>
          <p className="text-[11px] text-amber-700/90 font-medium mt-1 truncate">
            Berlaku hingga: {summary?.subscriptionUntil || "-"}
          </p>
        </div>

        {/* Card 3: Diskon & Kode Promo */}
        <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-3.5 sm:p-5 rounded-2xl border border-indigo-200/90 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-800">
            <span>Diskon &amp; Kode Promo</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight font-mono">
              {summary?.referralCodeUsed ? summary.referralCodeUsed : "Standar"}
            </span>
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
                    className="text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                  >
                    Ganti
                  </button>
                  <span className="text-zinc-300">·</span>
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
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>+ Terapkan</span>
                </button>
              )
            )}
          </div>
          <p className="text-[11px] text-indigo-700/90 font-medium mt-1 truncate">
            {summary?.referralCodeUsed
              ? "Diskon perpanjangan aktif (Rp 55.000/bln)"
              : "Tarif standar Rp 60.000/bln"}
          </p>

          {/* Form inline bila edit aktif */}
          {isEditingReferral && (
            <form onSubmit={handleApplyReferral} className="pt-2 mt-2 border-t border-indigo-100 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={referralInput}
                  onChange={(e) => {
                    setReferralInput(e.target.value.toUpperCase());
                    if (referralError) setReferralError(null);
                  }}
                  placeholder="Kode referral..."
                  className="flex-1 px-2.5 py-1 text-xs font-mono font-bold uppercase border border-zinc-200 rounded-xl bg-white focus:outline-none focus:border-zinc-900"
                  autoFocus
                  disabled={applyingReferral}
                />
                <button
                  type="submit"
                  disabled={applyingReferral || !referralInput.trim()}
                  className="px-3 py-1 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer flex items-center gap-1"
                >
                  {applyingReferral ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  <span>Simpan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingReferral(false)}
                  disabled={applyingReferral}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {referralError && (
                <div className="text-[11px] text-rose-600 font-medium">{referralError}</div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* 3. Metode Pembayaran Resmi Platform (QRIS, Transfer Bank, E-Wallet) */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-5">
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  Metode Pembayaran Resmi Platform
                </span>
                <span className="text-xs text-zinc-400">• Bebas Biaya Admin &amp; Instan</span>
              </div>
              <h3 className="font-bold text-zinc-900 text-sm mt-0.5">
                Pilihan Pembayaran Langganan Outlet
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              QRIS GPN
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
              Transfer Bank
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
              E-Wallet
            </span>
          </div>
        </div>

        {/* Pending Invoice Notification Banner (Jika Ada Tagihan Belum Dibayar) */}
        {(() => {
          const unpaidInvoice = summary?.pendingInvoice || invoices.find((inv) => inv.status === "unpaid");
          if (!unpaidInvoice) return null;
          return (
            <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-blue-800 font-bold flex items-center gap-2 flex-wrap">
                    <span>Tagihan Menunggu Pembayaran:</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-900">
                      #{unpaidInvoice.invoiceNo}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-normal">
                      ({unpaidInvoice.durationMonths} Bulan Paket {unpaidInvoice.planName || "Pro"})
                    </span>
                  </div>
                  <div className="text-sm font-extrabold text-zinc-900 mt-1 flex items-center gap-2 flex-wrap">
                    <span className="text-zinc-600 text-xs font-medium">Total Transfer:</span>
                    <span className="text-blue-700 font-mono text-base font-black">
                      Rp {unpaidInvoice.finalAmount.toLocaleString("id-ID")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(unpaidInvoice.finalAmount), "unpaid-amount", "Nominal tagihan")}
                      className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-white hover:bg-blue-100/70 border border-blue-200 rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Salin nominal transfer tepat"
                    >
                      {copiedKey === "unpaid-amount" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Nominal Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin Nominal</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedInvoice(unpaidInvoice);
                  setIsUploadModalOpen(true);
                }}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Upload className="w-4 h-4" />
                <span>Unggah Bukti Bayar</span>
              </button>
            </div>
          );
        })()}

        {/* Tab Channel Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Opsi 1: QRIS GPN */}
          <button
            type="button"
            onClick={() => setActivePaymentMethod("qris")}
            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left flex items-start gap-3 ${
              activePaymentMethod === "qris"
                ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50 text-zinc-700"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                activePaymentMethod === "qris"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-zinc-100 text-zinc-600 border border-zinc-200"
              }`}
            >
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${activePaymentMethod === "qris" ? "text-emerald-950" : "text-zinc-900"}`}>
                  QRIS Statis GPN
                </span>
                {activePaymentMethod === "qris" && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                Scan cepat dari semua bank &amp; e-wallet
              </p>
            </div>
          </button>

          {/* Opsi 2: Transfer Bank */}
          <button
            type="button"
            onClick={() => setActivePaymentMethod("bank")}
            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left flex items-start gap-3 ${
              activePaymentMethod === "bank"
                ? "border-blue-600 bg-blue-50/50 shadow-xs"
                : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50 text-zinc-700"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                activePaymentMethod === "bank"
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-zinc-100 text-zinc-600 border border-zinc-200"
              }`}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${activePaymentMethod === "bank" ? "text-blue-950" : "text-zinc-900"}`}>
                  Transfer Bank
                </span>
                {activePaymentMethod === "bank" && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                {summary?.platformBank?.bankName || "BCA (Bank Central Asia)"}
              </p>
            </div>
          </button>

          {/* Opsi 3: E-Wallet */}
          <button
            type="button"
            onClick={() => setActivePaymentMethod("ewallet")}
            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left flex items-start gap-3 ${
              activePaymentMethod === "ewallet"
                ? "border-purple-600 bg-purple-50/50 shadow-xs"
                : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50 text-zinc-700"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                activePaymentMethod === "ewallet"
                  ? "bg-purple-600 text-white shadow-2xs"
                  : "bg-zinc-100 text-zinc-600 border border-zinc-200"
              }`}
            >
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${activePaymentMethod === "ewallet" ? "text-purple-950" : "text-zinc-900"}`}>
                  E-Wallet Resmi
                </span>
                {activePaymentMethod === "ewallet" && <Check className="w-3.5 h-3.5 text-purple-600 stroke-[3]" />}
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                {summary?.platformBank?.ewalletName || "DANA / GoPay / OVO"}
              </p>
            </div>
          </button>
        </div>

        {/* Content Box Berdasarkan Pilihan Pembayaran */}
        <div className="pt-1">
          {/* 1. KONTEN QRIS */}
          {activePaymentMethod === "qris" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/60 border border-zinc-200 flex flex-col md:flex-row items-center gap-6">
              <div
                onClick={() => setIsQrisModalOpen(true)}
                className="relative group shrink-0 cursor-pointer"
                title="Klik untuk membuka modal QRIS layar penuh"
              >
                <div className="p-3 bg-white rounded-2xl border border-emerald-200 shadow-sm group-hover:border-emerald-500 transition-colors">
                  <img
                    src={summary?.platformBank?.qrisInfo || "/qris.png"}
                    alt="QRIS Pembayaran Laundry Cleanique"
                    className="w-40 h-40 object-contain rounded-xl"
                  />
                </div>
                <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 text-center p-2">
                  <QrCode className="w-5 h-5 text-emerald-300" />
                  <span>Buka Modal QRIS</span>
                  <span className="text-[10px] text-emerald-200 font-normal">Klik untuk perbesar</span>
                </div>
              </div>

              <div className="space-y-3 flex-1 min-w-0 text-center md:text-left">
                <div>
                  <div className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider">Merchant Name</div>
                  <div className="text-base font-black text-zinc-900">LAUNDRY CLEANIQUE</div>
                  <div className="text-xs font-mono font-bold text-zinc-700 mt-0.5 flex items-center justify-center md:justify-start gap-1.5">
                    <span>NMID:</span>
                    <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200/60 font-mono">
                      ID1026618371243
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy("ID1026618371243", "nmid", "NMID")}
                      className="p-1 hover:bg-zinc-200/60 rounded text-zinc-500 hover:text-zinc-800 transition"
                      title="Salin NMID"
                    >
                      {copiedKey === "nmid" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 leading-relaxed max-w-xl">
                  Gunakan kamera ponsel, aplikasi e-wallet (<strong>GoPay, OVO, Dana, ShopeePay</strong>), atau seluruh aplikasi mobile banking (<strong>BCA, Mandiri, BRI, BNI, BSI, CIMB Niaga</strong>, dll) untuk memindai kode QRIS statis resmi di samping.
                </p>

                <div className="flex flex-wrap gap-2.5 justify-center md:justify-start pt-1">
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
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-bold border border-zinc-200 transition cursor-pointer shadow-2xs"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Buka Layar Penuh</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. KONTEN TRANSFER BANK */}
          {activePaymentMethod === "bank" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Virtual Bank Card */}
              <div className="rounded-2xl p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-md flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block">Bank Tujuan</span>
                      <span className="text-sm font-extrabold text-white">
                        {summary?.platformBank?.bankName || "BCA (Bank Central Asia)"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-semibold">
                    Rekening Resmi
                  </span>
                </div>

                <div className="space-y-1.5 my-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Nomor Rekening</span>
                  <div className="flex items-center justify-between gap-2 bg-black/30 p-2.5 rounded-xl border border-white/10">
                    <span className="font-mono text-lg sm:text-xl font-black tracking-widest text-white selection:bg-blue-500">
                      {summary?.platformBank?.bankAccountNumber || "8830-1928-3341"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          summary?.platformBank?.bankAccountNumber || "8830-1928-3341",
                          "bank-account",
                          "Nomor rekening bank"
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                    >
                      {copiedKey === "bank-account" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300 stroke-[3]" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin No. Rek</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Atas Nama Pemilik:</span>
                    <span className="font-bold text-slate-200">
                      {summary?.platformBank?.bankAccountName || "PT CLEANIQUE SISTEM DIGITAL"}
                    </span>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              {/* Petunjuk Transfer Bank */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 border border-zinc-200 flex flex-col justify-between space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-zinc-900 text-xs sm:text-sm flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Petunjuk Transfer Bank</span>
                  </h4>
                  <ul className="space-y-2 text-zinc-600 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Buka Mobile Banking (m-BCA, Livin', BRImo, BNI) atau mesin ATM bank Anda.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Pilih menu Transfer Antar Bank / Sesama Bank ke nomor rekening di samping.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Masukkan nominal tepat sesuai invoice tagihan Anda.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                      <span>Simpan bukti transfer, lalu klik tombol <strong>"Unggah Bukti"</strong> di tabel riwayat bawah.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-[11px] text-blue-800 flex items-center justify-between">
                  <span>Mendukung BI-Fast (Rp 2.500) &amp; Realtime Online</span>
                  <span className="font-bold text-blue-900">Bebas Gangguan</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. KONTEN E-WALLET */}
          {activePaymentMethod === "ewallet" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Virtual E-Wallet Card */}
              <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 text-white border border-emerald-900/60 shadow-md flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">Penyedia E-Wallet</span>
                      <span className="text-sm font-extrabold text-white">
                        {summary?.platformBank?.ewalletName || "DANA / GoPay / OVO"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
                    Akun Resmi
                  </span>
                </div>

                <div className="space-y-1.5 my-2">
                  <span className="text-[10px] text-emerald-300/80 uppercase tracking-wider font-semibold block">Nomor Akun / Handphone</span>
                  <div className="flex items-center justify-between gap-2 bg-black/30 p-2.5 rounded-xl border border-white/10">
                    <span className="font-mono text-lg sm:text-xl font-black tracking-widest text-white selection:bg-emerald-500">
                      {summary?.platformBank?.ewalletNumber || "0812-2340-6368"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          summary?.platformBank?.ewalletNumber || "0812-2340-6368",
                          "ewallet-number",
                          "Nomor e-wallet"
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                    >
                      {copiedKey === "ewallet-number" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-200 stroke-[3]" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin No. HP</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-emerald-300/80 block font-medium">Atas Nama Pemilik Akun:</span>
                    <span className="font-bold text-emerald-100">
                      {summary?.platformBank?.ewalletAccountName || "PT CLEANIQUE SISTEM DIGITAL"}
                    </span>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              {/* Petunjuk E-Wallet */}
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 border border-zinc-200 flex flex-col justify-between space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-zinc-900 text-xs sm:text-sm flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Petunjuk Transfer E-Wallet</span>
                  </h4>
                  <ul className="space-y-2 text-zinc-600 text-xs">
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span>Buka aplikasi DANA, GoPay, OVO, atau ShopeePay Anda.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span>Pilih menu <strong>Kirim Saldo / Transfer ke Teman</strong> ke nomor e-wallet di samping.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span>Pastikan nama penerima cocok (<strong>PT CLEANIQUE SISTEM DIGITAL</strong>).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
                      <span>Simpan tangkapan layar (screenshot) bukti berhasil lalu klik <strong>"Unggah Bukti"</strong> di bawah.</span>
                    </li>
                  </ul>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-800 flex items-center justify-between">
                  <span>Instan Tanpa Batas Waktu Operasional</span>
                  <span className="font-bold text-emerald-900">24 Jam Realtime</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-[11px] text-zinc-500 bg-zinc-50 p-3 rounded-xl border border-zinc-100 flex items-center gap-2">
          <span className="text-base shrink-0">💡</span>
          <span>
            <strong>Langkah Selanjutnya:</strong> Setelah transfer berhasil melalui salah satu metode di atas, simpan foto struk atau screenshot pembayaran Anda, lalu klik tombol <strong>"Unggah Bukti"</strong> pada baris tagihan invoice Anda di tabel bawah agar tagihan segera diverifikasi.
          </span>
        </div>
      </div>

      {/* 4. Tabel Riwayat Invoice (Identik dengan Sistem ShadcnDataTable / ReportLedgerTable) */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-sm space-y-4">
        {/* Booster Banner for Pending Invoices */}
        {invoices.some((i) => i.status === "pending_verification") && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-zinc-900 text-xs sm:text-sm">
                    Pengajuan Perpanjangan Sedang Ditinjau Admin
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Menunggu Approval
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Ingin masa aktif langsung aktif sekarang tanpa menunggu? Klik tombol Booster untuk verifikasi kilat via WhatsApp Admin.
                </p>
              </div>
            </div>
            {(() => {
              const pendingInv = invoices.find((i) => i.status === "pending_verification");
              return (
                <a
                  href={`https://wa.me/6281223406368?text=${encodeURIComponent(
                    `Halo Admin Cleanique, saya dari outlet *${summary?.outletName || "Cabang"}* ingin konfirmasi pengajuan perpanjangan langganan (Invoice *#${pendingInv?.invoiceNo || "-"}*, Total *Rp ${(pendingInv?.finalAmount || 0).toLocaleString("id-ID")}*). Bukti pembayaran sudah kami unggah. Tolong bantu percepat verifikasi (Booster) ya. Terima kasih!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>⚡ Booster Chat Admin</span>
                </a>
              );
            })()}
          </div>
        )}

        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-sm font-bold text-zinc-900">
              Riwayat Tagihan &amp; Invoice Langganan
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Daftar seluruh transaksi perpanjangan masa aktif outlet
            </p>
          </div>

          <button
            type="button"
            onClick={fetchData}
            className="p-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-800 transition cursor-pointer"
            title="Muat Ulang Data Tagihan"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">No. Invoice</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Tanggal</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Durasi</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Total Biaya</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      Belum ada riwayat tagihan langganan.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-zinc-900 whitespace-nowrap">
                        #{inv.invoiceNo}
                      </td>
                      <td className="py-2.5 px-3.5 text-zinc-500 whitespace-nowrap">
                        {new Date(inv.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-zinc-700 whitespace-nowrap">
                        {inv.durationMonths} Bulan
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-zinc-900 font-mono whitespace-nowrap">
                        Rp {inv.finalAmount.toLocaleString("id-ID")}
                      </td>
                      <td className="py-2.5 px-3.5 min-w-[140px] whitespace-nowrap">
                        {getStatusBadge(inv.status)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        {inv.status === "unpaid" || inv.status === "rejected" ? (
                          <button
                            type="button"
                            onClick={() => handleOpenUpload(inv)}
                            className="h-8 px-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Unggah Bukti</span>
                          </button>
                        ) : inv.status === "pending_verification" ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-amber-700 font-semibold text-[11px] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              Menunggu Approval
                            </span>
                            <a
                              href={`https://wa.me/6281223406368?text=${encodeURIComponent(
                                `Halo Admin Cleanique, saya dari outlet *${inv.outletName || summary?.outletName || "Cabang"}* ingin konfirmasi perpanjangan langganan (Invoice *#${inv.invoiceNo}*, Nominal *Rp ${inv.finalAmount.toLocaleString("id-ID")}*). Bukti sudah di-upload. Tolong dibantu booster aktivasi ya. Terima kasih!`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="h-8 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[11px] font-bold shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                              title="Booster verifikasi cepat dengan chat WhatsApp Admin"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5" />
                              <span>⚡ Booster WA</span>
                            </a>
                          </div>
                        ) : (
                          <span className="text-emerald-700 font-semibold text-xs">Terverifikasi</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
