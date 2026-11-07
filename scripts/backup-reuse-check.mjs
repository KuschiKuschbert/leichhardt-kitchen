// Plan B 4.2 (7 Nov 2026): the nightly backup takes the days older than 14 that no fix names from last night's file
// (PREV_BACKUP), and reads every day when it cannot trust that file. Synthetic data on the local emulator only.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('This check needs the local Firestore emulator.');
const db = getFirestore(initializeApp({ projectId: 'demo-test' }, 'backup-reuse-check'));
const pin = '999998', K = db.collection('kitchens').doc(pin);
const NOW = Date.parse('2026-10-31T04:00:00Z');   // Saturday 14:00 in the kitchen
const day = n => new Date(NOW + 36000000 - n * 86400000).toISOString().slice(0, 10);
const folder = mkdtempSync(join(tmpdir(), 'backup-reuse-'));
let runs = 0;
function backup(prev, extra) {
  const file = join(folder, 'out-' + (++runs) + '.json'), env = { ...process.env, KITCHEN_PIN: pin, BACKUP_DAYS: '20', BACKUP_NOW: String(NOW), ...(extra || {}) };
  if (prev !== undefined) { const p = join(folder, 'prev-' + runs + '.json'); writeFileSync(p, typeof prev === 'string' ? prev : JSON.stringify(prev)); env.PREV_BACKUP = p; }
  const run = spawnSync(process.execPath, ['nightly-backup.mjs', file], { env, encoding: 'utf8' });
  assert.equal(run.status, 0, 'The backup must complete: ' + run.stderr);
  return { out: JSON.parse(readFileSync(file, 'utf8')), log: run.stdout };
}
const text = (out, key, d) => (out[key][d] || []).map(x => x.text).join(',');
try {
  await db.recursiveDelete(K);
  await K.collection('config').doc('main').set({ people: [] });
  await K.collection('days').doc(day(16)).collection('items').doc('b').set({ text: 'Bread now' });
  await K.collection('days').doc(day(2)).collection('items').doc('m').set({ text: 'Milk now' });
  await K.collection('waste').doc(day(17)).collection('lines').doc('w').set({ text: 'Brisket now' });
  const lastNight = { exportedAt: new Date(NOW - 86400000).toISOString(), by: 'nightly backup',
    days: { [day(16)]: [{ id: 'b', text: 'Bread last night' }], [day(2)]: [{ id: 'm', text: 'Milk last night' }] },
    orders: {}, waste: { [day(17)]: [{ id: 'w', text: 'Brisket last night' }] }, wasteReviews: { [day(17)]: { note: 'Review last night' } }, transfers: {} };

  let r = backup(lastNight);
  assert.deepEqual([text(r.out, 'days', day(16)), text(r.out, 'waste', day(17)), r.out.wasteReviews[day(17)].note], ['Bread last night', 'Brisket last night', 'Review last night'], 'Days older than 14 come from last night\'s file.');
  assert.equal(text(r.out, 'days', day(2)), 'Milk now', 'The last 14 days are read.');
  assert.match(r.log, /^6 older days taken from the last backup/m, 'The log says how many days were taken: ' + r.log);

  for (const [why, prev, extra] of [
    ['no earlier file', undefined], ['an unreadable file', '{not json'], ['a file more than 36 hours old', { ...lastNight, exportedAt: new Date(NOW - 40 * 3600000).toISOString() }],
    ['a Sunday', { ...lastNight, exportedAt: new Date(NOW).toISOString() }, { BACKUP_NOW: String(NOW + 86400000) }]]) {
    r = backup(prev, extra);
    assert.equal(text(r.out, 'days', day(16)), 'Bread now', 'With ' + why + ', every day is read.');
  }

  await K.collection('config').doc('main').set({ pastEdit: { p: NOW - 3600000, pDays: [day(16)], pPrev: 0, pFor: NOW - 3600000 } }, { merge: true });
  r = backup(lastNight);
  assert.deepEqual([text(r.out, 'days', day(16)), text(r.out, 'waste', day(17))], ['Bread now', 'Brisket last night'], 'A fix that names its day has that day read again, and only that day.');

  await K.collection('config').doc('main').set({ pastEdit: { p: NOW - 3600000, pDays: [day(16)], pPrev: NOW - 2 * 3600000, pFor: NOW - 3600000 } }, { merge: true });
  r = backup(lastNight);
  assert.equal(text(r.out, 'waste', day(17)), 'Brisket now', 'A stamp that cannot tell (its run began after last night\'s file): every day is read.');

  await K.collection('config').doc('main').set({ pastEdit: { w: NOW - 3600000, wPrev: 0, wFor: NOW - 3600000, wDays: [day(17)] } });
  r = backup(lastNight);
  assert.deepEqual([text(r.out, 'days', day(16)), text(r.out, 'waste', day(17))], ['Bread last night', 'Brisket now'], 'A wastage fix that names its day has that day read again (7 Nov 2026).');

  await K.collection('config').doc('main').set({ pastEdit: { x: NOW - 3600000 } });
  r = backup(lastNight);
  assert.equal(text(r.out, 'waste', day(17)), 'Brisket now', 'A past transfer fix names no day: every day is read.');
  await db.recursiveDelete(K);
  console.log('PASS backup reuse: old days from last night, recent and fixed days read, every day read without a trusted file, on Sundays and after an unnamed fix');
} finally { rmSync(folder, { recursive: true, force: true }); }
process.exit(0);
