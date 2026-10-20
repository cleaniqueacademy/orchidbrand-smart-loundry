import React, { useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { ModalWrapper } from "../common/ModalWrapper";

interface QrisPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrisUrl?: string;
  merchantName?: string;
  nmid?: string;
  amount?: number;
  invoiceNo?: string;
  downloadFileName?: string;
}

export const QrisPreviewModal: React.FC<QrisPreviewModalProps> = ({
  isOpen,
  onClose,
  qrisUrl = "/qris.png",
  merchantName = "LAUNDRY CLEANIQUE",
  nmid = "ID1026618371243",
  amount,
  invoiceNo,
  downloadFileName = "QRIS-Laundry-Cleanique.png",
}) => {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleCopyNmid = async () => {
    try {
      await navigator.clipboard.writeText(nmid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(qrisUrl);
      if (!response.ok) throw new Error("Gagal mengambil file gambar");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Download blob gagal, fallback ke direct anchor download:", err);
      const link = document.createElement("a");
      link.href = qrisUrl;
      link.download = downloadFileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloading(false), 400);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">QRIS Pembayaran Resmi</h3>
              <p className="text-[11px] text-emerald-100 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Standar Pembayaran Nasional (GPN)</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Optional Invoice / Amount Banner */}
          {(amount || invoiceNo) && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block font-medium">
                  {invoiceNo ? `Tagihan Invoice #${invoiceNo}` : "Nominal Transfer:"}
                </span>
                {amount && (
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    Rp {amount.toLocaleString("id-ID")}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                Bebas Admin
              </span>
            </div>
          )}

          {/* QR Code Card Frame */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/60 shadow-sm flex flex-col items-center text-center space-y-3">
            <div className="flex items-center justify-between w-full pb-2 border-b border-zinc-100 dark:border-slate-700/60">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                QRIS Dinamis / Statis Resmi
              </span>
              <span className="text-[10px] font-bold text-zinc-400">Merchant GPN</span>
            </div>

            {/* QR Image */}
            <div className="relative group bg-white p-2.5 rounded-xl border border-zinc-100 shadow-inner">
              <img
                src={qrisUrl}
                alt="QRIS Pembayaran Laundry Cleanique"
                className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-lg"
              />
            </div>

            {/* Merchant Details */}
            <div className="space-y-1 w-full pt-1">
              <h4 className="font-black text-zinc-900 dark:text-white text-base tracking-tight">
                {merchantName}
              </h4>

              <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300 font-mono">
                <span>NMID:</span>
                <span className="font-bold bg-zinc-100 dark:bg-slate-700 px-2 py-0.5 rounded text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-slate-600">
                  {nmid}
                </span>
                <button
                  type="button"
                  onClick={handleCopyNmid}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 transition cursor-pointer"
                  title="Salin NMID"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? "Tersalin" : "Salin"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Supported Apps List */}
          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-slate-800/50 border border-zinc-100 dark:border-slate-800 space-y-1.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dapat Di-Scan Melalui Seluruh Aplikasi:</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              <strong>Mobile Banking:</strong> BCA, Mandiri, BRI, BNI, BSI, CIMB, Permata, Danamon, Jago, Seabank, dll.
              <br />
              <strong>E-Wallet:</strong> GoPay, OVO, Dana, ShopeePay, LinkAja, AstraPay.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-zinc-50 dark:bg-slate-800/80 border-t border-zinc-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-slate-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer disabled:opacity-70"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengunduh...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Unduh Gambar QRIS</span>
              </>
            )}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};
