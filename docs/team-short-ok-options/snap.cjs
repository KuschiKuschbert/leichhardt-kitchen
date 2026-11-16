// Saves the real Today's team page (the click-test stand-in, the study's made-up day at 18:30, Dinner busy time
// 17:30 to 20:30, 6 needed) as static HTML, so each design preview starts from the real shell, rows and dock.
// Scripts are taken out; css/app.css is linked from the repo. Synthetic data only.
// Run from tests/:  CHROME=<headless shell> node ../docs/team-short-ok-options/snap.cjs
const path = require('path'), fs = require('fs');
const L = require(path.resolve(__dirname, '../../tests/lib'));
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW));
global.window = {}; require('../team-minimum-options/data.js'); const D = window.TM_DATA;
const people = [{ id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true }, { id: 'sam', name: 'Sam K', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen', 'Gia', 'Hal'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))];
const BUSY = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, busy: { from: 720, to: 840, n: 3 } }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260, busy: { from: 1050, to: 1230, n: 6 } }];
const fx = { [key('config', 'main')]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: BUSY, kitSecs: D.sections },
  [key('team', today)]: { day: today, on: D.on, br: D.br, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' } };
(async () => {
  const b = await L.start();
  for (const [label, hash, o] of [['admin', '#/admin', { admin: true, adminPage: 'plan', width: 390 }], ['team', '#/team', { who: 'sam', width: 390 }]]) {
    const p = await L.open(b, hash, Object.assign({ extra: fx, wait: 1800, clock: L.NOW + 270 * 60000 }, o));
    await L.waitFor(p, () => document.querySelectorAll('.tm-tlrow').length >= 7, null, 9000); await L.settle(p, 400);
    const html = await p.evaluate(() => {
      const d = document.documentElement.cloneNode(true);
      d.querySelectorAll('script, link[rel="manifest"], link[rel="preload"], link[rel="modulepreload"], meta[http-equiv]').forEach(e => e.remove());
      d.querySelectorAll('link[rel="stylesheet"], link[rel="icon"], link[rel="apple-touch-icon"]').forEach(e => { const h = e.getAttribute('href') || ''; if (/^(https?:)?\/\//.test(h)) e.remove(); else e.setAttribute('href', '../../../' + h.replace(/^\.?\//, '')); });
      d.querySelectorAll('link[rel="preconnect"]').forEach(e => e.remove());
      return '<!doctype html>\n' + d.outerHTML;
    });
    fs.writeFileSync(path.join(__dirname, 'snap', label + '.html'), html);
    console.log(label, html.length);
    await p.context().close();
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
