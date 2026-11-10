/* Design A, "Fill the gap" (functions ahead of time council, round 2, 10 Nov 2026). Preview only: nothing here is
   loaded by the book. Builds static pages from the implemented-app snapshots in ../baseline/ (scripts removed, the
   real css/app.css through <base href="../../../">) and adds the one new piece, the quiet Next function line.
   Run: node build.cjs (then node capture.cjs). Synthetic data only: today is Tuesday 10 Nov 2026, 14:00 Queensland. */
const fs = require('fs'), path = require('path');
const here = __dirname, base = path.join(here, '..', 'baseline');
const read = f => fs.readFileSync(path.join(base, f), 'utf8');
const SELF = 'docs/function-ahead-options/design-a/';   // links resolve against the repo root (the <base>)

const CAL = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><circle cx="12" cy="15" r="1.6" fill="currentColor"/></svg>';

/* ---------- the new styles (existing tokens only) ---------- */
const CSS = `<style id="design-a">
/* Design A preview: the quiet Next function line in the band's slot. Not charcoal (charcoal means live) and not amber
   (not attention): quiet reference paper, ink words, the date in the book's small orange as on Home's Coming up. */
.fn-band.fa-quiet { background: var(--surface-reference); color: var(--ink); border-bottom: 1.5px solid var(--ink); box-shadow: none; }
.fn-band.fa-quiet .fn-fold { border-color: var(--ink); background: var(--paper); color: var(--ink); }
.fn-band.fa-quiet .fn-fold:focus-visible { outline: 3px solid var(--accent-ink); outline-offset: 2px; }
.fn-band.fa-quiet .fn-stale { margin: 0 auto; max-width: 1240px; padding: 0 0.75rem 0.4rem; color: var(--small-ink); }
.fa-next { display: flex; align-items: center; gap: 0.5rem; max-width: 1240px; margin: 0 auto; padding: 0.15rem 0.75rem; }
.fa-next-b { flex: 1 1 auto; min-width: 0; min-height: 44px; display: flex; flex-direction: column; justify-content: center; gap: 1px; margin: 0; padding: 0.2rem 0; border: 0; background: none; color: var(--ink); font: inherit; text-align: left; cursor: pointer; }
.fa-next-b:focus-visible, .fa-next-more:focus-visible { outline: 3px solid var(--accent-ink); outline-offset: 2px; border-radius: 4px; }
.fa-next-l { font: 700 0.8rem/1.2 var(--display); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
.fa-next-d { color: var(--small-ink); }
.fa-next-t { font-size: 1rem; line-height: 1.3; color: #3b3a36; overflow-wrap: anywhere; }
.fa-next-n { color: var(--ink); font-weight: 700; }
.fa-next-b:hover .fa-next-n { text-decoration: underline; text-underline-offset: 2px; }
.fa-next-more { flex: 0 0 auto; display: inline-flex; align-items: center; min-height: 44px; padding: 0 0.55rem; border: 1.5px solid var(--ink); border-radius: var(--r-act); background: var(--paper); color: var(--ink); font-size: 0.875rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
.fa-next .fn-fold { margin-left: 0; }
.fa-wk { display: none; margin-left: 0.25em; }
@media (min-width: 600px) { .fa-wk { display: inline; } }
@media (min-width: 720px) { .fa-next-b { flex-direction: row; flex-wrap: wrap; justify-content: flex-start; align-items: baseline; align-content: center; gap: 0 0.9rem; } }
.fa-next.is-cancelled { box-shadow: inset 4px 0 0 var(--bad-ink); padding-left: 0.95rem; }
.fa-next.is-cancelled .fa-next-n s { text-decoration-thickness: 2px; }
/* Home: the same line on a pinned quiet card, directly under Your day; always two lines (it sits in a column) */
.is-home .fa-hm-next { padding: 0.3rem 0.25rem; background: var(--surface-reference); }
.fa-hm-next .fa-next { padding: 0 0.6rem; }
.fa-hm-next .fa-next-b { flex-direction: column; align-items: flex-start; gap: 1px; }
@media (min-width: 720px) and (max-width: 1099px) { .fa-hm-next .fa-wk { display: none; } }
@media (min-width: 720px) {
  .is-home .hm-staff-first { grid-template-rows: auto 1fr; }
  .is-home .hm-staff-first > .fa-hm-next { grid-column: 1; grid-row: 2; }
  .is-home .hm-staff-first > #hm-with { grid-column: 2; grid-row: 1 / span 2; }
}
/* preview only: the existing sheet and slip, shown by the small script below */
/* a closed sheet waits as .fa-pop: the app's html:has(.fn-pop) rule moves the slip to the top while a sheet is open */
.fa-pop, .p-toasts[hidden] { display: none; }
ins.fa-add { text-decoration: none; }
</style>`;

