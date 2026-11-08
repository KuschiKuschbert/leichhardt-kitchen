// Text on screen (coding rules, 22 Oct 2026): everything a person typed or Firestore holds is shown as plain text. Each
// record below carries a booby-trapped line, as another phone (or a damaged record) could have saved it, and every page
// that shows it must show the words and add no markup: no <i id="pwn">, no img with onerror, no attribute broken open.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const P = 'Zz<i id="pwn"></i><img src=x onerror="window.__pwn=1">" data-pwn="1 \'Zz';
const extra = {};
extra[fsKey(['deliveries', 'bad-delivery'])] = { day: today, receivedAt: L.NOW - 60000, recordedAt: L.NOW, supplier: 'Delivery ' + P, chilled: 0, frozen: -18.5, note: 'Goods ' + P, receivedBy: 'Receiver ' + P, receivedById: 'ann', by: 'ann' };
extra[fsKey(['days', today, 'items', 'x1'])] = { text: 'Line ' + P, station: 'Larder' + P, qty: '2' + P, recipe: '', addedBy: 'Ann' + P, addedById: 'ann', addedAt: L.NOW - 600000, done: false, deleted: false, onBy: 'Bo' + P, onById: 'bo', onAt: L.NOW - 60000 };
extra[fsKey(['orders', today, 'lines', 'x1'])] = { text: 'Order ' + P, qty: '1' + P, need: 'out' + P, recipes: [], addedBy: 'Ann' + P, addedById: 'ann', addedAt: L.NOW - 600000, ordered: false, deleted: false };
extra[fsKey(['waste', today, 'lines', 'x1'])] = { text: 'Waste ' + P, amount: 1, unit: 'kg', reason: 'prep', action: 'Act ' + P, station: 'Sec' + P, addedBy: 'Bo' + P, addedById: 'bo', addedAt: L.NOW - 600000, deleted: false,
  // Change amount (4 Nov 2026): the amount before and who changed it, shown in the admin log; a damaged unit too
  was: { amount: 2, unit: 'kg' + P }, chgBy: 'Chg' + P, chgAt: L.NOW - 300000 };
// transfers between venues (23 Oct 2026): every word, and a way and a unit as a damaged record could hold them; the nightly summary too
extra[fsKey(['transfers', today, 'lines', 'x1'])] = { dir: 'out" data-pwn="1', venue: 'Venue ' + P, person: 'Who ' + P, text: 'Transfer ' + P, amount: 1, unit: 'kg' + P, note: 'Note ' + P, addedBy: 'Bo' + P, addedById: 'bo', addedAt: L.NOW - 600000, deleted: false , was: { amount: 2, unit: 'kg' + P }, chgBy: 'Chg' + P, chgAt: L.NOW - 300000 };
extra[fsKey(['summary', 'transfers'])] = { day: today, from: today, to: today, venues: [{ v: 'Venue ' + P, n: 3, out: 3, in: 0, people: ['Who ' + P, 'Pal ' + P] }],
  items: [{ t: 'Taken ' + P, n: 3, unit: 'kg" data-pwn="1', amt: '2" data-pwn="1', dir: 'out', venue: 'Venue ' + P }] };
extra[fsKey(['waste', today])] = { avoidable: 'Avoid ' + P, change: 'Change ' + P, reviewBy: 'Sam' + P, reviewAt: L.NOW - 300000 };
extra[fsKey(['notes', 'x1'])] = { text: 'Ping ' + P, tag: 'none', start: today, until: today, dows: [], tm: 835, removed: false, by: 'sam', author: 'sam' };
extra[fsKey(['mail', 'x1'])] = { from: 'ann', by: 'ann', cat: 'equipment', pri: 'today', text: 'Mail ' + P, at: L.NOW - 3600000, done: false, seen: false };
extra[fsKey(['mailstat', 'x1'])] = { seen: false, done: false, by: 'ann' };
// the chef to-do list (23 Oct 2026): the words, and a who-for and a due day as a damaged record could hold them
extra[fsKey(['todos', 'x1'])] = { text: 'Todo ' + P, st: 'open', due: '2026-10-30" data-pwn="1', for: 'sam" data-pwn="1', from: 'sam', at: L.NOW - 3600000, doneAt: 0, doneBy: '', upd: L.NOW - 3600000, by: 'sam' };
extra[fsKey(['todos', 'x2'])] = { text: 'Done ' + P, st: 'done', due: '', for: '', from: 'x" data-pwn="1', at: L.NOW - 7200000, doneAt: L.NOW - 3600000, doneBy: 'y" data-pwn="1', upd: L.NOW - 3600000, by: 'sam' };
extra[fsKey(['drinks', 'ann'])] = { kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: 'Note ' + P, other: 'Other ' + P, at: L.NOW - 86400000, by: 'ann' };
extra[fsKey(['guides', 'x1'])] = { title: 'Guide ' + P, cat: 'cleaning', sum: 'Sum ' + P, steps: 'Step ' + P, kw: '', text: '', thumb: '', pages: 0, dims: [], v: 1, file: '', removed: false, at: L.NOW - 86400000, upd: L.NOW - 86400000 };
extra[fsKey(['sections', 'x1'])] = { name: 'Section ' + P, uses: 3, hidden: false };
// Cleaning keeps immutable task wording, area/section names and the completion's worker snapshot as plain text.
extra[fsKey(['cleaningTasks', 'x1'])] = { root: 'x1', prev: '', next: '', text: 'Cleaning ' + P, area: 'Area ' + P,
  section: 'x1', sectionName: 'Section ' + P, shared: false, dows: [0, 1, 2, 3, 4, 5, 6], guide: 'guide" data-pwn="1',
  from: Date.parse(today + 'T00:00:00+10:00'), until: 253402178400000, at: L.NOW - 600000, by: 'sam' };
