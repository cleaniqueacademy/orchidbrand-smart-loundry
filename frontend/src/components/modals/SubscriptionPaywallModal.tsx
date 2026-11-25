import React from "react";
import { User } from "../../types";
import { SubscriptionTab } from "../tabs/subscription/SubscriptionTab";
interface SubscriptionPaywallModalProps {
  isOpen: boolean; user: User | null; onClose?: () => void;
  onRefreshStatus?: () => Promise<boolean | void> | void; onLogout?: () => void;
}
export const SubscriptionPaywallModal: React.FC<SubscriptionPaywallModalProps> = ({ isOpen, user, onClose, onRefreshStatus, onLogout }) => {
  if (!isOpen || !user) return null;
  return <div role="dialog" aria-modal="true" aria-label="Kelola langganan" className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-3">
    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4">
      <div className="flex justify-between gap-3 items-center"><h2 className="font-bold text-lg">Kelola langganan Owner</h2>
        {onClose && <button type="button" onClick={onClose} className="border rounded-lg px-3 py-2 text-sm">Tutup</button>}
      </div>
      <SubscriptionTab tenantId={user.tenantId || undefined} />
      <div className="flex gap-3"><button type="button" onClick={() => void onRefreshStatus?.()} className="border rounded-lg px-3 py-2 text-sm">Periksa aktivasi</button>
      {onLogout && <button type="button" onClick={onLogout} className="border rounded-lg px-3 py-2 text-sm">Keluar</button>}</div>
    </div>
  </div>;
};
