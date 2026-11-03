// Ping sound (3 Nov 2026, head chef). When the pings sheet pops up by itself with a new ping, the phone plays the sound
// the head chef picked in the admin panel's Shift pings tab (config/main.pingSound): Pass bell, Order up, Soft chime,
// Marimba, Oven timer or Off. Nothing set, or anything else, is the Pass bell. The sounds are made on the phone with
// Web Audio (js/chime.js), so these checks count the notes the real browser is asked to play: each oscillator's pitch
// is kept in window.__osc. A browser plays sound only after someone touched the page, so each phone is tapped first.
// Every page opens at 14:00 kitchen time.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const store = page => page.evaluate(() => window.__fake.dump());
const ping = (id, text, x) => ({ [fsKey(['notes', id])]: Object.assign({ text, tag: 'none', start: today, until: today, dows: [], removed: false, at: 1, upd: 1, by: 'sam', author: 'sam' }, x || {}) });
const withSound = (v, extra) => Object.assign({ [CFG]: Object.assign(L.seed()[CFG], { pingSound: v }) }, extra || {});
// every oscillator the page starts, by its pitch (Hz, rounded to 0.1)
const listen = () => {
  window.__osc = [];
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  const make = A.prototype.createOscillator;
  A.prototype.createOscillator = function () {
    const o = make.call(this), start = o.start;
    o.start = function () { window.__osc.push(Math.round(o.frequency.value * 10) / 10); return start.apply(this, arguments); };
    return o;
  };
};
const heard = p => p.evaluate(() => (window.__osc || []).slice());
const waitHeard = (p, n) => L.waitFor(p, n => (window.__osc || []).length >= n, n, 4000).catch(() => {});
const BELL = 1318.5, ORDER = [BELL, BELL], MARIMBA = [784, 987.8, 1174.7], TIMER = 1480;
const count = (l, f) => l.filter(x => x === f).length;
const picks = p => p.evaluate(() => [...document.querySelectorAll('.ps-pick')].map(e => e.getAttribute('data-v') + (e.getAttribute('aria-checked') === 'true' ? '*' : '')));

