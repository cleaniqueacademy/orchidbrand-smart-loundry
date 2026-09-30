import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Plus,
  DollarSign,
  TrendingUp,
  CreditCard,
  Phone,
  Mail,
  Edit2,
  Share2,
  Calendar,
  CheckCircle2,
  Clock,
  Briefcase,
  Store,
  Users,
  ExternalLink,
  X,
  Copy,
  Check,
  Search,
  Filter,
  ShieldCheck,
  Tag,
  MessageCircle,
} from "lucide-react";
import { User, MarketingProfile } from "../../../types";
import { useMarketing, MarketingReferralCode } from "../../../hooks/useMarketing";
import { MarketingFormModal } from "./MarketingFormModal";
import { CommissionPayoutTable } from "./CommissionPayoutTable";
import { ReferralCodeShareBox } from "./ReferralCodeShareBox";

interface MarketingTabProps {
  currentUser?: User;
  autoOpenCreate?: boolean;
  onCreated?: () => void;
}

export const MarketingTab: React.FC<MarketingTabProps> = ({ currentUser, autoOpenCreate, onCreated }) => {
  const {
    profiles,
    commissions,
    meData,
    loading,
    fetchMe,
    fetchProfiles,
    fetchCommissions,
    createProfile,
    updateProfile,
    updateCommissionStatus,
  } = useMarketing();

  const isSuperadmin = currentUser?.role === "superadmin";
  const isMarketing = currentUser?.role === "marketing";

  const [activeSubTab, setActiveSubTab] = useState<"profiles" | "payouts">("profiles");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedProfileForEdit, setSelectedProfileForEdit] = useState<MarketingProfile | null>(
    null
  );

  const [shareCode, setShareCode] = useState<any>(null);
  const [selectedCodeForTenants, setSelectedCodeForTenants] = useState<MarketingReferralCode | null>(null);

  // Marketing self search & filters
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    if (isSuperadmin) {
      fetchProfiles();
      fetchCommissions();
    } else if (isMarketing) {
      fetchMe();
      fetchCommissions();
    }
  }, [isSuperadmin, isMarketing, fetchProfiles, fetchCommissions, fetchMe]);

  const handleOpenCreate = () => {
    setSelectedProfileForEdit(null);
    setIsFormModalOpen(true);
  };

  // Auto-open create modal jika dinavigasi dari halaman lain
  useEffect(() => {
    if (autoOpenCreate && isSuperadmin) {
      setSelectedProfileForEdit(null);
      setIsFormModalOpen(true);
    }
  }, [autoOpenCreate, isSuperadmin]);

  const handleOpenEdit = (profile: MarketingProfile) => {
    setSelectedProfileForEdit(profile);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (selectedProfileForEdit) {
      return await updateProfile(selectedProfileForEdit.id, data);
    } else {
      const res = await createProfile(data);
      if (res?.success) {
        onCreated?.();
      }
      return res;
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    } catch {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  const handleCopyLink = async (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://cleaniquelaundry.com";
    const shareUrl = `${origin}/register?ref=${code}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(code);
      setTimeout(() => setCopiedLink(null), 2500);
    } catch {
      setCopiedLink(code);
      setTimeout(() => setCopiedLink(null), 2500);
    }
  };

  const handleDirectWhatsAppShare = (code: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://cleaniquelaundry.com";
    const shareUrl = `${origin}/register?ref=${code}`;
    const text = `Halo! Gunakan kode referral resmi tim marketing "${code}" saat mendaftar di Laundry Cleanique untuk mendapatkan potongan langganan Rp 5.000/bulan dan GRATIS uji coba 7 hari!\n\nDaftar sekarang di:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Filtered tenants for marketing user
  const filteredTenants = (meData?.tenants || []).filter((t) => {
    if (tenantStatusFilter === "active" && t.status !== "active") return false;
    if (tenantStatusFilter === "trial" && !t.isTrial) return false;
    if (tenantStatusFilter === "subscribed" && (t.isTrial || t.status !== "active")) return false;
    const q = tenantSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      t.outletName.toLowerCase().includes(q) ||
      (t.city && t.city.toLowerCase().includes(q)) ||
      (t.phone && t.phone.toLowerCase().includes(q)) ||
      (t.referralCode && t.referralCode.toLowerCase().includes(q))
    );
  });

  // Calculations for Superadmin
  const totalEarnedAll = profiles.reduce((acc, p) => acc + (p.totalEarned || 0), 0);
  const totalWithdrawnAll = profiles.reduce((acc, p) => acc + (p.totalWithdrawn || 0), 0);
  const pendingCommissionsCount = commissions.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Superadmin Header */}
      {isSuperadmin && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
              Tim Marketing IndoTech
            </h2>
            <p className="text-xs text-zinc-500">
              Kelola akun marketing internal, atur insentif performa, dan proses pencairan dana.
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Anggota
          </button>
        </div>
      )}

      {/* Marketing Dedicated Hero Banner */}
      {isMarketing && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 sm:p-6 text-white shadow-sm border border-blue-800/40">
          <div className="relative z-10 space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-300">
              Divisi Pemasaran IndoTech · Produk Bersama Cleanique
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Halo, {currentUser?.name || meData?.profile?.userName || "Tim Marketing"}!
            </h1>
            <p className="text-xs md:text-sm text-blue-100/80 max-w-2xl leading-relaxed">
              Pantau performa kode referral resmi Anda, verifikasi outlet yang mendaftar, dan akumulasi insentif performa pemasaran secara transparan.
            </p>
          </div>

          {/* Quick Info Box */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="font-semibold text-white">Diskon Outlet Baru</div>
              <div className="text-[11px] text-blue-200/70 mt-0.5">Potongan Rp 5.000/bln + Free Trial 7 Hari</div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="font-semibold text-white">Insentif Tim Marketing</div>
              <div className="text-[11px] text-emerald-200/70 mt-0.5">Rp 5.000/bln per outlet aktif berlangganan</div>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/5">
              <div className="font-semibold text-white">Pencairan Insentif</div>
              <div className="text-[11px] text-amber-200/70 mt-0.5">Ditransfer ke rekening bank setelah disetujui</div>
            </div>
          </div>
        </div>
      )}

      {/* Superadmin View */}
      {isSuperadmin && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-blue-50/70 p-4 sm:p-5 rounded-2xl border border-blue-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition">
              <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
                <span>Total Tim Marketing</span>
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
                {profiles.length} <span className="text-xs font-semibold text-blue-700">Anggota</span>
              </div>
              <div className="text-[11px] text-blue-700 font-medium mt-1 truncate">
                Akun promosi aktif
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
                <span>Total Insentif Ditransfer</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-900 mt-2.5 tracking-tight">
                Rp {totalWithdrawnAll.toLocaleString("id-ID")}
              </div>
              <div className="text-[11px] text-emerald-700/90 font-medium mt-1 truncate">
                Pencairan insentif terbayar
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 rounded-2xl border border-amber-200/90 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
              <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
                <span>Menunggu Verifikasi</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-900 mt-2.5 tracking-tight">
                {pendingCommissionsCount} <span className="text-xs font-semibold text-amber-700">Insentif</span>
              </div>
              <div className="text-[11px] text-amber-700/90 font-medium mt-1 truncate">
                Permohonan pencairan dana
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveSubTab("profiles")}
              className={`pb-3 px-4 text-xs font-bold transition cursor-pointer border-b-2 ${
                activeSubTab === "profiles"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Daftar Tim Marketing IndoTech ({profiles.length})
            </button>
            <button
              onClick={() => setActiveSubTab("payouts")}
              className={`pb-3 px-4 text-xs font-bold transition cursor-pointer border-b-2 ${
                activeSubTab === "payouts"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Pencairan & Riwayat Insentif ({commissions.length})
            </button>
          </div>

          {/* Content SubTab 1: Profiles */}
          {activeSubTab === "profiles" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="py-3.5 px-4">Nama Anggota & Kontak</th>
                      <th className="py-3.5 px-4">Rekening Pencairan</th>
                      <th className="py-3.5 px-4">Insentif per Perpanjangan</th>
                      <th className="py-3.5 px-4">Total Penghasilan</th>
                      <th className="py-3.5 px-4">Sudah Dicairkan</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Memuat data tim marketing...
                        </td>
                      </tr>
                    ) : profiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Belum ada anggota tim marketing yang didaftarkan
                        </td>
                      </tr>
                    ) : (
                      profiles.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition">
                          {/* Nama & Kontak */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800 text-xs">{p.userName || "Marketing"}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" /> {p.userEmail}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" /> {p.phone}
                            </div>
                          </td>

                          {/* Rekening */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{p.bankName || "-"}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {p.bankAccountNumber || "-"}
                            </div>
                            <div className="text-[10.5px] text-slate-400">
                              a.n {p.bankAccountName || "-"}
                            </div>
                          </td>

                          {/* Insentif Default */}
                          <td className="py-3.5 px-4 font-bold text-blue-600">
                            <div>
                              {p.commissionRateDefault && p.commissionRateDefault > 100
                                ? `Rp ${Number(p.commissionRateDefault).toLocaleString("id-ID")}`
                                : p.commissionRateDefault && p.commissionRateDefault > 0
                                ? `${p.commissionRateDefault}%`
                                : "Rp 5.000"}
                            </div>
                            <span className="text-[10px] text-slate-400 font-normal">per perpanjangan</span>
                          </td>

                          {/* Total Earned */}
                          <td className="py-3.5 px-4 font-bold text-slate-800 font-mono">
                            Rp {(p.totalEarned || 0).toLocaleString("id-ID")}
                          </td>

                          {/* Total Withdrawn */}
                          <td className="py-3.5 px-4 font-bold text-emerald-600 font-mono">
                            Rp {(p.totalWithdrawn || 0).toLocaleString("id-ID")}
                          </td>

                          {/* Aksi */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                              title="Ubah Profil Anggota"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Content SubTab 2: Payouts */}
          {activeSubTab === "payouts" && (
            <CommissionPayoutTable
              commissions={commissions}
              onUpdateStatus={updateCommissionStatus}
              isSuperadmin={true}
            />
          )}
        </>
      )}

      {/* Marketing Self Dashboard */}
      {isMarketing && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-blue-50/70 p-4 sm:p-5 rounded-2xl border border-blue-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition">
              <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
                <span>Total Outlet Terdaftar</span>
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
                {meData?.totalTenantsCount ?? 0} <span className="text-xs font-semibold text-blue-700">Outlet</span>
              </div>
              <div className="text-[11px] text-blue-700 font-medium mt-1 truncate">
                Mendaftar dengan kode Anda
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50/90 via-violet-50/40 to-white p-4 sm:p-5 rounded-2xl border border-indigo-200/90 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition">
              <div className="flex items-center justify-between text-xs text-indigo-800 font-semibold">
                <span>Total Insentif Terakumulasi</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-indigo-950 mt-2.5 tracking-tight">
                Rp {(meData?.commissionsSummary?.totalEarned || 0).toLocaleString("id-ID")}
              </div>
              <div className="text-[11px] text-indigo-700/90 font-medium mt-1 truncate">
                Akumulasi insentif performa
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
              <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
                <span>Insentif Sudah Ditransfer</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-900 mt-2.5 tracking-tight">
                Rp {(meData?.commissionsSummary?.totalWithdrawn || 0).toLocaleString("id-ID")}
              </div>
              <div className="text-[11px] text-emerald-700/90 font-medium mt-1 truncate">
                Telah masuk rekening bank
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 rounded-2xl border border-amber-200/90 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
              <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
                <span>Menunggu Pencairan</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-900 mt-2.5 tracking-tight">
                Rp {(meData?.commissionsSummary?.pendingCommission || 0).toLocaleString("id-ID")}
              </div>
              <div className="text-[11px] text-amber-700/90 font-medium mt-1 truncate">
                Menunggu verifikasi admin
              </div>
            </div>
          </div>

          {/* Rekening Penerima Insentif Box */}
          {meData?.profile && (
            <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
              <div>
                <span className="text-xs text-slate-400 font-medium">Rekening Bank Penerima Insentif</span>
                <div className="text-base font-bold mt-0.5 tracking-wide text-white">
                  {meData.profile.bankName} — {meData.profile.bankAccountNumber}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Atas Nama: {meData.profile.bankAccountName}</div>
              </div>
              <button
                onClick={() => handleOpenEdit(meData.profile!)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
              >
                Ubah Rekening Bank
              </button>
            </div>
          )}

          {/* Active Referral Codes Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Kode Referral Resmi Anda</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bagikan kode referral resmi Anda ke pemilik laundry untuk memberikan diskon Rp 5.000/bln dan mendapatkan insentif bulanan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meData?.codes && meData.codes.length > 0 ? (
                meData.codes.map((c) => (
                  <div
                    key={c.id}
                    className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 via-indigo-50/30 to-white border border-blue-200/70 shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Top Bar: Code & Outlet Count */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-blue-900 text-base tracking-widest bg-white px-3 py-1 rounded-xl border border-blue-300 shadow-xs">
                            {c.code}
                          </span>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Resmi IndoTech
                          </span>
                        </div>
                        <span className="font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg text-xs">
                          {c.tenantCount ?? c.currentUsage ?? 0} Outlet
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-800 mt-3">{c.name}</p>

                      {/* Benefit Info (clean text, no badge clutter) */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600">
                        <span>Diskon Outlet: <strong className="text-blue-700">Rp 5.000/bln</strong></span>
                        <span>Insentif: <strong className="text-emerald-700">Rp 5.000/bln</strong></span>
                        <span>Total Pemakaian: <strong className="text-slate-900">{c.currentUsage || 0}x</strong></span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-blue-100">
                      {/* Copy Code */}
                      <button
                        type="button"
                        onClick={() => handleCopyCode(c.code)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          copiedCode === c.code
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs"
                        }`}
                      >
                        {copiedCode === c.code ? "Tersalin!" : "Salin Kode"}
                      </button>

                      {/* Copy Link */}
                      <button
                        type="button"
                        onClick={() => handleCopyLink(c.code)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          copiedLink === c.code
                            ? "bg-emerald-600 text-white shadow-2xs"
                            : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs"
                        }`}
                      >
                        {copiedLink === c.code ? "Link Tersalin!" : "Salin Link"}
                      </button>

                      {/* WhatsApp Share */}
                      <button
                        type="button"
                        onClick={() => handleDirectWhatsAppShare(c.code)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition cursor-pointer"
                        title="Bagikan langsung ke WhatsApp"
                      >
                        WhatsApp
                      </button>

                      {/* Detail & QR */}
                      <button
                        type="button"
                        onClick={() => setShareCode(c)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition cursor-pointer"
                      >
                        QR &amp; Detail
                      </button>

                      {(c.tenantCount ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCodeForTenants(c)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-xs transition cursor-pointer"
                        >
                          Lihat Outlet ({c.tenantCount})
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  Anda belum memiliki kode referral khusus. Hubungi Super Admin Cleanique untuk dibuatkan kode referral resmi.
                </div>
              )}
            </div>
          </div>

          {/* Dedicated Section: Daftar Outlet yang Menggunakan Kode Referral Anda */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Daftar Outlet yang Menggunakan Kode Referral Anda
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total {meData?.totalTenantsCount || 0} outlet aktif yang mendaftar menggunakan kode referral Anda
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    placeholder="Cari nama outlet, kota..."
                    className="w-full sm:w-48 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {tenantSearch && (
                    <button
                      onClick={() => setTenantSearch("")}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <select
                  value={tenantStatusFilter}
                  onChange={(e) => setTenantStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="trial">Trial 7 Hari</option>
                  <option value="subscribed">Berlangganan</option>
                </select>
              </div>
            </div>

            {filteredTenants.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-2xl bg-slate-50/50 border border-dashed border-slate-200">
                <h4 className="text-xs font-bold text-slate-700">Belum Ada Outlet Terdaftar</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                  {tenantSearch || tenantStatusFilter !== "all"
                    ? "Tidak ada data outlet yang sesuai dengan filter pencarian Anda."
                    : "Belum ada cabang laundry yang mendaftar menggunakan kode referral Anda."}
                </p>
                <div className="mt-4 p-3 bg-white border border-slate-200/80 rounded-xl max-w-lg mx-auto text-left text-[11px] text-slate-600">
                  <span className="font-semibold text-blue-900 block mb-1">Tips Pemasaran Tim IndoTech:</span>
                  Bagikan kode referral resmi atau tautan pendaftaran Anda ke pemilik laundry. Setiap pendaftar baru berhak atas potongan langganan Rp 5.000/bulan dan uji coba gratis selama 7 hari.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Nama Outlet</th>
                      <th className="py-3 px-4">Kota / Lokasi</th>
                      <th className="py-3 px-4">Kontak WhatsApp</th>
                      <th className="py-3 px-4">Kode Referral</th>
                      <th className="py-3 px-4">Status Langganan</th>
                      <th className="py-3 px-4">Bergabung Pada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredTenants.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{t.outletName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {t.id}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {t.city || "-"}
                        </td>
                        <td className="py-3 px-4">
                          {t.phone ? (
                            <a
                              href={`https://wa.me/${t.phone.replace(/^0/, "62").replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                              {t.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                            {t.referralCode || "-"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className={`whitespace-nowrap inline-flex items-center font-semibold text-[10.5px] px-2 py-0.5 rounded-full shrink-0 w-fit ${
                              t.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                            }`}>
                              {t.isTrial ? "Trial 7 Hari" : "Aktif"}
                            </span>
                            {t.subscriptionUntil && (
                              <span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                                s/d {new Date(t.subscriptionUntil).toLocaleDateString("id-ID")}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {t.createdAt ? new Date(t.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          }) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Riwayat Insentif Self */}
          <div className="space-y-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Riwayat Insentif Pemasaran</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar perolehan insentif dari pembayaran dan perpanjangan paket langganan outlet aktif.
              </p>
            </div>
            <CommissionPayoutTable commissions={commissions} isSuperadmin={false} />
          </div>
        </>
      )}

      {/* Modal Tracked Tenants per specific Referral Code */}
      {selectedCodeForTenants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Outlet Pengguna Kode:{" "}
                  <span className="font-mono text-blue-700 font-black">
                    {selectedCodeForTenants.code}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar cabang laundry yang mendaftar menggunakan kode referral ini
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCodeForTenants(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 flex-1 space-y-3">
              {(!selectedCodeForTenants.tenants || selectedCodeForTenants.tenants.length === 0) ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Belum ada tenant yang mendaftar menggunakan kode ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
                  {selectedCodeForTenants.tenants.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{t.outletName}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Kota: {t.city || "-"}
                        </div>
                        {t.phone && (
                          <div className="mt-1">
                            <a
                              href={`https://wa.me/${t.phone.replace(/^0/, "62").replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-700 font-medium text-[11px]"
                            >
                              {t.phone}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="text-right sm:self-center shrink-0">
                        <span
                          className={`whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${
                            t.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {t.isTrial ? "Trial 7 Hari" : "Aktif"}
                        </span>
                        {t.subscriptionUntil && (
                          <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">
                            Hingga: {new Date(t.subscriptionUntil).toLocaleDateString("id-ID")}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Gabung:{" "}
                          {t.createdAt
                            ? new Date(t.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "-"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCodeForTenants(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Edit / Create */}
      <MarketingFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          onCreated?.();
        }}
        onSubmit={handleFormSubmit}
        initialData={selectedProfileForEdit}
      />

      {/* Share Box Modal */}
      <ReferralCodeShareBox
        isOpen={!!shareCode}
        onClose={() => setShareCode(null)}
        code={shareCode}
      />
    </div>
  );
};
