/* Cleaning: how a cleaning day reads (24 Nov 2026). The one copy for the Cleaning page (js/cleaning.js), the book's
   cleaning write checks (cleaningDue() in js/prep.js) and the nightly Records count (scripts/records-core.mjs).
   Lazy: loaded with Cleaning, never at startup. Node loads it with createRequire. Pure: no page, no storage, no clock
   of its own. The kitchen clock comes in as an argument: { at(day), dow(ms), day(ms) }, LK_TIME on a phone and
   Queensland time in node. firestore.rules keeps its own check of a due day (cleanInterval()); keep the two in step. */
(function (root) {
  'use strict';
  var DAY_MS = 86400000, EVENTS = ['service', 'prep-service', 'food', 'use'];
  function isDay(day) { return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day); }
  // A real kitchen date: the clock reads it back the same (no 30 February), as the book checks a repeat's anchor.
  function realDay(day, clock) { return isDay(day) && clock.day(clock.at(day)) === day; }
  // Due on a day: inside the revision's dates, on one of its weekdays, and on its repeat when it has one. An unset
  // anchor is never due, so a repeat waits for setup instead of becoming daily.
  function due(task, day, clock) {
    if (!task) return false;
    var at = clock.at(day), repeat = task.plan && task.plan.repeat;
    return task.from <= at && task.until > at && Array.isArray(task.dows) && task.dows.indexOf(clock.dow(at)) >= 0 &&
      (!repeat || !!repeat.anchor && realDay(repeat.anchor, clock) && at >= clock.at(repeat.anchor) && (at - clock.at(repeat.anchor)) / DAY_MS % repeat.days === 0);
  }
  // A plain job's record of a day (the first one), or null.
  function record(task, day, done) {
    return (done || []).filter(function (r) { return r && r.task === task.id && r.day === day; })[0] || null;
  }
  // A planned job's checks on a day, in order: the fixed ones its timing gives (daily; close; food: start and close),
  // then each slot recorded that day, then each slot a phone has not saved yet (drafts: { task, day, slot, kind }).
  // Each comes once, with the first record saved for it: { slot, kind, record }.
  function slots(task, day, done, drafts) {
    var timing = task.plan.timing, out = [], seen = [];
    var mine = (done || []).filter(function (r) { return r && r.task === task.id && r.day === day && r.flow; });
    function add(slot, kind) {
      if (seen.indexOf(slot) >= 0) return;
      seen.push(slot);
      out.push({ slot: slot, kind: kind, record: mine.filter(function (r) { return r.flow.slot === slot; })[0] || null });
    }
    if (timing === 'daily') add('daily', 'daily');
    if (timing === 'close') add('close', 'close');
    if (timing === 'food') { add('start', 'start'); add('close', 'close'); }
    mine.forEach(function (r) { add(r.flow.slot, r.flow.kind); });
    (drafts || []).forEach(function (d) { if (d && d.task === task.id && d.day === day) add(d.slot, d.kind); });
    return out;
  }
  // The counts over a job's slots. An event job (service, prep and service, food, use) is never done: its events are
  // recorded as they happen and nobody knows how many there will be.
  function summary(task, list) {
    var s = { total: list.length, complete: 0, awaiting: 0, blocked: 0, pending: 0, events: EVENTS.indexOf(task.plan.timing) >= 0, done: false };
    list.forEach(function (item) {
      var r = item.record, state = r && r.flow.status || 'pending';
      if (state === 'complete') s.complete++; else if (state === 'awaiting') s.awaiting++; else if (state === 'blocked') s.blocked++; else s.pending++;
    });
    s.done = !s.events && list.length > 0 && s.complete === list.length;
    return s;
  }
  // What the counts say, in this order: blocked (Unable to complete), awaiting (Pass check), done, an event job, else
  // open (Missed on a past day). The page puts its own words on it (flowState() in js/cleaning.js).
  function outcome(s) { return s.blocked ? 'blocked' : s.awaiting ? 'awaiting' : s.done ? 'done' : s.events ? 'event' : 'open'; }
  // A finished day for one due job, for Records: { state: done | missed | blocked (with the first blocked slot's note)
  // | awaiting | event (recorded: at least one event complete) }. A plain job is done or missed by its record.
  function past(task, day, done) {
    if (!task.plan) { var r = record(task, day, done); return { state: r && r.done ? 'done' : 'missed' }; }
    var list = slots(task, day, done), s = summary(task, list), state = outcome(s);
    if (state === 'blocked') return { state: state, note: list.filter(function (item) { return item.record && item.record.flow.status === 'blocked'; })[0].record.flow.note };
    if (state === 'event') return { state: state, recorded: s.complete > 0 };
    return { state: state === 'open' ? 'missed' : state };
  }
  var api = { api: 1, isDay: isDay, due: due, record: record, slots: slots, summary: summary, outcome: outcome, past: past };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LK_CLEANING_CORE = api;
})(typeof window === 'undefined' ? this : window);
