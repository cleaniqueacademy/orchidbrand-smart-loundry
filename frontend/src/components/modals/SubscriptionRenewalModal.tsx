import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Tag, CheckCircle, AlertTriangle, CreditCard, ChevronRight, Loader2 } from "lucide-react";

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
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", duration: 0.3 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden z-10"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-base">Perpanjang Masa Aktif</h2>
              <p className="text-zinc-400 text-xs mt-0.5">Pilih durasi dan bayar via transfer bank</p>
            </div>
            <button onClick={handleClose} className="text-zinc-400 hover:text-white transition cursor-pointer p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {step === "select" && (
              <>
                {/* Duration Picker */}
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">Pilih Durasi</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.months}
                        onClick={() => { setSelectedMonths(d.months); fetchPricing(d.months, referralValidation?.valid ? referralCode.trim() : undefined); }}
                        className={`relative border-2 rounded-xl p-3 text-left transition-all cursor-pointer ${
                          selectedMonths === d.months
                            ? "border-zinc-900 bg-zinc-50"
                            : "border-zinc-200 hover:border-zinc-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                          <span className="font-semibold text-sm text-zinc-900">{d.label}</span>
                        </div>
                        {d.badge && (
                          <span className="absolute top-2 right-2 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                            {d.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Referral Code */}
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">Kode Referral (opsional)</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input
                        value={referralCode}
                        onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); setReferralValidation(null); }}
                        placeholder="misal: CLEANHEMAT"
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900"
                      />
                    </div>
                    <button
                      onClick={handleValidateReferral}
                      className="px-3 py-2.5 bg-zinc-900 text-white text-xs font-semibold rounded-xl hover:bg-zinc-700 transition cursor-pointer shrink-0"
                    >
                      Cek
                    </button>
                  </div>
                  {referralValidation && (
                    <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium ${referralValidation.valid ? "text-emerald-600" : "text-red-500"}`}>
                      {referralValidation.valid ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {referralValidation.message}
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
                  {loadingPricing ? (
                    <div className="flex items-center justify-center py-3 gap-2 text-zinc-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Menghitung harga...
                    </div>
                  ) : pricing ? (
                    <>
                      <div className="flex justify-between text-sm text-zinc-600">
                        <span>Harga normal ({selectedMonths} bln × {formatRp(pricing.basePrice / selectedMonths)}/bln)</span>
                        <span>{formatRp(pricing.basePrice)}</span>
                      </div>
                      {pricing.discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600">
                          <span>Diskon kode referral</span>
                          <span>− {formatRp(pricing.discountAmount)}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-zinc-200 flex justify-between font-bold text-base text-zinc-900">
                        <span>Total Bayar</span>
                        <span>{formatRp(pricing.finalPrice)}</span>
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
                  className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white rounded-xl py-3 font-semibold text-sm hover:bg-zinc-700 transition disabled:opacity-60 cursor-pointer"
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
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-1">Invoice Dibuat ✓</p>
                      <p className="text-sm text-zinc-700">
                        Invoice <strong>{invoice?.invoiceNo}</strong> senilai <strong>{formatRp(invoice?.finalAmount || 0)}</strong> berhasil dibuat.
                      </p>
                    </div>

                    {paymentDest && (
                      <div className="bg-zinc-50 rounded-xl p-4 space-y-2 text-sm">
                        <p className="font-semibold text-zinc-900 text-xs uppercase tracking-wide mb-2">Transfer Ke:</p>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Bank</span>
                          <span className="font-semibold text-zinc-900">{paymentDest.bankName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">No. Rekening</span>
                          <span className="font-semibold text-zinc-900 font-mono">{paymentDest.bankAccountNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Atas Nama</span>
                          <span className="font-semibold text-zinc-900">{paymentDest.bankAccountName}</span>
                        </div>
                        <div className="border-t border-zinc-200 pt-2 flex justify-between font-bold text-emerald-700">
                          <span>Jumlah Transfer</span>
                          <span>{formatRp(invoice?.finalAmount || 0)}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          Setelah transfer, unggah bukti di bawah. Admin akan memverifikasi dalam 1×24 jam.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 block">
                        Link Bukti Transfer (URL foto/screenshot)
                      </label>
                      <input
                        value={proofUrl}
                        onChange={(e) => setProofUrl(e.target.value)}
                        placeholder="https://drive.google.com/... atau link foto lainnya"
                        className="w-full px-3 py-2.5 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/20 focus:border-zinc-900"
                      />
                    </div>

                    <button
                      onClick={handleUploadProof}
                      disabled={uploadingProof || !proofUrl.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white rounded-xl py-3 font-semibold text-sm hover:bg-zinc-700 transition disabled:opacity-60 cursor-pointer"
                    >
                      {uploadingProof ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Kirim Bukti Transfer
                    </button>
                  </>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">Bukti Terkirim!</p>
                      <p className="text-sm text-zinc-500 mt-1">
                        Admin akan memverifikasi pembayaran Anda dalam 1×24 jam. Masa aktif akan otomatis diperpanjang setelah diverifikasi.
                      </p>
                    </div>
                    <button onClick={handleClose} className="mt-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-sm font-semibold hover:bg-zinc-700 transition cursor-pointer">
                      Tutup
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
