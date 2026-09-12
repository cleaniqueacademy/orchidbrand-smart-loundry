import React, { useState, useEffect, useCallback } from "react";
import {
  CashflowStats,
  Order,
  Customer,
  Expense,
  Tenant,
  TabType,
  User,
  Role,
} from "./types";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { OrdersTab } from "./components/tabs/OrdersTab";
import { CashflowTab } from "./components/tabs/CashflowTab";
import { CustomersTab } from "./components/tabs/CustomersTab";
import { TenantsTab } from "./components/tabs/TenantsTab";
import { UsersTab } from "./components/tabs/UsersTab";
import { ReportsTab } from "./components/tabs/ReportsTab";
import { CreateOrderModal } from "./components/modals/CreateOrderModal";
import { CreateExpenseModal } from "./components/modals/CreateExpenseModal";
import { CreateCustomerModal } from "./components/modals/CreateCustomerModal";
import { CreateTenantModal } from "./components/modals/CreateTenantModal";
import { CreateUserModal } from "./components/modals/CreateUserModal";
import { EditCustomerModal } from "./components/modals/EditCustomerModal";
import { LoginPage } from "./components/auth/LoginPage";
import { useToast } from "./components/common/ToastContext";
import { useConfirm } from "./components/common/ConfirmContext";

const AUTH_KEY = "orchid_auth_user";
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

