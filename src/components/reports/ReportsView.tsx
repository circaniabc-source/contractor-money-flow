/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Simple Reports & Financial Analysis
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatPeso } from '../../services/categories';
import { ExportService } from '../../services/exportService';
import { AdBanner } from '../AdBanner';
import {
  BarChart3,
  Calendar,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  PieChart,
  Download,
  Briefcase,
  Coins,
} from 'lucide-react';

type ReportTab = 'summary' | 'projects' | 'budget_vs_actual';

export const ReportsView: React.FC<{ onOpenProModal: () => void }> = ({ onOpenProModal }) => {
  const { profile, projects, transactions, balances, getProjectSummary } = useApp();
  const [activeTab, setActiveTab] = useState<ReportTab>('summary');

  // Summary metrics
  const totalCollections = useMemo(() => {
    return transactions.reduce((acc, t) => (t.type === 'income' ? acc + t.amount : acc), 0);
  }, [transactions]);

  const totalExpenses = useMemo(() => {
    return transactions.reduce((acc, t) => (t.type === 'expense' ? acc + t.amount : acc), 0);
  }, [transactions]);

  const overallNetProfit = totalCollections - totalExpenses;

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const map: { [c: string]: number } = {};
    transactions.forEach((t) => {
      if (t.type === 'expense') {
        map[t.category] = (map[t.category] || 0) + t.amount;
      }
    });

    return Object.entries(map)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, totalExpenses]);

  // PDF Export
  const handleExportPDF = () => {
    ExportService.exportToPDF(
      transactions as any,
      'business' as any,
      profile.businessName || 'Contractor Money Flow',
      'Overall Construction Financial Statement',
      {
        totalIncome: totalCollections,
        totalExpenses: totalExpenses,
        netResult: overallNetProfit,
        cashBalance: balances.totalAvailableCash,
      }
    );
  };

  // CSV Export
  const handleExportCSV = () => {
    ExportService.exportToExcelCSV(
      transactions,
      profile.businessName || 'Contractor Money Flow',
      'Overall Construction Ledger'
    );
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Report Segment Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between text-xs">
        {[
          { id: 'summary' as ReportTab, label: 'Overview' },
          { id: 'projects' as ReportTab, label: 'Project Profits' },
          { id: 'budget_vs_actual' as ReportTab, label: 'Budget vs Actual' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
            className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-center ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {/* Financial Summary Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Overall Company Financials
                </span>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Contractor Profit & Loss
                </h2>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  overallNetProfit >= 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {overallNetProfit >= 0 ? 'Operating Profit' : 'Deficit'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Collections</span>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block truncate">
                  {formatPeso(totalCollections)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Expenses</span>
                <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400 mt-1 block truncate">
                  {formatPeso(totalExpenses)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Net Profit</span>
                <span
                  className={`text-sm font-black font-mono mt-1 block truncate ${
                    overallNetProfit >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {formatPeso(overallNetProfit)}
                </span>
              </div>
            </div>
          </div>

          {/* Expense Categories Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-slate-400" />
              <span>Cost Distribution by Category</span>
            </h3>

            {categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No expenses recorded yet.</p>
            ) : (
              <div className="space-y-3 pt-1">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {cat.name}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-slate-400">({cat.percent}%)</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatPeso(cat.amount)}
                        </span>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${cat.percent}%` }}
                        className="h-full bg-amber-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROJECT PROFITS TAB */}
      {activeTab === 'projects' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Project Profitability Ledger
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Individual profit for each construction and specialty project
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {projects.map((p) => {
              const summary = getProjectSummary(p.id);

              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                      {p.name}
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        summary.actualProjectProfit >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatPeso(summary.actualProjectProfit)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div>
                      <span className="block text-[10px] text-slate-400">Contract</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {formatPeso(summary.contractAmount)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400">Collected</span>
                      <span className="font-mono font-semibold text-emerald-600">
                        {formatPeso(summary.totalCollections)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400">Cost Spent</span>
                      <span className="font-mono font-semibold text-rose-600">
                        {formatPeso(summary.actualProjectCost)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BUDGET VS ACTUAL TAB */}
      {activeTab === 'budget_vs_actual' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Budget vs Actual Cost Tracking
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Compare estimated project budgets against actual spending
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {projects.map((p) => {
              const summary = getProjectSummary(p.id);
              const variance = summary.estimatedProjectCost - summary.actualProjectCost;
              const isUnderBudget = variance >= 0;

              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                      {p.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isUnderBudget
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {isUnderBudget ? 'Under Budget' : 'Over Budget'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="block text-[10px] text-slate-400">Estimated Cost</span>
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {formatPeso(summary.estimatedProjectCost)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400">Actual Spent</span>
                      <span className="font-mono font-semibold text-rose-600">
                        {formatPeso(summary.actualProjectCost)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400">Variance</span>
                      <span
                        className={`font-mono font-bold ${
                          isUnderBudget ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatPeso(variance)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Export Section (PDF & Excel) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Download Financial Reports
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Export line-item ledger and project summaries
            </p>
          </div>
          <Download className="w-5 h-5 text-slate-400" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleExportPDF}
            type="button"
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:border-amber-500 text-left transition-all"
          >
            <FileText className="w-4 h-4 text-rose-500 mb-1.5" />
            <span className="font-bold text-xs text-slate-900 dark:text-white block">
              PDF Statement
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Official summary & line-item records
            </span>
          </button>

          <button
            onClick={handleExportCSV}
            type="button"
            className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:border-amber-500 text-left transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500 mb-1.5" />
            <span className="font-bold text-xs text-slate-900 dark:text-white block">
              Excel / CSV
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Spreadsheet data with UTF-8 BOM
            </span>
          </button>
        </div>
      </div>

      <AdBanner onUpgradeClick={onOpenProModal} />
    </div>
  );
};
