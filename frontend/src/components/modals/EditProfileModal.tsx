import React, { useState, useEffect } from "react";
import { X, UserCheck, Eye, EyeOff, Save, User as UserIcon } from "lucide-react";
import { User } from "../../types";
import { useToast } from "../common/ToastContext";
import { ModalWrapper } from "../common/ModalWrapper";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onUpdateProfile: (userData: { name: string; password?: string }) => Promise<boolean>;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
}) => {
  const toast = useToast();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || "");
      setPassword("");
      setShowPassword(false);
    }
  }, [isOpen, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!name.trim()) {
      toast.warning("Nama Lengkap Wajib", "Nama pemilik / pengguna tidak boleh kosong!");
      return;
    }

    try {
      setSubmitting(true);
      const payload: { name: string; password?: string } = { name: name.trim() };
      if (password.trim()) {
        if (password.trim().length < 4) {
          toast.warning("Password Terlalu Pendek", "Kata sandi baru minimal 4 karakter!");
          return;
        }
        payload.password = password.trim();
      }

      const success = await onUpdateProfile(payload);
      if (success) {
        toast.success("Profil Berhasil Diperbarui", `Nama profil Anda telah diubah menjadi ${name.trim()}.`);
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen && !!currentUser} onClose={onClose} maxWidth="max-w-md">
      {currentUser && (
        <div className="bg-white rounded-2xl w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shadow-2xs">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Ubah Profil Pengguna</h3>
              <p className="text-[11px] text-zinc-500">Perbarui nama lengkap dan kata sandi akun Anda</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Email Akun
            </label>
            <input
              type="text"
              disabled
              value={currentUser.email}
              className="w-full px-3 py-2 text-xs font-mono border border-zinc-200 rounded-lg bg-zinc-100/70 text-zinc-500 cursor-not-allowed"
            />
            <span className="text-[10px] text-zinc-400 mt-0.5 block">Email digunakan sebagai ID login sistem</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Contoh: Budi Santoso"
              className="w-full px-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-zinc-50/50 hover:bg-white focus:bg-white text-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Ganti Kata Sandi (Opsional)
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kosongkan jika tidak ingin ganti password"
                className="w-full px-3 py-2 pr-10 text-xs font-mono border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-zinc-50/50 hover:bg-white focus:bg-white text-zinc-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 p-1 text-zinc-400 hover:text-zinc-600 rounded transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="text-[10px] text-zinc-400 mt-0.5 block">Isi hanya jika ingin memperbarui kata sandi akun</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{submitting ? "Menyimpan..." : "Simpan Perubahan"}</span>
            </button>
          </div>
        </form>
      </div>
      )}
    </ModalWrapper>
  );
};