export default function App() {
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [currentUser, setCurrentUser] = useState<User | null>(() => readSavedUser());

  const [currentUserRole, setCurrentUserRole] = useState<Role>(() => {
    try {
      const saved = localStorage.getItem("orchid_auth_user");
      if (saved) {
        const u = JSON.parse(saved);
        if (u && u.role) return u.role;
      }
    } catch {}
    return "tenant_owner";
  });

  const [tenantId, setTenantId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("orchid_auth_user");
      if (saved) {
        const u = JSON.parse(saved);
        if (u && u.role === "tenant_owner" && u.tenantId) {
          return u.tenantId;
        }
        if (u && u.role === "superadmin") {
          return "all";
        }
      }
    } catch {}
    return "tenant-01";
  });

  const [loading, setLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Data states
  const [stats, setStats] = useState<CashflowStats>({
    totalIncome: 0,
    pendingPaymentAmount: 0,
    totalExpense: 0,
    netProfit: 0,
    totalOrdersCount: 0,
    activeOrdersCount: 0,
    readyOrdersCount: 0,
    completedOrdersCount: 0,
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Modal states
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string>("");

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Stats
      const statsRes = await fetch(`${API_BASE}/stats/cashflow?tenantId=${tenantId}`);
      if (statsRes.ok) {
        const json = await statsRes.json();
        if (json.success) setStats(json.data);
      }

      // 2. Orders
      const ordersRes = await fetch(`${API_BASE}/orders?tenantId=${tenantId}`);
      if (ordersRes.ok) {
        const json = await ordersRes.json();
        if (json.success) setOrders(json.data);
      }

      // 3. Customers
      const custRes = await fetch(`${API_BASE}/customers?tenantId=${tenantId}`);
      if (custRes.ok) {
        const json = await custRes.json();
        if (json.success) setCustomers(json.data);
      }

      // 4. Expenses
      const expRes = await fetch(`${API_BASE}/expenses?tenantId=${tenantId}`);
      if (expRes.ok) {
        const json = await expRes.json();
        if (json.success) setExpenses(json.data);
      }

      // 5. Tenants
      const tenantsRes = await fetch(`${API_BASE}/tenants`);
      if (tenantsRes.ok) {
        const json = await tenantsRes.json();
        if (json.success) setTenants(json.data);
      }

      // 6. Users (Super Admin data)
      const usersRes = await fetch(`${API_BASE}/users`);
      if (usersRes.ok) {
        const json = await usersRes.json();
        if (json.success) setUsers(json.data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [fetchData, currentUser]);

  const handleLoginSuccess = (user: User) => {
    try {
      localStorage.setItem("orchid_auth_user", JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    toast.success("Login Berhasil", `Selamat datang kembali, ${user.name}!`);
    setCurrentUser(user);
    setCurrentUserRole(user.role);
    if (user.role === "tenant_owner" && user.tenantId) {
      setTenantId(user.tenantId);
    } else if (user.role === "superadmin") {
      setTenantId("all");
    }
    setActiveTab("overview");
  };

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: "Keluar dari Sistem?",
      description: "Apakah Anda yakin ingin keluar dari akun Orchid Smart Laundry? Anda perlu login kembali untuk mengakses data operasional.",
      confirmText: "Ya, Keluar",
      cancelText: "Tetap Masuk",
      variant: "warning",
    });

    if (!confirmed) return;

    toast.info("Mengeluarkan Akun...", "Sesi Anda telah diakhiri.");
    // Clear localStorage
    try {
      localStorage.removeItem("orchid_auth_user");
      localStorage.removeItem("orchid_auth_tenant");
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("orchid_")) localStorage.removeItem(key);
      });
    } catch (e) {
      console.error(e);
    }
    setTimeout(() => {
      window.location.replace("/");
    }, 400);
  };

  const handleSelectTenant = (id: string) => {
    setTenantId(id);
    if (id === "all") {
      toast.info("Mode Agregat Pusat", "Menampilkan data gabungan dari seluruh cabang outlet.");
    } else {
      const t = tenants.find((item) => item.id === id);
      toast.info("Inspeksi Cabang", `Sekarang memantau: ${t?.outletName || id}`);
    }
  };

  // Order status update
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    const statusLabels: Record<string, string> = {
      pending: "Antrian",
      washing: "Sedang Dicuci",
      drying_ironing: "Setrika / Lipat",
      ready: "Siap Diambil",
      completed: "Selesai",
    };
    const label = statusLabels[newStatus] || newStatus;

    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        toast.success(
          "Status Cucian Diperbarui",
          targetOrder
            ? `Pesanan ${targetOrder.invoiceNo} kini di tahap: ${label}`
            : `Status berhasil diubah ke ${label}`
        );
        if (data.waData?.waUrl && (newStatus === "ready" || newStatus === "completed")) {
          toast.info("Notifikasi WhatsApp", "Membuka WhatsApp untuk mengirim pesan ke pelanggan...");
          window.open(data.waData.waUrl, "_blank");
        }
      } else {
        toast.error("Gagal Memperbarui Status", data.message || "Terjadi kesalahan pada server");
      }
    } catch (err: any) {
      console.error("Update status error:", err);
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // Payment update
  const handleUpdatePayment = async (
    orderId: string,
    paymentStatus: string,
    paymentMethod = "cash"
  ) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus, paymentMethod }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        toast.success(
          "Pembayaran Berhasil Dicatat",
          targetOrder
            ? `Pesanan ${targetOrder.invoiceNo} telah ditandai Lunas (${paymentMethod})`
            : `Status pembayaran diubah ke Lunas (${paymentMethod})`
        );
      } else {
        toast.error("Gagal Update Pembayaran", data.message || "Terjadi kesalahan pada server");
      }
    } catch (err: any) {
      console.error("Update payment error:", err);
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // Create Order
  const handleCreateOrder = async (orderData: {
    customerId: string;
    serviceType: string;
    weightOrQty: number;
    unit: string;
    pricePerUnit: number;
    paymentStatus: string;
    paymentMethod: string;
    notes?: string;
  }) => {
    const totalAmount = orderData.weightOrQty * orderData.pricePerUnit;
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          ...orderData,
          totalAmount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        toast.success(
          "Pesanan Berhasil Dibuat",
          `Nota ${data.data?.invoiceNo || ""} sebesar Rp ${totalAmount.toLocaleString("id-ID")} telah tercatat.`
        );
      } else {
        toast.error("Gagal Membuat Order", data.message || "Terjadi kesalahan pada server");
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // Create Expense
  const handleCreateExpense = async (expenseData: {
    category: string;
    amount: number;
    notes: string;
    expenseDate: string;
  }) => {
    try {
      const res = await fetch(`${API_BASE}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          ...expenseData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        toast.success(
          "Pengeluaran Berhasil Dicatat",
          `${expenseData.category}: Rp ${expenseData.amount.toLocaleString("id-ID")} (${expenseData.notes})`
        );
      } else {
        toast.error("Gagal Mencatat Biaya", data.message || "Terjadi kesalahan pada server");
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // Delete Expense with Confirmation Modal
  const handleDeleteExpense = async (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    const confirmed = await confirm({
      title: "Hapus Catatan Pengeluaran?",
      description: exp ? (
        <span>
          Apakah Anda yakin ingin menghapus catatan biaya <strong>{exp.category}</strong> (<em>"{exp.notes}"</em>) sebesar{" "}
          <strong className="text-rose-600 font-mono">Rp {exp.amount.toLocaleString("id-ID")}</strong>? Tindakan ini tidak dapat dibatalkan.
        </span>
      ) : (
        "Apakah Anda yakin ingin menghapus catatan pengeluaran ini? Tindakan ini tidak dapat dibatalkan."
      ),
      confirmText: "Hapus Pengeluaran",
      cancelText: "Batal",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/expenses/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        toast.success("Catatan Pengeluaran Dihapus", "Catatan biaya berhasil dihapus dari buku kas.");
      } else {
        toast.error("Gagal Menghapus Biaya", "Server mengembalikan respons gagal.");
      }
    } catch (err: any) {
      console.error("Delete expense error:", err);
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server.");
    }
  };

  // Create Customer
  const handleCreateCustomer = async (custData: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  }) => {
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, ...custData }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        toast.success(
          "Pelanggan Berhasil Ditambahkan",
          `${custData.name} (${custData.phone}) siap menerima pesanan laundry.`
        );
      } else {
        toast.error("Gagal Menambah Pelanggan", data.message || "Terjadi kesalahan pada server");
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // Edit Customer
  const handleEditCustomer = (cust: Customer) => {
    setCustomerToEdit(cust);
    setShowEditCustomerModal(true);
  };

  const handleUpdateCustomer = async (
    id: string,
    updatedData: { name: string; phone: string; address?: string; notes?: string }
  ) => {
    try {
      const res = await fetch(`${API_BASE}/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        toast.success(
          "Data Pelanggan Diperbarui",
          `Informasi kontak ${updatedData.name} berhasil diperbarui.`
        );
      } else {
        toast.error("Gagal Memperbarui Pelanggan", data.message || "Terjadi kesalahan");
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // Delete Customer with Confirmation Modal
  const handleDeleteCustomer = async (id: string) => {
    const cust = customers.find((c) => c.id === id);
    const confirmed = await confirm({
      title: "Hapus Data Pelanggan?",
      description: cust ? (
        <span>
          Apakah Anda yakin ingin menghapus data pelanggan <strong>{cust.name}</strong> ({cust.phone})?
          Seluruh histori pesanan dan kontak pelanggan ini akan dihapus dari direktori.
        </span>
      ) : (
        "Apakah Anda yakin ingin menghapus data pelanggan ini? Tindakan ini tidak dapat dibatalkan."
      ),
      confirmText: "Hapus Pelanggan",
      cancelText: "Batal",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchData();
        toast.success("Pelanggan Berhasil Dihapus", `Data ${cust?.name || "pelanggan"} telah dihapus.`);
      } else {
        toast.error("Gagal Menghapus Pelanggan", data.message || "Terjadi kesalahan");
      }
    } catch (err: any) {
      console.error("Delete customer error:", err);
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // Toggle User Status (Aktif / Nonaktif) with Confirmation for Deactivation
  const handleToggleUserStatus = async (userId: string, currentStatus: "active" | "inactive") => {
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser?.role === "superadmin") {
      toast.warning("Aksi Dibatasi", "Akun Super Admin selalu berstatus aktif.");
      return;
    }

    const nextStatus = currentStatus === "active" ? "inactive" : "active";

    if (currentStatus === "active") {
      const confirmed = await confirm({
        title: "Nonaktifkan Akun Pengguna?",
        description: targetUser ? (
          <span>
            Apakah Anda yakin ingin menonaktifkan akun <strong>{targetUser.name}</strong> ({targetUser.email})?
            Pengguna tidak akan dapat login ke dalam sistem selama status akun nonaktif.
          </span>
        ) : (
          "Pengguna tidak akan dapat login ke dalam sistem selama status akun nonaktif."
        ),
        confirmText: "Nonaktifkan Akun",
        cancelText: "Batal",
        variant: "warning",
      });
      if (!confirmed) return;
    }

    try {
      const res = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        fetchData();
        toast.success(
          "Status Akun Diperbarui",
          `Akun ${targetUser?.name || "Pengguna"} sekarang ${nextStatus === "active" ? "Aktif" : "Nonaktif"}.`
        );
      } else {
        toast.error("Gagal Mengubah Status", "Respons server tidak berhasil.");
      }
    } catch (err: any) {
      console.error("Toggle status error:", err);
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // Update User Subscription Date (Offline Model)
  const handleUpdateUserSubscription = async (userId: string, subscriptionUntil: string) => {
    const targetUser = users.find((u) => u.id === userId);
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionUntil }),
      });
      if (res.ok) {
        fetchData();
        toast.success(
          "Masa Langganan Diperbarui",
          `Akun ${targetUser?.name || "Pengguna"} aktif hingga ${subscriptionUntil}.`
        );
      } else {
        toast.error("Gagal Memperbarui Langganan", "Respons server gagal.");
      }
    } catch (err: any) {
      console.error("Update subscription error:", err);
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // Create Tenant
  const handleCreateTenant = async (tenantData: {
    outletName: string;
    phone: string;
    address: string;
    ownerName: string;
    ownerEmail: string;
    password?: string;
  }) => {
    try {
      const res = await fetch(`${API_BASE}/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tenantData),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        toast.success(
          "Cabang Outlet Berhasil Didaftarkan",
          `${tenantData.outletName} telah dibuat dengan pemilik ${tenantData.ownerName}.`
        );
      } else {
        toast.error("Gagal Membuat Tenant", data.message || "Terjadi kesalahan pada server");
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // Create User (Super Admin)
  const handleCreateUser = async (userData: {
    name: string;
    email: string;
    password?: string;
    role: Role;
    tenantId?: string;
    status: "active" | "inactive";
    subscriptionUntil?: string;
  }) => {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        toast.success(
          "Pengguna Berhasil Ditambahkan",
          `Akun ${userData.name} (${userData.role}) berhasil didaftarkan.`
        );
      } else {
        toast.error("Gagal Menambah Pengguna", data.message || "Terjadi kesalahan pada server");
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // Delete User (Super Admin) with Confirmation Modal
  const handleDeleteUser = async (id: string) => {
    const targetUser = users.find((u) => u.id === id);
    if (targetUser?.role === "superadmin") {
      toast.warning("Aksi Ditolak", "Akun Super Admin utama tidak dapat dihapus.");
      return;
    }

    const confirmed = await confirm({
      title: "Hapus Akun Pengguna?",
      description: targetUser ? (
        <span>
          Apakah Anda yakin ingin menghapus akun <strong>{targetUser.name}</strong> ({targetUser.email})?
          Akses pengguna ke sistem akan dicabut secara permanen.
        </span>
      ) : (
        "Akses pengguna ke sistem akan dicabut secara permanen."
      ),
      confirmText: "Hapus Pengguna",
      cancelText: "Batal",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        toast.success("Pengguna Dihapus", `Akun ${targetUser?.name || "pengguna"} berhasil dihapus dari sistem.`);
      } else {
        toast.error("Gagal Menghapus Pengguna", "Server gagal memproses penghapusan.");
      }
    } catch (err: any) {
      console.error("Delete user error:", err);
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    }
  };

  // WhatsApp Link Helper
  const getWaLink = (order: Order) => {
    if (!order.customer?.phone) return "#";
    const cleanPhone = order.customer.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const paymentText =
      order.paymentStatus === "paid"
        ? "✅ LUNAS"
        : `⚠️ BELUM LUNAS (Rp ${order.totalAmount.toLocaleString("id-ID")})`;
    const text = `Halo Kak ${order.customer.name}! 👋\n\nCucian Anda di *Orchid Smart Laundry* sudah *SELESAI & SIAP DIAMBIL* 🧺✨\n\n📄 *No. Nota:* ${order.invoiceNo}\n🧺 *Layanan:* ${order.serviceType} (${order.weightOrQty} ${order.unit})\n💰 *Status Bayar:* ${paymentText}\n\nTerima kasih banyak telah mempercayakan pakaian Anda! 🙏`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 flex text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">
      {/* Shadcn Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeOrdersCount={stats.activeOrdersCount}
        readyOrdersCount={stats.readyOrdersCount}
        tenantId={tenantId}
        onSelectTenant={handleSelectTenant}
        tenants={tenants}
        currentUserRole={currentUserRole}
        currentUser={currentUser}
        onToggleRole={(role) => {
          setCurrentUserRole(role);
          if (role === "superadmin") {
            setTenantId("all");
          } else {
            setTenantId(tenants[0]?.id || "tenant-01");
          }
        }}
        onOpenTenantModal={() => setShowTenantModal(true)}
        onLogout={handleLogout}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all duration-300">
        <Header
          activeTab={activeTab}
          currentUserRole={currentUserRole}
          currentUser={currentUser}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onRefresh={fetchData}
          onLogout={handleLogout}
          loading={loading}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === "overview" && (
            <OverviewTab
              stats={stats}
              orders={orders}
              onOpenOrderModal={() => {
                setPreselectedCustomerId("");
                setShowOrderModal(true);
              }}
              onOpenExpenseModal={() => setShowExpenseModal(true)}
              onUpdateStatus={handleUpdateStatus}
              getWaLink={getWaLink}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "orders" && (
            <OrdersTab
              orders={orders}
              onOpenOrderModal={() => {
                setPreselectedCustomerId("");
                setShowOrderModal(true);
              }}
              onUpdateStatus={handleUpdateStatus}
              onUpdatePayment={handleUpdatePayment}
              getWaLink={getWaLink}
            />
          )}

          {activeTab === "cashflow" && (
            <CashflowTab
              stats={stats}
              expenses={expenses}
              onOpenExpenseModal={() => setShowExpenseModal(true)}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {activeTab === "customers" && (
            <CustomersTab
              customers={customers}
              orders={orders}
              onOpenCustomerModal={() => setShowCustomerModal(true)}
              onSelectCustomerForOrder={(customerId) => {
                setPreselectedCustomerId(customerId);
                setShowOrderModal(true);
              }}
              onEditCustomer={handleEditCustomer}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {activeTab === "tenants" && (
            <TenantsTab
              tenants={tenants}
              onOpenTenantModal={() => setShowTenantModal(true)}
              onSelectTenant={handleSelectTenant}
              currentTenantId={tenantId}
            />
          )}

          {activeTab === "users" && (
            <UsersTab
              users={users}
              tenants={tenants}
              onOpenUserModal={() => setShowUserModal(true)}
              onDeleteUser={handleDeleteUser}
              onToggleStatus={handleToggleUserStatus}
              onUpdateSubscription={handleUpdateUserSubscription}
            />
          )}

          {activeTab === "reports" && (
            <ReportsTab
              orders={orders}
              expenses={expenses}
              tenants={tenants}
              currentTenantId={tenantId}
              customers={customers}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <CreateOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        customers={customers}
        initialCustomerId={preselectedCustomerId}
        onSubmit={handleCreateOrder}
      />

      <CreateExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={handleCreateExpense}
      />

      <CreateCustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSubmit={handleCreateCustomer}
      />

      <EditCustomerModal
        isOpen={showEditCustomerModal}
        onClose={() => {
          setShowEditCustomerModal(false);
          setCustomerToEdit(null);
        }}
        customer={customerToEdit}
        onSubmit={handleUpdateCustomer}
      />

      <CreateTenantModal
        isOpen={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        onSubmit={handleCreateTenant}
      />

      <CreateUserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        tenants={tenants}
        onSubmit={handleCreateUser}
      />
    </div>
  );
}
