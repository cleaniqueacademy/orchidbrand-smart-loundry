import React, { useState } from "react";
import {
  DollarSign,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { MarketingWithdrawal } from "../../../types";
import { ProcessWithdrawalModal } from "./ProcessWithdrawalModal";

interface WithdrawalRequestsTableProps {
  withdrawals: MarketingWithdrawal[];
  isSuperadmin?: boolean;
  onUpdateStatus?: (
    id: string,
    status: "paid" | "rejected",
    notes?: string,
    proofUrl?: string
  ) => Promise<{ success: boolean; message?: string }>;
}

export const WithdrawalRequestsTable: React.FC<WithdrawalRequestsTableProps> = ({
  withdrawals,
  isSuperadmin = false,
  onUpdateStatus,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<MarketingWithdrawal | null>(null);

  const filtered = withdrawals.filter((w) => {
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return (
      (w.marketingName && w.marketingName.toLowerCase().includes(q)) ||
      (w.bankName && w.bankName.toLowerCase().includes(q)) ||
      (w.bankAccountNumber && w.bankAccountNumber.toLowerCase().includes(q)) ||
      (w.bankAccountName && w.bankAccountName.toLowerCase().includes(q)) ||
      (w.notes && w.notes.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 whitespace-nowrap shrink-0">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Sudah Ditransfer
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 whitespace-nowrap shrink-0">
            <XCircle className="w-3 h-3 text-rose-600" />
            Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 whitespace-nowrap shrink-0">
            <Clock className="w-3 h-3 text-amber-600" />
            Menunggu Transfer
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama marketing, no rekening..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Status Penarikan:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Menunggu Transfer</option>
            <option value="paid">Sudah Ditransfer</option>
            <option value="rejected">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10.5px]">
                <th className="py-3.5 px-4">Tanggal Pengajuan</th>
                <th className="py-3.5 px-4">Tim Marketing</th>
                <th className="py-3.5 px-4">Nominal Penarikan</th>
                <th className="py-3.5 px-4">Rekening / E-Wallet Tujuan</th>
                <th className="py-3.5 px-4">Status Pencairan</th>
                {isSuperadmin && <th className="py-3.5 px-4 text-right">Aksi Admin</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isSuperadmin ? 6 : 5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                        <Clock className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Belum Ada Permohonan Penarikan
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Permohonan pencairan dana komisi yang diajukan oleh marketing akan tampil di sini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((w) => {
                  const dateStr = w.createdAt
                    ? new Date(w.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-";

                  return (
                    <tr key={w.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                      {/* Tanggal */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {dateStr}
                      </td>

                      {/* Tim Marketing */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-white">
                          {w.marketingName || "Tim Marketing"}
                        </div>
                        {w.marketingEmail && (
                          <div className="text-[10px] text-slate-400">{w.marketingEmail}</div>
                        )}
                      </td>

                      {/* Nominal */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                          Rp {w.amount.toLocaleString("id-ID")}
                        </span>
                      </td>

                      {/* Rekening */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-white uppercase">
                          {w.bankName || "-"}
                        </div>
                        <div className="font-mono text-blue-600 dark:text-blue-400 font-medium">
                          {w.bankAccountNumber || "-"}
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          a.n. {w.bankAccountName || "-"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getStatusBadge(w.status)}
                        {w.processedAt && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Diproses:{" "}
                            {new Date(w.processedAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                        )}
                        {w.notes && (
                          <div className="text-[10.5px] text-slate-500 italic mt-0.5">
                            "{w.notes}"
                          </div>
                        )}
                        {w.proofUrl && (
                          <a
                            href={w.proofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10.5px] text-blue-600 hover:underline mt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Bukti Transfer
                          </a>
                        )}
                      </td>

                      {/* Aksi Superadmin */}
                      {isSuperadmin && (
                        <td className="py-3.5 px-4 text-right">
                          {w.status === "pending" ? (
                            <button
                              onClick={() => setSelectedWithdrawal(w)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1.5 shadow-xs transition cursor-pointer ml-auto"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              Proses Transfer
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Selesai</span>
                          )}
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

      {/* Modal Proses Transfer */}
      {selectedWithdrawal && onUpdateStatus && (
        <ProcessWithdrawalModal
          isOpen={true}
          withdrawal={selectedWithdrawal}
          onClose={() => setSelectedWithdrawal(null)}
          onConfirm={onUpdateStatus}
        />
      )}
    </div>
  );
};

