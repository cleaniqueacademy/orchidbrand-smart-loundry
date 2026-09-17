import React, { useState } from "react";
import { Order, Expense, Tenant, Customer, Role } from "../../types";
import { useReportData } from "./reports/useReportData";
import { OfficialReportDocument } from "./reports/OfficialReportDocument";
import { ReportFilters } from "./reports/ReportFilters";
import { ReportMetricsCards } from "./reports/ReportMetricsCards";
import { ReportAnalyticsPanels } from "./reports/ReportAnalyticsPanels";
import { ReportLedgerTable } from "./reports/ReportLedgerTable";
import { PrintPreviewModal } from "./reports/PrintPreviewModal";

interface ReportsTabProps {
  orders: Order[];
  expenses: Expense[];
  tenants: Tenant[];
  currentTenantId: string;
  customers: Customer[];
  currentUserRole?: Role;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  orders,
  expenses,
  tenants,
  currentTenantId,
  currentUserRole = "staff",
}) => {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const isSuperAdmin = currentUserRole === "superadmin";

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
