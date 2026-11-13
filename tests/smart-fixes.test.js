// The smarter book's fixes (head chef, 14 Nov 2026: "Yes yes", docs/smart-book-options/brief.md, I2, E1, R4):
// an open order request is not added a second time (Add anyway on the slip); every suggestion is counted, with "changed
// after the guess"; the Transfers report and its CSV keep a loan older than its days; the Insights CSV has On it.
// On the code before this, a second Milk went on the list with nothing said, and the old loan was only in the Inbox.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), old = L.ymd(new Date(L.NOW - 45 * 86400000));
const loan = { dir: 'out', venue: 'Riviera', person: 'Jo', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - 45 * 86400000, deleted: false, by: 'bo' };
const extra = Object.assign({
  [fsKey(['transfers', old, 'lines', 'loan'])]: loan,
  [fsKey(['transferOpen', old + '_loan'])]: { date: old, lineId: 'loan', record: loan, open: true }
}, L.wasteSum([{ t: 'Rice', n: 2, r: { expired: 2 }, unit: 'portions', reason: 'expired', sec: 'Pans', amt: 4, last: { unit: 'portions', reason: 'expired', sec: 'Pans', amt: 4 } }]));
const orderLines = (p, t) => p.evaluate(a => Object.entries(window.__fake.dump()).filter(([k, v]) => k.indexOf('/orders/' + a.d + '/lines/') > 0 && v.text === a.t && !v.deleted).length, { d: today, t });
const daily = p => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('lk.daily') || '{}').sg || {}; } catch (e) { return {}; } });
const csv = async (p, sel) => { const pending = p.waitForEvent('download'); await p.evaluate(s => document.querySelector(s).click(), sel); const f = await pending, c = []; for await (const x of await f.createReadStream()) c.push(x); return Buffer.concat(c).toString('utf8'); };
(async () => {
  const b = await L.start();

  // 1. Orders: Milk (6 L, Ann) is open today; typing Milk again does not add it, the slip says so with Add anyway
  let p = await L.open(b, '#/orders', { who: 'bo', extra, wait: 1500, touch: true });
  await L.oLog(p);
  await p.fill('#o-text', 'Milk'); await p.click('.o-sheet .nb-addbtn'); await L.settle(p, 300);
  const slip = await L.txt(p, '.p-toast') || '';
  ok(await orderLines(p, 'Milk') === 1 && /^Milk is already on the list \(6 L, Ann\)\./.test(slip), 'orders: Milk again is not added; the slip says it is on the list (' + slip + ')');
  await p.evaluate(() => { const b = [...document.querySelectorAll('.p-toast button')].find(x => /Add anyway/.test(x.textContent)); if (b) b.click(); }); await L.settle(p, 400);
  ok(await orderLines(p, 'Milk') === 2, 'orders: Add anyway adds it');
  await p.fill('#o-text', 'Milk bun'); await p.click('.o-sheet .nb-addbtn'); await L.settle(p, 300);
  ok(await orderLines(p, 'Milk bun') === 1, 'orders: Milk bun is its own item and is added');
  await p.fill('#o-text', 'Brioche buns'); await p.fill('#o-qty', '10 packs'); await p.click('.o-sheet .nb-addbtn'); await L.settle(p, 300);
  ok(await orderLines(p, 'Brioche buns') === 2, 'orders: the same item with a different amount is added');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. counting: the wastage fill shown, changed after the guess, and taken when logged
  p = await L.open(b, '#/waste', { who: 'bo', extra, wait: 1500, touch: true });
  await L.wLog(p);
  await p.fill('#w-text', 'Rice'); await p.evaluate(() => { const el = document.querySelector('#w-text'); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); }); await L.settle(p, 200);
  await p.click('[data-p="wreason"][data-v="excess"]'); await L.settle(p, 200);
  await p.fill('#w-amt', '1'); await p.click('.w-add .nb-addbtn'); await L.settle(p, 300);
  let sg = await daily(p);
  ok(sg.wfill && sg.wfill.s === 1 && sg.wfill.e === 1 && sg.wfill.t === 1, 'counted: the fill shown, a filled reason changed, logged with the fill (' + JSON.stringify(sg.wfill) + ')');
  await p.click('[data-p="woften"]').catch(() => {}); await L.settle(p, 200);
  sg = await daily(p);
  ok(sg.wchip && sg.wchip.s === 1 && sg.wchip.t === 1, 'counted: Logged often shown and taken (' + JSON.stringify(sg.wchip) + ')');
  ok(Object.keys(sg).length <= 12, 'at most 12 features a day, as the rules allow (' + Object.keys(sg).join(', ') + ')');
  await p.context().close();

  // 3. the Transfers report keeps a loan older than its days, and its CSV has it
  p = await L.open(b, '#/admin', { admin: true, extra, width: 1280, height: 900, wait: 2500 });
  await L.adminTab(p, 'transfers');
  await L.waitFor(p, () => /Still out from before these days/.test(document.querySelector('.a-pane').textContent), null, 6000).catch(() => {});
  const pane = await L.txt(p, '.a-pane') || '';
  ok(/Still out from before these days/.test(pane) && /Riviera took 2 kg Butter/.test(pane), 'transfers report: a loan from 45 days ago is still listed');
  await p.evaluate(() => { const m = document.querySelector('[data-p="csv"][data-v="transfers"]'); if (m && m.closest('details')) m.closest('details').open = true; });
  const xcsv = await csv(p, '[data-p="csv"][data-v="transfers"]');
  ok(/Butter/.test(xcsv) && /No, still out \(before these days\)/.test(xcsv), 'transfers CSV: the old loan is in it, marked still out');
  await L.adminTab(p, 'insights'); await L.settle(p, 600);
  const icsv = await csv(p, '[data-p="csv"][data-v="insights"]');
  ok(/On it by,On it at,Minutes from On it to tick/.test(icsv.split(/\r?\n/)[0]), 'insights CSV: On it columns (' + icsv.split(/\r?\n/)[0].slice(-60) + ')');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  L.report(R); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
