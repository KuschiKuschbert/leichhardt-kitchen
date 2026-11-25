/* Spreading cleaning jobs over the week: the planner behind the round 2 previews (26 Nov 2026). A pure function: the same
   jobs and settings in, the same days out. No reads, no clock, no random. It is a preview's engine, not the book's code.

   plan(jobs, opts) -> { days, why, gave, week, start, load, quiet }
   job: { id, text, sec (section name, '' for shared), kind ('' for none), w (1 light, 2 medium, 3 heavy, 0 not set),
          per (days a week it happens, 1 to 3), days (the weekdays it has now, [] for none; 0 is Sunday),
          move (the chef chose it to be planned), every (a repeat's days, 2 to 30 as the rules allow: 28 for a monthly job) }
   A job that is not chosen (move false) is never touched: it only counts toward each day's load.
   opts: { quiet: [5, 6] (Friday, Saturday), share: 0.1, cap: 5, together: true (jobs of one kind share a day) }
   check(jobs, days, opts) -> the rules a set of days breaks, in words ([] for none): what a page runs again whenever a
   chef changes or leaves out one line of a proposal, so a plan never breaks its own rules without saying so.

   The order the rules win in, when they pull against each other:
   1. Friday and Saturday take light jobs only. A job with no weight is never treated as light.
   2. Friday and Saturday together hold at most a tenth of the week's jobs that come round (share).
   3. A section never gets two heavy jobs on one day, and a job on several days has them at least two days apart.
   4. The same kind of job in different sections goes on the same day, unless that would push a section past cap
      weight points on that day. Then the kind gives way, and the plan says so (gave).
   5. Each section's days are as even as they can be, then the kitchen's days.
   6. A job that has a day keeps it unless a rule above moves it or its kind's day is elsewhere. With same-kind days
      off, a job that has a day always keeps it. Friday and Saturday are allowed for a light job, never preferred.
   A job on whole weeks (every 7, 14, 21 or 28) keeps one weekday: it gets it by the same rules, and a starting week,
   1 to every / 7, so jobs on one rhythm do not all start in the same week.
   A job on any other rhythm (every 2 to 6, 8 to 13 and so on) has no weekday to choose: it falls on a different one
   each time and reaches Friday and Saturday whatever its weight, so rules 1 and 2 cannot hold for it. All the plan
   can do is start two such jobs of one section on different days (start: days after the save, 1 to every, so it is
   never due the night it is saved), and say so.
   tonight(jobs, days, today) -> the ids of new jobs whose proposed day is today (0 to 6). A new job starts the day it
   is saved, so it would be due that night: the page says so and leaves it out until the chef puts it in. */
