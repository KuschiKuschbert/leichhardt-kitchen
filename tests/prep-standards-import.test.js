// Synthetic transaction checks. No credentials, real names or production records are used.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const PIN = '1234', BASE = 'kitchens/' + PIN, SERVER_TIME = 1794268800000;
const clone = value => JSON.parse(JSON.stringify(value));
const config = patch => Object.assign({ headId: 'test-head', staffIds: ['test-head'], fnOnlyIds: [], people: [{ id: 'test-head', active: true }],
  kitSecs: [{ id: 'section-a', name: 'Section A', off: false }, { id: 'section-b', name: 'Section B', off: false }], prepStandardsEnabled: false }, patch || {});
const row = patch => Object.assign({ section: 'Section A', name: 'Synthetic item', minimum: 2, unit: 'small trays', aliases: [], instruction: '', recipe: '' }, patch || {});
function stored(input, patch) {
  const { section, ...content } = input;
  return Object.assign({ ...content, sectionId: 'section-a', archived: false, v: 7, at: SERVER_TIME - 10000, by: 'previous-head' }, patch || {});
}
function database(patch, settings = {}) {
  const records = { [BASE + '/config/main']: config(), [BASE + '/days/test/items/task']: { text: 'Synthetic existing task', qty: '1 tray', done: false }, ...clone(patch || {}) };
  const events = [], commits = [];
  const reference = target => ({ path: target, collection: name => collection(target + '/' + name) });
  const collection = target => ({ path: target, doc: id => reference(target + '/' + id),
    where: (field, op, values) => ({ path: target, field, op, values, limit: limit => ({ path: target, field, op, values, max: limit, query: true }) }) });
  const snapshot = target => ({ id: target.split('/').pop(), exists: Object.hasOwn(records, target), data: () => clone(records[target]),
    readTime: settings.clock === false ? null : { toMillis: () => SERVER_TIME } });
  const db = { collection,
    async runTransaction(fn) {
      events.push('transaction');
      const staged = [];
      const tx = {
        async get(ref) {
          assert.equal(staged.length, 0, 'all reads precede creates');
          events.push(ref.query ? 'query' : 'config');
          if (!ref.query) return snapshot(ref.path);
          assert.equal(ref.field, 'sectionId'); assert.equal(ref.op, 'in'); assert.equal(ref.max, 2001);
          const docs = Object.keys(records).filter(key => key.startsWith(ref.path + '/') && !key.slice(ref.path.length + 1).includes('/') && ref.values.includes(records[key].sectionId)).sort().slice(0, ref.max).map(snapshot);
          return { docs };
        },
        create(ref, data) {
          events.push('create');
          assert(ref.path.startsWith(BASE + '/prepStandards/'), 'writes only reach the standards collection');
          assert(!Object.hasOwn(records, ref.path), 'creates never overwrite an existing document');
          staged.push([ref.path, clone(data)]);
          return tx;
        }
      };
      const result = await fn(tx);
      for (const [key, value] of staged) { records[key] = value; commits.push([key, value]); }
      return result;
    }
  };
  return { db, records, events, commits };
}
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log('ok ' + name); }
async function refused(importer, fixture, input, code, options) {
  const before = clone(fixture.records);
  await assert.rejects(importer(fixture.db, PIN, input, options), error => error.code === code && !error.message.includes(PIN));
  assert.deepEqual(fixture.records, before);
  assert.equal(fixture.commits.length, 0);
}

