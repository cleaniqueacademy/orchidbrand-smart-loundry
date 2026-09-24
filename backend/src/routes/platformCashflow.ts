import { Hono } from "hono";
import { db } from "../db/index";
import { platformCashflow, tenants, users } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware, getUser } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { newId } from "../utils/id";
import { today } from "../utils/date";

const platformCashflowRoutes = new Hono();

platformCashflowRoutes.use("*", authMiddleware);
platformCashflowRoutes.use("*", requireRole(["superadmin"]));

/**
 * 1. GET /api/platform/cashflow
 * Mengambil seluruh data arus kas platform (pemasukan langganan & pengeluaran admin)
 */
platformCashflowRoutes.get("/", async (c) => {
  try {
    const rows = await db
      .select({
        id: platformCashflow.id,
        type: platformCashflow.type,
        category: platformCashflow.category,
        amount: platformCashflow.amount,
        date: platformCashflow.date,
        tenantId: platformCashflow.tenantId,
        referralCode: platformCashflow.referralCode,
        durationMonths: platformCashflow.durationMonths,
        description: platformCashflow.description,
        proofUrl: platformCashflow.proofUrl,
        notes: platformCashflow.notes,
        createdById: platformCashflow.createdByUserId,
        createdAt: platformCashflow.createdAt,
        outletName: tenants.outletName,
      })
      .from(platformCashflow)
      .leftJoin(tenants, eq(platformCashflow.tenantId, tenants.id))
      .orderBy(desc(platformCashflow.createdAt));

    let totalIncome = 0;
    let totalExpense = 0;

    for (const r of rows) {
      if (r.type === "income") {
        totalIncome += Number(r.amount || 0);
      } else if (r.type === "expense") {
        totalExpense += Number(r.amount || 0);
      }
    }

    const netProfit = totalIncome - totalExpense;

    return c.json({
      success: true,
      data: {
        records: rows,
        summary: {
          totalIncome,
          totalExpense,
          netProfit,
          totalTransactions: rows.length,
        },
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 2. POST /api/platform/cashflow
 * Mencatat pengeluaran operasional platform secara manual oleh Superadmin
 */
platformCashflowRoutes.post("/", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();

    const {
      type = "expense",
      category = "other",
      amount,
      description,
      date = today(),
      notes,
      proofUrl,
    } = body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return c.json({ success: false, message: "Nominal wajib diisi dan harus lebih dari 0" }, 400);
    }

    if (!description || !description.trim()) {
      return c.json({ success: false, message: "Keterangan pengeluaran wajib diisi" }, 400);
    }

    const newRecord = {
      id: newId("pcf"),
      type: type === "income" ? "income" : "expense",
      category,
      amount: numAmount,
      date: date || today(),
      description: description.trim(),
      notes: notes ? String(notes).trim() : null,
      proofUrl: proofUrl ? String(proofUrl).trim() : null,
      createdByUserId: user.userId,
      createdAt: new Date().toISOString(),
    };

    await db.insert(platformCashflow).values(newRecord);

    return c.json({
      success: true,
      message: "Arus kas platform berhasil dicatat",
      data: newRecord,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 3. DELETE /api/platform/cashflow/:id
 * Menghapus transaksi kas platform
 */
platformCashflowRoutes.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.delete(platformCashflow).where(eq(platformCashflow.id, id));
    return c.json({ success: true, message: "Catatan kas platform berhasil dihapus" });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

export default platformCashflowRoutes;
