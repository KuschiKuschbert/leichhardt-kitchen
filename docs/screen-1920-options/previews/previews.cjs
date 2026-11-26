/* Round 2 previews for the 1920 screens council (26 Nov 2026, docs/screen-1920-options/brief.md). Each design is CSS,
   with a little preview-only script, laid over the implemented app on the click-test stand-in; nothing here is the
   book. Run from a checkout of main with the click tests' packages (CHROME=... in a cloud session):
     node <this file>        (pictures and metrics.json next to it)
   The step 2 busy afternoon (synthetic data): Ann, a cook on Larder, on a shared section screen; Sam the sous chef. */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), OUT = __dirname;
const S = require(path.join(__dirname, '../../device-coverage/step2/shots.cjs'));
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve'));
const K = (...p) => ['kitchens', L.PIN, ...p].join('/'), today = L.ymd(new Date(L.NOW));
const long = Object.assign({}, S.extra);
['Butter', 'Flour', 'Caster sugar', 'Olive oil', 'Rice', 'Coconut milk', 'Limes', 'Coriander', 'Red onions', 'Garlic', 'Ginger', 'Chillies', 'Spring onions', 'Bean sprouts', 'Prawns', 'Chicken thighs', 'Beef mince', 'Brioche buns']
  .forEach((text, k) => { long[K('orders', today, 'lines', 'l' + k)] = { text, qty: '1 box', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - (90 - k) * 60000, ordered: false, deleted: false }; });

// A, the least change: the notebook as it is, running to the window bottom with the page's margin kept; Orders rows at
// a reading width, so ⋯ sits near the words. From 1536 px (a screen at 125 % gets it too).
const A = { bp: 1536, prepWall: false, css: `@media (min-width: 1536px) {
  .nb-page:not(.o-page) { height: max(30rem, calc(100dvh - var(--pv-top, 200px) - 2.5rem)) !important; }
  .o-page:not(.w-page):not(.tr-page) { max-width: 47rem; }
}` };
// B, rethink the flow: a section screen's Prep opens on the Wall board, mended: ⋯ back on each row, your own section's
// column first, and a column that empties keeps its place (code, not shown in a still picture). Handy is off the board
// (Back to the prep list). Orders in two columns, down then across. From 1600 px (125 % keeps today's layout).
const B = { bp: 1600, prepWall: true, css: `@media (min-width: 1600px) {
  .wb .nb-row .nb-more { display: inline-flex !important; }
  .wb-col.pv-mine { order: -1; }
  .wb-cols { grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); }
  .o-page:not(.w-page):not(.tr-page) .o-main > .nb-rows, .o-page:not(.w-page):not(.tr-page) .nb-body > .nb-rows { column-count: 2; column-gap: 2.5rem; }
  .o-page:not(.w-page):not(.tr-page) .nb-rows > .nb-row { break-inside: avoid; }
}` };
// C, remove the most friction: the notebook's list runs on across both pages, each section kept whole (a section never
// splits across the spine); Handy folds under the list ("Done today (2)", quick add inside). Orders at a reading width,
// as A. From 1281 px (wider laptops too).
const C = { bp: 1281, prepWall: false, fold: true, css: `@media (min-width: 1281px) {
  .nb-wrap:not(.nb-later) .nb-right { display: none !important; }
  .nb-wrap:not(.nb-later) .nb-left { flex: 1 1 100% !important; border-radius: 10px !important; border-right-width: 1.5px !important; border-right-style: solid !important; }
  .nb-wrap:not(.nb-later) .nb-left > .nb-body { column-count: 2; column-gap: 3rem; column-rule: 1px solid var(--rule, #DDD5C5); column-fill: balance; }
  .nb-wrap:not(.nb-later) .nb-left > .nb-body .nb-hd { break-after: avoid; }
  .nb-wrap:not(.nb-later) .nb-left > .nb-body .nb-rows { break-inside: avoid; }
  .nb-wrap:not(.nb-later) .nb-left > .nb-body .pv-done { column-span: all; margin-top: 0.75rem; }
  .o-page:not(.w-page):not(.tr-page) { max-width: 47rem; }
}` };
const DESIGNS = { A, B, C };

