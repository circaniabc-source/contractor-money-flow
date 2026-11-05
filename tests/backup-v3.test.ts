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

const { db, BACKUP_STORES, BackupConflictError, backupDataDeepEqual } = await import('../src/services/storage.ts');
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

test('identical records with different property insertion order are deduplicated without conflict', async () => {
  await resetTestData();
  const indexedDbRecord = { id: 'same-order', description: 'Concrete', amount: 1250, status: 'paid' };
  await seedRecord('transactions', indexedDbRecord);
  memoryStorage.setItem('mft_transactions_same-order', JSON.stringify({ status: 'paid', amount: 1250, id: 'same-order', description: 'Concrete' }));

  const backup = JSON.parse(await db.exportBackup());
  assert.equal(backup.data.transactions.length, 1);
  assert.deepEqual(backup.data.transactions[0], indexedDbRecord);
});

test('identical records with nested objects in different insertion order are deduplicated', async () => {
  await resetTestData();
  const indexedDbRecord = {
    id: 'same-nested',
    amount: 2800,
    details: { category: 'Materials', vendor: { name: 'North Supply', city: 'Bacolod' } },
  };
  await seedRecord('transactions', indexedDbRecord);
  memoryStorage.setItem('mft_transactions_same-nested', JSON.stringify({
    details: { vendor: { city: 'Bacolod', name: 'North Supply' }, category: 'Materials' },
    id: 'same-nested',
    amount: 2800,
  }));

  const backup = JSON.parse(await db.exportBackup());
  assert.equal(backup.data.transactions.length, 1);
  assert.deepEqual(backup.data.transactions[0], indexedDbRecord);
});

test('four synthetic Transaction-schema pairs with undefined transferToMethod export without conflicts', async () => {
  await resetTestData();
  const records = [
    { id: 'fixture-transaction-1', projectId: 'project-a', type: 'expense', amount: 1250, category: 'Materials', paymentMethod: 'Cash', paymentStatus: 'paid', date: '2026-05-01', time: '08:30', description: 'Delivery', supplierOrPayee: 'North Supply', notes: 'Synthetic fixture', transferToMethod: undefined, isEquityOrLoan: false, createdAt: 1001, updatedAt: 1001 },
    { id: 'fixture-transaction-2', projectId: 'project-a', type: 'expense', amount: 3400, category: 'Labor', paymentMethod: 'GCash', paymentStatus: 'unpaid', date: '2026-05-02', time: '09:15', description: 'Worker payment', supplierOrPayee: 'Worker A', notes: 'Synthetic fixture', transferToMethod: undefined, isEquityOrLoan: false, createdAt: 1002, updatedAt: 1002 },
    { id: 'fixture-transaction-3', projectId: 'project-b', type: 'income', amount: 7800, category: 'Collection', paymentMethod: 'Bank', paymentStatus: 'paid', date: '2026-05-03', time: '10:00', description: 'Progress billing', supplierOrPayee: 'Client B', notes: 'Synthetic fixture', transferToMethod: undefined, isEquityOrLoan: true, createdAt: 1003, updatedAt: 1003 },
    { id: 'fixture-transaction-4', projectId: 'project-b', type: 'transfer', amount: 510, category: 'Transfer', paymentMethod: 'Cash', paymentStatus: 'paid', date: '2026-05-04', time: '11:45', description: 'Cash to GCash', supplierOrPayee: 'Internal transfer', notes: 'Synthetic fixture', transferToMethod: undefined, isEquityOrLoan: false, createdAt: 1004, updatedAt: 1004 },
  ];
  for (const record of records) {
    await seedRecord('transactions', record);
    memoryStorage.setItem(`mft_transactions_${record.id}`, JSON.stringify(Object.fromEntries(Object.entries(record).reverse())));
  }

  const backup = JSON.parse(await db.exportBackup());
  assert.equal(backup.data.transactions.length, 4);
  assert.equal(backup.metadata.recordCounts.transactions, 4);
  assert.equal(backup.metadata.fallbackRecordCounts.transactions, 4);
});

test('record equality compares values and fields without requiring the same object prototype', () => {
  const indexedDbShape = Object.assign(Object.create({ source: 'IndexedDB' }), { id: 'prototype-data', details: { amount: 450 } });
  const localStorageShape = { details: { amount: 450 }, id: 'prototype-data' };
  assert.equal(backupDataDeepEqual(indexedDbShape, localStorageShape), true);
});

test('undefined object properties equal missing properties, including recursively', () => {
  assert.equal(backupDataDeepEqual({ transferToMethod: undefined }, {}), true);
  assert.equal(backupDataDeepEqual({ details: { transferToMethod: undefined } }, { details: {} }), true);
});

test('null and actual value differences remain distinct from missing properties', () => {
  assert.equal(backupDataDeepEqual({ transferToMethod: null }, {}), false);
  assert.equal(backupDataDeepEqual({ amount: 100 }, { amount: 101 }), false);
  assert.equal(backupDataDeepEqual({ label: 'Cash' }, { label: 'GCash' }), false);
  assert.equal(backupDataDeepEqual({ enabled: false }, {}), false);
});

test('different transaction amounts remain a conflict and neither copy is changed', async () => {
  await resetTestData();
  await seedRecord('transactions', { id: 'different-amount', amount: 100 });
  memoryStorage.setItem('mft_transactions_different-amount', JSON.stringify({ id: 'different-amount', amount: 101 }));
  await assert.rejects(db.exportBackup(), (error: unknown) => {
    if (!(error instanceof BackupConflictError) || !/transactions\/different-amount/.test(error.message)) return false;
    assert.deepEqual(error.conflicts[0].differences.map((difference) => difference.field), ['amount']);
    assert.equal(error.conflicts[0].differences[0].indexedDBValue, 100);
    assert.equal(error.conflicts[0].differences[0].localStorageValue, 101);
    return true;
  });
  assert.equal((await db.get('transactions', 'different-amount') as any)?.amount, 100);
  assert.equal(JSON.parse(memoryStorage.getItem('mft_transactions_different-amount')!).amount, 101);
});

test('missing or additional record fields remain conflicts', async () => {
  await resetTestData();
  await seedRecord('transactions', { id: 'missing-field', amount: 100, note: 'Original field' });
  await seedRecord('transactions', { id: 'additional-field', amount: 200 });
  memoryStorage.setItem('mft_transactions_missing-field', JSON.stringify({ id: 'missing-field', amount: 100 }));
  memoryStorage.setItem('mft_transactions_additional-field', JSON.stringify({ id: 'additional-field', amount: 200, note: 'Extra field' }));

  await assert.rejects(db.exportBackup(), (error: unknown) => {
    if (!(error instanceof BackupConflictError)) return false;
    assert.deepEqual(error.conflicts.map((conflict) => conflict.id).sort(), ['additional-field', 'missing-field']);
    assert.deepEqual(error.conflicts.find((conflict) => conflict.id === 'missing-field')?.differences.map((difference) => difference.field), ['note']);
    assert.deepEqual(error.conflicts.find((conflict) => conflict.id === 'additional-field')?.differences.map((difference) => difference.field), ['note']);
    return true;
  });
  assert.equal((await db.get('transactions', 'missing-field') as any)?.note, 'Original field');
  assert.equal(JSON.parse(memoryStorage.getItem('mft_transactions_missing-field')!).note, undefined);
  assert.equal((await db.get('transactions', 'additional-field') as any)?.note, undefined);
  assert.equal(JSON.parse(memoryStorage.getItem('mft_transactions_additional-field')!).note, 'Extra field');
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
