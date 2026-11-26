// The section screens at 1920 (head chef, 26 Nov 2026, docs/screen-1920-options/brief.md, Chosen). The Wall board's
// columns keep their places: the kitchen's section list in its own order with the cook's own section first, a line
// marked urgent moves no column, and a section whose lines are all done keeps its column ("Nothing left to do."), so no
// column slides sideways under a finger. The notebook is as it was. A cook's Orders list keeps a reading width from
// 1536 px; a chef's (with the cut-offs beside it) is left alone. Synthetic people and lines on the click-test stand-in.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW));
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const base = L.seed();
const wall = "localStorage.setItem('lk.wall', '1')";
function fixture(o = {}) {
  const x = {
    [key('config', 'main')]: Object.assign({}, base[key('config', 'main')], {
      people: [P('kit', 'Kit', 'head'), P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff')], headId: 'kit', sousIds: ['kit', 'sam'], staffIds: ['kit', 'sam', 'ann'],
      // the kitchen's section list, in an order of its own: Grill, Sauce, Larder, Pastry
      kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }, { id: 'larder', name: 'Larder' }, { id: 'pastry', name: 'Pastry' }],
      kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }] }, o.config || {})
  };
  // Pastry holds the urgent line, so the old board put Pastry first; Larder's lines were written first
  [['Slice onions', 'Larder'], ['Pick herbs', 'Larder'], ['Reduce the jus', 'Sauce'], ['Hollandaise', 'Sauce'], ['Portion rump', 'Grill'], ['Skewer the lamb', 'Grill'],
   ['Lemon curd', 'Pastry', { urgent: true }], ['Pastry cases', 'Pastry']]
    .forEach(([text, station, etc], k) => { x[key('days', today, 'items', 's' + k)] = Object.assign({ text, station, qty: '1', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - (90 - k) * 60000, done: false, deleted: false }, etc || {}); });
  x[key('team', today)] = { day: today, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }], br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' };
  return Object.assign(x, o.extra || {});
}
const cols = p => p.$$eval('.wb-cols .wb-col', l => l.map(e => e.getAttribute('aria-label')));
// where each column sits across the board (its left edge and its place in the grid's order); heights may change
const places = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('.wb-col')].map((c, i) => [c.getAttribute('aria-label'), i + '@' + Math.round(c.getBoundingClientRect().left)])));
const board = (p, n) => L.waitFor(p, n => document.querySelectorAll('.wb-cols .wb-col').length >= n, n, 8000).catch(() => {});

