// An explicit split can attach an older combined catalogue to a supplier already used for ordering.
// All suppliers, products, people and dates here are synthetic.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
let beforeServer, testBase;
const SOURCE = 'northside', TARGET = 'northside-separate2', INCOMING = 'northside-separate';
const sourceKey = F.key(['suppliers', SOURCE]), targetKey = F.key(['suppliers', TARGET]);
const clone = value => JSON.parse(JSON.stringify(value));
const moved = ['t-stock', 't-case', 't-zero', 't-safe', 't-long'];
const targetIds = { 't-stock': 'seafood-stock', 't-case': 'seafood-case', 't-zero': 't-zero', 't-safe': 't-safe', 't-long': 't-long' };
const action = (page, name) => L.choose(page, '[data-su="' + name + '"]');
const dump = page => page.evaluate(() => window.__fake.dump());
const history = value => JSON.stringify(Object.entries(value).filter(([key]) => /\/suppliers\/[^/]+\/orders\//.test(key)).sort(([a], [b]) => a.localeCompare(b)));
const supplierRecords = value => JSON.stringify(Object.entries(value).filter(([key]) => /\/suppliers(?:\/|$)|\/supplierlinks\//.test(key)).sort(([a], [b]) => a.localeCompare(b)));
function fixture() {
  const extra = clone(F.fixture()), original = extra[sourceKey].items;
  original.find(item => item.id === 't-stock').par = '19.50';
  const stock = clone(original.find(item => item.id === 't-stock'));
  stock.id = targetIds['t-stock']; stock.par = '44.50'; stock.aliases = ['Saved seafood stock'];
  stock.source = { ...stock.source, file: 'synthetic-separate-sheet.pdf', row: 27 };
  const cases = clone(original.find(item => item.id === 't-case'));
  cases.id = targetIds['t-case']; cases.par = '7'; cases.source = { ...cases.source, file: 'synthetic-separate-sheet.pdf', row: 28 };
  delete cases.aliases;
  extra[targetKey] = { name: 'Northside Test Seafood', cutoffId: TARGET, v: 4,
    at: L.NOW - 3 * 86400000, by: 'bo', items: [cases, stock] };
  const own = clone(extra[sourceKey + '/orders/previous']);
  own.sid = TARGET; own.supplierName = extra[targetKey].name; own.v = 4; own.at = L.NOW - 86400000;
  own.lines = [{ ...own.lines[0], itemId: stock.id, qty: '11 kg', amount: 11, par: stock.par, source: clone(stock.source) }];
  extra[targetKey + '/orders/previous'] = own;
  extra[F.key(['config', 'main'])].cutoffs.push({ id: TARGET, name: extra[targetKey].name,
    dd: [(new Date(L.NOW).getDay() + 3) % 7], at: 11 * 60, pre: 1, lead: 180 });
  return extra;
}
function payload(targetId, longReview) {
  const original = clone(F.items), target = targetId || INCOMING;
  const suppliers = [
    { id: SOURCE, name: 'Northside Test Dry Goods', cutoffId: SOURCE, items: original.filter(item => !moved.includes(item.id)) },
    { id: target, name: 'Northside Test Seafood', cutoffId: TARGET, splitFrom: SOURCE,
      items: moved.map(id => original.find(item => item.id === id)) }
  ];
  if (longReview) for (let n = 1; n <= 4; n++) {
    const item = clone(original[1]); item.id = 'review-item-' + n;
    item.name = item.source.name = 'TEST REVIEW PRODUCT ' + n;
    suppliers.push({ id: 'review-supplier-' + n, name: 'Test review supplier ' + n, cutoffId: '', items: [item] });
  }
  return { version: 1, suppliers };
}
async function open(browser, extra, width) {
  const page = await L.open(browser, '#/suppliers/' + SOURCE, { who: 'bo', width: width || 390, extra: extra || fixture(), wait: 1100, base: testBase });
  await L.waitFor(page, () => !!document.querySelector('input[data-sf="qty"]'), null, 10000);
  return page;
}
async function direct(page, incoming, mappings) {
  return page.evaluate(async ({ incoming, mappings }) => {
    const store = window.LK_SUP_STORE.create(window.LK_PREP.supplier());
    window.__existingSplitStore = store;
    try { return { saved: await store.importCatalogue(incoming, mappings || { northside: 'northside', 'northside-separate2': 'northside-separate2' }) }; }
    catch (error) { return { code: error.code || 'refused', message: error.message }; }
  }, { incoming, mappings });
}
async function preview(page, incoming) {
  await action(page, 'manage');
  await page.setInputFiles('[data-sf="import"]', { name: 'synthetic-existing-split.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(incoming)) });
  await L.waitFor(page, () => /Review catalogue import/.test(document.querySelector('#rtitle')?.textContent || ''), null, 5000);
}
async function visibleFeedback(page, selector) {
  return page.evaluate(selector => {
    const element = document.querySelector(selector); if (!element) return { text: '', visible: false };
    const box = element.getBoundingClientRect(), tabs = document.querySelector('.tabbar')?.getBoundingClientRect();
    return { text: element.textContent, visible: box.top >= 0 && box.bottom <= Math.min(innerHeight, tabs && tabs.height ? tabs.top : innerHeight) };
  }, selector);
}
async function selectSupplier(page, id) {
  const side = page.locator('[data-su="pick"][data-sid="' + id + '"]');
  if (await side.isVisible()) await side.click(); else await L.pick(page, '[data-sf="supplier"]', id);
  await L.waitFor(page, sid => document.querySelector('[data-sf="supplier"]')?.value === sid && !!document.querySelector('input[data-sf="qty"]'), id, 5000);
}

(async () => {
  // Optional fail-first evidence uses saved pre-change modules without modifying the worktree.
  // The UI API number alone follows the current shell so its unchanged old behaviour can still mount.
  if (process.env.SUPPLIER_EXISTING_BEFORE === '1') {
    const fs = require('node:fs'), path = require('node:path'), over = {};
    const currentApp = fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8');
    for (const name of ['supplier-core', 'supplier-store', 'suppliers']) {
      let body = fs.readFileSync('/tmp/existing-split-before-' + name + '.js', 'utf8');
      if (name === 'suppliers') body = body.replace(/var API = \d+/, 'var API = ' + currentApp.match(/var SUP_API = (\d+)/)[1]);
      over['/js/' + name + '.js'] = { body, lastModified: 'Sun, 18 Oct 2026 00:00:00 GMT' };
    }
    beforeServer = require('./serve').make(over);
    await new Promise(resolve => beforeServer.listen(0, '127.0.0.1', resolve));
    testBase = 'http://127.0.0.1:' + beforeServer.address().port + '/';
  }
  const browser = await L.start();
  let page = await open(browser);
  const before = await dump(page), imported = await direct(page, payload(TARGET));
  ok(!!imported.saved, 'first attachment accepts an existing destination with its own catalogue and orders: ' + (imported.message || 'saved'));
  if (imported.saved) {
    const after = await dump(page), target = after[targetKey], source = after[sourceKey];
    ok(target.v === 5 && source.v === 2 && !after[F.key(['suppliers', INCOMING])], 'attachment revises the existing destination and original supplier without creating a duplicate');
    ok(target.name === before[targetKey].name && target.cutoffId === TARGET, 'existing destination keeps its saved name, ID and own reminder');
    ok(before[targetKey].items.every(item => JSON.stringify(target.items.find(current => current.id === item.id)) === JSON.stringify(item)), 'matched destination rows retain exact raw maps, own IDs, omitted fields, pars, aliases and original source records');
    ok(target.items.map(item => item.id).join() === moved.map(id => targetIds[id]).join() && target.items.length === 5, 'incoming five-item split sequence reuses two matched saved rows and adds each missing source row once');
    ok(source.items.length === before[sourceKey].items.length && moved.every(id => source.items.find(item => item.id === id)?.archived), 'moved original rows remain archived in the combined catalogue');
    ok(before[sourceKey].items.every(item => JSON.stringify(source.items.find(current => current.id === item.id)) === JSON.stringify(moved.includes(item.id) ? { ...item, archived: true } : item)), 'archiving is the only change to original item maps');
    ok(target.historyFrom === SOURCE && target.historyBefore === target.at && target.at === source.at, 'first attachment records one shared immutable history boundary');
    ok(Object.keys(target.historyItems || {}).length === moved.length && moved.every(id => target.historyItems[id] === targetIds[id]), 'first attachment stores the complete parent-to-destination item map, including unchanged IDs');
    ok(history(after) === history(before), 'existing destination and combined order documents, quantities and colliding own order IDs stay byte-for-byte unchanged');
    const pages = await page.evaluate(async target => {
      const store = window.__existingSplitStore, rows = []; let cursor = null;
      for (let n = 0; n < 8; n++) { const result = await store.history(target, 1, cursor); rows.push(...result.rows); cursor = result.cursor; if (!result.more) break; }
      return rows;
    }, TARGET);
    const parent = pages.find(order => order.id === 'from:' + SOURCE + ':previous');
    ok(pages.some(order => order.id === 'previous' && order.sid === TARGET && order.lines[0].itemId === 'seafood-stock' && order.lines[0].qty === '11 kg'), 'own recorded order remains first-class with its original order and item IDs');
    ok(parent?.inheritedFrom === SOURCE && parent.sourceOrderId === 'previous' && parent.lines.find(line => line.itemId === 'seafood-case')?.qty === '1 case' && parent.lines.find(line => line.itemId === 'seafood-stock')?.qty === '2 kg', 'older combined history maps parent line IDs to saved destination IDs with explicit provenance');
    const againBefore = supplierRecords(await dump(page)), repeated = await direct(page, payload(TARGET));
    ok(!!repeated.saved && supplierRecords(await dump(page)) === againBefore, 'repeating the same attachment preserves live pars, own rows and the history boundary without another revision');
    const metadata = await page.evaluate(async target => {
      const store = window.__existingSplitStore, supplier = await store.load(target);
      const edited = await store.saveCatalogue(target, supplier.v, { items: supplier.items.map(item => item.id === 'seafood-case' ? { ...item, par: '13' } : item) }, { action: 'edit', itemId: 'seafood-case' });
      return { before: supplier.historyItems, after: edited.historyItems, from: edited.historyFrom, at: edited.historyBefore };
    }, TARGET);
    ok(!!metadata.before && JSON.stringify(metadata.before) === JSON.stringify(metadata.after) && metadata.from === SOURCE && metadata.at === target.historyBefore, 'ordinary par edits keep the immutable item-history map and original attachment boundary');
    const packRetry = await page.evaluate(async ({ target, incoming }) => {
      const store = window.__existingSplitStore, supplier = await store.load(target);
      await store.saveCatalogue(target, supplier.v, { items: supplier.items.map(item => item.id === 'seafood-stock' ? { ...item, pack: 'Saved current 5 kg carton' } : item) }, { action: 'edit', itemId: 'seafood-stock' });
      const before = JSON.stringify(window.__fake.dump());
      try { await store.importCatalogue(incoming); return { saved: true, unchanged: JSON.stringify(window.__fake.dump()) === before, supplier: await store.load(target) }; }
      catch (error) { return { code: error.code, message: error.message }; }
    }, { target: TARGET, incoming: payload(TARGET) });
    ok(packRetry.saved && packRetry.unchanged && packRetry.supplier.historyItems['t-stock'] === 'seafood-stock' && packRetry.supplier.items.find(item => item.id === 'seafood-stock').pack === 'Saved current 5 kg carton', 'a repeated attachment uses its immutable map after a current pack edit and never restores imported details');
  }
  await page.context().close();

  for (const variant of ['different-pack', 'different-original-name', 'swapped-saved-ids', 'ambiguous-items', 'ambiguous-supplier', 'item-id-conflict', 'wrong-history-source']) {
    const extra = fixture(), target = extra[targetKey];
    if (variant === 'different-pack') target.items.find(item => item.id === 'seafood-stock').pack = '10 x 1 kg outer carton';
    if (variant === 'different-original-name') {
      const item = target.items.find(item => item.id === 'seafood-stock'); item.name = item.source.name = 'TEST STOCK 10KG BAG';
    }
    if (variant === 'ambiguous-items') { const duplicate = clone(target.items[1]); duplicate.id = 'second-stock-match'; target.items.push(duplicate); }
    if (variant === 'ambiguous-supplier') extra[F.key(['suppliers', 'duplicate-seafood'])] = { ...clone(target), cutoffId: '' };
    if (variant === 'swapped-saved-ids') {
      target.items[0].id = 't-stock'; target.items[1].id = 't-case';
      extra[targetKey + '/orders/previous'].lines[0].itemId = 't-case';
    }
    if (variant === 'item-id-conflict') {
      const item = target.items[1]; item.id = 't-zero'; item.name = item.source.name = 'TEST UNRELATED SAVED PRODUCT';
      Object.assign(extra[targetKey + '/orders/previous'].lines[0], { itemId: item.id, name: item.name, source: clone(item.source) });
    }
    if (variant === 'wrong-history-source') { target.historyFrom = 'west-bay'; target.historyBefore = target.at - 1000; }
    page = await open(browser, extra);
    const beforeVariant = await dump(page), result = await direct(page, payload(variant === 'ambiguous-supplier' ? INCOMING : TARGET)), after = await dump(page);
    if (variant === 'different-pack' || variant === 'different-original-name') {
      ok(!!result.saved && after[targetKey].items.some(item => item.id === 't-stock') && after[targetKey].items.some(item => item.id === 'seafood-stock') && after[targetKey].historyItems?.['t-stock'] === 't-stock', variant + ': only a complete original name and full pack match can reuse an existing destination item');
      ok(beforeVariant[targetKey].items.every(item => JSON.stringify(after[targetKey].items.find(saved => saved.id === item.id)) === JSON.stringify(item)), variant + ': unmatched existing product records are kept without overwriting their IDs or details');
    } else if (variant === 'swapped-saved-ids' || variant === 'item-id-conflict') {
      const saved = after[targetKey], map = saved.historyItems || {};
      ok(!!result.saved && history(after) === history(beforeVariant) && beforeVariant[targetKey].items.every(item => JSON.stringify(saved.items.find(row => row.id === item.id)) === JSON.stringify(item)), variant + ': independent item numbering preserves every saved target row and own order document');
      if (variant === 'swapped-saved-ids') {
        ok(map['t-stock'] === 't-case' && map['t-case'] === 't-stock', 'swapped saved IDs are matched by complete product identity and retained in the immutable history map');
        if (result.saved) {
          const projection = await page.evaluate(async target => (await window.__existingSplitStore.history(target, 20)).rows.find(order => order.sourceOrderId === 'previous'), TARGET);
          ok(projection?.lines.find(line => line.itemId === 't-case')?.qty === '2 kg' && projection?.lines.find(line => line.itemId === 't-stock')?.qty === '1 case', 'swapped destination IDs receive the correct older parent product quantities');
        }
      } else {
        const copied = map['t-zero'];
        ok(!!result.saved && copied && copied !== 't-zero' && !beforeVariant[targetKey].items.some(item => item.id === copied) && saved.items.find(item => item.id === copied)?.source.name === F.items[1].source.name && new Set(Object.values(map)).size === moved.length, 'an unmatched original ID already used for another target product gets a fresh mapped copy ID without overwriting the saved product');
      }
    } else {
      ok(!result.saved && supplierRecords(after) === supplierRecords(beforeVariant), variant + ': unsafe or ambiguous attachment is refused before any catalogue, audit or order write');
    }
    await page.context().close();
  }

  for (const width of [390, 768, 1280]) {
    page = await open(browser, null, width);
    await page.fill('input[data-sf="qty"][data-i="t-stock"]', '7 kg');
    await page.fill('input[data-sf="stock"][data-i="t-stock"]', '3 kg');
    await preview(page, payload(INCOMING, true));
    const reviewed = await page.evaluate(target => {
      const select = document.querySelector('[data-sf="import-cutoff"][data-sid="' + target + '"]');
      return { count: document.querySelectorAll('.su-import-row').length, cutoff: select?.value };
    }, TARGET);
    ok(reviewed.count === 6 && reviewed.cutoff === TARGET, width + ': the long six-supplier review resolves a unique exact existing supplier name to its saved ID and own reminder');
    const beforeUI = await dump(page);
    await action(page, 'import-apply');
    await L.waitFor(page, () => !document.querySelector('[data-su="import-apply"]') || !!document.querySelector('[role="alert"]') || !!document.querySelector('.su-status'), null, 8000).catch(() => {});
    const afterUI = await dump(page), attached = afterUI[targetKey]?.historyFrom === SOURCE && !afterUI[F.key(['suppliers', INCOMING])];
    ok(attached && history(afterUI) === history(beforeUI), width + ': importing a different incoming supplier ID reuses the existing supplier and leaves both order histories intact');
    const feedback = await visibleFeedback(page, '.su-status');
    ok(attached && feedback.visible && feedback.text.includes(afterUI[sourceKey].name) && feedback.text.includes(afterUI[targetKey].name) && /5/.test(feedback.text) && /1/.test(feedback.text), width + ': applying at the bottom brings both supplier names and their resulting item counts into view');
    if (attached) {
      const counts = value => value.evaluate(({ source, target }) => Object.fromEntries(Array.from(document.querySelectorAll('.su-pick')).filter(button => [source, target].includes(button.dataset.sid)).map(button => [button.dataset.sid, button.querySelector('small')?.textContent])), { source: SOURCE, target: TARGET });
      const initialCounts = await counts(page);
      ok(initialCounts[SOURCE] === '1' && initialCounts[TARGET] === '5', width + ': successful import immediately updates the combined catalogue to one item and the existing separate catalogue from two to five');
      await action(page, 'order-mode');
      await selectSupplier(page, TARGET);
      await L.waitFor(page, () => document.querySelector('input[data-sf="qty"][data-i="seafood-stock"]')?.placeholder === '11 kg' && document.querySelector('input[data-sf="qty"][data-i="seafood-case"]')?.placeholder === '1 case', null, 5000).catch(() => {});
      ok(await page.getAttribute('input[data-sf="qty"][data-i="seafood-stock"]', 'placeholder') === '11 kg' && await page.getAttribute('input[data-sf="qty"][data-i="seafood-case"]', 'placeholder') === '1 case', width + ': opening the attached sheet shows each item\'s latest own or inherited quantity without tapping More history');
      ok(await page.inputValue('input[data-sf="qty"][data-i="seafood-stock"]') === '7 kg' && await page.inputValue('input[data-sf="stock"][data-i="seafood-stock"]') === '3 kg', width + ': typed original quantities and stock follow the immutable parent-to-saved-item map');
      ok((await page.$$eval('.su-row', rows => rows.map(row => row.dataset.item))).join() === moved.map(id => targetIds[id]).join(), width + ': the separate sheet keeps saved destination item IDs in the reviewed split order');
      await action(page, 'refresh');
      await L.waitFor(page, () => !document.querySelector('[data-su="refresh"][disabled]') && !!document.querySelector('input[data-sf="qty"]'), null, 5000);
      const refreshed = await dump(page), currentCounts = await counts(page);
      ok(currentCounts[SOURCE] === '1' && currentCounts[TARGET] === '5' && refreshed[targetKey].historyFrom === SOURCE && !refreshed[F.key(['suppliers', INCOMING])], width + ': source and target counts and the attached identity remain correct after Refresh');
      ok(!(await L.overflow(page)) && page.errors.length === 0, width + ': the refreshed attached supplier fits the screen without script errors');
      if (width === 390) {
        const beforeNoOp = supplierRecords(await dump(page));
        await preview(page, payload(INCOMING, true));
        await action(page, 'import-apply');
        await L.waitFor(page, () => !document.querySelector('[data-su="import-apply"]'), null, 8000);
        const noOp = await visibleFeedback(page, '#su-import-status');
        ok(noOp.visible && /already up to date|no changes/i.test(noOp.text) && !/catalogue saved/i.test(noOp.text), 'reapplying the same reviewed file gives a visible no-change result');
        ok(supplierRecords(await dump(page)) === beforeNoOp, 'a no-change UI import adds no supplier revision, audit or order');
      }
    }
    await page.context().close();
  }

  const newerParent = fixture();
  newerParent[targetKey + '/orders/previous'].at = L.NOW - 5 * 86400000;
  page = await open(browser, newerParent);
  const newerResult = await direct(page, payload(TARGET));
  if (newerResult.saved) {
    const newest = await page.evaluate(async target => (await window.__existingSplitStore.history(target, 2)).rows, TARGET);
    ok(newest[0]?.sourceOrderId === 'previous' && newest[0]?.lines.find(line => line.itemId === 'seafood-stock')?.qty === '2 kg' && newest[1]?.id === 'previous', 'history merges by time so a newer combined order supplies the latest quantity ahead of an older own order');
  } else ok(false, 'history merges by time after attaching an existing supplier: ' + newerResult.message);
  await page.context().close();

  const interleaved = fixture(), ownTemplate = clone(interleaved[targetKey + '/orders/previous']), parentTemplate = clone(interleaved[sourceKey + '/orders/previous']);
  Object.keys(interleaved).filter(key => /\/suppliers\/[^/]+\/orders\//.test(key)).forEach(key => { delete interleaved[key]; });
  for (const [id, offset] of [['own-a', 1000], ['own-c', 3000], ['own-e', 5000]]) interleaved[targetKey + '/orders/' + id] = { ...clone(ownTemplate), at: L.NOW - offset };
  for (const [id, offset] of [['parent-b', 2000], ['parent-d', 3000], ['parent-f', 6000]]) interleaved[sourceKey + '/orders/' + id] = { ...clone(parentTemplate), at: L.NOW - offset };
  page = await open(browser, interleaved);
  const interleavedResult = await direct(page, payload(TARGET));
  if (interleavedResult.saved) {
    const merged = await page.evaluate(async target => {
      window.__fake.bill.length = 0; const pages = []; let cursor = null;
      for (let n = 0; n < 5; n++) {
        const result = await window.__existingSplitStore.history(target, 2, cursor);
        pages.push({ ids: result.rows.map(order => order.id), more: result.more }); cursor = result.cursor;
        if (!result.more) break;
      }
      return { pages, queries: window.__fake.bill.filter(entry => entry.kind === 'lite-query' && /\/orders$/.test(entry.path)) };
    }, TARGET);
    ok(JSON.stringify(merged.pages) === JSON.stringify([
      { ids: ['own-a', 'from:' + SOURCE + ':parent-b'], more: true },
      { ids: ['own-c', 'from:' + SOURCE + ':parent-d'], more: true },
      { ids: ['own-e', 'from:' + SOURCE + ':parent-f'], more: false }
    ]), 'two-stream pagination interleaves every own and inherited order once, breaks equal-time ties with own first and stops exactly at exhaustion');
    ok(merged.queries.length <= 6 && merged.queries.every(query => query.n <= 3), 'three two-row history pages use at most two bounded three-record queries per page');
  } else ok(false, 'interleaved history fixture attaches successfully: ' + interleavedResult.message);
  await page.context().close();

  page = await open(browser);
  await page.fill('input[data-sf="qty"][data-i="t-stock"]', '7 kg');
  await page.fill('input[data-sf="stock"][data-i="t-stock"]', '3 kg');
  await selectSupplier(page, TARGET);
  await page.fill('input[data-sf="qty"][data-i="seafood-stock"]', '9 kg');
  await page.fill('input[data-sf="stock"][data-i="seafood-stock"]', '4 kg');
  await selectSupplier(page, SOURCE);
  await preview(page, payload(INCOMING, true));
  const collisionBefore = supplierRecords(await dump(page));
  await action(page, 'import-apply');
  await L.waitFor(page, () => !!document.querySelector('[role="alert"]'), null, 8000).catch(() => {});
  const collisionError = await visibleFeedback(page, '[role="alert"]');
  ok(collisionError.visible && /draft|typed|quantit|stock/i.test(collisionError.text) && !!(await page.$('[data-su="import-apply"]')), 'conflicting original and mapped destination drafts stop the import with the file kept and a visible explanation');
  ok(supplierRecords(await dump(page)) === collisionBefore && !/saved/i.test(await L.txt(page, '.su-status')), 'mapped draft conflict is detected before any catalogue or history write and never announces Saved');
  await page.context().close();

  const partialExtra = fixture(), partialIncoming = payload(INCOMING, true), west = partialExtra[F.key(['suppliers', 'west-bay'])];
  partialIncoming.suppliers.unshift({ id: 'west-bay', name: west.name, cutoffId: west.cutoffId, items: clone(west.items) });
  page = await open(browser, partialExtra);
  await preview(page, partialIncoming);
  const partialBefore = await dump(page);
  await page.evaluate(key => { window.__fake.deny = new RegExp('^' + key + '$'); }, F.key(['suppliers', 'review-supplier-2']));
  await action(page, 'import-apply');
  await L.waitFor(page, () => !!document.querySelector('[role="alert"]') && !document.querySelector('[data-su="import-apply"][disabled]'), null, 10000).catch(() => {});
  await L.settle(page, 350);
  const partialError = await visibleFeedback(page, '[role="alert"]'), partialStatus = await L.txt(page, '.su-status'), partialAfter = await dump(page);
  ok(partialError.visible && !!(await page.$('[data-su="import-apply"]')) && /file|import.*kept/i.test(partialStatus), 'a later supplier write failure keeps the review, file and reminder mapping and brings the error into view');
  ok(partialAfter[sourceKey].v === 2 && partialAfter[targetKey].v === 5 && !!partialAfter[F.key(['suppliers', 'review-supplier-1'])] && !partialAfter[F.key(['suppliers', 'review-supplier-2'])] && history(partialAfter) === history(partialBefore), 'partial import reports an acknowledged atomic attachment and the one later saved supplier while leaving failed suppliers and all orders unchanged');
  ok(partialStatus.includes(partialAfter[sourceKey].name) && partialStatus.includes(partialAfter[targetKey].name) && partialStatus.includes('Test review supplier 1') && !partialStatus.includes(west.name) && !partialAfter[F.key(['suppliers', 'west-bay', 'audit', '2'])], 'partial result names only changed suppliers and excludes unchanged entries included in the store result');
  await page.evaluate(() => { window.__fake.deny = null; });
  await action(page, 'import-apply');
  await L.waitFor(page, () => !document.querySelector('[data-su="import-apply"]'), null, 10000);
  const retried = await dump(page), retryStatus = await visibleFeedback(page, '#su-import-status');
  ok(retryStatus.visible && retried[sourceKey].v === partialAfter[sourceKey].v && retried[targetKey].v === partialAfter[targetKey].v && retried[targetKey].historyBefore === partialAfter[targetKey].historyBefore && !!retried[F.key(['suppliers', 'review-supplier-4'])], 'retry completes the retained file without repeating the acknowledged attachment or moving its history boundary');
  await page.context().close();

  for (const variant of ['reminder-conflict', 'refused-write']) {
    const extra = fixture(), incoming = payload(INCOMING, true);
    if (variant === 'reminder-conflict') incoming.suppliers[1].name = 'Northside Test Frozen Seafood';
    page = await open(browser, extra);
    await preview(page, incoming);
    const original = supplierRecords(await dump(page));
    if (variant === 'refused-write') await page.evaluate(key => { window.__fake.deny = new RegExp('^' + key + '$'); }, targetKey);
    await action(page, 'import-apply');
    await L.waitFor(page, () => !!document.querySelector('[role="alert"]'), null, 8000).catch(() => {});
    const error = await visibleFeedback(page, '[role="alert"]');
    ok(error.visible && !!error.text && !!(await page.$('[data-su="import-apply"]')), variant + ': the failed review stays open with its file retained and its error visible after applying at the bottom');
    ok(supplierRecords(await dump(page)) === original && !/saved/i.test(await L.txt(page, '.su-status')), variant + ': refusal writes nothing and never announces Saved');
    await page.context().close();
  }
  await browser.close();
  if (beforeServer) await new Promise(resolve => beforeServer.close(resolve));
  L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
