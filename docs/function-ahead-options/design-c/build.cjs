/* Design C preview builder (functions ahead of time, round 2, 10 Nov 2026). Preview only: no app file changes.
   Starts from the static snapshots of the real app in ../baseline/ (real css/app.css, bundled fonts), adds the
   Function heads-up card and its states, and writes the pages in this folder and the run-up frames in states/.
   Synthetic data only: today is Tue 10 Nov 2026, 14:00 Queensland. Run by capture.cjs, or: node build.cjs */
const fs = require('fs'), path = require('path');
const here = __dirname, baseDir = path.join(here, '..', 'baseline'), stDir = path.join(here, 'states');
fs.mkdirSync(stDir, { recursive: true });
const CSS = fs.readFileSync(path.join(here, 'src/c.css'), 'utf8'), JS = fs.readFileSync(path.join(here, 'src/c.js'), 'utf8');
const snap = n => fs.readFileSync(path.join(baseDir, n + '.html'), 'utf8');

/* ---------- synthetic functions ---------- */
const SMITH = { id: 'smith', name: 'Smith 60th', day: 'Thu 12 Nov', loc: 'Function room', guests: '60 guests', event: '18:00', food: '18:30 and 19:15', rounds: 2,
  platters: '5 Antipasto, 5 Pizza (10)', tot: 10, diet: '4 gluten free, 1 nut allergy' };
const JONES = { id: 'jones', name: 'Jones wedding', day: 'Sat 14 Nov', loc: 'Beer garden', guests: '90 guests', event: '17:00', food: '18:00', rounds: 1,
  platters: '6 Antipasto (6)', tot: 6, diet: 'None entered' };
const LEE = { id: 'lee', name: 'Lee engagement', day: 'Fri 13 Nov', loc: 'Function room', guests: '40 guests', event: '19:00', food: '19:30', rounds: 1,
  platters: '4 Antipasto (4)', tot: 4, diet: '2 vegan' };

