// The phone's records jump lands in the existing list, with the same delivery draft and date scope.
const L = require('./lib'), { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const today = L.ymd(new Date(L.NOW)), earlier = L.ymd(new Date(L.NOW - 86400000));
const people = [
  { id: 'head', name: 'Head', role: 'head', active: true, add: true, tick: true },
  { id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true }
];
function receipt(day, supplier) {
  const receivedAt = L.NOW - 60000 - (day === earlier ? 86400000 : 0);
  return { day, supplier, receivedAt, recordedAt: receivedAt, chilled: 2.5, frozen: null, note: '', receivedBy: 'Ann', receivedById: 'ann', by: 'ann' };
}
const extra = {
  [key('config', 'main')]: { people, headId: 'head', sousIds: ['head'], staffIds: ['head', 'ann'] },
  [key('pinset', 'head')]: { at: 1 },
  [key('deliveries', 'current')]: receipt(today, 'Current produce'),
  [key('deliveries', 'past')]: receipt(earlier, 'Earlier seafood')
};
const jump = '[data-dl="records"]';
const scrollTop = p => p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
const recordsVisible = p => p.evaluate(() => {
  const heading = document.querySelector('#dl-records');
  const r = heading.getBoundingClientRect();
  const strip = document.querySelector('.fn-strip:not([hidden])'), tab = document.querySelector('.tabbar');
  const top = strip ? strip.getBoundingClientRect().bottom : 0;
  const bottom = tab && tab.getClientRects().length ? tab.getBoundingClientRect().top : innerHeight;
  return heading === document.activeElement && r.top >= top && r.bottom <= bottom;
});
async function open(b, options) {
  const p = await L.open(b, '#/deliveries', { height: 844, extra, ...options });
  await L.waitFor(p, () => !!document.querySelector('.dl-receipt'));
  return p;
}
(async () => {
  const b = await L.start();
  try {
    const p = await open(b, { who: 'ann', width: 390 });
    try {
      await p.fill('#dl-supplier', 'Mixed fixture');
      await p.click('[data-dl="mode"][data-mode="both"]');
      await p.fill('#dl-chilled', '0');
      await p.fill('#dl-frozen', '-18.5');
      await scrollTop(p);
      const traffic = await p.evaluate(() => [__fake.readLog.length, __fake.writes.length]);
      const hit = await p.$eval(jump, button => {
        const r = button.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        return { x, y, edges: [-20, 20].every(delta => button.contains(document.elementFromPoint(x, y + delta))) };
      });
      ok(hit.edges, '390 px: the heading link takes a 44 px tap without adding a form row');
      await p.mouse.click(hit.x, hit.y + 20);
      ok(await recordsVisible(p) && new URL(p.url()).hash === '#/deliveries', 'one phone tap scrolls and focuses the existing heading without changing routes');
      ok(await p.inputValue('#dl-supplier') === 'Mixed fixture' && await p.inputValue('#dl-chilled') === '0' && await p.inputValue('#dl-frozen') === '-18.5' && await p.getAttribute('[data-mode="both"]', 'aria-checked') === 'true', 'the jump keeps the supplier, Both and both exact readings');
      ok(await p.evaluate(([reads, writes]) => __fake.readLog.length === reads && __fake.writes.length === writes, traffic), 'jumping reads and writes nothing');
      await p.evaluate(([id, row]) => __fake.write(id, row), [key('deliveries', 'new'), receipt(today, 'New milk')]);
      await L.waitFor(p, () => /New milk/.test(document.querySelector('.dl-receipts')?.textContent));
      ok(await recordsVisible(p), 'a receipt arriving while reading keeps focus on the heading');
      await p.click('[data-dl="save"]');
      await L.waitFor(p, () => /Delivery saved/.test(document.querySelector('#dl-save-note')?.textContent));
      ok(await p.evaluate(() => {
        const rows = Object.values(__fake.dump()).filter(row => row?.supplier === 'Mixed fixture');
        return rows.length === 1 && rows[0].chilled === 0 && rows[0].frozen === -18.5 && rows[0].receivedById === 'ann';
      }), 'the existing Save writes the exact delivery once after the jump');
      ok(!p.errors.length && !(await L.overflow(p)), '390 px: no page errors or horizontal overflow');
    } finally { await p.context().close(); }

    const admin = await open(b, { who: 'head', admin: true, width: 390, settings: { text: 'xlarge' } });
    try {
      await admin.fill('#dl-view-day', earlier);
      await admin.dispatchEvent('#dl-view-day', 'change');
      await L.waitFor(admin, () => /Earlier seafood/.test(document.querySelector('.dl-receipts')?.textContent));
      await admin.selectOption('#dl-sup-filter', 'Earlier seafood', { force: true });
      await scrollTop(admin);
      await admin.focus(jump);
      await admin.keyboard.press('Enter');
      ok(await recordsVisible(admin) && (await admin.locator('#dl-records').textContent()) === 'Delivery records', 'Extra large: the keyboard jump focuses the selected records heading');
      ok(await admin.inputValue('#dl-view-day') === earlier && await admin.inputValue('#dl-view-to') === today && await admin.inputValue('#dl-sup-filter') === 'Earlier seafood', 'admin history preserves its exact date range and supplier filter');
    } finally { await admin.context().close(); }

    for (const width of [768, 1280]) {
      const wide = await open(b, { who: 'ann', width });
      try { ok(!(await wide.isVisible(jump)) && !await L.overflow(wide) && !wide.errors.length, width + ' px: the existing form and records fit without a duplicate jump'); }
      finally { await wide.context().close(); }
    }
  } finally { await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
