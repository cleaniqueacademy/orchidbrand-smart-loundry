import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Bot,
  X,
  Send,
  Trash2,
  ArrowRight,
  User,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../utils/api";
import { TabType } from "../../types";

export interface ActionItem {
  type: "NAVIGATE" | "OPEN_MODAL";
  target: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  cleanContent: string;
  actions?: ActionItem[];
  time: string;
  model?: string;
}

export interface AIAssistantWidgetProps {
  activeTab?: TabType;
  setActiveTab?: (tab: TabType) => void;
  currentUserRole?: string;
  onOpenWhatsAppModal?: () => void;
  onOpenOpenShiftModal?: () => void;
  onOpenCloseShiftModal?: () => void;
  onOpenExpenseModal?: (type?: "income" | "expense") => void;
  onOpenTutorialModal?: () => void;
}

export type PromptCategory =
  | "all"
  | "menus"
  | "settings"
  | "pos"
  | "shift"
  | "tips"
  | "platform"
  | "outlets"
  | "users"
  | "finance_admin"
  | "referral"
  | "commission"
  | "tenants_marketing"
  | "customers"
  | "biz";

export interface QuickPrompt {
  id: string;
  category: PromptCategory;
  label: string;
  text: string;
  roles: string[];
}

export interface PromptCategoryDef {
  id: PromptCategory;
  label: string;
}

