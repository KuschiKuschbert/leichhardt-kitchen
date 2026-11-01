// Longer supplier lead times use the same cut-off dates in settings, reminders and saved order sheets.
// Suppliers, goods and people below are synthetic. Firebase is the usual test stand-in.
const L = require('./lib');
const F = require('./supplier-fixtures');
const CUT = require('../js/cutoffs');
const { R, ok } = L.results(), { txt } = L;
const CFG = F.key(['config', 'main']);
const dump = p => p.evaluate(() => window.__fake.dump());
const testClock = new Date('2026-12-27T14:00:00+10:00').getTime(); // Sunday, across the year boundary.
const testDay = '2026-12-27';
const makeCut = (pre, extra) => Object.assign({ id: 'northside', name: 'Northside Test Foods', dd: [0], at: 900, pre, lead: 240 }, extra || {});
function fixture(cuts) {
  const seed = F.fixture();
  seed[CFG].cutoffs = cuts;
  seed[CFG].pinOpen = { sam: 0, ann: 0, bo: 0 }; // Existing PINs, so setup need not fill missing enrolment windows.
  return seed;
}
const domainWrites = p => p.evaluate(() => window.__fake.writes.flat().filter(x => /\/(?:config\/main|suppliers(?:\/|$)|supplierlinks(?:\/|$)|cutdone(?:\/|$))/.test(x.path)));
const selectedTextFits = p => p.$eval('[data-k="cut-p0"] + .ux-picker-trigger', e => {
  const style = getComputedStyle(e), canvas = document.createElement('canvas').getContext('2d');
  canvas.font = style.font;
  // Leave room for both paddings and the browser's native dropdown arrow.
  return e.scrollWidth <= e.clientWidth && e.getBoundingClientRect().height >= 44;
});
async function admin(b, extra, options) {
  const p = await L.open(b, '#/admin', Object.assign({ admin: true, who: '', extra, clock: testClock, wait: 1500 }, options || {}));
  await L.adminTab(p, 'cutoffs');
  return p;
}
async function save(p, pre) {
  await L.pick(p, '[data-k="cut-p0"]', String(pre));
  await p.click('[data-p="cut-save"]');
  await L.waitFor(p, ({ key, value }) => window.__fake.dump()[key]?.cutoffs?.[0]?.pre === value && /Saved/.test(document.querySelector('.a-cut .saved')?.textContent || ''), { key: CFG, value: pre }, 10000);
}