extra[fsKey(['cleaningDone', today + '_x1'])] = { day: today, task: 'x1', version: 1, done: true, doneAt: L.NOW - 60000,
  doneById: 'ann', doneBy: 'Recorder ' + P, workerId: 'ann', worker: 'Worker ' + P, by: 'ann' };
Object.assign(extra, L.wasteSum([{ t: 'Often ' + P, n: 3, r: { prep: 3 }, unit: 'kg', reason: 'prep', sec: 'Sec' + P, amt: 1, last: { unit: 'kg', reason: 'prep', sec: 'Sec' + P, amt: 1 } }]));

// what a page must not have: the marker element, an injected image, an attribute broken out of its quotes, the handler run
const bad = p => p.evaluate(() => ({ i: document.querySelectorAll('#pwn').length, img: document.querySelectorAll('img[src="x"]').length, attr: document.querySelectorAll('[data-pwn]').length, run: !!window.__pwn }));
const clean = b => !b.i && !b.img && !b.attr && !b.run;
async function check(b, hash, o, name, see, then) {
  const p = await L.open(b, hash, Object.assign({ extra, wait: 2000 }, o));
  if (then) await then(p);
  await L.settle(p, 800);
  const r = await bad(p), text = await p.evaluate(() => document.body.innerText);
  ok(clean(r), name + ': no markup added (' + JSON.stringify(r) + ')');
  if (see) ok(text.indexOf(see + ' Zz<i id="pwn">') >= 0, name + ': the words show as typed');
  ok(p.errors.length === 0, name + ': no page errors ' + p.errors.join(' | '));
  await p.context().close();
}
(async () => {
  const b = await L.start();
  await check(b, '#/prep', { who: 'ann' }, 'prep list', 'Line');
  await check(b, '#/orders', { who: 'ann' }, 'order list', 'Order');
  await check(b, '#/waste', { who: 'sam' }, 'wastage', 'Waste', async p => { await L.wLog(p); await p.fill('#w-text', 'Of'); await L.settle(p, 300); });
  await check(b, '#/transfers', { who: 'sam' }, 'transfers', 'Transfer', async p => {
    // the venue chip (from the line and the summary), then who came for it and what they often take, then a suggestion while typing
    await L.waitFor(p, () => !!document.querySelector('[data-p="tr-log"]'), null, 5000).catch(() => {}); await L.xLog(p);
    await L.waitFor(p, () => !!document.querySelector('[data-p="tr-vpick"]'), null, 5000).catch(() => {});
    // a click in the page, not a pointer tap: today's booby-trapped ping pops up over it
    await p.evaluate(() => document.querySelector('[data-p="tr-vpick"]').click()); await L.settle(p, 300);
    await p.evaluate(() => { const o = document.querySelector('[data-p="tr-often"]'); if (o) o.click(); }); await L.settle(p, 300);
    await p.fill('#tr-text', 'Ta'); await L.settle(p, 300);
  });
  await check(b, '#/deliveries', { who: 'ann' }, 'deliveries', 'Delivery');
  await check(b, '#/cleaning', { who: 'sam' }, 'cleaning', 'Cleaning', async p => {
    await L.waitFor(p, () => !!document.querySelector('.cln-row'));
    const words = await L.txt(p, '.cln-page');
    ok(words.includes('Area ' + P) && words.includes('Worker ' + P) && words.includes('Section ' + P), 'cleaning: area, worker and responsible section remain literal text');
    await L.tap(p, '[data-cln="setup"]'); await L.tap(p, '[data-cln="edit"][data-id="x1"]');
    ok(await p.inputValue('#cln-text') === 'Cleaning ' + P && await p.inputValue('#cln-area') === 'Area ' + P, 'cleaning editor: saved text and area remain literal input values');
  });
  await check(b, '#/drinks', { who: 'sam' }, 'drinks run', null);
  await check(b, '#/todo', { who: 'sam' }, 'chef to-do', 'Todo', async p => { await L.waitFor(p, () => !!document.querySelector('.todo-row'), null, 5000).catch(() => {}); await L.tap(p, '.todo-donebox summary'); await L.waitFor(p, () => !!document.querySelector('[data-lv="tododone"] .todo-row'), null, 5000).catch(() => {}); });
  await check(b, '#/guides', { who: 'ann' }, 'guides', 'Guide');
  await check(b, '#/guides/x1', { who: 'ann' }, 'a guide', 'Step');
  // a cut-off's name (typed by the head chef) on the bar and on the card for a cut-off with no catalogue supplier (27 Oct 2026)
  const F = require('./supplier-fixtures'), cx = Object.assign({}, extra, F.fixture());
  cx[F.key(['config', 'main'])].cutoffs = [{ id: 'veg', name: 'Cut ' + P, dd: [(new Date(L.NOW).getDay() + 1) % 7], at: 15 * 60, pre: 1, lead: 240 }];
  await check(b, '#/suppliers/cutoff/veg/' + today, { who: 'sam', extra: cx }, 'unlinked cut-off card', 'Cut', async p => {
    await L.waitFor(p, () => !!document.querySelector('.su-cut-card'), null, 10000).catch(() => {});
    ok(!!(await p.$('.su-cut-card')) && /Cut Zz<i id="pwn">/i.test(await p.textContent('.su-cut-card')), 'unlinked cut-off card: the card shows the name as typed');
  });
  for (const t of ['waste', 'transfers', 'notes', 'mail', 'people', 'insights']) {
    await check(b, '#/admin', { admin: true, who: '' }, 'admin ' + t, t === 'waste' ? 'Waste' : t === 'transfers' ? 'Transfer' : t === 'notes' ? 'Ping' : t === 'mail' ? 'Mail' : null, async p => { await L.adminTab(p, t); });
  }
  // Today's team (7 Nov 2026): a shift and a section named with markup, on the staff side (the day line, Your day, the
  // chef hat) and on the chef's page
  const tmPeople = [{ id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true }, { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true }, { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }];
  const tx = Object.assign({}, extra, {
    [fsKey(['config', 'main'])]: { people: tmPeople, sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, kitSecs: [{ id: 'grill', name: 'Grill ' + P, off: false }], kitShifts: [{ id: 'lunch', name: 'Shift ' + P, from: 600, to: 900, off: false }, { id: 'dinner', name: 'Late ' + P, from: 960, to: 1320, off: false }] },
    [fsKey(['team', today])]: { day: today, on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'dinner', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'grill' }], br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }, { id: 'bo', sh: 'lunch', at: 825, len: 45 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' }
  });
  await check(b, '#/prep', { who: 'ann', extra: tx }, 'staff day line and Your day', 'Shift', async p => {
    await L.waitFor(p, () => !!document.querySelector('.wtop .tm-slot .tm-chip'), null, 8000).catch(() => {});
    // today's booby-trapped ping comes up first: closed, then the chip
    await p.evaluate(() => { const x = document.querySelector('.nt-wrap:not(.tm-dw) [data-note="dismiss"]'); if (x) x.click(); }); await L.settle(p, 400);
    await p.click('.wtop .tm-slot .tm-chip'); await L.settle(p, 300);
    ok(/Shift Zz<i id="pwn">/.test(await p.textContent('.tm-dw') || ''), 'Your day: the shift name shows as typed');
    await p.keyboard.press('Escape'); await L.settle(p, 300);
    await p.click('.wtop-who'); await L.settle(p, 300);
  });
  await check(b, '#/team', { who: 'sam', extra: tx }, 'chef\'s Today\'s team', 'Shift');
  // the drawing editor: a damaged drawing record with markup in its colours and anchors (the head chef's own drawing)
  const P2 = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
  const dx = {
    [fsKey(['config', 'main'])]: { people: [P2('sam', 'Sam', 'sous'), P2('ann', 'Ann', 'head'), P2('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true },
    [fsKey(['drawings', 'bad1'])]: { rid: 'burger', slot: 'plate', name: 'Bad', v: 1, surf: { fam: 'none' }, defs: '{}', svgS: '', svgF: '', els: [
      { t: 'text', s: 'Hi', x: 0, y: 0, size: 10, col: '"/><i id="pwn"></i><x y="', anchor: 'start" data-pwn="1' },
      { t: 'line', pts: '0,0 10,10', col: 'red"><i id="pwn"></i><x y="', w: 1 },
      { t: 'rect', x: 0, y: 0, w: 10, h: 10, fill: '"><i id="pwn"></i>', stroke: 'x" data-pwn="1' },
      { t: 'ellipse', x: 20, y: 0, w: 10, h: 10, fill: 'url(#x)" data-pwn="1', stroke: '#123' }
    ] }
  };
  const pd = await L.open(b, '#/manage/draw/bad1', { who: 'ann', extra: dx, wait: 1500, width: 1280, height: 900 });
  await L.waitFor(pd, () => !!document.querySelector('.dw-svg'), null, 15000);
  await L.settle(pd, 600);
  const rd = await bad(pd);
  ok(clean(rd), 'drawing editor: markup in a saved colour or anchor is not added to the drawing (' + JSON.stringify(rd) + ')');
  ok(await pd.evaluate(() => !!document.querySelector('.dw-svg rect[stroke="#1C1D1F"]') && !!document.querySelector('.dw-svg ellipse[stroke="#123"]')), 'drawing editor: a bad colour falls back to the default, a good one is kept');
  ok(pd.errors.length === 0, 'drawing editor: no page errors ' + pd.errors.join(' | '));
  await pd.context().close();

  await b.close();
  L.report(R);
})();
