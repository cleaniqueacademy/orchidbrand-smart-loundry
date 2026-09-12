import React, { useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Building2,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Eye,
  X,
  Layers,
  Scale,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Order, Expense, Tenant, Customer } from "../../types";

interface ReportsTabProps {
  orders: Order[];
  expenses: Expense[];
  tenants: Tenant[];
  currentTenantId: string;
  customers: Customer[];
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  orders,
  expenses,
  tenants,
  currentTenantId,
  customers,
}) => {
  // Filters: Rentang Waktu (Date Range)
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Ledger Table Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal for previewing official printed document
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Active Tenant Info
  const activeTenant = tenants.find((t) => t.id === currentTenantId) ||
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
  const metrics = useMemo(() => {
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
  const serviceBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number; qty: number; unit: string }> = {};
    filteredOrders.forEach((o) => {
      if (!map[o.serviceType]) {
        map[o.serviceType] = { count: 0, total: 0, qty: 0, unit: o.unit };
      }
      map[o.serviceType].count += 1;
      map[o.serviceType].total += o.totalAmount;
      map[o.serviceType].qty += o.weightOrQty;
    });
    return Object.entries(map).map(([name, val]) => ({
      name,
      ...val,
      pct: metrics.totalRevenue > 0 ? Math.round((val.total / metrics.totalRevenue) * 100) : 0,
    })).sort((a, b) => b.total - a.total);
  }, [filteredOrders, metrics.totalRevenue]);

  // Breakdown by Expense Category
  const expenseBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).map(([category, amount]) => ({
      category,
      amount,
      pct: metrics.totalExpense > 0 ? Math.round((amount / metrics.totalExpense) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, metrics.totalExpense]);

  // Breakdown by Payment Method
  const paymentMethodBreakdown = useMemo(() => {
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
  };

  // 2. Trigger Print PDF Dialog
  const handlePrintPDF = () => {
    window.print();
  };

  // Render Official Report Document (Used both in Modal Preview and in Dedicated Print Container)
  const renderReportDocument = () => (
    <div className="bg-white font-sans text-zinc-900 leading-normal p-2">
      {/* Kop Surat Resmi */}
      <div className="border-b-2 border-zinc-900 pb-4 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black text-zinc-900 tracking-tight uppercase">
              {activeTenant.outletName}
            </h1>
            <p className="text-xs text-zinc-600 mt-1">{activeTenant.address}</p>
            <p className="text-xs text-zinc-600 font-mono">Telepon: {activeTenant.phone}</p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-blue-900 text-white font-bold text-[11px] px-2.5 py-1 rounded">
              ORCHID BRAND
            </span>
            <p className="text-[10px] text-zinc-400 mt-1 font-mono">Smart Laundry System</p>
          </div>
        </div>
      </div>

      {/* Title & Metadata */}
      <div className="text-center mb-6">
        <h2 className="text-base font-bold text-zinc-900 uppercase tracking-wide">
          LAPORAN KEUANGAN & OPERASIONAL
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">
          Periode: <strong className="text-zinc-800">{dateRange.label}</strong> | Dicetak pada: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Ringkasan Arus Kas Laba Rugi Table */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 border-l-2 border-zinc-900 pl-2">
          1. Rekapitulasi Laba Rugi
        </h3>
        <table className="w-full text-xs border border-zinc-300">
          <tbody className="divide-y divide-zinc-200">
            <tr className="bg-zinc-50 font-semibold">
              <td className="p-2 text-zinc-700">Pemasukan Bruto (Omset Lunas)</td>
              <td className="p-2 text-right font-mono text-emerald-700">Rp {metrics.totalRevenue.toLocaleString("id-ID")}</td>
            </tr>
            <tr>
              <td className="p-2 text-zinc-600">Piutang Pelanggan (Belum Lunas)</td>
              <td className="p-2 text-right font-mono text-amber-700">Rp {metrics.pendingRevenue.toLocaleString("id-ID")}</td>
            </tr>
            <tr>
              <td className="p-2 text-zinc-600">Total Beban Operasional</td>
              <td className="p-2 text-right font-mono text-rose-700">(Rp {metrics.totalExpense.toLocaleString("id-ID")})</td>
            </tr>
            <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-900">
              <td className="p-2.5 text-zinc-900 text-sm">LABA BERSIH (NET PROFIT)</td>
              <td className="p-2.5 text-right font-mono text-sm text-zinc-900">
                Rp {metrics.netProfit.toLocaleString("id-ID")} ({metrics.profitMargin}%)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Breakdown Layanan Table */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 border-l-2 border-zinc-900 pl-2">
          2. Kontribusi Layanan
        </h3>
        <table className="w-full text-xs border border-zinc-300">
          <thead className="bg-zinc-100 text-[10px] font-bold text-zinc-700 uppercase">
            <tr>
              <th className="p-2 text-left border-b">Nama Layanan</th>
              <th className="p-2 text-center border-b">Pesanan</th>
              <th className="p-2 text-center border-b">Volume</th>
              <th className="p-2 text-right border-b">Omset</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {serviceBreakdown.slice(0, 5).map((s) => (
              <tr key={s.name}>
                <td className="p-2 font-medium">{s.name}</td>
                <td className="p-2 text-center">{s.count} order</td>
                <td className="p-2 text-center">{s.qty} {s.unit}</td>
                <td className="p-2 text-right font-mono font-semibold">Rp {s.total.toLocaleString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Transaksi Terpilih */}
      <div className="mb-8">
        <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider mb-2 border-l-2 border-zinc-900 pl-2">
          3. Buku Besar Transaksi (Sampel Ringkas)
        </h3>
        <table className="w-full text-xs border border-zinc-300">
          <thead className="bg-zinc-100 text-[10px] font-bold text-zinc-700 uppercase">
            <tr>
              <th className="p-2 text-left border-b">No Nota</th>
              <th className="p-2 text-left border-b">Pelanggan</th>
              <th className="p-2 text-left border-b">Layanan</th>
              <th className="p-2 text-center border-b">Bayar</th>
              <th className="p-2 text-right border-b">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredOrders.slice(0, 8).map((o) => (
              <tr key={o.id}>
                <td className="p-2 font-mono font-semibold">{o.invoiceNo}</td>
                <td className="p-2">{o.customer?.name || "-"}</td>
                <td className="p-2">{o.serviceType}</td>
                <td className="p-2 text-center">{o.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}</td>
                <td className="p-2 text-right font-mono">Rp {o.totalAmount.toLocaleString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tanda Tangan Resmi */}
      <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4 border-t border-zinc-200">
        <div>
          <p className="text-zinc-500 mb-14">Dibuat & Diverifikasi oleh (Kasir/Admin):</p>
          <p className="font-bold text-zinc-900 border-t border-zinc-300 pt-1 mx-8">( ........................................ )</p>
        </div>
        <div>
          <p className="text-zinc-500 mb-14">Disetujui oleh (Pemilik Outlet / Tenant):</p>
          <p className="font-bold text-zinc-900 border-t border-zinc-300 pt-1 mx-8">( {activeTenant.outletName} )</p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Printable Style Sheet Injection for Clean PDF Print */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }

          /* Hide all screen interface elements */
          .no-print,
          aside,
          header,
          nav {
            display: none !important;
          }

          /* Reset body and html */
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 100% !important;
            font-size: 11pt !important;
          }

          /* Reset layout wrappers */
          body > div,
          body > div > div,
          body > div > div > main {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }

          /* Show dedicated printable report */
          #official-report-printable {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }

          #official-report-printable * {
            visibility: visible !important;
            color: inherit;
          }

          /* Prevent unwanted table and signature breaks */
          table, tr, td, th {
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Screen Interface (Hidden when printing) */}
      <div className="no-print space-y-6">
        {/* Top Header & Export Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Laporan Keuangan & Operasional</span>
            <span className="text-xs font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full border border-zinc-200">
              {activeTenant.outletName}
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Rekapitulasi laba rugi, omset penjualan, beban operasional, dan buku besar transaksi
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
            title="Pratinjau lembar cetak dokumen resmi"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            <span>Pratinjau Lembar Cetak</span>
          </button>

          <button
            onClick={downloadCSV}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
            title="Download laporan dalam format Microsoft Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download CSV</span>
          </button>

          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
            title="Cetak atau simpan sebagai dokumen PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak / Download PDF</span>
          </button>
        </div>
      </div>

      {/* Filter & Control Bar: Rentang Waktu (Date Range) */}
      <div className="bg-white rounded-xl border border-zinc-200 p-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Rentang Waktu Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 mr-0.5">
              <Calendar className="w-4 h-4 text-zinc-500" />
              <span>Rentang Waktu:</span>
            </div>

            {/* Date Input Range Box */}
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-zinc-300 transition-colors">
              <span className="text-[11px] font-medium text-zinc-400">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-transparent border-0 font-medium text-zinc-800 outline-none cursor-pointer"
                title="Pilih tanggal mulai"
              />
              <span className="text-zinc-300 font-bold px-0.5">s/d</span>
              <span className="text-[11px] font-medium text-zinc-400">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-transparent border-0 font-medium text-zinc-800 outline-none cursor-pointer"
                title="Pilih tanggal akhir"
              />
            </div>

            {/* Quick Presets for Date Range */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const todayStr = now.toISOString().slice(0, 10);
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                }}
                className="text-[11px] font-medium px-2 py-1 rounded-md text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                  const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
                  setStartDate(startMonth);
                  setEndDate(endMonth);
                }}
                className="text-[11px] font-medium px-2 py-1 rounded-md text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const startLast = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
                  const endLast = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
                  setStartDate(startLast);
                  setEndDate(endLast);
                }}
                className="text-[11px] font-medium px-2 py-1 rounded-md text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition"
              >
                Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const startYear = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
                  const endYear = new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
                  setStartDate(startYear);
                  setEndDate(endYear);
                }}
                className="text-[11px] font-medium px-2 py-1 rounded-md text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition"
              >
                Tahun Ini
              </button>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="text-[11px] font-medium px-2 py-1 rounded-md text-zinc-500 hover:bg-zinc-100 border border-zinc-200 transition"
                  title="Tampilkan semua data tanpa batasan tanggal"
                >
                  Semua
                </button>
              )}
            </div>
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-xs font-medium text-zinc-500">Status:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 font-medium outline-none cursor-pointer focus:border-zinc-900"
            >
              <option value="all">Semua Pembayaran</option>
              <option value="paid">Hanya Lunas</option>
              <option value="unpaid">Belum Lunas (Piutang)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Executive Financial Metrics (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* 1. Omset Penjualan */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Pemasukan Bruto</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-zinc-900 mt-2 font-mono">
            Rp {metrics.totalRevenue.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>{metrics.paidCount} transaksi lunas</span>
          </div>
        </div>

        {/* 2. Piutang Belum Lunas */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-700">Piutang Pelanggan</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-amber-800 mt-2 font-mono">
            Rp {metrics.pendingRevenue.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {metrics.unpaidCount} pesanan belum lunas
          </div>
        </div>

        {/* 3. Pengeluaran Operasional */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-rose-700">Total Pengeluaran</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-rose-800 mt-2 font-mono">
            Rp {metrics.totalExpense.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {filteredExpenses.length} catatan biaya
          </div>
        </div>

        {/* 4. Laba Bersih (Net Profit) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white p-4 rounded-xl shadow-sm border border-blue-700">
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-blue-300 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-blue-200">Laba Bersih</span>
            <span className="text-[10px] font-semibold bg-blue-800/60 text-emerald-300 px-1.5 py-0.2 rounded border border-blue-700">
              Margin {metrics.profitMargin}%
            </span>
          </div>
          <div className="text-xl font-bold text-white mt-2 font-mono">
            Rp {metrics.netProfit.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-blue-300 mt-1">
            Omset dikurangi beban biaya
          </div>
        </div>

        {/* 5. Volume Cucian */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Volume Cucian</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <Scale className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-bold text-zinc-900 mt-2">
            {metrics.totalKg.toFixed(1)} <span className="text-xs font-normal text-zinc-500">Kg</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            +{metrics.totalPcs} Pcs cucian satuan
          </div>
        </div>
      </div>

      {/* Two Column Analytic Panels: Services & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Panel Layanan Terlaris (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800 border border-zinc-200">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-zinc-900 text-sm">Kontribusi Penjualan per Layanan</h3>
            </div>
            <span className="text-xs text-zinc-400">{serviceBreakdown.length} varian layanan</span>
          </div>

          <div className="space-y-3">
            {serviceBreakdown.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs">
                Belum ada data pesanan pada periode ini
              </div>
            ) : (
              serviceBreakdown.map((s) => (
                <div key={s.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800">{s.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500">{s.count} order ({s.qty} {s.unit})</span>
                      <span className="font-bold text-zinc-900 font-mono">Rp {s.total.toLocaleString("id-ID")}</span>
                      <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-1.5 py-0.2 rounded">
                        {s.pct}%
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-900 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(4, s.pct))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel Beban Pengeluaran & Metode Pembayaran (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Breakdown Pengeluaran */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm">Beban Pengeluaran</h3>
              <span className="text-xs font-mono font-bold text-rose-700">
                Rp {metrics.totalExpense.toLocaleString("id-ID")}
              </span>
            </div>

            <div className="space-y-2.5">
              {expenseBreakdown.length === 0 ? (
                <div className="py-6 text-center text-zinc-400 text-xs">
                  Tidak ada pengeluaran tercatat
                </div>
              ) : (
                expenseBreakdown.map((e) => (
                  <div key={e.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-zinc-700">{e.category}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-semibold text-zinc-900">Rp {e.amount.toLocaleString("id-ID")}</span>
                      <span className="text-[10px] text-zinc-400 font-sans">({e.pct}%)</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Metode Pembayaran */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                <span>Metode Pembayaran</span>
              </h3>
              <span className="text-xs text-zinc-400">{metrics.paidCount} order</span>
            </div>

            <div className="space-y-2">
              {paymentMethodBreakdown.map((m) => (
                <div key={m.method} className="flex items-center justify-between text-xs p-2 rounded-lg bg-zinc-50/70 border border-zinc-100">
                  <span className="font-semibold text-zinc-800">{m.method}</span>
                  <div className="text-right">
                    <div className="font-mono font-bold text-zinc-900">Rp {m.amount.toLocaleString("id-ID")}</div>
                    <div className="text-[10px] text-zinc-400">{m.count} transaksi</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Buku Besar Transaksi Rinci (Ledger Table with Search & Pagination) */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-zinc-900 text-sm">Buku Besar Transaksi</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Daftar transaksi pesanan masuk selama periode terpilih</p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nota, pelanggan, layanan..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:bg-white focus:border-zinc-900 transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">No. Nota</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Tanggal</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Pelanggan</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Layanan</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Status</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Pembayaran</th>
                  <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-zinc-400 text-xs">
                      Tidak ada transaksi yang cocok dengan filter
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-semibold text-zinc-900 whitespace-nowrap">
                        {ord.invoiceNo}
                      </td>
                      <td className="py-2.5 px-3.5 text-zinc-500 whitespace-nowrap">
                        {new Date(ord.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                      <td className="py-2.5 px-3.5 font-medium text-zinc-900 whitespace-nowrap">
                        {ord.customer?.name || "Pelanggan Langsung"}
                      </td>
                      <td className="py-2.5 px-3.5 text-zinc-600 whitespace-nowrap">
                        {ord.serviceType} <span className="text-zinc-400 font-mono">({ord.weightOrQty} {ord.unit})</span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="text-[10px] font-semibold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full border border-zinc-200">
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            ord.paymentStatus === "paid"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {ord.paymentStatus === "paid" ? `Lunas (${ord.paymentMethod || "cash"})` : "Belum Lunas"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-zinc-900 whitespace-nowrap font-mono">
                        Rp {ord.totalAmount.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredOrders.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3.5 py-2.5 border-t border-zinc-200 bg-zinc-50/60 text-xs text-zinc-500">
              <div className="text-[11px]">
                Menampilkan <span className="font-semibold text-zinc-800">{Math.min((page - 1) * pageSize + 1, filteredOrders.length)}</span> -{" "}
                <span className="font-semibold text-zinc-800">{Math.min(page * pageSize, filteredOrders.length)}</span> dari{" "}
                <span className="font-semibold text-zinc-800">{filteredOrders.length}</span> transaksi
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-zinc-400">Baris:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="text-[11px] bg-white border border-zinc-200 rounded px-1.5 py-0.5 font-medium outline-none cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-zinc-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-[11px] font-medium text-zinc-700 px-1.5">
                    {page} / {totalPages}
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1 rounded hover:bg-zinc-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    title="Halaman Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Modal Preview Lembar Cetak Dokumen Resmi PDF */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-100">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between no-print bg-zinc-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-zinc-800" />
                <span className="font-bold text-zinc-900 text-sm">Pratinjau Lembar Cetak Laporan Resmi</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPDF}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF Sekarang</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Body for Preview */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white font-sans">
              {renderReportDocument()}
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Printable Area for window.print() (Always mounted in DOM) */}
      <div id="official-report-printable" className="hidden print:block font-sans">
        {renderReportDocument()}
      </div>
    </div>
  );
};
