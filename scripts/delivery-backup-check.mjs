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
  const proofConfig = { proofWords: ['burrata'], proofV: 2, proofEvent: 'word-test' };
  await kitchen.collection('config').doc('main').set(proofConfig);
  const proofEvents = [
    { id: 'line-test', kind: 'line', action: 'restore', source: 'prep', day: day(at), recordId: 'test-line', before: 'Cut brine', after: 'Cut brie', original: 'Cut brie', v: 1, at, by: 'test-admin' },
    { id: 'order-test', kind: 'line', action: 'edit', source: 'orders', day: day(at), recordId: 'test-line', before: 'Butter', after: 'Burrata', original: 'burrata', v: 1, at, by: 'test-admin' },
    { id: 'word-test', kind: 'word', action: 'keep', word: 'burrata', v: 2, at, by: 'test-admin' }
  ];
  for (const { id, ...event } of proofEvents) await kitchen.collection('proofHistory').doc(id).set(event);
  const prepLine = { text: 'Cut brie', orig: 'Cut brie', qty: '2 trays', done: true, doneBy: 'Test recorder', doneById: 'test-staff', doneAt: at,
    preparedBy: 'Test worker', preparedById: 'test-worker', preparedAt: at, addedBy: 'Test creator', addedById: 'test-creator', addedAt: at - 1000,
    proofV: 1, proofEvent: 'line-test', by: 'test-admin' };
  const orderLine = { text: 'Burrata', orig: 'burrata', qty: '3 tubs', ordered: true, addedById: 'test-staff', proofV: 1, proofEvent: 'order-test', by: 'test-admin' };
  await kitchen.collection('days').doc(day(at)).collection('items').doc('test-line').set(prepLine);
  await kitchen.collection('orders').doc(day(at)).collection('lines').doc('test-line').set(orderLine);
  for (const name of ['analysis', 'analysisDaily', 'references', 'training']) await kitchen.collection(name).doc('backup-test').set({ v: 2, by: 'owner' });
  for (const name of ['references', 'training']) await kitchen.collection(name).doc('backup-test').collection('hist').doc('1').set({ v: 1, by: 'owner' });
  const file = join(folder, 'backup.json');
  const run = spawnSync(process.execPath, ['nightly-backup.mjs', file], { env: { ...process.env, KITCHEN_PIN: pin, BACKUP_DAYS: '2' }, encoding: 'utf8' });
  assert.equal(run.status, 0, 'Nightly backup must complete.');
  const out = JSON.parse(readFileSync(file, 'utf8'));
  assert.deepEqual(out.config, proofConfig, 'Shared protected words and their revision must survive backup.');
  assert.deepEqual(out.proofHistory, proofEvents, 'Every immutable repair and protected-word event must survive backup.');
  assert.deepEqual(out.days[day(at)], [{ ...prepLine, id: 'test-line' }], 'Prep wording, quantities, status, immutable creator, recorder, stamped reported worker and repair revision must survive backup.');
  assert.deepEqual(out.orders[day(at)], [{ ...orderLine, id: 'test-line' }], 'Order wording, quantities, status, attribution and repair revision must survive backup.');
  for (const name of ['analysis', 'analysisDaily', 'references', 'training']) assert.equal(out[name][0].v, 2);
  for (const name of ['references', 'training']) assert.equal(out[name + 'Hist']['backup-test'][0].v, 1);
  assert.equal(out.deliveries.length, 2, 'Only the selected backup date window is read.');
  for (const r of out.deliveries) {
    assert.equal(r.chilled, 0); assert.equal(r.frozen, -18.5);
    assert.equal(r.receivedById, 'test-staff'); assert.equal(r.by, 'test-staff');
    assert.equal(r.note, 'Test goods'); assert.equal(r.recordedAt, at);
  }
  console.log('Backup: delivery window and attribution, shared protected words and immutable proofreader history passed.');
} finally {
  await Promise.all([0, 1, 3].map(n => col.doc('test-' + n).delete()));
  for (const name of ['analysis', 'analysisDaily', 'references', 'training']) await db.recursiveDelete(db.collection('kitchens').doc(pin).collection(name).doc('backup-test'));
  await db.collection('kitchens').doc(pin).collection('config').doc('main').delete();
  for (const id of ['line-test', 'order-test', 'word-test']) await db.collection('kitchens').doc(pin).collection('proofHistory').doc(id).delete();
  await db.collection('kitchens').doc(pin).collection('days').doc(day(at)).collection('items').doc('test-line').delete();
  await db.collection('kitchens').doc(pin).collection('orders').doc(day(at)).collection('lines').doc('test-line').delete();
  rmSync(folder, { recursive: true, force: true });
  await db.terminate();
}
