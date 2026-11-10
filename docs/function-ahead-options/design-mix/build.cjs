/* Combined preview of the council's recommended mix (functions ahead of time, round 2, 10 Nov 2026). Preview only:
   nothing here is loaded by the book and no app file changes. Built exactly as designs A, B and C were: static pages
   from the implemented-app snapshots in ../baseline/ (scripts removed, the real css/app.css through <base>, bundled
   fonts), plus the mix's pieces:
     C's Function heads-up card, directly under Your day; Got it collapses it in place to A's quiet Next function line;
     A's Next function line in the band's slot on band-empty work-page days, with its minus, slip and Undo;
     B's open-only rule (the slot's height is fixed when the page opens; later changes only change its words);
     B's Not ordered yet / Order today tag inside the existing Orders function stock line;
     A's 7-day #/fn Upcoming and guests on the function sheet's first line.
   Revised after the focused review (10 Nov 2026): Got it answers in place inside the line (no bottom slip on Home);
   the slot's status words come first on a row that never wraps and the name shortens; the slot is sized at open for
   its tallest words at the current text size; a function today breaks the lock; Home's slot keeps the same lock;
   one combined card for a busy week (3 or more functions not yet seen); plain names; a chevron on the line; the
   minus has its own key and resets for a different person; Cancelled stays on the line until the date passes.
   Synthetic data only: today is Tue 10 Nov 2026, 14:00 Queensland. Ann (staff), Bo (head chef), Dev (staff),
   Gus (function manager). Smith 60th Thu 12 Nov, 60 guests; Jones wedding Sat 14 Nov, 90 guests; Lee engagement
   Fri 13 Nov, 40 guests (a short-notice booking for one state). Run by capture.cjs, or: node build.cjs */
const fs = require('fs'), path = require('path');
const here = __dirname, baseDir = path.join(here, '..', 'baseline'), stDir = path.join(here, 'states');
fs.mkdirSync(stDir, { recursive: true });
const CSS = fs.readFileSync(path.join(here, 'src/mix.css'), 'utf8'), JS = fs.readFileSync(path.join(here, 'src/mix.js'), 'utf8');
const read = n => fs.readFileSync(path.join(baseDir, n), 'utf8');
const SELF = 'docs/function-ahead-options/design-mix/';   // links resolve against the repo root (the <base>)
function must(h, s) { if (h.indexOf(s) < 0) throw new Error('snapshot changed, missing: ' + s.slice(0, 90)); return s; }
function sub(h, a, b) { must(h, a); return h.split(a).join(b); }

/* ---------- synthetic functions ---------- */
const FN = {
  smith: { id: 'smith', name: 'Smith 60th', day: 'Thu 12 Nov', loc: 'Function room', start: '18:00', guests: 60, food: '18:30 and 19:15', diet: '4 gluten free, 1 nut allergy',
    notes: '4 gluten free, 1 nut allergy.', rounds: [['18:30', [3, 2]], ['19:15', [2, 3]]], lines: [['antipasto-platter', 'Antipasto Platter', 'Antipasto'], ['pizza-platter', 'Pizza Platter', 'Pizza']] },
  jones: { id: 'jones', name: 'Jones wedding', day: 'Sat 14 Nov', loc: 'Beer garden', start: '17:00', guests: 90, food: '18:00', diet: 'None entered',
    notes: '', rounds: [['18:00', [6]]], lines: [['antipasto-platter', 'Antipasto Platter', 'Antipasto']] },
  lee: { id: 'lee', name: 'Lee engagement', day: 'Fri 13 Nov', loc: 'Function room', start: '19:00', guests: 40, food: '19:30', diet: '2 vegan',
    notes: '2 vegan.', rounds: [['19:30', [4]]], lines: [['antipasto-platter', 'Antipasto Platter', 'Antipasto']] },
  // the busy week (3 or 5 in the next 7 days), a long name for the fixed slot, and a same-day booking
  brown: { id: 'brown', name: 'Brown christening', day: 'Sun 15 Nov', loc: 'Function room', start: '12:00', guests: 30, food: '12:30', diet: '1 vegetarian',
    notes: '1 vegetarian.', rounds: [['12:30', [3]]], lines: [['antipasto-platter', 'Antipasto Platter', 'Antipasto']] },
  rotary: { id: 'rotary', name: 'Rotary dinner', day: 'Mon 16 Nov', loc: 'Function room', start: '18:30', guests: 45, food: '19:00', diet: '2 gluten free',
    notes: '2 gluten free.', rounds: [['19:00', [4]]], lines: [['pizza-platter', 'Pizza Platter', 'Pizza']] },
  rob: { id: 'rob', name: 'Robertson and Nguyen engagement party', day: 'Thu 12 Nov', loc: 'Function room', start: '18:00', guests: 60, food: '18:30 and 19:15', diet: '4 gluten free, 1 nut allergy',
    notes: '4 gluten free, 1 nut allergy.', rounds: [['18:30', [3, 2]], ['19:15', [2, 3]]], lines: [['antipasto-platter', 'Antipasto Platter', 'Antipasto'], ['pizza-platter', 'Pizza Platter', 'Pizza']] },
  patel: { id: 'patel', name: 'Patel farewell', day: 'Tue 10 Nov', loc: 'Beer garden', start: '17:30', guests: 25, food: '18:00', diet: '1 nut allergy',
    notes: '1 nut allergy.', rounds: [['18:00', [4]]], lines: [['antipasto-platter', 'Antipasto Platter', 'Antipasto']] }
};
const S = FN.smith, J = FN.jones, LEE = FN.lee, ROB = FN.rob, PATEL = FN.patel;
const ROB_BOOKED = Object.assign({}, ROB, { day: 'Fri 13 Nov' });   // the long name as a short-notice booking
FN.robfri = Object.assign({}, ROB_BOOKED, { id: 'robfri' });
const total = f => f.rounds.reduce((s, r) => s + r[1].reduce((a, b) => a + b, 0), 0);
const lineTot = (f, i) => f.rounds.reduce((s, r) => s + (r[1][i] || 0), 0);
const linesText = f => f.lines.map((l, i) => lineTot(f, i) + ' × ' + l[2]).join(', ');
const platters = f => f.lines.map((l, i) => lineTot(f, i) + ' ' + l[2]).join(', ') + ' (' + total(f) + ')';

const CAL = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/></svg>';

/* ---------- A's Next function line (design-a lineInner), shared by Home and the work pages ----------
   o: { f, when, more: n, moreId, moreHidden, fold, home, state: '' | 'cancelled' | 'nosignal' | 'booking' | 'tomorrow' }
   Revised: row 1 starts with the status words (never cut), then the date (the only part of row 1 that may shorten);
   row 2 is the name (cut with an ellipsis) and a short fixed part. Neither row wraps, so every state is the same
   two rows at a given text size, and the slot sized at open always holds them. Home adds Undo and the Got it words. */
