// Real touch input on the existing pages, with synthetic kitchen data only.
const L = require('./lib');
const { R, ok } = L.results();
const hash = p => p.evaluate(() => location.hash);
async function go(p, h) {
  await p.evaluate(v => { location.hash = v; }, h);
  await L.settle(p, 600);
  await p.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
  await L.settle(p, 200);
}
async function swipe(p, selector, dx, dy = 0, opt = {}) {
  await L.settle(p, 300);
  const r = await p.locator(selector).first().boundingBox();
  if (!r) throw new Error('Missing touch target: ' + selector);
  const x = opt.x == null ? r.x + r.width * (dx < 0 ? .7 : .3) : opt.x;
  const y = r.y + Math.min(r.height / 2, 20);
  if (opt.mouse) {
    await p.mouse.move(x, y); await p.mouse.down();
    await p.mouse.move(x + dx, y + dy, { steps: 8 }); await p.mouse.up();
  } else {
    const c = await p.context().newCDPSession(p);
    const points = (xx, yy) => [{ x: xx, y: yy, id: 1, radiusX: 4, radiusY: 4, force: 1 }];
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(x, y) });
    for (let i = 1; i <= 8; i++) {
      const pts = points(x + dx * i / 8, y + dy * i / 8);
      if (opt.multi && i >= 3) pts.push({ ...pts[0], id: 2, x: pts[0].x + 25 });
      await c.send('Input.dispatchTouchEvent', { type: opt.multi && i === 3 ? 'touchStart' : 'touchMove', touchPoints: pts });
    }
    if (opt.beforeEnd) await opt.beforeEnd();
    await c.send('Input.dispatchTouchEvent', { type: opt.cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    await c.detach();
  }
  await L.settle(p, 400);
}
async function metrics(p) {
  return p.evaluate(() => {
    const bar = document.querySelector('.tabbar').getBoundingClientRect();
    const bottom = bar.height ? bar.top : innerHeight;
    return { header: document.querySelector('.wtop').getBoundingClientRect().height,
      rows: [...document.querySelectorAll('[id^="nbr-"]')].filter(el => {
        const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= bottom;
      }).length };
  });
}
async function fixedFrame(p) {
  return p.evaluate(() => ['.wtop', '.tabbar', '.wk-dock'].map(s => {
    const el = document.querySelector(s);
    // Above the phone breakpoint Add is part of the page, so it should move with that page.
    if (s === '.wk-dock' && getComputedStyle(el).position !== 'fixed') return null;
    const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height };
  }));
}
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/prep', { width, touch: true, wait: 1400 });
    const before = await metrics(p);
    if (width === 390) ok(before.header === 64 && before.rows === 5, '390: existing 64 px header and five complete prep rows stay visible');
    const writes = await p.evaluate(() => __fake.writes.length);
    const frame = await fixedFrame(p);
    await swipe(p, '#nbr-i3', -110, 0, { beforeEnd: async () => {
      ok(await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.page')).left) < -20), width + ': page follows the finger before release');
      ok(JSON.stringify(await fixedFrame(p)) === JSON.stringify(frame), width + ': header, tabs and fixed Add dock stay anchored during the swipe');
    } });
    ok(await hash(p) === '#/orders', width + ': a left swipe over a real prep row opens Orders');
    await go(p, '#/orders'); await swipe(p, '#rtitle', 110);
    ok(await hash(p) === '#/prep', width + ': a right swipe returns to the previous main tab');
    await go(p, '#/prep');
    ok(JSON.stringify(await metrics(p)) === JSON.stringify(before), width + ': navigation adds no header height or lost rows');
    await swipe(p, '#nbr-i3', -110);
    await p.goBack(); await L.settle(p, 400);
    ok(await hash(p) === '#/prep', width + ': browser Back returns after one swipe');
    await go(p, '#/orders'); await swipe(p, '#rtitle', -110);
    ok(await hash(p) === '#/waste', width + ': Orders swipes left to Wastage');
    await go(p, '#/waste'); await swipe(p, '#rtitle', -110);
    ok(await hash(p) === '#/transfers', width + ': Wastage swipes left to Transfers');
    await go(p, '#/transfers'); await swipe(p, '#rtitle', -110);
    ok(await hash(p) === '#/cleaning', width + ': Transfers swipes left to permitted Cleaning');
    await go(p, '#/recipes'); await swipe(p, '.group-head', 100);
    ok(await hash(p) === '#/recipes', width + ': first tab does not wrap to the last');
    ok(await p.evaluate(n => __fake.writes.length === n, writes), width + ': swipes do not save or tick a line');
    ok(!(await L.overflow(p)) && !p.errors.length, width + ': no overflow or browser errors ' + p.errors.join('|'));
    await p.context().close();
  }
  const p = await L.open(b, '#/prep', { touch: true, wait: 1400 });
  for (const [name, dx, dy, opt] of [
    ['short', -40, 0, {}], ['vertical', 10, -120, {}], ['diagonal', -90, 90, {}],
    ['cancelled', -110, 0, { cancel: true }], ['two fingers', -110, 0, { multi: true }],
    ['mouse selection', -110, 0, { mouse: true }], ['screen edge', 110, 0, { x: 8 }]
  ]) {
    await go(p, '#/prep'); await swipe(p, '#rtitle', dx, dy, opt);
    ok(await hash(p) === '#/prep', name + ': stays on the current tab');
  }
  await go(p, '#/prep');
  await swipe(p, '#rtitle', -110, 0, { beforeEnd: () => p.evaluate(() => { location.hash = '#/waste'; }) });
  ok(await hash(p) === '#/waste', 'a route change during a gesture cancels the old destination');
  await go(p, '#/prep'); await p.click('.nb-addline'); await L.settle(p, 250);
  await p.fill('#p-text', 'Keep this swipe draft'); await p.locator('#p-text').blur();
  await swipe(p, '.p-sheet h3', -110);
  ok(await hash(p) === '#/prep' && await p.inputValue('#p-text') === 'Keep this swipe draft', 'open Add sheet keeps its page and unsaved text');
  await p.keyboard.press('Escape'); await L.settle(p, 250);
  await swipe(p, '#rtitle', -110); await go(p, '#/prep');
  ok(await p.evaluate(() => LK_PREP.state.text === 'Keep this swipe draft'), 'a main-tab round trip keeps the existing prep draft');
  await p.click('.nb-addline'); await L.settle(p, 200);
  ok(await p.locator('#p-text').isVisible(), 'Add a prep line remains one tap from its page');
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  await p.click('.wtop-who'); await L.settle(p, 250); await swipe(p, '.wm-me', -110);
  ok(await hash(p) === '#/prep' && !!(await p.$('.wm-wrap')), 'chef menu owns its gestures');
  await p.keyboard.press('Escape'); await L.settle(p, 250);
  await p.evaluate(() => { document.querySelector('#rtitle').insertAdjacentHTML('afterend', '<div id="swipe-scroll" style="width:250px;overflow-x:auto"><div style="width:900px;height:50px">Scrollable content</div></div>'); });
  await swipe(p, '#swipe-scroll', -100);
  ok(await hash(p) === '#/prep' && await p.locator('#swipe-scroll').evaluate(el => el.scrollLeft > 0), 'horizontal scroller moves its content without changing pages');
  await go(p, '#/recipes'); await p.fill('#find', 'burger');
  await swipe(p, '.group-head', -110);
  ok(await hash(p) === '#/recipes' && await p.inputValue('#find') === 'burger', 'focused search field keeps typing on its page');
  await p.locator('#find').blur(); await p.fill('#find', ''); await p.locator('#find').blur(); await L.settle(p, 300);
  await swipe(p, '.group-head', -110);
  ok(await hash(p) === '#/prep', 'Recipes can swipe to Prep after search loses focus');
  await go(p, '#/r/burger'); await swipe(p, '#rtitle', -110);
  ok(await hash(p) === '#/r/burger', 'a recipe detail keeps its own contextual navigation');
  await go(p, '#/prep');
  await p.evaluate(() => { window.swipeSendFirst = LK_PREP.sendFirst; LK_PREP.sendFirst = () => true; });
  await swipe(p, '#rtitle', -110);
  ok(await hash(p) === '#/prep', 'unsettled writes block gesture navigation');
  await p.evaluate(() => { LK_PREP.sendFirst = window.swipeSendFirst; });
  await p.emulateMedia({ reducedMotion: 'reduce' }); await swipe(p, '#rtitle', -110, 0, { beforeEnd: async () => {
    ok(await p.locator('.page-swipe-surface').count() === 0, 'reduced motion removes finger-follow movement');
  } });
  ok(await hash(p) === '#/orders', 'reduced motion still changes tabs');
  ok(!p.errors.length, 'guard cases have no browser errors ' + p.errors.join('|'));
  await p.context().close();
  const cfg = L.seed()['kitchens/' + L.PIN + '/config/main']; cfg.staffSee.cleaning = false;
  const hidden = await L.open(b, '#/transfers', { who: 'ann', touch: true, extra: { ['kitchens/' + L.PIN + '/config/main']: cfg }, wait: 1400 });
  await swipe(hidden, '#rtitle', -110);
  ok(await hash(hidden) === '#/transfers', 'hidden Cleaning is not a swipe destination and last tab does not wrap');
  await hidden.context().close();
  const locked = await L.open(b, '#/recipes', { touch: true, dailyLocked: true, wait: 1200 });
  await swipe(locked, '.group-head', -110);
  ok(await hash(locked) === '#/recipes', 'locked device cannot swipe into a private page');
  await locked.context().close();
  const cards = await L.open(b, '#/recipes', { touch: true, settings: { view: 'tiles' }, wait: 1200 });
  await swipe(cards, '.tile', -100);
  ok(await hash(cards) === '#/prep', 'swiping over a recipe card changes tab without opening the card');
  await go(cards, '#/recipes');
  const cardHash = await cards.locator('.tile').first().getAttribute('href');
  await cards.locator('.tile').first().tap(); await L.settle(cards, 350);
  ok(await hash(cards) === cardHash, 'an ordinary tap still opens the recipe card');
  await cards.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
