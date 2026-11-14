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
    if (f.removed) { f.status = 'cancelled'; f.kq = 0; return f; }
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
  // isSent(f, i), when given, says round i of f was ticked as sent: the order then follows what is still to go out.
  // keep(f), when given, keeps a confirmed function on after its window while a trip still waits for Functions (14 Nov
  // 2026); the kitchen's list drops it at midnight
  function showing(list, now, isSent, keep) {
    var out = [];
    list.forEach(function (f) {
      if (f.status === 'confirmed' && f.from <= now && (now < f.until || keep && keep(f))) out.push({ f: f, kind: 'on' });
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
  /* all (8 Nov 2026, the service view's board as drawn, every-page.html e-service): every round of every function on now
     that is not sent yet, in time order, so the board shows the whole night with its dietaries and its tick. */
  // leftOf(f, i), when given, is what is still to send of round i by line (trips, 14 Nov 2026); otherwise all of it
  function service(list, now, isSent, leftOf, keep) {
    var rows = [], ahead = [], plate = {}, all = [];
    showing(list, now, isSent, keep).forEach(function (x) {
      var f = x.f;
      if (x.kind !== 'on' || !f.first) return;
      var n = f.rounds.length, k = nextOpen(f, function (i) { return isSent(f, i); });
      if (k < 0) return;
      function at(j) { return leftOf ? leftOf(f, j) : (f.lines || []).map(function (l) { return counts(l, n)[j]; }); }
      var r = { f: f, k: k, at: f.rounds[k].at, a: at(k) };
      r.late = r.at < now; r.due = r.at <= now + DUE_SOON;
      rows.push(r);
      if (r.due) (f.lines || []).forEach(function (l, i) { if (r.a[i]) { var p = plate[l.rid] = plate[l.rid] || { rid: l.rid, name: l.name, qty: 0 }; p.qty += r.a[i]; } });
      for (var j = k + 1; j < n; j++) if (f.rounds[j].at <= now + HOUR) ahead.push({ f: f, k: j, at: f.rounds[j].at, a: at(j) });
      for (var i = k; i < n; i++) if (i === k || !isSent(f, i)) { var o = { f: f, k: i, at: f.rounds[i].at, a: at(i) }; o.late = o.at < now; o.due = o.at <= now + DUE_SOON; all.push(o); }
    });
    rows.sort(function (a, b) { return a.at - b.at; });
    ahead.sort(function (a, b) { return a.at - b.at; });
    all.sort(function (a, b) { return a.at - b.at || String(a.f.name).localeCompare(String(b.f.name)) || a.k - b.k; });
    return { rows: rows, ahead: ahead, all: all, plate: Object.keys(plate).map(function (k) { return plate[k]; }).sort(function (a, b) { return b.qty - a.qty || a.name.localeCompare(b.name); }) };
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

  // Canonical bodies are published by a function editor. Status-only chefs may reuse these exact bodies.
  function prepBody(f, l, id) {
    var a = counts(l, (f.rounds || []).length), i = a.findIndex(function (x) { return x > 0; }), r = i >= 0 ? f.rounds[i] : (f.rounds || [])[0];
    var at = r && r.at ? (f.mode === 'stag' ? 'from ' : 'at ') + when(r.at, f.date) : 'times TBC';
    return { text: (l.name + ': ' + (f.name || 'function') + ', ' + at).slice(0, 160), qty: (l.qty + ' ' + unitOf(l, l.qty)).slice(0, 40), station: 'Functions', recipe: l.rid, fn: id, dupOk: true };
  }
  function orderBody(f, id, pre) {
    var txt = (pre || 'Function stock') + ': ' + (f.name || 'function') + ', ' + dayName(f.date) + ': ' + (f.lines || []).map(function (l) { return l.qty + ' ' + short(l.name); }).join(', ');
    return { text: txt.slice(0, 120), qty: (totalQty(f) + ' platters').slice(0, 40), recipes: (f.lines || []).map(function (l) { return l.rid; }), fn: id, dupOk: true };
  }
  function effects(f, id) {
    var prep = {};
    (f.lines || []).forEach(function (l) { prep[('fn-' + id + '-' + l.rid).slice(0, 120)] = prepBody(f, l, id); });
    return { prep: prep, order: orderBody(f, id), cancel: orderBody(f, id, 'Function cancelled, check the order'), restore: orderBody(f, id, 'Function restored, check the order') };
  }
  // what the kitchen sees of a booking (not its contact, which lives apart in fncontact): Home's Function this week card
  // comes back, marked Changed, when this differs from what a person's Got it saw (10 Nov 2026)
  function kitchenSig(f) {
    var s = JSON.stringify([f.name, f.date, f.start || 0, f.loc || '', f.guests || 0, !!f.gu, f.notes || '', (f.rounds || []).map(function (r) { return r.at; }),
      (f.lines || []).map(function (l) { return [l.rid, l.qty, l.u]; })]), h = 5381, i;
    for (i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  /* The Orders tag (functions ahead of time, step 3, head chef 10 Nov 2026): a function's own stock line on today's order
     list, still to tick, says Order today on its order day (od) and Not ordered yet after it, up to the function's day.
     The line is the function's when its first id (root, kept by every rolled copy) is fn-<function id> and its words
     name the function's day. The Changed, Cancelled and Restored lines have their own ids, so they never match. null
     when the line is not one, or the function is not in the list given (not loaded, removed, cancelled, past, moved to
     another day): never a guess. today is the kitchen day. */
  function orderTag(list, x, today) {
    if (!x || x.ordered || x.deleted || !isYmd(today) || x.date !== today) return null;
    var key = String(x.root || x.id || ''), f = null;
    (list || []).forEach(function (g) { if (!f && g && g.id && ('fn-' + g.id).slice(0, 120) === key) f = g; });
    if (!f || f.status !== 'confirmed' || !isYmd(f.date) || !isYmd(f.od) || f.date < today || f.od > today) return null;
    if (x.fn && x.fn !== f.id) return null;
    if (String(x.text || '').indexOf(', ' + dayName(f.date) + ':') < 0) return null;
    return { id: f.id, kind: f.od === today ? 'today' : 'late', day: dayName(f.date), od: dayName(f.od) };
  }
  var M = {
    MIN: MIN, HOUR: HOUR, DAY: DAY, MAX_LINES: MAX_LINES, MAX_ROUNDS: MAX_ROUNDS, MAX_QTY: MAX_QTY, MAX_PER: MAX_PER,
    kday: kday, kat: kat, kclock: kclock, dayStart: dayStart, addDays: addDays, isYmd: isYmd, hmMin: hmMin, dayName: dayName, when: when,
    even: even, toU: toU, fromU: fromU, sum: sum, roundTimes: roundTimes, windowOf: windowOf, derive: derive, counts: counts,
    short: short, unitOf: unitOf, totalQty: totalQty, guestsText: guestsText, problems: problems, changes: changes, dayTotals: dayTotals,
    overlaps: overlaps, showing: showing, service: service, soon: soon, orderDay: orderDay, orderOn: orderOn, nextRound: nextRound, nextOpen: nextOpen, fingerprint: fingerprint, kitchenSig: kitchenSig, prepBody: prepBody, orderBody: orderBody, effects: effects, orderTag: orderTag
  };
  if (typeof module === 'object' && module.exports) { module.exports = M; return; }

  /* ---------- the kitchen's side: the band, the sheet, #/fn, the landing card ---------- */
  var T = window.LK_TIME, D = window.LK_DATA || { recipes: [], menuOrder: [] };
  function P() { return window.LK_PREP; }
  // today's free reads used up: the kitchen pages say so at the top (js/prep.js quotaOn(), 5 Nov 2026)
  function quota() { try { return !!(P() && P().quota && P().quota()); } catch (e) { return false; } }
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
  var F = { list: [], state: 'idle', at: 0, err: '', key: '', wait: '', unsub: null, more: false, offline: false, jobs: {} };
  // Private bookings are loaded only after a verified login, never from a shared localStorage cache.
  function nameOf(id) {
    if (!id) return 'Head chef (admin)';
    var api = P() && P().book && P().book();
    return (api && api.nameOf(id)) || 'Someone no longer on the list';
  }
  function watch() {
    var prep = P(); if (!prep || !prep.state) return;
    if (!prep.privateAccess()) { stop(); sheetClose(false, true); SEEN = { who: '', by: {} }; PK = { who: '', r: {}, note: {} }; F.pend = {}; F.sv++; var printed = document.getElementById('fn-print'); if (printed) printed.remove(); F.list = []; F.all = null; F.sent = {}; F.state = 'idle'; lsSet('lk.fn', null); changed(); return; }
    var st = prep.state;
    if (!/^\d{4,6}$/.test(st.pin || '') || st.configState !== 'ok') return;
    var key = st.pin + '|' + T.day();
    if (key === F.key && (F.unsub || F.wait === key)) return;
    if (F.unsub) { F.unsub(); F.unsub = null; }
    F.key = key; F.wait = key; if (!F.list.length || F.state === 'idle') F.state = 'loading';
    var api = prep.book();
    api.ready().then(function () {
      // asked again while the Firebase files loaded, or stopped since: only the last ask starts the listener (Plan B 2.7,
      // 7 Nov 2026). Each ask used to start one and only the last could be stopped, so on one open two or three listeners
      // read every booking and kept reading every change to one.
      if (F.wait !== key || F.key !== key) return;
      F.wait = '';
      var fs = api.fs();
      watchSent(api, fs);
      var served = false;   // this listener has had the server's answer
      F.unsub = fs.onSnapshot(fs.query(api.colRef('functions'), fs.where('kq', '>=', T.at(T.day(), 0)), fs.orderBy('kq'), fs.limit(150)), { includeMetadataChanges: true }, function (snap) {
        // No signal before this listener's first server answer (opened offline, or started again at midnight): the copy
        // in memory holds at most this phone's unsent changes, never the list (27 Oct 2026). The list already shown
        // stays (at midnight, yesterday's, under "No signal. Last updated"), or the page waits for the server.
        var fromCopy = !!(snap.metadata && snap.metadata.fromCache);
        if (fromCopy && !served && snap.docs.every(function (d) { return !!(d.metadata && d.metadata.hasPendingWrites); })) {
          F.offline = true; if (F.state !== 'ok') F.state = 'offline'; changed(); return;
        }
        if (!fromCopy) served = true;
        function one(d) {
          var job = F.jobs[d.id];
          // A cancellation waiting for its server acknowledgement must not look finished on this phone.
          return job && d.metadata && d.metadata.hasPendingWrites ? job.before : derive(Object.assign({ id: d.id }, d.data()));
        }
        F.list = snap.docs.filter(function (d) { return !d.data().removed; }).map(one);
        // removed ones too, for Manage functions (live()), which lists them under Deleted
        F.all = snap.docs.map(one);
        F.offline = fromCopy;
        if (!F.offline) { F.at = now(); F.cached = false; F.state = 'ok';  }
        else if (F.state !== 'ok') F.state = navigator.onLine === false ? 'offline' : 'loading';
        changed();
      }, function (e) { F.state = 'error'; F.err = e && e.code || ''; F.unsub = null; F.key = ''; changed(); });
    }, function () { if (F.wait === key) F.wait = ''; F.state = 'error'; changed(); });
  }
  function stop() { if (F.unsub) F.unsub(); if (F.unsub2) F.unsub2(); F.unsub = F.unsub2 = null; F.key = F.wait = ''; }
  /* Rounds ticked as sent (fnsent/<function>_<round time>): one more small listener, on yesterday and later, so an
     overnight round is still there after midnight. A round whose time was changed after it was ticked shows as not sent.
     No signal (28 Oct 2026): started again at midnight, the listener answers at once from the copy in memory, which holds
     at most this phone's own unsent ticks (LK_PREP.book().listSnap says 'wait'). The rounds already read stay sent, with
     this phone's ticks on top, until the server answers; before, every round showed as not sent and could go out twice.
     includeMetadataChanges: the server's first answer comes in even when nothing changed (not billed). */
  F.sent = {}; F.sv = 0; F.pend = {};
  function watchSent(api, fs) {
    if (F.unsub2) F.unsub2();
    var state = 'loading', last = {};
    F.unsub2 = fs.onSnapshot(fs.query(api.colRef('fnsent'), fs.where('day', '>=', kday(now() - DAY))), { includeMetadataChanges: true }, function (snap) {
      var k = api.listSnap ? api.listSnap(snap, state, last) : 'new';
      if (k === 'same') return;
      var m = k === 'wait' ? Object.assign({}, F.sent) : {}; snap.docs.forEach(function (d) { m[d.id] = d.data(); }); F.sent = m; F.sv++;
      state = k === 'wait' ? 'offline' : 'ok';
      changed();
    }, function () { F.unsub2 = null; });
  }
  /* A round is sent when its own Sent record says so (an older phone, or the last trip), or when its trips add up to what
     is booked in it (14 Nov 2026). For a round sent in trips the time and the name are the last trip's. */
  function sentRec(f, i) {
    var r = (f.rounds || [])[i], x = r && r.at ? F.sent[f.id + '_' + r.at] : null;
    if (x && x.sent) return x;
    var st = r && r.at ? roundState(f, i) : null, last = st && st.all && st.trips.length ? st.trips[st.trips.length - 1] : null;
    return last ? { sent: true, sentAt: last.sentAt, sentBy: last.sentBy, trip: true } : null;
  }
  function sentText(x) { return 'sent ' + kclock(x.sentAt) + ', ' + nameOf(x.sentBy); }

  /* ---------- trips: the two-way check (head chef, 14 Nov 2026, docs/function-handover-options/brief.md) ----------
     What leaves the pass together is a trip, fnsent/<fid>_<round time>_t<k>: { fid, at, day, k, n: { recipe id: how
     many }, sentAt, sentBy }, then outAt, outBy, outFor (Functions confirmed it; outFor: a head or sous chef did, for
     Functions) or void, voidAt, voidBy (Undo). The same listener as the Sent ticks brings them: no read of its own. Lines
     are matched by recipe id (a booking holds each platter once, js/fnedit.js). A round whose time changed after a trip
     shows as not sent, like a Sent tick. */
  var TRIP_RX = /^(.+)_(\d+)_t(\d+)$/;
  function tripRec(id, x) {
    var m = TRIP_RX.exec(id || '');
    if (!m || !x || typeof x !== 'object' || x.fid !== m[1] || x.at !== +m[2] || x.k !== +m[3] || !x.n || typeof x.n !== 'object') return null;
    var n = {};
    Object.keys(x.n).forEach(function (r) { var v = x.n[r]; if (typeof v === 'number' && v >= 1 && v <= MAX_QTY && Math.floor(v) === v) n[r] = v; });
    return { id: id, fid: x.fid, at: x.at, k: x.k, n: n, sentAt: +x.sentAt || 0, sentBy: typeof x.sentBy === 'string' ? x.sentBy : '',
      outAt: typeof x.outAt === 'number' ? x.outAt : 0, outBy: typeof x.outBy === 'string' ? x.outBy : '', outFor: x.outFor === true, void: x.void === true };
  }
  // the trips of each round, worked out again only when the records changed (F.sv)
  var TI = { v: -1, by: {} };
  function tripsOf(fid, at) {
    if (TI.v !== F.sv) {
      TI = { v: F.sv, by: {} };
      Object.keys(F.sent).forEach(function (id) { var t = tripRec(id, F.sent[id]); if (t) (TI.by[t.fid + '_' + t.at] = TI.by[t.fid + '_' + t.at] || []).push(t); });
      Object.keys(TI.by).forEach(function (k) { TI.by[k].sort(function (a, b) { return a.k - b.k; }); });
    }
    return TI.by[fid + '_' + at] || [];
  }
  /* A round now: what is booked in it, sent in trips and left, by line; its live trips; the next trip number (undone
     ones count, so a number is never used twice); all: nothing left to send. */
  function roundState(f, i) {
    var r = (f.rounds || [])[i];
    if (!r || !r.at) return null;
    var L = f.lines || [], booked = roundCounts(f, i), every = tripsOf(f.id, r.at), live = every.filter(function (t) { return !t.void; });
    var sent = L.map(function (l) { return live.reduce(function (s, t) { return s + (t.n[l.rid] || 0); }, 0); });
    var leg = F.sent[f.id + '_' + r.at], legSent = !!(leg && leg.sent), bookedTot = sum(booked);
    var left = booked.map(function (b, j) { return legSent ? 0 : Math.max(0, b - sent[j]); });
    return { booked: booked, sent: sent, left: left, bookedTot: bookedTot, sentTot: legSent ? bookedTot : Math.min(sum(sent), bookedTot), leftTot: sum(left),
      trips: live, nextK: every.reduce(function (m, t) { return Math.max(m, t.k); }, 0) + 1, legacy: legSent ? leg : null, all: legSent || (bookedTot > 0 && !sum(left)) };
  }
  function leftK(f, i) { var st = roundState(f, i); return st ? st.left : roundCounts(f, i); }
  // "4 Antipasto, 3 Pizza": a trip's platters in the booking's order; one no longer booked is still counted
  function tripText(f, n, x) {
    var seen = {}, out = (f.lines || []).filter(function (l) { return n[l.rid] > 0; }).map(function (l) { seen[l.rid] = 1; return n[l.rid] + (x ? ' × ' : ' ') + short(l.name); });
    var gone = Object.keys(n).filter(function (r) { return !seen[r]; }).reduce(function (s, r) { return s + n[r]; }, 0);
    if (gone) out.push(gone + ' no longer booked');
    return out.join(', ');
  }
  // every trip waiting for Functions (sent, not confirmed, not taken back), oldest first; a confirm not sent yet stays
  function waitingTrips(fid) {
    var out = [];
    F.list.forEach(function (f) {
      if (fid && f.id !== fid || f.status !== 'confirmed' && f.status !== 'cancelled') return;
      (f.rounds || []).forEach(function (r, i) { tripsOf(f.id, r.at).forEach(function (t) { if (!t.void && (!t.outAt || F.pend[t.id])) out.push({ f: f, i: i, t: t }); }); });
    });
    return out.sort(function (a, b) { return a.t.sentAt - b.t.sentAt || a.t.k - b.t.k; });
  }
  // trips confirmed out today, newest first
  function outTrips(t) {
    var day = kday(t), out = [];
    F.list.forEach(function (f) { (f.rounds || []).forEach(function (r, i) { tripsOf(f.id, r.at).forEach(function (x) { if (!x.void && x.outAt && !F.pend[x.id] && kday(x.outAt) === day) out.push({ f: f, i: i, t: x }); }); }); });
    return out.sort(function (a, b) { return b.t.outAt - a.t.outAt; });
  }
  // a function with a trip still waiting stays on the board after its window, until the trip is confirmed or midnight
  function keepK(f) { return waitingTrips(f.id).length > 0; }
  function fnIds(k) { var p = P(), c = p && p.state && p.state.config; return c && Array.isArray(c[k]) ? c[k] : []; }
  // Functions people confirm: the coordinators and the people with the Functions tick
  function fnPerson(id) { return !!id && (fnIds('fnIds').indexOf(id) >= 0 || fnIds('fnOnlyIds').indexOf(id) >= 0); }
  // Functions-only staff never send (the rules refuse it): they see what is left as words
  function canSend() { var p = P(); return !(p && p.functionOnly && p.functionOnly()); }
  function isChef() { var p = P(); return !!(p && p.chefMenu && p.chefMenu().chef); }
  // tell the pages: the band and the landing card redraw themselves, #/fn redraws through js/app.js
  function changed() { ahFirst(); huFirst(); paint(); try { window.dispatchEvent(new Event('lk-fn')); } catch (e) {} }

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
        '<span class="fn-r2">Not today any more: now ' + esc(dayName(f.date)) + ', event ' + esc(when(f.start, f.date)) + ', food ' + esc(when(f.first, f.date)) + '.</span></button></li>';
    }
    // Functions people (14 Nov 2026): a trip the kitchen sent waits here with Confirm out beside the row (never their own)
    var me = ahWho(), wt = fnPerson(me) ? waitingTrips(f.id).filter(function (y) { return y.t.sentBy !== me; }) : [];
    if (wt.length) {
      var w0 = wt[0].t;
      return '<li class="fn-li fn-li-out">' + out.slice('<li class="fn-li">'.length) + '<span class="fn-r1"><span class="fn-due">' + esc(when(f.rounds[wt[0].i].at, kday(t))) + '</span> <b>' + esc(f.name) + '</b>' + (f.loc ? ' · ' + esc(f.loc) : '') + '</span>' +
        '<span class="fn-r2">Trip ' + w0.k + ': <b>' + esc(tripText(f, w0.n, true)) + '</b>, sent ' + esc(kclock(w0.sentAt)) + ' ' + esc(nameOf(w0.sentBy)) + ' ' + waitPill(f, w0, t) +
        (wt.length > 1 ? ' <span class="fn-of">+' + (wt.length - 1) + ' more waiting</span>' : '') + '</span></button>' +
        (F.pend[w0.id] ? '' : '<button type="button" class="btn fn-out-b" data-fn="trip-out" data-id="' + esc(w0.id) + '">' + I_TICKS + ' Confirm out</button>') + '</li>';
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
    var at = f.rounds[k].at, late = at < t, st = roundState(f, k), rc = st ? st.left : roundCounts(f, k), q = sum(rc), lead = n > 1 ? 'Round ' + (k + 1) + ' of ' + n : 'All';
    var of = st && st.sentTot ? q + ' left of ' + st.bookedTot : q + (n > 1 ? ' of ' + tot : '');
    return { time: when(at, kday(t)), late: late, k: k, html: (late ? '<span class="fn-late">' + lead + ' not sent yet</span>' : lead) + ': <b>' + esc(linesText(f, rc) || 'nothing') + '</b> <span class="fn-of">(' + of + ')</span>' };
  }
  // the order reminder and tomorrow's functions: one short line each
  function soonRow(x) {
    var f = x.f, tot = totalQty(f), out = '<li class="fn-li"><button type="button" class="fn-row is-soon" data-fn="open" data-id="' + esc(f.id) + '" aria-haspopup="dialog"><span class="fn-r2">';
    if (x.kind === 'order') return out + '<span class="fn-tag fn-t-order">Order today</span>' + (x.short ? ' <span class="fn-tag fn-t-off">Short notice</span>' : '') + ' Stock for <b>' + esc(f.name) + '</b>, ' + esc(dayName(f.date)) + ': ' + esc(linesText(f)) + ' (' + tot + '). It is on the order list.</span></button></li>';
    return out + '<span class="fn-tag fn-t-tom">Tomorrow</span> <b>' + esc(f.name) + '</b> · event ' + esc(when(f.start, f.date)) + ' · food ' + esc(when(f.first, f.date)) + ' · ' + esc(linesText(f)) + ' (' + tot + ')</span></button></li>';
  }
  /* The band's own rows: today's functions (two, then "+1 more"), then up to two order reminders and tomorrow's
     functions; all of them once "+N more" is open. The landing card leaves out the functions drawn here (landHTML()). */
  function bandRows(t) {
    var xs = showing(F.list, t, isSentK, keepK), ys = soon(F.list, t);
    return { xs: xs, ys: ys, a: F.more ? xs : xs.slice(0, 2), b: F.more ? ys : ys.slice(0, 2) };
  }
  /* What the slot under the top bar draws: the band, or, on a day the band would draw nothing, the quiet Next function
     line (functions ahead of time, head chef 10 Nov 2026, docs/function-ahead-options/brief.md, Chosen). The line is
     decided when the slot is drawn (ahOpen()) and keeps its place and its two rows until the next open; later changes
     swap its words only, so the list under it never moves under a finger. A function today is the one exception: the
     full band replaces the line, once no finger is down (ahWait()). */
  function bandHTML() {
    var base = bandBase();
    if (!AH.on && !AH.gone) return base;
    // locked or signed out since the open: nothing private stays on screen
    if (!window.LK_PREP || !window.LK_PREP.privateAccess()) { AH.on = AH.gone = false; return ''; }
    var t = now(), xs = showing(F.list, t, isSentK);
    if (xs.length && !ahWait()) { AH.on = AH.gone = false; return base; }
    if (AH.gone) return '';   // hidden with its minus until the next open
    return ahHTML(t, xs);
  }
  function bandBase() {
    if (!window.LK_PREP || !window.LK_PREP.privateAccess()) return '';
    if (location.hash === '#/fn/now') return '';   // the service view shows the same rounds in full: no band above it
    var t = now(), R = bandRows(t), xs = R.xs, stale = '';
    if (F.state === 'error' && F.at) stale = 'Could not load functions. Showing the copy from ' + when(F.at, kday(t)) + '.';
    else if (F.state === 'error') stale = !xs.length && /^\d{4,6}$/.test((P() && P().state && P().state.pin) || '') ? 'Could not load functions.' + (quota() ? '' : ' Check the signal.') : '';
    else if ((F.offline || navigator.onLine === false) && F.at && xs.length) stale = 'No signal. Functions last updated ' + when(F.at, kday(t)) + '.';
    var ys = R.ys;
    if (!xs.length && !ys.length && !stale) return '';
    var a = R.a, b = R.b, left = xs.length + ys.length - a.length - b.length;
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
  /* ---------- the Next function line (10 Nov 2026) ----------
     AH.on: the line holds the slot since the last open. AH.gone: its minus hid it, until the next open. AH.pending: the
     slot was drawn before the functions came in (the first open, or after a lock cleared the list), so the first answer
     decides. AH.wait: a function today wants the full band while a finger is down. */
  var AH = { on: false, gone: false, pending: false, wait: false }, touchDown = false, touchAt = 0, touchUp = 0, ahTimer = 0;
  var AH_DAYS = 7;
  // the functions the line may name, nearest first: a confirmed one from the day after tomorrow (today and tomorrow are
  // the band's) up to 7 days ahead; a cancelled one from tomorrow (the band never shows a cancellation before its day,
  // and the day before is the prep day), once it was cancelled inside the 7 days. It says Cancelled until its day passes.
  function ahList(t) {
    var today = kday(t), tom = addDays(today, 1), end = addDays(today, AH_DAYS);
    return F.list.filter(function (f) {
      if (!isYmd(f.date) || f.date > end) return false;
      if (f.status === 'confirmed') return f.date > tom;
      return f.status === 'cancelled' && f.date >= tom && !!f.confAt && !!f.canAt && kday(f.canAt) >= addDays(f.date, -AH_DAYS);
    }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.first || 9e15) - (b.first || 9e15) || String(a.name).localeCompare(String(b.name)); });
  }
  function ahWho() { try { var p = P(); return (p && p.book && p.book().who()) || ''; } catch (e) { return ''; } }
  // lk.fn.ahead.fold: "<kitchen day>|<staff id>" from the line's minus. Out of date the next kitchen day, or when a
  // different person is signed in on this device (so one cook's minus never hides the line from the next).
  function ahHidden(t) { return lsGet('lk.fn.ahead.fold') === kday(t) + '|' + ahWho(); }
  /* An open: a page draws the slot (js/app.js fnBand(), which a PIN unlock or a change of person on a shared device
     also does), or the book comes back on screen. Never lk-who alone: a shared tablet sends it on every Prep tick. */
  function ahOpen() {
    var t = now();
    AH.wait = false; AH.gone = false;
    AH.pending = F.state !== 'ok' && !F.list.length;   // nothing current read yet: the first answer decides (ahFirst())
    AH.on = !AH.pending && !!window.LK_PREP && window.LK_PREP.privateAccess() && !/^#\/fn(?:\/|$)|^#\/functions/.test(location.hash) && !bandBase() && ahList(t).length > 0 && !ahHidden(t);
  }
  // the functions' first answer after an open decides, once no finger is down (and 400 ms after one lifts)
  function ahFirst() {
    if (!AH.pending || F.state !== 'ok' && !F.list.length) return;
    if (touchDown || Date.now() - touchUp < 400) { clearTimeout(ahTimer); ahTimer = setTimeout(function () { ahFirst(); paint(); }, 450); return; }
    ahOpen();
  }
  // a function today ends the line: true while it must wait for the finger to lift (and 400 ms of quiet after)
  function ahWait() {
    if (touchDown && Date.now() - touchAt > 15000) touchDown = false;   // a lost lift never holds the band back for long
    if (touchDown) { AH.wait = true; return true; }
    if (Date.now() - touchUp < 400) { AH.wait = true; ahLater(); return true; }
    AH.wait = false; return false;
  }
  function ahLater() { clearTimeout(ahTimer); ahTimer = setTimeout(function () { if (AH.wait && !touchDown) paint(); }, 450); }
  function lift() { touchDown = false; touchUp = Date.now(); if (AH.wait) ahLater(); }
  document.addEventListener('pointerdown', function () { touchDown = true; touchAt = Date.now(); }, true);
  document.addEventListener('pointerup', lift, true);
  // a touch that turns into a scroll sends pointercancel with the finger still on the glass: only the touch's end lifts it
  document.addEventListener('pointercancel', function (e) { if (e.pointerType !== 'touch') lift(); }, true);
  document.addEventListener('touchend', function (e) { if (!e.touches || !e.touches.length) lift(); }, { capture: true, passive: true });
  document.addEventListener('touchcancel', function (e) { if (!e.touches || !e.touches.length) lift(); }, { capture: true, passive: true });
  window.addEventListener('blur', function () { if (touchDown) lift(); });
  // the line's words: row 1 starts with what it is (never cut), row 2 the name (shortened) and one short part
  var AH_CHEV = '<svg class="fn-ahead-chev" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function ahHTML(t, xs) {
    var list = ahList(t), ys = soon(F.list, t), today = kday(t), tom = addDays(today, 1), end = addDays(today, AH_DAYS);
    // what the line says, the most pressing first: a function today waiting for the finger to lift, then the band's own
    // Order and Tomorrow words, then the nearest function (Cancelled before its day, or Next function)
    var f, kind;
    if (xs && xs.length) { f = xs[0].f; kind = 'today'; }
    else if (ys.length) { f = ys[0].f; kind = ys[0].kind; }
    else { f = list[0]; kind = f && f.status === 'cancelled' ? 'cancelled' : 'next'; }
    var d = function (s) { return '<span class="fn-ahead-d">\u00a0\u00b7 ' + esc(s) + '</span>'; };
    var s, dd = '', pre = '', nm, x = '', aria;
    if (!f) {
      // the function it named went (deleted, moved past the week): the same two rows until the next open
      return '<div class="fn-ahead"><a class="fn-ahead-b" href="#/fn"><span class="fn-ahead-tx"><span class="fn-ahead-l"><span class="fn-ahead-s">Next function</span></span>' +
        '<span class="fn-ahead-t"><span class="fn-ahead-nm"><b class="fn-ahead-n">Nothing booked in the next ' + AH_DAYS + ' days</b></span></span></span>' + AH_CHEV + '</a></div>';
    }
    nm = '<b class="fn-ahead-n">' + esc(f.name) + '</b>';
    // no signal or a failed read changes only the plain Next function words: a known cancellation, order or tomorrow stays
    var stale = kind === 'next' && (F.offline || navigator.onLine === false || F.state === 'error') && F.at;
    var upd = stale ? (kday(F.at) === today ? '' : dayName(kday(F.at)) + ' ') + kclock(F.at) : '';
    if (kind === 'today') {
      s = '<span class="fn-ahead-k">Today</span>'; dd = d(f.first ? 'food ' + kclock(f.first) : 'times TBC');
      aria = 'Today: ' + f.name + (f.first ? ', food ' + kclock(f.first) : ', times TBC') + '. Open the function';
    } else if (stale) {
      var word = F.state === 'error' ? 'Not updated' : 'No signal';
      s = '<span class="fn-ahead-k is-pending" role="status">' + word + '</span>'; dd = d('updated ' + upd); x = '\u00a0\u00b7 ' + esc(dayName(f.date));
      aria = word + '. Functions last updated ' + upd + '. Next function: ' + f.name + ', ' + dayName(f.date) + '. Open the function';
    } else if (kind === 'order') {
      s = '<span class="fn-tag fn-t-order">Order today</span>'; dd = d(dayName(f.date)); pre = '<span class="fn-ahead-p">Stock:\u00a0</span>';
      aria = 'Order today: stock for ' + f.name + ', ' + dayName(f.date) + '. It is on the order list. Open the function';
    } else if (kind === 'tomorrow') {
      s = '<span class="fn-tag fn-t-tom">Tomorrow</span>'; dd = d(dayName(f.date)); x = '\u00a0\u00b7 ' + (f.first ? 'food ' + esc(kclock(f.first)) : 'times TBC');
      aria = 'Tomorrow: ' + f.name + ', ' + dayName(f.date) + (f.first ? ', food ' + kclock(f.first) : ', times TBC') + '. Open the function';
    } else if (kind === 'cancelled') {
      // "Do not prep" leads row 2 and is never shortened (measured: on row 1 beside "+1 more this week" it was cut at 390 px)
      s = '<span class="fn-tag fn-t-off">Cancelled</span>'; dd = d(dayName(f.date)); pre = '<span class="fn-ahead-p fn-ahead-stop">Do not prep:\u00a0</span>'; nm = '<b class="fn-ahead-n"><s>' + esc(f.name) + '</s></b>';
      aria = 'Cancelled: ' + f.name + ', ' + dayName(f.date) + '. Do not prep. Open the function';
    } else {
      s = '<span class="fn-ahead-k">Next function</span>'; dd = d(dayName(f.date)); x = '\u00a0\u00b7 ' + esc(guestsText(f));
      aria = 'Next function: ' + f.name + ', ' + dayName(f.date) + ', ' + guestsText(f) + '. Open the function';
    }
    var more = F.list.filter(function (g) { return g.id !== f.id && g.status === 'confirmed' && isYmd(g.date) && g.date >= tom && g.date <= end; }).length;
    return '<div class="fn-ahead' + (kind === 'cancelled' ? ' is-cancelled' : '') + '"><button type="button" class="fn-ahead-b" data-fn="open" data-id="' + esc(f.id) + '" aria-haspopup="dialog" aria-label="' + esc(aria) + '">' +
      '<span class="fn-ahead-tx"><span class="fn-ahead-l"><span class="fn-ahead-s">' + s + '</span>' + dd + '</span><span class="fn-ahead-t"><span class="fn-ahead-nm">' + pre + nm + '</span>' + (x ? '<span class="fn-ahead-x">' + x + '</span>' : '') + '</span></span>' +
      AH_CHEV + '</button>' +
      // the spoken name starts with the words on the button (+1 more this week)
      (more ? '<a class="fn-ahead-more" href="#/fn" aria-label="+' + more + ' more this week: open Functions, the next ' + AH_DAYS + ' days"><span class="fn-ahead-m1">+' + more + ' more</span> <span class="fn-ahead-m2">this week</span></a>' : '') +
      '<button type="button" class="fn-fold fn-ahead-hide" data-fn="ahead-hide" aria-label="Hide this line on this phone until tomorrow" title="Hide until tomorrow">\u2212</button></div>';
  }
  /* ---------- Home: the Function this week card and the Next function line (step 2, 10 Nov 2026) ----------
     Under Your day on Home (docs/function-ahead-options/brief.md, Chosen). Each person sees a card once for each function
     in the next 7 days, with its food times, platters and notes, and Got it; once more the day before (Function
     tomorrow: everyone, head chef 10 Nov 2026); once if what the kitchen needs changes; and once if it is cancelled after
     they were told. Three or more not seen are one card. One card shows at a time, nearest first. Got it folds the card
     into the quiet Next function line in the same place, which answers "Got it" with Undo inside it. As on the work
     pages, which pieces show is decided when Home opens (huOpen()); until the next open only their words change (a
     cancellation, a removal or a change shows in place, as words). Got it and Undo are the person's own taps, so they
     redraw at once. No reads: it uses the functions listener. */
  var HU = { plan: null, pending: false, ack: null, shown: 0, snap: {} };
  function huOK() { var p = window.LK_PREP; return !!p && p.privateAccess() && !(p.functionOnly && p.functionOnly()); }
  function huKey() { return 'lk.fn.hu.' + (ahWho() || 'device'); }
  // lk.fn.hu.<staff id>: { <function id>: { s: 'week' | 'tom' | 'off', g: what the card showed (huSig()), d: its date,
  // t: when (now()), w: 1 once the chefs have it (fnseen, huSync()), n: refusals so far, w: 2 after 5 } }, this person
  // on this phone. Out of date for a function once its day has passed (dropped at an open, huOpen()); a booking whose
  // kitchen words changed since (g) brings its card back once, marked Changed.
  function huGet() { try { var m = JSON.parse(lsGet(huKey()) || '{}'); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch (e) { return {}; } }
  function huPut(m) { lsSet(huKey(), Object.keys(m).length ? JSON.stringify(m) : null); }
  var huSig = kitchenSig;
  // a booking by id; one that left the list since Home opened (removed) is drawn from the copy last seen, as removed
  function huFn(id) {
    var f = byId(id);
    if (f) { HU.snap[id] = f; return f; }
    return HU.snap[id] ? Object.assign({}, HU.snap[id], { status: 'removed' }) : null;
  }
  // the functions Home speaks of, nearest first: tomorrow to 7 days ahead (today's are Now and next's), confirmed, or
  // cancelled once they were inside the 7 days
  function huList(t) {
    var today = kday(t), tom = addDays(today, 1), end = addDays(today, AH_DAYS);
    return F.list.filter(function (f) {
      if (!isYmd(f.date) || f.date < tom || f.date > end) return false;
      return f.status === 'confirmed' || f.status === 'cancelled' && !!f.confAt && !!f.canAt && kday(f.canAt) >= addDays(f.date, -AH_DAYS);
    }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.first || 9e15) - (b.first || 9e15) || String(a.name).localeCompare(String(b.name)); });
  }
  // the card a function needs for this person now: week, tom (the day before) or off (cancelled after they were told);
  // chg when what the kitchen needs changed since their Got it, back when it is on again after a cancellation
  function huNeed(f, t, m) {
    var r = m[f.id], tom = addDays(kday(t), 1);
    if (f.status === 'cancelled') return r && r.s !== 'off' ? { s: 'off' } : null;
    var s = f.date === tom ? 'tom' : 'week', chg = !!r && r.g !== huSig(f);
    if (!r) return { s: s };
    if (r.s === 'off') return { s: s, back: true };
    if (s === 'tom' && r.s === 'week') return { s: s, chg: chg, since: r.t };
    return chg ? { s: s, chg: true, since: r.t } : null;
  }
  function huPlan(t, lineId) {
    var list = huList(t), m = huGet(), need = [];
    list.forEach(function (f) { var n = huNeed(f, t, m); if (n) need.push({ id: f.id, s: n.s, chg: !!n.chg, back: !!n.back, since: n.since || 0 }); });
    var week = need.filter(function (x) { return x.s === 'week'; }), card = need[0] || null;
    if (card && card.s === 'week' && week.length >= 3) {
      var chg = {}; week.forEach(function (x) { if (x.chg || x.back) chg[x.id] = 1; });
      card = { busy: week.map(function (x) { return x.id; }), s: 'week', chg: chg };
    }
    var waiting = {}; need.forEach(function (x) { waiting[x.id] = 1; });
    var line = lineId || (list.filter(function (f) { return !waiting[f.id]; })[0] || {}).id || '';
    // "Also this week" is decided here with the rest, so a booking from another phone never adds a row while Home is open
    var also = card && !card.busy && card.s === 'week' ? (list.filter(function (g) { return g.id !== card.id && g.id !== line && g.status === 'confirmed'; })[0] || {}).id || '' : '';
    var p = { card: card, line: line, also: also, total: list.filter(function (f) { return f.status === 'confirmed'; }).length };
    huIds.call(p).forEach(function (id) { huFn(id); });   // keep a copy of each, should one be removed while Home is open
    return p;
  }
  function huSay(s) { var e = document.getElementById('fn-hm-say'); if (e) e.textContent = s || ''; }
  // an open of Home (its slot drawn by js/prep.js homeSlot(), or the book back on screen); old marks are dropped here
  function huOpen() {
    HU.ack = null; HU.snap = {}; huSay('');
    HU.pending = F.state !== 'ok' && !F.list.length;
    HU.plan = HU.pending || !huOK() ? null : huPlan(now());
    if (HU.plan && HU.plan.card) HU.shown = Date.now();
    if (!HU.pending && huOK()) {
      var m = huGet(), today = kday(now()), gone = 0;
      Object.keys(m).forEach(function (id) { if (!m[id] || !isYmd(m[id].d) || m[id].d < today) { delete m[id]; gone++; } });
      if (gone) huPut(m);
    }
    huSync();
  }
  function huFirst() {
    if (!HU.pending || F.state !== 'ok' && !F.list.length) return;
    if (touchDown || Date.now() - touchUp < 400) { setTimeout(function () { huFirst(); paint(); }, 450); return; }
    huOpen();
  }
  // the functions the card and line name (this, or HU.plan): Coming up leaves them out
  function huIds() {
    var p = this && this.card !== undefined ? this : HU.plan, out = [];
    if (!p) return out;
    if (p.line) out.push(p.line);
    if (p.card) out = out.concat(p.card.busy || [p.card.id]);
    if (p.also) out.push(p.also);
    return out;
  }
  function huFood(f) { return f.first ? (f.rounds || []).map(function (r) { return kclock(r.at); }).join(' and ') + ((f.rounds || []).length > 1 ? ' (' + f.rounds.length + ' rounds)' : '') : 'Times TBC'; }
  function huDays(f, t) { var n = Math.round((kat(f.date, 12 * 60) - kat(kday(t), 12 * 60)) / DAY); return n <= 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days'; }
  // the notes as they were typed (service and dietary notes), never shortened by rule: an allergy keeps its words
  function huNotes(f) { return f.notes ? esc(f.notes) : 'None entered'; }
  function huPlatters(f) { var tot = totalQty(f); return esc(linesText(f)) + (tot ? ' (' + tot + ')' : ''); }
  // the chefs see who has said Got it only while a function is on (seenHTML()), so the cancelled card does not say so
  function huGotBtn(ids, s, name, plain) {
    return '<button type="button" class="btn' + (plain ? '' : ' dark') + ' fn-hu-got" data-fn="hu-got" data-ids="' + esc(ids.join(',')) + '" data-s="' + s + '" aria-label="' + esc('Got it: ' + name + '. It stays on Home as one line for you.' + (s === 'off' ? '' : ' Your chefs see who has said Got it.')) + '">Got it</button>';
  }
  // opens the function's sheet over Home (a button: the page under it stays Home)
  function huOpenB(f) { return '<button type="button" class="fn-hu-open" data-fn="open" data-id="' + esc(f.id) + '" aria-haspopup="dialog">Open the function</button>'; }
  function huGone(f) { return f.status === 'cancelled' || f.status === 'removed'; }
  function huCardHTML(c, t) {
    var p = HU.plan, tom = addDays(kday(t), 1);
    if (c.busy) {
      var fs = c.busy.map(huFn).filter(Boolean);
      if (!fs.length) return '';
      return '<section class="hm-paper fn-hu fn-hu-wk" aria-labelledby="fn-hu-h"><div class="hm-ph"><h3 class="hm-pt" id="fn-hu-h">Functions this week</h3><span class="fn-hu-n">' + fs.length + ' this week</span></div>' +
        '<ul class="fn-wk">' + fs.map(function (f) {
          var tag = huGone(f) ? ' <span class="fn-tag fn-t-off">' + (f.status === 'removed' ? 'Removed' : 'Cancelled') + '</span>' : c.chg && c.chg[f.id] ? ' <span class="fn-tag fn-t-new">Changed</span>' : '';
          return '<li><button type="button" class="fn-wk-r" data-fn="open" data-id="' + esc(f.id) + '" aria-haspopup="dialog">' +
            '<span class="fn-wk-d"><b>' + esc(dayName(f.date).slice(0, 3)) + '</b>' + esc(dayName(f.date).slice(4)) + '</span>' +
            '<span class="fn-wk-m"><span class="fn-wk-1"><span class="fn-wk-n">' + (huGone(f) ? '<s>' + esc(f.name) + '</s>' : esc(f.name)) + tag + '</span><span class="fn-wk-g">' + esc(guestsText(f)) + '</span></span>' +
            '<span class="fn-wk-2">' + (huGone(f) ? 'Do not prep or order for it' : (f.first ? 'Food ' + esc(kclock(f.first)) : 'Times TBC') + ' · ' + totalQty(f) + ' platters') + '</span>' +
            (f.notes && !huGone(f) ? '<span class="fn-wk-3">' + esc(f.notes) + '</span>' : '') + '</span>' + AH_CHEV + '</button></li>';
        }).join('') + '</ul><div class="fn-hu-act">' + huGotBtn(fs.map(function (f) { return f.id; }), 'week', 'all ' + fs.length + ' functions this week') + '<a class="fn-hu-open" href="#/fn">Open Functions</a></div>' +
        '<p class="fn-hu-foot">One Got it for all ' + fs.length + ', until the day before each one. Your chefs see who has.</p></section>';
    }
    var f = huFn(c.id); if (!f) return '';
    // what the card says follows the booking now: cancelled or removed since the open shows as such, in place
    var kind = huGone(f) ? 'off' : c.s === 'off' ? (f.date === tom ? 'tom' : 'week') : c.s;
    var sub = [f.loc, guestsText(f), 'event ' + when(f.start, f.date)].filter(Boolean).join(' · ');
    if (kind === 'off') {
      var rm = f.status === 'removed';
      return '<section class="hm-paper fn-hu is-off" aria-labelledby="fn-hu-h"><div class="hm-ph"><h3 class="hm-pt" id="fn-hu-h">Function this week</h3><span class="fn-tag fn-t-off">' + (rm ? 'Removed' : 'Cancelled') + '</span></div>' +
        '<p class="fn-hu-when">' + esc(dayName(f.date)) + '</p><p class="fn-hu-name"><s>' + esc(f.name) + '</s></p>' +
        '<p class="fn-hu-sub"><b>' + (rm ? 'Removed from the bookings.' : 'Cancelled.') + '</b> Do not prep or order for it.' + (rm ? '' : ' Its platters are off the prep and order lists.') + '</p>' +
        '<div class="fn-hu-act">' + huGotBtn([f.id], 'off', f.name + (rm ? ' is removed' : ' is cancelled'), true) + (rm ? '' : huOpenB(f)) + '</div></section>';
    }
    var c0 = (f.chg || [])[0], chgAt = c0 && c0.at > (c.since || 0) ? c0.at : 0;
    var tag = c.back ? '<span class="fn-tag fn-t-new">Back on</span>' : c.chg ? '<span class="fn-tag fn-t-new">Changed' + (chgAt ? ' ' + esc(kclock(chgAt)) : '') + '</span>' :
      kind === 'tom' ? '<span class="fn-tag fn-t-tom">Tomorrow</span>' : p.total > 1 ? '<span class="fn-hu-n">' + p.total + ' this week</span>' : '';
    var facts = '<dl class="fn-hu-facts"><div><dt>Food out</dt><dd>' + esc(huFood(f)) + '</dd></div><div><dt>Platters</dt><dd>' + huPlatters(f) + '</dd></div><div><dt>Notes</dt><dd>' + huNotes(f) + '</dd></div></dl>';
    var other = kind === 'week' && p.also ? huFn(p.also) : null;
    return '<section class="hm-paper fn-hu' + (kind === 'tom' ? ' is-tom' : '') + '" aria-labelledby="fn-hu-h"><div class="hm-ph"><h3 class="hm-pt" id="fn-hu-h">' + (kind === 'tom' ? 'Function tomorrow' : 'Function this week') + '</h3>' + tag + '</div>' +
      '<p class="fn-hu-when">' + esc(dayName(f.date)) + ' · ' + huDays(f, t) + '</p><p class="fn-hu-name">' + esc(f.name) + '</p><p class="fn-hu-sub">' + esc(sub) + '</p>' + facts +
      '<div class="fn-hu-act">' + huGotBtn([f.id], kind, f.name) + huOpenB(f) + '</div>' +
      (other ? '<p class="fn-hu-also">Also this week: <b>' + esc(dayName(other.date)) + '</b> ' + (huGone(other) ? '<s>' + esc(other.name) + '</s>' : esc(other.name)) + '</p>' : '') +
      '<p class="fn-hu-foot">' + (kind === 'tom' ? 'Everyone sees this once, the day before. Your chefs see who has said Got it.' : 'Got it hides it for you until the day before. Your chefs see who has.') + '</p></section>';
  }
  // the Next function line on Home: the work pages' line on a quiet card, no minus; it says "Got it" with Undo after one
  function huLineHTML(f, t) {
    var tom = addDays(kday(t), 1), end = addDays(kday(t), AH_DAYS), ack = HU.ack && HU.ack.line === f.id;
    var d = function (s) { return '<span class="fn-ahead-d"> · ' + esc(s) + '</span>'; };
    var s, dd = '', pre = '', nm = '<b class="fn-ahead-n">' + esc(f.name) + '</b>', x = '', aria;
    var stale = !huGone(f) && (F.offline || navigator.onLine === false || F.state === 'error') && F.at;
    if (huGone(f)) {
      var word = f.status === 'removed' ? 'Removed' : 'Cancelled';
      s = '<span class="fn-tag fn-t-off">' + word + '</span>'; dd = d(dayName(f.date)); pre = '<span class="fn-ahead-p fn-ahead-stop">Do not prep: </span>'; nm = '<b class="fn-ahead-n"><s>' + esc(f.name) + '</s></b>';
      aria = word + ': ' + f.name + ', ' + dayName(f.date) + '. Do not prep.' + (f.status === 'removed' ? '' : ' Open the function');
    } else if (stale) {
      var w2 = F.state === 'error' ? 'Not updated' : 'No signal', upd = (kday(F.at) === kday(t) ? '' : dayName(kday(F.at)) + ' ') + kclock(F.at);
      s = '<span class="fn-ahead-k is-pending">' + w2 + '</span>'; dd = d('updated ' + upd); x = ' · ' + esc(dayName(f.date));
      aria = w2 + '. Functions last updated ' + upd + '. Next function: ' + f.name + ', ' + dayName(f.date) + '. Open the function';
    } else if (f.date === tom) {
      s = '<span class="fn-tag fn-t-tom">Tomorrow</span>'; dd = d(dayName(f.date)); x = ' · ' + (f.first ? 'food ' + esc(kclock(f.first)) : 'times TBC');
      aria = 'Tomorrow: ' + f.name + ', ' + dayName(f.date) + (f.first ? ', food ' + kclock(f.first) : ', times TBC') + '. Open the function';
    } else {
      s = '<span class="fn-ahead-k">Next function</span>'; dd = d(dayName(f.date)); x = ' · ' + esc(guestsText(f));
      aria = 'Next function: ' + f.name + ', ' + dayName(f.date) + ', ' + guestsText(f) + '. Open the function';
    }
    // row 1 says what Got it did, with Undo beside the line, for 9 seconds; the same two rows, so nothing below moves
    if (ack) { s = '<span class="fn-ahead-ack">Got it. Kept here as one line.</span>'; dd = ''; }
    var more = F.list.filter(function (g) { return g.id !== f.id && g.status === 'confirmed' && isYmd(g.date) && g.date >= tom && g.date <= end; }).length;
    var b = f.status === 'removed' ? '<span class="fn-ahead-b" aria-label="' + esc(aria) + '">' : '<button type="button" class="fn-ahead-b" data-fn="open" data-id="' + esc(f.id) + '" aria-haspopup="dialog" aria-label="' + esc(aria) + '">';
    return '<section class="hm-paper fn-hm-line" aria-label="Next function"><div class="fn-ahead' + (huGone(f) ? ' is-cancelled' : '') + (ack ? ' is-ack' : '') + '">' + b +
      '<span class="fn-ahead-tx"><span class="fn-ahead-l"><span class="fn-ahead-s">' + s + '</span>' + dd + '</span><span class="fn-ahead-t"><span class="fn-ahead-nm">' + pre + nm + '</span>' + (x ? '<span class="fn-ahead-x">' + x + '</span>' : '') + '</span></span>' +
      (f.status === 'removed' ? '</span>' : AH_CHEV + '</button>') +
      (ack ? '<button type="button" class="fn-hu-undo" data-fn="hu-undo">Undo</button>' :
        more ? '<a class="fn-ahead-more" href="#/fn" aria-label="+' + more + ' more this week: open Functions, the next ' + AH_DAYS + ' days"><span class="fn-ahead-m1">+' + more + ' more</span> <span class="fn-ahead-m2">this week</span></a>' : '') +
      '</div></section>';
  }
  function huHTML() {
    var p = HU.plan; if (!p || !huOK()) return '';
    var t = now(), lf = p.line ? huFn(p.line) : null, out = '';
    if (lf) out += huLineHTML(lf, t);
    if (p.card) out += huCardHTML(p.card, t);
    return out;
  }
  // Got it: this person's mark for each function on the card, with what the card showed (huSig())
  function huGot(el) {
    if (Date.now() - HU.shown < 600) return;   // a card that has just come up under the finger ignores a double tap
    var ids = String(el.getAttribute('data-ids') || '').split(',').filter(Boolean), s = el.getAttribute('data-s');
    if (!ids.length || ['week', 'tom', 'off'].indexOf(s) < 0) return;
    var m = huGet(), prev = {}, t = now();
    ids.forEach(function (id) { var f = huFn(id); prev[id] = m[id] || null; m[id] = { s: s, g: f ? huSig(f) : '', d: f ? f.date : '', t: t }; });
    huPut(m);
    var first = huFn(ids[0]);
    // the card folds into the line in its place, naming the function it was about (a cancelled one says Cancelled)
    var ack = HU.ack = { line: ids[0], prev: prev };
    huSync();   // an earlier Got it whose Undo this one replaced goes to the chefs now
    HU.plan = huPlan(t, first ? ids[0] : null);
    if (HU.plan.line !== ids[0]) ack.line = '';
    if (HU.plan.card) HU.shown = Date.now();
    paint();
    huSay('Got it: ' + (ids.length > 1 ? 'all ' + ids.length + ' functions this week' : first ? first.name : 'the function') + '. It stays on Home as one line.');
    // after 9 s the line says Next function again and names the nearest one (the same two rows: words only); the focus,
    // if it was on Undo, moves to the line
    setTimeout(function () {
      if (HU.ack !== ack) { huSync(); return; }
      var had = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('fn-hu-undo');
      HU.ack = null; if (HU.plan) HU.plan.line = huPlan(now()).line || HU.plan.line; paint(); huSync();
      if (had) { var lb = document.querySelector('#fn-hm .fn-ahead-b'); if (lb && lb.focus) lb.focus({ preventScroll: true }); }
    }, 9000);
    var u = document.querySelector('#fn-hm .fn-hu-undo'); if (u) u.focus({ preventScroll: true });
    // the next card's Got it never sits under the tab bar (large text, focused review); from 720 px there is no tab bar
    var nb = document.querySelector('#fn-hm .fn-hu-got'), tb = document.querySelector('.tabbar');
    var limit = tb && getComputedStyle(tb).display !== 'none' ? tb.getBoundingClientRect().top : window.innerHeight;
    if (nb) { var r = nb.getBoundingClientRect(); if (r.bottom > limit - 8) window.scrollBy(0, Math.ceil(r.bottom - limit + 16)); }
  }
  function huUndo() {
    var a = HU.ack; if (!a) return;
    var m = huGet(); Object.keys(a.prev).forEach(function (id) { if (a.prev[id]) m[id] = a.prev[id]; else delete m[id]; }); huPut(m);
    HU.ack = null;
    HU.plan = huPlan(now()); HU.shown = Date.now(); paint();
    huSay('Undone. The card is back.');
    var g = document.querySelector('#fn-hm .fn-hu-got'); if (g) g.focus({ preventScroll: true });
  }
  /* Got it reaches the chefs (head chef, 10 Nov 2026; brief step 4): each of this person's marks goes to
     fnseen/<function id>_<staff id>_<card>_<g> once, after its Undo has gone (the 9 seconds, another Got it or the next
     open of Home), so an Undo writes nothing. Marks made before this change go at the next open. One small write per
     Got it, never a read. Only with a signal and the functions list from the server: a receipt waiting with no signal
     would hold Sign out and the 04:00 refresh for nothing. A later Got it to the same card and version moves the
     record's time forward (the rules allow that one change). A refusal is not taken as sent: the rules may not be
     published yet, or the session was reset. The mark counts it (n) and tries again at a later load of the book; after
     5 refusals it stops (w: 2; another phone may hold a newer record). The mark keeps w: 1 once it is in. */
  var huSending = {};
  function huSync() {
    var prep = P(), api = prep && prep.book && prep.book();
    if (!api || !huOK() || F.state !== 'ok' || F.offline || navigator.onLine === false) return;
    var me = api.who(), ctx = api.writeContext ? api.writeContext() : null;
    if (!me || ahWho() !== me || !ctx || ctx.by !== me) return;
    var key = huKey(), m = huGet(), wait = HU.ack ? HU.ack.prev : {};
    Object.keys(m).forEach(function (id) {
      var r = m[id];
      if (!r || r.w || Object.prototype.hasOwnProperty.call(wait, id) || ['week', 'tom', 'off'].indexOf(r.s) < 0) return;
      if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id) || !/^[0-9a-z]{1,24}$/.test(String(r.g || ''))) return;
      var sid = id + '_' + me + '_' + r.s + '_' + r.g; if (huSending[sid]) return;
      huSending[sid] = 1;
      var at = typeof r.t === 'number' && r.t > 0 && r.t <= now() ? Math.round(r.t) : Math.round(now());
      var rec = { fid: id, g: r.g, s: r.s, day: kday(at), at: at };
      var done = function (refused) {
        if (huKey() !== key) return;   // the phone has someone else on it now: their marks are their own
        var m2 = huGet(), x = m2[id];
        if (!x || x.s !== r.s || x.g !== r.g || x.w) return;
        if (!refused) x.w = 1; else { x.n = (+x.n || 0) + 1; if (x.n >= 5) x.w = 2; }
        huPut(m2);
      };
      // a refused one waits for the next load of the book (huSending stays set in this one): no retry loop
      api.ready().then(function () { return api.W([['set', api.docRef('fnseen', sid), rec]]); })
        .then(function () { done(false); }, function (e) { if (e && e.code === 'permission-denied') done(true); else delete huSending[sid]; });
    });
  }
  // js/app.js draws the empty slot under the top bar; this fills it, and refills it when anything changes
  var lastBand = null;
  function paint() {
    var el = document.getElementById('fn-band');
    if (el) {
      // compared with what this element was given (el.lkH), not its innerHTML: the browser writes text back differently
      // (a no-break space as &nbsp;), so that never matched and the slot was rebuilt every 20 seconds, losing focus
      var h = bandHTML(); if (h !== lastBand || el.lkH !== h) { el.innerHTML = h; lastBand = h; el.lkH = h; } el.hidden = !h; fitFold();
      el.classList.toggle('is-ahead', AH.on); el.setAttribute('aria-label', AH.on ? 'Next function' : 'Functions');
    }
    strip();
    // Home's Function this week slot: drawn again only when its words change (el.lkH)
    var hu = document.getElementById('fn-hm'); if (hu) { var uh = huHTML(); if (hu.lkH !== uh) { hu.innerHTML = uh; hu.lkH = uh; } hu.hidden = !uh; }
    var lc = document.getElementById('fn-land');
    landHome = !!document.getElementById('hm-board');
    if (window.LK_PREP && window.LK_PREP.homePaint) window.LK_PREP.homePaint();
    if (lc) { var lh = landHTML(); if (lc.innerHTML !== lh) lc.innerHTML = lh; lc.hidden = !lh; }
    var ck = document.getElementById('fn-check');
    if (ck) { var ch = checkHTML(); if (ck.innerHTML !== ch) ck.innerHTML = ch; ck.hidden = !ch; }
    if (sheetId) { var f = byId(sheetId); var body = sheetEl && sheetEl.querySelector('.fn-sheet-body'); if (body && f) body.innerHTML = sheetHTML(f, true); }
  }
  /* The strip (22 Oct 2026): once the band has scrolled off the top, one line stays pinned to the top of the screen
     with today's next function and what goes out next; a tap opens its sheet. It is appended to document.body (a page
     redraw does not remove it). Bars that already stick to the top (search, signal, update, admin nav) move down by its
     height through --fn-stick. */
  var stripEl = null, stripH = 0, padH = -1;
  function strip() {
    var band = document.getElementById('fn-band'), t = now(), xs = showing(F.list, t, isSentK).filter(function (x) { return x.kind !== 'moved'; });
    // --fn-pad: room at the top for the strip while it could show, so a jump (a recipe's Ingredients chip) lands below it
    setPad(!!band && !band.hidden && xs.length ? stripH || 46 : 0);
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
  function setPad(px) { if (px === padH) return; padH = px; document.documentElement.style.setProperty('--fn-pad', px + 'px'); }
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
        (tick ? '<span class="fn-sent">' + sentCell(f, i) + '</span>' + tripsList(f, i) : '') + '</li>';
    }).join('') + '</ol>';
  }
  // a round's trips on the sheet (14 Nov 2026): what went, who sent it when, and whether Functions has it
  function tripsList(f, i) {
    var st = roundState(f, i), t = now();
    if (!st || !st.trips.length) return '';
    return '<ul class="fn-round-trips">' + st.trips.map(function (x) {
      var said = F.pend[x.id] ? '<span class="fn-ws is-pend">' + I_CLOCK + ' Not sent yet</span>' : x.outAt ? '<span class="fn-trip-out">' + I_TICKS + ' out ' + esc(kclock(x.outAt)) + ', ' + esc(x.outFor ? 'confirmed by ' + nameOf(x.outBy) + ' for Functions' : nameOf(x.outBy)) + '</span>' : waitPill(f, x, t);
      return '<li><span class="fn-trip-k">Trip ' + x.k + '</span> ' + esc(tripText(f, x.n)) + ' · sent ' + esc(kclock(x.sentAt)) + ', ' + esc(nameOf(x.sentBy)) + ' ' + said + '</li>';
    }).join('') + '</ul>';
  }
  // a round's Sent cell: who sent it when (with Undo for a mis-tap: the sender within 2 minutes, or a sous chef or the
  // head chef, the rules say the same), or how much went and a button that sends all that is left as one trip
  function sentCell(f, i) {
    var x = sentRec(f, i), st = roundState(f, i), me = ahWho(), d = ' data-id="' + esc(f.id) + '" data-r="' + i + '"';
    if (x) {
      var undo = '', last = st && st.trips.length ? st.trips[st.trips.length - 1] : null;
      if (last && !last.outAt && !F.pend[last.id] && (isChef() || last.sentBy === me && now() - last.sentAt < 2 * MIN)) undo = '<button type="button" class="linkish fn-svc-link" data-fn="trip-undo" data-id="' + esc(last.id) + '">Undo</button>';
      else if (!last && (isChef() || me && x.sentBy === me && now() - x.sentAt < 2 * MIN)) undo = '<button type="button" class="linkish" data-fn="unsent"' + d + '>Undo</button>';
      return '<span class="fn-sent-ok">' + esc(kclock(x.sentAt)) + '<small>' + esc(nameOf(x.sentBy)) + '</small></span>' + undo;
    }
    var part = st && st.sentTot ? '<span class="fn-sent-part">' + st.sentTot + ' of ' + st.bookedTot + ' sent</span>' : '';
    if (!canSend()) return part || '<span class="fn-sent-part">Not sent yet</span>';
    var lab = st && st.sentTot ? 'Send ' + st.leftTot + ' left' : 'Send all' + (st ? ' ' + st.leftTot : '');
    return part + '<button type="button" class="btn fn-sent-b" data-fn="send" data-v="all"' + d + ' aria-label="Round ' + (i + 1) + ': ' + esc(lab) + '">' + esc(lab) + '</button>';
  }
  // the older Sent tick, still read for rounds an older phone ticked: taking it back (Undo on the sheet)
  function tickSent(id, i, on) {
    var f = byId(id), prep = P(); if (!f || !prep) return;
    var r = f.rounds[i], api = prep.book(), me = api.who();
    if (!me && !(prep.state && prep.state.user)) { sheetClose(false, true); prep.signIn(location.hash || '#/'); return; }   // who is ticking: sign in first
    var x = F.sent[f.id + '_' + r.at], rec = on ? { fid: f.id, at: r.at, day: kday(r.at), sent: true, sentAt: now(), sentBy: me } : { fid: f.id, at: r.at, day: kday(r.at), sent: false, sentAt: x.sentAt, sentBy: x.sentBy };
    F.sent[f.id + '_' + r.at] = rec; F.sv++; changed();   // shows at once; the listener brings the saved copy
    api.ready().then(function () { return api.W([['set', api.docRef('fnsent', f.id + '_' + r.at), rec, true]]); }).then(function () {
      api.say((f.rounds.length > 1 ? 'Round ' + (i + 1) : 'The platters') + (on ? ' ticked as sent.' : ' not sent after all.'));
    }, function () {
      if (x) F.sent[f.id + '_' + r.at] = x; else delete F.sent[f.id + '_' + r.at]; F.sv++; changed();
      // the tick went back: say why on screen too, not only to a screen reader (5 Nov 2026, the audit found nothing showed)
      var why = on ? 'Not saved: ' + (f.rounds.length > 1 ? 'round ' + (i + 1) : 'the platters') + ' not ticked as sent. Check the signal and try again.' : 'Not saved. Only the person who ticked it, within 2 minutes, or a chef can take a tick back.';
      if (prep.toast) prep.toast(why, { label: 'OK', fn: function () {} }, 0, 'bad'); else api.say(why);
    });
  }

  /* ---------- sending a trip, confirming it, taking it back (14 Nov 2026) ----------
     Each shows at once and says Not sent yet until the server answers (F.pend); a refusal puts it back and says why in
     red, and a refused send keeps the picks. One button press is one trip: for 1.5 seconds after a press, and while it
     waits, the round's Send button rests ("Sending trip 3..."), so a double tap never sends a second trip. */
  var I_TICK = '<svg class="fn-i" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var I_TICKS = '<svg class="fn-i" width="22" height="16" viewBox="0 0 30 24" aria-hidden="true"><path d="M2 12.5l5 5L18 6.5M12 17.5L23 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var I_WAIT = '<svg class="fn-i" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  var I_CLOCK = '<svg class="fn-i" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  var I_BANG = '<svg class="fn-i" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v6M12 16.5v.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var I_BOX = '<svg class="fn-i" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
  // a waiting trip's state, in words beside its icon: Not sent yet (this phone's write), Waiting, Waiting N min (10 or
  // more: named attention), Not confirmed (the function's window is over)
  function waitPill(f, x, t) {
    if (F.pend[x.id]) return '<span class="fn-ws is-pend">' + I_CLOCK + ' Not sent yet</span>';
    if (f.until && t >= f.until) return '<span class="fn-ws is-never">' + I_BANG + ' Not confirmed</span>';
    var m = Math.floor((t - x.sentAt) / MIN);
    return m >= 10 ? '<span class="fn-ws is-long">' + I_WAIT + ' Waiting ' + m + ' min</span>' : '<span class="fn-ws">' + I_WAIT + ' Waiting</span>';
  }
  function bad(prep, api, why) { if (prep.toast) prep.toast(why, { label: 'OK', fn: function () {} }, 0, 'bad'); else api.say(why); }
  var SEND = {};   // a round's Send at rest after a press: SEND['<fid>_<round time>'] = { k, at }
  // resting for 1.5 seconds after a press (a double tap lands here), unless that trip was taken back; a trip still
  // waiting for the signal says Not sent yet on the shelf and never holds the round's button longer
  function sendBusy(key) { var b = SEND[key], x = b && F.sent[key + '_t' + b.k]; return !!b && now() - b.at < 1500 && !(x && x.void); }
  function sendRest(key) { var b = SEND[key]; return F.pend[key + '_t' + b.k] ? 'Sending trip ' + b.k + '...' : 'Sent trip ' + b.k; }
  // all: the sheet's Send (everything left); otherwise the picks on the service view, or everything left with none
  function sendTrip(fid, i, all) {
    var f = byId(fid), prep = P(); if (!f || !prep) return;
    var r = (f.rounds || [])[i], api = prep.book(), me = api.who();
    if (!me && !(prep.state && prep.state.user)) { sheetClose(false, true); prep.signIn(location.hash || '#/'); return; }
    if (!r || !r.at || !canSend()) return;
    var key = f.id + '_' + r.at, st = roundState(f, i);
    if (!st || st.all || sendBusy(key)) return;
    var pk = all ? {} : pickOf(f, i, st), picked = Object.keys(pk).length > 0, n = {}, q = 0;
    (f.lines || []).forEach(function (l, j) { var v = picked ? (pk[l.rid] || 0) : st.left[j]; if (v > 0) { n[l.rid] = v; q += v; } });
    if (!q) return;
    var k = st.nextK, id = key + '_t' + k, t = now(), rec = { fid: f.id, at: r.at, day: kday(r.at), k: k, n: n, sentAt: t, sentBy: me };
    var done = (f.lines || []).every(function (l, j) { return st.left[j] - (n[l.rid] || 0) <= 0; }), whole = done && !st.sentTot;
    var leg = F.sent[key], legRec = done && !(leg && leg.sent) ? { fid: f.id, at: r.at, day: kday(r.at), sent: true, sentAt: t, sentBy: me } : null;
    var ops = [['set', api.docRef('fnsent', id), rec]];
    if (legRec) ops.push(['set', api.docRef('fnsent', key), legRec, true]);   // the round's own Sent: older phones read only this
    var keep = PK.r[key]; delete PK.r[key]; delete PK.note[key];
    F.sent[id] = rec; if (legRec) F.sent[key] = Object.assign({}, leg || {}, legRec); F.pend[id] = true; F.sv++;
    SEND[key] = { k: k, at: t }; setTimeout(changed, 1600);
    changed();
    var lead = f.rounds.length > 1 ? 'Round ' + (i + 1) : 'The platters', what = tripText(f, n);
    api.ready().then(function () { return api.W(ops); }).then(function () {
      delete F.pend[id]; F.sv++; changed();
      api.say(whole ? lead + ' ticked as sent. Waiting for Functions to confirm.' : 'Trip ' + k + ' sent: ' + what + '. Waiting for Functions to confirm.');
    }, function (e) {
      delete F.pend[id]; delete SEND[key];   // the answer came: a retry is a new press, not a double tap
      if (F.sent[id] === rec) delete F.sent[id];
      if (legRec) { if (leg) F.sent[key] = leg; else delete F.sent[key]; }
      if (keep && !PK.r[key]) PK.r[key] = keep;
      F.sv++; changed();
      var refused = e && e.code === 'permission-denied';
      bad(prep, api, refused ? 'Not saved: trip ' + k + ' (' + what + ') was not sent. Someone may have sent trip ' + k + ' first. ' + (keep ? 'Your picks are kept: check what is left and send again.' : 'Check what is left and send again.') :
        'Not saved: ' + (whole ? lead.toLowerCase() + ' not ticked as sent' : 'trip ' + k + ' (' + what + ') not sent') + '. Check the signal and try again.');
    });
  }
  // Functions confirms a trip (forFn: a head or sous chef, for Functions, 10 minutes after it was sent)
  function tripOut(id, forFn) {
    var prep = P(), api = prep && prep.book(), x = F.sent[id], t0 = tripRec(id, x), f = t0 && byId(t0.fid);
    if (!api || !t0 || !f || t0.outAt || t0.void || F.pend[id]) return;
    var me = api.who();
    if (!me) { prep.signIn(location.hash || '#/'); return; }
    var up = { outAt: now(), outBy: me, outFor: !!forFn }, what = f.name + ' trip ' + t0.k + ' (' + tripText(f, t0.n) + ')';
    F.sent[id] = Object.assign({}, x, up); F.pend[id] = true; F.sv++; changed();
    api.ready().then(function () { return api.W([['set', api.docRef('fnsent', id), up, true]]); }).then(function () {
      delete F.pend[id]; F.sv++; changed();
      api.say('Confirmed out: ' + what + '.');
    }, function (e) {
      delete F.pend[id]; F.sent[id] = x; F.sv++; changed();
      bad(prep, api, 'Not saved: ' + what + ' not confirmed. ' + (e && e.code === 'permission-denied' ? 'It may have been confirmed or taken back already.' : 'Check the signal and try again.'));
    });
  }
  // Undo a trip still waiting (the sender within 2 minutes, or a head or sous chef). If it ticked its round's own Sent
  // and the round is no longer all sent, that tick goes back in the same write.
  function tripUndo(id) {
    var prep = P(), api = prep && prep.book(), x = F.sent[id], t0 = tripRec(id, x), f = t0 && byId(t0.fid);
    if (!api || !t0 || !f || t0.outAt || t0.void || F.pend[id]) return;
    var me = api.who(); if (!me) { prep.signIn(location.hash || '#/'); return; }
    var key = t0.fid + '_' + t0.at, leg = F.sent[key], i = (f.rounds || []).map(function (r) { return r.at; }).indexOf(t0.at), st = i >= 0 ? roundState(f, i) : null;
    var stillAll = st && (f.lines || []).every(function (l, j) { return st.sent[j] - (t0.n[l.rid] || 0) >= st.booked[j]; });
    var t = now(), up = { void: true, voidAt: t, voidBy: me }, ops = [['set', api.docRef('fnsent', id), up, true]];
    var legBack = leg && leg.sent && !stillAll ? { fid: t0.fid, at: t0.at, day: kday(t0.at), sent: false, sentAt: leg.sentAt, sentBy: leg.sentBy } : null;
    if (legBack) ops.push(['set', api.docRef('fnsent', key), legBack, true]);
    F.sent[id] = Object.assign({}, x, up); if (legBack) F.sent[key] = Object.assign({}, leg, legBack); F.pend[id] = true; F.sv++; changed();
    var what = 'trip ' + t0.k + ' of ' + f.name + ' (' + tripText(f, t0.n) + ')';
    if (SEND[key] && SEND[key].k === t0.k) delete SEND[key];
    api.ready().then(function () { return api.W(ops); }).then(function () {
      delete F.pend[id]; F.sv++; changed();
      if (prep.toast) prep.toast('Undone: ' + what + '. It is to send again.'); else api.say('Undone: ' + what + '.');
    }, function () {
      delete F.pend[id]; F.sent[id] = x; if (legBack) F.sent[key] = leg; F.sv++; changed();
      bad(prep, api, 'Not saved: ' + what + ' not taken back. Only the sender within 2 minutes, or a chef, can take a trip back, and not once Functions has it.');
    });
  }

  /* ---------- the picks: what goes in the next trip, on the service view (14 Nov 2026) ----------
     Held in this page's memory only, per person: a tap on a kind picks all that is left of it, − takes one off, a big
     count can be typed. Never saved until Send. Each redraw cuts them to what is still left (another phone sent some)
     and says so; leaving the service view, a different person, the daily lock or a handover clears them. */
  var PK = { who: '', r: {}, note: {} };
  function pickOf(f, i, st) {
    if (PK.who !== ahWho()) PK = { who: ahWho(), r: {}, note: {} };
    var r = (f.rounds || [])[i], key = r && f.id + '_' + r.at, pk = key && PK.r[key];
    if (!pk) return {};
    var out = {}, cut = false;
    (f.lines || []).forEach(function (l, j) { var v = pk[l.rid] || 0; if (!v) return; var m = Math.min(v, st ? st.left[j] : v); if (m < v) cut = true; if (m > 0) out[l.rid] = m; });
    if (cut) PK.note[key] = 'Some of the picks were sent from another phone.';
    if (Object.keys(out).length) PK.r[key] = out; else delete PK.r[key];
    return out;
  }
  function pickSet(fid, i, rid, v) {
    var f = byId(fid), r = f && (f.rounds || [])[i]; if (!r) return;
    var key = f.id + '_' + r.at, st = roundState(f, i), j = (f.lines || []).map(function (l) { return l.rid; }).indexOf(rid);
    if (!st || j < 0) return;
    if (PK.who !== ahWho()) PK = { who: ahWho(), r: {}, note: {} };
    var pk = PK.r[key] = PK.r[key] || {};
    v = Math.max(0, Math.min(st.left[j], Math.floor(+v) || 0));
    if (v) pk[rid] = v; else delete pk[rid];
    if (!Object.keys(pk).length) { delete PK.r[key]; delete PK.note[key]; }
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
    var r = f.rounds[k], late = tick && r.at < t, st = tick ? roundState(f, k) : null, rc = st ? st.left : roundCounts(f, k), q = sum(rc);
    var head = (f.mode === 'all' ? 'All at ' : '') + when(r.at, f.date) + (n > 1 ? ' · round ' + (k + 1) + ' of ' + n : '');
    var part = st && st.sentTot ? st.sentTot + ' of ' + st.bookedTot + ' sent in ' + st.trips.length + (st.trips.length === 1 ? ' trip' : ' trips') + ', ' + q + ' left' : '';
    var sub = (late ? '<span class="fn-late">Due ' + esc(when(r.at, f.date)) + ', not sent yet</span> · ' : '') + (part || q + ' ' + (q === 1 ? 'platter' : 'platters') + (n > 1 ? ' of ' + tot : '')) + (r.note ? ' · ' + esc(r.note) : '');
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
  // the day a moved function was on: its saved date first, since a start and food time still TBC are 0 (never 1 Jan 1970)
  function wasDay(f) { var w = f.was || {}, ms = w.start || w.first; return isYmd(w.date) ? dayName(w.date) : ms ? dayName(kday(ms)) : ''; }
  // bare: leave out the sheet's own buttons (Print, Change this function, Cancel), for the form's Check before confirming
  function sheetHTML(f, inPop, bare) {
    var t = now(), c = f.chg || [];
    var status = f.status === 'cancelled' ? '<p class="fn-banner is-off" role="note"><b>Cancelled.</b> Do not send these platters.' + (f.canAt ? ' Cancelled by ' + esc(nameOf(f.canBy)) + ', ' + esc(dayName(kday(f.canAt)) + ' ' + kclock(f.canAt)) + '.' : '') + '</p>' :
      f.was && f.was.until && f.was.from <= t && t < f.was.until && !(f.from <= t && t < f.until) ? '<p class="fn-banner is-moved" role="note"><b>Rescheduled.</b> Not on ' + esc(wasDay(f) || 'its old day') + ' any more: now ' + esc(dayName(f.date)) + '.</p>' :
      f.status === 'draft' ? '<p class="fn-banner" role="note"><b>Draft.</b> Not confirmed yet: the kitchen does not see it.</p>' : '';
    // one quiet line for the day, the place, the event start and the guests (10 Nov 2026); then what goes out next, every round, the comment
    var sub = [dayName(f.date), f.loc, 'event ' + when(f.start, f.date), guestsText(f)].filter(Boolean).join(' · ');
    var out = status + '<p class="fn-sub">' + esc(sub) + '</p>' + nextHTML(f) + wholeHTML(f) +
      ((f.rounds || []).length > 1 || f.status !== 'confirmed' ? '<h3 class="fn-h">Every round</h3>' + roundsList(f) +
        (f.status === 'confirmed' && f.first ? '<p class="hint fn-note">Tick each round as it goes out.</p>' : '') : '');
    if (f.kc) out += '<section class="fn-kc" aria-labelledby="fn-kc-' + esc(f.id) + '"><h3 class="fn-h" id="fn-kc-' + esc(f.id) + '">Kitchen comment</h3><p class="fn-text">' + esc(f.kc) + '</p>' +
      '<p class="fn-by">' + esc(nameOf(f.kcBy)) + ', ' + esc(dayName(kday(f.kcAt)) + ' ' + kclock(f.kcAt)) + '</p></section>';
    if (f.notes) out += '<h3 class="fn-h">Service and dietary notes</h3><p class="fn-text">' + esc(f.notes) + '</p>';
    if (c.length) out += '<h3 class="fn-h">Changes</h3><ul class="fn-chg">' + c.slice(0, 5).map(function (x) { return '<li><span>' + esc(dayName(kday(x.at)) + ' ' + kclock(x.at)) + ', ' + esc(nameOf(x.by)) + '</span> ' + esc(x.what) + '</li>'; }).join('') + '</ul>';
    out += '<p class="fn-by fn-last">Last changed by ' + esc(nameOf(f.by)) + ', ' + esc(dayName(kday(f.upd)) + ' ' + kclock(f.upd)) + '.</p>';
    if (bare) return out;
    var can = P() && P().fnOK && P().fnOK();
    out += '<div class="btn-row fn-acts"><button type="button" class="btn" data-fn="print" data-id="' + esc(f.id) + '">Print function</button>' +
      (inPop ? '<a class="btn dark" href="#/fn/' + encodeURIComponent(f.id) + '" data-fn="go">Open the full sheet</a>' : '') +
      (can ? '<a class="btn" href="#/functions/' + encodeURIComponent(f.id) + '"' + (inPop ? ' data-fn="go"' : '') + '>Change this function</a>' : '') + '</div>';
    // Cancel at the end of the card, away from Print (head chef, 8 Nov 2026, redesign step 5): the same button, the same
    // people and the same Undo (docs/function-cancellation.md), with one line on what it does
    var st = statusHTML(f);
    if (st) out += '<div class="fn-end">' + st + '<span class="fn-end-s">' + (f.status === 'cancelled' ? 'Undo puts the function back, with its prep and order lines.' : 'Takes its platters off the prep and order lists. Nothing is deleted.') + '</span></div>';
    return out;
  }

  /* The platters on the prep list (22 Oct 2026): a confirmed function puts one prep line per platter on its day, under the
     section Functions, linked to the recipe card: "Pizza Platter: Smith 50th, from 18:30", "5 platters". The line id is
     fn-<function>-<platter>, so a second save changes the same line instead of adding another. Only a line that is new or
     changed is written, so a line the kitchen removed stays removed until the booking changes. A cancelled function, a
     platter taken off, or a function moved to another day removes its old lines. Ticks are never touched (done is never
     sent), lines never roll over and never merge with the kitchen's own lines (fn, dupOk). */
  function prepOps(api, prev, f, id, t) {
    var fs = api.fs(), ops = [], who = P().whoName() || 'Head chef';
    function ref(day, rid) { return fs.doc(api.db(), 'kitchens', api.pin(), 'days', day, 'items', ('fn-' + id + '-' + rid).slice(0, 120)); }
    function line(g, l) { return M.prepBody(g, l, id); }
    var had = {}, want = {};
    if (prev && prev.status === 'confirmed' && M.isYmd(prev.date)) (prev.lines || []).forEach(function (l) { had[prev.date + '|' + l.rid] = line(prev, l); });
    if (f.status === 'confirmed' && M.isYmd(f.date)) f.lines.forEach(function (l) { want[f.date + '|' + l.rid] = line(f, l); });
    Object.keys(had).forEach(function (k) {
      if (want[k]) return;
      var p = k.split('|');
      ops.push(['set', ref(p[0], p[1]), Object.assign({}, had[k], { deleted: true, deletedBy: who, deletedAt: t }), true]);
    });
    Object.keys(want).forEach(function (k) {
      var w = want[k], h = had[k], p = k.split('|');
      if (h && h.text === w.text && h.qty === w.qty) return;   // the same as before: leave the kitchen's line alone
      ops.push(['set', ref(p[0], p[1]), Object.assign({}, w, { deleted: false, addedBy: who, addedById: api.who(), addedAt: t }), true]);
    });
    return ops;
  }
  /* The order reminder (22 Oct 2026): a confirmed function puts one line on the order list on its order day (the latest
     Sunday 4 days or more before it, or today when booked later): "Function stock: Smith 50th, Sat 31 Oct: 3 Antipasto,
     4 Aussie, 5 Pizza", "12 platters". It rolls over until someone ticks it ordered, like any order line, and ordered is
     never sent from here. A change before the order day changes the line; a move takes it off the old day; a change or a
     cancel after the order day adds a line today, so whoever ordered can change the order. */
  function orderOps(api, prev, f, id, t, undo) {
    var fs = api.fs(), ops = [], who = P().whoName() || 'Head chef', day = kday(now());
    function ref(d, suffix) { return fs.doc(api.db(), 'kitchens', api.pin(), 'orders', d, 'lines', ('fn-' + id + (suffix || '')).slice(0, 120)); }
    function line(g, pre) { return M.orderBody(g, id, pre); }
    if (undo && f.od && f.od < day) {
      // A past order was never removed by Cancel. Correct its cancellation notice instead of rewriting that history.
      var cancelledDay = kday(prev.canAt);
      if (f.date >= cancelledDay) ops.push(['set', ref(cancelledDay, '-x' + cancelledDay.replace(/-/g, '')), Object.assign({}, line(f, 'Function restored, check the order'), { deleted: true, deletedBy: who, deletedAt: t }), true]);
      if (f.date >= day) ops.push(['set', ref(day, '-r' + day.replace(/-/g, '')), Object.assign({}, line(f, 'Function restored, check the order'), { deleted: false, addedBy: who, addedById: api.who(), addedAt: t }), true]);
      return ops;
    }
    var had = prev && prev.status === 'confirmed' && prev.od ? { day: prev.od, l: line(prev) } : null;
    var want = f.od ? { day: f.od, l: line(f) } : null;
    if (had && (!want || want.day !== had.day) && had.day >= day) ops.push(['set', ref(had.day), Object.assign({}, had.l, { deleted: true, deletedBy: who, deletedAt: t }), true]);
    if (want && !(had && had.day === want.day && had.l.text === want.l.text && had.l.qty === want.l.qty)) {
      var late = had && had.day < day;   // the first line is already in the past (maybe ordered): a new line today says what changed
      ops.push(['set', late ? ref(day, '-' + day.replace(/-/g, '')) : ref(want.day), Object.assign({}, late ? line(f, 'Function stock changed') : want.l, { deleted: false, addedBy: who, addedById: api.who(), addedAt: t }), true]);
    }
    if (had && !want && had.day < day && prev.date >= day) ops.push(['set', ref(day, '-x' + day.replace(/-/g, '')), Object.assign({}, line(prev, 'Function cancelled, check the order'), { deleted: false, addedBy: who, addedById: api.who(), addedAt: t }), true]);
    return ops;
  }

  /* One-tap cancellation (25 Oct 2026). Editing and contacts still need fnOK; chefs get only this status change.
     Cancel reads one latest function on its tap. Undo also reads its immutable preceding history, never contacts. */
  function statusOK() { return !!(P() && P().fnCancelOK && P().fnCancelOK()); }
  function undoOK(f) {
    var api = P() && P().book && P().book(), age = now() - (f.canAt || 0);
    return statusOK() && f.status === 'cancelled' && api && f.canBy === api.who() && f.upd === f.canAt && age >= 0 && age < 2 * MIN;
  }
  function statusHTML(f, scope, compact) {
    if (!f || !f.id || f.removed || !statusOK() || (f.status !== 'confirmed' && !undoOK(f))) return '';
    var undo = f.status === 'cancelled', busy = F.jobs[f.id], kind = scope === 'fe' ? 'fe' : 'fn';
    return '<button type="button" class="btn fn-cancel" data-' + kind + '="status" data-v="' + (undo ? 'undo' : 'cancel') + '" data-id="' + esc(f.id) + '"' +
      (busy ? ' disabled' : '') + ' aria-label="' + esc((undo ? 'Undo cancellation of ' : 'Cancel ') + f.name) + '">' +
      (busy ? (busy.undo ? 'Restoring...' : 'Cancelling...') : undo ? (compact ? 'Undo' : 'Undo cancel') : compact ? 'Cancel' : 'Cancel function') + '</button>';
  }
  function statusPaint(id, saved) {
    if (/^#\/functions(?:\/|$)/.test(location.hash) && window.LK_FE && window.LK_FE.statusChanged) { paint(); window.LK_FE.statusChanged(id, saved); }
    else changed();
  }
  // bad: a failure (5 Nov 2026, docs/action-feedback.md): red, and it stays until OK, never on a timer
  function statusNotice(message, action, bad) {
    var prep = P(); if (!prep) return;
    if (prep.toast) { if (bad) prep.toast(message, { label: 'OK', fn: function () {} }, 0, 'bad'); else prep.toast(message, action || null, action ? 9000 : 5000); }
    else if (prep.book) prep.book().say(message);
  }
  function statusFail(message) { var err = new Error(message); err.fnMessage = message; throw err; }
  function setStatus(view, undo) {
    if (!view || !view.id || view.removed || F.jobs[view.id]) return;
    if (!statusOK()) { statusNotice('Only a chef, function manager or admin can cancel a function.'); return; }
    if (undo ? !undoOK(view) : view.status !== 'confirmed') return;
    var api = P().book(), id = view.id, me = api.who(), label = undo ? 'Restoring' : 'Cancelling';
    F.jobs[id] = { before: view, undo: !!undo }; statusPaint(id);
    var slow = setTimeout(function () { if (F.jobs[id]) statusNotice(label + ' is waiting for the signal.'); }, 5000);
    api.ready().then(function () {
      return api.fromServer(api.docRef('functions', id));
    }).then(function (sn) {
      if (!sn.exists()) statusFail('This function is no longer available. Read the list again.');
      var before = sn.data();
      if (before.v !== view.v || before.status !== view.status) statusFail('This function changed on another device. Read the latest copy before trying again.');
      F.jobs[id].before = Object.assign({ id: id }, before);
      if (!undo) return { before: before };
      // One extra read only on Undo. The rules let only the chefs, the function managers (fnIds) and the head chef's
      // Google account read the history, the same people who may Undo, and it holds no booking contact.
      return api.fromServer(api.fs().doc(api.db(), 'kitchens', api.pin(), 'functions', id, 'hist', String(before.v - 1))).then(function (hist) {
        var old = hist.exists() && hist.data().was;
        if (!old || old.status !== 'confirmed') statusFail('This cancellation has changed. Ask a function manager to confirm the booking again.');
        return { before: before, restore: old };
      });
    }).then(function (state) {
      if (!statusOK() || api.who() !== me) statusFail('Your access changed. The function has not been changed.');
      var before = state.before, f = JSON.parse(JSON.stringify(before)), t = now();
      if (undo && !undoOK(Object.assign({ id: id }, before))) statusFail('Undo is available for two minutes. Ask a function manager to confirm the booking again.');
      f.status = undo ? 'confirmed' : 'cancelled'; f.v = before.v + 1; f.upd = t; f.by = me;
      if (undo) { f.od = state.restore.od || ''; f.kq = state.restore.kq; }
      else { f.canBy = me; f.canAt = t; f.od = ''; }
      var what = undo ? 'Cancellation undone' : 'Cancelled';
      f.chg = [{ at: t, by: me, what: what }].concat((before.chg || []).slice(0, 7));
      var ops = [['set', api.docRef('functions', id), f], ['set', api.fs().doc(api.db(), 'kitchens', api.pin(), 'functions', id, 'hist', String(before.v)), { was: before, at: t, what: what }]];
      return api.W(ops.concat(prepOps(api, before, f, id, t), orderOps(api, before, f, id, t, undo))).then(function () { return Object.assign({ id: id }, f); });
    }).then(function (f) {
      delete F.jobs[id]; clearTimeout(slow);
      F.list = F.list.filter(function (g) { return g.id !== id; });
      if (f.kq >= T.at(T.day(), 0)) F.list.push(f);
      statusPaint(id, f);
      statusNotice((f.name || 'Function') + (undo ? ': cancellation undone.' : ': cancelled. The kitchen is told.'), undo ? null : { label: 'Undo', fn: function () { setStatus(f, true); } });
      if (!undo) setTimeout(function () { statusPaint(id); }, 2 * MIN + 100);
    }).catch(function (err) {
      delete F.jobs[id]; clearTimeout(slow); statusPaint(id);
      statusNotice(err.fnMessage || (err.code === 'permission-denied' ? 'Not changed. Your access or the function changed. Read the list again.' : 'Not changed. Check the signal and try again.'), null, true);
    });
  }

  /* ---------- Layout 2 print copy (25 Oct 2026, head chef approved) ----------
     Built only on a tap from the records already on this device. No reads, writes or new saved copies.
     One function per sheet; a long booking flows onto more pages without shrinking its words. */
  function printDate(d) { return isYmd(d) ? dayName(d) + ' ' + d.slice(0, 4) : 'TBC'; }
  function printStamp(ms) { return ms ? printDate(kday(ms)) + ', ' + kclock(ms) + ' AEST' : 'Not saved'; }
  function printQty(q) { return typeof q === 'number' && isFinite(q) && q >= 0 ? String(q) : 'TBC'; }
  function printField(label, value) { return '<div><dt>' + label + '</dt><dd>' + esc(value || 'TBC') + '</dd></div>'; }
  function printDayList(t, day) {
    var d = day || kday(t);
    return F.list.filter(function (f) {
      return f.status === 'confirmed' && (f.date === d || (f.rounds || []).some(function (r) { return r.at && kday(r.at) === d; }));
    }).sort(function (a, b) { return (a.first || 9e15) - (b.first || 9e15) || String(a.name).localeCompare(String(b.name)); });
  }
  // One daily overview. Count only the rounds on this kitchen day, including rounds already sent.
  function prepCounts(f, day) {
    var counts = (f.lines || []).map(function () { return 0; });
    (f.rounds || []).forEach(function (r, i) {
      if (r.at ? kday(r.at) !== day : f.date !== day) return;
      roundCounts(f, i).forEach(function (q, j) { counts[j] += q; });
    });
    return counts;
  }
  function prepButton(day, t) {
    return '<button type="button" class="btn" data-fn="print-prep" data-day="' + esc(day) + '"' + (!known() || !printDayList(t, day).length ? ' disabled' : '') + '>Print prep sheet</button>';
  }
  function printPrepSheet(list, opts) {
    var cards = catalogue(), totals = {};
    list.forEach(function (f) {
      var a = prepCounts(f, opts.day);
      (f.lines || []).forEach(function (l, i) {
        totals[l.rid] = (totals[l.rid] || 0) + a[i];
        if (!cards.some(function (c) { return c.rid === l.rid; })) cards.push({ rid: l.rid, name: l.name });
      });
    });
    var out = '<article class="fn-prep-paper">';
    if (opts.source) out += '<p class="fn-prep-warning">' + esc(opts.source) + '</p>';
    out += '<div class="fn-prep-cards">';
    out += cards.map(function (c) {
      var r = recipeOf(c.rid), art = window.LK_ART, hasArt = r && art && r.art && (art.plates[r.art] || art.pans[r.art]);
      var drawing = '';
      if (hasArt && window.LK_APP && window.LK_RX) {
        var svg = new DOMParser().parseFromString(window.LK_APP.art(r, 'fn-prep-drawing'), 'image/svg+xml').documentElement;
        var vb = svg.getAttribute('viewBox') || '', body = window.LK_RX.clean(svg.innerHTML);
        if (/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/.test(vb) && body) drawing = '<svg viewBox="' + esc(vb) + '" aria-hidden="true">' + body + '</svg>';
      }
      return '<section class="fn-prep-card"><h2>' + esc(c.name) + '<span>' + (totals[c.rid] || 0) + ' to prep</span></h2>' +
        (drawing ? '<div class="fn-prep-art">' + drawing + '</div>' : '<p>Drawing to come.</p>') +
        (r ? '<table><thead><tr><th scope="col">Ingredient</th><th scope="col">Per platter</th></tr></thead><tbody>' + (r.ingredients || []).map(function (ing) {
          return '<tr><td>' + esc(ing.name) + '</td><td>' + esc(ing.q || 'To come') + '</td></tr>';
        }).join('') + '</tbody></table>' : '<p>Recipe missing from the book. Check before prep.</p>') + '</section>';
    }).join('');
    return out + '</div><footer>' + esc(printDate(opts.day)) + '</footer></article>';
  }
  function printSheet(f, opts, printed) {
    var R = f.rounds || [], L = f.lines || [], draft = f.status !== 'confirmed' || opts.unsaved;
    var status = f.status === 'cancelled' ? 'Cancelled / do not send' : opts.unsaved ? 'Draft / not saved' : draft ? 'Draft / not confirmed' : 'Confirmed';
    var times = R.length <= 3 ? R.map(function (r) { return when(r.at, f.date); }).join(' / ') : when(f.first, f.date) + ' to ' + when(f.last, f.date);
    var out = '<article class="fn-paper"><header class="fn-paper-head"><p class="fn-paper-brand">Leichhardt Hotel</p><h1>' + esc(f.name || 'New function') + '</h1>' +
      '<div class="fn-paper-sub"><span>Function run sheet</span><strong>' + esc(status) + '</strong></div>' +
      '<dl class="fn-paper-meta">' + printField('Date', printDate(f.date)) + printField('Event start', when(f.start, f.date)) + printField('Guests', f.gu ? 'Not known yet' : printQty(f.guests)) +
      printField('Area', f.loc || 'Not specified') + printField('Food service', times || 'TBC') + printField('Booking', printQty(totalQty(f)) + ' platters / ' + R.length + (R.length === 1 ? ' round' : ' rounds')) + '</dl></header>';
    if (opts.unsaved) out += '<p class="fn-paper-warning">This copy includes changes not saved to the book.</p>';
    if (opts.source) out += '<p class="fn-paper-warning">' + esc(opts.source) + '</p>';
    var probs = problems(f);
    if (probs.length) out += '<section class="fn-paper-warning"><h2>Still to check</h2><ul>' + probs.map(function (p) { return '<li>' + esc(p.t) + '</li>'; }).join('') + '</ul></section>';
    out += '<section><h2>Send in this order</h2><ol class="fn-paper-rounds">' + R.map(function (r, i) {
      var a = roundCounts(f, i), sent = !opts.unsaved && sentRec(f, i), otherDay = r.at && kday(r.at) !== f.date;
      // the trips this round went out in (14 Nov 2026): who sent what when, and whether Functions confirmed it
      var st = !opts.unsaved && f.id && r.at ? roundState(f, i) : null, part = st && !sent && st.sentTot ? st.sentTot + ' of ' + st.bookedTot + ' sent' : '';
      var trips = st && st.trips.length ? '<p class="fn-paper-text fn-paper-trips">' + st.trips.map(function (x) {
        return 'Trip ' + x.k + ', ' + esc(kclock(x.sentAt)) + ' ' + esc(nameOf(x.sentBy)) + ': ' + esc(tripText(f, x.n)) + '. ' + (x.outAt ? 'Out ' + esc(kclock(x.outAt)) + ', ' + esc(nameOf(x.outBy)) + (x.outFor ? ' for Functions' : '') + '.' : 'Not confirmed.');
      }).join(' ') + '</p>' : '';
      return '<li class="fn-paper-round"><div class="fn-paper-time"><b>' + esc(r.at ? kclock(r.at) : 'TBC') + '</b>' +
        (otherDay ? '<small>' + esc(when(r.at, f.date)) + '</small>' : '') + '<span>' + sum(a) + ' platters</span></div><div class="fn-paper-send"><h3>Round ' + (i + 1) + '</h3><ul class="fn-paper-lines">' +
        L.map(function (l, j) { return a[j] > 0 ? '<li><b>' + a[j] + '</b><span>' + esc(l.name) + '</span></li>' : ''; }).join('') + '</ul>' +
        (r.note ? '<p class="fn-paper-text fn-paper-round-note">' + esc(r.note) + '</p>' : '') + '</div><div class="fn-paper-sent">' +
        (f.status === 'cancelled' ? 'Cancelled' : '<span class="fn-paper-tick' + (sent ? ' is-sent' : '') + '" aria-hidden="true"></span><span>' + (sent ? 'Sent ' + esc(kclock(sent.sentAt)) : part ? esc(part) : 'Sent') + '</span>') + '</div>' + trips + '</li>';
    }).join('') + '</ol>' + (!R.length ? '<p>No rounds entered yet.</p>' : '') + '</section>';
    out += '<section class="fn-paper-totals"><h2>Total booked / ' + esc(printQty(totalQty(f))) + ' platters</h2><ul class="fn-paper-lines">' + L.map(function (l) {
      return '<li><b>' + esc(printQty(l.qty)) + '</b><span>' + esc(l.name) + (l.unit && l.unit !== 'platter' ? ' (' + esc(unitOf(l, l.qty)) + ')' : '') + '</span></li>';
    }).join('') + '</ul>' + (!L.length ? '<p>No platters entered yet.</p>' : '') + '</section>';
    out += '<section class="fn-paper-notes"><h2>Service &amp; dietary notes</h2><p class="fn-paper-text">' + esc(f.notes || 'None entered.') + '</p></section>' +
      '<section class="fn-paper-notes"><h2>Kitchen comment</h2><p class="fn-paper-text">' + esc(f.kc || 'None entered.') + '</p>' +
      (f.kc && f.kcAt && !opts.unsaved ? '<p class="fn-paper-by">' + esc(nameOf(f.kcBy)) + ' / ' + esc(printStamp(f.kcAt)) + '</p>' : '') + '</section>';
    return out + '<footer class="fn-paper-foot"><span>' + (opts.unsaved ? 'Unsaved copy' : 'Version ' + esc(f.v || 1) + ' / last changed ' + esc(printStamp(f.upd))) + '</span><span>Printed ' + esc(printStamp(printed)) + '</span></footer></article>';
  }
  var printJob = null;
  function printError(button, message) {
    var row = button && button.parentNode;
    if (row && document.body.contains(row)) {
      var el = row.querySelector('.fn-print-error');
      if (!el) { el = document.createElement('p'); el.className = 'fn-print-error p-err'; el.setAttribute('role', 'alert'); row.appendChild(el); }
      el.textContent = message;
    } else { var api = P() && P().book && P().book(); if (api) api.say(message); }
  }
  function printEnd() {
    if (!printJob) return;
    var job = printJob; printJob = null;
    if (job.root.parentNode) job.root.parentNode.removeChild(job.root);
    document.body.classList.remove('fn-printing'); document.title = job.title;
    if (job.button && document.body.contains(job.button)) { job.button.disabled = false; job.button.focus({ preventScroll: true }); }
  }
  function printFunctions(list, opts, button) {
    if (printJob) { if (!printJob.returned) return; printEnd(); }
    var prep = P();
    if (!prep || !/^\d{4,6}$/.test((prep.state && prep.state.pin) || '') || !list.length) return;
    if (typeof window.print !== 'function') { printError(button, 'Printing is not available here. Open the book in your browser to print.'); return; }
    var error = button && button.parentNode && button.parentNode.querySelector('.fn-print-error'); if (error) error.parentNode.removeChild(error);
    opts = opts || {};
    var root = document.createElement('div'), printed = now(); root.id = 'fn-print'; root.setAttribute('aria-hidden', 'true');
    if (!opts.fromForm && (F.cached || F.offline || F.state !== 'ok')) opts.source = 'Saved copy / last read ' + printStamp(F.at) + '. Check the latest changes before service.';
    if (opts.prep) root.className = 'fn-prep-print';
    root.innerHTML = opts.prep ? printPrepSheet(list, opts) : (opts.day ? '<header class="fn-paper-day"><h1>Service run sheet / ' + esc(printDate(opts.day)) + '</h1><p>All rounds for today\'s functions, including rounds already sent. One function per sheet.</p></header>' : '') +
      list.map(function (f) { return printSheet(f, opts, printed); }).join('');
    printJob = { root: root, title: document.title, button: button }; if (button) button.disabled = true;
    document.body.appendChild(root); document.body.classList.add('fn-printing'); document.title = (opts.day ? printDate(opts.day) : list[0].name || 'New function') + (opts.prep ? ' - Functions prep sheet' : ' - Function run sheet');
    // Native print keeps the current page and the unsaved form in place. The print-only copy is a snapshot, so service
    // updates cannot change it while the dialog is open. Wait for fonts, but a failed font load still prints the fallback.
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([ready.catch(function () {}), new Promise(function (resolve) { setTimeout(resolve, 1000); })]).then(function () {
      if (!printJob || printJob.root !== root) return;
      printJob.started = true;
      try {
        window.print();
        // An embedded mobile browser can return without afterprint or focus. Leave its copy ready for printing,
        // but allow another tap to replace it, so a missing browser event never locks the control.
        if (printJob && printJob.root === root) { printJob.returned = true; if (button) button.disabled = false; }
      } catch (e) { printEnd(); printError(button, 'Could not open printing. Open the book in your browser and try again.'); }
    });
  }
  window.addEventListener('afterprint', printEnd);
  // Some mobile browsers do not send afterprint. Returning to the book releases that copy and the print button too.
  window.addEventListener('focus', function () { if (printJob && printJob.started) printEnd(); });
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
    var api = P() && P().book && P().book();
    if (api && api.ovPush) api.ovPush('fn', function () { sheetClose(true, true); });
    el.querySelector('.fn-sheet').focus({ preventScroll: true });
    strip();
  }
  function sheetClose(back, noBack) {
    if (!sheetEl) return;
    var api = P() && P().book && P().book();
    if (api && api.ovDone) api.ovDone('fn', noBack);
    sheetEl.parentNode.removeChild(sheetEl); sheetEl = null; sheetId = '';
    if (back && sheetBack && document.body.contains(sheetBack)) sheetBack.focus({ preventScroll: true });
    sheetBack = null;
    strip();
  }

  /* ---------- #/fn: today, the next three days from tomorrow (or 14), and the platter totals per day ---------- */
  var pageDays = 7;   // Upcoming looks a week ahead, as Home's Coming up and the Next function line do (10 Nov 2026)
  /* A function on #/fn as one card (redesign step 5, 8 Nov 2026, Airbnb's Today and Upcoming, every-page.html e-fn): a
     small line with the event start, the place and the guests; the name; today, what goes out next (the same words as
     the band); when food goes out and how many rounds; what is booked; the service and dietary notes in short. The card
     opens the function; Cancel sits at its end. x: the band's entry for a function on today, for its next round. */
  function cardHTML(f, x) {
    var n = (f.rounds || []).length, tot = totalQty(f), off = f.status === 'cancelled', nx = '';
    if (x && x.kind === 'on' && !off && f.first) {
      var w = nowOf(f, now());
      nx = '<span class="fn-cnext' + (w.done ? ' is-done' : '') + '">' + (w.done ? w.html : '<span class="fn-cnext-l">Next out</span> <b class="fn-due' + (w.late ? ' is-late' : '') + '">' + esc(w.time) + '</b> ' + w.html) + '</span>';
    }
    var eb = ['Event ' + when(f.start, f.date), f.loc, guestsText(f)].filter(Boolean).join(' · ');
    var food = (f.first ? 'Food from ' + when(f.first, f.date) : 'Food times TBC') + (n > 1 ? ' · ' + n + ' rounds' : '');
    return '<li class="fn-card' + (off ? ' is-off' : '') + '"><a href="#/fn/' + encodeURIComponent(f.id) + '"><span class="fn-c0">' + esc(eb) + '</span><span class="fn-c1"><b>' + esc(f.name) + '</b>' +
      (off ? ' <span class="fn-tag fn-t-off">Cancelled</span>' : '') + (f.kc ? ' <span class="fn-tag fn-t-kc">Kitchen comment</span>' : '') + '</span>' + nx +
      '<span class="fn-c2">' + esc(food) + '</span><span class="fn-c3">' + esc(linesText(f)) + ' (' + tot + ')</span>' +
      (f.notes ? '<span class="fn-cnote"><span class="fn-cnote-l">Notes</span> ' + esc(f.notes) + '</span>' : '') + '</a>' +
      (statusHTML(f) ? '<div class="fn-card-actions">' + statusHTML(f) + '</div>' : '') + '</li>';
  }
  function totalsHTML(rows) {
    if (!rows || !rows.length) return '';
    return '<div class="fn-dtot"><span class="label">To make for the day</span><ul>' + rows.map(function (r) { return '<li><b>' + r.qty + '</b> \u00d7 ' + esc(r.name) + '</li>'; }).join('') + '</ul></div>';
  }
  function stateNote() {
    var t = now();
    if (F.state === 'error') return '<p class="p-err" role="alert">Could not load functions.' + (F.at ? ' Showing the copy from ' + esc(dayName(kday(F.at)) + ' ' + kclock(F.at)) + '.' : (quota() ? '' : ' Check the signal and open this page again.')) + '</p>';
    if (F.state === 'loading' || F.state === 'idle') return F.at ? '<p class="hint" role="status">Checking for changes. Showing the copy from ' + esc(when(F.at, kday(t))) + '.</p>' : '';
    if (F.offline || navigator.onLine === false) return F.at ? '<p class="hint" role="status">No signal. Last updated ' + esc(dayName(kday(F.at)) + ' ' + kclock(F.at)) + '.</p>' : '';
    return '<p class="hint fn-fresh">Up to date, ' + esc(kclock(F.at)) + '. Changes show here by themselves.</p>';
  }
  /* #/fn/now, the service view (22 Oct 2026): everything that goes out now across all functions, late first, each with
     its Sent; what to plate for those, added together; and the rounds coming up in the next hour. It redraws itself as
     rounds are ticked and as time passes (no reads: the same list and ticks as the band). */
  function svcLine(f, a) {
    return (f.lines || []).map(function (l, i) { return { l: l, q: a[i] }; }).filter(function (x) { return x.q > 0; })
      .map(function (x) { return '<span class="fn-svc-q"><b>' + x.q + '</b> <span class="fn-x">\u00d7</span> ' + esc(short(x.l.name)) + '</span>'; }).join('');
  }
  /* The two-way check (head chef, 14 Nov 2026, docs/function-handover-options/brief.md, Chosen): the kitchen taps what
     goes now (each kind left is a button; a tap picks all of it, − takes one off) and presses one button that says what
     it sends: Send all 5, or Send 4 platters. Each send is a trip. A row says how much went; every trip waiting for
     Functions is one line on the shelf at the end of the board, counted in the board's top line. Functions people
     confirm each trip (Confirm out); a head or sous chef may confirm for Functions 10 minutes after it was sent.
     Functions-only staff see the shelf first and no send buttons. No reads: the same list and records as the band. */
  function kindsHTML(f, i, st, pk) {
    return '<ul class="fn-svc-kinds" aria-label="Tap what goes now">' + (f.lines || []).map(function (l, j) {
      var left = st.left[j], v = pk[l.rid] || 0, nm = esc(short(l.name)), d = ' data-id="' + esc(f.id) + '" data-r="' + i + '|' + esc(l.rid) + '"';
      if (left <= 0) return '';
      if (!v) return '<li class="fn-svc-kind"><button type="button" class="fn-svc-k" data-fn="pick"' + d + ' aria-pressed="false">' + I_BOX + '<b>' + left + '</b> <span class="fn-x">×</span> ' + nm + '</button><span class="fn-svc-kslot" aria-hidden="true"></span></li>';
      return '<li class="fn-svc-kind"><button type="button" class="fn-svc-k is-pick" data-fn="pick"' + d + ' aria-pressed="true"><b>' + v + '</b> <span class="fn-x">×</span> ' + nm +
        (v < left ? ' <span class="fn-svc-kof">of ' + left + '</span>' : '') + ' <span class="fn-svc-kin">In this trip</span></button>' +
        (left >= 10 ? '<input class="fn-svc-knum" type="number" inputmode="numeric" min="1" max="' + left + '" value="' + v + '" data-fn="pick-num"' + d + ' aria-label="How many ' + nm + ' in this trip">' : '') +
        '<button type="button" class="fn-svc-kless" data-fn="pick-less"' + d + ' aria-label="One fewer ' + nm + '">−</button></li>';
    }).join('') + '</ul>';
  }
  function shelfHTML(t, me, coord) {
    var wt = waitingTrips(), outs = outTrips(t), chef = isChef();
    if (!wt.length && !outs.length) return '';
    var out = '<section class="fn-svc-shelf" id="fn-shelf" aria-label="Waiting for Functions"><h4 class="fn-svc-sh">Waiting for Functions <small>' + (coord ? 'confirm each trip when it is out' : 'sent, not confirmed yet') + '</small></h4>';
    if (wt.length) out += '<ul class="fn-svc-trips">' + wt.map(function (w) {
      var f = w.f, x = w.t, pend = !!F.pend[x.id], age = t - x.sentAt, mine = x.sentBy === me, acts = '';
      if (!pend) {
        if (fnPerson(me) && !mine) acts += '<button type="button" class="btn fn-out-b" data-fn="trip-out" data-id="' + esc(x.id) + '">' + I_TICKS + ' Confirm out</button>';
        else if (chef && age >= 10 * MIN) acts += '<button type="button" class="btn fn-for-b" data-fn="trip-for" data-id="' + esc(x.id) + '">Confirm for Functions</button>';
        if (canSend() && (chef || mine && age < 2 * MIN)) acts += '<button type="button" class="linkish fn-svc-link" data-fn="trip-undo" data-id="' + esc(x.id) + '">Undo</button>';
      }
      return '<li class="fn-svc-trip"><span class="fn-svc-tw"><b>' + esc(kclock(f.rounds[w.i].at)) + ' ' + esc(f.name) + '</b>' + (f.loc ? ' · ' + esc(f.loc) : '') + ' · <span class="fn-trip-k">Trip ' + x.k + '</span> ' + esc(tripText(f, x.n)) +
        ' · ' + (pend && !x.outAt ? '' : I_TICK + ' sent ' + esc(kclock(x.sentAt)) + ' ' + esc(nameOf(x.sentBy))) + '</span>' + waitPill(f, x, t) + acts + '</li>';
    }).join('') + '</ul>';
    if (outs.length) {
      var o = outs[0];
      out += '<p class="fn-svc-outs">' + I_TICKS + ' Out today: ' + outs.length + (outs.length === 1 ? ' trip' : ' trips') + '. Last: ' + esc(o.f.name) + ' trip ' + o.t.k + ', ' + esc(kclock(o.t.outAt)) + ' ' +
        esc(o.t.outFor ? nameOf(o.t.outBy) + ' for Functions' : nameOf(o.t.outBy)) + '.</p>';
    }
    return out + '</section>';
  }
  function serviceHTML(t) {
    var sv = service(F.list, t, isSentK, leftK, keepK), q = sum(sv.plate.map(function (p) { return p.qty; }));
    var me = ahWho(), cook = canSend(), coord = !cook, wt = waitingTrips(), long = wt.filter(function (w) { return !F.pend[w.t.id] && t - w.t.sentAt >= 10 * MIN; }).length;
    /* Redesign step 5 (8 Nov 2026, Flighty's live board, every-page.html e-service): the rounds still to go out on the
       dark board, each with how long until it goes (or how late it is), the platters, the function's service and
       dietary notes on every round, and its Send, as before. Both prints moved to the end. The page is drawn again
       every 20 seconds while open (no reads), so the minutes keep up. Since 8 Nov 2026 (the audit against the drawing) the
       board holds every round of the night still to go, not only each function's next one, and each row says one thing
       about its time: how long until it goes, or how late it is. */
    function left(at) { var m = Math.round((at - t) / MIN); return m < 0 ? -m + ' min late' : !m ? 'Now' : m < 60 ? 'In ' + m + ' min' : 'In ' + Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + m % 60 + ' min' : ''); }
    var out = '<section class="set-block fn-page fn-svc-page"><div class="fn-page-head"><h2 id="rtitle" tabindex="-1">Service</h2></div><p class="hint">' +
      (coord ? 'What the kitchen has sent, waiting for you to confirm, then every round still to go out.' : 'Every round still to go out, in order. Tap what goes now, then Send. Functions confirms each trip.') + '</p>' + (known() ? '' : waitHTML());
    if (known() && !sv.all.length && !wt.length) out += '<p class="hint">Nothing to send: no function has a round still to go out.</p>';
    var rows = sv.all.length ? '<ul class="fn-svc-rows">' + sv.all.map(function (r) {
      var n = r.f.rounds.length, st = roundState(r.f, r.k), key = r.f.id + '_' + r.f.rounds[r.k].at, pk = cook ? pickOf(r.f, r.k, st) : {}, pq = sum(Object.keys(pk).map(function (x) { return pk[x]; }));
      var busy = cook && sendBusy(key), lab = busy ? sendRest(key) : pq ? 'Send ' + pq + (pq === 1 ? ' platter' : ' platters') : 'Send all ' + st.leftTot;
      return '<li class="fn-svc-row' + (r.late ? ' is-late' : r.due ? '' : ' is-later') + '"><p class="fn-svc-top"><b class="fn-due' + (r.late ? ' is-late' : '') + '">' + esc(when(r.at, kday(t))) + '</b>' +
        (r.late ? ' <span class="fn-late">Late</span>' : '') + ' <button type="button" class="linkish fn-svc-name" data-fn="open" data-id="' + esc(r.f.id) + '" aria-haspopup="dialog">' + esc(r.f.name) + '</button>' +
        (r.f.loc ? ' · ' + esc(r.f.loc) : '') + (n > 1 ? ' · round ' + (r.k + 1) + ' of ' + n : '') + ' <span class="fn-svc-cd">' + esc(left(r.at)) + '</span></p>' +
        (st.sentTot ? '<p class="fn-svc-sub">' + I_TICK + ' ' + st.sentTot + ' of ' + st.bookedTot + ' sent in ' + st.trips.length + (st.trips.length === 1 ? ' trip' : ' trips') + '. <b>' + st.leftTot + ' left</b>' + (cook ? ', tap what goes now:' : ':') + '</p>' : '') +
        (pq ? '<p class="fn-svc-sub fn-svc-pend">' + I_CLOCK + ' <i>In this trip: ' + esc(tripText(r.f, pk)) + '. Not sent yet.</i>' + (PK.note[key] ? ' ' + esc(PK.note[key]) : '') + '</p>' : '') +
        (cook ? kindsHTML(r.f, r.k, st, pk) : '<p class="fn-svc-what">' + svcLine(r.f, r.a) + ' <span class="fn-of">(' + sum(r.a) + ')</span></p>') +
        (r.f.rounds[r.k].note ? '<p class="fn-svc-note">' + esc(r.f.rounds[r.k].note) + '</p>' : '') +
        (r.f.notes ? '<p class="fn-svc-diet"><span class="fn-svc-dl">Dietaries and notes</span><span class="fn-svc-dt">' + esc(r.f.notes) + '</span></p>' : '') +
        (cook ? '<div class="fn-next-sent"><button type="button" class="btn fn-sent-b" data-fn="send" data-id="' + esc(r.f.id) + '" data-r="' + r.k + '"' + (busy ? ' disabled aria-disabled="true"' : '') + '>' + esc(lab) + '</button>' +
          (pq && !busy ? '<button type="button" class="linkish fn-svc-link" data-fn="pick-clear" data-id="' + esc(r.f.id) + '" data-r="' + r.k + '">Clear</button>' : '') + '</div>' : '') + '</li>';
    }).join('') + '</ul>' : '';
    var shelf = shelfHTML(t, me, coord);
    if (sv.all.length || shelf) {
      out += '<div class="fn-svc-board"><div class="fn-svc-bh"><h3 class="fn-svc-bt">' + (coord ? 'Functions service' : 'Still to go out') + '</h3><b class="fn-svc-clock">' + esc(kclock(t)) + '</b></div>' +
        (cook && wt.length && sv.all.length ? '<button type="button" class="linkish fn-svc-wl" data-fn="shelf">' + I_WAIT + ' ' + wt.length + (wt.length === 1 ? ' trip' : ' trips') + ' waiting for Functions' + (long ? ', ' + long + ' over 10 min' : '') + '</button>' : '') +
        (coord ? shelf + (rows ? '<div class="fn-svc-sec"><h4 class="fn-svc-sh">Still to go out <small>the kitchen sends these</small></h4>' + rows + '</div>' : '') : rows + shelf) + '</div>';
    }
    if (sv.plate.length) out += '<section class="fn-next" aria-label="To plate now"><p class="fn-next-h"><span class="fn-next-l">To plate now</span> <b>' + q + ' ' + (q === 1 ? 'platter' : 'platters') + '</b></p>' +
      '<p class="fn-next-s">Late and due in the next 15 minutes, all functions together. What was sent is not counted.</p><ul class="fn-next-list">' + sv.plate.map(function (p) {
        return bigRow(p.qty, p.name, p.rid);
      }).join('') + '</ul></section>';
    return out + stateNote() + '<div class="btn-row fn-svc-prints">' + prepButton(kday(t), t) + '<button type="button" class="btn" data-fn="print-day"' + (!known() || !printDayList(t).length ? ' disabled' : '') + '>Print run sheet</button></div>' +
      '<div class="btn-row"><a class="btn" href="#/fn">All functions</a></div></section>';
  }
  // the list has come from the server at least once (an empty answer from the copy in memory is not known)
  function known() { return F.state === 'ok' || !!F.at; }
  /* Who has seen it (head chef, 10 Nov 2026; brief step 4): on a function's own page, for the head chef, the sous chefs
     and the admin (LK_PREP.fnSeenOK()), while the function is still to come. One query by fid from the server when they
     tap (max(1, records) reads; never by itself, never from the phone's memory), then worked out on the page: who said
     Got it to what the kitchen needs now, who said it before the last change (or last heard it was cancelled), and who
     has not yet, from the kitchen people on the staff list (LK_PREP.fnPeople()). Kept in memory for the person who asked
     only (SEEN.who); a failed read says so and never shows "Not yet" for everyone. */
  var SEEN = { who: '', by: {} };
  function seenOK() { var p = P(); return !!(p && p.fnSeenOK && p.fnPeople && p.book && p.fnSeenOK()); }
  function seenFor() { var api = P().book(); return api.identity ? api.identity() : ''; }
  function seenWhen(at) { var d = kday(at); return (d === kday(now()) ? 'today' : dayName(d).slice(0, 3)) + ' ' + kclock(at); }
  // each kitchen person once: the latest thing they said Got it to (a record from someone off the list is left out)
  function seenSort(f, docs) {
    var cur = huSig(f), out = { got: [], old: [], not: [] }, last = {}, people = P().fnPeople();
    var named = {}; people.forEach(function (p) { named[p.id] = p.name; });
    (docs || []).forEach(function (d) {
      if (!d || d.fid !== f.id || typeof d.by !== 'string' || !named[d.by] || typeof d.at !== 'number' || !isFinite(d.at)) return;
      if (['week', 'tom', 'off'].indexOf(d.s) < 0 || typeof d.g !== 'string') return;
      if (!last[d.by] || d.at > last[d.by].at) last[d.by] = d;
    });
    people.forEach(function (p) {
      var d = last[p.id];
      if (!d) out.not.push({ name: p.name }); else (d.s !== 'off' && d.g === cur ? out.got : out.old).push({ name: p.name, at: d.at });
    });
    var byName = function (a, b) { return String(a.name).localeCompare(String(b.name)); };
    out.got.sort(byName); out.old.sort(byName); out.not.sort(byName);
    return out;
  }
  function seenHTML(f) {
    if (!seenOK() || f.status !== 'confirmed' || !isYmd(f.date) || f.date < kday(now())) return '';
    if (SEEN.who !== seenFor()) SEEN = { who: seenFor(), by: {} };
    var st = SEEN.by[f.id], out = '<div class="fn-seen" id="fn-seen"><h3 class="fn-h">Who has seen it</h3>';
    var btn = function (w, busy) { return '<button type="button" class="btn fn-seen-b" data-fn="seen" data-id="' + esc(f.id) + '"' + (busy ? ' aria-disabled="true"' : '') + '>' + w + '</button>'; };
    if (!st || st.state === 'error') {
      return out + '<p class="hint">Who said Got it on Home, and who has not yet.</p>' + (st ? '<p class="p-err" role="alert">Could not check. Check the signal and try again.</p>' : '') + btn('Check who has seen it') + '</div>';
    }
    if (st.state === 'loading') return out + '<p class="hint" role="status">Checking who has seen it...</p>' + btn('Checking...', true) + '</div>';
    var g = seenSort(f, st.docs), row = function (cls, word, list, times) {
      return '<li class="fn-seen-r ' + cls + '"><b>' + word + ' (' + list.length + ')</b><span>' + (list.length ? list.map(function (x) { return esc(x.name) + (times ? ' <span class="fn-seen-t">' + esc(seenWhen(x.at)) + '</span>' : ''); }).join(', ') : 'Nobody') + '</span></li>';
    };
    return out + '<ul class="fn-seen-l">' + row('is-got', 'Got it', g.got, true) + (g.old.length ? row('is-old', 'Before the last change', g.old, true) : '') + row('is-not', 'Not yet', g.not, false) + '</ul>' +
      '<p class="hint">Checked ' + esc(kclock(st.at)) + '. It counts Got it on Home\'s function card.</p>' + btn('Check again') + '</div>';
  }
  function seenLoad(id) {
    var prep = P(), api = prep && prep.book && prep.book(), f = byId(id);
    if (!api || !f || !seenOK()) return;
    if (SEEN.who !== seenFor()) SEEN = { who: seenFor(), by: {} };
    var who = SEEN.who, st = SEEN.by[id] = { state: 'loading' };
    changed();
    // a server read on a half-dropped signal can wait a long time without failing: after 6 seconds it is a failed check,
    // like fromServer() in js/prep.js, so Check who has seen it comes back
    var late = new Promise(function (res, rej) { setTimeout(function () { rej({ code: 'deadline-exceeded' }); }, 6000); });
    Promise.race([api.ready().then(function () { var fs = api.fs(); return fs.getDocsFromServer(fs.query(api.colRef('fnseen'), fs.where('fid', '==', id))); }), late]).then(function (snap) {
      if (SEEN.who !== who || SEEN.by[id] !== st || seenFor() !== who) return;
      SEEN.by[id] = { state: 'ok', docs: snap.docs.map(function (d) { return d.data(); }), at: now() };
      changed();
      var g = byId(id) ? seenSort(byId(id), SEEN.by[id].docs) : null;
      if (g && api.say) api.say('Got it: ' + g.got.length + '. ' + (g.old.length ? 'Before the last change: ' + g.old.length + '. ' : '') + 'Not yet: ' + g.not.length + '.');
    }, function () {
      if (SEEN.who !== who || SEEN.by[id] !== st) return;
      SEEN.by[id] = { state: 'error' }; changed();
    });
  }
  // what a page says while the list is not known yet: no signal, or still loading
  function waitHTML() { return F.state === 'offline' ? '<p role="status">No signal. Functions show here when the phone is back online.</p>' : '<p role="status">Loading functions...</p>'; }
  function pageHTML(id) {
    if (!window.LK_PREP || !window.LK_PREP.privateAccess()) return '';
    var t = now(), today = kday(t), prep = P();
    if (!prep || !/^\d{4,6}$/.test((prep.state && prep.state.pin) || '')) return '<section class="set-block"><h2 id="rtitle" tabindex="-1">Functions</h2><p>This device has no kitchen PIN yet. Open the Prep list and enter it first.</p><div class="btn-row"><a class="btn dark" href="#/prep">Open the Prep list</a></div></section>';
    if (id === 'now') return serviceHTML(t);
    if (id) {
      var f = byId(id);
      if (!f) return '<section class="set-block"><h2 id="rtitle" tabindex="-1">Function</h2>' + (known() ? '<p>This function is not on the kitchen\'s list: it may be a draft, over, or cancelled a while ago.</p>' : waitHTML()) + stateNote() + '<div class="btn-row"><a class="btn" href="#/fn">All functions</a></div></section>';
      // the function as one card (redesign step 5): the eyebrow and the name, then the sheet on its paper
      return '<section class="set-block fn-page fn-one"><span class="fn-eb">Function</span><h2 id="rtitle" tabindex="-1">' + esc(f.name) + '</h2><div class="fn-cardbox">' + sheetHTML(f, false) + '</div>' + seenHTML(f) + stateNote() + '<div class="btn-row"><a class="btn" href="#/fn">All functions</a></div></section>';
    }
    /* Today, then Upcoming (redesign step 5, 8 Nov 2026): two headings on one page, not tabs, so the coming days need no
       extra tap. Upcoming shows only the days with a function, each with its Print prep sheet; the days with nothing
       booked fold into one quiet line (they had a heading, a grey Print prep sheet and "None." each). */
    var on = showing(F.list, t, isSentK), totals = dayTotals(F.list), days = [], i;
    for (i = 1; i <= pageDays; i++) days.push(addDays(today, i));
    var body = '';
    if (!known()) body = waitHTML();
    else {
      body += '<div class="fn-sec"><h3 class="fn-h fn-sec-h">Today <span class="fn-sec-d">' + esc(dayName(today)) + '</span></h3><div class="btn-row fn-sec-acts">' + (on.length ? '<a class="btn dark" href="#/fn/now">Service view</a>' : '') + prepButton(today, t) + '</div>' +
        (on.length ? '<ul class="fn-cards">' + on.map(function (x) { return cardHTML(x.f, x); }).join('') + '</ul>' + totalsHTML(totals[today]) : '<p class="hint">No functions on now.</p>') + '</div>';
      var empty = [], booked = 0;
      body += '<div class="fn-sec"><h3 class="fn-h fn-sec-h">Upcoming functions <span class="fn-sec-d">the next ' + pageDays + ' days</span></h3>';
      days.forEach(function (d) {
        var fs = F.list.filter(function (f) { return f.date === d && (f.status === 'confirmed' || f.status === 'cancelled'); }).sort(function (a, b) { return a.first - b.first; });
        if (!fs.length) { empty.push(d); return; }
        booked++;
        body += '<div class="fn-day"><div class="fn-day-h"><h4>' + esc(dayName(d)) + '</h4>' + prepButton(d, t) + '</div><ul class="fn-cards">' + fs.map(function (f) { return cardHTML(f); }).join('') + '</ul>' + totalsHTML(totals[d]) + '</div>';
      });
      if (empty.length) body += '<p class="fn-quiet">' + (!booked ? 'Nothing booked in the next ' + pageDays + ' days.' : empty.length > 3 ? 'Nothing booked on the other ' + empty.length + ' days.' :
        'Nothing booked on ' + esc(empty.map(dayName).join(', ').replace(/, ([^,]*)$/, ' or $1')) + '.') + '</p>';
      body += '<div class="btn-row">' + (pageDays < 14 ? '<button type="button" class="btn" data-fn="days" data-v="14">Show the next 14 days</button>' : '<button type="button" class="btn" data-fn="days" data-v="7">Show the next 7 days</button>') + '</div></div>';
    }
    var can = prep.fnOK && prep.fnOK();
    return '<section class="set-block fn-page fn-list-page"><h2 id="rtitle" tabindex="-1">Functions</h2><p class="hint">Confirmed functions and their platters.</p>' +
      stateNote() + body + (can ? '<div class="btn-row"><a class="btn dark" href="#/functions">Manage functions</a></div>' : '') + '</section>';
  }

  /* ---------- the landing card: today and the next three days, less what the band shows ----------
     The band right above it has its own rows for today's functions and tomorrow's (bandRows()), so the card leaves
     those out and lists the rest (23 Oct 2026): a function behind the band's "+N more", one tomorrow pushed out by two
     order reminders, and the ones 2 and 3 days out. A function today that is over is left out. By day, then by when
     food first goes out, times TBC last in a day. Nothing to list: no card. */
  /* Home's Now and next board (redesign step 2, 8 Nov 2026): today's functions with what still goes out, and today's
     order reminders, from what the band already knows (no reads). Plain words: js/prep.js escapes them. Home has no
     band, so its Coming up card (landHTML()) leaves out only what this board shows. */
  function fnHomeRows() {
    if (!window.LK_PREP || !window.LK_PREP.privateAccess()) return [];
    var t = now(), out = [];
    showing(F.list, t, isSentK).forEach(function (x) {
      var f = x.f;
      if (x.kind === 'cancelled') { out.push({ id: f.id, kind: 'cancelled', name: f.name, sub: 'Cancelled, do not send', time: '', note: '', hot: true, at: f.first || 0 }); return; }
      if (x.kind !== 'on') return;
      var w = nowOf(f, t);
      if (w.done) return;   // every round sent: nothing still to come
      var n = (f.rounds || []).length, k = w.k, at = f.first && k >= 0 ? f.rounds[k].at : 0, left = at ? Math.round((at - t) / MIN) : null;
      var what = f.first ? linesText(f, leftK(f, k)) : linesText(f);
      out.push({ id: f.id, kind: 'on', name: f.name, sub: (!f.first ? 'Times TBC' : n > 1 ? 'Round ' + (k + 1) + ' of ' + n : 'All') + (what ? ' · ' + what : ''), time: w.time, at: at,
        note: w.late ? 'Not sent yet' : left != null && left <= 60 ? 'In ' + left + ' min' : n > 1 ? 'Round ' + (k + 1) : '', hot: !!w.late || (left != null && left <= 15) });
    });
    soon(F.list, t).forEach(function (x) {
      if (x.kind === 'order') out.push({ id: x.f.id, kind: 'order', name: 'Order the stock for ' + x.f.name, sub: dayName(x.f.date) + ' · ' + linesText(x.f), time: '', note: x.short ? 'Short notice' : 'Today', hot: !!x.short, at: 0 });
    });
    return out;
  }
  var landHome = false;   // the landing card sits on Home's board page (no band there): set by landSlot(), checked by paint()
  function landHTML() {
    if (!window.LK_PREP || !window.LK_PREP.privateAccess()) return '';
    // Home's Coming up looks a week ahead, as drawn (8 Nov 2026, the audit of the redesign); the old landing kept 3 days
    var t = now(), today = kday(t), tom = addDays(today, 1), end = addDays(today, landHome ? 7 : 3), R = bandRows(t), inBand = {};
    if (landHome) { fnHomeRows().forEach(function (x) { if (x.kind !== 'order') inBand[x.id] = 1; }); huIds().forEach(function (id) { inBand[id] = 1; }); }
    else {
      R.a.forEach(function (x) { if (x.kind === 'on') inBand[x.f.id] = 1; });
      R.b.forEach(function (x) { if (x.kind === 'tomorrow') inBand[x.f.id] = 1; });
    }
    var list = F.list.filter(function (f) { return f.status === 'confirmed' && f.date >= today && f.date <= end && (f.date > today || t < f.until) && !inBand[f.id]; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.first || 9e15) - (b.first || 9e15) || String(a.name).localeCompare(String(b.name)); });
    if (!list.length) return '';
    return '<div class="fn-land"><span class="fn-land-h">Functions</span><ul>' + list.slice(0, 4).map(function (f) {
      return '<li><b>' + esc(f.date === today ? 'Today' : f.date === tom ? 'Tomorrow' : dayName(f.date)) + '</b> ' + esc(f.name) + ', food ' + esc(when(f.first, f.date)) + ', ' + totalQty(f) + ' platters</li>';
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
    if (!window.LK_PREP || !window.LK_PREP.privateAccess()) return '';
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
    if (a === 'status') { var target = byId(el.getAttribute('data-id')); if (target) setStatus(target, el.getAttribute('data-v') === 'undo'); return; }
    if (a === 'print') { var f = byId(el.getAttribute('data-id')); if (f) printFunctions([f], {}, el); return; }
    if (a === 'print-prep') { var day = el.getAttribute('data-day'); if (isYmd(day)) printFunctions(printDayList(now(), day), { day: day, prep: true }, el); return; }
    if (a === 'print-day') { printFunctions(printDayList(now()), { day: kday(now()) }, el); return; }
    if (a === 'open') { sheetOpen(el.getAttribute('data-id'), el); return; }
    if (a === 'close') { sheetClose(true); return; }
    if (a === 'sent' || a === 'unsent') { tickSent(el.getAttribute('data-id'), +el.getAttribute('data-r'), a === 'sent'); return; }
    // the two-way check (14 Nov 2026): pick what goes, send it as a trip, Functions confirms it
    if (a === 'send') { if (!el.disabled) sendTrip(el.getAttribute('data-id'), +el.getAttribute('data-r'), el.getAttribute('data-v') === 'all'); return; }
    if (a === 'pick' || a === 'pick-less') {
      var pr = String(el.getAttribute('data-r') || '').split('|'), pf = byId(el.getAttribute('data-id')), pi = +pr[0], prid = pr.slice(1).join('|');
      var pst = pf && roundState(pf, pi), pk0 = pf && pst ? pickOf(pf, pi, pst) : {}, pj = pf ? (pf.lines || []).map(function (l) { return l.rid; }).indexOf(prid) : -1;
      if (!pst || pj < 0) return;
      pickSet(pf.id, pi, prid, a === 'pick-less' ? (pk0[prid] || 0) - 1 : pk0[prid] ? 0 : pst.left[pj]);
      changed(); return;
    }
    if (a === 'pick-clear') { var cf = byId(el.getAttribute('data-id')), cr = cf && (cf.rounds || [])[+el.getAttribute('data-r')]; if (cr) { delete PK.r[cf.id + '_' + cr.at]; delete PK.note[cf.id + '_' + cr.at]; } changed(); return; }
    if (a === 'trip-out' || a === 'trip-for') { tripOut(el.getAttribute('data-id'), a === 'trip-for'); return; }
    if (a === 'trip-undo') { tripUndo(el.getAttribute('data-id')); return; }
    if (a === 'shelf') { var sh = document.getElementById('fn-shelf'); if (sh) { sh.scrollIntoView({ block: 'start' }); sh.setAttribute('tabindex', '-1'); sh.focus({ preventScroll: true }); } return; }
    if (a === 'go') { sheetClose(false, true); return; }
    if (a === 'ckhide') { try { localStorage.setItem('lk.fn.ckhide', kday(now())); } catch (x) {} if (window.LK_PREP && window.LK_PREP.sg) window.LK_PREP.sg('checks', 'd'); paint(); return; }
    if (a === 'fold') { lsSet('lk.fn.fold', lsGet('lk.fn.fold') === kday(now()) ? null : kday(now())); lastBand = null; paint(); var fb = document.querySelector('#fn-band [data-fn="fold"]'); if (fb) fb.focus({ preventScroll: true }); return; }
    // the Next function line's minus: this person, this phone, until tomorrow (lk.fn.ahead.fold), with Undo in the slip
    if (a === 'hu-got') { huGot(el); return; }
    if (a === 'seen') { if (el.getAttribute('aria-disabled') !== 'true') seenLoad(el.getAttribute('data-id')); return; }
    if (a === 'hu-undo') { huUndo(); return; }
    if (a === 'ahead-hide') {
      var hk = kday(now()) + '|' + ahWho();
      lsSet('lk.fn.ahead.fold', hk); AH.on = false; AH.gone = true; lastBand = null; paint();
      var pr = P(), back = function () {
        if (lsGet('lk.fn.ahead.fold') === hk) lsSet('lk.fn.ahead.fold', null);
        AH.gone = false; AH.on = !!(window.LK_PREP && window.LK_PREP.privateAccess()); lastBand = null; paint();
        var hb = document.querySelector('#fn-band [data-fn="ahead-hide"]'); if (hb) hb.focus({ preventScroll: true });
      };
      if (pr && pr.toast) {
        pr.toast('Next function hidden on this phone until tomorrow.', { label: 'Undo', fn: back }, 9000);
        var ub = document.querySelector('.p-toasts .p-toast-btn'); if (ub) ub.focus({ preventScroll: true });   // the line went: focus to its Undo
      }
      return;
    }
    if (a === 'more') { F.more = !F.more; lastBand = null; paint(); var mb = document.querySelector('#fn-band [data-fn="more"]'); if (mb) mb.focus({ preventScroll: true }); return; }
    if (a === 'days') { pageDays = +el.getAttribute('data-v') || 7; try { window.dispatchEvent(new Event('lk-fn')); } catch (x) {} }
  });
  document.addEventListener('input', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-fn="pick-num"]');
    if (!el) return;
    var pr = String(el.getAttribute('data-r') || '').split('|'), f = byId(el.getAttribute('data-id')), i = +pr[0];
    if (!f) return;
    pickSet(f.id, i, pr.slice(1).join('|'), el.value);
    var st = roundState(f, i), pk = st ? pickOf(f, i, st) : {}, q = sum(Object.keys(pk).map(function (x) { return pk[x]; }));
    var b = el.closest('.fn-svc-row') && el.closest('.fn-svc-row').querySelector('[data-fn="send"]');
    if (b && !b.disabled) b.textContent = q ? 'Send ' + q + (q === 1 ? ' platter' : ' platters') : 'Send all ' + (st ? st.leftTot : '');
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
  window.addEventListener('hashchange', function () { sheetClose(false, true); if (location.hash !== '#/fn/now') PK = { who: '', r: {}, note: {} }; });
  // the band comes and goes on time with the screen left open: every 20 seconds it is worked out again (no reads)
  var lastDay = T.day();
  setInterval(function () {
    if (T.day() !== lastDay) { lastDay = T.day(); stop(); watch(); }   // midnight: the query starts from the new day
    paint();
    if (/^#\/fn\//.test(location.hash)) { try { window.dispatchEvent(new Event('lk-fn')); } catch (x) {} }   // a function page or the service view: late shows on time
  }, 20000);
  // back on screen is an open for the Next function line (ahOpen())
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { watch(); ahOpen(); huOpen(); changed(); } });
  window.addEventListener('online', function () { watch(); changed(); });
  window.addEventListener('offline', changed);
  window.addEventListener('lk-clock', changed);
  window.addEventListener('lk-cfg', function () { watch(); changed(); });
  window.addEventListener('lk-who', function () { watch(); changed(); });
  window.addEventListener('lk-access', function () { watch(); changed(); });
  // the head chef's Google sign-in passed or failed on this device: To check before the functions follows
  window.addEventListener('lk-admin', changed);
  // the head chef's recipe changes arrived: the platter names in the picker follow (bookings keep what was agreed)
  window.addEventListener('lk-rx', function () { D = window.LK_DATA || D; });

  /* The chef hat's Functions tile (4 Nov 2026, a piece of B in the agreed work pages design): today's next confirmed
     function, by when its first food goes out ("Today 18:00"); "Today" while its times are to come, "On now" once its food
     is going out. From the list the band already holds, no read of its own; '' when there is none today. */
  function hatLine() {
    if (!window.LK_PREP || !window.LK_PREP.privateAccess()) return '';
    var t = now(), day = kday(t), on = false, next = 0, tbc = false;
    F.list.forEach(function (f) {
      if (f.status !== 'confirmed' || f.date !== day || f.until && t >= f.until) return;
      if (!f.first) { tbc = true; return; }
      if (f.first <= t) { on = true; return; }
      if (!next || f.first < next) next = f.first;
    });
    return next ? 'Today ' + kclock(next) : on ? 'On now' : tbc ? 'Today' : '';
  }

  window.LK_FN = {
    M: M, list: function () { return F.list.slice(); }, state: function () { return F; },
    // every booking from today on as the live list has them, removed ones included; null until the server answered
    live: function () { return F.state === 'ok' && F.all ? F.all.slice() : null; },
    // a page draws the slot: an open, so the Next function line is decided here (ahOpen())
    bandSlot: function () { ahOpen(); var h = bandHTML(); lastBand = h; return '<div class="fn-band' + (AH.on ? ' is-ahead' : '') + '" id="fn-band" role="region" aria-label="' + (AH.on ? 'Next function' : 'Functions') + '"' + (h ? '' : ' hidden') + '>' + h + '</div>'; },
    landSlot: function (home) { landHome = !!home; var h = landHTML(); return '<div id="fn-land"' + (h ? '' : ' hidden') + '>' + h + '</div>'; },
    homeRows: fnHomeRows,
    // Home's Function this week card and Next function line, under Your day (js/prep.js homeSlot()): drawn at Home's open
    // with its own spoken status beside it (kept apart from the redrawn slot, so a Got it is heard once and never carried over)
    homeAhead: function () { huOpen(); var h = huHTML(); return '<div class="fn-hm" id="fn-hm"' + (h ? '' : ' hidden') + '>' + h + '</div><span class="visually-hidden" role="status" id="fn-hm-say"></span>'; },
    checkSlot: function () { var h = checkHTML(); return '<div id="fn-check"' + (h ? '' : ' hidden') + '>' + h + '</div>'; },
    hatLine: hatLine, page: pageHTML, watch: watch, paint: paint, catalogue: catalogue, recipeOf: recipeOf, nameOf: nameOf, sheetHTML: sheetHTML, print: printFunctions, esc: esc,
    // the Orders tag for an order line, from the functions this phone already holds (M.orderTag()): no read
    orderTag: function (x, today) { return orderTag(F.list, x, today || kday(now())); },
    statusHTML: statusHTML, setStatus: setStatus, statusBusy: function (id) { return !!F.jobs[id]; }, prepOps: prepOps, orderOps: orderOps
  };
  watch();
})();
