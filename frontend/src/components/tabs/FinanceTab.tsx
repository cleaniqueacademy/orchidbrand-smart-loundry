import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, BarChart2 } from "lucide-react";
import { CashflowTab } from "./CashflowTab";
import { ReportsTab } from "./ReportsTab";
import { CashflowStats, Expense, Order, Tenant, Customer, Role, User } from "../../types";

interface FinanceTabProps {
  stats: CashflowStats;
  expenses: Expense[];
  orders: Order[];
  tenants: Tenant[];
  currentTenantId: string;
  currentUserRole?: Role;
  tenantId?: string;
  enableCashierShift?: boolean;
  onOpenExpenseModal: (defaultType?: "income" | "expense") => void;
  onDeleteExpense: (id: string) => void;
  customers: Customer[];
  users?: User[];
}

type FinanceSubTab = "cashflow" | "reports";

export const FinanceTab: React.FC<FinanceTabProps> = ({
  stats,
  expenses,
  orders,
  tenants,
  currentTenantId,
  currentUserRole,
  tenantId,
  enableCashierShift,
  onOpenExpenseModal,
  onDeleteExpense,
  customers,
  users,
}) => {
  const [subTab, setSubTab] = useState<FinanceSubTab>("cashflow");

  const subTabs: { id: FinanceSubTab; label: string; icon: React.ElementType }[] = [
    { id: "cashflow", label: "Buku Kas", icon: BookOpen },
    { id: "reports", label: "Laporan", icon: BarChart2 },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1 w-fit">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          {subTab === "cashflow" ? (
            <CashflowTab
              stats={stats}
              expenses={expenses}
              orders={orders}
              tenants={tenants}
              currentUserRole={currentUserRole}
              tenantId={tenantId}
              enableCashierShift={enableCashierShift}
              onOpenExpenseModal={onOpenExpenseModal}
              onDeleteExpense={onDeleteExpense}
            />
          ) : (
            <ReportsTab
              orders={orders}
              expenses={expenses}
              tenants={tenants}
              currentTenantId={currentTenantId}
              customers={customers}
              currentUserRole={currentUserRole}
              users={users}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