(function (root) {
  'use strict';
  var NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function sets(per) {   // the weekday sets a job on per days a week may take, days at least two apart round the week
    var out = [], a, b, c, gap = function (x, y) { var d = Math.abs(x - y); return Math.min(d, 7 - d); };
    if (per <= 1) { for (a = 0; a < 7; a++) out.push([a]); return out; }
    for (a = 0; a < 7; a++) for (b = a + 1; b < 7; b++) {
      if (gap(a, b) < 2) continue;
      if (per === 2) { out.push([a, b]); continue; }
      for (c = b + 1; c < 7; c++) if (gap(a, c) >= 2 && gap(b, c) >= 2) out.push([a, b, c]);
    }
    return out;
  }
  function plan(jobs, opts) {
    opts = opts || {};
    var quiet = opts.quiet || [5, 6], share = opts.share === undefined ? 0.1 : opts.share, cap = opts.cap || 5, together = opts.together !== false;
    // a job's time cost in the day's load: light 1, medium 2, heavy 3. Not set counts as medium there, and is never
    // light enough for Friday or Saturday (rule 1).
    var cost = function (j) { return j.w >= 1 && j.w <= 3 ? j.w : 2; };
    var sec = {}, kitchen = [0, 0, 0, 0, 0, 0, 0], heavy = {}, kinds = {}, out = { days: {}, why: {}, gave: [], week: {}, load: {}, quiet: {} };
    var put = function (j, d) {
      kitchen[d] += cost(j);
      if (j.sec) { sec[j.sec] = sec[j.sec] || [0, 0, 0, 0, 0, 0, 0]; sec[j.sec][d] += cost(j); if (j.w === 3) { heavy[j.sec] = heavy[j.sec] || {}; heavy[j.sec][d] = 1; } }
      if (j.kind) { kinds[j.kind] = kinds[j.kind] || [0, 0, 0, 0, 0, 0, 0]; kinds[j.kind][d]++; }
    };
    // the jobs that come round: on some weekdays, or every four weeks. A nightly job, or one every few days, loads
    // every day alike and is left out. A job not chosen is never touched: it only counts toward its days' load.
    var comes = jobs.filter(function (j) { return (j.every && j.every % 7 === 0) || (!j.every && (((j.days || []).length > 0 && j.days.length < 7) || (j.move && !(j.days || []).length))); });
    var few = {}; out.start = {};
    jobs.filter(function (j) { return j.move && j.every > 1 && j.every % 7 !== 0; }).sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); }).forEach(function (j) {
      var k = (j.sec || '') + '/' + j.every; few[k] = few[k] || 0; out.start[j.id] = few[k]++ % j.every + 1;
      out.why[j.id] = 'every ' + j.every + ' days has no weekday, so it reaches Friday and Saturday whatever its weight. It starts ' + (out.start[j.id] === 1 ? 'the day after it is saved' : out.start[j.id] + ' days after it is saved, apart from ' + (j.sec || 'the kitchen') + '\'s other job on this rhythm');
    });
    var total = comes.reduce(function (n, j) { return n + (j.move ? j.per || 1 : j.days.length); }, 0), quietMax = Math.floor(total * share), quietUsed = 0;
    comes.filter(function (j) { return !j.move; }).forEach(function (j) { j.days.forEach(function (d) { put(j, d); if (quiet.indexOf(d) >= 0) quietUsed++; }); });
    var dated = function (j) { return (j.days || []).length ? 0 : 1; };
    var todo = comes.filter(function (j) { return j.move; }).sort(function (a, b) { return (together ? 0 : dated(a) - dated(b)) || cost(b) - cost(a) || (b.per || 1) - (a.per || 1) || String(a.kind).localeCompare(String(b.kind)) || String(a.id).localeCompare(String(b.id)); });
    var wk = {};
    todo.forEach(function (j) {
      var best = null, was = (j.days || []).slice().sort().join(','), kindGave = false, heavyGave = false, where = j.sec || 'the kitchen';
      sets(j.per || 1).forEach(function (set) {
        var q = set.filter(function (d) { return quiet.indexOf(d) >= 0; }).length;
        if (q && (j.w !== 1 || quietUsed + q > quietMax)) return;                                          // rules 1 and 2
        // a tenth is a limit, not a target: a job that has a day is never moved onto Friday or Saturday to even the week
        if (was && set.some(function (d) { return quiet.indexOf(d) >= 0 && (j.days || []).indexOf(d) < 0; })) return;
        if (j.w === 3 && j.sec && set.some(function (d) { return heavy[j.sec] && heavy[j.sec][d]; })) { if (together && j.kind && kinds[j.kind] && set.some(function (d) { return kinds[j.kind][d]; })) heavyGave = true; return; }   // rule 3
        var load = j.sec ? set.reduce(function (n, d) { return Math.max(n, ((sec[j.sec] || [])[d] || 0) + cost(j)); }, 0) : 0;
        var mates = together ? set.reduce(function (n, d) { return n + (j.kind && kinds[j.kind] ? kinds[j.kind][d] : 0); }, 0) : 0;
        var over = load > cap, score = (over ? 0 : -1000 * mates) + (set.join(',') === was ? (together ? -300 : -100000) : 0) + 150 * q + 100 * load + 10 * set.reduce(function (n, d) { return n + kitchen[d]; }, 0);
        if (over && mates) kindGave = true;
        if (!best || score < best.score) best = { set: set, score: score, mates: mates, over: over, load: load };
      });
      if (!best) { out.days[j.id] = (j.days || []).slice(); out.why[j.id] = 'No day fits the rules. Left as it is.'; return; }
      best.set.forEach(function (d) { put(j, d); if (quiet.indexOf(d) >= 0) quietUsed++; });
      out.days[j.id] = best.set;
      if (j.every) { wk[j.every] = wk[j.every] || 0; out.week[j.id] = wk[j.every]++ % (j.every / 7) + 1; }   // jobs on one rhythm of whole weeks start in different weeks
      var bits = [];
      if (best.set.join(',') === was) bits.push('stays');
      if (best.mates && !best.over) bits.push('with the other ' + j.kind.toLowerCase() + ' jobs');
      else if (j.kind && heavyGave) { bits.push('not on the ' + j.kind.toLowerCase() + ' day: ' + where + ' already has a heavy job then'); out.gave.push(j.id); }
      else if (j.kind && kindGave) { bits.push('not on the ' + j.kind.toLowerCase() + ' day: ' + where + ' would be too heavy'); out.gave.push(j.id); }
      else if (best.set.join(',') !== was) bits.push(j.sec ? 'a light day for ' + where + ' (weight ' + best.load + ' with it)' : 'a day the rules allow');
      out.why[j.id] = bits.join(', ');
    });
    out.load = { sections: sec, kitchen: kitchen }; out.quiet = { used: quietUsed, most: quietMax, of: total };
    return out;
  }
  function check(jobs, days, opts) {
    opts = opts || {};
    var quiet = opts.quiet || [5, 6], share = opts.share === undefined ? 0.1 : opts.share, cap = opts.cap || 5, out = [], sec = {}, heavy = {}, q = 0, total = 0;
    jobs.forEach(function (j) {
      var mine = days[j.id] || (j.every ? [] : j.days || []);
      if (!j.every && mine.length >= 7 || !mine.length) return;
      total += mine.length;
      mine.forEach(function (d) {
        if (quiet.indexOf(d) >= 0) { q++; if (days[j.id] && j.w !== 1) out.push(j.text + ': only a light job goes on ' + NAMES[d]); }
        if (!j.sec) return;
        sec[j.sec] = sec[j.sec] || [0, 0, 0, 0, 0, 0, 0]; sec[j.sec][d] += j.w >= 1 && j.w <= 3 ? j.w : 2;
        if (j.w === 3) { heavy[j.sec + d] = (heavy[j.sec + d] || 0) + 1; if (heavy[j.sec + d] === 2) out.push(j.sec + ' has two heavy jobs on ' + NAMES[d]); }
      });
    });
    if (q > Math.floor(total * share)) out.push('Friday and Saturday hold ' + q + ' jobs, more than a tenth of the week');
    // a job already on Friday or Saturday that is not marked light is the chef's to look at: the planner never chose it
    jobs.forEach(function (j) { if (!days[j.id] && !j.every && (j.days || []).length < 7 && (j.days || []).some(function (d) { return quiet.indexOf(d) >= 0; }) && j.w !== 1) out.push(j.text + ' is on ' + j.days.filter(function (d) { return quiet.indexOf(d) >= 0; }).map(function (d) { return NAMES[d]; }).join(' and ') + ' and is not marked light'); });
    Object.keys(sec).forEach(function (name) { sec[name].forEach(function (load, d) { if (load > cap && jobs.some(function (j) { return days[j.id] && j.sec === name && days[j.id].indexOf(d) >= 0; })) out.push(name + ' is at weight ' + load + ' on ' + NAMES[d] + ', over ' + cap); }); });
    return out;
  }
  function tonight(jobs, days, today) {
    return jobs.filter(function (j) { return !j.every && !(j.days || []).length && days[j.id] && days[j.id].indexOf(today) >= 0; }).map(function (j) { return j.id; });
  }
  var api = { plan: plan, check: check, tonight: tonight, sets: sets, NAMES: NAMES };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.LK_CLEAN_PLANNER = api;
})(typeof window === 'undefined' ? this : window);
