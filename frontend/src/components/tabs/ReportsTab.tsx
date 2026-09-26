import React, { useState } from "react";
import { Order, Expense, Tenant, Customer, Role } from "../../types";
import { useReportData } from "./reports/useReportData";
import { OfficialReportDocument } from "./reports/OfficialReportDocument";
import { ReportFilters } from "./reports/ReportFilters";
import { ReportMetricsCards } from "./reports/ReportMetricsCards";
import { ReportAnalyticsPanels } from "./reports/ReportAnalyticsPanels";
import { ReportLedgerTable } from "./reports/ReportLedgerTable";
import { PrintPreviewModal } from "./reports/PrintPreviewModal";
import { SuperAdminPlatformReport } from "./reports/SuperAdminPlatformReport";
import { BusinessHealthSection } from "./reports/BusinessHealthSection";
import { computeFrontendBusinessHealth } from "../../utils/businessHealthUtils";
import { Activity, FileText } from "lucide-react";
import { User } from "../../types";

interface ReportsTabProps {
  orders: Order[];
  expenses: Expense[];
  tenants: Tenant[];
  currentTenantId: string;
  customers: Customer[];
  currentUserRole?: Role;
  users?: User[];
}

const TenantStoreReport: React.FC<ReportsTabProps> = ({
  orders,
  expenses,
  tenants,
  currentTenantId,
  currentUserRole = "staff",
}) => {
  const isSuperAdmin = currentUserRole === "superadmin";
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"recap" | "health">("recap");

  const {
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
  } = useReportData({
    orders,
    expenses,
    tenants,
    currentTenantId,
    currentUserRole,
  });

  const businessHealth = React.useMemo(() => {
    let customRatios = null;
    if (activeTenant?.customSopRatios) {
      try {
        customRatios =
          typeof activeTenant.customSopRatios === "string"
            ? JSON.parse(activeTenant.customSopRatios)
            : activeTenant.customSopRatios;
      } catch {}
    }
    return computeFrontendBusinessHealth(filteredOrders, filteredExpenses, customRatios);
  }, [filteredOrders, filteredExpenses, activeTenant]);

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
        {/* Top Header, Filters & Action Controls */}
        <ReportFilters
          activeTenant={activeTenant}
          onOpenPrintPreview={() => setShowPrintModal(true)}
          onDownloadExcel={downloadExcel}
          onDownloadCSV={downloadCSV}
          onPrintPDF={handlePrintPDF}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          paymentFilter={paymentFilter}
          setPaymentFilter={setPaymentFilter}
          tenants={tenants}
          selectedTenantId={selectedTenantId}
          onSelectTenant={setSelectedTenantId}
          isSuperAdmin={isSuperAdmin}
        />

        {/* Sub-tab Navigation: Rekap Keuangan vs Kesehatan Bisnis */}
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2">
          <button
            onClick={() => setActiveSubTab("recap")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === "recap"
                ? "bg-zinc-900 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
            }`}
          >
            <FileText className="w-4 h-4" />
            Rekap Finansial & Buku Besar
          </button>
          <button
            onClick={() => setActiveSubTab("health")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === "health"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            }`}
          >
            <Activity className="w-4 h-4" />
            Kesehatan Bisnis & Efisiensi Bahan
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-700 text-white font-black">
              {businessHealth.healthScore}
            </span>
          </button>
        </div>

        {activeSubTab === "health" ? (
          <BusinessHealthSection
            health={businessHealth}
            tenantId={selectedTenantId}
          />
        ) : (
          <>
            {/* Executive Financial Metrics (5 Cards) */}
            <ReportMetricsCards
              metrics={metrics}
              expenseCount={filteredExpenses.length}
            />

            {/* Two Column Analytic Panels: Services & Expenses */}
            <ReportAnalyticsPanels
              serviceBreakdown={serviceBreakdown}
              expenseBreakdown={expenseBreakdown}
              paymentMethodBreakdown={paymentMethodBreakdown}
              totalExpense={metrics.totalExpense}
              paidCount={metrics.paidCount}
            />

            {/* Buku Besar Transaksi Rinci (Ledger Table with Search & Pagination) */}
            <ReportLedgerTable
              searchQuery={searchQuery}
              onSearchChange={(q) => {
                setSearchQuery(q);
                setPage(1);
              }}
              paginatedOrders={paginatedOrders}
              totalOrdersCount={filteredOrders.length}
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPage(1);
              }}
              isMultiTenant={activeTenant.id === "all" || isSuperAdmin}
              tenants={tenants}
            />
          </>
        )}
      </div>

      {/* Modal Preview Lembar Cetak Dokumen Resmi PDF */}
      <PrintPreviewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        onPrint={handlePrintPDF}
        onDownloadExcel={downloadExcel}
      >
        <OfficialReportDocument
          activeTenant={activeTenant}
          dateRangeLabel={dateRange.label}
          metrics={metrics}
          serviceBreakdown={serviceBreakdown}
          filteredOrders={filteredOrders}
          tenants={tenants}
        />
      </PrintPreviewModal>

      {/* Dedicated Printable Area for window.print() (Always mounted in DOM) */}
      <div id="official-report-printable" className="hidden print:block font-sans">
        <OfficialReportDocument
          activeTenant={activeTenant}
          dateRangeLabel={dateRange.label}
          metrics={metrics}
          serviceBreakdown={serviceBreakdown}
          filteredOrders={filteredOrders}
          tenants={tenants}
        />
      </div>
    </div>
  );
};

export const ReportsTab: React.FC<ReportsTabProps> = (props) => {
  if (props.currentUserRole === "superadmin") {
    return (
      <SuperAdminPlatformReport
        tenants={props.tenants}
        users={props.users || []}
        orders={props.orders}
      />
    );
  }
  return <TenantStoreReport {...props} />;
};

