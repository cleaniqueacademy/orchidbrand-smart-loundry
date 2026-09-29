import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Store,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Layers,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Tenant } from "../../types";
import { PremiumFeatureLock } from "../common/PremiumFeatureLock";
import { authHeaders } from "../../utils/api";

interface BranchManagementSectionProps {
  readonly currentTenant?: Tenant | null;
  readonly isLocked?: boolean;
}

export const BranchManagementSection: React.FC<BranchManagementSectionProps> = ({
  currentTenant,
  isLocked = true,
}) => {
  const [branches, setBranches] = useState<Tenant[]>(
    currentTenant ? [currentTenant] : []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Coba load branches dari backend jika endpoint tersedia
    const fetchBranches = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/my-branches", { headers: authHeaders() });
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setBranches(json.data);
        } else if (currentTenant) {
          setBranches([currentTenant]);
        }
      } catch {
        if (currentTenant) setBranches([currentTenant]);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [currentTenant]);

  const activeOutlet = currentTenant || branches[0];

  return (
    <PremiumFeatureLock
      feature="branch_management"
      isLocked={isLocked}
      customTitle="Manajemen Multi-Cabang Outlet"
      customSubtitle="Kelola operasional banyak cabang laundry dalam satu akun Owner terpusat."
    >
      <div className="space-y-6">
        {/* Header & Action Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Daftar Cabang & Gerai Outlet
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Pantau seluruh cabang laundry, pisahkan buku kas, dan kelola laporan performa per gerai.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Cabang Baru</span>
          </button>
        </div>

        {/* Multi-Branch Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>Cabang Aktif</span>
              <Store className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {branches.length} <span className="text-xs font-normal text-zinc-500">Gerai</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Gerai utama beroperasi normal
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>Batas Kuota Cabang</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              1 / 1 <span className="text-xs font-normal text-zinc-500">Cabang (Free/Pro)</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Paket Premium: Hingga 10 cabang mandiri
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs">
              <span>Laporan Konsolidasi</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Tersinkron <span className="text-xs font-normal text-zinc-500">Pusat</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Data omzet & kas terpisah otomatis
            </p>
          </div>
        </div>

        {/* Active Branch List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Gerai Terdaftar
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gerai 1: Gerai Utama */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-blue-500/40 shadow-sm relative overflow-hidden">
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                Pusat / Utama
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm sm:text-base">
                    {activeOutlet?.outletName || "Cleanique Laundry - Gerai Utama"}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{activeOutlet?.address || "Jl. Kaliurang Km 5, Sleman"}</span>
                    {activeOutlet?.city && <span>• {activeOutlet.city}</span>}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{activeOutlet?.phone || "081234567890"}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aktif</span>
                </div>
              </div>
            </div>

            {/* Gerai 2: Preview Placeholder for Premium */}
            <div className="p-5 rounded-2xl bg-zinc-50/60 dark:bg-zinc-900/30 border border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Cabang 02 (Preview)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800">
                    Slot Paket Premium
                  </span>
                </div>
                <h4 className="font-bold text-zinc-700 dark:text-zinc-300 text-sm mt-2">
                  Outlet Cabang 2 (Contoh: Cleanique Express Gejayan)
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Tambahkan cabang kedua untuk memperluas jangkauan layanan laundry dan integrasikan laporan ke akun pusat Anda.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-200/50 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                <span>Kuota Tambahan: 9 Cabang</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">Segera Hadir</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PremiumFeatureLock>
  );
};
