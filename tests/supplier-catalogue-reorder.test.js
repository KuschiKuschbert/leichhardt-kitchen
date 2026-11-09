// Complete private catalogue imports keep live item identities and details while adopting the supplied sequence.
// Every supplier and product in this file is synthetic.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const key = F.key(['suppliers', 'northside']);
const qty = id => 'input[data-sf="qty"][data-i="' + id + '"]';
const stock = id => 'input[data-sf="stock"][data-i="' + id + '"]';
const clone = value => JSON.parse(JSON.stringify(value));
const action = (p, name) => L.choose(p, '[data-su="' + name + '"]');
const dump = p => p.evaluate(() => window.__fake.dump());
const records = value => JSON.stringify(Object.entries(value).filter(([path]) => /\/suppliers(?:\/|$)|\/supplierlinks\//.test(path)).sort(([a], [b]) => a.localeCompare(b)));
const history = value => JSON.stringify(Object.entries(value).filter(([path]) => /\/suppliers\/[^/]+\/orders\//.test(path)).sort(([a], [b]) => a.localeCompare(b)));
function fixture() {
  const extra = clone(F.fixture());
  extra[key].items[0].par = '19.50';
  extra[key].items[0].aliases = ['Current matching name'];
  delete extra[key].items[1].aliases;
  return extra;
}
function payload() {
  const extra = clone(F.fixture());
  const suppliers = Object.entries(extra).filter(([path]) => /\/suppliers\/[^/]+$/.test(path)).map(([path, value]) => ({ ...value, id: path.split('/').pop() }));
  const north = suppliers.find(s => s.id === 'northside');
  const added = clone(north.items[1]);
  added.id = 'new-product'; added.name = 'TEST NEW CATALOGUE PRODUCT'; added.source.name = added.name; added.source.row = 2;
  north.items = [north.items[3], added, north.items[0], north.items[1]];
  north.name = 'Outdated supplier label'; north.cutoffId = '';
  return { version: 1, suppliers };
}
async function open(browser, width, extra) {
  const page = await L.open(browser, '#/suppliers/northside', { who: 'bo', width: width || 390, extra: extra || fixture(), wait: 1400 });
  await L.waitFor(page, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  return page;
}
async function importFile(page, value) {
  await page.setInputFiles('[data-sf="import"]', { name: 'synthetic-complete-catalogue.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
  await L.waitFor(page, () => /Review catalogue import/.test(document.querySelector('#rtitle')?.textContent || ''), null, 5000);
}

(async () => {
  const browser = await L.start();
  let page;
  for (const width of [390, 768, 1280]) {
    page = await open(browser, width);
    const before = await dump(page), incoming = payload();
    await page.fill(qty('t-stock'), '7 kg'); await page.fill(stock('t-stock'), '3 kg');
    await action(page, 'manage'); await importFile(page, incoming);
    ok(records(await dump(page)) === records(before), width + ': reviewing the complete catalogue writes nothing');
    ok(!(await L.overflow(page)), width + ': full catalogue review fits the viewport');
    await action(page, 'import-apply');
    await L.waitFor(page, path => window.__fake.dump()[path].v === 2 && !document.querySelector('[data-su="import-apply"]'), key, 10000);
    const after = await dump(page), saved = after[key];
    ok(saved.items.map(i => i.id).join() === 't-case,new-product,t-stock,t-zero,t-unset,t-long,t-safe', width + ': incoming sequence includes new products in place and retains unlisted live items afterwards');
    ok(before[key].items.every(item => JSON.stringify(item) === JSON.stringify(saved.items.find(i => i.id === item.id))), width + ': raw saved fields, unit spellings and current pars survive the older import file');
    ok(saved.name === before[key].name && saved.cutoffId === before[key].cutoffId, width + ': current supplier label and reviewed existing reminder link are retained');
    ok(history(after) === history(before), width + ': immutable previous orders and quantities are unchanged');
    ok(after[key + '/audit/2']?.action === 'import' && JSON.stringify(after[key + '/audit/2'].before.items) === JSON.stringify(before[key].items), width + ': import audit contains the complete raw catalogue before the sequence change');
    await action(page, 'order-mode');
    await L.waitFor(page, () => !!document.querySelector('input[data-sf="qty"]'), null, 5000);
    ok(await page.inputValue(qty('t-stock')) === '7 kg' && await page.inputValue(stock('t-stock')) === '3 kg', width + ': typed quantities and stock stay attached to their stable item ID');
    ok(await page.$eval(qty('t-stock'), el => el.placeholder) === '2 kg' && /2 kg/.test(await L.txt(page, '[data-item="t-stock"] .su-last')), width + ': last ordered amount remains on its original item after its position changes');
    ok((await page.$$eval('.su-row', rows => rows.map(row => row.dataset.item))).join() === saved.items.map(i => i.id).join(), width + ': actual order sheet uses the new saved sequence');
    const repeated = await page.evaluate(async value => window.LK_SUP_STORE.create(window.LK_PREP.supplier()).importCatalogue(value), incoming);
    ok(repeated.find(s => s.id === 'northside').v === 2 && records(await dump(page)) === records(after), width + ': repeating the full import is a no-op with no audit or revision');
    ok(!(await L.overflow(page)) && page.errors.length === 0, width + ': reordered sheet fits and has no JavaScript errors');
    await page.context().close();
  }

  page = await open(browser);
  let before = records(await dump(page));
  const altered = await page.evaluate(async () => {
    const store = window.LK_SUP_STORE.create(window.LK_PREP.supplier()), supplier = await store.load('northside');
    supplier.items[0].par = '99';
    try { await store.saveCatalogue(supplier.id, supplier.v, { items: supplier.items }, { action: 'import' }); return 'saved'; }
    catch (error) { return error.code; }
  });
  ok(altered === 'invalid' && records(await dump(page)) === before, 'direct import saves cannot disguise edits to existing current pars');
  before = records(await dump(page));
  const moved = payload();
  moved.suppliers[0].items.push(clone(moved.suppliers[1].items[0]));
  const movedResult = await page.evaluate(async value => {
    try { await window.LK_SUP_STORE.create(window.LK_PREP.supplier()).importCatalogue(value); return 'saved'; }
    catch (error) { return error.code; }
  }, moved);
  ok(movedResult === 'invalid' && records(await dump(page)) === before, 'an existing item ID cannot be introduced into another supplier');
  before = records(await dump(page));
  const changedSource = payload(); changedSource.suppliers[0].items[0].source.par = '888';
  const sourceResult = await page.evaluate(async value => {
    try { await window.LK_SUP_STORE.create(window.LK_PREP.supplier()).importCatalogue(value); return 'saved'; }
    catch (error) { return error.code; }
  }, changedSource);
  ok(sourceResult === 'immutable' && records(await dump(page)) === before, 'existing imported source records remain immutable before any supplier is written');
  const remapped = await page.evaluate(async value => window.LK_SUP_STORE.create(window.LK_PREP.supplier()).importCatalogue(value, { northside: '' }), payload());
  ok(remapped.find(s => s.id === 'northside').cutoffId === '' && (await dump(page))[key].cutoffId === '', 'the explicitly reviewed reminder mapping can still change during an import');
  const addedSupplier = clone(payload().suppliers[1]);
  addedSupplier.id = 'brand-new-supplier'; addedSupplier.name = 'TEST NEW SUPPLIER'; addedSupplier.items[0].id = 'brand-new-item';
  const created = await page.evaluate(async value => window.LK_SUP_STORE.create(window.LK_PREP.supplier()).importCatalogue(value), { version: 1, suppliers: [addedSupplier] });
  ok(created[0].id === addedSupplier.id && created[0].v === 1 && (await dump(page))[F.key(['suppliers', addedSupplier.id])].items[0].id === 'brand-new-item', 'a complete catalogue can still add a supplier with genuinely new item IDs');
  await page.context().close();

  const incomplete = fixture(); incomplete[F.key(['suppliers', 'west-bay'])].items[0].source.page = 0;
  page = await open(browser, 390, incomplete);
  await L.waitFor(page, () => !!document.querySelector('.su-unread'), null, 5000);
  before = records(await dump(page));
  const unread = await page.evaluate(async value => {
    try { await window.LK_SUP_STORE.create(window.LK_PREP.supplier()).importCatalogue(value); return { code: 'saved' }; }
    catch (error) { return { code: error.code, message: error.message }; }
  }, payload());
  ok(unread.code === 'invalid' && /read|incomplete/i.test(unread.message || '') && records(await dump(page)) === before, 'an unreadable live supplier blocks the entire full import before any catalogue or audit write');
  await page.context().close();
  await browser.close(); L.report(R);
})().catch(error => { console.log(R.join('\n')); console.error(error); process.exit(1); });
