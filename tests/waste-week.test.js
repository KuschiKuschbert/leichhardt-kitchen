// Wastage, Last 7 days (head chef and sous chefs): today is always counted, whatever day was being browsed, and
// removing or putting back a past entry shows at once without reading the past days again (audit, October 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date()), yest = L.ymd(new Date(L.NOW - 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const reads = page => page.evaluate(() => window.__fake.reads.filter(k => /\/waste\//.test(k)).length);
const extra = {};
extra[fsKey(['waste', yest, 'lines', 'y1'])] = { text: 'Mash', amount: 1.5, unit: 'kg', reason: 'prep', action: '', station: 'Larder', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 86400000 - 7200000, deleted: false };
(async () => {
  const b = await L.start();

  // browse back a day, then Last 7 days: today's entry is still there
  let p = await L.open(b, '#/waste', { extra, wait: 1500 });
  await p.click('[data-p="wday"][data-d="-1"]');
  await p.waitForTimeout(400);
  ok(/Mash/.test(await txt(p, '.nb-body')), 'by day: yesterday shows the Mash entry');
  await p.click('[data-p="wview"][data-v="week"]');
  await p.waitForTimeout(800);
  let body = await txt(p, '.nb-body');
  ok(/Chips/.test(body) && /Mash/.test(body), 'last 7 days after browsing back: today\'s Chips and yesterday\'s Mash both listed');
  ok(/2 entries/.test(await txt(p, '.w-sum')), 'last 7 days: the total counts today (2 entries)');

  // remove yesterday's entry from Last 7 days: the row goes at once, Undo brings it back, no past days read again
  const before = await reads(p);
  await p.click('[data-p="wdel"][data-id="y1"]');
  await p.waitForTimeout(400);
  body = await txt(p, '.nb-body');
  ok(!/Mash/.test(body), 'last 7 days: removed entry leaves the page at once');
  ok(/1 entry\b/.test(await txt(p, '.w-sum')), 'last 7 days: the total drops to 1 entry');
  let s = await store(p);
  ok(s[fsKey(['waste', yest, 'lines', 'y1'])].deleted === true, 'last 7 days: the entry is flagged removed in the store');
  ok(/Removed Mash from the wastage log/.test(await txt(p, '.p-toast')), 'last 7 days: toast with Undo');
  await p.click('.p-toast-btn');
  await p.waitForTimeout(400);
  s = await store(p);
  ok(s[fsKey(['waste', yest, 'lines', 'y1'])].deleted === false, 'last 7 days: Undo puts the entry back in the store');
  ok(/Mash/.test(await txt(p, '.nb-body')), 'last 7 days: the entry is back on the page');
  ok(await reads(p) === before, 'last 7 days: remove and Undo read nothing (' + (await reads(p) - before) + ' reads)');

  // switching views again does not read the past days again
  await p.click('[data-p="wview"][data-v="day"]');
  await p.waitForTimeout(200);
  const mid = await reads(p);
  await p.click('[data-p="wview"][data-v="week"]');
  await p.waitForTimeout(400);
  ok(await reads(p) === mid, 'last 7 days: opening it again reads nothing new (' + (await reads(p) - mid) + ' reads)');
  ok(p.errors.length === 0, 'waste week: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
