import { Order, Tenant } from "../types";
import { formatCurrency } from "./formatUtils";

export type DashboardPeriod = "today" | "7d" | "30d" | "this_month" | "this_year" | "all";

export interface PeriodOption {
  value: DashboardPeriod;
  label: string;
  shortLabel: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "today", label: "Hari Ini", shortLabel: "Hari Ini" },
  { value: "7d", label: "7 Hari Terakhir", shortLabel: "7 Hari" },
  { value: "30d", label: "30 Hari Terakhir", shortLabel: "30 Hari" },
  { value: "this_month", label: "Bulan Ini", shortLabel: "Bulan Ini" },
  { value: "this_year", label: "Tahun Ini", shortLabel: "Tahun Ini" },
  { value: "all", label: "Semua Waktu", shortLabel: "Semua" },
];

/**
 * Helper to get local YYYY-MM-DD string without UTC shift
 */
export function toLocalDateKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Helper to get local YYYY-MM string
 */
export function toLocalMonthKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export interface TrendPoint {
  label: string;
  value: number;
  formattedValue?: string;
  secondaryValue?: string;
  dateKey: string;
}

export interface TrendAnalysisResult {
  chartData: TrendPoint[];
  totalOmset: number;
  totalOrders: number;
  averageOmset: number;
  peakPoint: {
    label: string;
    value: number;
    orders: number;
  } | null;
  periodLabel: string;
  dateRangeText: string;
}

/**
 * Generates revenue / omset time series trend data based on selected period
 */