export const ROLE_QUICK_PROMPTS: QuickPrompt[] = [
  // ==========================================
  // 1. SUPER ADMIN (HQ PLATFORM) PROMPTS
  // ==========================================
  {
    id: "sa-overview",
    category: "platform",
    label: "Ringkasan Platform",
    text: "Tampilkan ringkasan status operasional seluruh cabang dan omset platform pusat",
    roles: ["superadmin"],
  },
  {
    id: "sa-tenants",
    category: "outlets",
    label: "Kelola Cabang Outlet",
    text: "Bagaimana cara menambah cabang baru atau memperpanjang masa aktif lisensi outlet?",
    roles: ["superadmin"],
  },
  {
    id: "sa-users",
    category: "users",
    label: "Kelola Pengguna & Role",
    text: "Bagaimana cara mengatur hak akses pengguna, reset password, atau menonaktifkan akun?",
    roles: ["superadmin"],
  },
  {
    id: "sa-invoices",
    category: "finance_admin",
    label: "Arus Kas Langganan",
    text: "Bagaimana cara memeriksa pembayaran invoice langganan dan verifikasi bukti transfer outlet?",
    roles: ["superadmin"],
  },
  {
    id: "sa-marketing",
    category: "finance_admin",
    label: "Tim Marketing & Insentif",
    text: "Bagaimana cara mendaftarkan tim marketing baru dan memantau komisi referral mereka?",
    roles: ["superadmin"],
  },
  {
    id: "sa-referral",
    category: "finance_admin",
    label: "Kelola Kode Referral",
    text: "Bagaimana cara membuat kode referral baru dan mengatur persentase diskonnya?",
    roles: ["superadmin"],
  },
  {
    id: "sa-settings",
    category: "settings",
    label: "Setting Platform Pusat",
    text: "Bagaimana cara mengatur rekening bank penampung pusat dan WhatsApp Gateway HQ?",
    roles: ["superadmin"],
  },
  {
    id: "sa-logs",
    category: "settings",
    label: "Audit Data Log Sistem",
    text: "Bagaimana cara memeriksa log aktivitas sistem dan riwayat pengiriman notifikasi?",
    roles: ["superadmin"],
  },

  // ==========================================
  // 2. TIM MARKETING INDOTECH PROMPTS
  // ==========================================
  {
    id: "mkt-share",
    category: "referral",
    label: "Cara Bagikan Kode",
    text: "Bagaimana cara membagikan link pendaftaran dengan kode referral saya ke calon pemilik laundry?",
    roles: ["marketing"],
  },
  {
    id: "mkt-stats",
    category: "referral",
    label: "Performa Kode Referral",
    text: "Bagaimana cara membaca statistik klik, pendaftar, dan konversi kode referral saya?",
    roles: ["marketing"],
  },
  {
    id: "mkt-calc",
    category: "commission",
    label: "Penghitungan Komisi",
    text: "Berapa persen komisi yang saya dapatkan dari setiap outlet yang berlangganan?",
    roles: ["marketing"],
  },
  {
    id: "mkt-bank",
    category: "commission",
    label: "Rekening Pencairan",
    text: "Bagaimana cara memastikan rekening bank saya sudah benar untuk pencairan komisi?",
    roles: ["marketing"],
  },
  {
    id: "mkt-tenants",
    category: "tenants_marketing",
    label: "Laundry Terdaftar",
    text: "Bagaimana cara melihat daftar laundry yang sudah mendaftar lewat kode referral saya?",
    roles: ["marketing"],
  },
  {
    id: "mkt-script",
    category: "referral",
    label: "Skrip Promosi CS AI",
    text: "Berikan contoh kalimat penawaran ke calon pemilik laundry yang ragu mencoba aplikasi",
    roles: ["marketing"],
  },

  // ==========================================
  // 3. STAF KASIR (POS & SHIFT) PROMPTS
  // ==========================================
  {
    id: "staff-order",
    category: "pos",
    label: "Cara Buat Order Kasir",
    text: "Bagaimana alur input pesanan kiloan dan satuan di meja kasir POS?",
    roles: ["staff", "kasir"],
  },
  {
    id: "staff-status",
    category: "pos",
    label: "6 Status Cucian",
    text: "Jelaskan 6 tahap status cucian laundry dari diterima sampai diambil pelanggan",
    roles: ["staff", "kasir"],
  },
  {
    id: "staff-receipt",
    category: "pos",
    label: "Cetak Struk Kasir",
    text: "Bagaimana cara mencetak nota struk kasir 58mm atau 80mm?",
    roles: ["staff", "kasir"],
  },
  {
    id: "staff-open-shift",
    category: "shift",
    label: "Cara Buka Shift",
    text: "Bagaimana cara membuka shift kasir dan mengisi modal awal di laci?",
    roles: ["staff", "kasir"],
  },
  {
    id: "staff-close-shift",
    category: "shift",
    label: "Cara Tutup Shift",
    text: "Bagaimana cara menutup shift kasir dan rekonsiliasi uang fisik kasir?",
    roles: ["staff", "kasir"],
  },
  {
    id: "staff-diff",
    category: "shift",
    label: "Jika Kas Selisih",
    text: "Apa yang harus dilakukan jika uang kas fisik di laci tidak seimbang dengan sistem?",
    roles: ["staff", "kasir"],
  },
  {
    id: "staff-customer",
    category: "customers",
    label: "Cari Data Pelanggan",
    text: "Bagaimana cara mencari kontak pelanggan dan memeriksa riwayat nota cuciannya?",
    roles: ["staff", "kasir"],
  },
  {
    id: "staff-ink",
    category: "tips",
    label: "Noda Tinta Pulpen",
    text: "Bagaimana cara membersihkan noda tinta pulpen di baju pelanggan?",
    roles: ["staff", "kasir"],
  },
  {
    id: "staff-oil",
    category: "tips",
    label: "Noda Minyak Makanan",
    text: "Bagaimana cara mencuci pakaian yang terkena noda minyak makanan membandel?",
    roles: ["staff", "kasir"],
  },
  {
    id: "staff-blood",
    category: "tips",
    label: "Noda Darah",
    text: "Bagaimana cara menghilangkan noda darah yang aman pada pakaian?",
    roles: ["staff", "kasir"],
  },

  // ==========================================
  // 4. PEMILIK OUTLET (OWNER / TENANT_OWNER) PROMPTS
  // ==========================================
  {
    id: "owner-summary",
    category: "menus",
    label: "Omset Toko Hari Ini",
    text: "Berikan ringkasan operasional dan omset toko hari ini",
    roles: ["owner", "tenant_owner"],
  },
  {
    id: "owner-cashflow",
    category: "menus",
    label: "Cara Pakai Buku Kas",
    text: "Apa fungsi menu Buku Kas dan bagaimana cara mencatat pengeluaran toko?",
    roles: ["owner", "tenant_owner"],
  },
  {
    id: "owner-reports",
    category: "menus",
    label: "Ekspor Excel & PDF",
    text: "Bagaimana cara mencetak laporan keuangan ke file PDF atau ekspor ke Excel?",
    roles: ["owner", "tenant_owner"],
  },
  {
    id: "owner-sub",
    category: "menus",
    label: "Perpanjang Langganan",
    text: "Bagaimana cara perpanjang paket langganan cabang saya dan gunakan kode diskon?",
    roles: ["owner", "tenant_owner"],
  },
  {
    id: "owner-hours",
    category: "settings",
    label: "Atur Jam Buka Toko",
    text: "Bagaimana cara mengubah jam operasional outlet saya agar muncul di nota digital?",
    roles: ["owner", "tenant_owner"],
  },
  {
    id: "owner-bank",
    category: "settings",
    label: "Atur Rekening & QRIS",
    text: "Bagaimana cara mengatur rekening bank dan info QRIS pembayaran laundry?",
    roles: ["owner", "tenant_owner"],
  },
  {
    id: "owner-wa",
    category: "settings",
    label: "WhatsApp Otomatis",
    text: "Bagaimana cara menghubungkan WhatsApp agar nota terkirim otomatis ke pelanggan?",
    roles: ["owner", "tenant_owner"],
  },
  {
    id: "owner-staff",
    category: "settings",
    label: "Tambah Akun Kasir",
    text: "Bagaimana cara menambah akun kasir baru dan mengatur hak aksesnya?",
    roles: ["owner", "tenant_owner"],
  },
  {
    id: "owner-services",
    category: "pos",
    label: "Atur Tarif Layanan",
    text: "Bagaimana cara menambah paket cuci kiloan baru atau mengubah harga satuan?",
    roles: ["owner", "tenant_owner"],
  },
  {
    id: "owner-health",
    category: "biz",
    label: "Kesehatan Bisnis",
    text: "Bagaimana analisa kesehatan bisnis dan efisiensi pengeluaran laundry saya bulan ini?",
    roles: ["owner", "tenant_owner"],
  },
  {
    id: "owner-detergent",
    category: "biz",
    label: "Audit Takaran Deterjen",
    text: "Berapa estimasi pemakaian deterjen dan parfum saya dari total cucian yang masuk?",
    roles: ["owner", "tenant_owner"],
  },
  {
    id: "owner-rent",
    category: "biz",
    label: "Status Sewa Ruko",
    text: "Berapa sisa masa sewa ruko saya dan berapa beban sewanya per bulan?",
    roles: ["owner", "tenant_owner"],
  },
];

