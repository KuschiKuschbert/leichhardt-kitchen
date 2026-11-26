const { chromium } = require('../../tests/node_modules/playwright-core');
(async () => {
  const [html, png, w, h] = process.argv.slice(2);
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, headless: true } : { channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: +(w || 900), height: +(h || 500) } });
  await p.goto('file://' + html); await p.waitForTimeout(300);
  await p.screenshot({ path: png, fullPage: true }); await b.close();
})();
