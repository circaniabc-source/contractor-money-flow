/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Application State & Real-time Auto-Save Context
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  ContractorProfile,
  Project,
  Transaction,
  PaymentMethod,
  PaymentStatus,
  AppSettings,
  ProjectFinancialSummary,
} from '../types';
import { db } from '../services/storage';
import { autoSave, SaveStatus } from '../services/autoSave';
import { getSampleContractorData } from '../services/sampleData';

interface AppContextType {
  isLoading: boolean;
  storageRecoveryError: string | null;
  saveStatus: SaveStatus;
  lastSavedAt: Date;

  // Contractor Profile
  profile: ContractorProfile;
  updateProfile: (updates: Partial<ContractorProfile>) => void;
  isSetupComplete: boolean;

  // Projects
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (p: Project | null) => void;
  addProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<{ success: boolean; deletedProjectName?: string; removedCount: number }>;
  getProjectSummary: (projectId: string) => ProjectFinancialSummary;

  // Feedback Toasts
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  hideToast: () => void;

  // Transactions
  transactions: Transaction[];
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  markTransactionPaid: (id: string, method?: PaymentMethod) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Balances & Dashboard Metrics
  balances: {
    cash: number;
    gcash: number;
    bank: number;
    totalAvailableCash: number;
  };
  dashboardMetrics: {
    activeProjectsCount: number;
    totalContractAmount: number;
    totalCollections: number;
    totalProjectExpenses: number;
    paidExpenses: number;
    unpaidExpenses: number;
    outstandingClientPayments: number;
    availableBusinessCash: number;
    estimatedProjectProfit: number;
    actualProjectProfit: number;
  };

  // Settings & Security
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  isPinLocked: boolean;
  unlockWithPin: (pin: string) => boolean;
  lockApp: () => void;

  // Demo / Reset
  loadDemoData: () => Promise<void>;
  clearAllAppData: () => Promise<void>;
}

const defaultProfile: ContractorProfile = {
  id: 'contractor_profile_1',
  businessName: '',
  contractorTypes: ['General Contractor'],
  ownerName: '',
  openingCashBalance: 0,
  openingGcashBalance: 0,
  openingBankBalance: 0,
  isSetupComplete: false,
  updatedAt: Date.now(),
};

