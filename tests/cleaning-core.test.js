// Cleaning's shared reading of a day (js/cleaning-core.js, 24 Nov 2026, docs/cleaning-schedule.md). The Cleaning page
// (js/cleaning.js), the book's cleaning write checks (cleaningDue() in js/prep.js) and the nightly Records count
// (scripts/records-core.mjs) all read a day through it, where each had its own copy before. The results below were
// taken from those copies before the core (main at 1fd1322), over one broad synthetic programme: 124 made-up jobs of
// every timing and plain jobs, weekday sets, from and until edges, repeat anchors, every recorded state, unsaved
// drafts, unsent occurrences and 14,089 records over 77 days across the new year. Each must stay exactly the same.
// When Cleaning changes how a day reads on purpose, the hashes change here with CLEAN_V in scripts/records-core.mjs.
// The page and the write check run here from their own files (each named function cut out of the file), with the
// book's own clock from js/boot.js. Synthetic jobs only: no people, no kitchen data.
const assert = require('node:assert/strict'), path = require('node:path');
const fs = require('node:fs'), vm = require('node:vm'), { createHash } = require('node:crypto');
const sha = x => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 24);
// One named function's source from a browser file, by matching its braces (strings skipped). The name must be unique.
function grab(src, name) {
  const head = 'function ' + name + '(', start = src.indexOf(head);
  if (start < 0 || src.indexOf(head, start + 1) >= 0) throw new Error('expected one function ' + name);
  let depth = 0, quote = '';
  for (let i = src.indexOf('{', start); i < src.length; i++) {
    const c = src[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; continue; }
    if (c === "'" || c === '"') quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error('unclosed function ' + name);
}
// The book's own clock (LK_TIME from js/boot.js), run with a quiet stand-in page.
function bookClock(bootSrc) {
  const noop = () => {}, window = { addEventListener: noop, dispatchEvent: noop };
  const sandbox = { window, document: { documentElement: { classList: { toggle: noop }, setAttribute: noop } }, navigator: { onLine: true },
    localStorage: { getItem: () => null, setItem: noop }, setTimeout: noop, Event: function () {}, Intl, Date, Math, JSON, isFinite };
  vm.runInNewContext(bootSrc, sandbox);
  return window.LK_TIME;
}
// The Cleaning page's reading of a day (js/cleaning.js) and the book's due check (cleaningDue() in js/prep.js), their
// own source, over a fixed day: page state M, the book's clock with "today" fixed, and the shared core when there is one.
function pageReader(cleaningSrc, prepSrc, LT, today, M, core) {
  const T = { at: LT.at, dow: LT.dow, clock: LT.clock, day: ms => LT.day(ms == null ? LT.at(today, 600) : ms) };
  const names = ['due', 'tasksOn', 'record', 'occurrence', 'hasPlan', 'flowList', 'flowRecord', 'flowSummary', 'workTotals', 'flowState'];
  const ctx = { T, M, window: { LK_CLEANING_CORE: core }, K: core, C: {} };
  vm.runInNewContext(grab(prepSrc, 'cleaningDue') + '\nC.due = cleaningDue;\n' +
    names.map(name => grab(cleaningSrc, name)).join('\n') + '\nthis.page = { ' + names.join(', ') + ' };', ctx);
  return ctx.page;
}
// Every due job of every day, as the page reads it: slots (and which record each found), counts, words and totals.
function pageRead(page, M, days) {
  return days.map(day => {
    const due = page.tasksOn(day);
    return { day, totals: page.workTotals(due, day), tasks: due.map(t => page.hasPlan(t)
      ? { id: t.id, slots: page.flowList(t, day).map(x => [x.slot, x.kind, x.record && x.record.id]), sum: page.flowSummary(t, day), say: page.flowState(t, day) }
      : { id: t.id, rec: (page.record(t, day) || {}).id || null }) };
  });
}
/* A broad synthetic cleaning programme: made-up jobs, no people. Every timing and plain jobs, weekday sets, from and
   until edges, repeat anchors, every recorded state, more than 8 names a list, and records of other days. Fixed seed. */
function fixture() {
  let seed = 20261124;
  const rnd = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const pick = list => list[Math.floor(rnd() * list.length)];
  const ZONE = 36000000, DAY = 86400000, OPEN = 253402178400000;
  const at = d => { const a = d.split('-'); return Date.UTC(+a[0], a[1] - 1, +a[2]) - ZONE; };
  const ymd = ms => new Date(ms + ZONE).toISOString().slice(0, 10);
  const days = []; for (let t = at('2026-10-26'); t <= at('2027-01-10'); t += DAY) days.push(ymd(t));
  const TIMINGS = [null, 'daily', 'close', 'food', 'service', 'prep-service', 'use'];
  const DOWS = [[0, 1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5], [0], [3, 0], [4, 0], [1, 3, 5], [6], [], 'not a list', undefined];
  const TEXTS = ['', '   ', 'x'.repeat(100), 42, undefined];
  const tasks = []; let n = 0;
  function task(timing, extra) {
    n++;
    const t = { id: 't' + String(n).padStart(3, '0'), text: n % 23 < TEXTS.length ? TEXTS[n % 23] : 'Synthetic clean ' + n, area: 'Area ' + (n % 4), from: at('2026-10-20'), until: OPEN, dows: [0, 1, 2, 3, 4, 5, 6] };
    if (timing) t.plan = { template: 'x' + n, timing, checks: ['Check one'], verification: timing === 'food', verifiers: [], method: '', responsibility: '', review: '' };
    Object.assign(t, extra || {});
    tasks.push(t); return t;
  }
  TIMINGS.forEach(timing => DOWS.forEach(dows => task(timing, { dows })));
  TIMINGS.forEach(timing => {
    task(timing, { from: at('2026-11-15'), until: at('2026-11-22') });
    task(timing, { from: at('2026-11-15') + 1, until: at('2026-12-01') + 1 });
    task(timing, { from: at('2026-12-31'), until: at('2027-01-02') });
  });
  const ANCHORS = ['2026-11-09', '2026-10-01', '2026-12-31', '2027-01-05', '', '2026-11-10'];
  [2, 3, 7, 14, 30].forEach((days, i) => ANCHORS.forEach((anchor, j) => {
    const t = task(TIMINGS[1 + (i * 6 + j) % 6], { dows: j === 5 ? [1, 3, 5] : [0, 1, 2, 3, 4, 5, 6] });
    t.plan.repeat = { days, anchor };
  }));
  task('daily', { from: undefined }); task('close', { until: undefined }); task(null, { dows: null });
  const done = [], ids = new Set(), heavy = { '2026-11-18': 'blocked', '2026-11-19': 'awaiting', '2026-11-20': 'none' };
  const STATES = ['complete', 'complete', 'complete', 'complete', 'awaiting', 'blocked', 'pending', 'pending', 'odd', 'none', 'none', 'none'];
  const NOTES = ['No degreaser', '', 'n'.repeat(150), 7, '  Hose broken  '];
  const KINDS = { service: ['service'], 'prep-service': ['prep', 'service'], food: ['prep'], use: ['use'], daily: ['service'], close: ['use'] };
  function flow(day, t, slot, kind, state) {
    if (state === 'none') return;
    const id = day + '_' + t.id + '__' + slot, r = { id: id + (ids.has(id) ? '_b' + done.length : ''), day, task: t.id, version: 1, done: state === 'complete', flow: { slot, kind, status: state, checked: [], note: state === 'blocked' ? pick(NOTES) : '' } };
    ids.add(r.id); done.push(r);
  }
  tasks.forEach(t => days.forEach(day => {
    if (!t.plan) {
      const x = rnd();
      if (x < 0.45) done.push({ id: day + '_' + t.id, day, task: t.id, version: 1, done: true });
      else if (x < 0.6) done.push({ id: day + '_' + t.id, day, task: t.id, version: 2, done: false });
      if (rnd() < 0.05) done.push({ id: day + '_' + t.id + '_dup', day, task: t.id, version: 1, done: rnd() < 0.5 });
      if (rnd() < 0.03) done.push({ id: day + '_' + t.id + '_flow', day, task: t.id, version: 1, done: true, flow: { slot: 'daily', kind: 'daily', status: 'complete', checked: [], note: '' } });
      return;
    }
    const timing = t.plan.timing, fixed = timing === 'daily' ? [['daily', 'daily']] : timing === 'close' ? [['close', 'close']] : timing === 'food' ? [['start', 'start'], ['close', 'close']] : [];
    const forced = heavy[day];
    fixed.forEach(([slot, kind]) => flow(day, t, slot, kind, forced || pick(STATES)));
    if (forced) return;
    const extra = Math.floor(rnd() * 4);
    for (let i = 0; i < extra; i++) { const kind = pick(KINDS[timing]); flow(day, t, kind + '-' + Math.floor(rnd() * 3), kind, pick(STATES)); }
    if (rnd() < 0.04 && fixed.length) flow(day, t, fixed[0][0], fixed[0][1], pick(STATES));
    if (rnd() < 0.01) done.push({ id: day + '_' + t.id + '__noslot', day, task: t.id, version: 1, done: false, flow: { kind: 'service', status: pick(STATES), checked: [], note: '' } });
  }));
  // what a phone has not sent yet: drafts for new and recorded slots, and a few occurrences waiting to send
  const drafts = {}, pending = {};
  tasks.filter(t => t.plan).forEach((t, i) => days.forEach((day, j) => {
    if ((i + j) % 17 === 0) { const kind = pick(KINDS[t.plan.timing]), slot = kind + '-draft' + j; drafts[day + '_' + t.id + '_' + slot] = { task: t.id, day, slot, kind, checked: [], note: '', original: '[[],""]' }; }
    if ((i + j) % 29 === 0 && t.plan.timing === 'food') drafts[day + '_' + t.id + '_start'] = { task: t.id, day, slot: 'start', kind: 'start', checked: ['Check one'], note: '', original: '[[],""]' };
    if ((i * 7 + j) % 31 === 0) pending[day + '_' + t.id] = { slot: 'daily', kind: 'daily', control: 'perform' };
  }));
  return { days, tasks, done, drafts, pending, today: '2026-11-25' };
}
const ROOT = path.join(__dirname, '..'), file = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
// Taken from the code before the shared core (main at 1fd1322, 24 Nov 2026) over fixture() above.
const BEFORE = { fixture: '9364f00a77c8e95f3eb8e137', records: 'f55dd109d250b4a68d4d5841', due: 'bbb8e988cc499c6011e8a3e9', page: '14f83ccb33d72703cd713acf' };

(async () => {
  const R = await import('../scripts/records-core.mjs'), K = require('../js/cleaning-core.js');
  const F = fixture(), LT = bookClock(file('js/boot.js')), passed = [];
  const check = (name, fn) => { fn(); passed.push(name); };
  check('the fixture is the one the earlier results were taken with', () => {
    assert.equal(sha({ days: F.days, tasks: F.tasks, done: F.done, drafts: F.drafts, pending: F.pending }), BEFORE.fixture);
    assert.deepEqual([F.tasks.length, F.done.length, F.days.length, Object.keys(F.drafts).length, Object.keys(F.pending).length], [124, 14089, 77, 545, 273]);
  });

  check('Records counts every day exactly as before', () => {
    // Firestore never hands back an empty job or record, but the nightly count still steps over one
    const days = F.days.map(d => R.cleanDay(F.tasks.concat([null]), F.done.concat([null]), d));
    const total = k => days.reduce((a, c) => a + (Array.isArray(c[k]) ? c[k].length : c[k]), 0);
    assert.deepEqual(['due', 'done', 'missN', 'unableN', 'waitN', 'ev', 'evRec'].map(total), [1988, 259, 442, 233, 255, 799, 338]);
    assert.ok(days.every(c => c.cv === R.CLEAN_V && c.cv === 1 && c.due === c.done + c.missN + c.unableN + c.waitN + c.ev), 'every due job is counted once');
    assert.ok(days.every(c => c.miss.length === Math.min(8, c.missN) && c.unable.length === Math.min(8, c.unableN) && c.wait.length === Math.min(8, c.waitN)), 'at most 8 names a list, whole counts');
    assert.deepEqual([days.filter(c => c.missN > 8).length, days.filter(c => c.unableN > 8).length, days.filter(c => c.waitN > 8).length], [5, 1, 1], 'the fixture fills each list past 8 names');
    assert.equal(sha(days), BEFORE.records);
  });

  const M = { tasks: F.tasks, done: F.done, workDrafts: F.drafts, pending: F.pending };
  const page = pageReader(file('js/cleaning.js'), file('js/prep.js'), LT, F.today, M, K);
  const grid = (due, tasks) => tasks.map(t => F.days.map(d => due(t, d) ? 1 : 0).join('')).join('|');
  check('the book, the page and Records find the same jobs due as before', () => {
    const book = grid(page.due, F.tasks);
    assert.equal(sha(book), BEFORE.due);
    assert.equal(grid(R.due, F.tasks), book, 'Records and the book agree on every job and day');
    assert.equal(book.split('').filter(c => c === '1').length, 1988);
  });
  check('the Cleaning page reads every day as before: slots, records, counts, words and totals', () => {
    const read = pageRead(page, M, F.days), words = new Set();
    read.forEach(d => d.tasks.forEach(t => { if (t.say) words.add(t.say.replace(/^\d+\/\d+/, 'n/n')); }));
    assert.deepEqual([...words].sort(), ['Awaiting Pass check', 'Done', 'Due', 'Missed', 'Not sent', 'To do', 'Unable to complete',
      'n/n recorded; record each prep', 'n/n recorded; record each prep and service', 'n/n recorded; record each service', 'n/n recorded; record each use']);
    assert.equal(sha(read), BEFORE.page);
    // a one-tap job finds its record as the page did before: the first one saved for that slot on that day
    const first = new Map(); let n = 0;
    F.done.forEach(r => { const k = [r.task, r.day, r.flow && r.flow.slot].join('|'); if (r.flow && !first.has(k)) first.set(k, r); });
    F.days.forEach(day => page.tasksOn(day).filter(page.hasPlan).forEach(t => ['daily', 'close', 'start'].forEach(slot => {
      n++; assert.equal(page.flowRecord(t, day, slot), first.get([t.id, day, slot].join('|')) || null);
    })));
    assert.equal(n, 1732 * 3, 'every due planned job, every day');
  });

  check('without the core the book refuses every cleaning write, never guesses', () => {
    const none = pageReader(file('js/cleaning.js'), file('js/prep.js'), LT, F.today, M, undefined);
    assert.ok(!grid(none.due, F.tasks).includes('1'), 'nothing is due, so act and tick refuse');
    assert.match(grab(file('js/cleaning.js'), 'mount'), /!K \|\| K\.api !== 1/, 'the page asks for a reload instead of opening without it');
  });

  check('the book clock and Records\' Queensland clock agree on every day', () => {
    const Q = { at: R.at, dow: R.dow, day: R.qldDay };
    F.days.concat(['2026-02-28', '2026-03-01', '2028-02-29', '2026-12-31', '2027-01-01']).forEach(d => {
      assert.equal(LT.at(d), Q.at(d), d); assert.equal(LT.dow(LT.at(d)), Q.dow(Q.at(d)), d); assert.equal(LT.day(LT.at(d) + 1), Q.day(Q.at(d) + 1), d);
      assert.ok(F.tasks.every(t => K.due(t, d, LT) === K.due(t, d, Q)), 'due on ' + d);
    });
  });

  check('a repeat waits for a real anchor date', () => {
    const t = { id: 'r', from: 0, until: 253402178400000, dows: [0, 1, 2, 3, 4, 5, 6], plan: { timing: 'close', repeat: { days: 2, anchor: '2026-11-09' } } };
    const on = (anchor, d) => [LT, { at: R.at, dow: R.dow, day: R.qldDay }].map(c => K.due({ ...t, plan: { ...t.plan, repeat: { days: 2, anchor } } }, d, c));
    assert.deepEqual(on('2026-11-09', '2026-11-09'), [true, true]); assert.deepEqual(on('2026-11-09', '2026-11-10'), [false, false]);
    assert.deepEqual(on('2026-11-09', '2027-01-02'), [true, true], 'across the new year'); assert.deepEqual(on('2026-11-09', '2026-11-07'), [false, false], 'never before its anchor');
    for (const anchor of ['', '2026-02-30', '2026-13-01', '9 Nov', null]) assert.deepEqual(on(anchor, '2026-11-11'), [false, false], 'no anchor, no repeat: ' + anchor);
    assert.equal(K.due(null, '2026-11-11', LT), false);
  });

  check('a finished day reads blocked first, then awaiting, done, events, else missed', () => {
    const day = '2026-11-07', job = timing => ({ id: 'j', plan: { timing } }), rec = (slot, status, note) => ({ day, task: 'j', flow: { slot, kind: slot, status, note: note || '' } });
    assert.deepEqual(K.past(job('food'), day, [rec('start', 'awaiting'), rec('close', 'blocked', 'No degreaser')]), { state: 'blocked', note: 'No degreaser' });
    assert.deepEqual(K.past(job('food'), day, [rec('start', 'complete'), rec('close', 'awaiting')]), { state: 'awaiting' });
    assert.deepEqual(K.past(job('close'), day, [rec('close', 'complete')]), { state: 'done' });
    assert.deepEqual(K.past(job('daily'), day, [rec('daily', 'complete'), rec('service-1', 'pending')]), { state: 'missed' }, 'a recorded extra check counts too');
    assert.deepEqual(K.past(job('close'), day, []), { state: 'missed' });
    assert.deepEqual(K.past(job('weekly'), day, []), { state: 'missed' }, 'a job with no check to do is never done');
    assert.deepEqual(K.past(job('food'), day, [rec('start', 'complete'), rec('close', 'complete')]), { state: 'event', recorded: true }, 'food covering has prep events, so it is never done or missed');
    assert.deepEqual(K.past(job('service'), day, []), { state: 'event', recorded: false }, 'an event job is never missed');
    assert.deepEqual(K.past({ id: 'j' }, day, [{ day, task: 'j', done: false }, { day, task: 'j', done: true }]), { state: 'missed' }, 'a plain job reads its first record');
    assert.deepEqual(K.slots(job('close'), day, [rec('close', 'blocked'), rec('close', 'complete')], [{ task: 'j', day, slot: 'use-x', kind: 'use' }, { task: 'j', day: '2026-11-08', slot: 'use-y', kind: 'use' }])
      .map(x => [x.slot, x.kind, x.record && x.record.flow.status]), [['close', 'close', 'blocked'], ['use-x', 'use', null]], 'first record a slot, then this day\'s drafts');
  });

  check('the core is pure, the same in the browser and node, and lazy', () => {
    const src = file('js/cleaning-core.js'), sandbox = { window: {} };
    assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''), /\bDate\b|localStorage|indexedDB|document|navigator|LK_TIME|setTimeout|fetch/, 'no clock, storage or page of its own');
    vm.runInNewContext(src, sandbox);
    assert.deepEqual(Object.keys(sandbox.window.LK_CLEANING_CORE), Object.keys(K));
    assert.equal(K.api, 1);
    for (const f of ['sw.js', 'js/upkeep.js', 'index.html']) assert.ok(!file(f).includes('cleaning-core'), f + ' leaves the lazy core out of the start and the saved shell');
    const app = file('js/app.js');
    assert.ok(app.indexOf("mgScript('js/cleaning-core.js?v=") > 0 && app.indexOf("mgScript('js/cleaning-core.js?v=") < app.indexOf("mgScript('js/cleaning.js?v="), 'js/app.js loads the core before the page');
    assert.match(file('scripts/analysis.mjs'), /const CODE = hash\(\[[^\]]*'\.\.\/js\/cleaning-core\.js'/, 'a change to the core makes the nightly job count again');
  });
  console.log('PASS cleaning core: ' + passed.length + ' checks. ' + passed.join('; '));
})().catch(e => { console.error(e); process.exit(1); });
