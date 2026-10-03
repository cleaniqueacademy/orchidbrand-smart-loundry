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
} from "lucide-react";
import { ModalWrapper } from "../common/ModalWrapper";
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
  const [paymentTab, setPaymentTab] = useState<"bank" | "qris">("bank");
  const [copiedAccount, setCopiedAccount] = useState(false);
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
                      {paymentDest.qrisInfo && (
                        <div className="flex border border-slate-200 dark:border-slate-700 rounded-xl p-1 bg-slate-100/70 dark:bg-slate-800">
                          <button
                            type="button"
                            onClick={() => setPaymentTab("bank")}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                              paymentTab === "bank"
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Transfer Rekening</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentTab("qris")}
                            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                              paymentTab === "qris"
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Scan QRIS</span>
                          </button>
                        </div>
                      )}

                      {paymentTab === "bank" ? (
                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-2.5 text-xs border border-slate-100 dark:border-slate-800">
                          <p className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                            Transfer Ke:
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Bank</span>
                            <span className="font-bold text-slate-900 dark:text-white">{paymentDest.bankName || "BCA"}</span>
                          </div>
                          <div className="flex justify-between items-center bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Nomor Rekening</span>
                              <span className="font-bold font-mono text-sm text-slate-900 dark:text-white">
                                {paymentDest.bankAccountNumber || "-"}
                              </span>
                            </div>
                            {paymentDest.bankAccountNumber && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(paymentDest.bankAccountNumber);
                                  setCopiedAccount(true);
                                  setTimeout(() => setCopiedAccount(false), 2000);
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 text-slate-700 dark:text-slate-300 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                              >
                                {copiedAccount ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Tersalin</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Salin</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Atas Nama</span>
                            <span className="font-semibold text-slate-900 dark:text-white">{paymentDest.bankAccountName || "-"}</span>
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between font-bold text-emerald-600 text-sm">
                            <span>Jumlah Transfer</span>
                            <span>{formatRp(invoice?.finalAmount || 0)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 text-center space-y-3 border border-slate-100 dark:border-slate-800">
                          <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            Scan kode QRIS melalui aplikasi Mobile Banking atau E-Wallet:
                          </p>
                          <div className="w-44 h-44 mx-auto bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center">
                            <img
                              src={getDirectImageUrl(paymentDest.qrisInfo)}
                              alt="QRIS Pembayaran"
                              className="w-full h-full object-contain rounded-xl"
                              onError={(e) => {
                                const target = e.currentTarget;
                                const fallback = getFallbackDriveThumbnailUrl(paymentDest.qrisInfo);
                                if (target.src !== fallback) target.src = fallback;
                              }}
                            />
                          </div>
                          <div className="flex justify-center gap-2">
                            <a
                              href={getDirectImageUrl(paymentDest.qrisInfo)}
                              download="QRIS_Cleanique.png"
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 flex items-center gap-1 hover:bg-slate-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Unduh Gambar</span>
                            </a>
                            <a
                              href={getDirectImageUrl(paymentDest.qrisInfo)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 text-[11px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-indigo-600 flex items-center gap-1 hover:bg-slate-50"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Buka Layar Penuh</span>
                            </a>
                          </div>
                        </div>
                      )}
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
                </>
              ) : (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center mx-auto text-emerald-600">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Bukti Terkirim!</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Admin akan memverifikasi pembayaran Anda dalam 1×24 jam. Masa aktif akan otomatis diperpanjang setelah diverifikasi.
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-6 py-2.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};
