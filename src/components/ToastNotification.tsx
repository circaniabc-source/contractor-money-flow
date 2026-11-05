/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Global Toast Notification
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toast, hideToast } = useApp();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4 pointer-events-none animate-slide-down">
      <div
        className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 border ${
          isSuccess
            ? 'bg-slate-900 text-white border-emerald-500/40 shadow-emerald-500/10'
            : isError
            ? 'bg-rose-950 text-rose-100 border-rose-500/40 shadow-rose-500/20'
            : 'bg-slate-900 text-white border-blue-500/40 shadow-blue-500/10'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
          {isError && <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />}
          {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />}
          <p className="text-xs font-semibold leading-snug">{toast.message}</p>
        </div>

        <button
          onClick={hideToast}
          type="button"
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors flex-shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
