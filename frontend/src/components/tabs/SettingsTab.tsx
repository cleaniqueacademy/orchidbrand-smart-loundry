import React, { useState, useEffect } from "react";
import {
  Store,
  Save,
  Calendar,
  Edit2,
  User as UserIcon,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Clock,
  Shield,
  Sliders,
  Check,
  Tag,
  CreditCard,
  CheckCheck,
  Copy,
  Smartphone,
} from "lucide-react";
import { Tenant, User } from "../../types";
import { useToast } from "../common/ToastContext";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { EditProfileModal } from "../modals/EditProfileModal";
import { StaffManagementSection } from "./StaffManagementSection";
import { ServicesTab } from "./ServicesTab";
import { SubscriptionStatusCard } from "./SubscriptionStatusCard";

interface SettingsTabProps {
  tenant?: Tenant | null;
  currentUser?: User | null;
  currentUserRole?: string;
  tenantId?: string;
  tenants?: Tenant[];
  onUpdateTenant: (
    id: string,
    data: {
      outletName?: string;
      phone?: string;
      address?: string;
      city?: string;
      ownerName?: string;
      enableCashierShift?: string;
      bankName?: string;
      bankAccountNumber?: string;
      bankAccountName?: string;
      qrisInfo?: string;
      openingHours?: string;
      [key: string]: unknown;
    }
  ) => Promise<boolean>;
  onUpdateUser?: (id: string, userData: { name?: string; password?: string }) => Promise<boolean>;
  onOpenWhatsAppModal?: () => void;
  waStatus?: "disconnected" | "connecting" | "qrcode" | "connected";
  setActiveTab?: (tab: any) => void;
}

const SubTabSkeleton: React.FC = () => (
  <div className="space-y-4 opacity-75">
    <div className="h-6 bg-zinc-200/80 rounded-lg w-48 mb-3" />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="h-20 bg-zinc-100 rounded-xl border border-zinc-200/60 p-3 space-y-2">
        <div className="h-4 bg-zinc-200 rounded w-20" />
        <div className="h-5 bg-zinc-200 rounded w-28" />
      </div>
      <div className="h-20 bg-zinc-100 rounded-xl border border-zinc-200/60 p-3 space-y-2">
        <div className="h-4 bg-zinc-200 rounded w-20" />
        <div className="h-5 bg-zinc-200 rounded w-28" />
      </div>
      <div className="h-20 bg-zinc-100 rounded-xl border border-zinc-200/60 p-3 space-y-2">
        <div className="h-4 bg-zinc-200 rounded w-20" />
        <div className="h-5 bg-zinc-200 rounded w-28" />
      </div>
    </div>
    <div className="h-48 bg-zinc-100 rounded-2xl border border-zinc-200/60" />
  </div>
);