const CAL = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/></svg>';
const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------- the card ---------- */
function facts(f, ins) {
  ins = ins || {};
  const v = (k, t) => ins[k] ? '<ins>' + t + '</ins>' : t;
  return '<dl class="fn-hu-facts">' +
    '<div><dt>Food out</dt><dd>' + v('food', f.food) + (f.rounds > 1 ? ' (' + f.rounds + ' rounds)' : '') + '</dd></div>' +
    '<div><dt>Platters</dt><dd>' + v('platters', f.platters) + '</dd></div>' +
    '<div><dt>Dietaries</dt><dd>' + v('diet', f.diet) + '</dd></div></dl>';
}
function doneLine(text) {
  return '<p class="fn-hu-done" role="status"><span>' + TICK + text + '</span><button type="button" class="p-link" data-hu="undo">Undo</button></p>';
}
/* o: id, inDays, count, also, next, done, sig, chef, seen (open), hidden, tag, sub, chg, ins, foot */
function card(f, o) {
  const right = o.tag || (o.count ? '<span class="fn-hu-n">' + o.count + '</span>' : '');
  const seen = o.chef ? seenBox(o.seen) : '';
  return '<section class="hm-paper fn-hu" id="' + o.id + '" data-hu-card data-hu-open aria-labelledby="' + o.id + '-h"' + (o.hidden ? ' hidden' : '') + '>' +
    (o.done || '') +
    '<div class="hm-ph"><h3 class="hm-pt" id="' + o.id + '-h">Function heads-up</h3>' + right + '</div>' +
    '<div class="fn-hu-cols"><div>' +
    '<p class="fn-hu-when">' + f.day + ' · ' + o.inDays + '</p>' +
    '<p class="fn-hu-name">' + f.name + '</p>' +
    '<p class="fn-hu-sub">' + (o.sub || f.loc + ' · ' + f.guests + ' · event ' + f.event) + '</p>' +
    (o.chg || '') + facts(f, o.ins) +
    '<div class="fn-hu-act"><button type="button" class="btn dark fn-hu-got" data-hu="got" data-next="' + (o.next || 'hu-done') + '">Got it</button>' +
    (o.chef && !o.seen ? '<button type="button" class="btn" data-hu="seen">Who has seen it</button>' : '') +
    '<a class="fn-hu-open" href="#/fn/' + f.id + '">Open the function</a></div>' +
    (o.also ? '<p class="fn-hu-also">Also this week: <b>' + o.also.day + '</b> ' + o.also.name + '</p>' : '') +
    (o.sig || '<p class="fn-hu-foot">' + (o.foot || 'Got it puts this away for you until the day before.') + '</p>') +
    '</div>' + seen + '</div></section>';
}
function seenBox(open) {
  return '<div class="fn-hu-seen" aria-live="polite"' + (open ? '' : ' hidden') + '><div class="fn-hu-seen-h"><b>Who has seen it</b><span>Checked 14:00</span></div>' +
    '<p><span class="fn-hu-k">Seen 4 of 7</span> Ann, Cleo, Dev, Fern</p>' +
    '<p><span class="fn-hu-k">Not yet</span> Eli, Gus, Hana</p>' +
    '<p class="hint">Seen means they tapped Got it. Not yet still get it on Home, and on the day before.</p>' +
    '<button type="button" class="p-link">Check again</button></div>';
}
function doneCard(text, id) {
  return '<section class="hm-paper fn-hu is-done" id="' + (id || 'hu-done') + '" data-hu-card hidden>' + doneLine(text) + '</section>';
}
function tomCard(f, o) {
  o = o || {};
  return '<section class="hm-paper fn-hu is-tom" id="hu-tom" data-hu-card data-hu-open aria-labelledby="hu-tom-h">' +
    '<div class="hm-ph"><h3 class="hm-pt" id="hu-tom-h">Function heads-up</h3><span class="fn-tag fn-t-tom">Tomorrow</span></div>' +
    '<p class="fn-hu-name">' + f.name + ' <span class="fn-hu-n">' + f.day + '</span></p>' +
    '<p class="fn-hu-line">Food ' + f.food + ' · ' + f.tot + ' platters · ' + f.loc + '</p>' +
    '<p class="fn-hu-line">Dietaries: ' + f.diet + '</p>' +
    '<div class="fn-hu-act"><button type="button" class="btn dark fn-hu-got" data-hu="got" data-next="hu-tom-done">Got it</button><a class="fn-hu-open" href="#/fn/' + f.id + '">Open the function</a></div>' +
    '</section>' + doneCard('Got it: ' + f.name + ', tomorrow. It is on the work pages tomorrow.', 'hu-tom-done');
}
function offCard() {
  return '<section class="hm-paper fn-hu is-off" id="hu-off" data-hu-card data-hu-open aria-labelledby="hu-off-h">' +
    '<div class="hm-ph"><h3 class="hm-pt" id="hu-off-h">Function heads-up</h3><span class="fn-tag fn-t-off">Cancelled</span></div>' +
    '<p class="fn-hu-when">Thu 12 Nov</p><p class="fn-hu-name"><s>Smith 60th</s></p>' +
    '<p class="fn-hu-sub"><b>Cancelled.</b> Do not prep or order for it. Its platters are off the prep and order lists.</p>' +
    '<div class="fn-hu-act"><button type="button" class="btn dark fn-hu-got" data-hu="got" data-next="hu-done">Got it</button></div>' +
    '<p class="fn-hu-foot">Cancelled by Bo, Tue 10 Nov 11:20. You had the heads-up on Sat 7 Nov.</p></section>' +
    doneCard('Got it: Smith 60th is cancelled.');
}

/* ---------- page parts ---------- */
const BOARD_EMPTY = '<section class="hm-board" id="hm-board" aria-labelledby="hm-board-h" hidden=""></section>';
function board(rows) {
  return '<section class="hm-board" id="hm-board" aria-labelledby="hm-board-h"><div class="hm-bh"><h3 class="hm-bt" id="hm-board-h">Now and next</h3><b class="hm-clock">14:00</b></div><ul class="hm-rows">' +
    rows.map(r => '<li><button type="button" class="hm-a' + (r.hot ? ' is-hot' : '') + '" data-fn="open" data-id="' + r.id + '" aria-haspopup="dialog"><span class="hm-i" aria-hidden="true">' + CAL + '</span><span class="hm-w"><b class="hm-t">' + r.title + '</b><small class="hm-s">' + r.sub + '</small></span><span class="hm-r">' + (r.time ? '<b class="hm-tm">' + r.time + '</b>' : '') + '<small class="hm-n">' + r.note + '</small></span></button></li>').join('') +
    '</ul></section>';
}
const ORDER_ROWS = [
  { id: 'smith', title: 'Order the stock for Smith 60th', sub: 'Thu 12 Nov · 5 × Antipasto, 5 × Pizza', note: 'Today' },
  { id: 'jones', title: 'Order the stock for Jones wedding', sub: 'Sat 14 Nov · 6 × Antipasto', note: 'Today' }];
