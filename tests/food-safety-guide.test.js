const L = require('./lib');
const {R, ok} = L.results();
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/guides', {who:'ann', width, wait:1000});
    await p.fill('#g-q', '2 hour');
    ok(await p.locator('a[href="#/guides/lk-2-hour-4-hour"]').count() === 1, 'food safety: searchable with an empty uploaded guide list at ' + width);
    await p.click('a[href="#/guides/lk-2-hour-4-hour"]');
    await p.waitForSelector('.g-food-times');
    const text = await p.locator('.g-doc').innerText();
    ok(/Under 2 hours/.test(text) && /2 to under 4 hours/.test(text) && /4 hours or more/.test(text) && /does not reset/.test(text), 'food safety: exact boundaries and cumulative time at ' + width);
    ok(await p.locator('[data-p="g-change"]').count() === 0, 'food safety: bundled guide is outside upload editing');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'food safety: fits ' + width);
    const pdf = await p.request.get(L.BASE + 'guides/2-hour-4-hour.pdf');
    ok(pdf.ok() && (await pdf.body()).slice(0,4).toString() === '%PDF', 'food safety: PDF download works');
    if (width === 390) await p.screenshot({path: __dirname + '/shots/food-safety-phone.png', fullPage:true});
    await p.context().close();
  }
  const p = await L.open(b, '#/guides/lk-2-hour-4-hour', {who:'',wait:800});
  ok(await p.locator('.g-food').count() === 0, 'food safety: existing personal login boundary stays');
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
