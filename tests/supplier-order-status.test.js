// Approved A: label the existing last-purchase reference without changing the purchase or draft.
// Suppliers, quantities and saves are synthetic and use the Firebase stand-in.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const copy = value => JSON.parse(JSON.stringify(value));
const prefix = F.key(['suppliers', 'northside', 'orders']) + '/';
const last = id => '[data-item="' + id + '"] .su-last';
const qty = id => 'input[data-sf="qty"][data-i="' + id + '"]';
const action = (p, cmd) => L.choose(p, '[data-su="' + cmd + '"]');
async function open(b, seed, options) {
  const p = await L.open(b, '#/suppliers/northside', Object.assign({ who: 'bo', width: 1280, extra: seed, wait: 1500 }, options || {}));
  await L.waitFor(p, selector => !!document.querySelector(selector), qty('t-stock'), 15000);
  return p;
}
async function ready(p) {
  await L.waitFor(p, selector => !!document.querySelector(selector + ' time'), last('t-stock'), 10000);
}
async function state(p, id) {
  await p.locator(last(id)).scrollIntoViewIfNeeded();
  return p.$eval(last(id), el => ({
    kind: el.getAttribute('data-order-kind'), text: el.innerText,
    amount: el.querySelector('b')?.textContent || '', at: el.querySelector('time')?.dateTime || '',
    statusVisible: [...el.querySelectorAll('.su-last-kind, .su-last-wide')].some(node => node.getClientRects().length > 0 && /^(?:Latest|Earlier)(?: order)?(?:\s*·)?$/.test(node.textContent.trim()))
  }));
}
function sameDayFixture() {
  const seed = copy(F.fixture()), previous = seed[prefix + 'previous'], older = seed[prefix + 'older'];
  seed[F.key(['suppliers', 'northside'])].cutoffId = '';
  older.at = previous.at - 3600000; older.day = L.ymd(new Date(older.at));
  const item = F.items[4], historical = copy(older);
  historical.at = Date.UTC(new Date(L.NOW).getFullYear() - 1, 4, 10, 4);
  historical.day = L.ymd(new Date(historical.at));
  historical.lines = [{ itemId: item.id, name: item.name, pack: item.pack, qty: '2 jumbo catering cartons', amount: 2,
    unit: 'jumbo catering cartons', par: item.par, parUnit: item.parUnit, source: copy(item.source), suggestion: '', stock: '' }];
  seed[prefix + 'historical'] = historical;
  return seed;
}
function incompleteFixture() {
  const seed = sameDayFixture(), template = copy(seed[prefix + 'previous']);
  delete seed[prefix + 'older']; delete seed[prefix + 'historical'];
  for (let n = 1; n <= 20; n++) {
    const order = copy(template); order.at = template.at - n * 86400000; order.day = L.ymd(new Date(order.at));
    seed[prefix + 'page-' + n] = order;
  }
  return seed;
}

