// Orders keeps request ticks at their original place on a laptop and puts one cut-off within a phone's opening fold.
const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW));
const weekday = new Date(L.NOW).getDay();
const key = (...path) => ['kitchens', L.PIN, ...path].join('/');
const suppliers = [
  { id: 'produce', name: 'Greenvale Produce', dd: [(weekday + 1) % 7], at: 15 * 60, pre: 1 },
  { id: 'pantry', name: 'Bayview Dairy', dd: [(weekday + 1) % 7], at: 16 * 60, pre: 1 },
  { id: 'tomorrow-one', name: 'Greenvale Produce', dd: [(weekday + 3) % 7], at: 18 * 60, pre: 2 },
];
const parts = p => p.evaluate(() => {
  const main = document.querySelector('.o-main');
  const areas = [...document.querySelectorAll('.o-cut-row')].filter(row => row.getClientRects().length);
  const fold = document.querySelector('.o-cut-fold');
  const dock = document.querySelector('.wk-dock');
  const tabs = document.querySelector('.tabbar')?.getBoundingClientRect();
  const bottom = Math.min(tabs?.height ? tabs.top : innerHeight,
    getComputedStyle(dock).position === 'fixed' ? dock.getBoundingClientRect().top : innerHeight);
  const rows = [...main.querySelectorAll('.nb-row')].map(row => row.getBoundingClientRect());
  const short = document.querySelector('.o-cut-more')?.getBoundingClientRect();
  return { x: fold.getBoundingClientRect().left, right: main.getBoundingClientRect().right, y: rows[0].top,
    requests: rows.filter(row => row.top >= 0 && row.bottom <= bottom).length, targets: areas.map(row => row.querySelector('button').getBoundingClientRect().height),
    suppliers: areas.map(row => row.dataset.cutRow), short: short?.height || 0 };
});
const fixture = (more = suppliers) => ({
  [key('config', 'main')]: {
    people: [{ id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true }],
    sousIds: ['sam'], cutoffs: more
  },
  [key('orders', today, 'lines', 'o3')]: { text: 'Cos lettuce', qty: '2 boxes', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 8000 },
  [key('orders', today, 'lines', 'o4')]: { text: 'Lemons', qty: '1 box', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 7000 }
});
const outer = '.o-cut-fold > summary';
const other = '.o-cut-more';

async function open(browser, width, height, options = {}) {
  const p = await L.open(browser, '#/orders', { who: 'sam', extra: fixture(), width, height, ...options });
  await p.locator('.o-cut-action:not([disabled])').first().waitFor({ state: 'attached' });
  return p;
}

(async () => {
  const b = await L.start();
  for (const [width, height] of [[390, 844], [768, 900], [1280, 800]]) {
    const p = await open(b, width, height);
    const closed = await parts(p);
    await p.click(outer);
    const cut = await parts(p);
    if (width < 1000) {
      ok(cut.suppliers.length === 1 && cut.suppliers[0].startsWith('produce|') && cut.short >= 44, width + ': one named next supplier and a full-size Other cut-offs control');
      await p.click(other);
      ok((await parts(p)).suppliers.length === 3, width + ': Other cut-offs shows today and tomorrow, including the same-named supplier');
      await p.click(other);
    } else {
      ok(cut.x >= cut.right && cut.y === closed.y && cut.requests === 4 && cut.requests === closed.requests, 'desktop: the rail keeps all four requests visible in their original position');
      ok(cut.suppliers.length === 3 && cut.short === 0, 'desktop: all cut-offs and reminder settings are available through the main fold');
    }
    ok(cut.targets.every(h => h >= 44) && !(await L.overflow(p)), width + ': named actions fit at 44 px or more');
    await p.click(outer);
    ok(await p.locator('.o-main .nb-box').count() === 4 && (await parts(p)).y === closed.y,
      width + ': closing restores the original four tickboxes and the same starting position');
    ok(p.errors.length === 0, width + ': no script errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // The named action remains focused within Other cut-offs during pending and acknowledged paints.
  const p = await open(b, 390, 844);
  await p.click(outer);
  await p.click(other);
  const record = key('cutdone', today + '_pantry');
  const pantry = '.o-cut-rest [data-p="cut-tick"][data-id^="pantry|"]';
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await p.click(pantry);
  await L.waitFor(p, () => !!document.querySelector('.o-cut-rest .o-cut-row.is-pending'), null, 7000);
  ok(await p.$eval(other, el => el.getAttribute('aria-expanded')) === 'true' &&
    await p.$eval(pantry, el => el === document.activeElement),
    'the held confirmation keeps the disclosure and the same supplier action focused');
  ok(await p.locator('.o-cut-rest .is-pending .cut-st').textContent() === 'Not sent' && !(await p.locator('.p-toast').filter({ hasText: 'No quantities recorded' }).count()),
    'held confirmation reports Not sent while successful Undo waits for acknowledgement');
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  const slip = p.locator('.p-toast').filter({ hasText: 'Bayview Dairy' });
  await slip.waitFor();
  ok(await p.evaluate(k => window.__fake.writes.flat().filter(x => x.path === k).length, record) === 1 &&
    await p.$eval('.o-main .nb-box', el => el.getAttribute('aria-pressed')) === 'false',
    'acknowledgement writes one reminder without marking any request ordered');
  await slip.getByRole('button', { name: 'Undo' }).click();
  await L.waitFor(p, k => window.__fake.dump()[k]?.on === false, record, 7000);
  await p.setViewportSize({ width: 1280, height: 800 });
  ok((await parts(p)).suppliers.length === 3 && await p.locator(other).isHidden(), 'resizing the open fold shows all rows in the desktop rail');
  await p.setViewportSize({ width: 390, height: 844 });
  ok((await parts(p)).suppliers.length === 3 && await p.$eval(other, el => el.getAttribute('aria-expanded')) === 'true', 'resizing back restores the open mobile choice');
  await p.context().close();

  const long = 'Greenvale Fruit and Vegetable Supplier';
  const small = await open(b, 320, 844, {
    settings: { text: 'xlarge' }, extra: fixture([
      { ...suppliers[2], name: long },
      { ...suppliers[2], id: 'tomorrow-two', name: 'Long standing bakery supplier', at: 19 * 60 }
    ])
  });
  await small.click(outer);
  const compact = await parts(small);
  ok(compact.suppliers.length === 1 && compact.suppliers[0].startsWith('tomorrow-one|'), 'tomorrow-only cut-offs show the correct featured occurrence');
  const narrow = await small.evaluate(() => ({
    width: document.documentElement.scrollWidth, screen: innerWidth,
    overflow: [...document.querySelectorAll('body *')].filter(e => e.getClientRects().length && e.getBoundingClientRect().right > innerWidth + 1).slice(0, 6).map(e => String(e.className))
  }));
  ok(await small.locator('.o-cut-row .cut-n').filter({ hasText: long }).first().isVisible() && compact.short >= 44 && !(await L.overflow(small)),
    '320 px Extra large: the long supplier and disclosure fit without horizontal overflow (' + JSON.stringify(narrow) + ')');
  await small.click(other);
  ok((await parts(small)).suppliers.length === 2, 'other tomorrow-only suppliers remain accessible');
  ok(small.errors.length === 0, 'narrow tomorrow fixture: no script errors ' + small.errors.join(' | '));
  await small.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
