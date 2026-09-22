import React, { useState } from "react";
import {
  Tag,
  Plus,
  Search,
  Share2,
  Percent,
  DollarSign,
  Calendar,
  Building2,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart2,
  Users,
} from "lucide-react";
import { ReferralCode, User } from "../../../types";
import { useReferralCodes, TenantActivationItem } from "../../../hooks/useReferralCodes";
import { useMarketing } from "../../../hooks/useMarketing";
import { ReferralCodeFormModal } from "./ReferralCodeFormModal";
import { ReferralCodeShareBox } from "./ReferralCodeShareBox";
import { ReferralCodeTenantActivationList } from "./ReferralCodeTenantActivationList";

interface ReferralCodesTabProps {
  currentUser?: User;
}

export const ReferralCodesTab: React.FC<ReferralCodesTabProps> = ({ currentUser }) => {
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

  const isSuperadmin = currentUser?.role === "superadmin";
  const isMarketing = currentUser?.role === "marketing";
  const canManage = isSuperadmin || isMarketing;

  // Filtered Codes
  const filteredCodes = codes.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q));

    const isActive = String(c.isActive) === "true";
    if (filterActive === "active" && !isActive) return false;
    if (filterActive === "inactive" && isActive) return false;

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
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Tag className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              Kode Referral & Promosi
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola kupon diskon pendaftaran outlet baru dan pantau komisi kemitraan affiliate.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Buat Kode Promo
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Program Kupon</span>
            <h3 className="text-2xl font-bold text-slate-800">{codes.length}</h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Total Pemakaian Kupon</span>
            <h3 className="text-2xl font-bold text-emerald-600">
              {totalUsageAll.toLocaleString("id-ID")} kali
            </h3>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">Kupon Aktif Berjalan</span>
            <h3 className="text-2xl font-bold text-slate-800">
              {codes.filter((c) => String(c.isActive) === "true").length}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode promo atau nama program..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif Saja</option>
            <option value="inactive">Nonaktif Saja</option>
          </select>
        </div>
      </div>

      {/* Table Listing */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3.5 px-4">Kode & Nama Kupon</th>
                <th className="py-3.5 px-4">Diskon Pelanggan</th>
                <th className="py-3.5 px-4">Komisi Affiliate</th>
                <th className="py-3.5 px-4">Kuota / Pemakaian</th>
                <th className="py-3.5 px-4">Masa Berlaku</th>
                <th className="py-3.5 px-4">Cakupan Outlet</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Memuat daftar kode referral...
                  </td>
                </tr>
              ) : filteredCodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Belum ada kode referral yang ditemukan
                  </td>
                </tr>
              ) : (
                filteredCodes.map((code) => {
                  const isActive = String(code.isActive) === "true";
                  const appliesAll = String(code.appliesToAllTenants) === "true";

                  return (
                    <tr key={code.id} className="hover:bg-slate-50/50 transition">
                      {/* Kode & Nama */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-lg text-xs tracking-wider">
                            {code.code}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 mt-1">{code.name}</div>
                        {code.description && (
                          <div className="text-[11px] text-slate-400 line-clamp-1">
                            {code.description}
                          </div>
                        )}
                      </td>

                      {/* Diskon */}
                      <td className="py-3.5 px-4 font-semibold">
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          <Percent className="w-3 h-3" />
                          {code.discountType === "percent"
                            ? `${code.discountValue}%`
                            : `Rp ${code.discountValue.toLocaleString("id-ID")}`}
                        </span>
                      </td>

                      {/* Komisi */}
                      <td className="py-3.5 px-4 font-semibold">
                        <span className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          <DollarSign className="w-3 h-3" />
                          {code.commissionType === "percent"
                            ? `${code.commissionValue}%`
                            : `Rp ${code.commissionValue.toLocaleString("id-ID")}`}
                        </span>
                      </td>

                      {/* Kuota */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {code.currentUsage} / {code.maxUsage ? code.maxUsage : "∞"}
                        </div>
                        {code.maxUsage && (
                          <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-blue-600 h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (code.currentUsage / code.maxUsage) * 100)}%`,
                              }}
                            />
                          </div>
                        )}
                      </td>

                      {/* Masa Berlaku */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-500">
                        {code.validFrom || code.validUntil ? (
                          <>
                            <div>Mulai: {code.validFrom || "Sekarang"}</div>
                            <div>Sampai: {code.validUntil || "Seterusnya"}</div>
                          </>
                        ) : (
                          <span className="text-slate-400">Tidak ada batas</span>
                        )}
                      </td>

                      {/* Cakupan Outlet */}
                      <td className="py-3.5 px-4">
                        {appliesAll ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            Semua Cabang
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenTenants(code)}
                            className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full transition cursor-pointer"
                          >
                            <Building2 className="w-3 h-3" />
                            Outlet Pilihan...
                          </button>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aktif
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" /> Nonaktif
                            </>
                          )}
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
    </div>
  );
};
