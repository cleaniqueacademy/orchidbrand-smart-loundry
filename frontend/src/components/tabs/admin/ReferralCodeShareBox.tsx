import React, { useState, useEffect } from "react";
import { X, Copy, Check, Share2, MessageCircle, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { ReferralCode } from "../../../types";
import { ModalWrapper } from "../../common/ModalWrapper";

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

  const origin = typeof window !== "undefined" ? window.location.origin : "https://cleaniquelaundry.com";
  const codeVal = code?.code || "";
  const shareUrl = `${origin}/register?ref=${codeVal}`;

  const discountText =
    code?.discountType === "percent"
      ? `Diskon ${code?.discountValue}%`
      : `Potongan Rp ${(code?.discountValue || 5000).toLocaleString("id-ID")}`;

  const shareText = `Halo! Gunakan kode referral "${codeVal}" saat mendaftar di Laundry Cleanique dan dapatkan ${discountText} serta GRATIS uji coba 7 hari!\n\nDaftar sekarang melalui link berikut:\n${shareUrl}`;

  // Generate QR Code unconditionally (Rules of Hooks compliant)
  useEffect(() => {
    if (!isOpen || !codeVal) {
      setQrUrl("");
      return;
    }

    QRCode.toDataURL(shareUrl, { width: 220, margin: 2 })
      .then((url) => setQrUrl(url))
      .catch((err) => console.error("QR Code error:", err));
  }, [isOpen, codeVal, shareUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = () => {
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank");
  };

  if (!isOpen || !code) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900">
        {/* Header - Clean Light Mode */}
        <div className="h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 w-full" />
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Bagikan Kode Referral
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Promosikan dan bagikan kode referral tim marketing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Card Highlight */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/70 to-indigo-50/70 border border-blue-200 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-3 py-0.5 rounded-full border border-blue-200">
              {discountText}
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-wider font-mono mt-2.5 select-all">
              {code.code}
            </div>
            <p className="text-xs text-slate-600 mt-1 font-medium">{code.name}</p>
          </div>

          {/* QR Code */}
          {qrUrl && (
            <div className="flex flex-col items-center justify-center pt-1">
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm inline-block">
                <img src={qrUrl} alt="QR Code Referral" className="w-36 h-36 mx-auto" />
              </div>
              <span className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <QrCode className="w-3.5 h-3.5 text-blue-600" /> Scan QR untuk langsung ke form registrasi
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
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 select-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs ${
                  copied
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Bagikan Langsung ke WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
};
