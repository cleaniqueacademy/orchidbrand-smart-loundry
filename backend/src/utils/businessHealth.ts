/**
 * Business Health & Material Consumption Logic
 * Laundry Cleanique - Prinsip Zero Configuration
 */

export interface SopRatios {
  detergentMlPerKg: number;
  detergentPricePerLiter: number;
  perfumeMlPerKg: number;
  perfumePricePerLiter: number;
  gasCostPerKg: number;
  plasticCostPerKg: number;
}

export const DEFAULT_SOP_RATIOS: SopRatios = {
  detergentMlPerKg: 25, // 25 ml per kg cucian
  detergentPricePerLiter: 15000, // Rp 15.000 / Liter (Rp 375/kg)
  perfumeMlPerKg: 12, // 12 ml per kg cucian
  perfumePricePerLiter: 35000, // Rp 35.000 / Liter (Rp 420/kg)
  gasCostPerKg: 400, // Rp 400 / kg cucian
  plasticCostPerKg: 200, // Rp 200 / kg cucian
};

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Deterjen & Kimia",
  "Parfum & Pelicin",
  "Gas Pengering (LPG)",
  "Listrik & Air",
  "Plastik Packing",
  "Sewa Ruko / Tempat",
  "Gaji Karyawan",
  "Langganan Aplikasi",
  "Servis & Perawatan Mesin",
  "Biaya Operasional Lain",
];

export interface MaterialAuditItem {
  key: "detergent" | "perfume" | "gas" | "plastic";
  name: string;
  unitLabel: string;
  estimatedQty: number; // liter atau -
  estimatedCost: number; // Rupiah
  actualCost: number; // Rupiah belanja di buku kas
  differenceCost: number; // actual - estimated
  ratioPct: number; // (actual / estimated) * 100
  status: "efficient" | "warning" | "danger" | "no_data";
  statusText: string;
}

export interface RentTrackingInfo {
  hasRent: boolean;
  totalPaid: number;
  durationMonths: number;
  monthlyAmortization: number;
  startDate: string | null;
  endDate: string | null;
  remainingMonths: number;
  isExpiringSoon: boolean; // sisa < 2 bulan
}

export interface BusinessHealthAnalysis {
  healthScore: number; // 0 - 100
  ratingText: string;
  ratingColor: "green" | "yellow" | "red";
  totalWashKg: number;
  totalRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  totalActualExpense: number;
  effectiveMonthlyExpense: number; // memperhitungkan amortisasi sewa
  netProfit: number;
  netMarginPct: number;
  chemicalExpenseTotal: number;
  chemicalRatioPct: number;
  materials: MaterialAuditItem[];
  rent: RentTrackingInfo;
  recommendations: string[];
}

export function isWashService(serviceType: string, unit: string): boolean {
  if (unit.toLowerCase() !== "kg") return false;
  const lower = (serviceType || "").toLowerCase();
  if (lower.includes("setrika saja") || lower.includes("dry clean")) {
    return false;
  }
  return true;
}

