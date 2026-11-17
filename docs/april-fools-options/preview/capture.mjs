// Review-only. Plays jokes in preview/index.html at quick speed (a minute in 15 s) and saves frames of the phone at
// set points of the minute, plus any script errors, the reveal's words and whether the real Home underneath was left
// as it was. PERF=1 instead measures the main thread's busy time per second over the whole quick play, with the CPU
// slowed 4 times (a quick play packs a minute into 15 s, so this is a harsher test than real time).
//   CHROME=<chrome> [PAGE=<built page>] [PERF=1] node docs/april-fools-options/preview/capture.mjs <out folder> [A1,A2,... or all] [name]
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const require = createRequire(ROOT + '/tests/'), fs = require('fs');
const { chromium } = require('playwright-core');
const OUT = process.argv[2], NAME = process.argv[4] || 'Ann', PAGE = process.env.PAGE || path.join(HERE, 'index.html'), PERF = !!process.env.PERF;
const ALL = 'ABCDEFGHIJKL'.split('').flatMap(d => [d + '1', d + '2']);
const WHICH = !process.argv[3] || process.argv[3] === 'all' ? ALL : process.argv[3].split(',');
const AT = [4, 11, 17, 23, 29, 35, 41, 47, 52, 57]; // seconds of the minute
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ['--hide-scrollbars'] });
const res = {};
try {
  for (const j of WHICH) {
    const d = j[0], v = +j[1];
    const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await p.goto(pathToFileURL(PAGE).href);
    await p.waitForTimeout(900);
    const f = p.frames().find(x => x !== p.mainFrame());
    await f.evaluate(n => window.SETNAME(n), NAME);
    const before = await f.evaluate(() => document.getElementById('app').innerHTML.length);
    if (PERF) {
      const cdp = await p.context().newCDPSession(p);
      await cdp.send('Performance.enable'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
      const a = await m(), w0 = Date.now();
      await f.evaluate(o => window.FOOLS.play(o.d, { name: o.n, version: o.v, quick: true }), { d, v, n: NAME });
      await p.waitForTimeout(14500);
      const z = await m(), secs = (Date.now() - w0) / 1000;
      res[j] = { busyMsPerSec: Math.round((z.TaskDuration - a.TaskDuration) * 1000 / secs), errs };
      console.log(j, JSON.stringify(res[j])); await p.close(); continue;
    }
    const t0 = Date.now(), shots = [];
    await f.evaluate(o => window.FOOLS.play(o.d, { name: o.n, version: o.v, quick: true }), { d, v, n: NAME });
    for (const t of AT) {
      const wait = t * 250 - (Date.now() - t0); if (wait > 0) await p.waitForTimeout(wait);
      const file = `${j}-${String(t).padStart(2, '0')}.png`;
      await p.locator('#f').screenshot({ path: path.join(OUT, file) });
      shots.push(file);
    }
    await p.waitForTimeout(1600);
    await p.locator('#f').screenshot({ path: path.join(OUT, `${j}-60.png`) });
    const after = await f.evaluate(() => ({ app: document.getElementById('app').innerHTML.length, inert: document.getElementById('app').hasAttribute('inert'), layer: !!document.querySelector('.fl-layer'),
      card: !!document.querySelector('.fl-card'), focus: document.activeElement && document.activeElement.textContent, scroll: document.documentElement.scrollWidth - innerWidth }));
    res[j] = { errs, same: before === after.app, after };
    console.log(j, JSON.stringify(res[j]));
    await p.close();
  }
} catch (e) { console.log('ERR', String(e).slice(0, 800)); }
finally { fs.writeFileSync(path.join(OUT, PERF ? 'perf.json' : 'walk.json'), JSON.stringify(res, null, 1)); await b.close(); }
