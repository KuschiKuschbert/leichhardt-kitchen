/* The built feature (17 Nov 2026), on the implemented app in the click-test stand-in with synthetic data: the admin on a
   later day (three days ahead), the add sheet, a sous chef's read-only view, tomorrow, and a planned line on its day.
   Saves screenshots and measurements to built/. Run from tests/:
   cp ../docs/prep-ahead-options/capture-built.cjs zz-pb.test.js && CHROME=... npm test -- zz-pb; rm zz-pb.test.js */
const path = require('path'), fs = require('fs');
const root = path.resolve(process.cwd(), '..');
const L = require(path.join(root, 'tests/lib'));
const out = path.join(root, 'docs/prep-ahead-options/built');
fs.mkdirSync(out, { recursive: true });
const DAY = 86400000, key = q => ['kitchens', L.PIN].concat(q).join('/');
const today = L.ymd(new Date(L.NOW)), later = L.ymd(new Date(L.NOW + 3 * DAY));
const plan = (d, id, text, station, qty, at) => ({ [key(['days', d, 'items', id])]: { text, station, qty, recipe: '', addedBy: 'Head chef', addedById: 'head', addedAt: at, done: false, deleted: false, plan: d } });
const PLANNED = Object.assign({}, plan(later, 'pl1', 'Thaw brisket', 'Grill', '2', L.NOW - 600000), plan(later, 'pl2', 'Pizza dough', 'Larder', '3 batch', L.NOW - 2 * DAY));
const ARRIVES = plan(today, 'pd1', 'Thaw brisket', 'Grill', '2', L.NOW - 3 * DAY + 2 * 3600000);
const fwd = n => async p => { for (let i = 0; i < n; i++) { await p.click('[data-p="day"][data-d="1"]'); await L.settle(p, 400); } };
async function measure(p) {
  return p.evaluate(() => {
    const tops = [...document.querySelectorAll('.wk-dock, .tabbar')].map(e => e.getBoundingClientRect()).filter(r => r.height && r.top > innerHeight * 0.5 && r.top < innerHeight).map(r => r.top);
    const vh = Math.min(innerHeight, ...tops), vis = s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return r.height && r.top >= 0 && r.bottom <= vh; }).length;
    const small = [...document.querySelectorAll('.nb-left button, .nb-left a, .p-sheet button, .nb-addline')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && r.top < innerHeight && (r.height < 44 || r.width < 44); }).map(e => (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
    return { rowsInView: vis('.nb-row'), rowsTotal: document.querySelectorAll('.nb-row').length, overflow: document.documentElement.scrollWidth - innerWidth, under44: small };
  });
}
(async () => {
  const b = await L.start(), notes = [];
  const runs = [
    ['admin-later', { admin: true }, PLANNED, [fwd(3)], [[390, 844], [768, 1024], [1280, 800]]],
    ['admin-sheet', { admin: true }, PLANNED, [fwd(3), p => p.click('.nb-addline')], [[390, 844], [1280, 800]]],
    ['sous-later', { who: 'sam' }, PLANNED, [fwd(3)], [[390, 844]]],
    ['admin-tomorrow', { admin: true }, {}, [fwd(1)], [[390, 844]]],
    ['staff-on-its-day', { who: 'ann' }, ARRIVES, [], [[390, 844]]],
    ['chef-today', { who: 'sam' }, {}, [], [[390, 844]]]
  ];
  for (const [name, who, extra, steps, sizes] of runs) {
    for (const [w, h] of sizes) {
      const p = await L.open(b, '#/prep', Object.assign({ width: w, height: h, wait: 2500, extra }, who));
      await L.settle(p, 1200);
      for (const s of steps) { await s(p); await L.settle(p, 600); }
      notes.push({ name, width: w, ...(await measure(p)), errors: p.errors.length });
      await p.screenshot({ path: path.join(out, name + (w === 390 ? '' : '-' + w) + '.png') });
      await p.context().close();
    }
  }
  fs.writeFileSync(path.join(out, 'measurements.json'), JSON.stringify({ source: 'Implemented app (this branch), click-test stand-in, synthetic data, ' + today + ' 14:00 Queensland', notes }, null, 2) + '\n');
  console.log(JSON.stringify(notes.map(n => [n.name, n.width, n.rowsInView, n.rowsTotal, n.overflow, n.errors, n.under44.join(';')])));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
