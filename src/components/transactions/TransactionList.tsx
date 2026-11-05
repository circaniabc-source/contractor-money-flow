/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Transaction History, Search & Filtering
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Transaction, PaymentMethod, TransactionType } from '../../types';
import { formatPeso } from '../../services/categories';
import {
  Search,
  Filter,
  Calendar,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Trash2,
  X,
  CreditCard,
  Briefcase,
  Building,
  Plus,
  Check,
  Clock,
} from 'lucide-react';

interface TransactionListProps {
  onEditTransaction: (txn: Transaction) => void;
  onOpenNewTransaction: () => void;
}

type DateFilterOption = 'all' | 'today' | 'week' | 'month' | 'custom';
type StatusFilterOption = 'all' | 'paid' | 'unpaid';

export const TransactionList: React.FC<TransactionListProps> = ({
  onEditTransaction,
  onOpenNewTransaction,
}) => {
  const { transactions, projects, deleteTransaction, markTransactionPaid } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Filter calculations
  const filteredTransactions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

    return transactions.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = (t.description || '').toLowerCase().includes(q);
        const matchesCat = (t.category || '').toLowerCase().includes(q);
        const matchesNotes = (t.notes || '').toLowerCase().includes(q);
        const matchesSupplier = (t.supplierOrPayee || '').toLowerCase().includes(q);
        const project = projects.find((p) => p.id === t.projectId);
        const matchesProject = project ? project.name.toLowerCase().includes(q) : false;

        if (!matchesDesc && !matchesCat && !matchesNotes && !matchesSupplier && !matchesProject) {
          return false;
        }
      }

      // Project filter
      if (projectFilter !== 'all') {
        if (projectFilter === 'general' && t.projectId) return false;
        if (projectFilter !== 'general' && t.projectId !== projectFilter) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) {
        return false;
      }

      // Method filter
      if (methodFilter !== 'all' && t.paymentMethod !== methodFilter && t.transferToMethod !== methodFilter) {
        return false;
      }

      // Payment Settlement status filter
      if (statusFilter === 'paid') {
        if (t.type === 'expense' && t.paymentStatus === 'unpaid') return false;
      } else if (statusFilter === 'unpaid') {
        if (t.type !== 'expense' || t.paymentStatus !== 'unpaid') return false;
      }

      // Date filter
      if (dateFilter === 'today') {
        if (t.date !== today) return false;
      } else if (dateFilter === 'week') {
        if (t.date < oneWeekAgo || t.date > today) return false;
      } else if (dateFilter === 'month') {
        if (t.date < firstDayOfMonth) return false;
      } else if (dateFilter === 'custom') {
        if (customStartDate && t.date < customStartDate) return false;
        if (customEndDate && t.date > customEndDate) return false;
      }

      return true;
    });
  }, [
    transactions,
    projects,
    searchQuery,
    projectFilter,
    dateFilter,
    customStartDate,
    customEndDate,
    typeFilter,
    methodFilter,
    statusFilter,
  ]);

  // Group by date
  const groupedTransactions = useMemo(() => {
    const groups: { [date: string]: Transaction[] } = {};
    filteredTransactions.forEach((t) => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const dates = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a));

  const totalFilteredNet = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      if (t.type === 'income') return acc + t.amount;
      if (t.type === 'expense') return acc - t.amount;
      return acc;
    }, 0);
  }, [filteredTransactions]);

  return (
    <div className="space-y-4 pb-20">
      {/* Search & Filter Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Financial Ledger
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Filter project collections, material costs, and payroll
            </p>
          </div>

          <button
            onClick={onOpenNewTransaction}
            type="button"
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record Money</span>
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search descriptions, materials, suppliers, projects..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 border border-slate-200 dark:border-slate-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            type="button"
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-colors ${
              showFilterDrawer ||
              typeFilter !== 'all' ||
              methodFilter !== 'all' ||
              statusFilter !== 'all' ||
              projectFilter !== 'all' ||
              dateFilter !== 'all'
                ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Date Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Past 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'custom', label: 'Custom Range' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setDateFilter(pill.id as DateFilterOption)}
              type="button"
              className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                dateFilter === pill.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === 'custom' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">Start Date</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block mb-0.5">End Date</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>
          </div>
        )}

        {/* Filter Drawer */}
        {showFilterDrawer && (
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs">
            {/* Filter by Project */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Filter by Project
              </span>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              >
                <option value="all">All Projects & Overhead</option>
                <option value="general">General Overhead Only</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Type */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Type
              </span>
              <div className="flex gap-1.5">
                {['all', 'income', 'expense', 'transfer'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    type="button"
                    className={`px-3 py-1 rounded-lg text-xs capitalize ${
                      typeFilter === t
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter by Payment Method */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Payment Account
              </span>
              <div className="flex gap-1.5">
                {['all', 'Cash', 'GCash', 'Bank'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethodFilter(m)}
                    type="button"
                    className={`px-3 py-1 rounded-lg text-xs ${
                      methodFilter === m
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter by Settlement Status */}
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Settlement Status
              </span>
              <div className="flex gap-1.5">
                {[
                  { id: 'all', label: 'All Entries' },
                  { id: 'paid', label: 'Paid / Settled' },
                  { id: 'unpaid', label: 'Unpaid / Payables' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id as StatusFilterOption)}
                    type="button"
                    className={`px-3 py-1 rounded-lg text-xs ${
                      statusFilter === s.id
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setTypeFilter('all');
                setMethodFilter('all');
                setStatusFilter('all');
                setProjectFilter('all');
                setDateFilter('all');
                setSearchQuery('');
              }}
              type="button"
              className="text-[11px] text-rose-500 hover:underline pt-1 block"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Summary Count Bar */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Showing <strong className="text-slate-900 dark:text-white">{filteredTransactions.length}</strong> records
        </span>
        <span>
          Net Flow:{' '}
          <strong
            className={`font-mono ${
              totalFilteredNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatPeso(totalFilteredNet)}
          </strong>
        </span>
      </div>

      {/* Transactions Grouped by Date */}
      {dates.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800">
          <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">No records found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {searchQuery || dateFilter !== 'all' || projectFilter !== 'all'
              ? 'Try adjusting your search criteria.'
              : 'Start logging client payments or project costs.'}
          </p>
          <button
            onClick={onOpenNewTransaction}
            type="button"
            className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-600 shadow-md shadow-amber-500/20"
          >
            + Add First Entry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map((dateStr) => {
            const list = groupedTransactions[dateStr];
            const dateObj = new Date(dateStr);
            const isToday = dateStr === new Date().toISOString().slice(0, 10);
            const formattedDate = dateObj.toLocaleDateString('en-PH', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            const dayNet = list.reduce((acc, t) => {
              if (t.type === 'income') return acc + t.amount;
              if (t.type === 'expense') return acc - t.amount;
              return acc;
            }, 0);

            return (
              <div key={dateStr} className="space-y-1.5">
                {/* Date header */}
                <div className="flex items-center justify-between px-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isToday ? `Today (${formattedDate})` : formattedDate}</span>
                  </div>
                  <span
                    className={`font-mono text-[11px] font-semibold ${
                      dayNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatPeso(dayNet)}
                  </span>
                </div>

                {/* Items */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
                  {list.map((txn) => {
                    const isIncome = txn.type === 'income';
                    const isExpense = txn.type === 'expense';
                    const isTransfer = txn.type === 'transfer';
                    const project = projects.find((p) => p.id === txn.projectId);

                    return (
                      <div
                        key={txn.id}
                        onClick={() => onEditTransaction(txn)}
                        className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex items-center justify-between gap-3 group"
                      >
                        {/* Icon */}
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isIncome
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                              : isExpense
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                          }`}
                        >
                          {isIncome && <ArrowDownLeft className="w-5 h-5" />}
                          {isExpense && <ArrowUpRight className="w-5 h-5" />}
                          {isTransfer && <ArrowRightLeft className="w-5 h-5" />}
                        </div>

                        {/* Title & Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {txn.description || txn.category}
                            </span>
                            {txn.type === 'expense' && txn.paymentStatus === 'unpaid' && (
                              <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                Unpaid
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-semibold text-amber-600 dark:text-amber-400 truncate max-w-[120px]">
                              {project ? project.name : 'Overhead'}
                            </span>
                            <span>•</span>
                            <span className="truncate">{txn.category}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {isTransfer
                                ? `${txn.paymentMethod} → ${txn.transferToMethod}`
                                : txn.paymentMethod}
                            </span>
                            {txn.supplierOrPayee && (
                              <>
                                <span>•</span>
                                <span className="truncate">{txn.supplierOrPayee}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Amount & Quick Settlement Action */}
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-mono font-extrabold text-xs ${
                                isIncome
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isExpense
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {isIncome ? '+' : isExpense ? '-' : ''}
                              {formatPeso(txn.amount)}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const confirmed = window.confirm('Permanently delete this entry?');
                                if (confirmed) deleteTransaction(txn.id);
                              }}
                              type="button"
                              className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {txn.type === 'expense' && txn.paymentStatus === 'unpaid' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markTransactionPaid(txn.id);
                              }}
                              type="button"
                              className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-black shadow-xs flex items-center gap-1 active:scale-95 transition-all"
                              title="Mark as settled & paid"
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Mark Paid</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
