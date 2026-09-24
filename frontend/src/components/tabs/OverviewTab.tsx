import React from "react";
import { CashflowStats, Order, TabType, Tenant, User, Role, CashierShift } from "../../types";
import { AdminOverviewTab } from "./overview/AdminOverviewTab";
import { TenantOverviewTab } from "./overview/TenantOverviewTab";
import { StaffOverviewTab } from "./overview/StaffOverviewTab";
import { WAStatusData } from "../../hooks/useWhatsAppGateway";

interface OverviewTabProps {
  stats: CashflowStats;
  orders: Order[];
  tenants: Tenant[];
  users?: User[];
  tenantId: string;
  currentUserRole: Role;
  currentUser?: User | null;
  currentShift?: CashierShift | null;
  enableCashierShift?: boolean;
  onOpenShiftModal?: () => void;
  onCloseShiftModal?: () => void;
  onSelectTenant: (id: string) => void;
  onOpenTenantModal: () => void;
  onOpenUserModal: () => void;
  onOpenOrderModal: () => void;
  onOpenExpenseModal: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  getWaLink: (order: Order) => string;
  setActiveTab: (tab: TabType) => void;
  waData?: WAStatusData;
  onSendDirectWa?: (order: Order) => Promise<{ success: boolean; error?: string }>;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  orders,
  tenants,
  users = [],
  tenantId,
  currentUserRole,
  currentUser,
  currentShift,
  enableCashierShift = true,
  onOpenShiftModal,
  onCloseShiftModal,
  onSelectTenant,
  onOpenTenantModal,
  onOpenUserModal,
  onOpenOrderModal,
  onOpenExpenseModal,
  onUpdateStatus,
  getWaLink,
  setActiveTab,
  waData,
  onSendDirectWa,
}) => {
  // 1. Super Admin: Laundry Cleanique HQ Dashboard
  if (currentUserRole === "superadmin") {
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

  // 2. Staff: Meja Kerja Kasir & Antrean Operasional Cuci
  if (currentUserRole === "staff") {
    const activeTenant =
      tenants.find((t) => t.id === tenantId) ||
      tenants[0];

    return (
      <StaffOverviewTab
        orders={orders}
        tenant={activeTenant}
        currentUser={currentUser}
        currentShift={currentShift}
        enableCashierShift={enableCashierShift}
        onOpenShiftModal={onOpenShiftModal}
        onCloseShiftModal={onCloseShiftModal}
        onOpenOrderModal={onOpenOrderModal}
        onUpdateStatus={onUpdateStatus}
        getWaLink={getWaLink}
        setActiveTab={setActiveTab}
        onSendDirectWa={onSendDirectWa}
        isWaConnected={waData?.status === "connected"}
      />
    );
  }

  // 3. Tenant Owner: Dashboard Bisnis, Keuangan, & Pengawasan Kas Laci Cabang
  return (
    <TenantOverviewTab
      stats={stats}
      orders={orders}
      tenants={tenants}
      tenantId={tenantId}
      currentUserRole={currentUserRole}
      currentUser={currentUser}
      currentShift={currentShift}
      enableCashierShift={enableCashierShift}
      onOpenShiftModal={onOpenShiftModal}
      onCloseShiftModal={onCloseShiftModal}
      onOpenOrderModal={onOpenOrderModal}
      onOpenExpenseModal={onOpenExpenseModal}
      onUpdateStatus={onUpdateStatus}
      getWaLink={getWaLink}
      setActiveTab={setActiveTab}
      waData={waData}
      onSendDirectWa={onSendDirectWa}
    />
  );
};
