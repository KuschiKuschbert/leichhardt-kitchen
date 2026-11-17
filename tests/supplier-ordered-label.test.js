// Ordered for which delivery (head chef, 17 Nov 2026). The time a chef ticks Order placed or records an order is the
// time it was placed: inside the window it counts for that window, after the cut-off it rolls to the next window. The
// supplier chip, the phone's supplier picker and its cut-off line say "Ordered for Thu 19 Nov" in green, also on the
// supplier you are on, and keep it until the end of the cut-off day. The Order list says a closed cut-off was ordered
// for the next delivery and stops calling it overdue. Ticks for the next 8 days are read, so a weekly supplier ordered
// days ahead shows too. Before, the label looked only at today's cut-off and the phone read only today's and
// tomorrow's ticks. Pages open at 14:00 today (tests/lib.js). Made-up suppliers only.
const L = require('./lib'), F = require('./supplier-fixtures'), CUT = require('../js/cutoffs.js'), { R, ok } = L.results();
const day = n => CUT.shift(F.today, n), dow = n => (new Date(L.NOW).getDay() + n) % 7;
const forDay = n => 'Ordered for ' + CUT.dateText(day(n));
const GREEN_ON_DARK = 'rgb(159, 224, 183)';   // --done-on-dark: the selected chip is charcoal
const tick = n => F.key(['cutdone', day(n) + '_northside']);
// the shared fixture with Northside's cut-off lines replaced
function seed(cut, extra) {
  const s = F.fixture(), cfg = s[F.key(['config', 'main'])];
  cfg.cutoffs = [Object.assign({ id: 'northside', name: 'Northside Test Foods', lead: 240 }, cut)];
  return Object.assign(s, extra || {});
}
const daily = at => ({ dd: [0, 1, 2, 3, 4, 5, 6], at, pre: 1 });
async function record(p) {
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"][data-i="t-stock"]'), null, 15000);
  await p.fill('input[data-sf="qty"][data-i="t-stock"]', '3');
  await p.click('[data-su="review"]');
  await L.waitFor(p, () => !!document.querySelector('[data-su="record"]:not([disabled])'), null, 10000);
  await p.click('[data-su="record"]');
  await L.waitFor(p, () => /Order recorded/.test(document.querySelector('#supplier-root')?.textContent || ''), null, 10000);
  await L.settle(p, 300);
}
// what the supplier page says about Northside: the chip (from 720 px), the picker option and the cut-off line (phone)
function look(p) {
  return p.evaluate(() => {
    const em = document.querySelector('.su-pick[data-sid="northside"] .su-pick-cut'), info = document.querySelector('.su-info-line');
    const opt = document.querySelector('select[data-sf="supplier"] option[value="northside"]');
    return { chip: em ? em.textContent : '', chipDone: !!em && em.classList.contains('done'), chipColour: em ? getComputedStyle(em).color : '',
      option: opt ? opt.textContent : '', info: info && info.offsetParent ? info.textContent : '', infoDone: !!info && info.classList.contains('done'),
      card: document.querySelector('.su-cutoff')?.textContent || '', root: document.querySelector('#supplier-root')?.textContent || '' };
  });
}
async function supplierPage(b, extra, width, o) {
  const p = await L.open(b, '#/suppliers/northside', Object.assign({ who: 'sam', extra, wait: 1500, width, height: width === 390 ? 844 : 900 }, o || {}));
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  await L.settle(p, 300);
  return p;
}
async function openCuts(p) {
  await L.waitFor(p, () => !!document.querySelector('.o-cut-fold > summary'), null, 10000);
  if (!(await p.$eval('.o-cut-fold', e => e.open))) await p.click('.o-cut-fold > summary');
  await L.waitFor(p, () => !!document.querySelector('.cut-tl [data-p="cut-tick"][data-id^="northside|"]'), null, 10000);
}
const rowText = p => p.evaluate(() => { const r = document.querySelector('.cut-tl li'); return r ? r.textContent : ''; });
const summary = p => p.evaluate(() => document.querySelector('.o-cut-fold > summary')?.textContent || '');
// a wait that reports instead of stopping the file, so the old code shows every failing check
const waited = (p, fn, arg) => L.waitFor(p, fn, arg, 8000).then(() => true, () => false);

