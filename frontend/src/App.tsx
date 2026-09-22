import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Order, Customer, TabType } from "./types";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { OrdersTab } from "./components/tabs/OrdersTab";
import { CashflowTab } from "./components/tabs/CashflowTab";
import { CustomersTab } from "./components/tabs/CustomersTab";
import { TenantsTab } from "./components/tabs/TenantsTab";
import { UsersTab } from "./components/tabs/UsersTab";
import { ReportsTab } from "./components/tabs/ReportsTab";
import { SettingsTab } from "./components/tabs/SettingsTab";
import { OrderFormTab } from "./components/tabs/OrderFormTab";
import { ServicesTab } from "./components/tabs/ServicesTab";
import { SystemLogsTab } from "./components/tabs/SystemLogsTab";
import { PublicTrackingPage } from "./components/tracking/PublicTrackingPage";
import { LoginPage } from "./components/auth/LoginPage";
import { AppModals } from "./components/modals/AppModals";
import { WhatsAppSettingsModal } from "./components/modals/WhatsAppSettingsModal";
import { InactiveAccountModal } from "./components/modals/InactiveAccountModal";
import { OpenShiftModal } from "./components/modals/OpenShiftModal";
import { CloseShiftModal } from "./components/modals/CloseShiftModal";
import { WhatsAppLogsModal } from "./components/modals/WhatsAppLogsModal";
import { useAuthSession } from "./hooks/useAuthSession";
import { useLaundryData } from "./hooks/useLaundryData";
import { useWhatsAppGateway } from "./hooks/useWhatsAppGateway";
import { useCashierShift } from "./hooks/useCashierShift";
import { getWaLink, getWaMessageText } from "./utils/waLink";
import { checkUserActiveStatus } from "./utils/subscriptionUtils";
import { useToast } from "./components/common/ToastContext";

