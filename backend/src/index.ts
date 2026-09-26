import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { db, initPostgresTables } from "./db/index";
import { users, tenants, customers, orders, expenses, services, shifts, waLogs } from "./db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import whatsappRoutes from "./routes/whatsapp";
import referralRoutes from "./routes/referralCodes";
import marketingRoutes from "./routes/marketing";
import signupRoutes from "./routes/signup";
import planRoutes from "./routes/plans";
import platformSettingsRoutes from "./routes/platformSettings";
import subscriptionRoutes from "./routes/subscription";
import platformCashflowRoutes from "./routes/platformCashflow";
import { sendWhatsAppMessage, autoRestoreSavedSessions, getWhatsAppStatus } from "./services/whatsapp";
import { DEFAULT_PRESET_SERVICES } from "./constants/services";
import { askLaundryAssistant } from "./services/aiService";
import { calculateBusinessHealth } from "./utils/businessHealth";
import { signToken, authMiddleware, getUser, invalidateTenantAuthCache } from "./middleware/auth";
import { requireRole, requireTenantAccess } from "./middleware/rbac";
import { rateLimit } from "./middleware/rateLimit";

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

// Auto-initialize PostgreSQL tables on startup, then auto-restore active Baileys sessions
initPostgresTables()
  .then(async () => {
    await autoRestoreSavedSessions();
  })
  .catch(console.error);

// WhatsApp Gateway Routes
app.route("/api/whatsapp", whatsappRoutes);
// Referral & Marketing Routes
app.route("/api/referral-codes", referralRoutes);
app.route("/api/public/referral", referralRoutes);
app.route("/api/marketing", marketingRoutes);
// Self-Signup & Public Routes
app.route("/api/signup", signupRoutes);
app.route("/api/public/signup", signupRoutes);
// Plans & Pricing Routes
app.route("/api/plans", planRoutes);
// Platform Settings Routes
app.route("/api/platform-settings", platformSettingsRoutes);
// Subscription & Invoices Routes
app.route("/api/subscription", subscriptionRoutes);
// Platform Cashflow & Operations Routes
app.route("/api/platform/cashflow", platformCashflowRoutes);

// 1. Health check
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    runtime: "Bun",
    framework: "Hono",
    database: "PostgreSQL",
    timestamp: new Date().toISOString(),
    message: "Laundry Cleanique API is running smoothly on PostgreSQL!",
  });
});

