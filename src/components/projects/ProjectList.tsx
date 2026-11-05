/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Project List & Management
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Project, ProjectStatus } from '../../types';
import { formatPeso } from '../../services/categories';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import {
  Briefcase,
  Search,
  Plus,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Filter,
  Trash2,
} from 'lucide-react';

interface ProjectListProps {
  onSelectProject: (p: Project) => void;
  onOpenNewProject: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  onSelectProject,
  onOpenNewProject,
}) => {
  const { projects, getProjectSummary } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'All' && p.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesClient = p.clientName.toLowerCase().includes(q);
        const matchesType = p.projectType.toLowerCase().includes(q);
        if (!matchesName && !matchesClient && !matchesType) return false;
      }
      return true;
    });
  }, [projects, statusFilter, searchQuery]);

  return (
    <div className="space-y-4 pb-20">
      {/* Search & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Contractor Projects
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Track contract amounts, billing, and costs per project
            </p>
          </div>

          <button
            onClick={onOpenNewProject}
            type="button"
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Project</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project name, client, or specialty..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 border border-slate-200 dark:border-slate-700"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {['All', 'Active', 'Completed', 'On Hold', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              type="button"
              className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all text-[11px] ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-800">
          <Briefcase className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
            No projects found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {searchQuery || statusFilter !== 'All'
              ? 'Try adjusting your search query or status filter.'
              : 'Add your first contracting project to track client billings, labor, and materials.'}
          </p>
          <button
            onClick={onOpenNewProject}
            type="button"
            className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-600 shadow-md shadow-amber-500/20"
          >
            + Create New Project
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((p) => {
            const summary = getProjectSummary(p.id);
            const percentCollected =
              summary.contractAmount > 0
                ? Math.min(100, Math.round((summary.totalCollections / summary.contractAmount) * 100))
                : 0;

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/60 shadow-xs cursor-pointer transition-all space-y-3 group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors truncate">
                        {p.name}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      Client: <span className="font-semibold text-slate-700 dark:text-slate-300">{p.clientName}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : p.status === 'Completed'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {p.status}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(p);
                      }}
                      type="button"
                      className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors opacity-70 group-hover:opacity-100"
                      title={`Delete "${p.name}"`}
                      aria-label={`Delete "${p.name}"`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Key Numbers Grid */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800/80 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Contract</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-xs mt-0.5 block truncate">
                      {formatPeso(summary.contractAmount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Collected</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5 block truncate">
                      {formatPeso(summary.totalCollections)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Expenses</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs mt-0.5 block truncate">
                      {formatPeso(summary.totalExpenses)}
                    </span>
                  </div>
                </div>

                {/* Collections Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      Collections Progress: <strong className="text-slate-700 dark:text-slate-300">{percentCollected}%</strong>
                    </span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                      Unpaid: {formatPeso(summary.remainingClientBalance)}
                    </span>
                  </div>

                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percentCollected}%` }}
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Bottom Specialty & Action */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[10px] font-medium text-slate-400 truncate max-w-[200px]">
                    {p.projectType}
                  </span>
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                    <span>View Financials</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Project Confirmation Dialog */}
      <DeleteProjectDialog
        isOpen={Boolean(projectToDelete)}
        project={projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onDeleted={() => setProjectToDelete(null)}
      />
    </div>
  );
};
