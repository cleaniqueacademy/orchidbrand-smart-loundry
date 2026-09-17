import React from "react";
import { CashflowStats, Order, TabType, Tenant, User, Role } from "../../types";
import { AdminOverviewTab } from "./overview/AdminOverviewTab";
import { TenantOverviewTab } from "./overview/TenantOverviewTab";

interface OverviewTabProps {
  stats: CashflowStats;
  orders: Order[];
  tenants: Tenant[];
  users?: User[];
  tenantId: string;
  currentUserRole: Role;
  onSelectTenant: (id: string) => void;
  onOpenTenantModal: () => void;
  onOpenUserModal: () => void;
  onOpenOrderModal: () => void;
  onOpenExpenseModal: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  getWaLink: (order: Order) => string;
  setActiveTab: (tab: TabType) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  orders,
  tenants,
  users = [],
  tenantId,
  currentUserRole,
  onSelectTenant,
  onOpenTenantModal,
  onOpenUserModal,
  onOpenOrderModal,
  onOpenExpenseModal,
  onUpdateStatus,
  getWaLink,
  setActiveTab,
}) => {
  // If user is Super Admin, always show the Master Platform Dashboard
  if (currentUserRole === "superadmin") {
    return (
      <AdminOverviewTab
        stats={stats}
        orders={orders}
        tenants={tenants}
        users={users}
        onOpenTenantModal={onOpenTenantModal}
        onOpenUserModal={onOpenUserModal}
        setActiveTab={setActiveTab}
      />
    );
  }

  // Otherwise, show the Branch Operational POS Dashboard for Tenant Owner & Staff
  return (
    <TenantOverviewTab
      stats={stats}
      orders={orders}
      tenants={tenants}
      tenantId={tenantId}
      currentUserRole={currentUserRole}
      onOpenOrderModal={onOpenOrderModal}
      onOpenExpenseModal={onOpenExpenseModal}
      onUpdateStatus={onUpdateStatus}
      getWaLink={getWaLink}
      setActiveTab={setActiveTab}
    />
  );
};
