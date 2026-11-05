// A supplier's order is ticked as done on the order list only (head chef, 5 Nov 2026). The tick confirms only the
// reminder, for a linked or unlinked supplier, without quantities; detailed supplier history still needs an explicit
// order recording on the supplier's page. Before, the cut-off bar's Order done did this; the bar keeps the reminder.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const button = '.cut-tl [data-p="cut-tick"][data-id^="northside|"]';
const reminder = '#cut-band a.cut-n[href*="/northside/"]';
const completion = F.key(['cutdone', F.today + '_northside']);
const qty = 'input[data-sf="qty"][data-i="t-stock"]';
const stock = 'input[data-sf="stock"][data-i="t-stock"]';
const dump = p => p.evaluate(() => window.__fake.dump());
const protectedRecords = s => JSON.stringify(Object.entries(s).filter(([k]) => /\/(suppliers|supplierlinks|orders)(\/|$)/.test(k)).sort(([a], [b]) => a.localeCompare(b)));
const writes = (p, key) => p.evaluate(k => window.__fake.writes.flat().filter(o => o.path === k), key || completion);
const supplierReads = p => p.evaluate(() => window.__fake.reads.filter(k => /\/(suppliers|supplierlinks)(\/|$)/.test(k)));
const undo = p => p.getByRole('button', { name: 'Undo', exact: true });
async function ready(p) { await L.waitFor(p, () => { const t = document.querySelector('.cut-tl [data-p="cut-tick"][data-id^="northside|"]'); return !!t && t.getAttribute('aria-pressed') === 'false'; }, null, 10000); }
const ticked = p => p.evaluate(s => { const t = document.querySelector(s); return !!t && t.getAttribute('aria-pressed') === 'true'; }, button);
async function saved(p, key, on) {
  await L.waitFor(p, ([k, v]) => { const d = window.__fake.dump()[k]; return d && d.on === v; }, [key || completion, on !== false], 10000);
}
async function undoReady(p) { await undo(p).waitFor({ state: 'visible' }); }
async function open(b, hash, options) { return L.open(b, hash || '#/orders', Object.assign({ who: 'sam', extra: F.fixture(), wait: 1500 }, options || {})); }
// blocked: the test blocks the supplier tools, which the order list asks for to group a chef's requests (5 Nov 2026), so
// the browser's own note that they failed to load is expected there, and nothing else is
async function noErrors(p, label, blocked) { const e = p.errors.filter(x => !(blocked && /Failed to load resource: net::ERR_FAILED/.test(x))); ok(e.length === 0, label + ': no page errors ' + e.join(' | ')); }

