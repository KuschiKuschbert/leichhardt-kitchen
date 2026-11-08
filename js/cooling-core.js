/* Operandio cooling: shared timing and record checks only. Callers provide the kitchen clock (LK_TIME.now()).
   No requests, timers, storage or permission decisions belong here. A deadline is never moved by this code. */
(function () {
  'use strict';
  var FIRST = 2 * 60 * 60 * 1000, SECOND = 4 * 60 * 60 * 1000;
  var MAX = Number.MAX_SAFE_INTEGER;
  function integer(value, minimum) { return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum; }
  function id(value) { return typeof value === 'string' && /^[A-Za-z0-9_-]{16,80}$/.test(value); }
  function actor(value) { return typeof value === 'string' && value.length > 0 && value.length <= 80 && value.trim() === value; }
  function duration(stage) { return stage === 1 ? FIRST : stage === 2 ? SECOND : null; }
  function schedule(value) { return value === 'pending' || value === 'queued' || value === 'failed'; }
  function valid(run, key) {
    if (!run || typeof run !== 'object' || Array.isArray(run) || !id(run[key]) || !integer(run.rev, 1)
      || !integer(run.firstAt, 1) || run.firstAt > MAX - FIRST || run.firstDue !== run.firstAt + FIRST
      || !actor(run.firstBy) || !run.schedule || typeof run.schedule !== 'object' || Array.isArray(run.schedule)
      || !schedule(run.schedule.first)) return false;
    if (run.secondAt === 0) return run.secondDue === 0 && run.secondBy === '' && run.schedule.second === '';
    return integer(run.secondAt, run.firstDue) && run.secondAt <= MAX - SECOND
      && run.secondDue === run.secondAt + SECOND && actor(run.secondBy) && schedule(run.schedule.second);
  }
  // Pick recognised fields into a separate model. Future additive server fields cannot become screen markup.
  function parse(record) {
    if (!record || record.v !== 1 || !valid(record, 'run')) return null;
    return { id: record.run, rev: record.rev, firstAt: record.firstAt, firstDue: record.firstDue, firstBy: record.firstBy,
      secondAt: record.secondAt, secondDue: record.secondDue, secondBy: record.secondBy,
      schedule: { first: record.schedule.first, second: record.schedule.second } };
  }
  function phase(run, at) {
    if (!integer(at, 1)) return null;
    if (run === null) return 'idle';
    if (!valid(run, 'id')) return null;
    if (run.secondAt) return at >= run.secondDue ? 'second_due' : 'second';
    return at >= run.firstDue ? 'first_due' : 'first';
  }
  // This is a UI guard, not authority. The server must check the revision, session and its own time again.
  function allowed(run, stage, at) {
    var state = phase(run, at);
    return stage === 1 ? state === 'idle' || state === 'second_due' : stage === 2 && state === 'first_due';
  }
  function remaining(run, stage, at) {
    var span = duration(stage);
    if (span === null || !integer(at, 1) || !valid(run, 'id') || stage === 2 && !run.secondAt) return null;
    // A backwards clock correction cannot manufacture more than the accepted duration.
    return Math.max(0, Math.min(span, (stage === 1 ? run.firstDue : run.secondDue) - at));
  }
  function message(stage) {
    return duration(stage) === null ? null : 'Operandio batch cooling time ' + (stage === 1 ? '2' : '4') + ' hours is done.';
  }
  function seen(map, key) {
    if (!map || typeof map !== 'object' || !Object.prototype.hasOwnProperty.call(map, key)) return false;
    return map[key] === true || integer(map[key], 1);
  }
  // Acknowledgements are personal. Starting stage two does not acknowledge its predecessor for someone else.
  function alert(run, at, seenMap) {
    if (!integer(at, 1) || !valid(run, 'id')) return null;
    for (var stage = 1; stage <= 2; stage++) {
      var due = stage === 1 ? run.firstDue : run.secondDue, key = run.id + '_' + stage;
      if (due && at >= due && !seen(seenMap, key)) {
        return { key: key, stage: stage, hours: stage === 1 ? 2 : 4, due: due, message: message(stage) };
      }
    }
    return null;
  }
  function expected(run) {
    if (run === null) return { expectedRun: '', expectedRev: 0 };
    return valid(run, 'id') ? { expectedRun: run.id, expectedRev: run.rev } : null;
  }
  function matches(run, expectedRun, expectedRev) {
    var value = expected(run);
    return !!value && value.expectedRun === expectedRun && value.expectedRev === expectedRev;
  }
  var api = { parse: parse, id: id, phase: phase, allowed: allowed, duration: duration, remaining: remaining,
    message: message, alert: alert, expected: expected, matches: matches };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  window.LK_COOLING = api;
})();
