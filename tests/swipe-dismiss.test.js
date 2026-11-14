// Dismissal uses each sheet's existing Cancel path, including drafts, history and unread pings.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');

async function swipe(p, selector, dx = 0, dy = 110, options = {}) {
  // CDP touches use exact coordinates, so wait for the sheet's entrance to finish before measuring its title.
  await L.settle(p, 400);
  const box = await p.locator(selector).first().boundingBox();
  if (!box) throw new Error('Swipe target is not visible: ' + selector);
  // options.at = [part of the width, px down from the top]: where a thumb lands, say the sheet's top edge
  const x = options.at ? box.x + box.width * options.at[0] : box.x + Math.min(box.width / 2, 140);
  const y = options.at ? box.y + options.at[1] : box.y + Math.min(box.height / 2, 14);
  if (options.mouse) {
    await p.mouse.move(x, y); await p.mouse.down();
    await p.mouse.move(x + dx, y + dy, { steps: 8 });
    if (options.inspect) await options.inspect();
    await p.mouse.up();
  } else {
    const cdp = await p.context().newCDPSession(p);
    const point = (x, y) => [{ x, y, id: 1, radiusX: 3, radiusY: 3, force: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(x, y) });
    for (let i = 1; i <= 8; i++) {
      const points = point(x + dx * i / 8, y + dy * i / 8);
      if (options.multitouch && i >= 3) points.push({ ...points[0], id: 2, x: points[0].x + 30 });
      await cdp.send('Input.dispatchTouchEvent', { type: options.multitouch && i === 3 ? 'touchStart' : 'touchMove', touchPoints: points });
    }
    if (options.inspect) await options.inspect();
    await cdp.send('Input.dispatchTouchEvent', { type: options.cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    await cdp.detach();
  }
  await L.settle(p, 400);
}
async function picker(p, multiple = false, many = false) {
  await p.evaluate(({ multi, many }) => {
    const trigger = document.querySelector('.p-sheet h3') || document.querySelector('.nb-addline');
    window.LK_UX.AdaptivePicker({ label: 'Test choices', trigger, multiple: multi, value: ['one'],
      items: many ? Array.from({ length: 40 }, (_, i) => ({ value: String(i), label: 'Choice ' + i })) : [{ value: 'one', label: 'First choice' }, { value: 'two', label: 'Second choice' }],
      onChange: value => { window.swipeSelection = value; } });
  }, { multi: multiple, many });
  await L.settle(p, 250);
}
async function closePrep(p) {
  if (await p.$('.p-sheet')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
}

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { touch: true, wait: 1500 });
  const listBefore = await p.locator('.nb-rows').first().boundingBox();
  console.log('390 px baseline: ' + JSON.stringify(await p.evaluate(() => {
    const rows = [...document.querySelectorAll('.nb-rows > li')].map(el => el.getBoundingClientRect());
    const h = document.querySelector('.nb-ph').getBoundingClientRect();
    return { visibleRows: rows.filter(r => r.top >= 0 && r.bottom <= innerHeight).length, headerTop: h.top, headerHeight: h.height, firstRowTop: rows[0] && rows[0].top, firstRowHeight: rows[0] && rows[0].height };
  })));
  await L.pLog(p);
  await p.fill('#p-text', 'Zest limes');
  await swipe(p, '.p-sheet h3', 0, 15);
  ok(!!(await p.$('.p-sheet')), 'phone: a short header movement keeps the sheet open');
  await swipe(p, '.p-sheet h3', 100, 10);
  ok(!!(await p.$('.p-sheet')), 'phone: a horizontal header swipe keeps the sheet open');
  await swipe(p, '.p-sheet h3', 0, -80);
  ok(!!(await p.$('.p-sheet')), 'phone: an upward header swipe keeps the sheet open');
  await swipe(p, '.p-sheet h3', 0, 100, { multitouch: true });
  ok(!!(await p.$('.p-sheet')), 'phone: adding a second finger cancels swipe dismissal');
  await p.locator('.p-sheet').evaluate(el => el.setAttribute('aria-busy', 'true'));
  await swipe(p, '.p-sheet h3');
  ok(!!(await p.$('.p-sheet')), 'phone: a busy sheet keeps its existing pending-work guard');
  await p.locator('.p-sheet').evaluate(el => el.removeAttribute('aria-busy'));
  const atRest = await p.locator('.p-sheet').boundingBox();
  let duringDrag;
  await swipe(p, '.p-sheet h3', 0, 100, { cancel: true, inspect: async () => { duringDrag = await p.locator('.p-sheet').boundingBox(); } });
  const afterCancel = await p.locator('.p-sheet').boundingBox();
  ok(duringDrag.y > atRest.y + 80, 'phone: the sheet follows the finger during a downward drag');
  ok(Math.abs(afterCancel.y - atRest.y) < 1, 'phone: a cancelled drag snaps back to the original position');
  ok(!!(await p.$('.p-sheet')), 'phone: a cancelled touch returns the sheet without dismissing');
  await swipe(p, '#p-text', 0, 100);
  ok(!!(await p.$('.p-sheet')) && await p.inputValue('#p-text') === 'Zest limes', 'phone: dragging a form field preserves the sheet and typed words');
  // 15 Nov 2026: the grip was a bare 44 x 5 px bar, so the top of every phone sheet took no touch. A thumb pulls from there.
  const grip = await p.locator('.p-sheet > .sheet-grip').evaluate(g => { const r = g.getBoundingClientRect(), s = g.closest('.sheet').getBoundingClientRect(); return { w: r.width, h: r.height, top: r.top - s.top }; });
  ok(grip.w >= 300 && grip.h >= 22 && grip.top <= 2, 'phone: the grip is a strip across the top of the sheet that takes the touch (' + Math.round(grip.w) + ' x ' + Math.round(grip.h) + ' px)');
  await swipe(p, '.p-sheet', 0, 110, { at: [0.3, 4] });
  ok(!(await p.$('.p-sheet')), 'phone: a downward drag from the top edge of the sheet, beside the grip bar, dismisses Add to prep');
  if (await p.$('.p-sheet')) await closePrep(p);
  await L.pLog(p);
  ok(await p.inputValue('#p-text') === 'Zest limes', 'phone: the draft survives a swipe from the top edge');
  await swipe(p, '.p-sheet h3');
  ok(!(await p.$('.p-sheet')), 'phone: a real downward touch swipe on the title dismisses Add to prep');
  ok(await p.evaluate(() => location.hash) === '#/prep', 'phone: swipe closes the overlay without navigating away');
  if (await p.$('.p-sheet')) await closePrep(p);
  const listAfter = await p.locator('.nb-rows').first().boundingBox();
  ok(Math.abs(listAfter.y - listBefore.y) < 1, 'phone: dismissal keeps the list in place');
  await L.pLog(p);
  ok(await p.inputValue('#p-text') === 'Zest limes', 'phone: reopening the swiped sheet keeps its existing draft');

  await picker(p, true);
  await p.locator('.ux-picker-option').nth(1).click();
  await p.locator('.ux-picker-head h2').evaluate(el => {
    const replacement = document.createElement('h2'); replacement.id = el.id; replacement.textContent = 'Replacement choices'; el.replaceWith(replacement);
  });
  await swipe(p, '.ux-picker-head h2');
  ok(!(await p.$('.ux-picker')) && !!(await p.$('.p-sheet')), 'phone: swiping a replaced nested picker heading closes only that picker');
  ok(await p.inputValue('#p-text') === 'Zest limes' && await p.evaluate(() => window.swipeSelection === undefined), 'phone: picker swipe discards uncommitted choices and keeps the parent draft');
  if (await p.$('.ux-picker')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
  // 15 Nov 2026 (owner): a pull down on a sheet's body closes it when everything under the finger is at its top.
  await picker(p);
  await swipe(p, '.ux-picker-option', 0, 100);
  ok(!(await p.$('.ux-picker')) && await p.evaluate(() => window.swipeSelection === undefined) && await p.inputValue('#p-text') === 'Zest limes', 'phone: pulling a short choice list down from its top closes the picker without choosing, the draft kept');
  if (await p.$('.ux-picker')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
  await closePrep(p);
  await p.click('#nbr-i1 .nb-more'); await L.settle(p, 200);
  await swipe(p, '#lm-sheet .sheet h3');
  ok(!(await p.$('#lm-sheet')) && !!(await p.$('#nbr-i1')), 'phone: swiping the line menu cancels it without removing the line');
  if (await p.$('#lm-sheet')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
  await p.click('#nbr-i1 .nb-more'); await L.settle(p, 200);
  await swipe(p, '#lm-sheet .sheet', 0, 110, { at: [0.8, 4] });
  ok(!(await p.$('#lm-sheet')) && !!(await p.$('#nbr-i1')), 'phone: a drag from the top edge of the line menu closes it');
  if (await p.$('#lm-sheet')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
  await p.click('#nbr-i1 .nb-more'); await L.settle(p, 200);
  const writes = await p.evaluate(() => window.__fake.writes.length);
  await swipe(p, '#lm-sheet .sheet button:not(.ux-modal-close)', 0, 110);
  ok(!(await p.$('#lm-sheet')) && !!(await p.$('#nbr-i1')) && !(await p.$('.sheet')) && await p.evaluate(n => window.__fake.writes.length === n, writes), 'phone: a pull down from the line menu body, starting on an option, closes it and does not do the option');
  if (await p.$('#lm-sheet')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
  await picker(p, false, true);
  await swipe(p, '.ux-picker-option:nth-child(3)', 0, -160);
  ok(!!(await p.$('.ux-picker')) && await p.locator('.ux-picker-options').evaluate(el => el.scrollTop > 0), 'phone: touching the choice list scrolls it and keeps the picker open');
  await p.locator('.ux-picker-options').evaluate(el => { el.scrollTop = 150; });
  await swipe(p, '.ux-picker-options', 0, 100, { at: [0.5, 200] });
  ok(!!(await p.$('.ux-picker')) && await p.locator('.ux-picker-options').evaluate(el => el.scrollTop < 150) && await p.evaluate(() => window.swipeSelection === undefined), 'phone: a pull down on a list scrolled down scrolls it back up and keeps the picker open');
  await swipe(p, 'dialog.ux-picker', 0, 100, { at: [0.5, -120] });
  ok(!!(await p.$('.ux-picker')), 'phone: a drag on the dimmed page above a picker does not pull the picker');
  if (await p.$('.ux-picker')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
  await L.pLog(p);
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  ok(!(await p.$('.p-sheet')), 'phone: Escape still closes a sheet after swiping and reopening');
  await p.click('.wtop-who'); await L.settle(p, 200);
  await swipe(p, '.wm-me');
  ok(!(await p.$('.wm-wrap')) && await p.evaluate(() => window.LK_PREP.privateAccess() && window.LK_PREP.state.who === 'sam'), 'phone: swiping the chef menu closes it and keeps the person signed in');
  await p.click('.wtop-who'); await L.settle(p, 200);
  await swipe(p, '.wm', 0, 110, { at: [0.3, 4] });
  ok(!(await p.$('.wm-wrap')), 'phone: a drag from the top edge of the chef menu closes it');
  if (await p.$('.wm-wrap')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'phone: no sideways scroll or browser errors ' + p.errors.join('|'));
  await p.context().close();

  // The body pull leaves a scrolled form, an upward or sideways drag and a short pull to the browser.
  p = await L.open(b, '#/waste', { touch: true, wait: 1500 });
  await L.wLog(p);
  await p.locator('.w-sheet').evaluate(el => { el.scrollTop = 200; });
  const scrolled = await p.locator('.w-sheet').evaluate(el => el.scrollTop);
  await swipe(p, '.w-sheet', 0, 110, { at: [0.5, 260] });
  ok(scrolled > 0 && !!(await p.$('.w-sheet')) && await p.locator('.w-sheet').evaluate(el => el.scrollTop === 0), 'waste: a pull down on a scrolled form scrolls it back to the top and keeps Log waste open');
  await swipe(p, '.w-sheet .w-rule', 0, -110);
  ok(!!(await p.$('.w-sheet')) && await p.locator('.w-sheet').evaluate(el => el.scrollTop > 0), 'waste: an upward drag at the top scrolls the form and keeps it open');
  await p.locator('.w-sheet').evaluate(el => { el.scrollTop = 0; });
  await swipe(p, '.w-sheet .w-rule', 110, 10);
  ok(!!(await p.$('.w-sheet')), 'waste: a sideways drag on the body keeps it open');
  await swipe(p, '.w-sheet .w-rule', 0, 20);
  ok(!!(await p.$('.w-sheet')), 'waste: a short 20 px pull keeps it open');
  await swipe(p, '.w-sheet .w-rule', 0, 110, { multitouch: true });
  ok(!!(await p.$('.w-sheet')), 'waste: a second finger cancels a body pull');
  await swipe(p, '.w-sheet .w-rule', 0, 110);
  ok(!(await p.$('.w-sheet')) && p.errors.length === 0, 'waste: a pull down on the body at the top closes Log waste ' + p.errors.join('|'));
  await p.context().close();

  // Guide pages keep pinch and page turning: only the grip and the toolbar pull.
  p = await L.open(b, '#/guides/combi', { who: 'ann', touch: true, extra: L.guides(), wait: 1200 });
  await L.waitFor(p, () => !!document.querySelector('[data-p="g-zoom"][data-i="0"]'));
  await p.click('[data-p="g-zoom"][data-i="0"]');
  await swipe(p, '.gz-body', 0, 110);
  ok(!!(await p.$('.gz-wrap')), 'guide: a drag on the page itself keeps the document open');
  await swipe(p, '.gz-wrap', 0, 110, { at: [0.3, 4] });
  ok(!(await p.$('.gz-wrap, .ux-modal-shade')) && p.errors.length === 0, 'guide: a drag from the top edge closes the document ' + p.errors.join('|'));
  await p.context().close();

  p = await L.open(b, '#/orders', { touch: true, wait: 1500 });
  await L.oLog(p); await p.fill('#o-text', 'Lemons');
  await swipe(p, '.o-sheet h3');
  ok(!(await p.$('.o-sheet')), 'orders: a downward title swipe closes Add request');
  if (await p.$('.o-sheet')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
  await L.oLog(p);
  ok(await p.inputValue('#o-text') === 'Lemons', 'orders: the existing draft survives swipe dismissal');
  ok(p.errors.length === 0, 'orders: no browser errors ' + p.errors.join('|'));
  await p.context().close();

  const today = L.ymd(new Date(L.NOW)), note = {};
  note[fsKey(['notes', 'swipe-note'])] = { text: 'Fryer 2 is out', tag: 'safety', start: today, until: today, dows: [], tm: 835, removed: false, at: 1, by: 'sam' };
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, extra: note, wait: 1800 });
  ok(!!(await p.$('.nt')), 'pings: the safety ping opens');
  const bar = await p.locator('.nt > .nt-grip').evaluate(g => { const a = getComputedStyle(g, '::after'); return a.content !== 'none' ? a.backgroundColor : getComputedStyle(g).backgroundColor; });
  ok(/^rgb\(/.test(bar) && bar !== 'rgb(255, 255, 255)', 'pings: the grip bar shows on the paper, not half see-through white (' + bar + ')');
  await swipe(p, '.nt-head');
  ok(!(await p.$('.nt')), 'pings: downward header swipe dismisses the sheet');
  ok(await p.evaluate(() => !localStorage.getItem('lk.note.seen.ann') && !window.__fake.writes.some(w => /\/noteseen\//.test(w.path || ''))), 'pings: swiping does not mark a safety ping read');
  ok(await p.evaluate(() => location.hash) === '#/prep' && p.errors.length === 0, 'pings: the prep page remains without browser errors');
  await p.context().close();
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, extra: note, wait: 1800 });
  await swipe(p, '.nt', 0, 110, { at: [0.3, 4] });
  ok(!(await p.$('.nt')) && p.errors.length === 0, 'pings: a downward drag from the top edge of the sheet dismisses it ' + p.errors.join('|'));
  await p.context().close();

  for (const width of [768, 1280]) {
    p = await L.open(b, '#/prep', { width, height: 1000, touch: width === 768, wait: 1500 });
    await L.pLog(p);
    await swipe(p, '.p-sheet h3', 0, 110, { mouse: width === 1280 });
    ok(!(await p.$('.p-sheet')), width + ': dragging the modal title down dismisses it');
    if (await p.$('.p-sheet')) await closePrep(p);
    await picker(p, true); await p.locator('.ux-picker-option').nth(1).click();
    await swipe(p, '.ux-picker-head h2', 0, 110, { mouse: width === 1280 });
    ok(!(await p.$('.ux-picker')) && await p.evaluate(() => window.swipeSelection === undefined), width + ': downward picker drag dismisses without applying choices');
    if (width === 1280) {
      await p.click('#nbr-i1 .nb-more'); await L.settle(p, 200);
      await swipe(p, '#lm-sheet .lm-who', 0, 110, { mouse: true });
      ok(!!(await p.$('#lm-sheet')), '1280: a mouse drag on the body selects words and keeps the menu open');
      if (await p.$('#lm-sheet')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
    }
    ok(!(await L.overflow(p)) && p.errors.length === 0, width + ': no sideways scroll or browser errors ' + p.errors.join('|'));
    await p.context().close();
  }

  p = await L.open(b, '#/prep', { who: '', touch: true, wait: 1400 });
  await swipe(p, 'h2.p-h', 0, 110);
  ok(!!(await p.$('.p-names')) && !(await p.$('.nb-row')), 'sign in: a swipe cannot dismiss the mandatory name screen');
  ok(p.errors.length === 0, 'sign in: no browser errors ' + p.errors.join('|'));
  await p.context().close();

  // Flick speed on a real clock (15 Nov 2026). L.open installs a test clock that also replaces Event.timeStamp, so no
  // flick can be measured there (every move reads the same time). This plain page loads only the shared controls and
  // the book's styles, and the touches carry the times a phone would give them.
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const q = await ctx.newPage(), qErrors = []; q.on('pageerror', e => qErrors.push(String(e)));
  await q.route('**/__swipe-flick-fixture', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="css/app.css"></head><body><main style="height:2000px">Page</main><script src="js/controls.js"></script></body></html>' }));
  await q.goto(new URL('__swipe-flick-fixture', L.BASE).href);
  async function flick(moves, liftMs) {
    await q.evaluate(() => {
      document.querySelectorAll('#flick').forEach(n => n.remove());
      const box = document.createElement('div'); box.id = 'flick';
      box.innerHTML = '<div class="sheet-bg"></div><div class="sheet" role="dialog" aria-label="Test sheet"><div class="sheet-grip"></div><h3>Test sheet</h3><p style="height:260px">Words</p></div>';
      box.firstChild.addEventListener('click', () => box.remove()); document.body.appendChild(box);
    });
    await q.waitForSelector('#flick .ux-swipe-handle'); await L.sleep(400);
    const h = await q.locator('#flick h3').boundingBox(), x = h.x + 40, y = h.y + h.height / 2;
    const cdp = await ctx.newCDPSession(q), at = (x, y) => [{ x, y, id: 1, radiusX: 10, radiusY: 10, force: 1 }];
    let t = Date.now() / 1000;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(x, y), timestamp: t });
    for (const [down, ms] of moves) { t += ms / 1000; await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(x, y + down), timestamp: t }); }
    t += liftMs / 1000;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [], timestamp: t }); await cdp.detach();
    await L.sleep(300);
    return !(await q.$('#flick'));
  }
  const even = (down, n, ms) => Array.from({ length: n }, (_, i) => [down * (i + 1) / n, ms]);
  ok(await flick([[20, 8], [40, 8], [55, 8], [60, 16]], 8), 'flick: a quick 60 px flick that slows in its last frame closes the sheet');
  ok(await flick(even(45, 3, 8), 4), 'flick: a 45 px flick in 24 ms closes the sheet');
  ok(!(await flick(even(50, 4, 10), 150)), 'flick: 50 px, then the finger rests 150 ms before lifting, keeps the sheet open');
  ok(!(await flick(even(40, 8, 20), 8)), 'flick: a slow 40 px drag keeps the sheet open');
  ok(qErrors.length === 0, 'flick: no browser errors ' + qErrors.join('|'));
  await ctx.close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