export function getRoleQuickPrompts(role: string): {
  categories: PromptCategoryDef[];
  prompts: QuickPrompt[];
} {
  const normRole = (role || "staff").toLowerCase();
  const isSuperAdmin = normRole === "superadmin";
  const isMarketing = normRole === "marketing";
  const isStaff = normRole === "staff" || normRole === "kasir" || normRole === "cashier";

  if (isSuperAdmin) {
    return {
      categories: [
        { id: "all", label: "Semua" },
        { id: "platform", label: "Platform HQ" },
        { id: "outlets", label: "Kelola Cabang" },
        { id: "users", label: "Pengguna" },
        { id: "finance_admin", label: "Arus Kas Lisensi" },
        { id: "settings", label: "Setting & Log" },
      ],
      prompts: ROLE_QUICK_PROMPTS.filter((p) => p.roles.includes("superadmin")),
    };
  }

  if (isMarketing) {
    return {
      categories: [
        { id: "all", label: "Semua" },
        { id: "referral", label: "Kode & Link" },
        { id: "commission", label: "Komisi" },
        { id: "tenants_marketing", label: "Laundry Terdaftar" },
      ],
      prompts: ROLE_QUICK_PROMPTS.filter((p) => p.roles.includes("marketing")),
    };
  }

  if (isStaff) {
    return {
      categories: [
        { id: "all", label: "Semua" },
        { id: "pos", label: "Kasir POS" },
        { id: "shift", label: "Shift Kasir" },
        { id: "customers", label: "Pelanggan" },
        { id: "tips", label: "Tips Noda" },
      ],
      prompts: ROLE_QUICK_PROMPTS.filter((p) => p.roles.includes("staff") || p.roles.includes("kasir")),
    };
  }

  // Owner / Tenant Owner
  return {
    categories: [
      { id: "all", label: "Semua" },
      { id: "menus", label: "Menu & Omset" },
      { id: "settings", label: "Setting & WA" },
      { id: "pos", label: "Kasir & Tarif" },
      { id: "biz", label: "Kesehatan Bisnis" },
    ],
    prompts: ROLE_QUICK_PROMPTS.filter((p) => p.roles.includes("owner") || p.roles.includes("tenant_owner")),
  };
}

export interface RoleAccessResult {
  allowed: boolean;
  reason?: string;
  mappedTarget?: TabType;
  noticeText?: string;
}

export function getActionNoticeText(target: string, role: string): string {
  const normRole = (role || "staff").toLowerCase();
  const isSuperAdmin = normRole === "superadmin";

  switch (target) {
    case "settings_platform":
      return "Membuka Setting Platform Pusat...";
    case "settings":
      return isSuperAdmin ? "Membuka Setting Platform Pusat..." : "Membuka Pengaturan Outlet...";
    case "orders":
      return "Membuka Meja Kasir (POS)...";
    case "finance":
    case "cashflow":
      return isSuperAdmin ? "Membuka Arus Kas & Rekap Langganan..." : "Membuka Keuangan & Laporan...";
    case "invoices":
      return "Membuka Arus Kas & Rekap Langganan...";
    case "tenants":
      return "Membuka Kelola Outlet...";
    case "users":
      return "Membuka Kelola Pengguna...";
    case "marketing":
      return "Membuka Dashboard Tim Marketing...";
    case "referral_codes":
      return "Membuka Kode Referral...";
    case "registered_tenants":
      return "Membuka Laundry Terdaftar...";
    case "services":
      return "Membuka Kelola Tarif Layanan...";
    case "customers":
      return "Membuka Data Pelanggan...";
    case "subscription":
      return isSuperAdmin ? "Membuka Arus Kas & Rekap Langganan..." : "Membuka Status Langganan...";
    case "reports":
      return isSuperAdmin ? "Membuka Arus Kas & Rekap Langganan..." : "Membuka Laporan Finansial...";
    case "logs":
      return "Membuka Data Log Sistem...";
    case "overview":
      return isSuperAdmin ? "Membuka Dashboard Platform..." : "Membuka Dashboard...";
    default:
      return `Membuka menu ${target}...`;
  }
}

