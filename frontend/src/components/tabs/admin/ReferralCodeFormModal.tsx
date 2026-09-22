import React, { useState, useEffect } from "react";
import { X, Tag, Percent, DollarSign, Calendar, Users, CheckCircle2 } from "lucide-react";
import { ReferralCode, MarketingProfile } from "../../../types";

interface ReferralCodeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<ReferralCode>) => Promise<boolean>;
  initialData?: ReferralCode | null;
  marketingProfiles?: MarketingProfile[];
  userRole?: string;
}

export const ReferralCodeFormModal: React.FC<ReferralCodeFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  marketingProfiles = [],
  userRole = "superadmin",
}) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [commissionType, setCommissionType] = useState<"percent" | "fixed">("percent");
  const [commissionValue, setCommissionValue] = useState<number>(10);
  const [maxUsage, setMaxUsage] = useState<string>("");
  const [validFrom, setValidFrom] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [appliesToAllTenants, setAppliesToAllTenants] = useState<boolean>(true);
  const [marketingProfileId, setMarketingProfileId] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code);
      setName(initialData.name);
      setDescription(initialData.description || "");
      setDiscountType(initialData.discountType);
      setDiscountValue(initialData.discountValue);
      setCommissionType(initialData.commissionType);
      setCommissionValue(initialData.commissionValue);
      setMaxUsage(initialData.maxUsage ? String(initialData.maxUsage) : "");
      setValidFrom(initialData.validFrom || "");
      setValidUntil(initialData.validUntil || "");
      setAppliesToAllTenants(String(initialData.appliesToAllTenants) === "true");
      setMarketingProfileId(initialData.marketingProfileId || "");
    } else {
      setCode("");
      setName("");
      setDescription("");
      setDiscountType("percent");
      setDiscountValue(10);
      setCommissionType("percent");
      setCommissionValue(10);
      setMaxUsage("");
      setValidFrom("");
      setValidUntil("");
      setAppliesToAllTenants(true);
      setMarketingProfileId("");
    }
    setError("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError("Kode dan Nama promo wajib diisi");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload: Partial<ReferralCode> = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || null,
        discountType,
        discountValue: Number(discountValue) || 0,
        commissionType,
        commissionValue: Number(commissionValue) || 0,
        maxUsage: maxUsage ? Number(maxUsage) : null,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        appliesToAllTenants: appliesToAllTenants ? "true" : "false",
        marketingProfileId: marketingProfileId || null,
      };

      const success = await onSubmit(payload);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan kode referral");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                {initialData ? "Ubah Kode Referral" : "Buat Kode Referral Baru"}
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">Konfigurasi kupon promosi & komisi affiliate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Kode & Nama */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Kode Kupon <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!!initialData} // Kode tidak boleh diubah jika edit
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                placeholder="CONTOH: PROMO50"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Program Promo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Diskon Pembukaan Cabang"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Deskripsi / Catatan Promo</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Berlaku untuk pendaftar outlet baru..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Diskon Pelanggan */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 space-y-3">
            <span className="font-bold text-blue-900 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-blue-600" /> Diskon Untuk Pelanggan Baru
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Tipe Diskon</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none"
                >
                  <option value="percent">Persentase (%)</option>
                  <option value="fixed">Nominal Rupiah (Rp)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  {discountType === "percent" ? "Besar Diskon (%)" : "Nominal Diskon (Rp)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={discountType === "percent" ? 100 : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Komisi Marketing */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-3">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Komisi Untuk Affiliate / Marketing
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Tipe Komisi</label>
                <select
                  value={commissionType}
                  onChange={(e) => setCommissionType(e.target.value as "percent" | "fixed")}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none"
                >
                  <option value="percent">Persentase (%)</option>
                  <option value="fixed">Nominal Tetap (Rp)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-medium">
                  {commissionType === "percent" ? "Besar Komisi (%)" : "Nominal Komisi (Rp)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max={commissionType === "percent" ? 100 : undefined}
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:outline-none"
                />
              </div>
            </div>

            {userRole === "superadmin" && marketingProfiles.length > 0 && (
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Mitra Marketing Pemilik Kode</label>
                <select
                  value={marketingProfileId}
                  onChange={(e) => setMarketingProfileId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none"
                >
                  <option value="">-- Tanpa Marketing Khusus (Milik Platform Pusat) --</option>
                  {marketingProfiles.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.userName || "Affiliate"} ({m.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Kuota & Tanggal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Maks Kuota Pemakaian</label>
              <input
                type="number"
                min="0"
                value={maxUsage}
                onChange={(e) => setMaxUsage(e.target.value)}
                placeholder="Kosong = Unlimited"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Berlaku Mulai</label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Berlaku Sampai</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Applies to All Tenants */}
          {userRole === "superadmin" && (
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={appliesToAllTenants}
                onChange={(e) => setAppliesToAllTenants(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold text-slate-800 block">
                  Berlaku Otomatis untuk Seluruh Cabang / Outlet
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Jika dinonaktifkan, Anda dapat memilih cabang outlet mana saja yang menerima kode ini secara manual.
                </span>
              </div>
            </label>
          )}

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? "Menyimpan..." : initialData ? "Simpan Perubahan" : "Buat Kode"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
