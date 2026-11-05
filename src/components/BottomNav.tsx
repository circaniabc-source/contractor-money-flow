/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Mobile Bottom Navigation
 */

import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  ReceiptText,
  BarChart3,
  Settings,
} from 'lucide-react';

export type ContractorNavTab = 'dashboard' | 'projects' | 'transactions' | 'reports' | 'settings';

interface BottomNavProps {
  currentTab: ContractorNavTab;
  onSelectTab: (tab: ContractorNavTab) => void;
  activeProjectsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  activeProjectsCount = 0,
}) => {
  const items = [
    {
      id: 'dashboard' as ContractorNavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'projects' as ContractorNavTab,
      label: 'Projects',
      icon: Briefcase,
      badge: activeProjectsCount > 0 ? activeProjectsCount.toString() : undefined,
    },
    {
      id: 'transactions' as ContractorNavTab,
      label: 'Transactions',
      icon: ReceiptText,
    },
    {
      id: 'reports' as ContractorNavTab,
      label: 'Reports',
      icon: BarChart3,
    },
    {
      id: 'settings' as ContractorNavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe transition-colors">
      <div className="max-w-md mx-auto px-2 flex items-center justify-around h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              type="button"
              className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : 'scale-100'}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-3 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-amber-500 text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 leading-none">{item.label}</span>

              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
