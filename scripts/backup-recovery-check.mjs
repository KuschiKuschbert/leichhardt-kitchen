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
const ARRAY_COLLECTIONS = ['activity', 'sections', 'learned', 'ordlearned', 'learnlog', 'summary', 'analysis', 'analysisDaily', 'references', 'training', 'proofHistory', 'misses', 'views', 'guides', 'mail', 'mailstat', 'drinks', 'shifts', 'daily', 'todos', 'cutdone', 'transferOpen',
  'deliveries', 'notes', 'directnotes', 'minutes', 'book', 'recipes', 'drawings', 'drawtpl', 'drawlib', 'suppliers', 'supplierlinks', 'functions', 'fncontact', 'fnsent'];
const HISTORIES = { referencesHist: ['references', 'hist'], trainingHist: ['training', 'hist'], notesSeen: ['notes', 'seen'], directnotesSeen: ['directnotes', 'seen'], minutesHist: ['minutes', 'hist'], minutesSigns: ['minutes', 'signs'], recipesHist: ['recipes', 'hist'], drawingsHist: ['drawings', 'hist'], supplierOrders: ['suppliers', 'orders'], supplierAudit: ['suppliers', 'audit'], functionsHist: ['functions', 'hist'] };
const DATED = { days: ['days', 'items'], orders: ['orders', 'lines'], waste: ['waste', 'lines'], transfers: ['transfers', 'lines'] };
const EXPECTED_FIELDS = ['exportedAt', 'by', 'config', 'pins', 'wasteReviews', ...ARRAY_COLLECTIONS, ...Object.keys(HISTORIES), ...Object.keys(DATED)].sort();
const identities = Object.fromEntries(ARRAY_COLLECTIONS.map(name => [name, name + '-sample']));
Object.assign(identities, { activity: 'cook-a', drinks: 'cook-a', book: 'index', references: 'ref-a', training: 'training-a', notes: 'note-a', directnotes: 'direct-a', minutes: 'meeting-a', recipes: 'recipe-a', drawings: 'drawing-a', suppliers: 'supplier-a', functions: 'function-a' });
const capabilityIds = { addIds: ['cook-a'], tickIds: ['cook-a', 'worker-a'], delIds: ['cook-a'] };
const orderEffect = text => ({ text, qty: '2 platters', recipes: ['recipe-a'], fn: 'function-a', dupOk: true });
const effects = { prep: { 'fn-function-a-recipe-a': { text: 'Synthetic platter: Synthetic function', qty: '2 platters', station: 'Functions', recipe: 'recipe-a', fn: 'function-a', dupOk: true } },
  order: orderEffect('Function stock: Synthetic function'), cancel: orderEffect('Function cancelled, check the order: Synthetic function'), restore: orderEffect('Function restored, check the order: Synthetic function') };
