/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Create / Edit Project Modal
 * Automatically saves all fields in real-time without requiring a save button.
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Project, ProjectStatus, MAX_FREE_ACTIVE_PROJECTS } from '../../types';
import { CONTRACTOR_TYPES, formatPeso } from '../../services/categories';
import { autoSave } from '../../services/autoSave';
import { AutoSaveStatus } from '../AutoSaveStatus';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import {
  X,
  Briefcase,
  User,
  Calendar,
  Coins,
  FileText,
  Trash2,
  Check,
  Tag,
  AlertCircle,
} from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProject?: Project | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  editingProject,
}) => {
  const { addProject, updateProject, deleteProject, profile, projects, settings } = useApp();

  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectType, setProjectType] = useState(
    profile.contractorTypes?.[0] || 'General Contractor'
  );
  const [contractAmountStr, setContractAmountStr] = useState('');
  const [estimatedBudgetStr, setEstimatedBudgetStr] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<ProjectStatus>('Active');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const activeCount = projects.filter(
    (p) => p.status === 'Active' && (!editingProject || p.id !== editingProject.id)
  ).length;
  const isAtActiveLimit = !settings.isProUser && status === 'Active' && activeCount >= MAX_FREE_ACTIVE_PROJECTS;

  const draftKey = 'draft_project';

  useEffect(() => {
    if (!isOpen) return;

    if (editingProject) {
      setName(editingProject.name);
      setClientName(editingProject.clientName);
      setProjectType(editingProject.projectType);
      setContractAmountStr(editingProject.contractAmount ? editingProject.contractAmount.toString() : '');
      setEstimatedBudgetStr(editingProject.estimatedBudget ? editingProject.estimatedBudget.toString() : '');
      setStartDate(editingProject.startDate);
      setTargetCompletionDate(editingProject.targetCompletionDate);
      setStatus(editingProject.status);
      setNotes(editingProject.notes || '');
    } else {
      // Check for incomplete draft
      autoSave.getDraft<any>(draftKey).then((draft) => {
        if (draft) {
          setName(draft.name || '');
          setClientName(draft.clientName || '');
          setProjectType(draft.projectType || profile.contractorTypes?.[0] || 'General Contractor');
          setContractAmountStr(draft.contractAmountStr || '');
          setEstimatedBudgetStr(draft.estimatedBudgetStr || '');
          setStartDate(draft.startDate || new Date().toISOString().slice(0, 10));
          setTargetCompletionDate(draft.targetCompletionDate || new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10));
          setStatus(draft.status || 'Active');
          setNotes(draft.notes || '');
        } else {
          setName('');
          setClientName('');
          setProjectType(profile.contractorTypes?.[0] || 'General Contractor');
          setContractAmountStr('');
          setEstimatedBudgetStr('');
          setStartDate(new Date().toISOString().slice(0, 10));
          setTargetCompletionDate(new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10));
          setStatus('Active');
          setNotes('');
        }
      });
    }
  }, [isOpen, editingProject, profile]);

  const persistDraft = (partial: any) => {
    if (editingProject) return;
    autoSave.debouncedSave(draftKey, async () => {
      await autoSave.saveDraft(draftKey, {
        name,
        clientName,
        projectType,
        contractAmountStr,
        estimatedBudgetStr,
        startDate,
        targetCompletionDate,
        status,
        notes,
        ...partial,
      });
    }, 250);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (editingProject) {
      autoSave.debouncedSave(`proj_name_${editingProject.id}`, async () => {
        await updateProject(editingProject.id, { name: val });
      }, 300);
    } else {
      persistDraft({ name: val });
    }
  };

  const handleClientChange = (val: string) => {
    setClientName(val);
    if (editingProject) {
      autoSave.debouncedSave(`proj_client_${editingProject.id}`, async () => {
        await updateProject(editingProject.id, { clientName: val });
      }, 300);
    } else {
      persistDraft({ clientName: val });
    }
  };

  const handleTypeChange = (val: string) => {
    setProjectType(val);
    if (editingProject) {
      autoSave.immediateSave(`proj_type_${editingProject.id}`, async () => {
        await updateProject(editingProject.id, { projectType: val });
      });
    } else {
      persistDraft({ projectType: val });
    }
  };

  const handleContractAmountChange = (val: string) => {
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setContractAmountStr(val);
      const parsed = parseFloat(val) || 0;
      if (editingProject) {
        autoSave.immediateSave(`proj_contract_${editingProject.id}`, async () => {
          await updateProject(editingProject.id, { contractAmount: parsed });
        });
      } else {
        persistDraft({ contractAmountStr: val });
      }
    }
  };

  const handleEstimatedBudgetChange = (val: string) => {
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setEstimatedBudgetStr(val);
      const parsed = parseFloat(val) || 0;
      if (editingProject) {
        autoSave.immediateSave(`proj_budget_${editingProject.id}`, async () => {
          await updateProject(editingProject.id, { estimatedBudget: parsed });
        });
      } else {
        persistDraft({ estimatedBudgetStr: val });
      }
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (editingProject) {
      autoSave.immediateSave(`proj_start_${editingProject.id}`, async () => {
        await updateProject(editingProject.id, { startDate: val });
      });
    } else {
      persistDraft({ startDate: val });
    }
  };

  const handleTargetDateChange = (val: string) => {
    setTargetCompletionDate(val);
    if (editingProject) {
      autoSave.immediateSave(`proj_target_${editingProject.id}`, async () => {
        await updateProject(editingProject.id, { targetCompletionDate: val });
      });
    } else {
      persistDraft({ targetCompletionDate: val });
    }
  };

  const handleStatusChange = (val: ProjectStatus) => {
    setStatus(val);
    if (editingProject) {
      autoSave.immediateSave(`proj_status_${editingProject.id}`, async () => {
        await updateProject(editingProject.id, { status: val });
      });
    } else {
      persistDraft({ status: val });
    }
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (editingProject) {
      autoSave.debouncedSave(`proj_notes_${editingProject.id}`, async () => {
        await updateProject(editingProject.id, { notes: val });
      }, 300);
    } else {
      persistDraft({ notes: val });
    }
  };

  // Commit new project creation
  const handleCommitNewProject = async () => {
    if (isSubmitting) return;
    const finalName = name.trim();
    if (!finalName) return;
    if (isAtActiveLimit) return;

    setIsSubmitting(true);
    try {
      await addProject({
        name: finalName,
        clientName: clientName.trim() || 'Direct Client',
        projectType,
        contractAmount: parseFloat(contractAmountStr) || 0,
        estimatedBudget: parseFloat(estimatedBudgetStr) || 0,
        startDate,
        targetCompletionDate,
        status,
        notes: notes.trim(),
      });

      await autoSave.clearDraft(draftKey);
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!editingProject) return;
    setShowDeleteDialog(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-slide-up transition-colors overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {editingProject ? 'Edit Project Scope' : 'Create New Project'}
            </h2>
            <AutoSaveStatus compact={true} />
          </div>

          <div className="flex items-center gap-1">
            {editingProject && (
              <button
                onClick={handleDelete}
                type="button"
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                title="Delete project"
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

        {/* Scrollable Form */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
          {/* Project Name */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-amber-500" />
              <span>Project Name</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Makati Residential Rewiring & Tiling"
              autoFocus={!editingProject}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Client Name */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Client / Owner Name</span>
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => handleClientChange(e.target.value)}
              placeholder="e.g., Mr. Alfonso Zobel"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Project Type */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 block">
              Contractor Specialty
            </label>
            <select
              value={projectType}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {CONTRACTOR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Contract Amount & Estimated Budget */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-emerald-500" />
                <span>Contract Amount (₱)</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={contractAmountStr}
                onChange={(e) => handleContractAmountChange(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Total agreed price</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-rose-500" />
                <span>Estimated Budget (₱)</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={estimatedBudgetStr}
                onChange={(e) => handleEstimatedBudgetChange(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Estimated total costs</span>
            </div>
          </div>

          {/* Status Segmented Buttons */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Project Status
            </label>
            <div className="grid grid-cols-5 gap-1">
              {(['Active', 'Completed', 'On Hold', 'Archived', 'Cancelled'] as ProjectStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  type="button"
                  className={`py-1.5 px-1 rounded-xl text-center text-[10px] font-bold border transition-all truncate ${
                    status === s
                      ? s === 'Active'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : s === 'Completed'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                        : s === 'Archived'
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                        : 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {isAtActiveLimit && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl space-y-1.5 mt-2">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Free Plan Limit: 3 Active Projects</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  You currently have {activeCount} active projects. You can archive or complete an older project, or set this project to <strong>On Hold</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => handleStatusChange('On Hold')}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] rounded-lg shadow-xs"
                >
                  Set to "On Hold"
                </button>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Start Date</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Target Completion</span>
              </label>
              <input
                type="date"
                value={targetCompletionDate}
                onChange={(e) => handleTargetDateChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Project Notes / Scope (Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="e.g., Includes supply and installation of 1.5HP inverter AC, panel upgrades, and repainting."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            {editingProject ? 'Edits auto-save immediately' : 'Draft auto-saved'}
          </span>

          {editingProject ? (
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleCommitNewProject}
              disabled={!name.trim() || isSubmitting || isAtActiveLimit}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/20"
            >
              {isSubmitting ? 'Creating...' : isAtActiveLimit ? 'Active Limit Reached' : 'Create Project'}
            </button>
          )}
        </div>
      </div>

      {/* Delete Project Confirmation Dialog */}
      <DeleteProjectDialog
        isOpen={showDeleteDialog}
        project={editingProject || null}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={() => {
          setShowDeleteDialog(false);
          onClose();
        }}
      />
    </div>
  );
};
