import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Order, Customer, TabType } from "./types";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { OrdersTab } from "./components/tabs/OrdersTab";
import { CashflowTab } from "./components/tabs/CashflowTab";
import { CustomersTab } from "./components/tabs/CustomersTab";
import { TenantsTab } from "./components/tabs/TenantsTab";
import { UsersTab } from "./components/tabs/UsersTab";
import { ReportsTab } from "./components/tabs/ReportsTab";
import { FinanceTab } from "./components/tabs/FinanceTab";
import { SettingsTab } from "./components/tabs/SettingsTab";
import { OrderFormTab } from "./components/tabs/OrderFormTab";
import { ServicesTab } from "./components/tabs/ServicesTab";
import { SystemLogsTab } from "./components/tabs/SystemLogsTab";
import { ReferralCodesTab } from "./components/tabs/admin/ReferralCodesTab";
import { MarketingTab } from "./components/tabs/admin/MarketingTab";
import { SubscriptionTab } from "./components/tabs/subscription/SubscriptionTab";
import { PlansTab } from "./components/tabs/admin/PlansTab";
import { SignupsTab } from "./components/tabs/admin/SignupsTab";
import { SubscriptionInvoicesTab } from "./components/tabs/admin/SubscriptionInvoicesTab";
import { PlatformFinanceTab } from "./components/tabs/admin/PlatformFinanceTab";
import { PlatformSettingsTab } from "./components/tabs/admin/PlatformSettingsTab";
import { PublicTrackingPage } from "./components/tracking/PublicTrackingPage";
import { RegisterPage } from "./components/public/RegisterPage";
import { RegisterSuccessPage } from "./components/public/RegisterSuccessPage";
import { LoginPage } from "./components/auth/LoginPage";
import { getPublicRoute } from "./utils/routeUtils";
import { AppModals } from "./components/modals/AppModals";
import { WhatsAppSettingsModal } from "./components/modals/WhatsAppSettingsModal";
import { InactiveAccountModal } from "./components/modals/InactiveAccountModal";
import { OpenShiftModal } from "./components/modals/OpenShiftModal";
import { CloseShiftModal } from "./components/modals/CloseShiftModal";
import { WhatsAppLogsModal } from "./components/modals/WhatsAppLogsModal";
import { AIAssistantWidget } from "./components/ai/AIAssistantWidget";
import { OnboardingTutorialModal } from "./components/common/OnboardingTutorialModal";
import { SpotlightTourOverlay, TourStep } from "./components/common/SpotlightTourOverlay";
import { useAuthSession } from "./hooks/useAuthSession";
import { useLaundryData } from "./hooks/useLaundryData";
import { useWhatsAppGateway } from "./hooks/useWhatsAppGateway";
import { useCashierShift } from "./hooks/useCashierShift";
import { getWaLink, getWaMessageText } from "./utils/waLink";
import { checkUserActiveStatus } from "./utils/subscriptionUtils";
import { useToast } from "./components/common/ToastContext";

