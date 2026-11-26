// Your own work first (head chef, 26 Nov 2026, docs/device-coverage/step2/findings.md, D). Prep's All list starts with
// the section the cook is on today (Today's team or their own pick, no read), then the rest in their usual order. A chef,
// a section's tab and the wall board are as they were. On a shared screen Home's day card names whose day it is
// ("Ann's day"); a personal phone keeps "Your day". Synthetic people and lines on the click-test stand-in.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW));
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const base = L.seed();
function fixture(plan = true) {
  const x = {
    [key('config', 'main')]: Object.assign({}, base[key('config', 'main')], {
      people: [P('kit', 'Kit', 'head'), P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('bo', 'Bo', 'staff')], headId: 'kit', sousIds: ['kit', 'sam'],
      staffIds: ['kit', 'sam', 'ann', 'bo'], showBadges: true,
      kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }],
      kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }] })
  };
  // Grill has the urgent line, so the usual order starts with Grill; Larder's lines were written last
  [['Portion rump', 'Grill', { urgent: true }], ['Skewer the lamb', 'Grill'], ['Reduce the jus', 'Sauce'], ['Hollandaise', 'Sauce'], ['Slice onions', 'Larder'], ['Pick herbs', 'Larder']]
    .forEach(([text, station, etc], k) => { x[key('days', today, 'items', 'o' + k)] = Object.assign({ text, station, qty: '1', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - (60 - k) * 60000, done: false, deleted: false }, etc || {}); });
  if (plan) x[key('team', today)] = { day: today, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'bo', sh: 'lunch', sec: 'sauce' }, { id: 'sam', sh: 'lunch', sec: 'grill' }], br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' };
  return x;
}
const heads = p => p.$$eval('.nb-left .nb-hd > span:first-child', l => l.map(e => e.textContent.trim()));
const ready = p => L.waitFor(p, () => document.querySelectorAll('.nb-left .nb-hd').length >= 3, null, 8000).catch(() => {});

(async () => {
  const b = await L.start();
  for (const [w, h] of [[390, 844], [1920, 1008]]) {
    let p = await L.open(b, '#/prep', { who: 'ann', deviceMode: 'shared', width: w, height: h, touch: true, extra: fixture(), wait: 1500 });
    await ready(p);
    let hs = await heads(p);
    ok(hs[0] === 'Larder' && hs.slice(1).join() === 'Grill,Sauce', w + ': Ann on Larder today sees Larder first under All, then the usual order (' + hs.join(', ') + ')');
    ok(!p.errors.length && !(await L.overflow(p)), w + ': no page errors, no sideways scroll ' + p.errors.join(' | '));
    // a section's tab is as it was
    const tab = await p.$('[data-p="tab"][data-v="Grill"], .nb-tab[data-v="Grill"]');
    if (tab) { await tab.click(); await L.settle(p, 300); ok((await heads(p)).every(x => x === 'Grill') || !(await heads(p)).length, w + ': the Grill tab shows Grill only'); }
    await p.context().close();
    // a sous chef has no section: the usual order
    p = await L.open(b, '#/prep', { who: 'sam', deviceMode: 'shared', width: w, height: h, touch: true, extra: fixture(), wait: 1500 });
    await ready(p);
    hs = await heads(p);
    ok(hs[0] === 'Grill', w + ': a sous chef keeps the usual order, the urgent line\'s section first (' + hs.join(', ') + ')');
    await p.context().close();
  }
  // no plan and no pick: the usual order
  let p = await L.open(b, '#/prep', { who: 'ann', deviceMode: 'shared', extra: fixture(false), wait: 1500 });
  await ready(p);
  let hs = await heads(p);
  ok(hs[0] === 'Grill', 'no section known today: the usual order (' + hs.join(', ') + ')');
  await p.context().close();
  // the wall board
  p = await L.open(b, '#/prep', { who: 'ann', deviceMode: 'shared', width: 1920, height: 1008, extra: fixture(), wait: 1500, init: "localStorage.setItem('lk.wall', '1')" });
  await L.waitFor(p, () => document.querySelectorAll('.wb-col').length >= 3, null, 8000).catch(() => {});
  const cols = await p.$$eval('.wb-col', l => l.map(e => e.getAttribute('aria-label')));
  // since 26 Nov 2026 the board follows the section list with your own section first, and its columns keep their places
  // (tests/section-screens.test.js): here the list is Larder, Grill, Sauce and Ann is on Larder
  ok(cols.join(', ') === 'Larder, Grill, Sauce', 'the wall board: your own section first, then the section list (' + cols.join(', ') + ')');
  await p.context().close();

  // Home: whose day it is on a shared screen; "Your day" on a personal phone
  for (const [mode, want] of [['shared', "Ann's day"], ['personal', 'Your day']]) {
    p = await L.open(b, '#/', { who: 'ann', deviceMode: mode, extra: fixture(), wait: 1500 });
    await L.waitFor(p, () => !!document.getElementById('hm-day-h'), null, 8000).catch(() => {});
    const t = await p.evaluate(() => { const e = document.getElementById('hm-day-h'); return e ? e.firstChild.textContent.trim() : null; });
    ok(t === want, mode + ' screen: the day card says "' + want + '" (' + t + ')');
    // a long unbroken name wraps in the heading: the phone never scrolls sideways
    if (mode === 'shared') {
      const long = 'W'.repeat(40), fx = fixture(); fx[key('config', 'main')].people.find(x => x.id === 'ann').name = long;
      const q = await L.open(b, '#/', { who: 'ann', deviceMode: 'shared', extra: fx, width: 390, height: 844, wait: 1500 });
      await L.waitFor(q, () => !!document.getElementById('hm-day-h'), null, 8000).catch(() => {});
      ok(new RegExp('^' + long + "'s day").test(await q.evaluate(() => document.getElementById('hm-day-h').textContent.trim())) && !(await L.overflow(q)), '390 shared: a 40 letter name wraps in its day card heading, no sideways scroll');
      await q.context().close();
    }
    ok(!p.errors.length, mode + ' Home: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
