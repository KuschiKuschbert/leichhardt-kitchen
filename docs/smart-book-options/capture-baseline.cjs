/* Baseline for the "smarter book" audit (13 Nov 2026). Opens the real book in the click-test stand-in (no Firebase,
   nothing written to the real book) with made-up people and records, then saves screenshots of today's pages and
   static snapshots (scripts removed) that the design previews start from.
   Run from tests/: cp ../docs/smart-book-options/capture-baseline.cjs zz-sb.test.js && CHROME=... npm test -- zz-sb; rm zz-sb.test.js */
const path = require('path'), fs = require('fs');
const root = path.resolve(process.cwd(), '..');
const L = require(path.join(root, 'tests/lib'));
const out = path.join(root, 'docs/smart-book-options/baseline');
fs.mkdirSync(out, { recursive: true });
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const extra = Object.assign({}, L.wasteSum([
  { t: 'Chips', n: 3, r: { excess: 3 }, unit: 'kg', reason: 'excess', sec: 'Fryer', amt: 2, last: { unit: 'kg', reason: 'excess', sec: 'Fryer', amt: 2 } },
  { t: 'Brisket', n: 2, r: { excess: 2 }, unit: 'kg', reason: 'excess', sec: 'Smoker', amt: 0.5, last: { unit: 'kg', reason: 'excess', sec: 'Smoker', amt: 0.5 } }
]));
extra[key(['ordlearned', 'milk'])] = { text: 'Milk', uses: 9, dow: {}, qtys: { a: { q: '6 L', n: 8 } } };
extra[key(['learned', 'dice-onions'])] = { text: 'Dice onions', uses: 9, typed: 9, secs: { larder: { name: 'Larder', n: 9 } }, qtys: { a: { q: '1 tub', n: 7 } }, dow: {} };
async function snap(p, name) {
  const html = await p.evaluate(() => {
    const d = document.documentElement.cloneNode(true);
    d.querySelectorAll('script, link[rel="manifest"], link[rel="preconnect"], meta[http-equiv]').forEach(e => e.remove());
    return '<!doctype html>\n' + d.outerHTML;
  });
  const fixed = html.replace('<head>', '<head><base href="../../../">').replace(/<link[^>]+fonts\.googleapis[^>]+>/g, '<link rel="stylesheet" href="docs/order-list-options/assets/fonts.css">');
  fs.writeFileSync(path.join(out, name + '.html'), fixed);
}
(async () => {
  const b = await L.start(), notes = [];
  let p;
  // 1. Wastage, staff Bo, 390: the exact name typed in full fills nothing
  p = await L.open(b, '#/waste', { who: 'bo', extra, width: 390, height: 844, wait: 2000, touch: true });
  await L.wLog(p); await p.fill('#w-text', 'Chips'); await L.settle(p, 400);
  notes.push({ name: 'waste-exact-390', form: await p.evaluate(() => ({ amt: (document.querySelector('#w-amt') || {}).value, unit: (document.querySelector('[data-p="wunit"][aria-pressed="true"]') || {}).textContent || '', reason: (document.querySelector('.w-rchips [aria-pressed="true"], .w-rbtn') || {}).textContent || '', sugg: [...document.querySelectorAll('#w-sugg button')].map(x => x.textContent.trim()) })) });
  await p.screenshot({ path: path.join(out, 'waste-exact-390.png') });
  await snap(p, 'waste-exact-390');
  await p.context().close();
  // 2. Orders, staff Ann, 390: Milk is on today's list already; typing it offers it again
  p = await L.open(b, '#/orders', { who: 'ann', extra, width: 390, height: 844, wait: 2000, touch: true });
  await L.oLog(p); await p.fill('#o-text', 'Milk'); await L.settle(p, 400);
  notes.push({ name: 'orders-milk-390', qty: await p.evaluate(() => (document.querySelector('#o-qty') || {}).value), sugg: await p.evaluate(() => [...document.querySelectorAll('.o-sheet .sugg button, .o-sheet [data-p="osugg"]')].map(x => x.textContent.trim()).slice(0, 6)) });
  await p.screenshot({ path: path.join(out, 'orders-milk-390.png') });
  await p.context().close();
  // 3. Prep, staff Ann, 390, first screen and the add sheet
  p = await L.open(b, '#/prep', { who: 'ann', extra, width: 390, height: 844, wait: 2000, touch: true });
  await p.screenshot({ path: path.join(out, 'prep-390.png') });
  await L.pLog(p); await L.settle(p, 300);
  await p.screenshot({ path: path.join(out, 'prep-add-390.png') });
  await p.context().close();
  // 4. Admin: Today, Reports Wastage and Delivery received at 1280, Today at 768 and 390 (the Day book starts from these)
  for (const w of [1280, 768, 390]) {
    p = await L.open(b, '#/admin', { admin: true, adminPage: '', extra, width: w, height: w === 390 ? 844 : 900, wait: 2500 });
    await L.settle(p, 800);
    await p.screenshot({ path: path.join(out, 'admin-today-' + w + '.png') });
    await snap(p, 'admin-today-' + w);
    if (w === 1280) {
      await L.adminTab(p, 'waste'); await L.settle(p, 800);
      await p.screenshot({ path: path.join(out, 'admin-wastage-1280.png') });
      await snap(p, 'admin-wastage-1280');
    }
    await p.context().close();
  }
  p = await L.open(b, '#/deliveries', { admin: true, extra, width: 1280, height: 900, wait: 2500 });
  await p.screenshot({ path: path.join(out, 'deliveries-1280.png') });
  await p.context().close();
  fs.writeFileSync(path.join(out, 'measurements.json'), JSON.stringify({ source: 'Implemented app, click-test stand-in, synthetic data', notes }, null, 2) + '\n');
  console.log(JSON.stringify(notes));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