const CHEV = '<svg class="fa-next-chev" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const NB = ' ';
function lineInner(o) {
  const f = o.f, st = o.state || '';
  const D = t => '<span class="fa-next-d">' + NB + '· ' + t + '</span>';
  let s, d = '', pre = '', name = f.name, x = '', aria;
  if (st === 'cancelled') {
    s = '<span class="fn-tag fn-t-off">Cancelled</span> · <span class="fa-next-stop">Do not prep</span>';
    name = '<s>' + f.name + '</s>'; x = NB + '· ' + f.day;
    aria = 'Cancelled: ' + f.name + ', ' + f.day + '. Do not prep. Open the function';
  } else if (st === 'nosignal') {
    s = '<span class="fa-next-k is-pending" role="status">No signal</span>'; d = D('updated 13:52'); x = NB + '· ' + f.day;
    aria = 'No signal. Functions last updated 13:52. Next function: ' + f.name + ', ' + f.day + ', ' + f.guests + ' guests. Open the function';
  } else if (st === 'booking') {
    s = '<span class="fn-tag fn-t-order">Order today</span>'; d = D(f.day); pre = '<span class="fa-next-p">Stock:' + NB + '</span>';
    aria = 'Order today, short notice: stock for ' + f.name + ', ' + f.day + '. It is on the order list. Open the function';
  } else if (st === 'tomorrow') {
    s = '<span class="fn-tag fn-t-tom">Tomorrow</span>'; d = D(f.day); x = NB + '· food ' + f.rounds[0][0];
    aria = 'Tomorrow: ' + f.name + ', ' + f.day + ', event ' + f.start + ', food ' + f.rounds[0][0] + '. Open the function';
  } else {
    s = '<span class="fa-next-k">Next function</span>'; d = D(o.when || f.day); x = NB + '· ' + f.guests + ' guests';
    aria = 'Next function: ' + f.name + ', ' + (o.when || f.day) + ', ' + f.guests + ' guests. Open the function';
  }
  const more = o.more ? '<a class="fa-next-more" href="' + SELF + 'fn-week.html"' + (o.moreId ? ' id="' + o.moreId + '" data-fma-part' : '') + (o.moreHidden ? ' hidden' : '') +
    ' aria-label="' + o.more + ' more ' + (o.more === 1 ? 'function' : 'functions') + ' this week. Open Functions, the next 7 days"><span class="fa-m1">+' + o.more + ' more</span><span class="fa-m2">this week</span></a>' : '';
  // the minus: work pages only. It is about this person on this phone today (lk.fn.ahead.fold), not the band's minus
  const fold = o.fold ? '<button type="button" class="fn-fold" data-fn="fold" aria-label="Hide this line for you on this phone until tomorrow. Home still shows it." title="Hide for you today">−</button>' : '';
  // Home only: Got it answers inside the line (its words, Undo, and the same words for a screen reader)
  const ackW = o.home ? '<span class="fa-next-ack" aria-hidden="true"></span>' : '';
  const undo = o.home ? '<button type="button" class="fa-next-undo" data-fma="undo">Undo</button>' : '';
  const sr = o.home ? '<span class="visually-hidden" role="status" aria-live="polite" data-fma-sr></span>' : '';
  return '<div class="fa-next' + (st === 'cancelled' ? ' is-cancelled' : '') + '"><button type="button" class="fa-next-b" data-fn="open" data-id="' + f.id + '" aria-haspopup="dialog" aria-label="' + aria + '">' +
    '<span class="fa-next-tx"><span class="fa-next-l"><span class="fa-next-s">' + s + '</span>' + d + ackW + '</span><span class="fa-next-t"><span class="fa-next-nm">' + pre + '<b class="fa-next-n">' + name + '</b></span>' + (x ? '<span class="fa-next-x">' + x + '</span>' : '') + '</span></span>' +
    CHEV + '</button>' + undo + more + fold + sr + '</div>';
}
// the band slot on a work page: quiet reference paper, sized and locked at open (data-fma-lock)
const bandLine = o => '<div class="fn-band fa-quiet" id="fn-band" role="region" aria-label="Next function" data-fma-lock>' + lineInner(Object.assign({ fold: true }, o)) + '</div>';
// what the same slot would say after a change while the page is open (src/mix.js fmaSim swaps the words in)
const simTpl = (kind, o) => '<template data-sim="' + kind + '">' + lineInner(Object.assign({ fold: true }, o)) + '</template>';
const simsFor = (f, booked, more) => simTpl('nosignal', { f, more, state: 'nosignal' }) + simTpl('booking', { f: booked, more: more + 1, state: 'booking' }) +
  simTpl('midnight', { f, more, state: 'tomorrow' }) + simTpl('cancelled', { f, more, state: 'cancelled' });
/* a function booked for today while the page is open: the one change that breaks the lock. The full band, as the app
   draws a function on today (bandRow and nowOf in js/functions.js), at once. */
const todayBand = f => '<div class="fn-band" id="fn-band" role="region" aria-label="Functions"><div class="fn-band-top"><h2 class="fn-band-h">Functions today</h2><span class="fn-band-n">1 on today</span><button type="button" class="fn-fold" data-fn="fold" aria-expanded="true" aria-label="Hide functions" title="Hide">−</button></div>' +
  '<ul class="fn-list"><li class="fn-li"><button type="button" class="fn-row" data-fn="open" data-id="' + f.id + '" aria-haspopup="dialog"><span class="fn-r1"><span class="fn-due">' + f.rounds[0][0] + '</span> <b>' + f.name + '</b> · ' + f.loc + '</span>' +
  '<span class="fn-r2">All: <b>' + linesText(f) + '</b> <span class="fn-of">(' + total(f) + ')</span></span></button></li></ul></div>';
const SIMS = simsFor(S, LEE, 1) + '<template data-sim="today" data-unlock>' + todayBand(PATEL) + '</template>';
const SIMS_LONG = simsFor(ROB, FN.robfri, 1);
// on Home: the same line on a pinned quiet card, in the heads-up card's place, no minus, with the in-place Got it answer
const homeLine = (o, id, hidden) => '<section class="hm-paper fa-hm-next fma-slot" id="' + (id || 'fma-line') + '" data-fma-part aria-label="Next function"' + (hidden ? ' hidden' : '') + '>' +
  lineInner(Object.assign({ fold: false, home: true }, o)) + '</section>';
// Home while it is open: a booking changes the line's words only (here +2 more this week); no card inserts itself
const homeSim = (kind, o, id) => '<template data-sim="' + kind + '" data-target="' + (id || 'fma-line') + '">' + lineInner(Object.assign({ fold: false, home: true }, o)) + '</template>';

/* ---------- C's heads-up card (design-c card()), with the mix's Got it words ---------- */
function facts(f, ins) {
  ins = ins || {};
  const v = (k, t) => ins[k] ? '<ins>' + t + '</ins>' : t;
  return '<dl class="fn-hu-facts"><div><dt>Food out</dt><dd>' + v('food', f.food) + (f.rounds.length > 1 ? ' (' + f.rounds.length + ' rounds)' : '') + '</dd></div>' +
    '<div><dt>Platters</dt><dd>' + platters(f) + '</dd></div><div><dt>Dietaries</dt><dd>' + v('diet', f.diet) + '</dd></div></dl>';
}
/* Got it: this person, this heads-up. data-show / data-hide name the parts the tap changes. The answer is in place:
   the line in the card's spot says "Got it. Kept here as one line" with Undo inside it (no bottom slip on Home), and
   data-said is what a screen reader hears (the app's liveSay()). */
