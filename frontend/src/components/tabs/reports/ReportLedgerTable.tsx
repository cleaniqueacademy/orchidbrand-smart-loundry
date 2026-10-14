import React from "react";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Store, Receipt } from "lucide-react";
import { Order, Tenant } from "../../../types";
import { EmptyStateWalkthrough } from "../../common/EmptyStateWalkthrough";

interface ReportLedgerTableProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  paginatedOrders: Order[];
  totalOrdersCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
  isMultiTenant?: boolean;
  tenants?: Tenant[];
}

const statusBadgeStyles: Record<string, string> = {
  process: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  washing: "bg-cyan-50 text-cyan-700 border-cyan-200",
  drying_ironing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  ready: "bg-teal-50 text-teal-700 border-teal-200",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-300",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

export const ReportLedgerTable: React.FC<ReportLedgerTableProps> = ({
  searchQuery,
  onSearchChange,
  paginatedOrders,
  totalOrdersCount,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  isMultiTenant = false,
  tenants = [],
}) => {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-zinc-900 text-sm">Buku Besar Transaksi</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Daftar transaksi pesanan masuk selama periode terpilih
          </p>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nota, pelanggan, layanan..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:bg-white focus:border-zinc-900 font-medium placeholder:text-zinc-400 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5 whitespace-nowrap">No. Nota</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Tanggal</th>
                {isMultiTenant && (
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Cabang</th>
                )}
                <th className="py-2.5 px-3.5 whitespace-nowrap">Pelanggan</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Layanan</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Pembayaran</th>
                <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={isMultiTenant ? 8 : 7} className="py-6">
                    <EmptyStateWalkthrough
                      icon={<Receipt className="w-5 h-5 text-zinc-400" />}
                      title="Tidak Ada Transaksi Pada Filter Ini"
                      description="Belum ada transaksi cucian yang tercatat sesuai rentang tanggal atau kata kunci pencarian yang dipilih."
                      tips={[
                        "Coba ubah filter rentang tanggal (Hari Ini, Bulan Ini, atau Semua) pada kontrol laporan.",
                        "Pastikan kata kunci pencarian nomor nota atau nama pelanggan sudah sesuai.",
                        "Gunakan tombol Ekspor Excel atau Cetak Dokumen Resmi untuk mengunduh rekapitulasi buku besar.",
                      ]}
                    />
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord) => {
                  const tenantObj = tenants.find((t) => t.id === ord.tenantId);
                  const tenantName = tenantObj?.outletName || ord.tenantId || "Cabang";
                  const statusLabel =
                    ord.status === "completed"
                      ? "Selesai"
                      : ord.status === "ready"
                      ? "Siap Diambil"
                      : ord.status === "cancelled"
                      ? "Dibatalkan"
                      : "Diproses";
                  const isPaid = ord.paymentStatus === "paid";

                  return (
                    <tr key={ord.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-semibold text-zinc-900 whitespace-nowrap">
                        {ord.invoiceNo}
                      </td>
                      <td className="py-2.5 px-3.5 text-zinc-500 whitespace-nowrap">
                        {new Date(ord.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      {isMultiTenant && (
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-900 border border-blue-200/80 px-2 py-0.5 rounded-md">
                            <Store className="w-2.5 h-2.5 text-blue-700" />
                            {tenantName}
                          </span>
                        </td>
                      )}
                      <td className="py-2.5 px-3.5 font-medium text-zinc-900 whitespace-nowrap">
                        {ord.customer?.name || "Pelanggan Langsung"}
                      </td>
                      <td className="py-2.5 px-3.5 text-zinc-600 whitespace-nowrap">
                        {ord.serviceType}{" "}
                        <span className="text-zinc-400 font-mono">
                          ({ord.weightOrQty} {ord.unit})
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-lg border whitespace-nowrap shrink-0 ${
                            statusBadgeStyles[ord.status] || "bg-zinc-100 text-zinc-700 border-zinc-200"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {isPaid
                            ? `Lunas (${ord.paymentMethod || "Tunai"})`
                            : "Belum Lunas"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-zinc-900 whitespace-nowrap font-mono">
                        Rp {ord.totalAmount.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Matching ShadcnDataTable */}
        {totalOrdersCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-zinc-200 bg-zinc-50/70 text-xs text-zinc-500 rounded-b-xl">
            <div className="text-[11px]">
              Menampilkan{" "}
              <span className="font-semibold text-zinc-900">
                {Math.min((page - 1) * pageSize + 1, totalOrdersCount)}
              </span>{" "}
              -{" "}
              <span className="font-semibold text-zinc-900">
                {Math.min(page * pageSize, totalOrdersCount)}
              </span>{" "}
              dari <span className="font-semibold text-zinc-900">{totalOrdersCount}</span> baris
            </div>

            <div className="flex items-center gap-3">
              {/* Rows per page selector */}
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="hidden sm:inline text-zinc-400">Baris:</span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs font-semibold outline-none cursor-pointer hover:border-zinc-300"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Prev / Page / Next */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPageChange(1)}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Halaman pertama"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[11px] font-semibold text-zinc-800">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Berikutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onPageChange(totalPages)}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Halaman terakhir"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

