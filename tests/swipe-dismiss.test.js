// Dismissal uses each sheet's existing Cancel path, including drafts, history and unread pings.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');

async function swipe(p, selector, dx = 0, dy = 110, options = {}) {
  // CDP touches use exact coordinates, so wait for the sheet's entrance to finish before measuring its title.
  await L.settle(p, 400);
  const box = await p.locator(selector).first().boundingBox();
  if (!box) throw new Error('Swipe target is not visible: ' + selector);
  const x = box.x + Math.min(box.width / 2, 140), y = box.y + Math.min(box.height / 2, 14);
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
  await picker(p);
  await swipe(p, '.ux-picker-option', 0, 100);
  ok(!!(await p.$('.ux-picker')), 'phone: dragging an option does not dismiss or select the picker');
  if (await p.$('.ux-picker')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
  await closePrep(p);
  await p.click('#nbr-i1 .nb-more'); await L.settle(p, 200);
  await swipe(p, '#lm-sheet .sheet h3');
  ok(!(await p.$('#lm-sheet')) && !!(await p.$('#nbr-i1')), 'phone: swiping the line menu cancels it without removing the line');
  if (await p.$('#lm-sheet')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
  await picker(p, false, true);
  await swipe(p, '.ux-picker-option:nth-child(3)', 0, -160);
  ok(!!(await p.$('.ux-picker')) && await p.locator('.ux-picker-options').evaluate(el => el.scrollTop > 0), 'phone: touching the choice list scrolls it and keeps the picker open');
  if (await p.$('.ux-picker')) { await p.keyboard.press('Escape'); await L.settle(p, 200); }
  await L.pLog(p);
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  ok(!(await p.$('.p-sheet')), 'phone: Escape still closes a sheet after swiping and reopening');
  await p.click('.wtop-who'); await L.settle(p, 200);
  await swipe(p, '.wm-me');
  ok(!(await p.$('.wm-wrap')) && await p.evaluate(() => window.LK_PREP.privateAccess() && window.LK_PREP.state.who === 'sam'), 'phone: swiping the chef menu closes it and keeps the person signed in');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'phone: no sideways scroll or browser errors ' + p.errors.join('|'));
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
  await swipe(p, '.nt-head');
  ok(!(await p.$('.nt')), 'pings: downward header swipe dismisses the sheet');
  ok(await p.evaluate(() => !localStorage.getItem('lk.note.seen.ann') && !window.__fake.writes.some(w => /\/noteseen\//.test(w.path || ''))), 'pings: swiping does not mark a safety ping read');
  ok(await p.evaluate(() => location.hash) === '#/prep' && p.errors.length === 0, 'pings: the prep page remains without browser errors');
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
    ok(!(await L.overflow(p)) && p.errors.length === 0, width + ': no sideways scroll or browser errors ' + p.errors.join('|'));
    await p.context().close();
  }

  p = await L.open(b, '#/prep', { who: '', touch: true, wait: 1400 });
  await swipe(p, 'h2.p-h', 0, 110);
  ok(!!(await p.$('.p-names')) && !(await p.$('.nb-row')), 'sign in: a swipe cannot dismiss the mandatory name screen');
  ok(p.errors.length === 0, 'sign in: no browser errors ' + p.errors.join('|'));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
