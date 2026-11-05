// The hints read past days from the day digests (Plan B 2.1 and 2.4, 5 Nov 2026, docs/firestore-usage.md): the 03:00
// job keeps digest/<day> with each past day's prep and order lines, so a phone reads 14 past days for about 15 reads
// instead of 40 to 60 a day. A past-day fix names its day in config/main.pastEdit (pDays, pPrev, pFor), and other
// phones read just that day again; a stamp that names nothing (an older book) reads every day as before.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
const CFG = fsKey(['config', 'main']);
const NIGHT = L.NOW - 11 * 3600000;   // 03:00 today, kitchen time: when the nightly job read the lines
// every past day has its lines (Line ...) and, but day 9, a digest holding them as the job read them (Digest ...), so
// the test can tell which one the phone used
const extra = {}, index = {};
for (let d = 1; d <= 14; d++) {
  const prep = [], orders = [];
  for (let i = 0; i < 3; i++) {
    const line = { text: 'Line ' + d + '-' + i, station: 'Larder', qty: '2 tubs', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - d * 86400000, done: i === 2, doneAt: i === 2 ? L.NOW - d * 86400000 + 3600000 : 0, deleted: false };
    extra[fsKey(['days', day(d), 'items', 'p' + d + '-' + i])] = line;
    prep.push(Object.assign({}, line, { id: 'p' + d + '-' + i, text: 'Digest ' + d + '-' + i }));
  }
  const ord = { text: 'Milk ' + d, qty: '2 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - d * 86400000, ordered: true, deleted: false };
  extra[fsKey(['orders', day(d), 'lines', 'o' + d])] = ord;
  orders.push(Object.assign({}, ord, { id: 'o' + d, text: 'Digest milk ' + d }));
  if (d === 9) continue;
  extra[fsKey(['digest', day(d)])] = { v: 1, day: day(d), at: NIGHT, prep, orders };
  index[day(d)] = 'fp' + d;
}
extra[fsKey(['digest', '_index'])] = { v: 1, at: NIGHT, days: index };
const pastText = (p, d) => p.evaluate(k => ((window.LK_PREP.state.past || {})[k] || []).map(x => x.text).sort().join(','), d);
const lineReads = (p, kind) => p.evaluate(a => window.__fake.bill.filter(x => x.path.indexOf('/' + a.kind + '/') > 0 && x.path.indexOf('/' + a.today + '/') < 0).map(x => x.path.split('/')[3]), { kind, today: day(0) });
const digestBill = p => p.evaluate(() => window.__fake.bill.filter(x => /\/digest(\/|$)/.test(x.path)).reduce((t, x) => t + x.n, 0));
// the prep list has rolled over today already, so the rollover's read of the last day does not count here
const rolled = () => { try { localStorage.setItem('lk.prep.rolled', new Date(Date.now() + 36000000).toISOString().slice(0, 10)); } catch (e) {} };
const savedAt = p => p.evaluate(() => (JSON.parse(localStorage.getItem('lk.past') || '{}') || {}).at || 0);
(async () => {
  const b = await L.start();

  // Ann opens the prep list for the first time today: 13 days from their digests, day 9 (no digest) from its lines
  let p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 2500, init: rolled });
  await L.waitFor(p, () => !!localStorage.getItem('lk.past'));
  ok(await pastText(p, day(1)) === 'Digest 1-0,Digest 1-1,Digest 1-2', 'ann: yesterday comes from its digest (' + await pastText(p, day(1)) + ')');
  ok(await pastText(p, day(9)) === 'Line 9-0,Line 9-1,Line 9-2', 'ann: a day with no digest comes from its lines (' + await pastText(p, day(9)) + ')');
  ok(await p.evaluate(() => Object.keys(window.LK_PREP.state.past).length) === 14, 'ann: all 14 past days are on the phone');
  let reads = await lineReads(p, 'days');
  ok(reads.length === 1 && reads[0] === day(9), 'ann: the only past prep lines read are day 9\'s (' + reads.join(' ') + ')');
  const dig = await digestBill(p);
  ok(dig === 14, 'ann: the digests cost 14 reads, the index and 13 days (' + dig + ')');
  // the order list's regulars come from the same digests, read once
  await p.evaluate(() => { location.hash = '#/orders'; });
  await L.waitFor(p, () => (window.LK_PREP.state.ordHist || []).length >= 14);
  const hist = await p.evaluate(() => window.LK_PREP.state.ordHist.map(x => x.text).sort());
  ok(hist.includes('Digest milk 1') && hist.includes('Milk 9') && !hist.includes('Milk 1'), 'ann: the order regulars come from the digests, day 9 from its lines (' + hist.slice(0, 4).join(', ') + ')');
  reads = await lineReads(p, 'orders');
  // day 9 for the regulars (no digest), and day 1 for the rollover: the digests say it was the last day written, so
  // the rollover reads that day only (it read all seven before)
  ok(reads.sort().join(' ') === [day(9), day(1)].sort().join(' '), 'ann: the only past order lines read are day 9\'s for the regulars and day 1\'s for the rollover (' + reads.join(' ') + ')');
  ok(await digestBill(p) === dig, 'ann: the order list reads no digest again');

  // Sam fixes day 2 on another phone after the job ran: the stamp names it, so Ann's phone reads day 2 again, only
  const at1 = await savedAt(p), T1 = L.NOW + 60000;
  await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 600);
  await p.evaluate(() => { window.__fake.bill = []; });
  await p.evaluate(a => {
    window.__fake.write(a.line, Object.assign({}, window.__fake.dump()[a.line], { text: 'Fixed 2-0' }));
    window.__fake.write(a.cfg, Object.assign({}, window.__fake.dump()[a.cfg], { pastEdit: { p: a.T, pDays: [a.d], pPrev: a.prev, pFor: a.T } }));
  }, { line: fsKey(['days', day(2), 'items', 'p2-0']), cfg: CFG, T: T1, d: day(2), prev: NIGHT - 3600000 });
  await L.waitFor(p, d => ((window.LK_PREP.state.past || {})[d] || []).some(x => x.text === 'Fixed 2-0') && !window.LK_PREP.state.pastBusy, day(2)).catch(() => {});
  await L.settle(p, 500);
  reads = await lineReads(p, 'days');
  ok(reads.length === 1 && reads[0] === day(2), 'ann: a fix named for day 2 reads only day 2\'s lines (' + reads.join(' ') + ')');
  ok(await pastText(p, day(1)) === 'Digest 1-0,Digest 1-1,Digest 1-2', 'ann: the other days are kept');
  ok(await digestBill(p) === 0, 'ann: no digest is read again for a named fix');
  ok(await savedAt(p) === T1 && at1 < T1, 'ann: the saved copy is current as of the stamp (' + await savedAt(p) + ')');
  // the order history's stamp names day 3: only day 3's order lines
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 800);
  await p.evaluate(() => { window.__fake.bill = []; });
  await p.evaluate(a => {
    window.__fake.write(a.line, Object.assign({}, window.__fake.dump()[a.line], { text: 'Cream 3' }));
    window.__fake.write(a.cfg, Object.assign({}, window.__fake.dump()[a.cfg], { pastEdit: Object.assign({}, window.__fake.dump()[a.cfg].pastEdit, { o: a.T, oDays: [a.d], oPrev: 0, oFor: a.T }) }));
  }, { line: fsKey(['orders', day(3), 'lines', 'o3']), cfg: CFG, T: T1 + 1000, d: day(3) });
  await L.waitFor(p, () => (window.LK_PREP.state.ordHist || []).some(x => x.text === 'Cream 3')).catch(() => {});
  await L.settle(p, 500);
  reads = await lineReads(p, 'orders');
  const hist2 = await p.evaluate(() => window.LK_PREP.state.ordHist.map(x => x.text));
  ok(reads.length === 1 && reads[0] === day(3), 'ann: a fix named for orders on day 3 reads only day 3\'s order lines (' + reads.join(' ') + ')');
  ok(hist2.length === 14 && hist2.includes('Digest milk 1') && !hist2.includes('Digest milk 3'), 'ann: the other order days are kept, day 3 replaced (' + hist2.length + ')');
  // an older book stamps p alone (pFor is left behind): every past day is read from its lines, as before
  await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 600);
  await p.evaluate(() => { window.__fake.bill = []; });
  await p.evaluate(a => { const c = window.__fake.dump()[a.cfg]; window.__fake.write(a.cfg, Object.assign({}, c, { pastEdit: Object.assign({}, c.pastEdit, { p: a.T }) })); }, { cfg: CFG, T: T1 + 5000 });
  await L.waitFor(p, T => (JSON.parse(localStorage.getItem('lk.past') || '{}').at || 0) >= T && !window.LK_PREP.state.pastBusy, T1 + 5000).catch(() => {});
  reads = await lineReads(p, 'days');
  ok(reads.length === 14, 'ann: a stamp that names no day reads all 14 days\' lines (' + reads.length + ')');
  ok(await pastText(p, day(1)) === 'Line 1-0,Line 1-1,Line 1-2', 'ann: and takes the lines, not the digest, for every day');
  ok(p.errors.length === 0, 'ann: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Bo opens later, after a fix named for day 3 since the job: digests for the rest, day 3 from its lines
  const named = Object.assign({}, extra);
  named[CFG] = Object.assign({}, L.seed()[CFG], { pastEdit: { p: L.NOW - 3600000, pDays: [day(3)], pPrev: NIGHT - 7200000, pFor: L.NOW - 3600000 } });
  p = await L.open(b, '#/prep', { who: 'bo', extra: named, wait: 2500, init: rolled });
  await L.waitFor(p, () => !!localStorage.getItem('lk.past'));
  reads = await lineReads(p, 'days');
  ok(reads.sort().join(' ') === [day(9), day(3)].sort().join(' '), 'bo: day 3 (fixed since the job) and day 9 (no digest) from their lines, the rest from digests (' + reads.join(' ') + ')');
  ok(await pastText(p, day(3)) === 'Line 3-0,Line 3-1,Line 3-2' && await pastText(p, day(4)) === 'Digest 4-0,Digest 4-1,Digest 4-2', 'bo: day 3 holds its lines, day 4 its digest');
  // a fix named since the job but with days changed before them too (pPrev after the job): every day from its lines
  await p.context().close();
  const broken = Object.assign({}, extra);
  broken[CFG] = Object.assign({}, L.seed()[CFG], { pastEdit: { p: L.NOW - 3600000, pDays: [day(3)], pPrev: NIGHT + 3600000, pFor: L.NOW - 3600000 } });
  p = await L.open(b, '#/prep', { who: 'bo', extra: broken, wait: 2500, init: rolled });
  await L.waitFor(p, () => !!localStorage.getItem('lk.past'));
  reads = await lineReads(p, 'days');
  ok(reads.length === 14, 'bo: when the stamp cannot tell which days changed since the job, all 14 days come from their lines (' + reads.length + ')');
  await p.context().close();

  // before the rules are published the digests are refused: the phone reads the lines, asks once, and shows no error
  p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 2500, denyReads: '/digest$', init: rolled });
  await L.waitFor(p, () => !!localStorage.getItem('lk.past'));
  ok(await pastText(p, day(1)) === 'Line 1-0,Line 1-1,Line 1-2' && (await lineReads(p, 'days')).length === 14, 'refused: every past day comes from its lines');
  await p.evaluate(() => { location.hash = '#/orders'; });
  await L.waitFor(p, () => (window.LK_PREP.state.ordHist || []).length >= 14);
  ok(await p.evaluate(() => window.__fake.refused.filter(x => /\/digest$/.test(x.path)).length) <= 1, 'refused: the digests are asked for once, not again for the order list');
  ok(p.errors.length === 0, 'refused: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the head chef's Team page (Plan B 2.3): 60 days of prep and 30 of orders, past days from their digests where they
  // are current, day 9 (no digest) and days 15 to 59 (none seeded) from their lines
  p = await L.open(b, '#/admin', { admin: true, who: '', extra, wait: 2500, init: rolled });
  await L.adminTab(p, 'team');
  await L.waitFor(p, () => { const s = window.LK_PREP.state; return s.stats && !s.stats.loading && s.ordStats && !s.ordStats.loading; });
  const rep = await p.evaluate(a => { const s = window.LK_PREP.state; return { d1: (s.stats.days[a.d1] || []).map(x => x.text).sort().join(','), d9: (s.stats.days[a.d9] || []).map(x => x.text).sort().join(','), o1: s.ordStats.raw.filter(x => x.date === a.d1).map(x => x.text).join(','), miss: s.stats.miss.length + s.ordStats.miss.length }; }, { d1: day(1), d9: day(9) });
  ok(rep.d1 === 'Digest 1-0,Digest 1-1,Digest 1-2' && rep.d9 === 'Line 9-0,Line 9-1,Line 9-2' && rep.o1 === 'Digest milk 1' && !rep.miss, 'admin: the reports take past days from their digests, day 9 from its lines (' + JSON.stringify(rep) + ')');
  const recent = async () => (await lineReads(p, 'days')).concat(await lineReads(p, 'orders')).filter(d => d >= day(14));
  reads = await recent();
  ok(reads.length === 2 && reads.every(d => d === day(9)), 'admin: of the last 14 days only day 9\'s lines are read, once for prep and once for orders (' + reads.join(' ') + ')');
  // Refresh reads the digests again, not 60 days of lines
  await p.clock.fastForward(6000);   // a Refresh within 5 seconds of a read uses it
  await p.evaluate(() => { window.__fake.bill = []; });
  await p.click('[data-p="stats-refresh"]');
  await L.waitFor(p, () => { const s = window.LK_PREP.state; return s.stats && !s.stats.loading && s.ordStats && !s.ordStats.loading; });
  await L.settle(p, 500);
  reads = await recent();
  ok(await digestBill(p) === 14 && reads.length === 2, 'admin: Refresh reads the index and the digests again (' + await digestBill(p) + '), and only day 9\'s lines of the last 14 days (' + reads.join(' ') + ')');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Sam removes lines on two past days within 5 seconds: one stamp at the end names both days
  const sam = Object.assign({}, extra);
  sam[CFG] = Object.assign({}, L.seed()[CFG], { pastEdit: { p: NIGHT - 3600000 } });
  p = await L.open(b, '#/prep', { who: 'sam', extra: sam, wait: 2500, init: rolled });
  await p.click('[data-p="day"][data-d="-1"]'); await L.settle(p, 700);
  await L.waitFor(p, () => !!document.querySelector('[data-p="del"][data-id="p1-0"]'));
  await L.lineAct(p, '[data-p="del"][data-id="p1-0"]');
  await L.waitFor(p, k => !!((window.__fake.dump()[k] || {}).pastEdit || {}).pFor, CFG).catch(() => {});
  let pe = await p.evaluate(k => window.__fake.dump()[k].pastEdit, CFG);
  ok(pe.pFor === pe.p && pe.pDays.join() === day(1) && pe.pPrev === NIGHT - 3600000, 'sam: the first fix after the job names its day and the stamp before it (' + JSON.stringify(pe) + ')');
  const t0 = Date.now();
  await p.click('[data-p="day"][data-d="-1"]'); await L.settle(p, 300);
  await L.waitFor(p, () => !!document.querySelector('[data-p="del"][data-id="p2-0"]'));
  await L.lineAct(p, '[data-p="del"][data-id="p2-0"]');
  await L.lineAct(p, '[data-p="del"][data-id="p2-1"]');
  await L.waitFor(p, a => (((window.__fake.dump()[a.k] || {}).pastEdit || {}).pDays || []).length === 2, { k: CFG }, 12000).catch(() => {});
  pe = await p.evaluate(k => window.__fake.dump()[k].pastEdit, CFG);
  ok(pe.pFor === pe.p && pe.pDays.join() === [day(1), day(2)].join() && pe.pPrev === NIGHT - 3600000, 'sam: the next fixes add their day to the same run, sent once at the end of the 5 seconds (' + JSON.stringify(pe) + ')');
  const w = await p.evaluate(k => [].concat.apply([], window.__fake.writes).filter(o => o.path === k).length, CFG);
  ok(w === 2 || Date.now() - t0 > 4000, 'sam: two stamps for three fixes (' + w + ', ' + (Date.now() - t0) + ' ms)');
  ok(p.errors.length === 0, 'sam: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
