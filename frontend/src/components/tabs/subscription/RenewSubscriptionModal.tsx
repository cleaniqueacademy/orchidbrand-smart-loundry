import React, { useState, useEffect } from "react";
import { X, Check, Tag, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { api } from "../../../utils/api";
import { Plan, SubscriptionInvoice } from "../../../types";

interface RenewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invoice: SubscriptionInvoice) => void;
  tenantId: string;
  allowPlanChange?: boolean;
}

export const RenewSubscriptionModal: React.FC<RenewSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
  allowPlanChange = false,
}) => {
  const [plansList, setPlansList] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [referralCode, setReferralCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [existingInvoice, setExistingInvoice] = useState<SubscriptionInvoice | null>(null);

  const [priceLoading, setPriceLoading] = useState(false);
  const [priceData, setPriceData] = useState<{
    basePrice: number;
    discountAmount: number;
    promotionDiscountPerMonth?: number;
    referralDiscountPerMonth?: number;
    finalPrice: number;
  }>({ basePrice: 0, discountAmount: 0, finalPrice: 0 });

  useEffect(() => {
    if (isOpen) {
      setRequestKey(crypto.randomUUID());
      setExistingInvoice(null);
      fetchPlans();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !tenantId || !selectedPlanId) return;
    const controller = new AbortController();
    setPriceLoading(true);
    setErrorMsg(null);
    api.get<{ success: boolean; message?: string; data: typeof priceData }>(
      `/api/subscription/pricing?tenantId=${encodeURIComponent(tenantId)}&planId=${encodeURIComponent(selectedPlanId)}&referralCode=${encodeURIComponent(referralCode.trim())}`,
      { signal: controller.signal },
    ).then(res => {
      if (controller.signal.aborted) return;
      if (!res.success) throw new Error(res.message || "Harga tidak tersedia");
      setPriceData(res.data);
    }).catch(err => {
      if (!controller.signal.aborted) setErrorMsg(err.message || "Gagal menghitung harga");
    }).finally(() => { if (!controller.signal.aborted) setPriceLoading(false); });
    return () => controller.abort();
  }, [isOpen, selectedPlanId, referralCode, tenantId]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const [res, quote] = await Promise.all([
        api.get<{success:boolean;data:Plan[]}>("/api/plans/public"),
        api.get<{success:boolean;data:{plan:Plan}}>(`/api/subscription/pricing?tenantId=${encodeURIComponent(tenantId)}`),
      ]);
      if (!res.success || !quote.success) throw new Error("Paket tidak tersedia");
      const eligible=allowPlanChange?res.data:res.data.filter(plan=>plan.id===quote.data.plan.id);
      setPlansList(eligible);
      setSelectedPlanId(quote.data.plan.id);

    } catch (err) {
      console.error("Gagal mengambil paket:", err);
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  const originalTotal = priceData.basePrice * durationMonths;
  const finalTotal = priceData.finalPrice * durationMonths;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.post<{ success: boolean; code?: string; message?: string; data?: { invoice: SubscriptionInvoice; reused?: boolean } }>("/api/subscription/invoices", {
        planId: selectedPlanId,
        durationMonths,
        idempotencyKey: requestKey,
        referralCode: referralCode.trim() || undefined,
      });

      if (res.success && res.data?.invoice) {
        onSuccess(res.data.invoice);
        onClose();
      } else {
        if (res.code === "ACTIVE_INVOICE" && res.data?.invoice) setExistingInvoice(res.data.invoice);
        setErrorMsg(res.message || "Gagal membuat invoice tagihan.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses langganan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Perpanjang Masa Aktif Langganan</span>
            </h3>
            <span className="text-xs text-zinc-500 block mt-0.5">
              Perpanjang paket saat ini. Perubahan Pro/Premium melalui admin; satu periode = 30 hari.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <div><p>{errorMsg}</p>{existingInvoice && <button type="button" className="mt-2 font-semibold underline" onClick={() => { onSuccess(existingInvoice); onClose(); }}>Lanjutkan invoice #{existingInvoice.invoiceNo} ({existingInvoice.durationMonths} periode)</button>}</div>
            </div>
          )}

          {/* Pilih Paket */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-2">
              Pilih Paket Langganan
            </label>
            {loading ? (
              <div className="py-6 text-center text-xs text-zinc-400">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-blue-600" />
                <span>Memuat paket...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {plansList.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 shadow-xs"
                          : "border-zinc-200 hover:border-zinc-300 bg-white"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-zinc-900">
                          {plan.name}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-blue-700">
                        Rp {plan.pricePerMonth.toLocaleString("id-ID")}/bln
                      </span>
                      {plan.description && (
                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pilih Durasi */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-2">
              Durasi Perpanjangan
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { months: 1, label: "1 periode (30 hari)" },
                { months: 3, label: "3 periode (90 hari)" },
                { months: 6, label: "6 periode (180 hari)" },
                { months: 12, label: "12 periode (360 hari)" },
              ].map((item) => (
                <button
                  key={item.months}
                  type="button"
                  onClick={() => setDurationMonths(item.months)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    durationMonths === item.months
                      ? "border-blue-600 bg-blue-600 text-white shadow-xs"
                      : "border-zinc-200 hover:bg-zinc-50 bg-white text-zinc-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kode Promo / Referral */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1">
              Kode Referral / Kupon Diskon (Opsional)
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Masukkan kode promo"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-zinc-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>
          </div>

          {/* Ringkasan Biaya Tagihan */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal ({durationMonths} periode (30 hari))</span>
              <span className="font-semibold text-zinc-900">
                Rp {originalTotal.toLocaleString("id-ID")}
              </span>
            </div>

            {(priceData.promotionDiscountPerMonth ?? 0) > 0 && <div className="flex justify-between text-emerald-700"><span>Potongan promo</span><span>- Rp {((priceData.promotionDiscountPerMonth ?? 0) * durationMonths).toLocaleString("id-ID")}</span></div>}
            {(priceData.referralDiscountPerMonth ?? 0) > 0 && <div className="flex justify-between text-emerald-700"><span>Potongan referral (setelah promo)</span><span>- Rp {((priceData.referralDiscountPerMonth ?? 0) * durationMonths).toLocaleString("id-ID")}</span></div>}

            <div className="pt-2 border-t border-zinc-200 flex justify-between items-baseline font-bold text-sm text-zinc-900">
              <span>Total Tagihan</span>
              <span className="text-blue-700 text-base font-extrabold font-mono">
                Rp {finalTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-1 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || priceLoading || !!errorMsg || !selectedPlanId}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Lanjut pilih pembayaran</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