function gotBtn(f, o) {
  return '<button type="button" class="btn ' + (o.plain ? '' : 'dark ') + 'fn-hu-got" data-fma="got" data-line="' + (o.line || 'fma-line') + '" data-show="' + (o.show || '') + '" data-hide="' + (o.hide || '') + '"' +
    ' data-said="' + (o.said || 'Got it: ' + f.name + '. Kept on Home as one line.') + '" aria-label="' + (o.label || 'Got it: ' + f.name + '. Just for you, until the day before. It stays on Home as one line.') + '">Got it</button>';
}
// o: id, inDays, count, also, tag, sub, chg, ins, foot, hidden, got: { show, hide, slip }
function card(f, o) {
  const right = o.tag || (o.count ? '<span class="fn-hu-n">' + o.count + '</span>' : '');
  return '<section class="hm-paper fn-hu fma-slot" id="' + o.id + '" data-fma-part aria-labelledby="' + o.id + '-h"' + (o.hidden ? ' hidden' : '') + '>' +
    '<div class="hm-ph"><h3 class="hm-pt" id="' + o.id + '-h">Function this week</h3>' + right + '</div>' +
    '<p class="fn-hu-when">' + f.day + ' · ' + o.inDays + '</p><p class="fn-hu-name">' + f.name + '</p>' +
    '<p class="fn-hu-sub">' + (o.sub || f.loc + ' · ' + f.guests + ' guests · event ' + f.start) + '</p>' + (o.chg || '') + facts(f, o.ins) +
    '<div class="fn-hu-act">' + gotBtn(f, o.got) + '<a class="fn-hu-open" href="#/fn/' + f.id + '" data-fn="open" data-id="' + f.id + '">Open the function</a></div>' +
    (o.also ? '<p class="fn-hu-also">Also this week: <b>' + o.also.day + '</b> ' + o.also.name + '</p>' : '') + (o.sig || '') +
    '<p class="fn-hu-foot">' + (o.foot || 'Got it is just for you, until the day before.') + '</p></section>';
}
function tomCard(f, o) {
  return '<section class="hm-paper fn-hu is-tom fma-slot" id="hu-tom" data-fma-part aria-labelledby="hu-tom-h">' +
    '<div class="hm-ph"><h3 class="hm-pt" id="hu-tom-h">Function tomorrow</h3><span class="fn-tag fn-t-tom">Tomorrow</span></div>' +
    '<p class="fn-hu-name">' + f.name + ' <span class="fn-hu-n">' + f.day + '</span></p>' +
    '<p class="fn-hu-line">Event ' + f.start + ' · food ' + f.food + ' · ' + total(f) + ' platters · ' + f.loc + '</p><p class="fn-hu-line">Dietaries: ' + f.diet + '</p>' +
    '<div class="fn-hu-act">' + gotBtn(f, o.got) + '<a class="fn-hu-open" href="#/fn/' + f.id + '" data-fn="open" data-id="' + f.id + '">Open the function</a></div>' +
    '<p class="fn-hu-foot">Everyone sees this once, the day before. Got it hides it only for you.</p></section>';
}
function offCard(f, o) {
  return '<section class="hm-paper fn-hu is-off fma-slot" id="hu-off" data-fma-part aria-labelledby="hu-off-h">' +
    '<div class="hm-ph"><h3 class="hm-pt" id="hu-off-h">Function this week</h3><span class="fn-tag fn-t-off">Cancelled</span></div>' +
    '<p class="fn-hu-when">' + f.day + '</p><p class="fn-hu-name"><s>' + f.name + '</s></p>' +
    '<p class="fn-hu-sub"><b>Cancelled.</b> Do not prep or order for it. Its platters are off the prep and order lists.</p>' +
    '<div class="fn-hu-act">' + gotBtn(f, Object.assign({ plain: true }, o.got)) + '</div>' +
    '<p class="fn-hu-foot">Cancelled by Gus, Tue 10 Nov 11:20. You had the heads-up on Sat 7 Nov.</p></section>';
}

/* The busy week (focused review): when 3 or more functions in the next 7 days are not yet seen by this person, one card
   lists them all, one compact row each, with one Got it for all. Dietaries are shortened (gluten free to GF, allergy
   dropped); the full words are one tap away on each row's sheet. */
const shortDiet = d => /none/i.test(d) ? 'no dietaries' : d.replace(/gluten free/g, 'GF').replace(/ allergy/g, '');
function wkRow(f) {
  return '<li><button type="button" class="fn-wk-r" data-fn="open" data-id="' + f.id + '" aria-haspopup="dialog" aria-label="' + f.name + ', ' + f.day + ', ' + f.guests + ' guests, food from ' + f.rounds[0][0] + ', ' + total(f) + ' platters, dietaries: ' + f.diet + '. Open the function">' +
    '<span class="fn-wk-d"><b>' + f.day.slice(0, 3) + '</b>' + f.day.slice(4) + '</span><span class="fn-wk-m"><span class="fn-wk-1"><span class="fn-wk-n">' + f.name + '</span><span class="fn-wk-g">' + f.guests + ' guests</span></span>' +
    '<span class="fn-wk-2">Food ' + f.rounds[0][0] + ' · ' + total(f) + ' platters · ' + shortDiet(f.diet) + '</span></span>' + CHEV + '</button></li>';
}
function weekCard(list, o) {
  const n = list.length;
  return '<section class="hm-paper fn-hu fn-hu-wk fma-slot" id="hu-week" data-fma-part aria-labelledby="hu-week-h"' + (o.hidden ? ' hidden' : '') + '>' +
    '<div class="hm-ph"><h3 class="hm-pt" id="hu-week-h">Functions this week</h3><span class="fn-hu-n">' + n + ' this week</span></div><ul class="fn-wk">' + list.map(wkRow).join('') + '</ul>' +
    '<div class="fn-hu-act">' + gotBtn(list[0], { show: 'fma-line fma-more', said: 'Got it: all ' + n + ' functions this week. Kept on Home as one line, with ' + (n - 1) + ' more this week.',
      label: 'Got it: all ' + n + ' functions this week. Just for you, until the day before each one. They stay on Home as one line.' }) +
    '<a class="fn-hu-open" href="' + SELF + 'fn-week.html">Open Functions</a></div>' +
    '<p class="fn-hu-foot">One Got it for all ' + n + '. Just for you, until the day before each one.</p></section>';
}
const busySlot = (list, got) => homeLine({ f: list[0], more: list.length - 1, moreId: 'fma-more', moreHidden: !got }, 'fma-line', !got) + weekCard(list, { hidden: got });

/* ---------- existing pieces, as the app draws them today ---------- */
function orderRow(f) {
  return '<li class="fn-li"><button type="button" class="fn-row is-soon" data-fn="open" data-id="' + f.id + '" aria-haspopup="dialog"><span class="fn-r2"><span class="fn-tag fn-t-order">Order today</span>' + (f === LEE ? ' <span class="fn-tag fn-t-off">Short notice</span>' : '') +
    ' Stock for <b>' + f.name + '</b>, ' + f.day + ': ' + linesText(f) + ' (' + total(f) + '). It is on the order list.</span></button></li>';
}
const orderBand = fs2 => '<div class="fn-band" id="fn-band" role="region" aria-label="Functions"><div class="fn-band-top"><h2 class="fn-band-h">Functions coming up</h2><button type="button" class="fn-fold" data-fn="fold" aria-expanded="true" aria-label="Hide functions" title="Hide">−</button></div><ul class="fn-list">' + fs2.map(orderRow).join('') + '</ul></div>';
const EMPTY_BAND = '<div class="fn-band" id="fn-band" role="region" aria-label="Functions" hidden=""></div>';
function hmRow(title, sub2, time, note, id, hot) {
  return '<li><button type="button" class="hm-a' + (hot ? ' is-hot' : '') + '" data-fn="open" data-id="' + id + '" aria-haspopup="dialog"><span class="hm-i" aria-hidden="true">' + CAL + '</span><span class="hm-w"><b class="hm-t">' + title + '</b><small class="hm-s">' + sub2 + '</small></span><span class="hm-r">' +
    (time ? '<b class="hm-tm">' + time + '</b>' : '') + (note ? '<small class="hm-n">' + note + '</small>' : '') + '</span></button></li>';
}
const board = rows => '<div class="hm-bh"><h3 class="hm-bt" id="hm-board-h">Now and next</h3><b class="hm-clock">14:00</b></div><ul class="hm-rows">' + rows.join('') + '</ul>';
const ORDER_ROWS = [hmRow('Order the stock for Smith 60th', 'Thu 12 Nov · ' + linesText(S), '', 'Today', 'smith'), hmRow('Order the stock for Jones wedding', 'Sat 14 Nov · ' + linesText(J), '', 'Today', 'jones')];
const DAY_ROWS = [hmRow('Smith 60th', 'Round 1 of 2 · 3 × Antipasto, 2 × Pizza', '18:30', 'Round 1', 'smith')];
const LEE_ROWS = [hmRow('Order the stock for Lee engagement', 'Fri 13 Nov · ' + linesText(LEE), '', 'Short notice', 'lee', true)];

