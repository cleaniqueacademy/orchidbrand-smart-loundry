import React, { useState } from "react";
import { X, Upload, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../../utils/api";
import { SubscriptionInvoice } from "../../../types";

interface UploadPaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SubscriptionInvoice | null;
  onSuccess: () => void;
}

export const UploadPaymentProofModal: React.FC<UploadPaymentProofModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const [proofUrl, setProofUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran file maksimal 5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setProofUrl(base64);
      setPreviewUrl(base64);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofUrl.trim()) {
      setErrorMsg("Harap pilih foto bukti transfer atau masukkan tautan bukti.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.post<{ success: boolean; message?: string }>(
        `/api/subscription/invoices/${invoice.id}/proof`,
        { proofUrl }
      );

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.message || "Gagal mengunggah bukti pembayaran.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat mengunggah bukti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-100">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900">
              Unggah Bukti Transfer
            </h3>
            <span className="text-xs text-zinc-500 block mt-0.5">
              Invoice #{invoice.invoiceNo} • Rp {invoice.finalAmount.toLocaleString("id-ID")}
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Area File Upload */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-2">
              Foto Struk / Tangkapan Layar Bukti Transfer
            </label>
            <div className="border-2 border-dashed border-zinc-200 hover:border-blue-500 rounded-xl p-5 text-center transition-all bg-zinc-50/50">
              {previewUrl ? (
                <div className="space-y-3">
                  <img
                    src={previewUrl}
                    alt="Preview Bukti"
                    className="max-h-48 mx-auto rounded-xl shadow-xs border border-zinc-200 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setProofUrl("");
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold cursor-pointer"
                  >
                    Ganti Foto
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-2 shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-800">
                    Klik untuk pilih gambar
                  </span>
                  <span className="text-[11px] text-zinc-400 mt-0.5">
                    Format JPG, PNG, atau WEBP (maks. 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Atau Masukkan URL Gambar */}
          <div>
            <label className="block text-xs font-bold text-zinc-800 mb-1">
              Atau Tautan Gambar (Opsional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={proofUrl.startsWith("data:") ? "" : proofUrl}
              onChange={(e) => {
                setProofUrl(e.target.value);
                setPreviewUrl(e.target.value || null);
              }}
              className="w-full px-3.5 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
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
              className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Kirim Bukti Pembayaran</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