/* ---------- preview behaviour: open the existing sheet, hide for today with the slip and Undo ---------- */
const JS = `<script>
document.addEventListener('click', function (e) {
  var t = e.target, o = t.closest('[data-fn="open"]');
  if (o) { e.preventDefault(); var p = document.getElementById('fa-sheet-' + o.getAttribute('data-id')); if (p) { p.className = 'fn-pop'; p.querySelector('.fn-sheet').focus(); } return; }
  var c = t.closest('[data-fn="close"]'); if (c) { c.closest('.fn-pop').className = 'fa-pop'; return; }
  var f = t.closest('#fn-band [data-fn="fold"]');
  if (f && document.getElementById('fn-band').classList.contains('fa-quiet')) { document.getElementById('fn-band').hidden = true; var s = document.getElementById('fa-slip'); if (s) s.hidden = false; return; }
  var u = t.closest('[data-fa="undo"]');
  if (u) { document.getElementById('fn-band').hidden = false; document.getElementById('fa-slip').hidden = true; var fb = document.querySelector('#fn-band [data-fn="fold"]'); if (fb) fb.focus(); }
});
</script>`;

/* ---------- synthetic functions ---------- */
const FN = {
  smith: { id: 'smith', name: 'Smith 60th', day: 'Thu 12 Nov', loc: 'Function room', start: '18:00', guests: 60, notes: '4 gluten free, 1 nut allergy.',
    rounds: [['18:30', [3, 2]], ['19:15', [2, 3]]], lines: [['antipasto-platter', 'Antipasto Platter', 'Antipasto'], ['pizza-platter', 'Pizza Platter', 'Pizza']] },
  jones: { id: 'jones', name: 'Jones wedding', day: 'Sat 14 Nov', loc: 'Beer garden', start: '17:00', guests: 90, notes: '',
    rounds: [['18:00', [6]]], lines: [['antipasto-platter', 'Antipasto Platter', 'Antipasto']] },
  long: { id: 'long', name: 'Henderson and Papadopoulos engagement party', day: 'Sat 14 Nov', loc: 'Beer garden', start: '17:00', guests: 120, notes: '',
    rounds: [['18:00', [6]]], lines: [['antipasto-platter', 'Antipasto Platter', 'Antipasto']] }
};
const total = f => f.rounds.reduce((s, r) => s + r[1].reduce((a, b) => a + b, 0), 0);
const lineTot = (f, i) => f.rounds.reduce((s, r) => s + (r[1][i] || 0), 0);
const linesText = f => f.lines.map((l, i) => lineTot(f, i) + ' × ' + l[2]).join(', ');

