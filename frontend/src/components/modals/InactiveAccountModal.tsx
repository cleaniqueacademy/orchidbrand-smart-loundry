import React, { useState } from "react";
import {
  AlertTriangle,
  MessageCircle,
  RefreshCw,
  LogOut,
  Store,
  Mail,
  Calendar,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { User } from "../../types";
import {
  checkUserActiveStatus,
  getAdminWhatsAppUrl,
  DEFAULT_ADMIN_PHONE,
} from "../../utils/subscriptionUtils";
import { useToast } from "../common/ToastContext";

interface InactiveAccountModalProps {
  isOpen: boolean;
  user: User | Partial<User> | null;
  onRefreshStatus?: () => Promise<boolean | void> | void;
  onLogout?: () => void;
  onClose?: () => void;
  isDismissable?: boolean;
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
  const [checking, setChecking] = useState(false);
  const [checkedNotice, setCheckedNotice] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const statusInfo = checkUserActiveStatus(user as User);
  const waUrl = getAdminWhatsAppUrl(user, DEFAULT_ADMIN_PHONE);

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
      setCheckedNotice("Gagal memverifikasi status ke server. Periksa koneksi backend Anda.");
    } finally {
      setChecking(false);
    }
  };

  const isExpired = statusInfo.isExpired;
  const isInactiveStatus = statusInfo.isInactiveStatus;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-zinc-200 overflow-hidden relative animate-in zoom-in-95 duration-200">
        {/* Top Header Accent Banner */}
        <div className="h-3 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600 w-full" />

        <div className="p-6 sm:p-8">
          {/* Main Warning Beacon */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <div className="w-18 h-18 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/10 ring-8 ring-rose-50/60">
                {isInactiveStatus ? (
                  <ShieldAlert className="w-9 h-9" />
                ) : (
                  <AlertTriangle className="w-9 h-9 animate-pulse" />
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600" />
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              {isInactiveStatus ? "Akun Nonaktif" : "Masa Aktif Berakhir"}
            </span>

            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              {isInactiveStatus ? "Akun Anda Sedang Dinonaktifkan" : "Masa Aktif Akun Telah Habis"}
            </h2>

            <p className="text-xs sm:text-sm text-zinc-600 mt-2 max-w-md leading-relaxed">
              Akses operasional kasir, pembuatan nota baru, dan pencatatan arus kas dihentikan
              sementara waktu. Silakan menghubungi Admin untuk memperpanjang masa aktif akun Anda.
            </p>
          </div>

          {/* User & Outlet Identity Card */}
          <div className="bg-zinc-50 rounded-2xl border border-zinc-200/80 p-4 mb-6 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1 flex items-center justify-between">
              <span>Informasi Akun Laundry</span>
              <span className="text-zinc-500 font-normal">ID: {user.id || "—"}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-zinc-200/60 text-xs">
              <div className="flex items-center gap-2 text-zinc-600">
                <div className="w-6 h-6 rounded-md bg-zinc-200 flex items-center justify-center font-bold text-[10px] text-zinc-700">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : "US"}
                </div>
                <span className="font-semibold text-zinc-900">{user.name || "Pengguna"}</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
                <Mail className="w-3 h-3 text-zinc-400" />
                {user.email || "—"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-zinc-200/60 text-xs">
              <div className="flex items-center gap-1.5 text-zinc-600">
                <Store className="w-3.5 h-3.5 text-blue-600" />
                <span>Cabang:</span>
              </div>
              <span className="font-semibold text-zinc-900">
                {user.tenantName || "Orchid Laundry"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 text-xs">
              <div className="flex items-center gap-1.5 text-zinc-600">
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                <span>Masa Aktif:</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-rose-700">
                  {statusInfo.formattedExpiry}
                </span>
                {statusInfo.daysRemaining < 0 && (
                  <div className="text-[10px] text-rose-500">
                    Kedaluwarsa {Math.abs(statusInfo.daysRemaining)} hari yang lalu
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feedback notice if user just checked status */}
          {checkedNotice && (
            <div className="mb-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>{checkedNotice}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary Action: Direct WhatsApp to Admin */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold flex flex-col items-center justify-center shadow-lg shadow-emerald-600/30 transition group cursor-pointer"
            >
              <div className="flex items-center gap-2 text-sm">
                <MessageCircle className="w-5 h-5 fill-white/20 text-white group-hover:scale-110 transition-transform" />
                <span>Hubungi Admin</span>
              </div>
              <span className="text-[11px] font-normal text-emerald-100 mt-0.5">
                Kirim permohonan perpanjangan masa aktif
              </span>
            </a>

            {/* Secondary Action: Realtime Status Check */}
            {onRefreshStatus && (
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100 text-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin text-blue-600" : ""}`} />
                <span>
                  {checking ? "Memeriksa Status..." : "Periksa Status"}
                </span>
              </button>
            )}

            {/* Logout / Switch Account */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2 px-3 text-xs text-zinc-500 hover:text-zinc-800 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>
            )}

            {/* Dismiss button if allow dismiss (for preview/admin test) */}
            {isDismissable && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full text-center text-[11px] text-zinc-400 hover:text-zinc-600 pt-1"
              >
                Tutup Sementara
              </button>
            )}
          </div>
        </div>

        {/* Footer Support Info */}
        <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-3 text-center text-[11px] text-zinc-400">
          Orchid Brand Smart Laundry • Layanan Berlangganan Kasir Multi-Cabang
        </div>
      </div>
    </div>
  );
};
