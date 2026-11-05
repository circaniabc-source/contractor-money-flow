import { strict as assert } from 'node:assert';
import { after, before, test } from 'node:test';
import { indexedDB } from 'fake-indexeddb';

class MemoryStorage {
  private entries = new Map<string, string>();
  failOnKey: string | null = null;
  get length() { return this.entries.size; }
  key(index: number) { return [...this.entries.keys()][index] ?? null; }
  getItem(key: string) { return this.entries.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (key === this.failOnKey) throw new Error(`Simulated LocalStorage write failure for ${key}`);
    this.entries.set(key, String(value));
  }
  removeItem(key: string) { this.entries.delete(key); }
  clear() { this.entries.clear(); }
}

const globals = globalThis as any;
const memoryStorage = new MemoryStorage();
globals.indexedDB = indexedDB;
globals.localStorage = memoryStorage;
globals.window = { indexedDB, addEventListener: () => undefined };
globals.document = { addEventListener: () => undefined, visibilityState: 'visible' };

const { db, BACKUP_STORES, BackupConflictError } = await import('../src/services/storage.ts');
const { autoSave } = await import('../src/services/autoSave.ts');

async function resetTestData() {
  memoryStorage.failOnKey = null;
  try { await db.recoverInterruptedRestore(); } catch { /* A test will assert recovery behavior explicitly. */ }
  await db.clearAllData();
  memoryStorage.clear();
}

async function seedRecord(store: typeof BACKUP_STORES[number], record: Record<string, unknown> & { id: string }) {
  await db.put(store, record as any);
}

function makeV2Backup() {
  const data = Object.fromEntries(BACKUP_STORES.map((store) => [store, []]));
  (data.projects as any[]).push({ id: 'legacy-project', name: 'Legacy project' });
  return JSON.stringify({ version: 2, appName: 'Contractor Money Flow', exportedAt: '2026-01-01T00:00:00.000Z', data });
}

before(async () => resetTestData());
after(async () => resetTestData());

test('v3 export includes seven stores, fallback-only records, counts, and pending GCash references', async () => {
  await resetTestData();
  for (const store of BACKUP_STORES) await seedRecord(store, { id: `id-${store}`, ...(store === 'keyval' ? { value: { theme: 'dark', pinLockEnabled: true } } : {}) });
  memoryStorage.setItem('mft_projects_legacy-only', JSON.stringify({ id: 'legacy-only', name: 'Fallback project' }));
  memoryStorage.setItem('cmf_manual_gcash_pending_payments', JSON.stringify([{ id: 'payment-1', planId: 'cmf_pro_monthly', referenceNumber: 'REF123', submittedAt: '2026-03-01T00:00:00.000Z', status: 'pending' }]));

  const backup = JSON.parse(await db.exportBackup());
  assert.equal(backup.version, 3);
  assert.deepEqual(Object.keys(backup.data).sort(), [...BACKUP_STORES, 'pendingGcashPayments'].sort());
  assert.equal(backup.data.projects.length, 2);
  assert.equal(backup.data.pendingGcashPayments[0].status, 'pending');
  assert.equal(backup.metadata.recordCounts.projects, 2);
  assert.equal(backup.metadata.fallbackRecordCounts.projects, 2);
  assert.equal(db.validateBackup(JSON.stringify(backup)).valid, true);
});

test('queued autosaves finish before export and failed writes prevent flush success', async () => {
  await resetTestData();
  autoSave.debouncedSave('backup-flush-test', async () => {
    await db.put('keyval', { id: 'flush-value', value: 'saved before snapshot' });
  }, 60_000);
  await autoSave.flush();
  const backup = JSON.parse(await db.exportBackup());
  assert.equal(backup.data.keyval.find((item: any) => item.id === 'flush-value')?.value, 'saved before snapshot');

  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    await autoSave.immediateSave('backup-flush-failure-test', async () => { throw new Error('simulated write failure'); });
    await assert.rejects(autoSave.flush(), /backup-flush-failure-test/);
  } finally {
    console.error = originalConsoleError;
  }
  await autoSave.immediateSave('backup-flush-failure-test', async () => undefined);
});

test('conflicting IndexedDB and fallback records stop export and retain both originals', async () => {
  await resetTestData();
  await seedRecord('projects', { id: 'same-id', name: 'IndexedDB copy' });
  memoryStorage.setItem('mft_projects_same-id', JSON.stringify({ id: 'same-id', name: 'LocalStorage copy' }));
  await assert.rejects(db.exportBackup(), (error: unknown) => error instanceof BackupConflictError && /projects\/same-id/.test(error.message));
  assert.equal((await db.get('projects', 'same-id') as any)?.name, 'IndexedDB copy');
  assert.equal(JSON.parse(memoryStorage.getItem('mft_projects_same-id')!).name, 'LocalStorage copy');
});