(async () => {
  ok(CUT.MAX_PRE === 14, 'shared cutoff range reaches 14 days');
  const valid = Array.from({ length: 15 }, (_, pre) => makeCut(pre));
  ok(CUT.clean(valid).map(x => x.pre).join() === valid.map(x => x.pre).join(), 'cleaner preserves same-day and every whole-day lead time through 14');
  ok([undefined, null, '14', -1, 15, NaN, Infinity].every(pre => CUT.clean([makeCut(pre)])[0].pre === 1), 'damaged or out-of-range lead times retain the existing one-day fallback');
  const missed = [];
  for (let pre = 0; pre <= 14; pre++) for (let day = 0; day < 7; day++) {
    const c = makeCut(pre, { dd: [day] });
    // A delivery 14 + weekday days from a Sunday has an exact non-negative cutoff weekday.
    const cutoffDay = new Date(Date.UTC(2026, 11, 27 + 14 + day - pre)).getUTCDay();
    const days = typeof CUT.cutDays === 'function' ? CUT.cutDays(c) : [];
    const occurrences = CUT.on([c], cutoffDay);
    if (days.length !== 1 || days[0] !== cutoffDay || occurrences.length !== 1 || occurrences[0].del !== day || CUT.on([c], (cutoffDay + 1) % 7).length) missed.push({ pre, day, cutoffDay, days });
  }
  ok(!missed.length, 'all delivery weekdays map to their correct cutoff for 0 through 14 days: ' + JSON.stringify(missed));
  ok(CUT.forText({ s: makeCut(0), del: 0 }) === 'for today' && CUT.forText({ s: makeCut(1), del: 1 }) === "for Monday's delivery" && CUT.forText({ s: makeCut(3), del: 3 }) === 'for Wednesday', 'existing same-day and short lead-time reminder wording stays intact');
  ok(CUT.forText({ s: makeCut(7), del: 0 }) === 'for Sunday in 1 week' && CUT.forText({ s: makeCut(14), del: 0 }) === 'for Sunday in 2 weeks', 'weekly reminders identify which future delivery week is meant');
  ok([8, 9, 10, 11, 12, 13].every(pre => CUT.forText({ s: makeCut(pre), del: 0 }) === 'for Sunday in ' + pre + ' days'), 'intermediate lead times identify the full number of calendar days');

  const b = await L.start();
  let p = await admin(b, fixture([makeCut(1)]));
  await L.waitFor(p, () => !!document.querySelector('[data-k="cut-p0"]'), null, 10000);
  const choices = await p.$eval('[data-k="cut-p0"]', e => [...e.options].map(x => ({ value: +x.value, label: x.textContent })));
  ok(choices.map(x => x.value).join() === Array.from({ length: 15 }, (_, i) => i).join(), 'existing Order closes dropdown offers every value from same-day to 14 days');
  ok(choices[0].label === 'The same day' && choices[1].label === 'The day before' && choices[7].label === '1 week before' && choices[14].label === '2 weeks before', 'existing labels remain familiar and 7/14 days use week labels');
  ok((await domainWrites(p)).length === 0, 'opening and inspecting cutoff settings writes no supplier or configuration data');
  const readsBefore = await p.evaluate(() => window.__fake.reads.length);
  await L.pick(p, '[data-k="cut-p0"]', '8');
  ok(/^Order by 15:00 Sat for 8 days later\./.test(await txt(p, '.cut-say')), 'Sunday delivery with 8-day lead shows Saturday cutoff, never an empty weekday');
  await L.pick(p, '[data-k="cut-p0"]', '14');
  ok(/^Order by 15:00 Sun for 2 weeks later\./.test(await txt(p, '.cut-say')), 'two-week setting shows Sunday cutoff and the correct lead time');
  ok(await selectedTextFits(p), 'phone dropdown leaves room for the complete 2 weeks before label and picker chevron');
  await L.pick(p, '[data-k="cut-p0"]', '13');
  ok(await selectedTextFits(p), 'phone dropdown leaves room for the complete 13 days before label and picker chevron');
  await L.pick(p, '[data-k="cut-p0"]', '14');
  ok(await p.evaluate(n => window.__fake.reads.length === n, readsBefore), 'changing lead time updates the explanation without another Firestore read');
  for (const width of [390, 768, 1280]) {
    await p.setViewportSize({ width, height: 844 }); await L.settle(p, 200);
    ok(!(await L.overflow(p)), 'expanded cutoff dropdown fits ' + width + ' px');
  }
  await save(p, 14);
  const savedFourteen = (await dump(p))[CFG].cutoffs;
  ok(savedFourteen[0].pre === 14 && savedFourteen[0].dd.join() === '0' && savedFourteen[0].at === 900 && savedFourteen[0].lead === 240, 'save preserves the full 14-day value, delivery weekday, time and reminder window');
  ok((await domainWrites(p)).every(x => x.path === CFG && Object.keys(x.data).join() === 'cutoffs'), 'cutoff Save changes only config/main.cutoffs');
  await p.reload(); await L.adminTab(p, 'cutoffs');
  await L.waitFor(p, () => document.querySelector('[data-k="cut-p0"]')?.value === '14', null, 10000);
  ok(await p.$eval('[data-k="cut-p0"]', e => e.value) === '14' && /2 weeks later/.test(await txt(p, '.cut-say')), '14-day choice survives reopening the app');
  await save(p, 7);
  await p.reload(); await L.adminTab(p, 'cutoffs');
  await L.waitFor(p, () => document.querySelector('[data-k="cut-p0"]')?.value === '7', null, 10000);
  ok(/Sun for 1 week later/.test(await txt(p, '.cut-say')), 'one-week choice saves and reopens with correct summary');
  await L.adminTab(p, 'people');
  await p.fill('[data-a="name"][data-i="2"]', 'Bo Test'); await p.keyboard.press('Tab');
  await p.click('[data-p="a-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k]?.people?.[2]?.name === 'Bo Test', CFG, 10000);
  ok((await dump(p))[CFG].cutoffs[0].pre === 7, 'People save retains a weekly supplier cutoff');
  ok(!p.errors.length, 'longer cutoff settings have no page errors: ' + p.errors.join(' | '));
  await p.context().close();

  // The delivery is two weeks later, but the reminder, completion and snapshot belong to this cutoff day.
  p = await L.open(b, '#/orders', { who: 'bo', extra: fixture([makeCut(14)]), clock: testClock, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('#cut-band:not([hidden]) .cut-row') && !!document.querySelector('.cut-tl'), null, 10000);
  ok(/for Sunday in 2 weeks/.test(await txt(p, '#cut-band')) && /for Sunday in 2 weeks/.test(await txt(p, '.cut-tl')), 'bar and order-list reminders distinguish the delivery two weeks away');
  ok((await domainWrites(p)).length === 0, 'showing two-week reminders creates no order or completion');
  const occurrences = await p.evaluate(() => window.LK_PREP.supplier().occurrences());
  const occurrence = occurrences.find(x => x.day === testDay && x.cutoffId === 'northside');
  ok(occurrence?.deliveryDay === '2027-01-10' && occurrence.key === 'northside|' + testDay, 'linked occurrence crosses the year boundary without moving its cutoff key');
  await p.click('.cut-tl a.cut-n');
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  ok(await p.evaluate(day => location.hash === '#/suppliers/cutoff/northside/' + day, testDay), 'reminder opens its supplier sheet using the cutoff date');
  ok(/Delivery: 2027-01-10/.test(await txt(p, '.su-cutoff')), 'supplier sheet shows the exact future delivery date');
  await p.fill('input[data-sf="qty"][data-i="t-stock"]', '3');
  await p.click('[data-su="review"]');
  await L.waitFor(p, () => !!document.querySelector('[data-su="record"]:not([disabled])'), null, 10000);
  await p.click('[data-su="record"]');
  await L.waitFor(p, ({ prefix, date }) => Object.entries(window.__fake.dump()).some(([k, x]) => k.startsWith(prefix) && x.cutoffDay === date && x.deliveryDay === '2027-01-10'), { prefix: F.key(['suppliers', 'northside', 'orders']) + '/', date: testDay }, 10000);
  const data = await dump(p);
  const orders = Object.entries(data).filter(([k, x]) => k.startsWith(F.key(['suppliers', 'northside', 'orders']) + '/') && x.cutoffDay === testDay);
  ok(orders.length === 1 && orders[0][1].lines[0].qty === '3 kg' && orders[0][1].deliveryDay === '2027-01-10', 'recording keeps the entered quantity and full two-week delivery date in one immutable order');
  ok(data[F.key(['cutdone', testDay + '_northside'])]?.on === true && data[F.key(['supplierlinks', testDay + '_northside'])]?.day === testDay && !data[F.key(['cutdone', '2027-01-10_northside'])], 'saved order completes this cutoff rather than the delivery day');
  ok(!(await L.overflow(p)) && !p.errors.length, 'two-week linked-order journey fits the phone with no page errors: ' + p.errors.join(' | '));
  await p.context().close();

  // A mixed saved-copy update must never run the older cleaner over valid new settings on a People save.
  const original = [makeCut(14), makeCut(7, { id: 'weekly', name: 'Weekly Test Supplier' })];
  p = await admin(b, fixture(original), { block: '/js/cutoffs\\.js', init: () => {
    window.LK_CUT = { clean: list => (list || []).map(x => Object.assign({}, x, { pre: x.pre <= 3 ? x.pre : 1 })), on: () => [], forText: () => '', startAt: () => 0, LEADS: [] };
  } });
  ok(/could not load/.test(await txt(p, '.a-cut')) && !(await p.$('[data-p="cut-save"]')), 'old helper fails safely with reload guidance and no cutoff Save');
  ok(!(await p.$('#cut-band:not([hidden])')) && !(await domainWrites(p)).length, 'old helper shows no misleading reminders and makes no cutoff write');
  await L.adminTab(p, 'people');
  await p.fill('[data-a="name"][data-i="2"]', 'Bo Recheck'); await p.keyboard.press('Tab');
  await p.click('[data-p="a-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k]?.people?.[2]?.name === 'Bo Recheck', CFG, 10000);
  ok(JSON.stringify((await dump(p))[CFG].cutoffs) === JSON.stringify(original), 'People save with an old helper preserves both weekly and fortnightly settings exactly');
  ok(!p.errors.filter(e => !/cutoffs\.js|ERR_FAILED|net::/.test(e)).length, 'old-helper fallback has no unexpected page errors: ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})();
