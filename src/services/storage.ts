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

export interface BackupSummary {
  version: 2 | 3;
  createdAt?: string;
  applicationVersion?: string;
  recordCounts: Record<(typeof BACKUP_STORES)[number], number>;
  fallbackRecordCounts: Record<(typeof BACKUP_STORES)[number], number>;
  pendingPaymentCount: number;
}

export interface BackupValidationResult {
  valid: boolean;
  summary?: BackupSummary;
  error?: string;
}

export interface BackupConflict {
  storeName: (typeof BACKUP_STORES)[number];
  id: string;
  indexedDBRecord: unknown;
  localStorageRecord: unknown;
  differences: BackupValueDifference[];
}

export interface BackupValueDifference {
  field: string;
  indexedDBPresent: boolean;
  localStoragePresent: boolean;
  indexedDBValue: unknown;
  localStorageValue: unknown;
}

export class BackupConflictError extends Error {
  constructor(public readonly conflicts: BackupConflict[]) {
    super(`Backup stopped: ${conflicts.length} IndexedDB/LocalStorage record conflict(s). ${conflicts.map((item) => `${item.storeName}/${item.id} [${item.differences.map((difference) => difference.field).join(', ')}]`).join('; ')}`);
    this.name = 'BackupConflictError';
  }
}

const PENDING_PAYMENTS_KEY = 'cmf_manual_gcash_pending_payments';
const RECOVERY_DB_NAME = 'ContractorMoneyFlow_BackupRecovery';
const RECOVERY_STORE_NAME = 'recovery';
const RECOVERY_JOURNAL_ID = 'active-restore';
type StoreName = (typeof BACKUP_STORES)[number];
type StoreRecords = Record<StoreName, Array<Record<string, unknown> & { id: string }>>;
type RecoverySnapshot = { stores: StoreRecords; localStorageEntries: Array<[string, string]> };

export function backupDataDeepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left instanceof Date || right instanceof Date) {
    return left instanceof Date && right instanceof Date && left.getTime() === right.getTime();
  }
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;

  const leftIsArray = Array.isArray(left);
  if (leftIsArray !== Array.isArray(right)) return false;
  if (leftIsArray && (left as unknown[]).length !== (right as unknown[]).length) return false;

  // Compare record data rather than prototypes; structured cloning and JSON parsing
  // can yield equivalent records with different prototypes.
  if (left instanceof Map || right instanceof Map || left instanceof Set || right instanceof Set ||
      left instanceof RegExp || right instanceof RegExp || left instanceof ArrayBuffer || right instanceof ArrayBuffer ||
      ArrayBuffer.isView(left) || ArrayBuffer.isView(right)) return false;

  // JSON serialization omits undefined object properties. IndexedDB structured
  // clones retain them, so compare object keys after applying JSON's omission
  // semantics. Array slots remain positional and are intentionally unchanged.
  const leftKeys = Object.keys(left).filter((key) => leftIsArray || (left as Record<string, unknown>)[key] !== undefined).sort();
  const rightKeys = Object.keys(right).filter((key) => leftIsArray || (right as Record<string, unknown>)[key] !== undefined).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  for (let index = 0; index < leftKeys.length; index++) {
    const key = leftKeys[index];
    if (key !== rightKeys[index] || !backupDataDeepEqual(
      (left as Record<string, unknown>)[key],
      (right as Record<string, unknown>)[key]
    )) return false;
  }
  return true;
}

