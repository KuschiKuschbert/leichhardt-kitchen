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
function record(changes) {
  return Object.assign({ v: 1, run: runId, rev: 1, firstAt: T, firstDue: T + FIRST, firstBy: 'example-cook',
    secondAt: 0, secondDue: 0, secondBy: '', schedule: { first: 'queued', second: '' } }, changes);
}
function second(changes) {
  const start = T + FIRST + 10 * 60000;
  return record(Object.assign({ rev: 2, secondAt: start, secondDue: start + SECOND, secondBy: 'example-chef',
    schedule: { first: 'queued', second: 'queued' } }, changes));
}
try {
  check('the browser and node expose the same pure API without clock or DOM access', () => {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/cooling-core.js'), 'utf8'), sandbox);
    assert.deepEqual(Object.keys(sandbox.window.LK_COOLING), Object.keys(C));
    assert.equal(sandbox.window.LK_COOLING.message(2), C.message(2));
  });
  check('only bounded safe run identities are accepted', () => {
    for (const value of ['a'.repeat(16), 'a'.repeat(80), runId, 'a_B-'.repeat(4)]) assert.equal(C.id(value), true);
    for (const value of ['', 'a'.repeat(15), 'a'.repeat(81), '../operandio_0001', 'operandio/x_00001', '<script>123456789', 123, null]) assert.equal(C.id(value), false);
  });
  check('parsing preserves only the canonical fields and copies nested scheduling state', () => {
    const raw = record({ extra: '<script>ignore()</script>' }), parsed = C.parse(raw);
    assert.deepEqual(parsed, { id: runId, rev: 1, firstAt: T, firstDue: T + FIRST, firstBy: 'example-cook',
      secondAt: 0, secondDue: 0, secondBy: '', schedule: { first: 'queued', second: '' } });
    raw.schedule.first = 'failed'; raw.firstDue = 0;
    assert.equal(parsed.schedule.first, 'queued'); assert.equal(parsed.firstDue, T + FIRST);
  });
  check('malformed dates, revision, actors and incomplete stages are rejected', () => {
    const broken = [null, {}, [], record({ v: 2 }), record({ rev: 0 }), record({ rev: 1.5 }), record({ rev: '1' }),
      record({ firstAt: NaN }), record({ firstAt: Infinity }), record({ firstAt: -1 }), record({ firstAt: T + .5 }),
      record({ firstAt: Number.MAX_SAFE_INTEGER, firstDue: Number.MAX_SAFE_INTEGER + FIRST }),
      record({ firstDue: T + FIRST - 1 }), record({ firstDue: String(T + FIRST) }), record({ firstBy: '' }),
      record({ firstBy: ' staff ' }), record({ firstBy: 'x'.repeat(81) }), record({ firstBy: {} }),
      record({ secondAt: null }), record({ secondDue: 1 }), record({ secondBy: ' ' }),
      record({ schedule: null }), record({ schedule: [] }), record({ schedule: { first: 'sent', second: '' } }),
      record({ schedule: { first: 'queued', second: 'queued' } }), second({ secondAt: T + FIRST - 1 }),
      second({ secondDue: T + FIRST + SECOND }), second({ secondBy: '' }),
      second({ schedule: { first: 'queued', second: '' } })];
    broken.forEach(value => assert.equal(C.parse(value), null, JSON.stringify(value)));
  });
  check('a scheduling delay or failure does not alter the accepted timer deadline', () => {
    for (const first of ['pending', 'queued', 'failed']) {
      const parsed = C.parse(record({ schedule: { first, second: '' } }));
      assert.equal(C.phase(parsed, T + FIRST), 'first_due');
      assert.equal(C.remaining(parsed, 1, T + 1000), FIRST - 1000);
    }
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
    assert.equal(C.allowed(run, 2, run.secondDue), false); assert.equal(C.allowed(run, 1, run.secondDue), true);
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
