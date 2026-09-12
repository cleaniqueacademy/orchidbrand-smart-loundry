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
    setCurrentUser(user);
    setCurrentUserRole(user.role);
    if (user.role === "tenant_owner" && user.tenantId) {
      setTenantId(user.tenantId);
    } else if (user.role === "superadmin") {
      setTenantId("all");
    }
    setActiveTab("overview");
  };

  const handleLogout = () => {
    // Clear localStorage
    try {
      localStorage.removeItem("orchid_auth_user");
      localStorage.removeItem("orchid_auth_tenant");
      // Tambahan: clear semua key orchid
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("orchid_")) localStorage.removeItem(key);
      });
    } catch (e) {
      console.error(e);
    }
    // Hard reload agar semua state React bersih total
    window.location.replace("/");
  };

  // Order status update
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
        if (data.waData?.waUrl && (newStatus === "ready" || newStatus === "completed")) {
          window.open(data.waData.waUrl, "_blank");
        }
      }
    } catch (err) {
      console.error("Update status error:", err);
    }
  };

  // Payment update
  const handleUpdatePayment = async (
    orderId: string,
    paymentStatus: string,
    paymentMethod = "cash"
  ) => {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus, paymentMethod }),
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (err) {
      console.error("Update payment error:", err);
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
    } else {
      alert("Gagal membuat order: " + (data.message || "Unknown error"));
    }
  };

  // Create Expense
  const handleCreateExpense = async (expenseData: {
    category: string;
    amount: number;
    notes: string;
    expenseDate: string;
  }) => {
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
    } else {
      alert("Gagal mencatat biaya: " + (data.message || "Unknown error"));
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Hapus catatan pengeluaran ini?")) return;
    try {
      const res = await fetch(`${API_BASE}/expenses/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Delete expense error:", err);
    }
  };

  // Create Customer
  const handleCreateCustomer = async (custData: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  }) => {
    const res = await fetch(`${API_BASE}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, ...custData }),
    });
    const data = await res.json();
    if (data.success) {
      fetchData();
    } else {
      alert("Gagal menambah customer: " + (data.message || "Unknown error"));
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
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData),
    });
    const data = await res.json();
    if (data.success) {
      fetchData();
    } else {
      alert("Gagal memperbarui pelanggan: " + (data.message || "Terjadi kesalahan"));
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/customers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert("Gagal menghapus pelanggan: " + (data.message || "Terjadi kesalahan"));
      }
    } catch (err: any) {
      console.error("Delete customer error:", err);
    }
  };

  // Toggle User Status (Aktif / Nonaktif)
  const handleToggleUserStatus = async (userId: string, currentStatus: "active" | "inactive") => {
    const nextStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Toggle status error:", err);
    }
  };

  // Update User Subscription Date (Offline Model)
  const handleUpdateUserSubscription = async (userId: string, subscriptionUntil: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionUntil }),
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Update subscription error:", err);
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
    const res = await fetch(`${API_BASE}/tenants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tenantData),
    });
    const data = await res.json();
    if (data.success) {
      fetchData();
    } else {
      alert("Gagal membuat tenant: " + (data.message || "Unknown error"));
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
    const res = await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (data.success) {
      fetchData();
    } else {
      alert("Gagal menambah pengguna: " + (data.message || "Unknown error"));
    }
  };

  // Delete User (Super Admin)
  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Delete user error:", err);
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
        onSelectTenant={(id) => setTenantId(id)}
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
              onSelectTenant={(id) => setTenantId(id)}
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
