import React from "react";
import { Order, Customer, Tenant, Role } from "../../types";
import { CreateOrderModal } from "./CreateOrderModal";
import { CreateExpenseModal } from "./CreateExpenseModal";
import { CreateCustomerModal } from "./CreateCustomerModal";
import { EditCustomerModal } from "./EditCustomerModal";
import { CreateTenantModal } from "./CreateTenantModal";
import { CreateUserModal } from "./CreateUserModal";
import { ReceiptModal } from "./ReceiptModal";
import { EditOrderModal } from "./EditOrderModal";
import { WAStatusData } from "../../hooks/useWhatsAppGateway";

interface AppModalsProps {
  // Modal visibility states
  showOrderModal: boolean;
  setShowOrderModal: (show: boolean) => void;
  showEditOrderModal: boolean;
  setShowEditOrderModal: (show: boolean) => void;
  selectedOrderToEdit: Order | null;
  setSelectedOrderToEdit: (order: Order | null) => void;
  showReceiptModal: boolean;
  setShowReceiptModal: (show: boolean) => void;
  selectedReceiptOrder: Order | null;
  setSelectedReceiptOrder: (order: Order | null) => void;
  showExpenseModal: boolean;
  setShowExpenseModal: (show: boolean) => void;
  expenseModalType?: "income" | "expense";
  showCustomerModal: boolean;
  setShowCustomerModal: (show: boolean) => void;
  showEditCustomerModal: boolean;
  setShowEditCustomerModal: (show: boolean) => void;
  customerToEdit: Customer | null;
  setCustomerToEdit: (customer: Customer | null) => void;
  showTenantModal: boolean;
  setShowTenantModal: (show: boolean) => void;
  showUserModal: boolean;
  setShowUserModal: (show: boolean) => void;
  preselectedCustomerId: string;

  // Data lists
  customers: Customer[];
  tenants: Tenant[];
  tenantId: string;

  // WhatsApp integration
  waData?: WAStatusData;
  onSendBaileys?: (phone: string, text: string) => Promise<{ success: boolean; error?: string }>;

  // Submission handlers
  onCreateOrder: (data: any) => Promise<void>;
  onUpdateOrder: (orderId: string, data: any) => Promise<void>;
  onCreateExpense: (data: any) => Promise<void>;
  onCreateCustomer: (data: any) => Promise<void>;
  onUpdateCustomer: (id: string, data: any) => Promise<void>;
  onCreateTenant: (data: any) => Promise<void>;
  onCreateUser: (data: any) => Promise<void>;
}

export const AppModals: React.FC<AppModalsProps> = ({
  showOrderModal,
  setShowOrderModal,
  showEditOrderModal,
  setShowEditOrderModal,
  selectedOrderToEdit,
  setSelectedOrderToEdit,
  showReceiptModal,
  setShowReceiptModal,
  selectedReceiptOrder,
  setSelectedReceiptOrder,
  showExpenseModal,
  setShowExpenseModal,
  expenseModalType = "expense",
  showCustomerModal,
  setShowCustomerModal,
  showEditCustomerModal,
  setShowEditCustomerModal,
  customerToEdit,
  setCustomerToEdit,
  showTenantModal,
  setShowTenantModal,
  showUserModal,
  setShowUserModal,
  preselectedCustomerId,
  customers,
  tenants,
  tenantId,
  waData,
  onSendBaileys,
  onCreateOrder,
  onUpdateOrder,
  onCreateExpense,
  onCreateCustomer,
  onUpdateCustomer,
  onCreateTenant,
  onCreateUser,
}) => {
  const currentTenant = tenants.find((t) => t.id === tenantId) || tenants[0];

  return (
    <>
      <CreateOrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        customers={customers}
        initialCustomerId={preselectedCustomerId}
        onSubmit={onCreateOrder}
      />

      <CreateExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        defaultType={expenseModalType}
        onSubmit={onCreateExpense}
      />

      <CreateCustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSubmit={onCreateCustomer}
      />

      <EditCustomerModal
        isOpen={showEditCustomerModal}
        onClose={() => {
          setShowEditCustomerModal(false);
          setCustomerToEdit(null);
        }}
        customer={customerToEdit}
        onSubmit={onUpdateCustomer}
      />

      <CreateTenantModal
        isOpen={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        onSubmit={onCreateTenant}
      />

      <CreateUserModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        tenants={tenants}
        onSubmit={onCreateUser}
      />

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedReceiptOrder(null);
        }}
        order={selectedReceiptOrder}
        tenant={currentTenant}
        waData={waData}
        onSendBaileys={onSendBaileys}
      />

      <EditOrderModal
        isOpen={showEditOrderModal}
        onClose={() => {
          setShowEditOrderModal(false);
          setSelectedOrderToEdit(null);
        }}
        order={selectedOrderToEdit}
        customers={customers}
        onSubmit={onUpdateOrder}
      />
    </>
  );
};
