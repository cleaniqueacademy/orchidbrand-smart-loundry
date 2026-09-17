import React, { useState, useEffect } from "react";
import {
  Store,
  Save,
  Calendar,
  Plus,
  Trash2,
  Tag,
  RotateCcw,
  Edit2,
  User as UserIcon,
} from "lucide-react";
import { Tenant, User, LaundryService } from "../../types";
import { useToast } from "../common/ToastContext";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { EditProfileModal } from "../modals/EditProfileModal";

interface SettingsTabProps {
  tenant?: Tenant | null;
  currentUser?: User | null;
  onUpdateTenant: (
    id: string,
    data: {
      outletName?: string;
      phone?: string;
      address?: string;
      services?: LaundryService[];
      ownerName?: string;
    }
  ) => Promise<boolean>;
  onUpdateUser?: (id: string, userData: { name?: string; password?: string }) => Promise<boolean>;
  onOpenWhatsAppModal?: () => void;
  waStatus?: "disconnected" | "connecting" | "qrcode" | "connected";
}

const DEFAULT_SERVICES: LaundryService[] = [
  { id: "srv-1", name: "Cuci Komplit Reguler", unit: "kg", price: 8000 },
  { id: "srv-2", name: "Cuci Setrika Express", unit: "kg", price: 12000 },
  { id: "srv-3", name: "Setrika Saja", unit: "kg", price: 6000 },
  { id: "srv-4", name: "Bedcover King", unit: "pcs", price: 35000 },
  { id: "srv-5", name: "Bedcover Single", unit: "pcs", price: 25000 },
  { id: "srv-6", name: "Cuci Sepatu", unit: "pasang", price: 25000 },
  { id: "srv-7", name: "Cuci Karpet", unit: "meter", price: 15000 },
  { id: "srv-8", name: "Cuci Selimut", unit: "pcs", price: 20000 },
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  tenant,
  currentUser,
  onUpdateTenant,
  onUpdateUser,
  onOpenWhatsAppModal,
  waStatus = "disconnected",
}) => {
  const toast = useToast();
  const [ownerName, setOwnerName] = useState(currentUser?.name || "");
  const [outletName, setOutletName] = useState(tenant?.outletName || "");
  const [phone, setPhone] = useState(tenant?.phone || "");
  const [address, setAddress] = useState(tenant?.address || "");
  const [services, setServices] = useState<LaundryService[]>(
    tenant?.services && tenant.services.length > 0 ? tenant.services : DEFAULT_SERVICES
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  useEffect(() => {
    if (tenant) {
      setOutletName(tenant.outletName || "");
      setPhone(tenant.phone || "");
      setAddress(tenant.address || "");
      if (tenant.services && tenant.services.length > 0) {
        setServices(tenant.services);
      } else {
        setServices(DEFAULT_SERVICES);
      }
    }
  }, [tenant]);

  useEffect(() => {
    if (currentUser?.name) {
      setOwnerName(currentUser.name);
    }
  }, [currentUser]);

  // Handle Save Profile
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSavingProfile(true);
    try {
      const ok = await onUpdateTenant(tenant.id, {
        outletName,
        phone,
        address,
        ownerName: ownerName.trim(),
      });

      if (currentUser && ownerName.trim() && ownerName.trim() !== currentUser.name && onUpdateUser) {
        await onUpdateUser(currentUser.id, { name: ownerName.trim() });
      }

      if (ok) {
        toast.success("Profil Disimpan", "Informasi cabang dan nama pemilik berhasil diperbarui.");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Services Modifications
  const handleServiceChange = (
    index: number,
    field: keyof LaundryService,
    value: string | number
  ) => {
    const updated = [...services];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setServices(updated);
  };

  const handleAddService = () => {
    const newService: LaundryService = {
      id: `srv-${Date.now()}-${services.length + 1}`,
      name: "Layanan Baru",
      unit: "kg",
      price: 10000,
    };
    setServices([...services, newService]);
  };

  const handleDeleteService = (index: number) => {
    if (services.length <= 1) {
      toast.warning("Layanan Minimal Satu", "Outlet harus memiliki minimal 1 layanan aktif!");
      return;
    }
    setServices(services.filter((_, i) => i !== index));
  };

  const handleResetDefaultServices = () => {
    setServices(DEFAULT_SERVICES);
    toast.info("Tarif Standar", "Daftar layanan dikembalikan ke preset standar.");
  };

  const handleSaveServices = async () => {
    if (!tenant) return;
    // Validate services
    for (const s of services) {
      if (!s.name.trim()) {
        toast.warning("Nama Layanan", "Nama layanan tidak boleh kosong!");
        return;
      }
      if (s.price < 0) {
        toast.warning("Tarif Layanan", "Tarif harga tidak boleh bernilai negatif!");
        return;
      }
    }

    setSavingServices(true);
    try {
      const ok = await onUpdateTenant(tenant.id, {
        services,
      });
      if (ok) {
        toast.success("Layanan Disimpan", "Daftar layanan dan tarif cabang berhasil diperbarui.");
      }
    } finally {
      setSavingServices(false);
    }
  };

  const expDateStr = tenant?.subscriptionUntil || "2027-01-15";
  const expDate = new Date(expDateStr);
  const today = new Date();
  const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = diffDays <= 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Clean Page Header */}
      <div className="pb-3 border-b border-zinc-200/80">
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
          Pengaturan
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
          Kelola profil cabang, tarif layanan, dan masa aktif outlet laundry.
        </p>
      </div>

      {/* Bagian 1: Grid 2 Kolom Seimbang (Profil Cabang & Status Akun / Integrasi) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Kolom Kiri: Form Informasi Cabang (7 cols) */}
        <form
          onSubmit={handleProfileSubmit}
          className="lg:col-span-7 bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shadow-2xs">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-zinc-900 text-sm">Informasi Cabang</h2>
                <p className="text-[11px] text-zinc-500">Profil dan kontak operasional outlet</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 font-medium">
              ID: {tenant?.id || "tenant-01"}
            </span>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Nama Pemilik Cabang
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                placeholder="Contoh: Budi Santoso"
                className="w-full px-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-zinc-50/50 hover:bg-white focus:bg-white text-zinc-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Nama Cabang
              </label>
              <input
                type="text"
                value={outletName}
                onChange={(e) => setOutletName(e.target.value)}
                required
                placeholder="Contoh: Orchid Laundry - Cabang Melati"
                className="w-full px-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-zinc-50/50 hover:bg-white focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Nomor Telepon
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="081234567890"
                className="w-full px-3 py-2 text-xs font-mono border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-zinc-50/50 hover:bg-white focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Alamat Cabang
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                required
                placeholder="Alamat lengkap lokasi outlet laundry..."
                className="w-full px-3 py-2 text-xs border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-zinc-50/50 hover:bg-white focus:bg-white"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-zinc-100">
            <span className="text-[11px] text-zinc-400">
              Data tertera pada struk nota transaksi
            </span>
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? "Menyimpan..." : "Simpan Profil"}</span>
            </button>
          </div>
        </form>

        {/* Kolom Kanan: Masa Aktif, Profil Pemilik & WhatsApp (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card: Masa Aktif (Hero Light Blue Spotlight) */}
          <div className="relative overflow-hidden rounded-xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 via-blue-50/80 to-indigo-50/40 p-4 shadow-xs ring-2 ring-sky-500/10">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-sky-400/20 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between pb-2 border-b border-sky-200/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shadow-2xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sky-950 text-xs">Masa Aktif</h3>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 border whitespace-nowrap shrink-0 ${
                  isExpired
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isExpired ? "bg-rose-500" : "bg-emerald-500 animate-pulse"}`} />
                <span className="whitespace-nowrap">{isExpired ? "Kedaluwarsa" : "Aktif"}</span>
              </span>
            </div>

            <div className="mt-2.5 flex items-baseline justify-between">
              <div>
                <div className="text-[11px] font-medium text-sky-700">Sisa Operasional:</div>
                <div className="text-2xl font-black text-sky-950 font-mono tracking-tight">
                  {isExpired ? "0 Hari" : `${diffDays} Hari`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-sky-700 font-medium">Berlaku Sampai:</div>
                <div className="text-xs font-bold text-sky-950 font-mono">
                  {new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }).format(expDate)}
                </div>
              </div>
            </div>

            <p className="text-[10.5px] text-sky-800/80 font-medium pt-2 border-t border-sky-200/60 mt-2.5 leading-relaxed">
              Perpanjangan masa aktif dikelola oleh Admin Pusat Orchid.
            </p>
          </div>

          {/* Card: Profil Pemilik & WhatsApp Bisnis (Kompak & Rapi) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Profil Pemilik */}
            <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-3.5 space-y-2">
              <div className="flex items-center justify-between text-zinc-900 pb-1.5 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-zinc-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                    {ownerName ? ownerName.slice(0, 2).toUpperCase() : "BS"}
                  </div>
                  <span className="font-bold text-xs">Profil Pemilik</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 hover:underline cursor-pointer"
                  title="Ganti Nama atau Kata Sandi"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Ubah</span>
                </button>
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-zinc-900 text-xs truncate">
                  {ownerName || currentUser?.name || "Budi Santoso"}
                </div>
                <div className="text-[11px] text-zinc-500 truncate font-mono">
                  {currentUser?.email || "budi@laundrymelati.com"}
                </div>
                <div className="inline-block mt-1 text-[9.5px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                  {currentUser?.role === "superadmin" ? "Super Admin" : "Tenant Owner"}
                </div>
              </div>
            </div>

            {/* WhatsApp Bisnis */}
            <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-3.5 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-zinc-900 pb-1.5 border-b border-zinc-100">
                  <div className="flex items-center gap-1.5">
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold text-xs">WhatsApp</span>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      waStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-zinc-300"
                    }`}
                    title={waStatus === "connected" ? "Terhubung" : "Belum Terhubung"}
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
                  {waStatus === "connected"
                    ? "Pengiriman struk aktif."
                    : "Sambungkan WhatsApp."}
                </p>
              </div>

              {onOpenWhatsAppModal && (
                <button
                  type="button"
                  onClick={onOpenWhatsAppModal}
                  className="w-full py-1.5 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-850 border border-emerald-200 text-xs font-semibold transition cursor-pointer text-center mt-1"
                >
                  Konfigurasi WA
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bagian 2: Layanan Cabang & Tarif (Full Width 12 cols, Rapi Bergaya POS Table) */}
      <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-5 space-y-4">
        {/* Header Layanan Cabang */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 shadow-2xs">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-zinc-900 text-sm">Layanan Cabang</h2>
              <p className="text-xs text-zinc-500">
                Atur nama layanan, satuan, dan tarif harga khusus outlet ini.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleResetDefaultServices}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              title="Kembalikan preset awal 8 layanan standar"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
              <span>Reset Standar</span>
            </button>
            <button
              type="button"
              onClick={handleAddService}
              className="px-3.5 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Layanan</span>
            </button>
          </div>
        </div>

        {/* Table Header Row (Desktop) */}
        <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-3.5 py-2 bg-zinc-100/70 border border-zinc-200/80 rounded-lg text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
          <div className="sm:col-span-6">Nama Layanan</div>
          <div className="sm:col-span-2">Satuan</div>
          <div className="sm:col-span-3">Tarif (Rp)</div>
          <div className="sm:col-span-1 text-center">Aksi</div>
        </div>

        {/* List of Services */}
        <div className="space-y-2">
          {services.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 sm:p-2 rounded-lg border border-zinc-200/80 bg-white hover:border-blue-300 hover:bg-blue-50/15 transition grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center shadow-2xs"
            >
              {/* Service Name Input */}
              <div className="sm:col-span-6">
                <label className="block text-[10px] font-semibold text-zinc-500 mb-1 sm:hidden">
                  Nama Layanan
                </label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleServiceChange(idx, "name", e.target.value)}
                  placeholder="Contoh: Cuci Komplit Reguler"
                  className="w-full text-xs font-semibold text-zinc-900 px-3 py-1.5 bg-zinc-50/60 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                />
              </div>

              {/* Unit Selector */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-zinc-500 mb-1 sm:hidden">
                  Satuan
                </label>
                <select
                  value={item.unit}
                  onChange={(e) => handleServiceChange(idx, "unit", e.target.value)}
                  className="w-full text-xs font-semibold text-zinc-700 px-2.5 py-1.5 bg-zinc-50/60 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white cursor-pointer transition"
                >
                  <option value="kg">kg (Kilogram)</option>
                  <option value="pcs">pcs (Satuan)</option>
                  <option value="pasang">pasang (Sepatu)</option>
                  <option value="meter">meter (Karpet)</option>
                  <option value="lembar">lembar (Gorden)</option>
                </select>
              </div>

              {/* Price Input */}
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-semibold text-zinc-500 mb-1 sm:hidden">
                  Tarif (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1.5 text-zinc-400 text-xs font-mono font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={item.price}
                    onChange={(e) =>
                      handleServiceChange(idx, "price", parseInt(e.target.value) || 0)
                    }
                    className="w-full text-xs font-black font-mono text-zinc-900 pl-8 pr-2.5 py-1.5 bg-zinc-50/60 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Delete Button */}
              <div className="sm:col-span-1 flex justify-end sm:justify-center">
                <button
                  type="button"
                  onClick={() => handleDeleteService(idx)}
                  disabled={services.length <= 1}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer disabled:opacity-30 disabled:hover:text-zinc-400 disabled:hover:bg-transparent disabled:hover:border-transparent"
                  title="Hapus Layanan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Bar: Service Count & Save Button */}
        <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-700 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md">
              {services.length} Paket Layanan Aktif
            </span>
            <span className="text-[11px] text-zinc-400">
              Tarif langsung terhubung ke kasir pesanan
            </span>
          </div>

          <button
            type="button"
            onClick={handleSaveServices}
            disabled={savingServices}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{savingServices ? "Menyimpan..." : "Simpan Layanan"}</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        currentUser={currentUser ? { ...currentUser, name: ownerName } : null}
        onUpdateProfile={async (data) => {
          if (!currentUser || !onUpdateUser) return false;
          const ok = await onUpdateUser(currentUser.id, data);
          if (ok) {
            setOwnerName(data.name);
          }
          return ok;
        }}
      />
    </div>
  );
};