test('version 2 restore remains supported and preserves current pending payment records', async () => {
  await resetTestData();
  await seedRecord('projects', { id: 'current', name: 'Existing' });
  memoryStorage.setItem('cmf_manual_gcash_pending_payments', JSON.stringify([{ id: 'keep-pending', planId: 'cmf_pro_yearly', referenceNumber: 'PENDING2', submittedAt: '2026-02-01T00:00:00.000Z', status: 'pending' }]));
  const summary = await db.restoreBackup(makeV2Backup());
  assert.equal(summary.version, 2);
  assert.equal(await db.get('projects', 'current'), null);
  assert.equal((await db.get('projects', 'legacy-project') as any).name, 'Legacy project');
  assert.equal(JSON.parse(memoryStorage.getItem('cmf_manual_gcash_pending_payments')!)[0].id, 'keep-pending');
});

test('corrupt backups and duplicate IDs are rejected without changing application data', async () => {
  await resetTestData();
  await seedRecord('projects', { id: 'preserved', name: 'Keep me' });
  assert.equal(db.validateBackup('{broken').valid, false);
  await assert.rejects(db.restoreBackup('{broken}'));
  const duplicate = JSON.parse(makeV2Backup());
  duplicate.data.projects.push({ id: 'legacy-project', name: 'duplicate' });
  assert.equal(db.validateBackup(JSON.stringify(duplicate)).valid, false);
  assert.equal((await db.get('projects', 'preserved') as any).name, 'Keep me');
});

test('validated restore replaces all stores, restores pending references, and is not applied by validation alone', async () => {
  await resetTestData();
  for (const store of BACKUP_STORES) await seedRecord(store, { id: `target-${store}`, ...(store === 'keyval' ? { value: { pinLockEnabled: true, pinCode: '1234', isProUser: false } } : {}) });
  memoryStorage.setItem('cmf_manual_gcash_pending_payments', JSON.stringify([{ id: 'pending-target', planId: 'cmf_pro_monthly', referenceNumber: 'PAYMENTREF', submittedAt: '2026-03-02T00:00:00.000Z', status: 'pending' }]));
  const target = await db.exportBackup();
  await resetTestData();
  await seedRecord('projects', { id: 'before-confirm', name: 'Current records' });

  const validation = db.validateBackup(target);
  assert.equal(validation.valid, true);
  assert.equal(await db.get('projects', 'target-projects'), null); // current store remains untouched by validation
  assert.notEqual(await db.get('projects', 'before-confirm'), null);
  const restored = await db.restoreBackup(target);
  assert.equal(restored.version, 3);
  assert.equal(await db.get('projects', 'before-confirm'), null);
  for (const store of BACKUP_STORES) assert.notEqual(await db.get(store, `target-${store}`), null);
  assert.equal(JSON.parse(memoryStorage.getItem('cmf_manual_gcash_pending_payments')!)[0].status, 'pending');
});

test('failed LocalStorage apply leaves a recovery journal and startup recovery restores prior data', async () => {
  await resetTestData();
  await seedRecord('projects', { id: 'target', name: 'Imported data' });
  memoryStorage.setItem('cmf_manual_gcash_pending_payments', JSON.stringify([{ id: 'new-payment', planId: 'cmf_pro_monthly', referenceNumber: 'NEW', submittedAt: '2026-03-02T00:00:00.000Z', status: 'pending' }]));
  const target = await db.exportBackup();
  await resetTestData();
  await seedRecord('projects', { id: 'original', name: 'Original data' });
  const oldPayments = JSON.stringify([{ id: 'old-payment', planId: 'cmf_pro_yearly', referenceNumber: 'OLD', submittedAt: '2026-02-02T00:00:00.000Z', status: 'pending' }]);
  memoryStorage.setItem('cmf_manual_gcash_pending_payments', oldPayments);
  memoryStorage.failOnKey = 'cmf_manual_gcash_pending_payments';

  await assert.rejects(db.restoreBackup(target), /recovery is still pending/);
  memoryStorage.failOnKey = null;
  await db.recoverInterruptedRestore();
  assert.equal((await db.get('projects', 'original') as any).name, 'Original data');
  assert.equal(await db.get('projects', 'target'), null);
  assert.equal(memoryStorage.getItem('cmf_manual_gcash_pending_payments'), oldPayments);
});
