/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - First-Time Setup & Contractor Profile
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CONTRACTOR_TYPES, formatPeso } from '../../services/categories';
import { AutoSaveStatus } from '../AutoSaveStatus';
import {
  HardHat,
  Building2,
  User,
  Coins,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const ContractorSetup: React.FC<{ isModal?: boolean; onClose?: () => void }> = ({
  isModal = false,
  onClose,
}) => {
  const { profile, updateProfile, loadDemoData } = useApp();

  const [businessName, setBusinessName] = useState(profile.businessName || '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    profile.contractorTypes?.length ? profile.contractorTypes : ['General Contractor']
  );
  const [ownerName, setOwnerName] = useState(profile.ownerName || '');
  const [cashBalance, setCashBalance] = useState<string>(
    profile.openingCashBalance ? profile.openingCashBalance.toString() : ''
  );
  const [gcashBalance, setGcashBalance] = useState<string>(
    profile.openingGcashBalance ? profile.openingGcashBalance.toString() : ''
  );
  const [bankBalance, setBankBalance] = useState<string>(
    profile.openingBankBalance ? profile.openingBankBalance.toString() : ''
  );

  const toggleType = (t: string) => {
    let next: string[];
    if (selectedTypes.includes(t)) {
      if (selectedTypes.length > 1) {
        next = selectedTypes.filter((item) => item !== t);
      } else {
        next = selectedTypes;
      }
    } else {
      next = [...selectedTypes, t];
    }
    setSelectedTypes(next);
    updateProfile({ contractorTypes: next });
  };

  const handleBusinessNameChange = (val: string) => {
    setBusinessName(val);
    updateProfile({ businessName: val });
  };

  const handleOwnerNameChange = (val: string) => {
    setOwnerName(val);
    updateProfile({ ownerName: val });
  };

  const handleCashChange = (val: string) => {
    setCashBalance(val);
    updateProfile({ openingCashBalance: parseFloat(val) || 0 });
  };

  const handleGcashChange = (val: string) => {
    setGcashBalance(val);
    updateProfile({ openingGcashBalance: parseFloat(val) || 0 });
  };

  const handleBankChange = (val: string) => {
    setBankBalance(val);
    updateProfile({ openingBankBalance: parseFloat(val) || 0 });
  };

  const handleFinishSetup = () => {
    const finalName = businessName.trim() || 'My Contracting Business';
    updateProfile({
      businessName: finalName,
      contractorTypes: selectedTypes,
      ownerName: ownerName.trim(),
      openingCashBalance: parseFloat(cashBalance) || 0,
      openingGcashBalance: parseFloat(gcashBalance) || 0,
      openingBankBalance: parseFloat(bankBalance) || 0,
      isSetupComplete: true,
    });
    if (onClose) onClose();
  };

  return (
    <div
      className={
        isModal
          ? 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4'
          : 'min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-6 px-4'
      }
    >
      <div className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 flex-shrink-0">
              <HardHat className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Contractor Money Flow
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simple money & project manager for contractors
              </p>
            </div>
          </div>
          <AutoSaveStatus compact={true} />
        </div>

        <div className="space-y-4 pt-1">
          {/* Business Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Business / Contractor Name</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => handleBusinessNameChange(e.target.value)}
              placeholder="e.g., Apex Construction & Renovation"
              className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Contractor Types (Multi-select) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Contractor Specialties
              </label>
              <span className="text-[11px] text-slate-400">Select all that apply</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {CONTRACTOR_TYPES.map((type) => {
                const isSelected = selectedTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    type="button"
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium text-left flex items-center justify-between border transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{type.replace(' Contractor', '')}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Owner Name */}
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Owner / General Contractor Name (Optional)</span>
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => handleOwnerNameChange(e.target.value)}
              placeholder="e.g., Engr. Juan Dela Cruz"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Opening Balances */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Starting Available Cash
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Input what money you currently have in cash and bank registers:
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Physical Cash (₱)</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={cashBalance}
                  onChange={(e) => handleCashChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">GCash (₱)</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={gcashBalance}
                  onChange={(e) => handleGcashChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Bank Account (₱)</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={bankBalance}
                  onChange={(e) => handleBankChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleFinishSetup}
            type="button"
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
          >
            <span>{isModal ? 'Save & Close' : 'Enter Dashboard'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Demo Data button for quick testing */}
          {!isModal && (
            <div className="pt-2 text-center">
              <button
                onClick={async () => {
                  await loadDemoData();
                }}
                type="button"
                className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-500 flex items-center justify-center gap-1.5 mx-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Or load sample contractor demo projects</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
