import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  Store,
  RefreshCw,
  Calculator,
  Server,
  Database,
  Activity,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { Tenant, WhatsAppLog } from "../../types";
import { ShiftHistorySection } from "./ShiftHistorySection";
import { authHeaders } from "../../utils/api";

interface SystemLogsTabProps {
  tenants: Tenant[];
  currentTenantId?: string;
}

export const SystemLogsTab: React.FC<SystemLogsTabProps> = ({
  tenants,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"whatsapp" | "shifts" | "system">("whatsapp");
  const [selectedTenant, setSelectedTenant] = useState<string>("all");
  const [waLogs, setWaLogs] = useState<WhatsAppLog[]>([]);
  const [loadingWa, setLoadingWa] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "sent" | "failed">("all");

  const fetchWaLogs = async () => {
    setLoadingWa(true);
    try {
      const res = await fetch(`/api/tenants/${selectedTenant}/wa-logs`, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setWaLogs(json.data || []);
      }
    } catch (err) {
      console.error("[SystemLogsTab] fetchWaLogs error:", err);
    } finally {
      setLoadingWa(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === "whatsapp") {
      fetchWaLogs();
    }
  }, [selectedTenant, activeSubTab]);

  const filteredWaLogs = useMemo(() => {
    return waLogs.filter((log) => {
      const matchSearch =
        searchQuery === "" ||
        log.recipientPhone.includes(searchQuery) ||
        (log.recipientName && log.recipientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.messagePreview && log.messagePreview.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === "all" || log.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [waLogs, searchQuery, statusFilter]);

  // Pagination State for WA Logs
  const [waPage, setWaPage] = useState(1);
  const [waPageSize, setWaPageSize] = useState(10);

  useEffect(() => {
    setWaPage(1);
  }, [searchQuery, statusFilter, selectedTenant]);

  const totalWaItems = filteredWaLogs.length;
  const totalWaPages = Math.max(1, Math.ceil(totalWaItems / waPageSize));
  const validWaPage = Math.min(waPage, totalWaPages);
  const paginatedWaLogs = useMemo(() => {
    const start = (validWaPage - 1) * waPageSize;
    return filteredWaLogs.slice(start, start + waPageSize);
  }, [filteredWaLogs, validWaPage, waPageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-200/80 text-xs font-semibold mb-2">
            <Activity className="w-3.5 h-3.5 text-blue-700" />
            <span>Audit & Troubleshooting Support</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Log Sistem & Riwayat Aktivitas
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Pusat investigasi data, log pengiriman WhatsApp, dan riwayat shift kasir seluruh cabang.
          </p>
        </div>

        {activeSubTab === "whatsapp" && (
          <button
            onClick={fetchWaLogs}
            disabled={loadingWa}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingWa ? "animate-spin text-blue-600" : "text-zinc-500"}`} />
            <span>Segarkan Log</span>
          </button>
        )}
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 border border-zinc-200/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab("whatsapp")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "whatsapp"
              ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>Log Notifikasi WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("shifts")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "shifts"
              ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Calculator className="w-3.5 h-3.5 text-zinc-600" />
          <span>Log Shift Kasir & Rekonsiliasi</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("system")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === "system"
              ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Server className="w-3.5 h-3.5 text-blue-600" />
          <span>Kesehatan Server & DB</span>
        </button>
      </div>

      {/* SUB-TAB 1: WHATSAPP LOGS */}
      {activeSubTab === "whatsapp" && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Cabang */}
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs font-semibold text-zinc-500">Filter Cabang:</label>
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="py-1.5 px-3 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-blue-600 transition"
              >
                <option value="all">Semua Cabang Toko</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.outletName}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <div className="flex items-center p-0.5 bg-zinc-100 rounded-lg border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    statusFilter === "all" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("sent")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    statusFilter === "sent" ? "bg-white text-emerald-700 shadow-xs" : "text-zinc-600 hover:text-emerald-700"
                  }`}
                >
                  Terkirim
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("failed")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    statusFilter === "failed" ? "bg-white text-rose-700 shadow-xs" : "text-zinc-600 hover:text-rose-700"
                  }`}
                >
                  Gagal
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no HP atau teks..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-800 focus:outline-none focus:border-blue-600 transition"
              />
            </div>
          </div>

          {/* WhatsApp Logs Table */}
          <div className="overflow-x-auto border border-zinc-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Waktu</th>
                  <th className="py-2.5 px-4">Cabang</th>
                  <th className="py-2.5 px-4">Penerima</th>
                  <th className="py-2.5 px-4">Pesan Notifikasi</th>
                  <th className="py-2.5 px-4 text-center">Metode</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loadingWa ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      Memuat data log WhatsApp...
                    </td>
                  </tr>
                ) : filteredWaLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-400">
                      Belum ada catatan log WhatsApp untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  paginatedWaLogs.map((log) => {
                    const tenant = tenants.find((t) => t.id === log.tenantId);
                    return (
                      <tr key={log.id} className="hover:bg-zinc-50/60 transition">
                        <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-zinc-800">
                            {tenant?.outletName || log.tenantId}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-900">
                            {log.recipientName || "Pelanggan"}
                          </div>
                          <div className="font-mono text-[11px] text-zinc-400">
                            {log.recipientPhone}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-zinc-600">
                          {log.messagePreview || "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600 uppercase font-mono">
                            {log.mode}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap min-w-[120px]">
                          {log.status === "sent" ? (
                            <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                              Terkirim
                            </span>
                          ) : (
                            <div className="inline-flex flex-col items-end">
                              <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/80">
                                Gagal
                              </span>
                              {log.errorMessage && (
                                <div className="text-[10px] text-rose-600 mt-0.5 font-mono max-w-[200px] truncate">
                                  {log.errorMessage}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* WhatsApp Logs Pagination Bar */}
          {totalWaItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-zinc-50/60 border border-zinc-200/80 rounded-xl text-xs text-zinc-500">
              <div className="text-[11px]">
                Menampilkan{" "}
                <span className="font-semibold text-zinc-800">
                  {Math.min((validWaPage - 1) * waPageSize + 1, totalWaItems)}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-zinc-800">
                  {Math.min(validWaPage * waPageSize, totalWaItems)}
                </span>{" "}
                dari <span className="font-semibold text-zinc-800">{totalWaItems}</span> data
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>Baris:</span>
                  <select
                    value={waPageSize}
                    onChange={(e) => {
                      setWaPageSize(Number(e.target.value));
                      setWaPage(1);
                    }}
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setWaPage((p) => Math.max(1, p - 1))}
                    disabled={validWaPage === 1}
                    className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-[11px] font-semibold text-zinc-700">
                    {validWaPage} / {totalWaPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setWaPage((p) => Math.min(totalWaPages, p + 1))}
                    disabled={validWaPage === totalWaPages}
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

      {/* SUB-TAB 2: CASHIER SHIFTS LOG */}
      {activeSubTab === "shifts" && (
        <ShiftHistorySection tenantId="all" />
      )}

      {/* SUB-TAB 3: SYSTEM & DATABASE HEALTH */}
      {activeSubTab === "system" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="bg-gradient-to-br from-blue-50 via-sky-50/70 to-indigo-50/30 p-4 sm:p-5 rounded-2xl border border-blue-300 shadow-xs relative overflow-hidden group hover:border-blue-400 transition">
            <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
              <span>Runtime Backend</span>
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-zinc-900 mt-2.5 tracking-tight">Bun + Hono API</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              Operational (Port 3001)
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-4 sm:p-5 rounded-2xl border border-indigo-200/90 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition">
            <div className="flex items-center justify-between text-xs text-indigo-800 font-semibold">
              <span>Basis Data</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-zinc-900 mt-2.5 tracking-tight">PostgreSQL (Drizzle)</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              Connected & Persisten
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
              <span>Gateway WhatsApp</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <WhatsAppIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-zinc-900 mt-2.5 tracking-tight">Baileys Multi-Device</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              Standby Siaga per Cabang
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
