/* Baseline for the "functions ahead of time" council (10 Nov 2026). Opens the real book in the click-test stand-in
   (no Firebase, nothing written to the real book) with made-up people and functions, then saves:
   - screenshots of Home and Prep at 390 px (and Home at 1280 px) for a staff member and the head chef;
   - static snapshots of each rendered page (scripts removed) in baseline/, which the design previews start from.
   Run from tests/: cp ../docs/function-ahead-options/capture-baseline.cjs zz-fa.test.js && npm test -- zz-fa; rm zz-fa.test.js
   (the copy runs inside the test runner, which serves the repo on 127.0.0.1:8777). */
const path = require('path'), fs = require('fs');
const root = path.resolve(process.cwd(), '..');
const L = require(path.join(root, 'tests/lib')), M = require(path.join(root, 'js/functions.js'));
const out = path.join(root, 'docs/function-ahead-options/baseline');
fs.mkdirSync(out, { recursive: true });
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm));
const names = { ann: 'Ann', bo: 'Bo', cleo: 'Cleo', dev: 'Dev', eli: 'Eli', fern: 'Fern', gus: 'Gus', hana: 'Hana' };
const people = Object.keys(names).map(id => ({ id, name: names[id], role: id === 'bo' ? 'head' : 'staff', active: true, add: true, tick: true, del: id === 'bo', fn: false }));
const secs = [{ id: 'hot', name: 'Hot larder' }, { id: 'pans', name: 'Pans' }, { id: 'pass', name: 'Pass' }, { id: 'prep', name: 'Prep' }, { id: 'grill', name: 'Grill' }, { id: 'salad', name: 'Salads and cold larder' }];
const shifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260 }];
const on = [
  { id: 'ann', sh: 'lunch', sec: 'hot' }, { id: 'ann', sh: 'dinner', sec: 'prep' }, { id: 'bo', sh: 'lunch', sec: 'pans' }, { id: 'bo', sh: 'dinner', sec: 'hot' },
  { id: 'cleo', sh: 'lunch', sec: 'pass' }, { id: 'cleo', sh: 'dinner', sec: 'pans' }, { id: 'dev', sh: 'lunch', sec: 'prep' },
  { id: 'eli', sh: 'lunch', sec: 'grill' }, { id: 'eli', sh: 'dinner', sec: 'grill' }, { id: 'fern', sh: 'lunch', sec: 'salad' }, { id: 'fern', sh: 'dinner', sec: 'salad' },
  { id: 'gus', sh: 'dinner', sec: 'pass' }, { id: 'hana', sh: 'lunch', sec: 'salad' }];
