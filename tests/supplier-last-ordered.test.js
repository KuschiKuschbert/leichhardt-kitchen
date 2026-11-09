// Last ordered means this item's most recent recorded purchase, with honest limits on the history read.
// All products, orders and people are synthetic and use the Firebase stand-in.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const copy = value => JSON.parse(JSON.stringify(value));
const orderPrefix = F.key(['suppliers', 'northside', 'orders']) + '/';
const qty = id => 'input[data-sf="qty"][data-i="' + id + '"]';
const last = id => '[data-item="' + id + '"] .su-last';
const action = (p, cmd) => L.choose(p, '[data-su="' + cmd + '"]');
const dateLabel = at => new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', ...(new Date(at).getFullYear() !== new Date(L.NOW).getFullYear() ? { year: 'numeric' } : {}) }).format(new Date(at));
const historyBills = p => p.evaluate(path => window.__fake.bill.filter(x => x.kind === 'lite-query' && x.path === path), orderPrefix.slice(0, -1));
async function ready(p) {
  await L.waitFor(p, selector => !!document.querySelector(selector), qty('t-stock'), 15000);
}
async function read(p) {
  await L.waitFor(p, selector => !!document.querySelector(selector + ' time'), last('t-stock'), 10000);
}
async function open(b, extra, options) {
  const p = await L.open(b, '#/suppliers/northside', Object.assign({ who: 'bo', width: 1280, extra, wait: 1500 }, options || {}));
  await ready(p); return p;
}
function recentFixture() {
  const seed = copy(F.fixture());
  const previous = seed[orderPrefix + 'previous'], older = seed[orderPrefix + 'older'];
  // 00:30 on 1 January in Queensland is still 31 December in UTC.
  previous.at = Date.UTC(new Date(L.NOW).getUTCFullYear(), 0, 0, 14, 30);
  previous.day = L.ymd(new Date(previous.at));
  previous.deliveryDay = previous.day.replace(/-01-01$/, '-01-03');
  older.at = previous.at - 9 * 86400000; older.day = L.ymd(new Date(older.at));
  // An identically named old product must never be matched by name to a different stable ID.
  previous.lines.push(Object.assign(copy(previous.lines[0]), { itemId: 'retired-product', name: F.items[4].name, qty: '9 kg', amount: 9 }));
  return seed;
}
function pagedFixture() {
  const seed = copy(F.fixture()), template = copy(seed[orderPrefix + 'previous']);
  delete seed[orderPrefix + 'previous']; delete seed[orderPrefix + 'older'];
  for (let n = 0; n < 22; n++) {
    const order = copy(template);
    order.at = L.NOW - (n + 1) * 86400000; order.day = L.ymd(new Date(order.at));
    order.lines = [Object.assign(copy(template.lines[0]), { qty: (n + 1) + ' kg', amount: n + 1 })];
    if (n === 20) {
      const item = F.items[1];
      order.lines.push({ itemId: item.id, name: item.name, pack: item.pack, qty: '8 bags', amount: 8, unit: 'bags', par: item.par, parUnit: item.parUnit, source: copy(item.source), suggestion: '', stock: '' });
    }
    seed[orderPrefix + 'page-' + String(n).padStart(2, '0')] = order;
  }
  return seed;
}
function delayedHistorySDK() {
  const lite = require('fs').readFileSync(require.resolve('./fake/firebase-firestore-lite.js'), 'utf8');
  return lite.replace("export { liteGetDoc as getDoc, liteGetDocs as getDocs } from './firebase-firestore.js';", `
export { liteGetDoc as getDoc } from './firebase-firestore.js';
import { liteGetDocs } from './firebase-firestore.js';
export async function getDocs(ref) {
  const result = await liteGetDocs(ref);
  if (ref.path.join('/').endsWith('/suppliers/northside/orders') && !window.__supplierHistoryWaiting) {
    window.__supplierHistoryWaiting = true;
    await new Promise(resolve => { window.__releaseSupplierHistory = resolve; });
  }
  return result;
}`);
}

