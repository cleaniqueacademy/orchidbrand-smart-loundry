import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  MessageCircle,
  RefreshCw,
  LogOut,
  Store,
  Calendar,
  ShieldAlert,
  CreditCard,
  QrCode,
  Copy,
  Check,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Download,
  Share2,
  FileCheck2,
  X,
} from "lucide-react";
import { User } from "../../types";
import {
  checkUserActiveStatus,
  getAdminWhatsAppUrl,
  DEFAULT_ADMIN_PHONE,
} from "../../utils/subscriptionUtils";
import { getDirectImageUrl } from "../../utils/googleDriveUtils";
import { useToast } from "../common/ToastContext";
import { ModalWrapper } from "../common/ModalWrapper";
import { api } from "../../utils/api";

interface InactiveAccountModalProps {
  isOpen: boolean;
  user: User | Partial<User> | null;
  onRefreshStatus?: () => Promise<boolean | void> | void;
  onLogout?: () => void;
  onClose?: () => void;
  isDismissable?: boolean;
}

interface PlatformPaymentInfo {
  platformName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  qrisInfo?: string;
  supportPhone?: string;
}

export const InactiveAccountModal: React.FC<InactiveAccountModalProps> = ({
  isOpen,
  user,
  onRefreshStatus,
  onLogout,
  onClose,
  isDismissable = false,
}) => {
  const toast = useToast();
  // Step 1: Info Status Akun Nonaktif / Kedaluwarsa
  // Step 2: Pembayaran Langsung (Tabs Rekening / QRIS) & Konfirmasi WA
  const [step, setStep] = useState<1 | 2>(1);
  const [paymentTab, setPaymentTab] = useState<"rekening" | "qris">("rekening");
  const [copiedRekening, setCopiedRekening] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkedNotice, setCheckedNotice] = useState<string | null>(null);

  const [paymentInfo, setPaymentInfo] = useState<PlatformPaymentInfo>({
    platformName: "Laundry Cleanique",
    bankName: "BCA",
    bankAccountNumber: "8830-1928-3341",
    bankAccountName: "PT CLEANIQUE SISTEM DIGITAL",
    qrisInfo: "",
    supportPhone: DEFAULT_ADMIN_PHONE,
  });

  // Fetch info rekening & QRIS dari platform settings
  useEffect(() => {
    if (isOpen) {
      api
        .get<{ success: boolean; data: PlatformPaymentInfo }>("/api/platform-settings/public")
        .then((res) => {
          if (res.success && res.data) {
            setPaymentInfo((prev) => ({
              ...prev,
              ...res.data,
            }));
          }
        })
        .catch(() => {
          // fallback default
        });
    }
  }, [isOpen]);

  // Reset step saat modal dibuka kembali
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCopiedRekening(false);
      setCheckedNotice(null);
    }
  }, [isOpen]);

  if (!user) return null;

  const statusInfo = checkUserActiveStatus(user as User);
  const adminPhone = paymentInfo.supportPhone || DEFAULT_ADMIN_PHONE;
  const waUrl = getAdminWhatsAppUrl(user, adminPhone);

  const handleCopyRekening = () => {
    const rekening = paymentInfo.bankAccountNumber || "";
    if (!rekening) return;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(rekening.replace(/\s+/g, ""));
      setCopiedRekening(true);
      toast.success("Berhasil Disalin", `Nomor rekening ${rekening} disalin ke papan klip.`);
      setTimeout(() => setCopiedRekening(false), 2500);
    }
  };

  const handleCheckStatus = async () => {
    if (!onRefreshStatus) return;
    setChecking(true);
    setCheckedNotice(null);

    try {
      const isNowActive = await onRefreshStatus();
      if (isNowActive) {
        toast.success(
          "Akun Berhasil Diaktifkan!",
          "Masa aktif Anda telah diperpanjang oleh Admin. Selamat bekerja!"
        );
        if (onClose) onClose();
      } else {
        setCheckedNotice(
          "Masa aktif akun masih berstatus kedaluwarsa/nonaktif. Silakan hubungi Admin Pusat terlebih dahulu."
        );
      }
    } catch {
      setCheckedNotice("Gagal menyinkronkan status akun. Silakan coba sesaat lagi.");
    } finally {
      setChecking(false);
    }
  };

  // WhatsApp confirmation url with proof reminder
  const cleanPhone = adminPhone.replace(/[^0-9]/g, "");
  const waConfirmText = encodeURIComponent(
    `Halo Admin Cleanique, saya ingin konfirmasi perpanjangan langganan untuk outlet:\n\n` +
      `🏪 Outlet: *${user.tenantName || "Laundry Cleanique"}*\n` +
      `🆔 ID Outlet: ${user.tenantId || user.id || "—"}\n` +
      `👤 Pemilik/Akun: ${user.name || "Owner"} (${user.email || ""})\n` +
      `💳 Metode: ${paymentTab === "rekening" ? `Transfer Rekening ${paymentInfo.bankName || "Bank"}` : "QRIS Cleanique"}\n\n` +
      `Berikut saya sertakan tangkapan layar (screenshot) bukti pembayaran yang sah untuk diverifikasi. Terima kasih!`
  );
  const waConfirmUrl = `https://wa.me/${cleanPhone}?text=${waConfirmText}`;

  const isInactiveStatus = statusInfo.isInactiveStatus;
  const directQrisUrl = getDirectImageUrl(paymentInfo.qrisInfo || "");

  const handleShareQris = async () => {
    if (navigator.share && directQrisUrl) {
      try {
        await navigator.share({
          title: "QRIS Pembayaran Cleanique",
          text: `QRIS Pembayaran Langganan ${user.tenantName || "Cleanique Laundry"}`,
          url: directQrisUrl,
        });
      } catch {
        window.open(directQrisUrl, "_blank");
      }
    } else if (directQrisUrl) {
      window.open(directQrisUrl, "_blank");
    }
  };

  return (
    <ModalWrapper
      isOpen={isOpen && !!user}
      onClose={isDismissable && onClose ? onClose : () => {}}
      maxWidth="max-w-md"
    >
      <div className="bg-white rounded-2xl w-full shadow-xl border border-slate-200 overflow-hidden relative text-slate-900">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="p-1 -ml-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {step === 1 ? "Status Akun" : "Pembayaran Langganan"}
            </span>
          </div>

          {isDismissable && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* STEP 1: INFO STATUS NONAKTIF / KEDALUWARSA                                */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="p-5 sm:p-6">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-3">
                {isInactiveStatus ? (
                  <ShieldAlert className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>

              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 mb-1.5">
                {isInactiveStatus ? "Akun Nonaktif" : "Masa Aktif Berakhir"}
              </span>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {isInactiveStatus ? "Akun Anda Dinonaktifkan" : "Masa Aktif Akun Habis"}
              </h2>

              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Operasional kasir dihentikan sementara. Selesaikan pembayaran untuk mengaktifkan kembali outlet Anda.
              </p>
            </div>

            {/* Compact Outlet & Expiry info */}
            <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-3.5 mb-4 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-blue-600" />
                  Outlet / Cabang:
                </span>
                <span className="font-semibold text-slate-900">
                  {user.tenantName || "Laundry Cleanique"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  Masa Aktif:
                </span>
                <div className="text-right">
                  <span className="font-semibold text-rose-600 font-mono">
                    {statusInfo.formattedExpiry}
                  </span>
                  {statusInfo.daysRemaining < 0 && (
                    <div className="text-[10px] text-rose-500">
                      Lewat {Math.abs(statusInfo.daysRemaining)} hari
                    </div>
                  )}
                </div>
              </div>
            </div>

            {checkedNotice && (
              <div className="mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>{checkedNotice}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>Bayar Sekarang</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Hubungi Admin via WhatsApp</span>
              </a>

              {onRefreshStatus && (
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={checking}
                  className="w-full py-1.5 px-3 text-slate-500 hover:text-slate-700 text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin text-blue-600" : ""}`} />
                  <span>{checking ? "Memeriksa..." : "Cek Status Terkini"}</span>
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-1 text-[11px] text-slate-400 hover:text-rose-600 flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Keluar Akun</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: PEMBAYARAN LANGSUNG (TABS REKENING / QRIS)                        */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="p-5 sm:p-6 space-y-3.5">
            {/* Simple 3-step inline reminder */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">1</span>
                Transfer
              </span>
              <span className="text-slate-300">➔</span>
              <span className="flex items-center gap-1 font-medium text-amber-700">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold">2</span>
                Simpan Bukti
              </span>
              <span className="text-slate-300">➔</span>
              <span className="flex items-center gap-1 font-medium text-emerald-700">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">3</span>
                Kirim WA
              </span>
            </div>

            {/* Notice Wajib Simpan Bukti Pembayaran */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 text-xs text-amber-900">
              <FileCheck2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-[11px] leading-relaxed">
                <strong>Wajib simpan bukti transfer</strong> (screenshot/struk) untuk dikirim ke WhatsApp Admin.
              </span>
            </div>

            {/* Tabs Rekening / QRIS */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setPaymentTab("rekening")}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  paymentTab === "rekening"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>No. Rekening</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentTab("qris")}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  paymentTab === "qris"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan QRIS</span>
              </button>
            </div>

            {/* Tab 1: Rekening Bank */}
            {paymentTab === "rekening" && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Bank Tujuan:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {paymentInfo.bankName || "BCA"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Nomor Rekening:</span>
                  <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-sm sm:text-base font-mono font-bold text-slate-900 tracking-wider">
                      {paymentInfo.bankAccountNumber || "8830-1928-3341"}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyRekening}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                        copiedRekening
                          ? "bg-emerald-600 text-white"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      {copiedRekening ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                  <span className="text-slate-500">Atas Nama:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {paymentInfo.bankAccountName || "PT CLEANIQUE SISTEM DIGITAL"}
                  </span>
                </div>
              </div>
            )}

            {/* Tab 2: QRIS */}
            {paymentTab === "qris" && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2.5">
                {directQrisUrl ? (
                  <div className="space-y-2">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 inline-block shadow-xs">
                      <img
                        src={directQrisUrl}
                        alt="QRIS Cleanique"
                        className="max-h-48 max-w-full mx-auto object-contain rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes("drive.google.com/thumbnail")) {
                            target.src = `https://drive.google.com/thumbnail?id=${paymentInfo.qrisInfo}&sz=w800`;
                          }
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Scan dari BCA mobile, Livin, BRImo, GoPay, OVO, ShopeePay
                    </p>

                    <div className="flex items-center justify-center gap-2 pt-0.5">
                      <a
                        href={directQrisUrl}
                        download="qris-cleanique.png"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleShareQris}
                        className="px-3 py-1 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Buka / Share</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 space-y-1">
                    <QrCode className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs text-slate-500">Tautan QRIS belum dikonfigurasi.</p>
                    <p className="text-[11px] text-slate-400">Silakan gunakan opsi No. Rekening.</p>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>

              <a
                href={waConfirmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Kirim Bukti ke WhatsApp</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            </div>
          </div>
        )}

        {/* Subtle Footer */}
        <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 text-center text-[10px] text-slate-400">
          Laundry Cleanique • Layanan Kasir Multi-Cabang
        </div>
      </div>
    </ModalWrapper>
  );
};