const defaultSettings: AppSettings = {
  theme: 'light',
  currency: 'PHP',
  pinLockEnabled: false,
  pinCode: '',
  isProUser: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [storageRecoveryError, setStorageRecoveryError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date>(new Date());

  const [profile, setProfile] = useState<ContractorProfile>(defaultProfile);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isPinLocked, setIsPinLocked] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Subscribe to auto-save status changes
  useEffect(() => {
    return autoSave.subscribe((status, date) => {
      setSaveStatus(status);
      if (date) setLastSavedAt(date);
    });
  }, []);

  // Sync theme with HTML class
  useEffect(() => {
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Load from local database
  useEffect(() => {
    async function loadInitialData() {
      try {
        try {
          await db.recoverInterruptedRestore();
        } catch (recoveryError) {
          setStorageRecoveryError(recoveryError instanceof Error ? recoveryError.message : 'Backup recovery could not finish.');
          throw recoveryError;
        }
        const storedProfile = await db.get<ContractorProfile>('contractor_profile', 'contractor_profile_1');
        const storedSettings = await db.get<AppSettings>('keyval', 'app_settings');
        const storedProjects = await db.getAll<Project>('projects');
        const storedTxns = await db.getAll<Transaction>('transactions');

        if (storedProfile) {
          setProfile(storedProfile);
        }
        if (storedSettings) {
          const cfg = (storedSettings as any).value || storedSettings;
          setSettings(cfg);
          if (cfg.pinLockEnabled && cfg.pinCode) {
            setIsPinLocked(true);
          }
        }
        if (storedProjects && storedProjects.length > 0) {
          storedProjects.sort((a, b) => b.createdAt - a.createdAt);
          setProjects(storedProjects);
        }
        if (storedTxns && storedTxns.length > 0) {
          storedTxns.sort(
            (a, b) =>
              (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')) ||
              b.createdAt - a.createdAt
          );
          setTransactions(storedTxns);
        }
      } catch (err) {
        console.error('Failed to initialize local contractor database:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // Profile update with real-time auto-save
  const updateProfile = useCallback((updates: Partial<ContractorProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...updates, updatedAt: Date.now() };
      autoSave.debouncedSave(
        'contractor_profile',
        async () => {
          await db.put('contractor_profile', updated);
        },
        250
      );
      return updated;
    });
  }, []);

  // Add project with immediate persistent auto-save
  const addProject = useCallback(
    async (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
      const newProj: Project = {
        ...data,
        id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setProjects((prev) => [newProj, ...prev]);

      await autoSave.immediateSave(`proj_add_${newProj.id}`, async () => {
        await db.put('projects', newProj);
      });

      return newProj;
    },
    []
  );

  // Update project with auto-save
  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>) => {
      let updatedProj: Project | null = null;
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === id) {
            updatedProj = { ...p, ...updates, updatedAt: Date.now() };
            return updatedProj;
          }
          return p;
        })
      );

      if (activeProject && activeProject.id === id && updatedProj) {
        setActiveProject(updatedProj);
      }

      if (updatedProj) {
        autoSave.debouncedSave(
          `proj_update_${id}`,
          async () => {
            if (updatedProj) await db.put('projects', updatedProj);
          },
          200
        );
      }
    },
    [activeProject]
  );

  // Archive project
  const archiveProject = useCallback(
    async (id: string) => {
      await updateProject(id, { status: 'Archived' });
    },
    [updateProject]
  );

  // Restore project
  const restoreProject = useCallback(
    async (id: string) => {
      await updateProject(id, { status: 'Active' });
    },
    [updateProject]
  );

  // Delete project and permanently remove all linked records (transactions, materials, labor)
  const deleteProject = useCallback(
    async (id: string): Promise<{ success: boolean; deletedProjectName?: string; removedCount: number }> => {
      try {
        const targetProj = projects.find((p) => p.id === id);
        const projectName = targetProj?.name || 'Project';

        // 1. Identify all transactions linked to this project
        const linkedTxns = transactions.filter((t) => t.projectId === id);
        const removedCount = linkedTxns.length;

        // 2. Remove all linked transactions from active state immediately
        setTransactions((prev) => prev.filter((t) => t.projectId !== id));

        // 3. Remove project from projects state immediately
        setProjects((prev) => prev.filter((p) => p.id !== id));

        // 4. Reset activeProject if it was the deleted project
        if (activeProject?.id === id) {
          setActiveProject(null);
        }

        // 5. Delete project and all linked records from persistent IndexedDB and localStorage
        await autoSave.immediateSave(`proj_del_${id}`, async () => {
          // Delete project
          await db.delete('projects', id);

          // Delete all linked transactions in database
          for (const tx of linkedTxns) {
            await db.delete('transactions', tx.id);
          }

          // Delete any linked labor entries
          try {
            const labors = await db.getAll<any>('labor_entries');
            for (const l of labors) {
              if (l.projectId === id) {
                await db.delete('labor_entries', l.id);
              }
            }
          } catch (e) {
            // Ignore optional secondary store errors
          }

          // Delete any linked material entries
          try {
            const materials = await db.getAll<any>('material_entries');
            for (const m of materials) {
              if (m.projectId === id) {
                await db.delete('material_entries', m.id);
              }
            }
          } catch (e) {
            // Ignore optional secondary store errors
          }

          // Clean up any drafts for this project
          try {
            await autoSave.clearDraft(`draft_project_${id}`);
          } catch (e) {
            // Ignore
          }
        });

        showToast(`Project "${projectName}" and ${removedCount} linked record${removedCount === 1 ? '' : 's'} were permanently deleted.`, 'success');
        return { success: true, deletedProjectName: projectName, removedCount };
      } catch (err: any) {
        console.error('Failed to delete project:', err);
        showToast(`Failed to delete project: ${err?.message || 'Unknown error'}`, 'error');
        throw err;
      }
    },
    [projects, transactions, activeProject, showToast]
  );

  // Add transaction with duplicate protection and immediate auto-save
  const addTransaction = useCallback(
    async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> => {
      const newTxn: Transaction = {
        ...data,
        paymentStatus: data.paymentStatus || 'paid',
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setTransactions((prev) => [newTxn, ...prev]);

      await autoSave.immediateSave(`txn_add_${newTxn.id}`, async () => {
        await db.put('transactions', newTxn);
      });

      return newTxn;
    },
    []
  );

  // Update transaction with auto-save
  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    let updatedTxn: Transaction | null = null;
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          updatedTxn = { ...t, ...updates, updatedAt: Date.now() };
          return updatedTxn;
        }
        return t;
      })
    );

    if (updatedTxn) {
      autoSave.debouncedSave(
        `txn_update_${id}`,
        async () => {
          if (updatedTxn) await db.put('transactions', updatedTxn);
        },
        200
      );
    }
  }, []);

  // Quick helper to mark an unpaid expense as paid
  const markTransactionPaid = useCallback(
    async (id: string, method?: PaymentMethod) => {
      const updates: Partial<Transaction> = { paymentStatus: 'paid' };
      if (method) updates.paymentMethod = method;
      await updateTransaction(id, updates);
    },
    [updateTransaction]
  );

  // Delete transaction with confirmation
  const deleteTransaction = useCallback(async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await autoSave.immediateSave(`txn_del_${id}`, async () => {
      await db.delete('transactions', id);
    });
  }, []);

  // Settings update
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...updates };
      autoSave.debouncedSave(
        'settings',
        async () => {
          await db.put('keyval', { id: 'app_settings', value: updated });
        },
        100
      );
      return updated;
    });
  }, []);

  // PIN security
  const unlockWithPin = useCallback(
    (pin: string) => {
      if (settings.pinCode === pin) {
        setIsPinLocked(false);
        return true;
      }
      return false;
    },
    [settings.pinCode]
  );

  const lockApp = useCallback(() => {
    if (settings.pinLockEnabled) {
      setIsPinLocked(true);
    }
  }, [settings.pinLockEnabled]);

  // Load sample data
  const loadDemoData = useCallback(async () => {
    autoSave.setStatus('saving');
    const demo = getSampleContractorData();

    setProfile(demo.profile);
    setProjects(demo.projects);
    setTransactions(demo.transactions);

    await db.put('contractor_profile', demo.profile);
    for (const p of demo.projects) {
      await db.put('projects', p);
    }
    for (const t of demo.transactions) {
      await db.put('transactions', t);
    }

    autoSave.setStatus('saved');
  }, []);

  // Clear all data
  const clearAllAppData = useCallback(async () => {
    await db.clearAllData();
    setProjects([]);
    setTransactions([]);
    setActiveProject(null);
    setProfile(defaultProfile);
  }, []);

  // FINANCIAL CALCULATIONS:
  // Available Business Cash = Opening Balances + Cash Inflows - Cash Outflows
  // Unpaid expenses do NOT reduce available cash until paid!
  // Transfers between payment methods do NOT change total available cash
  const balances = useMemo(() => {
    let cash = Number(profile.openingCashBalance) || 0;
    let gcash = Number(profile.openingGcashBalance) || 0;
    let bank = Number(profile.openingBankBalance) || 0;

    transactions.forEach((t) => {
      const amount = Number(t.amount) || 0;
      if (t.type === 'income') {
        if (t.paymentMethod === 'Cash') cash += amount;
        else if (t.paymentMethod === 'GCash') gcash += amount;
        else if (t.paymentMethod === 'Bank') bank += amount;
      } else if (t.type === 'expense') {
        // Only deduct from register balances if the expense has actually been paid!
        if (t.paymentStatus !== 'unpaid') {
          if (t.paymentMethod === 'Cash') cash -= amount;
          else if (t.paymentMethod === 'GCash') gcash -= amount;
          else if (t.paymentMethod === 'Bank') bank -= amount;
        }
      } else if (t.type === 'transfer' && t.transferToMethod) {
        if (t.paymentMethod === 'Cash') cash -= amount;
        else if (t.paymentMethod === 'GCash') gcash -= amount;
        else if (t.paymentMethod === 'Bank') bank -= amount;

        if (t.transferToMethod === 'Cash') cash += amount;
        else if (t.transferToMethod === 'GCash') gcash += amount;
        else if (t.transferToMethod === 'Bank') bank += amount;
      }
    });

    return {
      cash,
      gcash,
      bank,
      totalAvailableCash: cash + gcash + bank,
    };
  }, [profile, transactions]);

  // Overall Contractor Dashboard Metrics
  const dashboardMetrics = useMemo(() => {
    const activeProjects = projects.filter((p) => p.status === 'Active');
    const activeProjectsCount = activeProjects.length;

    // Total contract amount of all non-archived projects
    const nonArchivedProjects = projects.filter((p) => p.status !== 'Archived');
    const totalContractAmount = nonArchivedProjects.reduce(
      (sum, p) => sum + (Number(p.contractAmount) || 0),
      0
    );

    const totalEstimatedCost = nonArchivedProjects.reduce(
      (sum, p) => sum + (Number(p.estimatedBudget) || 0),
      0
    );

    let totalCollections = 0;
    let totalProjectExpenses = 0;
    let paidExpenses = 0;
    let unpaidExpenses = 0;

    transactions.forEach((t) => {
      const amount = Number(t.amount) || 0;
      if (t.type === 'income' && !t.isEquityOrLoan) {
        totalCollections += amount;
      } else if (t.type === 'expense') {
        totalProjectExpenses += amount;
        if (t.paymentStatus === 'unpaid') {
          unpaidExpenses += amount;
        } else {
          paidExpenses += amount;
        }
      }
    });

    // Outstanding Client Balance = Contract Amount - Total Collections
    const outstandingClientPayments = Math.max(0, totalContractAmount - totalCollections);
    const estimatedProjectProfit = totalContractAmount - totalEstimatedCost;
    const actualProjectProfit = totalCollections - totalProjectExpenses;

    return {
      activeProjectsCount,
      totalContractAmount,
      totalCollections,
      totalProjectExpenses,
      paidExpenses,
      unpaidExpenses,
      outstandingClientPayments,
      availableBusinessCash: balances.totalAvailableCash,
      estimatedProjectProfit,
      actualProjectProfit,
    };
  }, [projects, transactions, balances]);

  // Per-project financial summary calculation
  const getProjectSummary = useCallback(
    (projectId: string): ProjectFinancialSummary => {
      const proj = projects.find((p) => p.id === projectId);
      const contractAmount = proj ? Number(proj.contractAmount) || 0 : 0;
      const estimatedProjectCost = proj ? Number(proj.estimatedBudget) || 0 : 0;

      let totalCollections = 0;
      let totalExpenses = 0;
      let paidExpenses = 0;
      let unpaidExpenses = 0;

      transactions.forEach((t) => {
        if (t.projectId === projectId) {
          const amount = Number(t.amount) || 0;
          if (t.type === 'income' && !t.isEquityOrLoan) {
            totalCollections += amount;
          } else if (t.type === 'expense') {
            totalExpenses += amount;
            if (t.paymentStatus === 'unpaid') {
              unpaidExpenses += amount;
            } else {
              paidExpenses += amount;
            }
          }
        }
      });

      const remainingClientBalance = Math.max(0, contractAmount - totalCollections);
      const actualProjectCost = totalExpenses;
      const estimatedProjectProfit = contractAmount - estimatedProjectCost;
      const actualProjectProfit = totalCollections - actualProjectCost;

      return {
        contractAmount,
        totalCollections,
        totalExpenses,
        paidExpenses,
        unpaidExpenses,
        remainingClientBalance,
        estimatedProjectCost,
        actualProjectCost,
        estimatedProjectProfit,
        actualProjectProfit,
      };
    },
    [projects, transactions]
  );

  return (
    <AppContext.Provider
      value={{
        isLoading,
        storageRecoveryError,
        saveStatus,
        lastSavedAt,
        profile,
        updateProfile,
        isSetupComplete: Boolean(profile.businessName.trim() && profile.isSetupComplete),
        projects,
        activeProject,
        setActiveProject,
        addProject,
        updateProject,
        archiveProject,
        restoreProject,
        deleteProject,
        getProjectSummary,
        toast,
        showToast,
        hideToast,
        transactions,
        addTransaction,
        updateTransaction,
        markTransactionPaid,
        deleteTransaction,
        balances,
        dashboardMetrics,
        settings,
        updateSettings,
        isPinLocked,
        unlockWithPin,
        lockApp,
        loadDemoData,
        clearAllAppData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
