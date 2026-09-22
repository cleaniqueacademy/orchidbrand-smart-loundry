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
} from "lucide-react";
import { User, MarketingProfile } from "../../../types";
import { useMarketing } from "../../../hooks/useMarketing";
import { MarketingFormModal } from "./MarketingFormModal";
import { CommissionPayoutTable } from "./CommissionPayoutTable";
import { ReferralCodeShareBox } from "./ReferralCodeShareBox";

interface MarketingTabProps {
  currentUser?: User;
}

export const MarketingTab: React.FC<MarketingTabProps> = ({ currentUser }) => {
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

  const handleOpenEdit = (profile: MarketingProfile) => {
    setSelectedProfileForEdit(profile);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    if (selectedProfileForEdit) {
      return await updateProfile(selectedProfileForEdit.id, data);
    } else {
      return await createProfile(data);
    }
  };

  // Calculations for Superadmin
  const totalEarnedAll = profiles.reduce((acc, p) => acc + (p.totalEarned || 0), 0);
  const totalWithdrawnAll = profiles.reduce((acc, p) => acc + (p.totalWithdrawn || 0), 0);
  const pendingCommissionsCount = commissions.filter((c) => c.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <UserCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {isSuperadmin ? "Manajemen Mitra Affiliate & Marketing" : "Dashboard Kemitraan Affiliate"}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isSuperadmin
              ? "Kelola akun marketing, atur persentase komisi, dan proses pencairan dana reward."
              : "Pantau performa kode referral Anda, rincian komisi, dan rekening pencairan dana."}
          </p>
        </div>

        {isSuperadmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Mitra Marketing
          </button>
        )}
      </div>

      {/* Superadmin View */}
      {isSuperadmin && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400">Total Mitra Marketing</span>
                <h3 className="text-2xl font-bold text-slate-800">{profiles.length} Orang</h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400">Total Komisi Ditransfer</span>
                <h3 className="text-2xl font-bold text-emerald-600 font-mono">
                  Rp {totalWithdrawnAll.toLocaleString("id-ID")}
                </h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400">Menunggu Verifikasi</span>
                <h3 className="text-2xl font-bold text-amber-600 font-mono">
                  {pendingCommissionsCount} Komisi
                </h3>
              </div>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveSubTab("profiles")}
              className={`pb-3 px-4 text-xs font-bold transition cursor-pointer border-b-2 ${
                activeSubTab === "profiles"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Daftar Mitra Marketing ({profiles.length})
            </button>
            <button
              onClick={() => setActiveSubTab("payouts")}
              className={`pb-3 px-4 text-xs font-bold transition cursor-pointer border-b-2 ${
                activeSubTab === "payouts"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Pencairan & Riwayat Komisi ({commissions.length})
            </button>
          </div>

          {/* Content SubTab 1: Profiles */}
          {activeSubTab === "profiles" && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="py-3.5 px-4">Nama Mitra & Kontak</th>
                      <th className="py-3.5 px-4">Rekening Pencairan</th>
                      <th className="py-3.5 px-4">Komisi Default</th>
                      <th className="py-3.5 px-4">Total Penghasilan</th>
                      <th className="py-3.5 px-4">Sudah Dicairkan</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Memuat data mitra marketing...
                        </td>
                      </tr>
                    ) : profiles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Belum ada mitra marketing yang didaftarkan
                        </td>
                      </tr>
                    ) : (
                      profiles.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition">
                          {/* Nama & Kontak */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800 text-xs">{p.userName || "Mitra"}</div>
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

                          {/* Komisi % */}
                          <td className="py-3.5 px-4 font-bold text-indigo-600">
                            {p.commissionRateDefault}%
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
                              title="Ubah Profil Mitra"
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

      {/* Marketing Affiliate Self Dashboard */}
      {isMarketing && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400">Total Komisi Terakumulasi</span>
                <h3 className="text-2xl font-bold text-slate-800 font-mono">
                  Rp {(meData?.commissionsSummary?.totalEarned || 0).toLocaleString("id-ID")}
                </h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400">Sudah Ditransfer ke Rekening</span>
                <h3 className="text-2xl font-bold text-emerald-600 font-mono">
                  Rp {(meData?.commissionsSummary?.totalWithdrawn || 0).toLocaleString("id-ID")}
                </h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400">Saldo Menunggu Pencairan</span>
                <h3 className="text-2xl font-bold text-amber-600 font-mono">
                  Rp {(meData?.commissionsSummary?.pendingCommission || 0).toLocaleString("id-ID")}
                </h3>
              </div>
            </div>
          </div>

          {/* Rekening Tujuan Box */}
          {meData?.profile && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <span className="text-xs text-indigo-200">Rekening Tujuan Pencairan Komisi</span>
                  <div className="text-sm font-bold mt-0.5">
                    {meData.profile.bankName} — {meData.profile.bankAccountNumber}
                  </div>
                  <div className="text-xs text-indigo-200">a.n {meData.profile.bankAccountName}</div>
                </div>
              </div>
              <button
                onClick={() => handleOpenEdit(meData.profile!)}
                className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold backdrop-blur-xs transition cursor-pointer self-start sm:self-auto"
              >
                Ubah Rekening
              </button>
            </div>
          )}

          {/* Active Referral Codes Section */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Kode Referral Aktif Anda</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {meData?.codes && meData.codes.length > 0 ? (
                meData.codes.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-mono font-bold text-blue-700 text-sm">{c.code}</span>
                      <p className="text-xs text-slate-600 mt-0.5">{c.name}</p>
                      <span className="text-[11px] text-slate-400 mt-1 block">
                        Pemakaian: {c.currentUsage} kali
                      </span>
                    </div>
                    <button
                      onClick={() => setShareCode(c)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Bagikan
                    </button>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-6 text-center text-xs text-slate-400">
                  Anda belum memiliki kode referral khusus. Hubungi Super Admin untuk dibuatkan kode.
                </div>
              )}
            </div>
          </div>

          {/* Riwayat Komisi Self */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-800">Riwayat Komisi Transaksi</h3>
            <CommissionPayoutTable commissions={commissions} isSuperadmin={false} />
          </div>
        </>
      )}

      {/* Modal Form Edit / Create */}
      <MarketingFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
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
