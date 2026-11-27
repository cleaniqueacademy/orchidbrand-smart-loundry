import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  AlertCircle,
  CreditCard,
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
  ChevronDown,
} from "lucide-react";
import { paymentStatusLabel } from "../../../utils/paymentStatus";
import { api } from "../../../utils/api";
import { PlatformSettings, SubscriptionSummary, SubscriptionInvoice } from "../../../types";
import { useToast } from "../../common/ToastContext";
import { useConfirm } from "../../common/ConfirmContext";
import { RenewSubscriptionModal } from "./RenewSubscriptionModal";
import { UploadPaymentProofModal } from "./UploadPaymentProofModal";
import { SubscriptionPaymentPanel } from "./SubscriptionPaymentPanel";
import { ModalWrapper } from "../../common/ModalWrapper";

interface SubscriptionTabProps {
  tenantId?: string;
}

export const SubscriptionTab: React.FC<SubscriptionTabProps> = ({ tenantId }) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [midtransEnabled, setMidtransEnabled] = useState(false);
  const [adminPhone, setAdminPhone] = useState("6281223406368");
  const [paymentBusy, setPaymentBusy] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api.get<{ success: boolean; data: { enabled: boolean } }>("/api/payments/midtrans/config", { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted && result.success) setMidtransEnabled(result.data.enabled); }).catch(() => {});
    api.get<{ success: boolean; data?: Pick<PlatformSettings, "supportPhone"> }>("/api/platform-settings/public", { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted || !result.success) return;
        const phone = result.data?.supportPhone?.replace(/\D/g, "").replace(/^0/, "62");
        if (phone && /^[1-9]\d{7,14}$/.test(phone)) setAdminPhone(phone);
      }).catch(() => {});
    return () => controller.abort();
  }, []);
  const checkoutMidtrans = async (invoice: SubscriptionInvoice) => {
    setPaymentBusy(invoice.id);
    try {
      const response = await api.post<{ success: boolean; message?: string; data?: { redirectUrl?: string } }>(`/api/payments/midtrans/invoices/${encodeURIComponent(invoice.id)}/checkout`);
      if (!response.success || !response.data?.redirectUrl) throw new Error(response.message || "Checkout tidak tersedia; periksa status transaksi.");
      const destination = new URL(response.data.redirectUrl);
      if (!["https://app.midtrans.com", "https://app.sandbox.midtrans.com"].includes(destination.origin)) throw new Error("Alamat checkout tidak valid");
      window.location.assign(destination.href);
    } catch (error) { toast.error("Checkout belum dapat dibuka", error instanceof Error ? error.message : "Coba Periksa Status atau hubungi admin."); }
    finally { setPaymentBusy(null); }
  };
  const reconcileMidtrans = async (invoice: SubscriptionInvoice) => {
    setPaymentBusy(invoice.id);
    try {
      const response = await api.get<{ success: boolean; message?: string; data?: { invoice: SubscriptionInvoice; attempts: { status: string; resolution: string | null }[] } }>(`/api/payments/midtrans/invoices/${encodeURIComponent(invoice.id)}/status`);
      if (!response.success || !response.data) throw new Error(response.message || "Status belum tersedia");
      const attempt = response.data.attempts[0];
      if (attempt?.resolution) toast.error("Perlu pemeriksaan admin", "Transaksi memerlukan rekonsiliasi. Hubungi admin dengan nomor invoice ini.");
      else toast.success("Status diperbarui", response.data.invoice.status === "paid" ? "Pembayaran telah dikonfirmasi." : `Status pembayaran: ${paymentStatusLabel(attempt?.status)}`);
      await fetchData();
    } catch (error) { toast.error("Gagal memeriksa status", error instanceof Error ? error.message : "Coba kembali nanti."); }
    finally { setPaymentBusy(null); }
  };


  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoice | null>(null);
  const [checkoutInvoice, setCheckoutInvoice] = useState<SubscriptionInvoice | null>(null);
  const paymentSection = useRef<HTMLDivElement>(null);
  const [checkoutFocus, setCheckoutFocus] = useState(0);
  useEffect(() => {
    if (!checkoutFocus) return;
    paymentSection.current?.focus({ preventScroll: true });
    paymentSection.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [checkoutFocus]);
  const openCheckout = (invoice: SubscriptionInvoice) => {
    setCheckoutInvoice(invoice);
    setCheckoutFocus(value => value + 1);
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

      if (!sumRes.success || !sumRes.data || !invRes.success || !Array.isArray(invRes.data)) throw new Error("Data langganan belum tersedia.");
      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (invRes.success && invRes.data) {
        setInvoices(invRes.data);
      }
      return true;
    } catch (err) {
      toast.error("Gagal memuat langganan", err instanceof Error ? err.message : "Coba lagi nanti.");
      return false;
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
          res.message || "Referral diterapkan pada perhitungan invoice berikutnya."
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
          outlet akan dihitung ulang mengikuti paket dan promo yang masih aktif.
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
        toast.info("Kode Referral Dicopot", res.message || "Harga berikutnya mengikuti paket dan promo aktif.");
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


  const cancelInvoice = async (invoice: SubscriptionInvoice) => {
    const hasProof = invoice.status === "pending_verification" || !!invoice.paymentProofUrl;
    const approved = await confirm({
      title: "Batalkan tagihan?",
      description: hasProof
        ? "Tagihan ini sudah memiliki bukti pembayaran yang sedang menunggu pemeriksaan. Jika Anda sudah mentransfer dana, JANGAN batalkan—hubungi admin agar pembayaran diperiksa. Batalkan hanya jika salah unggah bukti atau belum melakukan transfer."
        : "Pembatalan menutup tagihan di aplikasi. QRIS yang sudah diunduh mungkin masih dapat dibayar di bank. Jangan bayar QRIS lama. Jika sudah membayar, hubungi admin untuk mencatat penerimaannya.",
      confirmText: "Ya, batalkan tagihan",
      cancelText: "Kembali",
      variant: "danger",
    });
    if (!approved) return;
    setPaymentBusy(invoice.id);
    try {
      const response = await api.post<{ success: boolean; message?: string }>(`/api/subscription/invoices/${encodeURIComponent(invoice.id)}/cancel`, { reason: "Pembatalan dikonfirmasi pemilik akun melalui halaman langganan.", acknowledgeSavedQris: true });
      if (!response.success) throw new Error(response.message || "Tagihan belum dapat dibatalkan.");
      await fetchData();
      toast.success("Tagihan dibatalkan", "Buat tagihan baru jika ingin mengganti durasi langganan.");
    } catch (error) { toast.error("Pembatalan gagal", error instanceof Error ? error.message : "Coba lagi nanti."); }
    finally { setPaymentBusy(null); }
  };

  const getStatusBadge = (inv: SubscriptionInvoice) => {
    const effectiveStatus =
      ["unpaid", "rejected"].includes(inv.status) && inv.expiresAt && Date.parse(inv.expiresAt) <= Date.now()
        ? "expired"
        : inv.status;

    switch (effectiveStatus) {
      case "expired":
        return (
          <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-full">
            Kedaluwarsa
          </span>
        );
      case "cancelled":
        return (
          <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 bg-zinc-100 text-zinc-600 border border-zinc-200 rounded-full">
            Dibatalkan
          </span>
        );
      case "review_required":
        return (
          <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
            Perlu Review Admin
          </span>
        );
      case "paid":
        if (inv.activationStatus === "pending_review") {
          return (
            <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
              Lunas · Menunggu Aktivasi
            </span>
          );
        }
        if (inv.activationStatus === "refunded") {
          return (
            <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-full">
              Dana Dikembalikan
            </span>
          );
        }
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
          onClick={() => { const existing = invoices.find(inv => (["pending_verification", "review_required"].includes(inv.status) || ["unpaid", "rejected"].includes(inv.status) && (!inv.expiresAt || !Number.isFinite(Date.parse(inv.expiresAt)) || Date.parse(inv.expiresAt) > Date.now())) || (inv.status === "paid" && !["active", "refunded"].includes(inv.activationStatus || ""))); if (existing) { openCheckout(existing); toast.info("Masih ada tagihan yang belum selesai", "Lanjutkan atau batalkan tagihan lama sebelum membuat yang baru."); } else setIsRenewModalOpen(true); }}
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
            {summary?.referralCodeUsed ? (
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
            )}
          </div>
          <p className="text-[11px] text-indigo-700/90 font-medium mt-1 truncate">
            {summary?.referralCodeUsed
              ? "Referral diterapkan setelah potongan promo aktif"
              : "Tarif mengikuti paket dan promo saat invoice dibuat"}
          </p>
        </div>
      </div>

      <div ref={paymentSection} tabIndex={-1} className="scroll-mt-24 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
        <SubscriptionPaymentPanel
          key={checkoutInvoice?.id || "pending"}
          invoice={(checkoutInvoice && (invoices.find(inv => inv.id === checkoutInvoice.id) || checkoutInvoice)) || summary?.pendingInvoice || invoices.find(inv => ["unpaid", "rejected"].includes(inv.status)) || null}
          destination={summary?.platformBank}
          adminPhone={adminPhone}
          gatewayEnabled={midtransEnabled}
          busy={paymentBusy !== null}
          onUpload={handleOpenUpload}
          onGateway={checkoutMidtrans}
          onCancel={cancelInvoice}
          onRefresh={async () => { if (!await fetchData()) throw new Error("Status belum tersedia"); }}
        />
      </div>

      {/* 4. Tabel Riwayat Invoice (Identik dengan Sistem ShadcnDataTable / ReportLedgerTable) */}
      <details className="group rounded-2xl border border-zinc-200 bg-white">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-600 [&::-webkit-details-marker]:hidden sm:px-5">
          Riwayat tagihan
          <ChevronDown aria-hidden="true" className="h-4 w-4 text-zinc-600 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-2 border-t border-zinc-100 px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
              aria-label="Muat ulang riwayat"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
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
                          {inv.durationMonths} periode ({inv.durationMonths * 30} hari)
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-zinc-900 font-mono whitespace-nowrap">
                          Rp {inv.finalAmount.toLocaleString("id-ID")}
                          {(inv.promotionDiscountAmount ?? 0) > 0 && <div className="text-[10px] text-emerald-700 font-normal">Promo: -Rp {inv.promotionDiscountAmount?.toLocaleString("id-ID")}</div>}
                          {(inv.referralDiscountAmount ?? 0) > 0 && <div className="text-[10px] text-emerald-700 font-normal">Referral: -Rp {inv.referralDiscountAmount?.toLocaleString("id-ID")}</div>}
                        </td>
                        <td className="py-2.5 px-3.5 min-w-[140px]">
                          {getStatusBadge(inv)}
                          {inv.activationStatus === "refunded" && <p className="text-[11px] text-zinc-600 mt-1">Dana dikembalikan; langganan tidak diaktifkan.</p>}
                          {inv.activationStatus === "pending_review" && <p className="text-[11px] text-amber-800 mt-1">Pembayaran tercatat; aktivasi menunggu review admin.</p>}
                          {["unpaid","rejected"].includes(inv.status) && <div className="text-[10px] mt-1 text-zinc-500">{inv.expiresAt ? `Batas bayar: ${new Date(inv.expiresAt).toLocaleString("id-ID",{timeZone:"Asia/Jakarta"})} WIB` : "Invoice lama: hubungi admin untuk review"}</div>}
                        </td>
                        <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                          {midtransEnabled && <>
                            {["unpaid", "rejected"].includes(inv.status) && <button type="button" disabled={paymentBusy === inv.id || !inv.expiresAt || Date.parse(inv.expiresAt) <= Date.now()} onClick={() => void checkoutMidtrans(inv)} className="border border-blue-200 bg-blue-50 text-blue-700 rounded-lg px-3 py-2 text-xs mr-2 disabled:opacity-50">Bayar via Midtrans</button>}
                            <button type="button" disabled={paymentBusy === inv.id} onClick={() => void reconcileMidtrans(inv)} className="border rounded-lg px-3 py-2 text-xs mr-2 disabled:opacity-50">Periksa status</button>
                          </>}

                          {inv.status === "unpaid" || inv.status === "rejected" ? (
                            <button
                              type="button"
                              onClick={() => openCheckout(inv)}
                              disabled={!inv.expiresAt || Date.parse(inv.expiresAt) <= Date.now()}
                              className="h-8 px-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Pilih pembayaran</span>
                            </button>
                          ) : inv.status === "pending_verification" ? (
                            <button type="button" onClick={() => openCheckout(inv)} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-600">
                              Lihat status
                            </button>
                          ) : inv.status === "paid" ? (
                            inv.activationStatus === "pending_review" ? (
                              <span className="text-amber-700 font-semibold text-xs">Menunggu review admin</span>
                            ) : inv.activationStatus === "refunded" ? (
                              <span className="text-zinc-600 font-semibold text-xs">Dana dikembalikan</span>
                            ) : (
                              <span className="text-emerald-700 font-semibold text-xs">Terverifikasi &amp; Aktif</span>
                            )
                          ) : inv.status === "cancelled" ? (
                            <span className="text-zinc-500 font-semibold text-xs">Dibatalkan</span>
                          ) : (
                            <span className="text-zinc-600 font-semibold text-xs">Hubungi admin jika sudah membayar</span>
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
      </details>

      {/* Modals */}
      <RenewSubscriptionModal
        allowPlanChange={summary?.isTrial === true}
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        onSuccess={(invoice) => {
          setInvoices(current => [invoice, ...current.filter(item => item.id !== invoice.id)]);
          openCheckout(invoice);
          void fetchData();
        }}
        tenantId={tenantId || summary?.tenantId || ""}
      />

      <UploadPaymentProofModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        invoice={selectedInvoice}
        onSuccess={(invoice) => {
          const submitted: SubscriptionInvoice = { ...invoice, status: "pending_verification" };
          setInvoices(current => current.map(item => item.id === submitted.id ? submitted : item));
          openCheckout(submitted);
          void fetchData();
        }}
      />

      {/* Modal Kode Referral */}
      <ModalWrapper isOpen={isEditingReferral} onClose={() => !applyingReferral && setIsEditingReferral(false)} maxWidth="max-w-sm">
        <div role="dialog" aria-modal="true" aria-label="Atur kode referral" className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  {summary?.referralCodeUsed ? "Ganti Kode Referral" : "Terapkan Kode Referral"}
                </h3>
                <p className="text-[11px] text-zinc-500">Diskon berlaku pada pembuatan tagihan baru</p>
              </div>
            </div>
            <button
              type="button"
              disabled={applyingReferral}
              onClick={() => setIsEditingReferral(false)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleApplyReferral} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Kode Referral / Promo *
              </label>
              <input
                type="text"
                value={referralInput}
                onChange={(e) => {
                  setReferralInput(e.target.value.toUpperCase());
                  if (referralError) setReferralError(null);
                }}
                placeholder="Masukkan kode referral..."
                className="w-full px-3.5 py-2.5 text-xs font-mono font-bold uppercase border border-zinc-300 rounded-xl bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
                disabled={applyingReferral}
              />
              {referralError && (
                <p className="text-[11px] text-rose-600 font-medium mt-1.5">{referralError}</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                disabled={applyingReferral}
                onClick={() => setIsEditingReferral(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={applyingReferral || !referralInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5"
              >
                {applyingReferral ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Simpan Kode</span>
              </button>
            </div>
          </form>
        </div>
      </ModalWrapper>

    </div>
  );
};