/* the existing function sheet (sheetHTML in js/functions.js) with A's one addition: the guests on its first line */
function sheet(f) {
  const n = f.rounds.length, tot = total(f), r0 = f.rounds[0], q0 = r0[1].reduce((a, b) => a + b, 0);
  const big = r0[1].map((q, i) => q ? '<li class="fn-next-row"><span class="fn-next-n">' + q + '<span class="fn-x">×</span></span><span class="fn-next-name"><a href="#/r/' + f.lines[i][0] + '">' + f.lines[i][1] + '</a></span></li>' : '').join('');
  const head = n > 1 ? r0[0] + ' · round 1 of ' + n : 'All at ' + r0[0];
  let body = '<p class="fn-sub">' + f.day + ' · ' + f.loc + ' · event ' + f.start + ' · <ins class="fa-add">' + f.guests + ' guests</ins></p>' +
    '<section class="fn-next" aria-label="Next out"><p class="fn-next-h"><span class="fn-next-l">Next out</span> <b>' + head + '</b></p><p class="fn-next-s">' + q0 + ' platters' + (n > 1 ? ' of ' + tot : '') + '</p><ul class="fn-next-list">' + big + '</ul>' +
    '<div class="fn-next-sent"><button type="button" class="btn fn-sent-b" data-fn="sent" aria-label="Round 1 sent">Sent</button></div></section>';
  if (n > 1) {
    body += '<section class="fn-whole" aria-label="Whole function"><h3 class="fn-whole-h">Whole function <b>' + tot + ' platters</b></h3><p class="fn-whole-s">All ' + n + ' rounds added up.</p><ul class="fn-whole-list">' +
      f.lines.map((l, i) => '<li><b>' + lineTot(f, i) + '</b> × <a href="#/r/' + l[0] + '">' + l[1] + '</a></li>').join('') + '</ul></section>';
    body += '<h3 class="fn-h">Every round</h3><ol class="fn-rounds">' + f.rounds.map((r, k) => '<li class="fn-round' + (k ? '' : ' is-next') + '"><span class="fn-round-t">' + r[0] + (k ? '' : ' <span class="fn-tag">Next</span>') + '</span><span class="fn-round-w">' +
      r[1].map((q, i) => q ? q + ' × ' + f.lines[i][2] : '').filter(Boolean).join(', ') + ' <b>(' + r[1].reduce((a, b) => a + b, 0) + ')</b></span><span class="fn-sent"><button type="button" class="btn fn-sent-b" data-fn="sent">Sent</button></span></li>').join('') + '</ol><p class="hint fn-note">Tick each round as it goes out.</p>';
  } else body += '<p class="fn-whole fn-whole-one">One round: this is the whole function, <b>' + tot + ' platters</b>.</p>';
  if (f.notes) body += '<h3 class="fn-h" id="fa-diet-' + f.id + '">Service and dietary notes</h3><p class="fn-text">' + f.notes + '</p>';
  body += '<p class="fn-by fn-last">Last changed by Gus, Mon 9 Nov 14:00.</p><div class="btn-row fn-acts"><button type="button" class="btn" data-fn="print">Print function</button><a class="btn dark" href="' + SELF + 'fn-week.html" data-fn="go">Open the full sheet</a></div>';
  return '<div class="fa-pop" id="fa-sheet-' + f.id + '"><div class="fn-pop-bg" data-fn="close"></div><section class="fn-sheet" role="dialog" aria-modal="true" aria-labelledby="fn-sh-h-' + f.id + '" tabindex="-1">' +
    '<div class="fn-grip" aria-hidden="true"></div><header class="fn-sheet-top"><div class="fn-sheet-t"><span class="fn-eb">Function</span><h2 id="fn-sh-h-' + f.id + '">' + f.name + '</h2></div><button type="button" class="fn-close" data-fn="close">Close</button></header><div class="fn-sheet-body">' + body + '</div></section></div>';
}
// the book's own slip (toast()): hidden until a tap; a state frame can open it with words
const slipHTML = (text, open) => '<div class="p-toasts" id="fma-slip"' + (open ? '' : ' hidden=""') + '><div class="p-toast" data-toast="new" style="--toast-life:9000ms;--toast-since:-3000ms"><span class="p-toast-msg">' + (text || '') + '</span><button type="button" class="p-toast-btn" data-fma="undo">Undo</button></div></div>';

/* ---------- page assembly ---------- */
function finish(html, o) {
  o = o || {};
  let h = html.replace('<base href="../../../">', '<base href="' + (o.state ? '../../../../' : '../../../') + '">');
  h = h.replace('<title>Leichhardt Kitchen Book</title>', '<title>' + (o.title || 'Mix preview') + '</title>');
  if (o.sim) h = h.replace('<html lang="en-AU"', '<html lang="en-AU" data-fma-sim="' + o.sim + '"');
  if (o.auto) h = h.replace('<html lang="en-AU"', '<html lang="en-AU" data-fma-auto="' + o.auto + '"' + (o.hold ? ' data-fma-hold=""' : ''));
  if (o.text) h = h.replace('<html lang="en-AU"', '<html lang="en-AU" data-fma-text="' + o.text + '"');
  h = h.replace('</head>', '<style id="design-mix">\n' + CSS + '\n</style>\n</head>');
  // the mascot shows its still (the app's canvas is not running in a static page)
  h = h.replace('<canvas width="192" height="256"></canvas>', '<img src="art/mascot/idle-still.png" alt="" width="64" height="85" style="width:100%;height:100%;object-fit:contain">');
  h = h.replace(/(class="mascot"[^>]*style="[^"]*?)left: (\d+)px;/, (m, a, x) => a + 'left: min(' + x + 'px, calc(100% - 80px));');
  const sims = o.sims === 'long' ? SIMS_LONG : o.sims ? SIMS : '';
  const extra = (o.sheets || ['smith', 'jones', 'lee', 'patel']).map(id => sheet(FN[id])).join('') + slipHTML(o.slip, !!o.slip) + sims + (o.homeSims || '') + '<script>\n' + JS + '</script>';
  h = h.replace(/<\/body>\s*<\/html>\s*$/, extra + '</body></html>');
  return h;
}
const HOME_WITH = '<section class="hm-paper hm-with" id="hm-with"';
const LAND = { smith: '<li><b>Thu 12 Nov</b> Smith 60th, food 18:30, 10 platters</li>', jones: '<li><b>Sat 14 Nov</b> Jones wedding, food 18:00, 6 platters</li>' };
const DAYLONG = { sat7: 'Saturday 7 November', sun8: 'Sunday 8 November', tue10: 'Tuesday 10 November', wed11: 'Wednesday 11 November', thu12: 'Thursday 12 November' };
const DAYYMD = { sat7: '7 November 2026', sun8: '8 November 2026', tue10: '10 November 2026', wed11: '11 November 2026', thu12: '12 November 2026' };
/* Home: the slot (heads-up card or line, nearest first) goes directly under Your day, before On with you.
   Coming up leaves out the functions the slot or Now and next already name (as it leaves out what the board shows). */
