/* Design M, step 1 as built (26 Nov 2026): the implemented Cleaning page in the click-test stand-in, measured the same way
   as the baseline and the designs (docs/cleaning-look-options/). Made-up people, the head chef's lists under made-up
   sections, Wednesday 2 December 2026 14:00. Run from the worktree root: node docs/cleaning-look-options/built/shots.cjs */
const path = require('path'), fs = require('fs');
const F = require('../../cleaning-tracking-options/designs/frame.cjs');
const OUT = __dirname, out = {};
const look = p => p.evaluate(() => {
  const vh = innerHeight, rows = [...document.querySelectorAll('.cln-page .nb-row')].filter(r => r.getClientRects().length);
  const bars = [...document.querySelectorAll('nav, .tabbar')].map(n => n.getBoundingClientRect()).filter(b => b.height > 0 && b.top > vh / 2 && b.bottom >= vh - 2), floor = bars.length ? Math.min(...bars.map(b => b.top)) : vh;
  const box = rows[0] && rows[0].querySelector('.nb-box');
  return { rowsInView: rows.filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= floor; }).length, firstBoxTop: box ? Math.round(box.getBoundingClientRect().top) : null,
    screensLong: Math.round(document.documentElement.scrollHeight / vh * 10) / 10, sideways: document.documentElement.scrollWidth > innerWidth };
});
const station = (width, height, picked) => F.L.open(F.browser(), '#/cleaning', { who: 'ann', width, height, touch: true, base: F.base(), extra: F.cleaning, clock: F.WED, wait: 1000, deviceMode: 'shared', profile: { v: 2, mode: 'shared', ownerId: '', sec: 'grill' },
  init: new Function("const d = new Date(Date.now() + 36e5 * 10).toISOString().slice(0, 10); localStorage.setItem('lk.sec.ann', JSON.stringify({ d, sec: '" + picked + "', name: '" + picked + "', self: true, at: Date.now() }));") });
(async () => {
  await F.start();
  try {
    for (const [w, h] of [[390, 844], [768, 1024], [1280, 800]]) {
      const p = await F.cook(w); await p.setViewportSize({ width: w, height: h }); await F.L.settle(p, 400);
      out['cook-' + w] = await look(p); await p.screenshot({ path: path.join(OUT, 'cook-' + w + '.png') }); await p.context().close();
    }
    for (const [name, w, h, picked] of [['station-1920', 1920, 1080, 'grill'], ['station-pans-cook-1920', 1920, 1080, 'pans'], ['station-pans-cook-390', 390, 844, 'pans']]) {
      const p = await station(w, h, picked);
      await F.L.waitFor(p, () => { const pg = document.querySelector('.cln-page'); return pg && !/Loading cleaning/.test(pg.textContent); });
      await F.fonts(p); await F.L.settle(p, 400);
      out[name] = await look(p); await p.screenshot({ path: path.join(OUT, name + '.png') }); await p.context().close();
    }
  } finally { await F.stop(); }
  fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify({ kind: 'Implemented app in the click-test stand-in (synthetic data)', commit: require('child_process').execSync('git rev-parse --short HEAD').toString().trim(), results: out }, null, 1) + '\n');
  for (const k in out) console.log(k, JSON.stringify(out[k]));
})().catch(e => { console.error(e); process.exit(1); });
