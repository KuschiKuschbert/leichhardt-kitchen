/* Baseline for the "prep lines for a later day" council (17 Nov 2026). Opens the real book in the click-test stand-in
   (no Firebase, nothing written to the real book) with the made-up people of tests/lib.js and their six prep lines for
   today. Saves screenshots at 390 x 844 (and the chef's page at 1280 x 800), static snapshots (scripts removed) the design
   previews start from, and measurements.
   Run from tests/: cp ../docs/prep-ahead-options/capture-baseline.cjs zz-pa.test.js && CHROME=... npm test -- zz-pa; rm zz-pa.test.js */
const path = require('path'), fs = require('fs');
const root = path.resolve(process.cwd(), '..');
const L = require(path.join(root, 'tests/lib'));
const out = path.join(root, 'docs/prep-ahead-options/baseline');
const key = q => ['kitchens', L.PIN].concat(q).join('/'), today = L.ymd(new Date(L.NOW));
// a line written three days ago at 16:05 for today (as if writing ahead were possible), to show how it reads on its day
const t0 = new Date(L.NOW - 3 * 86400000); const at1605 = Date.parse(L.ymd(t0) + 'T06:05:00Z');
const AHEAD = { [key(['days', today, 'items', 'a1'])]: { text: 'Thaw brisket', station: 'Grill', qty: '2', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: at1605, done: false, deleted: false } };
fs.mkdirSync(out, { recursive: true });
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
    // a row counts only when all of it shows above the docked Add a line bar and the tab bar (whichever is higher)
    const tops = [...document.querySelectorAll('.wk-dock, .tabbar, nav.tabs')].map(e => e.getBoundingClientRect()).filter(r => r.height && r.top > innerHeight * 0.5 && r.top < innerHeight).map(r => r.top);
    const vh = Math.min(innerHeight, ...tops), vis = s => [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return r.height && r.top >= 0 && r.bottom <= vh; }).length;
    const q = s => document.querySelector(s);
    return { rowsInView: vis('.nb-row'), visibleBottom: Math.round(vh), rowsTotal: document.querySelectorAll('.nb-row').length, title: (q('#rtitle') || {}).textContent || '',
      dayNav: !!q('.nb-nav'), addLine: !!q('.nb-addline'), foot: ((q('.nb-foot') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
      empty: ((q('.nb-empty') || {}).textContent || '').replace(/\s+/g, ' ').trim(), overflow: document.documentElement.scrollWidth - innerWidth };
  });
}
(async () => {
  const b = await L.start(), notes = [];
  // [name, who, width, height, steps, extra]: steps run in order after the page settles
  const runs = [
    ['chef-add-sheet', 'sam', 390, 844, [p => p.click('.nb-addline')]],
    ['staff-day-arrives', 'ann', 390, 844, [], AHEAD],
    ['staff-today', 'ann', 390, 844, []],
    ['staff-add-sheet', 'ann', 390, 844, [p => p.click('.nb-addline')]],
    ['chef-today', 'sam', 390, 844, []],
    ['chef-ahead-3', 'sam', 390, 844, [p => p.click('[data-p="day"][data-d="1"]'), p => p.click('[data-p="day"][data-d="1"]'), p => p.click('[data-p="day"][data-d="1"]')]],
    ['chef-today-1280', 'sam', 1280, 800, []],
    // the verified admin (Google, head chef PIN and grant): the head chef asked for planning ahead to be admin only
    ['admin-ahead-3', 'admin', 390, 844, [p => p.click('[data-p="day"][data-d="1"]'), p => p.click('[data-p="day"][data-d="1"]'), p => p.click('[data-p="day"][data-d="1"]')]],
    ['admin-ahead-1', 'admin', 390, 844, [p => p.click('[data-p="day"][data-d="1"]')]]
  ];
  for (const [name, who, w, h, steps, extra] of runs) {
    const p = await L.open(b, '#/prep', Object.assign({ width: w, height: h, wait: 2500, extra }, who === 'admin' ? { admin: true } : { who }));
    await L.settle(p, 1500);
    for (const s of steps) { await s(p); await L.settle(p, 700); }
    notes.push({ name, who, width: w, ...(await measure(p)) });
    await p.screenshot({ path: path.join(out, name + '.png') });
    await snap(p, name);
    await p.context().close();
  }
  fs.writeFileSync(path.join(out, 'measurements.json'), JSON.stringify({ source: 'Implemented app (main 70ce8f4), click-test stand-in, synthetic data, ' + L.ymd(new Date(L.NOW)) + ' 14:00 Queensland', notes }, null, 2) + '\n');
  console.log(JSON.stringify(notes, null, 1));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
