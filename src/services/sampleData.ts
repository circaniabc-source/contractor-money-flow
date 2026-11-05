/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Realistic Contractor Sample Data for Demo
 */

import { ContractorProfile, Project, Transaction } from '../types';

export function getSampleContractorData(): {
  profile: ContractorProfile;
  projects: Project[];
  transactions: Transaction[];
} {
  const today = new Date().toISOString().slice(0, 10);
  const tenDaysAgo = new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10);
  const twentyDaysAgo = new Date(Date.now() - 86400000 * 20).toISOString().slice(0, 10);
  const nextMonth = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);

  const profile: ContractorProfile = {
    id: 'default_contractor',
    businessName: 'Vanguard Builders & Electrical Services',
    contractorTypes: ['General Contractor', 'Electrical Contractor', 'Renovation Contractor'],
    ownerName: 'Engr. Marco Santos',
    openingCashBalance: 35000,
    openingGcashBalance: 20000,
    openingBankBalance: 150000,
    isSetupComplete: true,
    updatedAt: Date.now(),
  };

  const projects: Project[] = [
    {
      id: 'proj_bgc_reno',
      name: 'BGC Two-Bedroom Condo Full Renovation',
      clientName: 'Atty. Roberto Tan',
      projectType: 'Renovation Contractor',
      contractAmount: 480000,
      estimatedBudget: 350000,
      startDate: twentyDaysAgo,
      targetCompletionDate: nextMonth,
      status: 'Active',
      notes: 'Turnkey renovation: electrical rewiring, tiling, ceiling & cabinetry.',
      createdAt: Date.now() - 86400000 * 20,
      updatedAt: Date.now() - 86400000 * 20,
    },
    {
      id: 'proj_qc_residence',
      name: 'QC 2-Storey House Main Electrical Upgrade',
      clientName: 'Dr. Carmela Reyes',
      projectType: 'Electrical Contractor',
      contractAmount: 165000,
      estimatedBudget: 110000,
      startDate: tenDaysAgo,
      targetCompletionDate: today,
      status: 'Active',
      notes: 'New 200A panel board, circuit breakers, grounding rod, and LED fixtures.',
      createdAt: Date.now() - 86400000 * 10,
      updatedAt: Date.now() - 86400000 * 10,
    },
  ];

  const transactions: Transaction[] = [
    // BGC Reno Incomes
    {
      id: 'demo_t_1',
      projectId: 'proj_bgc_reno',
      type: 'income',
      category: 'Down Payment',
      amount: 150000,
      paymentMethod: 'Bank',
      date: twentyDaysAgo,
      time: '10:30',
      description: 'Initial 30% Down Payment (Mobilization & Materials)',
      notes: 'Transferred via BPI online banking',
      createdAt: Date.now() - 86400000 * 20,
      updatedAt: Date.now() - 86400000 * 20,
    },
    {
      id: 'demo_t_2',
      projectId: 'proj_bgc_reno',
      type: 'income',
      category: 'Progress Billing',
      amount: 140000,
      paymentMethod: 'Bank',
      date: tenDaysAgo,
      time: '15:00',
      description: '1st Progress Billing (Demolition & Rough-ins complete)',
      notes: 'Approved by client architect',
      createdAt: Date.now() - 86400000 * 10,
      updatedAt: Date.now() - 86400000 * 10,
    },

    // BGC Reno Expenses
    {
      id: 'demo_t_3',
      projectId: 'proj_bgc_reno',
      type: 'expense',
      category: 'Materials',
      amount: 86500,
      paymentMethod: 'Bank',
      date: twentyDaysAgo,
      time: '14:00',
      description: 'Plywood, metal studs, gypsum boards, and dry-wall screws',
      supplierOrPayee: 'Wilcon Depot BGC',
      notes: 'SI #84910',
      createdAt: Date.now() - 86400000 * 20 + 3600000,
      updatedAt: Date.now() - 86400000 * 20 + 3600000,
    },
    {
      id: 'demo_t_4',
      projectId: 'proj_bgc_reno',
      type: 'expense',
      category: 'Labor',
      amount: 32000,
      paymentMethod: 'Cash',
      date: tenDaysAgo,
      time: '17:30',
      description: 'Weekly payroll for 4 carpenters and 2 helpers',
      supplierOrPayee: 'Foreman Dan & team',
      notes: 'Cash payout on site',
      createdAt: Date.now() - 86400000 * 10 + 3600000,
      updatedAt: Date.now() - 86400000 * 10 + 3600000,
    },
    {
      id: 'demo_t_5',
      projectId: 'proj_bgc_reno',
      type: 'expense',
      category: 'Permits and Fees',
      amount: 12500,
      paymentMethod: 'GCash',
      date: twentyDaysAgo,
      time: '09:00',
      description: 'Condo Admin construction bond and work permit fee',
      supplierOrPayee: 'Condo Property Management',
      notes: 'Receipt uploaded to files',
      createdAt: Date.now() - 86400000 * 20 - 3600000,
      updatedAt: Date.now() - 86400000 * 20 - 3600000,
    },

    // QC Project Incomes & Expenses
    {
      id: 'demo_t_6',
      projectId: 'proj_qc_residence',
      type: 'income',
      category: 'Down Payment',
      amount: 80000,
      paymentMethod: 'GCash',
      date: tenDaysAgo,
      time: '11:00',
      description: '50% Down Payment for panelboard & wiring materials',
      notes: 'Paid through GCash',
      createdAt: Date.now() - 86400000 * 10,
      updatedAt: Date.now() - 86400000 * 10,
    },
    {
      id: 'demo_t_7',
      projectId: 'proj_qc_residence',
      type: 'expense',
      category: 'Materials',
      amount: 44200,
      paymentMethod: 'GCash',
      date: tenDaysAgo,
      time: '13:30',
      description: 'THHN Stranded wires (3.5mm, 5.5mm, 14mm), EMT pipes & boxes',
      supplierOrPayee: 'Philflex Electrical Supply',
      createdAt: Date.now() - 86400000 * 10 + 7200000,
      updatedAt: Date.now() - 86400000 * 10 + 7200000,
    },
    {
      id: 'demo_t_8',
      projectId: 'proj_qc_residence',
      type: 'expense',
      category: 'Labor',
      amount: 18000,
      paymentMethod: 'Cash',
      date: today,
      time: '16:00',
      description: 'Master Electrician and 2 wiremen roughing-in labor',
      supplierOrPayee: 'Electrician Roger & crew',
      createdAt: Date.now() - 3600000 * 2,
      updatedAt: Date.now() - 3600000 * 2,
    },
  ];

  return { profile, projects, transactions };
}