const br = [{ id: 'ann', sh: 'lunch', at: 780, len: 30 }, { id: 'eli', sh: 'lunch', at: 900, len: 30 }];
const cfg = { people, headId: 'bo', sousIds: ['bo'], pingIds: ['bo'], fnIds: [], staffIds: Object.keys(names), showBadges: true, kitSecs: secs, kitShifts: shifts };
function fn(name, plus, o) {
  const date = M.addDays(today, plus), rounds = (o.rounds || ['18:30']).map(x => ({ at: at(date, x), note: '' }));
  return M.derive({ v: 1, status: 'confirmed', name, date, start: at(date, o.start || '17:30'), loc: o.loc || 'Function room', guests: o.guests || 40,
    mode: rounds.length > 1 ? 'stag' : 'all', notes: o.notes || '', kc: '', kcBy: '', kcAt: 0, rounds, od: o.od || '',
    lines: o.lines.map(([rid, nm, a]) => ({ rid, name: nm, unit: 'platter', spec: '', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: {}, chg: [], cBy: 'bo', cAt: 1, confBy: 'bo', confAt: 1, by: 'bo', upd: L.NOW - 86400000 });
}
// Thursday: Smith 60th (2 days ahead, ordered last Sunday); Saturday: Jones wedding (4 days ahead)
const FN = {
  smith: fn('Smith 60th', 2, { start: '18:00', rounds: ['18:30', '19:15'], guests: 60, notes: '4 gluten free, 1 nut allergy.', od: M.addDays(today, -2),
    lines: [['antipasto-platter', 'Antipasto Platter', [3, 2]], ['pizza-platter', 'Pizza Platter', [2, 3]]] }),
  jones: fn('Jones wedding', 4, { start: '17:00', rounds: ['18:00'], guests: 90, loc: 'Beer garden', od: M.addDays(today, -2),
    lines: [['antipasto-platter', 'Antipasto Platter', [6]]] })
};
// prep lines: the stand-in's own six lines for today (tests/lib.js)
function extra(fns) {
  const e = { [key(['config', 'main'])]: cfg, [key(['team', today])]: { day: today, on, br, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'bo' } };
  Object.keys(fns).forEach(id => { e[key(['functions', id])] = fns[id]; });
  return e;
}
async function snap(p, name) {
  const html = await p.evaluate(() => {
    const d = document.documentElement.cloneNode(true);
    d.querySelectorAll('script, link[rel="manifest"], link[rel="preconnect"], meta[http-equiv]').forEach(e => e.remove());
    return '<!doctype html>\n' + d.outerHTML;
  });
  // the repo root for every relative address, and the bundled preview fonts in place of Google Fonts
  const fixed = html.replace('<head>', '<head><base href="../../../">').replace(/<link[^>]+fonts\.googleapis[^>]+>/g, '<link rel="stylesheet" href="docs/order-list-options/assets/fonts.css">');
  fs.writeFileSync(path.join(out, name + '.html'), fixed);
}
(async () => {
  const b = await L.start(), notes = [];
  const runs = [
    ['home-staff', '#/', { who: 'ann' }, 390], ['prep-staff', '#/prep', { who: 'ann' }, 390], ['orders-staff', '#/orders', { who: 'ann' }, 390],
    ['home-head', '#/', { admin: true }, 390], ['home-head-1280', '#/', { admin: true }, 1280]
  ];
  for (const [name, hash, who, width] of runs) {
    const p = await L.open(b, hash, Object.assign({ extra: extra(FN), width, height: width === 390 ? 844 : 900, wait: 2500 }, who));
    await L.settle(p, 1500);
    const m = await p.evaluate(() => {
      const top = s => { const e = document.querySelector(s); return e && !e.hidden && e.getBoundingClientRect().height ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
      const band = document.querySelector('#fn-band');
      return { band: band && !band.hidden ? Math.round(band.getBoundingClientRect().height) : 0, comingUpTop: top('.hm-up'), fnInComingUp: /Smith 60th/.test((document.querySelector('.hm-up') || {}).textContent || ''),
        pageHeight: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    notes.push({ name, hash, width, ...m });
    await p.screenshot({ path: path.join(out, name + '.png') });
    if (width === 390) await p.screenshot({ path: path.join(out, name + '-full.png'), fullPage: true });
    await snap(p, name);
    await p.context().close();
  }
  // the band as it is on the day before and on the day: the states every design keeps
  for (const [name, plus] of [['prep-staff-day-before', 1], ['prep-staff-on-the-day', 0]]) {
    const one = { smith: fn('Smith 60th', plus, { start: '13:30', rounds: plus ? ['18:30', '19:15'] : ['14:10', '15:00'], guests: 60, od: M.addDays(today, -2), lines: [['antipasto-platter', 'Antipasto Platter', [3, 2]], ['pizza-platter', 'Pizza Platter', [2, 3]]] }) };
    const p = await L.open(b, '#/prep', { who: 'ann', extra: extra(one), width: 390, height: 844, wait: 2500 });
    await L.settle(p, 1500);
    const band = await p.evaluate(() => { const e = document.querySelector('#fn-band'); return e && !e.hidden ? Math.round(e.getBoundingClientRect().height) : 0; });
    notes.push({ name, band });
    await p.screenshot({ path: path.join(out, name + '.png') });
    await snap(p, name);
    await p.context().close();
  }
  fs.writeFileSync(path.join(out, 'measurements.json'), JSON.stringify({ source: 'Implemented app, click-test stand-in, synthetic data, ' + today, notes }, null, 2) + '\n');
  console.log(JSON.stringify(notes));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
