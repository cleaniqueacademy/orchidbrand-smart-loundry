import React, { useState, useMemo } from "react";
import {
  Plus,
  Phone,
  MapPin,
  ShoppingBag,
  TrendingUp,
  User,
  Pencil,
  Trash2,
  Store,
  Users,
  Award,
  Crown,
  Star,
  Calendar,
  Eye,
  Clock,
  CheckCircle,
  X,
  ExternalLink,
  MessageCircle,
  ArrowUpDown,
  Filter,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
  UserPlus,
  UserCheck,
  UserX,
} from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { Customer, Order, Role, Tenant, DateFilterPreset } from "../../types";
import { ShadcnDataTable, ColumnDef } from "../common/ShadcnDataTable";

interface CustomersTabProps {
  customers: Customer[];
  orders: Order[];
  tenants?: Tenant[];
  currentUserRole?: Role;
  onOpenCustomerModal: () => void;
  onSelectCustomerForOrder: (customerId: string) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

interface CustomerWithStats extends Customer {
  ordersInPeriod: number;
  spentInPeriod: number;
  totalOrdersAllTime: number;
  totalSpentAllTime: number;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  outletName?: string;
  isTopOrder: boolean;
  isTopSpender: boolean;
  isNew: boolean;
  isPassive: boolean;
}

const statusBadgeStyles: Record<string, string> = {
  process: "bg-amber-50 text-amber-800 border-amber-200",
  ready: "bg-emerald-50 text-emerald-800 border-emerald-200",
  completed: "bg-blue-900 text-white border-blue-900",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  washing: "bg-amber-50 text-amber-800 border-amber-200",
  drying_ironing: "bg-amber-50 text-amber-800 border-amber-200",
};

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  orders,
  tenants = [],
  currentUserRole = "staff",
  onOpenCustomerModal,
  onSelectCustomerForOrder,
  onEditCustomer,
  onDeleteCustomer,
}) => {
  const isSuperAdmin = currentUserRole === "superadmin";

  // --- FILTER & SORT STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("this_month");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  );
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("orders_period");

  // --- DETAIL MODAL STATE ---
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] =
    useState<CustomerWithStats | null>(null);
  const [detailOrderPage, setDetailOrderPage] = useState(1);
  const DETAIL_PAGE_SIZE = 5;

  // Available years from orders & customers
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentYr = new Date().getFullYear().toString();
    yearsSet.add(currentYr);
    yearsSet.add((new Date().getFullYear() - 1).toString());

    orders.forEach((o) => {
      if (o.createdAt) {
        const yr = new Date(o.createdAt).getFullYear();
        if (!isNaN(yr)) yearsSet.add(yr.toString());
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [orders]);

  // Helper: Mengecek apakah tanggal order masuk dalam periode yang dipilih
  const isOrderInSelectedPeriod = (orderDateStr: string) => {
    const d = new Date(orderDateStr);
    if (isNaN(d.getTime())) return false;

    const now = new Date();

    // 1. Jika pengguna memilih spesifik bulan tertentu
    if (selectedMonth !== "all") {
      const monthNum = parseInt(selectedMonth, 10);
      const yearNum = parseInt(selectedYear, 10);
      return d.getMonth() === monthNum && d.getFullYear() === yearNum;
    }

    // 2. Berdasarkan DateFilterPreset
    switch (datePreset) {
      case "today": {
        const today = new Date();
        return (
          d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear()
        );
      }
      case "this_week": {
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay() || 7;
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(startOfWeek.getDate() - day + 1);
        return d >= startOfWeek;
      }
      case "this_month": {
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      }
      case "this_year": {
        return d.getFullYear() === now.getFullYear();
      }
      case "all":
      default:
        return true;
    }
  };

  // Label Periode Aktif untuk Info Header
  const activePeriodLabel = useMemo(() => {
    if (selectedMonth !== "all") {
      const mIdx = parseInt(selectedMonth, 10);
      return `${MONTH_NAMES[mIdx]} ${selectedYear}`;
    }
    switch (datePreset) {
      case "today":
        return "Hari Ini";
      case "this_week":
        return "Minggu Ini";
      case "this_month":
        return `Bulan Ini (${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()})`;
      case "this_year":
        return `Tahun ${new Date().getFullYear()}`;
      case "all":
      default:
        return "Semua Waktu";
    }
  }, [selectedMonth, selectedYear, datePreset]);

  // --- HITUNG STATISTIK PELANGGAN (AGGREGATION) ---
  const enrichedCustomers = useMemo<CustomerWithStats[]>(() => {
    // 1. Kelompokkan order per customer
    const ordersByCustomer: Record<string, Order[]> = {};
    orders.forEach((ord) => {
      const cId = ord.customerId || ord.customer?.id;
      if (cId) {
        if (!ordersByCustomer[cId]) ordersByCustomer[cId] = [];
        ordersByCustomer[cId].push(ord);
      }
    });

    // 2. Petakan tiap customer dengan metriknya
    const mapped = customers.map((cust) => {
      const custOrders = ordersByCustomer[cust.id] || [];

      // Semua order
      const totalOrdersAllTime = custOrders.length;
      const totalSpentAllTime = custOrders
        .filter((o) => o.paymentStatus === "paid")
        .reduce((sum, o) => sum + o.totalAmount, 0);

      // Order dalam periode terpilih
      const ordersInPeriodList = custOrders.filter((o) =>
        isOrderInSelectedPeriod(o.createdAt)
      );
      const ordersInPeriod = ordersInPeriodList.length;
      const spentInPeriod = ordersInPeriodList
        .filter((o) => o.paymentStatus === "paid")
        .reduce((sum, o) => sum + o.totalAmount, 0);

      // Order terakhir
      let lastOrderDate: string | null = null;
      let daysSinceLastOrder: number | null = null;
      if (custOrders.length > 0) {
        const sortedOrders = [...custOrders].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        lastOrderDate = sortedOrders[0].createdAt;
        const diffMs = Date.now() - new Date(lastOrderDate).getTime();
        daysSinceLastOrder = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }

      // Tenant name
      const outlet = tenants.find((t) => t.id === cust.tenantId);

      // Status pelanggan baru (dibuat < 30 hari atau order pertama < 30 hari)
      const custCreatedAt = cust.createdAt ? new Date(cust.createdAt).getTime() : 0;
      const isNew =
        custCreatedAt > 0 &&
        Date.now() - custCreatedAt < 30 * 24 * 60 * 60 * 1000;

      // Status pasif (> 30 hari tidak mencuci)
      const isPassive =
        daysSinceLastOrder !== null ? daysSinceLastOrder > 30 : totalOrdersAllTime === 0;

      return {
        ...cust,
        ordersInPeriod,
        spentInPeriod,
        totalOrdersAllTime,
        totalSpentAllTime,
        lastOrderDate,
        daysSinceLastOrder,
        outletName: outlet?.outletName || "Pusat",
        isTopOrder: false,
        isTopSpender: false,
        isNew,
        isPassive,
      };
    });

    // 3. Tentukan siapa Top Order & Top Spender di periode ini
    const maxOrders = Math.max(0, ...mapped.map((c) => c.ordersInPeriod));
    const maxSpent = Math.max(0, ...mapped.map((c) => c.spentInPeriod));

    return mapped.map((c) => ({
      ...c,
      isTopOrder: maxOrders > 0 && c.ordersInPeriod === maxOrders,
      isTopSpender: maxSpent > 0 && c.spentInPeriod === maxSpent,
    }));
  }, [customers, orders, selectedMonth, selectedYear, datePreset, tenants]);

  // --- FILTERING & SORTING DATA TABEL ---
  const filteredAndSortedCustomers = useMemo(() => {
    return enrichedCustomers
      .filter((cust) => {
        // Search query
        const q = searchQuery.toLowerCase().trim();
        const matchSearch =
          !q ||
          cust.name.toLowerCase().includes(q) ||
          cust.phone.includes(q) ||
          (cust.address && cust.address.toLowerCase().includes(q)) ||
          (cust.notes && cust.notes.toLowerCase().includes(q));

        // Tenant filter
        const matchTenant =
          tenantFilter === "all" || cust.tenantId === tenantFilter;

        // Segment filter
        let matchSegment = true;
        if (segmentFilter === "top_order") {
          matchSegment = cust.isTopOrder || cust.ordersInPeriod >= 3;
        } else if (segmentFilter === "top_spender") {
          matchSegment = cust.isTopSpender || cust.spentInPeriod >= 200000;
        } else if (segmentFilter === "active_period") {
          matchSegment = cust.ordersInPeriod > 0;
        } else if (segmentFilter === "new_customer") {
          matchSegment = cust.isNew;
        } else if (segmentFilter === "passive") {
          matchSegment = cust.isPassive;
        }

        return matchSearch && matchTenant && matchSegment;
      })
      .sort((a, b) => {
        if (sortBy === "orders_period") {
          return b.ordersInPeriod - a.ordersInPeriod || b.totalOrdersAllTime - a.totalOrdersAllTime;
        }
        if (sortBy === "spent_period") {
          return b.spentInPeriod - a.spentInPeriod || b.totalSpentAllTime - a.totalSpentAllTime;
        }
        if (sortBy === "orders_all") {
          return b.totalOrdersAllTime - a.totalOrdersAllTime;
        }
        if (sortBy === "spent_all") {
          return b.totalSpentAllTime - a.totalSpentAllTime;
        }
        if (sortBy === "last_order") {
          const timeA = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
          const timeB = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
          return timeB - timeA;
        }
        if (sortBy === "name_asc") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [enrichedCustomers, searchQuery, tenantFilter, segmentFilter, sortBy]);

  // --- STATISTIK RINGKASAN ATAS (METRICS) ---
  const metrics = useMemo(() => {
    const totalCount = customers.length;
    const activeInPeriod = enrichedCustomers.filter((c) => c.ordersInPeriod > 0);
    const activeCount = activeInPeriod.length;

    // Top Active Pelanggan
    const sortedByOrders = [...enrichedCustomers].sort(
      (a, b) => b.ordersInPeriod - a.ordersInPeriod
    );
    const topActiveCust =
      sortedByOrders.length > 0 && sortedByOrders[0].ordersInPeriod > 0
        ? sortedByOrders[0]
        : null;

    // Top Spender Pelanggan
    const sortedBySpent = [...enrichedCustomers].sort(
      (a, b) => b.spentInPeriod - a.spentInPeriod
    );
    const topSpenderCust =
      sortedBySpent.length > 0 && sortedBySpent[0].spentInPeriod > 0
        ? sortedBySpent[0]
        : null;

    // Pelanggan Pasif / Butuh Follow-up
    const passiveCount = enrichedCustomers.filter((c) => c.isPassive).length;

    return {
      totalCount,
      activeCount,
      topActiveCust,
      topSpenderCust,
      passiveCount,
    };
  }, [customers, enrichedCustomers]);

  // Orders for currently selected detail modal customer
  const customerDetailOrders = useMemo(() => {
    if (!selectedCustomerForDetail) return [];
    return orders
      .filter((o) => o.customerId === selectedCustomerForDetail.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, selectedCustomerForDetail]);

  const totalDetailOrderPages = Math.max(
    1,
    Math.ceil(customerDetailOrders.length / DETAIL_PAGE_SIZE)
  );
  const paginatedDetailOrders = customerDetailOrders.slice(
    (detailOrderPage - 1) * DETAIL_PAGE_SIZE,
    detailOrderPage * DETAIL_PAGE_SIZE
  );

  // --- DEFINISI KOLOM TABEL DATA ---
  const columns: ColumnDef<CustomerWithStats>[] = [
    {
      id: "customer",
      header: "Pelanggan",
      cell: (cust) => {
        return (
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-extrabold shadow-xs ${
                  cust.isTopOrder
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white ring-2 ring-amber-300"
                    : cust.isTopSpender
                    ? "bg-gradient-to-br from-emerald-600 to-teal-700 text-white ring-2 ring-emerald-300"
                    : "bg-blue-900 text-white"
                }`}
              >
                {cust.name.slice(0, 2).toUpperCase()}
              </div>
              {cust.isTopOrder && (
                <div
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[9px] shadow-xs"
                  title="Pelanggan Teraktif Bulan Ini"
                >
                  <Crown className="w-2.5 h-2.5 fill-current" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-zinc-900 text-xs truncate">
                  {cust.name}
                </span>

                {/* Badges Segmen */}
                {cust.isTopOrder && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[9.5px] font-bold">
                    <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    Teraktif
                  </span>
                )}
                {cust.isTopSpender && !cust.isTopOrder && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9.5px] font-bold">
                    <Award className="w-2.5 h-2.5 text-emerald-600" />
                    Top Spender
                  </span>
                )}
                {cust.isNew && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-sky-50 text-sky-700 border border-sky-200 text-[9.5px] font-semibold">
                    Baru
                  </span>
                )}
                {cust.isPassive && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200 text-[9.5px] font-medium">
                    Pasif
                  </span>
                )}
              </div>

              <div className="text-[10px] text-zinc-400 font-mono mt-0.5 truncate">
                ID: {cust.id.slice(0, 10)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "contact",
      header: "Kontak & WhatsApp",
      cell: (cust) => {
        const cleanPhone = cust.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
        const defaultWaMsg = encodeURIComponent(
          `Halo Kak ${cust.name}, kami dari Laundry Cleanique. Terima kasih sudah mempercayakan cucian Anda kepada kami!`
        );

        return (
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-mono text-xs text-zinc-700">{cust.phone}</span>
            <a
              href={`https://wa.me/${cleanPhone}?text=${defaultWaMsg}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition shrink-0 flex items-center gap-1 shadow-2xs"
              title="Kirim Pesan WhatsApp"
            >
              <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
              <span className="text-[10px] font-semibold text-emerald-700 pr-0.5">Chat</span>
            </a>
          </div>
        );
      },
    },
    ...(isSuperAdmin || tenants.length > 1
      ? ([
          {
            id: "outlet",
            header: "Cabang",
            cell: (cust: CustomerWithStats) => (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-900 border border-blue-200/80 px-2 py-0.5 rounded-md whitespace-nowrap">
                <Store className="w-3 h-3 text-blue-700 shrink-0" />
                <span>{cust.outletName}</span>
              </span>
            ),
          },
        ] as ColumnDef<CustomerWithStats>[])
      : []),
    {
      id: "ordersInPeriod",
      header: `Order (${selectedMonth !== "all" ? "Bulan Terpilih" : datePreset === "all" ? "Total" : "Periode"})`,
      cell: (cust) => {
        return (
          <div className="whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                  cust.ordersInPeriod > 0
                    ? "bg-indigo-50 text-indigo-900 border-indigo-200"
                    : "bg-zinc-100 text-zinc-500 border-zinc-200"
                }`}
              >
                {cust.ordersInPeriod}x transaksi
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              Total riwayat: {cust.totalOrdersAllTime}x
            </div>
          </div>
        );
      },
    },
    {
      id: "spentInPeriod",
      header: "Total Belanja",
      cell: (cust) => {
        return (
          <div className="whitespace-nowrap">
            <div className="font-bold text-zinc-900 text-xs">
              Rp {cust.spentInPeriod.toLocaleString("id-ID")}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              LTV: Rp {cust.totalSpentAllTime.toLocaleString("id-ID")}
            </div>
          </div>
        );
      },
    },
    {
      id: "lastOrder",
      header: "Kunjungan Terakhir",
      cell: (cust) => {
        if (!cust.lastOrderDate || cust.daysSinceLastOrder === null) {
          return <span className="text-[11px] text-zinc-400 italic">Belum ada order</span>;
        }

        const days = cust.daysSinceLastOrder;
        let badgeColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
        let label = `${days} hari lalu`;

        if (days === 0) {
          label = "Hari ini";
        } else if (days > 30) {
          badgeColor = "text-rose-700 bg-rose-50 border-rose-200";
          label = `${Math.floor(days / 30)} bln lalu`;
        } else if (days > 14) {
          badgeColor = "text-amber-800 bg-amber-50 border-amber-200";
          label = `${Math.floor(days / 7)} mgg lalu`;
        }

        return (
          <div className="whitespace-nowrap">
            <span
              className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badgeColor}`}
            >
              {label}
            </span>
            <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
              {new Date(cust.lastOrderDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        );
      },
    },
    {
      id: "address",
      header: "Alamat & Catatan",
      cell: (cust) => (
        <div className="max-w-[200px] truncate text-xs">
          <div className="text-zinc-700 truncate" title={cust.address || "-"}>
            {cust.address || "—"}
          </div>
          {cust.notes && (
            <div
              className="text-[10px] text-zinc-400 italic truncate mt-0.5"
              title={cust.notes}
            >
              "{cust.notes}"
            </div>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      align: "right",
      cell: (cust) => (
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Detail Riwayat Pesanan Modal */}
          <button
            onClick={() => {
              setSelectedCustomerForDetail(cust);
              setDetailOrderPage(1);
            }}
            className="p-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-900 transition shadow-2xs cursor-pointer"
            title="Lihat Riwayat & Analisis Pelanggan"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Quick Create Order */}
          {!isSuperAdmin && (
            <button
              onClick={() => onSelectCustomerForOrder(cust.id)}
              className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition shadow-2xs cursor-pointer"
              title="Buat Order Baru untuk Pelanggan Ini"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Edit Data */}
          <button
            onClick={() => onEditCustomer(cust)}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition shadow-2xs cursor-pointer"
            title="Edit Data Pelanggan"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Delete Customer */}
          <button
            onClick={() => onDeleteCustomer(cust.id)}
            className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition shadow-2xs cursor-pointer"
            title="Hapus Data Pelanggan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION & ACTIONS                                               */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
              Data & Analisis Pelanggan
            </h2>
            <span className="text-[11px] font-semibold bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-full">
              Periode: {activePeriodLabel}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Database loyalitas, tracking pelanggan teraktif, dan riwayat pesanan laundry.
          </p>
        </div>

        <button
          onClick={onOpenCustomerModal}
          className="bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-sm transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Pelanggan Baru
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. 4 EXECUTIVE KPI & TRACKING CARDS                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Pelanggan - Hero Spotlight */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-300 bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/30 p-4 shadow-sm">
          <div className="absolute -right-4 -bottom-4 w-16 h-16 rounded-full bg-sky-400/20 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
              Total Basis Data
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {metrics.totalCount}
          </div>
          <p className="text-[11px] text-sky-700 font-medium mt-0.5">
            Pelanggan terdaftar di outlet
          </p>
        </div>

        {/* Card 2: Pelanggan Aktif di Periode Ini */}
        <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
              Aktif di Periode Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {metrics.activeCount}{" "}
            <span className="text-xs font-normal text-zinc-400">
              ({metrics.totalCount > 0 ? Math.round((metrics.activeCount / metrics.totalCount) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-indigo-700/90 font-medium mt-0.5">
            Mencuci pada {activePeriodLabel}
          </p>
        </div>

        {/* Card 3: Pelanggan Teraktif (Top Frequency) */}
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Juara Teraktif ⭐
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-zinc-900 mt-2 truncate">
            {metrics.topActiveCust ? metrics.topActiveCust.name : "Belum Ada Order"}
          </div>
          <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
            {metrics.topActiveCust
              ? `${metrics.topActiveCust.ordersInPeriod}x pesanan (${metrics.topActiveCust.totalOrdersAllTime}x total)`
              : "0 transaksi di periode ini"}
          </p>
        </div>

        {/* Card 4: Top Spender (Tertinggi Belanja) */}
        <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Top Spender 💎
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-zinc-900 mt-2 truncate">
            {metrics.topSpenderCust ? metrics.topSpenderCust.name : "Belum Ada"}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 font-mono">
            {metrics.topSpenderCust
              ? `Rp ${metrics.topSpenderCust.spentInPeriod.toLocaleString("id-ID")}`
              : "Rp 0"}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SHADCN DATA TABLE DENGAN KONTROL FILTER BULANAN & SEGMEN                */}
      {/* ========================================================================= */}
      <ShadcnDataTable
        data={filteredAndSortedCustomers}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Cari pelanggan (nama, WhatsApp, alamat)..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        datePreset={datePreset}
        onDatePresetChange={(preset) => {
          setDatePreset(preset);
          setSelectedMonth("all"); // reset specific month dropdown if preset changed
        }}
        customFilters={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Bulan Spesifik */}
            <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-0.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-semibold bg-transparent text-zinc-700 outline-none cursor-pointer py-1"
                title="Pilih Bulan Khusus"
              >
                <option value="all">Pilih Bulan (Bebas)</option>
                {MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx.toString()}>
                    {m}
                  </option>
                ))}
              </select>

              {selectedMonth !== "all" && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="text-xs font-semibold bg-transparent text-zinc-700 outline-none cursor-pointer py-1 pl-1 border-l border-zinc-200"
                  title="Pilih Tahun"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Filter Segmen Aktivitas Pelanggan */}
            <div className="flex items-center gap-1">
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
              >
                <option value="all">Semua Segmen</option>
                <option value="top_order">⭐ Teraktif (Top Order)</option>
                <option value="top_spender">💎 Top Spender (Belanja Terbanyak)</option>
                <option value="active_period">🔥 Aktif di Periode Ini</option>
                <option value="new_customer">🌱 Pelanggan Baru (&lt; 30 hari)</option>
                <option value="passive">💤 Perlu Follow-up (Pasif &gt; 30 hari)</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
              >
                <option value="orders_period">Sort: Order Terbanyak (Periode)</option>
                <option value="spent_period">Sort: Belanja Terbanyak (Periode)</option>
                <option value="orders_all">Sort: Total Order All-Time</option>
                <option value="spent_all">Sort: Total Belanja All-Time</option>
                <option value="last_order">Sort: Terakhir Cuci (Terbaru)</option>
                <option value="name_asc">Sort: Nama Pelanggan (A-Z)</option>
              </select>
            </div>

            {/* Filter Cabang (Superadmin or multi-tenant) */}
            {(isSuperAdmin || tenants.length > 1) && (
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
              >
                <option value="all">Semua Cabang</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.outletName}
                  </option>
                ))}
              </select>
            )}
          </div>
        }
        emptyMessage="Tidak ada pelanggan yang sesuai dengan filter atau kata kunci pencarian."
        initialPageSize={10}
      />

      {/* ========================================================================= */}
      {/* 4. MODAL DETAIL & RIWAYAT PESANAN LENGKAP PELANGGAN                       */}
      {/* ========================================================================= */}
      {selectedCustomerForDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-3xl rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-zinc-200 bg-gradient-to-r from-zinc-50 to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                    selectedCustomerForDetail.isTopOrder
                      ? "bg-amber-500 text-white"
                      : "bg-blue-900 text-white"
                  }`}
                >
                  {selectedCustomerForDetail.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-zinc-900 text-base">
                      {selectedCustomerForDetail.name}
                    </h3>
                    {selectedCustomerForDetail.isTopOrder && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Crown className="w-3 h-3 fill-amber-500" /> Teraktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    ID: {selectedCustomerForDetail.id} • Cabang:{" "}
                    {selectedCustomerForDetail.outletName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomerForDetail(null)}
                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
              {/* Profile Details & Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Kontak */}
                <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/60">
                  <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-zinc-500" /> Nomor Telepon / WA
                  </div>
                  <div className="text-xs font-mono font-bold text-zinc-900 mt-1">
                    {selectedCustomerForDetail.phone}
                  </div>
                </div>

                {/* Alamat */}
                <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/60">
                  <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-zinc-500" /> Alamat Domisili
                  </div>
                  <div
                    className="text-xs text-zinc-800 mt-1 truncate"
                    title={selectedCustomerForDetail.address || "-"}
                  >
                    {selectedCustomerForDetail.address || "—"}
                  </div>
                </div>

                {/* Catatan Khusus */}
                <div className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/60">
                  <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-zinc-500" /> Catatan Khusus
                  </div>
                  <div
                    className="text-xs text-zinc-800 italic mt-1 truncate"
                    title={selectedCustomerForDetail.notes || "-"}
                  >
                    {selectedCustomerForDetail.notes || "—"}
                  </div>
                </div>
              </div>

              {/* 4 Mini Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <span className="text-[10.5px] text-zinc-500 font-medium">
                    Total Belanja (LTV)
                  </span>
                  <div className="text-sm font-bold text-zinc-900 mt-0.5 font-mono">
                    Rp {selectedCustomerForDetail.totalSpentAllTime.toLocaleString("id-ID")}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <span className="text-[10.5px] text-zinc-500 font-medium">
                    Belanja {activePeriodLabel}
                  </span>
                  <div className="text-sm font-bold text-emerald-700 mt-0.5 font-mono">
                    Rp {selectedCustomerForDetail.spentInPeriod.toLocaleString("id-ID")}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <span className="text-[10.5px] text-zinc-500 font-medium">
                    Total Order Riwayat
                  </span>
                  <div className="text-sm font-bold text-zinc-900 mt-0.5">
                    {selectedCustomerForDetail.totalOrdersAllTime}x transaksi
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-200 bg-white shadow-2xs">
                  <span className="text-[10.5px] text-zinc-500 font-medium">
                    Order Terakhir
                  </span>
                  <div className="text-sm font-bold text-zinc-800 mt-0.5">
                    {selectedCustomerForDetail.daysSinceLastOrder !== null
                      ? selectedCustomerForDetail.daysSinceLastOrder === 0
                        ? "Hari ini"
                        : `${selectedCustomerForDetail.daysSinceLastOrder} hari lalu`
                      : "Belum ada"}
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-blue-50/50 border border-blue-200/70 flex-wrap">
                <div className="text-xs text-blue-900 font-medium">
                  Kelola interaksi dan buat pesanan cepat untuk pelanggan ini:
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://wa.me/${selectedCustomerForDetail.phone
                      .replace(/[^0-9]/g, "")
                      .replace(/^0/, "62")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                    <span>WhatsApp</span>
                  </a>

                  {!isSuperAdmin && (
                    <button
                      onClick={() => {
                        const cId = selectedCustomerForDetail.id;
                        setSelectedCustomerForDetail(null);
                        onSelectCustomerForOrder(cId);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat Order</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const cust = selectedCustomerForDetail;
                      setSelectedCustomerForDetail(null);
                      onEditCustomer(cust);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Edit Profil</span>
                  </button>
                </div>
              </div>

              {/* Table of Orders */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-900 text-xs sm:text-sm flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-zinc-600" />
                    Daftar Semua Pesanan Cucian ({customerDetailOrders.length})
                  </h4>
                </div>

                {customerDetailOrders.length === 0 ? (
                  <div className="py-8 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-xl">
                    Belum ada catatan riwayat pesanan untuk pelanggan ini.
                  </div>
                ) : (
                  <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
                            <th className="py-2.5 px-3">No. Nota</th>
                            <th className="py-2.5 px-3">Tanggal</th>
                            <th className="py-2.5 px-3">Layanan</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Pembayaran</th>
                            <th className="py-2.5 px-3 text-right">Total Biaya</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {paginatedDetailOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-zinc-50/70 transition">
                              <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">
                                {ord.invoiceNo}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-600 whitespace-nowrap">
                                {new Date(ord.createdAt).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-700">
                                <div className="font-medium text-zinc-800">
                                  {ord.serviceType}
                                </div>
                                <div className="text-[10px] text-zinc-400">
                                  {ord.weightOrQty} {ord.unit}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    statusBadgeStyles[ord.status] || "bg-zinc-100 text-zinc-700"
                                  }`}
                                >
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    ord.paymentStatus === "paid"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {ord.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-900">
                                Rp {ord.totalAmount.toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination for Modal Order History */}
                    {totalDetailOrderPages > 1 && (
                      <div className="border-t border-zinc-100 px-3 py-2 flex items-center justify-between text-xs bg-zinc-50/60">
                        <span className="text-[11px] text-zinc-500">
                          Halaman {detailOrderPage} dari {totalDetailOrderPages}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetailOrderPage((p) => Math.max(1, p - 1))}
                            disabled={detailOrderPage === 1}
                            className="p-1 rounded border border-zinc-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDetailOrderPage((p) =>
                                Math.min(totalDetailOrderPages, p + 1)
                              )
                            }
                            disabled={detailOrderPage === totalDetailOrderPages}
                            className="p-1 rounded border border-zinc-200 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedCustomerForDetail(null)}
                className="px-4 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
