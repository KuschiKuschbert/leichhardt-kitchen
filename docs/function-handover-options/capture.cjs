/* Function handover council, round 2: screenshots and preview measurements of every design page.
   Serves the repo root on 127.0.0.1:8792, opens each page in Chromium at deviceScaleFactor 1, waits for the fonts,
   saves PNGs next to each page and writes measurements.json. Preview measurements only: static pages, no taps run.
   Run from the repo root: node docs/function-handover-options/build.cjs && node docs/function-handover-options/capture.cjs */
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..'), here = __dirname;
const { chromium } = require(path.join(root, 'tests/node_modules/playwright-core'));
const EXE = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 8792, ORIGIN = 'http://127.0.0.1:' + PORT + '/', DIR = 'docs/function-handover-options/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, buf) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); res.end(buf); });
});
// what a cook sees in the first screen: rows still to go that start, and that fit whole, above the 64 px tab bar
function measure() {
  const vis = innerHeight - 64, rows = [...document.querySelectorAll('.fn-svc-board .fn-svc-rows > .fn-svc-row')];
  const r = el => el.getBoundingClientRect();
  const parse = c => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
  const mix = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  function bgOf(el) {
    const stack = []; for (let e = el; e; e = e.parentElement) stack.push(parse(getComputedStyle(e).backgroundColor));
    let c = { r: 255, g: 255, b: 255, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) if (stack[i].a > 0) c = mix(stack[i], c);
    return c;
  }
  function op(el) { let o = 1; for (let e = el; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; }
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2); };
  function contrast(sel) {
    const el = document.querySelector(sel); if (!el) return null;
    const bg = bgOf(el.parentElement || el), own = parse(getComputedStyle(el).backgroundColor), back = own.a > 0 ? mix(own, bg) : bg;
    const fg = mix(Object.assign(parse(getComputedStyle(el).color), { a: parse(getComputedStyle(el).color).a * op(el) }), back);
    return ratio(fg, back);
  }
  const btns = [...document.querySelectorAll('.fn-svc-board button, .fn-svc-board .btn, .fn-band .ho-li .btn')].filter(b => !b.classList.contains('linkish') && !b.classList.contains('fn-svc-name') && r(b).width > 0);
  const small = btns.filter(b => r(b).height < 44 || r(b).width < 44).map(b => b.textContent.trim() + ' ' + Math.round(r(b).width) + 'x' + Math.round(r(b).height));
  const firstAction = (() => { const b = document.querySelector('.fn-svc-board .ho-act, .fn-svc-board .ho-k, .fn-svc-board .b-kl .btn'); return b ? Math.round(r(b).top) : null; })();
  return {
    rowsToGo: rows.length, rowsStarted: rows.filter(x => r(x).top < vis).length, rowsWhole: rows.filter(x => r(x).bottom <= vis).length,
    rowHeights: rows.map(x => Math.round(r(x).height)), firstActionTop: firstAction, pageHeight: document.documentElement.scrollHeight,
    buttonsUnder44: small, overflowX: document.documentElement.scrollWidth > innerWidth,
    contrast: { wait: contrast('.ho-wait:not(.is-long)'), waitLong: contrast('.ho-wait.is-long'), sent: contrast('.ho-sent, .b-kc'), out: contrast('.ho-done-line, .ho-out'), sub: contrast('.ho-sub'), confirm: contrast('.ho-conf'), kind: contrast('.ho-k:not(.is-sent)'), kindSent: contrast('.ho-k.is-sent'), stageCount: contrast('.b-stages li'), trip: contrast('.c-trips .c-tw'), secHint: contrast('.ho-sec-h small') }
  };
}
(async () => {
  await new Promise(res => server.listen(PORT, '127.0.0.1', res));
  const b = await chromium.launch({ executablePath: EXE, headless: true, args: ['--hide-scrollbars'] });
  const out = {}, jobs = [];
  for (const d of ['baseline', 'design-a', 'design-b', 'design-c']) {
    const pages = d === 'baseline' ? ['service-cook', 'service-cook-after-sent', 'home-coordinator'] : ['service-cook', 'service-coordinator', 'home-coordinator', 'states'].concat(d === 'design-c' ? ['service-cook-part'] : []);
    for (const pg of pages) for (const w of (pg === 'service-cook' && d !== 'baseline' ? [390, 768, 1280] : [390])) jobs.push([d, pg, w]);
  }
  for (const [d, pg, w] of jobs) {
    const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(ORIGIN + DIR + d + '/' + pg + '.html', { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(150);
    // the mascot and the clock dialogs are frozen in the snapshot: hide the mascot so it never covers a row
    await p.addStyleTag({ content: '.mascot{display:none!important}' });
    const name = pg + '-' + w;
    if (d !== 'baseline' || w !== 390 || true) {
      await p.screenshot({ path: path.join(here, d, name + '.png') });
      if (w === 390 && pg !== 'home-coordinator') { await p.addStyleTag({ content: '.tabbar{position:static!important}' }); await p.screenshot({ path: path.join(here, d, name + '-full.png'), fullPage: true }); }
    }
    out[d + '/' + name] = Object.assign(await p.evaluate(measure), { errors: errs });
    await ctx.close();
  }
  out.note = 'Preview measurements: static pages built from the implemented-app snapshot (commit 5d92379) with each design swapped in, Chromium headless at deviceScaleFactor 1, bundled preview fonts. Rows are the rounds still to go out; visible height is the viewport less the 64 px tab bar. Contrast composites the element colour and opacity over its ancestors\' backgrounds. No taps are run: speed, save feedback and recovery are Not evidenced here.';
  fs.writeFileSync(path.join(here, 'measurements.json'), JSON.stringify(out, null, 1) + '\n');
  for (const k of Object.keys(out)) if (k !== 'note') console.log(k, JSON.stringify({ to: out[k].rowsToGo, st: out[k].rowsStarted, wh: out[k].rowsWhole, h: out[k].rowHeights, fa: out[k].firstActionTop, ph: out[k].pageHeight, small: out[k].buttonsUnder44, ox: out[k].overflowX, c: out[k].contrast, e: out[k].errors.length }));
  await b.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
