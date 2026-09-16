import React, { useState } from "react";
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
import { LoginPage } from "./components/auth/LoginPage";
import { AppModals } from "./components/modals/AppModals";
import { useAuthSession } from "./hooks/useAuthSession";
import { useLaundryData } from "./hooks/useLaundryData";
import { getWaLink } from "./utils/waLink";

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
  } = useAuthSession();

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
    handleCreateTenant,
    handleCreateUser,
    handleDeleteUser,
  } = useLaundryData({ tenantId, currentUser });

  // Modal UI States
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
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

  const handleOpenEditOrder = (order: Order) => {
    setSelectedOrderToEdit(order);
    setShowEditOrderModal(true);
  };

  const handleEditCustomer = (cust: Customer) => {
    setCustomerToEdit(cust);
    setShowEditCustomerModal(true);
  };

  const getOrderWaLink = (order: Order) => getWaLink(order, tenants);

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
              tenants={tenants}
              users={users}
              tenantId={tenantId}
              currentUserRole={currentUserRole}
              onSelectTenant={(id) => handleSelectTenant(id, tenants)}
              onOpenTenantModal={() => setShowTenantModal(true)}
              onOpenUserModal={() => setShowUserModal(true)}
              onOpenOrderModal={() => {
                setPreselectedCustomerId("");
                setShowOrderModal(true);
              }}
              onOpenExpenseModal={() => setShowExpenseModal(true)}
              onUpdateStatus={handleUpdateStatus}
              getWaLink={getOrderWaLink}
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
              getWaLink={getOrderWaLink}
              onOpenReceiptModal={handleOpenReceipt}
              onOpenEditOrderModal={handleOpenEditOrder}
              onCancelOrder={handleCancelOrder}
              onDeleteOrder={handleDeleteOrder}
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
              onSelectTenant={(id) => handleSelectTenant(id, tenants)}
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
        tenantId={tenantId}
        onCreateOrder={handleCreateOrder}
        onUpdateOrder={handleUpdateOrder}
        onCreateExpense={handleCreateExpense}
        onCreateCustomer={handleCreateCustomer}
        onUpdateCustomer={handleUpdateCustomer}
        onCreateTenant={handleCreateTenant}
        onCreateUser={handleCreateUser}
      />
    </div>
  );
}
