// Shared header X controls reuse Cancel, preserving drafts, history and unread pings.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const today = L.ymd(new Date(L.NOW));

async function close(p, panel, label, keyboard = false) {
  await L.settle(p, 300);
  const selector = panel + ' .ux-modal-close';
  const info = await p.evaluate(s => {
    const el = document.querySelector(s); if (!el) return null;
    const r = el.getBoundingClientRect(), box = el.closest('.ux-swipe').getBoundingClientRect();
    return { tag: el.tagName, type: el.type, label: el.getAttribute('aria-label'), w: r.width, h: r.height, top: r.top, right: r.right, panelTop: box.top };
  }, selector);
  ok(!!info && info.tag === 'BUTTON' && info.type === 'button' && /^Close\b/.test(info.label) && info.w >= 44 && info.h >= 44 && info.top >= info.panelTop - 1 && info.top < info.panelTop + 110 && info.right <= await p.evaluate(() => innerWidth), label + ': a labelled 44 px X sits in the visible header');
  if (info && info.w && info.h) {
    if (keyboard) { await p.locator(selector).focus(); await p.keyboard.press('Enter'); }
    else await p.locator(selector).click();
    await L.settle(p, 300);
  }
}
async function escape(p) { await p.keyboard.press('Escape'); await L.settle(p, 250); }

