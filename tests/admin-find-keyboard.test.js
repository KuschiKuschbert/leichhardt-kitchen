// Find and On this page share the owner and chef panel. The fixtures use only synthetic kitchen data.
const L = require('./lib');
const { R, ok } = L.results();
const find = p => p.locator('.a-find:visible');
const active = (p, selector) => p.evaluate(selector => document.activeElement.matches(selector), selector);
const input = '#fd-q';

async function openFind(p, key) {
  await p.keyboard.press(key);
  await L.waitFor(p, () => document.activeElement.id === 'fd-q');
}

async function closed(p) {
  await L.waitFor(p, () => !document.querySelector('#fd-sheet, #aj-sheet') && !history.state?.lkOv);
  await L.settle(p, 260);
}

async function owner(b, width, text) {
  const p = await L.open(b, '#/admin', { admin: true, who: '', width, height: width < 720 ? 844 : 900, touch: width < 720, settings: { text } });
  const label = width + ' ' + text + ': ';
  try {
    await L.adminTab(p, 'tools');
    await L.waitFor(p, () => !!document.querySelector('#a-newpin'));
    await find(p).focus();
    await openFind(p, 'Enter');
    await p.keyboard.press('Escape');
    await closed(p);
    ok(await active(p, '.a-find'), label + 'Enter and Escape return to the Find button');

    await find(p).focus();
    const focusAfterClock = await p.evaluate(() => {
      const before = document.activeElement;
      window.dispatchEvent(new Event('lk-clock'));
      return !before.isConnected && document.activeElement.matches('.a-find');
    });
    ok(focusAfterClock, label + 'a scheduled panel refresh keeps focus on the visible Find button');

    await p.evaluate(() => document.activeElement.blur());
    await openFind(p, '/');
    await p.keyboard.press('Escape');
    await closed(p);
    ok(await active(p, '.a-find'), label + 'slash and Escape use the rendered Find as the fallback');

    const tools = '[data-p="a-tab"][data-t="tools"]';
    await p.locator(tools).focus();
    await openFind(p, '/');
    await p.goBack();
    await closed(p);
    ok(await active(p, tools) && await p.evaluate(() => location.hash) === '#/admin', label + 'native Back closes Find and returns to the prior keyboard control');

    await find(p).click();
    await p.fill(input, 'kitchen pin');
    await p.keyboard.press('Enter');
    await closed(p);
    ok(await p.evaluate(() => document.activeElement.textContent.trim() === 'Kitchen PIN' && document.activeElement.tabIndex === -1), label + 'Enter focuses the section label without adding a Tab stop');
    const visible = await p.evaluate(() => {
      const heading = [...document.querySelectorAll('.a-pane .set-block > .label')].find(e => e.textContent === 'Kitchen PIN');
      const nav = document.querySelector('.a-nav');
      const edge = innerWidth < 1000 ? nav.getBoundingClientRect().bottom : 0;
      const box = heading.getBoundingClientRect();
      return box.top >= edge - 1 && box.bottom < innerHeight;
    });
    ok(visible, label + 'the section label is visible past the sticky nav');
    await p.keyboard.press('Tab');
    ok(await active(p, '#a-newpin'), label + 'the next Tab goes to the first field in that section');
    await p.locator('#a-newpin').focus();
    await p.keyboard.press('/');
    ok(await active(p, '#a-newpin') && !(await p.locator(input).count()), label + 'slash leaves a field alone while typing');

    if (width === 390) {
      const picker = p.locator('.a-jumpbtn:visible');
      await picker.click();
      await p.locator('#aj-sheet [data-aj="go"]').filter({ hasText: 'Kitchen PIN' }).tap();
      await closed(p);
      ok(await p.evaluate(() => document.activeElement.textContent.trim() === 'Kitchen PIN' && document.activeElement.tabIndex === -1), label + 'the phone section picker also moves focus on click');
      await picker.click();
      await p.keyboard.press('Escape');
      await closed(p);
      ok(await active(p, '.a-jumpbtn'), label + 'Escape returns to On this page');
    }

    await find(p).click();
    await p.fill(input, 'people');
    await p.keyboard.press('Enter');
    await closed(p);
    ok(await active(p, '#rtitle') && await p.evaluate(() => LK_PREP.state.atab === 'people'), label + 'a page result still moves focus to the page heading');
    ok(!p.errors.length, label + 'no browser errors');
  } finally { await p.context().close(); }
}

async function chef(b) {
  const p = await L.open(b, '#/chef', { who: 'sam', width: 1280, height: 900 });
  try {
    await L.waitFor(p, () => !!document.querySelector('.a-find-head'));
    await find(p).focus();
    await openFind(p, '/');
    await p.setViewportSize({ width: 768, height: 900 });
    await p.keyboard.press('Escape');
    await closed(p);
    ok(await active(p, '.a-find-head'), 'Chef: dismissal after the layout changes focuses the visible Find button');
    await find(p).click();
    await p.fill(input, 'run the shift');
    await p.keyboard.press('Enter');
    await closed(p);
    ok(await p.evaluate(() => document.activeElement.textContent.trim() === 'Run the shift' && location.hash === '#/chef'), 'Chef: selecting a section focuses its heading inside the panel');
    await p.keyboard.press('Tab');
    // the section's first button: Set today's team while no team is saved (head chef, 27 Nov 2026, step 4), else Chef to-do
    ok(await p.evaluate(() => { const a = document.activeElement, sec = a && a.closest('.a-pane .set-block'), first = sec && sec.querySelector('.btn-row [data-p="c-tab"]');
      return !!first && a === first && /Run the shift/.test(sec.querySelector('h3').textContent); }), 'Chef: Tab stays at the selected section');
    await p.locator('.wtop-who').click();
    await p.keyboard.press('/');
    ok(await p.locator('.wm').isVisible() && !(await p.locator(input).count()), 'Chef: slash leaves the chef menu open');
    await p.keyboard.press('Escape');
    ok(!p.errors.length, 'Chef: no browser errors');
  } finally { await p.context().close(); }
}

(async () => {
  const b = await L.start();
  try {
    for (const [width, text] of [[390, 'normal'], [768, 'normal'], [1280, 'normal'], [390, 'xlarge']]) await owner(b, width, text);
    await chef(b);
  } finally { await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
