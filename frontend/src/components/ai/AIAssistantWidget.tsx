import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  X,
  Send,
  Trash2,
  ArrowRight,
  User,
  CheckCircle2,
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

type PromptCategory = "all" | "menus" | "settings" | "pos" | "shift" | "tips";

interface QuickPrompt {
  id: string;
  category: PromptCategory;
  label: string;
  text: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  // Menus
  {
    id: "menu-all",
    category: "menus",
    label: "Jelaskan Seluruh Menu",
    text: "Jelaskan fungsi semua menu yang ada di dashboard ini dan alurnya",
  },
  {
    id: "menu-cashflow",
    category: "menus",
    label: "Cara Pakai Buku Kas",
    text: "Apa fungsi menu Buku Kas dan bagaimana cara mencatat pengeluaran toko?",
  },
  {
    id: "menu-reports",
    category: "menus",
    label: "Ekspor Excel & PDF",
    text: "Bagaimana cara mencetak laporan keuangan ke file PDF atau ekspor ke Excel?",
  },
  {
    id: "biz-health",
    category: "menus",
    label: "Kesehatan Bisnis",
    text: "Bagaimana analisa kesehatan bisnis dan efisiensi pengeluaran laundry saya bulan ini?",
  },
  {
    id: "biz-detergent",
    category: "menus",
    label: "Audit Takaran Deterjen",
    text: "Berapa estimasi pemakaian deterjen dan parfum saya dari total cucian yang masuk?",
  },
  {
    id: "biz-rent",
    category: "menus",
    label: "Status Sewa Ruko",
    text: "Berapa sisa masa sewa ruko saya dan berapa beban sewanya per bulan?",
  },

  // Settings & WhatsApp
  {
    id: "set-hours",
    category: "settings",
    label: "Atur Jam Buka Toko",
    text: "Bagaimana cara mengubah jam operasional outlet saya agar muncul di nota digital?",
  },
  {
    id: "set-bank",
    category: "settings",
    label: "Atur Rekening & QRIS",
    text: "Bagaimana cara mengatur rekening bank dan info QRIS pembayaran laundry?",
  },
  {
    id: "set-wa",
    category: "settings",
    label: "WhatsApp Otomatis",
    text: "Bagaimana cara menghubungkan WhatsApp agar nota terkirim otomatis ke pelanggan?",
  },
  {
    id: "set-staff",
    category: "settings",
    label: "Tambah Akun Kasir",
    text: "Bagaimana cara menambah akun kasir baru dan mengatur hak aksesnya?",
  },

  // Kasir POS
  {
    id: "pos-order",
    category: "pos",
    label: "Cara Buat Order Kasir",
    text: "Bagaimana alur input pesanan kiloan dan satuan di meja kasir POS?",
  },
  {
    id: "pos-status",
    category: "pos",
    label: "6 Status Cucian",
    text: "Jelaskan 6 tahap status cucian laundry dari diterima sampai diambil pelanggan",
  },
  {
    id: "pos-receipt",
    category: "pos",
    label: "Cetak Struk Kasir",
    text: "Bagaimana cara mencetak nota struk kasir 58mm atau 80mm?",
  },

  // Shift Kasir
  {
    id: "shift-open",
    category: "shift",
    label: "Cara Buka Shift",
    text: "Bagaimana cara membuka shift kasir dan mengisi modal awal di laci?",
  },
  {
    id: "shift-close",
    category: "shift",
    label: "Cara Tutup Shift",
    text: "Bagaimana cara menutup shift kasir dan rekonsiliasi uang fisik kasir?",
  },
  {
    id: "shift-diff",
    category: "shift",
    label: "Jika Kas Selisih",
    text: "Apa yang harus dilakukan jika uang kas fisik di laci tidak seimbang dengan sistem?",
  },

