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

  // the wastage page on the head chef's Google device links to the log (a chef signed in, as on the line)
  p = await L.open(b, '#/waste', { extra, admin: true, who: 'sam', wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.w-past'));
  ok(await p.$('.w-past a[href="#/admin"]') !== null, 'head chef: the wastage page links to the admin log');
  ok(p.errors.length === 0, 'head chef wastage: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
