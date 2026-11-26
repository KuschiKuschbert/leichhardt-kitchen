/* The council on the 1920 screens (26 Nov 2026), C: how big each control's tap really is, on the click-test stand-in
   with the step 2 busy afternoon (synthetic). For the first rows of Prep, Orders and Cleaning, every button, link and
   box in the row: its drawn box, and its tap area found by probing elementFromPoint 1 px at a time out from its centre
   (so a padded or ::after hit area counts), and the gap to the next control. 1920 x 1008 with touch and with a mouse,
   768 x 1024 and 390 x 844 with touch.
     OUT=docs/screen-1920-options node docs/screen-1920-options/taps.cjs   (from the repo root, CHROME=... in a cloud session) */
const path = require('path'), fs = require('fs'), ROOT = process.cwd(), OUT = process.env.OUT || path.join(ROOT, 'docs/screen-1920-options');
const L = require(path.join(ROOT, 'tests/lib')), server = require(path.join(ROOT, 'tests/serve'));
const { extra, fonts } = require(path.join(ROOT, 'docs/device-coverage/step2/shots.cjs'));
const PAGES = [['prep', '#/prep', '.nb-row'], ['orders', '#/orders', '.nb-row'], ['cleaning', '#/cleaning', '.cln-row']];
const SIZES = [[1920, 1008, true, '1920-touch'], [1920, 1008, false, '1920-mouse'], [768, 1024, true, '768'], [390, 844, true, '390']];
const probe = (p, rowSel) => p.evaluate(rowSel => {
  const row = [...document.querySelectorAll(rowSel)].find(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight && b.height > 0; });
  if (!row) return null;
  const ctl = [...row.querySelectorAll('button, a[href], [role="button"], input, summary, [data-p], [data-cln], [data-lm]')]
    .filter((e, i, a) => e.getClientRects().length && !a.some(o => o !== e && o.contains(e) && (o.matches('button, a[href], [role="button"], summary'))));
  const hits = (e, x, y) => { const at = document.elementFromPoint(x, y); return !!at && (at === e || e.contains(at)); };
  const out = ctl.map(e => {
    const r = e.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (!hits(e, cx, cy)) return { name: (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 24), drawn: [Math.round(r.width), Math.round(r.height)], tap: null };
    const reach = (dx, dy) => { let n = 0; while (n < 200 && hits(e, cx + dx * (n + 1), cy + dy * (n + 1))) n++; return n; };
    const left = reach(-1, 0), right = reach(1, 0), up = reach(0, -1), down = reach(0, 1);
    return { name: (e.getAttribute('aria-label') || e.textContent || e.className).trim().replace(/\s+/g, ' ').slice(0, 24),
      drawn: [Math.round(r.width), Math.round(r.height)], tap: [left + right + 1, up + down + 1], x: Math.round(cx - left), x2: Math.round(cx + right) };
  }).sort((a, b) => (a.x || 0) - (b.x || 0));
  out.forEach((c, i) => { const n = out[i + 1]; if (c.tap && n && n.tap) c.gapToNext = n.x - c.x2 - 1; });
  return { rowHeight: Math.round(row.getBoundingClientRect().height), controls: out };
}, rowSel);
(async () => {
  const port = 20000 + Math.floor(Math.random() * 20000); await new Promise(r => server.listen(port, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + port + '/', b = await L.start(), out = {};
  for (const [name, hash, rowSel] of PAGES) for (const [w, h, touch, label] of SIZES) {
    const p = await L.open(b, hash, { width: w, height: h, touch, base, extra, who: 'ann', deviceMode: 'shared', wait: 2200 });
    await fonts(p); await L.settle(p, 500);
    out[name + '-' + label] = await probe(p, rowSel);
    await p.context().close();
  }
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'taps.json'), JSON.stringify(out, null, 1) + '\n');
  await b.close(); server.close(); console.log('taps.json in ' + OUT); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
