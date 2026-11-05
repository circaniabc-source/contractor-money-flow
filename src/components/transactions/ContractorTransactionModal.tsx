/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Transaction Entry Drawer
 * Real-time auto-saving for Project Billings, Materials, Labor, and Expenses.
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Transaction, TransactionType, PaymentMethod, PaymentStatus } from '../../types';
import {
  CONTRACTOR_INCOME_CATEGORIES,
  CONTRACTOR_EXPENSE_CATEGORIES,
  formatPeso,
} from '../../services/categories';
import { autoSave } from '../../services/autoSave';
import { AutoSaveStatus } from '../AutoSaveStatus';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Calendar,
  Tag,
  CreditCard,
  Briefcase,
  User,
  FileText,
  Trash2,
  Check,
  Building,
  Clock,
} from 'lucide-react';

interface ContractorTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
  initialType?: TransactionType;
  preselectedProjectId?: string;
}

export const ContractorTransactionModal: React.FC<ContractorTransactionModalProps> = ({
  isOpen,
  onClose,
  editingTransaction,
  initialType = 'income',
  preselectedProjectId,
}) => {
  const { projects, addTransaction, updateTransaction, deleteTransaction } = useApp();

  const [type, setType] = useState<TransactionType>(initialType);
  const [projectId, setProjectId] = useState<string>(preselectedProjectId || '');
  const [amountStr, setAmountStr] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [transferToMethod, setTransferToMethod] = useState<PaymentMethod>('Cash');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [description, setDescription] = useState<string>('');
  const [supplierOrPayee, setSupplierOrPayee] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [activeTxnId, setActiveTxnId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const draftKey = 'draft_contractor_txn';

  useEffect(() => {
    if (!isOpen) return;

    if (editingTransaction) {
      setActiveTxnId(editingTransaction.id);
      setType(editingTransaction.type);
      setProjectId(editingTransaction.projectId || '');
      setAmountStr(editingTransaction.amount ? editingTransaction.amount.toString() : '');
      setCategory(editingTransaction.category);
      setPaymentMethod(editingTransaction.paymentMethod);
      setPaymentStatus(editingTransaction.paymentStatus || 'paid');
      if (editingTransaction.transferToMethod) {
        setTransferToMethod(editingTransaction.transferToMethod);
      }
      setDate(editingTransaction.date);
      setTime(editingTransaction.time || '');
      setDescription(editingTransaction.description || '');
      setSupplierOrPayee(editingTransaction.supplierOrPayee || '');
      setNotes(editingTransaction.notes || '');
    } else {
      setActiveTxnId(null);
      autoSave.getDraft<any>(draftKey).then((savedDraft) => {
        if (savedDraft) {
          setType(savedDraft.type || initialType);
          setProjectId(preselectedProjectId || savedDraft.projectId || (projects[0]?.id || ''));
          setAmountStr(savedDraft.amountStr || '');
          setCategory(savedDraft.category || (savedDraft.type === 'expense' ? CONTRACTOR_EXPENSE_CATEGORIES[0] : CONTRACTOR_INCOME_CATEGORIES[0]));
          setPaymentMethod(savedDraft.paymentMethod || 'Bank');
          setPaymentStatus(savedDraft.paymentStatus || 'paid');
          setTransferToMethod(savedDraft.transferToMethod || 'Cash');
          setDate(savedDraft.date || new Date().toISOString().slice(0, 10));
          setDescription(savedDraft.description || '');
          setSupplierOrPayee(savedDraft.supplierOrPayee || '');
          setNotes(savedDraft.notes || '');
        } else {
          setType(initialType);
          setProjectId(preselectedProjectId || (projects[0]?.id || ''));
          setAmountStr('');
          setCategory(initialType === 'expense' ? CONTRACTOR_EXPENSE_CATEGORIES[0] : CONTRACTOR_INCOME_CATEGORIES[0]);
          setPaymentMethod('Bank');
          setPaymentStatus('paid');
          setTransferToMethod('Cash');
          setDate(new Date().toISOString().slice(0, 10));
          setDescription('');
          setSupplierOrPayee('');
          setNotes('');
        }
      });
    }
  }, [isOpen, editingTransaction, initialType, preselectedProjectId, projects]);

  const availableCategories =
    type === 'expense' ? CONTRACTOR_EXPENSE_CATEGORIES : CONTRACTOR_INCOME_CATEGORIES;

  const persistDraft = (partial: any) => {
    if (activeTxnId) return;
    autoSave.debouncedSave(draftKey, async () => {
      await autoSave.saveDraft(draftKey, {
        type,
        projectId,
        amountStr,
        category,
        paymentMethod,
        paymentStatus,
        transferToMethod,
        date,
        time,
        description,
        supplierOrPayee,
        notes,
        ...partial,
      });
    }, 250);
  };

  const handlePaymentStatusChange = (st: PaymentStatus) => {
    setPaymentStatus(st);
    if (activeTxnId) {
      autoSave.immediateSave(`txn_paystatus_${activeTxnId}`, async () => {
        await updateTransaction(activeTxnId, { paymentStatus: st });
      });
    } else {
      persistDraft({ paymentStatus: st });
    }
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    let newCat = category;
    if (newType === 'transfer') {
      newCat = 'Transfer';
    } else if (newType === 'income') {
      newCat = CONTRACTOR_INCOME_CATEGORIES[0];
    } else {
      newCat = CONTRACTOR_EXPENSE_CATEGORIES[0];
    }
    setCategory(newCat);

    if (activeTxnId) {
      updateTransaction(activeTxnId, { type: newType, category: newCat });
    } else {
      persistDraft({ type: newType, category: newCat });
    }
  };

  const handleAmountChange = (val: string) => {
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setAmountStr(val);
      const parsed = parseFloat(val) || 0;
      if (activeTxnId) {
        autoSave.immediateSave(`txn_amt_${activeTxnId}`, async () => {
          await updateTransaction(activeTxnId, { amount: parsed });
        });
      } else {
        persistDraft({ amountStr: val });
      }
    }
  };

  const handleProjectChange = (id: string) => {
    setProjectId(id);
    if (activeTxnId) {
      autoSave.immediateSave(`txn_proj_${activeTxnId}`, async () => {
        await updateTransaction(activeTxnId, { projectId: id });
      });
    } else {
      persistDraft({ projectId: id });
    }
  };

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    if (activeTxnId) {
      autoSave.immediateSave(`txn_cat_${activeTxnId}`, async () => {
        await updateTransaction(activeTxnId, { category: cat });
      });
    } else {
      persistDraft({ category: cat });
    }
  };

  const handleMethodChange = (m: PaymentMethod) => {
    setPaymentMethod(m);
    if (activeTxnId) {
      autoSave.immediateSave(`txn_method_${activeTxnId}`, async () => {
        await updateTransaction(activeTxnId, { paymentMethod: m });
      });
    } else {
      persistDraft({ paymentMethod: m });
    }
  };

  const handleTransferToChange = (m: PaymentMethod) => {
    setTransferToMethod(m);
    if (activeTxnId) {
      autoSave.immediateSave(`txn_tomethod_${activeTxnId}`, async () => {
        await updateTransaction(activeTxnId, { transferToMethod: m });
      });
    } else {
      persistDraft({ transferToMethod: m });
    }
  };

  const handleDateChange = (d: string) => {
    setDate(d);
    if (activeTxnId) {
      autoSave.immediateSave(`txn_date_${activeTxnId}`, async () => {
        await updateTransaction(activeTxnId, { date: d });
      });
    } else {
      persistDraft({ date: d });
    }
  };

  const handleDescriptionChange = (desc: string) => {
    setDescription(desc);
    if (activeTxnId) {
      autoSave.debouncedSave(`txn_desc_${activeTxnId}`, async () => {
        await updateTransaction(activeTxnId, { description: desc });
      }, 300);
    } else {
      persistDraft({ description: desc });
    }
  };

  const handleSupplierChange = (sup: string) => {
    setSupplierOrPayee(sup);
    if (activeTxnId) {
      autoSave.debouncedSave(`txn_sup_${activeTxnId}`, async () => {
        await updateTransaction(activeTxnId, { supplierOrPayee: sup });
      }, 300);
    } else {
      persistDraft({ supplierOrPayee: sup });
    }
  };

  const handleNotesChange = (n: string) => {
    setNotes(n);
    if (activeTxnId) {
      autoSave.debouncedSave(`txn_notes_${activeTxnId}`, async () => {
        await updateTransaction(activeTxnId, { notes: n });
      }, 300);
    } else {
      persistDraft({ notes: n });
    }
  };

  const handleCommitNew = async () => {
    if (isSubmitting) return;
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const selectedProject = projects.find((p) => p.id === projectId);
      const defaultDesc =
        type === 'transfer'
          ? `Transfer ${paymentMethod} → ${transferToMethod}`
          : selectedProject
          ? `${category} - ${selectedProject.name}`
          : category;

      await addTransaction({
        type,
        projectId: type === 'transfer' ? undefined : projectId,
        amount: numAmount,
        category: type === 'transfer' ? 'Transfer' : category,
        paymentMethod,
        paymentStatus: type === 'expense' ? paymentStatus : 'paid',
        transferToMethod: type === 'transfer' ? transferToMethod : undefined,
        date,
        time,
        description: description.trim() || defaultDesc,
        supplierOrPayee: supplierOrPayee.trim(),
        notes: notes.trim(),
      });

      await autoSave.clearDraft(draftKey);
      onClose();
    } catch (err) {
      console.error('Failed to commit transaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!activeTxnId) return;
    const confirmed = window.confirm('Are you sure you want to permanently delete this financial record?');
    if (confirmed) {
      await deleteTransaction(activeTxnId);
      onClose();
    }
  };

  if (!isOpen) return null;

  const numAmount = parseFloat(amountStr) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up transition-colors overflow-hidden">
        {/* Header */}
        <div className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {editingTransaction ? 'Edit Entry' : 'Record Contractor Money'}
            </h2>
            <AutoSaveStatus compact={true} />
          </div>

          <div className="flex items-center gap-1">
            {editingTransaction && (
              <button
                onClick={handleDelete}
                type="button"
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                title="Delete transaction"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Type Toggle: Income, Expense, Transfer */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              onClick={() => handleTypeChange('income')}
              type="button"
              className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>Income</span>
            </button>

            <button
              onClick={() => handleTypeChange('expense')}
              type="button"
              className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'expense'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>

            <button
              onClick={() => handleTypeChange('transfer')}
              type="button"
              className={`py-2 px-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>
          </div>

          {/* Amount Display */}
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Amount (₱)
            </label>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="text-2xl font-bold text-slate-400">₱</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                autoFocus={!editingTransaction}
                className="w-full text-center text-3xl font-extrabold text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder-slate-300 dark:placeholder-slate-700 font-mono tracking-tight"
              />
            </div>
          </div>

          {/* Project Selector (for income & expense) */}
          {type !== 'transfer' && (
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                <span>Link to Project</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">General Overhead / Non-Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.clientName})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Selector (for income & expense) */}
          {type !== 'transfer' && (
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Category</span>
                </span>
                <span className="text-[11px] text-slate-400 font-normal">Selected: {category}</span>
              </label>

              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {availableCategories.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      type="button"
                      className={`p-2 rounded-xl text-xs font-semibold text-left flex items-center justify-between border transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-bold ring-1 ring-amber-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          {type !== 'transfer' ? (
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Payment Account</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Cash', 'GCash', 'Bank'] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleMethodChange(m)}
                    type="button"
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      paymentMethod === m
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Transfers From -> To */
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Transfer From:</span>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['Cash', 'GCash', 'Bank'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleMethodChange(m)}
                      type="button"
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border ${
                        paymentMethod === m
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Transfer To:</span>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(['Cash', 'GCash', 'Bank'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => handleTransferToChange(m)}
                      disabled={m === paymentMethod}
                      type="button"
                      className={`py-1.5 px-2 rounded-xl text-xs font-bold border ${
                        transferToMethod === m
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                          : m === paymentMethod
                          ? 'opacity-40 border-dashed'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Payment Settlement Status for Expenses */}
          {type === 'expense' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Payment Settlement Status</span>
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                  }`}
                >
                  {paymentStatus === 'paid' ? 'Paid / Settled' : 'Unpaid / Payable'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePaymentStatusChange('paid')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border text-xs transition-all ${
                    paymentStatus === 'paid'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Paid Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePaymentStatusChange('unpaid')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border text-xs transition-all ${
                    paymentStatus === 'unpaid'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 shadow-xs ring-1 ring-amber-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Unpaid (Payable)</span>
                </button>
              </div>

              {paymentStatus === 'unpaid' && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-800">
                  💡 Recorded as project cost immediately, but will not deduct from your cash/bank balances until marked as paid.
                </p>
              )}
            </div>
          )}

          {/* Supplier or Payee (for Expenses) */}
          {type === 'expense' && (
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Supplier / Payee / Subcontractor (Optional)</span>
              </label>
              <input
                type="text"
                value={supplierOrPayee}
                onChange={(e) => handleSupplierChange(e.target.value)}
                placeholder="e.g., Wilcon Depot, Foreman Dante, Metro Rental"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          )}

          {/* Date */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Description / Item Detail</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder={
                type === 'income'
                  ? 'e.g., 30% Downpayment via BPI check'
                  : 'e.g., 50 bags cement, steel rebars, PVC pipes'
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
              Notes / Receipt # (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="e.g., Sales invoice #48102. Received by site engineer."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            {editingTransaction ? 'Edits auto-saved' : 'Draft auto-saved'}
          </span>

          {editingTransaction ? (
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleCommitNew}
              disabled={numAmount <= 0 || isSubmitting}
              type="button"
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-md ${
                numAmount > 0
                  ? type === 'income'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : type === 'expense'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Recording...' : `Record ${formatPeso(numAmount)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
