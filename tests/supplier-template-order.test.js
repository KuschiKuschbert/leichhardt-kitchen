// Private template imports reorder existing IDs only. All records here are synthetic.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const key = F.key(['suppliers', 'northside']);
const qty = id => 'input[data-sf="qty"][data-i="' + id + '"]';
const stock = id => 'input[data-sf="stock"][data-i="' + id + '"]';
const action = (p, name) => L.choose(p, '[data-su="' + name + '"]');
const dump = p => p.evaluate(() => window.__fake.dump());
const records = s => JSON.stringify(Object.entries(s).filter(([k]) => /\/suppliers(?:\/|$)|\/supplierlinks\//.test(k)).sort(([a], [b]) => a.localeCompare(b)));
const history = s => JSON.stringify(Object.entries(s).filter(([k]) => /\/suppliers\/[^/]+\/orders\//.test(k)).sort(([a], [b]) => a.localeCompare(b)));
const payload = { version: 1, kind: 'supplier-template-order', templates: [{ file: 'renamed-template.pdf', items: [3, 0, 5].map(n => ({ name: F.items[n].source.name, pack: F.items[n].pack })) }] };
async function open(b, width, extra) {
  const p = await L.open(b, '#/suppliers/northside', { who: 'bo', width: width || 390, extra: extra || F.fixture(), wait: 1400 });
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  return p;
}
async function importFile(p, value) {
  await p.setInputFiles('[data-sf="import"]', { name: 'private-template-order.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
  await L.settle(p, 200);
}
async function review(p, value) {
  await importFile(p, value || payload);
  await L.waitFor(p, () => /Review template order/.test(document.querySelector('#rtitle')?.textContent || ''), null, 5000);
}
async function visibility(p) {
  await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 200);
  return p.evaluate(() => {
    const bottom = document.querySelector('.su-order-actions').getBoundingClientRect().top;
    const top = document.querySelector('.wtop').getBoundingClientRect().bottom;
    return [...document.querySelectorAll('.su-row .su-item > summary')].filter(e => { const r = e.getBoundingClientRect(); return r.top >= top && r.bottom <= bottom; }).length;
  });
}

(async () => {
  const b = await L.start();
  let p;
  for (const width of [390, 768, 1280]) {
    p = await open(b, width);
    const before = await dump(p), visibleBefore = await visibility(p);
    await p.fill(qty('t-stock'), '7 kg'); await p.fill(stock('t-stock'), '3 kg');
    await action(p, 'manage');
    await review(p);
    ok(records(await dump(p)) === records(before), width + ': selecting the file and reviewing writes nothing');
    ok(/3 template items.*3 other existing items kept at the end/.test(await L.txt(p, '.su-editor')), width + ': preview names matched and retained counts');
    ok(!(await p.$('img[onerror]')), width + ': names in the sequence preview are escaped');
    ok(!(await L.overflow(p)), width + ': template review has no sideways scroll');
    await action(p, 'import-apply');
    await L.waitFor(p, k => window.__fake.dump()[k].v === 2 && !document.querySelector('[data-su="import-apply"]'), key, 10000);
    const after = await dump(p), catalogue = after[key];
    ok(catalogue.items.map(i => i.id).join() === 't-case,t-stock,t-safe,t-zero,t-unset,t-long', width + ': exact template sequence then existing unlisted items');
    ok(before[key].items.every(i => JSON.stringify(i) === JSON.stringify(catalogue.items.find(x => x.id === i.id))), width + ': all IDs, names, pars, units, aliases and source records stay unchanged');
    ok(history(after) === history(before), width + ': previous orders and their quantities remain byte-for-byte unchanged');
    ok(catalogue.cutoffId === before[key].cutoffId && after[key + '/audit/2']?.action === 'reorder', width + ': reminder link retained and reorder has its own audit');
    ok(/Template order saved/.test(await L.txt(p, '#supplier-root')), width + ': acknowledged save confirms the template update');
    await action(p, 'order-mode');
    await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 5000);
    ok(await p.$eval(qty('t-stock'), e => e.value) === '7 kg' && await p.$eval(stock('t-stock'), e => e.value) === '3 kg', width + ': typed quantity and stock count survive the reorder');
    ok(await p.$eval(qty('t-stock'), e => e.placeholder) === '2 kg' && /2 kg/.test(await L.txt(p, '[data-item="t-stock"] .su-last')), width + ': previous amount still belongs to the same stable item');
    ok(/2 bags/.test(await L.txt(p, '[data-item="t-zero"] .su-last')) && !!(await p.$('[data-item="t-zero"] .su-last time')), width + ': an item omitted from the latest batch keeps its own earlier purchase and date after reordering');
    ok((await p.$$eval('.su-row', rows => rows.map(e => e.dataset.item))).join() === catalogue.items.map(i => i.id).join(), width + ': actual supplier sheet follows saved array sequence');
    ok(!(await L.overflow(p)) && p.errors.length === 0, width + ': reordered order sheet fits without page errors');
    if (width === 390) {
      const visibleAfter = await visibility(p);
      console.log('MEASURE template order: fully visible supplier item headings at 390 px ' + visibleBefore + ' before, ' + visibleAfter + ' after; reaching a To order box remains one field tap.');
    }
    await action(p, 'manage'); await review(p);
    ok(await p.$eval('[data-su="import-apply"]', e => e.disabled), width + ': applying an already matched sequence is disabled');
    const repeat = await p.evaluate(async data => {
      const store = window.LK_SUP_STORE.create(window.LK_PREP.supplier());
      return store.applyTemplateOrder(data, { northside: 2 });
    }, payload);
    ok(repeat.saved.length === 0 && repeat.unchanged.length === 1 && records(await dump(p)) === records(after), width + ': repeated update creates no extra revision or audit');
    await p.context().close();
  }

  // Unknown and repeated references cannot create items or partly reorder the catalogue.
  for (const [label, bad] of [
    ['missing', { version: 1, kind: payload.kind, templates: [{ file: 'test.pdf', items: [{ name: 'NO SUCH TEST PRODUCT', pack: '' }] }] }],
    ['duplicate', { version: 1, kind: payload.kind, templates: [{ file: 'test.pdf', items: [payload.templates[0].items[0], payload.templates[0].items[0]] }] }]
  ]) {
    p = await open(b); const before = records(await dump(p)); await action(p, 'manage'); await importFile(p, bad);
    await L.waitFor(p, () => !!document.querySelector('.su-error'), null, 5000);
    ok(!(await p.$('[data-su="import-apply"]')) && records(await dump(p)) === before, label + ': named matching failure has no apply action and writes nothing');
    ok(/test|product|item|template/i.test(await L.txt(p, '.su-error')), label + ': matching failure explains which source needs checking');
    await p.context().close();
  }

  p = await open(b);
  const staleBefore = records(await dump(p));
  const twoSuppliers = JSON.parse(JSON.stringify(payload));
  twoSuppliers.templates.push({ file: 'another-template.pdf', items: [{ name: 'TEST OTHER SUPPLIER PRODUCT', pack: '1 kg bag' }] });
  const stale = await p.evaluate(async data => {
    try { await window.LK_SUP_STORE.create(window.LK_PREP.supplier()).applyTemplateOrder(data, { northside: 1, 'west-bay': 99 }); return 'saved'; }
    catch (e) { return e.code; }
  }, twoSuppliers);
  ok(stale === 'stale' && records(await dump(p)) === staleBefore, 'all reviewed supplier revisions are checked before the first write');
  const changedPar = await p.evaluate(async () => {
    const store = window.LK_SUP_STORE.create(window.LK_PREP.supplier()), supplier = await store.load('northside');
    supplier.items[0].par = '77';
    try { await store.saveCatalogue('northside', supplier.v, { items: supplier.items }, { action: 'reorder' }); return 'saved'; }
    catch (e) { return e.code || 'refused'; }
  });
  ok(changedPar !== 'saved' && records(await dump(p)) === staleBefore, 'a direct reorder save refuses a changed par instead of disguising an item edit');
  await action(p, 'manage'); await review(p);
  await p.evaluate(() => { window.__fake.deny = /\/suppliers\/northside$/; });
  await action(p, 'import-apply');
  await L.waitFor(p, () => !!document.querySelector('.su-error') && !!document.querySelector('[data-su="import-apply"]:not([disabled])'), null, 10000);
  ok(records(await dump(p)) === staleBefore && /Review template order/.test(await L.txt(p, '#rtitle')), 'refused save keeps the template review and all stored records');
  await p.evaluate(() => { window.__fake.deny = null; }); await action(p, 'import-apply');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, key, 10000);
  ok((await dump(p))[key + '/audit/2']?.action === 'reorder' && !(await dump(p))[key + '/audit/3'], 'explicit retry after refusal saves exactly one catalogue revision');
  await p.context().close();

  // A skipped unreadable supplier could contain another match. Require the whole catalogue before matching.
  const incomplete = F.fixture();
  incomplete[F.key(['suppliers', 'west-bay'])].items[0].source.page = 0;
  p = await open(b, 390, incomplete);
  await L.waitFor(p, () => !!document.querySelector('.su-unread'), null, 5000);
  const incompleteBefore = records(await dump(p));
  const unread = await p.evaluate(async data => {
    try { await window.LK_SUP_STORE.create(window.LK_PREP.supplier()).applyTemplateOrder(data, { northside: 1 }); return 'saved'; }
    catch (e) { return e.code; }
  }, payload);
  ok(unread === 'invalid' && records(await dump(p)) === incompleteBefore, 'store refuses template matching when any catalogue supplier is unreadable, even if the target is readable');
  await action(p, 'manage'); await importFile(p, payload);
  await L.waitFor(p, () => !!document.querySelector('#su-order-error'), null, 5000);
  const incompleteReason = await L.txt(p, '#su-order-error');
  ok(/catalogue|supplier/i.test(incompleteReason) && /read|incomplete/i.test(incompleteReason), 'import explains why the incomplete catalogue must be checked first');
  ok(!(await p.$('[data-su="import-apply"]')) && !/Review template order/.test(await L.txt(p, '#rtitle')) && records(await dump(p)) === incompleteBefore, 'incomplete catalogue cannot open an apply review or write a partial template update');
  await p.context().close();

  p = await L.open(b, '#/suppliers/northside', { who: 'sam', extra: F.fixture(), wait: 1400 });
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  ok(!(await p.$('[data-sf="import"]')), 'sous chefs cannot access the private template import');
  const denied = await p.evaluate(async data => {
    try { await window.LK_SUP_STORE.create(window.LK_PREP.supplier()).applyTemplateOrder(data, { northside: 1 }); return 'saved'; }
    catch (e) { return e.code; }
  }, payload);
  ok(denied === 'permission' && (await dump(p))[key].v === 1, 'store enforces catalogue permission even when called directly');
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
