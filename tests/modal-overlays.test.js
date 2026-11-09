// Less frequent overlays share the frame too, including native dialogs and document pages.
const L = require('./lib');
const { R, ok } = L.results();
async function check(p, selector, width) {
  await L.settle(p, 300);
  const facts = await p.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect(), x = el.querySelector('.ux-modal-close'), b = x?.getBoundingClientRect();
    return { x: !!b && b.width >= 44 && b.height >= 44 && b.top >= r.top && b.right <= r.right,
      one: el.querySelectorAll('.ux-modal-close').length === 1, text: x?.textContent, name: x?.getAttribute('aria-label'),
      fits: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1,
      position: innerWidth < 768 ? Math.abs(r.bottom - innerHeight) < 2 : Math.abs((r.top + r.bottom - innerHeight) / 2) < 2 };
  });
  ok(facts.x && facts.one && facts.text === '×' && !!facts.name, width + ' ' + selector + ': exactly one visible, named 44 px X');
  ok(facts.fits && facts.position, width + ' ' + selector + ': shared responsive frame fits');
}
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/prep', { width, touch: width < 1280, wait: 1200 });
    await p.evaluate(() => LK_DEVICE.settings());
    await check(p, '#lk-device-choice', width);
    await p.mouse.click(2, 2); await L.settle(p, 250);
    ok(!await p.$('#lk-device-choice') && await p.evaluate(() => LK_DEVICE.mode() === 'personal' && LK_PREP.privateAccess()), width + ': native backdrop preserves device and sign-in');
    await p.evaluate(() => LK_PREP.coolingOpen(document.querySelector('.cooling-chip')));
    await check(p, '.cooling-menu', width);
    await p.locator('.cooling-close').click(); await L.settle(p, 250);
    await p.click('.wtop-who'); await L.settle(p, 200); await p.goBack(); await L.settle(p, 250);
    ok(!await p.$('.wm') && await p.evaluate(() => location.hash === '#/prep'), width + ': native Back closes the menu without navigating');
    await p.evaluate(() => KB_SEASONAL.configure({ selection: 'au-christmas-day', motion: 'still', density: 'festive' }));
    await L.waitFor(p, () => !!document.querySelector('.kb-occasion-trigger'));
    await p.click('.kb-occasion-trigger'); await check(p, '#kb-occasion-panel', width);
    if (width === 390) {
      const box = await p.locator('.kb-occasion-panel-heading').boundingBox();
      const cdp = await p.context().newCDPSession(p), x = box.x + 30, y = box.y + 16;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      for (let d = 15; d <= 105; d += 15) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + d, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
    } else await p.goBack();
    await L.settle(p, 250);
    ok(!await p.$('#kb-occasion-panel') && await p.evaluate(() => location.hash === '#/prep'), width + ': occasion swipe/Back closes only the explanation');
    ok(!p.errors.length && !await L.overflow(p), width + ': overlay transitions have no browser errors or overflow');
    await p.context().close();
    const guide = await L.open(b, '#/guides/combi', { who: 'ann', width, touch: width < 1280, extra: L.guides(), wait: 1200 });
    await L.waitFor(guide, () => !!document.querySelector('[data-p="g-zoom"][data-i="0"]'));
    await guide.click('[data-p="g-zoom"][data-i="0"]'); await check(guide, '.gz-wrap', width);
    await guide.locator('[data-gz="next"]:visible').click(); await L.settle(guide, 250);
    ok(await guide.locator('.gz-wrap .ux-modal-close').count() === 1 && /Page 2/.test(await L.txt(guide, '.gz-t')), width + ': page redraw preserves a single close control');
    await guide.locator('.gz-x').click(); await L.settle(guide, 250);
    ok(!await guide.$('.gz-wrap, .ux-modal-shade') && await guide.evaluate(() => location.hash === '#/guides/combi'), width + ': closing the document removes its backdrop and keeps the guide');
    ok(!guide.errors.length && !await L.overflow(guide), width + ': document has no browser errors or overflow');
    await guide.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