export function canRoleAccessAction(role: string, action: ActionItem): RoleAccessResult {
  const normRole = (role || "staff").toLowerCase();
  const isSuperAdmin = normRole === "superadmin";
  const isMarketing = normRole === "marketing";
  const isStaff = normRole === "staff" || normRole === "kasir" || normRole === "cashier";
  const isOwner = normRole === "tenant_owner" || normRole === "owner";

  if (action.type === "NAVIGATE") {
    const target = action.target as string;

    if (isSuperAdmin) {
      if (target === "settings") {
        return {
          allowed: true,
          mappedTarget: "settings_platform",
          noticeText: "Membuka Setting Platform Pusat...",
        };
      }
      if (target === "cashflow" || target === "finance" || target === "reports" || target === "subscription") {
        return {
          allowed: true,
          mappedTarget: "invoices",
          noticeText: "Membuka Arus Kas & Rekap Langganan Platform...",
        };
      }
      const allowedAdminTabs: TabType[] = [
        "overview",
        "tenants",
        "users",
        "invoices",
        "marketing",
        "referral_codes",
        "settings_platform",
        "logs",
        "plans",
        "signups",
        "orders",
        "customers",
      ];
      if (allowedAdminTabs.includes(target as TabType)) {
        return {
          allowed: true,
          mappedTarget: target as TabType,
          noticeText: getActionNoticeText(target, normRole),
        };
      }
      return {
        allowed: false,
        reason: `Menu '${target}' tidak tersedia untuk Super Admin.`,
      };
    }

    if (isMarketing) {
      if (target === "marketing" || target === "overview") {
        return {
          allowed: true,
          mappedTarget: "marketing",
          noticeText: "Membuka Dashboard Marketing...",
        };
      }
      if (target === "registered_tenants") {
        return {
          allowed: true,
          mappedTarget: "registered_tenants",
          noticeText: "Membuka Laundry Terdaftar...",
        };
      }
      return {
        allowed: false,
        reason: "Akses ditolak: Menu ini di luar ranah tugas Tim Marketing.",
      };
    }

    if (isStaff) {
      const allowedStaffTabs: TabType[] = ["overview", "orders", "customers", "create-order", "edit-order"];
      if (allowedStaffTabs.includes(target as TabType)) {
        return {
          allowed: true,
          mappedTarget: target as TabType,
          noticeText: getActionNoticeText(target, normRole),
        };
      }
      return {
        allowed: false,
        reason: "Akses ditolak: Menu ini memerlukan hak akses Pemilik Outlet atau Super Admin.",
      };
    }

    if (isOwner) {
      if (target === "cashflow" || target === "reports") {
        return {
          allowed: true,
          mappedTarget: "finance",
          noticeText: "Membuka Keuangan & Laporan...",
        };
      }
      const allowedOwnerTabs: TabType[] = [
        "overview",
        "orders",
        "customers",
        "finance",
        "settings",
        "services",
        "subscription",
        "create-order",
        "edit-order",
      ];
      if (allowedOwnerTabs.includes(target as TabType)) {
        return {
          allowed: true,
          mappedTarget: target as TabType,
          noticeText: getActionNoticeText(target, normRole),
        };
      }
      return {
        allowed: false,
        reason: "Akses ditolak: Menu ini merupakan wewenang khusus Super Admin Cleanique Pusat.",
      };
    }

    return { allowed: false, reason: "Peran pengguna tidak dikenali." };
  }

  if (action.type === "OPEN_MODAL") {
    const target = action.target;

    if (isSuperAdmin) {
      if (target === "tutorial") return { allowed: true, noticeText: "Membuka Panduan & Tutorial Platform..." };
      if (target === "whatsapp") return { allowed: true, noticeText: "Membuka Pengaturan WhatsApp Gateway..." };
      if (target === "open_shift" || target === "close_shift") {
        return { allowed: false, reason: "Fitur Shift Kasir dikhususkan untuk operasional kasir cabang." };
      }
      return { allowed: false, reason: "Aksi modal tidak tersedia untuk Super Admin." };
    }

    if (isMarketing) {
      if (target === "tutorial") return { allowed: true, noticeText: "Membuka Panduan & Tutorial Marketing..." };
      return { allowed: false, reason: "Akses ditolak: Fitur ini tidak tersedia untuk Tim Marketing." };
    }

    if (isStaff) {
      if (target === "open_shift") return { allowed: true, noticeText: "Membuka jendela Buka Shift Kasir..." };
      if (target === "close_shift") return { allowed: true, noticeText: "Membuka jendela Tutup Shift Kasir..." };
      if (target === "tutorial") return { allowed: true, noticeText: "Membuka Panduan Kasir..." };
      return { allowed: false, reason: "Akses ditolak: Fitur ini hanya untuk Pemilik Outlet." };
    }

    if (isOwner) {
      if (target === "whatsapp") return { allowed: true, noticeText: "Membuka pengaturan WhatsApp Gateway..." };
      if (target === "open_shift") return { allowed: true, noticeText: "Membuka jendela Buka Shift Kasir..." };
      if (target === "close_shift") return { allowed: true, noticeText: "Membuka jendela Tutup Shift Kasir..." };
      if (target === "expense") return { allowed: true, noticeText: "Membuka form Pengeluaran Toko..." };
      if (target === "tutorial") return { allowed: true, noticeText: "Membuka Panduan Tutorial Sistem..." };
      return { allowed: false, reason: `Modal '${target}' tidak dikenali.` };
    }
  }

  return { allowed: false, reason: "Tipe aksi tidak didukung." };
}