export function calculateBusinessHealth(params: {
  orders: Array<{
    serviceType: string;
    weightOrQty: number;
    unit: string;
    totalAmount: number;
    paymentStatus: string;
    status: string;
    createdAt?: string;
  }>;
  expenses: Array<{
    category: string;
    amount: number;
    type?: string;
    expenseDate?: string;
    rentDurationMonths?: number | null;
    rentStartDate?: string | null;
  }>;
  customRatios?: Partial<SopRatios> | null;
}): BusinessHealthAnalysis {
  const ratios: SopRatios = {
    ...DEFAULT_SOP_RATIOS,
    ...(params.customRatios || {}),
  };

  const validOrders = params.orders.filter((o) => o.status !== "cancelled");

  // 1. Hitung Total Kg Cucian Kiloan (Cuci Komplit / Cuci Kering)
  const totalWashKg = validOrders
    .filter((o) => isWashService(o.serviceType, o.unit))
    .reduce((sum, o) => sum + (Number(o.weightOrQty) || 0), 0);

  // 2. Omset & Piutang
  const paidRevenue = validOrders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  const unpaidRevenue = validOrders
    .filter((o) => o.paymentStatus === "unpaid")
    .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

  const totalRevenue = paidRevenue + unpaidRevenue;

  // 3. Pengeluaran Riil per Kategori
  const validExpenses = params.expenses.filter((e) => (e.type || "expense") === "expense");
  const totalActualExpense = validExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const getExpenseByCategoryKeywords = (keywords: string[]) => {
    return validExpenses
      .filter((e) => {
        const cat = (e.category || "").toLowerCase();
        return keywords.some((kw) => cat.includes(kw));
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  };

  const actualDetergent = getExpenseByCategoryKeywords(["deterjen", "detergent", "kimia", "sabun"]);
  const actualPerfume = getExpenseByCategoryKeywords(["parfum", "pewangi", "pelicin", "softener"]);
  const actualGas = getExpenseByCategoryKeywords(["gas", "lpg", "dryer"]);
  const actualPlastic = getExpenseByCategoryKeywords(["plastik", "packing", "kresek"]);

  // 4. Perhitungan Estimasi Bahan
  const estDetergentLiters = (totalWashKg * ratios.detergentMlPerKg) / 1000;
  const estDetergentCost = estDetergentLiters * ratios.detergentPricePerLiter;

  const estPerfumeLiters = (totalWashKg * ratios.perfumeMlPerKg) / 1000;
  const estPerfumeCost = estPerfumeLiters * ratios.perfumePricePerLiter;

  const estGasCost = totalWashKg * ratios.gasCostPerKg;
  const estPlasticCost = totalWashKg * ratios.plasticCostPerKg;

  const buildAuditItem = (
    key: "detergent" | "perfume" | "gas" | "plastic",
    name: string,
    unitLabel: string,
    estimatedQty: number,
    estimatedCost: number,
    actualCost: number
  ): MaterialAuditItem => {
    const diff = actualCost - estimatedCost;
    const ratio = estimatedCost > 0 ? (actualCost / estimatedCost) * 100 : actualCost > 0 ? 200 : 100;

    let status: MaterialAuditItem["status"] = "efficient";
    let statusText = "🟢 Efisien & Wajar";

    if (actualCost === 0 && totalWashKg > 20) {
      status = "no_data";
      statusText = "⚪ Belum ada belanja dicatat";
    } else if (ratio > 160) {
      status = "danger";
      statusText = "🔴 Sangat Boros (Cek Takaran)";
    } else if (ratio > 125) {
      status = "warning";
      statusText = "🟡 Sedikit Boros";
    }

    return {
      key,
      name,
      unitLabel,
      estimatedQty: Math.round(estimatedQty * 10) / 10,
      estimatedCost: Math.round(estimatedCost),
      actualCost: Math.round(actualCost),
      differenceCost: Math.round(diff),
      ratioPct: Math.round(ratio),
      status,
      statusText,
    };
  };

  const materials: MaterialAuditItem[] = [
    buildAuditItem("detergent", "Deterjen Cair", "Liter", estDetergentLiters, estDetergentCost, actualDetergent),
    buildAuditItem("perfume", "Parfum & Pelicin", "Liter", estPerfumeLiters, estPerfumeCost, actualPerfume),
    buildAuditItem("gas", "Gas Pengering (LPG)", "Kg Cucian", totalWashKg, estGasCost, actualGas),
    buildAuditItem("plastic", "Plastik Packing", "Kg Cucian", totalWashKg, estPlasticCost, actualPlastic),
  ];

  // 5. Rent Tracking (Sewa Ruko)
  const rentExpenses = validExpenses.filter((e) => {
    const cat = (e.category || "").toLowerCase();
    return cat.includes("sewa") || (e.rentDurationMonths && e.rentDurationMonths > 1);
  });

  let rentInfo: RentTrackingInfo = {
    hasRent: false,
    totalPaid: 0,
    durationMonths: 1,
    monthlyAmortization: 0,
    startDate: null,
    endDate: null,
    remainingMonths: 0,
    isExpiringSoon: false,
  };

  if (rentExpenses.length > 0) {
    const latestRent = rentExpenses[0];
    const totalPaid = latestRent.amount;
    const duration = latestRent.rentDurationMonths || 12;
    const monthlyAmort = totalPaid / duration;
    const startDateStr = latestRent.rentStartDate || latestRent.expenseDate || new Date().toISOString().slice(0, 10);

    const startObj = new Date(startDateStr);
    const endObj = new Date(startObj);
    endObj.setMonth(endObj.getMonth() + duration);
    const endDateStr = endObj.toISOString().slice(0, 10);

    const now = new Date();
    const diffMs = endObj.getTime() - now.getTime();
    const remainingMonths = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.5)));

    rentInfo = {
      hasRent: true,
      totalPaid,
      durationMonths: duration,
      monthlyAmortization: Math.round(monthlyAmort),
      startDate: startDateStr,
      endDate: endDateStr,
      remainingMonths,
      isExpiringSoon: remainingMonths <= 2 && remainingMonths > 0,
    };
  }

  // 6. Effective Monthly Net Profit
  // Jika ada sewa jangka panjang, gantikan total biaya sewa lump-sum dengan beban bulanan (amortisasi)
  let effectiveMonthlyExpense = totalActualExpense;
  if (rentInfo.hasRent && rentInfo.durationMonths > 1) {
    effectiveMonthlyExpense = totalActualExpense - rentInfo.totalPaid + rentInfo.monthlyAmortization;
  }
  const netProfit = paidRevenue - effectiveMonthlyExpense;
  const netMarginPct = paidRevenue > 0 ? Math.round((netProfit / paidRevenue) * 1000) / 10 : 0;

  // 7. Rasio HPP Bahan Kimia vs Omset
  const chemicalExpenseTotal = actualDetergent + actualPerfume + actualGas + actualPlastic;
  const chemicalRatioPct = paidRevenue > 0 ? Math.round((chemicalExpenseTotal / paidRevenue) * 1000) / 10 : 0;

  // 8. Skor Kesehatan Bisnis (0 - 100)
  let score = 50;

  // Profit Margin Component (Max 40)
  if (netMarginPct >= 40) score += 40;
  else if (netMarginPct >= 30) score += 32;
  else if (netMarginPct >= 20) score += 22;
  else if (netMarginPct >= 10) score += 12;
  else if (netMarginPct >= 0) score += 5;
  else score -= 15; // Rugi

  // Chemical Ratio Component (Max 30)
  if (chemicalRatioPct >= 10 && chemicalRatioPct <= 20) score += 30; // Ideal laundry
  else if (chemicalRatioPct < 10 && totalWashKg > 20) score += 20; // Sangat hemat
  else if (chemicalRatioPct > 20 && chemicalRatioPct <= 28) score += 15; // Sedikit tinggi
  else if (chemicalRatioPct > 28) score += 0; // Boros

  // Piutang Component (Max 20)
  const paidRatio = totalRevenue > 0 ? paidRevenue / totalRevenue : 1;
  if (paidRatio >= 0.9) score += 20;
  else if (paidRatio >= 0.8) score += 14;
  else if (paidRatio >= 0.6) score += 8;
  else score += 0;

  // Rent / Runway Component (Max 10)
  if (rentInfo.hasRent) {
    if (rentInfo.remainingMonths >= 3) score += 10;
    else if (rentInfo.remainingMonths > 0) score += 5;
    else score += 2;
  } else {
    score += 10;
  }

  // Normalisasi 0 - 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  let ratingText = "🟢 Prima & Sangat Sehat";
  let ratingColor: "green" | "yellow" | "red" = "green";

  if (score < 50) {
    ratingText = "🔴 Kritis / Perlu Evaluasi Biaya";
    ratingColor = "red";
  } else if (score < 75) {
    ratingText = "🟡 Cukup Sehat (Ada Pemborosan)";
    ratingColor = "yellow";
  }

  // 9. Rekomendasi Cerdas
  const recommendations: string[] = [];

  materials.forEach((mat) => {
    if (mat.status === "danger") {
      recommendations.push(
        `Pengeluaran ${mat.name} tercatat ${mat.ratioPct}% dari estimasi wajar (${mat.estimatedQty} ${mat.unitLabel}). Periksa apakah terjadi pemborosan takaran atau kebocoran.`
      );
    }
  });

  if (paidRatio < 0.85 && unpaidRevenue > 50000) {
    recommendations.push(
      `Ada piutang pelanggan sebesar Rp ${unpaidRevenue.toLocaleString("id-ID")} yang belum lunas. Aktifkan penagihan otomatis via WhatsApp untuk memperlancar arus kas.`
    );
  }

  if (chemicalRatioPct > 25) {
    recommendations.push(
      `Biaya bahan operasional (HPP) memakan ${chemicalRatioPct}% dari omset (standar ideal: 12-18%). Pertimbangkan pembelian deterjen/parfum dalam jerigen grosir yang lebih hemat.`
    );
  }

  if (rentInfo.isExpiringSoon) {
    recommendations.push(
      `Masa sewa ruko tersisa ${rentInfo.remainingMonths} bulan lagi (s/d ${rentInfo.endDate}). Siapkan alokasi dana perpanjangan sewa dari sekarang.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Operasional dan takaran bahan laundry Anda berjalan sangat efisien. Pertahankan SOP pengerjaan cucian saat ini!"
    );
  }

  return {
    healthScore: score,
    ratingText,
    ratingColor,
    totalWashKg: Math.round(totalWashKg * 10) / 10,
    totalRevenue,
    paidRevenue,
    unpaidRevenue,
    totalActualExpense,
    effectiveMonthlyExpense,
    netProfit,
    netMarginPct,
    chemicalExpenseTotal,
    chemicalRatioPct,
    materials,
    rent: rentInfo,
    recommendations,
  };
}