const DAY_ROWS = [{ id: 'smith', title: 'Smith 60th', sub: 'Round 1 of 2 · 3 × Antipasto, 2 × Pizza', time: '18:30', note: 'Round 1' }];
const FN_BAND_EMPTY = '<div class="fn-band" id="fn-band" role="region" aria-label="Functions" hidden=""></div>';
function orderBand() {
  const row = (f, what) => '<li class="fn-li"><button type="button" class="fn-row is-soon" data-fn="open" data-id="' + f.id + '" aria-haspopup="dialog"><span class="fn-r2"><span class="fn-tag fn-t-order">Order today</span> Stock for <b>' + f.name + '</b>, ' + f.day + ': ' + what + '. It is on the order list.</span></button></li>';
  return '<div class="fn-band" id="fn-band" role="region" aria-label="Functions"><div class="fn-band-top"><h2 class="fn-band-h">Functions coming up</h2><button type="button" class="fn-fold" data-fn="fold" aria-expanded="true" aria-label="Hide functions" title="Hide">−</button></div><ul class="fn-list">' +
    row(SMITH, '5 × Antipasto, 5 × Pizza (10)') + row(JONES, '6 × Antipasto (6)') + '</ul></div>';
}
const LAND_BASE = '<ul><li><b>Thu 12 Nov</b> Smith 60th, food 18:30, 10 platters</li><li><b>Sat 14 Nov</b> Jones wedding, food 18:00, 6 platters</li></ul>';
const LAND = {
  base: LAND_BASE,
  tom: '<ul><li><b>Tomorrow</b> Smith 60th, food 18:30, 10 platters</li><li><b>Sat 14 Nov</b> Jones wedding, food 18:00, 6 platters</li></ul>',
  day: '<ul><li><b>Sat 14 Nov</b> Jones wedding, food 18:00, 6 platters</li></ul>',
  lee: '<ul><li><b>Thu 12 Nov</b> Smith 60th, food 18:30, 10 platters</li><li><b>Fri 13 Nov</b> Lee engagement, food 19:30, 4 platters</li><li><b>Sat 14 Nov</b> Jones wedding, food 18:00, 6 platters</li></ul>',
  off: '<ul><li><b>Sat 14 Nov</b> Jones wedding, food 18:00, 6 platters</li></ul>'
};
function bellSheet(who, dateLong, items) {
  const li = (f, when) => '<li class="nt-i t-function is-new"><span class="visually-hidden">New. </span><span class="nt-dot" aria-hidden="true"></span><div class="nt-w"><p><b>' + f.name + '</b>, ' + f.day + ' · ' + when + '</p>' +
    '<p>' + f.loc + ' · ' + f.guests + ' · food ' + f.food + ' · ' + f.platters + ' · Dietaries: ' + f.diet + '</p><span class="nt-meta"><span class="nt-tag">Function</span> Everyone · on Home until Got it</span></div><time class="nt-at">' + f.day.slice(0, 3) + '</time></li>';
  return '<div class="nt-wrap c-sheet" hidden><div class="nt-bg" data-c="close"></div><section class="nt" role="dialog" aria-modal="true" aria-labelledby="nt-h"><div class="nt-grip" aria-hidden="true"></div><div class="nt-in">' +
    '<header class="nt-head"><span class="nt-eb">' + who + '</span><h2 class="nt-h" id="nt-h">Today\'s shift pings</h2><span class="nt-date">' + dateLong + '</span></header><div class="nt-body">' +
    '<h3 class="nt-sh c-sh1">Function heads-up</h3><ul class="nt-list">' + items.map(x => li(x[0], x[1])).join('') + '</ul>' +
    '<h3 class="nt-sh">Pings</h3><p class="nt-none">No pings right now. Each ping is on for 30 minutes, then it is gone.</p></div>' +
    '<footer class="nt-foot"><button type="button" class="nt-got" data-c="close" data-got="1">Got it</button><button type="button" class="nt-later" data-c="close">Close</button></footer></div></section></div>';
}
function fnSheet() {
  return '<div class="fn-pop"><div class="fn-pop-bg"></div><section class="fn-sheet" role="dialog" aria-modal="true" aria-labelledby="fn-sh-h" tabindex="-1"><div class="fn-grip" aria-hidden="true"></div>' +
    '<header class="fn-sheet-top"><div class="fn-sheet-t"><span class="fn-eb">Function</span><h2 id="fn-sh-h">Smith 60th</h2></div><button type="button" class="fn-close">Close</button></header><div class="fn-sheet-body">' +
    '<p class="fn-sub">Thu 12 Nov · Function room · event 18:00 · 60 guests</p>' +
    '<section class="fn-whole" aria-label="Whole function"><h3 class="fn-whole-h">Whole function <b>10 platters</b></h3><p class="fn-whole-s">All 2 rounds added up.</p><ul class="fn-whole-list"><li><b>5</b> × Antipasto Platter</li><li><b>5</b> × Pizza Platter</li></ul></section>' +
    '<section class="fn-hu-sh" aria-labelledby="fn-hu-sh-h"><h3 class="fn-h" id="fn-hu-sh-h">Heads-up</h3><p class="fn-text">On everyone\'s Home from Thu 5 Nov until they tap Got it, and again on Wed 11 Nov, the day before.</p>' + seenBox(true) + '</section>' +
    '<h3 class="fn-h">Service and dietary notes</h3><p class="fn-text">4 gluten free, 1 nut allergy.</p></div></section></div>';
}

