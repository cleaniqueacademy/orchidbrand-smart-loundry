import React, { useState, useEffect } from "react";
import { X, KeyRound, Eye, EyeOff, Copy, Check, ShieldAlert } from "lucide-react";
import { User } from "../../types";
import { useToast } from "../common/ToastContext";
import { ModalWrapper } from "../common/ModalWrapper";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onResetPassword: (userId: string, newPassword: string) => Promise<boolean>;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  user,
  onResetPassword,
}) => {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState("123456");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewPassword("123456");
      setShowPassword(false);
      setCopied(false);
    }
  }, [isOpen]);

  const handleGenerateRandom = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "cleanique-";
    for (let i = 0; i < 4; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    toast.info("Password Dibuat", `Password acak baru: ${pwd}`);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      toast.success("Tersalin", "Password berhasil disalin ke clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Gagal Menyalin", "Tidak dapat menyalin ke clipboard browser.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      toast.warning("Password Terlalu Pendek", "Kata sandi baru minimal 4 karakter!");
      return;
    }

    try {
      setSubmitting(true);
      const success = await onResetPassword(user.id, newPassword.trim());
      if (success) {
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen && !!user} onClose={onClose} maxWidth="max-w-md">
      {user && (
        <div className="bg-white rounded-2xl w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shadow-2xs">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Reset Password</h3>
              <p className="text-[11px] text-zinc-500">Atur ulang kata sandi pengguna</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card Target */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="text-xs font-bold text-zinc-900 truncate">{user.name}</h4>
              <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap shrink-0 select-none">
                {user.role === "tenant_owner"
                  ? "Tenant Owner"
                  : user.role === "superadmin"
                  ? "Super Admin"
                  : "Staff"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">{user.email}</p>
            {user.tenantName && (
              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                Cabang: <span className="font-semibold text-zinc-700">{user.tenantName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Warning Note */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Pengguna akan menggunakan password baru ini untuk login berikutnya. Berikan password ini secara aman kepada pemilik/staff.
          </p>
        </div>

        {/* Reset Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-700">
                Kata Sandi Baru
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateRandom}
                  className="text-[11px] font-medium text-blue-700 hover:text-blue-900 underline cursor-pointer"
                >
                  Buat Acak
                </button>
                <button
                  type="button"
                  onClick={() => setNewPassword("123456")}
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-700 underline cursor-pointer"
                >
                  Set 123456
                </button>
              </div>
            </div>

            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={4}
                className="w-full px-3 py-2 pr-20 text-xs font-mono font-bold border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-zinc-50/50 hover:bg-white focus:bg-white text-zinc-900"
                placeholder="Masukkan kata sandi baru..."
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-zinc-400 hover:text-zinc-600 rounded transition cursor-pointer"
                  title={showPassword ? "Sembunyikan" : "Tampilkan"}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 text-zinc-400 hover:text-blue-700 rounded transition cursor-pointer"
                  title="Salin Password"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !newPassword.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{submitting ? "Menyimpan..." : "Reset Password"}</span>
            </button>
          </div>
        </form>
      </div>
      )}
    </ModalWrapper>
  );
};