(async () => {
  const b = await L.start(); let p;

  for (const width of [390, 768, 1280]) {
    const seed = recentFixture(), previous = seed[orderPrefix + 'previous'], older = seed[orderPrefix + 'older'];
    p = await open(b, seed, { width, settings: width === 390 ? { text: 'xlarge' } : {} }); await read(p);
    const newest = await p.textContent(last('t-stock')), omitted = await p.textContent(last('t-zero'));
    ok(newest.includes('2 kg') && newest.includes(dateLabel(previous.at)), width + ': last ordered shows the latest item quantity and its Queensland recording date');
    ok(omitted.includes('2 bags') && omitted.includes(dateLabel(older.at)), width + ': an item omitted from the newest supplier order keeps its own most recent purchase');
    ok(await p.$eval(last('t-stock') + ' time', el => el.dateTime) === new Date(previous.at).toISOString(), width + ': the visible date has the exact recorded timestamp, including the Queensland year boundary');
    ok(/No order yet/.test(await p.textContent(last('t-long'))), width + ': a matching name with another product ID does not invent an order');
    ok(/No order yet/.test(await p.textContent(last('t-unset'))), width + ': exhausted history identifies an item with no recorded purchase');
    ok(await p.inputValue(qty('t-zero')) === '' && await p.getAttribute(qty('t-zero'), 'placeholder') === '2 bags', width + ': the individual last quantity is a hint in an empty draft');
    await p.fill(qty('t-zero'), '5 bags');
    ok(await p.textContent(last('t-zero')) === omitted, width + ': typing a draft quantity does not change the recorded purchase');
    ok(!(await L.overflow(p)), width + ': dates and quantities fit without sideways scroll');
    ok(p.errors.length === 0, width + ': last ordered has no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // One bounded page serves every item. The lookahead record must not be treated as loaded history.
  p = await open(b, pagedFixture()); await read(p);
  let bills = await historyBills(p);
  ok(bills.length === 1 && bills[0].n === 21, 'entry reads one page of 20 orders plus one lookahead, rather than a query per item');
  ok(/Earlier orders not checked/.test(await p.textContent(last('t-zero'))), 'an item in the unread lookahead order stays unknown until older history is requested');
  ok(/Earlier orders not checked/.test(await p.textContent(last('t-unset'))), 'incomplete history never claims an unseen item has never been ordered');
  await action(p, 'history');
  await L.waitFor(p, () => !!document.querySelector('[data-su="history-order"][data-id="page-19"]'), null, 5000);
  bills = await historyBills(p);
  ok(bills.length === 1, 'opening the existing Order history reuses the page already read');
  const stockBefore = await p.textContent(last('t-stock'));
  await L.choose(p, '[data-su="history-order"][data-id="page-19"]');
  ok(await p.textContent(last('t-stock')) === stockBefore, 'selecting an older sheet leaves each item\'s last purchase unchanged');
  await action(p, 'history-more');
  await L.waitFor(p, selector => document.querySelector(selector)?.textContent.includes('8 bags'), last('t-zero'), 5000);
  ok((await p.textContent(last('t-zero'))).includes(dateLabel(L.NOW - 21 * 86400000)), 'Older orders extends the reference to a purchase outside the first page');
  ok(/No order yet/.test(await p.textContent(last('t-unset'))), 'an unseen item says No order yet only after the remaining history is exhausted');
  bills = await historyBills(p);
  ok(bills.length === 2 && bills[1].n === 2, 'Older orders reads only the remaining bounded page and keeps the existing page');
  ok(p.errors.length === 0, 'paged history has no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await open(b, copy(F.fixture()), { failReads: '/suppliers/northside/orders$' });
  await L.waitFor(p, selector => document.querySelector(selector)?.textContent.includes('Not read'), last('t-stock'), 5000);
  ok(/Not read/.test(await p.textContent(last('t-unset'))), 'an initial history failure shows Not read instead of No order yet');
  await p.evaluate(() => { window.__fake.failReads = null; });
  await action(p, 'history-retry'); await read(p);
  ok(/2 bags/.test(await p.textContent(last('t-zero'))), 'retry recovers the latest matching item purchase from the history page');
  ok(p.errors.length === 0, 'history retry has no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Recording replaces the reference only after acknowledgement and retains purchases omitted from the new order.
  const seed = copy(F.fixture()); seed[F.key(['suppliers', 'northside'])].cutoffId = '';
  p = await open(b, seed); await read(p);
  const zeroBefore = await p.textContent(last('t-zero'));
  await p.fill(qty('t-stock'), '4.5'); await p.fill(qty('t-unset'), '3'); await action(p, 'review');
  await L.waitFor(p, () => { const el = document.querySelector('[data-su="record"]'); return el && !el.disabled; }, null, 5000);
  await p.evaluate(() => { window.__fake.liteCommitDelay = 1000; });
  await action(p, 'record');
  ok(await p.evaluate(prefix => Object.keys(window.__fake.dump()).filter(key => key.startsWith(prefix)).length === 2, orderPrefix), 'a pending record does not appear in saved purchase history before server acknowledgement');
  await L.waitFor(p, selector => document.querySelector(selector)?.textContent.includes('4.5 kg'), last('t-stock'), 10000);
  const saved = await p.evaluate(prefix => Object.entries(window.__fake.dump()).find(([key]) => key.startsWith(prefix) && !/\/(previous|older)$/.test(key))[1], orderPrefix);
  ok((await p.textContent(last('t-stock'))).includes(dateLabel(saved.at)) && await p.$eval(last('t-stock') + ' time', el => el.dateTime) === new Date(saved.at).toISOString(), 'acknowledged recording updates the last quantity and date together');
  ok(/3 \(unit not set\)/.test(await p.textContent(last('t-unset'))), 'recorded bare numbers retain the unconfirmed unit rather than inventing a pack');
  ok(await p.textContent(last('t-zero')) === zeroBefore, 'a new supplier order does not erase the latest purchase of an omitted item');
  ok(await p.inputValue(qty('t-stock')) === '', 'recording starts a fresh empty draft while keeping the updated last quantity visible');
  ok(p.errors.length === 0, 'recording has no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A retry that discards the loaded page also discards its completeness claim.
  const retrySeed = pagedFixture(); retrySeed[F.key(['suppliers', 'northside'])].cutoffId = '';
  p = await open(b, retrySeed); await read(p); await action(p, 'history');
  await p.evaluate(() => { window.__fake.failReads = /\/suppliers\/northside\/orders$/; });
  await action(p, 'history-more');
  await L.waitFor(p, () => !!document.querySelector('[data-su="history-retry"]'), null, 5000);
  await action(p, 'history-retry');
  await L.waitFor(p, selector => document.querySelector(selector)?.textContent.includes('Not read'), last('t-stock'), 5000);
  await action(p, 'history');
  await p.fill(qty('t-stock'), '6'); await action(p, 'review');
  await L.waitFor(p, () => { const el = document.querySelector('[data-su="record"]'); return el && !el.disabled; }, null, 5000);
  await action(p, 'record');
  await L.waitFor(p, selector => document.querySelector(selector)?.textContent.includes('6 kg'), last('t-stock'), 10000);
  ok(/Not read/.test(await p.textContent(last('t-zero'))) && /Not read/.test(await p.textContent(last('t-unset'))), 'recording after a failed history retry keeps omitted items unknown until history is read again');
  ok(p.errors.length === 0, 'recording after a failed history retry has no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A first-page query can return its older snapshot after a recording has already been acknowledged.
  const raceSeed = copy(F.fixture()); raceSeed[F.key(['suppliers', 'northside'])].cutoffId = '';
  p = await open(b, raceSeed, { fakeSDK: { 'firebase-firestore-lite.js': delayedHistorySDK() } });
  await L.waitFor(p, () => window.__supplierHistoryWaiting === true, null, 5000);
  await p.fill(qty('t-stock'), '7'); await action(p, 'review');
  await L.waitFor(p, () => { const el = document.querySelector('[data-su="record"]'); return el && !el.disabled; }, null, 5000);
  await action(p, 'record');
  await L.waitFor(p, selector => document.querySelector(selector)?.textContent.includes('7 kg'), last('t-stock'), 10000);
  await p.evaluate(() => window.__releaseSupplierHistory());
  await L.waitFor(p, selector => document.querySelector(selector)?.textContent.includes('2 bags'), last('t-zero'), 5000);
  ok(/7 kg/.test(await p.textContent(last('t-stock'))), 'a delayed initial history result retains the newer acknowledged quantity');
  ok((await p.textContent('.su-latest')).includes(dateLabel(L.NOW)), 'a delayed initial history result keeps the acknowledged order as the latest supplier order');
  ok(p.errors.length === 0, 'history and recording race has no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
