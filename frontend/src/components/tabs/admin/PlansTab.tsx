import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Sparkles, RefreshCw, Layers } from "lucide-react";
import { api } from "../../../utils/api";
import { Plan } from "../../../types";
import { PlanFormModal } from "./PlanFormModal";

export const PlansTab: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: Plan[] }>("/api/plans");
      if (res.success && res.data) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat paket:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreate = () => {
    setEditingPlan(null);
    setIsModalOpen(true);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Hapus paket '${plan.name}'?`)) return;

    try {
      await api.delete(`/api/plans/${plan.id}`);
      fetchPlans();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus paket");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-indigo-600" />
            <span>Manajemen Paket & Harga Langganan</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Atur pilihan harga bulanan, kuota nomor WhatsApp, batasan kasir, dan fitur per paket.
          </p>
        </div>

        <button
          onClick={handleCreate}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Paket Baru</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          <span>Memuat daftar paket...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isActive = plan.isActive === "true" || plan.isActive === true;
            return (
              <div
                key={plan.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] font-extrabold font-mono tracking-wider px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                        {plan.code}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                        {plan.name}
                      </h3>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>

                  <div className="my-4">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      Rp {plan.pricePerMonth.toLocaleString("id-ID")}
                    </span>
                    <span className="text-xs text-slate-400 font-medium"> / bulan</span>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                      {plan.description}
                    </p>
                  )}

                  <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Maks. Nomor WA:</span>
                      <span className="font-bold">{plan.maxWaNumbers} Nomor</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Maks. Akun Kasir:</span>
                      <span className="font-bold">{plan.maxStaff} Pengguna</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kuota AI Harian:</span>
                      <span className="font-bold">{plan.aiTokenQuotaDaily} Pesan/hari</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Trial 7 Hari:</span>
                      <span className="font-bold">
                        {plan.isTrialAllowed === "true" || plan.isTrialAllowed === true
                          ? "Diizinkan"
                          : "Tidak"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 mt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-bold flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Ubah</span>
                  </button>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all text-xs font-bold flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PlanFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPlans}
        plan={editingPlan}
      />
    </div>
  );
};
