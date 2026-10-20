import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Tag,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  ChevronRight,
  Loader2,
  Copy,
  Check,
  QrCode,
  Building2,
  ExternalLink,
  Download,
  Zap,
} from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { ModalWrapper } from "../common/ModalWrapper";
import { QrisPreviewModal } from "./QrisPreviewModal";
import {
  getDirectImageUrl,
  getFallbackDriveThumbnailUrl,
  isGoogleDriveUrl,
} from "../../utils/googleDriveUtils";

interface PricingData {
  plan: { id: string; name: string };
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  referralCodeId?: string | null;
}

interface SubscriptionRenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onSuccess?: () => void;
}

const DURATIONS = [
  { months: 1, label: "1 Bulan" },
  { months: 3, label: "3 Bulan", badge: "Hemat 0%" },
  { months: 6, label: "6 Bulan", badge: "Populer" },
  { months: 12, label: "12 Bulan", badge: "Terbaik" },
];

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:3000";

function formatRp(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);
}

export const SubscriptionRenewalModal: React.FC<SubscriptionRenewalModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  onSuccess,
}) => {
  const [step, setStep] = useState<"select" | "invoice">("select");
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [referralCode, setReferralCode] = useState("");
  const [referralValidation, setReferralValidation] = useState<null | { valid: boolean; message?: string }>(null);
  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [paymentDest, setPaymentDest] = useState<any>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [isQrisPreviewOpen, setIsQrisPreviewOpen] = useState(false);
  const [downloadingQris, setDownloadingQris] = useState(false);

  const getActiveQrisUrl = () => {
    if (paymentDest?.qrisInfo && !paymentDest.qrisInfo.includes("qris-official.png")) {
      return getDirectImageUrl(paymentDest.qrisInfo);
    }
    return "/qris.png";
  };

  const handleDownloadQris = async () => {
    setDownloadingQris(true);
    const url = getActiveQrisUrl();
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal mengambil file gambar");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `QRIS-Cleanique-Inv-${invoice?.invoiceNo || "renewal"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement("a");
      link.href = url;
      link.download = `QRIS-Cleanique-Inv-${invoice?.invoiceNo || "renewal"}.png`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloadingQris(false), 400);
    }
  };

  const token = localStorage.getItem("cleanique_token") || sessionStorage.getItem("cleanique_token") || "";

  const fetchPricing = useCallback(async (months: number, code?: string) => {
    setLoadingPricing(true);
    try {
      const codeParam = code ? `&referralCode=${encodeURIComponent(code)}` : "";
      const res = await fetch(`${API_BASE}/api/subscription/pricing?tenantId=${tenantId}${codeParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const base = data.data;
        setPricing({
          plan: base.plan,
          basePrice: base.basePrice * months,
          discountAmount: base.discountAmount * months,
          finalPrice: base.finalPrice * months,
          referralCodeId: base.referralCodeId,
        });
      }
    } catch {}
    setLoadingPricing(false);
  }, [tenantId, token]);

  useEffect(() => {
    if (isOpen) fetchPricing(selectedMonths, referralCode || undefined);
  }, [isOpen, selectedMonths, fetchPricing]);

  const handleValidateReferral = async () => {
    if (!referralCode.trim()) { setReferralValidation({ valid: false, message: "Masukkan kode terlebih dahulu" }); return; }
    try {
      const res = await fetch(`${API_BASE}/api/referral-codes/validate?code=${encodeURIComponent(referralCode.trim())}`);
      const data = await res.json();
      if (data.success && data.data) {
        setReferralValidation({ valid: true, message: "Kode valid! Diskon " + formatRp(data.data.discountValue) + "/bulan" });
        fetchPricing(selectedMonths, referralCode.trim());
      } else {
        setReferralValidation({ valid: false, message: data.message || "Kode tidak valid" });
      }
    } catch {
      setReferralValidation({ valid: false, message: "Gagal memvalidasi kode" });
    }
  };

  const handleCreateInvoice = async () => {
    setSubmitting(true);
    try {
      const body: any = { durationMonths: selectedMonths };
      if (referralValidation?.valid && referralCode.trim()) body.referralCode = referralCode.trim();
      const res = await fetch(`${API_BASE}/api/subscription/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setInvoice(data.data.invoice);
        setPaymentDest(data.data.paymentDestination);
        setStep("invoice");
      } else {
        alert(data.message || "Gagal membuat invoice");
      }
    } catch {
      alert("Terjadi kesalahan. Coba lagi.");
    }
    setSubmitting(false);
  };

  const handleUploadProof = async () => {
    if (!proofUrl.trim()) { alert("Masukkan URL/link bukti transfer"); return; }
    setUploadingProof(true);
    try {
      const res = await fetch(`${API_BASE}/api/subscription/invoices/${invoice.id}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ proofUrl: proofUrl.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setProofSubmitted(true);
        onSuccess?.();
      } else {
        alert(data.message || "Gagal mengirim bukti");
      }
    } catch {
      alert("Terjadi kesalahan. Coba lagi.");
    }
    setUploadingProof(false);
  };

  const handleClose = () => {
    setStep("select"); setSelectedMonths(1); setReferralCode(""); setReferralValidation(null);
    setPricing(null); setInvoice(null); setPaymentDest(null); setProofUrl(""); setProofSubmitted(false);
    onClose();
  };

  const getWaBoosterUrl = () => {
    const rawPhone = paymentDest?.supportPhone || "081223406368";
    let phone = String(rawPhone).replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "62" + phone.slice(1);
    if (!phone) phone = "6281223406368";

    const invNo = invoice?.invoiceNo || "-";
    const amount = invoice?.finalAmount ? formatRp(invoice.finalAmount) : "-";
    const duration = invoice?.durationMonths ? `${invoice.durationMonths} Bulan` : `${selectedMonths} Bulan`;

    const text = `Halo Admin Cleanique, saya ingin konfirmasi perpanjangan langganan outlet:\n• No. Invoice: *#${invNo}*\n• Total Tagihan: *${amount}*\n• Paket: *${duration}*\n\nBukti transfer pembayaran sudah kami unggah di sistem. Tolong bantu aktivasi cepat (Booster) ya. Terima kasih!`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleClose} maxWidth="max-w-md">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-slate-900 dark:text-white font-bold text-base">Perpanjang Masa Aktif</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Pilih durasi dan selesaikan pembayaran langganan</p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer p-1.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {step === "select" && (
            <>
              {/* Duration Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Pilih Durasi</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.months}
                      onClick={() => {
                        setSelectedMonths(d.months);
                        fetchPricing(d.months, referralValidation?.valid ? referralCode.trim() : undefined);
                      }}
                      className={`relative border-2 rounded-2xl p-3 text-left transition-all cursor-pointer ${
                        selectedMonths === d.months
                          ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">{d.label}</span>
                      </div>
                      {d.badge && (
                        <span className="absolute top-2 right-2 text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                          {d.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Referral Code */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Kode Referral (opsional)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      value={referralCode}
                      onChange={(e) => {
                        setReferralCode(e.target.value.toUpperCase());
                        setReferralValidation(null);
                      }}
                      placeholder="misal: CLEANHEMAT"
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 dark:bg-slate-800"
                    />
                  </div>
                  <button
                    onClick={handleValidateReferral}
                    className="px-4 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold rounded-xl hover:bg-slate-800 transition cursor-pointer shrink-0"
                  >
                    Cek
                  </button>
                </div>
                {referralValidation && (
                  <div
                    className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium ${
                      referralValidation.valid ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {referralValidation.valid ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {referralValidation.message}
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-2 border border-slate-100 dark:border-slate-800">
                {loadingPricing ? (
                  <div className="flex items-center justify-center py-3 gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Menghitung harga...
                  </div>
                ) : pricing ? (
                  <>
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>Harga normal ({selectedMonths} bln × {formatRp(pricing.basePrice / selectedMonths)}/bln)</span>
                      <span className="font-semibold">{formatRp(pricing.basePrice)}</span>
                    </div>
                    {pricing.discountAmount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                        <span>Diskon kode referral</span>
                        <span>− {formatRp(pricing.discountAmount)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                      <span>Total Bayar</span>
                      <span className="text-emerald-600 text-base">{formatRp(pricing.finalPrice)}</span>
                    </div>
                    {pricing.discountAmount > 0 && (
                      <p className="text-[11px] text-emerald-600 text-right">
                        Kamu hemat {formatRp(pricing.discountAmount)} 🎉
                      </p>
                    )}
                  </>
                ) : null}
              </div>

              <button
                onClick={handleCreateInvoice}
                disabled={submitting || loadingPricing}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-3 font-semibold text-xs shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition disabled:opacity-60 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Buat Invoice & Lihat Cara Bayar
                {!submitting && <ChevronRight className="w-4 h-4" />}
              </button>
            </>
          )}

          {step === "invoice" && (
            <>
              {!proofSubmitted ? (
                <>
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Invoice Dibuat</span>
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      Invoice <strong className="font-mono">{invoice?.invoiceNo}</strong> senilai{" "}
                      <strong className="text-emerald-600">{formatRp(invoice?.finalAmount || 0)}</strong> berhasil dibuat.
                    </p>
                  </div>

                  {paymentDest && (
                    <div className="space-y-3">
                      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 text-center space-y-3 border border-slate-100 dark:border-slate-800">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 mb-1">
                            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                            <span>QRIS Statis Standar Nasional (GPN)</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            LAUNDRY CLEANIQUE
                          </h4>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NMID: ID1026618371243 • GoPay Merchant
                          </p>
                        </div>

                        <div
                          onClick={() => setIsQrisPreviewOpen(true)}
                          className="w-48 sm:w-52 mx-auto bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center cursor-pointer group relative hover:border-emerald-500 transition-colors"
                          title="Klik untuk membuka QRIS layar penuh"
                        >
                          <img
                            src={getActiveQrisUrl()}
                            alt="QRIS Pembayaran Laundry Cleanique"
                            className="w-full h-auto object-contain rounded-xl"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src !== window.location.origin + "/qris.png") {
                                target.src = "/qris.png";
                              }
                            }}
                          />
                          <div className="absolute inset-0 bg-emerald-950/60 backdrop-blur-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 text-center p-2">
                            <QrCode className="w-5 h-5 text-emerald-300" />
                            <span>Perbesar QRIS</span>
                          </div>
                        </div>

                        <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-2.5 text-xs">
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 block">Total Tagihan QRIS:</span>
                          <span className="text-base font-extrabold text-emerald-600 font-mono">
                            {formatRp(invoice?.finalAmount || 0)}
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                            Bisa di-scan dari BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, ShopeePay & Seluruh Mobile Banking
                          </p>
                        </div>

                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadQris}
                            disabled={downloadingQris}
                            className="px-3.5 py-1.5 text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer shadow-2xs disabled:opacity-60"
                          >
                            {downloadingQris ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Unduh Gambar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsQrisPreviewOpen(true)}
                            className="px-3.5 py-1.5 text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-indigo-600 flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer shadow-2xs"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Buka Layar Penuh</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                      Link Bukti Transfer (URL foto / Google Drive)
                    </label>
                    <input
                      value={proofUrl}
                      onChange={(e) => setProofUrl(e.target.value)}
                      placeholder="https://drive.google.com/... atau tautan screenshot"
                      className="w-full px-3.5 py-2.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 dark:bg-slate-800"
                    />
                  </div>

                  <button
                    onClick={handleUploadProof}
                    disabled={uploadingProof || !proofUrl.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-3 font-semibold text-xs shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition disabled:opacity-60 cursor-pointer"
                  >
                    {uploadingProof ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Kirim Bukti Pembayaran
                  </button>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Ingin aktivasi dipercepat?</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> Booster Prioritas
                      </span>
                    </div>
                    <a
                      href={getWaBoosterUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl py-2.5 font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                      <span>⚡ Booster Verifikasi Cepat (Chat WhatsApp Admin)</span>
                    </a>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center mx-auto text-emerald-600">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Bukti Terkirim!</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Admin akan memverifikasi pembayaran Anda dalam 1×24 jam. Atau klik tombol booster di bawah agar admin langsung memprosesnya sekarang.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <a
                      href={getWaBoosterUrl()}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl py-2.5 font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
                    >
                      <WhatsAppIcon className="w-4 h-4" />
                      <span>⚡ Booster Chat WhatsApp Admin Sekarang</span>
                    </a>
                    <button
                      onClick={handleClose}
                      className="w-full py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <QrisPreviewModal
        isOpen={isQrisPreviewOpen}
        onClose={() => setIsQrisPreviewOpen(false)}
        qrisUrl={getActiveQrisUrl()}
        merchantName="LAUNDRY CLEANIQUE"
        nmid="ID1026618371243"
        amount={invoice?.finalAmount}
        invoiceNo={invoice?.invoiceNo}
        downloadFileName={`QRIS-Cleanique-Inv-${invoice?.invoiceNo || "renewal"}.png`}
      />
    </ModalWrapper>
  );
};
