const path = require('node:path');
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results();

const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const day = L.ymd(new Date(L.NOW));
const at = time => M.kat(day, M.hmMin(time));
const bookingKey = key('functions', 'riverbend');
const booking = M.derive({
  v: 1, status: 'confirmed', name: 'Riverbend community dinner', date: day,
  start: at('18:00'), loc: 'Marquee', guests: 40, mode: 'all',
  rounds: [{ at: at('18:30'), note: '' }],
  lines: [{ rid: 'pizza-platter', name: 'Pizza Platter', unit: 'platter', qty: 3, u: M.toU([3]) }],
  by: 'sam', upd: L.NOW - 3600000, cBy: 'sam', cAt: L.NOW - 86400000, confBy: 'sam', confAt: L.NOW - 86400000
});
const guideData = { ...L.guides(), [key('tutorials', 'staff')]: { links: { prep: { w: 'AAAAAAAAAAA', t: 'BBBBBBBBBBB' } }, at: L.NOW, by: 'sam' } };
const screenshotDir = process.env.FOCUS_SHOTS;

async function shot(page, file) {
  if (screenshotDir) await page.screenshot({ path: path.join(screenshotDir, file + '.png'), animations: 'disabled' });
}
const focusIs = (page, selector) => page.evaluate(s => document.activeElement?.matches(s), selector);
const focusInside = (page, selector) => page.evaluate(s => !!document.activeElement?.closest(s), selector);
const returned = (page, selector, hash) => page.evaluate(([s, h]) => document.activeElement?.matches(s) && location.hash === h, [selector, hash]);
async function keyboardOpen(page, selector, dialog) {
  await page.locator(selector).focus();
  await page.keyboard.press('Enter');
  await page.locator(dialog).waitFor();
}
async function closed(page, selector) {
  await page.locator(selector).waitFor({ state: 'detached' });
  await L.waitFor(page, () => !history.state?.lkOv);
}

async function functionSheet(browser, width, height) {
  const route = '#/fn', panel = '.fn-sheet', opener = '#fn-band [data-fn="open"][data-id="riverbend"]';
  const page = await L.open(browser, route, { who: 'ann', width, height, touch: width < 1280, extra: { [bookingKey]: booking }, clock: at('18:20') });
  await keyboardOpen(page, opener, panel);
  ok(await focusIs(page, panel), `${width}: function sheet starts on its named panel`);
  await page.keyboard.press('Shift+Tab');
  ok(await focusIs(page, '.fn-sheet [href="#/fn/riverbend"]'), `${width}: reverse from panel stays on the last booking action`);
  await shot(page, `function-${width}-reverse`);
  const close = '.fn-sheet [data-fn="close"]';
  const full = '.fn-sheet [href="#/fn/riverbend"]';
  await page.locator(full).focus();
  await page.keyboard.press('Tab');
  ok(await focusIs(page, close), `${width}: Tab wraps to booking Close`);
  const print = '.fn-sheet [data-fn="print"]';
  for (let i = 0; i < 8 && !await focusIs(page, print); i++) await page.keyboard.press('Tab');
  ok(await focusIs(page, print), `${width}: booking Print remains reachable`);
  await page.evaluate(([key, record]) => window.__fake.write(key, record), [bookingKey, { ...booking, v: 2, name: 'Riverbend community dinner revised', notes: 'Set one plate aside.', upd: at('18:20') }]);
  await page.getByText('Set one plate aside.', { exact: true }).first().waitFor();
  ok(await focusIs(page, print), `${width}: live redraw retains the focused booking action`);
  ok((await page.locator('#fn-sh-h').textContent()).includes('revised'), `${width}: live redraw keeps the visible booking title current`);
  await page.keyboard.press('Escape');
  await closed(page, panel);
  ok(await returned(page, opener, route), `${width}: Escape returns to the rebuilt Functions band button`);
  await keyboardOpen(page, opener, panel);
  await page.goBack();
  await closed(page, panel);
  ok(await returned(page, opener, route), `${width}: browser Back closes only the function sheet`);
  await keyboardOpen(page, opener, panel);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await closed(page, panel);
  ok(await returned(page, opener, route), `${width}: keyboard Close returns to the Functions band`);
  ok(page.errors.length === 0, `${width}: function sheet has no browser errors`);
  await page.context().close();
}