export function getActionLabel(action: ActionItem, role?: string): string {
  const normRole = (role || "staff").toLowerCase();
  const isSuperAdmin = normRole === "superadmin";
  const isMarketing = normRole === "marketing";

  if (action.type === "NAVIGATE") {
    switch (action.target) {
      case "settings":
        return isSuperAdmin ? "Buka Setting Platform" : "Buka Menu Pengaturan";
      case "settings_platform":
        return "Buka Setting Platform";
      case "orders":
        return "Buka Meja Kasir (POS)";
      case "cashflow":
      case "finance":
        return isSuperAdmin ? "Buka Arus Kas Langganan" : "Buka Keuangan & Laporan";
      case "invoices":
        return "Buka Arus Kas Langganan";
      case "services":
        return "Kelola Tarif Layanan";
      case "customers":
        return "Buka Data Pelanggan";
      case "subscription":
        return isSuperAdmin ? "Buka Rekap Langganan" : "Buka Menu Langganan";
      case "reports":
        return isSuperAdmin ? "Buka Laporan Platform" : "Buka Laporan Finansial";
      case "tenants":
        return "Buka Kelola Outlet";
      case "users":
        return "Buka Kelola Pengguna";
      case "marketing":
        return isMarketing ? "Buka Dashboard Marketing" : "Buka Tim Marketing";
      case "referral_codes":
        return "Buka Kode Referral";
      case "registered_tenants":
        return "Buka Laundry Terdaftar";
      case "logs":
        return "Buka Data Log Sistem";
      case "overview":
        return isSuperAdmin
          ? "Buka Dashboard Platform"
          : isMarketing
          ? "Buka Dashboard Marketing"
          : "Buka Dashboard Utama";
      default:
        return `Ke Halaman ${action.target}`;
    }
  } else {
    switch (action.target) {
      case "whatsapp":
        return "Hubungkan WhatsApp Gateway";
      case "open_shift":
        return "Buka Shift Kasir Sekarang";
      case "close_shift":
        return "Tutup & Rekonsiliasi Shift";
      case "expense":
        return "Catat Pengeluaran Toko";
      case "tutorial":
        return "Buka Panduan Tutorial";
      default:
        return `Buka ${action.target}`;
    }
  }
}

