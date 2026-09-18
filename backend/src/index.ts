import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { db, initPostgresTables } from "./db/index";
import { users, tenants, customers, orders, expenses, services } from "./db/schema";
import { eq, desc } from "drizzle-orm";
import whatsappRoutes from "./routes/whatsapp";
import { sendWhatsAppMessage, autoRestoreSavedSessions } from "./services/whatsapp";

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
          rackNumber: order.status === "ready" ? order.rackNumber : null,
          notes: order.notes,
          items: parsedItems,
          createdAt: order.createdAt,
          estimatedCompletionAt: order.estimatedCompletionAt,
          completedAt: order.completedAt,
        },
        outlet: {
          outletName: tenant?.outletName || "Orchid Smart Laundry",
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

// 3. Master Services CRUD per Tenant
const DEFAULT_PRESET_SERVICES = [
  { name: "Cuci Komplit Reguler", unit: "kg", pricePerUnit: 8000, minOrder: 3, durationHours: 48 },
  { name: "Cuci Komplit Kilat", unit: "kg", pricePerUnit: 12000, minOrder: 2, durationHours: 24 },
  { name: "Cuci Komplit Express", unit: "kg", pricePerUnit: 16000, minOrder: 1, durationHours: 6 },
  { name: "Cuci Kering Saja", unit: "kg", pricePerUnit: 6000, minOrder: 2, durationHours: 24 },
  { name: "Setrika Uap Saja", unit: "kg", pricePerUnit: 6000, minOrder: 2, durationHours: 24 },
  { name: "Cuci Bedcover King", unit: "pcs", pricePerUnit: 35000, minOrder: 1, durationHours: 48 },
  { name: "Cuci Bedcover Single", unit: "pcs", pricePerUnit: 25000, minOrder: 1, durationHours: 48 },
  { name: "Cuci Sepatu Premium", unit: "pasang", pricePerUnit: 25000, minOrder: 1, durationHours: 48 },
  { name: "Cuci Karpet", unit: "meter", pricePerUnit: 15000, minOrder: 1, durationHours: 72 },
  { name: "Cuci Selimut", unit: "pcs", pricePerUnit: 20000, minOrder: 1, durationHours: 48 },
];

app.get("/api/services", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    if (!tenantId || tenantId === "all") {
      const allServices = await db.select().from(services);
      return c.json({ success: true, data: allServices });
    }

    let existingServices = await db
      .select()
      .from(services)
      .where(eq(services.tenantId, tenantId));

    // Auto-seed default services for tenant if none exist yet
    if (existingServices.length === 0) {
      for (const def of DEFAULT_PRESET_SERVICES) {
        await db.insert(services).values({
          id: `srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          tenantId,
          name: def.name,
          unit: def.unit,
          pricePerUnit: def.pricePerUnit,
          minOrder: def.minOrder,
          durationHours: def.durationHours,
          status: "active",
          createdAt: new Date().toISOString(),
        });
      }
      existingServices = await db.select().from(services).where(eq(services.tenantId, tenantId));
    }

    return c.json({ success: true, data: existingServices });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/services", async (c) => {
  try {
    const body = await c.req.json();
    const { tenantId, name, unit, pricePerUnit, minOrder, durationHours, status } = body;

    if (!tenantId || !name || pricePerUnit === undefined) {
      return c.json({ success: false, message: "Tenant, Nama Layanan, dan Tarif wajib diisi" }, 400);
    }

    const newService = {
      id: `srv-${Date.now()}`,
      tenantId,
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

app.put("/api/services/:id", async (c) => {
  try {
    const id = c.req.param("id");
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

app.delete("/api/services/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(services).where(eq(services.id, id));
    return c.json({ success: true, message: "Layanan berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 2. Tenants & Users (Superadmin view)
app.get("/api/tenants", async (c) => {
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

app.post("/api/tenants", async (c) => {
  try {
    const body = await c.req.json();
    const { ownerName, ownerEmail, password, outletName, phone, address, services } = body;

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
      services: services ? (typeof services === "string" ? services : JSON.stringify(services)) : null,
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

app.put("/api/tenants/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { outletName, phone, address, status, subscriptionUntil, services, ownerName } = body;

    const updateData: any = {};
    if (outletName !== undefined) updateData.outletName = outletName;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (status !== undefined) updateData.status = status;
    if (subscriptionUntil !== undefined) updateData.subscriptionUntil = subscriptionUntil;
    if (services !== undefined) {
      updateData.services = typeof services === "string" ? services : JSON.stringify(services);
    }

    await db.update(tenants).set(updateData).where(eq(tenants.id, id));

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

app.patch("/api/tenants/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { status, subscriptionUntil } = body;

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (subscriptionUntil !== undefined) updateData.subscriptionUntil = subscriptionUntil;

    await db.update(tenants).set(updateData).where(eq(tenants.id, id));
    return c.json({ success: true, message: "Status cabang / langganan berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.delete("/api/tenants/:id", async (c) => {
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

    const userTenant = (await db.select().from(tenants).where(eq(tenants.userId, foundUser.id)))[0];
    const userSummary = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role,
      status: foundUser.status || "active",
      subscriptionUntil: foundUser.subscriptionUntil,
      tenantId: userTenant ? userTenant.id : null,
      tenantName: userTenant ? userTenant.outletName : null,
    };

    if (foundUser.status === "inactive" && foundUser.role !== "superadmin") {
      return c.json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "Akun Anda berstatus NONAKTIF. Hubungi Super Admin untuk aktivasi langganan offline Anda.",
        user: userSummary,
      }, 403);
    }

    if (foundUser.role !== "superadmin" && foundUser.subscriptionUntil) {
      const expDate = new Date(`${foundUser.subscriptionUntil}T23:59:59`);
      if (!isNaN(expDate.getTime()) && expDate < new Date()) {
        return c.json({
          success: false,
          code: "SUBSCRIPTION_EXPIRED",
          message: `Masa aktif akun Anda telah berakhir pada ${foundUser.subscriptionUntil}. Silakan hubungi Super Admin untuk perpanjangan.`,
          user: userSummary,
        }, 403);
      }
    }

    // Generate session token
    const token = Buffer.from(
      JSON.stringify({
        userId: foundUser.id,
        role: foundUser.role,
        tenantId: userTenant?.id || null,
        exp: Date.now() + 7 * 24 * 3600 * 1000,
      })
    ).toString("base64");

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
    const userTenant = (await db.select().from(tenants).where(eq(tenants.userId, foundUser.id)))[0];

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
app.get("/api/users", async (c) => {
  try {
    const allUsers = await db.select().from(users);
    const allTenants = await db.select().from(tenants);

    const enrichedUsers = allUsers.map((u) => {
      const userTenant = allTenants.find((t) => t.userId === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status || "active",
        subscriptionUntil: u.subscriptionUntil || null,
        createdAt: u.createdAt,
        tenantId: userTenant ? userTenant.id : null,
        tenantName: userTenant ? userTenant.outletName : null,
      };
    });

    return c.json({ success: true, data: enrichedUsers });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/users", async (c) => {
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
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.put("/api/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { name, email, role, password, tenantId, status, subscriptionUntil } = body;

    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name;
    if (email !== undefined) updatePayload.email = email;
    if (role !== undefined) updatePayload.role = role;
    if (password !== undefined && String(password).trim()) {
      updatePayload.passwordHash = await Bun.password.hash(String(password).trim(), { algorithm: "bcrypt", cost: 10 });
    }
    if (status !== undefined) updatePayload.status = status;
    if (subscriptionUntil !== undefined) updatePayload.subscriptionUntil = subscriptionUntil;

    await db.update(users).set(updatePayload).where(eq(users.id, id));

    if (tenantId) {
      await db.update(tenants).set({ userId: id }).where(eq(tenants.id, tenantId));
    }

    return c.json({ success: true, message: "Data pengguna berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.patch("/api/users/:id/status", async (c) => {
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

// Perpanjang masa aktif pengguna (+X hari atau tanggal tertentu)
app.post("/api/users/:id/extend", async (c) => {
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

app.delete("/api/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(users).where(eq(users.id, id));
    return c.json({ success: true, message: "Pengguna berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Reset Password Pengguna (Khusus Admin atau Pemilik)
app.post("/api/users/:id/reset-password", async (c) => {
  try {
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

    await db
      .update(users)
      .set({ passwordHash: newPassword.trim() })
      .where(eq(users.id, id));

    return c.json({
      success: true,
      message: `Kata sandi untuk ${targetUser.name} (${targetUser.email}) berhasil direset.`,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 3. Customers
app.get("/api/customers", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    const custList =
      tenantId && tenantId !== "all"
        ? await db.select().from(customers).where(eq(customers.tenantId, tenantId))
        : await db.select().from(customers);

    return c.json({ success: true, data: custList });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/customers", async (c) => {
  try {
    const body = await c.req.json();
    const tenantId = body.tenantId && body.tenantId !== "all" ? body.tenantId : "tenant-01";
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

app.put("/api/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
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

app.delete("/api/customers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(customers).where(eq(customers.id, id));
    return c.json({ success: true, message: "Pelanggan berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 4. Orders
app.get("/api/orders", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    const orderList =
      tenantId && tenantId !== "all"
        ? await db
            .select()
            .from(orders)
            .where(eq(orders.tenantId, tenantId))
            .orderBy(desc(orders.createdAt))
        : await db.select().from(orders).orderBy(desc(orders.createdAt));

    const custList = await db.select().from(customers);

    const enriched = orderList.map((ord) => {
      const cust = custList.find((c) => c.id === ord.customerId);
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
      paymentStatus: body.paymentStatus || "unpaid",
      paymentMethod: body.paymentMethod || "cash",
      notes: body.notes || "",
      rackNumber: body.rackNumber ? String(body.rackNumber).trim() : null,
      createdAt: new Date().toISOString(),
      estimatedCompletionAt,
    };

    await db.insert(orders).values(newOrder);
    return c.json({
      success: true,
      message: "Order berhasil dibuat",
      data: {
        ...newOrder,
        items: body.items || null,
      },
    });
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

    if (existing.status === "completed") {
      return c.json(
        { success: false, message: "Pesanan sudah selesai dan status tidak dapat diubah lagi" },
        400
      );
    }

    const completedAt = status === "completed" ? new Date().toISOString() : null;
    const paymentStatus = status === "completed" ? "paid" : existing.paymentStatus;

    await db
      .update(orders)
      .set({ status, completedAt, paymentStatus })
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
      const outletName = tenant ? tenant.outletName : "Orchid Brand Smart Laundry";
      const paymentNote = existing.paymentStatus === "paid" ? "✅ LUNAS" : `⚠️ BELUM LUNAS (Rp ${existing.totalAmount.toLocaleString("id-ID")})`;
      const rackText = existing.rackNumber ? `\n📍 *Lokasi Rak/Keranjang:* ${existing.rackNumber}` : "";

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

      const messageText = `Halo Kak ${cust.name}! 👋\n\nKabar gembira, cucian Anda di *${outletName}* sudah *SELESAI & SIAP DIAMBIL* 🧺✨\n\n📄 *No. Nota:* ${existing.invoiceNo}\n${itemsFormattedText}\n💰 *Status Bayar:* ${paymentNote}${rackText}\n\n⏰ *Jam Buka Outlet:*\n• Senin - Jumat : 08.00 - 16.00\n• Sabtu : 08.00 - 13.00\n\nTerima kasih telah mempercayakan pakaian Anda kepada kami! 🙏`;

      waData = {
        phone: cleanPhone,
        message: messageText,
        waUrl: `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`,
      };

      // Auto-send via Baileys if tenant waMode is 'baileys' and order is ready
      if (tenant?.waMode === "baileys") {
        try {
          const sendRes = await sendWhatsAppMessage(existing.tenantId, cust.phone, messageText);
          if (sendRes.success) {
            (waData as any).autoSent = true;
          }
        } catch (waErr) {
          console.error("[Baileys WA] Auto-send notice:", waErr);
        }
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
app.patch("/api/orders/:id/payment", async (c) => {
  try {
    const id = c.req.param("id");
    const { paymentStatus, paymentMethod } = await c.req.json();

    const existingResults = await db.select().from(orders).where(eq(orders.id, id));
    const existing = existingResults[0];
    if (existing && existing.status === "completed") {
      return c.json(
        { success: false, message: "Pesanan sudah selesai dan pembayaran tidak dapat diubah lagi" },
        400
      );
    }

    await db
      .update(orders)
      .set({ paymentStatus, paymentMethod: paymentMethod || "cash" })
      .where(eq(orders.id, id));

    return c.json({ success: true, message: "Status pembayaran berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Update Order (Edit Detail Kasir)
app.put("/api/orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const existingResults = await db.select().from(orders).where(eq(orders.id, id));
    const existing = existingResults[0];
    if (!existing) {
      return c.json({ success: false, message: "Order tidak ditemukan" }, 404);
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
    if (body.weightOrQty !== undefined) updateData.weightOrQty = Number(body.weightOrQty);
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.pricePerUnit !== undefined) updateData.pricePerUnit = Number(body.pricePerUnit);
    if (body.totalAmount !== undefined) updateData.totalAmount = Number(body.totalAmount);
    if (body.items !== undefined) {
      try {
        const itemsArr = Array.isArray(body.items) ? body.items : typeof body.items === "string" ? JSON.parse(body.items) : [];
        updateData.items = typeof body.items === "string" ? body.items : JSON.stringify(body.items);
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
    if (body.rackNumber !== undefined) updateData.rackNumber = body.rackNumber ? String(body.rackNumber).trim() : null;

    await db.update(orders).set(updateData).where(eq(orders.id, id));

    return c.json({ success: true, message: "Order berhasil diperbarui" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// Delete Order
app.delete("/api/orders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(orders).where(eq(orders.id, id));
    return c.json({ success: true, message: "Order berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 5. Expenses & Income (Buku Arus Kas)
app.get("/api/expenses", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");
    const expList =
      tenantId && tenantId !== "all"
        ? await db
            .select()
            .from(expenses)
            .where(eq(expenses.tenantId, tenantId))
            .orderBy(desc(expenses.expenseDate))
        : await db.select().from(expenses).orderBy(desc(expenses.expenseDate));

    return c.json({ success: true, data: expList });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

app.post("/api/expenses", async (c) => {
  try {
    const body = await c.req.json();
    const tenantId = body.tenantId || "tenant-01";
    const type = body.type === "income" ? "income" : "expense";

    const newExpense = {
      id: `exp-${Date.now()}`,
      tenantId,
      type,
      category: body.category || (type === "income" ? "Penjualan Retail" : "Lain-lain"),
      amount: Number(body.amount) || 0,
      notes: body.notes || "",
      expenseDate: body.expenseDate || new Date().toISOString().slice(0, 10),
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

app.delete("/api/expenses/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(expenses).where(eq(expenses.id, id));
    return c.json({ success: true, message: "Catatan transaksi berhasil dihapus" });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 6. Cashflow Statistics & Dashboard
app.get("/api/stats/cashflow", async (c) => {
  try {
    const tenantId = c.req.query("tenantId");

    const orderList =
      tenantId && tenantId !== "all"
        ? await db.select().from(orders).where(eq(orders.tenantId, tenantId))
        : await db.select().from(orders);

    const expList =
      tenantId && tenantId !== "all"
        ? await db.select().from(expenses).where(eq(expenses.tenantId, tenantId))
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

const port = Number(process.env.PORT) || 5000;
console.log(`🚀 Orchid Brand Smart Laundry API listening on port ${port} (PostgreSQL)`);

export default {
  port,
  fetch: app.fetch,
};