export default function App() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Public Tracking Page State (URL /track/:invoiceNo or ?track=... or ?invoice=...)
  const [trackingInvoice, setTrackingInvoice] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const match = window.location.pathname.match(/\/track\/([^/?#]+)/);
    if (match && match[1]) return decodeURIComponent(match[1]);
    const params = new URLSearchParams(window.location.search);
    return params.get("track") || params.get("invoice") || null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/track\/([^/?#]+)/);
      if (match && match[1]) {
        setTrackingInvoice(decodeURIComponent(match[1]));
      } else {
        const params = new URLSearchParams(window.location.search);
        const inv = params.get("track") || params.get("invoice");
        setTrackingInvoice(inv ? decodeURIComponent(inv) : null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Desktop Draggable Sidebar States
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("orchid_sidebar_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 68 && parsed <= 420) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return 256;
  });
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);

  const isSidebarCollapsed = isDesktop && sidebarWidth <= 110;
  const effectiveSidebarWidth = isSidebarCollapsed ? 68 : sidebarWidth;

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Authentication & Tenant Session Composable
  const {
    currentUser,
    currentUserRole,
    setCurrentUserRole,
    tenantId,
    setTenantId,
    handleLoginSuccess,
    handleLogout,
    handleSelectTenant,
    refreshUserSession,
  } = useAuthSession();

  // Route Guard berdasarkan 3 Role:
  // 1. Super Admin: Platform SaaS & Troubleshooting Hub (overview, tenants, users, orders, logs, reports)
  // 2. Staff: Khusus Operasional Kasir (orders, customers, create-order, edit-order)
  // 3. Tenant Owner: Seluruh Operasional Toko miliknya (overview, orders, services, cashflow, customers, reports, settings)
  useEffect(() => {
    if (currentUserRole === "superadmin") {
      const allowedAdminTabs: TabType[] = ["overview", "tenants", "users", "orders", "logs", "reports"];
      if (!allowedAdminTabs.includes(activeTab)) {
        setActiveTab("overview");
      }
    } else if (currentUserRole === "staff") {
      const allowedStaffTabs: TabType[] = ["overview", "orders", "customers", "create-order", "edit-order"];
      if (!allowedStaffTabs.includes(activeTab)) {
        setActiveTab("overview");
      }
    } else {
      // Tenant Owner tidak boleh membuka tab khusus Super Admin
      if (activeTab === "tenants" || activeTab === "users" || activeTab === "logs") {
        setActiveTab("overview");
      }
    }
  }, [currentUserRole, activeTab]);

  // Cashier Shift Composable & Modals
  const cashierShift = useCashierShift(tenantId, currentUser?.id || null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [selectedOrderForWaLogs, setSelectedOrderForWaLogs] = useState<Order | null>(null);

  // Laundry Data & Operations Composable
  const {
    loading,
    stats,
    orders,
    customers,
    expenses,
    tenants,
    users,
    fetchData,
    handleUpdateStatus,
    handleUpdatePayment,
    handleCreateOrder,
    handleUpdateOrder,
    handleCancelOrder,
    handleDeleteOrder,
    handleCreateExpense,
    handleDeleteExpense,
    handleCreateCustomer,
    handleUpdateCustomer,
    handleDeleteCustomer,
    handleToggleUserStatus,
    handleUpdateUserSubscription,
    handleExtendUserSubscription,
    handleCreateTenant,
    handleUpdateTenant,
    handleCreateUser,
    handleDeleteUser,
    handleUpdateUser,
    handleResetPassword,
  } = useLaundryData({ tenantId, currentUser });

  // WhatsApp Gateway Composable (always target a valid tenant ID)
  const effectiveTenantId = tenantId === "all" ? (tenants[0]?.id || "tenant-01") : tenantId;
  const currentActiveTenant = tenants.find((t) => t.id === effectiveTenantId) || tenants[0];
  const isShiftEnabled =
    currentActiveTenant?.enableCashierShift !== "false" &&
    currentActiveTenant?.enableCashierShift !== false;
  const waGateway = useWhatsAppGateway(effectiveTenantId);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Modal UI States
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseModalType, setExpenseModalType] = useState<"income" | "expense">("expense");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string>("");

  const handleOpenReceipt = (order: Order) => {
    setSelectedReceiptOrder(order);
    setShowReceiptModal(true);
  };

  const handleOpenCreateOrder = (customerId?: string) => {
    setPreselectedCustomerId(customerId || "");
    setActiveTab("create-order");
  };

  const handleOpenExpenseModal = (defaultType: "income" | "expense" = "expense") => {
    setExpenseModalType(defaultType);
    setShowExpenseModal(true);
  };

  const handleOpenEditOrder = (order: Order) => {
    setSelectedOrderToEdit(order);
    setActiveTab("edit-order");
  };

  const handleEditCustomer = (cust: Customer) => {
    setCustomerToEdit(cust);
    setShowEditCustomerModal(true);
  };

  const getOrderWaLink = (order: Order) => getWaLink(order, tenants);

  const handleSendDirectWa = async (order: Order): Promise<{ success: boolean; error?: string }> => {
    if (!order.customer?.phone) {
      toast.warning("Nomor WA Tidak Ditemukan", "Pelanggan ini tidak memiliki nomor telepon terdaftar.");
      return { success: false, error: "Nomor telepon tidak ditemukan" };
    }

    const { text } = getWaMessageText(order, tenants);
    const targetTenant = tenants.find((t) => t.id === order.tenantId) || tenants[0];

    try {
      const res = await waGateway.sendDirectMessage(order.customer.phone, text, {
        orderId: order.id,
        recipientName: order.customer?.name,
      });

      if (res.success) {
        toast.success(
          "WhatsApp Berhasil Terkirim!",
          `Notifikasi dikirim via WhatsApp resmi ${targetTenant?.outletName || "toko"} ke ${order.customer?.name || "pelanggan"} (${order.customer?.phone}).`
        );
        fetchData();
        return { success: true };
      } else {
        toast.error("Gagal Mengirim via WA Toko", res.error || "Membuka WhatsApp Web manual...");
        const cleanPhone = order.customer.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      toast.error("Kesalahan Pengiriman", err.message || "Beralih ke WhatsApp Web");
      const cleanPhone = order.customer.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
      return { success: false, error: err.message };
    }
  };

  // Public tracking page view (takes priority over login / app shell)
  if (trackingInvoice !== null) {
    return (
      <PublicTrackingPage
        initialInvoiceNo={trackingInvoice}
        onBackToApp={() => {
          if (window.history.pushState) {
            window.history.pushState({}, "", "/");
          }
          setTrackingInvoice(null);
        }}
      />
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const activeStatus = checkUserActiveStatus(currentUser);

  return (
    <div className="min-h-screen bg-zinc-50/50 flex text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">
      {/* Modal / Layer Besar Pemblokiran Saat Akun Tidak Aktif / Habis Masa Aktif */}
      {!activeStatus.isActive && currentUserRole !== "superadmin" && (
        <InactiveAccountModal
          isOpen={true}
          user={currentUser}
          onRefreshStatus={async () => {
            const isNowActive = await refreshUserSession();
            if (isNowActive) {
              fetchData();
            }
            return isNowActive;
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Shadcn Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeOrdersCount={stats.activeOrdersCount}
        readyOrdersCount={stats.readyOrdersCount}
        tenantId={tenantId}
        onSelectTenant={(id) => handleSelectTenant(id, tenants)}
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
        onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
        waData={waGateway.waData}
        onLogout={handleLogout}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        isDragging={isDraggingSidebar}
        setIsDragging={setIsDraggingSidebar}
        isDesktop={isDesktop}
      />

      {/* Main Content Area */}
      <div
        style={{
          paddingLeft: isDesktop ? `${effectiveSidebarWidth}px` : undefined,
        }}
        className={`flex-1 flex flex-col min-w-0 ${
          isDraggingSidebar
            ? "transition-none"
            : "transition-[padding] duration-200 ease-out"
        }`}
      >
        <Header
          activeTab={activeTab}
          currentUserRole={currentUserRole}
          currentUser={currentUser}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onRefresh={() => {
            fetchData();
            cashierShift.fetchActiveShift();
          }}
          onLogout={handleLogout}
          loading={loading}
          waData={waGateway.waData}
          onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
          currentShift={cashierShift.currentShift}
          enableCashierShift={isShiftEnabled}
          onOpenShiftModal={() => setShowOpenShiftModal(true)}
          onCloseShiftModal={() => setShowCloseShiftModal(true)}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === "overview" && (
                <OverviewTab
                  stats={stats}
                  orders={orders}
                  tenants={tenants}
                  users={users}
                  tenantId={tenantId}
                  currentUserRole={currentUserRole}
                  currentUser={currentUser}
                  currentShift={cashierShift.currentShift}
                  enableCashierShift={isShiftEnabled}
                  onOpenShiftModal={() => setShowOpenShiftModal(true)}
                  onCloseShiftModal={() => setShowCloseShiftModal(true)}
                  onSelectTenant={(id) => handleSelectTenant(id, tenants)}
                  onOpenTenantModal={() => setShowTenantModal(true)}
                  onOpenUserModal={() => setShowUserModal(true)}
                  onOpenOrderModal={() => handleOpenCreateOrder()}
                  onOpenExpenseModal={() => handleOpenExpenseModal("expense")}
                  onUpdateStatus={handleUpdateStatus}
                  getWaLink={getOrderWaLink}
                  setActiveTab={setActiveTab}
                  waData={waGateway.waData}
                  onSendDirectWa={handleSendDirectWa}
                />
              )}

              {activeTab === "orders" && (
                <OrdersTab
                  orders={orders}
                  tenants={tenants}
                  currentUserRole={currentUserRole}
                  onOpenOrderModal={() => handleOpenCreateOrder()}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdatePayment={handleUpdatePayment}
                  getWaLink={getOrderWaLink}
                  onOpenReceiptModal={handleOpenReceipt}
                  onOpenEditOrderModal={handleOpenEditOrder}
                  onCancelOrder={handleCancelOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onOpenWaLogsModal={(order) => setSelectedOrderForWaLogs(order)}
                  onSendDirectWa={handleSendDirectWa}
                  isWaConnected={waGateway.waData?.status === "connected"}
                />
              )}

              {activeTab === "services" && (
                <ServicesTab
                  tenantId={tenantId}
                  tenants={tenants}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === "create-order" && (
                <OrderFormTab
                  mode="create"
                  customers={customers}
                  initialCustomerId={preselectedCustomerId}
                  tenantServices={(tenants.find((t) => t.id === tenantId) || tenants[0])?.services}
                  onBack={() => setActiveTab("orders")}
                  onSubmitCreate={handleCreateOrder}
                  onSubmitEdit={handleUpdateOrder}
                />
              )}

              {activeTab === "edit-order" && (
                <OrderFormTab
                  mode="edit"
                  order={selectedOrderToEdit}
                  customers={customers}
                  tenantServices={
                    (tenants.find((t) => t.id === (selectedOrderToEdit?.tenantId || tenantId)) ||
                      tenants[0])?.services
                  }
                  onBack={() => setActiveTab("orders")}
                  onSubmitCreate={handleCreateOrder}
                  onSubmitEdit={handleUpdateOrder}
                />
              )}

              {activeTab === "cashflow" && (
                <CashflowTab
                  stats={stats}
                  expenses={expenses}
                  orders={orders}
                  tenants={tenants}
                  tenantId={tenantId}
                  currentUserRole={currentUserRole}
                  enableCashierShift={isShiftEnabled}
                  onOpenExpenseModal={handleOpenExpenseModal}
                  onDeleteExpense={handleDeleteExpense}
                />
              )}

              {activeTab === "customers" && (
                <CustomersTab
                  customers={customers}
                  orders={orders}
                  tenants={tenants}
                  currentUserRole={currentUserRole}
                  onOpenCustomerModal={() => setShowCustomerModal(true)}
                  onSelectCustomerForOrder={(customerId) => handleOpenCreateOrder(customerId)}
                  onEditCustomer={handleEditCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                />
              )}

              {activeTab === "tenants" && currentUserRole === "superadmin" && (
                <TenantsTab
                  tenants={tenants}
                  users={users}
                  onResetPassword={handleResetPassword}
                  onOpenTenantModal={() => setShowTenantModal(true)}
                  onUpdateTenant={handleUpdateTenant}
                />
              )}

              {activeTab === "users" && currentUserRole === "superadmin" && (
                <UsersTab
                  users={users}
                  tenants={tenants}
                  onOpenUserModal={() => setShowUserModal(true)}
                  onDeleteUser={handleDeleteUser}
                  onToggleStatus={handleToggleUserStatus}
                  onUpdateSubscription={handleUpdateUserSubscription}
                  onExtendSubscription={handleExtendUserSubscription}
                  onResetPassword={handleResetPassword}
                />
              )}

              {activeTab === "logs" && currentUserRole === "superadmin" && (
                <SystemLogsTab
                  tenants={tenants}
                  currentTenantId={tenantId}
                />
              )}

              {activeTab === "reports" && (
                <ReportsTab
                  orders={orders}
                  expenses={expenses}
                  tenants={tenants}
                  currentTenantId={tenantId}
                  customers={customers}
                  currentUserRole={currentUserRole}
                  users={users}
                />
              )}

              {activeTab === "settings" && (
                <SettingsTab
                  tenant={currentActiveTenant}
                  currentUser={currentUser}
                  onUpdateTenant={handleUpdateTenant}
                  onUpdateUser={async (id, data) => {
                    const ok = await handleUpdateUser(id, data);
                    if (ok) {
                      await refreshUserSession();
                    }
                    return ok;
                  }}
                  onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
                  waStatus={waGateway.waData?.status}
                  setActiveTab={setActiveTab}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Unified Modals Container */}
      <AppModals
        showOrderModal={showOrderModal}
        setShowOrderModal={setShowOrderModal}
        showEditOrderModal={showEditOrderModal}
        setShowEditOrderModal={setShowEditOrderModal}
        selectedOrderToEdit={selectedOrderToEdit}
        setSelectedOrderToEdit={setSelectedOrderToEdit}
        showReceiptModal={showReceiptModal}
        setShowReceiptModal={setShowReceiptModal}
        selectedReceiptOrder={selectedReceiptOrder}
        setSelectedReceiptOrder={setSelectedReceiptOrder}
        showExpenseModal={showExpenseModal}
        setShowExpenseModal={setShowExpenseModal}
        expenseModalType={expenseModalType}
        showCustomerModal={showCustomerModal}
        setShowCustomerModal={setShowCustomerModal}
        showEditCustomerModal={showEditCustomerModal}
        setShowEditCustomerModal={setShowEditCustomerModal}
        customerToEdit={customerToEdit}
        setCustomerToEdit={setCustomerToEdit}
        showTenantModal={showTenantModal}
        setShowTenantModal={setShowTenantModal}
        showUserModal={showUserModal}
        setShowUserModal={setShowUserModal}
        preselectedCustomerId={preselectedCustomerId}
        customers={customers}
        tenants={tenants}
        tenantId={effectiveTenantId}
        waData={waGateway.waData}
        onSendBaileys={waGateway.sendDirectMessage}
        onCreateOrder={handleCreateOrder}
        onUpdateOrder={handleUpdateOrder}
        onCreateExpense={handleCreateExpense}
        onCreateCustomer={handleCreateCustomer}
        onUpdateCustomer={handleUpdateCustomer}
        onCreateTenant={handleCreateTenant}
        onCreateUser={handleCreateUser}
      />

      {/* WhatsApp Gateway Settings Modal */}
      <WhatsAppSettingsModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        waData={waGateway.waData}
        loading={waGateway.loading}
        isSendingTest={waGateway.isSendingTest}
        onConnect={waGateway.connectWA}
        onDisconnect={waGateway.disconnectWA}
        onUpdateMode={waGateway.updateMode}
        onSendTest={waGateway.sendTestMessage}
        tenants={tenants}
        currentTenantId={effectiveTenantId}
        onSelectTenant={(id) => handleSelectTenant(id, tenants)}
        currentUserRole={currentUserRole}
        currentUser={currentUser}
      />

      {/* Cashier Shift: Buka Shift Modal */}
      <OpenShiftModal
        isOpen={showOpenShiftModal}
        onClose={() => setShowOpenShiftModal(false)}
        cashierName={currentUser.name || currentUser.email || "Kasir"}
        onConfirmOpen={async (startingCash, notes) => {
          const ok = await cashierShift.openShift(startingCash, notes);
          if (ok) {
            fetchData();
          }
          return ok;
        }}
      />

      {/* Cashier Shift: Tutup Shift & Rekonsiliasi Kas Modal */}
      <CloseShiftModal
        isOpen={showCloseShiftModal}
        onClose={() => setShowCloseShiftModal(false)}
        currentShift={cashierShift.currentShift}
        onConfirmClose={async (actualCashTotal, notes) => {
          const res = await cashierShift.closeShift(actualCashTotal, notes);
          if (res) {
            fetchData();
          }
          return res;
        }}
      />

      {/* WhatsApp Logs Audit Modal */}
      <WhatsAppLogsModal
        isOpen={!!selectedOrderForWaLogs}
        onClose={() => setSelectedOrderForWaLogs(null)}
        orderId={selectedOrderForWaLogs?.id}
        invoiceNo={selectedOrderForWaLogs?.invoiceNo}
        tenantId={selectedOrderForWaLogs?.tenantId || effectiveTenantId}
      />
    </div>
  );
}