(async () => {
  const b = await L.start();
  let p, x;

  // 1. On time: the 15:00 cut-off is open at 14:00, so the order is for tomorrow's delivery. Green on the chip you are on.
  p = await supplierPage(b, seed(daily(15 * 60)), 1280);
  x = await look(p);
  ok(x.chip === 'by 15:00' && !x.chipDone, 'open cut-off: the chip says by 15:00 before ordering (' + x.chip + ')');
  await record(p);
  x = await look(p);
  ok(x.chip === '✓ ' + forDay(1) && x.chipDone, 'on time: the chip names the delivery the order is for (' + x.chip + ')');
  ok(x.chipColour === GREEN_ON_DARK, 'on time: green on the selected charcoal chip too (' + x.chipColour + ')');
  ok(x.root.indexOf('Order recorded for ' + CUT.dateText(day(1)) + '.') >= 0, 'on time: the recorded message names the delivery');
  ok(!p.errors.length, 'on time: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. Late: the 10:00 cut-off closed, so the order rolls to tomorrow's 10:00 cut-off, for the day after's delivery.
  for (const w of [390, 1280]) {
    p = await supplierPage(b, seed(daily(10 * 60)), w);
    await record(p);
    x = await look(p);
    if (w === 390) {
      ok(x.option === 'Northside Test Foods · ✓ ' + forDay(2), 'late, phone: the supplier picker names the next delivery (' + x.option + ')');
      ok(x.info.indexOf('✓ ' + forDay(2)) === 0 && x.infoDone, 'late, phone: the cut-off line says it in green (' + x.info + ')');
    } else ok(x.chip === '✓ ' + forDay(2) && x.chipDone, 'late, laptop: the chip names the next delivery (' + x.chip + ')');
    const dump = await p.evaluate(() => window.__fake.dump());
    ok(dump[tick(1)]?.on === true && !dump[tick(0)], 'late, ' + w + ' px: only the next window is ticked');
    ok(!p.errors.length, 'late, ' + w + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 3. The Order list after a late recording: the closed cut-off says it was ordered for the next delivery, not overdue.
  p = await L.open(b, '#/orders', { who: 'sam', extra: seed(daily(10 * 60), { [tick(1)]: { day: day(1), sid: 'northside', on: true, at: L.NOW - 600000, by: 'sam' } }), wait: 1500 });
  await openCuts(p);
  x = await rowText(p);
  ok(x.indexOf('Closed') >= 0 && x.indexOf(forDay(2).replace('Ordered', 'ordered')) >= 0 && x.indexOf('not confirmed') < 0, 'Order list: the closed cut-off says ordered for the next delivery (' + x + ')');
  x = await summary(p);
  ok(x.indexOf('overdue') < 0 && x.indexOf('All supplier orders placed') >= 0, 'Order list: not overdue once the next window is ordered (' + x + ')');
  await p.context().close();

  // 4. A late tick on the Order list rolls to the next window too, says so, and Undo takes that tick off.
  p = await L.open(b, '#/orders', { who: 'sam', extra: seed(daily(10 * 60)), wait: 1500 });
  await openCuts(p);
  x = await rowText(p);
  ok(x.indexOf('Closed, not confirmed') >= 0, 'late tick: before it, the closed cut-off is not confirmed (' + x + ')');
  await p.click('.cut-tl [data-p="cut-tick"][data-id^="northside|"]');
  ok(await waited(p, k => window.__fake.dump()[k]?.on === true, tick(1)), 'late tick: it ticks the next window');
  let dump = await p.evaluate(() => window.__fake.dump());
  ok(!dump[tick(0)], 'late tick: the closed window is not ticked');
  const toast = await p.evaluate(() => document.querySelector('.p-toast')?.textContent || '');
  ok(toast.indexOf('Northside Test Foods: ordered for ' + CUT.dateText(day(2)) + '.') >= 0, 'late tick: the slip names the delivery (' + toast + ')');
  await waited(p, () => /ordered for/.test(document.querySelector('.cut-tl li')?.textContent || ''));
  x = await rowText(p);
  ok(x.indexOf(forDay(2).replace('Ordered', 'ordered')) >= 0 && x.indexOf('Sam') >= 0, 'late tick: the row says it was ordered for the next delivery, by whom (' + x + ')');
  await p.click('.cut-tl [data-p="cut-tick"][data-id^="northside|"]');
  ok(await waited(p, k => window.__fake.dump()[k]?.on === false, tick(1)), 'late tick: the row\'s Undo takes the next window\'s tick off');
  ok(!p.errors.length, 'late tick: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 5. A weekly supplier ordered 3 days ahead: the tick is read, so the chip and the card say ordered.
  p = await supplierPage(b, seed({ dd: [dow(4)], at: 15 * 60, pre: 1 }, { [tick(3)]: { day: day(3), sid: 'northside', on: true, at: L.NOW - 600000, by: 'sam' } }), 1280);
  x = await look(p);
  ok(x.chip === '✓ ' + forDay(4) && x.chipDone, '3 days ahead: the chip says ordered for that delivery (' + x.chip + ')');
  ok(x.card.indexOf('Ticked as ordered') >= 0, '3 days ahead: the cut-off card says it is ticked as ordered (' + x.card + ')');
  await p.context().close();

  // 6. Not ordered, next cut-off on another day: the chip gives its weekday.
  p = await supplierPage(b, seed({ dd: [dow(3)], at: 15 * 60, pre: 1 }), 1280);
  x = await look(p);
  ok(x.chip === 'by ' + CUT.DY[dow(2)] + ' 15:00' && !x.chipDone, 'next cut-off in 2 days: the chip gives its weekday (' + x.chip + ')');
  await p.context().close();

  // 7. Green until the end of the cut-off day: today's 10:00 window was ordered at 09:00; at 14:00 it is still green.
  const done0 = { [tick(0)]: { day: day(0), sid: 'northside', on: true, at: L.NOW - 5 * 3600000, by: 'sam' } };
  p = await supplierPage(b, seed(daily(10 * 60), done0), 1280);
  x = await look(p);
  ok(x.chip === '✓ ' + forDay(1) && x.chipDone, 'after its cut-off: still green for the rest of the cut-off day (' + x.chip + ')');
  await p.context().close();
  // the next morning at 08:00 the next window shows its time again
  p = await supplierPage(b, seed(daily(10 * 60), done0), 1280, { clock: L.NOW + 18 * 3600000 });
  x = await look(p);
  ok(x.chip === 'by 10:00' && !x.chipDone, 'the next morning: the next window\'s time again (' + x.chip + ')');
  await p.context().close();

  await b.close();
  L.report(R);
})();
