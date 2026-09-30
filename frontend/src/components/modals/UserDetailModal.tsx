import React, { useState } from "react";
import {
  X,
  Mail,
  Store,
  Calendar,
  Clock,
  KeyRound,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";
import { User as UserType, Role, Tenant } from "../../types";
import { checkUserActiveStatus } from "../../utils/subscriptionUtils";
import { ExtendSubscriptionModal } from "./ExtendSubscriptionModal";
import { ResetPasswordModal } from "./ResetPasswordModal";

// --- Types -----------------------------------------------------------------

interface UserDetailModalProps {
  readonly isOpen: boolean;
  readonly user: UserType | null;
  readonly tenant?: Tenant | null;
  readonly onClose: () => void;
  readonly onToggleStatus: (
    userId: string,
    currentStatus: "active" | "inactive"
  ) => void;
  readonly onDeleteUser: (id: string) => void;
  readonly onExtendSubscription?: (
    userId: string,
    payload: { days?: number; newDate?: string; activate: boolean }
  ) => Promise<void>;
  readonly onUpdateSubscription?: (userId: string, subscriptionUntil: string) => void;
  readonly onResetPassword?: (userId: string, newPassword: string) => Promise<boolean>;
}

// --- Role config -----------------------------------------------------------

const roleBadgeConfig: Record<Role, { label: string; className: string; desc: string }> =
  {
    superadmin: {
      label: "Super Admin",
      className: "bg-blue-900 text-white border-blue-900",
      desc: "Akses penuh platform, seluruh cabang, audit log, dan perpanjangan lisensi.",
    },
    tenant_owner: {
      label: "Tenant Owner",
      className: "bg-blue-50 text-blue-800 border-blue-200",
      desc: "Pemilik cabang toko. Akses pesanan, kasir, laporan laba rugi, dan WhatsApp cabang.",
    },
    staff: {
      label: "Kasir / Staff",
      className: "bg-zinc-100 text-zinc-700 border-zinc-200",
      desc: "Staf operasional kasir & cuci. Input pesanan, serah terima cucian, dan shift kasir.",
    },
    marketing: {
      label: "Tim Marketing",
      className: "bg-indigo-50 text-indigo-800 border-indigo-200",
      desc: "Divisi pemasaran internal IndoTech. Mengelola kode kupon promosi dan ekspansi outlet baru.",
    },
  };

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateStr}T23:59:59`));
}

interface SubscriptionBarProps {
  readonly daysRemaining: number;
  readonly isExpired: boolean;
}

function SubscriptionBar({ daysRemaining, isExpired }: SubscriptionBarProps): React.ReactElement {
  const barClass = isExpired
    ? "bg-rose-500 w-full"
    : daysRemaining <= 7
    ? "bg-amber-500 w-1/4"
    : daysRemaining <= 30
    ? "bg-yellow-400 w-1/2"
    : "bg-emerald-500 w-3/4";

  return (
    <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${barClass}`} />
    </div>
  );
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  isOpen,
  user,
  tenant,
  onClose,
  onToggleStatus,
  onDeleteUser,
  onExtendSubscription,
  onUpdateSubscription,
  onResetPassword,
}) => {
  const [showExtend, setShowExtend] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);
  const [showRawMeta, setShowRawMeta] = useState(false);

  if (!isOpen || !user) return null;

  const statusInfo = checkUserActiveStatus(user);
  const roleConf = roleBadgeConfig[user.role];
  const isSuperAdmin = user.role === "superadmin";

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Detail pengguna: ${user.name}`}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className="bg-white rounded-2xl border border-zinc-200 shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-zinc-100">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-blue-900 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-zinc-900 text-base leading-tight truncate">
                    {user.name}
                  </h2>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${roleConf?.className}`}
                  >
                    {roleConf?.label ?? user.role}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1.5 truncate">
                  <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition cursor-pointer shrink-0 ml-2"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Status akun */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/50">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Status Akun
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {isSuperAdmin
                    ? "Akun administrator tidak dapat dinonaktifkan."
                    : "Nonaktifkan untuk langsung memblokir login."}
                </p>
              </div>
              <button
                type="button"
                disabled={isSuperAdmin}
                onClick={() => onToggleStatus(user.id, user.status ?? "active")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  isSuperAdmin
                    ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-default"
                    : (user.status ?? "active") === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                    : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 cursor-pointer"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSuperAdmin
                      ? "bg-zinc-400"
                      : (user.status ?? "active") === "active"
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  }`}
                />
                {isSuperAdmin
                  ? "Permanen Aktif"
                  : (user.status ?? "active") === "active"
                  ? "Aktif · klik untuk nonaktifkan"
                  : "Nonaktif · klik untuk aktifkan"}
              </button>
            </div>

            {/* Peran & Cabang */}
            <div className="p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/50 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Peran &amp; Cabang
              </p>
              <div className="flex items-start gap-2 text-xs">
                <Shield className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                <span className="text-zinc-600 leading-relaxed">{roleConf?.desc}</span>
              </div>
              <div className="flex items-center gap-2 text-xs pt-1 border-t border-zinc-200/50">
                <Store className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-zinc-700 font-medium">
                  {isSuperAdmin
                    ? "Pusat (Seluruh Cabang)"
                    : tenant?.outletName ?? user.tenantName ?? "-"}
                </span>
              </div>
            </div>

            {/* Masa Aktif Langganan */}
            {!isSuperAdmin && (
              <div className="p-3.5 rounded-xl border border-zinc-100 bg-zinc-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Masa Aktif Langganan
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.statusBadge.className}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.statusBadge.dotColor}`} />
                    <span>{statusInfo.statusBadge.label}</span>
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Batas tanggal:</span>
                    <span className="font-mono font-bold text-zinc-900">
                      {user.subscriptionUntil
                        ? formatDate(user.subscriptionUntil)
                        : "Belum diatur"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Sisa waktu:</span>
                    <span className="font-bold text-zinc-800">
                      {statusInfo.isExpired
                        ? "Sudah kedaluwarsa"
                        : `${statusInfo.daysRemaining} hari lagi`}
                    </span>
                  </div>
                </div>
                <SubscriptionBar
                  daysRemaining={statusInfo.daysRemaining}
                  isExpired={statusInfo.isExpired}
                />
                <button
                  type="button"
                  onClick={() => setShowExtend(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 text-xs font-semibold transition cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Perpanjang Masa Aktif
                </button>
              </div>
            )}

            {/* Audit info */}
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-zinc-100 text-xs text-zinc-500">
              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>
                Terdaftar sejak{" "}
                <strong className="text-zinc-700">
                  {new Date(user.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
              </span>
              <span className="ml-auto font-mono text-[10px] text-zinc-400 truncate hidden sm:block">
                ID: {user.id}
              </span>
            </div>

            {/* Metadata collapsible */}
            {user.metadata && (
              <div className="rounded-xl border border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowRawMeta((s) => !s)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
                >
                  <span>Metadata Teknis</span>
                  {showRawMeta ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {showRawMeta && (
                  <pre className="px-3.5 pb-3 text-[10px] text-zinc-500 font-mono whitespace-pre-wrap break-all border-t border-zinc-100">
                    {user.metadata}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-5 py-4 border-t border-zinc-100 bg-zinc-50/50 rounded-b-2xl">
            <button
              type="button"
              onClick={() => setShowResetPw(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-blue-50 hover:border-blue-200 text-zinc-700 hover:text-blue-800 text-xs font-medium transition cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Reset Password
            </button>
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 text-xs font-medium transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={isSuperAdmin}
              onClick={() => {
                if (isSuperAdmin) return;
                onDeleteUser(user.id);
                onClose();
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition ${
                isSuperAdmin
                  ? "border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed"
                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus
            </button>
          </div>
        </div>
      </div>

      <ExtendSubscriptionModal
        isOpen={showExtend}
        user={user}
        onClose={() => setShowExtend(false)}
        onExtend={async (userId, payload) => {
          if (onExtendSubscription) {
            await onExtendSubscription(userId, payload);
          } else if (payload.newDate && onUpdateSubscription) {
            onUpdateSubscription(userId, payload.newDate);
          }
          setShowExtend(false);
        }}
      />

      <ResetPasswordModal
        isOpen={showResetPw}
        user={user}
        onClose={() => setShowResetPw(false)}
        onResetPassword={async (userId, newPassword) => {
          if (onResetPassword) {
            const ok = await onResetPassword(userId, newPassword);
            if (ok) setShowResetPw(false);
            return ok;
          }
          return false;
        }}
      />
    </>
  );
};
