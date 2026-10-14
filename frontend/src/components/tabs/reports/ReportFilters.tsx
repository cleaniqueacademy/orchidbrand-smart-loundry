import React, { useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Eye,
  Store,
  MapPin,
  Phone,
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
  // Preset detection for active styling
  const isToday = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return startDate === todayStr && endDate === todayStr;
  }, [startDate, endDate]);

  const isThisMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    return startDate === start && endDate === end;
  }, [startDate, endDate]);

  const isLastMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    return startDate === start && endDate === end;
  }, [startDate, endDate]);

  const isThisYear = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
    return startDate === start && endDate === end;
  }, [startDate, endDate]);

  const isAllTime = !startDate && !endDate;

  return (
    <div className="space-y-3.5">
      {/* 1. Page Header & Responsive Export Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
            Laporan Keuangan & Operasional
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Audit rekapitulasi omset, laba rugi, dan efisiensi operasional outlet.
          </p>
        </div>

        {/* Action Buttons: 2x2 grid on mobile, inline on desktop */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onPrintPDF}
            className="h-9 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            title="Cetak langsung atau simpan dokumen ke file PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak PDF</span>
          </button>

          <button
            type="button"
            onClick={onDownloadExcel}
            className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            title="Download laporan lengkap dalam format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </button>

          <button
            type="button"
            onClick={onDownloadCSV}
            className="h-9 px-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Download data mentah dalam format CSV"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenPrintPreview}
            className="h-9 px-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            title="Pratinjau lembar cetak dokumen resmi sebelum dicetak"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            <span>Pratinjau</span>
          </button>
        </div>
      </div>

      {/* 2. Outlet Context / Action Card (Compact & Modern) */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-zinc-900 text-sm tracking-tight">
                {activeTenant.outletName}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                {activeTenant.id === "all" ? "Konsolidasi Multi-Cabang" : `ID: ${activeTenant.id}`}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Aktif
              </span>
            </div>
            {activeTenant.address && activeTenant.address !== "-" && (
              <div className="flex items-center gap-1 text-[11px] text-zinc-500 mt-0.5">
                <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                <span className="truncate max-w-[280px] sm:max-w-md">{activeTenant.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Branch Selector for Super Admin or Multi-Branch */}
        {isSuperAdmin && tenants && tenants.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className="text-xs font-semibold text-zinc-500">Cabang:</span>
            <select
              value={selectedTenantId}
              onChange={(e) => onSelectTenant && onSelectTenant(e.target.value)}
              className="py-1.5 px-3 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
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
      </div>

      {/* 3. Filter Toolbar: Rentang Waktu Presets & Status Pembayaran */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-3 sm:p-3.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Quick Date Range Preset Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const todayStr = now.toISOString().slice(0, 10);
              setStartDate(todayStr);
              setEndDate(todayStr);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
              isToday
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200"
            }`}
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
              const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
              setStartDate(startMonth);
              setEndDate(endMonth);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
              isThisMonth
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200"
            }`}
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
              const endLast = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
              setStartDate(startLast);
              setEndDate(endLast);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
              isLastMonth
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200"
            }`}
          >
            Bulan Lalu
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const startYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
              const endYear = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
              setStartDate(startYear);
              setEndDate(endYear);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
              isThisYear
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200"
            }`}
          >
            Tahun Ini
          </button>
          <button
            type="button"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 ${
              isAllTime
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200"
            }`}
          >
            Semua
          </button>
        </div>

        {/* Right: Date Range Inputs & Payment Filter */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Custom Date Range Picker */}
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-700 w-full sm:w-auto">
            <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent font-medium text-xs text-zinc-800 outline-none cursor-pointer w-[110px]"
              title="Tanggal mulai"
            />
            <span className="text-zinc-400 font-bold text-[11px]">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent font-medium text-xs text-zinc-800 outline-none cursor-pointer w-[110px]"
              title="Tanggal akhir"
            />
          </div>

          {/* Payment Status Dropdown */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="py-1.5 px-3 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition w-full sm:w-auto"
          >
            <option value="all">Semua Pembayaran</option>
            <option value="paid">Hanya Lunas</option>
            <option value="unpaid">Belum Lunas (Piutang)</option>
          </select>
        </div>
      </div>
    </div>
  );
};