(async () => {
  const b = await L.start();
  // 1. the order: your own section first, then the kitchen's list; a sous chef has no section of his own
  let p = await L.open(b, '#/prep', { who: 'ann', deviceMode: 'shared', width: 1920, height: 1008, touch: true, extra: fixture(), init: wall, wait: 1500 });
  await board(p, 4);
  ok((await cols(p)).join() === 'Larder,Grill,Sauce,Pastry', 'board: Ann on Larder sees Larder first, then the section list (' + (await cols(p)).join() + ')');
  ok(!(await L.overflow(p)) && !p.errors.length, 'board 1920: no sideways scroll, no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/prep', { who: 'sam', width: 1920, height: 1008, extra: fixture(), init: wall, wait: 1500 });
  await board(p, 4);
  ok((await cols(p)).join() === 'Grill,Sauce,Larder,Pastry', 'board: the sous chef sees the section list in its order, not the urgent line\'s section first (' + (await cols(p)).join() + ')');
  // 2. a line marked urgent on another phone moves no column (the phone that marks it holds its own order for a moment;
  // every other screen redraws at once: Larder's earliest line, made urgent, used to put Larder's column first)
  const before = await places(p);
  await p.evaluate(k => { window.__fake.write(k, Object.assign({}, window.__fake.dump()[k], { urgent: true })); }, key('days', today, 'items', 's0'));
  await L.waitFor(p, () => !!document.querySelector('.wb-col[aria-label="Larder"] .nb-row .is-urgent, .wb-col[aria-label="Larder"] [data-p="urgent"][aria-pressed="true"]'), null, 4000).catch(() => {});
  await L.settle(p, 600);
  ok(JSON.stringify(await places(p)) === JSON.stringify(before), 'board: a Larder line marked urgent on another phone moves no column (' + JSON.stringify({ before, after: await places(p) }) + ')');
  await p.context().close();

  // 3. a section's last line ticked: its column stays, saying so, and no other column moves (on Ann's own device, so
  // the tick needs no "who did this" sheet; the layout is the same)
  p = await L.open(b, '#/prep', { who: 'ann', width: 1920, height: 1008, touch: true, extra: fixture(), init: wall, wait: 1500 });
  await board(p, 4);
  const at = await places(p);
  // every open Larder line (the base test data adds some of its own), ticked where it is
  const larder = await p.$$eval('.wb-col[aria-label="Larder"] .nb-row:not(.is-done)', l => l.map(r => r.id));
  for (const id of larder) { await p.evaluate(id => document.querySelector('#' + id + ' .nb-box').click(), id); await L.settle(p, 300); }
  await L.settle(p, 4500);
  const done = await p.evaluate(() => { const c = document.querySelector('.wb-col[aria-label="Larder"]'); return c ? { done: c.classList.contains('is-done'), words: c.textContent.replace(/\s+/g, ' ').trim(), rows: c.querySelectorAll('.nb-row').length } : null; });
  ok(!!done && done.done && /Nothing left to do\./.test(done.words) && /(\d+)\/\1/.test(done.words) && !done.rows, 'board: Larder, all done, keeps its column and says Nothing left to do. (' + JSON.stringify(done) + ')');
  const now2 = await places(p), moved = Object.keys(at).filter(k => now2[k] !== at[k]);
  ok(!moved.length && Object.keys(now2).length === Object.keys(at).length, 'board: no column slides sideways when a section empties (' + JSON.stringify({ at, now2 }) + ')');
  // the notebook is as it was: a finished section is not drawn there
  await p.click('.wb-h [data-p="wall"]'); await L.settle(p, 600);
  ok(!(await p.$$eval('.nb-left .nb-hd > span:first-child', l => l.map(e => e.textContent.trim()))).includes('Larder'), 'notebook: a section with nothing left is still left out');
  await p.context().close();

  // 4. Orders: a cook's list at a reading width from 1536 px, not below; the sous chef's (with the cut-offs) as it was
  const orders = {};
  ['Butter', 'Flour', 'Rice', 'Limes', 'Garlic', 'Ginger'].forEach((t, k) => { orders[key('orders', today, 'lines', 'o' + k)] = { text: t, qty: '1 box', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - (30 - k) * 60000, ordered: false, deleted: false }; });
  const weekday = (new Date(L.NOW + 10 * 3600000).getUTCDay() + 1) % 7;
  const cut = { config: { cutoffs: [{ id: 'veg', name: 'Greenvale Produce', dd: [weekday], at: 900, pre: 1 }] }, extra: orders };
  const reach = q => q.evaluate(() => { const m = document.querySelector('.o-main'), r = document.querySelector('.o-main .nb-row'), b = r && r.querySelector('.nb-box'), x = r && r.querySelector('.nb-more, [data-p="more"]');
    return { main: m ? Math.round(m.getBoundingClientRect().width) : 0, reach: b && x ? Math.round(x.getBoundingClientRect().left - b.getBoundingClientRect().right) : null, chef: !!document.querySelector('.o-page > .o-cut-fold') }; });
  for (const [w, who, mode, want] of [[1920, 'ann', 'shared', 'narrow'], [1536, 'ann', 'shared', 'narrow'], [1535, 'ann', 'shared', 'wide'], [1920, 'sam', 'personal', 'chef']]) {
    p = await L.open(b, '#/orders', { who, deviceMode: mode, width: w, height: 1008, touch: true, extra: fixture(cut), wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('.o-main .nb-row'), null, 8000).catch(() => {});
    const r = await reach(p);
    if (want === 'narrow') ok(r.main <= 753 && r.reach != null && r.reach <= 700, w + ' cook: Orders at a reading width, ⋯ ' + r.reach + ' px from the tick (' + JSON.stringify(r) + ')');
    else if (want === 'wide') ok(r.main > 900, w + ' cook: one px under 1536 the list keeps the page width (' + JSON.stringify(r) + ')');
    else ok(r.chef && r.main > 600 && r.main < 760, w + ' sous chef: the list beside the cut-offs is as it was (' + JSON.stringify(r) + ')');
    ok(!(await L.overflow(p)) && !p.errors.length, w + ' ' + who + ' Orders: no sideways scroll, no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
