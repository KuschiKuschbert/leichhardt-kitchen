// Page Back closes the nearest task and honours the existing discard checks. The phone's Back closes a sheet once,
// then the next Back still reaches the previous page. All fixtures and writes are confined to the Firebase stand-in.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results();
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const back = '.wtop [data-act="back"]';
const label = p => p.locator(back).getAttribute('aria-label');
const leaveNote = p => L.txt(p, '#prep-leave-note');
const hash = p => p.evaluate(() => location.hash);
const title = p => L.txt(p, '#rtitle');
const clickBack = async p => { await p.click(back); await L.settle(p, 200); };
const go = async (p, h) => { await p.goto(L.BASE + h); await L.settle(p, 700); };
const noErrors = (p, name) => ok(!p.errors.length, name + ': no page errors ' + p.errors.join(' | '));
const configWrites = p => p.evaluate(() => __fake.writes.flat().filter(w => /\/config\/main$/.test(w.path)).length);

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { wait: 1500 });
  await L.chef(p, 'staff');
  await L.waitFor(p, () => !!document.querySelector('[data-p="a-add-person"]'));
  await p.click('[data-p="a-add-person"]');
  await p.locator('[data-a="name"]').last().fill('New person');
  const before = await configWrites(p);
  ok(/Back to prep list/.test(await label(p)), 'staff: Back names the underlying prep list');
  await clickBack(p);
  ok(await title(p) === 'Manage staff' && await p.locator('[data-a="name"]').last().inputValue() === 'New person', 'staff: first Back keeps the unsaved name');
  ok(/Unsaved changes/.test(await leaveNote(p)) && await label(p) === 'Back to prep list', 'staff: separate feedback explains discard while Back keeps its destination');
  await clickBack(p);
  ok(await hash(p) === '#/prep' && !!await p.$('.nb-left') && !await p.$('.p-staff-page'), 'staff: confirmed Back closes the panel and stays on prep');
  ok(await configWrites(p) === before, 'staff: returning does not save discarded changes');

  await L.chef(p, 'pings');
  await L.waitFor(p, () => !!document.querySelector('[data-p="n-new"]'));
  await p.click('[data-p="n-new"]');
  await p.fill('#n-text', 'Check the pass before service.');
  await go(p, '#/orders');
  ok(!!await p.$('#o-text'), 'pings: a page change opens the order list');
  await go(p, '#/prep');
  if (!await p.$('#n-text')) await L.chef(p, 'pings');
  ok(await p.inputValue('#n-text') === 'Check the pass before service.', 'pings: returning preserves the unfinished ping');
  await clickBack(p);
  ok(await p.inputValue('#n-text') === 'Check the pass before service.' && /Unsaved changes/.test(await leaveNote(p)), 'pings: first editor Back keeps text and shows separate discard feedback');
  await clickBack(p);
  ok(!await p.$('#n-text') && !!await p.$('[data-p="n-new"]'), 'pings: confirmed editor Back returns to the pings list');
  await clickBack(p);
  ok(await hash(p) === '#/prep' && !!await p.$('.nb-left'), 'pings: next Back closes the local page');
  ok(await p.evaluate(() => !Object.keys(__fake.dump()).some(k => /\/notes\//.test(k))), 'pings: Back does not publish a ping');
  noErrors(p, 'local staff and pings');
  await p.context().close();

  // Register and the owner editors: clean and unsaved forms each take one local step at a time.
  p = await L.open(b, '#/minutes', { wait: 1500 });
  await p.click('[data-p="mn-sous"]'); await L.settle(p, 400);
  ok(await hash(p) === '#/prep' && !!await p.$('.p-minutes-page'), 'minutes: the sign-off register opens as a local prep page');
  await clickBack(p);
  ok(await hash(p) === '#/prep' && !!await p.$('.nb-left'), 'minutes: Back closes the register before leaving prep');
  noErrors(p, 'minutes register');
  await p.context().close();

  p = await L.open(b, '#/admin', { admin: true, who: '', wait: 1800 });
  await L.adminTab(p, 'minutes');
  await L.waitFor(p, () => !!document.querySelector('[data-p="mn-new"]'));
  await p.click('[data-p="mn-new"]');
  await p.fill('#mn-decisions', 'Check labels before service.');
  await p.click('[data-p="mn-prev"]'); await L.settle(p, 150);
  ok(/Back to writing/.test(await label(p)), 'minutes preview: Back names the form');
  await clickBack(p);
  ok(await p.inputValue('#mn-decisions') === 'Check labels before service.', 'minutes preview: Back restores the form with its text');
  await clickBack(p);
  ok(await p.inputValue('#mn-decisions') === 'Check labels before service.' && /Unsaved changes/.test(await leaveNote(p)), 'minutes: first Back preserves the unsaved minutes');
  await clickBack(p);
  ok(!await p.$('.mn-form') && await hash(p) === '#/admin', 'minutes: confirmed Back closes the editor and keeps admin open');
  await L.adminTab(p, 'guides');
  await L.waitFor(p, () => !!document.querySelector('[data-p="g-new"]'));
  await p.click('[data-p="g-new"]'); await p.fill('#g-title', 'New guide');
  await clickBack(p);
  ok(await p.inputValue('#g-title') === 'New guide' && /Unsaved changes/.test(await leaveNote(p)), 'guide: first Back protects the unsaved guide');
  await clickBack(p);
  ok(!await p.$('.g-edit') && await hash(p) === '#/admin', 'guide: confirmed Back closes the editor and keeps admin open');
  ok(await p.evaluate(() => !Object.keys(__fake.dump()).some(k => /\/(minutes|guides)\//.test(k))), 'owner editors: Back saves or publishes nothing');
  noErrors(p, 'owner editors');
  await p.context().close();

  // A Save already in flight cannot lose its panel while the network is deciding the result.
  p = await L.open(b, '#/prep', { wait: 1500 });
  await L.chef(p, 'staff');
  await p.click('[data-p="a-add-person"]');
  await p.locator('[data-a="name"]').last().fill('New person');
  await p.evaluate(() => { __fake.mode = 'hold'; });
  await p.click('[data-p="a-save"]'); await L.settle(p, 250);
  ok(await p.locator(back).isDisabled() && await title(p) === 'Manage staff', 'saving staff: Back is disabled until the save settles');
  await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
  await L.waitFor(p, () => !LK_PREP.state.busy && /Saved\./.test((document.querySelector('.a-savebar .saved') || {}).textContent || ''));
  ok(!await p.locator(back).isDisabled(), 'saving staff: Back is enabled after the save completes');
  await clickBack(p);
  ok(!!await p.$('.nb-left'), 'saving staff: the saved panel then returns to prep');
  noErrors(p, 'saving staff');
  await p.context().close();

  // Same-address sheets: Back closes them and preserves the underlying route and its earlier history.
  p = await L.open(b, '#/recipes', { wait: 1500 });
  await go(p, '#/prep');
  await p.click('.nb-row .nb-more');
  await p.goBack(); await L.settle(p, 250);
  ok(!await p.$('#lm-sheet') && await hash(p) === '#/prep', 'line menu: native Back closes only the sheet');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.matches('.nb-more')), 'line menu: Back returns focus to its opener');
  await p.goBack(); await L.settle(p, 300);
  ok(await hash(p) === '#/recipes', 'line menu: next native Back reaches the previous page');
  await go(p, '#/prep');
  await p.click('.nb-row .nb-more'); await p.keyboard.press('Escape'); await L.settle(p, 200);
  await p.goBack(); await L.settle(p, 300);
  ok(await hash(p) === '#/recipes', 'line menu: Escape removes its history step before the next Back');
  noErrors(p, 'line menu history');
  await p.context().close();

  p = await L.open(b, '#/prep', { admin: true, who: '', wait: 1500 });
  await go(p, '#/admin'); await L.adminTab(p, 'people');
  await L.waitFor(p, () => !!document.querySelector('.a-jumpbtn'));
  await p.click('.a-jumpbtn'); await p.goBack(); await L.settle(p, 250);
  ok(!await p.$('#aj-sheet') && await hash(p) === '#/admin', 'admin jump sheet: native Back keeps the admin page');
  await p.click('.a-jumpbtn'); await p.click('#aj-sheet .sheet-x'); await L.settle(p, 200);
  await p.goBack(); await L.settle(p, 300);
  ok(await hash(p) === '#/prep', 'admin jump sheet: Cancel removes its history step before the next Back');
  noErrors(p, 'admin jump history');
  await p.context().close();

  const today = L.ymd(new Date(L.NOW)), at = hm => M.kat(today, M.hmMin(hm));
  const booking = M.derive({ v: 1, status: 'confirmed', name: 'Test function', date: today, start: at('13:00'), loc: 'Function room', guests: 20,
    mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0, rounds: [{ at: at('14:15'), note: '' }],
    lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 2, u: [0, 0] }],
    was: {}, chg: [], cBy: 'sam', cAt: L.NOW - 86400000, confBy: 'sam', confAt: L.NOW - 86400000, by: 'sam', upd: L.NOW - 3600000 });
  p = await L.open(b, '#/recipes', { extra: { [key(['functions', 'test'])]: booking }, wait: 1500 });
  await go(p, '#/prep');
  await L.waitFor(p, () => !!document.querySelector('#fn-band [data-fn="open"]'));
  await p.click('#fn-band [data-fn="open"]'); await p.goBack(); await L.settle(p, 250);
  ok(!await p.$('.fn-pop') && await hash(p) === '#/prep', 'function sheet: native Back closes only the sheet');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.matches('[data-fn="open"]')), 'function sheet: Back returns focus to the function');
  await p.click('#fn-band [data-fn="open"]'); await p.click('.fn-pop button[data-fn="close"]'); await L.settle(p, 200);
  await p.goBack(); await L.settle(p, 300);
  ok(await hash(p) === '#/recipes', 'function sheet: Close removes its history step before the next Back');
  noErrors(p, 'function sheet history');
  await p.context().close();

  // An explicit sheet close must not undo a later scroll while its same-address Back is still in flight.
  for (const restoration of ['auto', 'manual']) {
    p = await L.open(b, '#/recipes', { extra: { [key(['functions', 'test'])]: booking }, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('#fn-band [data-fn="open"]'));
    await p.evaluate(mode => { history.scrollRestoration = mode; document.body.style.minHeight = '4000px'; scrollTo(0, 1500); }, restoration);
    await L.settle(p, 200);
    await p.click('.fn-strip-b'); await L.settle(p, 150);
    await p.evaluate(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      scrollTo(0, 0);
    });
    await L.settle(p, 300);
    const closedState = await p.evaluate(() => ({ y: scrollY, hidden: document.querySelector('.fn-strip').hidden }));
    ok(closedState.y === 0 && closedState.hidden, restoration + ' restoration: an immediate scroll after Escape stays at the top ' + JSON.stringify(closedState));
    ok(await p.evaluate(() => history.scrollRestoration) === restoration, restoration + ' restoration: closing a sheet keeps the caller\'s scroll restoration mode');
    await p.evaluate(() => scrollTo(0, 1500)); await L.settle(p, 150);
    await p.click('.fn-strip-b'); await L.settle(p, 150);
    await p.evaluate(() => scrollTo(0, 0));
    await p.goBack(); await L.settle(p, 300);
    ok(await p.evaluate(() => scrollY) === (restoration === 'auto' ? 1500 : 0), restoration + ' restoration: native Back keeps its usual scroll behaviour');
    noErrors(p, restoration + ' restoration');
    await p.context().close();
  }

  // Control the artificial delay with the installed test clock. Competing CI pages must not let the
  // 600 ms fallback overtake this 50 ms delay before Chromium dispatches its native popstate.
  p = await L.open(b, '#/recipes', { extra: { [key(['functions', 'test'])]: booking }, wait: 1500 });
  await p.evaluate(() => { document.body.style.minHeight = '4000px'; scrollTo(0, 1500); });
  await L.settle(p, 200); await p.click('.fn-strip-b'); await L.settle(p, 150);
  await p.clock.pauseAt(await p.evaluate(() => Date.now() + 1000));
  await p.evaluate(() => {
    window.__delayedHistoryPop = false;
    window.addEventListener('popstate', () => { window.__delayedHistoryPop = true; }, { once: true });
    const back = history.back.bind(history);
    history.back = () => setTimeout(() => { scrollTo(0, 1500); back(); }, 50);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    scrollTo(0, 0);
  });
  await p.clock.runFor(50);
  // history.state can change before popstate runs. After event delivery, resume normal browser frames:
  // pumping fake frames in one clock call can finish before Chromium restores its native history scroll.
  await L.waitFor(p, () => window.__delayedHistoryPop && !history.state.lkOv, null, 5000);
  await p.clock.resume();
  await L.waitFor(p, () => scrollY === 0 && document.querySelector('.fn-strip').hidden, null, 5000).catch(() => {});
  const delayedState = await p.evaluate(() => ({ y: scrollY, hidden: document.querySelector('.fn-strip').hidden }));
  ok(delayedState.y === 0 && delayedState.hidden, 'delayed history restoration cannot overwrite a scroll made immediately after closing ' + JSON.stringify(delayedState));
  noErrors(p, 'delayed function sheet close'); await p.context().close();

  p = await L.open(b, '#/recipes', { wait: 1500 });
  await go(p, '#/waste'); await p.fill('#w-text', 'Chips'); await p.fill('#w-amt', '2');
  await p.click('[data-p="sheet"][data-v="reason"]'); await p.goBack(); await L.settle(p, 250);
  ok(!await p.$('.sheet') && await hash(p) === '#/waste' && await p.inputValue('#w-text') === 'Chips' && await p.inputValue('#w-amt') === '2', 'wastage reason: native Back closes the sheet and preserves the entry');
  await p.goBack(); await L.settle(p, 300);
  ok(await hash(p) === '#/recipes', 'wastage reason: next Back reaches the previous page');
  noErrors(p, 'wastage reason history');
  await p.context().close();

  const mail = Object.assign(L.mail(), { [key(['config', 'admins'])]: { x: 1, mailOpened: L.NOW - 11 * 3600000 } });
  p = await L.open(b, '#/', { admin: true, who: '', extra: mail, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.mlp'));
  await p.goBack(); await L.settle(p, 250);
  ok(!await p.$('.mlp') && await hash(p) === '#/', 'mail nudge: native Back closes the nudge and keeps the Kitchen Book open');
  ok(await p.evaluate(() => +localStorage.getItem('lk.mail.later') > LK_TIME.now() + 9.9 * 3600000), 'mail nudge: Back postpones it like Later');
  noErrors(p, 'mail nudge history');
  await p.context().close();
  await b.close();
  L.report(R);
})();