function homePage(file, o) {
  let h = read(file);
  h = sub(h, HOME_WITH, o.slot + HOME_WITH);
  (o.drop || []).forEach(k => { h = sub(h, LAND[k], ''); });
  if ((o.drop || []).length === 2) h = sub(h, '<div id="fn-land">', '<div id="fn-land" hidden="">');
  if (o.day && o.day !== 'tue10') h = sub(h, 'Tuesday 10 November', DAYLONG[o.day]);
  if (o.board) h = sub(h, '<section class="hm-board" id="hm-board" aria-labelledby="hm-board-h" hidden=""></section>', '<section class="hm-board" id="hm-board" aria-labelledby="hm-board-h">' + o.board + '</section>');
  if (o.dev) h = asDev(h);
  return h;
}
// the shared tablet after Ann locks it and Dev types his PIN: Dev's own day, his own heads-up state
function asDev(h) {
  h = sub(h, '>Hello, Ann<', '>Hello, Dev<');
  h = sub(h, 'data-hm-sec="Hot larder"', 'data-hm-sec="Prep"');
  h = sub(h, '<b class="hm-day-value">Hot larder</b>', '<b class="hm-day-value">Prep</b>');
  h = sub(h, '<b class="hm-t">Next break</b><small class="hm-s">Earlier break 13:00 to 13:30</small></span><span class="hm-r"><b class="hm-tm">None left</b>', '<b class="hm-t">Next break</b><small class="hm-s">Lunch break 14:30 to 15:00</small></span><span class="hm-r"><b class="hm-tm">14:30</b>');
  h = sub(h, '<tr><th scope="row">Pans</th><td><span class="hm-tp"><b>Bo</b></span></td></tr>', '<tr><th scope="row">Hot larder</th><td><span class="hm-tp"><b>Ann</b> <small>break 13:00 to 13:30</small></span></td></tr><tr><th scope="row">Pans</th><td><span class="hm-tp"><b>Bo</b></span></td></tr>');
  h = sub(h, '<tr><th scope="row">Prep</th><td><span class="hm-tp"><b>Dev</b></span></td></tr>', '');
  h = h.split('Signed in as Ann').join('Signed in as Dev').split('<span class="wtop-av" aria-hidden="true">A</span>').join('<span class="wtop-av" aria-hidden="true">D</span>').split('<span class="wtop-lbl wtop-who-n">Ann</span>').join('<span class="wtop-lbl wtop-who-n">Dev</span>');
  return h;
}
function workPage(file, band, o) {
  o = o || {};
  let h = read(file);
  if (band) h = sub(h, EMPTY_BAND, band);
  if (o.day && o.day !== 'tue10') h = sub(h, '10 November 2026', DAYYMD[o.day]);
  if (o.rows) h = ordersRows(h, o.rows);
  return h;
}
function existingBand(file, day, fix) {
  let h = read(file);
  h = sub(h, '10 November 2026', DAYYMD[day]);
  fix.forEach(([a, b]) => { h = sub(h, a, b); });
  return h;
}
/* B's Orders tag: the existing function stock line (orderBody in js/functions.js) carries its state in words */
function ordersRows(h, rows) {
  const box = (h.match(/<button type="button" class="nb-box"[\s\S]*?<\/button>/) || [''])[0];
  const more = (h.match(/<button type="button" class="nb-more[\s\S]*?<\/button>/) || [''])[0];
  const li = rows.map((r, i) => '<li class="nb-row" data-ln="fs' + i + '">' + box.replace(/aria-label="[^"]*"/, 'aria-label="Ordered: ' + r.text + '"').replace(/data-id="[^"]*"/, 'data-id="fs' + i + '"') +
    '<span class="nb-main"><span class="nb-t">' + r.text + ' <span class="nb-q">' + r.qty + '</span><span class="nb-marks"><span class="fn-tag fn-t-order">' + r.tag + '</span></span><span class="nb-mk"></span></span>' +
    '<span class="nb-meta"><span class="ru-ometa">' + r.for + '</span> · ' + r.meta + '</span></span>' + more.replace(/aria-label="[^"]*"/, 'aria-label="More for ' + r.text + '"').replace(/data-id="[^"]*"/, 'data-id="fs' + i + '"') + '</li>').join('');
  h = sub(h, '<div class="nb-body o-main"><ul class="nb-rows">', '<div class="nb-body o-main"><ul class="nb-rows">' + li);
  return sub(h, '0 of 2 ordered', '0 of ' + (2 + rows.length) + ' ordered');
}
const STOCK = {
  smithToday: { text: 'Function stock: Smith 60th, Thu 12 Nov: 5 Antipasto, 5 Pizza', qty: '10 platters', tag: 'Order today', for: 'For Thu 12 Nov', meta: 'Gus' },
  jonesToday: { text: 'Function stock: Jones wedding, Sat 14 Nov: 6 Antipasto', qty: '6 platters', tag: 'Order today', for: 'For Sat 14 Nov', meta: 'Gus' },
  jonesLate: { text: 'Function stock: Jones wedding, Sat 14 Nov: 6 Antipasto', qty: '6 platters', tag: 'Not ordered yet', for: 'For Sat 14 Nov', meta: 'order day was Sun 8 Nov · Gus' }
};

/* ---------- Home slots for each state ---------- */
// Two functions in one week (C's handling): one card at a time, nearest first. Got it collapses the card in place to the
// line, which answers with Undo inside it, and the next card opens under it; after the last Got it the slot is the line.
// From 3 functions not yet seen, one combined card instead (busySlot).
function weekSlot(inS, inJ, st) {
  st = st || 'none';   // none: nothing got yet; smith: Smith got (Jones card open); both
  return homeLine({ f: S, more: 1, moreId: 'fma-more', moreHidden: st !== 'both' }, 'fma-line', st === 'none') +
    card(S, { id: 'hu-smith', inDays: inS, count: '1 of 2 this week', also: J, hidden: st !== 'none', got: { show: 'fma-line hu-jones', hide: 'fma-more' } }) +
    card(J, { id: 'hu-jones', inDays: inJ, count: '2 of 2', hidden: st !== 'smith', got: { show: 'fma-more', said: 'Got it: Jones wedding. Kept on Home in the Next function line, as 1 more this week.' } });
}
// a person on Prep or Orders on the shared tablet: Dev instead of Ann
function asDevWork(h) {
  h = sub(h, '<span class="wtop-av" aria-hidden="true">A</span>', '<span class="wtop-av" aria-hidden="true">D</span>');
  return h.split('Signed in as Ann').join('Signed in as Dev').split('wtop-who-n">Ann<').join('wtop-who-n">Dev<').split('Lunch: Hot larder').join('Lunch: Prep');
}
const BUSY3 = [S, LEE, J], BUSY5 = [S, LEE, J, FN.brown, FN.rotary], ALLSHEETS = ['smith', 'jones', 'lee', 'patel', 'brown', 'rotary', 'rob'];

const pages = [];
const out = (name, html) => { fs.writeFileSync(path.join(here, name), html); pages.push(name); };
/* ---------- the deliverable pages (Tue 10 Nov, 14:00) ---------- */
out('home.html', finish(homePage('home-staff.html', { slot: weekSlot('in 2 days', 'in 4 days'), drop: ['smith'] }), { title: 'Mix: Home, Ann, not seen yet' }));
// just after Got it on Smith 60th: the page taps Got it as it opens, so the line's own answer and Undo are live (9 s)
out('home-after.html', finish(homePage('home-staff.html', { slot: weekSlot('in 2 days', 'in 4 days'), drop: ['smith'] }), { title: 'Mix: Home, Ann, just after Got it', auto: 'hu-smith' }));
out('prep.html', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), { title: 'Mix: Prep, Ann', sims: true }));
// the fixed slot with a 37 character name (open with ?text=large or ?text=xlarge for the text size settings)
out('prep-long.html', finish(workPage('prep-staff.html', bandLine({ f: ROB, more: 1 })), { title: 'Mix: Prep, a long function name', sims: 'long', sheets: ALLSHEETS }));
out('orders.html', finish(workPage('orders-staff.html', bandLine({ f: S, more: 1 }), { rows: [STOCK.jonesLate] }), { title: 'Mix: Orders, Ann', sims: true }));
out('home-head-1280.html', finish(homePage('home-head-1280.html', { slot: weekSlot('in 2 days', 'in 4 days'), drop: ['smith'] }), { title: 'Mix: Home, head chef' }));
out('home-busy.html', finish(homePage('home-staff.html', { slot: busySlot(BUSY5), drop: ['smith', 'jones'] }), { title: 'Mix: Home, a busy week', sheets: ALLSHEETS }));

