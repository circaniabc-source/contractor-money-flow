/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Main Application
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav, ContractorNavTab } from './components/BottomNav';
import { ContractorSetup } from './components/contractor/ContractorSetup';
import { ContractorDashboard } from './components/dashboard/ContractorDashboard';
import { ProjectList } from './components/projects/ProjectList';
import { ProjectDetails } from './components/projects/ProjectDetails';
import { ProjectModal } from './components/projects/ProjectModal';
import { ContractorTransactionModal } from './components/transactions/ContractorTransactionModal';
import { TransactionList } from './components/transactions/TransactionList';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { PinLockModal } from './components/PinLockModal';
import { ToastNotification } from './components/ToastNotification';
import { Project, Transaction, TransactionType } from './types';
import { Plus, Loader2 } from 'lucide-react';

function MainApp() {
  const {
    isLoading,
    storageRecoveryError,
    isSetupComplete,
    isPinLocked,
    projects,
    activeProject,
    setActiveProject,
  } = useApp();

  const [currentTab, setCurrentTab] = useState<ContractorNavTab>('dashboard');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Project Modal
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Transaction Modal
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [initialTxnType, setInitialTxnType] = useState<TransactionType>('income');
  const [preselectedProjectId, setPreselectedProjectId] = useState<string | undefined>(undefined);

  // Initial loading indicator
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <span className="text-xs font-bold tracking-wider uppercase text-slate-400">
          Loading Contractor Money Flow...
        </span>
      </div>
    );
  }

  if (storageRecoveryError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center text-white">
        <h1 className="text-lg font-extrabold">Backup recovery needs attention</h1>
        <p className="mt-3 max-w-sm text-sm text-slate-300">{storageRecoveryError}</p>
        <p className="mt-2 max-w-sm text-xs text-slate-400">Your project screens are paused to prevent new changes until the saved recovery snapshot can be applied.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Retry recovery</button>
      </div>
    );
  }

  // First-time onboarding setup
  if (!isSetupComplete) {
    return <ContractorSetup />;
  }

  // Transaction openers
  const openNewTransaction = (type: TransactionType = 'income', projId?: string) => {
    setEditingTxn(null);
    setInitialTxnType(type);
    setPreselectedProjectId(projId || activeProject?.id);
    setIsTxnModalOpen(true);
  };

  const openEditTransaction = (txn: Transaction) => {
    setEditingTxn(txn);
    setInitialTxnType(txn.type);
    setPreselectedProjectId(txn.projectId);
    setIsTxnModalOpen(true);
  };

  // Project openers
  const openNewProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const openEditProject = (proj: Project) => {
    setEditingProject(proj);
    setIsProjectModalOpen(true);
  };

  const activeProjectsCount = projects.filter((p) => p.status === 'Active').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 transition-colors">
      {/* Global Toast Notification */}
      <ToastNotification />

      {/* 4-digit PIN security lock if enabled */}
      {isPinLocked && <PinLockModal />}

      {/* App Header */}
      <Header onOpenProfile={() => setShowProfileModal(true)} />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-24">
        {currentTab === 'dashboard' && (
          <ContractorDashboard
            onOpenNewProject={openNewProject}
            onOpenAddIncome={() => openNewTransaction('income')}
            onOpenAddExpense={() => openNewTransaction('expense')}
            onViewProjects={() => {
              setActiveProject(null);
              setCurrentTab('projects');
            }}
            onSelectProject={(p) => {
              setActiveProject(p);
              setCurrentTab('projects');
            }}
            onSelectTransaction={openEditTransaction}
          />
        )}

        {currentTab === 'projects' && (
          <>
            {activeProject ? (
              <ProjectDetails
                project={activeProject}
                onBack={() => setActiveProject(null)}
                onEditProject={() => openEditProject(activeProject)}
                onAddIncomeForProject={(projId) => openNewTransaction('income', projId)}
                onAddExpenseForProject={(projId) => openNewTransaction('expense', projId)}
                onSelectTransaction={openEditTransaction}
              />
            ) : (
              <ProjectList
                onSelectProject={(p) => setActiveProject(p)}
                onOpenNewProject={openNewProject}
              />
            )}
          </>
        )}

        {currentTab === 'transactions' && (
          <TransactionList
            onEditTransaction={openEditTransaction}
            onOpenNewTransaction={() => openNewTransaction('income')}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView onOpenProModal={() => setCurrentTab('settings')} />
        )}

        {currentTab === 'settings' && (
          <SettingsView onOpenContractorSetup={() => setShowProfileModal(true)} />
        )}
      </main>

      {/* Floating Action Button (FAB) for fast mobile transaction entry */}
      <div className="fixed bottom-20 right-4 z-20 sm:right-[max(1rem,calc(50%-13rem))]">
        <button
          onClick={() => openNewTransaction('income', activeProject?.id)}
          type="button"
          className="w-13 h-13 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black shadow-lg shadow-amber-500/30 flex items-center justify-center transition-all"
          title="Record Money Flow"
          aria-label="Record Money Flow"
        >
          <Plus className="w-7 h-7 stroke-[3]" />
        </button>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab !== 'projects') {
            setActiveProject(null);
          }
          setCurrentTab(tab);
        }}
        activeProjectsCount={activeProjectsCount}
      />

      {/* Transaction Entry Modal */}
      <ContractorTransactionModal
        isOpen={isTxnModalOpen}
        onClose={() => setIsTxnModalOpen(false)}
        editingTransaction={editingTxn}
        initialType={initialTxnType}
        preselectedProjectId={preselectedProjectId}
      />

      {/* Project Create / Edit Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        editingProject={editingProject}
      />

      {/* Contractor Profile Setup Modal */}
      {showProfileModal && (
        <ContractorSetup
          isModal={true}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