(async () => {
  const b = await L.start();

  // the head chef: the Shift pings tab has Ping sound with five sounds and Off; the Pass bell until one is picked
  let p = await L.open(b, '#/admin', { admin: true, adminPage: 'notes', init: listen, wait: 2000 });
  await L.adminTab(p, 'notes');
  await L.waitFor(p, () => !!document.querySelector('.ps-block'), null, 6000).catch(() => {});
  ok((await picks(p)).join() === 'bell*,order,chime,marimba,timer,off', 'admin: Ping sound lists five sounds and Off, the Pass bell picked while nothing is set (' + (await picks(p)).join() + ')');
  ok(await p.$$eval('.ps-play', l => l.length) === 5, 'admin: each sound has its own Play, Off has none');
  ok(!(await L.overflow(p)), 'admin: the Ping sound block fits a phone');
  const chips = await p.evaluate(() => [...document.querySelectorAll('.a-onpage [data-p="jump"]')].map(e => e.textContent.trim()));
  ok(chips.join() === 'Pings set,Ping sound', 'admin: On this page has Pings set and Ping sound (' + chips.join() + ')');

  // Play only listens: the marimba's three notes, nothing saved (the admin panel's own People save may already have
  // written the Pass bell, the same as nothing set)
  const before = (await store(p))[CFG].pingSound;
  await p.click('[data-p="ps-play"][data-v="marimba"]');
  await waitHeard(p, 3);
  let h = await heard(p);
  ok(MARIMBA.every(f => count(h, f) === 1), 'admin: Play Marimba plays its three notes, G, B and D (' + h.join(', ') + ')');
  ok((before === undefined || before === 'bell') && (await store(p))[CFG].pingSound === before && (await picks(p))[0] === 'bell*', 'admin: Play saves nothing and leaves the Pass bell picked');

  // picking a sound plays it and saves it for every phone
  await p.evaluate(() => { window.__osc = []; });
  await p.click('[data-p="ps-pick"][data-v="timer"]');
  await L.waitFor(p, () => (window.__fake.dump()[Object.keys(window.__fake.dump()).find(k => /config\/main$/.test(k))] || {}).pingSound === 'timer', null, 4000).catch(() => {});
  await waitHeard(p, 3);
  h = await heard(p);
  let s = await store(p);
  ok(s[CFG].pingSound === 'timer', 'admin: picking Oven timer saves config/main.pingSound (' + s[CFG].pingSound + ')');
  ok(count(h, TIMER) === 3, 'admin: picking Oven timer plays its three beeps (' + h.join(', ') + ')');
  await L.settle(p, 300);
  ok((await picks(p)).indexOf('timer*') === 4 && /Every phone plays Oven timer when a ping pops up/.test(await txt(p, '.ps-block .saved')), 'admin: Oven timer shows as picked and the save says what every phone plays (' + await txt(p, '.ps-block .saved') + ')');

  // Off: no sound, and the save says pings still pop up
  await p.evaluate(() => { window.__osc = []; });
  await p.click('[data-p="ps-pick"][data-v="off"]'); await L.settle(p, 600);
  s = await store(p);
  ok(s[CFG].pingSound === 'off' && (await heard(p)).length === 0 && /no sound/.test(await txt(p, '.ps-block .saved')), 'admin: Off saves off and plays nothing (' + s[CFG].pingSound + ')');

  // the People save carries the sound over (it writes the whole of config/main)
  await p.click('[data-p="ps-pick"][data-v="chime"]'); await L.settle(p, 600);
  await L.adminTab(p, 'people');
  await p.fill('[data-a="name"][data-i="2"]', 'Bo B'); await L.settle(p, 200);
  await p.click('[data-p="a-save"]'); await L.settle(p, 800);
  s = await store(p);
  ok(s[CFG].people[2].name === 'Bo B' && s[CFG].pingSound === 'chime', 'admin: the People save keeps the ping sound (' + s[CFG].pingSound + ')');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a staff phone: tapped once, then a 15:00 ping pops up with the head chef's sound (Order up: two rings of the bell)
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, init: listen, extra: withSound('order', ping('n1', 'Fryer oil change before service', { tm: 900 })), wait: 2000 });
  await p.tap('#rtitle'); await L.settle(p, 200);
  await p.evaluate(() => { window.__osc = []; });
  ok(await p.$('.nt') === null, 'staff: no popup before the ping\'s time');
  await p.clock.runFor(61 * 60000); await L.settle(p, 400);
  await L.waitFor(p, () => !!document.querySelector('.nt')).catch(() => {});
  await waitHeard(p, 10);
  h = await heard(p);
  ok(!!(await p.$('.nt')) && count(h, BELL) === ORDER.length, 'staff: the ping pops up at 15:00 and Order up rings twice (' + h.join(', ') + ')');
  await p.evaluate(() => { window.__osc = []; });
  await p.tap('.nt-got'); await L.settle(p, 200);
  await p.clock.runFor(5 * 60000); await L.settle(p, 300);
  ok((await heard(p)).length === 0, 'staff: after Got it the minute tick plays nothing more');
  await p.tap('.nbell'); await L.settle(p, 300);
  ok(!!(await p.$('.nt')) && (await heard(p)).length === 0, 'staff: opening the pings from the bell plays nothing');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Off: the ping still pops up, with no sound
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, init: listen, extra: withSound('off', ping('n2', 'Delivery at the back door', { tm: 900 })), wait: 2000 });
  await p.tap('#rtitle'); await L.settle(p, 200);
  await p.evaluate(() => { window.__osc = []; });
  await p.clock.runFor(61 * 60000); await L.settle(p, 400);
  await L.waitFor(p, () => !!document.querySelector('.nt')).catch(() => {});
  await L.settle(p, 400);
  ok(!!(await p.$('.nt')) && (await heard(p)).length === 0, 'Off: the ping pops up with no sound');
  ok(p.errors.length === 0, 'Off: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the start of a shift with an unread ping rings too, and a value that is not one of the sounds (it comes from
  // Firestore) plays the Pass bell (the test browser lets a page play sound before a tap)
  p = await L.open(b, '#/prep', { who: 'ann', touch: true, board: true, init: listen, extra: withSound('<b>loud</b>', ping('n3', 'Safety: walk-in door sticks', { tag: 'safety', tm: 835 })), wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt')).catch(() => {});
  await waitHeard(p, 5);
  h = await heard(p);
  ok(/walk-in door/.test(await txt(p, '.nt') || '') && count(h, BELL) === 1 && count(h, TIMER) === 0, 'start of shift: the sheet comes up with the ping, and an unknown sound from Firestore plays the Pass bell once (' + h.join(', ') + ')');
  await p.evaluate(() => { window.__osc = []; });
  await p.tap('.nt-got'); await L.settle(p, 200);
  await p.clock.runFor(3 * 60000); await L.settle(p, 300);
  ok((await heard(p)).length === 0 && await p.$('.nt') === null, 'start of shift: Got it, and nothing rings again');
  ok(p.errors.length === 0, 'start of shift: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a sous chef writes pings but does not pick the sound (the rules let only the head chef's Google account save it)
  p = await L.open(b, '#/prep', { who: 'sam', wait: 2000 });
  await L.chef(p, 'pings'); await L.settle(p, 400);
  ok(!!(await p.$('[data-p="n-new"]')) && !(await p.$('.ps-block')), 'sous chef: Shift pings has no Ping sound block');
  await p.context().close();

  // One sound for the whole kitchen (head chef, 3 Nov 2026): the head chef's PIN on a phone that is not their Google
  // admin device writes pings but cannot pick the sound either, and no Settings page offers a sound of its own
  p = await L.open(b, '#/prep', { admin: true, ownerGoogle: false, wait: 2000 });
  await L.chef(p, 'pings'); await L.settle(p, 400);
  ok(!!(await p.$('[data-p="n-new"]')) && !(await p.$('.ps-block')), 'head chef on a PIN only: Shift pings has no Ping sound block');
  await p.context().close();
  for (const who of ['ann', 'sam']) {
    p = await L.open(b, '#/settings', { who, wait: 1500 });
    const t = await p.evaluate(() => (document.querySelector('#main') || document.body).textContent);
    ok(!/sound|ring ?tone/i.test(t) && !(await p.$('.ps-block, [data-p^="ps-"]')), who + ': Settings has no ping sound of its own');
    await p.context().close();
  }

  // every phone plays the head chef's sound, and a new pick reaches a phone already open without a reload
  p = await L.open(b, '#/prep', { who: 'sam', touch: true, init: listen, extra: withSound('marimba', Object.assign(ping('n4', 'Briefing at the pass', { tm: 900 }), ping('n5', 'Fryer oil change', { tm: 940 }))), wait: 2000 });
  await p.tap('#rtitle'); await L.settle(p, 200);
  await p.evaluate(() => { window.__osc = []; });
  await p.clock.runFor(61 * 60000); await L.settle(p, 400);
  await L.waitFor(p, () => !!document.querySelector('.nt')).catch(() => {});
  await waitHeard(p, 3);
  h = await heard(p);
  ok(MARIMBA.every(f => count(h, f) === 1) && count(h, TIMER) === 0, 'sous chef phone: the 15:00 ping plays the head chef\'s Marimba (' + h.join(', ') + ')');
  await p.tap('.nt-got'); await L.settle(p, 200);
  await p.evaluate(k => { const d = window.__fake.dump(); window.__fake.write(k, Object.assign({}, d[k], { pingSound: 'timer' })); }, CFG);
  await L.settle(p, 400);
  await p.evaluate(() => { window.__osc = []; });
  await p.clock.runFor(40 * 60000); await L.settle(p, 400);
  await L.waitFor(p, () => /Fryer oil/.test((document.querySelector('.nt') || {}).textContent || '')).catch(() => {});
  await waitHeard(p, 3);
  h = await heard(p);
  ok(count(h, TIMER) === 3 && MARIMBA.every(f => count(h, f) === 0), 'sous chef phone: after the head chef picks Oven timer, the 15:40 ping plays it with no reload (' + h.join(', ') + ')');
  ok(p.errors.length === 0, 'one sound: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // js/chime.js does not load: the admin tab says so, the People save keeps the sound as stored, pings still pop up
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'notes', extra: withSound('marimba'), block: 'js/chime\\.js', wait: 2000 });
  await L.adminTab(p, 'notes');
  await L.waitFor(p, () => !!document.querySelector('.ps-block'), null, 6000).catch(() => {});
  ok(/could not load/.test(await txt(p, '.ps-block') || '') && !(await p.$('.ps-pick')), 'no js/chime.js: the admin tab says the sounds could not load, with nothing to pick');
  await L.adminTab(p, 'people');
  await p.fill('[data-a="name"][data-i="2"]', 'Bo C'); await L.settle(p, 200);
  await p.click('[data-p="a-save"]'); await L.settle(p, 800);
  s = await store(p);
  ok(s[CFG].people[2].name === 'Bo C' && s[CFG].pingSound === 'marimba', 'no js/chime.js: the People save keeps the sound as stored (' + s[CFG].pingSound + ')');
  ok(p.errors.filter(e => !/chime\.js|ERR_FAILED|net::/.test(e)).length === 0, 'no js/chime.js: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