/* #/fn with Upcoming at 7 days (A), where "+1 more this week" goes */
(function () {
  let h = read('orders-staff.html');
  const a = h.indexOf('<div class="page">'), b = h.indexOf('<nav class="tabbar"');
  const cardF = f => '<li class="fn-card"><a href="#/fn/' + f.id + '" data-fn="open" data-id="' + f.id + '"><span class="fn-c0">Event ' + f.start + ' · ' + f.loc + ' · ' + f.guests + ' guests</span><span class="fn-c1"><b>' + f.name + '</b></span>' +
    '<span class="fn-c2">Food from ' + f.rounds[0][0] + (f.rounds.length > 1 ? ' · ' + f.rounds.length + ' rounds' : '') + '</span><span class="fn-c3">' + linesText(f) + ' (' + total(f) + ')</span>' +
    (f.notes ? '<span class="fn-cnote"><span class="fn-cnote-l">Notes</span> ' + f.notes + '</span>' : '') + '</a></li>';
  const day = f => '<div class="fn-day"><div class="fn-day-h"><h4>' + f.day + '</h4><button type="button" class="btn" data-fn="print-prep">Print prep sheet</button></div><ul class="fn-cards">' + cardF(f) + '</ul><div class="fn-dtot"><span class="label">To make for the day</span><ul>' +
    f.lines.map((l, i) => '<li><b>' + lineTot(f, i) + '</b> × ' + l[1] + '</li>').join('') + '</ul></div></div>';
  const page = '<div class="page fn-pg"><main id="main" class="fn-main"><section class="set-block fn-page fn-list-page"><h2 id="rtitle" tabindex="-1">Functions</h2><p class="hint">Confirmed functions and their platters.</p><p class="hint fn-fresh">Up to date, 14:00. Changes show here by themselves.</p>' +
    '<div class="fn-sec"><h3 class="fn-h fn-sec-h">Today <span class="fn-sec-d">Tue 10 Nov</span></h3><div class="btn-row fn-sec-acts"><button type="button" class="btn" disabled="">Print prep sheet</button></div><p class="hint">No functions on now.</p></div>' +
    '<div class="fn-sec"><h3 class="fn-h fn-sec-h">Upcoming functions <span class="fn-sec-d">the next 7 days</span></h3>' + day(S) + day(J) + '<p class="fn-quiet">Nothing booked on the other 5 days.</p><div class="btn-row"><button type="button" class="btn" data-fn="days">Show the next 14 days</button></div></div></section></main></div>';
  h = h.slice(0, a) + page + h.slice(b);
  h = sub(h, '<a href="#/orders" aria-current="page">', '<a href="#/orders">');
  out('fn-week.html', finish(h, { title: 'Mix: Functions, the next 7 days' }));
})();

/* ---------- run-up frames for a Thursday function, with Saturday's wedding in the same week ---------- */
const F = [];
const st = (name, html) => { F.push(name); fs.writeFileSync(path.join(stDir, name + '.html'), html); };
const fin = (o) => Object.assign({ state: true }, o);
const fixDayBefore = [['event 13:30', 'event 18:00']];
const fixOnDay = [['<span class="fn-due">14:10</span>', '<span class="fn-due">18:30</span>']];
// 7 to 5 days before (Sat 7 Nov): Smith in 5 days, Jones in 7, both in the week
st('d5-home', finish(homePage('home-staff.html', { day: 'sat7', slot: weekSlot('in 5 days', 'in 7 days'), drop: ['smith'] }), fin({ title: 'd5 Home' })));
st('d5-home-got', finish(homePage('home-staff.html', { day: 'sat7', slot: weekSlot('in 5 days', 'in 7 days', 'both'), drop: ['smith'] }), fin({ title: 'd5 Home after Got it' })));
st('d5-prep', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 }), { day: 'sat7' }), fin({ title: 'd5 Prep' })));
// order day (Sun 8 Nov): the band's own Order today lines (as today), Now and next's order rows, B's Order today tag
st('od-home', finish(homePage('home-staff.html', { day: 'sun8', slot: weekSlot('in 4 days', 'in 6 days'), drop: ['smith'], board: board(ORDER_ROWS) }), fin({ title: 'od Home' })));
st('od-home-got', finish(homePage('home-staff.html', { day: 'sun8', slot: weekSlot('in 4 days', 'in 6 days', 'both'), drop: ['smith'], board: board(ORDER_ROWS) }), fin({ title: 'od Home after Got it' })));
st('od-prep', finish(workPage('prep-staff.html', orderBand([S, J]), { day: 'sun8' }), fin({ title: 'od Prep' })));
st('od-orders', finish(workPage('orders-staff.html', orderBand([S, J]), { day: 'sun8', rows: [STOCK.smithToday, STOCK.jonesToday] }), fin({ title: 'od Orders' })));
// 2 days before (Tue 10 Nov): the deliverable pages
st('d2-home', finish(homePage('home-staff.html', { slot: weekSlot('in 2 days', 'in 4 days'), drop: ['smith'] }), fin({ title: 'd2 Home' })));
st('d2-home-got', finish(homePage('home-staff.html', { slot: weekSlot('in 2 days', 'in 4 days', 'both'), drop: ['smith'] }), fin({ title: 'd2 Home after Got it on both' })));
st('d2-prep', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), fin({ title: 'd2 Prep', sims: true })));
st('d2-orders', finish(workPage('orders-staff.html', bandLine({ f: S, more: 1 }), { rows: [STOCK.jonesLate] }), fin({ title: 'd2 Orders' })));
// the day before (Wed 11 Nov): C's short Function tomorrow card once for everyone; the band's Tomorrow line, as today
st('d1-home', finish(homePage('home-staff.html', { day: 'wed11', drop: ['smith'],
  slot: homeLine({ f: S, when: 'Tomorrow', more: 1 }, 'fma-line', true) + tomCard(S, { got: { show: 'fma-line' } }) }), fin({ title: 'd1 Home' })));
st('d1-home-got', finish(homePage('home-staff.html', { day: 'wed11', drop: ['smith'], slot: homeLine({ f: S, when: 'Tomorrow', more: 1 }) }), fin({ title: 'd1 Home after Got it' })));
st('d1-prep', finish(existingBand('prep-staff-day-before.html', 'wed11', fixDayBefore), fin({ title: 'd1 Prep' })));
// the day (Thu 12 Nov): no card; Now and next has the round; the line moves on to Saturday's wedding
st('d0-home', finish(homePage('home-staff.html', { day: 'thu12', drop: ['smith', 'jones'], board: board(DAY_ROWS), slot: homeLine({ f: J }) }), fin({ title: 'd0 Home' })));
st('d0-prep', finish(existingBand('prep-staff-on-the-day.html', 'thu12', fixOnDay), fin({ title: 'd0 Prep' })));
/* Got it, answered in place (the line's own words and Undo; held here so the frame shows the moment) */
st('s-two-2', finish(homePage('home-staff.html', { slot: weekSlot('in 2 days', 'in 4 days'), drop: ['smith'] }), fin({ title: 'Just after Got it on Smith 60th', auto: 'hu-smith', hold: true })));
st('s-two-3', finish(homePage('home-staff.html', { slot: weekSlot('in 2 days', 'in 4 days'), drop: ['smith'] }), fin({ title: 'Just after Got it on both', auto: 'hu-smith hu-jones', hold: true })));
/* the busy week: 3 and 5 functions not yet seen, one card, one Got it */
st('s-busy3-home', finish(homePage('home-staff.html', { slot: busySlot(BUSY3), drop: ['smith', 'jones'] }), fin({ title: 'Busy week, 3 functions', sheets: ALLSHEETS })));
st('s-busy3-got', finish(homePage('home-staff.html', { slot: busySlot(BUSY3), drop: ['smith', 'jones'] }), fin({ title: 'Busy week, 3, just after Got it', sheets: ALLSHEETS, auto: 'hu-week', hold: true })));
st('s-busy5-home', finish(homePage('home-staff.html', { slot: busySlot(BUSY5), drop: ['smith', 'jones'] }), fin({ title: 'Busy week, 5 functions', sheets: ALLSHEETS })));
st('s-busy5-settled', finish(homePage('home-staff.html', { slot: busySlot(BUSY5, true), drop: ['smith', 'jones'] }), fin({ title: 'Busy week, 5, after Got it', sheets: ALLSHEETS })));
/* the minus: its own key, for this person on this phone today; back for a different person on a shared device */
(function () {
  let h = finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), fin({ title: 'Prep, line hidden', slip: 'Hidden for you on this phone until tomorrow. Home still shows it.' }));
  st('s-hidden', sub(h, '<div class="fn-band fa-quiet" id="fn-band" role="region" aria-label="Next function" data-fma-lock>', '<div class="fn-band fa-quiet" id="fn-band" role="region" aria-label="Next function" data-fma-lock hidden="">'));
})();
st('s-hidden-dev', finish(asDevWork(workPage('prep-staff.html', bandLine({ f: S, more: 1 }))), fin({ title: 'Prep, Dev signs in after Ann hid the line' })));
// later changes while Prep is open: opened at 14:00 with the line, then the words change inside the same height
st('s-nosignal', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), fin({ title: 'Prep, signal lost while open', sims: true, sim: 'nosignal' })));
st('s-booking-after', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), fin({ title: 'Prep, booking arrives while open', sims: true, sim: 'booking' })));
st('s-booking-reopen', finish(workPage('prep-staff.html', orderBand([LEE])), fin({ title: 'Prep, opened again after the booking' })));
// a function booked for today while Prep is open: the lock breaks and the full band draws at once
st('s-today-after', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), fin({ title: 'Prep, a function booked for today while open', sims: true, sim: 'today' })));
// Home's slot keeps the same lock: a booking while Home is open changes the line's words only; its card waits for the next open
st('s-home-open-booking', finish(homePage('home-staff.html', { slot: weekSlot('in 2 days', 'in 4 days', 'both'), drop: ['smith'] }),
  fin({ title: 'Home open when a booking arrives', sim: 'home-booking', homeSims: homeSim('home-booking', { f: S, more: 2 }) })));
