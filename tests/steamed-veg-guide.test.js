// The bundled guide "Steamed veg on the iCombi" (17 Nov 2026): the beeps, the steps, its two veg cards, the PDF, no reads.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  const ID = 'lk-steamed-veg';
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/guides', { who: 'ann', width, wait: 1000 });
    ok(await p.locator('.g-grp[aria-label="Equipment"] .g-card[href="#/guides/' + ID + '"]').count() === 1, 'steamed veg: listed under Equipment at ' + width);
    for (const q of ['broccoli', 'rational', 'steamed veg']) {
      await p.fill('#g-q', q);
      await L.waitFor(p, (id) => !!document.querySelector('.g-card[href="#/guides/' + id + '"]'), ID);
      ok(await p.locator('.g-card[href="#/guides/' + ID + '"]').count() === 1, 'steamed veg: search "' + q + '" finds it at ' + width);
    }
    await p.click('.g-card[href="#/guides/' + ID + '"]');
    await p.waitForSelector('.g-veg-beeps');
    const beeps = await p.locator('.g-veg-beeps > li').allInnerTexts();
    ok(beeps.length === 4 && /Ready beep[\s\S]*All in/.test(beeps[0]) && /2 min[\s\S]*Broccoli out/.test(beeps[1]) && /4 min[\s\S]*Cauliflower out/.test(beeps[2]) && /6 min[\s\S]*Carrots out[\s\S]*Last beep/.test(beeps[3]), 'steamed veg: the four beeps in order at ' + width);
    const text = await p.locator('.g-doc').innerText();
    ok(/broccoli\s2\smin, cauliflower\s4\smin, carrots\s6\smin/.test(text) && /Steam, 100\s°C/.test(text) && /big white tub with a lid/.test(text) && !/\[/.test(text) && !/\u2014/.test(text), 'steamed veg: steam 100 °C, cook times, the white tub, nothing left to confirm, no em dash at ' + width);
    ok(await p.locator('.g-ol > li').count() === 9, 'steamed veg: nine written steps at ' + width);
    ok(await p.locator('[data-p="g-change"]').count() === 0, 'steamed veg: bundled guide is outside upload editing');
    const cards = (await p.locator('.g-rchip').evaluateAll(a => a.map(x => x.getAttribute('href')))).sort();
    ok(cards.join(' ') === '#/r/greens-side #/r/side-veg', 'steamed veg: on the two veg cards only, got ' + cards.join(' '));
    ok(await p.locator('.g-ol a.nt-rl[href="#/r/side-veg"]').count() === 1, 'steamed veg: the step names the Seasonal Vegetables card as a link');
    await p.click('[data-p="g-mode"][data-v="one"]');
    await L.waitFor(p, () => !!document.querySelector('.g-one .g-h3')).catch(() => {});
    const one = await p.evaluate(() => { const s = document.querySelector('.g-steps'); return s ? s.innerText.replace(/\s+/g, ' ').slice(0, 120) : 'no steps'; });
    ok(/Step 1 of 9/i.test(one) && /Fill one sink with ice water/.test(one), 'steamed veg: step by step opens on the ice water at ' + width + ' (' + one + ')');
    ok(!(await L.overflow(p)), 'steamed veg: no sideways scroll at ' + width);
    const pdf = await p.request.get(L.BASE + await p.locator('.g-veg a[download]').getAttribute('href'));
    ok(pdf.ok() && (await pdf.body()).subarray(0, 4).toString() === '%PDF', 'steamed veg: printable PDF is served');
    ok(await p.evaluate((id) => !window.__fake.readLog.some(k => k.indexOf('guides/' + id) >= 0), ID), 'steamed veg: no guide database reads');
    if (width === 390) await p.screenshot({ path: __dirname + '/shots/steamed-veg-phone.png', fullPage: true });
    await p.goto(L.BASE + '#/r/side-veg');
    await L.waitFor(p, (id) => !!document.querySelector('#r-guides a[href="#/guides/' + id + '"]'), ID);
    ok(await p.locator('#r-guides a[href="#/guides/' + ID + '"]').count() === 1, 'steamed veg: the Seasonal Vegetables card links to the guide');
    await p.goto(L.BASE + '#/r/rice');
    await L.settle(p, 600);
    ok(await p.locator('#r-guides a[href="#/guides/' + ID + '"]').count() === 0, 'steamed veg: other iCombi cards do not carry it');
    ok(p.errors.length === 0, 'steamed veg: no browser errors at ' + width);
    await p.context().close();
  }
  const admin = await L.open(b, '#/guides/' + ID, { admin: true, who: '', wait: 800 });
  ok(await admin.locator('.g-veg-beeps').count() === 1 && await admin.locator('[data-p="g-change"]').count() === 0, 'steamed veg: admin reads it without an editing action');
  await admin.context().close();
  const locked = await L.open(b, '#/guides/' + ID, { who: '', wait: 800 });
  ok(await locked.locator('.g-doc').count() === 0, 'steamed veg: personal login boundary stays');
  await locked.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