// Helper to parse action tags from text
function parseActionTags(rawContent: string): { cleanContent: string; actions: ActionItem[] } {
  const actions: ActionItem[] = [];
  const actionRegex = /\[ACTION:(NAVIGATE|OPEN_MODAL):([a-zA-Z0-9_\-]+)\]/g;
  let match;

  while ((match = actionRegex.exec(rawContent)) !== null) {
    actions.push({
      type: match[1] as "NAVIGATE" | "OPEN_MODAL",
      target: match[2],
    });
  }

  const cleanContent = rawContent.replace(actionRegex, "").trim();
  return { cleanContent, actions };
}

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({
  activeTab,
  setActiveTab,
  currentUserRole = "staff",
  onOpenWhatsAppModal,
  onOpenOpenShiftModal,
  onOpenCloseShiftModal,
  onOpenExpenseModal,
  onOpenTutorialModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerCollapsed, setTriggerCollapsed] = useState(true);
  const sideTabRef = useRef<HTMLElement>(null);

  // Close slideover on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory>("all");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const isStaff = currentUserRole === "staff" || currentUserRole === "kasir" || currentUserRole === "cashier";
  const isMarketing = currentUserRole === "marketing";
  const isSuperAdmin = currentUserRole === "superadmin";

  const initialWelcomeText = useMemo(() => {
    if (isSuperAdmin) {
      return (
        "Halo! Saya **Cleanique Asisten AI** untuk Super Admin Cleanique Pusat.\n\n" +
        "Saya siap membantu Anda memantau seluruh cabang outlet laundry, manajemen lisensi & rekap langganan, verifikasi pengguna, serta pengaturan platform.\n\n" +
        "Pilih topik bantuan di atas atau tanyakan apapun mengenai operasional platform."
      );
    }
    if (isMarketing) {
      return (
        "Halo! Saya **Cleanique Asisten AI** untuk Tim Marketing Cleanique.\n\n" +
        "Saya siap membantu Anda memantau kode referral, konversi pendaftaran laundry baru, dan penghitungan komisi marketing.\n\n" +
        "Silakan tanyakan seputar program referral dan komisi."
      );
    }
    if (isStaff) {
      return (
        "Halo! Saya **Cleanique Asisten AI** untuk Staf Kasir.\n\n" +
        "Saya siap memandu Anda menguasai meja kasir POS, alur pesanan cucian, shift kasir, dan tips penanganan noda pakaian.\n\n" +
        "Pilih pertanyaan cepat di atas atau ketik apa yang ingin Anda tanyakan."
      );
    }
    return (
      "Halo! Saya **Cleanique Asisten AI** untuk Pemilik Outlet.\n\n" +
      "Saya siap memandu Anda memantau omset toko, keuangan buku kas, pengaturan outlet & WhatsApp, tarif layanan, dan efisiensi operasional cabang Anda.\n\n" +
      "Pilih pertanyaan cepat di atas atau ketik apa yang ingin Anda tanyakan."
    );
  }, [isSuperAdmin, isMarketing, isStaff]);

  const initialParsed = useMemo(() => parseActionTags(initialWelcomeText), [initialWelcomeText]);

  const initialActions: ActionItem[] = useMemo(() => {
    if (isSuperAdmin) {
      return [
        { type: "NAVIGATE", target: "tenants" },
        { type: "NAVIGATE", target: "invoices" },
      ];
    }
    if (isMarketing) {
      return [
        { type: "NAVIGATE", target: "marketing" },
        { type: "NAVIGATE", target: "registered_tenants" },
      ];
    }
    if (isStaff) {
      return [
        { type: "NAVIGATE", target: "orders" },
        { type: "OPEN_MODAL", target: "open_shift" },
      ];
    }
    return [
      { type: "NAVIGATE", target: "overview" },
      { type: "NAVIGATE", target: "settings" },
    ];
  }, [isSuperAdmin, isMarketing, isStaff]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: initialWelcomeText,
      cleanContent: initialParsed.cleanContent,
      actions: initialActions,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Update initial message if role changes
  useEffect(() => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: initialWelcomeText,
        cleanContent: initialParsed.cleanContent,
        actions: initialActions,
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [currentUserRole, initialWelcomeText, initialParsed, initialActions]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleExecuteAction = (action: ActionItem) => {
    const access = canRoleAccessAction(currentUserRole, action);
    if (!access.allowed) {
      setActionNotice(access.reason || "Akses ditolak: Menu ini tidak tersedia untuk peran Anda.");
      setTimeout(() => setActionNotice(null), 3500);
      return;
    }

    if (action.type === "NAVIGATE") {
      const destination = access.mappedTarget || (action.target as TabType);
      if (setActiveTab) {
        setActiveTab(destination);
        setActionNotice(access.noticeText || `Membuka menu ${destination}...`);
        setTimeout(() => setActionNotice(null), 2500);
      }
    } else if (action.type === "OPEN_MODAL") {
      if (action.target === "whatsapp") {
        onOpenWhatsAppModal?.();
      } else if (action.target === "open_shift") {
        onOpenOpenShiftModal?.();
      } else if (action.target === "close_shift") {
        onOpenCloseShiftModal?.();
      } else if (action.target === "expense") {
        onOpenExpenseModal?.("expense");
      } else if (action.target === "tutorial") {
        onOpenTutorialModal?.();
      }
      setActionNotice(access.noticeText || `Membuka ${action.target}...`);
      setTimeout(() => setActionNotice(null), 2500);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      cleanContent: text,
      time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content,
      }));

      const res = await api.post<{
        success: boolean;
        message?: string;
        data?: {
          reply: string;
          model: string;
        };
      }>("/api/ai/chat", {
        message: text,
        history: historyPayload,
      });

      if (res.success && res.data) {
        const parsed = parseActionTags(res.data.reply);
        const aiMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content: res.data.reply,
          cleanContent: parsed.cleanContent,
          actions: parsed.actions,
          time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          model: res.data.model,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorContent = `Maaf, terjadi kendala: ${res.message || "Gagal mendapatkan respon AI."}`;
        const errorMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          content: errorContent,
          cleanContent: errorContent,
          time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorContent = `Koneksi gagal: ${err.message || "Terjadi kesalahan jaringan."}`;
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: errorContent,
        cleanContent: errorContent,
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: initialWelcomeText,
        cleanContent: initialParsed.cleanContent,
        actions: initialActions,
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Helper render simple markdown
  const renderFormattedText = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Heading 3
      if (line.trim().startsWith("### ")) {
        return (
          <h4 key={idx} className="font-bold text-slate-900 dark:text-white mt-2 mb-1 text-xs">
            {renderInlineStyles(line.trim().substring(4))}
          </h4>
        );
      }
      // Bullet list item
      if (line.trim().startsWith("• ") || line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const itemText = line.trim().substring(2);
        return (
          <div key={idx} className="flex items-start gap-1.5 my-0.5 ml-2">
            <span className="text-indigo-500 font-bold shrink-0">•</span>
            <span>{renderInlineStyles(itemText)}</span>
          </div>
        );
      }
      // Numbered list
      if (/^\d+\.\s/.test(line.trim())) {
        const match = line.trim().match(/^(\d+\.)\s(.*)/);
        if (match) {
          return (
            <div key={idx} className="flex items-start gap-1.5 my-0.5 ml-2">
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">{match[1]}</span>
              <span>{renderInlineStyles(match[2])}</span>
            </div>
          );
        }
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="my-0.5 leading-relaxed">
          {renderInlineStyles(line)}
        </p>
      );
    });
  };

  const renderInlineStyles = (text: string) => {
    // Render **bold**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      // Render *italic*
      if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
        return (
          <em key={i} className="italic text-slate-700 dark:text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  // Ambil daftar kategori dan prompt spesifik untuk role pengguna
  const { categories: availableCategories, prompts: allRolePrompts } = useMemo(() => {
    return getRoleQuickPrompts(currentUserRole);
  }, [currentUserRole]);

  // Reset selected category jika category saat ini tidak ada di role yang aktif
  useEffect(() => {
    if (!availableCategories.some((c) => c.id === selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [availableCategories, selectedCategory]);

  const roleFilteredPrompts = useMemo(() => {
    if (selectedCategory === "all") return allRolePrompts;
    return allRolePrompts.filter((p) => p.category === selectedCategory);
  }, [allRolePrompts, selectedCategory]);

  // Active Tab contextual prompt label
  const getActiveTabContextTip = () => {
    if (isSuperAdmin) {
      switch (activeTab) {
        case "settings_platform":
          return {
            label: "Setting Platform HQ",
            query: "Panduan konfigurasi global platform Cleanique pusat dan integrasi gateway?",
          };
        case "tenants":
          return {
            label: "Kelola Cabang",
            query: "Bagaimana cara audit status cabang laundry, aktivasi outlet, dan verifikasi langganan?",
          };
        case "users":
          return {
            label: "Kelola Pengguna",
            query: "Bagaimana cara memverifikasi akun pengguna dan mengatur hak akses admin/owner?",
          };
        case "invoices":
          return {
            label: "Arus Kas Lisensi",
            query: "Bagaimana cara memantau mutasi invoice langganan platform dari seluruh cabang?",
          };
        case "logs":
          return {
            label: "Data Log Sistem",
            query: "Bagaimana cara membaca log aktivitas sistem, audit error, dan event penting platform?",
          };
        default:
          return null;
      }
    }

    if (isMarketing) {
      switch (activeTab) {
        case "marketing":
          return {
            label: "Dashboard Marketing",
            query: "Bagaimana cara memaksimalkan konversi kode referral dan memantau komisi saya?",
          };
        case "registered_tenants":
          return {
            label: "Laundry Terdaftar",
            query: "Bagaimana cara melihat daftar laundry yang mendaftar melalui kode referral saya?",
          };
        default:
          return null;
      }
    }

    if (isStaff) {
      switch (activeTab) {
        case "orders":
        case "create-order":
          return {
            label: "Meja Kasir POS",
            query: "Panduan cepat input pesanan baru, cetak nota pesanan, dan update status cucian?",
          };
        case "customers":
          return {
            label: "Data Pelanggan",
            query: "Bagaimana cara mencari kontak pelanggan dan memeriksa riwayat nota cuciannya?",
          };
        default:
          return null;
      }
    }

    // Owner / Tenant Owner
    switch (activeTab) {
      case "settings":
        return {
          label: "Pengaturan Toko",
          query: "Panduan lengkap apa saja yang bisa diatur di menu Pengaturan ini?",
        };
      case "orders":
      case "create-order":
        return {
          label: "Meja Kasir POS",
          query: "Panduan cepat input pesanan baru, cetak nota pesanan, dan update status cucian?",
        };
      case "finance":
      case "cashflow":
        return {
          label: "Buku Kas & Keuangan",
          query: "Bagaimana cara mencatat pengeluaran toko dan memantau laba bersih cabang?",
        };
      case "reports":
        return {
          label: "Laporan Finansial",
          query: "Bagaimana cara cetak laporan PDF resmi dan ekspor data ke Excel?",
        };
      case "services":
        return {
          label: "Menu Layanan",
          query: "Bagaimana cara menambah tarif cucian baru dan mengatur durasi SLA?",
        };
      case "subscription":
        return {
          label: "Menu Langganan",
          query: "Bagaimana cara perpanjang masa aktif outlet dan konfirmasi pembayaran?",
        };
      default:
        return null;
    }
  };

  const currentTabTip = getActiveTabContextTip();

  const roleDisplayName =
    currentUserRole === "superadmin"
      ? "Super Admin"
      : currentUserRole === "owner" || currentUserRole === "tenant_owner"
      ? "Pemilik Outlet"
      : isMarketing
      ? "Tim Marketing"
      : "Kasir Staf";

  return (
    <>
      {/* Slideover Trigger Button (Docked cleanly on the right screen edge) */}
      {!isOpen && (
        <aside
          ref={sideTabRef}
          id="tour-ai-widget"
          aria-label="Cleanique AI Assistant"
          className="fixed right-0 bottom-20 sm:bottom-24 z-40 flex items-center"
        >
          {/* Collapse toggle: show icon-only button when collapsed */}
          {triggerCollapsed ? (
            <button
              type="button"
              onClick={() => setTriggerCollapsed(false)}
              className="flex items-center justify-center w-9 h-9 bg-blue-50 hover:bg-blue-100 text-blue-700 border-y border-l border-blue-200 rounded-l-xl shadow-xs transition-all cursor-pointer active:scale-95"
              title="Buka Tanya AI Cleanique"
              aria-label="Buka Tanya AI Cleanique"
            >
              <Bot className="w-4 h-4 text-blue-700" />
            </button>
          ) : (
            <div className="flex items-center">
              {/* Collapse (hide text) */}
              <button
                type="button"
                onClick={() => setTriggerCollapsed(true)}
                className="flex items-center justify-center w-6 h-9 bg-blue-50 hover:bg-blue-100 text-blue-300 hover:text-blue-500 border-y border-l border-blue-200 rounded-l-xl shadow-xs transition-all cursor-pointer text-[10px]"
                title="Sembunyikan"
                aria-label="Sembunyikan label"
              >
                <span className="rotate-180">‹</span>
              </button>
              {/* Open drawer */}
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-1.5 pl-2.5 pr-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-y border-r-0 border-l-0 border border-blue-200 shadow-xs transition-all cursor-pointer font-medium text-xs active:scale-95"
                title="Buka Tanya AI Cleanique"
                aria-label="Buka Tanya AI Cleanique"
              >
                <Bot className="w-4 h-4 text-blue-700 shrink-0" />
                <span className="font-semibold tracking-wide whitespace-nowrap">Tanya AI</span>
              </button>
            </div>
          )}
        </aside>
      )}

      {/* Slideover Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slideover Panel (Right Drawer) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] md:w-[460px] bg-white dark:bg-slate-900 shadow-xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Panel Tanya AI"
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-blue-700 text-white flex items-center justify-between border-b border-blue-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center border border-white/20">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold tracking-wide">Cleanique AI</h3>
              </div>
              <p className="text-[10px] text-white/80 mt-0.5">
                Panduan {isStaff ? "Kasir & Shift" : "Menu & Settings"} • <span className="font-semibold text-blue-100">{roleDisplayName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-white/80">
            <button
              type="button"
              onClick={clearChat}
              className="px-2.5 py-1 text-[11px] font-medium text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
              title="Bersihkan Percakapan"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
              title="Tutup Panel"
              aria-label="Tutup Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="px-3 pt-2.5 pb-1 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-[11px]">
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Contextual Active Tab Chip */}
          {currentTabTip && (
            <div className="mt-1.5 mb-1">
              <button
                type="button"
                onClick={() => handleSendMessage(currentTabTip.query)}
                disabled={loading}
                className="w-full text-left px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 text-[11px] text-blue-700 dark:text-blue-300 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
              >
                <span className="font-medium truncate">{currentTabTip.label}: Tanya panduan tab ini</span>
                <ArrowRight className="w-3 h-3 shrink-0 ml-1" />
              </button>
            </div>
          )}
        </div>

        {/* Horizontal Scroll Quick Prompt Chips */}
        <div className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-800 overflow-x-auto no-scrollbar shrink-0 flex items-center gap-1.5">
          {roleFilteredPrompts.slice(0, 8).map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => handleSendMessage(chip.text)}
              disabled={loading}
              className="shrink-0 px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700 rounded-full transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Action Trigger Notice Banner */}
        {actionNotice && (
          <div
            className={`${
              actionNotice.toLowerCase().includes("ditolak") || actionNotice.toLowerCase().includes("tidak tersedia")
                ? "bg-rose-600"
                : "bg-emerald-600"
            } text-white text-[11px] font-medium py-1 px-3 flex items-center gap-1.5 animate-fade-in shrink-0`}
          >
            {actionNotice.toLowerCase().includes("ditolak") || actionNotice.toLowerCase().includes("tidak tersedia") ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs mt-0.5 ${
                  msg.role === "user"
                    ? "bg-slate-700"
                    : "bg-blue-600"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-3.5 h-3.5" />
                ) : (
                  <Bot className="w-3.5 h-3.5" />
                )}
              </div>

              <div
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                } max-w-[85%]`}
              >
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-xs ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/60 dark:border-slate-700/60"
                  }`}
                >
                  {renderFormattedText(msg.cleanContent)}

                  {/* Interactive Action Buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap gap-1.5">
                      {msg.actions.map((act, actIdx) => {
                        const label = getActionLabel(act, currentUserRole);
                        return (
                          <button
                            key={actIdx}
                            type="button"
                            onClick={() => handleExecuteAction(act)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
                          >
                            <span>{label}</span>
                            <ArrowRight className="w-3 h-3 text-blue-500" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {msg.time}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white shadow-xs mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-xs px-3.5 py-2.5 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[11px] ml-1 text-slate-400 font-medium">Cleanique AI sedang mengetik...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/70 dark:border-slate-800/80 shrink-0">
          <div className="relative flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent transition-all">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan fungsi menu, setting, alur kasir, atau noda..."
              className="w-full pl-3 pr-10 py-2.5 bg-transparent resize-none outline-none text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 max-h-24 overflow-y-auto"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || loading}
              className="absolute right-1.5 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all active:scale-95 cursor-pointer"
              title="Kirim Pesan"
              aria-label="Kirim Pesan"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
            <span>Enter untuk kirim, Shift+Enter untuk baris baru</span>
            <span className="text-emerald-500 font-medium flex items-center gap-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