(async () => {
  const b = await L.start();
  let p, before, after;

  // Linked and unlinked suppliers both confirm directly, even when lazy supplier tools cannot load.
  for (const linked of [true, false]) {
    const extra = F.fixture();
    if (!linked) Object.keys(extra).filter(k => /\/suppliers\//.test(k)).forEach(k => delete extra[k]);
    p = await open(b, '#/orders', { extra, block: 'js/supplier-(core|store)\\.js|js/suppliers\\.js', denyReads: '/suppliers$' });
    await ready(p);
    before = protectedRecords(await dump(p));
    ok(!!(await p.$(reminder)) && !(await p.$('#cut-band button')), (linked ? 'linked' : 'unlinked') + ': the bar keeps the reminder, with no tick of its own');
    await p.click(button); await saved(p); await undoReady(p);
    after = await dump(p);
    ok(after[completion].by === 'sam' && after[completion].day === F.today && after[completion].sid === 'northside', (linked ? 'linked' : 'unlinked') + ': saves this chef and the exact occurrence');
    ok(Object.keys(after[completion]).sort().join() === 'at,by,day,on,sid', 'completion uses only the existing reminder data format');
    ok(before === protectedRecords(after), 'completion creates no order history, changes no staff requests and leaves catalogue data untouched');
    ok(await p.evaluate(() => location.hash === '#/orders' && !window.LK_SUP_CORE && !window.LK_SUP_STORE && !window.LK_SUP), (linked ? 'linked' : 'unlinked') + ': the tick stays on the order list without loading supplier tools or opening the supplier sheet');
    ok((await supplierReads(p)).length === 0, 'completion needs no catalogue or order history reads');
    ok(await ticked(p) && !(await p.$(reminder)), 'completion ticks the list and removes the reminder from the bar');
    await undo(p).click(); await saved(p, completion, false); await ready(p);
    ok(protectedRecords(await dump(p)) === before, 'Undo restores the reminder without touching orders or history');
    ok((await writes(p)).length === 2 && (await writes(p))[1].data.on === false, 'completion and Undo make one reminder write each');
    await noErrors(p, linked ? 'linked completion and Undo' : 'unlinked completion and Undo', true);
    await p.context().close();
  }

  // The supplier page has no tick of its own; its draft stays, and the bar's link still opens the detailed order.
  p = await open(b, '#/suppliers/northside');
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]') && /Last order:/.test(document.body.textContent), null, 10000);
  await L.waitFor(p, () => !!document.querySelector('#cut-band a.cut-n[href*="/northside/"]'), null, 10000);
  ok(!(await p.$('#supplier-root [data-cut], #supplier-root [data-p="cut-tick"], #cut-band button')), 'the supplier page and the bar offer no tick');
  // The supplier-name link still opens the occurrence-specific detailed order flow.
  await p.fill(qty, '3');
  await p.click('#cut-band .cut-n');
  await L.waitFor(p, day => location.hash === '#/suppliers/cutoff/northside/' + day, F.today, 10000);
  ok(await p.inputValue(qty) === '3', 'the detailed order link remains available and keeps quantities');
  await noErrors(p, 'draft preservation');
  await p.context().close();

  // A refused completion remains actionable and can be retried once the write is permitted.
  p = await open(b); await ready(p);
  before = protectedRecords(await dump(p));
  await p.evaluate(() => { window.__fake.deny = /\/cutdone\//; });
  await p.click(button);
  await L.waitFor(p, () => /Not saved|Not ticked|Could not/i.test(document.body.textContent) && !!document.querySelector('#cut-band a.cut-n[href*="/northside/"]'), null, 10000);
  ok(!(await dump(p))[completion] && !(await ticked(p)) && !!(await p.$(reminder)), 'a refused save restores the reminder and the tick, and records no completion');
  ok(await undo(p).count() === 0 && protectedRecords(await dump(p)) === before, 'a failed save offers no successful Undo and changes no order data');
  await p.evaluate(() => { window.__fake.deny = null; });
  await p.click(button); await saved(p); await undoReady(p);
  ok((await dump(p))[completion].by === 'sam', 'a failed confirmation can be retried safely');
  await noErrors(p, 'failure and retry');
  await p.context().close();

  // Pending writes retain the existing queue and unsaved-work protection, without reporting server success early.
  p = await open(b, '#/orders'); await ready(p);
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await p.click(button); await saved(p);
  ok(await p.evaluate(() => window.LK_PREP.unsaved()), 'queued reminder completion is tracked as unsaved work');
  ok(await undo(p).count() === 0, 'queued completion does not show a successful Undo before the server confirms it');
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  await undoReady(p);
  ok((await writes(p)).length === 1, 'releasing a queued completion produces no duplicate write');
  // A stale repeated event cannot overwrite this completion or its author/time.
  const original = JSON.stringify((await dump(p))[completion]);
  await p.evaluate(day => {
    const stale = document.createElement('button'); stale.dataset.p = 'cut-tick'; stale.dataset.id = 'northside|' + day; stale.setAttribute('aria-pressed', 'false');
    document.querySelector('.cut-tl').appendChild(stale); stale.click(); stale.remove();
  }, F.today);
  await L.settle(p, 300);
  ok((await writes(p)).length === 1 && JSON.stringify((await dump(p))[completion]) === original, 'a repeated completion preserves the original attribution and makes no duplicate write');
  await noErrors(p, 'queued and repeated completion');
  await p.context().close();

  // Tomorrow's early cut-off is completed under tomorrow, never under the day the chef taps.
  const early = F.fixture(), next = (new Date(L.NOW).getDay() + 2) % 7;
  early[F.key(['config', 'main'])].cutoffs = [{ id: 'northside', name: 'Northside Test Foods', dd: [next], at: 60, pre: 1, lead: 240 }];
  const tomorrow = L.ymd(new Date(L.NOW + 86400000)), tomorrowKey = F.key(['cutdone', tomorrow + '_northside']);
  p = await open(b, '#/orders', { extra: early, clock: L.NOW + 8.5 * 3600000 }); await ready(p);
  await p.click(button); await saved(p, tomorrowKey); await undoReady(p);
  after = await dump(p);
  ok(!after[completion] && after[tomorrowKey].day === tomorrow, 'an early reminder saves only its own next-day occurrence');
  await undo(p).click(); await saved(p, tomorrowKey, false); await ready(p);
  ok(!(await dump(p))[completion], 'Undo of an early reminder also leaves today untouched');
  await noErrors(p, 'next-day completion');
  await p.context().close();

  // Existing chef permissions and the tick list's layout hold on phone, tablet and desktop.
  for (const persona of [{ who: 'bo', width: 390, by: 'bo' }, { who: 'sam', width: 768, by: 'sam' }, { who: 'bo', admin: true, width: 1280, by: 'bo' }]) {
    p = await open(b, '#/orders', persona); await ready(p);
    ok(!(await L.overflow(p)), 'the tick list fits at ' + persona.width + ' px');
    await p.click(button); await saved(p); await undoReady(p);
    ok((await dump(p))[completion].by === persona.by, 'completion retains the authorised ' + persona.by + ' identity');
    await noErrors(p, 'authorised completion at ' + persona.width + ' px');
    await p.context().close();
  }
  p = await open(b, '#/orders', { who: 'ann' });
  ok(!(await p.$(button)) && !(await p.$('.cut-tl')), 'staff still see no reminder completion controls');
  await p.evaluate(day => {
    const forged = document.createElement('button'); forged.dataset.p = 'cut-tick'; forged.dataset.id = 'northside|' + day; forged.setAttribute('aria-pressed', 'false');
    (document.querySelector('.o-page') || document.body).appendChild(forged); forged.click(); forged.remove();
  }, F.today);
  await L.settle(p, 500);
  ok(!(await dump(p))[completion] && (await writes(p)).length === 0, 'a staff member cannot trigger reminder completion through a forged control');
  await noErrors(p, 'staff refusal');
  await p.context().close();

  // An Undo left from the previous chef must not be carried into the next chef's session.
  p = await open(b, '#/orders', { deviceMode: 'shared' }); await ready(p);
  await p.click(button); await saved(p); await undoReady(p);
  await L.notYou(p);
  await L.waitFor(p, () => !!document.querySelector('.p-name[data-id="bo"]'), null, 10000);
  await p.click('.p-name[data-id="bo"]'); await p.type('#pf1', '3333');
  await L.waitFor(p, () => window.LK_PREP.whoName() === 'Bo' && window.LK_PREP.supplier().read(), null, 10000);
  if (await undo(p).count()) await undo(p).click();
  await L.settle(p, 300);
  after = await dump(p);
  ok(after[completion].on === true && after[completion].by === 'sam' && (await writes(p)).length === 1, 'old Undo cannot uncheck the order as the next chef on a shared tablet');
  await noErrors(p, 'Undo after handover');
  await p.context().close();

  // Ticked first, then the quantities (head chef, 5 Nov 2026: "we're stuck"). The tick says the order is in, with no
  // quantities. Opening the supplier from the tick list to record them used to stop at Review with "An order is already
  // marked for this cut-off", and Try again only read the catalogue again, so Review stopped again. A tick alone is not a
  // recorded order: Review records its quantities. An order already recorded for the cut-off still needs Additional order.
  const orderKeys = s => Object.keys(s).filter(k => /\/suppliers\/northside\/orders\/o-/.test(k));
  const linkKey = F.key(['supplierlinks', F.today + '_northside']);
  const recordReady = q => L.waitFor(q, () => { const r = document.querySelector('[data-su="record"]'); return !!r && !r.disabled && /Record order placed/.test(r.textContent); }, null, 6000).then(() => true, () => false);
  p = await open(b); await ready(p);
  await p.click(button); await saved(p);
  await p.click('.cut-tl a.cut-n[href*="/northside/"]');
  await L.waitFor(p, s => !!document.querySelector(s), qty, 15000);
  await p.fill(qty, '3');
  await p.click('[data-su="review"]');
  const reviewOk = await recordReady(p);
  const shown = (await L.txt(p, 'main') || '').replace(/\s+/g, ' ');
  ok(reviewOk && !/already marked/.test(shown), 'ticked on the order list, then opened from it: Review goes on to Record order placed (' + (reviewOk ? 'review' : shown.slice(0, 160)) + ')');
  ok(/Records the quantities of the order ticked/.test(await L.txt(p, '.su-review') || ''), 'the review says it records the quantities of the order already ticked');
  if (reviewOk) {
    await p.click('[data-su="record"]');
    await L.waitFor(p, k => !!window.__fake.dump()[k], linkKey, 10000).catch(() => {});
  }
  after = await dump(p);
  const first = orderKeys(after).map(k => after[k])[0];
  ok(orderKeys(after).length === 1 && first.cutoffDay === F.today && first.cutoffId === 'northside' && first.lines.length === 1 && first.lines[0].qty === '3 kg', 'the quantities are saved for that cut-off (' + orderKeys(after).length + ' orders)');
  ok(after[linkKey] && after[linkKey].v === 1 && after[linkKey].orderId === (orderKeys(after)[0] || '').split('/').pop() && after[completion].on === true && after[completion].at === first.at, 'the cut-off links to that order and stays ticked, with the recording\'s time');
  // the guard against two orders for one cut-off stays: a second order needs Additional order
  await L.waitFor(p, s => { const i = document.querySelector(s); return !!i && !i.value; }, qty, 10000).catch(() => {});
  await p.fill(qty, '2');
  await p.click('[data-su="review"]');
  await L.waitFor(p, () => /Another order is recorded for this cut-off/.test((document.querySelector('.su-error') || {}).textContent || ''), null, 6000).catch(() => {});
  ok(/Another order is recorded for this cut-off/.test(await L.txt(p, '.su-error') || '') && !(await p.$('[data-su="record"]')) && orderKeys(await dump(p)).length === 1, 'an order already recorded for the cut-off: Review stops and asks for Additional order');
  if (!(await p.isVisible('[data-su="additional"]'))) await p.click('[data-su="info"]');
  await p.click('[data-su="additional"]');
  await p.click('[data-su="review"]');
  if (await recordReady(p)) { await p.click('[data-su="record"]'); await L.waitFor(p, k => (window.__fake.dump()[k] || {}).v === 2, linkKey, 10000).catch(() => {}); }
  after = await dump(p);
  ok(orderKeys(after).length === 2 && after[linkKey].v === 2, 'Additional order records a second order on the same cut-off');
  await noErrors(p, 'tick, then record');
  await p.context().close();

  await b.close();
  L.report(R);
})();
