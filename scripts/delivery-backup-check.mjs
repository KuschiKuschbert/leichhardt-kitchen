// Synthetic delivery receipts prove the nightly backup window and attribution on the local emulator only.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('This check needs the local Firestore emulator.');
const db = getFirestore(initializeApp({ projectId: 'demo-test' }, 'delivery-backup-check'));
const pin = '999999', at = Date.now();
const day = ms => new Date(ms + 36000000).toISOString().slice(0, 10);
const col = db.collection('kitchens').doc(pin).collection('deliveries');
const base = { supplier: 'Test supplier', receivedAt: at - 60000, recordedAt: at, chilled: 0, frozen: -18.5, note: 'Test goods', receivedBy: 'Test receiver', receivedById: 'test-staff', by: 'test-staff' };
const folder = mkdtempSync(join(tmpdir(), 'delivery-backup-'));
try {
  await Promise.all([0, 1, 3].map(n => col.doc('test-' + n).set({ ...base, day: day(at - n * 86400000), receivedAt: at - n * 86400000 - 60000 })));
  const kitchen = db.collection('kitchens').doc(pin);
  for (const name of ['analysis', 'analysisDaily', 'references', 'training']) await kitchen.collection(name).doc('backup-test').set({ v: 2, by: 'owner' });
  for (const name of ['references', 'training']) await kitchen.collection(name).doc('backup-test').collection('hist').doc('1').set({ v: 1, by: 'owner' });
  const file = join(folder, 'backup.json');
  const run = spawnSync(process.execPath, ['nightly-backup.mjs', file], { env: { ...process.env, KITCHEN_PIN: pin, BACKUP_DAYS: '2' }, encoding: 'utf8' });
  assert.equal(run.status, 0, 'Nightly backup must complete.');
  const out = JSON.parse(readFileSync(file, 'utf8'));
  for (const name of ['analysis', 'analysisDaily', 'references', 'training']) assert.equal(out[name][0].v, 2);
  for (const name of ['references', 'training']) assert.equal(out[name + 'Hist']['backup-test'][0].v, 1);
  assert.equal(out.deliveries.length, 2, 'Only the selected backup date window is read.');
  for (const r of out.deliveries) {
    assert.equal(r.chilled, 0); assert.equal(r.frozen, -18.5);
    assert.equal(r.receivedById, 'test-staff'); assert.equal(r.by, 'test-staff');
    assert.equal(r.note, 'Test goods'); assert.equal(r.recordedAt, at);
  }
  console.log('Delivery backup: window, zero, negative readings, notes and original receiver passed.');
} finally {
  await Promise.all([0, 1, 3].map(n => col.doc('test-' + n).delete()));
  for (const name of ['analysis', 'analysisDaily', 'references', 'training']) await db.recursiveDelete(db.collection('kitchens').doc(pin).collection(name).doc('backup-test'));
  rmSync(folder, { recursive: true, force: true });
  await db.terminate();
}