export const SettingsTab: React.FC<SettingsTabProps> = ({
  tenant,
  currentUser,
  currentUserRole = "tenant_owner",
  tenantId,
  tenants = [],
  onUpdateTenant,
  onUpdateUser,
  onOpenWhatsAppModal,
  waStatus = "disconnected",
  setActiveTab,
}) => {
  const toast = useToast();
  type SettingsSubTab = "profil" | "layanan" | "staf" | "langganan";
  const [settingsTab, setSettingsTab] = useState<SettingsSubTab>("profil");

  // Resolve active tenant safely for both Tenant Owner & Super Admin preview
  const resolvedTenant =
    tenant ||
    (tenants && tenants.find((t) => t.id === tenantId)) ||
    (tenants && tenants[0]);

  const effectiveTenantId =
    tenantId && tenantId !== "all"
      ? tenantId
      : resolvedTenant?.id || (tenants && tenants[0]?.id) || currentUser?.tenantId || "tenant-01";

  const [ownerName, setOwnerName] = useState(currentUser?.name || "");
  const [outletName, setOutletName] = useState(tenant?.outletName || resolvedTenant?.outletName || "");
  const [phone, setPhone] = useState(tenant?.phone || resolvedTenant?.phone || "");
  const [address, setAddress] = useState(tenant?.address || resolvedTenant?.address || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Cashier shift enable/disable state
  const activeTenantObj = tenant || resolvedTenant;
  const [enableShift, setEnableShift] = useState<boolean>(
    activeTenantObj?.enableCashierShift !== "false" && activeTenantObj?.enableCashierShift !== false
  );
  const [updatingShift, setUpdatingShift] = useState(false);

  // Preview WhatsApp notification states
  const [previewMessageType, setPreviewMessageType] = useState<"nota_masuk" | "siap_ambil">("nota_masuk");
  const [copiedPreview, setCopiedPreview] = useState(false);

  const displayOutletName = outletName.trim() || tenant?.outletName || "Laundry Cleanique - Cabang Melati";
  const displayAddress = address.trim() || tenant?.address || "Jl. Melati Raya No. 45, Jakarta Selatan";
  const displayPhone = phone.trim() || tenant?.phone || "081234567890";

  const handleCopyPreviewText = () => {
    const textToCopy =
      previewMessageType === "nota_masuk"
        ? `Halo Kak Sarah Wijaya! 👋 Terima kasih telah mencuci di *${displayOutletName}*.\n\nPesanan cucian Anda telah kami terima dengan rincian nota digital:\n\n📄 *No. Nota:* #ORD-20260925-001\n📅 *Waktu Masuk:* 25 Sep 2026, 14:15 WIB\n🧺 *Paket:* Cuci Kering Setrika (3.5 Kg)\n💵 *Total Biaya:* Rp 28.000\n💰 *Status Bayar:* LUNAS (QRIS / Tunai)\n⏱️ *Estimasi Selesai:* Besok, 17:00 WIB\n\n🔍 *Cek Status Cucian Real-time:*\nhttps://cleanique.app/track/ORD-20260925-001\n\n⏰ *Jam Operasional:*\n• Senin - Sabtu : 08.00 - 20.00 WIB\n\n📍 *Lokasi:* ${displayAddress}\n📞 *Telp/WA:* ${displayPhone}\n\nKami akan mengabari Anda kembali via WhatsApp begitu cucian selesai dan siap diambil. Terima kasih! 🙏`
        : `Halo Kak Sarah Wijaya! 👋\n\nKabar gembira, cucian Anda di *${displayOutletName}* sudah *SELESAI & SIAP DIAMBIL* 🧺✨\n\n📄 *No. Nota:* #ORD-20260925-001\n🧺 *Paket:* Cuci Kering Setrika (3.5 Kg) - Bersih, Wangi & Rapi\n💰 *Status:* LUNAS\n\n🔍 *Detail Resi Pelanggan:*\nhttps://cleanique.app/track/ORD-20260925-001\n\n📍 *Alamat Ambil:* ${displayAddress}\n⏰ *Jam Operasional:* Senin - Sabtu : 08.00 - 20.00 WIB\n📞 *Kontak Toko:* ${displayPhone}\n\nTerima kasih telah mempercayakan pakaian Anda kepada kami! 🙏`;

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedPreview(true);
      setTimeout(() => setCopiedPreview(false), 2000);
      toast.success("Teks Disalin", "Contoh format pesan notifikasi WhatsApp disalin ke clipboard.");
    }
  };

  useEffect(() => {
    const t = tenant || resolvedTenant;
    if (t) {
      setOutletName(t.outletName || "");
      setPhone(t.phone || "");
      setAddress(t.address || "");
      setEnableShift(t.enableCashierShift !== "false" && t.enableCashierShift !== false);
    }
  }, [tenant, resolvedTenant]);

  useEffect(() => {
    if (currentUser?.name) {
      setOwnerName(currentUser.name);
    }
  }, [currentUser]);

  // Handle Save Profile
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = tenant?.id || resolvedTenant?.id || effectiveTenantId;
    if (!targetId) return;
    setSavingProfile(true);
    try {
      const ok = await onUpdateTenant(targetId, {
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
    const targetId = tenant?.id || resolvedTenant?.id || effectiveTenantId;
    if (!targetId || updatingShift) return;
    const nextVal = !enableShift;
    setUpdatingShift(true);
    try {
      const ok = await onUpdateTenant(targetId, {
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
          Kelola profil cabang, master layanan, manajemen staf, dan status langganan outlet.
        </p>
      </div>

      {/* Internal Sub-Tab Navigation */}
      <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1 w-fit flex-wrap">
        {([
          { id: "profil", label: "Profil Outlet", icon: Store },
          { id: "layanan", label: "Master Layanan", icon: Tag },
          { id: "staf", label: "Manajemen Staf", icon: UserIcon },
          { id: "langganan", label: "Langganan", icon: CreditCard },
        ] as { id: "profil" | "layanan" | "staf" | "langganan"; label: string; icon: React.ElementType }[]).map((tab) => {
          const Icon = tab.icon;
          const isActive = settingsTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSettingsTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* === TAB: PROFIL OUTLET === */}
      {settingsTab === "profil" && (
        <div className="space-y-6">
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
                placeholder="Contoh: Laundry Cleanique - Cabang Melati"
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
                  <h3 className="font-bold text-zinc-900 text-sm">Status Langganan</h3>
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
              Hubungi Super Admin Laundry Cleanique jika ingin memperpanjang masa aktif langganan toko Anda.
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
                      waStatus === "connected" ? "bg-emerald-500" : "bg-zinc-300"
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

        {/* Card 2: Preview Notifikasi Chat WhatsApp Otomatis (Menampilkan Identitas Tenant) */}
        <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 gap-2 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-2xs">
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">Preview Notifikasi WhatsApp</h3>
                  <p className="text-[11px] text-zinc-500">Pesan otomatis dengan identitas cabang Anda</p>
                </div>
              </div>
              <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewMessageType("nota_masuk")}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                    previewMessageType === "nota_masuk"
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Nota Masuk
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMessageType("siap_ambil")}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                    previewMessageType === "siap_ambil"
                      ? "bg-white text-zinc-900 shadow-2xs"
                      : "text-zinc-500 hover:text-zinc-800"
                  }`}
                >
                  Siap Diambil
                </button>
              </div>
            </div>

            {/* WhatsApp Chat Bubble Mockup */}
            <div className="mt-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[10.5px] text-zinc-500 border-b border-zinc-200/60 pb-1.5">
                <span className="font-medium flex items-center gap-1 text-emerald-900">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                  Kirim Dari: <strong className="font-bold text-zinc-900">{displayOutletName}</strong>
                </span>
                <span className="font-mono text-zinc-400 text-[10px]">Tampilan Pelanggan</span>
              </div>

              {/* Chat Message Bubble */}
              <div className="bg-white rounded-xl rounded-tl-xs p-3.5 shadow-2xs border border-zinc-200/70 text-[11px] text-zinc-800 space-y-2 leading-relaxed font-sans">
                {previewMessageType === "nota_masuk" ? (
                  <>
                    <p>
                      Halo Kak <strong>Sarah Wijaya</strong>! 👋 Terima kasih telah mempercayakan pakaian Anda di <strong>{displayOutletName}</strong>.
                    </p>
                    <p className="text-zinc-600">
                      Pesanan cucian Anda telah kami terima dengan rincian nota digital:
                    </p>
                    <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/60 space-y-1 font-mono text-[10.5px]">
                      <div>📄 <strong>No. Nota:</strong> #ORD-20260925-001</div>
                      <div>📅 <strong>Waktu Masuk:</strong> 25 Sep 2026, 14:15 WIB</div>
                      <div>🧺 <strong>Paket:</strong> Cuci Kering Setrika (3.5 Kg)</div>
                      <div>💵 <strong>Total Biaya:</strong> Rp 28.000</div>
                      <div>💰 <strong>Status Bayar:</strong> <span className="text-emerald-700 font-bold">LUNAS (QRIS / Tunai)</span></div>
                      <div>⏱️ <strong>Estimasi Selesai:</strong> Besok, 17:00 WIB</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">🔍 Cek Status Cucian Real-time:</div>
                      <span className="text-blue-700 font-mono text-[10.5px] underline break-all cursor-pointer">
                        https://cleanique.app/track/ORD-20260925-001
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-zinc-100 text-[10px] text-zinc-500 space-y-0.5 leading-snug">
                      <div>⏰ <strong>Jam Operasional:</strong> Senin - Sabtu : 08.00 - 20.00 WIB</div>
                      <div>📍 <strong>Lokasi:</strong> {displayAddress}</div>
                      <div>📞 <strong>Telp/WA:</strong> {displayPhone}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Halo Kak <strong>Sarah Wijaya</strong>! 👋
                    </p>
                    <p className="font-semibold text-emerald-800">
                      Kabar gembira, cucian Anda di <strong>{displayOutletName}</strong> sudah SELESAI & SIAP DIAMBIL 🧺✨
                    </p>
                    <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/60 space-y-1 font-mono text-[10.5px]">
                      <div>📄 <strong>No. Nota:</strong> #ORD-20260925-001</div>
                      <div>🧺 <strong>Paket:</strong> Cuci Kering Setrika (3.5 Kg) - Bersih & Rapi</div>
                      <div>💰 <strong>Status:</strong> <span className="text-emerald-700 font-bold">LUNAS</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">🔍 Detail Resi Pelanggan:</div>
                      <span className="text-blue-700 font-mono text-[10.5px] underline break-all cursor-pointer">
                        https://cleanique.app/track/ORD-20260925-001
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-zinc-100 text-[10px] text-zinc-500 space-y-0.5 leading-snug">
                      <div>📍 <strong>Alamat Ambil:</strong> {displayAddress}</div>
                      <div>⏰ <strong>Jam Operasional:</strong> Senin - Sabtu : 08.00 - 20.00 WIB</div>
                      <div>📞 <strong>Kontak Toko:</strong> {displayPhone}</div>
                    </div>
                  </>
                )}

                {/* Bubble Timestamp & Status */}
                <div className="flex items-center justify-end gap-1 text-[9.5px] text-zinc-400 font-mono pt-1">
                  <span>14:20</span>
                  <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Card Controls */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyPreviewText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition cursor-pointer shadow-2xs"
            >
              {copiedPreview ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Teks Disalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Salin Format Pesan</span>
                </>
              )}
            </button>

            {onOpenWhatsAppModal && (
              <button
                type="button"
                onClick={onOpenWhatsAppModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-850 border border-emerald-200 text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pengaturan Gateway WA</span>
              </button>
            )}
          </div>
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
      )} {/* end settingsTab === "profil" */}

      {/* === TAB: MASTER LAYANAN === */}
      {settingsTab === "layanan" && (
        effectiveTenantId ? (
          <ServicesTab
            tenantId={effectiveTenantId}
            tenants={tenants.length > 0 ? tenants : resolvedTenant ? [resolvedTenant] : []}
            currentUserRole={currentUserRole || "tenant_owner"}
          />
        ) : (
          <SubTabSkeleton />
        )
      )}

      {/* === TAB: MANAJEMEN STAF === */}
      {settingsTab === "staf" && (
        effectiveTenantId ? (
          <StaffManagementSection
            tenantId={effectiveTenantId}
            tenantName={resolvedTenant?.outletName || "Outlet"}
          />
        ) : (
          <SubTabSkeleton />
        )
      )}

      {/* === TAB: LANGGANAN === */}
      {settingsTab === "langganan" && (
        effectiveTenantId ? (
          <div className="space-y-4">
            <div className="pb-2 border-b border-zinc-200/80">
              <h2 className="text-sm font-bold text-zinc-900">Status Langganan</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Perpanjang masa aktif outlet Anda dengan mudah. Tarif hemat: <strong>Rp 55.000/bulan</strong> (dengan kode referral) atau <strong>Rp 60.000/bulan</strong> (standar).
              </p>
            </div>
            <SubscriptionStatusCard tenantId={effectiveTenantId} />
          </div>
        ) : (
          <SubTabSkeleton />
        )
      )}
    </div>
  );
};
