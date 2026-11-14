/* Baseline for the function handover council (two-way Sent check, 14 Nov 2026). Opens the real book in the click-test
   stand-in (no Firebase, nothing written to the real book) with made-up people and functions at 18:10 kitchen time,
   then saves screenshots and static snapshots (scripts removed) of the service view and the Functions coordinator's
   Home in baseline/. The design previews start from these snapshots.
   Run from the repo root: CHROME=<headless shell> node docs/function-handover-options/capture-baseline.cjs */
const path = require('path'), fs = require('fs');
const root = path.resolve(__dirname, '../..');
const L = require(path.join(root, 'tests/lib')), M = require(path.join(root, 'js/functions.js'));
const out = path.join(__dirname, 'baseline');
fs.mkdirSync(out, { recursive: true });
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm));
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'head', add: true, tick: true, del: true, active: true },
  { id: 'fay', name: 'Fay', role: 'fnc', add: false, tick: false, del: false, fn: true, active: true }
];
const cfg = { people, headId: 'bo', sousIds: ['sam', 'bo'], pingIds: ['sam', 'bo'], fnIds: ['fay'], staffIds: ['sam', 'ann', 'bo', 'fay'], showBadges: true };
function fn(o) {
  const date = o.date || today, rounds = (o.rounds || ['18:30']).map(x => ({ at: at(date, x), note: '' }));
  return M.derive({ v: 1, status: 'confirmed', name: o.name, date, start: at(date, o.start || '17:30'), loc: o.loc || 'Function room', guests: o.guests || 40,
    mode: rounds.length > 1 ? 'stag' : 'all', notes: o.notes || '', kc: '', kcBy: '', kcAt: 0, rounds,
    lines: o.lines.map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: '', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: {}, chg: [], cBy: 'fay', cAt: 1, confBy: 'fay', confAt: 1, by: 'fay', upd: L.NOW - 3600000 });
}
const F = {
  b60: fn({ name: 'Birthday 60th', start: '17:30', rounds: ['18:00', '18:45', '19:30'], notes: '3 gluten free, 1 vegan. Nut allergy at table 4.',
    lines: [['antipasto-platter', 'Antipasto Platter', [2, 1, 0]], ['pizza-platter', 'Pizza Platter', [2, 2, 1]]] }),
  club: fn({ name: 'Rotary dinner', start: '18:00', rounds: ['18:20'], guests: 25, loc: 'Beer garden', lines: [['antipasto-platter', 'Antipasto Platter', [4]]] })
};
const extra = () => Object.assign({ [key(['config', 'main'])]: cfg, [key(['staffpins', 'fay'])]: { hash: L.sha('lk:fay:5151') }, [key(['pinset', 'fay'])]: { at: 1 }, [key(['drinks', 'fay'])]: { kind: 'flat', at: 1, by: 'fay' } },
  ...Object.keys(F).map(id => ({ [key(['functions', id])]: F[id] })));
async function snap(p, name) {
  const html = await p.evaluate(() => {
    const d = document.documentElement.cloneNode(true);
    d.querySelectorAll('script, link[rel="manifest"], link[rel="preconnect"], meta[http-equiv]').forEach(e => e.remove());
    return '<!doctype html>\n' + d.outerHTML;
  });
  const fixed = html.replace('<head>', '<head><base href="../../../">').replace(/<link[^>]+fonts\.googleapis[^>]+>/g, '<link rel="stylesheet" href="docs/order-list-options/assets/fonts.css">');
  fs.writeFileSync(path.join(out, name + '.html'), fixed);
}
async function measure(p) {
  return p.evaluate(() => {
    const rows = [...document.querySelectorAll('.fn-svc-board .fn-svc-row')];
    return { rows: rows.length, rowsStarted: rows.filter(r => r.getBoundingClientRect().top < innerHeight - 64).length, rowsWhole: rows.filter(r => r.getBoundingClientRect().bottom <= innerHeight - 64).length,
      rowHeights: rows.map(r => Math.round(r.getBoundingClientRect().height)), sentButton: (() => { const b = document.querySelector('.fn-svc-board [data-fn="sent"]'); if (!b) return null; const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })() };
  });
}
(async () => {
  const srv = await new Promise(res => { const s = require(path.join(root, 'tests/serve')); s.listen(8777, '127.0.0.1', () => res(s)); });
  const b = await L.start(), m = {};
  const clock = at(today, '18:10');
  let p = await L.open(b, '#/fn/now', { who: 'ann', extra: extra(), clock, width: 390, height: 844, wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('.fn-svc-board .fn-svc-row').length >= 4);
  await L.settle(p, 400);
  await p.screenshot({ path: path.join(out, 'service-cook-390.png') });
  await p.screenshot({ path: path.join(out, 'service-cook-390-full.png'), fullPage: true });
  m.cook = await measure(p);
  await snap(p, 'service-cook');
  await p.click('.fn-svc-row [data-fn="sent"][data-id="b60"]'); await L.settle(p, 600);
  await p.screenshot({ path: path.join(out, 'service-cook-after-sent-390.png') });
  m.afterSent = await measure(p);
  await snap(p, 'service-cook-after-sent');
  await p.context().close();
  p = await L.open(b, '#/', { who: 'fay', extra: extra(), clock, width: 390, height: 844, wait: 1500 });
  await L.settle(p, 800);
  await p.screenshot({ path: path.join(out, 'home-coordinator-390.png') });
  await snap(p, 'home-coordinator');
  await p.context().close();
  // the Functions coordinator's own service view: her shell (Recipes only, no chef hat menu), for the coordinator previews
  p = await L.open(b, '#/fn/now', { who: 'fay', extra: extra(), clock, width: 390, height: 844, wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('.fn-svc-board .fn-svc-row').length >= 4); await L.settle(p, 400);
  await p.screenshot({ path: path.join(out, 'service-coordinator-390.png') });
  await snap(p, 'service-coordinator');
  await p.context().close();
  p = await L.open(b, '#/fn/now', { who: 'ann', extra: extra(), clock, width: 1280, height: 900, wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('.fn-svc-board .fn-svc-row').length >= 4); await L.settle(p, 400);
  await p.screenshot({ path: path.join(out, 'service-cook-1280.png') });
  m.cook1280 = await measure(p);
  await p.context().close();
  m.note = 'Implemented app, commit 5d92379, click-test stand-in, synthetic fixture, kitchen clock 18:10, cook Ann (staff) and Fay (Functions coordinator). The 64 px tab bar is taken off the visible height.';
  fs.writeFileSync(path.join(out, 'measurements.json'), JSON.stringify(m, null, 2) + '\n');
  console.log(JSON.stringify(m));
  await b.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
