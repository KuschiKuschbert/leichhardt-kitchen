// The start of a shift (23 Oct 2026): once a day per person, one sheet comes up after the section picker with today's
// pings and then the minutes still to sign. Never two sheets at once. Got it counts for each person, chefs get the
// pings too (only a ping they have just saved does not pop straight back up at them), and on a shared tablet a sign-in
// just to tick only brings up a Safety, Allergen alert or Off today ping. The mail nudge waits for the other sheets and never opens over a recipe.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const today = L.ymd(new Date(L.NOW));
const store = page => page.evaluate(() => window.__fake.dump());
const SECS = [{ id: 'grill', name: 'Grill', off: false }, { id: 'pass', name: 'Pass', off: false }];
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const cfg = secs => ({ [CFG]: Object.assign({ people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true }, secs ? { kitSecs: SECS } : {}) });
// set for 13:55, so it is on screen when the pages open at 14:00 (a ping is on for 30 minutes from its time, 24 Oct 2026)
const ping = (id, text, x) => ({ [fsKey(['notes', id])]: Object.assign({ text, tag: 'delivery', start: today, until: today, dows: [], tm: 835, removed: false, at: 1, by: 'sam' }, x || {}) });
const mins = () => ({ [fsKey(['minutes', 'm1'])]: { no: 1, v: 1, status: 'published', date: today, start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam',
  att: [{ id: 'ann', st: 'present' }, { id: 'bo', st: 'present' }, { id: 'sam', st: 'present' }], guests: '', decisions: 'Fryer oil every Monday', menu: '', safety: '', dates: '', other: '',
  acts: [], next: '', pubAt: L.NOW - 3600000, removed: false, at: 1, upd: 1, by: 'sam' } });
const sheets = p => p.evaluate(() => document.querySelectorAll('.nt-wrap, .ks-wrap, .mlp-wrap').length);
const dot = p => p.evaluate(() => { const b = document.querySelector('.nbell'); return !!b && !b.hidden && b.classList.contains('has-new'); });
async function pin(p, name, digits) { await p.click('.p-name[data-id="' + name + '"]'); await L.settle(p, 250); await p.keyboard.type(digits); await L.settle(p, 900); }

