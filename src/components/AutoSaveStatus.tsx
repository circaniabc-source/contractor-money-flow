/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Money Flow Tracker - Real-time Auto-Save Status Badge
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export const AutoSaveStatus: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { saveStatus, lastSavedAt } = useApp();

  const formattedTime = lastSavedAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  if (saveStatus === 'saving') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (saveStatus === 'error') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        <AlertCircle className="w-3 h-3" />
        <span>Save failed</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all"
      title={`All changes saved locally at ${formattedTime}`}
    >
      <CheckCircle2 className="w-3 h-3" />
      <span>{compact ? 'Saved' : 'All changes saved'}</span>
    </div>
  );
};
