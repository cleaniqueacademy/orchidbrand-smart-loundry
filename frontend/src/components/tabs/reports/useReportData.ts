import { useState, useMemo } from "react";
import { Order, Expense, Tenant } from "../../../types";
import { useToast } from "../../common/ToastContext";

export interface ReportMetrics {
  totalRevenue: number;
  pendingRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: string;
  totalKg: number;
  totalPcs: number;
  paidCount: number;
  unpaidCount: number;
  totalOrders: number;
}

export interface ServiceBreakdownItem {
  name: string;
  count: number;
  total: number;
  qty: number;
  unit: string;
  pct: number;
}

export interface ExpenseBreakdownItem {
  category: string;
  amount: number;
  pct: number;
}

export interface PaymentMethodBreakdownItem {
  method: string;
  count: number;
  amount: number;
}

interface UseReportDataProps {
  orders: Order[];
  expenses: Expense[];
  tenants: Tenant[];
  currentTenantId: string;
}

export function useReportData({
  orders,
  expenses,
  tenants,
  currentTenantId,
}: UseReportDataProps) {
  const toast = useToast();

  // Filters: Rentang Waktu (Date Range)
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Ledger Table Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Active Tenant Info
  const activeTenant: Tenant = tenants.find((t) => t.id === currentTenantId) ||
    tenants[0] || {
      id: "tenant-01",
      outletName: "Orchid Laundry - Cabang Melati",
      phone: "081234567890",
      address: "Jl. Melati Raya No. 45, Jakarta",
    };

  // Date range filter helper
  const dateRange = useMemo(() => {
    const start = startDate ? new Date(startDate + "T00:00:00") : new Date(0);
    const end = endDate ? new Date(endDate + "T23:59:59.999") : new Date(2100, 0, 1);

    const formatDateIndo = (dateStr: string) => {
      if (!dateStr) return "";
      const [y, m, d] = dateStr.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
    };

    let label = "Semua Waktu";
    if (startDate && endDate) {
      if (startDate === endDate) {
        label = formatDateIndo(startDate);
      } else {
        label = `${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`;
      }
    } else if (startDate) {
      label = `Mulai ${formatDateIndo(startDate)}`;
    } else if (endDate) {
      label = `Sampai ${formatDateIndo(endDate)}`;
    }

    return { start, end, label };
  }, [startDate, endDate]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      const matchDate = orderDate >= dateRange.start && orderDate <= dateRange.end;
      const matchPayment = paymentFilter === "all" || o.paymentStatus === paymentFilter;
      const matchSearch =
        o.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.customer?.phone && o.customer.phone.includes(searchQuery));
      return matchDate && matchPayment && matchSearch;
    });
  }, [orders, dateRange, paymentFilter, searchQuery]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expDate = new Date(e.expenseDate + "T12:00:00");
      return expDate >= dateRange.start && expDate <= dateRange.end;
    });
  }, [expenses, dateRange]);

  // Key Financial Metrics
  const metrics: ReportMetrics = useMemo(() => {
    const totalRevenue = filteredOrders
      .filter((o) => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingRevenue = filteredOrders
      .filter((o) => o.paymentStatus === "unpaid")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpense;
    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : "0";

    const totalKg = filteredOrders
      .filter((o) => o.unit.toLowerCase() === "kg")
      .reduce((sum, o) => sum + o.weightOrQty, 0);

    const totalPcs = filteredOrders
      .filter((o) => o.unit.toLowerCase() === "pcs")
      .reduce((sum, o) => sum + o.weightOrQty, 0);

    const paidCount = filteredOrders.filter((o) => o.paymentStatus === "paid").length;
    const unpaidCount = filteredOrders.filter((o) => o.paymentStatus === "unpaid").length;

    return {
      totalRevenue,
      pendingRevenue,
      totalExpense,
      netProfit,
      profitMargin,
      totalKg,
      totalPcs,
      paidCount,
      unpaidCount,
      totalOrders: filteredOrders.length,
    };
  }, [filteredOrders, filteredExpenses]);

  // Breakdown by Service Type
  const serviceBreakdown: ServiceBreakdownItem[] = useMemo(() => {
    const map: Record<string, { count: number; total: number; qty: number; unit: string }> = {};
    filteredOrders.forEach((o) => {
      if (!map[o.serviceType]) {
        map[o.serviceType] = { count: 0, total: 0, qty: 0, unit: o.unit };
      }
      map[o.serviceType].count += 1;
      map[o.serviceType].total += o.totalAmount;
      map[o.serviceType].qty += o.weightOrQty;
    });
    return Object.entries(map)
      .map(([name, val]) => ({
        name,
        ...val,
        pct: metrics.totalRevenue > 0 ? Math.round((val.total / metrics.totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredOrders, metrics.totalRevenue]);

  // Breakdown by Expense Category
  const expenseBreakdown: ExpenseBreakdownItem[] = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        pct: metrics.totalExpense > 0 ? Math.round((amount / metrics.totalExpense) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, metrics.totalExpense]);

  // Breakdown by Payment Method
  const paymentMethodBreakdown: PaymentMethodBreakdownItem[] = useMemo(() => {
    const map: Record<string, { count: number; amount: number }> = {};
    filteredOrders
      .filter((o) => o.paymentStatus === "paid")
      .forEach((o) => {
        const method = (o.paymentMethod || "cash").toLowerCase();
        if (!map[method]) map[method] = { count: 0, amount: 0 };
        map[method].count += 1;
        map[method].amount += o.totalAmount;
      });
    return Object.entries(map).map(([method, val]) => ({
      method: method === "qris" ? "QRIS" : method === "transfer" ? "Transfer Bank" : "Tunai (Cash)",
      ...val,
    }));
  }, [filteredOrders]);

  // Pagination for Ledger Table
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  // 1. Export CSV Function
  const downloadCSV = () => {
    const outletName = activeTenant.outletName.replace(/[^a-zA-Z0-9]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Laporan_Keuangan_${outletName}_${dateStr}.csv`;

    let csvContent = "\uFEFF"; // UTF-8 BOM for Microsoft Excel

    // Metadata Header
    csvContent += `LAPORAN KEUANGAN & OPERASIONAL LAUNDRY\n`;
    csvContent += `Outlet,${activeTenant.outletName}\n`;
    csvContent += `Alamat,"${activeTenant.address}"\n`;
    csvContent += `Telepon,${activeTenant.phone}\n`;
    csvContent += `Periode Laporan,"${dateRange.label}"\n`;
    csvContent += `Tanggal Cetak,${new Date().toLocaleString("id-ID")}\n\n`;

    // Ringkasan Eksekutif
    csvContent += `RINGKASAN KEUANGAN EKSEKUTIF\n`;
    csvContent += `Total Pemasukan (Omset Lunas),Rp ${metrics.totalRevenue}\n`;
    csvContent += `Piutang (Belum Lunas),Rp ${metrics.pendingRevenue}\n`;
    csvContent += `Total Beban Pengeluaran,Rp ${metrics.totalExpense}\n`;
    csvContent += `Laba Bersih (Net Profit),Rp ${metrics.netProfit}\n`;
    csvContent += `Margin Laba,${metrics.profitMargin}%\n`;
    csvContent += `Total Transaksi,${metrics.totalOrders}\n`;
    csvContent += `Total Berat Cucian (Kg),${metrics.totalKg}\n`;
    csvContent += `Total Satuan Cucian (Pcs),${metrics.totalPcs}\n\n`;

    // Rincian Layanan
    csvContent += `RINGKASAN PER LAYANAN\n`;
    csvContent += `Jenis Layanan,Jumlah Pesanan,Total Qty / Berat,Total Omset,Kontribusi (%)\n`;
    serviceBreakdown.forEach((s) => {
      csvContent += `"${s.name}",${s.count},"${s.qty} ${s.unit}",Rp ${s.total},${s.pct}%\n`;
    });
    csvContent += `\n`;

    // Rincian Pengeluaran
    csvContent += `RINCIAN BEBAN PENGELUARAN\n`;
    csvContent += `Kategori Pengeluaran,Total Beban,Kontribusi (%)\n`;
    expenseBreakdown.forEach((e) => {
      csvContent += `"${e.category}",Rp ${e.amount},${e.pct}%\n`;
    });
    csvContent += `\n`;

    // Buku Besar Transaksi Rinci
    csvContent += `BUKU BESAR TRANSAKSI\n`;
    csvContent += `No Nota,Tanggal,Pelanggan,No WA,Layanan,Berat / Qty,Status Cucian,Pembayaran,Metode Bayar,Total Biaya\n`;
    filteredOrders.forEach((o) => {
      const custName = o.customer?.name || "Pelanggan Langsung";
      const custPhone = o.customer?.phone || "-";
      const tgl = new Date(o.createdAt).toLocaleDateString("id-ID");
      csvContent += `"${o.invoiceNo}","${tgl}","${custName}","${custPhone}","${o.serviceType}","${o.weightOrQty} ${o.unit}","${o.status}","${o.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}","${o.paymentMethod || "cash"}",Rp ${o.totalAmount}\n`;
    });

    // Trigger Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      "Laporan CSV Berhasil Diunduh",
      `File ${filename} telah disimpan ke perangkat Anda.`
    );
  };

  // 2. Trigger Print PDF Dialog
  const handlePrintPDF = () => {
    toast.info("Mempersiapkan Dokumen Cetak", "Membuka dialog pencetakan browser...");
    window.print();
  };

  return {
    activeTenant,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    paymentFilter,
    setPaymentFilter,
    searchQuery,
    setSearchQuery,
    page,
    setPage,
    pageSize,
    setPageSize,
    dateRange,
    filteredOrders,
    filteredExpenses,
    metrics,
    serviceBreakdown,
    expenseBreakdown,
    paymentMethodBreakdown,
    totalPages,
    paginatedOrders,
    downloadCSV,
    handlePrintPDF,
  };
}
