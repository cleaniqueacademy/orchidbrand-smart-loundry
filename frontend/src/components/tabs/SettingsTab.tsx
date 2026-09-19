import React, { useState, useEffect } from "react";
import {
  Store,
  Save,
  Calendar,
  Edit2,
  User as UserIcon,
  Calculator,
  ArrowRight,
  Layers,
  CheckCircle2,
  Clock,
  Shield,
  Sliders,
  Check,
} from "lucide-react";
import { Tenant, User } from "../../types";
import { useToast } from "../common/ToastContext";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { EditProfileModal } from "../modals/EditProfileModal";
import { StaffManagementSection } from "./StaffManagementSection";

interface SettingsTabProps {
  tenant?: Tenant | null;
  currentUser?: User | null;
  onUpdateTenant: (
    id: string,
    data: {
      outletName?: string;
      phone?: string;
      address?: string;
      ownerName?: string;
      enableCashierShift?: string | boolean;
    }
  ) => Promise<boolean>;
  onUpdateUser?: (id: string, userData: { name?: string; password?: string }) => Promise<boolean>;
  onOpenWhatsAppModal?: () => void;
  waStatus?: "disconnected" | "connecting" | "qrcode" | "connected";
  setActiveTab?: (tab: any) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  tenant,
  currentUser,
  onUpdateTenant,
  onUpdateUser,
  onOpenWhatsAppModal,
  waStatus = "disconnected",
  setActiveTab,
}) => {
  const toast = useToast();
  const [ownerName, setOwnerName] = useState(currentUser?.name || "");
  const [outletName, setOutletName] = useState(tenant?.outletName || "");
  const [phone, setPhone] = useState(tenant?.phone || "");
  const [address, setAddress] = useState(tenant?.address || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Cashier shift enable/disable state
  const [enableShift, setEnableShift] = useState<boolean>(
    tenant?.enableCashierShift !== "false" && tenant?.enableCashierShift !== false
  );
  const [updatingShift, setUpdatingShift] = useState(false);

  useEffect(() => {
    if (tenant) {
      setOutletName(tenant.outletName || "");
      setPhone(tenant.phone || "");
      setAddress(tenant.address || "");
      setEnableShift(tenant.enableCashierShift !== "false" && tenant.enableCashierShift !== false);
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

  // Handle Toggle Cashier Shift Feature
  const handleToggleShift = async () => {
    if (!tenant || updatingShift) return;
    const nextVal = !enableShift;
    setUpdatingShift(true);
    try {
      const ok = await onUpdateTenant(tenant.id, {
        enableCashierShift: String(nextVal),
      });
      if (ok) {
        setEnableShift(nextVal);
        if (nextVal) {
          toast.success(
            "Sistem Shift Diaktifkan",
            "Kasir kini wajib input kas awal dan rekonsiliasi laci saat tutup shift."
          );
        } else {
          toast.info(
            "Sistem Shift Dinonaktifkan",
            "Kasir dapat langsung memproses transaksi tanpa perlu buka/tutup shift laci."
          );
        }
      }
    } catch (err: any) {
      toast.error("Gagal Mengubah Pengaturan", err.message);
    } finally {
      setUpdatingShift(false);
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
          Kelola profil cabang, fitur operasional kasir, dan masa aktif langganan outlet laundry.
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
                placeholder="Contoh: 081234567890"
                className="w-full px-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-zinc-50/50 hover:bg-white focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Alamat Outlet
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={3}
                placeholder="Contoh: Jl. Melati Raya No. 45, Jakarta Selatan"
                className="w-full px-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-zinc-50/50 hover:bg-white focus:bg-white resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingProfile ? "Menyimpan..." : "Simpan Profil Cabang"}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Kolom Kanan: Masa Aktif Langganan & Integrasi WhatsApp (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card Masa Aktif Langganan */}
          <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-2xs">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">Status Langganan SaaS</h3>
                  <p className="text-[11px] text-zinc-500">Masa aktif lisensi sistem outlet</p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  isExpired
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : diffDays <= 7
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                {isExpired ? "Habis" : diffDays <= 7 ? "Kritis" : "Aktif"}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-zinc-50/70 border border-zinc-200/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Berlaku Hingga</span>
                <span className="font-bold text-zinc-900 font-mono">
                  {expDate.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Sisa Waktu</span>
                <span
                  className={`font-bold ${
                    isExpired
                      ? "text-rose-600"
                      : diffDays <= 7
                      ? "text-amber-600"
                      : "text-emerald-700"
                  }`}
                >
                  {isExpired ? "Sudah Berakhir" : `${diffDays} Hari Lagi`}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Hubungi Super Admin platform SaaS jika ingin memperpanjang masa aktif langganan toko Anda.
            </p>
          </div>

          {/* Quick Cards: Profil Akun & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Profil Akun */}
            <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-3.5 space-y-2">
              <div className="flex items-center justify-between text-zinc-900 pb-1.5 border-b border-zinc-100">
                <div className="flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="font-bold text-xs">Akun Anda</span>
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

      {/* Bagian 2: Fitur Operasional Kasir & Info Menu Layanan Terpusat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
        {/* Card 1: Toggle Fitur Shift Kasir & Rekonsiliasi Laci */}
        <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-2xs">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">Fitur Shift Kerja Kasir</h3>
                  <p className="text-[11px] text-zinc-500">Manajemen kas laci & pertanggungjawaban kasir</p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  enableShift
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                }`}
              >
                {enableShift ? "Aktif" : "Nonaktif"}
              </span>
            </div>

            <div className="mt-3.5 space-y-2">
              <p className="text-xs text-zinc-600 leading-relaxed">
                {enableShift
                  ? "Sistem shift saat ini AKTIF. Kasir wajib memasukkan modal kas awal saat mulai bertugas dan melakukan rekonsiliasi uang fisik laci saat tutup shift."
                  : "Sistem shift saat ini NONAKTIF. Kasir dapat langsung melayani transaksi cucian tanpa tombol buka/tutup shift laci kasir."}
              </p>

              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/70 text-[11px] text-zinc-500 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-zinc-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {enableShift
                      ? "Cocok jika outlet memiliki staf bergantian jam kerja (shift pagi / sore)."
                      : "Cocok jika kasir dijaga oleh pemilik sendiri atau staf tunggal seharian."}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-700">
              Ubah Status Fitur:
            </span>
            <button
              type="button"
              onClick={handleToggleShift}
              disabled={updatingShift}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-2 cursor-pointer shadow-2xs ${
                enableShift
                  ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              <span>{updatingShift ? "Menyimpan..." : enableShift ? "Nonaktifkan Shift" : "Aktifkan Shift"}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Pengalihan Layanan Terpusat */}
        <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 shadow-2xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">Katalog Tarif & Layanan</h3>
                  <p className="text-[11px] text-zinc-500">Dikelola terpusat di menu Layanan</p>
                </div>
              </div>
            </div>

            <div className="mt-3.5 space-y-2.5 text-xs text-zinc-600 leading-relaxed">
              <p>
                Semua pengaturan harga per satuan, minimum order, durasi pengerjaan SLA, dan status aktif paket cucian dikelola secara terpusat di menu <strong>Layanan</strong> pada bilah navigasi samping.
              </p>
              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-200/70 text-[11px] text-blue-900 space-y-1">
                <div className="font-semibold">💡 Pengelolaan Lebih Lengkap:</div>
                <p className="text-blue-800">
                  Menu Layanan dilengkapi dengan indikator durasi SLA (jam/hari), pencarian, dan pagination untuk kenyamanan operasional.
                </p>
              </div>
            </div>
          </div>

          {setActiveTab && (
            <div className="pt-2 border-t border-zinc-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab("services")}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <span>Buka Menu Layanan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Seksi Manajemen Kasir / Staff Cabang */}
      {tenant?.id && (
        <StaffManagementSection
          tenantId={tenant.id}
          tenantName={tenant.outletName}
        />
      )}

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