(async () => {
  const b = await L.start();
  let p, s, most = 0;

  // Ann starts her shift: the section first, the pings sheet straight after it, then the minutes to sign
  p = await L.open(b, '#/prep', { who: 'ann', board: true, extra: Object.assign(cfg(true), ping('n1', 'Delivery: Bidfood 09:00'), mins()), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.ks-wrap')).catch(() => {});
  ok(!!(await p.$('.ks-wrap')) && !(await p.$('.nt-wrap')), 'start: the section picker comes first, the pings sheet waits');
  most = Math.max(most, await sheets(p));
  await p.click('.ks-b[data-v="grill"]');
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap'), null, 3000).catch(() => {});
  ok(!!(await p.$('.nt-wrap')) && !(await p.$('.ks-wrap')), 'start: the pings sheet follows as soon as the section is picked');
  most = Math.max(most, await sheets(p));
  ok(await txt(p, '#nt-h') === 'Today\'s shift pings' && await txt(p, '.nt-eb') === 'Ann', 'start: Today\'s shift pings, with her name on top');
  ok(/Bidfood/.test(await txt(p, '.nt-list') || '') && /minutes to sign/.test(await txt(p, '.nt-next') || ''), 'start: the ping, and the minutes to sign come next');
  ok(await p.$('.nt-got') !== null && await txt(p, '.nt-later') === 'Close' && await p.$('.nt .nt-a') === null, 'start: Got it and Close (no Later), and no Read and sign before the pings are read');
  ok(!(await L.overflow(p)), 'start: the sheet fits a phone');
  await p.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished)));   // the sheet slides up first
  const bot = await p.$eval('.nt', e => [e.getBoundingClientRect().bottom, window.innerHeight, getComputedStyle(e).transform].join(' '));
  ok(Math.abs(+bot.split(' ')[0] - +bot.split(' ')[1]) < 2, 'start: a sheet at the bottom of a phone (' + bot + ')');
  await p.click('.nt-got'); await L.settle(p, 400);
  ok(await txt(p, '#nt-h') === 'Minutes to sign' && /Kitchen meeting/.test(await txt(p, '.nt .nt-a') || ''), 'Got it: the sheet goes on to the minutes to sign');
  ok(await p.evaluate(() => { const v = JSON.parse(localStorage.getItem('lk.note.seen.ann') || '{}'); return v.sig === 'n1:1'; }), 'Got it: read for Ann (lk.note.seen.ann)');
  s = await store(p);
  ok(!!s[fsKey(['notes', 'n1', 'seen', today + '_ann'])], 'Got it: Ann\'s seen record is written');
  await p.click('.nt .nt-a'); await L.settle(p, 800);
  ok(await p.evaluate(() => location.hash) === '#/minutes' && /Sign as Ann/.test(await txt(p, '.mn-signbtn') || '') && await p.$('.nt-wrap') === null, 'Read and sign: the minutes open, the sheet is gone');
  ok(most <= 1, 'start: never two sheets at once (' + most + ')');
  await p.reload({ waitUntil: 'load' }); await L.settle(p, 1500);
  ok(await p.$('.nt-wrap') === null && await p.$('.ks-wrap') === null, 'start: once a day, not again after a reload');
  ok(await dot(p), 'start: the bell keeps its dot while the minutes are not signed');
  ok(p.errors.length === 0, 'start: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Close (Escape) puts it off: nothing read, the dot stays, and it never pops up again by itself, not even after a
  // reload (24 Oct 2026: nothing piles up). The bell still has it until its 30 minutes are up.
  p = await L.open(b, '#/', { who: 'bo', board: true, extra: Object.assign(cfg(), ping('n1', 'Safety: walk-in door sticks', { tag: 'safety' }), mins()), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  await p.keyboard.press('Escape'); await L.settle(p, 300);
  s = await store(p);
  ok(await p.$('.nt-wrap') === null && !(await p.evaluate(() => localStorage.getItem('lk.note.seen.bo'))) && !s[fsKey(['notes', 'n1', 'seen', today + '_bo'])], 'Close: closed, nothing marked read');
  ok(await dot(p), 'Close: the bell keeps its dot');
  await p.reload({ waitUntil: 'load' }); await L.settle(p, 1500);
  await p.clock.runFor(61000); await L.settle(p, 400);
  // the pings are read again after the reload before anything is judged (a slow runner reads them late)
  await L.waitFor(p, () => /^1 shift ping on now/.test((document.querySelector('.nbell') || { getAttribute: () => '' }).getAttribute('aria-label') || ''), null, 10000).catch(() => {});
  ok(await p.$('.nt-wrap') === null && await dot(p), 'Close: it does not pop up again by itself, not even after a reload, and the dot stays');
  await p.click('.nbell'); await L.settle(p, 300);
  ok(/Walk-in|walk-in/.test(await txt(p, '.nt-list') || '') && /minutes to sign/.test(await txt(p, '.nt-next') || ''), 'the bell: the ping on now, then the minutes to sign');
  await p.click('.nt-got'); await L.settle(p, 300);
  ok(/Kitchen meeting/.test(await txt(p, '.nt .nt-a') || ''), 'the bell: after Got it, the minutes to sign');
  await p.click('.nt-later'); await L.settle(p, 300);
  await p.context().close();

  // before its time: no sheet and nothing on the bell yet (a ping is out of sight until it pops up), but the day is
  // marked once the reads are in
  p = await L.open(b, '#/prep', { who: 'ann', board: true, clock: L.NOW - 7 * 3600000, extra: Object.assign(cfg(), ping('n1', 'Delivery: Bidfood 09:00')), wait: 2000 });
  await L.waitFor(p, () => localStorage.getItem('lk.board.ann') !== null).catch(() => {});
  ok(await p.$('.nt-wrap') === null && await p.evaluate(d => localStorage.getItem('lk.board.ann') === d, today), 'before its time: no sheet, the start is marked for today');
  ok(await p.evaluate(() => /^No shift pings on now/.test(document.querySelector('.nbell').getAttribute('aria-label'))) && !(await dot(p)), 'before its time: nothing on the bell yet');
  await p.context().close();

  // nothing for her: no sheet, and the bell is there with no dot
  p = await L.open(b, '#/', { who: 'ann', board: true, extra: cfg(), wait: 2000 });
  await L.waitFor(p, () => localStorage.getItem('lk.board.ann') !== null).catch(() => {});
  ok(await p.$('.nt-wrap') === null && !(await dot(p)) && await p.evaluate(() => !document.querySelector('.nbell').hidden), 'nothing on: no sheet, the bell shows with no dot');
  await p.click('.nbell'); await L.settle(p, 300);
  ok(/No pings right now/.test(await txt(p, '.nt') || '') && await txt(p, '.nt-later') === 'Close', 'nothing on: the bell says No pings right now, with Close');
  await p.click('.nt-later'); await L.settle(p, 200);
  await p.context().close();

  // after the update: the phone's old Got it for today goes to the person signed in, so nobody reads today's pings twice
  p = await L.open(b, '#/prep', { who: 'ann', extra: Object.assign(cfg(), ping('n1', 'Delivery: Bidfood 09:00')), wait: 1500 });
  await p.evaluate(d => { localStorage.setItem('lk.note.seen', JSON.stringify({ d, sig: 'n1:1' })); localStorage.removeItem('lk.note.seen.ann'); localStorage.removeItem('lk.note.mig'); }, today);
  await p.reload({ waitUntil: 'load' }); await L.settle(p, 1800);
  ok(await p.$('.nt-wrap') === null, 'update: no sheet for pings already read on this phone');
  ok(await p.evaluate(() => !!localStorage.getItem('lk.note.seen.ann') && localStorage.getItem('lk.note.mig') === '1'), 'update: the old mark is now Ann\'s, once');
  await p.context().close();

  // the sous chef gets the pings too, their own included, and their Got it counts
  p = await L.open(b, '#/prep', { who: 'sam', board: true, extra: Object.assign(cfg(), ping('n1', 'Special: pork belly')), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt-got')).catch(() => {});
  ok(/pork belly/.test(await txt(p, '.nt-list') || '') && await txt(p, '.nt-eb') === 'Sam', 'sous chef: the start of shift sheet shows the pings, their own too');
  await p.click('.nt-got'); await L.settle(p, 400);
  s = await store(p);
  ok(!!s[fsKey(['notes', 'n1', 'seen', today + '_sam'])], 'sous chef: Got it counts in Who has seen it');
  // a ping the sous chef has just saved for today does not pop straight back up at them
  await L.chef(p, 'pings');
  await p.click('[data-p="n-new"]'); await L.settle(p, 200);
  await p.fill('[data-k="n-text"]', 'Delivery: Bidfood at 15:00');
  await p.click('[data-p="n-save"]'); await L.settle(p, 800);
  await p.clock.runFor(61000); await L.settle(p, 400);
  ok(await p.$('.nt-wrap') === null && !(await dot(p)), 'sous chef: no sheet and no dot for the ping they just saved');
  await p.click('.nbell'); await L.settle(p, 300);
  ok(/Bidfood at 15:00/.test(await txt(p, '.nt-list') || '') && /pork belly/.test(await txt(p, '.nt-list') || ''), 'sous chef: the bell lists both');
  await p.context().close();

  // a save that lands after its writer handed the tablet over is not marked read for the next person (or nobody)
  p = await L.open(b, '#/prep', { who: 'sam', touch: true, settings: { shared: true }, extra: Object.assign(cfg(), ping('n1', 'Special: pork belly', { by: 'ann' })), wait: 2000 });
  await p.evaluate(d => { localStorage.setItem('lk.note.mig', '1'); localStorage.setItem('lk.note.seen', JSON.stringify({ d, sig: 'n1:1' })); }, today);
  await L.waitFor(p, () => !!document.querySelector('.nt-got')).catch(() => {});
  await p.click('.nt-got'); await L.settle(p, 300);
  await L.chef(p, 'pings');
  await p.click('[data-p="n-new"]'); await L.settle(p, 200);
  await p.fill('[data-k="n-text"]', 'Allergen alert: no peanut oil in the fryer');
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await p.click('[data-p="n-save"]'); await L.settle(p, 300);
  await p.click('.wtop-who'); await L.settle(p, 200);
  await p.click('[data-who="out"]'); await L.settle(p, 200);
  await p.click('[data-who="out"]').catch(() => {}); await L.settle(p, 400);
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  await L.settle(p, 600);
  await p.clock.runFor(61000); await L.settle(p, 400);
  ok(await p.$('.nt-wrap') === null, 'hand-over: nothing pops up over Who are you?');
  await p.click('[data-p="who-back"]').catch(() => {}); await L.settle(p, 300);
  await p.clock.runFor(61000); await L.settle(p, 400);
  ok(!/peanut/.test(await p.evaluate(() => localStorage.getItem('lk.note.seen') || '')) && /peanut/.test(await txt(p, '.nt-list') || ''), 'hand-over: back on the list, the ping saved before signing out still comes up on the tablet');
  await p.context().close();

  // an Undo straight after a remove still tells the other phones (the stamp is sent at the end of the 5 seconds)
  p = await L.open(b, '#/prep', { who: 'sam', extra: Object.assign(cfg(), ping('n1', 'Safety: fryer 2 is out', { tag: 'safety', by: 'ann' })), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt-got')).catch(() => {});
  await p.click('.nt-got'); await L.settle(p, 300);
  await L.chef(p, 'pings');
  await p.click('[data-p="n-del"][data-id="n1"]'); await L.settle(p, 100);
  await p.click('[data-p="n-del"][data-id="n1"]'); await L.settle(p, 500);
  const st1 = await p.evaluate(k => ((window.__fake.dump()[k] || {}).pastEdit || {}).n, fsKey(['config', 'main']));
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].filter(x => /^Undo$/.test(x.textContent.trim()))[0]; if (b) b.click(); });
  await L.settle(p, 500);
  await p.clock.runFor(6000); await L.settle(p, 400);
  const st2 = await p.evaluate(k => ((window.__fake.dump()[k] || {}).pastEdit || {}).n, fsKey(['config', 'main']));
  s = await store(p);
  ok(!!st1 && st2 > st1 && s[fsKey(['notes', 'n1'])].removed === false, 'Undo of a remove: put back, and a second stamp tells the other phones (' + st1 + ', ' + st2 + ')');
  await p.context().close();

  // a shared tablet: Bo signs in only to tick. A Special waits on the bell; a Safety ping comes up, with no minutes
  p = await L.open(b, '#/prep', { who: '', touch: true, settings: { shared: true }, board: true, extra: Object.assign(cfg(), ping('n1', 'Special: pork belly', { tag: 'special' }), mins()), wait: 1500 });
  // the tablet's own 14:00 call with nobody signed in: read on the tablet (after the update, so the mark is not handed on)
  await L.waitFor(p, () => !!document.querySelector('.nt-got')).catch(() => {});
  await p.evaluate(() => { localStorage.setItem('lk.note.mig', '1'); const n = document.querySelector('.nt-got'); if (n) n.click(); });
  await L.settle(p, 300);
  await p.click('[data-p="tick"][data-id="i1"]'); await L.settle(p, 300);
  await pin(p, 'bo', '3333');
  await p.clock.runFor(61000); await L.settle(p, 400);
  ok(await p.$('.nt-wrap') === null, 'tablet tick: no sheet for an ordinary ping after a sign-in just to tick');
  ok(await dot(p), 'tablet tick: the bell has its dot for Bo');
  await p.context().close();
  p = await L.open(b, '#/prep', { who: '', touch: true, settings: { shared: true }, board: true, extra: Object.assign(cfg(), ping('n1', 'Safety: fryer 2 is out', { tag: 'safety' }), mins()), wait: 1500 });
  // nobody's Got it on a shared tablet is not handed on to the first cook after the update (no lk.note.mig set here)
  await L.waitFor(p, () => !!document.querySelector('.nt-got')).catch(() => {});
  await p.evaluate(() => { const n = document.querySelector('.nt-got'); if (n) n.click(); });
  await L.settle(p, 300);
  await p.click('[data-p="tick"][data-id="i1"]'); await L.settle(p, 300);
  await pin(p, 'bo', '3333');
  await p.clock.runFor(61000); await L.settle(p, 400);
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  ok(/fryer 2/.test(await txt(p, '.nt-list') || '') && await p.$('.nt .nt-a') === null && await p.$('.nt-next') === null, 'tablet tick: a Safety ping comes up for Bo, without the minutes');
  await p.click('.nt-got'); await L.settle(p, 300);
  ok(await p.evaluate(() => !!localStorage.getItem('lk.note.seen.bo') && !localStorage.getItem('lk.note.seen.ann')), 'tablet: Got it is Bo\'s, not the tablet\'s');
  // a reload (the book updating itself) keeps Bo's sign-in as one just to tick: no start sheet for him
  await p.evaluate(() => localStorage.removeItem('lk.note.seen.bo'));
  await p.reload({ waitUntil: 'load' }); await L.settle(p, 1500);
  await p.clock.runFor(61000); await L.settle(p, 300);
  ok(await p.evaluate(() => localStorage.getItem('lk.board.bo') === null), 'tablet reload: still no start of shift for a sign-in just to tick');
  ok(p.errors.length === 0, 'tablet: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // one cook's Close does not hold the Safety ping back from the next cook on the tablet
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, settings: { shared: true }, extra: Object.assign(cfg(), ping('n1', 'Safety: fryer 2 is out', { tag: 'safety' })), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.nt-later')).catch(() => {});
  await p.click('.nt-later'); await L.settle(p, 300);
  await p.click('.wtop-who'); await L.settle(p, 200);
  await p.click('[data-who="out"]'); await L.settle(p, 400);
  await p.click('[data-p="who-back"]').catch(() => {}); await L.settle(p, 300);
  await p.click('[data-p="tick"][data-id="i2"]'); await L.settle(p, 300);
  await pin(p, 'bo', '3333');
  await p.clock.runFor(61000); await L.settle(p, 400);
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  ok(/fryer 2/.test(await txt(p, '.nt-list') || '') && await txt(p, '.nt-eb') === 'Bo', 'tablet Close: Ann\'s Close does not hold the Safety ping back from Bo');
  await p.context().close();

  // a first PIN set on the order list: One more thing is not on the screen there, so the pings still come up
  const kim = { [CFG]: { people: people.concat([{ id: 'kim', name: 'Kim Lee', role: 'staff', add: true, tick: true, del: false, active: true }]), sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo', 'kim'], showBadges: true } };
  p = await L.open(b, '#/orders', { who: '', board: true, extra: Object.assign(kim, ping('n1', 'Safety: walk-in door sticks', { tag: 'safety' })), wait: 1500 });
  await L.settle(p, 600); await p.clock.runFor(61000); await L.settle(p, 300);
  ok(await p.$('.nt-wrap') === null && !!(await p.$('.p-names')), 'Who are you?: no sheet over the names, the next person gets their own after their PIN');
  await p.click('.p-name[data-id="kim"]');
  await p.keyboard.type('4444'); await L.settle(p, 600);
  await p.keyboard.type('4444'); await L.settle(p, 1000);
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  ok(/walk-in/.test(await txt(p, '.nt-list') || '') && await p.evaluate(() => location.hash) === '#/orders', 'first PIN on the order list: the pings sheet still comes up');
  await p.context().close();

  // the sheet keeps its place while another phone ticks a line, and closes by itself when its ping is removed
  const long = Object.assign(cfg(), ping('n1', 'Safety: ' + 'check the walk-in seal before service. '.repeat(14), { tag: 'safety' }), ping('n2', 'Special: ' + 'pork belly with apple and fennel. '.repeat(14), { tag: 'special' }));
  p = await L.open(b, '#/prep', { who: 'ann', extra: long, wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt-body')).catch(() => {});
  const sc = await p.evaluate(() => { const b = document.querySelector('.nt-body'); b.scrollTop = 200; return b.scrollTop; });
  await p.evaluate(k => window.__fake.write(k, Object.assign({}, window.__fake.dump()[k], { done: true, doneBy: 'Bo', doneById: 'bo', doneAt: Date.now() })), ['kitchens', L.PIN, 'days', today, 'items', 'i2'].join('/'));
  await L.settle(p, 500);
  ok(sc > 0 && await p.evaluate(() => document.querySelector('.nt-body').scrollTop) === sc, 'a tick elsewhere: the sheet stays where it was scrolled');
  await p.context().close();
  p = await L.open(b, '#/prep', { who: 'ann', extra: Object.assign(cfg(), ping('n1', 'Special: pork belly', { tag: 'special' })), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  await p.evaluate(() => { const S = window.LK_PREP.state; S.notes = []; window.dispatchEvent(new Event('lk-clock')); });
  await L.settle(p, 300);
  ok(await p.$('.nt-wrap') === null && await p.evaluate(() => !localStorage.getItem('lk.note.seen.ann')), 'a ping removed while its sheet is open: the sheet closes, nothing marked read');
  await p.context().close();

  // the bell's sheet closed with Close counts as today's start: the same minutes do not come straight back
  p = await L.open(b, '#/prep', { who: 'ann', extra: Object.assign(cfg(), mins()), wait: 2000 });
  await L.waitFor(p, () => document.querySelector('.nbell.has-new')).catch(() => {});
  await p.evaluate(() => localStorage.removeItem('lk.board.ann'));   // as if the start was held back (someone typing)
  await p.click('.nbell'); await L.settle(p, 300);
  await p.click('.nt-later'); await L.settle(p, 500);
  ok(await p.$('.nt-wrap') === null && await p.evaluate(d => localStorage.getItem('lk.board.ann') === d, today), 'the bell, then Close: no second sheet with the same minutes');
  await p.context().close();

  // a desktop idle lock takes the sheet away; after the PIN it is Ann's again, and her Got it is hers
  p = await L.open(b, '#/prep', { who: 'ann', width: 1280, height: 800, board: true, extra: Object.assign(cfg(), ping('n1', 'Delivery: Bidfood 09:00')), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  await p.clock.runFor(8 * 60000); await L.settle(p, 500);
  ok(await p.$('.nt-wrap') === null && await p.evaluate(() => !localStorage.getItem('lk.note.seen')), 'idle lock: the sheet goes, nothing read for nobody');
  await p.keyboard.type('2222'); await L.settle(p, 1200);
  await L.waitFor(p, () => !!document.querySelector('.nt-got')).catch(() => {});
  ok(await txt(p, '.nt-eb') === 'Ann', 'idle lock: after the PIN the sheet is Ann\'s');
  await p.click('.nt-got'); await L.settle(p, 300);
  ok(await p.evaluate(() => !!localStorage.getItem('lk.note.seen.ann')), 'idle lock: her Got it is hers');
  await p.context().close();

  // the sheet at tablet and laptop width: no sideways scroll, Got it in view, in the middle from 900 px
  for (const w of [768, 1280]) {
    p = await L.open(b, '#/', { who: 'ann', width: w, height: w === 768 ? 1024 : 800, board: true, extra: Object.assign(cfg(), ping('n1', 'Delivery: Bidfood 09:00'), mins()), wait: 2000 });
    await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
    await p.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished)));
    const g = await p.$eval('.nt-got', e => { const r = e.getBoundingClientRect(); return r.bottom <= window.innerHeight && r.top >= 0; });
    const mid = await p.$eval('.nt', e => window.innerHeight - e.getBoundingClientRect().bottom > 4);
    ok(!(await L.overflow(p)) && g && mid === (w >= 900), w + ' px: fits, Got it in view, ' + (w >= 900 ? 'in the middle' : 'at the bottom'));
    await p.context().close();
  }

  // the head chef's mail nudge waits for the pings sheet, and never opens over a recipe
  const head = { [CFG]: { people: people.map(x => x.id === 'sam' ? Object.assign({}, x, { role: 'head' }) : x), headId: 'sam', sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true } };
  p = await L.open(b, '#/', { admin: true, who: '', extra: Object.assign({}, head, L.mail(), ping('n1', 'Delivery: Bidfood 09:00', { by: 'ann' })), wait: 2200 });
  await L.waitFor(p, () => !!document.querySelector('.nt-wrap')).catch(() => {});
  ok(!!(await p.$('.nt-wrap')) && !(await p.$('.mlp-wrap')), 'mail: the pings sheet first, the mail nudge waits');
  // going to Recipes puts the pings off (a page change is Back for the sheet); the nudge does not take its place there
  await p.evaluate(() => { location.hash = '#/recipes'; }); await L.settle(p, 600);
  await p.clock.runFor(61000); await L.settle(p, 300);
  ok(!(await p.$('.mlp-wrap')) && !(await p.$('.nt-wrap')), 'mail: no nudge over the recipes');
  await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 600);
  await p.clock.runFor(61000); await L.settle(p, 300);
  await L.waitFor(p, () => !!document.querySelector('.mlp-wrap')).catch(() => {});
  ok(!!(await p.$('.mlp-wrap')) && !(await p.$('.nt-wrap')), 'mail: the nudge comes on the next page, on its own');
  await p.context().close();

  // a recipe link in a ping: the mail nudge does not land on the recipe it opened
  p = await L.open(b, '#/', { admin: true, who: '', extra: Object.assign({}, head, L.mail(), ping('n1', 'Delivery: Barramundi in at 09:00', { by: 'ann' })), wait: 2200 });
  await L.waitFor(p, () => !!document.querySelector('.nt-rl')).catch(() => {});
  await p.click('.nt-rl'); await L.settle(p, 600);
  ok(/^#\/r\//.test(await p.evaluate(() => location.hash)) && !(await p.$('.mlp-wrap')), 'mail: no nudge over the recipe a ping links to (' + await p.evaluate(() => location.hash) + ')');
  await p.context().close();

  // the head chef's edit from the Google device is saved by nobody, not by the ping's writer
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: Object.assign({}, head, ping('n1', 'Delivery: Bidfood 09:00', { by: 'ann', author: 'ann' })), wait: 2200 });
  await L.waitFor(p, () => !!document.querySelector('.nt-got')).catch(() => {});
  await p.click('.nt-got'); await L.settle(p, 300);
  await L.adminTab(p, 'notes');
  await p.click('[data-p="n-edit"][data-id="n1"]'); await L.settle(p, 200);
  await p.fill('[data-k="n-text"]', 'Delivery: Bidfood cancelled today');
  await p.click('[data-p="n-save"]'); await L.settle(p, 700);
  s = await store(p);
  ok(s[fsKey(['notes', 'n1'])].by === '' && s[fsKey(['notes', 'n1'])].author === 'ann', 'Google device edit: saved by nobody, the writer kept');
  await p.context().close();

  await b.close();
  L.report(R);
})();
