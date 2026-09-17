import React from "react";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Eye,
  Store,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { Tenant } from "../../../types";

interface ReportFiltersProps {
  activeTenant: Tenant;
  onOpenPrintPreview: () => void;
  onDownloadExcel: () => void;
  onDownloadCSV: () => void;
  onPrintPDF: () => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  paymentFilter: "all" | "paid" | "unpaid";
  setPaymentFilter: (val: "all" | "paid" | "unpaid") => void;
  tenants?: Tenant[];
  selectedTenantId?: string;
  onSelectTenant?: (id: string) => void;
  isSuperAdmin?: boolean;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  activeTenant,
  onOpenPrintPreview,
  onDownloadExcel,
  onDownloadCSV,
  onPrintPDF,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  paymentFilter,
  setPaymentFilter,
  tenants = [],
  selectedTenantId = "all",
  onSelectTenant,
  isSuperAdmin = false,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Header & Export Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            Laporan Keuangan & Operasional
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Audit rekapitulasi laba rugi, omset penjualan, dan beban operasional outlet
          </p>
        </div>

        {/* Action Buttons: Cetak PDF, Download Excel (.xlsx), CSV, Pratinjau */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenPrintPreview}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Pratinjau lembar cetak dokumen resmi sebelum dicetak"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            <span>Pratinjau Cetak</span>
          </button>

          <button
            onClick={onDownloadCSV}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Download data mentah dalam format CSV"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span>CSV</span>
          </button>

          <button
            onClick={onDownloadExcel}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Download laporan lengkap 3 lembar kerja dalam format Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </button>

          <button
            onClick={onPrintPDF}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Cetak langsung atau simpan dokumen ke file PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Profil Outlet Terpilih Banner */}
      <div className="bg-gradient-to-r from-blue-50/80 via-sky-50/50 to-white rounded-xl border border-blue-200/90 p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-zinc-900 text-sm tracking-tight">
                {activeTenant.outletName}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200 whitespace-nowrap shrink-0 select-none">
                {activeTenant.id === "all" ? "Konsolidasi Multi-Cabang" : `ID: ${activeTenant.id}`}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 whitespace-nowrap shrink-0 select-none">
                <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                <span>Aktif</span>
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1 flex-wrap">
              {activeTenant.owner?.name && (
                <div className="flex items-center gap-1 text-zinc-700">
                  <User className="w-3 h-3 text-zinc-400" />
                  <span>
                    Pemilik: <strong>{activeTenant.owner.name}</strong>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-zinc-400" />
                <span>{activeTenant.address}</span>
              </div>
              <div className="flex items-center gap-1 font-mono">
                <Phone className="w-3 h-3 text-zinc-400" />
                <span>{activeTenant.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Indikator Super Admin jika sedang audit */}
        {isSuperAdmin && (
          <div className="bg-white/80 border border-blue-200 rounded-lg px-3 py-1.5 text-right self-start md:self-auto shrink-0">
            <span className="text-[10px] text-zinc-400 block uppercase font-mono tracking-wider">
              Mode Pemeriksaan
            </span>
            <span className="text-xs font-bold text-blue-950">
              Audit Super Admin Pusat
            </span>
          </div>
        )}
      </div>

      {/* Filter & Control Bar: Rentang Waktu & Cabang */}
      <div className="bg-white rounded-xl border border-zinc-200 p-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Rentang Waktu Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mr-0.5">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span>Rentang Waktu:</span>
            </div>

            {/* Date Input Range Box */}
            <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 hover:border-zinc-300 transition-colors">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-transparent border-0 font-medium text-zinc-800 outline-none cursor-pointer"
                title="Pilih tanggal mulai"
              />
              <span className="text-zinc-400 font-semibold text-[11px] px-1">s/d</span>
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
                  title="Tampilkan seluruh periode waktu"
                >
                  Semua
                </button>
              )}
            </div>
          </div>

          {/* Branch & Payment Status Filters */}
          <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap">
            {/* Tenant Selector for Super Admin */}
            {isSuperAdmin && tenants && tenants.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-blue-700" />
                  Cabang:
                </span>
                <select
                  value={selectedTenantId}
                  onChange={(e) => onSelectTenant && onSelectTenant(e.target.value)}
                  className="text-xs bg-blue-50/70 border border-blue-200 text-blue-950 font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer hover:bg-blue-50 focus:border-blue-700 transition"
                >
                  <option value="all">Semua Cabang (Konsolidasi)</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.outletName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Status Filter */}
            <div className="flex items-center gap-1.5">
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
    </div>
  );
};