/* ---------- assemble ---------- */
const DAYS = {
  sat7: { long: 'Saturday 7 November', ymd: '7 November 2026' }, sun8: { long: 'Sunday 8 November', ymd: '8 November 2026' },
  tue10: { long: 'Tuesday 10 November', ymd: '10 November 2026' }, wed11: { long: 'Wednesday 11 November', ymd: '11 November 2026' },
  thu12: { long: 'Thursday 12 November', ymd: '12 November 2026' }
};
function make(src, o) {
  let h = snap(src);
  const deep = !!o.state;
  h = h.replace('<base href="../../../">', '<base href="' + (deep ? '../../../../' : '../../../') + '">');
  h = h.replace('<title>Leichhardt Kitchen Book</title>', '<title>' + (o.title || 'Design C preview') + '</title>');
  if (o.scroll) h = h.replace('<html lang="en-AU"', '<html lang="en-AU" data-c-scroll="' + o.scroll + '"');
  const d = DAYS[o.day || 'tue10'];
  h = h.replace('<span data-home-date="">Tuesday 10 November</span>', '<span data-home-date="">' + d.long + '</span>');
  h = h.replace(/<span class="nb-date">10 November 2026<\/span>/g, '<span class="nb-date">' + d.ymd + '</span>');
  if (o.bell) h = h.replace('class="wtop-btn nbell"', 'class="wtop-btn nbell has-new"');
  if (o.card) h = h.replace('<div id="fn-check" hidden=""></div>', '<div id="fn-check" hidden=""></div>' + o.card);
  if (o.board) h = h.replace(BOARD_EMPTY, o.board);
  if (o.band) h = h.replace(FN_BAND_EMPTY, o.band);
  if (o.land) h = h.replace(LAND_BASE, LAND[o.land]);
  if (o.fix) h = o.fix(h);
  const tail = (o.sheet || '') + '<script>' + JS + '</script>';
  h = h.replace('</head>', '<style>\n' + CSS + '\n</style>\n</head>').replace(/<\/body>\s*<\/html>\s*$/, tail + '</body></html>');
  const file = deep ? path.join(stDir, o.state + '.html') : path.join(here, o.out);
  fs.writeFileSync(file, h);
  return file;
}
// the day-before and on-the-day snapshots carry a test fixture's times; keep the synthetic Smith 60th's
const fixDayBefore = h => h.replace('event 13:30 · food 18:30', 'event 18:00 · food 18:30 and 19:15');
const fixOnDay = h => h.replace('<span class="fn-due">14:10</span>', '<span class="fn-due">18:30</span>');

