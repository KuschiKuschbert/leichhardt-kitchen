// The approved shared sheet frame, exercised through the real forms and their close paths.
const L = require('./lib');
const { R, ok } = L.results();

async function frame(p, selector, width) {
  await L.settle(p, 300);
  const state = await p.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect(), x = el.querySelector('.ux-modal-close'), b = x && x.getBoundingClientRect();
    return { marked: el.classList.contains('ux-modal'), swipe: el.classList.contains('ux-swipe'),
      fits: r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1,
      bottom: Math.abs(r.bottom - innerHeight) < 2, centred: Math.abs((r.top + r.bottom) / 2 - innerHeight / 2) < 2,
      close: !!b && b.width >= 44 && b.height >= 44 && getComputedStyle(x).display !== 'none',
      name: x && x.getAttribute('aria-label'), radius: getComputedStyle(el).borderTopLeftRadius };
  });
  ok(state.marked && state.swipe, width + ' ' + selector + ': uses the shared frame and gesture');
  ok(state.close && !!state.name, width + ' ' + selector + ': visible, named 44 px close X on touch and mouse');
  ok(state.fits && (width < 768 ? state.bottom : state.centred), width + ' ' + selector + ': bottom sheet below 768 px, centred modal above');
  return state;
}
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    for (const [route, open, selector, input] of [
      ['prep', L.pLog, '.p-sheet', '#p-text'], ['orders', L.oLog, '.o-sheet', '#o-text'],
      ['waste', L.wLog, '.w-sheet', '#w-text'], ['transfers', L.xLog, '.tr-sheet', '#tr-text']
    ]) {
      const p = await L.open(b, '#/' + route, { width, touch: width !== 1280, wait: 1200 });
      await open(p); await frame(p, selector, width);
      // A close is a cancellation, never a save. Reopening must retain the form's own draft.
      const field = p.locator(input);
      const hasField = await field.count();
      if (hasField) await field.fill('Keep this draft');
      const writes = await p.evaluate(() => __fake.writes.length);
      const x = p.locator(selector + ' .ux-modal-close');
      if (await x.count() && await x.isVisible()) {
        await p.locator(selector).evaluate(el => { el.scrollTop = el.scrollHeight; });
        const visibleClose = await x.boundingBox();
        ok(!!visibleClose && visibleClose.y >= 0 && visibleClose.y + visibleClose.height <= await p.evaluate(() => innerHeight), width + ' ' + route + ': X remains visible after scrolling the form');
        await x.click(); await L.settle(p, 200);
        ok(!await p.$(selector), width + ' ' + route + ': X dismisses the overlay');
        ok(await p.evaluate(n => __fake.writes.length === n, writes), width + ' ' + route + ': X never submits a form');
        await open(p);
        if (hasField) ok(await field.inputValue() === 'Keep this draft', width + ' ' + route + ': X preserves the draft');
      }
      ok(!await L.overflow(p) && !p.errors.length, width + ' ' + route + ': no overflow or browser errors');
      await p.context().close();
    }
    const p = await L.open(b, '#/prep', { width, touch: width !== 1280, wait: 1200 });
    await p.click('.wtop-who'); await frame(p, '.wm', width);
    const x = p.locator('.wm .ux-modal-close');
    if (await x.count() && await x.isVisible()) {
      await x.click(); await L.settle(p, 200);
      ok(!await p.$('.wm') && await p.evaluate(() => LK_PREP.state.who === 'sam'), width + ': menu X keeps the person signed in');
    }
    await p.context().close();
  }
  const small = await L.open(b, '#/prep', { width: 390, height: 420, touch: true, settings: { text: 'xlarge' }, wait: 1200 });
  await L.pLog(small); await small.fill('#p-text', 'Keep a large-text draft');
  await small.locator('.p-sheet').evaluate(el => { el.scrollTop = el.scrollHeight; });
  const scrolled = await small.locator('.p-sheet').evaluate(el => el.scrollTop > 0);
  const exit = await small.locator('.p-sheet .ux-modal-close').boundingBox();
  ok(scrolled && !!exit && exit.y >= 0 && exit.y + exit.height <= 420, 'short phone with Extra large text: a genuinely scrolled form keeps its X visible');
  await small.locator('.p-sheet .ux-modal-close').click(); await L.settle(small, 200); await L.pLog(small);
  ok(await small.inputValue('#p-text') === 'Keep a large-text draft' && !await L.overflow(small) && !small.errors.length, 'short phone: the scrolled-header X preserves the actual draft without overflow');
  await small.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
