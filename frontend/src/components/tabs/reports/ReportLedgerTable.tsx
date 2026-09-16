import React from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Order } from "../../../types";

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
}

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
}) => {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-zinc-900 text-sm">Buku Besar Transaksi</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Daftar transaksi pesanan masuk selama periode terpilih
          </p>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nota, pelanggan, layanan..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:bg-white focus:border-zinc-900 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3.5 whitespace-nowrap">No. Nota</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Tanggal</th>
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
                  <td colSpan={7} className="py-10 text-center text-zinc-400 text-xs">
                    Tidak ada transaksi yang cocok dengan filter
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-semibold text-zinc-900 whitespace-nowrap">
                      {ord.invoiceNo}
                    </td>
                    <td className="py-2.5 px-3.5 text-zinc-500 whitespace-nowrap">
                      {new Date(ord.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
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
                      <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full border border-zinc-200">
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          ord.paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {ord.paymentStatus === "paid"
                          ? `Lunas (${ord.paymentMethod || "cash"})`
                          : "Belum Lunas"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-zinc-900 whitespace-nowrap font-mono">
                      Rp {ord.totalAmount.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalOrdersCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3.5 py-2.5 border-t border-zinc-200 bg-zinc-50/60 text-xs text-zinc-500">
            <div className="text-[11px]">
              Menampilkan{" "}
              <span className="font-semibold text-zinc-800">
                {Math.min((page - 1) * pageSize + 1, totalOrdersCount)}
              </span>{" "}
              -{" "}
              <span className="font-semibold text-zinc-800">
                {Math.min(page * pageSize, totalOrdersCount)}
              </span>{" "}
              dari <span className="font-semibold text-zinc-800">{totalOrdersCount}</span> transaksi
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-zinc-400">Baris:</span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="text-[11px] bg-white border border-zinc-200 rounded px-1.5 py-0.5 font-medium outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-1 rounded hover:bg-zinc-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-[11px] font-medium text-zinc-700 px-1.5">
                  {page} / {totalPages}
                </span>

                <button
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded hover:bg-zinc-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