async function pinnedFunctionSheet(browser) {
  const tomorrow = M.addDays(day, 1);
  const next = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [key('functions', 'next-' + i), M.derive({
    ...booking, date: tomorrow, name: 'Next function ' + (i + 1), start: M.kat(tomorrow, M.hmMin('18:00')),
    rounds: [{ at: M.kat(tomorrow, M.hmMin('18:30')), note: '' }]
  })]));
  const route = '#/fn', panel = '.fn-sheet', close = '.fn-sheet [data-fn="close"]';
  const opener = 'body > .fn-strip [data-fn="open"][data-id="riverbend"]';
  const page = await L.open(browser, route, { who: 'ann', width: 390, touch: true, clock: at('18:20'), extra: { ...next, [bookingKey]: booking } });
  await page.locator('a[href="#/fn/next-19"]').waitFor();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await keyboardOpen(page, opener, panel);
  await page.keyboard.press('Shift+Tab');
  ok(await focusInside(page, panel), 'pinned band: reverse focus stays on the booking sheet');
  await page.evaluate(sel => {
    window.LK_UX.AdaptivePicker({ label: 'Test choices', trigger: document.querySelector(sel),
      items: [{ value: 'one', label: 'First choice' }, { value: 'two', label: 'Second choice' }] });
  }, close);
  await page.locator('dialog.ux-picker[open]').waitFor();
  await page.keyboard.press('Shift+Tab');
  ok(await focusInside(page, 'dialog.ux-picker[open]'), 'pinned band: nested picker keeps the keyboard while on top');
  await page.keyboard.press('Escape');
  await page.locator('dialog.ux-picker').waitFor({ state: 'detached' });
  await L.waitFor(page, () => history.state?.lkOv === 'fn');
  ok(await focusIs(page, close), 'pinned band: closing the nested picker returns to the booking sheet');
  await page.keyboard.press('Escape');
  await closed(page, panel);
  ok(await returned(page, opener, route), 'pinned band: Escape returns to the now-visible pinned trigger');
  await keyboardOpen(page, opener, panel);
  const { x, y, width } = await page.locator('.fn-grip').boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, dy) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: x + width / 2, y: y + 5 + dy, id: 1 }] });
  await touch('touchStart', 0);
  for (let dy = 15; dy <= 105; dy += 15) await touch('touchMove', dy);
  await touch('touchEnd', 0);
  await cdp.detach();
  await closed(page, panel);
  ok(await returned(page, opener, route), 'pinned band: swiping the grip closes the sheet and restores keyboard focus');
  await page.context().close();
}

async function guideVideo(browser, width, height) {
  const route = '#/guides/v-prep', panel = '.gv-wrap', play = '.g-vplay', close = '.gv-wrap [data-gv="close"]';
  const page = await L.open(browser, route, { who: 'ann', width, height, touch: width < 1280, extra: guideData });
  await page.context().route(/^https:\/\/www\.youtube-nocookie\.com\//, route => route.fulfill({ status: 200, contentType: 'text/html',
    body: '<!doctype html><title>Video fixture</title><button type="button">Player control one</button> <button type="button">Player control two</button>' }));
  await keyboardOpen(page, play, panel);
  const frame = page.frameLocator('.gv-wrap iframe');
  const player = name => frame.getByRole('button', { name: 'Player control ' + name });
  const playerFocused = name => player(name).evaluate(el => el.ownerDocument.activeElement === el);
  await player('one').waitFor();
  ok(await focusIs(page, close), `${width}: guide video starts on Close`);
  await page.keyboard.press('Shift+Tab');
  ok(await playerFocused('two'), `${width}: reverse from Close reaches the last player control`);
  await shot(page, `guide-${width}-reverse`);
  await page.locator(close).focus();
  await page.keyboard.press('Tab');
  ok(await playerFocused('one'), `${width}: Tab enters the cross-origin player`);
  await page.keyboard.press('Tab');
  ok(await playerFocused('two'), `${width}: the second player control is reachable`);
  await page.keyboard.press('Tab');
  ok(await focusIs(page, close), `${width}: Tab from the last cross-origin player control wraps to Close`);
  await shot(page, `guide-${width}-forward`);
  await player('one').focus();
  await page.keyboard.press('Shift+Tab');
  ok(await focusIs(page, close), `${width}: reverse from the first player control returns to Close`);
  await page.locator(close).focus();
  await page.keyboard.press('Escape');
  await closed(page, panel);
  ok(await returned(page, play, route), `${width}: Escape returns to Play on the same guide`);
  await keyboardOpen(page, play, panel);
  await page.goBack();
  await closed(page, panel);
  ok(await returned(page, play, route), `${width}: browser Back closes only the video and restores Play`);
  await keyboardOpen(page, play, panel);
  await page.keyboard.press('Enter');
  await closed(page, panel);
  ok(await returned(page, play, route), `${width}: keyboard Close returns to Play`);
  ok(page.errors.length === 0, `${width}: guide video has no browser errors${page.errors.length ? ' (' + page.errors.join(' | ') + ')' : ''}`);
  await page.context().close();
}

(async () => {
  const browser = await L.start();
  try {
    for (const [width, height] of [[390, 844], [768, 900], [1280, 800]]) {
      await functionSheet(browser, width, height);
      await guideVideo(browser, width, height);
    }
    await pinnedFunctionSheet(browser);
    L.report(R);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
