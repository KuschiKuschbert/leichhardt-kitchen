// Real waits: first SDK load, offline list, pending ping acknowledgement and sequential guide writes.
const L = require('./lib');
const { R, ok } = L.results();

(async () => {
  const b = await L.start();
  let p, release;
  try {
    const newContext = b.newContext.bind(b);
    const gate = new Promise(resolve => { release = resolve; });
    b.newContext = async options => {
      const ctx = await newContext(options), newPage = ctx.newPage.bind(ctx);
      ctx.newPage = async () => {
        const page = await newPage();
        await page.route('**/firebase-firestore.js', async route => { await gate; await route.fallback(); });
        return page;
      };
      return ctx;
    };
    p = await L.open(b, '#/prep', { who: 'sam', wait: 100 });
    b.newContext = newContext;
    ok(await p.locator('.is-loading .ink-status').count() === 1, 'a delayed first read names the wait inside the real notebook');
    ok(await p.locator('.is-loading .ink-skeleton[aria-hidden="true"]').count() === 1, 'placeholder rows are decorative and hidden from screen readers');
    ok(await p.locator('.is-loading .ink-icon[data-icon="prep"][data-state="busy"]').count() === 1, 'Prep uses its own ink icon during an active read');
    ok(await p.locator('.tabbar').count() === 1 && !(await L.overflow(p)), 'loading retains phone navigation without horizontal overflow');
    release();
    await L.waitFor(p, () => window.LK_PREP && window.LK_PREP.state.itemsState === 'ok');
    ok(await p.locator('.nb-left .ink-skeleton').count() === 0 && await p.locator('.nb-left .nb-row').count() > 0, 'real rows replace placeholders when the read finishes');
    ok(p.errors.length === 0, 'delayed loading has no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    p = await L.open(b, '#/prep', { who: 'sam', cold: '/days/' });
    ok(await p.evaluate(() => window.LK_PREP.state.itemsState === 'offline'), 'the offline fixture reaches the actual offline list state');
    ok(/No signal/.test(await L.txt(p, '.nb-left') || ''), 'offline keeps the connection explanation');
    ok(await p.locator('.nb-left .ink-status, .nb-left .ink-skeleton').count() === 0, 'known offline does not masquerade as an active list load');
    await p.evaluate(() => window.__fake.warm());
    await L.waitFor(p, () => window.LK_PREP.state.itemsState === 'ok');
    ok(await p.locator('.nb-left .nb-row').count() > 0, 'the same list returns when the connection recovers');
    await p.context().close();

    p = await L.open(b, '#/recipes', { who: 'sam' });
    await L.chef(p, 'pings');
    await L.tap(p, '[data-p="n-new"]');
    const ping = 'Special: pork belly tonight';
    await p.fill('[data-k="n-text"]', ping);
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await L.tap(p, '[data-p="n-save"]');
    const save = p.locator('[data-p="n-save"]');
    ok(await save.isDisabled() && await save.getAttribute('aria-busy') === 'true', 'a pending ping save disables repeat submission and announces busy');
    ok(/Saving/.test(await save.innerText()) && await save.locator('.ink-icon[data-state="busy"]').count() === 1, 'the ping button shows actual saving feedback');
    ok(await p.inputValue('[data-k="n-text"]') === ping, 'the pending ping keeps the entered wording');
    await p.evaluate(() => window.__fake.ack());
    await L.settle(p, 150);
    ok(await p.evaluate(() => window.LK_PREP.state.nSaving) && /Saving/.test(await save.innerText()), 'a listener update alone never reports the ping saved');
    ok(await save.locator('.ink-icon[data-state="done"]').count() === 0, 'no success check appears before acknowledgement');
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await L.waitFor(p, () => !window.LK_PREP.state.nSaving);
    ok(await p.evaluate(() => /^Saved\. Shows:/.test(window.LK_PREP.state.nMsg) && !window.LK_PREP.state.nOpen), 'acknowledgement closes the editor and reports Saved');
    ok(await p.evaluate(text => Object.entries(window.__fake.dump()).filter(([key, value]) => /\/notes\/[^/]+$/.test(key) && value.text === text).length, ping) === 1, 'one ping is written');
    ok(p.errors.length === 0, 'ping save has no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900 });
    await L.adminTab(p, 'guides');
    await p.click('[data-p="g-new"]');
    const png = { name: 'panel.png', mimeType: 'image/png', buffer: Buffer.from(L.PNG.split(',')[1], 'base64') };
    await p.setInputFiles('#g-file', [png, { ...png, name: 'second.png' }]);
    await L.waitFor(p, () => { const f = window.LK_PREP.state.gf; return f && !f.busy && f.pages.length === 2; });
    await p.fill('#g-title', 'Dishwasher start up');
    await L.choose(p, '[data-p="g-fcat"][data-v="cleaning"]');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await p.click('[data-p="g-save"]');
    await L.waitFor(p, () => /Saving page 1/.test(window.LK_PREP.state.gf.busy));
    const progress = () => p.evaluate(() => { const bar = document.querySelector('.g-edit progress'); return bar ? { value: bar.value, max: bar.max } : null; });
    let measured = await progress();
    ok(measured && measured.value === 0 && measured.max === 3, 'the first queued page earns no progress; the final guide save is included');
    await p.evaluate(() => window.__fake.release());
    await L.waitFor(p, () => /Saving page 2/.test(window.LK_PREP.state.gf.busy));
    measured = await progress();
    ok(measured && measured.value === 1 && measured.max === 3, 'one acknowledged page advances measured progress once');
    await p.evaluate(() => window.__fake.release());
    await L.waitFor(p, () => window.LK_PREP.state.gf.busy === 'Saving the guide...');
    measured = await progress();
    ok(measured && measured.value === 2 && measured.max === 3, 'finished pages leave room for the final guide acknowledgement');
    ok(await p.evaluate(() => window.LK_PREP.state.gf.saving) && await p.locator('[data-p="g-save"]').isDisabled(), 'the final pending save keeps the form and blocks another submission');
    await p.evaluate(() => window.__fake.ack());
    await L.settle(p, 150);
    ok((await progress()).value === 2, 'local listener acknowledgement does not falsely complete the progress bar');
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await L.waitFor(p, () => window.LK_PREP.state.gf === null);
    ok(await p.evaluate(() => /Saved "Dishwasher start up"/.test(window.LK_PREP.state.gMsg)), 'the guide reports success only after its final write completes');
    ok(await p.locator('.g-edit progress').count() === 0, 'finished guide clears its progress state');
    ok(p.errors.length === 0, 'guide progress has no browser errors ' + p.errors.join(' | '));
  } finally {
    if (release) release();
    await b.close();
  }
  R.forEach(row => console.log(row));
  const bad = R.filter(row => row.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
