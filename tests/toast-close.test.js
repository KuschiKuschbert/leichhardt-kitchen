// The desktop X dismisses a notification. It never runs the separate Undo action.
const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW));
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const item = (p, id) => p.evaluate(k => window.__fake.dump()[k] || {}, key('days', today, 'items', id));
const main = '.p-toast:not(.p-toast-old)';

async function dismiss(p, selector, label, keyboard = false) {
  const info = await p.evaluate(s => {
    const el = document.querySelector(s); if (!el) return null;
    const r = el.getBoundingClientRect(), style = getComputedStyle(el);
    return { tag: el.tagName, type: el.type, label: el.getAttribute('aria-label'), visible: !!r.width && !!r.height && style.visibility !== 'hidden', w: r.width, h: r.height, left: r.left, right: r.right,
      separate: !el.classList.contains('p-toast-btn') };
  }, selector);
  ok(!!info && info.tag === 'BUTTON' && info.type === 'button' && /^Dismiss (earlier )?notification$/.test(info.label) && info.separate, label + ': X is a labelled button separate from Undo');
  ok(!!info && info.visible && info.w >= 44 && info.h >= 44 && info.left >= 0 && info.right <= await p.evaluate(() => innerWidth), label + ': X is visible with a 44 px target inside the window');
  if (info && info.visible) {
    if (keyboard) { await p.locator(selector).focus(); await p.keyboard.press('Enter'); }
    else await p.locator(selector).click();
    await L.settle(p, 250);
  }
}
async function clear(p) {
  await p.evaluate(() => { const msg = document.querySelector('.p-toast:not(.p-toast-old) .p-toast-msg'); if (msg) msg.click(); });
  await L.settle(p, 150);
}
async function tick(p, id) {
  await L.tap(p, '[data-p="tick"][data-id="' + id + '"]');
  await L.waitFor(p, k => window.__fake.dump()[k].done === true, key('days', today, 'items', id));
  await L.settle(p, 250);
}

