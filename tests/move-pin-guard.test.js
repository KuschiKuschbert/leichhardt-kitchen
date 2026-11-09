// Move PIN cannot use up the day's free reads or writes (Plan B 5.4, 7 Nov 2026, docs/firestore-usage.md). It reads the
// whole book first and writes nothing until it knows the size: past the caps it refuses with nothing written and the old
// PIN still working, and the refusal is kept on the device for 7 days so another tap costs no reads. The caps are 15,000
// records and 20,000 reads; LK_PREP.state.moveCap lowers them here, so a small made-up book is "too big".
const L = require('./lib');
const { R, ok } = L.results();
const NEW = '4321';
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const day = n => L.ymd(new Date(L.NOW - n * 86400000));
const store = p => p.evaluate(() => window.__fake.dump());
const onNew = s => Object.keys(s).filter(k => k.indexOf('kitchens/' + NEW + '/') === 0);
// three past days of 20 prep lines and 5 order lines, and two sections
const extra = {};
for (let d = 1; d <= 3; d++) for (let i = 0; i < 20; i++) {
  extra[fsKey(['days', day(d), 'items', 'p' + d + '-' + i])] = { text: 'Line ' + i, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - d * 86400000, done: true, deleted: false };
  if (i < 5) extra[fsKey(['orders', day(d), 'lines', 'o' + d + '-' + i])] = { text: 'Milk ' + i, qty: '2 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - d * 86400000, ordered: true, deleted: false };
}
extra[fsKey(['sections', 'larder'])] = { name: 'Larder', uses: 60 };
extra[fsKey(['sections', 'grill'])] = { name: 'Grill', uses: 3 };
async function move(p) {
  await p.fill('#a-newpin', NEW); await p.fill('#a-newpin2', NEW);
  await p.click('[data-p="move-pin"]'); await L.settle(p, 150);
  await p.click('[data-p="move-pin"]');
  await L.waitFor(p, () => !window.LK_PREP.state.moving, null, 15000);
  await L.settle(p, 200);
  return p.evaluate(() => window.LK_PREP.state.moveMsg);
}
const reads = p => p.evaluate(() => window.__fake.bill.reduce((t, x) => t + x.n, 0));
async function admin(b, o) {
  const p = await L.open(b, '#/admin', Object.assign({ admin: true, wait: 1800, extra }, o || {}));
  const cooling = o && o.extra && o.extra[fsKey(['cooling', 'current'])];
  const at = o && o.clock || L.NOW, opens = Math.floor((at + 10 * 3600000) / 86400000) * 86400000;
  const active = cooling && cooling.firstAt.__fakeTimestamp >= opens && cooling.firstAt.__fakeTimestamp < opens + 11 * 3600000 && at >= opens && at < opens + 11 * 3600000;
  // Leave each due check outstanding while clearing its popup, so the PIN-move guard still sees the original run.
  for (const [hours, started] of [[2, cooling && cooling.firstAt], [4, cooling && cooling.secondAt]]) {
    if (!active || !started || started.__fakeTimestamp + hours * 3600000 > at) continue;
    const message = 'Operandio batch cooling time ' + hours + ' hours is done.';
    await L.waitFor(p, message => !!Array.from(document.querySelectorAll('.cooling-ping h3')).find(el => el.textContent === message), message);
    await p.locator('.cooling-ping').getByRole('button', { name: 'Not yet', exact: true }).click();
    await L.waitFor(p, message => !Array.from(document.querySelectorAll('.cooling-ping h3')).some(el => el.textContent === message), message);
  }
  await L.adminTab(p, 'tools'); await L.settle(p, 200);
  return p;
}

(async () => {
  const b = await L.start();

  // 1. Too many records: refused after reading, nothing written under the new PIN, the old PIN still in use
  let p = await admin(b);
  await p.evaluate(() => { window.LK_PREP.state.moveCap = { w: 40 }; window.__fake.bill = []; });
  let msg = await move(p), s = await store(p);
  ok(/^Not moved\. The book holds more than 40 records/.test(msg) && /Nothing was changed/.test(msg), 'too many records: refused, and it says why (' + msg.slice(0, 70) + ')');
  ok(onNew(s).length === 0, 'too many records: nothing written under the new PIN (' + onNew(s).slice(0, 3).join(', ') + ')');
  ok(await p.evaluate(() => window.LK_PREP.state.pin) === L.PIN && await p.evaluate(() => localStorage.getItem('lk.prep.pin')) === L.PIN, 'too many records: this device keeps the old PIN');
  const kept = await p.evaluate(() => { try { return JSON.parse(localStorage.getItem('lk.move.big')); } catch (e) { return null; } });
  ok(kept && kept.n > 40 && typeof kept.at === 'number', 'too many records: the refusal is kept on the device (' + JSON.stringify(kept) + ')');
  ok(await p.$eval('#prep-root', el => /Not moved\. The book holds more than 40 records/.test(el.textContent)), 'too many records: the words show on the page');
  // it stopped reading once past the cap: the days after the first 20 were never asked for
  const asked = await p.evaluate(d => window.__fake.bill.filter(x => x.path.indexOf('/' + d + '/') > 0).length, day(25));
  ok(asked === 0, 'too many records: it stopped reading at the cap (day 25 asked for ' + asked + ' times)');
  // another tap within 7 days: refused at once, no reads
  await p.evaluate(() => { window.__fake.bill = []; });
  msg = await move(p);
  ok(/^Not moved/.test(msg) && await reads(p) === 0, 'tapped again: refused at once with no reads (' + await reads(p) + ')');
  ok(p.errors.length === 0, 'too many records: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. Too many reads: 400 days are 5 reads each even when empty, so a low read cap stops it part way through the days
  p = await admin(b);
  await p.evaluate(() => { window.LK_PREP.state.moveCap = { r: 600 }; window.__fake.bill = []; });
  msg = await move(p); s = await store(p);
  const spent = await reads(p);
  ok(/^Not moved\. Reading the whole book would take more than 600 reads/.test(msg) && onNew(s).length === 0, 'too many reads: refused, it says why, nothing written (' + msg.slice(0, 70) + ')');
  ok(spent < 600 + 200, 'too many reads: it stopped near the cap, ' + spent + ' reads, not the 2,000 the days cost');
  await p.context().close();

  // 3. A refusal is out of date after 7 days: the copy goes ahead, and within the caps everything is copied
  p = await admin(b);
  await p.evaluate(at => localStorage.setItem('lk.move.big', JSON.stringify({ at, n: 90 })), L.NOW - 8 * 86400000);
  msg = await move(p); s = await store(p);
  ok(/^Copied \d+ records/.test(msg), 'refusal 8 days old: the move goes ahead (' + msg.slice(0, 40) + ')');
  ok(!!s['kitchens/' + NEW + '/days/' + day(2) + '/items/p2-7'] && !!s['kitchens/' + NEW + '/orders/' + day(3) + '/lines/o3-4'] && (s['kitchens/' + NEW + '/sections/larder'] || {}).uses === 60, 'within the caps: past prep and order lines and the sections are copied');
  const copied = +/^Copied (\d+) records/.exec(msg)[1], recs = onNew(s).length;
  ok(copied > 70 && copied <= recs, 'within the caps: the count says what was written (' + copied + ' said, ' + recs + ' on the new PIN)');
  ok(await p.evaluate(() => window.LK_PREP.state.pin) === NEW, 'within the caps: this device now uses the new PIN');
  ok(p.errors.length === 0, 'copied: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 4. Nothing is written while it reads: a write held back as with no signal shows no record on the new PIN
  p = await admin(b);
  await p.evaluate(() => { window.__fake.failReads = /\/days\/[^/]+\/items$/; });
  msg = await move(p); s = await store(p);
  ok(/^Stopped part way/.test(msg) && onNew(s).length === 0, 'a read lost part way: stopped, and nothing was written on the new PIN (' + onNew(s).length + ')');
  ok(!(await p.evaluate(() => localStorage.getItem('lk.move.big'))), 'a read lost part way: no refusal kept, so it can be tried again');
  await p.context().close();

  // 5. An unfinished batch stays at its original kitchen address until both stages finish.
  const coolingPath = fsKey(['cooling', 'current']);
  const current = { v: 1, run: 'move-cooling-run-01', rev: 1, firstAt: { __fakeTimestamp: L.NOW }, firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' };
  for (const [label, run] of [['running', current], ['waiting for the second start', { ...current, firstAt: { __fakeTimestamp: L.NOW - 10800000 } }]]) {
    p = await admin(b, { extra: { ...extra, [coolingPath]: run } });
    await p.evaluate(() => { window.__fake.writes = []; window.__fake.bill = []; });
    msg = await move(p); s = await store(p);
    ok(/Finish the current Operandio batch/.test(msg) && /Nothing was copied/.test(msg), label + ': the move explains why the batch must finish');
    ok(onNew(s).length === 0 && !(await p.evaluate(prefix => window.__fake.writes.flat().some(w => w.path.startsWith(prefix)), 'kitchens/' + NEW + '/')), label + ': no destination authority or data is written');
    ok(await p.evaluate(path => window.__fake.bill.some(x => x.kind === 'server' && x.path === path), coolingPath), label + ': the guard reads the current server record');
    ok(await p.evaluate(() => window.LK_PREP.state.pin) === L.PIN, label + ': the working kitchen PIN stays unchanged');
    ok(p.errors.length === 0, label + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 6. A failed read cannot be treated as no active batch.
  p = await admin(b, { extra });
  await p.evaluate(() => { window.__fake.failReads = /\/cooling\/current$/; window.__fake.writes = []; });
  msg = await move(p); s = await store(p);
  ok(/^Stopped part way/.test(msg) && /safe to try again/.test(msg), 'timer unavailable: the move stops with a retryable explanation');
  ok(onNew(s).length === 0, 'timer unavailable: no destination write');
  ok(await p.evaluate(() => window.LK_PREP.state.pin) === L.PIN && !(await p.evaluate(() => localStorage.getItem('lk.move.big'))), 'timer unavailable: old PIN remains and no quota refusal is cached');
  await p.context().close();

  // 7. A finished daytime batch needs no scheduler cutover. Its first stage starts at 10:00 and the second at 12:00.
  p = await admin(b, { clock: L.NOW + 3 * 3600000, extra: { ...extra, [coolingPath]: { ...current, rev: 2, firstAt: { __fakeTimestamp: L.NOW - 4 * 3600000 }, secondAt: { __fakeTimestamp: L.NOW - 2 * 3600000 }, secondBy: 'ann' } } });
  msg = await move(p); s = await store(p);
  ok(/^Copied \d+ records/.test(msg) && await p.evaluate(() => window.LK_PREP.state.pin) === NEW, 'finished batch: the normal kitchen PIN move succeeds');
  ok(!!s[coolingPath] && !s['kitchens/' + NEW + '/cooling/current'], 'finished batch: old history remains and the new kitchen is ready for a fresh batch');
  ok(p.errors.length === 0, 'finished batch: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 8. The daily reset expires even an unfinished batch. Its retained record cannot block a later PIN move.
  for (const [label, clock, firstAt] of [
    ['previous-day unfinished batch', L.NOW, L.NOW - 86400000],
    ['21:00 reset of unfinished batch', L.NOW + 7 * 3600000, L.NOW]
  ]) {
    const expired = { ...current, firstAt: { __fakeTimestamp: firstAt } };
    p = await admin(b, { clock, extra: { ...extra, [coolingPath]: expired },
      // A previously presented alert also keeps the old client quiet when this regression runs on its baseline.
      init: () => localStorage.setItem('lk.cooling.seen.000000.anon-test', JSON.stringify({ 'move-cooling-run-01_1': true })) });
    const retained = JSON.stringify((await store(p))[coolingPath]);
    msg = await move(p); s = await store(p);
    ok(/^Copied \d+ records/.test(msg) && await p.evaluate(() => LK_PREP.state.pin) === NEW, label + ': expired timer does not block the kitchen PIN move');
    ok(JSON.stringify(s[coolingPath]) === retained && !s['kitchens/' + NEW + '/cooling/current'], label + ': the original timer record remains unchanged at its old kitchen');
    ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 9. Cleaning revisions and sign-offs cannot be copied through the old generic PIN mover. Either collection
  // must stop the operation before it creates destination records, even when the book fits comfortably in the caps.
  const cleaning = [
    ['cleaningTasks', 'handles', { root: 'handles', prev: '', next: '', text: 'Wipe coldroom handles', area: 'Coldroom', section: '', sectionName: '', shared: true, dows: [0, 1, 2, 3, 4, 5, 6], guide: '', from: Date.parse(day(1) + 'T00:00:00+10:00'), until: 253402178400000, at: L.NOW - 86400000, by: 'sam' }],
    ['cleaningDone', day(0) + '_handles', { day: day(0), task: 'handles', version: 1, done: true, doneAt: L.NOW - 60000, doneById: 'ann', doneBy: 'Ann', workerId: 'ann', worker: 'Ann', by: 'ann' }]
  ];
  for (const [collection, id, record] of cleaning) {
    const path = fsKey([collection, id]);
    p = await admin(b, { extra: Object.assign({}, extra, { [path]: record }) });
    msg = await move(p); s = await store(p);
    ok(/^Not moved\. Cleaning history needs a reviewed copy procedure/.test(msg), collection + ': PIN move explains why cleaning records need a separate copy procedure');
    ok(onNew(s).length === 0 && JSON.stringify(s[path]) === JSON.stringify(record), collection + ': no destination record is written and the original cleaning record is unchanged');
    ok(await p.evaluate(() => LK_PREP.state.pin === localStorage.getItem('lk.prep.pin')) && await p.evaluate(() => LK_PREP.state.pin) === L.PIN, collection + ': the current PIN keeps working');
    ok(!p.errors.length, collection + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
