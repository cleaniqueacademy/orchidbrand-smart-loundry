import React, { useState, useEffect } from "react";
import { X, Check, Tag, ShieldCheck, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { api } from "../../../utils/api";
import { Plan } from "../../../types";

interface RenewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tenantId: string;
}

export const RenewSubscriptionModal: React.FC<RenewSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  tenantId,
}) => {
  const [plansList, setPlansList] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [referralCode, setReferralCode] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [priceData, setPriceData] = useState<{
    basePrice: number;
    discountAmount: number;
    finalPrice: number;
  }>({ basePrice: 60000, discountAmount: 0, finalPrice: 60000 });

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && tenantId) {
      calculatePrice();
    }
  }, [isOpen, selectedPlanId, referralCode, tenantId]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ success: boolean; data: Plan[] }>("/api/plans/public");
      if (res.success && res.data.length > 0) {
        setPlansList(res.data);
        setSelectedPlanId(res.data[0].id);
      }
    } catch (err) {
      console.error("Gagal mengambil paket:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = async () => {
    try {
      const url = `/api/subscription/pricing?planId=${encodeURIComponent(selectedPlanId)}&referralCode=${encodeURIComponent(referralCode.trim())}`;
      const res = await api.get<{
        success: boolean;
        data: {
          basePrice: number;
          discountAmount: number;
          finalPrice: number;
        };
      }>(url);

      if (res.success && res.data) {
        setPriceData(res.data);
      }
    } catch (err) {
      console.error("Gagal menghitung harga:", err);
    }
  };

  if (!isOpen) return null;

  const originalTotal = priceData.basePrice * durationMonths;
  const discountTotal = priceData.discountAmount * durationMonths;
  const finalTotal = priceData.finalPrice * durationMonths;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await api.post<{ success: boolean; message?: string }>("/api/subscription/invoices", {
        planId: selectedPlanId,
        durationMonths,
        referralCode: referralCode.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message || "Gagal membuat invoice tagihan.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses langganan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Perpanjang Masa Aktif Langganan</span>
            </h3>
            <span className="text-xs text-slate-500 block mt-0.5">
              Pilih paket dan durasi langganan untuk outlet Anda
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Pilih Paket */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Pilih Paket Langganan
            </label>
            {loading ? (
              <div className="py-4 text-center text-xs text-slate-400">Memuat paket...</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plansList.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {plan.name}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                        Rp {plan.pricePerMonth.toLocaleString("id-ID")}/bln
                      </span>
                      {plan.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
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
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Durasi Perpanjangan
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { months: 1, label: "1 Bulan" },
                { months: 3, label: "3 Bulan" },
                { months: 6, label: "6 Bulan" },
                { months: 12, label: "1 Tahun" },
              ].map((item) => (
                <button
                  key={item.months}
                  type="button"
                  onClick={() => setDurationMonths(item.months)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    durationMonths === item.months
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kode Promo / Referral */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Kode Referral / Kupon Diskon (Opsional)
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Masukkan kode promo"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Ringkasan Biaya Tagihan */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Subtotal ({durationMonths} Bulan)</span>
              <span>Rp {originalTotal.toLocaleString("id-ID")}</span>
            </div>

            {discountTotal > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Diskon Promo</span>
                <span>- Rp {discountTotal.toLocaleString("id-ID")}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline font-extrabold text-sm text-slate-900 dark:text-white">
              <span>Total Tagihan</span>
              <span className="text-indigo-600 dark:text-indigo-400 text-base">
                Rp {finalTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Buat Tagihan Pembayaran</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