  // Tips Noda & Promo
  {
    id: "tip-summary",
    category: "tips",
    label: "Omset Toko Hari Ini",
    text: "Berikan ringkasan operasional dan omset toko hari ini",
  },
  {
    id: "tip-ink",
    category: "tips",
    label: "Noda Tinta Pulpen",
    text: "Bagaimana cara membersihkan noda tinta pulpen di baju pelanggan?",
  },
  {
    id: "tip-oil",
    category: "tips",
    label: "Noda Minyak Makanan",
    text: "Bagaimana cara mencuci pakaian yang terkena noda minyak makanan membandel?",
  },
  {
    id: "tip-blood",
    category: "tips",
    label: "Noda Darah",
    text: "Bagaimana cara menghilangkan noda darah yang aman pada pakaian?",
  },
  {
    id: "tip-promo",
    category: "tips",
    label: "Draf Promo WhatsApp",
    text: "Buatkan draf kata-kata promo diskon 10% untuk broadcast WhatsApp ke pelanggan",
  },
];

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
  const [activeModel, setActiveModel] = useState<string>("Gemini 3.8 Flash");
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory>("all");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const isStaff = currentUserRole === "staff";
  const isMarketing = currentUserRole === "marketing";
  const isSuperAdmin = currentUserRole === "superadmin";

  const initialWelcomeText = isStaff
    ? "Halo! Saya **Cleanique Asisten AI** untuk Staf Kasir.\n\n" +
      "Saya siap memandu Anda menguasai meja kasir POS, alur pesanan cucian, shift kasir, dan tips penanganan noda pakaian.\n\n" +
      "Pilih pertanyaan cepat di atas atau ketik apa yang ingin Anda tanyakan."
    : isMarketing
    ? "Halo! Saya **Cleanique Asisten AI** untuk Mitra Marketing.\n\n" +
      "Saya siap membantu Anda memahami kode referral, pelacakan performa promosi, dan penghitungan komisi affiliate.\n\n" +
      "Silakan tanyakan seputar program referral."
    : "Halo! Saya **Cleanique Asisten AI**.\n\n" +
      "Saya siap memandu Anda menguasai seluruh menu, pengaturan outlet, alur kasir POS, dan shift kerja di dashboard ini.\n\n" +
      "Pilih pertanyaan cepat di atas atau ketik apa yang ingin Anda tanyakan.";

  const initialParsed = parseActionTags(initialWelcomeText);

  const initialActions: ActionItem[] = isStaff
    ? [{ type: "NAVIGATE", target: "orders" }]
    : isMarketing
    ? [{ type: "NAVIGATE", target: "marketing" }]
    : isSuperAdmin
    ? [{ type: "NAVIGATE", target: "tenants" }]
    : [
        { type: "NAVIGATE", target: "overview" },
        { type: "NAVIGATE", target: "settings" },
      ];

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
    // Guard aksi berdasarkan peran
    if (isStaff && (action.target === "settings" || action.target === "whatsapp" || action.target === "expense")) {
      setActionNotice("Akses ditolak: Menu ini hanya untuk Pemilik Outlet.");
      setTimeout(() => setActionNotice(null), 2500);
      return;
    }
    if (action.type === "NAVIGATE") {
      if (setActiveTab) {
        setActiveTab(action.target as TabType);
        setActionNotice(`Membuka menu ${action.target}...`);
        setTimeout(() => setActionNotice(null), 2500);
      }
    } else if (action.type === "OPEN_MODAL") {
      if (action.target === "whatsapp") {
        onOpenWhatsAppModal?.();
        setActionNotice("Membuka pengaturan WhatsApp Gateway...");
      } else if (action.target === "open_shift") {
        onOpenOpenShiftModal?.();
        setActionNotice("Membuka jendela Buka Shift Kasir...");
      } else if (action.target === "close_shift") {
        onOpenCloseShiftModal?.();
        setActionNotice("Membuka jendela Tutup Shift Kasir...");
      } else if (action.target === "expense") {
        onOpenExpenseModal?.("expense");
        setActionNotice("Membuka form Pengeluaran Toko...");
      } else if (action.target === "tutorial") {
        onOpenTutorialModal?.();
        setActionNotice("Membuka panduan tutorial sistem...");
      }
      setTimeout(() => setActionNotice(null), 2500);
    }
  };

  const getActionLabel = (action: ActionItem): string => {
    if (action.type === "NAVIGATE") {
      switch (action.target) {
        case "settings":
          return "Buka Menu Pengaturan";
        case "orders":
          return "Buka Meja Kasir (POS)";
        case "cashflow":
          return "Buka Buku Kas";
        case "services":
          return "Kelola Tarif Layanan";
        case "customers":
          return "Buka Data Pelanggan";
        case "subscription":
          return "Buka Menu Langganan";
        case "reports":
          return "Buka Laporan Finansial";
        case "tenants":
          return "Buka Manajemen Cabang";
        case "users":
          return "Buka Manajemen Pengguna";
        case "overview":
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
        if (res.data.model) {
          if (res.data.model.includes("gemini-3.8-flash")) {
            setActiveModel("Gemini 3.8 Flash");
          } else if (res.data.model.includes("gemini-3-flash")) {
            setActiveModel("Gemini 3 Flash");
          } else if (res.data.model.includes("aivene")) {
            setActiveModel("Aivene Gateway");
          } else if (res.data.model.includes("Local")) {
            setActiveModel("Offline Engine");
          } else {
            setActiveModel(res.data.model.replace("google/", ""));
          }
        }
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

  // Filter kategori berdasarkan peran pengguna
  const availableCategories: { id: PromptCategory; label: string }[] = isStaff
    ? [
        { id: "all", label: "Semua" },
        { id: "pos", label: "Kasir POS" },
        { id: "shift", label: "Shift Kasir" },
        { id: "tips", label: "Tips Noda" },
      ]
    : isMarketing
    ? [
        { id: "all", label: "Semua" },
      ]
    : [
        { id: "all", label: "Semua" },
        { id: "menus", label: "Menu" },
        { id: "settings", label: "Setting & WA" },
        { id: "pos", label: "Kasir POS" },
        { id: "shift", label: "Shift Kasir" },
        { id: "tips", label: "Tips Noda" },
      ];

  const roleFilteredPrompts = QUICK_PROMPTS.filter((p) => {
    if (isStaff) {
      // Kasir TIDAK BOLEH melihat prompt setting, wa gateway, tambah staf, buku kas, laporan, omset
      const forbiddenForStaff = [
        "set-hours",
        "set-bank",
        "set-wa",
        "set-staff",
        "menu-all",
        "menu-cashflow",
        "menu-reports",
        "biz-health",
        "biz-detergent",
        "biz-rent",
        "tip-summary",
        "tip-promo",
      ];
      return !forbiddenForStaff.includes(p.id);
    }
    if (isMarketing) {
      return false;
    }
    return true;
  });

  // Active Tab contextual prompt label
  const getActiveTabContextTip = () => {
    // Jangan berikan prompt kontekstual jika kasir sedang tidak berwenang pada tab tsb
    if (isStaff && (activeTab === "settings" || activeTab === "cashflow" || activeTab === "reports" || activeTab === "subscription")) {
      return null;
    }
    switch (activeTab) {
      case "settings":
        return {
          label: "Sedang di Pengaturan Toko",
          query: "Panduan lengkap apa saja yang bisa diatur di menu Pengaturan ini?",
        };
      case "orders":
      case "create-order":
        return {
          label: "Sedang di Meja Kasir",
          query: "Panduan cepat input pesanan baru, cetak nota pesanan, dan update status cucian?",
        };
      case "cashflow":
        return {
          label: "Sedang di Buku Kas",
          query: "Bagaimana cara mencatat pengeluaran toko dan menghitung laba bersih?",
        };
      case "reports":
        return {
          label: "Sedang di Laporan Finansial",
          query: "Bagaimana cara cetak laporan PDF resmi dan ekspor data ke Excel?",
        };
      case "services":
        return {
          label: "Sedang di Menu Layanan",
          query: "Bagaimana cara menambah tarif cucian baru dan mengatur durasi SLA?",
        };
      case "subscription":
        return {
          label: "Sedang di Menu Langganan",
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
      ? "Mitra Marketing"
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
                <span className={`px-2 py-0.2 text-[9px] font-semibold rounded-full border ${
                  activeModel.includes("Gemini")
                    ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/30"
                    : activeModel.includes("Aivene")
                    ? "bg-blue-500/30 text-blue-200 border-blue-400/30"
                    : "bg-amber-500/30 text-amber-200 border-amber-400/30"
                }`}>
                  {activeModel}
                </span>
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
          <div className="bg-emerald-500 text-white text-[11px] font-medium py-1 px-3 flex items-center gap-1.5 animate-fade-in shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
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
                        const label = getActionLabel(act);
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
                  {msg.time} {msg.model && `• ${msg.model.replace("gemini-", "")}`}
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
