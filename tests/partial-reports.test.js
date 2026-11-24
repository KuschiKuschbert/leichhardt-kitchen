// Synthetic failures must stay visible without turning unread records into completed reports.
const L = require('./lib');
const { R, ok } = L.results();
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
const selected = day(1), earlier = day(15), loanDay = day(45);
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const path = d => '/transfers/' + d + '/lines';
const transfer = (text, venue, n) => ({ text, venue, dir: 'out', amount: 12, unit: 'pieces', addedAt: L.NOW - n * 86400000, addedBy: 'Ann', deleted: false });
const record = transfer('Lemon sample', 'Market kitchen', 1);
const loan = transfer('Butter sample', 'Market kitchen', 45);
const extra = {
  [key('analysis', 'dashboard')]: { v: 1, generation: 'sample', at: L.NOW, from: selected, to: selected, days: [
    { day: selected, p: { n: 1, t: 1, r: 0 }, fs: { v: 1, del: [], c: null, cool: { k: 'none' } } }
  ] },
  [key('transfers', selected, 'lines', 'lemons')]: record,
  [key('transferOpen', loanDay + '_butter')]: { date: loanDay, lineId: 'butter', record: loan, open: true }
};
const recCSV = '.rec-dayv [data-p="rec-csv"]', recPrint = '.rec-dayv [data-p="rec-print"]';
const trCSV = '.a-export [data-p="csv"][data-v="transfers"]';

