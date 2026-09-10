import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { db, initPostgresTables } from "./db/index";
import { users, tenants, customers, orders, expenses } from "./db/schema";
import { eq, desc } from "drizzle-orm";
import { seedInitialData } from "./db/seed";

const app = new Hono();

// Middlewares
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Auto-initialize PostgreSQL tables and seed data on startup
initPostgresTables()
  .then(() => seedInitialData())
  .catch(console.error);

// 1. Health check
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    runtime: "Bun",
    framework: "Hono",
    database: "PostgreSQL",
    timestamp: new Date().toISOString(),
    message: "Orchid Brand Smart Laundry API is running smoothly on PostgreSQL!",
  });
});

// 2. Tenants & Users (Superadmin view)
app.get("/api/tenants", async (c) => {
  try {
    const allTenants = await db.select().from(tenants);
    const allUsers = await db.select().from(users);
    const allOrders = await db.select().from(orders);

    const enriched = allTenants.map((tenant) => {
      const owner = allUsers.find((u) => u.id === tenant.userId);
      const tenantOrders = allOrders.filter((o) => o.tenantId === tenant.id);
      const totalOmset = tenantOrders
        .filter((o) => o.paymentStatus === "paid")
        .reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        ...tenant,
        owner: owner
          ? { id: owner.id, name: owner.name, email: owner.email, role: owner.role }
          : null,
        totalOrders: tenantOrders.length,
        totalOmset,
      };
    });

    return c.json({ success: true, data: enriched });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/tenants", async (c) => {
  try {
    const body = await c.req.json();
    const { ownerName, ownerEmail, password, outletName, phone, address } = body;

    const newUserId = `user-${Date.now()}`;
    await db.insert(users).values({
      id: newUserId,
      name: ownerName,
      email: ownerEmail,
      passwordHash: password || "123456",
      role: "tenant_owner",
    });

    const newTenantId = `tenant-${Date.now()}`;
    await db.insert(tenants).values({
      id: newTenantId,
      userId: newUserId,
      outletName,
      phone,
      address,
    });

    return c.json({
      success: true,
      message: "Tenant dan User Owner berhasil dibuat",
      data: { tenantId: newTenantId, userId: newUserId },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 3. Customers
app.get("/api/customers", async (c) => {
  try {
    const tenantId = c.req.query("tenantId") || "tenant-01";
    const custList = await db
      .select()
      .from(customers)
      .where(eq(customers.tenantId, tenantId));

    return c.json({ success: true, data: custList });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/customers", async (c) => {
  try {
    const body = await c.req.json();
    const tenantId = body.tenantId || "tenant-01";
    const newCust = {
      id: `cust-${Date.now()}`,
      tenantId,
      name: body.name,
      phone: body.phone,
      address: body.address || "",
      notes: body.notes || "",
    };

    await db.insert(customers).values(newCust);
    return c.json({ success: true, message: "Customer berhasil ditambahkan", data: newCust });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 4. Orders
app.get("/api/orders", async (c) => {
  try {
    const tenantId = c.req.query("tenantId") || "tenant-01";
    const orderList = await db
      .select()
      .from(orders)
      .where(eq(orders.tenantId, tenantId))
      .orderBy(desc(orders.createdAt));

    const custList = await db.select().from(customers);

    const enriched = orderList.map((ord) => {
      const cust = custList.find((c) => c.id === ord.customerId);
      return {
        ...ord,
        customer: cust ? { id: cust.id, name: cust.name, phone: cust.phone } : null,
      };
    });

    return c.json({ success: true, data: enriched });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/orders", async (c) => {
  try {
    const body = await c.req.json();
    const tenantId = body.tenantId || "tenant-01";
    const count = (await db.select().from(orders)).length + 1;
    const invoiceNo = `INV-${new Date().toISOString().slice(0, 7).replace("-", "")}-${String(count).padStart(3, "0")}`;

    const newOrder = {
      id: `ord-${Date.now()}`,
      tenantId,
      customerId: body.customerId,
      invoiceNo,
      serviceType: body.serviceType,
      weightOrQty: Number(body.weightOrQty),
      unit: body.unit || "kg",
      pricePerUnit: Number(body.pricePerUnit),
      totalAmount: Number(body.totalAmount),
      status: body.status || "pending",
      paymentStatus: body.paymentStatus || "unpaid",
      paymentMethod: body.paymentMethod || "cash",
      notes: body.notes || "",
      createdAt: new Date().toISOString(),
    };

    await db.insert(orders).values(newOrder);
    return c.json({ success: true, message: "Order berhasil dibuat", data: newOrder });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Update Order Status & Generate WhatsApp notification template
app.patch("/api/orders/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const { status } = await c.req.json();

    const existingResults = await db.select().from(orders).where(eq(orders.id, id));
    const existing = existingResults[0];
    if (!existing) {
      return c.json({ success: false, message: "Order tidak ditemukan" }, 404);
    }

    const completedAt = status === "completed" || status === "ready" ? new Date().toISOString() : null;

    await db
      .update(orders)
      .set({ status, completedAt })
      .where(eq(orders.id, id));

    // Get customer info for WA notification
    const custResults = await db.select().from(customers).where(eq(customers.id, existing.customerId));
    const cust = custResults[0];
    const tenantResults = await db.select().from(tenants).where(eq(tenants.id, existing.tenantId));
    const tenant = tenantResults[0];

    let waData = null;
    if (cust && cust.phone) {
      const cleanPhone = cust.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
      const outletName = tenant ? tenant.outletName : "Orchid Brand Smart Laundry";
      const paymentNote = existing.paymentStatus === "paid" ? "✅ LUNAS" : `⚠️ BELUM LUNAS (Rp ${existing.totalAmount.toLocaleString("id-ID")})`;

      const messageText = `Halo Kak ${cust.name}! 👋\n\nKabar gembira, cucian Anda di *${outletName}* sudah *SELESAI & SIAP DIAMBIL* 🧺✨\n\n📄 *No. Nota:* ${existing.invoiceNo}\n🧺 *Layanan:* ${existing.serviceType} (${existing.weightOrQty} ${existing.unit})\n💰 *Status Bayar:* ${paymentNote}\n\nTerima kasih telah mempercayakan pakaian Anda kepada kami! 🙏`;

      waData = {
        phone: cleanPhone,
        message: messageText,
        waUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`,
      };
    }

    return c.json({
      success: true,
      message: `Status order berhasil diubah menjadi ${status}`,
      waData,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Update Payment Status
app.patch("/api/orders/:id/payment", async (c) => {
  try {
    const id = c.req.param("id");
    const { paymentStatus, paymentMethod } = await c.req.json();

    await db
      .update(orders)
      .set({ paymentStatus, paymentMethod: paymentMethod || "cash" })
      .where(eq(orders.id, id));

    return c.json({ success: true, message: "Status pembayaran berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 5. Expenses (Uang Keluar)
app.get("/api/expenses", async (c) => {
  try {
    const tenantId = c.req.query("tenantId") || "tenant-01";
    const expList = await db
      .select()
      .from(expenses)
      .where(eq(expenses.tenantId, tenantId))
      .orderBy(desc(expenses.expenseDate));

    return c.json({ success: true, data: expList });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/expenses", async (c) => {
  try {
    const body = await c.req.json();
    const tenantId = body.tenantId || "tenant-01";

    const newExpense = {
      id: `exp-${Date.now()}`,
      tenantId,
      category: body.category,
      amount: Number(body.amount),
      notes: body.notes,
      expenseDate: body.expenseDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };

    await db.insert(expenses).values(newExpense);
    return c.json({ success: true, message: "Pengeluaran berhasil dicatat", data: newExpense });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.delete("/api/expenses/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(expenses).where(eq(expenses.id, id));
    return c.json({ success: true, message: "Pengeluaran berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 6. Cashflow Statistics & Dashboard
app.get("/api/stats/cashflow", async (c) => {
  try {
    const tenantId = c.req.query("tenantId") || "tenant-01";

    const orderList = await db.select().from(orders).where(eq(orders.tenantId, tenantId));
    const expList = await db.select().from(expenses).where(eq(expenses.tenantId, tenantId));

    const totalIncome = orderList
      .filter((o) => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingPaymentAmount = orderList
      .filter((o) => o.paymentStatus === "unpaid")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const totalExpense = expList.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpense;

    const activeOrdersCount = orderList.filter((o) =>
      ["pending", "washing", "drying_ironing", "ready"].includes(o.status)
    ).length;

    const readyOrdersCount = orderList.filter((o) => o.status === "ready").length;
    const completedOrdersCount = orderList.filter((o) => o.status === "completed").length;

    return c.json({
      success: true,
      data: {
        totalIncome,
        pendingPaymentAmount,
        totalExpense,
        netProfit,
        totalOrdersCount: orderList.length,
        activeOrdersCount,
        readyOrdersCount,
        completedOrdersCount,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

const port = Number(process.env.PORT) || 5000;
console.log(`🚀 Orchid Brand Smart Laundry API listening on port ${port} (PostgreSQL)`);

export default {
  port,
  fetch: app.fetch,
};
