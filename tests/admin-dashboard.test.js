// The admin Dashboard (3 Nov 2026): one nightly record, tiles that match Insights' counting, three headlines,
// readable charts, links into the reports, and honest failed or missing states. Example data only.
const L = require('./lib');
const { R, ok } = L.results();
const path = (...p) => ['kitchens', L.PIN, ...p].join('/');
const DAY = 86400000, last = L.ymd(new Date(L.NOW - DAY));
const hostile = '<img src=x onerror="window.__dshInjected=1">';
// 90 finished days. Mondays to Sundays get different loads; the last 7 days waste more; Garnish is slowest.
function rows() {
  const out = [];
  for (let i = 89; i >= 0; i--) {
    const t = L.NOW - (i + 1) * DAY, day = L.ymd(new Date(t)), dw = new Date(t).getDay(), busy = dw === 5 || dw === 6 ? 2 : 1;
    const n = 20 * busy + (i % 3), tk = n - 2 - (i % 4), w = i < 7 ? 3 : 1;
    out.push({ day, p: { n, w: n - 2, t: tk, r: 2, sec: { Larder: 8 * busy, Grill: 6 * busy, Garnish: 4 * busy + (i % 3) }, mins: { Larder: [60, 70, 80], Grill: [40, 45, 50], Garnish: [200, 210, 220] } },
      w: { n: w, reason: { excess: w - (i < 7 ? 1 : 0), ...(i < 7 ? { expired: 1 } : {}) }, sec: { Larder: w }, items: [{ t: i === 0 ? hostile : 'Brisket', u: 'kg', a: 0.5 * w, n: w }] },
      x: { out: 1, in: i % 2 } });
  }
  return out;
}
const days = rows();
const sum = (list, f) => list.reduce((s, r) => s + f(r), 0);
const last30 = days.slice(-30), pct30 = Math.round(100 * sum(last30, r => r.p.t) / sum(last30, r => r.p.n));
const extra = { [path('analysis', 'dashboard')]: { v: 1, generation: 'g1', at: L.NOW - 11 * 3600000, from: days[0].day, to: last, days },
  [path('analysis', 'health')]: { at: L.NOW - 11 * 3600000, status: 'ok' } };
const dashReads = p => p.evaluate(() => window.__fake.bill.filter(b => /\/analysis\/(dashboard|health)$/.test(b.path)).length);
const ready = p => L.waitFor(p, () => document.querySelectorAll('.dsh-tile').length === 5, null, 10000);

(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width, height: 900, extra, wait: 1600 });
    await ready(p);
    ok(await L.txt(p, '.ad-title') === 'Dashboard' && await p.evaluate(() => LK_PREP.state.atab) === 'dashboard', width + ': a first visit opens the Dashboard chapter');
    ok(await p.locator('.dsh-head').count() === 3, width + ': three written headlines sit above the tiles');
    const heads = await L.txt(p, '.dsh-heads');
    ok(/Waste is up: \d+ lines in the last 7 days, 7 the 7 before\./.test(heads) && /Garnish was the slowest section to tick/.test(heads), width + ': headlines say what changed in plain words (' + heads.slice(0, 160) + ')');
    const tile = await L.txt(p, '.dsh-tile:first-child .dsh-tile-num');
    ok(tile.replace(/\s/g, '') === pct30 + '%', width + ': ticked off counts all lines like Insights (' + tile + ' vs ' + pct30 + '%)');
    ok(/30 days before/.test(await L.txt(p, '.dsh-range')), width + ': the 30 days are compared with the 30 before');
    ok(await dashReads(p) === 2, width + ': opening the Dashboard reads two records');
    ok(!await L.overflow(p), width + ': no sideways scroll');

    await p.click('[data-dsh="period"][data-v="90"]'); await L.settle(p, 200);
    ok(/no earlier period/.test(await L.txt(p, '.dsh-range')) && /No earlier 90 days/.test(await L.txt(p, '.dsh-tiles')) && /each week/.test(await L.txt(p, '.dsh-grid')), width + ': 90 days shows weeks and says there is nothing earlier to compare');
    await p.click('[data-dsh="period"][data-v="7"]'); await L.settle(p, 200);
    ok(/7 days before/.test(await L.txt(p, '.dsh-range')) && await dashReads(p) === 2, width + ': changing the period reads nothing more');
    ok(!await L.overflow(p), width + ': no sideways scroll after changing the period');

    await p.focus('.dsh-plot'); await p.keyboard.press('ArrowLeft');
    const tip = await L.txt(p, '.dsh-plot .dsh-tip');
    ok(/Written \d+/.test(tip) && /Ticked off \d+/.test(tip), width + ': the arrow keys read the chart (' + tip + ')');
    await p.focus('.dsh-bar');
    ok(/lines/.test(await L.txt(p, '.dsh-panel > .dsh-tip')), width + ': a focused bar says its numbers');
    ok(await p.evaluate(() => window.__dshInjected) === undefined && (await L.txt(p, '.dsh-items')).includes('<img'), width + ': item names from the record are shown as words, never markup');

    await p.click('.dsh-tile[data-t="waste"]'); await L.settle(p, 300);
    ok(await p.evaluate(() => LK_PREP.state.atab) === 'waste' && await p.evaluate(() => LK_PREP.state.statsRange) === 7, width + ': a tile opens its report with the same period');
    await L.adminTab(p, 'dashboard');
    await ready(p);
    ok(await dashReads(p) === 2, width + ': coming back reuses the numbers already read');
    await p.click('[data-dsh="refresh"]'); await ready(p); await L.settle(p, 200);
    ok(await dashReads(p) === 4, width + ': Refresh reads the two records again');
    await p.context().close();
  }

  let p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width: 390, extra, failReads: 'analysis/dashboard', wait: 1600 });
  await L.waitFor(p, () => /Could not load the dashboard numbers/.test(document.body.textContent), null, 8000);
  ok(await p.locator('.dsh-tile').count() === 0, 'a failed read says so and shows no numbers');
  await p.context().close();

  p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width: 390, wait: 1600 });
  await L.waitFor(p, () => /come from the nightly run at 03:00/.test(document.body.textContent), null, 8000);
  ok(await p.locator('.dsh-tile').count() === 0, 'before the first nightly run the page says when the numbers come, never 0');
  await p.context().close();

  p = await L.open(b, '#/admin', { admin: true, adminPage: 'insights', who: '', width: 1280, extra: { ...extra, [path('analysis', 'health')]: { at: L.NOW - 3600000, status: 'failed' } }, dashIntro: true, wait: 1600 });
  await ready(p);
  ok(/did not finish/.test(await L.txt(p, '.dsh-fresh')), 'a failed nightly run is named, with the time of the numbers shown');
  await L.adminTab(p, 'insights'); await p.context().close();
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'insights', who: '', width: 1280, extra, wait: 1600 });
  await L.settle(p, 400);
  ok(await p.evaluate(() => LK_PREP.state.atab) === 'insights' && await dashReads(p) === 0, 'after the Dashboard has opened once, the panel returns to the last page and reads nothing for the Dashboard');
  await p.context().close();

  p = await L.open(b, '#/admin', { who: 'sam', width: 1280, extra, wait: 1600 });
  await L.settle(p, 400);
  ok(await p.locator('.dsh').count() === 0 && await dashReads(p) === 0, 'a sous chef without the head chef Google account gets no Dashboard and no reads of it');
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
