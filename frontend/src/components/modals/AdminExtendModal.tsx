import React, { useState } from "react";
import {
  Calendar,
  CreditCard,
  Clock,
  Sparkles,
  CheckCircle2,
  X,
  Tag,
  DollarSign,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Tenant } from "../../types";
import { authHeaders } from "../../utils/api";
import { useToast } from "../common/ToastContext";

interface AdminExtendModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: Tenant | null;
  onSuccess: () => void;
}

export const AdminExtendModal: React.FC<AdminExtendModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onSuccess,
}) => {
  const toast = useToast();
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !tenant) return null;

  const hasReferral = Boolean(tenant.referralCodeId || tenant.source === "referral");
  const pricePerMonth = hasReferral ? 55000 : 60000;
  const totalAmount = pricePerMonth * durationMonths;

  const currentExpiry = tenant.subscriptionUntil || new Date().toISOString().slice(0, 10);
  const curDate = new Date(currentExpiry);
  const now = new Date();
  const baseDate = curDate > now ? curDate : now;
  const estimatedNewExpiry = new Date(baseDate.getTime() + durationMonths * 30 * 86400000)
    .toISOString()
    .slice(0, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/admin-extend", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          tenantId: tenant.id,
          durationMonths,
          notes,
          paymentProofUrl: proofUrl,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          "Perpanjangan Berhasil!",
          `Masa aktif ${tenant.outletName} diperpanjang hingga ${json.data?.newExpiry || estimatedNewExpiry}. Kas masuk tercatat Rp ${totalAmount.toLocaleString("id-ID")}.`
        );
        onSuccess();
        onClose();
      } else {
        toast.error("Gagal Memperpanjang", json.message || "Terjadi kesalahan.");
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 space-y-5">
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="font-bold text-zinc-900 text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Perpanjang Masa Aktif Outlet
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Pembaruan masa aktif akan otomatis tercatat sebagai kas masuk di Buku Kas Platform.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-xl font-bold leading-none p-1 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Info Outlet & Status Referral */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase">Outlet</span>
              <div className="font-extrabold text-sm text-zinc-900">{tenant.outletName}</div>
              <div className="text-xs text-zinc-500">ID: {tenant.id}</div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase">Kedaluwarsa Saat Ini</span>
              <div className="font-mono text-xs font-bold text-zinc-800">{currentExpiry}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-indigo-600" />
              <span>Status Referral:</span>
            </div>
            {hasReferral ? (
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Punya Referral (Tarif Rp 55.000/bln)
              </span>
            ) : (
              <span className="font-semibold text-zinc-600 bg-zinc-200/60 px-2 py-0.5 rounded">
                Tanpa Referral (Tarif Rp 60.000/bln)
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pilihan Durasi */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-2">
              Pilih Durasi Perpanjangan *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { months: 1, label: "1 Bulan" },
                { months: 3, label: "3 Bulan" },
                { months: 6, label: "6 Bulan" },
                { months: 12, label: "1 Tahun" },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.months}
                  onClick={() => setDurationMonths(opt.months)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition cursor-pointer ${
                    durationMonths === opt.months
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                      : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rincian Kalkulasi Harga & Tanggal Baru */}
          <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-2">
            <div className="flex justify-between items-center text-zinc-600">
              <span>Tarif Bulanan:</span>
              <span className="font-semibold">Rp {pricePerMonth.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-600">
              <span>Estimasi Masa Aktif Baru:</span>
              <span className="font-mono font-bold text-indigo-700">{estimatedNewExpiry}</span>
            </div>
            <div className="pt-2 border-t border-indigo-200/60 flex justify-between items-baseline font-black text-sm">
              <span className="text-zinc-800">Total Kas Masuk Platform:</span>
              <span className="text-indigo-700 text-base">
                Rp {totalAmount.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Link Bukti & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Link Bukti Transfer (Opsional)
              </label>
              <input
                type="text"
                placeholder="Link / URL bukti transfer"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Catatan Admin (Opsional)
              </label>
              <input
                type="text"
                placeholder="Misal: Bukti via WA Pak Budi"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi & Masuk ke Kas Platform</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
