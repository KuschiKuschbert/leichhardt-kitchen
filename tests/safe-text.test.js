// Text on screen (coding rules, 22 Oct 2026): everything a person typed or Firestore holds is shown as plain text. Each
// record below carries a booby-trapped line, as another phone (or a damaged record) could have saved it, and every page
// that shows it must show the words and add no markup: no <i id="pwn">, no img with onerror, no attribute broken open.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const P = 'Zz<i id="pwn"></i><img src=x onerror="window.__pwn=1">" data-pwn="1 \'Zz';
const extra = {};
extra[fsKey(['days', today, 'items', 'x1'])] = { text: 'Line ' + P, station: 'Larder' + P, qty: '2' + P, recipe: '', addedBy: 'Ann' + P, addedById: 'ann', addedAt: L.NOW - 600000, done: false, deleted: false };
extra[fsKey(['orders', today, 'lines', 'x1'])] = { text: 'Order ' + P, qty: '1' + P, recipes: [], addedBy: 'Ann' + P, addedById: 'ann', addedAt: L.NOW - 600000, ordered: false, deleted: false };
extra[fsKey(['waste', today, 'lines', 'x1'])] = { text: 'Waste ' + P, amount: 1, unit: 'kg', reason: 'prep', action: 'Act ' + P, station: 'Sec' + P, addedBy: 'Bo' + P, addedById: 'bo', addedAt: L.NOW - 600000, deleted: false };
extra[fsKey(['waste', today])] = { avoidable: 'Avoid ' + P, change: 'Change ' + P, reviewBy: 'Sam' + P, reviewAt: L.NOW - 300000 };
extra[fsKey(['notes', 'x1'])] = { text: 'Ping ' + P, tag: 'none', start: today, until: today, dows: [], removed: false, by: 'sam', author: 'sam' };
extra[fsKey(['mail', 'x1'])] = { from: 'ann', by: 'ann', cat: 'equipment', pri: 'today', text: 'Mail ' + P, at: L.NOW - 3600000, done: false, seen: false };
extra[fsKey(['mailstat', 'x1'])] = { seen: false, done: false, by: 'ann' };
extra[fsKey(['drinks', 'ann'])] = { kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: 'Note ' + P, other: 'Other ' + P, at: L.NOW - 86400000, by: 'ann' };
extra[fsKey(['guides', 'x1'])] = { title: 'Guide ' + P, cat: 'cleaning', sum: 'Sum ' + P, steps: 'Step ' + P, kw: '', text: '', thumb: '', pages: 0, dims: [], v: 1, file: '', removed: false, at: L.NOW - 86400000, upd: L.NOW - 86400000 };
extra[fsKey(['sections', 'x1'])] = { name: 'Section ' + P, uses: 3, hidden: false };
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
  await check(b, '#/waste', { who: 'sam' }, 'wastage', 'Waste', async p => { await p.fill('#w-text', 'Of'); await L.settle(p, 300); });
  await check(b, '#/drinks', { who: 'sam' }, 'drinks run', null);
  await check(b, '#/guides', { who: 'ann' }, 'guides', 'Guide');
  await check(b, '#/guides/x1', { who: 'ann' }, 'a guide', 'Step');
  for (const t of ['waste', 'notes', 'mail', 'people', 'insights']) {
    await check(b, '#/admin', { admin: true, who: '' }, 'admin ' + t, t === 'waste' ? 'Waste' : t === 'notes' ? 'Ping' : t === 'mail' ? 'Mail' : null, async p => { await L.adminTab(p, t); });
  }
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
