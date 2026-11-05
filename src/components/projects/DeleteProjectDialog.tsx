/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Delete Project Confirmation Dialog
 * Foolproof confirmation dialog to prevent accidental deletion and handle linked records.
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Project } from '../../types';
import { formatPeso } from '../../services/categories';
import { AlertTriangle, Trash2, X, Briefcase, FileText, Loader2 } from 'lucide-react';

interface DeleteProjectDialogProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export const DeleteProjectDialog: React.FC<DeleteProjectDialogProps> = ({
  isOpen,
  project,
  onClose,
  onDeleted,
}) => {
  const { deleteProject, transactions, getProjectSummary } = useApp();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !project) return null;

  // Find all transactions tied to this project
  const linkedTransactions = transactions.filter((t) => t.projectId === project.id);
  const summary = getProjectSummary(project.id);

  const totalLinkedAmount = linkedTransactions.reduce((acc, t) => acc + t.amount, 0);

  const handleConfirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      setIsDeleting(false);
      onClose();
      if (onDeleted) {
        onDeleted();
      }
    } catch (err) {
      setIsDeleting(false);
      console.error('Error in handleConfirmDelete:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-scale-up"
        role="alertdialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-desc"
      >
        {/* Warning Icon & Header */}
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
          </div>

          <button
            onClick={onClose}
            disabled={isDeleting}
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors"
            aria-label="Cancel and close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Title */}
        <div>
          <h2 id="dialog-title" className="text-base font-black text-slate-900 dark:text-white">
            Delete Project?
          </h2>
          <p id="dialog-desc" className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            This action cannot be undone. All data will be permanently removed.
          </p>
        </div>

        {/* Selected Project Card (Prevents accidental wrong project deletion) */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block truncate">
                {project.projectType}
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                {project.name}
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex-shrink-0">
              {project.status}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Client: <strong className="text-slate-800 dark:text-slate-200">{project.clientName}</strong>
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">
              {formatPeso(project.contractAmount)}
            </span>
          </div>
        </div>

        {/* Linked Records Warning & Breakdown (Requirement 3) */}
        {linkedTransactions.length > 0 ? (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200/80 dark:border-rose-900/60 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold text-xs">
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{linkedTransactions.length} Linked Financial Record(s)</span>
            </div>
            <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">
              This project has <strong>{linkedTransactions.length} recorded transaction(s)</strong> totaling <strong>{formatPeso(totalLinkedAmount)}</strong> (including {formatPeso(summary.totalCollections)} collected and {formatPeso(summary.totalExpenses)} in expenses).
            </p>
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
              ⚠️ Deleting this project will also delete all its associated transactions to prevent orphaned records.
            </p>
          </div>
        ) : (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/50 text-[11px] text-emerald-800 dark:text-emerald-300">
            ✓ No financial records are linked to this project. It will be removed cleanly.
          </div>
        )}

        {/* Action Buttons (Requirement 1, 5, 6) */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleConfirmDelete}
            disabled={isDeleting}
            type="button"
            className="w-full py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-extrabold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Permanently Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 stroke-[2.5]" />
                <span>Delete Project Permanently</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            disabled={isDeleting}
            type="button"
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
          >
            Cancel (Keep Project)
          </button>
        </div>
      </div>
    </div>
  );
};
