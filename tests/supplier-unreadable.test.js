// One supplier record the book cannot read (5 Nov 2026, the head chef's laptop: "Could not finish. Check the connection
// and try again"). Every saved supplier is checked when Supplier order opens, and one that failed the check stopped the
// whole page with the connection message, which Try again could never fix. Now the other suppliers open as usual and a
// short card names the one that could not be read and the item, and Orders keeps its independent request list.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok, } = L.results(), { txt } = L;
const broken = (extra) => {
  const good = { id: 'b-ok', name: 'TEST GOOD ITEM', pack: '1 kg', group: 'Test', category: 'TEST', par: '1', parUnit: '', orderUnit: '', factor: 0, aliases: [], archived: false, manual: false, source: { file: 'synthetic.pdf', page: 1, row: 1, name: 'TEST GOOD ITEM', par: '1' } };
  // the source page is 0: the book cannot tell where the item came from, so the check refuses it
  const bad = Object.assign({}, good, { id: 'b-bad', name: 'TEST BROKEN ITEM', source: { file: 'synthetic.pdf', page: 0, row: 2, name: 'TEST BROKEN ITEM', par: '1' } });
  return F.fixture(Object.assign({ [F.key(['suppliers', 'broken'])]: { name: 'Broken Test Supplies', cutoffId: '', v: 1, items: [good, bad], at: L.NOW - 86400000, by: 'owner' } }, extra || {}));
};
async function opened(p) {
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"], .su-error, .su-unread, .empty'), null, 15000).catch(() => {});
  await L.settle(p, 300);
}
(async () => {
  const b = await L.start();

  for (const width of [390, 1280]) {
    const p = await L.open(b, '#/suppliers', { who: 'bo', extra: broken(), width, height: 900, wait: 1800 });
    await opened(p);
    const page = (await txt(p, 'main') || '').replace(/\s+/g, ' ');
    ok(!/Could not finish/.test(page) && !!(await p.$('input[data-sf="qty"]')), width + ' px: the other suppliers open as usual (' + page.slice(0, 140) + ')');
    const card = (await txt(p, '.su-unread') || '').replace(/\s+/g, ' ');
    ok(/Broken Test Supplies/.test(card) && /TEST BROKEN ITEM/.test(card) && /item 2/.test(card), width + ' px: a card names the supplier and the item that could not be read (' + card + ')');
    ok(/other suppliers/i.test(card) && /Nothing was changed/.test(card), width + ' px: the card says the rest work and nothing was changed');
    const names = await p.$$eval('select[data-sf="supplier"] option', o => o.map(x => x.textContent));
    ok(names.some(n => /Northside/.test(n)) && names.some(n => /West Bay/.test(n)) && !names.some(n => /Broken/.test(n)), width + ' px: the supplier picker lists the readable suppliers (' + names.join(', ') + ')');
    ok(p.errors.length === 0 && !(await L.overflow(p)), width + ' px: no page errors, no sideways scroll ' + p.errors.join(' | '));
    await p.context().close();
  }

  // Orders does not read the supplier catalogue, so an unreadable record cannot affect requests or cut-offs.
  let p = await L.open(b, '#/orders', { who: 'sam', extra: broken(), wait: 1600 });
  await L.waitFor(p, () => !!document.querySelector('.o-cut-fold'), null, 10000);
  ok(!(await p.$('.o-sups')) && !!(await p.$('.o-cut-fold .cut-tl')), 'Orders keeps cut-offs separate from requests');
  ok(await p.evaluate(() => !(window.__fake.reads || []).some(k => /\/suppliers(?:\/|$)/.test(k))), 'Orders reads no supplier catalogue, including unreadable records');
  ok(p.errors.length === 0, 'order list: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // only an unreadable record: the card, not "No supplier catalogue yet" and an import offer
  const only = broken();
  Object.keys(only).filter(k => /\/suppliers\/(northside|west-bay)(\/|$)/.test(k)).forEach(k => delete only[k]);
  p = await L.open(b, '#/suppliers', { who: 'bo', extra: only, wait: 1800 });
  await opened(p);
  const page = (await txt(p, 'main') || '').replace(/\s+/g, ' ');
  ok(/Broken Test Supplies/.test(await txt(p, '.su-unread') || '') && !/No supplier catalogue yet/.test(page) && !/Could not finish/.test(page), 'only an unreadable record: the card says so, with no empty-catalogue page (' + page.slice(0, 140) + ')');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
