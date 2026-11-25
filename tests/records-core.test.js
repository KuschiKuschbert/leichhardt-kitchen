// Records (13 Nov 2026, docs/smart-book-options/brief.md): the nightly food safety count for a finished day
// (scripts/records-core.mjs). It reads a past cleaning day the way js/cleaning.js does: due by weekday, interval and
// repeat; plain ticks Done or Missed; a planned task Unable to complete (with its note), Awaiting Pass check, Done, or
// an event task that is never Missed. Deliveries keep their temperatures as recorded, in Queensland time.
const assert = require('node:assert/strict');
(async () => {
  const R = await import('../scripts/records-core.mjs');
  const day = '2026-11-07'; // a Saturday
  assert.equal(R.dow(R.at(day)), 6, '7 November 2026 is a Saturday in Queensland');
  const open = 253402178400000, from = R.at('2026-11-01');
  const task = (id, text, o) => Object.assign({ id, text, from, until: open, dows: [0, 1, 2, 3, 4, 5, 6] }, o || {});
  const tasks = [
    task('t1', 'Wipe benches'),                                   // plain, done
    task('t2', 'Cool room floor'),                                // plain, missed
    task('t3', 'Fryer oil change', { plan: { timing: 'close' } }), // planned, nothing recorded: missed
    task('t4', 'Hood filters', { plan: { timing: 'daily' } }),    // planned, blocked: unable, with its note
    task('t5', 'Probe check', { plan: { timing: 'daily' } }),     // planned, awaiting Pass check
    task('t6', 'Sanitise boards', { plan: { timing: 'service' } }), // an event task: never missed
    task('t7', 'Weekday only', { dows: [1, 2, 3, 4, 5] }),        // not due on a Saturday
    task('t8', 'Every second day', { plan: { timing: 'daily', repeat: { days: 2, anchor: '2026-11-06' } } }), // not due on the 7th
    task('t9', 'Closed revision', { until: R.at('2026-11-05') })  // ended before the day
  ];
  const done = [
    { day, task: 't1', done: true }, { day, task: 't4', flow: { slot: 'daily', status: 'blocked', note: 'No degreaser' } },
    { day, task: 't5', flow: { slot: 'daily', status: 'awaiting' } }, { day, task: 't6', flow: { slot: 'service-1', status: 'complete' } },
    { day: '2026-11-06', task: 't2', done: true } // another day's tick does not count
  ];
  const c = R.cleanDay(tasks, done, day);
  assert.deepEqual([c.due, c.done, c.missN, c.unableN, c.waitN, c.ev, c.evRec], [6, 1, 2, 1, 1, 1, 1], 'counts: ' + JSON.stringify(c));
  assert.deepEqual(c.miss, ['Cool room floor', 'Fryer oil change']);
  assert.deepEqual(c.unable, [{ t: 'Hood filters', n: 'No degreaser' }]);
  assert.deepEqual(c.wait, ['Probe check']);
  assert.equal(c.cv, R.CLEAN_V);
  assert.equal(R.cleanDay(tasks, done, '2026-11-08').missN >= 1, true, 'a day with no ticks reads as missed, not done');
  assert.equal(R.cleanDay([], [], day).due, 0, 'no tasks set: nothing due, nothing missed');
  // Results by section, step 1 (26 Nov 2026): the weekly and monthly jobs one by one, under their root id
  const wk = (id, text, o) => task(id, text, Object.assign({ dows: [6] }, o || {}));
  const round = [
    task('n1', 'Nightly wipe'),                                                             // nightly: not kept one by one
    wk('w1b', 'Clean behind the pizza ovens', { root: 'w1', section: 'hot', sectionName: 'Hot larder', shared: false, from: R.at('2026-11-05') }),   // a moved job: its second revision, the same root
    wk('w1a', 'Clean behind the pizza ovens', { root: 'w1', section: 'hot', sectionName: 'Hot larder', shared: false, dows: [3], until: R.at('2026-11-05') }),
    wk('w2', 'Clean the shelves above the pass', { shared: true, section: '' }),            // shared: no section, done
    wk('w3', 'Clean the drawers', { section: 'grill', sectionName: 'Grill', shared: false, plan: { timing: 'daily' } }),   // planned, blocked
    wk('w4', 'Deep clean the coldroom floors', { section: 'hot', sectionName: 'Hot larder', shared: false, plan: { timing: 'daily', repeat: { days: 28, anchor: day } } }),   // monthly, awaiting
    task('e2', 'Change grill drip trays', { plan: { timing: 'daily', repeat: { days: 2, anchor: day } } }),   // every 2 days: not weekly or monthly
    wk('ev', 'Sanitise boards', { plan: { timing: 'service' } })                             // an event job: never kept one by one
  ];
  const ticks = [
    { day, task: 'w2', done: true, doneAt: R.at(day, 21 * 60 + 40), doneBy: 'Sam', worker: 'Bo' }, { day, task: 'w2', done: true, doneAt: R.at(day, 20 * 60), doneBy: 'Sam', worker: 'Ann' },
    { day, task: 'w3', flow: { slot: 'daily', status: 'blocked', note: 'No degreaser' } }, { day, task: 'w4', flow: { slot: 'daily', status: 'awaiting' }, doneAt: R.at(day, 22 * 60), doneBy: 'Lou' }
  ];
  const team = { names: { lou: 'Lou', vic: 'Vic', ann: 'Ann' }, from: { plans: '2026-09-13', picks: '2026-10-09' },
    plans: [{ day, on: [{ id: 'lou', sh: 'dinner', sec: 'hot' }, { id: 'ann', sh: 'dinner', sec: 'grill' }, { id: 'lou', sh: 'lunch', sec: 'hot' }] }, { day: '2026-11-06', on: [{ id: 'ann', sh: 'dinner', sec: 'hot' }] }],
    picks: [{ day, by: 'vic', sec: 'pans', sh: 'dinner', log: [{ sh: 'lunch', sec: 'pans', at: 1 }, { sh: 'dinner', sec: 'hot', at: 2 }] }, { day, by: 'gone', sec: 'hot', sh: 'dinner' }, { day, by: 'ann', sec: 'grill', sh: 'dinner' }] };
  const rc = R.cleanDay(round, ticks, day, team);
  assert.deepEqual(rc.r, [
    { k: 'w1', t: 'Clean behind the pizza ovens', s: 'hot', sn: 'Hot larder', st: 'm' },
    { k: 'w2', t: 'Clean the shelves above the pass', s: '', sn: '', st: 'd', by: 'Bo', at: '21:40' },
    { k: 'w3', t: 'Clean the drawers', s: 'grill', sn: 'Grill', st: 'u', n: 'No degreaser' },
    { k: 'w4', t: 'Deep clean the coldroom floors', s: 'hot', sn: 'Hot larder', st: 'w' }
  ], 'each weekly or monthly job once, by root id, with its section and state; a done job says who did it (the worker a shared screen asked for) and when: ' + JSON.stringify(rc.r));
  assert.deepEqual([rc.rN, rc.rn], [4, { due: 3, done: 1, miss: 1, unable: 1, wait: 1 }], 'whole counts, Unable to complete apart from due');
  assert.equal(R.cleanDay(round, ticks, '2026-11-04').r[0].k, 'w1', 'before it was moved, the same job has the same key (its root id)');
  assert.deepEqual(rc.ro, [{ s: 'hot', k: 'l', pk: 1, w: [{ n: 'Lou', sh: 'dinner', by: 'p' }, { n: 'Lou', sh: 'lunch', by: 'p' }, { n: 'Vic', sh: 'dinner', by: 'k' }, { n: 'Someone', sh: 'dinner', by: 'k' }] }],
    'who was on the section with the missed job, as facts with their source: the plan and own picks, by section id, each shift; a section whose jobs were done or unable is not listed: ' + JSON.stringify(rc.ro));
  assert.deepEqual(R.rostered(day, 'pans', team), { s: 'pans', k: 'l', pk: 1, w: [{ n: 'Vic', sh: 'lunch', by: 'k' }] });
  assert.deepEqual(R.rostered(day, 'fry', team), { s: 'fry', k: 'n', pk: 1, w: [] }, 'a section nobody was on says nobody, not a guess');
  assert.deepEqual(R.rostered('2026-10-01', 'hot', team), { s: 'hot', k: 'n', pk: 0, w: [] }, 'a day older than the picks the run read: the plan only, and it says so');
  assert.deepEqual(R.rostered('2026-09-01', 'hot', team), { s: 'hot', k: 'x' }, 'a day older than the plans the run read: not kept');
  assert.equal(R.cleanDay(round, ticks, day).ro, undefined, 'with no team data the count keeps no names');
  assert.deepEqual(R.notCounted(), { cv: R.CLEAN_V, nc: 1 }, 'a day the count does not cover says so, and nothing more');
  const many = Array.from({ length: 45 }, (x, i) => wk('m' + i, 'Job ' + i, { section: 'hot', shared: false }));
  const big = R.cleanDay(many, [], day);
  assert.deepEqual([big.r.length, big.rN, big.rn.miss], [40, 45, 45], 'at most 40 jobs kept one by one a day; the counts stay whole');
  assert.deepEqual(Object.keys(R.trimClean(R.cleanDay(round, ticks, day, team))).filter(k => ['r', 'ro', 'cut', 'rn', 'rN'].includes(k)), ['rN', 'rn', 'cut'], 'when the board is too large the detail goes and the whole counts stay');
  assert.deepEqual(R.trimClean(R.notCounted()), { cv: R.CLEAN_V, nc: 1 });
  const del = R.dayDeliveries([
    { day, receivedAt: R.at(day, 9 * 60 + 5), supplier: 'Fresh produce', chilled: 4, frozen: null, note: '', receivedBy: 'Ann' },
    { day, receivedAt: R.at(day, 7 * 60 + 42), supplier: 'Bidfood', chilled: 3.14, frozen: -19.55, note: 'All there', receivedBy: 'Bo' },
    { day, receivedAt: R.at(day, 8 * 60), supplier: 'Practice', chilled: 1, tst: true },
    { day: '2026-11-06', receivedAt: R.at('2026-11-06', 600), supplier: 'Other day', chilled: 2 },
    { day, receivedAt: R.at(day, 600), supplier: 'Bad temp', chilled: 'warm', frozen: 500 }
  ], day);
  assert.deepEqual(del.map(d => [d.at, d.s, d.c, d.f]), [['07:42', 'Bidfood', 3.14, -19.55], ['09:05', 'Fresh produce', 4, null], ['10:00', 'Bad temp', null, null]], JSON.stringify(del));
  // cooling: the current batch on its own day, decided once
  const ts = (d, hm) => { const t = R.at(d, +hm.slice(0, 2) * 60 + +hm.slice(3)); return { seconds: Math.floor(t / 1000), nanoseconds: 0 }; };
  const cur = { run: 'r1', windowAt: R.at(day, 600), firstAt: ts(day, '14:05'), firstBy: 'bo', secondAt: ts(day, '16:10'), secondBy: 'bo' };
  const recd = { run: 'r1', firstAt: ts(day, '16:07'), firstBy: 'bo', secondAt: 0, secondBy: '' }, names = { bo: 'Bo' };
  assert.deepEqual(R.coolDay(cur, recd, day, names, false, '2026-11-08'), { k: 'batch', start: '14:05', by: 'Bo', s2: '16:10', s2by: 'Bo', r1: '16:07', r1by: 'Bo', r2: '', r2by: '' });
  assert.equal(R.coolDay(cur, recd, '2026-11-08', names, false, '2026-11-08').k, 'none', 'the day after the batch: no batch was started');
  assert.equal(R.coolDay(cur, recd, '2026-11-06', names, false, '2026-11-08').k, 'gone', 'a day before the batch, not kept yet: replaced');
  assert.equal(R.coolDay(cur, recd, '2026-11-05', names, true, '2026-11-08').k, 'before', 'the first night: older days were not kept');
  assert.equal(R.coolDay(cur, { run: 'other', firstAt: ts(day, '16:07'), firstBy: 'bo' }, day, names, false, day).r1, '', 'a confirmation of another run is not this batch\'s');
  assert.equal(R.coolDay(null, null, day, names, false, day).k, 'none', 'no batch at all: none');
  console.log('PASS records: cleaning due, done, missed, unable, awaiting Pass check and events read like the Cleaning page; weekly and monthly jobs one by one under their root id with who did it and who was on; deliveries in time order, temperatures as recorded');
})().catch(e => { console.error(e); process.exit(1); });
