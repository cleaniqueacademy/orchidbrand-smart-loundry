import React, { useState } from "react";
import { X, UserPlus, ShieldCheck } from "lucide-react";
import { Role, Tenant } from "../../types";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenants: Tenant[];
  onSubmit: (userData: {
    name: string;
    email: string;
    password?: string;
    role: Role;
    tenantId?: string;
    status: "active" | "inactive";
    subscriptionUntil?: string;
  }) => Promise<void>;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  tenants,
  onSubmit,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("123456");
  const [role, setRole] = useState<Role>("staff");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const defaultSubDate = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
  const [subscriptionUntil, setSubscriptionUntil] = useState(defaultSubDate);
  const [tenantId, setTenantId] = useState(tenants[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert("Nama dan email wajib diisi!");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        name,
        email,
        password,
        role,
        tenantId: role === "superadmin" ? undefined : tenantId,
        status,
        subscriptionUntil: role === "superadmin" ? undefined : subscriptionUntil,
      });
      setName("");
      setEmail("");
      setPassword("123456");
      setRole("staff");
      setStatus("active");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">Tambah Pengguna Baru</h3>
              <p className="text-xs text-zinc-500">Buat akun untuk Super Admin, Owner, atau Kasir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Rian Pratama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Alamat Email (Login) <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="rian@laundry.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Kata Sandi
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Status Akun <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none font-medium"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Peran / Hak Akses <span className="text-rose-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none font-medium"
            >
              <option value="staff">Staff / Kasir (Operasional Outlet)</option>
              <option value="tenant_owner">Tenant Owner (Pemilik Outlet)</option>
              <option value="superadmin">Super Admin (Pusat - Semua Cabang)</option>
            </select>
          </div>

          {role !== "superadmin" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Tugaskan ke Cabang
                </label>
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none font-medium"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.outletName} ({t.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Masa Langganan Offline Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={subscriptionUntil}
                  onChange={(e) => setSubscriptionUntil(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none font-medium"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Batas tanggal penggunaan sistem offline. Jika lewat, akun otomatis kedaluwarsa.
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 rounded-lg border border-zinc-200 text-zinc-700 font-medium text-xs hover:bg-zinc-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-1/2 py-2 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium text-xs transition shadow-sm disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Pengguna"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