/* the two-function week, as Ann first sees it on Tuesday */
const weekCards = (day, inS, inJ, extra) =>
  card(SMITH, Object.assign({ id: 'hu-smith', inDays: inS, count: '1 of 2 this week', also: JONES, next: 'hu-jones' }, extra || {})) +
  card(JONES, Object.assign({ id: 'hu-jones', inDays: inJ, count: '2 of 2', next: 'hu-done', hidden: true,
    done: doneLine('Got it: Smith 60th. It stays in Coming up.') }, extra || {})) +
  doneCard('Got it: Jones wedding. Both stay in Coming up.');

const pages = [];
// main pages
pages.push(make('home-staff', { out: 'home.html', title: 'Design C: Home, staff', card: weekCards('tue10', 'in 2 days', 'in 4 days') }));
pages.push(make('prep-staff', { out: 'prep.html', title: 'Design C: Prep, staff', bell: true, sheet: bellSheet('Ann', 'Tuesday 10 November', [[SMITH, 'in 2 days'], [JONES, 'in 4 days']]) }));
pages.push(make('orders-staff', { out: 'orders.html', title: 'Design C: Orders, staff', bell: true, sheet: bellSheet('Ann', 'Tuesday 10 November', [[SMITH, 'in 2 days'], [JONES, 'in 4 days']]) }));
pages.push(make('home-head-1280', { out: 'home-head-1280.html', title: 'Design C: Home, head chef',
  card: card(SMITH, { id: 'hu-smith', inDays: 'in 2 days', count: '1 of 2 this week', also: JONES, next: 'hu-jones', chef: true, seen: true,
    foot: 'Got it puts this away for you until the day before. Who has seen it stays on the function sheet.' }) +
    card(JONES, { id: 'hu-jones', inDays: 'in 4 days', count: '2 of 2', next: 'hu-done', hidden: true, chef: true, done: doneLine('Got it: Smith 60th. It stays in Coming up.') }) +
    doneCard('Got it: Jones wedding. Both stay in Coming up.') }));

// run-up frames for a Thursday function (Smith 60th, Thu 12 Nov; its order day is Sun 8 Nov)
const F = [];
const st = (name, src, o) => { F.push(name); make(src, Object.assign({ state: name, title: 'Design C frame: ' + name }, o)); };
st('d5-home-new', 'home-staff', { day: 'sat7', card: weekCards('sat7', 'in 5 days', 'in 7 days') });
st('d5-home-got', 'home-staff', { day: 'sat7' });
st('d5-prep', 'prep-staff', { day: 'sat7', bell: true });
st('od-home-new', 'home-staff', { day: 'sun8', card: weekCards('sun8', 'in 4 days', 'in 6 days'), board: board(ORDER_ROWS) });
st('od-home-got', 'home-staff', { day: 'sun8', board: board(ORDER_ROWS) });
st('od-prep', 'prep-staff', { day: 'sun8', band: orderBand() });
st('d2-home-new', 'home-staff', { day: 'tue10', card: weekCards('tue10', 'in 2 days', 'in 4 days') });
st('d2-home-got', 'home-staff', { day: 'tue10' });
st('d2-prep', 'prep-staff', { day: 'tue10', bell: true });
st('d1-home-tom', 'home-staff', { day: 'wed11', card: tomCard(SMITH), land: 'tom' });
st('d1-home-got', 'home-staff', { day: 'wed11', land: 'tom' });
st('d1-prep', 'prep-staff-day-before', { day: 'wed11', fix: fixDayBefore });
st('d0-home', 'home-staff', { day: 'thu12', board: board(DAY_ROWS), land: 'day' });
st('d0-prep', 'prep-staff-on-the-day', { day: 'thu12', fix: fixOnDay });
// added states
st('s-got-next', 'home-staff', { card: card(SMITH, { id: 'hu-smith', inDays: 'in 2 days', count: '1 of 2 this week', also: JONES, next: 'hu-jones', hidden: true }) +
  card(JONES, { id: 'hu-jones', inDays: 'in 4 days', count: '2 of 2', next: 'hu-done', done: doneLine('Got it: Smith 60th. It stays in Coming up.') }) +
  doneCard('Got it: Jones wedding. Both stay in Coming up.') });
