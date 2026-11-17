// Prints a guide sheet to an A4 PDF with the Chromium that Playwright uses.
// node docs/guide-sheets/print.cjs <sheet.html> <out.pdf>
// Run it where Playwright is installed (tests/node_modules, or a cloud session). The sheet loads Barlow from Google Fonts.
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(path.resolve(__dirname, '../../tests/node_modules/playwright'))); }
(async () => {
  const [src, out] = process.argv.slice(2);
  if (!src || !out) { console.error('Usage: node docs/guide-sheets/print.cjs <sheet.html> <out.pdf>'); process.exit(1); }
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(src), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log('Printed ' + out);
})().catch(e => { console.error(e); process.exit(1); });
