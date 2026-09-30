import React, { useState, useEffect, useMemo } from "react";
import {
  Tag,
  Plus,
  Search,
  Share2,
  Trash2,
  Edit2,
  XCircle,
  TrendingUp,
  BarChart2,
  Users,
  Store,
  Phone,
  MapPin,
} from "lucide-react";
import { ReferralCode, User } from "../../../types";
import { useReferralCodes, TenantActivationItem } from "../../../hooks/useReferralCodes";
import { useMarketing } from "../../../hooks/useMarketing";
import { authHeaders } from "../../../utils/api";
import { ReferralCodeFormModal } from "./ReferralCodeFormModal";
import { ReferralCodeShareBox } from "./ReferralCodeShareBox";
import { ReferralCodeTenantActivationList } from "./ReferralCodeTenantActivationList";

interface ReferralCodesTabProps {
  currentUser?: User;
  onNavigateToMarketing?: () => void;
}

export const ReferralCodesTab: React.FC<ReferralCodesTabProps> = ({ currentUser, onNavigateToMarketing }) => {
  const {
    codes,
    loading,
    createCode,
    updateCode,
    deleteCode,
    fetchStats,
    fetchTenants,
    toggleTenant,
  } = useReferralCodes();

  const { profiles } = useMarketing();

  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<string>("all"); // 'all' | 'active' | 'inactive'
  const [filterMarketing, setFilterMarketing] = useState<string>("all"); // 'all' | profileId

  // Build map: profileId -> profile for fast lookup
  const profileMap = useMemo(() => {
    const map: Record<string, typeof profiles[0]> = {};
    for (const p of profiles) map[p.id] = p;
    return map;
  }, [profiles]);

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCodeForEdit, setSelectedCodeForEdit] = useState<ReferralCode | null>(null);

  const [shareCode, setShareCode] = useState<ReferralCode | null>(null);
  const [tenantListCode, setTenantListCode] = useState<ReferralCode | null>(null);
  const [tenantListItems, setTenantListItems] = useState<TenantActivationItem[]>([]);

  // Stats drawer
  const [statsCode, setStatsCode] = useState<ReferralCode | null>(null);
  const [statsData, setStatsData] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Tracking Registered Tenants per Referral Code
  const [trackList, setTrackList] = useState<any[]>([]);
  const [trackedTenantsModal, setTrackedTenantsModal] = useState<{
    code: string;
    tenants: any[];
  } | null>(null);

  const fetchTracking = async () => {
    try {
      const res = await fetch("/api/referral-codes/track", {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTrackList(json.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchTracking();
  }, [codes]);

  const trackMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const item of trackList) {
      map[item.id] = item;
      map[item.code] = item;
    }
    return map;
  }, [trackList]);

  const isSuperadmin = currentUser?.role === "superadmin";
  const isMarketing = currentUser?.role === "marketing";
  const canManage = isSuperadmin; // Hanya Superadmin yang berwenang membuat & mengedit kode kupon promo

  // Filtered Codes
  const filteredCodes = codes.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      // also search owner name
      (c.marketingProfileId &&
        profileMap[c.marketingProfileId]?.userName?.toLowerCase().includes(q));

    const isActive = String(c.isActive) === "true";
    if (filterActive === "active" && !isActive) return false;
    if (filterActive === "inactive" && isActive) return false;

    // Filter by marketing member
    if (filterMarketing !== "all") {
      if (c.marketingProfileId !== filterMarketing) return false;
    }

    return matchSearch;
  });

  const totalUsageAll = codes.reduce((acc, c) => acc + (c.currentUsage || 0), 0);

  const handleOpenCreate = () => {
    setSelectedCodeForEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (code: ReferralCode) => {
    setSelectedCodeForEdit(code);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: Partial<ReferralCode>): Promise<boolean> => {
    if (selectedCodeForEdit) {
      const res = await updateCode(selectedCodeForEdit.id, data);
      return res.success;
    } else {
      const res = await createCode(data);
      return res.success;
    }
  };

  const handleDelete = async (id: string, codeName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus kode referral "${codeName}"?`)) {
      await deleteCode(id);
    }
  };

  const handleOpenTenants = async (code: ReferralCode) => {
    setTenantListCode(code);
    const items = await fetchTenants(code.id);
    setTenantListItems(items);
  };

  const handleOpenStats = async (code: ReferralCode) => {
    setStatsCode(code);
    setStatsLoading(true);
    try {
      const res = await fetchStats(code.id);
      setStatsData(res);
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Kode Referral &amp; Promosi</h2>
          <p className="text-xs text-zinc-500">Kelola kupon diskon pendaftaran dan pantau performa tim marketing IndoTech.</p>
        </div>
        {/* Tombol diarahkan ke halaman Tim Marketing untuk buat anggota baru */}
        {isSuperadmin && (
          <button
            onClick={() => onNavigateToMarketing?.()}
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Anggota Marketing Baru
          </button>
        )}
      </div>

      {/* Info Banner: Auto-generated codes */}
      {isSuperadmin && (
        <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
          <div className="w-6 h-6 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 mt-0.5">
            <Tag className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-violet-800">
              Kode referral otomatis dibuat saat membuat anggota tim marketing baru
            </p>
            <p className="text-[11px] text-violet-600 mt-0.5 leading-relaxed">
              Setiap anggota marketing yang didaftarkan melalui menu{" "}
              <span className="font-bold">Tim Marketing</span> akan otomatis mendapatkan satu kode referral
              eksklusif (ditandai badge <span className="font-bold bg-violet-100 px-1 rounded">AUTO</span>).
              Kode ini dapat Anda pantau performanya atau ubah nilainya kapan saja.
            </p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-blue-50/70 p-4 sm:p-5 rounded-2xl border border-blue-200 shadow-xs relative overflow-hidden group hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
            <span>Total Program Kupon</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {codes.length} <span className="text-xs font-semibold text-blue-700">Program</span>
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1 truncate">
            Kupon referral terdaftar
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span>Total Pemakaian Kupon</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-950 mt-2.5 tracking-tight">
            {totalUsageAll.toLocaleString("id-ID")} <span className="text-xs font-semibold text-emerald-700">Kali</span>
          </div>
          <div className="text-[11px] text-emerald-700/90 font-medium mt-1 truncate">
            Digunakan saat registrasi cabang
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 rounded-2xl border border-amber-200/90 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span>Kupon Aktif Berjalan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-950 mt-2.5 tracking-tight">
            {codes.filter((c) => String(c.isActive) === "true").length} <span className="text-xs font-semibold text-amber-700">Aktif</span>
          </div>
          <div className="text-[11px] text-amber-700/90 font-medium mt-1 truncate">
            Siap dibagikan dan diklaim
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode, nama, atau pemilik..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Status:</span>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Semua</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>

          {/* Filter Marketing Member */}
          {isSuperadmin && profiles.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Pemilik:</span>
              <select
                value={filterMarketing}
                onChange={(e) => setFilterMarketing(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[180px]"
              >
                <option value="all">Semua Anggota</option>
                <option value="">Tanpa Pemilik</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.userName || p.userEmail || p.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset filter */}
          {(filterMarketing !== "all" || filterActive !== "all" || search) && (
            <button
              onClick={() => { setFilterMarketing("all"); setFilterActive("all"); setSearch(""); }}
              className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table Listing */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3.5 px-4">Kode & Nama Kupon</th>
                <th className="py-3.5 px-4">Pemilik</th>
                <th className="py-3.5 px-4">Diskon</th>
                <th className="py-3.5 px-4">Insentif</th>
                <th className="py-3.5 px-4 text-center">Outlet</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Memuat daftar kode referral...
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Belum ada kode referral yang ditemukan
                  </td>
                </tr>
              ) : (
                filteredCodes.map((code) => {
                  const isActive = String(code.isActive) === "true";

                  return (
                    <tr key={code.id} className="hover:bg-slate-50/50 transition">
                      {/* Kode & Nama */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-lg text-xs tracking-wider">
                            {code.code}
                          </span>
                          {/* Badge Auto-generated */}
                          {code.marketingProfileId && (
                            <span className="text-[9px] font-bold bg-violet-50 text-violet-600 border border-violet-100 px-1.5 py-0.5 rounded-full">
                              AUTO
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-800 mt-1">{code.name}</div>
                        {code.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1">
                            {code.description}
                          </div>
                        )}
                      </td>

                      {/* Pemilik */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {code.marketingProfileId && profileMap[code.marketingProfileId] ? (
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">
                              {profileMap[code.marketingProfileId].userName || "—"}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {profileMap[code.marketingProfileId].userEmail}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Umum / Manual</span>
                        )}
                      </td>

                      {/* Diskon */}
                      <td className="py-3.5 px-4 font-semibold whitespace-nowrap">
                        <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 whitespace-nowrap shrink-0">
                          {code.discountType === "percent"
                            ? `${code.discountValue}%`
                            : `Rp ${code.discountValue.toLocaleString("id-ID")}`}
                        </span>
                      </td>

                      {/* Komisi */}
                      <td className="py-3.5 px-4 font-semibold whitespace-nowrap">
                        <span className="inline-flex items-center text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 whitespace-nowrap shrink-0">
                          {code.commissionType === "percent"
                            ? `${code.commissionValue}%`
                            : `Rp ${code.commissionValue.toLocaleString("id-ID")}`}
                        </span>
                      </td>

                      {/* Outlet Terdaftar */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            const info = trackMap[code.id] || trackMap[code.code];
                            setTrackedTenantsModal({
                              code: code.code,
                              tenants: info?.tenants || [],
                            });
                          }}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition cursor-pointer whitespace-nowrap shrink-0"
                          title="Lihat daftar cabang yang mendaftar menggunakan kode ini"
                        >
                          <span>{trackMap[code.id]?.totalTenants ?? code.currentUsage ?? 0} Outlet</span>
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Share Box */}
                          <button
                            onClick={() => setShareCode(code)}
                            title="Bagikan Link / QR"
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {/* Stats */}
                          <button
                            onClick={() => handleOpenStats(code)}
                            title="Lihat Performa"
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          {canManage && (
                            <button
                              onClick={() => handleOpenEdit(code)}
                              title="Ubah Kupon"
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Delete */}
                          {isSuperadmin && (
                            <button
                              onClick={() => handleDelete(code.id, code.code)}
                              title="Hapus Kupon"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      <ReferralCodeFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedCodeForEdit}
        marketingProfiles={profiles}
        userRole={currentUser?.role}
      />

      {/* Share Box Modal */}
      <ReferralCodeShareBox
        isOpen={!!shareCode}
        onClose={() => setShareCode(null)}
        code={shareCode}
      />

      {/* Outlet Activation Modal */}
      <ReferralCodeTenantActivationList
        isOpen={!!tenantListCode}
        onClose={() => setTenantListCode(null)}
        code={tenantListCode}
        tenants={tenantListItems}
        onToggle={async (tenantId, isEnabled) => {
          if (!tenantListCode) return { success: false };
          return await toggleTenant(tenantListCode.id, tenantId, isEnabled);
        }}
      />

      {/* Stats Drawer / Modal */}
      {statsCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Statistik Performa</span>
                <h3 className="text-base font-bold text-slate-800 font-mono">{statsCode.code}</h3>
              </div>
              <button
                onClick={() => setStatsCode(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {statsLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Memuat statistik...</div>
            ) : statsData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-500">Klik / View Link</span>
                    <div className="text-lg font-bold text-slate-800">{statsData.clicks}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-500">Registrasi Berhasil</span>
                    <div className="text-lg font-bold text-emerald-600">{statsData.signups}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-500">Konversi Klik-ke-Daftar</span>
                    <div className="text-lg font-bold text-blue-600">{statsData.conversionRate}%</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[11px] text-slate-500">Transaksi Berbayar</span>
                    <div className="text-lg font-bold text-indigo-600">{statsData.paymentsCount}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-emerald-800 font-semibold block">Total Komisi Terakumulasi</span>
                    <span className="text-xs text-emerald-600">Dari seluruh invoice terbayar</span>
                  </div>
                  <div className="text-base font-extrabold text-emerald-700">
                    Rp {Number(statsData.totalCommission || 0).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-slate-400">Data statistik belum tersedia</div>
            )}
          </div>
        </div>
      )}

      {/* Modal Daftar Tenant Terdaftar Berdasarkan Kode Referral */}
      {trackedTenantsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Outlet Terdaftar via Kode: <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{trackedTenantsModal.code}</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Total {trackedTenantsModal.tenants.length} outlet terdaftar menggunakan kode ini.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTrackedTenantsModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {trackedTenantsModal.tenants.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Belum ada outlet yang mendaftar menggunakan kode referral ini.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
                {trackedTenantsModal.tenants.map((t: any) => (
                  <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {t.outletName}
                        </span>
                        {t.isTrial && (
                          <span className="bg-blue-100 text-blue-700 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full">
                            TRIAL
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10.5px] text-slate-400 mt-1">
                        {t.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {t.phone}
                          </span>
                        )}
                        {t.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {t.city}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 block">
                        Diskon: Rp 5.000/bln
                      </span>
                      <span className="text-[9.5px] text-slate-400 mt-1 block">
                        Aktif s/d: {t.subscriptionUntil ? new Date(t.subscriptionUntil).toLocaleDateString("id-ID") : "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setTrackedTenantsModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
