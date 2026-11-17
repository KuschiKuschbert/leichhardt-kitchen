// Review-only. Plays each design in preview/index.html and saves frames of the phone at set times, plus any script
// errors, the reveal's words and whether the real Home underneath was left as it was.
//   CHROME=<chrome> [PERF=1] node docs/april-fools-options/preview/capture.mjs <out folder> [designs, e.g. ABC] [name]
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const require = createRequire(ROOT + '/tests/'), fs = require('fs');
const { chromium } = require('playwright-core');
const OUT = process.argv[2], WHICH = (process.argv[3] || 'ABC').split(''), NAME = process.argv[4] || 'Ann';
fs.mkdirSync(OUT, { recursive: true });
// Times are from the tap, roughly: the preview starts the design 700 ms after the copy of Home has loaded.
const AT = { A: [400, 1300, 2000, 2800, 3500, 4700, 6600, 7600, 8600], B: [400, 900, 2700, 3900, 4900, 5700, 6900, 7500, 8200, 9200], C: [400, 1500, 2700, 3700, 4500, 5400, 7000, 8100, 9000] };
// PERF=1: no frames; the main thread's busy time per second over the whole play, with the CPU slowed 4 times.
const PERF = !!process.env.PERF;
const b = await chromium.launch({ executablePath: process.env.CHROME, headless: true, args: ['--hide-scrollbars'] });
const res = {};
try {
  for (const d of WHICH) {
    const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
    const errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(pathToFileURL(path.join(HERE, 'index.html')).href);
    await p.fill('#nm', NAME); await p.dispatchEvent('#nm', 'change');
    await p.waitForTimeout(800);
    const frame = p.frame({ url: /about:srcdoc/ }) || p.frames()[1];
    const before = await frame.evaluate(() => document.getElementById('app').innerHTML.length);
    if (!PERF) { await p.click(`.picks button[data-d="${d}"]`); await p.waitForTimeout(700 + 400); } // the preview waits 700 ms after load before playing
    const f2 = p.frames().find(f => f !== p.mainFrame());
    if (PERF) {
      const cdp = await p.context().newCDPSession(p);
      await cdp.send('Performance.enable'); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const m = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
      await p.click(`.picks button[data-d="${d}"]`); await p.waitForTimeout(400);
      const a = await m(), w0 = Date.now(); await p.waitForTimeout(9000); const z = await m(), secs = (Date.now() - w0) / 1000;
      res[d] = { busyMsPerSec: Math.round((z.TaskDuration - a.TaskDuration) * 1000 / secs), layoutMs: Math.round((z.LayoutDuration - a.LayoutDuration) * 1000), styleMs: Math.round((z.RecalcStyleDuration - a.RecalcStyleDuration) * 1000), errs };
      console.log(d, JSON.stringify(res[d])); await p.close(); continue;
    }
    const t0 = Date.now(), shots = [];
    for (const t of AT[d]) {
      const wait = t - (Date.now() - t0); if (wait > 0) await p.waitForTimeout(wait);
      const file = `${d}-${String(t).padStart(5, '0')}.png`;
      await p.locator('#f').screenshot({ path: path.join(OUT, file) });
      shots.push(file);
    }
    await p.waitForTimeout(600);
    const after = await f2.evaluate(() => ({ app: document.getElementById('app').innerHTML.length, layer: !!document.querySelector('.fl-layer'),
      card: document.querySelector('.fl-card') ? document.querySelector('.fl-card').innerText : null,
      focus: document.activeElement && document.activeElement.textContent, scroll: document.documentElement.scrollWidth - innerWidth }));
    res[d] = { shots, errs, before, after };
    console.log(d, JSON.stringify(res[d]));
    await p.close();
  }
} catch (e) { console.log('ERR', String(e).slice(0, 800)); }
finally { fs.writeFileSync(path.join(OUT, 'walk.json'), JSON.stringify(res, null, 1)); await b.close(); }
