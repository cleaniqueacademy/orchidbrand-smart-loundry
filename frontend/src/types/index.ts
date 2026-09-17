export interface CashflowStats {
  totalIncome: number;
  pendingPaymentAmount: number;
  totalExpense: number;
  netProfit: number;
  totalOrdersCount: number;
  activeOrdersCount: number;
  readyOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount?: number;
}

export type OrderStatus =
  | "process"
  | "ready"
  | "completed"
  | "cancelled"
  | "pending"
  | "washing"
  | "drying_ironing";
export type PaymentStatus = "paid" | "unpaid";

export interface OrderItem {
  id: string;
  serviceType: string;
  weightOrQty: number;
  unit: string;
  pricePerUnit: number;
  subtotal: number;
  notes?: string;
}

export interface Order {
  id: string;
  tenantId: string;
  customerId?: string;
  invoiceNo: string;
  serviceType: string;
  weightOrQty: number;
  unit: string;
  pricePerUnit: number;
  totalAmount: number;
  items?: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  notes?: string;
  rackNumber?: string | null;
  createdAt: string;
  completedAt?: string | null;
  customer?: { id: string; name: string; phone: string } | null;
}

export interface Customer {
  id: string;
  tenantId?: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt?: string;
}

export interface Expense {
  id: string;
  tenantId?: string;
  type?: "income" | "expense";
  category: string;
  amount: number;
  notes: string;
  expenseDate: string;
  createdAt?: string;
}

export interface LaundryService {
  id: string;
  name: string;
  unit: string;
  price: number;
}

export interface Tenant {
  id: string;
  userId?: string;
  outletName: string;
  phone: string;
  address: string;
  status: "active" | "inactive";
  subscriptionUntil?: string | null;
  services?: LaundryService[];
  owner?: { id: string; name: string; email: string; role: string } | null;
  totalOrders: number;
  totalOmset: number;
}

export type Role = "superadmin" | "tenant_owner" | "staff";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "inactive";
  subscriptionUntil?: string | null;
  createdAt: string;
  tenantId?: string | null;
  tenantName?: string | null;
}

export type DateFilterPreset = "all" | "today" | "this_week" | "this_month" | "this_year";

export type TabType = "overview" | "orders" | "cashflow" | "customers" | "reports" | "tenants" | "users" | "settings" | "create-order" | "edit-order";