function findBackupValueDifferences(left: unknown, right: unknown, path = '$'): BackupValueDifference[] {
  if (Object.is(left, right)) return [];
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') {
    return [{ field: path, indexedDBPresent: true, localStoragePresent: true, indexedDBValue: left, localStorageValue: right }];
  }

  const leftIsArray = Array.isArray(left);
  if (leftIsArray !== Array.isArray(right)) {
    return [{ field: path, indexedDBPresent: true, localStoragePresent: true, indexedDBValue: left, localStorageValue: right }];
  }

  const differences: BackupValueDifference[] = [];
  if (leftIsArray && (left as unknown[]).length !== (right as unknown[]).length) {
    differences.push({
      field: `${path}.length`,
      indexedDBPresent: true,
      localStoragePresent: true,
      indexedDBValue: (left as unknown[]).length,
      localStorageValue: (right as unknown[]).length,
    });
  }

  if (left instanceof Date || right instanceof Date) {
    differences.push({ field: path, indexedDBPresent: true, localStoragePresent: true, indexedDBValue: String(left), localStorageValue: String(right) });
    return differences;
  }
  if (left instanceof Map || right instanceof Map || left instanceof Set || right instanceof Set ||
      left instanceof RegExp || right instanceof RegExp || left instanceof ArrayBuffer || right instanceof ArrayBuffer ||
      ArrayBuffer.isView(left) || ArrayBuffer.isView(right)) {
    differences.push({ field: path, indexedDBPresent: true, localStoragePresent: true, indexedDBValue: String(left), localStorageValue: String(right) });
    return differences;
  }

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  const allKeys = [...new Set([...leftKeys, ...rightKeys])].sort();
  for (const key of allKeys) {
    const leftPresent = Object.prototype.hasOwnProperty.call(left, key);
    const rightPresent = Object.prototype.hasOwnProperty.call(right, key);
    const field = leftIsArray && /^\d+$/.test(key) ? `${path}[${key}]` : path === '$' ? key : `${path}.${key}`;
    if (leftPresent !== rightPresent) {
      differences.push({ field, indexedDBPresent: leftPresent, localStoragePresent: rightPresent, indexedDBValue: (left as Record<string, unknown>)[key], localStorageValue: (right as Record<string, unknown>)[key] });
    } else {
      differences.push(...findBackupValueDifferences((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key], field));
    }
  }
  return differences;
}

function validRecordArray(value: unknown): value is Array<Record<string, unknown> & { id: string }> {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) return false;
    if (Object.prototype.hasOwnProperty.call(item, '__proto__')) return false;
    ids.add(item.id);
  }
  return true;
}

function emptyStoreRecords(): StoreRecords {
  return Object.fromEntries(BACKUP_STORES.map((store) => [store, []])) as unknown as StoreRecords;
}

function validPendingPayments(value: unknown): value is Array<Record<string, unknown> & { id: string; planId: string; referenceNumber: string; submittedAt: string; status: 'pending' }> {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
      typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id) ||
      typeof item.planId !== 'string' || !item.planId.trim() ||
      typeof item.referenceNumber !== 'string' || !item.referenceNumber.trim() ||
      typeof item.submittedAt !== 'string' || Number.isNaN(Date.parse(item.submittedAt)) ||
      item.status !== 'pending') return false;
    ids.add(item.id);
    return true;
  });
}

function openRecoveryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(RECOVERY_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const recoveryDb = request.result;
      if (!recoveryDb.objectStoreNames.contains(RECOVERY_STORE_NAME)) {
        recoveryDb.createObjectStore(RECOVERY_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open restore recovery storage.'));
  });
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

  private readRecognizedLocalStorageEntries(): Array<[string, string]> {
    const prefixes = BACKUP_STORES.map((store) => `mft_${store}_`);
    const entries: Array<[string, string]> = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key === PENDING_PAYMENTS_KEY || prefixes.some((prefix) => key.startsWith(prefix)))) {
        const value = localStorage.getItem(key);
        if (value !== null) entries.push([key, value]);
      }
    }
    return entries;
  }

  private getLocalStorageFallbackRecords(): StoreRecords {
    const fallback = emptyStoreRecords();
    for (const [key, raw] of this.readRecognizedLocalStorageEntries()) {
      const store = BACKUP_STORES.find((name) => key.startsWith(`mft_${name}_`));
      if (!store) continue;
      let item: unknown;
      try { item = JSON.parse(raw); } catch { throw new Error(`Unreadable LocalStorage fallback record: ${key}`); }
      const expectedId = key.slice(`mft_${store}_`.length);
      if (!item || typeof item !== 'object' || Array.isArray(item) || typeof (item as any).id !== 'string' || (item as any).id !== expectedId) {
        throw new Error(`Invalid LocalStorage fallback record: ${key}`);
      }
      if (fallback[store].some((record) => record.id === expectedId)) {
        throw new Error(`Duplicate LocalStorage fallback key for ${store}/${expectedId}`);
      }
      fallback[store].push(item as Record<string, unknown> & { id: string });
    }
    return fallback;
  }

  private async getCurrentStoreRecords(): Promise<StoreRecords> {
    const current = emptyStoreRecords();
    for (const store of BACKUP_STORES) {
      const objectStore = await this.getStore(store, 'readonly');
      current[store] = await new Promise((resolve, reject) => {
        const request = objectStore.getAll();
        request.onsuccess = () => resolve((request.result as StoreRecords[typeof store]) || []);
        request.onerror = () => reject(request.error || new Error(`Could not snapshot IndexedDB store ${store}.`));
      });
    }
    return current;
  }

  private mergeStoreRecords(indexedDb: StoreRecords, fallback: StoreRecords): { records: StoreRecords; conflicts: BackupConflict[] } {
    const records = emptyStoreRecords();
    const conflicts: BackupConflict[] = [];
    for (const store of BACKUP_STORES) {
      const byId = new Map(indexedDb[store].map((record) => [record.id, record]));
      records[store] = [...indexedDb[store]];
      for (const localRecord of fallback[store]) {
        const indexedRecord = byId.get(localRecord.id);
        if (!indexedRecord) {
          records[store].push(localRecord);
        } else if (!backupDataDeepEqual(indexedRecord, localRecord)) {
          conflicts.push({
            storeName: store,
            id: localRecord.id,
            indexedDBRecord: indexedRecord,
            localStorageRecord: localRecord,
            differences: findBackupValueDifferences(indexedRecord, localRecord),
          });
        }
      }
    }
    return { records, conflicts };
  }

  private summarizeV2(parsed: any): BackupValidationResult {
    const requiredStores = BACKUP_STORES.filter((store) => store !== 'drafts');
    if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) return { valid: false, error: 'Backup data section is missing.' };
    const names = Object.keys(parsed.data);
    if (requiredStores.some((store) => !Object.hasOwn(parsed.data, store)) || names.length < requiredStores.length || names.length > BACKUP_STORES.length || names.some((store) => !BACKUP_STORES.includes(store as StoreName))) {
      return { valid: false, error: 'Backup is missing a required data store or contains an unsupported store.' };
    }
    const counts = {} as BackupSummary['recordCounts'];
    const fallbackCounts = {} as BackupSummary['fallbackRecordCounts'];
    for (const store of BACKUP_STORES) {
      const items = parsed.data[store] ?? (store === 'drafts' ? [] : undefined);
      if (!validRecordArray(items)) return { valid: false, error: `Backup records are invalid in ${store}.` };
      if (store === 'keyval' && items.some((item) => !Object.hasOwn(item, 'value'))) return { valid: false, error: 'Backup settings records are invalid.' };
      counts[store] = items.length;
      fallbackCounts[store] = 0;
    }
    return {
      valid: true,
      summary: { version: 2, createdAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined, recordCounts: counts, fallbackRecordCounts: fallbackCounts, pendingPaymentCount: 0 },
    };
  }

  public validateBackup(jsonString: string): BackupValidationResult {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.appName !== 'Contractor Money Flow') return { valid: false, error: 'Backup application identity is invalid.' };
      if (parsed.version === 2) return this.summarizeV2(parsed);
      if (parsed.version !== 3 || !parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) return { valid: false, error: 'Backup version or data section is unsupported.' };

      const names = Object.keys(parsed.data);
      if (names.length !== BACKUP_STORES.length + 1 || BACKUP_STORES.some((store) => !Object.hasOwn(parsed.data, store)) || !Object.hasOwn(parsed.data, 'pendingGcashPayments')) {
        return { valid: false, error: 'Version 3 backup is incomplete.' };
      }
      const counts = {} as BackupSummary['recordCounts'];
      const fallbackCounts = {} as BackupSummary['fallbackRecordCounts'];
      for (const store of BACKUP_STORES) {
        const records = parsed.data[store];
        if (!validRecordArray(records)) return { valid: false, error: `Backup records are invalid in ${store}.` };
        if (store === 'keyval' && records.some((item) => !Object.hasOwn(item, 'value'))) return { valid: false, error: 'Backup settings records are invalid.' };
        counts[store] = records.length;
      }
      if (!validPendingPayments(parsed.data.pendingGcashPayments)) return { valid: false, error: 'Pending GCash payment records are invalid.' };
      const metadata = parsed.metadata;
      if (!metadata || typeof metadata !== 'object' || typeof metadata.createdAt !== 'string' || Number.isNaN(Date.parse(metadata.createdAt)) || typeof metadata.applicationVersion !== 'string' || !metadata.recordCounts || !metadata.fallbackRecordCounts) {
        return { valid: false, error: 'Backup metadata is invalid.' };
      }
      if (!parsed.fallbackRecords || typeof parsed.fallbackRecords !== 'object' || Array.isArray(parsed.fallbackRecords) || BACKUP_STORES.some((store) => !Object.hasOwn(parsed.fallbackRecords, store))) {
        return { valid: false, error: 'Fallback record section is incomplete.' };
      }
      for (const store of BACKUP_STORES) {
        const fallbackRecords = parsed.fallbackRecords[store];
        if (!validRecordArray(fallbackRecords)) return { valid: false, error: `Fallback records are invalid in ${store}.` };
        fallbackCounts[store] = fallbackRecords.length;
        if (metadata.recordCounts[store] !== counts[store] || metadata.fallbackRecordCounts[store] !== fallbackRecords.length) {
          return { valid: false, error: `Record count verification failed for ${store}.` };
        }
        const merged = new Map(parsed.data[store].map((record: any) => [record.id, record]));
        if (fallbackRecords.some((record: any) => !merged.has(record.id) || !backupDataDeepEqual(merged.get(record.id), record))) {
          return { valid: false, error: `Fallback records do not match the verified ${store} records.` };
        }
      }
      if (!metadata.indexedDBRecordCounts || BACKUP_STORES.some((store) => !Number.isInteger(metadata.indexedDBRecordCounts[store]) || metadata.indexedDBRecordCounts[store] < 0) || metadata.pendingPaymentCount !== parsed.data.pendingGcashPayments.length) {
        return { valid: false, error: 'Backup record-count metadata is incomplete or inconsistent.' };
      }
      return {
        valid: true,
        summary: { version: 3, createdAt: metadata.createdAt, applicationVersion: metadata.applicationVersion, recordCounts: counts, fallbackRecordCounts: fallbackCounts, pendingPaymentCount: parsed.data.pendingGcashPayments.length },
      };
    } catch {
      return { valid: false, error: 'Backup file is not valid JSON.' };
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
    const indexedDbRecords = emptyStoreRecords();
    const fallbackRecords = this.getLocalStorageFallbackRecords();
    let indexedDb: IDBDatabase | null;
    try {
      indexedDb = await this.init();
    } catch (error) {
      throw new Error(`Could not safely read IndexedDB for backup: ${String(error)}`);
    }
    if (indexedDb) {
      for (const store of BACKUP_STORES) {
        const storeObject = await this.getStore(store, 'readonly');
        indexedDbRecords[store] = await new Promise((resolve, reject) => {
          const request = storeObject.getAll();
          request.onsuccess = () => resolve((request.result as StoreRecords[typeof store]) || []);
          request.onerror = () => reject(request.error || new Error(`Could not read IndexedDB store ${store}.`));
        });
      }
    }

    const { records, conflicts } = this.mergeStoreRecords(indexedDbRecords, fallbackRecords);
    if (conflicts.length) throw new BackupConflictError(conflicts);
    for (const store of BACKUP_STORES) {
      if (!validRecordArray(records[store])) throw new Error(`Could not safely export records in ${store}.`);
      if (store === 'keyval' && records[store].some((item) => !Object.hasOwn(item, 'value'))) throw new Error('Could not safely export settings records.');
    }

    const paymentRaw = localStorage.getItem(PENDING_PAYMENTS_KEY);
    let pendingGcashPayments: unknown = [];
    if (paymentRaw !== null) {
      try { pendingGcashPayments = JSON.parse(paymentRaw); } catch { throw new Error('The pending GCash payment list is unreadable; no backup was created.'); }
    }
    if (!validPendingPayments(pendingGcashPayments)) throw new Error('The pending GCash payment list is invalid; no backup was created.');

    const now = new Date().toISOString();
    const recordCounts = Object.fromEntries(BACKUP_STORES.map((store) => [store, records[store].length])) as Record<StoreName, number>;
    const fallbackRecordCounts = Object.fromEntries(BACKUP_STORES.map((store) => [store, fallbackRecords[store].length])) as Record<StoreName, number>;
    const indexedDBRecordCounts = Object.fromEntries(BACKUP_STORES.map((store) => [store, indexedDbRecords[store].length])) as Record<StoreName, number>;
    const backup = {
      version: 3,
      appName: 'Contractor Money Flow',
      metadata: {
        createdAt: now,
        applicationVersion: import.meta.env?.VITE_APP_VERSION || '1.0',
        recordCounts,
        indexedDBRecordCounts,
        fallbackRecordCounts,
        pendingPaymentCount: pendingGcashPayments.length,
      },
      fallbackRecords,
      data: { ...records, pendingGcashPayments },
    };
    const json = JSON.stringify(backup, null, 2);
    const verification = this.validateBackup(json);
    if (!verification.valid) throw new Error(`Export verification failed: ${verification.error || 'unknown validation error'}`);
    return json;
  }

  public async importBackup(jsonString: string): Promise<boolean> {
    try {
      await this.restoreBackup(jsonString);
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }

  public async restoreBackup(jsonString: string): Promise<BackupSummary> {
    const validation = this.validateBackup(jsonString);
    if (!validation.valid || !validation.summary) throw new Error(validation.error || 'Backup validation failed.');
    const parsed = JSON.parse(jsonString);
    const incoming = emptyStoreRecords();
    for (const store of BACKUP_STORES) incoming[store] = (parsed.data[store] ?? (store === 'drafts' ? [] : undefined)) as StoreRecords[typeof store];
    const restorePayments = parsed.version === 3 ? parsed.data.pendingGcashPayments as unknown[] : undefined;

    const db = await this.init();
    if (!db) throw new Error('IndexedDB is unavailable; existing data was not changed.');
    const snapshot: RecoverySnapshot = {
      stores: await this.getCurrentStoreRecords(),
      localStorageEntries: this.readRecognizedLocalStorageEntries(),
    };
    const recoveryDb = await openRecoveryDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = recoveryDb.transaction(RECOVERY_STORE_NAME, 'readwrite');
        tx.objectStore(RECOVERY_STORE_NAME).put({ id: RECOVERY_JOURNAL_ID, phase: 'prepared', snapshot });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Could not save the restore recovery snapshot.'));
        tx.onabort = () => reject(tx.error || new Error('Could not save the restore recovery snapshot.'));
      });
    } finally {
      recoveryDb.close();
    }

    try {
      await this.replaceStoreRecords(db, incoming);
      this.writeLocalStorageRecords(incoming, restorePayments);
      const journalDb = await openRecoveryDatabase();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = journalDb.transaction(RECOVERY_STORE_NAME, 'readwrite');
          tx.objectStore(RECOVERY_STORE_NAME).put({ id: RECOVERY_JOURNAL_ID, phase: 'committed', snapshot });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error || new Error('Could not finalize restore recovery.'));
          tx.onabort = () => reject(tx.error || new Error('Could not finalize restore recovery.'));
        });
      } finally {
        journalDb.close();
      }
      this.refreshMemoryCache(incoming);
      try { await this.removeRecoveryJournal(); } catch (cleanupError) {
        // The committed journal is safe; startup recovery only removes its snapshot.
        console.warn('Restore succeeded; recovery snapshot cleanup will retry on next launch.', cleanupError);
      }
      return validation.summary;
    } catch (restoreError) {
      try {
        await this.restoreSnapshot(snapshot);
        await this.removeRecoveryJournal();
      } catch (rollbackError) {
        throw new Error(`Restore failed and recovery is still pending. Keep this app open and restart it to retry recovery. Restore error: ${String(restoreError)} Recovery error: ${String(rollbackError)}`);
      }
      throw new Error(`Restore failed. Existing data was recovered and remains unchanged. ${String(restoreError)}`);
    }
  }

  private async replaceStoreRecords(db: IDBDatabase, records: StoreRecords): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([...BACKUP_STORES], 'readwrite');
      for (const storeName of BACKUP_STORES) {
        const store = tx.objectStore(storeName);
        store.clear();
        for (const item of records[storeName]) store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Backup replacement transaction failed.'));
      tx.onabort = () => reject(tx.error || new Error('Backup replacement transaction was aborted.'));
    });
  }

  private writeLocalStorageRecords(records: StoreRecords, payments?: unknown[]): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && ((payments !== undefined && key === PENDING_PAYMENTS_KEY) || BACKUP_STORES.some((store) => key.startsWith(`mft_${store}_`)))) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    for (const store of BACKUP_STORES) {
      for (const item of records[store]) localStorage.setItem(`mft_${store}_${item.id}`, JSON.stringify(item));
    }
    if (payments) localStorage.setItem(PENDING_PAYMENTS_KEY, JSON.stringify(payments));
  }

  private refreshMemoryCache(records: StoreRecords): void {
    this.memoryCache.clear();
    for (const store of BACKUP_STORES) {
      for (const item of records[store]) this.memoryCache.set(`${store}:${item.id}`, item);
    }
  }

  private async restoreSnapshot(snapshot: RecoverySnapshot): Promise<void> {
    const currentDb = await this.init();
    if (!currentDb) throw new Error('IndexedDB is unavailable during restore recovery.');
    await this.replaceStoreRecords(currentDb, snapshot.stores);
    const prefixes = BACKUP_STORES.map((store) => `mft_${store}_`);
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key === PENDING_PAYMENTS_KEY || prefixes.some((prefix) => key.startsWith(prefix)))) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    snapshot.localStorageEntries.forEach(([key, value]) => localStorage.setItem(key, value));
    this.refreshMemoryCache(snapshot.stores);
  }

  private async removeRecoveryJournal(): Promise<void> {
    const recoveryDb = await openRecoveryDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = recoveryDb.transaction(RECOVERY_STORE_NAME, 'readwrite');
        tx.objectStore(RECOVERY_STORE_NAME).delete(RECOVERY_JOURNAL_ID);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Could not remove restore recovery snapshot.'));
        tx.onabort = () => reject(tx.error || new Error('Could not remove restore recovery snapshot.'));
      });
    } finally {
      recoveryDb.close();
    }
  }

  public async recoverInterruptedRestore(): Promise<void> {
    const recoveryDb = await openRecoveryDatabase();
    let journal: any;
    try {
      journal = await new Promise((resolve, reject) => {
        const tx = recoveryDb.transaction(RECOVERY_STORE_NAME, 'readonly');
        const request = tx.objectStore(RECOVERY_STORE_NAME).get(RECOVERY_JOURNAL_ID);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Could not inspect restore recovery state.'));
      });
    } finally {
      recoveryDb.close();
    }
    if (!journal) return;
    if (journal.phase !== 'committed') {
      await this.restoreSnapshot(journal.snapshot as RecoverySnapshot);
    }
    await this.removeRecoveryJournal();
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
