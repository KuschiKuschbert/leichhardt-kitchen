// Records (head chef, 13 Nov 2026, docs/smart-book-options/brief.md): Reports, Records. The month is a list of
// finished days from the nightly count (analysis/dashboard, 1 read); a day's food safety part needs no read; Everything
// reads that day's wastage, transfers, team plan and day record; a part that could not load says so and is never
// "nothing that day"; weekdays are Queensland's; Print this month prints what the page holds, with no reads.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const short = d => DOW[new Date(d + 'T12:00:00Z').getUTCDay()] + ' ' + (+d.slice(8));
const at = (d, hm) => Date.parse(d + 'T' + hm + ':00+10:00');
const target = day(3), notCounted = day(1), counted = day(2);
const rows = [];
for (let i = 40; i >= 2; i--) {
  const d = day(i);
  rows.push({ day: d, p: { n: 20, w: 18, t: 17, r: 2, sec: {}, mins: {}, who: {} }, w: { n: 0, reason: {}, sec: {}, items: [] }, x: { out: 0, in: 0 },
    fs: { v: 1, del: d === target ? [{ at: '07:42', s: 'Bidfood', c: 3.1, f: null, n: 'All there', by: 'Ann' }, { at: '10:20', s: 'Seafood', c: 1.8, f: -19.5, n: '', by: 'Bo' }] : [],
      c: d === counted ? null : d === target ? { cv: 1, due: 35, done: 31, miss: ['Fryer oil change', 'Cool room floor'], missN: 2, unable: [{ t: 'Hood filters', n: 'No degreaser' }], unableN: 1, wait: ['Probe check'], waitN: 1, ev: 0, evRec: 0 }
        : { cv: 1, due: 30, done: 30, miss: [], missN: 0, unable: [], unableN: 0, wait: [], waitN: 0, ev: 0, evRec: 0 },
      cool: d === target ? { k: 'batch', start: '14:05', by: 'Bo', s2: '16:10', s2by: 'Bo', r1: '16:07', r1by: 'Bo', r2: '', r2by: '' } : i > 20 ? { k: 'before' } : { k: 'none' } } });
}
const extra = {
  [fsKey(['analysis', 'dashboard'])]: { v: 1, generation: 'g1', at: L.NOW - 11 * 3600000, from: day(40), to: day(2), days: rows },
  [fsKey(['analysis', 'health'])]: { at: L.NOW - 11 * 3600000, status: 'ok' },
  [fsKey(['analysisDaily', 'g1_' + target])]: { v: 1, day: target, entries: [{ source: 'supplierOrders', text: 'Milk' }, { source: 'supplierOrders', text: 'Cream' }, { source: 'functions', text: 'Smith 60th' }] },
  [fsKey(['waste', target, 'lines', 'r1'])]: { text: 'Chips', amount: 2, unit: 'kg', reason: 'excess', station: 'Fryer', addedBy: 'Bo', addedAt: at(target, '21:30'), deleted: false },
  [fsKey(['transfers', target, 'lines', 't1'])]: { text: 'Lemons', amount: 12, unit: 'pieces', dir: 'out', venue: 'Riviera', addedBy: 'Ann', addedAt: at(target, '11:00'), deleted: false }
};
const go = async (p) => { await L.adminTab(p, 'records'); await L.waitFor(p, () => !!document.querySelector('.rec-days, .rec-page .p-err'), null, 5000); };
// the day as words: each row's parts joined by spaces (innerText would give the kind labels in capitals)
const dayText = p => p.evaluate(() => { const v = document.querySelector('.rec-dayv'); return [...v.querySelectorAll('.rec-line, .rec-tl li, .rec-bad, .hint')].map(e => e.matches('li') ? [...e.children].map(c => c.textContent).join(' ') : e.textContent).join(' | ').replace(/\s+/g, ' '); });
const reads = p => p.evaluate(() => window.__fake.bill.filter(b => /analysis|waste|transfers|team|analysisDaily/.test(b.path)).map(b => b.path.split('/').slice(2).join('/')));
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/admin', { admin: true, extra, width: 1280, height: 900, wait: 2500 });
  await p.evaluate(() => { window.__fake.bill.length = 0; });
  await go(p);
  const list = await p.evaluate(() => [...document.querySelectorAll('.rec-dayrow')].map(b => [b.getAttribute('data-d'), b.querySelector('.rec-d').textContent, b.querySelector('.rec-t').textContent.replace(/\s+/g, ' ').trim()]));
  const row = d => list.find(x => x[0] === d) || [];
  ok(row(target)[1] === short(target) && row(target)[2] === '2 deliveries · Cleaning: 2 missed, 1 not possible, 1 awaiting Pass check · Cooling: 1 of 2 stages confirmed', 'a day says its deliveries and cleaning, with its own weekday (' + JSON.stringify(row(target)) + ')');
  ok(/^0 deliveries · Cleaning: count not ready · Cooling: no batch$/.test(row(counted)[2] || ''), 'a day whose cleaning was not counted says so, never 0 missed (' + row(counted)[2] + ')');
  ok(/^Count not ready\. The nightly run counts this day at 03:00\.$/.test(row(notCounted)[2] || ''), 'yesterday, after the last count, says it is not counted yet (' + row(notCounted)[2] + ')');
  ok(!!(await p.$('.rec-pick')) && await p.isVisible('.rec-pick'), 'the laptop opens with no day chosen: no day is read on open');
  const open1 = await reads(p);
  ok(open1.filter(x => /^analysis\/dashboard$/.test(x)).length === 1 && open1.filter(x => !/^analysis\//.test(x)).length === 0, 'opening Records reads the nightly record once and nothing else (' + open1.join(', ') + ')');

  // a finished day's food safety part: no read
  await p.evaluate(() => { window.__fake.bill.length = 0; });
  await p.click('.rec-dayrow[data-d="' + target + '"]'); await L.settle(p, 300);
  const fsView = await dayText(p);
  ok(/07:42 Delivery Bidfood · 3\.1 °C chilled · Ann · All there/.test(fsView) && /10:20 Delivery Seafood · 1\.8 °C chilled, -19\.5 °C frozen · Bo/.test(fsView), 'the day lists its deliveries in time order with the temperatures as recorded');
  ok(/Cleaning: 31 of 35 done\./.test(fsView) && /Missed: Fryer oil change, Cool room floor\./.test(fsView) && /Not possible: Hood filters \(No degreaser\)\./.test(fsView) && /Awaiting Pass check: Probe check\./.test(fsView), 'the day says cleaning done, missed, not possible and awaiting Pass check');
  ok(/All shown: deliveries, cleaning and cooling\./.test(fsView) && /The temperatures are in Operandio/.test(fsView), 'one status line, and where the cooling temperatures are');
  ok(/14:05 Cooling Batch started, 2 hour stage · Bo/.test(fsView) && /16:07 Cooling 2 hour stage recorded in Operandio · Bo/.test(fsView) && /16:10 Cooling 4 hour stage started · Bo/.test(fsView) && !/4 hour stage recorded/.test(fsView), 'the day\'s cooling batch in time order: started, confirmed recorded in Operandio');
  ok((await reads(p)).length === 0, 'a counted day\'s food safety part reads nothing more (' + (await reads(p)).join(', ') + ')');

  // Everything: that day's wastage, transfers, team plan and day record; a part that fails says so
  await p.evaluate(() => { window.__fake.failReads = /\/transfers\//; });
  await p.click('[data-p="rec-show"][data-v="all"]'); await L.settle(p, 600);
  let allView = await dayText(p);
  ok(/21:30 Wastage, time logged Chips 2 kg · Excess production · Fryer · Bo/.test(allView) && /Supplier orders recorded: 2 lines\. Functions: Smith 60th\./.test(allView) && /Prep: 20 lines, 17 ticked, 2 rolled on from earlier days\./.test(allView), 'Everything adds the wastage, the supplier orders, the function and prep');
  ok(/Transfers could not load\. Transfers may have records that are not shown\./.test(allView) && !/Lemons/.test(allView), 'a part that could not load says so, and is never nothing that day');
  await p.evaluate(() => { window.__fake.failReads = null; });
  await p.click('[data-p="rec-retry"]'); await L.settle(p, 600);
  allView = await dayText(p);
  ok(/11:00 Transfer out Lemons 12 pieces · Riviera · Ann/.test(allView) && !/could not load/.test(allView), 'Try again reads it and shows the transfer');

  // Print this month: what the page holds, no reads
  await p.evaluate(() => { window.__fake.bill.length = 0; window.print = () => { window.__printed = document.getElementById('rec-print').innerText; }; });
  await p.click('[data-p="rec-month"][data-v]:not([disabled])').catch(() => {});
  await L.settle(p, 200);
  await p.evaluate(() => { const b = document.querySelector('[data-p="rec-print"][data-v="month"]'); if (b) b.click(); });
  const printed = await p.evaluate(() => window.__printed || '');
  ok(/^Food safety records, /.test(printed) && /Temperatures as recorded/.test(printed) && /Equipment temperature logs are not in the book/.test(printed), 'Print this month prints the food safety records (' + printed.slice(0, 80) + ')');
  ok((await reads(p)).length === 0, 'Print this month reads nothing');
  ok(p.errors.length === 0, 'records: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a phone: the list, then the day on its own with Back; no sideways scroll at 390, 768 and 1280
  for (const w of [390, 768, 1280]) {
    p = await L.open(b, '#/admin', { admin: true, extra, width: w, height: w === 390 ? 844 : 900, wait: 2500 });
    await go(p);
    ok(await L.overflow(p) <= 0, w + ' px: the month has no sideways scroll');
    await p.click('.rec-dayrow[data-d="' + target + '"]'); await L.settle(p, 300);
    ok(await L.overflow(p) <= 0, w + ' px: the day has no sideways scroll');
    if (w < 1100) {
      ok(!(await p.isVisible('.rec-month')) && await p.isVisible('[data-p="rec-back"]'), w + ' px: the day opens on its own with Back');
      await p.click('[data-p="rec-back"]'); await L.settle(p, 200);
      ok(await p.isVisible('.rec-dayrow[data-d="' + target + '"]'), w + ' px: Back returns to the month');
    }
    ok(p.errors.length === 0, w + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // staff never see Records (the admin panel is the head chef's)
  p = await L.open(b, '#/admin', { who: 'ann', extra, width: 390, height: 844, wait: 2000 });
  ok(!(await p.$('.rec-page')), 'staff: no Records page');
  await p.context().close();
  L.report(R); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
