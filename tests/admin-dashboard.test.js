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

  // Needs you: open mail, minutes still to sign and an overdue action, a transfer not back, each opening its page.
  const ago = d => L.ymd(new Date(L.NOW - d * DAY));
  const loan = { dir: 'out', venue: 'Venue B', person: 'Jo', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 9 * DAY, deleted: false, by: 'bo' };
  const waiting = { ...extra, ...L.mail(),
    [path('minutes', 'mx')]: { no: 3, v: 1, status: 'published', date: ago(5), start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam', att: [{ id: 'ann', st: 'present' }, { id: 'sam', st: 'present' }],
      guests: '', decisions: 'Fryer oil every Monday', menu: '', safety: '', dates: '', other: '', acts: [{ text: 'Fix the cool room seal', who: 'sam', by: ago(2), st: 'open' }], next: '',
      pubAt: L.NOW - 5 * DAY, removed: false, at: L.NOW - 5 * DAY, upd: L.NOW - 5 * DAY },
    [path('minutes', 'mx', 'signs', '1_sam')]: { v: 1, st: 'read', at: L.NOW - 4 * DAY, name: 'Sam', by: 'sam' },
    [path('transfers', ago(9), 'lines', 'l1')]: loan, [path('transferOpen', ago(9) + '_l1')]: { date: ago(9), lineId: 'l1', record: loan, open: true } };
  for (const width of [390, 1280]) {
    const q = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width, height: 900, extra: waiting, wait: 1600 });
    await ready(q);
    await L.waitFor(q, () => { const t = (document.querySelector('.dsh-needs') || {}).textContent || ''; return /kitchen mails open/.test(t) && /still to sign/.test(t) && /not returned/.test(t); }, null, 10000).catch(() => {});
    const needs = await L.txt(q, '.dsh-needs');
    ok(/3 kitchen mails open/.test(needs), width + ': Needs you counts the open kitchen mail (' + needs.slice(0, 200) + ')');
    ok(/Late/.test(needs) && /still to sign/.test(needs) && /1 of \d+ signed/.test(needs), width + ': Needs you says who has not signed the late minutes');
    ok(/1 meeting action past the date/.test(needs), width + ': Needs you lists the overdue meeting action');
    ok(/1 transfer not returned/.test(needs) && /Oldest: Butter to Venue B, 9 days/.test(needs), width + ': Needs you lists the transfer not back, with the oldest');
    ok(/The nightly run finished\./.test(needs), width + ': the nightly run counts as clear when it finished');
    ok(!await L.overflow(q), width + ': no sideways scroll with Needs you');
    // The existing mail pop-up comes up by itself when mail is open; close it like a person would.
    await q.evaluate(() => { const x = document.querySelector('.mlp-wrap [data-ml="later"]'); if (x) x.click(); }); await L.settle(q, 300);
    await q.click('.dsh-needs [data-dsh="open"][data-t="mail"]'); await L.settle(q, 300);
    ok(await q.evaluate(() => LK_PREP.state.atab) === 'mail', width + ': Open mail opens the Kitchen mail page');
    await q.context().close();
  }
  // The week ahead: functions from the live list, cut-offs from the head chef's settings, the usual busy days. No reads.
  const M = require('../js/functions.js'), today = L.ymd(new Date(L.NOW)), d2 = M.addDays(today, 2), d1 = M.addDays(today, 1);
  const fnAt = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
  const booking = (id, o) => M.derive({ id, v: 1, status: o.status || 'confirmed', name: o.name, date: o.date, start: fnAt(o.date, '18:00'), loc: 'Beer garden', guests: 60, gu: false, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at: fnAt(o.date, '18:30'), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty: 3, u: M.toU([3]) }], was: {}, chg: [], cBy: 'fay', cAt: L.NOW - DAY, confBy: 'fay', confAt: L.NOW - DAY, by: 'fay', upd: L.NOW - 3600000,
    ...(o.status === 'cancelled' ? { canBy: 'fay', canAt: L.NOW - 1800000 } : {}) });
  const cfgKey = path('config', 'main'), dow2 = new Date(d2 + 'T12:00:00Z').getUTCDay();
  const weekly = { ...extra, [cfgKey]: { ...L.seed()[cfgKey], cutoffs: [{ id: 'pfd', name: 'PFD', dd: [dow2], at: 15 * 60, pre: 1 }] },
    [path('functions', 'f1')]: booking('f1', { name: 'Smith 50th', date: d2 }), [path('functions', 'f2')]: booking('f2', { name: 'Called off', date: d2, status: 'cancelled' }),
    [path('functions', 'f3')]: booking('f3', { name: '<img src=x onerror="window.__dshInjected=3">', date: today }) };
  for (const width of [390, 1280]) {
    const q = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width, height: 900, extra: weekly, wait: 1600 });
    await ready(q);
    await L.waitFor(q, () => /Smith 50th/.test((document.querySelector('.dsh-week') || {}).textContent || ''), null, 10000).catch(() => {});
    const days = await q.$$eval('.dsh-wk-day', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    ok(days.length === 7 && /^Today/.test(days[0]) && /^Tomorrow/.test(days[1]), width + ': the week ahead shows today and the next 6 days (' + days.length + ')');
    ok(/Smith 50th, 18:00, 60 guests/.test(days[2]), width + ': a booking shows on its day with its time and guests (' + days[2] + ')');
    ok(!/Called off/.test(days.join(' ')), width + ': a cancelled booking is left out');
    ok(/Cut-off ?PFD 15:00/.test(days[1]), width + ': the supplier cut-off shows on the day the order closes (' + days[1] + ')');
    ok(days.some(d => /Usually busy ?About \d+ prep lines/.test(d)), width + ': the usually busy weekdays are marked');
    ok(await q.locator('.dsh-wk-fn a[href="#/fn/f1"]').count() === 1, width + ': a booking links to its function sheet');
    ok(await q.evaluate(() => window.__dshInjected) === undefined && days[0].includes('<img'), width + ': a function name shows as words, never markup');
    ok(!await L.overflow(q), width + ': no sideways scroll with the week ahead');
    await q.click('.dsh-week [data-dsh="open"][data-t="cutoffs"]'); await L.settle(q, 300);
    ok(await q.evaluate(() => LK_PREP.state.atab) === 'cutoffs', width + ': Cut-offs opens the order cut-offs page');
    await q.context().close();
  }

  let q = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width: 1280, extra, failReads: 'transferOpen', wait: 1600 });
  await ready(q);
  await L.waitFor(q, () => /Could not load the open transfers/.test(document.body.textContent), null, 8000).catch(() => {});
  ok(/Could not load the open transfers/.test(await L.txt(q, '.dsh-needs')), 'a failed transfers read says so, never "nothing waiting"');
  ok(!/Nothing waiting for[^.]*transfers/.test(await L.txt(q, '.dsh-needs')), 'a failed transfers read is not counted as clear');
  await q.context().close();
  q = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width: 1280, extra, wait: 1600 });
  await ready(q);
  await L.waitFor(q, () => /Nothing waiting/.test(document.body.textContent), null, 8000).catch(() => {});
  ok(/Nothing waiting for [^.]*transfers\. The nightly run finished\./.test(await L.txt(q, '.dsh-needs')), 'with nothing waiting, Needs you says so in words');
  await q.context().close();

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
