/* The count behind every minimum preview (docs/team-minimum-options/brief.md). Pure, no network, no storage.
   In the kitchen at minute m: on a service whose hours cover m (from inclusive, to exclusive) and not on a break that
   covers m (start inclusive, return exclusive). A person on two services at the same minute counts once. The saved
   plan has no personal hours, so a person counts for the whole of each service they are on. */
window.TM_CORE = (function () {
  function svc(plan, id) { return plan.services.filter(function (s) { return s.id === id; })[0]; }
  function inAt(plan, m, opts) {
    opts = opts || {};
    var seen = {}, inn = [], away = [];
    plan.on.forEach(function (o) {
      var s = svc(plan, o.sh), p = plan.people.filter(function (x) { return x.id === o.id; })[0];
      if (!s || !p || s.from == null || s.to == null || !(s.from <= m && m < s.to) || seen[p.id]) return;
      if (opts.noChefs && p.chef) return;
      seen[p.id] = 1;
      var b = plan.br.filter(function (x) { return x.id === p.id && x.at <= m && m < x.at + x.len; })[0];
      if (b) away.push({ p: p, b: b }); else inn.push(p);
    });
    return { inn: inn, away: away };
  }
  // short spells inside each minimum window: a run of minutes below the minimum, with the lowest and highest count, the
  // count's steps ("4, then 5 from 18:45"), the fewest on the plan even with nobody on a break (a short roster) and who
  // is away. opts.from (today: the kitchen clock's minute) leaves out what is already over.
  function spells(plan, mins, opts) {
    opts = opts || {};
    var out = [];
    mins.forEach(function (w) {
      var cur = null, start = Math.max(w.from, opts.from == null ? w.from : opts.from);
      for (var m = start; m <= w.to; m++) {
        var c = m < w.to ? inAt(plan, m, opts) : null, low = c && c.inn.length < w.n;
        if (low) {
          var n = c.inn.length, onPlan = c.inn.length + c.away.length;
          if (!cur) cur = { w: w, from: m, to: m + 1, low: n, high: n, roster: onPlan, steps: [{ at: m, n: n }], away: {} };
          cur.to = m + 1; cur.low = Math.min(cur.low, n); cur.high = Math.max(cur.high, n); cur.roster = Math.min(cur.roster, onPlan);
          if (cur.steps[cur.steps.length - 1].n !== n) cur.steps.push({ at: m, n: n });
          c.away.forEach(function (a) { cur.away[a.p.id] = a.p.name; });
        } else if (cur) { out.push(cur); cur = null; }
      }
    });
    out.forEach(function (s) { s.awayNames = Object.keys(s.away).map(function (k) { return s.away[k]; }); s.awayIds = Object.keys(s.away); });
    return out.sort(function (a, b) { return a.from - b.from; });
  }
  // the minimum that applies at minute m (the highest when two windows overlap), or null
  function minAt(mins, m) { var n = null; mins.forEach(function (w) { if (w.from <= m && m < w.to && (n == null || w.n > n)) n = w.n; }); return n; }
  // the count over the day in 15 minute steps, for a day strip
  function steps(plan, from, to, step, opts) {
    var out = [];
    for (var m = from; m < to; m += step) {
      var low = null;
      for (var k = m; k < m + step; k++) { var c = inAt(plan, k, opts).inn.length; if (low == null || c < low) low = c; }
      out.push({ at: m, n: low, min: minAt(plan.mins, m) });
    }
    return out;
  }
  return { inAt: inAt, spells: spells, minAt: minAt, steps: steps };
})();
if (typeof module !== 'undefined') module.exports = window.TM_CORE;
