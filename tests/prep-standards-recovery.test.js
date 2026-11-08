// Synthetic catalogue recovery through the actual admin Backup and kitchen-PIN copy buttons.
// The Firebase stand-in enforces the same complete-record create shape as the prep standards rules.
const L = require('./lib');
const { isDeepStrictEqual: equal } = require('node:util');
const { R, ok } = L.results();
const NEW = '4321', head = 'ann';
const key = (pin, ...parts) => ['kitchens', pin, ...parts].join('/');
const source = (...parts) => key(L.PIN, ...parts);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: head, name: 'Ann', role: 'head', active: true, add: true, tick: true, del: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true, del: false }
];
const standard = { sectionId: 'larder', name: 'Synthetic dressing', aliases: ['Synthetic sauce', 'Dressing'], minimum: 1.25, unit: 'L', instruction: 'Check the labelled date.\nKeep "cold" before service.', recipe: 'laksa', archived: false, v: 7, at: L.NOW - 450 * 86400000, by: 'former-head' };
const catalogue = {
  dressing: standard,
  zero: { ...standard, name: 'Synthetic zero minimum', aliases: [], minimum: 0, unit: 'trays', instruction: '', recipe: '', v: 3 },
  unset: { ...standard, sectionId: 'grill', name: 'Synthetic unset minimum', minimum: null, unit: 'kg', v: 6 },
  archived: { ...standard, sectionId: 'retired-section', name: 'Synthetic archived standard', archived: true, v: 11 }
};
const extra = {
  [source('config', 'main')]: { people, headId: head, sousIds: ['sam', head], staffIds: people.map(p => p.id), fnIds: [], fnOnlyIds: [], kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }], showBadges: true },
  ...Object.fromEntries(Object.entries(catalogue).map(([id, value]) => [source('prepStandards', id), value]))
};
const dump = p => p.evaluate(() => __fake.dump());
const under = (store, prefix) => Object.fromEntries(Object.entries(store).filter(([path]) => path.startsWith(prefix)));
const facts = value => { const { v, by, at, ...data } = value; return data; };

(async () => {
  const browser = await L.start();
  let p;
  try {
    p = await L.open(browser, '#/admin', { admin: true, extra, wait: 1800 });
    await L.adminTab(p, 'tools');
    const original = await dump(p), ids = Object.keys(catalogue).sort();
    const downloaded = p.waitForEvent('download', { timeout: 15000 });
    await p.click('[data-p="export"]');
    const chunks = [];
    for await (const chunk of await (await downloaded).createReadStream()) chunks.push(chunk);
    const backup = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    ok(Array.isArray(backup.prepStandards) && equal(backup.prepStandards.map(x => x.id).sort(), ids), 'manual Backup includes every active and archived standard, including records older than the dated window');
    for (const id of ids) {
      const saved = (backup.prepStandards || []).find(x => x.id === id);
      ok(equal(saved, { ...catalogue[id], id }), 'manual Backup preserves the entire ' + id + ' record with its original identity, revision and recorder');
    }
    ok(equal(under(await dump(p), source('prepStandards') + '/'), under(original, source('prepStandards') + '/')), 'manual Backup leaves the source catalogue unchanged');
    ok(!(await p.evaluate(() => __fake.writes.flat().some(w => /\/prepStandards\//.test(w.path)))), 'manual Backup makes no prep standard writes');

    await p.fill('#a-newpin', NEW);
    await p.fill('#a-newpin2', NEW);
    const beforeCopy = await dump(p), started = await p.evaluate(() => LK_TIME.now());
    await p.click('[data-p="move-pin"]');
    ok(Object.keys(under(await dump(p), key(NEW) + '/')).length === 0, 'the first PIN-copy tap makes no destination writes');
    await p.click('[data-p="move-pin"]');
    await L.waitFor(p, () => !LK_PREP.state.moving && /Copied|Stopped|rules do not allow/.test(LK_PREP.state.moveMsg || ''), null, 15000);
    const finished = await p.evaluate(() => LK_TIME.now()), copied = await dump(p);
    const message = await p.evaluate(() => LK_PREP.state.moveMsg || '');
    const destination = under(copied, key(NEW, 'prepStandards') + '/');
    const records = ids.map(id => destination[key(NEW, 'prepStandards', id)]);
    ok(/^Copied \d+ records/.test(message) && !/left on the old PIN/.test(message), 'PIN copy completes without a strict-schema refusal');
    ok(equal(Object.keys(destination).map(path => path.split('/').pop()).sort(), ids), 'PIN copy keeps every standard document ID, including the archived standard for a retired section');
    ok(records.every((value, i) => value && equal(facts(value), facts(catalogue[ids[i]]))), 'PIN copy retains section IDs, aliases, zero/unset minima, units, instructions, recipe links and archive state exactly');
    ok(records.every(value => value && value.v === 1), 'destination standards start at revision 1 despite older source revisions');
    ok(records.every(value => value && value.by === head), 'destination standards record the canonical current head chef instead of the former recorder');
    ok(records.every(value => value && Number.isFinite(value.at) && value.at >= started && value.at <= finished), 'destination standards receive the current copy time instead of their historical timestamps');
    ok(equal(under(copied, source() + '/'), under(beforeCopy, source() + '/')), 'PIN copy leaves every original kitchen record unchanged');
    ok(!(await p.evaluate(prefix => __fake.writes.flat().some(w => w.path.startsWith(prefix)), source('prepStandards') + '/')), 'PIN copy never writes or deletes a source standard');
    ok(await p.evaluate(() => LK_PREP.state.pin) === NEW, 'the device switches to the successfully copied kitchen');
    ok(!p.errors.length, 'Backup and PIN copy have no browser errors ' + p.errors.join(' | '));
  } finally {
    if (p) await p.context().close();
    await browser.close();
  }
  L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
