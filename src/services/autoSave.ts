/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Money Flow Tracker - Real-time Auto-Save Engine
 * Manages debounced text saves, immediate numeric/select saves, drafts, and lifecycle flushes.
 */

import { db } from './storage';

export type SaveStatus = 'saved' | 'saving' | 'error';

type Listener = (status: SaveStatus, lastSavedAt?: Date) => void;

class AutoSaveManager {
  private status: SaveStatus = 'saved';
  private lastSavedAt: Date = new Date();
  private listeners: Set<Listener> = new Set();
  private timers: Map<string, any> = new Map();
  private pendingSaves: Map<string, () => Promise<void>> = new Map();
  private runningSaves: Map<string, Promise<boolean>> = new Map();

  constructor() {
    this.setupLifecycleListeners();
  }

  private setupLifecycleListeners() {
    if (typeof window === 'undefined') return;

    // Flush pending changes before page hide, unload, or when switching tabs
    const flushAll = () => {
      this.flushSync();
    };

    window.addEventListener('beforeunload', flushAll);
    window.addEventListener('pagehide', flushAll);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        flushAll();
      }
    });
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status, this.lastSavedAt);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.status, this.lastSavedAt));
  }

  public getStatus(): { status: SaveStatus; lastSavedAt: Date } {
    return { status: this.status, lastSavedAt: this.lastSavedAt };
  }

  public setStatus(status: SaveStatus) {
    this.status = status;
    if (status === 'saved') {
      this.lastSavedAt = new Date();
    }
    this.notify();
  }

  /**
   * Save a draft field or execute a debounced save
   */
  public debouncedSave(key: string, task: () => Promise<void>, delayMs: number = 300) {
    this.setStatus('saving');

    // Register pending task in map for immediate flush if needed
    this.pendingSaves.set(key, task);

    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    const timer = setTimeout(() => {
      this.timers.delete(key);
      void this.runPendingSave(key);
    }, delayMs);

    this.timers.set(key, timer);
  }

  /**
   * Immediate save for numeric, radio, select, or immediate actions
   */
  public async immediateSave(key: string, task: () => Promise<void>) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    this.setStatus('saving');
    this.pendingSaves.set(key, task);

    await this.runPendingSave(key);
  }

  private async runPendingSave(key: string): Promise<boolean> {
    const running = this.runningSaves.get(key);
    if (running) {
      const succeeded = await running;
      if (this.runningSaves.get(key) === running) this.runningSaves.delete(key);
      if (!succeeded) return false;
      return this.pendingSaves.has(key) ? this.runPendingSave(key) : true;
    }

    const task = this.pendingSaves.get(key);
    if (!task) return true;

    const run = (async () => {
      try {
        await task();
        if (this.pendingSaves.get(key) === task) this.pendingSaves.delete(key);
        return true;
      } catch (err) {
        console.error(`Auto-save failed for ${key}:`, err);
        this.setStatus('error');
        return false;
      }
    })();
    this.runningSaves.set(key, run);
    const succeeded = await run;
    if (this.runningSaves.get(key) === run) this.runningSaves.delete(key);
    if (succeeded && this.pendingSaves.size === 0 && this.runningSaves.size === 0) {
      this.setStatus('saved');
    }
    return succeeded;
  }

  /**
   * Flush all pending timers and callbacks immediately
   */
  public async flush(): Promise<void> {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();

    if (this.pendingSaves.size === 0 && this.runningSaves.size === 0) return;

    this.setStatus('saving');
    const failedKeys = new Set<string>();
    while (this.pendingSaves.size > 0 || this.runningSaves.size > 0) {
      const keys = new Set([...this.pendingSaves.keys(), ...this.runningSaves.keys()]);
      const results = await Promise.all([...keys].map(async (key) => [key, await this.runPendingSave(key)] as const));
      results.forEach(([key, succeeded]) => {
        if (!succeeded) failedKeys.add(key);
        else failedKeys.delete(key);
      });
      if (failedKeys.size > 0) {
        throw new Error(`Autosave could not finish for: ${[...failedKeys].join(', ')}`);
      }
    }
    if (this.pendingSaves.size > 0 || this.runningSaves.size > 0) {
      throw new Error('Autosave writes are still pending.');
    }
    this.setStatus('saved');
  }

  public flushSync() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    // In browser sync unload, try running all registered pending tasks
    this.pendingSaves.forEach((_task, key) => {
      void this.runPendingSave(key);
    });
  }

  // Draft persistence helper
  public async saveDraft<T>(draftKey: string, data: T): Promise<void> {
    await db.put('drafts', { id: draftKey, ...data, savedAt: Date.now() });
  }

  public async getDraft<T>(draftKey: string): Promise<T | null> {
    const res = await db.get<any>('drafts', draftKey);
    return res as T | null;
  }

  public async clearDraft(draftKey: string): Promise<void> {
    await db.delete('drafts', draftKey);
  }
}

export const autoSave = new AutoSaveManager();
