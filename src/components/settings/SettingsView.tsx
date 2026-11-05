/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Contractor Money Flow - Settings & Profile Management
 */

import React, { useState, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { useApp } from '../../context/AppContext';
import { db } from '../../services/storage';
import { ManualPremiumPayment } from './ManualPremiumPayment';
import { autoSave } from '../../services/autoSave';
import { BackupConflictError, type BackupSummary } from '../../services/storage';
import {
  HardHat,
  Shield,
  Download,
  Upload,
  Sparkles,
  RotateCcw,
  Sun,
  Moon,
  Smartphone,
  Check,
  Mail,
} from 'lucide-react';

interface BackupManagerPlugin {
  exportToDownloads(options: { fileName: string; content: string }): Promise<{ success: boolean; fileName: string; path: string }>;
  pickAndRestoreBackup(): Promise<{ success?: boolean; cancelled?: boolean; content?: string }>;
}

const BackupManager = registerPlugin<BackupManagerPlugin>('BackupManager');

export const SettingsView: React.FC<{ onOpenContractorSetup: () => void }> = ({
  onOpenContractorSetup,
}) => {
  const {
    profile,
    settings,
    updateSettings,
    loadDemoData,
    clearAllAppData,
  } = useApp();

  const [pinInput, setPinInput] = useState(settings.pinCode || '');
  const [pinSavedFeedback, setPinSavedFeedback] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null);
  const [backupConflictDetails, setBackupConflictDetails] = useState<BackupConflictError['conflicts']>([]);
  const [pendingRestore, setPendingRestore] = useState<{ content: string; summary: BackupSummary } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePinToggle = () => {
    updateSettings({ pinLockEnabled: !settings.pinLockEnabled });
  };

  const handleSavePin = () => {
    if (pinInput.length === 4) {
      updateSettings({ pinCode: pinInput, pinLockEnabled: true });
      setPinSavedFeedback(true);
      setTimeout(() => setPinSavedFeedback(false), 2000);
    }
  };

  const handleExportBackup = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    setBackupSummary(null);
    setBackupConflictDetails([]);
    try {
      setBackupMessage('Flushing pending autosaves…');
      (document.activeElement as HTMLElement | null)?.blur?.();
      await autoSave.flush();
      setBackupMessage('Preparing and verifying complete backup…');
      const jsonStr = await db.exportBackup();
      const verification = db.validateBackup(jsonStr);
      if (!verification.valid || !verification.summary) throw new Error(verification.error || 'Backup verification failed.');
      const fileName = `ContractorMoneyFlow_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
        const result = await BackupManager.exportToDownloads({ fileName, content: jsonStr });
        if (!result.success) throw new Error('Android did not confirm the backup was saved.');
        setBackupMessage(`Backup v3 verified and saved to Downloads/${result.fileName}.`);
      } else {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setBackupMessage('Backup v3 verified and downloaded successfully!');
      }
      setBackupSummary(verification.summary);
    } catch (error) {
      console.error('Backup export failed:', error);
      if (error instanceof BackupConflictError) setBackupConflictDetails(error.conflicts);
      setBackupMessage(error instanceof Error ? `Backup failed: ${error.message}` : 'Backup export failed. Please try again.');
    } finally {
      setBackupBusy(false);
    }
  };

  const restoreBackupContent = async (content: string) => {
    const result = db.validateBackup(content);
    if (!result.valid || !result.summary) {
      setPendingRestore(null);
      setBackupMessage(`Restore validation failed: ${result.error || 'unsupported or incomplete backup'}. Existing data was not changed.`);
      return;
    }
    setPendingRestore({ content, summary: result.summary });
    setBackupSummary(result.summary);
    setBackupMessage(result.summary.version === 2
      ? 'Legacy version 2 backup validated. It does not contain LocalStorage fallback records or pending GCash references. Review counts and confirm replacement only if you have a separate copy of that data.'
      : `Backup version ${result.summary.version} validated. Review its counts, then confirm replacement.`);
  };

  const confirmRestore = async () => {
    if (!pendingRestore || backupBusy) return;
    setBackupBusy(true);
    setBackupMessage('Flushing current autosaves before replacement…');
    (document.activeElement as HTMLElement | null)?.blur?.();
    let recoveryRetryRequired = false;
    try {
      await autoSave.flush();
      setBackupMessage('Creating recovery snapshot and restoring validated backup…');
      const summary = await db.restoreBackup(pendingRestore.content);
      setBackupSummary(summary);
      setPendingRestore(null);
      setBackupMessage(`Backup v${summary.version} restored and verified. Reloading…`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Backup restore failed:', error);
      setBackupMessage(error instanceof Error ? error.message : 'Restore failed. Existing data was recovered where possible.');
      recoveryRetryRequired = error instanceof Error && /recovery is still pending/i.test(error.message);
    } finally {
      if (!recoveryRetryRequired) setBackupBusy(false);
    }
    if (recoveryRetryRequired) setTimeout(() => window.location.reload(), 500);
  };

  const handleAndroidRestore = async () => {
    try {
      const result = await BackupManager.pickAndRestoreBackup();
      if (result.cancelled) return;
      if (!result.success || typeof result.content !== 'string') {
        throw new Error('The selected file could not be read.');
      }
      await restoreBackupContent(result.content);
    } catch (error) {
      console.error('Backup restore failed:', error);
      setBackupMessage('Could not read or restore that backup file. Existing data was not changed.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') throw new Error('Unable to read backup as text');
        await restoreBackupContent(content);
      } catch (err) {
        console.error('Backup restore failed:', err);
        setBackupMessage('Could not read or restore that backup file. Existing data was not changed.');
      }
    };
    reader.onerror = () => setBackupMessage('Could not read the selected backup file. Existing data was not changed.');
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-4 pb-20">
      {backupBusy && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-6 text-center" role="status" aria-live="polite" aria-busy="true">
          <div className="rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white">
            {backupMessage || 'Preparing your data…'}
          </div>
        </div>
      )}
      {/* Contractor Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
              <HardHat className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                {profile.businessName || 'Contractor Profile'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {profile.contractorTypes?.join(', ') || 'General Contractor'}
              </p>
            </div>
          </div>

          <button
            onClick={onOpenContractorSetup}
            type="button"
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
          >
            Edit Profile
          </button>
        </div>
      </div>

      <ManualPremiumPayment />

      {/* Theme Settings */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
          Appearance & Theme
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Smartphone },
          ].map((t) => {
            const Icon = t.icon;
            const isSelected = settings.theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => updateSettings({ theme: t.id as any })}
                type="button"
                className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4-digit PIN Security */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              App Security PIN
            </h3>
          </div>
          <button
            onClick={handlePinToggle}
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.pinLockEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.pinLockEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Require a 4-digit PIN lock when opening the contractor application.
        </p>

        {settings.pinLockEnabled && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
              Set 4-Digit Security PIN
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 1234"
                className="w-28 px-3 py-2 text-center text-sm font-mono tracking-widest font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white"
              />
              <button
                onClick={handleSavePin}
                disabled={pinInput.length !== 4}
                type="button"
                className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold disabled:opacity-40"
              >
                Save PIN
              </button>
              {pinSavedFeedback && (
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Local Backup & Restore */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
          Offline Backup & Restore
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Your project contracts, labor payments, and material costs are saved locally. Export a backup anytime.
        </p>

        {backupMessage && (
          <div
            role="status"
            className={`p-2.5 rounded-xl text-xs font-semibold ${
              /error|failed|invalid|could not|stopped|conflict|unreadable|unsupported|not changed|recovery is still pending/i.test(backupMessage)
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {backupMessage}
          </div>
        )}

        {backupSummary && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <p className="font-bold">Backup v{backupSummary.version}{backupSummary.createdAt ? ` · ${new Date(backupSummary.createdAt).toLocaleString()}` : ''}{backupSummary.applicationVersion ? ` · App ${backupSummary.applicationVersion}` : ''}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              {Object.entries(backupSummary.recordCounts).map(([store, count]) => <p key={store}>{store}: <strong>{count}</strong></p>)}
              <p>Fallback records: <strong>{Object.values(backupSummary.fallbackRecordCounts).reduce((sum, count) => sum + count, 0)}</strong></p>
              <p>Pending GCash: <strong>{backupSummary.pendingPaymentCount}</strong></p>
            </div>
          </div>
        )}

        {backupConflictDetails.length > 0 && (
          <details className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-[11px] text-rose-950 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-100">
            <summary className="cursor-pointer font-bold">Review both preserved copies ({backupConflictDetails.length} conflicts)</summary>
            <div className="mt-2 space-y-3">
              {backupConflictDetails.map((conflict) => (
                <div key={`${conflict.storeName}:${conflict.id}`}>
                  <p className="font-extrabold">{conflict.storeName} / {conflict.id}</p>
                  <p className="mt-1 font-bold">IndexedDB copy</p>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-white/70 p-2 dark:bg-black/20">{JSON.stringify(conflict.indexedDBRecord, null, 2)}</pre>
                  <p className="mt-1 font-bold">LocalStorage fallback copy</p>
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-white/70 p-2 dark:bg-black/20">{JSON.stringify(conflict.localStorageRecord, null, 2)}</pre>
                </div>
              ))}
            </div>
          </details>
        )}

        {pendingRestore && (
          <div className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100" role="alert">
            <p className="font-extrabold">Confirm replacement restore</p>
            <p className="mt-1">Restoring replaces all seven existing IndexedDB stores and the app’s recognized fallback mirrors. A recovery snapshot will be created first. Continue only if this is the backup you intend to restore.</p>
            {pendingRestore.summary.version === 2 && <p className="mt-2 font-bold">This legacy backup cannot restore fallback-only records or old-device pending GCash references.</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleExportBackup}
            type="button"
            disabled={backupBusy}
            className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 text-slate-800 dark:text-slate-200 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-amber-500" />
            <span>Export Backup</span>
          </button>

          {pendingRestore ? (
            <button onClick={() => void confirmRestore()} type="button" disabled={backupBusy} className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-xs font-extrabold flex items-center justify-center gap-1.5 text-slate-950 disabled:opacity-50">
              <Check className="w-4 h-4" /><span>Confirm Replace</span>
            </button>
          ) : (
            <button
              onClick={() => {
                if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
                  void handleAndroidRestore();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              type="button"
              disabled={backupBusy}
              className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-1.5 text-slate-800 dark:text-slate-200 disabled:opacity-50"
            >
              <Upload className="w-4 h-4 text-blue-500" />
              <span>Restore Backup</span>
            </button>
          )}
          {pendingRestore && <button onClick={() => { setPendingRestore(null); setBackupMessage('Restore cancelled. Existing data was not changed.'); }} type="button" disabled={backupBusy} className="col-span-2 py-2 text-xs font-bold text-slate-600 underline dark:text-slate-300">Cancel replacement</button>}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">Contact Support</h3>
        <a
          href="mailto:circaniabc@gmail.com?subject=Contractor%20Money%20Flow%20Support"
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:underline"
        >
          <Mail className="w-4 h-4" />
          circaniabc@gmail.com
        </a>
      </div>

      {/* Demo Data & Reset */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
          Demo Data & Database Reset
        </h3>

        <div className="space-y-2">
          <button
            onClick={loadDemoData}
            type="button"
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Reload Contractor Demo Projects</span>
            </span>
            <span className="text-[10px] text-slate-400">Safe Demo</span>
          </button>

          <button
            onClick={() => {
              const confirmed = window.confirm(
                'Are you sure you want to clear all project and financial data? This cannot be undone.'
              );
              if (confirmed) clearAllAppData();
            }}
            type="button"
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <RotateCcw className="w-4 h-4" />
              <span>Reset Database to Zero</span>
            </span>
            <span className="text-[10px] text-rose-500 font-semibold">Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};