(async () => {
  const b = await L.start();
  let p;
  for (const width of [390, 768, 1280]) {
    p = await L.open(b, '#/prep', { width, height: 900, wait: 1300 });
    ok(await p.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches), width + ': this test uses a mouse-capable screen');
    await tick(p, 'i1');
    await dismiss(p, main + ' .p-toast-close', width + ' desktop', width === 768);
    ok(!(await p.$('.p-toast')) && (await item(p, 'i1')).done === true, width + ': dismiss clears the slip and keeps the saved tick');
    ok(await p.evaluate(() => location.hash) === '#/prep', width + ': dismiss keeps the current page');
    await clear(p);
    await tick(p, 'i2');
    await p.locator(main + ' .p-toast-btn').click(); await L.settle(p, 300);
    ok((await item(p, 'i2')).done === false && (await item(p, 'i1')).done === true, width + ': the separate Undo still unticks only its own line');
    ok(!(await L.overflow(p)) && p.errors.length === 0, width + ': no sideways scroll or browser errors ' + p.errors.join('|'));
    await p.context().close();
  }

  p = await L.open(b, '#/prep', { width: 1280, height: 900, wait: 1300 });
  await tick(p, 'i1'); await tick(p, 'i2');
  await dismiss(p, '.p-toast-old .p-toast-close', 'earlier notification');
  ok(!(await p.$('.p-toast-old')) && !!(await p.$(main)) && (await item(p, 'i1')).done === true && (await item(p, 'i2')).done === true, 'earlier X dismisses only the older notification and undoes neither tick');
  await p.locator(main + ' .p-toast-btn').click(); await L.settle(p, 300);
  ok((await item(p, 'i2')).done === false && (await item(p, 'i1')).done === true, 'newer Undo still works after dismissing the earlier notification');
  await clear(p);
  await tick(p, 'i6');
  await p.evaluate(() => window.LK_PREP.toast('Copied to the order list.', null, 1000));
  await p.clock.runFor(1200); await L.settle(p, 250);
  ok(!(await p.$(main)) && !!(await p.$('.p-toast-old')), 'the earlier Undo remains after a short new notification expires');
  await dismiss(p, '.p-toast-old .p-toast-close', 'earlier-only notification', true);
  ok(!(await p.$('.p-toast')) && (await item(p, 'i6')).done === true, 'earlier-only X dismisses its chip without undoing the saved tick');
  await clear(p);
  await tick(p, 'i3'); await tick(p, 'i4');
  await dismiss(p, main + ' .p-toast-close', 'stacked notifications');
  ok(!(await p.$('.p-toast')) && (await item(p, 'i3')).done === true && (await item(p, 'i4')).done === true, 'main X dismisses both notifications and keeps both saved ticks');
  ok(p.errors.length === 0, 'stacked notifications: no browser errors ' + p.errors.join('|'));
  await p.context().close();

  p = await L.open(b, '#/prep', { width: 1280, wait: 1300 });
  await p.evaluate(() => { window.__fake.mode = 'fail'; });
  await L.tap(p, '[data-p="tick"][data-id="i3"]');
  await L.waitFor(p, () => !!document.querySelector('.p-toast-bad'));
  await p.clock.runFor(20000); await L.settle(p, 200);
  ok(!!(await p.$('.p-toast-bad')), 'a failed-save notification persists until explicitly dismissed');
  await dismiss(p, '.p-toast-bad .p-toast-close', 'failed-save notification');
  ok(!(await p.$('.p-toast')) && (await item(p, 'i3')).done !== true, 'error X clears the message without retrying or changing the failed line');
  ok(p.errors.length === 0, 'failed-save notification: no browser errors ' + p.errors.join('|'));
  await p.context().close();

  p = await L.open(b, '#/recipes', { width: 1280, wait: 1000 });
  await p.evaluate(() => { window.toastCloseAction = 0; window.LK_PREP.toast('A notification outside the work pages.', { label: 'Undo', fn: () => { window.toastCloseAction++; } }); });
  await dismiss(p, '.p-toast .p-toast-close', 'off-page notification');
  ok(!(await p.$('.p-toast')) && await p.evaluate(() => window.toastCloseAction === 0), 'off-page X clears its notification without running its callback');
  ok(p.errors.length === 0, 'off-page notification: no browser errors ' + p.errors.join('|'));
  await p.context().close();

  p = await L.open(b, '#/prep', { width: 390, touch: true, wait: 1300 });
  await tick(p, 'i1');
  ok(await p.evaluate(() => !matchMedia('(hover: hover) and (pointer: fine)').matches && [...document.querySelectorAll('.p-toast-close')].every(el => !el.getClientRects().length)), 'touch screen: the new X stays hidden');
  await p.locator(main + ' .p-toast-btn').click(); await L.settle(p, 300);
  ok((await item(p, 'i1')).done === false && !(await L.overflow(p)) && p.errors.length === 0, 'touch screen: Undo keeps working with no overflow or browser errors');
  await p.context().close();

  p = await L.open(b, '#/manage/r/burger', { admin: true, width: 1280, wait: 1400 });
  await L.waitFor(p, () => !!document.querySelector('#mg-name'));
  await L.reveal(p, '#mg-name'); await p.fill('#mg-name', 'Toast close burger');
  await p.click('[data-mg="save"]');
  await L.waitFor(p, () => !!document.querySelector('.mg-toasts .p-toast'));
  await dismiss(p, '.mg-toasts .p-toast-close', 'recipe editor notification', true);
  ok(!(await p.$('.mg-toasts .p-toast')) && await p.evaluate(k => window.__fake.dump()[k].r.name === 'Toast close burger', key('recipes', 'burger')), 'recipe editor X dismisses its slip and preserves the saved recipe');
  ok(!(await L.overflow(p)) && p.errors.length === 0, 'recipe editor: no sideways scroll or browser errors ' + p.errors.join('|'));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
