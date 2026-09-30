import React, { useState } from "react";
import { X, UserPlus, ShieldCheck, Store, Briefcase, User, Info, Building2 } from "lucide-react";
import { Role, Tenant } from "../../types";
import { useToast } from "../common/ToastContext";
import { ModalWrapper } from "../common/ModalWrapper";

export interface CreateUserDataPayload {
  readonly name: string;
  readonly email: string;
  readonly password?: string;
  readonly role: Role;
  readonly tenantId?: string;
  readonly newOutletName?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly commissionRateDefault?: number;
  readonly notes?: string;
  readonly status: "active" | "inactive";
  readonly subscriptionUntil?: string;
}

export interface CreateUserModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly tenants: Tenant[];
  readonly onSubmit: (userData: CreateUserDataPayload) => Promise<void>;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  tenants,
  onSubmit,
}) => {
  const toast = useToast();
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("123456");
  const [role, setRole] = useState<Role>("staff");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  // State untuk Cabang / Tenant
  const [tenantMode, setTenantMode] = useState<"existing" | "new">("existing");
  const [tenantId, setTenantId] = useState<string>(tenants[0]?.id || "");
  const [newOutletName, setNewOutletName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");

  // State untuk Marketing
  const [commissionRate, setCommissionRate] = useState<number>(5000);
  const [notes, setNotes] = useState<string>("");

  // State Masa Aktif
  const defaultSubDate = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
  const [subscriptionUntil, setSubscriptionUntil] = useState<string>(defaultSubDate);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const resetForm = (): void => {
    setName("");
    setEmail("");
    setPassword("123456");
    setRole("staff");
    setStatus("active");
    setTenantMode("existing");
    setTenantId(tenants[0]?.id || "");
    setNewOutletName("");
    setPhone("");
    setAddress("");
    setCommissionRate(5000);
    setNotes("");
    setSubscriptionUntil(defaultSubDate);
  };

  const handleModalClose = (): void => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      toast.warning("Form Belum Lengkap", "Nama dan email pengguna wajib diisi!");
      return;
    }

    if (role === "tenant_owner" && tenantMode === "new" && !newOutletName.trim()) {
      toast.warning("Nama Outlet Wajib Diisi", "Masukkan nama outlet baru untuk Owner ini!");
      return;
    }

    if (role === "staff" && !tenantId && tenants.length > 0) {
      toast.warning("Pilih Outlet Toko", "Staf harus ditugaskan ke salah satu outlet milik owner!");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        name: cleanName,
        email: cleanEmail,
        password: password.trim() || "123456",
        role,
        tenantId:
          role === "superadmin" || role === "marketing"
            ? undefined
            : role === "tenant_owner" && tenantMode === "new"
            ? undefined
            : tenantId || undefined,
        newOutletName:
          role === "tenant_owner" && tenantMode === "new" ? newOutletName.trim() : undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        commissionRateDefault: role === "marketing" ? commissionRate : undefined,
        notes: role === "marketing" ? notes.trim() : undefined,
        status,
        subscriptionUntil:
          role === "superadmin" || role === "marketing" ? undefined : subscriptionUntil,
      });

      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleModalClose} maxWidth="max-w-lg">
      <div className="bg-white rounded-2xl w-full p-5 sm:p-6 shadow-xl border border-zinc-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">Tambah Pengguna Baru</h3>
              <p className="text-xs text-zinc-500">
                Buat akun staf, owner, tim marketing IndoTech, atau administrator.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Identitas Pengguna */}
          <div className="space-y-3">
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
                className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50/50 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none font-medium transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Email Login <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="rian@cleanique.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50/50 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none font-medium transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Kata Sandi Awal
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50/50 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none font-mono transition"
                />
              </div>
            </div>
          </div>

          {/* Pilihan Peran Pengguna (Role) */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-zinc-700">
              Peran Akun (Role) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "staff" as const, label: "Kasir / Staff", icon: User, desc: "Staf cabang" },
                { id: "tenant_owner" as const, label: "Tenant Owner", icon: Store, desc: "Pemilik outlet" },
                { id: "marketing" as const, label: "Marketing", icon: Briefcase, desc: "Tim IndoTech" },
                { id: "superadmin" as const, label: "Super Admin", icon: ShieldCheck, desc: "Akses pusat" },
              ].map((item) => {
                const IconComponent = item.icon;
                const isSelected = role === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition cursor-pointer ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-2xs"
                        : "border-zinc-200 hover:border-zinc-300 bg-white text-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <IconComponent
                        className={`w-4 h-4 ${isSelected ? "text-blue-700" : "text-zinc-400"}`}
                      />
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      )}
                    </div>
                    <div className="font-semibold text-xs leading-tight">{item.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pengaturan Status Unilateral */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-zinc-800">Status Awal Akun</div>
              <div className="text-[11px] text-zinc-500">
                {status === "active"
                  ? "Akun langsung aktif dan dapat login beroperasi."
                  : "Akun dikunci (nonaktif sepihak). Pengguna tidak dapat login."}
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  status === "active"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Aktif
              </button>
              <button
                type="button"
                onClick={() => setStatus("inactive")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                  status === "inactive"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Nonaktif
              </button>
            </div>
          </div>

          {/* Dynamic Configuration: Role STAFF */}
          {role === "staff" && (
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <Store className="w-4 h-4 text-blue-700" />
                <span>Penugasan Cabang / Toko Kasir</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Pilih Outlet Toko Milik Owner
                </label>
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 font-medium outline-none focus:border-blue-600 transition cursor-pointer"
                >
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.outletName} (ID: {t.id})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Staf ini akan mencatat order kasir dan shift di outlet yang dipilih.
                </p>
              </div>
            </div>
          )}

          {/* Dynamic Configuration: Role TENANT_OWNER */}
          {role === "tenant_owner" && (
            <div className="p-3.5 bg-blue-50/40 rounded-xl border border-blue-200/80 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <span>Cabang Toko Laundry Owner</span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTenantMode("existing")}
                    className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                      tenantMode === "existing"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-zinc-600 border border-zinc-200"
                    }`}
                  >
                    Toko Ada
                  </button>
                  <button
                    type="button"
                    onClick={() => setTenantMode("new")}
                    className={`px-2 py-0.5 rounded font-semibold transition cursor-pointer ${
                      tenantMode === "new"
                        ? "bg-blue-600 text-white"
                        : "bg-white text-zinc-600 border border-zinc-200"
                    }`}
                  >
                    + Cabang Baru
                  </button>
                </div>
              </div>

              {tenantMode === "existing" ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Pilih Outlet Toko
                  </label>
                  <select
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 font-medium outline-none focus:border-blue-600 transition cursor-pointer"
                  >
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.outletName} (ID: {t.id})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Nama Outlet / Cabang Baru <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Cleanique Cabang Kemang"
                      value={newOutletName}
                      onChange={(e) => setNewOutletName(e.target.value)}
                      className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 font-medium outline-none focus:border-blue-600 transition"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Nomor WhatsApp Toko
                      </label>
                      <input
                        type="text"
                        placeholder="08123456789"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 font-medium outline-none focus:border-blue-600 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Alamat Toko
                      </label>
                      <input
                        type="text"
                        placeholder="Jl. Melati No. 12, Jakarta"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 font-medium outline-none focus:border-blue-600 transition"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Masa Aktif Lisensi Langganan Awal
                </label>
                <input
                  type="date"
                  value={subscriptionUntil}
                  onChange={(e) => setSubscriptionUntil(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 font-medium outline-none focus:border-blue-600 transition"
                />
              </div>
            </div>
          )}

          {/* Dynamic Configuration: Role MARKETING */}
          {role === "marketing" && (
            <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-200/80 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Briefcase className="w-4 h-4 text-indigo-700" />
                <span>Pengaturan Tim Marketing IndoTech</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Nomor WhatsApp Tim Marketing
                  </label>
                  <input
                    type="text"
                    placeholder="081987654321"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 font-medium outline-none focus:border-indigo-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Insentif per Perpanjangan (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    placeholder="5000"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 font-medium outline-none focus:border-indigo-600 transition"
                  />
                  <p className="text-[10px] text-zinc-400 mt-0.5">Standar: Rp 5.000 / perpanjangan outlet</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Catatan / Wilayah Kerja
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Divisi marketing & referral wilayah Sleman / Yogyakarta"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 font-medium outline-none focus:border-indigo-600 transition"
                />
              </div>
            </div>
          )}

          {/* Dynamic Configuration: Role SUPERADMIN */}
          {role === "superadmin" && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-xs text-amber-900 animate-in fade-in">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Akses Administrator Pusat:</strong> Akun ini memiliki kontrol penuh atas
                seluruh cabang, sistem keuangan platform, kode referral, dan database.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 font-semibold text-xs hover:bg-zinc-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Menyimpan..." : "Simpan Pengguna"}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
};