/* The line itself. o: { f, when: 'Thu 12 Nov' | 'Tomorrow' | 'Today 18:30', more: n, fold: bool, state: '' | 'cancelled', stale: '' } */
function lineInner(o) {
  const f = o.f, cancelled = o.state === 'cancelled';
  const lab = cancelled ? '<span class="fn-tag fn-t-off">Cancelled</span> · <b class="fa-next-d">' + f.day + '</b>' : '<span class="fa-next-k">Next function</span> · <b class="fa-next-d">' + (o.when || f.day) + '</b>';
  const words = cancelled ? '<b class="fa-next-n"><s>' + f.name + '</s></b> · Do not prep' : '<b class="fa-next-n">' + f.name + '</b> · ' + f.guests + ' guests';
  const aria = cancelled ? 'Cancelled: ' + f.name + ', ' + f.day + '. Do not prep. Open the function' : 'Next function: ' + f.name + ', ' + (o.when || f.day) + ', ' + f.guests + ' guests. Open the function';
  return '<div class="fa-next' + (cancelled ? ' is-cancelled' : '') + '"><button type="button" class="fa-next-b" data-fn="open" data-id="' + f.id + '" aria-haspopup="dialog" aria-label="' + aria + '">' +
    '<span class="fa-next-l">' + lab + '</span><span class="fa-next-t">' + words + '</span></button>' +
    (o.more ? '<a class="fa-next-more" href="' + SELF + 'fn-week.html" aria-label="' + o.more + ' more ' + (o.more === 1 ? 'function' : 'functions') + ' this week. Open functions">+' + o.more + ' more<span class="fa-wk"> this week</span></a>' : '') +
    (o.fold ? '<button type="button" class="fn-fold" data-fn="fold" aria-label="Hide the next function on this phone until tomorrow" title="Hide">−</button>' : '') + '</div>' +
    (o.stale ? '<p class="fn-stale" role="status">' + o.stale + '</p>' : '');
}
const bandLine = o => '<div class="fn-band fa-quiet" id="fn-band" role="region" aria-label="Next function">' + lineInner(Object.assign({ fold: true }, o)) + '</div>';
const homeLine = o => '<section class="hm-paper fa-hm-next" aria-label="Next function">' + lineInner(Object.assign({ fold: false }, o)) + '</section>';
const EMPTY_BAND = '<div class="fn-band" id="fn-band" role="region" aria-label="Functions" hidden=""></div>';

/* the existing band's own lines (js/functions.js soonRow / bandRow words), for the order day */
function orderRow(f) {
  return '<li class="fn-li"><button type="button" class="fn-row is-soon" data-fn="open" data-id="' + f.id + '" aria-haspopup="dialog"><span class="fn-r2"><span class="fn-tag fn-t-order">Order today</span> Stock for <b>' + f.name + '</b>, ' + f.day + ': ' + linesText(f) + ' (' + total(f) + '). It is on the order list.</span></button></li>';
}
const orderBand = fs2 => '<div class="fn-band" id="fn-band" role="region" aria-label="Functions"><div class="fn-band-top"><h2 class="fn-band-h">Functions coming up</h2><button type="button" class="fn-fold" data-fn="fold" aria-expanded="true" aria-label="Hide functions" title="Hide">−</button></div><ul class="fn-list">' + fs2.map(orderRow).join('') + '</ul></div>';

/* the existing function sheet (sheetHTML in js/functions.js), with one addition: the guests on its first line */
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
  body += '<p class="fn-by fn-last">Last changed by Bo, Mon 9 Nov 14:00.</p><div class="btn-row fn-acts"><button type="button" class="btn" data-fn="print">Print function</button><a class="btn dark" href="' + SELF + 'fn-week.html" data-fn="go">Open the full sheet</a></div>';
  return '<div class="fa-pop" id="fa-sheet-' + f.id + '"><div class="fn-pop-bg" data-fn="close"></div><section class="fn-sheet" role="dialog" aria-modal="true" aria-labelledby="fn-sh-h-' + f.id + '" tabindex="-1">' +
    '<div class="fn-grip" aria-hidden="true"></div><header class="fn-sheet-top"><div class="fn-sheet-t"><span class="fn-eb">Function</span><h2 id="fn-sh-h-' + f.id + '">' + f.name + '</h2></div><button type="button" class="fn-close" data-fn="close">Close</button></header><div class="fn-sheet-body">' + body + '</div></section></div>';
}
const SLIP = '<div class="p-toasts" id="fa-slip" hidden=""><div class="p-toast" data-toast="new" style="--toast-life:9000ms;--toast-since:-3000ms"><span class="p-toast-msg">Next function hidden on this phone until tomorrow. Home still shows it.</span><button type="button" class="p-toast-btn" data-fa="undo">Undo</button></div></div>';

