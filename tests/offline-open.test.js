// No signal (27 Oct 2026). Since 26 Oct 2026 (#387) Firestore keeps only a copy in memory, so with no signal a listener or a
// query answers at once from that copy, and the copy is empty for anything no other listener holds (marked fromCache).
// That answer means "not loaded yet", never "nothing there": the names list, the kitchen lists, Everything to order,
// the drinks run, guides, pings, minutes and functions say there is no signal, nothing empty is kept on the phone, and
// each one loads by itself once the signal is back. The stand-in answers like that with __fake.cold.
// A list not loaded yet stays that way when the cook writes a line with no signal: the copy then holds only that line,
// which shows under the note with no count, never as the whole list.
const L = require('./lib');
const M = require('../js/functions.js');
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
const shows = (p, sel, re) => L.waitFor(p, a => new RegExp(a[1]).test((document.querySelector(a[0]) || {}).textContent || ''), [sel, re.source], 5000).then(() => true, () => false);
const head = p => txt(p, '.o-page .nb-ph').then(t => t || '');
// a confirmed function the way the book writes it
const fnAt = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
const fnDoc = (name, date) => M.derive({ v: 1, status: 'confirmed', name, date, start: fnAt(date, '18:00'), loc: 'Beer garden', guests: 40, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
  rounds: [{ at: fnAt(date, '18:30'), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 3, u: M.toU([3]) }],
  was: {}, chg: [], cBy: 'sam', cAt: L.NOW - 86400000, confBy: 'sam', confAt: L.NOW - 86400000, by: 'sam', upd: L.NOW - 3600000 });
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
  // a line written now: it shows under the note, the note stays, no count (Milk and Brioche buns are on the server)
  await p.fill('#o-text', 'Lemons'); await p.fill('#o-qty', '2 kg'); await p.press('#o-text', 'Enter'); await L.settle(p, 700);
  t = await page(p);
  ok(t.indexOf(NO_LIST) >= 0 && t.indexOf('Lemons') > t.indexOf(NO_LIST) && !/Milk/.test(t), 'orders, a line written with no signal: it shows under the note, which stays (' + t.slice(0, 200) + ')');
  ok(!/ordered/.test(await head(p)) && !/Everything on this list has been ordered/.test(t), 'orders, a line written with no signal: no "0 of 1 ordered" from that line alone');
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
  // a transfer logged now also writes its open record (xWrite): Still outstanding must not take that as the whole list
  await p.fill('#tr-venue', 'Riviera'); await p.fill('#tr-person', 'Jess'); await p.fill('#tr-text', 'Pesto jars'); await p.fill('#tr-amt', '2');
  await p.click('[data-p="tr-unit"][data-v="L"]');
  await p.click('.tr-add .nb-addbtn'); await L.settle(p, 700);
  t = await page(p);
  ok(t.split('This list shows when the phone is back online').length === 3 && !/No outstanding transfers from earlier days/.test(t), 'transfers, one logged with no signal: Still outstanding still says there is no signal, not that there are none (' + t.slice(0, 200) + ')');
  ok(/Pesto jars/.test(t) && !/\d+ (out|in)\b|\d+ transfers?\b/.test(await head(p)), 'transfers, one logged with no signal: it shows under the note, with no count');
  await go(p, '#/drinks');
  ok(/Could not load the team's drinks/.test(await page(p)), 'drinks: says it could not load the team\'s drinks');
  ok(!(await ls(p, 'lk.drinks')), 'drinks: no empty drinks list kept on the phone');
  await go(p, '#/prep');
  await p.click('[data-p="day"][data-d="1"]'); await L.settle(p, 400);
  await p.click('[data-p="today"]'); await L.settle(p, 600);
  t = await page(p);
  ok(t.indexOf(NO_LIST) >= 0 && !/Nothing written for/.test(t) && !/0 of 0 done/.test(t), 'prep, a day forward and back to Today: says there is no signal, not that nothing is written');
  await p.fill('#p-text', 'Slice tomatoes'); await p.press('#p-text', 'Enter'); await L.settle(p, 700);
  t = await page(p);
  ok(t.indexOf(NO_LIST) >= 0 && t.indexOf('Slice tomatoes') > t.indexOf(NO_LIST) && !/of 1 done/.test(t), 'prep, a line written with no signal: it shows under the note, which stays, with no count (' + t.slice(0, 200) + ')');
  await warm(p);
  ok(await until(p, () => !!document.getElementById('nbr-i1')), 'signal back: today\'s prep lines show by themselves');
  ok(await until(p, () => /Slice tomatoes/.test((document.querySelector('#prep-root') || {}).textContent || '')), 'signal back: the line written with no signal is on the prep list');
  await go(p, '#/orders');
  ok(await shows(p, '#prep-root', /Milk[\s\S]*Lemons|Lemons[\s\S]*Milk/), 'signal back: the order list shows Milk and the line written with no signal');
  ok((await page(p)).indexOf(NO_LIST) < 0 && /\d+ of \d+ ordered/.test(await head(p)), 'signal back: the order list has its count and no note');
  await go(p, '#/transfers');
  ok(await shows(p, '.tr-outstanding', /Butter/), 'signal back: yesterday\'s loan is still outstanding');
  await go(p, '#/drinks');
  ok(await until(p, () => !!(JSON.parse(localStorage.getItem('lk.drinks') || '{}').by || {}).ann), 'signal back: the team\'s drinks load and are kept');
  ok(p.errors.length === 0, 'signal lost: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 3b. The prep list's Handy page with no signal, after a day forward and back: Done today, Pace, Quick add and For the
  // functions each read the whole list, so none of them comes from the lines this phone wrote since. On the server: two
  // lines ticked today, three past days for Pace, a regular for Quick add and a function tomorrow.
  const hd = {};
  [1, 2, 3].forEach(n => { const d = L.ymd(new Date(L.NOW - n * 86400000)); for (let k = 0; k < 5; k++) hd[fsKey(['days', d, 'items', 'p' + n + k])] = { text: 'Past job ' + n + k, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - n * 86400000 - 7200000, done: true, doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW - n * 86400000 - 3600000 * (k + 1), deleted: false }; });
  [['d1', 'Peel garlic'], ['d2', 'Juice lemons']].forEach(([id, text], k) => { hd[fsKey(['days', today, 'items', id])] = { text, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 7200000 + k, done: true, doneBy: 'Ann', doneById: 'ann', doneAt: L.NOW - 1800000 + k, deleted: false }; });
  hd[fsKey(['learned', 'mise-onions'])] = { text: 'Mise onions', uses: 6, typed: 6, secs: { larder: { name: 'Larder', n: 6 } }, dow: {} };
  hd[fsKey(['functions', 'f1'])] = fnDoc('Brown 21st', M.addDays(today, 1));
  p = await L.open(b, '#/prep', { who: 'sam', extra: hd, width: 1280, height: 900, wait: 1800 });
  const has = sel => p.$(sel).then(Boolean);
  const handyOn = () => until(p, () => ['.nb-pace', '.nb-quick', '.fnn-sum'].every(s => !!document.querySelector(s)));
  ok(await shows(p, '.nb-right', /Done today \(2\)[\s\S]*Peel garlic/) && await handyOn(), 'handy with signal: Done today (2), Pace, Quick add and For the functions show');
  await cold(p);
  await p.click('[data-p="day"][data-d="1"]'); await L.settle(p, 400);
  await p.click('[data-p="today"]'); await L.settle(p, 600);
  t = await txt(p, '.nb-right') || '';
  ok(/No signal\. Lines ticked today show when the phone is back online\./.test(t) && !/Nothing ticked yet/.test(t) && !/Done today \(\d+\)/.test(t), 'handy with no signal: Done today says there is no signal, with no count, not "Nothing ticked yet" (' + t.slice(0, 160) + ')');
  ok(!(await has('.nb-quick')) && !(await has('.nb-qadd')) && !(await has('.fnn-sum')), 'handy with no signal: no Quick add and no For the functions, which would offer lines already on the list');
  for (const line of ['Slice tomatoes', 'Peel carrots', 'Pick parsley']) { await p.fill('#p-text', line); await p.press('#p-text', 'Enter'); await L.settle(p, 400); }
  ok(await p.evaluate(() => window.LK_PREP.state.itemsState) === 'offline' && !(await has('.nb-pace')), 'handy, three lines written with no signal: no Pace card from those lines alone');
  t = await txt(p, '.nb-right') || '';
  ok(/Closing soon/.test(t) && !/still open and will roll/.test(t), 'handy, three lines written with no signal: Closing soon gives no count of the lines left open (' + t.slice(0, 120) + ')');
  await warm(p);
  ok(await shows(p, '.nb-right', /Done today \(2\)[\s\S]*Peel garlic/) && await handyOn(), 'handy, signal back: Done today (2) with the lines ticked today, Pace, Quick add and For the functions');
  ok(p.errors.length === 0, 'handy: no page errors ' + p.errors.join(' | '));
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

  // 5b. Pings after midnight with no signal: the new day's read keeps to its 5-minute wait, not one read every minute,
  // and once the signal is back the new day's pings are read
  p = await L.open(b, '#/prep', { who: 'ann', extra: ping, clock: fnAt(today, '23:58'), wait: 1500 });
  ok(await until(p, d => window.LK_PREP.state.notesFor === d, today), 'pings at midnight: today\'s pings are read before midnight');
  await p.evaluate(() => { window.__fake.cold = /notes$/; });
  const pingReads = () => p.evaluate(() => window.__fake.reads.filter(k => /\/notes$/.test(k)).length);
  const n0 = await pingReads();
  // a mouse move each minute, so the phone is not signed out for being left alone
  for (let i = 0; i < 8; i++) { await p.mouse.move(20 + i, 20); await p.clock.runFor(60000); }
  await L.settle(p, 300);
  const n1 = await pingReads();
  ok(n1 - n0 >= 1 && n1 - n0 <= 2, 'pings at midnight with no signal: tried at the new day and again after 5 minutes, not every minute (' + (n1 - n0) + ' reads in 8 minutes)');
  await warm(p);
  ok(await until(p, d => window.LK_PREP.state.notesFor === d, M.addDays(today, 1)), 'pings at midnight: signal back, the new day\'s pings are read');
  ok(p.errors.length === 0, 'pings at midnight: no page errors ' + p.errors.join(' | '));
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

  // 7b. The chefs' minutes register with no signal: not "No minutes have been published yet"
  p = await L.open(b, '#/minutes', { who: 'sam', extra: mins, cold: '/minutes$', wait: 1500 });
  await p.click('[data-p="mn-sous"]'); await L.settle(p, 700);
  t = await page(p);
  ok(!/No minutes have been published yet/.test(t) && /Could not load the minutes/.test(t), 'minutes register: says it could not load, not that none are published (' + t.slice(0, 160) + ')');
  await warm(p);
  ok(await until(p, () => /Sign-off register/.test((document.querySelector('#prep-root') || {}).textContent || '')), 'minutes register: signal back, the register shows');
  ok(p.errors.length === 0, 'minutes register: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 7c. Functions at midnight with no signal: the listener starts again from the new day, and the empty copy in memory
  // does not replace the list already shown (yesterday's evening, read from the server)
  const tmr = M.addDays(today, 1);
  p = await L.open(b, '#/fn', { who: 'ann', extra: { [fsKey(['functions', 'f1'])]: fnDoc('Brown 21st', tmr) }, clock: fnAt(today, '23:56'), wait: 1500 });
  ok(await shows(p, '.fn-page', /Brown 21st/), 'functions at midnight: the function tomorrow shows before midnight');
  await p.evaluate(() => { window.__fake.cold = /\/functions$/; });
  await p.clock.fastForward(6 * 60000); await L.settle(p, 800);
  t = await txt(p, '.fn-page') || '';
  ok(/Brown 21st/.test(t) && !/No functions on now/.test(t), 'functions at midnight with no signal: the list stays, not "No functions on now" (' + t.slice(0, 200) + ')');
  ok(/No signal\. Last updated/.test(t), 'functions at midnight with no signal: says there is no signal and when it was last updated');
  await warm(p);
  ok(await shows(p, '.fn-page', /Up to date/), 'functions at midnight: signal back, the list is read and up to date');
  ok(p.errors.length === 0, 'functions at midnight: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 7d. Delivery received with no signal (Functions only and staff): not "No deliveries recorded for this date"
  const dlPeople = [['head', 'Head', 'head'], ['sam', 'Sam', 'sous'], ['ann', 'Ann', 'staff'], ['fay', 'Fay', 'fnc']].map(([id, name, role]) => ({ id, name, role, active: true, add: role !== 'fnc', tick: true, del: false }));
  const dl = { [fsKey(['config', 'main'])]: { people: dlPeople, staffIds: dlPeople.map(x => x.id), headId: 'head', sousIds: ['head', 'sam'], fnIds: ['fay'], fnOnlyIds: ['fay'] },
    [fsKey(['deliveries', 'd1'])]: { day: today, supplier: 'Bidfood', receivedAt: L.NOW - 60000, recordedAt: L.NOW - 60000, chilled: 2.5, frozen: -18, note: 'Chicken', receivedBy: 'Ann', receivedById: 'ann', by: 'ann' } };
  dlPeople.forEach(x => { dl[fsKey(['pinset', x.id])] = { at: 1 }; });
  for (const who of ['fay', 'ann']) {
    p = await L.open(b, '#/prep', { who, extra: dl, wait: 1500 });
    await cold(p);
    await go(p, '#/deliveries');
    // js/deliveries.js is fetched on this navigation: wait for the section itself
    const said = await shows(p, '.dl-history', /No signal\. Today's deliveries show when the phone is back online\./);
    t = await txt(p, '.dl-history') || '';
    ok(said && !/No deliveries recorded for this date/.test(t), who + ', deliveries with no signal: says there is no signal, not that there are none (' + t.slice(0, 160) + ')');
    await warm(p);
    ok(await shows(p, '.dl-history', /Bidfood/), who + ', deliveries: signal back, today\'s delivery shows');
    ok(p.errors.length === 0, who + ', deliveries: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 7e. Opened with no signal on a page another script draws: the card names that page, not "Prep book"
  p = await L.open(b, '#/deliveries', { who: 'ann', cold: '.', fakeMode: 'hold', wait: 1500 });
  t = await txt(p, '#prep-root h2') || '';
  ok(t === 'Delivery received' && (await page(p)).indexOf(NO_KITCHEN) >= 0, 'cold open on Delivery received: the no-signal card is headed Delivery received (' + t + ')');
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
