import React, { useState, useEffect } from "react";
import { X, Copy, Check, Share2, MessageCircle, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { ReferralCode } from "../../../types";

interface ReferralCodeShareBoxProps {
  isOpen: boolean;
  onClose: () => void;
  code: ReferralCode | null;
}

export const ReferralCodeShareBox: React.FC<ReferralCodeShareBoxProps> = ({
  isOpen,
  onClose,
  code,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");

  if (!isOpen || !code) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://cleaniquelaundry.com";
  const shareUrl = `${origin}/register?ref=${code.code}`;

  const discountText =
    code.discountType === "percent"
      ? `Diskon ${code.discountValue}%`
      : `Potongan Rp ${code.discountValue.toLocaleString("id-ID")}`;

  const shareText = `Halo! Gunakan kode referral "${code.code}" saat mendaftar di Laundry Cleanique dan dapatkan ${discountText} serta GRATIS uji coba 7 hari!\n\nDaftar sekarang melalui link berikut:\n${shareUrl}`;

  // Generate QR Code
  useEffect(() => {
    QRCode.toDataURL(shareUrl, { width: 220, margin: 2 })
      .then((url) => setQrUrl(url))
      .catch((err) => console.error("QR Code error:", err));
  }, [shareUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Bagikan Kode Referral</h3>
              <p className="text-xs text-blue-100 mt-0.5">Promosikan dan raih komisi affiliate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Card Highlight */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
              {discountText}
            </span>
            <div className="text-2xl font-black text-slate-800 tracking-wider font-mono mt-2 select-all">
              {code.code}
            </div>
            <p className="text-xs text-slate-500 mt-1">{code.name}</p>
          </div>

          {/* QR Code */}
          {qrUrl && (
            <div className="flex flex-col items-center justify-center pt-1">
              <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs inline-block">
                <img src={qrUrl} alt="QR Code Referral" className="w-36 h-36 mx-auto" />
              </div>
              <span className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5" /> Scan QR untuk langsung ke form registrasi
              </span>
            </div>
          )}

          {/* Share Link Input Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Link Pendaftaran</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 select-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                onClick={handleCopy}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                  copied
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Salin
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div className="pt-2">
            <button
              onClick={handleWhatsAppShare}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              Bagikan ke WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
