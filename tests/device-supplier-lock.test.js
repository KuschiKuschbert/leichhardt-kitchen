// Native supplier drafts stay with their original PIN recorder across a scheduled privacy lock.
// Firebase, supplier records and people are synthetic; every retry goes through the real supplier store.
const L = require('./lib'), F = require('./supplier-fixtures');
const { R, ok } = L.results();
const day = new Date(L.NOW + 10 * 3600000).toISOString().slice(0, 10);
const cutoff = Date.parse(day + 'T04:00:00+10:00');
const catalogueKey = F.key(['suppliers', 'northside']);
const orderPrefix = F.key(['suppliers', 'northside', 'orders']) + '/';
const qty = 'input[data-sf="qty"][data-i="t-stock"]';
const stock = 'input[data-sf="stock"][data-i="t-stock"]';
const dump = p => p.evaluate(() => __fake.dump());
const orders = data => Object.entries(data).filter(([k]) => k.startsWith(orderPrefix) && k.split('/').length === 6);
const action = (p, name, extra = '') => L.choose(p, '[data-su="' + name + '"]' + extra);
const writes = p => p.evaluate(() => __fake.writes.flat().filter(w => /\/(suppliers|supplierlinks)\//.test(w.path)).length);
function fixture() {
  const data = F.fixture();
  // An unlinked supplier is a supported native flow and keeps authentication-day tests independent of reminder dates.
  data[catalogueKey] = { ...data[catalogueKey], cutoffId: '' };
  data[F.key(['config', 'main'])].cutoffs = [];
  return data;
}
async function open(b, who, mode, manage = false, owner = false) {
  const p = await L.open(b, '#/suppliers/northside' + (manage ? '/manage' : ''), {
    who, admin: owner, deviceMode: mode, extra: fixture(), clock: cutoff - 60000, sessionExp: cutoff,
    width: manage ? 1280 : 390, height: 900, touch: !manage, wait: 1500
  });
  await L.waitFor(p, selector => !!document.querySelector(selector), manage ? '[data-su="add"]' : qty, 10000);
  return p;
}
async function lock(p) {
  const remain = await p.evaluate(end => end + 20000 - LK_TIME.now(), cutoff);
  await p.clock.runFor(Math.max(1, remain)); await L.settle(p, 300);
  await L.waitFor(p, () => !LK_PREP.privateAccess(), null, 5000);
  ok(!(await p.locator('[data-sf="qty"],[data-sf="par"],[data-sf="supplierName"]').count()) && !/TEST STOCK 1KG BAG/.test(await p.locator('body').innerText()), '04:00 hides private supplier rows and form values');
}
async function unlock(p, who, returnHash) {
  if (!(await p.locator('#pf1').count())) {
    await p.locator('#supplier-root a[href="#/prep"]').click(); await L.settle(p, 250);
  }
  await p.fill('#pf1', who === 'sam' ? '1111' : '3333');
  await L.waitFor(p, id => LK_PREP.privateAccess() && LK_PREP.state.who === id, who, 8000);
  if (await p.evaluate(() => location.hash) !== returnHash) { await p.evaluate(h => { location.hash = h; }, returnHash); }
  await L.settle(p, 500);
}
async function more(p) {
  if (!(await p.locator('.su-more').evaluate(el => el.open))) await p.locator('.su-more > summary').click();
}
(async () => {
  const b = await L.start(); let p;
  async function step(label, run) {
    try { await run(); }
    catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }

  for (const mode of ['own', 'shared']) await step('Sam quantity and stock ' + mode, async () => {
    p = await open(b, 'sam', mode);
    await p.fill(qty, '2'); await p.locator('[data-item="t-stock"] summary').click(); await p.fill(stock, '3');
    const before = await writes(p);
    await lock(p);
    await p.evaluate(key => {
      const old = __fake.dump()[key];
      __fake.write(key, { ...old, v: old.v + 1, items: old.items.map(i => i.id === 't-stock' ? { ...i, orderUnit: 'cases', parUnit: 'g', factor: 1000 } : i) });
    }, catalogueKey);
    await unlock(p, 'sam', '#/suppliers/northside');
    await L.waitFor(p, selector => !!document.querySelector(selector), qty, 8000);
    ok(await p.inputValue(qty) === '2' && await p.inputValue(stock) === '3', mode + ': the same PIN restores both entered numbers');
    if (!(await p.locator('[data-item="t-stock"] .su-item').evaluate(el => el.open))) await p.locator('[data-item="t-stock"] summary').click();
    const labels = { quantity: await p.locator('[data-item="t-stock"] .su-qty').innerText(), stock: await p.locator('[data-item="t-stock"] .su-item-more').innerText() };
    const captured = /Order unit: kg/i.test(labels.quantity) && /Stock counted for this order \(kg\)/i.test(labels.stock);
    ok(captured, mode + ': captured quantity and stock units survive a catalogue unit change' + (captured ? '' : ' ' + JSON.stringify(labels)));
    ok(await writes(p) === before && orders(await dump(p)).length === 2, mode + ': unlocking never automatically records or saves supplier work');
    await action(p, 'review'); await L.waitFor(p, () => !!document.querySelector('[data-su="record"]'));
    ok(/2 kg/.test(await p.locator('.su-review .su-lines').innerText()), mode + ': a fresh review uses the captured quantity unit');
    await action(p, 'record'); await L.waitFor(p, prefix => Object.keys(__fake.dump()).filter(k => k.startsWith(prefix)).length === 3, orderPrefix, 8000);
    const saved = orders(await dump(p)).find(([k]) => !/\/(previous|older)$/.test(k));
    ok(saved && saved[1].by === 'sam' && saved[1].lines[0].unit === 'kg' && saved[1].lines[0].stock === '3 kg', mode + ': only explicit recording saves Sam\'s reviewed units and stock');
  });

  for (const mode of ['own', 'shared']) for (const kind of ['par', 'manual', 'supplier']) await step('Bo ' + kind + ' form ' + mode, async () => {
    const owner = mode === 'own' && kind === 'par';
    p = await open(b, 'bo', mode, true, owner);
    if (owner) await L.waitFor(p, () => LK_PREP.state.level === 'owner', null, 8000);
    if (kind === 'par') { await action(p, 'edit', '[data-i="t-stock"]'); await p.fill('[data-sf="par"]', '12'); }
    if (kind === 'manual') {
      await action(p, 'add'); await p.fill('[data-sf="name"]', 'TEST DAILY RETAINED MANUAL ITEM'); await p.fill('[data-sf="par"]', '2.5');
      await more(p); await p.fill('[data-sf="pack"]', '6 x 250 g carton'); await p.fill('[data-sf="orderUnit"]', 'carton');
    }
    if (kind === 'supplier') { await action(p, 'supplier-settings'); await p.fill('[data-sf="supplierName"]', 'Northside Test Foods revised'); }
    const before = await writes(p), historical = JSON.stringify((await dump(p))[orderPrefix + 'previous']);
    await lock(p);
    if (kind === 'par') await p.evaluate(key => {
      const old = __fake.dump()[key]; __fake.write(key, { ...old, v: 2, items: old.items.map(i => i.id === 't-zero' ? { ...i, par: '77' } : i) });
    }, catalogueKey);
    await unlock(p, 'bo', '#/suppliers/northside/manage');
    if (owner) await L.waitFor(p, () => LK_PREP.state.level === 'owner', null, 8000);
    const field = kind === 'supplier' ? '[data-sf="supplierName"]' : '[data-sf="par"]';
    await L.waitFor(p, s => !!document.querySelector(s), field, 8000);
    ok(await p.inputValue(field) === (kind === 'par' ? '12' : kind === 'manual' ? '2.5' : 'Northside Test Foods revised'), mode + ' ' + kind + ': the same head PIN restores the unsaved form');
    if (kind === 'manual') ok(await p.inputValue('[data-sf="name"]') === 'TEST DAILY RETAINED MANUAL ITEM' && await p.inputValue('[data-sf="pack"]') === '6 x 250 g carton' && await p.inputValue('[data-sf="orderUnit"]') === 'carton', mode + ': manual item name, pack and unit remain together');
    ok(await writes(p) === before, mode + ' ' + kind + ': unlocking performs no catalogue writes');
    await action(p, kind === 'supplier' ? 'save-supplier' : 'save-item'); await L.settle(p, 350);
    if (kind === 'par') {
      ok((await dump(p))[catalogueKey].v === 2 && await p.inputValue(field) === '12' && !!(await p.$('[data-su="reload-form"]')), mode + ': retained editor keeps its original revision and rejects a stale overwrite');
      await action(p, 'reload-form'); await L.settle(p, 300);
      ok(await p.inputValue(field) === '12', mode + ': loading the latest catalogue preserves the explicit par edit');
      await action(p, 'save-item');
    }
    await L.waitFor(p, a => __fake.dump()[a.key].v === a.v, { key: catalogueKey, v: kind === 'par' ? 3 : 2 }, 8000);
    const data = await dump(p), catalogue = data[catalogueKey];
    if (kind === 'par') ok(catalogue.items.find(i => i.id === 't-stock').par === '12' && catalogue.items.find(i => i.id === 't-stock').source.par === '10' && catalogue.items.find(i => i.id === 't-zero').par === '77', mode + ': explicit fresh retry keeps both chefs\' changes and the original PDF par');
    if (kind === 'manual') ok(catalogue.items.filter(i => i.name === 'TEST DAILY RETAINED MANUAL ITEM').length === 1 && catalogue.items.some(i => i.name === 'TEST DAILY RETAINED MANUAL ITEM' && i.manual && !i.source.file), mode + ': explicit save creates one manual item with manual provenance');
    if (kind === 'supplier') ok(catalogue.name === 'Northside Test Foods revised' && catalogue.cutoffId === '', mode + ': explicit save retains the supplier form values');
    ok(JSON.stringify(data[orderPrefix + 'previous']) === historical, mode + ' ' + kind + ': recorded historical quantities remain unchanged');
  });

  for (const [mode, stale] of [['own', false], ['shared', false], ['shared', true]]) await step('pending native record ' + mode + (stale ? ' stale catalogue' : ''), async () => {
    p = await open(b, 'sam', mode); await p.fill(qty, '6 kg'); await action(p, 'review');
    await L.waitFor(p, () => !!document.querySelector('[data-su="record"]:not([disabled])'));
    const until = await p.evaluate(end => end - 3000 - LK_TIME.now(), cutoff); if (until > 0) await p.clock.runFor(until);
    await p.evaluate(() => { __fake.liteCommitDelay = 10000; }); await action(p, 'record');
    await L.waitFor(p, prefix => __fake.reads.some(path => path.startsWith(prefix + 'o-')), orderPrefix, 5000);
    const id = await p.evaluate(prefix => __fake.reads.find(path => path.startsWith(prefix + 'o-')).slice(prefix.length), orderPrefix);
    await p.clock.runFor(20000); await L.settle(p, 300);
    ok(!await p.evaluate(() => LK_PREP.privateAccess()) && orders(await dump(p)).length === 2, mode + ': the old context cannot record after its daily PIN expires');
    const attempts = await writes(p); await p.evaluate(() => { __fake.liteCommitDelay = 0; });
    if (stale) await p.evaluate(key => { const old = __fake.dump()[key]; __fake.write(key, { ...old, v: 2 }); }, catalogueKey);
    await unlock(p, 'sam', '#/suppliers/northside');
    await L.waitFor(p, () => !!document.querySelector('[data-su="record"]:not([disabled])'), null, 8000);
    ok(/6 kg/.test(await p.locator('.su-review .su-lines').innerText()), mode + ': context rejection restores the review and ends Recording');
    ok(await writes(p) === attempts && orders(await dump(p)).length === 2, mode + ': a fresh PIN never retries the pending supplier transaction automatically');
    await action(p, 'record');
    if (stale) {
      await L.waitFor(p, () => /catalogue changed/i.test((document.getElementById('su-order-error') || {}).textContent || ''), null, 8000);
      ok(orders(await dump(p)).length === 2 && !(await p.locator('.wtop [data-act="back"]').isDisabled()), 'stale pending review rejects the old revision and releases Back after checking the original ID');
      await p.locator('.wtop [data-act="back"]').click();
      await L.waitFor(p, selector => !!document.querySelector(selector), qty, 5000);
      ok(await p.inputValue(qty) === '6 kg', 'stale pending review returns to the retained draft for a fresh review');
      await action(p, 'review'); await L.waitFor(p, () => !!document.querySelector('[data-su="record"]:not([disabled])'));
      await action(p, 'record');
    }
    await L.waitFor(p, key => !!__fake.dump()[key], orderPrefix + id, 8000);
    const saved = orders(await dump(p));
    ok(saved.length === 3 && saved.some(([k, v]) => k === orderPrefix + id && v.by === 'sam' && v.lines[0].qty === '6 kg'), mode + ': explicit retry checks and saves the same retained order ID exactly once');
    ok(await p.evaluate(a => __fake.reads.filter(k => k === a.path).length >= a.n, { path: orderPrefix + id, n: stale ? 3 : 2 }), mode + ': fresh retry checks the original ID before writing');
  });

  await step('wrong PIN and confirmed shared handover', async () => {
    p = await open(b, 'sam', 'shared'); await p.fill(qty, '7 kg'); await lock(p);
    if (!(await p.$('#pf1'))) { await p.locator('#supplier-root a[href="#/prep"]').click(); await L.settle(p, 250); }
    await p.fill('#pf1', '3333'); await L.settle(p, 500);
    ok(await p.evaluate(() => !LK_PREP.privateAccess() && LK_PREP.workLock().person === 'sam') && await p.evaluate(() => LK_SUP.hasDraft()), 'Bo\'s PIN cannot unlock Sam\'s retained supplier work');
    await p.click('[data-p="who-change"]'); await L.settle(p, 150);
    ok(!!(await p.$('#pf1')) && await p.evaluate(() => LK_SUP.hasDraft()), 'first Not me asks for confirmation and retains the original draft');
    await p.click('[data-p="who-change"]'); await L.settle(p, 300);
    ok(await p.evaluate(() => !LK_SUP.hasDraft() && !LK_PREP.privateAccess()), 'confirmed handover clears retained supplier work before another name is chosen');
    await p.click('.p-name[data-id="bo"]'); await L.settle(p, 200); await p.fill('#pf1', '3333');
    await L.waitFor(p, () => LK_PREP.privateAccess() && LK_PREP.state.who === 'bo', null, 8000);
    await p.evaluate(() => { location.hash = '#/suppliers/northside'; }); await L.settle(p, 500);
    await L.waitFor(p, s => !!document.querySelector(s), qty, 8000);
    ok(await p.inputValue(qty) === '' && orders(await dump(p)).length === 2, 'the next chef sees a fresh draft and no order recorded by the previous person');
  });

  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
