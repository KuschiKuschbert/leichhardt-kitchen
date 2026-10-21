/*
  The functions schedule maths (js/functions.js, the part node can run): even splits, rounds that add up, when the
  kitchen sees a function and when it goes, overnight rounds, day totals, overlaps and what changed. No browser.
  Run under three time zones: a phone set to another zone must not move a booking.
*/
const assert = require('assert');
const path = require('path');
let n = 0, fails = 0;
function ok(cond, msg) { n++; if (cond) console.log('PASS ' + msg); else { fails++; console.log('FAIL ' + msg); } }
function eq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), msg + (JSON.stringify(a) === JSON.stringify(b) ? '' : ' (got ' + JSON.stringify(a) + ', wanted ' + JSON.stringify(b) + ')')); }

for (const tz of ['Australia/Brisbane', 'America/New_York', 'Asia/Kolkata']) {
  process.env.TZ = tz;
  delete require.cache[require.resolve('../js/functions.js')];
  const M = require(path.join(__dirname, '..', 'js', 'functions.js'));
  const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
  console.log('-- time zone ' + tz);

  // kitchen time
  eq(M.kday(at('2026-10-24', '00:00')), '2026-10-24', tz + ': 00:00 Brisbane is that kitchen day');
  eq(M.kday(at('2026-10-24', '23:59')), '2026-10-24', tz + ': 23:59 Brisbane is still that kitchen day');
  eq(M.kclock(at('2026-10-24', '18:30')), '18:30', tz + ': clock reads kitchen time');
  eq(M.dayName('2026-10-24'), 'Sat 24 Oct', tz + ': day name');

  // even splits
  eq(M.even(5, 3), [2, 2, 1], tz + ': 5 platters over 3 rounds is 2, 2, 1');
  eq(M.even(12, 4), [3, 3, 3, 3], tz + ': 12 over 4 is 3 each');
  eq(M.even(2, 3), [1, 1, 0], tz + ': 2 over 3 leaves the last round at 0 (no half platters)');
  eq(M.sum(M.even(7, 3)), 7, tz + ': a split never changes the total');
  eq(M.toU([2, 2, 1]), [0, 0, 1, 1, 2], tz + ': counts to round numbers');
  eq(M.fromU([0, 0, 1, 1, 2], 3), [2, 2, 1], tz + ': round numbers to counts');
  eq(M.fromU([0, 2], 3), [1, 0, 1], tz + ': a zero in the middle round');

  // the window: examples from the brief
  const base = (o) => M.derive(Object.assign({ status: 'confirmed', name: 'Smith 50th', date: '2026-10-24', start: at('2026-10-24', '18:00'), guests: 60, mode: 'all', lines: [], rounds: [{ at: at('2026-10-24', '18:00') }] }, o || {}));
  let f = base();
  eq(f.from, at('2026-10-24', '00:00'), tz + ': shows from 00:00 on the day');
  eq(f.until, at('2026-10-24', '20:00'), tz + ': event 18:00, all at 18:00: gone at 20:00');
  f = base({ mode: 'stag', rounds: [{ at: at('2026-10-24', '18:30') }, { at: at('2026-10-24', '19:30') }, { at: at('2026-10-24', '20:30') }] });
  eq(f.until, at('2026-10-24', '21:00'), tz + ': last round 20:30: gone at 21:00');
  eq([f.first, f.last], [at('2026-10-24', '18:30'), at('2026-10-24', '20:30')], tz + ': first and last come from the rounds');
  f = base({ start: at('2026-10-24', '22:00'), mode: 'stag', rounds: [{ at: at('2026-10-24', '23:30') }, { at: at('2026-10-25', '00:30') }] });
  eq(f.until, at('2026-10-25', '01:00'), tz + ': overnight: a round at 00:30 keeps it on until 01:00 the next day');
  eq(M.when(at('2026-10-25', '00:30'), '2026-10-24'), 'Sun 25 Oct 00:30 (next day)', tz + ': a round after midnight says the next day');
  f = base({ rounds: [{ at: at('2026-10-23', '23:00') }], start: at('2026-10-24', '00:30') });
  eq(f.from, at('2026-10-23', '00:00'), tz + ': food the evening before: shows from 00:00 that earlier day');
  eq(M.derive(Object.assign(base(), { status: 'draft' })).kq, 0, tz + ': a draft is never in the kitchen query');
  eq(M.derive(Object.assign(base(), { status: 'cancelled' })).kq, 0, tz + ': a draft cancelled before it was confirmed is not either');
  eq(M.derive(Object.assign(base(), { status: 'cancelled', confAt: 1 })).kq, at('2026-10-24', '20:00'), tz + ': a confirmed function cancelled: kept until its old window ends (notice)');

  // the band at a moment
  const on = base({ id: 'a' }), cancelled = M.derive(Object.assign(base({ id: 'b' }), { status: 'cancelled', confAt: 1 }));
  const moved = M.derive(Object.assign(base({ id: 'c', date: '2026-10-25', start: at('2026-10-25', '18:00'), rounds: [{ at: at('2026-10-25', '18:00') }] }), { was: { from: at('2026-10-24', '00:00'), until: at('2026-10-24', '20:00'), first: at('2026-10-24', '18:00'), start: at('2026-10-24', '18:00') } }));
  const show = t => M.showing([on, cancelled, moved], t).map(x => x.f.id + ':' + x.kind);
  eq(show(at('2026-10-23', '23:59')), [], tz + ': nothing the day before');
  eq(show(at('2026-10-24', '00:00')).sort(), ['a:on', 'b:cancelled', 'c:moved'].sort(), tz + ': at 00:00 the function, the cancel notice and the moved notice all show');
  eq(show(at('2026-10-24', '20:00')), [], tz + ': at 20:00 all three are gone');
  eq(show(at('2026-10-25', '09:00')), ['c:on'], tz + ': the moved function shows on its new day, once');
  eq(M.nextRound(f, at('2026-10-23', '22:00')), 0, tz + ': the next round is the first while it is still to come');
  eq(M.nextRound(f, at('2026-10-23', '23:01')), -1, tz + ': once its time has passed there is no next round (nothing is marked served)');

  // problems before confirming
  const L = (rid, qty, u) => ({ rid, name: rid + ' Platter', unit: 'platter', qty, u });
  const R3 = [{ at: at('2026-10-24', '18:30') }, { at: at('2026-10-24', '19:00') }, { at: at('2026-10-24', '19:30') }];
  const good = M.derive({ status: 'confirmed', name: 'Smith 50th', date: '2026-10-24', start: at('2026-10-24', '18:00'), guests: 60, mode: 'stag', rounds: R3,
    lines: [L('Sandwich', 5, M.toU([3, 2, 0])), L('Hot', 4, M.toU([2, 2, 0])), L('Dessert', 3, M.toU([0, 0, 3]))] });
  eq(M.problems(good), [], tz + ': the example from the brief (5, 4 and 3 over 18:30, 19:00, 19:30) is fine');
  eq(M.totalQty(good), 12, tz + ': 12 platters in all');
  const under = JSON.parse(JSON.stringify(good)); under.lines[0].u = M.toU([3, 1, 0]);
  ok(M.problems(under).some(p => /4 of 5 placed/.test(p.t)), tz + ': under: "4 of 5 placed"');
  const over = JSON.parse(JSON.stringify(good)); over.lines[0].u = M.toU([3, 3, 0]);
  ok(M.problems(over).some(p => /6 placed but 5 booked/.test(p.t)), tz + ': over: "6 placed but 5 booked"');
  const empty = JSON.parse(JSON.stringify(good)); empty.rounds.push({ at: at('2026-10-24', '20:00') }); empty.lines.forEach(l => { l.u = l.u.slice(); });
  ok(M.problems(empty).some(p => /Round 4 .* has no platters/.test(p.t)), tz + ': an empty round is pointed out');
  const order = JSON.parse(JSON.stringify(good)); order.rounds[1].at = at('2026-10-24', '18:00');
  ok(M.problems(order).some(p => /Round 2 must be after round 1/.test(p.t)), tz + ': rounds out of time order');
  const few = M.derive({ status: 'confirmed', name: 'Tiny', date: '2026-10-24', start: at('2026-10-24', '18:00'), guests: 4, mode: 'stag', rounds: R3, lines: [L('Pizza', 2, [0, 1])] });
  ok(M.problems(few).some(p => /3 rounds for 2 platters/.test(p.t)), tz + ': more rounds than platters: offers fewer rounds or all at once');
  const half = JSON.parse(JSON.stringify(good)); half.lines[0].qty = 2.5;
  ok(M.problems(half).some(p => /whole platters/.test(p.t)), tz + ': half a platter is refused');
  const nog = JSON.parse(JSON.stringify(good)); nog.guests = 0;
  ok(M.problems(nog).some(p => p.k === 'guests'), tz + ': guests needed');
  const allTwo = JSON.parse(JSON.stringify(good)); allTwo.mode = 'all';
  ok(M.problems(allTwo).some(p => /All at once is one round/.test(p.t)), tz + ': all at once is one round');

  // day totals: each booked line once, confirmed only, guests never change them
  const g2 = JSON.parse(JSON.stringify(good)); g2.id = 'g2'; g2.guests = 300;
  const dr = JSON.parse(JSON.stringify(good)); dr.status = 'draft';
  const cx = JSON.parse(JSON.stringify(good)); cx.status = 'cancelled';
  const tot = M.dayTotals([good, g2, dr, cx])['2026-10-24'];
  eq(tot.map(r => r.rid + ' ' + r.qty), ['Dessert 6', 'Hot 8', 'Sandwich 10'], tz + ': day totals add each booked line once (no rounds counted twice, no drafts, no cancelled, guests ignored)');
  // overlaps are information only
  const ov = M.overlaps([Object.assign({ id: 'x' }, good), Object.assign({ id: 'y' }, good)]);
  eq(Object.keys(ov).sort(), ['x', 'y'], tz + ': two functions at the same time are shown as overlapping');
  // what changed
  const later = JSON.parse(JSON.stringify(good)); later.date = '2026-10-25'; later.lines[1].qty = 5; later.kc = 'Cake at 20:00';
  const ch = M.changes(good, later);
  ok(ch.indexOf('Moved to Sun 25 Oct') >= 0 && ch.indexOf('Hot 4 to 5') >= 0 && ch.indexOf('Kitchen comment changed') >= 0, tz + ': changes name the move, the number and the comment');
}
console.log((fails ? fails + ' failed' : 'All passed') + ' of ' + n + ' maths checks.');
process.exit(fails ? 1 : 0);
