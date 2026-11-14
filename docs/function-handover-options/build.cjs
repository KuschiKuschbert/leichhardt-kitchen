/* Function handover council, round 2 (14 Nov 2026): previews of designs A, B and C. Preview only: nothing here is
   loaded by the book. Builds static pages from the implemented-app snapshots in baseline/ (scripts removed, the real
   css/app.css through <base href="../../../">) and swaps in each design's board, band and states.
   Run from the repo root: node docs/function-handover-options/build.cjs (then capture.cjs).
   Synthetic data only. The night: 18:35 kitchen time. Cooks Ann and Ben, Functions coordinator Fay, sous chef Sam.
     Birthday 60th, Function room, staggered: 18:00 (2 Antipasto, 2 Pizza: sent 18:08 Ann, confirmed out 18:12 Fay),
       18:45 (1 Antipasto, 2 Pizza), 19:30 (1 Pizza). Dietaries on every round.
     Rotary dinner, Beer garden, all at 18:20: 4 Antipasto, sent 18:24 Ann, not confirmed (11 min).
     Wedding reception, Marquee, all at 18:30: 4 Antipasto, 3 Pizza, 3 Sliders, 2 Fruit, 2 Cheese (14), part sent. */
const fs = require('fs'), path = require('path');
const here = __dirname, base = path.join(here, 'baseline');
const read = f => fs.readFileSync(path.join(base, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- small drawings (stroke icons in currentColor, never the only cue: every one sits beside words) ---------- */
const I = {
  tick: '<svg class="ho-i" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ticks: '<svg class="ho-i" width="24" height="18" viewBox="0 0 30 24" aria-hidden="true"><path d="M2 12.5l5 5L18 6.5M12 17.5L23 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  wait: '<svg class="ho-i" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  box: '<svg class="ho-i" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  boxt: '<svg class="ho-i" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="currentColor" stroke="currentColor" stroke-width="2.2"/><path d="M7.5 12.5l3 3 6-7" fill="none" stroke="var(--bar)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  clock: '<svg class="ho-i" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7.5V12l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'
};

/* ---------- shared styles: existing tokens only (charcoal board, done-on-dark, bar-accent, bad-on-dark) ---------- */
const SHARED = `
.ho-i { display: inline-block; flex: 0 0 auto; vertical-align: -3px; }
.fn-svc-board .ho-sub { margin: 0.35rem 0 0; font-size: 0.95rem; color: rgba(251, 248, 241, 0.86); }
/* waiting for Functions: pending, in words, a neutral outlined pill (not green: green means done on this board) */
.ho-wait { display: inline-flex; align-items: center; gap: 0.3rem; padding: 2px 8px; border: 1.5px solid rgba(251, 248, 241, 0.7); border-radius: 4px; font: 700 0.78rem/1.3 var(--display); letter-spacing: 0.08em; text-transform: uppercase; color: var(--bar-text); white-space: nowrap; }
/* waited 10 minutes or more: named attention, orange on charcoal with the minutes in words */
.ho-wait.is-long { border-color: var(--bar-accent); background: var(--bar-accent); color: var(--bar); }
.ho-out { display: inline-flex; align-items: center; gap: 0.3rem; font-weight: 700; color: var(--done-on-dark); }
.ho-sent { display: inline-flex; align-items: center; gap: 0.3rem; font-weight: 700; color: var(--bar-text); }
.ho-pend { display: inline-flex; align-items: center; gap: 0.3rem; font-weight: 700; color: var(--bar-text); font-style: italic; }
.ho-bad { display: block; margin-top: 0.4rem; padding: 0.4rem 0.6rem; border-left: 4px solid var(--bad-on-dark); background: color-mix(in srgb, var(--bad-on-dark) 14%, transparent); color: var(--bar-text); }
.ho-bad b { color: var(--bad-on-dark); }
.fn-svc-board .ho-act { min-height: 48px; padding: 0 1rem; font-size: 1.02rem; }
.fn-svc-board .ho-conf { background: var(--paper); border-color: var(--paper); color: var(--ink); }
.fn-svc-board .ho-chef { background: transparent; border-color: var(--bar-text); color: var(--bar-text); }
.fn-svc-board .btn:focus-visible, .ho-k:focus-visible { outline: 3px solid var(--bar-accent); outline-offset: 2px; }
.ho-sec { margin: 0.2rem -1rem 0; padding: 0.55rem 1rem 0.2rem; border-top: 2px solid rgba(251, 248, 241, 0.32); }
.ho-sec-h { display: flex; align-items: baseline; justify-content: space-between; gap: 0.6rem; margin: 0 0 0.2rem; font: 700 0.8rem/1.2 var(--display); letter-spacing: 0.16em; text-transform: uppercase; color: var(--bar-text); }
.ho-sec-h small { font: 400 0.9rem/1.2 var(--body, inherit); letter-spacing: 0; text-transform: none; color: rgba(251, 248, 241, 0.78); }
.ho-done-line { margin: 0.3rem 0 0.7rem; color: rgba(251, 248, 241, 0.82); }
/* the coordinator's band: the row's words stay one tap to the sheet, the confirm button sits beside them */
.fn-band .ho-li { display: flex; align-items: center; gap: 0.5rem; }
.fn-band .ho-li > .fn-row { flex: 1 1 auto; min-width: 0; }
.fn-band .ho-li .btn { flex: 0 0 auto; min-height: 48px; padding: 0 0.8rem; background: var(--paper); border-color: var(--paper); color: var(--ink); }
.fn-band .ho-li .btn:focus-visible { outline: 3px solid var(--bar-accent); outline-offset: 2px; }
.fn-band .ho-wait { margin-left: 0.2rem; }
/* preview frame only: a label above each state on the states page */
.ho-state-l { margin: 0.9rem 0 0.25rem; font: 700 0.8rem/1.2 var(--display); letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
`;

/* ---------- the night, the same for every design ---------- */
const WED = [['Antipasto', 4], ['Pizza', 3], ['Sliders', 3], ['Fruit', 2], ['Cheese', 2]];
const DIET_B60 = '3 gluten free, 1 vegan. Nut allergy at table 4.';
const DIET_WED = '2 coeliac at table 1. The bride is vegan: the Fruit platter goes to her table first.';
const q = (n, name) => '<span class="fn-svc-q"><b>' + n + '</b> <span class="fn-x">×</span> ' + esc(name) + '</span>';
const diet = t => '<p class="fn-svc-diet"><span class="fn-svc-dl">Dietaries and notes</span><span class="fn-svc-dt">' + esc(t) + '</span></p>';
const name = (n, id) => '<button type="button" class="linkish fn-svc-name" data-fn="open" data-id="' + id + '" aria-haspopup="dialog">' + esc(n) + '</button>';
function top(o) {
  return '<p class="fn-svc-top"><b class="fn-due' + (o.late ? ' is-late' : '') + '">' + o.at + '</b>' + (o.late ? ' <span class="fn-late">Late</span>' : '') + ' ' + name(o.name, o.id) +
    ' · ' + esc(o.loc) + (o.round ? ' · ' + o.round : '') + (o.cd ? ' <span class="fn-svc-cd">' + o.cd + '</span>' : '') + '</p>';
}
function toPlate(list) {
  const total = list.reduce((s, x) => s + x[0], 0);
  return '<section class="fn-next" aria-label="To plate now"><p class="fn-next-h"><span class="fn-next-l">To plate now</span> <b>' + total + ' platters</b></p>' +
    '<p class="fn-next-s">Late and due in the next 15 minutes, all functions together. Platters already sent are not counted.</p><ul class="fn-next-list">' +
    list.map(([n, nm]) => '<li class="fn-next-row"><span class="fn-next-n">' + n + '<span class="fn-x">×</span></span><span class="fn-next-name"><a href="#/r/x">' + esc(nm) + ' Platter</a></span></li>').join('') + '</ul></section>';
}
// the Birthday's later rounds: the same in every design (nothing sent yet)
const LATER = (btn, what) => [
  '<li class="fn-svc-row">' + top({ at: '18:45', name: 'Birthday 60th', id: 'b60', loc: 'Function room', round: 'round 2 of 3', cd: 'In 10 min' }) +
    (what ? '<p class="fn-svc-what">' + q(1, 'Antipasto') + q(2, 'Pizza') + ' <span class="fn-of">(3)</span></p>' : '') + (what ? diet(DIET_B60) + btn(3, ['Antipasto', 1], ['Pizza', 2]) : btn(3, ['Antipasto', 1], ['Pizza', 2]).replace(/(<div class="(?:a|b)-acts">)/, diet(DIET_B60) + '$1')) + '</li>',
  '<li class="fn-svc-row is-later">' + top({ at: '19:30', name: 'Birthday 60th', id: 'b60', loc: 'Function room', round: 'round 3 of 3', cd: 'In 55 min' }) +
    (what ? '<p class="fn-svc-what">' + q(1, 'Pizza') + ' <span class="fn-of">(1)</span></p>' : '') + (what ? diet(DIET_B60) + btn(1, ['Pizza', 1]) : btn(1, ['Pizza', 1]).replace(/(<div class="(?:a|b)-acts">)/, diet(DIET_B60) + '$1')) + '</li>'
];

/* ================= Design A: Waiting shelf (changes the least) =================
   Rows still to go stay as today. Each platter kind in a round is a tick (that whole kind sent, one tap); All sent sends
   what is left in one tap. A round with everything sent leaves the rows and sits on a one-line shelf, "Waiting for
   Functions", at the end of the board. Functions confirms the whole round (one tap) on the shelf or on the band. */
const A = {};
A.css = `
.a-kinds { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0.5rem 0 0; padding: 0; list-style: none; }
.ho-k { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 44px; padding: 0 0.7rem; border: 1.5px solid rgba(251, 248, 241, 0.75); border-radius: var(--r-act); background: transparent; color: var(--bar-text); font: inherit; font-size: 1.02rem; cursor: pointer; }
.ho-k b { font-size: 1.3rem; font-variant-numeric: tabular-nums; }
.ho-k.is-sent { border-style: dashed; border-color: rgba(251, 248, 241, 0.5); color: rgba(251, 248, 241, 0.86); }
.ho-k.is-sent .ho-kw { font: 700 0.75rem/1 var(--display); letter-spacing: 0.08em; text-transform: uppercase; }
.a-acts { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem 0.8rem; margin-top: 0.6rem; }
.a-shelf { list-style: none; margin: 0; padding: 0; }
.a-shelf li { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.6rem; padding: 0.55rem 0; border-top: 1px solid rgba(251, 248, 241, 0.14); }
.a-shelf li:first-child { border-top: 0; }
.a-shelf .a-what { flex: 1 1 14rem; min-width: 0; }
.a-shelf .a-what b { font-weight: 700; }
`;
const kindBtn = (n, nm, sent) => '<li><button type="button" class="ho-k' + (sent ? ' is-sent' : '') + '" aria-pressed="' + !!sent + '">' + (sent ? I.boxt : I.box) + '<b>' + n + '</b> ' + esc(nm) + (sent ? ' <span class="ho-kw">sent</span>' : '') + '</button></li>';
A.btn = (tot, ...kinds) => '<ul class="a-kinds" aria-label="Tick a kind as it leaves the pass">' + kinds.map(k => kindBtn(k[1], k[0], false)).join('') + '</ul><div class="a-acts"><button type="button" class="btn ho-act">All sent (' + tot + ')</button></div>';
A.board = who => {
  const coord = who === 'fay';
  const wed = '<li class="fn-svc-row is-late">' + top({ at: '18:30', late: true, name: 'Wedding reception', id: 'wed', loc: 'Marquee', round: 'all at once', cd: '5 min late' }) +
    '<p class="ho-sub">' + I.tick + ' <b>7 of 14 sent</b>, last 18:31 Ben. 7 still to go.</p>' +
    '<ul class="a-kinds" aria-label="Tick a kind as it leaves the pass">' + WED.map(([nm, n], i) => kindBtn(n, nm, i < 2)).join('') + '</ul>' + diet(DIET_WED) +
    '<div class="a-acts"><button type="button" class="btn ho-act">All sent (7 left)</button><button type="button" class="linkish">Undo Pizza</button></div></li>';
  const rows = [wed].concat(LATER(A.btn, false));
  const shelf = '<div class="ho-sec"><h4 class="ho-sec-h">Waiting for Functions <small>sent, not confirmed yet</small></h4><ul class="a-shelf">' +
    '<li><span class="a-what"><b>18:20 Rotary dinner</b> · Beer garden · 4 Antipasto · ' + I.tick + ' sent 18:24 Ann</span><span class="ho-wait is-long">' + I.wait + ' Waiting 11 min</span>' +
    (coord ? '<button type="button" class="btn ho-act ho-conf">' + I.ticks + ' Confirm out</button>' : '') + '</li></ul>' +
    '<p class="ho-done-line">' + I.ticks + ' Out today: 1 round, Birthday 60th round 1, 18:12 Fay.</p></div>';
  return '<div class="fn-svc-board"><div class="fn-svc-bh"><h3 class="fn-svc-bt">Still to go out</h3><b class="fn-svc-clock">18:35</b></div><ul class="fn-svc-rows">' + rows.join('') + '</ul>' + shelf + '</div>' +
    toPlate([[3, 'Sliders'], [2, 'Pizza'], [2, 'Fruit'], [2, 'Cheese'], [1, 'Antipasto']]);
};
A.hint = 'Every round still to go out, in order. Tick each kind as it leaves the pass, or All sent. Functions confirms when it is out.';
A.band = () => bandWrap([
  bandRow('18:20', 'Rotary dinner', 'Beer garden', I.tick + ' Sent 18:24, Ann: <b>4 × Antipasto</b> <span class="ho-wait is-long">' + I.wait + ' 11 min</span>', 'Confirm out'),
  bandRow('18:30', 'Wedding reception', 'Marquee', '<span class="fn-late">7 of 14 sent</span>: <b>3 × Sliders, 2 × Fruit, 2 × Cheese</b> still to come'),
  bandRow('18:45', 'Birthday 60th', 'Function room', 'Round 2 of 3: <b>1 × Antipasto, 2 × Pizza</b> <span class="fn-of">(3 of 8)</span>')
], '3 on today');
A.states = () => [
  ['A kind just ticked, not sent yet (no signal)', '<ul class="a-kinds"><li><button type="button" class="ho-k is-sent" aria-pressed="true">' + I.boxt + '<b>3</b> Sliders <span class="ho-pend">' + I.clock + ' Not sent yet</span></button></li></ul>'],
  ['A kind ticked and saved', '<ul class="a-kinds"><li><button type="button" class="ho-k is-sent" aria-pressed="true">' + I.boxt + '<b>3</b> Sliders <span class="ho-kw">sent</span></button></li></ul>'],
  ['Refused or failed: the tick goes back and says why', '<ul class="a-kinds"><li><button type="button" class="ho-k" aria-pressed="false">' + I.box + '<b>3</b> Sliders</button></li></ul><p class="ho-bad" role="alert"><b>Not saved:</b> Sliders not ticked as sent. Check the signal and try again.</p>'],
  ['Whole round sent, on the shelf (kitchen view)', '<ul class="a-shelf"><li><span class="a-what"><b>18:20 Rotary dinner</b> · 4 Antipasto · ' + I.tick + ' sent 18:24 Ann</span><span class="ho-wait">' + I.wait + ' Waiting for Functions</span></li></ul>'],
  ['10 minutes and no confirm (sous chef view: the chef can confirm for Functions)', '<ul class="a-shelf"><li><span class="a-what"><b>18:20 Rotary dinner</b> · 4 Antipasto · ' + I.tick + ' sent 18:24 Ann</span><span class="ho-wait is-long">' + I.wait + ' Waiting 11 min</span><button type="button" class="btn ho-act ho-chef">Confirm for Functions</button></li></ul>'],
  ['Confirmed (leaves the shelf, counted below)', '<p class="ho-done-line">' + I.ticks + ' Out today: 2 rounds. Last: Rotary dinner, 18:36 Fay.</p>'],
  ['Function over with a round never confirmed', '<p class="ho-done-line"><span class="ho-wait is-long">' + I.wait + ' Never confirmed</span> Rotary dinner, sent 18:24 Ann. Kept on the function\'s page and the run sheet.</p>']
];

/* ================= Design B: Three stages (rethinks the flow) =================
   The board is grouped by where the food is: To send, With the runners, Out. A count line at the top says how many in
   each. Each kind is its own line with how many have gone ("2 of 3") and two buttons: +1 and Rest. With the runners
   holds what left the pass, by kind; Functions confirms each kind or the whole round (All out). */
const B = {};
B.css = `
.b-stages { display: flex; flex-wrap: wrap; gap: 0.3rem 0.5rem; margin: 0.6rem 0 0.2rem; padding: 0; list-style: none; }
.b-stages li { display: inline-flex; align-items: baseline; gap: 0.3rem; padding: 3px 8px; border-radius: 4px; background: rgba(251, 248, 241, 0.12); font-size: 0.95rem; }
.b-stages b { font: 700 1.15rem/1 var(--display); }
.b-kl { list-style: none; margin: 0.5rem 0 0; padding: 0; display: grid; gap: 0.35rem; }
.b-kl li { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 0.4rem; padding: 0.15rem 0; }
.b-kl .b-kn { font-size: 1.05rem; min-width: 0; overflow-wrap: anywhere; }
.b-kl .b-kn b { font-size: 1.3rem; font-variant-numeric: tabular-nums; }
.b-kl .b-kc { display: block; font-size: 0.9rem; color: rgba(251, 248, 241, 0.82); }
.b-kl .btn { min-height: 44px; min-width: 52px; padding: 0 0.6rem; }
.b-kl li.is-done .b-kn { color: rgba(251, 248, 241, 0.82); }
.b-acts { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.55rem; }
.b-run { list-style: none; margin: 0; padding: 0; }
.b-run > li { padding: 0.55rem 0 0.6rem; border-top: 1px solid rgba(251, 248, 241, 0.14); }
.b-run > li:first-child { border-top: 0; }
.b-run .b-rh { margin: 0; }
.b-run .b-rk { list-style: none; margin: 0.35rem 0 0; padding: 0; display: grid; gap: 0.3rem; }
.b-run .b-rk li { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; }
.b-run .b-rk .b-rw { flex: 1 1 10rem; }
.b-out summary { min-height: 44px; display: flex; align-items: center; cursor: pointer; color: rgba(251, 248, 241, 0.86); }
`;
const bKind = (nm, sent, of, coord) => {
  const done = sent >= of;
  return '<li class="' + (done ? 'is-done' : '') + '"><span class="b-kn"><b>' + of + '</b> × ' + esc(nm) + '<span class="b-kc">' + (done ? I.tick + ' all ' + of + ' sent' : sent ? I.tick + ' ' + sent + ' of ' + of + ' sent, ' + (of - sent) + ' to go' : 'none sent yet') + '</span></span>' +
    (done ? '<span></span><span></span>' : '<button type="button" class="btn" aria-label="One more ' + esc(nm) + ' sent">+1</button><button type="button" class="btn" aria-label="The rest of the ' + esc(nm) + ' sent">Rest ' + (of - sent) + '</button>') + '</li>';
};
B.btn = (tot, ...kinds) => '<ul class="b-kl">' + kinds.map(k => bKind(k[0], 0, k[1])).join('') + '</ul><div class="b-acts"><button type="button" class="btn ho-act">All sent (' + tot + ')</button></div>';
B.board = who => {
  const coord = who === 'fay';
  const wed = '<li class="fn-svc-row is-late">' + top({ at: '18:30', late: true, name: 'Wedding reception', id: 'wed', loc: 'Marquee', round: 'all at once', cd: '5 min late' }) +
    '<p class="ho-sub">' + I.tick + ' <b>9 of 14 sent</b>, 5 to go.</p><ul class="b-kl">' + [['Antipasto', 4, 4], ['Pizza', 3, 3], ['Sliders', 2, 3], ['Fruit', 0, 2], ['Cheese', 0, 2]].map(([nm, s, of]) => bKind(nm, s, of)).join('') + '</ul>' + diet(DIET_WED) +
    '<div class="b-acts"><button type="button" class="btn ho-act">All sent (5 left)</button></div></li>';
  const conf = coord ? '<button type="button" class="btn ho-act ho-conf">' + I.ticks + ' Out</button>' : '';
  const run = '<div class="ho-sec"><h4 class="ho-sec-h">With the runners <small>sent, waiting for Functions</small></h4><ul class="b-run">' +
    '<li><p class="b-rh"><b>18:20 Rotary dinner</b> · Beer garden <span class="ho-wait is-long">' + I.wait + ' 11 min</span></p><ul class="b-rk"><li><span class="b-rw">' + I.tick + ' <b>4</b> × Antipasto, sent 18:24 Ann</span>' + conf + '</li></ul></li>' +
    '<li><p class="b-rh"><b>18:30 Wedding reception</b> · Marquee <span class="ho-wait">' + I.wait + ' Waiting</span></p><ul class="b-rk">' +
    '<li><span class="b-rw">' + I.ticks + ' <b>4</b> × Antipasto, out 18:33 Fay</span></li>' +
    '<li><span class="b-rw">' + I.tick + ' <b>3</b> × Pizza, sent 18:31 Ben</span>' + conf + '</li>' +
    '<li><span class="b-rw">' + I.tick + ' <b>2</b> × Sliders, sent 18:34 Ann</span>' + conf + '</li></ul>' +
    (coord ? '<div class="b-acts"><button type="button" class="btn ho-act ho-conf">' + I.ticks + ' All out (5)</button></div>' : '') + '</li></ul></div>' +
    '<div class="ho-sec"><details class="b-out"><summary>' + I.ticks + '&nbsp;Out: 8 platters. Show</summary></details></div>';
  const rows = [wed].concat(LATER(B.btn, false));
  return '<div class="fn-svc-board"><div class="fn-svc-bh"><h3 class="fn-svc-bt">Service</h3><b class="fn-svc-clock">18:35</b></div>' +
    '<ul class="b-stages" aria-label="Where the platters are"><li><b>9</b> to send</li><li><b>9</b> with the runners</li><li><b>8</b> out</li></ul>' +
    (coord ? run : '') + '<div class="ho-sec"><h4 class="ho-sec-h">To send <small>in order</small></h4><ul class="fn-svc-rows">' + rows.join('') + '</ul></div>' + (coord ? '' : run) + '</div>' +
    toPlate([[2, 'Pizza'], [2, 'Fruit'], [2, 'Cheese'], [1, 'Sliders'], [1, 'Antipasto']]);
};
B.hint = 'Where every platter is: still to send, with the runners, or out. Tick each kind as it goes, +1 at a time or the rest.';
B.band = () => bandWrap([
  bandRow('18:20', 'Rotary dinner', 'Beer garden', 'With the runners: <b>4 × Antipasto</b> <span class="ho-wait is-long">' + I.wait + ' 11 min</span>', 'All out'),
  bandRow('18:30', 'Wedding reception', 'Marquee', 'With the runners: <b>3 × Pizza, 2 × Sliders</b>. 5 still to send.', 'All out'),
  bandRow('18:45', 'Birthday 60th', 'Function room', 'Round 2 of 3: <b>1 × Antipasto, 2 × Pizza</b> <span class="fn-of">(3 of 8)</span>')
], '3 on today');
B.states = () => [
  ['One more sent, not sent yet (no signal)', '<ul class="b-kl"><li><span class="b-kn"><b>3</b> × Sliders<span class="b-kc"><span class="ho-pend">' + I.clock + ' 3 of 3, not sent yet</span></span></span><span></span><span></span></li></ul>'],
  ['Part of a kind sent and saved', '<ul class="b-kl">' + bKind('Sliders', 2, 3) + '</ul>'],
  ['Refused or failed: the count goes back and says why', '<ul class="b-kl">' + bKind('Sliders', 2, 3) + '</ul><p class="ho-bad" role="alert"><b>Not saved:</b> 1 Sliders not counted as sent. Check the signal and try again.</p>'],
  ['With the runners (kitchen view)', '<ul class="b-run"><li><p class="b-rh"><b>18:30 Wedding reception</b> <span class="ho-wait">' + I.wait + ' Waiting</span></p><ul class="b-rk"><li><span class="b-rw">' + I.tick + ' <b>2</b> × Sliders, sent 18:34 Ann</span></li></ul></li></ul>'],
  ['10 minutes and no confirm (sous chef view)', '<ul class="b-run"><li><p class="b-rh"><b>18:20 Rotary dinner</b> <span class="ho-wait is-long">' + I.wait + ' 11 min</span></p><ul class="b-rk"><li><span class="b-rw">' + I.tick + ' <b>4</b> × Antipasto, sent 18:24 Ann</span><button type="button" class="btn ho-act ho-chef">Out for Functions</button></li></ul></li></ul>'],
  ['Confirmed (moves to Out)', '<ul class="b-run"><li><ul class="b-rk"><li><span class="b-rw">' + I.ticks + ' <b>4</b> × Antipasto, out 18:36 Fay</span></li></ul></li></ul>'],
  ['Function over with platters never confirmed', '<p class="ho-done-line"><span class="ho-wait is-long">' + I.wait + ' Never confirmed</span> Rotary dinner: 4 Antipasto, sent 18:24 Ann. Kept on the function\'s page and the run sheet.</p>']
];

/* ================= Design C: Trips (removes the most friction) =================
   What leaves the pass together is one trip. Send all (one tap) sends everything left as one trip. Send part opens the
   kinds in the row (no pop-up), each with a count to set, then Send trip. Each trip is a slip under its round, in place:
   who sent what, when, and whether Functions has it. Functions confirms each trip with one tap. A round with nothing left
   to send folds to its top line and its slips; it leaves the board when every trip is confirmed. */
const C = {};
C.css = `
.c-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.8rem; margin-top: 0.6rem; }
.c-trips { list-style: none; margin: 0.5rem 0 0; padding: 0; display: grid; gap: 0.3rem; }
.c-trips li { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.4rem 0.6rem; border-radius: 6px; background: rgba(251, 248, 241, 0.08); }
.c-trips .c-tw { flex: 1 1 12rem; min-width: 0; }
.c-trips .c-tn { font: 700 0.78rem/1 var(--display); letter-spacing: 0.1em; text-transform: uppercase; margin-right: 0.3rem; }
.c-comp { margin-top: 0.6rem; padding: 0.55rem 0.6rem 0.6rem; border: 1.5px solid rgba(251, 248, 241, 0.6); border-radius: 8px; }
.c-comp-h { margin: 0 0 0.35rem; font: 700 0.8rem/1.2 var(--display); letter-spacing: 0.12em; text-transform: uppercase; }
.c-cl { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.3rem; }
.c-cl li { display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: 0.35rem; }
.c-cl .c-cn { min-height: 44px; display: inline-flex; align-items: center; gap: 0.3rem; padding: 0 0.5rem; border: 1.5px solid rgba(251, 248, 241, 0.6); border-radius: var(--r-act); background: transparent; color: var(--bar-text); font: inherit; font-size: 1.02rem; text-align: left; min-width: 0; overflow-wrap: anywhere; cursor: pointer; }
.c-cl .c-cv { min-width: 2.2rem; text-align: center; font: 700 1.3rem/1 var(--display); font-variant-numeric: tabular-nums; }
.c-cl .btn { min-height: 44px; min-width: 44px; padding: 0 0.55rem; }
.fn-svc-row.c-folded .fn-svc-top { opacity: 0.92; }
`;
C.btn = (tot) => '<div class="c-acts"><button type="button" class="btn ho-act">Send all ' + tot + '</button><button type="button" class="linkish">Send part</button></div>';
C.board = (who, comp) => {
  const coord = who === 'fay';
  const conf = coord ? '<button type="button" class="btn ho-act ho-conf">' + I.ticks + ' Confirm out</button>' : '';
  const club = '<li class="fn-svc-row c-folded">' + top({ at: '18:20', name: 'Rotary dinner', id: 'club', loc: 'Beer garden', round: 'all sent' }) +
    '<ul class="c-trips"><li><span class="c-tw"><span class="c-tn">Trip 1</span>' + I.tick + ' <b>4</b> × Antipasto, sent 18:24 Ann</span><span class="ho-wait is-long">' + I.wait + ' Waiting 11 min</span>' + conf + '</li></ul></li>';
  const composer = '<div class="c-comp"><p class="c-comp-h">Trip 3: what goes now</p><p class="ho-sub" style="margin:0 0 0.4rem">Tap a platter for all of it, or set the number.</p><ul class="c-cl">' +
    [['Sliders', 1, 1], ['Fruit', 2, 2], ['Cheese', 0, 2]].map(([nm, v, left]) => '<li><button type="button" class="c-cn" aria-label="All ' + left + ' ' + esc(nm) + ' in this trip">' + esc(nm) + ' <span class="fn-of">(' + left + ' left)</span></button><button type="button" class="btn" aria-label="One fewer ' + esc(nm) + '">−</button><span class="c-cv">' + v + '</span><button type="button" class="btn" aria-label="One more ' + esc(nm) + '">+</button></li>').join('') +
    '</ul><div class="c-acts"><button type="button" class="btn ho-act">Send trip 3 (3)</button><button type="button" class="linkish">Cancel</button></div></div>';
  const wed = '<li class="fn-svc-row is-late">' + top({ at: '18:30', late: true, name: 'Wedding reception', id: 'wed', loc: 'Marquee', round: 'all at once', cd: '5 min late' }) +
    '<p class="fn-svc-what">' + q(1, 'Sliders') + q(2, 'Fruit') + q(2, 'Cheese') + ' <span class="fn-of">(5 left of 14)</span></p>' +
    diet(DIET_WED) + (comp ? composer : '<div class="c-acts"><button type="button" class="btn ho-act">Send all 5</button><button type="button" class="linkish">Send part</button></div>') +
    '<ul class="c-trips">' +
    '<li><span class="c-tw"><span class="c-tn">Trip 1</span>' + I.ticks + ' <b>4</b> Antipasto, <b>3</b> Pizza, out 18:33 Fay</span></li>' +
    '<li><span class="c-tw"><span class="c-tn">Trip 2</span>' + I.tick + ' <b>2</b> Sliders, sent 18:34 Ann</span><span class="ho-wait">' + I.wait + ' Waiting</span>' + conf + '</li></ul></li>';
  const rows = [club, wed].concat(LATER(C.btn, true));
  return '<div class="fn-svc-board"><div class="fn-svc-bh"><h3 class="fn-svc-bt">Still to go out</h3><b class="fn-svc-clock">18:35</b></div><ul class="fn-svc-rows">' + rows.join('') + '</ul>' +
    '<p class="ho-done-line">' + I.ticks + ' Out today: Birthday 60th round 1 (1 trip, 18:12 Fay).</p></div>' +
    toPlate([[2, 'Pizza'], [2, 'Fruit'], [2, 'Cheese'], [1, 'Sliders'], [1, 'Antipasto']]);
};
C.hint = 'Every round still to go out, in order. Send all, or Send part for a trip. Functions confirms each trip when it is out.';
C.band = () => bandWrap([
  bandRow('18:20', 'Rotary dinner', 'Beer garden', 'Trip 1: <b>4 × Antipasto</b>, sent 18:24 Ann <span class="ho-wait is-long">' + I.wait + ' 11 min</span>', 'Confirm out'),
  bandRow('18:30', 'Wedding reception', 'Marquee', 'Trip 2: <b>2 × Sliders</b>, sent 18:34 Ann. 5 still to send.', 'Confirm out'),
  bandRow('18:45', 'Birthday 60th', 'Function room', 'Round 2 of 3: <b>1 × Antipasto, 2 × Pizza</b> <span class="fn-of">(3 of 8)</span>')
], '3 on today');
C.states = () => [
  ['A trip just sent, not sent yet (no signal)', '<ul class="c-trips"><li><span class="c-tw"><span class="c-tn">Trip 2</span><span class="ho-pend">' + I.clock + ' Not sent yet</span> <b>2</b> Sliders</span></li></ul>'],
  ['Trip sent and saved (kitchen view)', '<ul class="c-trips"><li><span class="c-tw"><span class="c-tn">Trip 2</span>' + I.tick + ' <b>2</b> Sliders, sent 18:34 Ann</span><span class="ho-wait">' + I.wait + ' Waiting for Functions</span><button type="button" class="linkish">Undo</button></li></ul>'],
  ['Refused or failed: the trip goes back and says why', '<p class="ho-bad" role="alert"><b>Not saved:</b> trip 2 (2 Sliders) not sent. Check the signal and try again.</p>'],
  ['10 minutes and no confirm (sous chef view)', '<ul class="c-trips"><li><span class="c-tw"><span class="c-tn">Trip 1</span>' + I.tick + ' <b>4</b> Antipasto, sent 18:24 Ann</span><span class="ho-wait is-long">' + I.wait + ' Waiting 11 min</span><button type="button" class="btn ho-act ho-chef">Confirm for Functions</button></li></ul>'],
  ['Confirmed', '<ul class="c-trips"><li><span class="c-tw"><span class="c-tn">Trip 1</span>' + I.ticks + ' <b>4</b> Antipasto, out 18:36 Fay</span></li></ul>'],
  ['Function over with a trip never confirmed', '<p class="ho-done-line"><span class="ho-wait is-long">' + I.wait + ' Never confirmed</span> Rotary dinner trip 1, sent 18:24 Ann. Kept on the function\'s page and the run sheet.</p>']
];


/* ================= The mix: C's trips, A's shelf and kind buttons, B's order for Functions =================
   Recommended by the council's round 2 (14 Nov 2026). The kitchen taps what is going (each kind left is a button;
   a tap puts all of it in, − takes one off), and the one button says exactly what it sends: Send all 5, or Send 4
   platters once something is picked. Each send is a trip. A trip for a round with something still to send shows as one
   line in the row; a round with nothing left to send leaves the rows for the Waiting for Functions shelf at the end of
   the board, where every waiting trip sits, one line each. Fay sees the shelf first and no send buttons; she confirms
   each trip. The board's top line says how many trips wait, as a link to the shelf. */
const M = {};
M.css = A.css + C.css + `
.fn-svc-board .ho-link { display: inline-flex; align-items: center; min-height: 44px; padding: 0 0.4rem; }
.m-waitline { display: flex; align-items: center; gap: 0.4rem; min-height: 44px; margin: 0.15rem 0 0; color: var(--bar-text); text-decoration: underline; text-underline-offset: 3px; }
.ho-k.is-pick { border-style: solid; border-width: 2.5px; border-color: var(--bar-text); background: rgba(251, 248, 241, 0.16); }
.ho-k .m-of { font-size: 0.9rem; color: rgba(251, 248, 241, 0.82); }
.m-kind { display: inline-flex; align-items: center; gap: 0.3rem; }
.m-minus { min-width: 44px; min-height: 44px; padding: 0; border: 1.5px solid rgba(251, 248, 241, 0.75); border-radius: var(--r-act); background: transparent; color: var(--bar-text); font: inherit; font-size: 1.3rem; cursor: pointer; }
.m-minus:focus-visible { outline: 3px solid var(--bar-accent); outline-offset: 2px; }
.m-left { margin: 0.45rem 0 0; font-size: 0.95rem; color: rgba(251, 248, 241, 0.86); }
.ho-never { display: inline-flex; align-items: center; gap: 0.3rem; padding: 2px 8px; border: 1.5px solid var(--bad-on-dark); border-radius: 4px; font: 700 0.78rem/1.3 var(--display); letter-spacing: 0.08em; text-transform: uppercase; color: var(--bad-on-dark); white-space: nowrap; }
.a-shelf .c-tn { font: 700 0.78rem/1 var(--display); letter-spacing: 0.1em; text-transform: uppercase; margin-right: 0.2rem; }
`;
const NEVER = '<svg class="ho-i" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 7v6M12 16.5v.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const mKind = (n, nm, pick, take) => pick
  ? '<li class="m-kind"><button type="button" class="ho-k is-pick" aria-pressed="true">' + I.boxt + '<b>' + take + '</b> ' + esc(nm) + (take < n ? ' <span class="m-of">of ' + n + '</span>' : '') + '</button><button type="button" class="m-minus" aria-label="One fewer ' + esc(nm) + '">−</button></li>'
  : '<li><button type="button" class="ho-k" aria-pressed="false">' + I.box + '<b>' + n + '</b> ' + esc(nm) + '</button></li>';
const mKinds = (list) => '<ul class="a-kinds" aria-label="Tap what goes now">' + list.map(k => mKind(k[1], k[0], k[2], k[3])).join('') + '</ul>';
const mRead = (list) => '<p class="fn-svc-what">' + list.map(k => q(k[1], k[0])).join('') + '</p>';
M.btn = (tot, ...kinds) => '<div class="c-acts"><button type="button" class="btn ho-act">Send all ' + tot + '</button></div>';
M.board = (who, sel) => {
  const coord = who === 'fay';
  const conf = coord ? '<button type="button" class="btn ho-act ho-conf">' + I.ticks + ' Confirm out</button>' : '';
  const wedLeft = sel ? [['Sliders', 1, false], ['Fruit', 2, true, 2], ['Cheese', 2, true, 2]] : [['Sliders', 1], ['Fruit', 2], ['Cheese', 2]];
  const wedActs = coord ? '' : sel ? '<div class="c-acts"><button type="button" class="btn ho-act">Send 4 platters</button><button type="button" class="linkish ho-link">Clear</button></div>' : '<div class="c-acts"><button type="button" class="btn ho-act">Send all 5</button></div>';
  const wed = '<li class="fn-svc-row is-late">' + top({ at: '18:30', late: true, name: 'Wedding reception', id: 'wed', loc: 'Marquee', round: 'all at once', cd: '5 min late' }) +
    '<p class="m-left">' + I.tick + ' 9 of 14 sent in 2 trips. <b>5 left</b>' + (coord ? '' : ', tap what goes now') + ':</p>' + (coord ? mRead(wedLeft) : mKinds(wedLeft)) + diet(DIET_WED) + wedActs + '</li>';
  const later = [
    '<li class="fn-svc-row">' + top({ at: '18:45', name: 'Birthday 60th', id: 'b60', loc: 'Function room', round: 'round 2 of 3', cd: 'In 10 min' }) +
      (coord ? mRead([['Antipasto', 1], ['Pizza', 2]]) : mKinds([['Antipasto', 1], ['Pizza', 2]])) + diet(DIET_B60) + (coord ? '' : M.btn(3)) + '</li>',
    '<li class="fn-svc-row is-later">' + top({ at: '19:30', name: 'Birthday 60th', id: 'b60', loc: 'Function room', round: 'round 3 of 3', cd: 'In 55 min' }) +
      (coord ? mRead([['Pizza', 1]]) : mKinds([['Pizza', 1]])) + diet(DIET_B60) + (coord ? '' : M.btn(1)) + '</li>'
  ];
  const shelf = '<div class="ho-sec" id="ho-shelf"><h4 class="ho-sec-h">Waiting for Functions <small>' + (coord ? 'confirm each trip when it is out' : 'sent, not confirmed yet') + '</small></h4><ul class="a-shelf">' +
    '<li><span class="a-what"><b>18:20 Rotary dinner</b> · Beer garden · <span class="c-tn">Trip 1</span> 4 Antipasto · ' + I.tick + ' sent 18:24 Ann</span><span class="ho-wait is-long">' + I.wait + ' Waiting 11 min</span>' + conf + '</li>' +
    '<li><span class="a-what"><b>18:30 Wedding reception</b> · Marquee · <span class="c-tn">Trip 2</span> 2 Sliders · ' + I.tick + ' sent 18:34 Ann</span><span class="ho-wait">' + I.wait + ' Waiting</span>' + conf + '</li></ul>' +
    '<p class="ho-done-line">' + I.ticks + ' Out today: 2 trips. Last: Wedding reception trip 1, 18:33 Fay.</p></div>';
  const head = '<div class="fn-svc-bh"><h3 class="fn-svc-bt">' + (coord ? 'Functions service' : 'Still to go out') + '</h3><b class="fn-svc-clock">18:35</b></div>' +
    (coord ? '' : '<a class="m-waitline" href="#ho-shelf">' + I.wait + ' 2 trips waiting for Functions, 1 for 11 min</a>');
  const rows = '<ul class="fn-svc-rows">' + [wed].concat(later).join('') + '</ul>';
  const rowsBlock = coord ? '<div class="ho-sec"><h4 class="ho-sec-h">Still to go out <small>the kitchen sends these</small></h4>' + rows + '</div>' : rows;
  return '<div class="fn-svc-board">' + head + (coord ? shelf + rowsBlock : rowsBlock + shelf) + '</div>' +
    toPlate(sel ? [[2, 'Pizza'], [2, 'Fruit'], [2, 'Cheese'], [1, 'Sliders'], [1, 'Antipasto']] : [[2, 'Pizza'], [2, 'Fruit'], [2, 'Cheese'], [1, 'Sliders'], [1, 'Antipasto']]);
};
M.hint = 'Every round still to go out, in order. Tap what goes now, then Send. Each send is a trip; Functions confirms each trip when it is out.';
M.hintFay = 'What the kitchen has sent, waiting for you to confirm, then every round still to go out.';
M.band = () => bandWrap([
  bandRow('18:20', 'Rotary dinner', 'Beer garden', 'Trip 1: <b>4 × Antipasto</b>, sent 18:24 Ann <span class="ho-wait is-long">' + I.wait + ' Waiting 11 min</span>', 'Confirm out'),
  bandRow('18:30', 'Wedding reception', 'Marquee', 'Trip 2: <b>2 × Sliders</b>, sent 18:34 Ann <span class="ho-wait">' + I.wait + ' Waiting</span>. 5 still to send.', 'Confirm out'),
  bandRow('18:45', 'Birthday 60th', 'Function room', 'Round 2 of 3: <b>1 × Antipasto, 2 × Pizza</b> <span class="fn-of">(3 of 8)</span>')
], '3 on today');
M.states = () => [
  ['Picked, not sent: nothing is saved until Send', mKinds([['Sliders', 1, false], ['Fruit', 2, true, 2], ['Cheese', 2, true, 1]]) + '<div class="c-acts"><button type="button" class="btn ho-act">Send 3 platters</button><button type="button" class="linkish ho-link">Clear</button></div>'],
  ['Sent with no signal: no tick yet', '<ul class="a-shelf"><li><span class="a-what"><span class="c-tn">Trip 3</span> 2 Fruit, 1 Cheese · <span class="ho-pend">' + I.clock + ' Not sent yet</span></span></li></ul>'],
  ['Refused: another phone sent first', '<p class="ho-bad" role="alert"><b>Not saved:</b> Ben just sent trip 3 (1 Sliders). Check what is left and send again.</p>'],
  ['Saved, waiting (kitchen view, with Undo for 2 minutes)', '<ul class="a-shelf"><li><span class="a-what"><span class="c-tn">Trip 3</span> 2 Fruit, 1 Cheese · ' + I.tick + ' sent 18:36 Ann</span><span class="ho-wait">' + I.wait + ' Waiting</span><button type="button" class="linkish ho-link">Undo</button></li></ul>'],
  ['10 minutes, nobody confirmed (sous chef view)', '<ul class="a-shelf"><li><span class="a-what"><span class="c-tn">Trip 1</span> 4 Antipasto · ' + I.tick + ' sent 18:24 Ann</span><span class="ho-wait is-long">' + I.wait + ' Waiting 11 min</span><button type="button" class="btn ho-act ho-chef">Confirm for Functions</button></li></ul>'],
  ['Confirmed by Functions, or by a chef for them', '<p class="ho-done-line">' + I.ticks + ' Trip 1, 4 Antipasto: out 18:36, Fay.</p><p class="ho-done-line">' + I.ticks + ' Trip 1, 4 Antipasto: out 18:37, confirmed by Sam for Functions.</p>'],
  ['The function is over and a trip was never confirmed (final, kept)', '<p class="ho-done-line"><span class="ho-never">' + NEVER + ' Never confirmed</span> Rotary dinner trip 1, sent 18:24 Ann. On the function\'s page and the run sheet.</p>']
];

/* ---------- the band on the coordinator's Home ---------- */
function bandRow(at, nm, loc, r2, act) {
  const row = '<button type="button" class="fn-row" data-fn="open" aria-haspopup="dialog"><span class="fn-r1"><span class="fn-due">' + at + '</span> <b>' + esc(nm) + '</b> · ' + esc(loc) + '</span><span class="fn-r2">' + r2 + '</span></button>';
  return act ? '<li class="fn-li ho-li">' + row + '<button type="button" class="btn">' + I.ticks + ' ' + act + '</button></li>' : '<li class="fn-li">' + row + '</li>';
}
function bandWrap(rows, n) {
  return '<div class="fn-band" id="fn-band" role="region" aria-label="Functions"><div class="fn-band-top"><h2 class="fn-band-h">Functions today</h2><span class="fn-band-n">' + n + '</span><button type="button" class="fn-fold" aria-expanded="true" aria-label="Hide functions" title="Hide">−</button></div><ul class="fn-list">' + rows.join('') + '</ul><div class="fn-more-row"><a class="fn-more fn-svc" href="#/fn/now">Service view</a></div></div>';
}

/* ---------- pages ---------- */
const svc = read('service-cook.html'), home = read('home-coordinator.html');
function servicePage(D, who, comp) {
  const s = svc.indexOf('<p class="hint">Every round still'), e = svc.indexOf('<p class="hint fn-fresh">');
  if (s < 0 || e < 0) throw new Error('baseline service markup moved');
  let out = svc.slice(0, s) + '<p class="hint">' + (who === 'fay' && D.hintFay ? D.hintFay : D.hint) + '</p>' + D.board(who, comp) + svc.slice(e);
  out = out.replace('Up to date, 18:10.', 'Up to date, 18:35.');
  if (who === 'fay') out = out.replace(/<span class="tb-badge"[^>]*>[^<]*<\/span>/, '');
  return withCss(out, D);
}
function homePage(D) {
  const s = home.indexOf('<div class="fn-band" id="fn-band"'), e = home.indexOf('<div class="cut-band"');
  if (s < 0 || e < 0) throw new Error('baseline band markup moved');
  return withCss(home.slice(0, s) + D.band() + home.slice(e), D);
}
function statesPage(D, key) {
  const s = svc.indexOf('<p class="hint">Every round still'), e = svc.indexOf('<p class="hint fn-fresh">');
  const body = '<p class="hint">Design ' + key.toUpperCase() + ': each state of one line, on the service board. Preview only.</p><div class="fn-svc-board"><div class="fn-svc-bh"><h3 class="fn-svc-bt">States</h3><b class="fn-svc-clock">18:35</b></div>' +
    D.states().map(([l, h]) => '<p class="ho-state-l" style="color: rgba(251,248,241,0.78)">' + esc(l) + '</p>' + h).join('') + '<div style="height:0.8rem"></div></div>';
  return withCss(svc.slice(0, s) + body + svc.slice(e).replace(/<p class="hint fn-fresh">[\s\S]*?<\/p>/, ''), D);
}
function withCss(html, D) { return html.replace('</head>', '<style id="ho-preview">' + SHARED + D.css + '</style></head>'); }

const designs = { a: A, b: B, c: C, mix: M };
for (const k of Object.keys(designs)) {
  const D = designs[k], dir = path.join(here, 'design-' + k);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'service-cook.html'), servicePage(D, 'ann'));
  fs.writeFileSync(path.join(dir, 'service-coordinator.html'), servicePage(D, 'fay'));
  fs.writeFileSync(path.join(dir, 'home-coordinator.html'), homePage(D));
  fs.writeFileSync(path.join(dir, 'states.html'), statesPage(D, k));
  if (k === 'c') fs.writeFileSync(path.join(dir, 'service-cook-part.html'), servicePage(D, 'ann', true));
  if (k === 'mix') fs.writeFileSync(path.join(dir, 'service-cook-picked.html'), servicePage(D, 'ann', true));
}
module.exports = { M, A, B, C, SHARED, I, esc, top, q, diet, name, toPlate, LATER, WED, DIET_B60, DIET_WED, bandRow, bandWrap, kindBtn, bKind, servicePage, homePage, statesPage, withCss };
console.log('built design-a, design-b, design-c, design-mix');
