import { useState } from "react";
import { User, Role, Tenant } from "../types";
import { useToast } from "../components/common/ToastContext";
import { useConfirm } from "../components/common/ConfirmContext";
import { authHeaders } from "../utils/api";

const AUTH_KEY = "cleanique_auth_user";
const API_BASE = "/api";

function readSavedUser(): User | null {
  try {
    const saved = localStorage.getItem(AUTH_KEY);
    if (!saved) return null;
    const u = JSON.parse(saved);
    // Validasi wajib ada id dan role yang benar
    if (!u || !u.id || !u.email || !["superadmin", "tenant_owner", "staff"].includes(u.role)) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return u as User;
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function useAuthSession() {
  const toast = useToast();
  const confirm = useConfirm();

  const [currentUser, setCurrentUser] = useState<User | null>(() => readSavedUser());

  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) {
        const u = JSON.parse(saved);
        if (u && u.role) return u.role;
      }
    } catch {}
    return "tenant_owner";
  });

  const [tenantId, setTenantId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(AUTH_KEY);
      if (saved) {
        const u = JSON.parse(saved);
        if (u && (u.role === "tenant_owner" || u.role === "staff") && u.tenantId) {
          return u.tenantId;
        }
        if (u && u.role === "superadmin") {
          return "all";
        }
      }
    } catch {}
    return "tenant-01";
  });

  const handleLoginSuccess = (user: User) => {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    toast.success("Login Berhasil", `Selamat datang kembali, ${user.name}!`);
    setCurrentUser(user);
    setCurrentUserRole(user.role);
    if ((user.role === "tenant_owner" || user.role === "staff") && user.tenantId) {
      setTenantId(user.tenantId);
    } else if (user.role === "superadmin") {
      setTenantId("all");
    }
  };

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Keluar dari Sistem?",
      description:
        "Apakah Anda yakin ingin keluar dari akun Laundry Cleanique? Anda perlu login kembali untuk mengakses data operasional.",
      confirmText: "Ya, Keluar",
      cancelText: "Tetap Masuk",
      variant: "warning",
    });

    if (!confirmed) return;

    toast.info("Mengeluarkan Akun...", "Sesi Anda telah diakhiri.");
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: authHeaders(),
      });
    } catch {}
    // Clear localStorage
    try {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem("cleanique_auth_tenant");
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("cleanique_")) localStorage.removeItem(key);
      });
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => {
      window.location.replace("/");
    }, 400);
  };

  const handleSelectTenant = (id: string, _tenants: Tenant[]) => {
    if (currentUserRole === "superadmin") {
      setTenantId("all");
      return;
    }
    if (currentUserRole === "staff") {
      // Staff locked to assigned branch
      return;
    }
    setTenantId(id);
  };

  const refreshUserSession = async (): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/status?userId=${currentUser.id}`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setCurrentUser(data.user);
        setCurrentUserRole(data.user.role);
        localStorage.setItem(AUTH_KEY, JSON.stringify(data.user));
        return !data.statusInfo?.isInactive;
      }
      return false;
    } catch (err) {
      console.error("Failed to refresh session:", err);
      return false;
    }
  };

  return {
    currentUser,
    setCurrentUser,
    currentUserRole,
    setCurrentUserRole,
    tenantId,
    setTenantId,
    handleLoginSuccess,
    handleLogout,
    handleSelectTenant,
    refreshUserSession,
  };
}
