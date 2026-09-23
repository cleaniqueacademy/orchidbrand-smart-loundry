import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
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
  currentUserRole?: string;
}

export function useReportData({
  orders,
  expenses,
  tenants,
  currentTenantId,
  currentUserRole,
}: UseReportDataProps) {
  const toast = useToast();

  // Tenant Selection Filter (Dukungan Audit Super Admin)
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    currentTenantId === "all" ? "all" : currentTenantId
  );

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

  // Active Tenant Info (Dukungan Konsolidasi Seluruh Cabang)
  const activeTenant: Tenant = useMemo(() => {
    if (selectedTenantId === "all" || currentTenantId === "all") {
      if (selectedTenantId !== "all") {
        const found = tenants.find((t) => t.id === selectedTenantId);
        if (found) return found;
      }
      return {
        id: "all",
        outletName: "Konsolidasi Seluruh Cabang",
        phone: "0812-3456-7890",
        address: "Jaringan Multi-Cabang Laundry Cleanique",
        status: "active",
        totalOrders: orders.length,
        totalOmset: orders
          .filter((o) => o.paymentStatus === "paid")
          .reduce((sum, o) => sum + o.totalAmount, 0),
      };
    }
    return (
      tenants.find((t) => t.id === selectedTenantId) ||
      tenants.find((t) => t.id === currentTenantId) ||
      tenants[0] || {
        id: "tenant-01",
        outletName: "Laundry Cleanique - Cabang Melati",
        phone: "081234567890",
        address: "Jl. Melati Raya No. 45, Jakarta",
        status: "active",
        totalOrders: 0,
        totalOmset: 0,
      }
    );
  }, [selectedTenantId, currentTenantId, tenants, orders]);

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

  // Filtered Orders (disaring berdasarkan cabang jika dipilih)
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchTenant = selectedTenantId === "all" || o.tenantId === selectedTenantId;
      const orderDate = new Date(o.createdAt);
      const matchDate = orderDate >= dateRange.start && orderDate <= dateRange.end;
      const matchPayment = paymentFilter === "all" || o.paymentStatus === paymentFilter;
      const matchSearch =
        o.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.customer?.phone && o.customer.phone.includes(searchQuery));
      return matchTenant && matchDate && matchPayment && matchSearch;
    });
  }, [orders, selectedTenantId, dateRange, paymentFilter, searchQuery]);

  // Filtered Expenses (disaring berdasarkan cabang jika dipilih)
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchTenant = selectedTenantId === "all" || e.tenantId === selectedTenantId;
      const expDate = new Date(e.expenseDate + "T12:00:00");
      return matchTenant && expDate >= dateRange.start && expDate <= dateRange.end;
    });
  }, [expenses, selectedTenantId, dateRange]);

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
    const totalSalesAllServices = Object.values(map).reduce((sum, item) => sum + item.total, 0);
    return Object.entries(map)
      .map(([name, val]) => ({
        name,
        ...val,
        pct: totalSalesAllServices > 0 ? Math.round((val.total / totalSalesAllServices) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

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

  // 1. Export Excel (.xlsx) Function with Multi-Sheet & Professional Styling
  const downloadExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const isMultiTenant = activeTenant.id === "all";

      // SHEET 1: Ringkasan Eksekutif & Profil Outlet
      const summaryAoa: any[][] = [
        ["Laundry Cleanique - SMART LAUNDRY MANAGEMENT SYSTEM"],
        [isMultiTenant ? "LAPORAN KEUANGAN KONSOLIDASI SELURUH CABANG" : `LAPORAN KEUANGAN & OPERASIONAL - ${activeTenant.outletName.toUpperCase()}`],
        [],
        ["PROFIL OUTLET / CABANG", ""],
        ["Nama Outlet / Cabang", activeTenant.outletName],
        ["ID Cabang", activeTenant.id],
        ["Pemilik / Penanggung Jawab", activeTenant.owner?.name || "Budi Santoso"],
        ["Alamat", activeTenant.address],
        ["Nomor Telepon", activeTenant.phone],
        ["Periode Laporan", dateRange.label],
        ["Tanggal Unduh Dokumen", new Date().toLocaleString("id-ID")],
        [],
        ["REKAPITULASI KEUANGAN & LABA RUGI", "", ""],
        ["Indikator Keuangan", "Nilai (Rp / Satuan)", "Keterangan"],
        ["Total Pemasukan (Omset Lunas)", metrics.totalRevenue, `${metrics.paidCount} transaksi lunas`],
        ["Piutang Pelanggan (Belum Lunas)", metrics.pendingRevenue, `${metrics.unpaidCount} pesanan belum lunas`],
        ["Total Beban Pengeluaran", metrics.totalExpense, `${filteredExpenses.length} catatan beban operasional`],
        ["Laba Bersih (Net Profit)", metrics.netProfit, `Margin Keuntungan ${metrics.profitMargin}%`],
        ["Total Volume Cucian Kiloan", `${metrics.totalKg.toFixed(1)} Kg`, "Total berat"],
        ["Total Volume Cucian Satuan", `${metrics.totalPcs} Pcs`, "Total satuan"],
        ["Total Transaksi Pesanan", metrics.totalOrders, "Pesanan"],
        [],
        ["KONTRIBUSI PENDAPATAN PER LAYANAN", "", "", "", ""],
        ["Jenis Layanan", "Jumlah Pesanan", "Total Volume", "Total Omset (Rp)", "Kontribusi (%)"],
        ...serviceBreakdown.map((s) => [
          s.name,
          s.count,
          `${s.qty} ${s.unit}`,
          s.total,
          `${s.pct}%`,
        ]),
        [],
        ["RINCIAN BEBAN PENGELUARAN OPERASIONAL", "", ""],
        ["Kategori Beban", "Total Biaya (Rp)", "Kontribusi Beban (%)"],
        ...expenseBreakdown.map((e) => [
          e.category,
          e.amount,
          `${e.pct}%`,
        ]),
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
      wsSummary["!cols"] = [
        { wch: 36 },
        { wch: 28 },
        { wch: 32 },
        { wch: 20 },
        { wch: 16 },
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Eksekutif");

      // SHEET 2: Buku Besar Transaksi Rinci (All Filtered Orders)
      const ledgerHeaders = [
        "No",
        "No. Nota",
        "Tanggal",
        ...(isMultiTenant ? ["Cabang / Outlet"] : []),
        "Nama Pelanggan",
        "No. WhatsApp",
        "Jenis Layanan",
        "Qty / Berat",
        "Satuan",
        "Status Pesanan",
        "Status Pembayaran",
        "Metode Bayar",
        "Total Biaya (Rp)",
      ];

      const ledgerRows = filteredOrders.map((ord, idx) => {
        const tenantName =
          tenants.find((t) => t.id === ord.tenantId)?.outletName ||
          ord.tenantId ||
          activeTenant.outletName;
        const statusLabel =
          ord.status === "completed"
            ? "Selesai"
            : ord.status === "ready"
            ? "Siap Diambil"
            : ord.status === "cancelled"
            ? "Dibatalkan"
            : "Diproses";
        const paymentLabel = ord.paymentStatus === "paid" ? "Lunas" : "Belum Lunas";
        return [
          idx + 1,
          ord.invoiceNo,
          new Date(ord.createdAt).toLocaleDateString("id-ID"),
          ...(isMultiTenant ? [tenantName] : []),
          ord.customer?.name || "Pelanggan Langsung",
          ord.customer?.phone || "-",
          ord.serviceType,
          ord.weightOrQty,
          ord.unit,
          statusLabel,
          paymentLabel,
          ord.paymentMethod || "Tunai",
          ord.totalAmount,
        ];
      });

      const wsLedger = XLSX.utils.aoa_to_sheet([
        [`BUKU BESAR TRANSAKSI - ${activeTenant.outletName.toUpperCase()}`],
        [`Periode Laporan: ${dateRange.label} | Total: ${filteredOrders.length} Transaksi`],
        [],
        ledgerHeaders,
        ...ledgerRows,
        [],
        [
          "TOTAL",
          "",
          "",
          ...(isMultiTenant ? [""] : []),
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "TOTAL NILAI TRANSAKSI",
          filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0),
        ],
      ]);

      wsLedger["!cols"] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 14 },
        ...(isMultiTenant ? [{ wch: 28 }] : []),
        { wch: 24 },
        { wch: 16 },
        { wch: 20 },
        { wch: 14 },
        { wch: 10 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, wsLedger, "Buku Besar Transaksi");

      // SHEET 3: Beban Pengeluaran Operasional
      const expenseHeaders = [
        "No",
        "Tanggal",
        ...(isMultiTenant ? ["Cabang"] : []),
        "Kategori Beban",
        "Keterangan",
        "Jumlah Biaya (Rp)",
      ];
      const expenseRows = filteredExpenses.map((exp, idx) => {
        const tenantName =
          tenants.find((t) => t.id === exp.tenantId)?.outletName ||
          exp.tenantId ||
          activeTenant.outletName;
        return [
          idx + 1,
          new Date(exp.expenseDate).toLocaleDateString("id-ID"),
          ...(isMultiTenant ? [tenantName] : []),
          exp.category,
          exp.notes || "-",
          exp.amount,
        ];
      });

      const wsExpense = XLSX.utils.aoa_to_sheet([
        [`RINCIAN BEBAN PENGELUARAN OPERASIONAL - ${activeTenant.outletName.toUpperCase()}`],
        [`Periode Laporan: ${dateRange.label}`],
        [],
        expenseHeaders,
        ...expenseRows,
        [],
        [
          "TOTAL",
          "",
          ...(isMultiTenant ? [""] : []),
          "",
          "TOTAL BEBAN PENGELUARAN",
          metrics.totalExpense,
        ],
      ]);

      wsExpense["!cols"] = [
        { wch: 6 },
        { wch: 14 },
        ...(isMultiTenant ? [{ wch: 28 }] : []),
        { wch: 22 },
        { wch: 36 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, wsExpense, "Beban Operasional");

      const outletSlug = activeTenant.outletName.replace(/[^a-zA-Z0-9]/g, "_");
      const dateSlug = new Date().toISOString().slice(0, 10);
      const filename = `Laporan_Keuangan_${outletSlug}_${dateSlug}.xlsx`;

      XLSX.writeFile(wb, filename);

      toast.success(
        "Laporan Excel (.xlsx) Berhasil Diunduh",
        `File ${filename} memuat 3 lembar kerja lengkap untuk ${activeTenant.outletName}.`
      );
    } catch (err: any) {
      console.error("Excel download error:", err);
      toast.error("Gagal Download Excel", err.message || "Terjadi kesalahan saat memproses file Excel");
    }
  };

  // 2. Export CSV Function
  const downloadCSV = () => {
    const isMultiTenant = activeTenant.id === "all";
    const outletName = activeTenant.outletName.replace(/[^a-zA-Z0-9]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Laporan_Keuangan_${outletName}_${dateStr}.csv`;

    let csvContent = "\uFEFF"; // UTF-8 BOM for Microsoft Excel

    // Metadata Header
    csvContent += `LAPORAN KEUANGAN & OPERASIONAL LAUNDRY\n`;
    csvContent += `Outlet / Cabang,${activeTenant.outletName}\n`;
    csvContent += `ID Cabang,${activeTenant.id}\n`;
    csvContent += `Pemilik,${activeTenant.owner?.name || "Budi Santoso"}\n`;
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
    csvContent += `No Nota,Tanggal,${isMultiTenant ? "Cabang," : ""}Pelanggan,No WA,Layanan,Berat / Qty,Status Cucian,Pembayaran,Metode Bayar,Total Biaya\n`;
    filteredOrders.forEach((o) => {
      const custName = o.customer?.name || "Pelanggan Langsung";
      const custPhone = o.customer?.phone || "-";
      const tgl = new Date(o.createdAt).toLocaleDateString("id-ID");
      const tenantCol = isMultiTenant
        ? `"${tenants.find((t) => t.id === o.tenantId)?.outletName || o.tenantId}",`
        : "";
      csvContent += `"${o.invoiceNo}","${tgl}",${tenantCol}"${custName}","${custPhone}","${o.serviceType}","${o.weightOrQty} ${o.unit}","${o.status}","${o.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}","${o.paymentMethod || "Tunai"}",Rp ${o.totalAmount}\n`;
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

  // 3. Trigger Print PDF Dialog
  const handlePrintPDF = () => {
    toast.info("Mempersiapkan Dokumen Cetak", "Membuka dialog pencetakan browser...");
    window.print();
  };

  return {
    activeTenant,
    selectedTenantId,
    setSelectedTenantId,
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
    downloadExcel,
    downloadCSV,
    handlePrintPDF,
  };
}
