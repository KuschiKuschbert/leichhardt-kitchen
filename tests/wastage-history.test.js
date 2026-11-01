// Exercise the report through its controls and downloaded CSV. These are synthetic kitchen records only.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), ago = n => L.ymd(new Date(L.NOW - n * 86400000));
const first = today.slice(0, 8) + '01', monthEnd = L.ymd(new Date(new Date(first + 'T12:00:00+10:00').getTime() - 86400000));
const monthStart = monthEnd.slice(0, 8) + '01';
const extra = {}, put = (d, id, text, amount, unit, more) => {
  extra[key('waste', d, 'lines', id)] = Object.assign({ text, amount, unit, reason: 'excess', station: 'Grill', action: '', addedBy: 'Ann', addedById: 'ann', addedAt: new Date(d + 'T18:00:00+10:00').getTime(), deleted: false }, more);
};
put(ago(2), 'fillet', 'Fish fillets', 2, 'kg', { reason: 'expired', action: 'Order smaller packs' });
put(ago(9), 'crumb', 'Fish fillets', 500, 'g', { reason: 'prep', station: 'Larder', addedBy: 'Bo', addedById: 'bo' });
put(ago(9), 'cream', 'Cream', 1, 'L', { station: 'Larder' });
put(ago(2), 'gone', 'Removed fish', 50, 'kg', { deleted: true, deletedBy: 'Sam' });
put(monthStart, 'first', 'Month opening', 3, 'pieces');
put(monthEnd, 'last', 'Month closing', 4, 'portions');
put('2026-07-05', 'old', 'Older schnitzels', 6, 'pieces', { reason: 'fault' });
put(ago(2), 'html', '<img src=x onerror=alert(1)>', 1, 'pieces', { action: '=HYPERLINK("bad","note")', addedBy: '<b>Ann</b>' });
put(ago(4), 'proto', '__proto__', 1, 'pieces', { station: 'constructor', addedBy: 'constructor' });
extra[key('orders', monthStart, 'lines', 'not-waste')] = { text: 'Not wastage', qty: '99 kg' };
extra[key('transfers', monthStart, 'lines', 'not-waste')] = { text: 'Not wastage either', amount: 99, unit: 'kg' };
extra[key('waste', monthEnd)] = { avoidable: 'Month end review', change: 'Smaller batches', reviewBy: 'Sam', reviewAt: L.NOW - 1000 };
const ready = p => L.waitFor(p, () => !!document.querySelector('[data-lv="waste-log"]'));
const rows = p => p.$$eval('[data-lv="waste-log"] tbody tr', a => a.map(x => x.textContent));
const totals = p => p.$$eval('.wh-totals .a-tile', a => a.map(x => ({ n: x.querySelector('strong').textContent, label: x.querySelector('span').textContent })));
const reads = p => p.evaluate(() => window.__fake.reads.length);
async function report(b, opts) {
  const p = await L.open(b, '#/admin', Object.assign({ admin: true, who: '', extra }, opts));
  await L.adminTab(p, 'waste'); await ready(p); return p;
}
async function period(p, value) {
  await L.pick(p, '[data-k="wh-period"]', value); await ready(p);
}
async function csv(p) {
  const dl = p.waitForEvent('download'); await p.click('[data-p="csv"][data-v="waste"]');
  const d = await dl, chunks = []; for await (const c of await d.createReadStream()) chunks.push(c);
  return { text: Buffer.concat(chunks).toString('utf8'), name: d.suggestedFilename() };
}
(async () => {
  const b = await L.start();
  let p = await report(b);
  ok(await p.$eval('[data-k="wh-period"]', e => e.value) === '30', 'opens History with 30 days, independently of the other admin reports');
  ok(!!(await p.$('[data-p="wh-view"][data-v="history"][aria-pressed="true"]')), 'History is the selected view');
  ok((await rows(p)).some(x => /Fish fillets/.test(x)) && !(await rows(p)).some(x => /Removed fish/.test(x)), 'logged entries show, removed entries start hidden');
  ok(!(await p.$('.wh-report img')) && /<img src=x/.test((await rows(p)).join(' ')), 'entry text is escaped');
  const before = await reads(p);
  await period(p, '7');
  ok((await rows(p)).some(x => /Fish fillets/.test(x)) && !(await rows(p)).some(x => /500 g/.test(x)), 'one week includes recent fish, excludes the nine-day-old entry');
  await period(p, '14');
  ok((await rows(p)).some(x => /500 g/.test(x)), 'two weeks includes the older entry');
  ok(await reads(p) === before, 'switching shorter periods reuses loaded records');
  await p.fill('[data-k="wh-search"]', 'Fish fillets'); await L.settle(p, 250);
  let t = await totals(p);
  ok(t.some(x => x.label === 'kg' && x.n === '2.5') && t.some(x => /logged entries/.test(x.label) && x.n === '2'), 'search updates totals; 500 g and 2 kg combine into 2.5 kg');
  let file = await csv(p);
  ok((file.text.match(/Fish fillets/g) || []).length === 2 && !/Cream|Removed fish/.test(file.text), 'CSV matches the search');
  await p.click('.wh-filters > summary');
  await L.pick(p, '[data-k="af-reason"]', 'expired');
  await p.fill('[data-k="wh-who"]', 'Ann');
  await L.pick(p, '[data-k="wh-unit"]', 'kg');
  t = await totals(p); file = await csv(p);
  ok((await rows(p)).length === 1 && t.some(x => x.label === 'kg' && x.n === '2') && (file.text.match(/Fish fillets/g) || []).length === 1, 'reason, logger and unit filters agree across list, totals and CSV');
  await L.pick(p, '[data-k="af-dow"]', String(new Date(ago(2) + 'T12:00:00+10:00').getDay()));
  file = await csv(p);
  ok((await rows(p)).length === 1 && /Fish fillets/.test(file.text), 'weekday filter also applies to CSV');
  await p.click('[data-p="wh-clear"]');
  await p.click('.wh-filters > summary');
  await p.check('[data-k="wh-removed"]');
  file = await csv(p); t = await totals(p);
  ok((await rows(p)).some(x => /Removed fish/.test(x)) && /Removed fish.*Removed/.test(file.text) && t.some(x => x.label === 'kg' && x.n === '4.5'), 'Show removed includes marked entries in the list and CSV while excluding their 50 kg from totals');
  ok(file.text.includes("'=HYPERLINK"), 'typed formula-like notes export as spreadsheet text');
  await L.pick(p, '[data-k="lv-s:waste-log"]', 'old');
  file = await csv(p);
  ok(file.text.indexOf('500,g') < file.text.indexOf('2,kg,Expired stock'), 'CSV follows the selected oldest-first list order');
  await p.evaluate(() => { window.__fake.deny = /\/waste\/.*\/lines\/fillet$/; });
  await p.click('[data-p="wdel"][data-id="fillet"]'); await L.settle(p, 500);
  ok(await p.evaluate(k => window.__fake.dump()[k].deleted === false, key('waste', ago(2), 'lines', 'fillet')) && (await rows(p)).some(x => /Fish fillets.*2 kg/.test(x)), 'a refused removal keeps the saved record and visible report unchanged');
  await p.evaluate(() => { window.__fake.deny = null; });
  await p.click('[data-p="wh-clear"]');
  await period(p, 'last');
  const range = await L.txt(p, '.wh-range');
  const lastRows = (await rows(p)).join(' ');
  ok(lastRows.includes('Month opening') && lastRows.includes('Month closing') && !/Not wastage|Older schnitzels/.test(lastRows), 'Last month includes both calendar boundaries and excludes order and transfer records');
  file = await csv(p);
  ok(file.name.includes(monthStart + '-to-' + monthEnd) && file.text.includes(monthStart) && file.text.includes(monthEnd), 'export filename and records use the exact calendar month');
  ok(range.includes(monthStart.split('-').reverse().join('/')) && range.includes(monthEnd.split('-').reverse().join('/')), 'the selected date boundaries are visible');
  await p.click('[data-p="wh-view"][data-v="reviews"]');
  await L.waitFor(p, () => !!document.querySelector('#w-ra'));
  ok(await p.$eval('[data-k="wh-review-date"]', e => e.value) === monthEnd && /Month end review/.test(await p.inputValue('#w-ra')), 'Daily reviews opens the last selected day and its saved review');
  await p.fill('#w-ra', 'Changed review');
  await L.pick(p, '[data-k="wh-period"]', '7');
  ok(await p.$eval('[data-k="wh-period"]', e => e.value) === 'last' && await p.inputValue('#w-ra') === 'Changed review', 'changing dates cannot silently discard an unsaved review');
  // Cancel edits throws the words away, so it asks a second tap first (28 Oct 2026)
  await p.click('[data-p="wh-review-cancel"]');
  ok(await p.inputValue('#w-ra') === 'Changed review' && await L.txt(p, '[data-p="wh-review-cancel"]') === 'Tap again to discard', 'Cancel edits asks again before the words go');
  await p.click('[data-p="wh-review-cancel"]');
  ok(/Month end review/.test(await p.inputValue('#w-ra')), 'the second tap on Cancel edits puts the saved review back');
  await p.click('[data-p="wh-view"][data-v="history"]');
  await period(p, 'custom');
  await p.fill('[data-k="wh-from"]', '2026-07-01'); await p.fill('[data-k="wh-to"]', '2026-07-31');
  await p.click('[data-p="wh-apply"]'); await ready(p);
  ok((await rows(p)).some(x => /Older schnitzels/.test(x)), 'custom dates load records older than the former 60-day window');
  const customReads = await reads(p);
  await p.fill('[data-k="wh-from"]', '2026-08-02'); await p.fill('[data-k="wh-to"]', '2026-07-01');
  await p.click('[data-p="wh-apply"]');
  ok(/valid dates/.test(await L.txt(p, '.wh-report') || '') && await reads(p) === customReads && (await rows(p)).some(x => /Older schnitzels/.test(x)), 'reversed custom dates show an error and preserve the last applied report without reads');
  await p.fill('[data-k="wh-from"]', '2024-01-01'); await p.fill('[data-k="wh-to"]', '2026-07-01');
  await p.click('[data-p="wh-apply"]');
  ok(/366 days/.test(await L.txt(p, '.wh-report') || '') && await reads(p) === customReads, 'oversized custom ranges are rejected before a query');
  await p.fill('[data-k="wh-from"]', '2026-07-01'); await p.fill('[data-k="wh-to"]', '2026-07-31'); await p.click('[data-p="wh-apply"]');
  // Another admin's correction invalidates the same-day cache through the existing config listener.
  await p.evaluate(({ date, pin }) => {
    const root = 'kitchens/' + pin + '/', db = window.__fake.dump();
    window.__fake.write(root + 'waste/' + date + '/lines/old', Object.assign({}, db[root + 'waste/' + date + '/lines/old'], { deleted: true }));
    window.__fake.write(root + 'config/main', Object.assign({}, db[root + 'config/main'], { pastEdit: { w: Date.now() + 50 } }));
  }, { date: '2026-07-05', pin: L.PIN });
  await L.waitFor(p, () => !(document.querySelector('[data-lv="waste-log"]') || {}).textContent?.includes('Older schnitzels'));
  await ready(p);
  ok(!(await rows(p)).some(x => /Older schnitzels/.test(x)), 'another admin correction invalidates a cached past report');
  ok(p.errors.length === 0, 'main report flow has no page errors: ' + p.errors.join(' | '));
  await p.context().close();

  // The range query fails as a whole. No zero tiles, CSV or successful cache until Retry succeeds.
  p = await L.open(b, '#/admin', { admin: true, who: '', extra, failReads: '\\*\\*/lines' });
  await L.adminTab(p, 'waste');
  await L.waitFor(p, () => !!document.querySelector('.wh-error'));
  ok(!(await p.$('.wh-totals')) && await p.$eval('[data-p="csv"][data-v="waste"]', e => e.disabled), 'a failed query shows an error and disables totals and CSV');
  ok(await p.evaluate(() => !localStorage.getItem('lk.w.history')), 'a failed range is not saved as an empty cache');
  await p.evaluate(() => { window.__fake.failReads = null; }); await p.click('[data-p="w-refresh"]'); await ready(p);
  ok((await rows(p)).some(x => /Fish fillets/.test(x)) && !(await p.$('.wh-error')), 'Refresh retries the complete period and restores the report');
  ok(p.errors.length === 0, 'failure and recovery have no page errors: ' + p.errors.join(' | '));
  await p.context().close();

  for (const [clock, value, from, to] of [
    [Date.UTC(2024, 2, 1, 4), 'last', '01/02/2024', '29/02/2024'],
    [Date.UTC(2024, 2, 1, 4), 'months3', '01/12/2023', '29/02/2024'],
    [Date.UTC(2027, 0, 1, 4), 'last', '01/12/2026', '31/12/2026']
  ]) {
    p = await report(b, { clock, tz: 'America/Los_Angeles' });
    await period(p, value);
    const span = await L.txt(p, '.wh-range');
    ok(span.includes(from) && span.includes(to), value + ': calendar dates stay correct across leap years, year changes and the phone time zone (' + span + ')');
    ok(p.errors.length === 0, 'calendar boundary flow has no page errors');
    await p.context().close();
  }

  for (const width of [390, 768, 1280]) {
    p = await report(b, { width });
    for (const view of ['history', 'summary', 'reviews']) {
      await p.click('[data-p="wh-view"][data-v="' + view + '"]');
      await L.waitFor(p, () => !document.querySelector('.wh-report [role="status"]')?.textContent.startsWith('Loading wastage'));
      ok(!(await L.overflow(p)), width + ': ' + view + ' fits without sideways scroll');
    }
    ok(p.errors.length === 0, width + ': all views have no page errors: ' + p.errors.join(' | '));
    await p.context().close();
  }
  for (const who of ['ann', 'sam']) {
    p = await L.open(b, '#/waste', { who, extra });
    ok(!(await p.$('[data-k="wh-period"]')) && await p.evaluate(() => !window.__fake.reads.some(x => x === '**/lines')), who + ': the staff page does not read private history');
    await p.context().close();
  }
  p = await L.open(b, '#/admin', { who: 'ann', admin: true, extra });
  ok(!(await p.$('[data-k="wh-period"]')) && await p.evaluate(() => !window.__fake.reads.some(x => x === '**/lines')), 'shared admin device still requires a chef PIN before showing history');
  await p.context().close();
  await b.close(); L.report(R);
})();
