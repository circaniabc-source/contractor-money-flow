/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - App Header
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { AutoSaveStatus } from './AutoSaveStatus';
import { HardHat, Sun, Moon, Lock } from 'lucide-react';

export const Header: React.FC<{ onOpenProfile: () => void }> = ({ onOpenProfile }) => {
  const { profile, settings, updateSettings, lockApp } = useApp();

  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
  };

  const businessName = profile.businessName || 'My Contracting Business';
  const primaryType = profile.contractorTypes?.[0] || 'General Contractor';

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Left: App Branding & Business Profile */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onOpenProfile}
            type="button"
            className="flex items-center gap-2.5 text-left focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-xl p-1 -m-1 group"
            title="Edit Contractor Profile"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-white flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform flex-shrink-0">
              <HardHat className="w-5 h-5" />
            </div>

            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                  Contractor Flow
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 truncate max-w-[90px]">
                  {primaryType.replace(' Contractor', '')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                {businessName}
              </p>
            </div>
          </button>
        </div>

        {/* Right: Auto-Save Status, Theme, Lock */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <AutoSaveStatus compact={true} />

          <button
            onClick={toggleTheme}
            type="button"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Light/Dark Theme"
            aria-label="Toggle theme"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {settings.pinLockEnabled && (
            <button
              onClick={lockApp}
              type="button"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Lock with PIN"
              aria-label="Lock application"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