async function download(p, selector) {
  const [file] = await Promise.all([
    p.waitForEvent('download', { timeout: 5000 }),
    p.locator(selector).evaluate(button => {
      const menu = button.closest('details');
      if (menu && !menu.open) menu.querySelector('summary').click();
      if (button.disabled || !button.getClientRects().length) throw new Error('Report download is unavailable');
      button.click();
    })
  ]);
  const chunks = [];
  for await (const chunk of await file.createReadStream()) chunks.push(chunk);
  return { name: file.suggestedFilename(), csv: Buffer.concat(chunks).toString('utf8') };
}
async function attempt(p, selectors) {
  return p.evaluate(selectors => {
    const create = URL.createObjectURL, anchorClick = HTMLAnchorElement.prototype.click;
    let csv = 0, print = 0;
    URL.createObjectURL = () => { csv++; return 'blob:report-test'; };
    HTMLAnchorElement.prototype.click = function () { if (!this.download) anchorClick.call(this); };
    window.print = () => { print++; };
    try {
      for (const selector of selectors) {
        const button = document.querySelector(selector), disabled = button.disabled;
        button.disabled = false;
        button.click();
        button.disabled = disabled;
      }
    } finally {
      URL.createObjectURL = create;
      HTMLAnchorElement.prototype.click = anchorClick;
      window.dispatchEvent(new Event('afterprint'));
    }
    return { csv, print };
  }, selectors);
}
async function openExport(p) {
  const menu = p.locator('.a-export');
  if (!(await menu.evaluate(el => el.open))) await menu.locator('summary').click();
}
async function setPeriod(p, n) {
  await p.locator('.a-range .ux-picker-trigger').click();
  await p.locator('.ux-picker-option').getByText(n + ' days', { exact: true }).click();
}
async function selectDay(p) {
  await L.adminTab(p, 'records');
  await p.locator('.rec-dayrow[data-d="' + selected + '"]').click();
}
async function waitForTransfers(p) {
  await L.waitFor(p, () => {
    const s = LK_PREP.state;
    return s.atab === 'transfers' && s.xStats && !s.xStats.loading;
  });
}
async function retryNightlyFromDay(p) {
  const heading = await p.locator('.rec-dt').innerText();
  await p.locator('.rec-back').click();
  await p.evaluate(date => {
    __fake.failReads = /\/analysis\/dashboard$/;
    // Open the day while a month refresh is pending, before its failure can land.
    document.querySelector('.rec-month [data-p="rec-refresh"]').click();
    document.querySelector('.rec-dayrow[data-d="' + date + '"]').click();
  }, selected);
  await L.settle(p, 300);
  const refresh = p.locator('.rec-dayv [data-p="rec-refresh"]');
  ok(await refresh.isVisible() && await p.locator(recCSV).isDisabled() && await p.locator(recPrint).isDisabled(),
    '390 Records offers Refresh in the open day when the nightly read fails');
  if (!await refresh.isVisible()) return;
  await p.evaluate(() => { __fake.failReads = null; });
  await refresh.click();
  await L.waitFor(p, () => !!document.querySelector('.rec-dayv [data-p="rec-csv"]:not([disabled])'));
  ok(await p.locator('.rec-dt').innerText() === heading &&
    await p.locator('[data-p="rec-show"][data-v="all"]').getAttribute('aria-pressed') === 'true' &&
    /Lemon sample/.test(await p.locator('.rec-dayv').innerText()), '390 nightly Refresh recovers Everything on the same day');
}
async function records(b, width) {
  const p = await L.open(b, '#/admin', { admin: true, extra, width, denyReads: path(selected) });
  try {
    await selectDay(p);
    const foodBefore = await download(p, recCSV), saved = await p.evaluate(() => __fake.dump());
    const pending = await p.locator('[data-p="rec-show"][data-v="all"]').evaluate(el => {
      el.click();
      const actions = [...document.querySelectorAll('.rec-dayv [data-p="rec-print"], .rec-dayv [data-p="rec-csv"]')];
      return actions.length === 2 && actions.every(button => button.disabled);
    });
    ok(pending, width + ' Everything blocks output while readings are pending');
    await L.waitFor(p, () => /Transfers could not load/.test(document.querySelector('.rec-dayv').innerText));
    const words = await p.locator('.rec-dayv').innerText();
    ok(/No deliveries recorded/.test(words) && !/no [^.]*transfers/i.test(words), width + ' Records states verified absence without calling the refused section empty');
    ok(await p.locator(recCSV).isDisabled() && await p.locator(recPrint).isDisabled(), width + ' Everything disables print and export after a refused read');
    const refused = await attempt(p, [recCSV, recPrint]);
    ok(!refused.csv && !refused.print, width + ' stale Everything actions cannot export or open print');
    await p.locator('[data-p="rec-show"][data-v="fs"]').click();
    const foodDuring = await download(p, recCSV);
    ok(foodBefore.name === foodDuring.name && foodBefore.csv === foodDuring.csv && !/Lemon sample/.test(foodDuring.csv), width + ' Food safety remains exportable in its original scope');
    await p.locator('[data-p="rec-show"][data-v="all"]').click();
    await p.evaluate(() => { __fake.denyReads = null; });
    await p.locator('.rec-dayv [data-p="rec-retry"]').click();
    const csv = p.locator(recCSV);
    await L.waitFor(p, () => /Lemon sample/.test(document.querySelector('.rec-dayv').innerText));
    ok(await csv.isEnabled() && await p.locator(recPrint).isEnabled(), width + ' retry enables output for the same day after recovery');
    const file = await download(p, recCSV);
    ok(file.name === 'records-' + selected + '.csv' && file.csv.startsWith('\uFEFFDate,Kind,Time,What,Detail,Who\r\n') &&
      file.csv.includes('Lemon sample') && file.csv.includes(selected + ',Transfer out,'), width + ' recovered CSV keeps its filename and schema and includes the saved transfer');
    await p.evaluate(() => { window.print = () => { window.__printed = document.querySelector('#rec-print').innerText; }; });
    await p.locator(recPrint).click();
    const printed = await p.evaluate(() => { window.dispatchEvent(new Event('afterprint')); return window.__printed; });
    ok(/Kitchen records/.test(printed) && /Lemon sample/.test(printed), width + ' recovered print includes the same transfer');
    if (width === 390) await retryNightlyFromDay(p);
    ok(JSON.stringify(saved) === JSON.stringify(await p.evaluate(() => __fake.dump())) && await L.overflow(p) <= 0 && !p.errors.length,
      width + ' Records fits without sideways scrolling or changing saved data');
  } finally { await p.context().close(); }
}
async function transfers(b, width) {
  const fixture = width === 390 ? extra : { ...extra, [key('transfers', day(8), 'lines', 'other')]: transfer('Different venue sample', 'Other kitchen', 8) };
  const failure = width === 390 ? { cold: path(selected) } : { failReads: path(earlier) };
  const p = await L.open(b, '#/admin', { admin: true, extra: fixture, width, ...failure });
  try {
    if (width === 390) {
      // An earlier app version could stamp an offline fallback as a verified empty date.
      await p.evaluate(({ tag, date }) => {
        localStorage.setItem('lk.st.got', JSON.stringify({ tag, c: { ['x/' + date]: [0, Date.now()] } }));
      }, { tag: L.PIN + '|' + day(0), date: selected });
    }
    await L.adminTab(p, 'transfers');
    await waitForTransfers(p);
    const pane = p.locator('.a-pane'), saved = await p.evaluate(() => __fake.dump());
    ok(/Could not read 1 day/.test(await pane.innerText()) && !/No transfers in this time/.test(await pane.innerText()),
      width + ' Transfers discloses a failed date without a confirmed empty statement');
    await openExport(p);
    const blocked = await p.locator(trCSV).isDisabled(), refused = await attempt(p, [trCSV]);
    ok(blocked && !refused.csv, width + ' incomplete period blocks Transfers CSV in the menu and handler');
    if (!blocked) return;
    if (width === 1280) {
      await setPeriod(p, 7);
      await openExport(p);
      const week = await download(p, trCSV);
      ok(week.name.endsWith('-7d.csv') && /Lemon sample/.test(week.csv), 'a failed date outside the selected seven days does not block the complete seven-day CSV');
      await setPeriod(p, 30);
      await L.pick(p, '[data-k="af-venue"]', 'Market kitchen');
    }
    await p.evaluate(() => { __fake.cold = null; __fake.failReads = /\/transferOpen$/; });
    await p.locator('[data-p="tr-refresh"]').click();
    await waitForTransfers(p);
    await L.waitFor(p, () => /Could not read the loans still out/.test(document.querySelector('.a-pane').innerText));
    await openExport(p);
    ok(/Lemon sample/.test(await pane.innerText()) && await p.locator(trCSV).isDisabled() && !(await attempt(p, [trCSV])).csv,
      width + ' a refused older-loans read still blocks export while keeping verified transfers visible');
    await p.evaluate(() => { __fake.failReads = null; });
    await p.locator('[data-p="tr-refresh"]').click();
    await waitForTransfers(p);
    await L.waitFor(p, () => /Butter sample/.test(document.querySelector('.a-pane').innerText));
    await openExport(p);
    const file = await download(p, trCSV);
    ok(file.name === 'leichhardt-transfers-' + day(0) + '-30d.csv' &&
      file.csv.startsWith('\uFEFFDate,Weekday,Time,Way,Venue,Who came for it or gave it,Item,Amount,Unit,Note,Logged by,Returned,Returned by,Returned at\r\n') &&
      /Lemon sample/.test(file.csv) && /Butter sample/.test(file.csv) && /still out \(before these days\)/.test(file.csv) && !/Different venue sample/.test(file.csv),
      width + ' recovered Transfers CSV keeps its date range and schema and includes recent and outstanding records');
    ok(JSON.stringify(saved) === JSON.stringify(await p.evaluate(() => __fake.dump())) && await L.overflow(p) <= 0 && !p.errors.length,
      width + ' Transfers fits without sideways scrolling or changing saved data');
  } finally { await p.context().close(); }
}

(async () => {
  const b = await L.start();
  try {
    for (const width of [390, 1280]) await records(b, width);
    for (const width of [390, 1280]) await transfers(b, width);
    const p = await L.open(b, '#/admin', { who: 'ann', extra, width: 390 });
    try {
      ok(!(await p.locator('.rec-page, .a-export, [data-p="tr-refresh"]').count()), 'staff cannot open or export the owner reports');
    } finally { await p.context().close(); }
  } finally { L.report(R); await b.close(); }
})().catch(e => { console.error(e); process.exit(1); });