(async () => {
  const { importPrepStandards } = await import('../scripts/import-prep-standards.mjs');
  await test('preview is the default and never mutates configuration, tasks or standards', async () => {
    const fixture = database(), before = clone(fixture.records);
    assert.deepEqual(await importPrepStandards(fixture.db, PIN, [row()]), { created: 0, existing: 0, planned: 1 });
    assert.deepEqual(fixture.records, before);
    assert.deepEqual(fixture.events, ['transaction', 'config', 'query']);
  });
  await test('apply creates every missing standard with current head, server time and v1', async () => {
    const fixture = database(), originalConfig = clone(fixture.records[BASE + '/config/main']);
    const input = [row(), row({ section: 'Section B', name: 'Other synthetic item', minimum: null, unit: 'kg', instruction: 'Synthetic preparation note.' })];
    assert.deepEqual(await importPrepStandards(fixture.db, PIN, input, { dryRun: false }), { created: 2, existing: 0, planned: 2 });
    assert.equal(fixture.commits.length, 2);
    for (const [key, value] of fixture.commits) {
      assert.match(key.split('/').pop(), /^ps-import-[a-f0-9]{48}$/);
      assert.equal(value.by, 'test-head'); assert.equal(value.at, SERVER_TIME); assert.equal(value.v, 1); assert.equal(value.archived, false);
    }
    assert.equal(fixture.commits[1][1].minimum, null);
    assert.deepEqual(fixture.records[BASE + '/config/main'], originalConfig);
    assert.deepEqual(fixture.records[BASE + '/days/test/items/task'], { text: 'Synthetic existing task', qty: '1 tray', done: false });
    assert.deepEqual(fixture.events, ['transaction', 'config', 'query', 'create', 'create']);
  });
  await test('rerunning the same import is idempotent without changing revisions or timestamps', async () => {
    const fixture = database();
    await importPrepStandards(fixture.db, PIN, [row()], { dryRun: false });
    const before = clone(fixture.records);
    assert.deepEqual(await importPrepStandards(fixture.db, PIN, [row()], { dryRun: false }), { created: 0, existing: 1, planned: 0 });
    assert.deepEqual(fixture.records, before); assert.equal(fixture.commits.length, 1);
  });
  await test('stable document IDs depend on the section ID and name, not input order', async () => {
    const first = database(), second = database();
    const a = row(), b = row({ section: 'Section B' });
    await importPrepStandards(first.db, PIN, [a, b], { dryRun: false });
    await importPrepStandards(second.db, PIN, [b, a], { dryRun: false });
    assert.deepEqual(Object.keys(first.records).sort(), Object.keys(second.records).sort());
    assert.notEqual(first.commits[0][0], first.commits[1][0]);
  });
  await test('an exact existing record with a different document ID is preserved', async () => {
    const existing = stored(row()), fixture = database({ [BASE + '/prepStandards/earlier-ui-id']: existing });
    assert.deepEqual(await importPrepStandards(fixture.db, PIN, [row()], { dryRun: false }), { created: 0, existing: 1, planned: 0 });
    assert.deepEqual(fixture.records[BASE + '/prepStandards/earlier-ui-id'], existing);
  });
  await test('a conflicting saved minimum aborts the entire import', async () => {
    const fixture = database({ [BASE + '/prepStandards/old']: stored(row(), { minimum: 9 }) });
    await refused(importPrepStandards, fixture, [row({ name: 'First new item' }), row()], 'saved-conflict', { dryRun: false });
  });
  await test('archived names never get silently restored or duplicated', async () => {
    const fixture = database({ [BASE + '/prepStandards/old']: stored(row(), { archived: true }) });
    await refused(importPrepStandards, fixture, [row()], 'saved-conflict', { dryRun: false });
  });
  await test('a saved alias cannot silently become a different canonical standard', async () => {
    const fixture = database({ [BASE + '/prepStandards/old']: stored(row({ name: 'Other item', aliases: ['Synthetic item'] })) });
    await refused(importPrepStandards, fixture, [row()], 'saved-conflict', { dryRun: false });
  });
  await test('multiple existing matches abort instead of choosing the first', async () => {
    const fixture = database({ [BASE + '/prepStandards/a']: stored(row()), [BASE + '/prepStandards/b']: stored(row(), { v: 2 }) });
    await refused(importPrepStandards, fixture, [row()], 'saved-conflict');
  });
  await test('existing matches in a different section do not conflict', async () => {
    const fixture = database({ [BASE + '/prepStandards/other-section']: stored(row(), { sectionId: 'section-b' }) });
    assert.deepEqual(await importPrepStandards(fixture.db, PIN, [row()], { dryRun: false }), { created: 1, existing: 0, planned: 1 });
  });
  await test('duplicate input names are rejected before any database read', async () => {
    const fixture = database();
    await refused(importPrepStandards, fixture, [row(), row({ section: ' section  a ', name: ' SYNTHETIC   ITEM ' })], 'duplicate-input');
    assert.deepEqual(fixture.events, []);
  });
  await test('input alias ambiguity is rejected before reading saved standards', async () => {
    const fixture = database();
    await refused(importPrepStandards, fixture, [row({ aliases: ['Shared'] }), row({ name: 'Other', aliases: [' shared '] })], 'ambiguous-input');
    assert.deepEqual(fixture.events, ['transaction', 'config']);
  });
  await test('invalid minimum, units, aliases, recipe and unknown fields never start a transaction', async () => {
    for (const patch of [{ minimum: -1 }, { minimum: NaN }, { minimum: Infinity }, { minimum: '2' }, { minimum: 1000001 },
      { name: ' ' }, { name: 'x'.repeat(161) }, { unit: '' }, { unit: 'x'.repeat(41) }, { aliases: [' '] }, { aliases: Array(13).fill('x') },
      { aliases: ['x'.repeat(161)] }, { instruction: 'x'.repeat(501) }, { recipe: '../private' }, { archived: false }]) {
      const fixture = database();
      await refused(importPrepStandards, fixture, [row(patch)], 'input-schema');
      assert.deepEqual(fixture.events, []);
    }
  });
  await test('empty and oversized inputs are refused before reads', async () => {
    for (const input of [[], {}, Array.from({ length: 201 }, (_, i) => row({ name: 'Item ' + i }))]) {
      const fixture = database(); await refused(importPrepStandards, fixture, input, 'input-size'); assert.deepEqual(fixture.events, []);
    }
  });
  await test('an invalid last row prevents valid earlier rows from being saved', async () => {
    const fixture = database();
    await refused(importPrepStandards, fixture, [row(), row({ name: 'Invalid last item', minimum: -1 })], 'input-schema', { dryRun: false });
    assert.deepEqual(fixture.events, []);
  });
  await test('an unknown or disabled section aborts without writes', async () => {
    for (const input of [[row({ section: 'Unknown' })], [row({ section: 'Section B' })]]) {
      const fixture = database({ [BASE + '/config/main']: config({ kitSecs: [{ id: 'section-a', name: 'Section A' }, { id: 'section-b', name: 'Section B', off: true }] }) });
      await refused(importPrepStandards, fixture, input, 'section-configuration', { dryRun: false });
    }
  });
  await test('ambiguous configured section names and duplicate IDs are refused', async () => {
    for (const sections of [[{ id: 'one', name: 'Section A' }, { id: 'two', name: ' SECTION A ' }], [{ id: 'one', name: 'Section A' }, { id: 'one', name: 'Other' }]]) {
      const fixture = database({ [BASE + '/config/main']: config({ kitSecs: sections }) });
      await refused(importPrepStandards, fixture, [row()], 'section-configuration');
    }
  });
  await test('current canonical head and active kitchen authority are required', async () => {
    for (const patch of [{ headId: '' }, { staffIds: [] }, { people: [{ id: 'test-head', active: false }] }, { people: [] }, { fnOnlyIds: ['test-head'] }]) {
      const fixture = database({ [BASE + '/config/main']: config(patch) });
      await refused(importPrepStandards, fixture, [row()], 'head-configuration', { dryRun: false });
    }
  });
  await test('editable staff role labels cannot substitute for canonical head identity', async () => {
    const fixture = database({ [BASE + '/config/main']: config({ people: [{ id: 'other-person', role: 'head', active: true }] }) });
    await refused(importPrepStandards, fixture, [row()], 'head-configuration');
  });
  await test('malformed existing standards fail closed', async () => {
    const fixture = database({ [BASE + '/prepStandards/bad']: stored(row({ name: 'Unrelated item' }), { minimum: 'bad' }) });
    await refused(importPrepStandards, fixture, [row()], 'saved-schema', { dryRun: false });
  });
  await test('the catalogue bound refuses a truncated result before creating anything', async () => {
    const patch = {};
    for (let i = 0; i < 2001; i++) patch[BASE + '/prepStandards/old-' + i] = stored(row({ name: 'Existing ' + i }));
    await refused(importPrepStandards, database(patch), [row()], 'catalogue-limit', { dryRun: false });
  });
  await test('a missing server clock cannot fall back to device time', async () => {
    await refused(importPrepStandards, database({}, { clock: false }), [row()], 'server-clock', { dryRun: false });
  });
  await test('unknown options and invalid PINs are refused before reads', async () => {
    const fixture = database();
    await refused(importPrepStandards, fixture, [row()], 'options', { apply: true });
    await assert.rejects(importPrepStandards(fixture.db, '../invalid', [row()]), error => error.code === 'kitchen-pin');
    assert.deepEqual(fixture.events, []);
  });
  await test('explicit zero stays distinct from a minimum still to come', async () => {
    const fixture = database();
    await importPrepStandards(fixture.db, PIN, [row({ minimum: 0 }), row({ name: 'Unset item', minimum: null })], { dryRun: false });
    assert.equal(fixture.commits[0][1].minimum, 0); assert.equal(fixture.commits[1][1].minimum, null);
  });
  await test('CLI rejects unknown and conflicting arguments without reading files or credentials', async () => {
    const script = path.resolve(__dirname, '../scripts/import-prep-standards.mjs');
    for (const args of [['--unknown', '/file-that-does-not-exist'], ['--dry-run', '--apply', '/missing'], []]) {
      const child = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { ...process.env, KITCHEN_PIN: PIN, FIREBASE_SA: 'PRIVATE-CREDENTIAL-SENTINEL' } });
      assert.equal(child.status, 1); assert.match(child.stderr, /Usage:/); assert(!child.stderr.includes('PRIVATE-CREDENTIAL-SENTINEL')); assert(!child.stderr.includes(PIN)); assert.equal(child.stdout, '');
    }
  });
  await test('CLI refuses another production project before loading the SDK', async () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'prep-import-test-'));
    try {
      const input = path.join(folder, 'synthetic.json'); writeFileSync(input, JSON.stringify([row()]));
      const env = { ...process.env, KITCHEN_PIN: PIN, FIREBASE_SA: JSON.stringify({ project_id: 'other-project', private_key: 'PRIVATE-KEY-SENTINEL' }) };
      delete env.FIRESTORE_EMULATOR_HOST;
      const child = spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/import-prep-standards.mjs'), '--apply', input], { encoding: 'utf8', env });
      assert.equal(child.status, 1); assert.match(child.stderr, /\(project\)/); assert(!child.stderr.includes('PRIVATE-KEY-SENTINEL')); assert(!child.stderr.includes(input)); assert.equal(child.stdout, '');
    } finally { rmSync(folder, { recursive: true, force: true }); }
  });
  console.log('All ' + passed + ' prep standards import checks passed.');
})().catch(error => { console.error('FAIL prep standards import:', error.message); process.exit(1); });
