import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  Mail,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Edit2,
  X,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
} from "lucide-react";
import { User } from "../../types";
import { useToast } from "../common/ToastContext";
import { authHeaders } from "../../utils/api";
import { ModalWrapper } from "../common/ModalWrapper";

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

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [resettingStaff, setResettingStaff] = useState<User | null>(null);

  // Form states for Add Staff
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Edit Staff
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [isUpdating, setIsUpdating] = useState(false);

  // Form states for Reset Password
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchStaff = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/staff`, {
        headers: authHeaders(),
      });
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

  // Open Edit Modal with selected staff
  const handleOpenEdit = (staff: User) => {
    setEditingStaff(staff);
    setEditName(staff.name || "");
    setEditEmail(staff.email || "");
    setEditStatus((staff.status as "active" | "inactive") || "active");
  };

  // Open Reset Password Modal
  const handleOpenReset = (staff: User) => {
    setResettingStaff(staff);
    setNewPassword("");
    setShowPassword(false);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Validasi Gagal", "Semua kolom wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/staff`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name, email, password }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Berhasil", "Akun Kasir/Staff baru berhasil ditambahkan!");
        setName("");
        setEmail("");
        setPassword("");
        setIsAddModalOpen(false);
        fetchStaff();
      } else {
        toast.error("Gagal", json.message || "Gagal membuat akun kasir.");
      }
    } catch (err: any) {
      toast.error("Error", "Terjadi kesalahan: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!editName.trim() || !editEmail.trim()) {
      toast.error("Validasi Gagal", "Nama dan email wajib diisi.");
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/staff/${editingStaff.id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          name: editName.trim(),
          email: editEmail.trim(),
          status: editStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Berhasil", "Data staf kasir berhasil diperbarui!");
        setEditingStaff(null);
        fetchStaff();
      } else {
        toast.error("Gagal", json.message || "Gagal memperbarui staf.");
      }
    } catch (err: any) {
      toast.error("Error", "Terjadi kesalahan: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingStaff) return;
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      toast.error("Validasi Gagal", "Kata sandi baru minimal 4 karakter.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch(`/api/staff/${resettingStaff.id}/reset-password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ newPassword: newPassword.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          "Kata Sandi Direset!",
          `Kata sandi untuk ${resettingStaff.name} berhasil diperbarui.`
        );
        setResettingStaff(null);
      } else {
        toast.error("Gagal", json.message || "Gagal mereset kata sandi.");
      }
    } catch (err: any) {
      toast.error("Error", "Terjadi kesalahan: " + err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleToggleStatus = async (staff: User) => {
    try {
      const res = await fetch(`/api/staff/${staff.id}/status`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          "Status Diperbarui",
          `Status staf ${staff.name} kini ${json.data?.status === "active" ? "Aktif" : "Nonaktif"}.`
        );
        fetchStaff();
      } else {
        toast.error("Gagal", json.message || "Gagal mengubah status staf.");
      }
    } catch (err: any) {
      toast.error("Error", err.message);
    }
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`Hapus akun staf kasir "${staffName}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/staff/${staffId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Berhasil", "Akun staf kasir berhasil dihapus.");
        fetchStaff();
      } else {
        toast.error("Gagal", json.message || "Gagal menghapus staf.");
      }
    } catch (err: any) {
      toast.error("Error", "Terjadi kesalahan: " + err.message);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-5 space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shadow-2xs shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-900 text-sm sm:text-base flex items-center gap-2">
              Manajemen Akun Kasir & Staf Cabang
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
              Kelola akses staf operasional kasir untuk outlet <strong>{tenantName || "ini"}</strong>. Anda dapat mengedit nama, email, mereset password, serta menonaktifkan akun kasir kapan saja.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0 self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kasir</span>
        </button>
      </div>

      {/* Staff List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 opacity-75">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-200 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-zinc-200 rounded w-28" />
                <div className="h-3 bg-zinc-200 rounded w-36" />
                <div className="h-3 bg-zinc-200 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <div className="py-10 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-200">
          <Users className="w-9 h-9 text-zinc-300 mx-auto mb-2 opacity-80" />
          <p className="text-xs font-bold text-zinc-700">Belum Ada Akun Kasir Tambahan</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Klik tombol "Tambah Kasir" di atas untuk membuatkan akun khusus bagi karyawan/staf kasir Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {staffList.map((staff) => {
            const isActive = staff.status !== "inactive";
            return (
              <div
                key={staff.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 shadow-2xs ${
                  isActive
                    ? "border-zinc-200 bg-white hover:border-zinc-300"
                    : "border-zinc-200/60 bg-zinc-50/60 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${
                        isActive
                          ? "bg-zinc-100 border-zinc-200 text-zinc-700"
                          : "bg-zinc-200 border-zinc-300 text-zinc-400"
                      }`}
                    >
                      {staff.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-zinc-900 flex items-center gap-1.5 flex-wrap">
                        <span>{staff.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                          Kasir
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(staff)}
                          title="Klik untuk ubah status aktif/nonaktif"
                          className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-semibold border cursor-pointer transition ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-zinc-100 text-zinc-500 border-zinc-300 hover:bg-zinc-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-zinc-400"
                            }`}
                          />
                          {isActive ? "Aktif" : "Nonaktif"}
                        </button>
                      </div>

                      <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-zinc-400" />
                        <span className="font-mono text-[10.5px]">{staff.email}</span>
                      </div>

                      <div className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1 font-medium">
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Akses Meja Kasir Aktif</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span className="text-amber-700">Akses Dibekukan Sementara</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Owner Actions Bar for this staff */}
                <div className="flex items-center justify-end gap-1.5 pt-2.5 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => handleOpenReset(staff)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold transition cursor-pointer"
                    title="Reset kata sandi staf kasir ini"
                  >
                    <KeyRound className="w-3 h-3 text-amber-600" />
                    <span>Reset Password</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(staff)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold transition cursor-pointer"
                    title="Edit nama dan email staf"
                  >
                    <Edit2 className="w-3 h-3 text-blue-600" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(staff.id, staff.name)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition cursor-pointer"
                    title="Hapus akun kasir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Tambah Kasir Baru */}
      <ModalWrapper isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} maxWidth="max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden text-zinc-900">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
            <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Tambah Akun Kasir / Staf Baru
            </h4>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleAddStaff} className="p-5 space-y-3.5">
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
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-zinc-50/50 hover:bg-white focus:bg-white transition"
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
                placeholder="Contoh: kasir.melati@cleaniquelaundry.id"
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-zinc-50/50 hover:bg-white focus:bg-white transition"
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
                placeholder="Minimal 4 karakter"
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-zinc-50/50 hover:bg-white focus:bg-white transition"
              />
            </div>

            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Akun staf ini otomatis terhubung ke outlet <strong>{tenantName || "Anda"}</strong>, dan dibatasi hanya pada meja kasir & transaksi pesanan.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Menyimpan..." : "Simpan Akun Kasir"}
              </button>
            </div>
          </form>
        </div>
      </ModalWrapper>

      {/* Modal 2: Edit Data Staf */}
      <ModalWrapper isOpen={!!editingStaff} onClose={() => setEditingStaff(null)} maxWidth="max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden text-zinc-900">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
            <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-blue-600" />
              Edit Akun Kasir
            </h4>
            <button
              type="button"
              onClick={() => setEditingStaff(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleUpdateStaff} className="p-5 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Nama Lengkap Kasir
              </label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-zinc-50/50 hover:bg-white focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Email / Username Login
              </label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-zinc-50/50 hover:bg-white focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Status Akun Kasir
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "active" | "inactive")}
                className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-zinc-50/50 hover:bg-white focus:bg-white transition cursor-pointer"
              >
                <option value="active">🟢 Aktif (Bisa login & bertugas)</option>
                <option value="inactive">⚪ Nonaktif (Akses dibekukan)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="px-3.5 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </form>
        </div>
      </ModalWrapper>

      {/* Modal 3: Reset Password Staf */}
      <ModalWrapper isOpen={!!resettingStaff} onClose={() => setResettingStaff(null)} maxWidth="max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden text-zinc-900">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
            <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600" />
              Reset Kata Sandi Kasir
            </h4>
            <button
              type="button"
              onClick={() => setResettingStaff(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleResetPassword} className="p-5 space-y-3.5">
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs space-y-1">
              <p className="font-bold text-zinc-900">{resettingStaff?.name}</p>
              <p className="text-[11px] text-zinc-500 font-mono">{resettingStaff?.email}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru (min 4 karakter)"
                  className="w-full px-3 py-2 pr-10 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-zinc-50/50 hover:bg-white focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 leading-snug">
              Setelah disimpan, staf kasir dapat langsung login menggunakan kata sandi baru ini.
            </p>

            <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setResettingStaff(null)}
                className="px-3.5 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isResetting}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isResetting ? "Mereset..." : "Reset Kata Sandi"}
              </button>
            </div>
          </form>
        </div>
      </ModalWrapper>
    </div>
  );
};
