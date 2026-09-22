import React, { useState } from "react";
import {
  DollarSign,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Filter,
  CreditCard,
} from "lucide-react";
import { MarketingCommission } from "../../../types";

interface CommissionPayoutTableProps {
  commissions: MarketingCommission[];
  onUpdateStatus?: (
    id: string,
    status: "approved" | "paid" | "rejected" | "pending",
    notes?: string
  ) => Promise<{ success: boolean; message?: string }>;
  isSuperadmin?: boolean;
}

export const CommissionPayoutTable: React.FC<CommissionPayoutTableProps> = ({
  commissions,
  onUpdateStatus,
  isSuperadmin = false,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = commissions.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return (
      (c.codeName && c.codeName.toLowerCase().includes(q)) ||
      (c.marketingName && c.marketingName.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  const handleAction = async (
    id: string,
    status: "approved" | "paid" | "rejected",
    actionLabel: string
  ) => {
    if (!onUpdateStatus) return;

    let notes: string | undefined;
    if (status === "rejected") {
      const input = prompt("Alasan penolakan komisi (opsional):");
      if (input === null) return; // cancel
      notes = input || undefined;
    } else {
      if (!confirm(`Konfirmasi ${actionLabel} untuk data komisi ini?`)) return;
    }

    setUpdatingId(id);
    try {
      await onUpdateStatus(id, status, notes);
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sudah Ditransfer
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
            <Clock className="w-3 h-3 text-blue-600" /> Disetujui (Siap Cair)
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">
            <XCircle className="w-3 h-3 text-rose-600" /> Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
            <Clock className="w-3 h-3 text-amber-600" /> Menunggu Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama affiliate atau kode promo..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Status Komisi:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu Review</option>
            <option value="approved">Disetujui (Siap Cair)</option>
            <option value="paid">Sudah Ditransfer</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3.5 px-4">Tanggal & Ref Code</th>
                <th className="py-3.5 px-4">Mitra Marketing</th>
                <th className="py-3.5 px-4">Nilai Transaksi Dasar</th>
                <th className="py-3.5 px-4">Jumlah Komisi</th>
                <th className="py-3.5 px-4">Status Pencairan</th>
                {isSuperadmin && <th className="py-3.5 px-4 text-right">Aksi Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isSuperadmin ? 6 : 5} className="py-12 text-center text-slate-400">
                    Belum ada riwayat komisi yang sesuai
                  </td>
                </tr>
              ) : (
                filtered.map((comm) => {
                  const isUpdating = updatingId === comm.id;
                  const dateStr = comm.createdAt
                    ? new Date(comm.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-";

                  return (
                    <tr key={comm.id} className="hover:bg-slate-50/50 transition">
                      {/* Tanggal & Kode */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                          {comm.codeName || "KODE"}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-1">{dateStr}</div>
                      </td>

                      {/* Mitra Marketing */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {comm.marketingName || "Mitra Affiliate"}
                      </td>

                      {/* Nilai Transaksi */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        Rp {comm.baseAmount.toLocaleString("id-ID")}
                      </td>

                      {/* Jumlah Komisi */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-emerald-600 font-mono text-xs">
                          Rp {comm.commissionAmount.toLocaleString("id-ID")}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(comm.status)}
                        {comm.paidAt && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Cair: {new Date(comm.paidAt).toLocaleDateString("id-ID")}
                          </div>
                        )}
                        {comm.notes && (
                          <div className="text-[10.5px] text-slate-500 italic mt-0.5">
                            {comm.notes}
                          </div>
                        )}
                      </td>

                      {/* Aksi Superadmin */}
                      {isSuperadmin && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {comm.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleAction(comm.id, "approved", "Setujui Komisi")}
                                  disabled={isUpdating}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition cursor-pointer"
                                >
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleAction(comm.id, "rejected", "Tolak Komisi")}
                                  disabled={isUpdating}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition cursor-pointer"
                                >
                                  Tolak
                                </button>
                              </>
                            )}

                            {comm.status === "approved" && (
                              <button
                                onClick={() => handleAction(comm.id, "paid", "Tandai Sudah Ditransfer")}
                                disabled={isUpdating}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 shadow-xs transition cursor-pointer"
                              >
                                <CreditCard className="w-3 h-3" />
                                Tandai Ditransfer
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
