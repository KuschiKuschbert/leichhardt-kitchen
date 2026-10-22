// Wastage is for logging (head chef decision, 22 Oct 2026): the wastage page shows the form and today's entries from the
// whole team, for everyone, sous chefs included; sous chefs also write today's end-of-day review there. Remove and Put
// back, past days and past reviews live in the admin panel's wastage log (the head chef's Google account, the only one
// the rules let read past days): every entry, Remove and Put back without reading again, and the review for any day.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW)), yest = L.ymd(new Date(L.NOW - 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const lineReads = page => page.evaluate(() => window.__fake.reads.filter(k => /\/waste\/[^/]+\/lines$/.test(k)));
const extra = {};
extra[fsKey(['waste', yest, 'lines', 'y1'])] = { text: 'Mash', amount: 1.5, unit: 'kg', reason: 'prep', action: '', station: 'Larder', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 86400000 - 7200000, deleted: false };
(async () => {
  const b = await L.start();

  // staff and a sous chef: today only, no day buttons, no Last 7 days, no Remove, no past lines read; the review for the sous chef only
  for (const who of ['ann', 'sam']) {
    const p = await L.open(b, '#/waste', { extra, who, wait: 1500 });
    const body = await txt(p, '.o-page') || '';
    ok(/Chips/.test(body) && !/Mash/.test(body), who + ': the wastage page shows today\'s Chips and not yesterday\'s Mash');
    ok(!(await p.$('[data-p="wday"]')) && !(await p.$('[data-p="wview"]')), who + ': no day buttons and no Last 7 days');
    ok(!(await p.$('[data-p="wdel"]')) && !(await p.$('[data-p="wrestore"]')), who + ': no Remove or Put back on the wastage page');
    if (who === 'ann') ok(!(await p.$('#w-ra')) && !(await p.$('[data-p="wreview"]')), 'ann: no end-of-day review for staff');
    else {
      await L.waitFor(p, () => !!document.querySelector('[data-p="wreview"][data-v="page"]'));
      await p.fill('#w-ra', 'Chips cooked too early');
      await p.fill('#w-rc', 'Drop chips to order after 21:00');
      await p.click('[data-p="wreview"][data-v="page"]'); await L.settle(p, 700);
      const tr = (await store(p))[fsKey(['waste', today])] || {};
      ok(tr.avoidable === 'Chips cooked too early' && tr.change === 'Drop chips to order after 21:00' && tr.reviewBy === 'Sam', 'sam: the sous chef saves today\'s review on the wastage page (' + JSON.stringify(tr) + ')');
    }
    ok(!(await p.$('.w-past')), who + ': no admin link (the log is the head chef\'s)');
    ok((await lineReads(p)).length === 0, who + ': no past wastage lines are read (' + (await lineReads(p)).join(' | ') + ')');
    ok(p.errors.length === 0, who + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // the head chef's admin log: yesterday's Mash, removed and put back with no new read, and the review for a past day
  let p = await L.open(b, '#/admin', { extra, admin: true, who: '', wait: 1500 });
  await L.adminTab(p, 'waste');
  await L.waitFor(p, () => /Mash/.test((document.querySelector('[data-lv="waste-log"]') || {}).textContent || ''));
  ok(/Chips/.test(await txt(p, '[data-lv="waste-log"]') || ''), 'log: today\'s Chips and yesterday\'s Mash are both listed');
  const before = (await lineReads(p)).length;
  await p.click('[data-lv="waste-log"] [data-p="wdel"][data-id="y1"]');
  await L.settle(p, 400);
  let s = await store(p);
  ok(s[fsKey(['waste', yest, 'lines', 'y1'])].deleted === true, 'log: Remove flags yesterday\'s entry in the store');
  ok(/Removed Mash/.test(await txt(p, '.p-toast') || ''), 'log: the toast says what was removed, with Undo');
  ok(await p.$('[data-lv="waste-log"] [data-p="wrestore"][data-id="y1"]') !== null && /Removed/.test(await txt(p, '[data-lv="waste-log"]') || ''), 'log: Mash stays in the list, marked Removed, with Put back');
  await p.click('[data-lv="waste-log"] [data-p="wrestore"][data-id="y1"]'); await L.settle(p, 400);
  s = await store(p);
  ok(s[fsKey(['waste', yest, 'lines', 'y1'])].deleted === false, 'log: Put back restores it in the store');
  ok((await lineReads(p)).length === before, 'log: removing and putting back read nothing again');

  // the review for yesterday: back one day, write, save
  await p.click('[data-p="rv-day"][data-d="-1"]'); await L.settle(p, 300);
  ok(/Yesterday|\w{3}/.test(await txt(p, '.a-rvday') || '') && (await txt(p, '.a-rvday')) !== 'Today', 'review: back one day (' + await txt(p, '.a-rvday') + ')');
  ok(await p.$eval('[data-p="rv-day"][data-d="1"]', e => !e.disabled), 'review: forward works again from yesterday');
  await p.fill('#w-ra', 'Mash made too early');
  await p.fill('#w-rc', 'Make mash after 16:00');
  await p.click('[data-p="wreview"]'); await L.settle(p, 700);
  s = await store(p);
  const rv = s[fsKey(['waste', yest])] || {};
  ok(rv.avoidable === 'Mash made too early' && rv.change === 'Make mash after 16:00', 'review: saved for yesterday (' + JSON.stringify(rv) + ')');
  ok(/Review saved/.test(await txt(p, '.p-toast') || ''), 'review: the toast says it was saved');
  ok(p.errors.length === 0, 'log: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the admin Wastage report says each thing once (23 Oct 2026): the weekday totals are the All reasons row of Reasons by
  // weekday (an entry with a reason the book does not know counts too), no separate By weekday table, and a zero total
  // with nothing to compare (0 portions, 0 pieces) is left out
  const extra2 = Object.assign({}, extra);
  extra2[fsKey(['waste', yest, 'lines', 'y2'])] = { text: 'Old oil', amount: 2, unit: 'L', reason: 'spill', action: '', station: 'Fryer', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 86400000 - 3600000, deleted: false };
  // two days back, alone on its weekday: over 30 days that weekday comes round 4 times, so 0.25 a day (shown as 0.3)
  const d2 = L.ymd(new Date(L.NOW - 2 * 86400000));
  extra2[fsKey(['waste', d2, 'lines', 'z2'])] = { text: 'Cream', amount: 1, unit: 'L', reason: 'expired', action: '', station: 'Larder', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 2 * 86400000 - 3600000, deleted: false };
  p = await L.open(b, '#/admin', { extra: extra2, admin: true, who: '', wait: 1500 });
  await L.adminTab(p, 'waste');
  await L.waitFor(p, () => !!document.querySelector('.sk-tot'), null, 6000).catch(() => {});
  const wk = await p.evaluate(() => {
    const row = document.querySelector('.sk-tot'), sum = r => [...r.querySelectorAll('td')].reduce((a, td) => a + (+td.textContent || 0), 0);
    const reasons = [...document.querySelectorAll('.sk-t tbody tr:not(.sk-tot)')].filter(r => r.closest('table').querySelector('.sk-tot'));
    return { head: row ? row.querySelector('th').textContent : '', all: row ? Math.round(sum(row) * 100) / 100 : -1, rs: Math.round(reasons.reduce((a, r) => a + sum(r), 0) * 100) / 100,
      byWeekday: [...document.querySelectorAll('.a-pane h3')].some(h => h.textContent.trim() === 'By weekday'),
      tiles: [...document.querySelectorAll('.a-pane .a-tiles .a-tile')].map(t => ({ n: t.querySelector('strong').textContent, u: t.querySelector('span').textContent, d: !!t.querySelector('.a-d') })) };
  });
  ok(wk.head === 'All reasons' && wk.all === 2 && wk.rs === 1.5, 'admin Wastage: Reasons by weekday ends with All reasons, which counts the entry with an unknown reason too (' + JSON.stringify(wk) + ')');
  ok(!wk.byWeekday, 'admin Wastage: no separate By weekday table');
  ok(wk.tiles.length && wk.tiles.every(t => t.n !== '0' || t.d) && !wk.tiles.some(t => /portions|pieces/.test(t.u)) && wk.tiles.some(t => /days with something logged/.test(t.u)), 'admin Wastage: no zero tile with nothing to compare, the days tile stays (' + JSON.stringify(wk.tiles) + ')');
  // 30 days: the lone Expired entry reads the same in its own row and in All reasons, both to one decimal
  await p.click('[data-p="range"][data-v="30"]');
  await L.waitFor(p, () => { const r = [...document.querySelectorAll('.sk-t tbody tr')].find(x => /Expired/.test(x.textContent)); return !!r && [...r.querySelectorAll('td')].some(td => td.textContent === '0.3'); }, null, 6000).catch(() => {});
  const w30 = await p.evaluate(() => {
    const t = document.querySelector('.sk-tot') && document.querySelector('.sk-tot').closest('table');
    if (!t) return null;
    const ex = [...t.querySelectorAll('tbody tr')].find(x => /Expired/.test(x.querySelector('th').textContent)), cells = ex ? [...ex.querySelectorAll('td')].map(td => td.textContent) : [];
    const i = cells.findIndex(c => c !== '0'), tot = [...t.querySelectorAll('.sk-tot td')].map(td => td.textContent);
    return { exp: cells[i], all: tot[i], tot };
  });
  ok(w30 && w30.exp === '0.3' && w30.all === '0.3' && w30.tot.every(c => !/\.\d\d/.test(c)), 'admin Wastage, 30 days: a lone entry reads 0.3 in its reason row and in All reasons, never 0.25 (' + JSON.stringify(w30) + ')');
  ok(p.errors.length === 0, 'admin Wastage: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the wastage page on the head chef's Google device links to the log (a chef signed in, as on the line)
  p = await L.open(b, '#/waste', { extra, admin: true, who: 'sam', wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.w-past'));
  ok(await p.$('.w-past a[href="#/admin"]') !== null, 'head chef: the wastage page links to the admin log');
  ok(p.errors.length === 0, 'head chef wastage: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
