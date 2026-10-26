import { db } from "../../db/index";
import { orders, tenants, expenses, customers, services } from "../../db/schema";
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

  try {
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

    // Hitung Metrik Analitik Pemasaran & Promo Outlet
    let marketingMetrics: OperationalContext["marketingMetrics"] = undefined;
    try {
      const allServices = await db.select().from(services).where(eq(services.tenantId, tenantId));
      const allCustomers = await db.select().from(customers).where(eq(customers.tenantId, tenantId));

      // 1. Distribusi hari dalam sepekan (Day-of-Week)
      const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const dayCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      allOrders.forEach((o) => {
        if (o.createdAt) {
          const d = new Date(o.createdAt).getDay();
          if (!isNaN(d)) dayCounts[d] = (dayCounts[d] || 0) + 1;
        }
      });

      const sortedDays = Object.entries(dayCounts)
        .map(([dayNum, count]) => ({ day: dayNames[Number(dayNum)], count }))
        .sort((a, b) => a.count - b.count);

      // Hari terendah (quiet days) vs hari tertinggi (busiest)
      const quietDays = sortedDays.slice(0, 2).map((d) => d.day);
      const busiestDays = sortedDays.slice(-2).reverse().map((d) => d.day);

      // 2. Popularitas Layanan
      const serviceStats: Record<string, { count: number; revenue: number }> = {};
      allOrders.forEach((o) => {
        const sName = o.serviceType || "Layanan Lain";
        if (!serviceStats[sName]) serviceStats[sName] = { count: 0, revenue: 0 };
        serviceStats[sName].count += 1;
        serviceStats[sName].revenue += Number(o.totalAmount) || 0;
      });

      const topServices = Object.entries(serviceStats)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([name, stat]) => ({ name, orderCount: stat.count, revenue: stat.revenue }));

      // Layanan aktif yang penjualannya rendah (underperforming)
      const underperformingServices = allServices
        .filter((s) => s.status === "active")
        .map((s) => ({
          name: s.name,
          currentPrice: s.pricePerUnit,
          unit: s.unit,
          orderCount: serviceStats[s.name]?.count || 0,
        }))
        .sort((a, b) => a.orderCount - b.orderCount)
        .slice(0, 3);

      // 3. Pelanggan pasif (> 30 hari tidak mencuci)
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const lastOrderPerCust: Record<string, number> = {};
      allOrders.forEach((o) => {
        if (o.customerId && o.createdAt) {
          const t = new Date(o.createdAt).getTime();
          if (!lastOrderPerCust[o.customerId] || t > lastOrderPerCust[o.customerId]) {
            lastOrderPerCust[o.customerId] = t;
          }
        }
      });

      const inactiveCount = allCustomers.filter((c) => {
        const lastOrderTime = lastOrderPerCust[c.id];
        return !lastOrderTime || (now - lastOrderTime > thirtyDaysMs);
      }).length;

      // 4. Batas aman diskon berdasarkan margin laba
      let safeMaxDiscountPct = 15;
      if (businessHealth) {
        if (businessHealth.netMarginPct >= 35) safeMaxDiscountPct = 20;
        else if (businessHealth.netMarginPct >= 20) safeMaxDiscountPct = 15;
        else if (businessHealth.netMarginPct >= 10) safeMaxDiscountPct = 10;
        else safeMaxDiscountPct = 5;
      }

      const totalRevenue = allOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      const averageOrderValue = allOrders.length > 0 ? Math.round(totalRevenue / allOrders.length) : 0;

      marketingMetrics = {
        quietDays,
        busiestDays,
        topServices,
        underperformingServices,
        inactiveCustomersCount: inactiveCount,
        totalCustomersCount: allCustomers.length,
        averageOrderValue,
        safeMaxDiscountPct,
      };
    } catch (mErr) {
      console.warn("[getOperationalContext] Failed to compute marketingMetrics:", mErr);
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
      marketingMetrics,
    };
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
  } catch (err: any) {
    console.warn("[getOperationalContext] Failed to fetch DB context, using fallback:", err?.message);
    return {
      outletName: "Cleanique Laundry",
      todayStr: new Date().toLocaleDateString("id-ID", { dateStyle: "full" }),
      ordersTodayCount: 0,
      revenueToday: 0,
      processCount: 0,
      readyCount: 0,
      completedCount: 0,
      unpaidCount: 0,
    };
  }
}
