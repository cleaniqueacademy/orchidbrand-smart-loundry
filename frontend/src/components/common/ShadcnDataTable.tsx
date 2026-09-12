import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Calendar,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
} from "lucide-react";
import { DateFilterPreset } from "../../types";

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

interface ShadcnDataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  searchPlaceholder?: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  datePreset?: DateFilterPreset;
  onDatePresetChange?: (preset: DateFilterPreset) => void;
  customFilters?: React.ReactNode;
  emptyMessage?: string;
  initialPageSize?: number;
}

export function ShadcnDataTable<T>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = "Cari data...",
  searchQuery,
  onSearchChange,
  datePreset = "all",
  onDatePresetChange,
  customFilters,
  emptyMessage = "Tidak ada data yang ditemukan",
  initialPageSize = 10,
}: ShadcnDataTableProps<T>) {
  // Column Visibility State
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(() =>
    columns.map((col) => col.id)
  );
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Close column menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target as Node)) {
        setIsColMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset to page 1 whenever search query or data length changes significantly
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, datePreset, data.length]);

  const toggleColumn = (id: string) => {
    setVisibleColumnIds((prev) => {
      if (prev.includes(id)) {
        // Prevent hiding all columns
        if (prev.length <= 1) return prev;
        return prev.filter((colId) => colId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Visible columns in original order
  const activeColumns = columns.filter((col) => visibleColumnIds.includes(col.id));

  // Pagination calculations
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = data.slice(startIndex, endIndex);

  return (
    <div className="space-y-3.5">
      {/* Table Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-zinc-200 shadow-sm">
        {/* Left: Search Bar */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-medium placeholder:text-zinc-400 transition"
          />
        </div>

        {/* Right Controls: Filters, Date Presets, Column Visibility */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Filters (e.g. status, payment, category) */}
          {customFilters}

          {/* Date Presets Filter */}
          {onDatePresetChange && (
            <div className="relative flex items-center">
              <div className="relative">
                <select
                  value={datePreset}
                  onChange={(e) => onDatePresetChange(e.target.value as DateFilterPreset)}
                  className="appearance-none pl-7 pr-8 py-1.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
                >
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="this_week">Minggu Ini</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="this_year">Tahun Ini</option>
                </select>
                <Calendar className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <span className="text-[10px] text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  ▼
                </span>
              </div>
            </div>
          )}

          {/* Column Visibility Dropdown */}
          <div className="relative" ref={colMenuRef}>
            <button
              onClick={() => setIsColMenuOpen(!isColMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg transition"
              title="Tampilkan/Sembunyikan Kolom"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
              <span>Kolom</span>
            </button>

            {isColMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg p-2 z-30 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[11px] font-semibold text-zinc-400 px-2 py-1 uppercase tracking-wider">
                  Visibilitas Kolom
                </div>
                <div className="space-y-1 max-h-56 overflow-y-auto mt-1">
                  {columns.map((col) => {
                    const isChecked = visibleColumnIds.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => toggleColumn(col.id)}
                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg hover:bg-zinc-100 text-left text-zinc-700 transition"
                      >
                        <span className="truncate">{col.header}</span>
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                            isChecked
                              ? "bg-blue-900 border-blue-900 text-white"
                              : "border-zinc-300 bg-white"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[2.5]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] font-semibold text-zinc-500 tracking-wider">
              <tr>
                {activeColumns.map((col) => (
                  <th
                    key={col.id}
                    className={`py-3 px-4 ${
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                        ? "text-center"
                        : "text-left"
                    } ${col.className || ""}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeColumns.length}
                    className="py-12 text-center text-zinc-400 text-xs"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={keyExtractor(item)}
                    className="hover:bg-zinc-50/70 transition-colors"
                  >
                    {activeColumns.map((col) => (
                      <td
                        key={col.id}
                        className={`py-3 px-4 align-middle ${
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        } ${col.className || ""}`}
                      >
                        {col.cell
                          ? col.cell(item)
                          : col.accessorKey
                          ? String(item[col.accessorKey] ?? "")
                          : null}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-zinc-50/60 border-t border-zinc-200 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <span>Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="py-1 px-2 border border-zinc-200 bg-white rounded-lg text-xs font-semibold outline-none cursor-pointer focus:border-zinc-900"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-zinc-400 ml-2">
              {totalItems > 0
                ? `Menampilkan ${startIndex + 1}-${endIndex} dari ${totalItems} data`
                : "0 data"}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage <= 1}
              className="p-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={validCurrentPage <= 1}
              className="p-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 font-semibold text-zinc-800">
              {validCurrentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={validCurrentPage >= totalPages}
              className="p-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage >= totalPages}
              className="p-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to filter records by DateFilterPreset
 */
export function filterByDatePreset(dateString: string | undefined | null, preset: DateFilterPreset): boolean {
  if (!dateString || preset === "all") return true;

  const itemDate = new Date(dateString);
  if (isNaN(itemDate.getTime())) return true;

  const now = new Date();

  if (preset === "today") {
    return (
      itemDate.getDate() === now.getDate() &&
      itemDate.getMonth() === now.getMonth() &&
      itemDate.getFullYear() === now.getFullYear()
    );
  }

  if (preset === "this_week") {
    // Current week (Monday to Sunday or last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return itemDate >= sevenDaysAgo && itemDate <= now;
  }

  if (preset === "this_month") {
    return (
      itemDate.getMonth() === now.getMonth() &&
      itemDate.getFullYear() === now.getFullYear()
    );
  }

  if (preset === "this_year") {
    return itemDate.getFullYear() === now.getFullYear();
  }

  return true;
}
