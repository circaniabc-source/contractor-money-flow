/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Money Flow Tracker - Non-intrusive AdMob / Monetization Banner Placement
 * Note: Never shown on transaction entry forms or if Pro subscription is active.
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Shield } from 'lucide-react';

export const AdBanner: React.FC<{ onUpgradeClick?: () => void }> = ({ onUpgradeClick }) => {
  const { settings } = useApp();

  // If user is Pro, ad is completely removed
  if (settings.isProUser) {
    return null;
  }

  return (
    <div className="my-3 px-1">
      <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-100 to-slate-200/80 dark:from-slate-850 dark:to-slate-800 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-slate-300/60 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                Ad Placeholder
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                Upgrade to Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Remove ads, unlock unlimited PDF exports & multi-business slots.
            </p>
          </div>
        </div>

        {onUpgradeClick && (
          <button
            onClick={onUpgradeClick}
            type="button"
            className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Learn More
          </button>
        )}
      </div>
    </div>
  );
};
