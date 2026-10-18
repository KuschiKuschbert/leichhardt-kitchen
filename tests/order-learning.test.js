// The order list learns what is ordered (like the prep list) and nudges about lines waiting more than 3 days.
const L = require('./lib');
const R = [];
const ok = (c, m) => L.check(c, m, R);
const today = L.ymd(new Date(L.NOW));
const back = n => L.ymd(new Date(L.NOW - n * 86400000));
const dow = String(new Date(L.NOW).getDay());
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const txt = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent : ''; }, sel);
(async () => {
  const b = await L.start();
  let p, s;
  const extra = {};
  const dw = {}; dw[dow] = 4;
  extra[fsKey(['ordlearned', 'paper-towels'])] = { text: 'Paper towels', uses: 9, dow: {}, qtys: { '6-rolls': { q: '6 rolls', n: 5 } } };
  extra[fsKey(['ordlearned', 'lemons'])] = { text: 'Lemons', uses: 12, dow: dw, qtys: { '2-kg': { q: '2 kg', n: 6 } } };
  extra[fsKey(['ordlearned', 'old-thing'])] = { text: 'Old thing', uses: 20, dow: dw, qtys: {}, hidden: true };
  extra[fsKey(['orders', back(20), 'lines', 's1'])] = { text: 'Saffron', qty: '1 g', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 20 * 86400000, ordered: true, deleted: false };

  // suggestions and usual amounts from what was learned
  p = await L.open(b, '#/orders', { who: 'ann', wait: 1800, extra });
  ok(/Lemons/.test(await txt(p, '.w-often')) && /2 kg/.test(await txt(p, '.w-often')), 'regulars: an item learned on this weekday is suggested, with its usual amount');
  ok(!/Old thing/.test(await txt(p, '.w-often')), 'regulars: a hidden learned item is not suggested');
  await p.click('#o-text');
  await p.keyboard.type('pap');
  await p.waitForTimeout(200);
  ok(/Paper towels/.test(await txt(p, '#o-sugg')) && /6 rolls/.test(await txt(p, '#o-sugg')), 'typing: a learned item is suggested with its usual amount');
  await p.fill('#o-text', '');
  await p.click('#o-text');
  await p.keyboard.type('Paper towels');
  await p.waitForTimeout(200);
  ok(await p.$('[data-p="oqset"][data-v="6 rolls"]') !== null, 'typing the full name: a Usual amount chip shows');
  await p.click('[data-p="oqset"][data-v="6 rolls"]');
  await p.waitForTimeout(150);
  ok(await p.inputValue('#o-qty') === '6 rolls', 'Usual amount chip fills the amount');
  await p.press('#o-text', 'Enter');
  await p.waitForTimeout(400);
  s = await store(p);
  const pt = s[fsKey(['ordlearned', 'paper-towels'])];
  ok(pt && pt.uses === 10 && pt.qtys['6-rolls'].n === 6 && pt.dow[dow] === 1, 'adding a line adds to what was learned');
  await p.fill('#o-text', 'Star anise');
  await p.fill('#o-qty', '100 g');
  await p.press('#o-text', 'Enter');
  await p.waitForTimeout(400);
  s = await store(p);
  ok(s[fsKey(['ordlearned', 'star-anise'])] && s[fsKey(['ordlearned', 'star-anise'])].uses === 1, 'a new item is learned the first time');
  ok(p.errors.length === 0, 'learning: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // past order days are learned once in the background
  p = await L.open(b, '#/orders', { wait: 1500, extra });
  await p.waitForFunction(k => !!window.__fake.dump()[k], fsKey(['ordlearned', 'saffron']), { timeout: 15000 }).catch(() => {});
  s = await store(p);
  ok(s[fsKey(['ordlearned', 'saffron'])] && s[fsKey(['ordlearned', 'saffron'])].uses === 1, 'background: an item ordered 20 days ago is learned');
  ok(!!s[fsKey(['learnlog', 'o-' + back(20)])], 'background: the day is claimed, so it is never counted twice');
  ok(p.errors.length === 0, 'background: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // lines waiting more than 3 days: grouped at the top, nudge when the list opens
  const od = Object.assign({}, extra);
  od[fsKey(['orders', today, 'lines', 'r1'])] = { text: 'Vanilla pods', qty: '10', recipes: [], addedBy: 'Rolled over', addedById: '', addedAt: L.NOW - 3600000, ordered: false, deleted: false, rolled: 5, root: 'v1', from: 'v0', rolledFrom: back(1), since: back(5), origBy: 'Ann' };
  od[fsKey(['orders', today, 'lines', 'r2'])] = { text: 'Rice paper', qty: '', recipes: [], addedBy: 'Rolled over', addedById: '', addedAt: L.NOW - 3600000, ordered: false, deleted: false, rolled: 2, root: 'x1', from: 'x0', rolledFrom: back(1), since: back(2), origBy: 'Ann' };
  p = await L.open(b, '#/orders', { wait: 1500, extra: od });
  ok(/Vanilla pods/.test(await txt(p, '#o-overdue')) && /5 days ago/.test(await txt(p, '#o-overdue')), 'overdue: a line waiting 5 days sits in the overdue block with its day');
  ok(!/Rice paper/.test(await txt(p, '#o-overdue')) && /Rice paper/.test(await txt(p, '.o-main')), 'overdue: a line waiting 2 days stays in the normal list');
  ok(/1 item has waited more than 3 days/.test(await txt(p, '.o-nudge')), 'overdue: the nudge shows when the list opens');
  await p.click('[data-p="onudge-hide"]');
  await p.waitForTimeout(150);
  ok(await p.$('.o-nudge') === null, 'overdue: Hide for today hides the nudge');
  ok(!(await L.overflow(p)), 'overdue: no sideways scroll at 390 px');
  ok(p.errors.length === 0, 'overdue: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
