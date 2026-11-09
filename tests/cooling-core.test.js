// Pure cooling contract checks. No browser, Firebase, timer or system clock is used.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../js/cooling-core.js');
const T = 1794103200000;
const runId = 'operandio_example_0001';
const otherId = 'operandio_example_0002';
const FIRST = 7200000, SECOND = 14400000;
let checks = 0;
function check(name, body) { body(); checks++; console.log('PASS ' + name); }
function stamp(ms) { const seconds = Math.floor(ms / 1000); return { seconds, nanoseconds: (ms - seconds * 1000) * 1000000 }; }
function record(changes) {
  return Object.assign({ v: 1, run: runId, rev: 1, firstAt: stamp(T), firstBy: 'example-cook',
    secondAt: 0, secondBy: '', by: 'example-cook' }, changes);
}
function second(changes) {
  const start = T + FIRST + 10 * 60000;
  return record(Object.assign({ rev: 2, secondAt: stamp(start), secondBy: 'example-chef', by: 'example-chef' }, changes));
}
try {
  check('shared recorded stages suppress their alert for every device', () => {
    const run = C.parse(second());
    const recorded = C.parseRecorded({ v: 1, run: runId, firstAt: stamp(run.firstDue), firstBy: 'other-cook', secondAt: 0, secondBy: '', by: 'other-cook' });
    assert.equal(C.alert(run, run.secondAt, {}, recorded), null);
    assert.equal(C.alert(run, run.secondDue, {}, recorded).stage, 2);
  });
  check('shared declarations validate paired timestamps and actors independently from timer starts', () => {
    const raw = { v: 1, run: runId, firstAt: stamp(T + FIRST), firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' };
    assert.deepEqual(C.parseRecorded(raw), { id: runId, firstAt: T + FIRST, firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' });
    const secondOnly = { ...raw, firstAt: 0, firstBy: '', secondAt: stamp(T + FIRST + SECOND), secondBy: 'bo', by: 'bo' };
    assert.equal(C.parseRecorded(secondOnly).secondBy, 'bo');
    const both = C.parseRecorded({ ...raw, secondAt: stamp(T + FIRST + SECOND), secondBy: 'bo', by: 'bo', html: '<script>ignored</script>' });
    assert.equal(both.firstBy, 'ann'); assert.equal(both.secondBy, 'bo'); assert.equal(Object.hasOwn(both, 'html'), false);
    for (const bad of [null, [], {}, { ...raw, v: 2 }, { ...raw, run: 'bad' }, { ...raw, firstAt: T + FIRST },
      { ...raw, firstAt: stamp(0) }, { ...raw, firstBy: '' }, { ...raw, firstAt: 0 }, { ...raw, secondBy: 'bo' },
      { ...raw, secondAt: stamp(T) }, { ...raw, by: 'neither' }, { ...raw, by: '' }, { ...raw, firstAt: 0, firstBy: '' },
      { ...raw, firstAt: { seconds: 1, nanoseconds: -1 } }, { ...raw, firstBy: ' ann ' }]) assert.equal(C.parseRecorded(bad), null);
  });
  check('only matching due declarations suppress a stage and the next batch remains independent', () => {
    const run = C.parse(second());
    const first = C.parseRecorded({ v: 1, run: runId, firstAt: stamp(run.firstDue), firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' });
    assert.equal(C.recordedFor(run, first), true);
    assert.equal(C.recordedFor(run, { ...first, id: otherId }), false);
    assert.equal(C.recordedFor(run, { ...first, firstAt: run.firstDue - 1 }), false);
    assert.equal(C.alert(run, run.secondDue, {}, { ...first, id: otherId }).stage, 1);
    assert.equal(C.alert(run, run.secondDue, {}, { ...first, firstAt: run.firstDue - 1 }).stage, 1);
    const both = { ...first, secondAt: run.secondDue, secondBy: 'bo', by: 'bo' };
    assert.equal(C.alert(run, run.secondDue + 86400000, {}, both), null);
    assert.equal(C.alert(C.parse(second({ run: otherId })), run.secondDue, {}, both).stage, 1);
    assert.equal(C.recordedFor(C.parse(record()), both), false);
  });
  check('the browser and node expose the same pure API without clock or DOM access', () => {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/cooling-core.js'), 'utf8'), sandbox);
    assert.deepEqual(Object.keys(sandbox.window.LK_COOLING), Object.keys(C));
    assert.equal(sandbox.window.LK_COOLING.message(2), C.message(2));
  });
  check('only bounded safe run identities are accepted', () => {
    for (const value of ['a'.repeat(16), 'a'.repeat(80), runId, 'a_B-'.repeat(4)]) assert.equal(C.id(value), true);
    for (const value of ['', 'a'.repeat(15), 'a'.repeat(81), runId + '\n', runId + '\r', '../operandio_0001', 'operandio/x_00001', '<script>123456789', 123, null]) assert.equal(C.id(value), false);
  });
  check('parsing copies only canonical fields and derives fixed deadlines from Timestamp components', () => {
    const raw = record({ extra: '<script>ignore()</script>', firstDue: 1, schedule: { first: 'queued' } }), parsed = C.parse(raw);
    assert.deepEqual(parsed, { id: runId, rev: 1, firstAt: T, firstDue: T + FIRST, firstBy: 'example-cook',
      secondAt: 0, secondDue: 0, restartAt: 0, secondBy: '', by: 'example-cook' });
    raw.firstAt.seconds = 0; raw.firstBy = 'different-cook';
    assert.equal(parsed.firstAt, T); assert.equal(parsed.firstDue, T + FIRST); assert.equal(parsed.firstBy, 'example-cook');
    assert.equal(C.parse(record({ firstAt: { ...stamp(T), toMillis() { throw Error('Components avoid method calls.'); } } })).firstAt, T);
  });
  check('numeric starts, malformed Timestamp components, revisions, actors and incomplete stages are rejected', () => {
    const broken = [null, {}, [], record({ v: 2 }), record({ rev: 0 }), record({ rev: 1.5 }), record({ rev: '1' }),
      record({ firstAt: T }), record({ firstAt: NaN }), record({ firstAt: Infinity }), record({ firstAt: -1 }),
      record({ firstAt: stamp(0) }), record({ firstAt: null }), record({ firstAt: new Date(T) }),
      record({ firstAt: { seconds: T / 1000 } }), record({ firstAt: { seconds: '123', nanoseconds: 0 } }),
      record({ firstAt: { seconds: -1, nanoseconds: 1 } }), record({ firstAt: { seconds: 253402300800, nanoseconds: 0 } }),
      record({ firstAt: { seconds: 1.5, nanoseconds: 0 } }), record({ firstAt: { seconds: Infinity, nanoseconds: 0 } }),
      record({ firstAt: { seconds: 1, nanoseconds: -1 } }), record({ firstAt: { seconds: 1, nanoseconds: 1000000000 } }),
      record({ firstAt: { seconds: 1, nanoseconds: .5 } }), record({ firstAt: { seconds: 1, nanoseconds: NaN } }),
      record({ firstAt: { seconds: 1, nanoseconds: '0' } }), record({ firstAt: { toMillis: () => T } }), record({ firstBy: '' }),
      record({ firstBy: ' staff ' }), record({ firstBy: 'x'.repeat(81) }), record({ firstBy: {} }),
      record({ secondAt: null }), record({ secondAt: T + FIRST }), record({ secondBy: ' ' }), record({ by: '' }),
      record({ by: 'another-cook' }), second({ secondAt: stamp(T + FIRST - 1) }), second({ secondBy: '' }),
      second({ secondAt: { seconds: (T + FIRST) / 1000, nanoseconds: -1 } }), second({ by: 'example-cook' })];
    broken.forEach(value => assert.equal(C.parse(value), null, JSON.stringify(value)));
  });
  check('submillisecond starts round up and exact raw ordering prevents early stage two', () => {
    const firstAt = { seconds: T / 1000, nanoseconds: 1 };
    const run = C.parse(record({ firstAt }));
    assert.equal(run.firstAt, T + 1); assert.equal(run.firstDue, T + FIRST + 1);
    assert.equal(C.phase(run, T + FIRST), 'first'); assert.equal(C.allowed(run, 2, T + FIRST), false);
    assert.equal(C.allowed(run, 2, T + FIRST + 1), true);
    const justBefore = { seconds: T / 1000 + FIRST / 1000, nanoseconds: 0 };
    assert.equal(C.parse(second({ firstAt, secondAt: justBefore })), null);
    const exact = C.parse(second({ firstAt, secondAt: { ...justBefore, nanoseconds: 1 } }));
    assert.equal(exact.secondAt, T + FIRST + 1);
    assert.equal(exact.secondDue, T + FIRST + SECOND + 1);
    assert.equal(C.parse(record({ firstAt: { seconds: T / 1000, nanoseconds: 999999999 } })).firstAt, T + 1000);
    const sameRoundedMillis = { seconds: T / 1000, nanoseconds: 900000 };
    assert.equal(C.parse(second({ firstAt: sameRoundedMillis, secondAt: { ...justBefore, nanoseconds: 800000 } })), null);
  });
  check('first timer runs for two hours and then waits without starting four hours', () => {
    const run = C.parse(record());
    assert.equal(C.phase(null, T), 'idle'); assert.equal(C.allowed(null, 1, T), true);
    assert.equal(C.allowed(null, 2, T), false); assert.equal(C.phase(run, T), 'first');
    assert.equal(C.phase(run, T + FIRST - 1), 'first'); assert.equal(C.allowed(run, 2, T + FIRST - 1), false);
    assert.equal(C.phase(run, T + FIRST), 'first_due'); assert.equal(C.allowed(run, 2, T + FIRST), true);
    assert.equal(C.phase(run, T + FIRST + SECOND + 86400000), 'first_due');
    assert.equal(C.remaining(run, 2, T + FIRST + SECOND), null);
    assert.equal(C.allowed(run, 1, T + FIRST + SECOND), false);
  });
  check('the second timer starts from its separate accepted tick after the gap', () => {
    const run = C.parse(second());
    assert.equal(run.secondAt, T + FIRST + 600000);
    assert.equal(C.phase(run, run.secondAt), 'second'); assert.equal(C.remaining(run, 2, run.secondAt), SECOND);
    assert.equal(C.phase(run, T + FIRST + SECOND), 'second');
    assert.equal(C.phase(run, run.secondDue - 1), 'second'); assert.equal(C.phase(run, run.secondDue), 'second_due');
    assert.equal(C.allowed(run, 2, run.secondDue), false); assert.equal(C.allowed(run, 1, run.secondDue), false);
  });
  check('a completed batch stays locked until the next Queensland calendar day', () => {
    const midnight = Date.parse('2026-11-10T00:00:00+10:00');
    for (const due of [midnight - 1, midnight, midnight + 1, midnight + 23 * 3600000]) {
      const unlock = due < midnight ? midnight : midnight + 86400000;
      const run = C.parse(second({ firstAt: stamp(due - FIRST - SECOND), secondAt: stamp(due - SECOND) }));
      assert.equal(run.restartAt, unlock);
      assert.equal(C.allowed(run, 1, due), false);
      assert.equal(C.allowed(run, 1, unlock - 1), false);
      assert.equal(C.allowed(run, 1, unlock), true);
      assert.equal(C.phase(run, unlock), 'second_due');
      assert.equal(C.allowed(run, 2, unlock), false);
    }
    // A raw deadline just before midnight rounds up for display, but still belongs to the earlier day.
    const precise = C.parse(second({ firstAt: stamp(midnight - FIRST - SECOND - 1000),
      secondAt: { seconds: (midnight - SECOND) / 1000 - 1, nanoseconds: 999999999 } }));
    assert.equal(precise.secondDue, midnight); assert.equal(precise.restartAt, midnight);
    assert.equal(C.allowed(precise, 1, midnight), true);
  });
  check('clock correction never changes accepted state or extends its fixed duration', () => {
    const first = C.parse(record()), next = C.parse(second());
    assert.equal(C.phase(first, T - 60000), 'first'); assert.equal(C.remaining(first, 1, T - 60000), FIRST);
    assert.equal(C.phase(next, T - 60000), 'second'); assert.equal(C.remaining(next, 2, T - 60000), SECOND);
    assert.equal(C.remaining(next, 1, next.secondDue), 0); assert.equal(C.remaining(next, 2, next.secondDue + 1000), 0);
    for (const at of [NaN, Infinity, null, '123', 0, -1]) {
      assert.equal(C.phase(first, at), null); assert.equal(C.allowed(first, 2, at), false);
      assert.equal(C.remaining(first, 1, at), null); assert.equal(C.alert(first, at, {}), null);
    }
  });
  check('alerts are exact, keyed per run and stage, and stay due until personal acknowledgement', () => {
    const first = C.parse(record()), next = C.parse(second()), seen = {};
    assert.equal(C.alert(first, first.firstDue - 1, seen), null);
    assert.deepEqual(C.alert(first, first.firstDue, seen), { key: runId + '_1', stage: 1, hours: 2, due: first.firstDue,
      message: 'Operandio batch cooling time 2 hours is done.' });
    // Someone starting the second stage does not acknowledge the first message for this person.
    assert.equal(C.alert(next, next.secondAt, seen).stage, 1);
    seen[runId + '_1'] = true;
    assert.equal(C.alert(next, next.secondAt, seen), null);
    assert.deepEqual(C.alert(next, next.secondDue, seen), { key: runId + '_2', stage: 2, hours: 4, due: next.secondDue,
      message: 'Operandio batch cooling time 4 hours is done.' });
    seen[runId + '_2'] = next.secondDue;
    assert.equal(C.alert(next, next.secondDue + 86400000, seen), null);
    assert.equal(C.alert(next, next.secondDue, {}).stage, 1);
    assert.equal(C.alert(C.parse(second({ run: otherId, rev: 4 })), next.secondDue, seen).key, otherId + '_1');
    assert.equal(C.alert(next, next.secondDue, Object.create(seen)).stage, 1);
    assert.equal(C.alert(next, next.secondDue, { [runId + '_1']: 'untrusted' }).stage, 1);
  });
  check('a request binds to the current revision and cannot replay against a later stage or run', () => {
    const first = C.parse(record()), next = C.parse(second()), newer = C.parse(record({ run: otherId, rev: 3 }));
    assert.deepEqual(C.expected(null), { expectedRun: '', expectedRev: 0 });
    assert.equal(C.matches(null, '', 0), true); assert.equal(C.matches(null, runId, 0), false);
    assert.deepEqual(C.expected(first), { expectedRun: runId, expectedRev: 1 });
    assert.equal(C.matches(first, runId, 1), true); assert.equal(C.matches(next, runId, 1), false);
    assert.equal(C.matches(newer, runId, 1), false); assert.equal(C.matches(first, runId, '1'), false);
    assert.equal(C.expected({}), null); assert.equal(C.matches({}, '', 0), false);
  });
  check('unsupported stages and malformed models fail closed', () => {
    for (const stage of [0, 3, 4, '1', '2', null]) {
      assert.equal(C.duration(stage), null); assert.equal(C.message(stage), null);
      assert.equal(C.allowed(C.parse(record()), stage, T), false); assert.equal(C.remaining(C.parse(record()), stage, T), null);
    }
    assert.equal(C.duration(1), FIRST); assert.equal(C.duration(2), SECOND);
    assert.equal(C.phase({}, T), null); assert.equal(C.allowed({}, 1, T), false); assert.equal(C.alert({}, T, {}), null);
    assert.equal(C.remaining(null, 1, T), null);
  });
  console.log('0 failed of ' + checks + ' cooling contract groups');
} catch (error) { console.error(error); process.exit(1); }
