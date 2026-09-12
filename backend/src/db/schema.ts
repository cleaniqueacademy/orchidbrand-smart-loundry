import { pgTable, text, doublePrecision } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("tenant_owner"), // 'superadmin' | 'tenant_owner' | 'staff'
  status: text("status").notNull().default("active"), // 'active' | 'inactive'
  subscriptionUntil: text("subscription_until"), // ISO Date string e.g. '2026-12-31'
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  outletName: text("outlet_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'inactive'
  subscriptionUntil: text("subscription_until"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  invoiceNo: text("invoice_no").notNull().unique(),
  serviceType: text("service_type").notNull(), // 'Cuci Komplit (Kg)', 'Cuci Kering (Kg)', etc.
  weightOrQty: doublePrecision("weight_or_qty").notNull(),
  unit: text("unit").notNull().default("kg"), // 'kg' | 'pcs'
  pricePerUnit: doublePrecision("price_per_unit").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'washing' | 'drying_ironing' | 'ready' | 'completed'
  paymentStatus: text("payment_status").notNull().default("unpaid"), // 'unpaid' | 'paid'
  paymentMethod: text("payment_method").default("cash"), // 'cash' | 'transfer' | 'qris'
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
});

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  category: text("category").notNull(), // 'Deterjen & Pewangi', 'Listrik & Air', etc.
  amount: doublePrecision("amount").notNull(),
  notes: text("notes").notNull(),
  expenseDate: text("expense_date").notNull().$defaultFn(() => new Date().toISOString().slice(0, 10)),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
