/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Domain Types
 */

export type PaymentMethod = 'Cash' | 'GCash' | 'Bank';

export type TransactionType = 'income' | 'expense' | 'transfer';

export type ProjectStatus = 'Active' | 'Completed' | 'On Hold' | 'Archived' | 'Cancelled';

export type PaymentStatus = 'paid' | 'unpaid';

export const MAX_FREE_ACTIVE_PROJECTS = 3;

export interface ContractorProfile {
  id: string;
  businessName: string;
  contractorTypes: string[]; // Multiple trade specialties: General, Electrical, Plumbing, etc.
  ownerName?: string;
  openingCashBalance: number;
  openingGcashBalance: number;
  openingBankBalance: number;
  isSetupComplete: boolean;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  projectType: string;
  contractAmount: number;
  estimatedBudget: number;
  startDate: string;
  targetCompletionDate: string;
  status: ProjectStatus;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  projectId?: string; // Empty or undefined for general overhead / business transactions
  type: TransactionType;
  amount: number;
  category: string;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus; // 'paid' (default) or 'unpaid' for payables
  date: string; // YYYY-MM-DD
  time?: string;
  description: string;
  supplierOrPayee?: string;
  notes?: string;
  transferToMethod?: PaymentMethod; // Only for transfer type
  isEquityOrLoan?: boolean; // Capital injection or loan received (not revenue)
  createdAt: number;
  updatedAt: number;
}

export interface LaborItem {
  id: string;
  projectId: string;
  workerName: string;
  dailyRate: number;
  daysWorked: number;
  totalAmount: number;
  amountPaid: number;
  remainingUnpaid: number;
  date: string;
  notes?: string;
  updatedAt: number;
}

export interface MaterialItem {
  id: string;
  projectId: string;
  materialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  supplier?: string;
  datePurchased: string;
  notes?: string;
  updatedAt: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  pinLockEnabled: boolean;
  pinCode?: string;
  isProUser: boolean;
  lastBackupDate?: string;
}

export interface ProjectFinancialSummary {
  contractAmount: number;
  totalCollections: number;
  totalExpenses: number;
  paidExpenses: number;
  unpaidExpenses: number;
  remainingClientBalance: number;
  estimatedProjectCost: number;
  actualProjectCost: number;
  estimatedProjectProfit: number;
  actualProjectProfit: number;
}