// 2. Public Tracking Endpoint (No Auth Required)
app.get("/api/track/:invoiceNo", async (c) => {
  try {
    const rawInvoiceNo = c.req.param("invoiceNo")?.trim();
    if (!rawInvoiceNo) {
      return c.json({ success: false, message: "Nomor nota wajib diisi" }, 400);
    }

    const orderResults = await db
      .select()
      .from(orders)
      .where(eq(orders.invoiceNo, rawInvoiceNo));
    const order = orderResults[0];

    if (!order) {
      return c.json({ success: false, message: "Pesanan dengan nomor nota tersebut tidak ditemukan" }, 404);
    }

    const tenantResults = await db.select().from(tenants).where(eq(tenants.id, order.tenantId));
    const tenant = tenantResults[0];

    const customerResults = await db.select().from(customers).where(eq(customers.id, order.customerId));
    const customer = customerResults[0];

    // Sanitize phone number (mask for public view e.g. 0812****789)
    let maskedPhone = "";
    if (customer?.phone) {
      const p = customer.phone;
      maskedPhone = p.length > 6 ? p.slice(0, 4) + "****" + p.slice(-3) : p;
    }

    let parsedItems = null;
    if (order.items) {
      try {
        parsedItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
      } catch {}
    }

    return c.json({
      success: true,
      data: {
        order: {
          id: order.id,
          invoiceNo: order.invoiceNo,
          serviceType: order.serviceType,
          weightOrQty: order.weightOrQty,
          unit: order.unit,
          pricePerUnit: order.pricePerUnit,
          totalAmount: order.totalAmount,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          notes: order.notes,
          items: parsedItems,
          createdAt: order.createdAt,
          estimatedCompletionAt: order.estimatedCompletionAt,
          completedAt: order.completedAt,
        },
        outlet: {
          outletName: tenant?.outletName || "Laundry Cleanique",
          phone: tenant?.phone || "",
          address: tenant?.address || "",
          operatingHours: {
            weekdays: "Senin - Jumat : 08.00 - 16.00",
            saturday: "Sabtu : 08.00 - 13.00",
            sunday: "Minggu / Tanggal Merah : Tutup",
          },
        },
        customer: {
          name: customer?.name || "Pelanggan",
          maskedPhone,
        },
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 3. Master Services CRUD per Tenant (DEFAULT_PRESET_SERVICES imported from ./constants/services)

app.get("/api/services", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const requestedTenantId = c.req.query("tenantId");

    let targetTenantId = user.tenantId;
    if (user.role === "superadmin") {
      if (!requestedTenantId || requestedTenantId === "all") {
        const allServices = await db.select().from(services);
        return c.json({ success: true, data: allServices });
      }
      targetTenantId = requestedTenantId;
    }

    if (!targetTenantId) {
      targetTenantId = "tenant-01";
    }

    let existingServices = await db
      .select()
      .from(services)
      .where(eq(services.tenantId, targetTenantId));

    // Auto-seed default services for tenant if none exist yet
    if (existingServices.length === 0) {
      for (const def of DEFAULT_PRESET_SERVICES) {
        await db.insert(services).values({
          id: `srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          tenantId: targetTenantId,
          name: def.name,
          unit: def.unit,
          pricePerUnit: def.pricePerUnit,
          minOrder: def.minOrder,
          durationHours: def.durationHours,
          status: "active",
          createdAt: new Date().toISOString(),
        });
      }
      existingServices = await db.select().from(services).where(eq(services.tenantId, targetTenantId));
    }

    return c.json({ success: true, data: existingServices });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/services", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const { name, unit, pricePerUnit, minOrder, durationHours, status } = body;
    const targetTenantId = user.role === "superadmin" && body.tenantId ? body.tenantId : user.tenantId;

    if (!targetTenantId || !name || pricePerUnit === undefined) {
      return c.json({ success: false, message: "Tenant, Nama Layanan, dan Tarif wajib diisi" }, 400);
    }

    const newService = {
      id: `srv-${Date.now()}`,
      tenantId: targetTenantId,
      name: String(name).trim(),
      unit: unit || "kg",
      pricePerUnit: Number(pricePerUnit) || 0,
      minOrder: Number(minOrder) || 1,
      durationHours: Number(durationHours) || 48,
      status: status || "active",
      createdAt: new Date().toISOString(),
    };

    await db.insert(services).values(newService);
    return c.json({ success: true, message: "Layanan berhasil ditambahkan", data: newService });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.put("/api/services/:id", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const [existing] = await db.select().from(services).where(eq(services.id, id));
    if (!existing) {
      return c.json({ success: false, message: "Layanan tidak ditemukan" }, 404);
    }
    if (user.role !== "superadmin" && existing.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Layanan bukan milik outlet Anda" }, 403);
    }

    const body = await c.req.json();
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.pricePerUnit !== undefined) updateData.pricePerUnit = Number(body.pricePerUnit) || 0;
    if (body.minOrder !== undefined) updateData.minOrder = Number(body.minOrder) || 1;
    if (body.durationHours !== undefined) updateData.durationHours = Number(body.durationHours) || 48;
    if (body.status !== undefined) updateData.status = body.status;

    await db.update(services).set(updateData).where(eq(services.id, id));
    return c.json({ success: true, message: "Layanan berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.delete("/api/services/:id", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const [existing] = await db.select().from(services).where(eq(services.id, id));
    if (!existing) {
      return c.json({ success: false, message: "Layanan tidak ditemukan" }, 404);
    }
    if (user.role !== "superadmin" && existing.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Layanan bukan milik outlet Anda" }, 403);
    }

    await db.delete(services).where(eq(services.id, id));
    return c.json({ success: true, message: "Layanan berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 2. Tenants & Users (Superadmin view)
app.get("/api/tenants", authMiddleware, requireRole(["superadmin"]), async (c) => {
  try {
    const allTenants = await db.select().from(tenants);
    const allUsers = await db.select().from(users);
    const allOrders = await db.select().from(orders);

    const DEFAULT_TENANT_SERVICES = [
      { id: "srv-1", name: "Cuci Komplit Reguler", unit: "kg", price: 8000 },
      { id: "srv-2", name: "Cuci Setrika Express", unit: "kg", price: 12000 },
      { id: "srv-3", name: "Setrika Saja", unit: "kg", price: 6000 },
      { id: "srv-4", name: "Bedcover King", unit: "pcs", price: 35000 },
      { id: "srv-5", name: "Bedcover Single", unit: "pcs", price: 25000 },
      { id: "srv-6", name: "Cuci Sepatu", unit: "pasang", price: 25000 },
      { id: "srv-7", name: "Cuci Karpet", unit: "meter", price: 15000 },
      { id: "srv-8", name: "Cuci Selimut", unit: "pcs", price: 20000 },
    ];

    const enriched = allTenants.map((tenant) => {
      const owner = allUsers.find((u) => u.id === tenant.userId);
      const tenantOrders = allOrders.filter((o) => o.tenantId === tenant.id);
      const totalOmset = tenantOrders
        .filter((o) => o.paymentStatus === "paid")
        .reduce((sum, o) => sum + o.totalAmount, 0);

      let parsedServices = DEFAULT_TENANT_SERVICES;
      if (tenant.services) {
        try {
          const parsed = typeof tenant.services === "string" ? JSON.parse(tenant.services) : tenant.services;
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedServices = parsed;
          }
        } catch {
          parsedServices = DEFAULT_TENANT_SERVICES;
        }
      }

      return {
        ...tenant,
        services: parsedServices,
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

// 2b. Single Tenant Detail (Superadmin or Tenant Owner/Staff of that tenant)
app.get("/api/tenants/:id", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) {
      return c.json({ success: false, message: "Tenant tidak ditemukan" }, 404);
    }

    if (user.role !== "superadmin" && user.tenantId !== id && tenant.userId !== user.userId) {
      return c.json({ success: false, message: "Akses ditolak: Anda hanya dapat melihat data outlet Anda sendiri" }, 403);
    }

    const allUsers = await db.select().from(users).where(eq(users.id, tenant.userId || ""));
    const owner = allUsers[0];

    const DEFAULT_TENANT_SERVICES = [
      { id: "srv-1", name: "Cuci Komplit Reguler", unit: "kg", price: 8000 },
      { id: "srv-2", name: "Cuci Setrika Express", unit: "kg", price: 12000 },
      { id: "srv-3", name: "Setrika Saja", unit: "kg", price: 6000 },
      { id: "srv-4", name: "Bedcover King", unit: "pcs", price: 35000 },
      { id: "srv-5", name: "Bedcover Single", unit: "pcs", price: 25000 },
      { id: "srv-6", name: "Cuci Sepatu", unit: "pasang", price: 25000 },
      { id: "srv-7", name: "Cuci Karpet", unit: "meter", price: 15000 },
      { id: "srv-8", name: "Cuci Selimut", unit: "pcs", price: 20000 },
    ];

    let parsedServices = DEFAULT_TENANT_SERVICES;
    if (tenant.services) {
      try {
        const parsed = typeof tenant.services === "string" ? JSON.parse(tenant.services) : tenant.services;
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedServices = parsed;
        }
      } catch {
        parsedServices = DEFAULT_TENANT_SERVICES;
      }
    }

    return c.json({
      success: true,
      data: {
        ...tenant,
        services: parsedServices,
        owner: owner
          ? { id: owner.id, name: owner.name, email: owner.email, role: owner.role }
          : null,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/tenants", authMiddleware, requireRole(["superadmin"]), async (c) => {
  try {
    const body = await c.req.json();
    const {
      ownerName, ownerEmail, password, outletName, phone, address, services,
      city, bankName, bankAccountNumber, bankAccountName, qrisInfo, openingHours
    } = body;

    const newUserId = `user-${Date.now()}`;
    const hashedPassword = await Bun.password.hash(password || "123456", { algorithm: "bcrypt", cost: 10 });
    await db.insert(users).values({
      id: newUserId,
      name: ownerName,
      email: ownerEmail,
      passwordHash: hashedPassword,
      role: "tenant_owner",
    });

    const newTenantId = `tenant-${Date.now()}`;
    await db.insert(tenants).values({
      id: newTenantId,
      userId: newUserId,
      outletName,
      phone,
      address,
      city: city || null,
      services: services ? (typeof services === "string" ? services : JSON.stringify(services)) : null,
      bankName: bankName || null,
      bankAccountNumber: bankAccountNumber || null,
      bankAccountName: bankAccountName || null,
      qrisInfo: qrisInfo || null,
      openingHours: openingHours ? (typeof openingHours === "string" ? openingHours : JSON.stringify(openingHours)) : null,
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

app.put("/api/tenants/:id", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");

    if (user.role !== "superadmin" && user.tenantId !== id) {
      const [tRow] = await db.select().from(tenants).where(eq(tenants.id, id));
      if (!tRow || tRow.userId !== user.userId) {
        return c.json({ success: false, message: "Akses ditolak: Anda hanya dapat mengelola data outlet Anda sendiri" }, 403);
      }
    }

    const body = await c.req.json();
    const {
      outletName, phone, address, status, subscriptionUntil, services, ownerName, enableCashierShift,
      city, bankName, bankAccountNumber, bankAccountName, qrisInfo, openingHours
    } = body;

    const updateData: any = {};
    if (outletName !== undefined) updateData.outletName = outletName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city || null;
    if (services !== undefined) {
      updateData.services = typeof services === "string" ? services : JSON.stringify(services);
    }
    if (enableCashierShift !== undefined) {
      updateData.enableCashierShift = String(enableCashierShift);
    }
    // Informasi rekening bank
    if (bankName !== undefined) updateData.bankName = bankName || null;
    if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber || null;
    if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName || null;
    if (qrisInfo !== undefined) updateData.qrisInfo = qrisInfo || null;
    if (openingHours !== undefined) {
      updateData.openingHours = openingHours
        ? (typeof openingHours === "string" ? openingHours : JSON.stringify(openingHours))
        : null;
    }

    // Hanya Super Admin yang boleh mengubah status aktif dan masa langganan secara langsung
    if (user.role === "superadmin") {
      if (status !== undefined) updateData.status = status;
      if (subscriptionUntil !== undefined) updateData.subscriptionUntil = subscriptionUntil;
    }

    await db.update(tenants).set(updateData).where(eq(tenants.id, id));
    invalidateTenantAuthCache(id);

    if (ownerName && typeof ownerName === "string" && ownerName.trim()) {
      const tenantRow = (await db.select().from(tenants).where(eq(tenants.id, id)))[0];
      if (tenantRow && tenantRow.userId) {
        await db.update(users).set({ name: ownerName.trim() }).where(eq(users.id, tenantRow.userId));
      }
    }

    return c.json({ success: true, message: "Data tenant berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.patch("/api/tenants/:id/status", authMiddleware, requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { status, subscriptionUntil } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (subscriptionUntil !== undefined) updateData.subscriptionUntil = subscriptionUntil;

    await db.update(tenants).set(updateData).where(eq(tenants.id, id));
    invalidateTenantAuthCache(id);
    return c.json({ success: true, message: "Status cabang / langganan berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.delete("/api/tenants/:id", authMiddleware, requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(tenants).where(eq(tenants.id, id));
    return c.json({ success: true, message: "Tenant berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Authentication & Login (Validasi Status Aktif & Langganan Offline)
app.post("/api/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const foundUser = (await db.select().from(users).where(eq(users.email, email)))[0];
    if (!foundUser) {
      return c.json({ success: false, message: "Email atau kata sandi tidak ditemukan." }, 401);
    }
    let isPasswordValid = false;
    try {
      isPasswordValid = await Bun.password.verify(password, foundUser.passwordHash);
    } catch {
      isPasswordValid = foundUser.passwordHash === password;
    }

    if (!isPasswordValid && foundUser.passwordHash === password) {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      return c.json({ success: false, message: "Kata sandi yang Anda masukkan salah." }, 401);
    }

    // Auto-upgrade legacy plain-text password to secure bcrypt hash
    if (!foundUser.passwordHash.startsWith("$2b$") && !foundUser.passwordHash.startsWith("$2a$")) {
      try {
        const upgradedHash = await Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
        await db.update(users).set({ passwordHash: upgradedHash }).where(eq(users.id, foundUser.id));
      } catch (upErr) {
        console.warn("[Auth] Password auto-hash upgrade notice:", upErr);
      }
    }

    let userTenant = null;
    if (foundUser.tenantId) {
      userTenant = (await db.select().from(tenants).where(eq(tenants.id, foundUser.tenantId)))[0];
    }
    if (!userTenant) {
      userTenant = (await db.select().from(tenants).where(eq(tenants.userId, foundUser.id)))[0];
    }

    const userSummary = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role,
      status: foundUser.status || "active",
      subscriptionUntil: foundUser.subscriptionUntil || userTenant?.subscriptionUntil || null,
      tenantId: userTenant ? userTenant.id : foundUser.tenantId || null,
      tenantName: userTenant ? userTenant.outletName : null,
      tutorialCompleted: foundUser.tutorialCompleted === "true",
      metadata: foundUser.metadata || null,
    };

    if (foundUser.status === "inactive" && foundUser.role !== "superadmin") {
      return c.json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "Akun Anda berstatus NONAKTIF. Hubungi Super Admin untuk aktivasi langganan offline Anda.",
        user: userSummary,
      }, 403);
    }

    // Periksa status aktif tenant untuk akun non-superadmin
    if (userTenant && userTenant.status === "inactive" && foundUser.role !== "superadmin") {
      return c.json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "Outlet Anda berstatus NONAKTIF. Hubungi Super Admin untuk aktivasi.",
        user: userSummary,
      }, 403);
    }

    // Periksa masa aktif langganan: jika user tidak punya tanggal sendiri (misal kasir), cek tanggal outlet
    if (foundUser.role !== "superadmin") {
      let subDate = foundUser.subscriptionUntil;
      if (!subDate && userTenant?.subscriptionUntil) {
        subDate = userTenant.subscriptionUntil;
      }
      if (subDate) {
        const expDate = new Date(`${subDate}T23:59:59`);
        if (!isNaN(expDate.getTime()) && expDate < new Date()) {
          return c.json({
            success: false,
            code: "SUBSCRIPTION_EXPIRED",
            message: `Masa aktif akun / outlet Anda telah berakhir pada ${subDate}. Silakan hubungi Super Admin untuk perpanjangan.`,
            user: userSummary,
          }, 403);
        }
      }
    }

    // Generate session token (HMAC-SHA256)
    const token = await signToken({
      userId: foundUser.id,
      role: foundUser.role,
      tenantId: userSummary.tenantId,
      exp: Date.now() + 7 * 24 * 3600 * 1000,
    });

    return c.json({
      success: true,
      message: "Login berhasil",
      user: userSummary,
      token,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Cek status masa aktif user secara realtime
app.get("/api/auth/status", async (c) => {
  try {
    const userId = c.req.query("userId");
    if (!userId) {
      return c.json({ success: false, message: "userId diperlukan" }, 400);
    }
    const foundUser = (await db.select().from(users).where(eq(users.id, userId)))[0];
    if (!foundUser) {
      return c.json({ success: false, message: "User tidak ditemukan" }, 404);
    }
    let userTenant = null;
    if (foundUser.tenantId) {
      userTenant = (await db.select().from(tenants).where(eq(tenants.id, foundUser.tenantId)))[0];
    }
    if (!userTenant) {
      userTenant = (await db.select().from(tenants).where(eq(tenants.userId, foundUser.id)))[0];
    }

    let isExpired = false;
    let daysRemaining = 0;
    if (foundUser.subscriptionUntil) {
      const expDate = new Date(`${foundUser.subscriptionUntil}T23:59:59`);
      if (!isNaN(expDate.getTime())) {
        const diffMs = expDate.getTime() - Date.now();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        isExpired = diffMs < 0;
      }
    }

    const isInactive =
      foundUser.role !== "superadmin" && (foundUser.status === "inactive" || isExpired);

    return c.json({
      success: true,
      user: {
        id: foundUser.id,
        name: foundUser.name,
        email: foundUser.email,
        role: foundUser.role,
        status: foundUser.status || "active",
        subscriptionUntil: foundUser.subscriptionUntil,
        tenantId: userTenant ? userTenant.id : null,
        tenantName: userTenant ? userTenant.outletName : null,
        tutorialCompleted: foundUser.tutorialCompleted === "true",
        metadata: foundUser.metadata || null,
      },
      statusInfo: {
        isInactive,
        isExpired,
        daysRemaining,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/auth/logout", async (c) => {
  return c.json({ success: true, message: "Logout berhasil" });
});

// User Management (Super Admin)
app.get("/api/users", authMiddleware, requireRole(["superadmin"]), async (c) => {
  try {
    const allUsers = await db.select().from(users);
    const allTenants = await db.select().from(tenants);

    const enrichedUsers = allUsers.map((u) => {
      const userTenant = u.tenantId
        ? allTenants.find((t) => t.id === u.tenantId)
        : allTenants.find((t) => t.userId === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status || "active",
        subscriptionUntil: u.subscriptionUntil || null,
        createdAt: u.createdAt,
        tenantId: userTenant ? userTenant.id : u.tenantId || null,
        tenantName: userTenant ? userTenant.outletName : null,
      };
    });

    return c.json({ success: true, data: enrichedUsers });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/users", authMiddleware, requireRole(["superadmin"]), async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, password, role, tenantId, status, subscriptionUntil } = body;

    const newUserId = `user-${Date.now()}`;
    const hashedPassword = await Bun.password.hash(password || "123456", { algorithm: "bcrypt", cost: 10 });
    await db.insert(users).values({
      id: newUserId,
      name,
      email,
      passwordHash: hashedPassword,
      role: role || "staff",
      status: status || "active",
      subscriptionUntil: subscriptionUntil || null,
      tenantId: tenantId || null,
    });

    // If a tenant is specified and user is tenant_owner, link them
    if (tenantId && role === "tenant_owner") {
      await db.update(tenants).set({ userId: newUserId }).where(eq(tenants.id, tenantId));
    }

    return c.json({
      success: true,
      message: "Pengguna berhasil ditambahkan",
      data: {
        id: newUserId,
        name,
        email,
        role: role || "staff",
        status: status || "active",
        subscriptionUntil: subscriptionUntil || null,
        tenantId: tenantId || null,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.put("/api/users/:id", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, email, role, password, tenantId, status, subscriptionUntil, tutorialCompleted, metadata } = body;

    if (user.role !== "superadmin" && user.userId !== id) {
      return c.json({ success: false, message: "Akses ditolak: Anda hanya dapat mengedit akun Anda sendiri" }, 403);
    }

    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name;
    if (email !== undefined) updatePayload.email = email;
    if (password !== undefined && String(password).trim()) {
      updatePayload.passwordHash = await Bun.password.hash(String(password).trim(), { algorithm: "bcrypt", cost: 10 });
    }
    if (tutorialCompleted !== undefined) {
      updatePayload.tutorialCompleted = tutorialCompleted === true || tutorialCompleted === "true" ? "true" : "false";
    }
    if (metadata !== undefined) {
      updatePayload.metadata = typeof metadata === "string" ? metadata : JSON.stringify(metadata);
    }

    // Hanya superadmin yang boleh mengubah role, status, masa aktif, atau asosiasi tenant
    if (user.role === "superadmin") {
      if (role !== undefined) updatePayload.role = role;
      if (status !== undefined) updatePayload.status = status;
      if (subscriptionUntil !== undefined) updatePayload.subscriptionUntil = subscriptionUntil;
      if (tenantId !== undefined) updatePayload.tenantId = tenantId;
    }

    await db.update(users).set(updatePayload).where(eq(users.id, id));

    if (user.role === "superadmin" && tenantId && role === "tenant_owner") {
      await db.update(tenants).set({ userId: id }).where(eq(tenants.id, tenantId));
    }

    return c.json({ success: true, message: "Data pengguna berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Tandai tutorial onboarding selesai untuk user yang sedang login
app.post("/api/users/tutorial-complete", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    await db.update(users).set({ tutorialCompleted: "true" }).where(eq(users.id, user.userId));
    return c.json({ success: true, message: "Tutorial berhasil diselesaikan" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.patch("/api/users/:id/status", authMiddleware, requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { status, subscriptionUntil } = body;

    const updatePayload: any = {};
    if (status !== undefined) updatePayload.status = status;
    if (subscriptionUntil !== undefined) updatePayload.subscriptionUntil = subscriptionUntil;

    await db.update(users).set(updatePayload).where(eq(users.id, id));

    // Sinkronkan ke tenant jika pengguna adalah pemilik tenant
    if (status !== undefined || subscriptionUntil !== undefined) {
      const tenantPayload: any = {};
      if (status !== undefined) tenantPayload.status = status;
      if (subscriptionUntil !== undefined) tenantPayload.subscriptionUntil = subscriptionUntil;
      await db.update(tenants).set(tenantPayload).where(eq(tenants.userId, id));
    }

    return c.json({ success: true, message: "Status akun berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Perpanjang masa aktif pengguna (+X hari atau tanggal tertentu) - Khusus Superadmin
app.post("/api/users/:id/extend", authMiddleware, requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { days, newDate, activate = true } = body;

    const targetUser = (await db.select().from(users).where(eq(users.id, id)))[0];
    if (!targetUser) {
      return c.json({ success: false, message: "Pengguna tidak ditemukan" }, 404);
    }

    let finalDate = "";

    if (newDate) {
      finalDate = newDate;
    } else if (days !== undefined) {
      const addDays = Number(days) || 0;
      let baseDate = new Date();

      // Jika saat ini masih aktif (belum kedaluwarsa), tambahkan dari tanggal expired saat ini
      if (targetUser.subscriptionUntil) {
        const currentExp = new Date(`${targetUser.subscriptionUntil}T23:59:59`);
        if (!isNaN(currentExp.getTime()) && currentExp > new Date()) {
          baseDate = new Date(targetUser.subscriptionUntil);
        }
      }

      baseDate.setDate(baseDate.getDate() + addDays);
      finalDate = baseDate.toISOString().slice(0, 10);
    } else {
      return c.json({ success: false, message: "Parameter days atau newDate wajib disertakan" }, 400);
    }

    const updatePayload: any = {
      subscriptionUntil: finalDate,
    };
    if (activate) {
      updatePayload.status = "active";
    }

    await db.update(users).set(updatePayload).where(eq(users.id, id));

    // Sinkronkan ke cabang tenant jika ada
    const tenantPayload: any = { subscriptionUntil: finalDate };
    if (activate) tenantPayload.status = "active";
    await db.update(tenants).set(tenantPayload).where(eq(tenants.userId, id));

    const updatedUser = (await db.select().from(users).where(eq(users.id, id)))[0];
    const userTenant = (await db.select().from(tenants).where(eq(tenants.userId, id)))[0];
    if (userTenant) invalidateTenantAuthCache(userTenant.id);

    return c.json({
      success: true,
      message: `Masa aktif ${targetUser.name} berhasil diperpanjang hingga ${finalDate}`,
      newSubscriptionUntil: finalDate,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status || "active",
        subscriptionUntil: updatedUser.subscriptionUntil,
        tenantId: userTenant ? userTenant.id : null,
        tenantName: userTenant ? userTenant.outletName : null,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.delete("/api/users/:id", authMiddleware, requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(users).where(eq(users.id, id));
    return c.json({ success: true, message: "Pengguna berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Reset Password Pengguna (Khusus Admin atau Pemilik Outlet untuk Stafnya)
app.post("/api/users/:id/reset-password", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const body = await c.req.json();
    const { newPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 4) {
      return c.json(
        { success: false, message: "Kata sandi baru minimal harus 4 karakter." },
        400
      );
    }

    const foundUsers = await db.select().from(users).where(eq(users.id, id));
    const targetUser = foundUsers[0];
    if (!targetUser) {
      return c.json({ success: false, message: "Pengguna tidak ditemukan." }, 404);
    }

    // Jika bukan superadmin, hanya izinkan tenant_owner mereset password staf di cabangnya sendiri atau akun miliknya sendiri
    if (user.role !== "superadmin") {
      const isSelf = user.userId === id;
      const isOwnerOfStaff =
        user.role === "tenant_owner" &&
        targetUser.role === "staff" &&
        targetUser.tenantId === user.tenantId;

      if (!isSelf && !isOwnerOfStaff) {
        return c.json(
          { success: false, message: "Akses ditolak: Anda tidak memiliki wewenang mereset password pengguna ini." },
          403
        );
      }
    }

    const hashedPassword = await Bun.password.hash(newPassword.trim(), { algorithm: "bcrypt", cost: 10 });
    await db
      .update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.id, id));

    return c.json({
      success: true,
      message: `Kata sandi untuk ${targetUser.name} (${targetUser.email}) berhasil direset.`,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// ==========================================
// 2B. Staff Kasir Management per Outlet (Tenant Owner & Superadmin)
// ==========================================
app.get("/api/tenants/:id/staff", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const tenantId = c.req.param("id");

    if (user.role !== "superadmin" && user.tenantId !== tenantId) {
      return c.json({ success: false, message: "Akses ditolak untuk data cabang ini" }, 403);
    }

    const staffList = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        tenantId: users.tenantId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.role, "staff"), eq(users.tenantId, tenantId)));
    return c.json({ success: true, data: staffList });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/tenants/:id/staff", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const tenantId = c.req.param("id");

    if (user.role !== "superadmin" && user.tenantId !== tenantId) {
      return c.json({ success: false, message: "Akses ditolak untuk cabang ini" }, 403);
    }

    const { name, email, password } = await c.req.json();
    if (!name || !email || !password) {
      return c.json({ success: false, message: "Nama, email, dan kata sandi wajib diisi" }, 400);
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = (await db.select().from(users).where(eq(users.email, cleanEmail)))[0];
    if (existing) {
      return c.json({ success: false, message: "Email sudah terdaftar" }, 400);
    }

    const hashedPassword = await Bun.password.hash(String(password).trim(), { algorithm: "bcrypt", cost: 10 });
    const newStaffId = `user-${Date.now()}`;
    await db.insert(users).values({
      id: newStaffId,
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash: hashedPassword,
      role: "staff",
      status: "active",
      tenantId,
      createdAt: new Date().toISOString(),
    });

    return c.json({
      success: true,
      message: "Kasir/Staff baru berhasil ditambahkan",
      data: { id: newStaffId, name, email: cleanEmail, role: "staff", tenantId },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.delete("/api/staff/:id", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const target = (await db.select().from(users).where(eq(users.id, id)))[0];
    if (!target) return c.json({ success: false, message: "Pengguna tidak ditemukan" }, 404);
    if (target.role !== "staff") {
      return c.json({ success: false, message: "Hanya akun staf kasir yang dapat dihapus dari menu ini" }, 400);
    }
    if (user.role !== "superadmin" && target.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Staf bukan milik outlet Anda" }, 403);
    }

    await db.delete(users).where(eq(users.id, id));
    return c.json({ success: true, message: "Akun staf kasir berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.put("/api/staff/:id", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const target = (await db.select().from(users).where(eq(users.id, id)))[0];
    if (!target) return c.json({ success: false, message: "Pengguna tidak ditemukan" }, 404);
    if (target.role !== "staff") {
      return c.json({ success: false, message: "Hanya akun staf kasir yang dapat diedit dari menu ini" }, 400);
    }
    if (user.role !== "superadmin" && target.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Staf bukan milik outlet Anda" }, 403);
    }

    const body = await c.req.json();
    const { name, email, status, password } = body;
    const updatePayload: any = {};

    if (name !== undefined) updatePayload.name = String(name).trim();
    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanEmail !== target.email) {
        const duplicate = (await db.select().from(users).where(eq(users.email, cleanEmail)))[0];
        if (duplicate) {
          return c.json({ success: false, message: "Email sudah terdaftar oleh pengguna lain" }, 400);
        }
      }
      updatePayload.email = cleanEmail;
    }
    if (status !== undefined) {
      updatePayload.status = status === "active" ? "active" : "inactive";
    }
    if (password !== undefined && String(password).trim().length >= 4) {
      updatePayload.passwordHash = await Bun.password.hash(String(password).trim(), { algorithm: "bcrypt", cost: 10 });
    }

    await db.update(users).set(updatePayload).where(eq(users.id, id));
    return c.json({ success: true, message: "Data staf kasir berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/staff/:id/reset-password", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const target = (await db.select().from(users).where(eq(users.id, id)))[0];
    if (!target) return c.json({ success: false, message: "Pengguna tidak ditemukan" }, 404);
    if (target.role !== "staff") {
      return c.json({ success: false, message: "Hanya akun staf kasir yang dapat direset dari menu ini" }, 400);
    }
    if (user.role !== "superadmin" && target.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Staf bukan milik outlet Anda" }, 403);
    }

    const body = await c.req.json();
    const { newPassword } = body;
    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 4) {
      return c.json({ success: false, message: "Kata sandi baru minimal 4 karakter" }, 400);
    }

    const passwordHash = await Bun.password.hash(newPassword.trim(), { algorithm: "bcrypt", cost: 10 });
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
    return c.json({ success: true, message: "Kata sandi staf kasir berhasil direset" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.patch("/api/staff/:id/status", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const target = (await db.select().from(users).where(eq(users.id, id)))[0];
    if (!target) return c.json({ success: false, message: "Pengguna tidak ditemukan" }, 404);
    if (target.role !== "staff") {
      return c.json({ success: false, message: "Hanya akun staf kasir yang dapat diubah dari menu ini" }, 400);
    }
    if (user.role !== "superadmin" && target.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Staf bukan milik outlet Anda" }, 403);
    }

    const nextStatus = target.status === "active" ? "inactive" : "active";
    await db.update(users).set({ status: nextStatus }).where(eq(users.id, id));
    return c.json({ success: true, message: `Status staf berhasil diubah menjadi ${nextStatus}`, data: { status: nextStatus } });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// ==========================================
// 2C. Cashier Shift & Cash Reconciliation Endpoints
// ==========================================
// ==========================================
// 2C. Cashier Shift & Cash Reconciliation Endpoints
// ==========================================
app.get("/api/shifts/active", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const tenantId = user.role === "superadmin" && c.req.query("tenantId")
      ? c.req.query("tenantId")!
      : (user.tenantId || "tenant-01");
    const userId = user.role === "superadmin" && c.req.query("userId")
      ? c.req.query("userId")
      : user.userId;

    const conditions = [eq(shifts.tenantId, tenantId), eq(shifts.status, "open")];
    if (userId) {
      conditions.push(eq(shifts.userId, userId));
    }

    const activeShifts = await db
      .select()
      .from(shifts)
      .where(and(...conditions))
      .orderBy(desc(shifts.openedAt));
    const active = activeShifts[0] || null;

    if (!active) {
      return c.json({ success: true, data: null });
    }

    // Get cashier info
    const cashierUser = (await db.select().from(users).where(eq(users.id, active.userId)))[0];

    // Calculate cash payments received for this active shift
    const ordersInTenant = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, active.tenantId),
          eq(orders.paymentStatus, "paid"),
          eq(orders.paymentMethod, "cash")
        )
      );

    const ordersDuringShift = ordersInTenant.filter((o) => {
      if (o.paidShiftId === active.id) return true;
      if (o.paidAt && o.paidAt >= active.openedAt) return true;
      if (!o.paidAt && o.createdAt >= active.openedAt) return true;
      return false;
    });
    const currentCashTotal = ordersDuringShift.reduce((sum, o) => sum + o.totalAmount, 0);

    return c.json({
      success: true,
      data: {
        ...active,
        cashierName: cashierUser?.name || "Kasir",
        systemCashTotal: currentCashTotal,
        expectedCash: active.startingCash + currentCashTotal,
        ordersCount: ordersDuringShift.length,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/shifts/open", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const tenantId = user.role === "superadmin" && body.tenantId ? body.tenantId : (user.tenantId || "tenant-01");
    const userId = user.userId;
    const { startingCash = 0, notes } = body;

    // Check if user already has an open shift in this tenant
    const existingOpen = await db
      .select()
      .from(shifts)
      .where(
        and(
          eq(shifts.tenantId, tenantId),
          eq(shifts.userId, userId),
          eq(shifts.status, "open")
        )
      );

    if (existingOpen.length > 0) {
      return c.json({
        success: false,
        message: "Anda masih memiliki shift yang sedang aktif. Silakan tutup shift sebelumnya terlebih dahulu.",
        data: existingOpen[0],
      }, 400);
    }

    const newShift = {
      id: `shift-${Date.now()}`,
      tenantId,
      userId,
      openedAt: new Date().toISOString(),
      startingCash: Number(startingCash) || 0,
      systemCashTotal: 0,
      status: "open",
      notes: notes ? String(notes).trim() : "",
      createdAt: new Date().toISOString(),
    };

    await db.insert(shifts).values(newShift);

    const cashierUser = (await db.select().from(users).where(eq(users.id, userId)))[0];

    return c.json({
      success: true,
      message: "Shift kasir berhasil dibuka",
      data: {
        ...newShift,
        cashierName: cashierUser?.name || "Kasir",
        expectedCash: newShift.startingCash,
        ordersCount: 0,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/shifts/close", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const { shiftId, actualCashTotal = 0, notes } = body;
    if (!shiftId) return c.json({ success: false, message: "shiftId wajib diisi" }, 400);

    const shiftRow = (await db.select().from(shifts).where(eq(shifts.id, shiftId)))[0];
    if (!shiftRow) return c.json({ success: false, message: "Shift tidak ditemukan" }, 404);

    if (user.role !== "superadmin" && shiftRow.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Shift bukan milik outlet Anda" }, 403);
    }

    if (shiftRow.status === "closed") {
      return c.json({ success: false, message: "Shift sudah ditutup sebelumnya" }, 400);
    }

    const closedAt = new Date().toISOString();

    // Calculate all cash payments received during the shift
    const ordersInTenant = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.tenantId, shiftRow.tenantId),
          eq(orders.paymentStatus, "paid"),
          eq(orders.paymentMethod, "cash")
        )
      );

    const ordersDuringShift = ordersInTenant.filter((o) => {
      if (o.paidShiftId === shiftRow.id) return true;
      if (o.paidAt && o.paidAt >= shiftRow.openedAt && o.paidAt <= closedAt) return true;
      if (!o.paidAt && o.createdAt >= shiftRow.openedAt && o.createdAt <= closedAt) return true;
      return false;
    });

    const systemCashTotal = ordersDuringShift.reduce((sum, o) => sum + o.totalAmount, 0);
    const expectedCash = shiftRow.startingCash + systemCashTotal;
    const finalActual = Number(actualCashTotal) || 0;
    const discrepancy = finalActual - expectedCash;

    await db
      .update(shifts)
      .set({
        closedAt,
        systemCashTotal,
        actualCashTotal: finalActual,
        discrepancy,
        status: "closed",
        notes: notes !== undefined ? String(notes).trim() : shiftRow.notes,
      })
      .where(eq(shifts.id, shiftId));

    return c.json({
      success: true,
      message: "Shift kasir berhasil ditutup dan direkonsiliasi",
      data: {
        shiftId,
        openedAt: shiftRow.openedAt,
        closedAt,
        startingCash: shiftRow.startingCash,
        systemCashTotal,
        expectedCash,
        actualCashTotal: finalActual,
        discrepancy,
        ordersCount: ordersDuringShift.length,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.get("/api/shifts/history", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const requestedTenantId = c.req.query("tenantId");
    const tenantId = user.role === "superadmin"
      ? (requestedTenantId && requestedTenantId !== "all" ? requestedTenantId : null)
      : user.tenantId;

    const shiftRows = tenantId
      ? await db.select().from(shifts).where(eq(shifts.tenantId, tenantId)).orderBy(desc(shifts.openedAt)).limit(200)
      : await db.select().from(shifts).orderBy(desc(shifts.openedAt)).limit(200);

    const userRows = await db.select().from(users);

    const enriched = shiftRows.map((s) => {
      const u = userRows.find((usr) => usr.id === s.userId);
      return {
        ...s,
        cashierName: u ? u.name : "Kasir",
        cashierEmail: u ? u.email : "",
      };
    });
    return c.json({ success: true, data: enriched });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// ==========================================
// 2D. WhatsApp Delivery Audit Logs
// ==========================================
app.get("/api/orders/:id/wa-logs", authMiddleware, async (c) => {
  try {
    const orderId = c.req.param("id");
    const logs = await db.select().from(waLogs).where(eq(waLogs.orderId, orderId)).orderBy(desc(waLogs.createdAt));
    return c.json({ success: true, data: logs });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.get("/api/tenants/:id/wa-logs", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const tenantId = c.req.param("id");

    if (user.role !== "superadmin" && user.tenantId !== tenantId) {
      return c.json({ success: false, message: "Akses ditolak" }, 403);
    }

    const logs =
      tenantId === "all"
        ? await db.select().from(waLogs).orderBy(desc(waLogs.createdAt)).limit(200)
        : await db.select().from(waLogs).where(eq(waLogs.tenantId, tenantId)).orderBy(desc(waLogs.createdAt)).limit(200);
    return c.json({ success: true, data: logs });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/whatsapp/log", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const { tenantId: rawTenantId, orderId, recipientPhone, recipientName, messagePreview, status, mode, errorMessage } = body;
    const targetTenantId = user.role === "superadmin" && rawTenantId ? rawTenantId : (user.tenantId || "tenant-01");

    const newLog = {
      id: `walog-${Date.now()}`,
      tenantId: targetTenantId,
      orderId: orderId || null,
      recipientPhone: recipientPhone || "",
      recipientName: recipientName || null,
      messagePreview: messagePreview ? String(messagePreview).slice(0, 200) : null,
      status: status || "sent",
      mode: mode || "manual",
      errorMessage: errorMessage || null,
      createdAt: new Date().toISOString(),
    };
    await db.insert(waLogs).values(newLog);
    return c.json({ success: true, data: newLog });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 3. Customers
app.get("/api/customers", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const requestedTenantId = c.req.query("tenantId");
    const tenantId = user.role === "superadmin"
      ? (requestedTenantId && requestedTenantId !== "all" ? requestedTenantId : null)
      : user.tenantId;

    const custList = tenantId
      ? await db.select().from(customers).where(eq(customers.tenantId, tenantId))
      : await db.select().from(customers);

    return c.json({ success: true, data: custList });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/customers", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const targetTenantId = user.role === "superadmin" && body.tenantId ? body.tenantId : (user.tenantId || "tenant-01");

    const newCust = {
      id: `cust-${Date.now()}`,
      tenantId: targetTenantId,
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

app.put("/api/customers/:id", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const [existing] = await db.select().from(customers).where(eq(customers.id, id));
    if (!existing) return c.json({ success: false, message: "Pelanggan tidak ditemukan" }, 404);

    if (user.role !== "superadmin" && existing.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Pelanggan bukan milik outlet Anda" }, 403);
    }

    const body = await c.req.json();
    const { name, phone, address, notes } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (notes !== undefined) updateData.notes = notes;

    await db.update(customers).set(updateData).where(eq(customers.id, id));
    return c.json({ success: true, message: "Data pelanggan berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.delete("/api/customers/:id", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const [existing] = await db.select().from(customers).where(eq(customers.id, id));
    if (!existing) return c.json({ success: false, message: "Pelanggan tidak ditemukan" }, 404);

    if (user.role !== "superadmin" && existing.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Pelanggan bukan milik outlet Anda" }, 403);
    }

    await db.delete(customers).where(eq(customers.id, id));
    return c.json({ success: true, message: "Pelanggan berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 4. Orders
app.get("/api/orders", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const tenantIdQuery = c.req.query("tenantId");
    const targetTenantId =
      user.role === "superadmin"
        ? (tenantIdQuery && tenantIdQuery !== "all" ? tenantIdQuery : null)
        : user.tenantId;

    const orderList = targetTenantId
      ? await db
          .select()
          .from(orders)
          .where(eq(orders.tenantId, targetTenantId))
          .orderBy(desc(orders.createdAt))
      : await db.select().from(orders).orderBy(desc(orders.createdAt));

    const custList = targetTenantId
      ? await db.select().from(customers).where(eq(customers.tenantId, targetTenantId))
      : await db.select().from(customers);
    const allWaLogs = targetTenantId
      ? await db.select().from(waLogs).where(eq(waLogs.tenantId, targetTenantId))
      : await db.select().from(waLogs);

    const enriched = orderList.map((ord) => {
      const cust = custList.find((c) => c.id === ord.customerId);
      const orderWaLogs = allWaLogs.filter((w) => w.orderId === ord.id);
      const waSent = orderWaLogs.some((w) => w.status === "sent");
      const latestWaLog = orderWaLogs.length > 0 ? orderWaLogs[orderWaLogs.length - 1] : null;

      let parsedItems = null;
      if (ord.items) {
        try {
          parsedItems = typeof ord.items === "string" ? JSON.parse(ord.items) : ord.items;
        } catch {
          parsedItems = null;
        }
      }
      return {
        ...ord,
        items: parsedItems,
        customer: cust ? { id: cust.id, name: cust.name, phone: cust.phone } : null,
        waSent,
        waLogsCount: orderWaLogs.length,
        latestWaLog,
      };
    });

    return c.json({ success: true, data: enriched });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/orders", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const tenantId = user.role === "superadmin" ? (body.tenantId || user.tenantId || "tenant-01") : user.tenantId;
    if (!tenantId) {
      return c.json({ success: false, message: "Tenant ID tidak valid" }, 400);
    }
    let customerId = body.customerId;

    if (!customerId && body.newCustomer) {
      if (!body.newCustomer.name || !body.newCustomer.phone) {
        return c.json({ success: false, message: "Nama dan nomor telepon pelanggan baru wajib diisi" }, 400);
      }
      const newCust = {
        id: `cust-${Date.now()}`,
        tenantId,
        name: String(body.newCustomer.name).trim(),
        phone: String(body.newCustomer.phone).trim(),
        address: body.newCustomer.address ? String(body.newCustomer.address).trim() : "",
        notes: body.newCustomer.notes ? String(body.newCustomer.notes).trim() : "",
        createdAt: new Date().toISOString(),
      };
      await db.insert(customers).values(newCust);
      customerId = newCust.id;
    }

    if (!customerId) {
      return c.json({ success: false, message: "Pelanggan belum dipilih atau belum diisi" }, 400);
    }

    // Verify customer exists and belongs to the tenant
    const custResults = await db.select().from(customers).where(eq(customers.id, customerId));
    const cust = custResults[0];
    if (!cust) {
      return c.json({ success: false, message: "Data pelanggan tidak ditemukan" }, 404);
    }
    if (user.role !== "superadmin" && cust.tenantId !== tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Pelanggan bukan milik outlet Anda" }, 403);
    }

    const count = (await db.select().from(orders)).length + 1;
    const invoiceNo = `INV-${new Date().toISOString().slice(0, 7).replace("-", "")}-${String(count).padStart(3, "0")}`;

    let finalServiceType = body.serviceType || "Cuci Komplit (Kg)";
    let finalWeightOrQty = Number(body.weightOrQty) || 0;
    let finalUnit = body.unit || "kg";
    let finalPricePerUnit = Number(body.pricePerUnit) || 0;
    let finalTotalAmount = Number(body.totalAmount) || 0;
    let itemsJson: string | null = null;

    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      itemsJson = JSON.stringify(body.items);
      finalServiceType = body.items.map((it: any) => it.serviceType).join(", ");
      finalTotalAmount = body.items.reduce(
        (sum: number, it: any) =>
          sum + (Number(it.subtotal) || Number(it.weightOrQty) * Number(it.pricePerUnit)),
        0
      );
      finalWeightOrQty = body.items.reduce(
        (sum: number, it: any) => sum + (Number(it.weightOrQty) || 0),
        0
      );
      finalUnit = body.items[0]?.unit || "kg";
      finalPricePerUnit = body.items[0]?.pricePerUnit || 0;
    }

    // Calculate estimated completion SLA
    let estimatedCompletionAt = body.estimatedCompletionAt || null;
    if (!estimatedCompletionAt) {
      const durationHours = Number(body.durationHours) || (finalServiceType.toLowerCase().includes("express") ? 6 : finalServiceType.toLowerCase().includes("kilat") ? 24 : 48);
      estimatedCompletionAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
    }

    const paymentStatus = body.paymentStatus || "unpaid";
    let paidAt: string | null = null;
    let paidShiftId: string | null = null;

    if (paymentStatus === "paid") {
      paidAt = new Date().toISOString();
      const openShifts = await db
        .select()
        .from(shifts)
        .where(and(eq(shifts.tenantId, tenantId), eq(shifts.status, "open")));
      const matchingShift = openShifts.find((s) => s.userId === user.userId) || openShifts[0];
      paidShiftId = matchingShift ? matchingShift.id : null;
    }

    const newOrder = {
      id: `ord-${Date.now()}`,
      tenantId,
      customerId,
      invoiceNo,
      serviceType: finalServiceType,
      weightOrQty: finalWeightOrQty,
      unit: finalUnit,
      pricePerUnit: finalPricePerUnit,
      totalAmount: finalTotalAmount,
      items: itemsJson,
      status: body.status || "process",
      paymentStatus,
      paymentMethod: body.paymentMethod || "cash",
      notes: body.notes || "",
      paidAt,
      paidShiftId,
      createdAt: new Date().toISOString(),
      estimatedCompletionAt,
    };

    await db.insert(orders).values(newOrder);

    // -------------------------------------------------------------
    // Auto WhatsApp on Order Creation (Konfirmasi Pesanan / Struk Digital)
    // -------------------------------------------------------------
    let waData = null;
    const tenantResults = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    const tenant = tenantResults[0];

    if (cust && cust.phone) {
      const cleanPhone = cust.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
      const outletName = tenant ? tenant.outletName : "Laundry Cleanique";
      const paymentNote = (body.paymentStatus === "paid") ? "✅ LUNAS" : `⚠️ BELUM LUNAS (Rp ${finalTotalAmount.toLocaleString("id-ID")})`;

      let itemsFormattedText = `🧺 *Layanan:* ${finalServiceType} (${finalWeightOrQty} ${finalUnit})`;
      if (body.items && Array.isArray(body.items) && body.items.length > 0) {
        itemsFormattedText =
          `🧺 *Rincian Cucian:*\n` +
          body.items
            .map(
              (it: any) =>
                `• ${it.serviceType}: ${it.weightOrQty} ${it.unit} @ Rp ${(it.pricePerUnit || 0).toLocaleString("id-ID")} = Rp ${(it.subtotal || (Number(it.weightOrQty) * Number(it.pricePerUnit))).toLocaleString("id-ID")}`
            )
            .join("\n");
      }

      const formattedDate = new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());

      const slaText = estimatedCompletionAt
        ? new Intl.DateTimeFormat("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(estimatedCompletionAt))
        : "-";

      const origin = c.req.header("origin") || "http://localhost:5173";
      const trackingUrl = `${origin}/track/${encodeURIComponent(invoiceNo)}`;

      const messageText = `Halo Kak ${cust.name}! 👋 Terima kasih telah mencuci di *${outletName}*.\n\nPesanan cucian Anda telah kami terima dengan rincian nota digital berikut:\n\n📄 *No. Nota:* ${invoiceNo}\n📅 *Waktu Masuk:* ${formattedDate}\n${itemsFormattedText}\n💵 *Total Biaya:* Rp ${finalTotalAmount.toLocaleString("id-ID")}\n💰 *Status Bayar:* ${paymentNote}\n⏱️ *Estimasi Selesai:* ${slaText}\n\n🔍 *Cek Progres Cucian Mandiri:* \n${trackingUrl}\n\n⏰ *Jam Buka Outlet:*\n• Senin - Jumat : 08.00 - 16.00\n• Sabtu : 08.00 - 13.00\n\nKami akan mengabari Anda kembali via WhatsApp begitu cucian selesai dan siap diambil. Terima kasih! 🙏`;

      waData = {
        phone: cleanPhone,
        message: messageText,
        waUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`,
      };

      let waStatus = "sent";
      let waError = null;
      const isBaileysReady = tenant?.waMode === "baileys" || getWhatsAppStatus(tenantId).status === "connected";
      if (isBaileysReady) {
        try {
          const sendRes = await sendWhatsAppMessage(tenantId, cust.phone, messageText);
          if (sendRes.success) {
            (waData as any).autoSent = true;
            waStatus = "sent";
          } else {
            waStatus = "failed";
            waError = sendRes.error || "Gagal mengirim via Baileys";
          }
        } catch (waErr: any) {
          console.error("[Baileys WA] Auto-send creation notice:", waErr);
          waStatus = "failed";
          waError = waErr?.message || "Baileys connection error";
        }
      }

      // Record to wa_logs
      try {
        await db.insert(waLogs).values({
          id: `walog-${Date.now()}`,
          tenantId,
          orderId: newOrder.id,
          recipientPhone: cleanPhone,
          recipientName: cust.name,
          messagePreview: messageText.slice(0, 200),
          status: waStatus,
          mode: tenant?.waMode === "baileys" ? "baileys" : "manual",
          errorMessage: waError,
          createdAt: new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn("[waLogs] Failed to insert log:", logErr);
      }
    }

    return c.json({
      success: true,
      message: "Order berhasil dibuat",
      data: {
        ...newOrder,
        items: body.items || null,
      },
      waData,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Update Order Status & Generate WhatsApp notification template
app.patch("/api/orders/:id/status", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const { status } = await c.req.json();

    const existingResults = await db.select().from(orders).where(eq(orders.id, id));
    const existing = existingResults[0];
    if (!existing) {
      return c.json({ success: false, message: "Order tidak ditemukan" }, 404);
    }

    if (user.role !== "superadmin" && existing.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Pesanan bukan milik outlet Anda" }, 403);
    }

    if (existing.status === "completed") {
      return c.json(
        { success: false, message: "Pesanan sudah selesai dan status tidak dapat diubah lagi" },
        400
      );
    }

    const completedAt = status === "completed" ? new Date().toISOString() : null;
    const paymentStatus = status === "completed" ? "paid" : existing.paymentStatus;
    const updatePayload: any = { status, completedAt, paymentStatus };

    if (paymentStatus === "paid" && existing.paymentStatus !== "paid") {
      updatePayload.paidAt = new Date().toISOString();
      const openShifts = await db
        .select()
        .from(shifts)
        .where(and(eq(shifts.tenantId, existing.tenantId), eq(shifts.status, "open")));
      const matchingShift = openShifts.find((s) => s.userId === user.userId) || openShifts[0];
      updatePayload.paidShiftId = matchingShift ? matchingShift.id : null;
    }

    await db
      .update(orders)
      .set(updatePayload)
      .where(eq(orders.id, id));

    // Get customer info for WA notification
    const custResults = await db.select().from(customers).where(eq(customers.id, existing.customerId));
    const cust = custResults[0];
    const tenantResults = await db.select().from(tenants).where(eq(tenants.id, existing.tenantId));
    const tenant = tenantResults[0];

    // WhatsApp notification ONLY prepared and sent when status is "ready" (Siap Diambil)
    let waData = null;
    if (status === "ready" && cust && cust.phone) {
      const cleanPhone = cust.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
      const outletName = tenant ? tenant.outletName : "Laundry Cleanique";
      const paymentNote = existing.paymentStatus === "paid" ? "✅ LUNAS" : `⚠️ BELUM LUNAS (Rp ${existing.totalAmount.toLocaleString("id-ID")})`;
      const origin = c.req.header("origin") || "http://localhost:5173";
      const trackingUrl = `${origin}/track/${encodeURIComponent(existing.invoiceNo)}`;

      let parsedOrderItems = null;
      if (existing.items) {
        try {
          parsedOrderItems = typeof existing.items === "string" ? JSON.parse(existing.items) : existing.items;
        } catch {}
      }

      let itemsFormattedText = `🧺 *Layanan:* ${existing.serviceType} (${existing.weightOrQty} ${existing.unit})`;
      if (parsedOrderItems && Array.isArray(parsedOrderItems) && parsedOrderItems.length > 0) {
        itemsFormattedText =
          `🧺 *Rincian Cucian:*\n` +
          parsedOrderItems
            .map(
              (it: any) =>
                `• ${it.serviceType}: ${it.weightOrQty} ${it.unit} @ Rp ${(it.pricePerUnit || 0).toLocaleString("id-ID")} = Rp ${(it.subtotal || (Number(it.weightOrQty) * Number(it.pricePerUnit))).toLocaleString("id-ID")}`
            )
            .join("\n");
      }

      const messageText = `Halo Kak ${cust.name}! 👋\n\nKabar gembira, cucian Anda di *${outletName}* sudah *SELESAI & SIAP DIAMBIL* 🧺✨\n\n📄 *No. Nota:* ${existing.invoiceNo}\n${itemsFormattedText}\n💰 *Status Bayar:* ${paymentNote}\n\n🔍 *Detail Resi:* \n${trackingUrl}\n\n⏰ *Jam Buka Outlet:*\n• Senin - Jumat : 08.00 - 16.00\n• Sabtu : 08.00 - 13.00\n\nTerima kasih telah mempercayakan pakaian Anda kepada kami! 🙏`;

      waData = {
        phone: cleanPhone,
        message: messageText,
        waUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`,
      };

      // Auto-send via Baileys if tenant waMode is 'baileys' or connected and order is ready
      let waStatus = "sent";
      let waError = null;
      const isBaileysReady = tenant?.waMode === "baileys" || getWhatsAppStatus(existing.tenantId).status === "connected";
      if (isBaileysReady) {
        try {
          const sendRes = await sendWhatsAppMessage(existing.tenantId, cust.phone, messageText);
          if (sendRes.success) {
            (waData as any).autoSent = true;
            waStatus = "sent";
          } else {
            waStatus = "failed";
            waError = sendRes.error || "Gagal mengirim via Baileys";
          }
        } catch (waErr: any) {
          console.error("[Baileys WA] Auto-send notice:", waErr);
          waStatus = "failed";
          waError = waErr?.message || "Baileys connection error";
        }
      }

      // Record to wa_logs
      try {
        await db.insert(waLogs).values({
          id: `walog-${Date.now()}`,
          tenantId: existing.tenantId,
          orderId: existing.id,
          recipientPhone: cleanPhone,
          recipientName: cust.name,
          messagePreview: messageText.slice(0, 200),
          status: waStatus,
          mode: tenant?.waMode === "baileys" ? "baileys" : "manual",
          errorMessage: waError,
          createdAt: new Date().toISOString(),
        });
      } catch (logErr) {
        console.warn("[waLogs] Failed to insert log:", logErr);
      }
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
app.patch("/api/orders/:id/payment", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const { paymentStatus, paymentMethod } = await c.req.json();

    const existingResults = await db.select().from(orders).where(eq(orders.id, id));
    const existing = existingResults[0];
    if (!existing) {
      return c.json({ success: false, message: "Order tidak ditemukan" }, 404);
    }

    if (user.role !== "superadmin" && existing.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Pesanan bukan milik outlet Anda" }, 403);
    }

    if (existing.status === "completed") {
      return c.json(
        { success: false, message: "Pesanan sudah selesai dan pembayaran tidak dapat diubah lagi" },
        400
      );
    }

    const updatePayload: any = {
      paymentStatus,
      paymentMethod: paymentMethod || existing.paymentMethod || "cash",
    };

    if (paymentStatus === "paid" && existing.paymentStatus !== "paid") {
      updatePayload.paidAt = new Date().toISOString();
      const openShifts = await db
        .select()
        .from(shifts)
        .where(and(eq(shifts.tenantId, existing.tenantId), eq(shifts.status, "open")));
      const matchingShift = openShifts.find((s) => s.userId === user.userId) || openShifts[0];
      updatePayload.paidShiftId = matchingShift ? matchingShift.id : null;
    } else if (paymentStatus === "unpaid") {
      updatePayload.paidAt = null;
      updatePayload.paidShiftId = null;
    }

    await db
      .update(orders)
      .set(updatePayload)
      .where(eq(orders.id, id));

    return c.json({ success: true, message: "Status pembayaran berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Update Order (Edit Detail Kasir)
app.put("/api/orders/:id", authMiddleware, async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    const body = await c.req.json();

    const existingResults = await db.select().from(orders).where(eq(orders.id, id));
    const existing = existingResults[0];
    if (!existing) {
      return c.json({ success: false, message: "Order tidak ditemukan" }, 404);
    }

    if (user.role !== "superadmin" && existing.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Pesanan bukan milik outlet Anda" }, 403);
    }

    if (existing.status === "completed") {
      return c.json(
        { success: false, message: "Pesanan sudah selesai dan tidak dapat diubah lagi" },
        400
      );
    }

    const updateData: any = {};
    if (body.customerId !== undefined) updateData.customerId = body.customerId;
    if (body.serviceType !== undefined) updateData.serviceType = body.serviceType;
    if (body.weightOrQty !== undefined) updateData.weightOrQty = Number(body.weightOrQty) || 0;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.pricePerUnit !== undefined) updateData.pricePerUnit = Number(body.pricePerUnit) || 0;
    if (body.totalAmount !== undefined) updateData.totalAmount = Number(body.totalAmount) || 0;
    if (body.items !== undefined) {
      try {
        const itemsArr = Array.isArray(body.items) ? body.items : JSON.parse(body.items);
        updateData.items = JSON.stringify(itemsArr);
        if (itemsArr.length > 0) {
          if (body.serviceType === undefined) {
            updateData.serviceType = itemsArr.map((it: any) => it.serviceType).join(", ");
          }
          if (body.totalAmount === undefined) {
            updateData.totalAmount = itemsArr.reduce(
              (sum: number, it: any) =>
                sum + (Number(it.subtotal) || Number(it.weightOrQty) * Number(it.pricePerUnit)),
              0
            );
          }
          if (body.weightOrQty === undefined) {
            updateData.weightOrQty = itemsArr.reduce(
              (sum: number, it: any) => sum + (Number(it.weightOrQty) || 0),
              0
            );
          }
        }
      } catch {
        updateData.items = typeof body.items === "string" ? body.items : JSON.stringify(body.items);
      }
    }
    if (body.estimatedCompletionAt !== undefined) updateData.estimatedCompletionAt = body.estimatedCompletionAt;
    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === "completed") {
        updateData.completedAt = new Date().toISOString();
        updateData.paymentStatus = "paid";
      }
    }
    if (body.paymentStatus !== undefined && updateData.status !== "completed") {
      updateData.paymentStatus = body.paymentStatus;
    }
    if (body.paymentMethod !== undefined) updateData.paymentMethod = body.paymentMethod;
    if (body.notes !== undefined) updateData.notes = body.notes;

    if (updateData.paymentStatus === "paid" && existing.paymentStatus !== "paid") {
      updateData.paidAt = new Date().toISOString();
      const openShifts = await db
        .select()
        .from(shifts)
        .where(and(eq(shifts.tenantId, existing.tenantId), eq(shifts.status, "open")));
      const matchingShift = openShifts.find((s) => s.userId === user.userId) || openShifts[0];
      updateData.paidShiftId = matchingShift ? matchingShift.id : null;
    } else if (updateData.paymentStatus === "unpaid") {
      updateData.paidAt = null;
      updateData.paidShiftId = null;
    }

    await db.update(orders).set(updateData).where(eq(orders.id, id));

    return c.json({ success: true, message: "Order berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Delete Order: only authenticated superadmins and tenant owners may delete orders.
// The role is taken exclusively from the verified token by requireRole; client-supplied
// headers/query parameters are intentionally ignored.
app.delete(
  "/api/orders/:id",
  authMiddleware,
  requireRole(["superadmin", "tenant_owner"]),
  async (c) => {
    try {
      const user = getUser(c);
      const id = c.req.param("id");

      const existingResults = await db.select().from(orders).where(eq(orders.id, id));
      const existing = existingResults[0];
      if (!existing) {
        return c.json({ success: false, message: "Order tidak ditemukan" }, 404);
      }

      if (user.role !== "superadmin" && existing.tenantId !== user.tenantId) {
        return c.json({ success: false, message: "Akses ditolak: Pesanan bukan milik outlet Anda" }, 403);
      }

      try {
        await db.delete(waLogs).where(eq(waLogs.orderId, id));
      } catch {}

      await db.delete(orders).where(eq(orders.id, id));
      return c.json({ success: true, message: "Order berhasil dihapus" });
    } catch (error: any) {
      return c.json({ success: false, message: error.message }, 500);
    }
  }
);

// 5. Expenses & Income (Buku Arus Kas - Protected: Super Admin & Tenant Owner Only)
app.get("/api/expenses", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const tenantIdQuery = c.req.query("tenantId");
    const targetTenantId =
      user.role === "superadmin"
        ? (tenantIdQuery && tenantIdQuery !== "all" ? tenantIdQuery : null)
        : user.tenantId;

    const expList = targetTenantId
      ? await db
          .select()
          .from(expenses)
          .where(eq(expenses.tenantId, targetTenantId))
          .orderBy(desc(expenses.expenseDate))
      : await db.select().from(expenses).orderBy(desc(expenses.expenseDate));

    return c.json({ success: true, data: expList });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/expenses", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const tenantId = user.role === "superadmin" ? (body.tenantId || user.tenantId || "tenant-01") : user.tenantId;
    if (!tenantId) {
      return c.json({ success: false, message: "Tenant ID tidak valid" }, 400);
    }

    const type = body.type === "income" ? "income" : "expense";

    const newExpense = {
      id: `exp-${Date.now()}`,
      tenantId,
      type,
      category: body.category || (type === "income" ? "Penjualan Retail" : "Lain-lain"),
      amount: Number(body.amount) || 0,
      notes: body.notes || "",
      expenseDate: body.expenseDate || new Date().toISOString().slice(0, 10),
      rentDurationMonths: body.rentDurationMonths ? Number(body.rentDurationMonths) : null,
      rentStartDate: body.rentStartDate || null,
      isAutoGenerated: body.isAutoGenerated === "true" ? "true" : "false",
      createdAt: new Date().toISOString(),
    };

    await db.insert(expenses).values(newExpense);
    return c.json({
      success: true,
      message: type === "income" ? "Pemasukan berhasil dicatat" : "Pengeluaran berhasil dicatat",
      data: newExpense,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Endpoint Analisa Kesehatan Bisnis & Audit Bahan
app.get("/api/reports/business-health", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const targetTenantId = user.role === "superadmin" && c.req.query("tenantId") ? c.req.query("tenantId") : user.tenantId;
    if (!targetTenantId) {
      return c.json({ success: false, message: "Tenant ID diperlukan" }, 400);
    }

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, targetTenantId));
    const allOrders = await db.select().from(orders).where(eq(orders.tenantId, targetTenantId));
    const allExpenses = await db.select().from(expenses).where(eq(expenses.tenantId, targetTenantId));

    let customRatios = null;
    if (tenant?.customSopRatios) {
      try {
        customRatios = JSON.parse(tenant.customSopRatios);
      } catch {}
    }

    const health = calculateBusinessHealth({
      orders: allOrders,
      expenses: allExpenses,
      customRatios,
    });

    let customCategories: string[] = [];
    if (tenant?.customExpenseCategories) {
      try {
        customCategories = JSON.parse(tenant.customExpenseCategories);
      } catch {}
    }

    return c.json({
      success: true,
      data: {
        ...health,
        customExpenseCategories: customCategories,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Endpoint Pengaturan Skema Biaya & Takaran SOP Bahan Outlet
app.put("/api/tenants/:id/expense-settings", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    if (user.role !== "superadmin" && user.tenantId !== id) {
      return c.json({ success: false, message: "Akses ditolak" }, 403);
    }

    const body = await c.req.json();
    const updateData: any = {};
    if (body.customExpenseCategories !== undefined) {
      updateData.customExpenseCategories =
        typeof body.customExpenseCategories === "string"
          ? body.customExpenseCategories
          : JSON.stringify(body.customExpenseCategories);
    }
    if (body.customSopRatios !== undefined) {
      updateData.customSopRatios =
        typeof body.customSopRatios === "string"
          ? body.customSopRatios
          : JSON.stringify(body.customSopRatios);
    }

    await db.update(tenants).set(updateData).where(eq(tenants.id, id));
    return c.json({ success: true, message: "Pengaturan biaya berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.delete("/api/expenses/:id", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");

    const [existing] = await db.select().from(expenses).where(eq(expenses.id, id));
    if (!existing) {
      return c.json({ success: false, message: "Catatan transaksi tidak ditemukan" }, 404);
    }

    if (user.role !== "superadmin" && existing.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Catatan transaksi bukan milik outlet Anda" }, 403);
    }

    await db.delete(expenses).where(eq(expenses.id, id));
    return c.json({ success: true, message: "Catatan transaksi berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 6. Cashflow Statistics & Dashboard (Protected: Super Admin & Tenant Owner Only)
app.get("/api/stats/cashflow", authMiddleware, requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const tenantIdQuery = c.req.query("tenantId");
    const targetTenantId =
      user.role === "superadmin"
        ? (tenantIdQuery && tenantIdQuery !== "all" ? tenantIdQuery : null)
        : user.tenantId;

    const orderList = targetTenantId
      ? await db.select().from(orders).where(eq(orders.tenantId, targetTenantId))
      : await db.select().from(orders);

    const expList = targetTenantId
      ? await db.select().from(expenses).where(eq(expenses.tenantId, targetTenantId))
      : await db.select().from(expenses);

    // Pemasukan dari order yang sudah lunas/selesai
    const orderIncome = orderList
      .filter((o) => (o.paymentStatus === "paid" || o.status === "completed") && o.status !== "cancelled")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Pemasukan manual dari tabel expenses (type === 'income')
    const manualIncome = expList
      .filter((e) => (e as any).type === "income")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalIncome = orderIncome + manualIncome;

    const pendingPaymentAmount = orderList
      .filter((o) => o.paymentStatus === "unpaid" && o.status !== "completed" && o.status !== "cancelled")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    // Pengeluaran operasional (type === 'expense' atau default)
    const totalExpense = expList
      .filter((e) => (e as any).type !== "income")
      .reduce((sum, e) => sum + e.amount, 0);

    const netProfit = totalIncome - totalExpense;

    const activeOrdersCount = orderList.filter((o) =>
      ["process", "diproses", "pending", "washing", "drying_ironing", "ready"].includes(o.status)
    ).length;

    const readyOrdersCount = orderList.filter((o) => o.status === "ready").length;
    const completedOrdersCount = orderList.filter((o) => o.status === "completed").length;
    const cancelledOrdersCount = orderList.filter((o) => o.status === "cancelled").length;

    return c.json({
      success: true,
      data: {
        totalIncome,
        orderIncome,
        manualIncome,
        pendingPaymentAmount,
        totalExpense,
        netProfit,
        totalOrdersCount: orderList.filter((o) => o.status !== "cancelled").length,
        activeOrdersCount,
        readyOrdersCount,
        completedOrdersCount,
        cancelledOrdersCount,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// -------------------------------------------------------------
// AI Operational Assistant (In-Web Dashboard)
// -------------------------------------------------------------
app.post(
  "/api/ai/chat",
  authMiddleware,
  rateLimit({ max: 30, windowMs: 60 * 1000 }),
  async (c) => {
    try {
      const user = getUser(c);
      const body = await c.req.json();
      const { message, history } = body;

      if (!message || typeof message !== "string" || !message.trim()) {
        return c.json({ success: false, message: "Pesan tidak boleh kosong" }, 400);
      }

      const tenantId = user.role === "superadmin" && body.tenantId ? body.tenantId : user.tenantId;

      const aiResult = await askLaundryAssistant({
        message: message.trim(),
        tenantId,
        user: {
          userId: user.userId,
          role: user.role,
        },
        history: Array.isArray(history) ? history : [],
      });

      return c.json({
        success: true,
        data: aiResult,
      });
    } catch (error: any) {
      console.error("[/api/ai/chat ERROR]:", error);
      return c.json({ success: false, message: error.message }, 500);
    }
  }
);

const port = Number(process.env.PORT) || 5000;
console.log(`🚀 Laundry Cleanique API listening on port ${port} (PostgreSQL)`);

export { app };
export default {
  port,
  fetch: app.fetch,
};