/* ---------- page assembly ---------- */
function finish(html, o) {
  o = o || {};
  let h = html.replace('</head>', CSS + '</head>');
  h = h.replace('<canvas width="192" height="256"></canvas>', '<img src="art/mascot/idle-still.png" alt="" width="64" height="85" style="width:100%;height:100%;object-fit:contain">');
  h = h.replace(/(class="mascot"[^>]*style="[^"]*?)left: (\d+)px;/, (m, a, x) => a + 'left: min(' + x + 'px, calc(100% - 80px));');
  if (o.depth === 4) h = h.replace('<base href="../../../">', '<base href="../../../../">');
  const extra = (o.sheets || ['smith', 'jones']).map(id => sheet(FN[id])).join('') + (o.slip ? SLIP : '') + JS;
  h = h.replace('</body>', extra + '</body>');
  if (o.slipOpen) h = h.replace('<div class="p-toasts" id="fa-slip" hidden="">', '<div class="p-toasts" id="fa-slip">');
  if (o.bandHidden) h = h.replace('<div class="fn-band fa-quiet" id="fn-band"', '<div class="fn-band fa-quiet" id="fn-band" hidden=""');
  if (o.sheetOpen) h = h.replace('<div class="fa-pop" id="fa-sheet-' + o.sheetOpen + '">', '<div class="fn-pop" id="fa-sheet-' + o.sheetOpen + '">');
  return h;
}
function must(h, s) { if (h.indexOf(s) < 0) throw new Error('snapshot changed, missing: ' + s.slice(0, 80)); return s; }
function sub(h, a, b) { must(h, a); return h.split(a).join(b); }

// Prep and Orders: the line takes the band's empty slot
function workPage(file, band, o) {
  let h = read(file);
  h = sub(h, EMPTY_BAND, band);
  if (o && o.date) h = sub(h, '10 November 2026', o.date);
  if (o && o.who === 'bo') h = sub(h, '<span class="wtop-av" aria-hidden="true">A</span>', '<span class="wtop-av" aria-hidden="true">B</span>').split('Signed in as Ann').join('Signed in as Bo').split('Lunch: Hot larder').join('Lunch: Pans');
  if (o && o.cut) h = sub(h, '<div class="cut-band" id="cut-band" role="region" aria-label="Order cut-offs" hidden=""></div>', '<div class="cut-band" id="cut-band" role="region" aria-label="Order cut-offs">' + o.cut + '</div>');
  return h;
}
// a band the existing app draws (day before, on the day), from its own snapshot, moved to the Thursday run-up
function existingBand(file, date, fix) {
  let h = read(file);
  h = sub(h, '10 November 2026', date);
  fix.forEach(([a, b]) => { h = sub(h, a, b); });
  return h;
}

const HOME_WITH = '<section class="hm-paper hm-with" id="hm-with"';
const LAND_SMITH = '<li><b>Thu 12 Nov</b> Smith 60th, food 18:30, 10 platters</li>';
const LAND_JONES = '<li><b>Sat 14 Nov</b> Jones wedding, food 18:00, 6 platters</li>';
const HOME_UP_OPEN = '<section class="hm-paper hm-up" aria-labelledby="hm-up-h">';
// Home: the line under Your day; Coming up leaves out the function on the line (as it leaves out what the board shows)
function homePage(file, o) {
  let h = read(file);
  if (o.line) h = sub(h, HOME_WITH, homeLine(o.line) + HOME_WITH);
  if (o.dropLand) o.dropLand.forEach(x => { h = sub(h, x, ''); });
  if (o.landReplace) h = sub(h, '<li><b>Thu 12 Nov</b>', o.landReplace);
  if (o.date) h = sub(h, 'Tuesday 10 November', o.date);
  if (o.board) h = sub(h, '<section class="hm-board" id="hm-board" aria-labelledby="hm-board-h" hidden=""></section>', '<section class="hm-board" id="hm-board" aria-labelledby="hm-board-h">' + o.board + '</section>');
  if (o.noUp) h = sub(h, '<div id="fn-land">', '<div id="fn-land" hidden="">');
  return h;
}
function hmRow(title, sub2, time, note, id) {
  return '<li><button type="button" class="hm-a" data-fn="open" data-id="' + id + '" aria-haspopup="dialog"><span class="hm-i" aria-hidden="true">' + CAL + '</span><span class="hm-w"><b class="hm-t">' + title + '</b><small class="hm-s">' + sub2 + '</small></span><span class="hm-r">' +
    (time ? '<b class="hm-tm">' + time + '</b>' : '') + (note ? '<small class="hm-n">' + note + '</small>' : '') + '</span></button></li>';
}
const board = rows => '<div class="hm-bh"><h3 class="hm-bt" id="hm-board-h">Now and next</h3><b class="hm-clock">14:00</b></div><ul class="hm-rows">' + rows.join('') + '</ul>';

const out = (name, html) => fs.writeFileSync(path.join(here, name), html);
const S = FN.smith, J = FN.jones;

