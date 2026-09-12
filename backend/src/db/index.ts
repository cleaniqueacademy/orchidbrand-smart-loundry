import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgrespassword@localhost:5433/orchid_laundry";

export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

// Auto-initialize PostgreSQL tables if not existing
export async function initPostgresTables() {
  try {
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'tenant_owner',
        status TEXT NOT NULL DEFAULT 'active',
        subscription_until TEXT,
        created_at TEXT NOT NULL
      );
    `;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_until TEXT;`;

    await client`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        outlet_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        subscription_until TEXT,
        created_at TEXT NOT NULL
      );
    `;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_until TEXT;`;

    await client`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        customer_id TEXT NOT NULL REFERENCES customers(id),
        invoice_no TEXT NOT NULL UNIQUE,
        service_type TEXT NOT NULL,
        weight_or_qty DOUBLE PRECISION NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        price_per_unit DOUBLE PRECISION NOT NULL,
        total_amount DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        payment_method TEXT DEFAULT 'cash',
        notes TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        category TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        notes TEXT NOT NULL,
        expense_date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `;

    console.log("✅ PostgreSQL tables verified/initialized successfully");
  } catch (err: any) {
    console.warn("⚠️ PostgreSQL init notice:", err.message);
  }
}
