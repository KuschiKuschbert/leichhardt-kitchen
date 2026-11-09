/* Operandio cooling: shared timing and record checks only. Callers provide the kitchen clock (LK_TIME.now()).
   No requests, timers, storage or permission decisions belong here. A deadline is never moved by this code. */
(function () {
  'use strict';
  var FIRST = 2 * 60 * 60 * 1000, SECOND = 4 * 60 * 60 * 1000;
  var MAX = Number.MAX_SAFE_INTEGER, DAY = 86400000, QUEENSLAND = 10 * 60 * 60 * 1000;
  function integer(value, minimum) { return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum; }
  function id(value) { return typeof value === 'string' && value.length >= 16 && value.length <= 80 && !/[^A-Za-z0-9_-]/.test(value); }
  function actor(value) { return typeof value === 'string' && value.length > 0 && value.length <= 80 && value.trim() === value; }
  function duration(stage) { return stage === 1 ? FIRST : stage === 2 ? SECOND : null; }
  function timestamp(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value)
      && integer(value.seconds, 0) && value.seconds <= 253402300799
      && integer(value.nanoseconds, 0) && value.nanoseconds < 1000000000;
  }
  // Read Timestamp components, including the JSON/fake equivalent, without losing fractional precision to toMillis().
  // Rounding up means an integer kitchen-clock tick never offers a stage before the server's exact deadline.
  function milliseconds(value) { return value.seconds * 1000 + Math.ceil(value.nanoseconds / 1000000); }
  function valid(run) {
    if (!run || typeof run !== 'object' || Array.isArray(run) || !id(run.id) || !integer(run.rev, 1)
      || !integer(run.firstAt, 1) || run.firstAt > MAX - FIRST || run.firstDue !== run.firstAt + FIRST
      || !actor(run.firstBy) || !actor(run.by)) return false;
    if (run.secondAt === 0) return run.secondDue === 0 && run.restartAt === 0 && run.secondBy === '' && run.by === run.firstBy;
    return integer(run.secondAt, run.firstDue) && run.secondAt <= MAX - SECOND
      && run.secondDue === run.secondAt + SECOND && integer(run.restartAt, run.secondDue)
      && run.restartAt <= run.secondDue + DAY && actor(run.secondBy) && run.by === run.secondBy;
  }
  // Pick recognised fields into a separate model. Future additive server fields cannot become screen markup.
  function parse(record) {
    if (!record || typeof record !== 'object' || Array.isArray(record) || record.v !== 1 || !timestamp(record.firstAt)
      || record.secondAt !== 0 && !timestamp(record.secondAt)) return null;
    if (record.secondAt !== 0) {
      var earliest = record.firstAt.seconds + FIRST / 1000;
      if (record.secondAt.seconds < earliest || record.secondAt.seconds === earliest
        && record.secondAt.nanoseconds < record.firstAt.nanoseconds) return null;
    }
    var firstAt = milliseconds(record.firstAt), secondAt = record.secondAt === 0 ? 0 : milliseconds(record.secondAt);
    var run = { id: record.run, rev: record.rev, firstAt: firstAt, firstDue: firstAt + FIRST, firstBy: record.firstBy,
      secondAt: secondAt, secondDue: secondAt ? secondAt + SECOND : 0,
      // Use raw seconds for the calendar day. Rounding a last nanosecond up must not add another locked day.
      restartAt: secondAt ? (Math.floor(((record.secondAt.seconds * 1000) + SECOND + QUEENSLAND) / DAY) + 1) * DAY - QUEENSLAND : 0, secondBy: record.secondBy, by: record.by };
    return valid(run) ? run : null;
  }
  function phase(run, at) {
    if (!integer(at, 1)) return null;
    if (run === null) return 'idle';
    if (!valid(run)) return null;
    if (run.secondAt) return at >= run.secondDue ? 'second_due' : 'second';
    return at >= run.firstDue ? 'first_due' : 'first';
  }
  // This is a UI guard, not authority. The server must check the revision, session and its own time again.
  function allowed(run, stage, at) {
    var state = phase(run, at);
    return stage === 1 ? state === 'idle' || state === 'second_due' && at >= run.restartAt : stage === 2 && state === 'first_due';
  }
  function remaining(run, stage, at) {
    var span = duration(stage);
    if (span === null || !integer(at, 1) || !valid(run) || stage === 2 && !run.secondAt) return null;
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
    if (!integer(at, 1) || !valid(run)) return null;
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
    return valid(run) ? { expectedRun: run.id, expectedRev: run.rev } : null;
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
