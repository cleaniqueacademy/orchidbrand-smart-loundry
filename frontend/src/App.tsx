import React, { useState, useEffect, useCallback } from "react";
import { CashflowStats, Order, Customer, Expense, Tenant, TabType } from "./types";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { OrdersTab } from "./components/tabs/OrdersTab";
import { CashflowTab } from "./components/tabs/CashflowTab";
import { CustomersTab } from "./components/tabs/CustomersTab";
import { TenantsTab } from "./components/tabs/TenantsTab";
import { CreateOrderModal } from "./components/modals/CreateOrderModal";
import { CreateExpenseModal } from "./components/modals/CreateExpenseModal";
import { CreateCustomerModal } from "./components/modals/CreateCustomerModal";
import { CreateTenantModal } from "./components/modals/CreateTenantModal";

const API_BASE = "/api";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [tenantId] = useState("tenant-01");
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
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

  // Modal states
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string>("");

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Health check
      const healthRes = await fetch(`${API_BASE}/health`).catch(() => null);
      setApiConnected(healthRes ? healthRes.ok : false);

      // 2. Stats
      const statsRes = await fetch(`${API_BASE}/stats/cashflow?tenantId=${tenantId}`);
      if (statsRes.ok) {
        const json = await statsRes.json();
        if (json.success) setStats(json.data);
      }

      // 3. Orders
      const ordersRes = await fetch(`${API_BASE}/orders?tenantId=${tenantId}`);
      if (ordersRes.ok) {
        const json = await ordersRes.json();
        if (json.success) setOrders(json.data);
      }

      // 4. Customers
      const custRes = await fetch(`${API_BASE}/customers?tenantId=${tenantId}`);
      if (custRes.ok) {
        const json = await custRes.json();
        if (json.success) setCustomers(json.data);
      }

      // 5. Expenses
      const expRes = await fetch(`${API_BASE}/expenses?tenantId=${tenantId}`);
      if (expRes.ok) {
        const json = await expRes.json();
        if (json.success) setExpenses(json.data);
      }

      // 6. Tenants (Superadmin view)
      const tenantsRes = await fetch(`${API_BASE}/tenants`);
      if (tenantsRes.ok) {
        const json = await tenantsRes.json();
        if (json.success) setTenants(json.data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Clean Modern Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeOrdersCount={stats.activeOrdersCount}
        readyOrdersCount={stats.readyOrdersCount}
        tenantId={tenantId}
        apiConnected={apiConnected}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area with Header */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">
        <Header
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onRefresh={fetchData}
          loading={loading}
          onOpenOrderModal={() => {
            setPreselectedCustomerId("");
            setShowOrderModal(true);
          }}
          onOpenExpenseModal={() => setShowExpenseModal(true)}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
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
            />
          )}

          {activeTab === "tenants" && (
            <TenantsTab
              tenants={tenants}
              onOpenTenantModal={() => setShowTenantModal(true)}
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

      <CreateTenantModal
        isOpen={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        onSubmit={handleCreateTenant}
      />
    </div>
  );
}
