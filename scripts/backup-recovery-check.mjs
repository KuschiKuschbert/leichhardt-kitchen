// A synthetic included-data recovery rehearsal. It accepts no archive or destination arguments.
// Every SDK operation is restricted to a literal loopback emulator and an explicit demo project.
import assert from 'node:assert/strict';
import { randomBytes, randomInt } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { decryptFile, encryptFile } from './backup-crypto.mjs';
import Cooling from '../js/cooling-core.js';

function localDemo(env) {
  const host = env.FIRESTORE_EMULATOR_HOST || '', project = env.GCLOUD_PROJECT || 'demo-test';
  const address = /^(127\.0\.0\.1|\[::1\]):([1-9]\d{0,4})$/.exec(host);
  if (!address || address[0] !== host || +address[2] > 65535 || !/^demo-[a-z0-9-]{1,24}$/.test(project) || project.trim() !== project) throw Error('Recovery rehearsal needs a literal loopback Firestore emulator and a demo project.');
  return { host, project };
}
if (process.argv.length !== 2) throw Error('This synthetic rehearsal accepts no input archive or restore destination.');
const target = localDemo(process.env);
for (const host of ['', 'firestore.googleapis.com:443', '10.0.0.2:8097', '0.0.0.0:8097', '127.0.0.1.evil:8097', '127.0.0.1:8097/path', '127.0.0.1:65536', '127.0.0.1:8097\n']) assert.throws(() => localDemo({ FIRESTORE_EMULATOR_HOST: host }));
for (const project of ['production-kitchen', 'demo-test\n']) assert.throws(() => localDemo({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8097', GCLOUD_PROJECT: project }));
assert.equal(localDemo({ FIRESTORE_EMULATOR_HOST: '[::1]:8097', GCLOUD_PROJECT: 'demo-test' }).project, 'demo-test');

const app = initializeApp({ projectId: target.project }, 'backup-recovery-check');
const db = getFirestore(app);
db.settings({ host: target.host, ssl: false });
const sourcePin = String(randomInt(100000, 1000000)), restoredPin = sourcePin === '999999' ? '100000' : String(+sourcePin + 1);
const source = db.collection('kitchens').doc(sourcePin), restored = db.collection('kitchens').doc(restoredPin);
const folder = mkdtempSync(join(tmpdir(), 'lk-backup-recovery-')), key = randomBytes(32).toString('base64');
const scripts = fileURLToPath(new URL('.', import.meta.url)), at = Date.now();
const day = n => new Date(at + 36000000 - n * 86400000).toISOString().slice(0, 10);
const dayAt = n => Date.parse(day(n) + 'T00:00:00+10:00');
const ARRAY_COLLECTIONS = ['activity', 'sections', 'prepStandards', 'learned', 'ordlearned', 'learnlog', 'summary', 'analysis', 'analysisDaily', 'references', 'training', 'proofHistory', 'dashwatch', 'misses', 'views', 'guides', 'mail', 'mailstat', 'drinks', 'shifts', 'daily', 'todos', 'team', 'cutdone', 'transferOpen',
  'deliveries', 'cleaningTasks', 'cleaningDone', 'cleaningActions', 'notes', 'directnotes', 'minutes', 'book', 'recipes', 'drawings', 'drawtpl', 'drawlib', 'suppliers', 'supplierlinks', 'functions', 'fncontact', 'fnsent', 'fnseen'];
const HISTORIES = { referencesHist: ['references', 'hist'], trainingHist: ['training', 'hist'], notesSeen: ['notes', 'seen'], directnotesSeen: ['directnotes', 'seen'], minutesHist: ['minutes', 'hist'], minutesSigns: ['minutes', 'signs'], recipesHist: ['recipes', 'hist'], drawingsHist: ['drawings', 'hist'], supplierOrders: ['suppliers', 'orders'], supplierAudit: ['suppliers', 'audit'], functionsHist: ['functions', 'hist'] };
const DATED = { days: ['days', 'items'], orders: ['orders', 'lines'], waste: ['waste', 'lines'], transfers: ['transfers', 'lines'] };
const EXPECTED_FIELDS = ['exportedAt', 'by', 'config', 'pins', 'wasteReviews', 'coolingCurrent', 'coolingRecorded', ...ARRAY_COLLECTIONS, ...Object.keys(HISTORIES), ...Object.keys(DATED)].sort();
const identities = Object.fromEntries(ARRAY_COLLECTIONS.map(name => [name, name + '-sample']));
Object.assign(identities, { activity: 'cook-a', drinks: 'cook-a', book: 'index', references: 'ref-a', training: 'training-a', notes: 'note-a', directnotes: 'direct-a', minutes: 'meeting-a', recipes: 'recipe-a', drawings: 'drawing-a', suppliers: 'supplier-a', functions: 'function-a' });
identities.cleaningDone = day(2) + '_' + identities.cleaningTasks + '__daily';
identities.cleaningActions = identities.cleaningDone + '_v1';
const standard = { sectionId: identities.sections, name: 'Synthetic dressing', aliases: ['Synthetic sauce'], minimum: 1.25, unit: 'L', instruction: 'Check the labelled date and chill before service.', recipe: 'recipe-a', archived: false, v: 2, at: at - 60 * 86400000, by: 'cook-a' };
const prepStandards = [
  { id: identities.prepStandards, ...standard },
  { id: 'standard-zero', ...standard, name: 'Synthetic zero minimum', minimum: 0, aliases: [], instruction: '', recipe: '' },
  { id: 'standard-unset', ...standard, name: 'Synthetic unset minimum', minimum: null },
  { id: 'standard-archived', ...standard, name: 'Synthetic archived standard', archived: true, v: 3 }
].sort((a, b) => a.id.localeCompare(b.id));
const capabilityIds = { addIds: ['cook-a'], tickIds: ['cook-a', 'worker-a'], delIds: ['cook-a'] };
const orderEffect = text => ({ text, qty: '2 platters', recipes: ['recipe-a'], fn: 'function-a', dupOk: true });
const effects = { prep: { 'fn-function-a-recipe-a': { text: 'Synthetic platter: Synthetic function', qty: '2 platters', station: 'Functions', recipe: 'recipe-a', fn: 'function-a', dupOk: true } },
  order: orderEffect('Function stock: Synthetic function'), cancel: orderEffect('Function cancelled, check the order: Synthetic function'), restore: orderEffect('Function restored, check the order: Synthetic function') };
let ownSource = false, ownRestored = false, recordCount = 0;
const document = (root, path) => db.doc(root.path + '/' + (Array.isArray(path) ? path.join('/') : path));
const put = (root, path, data) => document(root, path).set(data);
function exportFile(pin, filename) {
  const run = spawnSync(process.execPath, [join(scripts, 'nightly-backup.mjs'), filename], { cwd: scripts, env: { ...process.env, FIRESTORE_EMULATOR_HOST: target.host, GCLOUD_PROJECT: target.project, KITCHEN_PIN: pin, BACKUP_DAYS: '3', BACKUP_NOW: String(at), PREV_BACKUP: '' }, encoding: 'utf8' });
  assert.equal(run.error, undefined); assert.equal(run.status, 0, 'The actual nightly exporter must finish.');
  assert(!run.stdout.includes(key) && !run.stderr.includes(key));
  assert.equal(statSync(filename).mode & 0o777, 0o600);
  return JSON.parse(readFileSync(filename, 'utf8'));
}
function record(path, data, rows) {
  assert(data && typeof data === 'object' && !Array.isArray(data), 'Every restored document needs object data.');
  rows.push([path, data]);
}
function flatten(archive) {
  assert.deepEqual(Object.keys(archive).sort(), EXPECTED_FIELDS, 'An added or omitted backup section requires an explicit recovery mapping.');
  const rows = [];
  record(['config', 'main'], archive.config, rows);
  function list(records, prefix) {
    assert(Array.isArray(records));
    for (const item of records) {
      assert(item && typeof item.id === 'string' && item.id && !item.id.includes('/'));
      const { id, ...data } = item; record(prefix.concat(id), data, rows);
    }
  }
  for (const name of ARRAY_COLLECTIONS) list(archive[name], [name]);
  // Restore exact accepted starts as Timestamps, never numeric milliseconds or a new serverTimestamp().
  // A restored elapsed timer can show its ping on the next signed-in open app; it does not start another stage.
  if (archive.coolingCurrent !== null) {
    assert(Cooling.parse(archive.coolingCurrent), 'The included cooling record must have valid Timestamp starts and stage order.');
    const current = { ...archive.coolingCurrent };
    for (const field of ['firstAt', 'secondAt']) if (current[field] !== 0) current[field] = new Timestamp(current[field].seconds, current[field].nanoseconds);
    record(['cooling', 'current'], current, rows);
  }
  if (archive.coolingRecorded !== null) {
    assert(Cooling.parseRecorded(archive.coolingRecorded), 'The included recording confirmation must retain valid timestamps and actors.');
    const recorded = { ...archive.coolingRecorded };
    for (const field of ['firstAt', 'secondAt']) if (recorded[field] !== 0) recorded[field] = new Timestamp(recorded[field].seconds, recorded[field].nanoseconds);
    record(['cooling', 'recorded'], recorded, rows);
  }
  for (const [field, [collection, sub]] of Object.entries(HISTORIES)) for (const [id, records] of Object.entries(archive[field])) list(records, [collection, id, sub]);
  for (const [field, [collection, sub]] of Object.entries(DATED)) for (const [date, records] of Object.entries(archive[field])) list(records, [collection, date, sub]);
  for (const [date, review] of Object.entries(archive.wasteReviews)) record(['waste', date], review, rows);
  // Inventory metadata only. No PIN fingerprint, session timestamp or device authority is restored.
  list(archive.pins, ['pinset']);
  assert.equal(new Set(rows.map(([path]) => path.join('/'))).size, rows.length, 'Document identities must be unique.');
  assert(rows.length < 450, 'The synthetic rehearsal fits one atomic batch. This is not a production importer.');
  return rows;
}

try {
  assert.equal((await source.get()).exists, false); assert.equal((await source.listCollections()).length, 0);
  await source.create({ rehearsal: true }); ownSource = true;
  assert.equal((await restored.get()).exists, false); assert.equal((await restored.listCollections()).length, 0);
  await restored.create({ rehearsal: true }); ownRestored = true;
  const people = [{ id: 'cook-a', name: 'Synthetic recorder', role: 'head', active: true }, { id: 'worker-a', name: 'Synthetic preparer', role: 'staff', active: true }];
  await put(source, 'config/main', { people, staffIds: people.map(x => x.id), headId: 'cook-a', sousIds: ['cook-a'], ...capabilityIds, proofWords: ['burrata'], proofV: 2 });
  for (const name of ARRAY_COLLECTIONS) {
    if (name === 'prepStandards') continue;
    let data = { text: 'Synthetic ' + name, v: 2, by: 'cook-a', at: Timestamp.fromMillis(at), nested: { zero: 0, missing: null, labels: ['°C', 'quotes " and commas,'] } };
    if (name === 'cleaningTasks') data = { root: identities.cleaningTasks, prev: '', next: 'cleaning-revision-2', text: 'Synthetic original cleaning job', area: 'Synthetic area', section: '', sectionName: '', shared: true, dows: [0, 1, 2, 3, 4, 5, 6], guide: '', from: dayAt(5), until: dayAt(1), at: dayAt(5) + 60000, by: 'cook-a', plan: { template: 'synthetic', method: 'Synthetic method', responsibility: 'Synthetic role', checks: ['Synthetic required check'], timing: 'daily', verification: false, verifiers: [], review: '' } };
    if (name === 'cleaningDone') data = { day: day(2), task: identities.cleaningTasks, version: 1, done: true, doneAt: dayAt(2) + 3600000, doneById: 'cook-a', doneBy: 'Synthetic recorder', workerId: 'worker-a', worker: 'Synthetic cleaner', by: 'cook-a', flow: { slot: 'daily', kind: 'daily', status: 'complete', checked: ['Synthetic required check'], note: '', verifiedBy: '', verifiedAt: 0 } };
    if (name === 'cleaningActions') data = { day: day(2), task: identities.cleaningTasks, occurrence: identities.cleaningDone, version: 1, action: 'perform', at: Timestamp.fromMillis(dayAt(2) + 3600000), by: 'cook-a', snapshot: { day: day(2), task: identities.cleaningTasks, version: 1, done: true, doneAt: dayAt(2) + 3600000, doneById: 'cook-a', doneBy: 'Synthetic recorder', workerId: 'worker-a', worker: 'Synthetic cleaner', by: 'cook-a', flow: { slot: 'daily', kind: 'daily', status: 'complete', checked: ['Synthetic required check'], note: '', verifiedBy: '', verifiedAt: 0 } } };
    if (name === 'deliveries') Object.assign(data, { supplier: 'Synthetic supplier', day: day(0), chilled: 0, frozen: -18.5, receivedById: 'cook-a', receivedAt: at - 60000, recordedAt: at });
    if (name === 'guides') Object.assign(data, { title: 'Synthetic guide', pages: 1, thumb: 'synthetic-small-picture', words: 'Included words' });
    if (name === 'transferOpen') Object.assign(data, { date: day(4), line: 'old-loan', amount: 3, unit: 'kg', returned: false });
    if (name === 'functions') Object.assign(data, { name: 'Synthetic function', status: 'cancelled', date: day(0), rounds: [{ at: at + 3600000 }], lines: [{ rid: 'recipe-a', name: 'Synthetic platter', unit: 'platter', qty: 2, u: [0, 0] }], effects, removed: false });
    if (name === 'recipes') Object.assign(data, { r: { id: 'recipe-a', kind: 'main', name: 'Synthetic recipe', yield: 'Per plate', ingredients: [], pins: [], sections: [], art: '@drawing-a' }, src: 'new', base: '', removed: false, upd: at });
    if (name === 'drawings') Object.assign(data, { rid: 'recipe-a', slot: 'plate', name: 'Synthetic plate', vb: '-110 -110 220 220', k: 1, surf: { fam: 'plate', size: 30 }, els: [], defs: '{}', svgS: '<circle cx="0" cy="0" r="100" fill="#FFFFFF"/>', svgF: '', alt: 'Synthetic drawing', layout: { auto: 1 }, removed: false, upd: at });
    if (name === 'training') Object.assign(data, { person: 'worker-a', source: 'recipe-a', scope: 'synthetic-only' });
    await put(source, name + '/' + identities[name], data);
  }
  for (const { id, ...data } of prepStandards) await put(source, 'prepStandards/' + id, data);
  const firstStart = new Timestamp((dayAt(4) + 10.5 * 3600000) / 1000, 123456000);
  const oldCooling = { v: 1, run: 'cooling-current-older', rev: 2, windowAt: dayAt(4) + 10 * 3600000, firstAt: firstStart, firstBy: 'cook-a',
    secondAt: new Timestamp(firstStart.seconds + 7200 + 600, 789012000), secondBy: 'worker-a', by: 'worker-a' };
  await put(source, 'cooling/current', oldCooling);
  const oldRecorded = { v: 1, run: oldCooling.run,
    firstAt: new Timestamp(firstStart.seconds + 7200 + 30, 234567000), firstBy: 'worker-a',
    secondAt: new Timestamp(oldCooling.secondAt.seconds + 14400 + 30, 890123000), secondBy: 'cook-a', by: 'cook-a' };
  await put(source, 'cooling/recorded', oldRecorded);
  await put(source, 'cooling/unrelated', { excluded: 'synthetic-excluded-cooling-document' });
  await put(source, 'deliveries/delivery-null', { day: day(1), chilled: null, frozen: 0, receivedById: 'worker-a', by: 'cook-a', receivedAt: at - 86400000, recordedAt: at });
  await put(source, 'deliveries/outside-window', { day: day(4), chilled: 1, frozen: -19, receivedById: 'cook-a', by: 'cook-a' });
  await put(source, 'cleaningTasks/cleaning-revision-2', { root: identities.cleaningTasks, prev: identities.cleaningTasks, next: '', text: 'Synthetic revised cleaning job', area: 'Synthetic area', section: 'synthetic-section', sectionName: 'Synthetic section', shared: false, dows: [0, 1, 2, 3, 4, 5, 6], guide: 'synthetic-guide', from: dayAt(1), until: 253402178400000, at: dayAt(2) + 3600000, by: 'cook-a' });
  await put(source, 'cleaningTasks/cleaning-archived', { root: 'cleaning-archived', prev: '', next: '', text: 'Synthetic archived cleaning job', area: 'Synthetic area', section: '', sectionName: '', shared: true, dows: [0], guide: '', from: dayAt(20), until: dayAt(10), at: dayAt(20) + 60000, by: 'cook-a' });
  const reopenedCleaning = { day: day(0), task: 'cleaning-revision-2', version: 2, done: false, doneAt: at - 60000, doneById: 'cook-a', doneBy: 'Synthetic recorder', workerId: 'worker-a', worker: 'Synthetic cleaner', by: 'cook-a' };
  await put(source, 'cleaningDone/' + day(0) + '_cleaning-revision-2', reopenedCleaning);
  await put(source, 'cleaningDone/' + day(4) + '_' + identities.cleaningTasks, { ...reopenedCleaning, day: day(4), task: identities.cleaningTasks, version: 1, done: true, doneAt: dayAt(4) + 3600000 });
  await put(source, 'cleaningDone/' + day(-1) + '_cleaning-revision-2', { ...reopenedCleaning, day: day(-1), version: 1, done: true, doneAt: dayAt(-1) + 3600000 });
  await put(source, 'cleaningActions/' + day(4) + '_old-action_v1', { day: day(4), task: identities.cleaningTasks, version: 1, note: 'Outside backup window' });
  await put(source, 'cleaningActions/' + day(-1) + '_future-action_v1', { day: day(-1), task: identities.cleaningTasks, version: 1, note: 'Future action' });
  for (const [field, [collection, sub]] of Object.entries(HISTORIES)) await put(source, [collection, identities[collection], sub, 'version-1'].join('/'), { v: 1, event: field, by: 'cook-a', at: Timestamp.fromMillis(at - 1000), original: 'Original synthetic wording',
    ...(field === 'functionsHist' ? { was: { v: 1, status: 'confirmed', effects } } : {}) });
  for (const [field, [collection, sub]] of Object.entries(DATED)) {
    const line = { text: 'Synthetic ' + field, qty: '2 tubs', amount: 1.25, unit: 'kg', addedById: 'cook-a', by: 'cook-a', at: Timestamp.fromMillis(at), v: 2 };
    if (field === 'days') Object.assign(line, { done: true, doneById: 'cook-a', doneBy: 'Synthetic recorder', doneAt: at, preparedById: 'worker-a', preparedBy: 'Synthetic preparer', preparedAt: at, orig: 'Original synthetic prep', proofV: 2 });
    if (field === 'orders') Object.assign(line, { ordered: true, orderedById: 'cook-a', proofV: 2, orig: 'Original synthetic order' });
    if (field === 'transfers') Object.assign(line, { dir: 'out', venue: 'Synthetic venue', returned: true, returnedById: 'worker-a', returnedAt: at, originalAmount: 1.25 });
    await put(source, [collection, day(0), sub, field + '-line'].join('/'), line);
    await put(source, [collection, day(4), sub, 'outside-window'].join('/'), { text: 'Outside the selected window', by: 'cook-a' });
  }
  await put(source, 'waste/' + day(0), { reviewV: 2, reviewedById: 'cook-a', review: 'Synthetic daily review' });
  await put(source, 'pinset/cook-a', { name: 'Synthetic recorder', setAt: at, at: at - 5000 });
  await put(source, 'staffpins/cook-a', { hash: 'synthetic-excluded-fingerprint' });
  for (const name of ['sessions', 'adminDevices', 'push', 'pushsent']) await put(source, name + '/omitted', { authority: 'synthetic-excluded-authority' });
  await put(source, 'login/roster', { people }); await put(source, 'config/admins', { excluded: true });
  await put(source, 'guides/' + identities.guides + '/pages/0', { img: 'synthetic-excluded-page-picture', v: 2 });

  const originalFile = join(folder, 'source.json'), encryptedFile = join(folder, 'protected.json.enc'), recoveredFile = join(folder, 'verified.json');
  const original = exportFile(sourcePin, originalFile);
  assert.deepEqual(original.prepStandards, prepStandards, 'Full active and archived standards survive regardless of age, preserving zero and unset minima, section identity, aliases, guidance and recipe links.');
  for (const [field, ids] of Object.entries(capabilityIds)) assert.deepEqual(original.config[field], ids, 'Canonical action ids must be included exactly.');
  assert.deepEqual(original.functions.find(x => x.id === identities.functions).effects, effects);
  assert.deepEqual(original.functionsHist[identities.functions][0].was.effects, effects);
  assert.equal(original.deliveries.length, 2); assert(!original.deliveries.some(x => x.id === 'outside-window'));
  const archivedCooling = { ...oldCooling, firstAt: { seconds: oldCooling.firstAt.seconds, nanoseconds: oldCooling.firstAt.nanoseconds },
    secondAt: { seconds: oldCooling.secondAt.seconds, nanoseconds: oldCooling.secondAt.nanoseconds } };
  assert.deepEqual(original.coolingCurrent, archivedCooling, 'The named current cooling record retains its exact daily-window stamp and Timestamp components outside the date window.');
  const archivedRecorded = { ...oldRecorded, firstAt: { seconds: oldRecorded.firstAt.seconds, nanoseconds: oldRecorded.firstAt.nanoseconds },
    secondAt: { seconds: oldRecorded.secondAt.seconds, nanoseconds: oldRecorded.secondAt.nanoseconds } };
  assert.deepEqual(original.coolingRecorded, archivedRecorded, 'Recording confirmations retain their exact run, actors and Timestamp components outside the date window.');
  assert(!JSON.stringify(original).includes('synthetic-excluded-cooling'), 'The exporter reads only the two named cooling documents.');
  assert.equal(original.cleaningTasks.length, 3, 'Every cleaning revision survives, including archived schedules older than the selected window.');
  assert.equal(original.cleaningDone.length, 2, 'Only cleaning completion records inside the selected window are included.');
  assert(original.cleaningDone.every(x => x.day >= day(2) && x.day <= day(0)));
  assert.equal(original.cleaningActions.length, 1, 'Only immutable cleaning actions inside the selected window are included.');
  assert.equal(original.cleaningActions[0].id, identities.cleaningActions);
  assert.equal(original.cleaningActions[0].snapshot.flow.checked[0], 'Synthetic required check');
  const cleaningStamp = original.cleaningDone.find(x => x.id === identities.cleaningDone);
  assert.deepEqual(original.cleaningActions[0].snapshot, Object.fromEntries(Object.entries(cleaningStamp).filter(([field]) => field !== 'id')), 'The immutable action retains the exact enhanced occurrence snapshot.');
  assert.equal(cleaningStamp.doneById, 'cook-a'); assert.equal(cleaningStamp.workerId, 'worker-a'); assert.equal(cleaningStamp.doneAt, dayAt(2) + 3600000);
  assert.deepEqual(original.cleaningDone.find(x => x.id === day(0) + '_cleaning-revision-2'), { ...reopenedCleaning, id: day(0) + '_cleaning-revision-2' }, 'Undo retains the original worker and recorder stamp with its incremented version.');
  assert.equal(original.cleaningTasks.find(x => x.id === identities.cleaningTasks).next, 'cleaning-revision-2');
  assert.equal(original.cleaningTasks.find(x => x.id === 'cleaning-revision-2').prev, identities.cleaningTasks);
  assert.equal(original.days[day(4)], undefined); assert.equal(original.transfers[day(4)], undefined);
  assert(original.transferOpen.some(x => x.date === day(4)), 'The included older outstanding index survives independently of the bounded dated window.');
  const immutable = original.days[day(0)][0]; assert.equal(immutable.doneById, 'cook-a'); assert.equal(immutable.preparedById, 'worker-a'); assert.equal(immutable.doneAt, immutable.preparedAt);
  const rows = flatten(original); recordCount = rows.length;
  encryptFile(originalFile, encryptedFile, key); decryptFile(encryptedFile, recoveredFile, key);
  const recovered = JSON.parse(readFileSync(recoveredFile, 'utf8')); assert.deepEqual(recovered, original);
  assert.equal(statSync(recoveredFile).mode & 0o777, 0o600);
  assert.equal((await restored.listCollections()).length, 0, 'No target document is written before validation completes.');
  const invalid = { ...recovered, unexpectedSection: [] }; assert.throws(() => flatten(invalid));
  assert.throws(() => flatten({ ...recovered, coolingCurrent: { ...archivedCooling, firstAt: oldCooling.firstAt.toMillis() } }), 'Numeric starts cannot be restored as canonical cooling timestamps.');
  assert.throws(() => flatten({ ...recovered, coolingRecorded: { ...archivedRecorded, firstAt: oldRecorded.firstAt.toMillis() } }), 'Numeric confirmation times cannot be restored as canonical cooling timestamps.');
  assert.equal((await restored.listCollections()).length, 0, 'Unknown sections fail before any target write.');
  const batch = db.batch();
  for (const [path, data] of rows) batch.set(document(restored, path), data);
  await batch.commit();
  for (const [path, data] of rows) assert.deepEqual((await document(restored, path).get()).data(), data, 'Included document identity and fields must survive.');
  for (const [field, ids] of Object.entries(capabilityIds)) assert.deepEqual((await restored.collection('config').doc('main').get()).data()[field], ids);
  assert.deepEqual((await restored.collection('functions').doc(identities.functions).get()).data().effects, effects);
  assert.deepEqual((await restored.collection('functions').doc(identities.functions).collection('hist').doc('version-1').get()).data().was.effects, effects);
  const roundTrip = exportFile(restoredPin, join(folder, 'roundtrip.json'));
  delete original.exportedAt; delete roundTrip.exportedAt;
  assert.deepEqual(roundTrip, original, 'Re-export of the recovered included data must equal the original export.');
  for (const name of ['staffpins', 'sessions', 'adminDevices', 'push', 'pushsent', 'login']) assert.equal((await restored.collection(name).get()).size, 0);
  assert.equal((await restored.collection('config').doc('admins').get()).exists, false);
  assert.equal((await restored.collection('cooling').doc('unrelated').get()).exists, false);
  assert.deepEqual((await restored.collection('cooling').doc('current').get()).data(), oldCooling);
  assert.deepEqual((await restored.collection('cooling').doc('recorded').get()).data(), oldRecorded);
  const restoredCooling = Cooling.parse((await restored.collection('cooling').doc('current').get()).data());
  assert.equal(Cooling.phase(restoredCooling, restoredCooling.secondDue + 1), 'second_due', 'Recovery preserves the elapsed deadline within the original daily window.');
  assert.equal(Cooling.phase(restoredCooling, at), Cooling.windowAt(at).open ? 'idle' : 'off_hours', 'An expired restored batch cannot revive a timer.');
  assert.equal(Cooling.alert(restoredCooling, at, {}, null), null, 'An expired restored batch cannot revive a ping even without a matching recording confirmation.');
  const tomorrowOpen = Cooling.windowAt(at).opensAt + 86400000;
  assert.equal(Cooling.phase(restoredCooling, tomorrowOpen), 'idle', 'The next 10:00 remains idle after restoring an older batch.');
  const firstOnly = { ...archivedCooling, rev: 1, secondAt: 0, secondBy: '', by: 'cook-a' };
  const firstOnlyRow = flatten({ ...recovered, coolingCurrent: firstOnly }).find(([path]) => path.join('/') === 'cooling/current');
  assert(firstOnlyRow[1].firstAt.isEqual(oldCooling.firstAt)); assert.equal(firstOnlyRow[1].secondAt, 0);
  assert.equal(Cooling.phase(Cooling.parse(firstOnlyRow[1]), at), Cooling.windowAt(at).open ? 'idle' : 'off_hours', 'Restoring an expired first stage does not revive it or start the second.');
  const legacyCooling = { ...archivedCooling }; delete legacyCooling.windowAt;
  const legacyCoolingRow = flatten({ ...recovered, coolingCurrent: legacyCooling }).find(([path]) => path.join('/') === 'cooling/current');
  assert(!Object.hasOwn(legacyCoolingRow[1], 'windowAt') && legacyCoolingRow[1].firstAt.isEqual(oldCooling.firstAt), 'Legacy cooling records remain restorable without inventing a daily-window stamp.');
  const firstRecordedOnly = { ...archivedRecorded, secondAt: 0, secondBy: '', by: 'worker-a' };
  const recordedOnlyRow = flatten({ ...recovered, coolingRecorded: firstRecordedOnly }).find(([path]) => path.join('/') === 'cooling/recorded');
  assert(recordedOnlyRow[1].firstAt.isEqual(oldRecorded.firstAt)); assert.equal(recordedOnlyRow[1].secondAt, 0);
  const previousRecorded = { ...archivedRecorded, run: 'cooling-previous-run' };
  assert.equal(flatten({ ...recovered, coolingRecorded: previousRecorded }).find(([path]) => path.join('/') === 'cooling/recorded')[1].run, previousRecorded.run,
    'A previous batch confirmation is preserved independently and cannot be mistaken for the current batch.');
  // A kitchen with no cooling data still has an explicit null current, without invented state.
  await document(restored, 'cooling/current').delete();
  await document(restored, 'cooling/recorded').delete();
  const absentCooling = exportFile(restoredPin, join(folder, 'without-cooling.json'));
  assert.equal(absentCooling.coolingCurrent, null);
  assert.equal(absentCooling.coolingRecorded, null);
  assert.equal((await restored.collection('guides').doc(identities.guides).collection('pages').get()).size, 0);
  assert.equal((await restored.collection('pinset').doc('cook-a').get()).data().at, undefined);
  console.log('Backup recovery: local demo guards, authenticated export and ' + recordCount + ' included documents round-tripped with identities, prep standards, temperatures, history and versions. Intentional omissions remain explicit.');
} finally {
  const cleanup = await Promise.allSettled([ownSource ? db.recursiveDelete(source) : undefined, ownRestored ? db.recursiveDelete(restored) : undefined]);
  try { rmSync(folder, { recursive: true, force: true }); }
  finally { await db.terminate(); await deleteApp(app); }
  assert(cleanup.every(x => x.status === 'fulfilled'), 'Synthetic emulator records must be cleaned up.');
}