/* ---------- the five deliverable pages ---------- */
out('home.html', finish(homePage('home-staff.html', { line: { f: S, more: 1 }, dropLand: [LAND_SMITH] })));
out('prep.html', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), { slip: true }));
out('orders.html', finish(workPage('orders-staff.html', bandLine({ f: S, more: 1 })), { slip: true }));
out('home-head-1280.html', finish(homePage('home-head-1280.html', { line: { f: S, more: 1 }, dropLand: [LAND_SMITH] })));

/* ---------- the two other Home placements, built only to measure their cost ---------- */
(function () {
  let h = read('home-staff.html');
  const a = h.indexOf(HOME_UP_OPEN), b = h.indexOf('</section>', h.indexOf('<div id="fn-land">')) + '</section>'.length;
  const up = h.slice(a, b); h = h.slice(0, a) + h.slice(b);
  h = sub(h, HOME_WITH, up + HOME_WITH);
  out('home-alt-card.html', finish(h));
  let r = read('home-staff.html');
  const row = '<li data-hm-priority="fn"><button type="button" class="hm-a hm-day-row" data-fn="open" data-id="smith" aria-haspopup="dialog"><span class="hm-i" aria-hidden="true">' + CAL + '</span><span class="hm-w"><b class="hm-t">Next function</b><small class="hm-s">Smith 60th · 60 guests</small></span><b class="hm-day-value">Thu 12 Nov</b></button></li>';
  r = sub(r, '</li></ul></section><section class="hm-paper hm-with"', '</li>' + row + '</ul></section><section class="hm-paper hm-with"');
  r = sub(r, LAND_SMITH, '');
  out('home-alt-row.html', finish(r));
})();

/* ---------- the function page "+1 more" opens (#/fn), with Upcoming at 7 days instead of 3 ---------- */
(function () {
  let h = read('orders-staff.html');
  const a = h.indexOf('<div class="page">'), b = h.indexOf('<nav class="tabbar"');
  const card = f => '<li class="fn-card"><a href="#/fn/' + f.id + '" data-fn="open" data-id="' + f.id + '"><span class="fn-c0">Event ' + f.start + ' · ' + f.loc + ' · ' + f.guests + ' guests</span><span class="fn-c1"><b>' + f.name + '</b></span>' +
    '<span class="fn-c2">Food from ' + f.rounds[0][0] + (f.rounds.length > 1 ? ' · ' + f.rounds.length + ' rounds' : '') + '</span><span class="fn-c3">' + linesText(f) + ' (' + total(f) + ')</span>' +
    (f.notes ? '<span class="fn-cnote"><span class="fn-cnote-l">Notes</span> ' + f.notes + '</span>' : '') + '</a></li>';
  const day = f => '<div class="fn-day"><div class="fn-day-h"><h4>' + f.day + '</h4><button type="button" class="btn" data-fn="print-prep">Print prep sheet</button></div><ul class="fn-cards">' + card(f) + '</ul><div class="fn-dtot"><span class="label">To make for the day</span><ul>' +
    f.lines.map((l, i) => '<li><b>' + lineTot(f, i) + '</b> × ' + l[1] + '</li>').join('') + '</ul></div></div>';
  const page = '<div class="page fn-pg"><main id="main" class="fn-main"><section class="set-block fn-page fn-list-page"><h2 id="rtitle" tabindex="-1">Functions</h2><p class="hint">Confirmed functions and their platters.</p><p class="hint fn-fresh">Up to date, 14:00. Changes show here by themselves.</p>' +
    '<div class="fn-sec"><h3 class="fn-h fn-sec-h">Today <span class="fn-sec-d">Tue 10 Nov</span></h3><div class="btn-row fn-sec-acts"><button type="button" class="btn" disabled="">Print prep sheet</button></div><p class="hint">No functions on now.</p></div>' +
    '<div class="fn-sec"><h3 class="fn-h fn-sec-h">Upcoming functions <span class="fn-sec-d">the next 7 days</span></h3>' + day(S) + day(J) + '<p class="fn-quiet">Nothing booked on the other 5 days.</p><div class="btn-row"><button type="button" class="btn" data-fn="days">Show the next 14 days</button></div></div></section></main></div>';
  h = h.slice(0, a) + page + h.slice(b);
  h = sub(h, '<a href="#/orders" aria-current="page">', '<a href="#/orders">');
  out('fn-week.html', finish(h));
})();