st('s-booking-home', finish(homePage('home-staff.html', { drop: ['smith'], board: board(LEE_ROWS),
  slot: homeLine({ f: S, more: 2, moreId: 'fma-more', moreHidden: true }) +
    card(LEE, { id: 'hu-lee', inDays: 'in 3 days', tag: '<span class="fn-tag fn-t-new">Booked today</span>', got: { show: 'fma-more', said: 'Got it: Lee engagement. Kept on Home in the Next function line, as 2 more this week.' } }) }), fin({ title: 'Home at the next open, booked inside the week' })));
st('s-midnight-after', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), fin({ title: 'Prep open across midnight', sims: true, sim: 'midnight' })));
// cancelled: the red card once for people who were told; the line says Cancelled · Do not prep to everyone until the date passes
st('s-cancelled-home', finish(homePage('home-staff.html', { drop: ['smith'], slot: offCard(S, { got: { line: 'fma-line', show: 'fma-line', said: 'Got it: Smith 60th is cancelled. Do not prep for it. The line on Home still says so.' } }) +
  homeLine({ f: S, more: 1, state: 'cancelled' }, 'fma-line', true) }), fin({ title: 'Home, cancelled after Got it' })));
st('s-cancelled-untold', finish(homePage('home-staff.html', { dev: true, drop: ['smith'], slot: homeLine({ f: S, more: 1, state: 'cancelled' }) }), fin({ title: 'Home, cancelled, Dev was never told' })));
st('s-cancelled-prep', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), fin({ title: 'Prep, cancelled while open', sims: true, sim: 'cancelled' })));
st('s-cancelled-wed-prep', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1, state: 'cancelled' }), { day: 'wed11' }), fin({ title: 'Prep the next day, still cancelled' })));
// the 37 character name cancelled while Prep is open, at extra-large text
st('s-long-cancelled-xl', finish(workPage('prep-staff.html', bandLine({ f: ROB, more: 1 })), fin({ title: 'Prep, long name cancelled while open, extra-large text', sims: 'long', sim: 'cancelled', text: 'xlarge', sheets: ALLSHEETS })));
st('s-changed-home', finish(homePage('home-staff.html', { drop: ['smith'],
  slot: homeLine({ f: Object.assign({}, S, { guests: 72 }), more: 1 }, 'fma-line', true) +
    card(Object.assign({}, S, { guests: 72, food: '19:00 and 19:45' }), { id: 'hu-chg', inDays: 'in 2 days', tag: '<span class="fn-tag fn-t-new">Changed 11:20</span>', ins: { food: 1 },
      chg: '<ul class="fn-hu-chg" aria-label="Changed since you tapped Got it"><li>Guests 60 to 72 <span>· Gus, Tue 11:20</span></li><li>Service times changed <span>· Gus, Tue 11:20</span></li></ul>',
      foot: 'Back once because it changed after your Got it on Sat 7 Nov.', got: { show: 'fma-line', said: 'Got it: Smith 60th, as changed. Kept on Home as one line.' } }) }), fin({ title: 'Home, changed after Got it' })));
st('s-handover-dev', finish(homePage('home-staff.html', { dev: true, slot: weekSlot('in 2 days', 'in 4 days'), drop: ['smith'] }), fin({ title: 'Shared tablet, Dev signs in' })));

