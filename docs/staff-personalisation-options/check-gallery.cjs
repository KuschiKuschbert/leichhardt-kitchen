/* Verify the local comparison controls and create the three-phone contact sheet.
   Run after capture.cjs. Uses only local preview files and the downloaded font cache. */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..'), L = require(path.join(ROOT, 'tests/lib'));
const server = require(path.join(ROOT, 'tests/serve'));
const port = Number(process.env.PREVIEW_PORT) || 8781;
const fontsDir = '/tmp/lk-personalisation-fonts';
const css = fs.readFileSync(path.join(fontsDir, 'fonts.css'), 'utf8').replace(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, (_, url) => 'url(data:font/ttf;base64,' + fs.readFileSync(path.join(fontsDir, path.basename(new URL(url).pathname))).toString('base64') + ')');
(async () => {
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  const browser = await L.chromium.launch(L.chromeOpts()), results = [];
  try {
    const p = await browser.newPage({ viewport: { width: 1290, height: 1120 } });
    await p.route('**/favicon.ico', r => r.fulfill({ status: 204, body: '' }));
    const errors = [];
    p.on('pageerror', e => errors.push(String(e)));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text() + ' ' + m.location().url); });
    await p.goto('http://127.0.0.1:' + port + '/docs/staff-personalisation-options/comparison.html');
    await p.addStyleTag({ content: css }); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(__dirname, 'previews/comparison-phones.png'), fullPage: true });
    await p.goto('http://127.0.0.1:' + port + '/docs/staff-personalisation-options/index.html');
    await p.addStyleTag({ content: css }); await p.evaluate(() => document.fonts.ready);
    for (const width of ['768', '1280', '390']) {
      await p.click('button[data-width="' + width + '"]');
      await L.waitFor(p, () => [...document.images].every(i => i.complete && i.naturalWidth > 0), null, 3000);
      const result = await p.evaluate(width => ({ width, selected: document.querySelector('button[data-width="' + width + '"]').getAttribute('aria-pressed') === 'true', allImagesMatch: [...document.querySelectorAll('[data-concept] img')].every(i => i.src.endsWith('-' + width + '.png')), imagesLoaded: [...document.images].every(i => i.complete && i.naturalWidth > 0), overflow: document.documentElement.scrollWidth > innerWidth }), width);
      results.push(result);
    }
    await p.setViewportSize({ width: 390, height: 844 });
    results.push({ scenario: 'gallery phone reflow', overflow: await L.overflow(p) });
    for (const file of ['index.html', 'comparison.html']) {
      const paths = [...fs.readFileSync(path.join(__dirname, file), 'utf8').matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
      results.push({ scenario: file + ' local assets', allLocalAssetsExist: paths.every(p => fs.existsSync(path.resolve(__dirname, p))), paths });
    }
    results.push({ scenario: 'browser errors', errors });
    fs.writeFileSync(path.join(__dirname, 'gallery-checks.json'), JSON.stringify({ method: 'Local Chromium gallery clicks and phone reflow; contact sheet is a browser screenshot of comparison.html, not image editing.', results }, null, 2) + '\n');
    if (results.some(r => r.overflow || r.selected === false || r.allImagesMatch === false || r.imagesLoaded === false || r.allLocalAssetsExist === false || r.errors && r.errors.length)) throw new Error('Gallery check failed');
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exit(1); });
