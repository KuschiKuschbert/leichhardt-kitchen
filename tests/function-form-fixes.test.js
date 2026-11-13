// Manage functions form fixes (13 Nov 2026): a booking with its start TBC saves again, staggered times typed by hand move
// with the date, a duplicate keeps food after midnight on the next day, guests the page cannot save are named before the
// save, the review shows only what the kitchen sees, and a reschedule notice never shows a false time.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const today = L.ymd(new Date(L.NOW)), tomorrow = M.addDays(today, 1), day2 = M.addDays(today, 2), day3 = M.addDays(today, 3);
const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
const PEOPLE = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'fay', name: 'Fay', role: 'fnc', add: false, tick: false, del: false, fn: true, active: true }
];
const CFG = { people: PEOPLE, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'fay'], fnIds: ['fay'], showBadges: true };
const base = {
  [fsKey(['config', 'main'])]: CFG,
  [fsKey(['staffpins', 'fay'])]: { hash: L.sha('lk:fay:5151') }, [fsKey(['pinset', 'fay'])]: { at: 1 },
  [fsKey(['drinks', 'fay'])]: { kind: 'flat', at: 1, by: 'fay' }
};
// a saved function the way the book writes it
function fn(o) {
  const date = o.date || today, rounds = (o.rounds || ['18:30']).map(x => Array.isArray(x) ? { at: at(x[0], x[1]), note: '' } : { at: at(date, x), note: '' });
  const f = { v: o.v || 1, status: o.status || 'confirmed', name: o.name || 'Smith 50th', date, start: o.start === 0 ? 0 : at(date, o.start || '18:00'), st: o.start === 0, loc: 'Beer garden', guests: 60, gu: false,
    mode: rounds.length > 1 ? 'stag' : 'all', notes: o.notes || '', kc: '', kcBy: '', kcAt: 0, rounds,
    lines: (o.lines || [['pizza-platter', 'Pizza Platter', [3]]]).map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: 'Per platter.', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: o.was || {}, chg: [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: 'fay', upd: L.NOW - 3600000 };
  return M.derive(f);
}
const extra = docs => Object.assign({}, base, ...Object.keys(docs).map(id => ({ [fsKey(['functions', id])]: docs[id] })));
const setV = async (p, sel, v) => { await p.fill(sel, v); await p.$eval(sel, e => e.dispatchEvent(new Event('change', { bubbles: true }))); await L.settle(p, 80); };
const saved = async (p, name) => Object.values(await store(p)).filter(x => x && x.name === name && x.status)[0];

(async () => {
  const b = await L.start();
  let p;

  // 1. a function confirmed with its start TBC opens again with no 1970 date, and Save changes goes through
  p = await L.open(b, '#/functions/new', { who: 'fay', extra: base, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-ff="st"]'));
  await p.fill('[data-ff="name"]', 'Tbc party');
  await setV(p, '[data-ff="date"]', day2);
  await p.click('[data-ff="st"]'); await L.settle(p, 150);
  await p.click('[data-ff="gu"]'); await L.settle(p, 150);
  await L.pick(p, '#fe-platter', 'pizza-platter'); await L.settle(p, 100);
  await setV(p, '[data-ff="qty0"]', '4');
  await tap(p, '[data-fe="review"]'); await L.settle(p, 200);
  await tap(p, '[data-fe="confirm"]');
  await L.waitFor(p, () => /Confirmed/.test((document.querySelector('.fe-head') || {}).textContent || ''));
  let s = await store(p);
  const tbcKey = Object.keys(s).filter(k => /\/functions\/[^/]+$/.test(k) && s[k].name === 'Tbc party')[0], tbcId = tbcKey.split('/').pop();
  ok(s[tbcKey].start === 0 && s[tbcKey].rounds[0].at === 0, 'TBC: saved confirmed with no start and no food time');
  await p.context().close();
  p = await L.open(b, '#/functions/' + encodeURIComponent(tbcId), { who: 'fay', extra: s, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-ff="notes"]'));
  ok(await p.$eval('[data-ff="foodDate"]', e => e.value) === day2 && await p.$eval('[data-ff="foodT"]', e => e.value) === '' && !/1970|1 Jan/.test(await txt(p, '#fe-root') || ''),
    'TBC reopened: food goes out on the function\'s date with no time, never 01/01/1970 (' + await p.$eval('[data-ff="foodDate"]', e => e.value) + ')');
  await p.fill('[data-ff="notes"]', 'Cake at 20:00.');
  await tap(p, '[data-fe="save"]');
  await L.waitFor(p, () => /Version 2/.test((document.getElementById('fe-root') || {}).textContent || ''), null, 6000).catch(() => {});
  s = await store(p);
  ok(s[tbcKey].v === 2 && s[tbcKey].notes === 'Cake at 20:00.' && s[tbcKey].status === 'confirmed' && s[tbcKey].start === 0 && !(await p.$('.fe-probs')),
    'TBC reopened: Save changes saves the note, still confirmed and TBC (' + (await txt(p, '.fe-probs') || 'no problems') + ')');
  ok(p.errors.length === 0, 'TBC: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
