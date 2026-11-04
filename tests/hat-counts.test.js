// Small lines on the chef hat's tiles (4 Nov 2026, a piece of B in the agreed work pages design,
// docs/work-pages-design-options/options.html): only what the book already knows. "Today 18:30" on Functions (the next
// confirmed function today, by its first food), the next cut-off today not ticked yet on Supplier order ("PFD 15:00"),
// and "1 to sign" on Meeting minutes as before. No reads of their own. The pages open at 14:00 kitchen time.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const today = L.ymd(new Date(L.NOW)), tmr = M.addDays(today, 1);
const next = (new Date(L.NOW).getDay() + 1) % 7;
const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true }
];
function fn(o) {
  return M.derive({ v: 1, status: 'confirmed', name: o.name, date: o.date, start: at(o.date, o.start), st: false, loc: '', guests: 40, gu: false, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: o.rounds.map(x => ({ at: at(o.date, x), note: '' })), lines: [{ rid: 'aussie-platter', name: 'Aussie Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 5, u: M.toU([5]) }],
    was: {}, chg: [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: 'fay', upd: L.NOW - 3600000 });
}
function seed(o) {
  const x = { [CFG]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann'], showBadges: true, cutoffs: o.cuts || [] } };
  (o.fns || []).forEach((f, i) => { x[fsKey(['functions', 'f' + i])] = fn(f); });
  Object.assign(x, o.more || {});
  return x;
}
const CUTS = [
  { id: 'chk', name: 'Chicken', dd: [next], at: 13 * 60, pre: 1 },          // gone at 13:00
  { id: 'pfd', name: 'PFD', dd: [next], at: 15 * 60, pre: 1 },              // the next one
  { id: 'veg', name: 'Veg <b>co</b>', dd: [next], at: 17 * 60 + 30, pre: 1 }
];
const FNS = [
  { name: 'Brown 21st', date: tmr, start: '17:00', rounds: ['17:30'] },     // tomorrow: not today
  { name: 'Late one', date: today, start: '20:00', rounds: ['20:30'] },
  { name: 'Smith 50th', date: today, start: '18:00', rounds: ['18:30', '19:30'] }
];
async function hat(p) {
  await p.click('.wtop-who'); await L.settle(p, 300);
  return p.evaluate(() => {
    const line = sel => { const t = document.querySelector('.wm ' + sel); if (!t) return null; const s = t.querySelector('small'); return s ? s.textContent : ''; };
    return { fn: line('.wm-fn, .wm-fv'), sup: line('.wm-supplier'), markup: !!document.querySelector('.wm small b') };
  });
}
(async () => {
  const b = await L.start();
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    let p = await L.open(b, '#/prep', { who: 'sam', width: w, height: h, extra: seed({ cuts: CUTS, fns: FNS }), wait: 1800 });
    let t = await hat(p);
    ok(t.fn === 'Today 18:30', w + ' px sous chef: Functions says when the next function today serves first (' + t.fn + ')');
    ok(t.sup === 'PFD 15:00', w + ' px sous chef: Supplier order says the next cut-off today, not one already gone (' + t.sup + ')');
    ok(p.errors.length === 0, w + ' px sous chef: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // PFD ticked as ordered: the next one shows, its name as plain words
  const done = { [fsKey(['cutdone', today + '_pfd'])]: { day: today, sid: 'pfd', on: true, at: L.NOW - 600000, by: 'sam' } };
  let p = await L.open(b, '#/prep', { who: 'sam', extra: seed({ cuts: CUTS, fns: FNS, more: done }), wait: 1800 });
  let t = await hat(p);
  ok(t.sup === 'Veg <b>co</b> 17:30' && !t.markup, 'a cut-off ticked as ordered: the next one shows, its name as plain words (' + t.sup + ')');
  await p.context().close();

  // nothing today: no small lines
  p = await L.open(b, '#/prep', { who: 'sam', extra: seed({ cuts: [{ id: 'pfd', name: 'PFD', dd: [(next + 3) % 7], at: 15 * 60, pre: 1 }], fns: [FNS[0]] }), wait: 1800 });
  t = await hat(p);
  ok(t.fn === '' && t.sup === '', 'no function and no cut-off today: the tiles carry no small line (' + JSON.stringify(t) + ')');
  await p.context().close();

  // staff: the Functions line too, and no Supplier order tile
  p = await L.open(b, '#/prep', { who: 'ann', extra: seed({ cuts: CUTS, fns: FNS }), wait: 1800 });
  t = await hat(p);
  ok(t.fn === 'Today 18:30' && t.sup === null, 'staff: Functions says Today 18:30, and there is no Supplier order tile (' + JSON.stringify(t) + ')');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
