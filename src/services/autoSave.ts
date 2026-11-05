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
  private isProcessing = false;

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

    const timer = setTimeout(async () => {
      this.timers.delete(key);
      try {
        await task();
        this.pendingSaves.delete(key);
        if (this.pendingSaves.size === 0) {
          this.setStatus('saved');
        }
      } catch (err) {
        console.error(`Auto-save failed for ${key}:`, err);
        this.setStatus('error');
      }
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

    try {
      await task();
      this.pendingSaves.delete(key);
      if (this.pendingSaves.size === 0) {
        this.setStatus('saved');
      }
    } catch (err) {
      console.error(`Immediate auto-save failed for ${key}:`, err);
      this.setStatus('error');
    }
  }

  /**
   * Flush all pending timers and callbacks immediately
   */
  public async flush(): Promise<void> {
    const tasks = Array.from(this.pendingSaves.entries());
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();

    if (tasks.length === 0) return;

    this.setStatus('saving');
    for (const [key, task] of tasks) {
      try {
        await task();
        this.pendingSaves.delete(key);
      } catch (err) {
        console.error(`Error flushing task ${key}:`, err);
      }
    }
    this.setStatus('saved');
  }

  public flushSync() {
    this.timers.forEach((t) => clearTimeout(t));
    this.timers.clear();
    // In browser sync unload, try running all registered pending tasks
    this.pendingSaves.forEach((task, key) => {
      try {
        task();
      } catch (e) {
        // Ignore in sync exit
      }
    });
    this.pendingSaves.clear();
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