export function generateTrendData(
  orders: Order[],
  period: DashboardPeriod = "7d",
  options?: { tenantId?: string }
): TrendAnalysisResult {
  const now = new Date();
  const activeOrders = orders.filter((o) => {
    if (o.status === "cancelled") return false;
    if (options?.tenantId && options.tenantId !== "all") {
      return o.tenantId === options.tenantId;
    }
    return true;
  });

  const slots: { label: string; dateKey: string; value: number; ordersCount: number }[] = [];
  let periodLabel = "7 Hari Terakhir";
  let dateRangeText = "";

  if (period === "today") {
    // 6 time buckets for today: 00-04, 04-08, 08-12, 12-16, 16-20, 20-24
    const todayKey = toLocalDateKey(now);
    const timeBuckets = [
      { label: "00:00", startHour: 0, endHour: 4 },
      { label: "04:00", startHour: 4, endHour: 8 },
      { label: "08:00", startHour: 8, endHour: 12 },
      { label: "12:00", startHour: 12, endHour: 16 },
      { label: "16:00", startHour: 16, endHour: 20 },
      { label: "20:00", startHour: 20, endHour: 24 },
    ];

    timeBuckets.forEach((b) => {
      slots.push({
        label: b.label,
        dateKey: `${todayKey}-${b.label}`,
        value: 0,
        ordersCount: 0,
      });
    });

    activeOrders.forEach((o) => {
      const oDate = new Date(o.createdAt);
      if (toLocalDateKey(oDate) === todayKey) {
        const hour = oDate.getHours();
        const bucketIndex = Math.min(Math.floor(hour / 4), timeBuckets.length - 1);
        if (slots[bucketIndex]) {
          slots[bucketIndex].value += o.totalAmount || 0;
          slots[bucketIndex].ordersCount += 1;
        }
      }
    });

    periodLabel = "Hari Ini";
    dateRangeText = now.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } else if (period === "7d") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = toLocalDateKey(d);
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      slots.push({ label, dateKey, value: 0, ordersCount: 0 });
    }

    activeOrders.forEach((o) => {
      const oDateKey = toLocalDateKey(o.createdAt);
      const found = slots.find((s) => s.dateKey === oDateKey);
      if (found) {
        found.value += o.totalAmount || 0;
        found.ordersCount += 1;
      }
    });

    const startD = new Date(now);
    startD.setDate(startD.getDate() - 6);
    periodLabel = "7 Hari Terakhir";
    dateRangeText = `${startD.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    })} – ${now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
  } else if (period === "30d") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = toLocalDateKey(d);
      const label = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
      slots.push({ label, dateKey, value: 0, ordersCount: 0 });
    }

    activeOrders.forEach((o) => {
      const oDateKey = toLocalDateKey(o.createdAt);
      const found = slots.find((s) => s.dateKey === oDateKey);
      if (found) {
        found.value += o.totalAmount || 0;
        found.ordersCount += 1;
      }
    });

    const startD = new Date(now);
    startD.setDate(startD.getDate() - 29);
    periodLabel = "30 Hari Terakhir";
    dateRangeText = `${startD.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    })} – ${now.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
  } else if (period === "this_month") {
    // Days in current month up to today (or end of month)
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateKey = toLocalDateKey(d);
      const label = `${day} ${d.toLocaleDateString("id-ID", { month: "short" })}`;
      slots.push({ label, dateKey, value: 0, ordersCount: 0 });
    }

    activeOrders.forEach((o) => {
      const oDateKey = toLocalDateKey(o.createdAt);
      const found = slots.find((s) => s.dateKey === oDateKey);
      if (found) {
        found.value += o.totalAmount || 0;
        found.ordersCount += 1;
      }
    });

    const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    periodLabel = `Bulan Ini (${monthName})`;
    dateRangeText = `1 – ${daysInMonth} ${monthName}`;
  } else if (period === "this_year") {
    // 12 months of current year
    const currentYear = now.getFullYear();
    for (let m = 0; m < 12; m++) {
      const d = new Date(currentYear, m, 1);
      const dateKey = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "short" });
      slots.push({ label, dateKey, value: 0, ordersCount: 0 });
    }

    activeOrders.forEach((o) => {
      const oDate = new Date(o.createdAt);
      if (oDate.getFullYear() === currentYear) {
        const oMonthKey = toLocalMonthKey(oDate);
        const found = slots.find((s) => s.dateKey === oMonthKey);
        if (found) {
          found.value += o.totalAmount || 0;
          found.ordersCount += 1;
        }
      }
    });

    periodLabel = `Tahun Ini (${currentYear})`;
    dateRangeText = `Januari – Desember ${currentYear}`;
  } else {
    // "all": Monthly breakdown across history or last 12 months minimum
    let earliest = new Date(now);
    earliest.setMonth(earliest.getMonth() - 11);

    activeOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      if (!isNaN(d.getTime()) && d < earliest) {
        earliest = new Date(d);
      }
    });

    const startMonth = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const cursor = new Date(startMonth);
    while (cursor <= endMonth) {
      const dateKey = toLocalMonthKey(cursor);
      const label = cursor.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
      slots.push({ label, dateKey, value: 0, ordersCount: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    activeOrders.forEach((o) => {
      const oMonthKey = toLocalMonthKey(o.createdAt);
      const found = slots.find((s) => s.dateKey === oMonthKey);
      if (found) {
        found.value += o.totalAmount || 0;
        found.ordersCount += 1;
      }
    });

    periodLabel = "Semua Waktu";
    dateRangeText = `${slots[0]?.label || "Awal"} – ${slots[slots.length - 1]?.label || "Kini"}`;
  }

  const totalOmset = slots.reduce((acc, curr) => acc + curr.value, 0);
  const totalOrders = slots.reduce((acc, curr) => acc + curr.ordersCount, 0);
  const activeDaysWithData = slots.filter((s) => s.value > 0).length || slots.length;
  const averageOmset = Math.round(totalOmset / Math.max(activeDaysWithData, 1));

  let peakPoint: { label: string; value: number; orders: number } | null = null;
  slots.forEach((s) => {
    if (!peakPoint || s.value > peakPoint.value) {
      peakPoint = { label: s.label, value: s.value, orders: s.ordersCount };
    }
  });

  const chartData: TrendPoint[] = slots.map((s) => ({
    label: s.label,
    value: s.value,
    formattedValue: formatCurrency(s.value),
    secondaryValue: `${s.ordersCount} pesanan`,
    dateKey: s.dateKey,
  }));

  return {
    chartData,
    totalOmset,
    totalOrders,
    averageOmset,
    peakPoint: peakPoint && (peakPoint as { value: number }).value > 0 ? peakPoint : null,
    periodLabel,
    dateRangeText,
  };
}

/**
 * Generates volume order time series trend data based on selected period
 */
export function generateVolumeData(
  orders: Order[],
  period: DashboardPeriod = "7d",
  options?: { tenantId?: string; defaultColor?: string }
): {
  chartData: {
    label: string;
    value: number;
    displayValue: string;
    secondaryLabel?: string;
    color?: string;
  }[];
  totalOrders: number;
  avgOrdersPerUnit: number;
  peakPoint: { label: string; value: number } | null;
} {
  const trend = generateTrendData(orders, period, options);
  const activeColor = options?.defaultColor || "#2563eb";

  const chartData = trend.chartData.map((d) => {
    // Extract ordersCount from secondaryValue or recalculate
    const ordersCount = parseInt(d.secondaryValue?.split(" ")[0] || "0", 10) || 0;
    return {
      label: d.label,
      value: ordersCount,
      displayValue: `${ordersCount} Nota`,
      color: activeColor,
    };
  });

  const totalOrders = chartData.reduce((acc, curr) => acc + curr.value, 0);
  const activeDays = chartData.filter((c) => c.value > 0).length || chartData.length;
  const avgOrdersPerUnit = Math.round((totalOrders / Math.max(activeDays, 1)) * 10) / 10;

  let peakPoint: { label: string; value: number } | null = null;
  chartData.forEach((c) => {
    if (!peakPoint || c.value > peakPoint.value) {
      peakPoint = { label: c.label, value: c.value };
    }
  });

  return {
    chartData,
    totalOrders,
    avgOrdersPerUnit,
    peakPoint: peakPoint && (peakPoint as { value: number }).value > 0 ? peakPoint : null,
  };
}

export interface BranchPerformanceItem {
  id: string;
  rank: number;
  outletName: string;
  address: string;
  phone: string;
  orderCount: number;
  totalOmset: number;
  formattedOmset: string;
  percentageShare: number;
  subscriptionUntil?: string | null;
  subscriptionStatus: "active" | "critical" | "expired" | "trial";
  color?: string;
}

/**
 * Calculates per-branch performance and ranking for the given period
 */
export function generateBranchPerformance(
  orders: Order[],
  tenants: Tenant[],
  period: DashboardPeriod = "7d"
): {
  branches: BranchPerformanceItem[];
  totalNetworkOmset: number;
  totalNetworkOrders: number;
} {
  // First, get trend data for the period without tenant filter to identify orders in period
  const trend = generateTrendData(orders, period);
  const validDateKeys = new Set(trend.chartData.map((c) => c.dateKey));

  const now = new Date();
  const branchMap = new Map<string, { orderCount: number; totalOmset: number }>();

  orders.forEach((o) => {
    if (o.status === "cancelled") return;

    let inPeriod = false;
    if (period === "today") {
      inPeriod = toLocalDateKey(o.createdAt) === toLocalDateKey(now);
    } else if (period === "7d" || period === "30d" || period === "this_month") {
      inPeriod = validDateKeys.has(toLocalDateKey(o.createdAt));
    } else if (period === "this_year") {
      inPeriod = new Date(o.createdAt).getFullYear() === now.getFullYear();
    } else {
      inPeriod = true;
    }

    if (inPeriod) {
      const prev = branchMap.get(o.tenantId) || { orderCount: 0, totalOmset: 0 };
      branchMap.set(o.tenantId, {
        orderCount: prev.orderCount + 1,
        totalOmset: prev.totalOmset + (o.totalAmount || 0),
      });
    }
  });

  const totalNetworkOmset = Array.from(branchMap.values()).reduce(
    (acc, curr) => acc + curr.totalOmset,
    0
  );
  const totalNetworkOrders = Array.from(branchMap.values()).reduce(
    (acc, curr) => acc + curr.orderCount,
    0
  );

  const colors = ["#2563eb", "#059669", "#7c3aed", "#d97706", "#0284c7", "#e11d48"];

  const branches: BranchPerformanceItem[] = tenants.map((t, idx) => {
    const stats = branchMap.get(t.id) || { orderCount: 0, totalOmset: 0 };
    const percentageShare =
      totalNetworkOmset > 0 ? Math.round((stats.totalOmset / totalNetworkOmset) * 100) : 0;

    let subscriptionStatus: "active" | "critical" | "expired" | "trial" = "active";
    if (t.status === "inactive") {
      subscriptionStatus = "expired";
    } else if (!t.subscriptionUntil) {
      subscriptionStatus = "trial";
    } else {
      const diffDays = Math.ceil(
        (new Date(t.subscriptionUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays < 0) subscriptionStatus = "expired";
      else if (diffDays <= 7) subscriptionStatus = "critical";
      else subscriptionStatus = "active";
    }

    return {
      id: t.id,
      rank: 0,
      outletName: t.outletName || "Cabang Toko",
      address: t.address || "-",
      phone: t.phone || "-",
      orderCount: stats.orderCount,
      totalOmset: stats.totalOmset,
      formattedOmset: formatCurrency(stats.totalOmset),
      percentageShare,
      subscriptionUntil: t.subscriptionUntil,
      subscriptionStatus,
      color: colors[idx % colors.length],
    };
  });

  // Sort by omset desc, then assign ranks
  branches.sort((a, b) => b.totalOmset - a.totalOmset || b.orderCount - a.orderCount);
  branches.forEach((b, i) => {
    b.rank = i + 1;
  });

  return {
    branches,
    totalNetworkOmset,
    totalNetworkOrders,
  };
}
