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
import { LoginPage } from "./components/auth/LoginPage";
import { AppModals } from "./components/modals/AppModals";
import { WhatsAppSettingsModal } from "./components/modals/WhatsAppSettingsModal";
import { InactiveAccountModal } from "./components/modals/InactiveAccountModal";
import { useAuthSession } from "./hooks/useAuthSession";
import { useLaundryData } from "./hooks/useLaundryData";
import { useWhatsAppGateway } from "./hooks/useWhatsAppGateway";
import { getWaLink } from "./utils/waLink";
import { checkUserActiveStatus } from "./utils/subscriptionUtils";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  // Jika bukan Super Admin dan mencoba membuka tab khusus admin, kembalikan ke overview
  useEffect(() => {
    if (currentUserRole !== "superadmin" && (activeTab === "tenants" || activeTab === "users")) {
      setActiveTab("overview");
    }
  }, [currentUserRole, activeTab]);

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
          waData={waGateway.waData}
          onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
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
                  onSelectTenant={(id) => handleSelectTenant(id, tenants)}
                  onOpenTenantModal={() => setShowTenantModal(true)}
                  onOpenUserModal={() => setShowUserModal(true)}
                  onOpenOrderModal={() => handleOpenCreateOrder()}
                  onOpenExpenseModal={() => handleOpenExpenseModal("expense")}
                  onUpdateStatus={handleUpdateStatus}
                  getWaLink={getOrderWaLink}
                  setActiveTab={setActiveTab}
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
                  currentUserRole={currentUserRole}
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

              {activeTab === "reports" && (
                <ReportsTab
                  orders={orders}
                  expenses={expenses}
                  tenants={tenants}
                  currentTenantId={tenantId}
                  customers={customers}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === "settings" && (
                <SettingsTab
                  tenant={tenants.find((t) => t.id === tenantId) || tenants[0]}
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
      />
    </div>
  );
}