(async () => {
  const b = await L.start();
  let p;
  for (const width of [390, 768, 1280]) {
    p = await L.open(b, '#/prep', { width, height: 900, wait: 1300 });
    await L.pLog(p); await p.fill('#p-text', 'Zest limes');
    await close(p, '.p-sheet', width + ' desktop', width === 768);
    ok(!(await p.$('.p-sheet')) && await p.evaluate(() => location.hash === '#/prep' && !(history.state && history.state.lkOv)), width + ': X closes the sheet and removes its overlay history without leaving Prep');
    if (await p.$('.p-sheet')) await escape(p);
    await L.pLog(p);
    ok(await p.inputValue('#p-text') === 'Zest limes', width + ': reopening keeps the existing Prep draft');
    await escape(p);
    ok(!(await L.overflow(p)) && p.errors.length === 0, width + ': no sideways scroll or browser errors ' + p.errors.join('|'));
    await p.context().close();
  }

  p = await L.open(b, '#/orders', { width: 1280, wait: 1300 });
  await L.oLog(p); await p.fill('#o-text', 'Lemons');
  await close(p, '.o-sheet', 'Orders');
  ok(!(await p.$('.o-sheet')) && await p.evaluate(() => location.hash === '#/orders'), 'Orders: header X closes the sheet on the same page');
  if (await p.$('.o-sheet')) await escape(p);
  await L.oLog(p);
  ok(await p.inputValue('#o-text') === 'Lemons', 'Orders: X preserves the existing order draft');
  await p.context().close();

  p = await L.open(b, '#/prep', { width: 1280, wait: 1300 });
  await L.pLog(p); await p.fill('#p-text', 'Keep this prep draft');
  await p.evaluate(() => LK_UX.AdaptivePicker({ label: 'Modal choices', trigger: document.querySelector('#p-text'), multiple: true, value: ['one'],
    items: [{ value: 'one', label: 'First choice' }, { value: 'two', label: 'Second choice' }], onChange: () => { window.modalChoiceCommitted = true; } }));
  await L.settle(p, 250);
  ok(await p.locator('.ux-picker .ux-picker-close').count() === 1 && await p.locator('.ux-picker button.ux-modal-close').count() === 1, 'native picker: its existing X is retained with no duplicate control');
  await p.locator('.ux-picker-option').nth(1).click();
  await p.locator('.ux-picker-close').click(); await L.settle(p, 300);
  ok(!(await p.$('.ux-picker')) && !!(await p.$('.p-sheet')) && await p.inputValue('#p-text') === 'Keep this prep draft' && await p.evaluate(() => !window.modalChoiceCommitted), 'native picker: closing cancels its uncommitted choices and preserves the parent draft');
  await p.locator('.p-sheet').evaluate(el => el.setAttribute('aria-busy', 'true'));
  await p.evaluate(() => { const x = document.querySelector('.p-sheet .ux-modal-close'); if (x) x.click(); }); await L.settle(p, 200);
  ok(!!(await p.$('.p-sheet')) && await p.inputValue('#p-text') === 'Keep this prep draft', 'busy sheet: X respects the pending-work guard');
  await p.locator('.p-sheet').evaluate(el => el.removeAttribute('aria-busy'));
  await close(p, '.p-sheet', 'idle sheet after pending work', true);
  ok(!(await p.$('.p-sheet')), 'idle sheet: keyboard X works once the busy guard clears');
  if (await p.$('.p-sheet')) await escape(p);
  await p.click('#nbr-i1 .nb-more'); await L.settle(p, 200);
  await close(p, '#lm-sheet .sheet', 'line menu');
  ok(!(await p.$('#lm-sheet')) && await p.evaluate(k => window.__fake.dump()[k].deleted !== true, key('days', today, 'items', 'i1')), 'line menu: X cancels without removing the line');
  if (await p.$('#lm-sheet')) await escape(p);
  await p.click('.wtop-who'); await L.settle(p, 200);
  await close(p, '.wm', 'chef menu');
  ok(!(await p.$('.wm-wrap')) && await p.evaluate(() => LK_PREP.privateAccess() && LK_PREP.state.who === 'sam'), 'chef menu: X closes the menu without signing the person out');
  if (await p.$('.wm-wrap')) await escape(p);
  await p.evaluate(() => LK_DEVICE.settings());
  await L.waitFor(p, () => !!document.querySelector('#lk-device-choice'));
  await close(p, '#lk-device-choice', 'device-choice dialog');
  ok(!(await p.$('#lk-device-choice')) && await p.evaluate(() => LK_DEVICE.mode() === 'personal' && LK_PREP.privateAccess()), 'device-choice X uses Cancel and preserves the current device and sign-in');
  if (await p.$('#lk-device-choice')) await escape(p);
  await p.evaluate(() => LK_PREP.coolingOpen(document.querySelector('.cooling-chip')));
  await L.waitFor(p, () => !!document.querySelector('.cooling-menu'));
  ok(await p.locator('.cooling-menu .cooling-close').count() === 1 && await p.locator('.cooling-menu button.ux-modal-close').count() === 1, 'cooling dialog: its existing close button remains without a duplicate X');
  await p.locator('.cooling-close').click(); await L.settle(p, 200);
  ok(p.errors.length === 0, 'menus and nested dialogs: no browser errors ' + p.errors.join('|'));
  await p.context().close();

  const note = { [key('notes', 'modal-note')]: { text: 'Fryer 2 is out', tag: 'safety', start: today, until: today, dows: [], tm: 835, removed: false, at: 1, by: 'sam' } };
  p = await L.open(b, '#/prep', { who: 'ann', width: 1280, extra: note, wait: 1600 });
  await close(p, '.nt', 'pings');
  ok(!(await p.$('.nt')) && await p.evaluate(() => location.hash === '#/prep' && !localStorage.getItem('lk.note.seen.ann')), 'pings: X dismisses the sheet without marking the safety ping read');
  ok(p.errors.length === 0, 'pings: no browser errors ' + p.errors.join('|'));
  await p.context().close();

  p = await L.open(b, '#/prep', { width: 390, touch: true, wait: 1300 });
  await L.pLog(p); await L.settle(p, 300);
  console.log('390 px touch geometry: ' + JSON.stringify(await p.evaluate(() => {
    const sheet = document.querySelector('.p-sheet').getBoundingClientRect(), title = document.querySelector('.p-sheet h3').getBoundingClientRect();
    return { sheetWidth: sheet.width, sheetHeight: sheet.height, titleWidth: title.width, titleHeight: title.height };
  })));
  ok(await p.evaluate(() => !matchMedia('(hover: hover) and (pointer: fine)').matches && [...document.querySelectorAll('.ux-modal-close')].every(el => el.getBoundingClientRect().width >= 44)), 'touch screen: the shared header X stays visible at 44 px');
  await escape(p);
  ok(!(await p.$('.p-sheet')) && !(await L.overflow(p)) && p.errors.length === 0, 'touch screen: the existing close path still works with no overflow or browser errors');
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
