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
  createdAt: string;
  estimatedCompletionAt?: string | null;
  completedAt?: string | null;
  customer?: { id: string; name: string; phone: string } | null;
  waSent?: boolean;
  waLogsCount?: number;
  latestWaLog?: WhatsAppLog | null;
}

export interface WhatsAppLog {
  id: string;
  tenantId: string;
  orderId?: string | null;
  recipientPhone: string;
  recipientName?: string | null;
  messagePreview?: string | null;
  status: "sent" | "failed" | "queued";
  mode: "baileys" | "manual";
  errorMessage?: string | null;
  createdAt: string;
}

export interface CashierShift {
  id: string;
  tenantId: string;
  userId: string;
  cashierName?: string;
  cashierEmail?: string;
  openedAt: string;
  closedAt?: string | null;
  startingCash: number;
  systemCashTotal: number;
  actualCashTotal?: number | null;
  discrepancy?: number | null;
  status: "open" | "closed";
  notes?: string | null;
  createdAt: string;
  expectedCash?: number;
  ordersCount?: number;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  unit: string;
  pricePerUnit: number;
  minOrder?: number;
  durationHours?: number;
  status: "active" | "inactive";
  createdAt?: string;
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
  city?: string | null;
  status: "active" | "inactive";
  subscriptionUntil?: string | null;
  services?: LaundryService[];
  enableCashierShift?: string | boolean;
  owner?: { id: string; name: string; email: string; role: string } | null;
  totalOrders: number;
  totalOmset: number;
  // Informasi rekening bank & pembayaran
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  qrisInfo?: string | null;
  openingHours?: string | null; // JSON: { weekdays, saturday, sunday }
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

export type TabType = "overview" | "orders" | "cashflow" | "customers" | "services" | "reports" | "tenants" | "users" | "settings" | "create-order" | "edit-order" | "logs";
