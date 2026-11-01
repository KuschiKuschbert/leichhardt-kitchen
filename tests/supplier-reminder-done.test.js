// Order done confirms only the reminder. Detailed supplier history still needs an explicit order recording.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const button = '#cut-band [data-cut="done"][data-id^="northside|"]';
const completion = F.key(['cutdone', F.today + '_northside']);
const qty = 'input[data-sf="qty"][data-i="t-stock"]';
const stock = 'input[data-sf="stock"][data-i="t-stock"]';
const dump = p => p.evaluate(() => window.__fake.dump());
const protectedRecords = s => JSON.stringify(Object.entries(s).filter(([k]) => /\/(suppliers|supplierlinks|orders)(\/|$)/.test(k)).sort(([a], [b]) => a.localeCompare(b)));
const writes = (p, key) => p.evaluate(k => window.__fake.writes.flat().filter(o => o.path === k), key || completion);
const supplierReads = p => p.evaluate(() => window.__fake.reads.filter(k => /\/(suppliers|supplierlinks)(\/|$)/.test(k)));
const undo = p => p.getByRole('button', { name: 'Undo', exact: true });
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('#cut-band [data-cut="done"][data-id^="northside|"]'), null, 10000); }
async function saved(p, key, on) {
  await L.waitFor(p, ([k, v]) => { const d = window.__fake.dump()[k]; return d && d.on === v; }, [key || completion, on !== false], 10000);
}
async function undoReady(p) { await undo(p).waitFor({ state: 'visible' }); }
async function open(b, hash, options) { return L.open(b, hash || '#/', Object.assign({ who: 'sam', extra: F.fixture(), wait: 1500 }, options || {})); }
async function noErrors(p, label) { ok(p.errors.length === 0, label + ': no page errors ' + p.errors.join(' | ')); }

