// Supplier workspace: real page journeys with synthetic suppliers. Firebase is the stand-in from tests/lib.js.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results(), { txt } = L;
const dump = p => p.evaluate(() => window.__fake.dump());
const ordersOf = (s, sid) => Object.entries(s).filter(([k]) => k.startsWith(F.key(['suppliers', sid, 'orders']) + '/') && k.split('/').length === 6);
const supplierReads = p => p.evaluate(() => (window.__fake && window.__fake.reads || []).filter(k => /\/(suppliers|supplierlinks)(\/|$)/.test(k)));
const qtySel = id => 'input[data-sf="qty"][data-i="' + id + '"]';
const action = (p, name, extra) => p.click('[data-su="' + name + '"]' + (extra || ''));
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000); }
async function navigate(p, hash) { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 400); }
async function open(b, hash, opt) { return L.open(b, hash || '#/suppliers/northside', Object.assign({ who: 'bo', extra: F.fixture(), wait: 1800 }, opt || {})); }
async function clearForm(p, par) { await p.fill('[data-sf="par"]', par); await action(p, 'save-item'); await L.settle(p, 500); }

(async () => {
  const b = await L.start();
  let p, s;

  // Head chef: full order page, exact imported words and source pars, including blank and zero.
  p = await open(b, '#/suppliers/northside', { width: 1280 });
  await ready(p);
  if (process.env.SUPPLIER_SHOTS) await p.screenshot({ path: process.env.SUPPLIER_SHOTS + '-desktop.png', fullPage: true });
  ok(/Supplier order/.test(await txt(p, '#rtitle') || ''), 'head chef: Supplier order opens');
  const body = await p.evaluate(() => document.body.textContent);
  ok(body.includes(F.items[5].name) && !(await p.$('img[onerror]')), 'catalogue: exact punctuation is text, never markup');
  ok(body.includes('TEST ZERO PAR ITEM') && body.includes('TEST UNSET PAR ITEM') && /Not set/.test(body), 'catalogue: zero and blank products remain visible');
  ok(!!(await p.$('[data-su="manage"]')), 'head chef: Manage catalogue is available');
  const previousWeekday = new Intl.DateTimeFormat('en-AU', { weekday: 'long', timeZone: 'Australia/Brisbane' }).format(new Date(L.NOW - 2 * 86400000));
  ok((await txt(p, '.su-latest')).includes(previousWeekday), 'last order: its actual Queensland weekday is visible');
  ok(/Not ordered/.test(body), 'last order: a product omitted from that supplier order is labelled Not ordered');
  ok(/Not ordered/.test(await txt(p, '[data-item="t-zero"] .su-last')), 'last supplier order never pulls forward an older purchase of an omitted item');
  ok(await p.$eval(qtySel('t-stock'), e => e.value) === '', 'last order quantities do not silently fill the new draft');
  await action(p, 'history');
  await L.waitFor(p, () => !!document.querySelector('[data-su="history-order"][data-id="older"]'), null, 5000);
  await action(p, 'history-order', '[data-id="older"]');
  ok(/Recorded by Sam/.test(await txt(p, '.su-disclosure:has([data-su="history"])')), 'history identifies the chef who placed the previous order');
  ok(/2 kg/.test(await txt(p, '[data-item="t-stock"] .su-last')), 'selecting an older history sheet leaves latest-order comparison unchanged');
  await p.fill(qtySel('t-stock'), '4 kg');
  await action(p, 'collapse'); await L.settle(p, 100);
  ok(await p.$eval(qtySel('t-stock'), e => e.value) === '4 kg', 'sidebar collapse preserves typed quantities');
  await action(p, 'collapse'); await L.settle(p, 100);
  ok(!(await L.overflow(p)), 'head chef order sheet fits a desktop, including the long product name');

  // A changed par is operational data; the imported evidence and recorded orders retain their values.
  const previousKey = F.key(['suppliers', 'northside', 'orders', 'previous']);
  const previous = JSON.stringify((await dump(p))[previousKey]);
  await action(p, 'manage');
  await L.waitFor(p, () => !!document.querySelector('[data-su="edit"][data-i="t-stock"]'), null, 10000);
  await action(p, 'edit', '[data-i="t-stock"]');
  await L.waitFor(p, () => !!document.querySelector('[data-sf="par"]'), null, 5000);
  if (process.env.SUPPLIER_SHOTS) await p.screenshot({ path: process.env.SUPPLIER_SHOTS + '-editor.png', fullPage: true });
  ok(await p.$eval('[data-sf="name"]', e => e.readOnly), 'imported product name is protected in the editor');
  await clearForm(p, '12');
  s = await dump(p);
  let catalogue = s[F.key(['suppliers', 'northside'])];
  let stock = catalogue.items.find(x => x.id === 't-stock');
  ok(stock.par === '12' && stock.source.par === '10' && catalogue.v === 2, 'par edit saves current value and revision while retaining PDF par');
  ok(JSON.stringify(s[previousKey]) === previous, 'par edit leaves the saved historical order unchanged');
  ok(Object.keys(s).some(k => k.includes('/suppliers/northside/audit/')), 'par edit writes an audit record');
  await action(p, 'edit', '[data-i="t-stock"]'); await clearForm(p, '0');
  s = await dump(p); ok(s[F.key(['suppliers', 'northside'])].items.find(x => x.id === 't-stock').par === '0', 'par editor can save an explicit zero');
  await action(p, 'edit', '[data-i="t-stock"]'); await clearForm(p, '');
  s = await dump(p); ok(s[F.key(['suppliers', 'northside'])].items.find(x => x.id === 't-stock').par === '', 'par editor can clear a par to Not set');
  await action(p, 'edit', '[data-i="t-stock"]'); await p.fill('[data-sf="par"]', '-2'); await action(p, 'save-item'); await L.settle(p, 150);
  ok(!!(await p.$('[role="alert"]')) || /zero or more|positive number|negative par/i.test(await p.evaluate(() => document.body.textContent)), 'invalid negative par has a visible validation response');
  ok((await dump(p))[F.key(['suppliers', 'northside'])].items.find(x => x.id === 't-stock').par === '', 'invalid negative par is not saved');
  // Back to the catalogue through its route discards the invalid editor only after the page can explicitly do so.
  await p.fill('[data-sf="par"]', '10'); await action(p, 'save-item'); await L.settle(p, 400);

  // Manual additions get their own stable identity and explicit units, not a fabricated PDF source.
  await action(p, 'add'); await L.waitFor(p, () => !!document.querySelector('[data-sf="name"]'), null, 5000);
  await p.fill('[data-sf="name"]', 'TEST MANUALLY ADDED BUNCH');
  await p.fill('[data-sf="par"]', '2.5');
  const more = await p.$('details:has([data-sf="orderUnit"])');
  if (more && !(await more.evaluate(e => e.open))) await p.click('details:has([data-sf="orderUnit"]) > summary');
  if (await p.$('[data-sf="orderUnit"]')) await p.fill('[data-sf="orderUnit"]', 'bunch');
  await action(p, 'save-item'); await L.settle(p, 500);
  s = await dump(p); catalogue = s[F.key(['suppliers', 'northside'])];
  const manual = catalogue.items.find(x => x.name === 'TEST MANUALLY ADDED BUNCH');
  ok(!!manual && manual.manual && manual.par === '2.5' && manual.orderUnit === 'bunches' && !manual.source.file, 'manual addition saves decimal par, custom unit and manual provenance');
  await action(p, 'order-mode'); await ready(p);
  ok(!!manual && !!(await p.$(qtySel(manual.id))), 'manual item appears in the supplier order sheet');
  ok(await p.$eval(qtySel('t-stock'), e => e.value) === '4 kg', 'catalogue changes preserve the order quantity already typed');

  // Record the actual draft once. All three pieces of state agree, and typing next time cannot rewrite the snapshot.
  await p.fill(qtySel(manual.id), '3 bunch');
  await action(p, 'review'); await L.waitFor(p, () => !!document.querySelector('[data-su="record"]'), null, 5000);
  await action(p, 'record');
  await L.waitFor(p, k => Object.keys(window.__fake.dump()).some(x => x.startsWith(k) && !/\/(previous|older)$/.test(x)), F.key(['suppliers', 'northside', 'orders']) + '/', 10000);
  s = await dump(p);
  const saved = ordersOf(s, 'northside').find(([k]) => !/\/(previous|older)$/.test(k));
  ok(!!saved && saved[1].lines.length === 2 && saved[1].lines.some(x => x.name === 'TEST MANUALLY ADDED BUNCH' && x.qty === '3 bunch'), 'record: individual exact product names and quantities are saved');
  const cutKey = F.key(['cutdone', F.today + '_northside']);
  ok(s[cutKey] && s[cutKey].on === true && s[cutKey].by === 'bo', 'record: matching cut-off completion is saved by the head chef');
  ok(Object.values(s).some(x => x && saved && x.orderId === saved[0].split('/').pop() && x.day === F.today), 'record: occurrence link references the saved order');
  ok(await p.$eval(qtySel('t-stock'), e => e.value) === '', 'record: quantities clear only after a successful save');
  const frozen = saved && JSON.stringify(saved[1]);
  await p.fill(qtySel('t-stock'), '99 kg');
  ok(JSON.stringify((await dump(p))[saved[0]]) === frozen, 'a new draft does not rewrite the previous order');
  await action(p, 'manage'); await L.waitFor(p, () => !!document.querySelector('[data-su="edit"]'), null, 5000);
  await action(p, 'edit', '[data-i="' + manual.id + '"]');
  await action(p, 'archive'); await L.waitFor(p, () => !!document.querySelector('[data-su="archive-confirm"]'), null, 5000);
  await action(p, 'archive-confirm'); await L.settle(p, 400);
  s = await dump(p); ok(s[F.key(['suppliers', 'northside'])].items.find(x => x.id === manual.id).archived && JSON.stringify(s[saved[0]]) === frozen, 'archive: product is retained as archived and its order snapshot remains intact');
  ok(p.errors.length === 0, 'head chef complete journey has no page errors: ' + p.errors.join(' | '));
  await p.context().close();

  // A slow acknowledgement cannot accept a second form edit or navigation halfway through a catalogue save.
  p = await open(b, '#/suppliers/northside/manage', { width: 1280 });
  await L.waitFor(p, () => !!document.querySelector('[data-su="edit"][data-i="t-stock"]'), null, 10000);
  await action(p, 'edit', '[data-i="t-stock"]'); await p.fill('[data-sf="par"]', '11');
  await p.evaluate(() => { window.__fake.liteCommitDelay = 800; });
  await action(p, 'save-item');
  ok(await p.$eval('[data-sf="par"]', e => e.disabled) && await p.$eval('.wtop [data-act="back"]', e => e.disabled), 'pending catalogue save disables edits and leaving the form');
  await p.evaluate(() => { const input = document.querySelector('[data-sf="par"]'); input.value = '77'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await L.waitFor(p, k => window.__fake.dump()[k].items.find(i => i.id === 't-stock').par === '11', F.key(['suppliers', 'northside']), 5000);
  await L.waitFor(p, () => !document.querySelector('[data-sf="par"]'), null, 5000);
  ok((await dump(p))[F.key(['suppliers', 'northside'])].items.find(i => i.id === 't-stock').par === '11', 'the acknowledged value is the reviewed value, not an edit made while pending');
  await p.context().close();

  // Smart assistance is explicit and tied to current stock and confirmed units. A matched staff request stays open.
  p = await open(b, '#/suppliers/northside', { who: 'sam', width: 390, settings: { shared: true, text: 'xlarge' } }); await ready(p);
  await p.click('[data-item="t-stock"] .su-item > summary');
  await p.fill('input[data-sf="stock"][data-i="t-stock"]', '3 kg');
  await action(p, 'smart');
  await L.waitFor(p, () => !!document.querySelector('[data-su="apply"][data-i="t-stock"]') && !!document.querySelector('[data-item="t-stock"] .su-request'), null, 6000);
  ok(await p.$eval(qtySel('t-stock'), e => e.value) === '', 'current stock and a request never automatically fill an order quantity');
  ok(/10 kg.*3 kg.*7 kg/.test(await p.evaluate(() => document.body.textContent)), 'stock suggestion explains the current par and counted quantity');
  await action(p, 'apply', '[data-i="t-stock"]');
  ok(await p.$eval(qtySel('t-stock'), e => e.value) === '7 kg', 'Apply explicitly copies the compatible stock top-up');
  await p.fill(qtySel('t-stock'), '9 kg');
  ok(!(await p.$('[data-su="apply"][data-i="t-stock"]')), 'an entered quantity is not replaced by another suggestion');
  ok((await dump(p))[F.key(['orders', F.today, 'lines', 'request-test'])].ordered === false, 'staff request is not ticked by a supplier suggestion');
  ok(!(await L.overflow(p)), 'phone with Extra large text, stock details and suggestions has no sideways scroll');
  if (process.env.SUPPLIER_SHOTS) await p.screenshot({ path: process.env.SUPPLIER_SHOTS + '-phone.png', fullPage: true });
  await navigate(p, '#/suppliers/cutoff/northside/' + F.today); await ready(p);
  ok((await p.evaluate(() => document.body.textContent)).includes('Northside Test Foods'), 'cut-off deep link opens the matching supplier');
  ok(await p.$eval(qtySel('t-stock'), e => e.value) === '9 kg', 'opening the matching reminder preserves its existing draft');
  await L.pick(p, '[data-sf="supplier"]', 'west-bay');
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"][data-i="w-one"]'), null, 5000);
  await p.fill(qtySel('w-one'), '2 bags'); await L.pick(p, '[data-sf="supplier"]', 'northside'); await ready(p);
  ok(await p.$eval(qtySel('t-stock'), e => e.value) === '9 kg', 'switching suppliers retains a separate quantity draft for each');
  await p.evaluate(() => window.LK_PREP.signOut(true));
  await L.waitFor(p, () => !document.querySelector('input[data-sf="qty"]'), null, 5000);
  ok(!(await p.evaluate(() => window.LK_SUP.hasDraft())), 'signing out on a shared device clears private supplier drafts');
  ok(p.errors.length === 0, 'smart phone journey has no page errors: ' + p.errors.join(' | '));
  await p.context().close();

  p = await open(b, '#/', { who: 'bo' });
  ok((await supplierReads(p)).length === 0, 'landing page does not read the catalogue or supplier history');
  await p.context().close();

  // Sous chef can order and inspect history, but cannot open the catalogue editor, including on the Google tablet.
  for (const admin of [false, true]) {
    p = await open(b, '#/suppliers/northside', { who: 'sam', admin: false, width: 768 }); await ready(p);
    ok(!(await p.$('[data-su="manage"]')), 'sous chef' + (admin ? ' on Google tablet' : '') + ': no catalogue management action');
    await navigate(p, '#/suppliers/northside/manage'); await L.settle(p, 600);
    ok(!(await p.$('[data-su="save-item"]')) && !(await p.$('[data-su="add"]')), 'sous chef' + (admin ? ' on Google tablet' : '') + ': direct management route cannot edit');
    ok(!(await L.overflow(p)), 'sous chef page fits a tablet');
    ok(p.errors.length === 0, 'sous chef page has no errors: ' + p.errors.join(' | '));
    await p.context().close();
  }

  // The Google owner can manage without selecting a staff name on their personal device.
  p = await open(b, '#/suppliers/northside/manage', { admin: true, who: '', width: 1280 });
  await L.waitFor(p, () => !!document.querySelector('[data-su="add"]'), null, 12000);
  ok(!!(await p.$('[data-su="add"]')), 'verified Google owner can manage the catalogue');
  ok(!(await L.overflow(p)), 'catalogue management fits a desktop');
  await p.context().close();

  // Staff and a shared device with nobody signed in never read private supplier data.
  for (const o of [{ who: 'ann' }, { admin: true, who: 'ann' }, { who: '', noPin: true }]) {
    p = await open(b, '#/suppliers/northside', o); await L.settle(p, 700);
    ok(!(await p.$('input[data-sf="qty"]')) && (await supplierReads(p)).length === 0, 'restricted role ' + JSON.stringify(o) + ': no supplier data read or displayed');
    ok(!(await L.chefItems(p)).some(x => /^suppliers/.test(x)), 'restricted role: no Supplier order menu link');
    await p.context().close();
  }

  // A denied or failed catalogue read is an error, never an empty catalogue or a public static fallback.
  p = await open(b, '#/suppliers/northside', { failReads: '/suppliers(?:/|$)' });
  await L.waitFor(p, () => !!document.querySelector('[data-su="retry"]'), null, 12000);
  ok(!(await p.$('input[data-sf="qty"]')) && /signal|connect|load|access|again/i.test(await p.evaluate(() => document.body.textContent)), 'failed catalogue read shows retry without goods');
  await p.evaluate(() => { window.__fake.failReads = null; }); await action(p, 'retry'); await ready(p);
  ok(!!(await p.$(qtySel('t-stock'))), 'catalogue loads after the failed read is retried');
  await p.context().close();

  // A refused save keeps quantities and does not mark the supplier ordered. Retrying creates exactly one snapshot.
  p = await open(b); await ready(p);
  await p.fill(qtySel('t-stock'), '2 kg'); await action(p, 'review');
  await L.waitFor(p, () => !!document.querySelector('[data-su="record"]'), null, 5000);
  await p.evaluate(() => { window.__fake.deny = /\/suppliers\/northside\/orders\//; }); await action(p, 'record'); await L.settle(p, 700);
  s = await dump(p);
  ok(ordersOf(s, 'northside').length === 2 && !s[F.key(['cutdone', F.today + '_northside'])], 'failed save creates neither history nor cut-off completion');
  if (await p.$('.su-review')) await p.click('.wtop [data-act="back"]');
  ok(await p.$eval(qtySel('t-stock'), e => e.value) === '2 kg', 'failed save preserves the typed quantity');
  await p.evaluate(() => { window.__fake.deny = null; });
  if (!(await p.$('[data-su="record"]'))) await action(p, 'review');
  await action(p, 'record'); await L.waitFor(p, pre => Object.keys(window.__fake.dump()).filter(k => k.startsWith(pre)).length === 3, F.key(['suppliers', 'northside', 'orders']) + '/', 10000);
  s = await dump(p); ok(ordersOf(s, 'northside').length === 3, 'retry of the failed order creates one history record');
  await p.context().close();

  // Two chefs' saves can reach the same occurrence together. Exercise the real store adapter and PIN session,
  // not a test-only replacement, so concurrent attempts and an acknowledged retry cannot duplicate the order.
  p = await open(b); await ready(p);
  const race = await p.evaluate(async () => {
    const bridge = window.LK_PREP.supplier(), db = window.LK_SUP_STORE.create(bridge);
    const catalogue = await db.load('northside');
    const lines = window.LK_SUP_CORE.snapshotLines(catalogue.items, { 't-stock': '2 kg' });
    const occurrence = { day: bridge.day(bridge.now()), cutoffId: 'northside' };
    const results = await Promise.allSettled([
      db.record('northside', catalogue.v, 'test-order-one', lines, occurrence, 0, false, ''),
      db.record('northside', catalogue.v, 'test-order-two', lines, occurrence, 0, false, '')
    ]);
    const first = results.find(x => x.status === 'fulfilled');
    const rejected = results.find(x => x.status === 'rejected');
    const id = first.value.order.id;
    const replay = await db.record('northside', catalogue.v + 5, id, lines, occurrence, 0, false, '');
    let changedReplay;
    try { await db.record('northside', catalogue.v, id, window.LK_SUP_CORE.snapshotLines(catalogue.items, { 't-stock': '9 kg' }), occurrence, 0, false, ''); }
    catch (e) { changedReplay = e.code; }
    const link = await db.link(occurrence);
    const extra = await db.record('northside', catalogue.v, 'test-order-additional', lines, occurrence, link.v, true, '');
    return { accepted: results.filter(x => x.status === 'fulfilled').length,
      rejected: rejected && rejected.reason.code, replayed: replay.replayed, changedReplay,
      originalId: id, additionalId: extra.order.id, finalLink: await db.link(occurrence) };
  });
  ok(race.accepted === 1 && race.rejected === 'concurrent', 'concurrent save: one order wins and the second needs explicit review');
  ok(race.replayed === true, 'retry: saved order ID is recognised even after the catalogue version changed');
  ok(race.changedReplay === 'recorded', 'retry: an already committed ID cannot silently accept changed quantities');
  ok(race.additionalId !== race.originalId && race.finalLink.v === 2, 'additional order: a distinct snapshot shares the same occurrence after explicit confirmation');
  s = await dump(p); ok(ordersOf(s, 'northside').length === 4, 'concurrent attempt and replay create no extra history records');
  const bounded = await p.evaluate(async () => {
    const bridge = window.LK_PREP.supplier(), db = window.LK_SUP_STORE.create(bridge);
    window.__fake.stall = /\/suppliers\/northside$/;
    let stalled;
    try { await db.load('northside'); } catch (e) { stalled = e.code; }
    window.__fake.stall = null;
    const refreshed = await db.load('northside');
    let phase = 'first', release;
    const waiting = new Promise(resolve => { release = resolve; });
    const delayedBridge = Object.assign({}, bridge, { ready: () => waiting, context: () => phase,
      read: () => phase === 'first' && bridge.read() });
    const delayed = window.LK_SUP_STORE.create(delayedBridge);
    const attempt = delayed.load('northside').then(() => 'unexpected-success', e => e.code);
    phase = 'second'; release(await bridge.ready());
    return { stalled, refreshed: refreshed.id, late: await attempt };
  });
  ok(bounded.stalled === 'unavailable' && bounded.refreshed === 'northside', 'a stalled catalogue read has a bounded failure and a subsequent retry works');
  ok(bounded.late === 'context', 'a delayed SDK response cannot read under a different person context');
  await p.context().close();

  // Historic reminder-only completions cannot invent products or quantities.
  const legacy = F.fixture({ [F.key(['suppliers', 'northside', 'orders', 'previous'])]: undefined,
    [F.key(['suppliers', 'northside', 'orders', 'older'])]: undefined,
    [F.key(['cutdone', F.today + '_northside'])]: { day: F.today, sid: 'northside', on: true, at: L.NOW - 10000, by: 'sam' } });
  p = await open(b, '#/suppliers/northside', { extra: legacy }); await ready(p);
  ok(/No previous|No order|not recorded/i.test(await p.evaluate(() => document.body.textContent)), 'legacy completion is shown without fabricating a last order');
  ok(await p.$eval(qtySel('t-stock'), e => e.value) === '', 'legacy completion never fabricates order quantities');
  await p.context().close();

  // A missing lazy module leaves the rest of the app working and offers an explicit retry.
  p = await open(b, '#/suppliers/northside', { block: 'js/suppliers\\.js' });
  await L.waitFor(p, () => /Could not|could not|Reload|Try again/.test(document.body.textContent), null, 12000);
  ok(!(await p.$('input[data-sf="qty"]')), 'missing supplier module shows no broken partial order sheet');
  await navigate(p, '#/orders'); await L.waitFor(p, () => !!document.querySelector('[data-k="o-text"]'), null, 6000).catch(() => {});
  ok(/Order list|Everything to order/.test(await p.evaluate(() => document.body.textContent)), 'existing order list remains usable after supplier-module failure');
  await p.context().close();

  await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