/* ---------- run-up frames for a Thursday function (frames/, one folder deeper) ---------- */
const F4 = { depth: 4 };
const frame = (name, html) => fs.writeFileSync(path.join(here, 'frames', name), html);
// 5 days before (Sat 7 Nov): Smith Thu 12 and Jones Sat 14 are both within 7 days
frame('prep-d5.html', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 }), { date: '7 November 2026' }), F4));
frame('home-d5.html', finish(homePage('home-staff.html', { line: { f: S, more: 1 }, dropLand: [LAND_SMITH], date: 'Saturday 7 November' }), F4));
// order day (Sun 8 Nov): the band's own order lines (unchanged); Home: the line, and the board's order rows (unchanged)
frame('prep-od.html', finish(workPage('prep-staff.html', orderBand([S, J]), { date: '8 November 2026' }), F4));
frame('home-od.html', finish(homePage('home-staff.html', { line: { f: S, more: 1 }, dropLand: [LAND_SMITH], date: 'Sunday 8 November',
  board: board([hmRow('Order the stock for Smith 60th', 'Thu 12 Nov · ' + linesText(S), '', 'Today', 'smith'), hmRow('Order the stock for Jones wedding', 'Sat 14 Nov · ' + linesText(J), '', 'Today', 'jones')]) }), F4));
// 2 days before (Tue 10 Nov): the deliverable pages
frame('prep-d2.html', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), Object.assign({ slip: true }, F4)));
frame('home-d2.html', finish(homePage('home-staff.html', { line: { f: S, more: 1 }, dropLand: [LAND_SMITH] }), F4));
// the day before (Wed 11 Nov): the band's Tomorrow line, as today; Home: the line says Tomorrow
frame('prep-d1.html', finish(existingBand('prep-staff-day-before.html', '11 November 2026', [['event 13:30', 'event 18:00']]), F4));
frame('home-d1.html', finish(homePage('home-staff.html', { line: { f: S, when: 'Tomorrow', more: 1 }, dropLand: [LAND_SMITH], date: 'Wednesday 11 November' }), F4));
// the day (Thu 12 Nov): the band's live rounds, as today; Home: the line says Today 18:30, Now and next has the round
frame('prep-d0.html', finish(existingBand('prep-staff-on-the-day.html', '12 November 2026', [['<span class="fn-due">14:10</span>', '<span class="fn-due">18:30</span>']]), F4));
frame('home-d0.html', finish(homePage('home-staff.html', { line: { f: S, when: 'Today 18:30', more: 1 }, dropLand: [LAND_SMITH], date: 'Thursday 12 November',
  board: board([hmRow('Smith 60th', 'Round 1 of 2 · 3 × Antipasto, 2 × Pizza', '18:30', 'Round 1', 'smith')]) }), F4));
/* states */
frame('prep-hidden.html', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), Object.assign({ slip: true, slipOpen: true, bandHidden: true }, F4)));
frame('prep-offline.html', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1, stale: 'No signal. Functions last updated 13:52.' })), F4));
frame('prep-cancelled.html', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1, state: 'cancelled' })), F4));
frame('prep-long.html', finish(workPage('prep-staff.html', bandLine({ f: FN.long, more: 0 })), Object.assign({ sheets: ['long'] }, F4)));
frame('prep-head.html', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 }), { who: 'bo',
  cut: '<div class="cut-top"><h2 class="cut-h">Order cut-off</h2><a class="cut-go" href="#/orders">Order list</a></div><ul class="cut-list"><li class="cut-row"><a class="cut-n" href="#/suppliers">Fresh produce</a><span class="cut-t">by 15:00 <b>1 h left</b> <span class="cut-for">for Wednesday</span></span></li></ul>' }), F4));
frame('prep-sheet.html', finish(workPage('prep-staff.html', bandLine({ f: S, more: 1 })), Object.assign({ sheetOpen: 'smith' }, F4)));
frame('fn-week.html', fs.readFileSync(path.join(here, 'fn-week.html'), 'utf8').replace('<base href="../../../">', '<base href="../../../../">'));
console.log('built', fs.readdirSync(here).filter(f => f.endsWith('.html')).join(' '), '|', fs.readdirSync(path.join(here, 'frames')).join(' '));
