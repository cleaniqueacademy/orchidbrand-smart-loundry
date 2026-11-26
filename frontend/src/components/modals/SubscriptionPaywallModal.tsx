import React from "react";
import { RefreshCw, LogOut, X } from "lucide-react";
import { User } from "../../types";
import { SubscriptionTab } from "../tabs/subscription/SubscriptionTab";
import { ModalWrapper } from "../common/ModalWrapper";

interface SubscriptionPaywallModalProps {
  isOpen: boolean;
  user: User | null;
  onClose?: () => void;
  onRefreshStatus?: () => Promise<boolean | void> | void;
  onLogout?: () => void;
}

export const SubscriptionPaywallModal: React.FC<SubscriptionPaywallModalProps> = ({
  isOpen,
  user,
  onClose,
  onRefreshStatus,
  onLogout,
}) => {
  if (!user) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      maxWidth="max-w-4xl"
      zIndex="z-[90]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kelola langganan"
        className="bg-white rounded-2xl w-full max-h-[92vh] flex flex-col border border-zinc-200 shadow-2xl overflow-hidden"
      >
        <div className="flex justify-between gap-3 items-center px-5 py-4 border-b border-zinc-100 shrink-0">
          <div>
            <h2 className="font-bold text-base text-zinc-900">Kelola Langganan Owner</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Perpanjang masa aktif outlet untuk kembali mengakses fitur penuh.
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <SubscriptionTab tenantId={user.tenantId || undefined} />
        </div>
        <div className="px-5 py-3.5 border-t border-zinc-100 bg-zinc-50/70 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => void onRefreshStatus?.()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 px-3.5 py-2 text-xs font-semibold text-zinc-700 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Periksa Aktivasi</span>
          </button>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 text-xs font-semibold text-rose-700 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};