async function apply(p, d) {
  await p.addStyleTag({ content: d.css });
  await p.evaluate(fold => {
    const n = document.querySelector('.nb-left');
    if (n) document.documentElement.style.setProperty('--pv-top', Math.round(n.getBoundingClientRect().top + scrollY) + 'px');
    // B: the cook's own section column first (the build would use mySecNow(), as the notebook does)
    document.querySelectorAll('.wb-col[aria-label="Larder"]').forEach(c => c.classList.add('pv-mine'));
    // C: Handy's Done today as a fold under the list (preview only: the real one would be drawn by the page)
    if (fold && innerWidth >= 1281 && n && !document.querySelector('.pv-done')) {
      const box = document.querySelector('#nb-donebox'), body = n.querySelector('.nb-body');
      const d = document.createElement('details'); d.className = 'nb-fold pv-done';
      d.innerHTML = '<summary>Done today (2) and quick add</summary>'; if (box) d.appendChild(box.cloneNode(true));
      if (body) body.appendChild(d);
    }
  }, !!d.fold);
  await L.settle(p, 400);
}
const measure = (p, sel) => p.evaluate(sel => {
  const hit = (e, x, y) => { const a = document.elementFromPoint(x, y); return !!a && (a === e || e.contains(a)); };
  const all = [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length);
  const whole = all.filter(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && hit(e, r.left + 12, r.top + 3) && hit(e, r.left + 12, r.bottom - 3); });
  const reach = all.slice(0, 4).map(row => { const b = row.querySelector('.nb-box'), m = row.querySelector('.nb-more, [data-p="more"]');
    const br = b && b.getClientRects().length ? b.getBoundingClientRect() : null, mr = m && m.getClientRects().length ? m.getBoundingClientRect() : null;
    return br && mr ? Math.round(mr.left - br.right) : null; });
  const hs = all.map(e => Math.round(e.getBoundingClientRect().height)).sort((a, b) => a - b);
  return { rows: all.length, whole: whole.length, tickToMore: reach, medianRowH: hs[Math.floor(hs.length / 2)] || 0, sideways: document.documentElement.scrollWidth > innerWidth + 1,
    first: whole.length ? whole[0].textContent.trim().split('\n')[0].slice(0, 30) : '' };
}, sel);

(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  const open = async (hash, o) => { const p = await L.open(b, hash, Object.assign({ base, wait: 2200, touch: true }, o)); await S.fonts(p); await L.settle(p, 600); return p; };
  for (const [name, d] of Object.entries(DESIGNS)) {
    for (const [w, h, txt] of [[1920, 1008, 'default'], [1920, 1008, 'xlarge'], [1536, 806, 'default'], [1280, 900, 'default'], [768, 1024, 'default'], [390, 844, 'default']]) {
      const settings = txt === 'xlarge' ? { text: 'xlarge' } : {}, wall = d.prepWall && w >= d.bp;
      let p = await open('#/prep', Object.assign({ who: 'ann', deviceMode: 'shared', width: w, height: h, extra: S.extra, settings }, wall ? { init: "localStorage.setItem('lk.wall', '1')" } : {}));
      await apply(p, d);
      const tag = name + '-prep-' + w + (txt === 'xlarge' ? '-xlarge' : '');
      out[tag] = await measure(p, wall ? '.wb-col .nb-row' : '.nb-left .nb-row');
      if (w >= 1280 || w === 390) await p.screenshot({ path: path.join(OUT, tag + '.png') });
      await p.context().close();
      if (txt === 'xlarge' || w < 1280) continue;
      for (const [who, mode] of [['ann', 'shared'], ['sam', 'personal']]) {
        p = await open('#/orders', { who, deviceMode: mode, width: w, height: h, extra: long });
        await apply(p, d);
        const t2 = name + '-orders-' + w + '-' + who;
        out[t2] = await measure(p, '.o-page .nb-row');
        if (w === 1920) await p.screenshot({ path: path.join(OUT, t2 + '.png') });
        await p.context().close();
      }
    }
  }
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(out, null, 1) + '\n');
  await b.close(); server.close(); console.log('previews in ' + OUT); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
