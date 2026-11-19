/* Capture the print study: sheet screenshots, real Chromium PDFs and page counts.
   Run from the repo root: node docs/print-cards-options/capture.cjs  (needs tests/node_modules) */
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(path.resolve('tests/node_modules/playwright-core'));
const root = process.cwd(), outDir = path.join(root, 'docs/print-cards-options/shots');
fs.mkdirSync(outDir, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, s) => {
  const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, b) => { if (e) { s.statusCode = 404; s.end(); return; } s.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); s.end(b); });
});
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
srv.listen(0, async () => {
  const base = 'http://127.0.0.1:' + srv.address().port + '/docs/print-cards-options/sheets.html';
  const b = await chromium.launch({ executablePath: CHROME, headless: true });
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1.5 });
  const pdfjs = await import(path.resolve('tests/node_modules/pdfjs-dist/legacy/build/pdf.mjs'));
  const stats = {};
  const samples = (process.env.IDS || 'chicken-adobo,laksa').split(',');
  for (const layout of (process.env.LAYOUTS || 'a,b,c,m').split(',')) for (const paper of ['a4p', 'a4l', 'a5p', 'a5l']) {
    // every card: page counts per card, and the real PDF's page count
    const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: process.env.SLOW ? 4 : 1 });
    const t0 = Date.now();
    await p.goto(base + '?layout=' + layout + '&paper=' + paper + '&ids=all');
    await p.waitForSelector('body[data-ready]');
    const res = await p.evaluate(() => window.RESULT); const ms = Date.now() - t0; await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
    const doc = await pdfjs.getDocument({ data: new Uint8Array(pdf) }).promise;
    const counts = Object.values(res.per), one = counts.filter(n => n === 1).length;
    const minPt = await p.evaluate(() => {
      // text everywhere, and the labels inside side-view drawings (drawing units scaled to the rendered width)
      let m = 99, side = 99;
      document.querySelectorAll('#out .sheet *').forEach(e => {
        if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
        const svg = e.closest('svg');
        if (svg) { if (!svg.closest('.sidev')) return; const vb = svg.viewBox.baseVal.width, w = svg.getBoundingClientRect().width; const pt = parseFloat(e.getAttribute('font-size') || 10) * w / vb * 0.75; if (pt < side) side = pt; return; }
        let z = 1, x = e; while (x) { z *= parseFloat(getComputedStyle(x).zoom || 1) || 1; x = x.parentElement; }
        const pt = parseFloat(getComputedStyle(e).fontSize) * 0.75 * z; if (pt < m) m = pt;
      });
      return { text: Math.round(m * 10) / 10, sideLabels: Math.round(side * 10) / 10 };
    });
    stats[layout + '-' + paper] = { minPt, ms, cards: counts.length, sheets: res.sheets, pdfPages: doc.numPages, onePage: one, fits: res.fits, splitIng: res.splitIngredients.length, twoPage: counts.filter(n => n === 2).length, more: counts.filter(n => n > 2).length, max: Math.max(...counts), clipped: await p.evaluate(() => Array.from(document.querySelectorAll('#out .reg, #out .run, #out .algband, #out .foot, #out .ttl')).filter(r => r.scrollHeight > r.clientHeight + 1 || r.scrollWidth > r.clientWidth + 1).map(r => r.closest('.sheet').querySelector('.nm').textContent + ' | ' + r.className + ' | ' + r.scrollWidth + 'x' + r.scrollHeight + ' in ' + r.clientWidth + 'x' + r.clientHeight)) };
    // screenshots of the sample cards
    await p.goto(base + '?layout=' + layout + '&paper=' + paper + '&ids=' + samples.join(','));
    await p.waitForSelector('body[data-ready]');
    await p.locator('#out').screenshot({ path: path.join(outDir, layout + '-' + paper + '.png') });
  }
  fs.writeFileSync(path.join(root, 'docs/print-cards-options/page-counts.json'), JSON.stringify(stats, null, 1));
  console.log(JSON.stringify(stats, null, 0));
  await b.close(); srv.close();
});