(async () => {
  const b = await L.start();
  let p, before, after;

  // Linked and unlinked suppliers both confirm directly, even when lazy supplier tools cannot load.
  for (const linked of [true, false]) {
    const extra = F.fixture();
    if (!linked) Object.keys(extra).filter(k => /\/suppliers\//.test(k)).forEach(k => delete extra[k]);
    p = await open(b, '#/', { extra, block: 'js/supplier-(core|store)\\.js|js/suppliers\\.js', denyReads: '/suppliers$' });
    await ready(p);
    before = protectedRecords(await dump(p));
    ok(await p.textContent(button) === 'Order done', (linked ? 'linked' : 'unlinked') + ': the bar has an explicit Order done action');
    await p.click(button); await saved(p); await undoReady(p);
    after = await dump(p);
    ok(after[completion].by === 'sam' && after[completion].day === F.today && after[completion].sid === 'northside', (linked ? 'linked' : 'unlinked') + ': saves this chef and the exact occurrence');
    ok(Object.keys(after[completion]).sort().join() === 'at,by,day,on,sid', 'completion uses only the existing reminder data format');
    ok(before === protectedRecords(after), 'completion creates no order history, changes no staff requests and leaves catalogue data untouched');
    ok(await p.evaluate(() => location.hash === '#/' && !window.LK_SUP_CORE && !window.LK_SUP_STORE && !window.LK_SUP), 'completion stays on the landing page without loading supplier tools');
    ok((await supplierReads(p)).length === 0, 'completion needs no catalogue or order history reads');
    ok(!(await p.$(button)), 'completion removes the reminder');
    await undo(p).click(); await saved(p, completion, false); await ready(p);
    ok(protectedRecords(await dump(p)) === before, 'Undo restores the reminder without touching orders or history');
    ok((await writes(p)).length === 2 && (await writes(p))[1].data.on === false, 'completion and Undo make one reminder write each');
    await noErrors(p, linked ? 'linked completion and Undo' : 'unlinked completion and Undo');
    await p.context().close();
  }

  // An open quantity/stock draft is not validated, recorded, cleared or replaced by the reminder action.
  p = await open(b, '#/suppliers/northside');
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]') && /Last order:/.test(document.body.textContent), null, 10000);
  await ready(p);
  await p.fill(qty, '3 cartons to check');
  await p.click('[data-item="t-stock"] .su-item > summary');
  await p.fill(stock, '4');
  before = protectedRecords(await dump(p));
  const last = await p.textContent('[data-item="t-stock"] .su-last');
  await p.click(button); await saved(p); await undoReady(p);
  ok(await p.inputValue(qty) === '3 cartons to check' && await p.inputValue(stock) === '4', 'reminder confirmation preserves a draft even when its quantity is not ready to record');
  ok(await p.evaluate(() => location.hash === '#/suppliers/northside') && !(await p.$('.su-review')), 'the open supplier page stays on its draft');
  ok(await p.textContent('[data-item="t-stock"] .su-last') === last && protectedRecords(await dump(p)) === before, 'last-order comparison and immutable history stay unchanged');
  await undo(p).click(); await saved(p, completion, false); await ready(p);
  ok(await p.inputValue(qty) === '3 cartons to check' && await p.inputValue(stock) === '4', 'Undo also preserves the in-progress supplier draft');
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
  await L.waitFor(p, () => /Not saved|Not ticked|Could not/i.test(document.body.textContent) && !!document.querySelector('#cut-band [data-cut="done"]'), null, 10000);
  ok(!(await dump(p))[completion] && !!(await p.$(button)), 'a refused save restores the reminder and records no completion');
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
    const stale = document.createElement('button'); stale.dataset.cut = 'done'; stale.dataset.id = 'northside|' + day;
    document.body.appendChild(stale); stale.click(); stale.remove();
  }, F.today);
  await L.settle(p, 300);
  ok((await writes(p)).length === 1 && JSON.stringify((await dump(p))[completion]) === original, 'a repeated completion preserves the original attribution and makes no duplicate write');
  await noErrors(p, 'queued and repeated completion');
  await p.context().close();

  // Tomorrow's early cut-off is completed under tomorrow, never under the day the chef taps.
  const early = F.fixture(), next = (new Date(L.NOW).getDay() + 2) % 7;
  early[F.key(['config', 'main'])].cutoffs = [{ id: 'northside', name: 'Northside Test Foods', dd: [next], at: 60, pre: 1, lead: 240 }];
  const tomorrow = L.ymd(new Date(L.NOW + 86400000)), tomorrowKey = F.key(['cutdone', tomorrow + '_northside']);
  p = await open(b, '#/', { extra: early, clock: L.NOW + 8.5 * 3600000 }); await ready(p);
  await p.click(button); await saved(p, tomorrowKey); await undoReady(p);
  after = await dump(p);
  ok(!after[completion] && after[tomorrowKey].day === tomorrow, 'an early reminder saves only its own next-day occurrence');
  await undo(p).click(); await saved(p, tomorrowKey, false); await ready(p);
  ok(!(await dump(p))[completion], 'Undo of an early reminder also leaves today untouched');
  await noErrors(p, 'next-day completion');
  await p.context().close();

  // Existing chef permissions and the compact bar layout hold on phone, tablet and desktop.
  for (const persona of [{ who: 'bo', width: 390, by: 'bo' }, { who: 'sam', width: 768, by: 'sam' }, { who: 'bo', admin: true, width: 1280, by: 'bo' }]) {
    p = await open(b, '#/', persona); await ready(p);
    ok(!(await L.overflow(p)), 'Order done fits the existing bar at ' + persona.width + ' px');
    await p.click(button); await saved(p); await undoReady(p);
    ok((await dump(p))[completion].by === persona.by, 'completion retains the authorised ' + persona.by + ' identity');
    await noErrors(p, 'authorised completion at ' + persona.width + ' px');
    await p.context().close();
  }
  p = await open(b, '#/orders', { who: 'ann' });
  ok(!(await p.$(button)) && !(await p.$('.cut-tl')), 'staff still see no reminder completion controls');
  await p.evaluate(day => {
    const forged = document.createElement('button'); forged.dataset.cut = 'done'; forged.dataset.id = 'northside|' + day;
    document.body.appendChild(forged); forged.click(); forged.remove();
  }, F.today);
  await L.settle(p, 500);
  ok(!(await dump(p))[completion] && (await writes(p)).length === 0, 'a staff member cannot trigger reminder completion through a forged control');
  await noErrors(p, 'staff refusal');
  await p.context().close();

  // An Undo left from the previous chef must not be carried into the next chef's session.
  p = await open(b, '#/orders', { deviceMode: 'shared' }); await ready(p);
  await p.click(button); await saved(p); await undoReady(p);
  await p.click('.nb-top [data-p="who-change"]');
  await L.waitFor(p, () => !!document.querySelector('.p-name[data-id="bo"]'), null, 10000);
  await p.click('.p-name[data-id="bo"]'); await p.type('#pf1', '3333');
  await L.waitFor(p, () => window.LK_PREP.whoName() === 'Bo' && window.LK_PREP.supplier().read(), null, 10000);
  if (await undo(p).count()) await undo(p).click();
  await L.settle(p, 300);
  after = await dump(p);
  ok(after[completion].on === true && after[completion].by === 'sam' && (await writes(p)).length === 1, 'old Undo cannot uncheck the order as the next chef on a shared tablet');
  await noErrors(p, 'Undo after handover');
  await p.context().close();

  await b.close();
  L.report(R);
})();
