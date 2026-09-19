import React, { useState, useEffect, useMemo } from "react";
import { Clock, Calculator, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, User, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { CashierShift } from "../../types";

interface ShiftHistorySectionProps {
  tenantId: string;
}

export const ShiftHistorySection: React.FC<ShiftHistorySectionProps> = ({ tenantId }) => {
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const url = tenantId && tenantId !== "all"
        ? `/api/shifts/history?tenantId=${encodeURIComponent(tenantId)}`
        : `/api/shifts/history`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setShifts(json.data || []);
      }
    } catch (err) {
      console.error("[ShiftHistorySection] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [tenantId]);

  useEffect(() => {
    setPage(1);
  }, [tenantId]);

  const totalItems = shifts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(page, totalPages);
  const paginatedShifts = shifts.slice((validPage - 1) * pageSize, validPage * pageSize);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 text-sm">
              Riwayat Shift & Rekonsiliasi Kas Laci Kasir
            </h3>
            <p className="text-[11px] text-zinc-500">
              Audit modal awal, penerimaan tunai, dan selisih uang fisik laci kasir
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer"
          title="Segarkan Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-400">Memuat riwayat shift...</div>
      ) : shifts.length === 0 ? (
        <div className="py-8 text-center text-xs text-zinc-400">
          Belum ada riwayat shift yang tercatat.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-x-auto border border-zinc-100 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 font-semibold text-[11px] bg-zinc-50/50">
                  <th className="py-2.5 px-3">Kasir</th>
                  <th className="py-2.5 px-3">Waktu Buka / Tutup</th>
                  <th className="py-2.5 px-3 text-right">Modal Awal</th>
                  <th className="py-2.5 px-3 text-right">Tunai Sistem</th>
                  <th className="py-2.5 px-3 text-right">Uang Fisik Laci</th>
                  <th className="py-2.5 px-3 text-right">Selisih Kas</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedShifts.map((s) => {
                  const isOpen = s.status === "open";
                  const discrepancy = s.discrepancy || 0;
                  const openedDate = new Date(s.openedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  });
                  const openedTime = new Date(s.openedAt).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const closedTime = s.closedAt
                    ? new Date(s.closedAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null;

                  return (
                    <tr key={s.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3 px-3 font-semibold text-zinc-900">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-zinc-100 text-zinc-700 flex items-center justify-center text-[10px] font-bold">
                            {(s.cashierName || "K").slice(0, 1)}
                          </div>
                          <div>
                            <div>{s.cashierName || "Kasir"}</div>
                            {s.notes && (
                              <div className="text-[10px] text-zinc-400 font-normal italic">
                                "{s.notes}"
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-zinc-600">
                        <div className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-zinc-400" />
                          <span>{openedDate}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          {openedTime} {closedTime ? `➔ ${closedTime}` : "➔ Berjalan"}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-zinc-700">
                        Rp {s.startingCash.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-600">
                        + Rp {s.systemCashTotal.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-zinc-900">
                        {s.actualCashTotal !== null && s.actualCashTotal !== undefined
                          ? `Rp ${s.actualCashTotal.toLocaleString("id-ID")}`
                          : "-"}
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        {isOpen ? (
                          <span className="text-zinc-400 text-[11px]">Sedang Aktif</span>
                        ) : discrepancy === 0 ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Pas (Rp 0)</span>
                          </span>
                        ) : discrepancy > 0 ? (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>+Rp {discrepancy.toLocaleString("id-ID")}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>-Rp {Math.abs(discrepancy).toLocaleString("id-ID")}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isOpen ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200">
                            Ditutup
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Shift History Pagination Bar */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3.5 py-2.5 bg-zinc-50/60 border border-zinc-200/80 rounded-xl text-xs text-zinc-500">
              <div className="text-[11px]">
                Menampilkan{" "}
                <span className="font-semibold text-zinc-800">
                  {Math.min((validPage - 1) * pageSize + 1, totalItems)}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-zinc-800">
                  {Math.min(validPage * pageSize, totalItems)}
                </span>{" "}
                dari <span className="font-semibold text-zinc-800">{totalItems}</span> riwayat
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={validPage === 1}
                    className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-[11px] font-semibold text-zinc-700">
                    {validPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage === totalPages}
                    className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Halaman Selanjutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
