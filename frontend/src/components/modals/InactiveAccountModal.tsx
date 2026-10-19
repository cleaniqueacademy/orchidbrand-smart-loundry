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
  Tag,
  Loader2,
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

interface TenantPricingInfo {
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  referralCodeId?: string | null;
  plan?: { name: string };
}

const DEFAULT_PRICING: TenantPricingInfo = {
  basePrice: 60000,
  discountAmount: 0,
  finalPrice: 60000,
  plan: { name: "Paket Bulanan" },
};

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
  const [checking, setChecking] = useState(false);
  const [checkedNotice, setCheckedNotice] = useState<string | null>(null);
  const [pricing, setPricing] = useState<TenantPricingInfo>(DEFAULT_PRICING);
  const [loadingPricing, setLoadingPricing] = useState(false);

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
        .catch(() => {});
    }
  }, [isOpen]);

  // Fetch pricing tenant (harga + cek referral)
  useEffect(() => {
    if (isOpen && user) {
      const tenantId = (user as any).tenantId || (user as any).id || "";
      setLoadingPricing(true);
      const queryParam = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
      api
        .get<{ success: boolean; data: TenantPricingInfo }>(
          `/api/subscription/pricing${queryParam}`
        )
        .then((res) => {
          if (res && res.success && res.data) {
            setPricing(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingPricing(false));
    }
  }, [isOpen, user]);

  // Reset step saat modal dibuka kembali
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCheckedNotice(null);
    }
  }, [isOpen]);

  if (!user) return null;

  const statusInfo = checkUserActiveStatus(user as User);
  const adminPhone = paymentInfo.supportPhone || DEFAULT_ADMIN_PHONE;
  const waUrl = getAdminWhatsAppUrl(user, adminPhone);


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
  const nominalFormatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(pricing?.finalPrice || 60000);

  const referralNotice =
    pricing?.discountAmount > 0
      ? ` (Voucher Referral Aktif: Hemat ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(pricing.discountAmount)})`
      : "";

  const waConfirmText = encodeURIComponent(
    `Halo Admin Cleanique, saya ingin konfirmasi perpanjangan langganan untuk outlet:\n\n` +
      `🏪 Outlet: *${user.tenantName || "Laundry Cleanique"}*\n` +
      `🆔 ID Outlet: ${user.tenantId || user.id || "—"}\n` +
      `👤 Pemilik/Akun: ${user.name || "Owner"} (${user.email || ""})\n` +
      `💳 Nominal: ${nominalFormatted}/bln${referralNotice}\n` +
      `💳 Metode: QRIS Statis Cleanique\n\n` +
      `Berikut saya sertakan tangkapan layar (screenshot) bukti pembayaran yang sah untuk diverifikasi. Terima kasih!`
  );
  const waConfirmUrl = `https://wa.me/${cleanPhone}?text=${waConfirmText}`;

  const isInactiveStatus = statusInfo.isInactiveStatus;
  const directQrisUrl = (paymentInfo.qrisInfo && !paymentInfo.qrisInfo.includes("qris-official.png"))
    ? getDirectImageUrl(paymentInfo.qrisInfo)
    : "/qris.png";

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

              {/* Harga Langganan & Info Referral */}
              <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                {/* Badge referral jika tenant punya kode referral */}
                {pricing.referralCodeId && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Tag className="w-3 h-3 text-emerald-600" />
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Kode Referral Aktif
                    </span>
                  </div>
                )}

                {pricing.discountAmount > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 line-through">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(pricing.basePrice)}
                      /bln
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Hemat {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(pricing.discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1 text-xs">
                    <CreditCard className="w-3 h-3 text-blue-500" />
                    Biaya Perpanjangan:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {loadingPricing && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(pricing.finalPrice)}
                      <span className="font-normal text-slate-400 text-xs">/bln</span>
                    </span>
                  </div>
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

            {/* Tampilan Pembayaran QRIS Statis Resmi */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-200">
                <span className="font-bold text-slate-800">LAUNDRY CLEANIQUE</span>
                <span className="font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">NMID: ID1026618371243</span>
              </div>

              <div className="space-y-2">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 inline-block shadow-sm">
                  <img
                    src={directQrisUrl || "/qris.png"}
                    alt="QRIS Cleanique"
                    className="max-h-52 max-w-full mx-auto object-contain rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.endsWith("/qris.png")) {
                        target.src = "/qris.png";
                      }
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  Scan dari <strong>BCA, Mandiri, BRI, BNI, GoPay, OVO, Dana, ShopeePay</strong> & seluruh mobile banking di Indonesia.
                </p>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <a
                    href={directQrisUrl || "/qris.png"}
                    download="QRIS-Laundry-Cleanique.png"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Gambar</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleShareQris}
                    className="px-3.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Buka / Share</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs bg-emerald-50/80 border border-emerald-200/80 rounded-xl px-3.5 py-2.5 mt-2">
                  <div className="flex flex-col text-left">
                    <span className="text-slate-700 font-semibold flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      Nominal Bayar:
                    </span>
                    {pricing.discountAmount > 0 && (
                      <span className="text-[10px] text-emerald-700 font-medium ml-4.5">
                        Diskon Referral Aktif: Hemat {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(pricing.discountAmount)}
                      </span>
                    )}
                  </div>
                  <span className="font-extrabold text-emerald-700 font-mono text-base">
                    {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(pricing.finalPrice)}
                    <span className="text-[10px] font-normal text-slate-400">/bln</span>
                  </span>
                </div>
              </div>
            </div>

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
