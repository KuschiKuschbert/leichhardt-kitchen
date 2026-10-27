// No signal (27 Oct 2026). Since 25 Oct 2026 Firestore keeps only a copy in memory, so with no signal a listener or a
// query answers at once from that copy, and the copy is empty for anything no other listener holds (marked fromCache).
// That answer means "not loaded yet", never "nothing there": the names list, the kitchen lists, Everything to order,
// the drinks run, guides, pings, minutes and functions say there is no signal, nothing empty is kept on the phone, and
// each one loads by itself once the signal is back. The stand-in answers like that with __fake.cold.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), yday = L.ymd(new Date(L.NOW - 86400000));
const NO_KITCHEN = 'No signal. The kitchen pages open when the phone is back online. Recipes work now.';
const NO_LIST = 'No signal. This list shows when the phone is back online. What you add now is sent then.';
const page = p => txt(p, '#prep-root').then(t => t || '');
const go = async (p, h) => { await p.evaluate(h => { location.hash = h; }, h); await L.settle(p, 700); };
const cold = p => p.evaluate(() => { window.__fake.cold = /./; window.__fake.mode = 'hold'; });
const warm = p => p.evaluate(() => { window.__lkOff = false; window.__fake.warm(); window.dispatchEvent(new Event('online')); });
const ls = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
const until = (p, fn, arg) => L.waitFor(p, fn, arg, 5000).then(() => true, () => false);
(async () => {
  const b = await L.start();
  let p;

  // 1. Opened with no signal at all (the 04:00 refresh in a dead spot): no false "No names", and the list once it is back
  p = await L.open(b, '#/prep', { who: 'ann', cold: '.', fakeMode: 'hold', wait: 1500 });
  let t = await page(p);
  ok(t.indexOf(NO_KITCHEN) >= 0 && !/No names are set up yet/.test(t), 'cold open: says there is no signal, not that no names are set up (' + t.slice(0, 120) + ')');
  ok(await p.evaluate(() => window.LK_PREP.state.configState) === 'offline', 'cold open: the settings are not loaded yet (offline), not empty');
  await warm(p);
  ok(await until(p, () => !!document.getElementById('nbr-i1')), 'cold open: signal back, Ann\'s prep list opens by itself with its lines');
  ok(await p.evaluate(() => window.LK_PREP.state.configFull), 'cold open: signal back, the kitchen settings are read');
  ok(p.errors.length === 0, 'cold open: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. Sign out with no signal: the names are not shown as "none", and come back with the signal
  p = await L.open(b, '#/prep', { who: 'ann', wait: 1200 });
  await cold(p);
  await p.evaluate(() => { const g = document.querySelector('.nt-got'); if (g) g.click(); });
  await p.click('.wtop-who'); await L.settle(p, 150);
  await p.click('.wm [data-who="out"]'); await L.settle(p, 800);
  t = await page(p);
  ok(t.indexOf(NO_KITCHEN) >= 0 && !/No names are set up yet/.test(t), 'sign out offline: says there is no signal, not that no names are set up (' + t.slice(0, 120) + ')');
  await warm(p);
  ok(await until(p, () => document.querySelectorAll('.p-name').length === 3), 'sign out offline: signal back, Who are you? lists the three names');
  ok(p.errors.length === 0, 'sign out offline: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 3. The book opened with signal, then lost it: lists first opened now are not shown as empty, and nothing empty is kept
  const line = { dir: 'out', venue: 'Riviera', person: 'Jess', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 86400000, deleted: false, by: 'bo' };
  const extra = { [fsKey(['transfers', yday, 'lines', 'y1'])]: line, [fsKey(['transferOpen', yday + '_y1'])]: { date: yday, lineId: 'y1', record: line, open: true },
    [fsKey(['orders', yday, 'lines', 'oy1'])]: { text: 'Cream', qty: '2 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 90000000, ordered: false, deleted: false } };
  p = await L.open(b, '#/prep', { who: 'sam', extra, wait: 1500 });
  ok(!!(await p.$('#nbr-i1')), 'signal lost: the prep list was read with signal');
  await cold(p);
  await go(p, '#/orders');
  t = await page(p);
  ok(t.indexOf(NO_LIST) >= 0 && !/Nothing on the order list/.test(t), 'orders: says there is no signal, not that the list is empty');
  ok(!/0 of 0 ordered/.test(t), 'orders: no 0 of 0 count while the list is not loaded');
  ok(!(await ls(p, 'lk.ord.hist')), 'orders: no empty order history kept for the day');
  await p.click('[data-p="oview"][data-v="all"]'); await L.settle(p, 700);
  t = await page(p);
  ok(/Could not load every day/.test(t) && !/Nothing waiting to be ordered/.test(t), 'everything to order: says it could not load, not that nothing is waiting');
  await p.click('[data-p="oview"][data-v="day"]'); await L.settle(p, 200);
  await go(p, '#/waste');
  t = await page(p);
  ok(t.indexOf(NO_LIST) >= 0 && !/Nothing logged for/.test(t), 'wastage: says there is no signal, not that nothing is logged');
  await go(p, '#/transfers');
  t = await page(p);
  ok(t.indexOf(NO_LIST) >= 0 && !/No transfers for/.test(t) && !/0 transfers/.test(t), 'transfers: says there is no signal, not that there are none');
  ok(t.split('This list shows when the phone is back online').length === 3 && !/No outstanding transfers from earlier days/.test(t), 'still outstanding: says there is no signal, not that there are none');
  await go(p, '#/drinks');
  ok(/Could not load the team's drinks/.test(await page(p)), 'drinks: says it could not load the team\'s drinks');
  ok(!(await ls(p, 'lk.drinks')), 'drinks: no empty drinks list kept on the phone');
  await go(p, '#/prep');
  await p.click('[data-p="day"][data-d="1"]'); await L.settle(p, 400);
  await p.click('[data-p="today"]'); await L.settle(p, 600);
  t = await page(p);
  ok(t.indexOf(NO_LIST) >= 0 && !/Nothing written for/.test(t) && !/0 of 0 done/.test(t), 'prep, a day forward and back to Today: says there is no signal, not that nothing is written');
  await warm(p);
  ok(await until(p, () => !!document.getElementById('nbr-i1')), 'signal back: today\'s prep lines show by themselves');
  await go(p, '#/orders');
  ok(/Milk/.test(await page(p)), 'signal back: the order list shows Milk');
  await go(p, '#/transfers');
  ok(/Butter/.test(await txt(p, '.tr-outstanding') || ''), 'signal back: yesterday\'s loan is still outstanding');
  await go(p, '#/drinks');
  ok(await until(p, () => !!(JSON.parse(localStorage.getItem('lk.drinks') || '{}').by || {}).ann), 'signal back: the team\'s drinks load and are kept');
  ok(p.errors.length === 0, 'signal lost: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 4. Guides read with no signal: the list kept on the phone is not replaced by an empty one
  p = await L.open(b, '#/guides', { who: 'ann', extra: L.guides(), cold: '/guides$', wait: 1500 });
  t = await page(p);
  ok(!/No guides yet/.test(t) && /Could not load the guides/.test(t), 'guides: says it could not load, not that there are none (' + t.slice(0, 160) + ')');
  ok(!(await ls(p, 'lk.guides')), 'guides: no empty list kept on the phone for the day');
  await warm(p);
  ok(await until(p, () => /iCombi/.test((document.querySelector('#prep-root') || {}).textContent || '')), 'guides: signal back, the guides show');
  ok(p.errors.length === 0, 'guides: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 5. Pings read with no signal: not "No pings right now", not counted as read, and read again once the signal is back
  const ping = { [fsKey(['notes', 'n1'])]: { text: 'Delivery: Bidfood 09:00', tag: 'delivery', start: today, until: today, dows: [], tm: 835, removed: false, at: 1, by: 'sam' } };
  p = await L.open(b, '#/prep', { who: 'ann', extra: ping, cold: '/notes$', wait: 1500 });
  ok(await p.evaluate(() => window.LK_PREP.state.notesFor) === '', 'pings: an answer from the empty copy is not taken as today\'s pings');
  await p.evaluate(() => { const g = document.querySelector('.nt-got'); if (g) g.click(); });
  await p.click('.nbell'); await L.settle(p, 400);
  t = await txt(p, '.nt') || '';
  ok(!/No pings right now/.test(t) && /Could not check the pings/.test(t), 'pings: the sheet says it could not check, not that there are none (' + t.slice(0, 160) + ')');
  await p.keyboard.press('Escape'); await L.settle(p, 300);
  await warm(p);
  ok(await until(p, () => (window.LK_PREP.state.notes || []).some(n => /Bidfood/.test(n.text))), 'pings: signal back, the ping is read');
  ok(p.errors.length === 0, 'pings: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 6. Minutes read with no signal: not "No meeting minutes yet", and no read loop while the page is open
  const mins = { [fsKey(['minutes', 'm1'])]: { no: 1, v: 1, status: 'published', date: yday, start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam', att: [], guests: '', decisions: 'New menu from Friday', menu: '', safety: '', dates: '', other: '', acts: [], next: '', pubAt: L.NOW - 86400000, removed: false, at: 1, upd: 1, by: 'sam' } };
  p = await L.open(b, '#/minutes', { who: 'ann', extra: mins, cold: '/minutes$', wait: 1500 });
  const r0 = await p.evaluate(() => window.__fake.reads.filter(k => /\/minutes$/.test(k)).length);
  await L.settle(p, 1500);
  const r1 = await p.evaluate(() => window.__fake.reads.filter(k => /\/minutes$/.test(k)).length);
  t = await page(p);
  ok(!/No meeting minutes yet/.test(t) && /Could not load the minutes/.test(t), 'minutes: says it could not load, not that there are none (' + t.slice(0, 160) + ')');
  ok(r1 - r0 === 0 && r1 <= 2, 'minutes: no read loop while the page is open (' + r0 + ' then ' + r1 + ' reads)');
  await warm(p);
  ok(await until(p, () => /New menu from Friday/.test((document.querySelector('#prep-root') || {}).textContent || '')), 'minutes: signal back, the minutes show');
  ok(p.errors.length === 0, 'minutes: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 7. Functions read with no signal: not "No functions on now" with "Last updated Thu 1 Jan"
  const offline = () => { Object.defineProperty(Navigator.prototype, 'onLine', { configurable: true, get() { return !window.__lkOff; } }); window.__lkOff = true; };
  p = await L.open(b, '#/fn', { who: 'ann', cold: '/functions$', init: offline, wait: 1500 });
  t = await txt(p, '.fn-page') || '';
  ok(!/No functions on now/.test(t) && !/1 Jan/.test(t) && /No signal\. Functions show here when the phone is back online\./.test(t), 'functions: says there is no signal, not that there are none (' + t.slice(0, 160) + ')');
  await warm(p);
  ok(await until(p, () => /Up to date/.test((document.querySelector('.fn-page') || {}).textContent || '')), 'functions: signal back, the list is read and up to date');
  ok(p.errors.length === 0, 'functions: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 8. Saving your usual keeps who is on today in the drinks copy on the phone
  p = await L.open(b, '#/drinks', { who: 'ann', wait: 1500 });
  await until(p, () => !!localStorage.getItem('lk.drinks'));
  await p.click('[data-p="dk-edit"]'); await L.settle(p, 200);
  await p.click('[data-p="dk-save"]'); await L.settle(p, 600);
  const kept = JSON.parse(await ls(p, 'lk.drinks') || '{}');
  ok(!!kept.seen && !!kept.by && !!kept.by.ann, 'drinks: after saving a usual, the copy on the phone still knows who is on today');
  ok(p.errors.length === 0, 'drinks save: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
