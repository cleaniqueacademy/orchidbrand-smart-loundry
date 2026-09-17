import React, { useState, useEffect } from "react";
import { Store, Phone, MapPin, ShieldCheck, User as UserIcon, Save, Calendar, MessageSquare } from "lucide-react";
import { Tenant, User } from "../../types";

interface SettingsTabProps {
  tenant?: Tenant | null;
  currentUser?: User | null;
  onUpdateTenant: (id: string, data: { outletName?: string; phone?: string; address?: string }) => Promise<boolean>;
  onOpenWhatsAppModal?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  tenant,
  currentUser,
  onUpdateTenant,
  onOpenWhatsAppModal,
}) => {
  const [outletName, setOutletName] = useState(tenant?.outletName || "");
  const [phone, setPhone] = useState(tenant?.phone || "");
  const [address, setAddress] = useState(tenant?.address || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setOutletName(tenant.outletName || "");
      setPhone(tenant.phone || "");
      setAddress(tenant.address || "");
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);
    try {
      await onUpdateTenant(tenant.id, {
        outletName,
        phone,
        address,
      });
    } finally {
      setSaving(false);
    }
  };

  const expDateStr = tenant?.subscriptionUntil || "2027-01-15";
  const expDate = new Date(expDateStr);
  const today = new Date();
  const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = diffDays <= 0;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Clean Page Header */}
      <div className="pb-1 border-b border-zinc-200/80">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
          Pengaturan
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
          Informasi profil cabang dan masa aktif outlet laundry.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Main Settings Form (2 cols) */}
        <div className="md:col-span-2 space-y-5">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Store className="w-4 h-4 text-zinc-700" />
              <h2 className="font-semibold text-zinc-900 text-sm">Informasi Cabang</h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Nama Cabang
              </label>
              <input
                type="text"
                value={outletName}
                onChange={(e) => setOutletName(e.target.value)}
                required
                placeholder="Contoh: Orchid Laundry - Cabang Melati"
                className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Nomor Telepon
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="081234567890"
                  className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Alamat Cabang
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                required
                placeholder="Alamat lengkap lokasi laundry..."
                className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Menyimpan..." : "Simpan Perubahan"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Side Info Cards (1 col) */}
        <div className="space-y-4">
          {/* Subscription Card */}
          <div className="bg-white rounded-xl border border-zinc-200/80 shadow-xs p-4.5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-700" />
                <h3 className="font-semibold text-zinc-900 text-xs">Masa Aktif</h3>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                isExpired ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
              }`}>
                {isExpired ? "Kedaluwarsa" : "Aktif"}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-zinc-500">Berlaku Sampai:</div>
              <div className="text-sm font-semibold text-zinc-900 font-mono">
                {new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(expDate)}
              </div>
              <div className="text-[11px] text-zinc-400">
                {isExpired ? "Masa aktif habis" : `${diffDays} hari lagi`}
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-100 leading-relaxed">
              Perpanjangan masa aktif dikelola langsung oleh Admin Pusat Orchid.
            </p>
          </div>

          {/* Owner Account Card */}
          <div className="bg-white rounded-xl border border-zinc-200/80 shadow-xs p-4.5 space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-2.5">
              <UserIcon className="w-4 h-4 text-zinc-700" />
              <h3 className="font-semibold text-zinc-900 text-xs">Profil Pemilik</h3>
            </div>

            <div className="space-y-1.5 text-xs">
              <div>
                <div className="text-[11px] text-zinc-400">Nama:</div>
                <div className="font-medium text-zinc-800">{currentUser?.name || "Budi Santoso"}</div>
              </div>
              <div>
                <div className="text-[11px] text-zinc-400">Email:</div>
                <div className="font-mono text-zinc-600">{currentUser?.email || "budi@laundrymelati.com"}</div>
              </div>
              <div>
                <div className="text-[11px] text-zinc-400">Peran:</div>
                <div className="font-medium text-zinc-800">Tenant Owner</div>
              </div>
            </div>
          </div>

          {/* WhatsApp Shortcut */}
          {onOpenWhatsAppModal && (
            <div className="bg-white rounded-xl border border-zinc-200/80 shadow-xs p-4.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-zinc-900 text-xs">WhatsApp Bisnis</h3>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Kelola sambungan WhatsApp untuk kirim struk dan notifikasi otomatis.
              </p>
              <button
                type="button"
                onClick={onOpenWhatsAppModal}
                className="w-full py-1.5 px-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-medium transition cursor-pointer"
              >
                Pengaturan WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
