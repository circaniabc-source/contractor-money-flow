/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - PDF and Excel/CSV Export Service
 */

import { jsPDF } from 'jspdf';
import { Transaction } from '../types';
import { formatPeso } from './categories';

export class ExportService {
  /**
   * Export transactions to Excel-compatible CSV with UTF-8 BOM
   */
  public static exportToExcelCSV(
    transactions: Transaction[],
    businessName: string,
    periodLabel: string
  ): void {
    const headers = [
      'Date',
      'Time',
      'Type',
      'Project',
      'Category',
      'Description',
      'Amount (PHP)',
      'Payment Method',
      'Supplier / Payee',
      'Notes',
    ];

    const rows = transactions.map((t) => [
      `"${t.date}"`,
      `"${t.time || ''}"`,
      `"${t.type.toUpperCase()}"`,
      `"${t.projectId || 'General'}"`,
      `"${t.category}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      (t.type === 'expense' ? -t.amount : t.amount).toFixed(2),
      `"${t.paymentMethod}"`,
      `"${(t.supplierOrPayee || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const metaHeader = [
      `"Contractor Money Flow - Financial Statement"`,
      `"Business: ${businessName}"`,
      `"Scope: ${periodLabel}"`,
      `"Generated: ${new Date().toLocaleString()}"`,
      '',
    ].join('\r\n');

    const csvContent =
      '\uFEFF' +
      metaHeader +
      headers.join(',') +
      '\r\n' +
      rows.map((r) => r.join(',')).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Contractor_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Export summary and transactions to formatted PDF
   */
  public static exportToPDF(
    transactions: Transaction[],
    mode: string,
    businessName: string,
    periodLabel: string,
    summary: {
      totalIncome: number;
      totalExpenses: number;
      netResult: number;
      cashBalance?: number;
    }
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Header styling
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Contractor Money Flow', 14, 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(251, 191, 36); // amber-400
    doc.text(`Financial Ledger & Statement | ${businessName}`, 14, 21);

    // Meta section
    let y = 36;
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.text(`Report Period: ${periodLabel}`, 14, y);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, y + 5);

    y += 14;

    // Financial Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL COLLECTIONS', 20, y + 8);
    doc.text('PROJECT EXPENSES', 80, y + 8);
    doc.text('NET OPERATING PROFIT', 140, y + 8);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(`PHP ${summary.totalIncome.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 20, y + 17);

    doc.setTextColor(239, 68, 68); // rose
    doc.text(`PHP ${summary.totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 80, y + 17);

    if (summary.netResult >= 0) {
      doc.setTextColor(37, 99, 235);
    } else {
      doc.setTextColor(220, 38, 38);
    }
    doc.text(`PHP ${summary.netResult.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`, 140, y + 17);

    y += 34;

    // Table Header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Transaction Details', 14, y);

    y += 6;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 8, 'F');

    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('DATE', 16, y + 5.5);
    doc.text('CATEGORY', 40, y + 5.5);
    doc.text('DESCRIPTION', 78, y + 5.5);
    doc.text('METHOD', 130, y + 5.5);
    doc.text('AMOUNT', 165, y + 5.5);

    y += 9;
    doc.setFont('helvetica', 'normal');

    const pageHeight = doc.internal.pageSize.getHeight();
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];

      if (y > pageHeight - 20) {
        doc.addPage();
        y = 15;
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('DATE', 16, y + 5.5);
        doc.text('CATEGORY', 40, y + 5.5);
        doc.text('DESCRIPTION', 78, y + 5.5);
        doc.text('METHOD', 130, y + 5.5);
        doc.text('AMOUNT', 165, y + 5.5);
        y += 10;
        doc.setFont('helvetica', 'normal');
      }

      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y - 4, pageWidth - 28, 7, 'F');
      }

      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(t.date, 16, y);

      const categoryText = doc.splitTextToSize(t.category, 36);
      doc.text(categoryText[0] || '', 40, y);

      const descText = doc.splitTextToSize(t.description || '-', 48);
      doc.text(descText[0] || '', 78, y);

      doc.text(t.paymentMethod, 130, y);

      const isExp = t.type === 'expense';
      const isTrf = t.type === 'transfer';
      if (isExp) {
        doc.setTextColor(220, 38, 38);
      } else if (isTrf) {
        doc.setTextColor(100, 116, 139);
      } else {
        doc.setTextColor(16, 185, 129);
      }

      const prefix = isExp ? '-' : isTrf ? '' : '+';
      doc.text(`${prefix}PHP ${t.amount.toFixed(2)}`, 165, y);

      y += 7;
    }

    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated by Contractor Money Flow - Offline-first Philippine Contractor Manager', 14, pageHeight - 8);

    doc.save(`Contractor_Statement_${new Date().toISOString().slice(0, 10)}.pdf`);
  }
}
