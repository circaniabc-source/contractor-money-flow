/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Money Flow Tracker - Offline-First Local Database Storage Service
 * Provides IndexedDB persistence with SQLite schema semantics.
 */

const DB_NAME = 'ContractorMoneyFlow_DB';
const DB_VERSION = 2;
export const BACKUP_STORES = [
  'projects',
  'contractor_profile',
  'transactions',
  'labor_entries',
  'material_entries',
  'drafts',
  'keyval',
] as const;

export interface DBStores {
  projects: string;
  contractor_profile: string;
  transactions: string;
  labor_entries: string;
  material_entries: string;
  drafts: string;
  keyval: string;
}

class LocalStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryCache: Map<string, any> = new Map();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        // Fallback for non-browser environments if any
        resolve(null as any);
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        const storeNames = [
          'projects',
          'contractor_profile',
          'transactions',
          'labor_entries',
          'material_entries',
          'drafts',
          'keyval',
        ];

        storeNames.forEach((name) => {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = () => {
        this.isInitialized = true;
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.init();
    if (!db) {
      throw new Error('IndexedDB not supported or available');
    }
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  public async get<T>(storeName: string, id: string): Promise<T | null> {
    const cacheKey = `${storeName}:${id}`;
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey) as T;
    }

    try {
      const store = await this.getStore(storeName, 'readonly');
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => {
          const result = (request.result as T) || null;
          if (result) this.memoryCache.set(cacheKey, result);
          resolve(result);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      // Fallback to localStorage if IndexedDB encounters issues
      const raw = localStorage.getItem(`mft_${storeName}_${id}`);
      return raw ? JSON.parse(raw) : null;
    }
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    try {
      const store = await this.getStore(storeName, 'readonly');
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const list = (request.result as T[]) || [];
          list.forEach((item: any) => {
            if (item && item.id) {
              this.memoryCache.set(`${storeName}:${item.id}`, item);
            }
          });
          resolve(list);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      // Fallback: iterate localStorage keys
      const list: T[] = [];
      const prefix = `mft_${storeName}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          const raw = localStorage.getItem(k);
          if (raw) list.push(JSON.parse(raw));
        }
      }
      return list;
    }
  }

  public async put<T extends { id: string }>(storeName: string, item: T): Promise<T> {
    const cacheKey = `${storeName}:${item.id}`;
    this.memoryCache.set(cacheKey, item);

    // Also mirror to localStorage for redundancy and instant pagehide preservation
    try {
      localStorage.setItem(`mft_${storeName}_${item.id}`, JSON.stringify(item));
    } catch (e) {
      // Ignore quota warnings
    }

    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.put(item);
        request.onsuccess = () => resolve(item);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      return item;
    }
  }

  public async delete(storeName: string, id: string): Promise<void> {
    const cacheKey = `${storeName}:${id}`;
    this.memoryCache.delete(cacheKey);
    localStorage.removeItem(`mft_${storeName}_${id}`);

    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      // Ignore
    }
  }

  public async clearStore(storeName: string): Promise<void> {
    // Clear cache
    const prefix = `${storeName}:`;
    Array.from(this.memoryCache.keys()).forEach((key) => {
      if (key.startsWith(prefix)) this.memoryCache.delete(key);
    });

    const lsPrefix = `mft_${storeName}_`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(lsPrefix)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    try {
      const store = await this.getStore(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      // Ignore
    }
  }

  // Key-Value helper for simple settings
  public async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const res = await this.get<{ id: string; value: T }>('keyval', key);
    return res ? res.value : defaultValue;
  }

  public async setSetting<T>(key: string, value: T): Promise<void> {
    await this.put('keyval', { id: key, value });
  }

  // Full backup & restore
  public async exportBackup(): Promise<string> {
    const data: Record<string, any[]> = {};
    for (const store of BACKUP_STORES) {
      data[store] = await this.getAll(store);
    }

    return JSON.stringify({
      version: 2,
      appName: 'Contractor Money Flow',
      exportedAt: new Date().toISOString(),
      data,
    }, null, 2);
  }

  public async importBackup(jsonString: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonString);
      if (
        !parsed || typeof parsed !== 'object' ||
        parsed.version !== 2 || parsed.appName !== 'Contractor Money Flow' ||
        !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)
      ) return false;

      const storeNames = Object.keys(parsed.data);
      const requiredStores = BACKUP_STORES.filter((store) => store !== 'drafts');
      if (
        requiredStores.some((store) => !Object.prototype.hasOwnProperty.call(parsed.data, store)) ||
        storeNames.length < requiredStores.length || storeNames.length > BACKUP_STORES.length ||
        storeNames.some((store) => !(BACKUP_STORES as readonly string[]).includes(store))
      ) return false;

      const backupData = { ...parsed.data, drafts: parsed.data.drafts ?? [] };

      // Validate every store and record before modifying any persisted data.
      for (const storeName of BACKUP_STORES) {
        const items = backupData[storeName];
        if (!Array.isArray(items)) return false;
        const ids = new Set<string>();
        for (const item of items) {
          if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) {
            return false;
          }
          ids.add(item.id);
          if (storeName === 'keyval' && !Object.prototype.hasOwnProperty.call(item, 'value')) return false;
        }
      }

      const db = await this.init();
      if (!db) return false;

      // Replace all app stores in one IndexedDB transaction so a failed restore
      // cannot leave a mixture of old and new data.
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([...BACKUP_STORES], 'readwrite');
        for (const storeName of BACKUP_STORES) {
          const store = tx.objectStore(storeName);
          store.clear();
          for (const item of backupData[storeName]) store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Backup transaction failed'));
        tx.onabort = () => reject(tx.error || new Error('Backup transaction was aborted'));
      });

      this.memoryCache.clear();
      for (const storeName of BACKUP_STORES) {
        const prefix = `mft_${storeName}_`;
        const staleKeys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix)) staleKeys.push(key);
        }
        staleKeys.forEach((key) => localStorage.removeItem(key));
        for (const item of backupData[storeName]) {
          this.memoryCache.set(`${storeName}:${item.id}`, item);
          try { localStorage.setItem(`${prefix}${item.id}`, JSON.stringify(item)); } catch { /* IndexedDB remains authoritative. */ }
        }
      }
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  public async clearAllData(): Promise<void> {
    const stores = [
      'projects',
      'contractor_profile',
      'transactions',
      'labor_entries',
      'material_entries',
      'drafts',
      'keyval',
    ];
    for (const store of stores) {
      await this.clearStore(store);
    }
    this.memoryCache.clear();
  }
}

export const db = new LocalStorageEngine();
