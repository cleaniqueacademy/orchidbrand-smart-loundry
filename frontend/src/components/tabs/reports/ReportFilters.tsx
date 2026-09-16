import React from "react";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Eye,
} from "lucide-react";

interface ReportFiltersProps {
  activeTenantOutletName: string;
  onOpenPrintPreview: () => void;
  onDownloadCSV: () => void;
  onPrintPDF: () => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  paymentFilter: "all" | "paid" | "unpaid";
  setPaymentFilter: (val: "all" | "paid" | "unpaid") => void;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  activeTenantOutletName,
  onOpenPrintPreview,
  onDownloadCSV,
  onPrintPDF,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  paymentFilter,
  setPaymentFilter,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Header & Export Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Laporan Keuangan & Operasional</span>
            <span className="text-xs font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full border border-zinc-200">
              {activeTenantOutletName}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Rekapitulasi laba rugi, omset penjualan, beban operasional, dan buku besar transaksi
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenPrintPreview}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Pratinjau lembar cetak dokumen resmi"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            <span>Pratinjau Lembar Cetak</span>
          </button>

          <button
            onClick={onDownloadCSV}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Download laporan dalam format Microsoft Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={onPrintPDF}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Cetak atau simpan sebagai dokumen PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / Download PDF</span>
          </button>
        </div>
      </div>

      {/* Filter & Control Bar: Rentang Waktu (Date Range) */}
      <div className="bg-white rounded-xl border border-zinc-200 p-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Rentang Waktu Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mr-0.5">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span>Rentang Waktu:</span>
            </div>

            {/* Date Input Range Box */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-zinc-300 transition-colors">
              <span className="text-[11px] font-medium text-zinc-400">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-transparent border-0 font-medium text-zinc-800 outline-none cursor-pointer"
                title="Pilih tanggal mulai"
              />
              <span className="text-zinc-300 font-bold px-0.5">s/d</span>
              <span className="text-[11px] font-medium text-zinc-400">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-transparent border-0 font-medium text-zinc-800 outline-none cursor-pointer"
                title="Pilih tanggal akhir"
              />
            </div>

            {/* Quick Presets for Date Range */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const todayStr = now.toISOString().slice(0, 10);
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                }}
                className="text-[11px] font-medium px-2 py-1 rounded-md text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                    .toISOString()
                    .slice(0, 10);
                  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                    .toISOString()
                    .slice(0, 10);
                  setStartDate(startMonth);
                  setEndDate(endMonth);
                }}
                className="text-[11px] font-medium px-2 py-1 rounded-md text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                    .toISOString()
                    .slice(0, 10);
                  const endLast = new Date(now.getFullYear(), now.getMonth(), 0)
                    .toISOString()
                    .slice(0, 10);
                  setStartDate(startLast);
                  setEndDate(endLast);
                }}
                className="text-[11px] font-medium px-2 py-1 rounded-md text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition cursor-pointer"
              >
                Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const startYear = new Date(now.getFullYear(), 0, 1)
                    .toISOString()
                    .slice(0, 10);
                  const endYear = new Date(now.getFullYear(), 11, 31)
                    .toISOString()
                    .slice(0, 10);
                  setStartDate(startYear);
                  setEndDate(endYear);
                }}
                className="text-[11px] font-medium px-2 py-1 rounded-md text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition cursor-pointer"
              >
                Tahun Ini
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-[11px] font-medium px-2 py-1 rounded-md text-zinc-500 hover:bg-zinc-100 border border-zinc-200 transition cursor-pointer"
                  title="Tampilkan semua data tanpa batasan tanggal"
                >
                  Semua
                </button>
              )}
            </div>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-xs font-medium text-zinc-500">Status:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 font-medium outline-none cursor-pointer focus:border-zinc-900"
            >
              <option value="all">Semua Pembayaran</option>
              <option value="paid">Hanya Lunas</option>
              <option value="unpaid">Belum Lunas (Piutang)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
