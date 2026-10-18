// Undo on every remove, the second tap for anything hard to take back, the notes popup and the toast (pull request 153).
const L = require('./lib');
const R = [];
const ok = (c, m) => L.check(c, m, R);
const today = L.ymd(new Date());
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const txt = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
(async () => {
  const b = await L.start();
  let p;

  // prep remove with Undo, toast above the tab bar
  p = await L.open(b, '#/prep', { wait: 1500 });
  await p.click('[data-p="del"][data-id="i2"]');
  await p.waitForTimeout(200);
  ok(/Removed Pick coriander/.test(await txt(p, '.p-toast')), 'prep: remove shows "Removed ..." toast');
  let s = await store(p);
  ok(s[fsKey(['days', today, 'items', 'i2'])].deleted === true, 'prep: line flagged removed');
  const pos = await p.evaluate(() => { const t = document.querySelector('.p-toast').getBoundingClientRect(), tb = document.querySelector('.tabbar').getBoundingClientRect(), u = document.querySelector('.p-toast-btn').getBoundingClientRect(); return { tb: t.bottom <= tb.top, uh: u.height }; });
  ok(pos.tb, 'phone: toast sits above the tab bar');
  ok(pos.uh >= 44, 'phone: Undo button is 44 px tall (' + pos.uh + ')');
  await p.click('.p-toast-btn');
  await p.waitForTimeout(200);
  s = await store(p);
  ok(s[fsKey(['days', today, 'items', 'i2'])].deleted === false, 'prep: Undo puts the line back');
  ok(await p.$('#nbr-i2') !== null, 'prep: line is on the list again');
  ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // orders: remove, Undo, show removed, put back
  p = await L.open(b, '#/orders', { wait: 1500 });
  await p.click('[data-p="odel"][data-id="o1"]');
  await p.waitForTimeout(300);
  ok(/Removed Milk from the order list/.test(await txt(p, '.p-toast')), 'orders: remove shows toast with Undo');
  ok(await p.$('[data-p="oremoved"]') !== null, 'orders: Show removed (1) appears');
  await p.click('[data-p="oremoved"]');
  await p.waitForTimeout(200);
  ok(await p.$('[data-p="orestore"][data-id="o1"]') !== null, 'orders: removed line has Put back');
  await p.click('[data-p="orestore"][data-id="o1"]');
  await p.waitForTimeout(300);
  s = await store(p);
  ok(s[fsKey(['orders', today, 'lines', 'o1'])].deleted === false, 'orders: Put back restores the line');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // waste: remove, Undo, put back
  p = await L.open(b, '#/waste', { wait: 1500 });
  await p.click('[data-p="wdel"][data-id="w1"]');
  await p.waitForTimeout(300);
  ok(/Removed Chips from the wastage log/.test(await txt(p, '.p-toast')), 'waste: remove shows toast with Undo');
  ok(await p.$('[data-p="wrestore"][data-id="w1"]') !== null, 'waste: removed entry shows Put back');
  await p.click('.p-toast-btn');
  await p.waitForTimeout(300);
  s = await store(p);
  ok(s[fsKey(['waste', today, 'lines', 'w1'])].deleted === false, 'waste: Undo restores the entry');
  await p.click('[data-p="wview"][data-v="week"]');
  await p.waitForTimeout(600);
  const wid = await p.evaluate(() => { const b = document.querySelector('[data-p="wdel"]'); return b && b.getAttribute('data-id'); });
  ok(wid && wid !== 'undefined', 'waste: Last 7 days rows carry their ids (' + wid + ')');
  ok(p.errors.length === 0, 'waste: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // kitchen PIN: two taps on the name screen
  p = await L.open(b, '#/prep', { who: '', wait: 1500 });
  ok(/Use a different kitchen PIN/.test(await txt(p, '[data-p="pin-forget"]')), 'who screen: button reads "Use a different kitchen PIN"');
  await p.click('[data-p="pin-forget"]');
  await p.waitForTimeout(150);
  ok(/Tap again/.test(await txt(p, '[data-p="pin-forget"]')), 'who screen: first tap asks for a second tap');
  ok(await p.evaluate(() => localStorage.getItem('lk.prep.pin')) === L.PIN, 'who screen: PIN still kept after one tap');
  await p.waitForTimeout(4300);
  ok(/Use a different kitchen PIN/.test(await txt(p, '[data-p="pin-forget"]')), 'who screen: goes back to normal after 4 s');
  await p.click('[data-p="pin-forget"]'); await p.waitForTimeout(100); await p.click('[data-p="pin-forget"]');
  await p.waitForTimeout(200);
  ok(await p.$('#p-pin') !== null, 'who screen: two taps forget the PIN');
  await p.context().close();

  // staff list (sous chef): Remove takes two taps, leaving with unsaved changes takes two taps
  p = await L.open(b, '#/prep', { wait: 1500 });
  await p.click('[data-p="staff-open"]');
  await p.waitForTimeout(200);
  await p.click('[data-p="a-remove-person"][data-i="2"]');
  await p.waitForTimeout(100);
  ok(/Tap again to remove/.test(await txt(p, '[data-p="a-remove-person"][data-i="2"]')), 'staff: first Remove tap arms');
  ok((await p.$$('.a-person')).length === 3, 'staff: nobody removed after one tap');
  await p.click('[data-p="a-remove-person"][data-i="2"]');
  await p.waitForTimeout(100);
  ok((await p.$$('.a-person')).length === 2, 'staff: second tap removes from the draft');
  await p.click('[data-p="staff-close"]');
  await p.waitForTimeout(100);
  ok(/Tap again to leave without saving/.test(await txt(p, '[data-p="staff-close"]')), 'staff: leaving with unsaved changes asks again');
  await p.click('[data-p="staff-close"]');
  await p.waitForTimeout(150);
  ok(await p.$('.nb') !== null, 'staff: second tap goes back to the prep book');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // notes popup: tapping outside does not count as read
  const note = {}; note[fsKey(['notes', 'n1'])] = { text: 'Safety: fryer 2 is out', tag: 'safety', start: today, until: today, dows: [], removed: false, at: 1, by: 'sam' };
  p = await L.open(b, '#/prep', { extra: note, wait: 2000 });
  ok(await p.$('.nt') !== null, 'notes: popup opens');
  await p.mouse.click(5, 300);
  await p.waitForTimeout(200);
  ok(await p.$('.nt') === null, 'notes: tap outside closes it');
  ok(!(await p.evaluate(() => localStorage.getItem('lk.note.seen'))), 'notes: tap outside does not mark it seen');
  ok(await p.evaluate(() => !!document.querySelector('.nbell.has-new')), 'notes: bell keeps its dot');
  await p.click('.nbell');
  await p.waitForTimeout(200);
  await p.click('.nt-got');
  await p.waitForTimeout(200);
  ok(!!(await p.evaluate(() => localStorage.getItem('lk.note.seen'))), 'notes: Got it marks it seen');
  await p.context().close();

  // admin: reset PIN and remove person need a second tap; minutes cancel and publish need a second tap; note Close asks when unsaved
  p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  await p.click('[data-p="a-tab"][data-t="people"]');
  await p.waitForTimeout(200);
  await p.click('[data-p="a-reset-pin"][data-id="ann"]');
  await p.waitForTimeout(100);
  ok(/Tap again to reset/.test(await txt(p, '[data-p="a-reset-pin"][data-id="ann"]')), 'admin: Reset PIN asks again');
  ok(/Remove/.test(await txt(p, '[data-p="a-remove-person"][data-i="1"]')), 'admin: Delete is now called Remove');
  await p.click('[data-p="a-tab"][data-t="minutes"]');
  await p.waitForTimeout(400);
  await p.click('[data-p="mn-new"]');
  await p.waitForTimeout(200);
  await p.fill('[data-k="mn-decisions"]', 'New fryer oil every Monday');
  await p.click('[data-p="mn-cancel"]');
  await p.waitForTimeout(100);
  ok(/Tap again to discard/.test(await txt(p, '[data-p="mn-cancel"]')), 'minutes: Cancel with writing asks again');
  ok(await p.$('.mn-form') !== null, 'minutes: form kept after one tap');
  await p.click('[data-p="mn-all"]').catch(() => {});
  await p.evaluate(() => { const b = document.querySelector('[data-p="mn-attopen"]'); if (b && !document.querySelector('[data-p="mn-all"]')) b.click(); });
  await p.waitForTimeout(100);
  await p.click('[data-p="mn-all"]').catch(() => {});
  await p.waitForTimeout(100);
  await p.click('[data-p="mn-pub"]');
  await p.waitForTimeout(150);
  ok(/Tap again to publish to 3 staff/.test(await txt(p, '[data-p="mn-pub"]')), 'minutes: Publish asks for a second tap (' + await txt(p, '[data-p="mn-pub"]') + ')');
  s = await store(p);
  ok(!Object.keys(s).some(k => /\/minutes\//.test(k)), 'minutes: nothing published after one tap');
  await p.click('[data-p="mn-pub"]');
  await p.waitForTimeout(400);
  s = await store(p);
  ok(Object.keys(s).some(k => /\/minutes\/[^/]+$/.test(k) && s[k].status === 'published'), 'minutes: second tap publishes');
  await p.click('[data-p="a-tab"][data-t="notes"]');
  await p.waitForTimeout(400);
  await p.click('[data-p="n-new"]');
  await p.waitForTimeout(150);
  await p.fill('[data-k="n-text"]', 'Delivery: Bidfood 9:00');
  await p.click('[data-p="n-cancel"]');
  await p.waitForTimeout(100);
  ok(/Tap again to discard/.test(await txt(p, '[data-p="n-cancel"]')), 'notes editor: Close with text asks again');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
