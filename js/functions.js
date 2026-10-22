/*
  Functions (21 Oct 2026): function bookings with platters, for the kitchen.
  A function manager (someone the head chef ticked for Functions in the admin People tab, or the head chef's Google
  account) enters a function once in #/functions (js/fnedit.js). This file is what everyone sees:
    - the band under the top bar on every page: each function from 00:00 on its day until it is over
    - the function sheet (a popup from the band, and #/fn/<id>), and #/fn: today, the next three days and their totals
    - the "Upcoming functions" card on the landing page
  It also holds the schedule maths (split, rounds, when a function shows and goes), which node runs in
  tests/fn-schedule.js, and which js/fnedit.js uses to check a booking before it is saved.

  Data (kitchens/<PIN>/...):
    functions/<id>          the kitchen's copy (no phone or email): name, date, start, loc, guests (gu: not known yet), mode (all or stag),
                            lines [{ rid, name, unit, spec, fp, qty, u }], rounds [{ at, note }], notes, kc (kitchen comment),
                            kcBy, kcAt, first, last, from, until, kq, was, chg, cBy, cAt, confBy, confAt, canBy, canAt, by, upd, v
    functions/<id>/hist/<v> every earlier version, never changed
    fncontact/<id>          the booking contact (cname, phone, email): read only by the function pages, one at a time
  A platter line's u is the round each platter goes out in (0 is the first round), so 5 platters as 2, 2 and 1 is
  [0, 0, 1, 1, 2]. Its length is the number booked, so the rounds always add up to the booking (the rules check it).
  Times are whole moments (ms), so a round after midnight is simply the next day. Kitchen time is Queensland (UTC+10).

  Reads: one live listener on the functions still to show (kq from 00:00 today), started once the kitchen PIN is in.
  A change on the manager's phone reaches the kitchen in seconds. The last good copy is kept in lk.fn for a bad signal.
*/
(function () {
  'use strict';

  /* ---------- the schedule maths (no page, no Firebase: node runs this part too) ---------- */
  var MIN = 60000, HOUR = 3600000, DAY = 86400000, ZONE = 10 * HOUR;
  var MAX_LINES = 12, MAX_ROUNDS = 8, MAX_QTY = 300, MAX_PER = 300;
  var SHOW_AFTER_START = 2 * HOUR, SHOW_AFTER_LAST = 30 * MIN;
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  // a moment as the kitchen's date, and a kitchen date and minutes after midnight as a moment (same as LK_TIME)
  function kday(ms) { var d = new Date(ms + ZONE); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
  function kat(ymd, min) { var a = String(ymd).split('-'); return Date.UTC(+a[0], a[1] - 1, +a[2]) - ZONE + (min || 0) * MIN; }
  function kclock(ms) { var d = new Date(ms + ZONE); return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); }
  function dayStart(ms) { return kat(kday(ms), 0); }
  function addDays(ymd, n) { return kday(kat(ymd, 12 * 60) + n * DAY); }
  function isYmd(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && kday(kat(s, 0)) === s; }
  // "18:30" to minutes after midnight, or NaN
  function hmMin(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : NaN; }
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function dayName(ymd) { var a = String(ymd).split('-'), d = new Date(Date.UTC(+a[0], a[1] - 1, +a[2])); return isYmd(ymd) ? DOW[d.getUTCDay()] + ' ' + (+a[2]) + ' ' + MON[a[1] - 1] : ''; }
  // a time on the function's day reads "18:30"; on another day it carries that day: "Sun 25 Oct 00:30 (next day)"
  function when(ms, ymd) {
    if (!ms) return 'TBC';   // a time still to be confirmed (event start TBC)
    var d = kday(ms);
    if (!ymd || d === ymd) return kclock(ms);
    return dayName(d) + ' ' + kclock(ms) + (d === addDays(ymd, 1) ? ' (next day)' : d === addDays(ymd, -1) ? ' (day before)' : '');
  }

  // an even split, earlier rounds first: 5 over 3 is 2, 2, 1. Never a half platter, never more or fewer than booked.
  function even(qty, n) {
    var out = [], i, b = Math.floor(qty / n), r = qty - b * n;
    for (i = 0; i < n; i++) out.push(b + (i < r ? 1 : 0));
    return out;
  }
  // counts per round to the stored list of round numbers, and back
  function toU(a) { var u = []; a.forEach(function (c, i) { for (var k = 0; k < c; k++) u.push(i); }); return u; }
  function fromU(u, n) { var a = [], i; for (i = 0; i < n; i++) a.push(0); (u || []).forEach(function (r) { if (r >= 0 && r < n) a[r]++; }); return a; }
  function sum(a) { return a.reduce(function (t, x) { return t + (+x || 0); }, 0); }
  function roundTimes(first, n, gap) { var out = [], i; for (i = 0; i < n; i++) out.push(first + i * gap * MIN); return out; }

  /* When the kitchen sees a function: from 00:00 on its date (or on the day the first platters go, if that is earlier)
     until the later of 2 hours after the event start and 30 minutes after the last round. The 30 minutes are so the
     last round stays on screen while it is sent and plated. */
  function windowOf(date, start, first, last) {
    var from = kat(date, 0), ends = [];
    if (first && first < from) from = dayStart(first);
    if (start) ends.push(start + SHOW_AFTER_START);
    if (last || start) ends.push((last || start) + SHOW_AFTER_LAST);
    // times still TBC: the kitchen sees it all day, until midnight
    return { from: from, until: ends.length ? Math.max.apply(null, ends) : kat(addDays(date, 1), 0) };
  }
  /* first, last, from, until and kq worked out from what is saved (never typed), so nothing can go stale.
     kq is what the kitchen's one query sorts on: the last moment the kitchen needs to see this record (0 never). */
  function derive(f) {
    var ats = (f.rounds || []).map(function (r) { return r.at; }), w;
    f.first = ats.length ? ats[0] : (f.start || 0);
    f.last = ats.length ? ats[ats.length - 1] : f.first;
    if (isYmd(f.date) && (f.start || f.st)) { w = windowOf(f.date, f.start, f.first, f.last); f.from = w.from; f.until = w.until; }
    else { f.from = 0; f.until = 0; }
    var moved = f.was && f.was.until ? f.was.until : 0;
    if (f.status === 'confirmed') f.kq = Math.max(f.until, moved);
    else if (f.status === 'cancelled' && f.confAt) f.kq = Math.max(f.until, moved);   // the kitchen sees it was cancelled
    else f.kq = 0;
    return f;
  }
  function counts(line, n) { return fromU(line.u, n); }
  function short(name) { return String(name || '').replace(/\s+platters?$/i, '').trim() || String(name || ''); }
  function unitOf(line, q) { var u = line.unit || 'platter'; return q === 1 ? u : u + 's'; }
  // guests are for the kitchen to know; a manager may not know them yet (gu)
  function guestsText(f) { return f.gu ? 'guests not known yet' : (f.guests || 0) + ' guests'; }
  function totalQty(f) { return sum((f.lines || []).map(function (l) { return +l.qty || 0; })); }

  /* What stops a function being confirmed, in plain words. f is the saved shape (lines with u, rounds with at).
     Each problem: { k: the field, t: the words }. A draft may have any of these. */
  function problems(f) {
    var out = [], n = (f.rounds || []).length, L = f.lines || [];
    function add(k, t) { out.push({ k: k, t: t }); }
    if (!String(f.name || '').trim()) add('name', 'Give the function a name, like "Smith birthday".');
    if (!isYmd(f.date)) add('date', 'Pick the date.');
    if (!f.start && !f.st) add('start', 'Set the event start time, or tick TBC.');
    if (f.mode === 'stag' && !(f.rounds || []).length || (f.mode === 'stag' && !f.rounds[0].at)) add('rounds', 'Staggered needs a time for the first round. Use All at once until the times are known.');
    if (!f.gu && !(f.guests >= 1 && Math.floor(f.guests) === f.guests)) add('guests', 'Guests: a whole number, 1 or more, or tick Not known yet.');
    if (!L.length) add('lines', 'Add at least one platter.');
    if (L.length > MAX_LINES) add('lines', 'At most ' + MAX_LINES + ' kinds of platter on one function.');
    L.forEach(function (l, i) {
      if (!(l.qty >= 1 && Math.floor(l.qty) === l.qty && l.qty <= MAX_QTY)) add('qty' + i, short(l.name) + ': book 1 to ' + MAX_QTY + ', whole ' + unitOf(l, 2) + '.');
    });
    if (!n) add('rounds', 'Set when the platters go out.');
    if (n > MAX_ROUNDS) add('rounds', 'At most ' + MAX_ROUNDS + ' rounds.');
    if (f.mode === 'all' && n > 1) add('rounds', 'All at once is one round.');
    if (f.mode === 'stag' && n < 2) add('rounds', 'Staggered needs 2 rounds or more. Or pick All at once.');
    (f.rounds || []).forEach(function (r, i) { if (i && !(r.at > f.rounds[i - 1].at)) add('round' + i, 'Round ' + (i + 1) + ' must be after round ' + i + '.'); });
    if (n) {
      L.forEach(function (l, i) {
        if (!(l.qty >= 1)) return;
        var a = counts(l, n), placed = (l.u || []).length, bad = (l.u || []).some(function (r) { return !(r >= 0 && r < n && Math.floor(r) === r); });
        if (bad) add('alloc' + i, short(l.name) + ': a platter is in a round that does not exist.');
        else if (placed < l.qty) add('alloc' + i, short(l.name) + ': ' + placed + ' of ' + l.qty + ' placed. Place ' + (l.qty - placed) + ' more.');
        else if (placed > l.qty) add('alloc' + i, short(l.name) + ': ' + placed + ' placed but ' + l.qty + ' booked. Take ' + (placed - l.qty) + ' off.');
        void a;
      });
      var empty = [];
      for (var r = 0; r < n; r++) if (!L.some(function (l) { return counts(l, n)[r] > 0; })) empty.push(r);
      if (L.length && n > 1) empty.forEach(function (r) { add('round' + r, 'Round ' + (r + 1) + ' (' + when(f.rounds[r].at, f.date) + ') has no platters. Remove it or move some in.'); });
      var tot = totalQty(f);
      if (L.length && tot >= 1 && n > tot) add('rounds', n + ' rounds for ' + tot + ' ' + (tot === 1 ? 'platter' : 'platters') + ' leaves rounds empty. Use ' + tot + ' rounds or fewer, or All at once.');
    }
    return out;
  }

  /* What changed between two versions, for the kitchen's "Changed" list and the history. Only what matters to the kitchen. */
  function changes(a, b) {
    var out = [];
    if (!a) return ['New function'];
    if (a.status !== b.status) out.push(b.status === 'confirmed' ? (a.status === 'cancelled' ? 'Back on' : 'Confirmed') : b.status === 'cancelled' ? 'Cancelled' : 'Back to draft');
    if (a.name !== b.name) out.push('Name now ' + b.name);
    if (a.date !== b.date) out.push('Moved to ' + dayName(b.date));
    if (a.start !== b.start) out.push('Event start ' + when(a.start, a.date) + ' to ' + when(b.start, b.date));
    if (a.loc !== b.loc) out.push('Place now ' + (b.loc || 'not set'));
    if (a.guests !== b.guests || !a.gu !== !b.gu) out.push('Guests ' + (a.gu ? 'not known' : a.guests) + ' to ' + (b.gu ? 'not known' : b.guests));
    var al = {}, bl = {};
    (a.lines || []).forEach(function (l) { al[l.rid] = l; });
    (b.lines || []).forEach(function (l) { bl[l.rid] = l; });
    Object.keys(bl).forEach(function (k) { if (!al[k]) out.push(short(bl[k].name) + ' added: ' + bl[k].qty); else if (al[k].qty !== bl[k].qty) out.push(short(bl[k].name) + ' ' + al[k].qty + ' to ' + bl[k].qty); });
    Object.keys(al).forEach(function (k) { if (!bl[k]) out.push(short(al[k].name) + ' taken off'); });
    var ra = JSON.stringify((a.rounds || []).map(function (r) { return r.at; })), rb = JSON.stringify((b.rounds || []).map(function (r) { return r.at; }));
    var ua = JSON.stringify((a.lines || []).map(function (l) { return [l.rid, l.u]; })), ub = JSON.stringify((b.lines || []).map(function (l) { return [l.rid, l.u]; }));
    if (a.mode !== b.mode) out.push(b.mode === 'all' ? 'Now all at once' : 'Now staggered');
    else if (ra !== rb) out.push('Service times changed');
    else if (ua !== ub) out.push('Rounds changed');
    if (JSON.stringify((a.rounds || []).map(function (r) { return r.note || ''; })) !== JSON.stringify((b.rounds || []).map(function (r) { return r.note || ''; }))) out.push('Round notes changed');
    if ((a.notes || '') !== (b.notes || '')) out.push('Service and dietary notes changed');
    if ((a.kc || '') !== (b.kc || '')) out.push(b.kc ? 'Kitchen comment changed' : 'Kitchen comment taken off');
    return out;
  }

  /* Platter totals per day for the prep: confirmed functions only, each booked line counted once (its qty, never the
     rounds as well), by the function's date. Returns { 'YYYY-MM-DD': [{ rid, name, unit, qty }] }. */
  function dayTotals(list) {
    var out = {};
    list.forEach(function (f) {
      if (f.status !== 'confirmed' || !isYmd(f.date)) return;
      var d = out[f.date] = out[f.date] || {};
      (f.lines || []).forEach(function (l) { var t = d[l.rid] = d[l.rid] || { rid: l.rid, name: l.name, unit: l.unit || 'platter', qty: 0 }; t.qty += +l.qty || 0; });
    });
    Object.keys(out).forEach(function (k) { out[k] = Object.keys(out[k]).map(function (r) { return out[k][r]; }).sort(function (a, b) { return a.name.localeCompare(b.name); }); });
    return out;
  }
  /* Functions whose service times overlap (first round to last round, with half an hour each side). Only for information. */
  function overlaps(list) {
    var c = list.filter(function (f) { return f.status === 'confirmed' && f.first; }), out = {};
    c.forEach(function (a) {
      c.forEach(function (b) {
        if (a.id === b.id) return;
        if (a.first - 30 * MIN < b.last + 30 * MIN && b.first - 30 * MIN < a.last + 30 * MIN) (out[a.id] = out[a.id] || []).push(b.id);
      });
    });
    return out;
  }
  /* What the band shows at a moment: confirmed functions in their window, and notices for a function cancelled or
     moved while its old window is still on (so the change is not missed). Sorted by when food is next due. */
  // isSent(f, i), when given, says round i of f was ticked as sent: the order then follows what is still to go out
  function showing(list, now, isSent) {
    var out = [];
    list.forEach(function (f) {
      if (f.status === 'confirmed' && f.from <= now && now < f.until) out.push({ f: f, kind: 'on' });
      else if (f.status === 'cancelled' && f.confAt && f.from <= now && now < f.until) out.push({ f: f, kind: 'cancelled' });
      if (f.status === 'confirmed' && f.was && f.was.until && f.was.from <= now && now < f.was.until && !(f.from <= now && now < f.until)) out.push({ f: f, kind: 'moved' });
    });
    function key(x) {
      if (x.kind === 'moved') return x.f.was.first || 0;
      if (x.kind !== 'on') return x.f.first;
      if (!x.f.first) return 9e15;   // times TBC: after the ones with times
      if (isSent) { var k = nextOpen(x.f, function (i) { return isSent(x.f, i); }); return k >= 0 ? x.f.rounds[k].at : 9e15 - 1; }   // all sent: last
      var n = nextRound(x.f, now); return n >= 0 ? x.f.rounds[n].at : x.f.last;
    }
    return out.sort(function (a, b) { return key(a) - key(b) || String(a.f.name).localeCompare(String(b.f.name)); });
  }
  /* The service view (22 Oct 2026): for every function on now, its next round not sent (rows: late ones first, then by
     time); the platters of the rounds due within 15 minutes or late, added together across functions (plate: what the
     pass plates now); and the rounds after those that are due within the hour (ahead). */
  var DUE_SOON = 15 * MIN;
  function service(list, now, isSent) {
    var rows = [], ahead = [], plate = {};
    showing(list, now, isSent).forEach(function (x) {
      var f = x.f;
      if (x.kind !== 'on' || !f.first) return;
      var n = f.rounds.length, k = nextOpen(f, function (i) { return isSent(f, i); });
      if (k < 0) return;
      function at(j) { return (f.lines || []).map(function (l) { return counts(l, n)[j]; }); }
      var r = { f: f, k: k, at: f.rounds[k].at, a: at(k) };
      r.late = r.at < now; r.due = r.at <= now + DUE_SOON;
      rows.push(r);
      if (r.due) (f.lines || []).forEach(function (l, i) { if (r.a[i]) { var p = plate[l.rid] = plate[l.rid] || { rid: l.rid, name: l.name, qty: 0 }; p.qty += r.a[i]; } });
      for (var j = k + 1; j < n; j++) if (f.rounds[j].at <= now + HOUR) ahead.push({ f: f, k: j, at: f.rounds[j].at, a: at(j) });
    });
    rows.sort(function (a, b) { return a.at - b.at; });
    ahead.sort(function (a, b) { return a.at - b.at; });
    return { rows: rows, ahead: ahead, plate: Object.keys(plate).map(function (k) { return plate[k]; }).sort(function (a, b) { return b.qty - a.qty || a.name.localeCompare(b.name); }) };
  }
  // the first round still to come (its time not passed yet), or -1 when every round's time has passed
  function nextRound(f, now) { var R = f.rounds || [], i; for (i = 0; i < R.length; i++) if (R[i].at >= now) return i; return -1; }
  /* Ordering (22 Oct 2026): a function's stock is ordered on the Sunday before it, at least 4 days ahead so the stock
     can arrive: the latest Sunday that is 4 days or more before the function. Booked later than that, it is ordered today. */
  function orderDay(date) { var d = addDays(date, -4), dw = new Date(kat(d, 12 * 60) + ZONE).getUTCDay(); return addDays(d, -dw); }
  function orderOn(date, today) { var o = orderDay(date); return o < today ? today : o; }
  /* What the band shows besides today's functions: on its order day a reminder to order a function's stock, and the
     day before, a short line for each function tomorrow. Confirmed functions only, by the time food first goes out. */
  function soon(list, now) {
    var today = kday(now), tom = addDays(today, 1), out = [];
    list.forEach(function (f) {
      if (f.status !== 'confirmed' || !isYmd(f.date)) return;
      if (f.od === today && f.date > today) out.push({ f: f, kind: 'order', short: orderDay(f.date) < today });
      if (f.date === tom) out.push({ f: f, kind: 'tomorrow' });
    });
    return out.sort(function (a, b) { return (a.kind === b.kind ? 0 : a.kind === 'order' ? -1 : 1) || (a.f.date < b.f.date ? -1 : a.f.date > b.f.date ? 1 : (a.f.first || 0) - (b.f.first || 0)); });
  }
  // the first round not ticked as sent (22 Oct 2026), or -1 when every round is ticked. isSent(i) says whether round i is.
  function nextOpen(f, isSent) { var R = f.rounds || [], i; for (i = 0; i < R.length; i++) if (!isSent(i)) return i; return -1; }
  // a short text fingerprint of a platter recipe, so a later change in the book can be flagged on a booked line
  function fingerprint(r) {
    var s = JSON.stringify([r.name, r.yield || '', (r.ingredients || []).map(function (i) { return [i.q, i.name]; })]), h = 5381, i;
    for (i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  var M = {
    MIN: MIN, HOUR: HOUR, DAY: DAY, MAX_LINES: MAX_LINES, MAX_ROUNDS: MAX_ROUNDS, MAX_QTY: MAX_QTY, MAX_PER: MAX_PER,
    kday: kday, kat: kat, kclock: kclock, dayStart: dayStart, addDays: addDays, isYmd: isYmd, hmMin: hmMin, dayName: dayName, when: when,
    even: even, toU: toU, fromU: fromU, sum: sum, roundTimes: roundTimes, windowOf: windowOf, derive: derive, counts: counts,
    short: short, unitOf: unitOf, totalQty: totalQty, guestsText: guestsText, problems: problems, changes: changes, dayTotals: dayTotals,
    overlaps: overlaps, showing: showing, service: service, soon: soon, orderDay: orderDay, orderOn: orderOn, nextRound: nextRound, nextOpen: nextOpen, fingerprint: fingerprint
  };
  if (typeof module === 'object' && module.exports) { module.exports = M; return; }

  /* ---------- the kitchen's side: the band, the sheet, #/fn, the landing card ---------- */
  var T = window.LK_TIME, D = window.LK_DATA || { recipes: [], menuOrder: [] };
  function P() { return window.LK_PREP; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function now() { return T.now(); }

  // the platters on offer: the guest menu's Functions section (laid over by the head chef's book), then any recipe marked
  // for Functions. Never a separate list: a platter is a recipe in the book.
  function catalogue() {
    var ids = [], byId = {};
    D.recipes.forEach(function (r) { byId[r.id] = r; });
    (D.menuOrder || []).forEach(function (s) { if (/^functions?$/i.test(String(s.title).trim())) s.ids.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); }); });
    D.recipes.forEach(function (r) { if (/^functions?$/i.test(String(r.forLine || '').trim()) && ids.indexOf(r.id) < 0) ids.push(r.id); });
    return ids.filter(function (id) { return byId[id]; }).map(function (id) {
      var r = byId[id], m = /^per ([a-z]+)/i.exec(String(r.yield || ''));
      return { rid: id, name: r.name, unit: m ? m[1].toLowerCase() : 'platter', spec: String(r.yield || '').slice(0, 200), fp: fingerprint(r) };
    });
  }
  function recipeOf(rid) { return D.recipes.filter(function (r) { return r.id === rid; })[0] || null; }

  /* state: the functions the kitchen may need (live), and how fresh they are */
  var F = { list: [], state: 'idle', at: 0, err: '', key: '', unsub: null, more: false, offline: false };
  (function () { try { var c = JSON.parse(lsGet('lk.fn') || 'null'); if (c && c.list) { F.list = c.list.map(derive); F.at = c.at || 0; F.cached = true; } } catch (e) {} })();
  function nameOf(id) {
    if (!id) return 'Head chef (admin)';
    var api = P() && P().book && P().book();
    return (api && api.nameOf(id)) || 'Someone no longer on the list';
  }
  function watch() {
    var prep = P(); if (!prep || !prep.state) return;
    var st = prep.state;
    if (!/^\d{4,6}$/.test(st.pin || '') || st.configState !== 'ok') return;
    var key = st.pin + '|' + T.day();
    if (key === F.key && F.unsub) return;
    if (F.unsub) { F.unsub(); F.unsub = null; }
    F.key = key; if (!F.list.length || F.state === 'idle') F.state = 'loading';
    var api = prep.book();
    api.ready().then(function () {
      var fs = api.fs();
      watchSent(api, fs);
      F.unsub = fs.onSnapshot(fs.query(api.colRef('functions'), fs.where('kq', '>=', T.at(T.day(), 0)), fs.orderBy('kq'), fs.limit(150)), { includeMetadataChanges: true }, function (snap) {
        F.list = snap.docs.map(function (d) { return derive(Object.assign({ id: d.id }, d.data())); });
        F.offline = !!(snap.metadata && snap.metadata.fromCache);
        if (!F.offline) { F.at = now(); F.cached = false; F.state = 'ok'; lsSet('lk.fn', JSON.stringify({ at: F.at, list: F.list })); }
        else if (F.state !== 'ok') F.state = navigator.onLine === false ? 'offline' : 'loading';
        changed();
      }, function (e) { F.state = 'error'; F.err = e && e.code || ''; F.unsub = null; F.key = ''; changed(); });
    }, function () { F.state = 'error'; changed(); });
  }
  function stop() { if (F.unsub) F.unsub(); if (F.unsub2) F.unsub2(); F.unsub = F.unsub2 = null; F.key = ''; }
  /* Rounds ticked as sent (fnsent/<function>_<round time>): one more small listener, on yesterday and later, so an
     overnight round is still there after midnight. A round whose time was changed after it was ticked shows as not sent. */
  F.sent = {};
  function watchSent(api, fs) {
    if (F.unsub2) F.unsub2();
    F.unsub2 = fs.onSnapshot(fs.query(api.colRef('fnsent'), fs.where('day', '>=', kday(now() - DAY))), function (snap) {
      var m = {}; snap.docs.forEach(function (d) { m[d.id] = d.data(); }); F.sent = m; changed();
    }, function () { F.unsub2 = null; });
  }
  function sentRec(f, i) { var r = (f.rounds || [])[i], x = r && r.at ? F.sent[f.id + '_' + r.at] : null; return x && x.sent ? x : null; }
  function sentText(x) { return 'sent ' + kclock(x.sentAt) + ', ' + nameOf(x.sentBy); }
  // tell the pages: the band and the landing card redraw themselves, #/fn redraws through js/app.js
  function changed() { paint(); try { window.dispatchEvent(new Event('lk-fn')); } catch (e) {} }

  /* ---------- the band under the top bar ---------- */
  // amounts read "2 × Pizza" in every function view (22 Oct 2026); the prep and order lines keep their own words
  function qx(q, name) { return q + ' \u00d7 ' + name; }
  function linesText(f, a) {
    return (f.lines || []).map(function (l, i) { return { l: l, q: a ? a[i] : l.qty }; }).filter(function (x) { return x.q > 0; })
      .map(function (x) { return qx(x.q, short(x.l.name)); }).join(', ');
  }
  function roundCounts(f, r) { var n = (f.rounds || []).length; return (f.lines || []).map(function (l) { return counts(l, n)[r]; }); }
  function recent(f) { var c = (f.chg || [])[0]; return c && f.status === 'confirmed' && now() - c.at < 3 * HOUR ? c : null; }
  function bandRow(x) {
    var f = x.f, t = now(), tot = totalQty(f), out = '<li class="fn-li"><button type="button" class="fn-row' + (x.kind !== 'on' ? ' is-' + x.kind : '') + '" data-fn="open" data-id="' + esc(f.id) + '" aria-haspopup="dialog">';
    if (x.kind === 'cancelled') {
      return out + '<span class="fn-r1"><span class="fn-tag fn-t-off">Cancelled</span><b><s>' + esc(f.name) + '</s></b>' + (f.loc ? ' · ' + esc(f.loc) : '') + '</span>' +
        '<span class="fn-r2">Was ' + esc(when(f.first, kday(t))) + ', ' + tot + ' ' + (tot === 1 ? 'platter' : 'platters') + '. Do not send.</span></button></li>';
    }
    if (x.kind === 'moved') {
      return out + '<span class="fn-r1"><span class="fn-tag fn-t-moved">Rescheduled</span><b>' + esc(f.name) + '</b></span>' +
        '<span class="fn-r2">Not today any more: now ' + esc(dayName(f.date)) + ', event ' + esc(kclock(f.start)) + ', food ' + esc(when(f.first, f.date)) + '.</span></button></li>';
    }
    // two lines (22 Oct 2026): the time of the next round not sent, the name and place; then what goes in it
    var c = recent(f), w = nowOf(f, t);
    return out + '<span class="fn-r1"><span class="fn-due' + (w.late ? ' is-late' : '') + '">' + esc(w.time) + '</span> <b>' + esc(f.name) + '</b>' + (f.loc ? ' · ' + esc(f.loc) : '') +
      (f.kc ? ' <span class="fn-tag fn-t-kc">Kitchen comment</span>' : '') + (c ? ' <span class="fn-tag fn-t-new">Changed ' + esc(kclock(c.at)) + '</span>' : '') + '</span>' +
      '<span class="fn-r2">' + w.html + '</span></button></li>';
  }
  function isSentK(f, i) { return !!sentRec(f, i); }
  /* What goes out next for a function, for the band, the strip and the service view: the first round not ticked as
     sent (late once its time has passed: the clock alone never marks anything sent). time: its time, or TBC, or Sent. */
  function nowOf(f, t) {
    var n = (f.rounds || []).length, tot = totalQty(f);
    if (!f.first) return { time: 'TBC', late: false, html: 'Times TBC: <b>' + esc(linesText(f)) + '</b> <span class="fn-of">(' + tot + ')</span>' };
    var k = nextOpen(f, function (i) { return isSentK(f, i); });
    if (k < 0) { var x = sentRec(f, n - 1); return { time: 'Sent', late: false, done: true, html: (n > 1 ? 'All ' + n + ' rounds sent, last ' : 'All sent ') + esc(kclock(x.sentAt) + ', ' + nameOf(x.sentBy)) + ' <span class="fn-of">(' + tot + ')</span>' }; }
    var at = f.rounds[k].at, late = at < t, rc = roundCounts(f, k), q = sum(rc), lead = n > 1 ? 'Round ' + (k + 1) + ' of ' + n : 'All';
    return { time: when(at, kday(t)), late: late, k: k, html: (late ? '<span class="fn-late">' + lead + ' not sent yet</span>' : lead) + ': <b>' + esc(linesText(f, rc) || 'nothing') + '</b> <span class="fn-of">(' + q + (n > 1 ? ' of ' + tot : '') + ')</span>' };
  }
  // the order reminder and tomorrow's functions: one short line each
  function soonRow(x) {
    var f = x.f, tot = totalQty(f), out = '<li class="fn-li"><button type="button" class="fn-row is-soon" data-fn="open" data-id="' + esc(f.id) + '" aria-haspopup="dialog"><span class="fn-r2">';
    if (x.kind === 'order') return out + '<span class="fn-tag fn-t-order">Order today</span>' + (x.short ? ' <span class="fn-tag fn-t-off">Short notice</span>' : '') + ' Stock for <b>' + esc(f.name) + '</b>, ' + esc(dayName(f.date)) + ': ' + esc(linesText(f)) + ' (' + tot + '). It is on the order list.</span></button></li>';
    return out + '<span class="fn-tag fn-t-tom">Tomorrow</span> <b>' + esc(f.name) + '</b> · event ' + esc(when(f.start, f.date)) + ' · food ' + esc(when(f.first, f.date)) + ' · ' + esc(linesText(f)) + ' (' + tot + ')</span></button></li>';
  }
  function bandHTML() {
    if (location.hash === '#/fn/now') return '';   // the service view shows the same rounds in full: no band above it
    var t = now(), xs = showing(F.list, t, isSentK), stale = '';
    if (F.state === 'error' && F.at) stale = 'Could not load functions. Showing the copy from ' + when(F.at, kday(t)) + '.';
    else if (F.state === 'error') stale = !xs.length && /^\d{4,6}$/.test((P() && P().state && P().state.pin) || '') ? 'Could not load functions. Check the signal.' : '';
    else if ((F.offline || navigator.onLine === false) && F.at && xs.length) stale = 'No signal. Functions last updated ' + when(F.at, kday(t)) + '.';
    var ys = soon(F.list, t);
    if (!xs.length && !ys.length && !stale) return '';
    // today's functions first (two, then "+1 more"), then up to two order reminders and tomorrow's functions
    var a = F.more ? xs : xs.slice(0, 2), b = F.more ? ys : ys.slice(0, 2), left = xs.length + ys.length - a.length - b.length;
    var more = left > 0 ? '<button type="button" class="fn-more" data-fn="more" aria-expanded="false">+' + left + ' more</button>' : F.more && (xs.length > 2 || ys.length > 2) ? '<button type="button" class="fn-more" data-fn="more" aria-expanded="true">Show fewer</button>' : '';
    // two or more functions on at once: one view of everything that goes out now
    var svc = xs.filter(function (x) { return x.kind === 'on'; }).length >= 2 ? '<a class="fn-more fn-svc" href="#/fn/now">Service view</a>' : '';
    // a label says what the band holds: today's functions, the coming ones (order and tomorrow lines), or both
    var on = xs.filter(function (x) { return x.kind === 'on'; }).length;
    var lab = xs.length && ys.length ? 'Functions today and soon' : xs.length ? 'Functions today' : ys.length ? 'Functions coming up' : 'Functions';
    // the round minus (Hide) folds the band to its label and one line; plus (Show) opens it, for the rest of the kitchen day on this phone (lk.fn.fold: the
    // kitchen day it was folded; out of date the next day, so the band opens again by itself)
    var fold = (a.length + b.length) && lsGet('lk.fn.fold') === kday(t), btn = a.length + b.length ? '<button type="button" class="fn-fold" data-fn="fold" aria-expanded="' + !fold + '" aria-label="' + (fold ? 'Show functions' : 'Hide functions') + '" title="' + (fold ? 'Show' : 'Hide') + '">' + (fold ? '+' : '\u2212') + '</button>' : '';
    if (fold) {
      // every function in a row, as many as fit across the screen (fitFold() hides the rest and counts them in "+N")
      var sum = xs.concat(ys).map(function (x) {
        var w = x.kind === 'on' ? nowOf(x.f, t) : null;
        return '<span class="fn-sum-i">' + (w ? '<b class="fn-due' + (w.late ? ' is-late' : '') + '">' + esc(w.time) + '</b> ' : x.kind === 'cancelled' ? '<span class="fn-late">Cancelled</span> ' :
          x.kind === 'moved' ? '<span class="fn-tag fn-t-moved">Rescheduled</span> ' : x.kind === 'order' ? '<span class="fn-tag fn-t-order">Order</span> ' : x.kind === 'tomorrow' ? '<span class="fn-tag fn-t-tom">Tomorrow</span> ' : '') + esc(x.f.name) + '</span>';
      }).join('');
      return '<div class="fn-band-top is-fold"><h2 class="fn-band-h">Functions</h2><span class="fn-band-sum">' + sum + '</span><span class="fn-tag fn-sum-more" hidden></span>' + btn + '</div>' + (stale ? '<p class="fn-stale" role="status">' + esc(stale) + '</p>' : '');
    }
    return '<div class="fn-band-top"><h2 class="fn-band-h">' + lab + '</h2>' + (on ? '<span class="fn-band-n">' + on + ' on today</span>' : '') + btn + '</div>' + (a.length + b.length ? '<ul class="fn-list">' + a.map(bandRow).join('') + b.map(soonRow).join('') + '</ul>' : '') +
      (more || svc ? '<div class="fn-more-row">' + svc + more + '</div>' : '') +
      (stale ? '<p class="fn-stale" role="status">' + esc(stale) + '</p>' : '');
  }
  // js/app.js draws the empty slot under the top bar; this fills it, and refills it when anything changes
  var lastBand = null;
  function paint() {
    var el = document.getElementById('fn-band');
    if (el) { var h = bandHTML(); if (h !== lastBand || el.innerHTML !== h) { el.innerHTML = h; lastBand = h; } el.hidden = !h; fitFold(); }
    strip();
    var lc = document.getElementById('fn-land');
    if (lc) { var lh = landHTML(); if (lc.innerHTML !== lh) lc.innerHTML = lh; lc.hidden = !lh; }
    var ck = document.getElementById('fn-check');
    if (ck) { var ch = checkHTML(); if (ck.innerHTML !== ch) ck.innerHTML = ch; ck.hidden = !ch; }
    if (sheetId) { var f = byId(sheetId); var body = sheetEl && sheetEl.querySelector('.fn-sheet-body'); if (body && f) body.innerHTML = sheetHTML(f, true); }
  }
  /* The strip (22 Oct 2026): once the band has scrolled off the top, one line stays pinned to the top of the screen
     with today's next function and what goes out next; a tap opens its sheet. It is appended to document.body (a page
     redraw does not remove it). Bars that already stick to the top (search, signal, update, admin nav) move down by its
     height through --fn-stick. */
  var stripEl = null, stripH = 0;
  function strip() {
    var band = document.getElementById('fn-band'), t = now(), xs = showing(F.list, t, isSentK).filter(function (x) { return x.kind !== 'moved'; });
    var off = !!band && !band.hidden && xs.length && band.getBoundingClientRect().bottom < 0 && !sheetEl;
    if (!off) { if (stripEl) { stripEl.hidden = true; } setStick(0); return; }
    if (!stripEl) { stripEl = document.createElement('div'); stripEl.className = 'fn-strip'; stripEl.setAttribute('role', 'region'); stripEl.setAttribute('aria-label', 'Functions'); document.body.appendChild(stripEl); }
    // the most urgent first: its time, what goes out, then the name; "+2" sits apart so it is never cut off. With two or
    // more functions on, a tap opens the service view; with one, its sheet.
    var x = xs[0], f = x.f, w = x.kind === 'cancelled' ? null : nowOf(f, t), many = xs.filter(function (y) { return y.kind === 'on'; }).length >= 2;
    var inner = '<span class="fn-strip-t">' + (w ? '<b class="fn-due' + (w.late ? ' is-late' : '') + '">' + esc(w.time) + '</b> ' + w.html.replace(/<span class="fn-of">[\s\S]*?<\/span>/, '') : '<span class="fn-late">Cancelled, do not send</span>') + ' · ' + esc(f.name) + '</span>' +
      (xs.length > 1 ? '<span class="fn-tag fn-strip-n">+' + (xs.length - 1) + '</span>' : '');
    var h = many ? '<a class="fn-strip-b" href="#/fn/now">' + inner + '</a>' : '<button type="button" class="fn-strip-b" data-fn="open" data-id="' + esc(f.id) + '" aria-haspopup="dialog">' + inner + '</button>';
    if (stripEl.innerHTML !== h) stripEl.innerHTML = h;
    stripEl.hidden = false;
    setStick(stripEl.offsetHeight);
  }
  function setStick(px) { if (px === stripH) return; stripH = px; document.documentElement.style.setProperty('--fn-stick', px + 'px'); }
  window.addEventListener('scroll', strip, { passive: true });
  window.addEventListener('resize', strip);
  window.addEventListener('resize', fitFold);
  // the folded band: show every function that fits on the line, the rest as "+N" (the first always shows)
  function fitFold() {
    var box = document.querySelector('#fn-band .fn-band-sum'), more = document.querySelector('#fn-band .fn-sum-more');
    if (!box || !more) return;
    var it = box.querySelectorAll('.fn-sum-i'), n = it.length, i;
    for (i = 0; i < n; i++) it[i].hidden = false;
    more.hidden = true;
    while (n > 1 && box.scrollWidth > box.clientWidth + 1) { it[--n].hidden = true; more.hidden = false; more.textContent = '+' + (it.length - n); }
    box.classList.toggle('is-one', n === 1);
  }
  window.addEventListener('hashchange', function () { setTimeout(strip, 0); });
  function byId(id) { return F.list.filter(function (f) { return f.id === id; })[0] || null; }

  /* ---------- the function sheet: the popup from the band and the page #/fn/<id> ---------- */
  /* Every round as a list (22 Oct 2026): one row per round naming only what goes out ("2 Pizza, 1 Vege (3)"), with its
     Sent tick. It fits any number of platters on any screen with no sideways scroll; the grid is only in the managers' form. */
  function roundsList(f) {
    var n = (f.rounds || []).length, L = f.lines || [], tick = f.status === 'confirmed' && !!f.first;
    if (!n || !L.length) return '';
    var nx = nextOpen(f, function (i) { return tick && !!sentRec(f, i); });
    return '<ol class="fn-rounds">' + f.rounds.map(function (r, i) {
      var rc = roundCounts(f, i), q = sum(rc), next = i === nx && f.status === 'confirmed';
      return '<li class="fn-round' + (next ? ' is-next' : '') + (tick && sentRec(f, i) ? ' is-sent' : '') + '"><span class="fn-round-t">' + esc(when(r.at, f.date)) + (next ? ' <span class="fn-tag">Next</span>' : '') + '</span>' +
        '<span class="fn-round-w">' + (r.note ? '<i>' + esc(r.note) + '</i> ' : '') + esc(linesText(f, rc) || 'Nothing') + ' <b>(' + q + ')</b></span>' +
        (tick ? '<span class="fn-sent">' + sentCell(f, i) + '</span>' : '') + '</li>';
    }).join('') + '</ol>';
  }
  // a round's Sent cell: a button to tick it, or who ticked it when, with Undo for a mis-tap (the same person within
  // 2 minutes, or a sous chef or the head chef: the rules say the same)
  function sentCell(f, i) {
    var x = sentRec(f, i), d = ' data-id="' + esc(f.id) + '" data-r="' + i + '"';
    if (!x) return '<button type="button" class="btn fn-sent-b" data-fn="sent"' + d + ' aria-label="Round ' + (i + 1) + ' sent">Sent</button>';
    var prep = P(), me = prep && prep.book ? prep.book().who() : '', lead = !!(prep && prep.chefMenu && prep.chefMenu().chef);
    var undo = lead || (me && x.sentBy === me && now() - x.sentAt < 2 * MIN);
    return '<span class="fn-sent-ok">' + esc(kclock(x.sentAt)) + '<small>' + esc(nameOf(x.sentBy)) + '</small></span>' + (undo ? '<button type="button" class="linkish" data-fn="unsent"' + d + '>Undo</button>' : '');
  }
  function tickSent(id, i, on) {
    var f = byId(id), prep = P(); if (!f || !prep) return;
    var r = f.rounds[i], api = prep.book(), me = api.who();
    if (!me && !(prep.state && prep.state.user)) { sheetClose(); prep.signIn(location.hash || '#/'); return; }   // who is ticking: sign in first
    var x = F.sent[f.id + '_' + r.at], rec = on ? { fid: f.id, at: r.at, day: kday(r.at), sent: true, sentAt: now(), sentBy: me } : { fid: f.id, at: r.at, day: kday(r.at), sent: false, sentAt: x.sentAt, sentBy: x.sentBy };
    F.sent[f.id + '_' + r.at] = rec; changed();   // shows at once; the listener brings the saved copy
    api.ready().then(function () { return api.W([['set', api.docRef('fnsent', f.id + '_' + r.at), rec, true]]); }).then(function () {
      api.say((f.rounds.length > 1 ? 'Round ' + (i + 1) : 'The platters') + (on ? ' ticked as sent.' : ' not sent after all.'));
    }, function () { if (x) F.sent[f.id + '_' + r.at] = x; else delete F.sent[f.id + '_' + r.at]; changed(); api.say('Not saved. Only the person who ticked it, within 2 minutes, or a chef can take a tick back.'); });
  }
  /* The sheet leads with what goes out next (22 Oct 2026): the first round not ticked as sent, its time, each platter with
     a big number, and its Sent button. The kitchen does not need the guests here, only the platters and when. */
  function nextBox(label, head, sub, body) {
    return '<section class="fn-next" aria-label="' + esc(label) + '"><p class="fn-next-h"><span class="fn-next-l">' + esc(label) + '</span> <b>' + esc(head) + '</b></p>' +
      (sub ? '<p class="fn-next-s">' + sub + '</p>' : '') + body + '</section>';
  }
  // one platter with a big "3 ×", its name linked to the recipe card when the book has it
  function bigRow(q, name, rid) {
    var nm = esc(name), r = rid ? recipeOf(rid) : null;
    return '<li class="fn-next-row"><span class="fn-next-n">' + q + '<span class="fn-x">\u00d7</span></span><span class="fn-next-name">' +
      (r ? '<a href="#/r/' + encodeURIComponent(rid) + '">' + nm + '</a>' : nm) + '</span></li>';
  }
  function nextHTML(f) {
    var n = (f.rounds || []).length, L = f.lines || [], t = now(), tot = totalQty(f), tick = f.status === 'confirmed' && !!f.first;
    if (!n || !L.length || f.status === 'cancelled') return '';
    function rows(a) {
      return '<ul class="fn-next-list">' + L.map(function (l, i) { return { l: l, q: a ? a[i] : l.qty }; }).filter(function (x) { return x.q > 0; }).map(function (x) {
        return bigRow(x.q, x.l.name, x.l.rid);
      }).join('') + '</ul>';
    }
    if (!f.first) return nextBox('Next out', 'Times TBC', tot + ' ' + (tot === 1 ? 'platter' : 'platters'), rows());
    var k = nextOpen(f, function (i) { return tick && !!sentRec(f, i); });
    if (k < 0) { var last = sentRec(f, n - 1); return nextBox('Done', 'All sent', esc(n > 1 ? 'All ' + n + ' rounds, the last ' + sentText(last) : sentText(last)), '<div class="fn-next-sent">' + sentCell(f, n - 1) + '</div>'); }
    var r = f.rounds[k], late = tick && r.at < t, rc = roundCounts(f, k), q = sum(rc);
    var head = (f.mode === 'all' ? 'All at ' : '') + when(r.at, f.date) + (n > 1 ? ' · round ' + (k + 1) + ' of ' + n : '');
    var sub = (late ? '<span class="fn-late">Due ' + esc(when(r.at, f.date)) + ', not sent yet</span> · ' : '') + q + ' ' + (q === 1 ? 'platter' : 'platters') + (n > 1 ? ' of ' + tot : '') + (r.note ? ' · ' + esc(r.note) : '');
    return nextBox('Next out', head, sub, rows(rc) + (tick ? '<div class="fn-next-sent">' + sentCell(f, k) + '</div>' : ''));
  }
  /* The whole function, straight under Next out (22 Oct 2026): every platter booked, added up over all its rounds, each
     linked to its card. One round still to go out is the whole function already, so it says so in one line instead of
     listing the same platters twice. */
  function wholeHTML(f) {
    var L = f.lines || [], n = (f.rounds || []).length, tot = totalQty(f), tick = f.status === 'confirmed' && !!f.first;
    if (!L.length) return '';
    var pl = tot + ' ' + (tot === 1 ? 'platter' : 'platters');
    if (n <= 1 && f.status !== 'cancelled' && !(tick && sentRec(f, 0))) return '<p class="fn-whole fn-whole-one">One round: this is the whole function, <b>' + pl + '</b>.</p>';
    return '<section class="fn-whole" aria-label="Whole function"><h3 class="fn-whole-h">Whole function <b>' + pl + '</b></h3>' +
      (n > 1 ? '<p class="fn-whole-s">All ' + n + ' rounds added up.</p>' : '') + '<ul class="fn-whole-list">' + L.map(function (l) {
        var r = recipeOf(l.rid);
        return '<li><b>' + l.qty + '</b> \u00d7 ' + (r ? '<a href="#/r/' + encodeURIComponent(l.rid) + '">' + esc(l.name) + '</a>' : esc(l.name)) + '</li>';
      }).join('') + '</ul></section>';
  }
  function sheetHTML(f, inPop) {
    var t = now(), c = f.chg || [];
    var status = f.status === 'cancelled' ? '<p class="fn-banner is-off" role="note"><b>Cancelled.</b> Do not send these platters.' + (f.canAt ? ' Cancelled by ' + esc(nameOf(f.canBy)) + ', ' + esc(dayName(kday(f.canAt)) + ' ' + kclock(f.canAt)) + '.' : '') + '</p>' :
      f.was && f.was.until && f.was.from <= t && t < f.was.until && !(f.from <= t && t < f.until) ? '<p class="fn-banner is-moved" role="note"><b>Rescheduled.</b> Not on ' + esc(dayName(kday(f.was.start || f.was.first))) + ' any more: now ' + esc(dayName(f.date)) + '.</p>' :
      f.status === 'draft' ? '<p class="fn-banner" role="note"><b>Draft.</b> Not confirmed yet: the kitchen does not see it.</p>' : '';
    // one quiet line for the day, the place and the event start; then what goes out next, every round, the comment
    var sub = [dayName(f.date), f.loc, 'event ' + when(f.start, f.date)].filter(Boolean).join(' · ');
    var out = status + '<p class="fn-sub">' + esc(sub) + '</p>' + nextHTML(f) + wholeHTML(f) +
      ((f.rounds || []).length > 1 || f.status !== 'confirmed' ? '<h3 class="fn-h">Every round</h3>' + roundsList(f) +
        (f.status === 'confirmed' && f.first ? '<p class="hint fn-note">Tick each round as it goes out.</p>' : '') : '');
    if (f.kc) out += '<section class="fn-kc" aria-labelledby="fn-kc-' + esc(f.id) + '"><h3 class="fn-h" id="fn-kc-' + esc(f.id) + '">Kitchen comment</h3><p class="fn-text">' + esc(f.kc) + '</p>' +
      '<p class="fn-by">' + esc(nameOf(f.kcBy)) + ', ' + esc(dayName(kday(f.kcAt)) + ' ' + kclock(f.kcAt)) + '</p></section>';
    if (f.notes) out += '<h3 class="fn-h">Service and dietary notes</h3><p class="fn-text">' + esc(f.notes) + '</p>';
    if (c.length) out += '<h3 class="fn-h">Changes</h3><ul class="fn-chg">' + c.slice(0, 5).map(function (x) { return '<li><span>' + esc(dayName(kday(x.at)) + ' ' + kclock(x.at)) + ', ' + esc(nameOf(x.by)) + '</span> ' + esc(x.what) + '</li>'; }).join('') + '</ul>';
    out += '<p class="fn-by fn-last">Last changed by ' + esc(nameOf(f.by)) + ', ' + esc(dayName(kday(f.upd)) + ' ' + kclock(f.upd)) + '.</p>';
    var can = P() && P().fnOK && P().fnOK();
    if (inPop) out += '<div class="btn-row"><a class="btn dark" href="#/fn/' + encodeURIComponent(f.id) + '" data-fn="go">Open the full sheet</a>' + (can ? '<a class="btn" href="#/functions/' + encodeURIComponent(f.id) + '" data-fn="go">Change this function</a>' : '') + '</div>';
    else if (can) out += '<div class="btn-row"><a class="btn" href="#/functions/' + encodeURIComponent(f.id) + '">Change this function</a></div>';
    return out;
  }
  // the popup from the band, appended to document.body so a page redraw does not remove it; clicks use data-fn
  var sheetEl = null, sheetId = '', sheetBack = null;
  function sheetOpen(id, from) {
    var f = byId(id); if (!f) return;
    sheetClose(); sheetId = id; sheetBack = from || null;
    var el = document.createElement('div');
    el.className = 'fn-pop';
    el.innerHTML = '<div class="fn-pop-bg" data-fn="close"></div><section class="fn-sheet" role="dialog" aria-modal="true" aria-labelledby="fn-sh-h" tabindex="-1">' +
      '<div class="fn-grip" aria-hidden="true"></div><header class="fn-sheet-top"><div class="fn-sheet-t"><span class="fn-eb">Function</span><h2 id="fn-sh-h">' + esc(f.name) + '</h2></div><button type="button" class="fn-close" data-fn="close">Close</button></header><div class="fn-sheet-body">' + sheetHTML(f, true) + '</div></section>';
    document.body.appendChild(el); sheetEl = el;
    el.querySelector('.fn-sheet').focus({ preventScroll: true });
    strip();
  }
  function sheetClose(back) {
    if (!sheetEl) return;
    sheetEl.parentNode.removeChild(sheetEl); sheetEl = null; sheetId = '';
    if (back && sheetBack && document.body.contains(sheetBack)) sheetBack.focus({ preventScroll: true });
    sheetBack = null;
    strip();
  }

  /* ---------- #/fn: today, the next three days from tomorrow (or 14), and the platter totals per day ---------- */
  var pageDays = 3;
  function cardHTML(f) {
    var n = (f.rounds || []).length, tot = totalQty(f);
    return '<li class="fn-card' + (f.status === 'cancelled' ? ' is-off' : '') + '"><a href="#/fn/' + encodeURIComponent(f.id) + '"><span class="fn-c1"><b>' + esc(f.name) + '</b>' +
      (f.status === 'cancelled' ? ' <span class="fn-tag fn-t-off">Cancelled</span>' : f.mode === 'stag' ? ' <span class="fn-tag">Staggered, ' + n + ' rounds</span>' : '') + (f.kc ? ' <span class="fn-tag fn-t-kc">Kitchen comment</span>' : '') + '</span>' +
      '<span class="fn-c2">Event ' + esc(when(f.start, f.date)) + ' · food from ' + esc(when(f.first, f.date)) + (f.loc ? ' · ' + esc(f.loc) : '') + '</span>' +
      '<span class="fn-c3">' + esc(linesText(f)) + ' (' + tot + ')</span></a></li>';
  }
  function totalsHTML(rows) {
    if (!rows || !rows.length) return '';
    return '<div class="fn-dtot"><span class="label">To make for the day</span><ul>' + rows.map(function (r) { return '<li><b>' + r.qty + '</b> \u00d7 ' + esc(r.name) + '</li>'; }).join('') + '</ul></div>';
  }
  function stateNote() {
    var t = now();
    if (F.state === 'error') return '<p class="p-err" role="alert">Could not load functions.' + (F.at ? ' Showing the copy from ' + esc(dayName(kday(F.at)) + ' ' + kclock(F.at)) + '.' : ' Check the signal and open this page again.') + '</p>';
    if (F.state === 'loading' || F.state === 'idle') return F.at ? '<p class="hint" role="status">Checking for changes. Showing the copy from ' + esc(when(F.at, kday(t))) + '.</p>' : '';
    if (F.offline || navigator.onLine === false) return '<p class="hint" role="status">No signal. Last updated ' + esc(dayName(kday(F.at)) + ' ' + kclock(F.at)) + '.</p>';
    return '<p class="hint fn-fresh">Up to date, ' + esc(kclock(F.at)) + '. Changes show here by themselves.</p>';
  }
  /* #/fn/now, the service view (22 Oct 2026): everything that goes out now across all functions, late first, each with
     its Sent; what to plate for those, added together; and the rounds coming up in the next hour. It redraws itself as
     rounds are ticked and as time passes (no reads: the same list and ticks as the band). */
  function svcLine(f, a) {
    return (f.lines || []).map(function (l, i) { return { l: l, q: a[i] }; }).filter(function (x) { return x.q > 0; })
      .map(function (x) { return '<span class="fn-svc-q"><b>' + x.q + '</b> <span class="fn-x">\u00d7</span> ' + esc(short(x.l.name)) + '</span>'; }).join('');
  }
  function serviceHTML(t) {
    var sv = service(F.list, t, isSentK), q = sum(sv.plate.map(function (p) { return p.qty; }));
    var just = F.list.filter(function (f) { return f.status === 'confirmed'; }).map(function (f) {
      return (f.rounds || []).map(function (r, i) { var x = sentRec(f, i); return x && t - x.sentAt < 2 * MIN ? { f: f, i: i } : null; }).filter(Boolean);
    }).reduce(function (a, b) { return a.concat(b); }, []);
    var out = '<section class="set-block fn-page fn-svc-page"><h2 id="rtitle" tabindex="-1">Service</h2>' + (known() ? '' : '<p role="status">Loading functions...</p>');
    if (known() && !sv.rows.length) out += '<p class="hint">Nothing to send: no function has a round still to go out.</p>';
    if (sv.rows.length) out += '<h3 class="fn-h">Next out</h3><ul class="fn-svc-rows">' + sv.rows.map(function (r) {
      var n = r.f.rounds.length;
      return '<li class="fn-svc-row' + (r.late ? ' is-late' : r.due ? '' : ' is-later') + '"><p class="fn-svc-top"><b class="fn-due' + (r.late ? ' is-late' : '') + '">' + esc(when(r.at, kday(t))) + '</b>' +
        (r.late ? ' <span class="fn-late">Late</span>' : r.due ? '' : ' <span class="fn-tag">Later</span>') + ' <button type="button" class="linkish fn-svc-name" data-fn="open" data-id="' + esc(r.f.id) + '" aria-haspopup="dialog">' + esc(r.f.name) + '</button>' +
        (r.f.loc ? ' · ' + esc(r.f.loc) : '') + (n > 1 ? ' · round ' + (r.k + 1) + ' of ' + n : '') + '</p>' +
        '<p class="fn-svc-what">' + svcLine(r.f, r.a) + ' <span class="fn-of">(' + sum(r.a) + ')</span></p>' +
        (r.f.rounds[r.k].note ? '<p class="fn-svc-note">' + esc(r.f.rounds[r.k].note) + '</p>' : '') +
        '<div class="fn-next-sent">' + sentCell(r.f, r.k) + '</div></li>';
    }).join('') + '</ul>';
    if (just.length) out += '<p class="fn-svc-just">' + just.map(function (j) { var x = sentRec(j.f, j.i); return esc(j.f.name) + (j.f.rounds.length > 1 ? ' round ' + (j.i + 1) : '') + ' sent ' + esc(kclock(x.sentAt) + ', ' + nameOf(x.sentBy)) + ' ' + sentCell(j.f, j.i).replace(/^<span class="fn-sent-ok">[\s\S]*?<\/small><\/span>/, ''); }).join('<br>') + '</p>';
    if (sv.plate.length) out += '<section class="fn-next" aria-label="To plate now"><p class="fn-next-h"><span class="fn-next-l">To plate now</span> <b>' + q + ' ' + (q === 1 ? 'platter' : 'platters') + '</b></p>' +
      '<p class="fn-next-s">Late and due in the next 15 minutes, all functions together.</p><ul class="fn-next-list">' + sv.plate.map(function (p) {
        return bigRow(p.qty, p.name, p.rid);
      }).join('') + '</ul></section>';
    if (sv.ahead.length) out += '<h3 class="fn-h">Coming up in the next hour</h3><ol class="fn-rounds">' + sv.ahead.map(function (r) {
      return '<li class="fn-round"><span class="fn-round-t">' + esc(when(r.at, kday(t))) + '</span><span class="fn-round-w"><i>' + esc(r.f.name) + (r.f.rounds.length > 1 ? ', round ' + (r.k + 1) : '') + '</i>' + esc(linesText(r.f, r.a)) + ' <b>(' + sum(r.a) + ')</b></span><span></span></li>';
    }).join('') + '</ol>';
    return out + stateNote() + '<div class="btn-row"><a class="btn" href="#/fn">All functions</a></div></section>';
  }
  function known() { return F.state === 'ok' || F.state === 'offline' || !!F.at; }
  function pageHTML(id) {
    var t = now(), today = kday(t), prep = P();
    if (!prep || !/^\d{4,6}$/.test((prep.state && prep.state.pin) || '')) return '<section class="set-block"><h2 id="rtitle" tabindex="-1">Functions</h2><p>This device has no kitchen PIN yet. Open the Prep list and enter it first.</p><div class="btn-row"><a class="btn dark" href="#/prep">Open the Prep list</a></div></section>';
    if (id === 'now') return serviceHTML(t);
    if (id) {
      var f = byId(id);
      if (!f) return '<section class="set-block"><h2 id="rtitle" tabindex="-1">Function</h2>' + (known() ? '<p>This function is not on the kitchen\'s list: it may be a draft, over, or cancelled a while ago.</p>' : '<p role="status">Loading...</p>') + stateNote() + '<div class="btn-row"><a class="btn" href="#/fn">All functions</a></div></section>';
      return '<section class="set-block fn-page"><h2 id="rtitle" tabindex="-1">' + esc(f.name) + '</h2>' + sheetHTML(f, false) + stateNote() + '<div class="btn-row"><a class="btn" href="#/fn">All functions</a></div></section>';
    }
    var on = showing(F.list, t, isSentK), up = [], totals = dayTotals(F.list), days = [], i;
    for (i = 1; i <= pageDays; i++) days.push(addDays(today, i));
    var body = '';
    if (!known()) body = '<p role="status">Loading functions...</p>';
    else {
      body += '<h3 class="fn-h">Today, ' + esc(dayName(today)) + '</h3>' + (on.length ? '<div class="btn-row"><a class="btn dark" href="#/fn/now">Service view</a></div>' : '') + (on.length ? '<ul class="fn-cards">' + on.map(function (x) { return cardHTML(x.f); }).join('') + '</ul>' + totalsHTML(totals[today]) : '<p class="hint">No functions on now.</p>');
      body += '<h3 class="fn-h">Upcoming functions</h3>';
      days.forEach(function (d) {
        var fs = F.list.filter(function (f) { return f.date === d && (f.status === 'confirmed' || f.status === 'cancelled'); }).sort(function (a, b) { return a.first - b.first; });
        up.push(d);
        body += '<div class="fn-day"><h4>' + esc(dayName(d)) + '</h4>' + (fs.length ? '<ul class="fn-cards">' + fs.map(cardHTML).join('') + '</ul>' + totalsHTML(totals[d]) : '<p class="hint">None.</p>') + '</div>';
      });
      body += '<div class="btn-row">' + (pageDays < 14 ? '<button type="button" class="btn" data-fn="days" data-v="14">Show the next 14 days</button>' : '<button type="button" class="btn" data-fn="days" data-v="3">Show the next 3 days</button>') + '</div>';
    }
    var can = prep.fnOK && prep.fnOK();
    return '<section class="set-block fn-page"><h2 id="rtitle" tabindex="-1">Functions</h2><p class="hint">Confirmed functions and their platters.</p>' +
      stateNote() + body + (can ? '<div class="btn-row"><a class="btn dark" href="#/functions">Manage functions</a></div>' : '') + '</section>';
  }

  /* ---------- the landing card: the functions 2 and 3 days out ----------
     Today's and tomorrow's are in the band right above it, so the card does not list them again (23 Oct 2026). By day,
     then by when food first goes out, times TBC last in a day (as the band has them). Nothing to list: no card. */
  function landHTML() {
    var t = now(), today = kday(t), tom = addDays(today, 1), end = addDays(today, 3);
    var list = F.list.filter(function (f) { return f.status === 'confirmed' && f.date > tom && f.date <= end; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.first || 9e15) - (b.first || 9e15) || String(a.name).localeCompare(String(b.name)); });
    if (!list.length) return '';
    return '<div class="fn-land"><span class="fn-land-h">Functions</span><ul>' + list.slice(0, 4).map(function (f) {
      return '<li><b>' + esc(dayName(f.date)) + '</b> ' + esc(f.name) + ', food ' + esc(when(f.first, f.date)) + ', ' + totalQty(f) + ' platters</li>';
    }).join('') + '</ul><a class="fn-land-go" href="#/fn">' + (list.length > 4 ? 'Open functions, ' + (list.length - 4) + ' more' : 'Open functions') + '</a></div>';
  }

  /* ---------- Things to check (22 Oct 2026, review F5) ----------
     For the head chef and sous chefs on the landing page, and the head chef's own Google device with nobody signed in
     (23 Oct 2026, bookEdit(): the same as Manage Recipes, never a shared device): what in the next 7 days' confirmed
     functions still needs a hand before the day, worked out from what the book already has (no reads): times still TBC, a platter no longer in
     the book, a platter whose card changed since the booking, a platter card with amounts to come ([square brackets]),
     and a platter whose allergens are incomplete. Each line links to the function or the card. Hide for today keeps it
     away until tomorrow (lk.fn.ckhide: the kitchen day it was hidden; out of date the next day). */
  var CK_DAYS = 7;
  function checks() {
    var t = now(), today = kday(t), last = addDays(today, CK_DAYS), out = [], seen = {};
    var D = window.LK_DATA || { recipes: [] }, app = window.LK_APP, rec = {};
    (D.recipes || []).forEach(function (r) { rec[r.id] = r; });
    F.list.filter(function (f) { return f.status === 'confirmed' && f.date >= today && f.date <= last; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.first || 0) - (b.first || 0); })
      .forEach(function (f) {
        var when = f.date === today ? 'today' : dayName(f.date);
        function add(k, html, href) { if (seen[k]) return; seen[k] = 1; out.push({ html: html, href: href }); }
        if (!f.first) add('tbc:' + f.id, '<b>' + esc(f.name) + '</b>, ' + esc(when) + ': the times are still TBC', '#/fn/' + encodeURIComponent(f.id));
        (f.lines || []).forEach(function (l) {
          var r = rec[l.rid], nm = esc(l.name || l.rid), fnHref = '#/fn/' + encodeURIComponent(f.id), rHref = '#/r/' + encodeURIComponent(l.rid);
          if (!r) { add('gone:' + l.rid + ':' + f.id, nm + ' is no longer in the book (<b>' + esc(f.name) + '</b>, ' + esc(when) + ')', fnHref); return; }
          if (l.fp && fingerprint(r) !== l.fp) add('chg:' + l.rid + ':' + f.id, nm + ' changed in the book since <b>' + esc(f.name) + '</b> was booked', fnHref);
          if ((r.ingredients || []).some(function (i) { return /\[/.test(String(i.q || '')); })) add('qty:' + l.rid, nm + ': amounts to come on the card', rHref);
          if (app && app.missing && app.missing(l.rid).length) add('alg:' + l.rid, nm + ': allergens incomplete', rHref);
        });
      });
    return out;
  }
  function checkHTML() {
    var P = window.LK_PREP, chef = !!(P && ((P.chefMenu && P.chefMenu().chef) || (P.bookEdit && P.bookEdit()))), hid = '';
    if (!chef) return '';
    try { hid = localStorage.getItem('lk.fn.ckhide') || ''; } catch (e) {}
    if (hid === kday(now())) return '';
    var xs = checks();
    if (!xs.length) return '';
    if (P.sg) P.sg('checks', 's');
    return '<div class="fn-ck"><span class="fn-ck-h">To check before the functions</span><ul>' + xs.slice(0, 6).map(function (x) { return '<li><a href="' + x.href + '">' + x.html + '</a></li>'; }).join('') + '</ul>' +
      (xs.length > 6 ? '<p class="fn-ck-more">and ' + (xs.length - 6) + ' more</p>' : '') + '<button type="button" class="linkish" data-fn="ckhide">Hide for today</button></div>';
  }

  /* ---------- clicks, and keeping it right while the screen stays open ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('.fn-ck a') && window.LK_PREP && window.LK_PREP.sg) window.LK_PREP.sg('checks', 't');
    var el = e.target.closest && e.target.closest('[data-fn]');
    if (!el) return;
    var a = el.getAttribute('data-fn');
    if (a === 'open') { sheetOpen(el.getAttribute('data-id'), el); return; }
    if (a === 'close') { sheetClose(true); return; }
    if (a === 'sent' || a === 'unsent') { tickSent(el.getAttribute('data-id'), +el.getAttribute('data-r'), a === 'sent'); return; }
    if (a === 'go') { sheetClose(); return; }
    if (a === 'ckhide') { try { localStorage.setItem('lk.fn.ckhide', kday(now())); } catch (x) {} if (window.LK_PREP && window.LK_PREP.sg) window.LK_PREP.sg('checks', 'd'); paint(); return; }
    if (a === 'fold') { lsSet('lk.fn.fold', lsGet('lk.fn.fold') === kday(now()) ? null : kday(now())); lastBand = null; paint(); var fb = document.querySelector('#fn-band [data-fn="fold"]'); if (fb) fb.focus({ preventScroll: true }); return; }
    if (a === 'more') { F.more = !F.more; lastBand = null; paint(); var mb = document.querySelector('#fn-band [data-fn="more"]'); if (mb) mb.focus({ preventScroll: true }); return; }
    if (a === 'days') { pageDays = +el.getAttribute('data-v') || 3; try { window.dispatchEvent(new Event('lk-fn')); } catch (x) {} }
  });
  document.addEventListener('keydown', function (e) {
    if (!sheetEl) return;
    if (e.key === 'Escape') { e.preventDefault(); sheetClose(true); return; }
    if (e.key === 'Tab') {
      var f = sheetEl.querySelectorAll('a[href], button'), first = f[0], last = f[f.length - 1];
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('hashchange', function () { sheetClose(); });
  // the band comes and goes on time with the screen left open: every 20 seconds it is worked out again (no reads)
  var lastDay = T.day();
  setInterval(function () {
    if (T.day() !== lastDay) { lastDay = T.day(); stop(); watch(); }   // midnight: the query starts from the new day
    paint();
    if (/^#\/fn\//.test(location.hash)) { try { window.dispatchEvent(new Event('lk-fn')); } catch (x) {} }   // a function page or the service view: late shows on time
  }, 20000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { watch(); changed(); } });
  window.addEventListener('online', function () { watch(); changed(); });
  window.addEventListener('offline', changed);
  window.addEventListener('lk-clock', changed);
  window.addEventListener('lk-cfg', function () { watch(); changed(); });
  window.addEventListener('lk-who', changed);
  // the head chef's Google sign-in passed or failed on this device: To check before the functions follows
  window.addEventListener('lk-admin', changed);
  // the head chef's recipe changes arrived: the platter names in the picker follow (bookings keep what was agreed)
  window.addEventListener('lk-rx', function () { D = window.LK_DATA || D; });

  window.LK_FN = {
    M: M, list: function () { return F.list.slice(); }, state: function () { return F; },
    bandSlot: function () { var h = bandHTML(); lastBand = h; return '<div class="fn-band" id="fn-band" role="region" aria-label="Functions"' + (h ? '' : ' hidden') + '>' + h + '</div>'; },
    landSlot: function () { var h = landHTML(); return '<div id="fn-land"' + (h ? '' : ' hidden') + '>' + h + '</div>'; },
    checkSlot: function () { var h = checkHTML(); return '<div id="fn-check"' + (h ? '' : ' hidden') + '>' + h + '</div>'; },
    page: pageHTML, watch: watch, paint: paint, catalogue: catalogue, recipeOf: recipeOf, nameOf: nameOf, sheetHTML: sheetHTML, esc: esc
  };
  watch();
})();