export default function App() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Public Route State (/register, /register-success, etc.)
  const [publicRoute, setPublicRoute] = useState<string | null>(() => getPublicRoute());

  // Public Tracking Page State (URL /track/:invoiceNo or ?track=... or ?invoice=...)
  const [trackingInvoice, setTrackingInvoice] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const match = window.location.pathname.match(/\/track\/([^/?#]+)/);
    if (match && match[1]) return decodeURIComponent(match[1]);
    const params = new URLSearchParams(window.location.search);
    return params.get("track") || params.get("invoice") || null;
  });

  useEffect(() => {
    const handlePopState = () => {
      setPublicRoute(getPublicRoute());
      const match = window.location.pathname.match(/\/track\/([^/?#]+)/);
      if (match && match[1]) {
        setTrackingInvoice(decodeURIComponent(match[1]));
      } else {
        const params = new URLSearchParams(window.location.search);
        const inv = params.get("track") || params.get("invoice");
        setTrackingInvoice(inv ? decodeURIComponent(inv) : null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Desktop Draggable Sidebar States
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("cleanique_sidebar_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 68 && parsed <= 420) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return 256;
  });
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);

  const isSidebarCollapsed = isDesktop && sidebarWidth <= 110;
  const effectiveSidebarWidth = isSidebarCollapsed ? 68 : sidebarWidth;

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  // Authentication & Tenant Session Composable
  const {
    currentUser,
    currentUserRole,
    setCurrentUserRole,
    tenantId,
    setTenantId,
    handleLoginSuccess,
    handleLogout,
    handleSelectTenant,
    refreshUserSession,
    markTutorialComplete,
  } = useAuthSession();

  // Onboarding Tutorial Modal State (Otomatis muncul untuk akun pertama kali)
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      const isDoneLocal = localStorage.getItem(`user_tutorial_done_${currentUser.id}`) === "true";
      const isDoneDB = currentUser.tutorialCompleted === true || currentUser.tutorialCompleted === "true";
      if (!isDoneLocal && !isDoneDB) {
        setShowTutorialModal(true);
      }
    }
  }, [currentUser]);

  const handleCompleteTutorial = async () => {
    setShowTutorialModal(false);
    await markTutorialComplete();
    toast.success(
      "Tutorial Selesai!",
      "Selamat bekerja! Anda dapat membuka kembali panduan ini kapan saja lewat tombol 'Panduan' di header atas."
    );
  };

  // Route Guard berdasarkan Role:
  // 1. Super Admin: Laundry Cleanique & Troubleshooting Hub
  // 2. Marketing: Khusus Dashboard Affiliate & Kode Referral
  // 3. Staff: Khusus Operasional Kasir
  // 4. Tenant Owner: Seluruh Operasional Toko miliknya
  useEffect(() => {
    if (currentUserRole === "superadmin") {
      const allowedAdminTabs: TabType[] = [
        "overview",
        "tenants",
        "users",
        "orders",
        "logs",
        "reports",
        "finance",
        "marketing",
        "referral_codes",
        "subscription",
        "plans",
        "signups",
        "invoices",
        "settings_platform",
        "wa_numbers",
        "ai",
      ];
      if (!allowedAdminTabs.includes(activeTab)) {
        setActiveTab("overview");
      }
    } else if (currentUserRole === "marketing") {
      const allowedMarketingTabs: TabType[] = ["marketing", "referral_codes", "ai"];
      if (!allowedMarketingTabs.includes(activeTab)) {
        setActiveTab("marketing");
      }
    } else if (currentUserRole === "staff") {
      const allowedStaffTabs: TabType[] = [
        "overview",
        "orders",
        "customers",
        "create-order",
        "edit-order",
        "ai",
      ];
      if (!allowedStaffTabs.includes(activeTab)) {
        setActiveTab("overview");
      }
    } else {
      // Tenant Owner tidak boleh membuka tab khusus Super Admin & Marketing
      const forbiddenTabs: TabType[] = [
        "tenants",
        "users",
        "logs",
        "marketing",
        "plans",
        "signups",
        "invoices",
        "settings_platform",
      ];
      if (forbiddenTabs.includes(activeTab)) {
        setActiveTab("overview");
      }
    }
  }, [currentUserRole, activeTab]);

  // Cashier Shift Composable & Modals
  const cashierShift = useCashierShift(tenantId, currentUser?.id || null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [selectedOrderForWaLogs, setSelectedOrderForWaLogs] = useState<Order | null>(null);

  // Laundry Data & Operations Composable
  const {
    loading,
    stats,
    orders,
    customers,
    expenses,
    tenants,
    users,
    fetchData,
    handleUpdateStatus,
    handleUpdatePayment,
    handleCreateOrder,
    handleUpdateOrder,
    handleCancelOrder,
    handleDeleteOrder,
    handleCreateExpense,
    handleDeleteExpense,
    handleCreateCustomer,
    handleUpdateCustomer,
    handleDeleteCustomer,
    handleToggleUserStatus,
    handleUpdateUserSubscription,
    handleExtendUserSubscription,
    handleCreateTenant,
    handleUpdateTenant,
    handleCreateUser,
    handleDeleteUser,
    handleUpdateUser,
    handleResetPassword,
  } = useLaundryData({ tenantId, currentUser });

  // WhatsApp Gateway Composable (always target a valid tenant ID)
  const effectiveTenantId = tenantId === "all" ? (tenants[0]?.id || "tenant-01") : tenantId;
  const currentActiveTenant = tenants.find((t) => t.id === effectiveTenantId) || tenants[0];
  const isShiftEnabled =
    currentActiveTenant?.enableCashierShift !== "false" &&
    currentActiveTenant?.enableCashierShift !== false;
  const waGateway = useWhatsAppGateway(effectiveTenantId);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Spotlight Interactive Tour State (Pattern 1, 2, 3: Spotlight, Popover Tour, Pulsing Beacon)
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [tourStepIndex, setTourStepIndex] = useState<number>(0);

  const startSpotlightTour = () => {
    setShowTutorialModal(false);
    setTourStepIndex(0);
    setIsTourOpen(true);
  };

  const tourSteps: TourStep[] = useMemo(() => {
    if (currentUserRole === "staff") {
      return [
        {
          id: "shift",
          targetId: "tour-shift-btn",
          title: "Buka / Tutup Shift Kasir",
          badge: "Langkah 1 dari 5",
          description: "Sebelum melayani pelanggan, pastikan Anda membuka shift dan memasukkan modal kas awal laci kasir untuk akurasi rekonsiliasi uang fisik di akhir hari.",
          tips: ["Selalu cek uang kembalian sebelum shift", "Rekonsiliasi otomatis saat tutup shift"],
          preferredPlacement: "bottom",
        },
        {
          id: "order-nav",
          targetId: "sidebar-nav-orders",
          title: "Meja Kasir & Input Transaksi",
          badge: "Langkah 2 dari 5",
          description: "Klik menu Kasir ini untuk mencatat pesanan kiloan/satuan baru, timbang pakaian, dan cetak nota struk kasir thermal 58mm/80mm.",
          tips: ["Bisa langsung cetak nota 58mm/80mm", "Nota digital otomatis dikirim via WhatsApp"],
          preferredPlacement: "right",
        },
        {
          id: "whatsapp",
          targetId: "tour-whatsapp-btn",
          title: "Status WhatsApp Gateway",
          badge: "Langkah 3 dari 5",
          description: "Indikator hijau menunjukkan sistem WhatsApp outlet terhubung dan siap mengirimkan notifikasi status cucian otomatis (Antrian, Proses, Siap Ambil, Selesai) ke nomor WhatsApp pelanggan.",
          tips: ["Pelanggan dapat melacak status cucian secara realtime via link invoice"],
          preferredPlacement: "bottom",
        },
        {
          id: "ai-assistant",
          targetId: "tour-ai-widget",
          title: "Cleanique AI Copilot",
          badge: "Langkah 4 dari 5",
          description: "Butuh bantuan cara menghilangkan noda membandel, informasi paket, atau bingung fitur sistem? Klik tombol AI ini kapan saja untuk tanya asisten cerdas berbasis Gemini Flash.",
          tips: ["Bisa diciutkan ke pojok agar tidak menutupi tabel", "Mendukung panduan instan dan tips operasional"],
          preferredPlacement: "top",
        },
        {
          id: "help-btn",
          targetId: "header-btn-tutorial",
          title: "Buka Panduan Kapan Saja",
          badge: "Langkah 5 dari 5",
          description: "Kapan pun Anda atau rekan kasir baru membutuhkan pelatihan ulang, klik tombol 'Panduan' di header ini untuk memutar tur interaktif kembali.",
          preferredPlacement: "bottom",
        },
      ];
    }

    if (currentUserRole === "tenant_owner") {
      return [
        {
          id: "shift",
          targetId: "tour-shift-btn",
          title: "Monitoring Shift & Kas Laci",
          badge: "Langkah 1 dari 6",
          description: "Pantau kasir yang sedang bertugas, modal kas awal, serta pantau rekonsiliasi kas saat shift ditutup untuk menghindari selisih uang kas fisik.",
          tips: ["Transparansi uang kas fisik vs uang di sistem"],
          preferredPlacement: "bottom",
        },
        {
          id: "orders-nav",
          targetId: "sidebar-nav-orders",
          title: "Meja Kasir & Antrian Pesanan",
          badge: "Langkah 2 dari 6",
          description: "Pusat operasional: kelola seluruh antrian cucian pelanggan, timbang kiloan, update progress cuci/setrika, pelunasan tagihan, dan cetak nota kasir.",
          preferredPlacement: "right",
        },
        {
          id: "cashflow-nav",
          targetId: "sidebar-nav-finance",
          title: "Buku Kas & Pengeluaran Toko",
          badge: "Langkah 3 dari 6",
          description: "Catat pengeluaran operasional toko (deterjen, listrik, parfum, plastik) dan ekspor laporan keuangan laba-rugi ke file Excel / PDF.",
          tips: ["Arus kas otomatis terintegrasi dengan penerimaan kasir"],
          preferredPlacement: "right",
        },
        {
          id: "whatsapp",
          targetId: "tour-whatsapp-btn",
          title: "WhatsApp Gateway Outlet",
          badge: "Langkah 4 dari 6",
          description: "Hubungkan nomor WhatsApp outlet Anda via scan QR (Baileys) atau atur template pesan notifikasi otomatis untuk meningkatkan loyalitas dan kepuasan pelanggan.",
          tips: ["Pelanggan dapat melacak status cucian secara realtime via link invoice"],
          preferredPlacement: "bottom",
        },
        {
          id: "ai-assistant",
          targetId: "tour-ai-widget",
          title: "AI Business Copilot",
          badge: "Langkah 5 dari 6",
          description: "Asisten AI cerdas untuk membantu Anda menganalisis performa bisnis, ide promo hemat deterjen, strategi pemasaran, hingga SOP penanganan komplain pakaian.",
          tips: ["Tersedia bantuan 24/7 di pojok kanan bawah"],
          preferredPlacement: "top",
        },
        {
          id: "tutorial-btn",
          targetId: "header-btn-tutorial",
          title: "Panduan Interaktif Sistem",
          badge: "Langkah 6 dari 6",
          description: "Klik tombol 'Panduan' ini kapan saja untuk memutar ulang tur panduan atau melatih staf kasir baru di outlet Anda.",
          preferredPlacement: "bottom",
        },
      ];
    }

    // Default / Superadmin
    return [
      {
        id: "tenants-nav",
        targetId: "sidebar-nav-tenants",
        title: "Manajemen Mitra Tenant",
        badge: "Langkah 1 dari 4",
        description: "Akses master data seluruh mitra laundry: status langganan, masa aktif paket, dan monitoring outlet.",
        preferredPlacement: "right",
      },
      {
        id: "plans-nav",
        targetId: "sidebar-nav-invoices",
        title: "Paket Langganan & Billing",
        badge: "Langkah 2 dari 4",
        description: "Kelola master paket langganan, harga referral affiliate, dan verifikasi bukti bayar langganan mitra.",
        preferredPlacement: "right",
      },
      {
        id: "ai-assistant",
        targetId: "tour-ai-widget",
        title: "Cleanique AI Assistant",
        badge: "Langkah 3 dari 4",
        description: "Asisten AI untuk troubleshooting sistem, navigasi cepat menu platform, serta analisis perkembangan outlet mitra secara real-time.",
        tips: ["Tersedia bantuan teknis dan panduan operasional multi-cabang"],
        preferredPlacement: "top",
      },
      {
        id: "tutorial-btn",
        targetId: "header-btn-tutorial",
        title: "Panduan Platform",
        badge: "Langkah 4 dari 4",
        description: "Klik tombol 'Panduan' ini kapan saja untuk memutar ulang tur fitur pusat kendali platform.",
        preferredPlacement: "bottom",
      },
    ];
  }, [currentUserRole]);

  // Modal UI States
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState<Order | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseModalType, setExpenseModalType] = useState<"income" | "expense">("expense");
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [preselectedCustomerId, setPreselectedCustomerId] = useState<string>("");

  const handleOpenReceipt = (order: Order) => {
    setSelectedReceiptOrder(order);
    setShowReceiptModal(true);
  };

  const handleOpenCreateOrder = (customerId?: string) => {
    setPreselectedCustomerId(customerId || "");
    setActiveTab("create-order");
  };

  const handleOpenExpenseModal = (defaultType: "income" | "expense" = "expense") => {
    setExpenseModalType(defaultType);
    setShowExpenseModal(true);
  };

  const handleOpenEditOrder = (order: Order) => {
    setSelectedOrderToEdit(order);
    setActiveTab("edit-order");
  };

  const handleEditCustomer = (cust: Customer) => {
    setCustomerToEdit(cust);
    setShowEditCustomerModal(true);
  };

  const getOrderWaLink = (order: Order) => getWaLink(order, tenants);

  const handleSendDirectWa = async (order: Order): Promise<{ success: boolean; error?: string }> => {
    if (!order.customer?.phone) {
      toast.warning("Nomor WA Tidak Ditemukan", "Pelanggan ini tidak memiliki nomor telepon terdaftar.");
      return { success: false, error: "Nomor telepon tidak ditemukan" };
    }

    const { text } = getWaMessageText(order, tenants);
    const targetTenant = tenants.find((t) => t.id === order.tenantId) || tenants[0];

    try {
      const res = await waGateway.sendDirectMessage(order.customer.phone, text, {
        orderId: order.id,
        recipientName: order.customer?.name,
      });

      if (res.success) {
        toast.success(
          "WhatsApp Berhasil Terkirim!",
          `Notifikasi dikirim via WhatsApp resmi ${targetTenant?.outletName || "toko"} ke ${order.customer?.name || "pelanggan"} (${order.customer?.phone}).`
        );
        fetchData();
        return { success: true };
      } else {
        toast.error("Gagal Mengirim via WA Toko", res.error || "Membuka WhatsApp Web manual...");
        const cleanPhone = order.customer.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
        return { success: false, error: res.error };
      }
    } catch (err: any) {
      toast.error("Kesalahan Pengiriman", err.message || "Beralih ke WhatsApp Web");
      const cleanPhone = order.customer.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
      return { success: false, error: err.message };
    }
  };

  // Public registration & success pages
  if (publicRoute === "register") {
    return <RegisterPage />;
  }
  if (publicRoute === "register-success") {
    return <RegisterSuccessPage />;
  }

  // Public tracking page view (takes priority over login / app shell)
  if (trackingInvoice !== null) {
    return (
      <PublicTrackingPage
        initialInvoiceNo={trackingInvoice}
        onBackToApp={() => {
          if (window.history.pushState) {
            window.history.pushState({}, "", "/");
          }
          setTrackingInvoice(null);
        }}
      />
    );
  }

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const activeStatus = checkUserActiveStatus(currentUser);

  return (
    <div className="min-h-screen bg-zinc-50/50 flex text-zinc-900 font-sans antialiased selection:bg-zinc-900 selection:text-white">
      {/* Modal / Layer Besar Pemblokiran Saat Akun Tidak Aktif / Habis Masa Aktif */}
      {!activeStatus.isActive && currentUserRole !== "superadmin" && (
        <InactiveAccountModal
          isOpen={true}
          user={currentUser}
          onRefreshStatus={async () => {
            const isNowActive = await refreshUserSession();
            if (isNowActive) {
              fetchData();
            }
            return isNowActive;
          }}
          onLogout={handleLogout}
        />
      )}

      {/* Shadcn Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeOrdersCount={stats.activeOrdersCount}
        readyOrdersCount={stats.readyOrdersCount}
        tenantId={tenantId}
        onSelectTenant={(id) => handleSelectTenant(id, tenants)}
        tenants={tenants}
        currentUserRole={currentUserRole}
        currentUser={currentUser}
        onToggleRole={(role) => {
          setCurrentUserRole(role);
          if (role === "superadmin") {
            setTenantId("all");
          } else {
            setTenantId(tenants[0]?.id || "tenant-01");
          }
        }}
        onOpenTenantModal={() => setShowTenantModal(true)}
        onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
        onOpenTutorialModal={() => setShowTutorialModal(true)}
        waData={waGateway.waData}
        onLogout={handleLogout}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        isDragging={isDraggingSidebar}
        setIsDragging={setIsDraggingSidebar}
        isDesktop={isDesktop}
      />

      {/* Main Content Area */}
      <div
        style={{
          paddingLeft: isDesktop ? `${effectiveSidebarWidth}px` : undefined,
        }}
        className={`flex-1 flex flex-col min-w-0 ${
          isDraggingSidebar
            ? "transition-none"
            : "transition-[padding] duration-200 ease-out"
        }`}
      >
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUserRole={currentUserRole}
          currentUser={currentUser}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onRefresh={() => {
            fetchData();
            cashierShift.fetchActiveShift();
          }}
          onLogout={handleLogout}
          loading={loading}
          waData={waGateway.waData}
          onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
          currentShift={cashierShift.currentShift}
          enableCashierShift={isShiftEnabled}
          onOpenShiftModal={() => setShowOpenShiftModal(true)}
          onCloseShiftModal={() => setShowCloseShiftModal(true)}
          onOpenTutorialModal={() => setShowTutorialModal(true)}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === "overview" && (
                <OverviewTab
                  stats={stats}
                  orders={orders}
                  tenants={tenants}
                  users={users}
                  tenantId={tenantId}
                  currentUserRole={currentUserRole}
                  currentUser={currentUser}
                  currentShift={cashierShift.currentShift}
                  enableCashierShift={isShiftEnabled}
                  onOpenShiftModal={() => setShowOpenShiftModal(true)}
                  onCloseShiftModal={() => setShowCloseShiftModal(true)}
                  onSelectTenant={(id) => handleSelectTenant(id, tenants)}
                  onOpenTenantModal={() => setShowTenantModal(true)}
                  onOpenUserModal={() => setShowUserModal(true)}
                  onOpenOrderModal={() => handleOpenCreateOrder()}
                  onOpenExpenseModal={() => handleOpenExpenseModal("expense")}
                  onUpdateStatus={handleUpdateStatus}
                  getWaLink={getOrderWaLink}
                  setActiveTab={setActiveTab}
                  waData={waGateway.waData}
                  onSendDirectWa={handleSendDirectWa}
                />
              )}

              {activeTab === "orders" && (
                <OrdersTab
                  orders={orders}
                  tenants={tenants}
                  currentUserRole={currentUserRole}
                  onOpenOrderModal={() => handleOpenCreateOrder()}
                  onUpdateStatus={handleUpdateStatus}
                  onUpdatePayment={handleUpdatePayment}
                  getWaLink={getOrderWaLink}
                  onOpenReceiptModal={handleOpenReceipt}
                  onOpenEditOrderModal={handleOpenEditOrder}
                  onCancelOrder={handleCancelOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onOpenWaLogsModal={(order) => setSelectedOrderForWaLogs(order)}
                  onSendDirectWa={handleSendDirectWa}
                  isWaConnected={waGateway.waData?.status === "connected"}
                />
              )}

              {activeTab === "services" && (
                <ServicesTab
                  tenantId={tenantId}
                  tenants={tenants}
                  currentUserRole={currentUserRole}
                />
              )}

              {activeTab === "create-order" && (
                <OrderFormTab
                  mode="create"
                  customers={customers}
                  initialCustomerId={preselectedCustomerId}
                  tenantServices={(tenants.find((t) => t.id === tenantId) || tenants[0])?.services}
                  onBack={() => setActiveTab("orders")}
                  onSubmitCreate={handleCreateOrder}
                  onSubmitEdit={handleUpdateOrder}
                />
              )}

              {activeTab === "edit-order" && (
                <OrderFormTab
                  mode="edit"
                  order={selectedOrderToEdit}
                  customers={customers}
                  tenantServices={
                    (tenants.find((t) => t.id === (selectedOrderToEdit?.tenantId || tenantId)) ||
                      tenants[0])?.services
                  }
                  onBack={() => setActiveTab("orders")}
                  onSubmitCreate={handleCreateOrder}
                  onSubmitEdit={handleUpdateOrder}
                />
              )}

              {(activeTab === "finance" || activeTab === "cashflow" || activeTab === "reports") && (
                <FinanceTab
                  stats={stats}
                  expenses={expenses}
                  orders={orders}
                  tenants={tenants}
                  currentTenantId={tenantId}
                  currentUserRole={currentUserRole}
                  tenantId={effectiveTenantId}
                  enableCashierShift={isShiftEnabled}
                  onOpenExpenseModal={handleOpenExpenseModal}
                  onDeleteExpense={handleDeleteExpense}
                  customers={customers}
                  users={users}
                />
              )}

              {activeTab === "customers" && (
                <CustomersTab
                  customers={customers}
                  orders={orders}
                  tenants={tenants}
                  currentUserRole={currentUserRole}
                  onOpenCustomerModal={() => setShowCustomerModal(true)}
                  onSelectCustomerForOrder={(customerId) => handleOpenCreateOrder(customerId)}
                  onEditCustomer={handleEditCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                />
              )}

              {activeTab === "tenants" && currentUserRole === "superadmin" && (
                <TenantsTab
                  tenants={tenants}
                  users={users}
                  onResetPassword={handleResetPassword}
                  onOpenTenantModal={() => setShowTenantModal(true)}
                  onUpdateTenant={handleUpdateTenant}
                  onRefreshData={fetchData}
                />
              )}

              {activeTab === "users" && currentUserRole === "superadmin" && (
                <UsersTab
                  users={users}
                  tenants={tenants}
                  onOpenUserModal={() => setShowUserModal(true)}
                  onDeleteUser={handleDeleteUser}
                  onToggleStatus={handleToggleUserStatus}
                  onUpdateSubscription={handleUpdateUserSubscription}
                  onExtendSubscription={handleExtendUserSubscription}
                  onResetPassword={handleResetPassword}
                />
              )}

              {activeTab === "logs" && currentUserRole === "superadmin" && (
                <SystemLogsTab
                  tenants={tenants}
                  currentTenantId={tenantId}
                />
              )}

              {activeTab === "referral_codes" && (
                <ReferralCodesTab currentUser={currentUser || undefined} />
              )}

              {activeTab === "marketing" && (
                <MarketingTab currentUser={currentUser || undefined} />
              )}

              {activeTab === "subscription" && (
                <SubscriptionTab tenantId={effectiveTenantId} />
              )}

              {activeTab === "plans" && currentUserRole === "superadmin" && (
                <PlansTab />
              )}

              {activeTab === "signups" && currentUserRole === "superadmin" && (
                <SignupsTab />
              )}

              {activeTab === "invoices" && currentUserRole === "superadmin" && (
                <PlatformFinanceTab />
              )}

              {activeTab === "settings_platform" && currentUserRole === "superadmin" && (
                <PlatformSettingsTab />
              )}

              {activeTab === "settings" && (
                <SettingsTab
                  tenant={currentActiveTenant}
                  currentUser={currentUser}
                  onUpdateTenant={handleUpdateTenant}
                  onUpdateUser={async (id, data) => {
                    const ok = await handleUpdateUser(id, data);
                    if (ok) {
                      await refreshUserSession();
                    }
                    return ok;
                  }}
                  onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
                  waStatus={waGateway.waData?.status}
                  setActiveTab={setActiveTab}
                  currentUserRole={currentUserRole}
                  tenantId={effectiveTenantId}
                  tenants={tenants}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Unified Modals Container */}
      <AppModals
        showOrderModal={showOrderModal}
        setShowOrderModal={setShowOrderModal}
        showEditOrderModal={showEditOrderModal}
        setShowEditOrderModal={setShowEditOrderModal}
        selectedOrderToEdit={selectedOrderToEdit}
        setSelectedOrderToEdit={setSelectedOrderToEdit}
        showReceiptModal={showReceiptModal}
        setShowReceiptModal={setShowReceiptModal}
        selectedReceiptOrder={selectedReceiptOrder}
        setSelectedReceiptOrder={setSelectedReceiptOrder}
        showExpenseModal={showExpenseModal}
        setShowExpenseModal={setShowExpenseModal}
        expenseModalType={expenseModalType}
        showCustomerModal={showCustomerModal}
        setShowCustomerModal={setShowCustomerModal}
        showEditCustomerModal={showEditCustomerModal}
        setShowEditCustomerModal={setShowEditCustomerModal}
        customerToEdit={customerToEdit}
        setCustomerToEdit={setCustomerToEdit}
        showTenantModal={showTenantModal}
        setShowTenantModal={setShowTenantModal}
        showUserModal={showUserModal}
        setShowUserModal={setShowUserModal}
        preselectedCustomerId={preselectedCustomerId}
        customers={customers}
        tenants={tenants}
        tenantId={effectiveTenantId}
        waData={waGateway.waData}
        onSendBaileys={waGateway.sendDirectMessage}
        onCreateOrder={handleCreateOrder}
        onUpdateOrder={handleUpdateOrder}
        onCreateExpense={handleCreateExpense}
        onCreateCustomer={handleCreateCustomer}
        onUpdateCustomer={handleUpdateCustomer}
        onCreateTenant={handleCreateTenant}
        onCreateUser={handleCreateUser}
      />

      {/* WhatsApp Gateway Settings Modal */}
      <WhatsAppSettingsModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        waData={waGateway.waData}
        loading={waGateway.loading}
        isSendingTest={waGateway.isSendingTest}
        onConnect={waGateway.connectWA}
        onDisconnect={waGateway.disconnectWA}
        onUpdateMode={waGateway.updateMode}
        onSendTest={waGateway.sendTestMessage}
        tenants={tenants}
        currentTenantId={effectiveTenantId}
        onSelectTenant={(id) => handleSelectTenant(id, tenants)}
        currentUserRole={currentUserRole}
        currentUser={currentUser}
      />

      {/* Cashier Shift: Buka Shift Modal */}
      <OpenShiftModal
        isOpen={showOpenShiftModal}
        onClose={() => setShowOpenShiftModal(false)}
        cashierName={currentUser.name || currentUser.email || "Kasir"}
        onConfirmOpen={async (startingCash, notes) => {
          const ok = await cashierShift.openShift(startingCash, notes);
          if (ok) {
            fetchData();
          }
          return ok;
        }}
      />

      {/* Cashier Shift: Tutup Shift & Rekonsiliasi Kas Modal */}
      <CloseShiftModal
        isOpen={showCloseShiftModal}
        onClose={() => setShowCloseShiftModal(false)}
        currentShift={cashierShift.currentShift}
        onConfirmClose={async (actualCashTotal, notes) => {
          const res = await cashierShift.closeShift(actualCashTotal, notes);
          if (res) {
            fetchData();
          }
          return res;
        }}
      />

      {/* WhatsApp Logs Audit Modal */}
      <WhatsAppLogsModal
        isOpen={!!selectedOrderForWaLogs}
        onClose={() => setSelectedOrderForWaLogs(null)}
        orderId={selectedOrderForWaLogs?.id}
        invoiceNo={selectedOrderForWaLogs?.invoiceNo}
        tenantId={selectedOrderForWaLogs?.tenantId || effectiveTenantId}
      />

      {/* In-Web Dashboard AI Assistant (Gemini Flash) */}
      <AIAssistantWidget
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUserRole={currentUserRole}
        onOpenWhatsAppModal={() => setShowWhatsAppModal(true)}
        onOpenOpenShiftModal={() => setShowOpenShiftModal(true)}
        onOpenCloseShiftModal={() => setShowCloseShiftModal(true)}
        onOpenExpenseModal={handleOpenExpenseModal}
        onOpenTutorialModal={() => setShowTutorialModal(true)}
      />

      {/* Onboarding Interactive Tutorial Modal */}
      <OnboardingTutorialModal
        isOpen={showTutorialModal}
        onClose={() => setShowTutorialModal(false)}
        onComplete={handleCompleteTutorial}
        onStartSpotlightTour={startSpotlightTour}
        currentUserRole={currentUserRole}
        userName={currentUser?.name}
        outletName={currentActiveTenant?.outletName || "Laundry Cleanique"}
      />

      {/* Spotlight Tour Overlay (Pattern 1, 2, 3: Spotlight, Popover Tour, Pulsing Beacon) */}
      <SpotlightTourOverlay
        isOpen={isTourOpen}
        steps={tourSteps}
        currentStepIndex={tourStepIndex}
        onNext={() => {
          if (tourStepIndex < tourSteps.length - 1) {
            const nextIdx = tourStepIndex + 1;
            setTourStepIndex(nextIdx);
            if (tourSteps[nextIdx].actionRequiredTab) {
              setActiveTab(tourSteps[nextIdx].actionRequiredTab!);
            }
          } else {
            setIsTourOpen(false);
            handleCompleteTutorial();
          }
        }}
        onPrev={() => {
          if (tourStepIndex > 0) {
            const prevIdx = tourStepIndex - 1;
            setTourStepIndex(prevIdx);
            if (tourSteps[prevIdx].actionRequiredTab) {
              setActiveTab(tourSteps[prevIdx].actionRequiredTab!);
            }
          }
        }}
        onSkip={() => {
          setIsTourOpen(false);
          handleCompleteTutorial();
        }}
        onFinish={() => {
          setIsTourOpen(false);
          handleCompleteTutorial();
        }}
        onClose={() => setIsTourOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
