// The order list learns what is ordered (like the prep list), and lines waiting more than 3 days sit together at the top
// with one line on what to do (23 Oct 2026: no separate "Still not ordered" card, which said the same again).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW));
const back = n => L.ymd(new Date(L.NOW - n * 86400000));
const dow = String(new Date(L.NOW).getDay());
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
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
  await L.settle(p, 200);
  ok(/Paper towels/.test(await txt(p, '#o-sugg')) && /6 rolls/.test(await txt(p, '#o-sugg')), 'typing: a learned item is suggested with its usual amount');
  await L.clear(p, '#o-text');
  await p.click('#o-text');
  await p.keyboard.type('Paper towels');
  await L.settle(p, 200);
  // the usual amount fills in by itself once the name is typed in full (22 Oct 2026, review F2), and the hint says so
  ok(await p.inputValue('#o-qty') === '6 rolls' && /Usual amount filled in: 6 rolls/.test(await txt(p, '#o-hint') || ''), 'typing the full name: the usual amount fills in and the hint says so');
  await p.keyboard.type(' XL'); await L.settle(p, 150);
  ok(await p.inputValue('#o-qty') === '', 'a name that no longer matches takes the filled amount away');
  await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace'); await p.keyboard.press('Backspace'); await L.settle(p, 150);
  ok(await p.inputValue('#o-qty') === '6 rolls', 'back to the name: it fills again');
  await p.press('#o-text', 'Enter');
  await L.settle(p, 400);
  // the server learns at night: the phone writes nothing to what was learned, but its own suggestions already know
  // an amount a person typed is never changed by the fill
  await p.fill('#o-qty', '3 rolls'); await p.click('#o-text'); await p.keyboard.press('End'); await p.keyboard.type(' '); await p.keyboard.press('Backspace'); await L.settle(p, 150);
  ok(await p.inputValue('#o-qty') === '3 rolls', 'a typed amount stays as typed');
  await L.clear(p, '#o-text'); await L.clear(p, '#o-qty');
  await p.fill('#o-text', 'Star anise');
  await p.fill('#o-qty', '100 g');
  await p.press('#o-text', 'Enter');
  await L.settle(p, 400);
  const lw = await p.evaluate(() => window.__fake.writes.filter(w => w.some(o => /\/(ordlearned|learned|learnlog)\//.test(o.path))).length);
  ok(lw === 0, 'adding lines writes nothing to what was learned (the server does it at night)');
  ok(await p.evaluate(() => { const e = (window.LK_PREP.state.ordLearned || []).find(x => x.id === 'paper-towels'); return e && e.uses === 10 && e.qtys['6-rolls'].n === 6; }), 'this phone keeps its own copy in step for suggestions');
  ok(p.errors.length === 0, 'learning: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // no catch-up on the phone any more: past days are learned by the server
  p = await L.open(b, '#/orders', { wait: 1500, extra });
  await L.settle(p, 10000);
  const bw = await p.evaluate(() => window.__fake.writes.filter(w => w.some(o => /\/(ordlearned|learned|learnlog)\//.test(o.path))).length);
  ok(bw === 0, 'background: the phone does not learn past days (' + bw + ' writes)');
  ok(p.errors.length === 0, 'background: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // lines waiting more than 3 days: grouped at the top, with what to do
  const od = Object.assign({}, extra);
  od[fsKey(['orders', today, 'lines', 'r1'])] = { text: 'Vanilla pods', qty: '10', recipes: [], addedBy: 'Rolled over', addedById: '', addedAt: L.NOW - 3600000, ordered: false, deleted: false, rolled: 5, root: 'v1', from: 'v0', rolledFrom: back(1), since: back(5), origBy: 'Ann' };
  od[fsKey(['orders', today, 'lines', 'r2'])] = { text: 'Rice paper', qty: '', recipes: [], addedBy: 'Rolled over', addedById: '', addedAt: L.NOW - 3600000, ordered: false, deleted: false, rolled: 2, root: 'x1', from: 'x0', rolledFrom: back(1), since: back(2), origBy: 'Ann' };
  p = await L.open(b, '#/orders', { wait: 1500, extra: od });
  ok(/Vanilla pods/.test(await txt(p, '#o-overdue')) && /5 days ago/.test(await txt(p, '#o-overdue')), 'overdue: a line waiting 5 days sits in the overdue block with its day');
  ok(!/Rice paper/.test(await txt(p, '#o-overdue')) && /Rice paper/.test(await txt(p, '.o-main')), 'overdue: a line waiting 2 days stays in the normal list');
  ok(/Order them today, or remove what is not needed any more/.test(await txt(p, '#o-overdue')), 'overdue: the sous chef is told to order them or remove them');
  ok(await p.$('.o-nudge') === null && await p.$('[data-p="onudge-show"]') === null, 'overdue: no separate Still not ordered card');
  const since = await p.evaluate(() => [...document.querySelectorAll('.o-main .nb-roll')].map(e => (e.closest('#o-overdue') ? 'overdue ' : 'list ') + (e.getClientRects().length ? 'shown' : 'hidden')));
  ok(since.indexOf('overdue hidden') >= 0 && since.indexOf('overdue shown') < 0 && since.indexOf('list shown') >= 0, 'overdue: the day heading says since when, so the row leaves out its Since badge; the normal list keeps it (' + since.join(', ') + ')');
  ok(!(await L.overflow(p)), 'overdue: no sideways scroll at 390 px');
  ok(p.errors.length === 0, 'overdue: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/orders', { who: 'ann', wait: 1500, extra: od });
  ok(/Vanilla pods/.test(await txt(p, '#o-overdue')) && /Tell the head chef or a sous chef/.test(await txt(p, '#o-overdue')), 'overdue: staff are told to tell the head chef or a sous chef');
  ok(p.errors.length === 0, 'overdue, staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