st('s-done', 'home-staff', { card: '<section class="hm-paper fn-hu is-done" id="hu-done" data-hu-card>' + doneLine('Got it: Jones wedding. Both stay in Coming up.') + '</section>' });
st('s-later', 'home-staff', { scroll: '#hm-up-h' });
st('s-nosignal', 'home-staff', { card: weekCards('tue10', 'in 2 days', 'in 4 days', { sig: '<p class="fn-hu-sig" role="status">No signal. Functions last updated 13:52.</p>' }) });
st('s-changed', 'home-staff', { card: card(Object.assign({}, SMITH, { guests: '72 guests', food: '19:00 and 19:45' }), { id: 'hu-chg', inDays: 'in 2 days',
  tag: '<span class="fn-tag fn-t-new">Changed 11:20</span>', next: 'hu-done', ins: { food: 1 },
  chg: '<ul class="fn-hu-chg" aria-label="Changed since you tapped Got it"><li>Guests 60 to 72 <span>· Bo, Tue 11:20</span></li><li>Service times changed <span>· Bo, Tue 11:20</span></li></ul>',
  foot: 'Back because it changed after your Got it on Sat 7 Nov.' }) + doneCard('Got it: Smith 60th, as changed.') });
st('s-cancelled', 'home-staff', { card: offCard(), land: 'off' });
st('s-short', 'home-staff', { card: card(LEE, { id: 'hu-lee', inDays: 'in 3 days', tag: '<span class="fn-tag fn-t-new">Booked today</span>', next: 'hu-done' }) +
  doneCard('Got it: Lee engagement. It stays in Coming up.'), land: 'lee',
  board: board([{ id: 'lee', title: 'Order the stock for Lee engagement', sub: 'Fri 13 Nov · 4 × Antipasto', note: 'Short notice', hot: true }]) });
st('s-bell', 'prep-staff', { bell: true, sheet: bellSheet('Ann', 'Tuesday 10 November', [[SMITH, 'in 2 days'], [JONES, 'in 4 days']]).replace('<div class="nt-wrap c-sheet" hidden>', '<div class="nt-wrap c-sheet">') });
st('s-head-home', 'home-head', { card: card(SMITH, { id: 'hu-smith', inDays: 'in 2 days', count: '1 of 2 this week', also: JONES, next: 'hu-jones', chef: true, seen: true,
  foot: 'Got it puts this away for you. Who has seen it stays on the function sheet.' }) + doneCard('Got it: Smith 60th.') });
st('s-head-sheet', 'home-head', { sheet: fnSheet() });

