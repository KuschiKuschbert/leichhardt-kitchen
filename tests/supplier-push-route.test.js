// Push links accept only the configured cut-off ID and calendar date. Older notifications keep the Order list.
// A cut-off with no catalogue supplier, or more than one, opens a short card with Order done and the Order list,
// never another supplier's sheet (27 Oct 2026). The bar, the tick list and a push all open the same route.
const fs = require('fs'), vm = require('vm'), path = require('path');
const L = require('./lib'), F = require('./supplier-fixtures'), { R, ok } = L.results();
const events = {}, shown = [], opened = [], scope = 'https://example.test/kitchen/';
const self = { addEventListener: (n, f) => { events[n] = f; }, registration: { scope, showNotification: async (title, options) => { shown.push({ title, options }); } },
  clients: { matchAll: async () => [], openWindow: async u => { opened.push(u); } } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'), { self, URL, setTimeout, caches: {} });
async function event(n, fields) { let pending; events[n](Object.assign({ waitUntil: p => { pending = p; } }, fields)); await pending; }
// the route a tapped push opens in the book, from the worker itself
async function pushHash(sid, day) {
  await event('push', { data: { json: () => ({ data: { title: 'Order now', sid, day } }) } });
  await event('notificationclick', { notification: { close() {}, data: shown[shown.length - 1].options.data } });
  return opened.pop().slice(scope.length);
}
// the shared fixture plus Valley Veg: a cut-off today with no catalogue supplier (a supported state)
function withVeg(at) {
  const seed = F.fixture(), cfg = seed[F.key(['config', 'main'])];
  cfg.cutoffs = cfg.cutoffs.concat([{ id: 'veg', name: 'Valley Veg', dd: cfg.cutoffs[0].dd, at: at || 15 * 60, pre: 1, lead: 240 }]);
  return seed;
}
const veg = F.key(['cutdone', F.today + '_veg']);
const card = '#supplier-root .su-cut-card';
const cardDone = '#supplier-root .su-cut-card [data-cut="done"]';
const rootText = p => p.evaluate(() => (document.querySelector('#supplier-root') || {}).textContent || '');
const historyReads = p => p.evaluate(() => (window.__fake.reads || []).filter(k => /\/suppliers\/[^/]+\/orders/.test(k)));
const undo = p => p.getByRole('button', { name: 'Undo', exact: true });
// the page answered either way: the card (this fix) or an order sheet (another supplier's, before it)
async function opens(p) { await L.waitFor(p, () => !!document.querySelector('#supplier-root .su-cut-card, #supplier-root input[data-sf="qty"]'), null, 15000); }
async function saved(p, on) { await L.waitFor(p, ([k, v]) => { const d = window.__fake.dump()[k]; return !!d && d.on === v; }, [veg, on], 10000); }
// no order sheet for any supplier, and nothing made up for this cut-off
async function noSheet(p, label) {
  const text = await rootText(p);
  ok(!(await p.$('#supplier-root input[data-sf="qty"]')) && !text.includes('Northside Test Foods') && !text.includes('West Bay Test Supply') && !/Selected order cut-off/.test(text), label + ': no other supplier\'s sheet opens');
  ok(!(await p.$('[data-su="review"]')) && !(await p.$('[data-su="record"]')), label + ': nothing to review or record against another supplier');
  ok((await historyReads(p)).length === 0, label + ': no other supplier\'s order history is read');
}

(async () => {
  await event('push', { data: { json: () => ({ data: { title: 'Order now', sid: 'northside', day: '2026-10-24', url: 'https://bad.test' } }) } });
  ok(shown[0].options.data.sid === 'northside', 'push retains only the safe supplier context');
  await event('notificationclick', { notification: { close() {}, data: shown[0].options.data } });
  ok(opened.pop() === scope + '#/suppliers/cutoff/northside/2026-10-24', 'valid push opens the matching supplier and occurrence');
  for (const data of [{}, { sid: '../outside', day: '2026-10-24' }, { sid: 'northside', day: '../../' }, { url: 'https://bad.test' }]) {
    await event('notificationclick', { notification: { close() {}, data } });
    ok(opened.pop() === scope + '#/orders', 'old or invalid push opens only the fixed Order list');
  }

  const b = await L.start();
  let p, text;

  // Unlinked route from the bar, sous chef on a phone: the card, its Order done (the bar's own action) and Undo.
  p = await L.open(b, '#/', { who: 'sam', extra: withVeg(), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('#cut-band a.cut-n[href*="/veg/"]'), null, 10000);
  await p.click('#cut-band a.cut-n[href*="/veg/"]');
  await L.waitFor(p, day => location.hash === '#/suppliers/cutoff/veg/' + day, F.today, 10000);
  await opens(p);
  text = await rootText(p);
  ok(!!(await p.$(card)) && text.includes('Valley Veg is not in the supplier catalogue'), 'unlinked route: the card names the cut-off\'s supplier and says it is not in the catalogue');
  await noSheet(p, 'unlinked route');
  ok(/Order by .*15:00/.test(text), 'unlinked route: the card says when the order closes');
  ok(!!(await p.$('#supplier-root .su-cut-card a[href="#/orders"]')), 'unlinked route: the card links to the Order list');
  ok(!(await L.overflow(p)), 'unlinked card: no sideways scroll at 390 px');
  if (await p.$(cardDone)) {
    await p.click(cardDone); await saved(p, true);
    const d = (await p.evaluate(() => window.__fake.dump()))[veg];
    ok(d.by === 'sam' && d.day === F.today && d.sid === 'veg' && Object.keys(d).sort().join() === 'at,by,day,on,sid', 'unlinked Order done: saves only the existing completion tick for this cut-off and chef');
    await undo(p).waitFor({ state: 'visible', timeout: 10000 });
    await L.waitFor(p, () => !document.querySelector('#supplier-root .su-cut-card [data-cut="done"]') && /Order done\./.test(document.querySelector('#supplier-root').textContent), null, 10000);
    ok(true, 'unlinked Order done: the card shows the order as done');
    ok(!(await p.$('#cut-band a.cut-n[href*="/veg/"]')), 'unlinked Order done: the bar drops the reminder too');
    await undo(p).click(); await saved(p, false);
    await L.waitFor(p, () => !!document.querySelector('#supplier-root .su-cut-card [data-cut="done"]'), null, 10000);
    ok(true, 'unlinked Undo: the card offers Order done again');
    ok(Object.keys(await p.evaluate(() => window.__fake.dump())).filter(k => /\/(supplierlinks|suppliers\/[^/]+\/orders)\//.test(k) && !/\/orders\/(previous|older)$/.test(k)).length === 0, 'unlinked Order done and Undo: no supplier order or link is made');
  } else ok(false, 'unlinked route: the card offers Order done');
  ok(p.errors.length === 0, 'unlinked route: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Unlinked push route, head chef at 768: the same card, and Refresh keeps it instead of opening another supplier.
  const vegPush = await pushHash('veg', F.today);
  ok(vegPush === '#/suppliers/cutoff/veg/' + F.today, 'unlinked push: the worker opens the cut-off route');
  p = await L.open(b, vegPush, { who: 'bo', extra: withVeg(), width: 768, wait: 1500 });
  await opens(p);
  ok(!!(await p.$(card)) && (await rootText(p)).includes('Valley Veg is not in the supplier catalogue'), 'unlinked push: the card opens');
  await noSheet(p, 'unlinked push');
  ok(/Supplier settings/.test(await rootText(p)), 'unlinked push: the head chef is told where to link it');
  if (await p.$('[data-su="refresh"]')) { await p.click('[data-su="refresh"]'); await L.settle(p, 600); await opens(p); }
  ok(!!(await p.$(card)), 'unlinked push: Refresh keeps the card');
  await noSheet(p, 'unlinked push after Refresh');
  ok(!(await L.overflow(p)), 'unlinked card: no sideways scroll at 768 px');
  ok(p.errors.length === 0, 'unlinked push: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // The tick list's name link for a cut-off whose reminder has not started (20:00, reminder from 16:00): Order done still saves.
  p = await L.open(b, '#/orders', { who: 'sam', extra: withVeg(20 * 60), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.cut-tl a.cut-n[href*="/veg/"]'), null, 10000);
  ok(!(await p.$('#cut-band a.cut-n[href*="/veg/"]')), 'later cut-off: no reminder on the bar yet');
  await p.click('.cut-tl a.cut-n[href*="/veg/"]');
  await opens(p);
  ok(!!(await p.$(card)), 'tick list link: an unlinked cut-off opens the card');
  await noSheet(p, 'tick list link');
  if (await p.$(cardDone)) { await p.click(cardDone); await saved(p, true); ok((await p.evaluate(() => window.__fake.dump()))[veg].by === 'sam', 'later cut-off: Order done on the card saves before the reminder starts'); }
  else ok(false, 'later cut-off: the card offers Order done');
  ok(p.errors.length === 0, 'tick list link: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A push tapped after its day: the card, with only the Order list (no tick for a day the shared list no longer shows).
  const old = L.ymd(new Date(L.NOW - 86400000));
  p = await L.open(b, await pushHash('veg', old), { who: 'sam', extra: withVeg(), wait: 1500 });
  await opens(p);
  ok(!!(await p.$(card)) && !(await p.$(cardDone)) && !!(await p.$('#supplier-root .su-cut-card a[href="#/orders"]')), 'old push: the card offers only the Order list');
  await noSheet(p, 'old push');
  ok(p.errors.length === 0, 'old push: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Two catalogue suppliers linked to one cut-off: neither is picked.
  const twice = withVeg();
  twice[F.key(['suppliers', 'west-bay'])].cutoffId = 'northside';
  p = await L.open(b, await pushHash('northside', F.today), { who: 'bo', extra: twice, width: 1280, wait: 1500 });
  await opens(p);
  ok(!!(await p.$(card)) && (await rootText(p)).includes('Northside Test Foods is linked to more than one supplier'), 'two links: the card says the cut-off is linked to more than one supplier');
  ok(!(await p.$('#supplier-root input[data-sf="qty"]')) && (await historyReads(p)).length === 0, 'two links: no order sheet opens and no history is read');
  ok(!!(await p.$(cardDone)), 'two links: the card offers Order done');
  ok(!(await L.overflow(p)), 'two links card: no sideways scroll at 1280 px');
  ok(p.errors.length === 0, 'two links: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A linked push still opens its own supplier and its real cut-off.
  p = await L.open(b, await pushHash('northside', F.today), { who: 'sam', extra: withVeg(), wait: 1500 });
  await opens(p);
  text = await rootText(p);
  ok(!!(await p.$('#supplier-root input[data-sf="qty"][data-i="t-stock"]')) && text.includes('Northside Test Foods') && !(await p.$(card)), 'linked push: its own supplier sheet opens');
  ok(/Order cut-off/.test(await p.textContent('.su-cutoff')) && !/Selected order cut-off/.test(text), 'linked push: the sheet shows the real cut-off, not a made-up one');
  ok(p.errors.length === 0, 'linked push: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
