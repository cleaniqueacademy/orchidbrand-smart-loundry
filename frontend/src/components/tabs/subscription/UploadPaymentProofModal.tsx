import React, { useState, useEffect } from "react";
import { X, Upload, AlertCircle, Loader2, Zap } from "lucide-react";
import WhatsAppIcon from "../../common/WhatsAppIcon";
import { api, uploadFile } from "../../../utils/api";
import { SubscriptionInvoice } from "../../../types";
import { ModalWrapper } from "../../common/ModalWrapper";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(()=>()=>{if(previewUrl?.startsWith("blob:"))URL.revokeObjectURL(previewUrl);},[previewUrl]);
  useEffect(()=>{if(isOpen){setSelectedFile(null);setPreviewUrl(null);setErrorMsg(null);}},[isOpen,invoice?.id]);
  if (!invoice) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Ukuran file maksimal 5 MB.");
      return;
    }

    setSelectedFile(file);
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg("Pilih berkas bukti transfer untuk penyimpanan privat.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      let finalProofUrl = "";

      if (selectedFile) {
        const uploadRes = await uploadFile(selectedFile, "payments");
        if (!uploadRes.success || !uploadRes.data?.url) {
          throw new Error(uploadRes.message || "Gagal mengunggah file ke server.");
        }
        finalProofUrl = uploadRes.data.url;
      }

      const res = await api.post<{ success: boolean; message?: string }>(
        `/api/subscription/invoices/${invoice.id}/proof`,
        { proofUrl: finalProofUrl }
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
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full overflow-hidden">
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
                  {selectedFile?.type === "application/pdf" ? <p className="text-sm">PDF: {selectedFile.name}</p> : <img
                    src={previewUrl}
                    alt="Preview Bukti"
                    className="max-h-48 mx-auto rounded-xl shadow-xs border border-zinc-200 object-contain"
                  />}
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setSelectedFile(null);
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
                    Format JPG, PNG, WEBP, atau PDF (maks. 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
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

          {/* Booster WhatsApp Button */}
          <div className="pt-3 border-t border-zinc-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Ingin aktivasi instan tanpa menunggu?</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> Booster Prioritas
              </span>
            </div>
            <a
              href={`https://wa.me/6281223406368?text=${encodeURIComponent(
                `Halo Admin Cleanique, saya ingin konfirmasi perpanjangan langganan outlet:\n• No. Invoice: *#${invoice.invoiceNo}*\n• Outlet: *${invoice.outletName || "Cabang"}*\n• Total: *Rp ${invoice.finalAmount.toLocaleString("id-ID")}*\n• Durasi: *${invoice.durationMonths} periode (${invoice.durationMonths * 30} hari)*\n\nBukti transfer sudah saya upload. Tolong dibantu percepat approval (Booster) ya. Terima kasih!`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl py-2.5 font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>⚡ Booster Chat WhatsApp Admin</span>
            </a>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
};
