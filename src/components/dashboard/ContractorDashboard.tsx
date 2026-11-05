/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Main Dashboard
 */

import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatPeso } from '../../services/categories';
import { Project, Transaction } from '../../types';
import {
  FolderKanban,
  FileText,
  TrendingUp,
  TrendingDown,
  Clock,
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  ChevronRight,
  Coins,
  AlertCircle,
} from 'lucide-react';

interface ContractorDashboardProps {
  onOpenNewProject: () => void;
  onOpenAddIncome: () => void;
  onOpenAddExpense: () => void;
  onViewProjects: () => void;
  onSelectProject: (p: Project) => void;
  onSelectTransaction: (t: Transaction) => void;
}

export const ContractorDashboard: React.FC<ContractorDashboardProps> = ({
  onOpenNewProject,
  onOpenAddIncome,
  onOpenAddExpense,
  onViewProjects,
  onSelectProject,
  onSelectTransaction,
}) => {
  const { profile, projects, transactions, balances, dashboardMetrics } = useApp();

  const {
    activeProjectsCount,
    totalContractAmount,
    totalCollections,
    totalProjectExpenses,
    paidExpenses,
    unpaidExpenses,
    outstandingClientPayments,
    availableBusinessCash,
    estimatedProjectProfit,
    actualProjectProfit,
  } = dashboardMetrics;

  const activeProjects = projects.filter((p) => p.status === 'Active').slice(0, 3);
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-4 pb-20">
      {/* Hero Card: Available Business Cash */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-5 shadow-xl border border-amber-500/30 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Available Business Cash
            </span>
          </div>
          <span className="text-[11px] text-slate-300 font-medium">3 Accounts</span>
        </div>

        <div className="text-3xl font-black font-mono tracking-tight text-white mb-1">
          {formatPeso(availableBusinessCash)}
        </div>
        <p className="text-[11px] text-slate-400">
          Ready cash across physical drawer, GCash, and bank accounts.
        </p>

        {/* Breakdown for Cash, GCash, Bank */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-2 text-center backdrop-blur-xs">
            <span className="text-[10px] text-amber-200 uppercase font-semibold block">Cash on Hand</span>
            <span className="text-xs font-bold font-mono text-white mt-0.5 block truncate">
              {formatPeso(balances.cash)}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2 text-center backdrop-blur-xs">
            <span className="text-[10px] text-amber-200 uppercase font-semibold block">GCash</span>
            <span className="text-xs font-bold font-mono text-white mt-0.5 block truncate">
              {formatPeso(balances.gcash)}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2 text-center backdrop-blur-xs">
            <span className="text-[10px] text-amber-200 uppercase font-semibold block">Bank Account</span>
            <span className="text-xs font-bold font-mono text-white mt-0.5 block truncate">
              {formatPeso(balances.bank)}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Large Action Buttons (Requirement) */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={onOpenNewProject}
          type="button"
          className="p-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black flex items-center gap-3 shadow-md shadow-amber-500/20 active:scale-98 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-950/15 flex items-center justify-center flex-shrink-0">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <span className="text-xs uppercase font-extrabold block tracking-wider">Create</span>
            <span className="text-sm font-black block">New Project</span>
          </div>
        </button>

        <button
          onClick={onViewProjects}
          type="button"
          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-bold flex items-center gap-3 shadow-xs hover:border-amber-500 active:scale-98 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold block">Manage</span>
            <span className="text-sm font-black block">View Projects</span>
          </div>
        </button>

        <button
          onClick={onOpenAddIncome}
          type="button"
          className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-3 shadow-md shadow-emerald-600/20 active:scale-98 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xs text-emerald-100 uppercase font-semibold block">Client Billing</span>
            <span className="text-sm font-black block">+ Add Income</span>
          </div>
        </button>

        <button
          onClick={onOpenAddExpense}
          type="button"
          className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-3 shadow-md shadow-rose-600/20 active:scale-98 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xs text-rose-100 uppercase font-semibold block">Labor & Materials</span>
            <span className="text-sm font-black block">- Add Expense</span>
          </div>
        </button>
      </div>

      {/* Primary Financial Figures Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Active Projects */}
        <div
          onClick={onViewProjects}
          className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-500 transition-all"
        >
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <FolderKanban className="w-4 h-4 text-amber-500" />
            <span>Active Projects</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1.5 font-mono">
            {activeProjectsCount}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {projects.length} total projects
          </span>
        </div>

        {/* Total Contract Amount */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <FileText className="w-4 h-4 text-blue-500" />
            <span>Total Contract Value</span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-1.5 font-mono truncate">
            {formatPeso(totalContractAmount)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Signed project scopes</span>
        </div>

        {/* Total Collections */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Total Collections</span>
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1.5 font-mono truncate">
            {formatPeso(totalCollections)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Client payments received</span>
        </div>

        {/* Total Project Expenses */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <span>Total Project Expenses</span>
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1.5 font-mono truncate">
            {formatPeso(totalProjectExpenses)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Paid: {formatPeso(paidExpenses)} {unpaidExpenses > 0 ? `• Unpaid: ${formatPeso(unpaidExpenses)}` : ''}
          </span>
        </div>
      </div>

      {/* Outstanding Client Payments Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Outstanding Client Payments
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Contract Amount - Collections Received
          </p>
        </div>

        <div className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
          {formatPeso(outstandingClientPayments)}
        </div>
      </div>

      {/* Project Profit Overview (Estimated vs Actual) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Estimated Project Profit */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Estimated Project Profit
          </span>
          <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1 truncate">
            {formatPeso(estimatedProjectProfit)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Contract - Estimated Cost</span>
        </div>

        {/* Actual Project Profit */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Actual Recognized Profit
          </span>
          <div
            className={`text-lg font-black font-mono mt-1 truncate ${
              actualProjectProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatPeso(actualProjectProfit)}
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Collections - Total Costs</span>
        </div>
      </div>

      {/* Active Projects Quick Access */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
            Active Construction Projects
          </h3>
          <button
            onClick={onViewProjects}
            type="button"
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
          >
            <span>See All ({projects.length})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeProjects.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No active projects yet.
            </p>
            <button
              onClick={onOpenNewProject}
              type="button"
              className="mt-2.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-600"
            >
              + Create First Project
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {activeProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 cursor-pointer transition-all flex items-center justify-between group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {p.name}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      {p.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    Client: {p.clientName} • Contract: {formatPeso(p.contractAmount)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
            Recent Money Flows
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Latest Entries</span>
        </div>

        {recentTransactions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            No entries recorded yet. Tap + Add Income or - Add Expense to begin!
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.map((t) => (
              <div
                key={t.id}
                onClick={() => onSelectTransaction(t)}
                className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 px-1 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                      t.type === 'income'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {t.description || t.category}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {t.category} • {t.paymentMethod} {t.paymentStatus === 'unpaid' ? '(Unpaid)' : ''}
                    </p>
                  </div>
                </div>

                <span
                  className={`font-mono font-bold text-xs ${
                    t.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}
                  {formatPeso(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
