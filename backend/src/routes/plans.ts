import { Hono } from "hono";
import { db } from "../db/index";
import { plans } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { newId } from "../utils/id";

const planRoutes = new Hono();

/**
 * 1. GET /api/plans/public
 * Mengambil daftar paket langganan aktif untuk halaman publik / registrasi
 */
planRoutes.get("/public", async (c) => {
  try {
    const activePlans = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, "true"))
      .orderBy(plans.sortOrder);

    return c.json({ success: true, data: activePlans });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Rute Manajerial Memerlukan Autentikasi Superadmin
// ---------------------------------------------------------------------------
planRoutes.use("*", authMiddleware);

/**
 * 2. GET /api/plans
 * Mengambil semua paket langganan (aktif & nonaktif)
 */
planRoutes.get("/", requireRole(["superadmin"]), async (c) => {
  try {
    const allPlans = await db.select().from(plans).orderBy(plans.sortOrder);
    return c.json({ success: true, data: allPlans });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 3. POST /api/plans
 * Membuat paket langganan baru
 */
planRoutes.post("/", requireRole(["superadmin"]), async (c) => {
  try {
    const body = await c.req.json();
    const {
      code,
      name,
      description,
      durationMonths = 1,
      pricePerMonth,
      features,
      maxWaNumbers = 1,
      maxStaff = 3,
      aiTokenQuotaDaily = 100,
      isTrialAllowed = "true",
      isActive = "true",
      sortOrder = 0,
    } = body;

    if (!code || !name || pricePerMonth === undefined) {
      return c.json({ success: false, message: "Kode, nama, dan harga paket wajib diisi" }, 400);
    }

    const cleanCode = String(code).trim().toLowerCase();

    // Cek duplikasi kode
    const existing = await db.select().from(plans).where(eq(plans.code, cleanCode));
    if (existing.length > 0) {
      return c.json({ success: false, message: `Kode paket '${cleanCode}' sudah digunakan` }, 400);
    }

    const id = newId("plan");
    const nowIso = new Date().toISOString();

    const [created] = await db
      .insert(plans)
      .values({
        id,
        code: cleanCode,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        durationMonths: Number(durationMonths) || 1,
        pricePerMonth: Number(pricePerMonth) || 0,
        features: features ? JSON.stringify(features) : null,
        maxWaNumbers: Number(maxWaNumbers) || 1,
        maxStaff: Number(maxStaff) || 3,
        aiTokenQuotaDaily: Number(aiTokenQuotaDaily) || 100,
        isTrialAllowed: String(isTrialAllowed) === "false" ? "false" : "true",
        isActive: String(isActive) === "false" ? "false" : "true",
        sortOrder: Number(sortOrder) || 0,
        createdAt: nowIso,
        updatedAt: nowIso,
      })
      .returning();

    return c.json({ success: true, message: "Paket berhasil dibuat", data: created });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 4. GET /api/plans/:id
 * Detail paket
 */
planRoutes.get("/:id", requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID paket diperlukan" }, 400);

    const [found] = await db.select().from(plans).where(eq(plans.id, id));
    if (!found) {
      return c.json({ success: false, message: "Paket tidak ditemukan" }, 404);
    }

    return c.json({ success: true, data: found });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 5. PUT /api/plans/:id
 * Perbarui paket
 */
planRoutes.put("/:id", requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID paket diperlukan" }, 400);

    const body = await c.req.json();
    const [existing] = await db.select().from(plans).where(eq(plans.id, id));

    if (!existing) {
      return c.json({ success: false, message: "Paket tidak ditemukan" }, 404);
    }

    const updates: Partial<typeof plans.$inferInsert> = {
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      description: body.description !== undefined ? body.description : existing.description,
      durationMonths:
        body.durationMonths !== undefined ? Number(body.durationMonths) : existing.durationMonths,
      pricePerMonth:
        body.pricePerMonth !== undefined ? Number(body.pricePerMonth) : existing.pricePerMonth,
      features:
        body.features !== undefined
          ? typeof body.features === "string"
            ? body.features
            : JSON.stringify(body.features)
          : existing.features,
      maxWaNumbers:
        body.maxWaNumbers !== undefined ? Number(body.maxWaNumbers) : existing.maxWaNumbers,
      maxStaff: body.maxStaff !== undefined ? Number(body.maxStaff) : existing.maxStaff,
      aiTokenQuotaDaily:
        body.aiTokenQuotaDaily !== undefined
          ? Number(body.aiTokenQuotaDaily)
          : existing.aiTokenQuotaDaily,
      isTrialAllowed:
        body.isTrialAllowed !== undefined ? String(body.isTrialAllowed) : existing.isTrialAllowed,
      isActive: body.isActive !== undefined ? String(body.isActive) : existing.isActive,
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder,
      updatedAt: new Date().toISOString(),
    };

    const [updated] = await db.update(plans).set(updates).where(eq(plans.id, id)).returning();

    return c.json({ success: true, message: "Paket berhasil diperbarui", data: updated });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 6. DELETE /api/plans/:id
 * Hapus paket
 */
planRoutes.delete("/:id", requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID paket diperlukan" }, 400);

    await db.delete(plans).where(eq(plans.id, id));
    return c.json({ success: true, message: "Paket berhasil dihapus" });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

export default planRoutes;
