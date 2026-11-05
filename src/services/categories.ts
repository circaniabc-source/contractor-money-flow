/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Categories & Constants
 */

export const CONTRACTOR_TYPES = [
  'General Contractor',
  'Electrical Contractor',
  'Plumbing Contractor',
  'Ceiling and Drywall Contractor',
  'Painting Contractor',
  'Tile Contractor',
  'Roofing Contractor',
  'HVAC Contractor',
  'Carpentry Contractor',
  'Renovation Contractor',
  'Other Specialty Contractor',
];

export const CONTRACTOR_INCOME_CATEGORIES = [
  'Down Payment',
  'Progress Billing',
  'Partial Payment',
  'Final Payment',
  'Other Income',
];

export const CONTRACTOR_EXPENSE_CATEGORIES = [
  'Materials',
  'Labor',
  'Equipment Rental',
  'Transportation',
  'Fuel',
  'Food / Allowance',
  'Permits and Fees',
  'Other Expenses',
];

export function formatPeso(amount: number): string {
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${isNegative ? '-' : ''}₱${formatted}`;
}
