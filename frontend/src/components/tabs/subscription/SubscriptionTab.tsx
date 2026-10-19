import React, { useState, useEffect } from "react";
import {
  Clock,
  AlertCircle,
  CreditCard,
  Building2,
  Upload,
  ShieldCheck,
  Gift,
  RefreshCw,
  Tag,
  Edit2,
  X,
  Loader2,
  Check,
  Copy,
  QrCode,
  Download,
  ExternalLink,
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

      {/* 3. Metode Pembayaran Resmi: QRIS Statis Platform Cleanique */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  Metode Pembayaran Resmi Platform (QRIS Statis)
                </span>
                <span className="text-xs text-zinc-400">• Bebas Biaya Admin &amp; Instan</span>
              </div>
              <h3 className="font-bold text-zinc-900 text-sm mt-0.5">
                Scan QRIS Laundry Cleanique
              </h3>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-2xs">
            GoPay Merchant / QRIS GPN
          </span>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative group shrink-0">
            <div className="p-3 bg-white rounded-2xl border border-emerald-200/90 shadow-md">
              <img
                src="/qris.png"
                alt="QRIS Pembayaran Laundry Cleanique"
                className="w-40 h-40 object-contain rounded-xl"
              />
            </div>
            <a
              href="/qris.png"
              target="_blank"
              rel="noreferrer"
              className="absolute inset-0 bg-emerald-950/40 backdrop-blur-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5"
            >
              <ExternalLink className="w-4 h-4" /> Buka Layar Penuh
            </a>
          </div>

          <div className="space-y-3 flex-1 min-w-0 text-center md:text-left">
            <div>
              <div className="text-[11px] text-emerald-800 font-semibold uppercase tracking-wider">Merchant Name</div>
              <div className="text-base font-black text-zinc-900">LAUNDRY CLEANIQUE</div>
              <div className="text-xs font-mono font-bold text-zinc-700 mt-0.5">
                NMID: <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded border border-emerald-200/60 font-mono">ID1026618371243</span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed max-w-xl">
              Gunakan kamera ponsel, aplikasi e-wallet (<strong>GoPay, OVO, Dana, ShopeePay</strong>), atau seluruh aplikasi mobile banking (<strong>BCA, Mandiri, BRI, BNI, BSI, CIMB</strong>, dll) untuk memindai kode QRIS statis resmi di samping.
            </p>

            <div className="flex flex-wrap gap-2.5 justify-center md:justify-start pt-1">
              <a
                href="/qris.png"
                download="QRIS-Laundry-Cleanique.png"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Gambar QRIS
              </a>
              <a
                href="/qris.png"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Lihat Layar Penuh
              </a>
            </div>

            <div className="text-[11px] text-zinc-500 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
              💡 <strong>Langkah selanjutnya:</strong> Setelah berhasil bayar via QRIS, simpan struk/screenshot bukti bayar lalu klik tombol <strong>"Unggah Bukti"</strong> pada baris tagihan Anda di bawah agar invoice langganan langsung diverifikasi otomatis.
            </div>
          </div>
        </div>
      </div>

      {/* 4. Tabel Riwayat Invoice (Identik dengan Sistem ShadcnDataTable / ReportLedgerTable) */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-sm space-y-4">
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
                          <span className="text-zinc-400 text-xs italic">Sedang Ditinjau</span>
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
    </div>
  );
};
