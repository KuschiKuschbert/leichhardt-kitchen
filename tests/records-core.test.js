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
  const del = R.dayDeliveries([
    { day, receivedAt: R.at(day, 9 * 60 + 5), supplier: 'Fresh produce', chilled: 4, frozen: null, note: '', receivedBy: 'Ann' },
    { day, receivedAt: R.at(day, 7 * 60 + 42), supplier: 'Bidfood', chilled: 3.14, frozen: -19.55, note: 'All there', receivedBy: 'Bo' },
    { day, receivedAt: R.at(day, 8 * 60), supplier: 'Practice', chilled: 1, tst: true },
    { day: '2026-11-06', receivedAt: R.at('2026-11-06', 600), supplier: 'Other day', chilled: 2 },
    { day, receivedAt: R.at(day, 600), supplier: 'Bad temp', chilled: 'warm', frozen: 500 }
  ], day);
  assert.deepEqual(del.map(d => [d.at, d.s, d.c, d.f]), [['07:42', 'Bidfood', 3.14, -19.55], ['09:05', 'Fresh produce', 4, null], ['10:00', 'Bad temp', null, null]], JSON.stringify(del));
  console.log('PASS records: cleaning due, done, missed, unable, awaiting Pass check and events read like the Cleaning page; deliveries in time order, temperatures as recorded');
})().catch(e => { console.error(e); process.exit(1); });