(async () => {
  const b = await L.start(); let p;

  // The two references share a Queensland date; their immutable order IDs establish the different labels.
  for (const options of [{ width: 390 }, { width: 768 }, { width: 1280 }, { width: 320, settings: { text: 'xlarge' } }]) {
    const seed = sameDayFixture(), label = options.width + (options.settings ? ' enlarged' : '');
    const latestLabel = options.width < 720 ? /Latest order/ : /\bLatest\b/, earlierLabel = options.width < 720 ? /Earlier order/ : /\bEarlier\b/;
    p = await open(b, seed, options); await ready(p);
    const current = await state(p, 't-stock'), earlier = await state(p, 't-zero'), long = await state(p, 't-long'), absent = await state(p, 't-unset');
    ok(current.kind === 'latest' && current.statusVisible && latestLabel.test(current.text), label + ': the latest supplier order has a visible Latest order label');
    ok(earlier.kind === 'earlier' && earlier.statusVisible && earlierLabel.test(earlier.text), label + ': a distinct order on the same day has a visible Earlier order label');
    ok(current.amount === '2 kg' && current.at === new Date(seed[prefix + 'previous'].at).toISOString()
      && earlier.amount === '2 bags' && earlier.at === new Date(seed[prefix + 'older'].at).toISOString(), label + ': labels retain each saved quantity and exact date');
    ok(long.kind === 'earlier' && long.amount === '2 jumbo catering cartons'
      && long.text.includes(String(new Date(seed[prefix + 'historical'].at).getFullYear())), label + ': long units and a different-year date remain readable with the status');
    ok(absent.kind === null && !absent.statusVisible && /No order yet/.test(absent.text), label + ': confirmed absence has no latest or earlier status');
    ok(await p.inputValue(qty('t-stock')) === '' && await p.inputValue(qty('t-zero')) === '', label + ': status labels leave new order quantities empty');
    ok(!(await L.overflow(p)), label + ': status, long units and older-year dates fit without sideways scroll');
    ok(p.errors.length === 0, label + ': no page errors ' + p.errors.join(' | '));

    if (options.width === 1280) {
      await action(p, 'history');
      await L.waitFor(p, () => !!document.querySelector('[data-su="history-order"][data-id="older"]'), null, 5000);
      await L.choose(p, '[data-su="history-order"][data-id="older"]');
      ok(await p.getAttribute(last('t-stock'), 'data-order-kind') === 'latest'
        && await p.getAttribute(last('t-zero'), 'data-order-kind') === 'earlier', 'selecting an older history sheet does not change the labels');
      await action(p, 'history');
      await p.fill(qty('t-zero'), '4 bags');
      ok((await state(p, 't-zero')).kind === 'earlier', 'typing an order leaves the earlier-purchase status unchanged');
      await action(p, 'review');
      await L.waitFor(p, () => { const el = document.querySelector('[data-su="record"]'); return el && !el.disabled; }, null, 5000);
      await action(p, 'record');
      await L.waitFor(p, selector => document.querySelector(selector)?.getAttribute('data-order-kind') === 'latest', last('t-zero'), 10000);
      const recorded = await state(p, 't-zero'), untouched = await state(p, 't-stock');
      ok(recorded.kind === 'latest' && latestLabel.test(recorded.text) && recorded.amount === '4 bags', 'acknowledged recording labels the newly ordered item Latest order');
      ok(untouched.kind === 'earlier' && earlierLabel.test(untouched.text) && untouched.amount === current.amount && untouched.at === current.at, 'an omitted former-latest item becomes Earlier order with its quantity and date unchanged');
    }
    await p.context().close();
  }

  p = await open(b, incompleteFixture(), { width: 390 }); await ready(p);
  const unknown = await state(p, 't-zero');
  ok(/Earlier orders not checked/.test(unknown.text) && unknown.kind === null && !unknown.statusVisible, 'incomplete history stays unknown without receiving an Earlier order label');
  await p.context().close();

  p = await open(b, sameDayFixture(), { failReads: '/suppliers/northside/orders$' });
  await L.waitFor(p, selector => document.querySelector(selector)?.textContent.includes('Not read'), last('t-stock'), 5000);
  const unread = await state(p, 't-stock');
  ok(/Not read/.test(unread.text) && unread.kind === null && !unread.statusVisible, 'a failed initial history read receives no known order status');
  await p.context().close();

  // A retried draft can already exist while a newer supplier order remains unread.
  const replaySeed = sameDayFixture(), replay = copy(replaySeed[prefix + 'older']);
  replay.lines = replay.lines.filter(line => line.itemId === 't-zero');
  replaySeed[prefix + 'o-status-replay'] = replay;
  p = await open(b, replaySeed, { width: 390, failReads: '/suppliers/northside/orders$',
    init: () => { Object.defineProperty(window.crypto, 'randomUUID', { configurable: true, value: () => 'status-replay' }); } });
  await L.waitFor(p, selector => document.querySelector(selector)?.textContent.includes('Not read'), last('t-zero'), 5000);
  await p.fill(qty('t-zero'), '2 bags'); await action(p, 'review');
  await L.waitFor(p, () => { const el = document.querySelector('[data-su="record"]'); return el && !el.disabled; }, null, 5000);
  await action(p, 'record');
  await L.waitFor(p, () => /already recorded/.test(document.querySelector('#supplier-root')?.textContent || ''), null, 10000);
  const replayed = await state(p, 't-zero');
  ok(replayed.kind === null && !replayed.statusVisible && /Last bought/.test(replayed.text)
    && replayed.amount === '2 bags' && replayed.at === new Date(replay.at).toISOString(), 'an old acknowledged replay keeps its quantity and date neutral while the newest order is unread');
  ok(await p.$eval(last('t-zero'), el => !el.querySelector('.su-last-wide')
    && !/latest recorded supplier order|earlier order/i.test(el.querySelector('time')?.title || '')), 'an unread latest-order relationship receives no compact status or timestamp membership claim');
  ok(await p.evaluate(prefix => Object.keys(window.__fake.dump()).filter(key => key.startsWith(prefix)).length === 4, prefix), 'a replay used to check status creates no duplicate order');
  await p.evaluate(() => { window.__fake.failReads = null; });
  await action(p, 'history-retry');
  await L.waitFor(p, selector => document.querySelector(selector)?.getAttribute('data-order-kind') === 'earlier', last('t-zero'), 10000);
  const checkedReplay = await state(p, 't-zero');
  ok(checkedReplay.kind === 'earlier' && /Earlier order/.test(checkedReplay.text)
    && checkedReplay.amount === replayed.amount && checkedReplay.at === replayed.at, 'reading the newest page establishes the replay as Earlier order without changing its purchase');
  ok(p.errors.length === 0, 'failed-history replay and recovery have no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