/* ---------- the run-up sheet ---------- */
const frame = (name, cap, sub) => '<figure class="cf"><figcaption><b>' + cap + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</figcaption><iframe src="states/' + name + '.html" width="390" height="844" loading="eager" title="' + cap + '"></iframe></figure>';
const row = (h, p, frames) => '<section class="cr"><h2>' + h + '</h2>' + (p ? '<p class="cr-p">' + p + '</p>' : '') + '<div class="cr-f">' + frames.join('') + '</div></section>';
const runup = '<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Design C run-up</title>' +
  '<link rel="stylesheet" href="../../order-list-options/assets/fonts.css"><style>' +
  ':root{--ink:#1C1D1F;--muted:#55585E;--line:#E0DBCF;--paper:#FBF8F1;--small-ink:#B83F15}body{margin:0;background:#E9E4D8;color:var(--ink);font:16px/1.4 Barlow,system-ui,sans-serif}' +
  'header.top{padding:24px 32px 8px}header.top h1{margin:0;font:700 2rem/1.1 "Barlow Condensed",sans-serif}header.top p{margin:6px 0 0;max-width:70rem;color:var(--muted)}' +
  '.cr{padding:16px 32px 8px;border-top:2px solid #CFC8B8}.cr h2{margin:0;font:700 1.35rem "Barlow Condensed",sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--small-ink)}.cr-p{margin:4px 0 0;max-width:72rem}' +
  '.cr-f{display:flex;flex-wrap:wrap;gap:20px;margin-top:12px}.cf{margin:0;width:390px}.cf figcaption{min-height:4.4em;margin-bottom:6px;font-size:.92rem}.cf figcaption b{display:block}.cf figcaption span{color:var(--muted)}' +
  '.cf iframe{display:block;border:0;border-radius:18px;box-shadow:0 0 0 6px #2B2A27,0 8px 18px rgba(0,0,0,.25);background:#fff}</style></head><body>' +
  '<header class="top"><h1>Design C, Tell everyone once: the run-up to a Thursday function</h1><p>Preview only, synthetic data. Smith 60th, Thu 12 Nov (order day Sun 8 Nov) and Jones wedding, Sat 14 Nov. Each phone is a 390 x 844 frame of a static page built from the real app\'s snapshot with css/app.css. Left: a person who has not tapped Got it yet. Middle: after Got it. Right: Prep. Work pages gain no line: the existing band shows on the order day, the day before and the day, as today.</p></header>' +
  row('7 to 5 days before (here Sat 7 Nov)', 'The heads-up starts 7 days before, or when the function is booked inside the week. Jones wedding (Sat 14) is 7 days away, so the card says 1 of 2.', [
    frame('d5-home-new', 'Home, first open since it came within 7 days', 'Card above Your day: day, time, guests, platters, dietaries, place'),
    frame('d5-home-got', 'Home, after Got it', 'Nothing added. Coming up still lists both, as today'),
    frame('d5-prep', 'Prep', 'No line. The bell has a dot until Got it')]) +
  row('Order day (Sun 8 Nov)', 'Unchanged from today: Now and next and the band show the order line all day.', [
    frame('od-home-new', 'Home, not seen yet', 'Card first, then Your day; Now and next keeps the order rows'),
    frame('od-home-got', 'Home, after Got it', 'As today: order rows in Now and next'),
    frame('od-prep', 'Prep', 'As today: the band\'s Order today lines')]) +
  row('3 and 2 days before (Mon 9, Tue 10 Nov)', 'Today\'s blind spot. Anyone who has not tapped Got it gets the card on Home; everyone else is left alone.', [
    frame('d2-home-new', 'Home, not seen yet (Ann on Tuesday)', 'The same card, now in 2 days'),
    frame('d2-home-got', 'Home, after Got it', 'As today'),
    frame('d2-prep', 'Prep', 'No line. Bell dot until Got it')]) +
  row('The day before (Wed 11 Nov)', 'The short second heads-up, for everyone once, even after the first Got it. Someone who never tapped the first gets the full card with a Tomorrow tag.', [
    frame('d1-home-tom', 'Home, second heads-up', 'One short card: food, platters, place, dietaries'),
    frame('d1-home-got', 'Home, after Got it', 'Coming up says Tomorrow, as today'),
    frame('d1-prep', 'Prep', 'As today: the band\'s Tomorrow line')]) +
  row('The day (Thu 12 Nov)', 'No card. Now and next, the band, the platter prep lines and the service view take over, as today.', [
    frame('d0-home', 'Home', 'As today: Now and next shows the next round'),
    frame('d0-prep', 'Prep', 'As today: the band with the round')]) +
  row('After a tap', 'Got it answers in the card\'s own place, names the function, and offers Undo. Nothing is saved in phase 1: Got it is kept on this phone for this person.', [
    frame('s-got-next', 'Got it on Smith 60th', 'The card names what was put away and shows the next one, 2 of 2'),
    frame('s-done', 'Got it on the last one', 'One line until Home is left; then Home is back to its usual order'),
    frame('s-later', 'Put away (folded)', 'Later the same day: no card. Both still in Coming up, as today')]) +
  row('When something goes wrong or changes', '', [
    frame('s-nosignal', 'No signal, saved copy', 'The card from the phone\'s last copy, with when it was read'),
    frame('s-changed', 'Changed after Got it', 'Comes back once, with the change words the book already writes'),
    frame('s-cancelled', 'Cancelled after Got it', 'Only for people who were told. Red with words, then Got it')]) +
  row('Other states', '', [
    frame('s-short', 'Booked inside the week', 'Shows at once, tagged Booked today. Three functions this week: Coming up lists all three'),
    frame('s-bell', 'The bell on a work page (tapped)', 'The bell\'s dot is the only reminder on work pages; the sheet opens on a tap only'),
    frame('s-head-sheet', 'Head chef: the function sheet', 'New Heads-up part: who has seen it, read on a tap (phase 2)')]) +
  row('Head chef', 'The head chef gets the heads-up too, with Who has seen it (phase 2). The 1280 px view is home-head-1280.html.', [
    frame('s-head-home', 'Head chef, Home at 390 px', 'Who has seen it opened: seen 4 of 7, not yet 3')]) +
  '</body></html>';
fs.writeFileSync(path.join(here, 'runup.html'), runup);
module.exports = { pages, frames: F };
if (require.main === module) console.log('built', pages.length, 'pages and', F.length, 'frames');
