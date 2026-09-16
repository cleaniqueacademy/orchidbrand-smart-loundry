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
  // If user is Super Admin in Central HQ Mode ("all"), show the SaaS Master Platform Dashboard
  if (currentUserRole === "superadmin" && tenantId === "all") {
    return (
      <AdminOverviewTab
        stats={stats}
        orders={orders}
        tenants={tenants}
        users={users}
        onSelectTenant={onSelectTenant}
        onOpenTenantModal={onOpenTenantModal}
        onOpenUserModal={onOpenUserModal}
        setActiveTab={setActiveTab}
      />
    );
  }

  // Otherwise, show the Branch Operational POS Dashboard (with inspection mode if superadmin inspecting a branch)
  return (
    <TenantOverviewTab
      stats={stats}
      orders={orders}
      tenants={tenants}
      tenantId={tenantId}
      currentUserRole={currentUserRole}
      onBackToHq={() => onSelectTenant("all")}
      onOpenOrderModal={onOpenOrderModal}
      onOpenExpenseModal={onOpenExpenseModal}
      onUpdateStatus={onUpdateStatus}
      getWaLink={getWaLink}
      setActiveTab={setActiveTab}
    />
  );
};
