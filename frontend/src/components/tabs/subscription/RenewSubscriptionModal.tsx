import React, { useState, useEffect } from "react";
import { X, Check, Tag, Loader2, Sparkles, AlertCircle } from "lucide-react";
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
              Pilih paket dan durasi langganan untuk outlet Anda
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
              <span>{errorMsg}</span>
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
                { months: 1, label: "1 Bulan" },
                { months: 3, label: "3 Bulan" },
                { months: 6, label: "6 Bulan" },
                { months: 12, label: "1 Tahun" },
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
              <span>Subtotal ({durationMonths} Bulan)</span>
              <span className="font-semibold text-zinc-900">
                Rp {originalTotal.toLocaleString("id-ID")}
              </span>
            </div>

            {discountTotal > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Diskon Promo</span>
                <span>- Rp {discountTotal.toLocaleString("id-ID")}</span>
              </div>
            )}

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
              disabled={submitting}
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Buat Tagihan Pembayaran</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
