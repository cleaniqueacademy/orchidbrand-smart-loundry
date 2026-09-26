import { db } from "../../db/index";
import { orders, tenants, expenses } from "../../db/schema";
import { eq } from "drizzle-orm";
import { OperationalContext } from "./types";
import { calculateBusinessHealth, SopRatios } from "../../utils/businessHealth";

/**
 * Mengumpulkan data operasional outlet secara realtime untuk konteks AI
 */
export async function getOperationalContext(
  tenantId: string | null,
  userRole: string = "staff"
): Promise<OperationalContext> {
  if (!tenantId) {
    return {
      outletName: "Pusat / Superadmin",
      todayStr: new Date().toLocaleDateString("id-ID", { dateStyle: "full" }),
      ordersTodayCount: 0,
      revenueToday: 0,
      processCount: 0,
      readyCount: 0,
      completedCount: 0,
      unpaidCount: 0,
    };
  }

  const tenantRows = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  const tenant = tenantRows[0];
  const outletName = tenant ? tenant.outletName : "Cleanique Laundry";

  const todayIsoPrefix = new Date().toISOString().slice(0, 10);
  const allOrders = await db.select().from(orders).where(eq(orders.tenantId, tenantId));

  const ordersToday = allOrders.filter(
    (o) => o.createdAt && o.createdAt.startsWith(todayIsoPrefix)
  );

  const revenueToday = ordersToday
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  const processCount = allOrders.filter((o) => o.status === "process").length;
  const readyCount = allOrders.filter((o) => o.status === "ready").length;
  const completedCount = ordersToday.filter((o) => o.status === "completed").length;
  const unpaidCount = allOrders.filter((o) => o.paymentStatus === "unpaid").length;

  let businessHealth: OperationalContext["businessHealth"] = undefined;

  // Hanya jika pemanggil adalah Pemilik Outlet atau Superadmin: sediakan data finansial mendalam & kesehatan bisnis
  const isOwnerOrSuper = userRole === "tenant_owner" || userRole === "superadmin" || userRole === "owner";
  if (isOwnerOrSuper) {
    try {
      const allExpenses = await db.select().from(expenses).where(eq(expenses.tenantId, tenantId));

      let customRatios: Partial<SopRatios> | null = null;
      if (tenant?.customSopRatios) {
        try {
          customRatios = JSON.parse(tenant.customSopRatios);
        } catch {
          // ignore json parse error
        }
      }

      const health = calculateBusinessHealth({
        orders: allOrders,
        expenses: allExpenses,
        customRatios,
      });

      businessHealth = {
        healthScore: health.healthScore,
        ratingText: health.ratingText,
        totalWashKg: health.totalWashKg,
        monthlyRevenue: health.paidRevenue,
        monthlyExpense: health.effectiveMonthlyExpense,
        monthlyNetProfit: health.netProfit,
        netMarginPct: health.netMarginPct,
        chemicalRatioPct: health.chemicalRatioPct,
        materials: health.materials.map((m) => ({
          name: m.name,
          estimatedQty: m.estimatedQty,
          unitLabel: m.unitLabel,
          estimatedCost: m.estimatedCost,
          actualCost: m.actualCost,
          statusText: m.statusText,
        })),
        rent: {
          hasRent: health.rent.hasRent,
          remainingMonths: health.rent.remainingMonths,
          endDate: health.rent.endDate,
          monthlyAmortization: health.rent.monthlyAmortization,
        },
        recommendations: health.recommendations,
      };
    } catch (err) {
      console.warn("[getOperationalContext] Failed to compute businessHealth:", err);
    }
  }

  return {
    outletName,
    todayStr: new Date().toLocaleDateString("id-ID", { dateStyle: "full" }),
    ordersTodayCount: ordersToday.length,
    revenueToday,
    processCount,
    readyCount,
    completedCount,
    unpaidCount,
    businessHealth,
  };
}