/* ---------- the run-up sheet ---------- */
const frame = (name, cap, sub2) => '<figure class="cf"><figcaption><b>' + cap + '</b>' + (sub2 ? '<span>' + sub2 + '</span>' : '') + '</figcaption><iframe src="states/' + name + '.html" width="390" height="844" loading="eager" title="' + cap + '"></iframe></figure>';
const row = (h2, p, frames) => '<section class="cr"><h2>' + h2 + '</h2>' + (p ? '<p class="cr-p">' + p + '</p>' : '') + '<div class="cr-f">' + frames.join('') + '</div></section>';
const runup = '<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mix run-up</title>' +
  '<link rel="stylesheet" href="../../order-list-options/assets/fonts.css"><style>' +
  ':root{--ink:#1C1D1F;--muted:#55585E;--paper:#FBF8F1;--small-ink:#B83F15}body{margin:0;background:#E9E4D8;color:var(--ink);font:16px/1.4 Barlow,system-ui,sans-serif}' +
  'header.top{padding:24px 32px 8px}header.top h1{margin:0;font:700 2rem/1.1 "Barlow Condensed",sans-serif}header.top p{margin:6px 0 0;max-width:72rem;color:var(--muted)}' +
  '.cr{padding:16px 32px 8px;border-top:2px solid #CFC8B8}.cr h2{margin:0;font:700 1.35rem "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--small-ink)}.cr-p{margin:4px 0 0;max-width:74rem}' +
  '.cr-f{display:flex;flex-wrap:wrap;gap:20px;margin-top:12px}@media (max-width:520px){header.top,.cr{padding-left:0;padding-right:0}.cf{width:100%}.cf iframe{width:100%}}.cf{margin:0;width:390px}.cf figcaption{min-height:4.4em;margin-bottom:6px;font-size:.92rem}.cf figcaption b{display:block}.cf figcaption span{color:var(--muted)}' +
  '.cf iframe{display:block;border:0;border-radius:18px;box-shadow:0 0 0 6px #2B2A27,0 8px 18px rgba(0,0,0,.25);background:#fff}</style></head><body>' +
  '<header class="top"><h1>The recommended mix: the run-up to a Thursday function</h1><p>Preview only, synthetic data. Revised after the focused review (10 Nov 2026). Smith 60th, Thu 12 Nov (order day Sun 8 Nov), and Jones wedding, Sat 14 Nov, in the same week. Each phone is a 390 x 844 frame of a static page built from the real app\'s snapshot with css/app.css. ' +
  'Home: C\'s Function this week card directly under Your day; Got it collapses it in place to A\'s quiet Next function line, which answers with Undo inside it. Work pages: A\'s line in the band\'s slot only on days the band would be empty, sized when the page opens for its tallest words (B\'s open-only rule). Orders: B\'s tag inside the existing function stock line.</p></header>' +
  row('7 to 5 days before (here Sat 7 Nov)', 'The card starts 7 days before (or when a function is booked inside the week). Jones wedding is 7 days away, so the card says 1 of 2.', [
    frame('d5-home', 'Home, not seen yet', 'Function this week, under Your day: day, times, guests, platters, dietaries, place'),
    frame('d5-home-got', 'Home, after Got it on both', 'One quiet line with a chevron in the same spot; +1 more this week opens Functions'),
    frame('d5-prep', 'Prep', 'The band would be empty: the Next function line, sized at open')]) +
  row('Order day (Sun 8 Nov)', 'The band\'s own Order today lines and Now and next\'s order rows, exactly as today. The Next function line steps aside. Orders: B\'s Order today tag inside the stock line.', [
    frame('od-home', 'Home, not seen yet', 'Your day, the card, then On with you; Now and next keeps the order rows'),
    frame('od-home-got', 'Home, after Got it', 'The line; the order rows as today'),
    frame('od-prep', 'Prep', 'As today: the band\'s Order today lines (charcoal)'),
    frame('od-orders', 'Orders', 'The two function stock lines carry Order today, in ink words')]) +
  row('2 days before (Tue 10 Nov, today)', 'Today\'s blind spot. Home tells each person once; the work pages carry one quiet line.', [
    frame('d2-home', 'Home, Ann, not seen yet', 'home.html'),
    frame('d2-home-got', 'Home, after Got it on both', 'The function never drops back to Coming up'),
    frame('d2-prep', 'Prep', 'prep.html: one line, 6 rows to 5'),
    frame('d2-orders', 'Orders', 'Jones stock line not ticked: Not ordered yet · For Sat 14 Nov · order day was Sun 8 Nov')]) +
  row('The day before (Wed 11 Nov)', 'C\'s short Function tomorrow card, once for everyone, even after the first Got it (whether a week Got it skips it is the head chef\'s choice). The band\'s Tomorrow line on the work pages, as today.', [
    frame('d1-home', 'Home, Function tomorrow', '"Everyone sees this once, the day before. Got it hides it only for you."'),
    frame('d1-home-got', 'Home, after Got it', 'The line says Tomorrow'),
    frame('d1-prep', 'Prep', 'As today: the band\'s Tomorrow line (113 px)')]) +
  row('The day (Thu 12 Nov)', 'No card. Now and next, the band, the platter prep lines and the service view take over, as today.', [
    frame('d0-home', 'Home', 'Now and next has the round; the line moves on to Saturday\'s wedding'),
    frame('d0-prep', 'Prep', 'As today: the band with the round')]) +
  row('Got it answers in place (two functions)', 'One card at a time, nearest first. Got it collapses the card to the line, and the line itself says "Got it. Kept here as one line" with Undo inside it for 9 s. No slip at the bottom of Home, so the next card\'s Got it and Open the function are clear.', [
    frame('d2-home', 'First open: Smith 60th, 1 of 2', 'Also this week names Saturday at 0 taps'),
    frame('s-two-2', 'Just after Got it on Smith 60th', 'home-after.html: the line answers; Jones wedding 2 of 2 opens under it, nothing over it'),
    frame('s-two-3', 'Just after Got it on Jones wedding', 'The same line answers again; then +1 more this week')]) +
  row('A busy week: 3 or more functions not yet seen', 'One card, one compact row per function (day, name, guests, first food time, platters, dietaries shortened), one Got it for all. Each row opens its function. Got it collapses it to the line with +N more this week.', [
    frame('s-busy3-home', '3 functions this week', 'Thu, Fri, Sat: one card'),
    frame('s-busy3-got', 'Just after Got it', 'The line answers; +2 more this week after'),
    frame('s-busy5-home', '5 functions this week', 'Thu to Mon: one card, one Got it'),
    frame('s-busy5-settled', 'After Got it', 'One line, +4 more this week; On with you back on the first screen')]) +
  row('Two ways to put it away, never on the same page', 'Got it is on Home only: this person, this card, until the day before. The minus is on the work pages only: this person, on this phone, today only. It has its own key (lk.fn.ahead.fold), so it never hides a later Order today or Tomorrow band, and it comes back when a different person signs in.', [
    frame('s-two-2', 'Got it (Home)', '"Got it. Kept here as one line", Undo inside the line'),
    frame('s-hidden', 'The minus (Prep, Ann)', '"Hidden for you on this phone until tomorrow. Home still shows it." Undo'),
    frame('s-hidden-dev', 'Dev signs in on the same tablet', 'The line is back for him: nothing moves for Ann\'s hide')]) +
  row('Changes while Prep is open (B\'s open-only rule)', 'An open is a route change, the app coming back on screen, a PIN unlock after an idle or daily lock, or a reload. At an open the slot is sized for the tallest words it can become at the current text size. Later data changes its words only.', [
    frame('d2-prep', '14:00, Prep opens', 'Next function line, sized at open'),
    frame('s-booking-after', '14:05, Lee engagement booked on another phone', 'Short notice: Order today first, same height, the list does not move'),
    frame('s-booking-reopen', 'Prep opened again', 'Now the band\'s own Order today line, as today'),
    frame('s-today-after', 'A function booked for TODAY while Prep is open', 'The one exception: the full band draws at once, because a missed round is the mistake the band exists to stop')]) +
  row('Home keeps the same lock', 'A card never inserts itself while Home is on screen: only the line\'s words change. The card appears at the next open.', [
    frame('d2-home-got', '14:00, Home open after Got it on both', 'The line, +1 more this week'),
    frame('s-home-open-booking', '14:05, Lee engagement booked while Home is open', 'Words only: +2 more this week. On with you does not move'),
    frame('s-booking-home', 'Home at the next open', 'The Booked today card under the line')]) +
  row('No signal, midnight and a long name, at the fixed height', 'The status words come first and never wrap or cut; only the name shortens.', [
    frame('s-nosignal', 'Signal lost while Prep is open', 'No signal · updated 13:52'),
    frame('s-midnight-after', 'Prep left open across midnight (Wed 00:01)', 'Tomorrow first; the full Tomorrow band shows at the next open'),
    frame('s-long-cancelled-xl', 'A 37 character name cancelled while open, extra-large text', 'Cancelled · Do not prep in full; the name ends in an ellipsis')]) +
  row('Cancelled and changed', 'The red card comes back once, only to people who were told. The line says Cancelled · Do not prep to everyone until the function\'s date passes.', [
    frame('s-cancelled-home', 'Cancelled after Got it (Home)', 'Red with words; a plain Got it, not orange'),
    frame('s-cancelled-untold', 'Cancelled, Dev was never told', 'No red card; the line says Cancelled · Do not prep'),
    frame('s-cancelled-prep', 'Cancelled while Prep is open', 'Cancelled · Do not prep, same height'),
    frame('s-cancelled-wed-prep', 'Prep the next day (Wed 11 Nov)', 'Still Cancelled · Do not prep until Thu 12 Nov passes'),
    frame('s-changed-home', 'Changed after Got it (Home)', 'Back once, tagged Changed 11:20, with the change words')]) +
  row('Shared tablet handover', 'Got it is kept per person on the phone (lk.fn.hu.<staff id>). The work-page line belongs to the band\'s slot, so a handover never changes Prep\'s height.', [
    frame('d2-home-got', 'Ann taps Got it, then locks', 'Her Home: the line'),
    frame('s-handover-dev', 'Dev types his PIN on the same tablet', 'His own Home: the card, 1 of 2 (he has not seen it)'),
    frame('d2-prep', 'Prep, for either of them', 'The same line: nothing moves on handover')]) +
  '</body></html>';
fs.writeFileSync(path.join(here, 'runup.html'), runup);
module.exports = { pages, frames: F };
if (require.main === module) console.log('built', pages.length, 'pages and', F.length, 'frames');
