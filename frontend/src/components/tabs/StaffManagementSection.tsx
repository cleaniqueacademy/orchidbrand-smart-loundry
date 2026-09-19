import React, { useState, useEffect, useCallback } from "react";
import { Users, Plus, Trash2, Mail, ShieldCheck, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { User } from "../../types";
import { useToast } from "../common/ToastContext";

interface StaffManagementSectionProps {
  tenantId: string;
  tenantName?: string;
}

export const StaffManagementSection: React.FC<StaffManagementSectionProps> = ({
  tenantId,
  tenantName,
}) => {
  const toast = useToast();
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStaff = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/staff`);
      const json = await res.json();
      if (json.success) {
        setStaffList(json.data || []);
      }
    } catch (err) {
      console.error("[StaffManagement] Error fetching staff:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Validasi Gagal", "Semua kolom wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Berhasil", "Akun Kasir/Staff berhasil dibuat!");
        setName("");
        setEmail("");
        setPassword("");
        setIsAddModalOpen(false);
        fetchStaff();
      } else {
        toast.error("Gagal", json.message || "Gagal membuat akun kasir");
      }
    } catch (err: any) {
      toast.error("Error", "Terjadi kesalahan: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`Hapus akun staf kasir "${staffName}"?`)) return;
    try {
      const res = await fetch(`/api/staff/${staffId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Berhasil", "Akun staf kasir berhasil dihapus");
        fetchStaff();
      } else {
        toast.error("Gagal", json.message || "Gagal menghapus staf");
      }
    } catch (err: any) {
      toast.error("Error", "Terjadi kesalahan: " + err.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
        <div>
          <h3 className="font-bold text-zinc-900 text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Manajemen Akun Kasir / Staf Cabang
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kelola akses staf operasional kasir khusus outlet {tenantName || "ini"}. Staf hanya memiliki akses kasir pesanan dan tidak dapat melihat buku kas/keuangan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-2xs shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kasir</span>
        </button>
      </div>

      {/* Staff List */}
      {loading ? (
        <div className="py-8 text-center text-xs text-zinc-400">Memuat daftar kasir...</div>
      ) : staffList.length === 0 ? (
        <div className="py-8 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
          <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2 opacity-70" />
          <p className="text-xs font-semibold text-zinc-700">Belum Ada Akun Kasir Tambahan</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Klik tombol "Tambah Kasir" untuk memberikan akun khusus bagi staf Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {staffList.map((staff) => (
            <div
              key={staff.id}
              className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-xs text-zinc-700 shrink-0">
                  {staff.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-xs text-zinc-900 flex items-center gap-1.5">
                    <span>{staff.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase">
                      Kasir
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-zinc-400" />
                    <span>{staff.email}</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Akses Kasir & Shift Aktif</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteStaff(staff.id, staff.name)}
                title="Hapus akun kasir"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Tambah Akun Kasir / Staf Baru
              </h4>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Nama Lengkap Kasir
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Siti Rahma"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Email / Username Login Kasir
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Contoh: kasir.melati@orchid.id"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Kata Sandi Awal
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-blue-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Akun staf kasir ini akan otomatis terhubung ke cabang Anda ({tenantName || "ini"}), dan hanya diizinkan mencatat order & mengelola shift kasir.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Akun Kasir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
