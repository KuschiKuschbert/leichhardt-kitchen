/* Review-only capture of three mascot placements at phone, tablet and laptop width, with and without
 * Christmas Day ornaments. Firebase stand-in, synthetic staff. Run like capture.mjs. */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), fs = require('fs'), path = require('path');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'docs/mascot-cycle-options'), OUT = path.join(DIR, 'placements');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/'; process.env.BASE = BASE;
const L = require(path.join(ROOT, 'tests/lib'));
const key = p => ['kitchens', L.PIN, ...p].join('/'), day = L.ymd(new Date(L.NOW));
const people = [{ id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true }, { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true }, { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true }];
const cfg = { people, staffIds: ['ann', 'sam', 'bo'], sousIds: ['sam'], kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }], kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }] };
const plan = { day, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'dinner', sec: 'larder' }], br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' };
const fixture = { [key(['config', 'main'])]: cfg, [key(['team', day])]: plan };
const fonts = [['Barlow', 400, 'docs/kitchen-mascot/assets/fonts/barlow-400.ttf'], ['Barlow', 600, 'docs/kitchen-mascot/assets/fonts/barlow-600.ttf'], ['Barlow', 700, 'docs/kitchen-mascot/assets/fonts/barlow-700.ttf'], ['Barlow Condensed', 700, 'docs/kitchen-mascot/assets/fonts/barlow-condensed-700.ttf'], ['Caveat', 700, 'docs/order-list-options/assets/WnznHAc5bAfYB2QRah7pcpNvOx-pjRV6SII.ttf']];
const css = fonts.map(([f, w], i) => `@font-face{font-family:'${f}';font-weight:${w};font-style:normal;src:url(https://fonts.gstatic.com/place-font-${i}.ttf) format('truetype')}`).join('\n');
async function installFonts(c) { await c.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: css })); await c.route(/fonts\.gstatic\.com/, r => { const i = Number(r.request().url().match(/place-font-(\d)/)?.[1]); return r.fulfill({ status: 200, contentType: 'font/ttf', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(ROOT, fonts[i][2])) }); }); }
const sizes = [[390, 844], [768, 1024], [1280, 900]];
const result = { kind: 'Preview: placement mock in the actual Home page, synthetic data, resting Welcome still only.', date: new Date().toISOString(), shots: [], checks: [] };
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await L.start(), nc = b.newContext.bind(b);
  b.newContext = async o => { const c = await nc(o), np = c.newPage.bind(c); c.newPage = async () => { await installFonts(c); return np(); }; return c; };
  try {
    for (const festive of [false, true]) for (const [width, height] of sizes) {
      const p = await L.open(b, '#/', { who: 'ann', extra: fixture, width, height, wait: 1200 });
      await p.evaluate(() => document.fonts.ready);
      await L.waitFor(p, () => /Larder/.test(document.querySelector('#hm-day')?.textContent || ''), null, 6000);
      const arrive = async () => { await p.evaluate(() => { try { localStorage.removeItem('lk.seasonal.arrival'); } catch (_) {} window.KB_SEASONAL?.configure({ selection: 'au-christmas-day' }); }); }; const motion = () => p.evaluate(() => { const m = window.KB_SEASONAL?.status?.().motion; return m && { state: m.state, phase: m.phase, effect: m.effect, ambientCount: m.ambientCount, hangCount: m.hangCount }; }); if (festive) { await arrive(); await p.clock.runFor(6000); await L.settle(p, 800); result.ambient = result.ambient || []; result.ambient.push({ width, rest: await motion() }); }
      await p.addScriptTag({ url: BASE + 'docs/mascot-cycle-options/placements.js' });
      const geo = () => p.evaluate(() => ['#rtitle', '.wall-date', '#hm-day', '#hm-with', '#hm-board'].map(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? [s, Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)] : [s]; }));
      const before = JSON.stringify(await geo());
      for (const kind of ['corner', 'name', 'end']) {
        const s = await p.evaluate(k => LK_MASCOT_PLACE.place(k), kind); await L.settle(p, 300);
        const tag = `${kind}${festive ? '-christmas' : ''}-${width}`;
        result.checks.push({ name: `${tag} keeps every Home rectangle`, pass: JSON.stringify(await geo()) === before });
        const sw = await p.evaluate(() => document.documentElement.scrollWidth); result.checks.push({ name: `${tag} no sideways scroll`, pass: sw <= width });
        const hang = await p.evaluate(() => { const m = document.querySelector('.mc-place')?.getBoundingClientRect(); if (!m) return []; return [...document.querySelectorAll('.kb-hang-item,.kb-ambient-particle,.kb-ambient-horizon')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.left < m.right && r.right > m.left && r.top < m.bottom && r.bottom > m.top; }).map(e => e.dataset.hangMotif || e.className); });
        if (kind === 'end') { await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); } else await p.evaluate(() => scrollTo(0, 0));
        await L.settle(p, 300);
        await p.screenshot({ path: path.join(OUT, tag + '.png') });
        result.shots.push({ file: `placements/${tag}.png`, kind, width, festive, state: s, overlapsOrnaments: hang, errors: p.errors.filter(e => !e.startsWith('console:')) });
        if (festive && kind !== 'end') { await p.evaluate(() => window.KB_EFFECTS.replay()); await p.clock.runFor(200); await new Promise(r => setTimeout(r, 1700)); const m = await motion(); let flakes = 0; for (let i = 0; i < 12; i++) { flakes = Math.max(flakes, await p.evaluate(() => { const r = document.querySelector('.mc-place')?.getBoundingClientRect(); return [...document.querySelectorAll('.kb-ambient-particle')].filter(e => { const q = e.getBoundingClientRect(); return r && q.width && q.left < r.right + 8 && q.right > r.left - 8 && q.top < r.bottom && q.bottom > r.top; }).length; })); if (i === 0) await p.screenshot({ path: path.join(OUT, tag.replace('christmas', 'christmas-arrival') + '.png') }); await new Promise(r => setTimeout(r, 200)); } const unused = await p.evaluate(() => { const r = document.querySelector('.mc-place')?.getBoundingClientRect(); return [...document.querySelectorAll('.kb-ambient-particle')].filter(e => { const q = e.getBoundingClientRect(); return r && q.width && q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top; }).length; }); result.shots.push({ file: `placements/${tag.replace('christmas', 'christmas-arrival')}.png`, kind, width, festive, arrival: true, motion: m, flakesOverMascot: flakes, errors: p.errors.filter(e => !e.startsWith('console:')) }); await p.clock.runFor(6000); await L.settle(p, 300); }
        await p.evaluate(() => LK_MASCOT_PLACE.remove()); await p.evaluate(() => scrollTo(0, 0));
      }
      await p.context().close();
    }
  } finally { await b.close(); fs.writeFileSync(path.join(DIR, 'placements-verification.json'), JSON.stringify(result, null, 2) + '\n'); }
  console.log(JSON.stringify({ ambient: result.ambient, shots: result.shots.map(s => [s.file, s.state?.mounted, s.motion?.phase, s.motion?.ambientCount, s.flakesOverMascot, (s.overlapsOrnaments || []).length, s.errors.length]), failed: result.checks.filter(c => !c.pass).map(c => c.name) }, null, 1));
}
main().catch(e => { console.error(e); process.exit(1); });
