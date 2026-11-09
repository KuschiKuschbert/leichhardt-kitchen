/* Isolated concept checks and screenshots. No Firebase or production writes. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const folder = __dirname, root = path.resolve(folder, '../..');
const { chromium } = require(require.resolve('playwright-core', { paths: [path.join(root, 'tests'), path.resolve(root, '../../../tests')] }));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(bytes);
  });
});
function assert(value, label) { if (!value) throw new Error(label); checks.push(label); }
const checks = [], captures = [], layoutChecks = [];
const sizes = [[390, 844], [768, 1024], [1280, 900]];
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/docs/order-list-options/';
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/chromium', headless: true, args: ['--hide-scrollbars'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1:') && !r.url().startsWith('data:')) external.push(r.url()); });
  async function open(design, width, height, state = 'normal', role = 'chef') {
    await page.setViewportSize({ width, height });
    await page.goto(base + 'index.html?shot=1&design=' + design + '&role=' + role + '&state=' + state);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.request-row').first().waitFor();
    return page.evaluate(() => {
      const shown = e => e && e.checkVisibility() && e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== 'hidden';
      const rect = e => { const r = e.getBoundingClientRect(); return { top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2), height: +r.height.toFixed(2), width: +r.width.toFixed(2) }; };
      const dock = document.querySelector('.add-dock');
      const usableBottom = shown(dock) && getComputedStyle(dock).position === 'fixed' ? dock.getBoundingClientRect().top : innerHeight;
      const rows = [...document.querySelectorAll('.request-row')].map(e => ({ text: e.innerText, ...rect(e), fullyVisible: e.getBoundingClientRect().top >= 64 && e.getBoundingClientRect().bottom <= usableBottom }));
      return {
        viewport: { width: innerWidth, height: innerHeight }, usableBottom,
        fullyVisibleRequestRows: rows.filter(r => r.fullyVisible).length,
        firstRequestTop: rows[0]?.top, rows,
        deadlineAreas: [...document.querySelectorAll('.deadline-area,.cutoff-strip,.deadline-fold>summary')].filter(shown).map(rect),
        overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
        fonts: ['400 16px Barlow', '700 18px "Barlow Condensed"', '700 24px Caveat'].map(font => ({ font, loaded: document.fonts.check(font) })),
      };
    });
  }
  for (const design of ['a', 'b', 'c']) {
    for (const [width, height] of sizes) {
      const result = await open(design, width, height);
      assert(result.overflow === 0, design + ' ' + width + ': no horizontal overflow');
      assert(result.rows.length === 8, design + ' ' + width + ': all eight requests retained');
      assert(result.fonts.every(f => f.loaded), design + ' ' + width + ': actual fonts loaded');
      const screenshot = 'previews/' + design + '-' + width + '.png';
      await page.screenshot({ path: path.join(folder, screenshot) });
      if (width === 390) await page.screenshot({ path: path.join(folder, 'previews/' + design + '-390-full.png'), fullPage: true });
      captures.push({ design, role: 'chef', state: 'normal', screenshot, ...result });
    }
    const staff = await open(design, 390, 844, 'normal', 'staff');
    assert(staff.overflow === 0, design + ': staff has no overflow');
    assert(await page.locator('[data-action="supplier-place"]').count() === 0, design + ': staff has no supplier confirmation controls');
    assert(await page.locator('[data-action="item-tick"]').count() === 0, design + ': staff has no chef item completion controls');
    captures.push({ design, role: 'staff', state: 'normal', ...staff });
    for (const state of ['overdue', 'offline', 'failed', 'none', 'all-done', 'many', 'tomorrow']) {
      for (const [width, height] of sizes) {
        const result = await open(design, width, height, state);
        assert(result.overflow === 0, design + ' ' + state + ' ' + width + ': no overflow');
        layoutChecks.push({ design, state, viewport: result.viewport, overflow: result.overflow, fullyVisibleRequestRows: result.fullyVisibleRequestRows });
        if (width === 390 && ['overdue', 'many', 'offline'].includes(state)) await page.screenshot({ path: path.join(folder, 'previews/' + design + '-' + state + '-390.png') });
      }
    }
  }
  assert(errors.length === 0, 'No JavaScript errors');
  assert(external.length === 0, 'No external network requests');
  fs.writeFileSync(path.join(folder, 'preview-measurements.json'), JSON.stringify({ kind: 'Rendered design concepts, not implemented app', measuredAt: '390 x 844, 768 x 1024, 1280 x 900 CSS pixels; actual bundled fonts', method: 'Complete request bounding boxes below 64 px top bar and above fixed Add dock; unscrolled. All eight requests and recipe context retained. Prototype geometry only.', captures, layoutChecks, checks, errors, external }, null, 2) + '\n');
  console.log(JSON.stringify({ captures: captures.map(c => ({ design: c.design, role: c.role, width: c.viewport.width, rows: c.fullyVisibleRequestRows, firstRow: c.firstRequestTop, deadlines: c.deadlineAreas })), checks: checks.length, errors, external }, null, 2));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
