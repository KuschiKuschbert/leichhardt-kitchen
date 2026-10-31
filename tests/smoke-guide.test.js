const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/guides', { who: 'ann', width, wait: 1000 });
    await p.fill('#g-q', 'California gold');
    const link = p.locator('.g-card[href="#/guides/lk-smoke-service"]');
    ok(await link.count() === 1, 'smoke: searchable by sauce with no uploaded guides at ' + width);
    await link.click();
    await L.waitFor(p, () => document.querySelectorAll('.g-pgb img').length === 2 && Array.from(document.querySelectorAll('.g-pgb img')).every(i => i.complete && i.naturalWidth > 0));
    const text = await p.locator('.g-doc').innerText();
    ok(/75°C/.test(text) && /hot box/.test(text) && /covered bains/.test(text), 'smoke: readable preparation and holding steps at ' + width);
    ok(await p.locator('[data-p="g-change"]').count() === 0, 'smoke: no upload editor for bundled sheets');
    ok(await p.locator('.g-rchip[href="#/r/butchers-board"]').count() === 1 && await p.locator('.g-rchip[href="#/r/beast-board"]').count() === 1, 'smoke: both board recipe links');
    await p.click('[data-p="g-zoom"][data-i="0"]');
    ok(await p.locator('.gz-wrap').count() === 1, 'smoke: prep sheet opens big');
    await p.click('[data-gz="next"]:visible');
    ok(/Page 2 of 2/.test(await p.locator('.gz-t').innerText()), 'smoke: Next opens setup sheet');
    await p.keyboard.press('Escape');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'smoke: fits ' + width);
    const pdf = await p.request.get(L.BASE + await p.locator('a[download]').getAttribute('href'));
    ok(pdf.ok() && (await pdf.body()).subarray(0, 4).toString() === '%PDF', 'smoke: printable PDF is served');
    ok(await p.evaluate(() => !window.__fake.readLog.some(k => /guides\/lk-smoke-service/.test(k))), 'smoke: no guide-page database reads');
    await p.goto(L.BASE + '#/r/butchers-board');
    await L.waitFor(p, () => !!document.querySelector('#r-guides a[href="#/guides/lk-smoke-service"]'));
    ok(await p.locator('#r-guides a[href="#/guides/lk-smoke-service"]').count() === 1, 'smoke: board recipe links to service guide');
    ok(p.errors.length === 0, 'smoke: no browser errors');
    await p.context().close();
  }
  const admin = await L.open(b, '#/guides/lk-smoke-service', { admin: true, who: '', wait: 800 });
  ok(await admin.locator('[data-p="g-change"]').count() === 0 && await admin.locator('.g-pgb').count() === 2, 'smoke: admin can read without a broken editing action');
  await admin.context().close();
  const locked = await L.open(b, '#/guides/lk-smoke-service', { who: '', wait: 800 });
  ok(await locked.locator('.g-doc').count() === 0, 'smoke: personal login boundary stays');
  await locked.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
