// Read budget (coding rules, 22 Oct 2026): what each page open and each reload costs in Firestore reads, counted the way
// the real Firestore bills them (tests/fake: a getDoc is one read, a query one per document, at least one, a listener what
// it first sends; since 7 Nov 2026 also the records the rules look up for each request, __fake.ruleBill). The free plan
// stops the book for the day at 50,000 reads, so a change that goes over a budget here either reads less or raises the
// budget in the same pull request, with the reason.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
// a kitchen that has been running a while: 300 learned prep items, 80 learned order items, a week of prep, orders and
// wastage behind it, and the people's tallies
const extra = {};
for (let i = 0; i < 300; i++) extra[fsKey(['learned', 'item-' + i])] = { text: 'Item ' + i, uses: 300 - i, dow: {}, secs: {}, qtys: {}, hidden: false };
for (let i = 0; i < 80; i++) extra[fsKey(['ordlearned', 'ord-' + i])] = { text: 'Order ' + i, uses: 80 - i, dow: {}, qtys: {}, hidden: false };
for (let d = 1; d <= 7; d++) for (let i = 0; i < 20; i++) {
  extra[fsKey(['days', day(d), 'items', 'p' + d + '-' + i])] = { text: 'Line ' + i, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - d * 86400000, done: true, doneAt: L.NOW - d * 86400000 + 3600000, deleted: false };
  if (i < 5) extra[fsKey(['orders', day(d), 'lines', 'o' + d + '-' + i])] = { text: 'Milk ' + i, qty: '2 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - d * 86400000, ordered: true, deleted: false };
}
['sam', 'ann', 'bo'].forEach(id => { extra[fsKey(['activity', id])] = { name: id, added: 3, ticked: 4, visits: 5, lastSeen: L.NOW - 3600000 }; });

// the reads a page asked for and the records the rules looked up for them (tests/fake: ruleBill), in one list
const billed = p => p.evaluate(() => window.__fake.bill.concat((window.__fake.ruleBill || []).map(x => ({ kind: 'rules', path: 'rules', n: x.n }))));
const unbill = p => p.evaluate(() => { window.__fake.bill = []; window.__fake.ruleBill = []; });
const sum = b => b.reduce((t, x) => t + x.n, 0);
function top(b) {
  const m = {};
  b.forEach(x => { const k = x.kind + ' ' + x.path.replace(/^kitchens\/[^/]+\//, '').replace(/\d{4}-\d{2}-\d{2}/g, 'DAY').replace(/\/[^/]+$/, x.kind === 'get' ? '/ID' : '$&'); m[k] = (m[k] || 0) + x.n; });
  return Object.keys(m).sort((a, b2) => m[b2] - m[a]).slice(0, 8).map(k => k + ' ' + m[k]).join(', ');
}
async function measure(b, hash, o, settle) {
  const p = await L.open(b, hash, Object.assign({ extra, wait: 2500 }, o || {}));
  await L.settle(p, settle || 1500);
  return p;
}
async function reportData(p) {
  await L.waitFor(p, () => { const s = LK_PREP.state; return s.stats && !s.stats.loading && s.ordStats && !s.ordStats.loading; });
  return p.evaluate(() => {
    const s = LK_PREP.state;
    return {
      prep: Object.values(s.stats.days).flat().filter(x => /^Line \d+$/.test(x.text)).length,
      orders: (s.ordStats.raw || []).filter(x => /^Milk \d+$/.test(x.text)).length,
      missing: (s.stats.miss || []).length + (s.ordStats.miss || []).length
    };
  });
}
(async () => {
  const b = await L.start();
  // measured 22 Oct 2026 with this seed: first open 657 (277 once the nightly summaries exist), first open before them 655, reload 17, admin 699, admin again 27 (before: first open 775, the
  // rollover read seven past days the past-days list had just read; reload 317 and admin again 699, the learned list and
  // the admin's past days read again every time). RB_SHOW=1 prints what costs most.
  // Transfers (23 Oct 2026): first open 659, with the summaries 279, reload 19 (today's transfer list and its summary,
  // one read each), admin 732 (the Transfers page reads its 30 days once a day, one query per day, empty days included),
  // admin again 28. The admin budget went from 720 to 760 for those 30.
  // 2 Nov 2026: the stand-in now loses its read cache on reload, like the app's memoryLocalCache. Reopening reports
  // in this page remains cheap. A full reload must fetch the fixture's 140 past prep and 35 order records again:
  // 219 reads including current data/session/listeners, rather than the former fake-persistent result of 44. The 240
  // reload ceiling records that existing runtime cost; no production reads or private persistent cache were added.
  // 5 Nov 2026 (Plan B 2.2): with the day digests the first open reads 14 past days for 15 reads (the index and one
  // query) and each rollover reads only the last day written: firstDig is measured below.
  // 7 Nov 2026 (Plan B 2.7): the owner grant no longer starts the live lists again and the sections are read once a
  // day: admin 633 to 626, admin again 221 to 211, admin with the digests 143 to 136. This seed has 6 lines today and no
  // sections; tests/live-lists.test.js measures a real day (40 lines, 12 sections).
  // 7 Nov 2026 (Plan B 6.2): the records the rules look up are counted too, about 4 for each request from a phone with a
  // session (tests/fake: ruleBill). Measured with them: first open 923 (264 of them the rules'), with the summaries
  // 540, with the digests 203, reload 86, admin 1238 (612), admin again 347, admin with the digests 396, the
  // Proofreader 207 and Manage functions with 12 bookings ahead 97 (129 before the functions listener started only
  // once on an open, the same pull request). The budgets went up by those lookups, not by new reads: first 680 to 960, firstSum 300 to 580,
  // firstDig 300 to 240 (down, with the digests), reload 40 to 110, admin 760 to 1300, adminDig 760 to 440, admin2 240 to
  // 400; proof and fnManage are new.
  const BUDGET = { first: 960, firstSum: 580, firstDig: 240, reload: 110, admin: 1300, adminDig: 440, adminSamePage: 60, admin2: 400, proof: 260, fnManage: 140 };
  const show = !!process.env.RB_SHOW;

  // a staff phone opens the prep list for the first time today, then goes to orders, wastage and transfers
  let p = await measure(b, '#/prep', { who: 'ann' });
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 1200);
  await p.evaluate(() => { location.hash = '#/waste'; }); await L.settle(p, 1200);
  await p.evaluate(() => { location.hash = '#/transfers'; }); await L.settle(p, 1200);
  let bl = await billed(p);
  const first = sum(bl);
  if (show) console.log('first open: ' + first + ' (' + top(bl) + ')');
  // the same phone reloads (the 04:00 refresh, an update): what is kept for the day must not be read again
  await p.reload(); await L.settle(p, 2500);
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 1200);
  await p.evaluate(() => { location.hash = '#/waste'; }); await L.settle(p, 1200);
  await p.evaluate(() => { location.hash = '#/transfers'; }); await L.settle(p, 1200);
  bl = await billed(p);
  const reload = sum(bl);
  if (show) console.log('reload: ' + reload + ' (' + top(bl) + ')');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the same kitchen once the nightly job has written summary/learned and summary/ordlearned (22 Oct 2026): the phone reads
  // those two records instead of the 380 learned items
  const withSum = Object.assign({}, extra);
  withSum[fsKey(['summary', 'learned'])] = { day: day(0), items: Object.keys(extra).filter(k => /\/learned\//.test(k)).map(k => Object.assign({ id: k.split('/').pop() }, extra[k])) };
  withSum[fsKey(['summary', 'ordlearned'])] = { day: day(0), items: Object.keys(extra).filter(k => /\/ordlearned\//.test(k)).map(k => Object.assign({ id: k.split('/').pop() }, extra[k])) };
  p = await measure(b, '#/prep', { who: 'ann', extra: withSum });
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 1200);
  await p.evaluate(() => { location.hash = '#/waste'; }); await L.settle(p, 1200);
  await p.evaluate(() => { location.hash = '#/transfers'; }); await L.settle(p, 1200);
  bl = await billed(p);
  const firstSum = sum(bl);
  if (show) console.log('first open with the summaries: ' + firstSum + ' (' + top(bl) + ')');
  const learnedN = await p.evaluate(() => (window.LK_PREP.state.learned || []).length);
  ok(learnedN === 300, 'with the summaries: the phone still has all 300 learned items (' + learnedN + ')');
  ok(p.errors.length === 0, 'with the summaries: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // and once the 03:00 job has written the day digests too (Plan B 2.2, 5 Nov 2026): one record per past day with its
  // prep and order lines, so the hints read 14 past days for 15 reads instead of a query per day
  const withDig = Object.assign({}, withSum), digIndex = {};
  for (let d = 1; d <= 60; d++) {
    const lines = kind => Object.keys(extra).filter(k => k.indexOf('/' + kind + '/' + day(d) + '/') > 0).map(k => Object.assign({ id: k.split('/').pop() }, extra[k]));
    withDig[fsKey(['digest', day(d)])] = { v: 1, day: day(d), at: L.NOW - 11 * 3600000, prep: lines('days'), orders: lines('orders') };
    digIndex[day(d)] = 'fp' + d;
  }
  withDig[fsKey(['digest', '_index'])] = { v: 1, at: L.NOW - 11 * 3600000, days: digIndex };
  p = await measure(b, '#/prep', { who: 'ann', extra: withDig });
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 1200);
  await p.evaluate(() => { location.hash = '#/waste'; }); await L.settle(p, 1200);
  await p.evaluate(() => { location.hash = '#/transfers'; }); await L.settle(p, 1200);
  bl = await billed(p);
  const firstDig = sum(bl), pastLines = bl.filter(x => /\/(days|orders)\/\d{4}-\d{2}-\d{2}\//.test(x.path) && x.path.indexOf('/' + day(0) + '/') < 0);
  if (show) console.log('first open with the summaries and digests: ' + firstDig + ' (' + top(bl) + ')');
  ok(pastLines.length === 2, 'with the digests: the past lines read are the last written day\'s, once for each rollover (' + pastLines.map(x => x.path.split('/').slice(2, 4).join('/')).join(' ') + ')');
  const hints = await p.evaluate(() => ({ past: Object.keys(window.LK_PREP.state.past || {}).length, ord: (window.LK_PREP.state.ordHist || []).length }));
  ok(hints.past === 14 && hints.ord === 35, 'with the digests: the hints have 14 past days and 35 order lines (' + JSON.stringify(hints) + ')');
  ok(p.errors.length === 0, 'with the digests: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the head chef opens the admin panel (Insights, then Wastage, Transfers and Team)
  p = await measure(b, '#/admin', { admin: true, who: '' }, 2500);
  await L.adminTab(p, 'waste'); await L.settle(p, 1500);
  await L.adminTab(p, 'transfers'); await L.settle(p, 1500);
  await L.adminTab(p, 'team'); await L.settle(p, 1500);
  const beforeReturn = await reportData(p);
  bl = await billed(p);
  const admin = sum(bl);
  if (show) console.log('admin: ' + admin + ' (' + top(bl) + ')');
  ok(beforeReturn.prep === 140 && beforeReturn.orders === 35 && !beforeReturn.missing, 'first admin visit has all 140 seeded past prep lines and 35 order lines');
  // Another report visit without a reload uses this page's loaded data and memory cache.
  await unbill(p);
  await L.adminTab(p, 'insights'); await L.settle(p, 500);
  await L.adminTab(p, 'waste'); await L.settle(p, 500);
  await L.adminTab(p, 'transfers'); await L.settle(p, 500);
  await L.adminTab(p, 'team'); await L.settle(p, 500);
  bl = await billed(p);
  const adminSamePage = sum(bl), pastOnReturn = bl.filter(x => /\/(days|orders|transfers)\/\d{4}-\d{2}-\d{2}\//.test(x.path) && x.path.indexOf('/' + day(0) + '/') < 0);
  if (show) console.log('admin same page: ' + adminSamePage + ' (' + top(bl) + ')');
  ok(pastOnReturn.length === 0, 'returning to loaded admin reports in the same page adds no past-day server reads');
  // A full reload keeps the synthetic backend but loses the client's memory-only Firestore read cache.
  await p.reload(); await L.settle(p, 2500);
  await L.adminTab(p, 'waste'); await L.settle(p, 1500);
  await L.adminTab(p, 'transfers'); await L.settle(p, 1500);
  await L.adminTab(p, 'team'); await L.settle(p, 1500);
  const afterReload = await reportData(p);
  bl = await billed(p);
  const admin2 = sum(bl);
  if (show) console.log('admin again: ' + admin2 + ' (' + top(bl) + ')');
  ok(afterReload.prep === 140 && afterReload.orders === 35 && !afterReload.missing, 'reloaded admin reports fetch complete historical records rather than treating the empty memory cache as an empty report');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the same admin panel once the day digests exist (Plan B 2.3, 5 Nov 2026): the reports' past days come from them
  p = await measure(b, '#/admin', { admin: true, who: '', extra: withDig }, 2500);
  await L.adminTab(p, 'waste'); await L.settle(p, 1500);
  await L.adminTab(p, 'transfers'); await L.settle(p, 1500);
  await L.adminTab(p, 'team'); await L.settle(p, 1500);
  const withDigests = await reportData(p);
  bl = await billed(p);
  const adminDig = sum(bl);
  if (show) console.log('admin with the digests: ' + adminDig + ' (' + top(bl) + ')');
  ok(withDigests.prep === 140 && withDigests.orders === 35 && !withDigests.missing, 'with the digests: the admin reports have all 140 past prep lines and 35 order lines');
  ok(!bl.some(x => /\/(days|orders)\/\d{4}-\d{2}-\d{2}\//.test(x.path) && x.path.indexOf('/' + day(0) + '/') < 0), 'with the digests: the admin reports read no past prep or order lines');
  ok(p.errors.length === 0, 'admin with the digests: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the Proofreader (Plan B 6.2): the admin panel reopened on it, with the day digests
  p = await measure(b, '#/admin', { admin: true, who: '', adminPage: 'proofreader', extra: withDig }, 3000);
  bl = await billed(p);
  const proof = sum(bl);
  if (show) console.log('proofreader: ' + proof + ' (' + top(bl) + ')');
  ok(await p.evaluate(() => !!document.querySelector('[data-t="proofreader"][aria-current="page"], [data-t="proofreader"][aria-pressed="true"]')) || await p.evaluate(() => window.LK_PREP.state.atab === 'proofreader'), 'proofreader: the admin panel opened on it');
  ok(p.errors.length === 0, 'proofreader: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Manage functions (Plan B 6.2): a functions coordinator opens #/functions with 12 bookings ahead
  const F = require('../js/functions.js'), withFn = Object.assign({}, withSum);
  withFn[fsKey(['config', 'main'])] = Object.assign({}, L.seed()[fsKey(['config', 'main'])]);
  withFn[fsKey(['config', 'main'])].people = withFn[fsKey(['config', 'main'])].people.concat([{ id: 'fay', name: 'Fay', role: 'fnc', active: true }]);
  withFn[fsKey(['config', 'main'])].staffIds = (withFn[fsKey(['config', 'main'])].staffIds || []).concat(['fay']);
  withFn[fsKey(['config', 'main'])].fnIds = ['fay'];
  withFn[fsKey(['pinset', 'fay'])] = { at: 1 };
  withFn[fsKey(['staffpins', 'fay'])] = { hash: L.sha('lk:fay:5151') };
  for (let i = 0; i < 12; i++) {
    const d = L.ymd(new Date(L.NOW + (i * 5 + 1) * 86400000));
    withFn[fsKey(['functions', 'fn' + i])] = F.derive({ v: 1, status: 'confirmed', name: 'Booking ' + i, date: d, start: F.kat(d, 1080), loc: 'Garden', guests: 30, mode: 'all', lines: [{ rid: 'pizza-platter', name: 'Pizza platter', qty: 2, unit: 'platter', u: [0], spec: '', fp: '' }], rounds: [{ at: F.kat(d, 1110), note: '' }], notes: '', kc: '', kcBy: '', kcAt: 0, was: {}, chg: [], cBy: 'fay', cAt: 1, by: 'fay', upd: 1, od: '', confAt: 1 });
  }
  p = await measure(b, '#/functions', { who: 'fay', extra: withFn }, 2500);
  bl = await billed(p);
  const fnManage = sum(bl);
  if (show) console.log('manage functions: ' + fnManage + ' (' + top(bl) + ')');
  ok(await p.evaluate(() => (document.body.textContent.match(/Booking \d+/g) || []).length) >= 12, 'manage functions: the 12 bookings are listed');
  ok(p.errors.length === 0, 'manage functions: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  {
    ok(proof <= BUDGET.proof, 'admin panel opened on the Proofreader with the day digests: ' + proof + ' reads (budget ' + BUDGET.proof + ')');
    ok(fnManage <= BUDGET.fnManage, 'Manage functions with 12 bookings ahead: ' + fnManage + ' reads (budget ' + BUDGET.fnManage + ')');
    ok(first <= BUDGET.first, 'staff first open today: ' + first + ' reads (budget ' + BUDGET.first + ')');
    ok(firstSum <= BUDGET.firstSum, 'staff first open today with the nightly summaries: ' + firstSum + ' reads (budget ' + BUDGET.firstSum + ')');
    ok(firstDig <= BUDGET.firstDig, 'staff first open today with the summaries and day digests: ' + firstDig + ' reads (budget ' + BUDGET.firstDig + ')');
    ok(reload <= BUDGET.reload, 'staff reload the same day: ' + reload + ' reads (budget ' + BUDGET.reload + ')');
    ok(admin <= BUDGET.admin, 'admin panel open: ' + admin + ' reads (budget ' + BUDGET.admin + ')');
    ok(adminSamePage <= BUDGET.adminSamePage, 'admin reports revisited without reload: ' + adminSamePage + ' reads (budget ' + BUDGET.adminSamePage + ')');
    ok(adminDig <= BUDGET.adminDig, 'admin panel open with the day digests: ' + adminDig + ' reads (budget ' + BUDGET.adminDig + ')');
    ok(admin2 <= BUDGET.admin2, 'admin panel reloaded the same day with a fresh memory cache: ' + admin2 + ' reads (budget ' + BUDGET.admin2 + ')');
  }
  await b.close();
  L.report(R);
})();
