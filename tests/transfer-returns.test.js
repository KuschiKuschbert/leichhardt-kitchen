const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW)), old = L.ymd(new Date(L.NOW - 65 * 86400000));
const root = 'kitchens/' + L.PIN + '/';
const source = root + 'transfers/' + old + '/lines/loan';
const index = root + 'transferOpen/' + old + '_loan';
const record = { dir: 'out', venue: 'Other venue', person: 'Jo', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 65 * 86400000, deleted: false, by: 'bo' };
const extra = { [source]: record, [index]: { date: old, lineId: 'loan', record, open: true } };
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/transfers', { extra, who: 'ann', width, wait: 1200 });
    await L.waitFor(p, () => !!document.querySelector('.tr-outstanding [data-p="tr-return"]'));
    ok(/Butter/.test(await L.txt(p, '.tr-outstanding')), width + ': a loan older than 30 days remains outstanding');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), width + ': no horizontal scroll');
    const returnButton = p.locator('.tr-outstanding [data-p="tr-return"]');
    await p.evaluate(() => { window.__fake.quiet = true; window.__fake.mode = 'hold'; });
    await returnButton.click();
    await L.waitFor(p, key => !!window.__fake.dump()[key].returned, source);
    await p.clock.runFor(4200);
    if (width === 768) await p.evaluate(() => window.__fake.ack());
    await L.settle(p, 200);
    const pending = await p.evaluate(() => {
      const row = document.querySelector('.tr-outstanding .tr-item');
      const button = row?.querySelector('[data-p="tr-return"]');
      return { item: row?.textContent, disabled: button?.disabled, label: button?.getAttribute('aria-label'),
        count: document.querySelector('.tr-page .nb-prog')?.textContent, slip: document.querySelector('.p-toast')?.textContent };
    });
    ok(pending.item?.includes('Butter') && pending.item.includes('Return pending') && pending.count === '1 still out',
      width + ': pending return keeps its original loan and count even after the open index drops it: ' + JSON.stringify(pending));
    ok(pending.disabled && pending.label === 'Return pending for Butter' && !pending.slip?.includes('Returned: Butter'),
      width + ': pending return disables another tap and names what is waiting before the slip: ' + JSON.stringify(pending));
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await L.waitFor(p, () => document.querySelector('.p-toast')?.textContent.includes('Returned: Butter'));
    let s = await p.evaluate(() => window.__fake.dump());
    ok(s[source].returned === true && s[source].returnedById === 'ann' && s[source].returnedBy === 'Ann' && s[source].returnedAt > 0, width + ': return records who and when on the original line');
    ok(s[index].open === false && JSON.stringify(s[index].record) === JSON.stringify(s[source]), width + ': original and open index commit together');
    ok(!(await p.$('.tr-outstanding')), width + ': returned loan leaves outstanding');
    const batch = await p.evaluate(() => window.__fake.writes[window.__fake.writes.length - 1]);
    ok(batch.length === 3, width + ': one atomic batch writes both records and invalidates history');
    await p.click('.p-toast [data-p="toast-act"]'); await L.settle(p, 400);
    s = await p.evaluate(() => window.__fake.dump());
    ok(s[source].returned === false && s[index].open === true && !!(await p.$('.tr-outstanding')), width + ': Undo restores the outstanding loan');
    // A refused save leaves the loan outstanding and offers no false success.
    await p.evaluate(() => { window.__fake.mode = 'fail'; });
    await p.click('.tr-outstanding [data-p="tr-return"]'); await L.settle(p, 400);
    s = await p.evaluate(() => window.__fake.dump());
    ok(s[index].open === true && !s[source].returned && !!(await p.$('.tr-outstanding [data-p="tr-return"]:not([disabled])')), width + ': failed return keeps the item and enables retry');
    ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // The return also works for stock borrowed by us, on today\'s original row.
  {
    const path = root + 'transfers/' + today + '/lines/in';
    const p = await L.open(b, '#/transfers', { who: 'ann', extra: { [path]: { ...record, dir: 'in', text: 'Milk', addedAt: L.NOW } }, wait: 1200 });
    await p.evaluate(() => { window.__fake.quiet = true; window.__fake.mode = 'hold'; });
    await p.click('[data-p="tr-return"][data-id="in"]');
    await L.waitFor(p, key => !!window.__fake.dump()[key].returned, path);
    await L.settle(p, 200);
    ok((await L.txt(p, '.tr-outstanding'))?.includes('Return pending') && !(await p.$('.tr-done')) &&
      await L.txt(p, '.tr-page .nb-prog') === '1 still out', 'today: a pending inbound return stays outstanding and out of Done today');
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.answer(); });
    await L.waitFor(p, () => document.querySelector('.tr-done')?.textContent.includes('Returned Ann'));
    await p.evaluate(() => window.__fake.ack());
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'today: returned details fit the phone');
    ok(/Returned Ann/.test(await L.txt(p, '.tr-row')), 'today: a returned inbound loan stays in today\'s history');
    await p.click('[data-p="tr-unreturn"][data-id="in"]'); await L.settle(p, 400);
    ok(!!(await p.$('[data-p="tr-return"][data-id="in"]')), 'today: Undo return reopens the loan');
    await p.context().close();
  }
  {
    const recent = L.ymd(new Date(L.NOW - 86400000));
    const closed = { ...record, returned: true, returnedBy: 'Ann', returnedById: 'ann', returnedAt: L.NOW - 600000 };
    const path = root + 'transfers/' + recent + '/lines/closed';
    const p = await L.open(b, '#/admin', { admin: true, extra: { [path]: closed }, wait: 1200 });
    await L.adminTab(p, 'transfers');
    await L.waitFor(p, () => !!document.querySelector('[data-p="tr-unreturn"][data-id="closed"]'));
    ok(/Returned Ann/.test(await L.txt(p, '[data-lv="xfer-log"]')), 'admin: dated history shows the confirmer and return status');
    await p.click('[data-p="tr-unreturn"][data-id="closed"]'); await L.settle(p, 400);
    ok((await p.evaluate(k => window.__fake.dump()[k], path)).returned === false, 'admin: the head chef may reopen an older confirmation');
    ok(p.errors.length === 0, 'admin: return history has no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  {
    const people = [{ id: 'bo', name: 'Bo', role: 'view', active: true, add: false, tick: false, del: false }];
    const p = await L.open(b, '#/transfers', { who: 'bo', extra: { ...extra, [root + 'config/main']: { people, sousIds: [] } }, wait: 1200 });
    ok(!!(await p.$('.tr-outstanding')) && !(await p.$('[data-p="tr-return"]')), 'view only: reads outstanding loans without a return action');
    await p.context().close();
  }
  {
    const p = await L.open(b, '#/transfers', { who: 'sam', extra, touch: true, deviceMode: 'shared', wait: 1200 });
    await p.clock.runFor(11 * 60000); await L.settle(p, 300);
    ok(!!await p.$('[data-k="pf1"]') && !await p.$('.tr-outstanding'), 'shared tablet: return information stays hidden behind the idle PIN lock');
    await p.click('[data-p="who-change"]'); await L.settle(p, 200);
    await p.click('.p-name[data-id="ann"]'); await L.settle(p, 250); await p.keyboard.type('2222'); await L.settle(p, 1200);
    // the first PIN of a person's day opens Home (10 Nov 2026, docs/home-staff-first.md)
    ok(await p.evaluate(() => location.hash === '#/'), 'shared tablet: the next person starts on Home');
    await p.evaluate(() => { location.hash = '#/transfers'; }); await L.settle(p, 600);
    await p.click('.tr-outstanding [data-p="tr-return"]'); await L.settle(p, 400);
    ok((await p.evaluate(k => window.__fake.dump()[k], source)).returnedById === 'ann', 'shared tablet: return belongs to the person who entered their PIN');
    await p.context().close();
  }
  {
    const cutoff = Date.parse(today + 'T04:00:00+10:00');
    const p = await L.open(b, '#/transfers', { who: 'ann', extra, touch: true, width: 768, deviceMode: 'shared', clock: cutoff - 60000, wait: 1200 });
    await L.waitFor(p, () => !!document.querySelector('.tr-outstanding [data-p="tr-return"]') && !LK_PREP.unsent());
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await p.context().setOffline(true);
    await p.click('.tr-outstanding [data-p="tr-return"]');
    await L.waitFor(p, key => !!window.__fake.dump()[key].returned, source);
    ok((await L.txt(p, '.tr-outstanding'))?.includes('Return pending') && (await L.txt(p, '.p-sync'))?.includes('No signal'),
      'offline shared tablet: queues the whole return and names it on the existing row');
    await p.clock.runFor(90000);
    await L.waitFor(p, () => !LK_PREP.privateAccess() && !!document.querySelector('#pf1'));
    ok(!(await p.$('.tr-outstanding')) && !(await L.txt(p, '.p-toast'))?.includes('Butter') &&
      await p.evaluate(() => LK_PREP.blockedRecorder() === 'ann'), '04:00 shared tablet: keeps the loan and pending state private behind the original recorder PIN');
    await p.context().setOffline(false);
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await L.settle(p, 200);
    ok(!(await L.txt(p, '.p-toast'))?.includes('Returned: Butter'), '04:00 shared tablet: a late acknowledgement does not show the loan name on the PIN screen');
    await p.locator('#pf1').fill('2222');
    await L.waitFor(p, () => LK_PREP.privateAccess() && !LK_PREP.unsent());
    await L.waitFor(p, () => document.querySelector('.p-toast')?.textContent.includes('Returned: Butter'));
    const saved = await p.evaluate(key => window.__fake.dump()[key], source);
    ok(saved.returnedById === 'ann' && saved.returned && !(await p.$('.tr-outstanding')),
      '04:00 shared tablet: the original recorder sees the acknowledged return after unlocking');
    ok(p.errors.length === 0, 'offline daily recovery has no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close(); L.report(R);
})();