let ownSource = false, ownRestored = false, recordCount = 0;
const document = (root, path) => db.doc(root.path + '/' + (Array.isArray(path) ? path.join('/') : path));
const put = (root, path, data) => document(root, path).set(data);
function exportFile(pin, filename) {
  const run = spawnSync(process.execPath, [join(scripts, 'nightly-backup.mjs'), filename], { cwd: scripts, env: { ...process.env, FIRESTORE_EMULATOR_HOST: target.host, GCLOUD_PROJECT: target.project, KITCHEN_PIN: pin, BACKUP_DAYS: '3' }, encoding: 'utf8' });
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
    const data = { text: 'Synthetic ' + name, v: 2, by: 'cook-a', at: Timestamp.fromMillis(at), nested: { zero: 0, missing: null, labels: ['°C', 'quotes " and commas,'] } };
    if (name === 'deliveries') Object.assign(data, { supplier: 'Synthetic supplier', day: day(0), chilled: 0, frozen: -18.5, receivedById: 'cook-a', receivedAt: at - 60000, recordedAt: at });
    if (name === 'guides') Object.assign(data, { title: 'Synthetic guide', pages: 1, thumb: 'synthetic-small-picture', words: 'Included words' });
    if (name === 'transferOpen') Object.assign(data, { date: day(4), line: 'old-loan', amount: 3, unit: 'kg', returned: false });
    if (name === 'functions') Object.assign(data, { name: 'Synthetic function', status: 'cancelled', date: day(0), rounds: [{ at: at + 3600000 }], lines: [{ rid: 'recipe-a', name: 'Synthetic platter', unit: 'platter', qty: 2, u: [0, 0] }], effects, removed: false });
    if (name === 'recipes') Object.assign(data, { r: { id: 'recipe-a', kind: 'main', name: 'Synthetic recipe', yield: 'Per plate', ingredients: [], pins: [], sections: [], art: '@drawing-a' }, src: 'new', base: '', removed: false, upd: at });
    if (name === 'drawings') Object.assign(data, { rid: 'recipe-a', slot: 'plate', name: 'Synthetic plate', vb: '-110 -110 220 220', k: 1, surf: { fam: 'plate', size: 30 }, els: [], defs: '{}', svgS: '<circle cx="0" cy="0" r="100" fill="#FFFFFF"/>', svgF: '', alt: 'Synthetic drawing', layout: { auto: 1 }, removed: false, upd: at });
    if (name === 'training') Object.assign(data, { person: 'worker-a', source: 'recipe-a', scope: 'synthetic-only' });
    await put(source, name + '/' + identities[name], data);
  }
  await put(source, 'deliveries/delivery-null', { day: day(1), chilled: null, frozen: 0, receivedById: 'worker-a', by: 'cook-a', receivedAt: at - 86400000, recordedAt: at });
  await put(source, 'deliveries/outside-window', { day: day(4), chilled: 1, frozen: -19, receivedById: 'cook-a', by: 'cook-a' });
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
  for (const [field, ids] of Object.entries(capabilityIds)) assert.deepEqual(original.config[field], ids, 'Canonical action ids must be included exactly.');
  assert.deepEqual(original.functions.find(x => x.id === identities.functions).effects, effects);
  assert.deepEqual(original.functionsHist[identities.functions][0].was.effects, effects);
  assert.equal(original.deliveries.length, 2); assert(!original.deliveries.some(x => x.id === 'outside-window'));
  assert.equal(original.days[day(4)], undefined); assert.equal(original.transfers[day(4)], undefined);
  assert(original.transferOpen.some(x => x.date === day(4)), 'The included older outstanding index survives independently of the bounded dated window.');
  const immutable = original.days[day(0)][0]; assert.equal(immutable.doneById, 'cook-a'); assert.equal(immutable.preparedById, 'worker-a'); assert.equal(immutable.doneAt, immutable.preparedAt);
  const rows = flatten(original); recordCount = rows.length;
  encryptFile(originalFile, encryptedFile, key); decryptFile(encryptedFile, recoveredFile, key);
  const recovered = JSON.parse(readFileSync(recoveredFile, 'utf8')); assert.deepEqual(recovered, original);
  assert.equal(statSync(recoveredFile).mode & 0o777, 0o600);
  assert.equal((await restored.listCollections()).length, 0, 'No target document is written before validation completes.');
  const invalid = { ...recovered, unexpectedSection: [] }; assert.throws(() => flatten(invalid));
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
  assert.equal((await restored.collection('guides').doc(identities.guides).collection('pages').get()).size, 0);
  assert.equal((await restored.collection('pinset').doc('cook-a').get()).data().at, undefined);
  console.log('Backup recovery: local demo guards, authenticated export and ' + recordCount + ' included documents round-tripped with identities, temperatures, history and versions. Intentional omissions remain explicit.');
} finally {
  const cleanup = await Promise.allSettled([ownSource ? db.recursiveDelete(source) : undefined, ownRestored ? db.recursiveDelete(restored) : undefined]);
  try { rmSync(folder, { recursive: true, force: true }); }
  finally { await db.terminate(); await deleteApp(app); }
  assert(cleanup.every(x => x.status === 'fulfilled'), 'Synthetic emulator records must be cleaned up.');
}
