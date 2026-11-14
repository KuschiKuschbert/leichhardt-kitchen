// The two-way check on the service view (head chef, 14 Nov 2026, docs/function-handover-options/brief.md, Chosen): the
// kitchen taps what goes and sends it as a trip; every trip waiting for Functions sits on the shelf at the end of the
// board; Functions people confirm each trip; a head or sous chef may confirm for Functions after 10 minutes. Picks are
// never saved until Send, survive a redraw and shrink when another phone sends; a double tap sends one trip; a refusal
// keeps the picks; no signal says Not sent yet. No reads of its own. All records and people here are made up.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results(), { txt } = L;
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm));
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'head', add: true, tick: true, del: true, active: true },
  { id: 'fay', name: 'Fay', role: 'fnc', add: false, tick: false, del: false, fn: true, active: true }
];
const cfg = { people, headId: 'bo', sousIds: ['sam', 'bo'], pingIds: ['sam', 'bo'], fnIds: ['fay'], staffIds: ['sam', 'ann', 'bo', 'fay'], showBadges: true };
function fn(o) {
  const date = today, rounds = o.rounds.map(x => ({ at: at(date, x), note: '' }));
  return M.derive({ v: 1, status: 'confirmed', name: o.name, date, start: at(date, o.start), loc: o.loc, guests: 40,
    mode: rounds.length > 1 ? 'stag' : 'all', notes: o.notes || '', kc: '', kcBy: '', kcAt: 0, rounds,
    lines: o.lines.map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: '', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: {}, chg: [], cBy: 'fay', cAt: 1, confBy: 'fay', confAt: 1, by: 'fay', upd: L.NOW - 3600000 });
}
const WED = fn({ name: 'Wedding reception', start: '17:30', loc: 'Marquee', rounds: ['18:30'], notes: 'The bride is vegan.',
  lines: [['antipasto-platter', 'Antipasto Platter', [4]], ['pizza-platter', 'Pizza Platter', [3]], ['sliders-platter', 'Sliders Platter', [3]], ['fruit-platter', 'Fruit Platter', [2]], ['cheese-platter', 'Cheese Platter', [2]]] });
const CLUB = fn({ name: 'Rotary dinner', start: '18:00', loc: 'Beer garden', rounds: ['18:50'], lines: [['antipasto-platter', 'Antipasto Platter', [4]]] });
const RA = WED.rounds[0].at, TRIP = k => key(['fnsent', 'wed_' + RA + '_t' + k]), ROUND = key(['fnsent', 'wed_' + RA]);
const base = () => ({ [key(['config', 'main'])]: cfg, [key(['staffpins', 'fay'])]: { hash: L.sha('lk:fay:5151') }, [key(['pinset', 'fay'])]: { at: 1 },
  [key(['drinks', 'fay'])]: { kind: 'flat', at: 1, by: 'fay' }, [key(['functions', 'wed'])]: WED, [key(['functions', 'club'])]: CLUB });
const store = p => p.evaluate(() => window.__fake.dump());
const reads = p => p.evaluate(() => window.__fake.bill.reduce((n, x) => n + x.n, 0));
const flat = s => (s || '').replace(/\s+/g, ' ').trim();
const wedRow = '.fn-svc-row:has([data-id="wed"])';
const sendText = p => p.$eval(wedRow + ' [data-fn="send"]', b => b.textContent.trim()).catch(() => '');
const pick = (p, rid, less) => p.click(wedRow + ' [data-fn="' + (less ? 'pick-less' : 'pick') + '"][data-r="0|' + rid + '"]');
(async () => {
  const b = await L.start();

  // 1. a cook at 18:35: the wedding goes out in trips
  let p = await L.open(b, '#/fn/now', { who: 'ann', extra: base(), clock: at(today, '18:35'), width: 390, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.fn-svc-row [data-fn="pick"]'));
  const bill = await reads(p), asked = await p.evaluate(() => window.__fake.reads.length);
  ok(await p.$$eval(wedRow + ' [data-fn="pick"]', l => l.length) === 5 && await sendText(p) === 'Send all 14', 'cook: every kind left is a button, and Send all 14 (' + await sendText(p) + ')');
  await pick(p, 'antipasto-platter'); await L.settle(p, 100);
  await pick(p, 'pizza-platter'); await L.settle(p, 100);
  const picked = await p.$$eval(wedRow + ' .fn-svc-k.is-pick', l => l.map(e => e.textContent.replace(/\s+/g, ' ').trim() + '|' + e.getAttribute('aria-pressed')));
  ok(picked.join() === '4 × Antipasto In this trip|true,3 × Pizza In this trip|true' && await sendText(p) === 'Send 7 platters', 'pick: a tap takes all of a kind, in words, and the button says what it sends (' + picked.join() + ' / ' + await sendText(p) + ')');
  ok(/In this trip: 4 Antipasto, 3 Pizza\. Not sent yet\./.test(flat(await txt(p, wedRow))) && !(await p.$(wedRow + ' .fn-svc-k.is-pick .fn-i')), 'pick: the row says the picks are not sent yet, and a pick wears no tick');
  ok(await p.$eval(wedRow, r => { const B = r.closest('.fn-svc-board').getBoundingClientRect(); return [r].concat([...r.querySelectorAll('*')]).every(e => e.getBoundingClientRect().right <= B.right + 1); }), 'pick: at 390 px every word of the row stays on the board (the Not sent yet line wraps)');
  await pick(p, 'pizza-platter', true); await L.settle(p, 100);
  ok(/2 × Pizza of 3 In this trip/.test(flat(await txt(p, wedRow + ' [data-r="0|pizza-platter"].is-pick'))) && await sendText(p) === 'Send 6 platters', 'pick: − takes one off (' + await sendText(p) + ')');
  await pick(p, 'pizza-platter'); await L.settle(p, 100);
  ok(await sendText(p) === 'Send 4 platters', 'pick: a tap on a picked kind takes it out of the trip');
  await pick(p, 'pizza-platter'); await L.settle(p, 100);
  await p.evaluate(() => window.dispatchEvent(new Event('lk-fn'))); await L.settle(p, 200);
  ok(await sendText(p) === 'Send 7 platters', 'pick: the picks stay through a redraw');
  ok(await p.evaluate(k => !Object.keys(window.__fake.dump()).some(x => x.startsWith(k)), key(['fnsent'])), 'pick: nothing is saved before Send');
  // a double tap sends one trip
  await p.evaluate(() => { const b = document.querySelector('.fn-svc-row [data-fn="send"][data-id="wed"]'); b.click(); b.click(); });
  await L.waitFor(p, k => !!window.__fake.dump()[k], TRIP(1));
  await L.settle(p, 400);
  let s = await store(p);
  ok(JSON.stringify(s[TRIP(1)].n) === JSON.stringify({ 'antipasto-platter': 4, 'pizza-platter': 3 }) && s[TRIP(1)].sentBy === 'ann' && s[TRIP(1)].by === 'ann' && s[TRIP(1)].k === 1 && !s[TRIP(2)] && !s[ROUND],
    'send: one trip of 4 Antipasto and 3 Pizza, as Ann; a double tap sends no second trip; the round is not ticked yet (' + JSON.stringify(s[TRIP(1)]) + ')');
  const row1 = flat(await txt(p, wedRow));
  ok(/7 of 14 sent in 1 trip\. 7 left, tap what goes now:/.test(row1) && await p.$$eval(wedRow + ' [data-fn="pick"]', l => l.length) === 3, 'send: the row says how much went, and only what is left can be picked (' + row1.slice(0, 160) + ')');
  const shelf1 = flat(await txt(p, '.fn-svc-shelf'));
  ok(/Waiting for Functions/.test(shelf1) && /18:30 Wedding reception · Marquee · Trip 1 4 Antipasto, 3 Pizza · sent 18:3\d Ann/.test(shelf1) && /Waiting/.test(shelf1) && !!(await p.$('.fn-svc-shelf [data-fn="trip-undo"]')) && !(await p.$('.fn-svc-shelf [data-fn="trip-out"]')),
    'shelf: the trip waits for Functions with who sent it, Undo for the sender, and no Confirm out for the kitchen (' + shelf1.slice(0, 200) + ')');
  ok(/^1 trip waiting for Functions$/.test(flat(await txt(p, '.fn-svc-wl'))), 'board: its top line counts the trips waiting, as a link to the shelf (' + flat(await txt(p, '.fn-svc-wl')) + ')');
  // the wedding's 7 left and the Rotary dinner's 4 Antipasto (due 18:50); the 4 Antipasto and 3 Pizza sent are not counted
  const plate = flat(await txt(p, '.fn-svc-page .fn-next'));
  ok(/To plate now 11 platters/.test(plate) && /4 ?× ?Antipasto/.test(plate) && !/Pizza/.test(plate), 'To plate now leaves out what was sent (' + plate.slice(0, 160) + ')');
  ok(/^Sent trip 1$/.test(await sendText(p)) && await p.$eval(wedRow + ' [data-fn="send"]', b => b.disabled), 'after the answer: the button says Sent trip 1 and rests, so a quick second tap sends nothing');
  // another phone sends the Sliders while Ann has the Sliders and the Fruit picked: her picks shrink, in words
  await pick(p, 'sliders-platter'); await pick(p, 'fruit-platter'); await L.settle(p, 100);
  const samAt = await p.evaluate(() => window.LK_TIME.now());
  await p.evaluate(([k, rec]) => window.__fake.write(k, rec), [TRIP(2), { fid: 'wed', at: RA, day: today, k: 2, n: { 'sliders-platter': 3 }, sentAt: samAt, sentBy: 'sam', by: 'sam' }]);
  await L.settle(p, 1600);
  ok(await sendText(p) === 'Send 2 platters' && /Some of the picks were sent from another phone/.test(flat(await txt(p, wedRow))), 'picks: another phone sent the Sliders, so the picks shrink to the Fruit and say why (' + await sendText(p) + ')');
  // the rest in one trip ticks the round's own Sent record too (older phones read only that)
  await p.click(wedRow + ' [data-fn="pick-clear"]'); await L.settle(p, 100);
  ok(await sendText(p) === 'Send all 4', 'Clear drops the picks: Send all 4');
  await L.settle(p, 1600);
  await p.click(wedRow + ' [data-fn="send"]');
  await L.waitFor(p, k => !!window.__fake.dump()[k], TRIP(3));
  await L.settle(p, 400);
  s = await store(p);
  ok(JSON.stringify(s[TRIP(3)].n) === JSON.stringify({ 'fruit-platter': 2, 'cheese-platter': 2 }) && s[ROUND] && s[ROUND].sent === true && s[ROUND].sentBy === 'ann', 'send all: the last trip and the round\'s own Sent record together');
  ok(!(await p.$(wedRow)) && (await p.$$('.fn-svc-trip')).length === 3, 'send all: the wedding leaves the rows; its three trips wait on the shelf');
  // Undo the last trip (the sender, within 2 minutes): the round is open again
  await p.click('.fn-svc-trip:has-text("Trip 3") [data-fn="trip-undo"]');
  await L.waitFor(p, k => !!(window.__fake.dump()[k] || {}).void, TRIP(3));
  await L.settle(p, 300);
  s = await store(p);
  ok(s[TRIP(3)].void === true && s[TRIP(3)].voidBy === 'ann' && s[ROUND].sent === false && !!(await p.$(wedRow)) && await sendText(p) === 'Send all 4', 'undo: the trip is taken back with the round\'s tick, and the Fruit and Cheese are to send again');
  ok(/Undone: trip 3 of Wedding reception \(2 Fruit, 2 Cheese\)/.test(await txt(p, '.p-toasts') || ''), 'undo: the slip says Undone, by name');
  // a refused send keeps the picks and says so in red
  await L.settle(p, 1600);
  await pick(p, 'fruit-platter'); await L.settle(p, 100);
  await p.evaluate(() => { window.__fake.deny = /_t4$/; });
  await p.click(wedRow + ' [data-fn="send"]'); await L.settle(p, 500);
  ok(/Not saved: trip 4 \(2 Fruit\) was not sent\. Someone may have sent trip 4 first\. Your picks are kept/.test(await txt(p, '.p-toasts') || '') && await sendText(p) === 'Send 2 platters' && !(await store(p))[TRIP(4)], 'refused: a red slip, nothing saved, and the picks are kept (' + flat(await txt(p, '.p-toasts')).slice(0, 160) + ')');
  await p.evaluate(() => { window.__fake.deny = null; });
  await p.click('.p-toast-bad .p-toast-btn').catch(() => {}); await L.settle(p, 100);
  // no signal: the trip says Not sent yet, the button rests, then the signal comes back
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await p.click(wedRow + ' [data-fn="send"]'); await L.settle(p, 300);
  ok(/Trip 4 2 Fruit · Not sent yet/.test(flat(await txt(p, '.fn-svc-shelf'))) && await p.$eval(wedRow + ' [data-fn="send"]', b => b.disabled && /Sending trip 4/.test(b.textContent)), 'no signal: the trip says Not sent yet and the Send rests ("Sending trip 4...")');
  await L.settle(p, 1700);
  ok(await p.$eval(wedRow + ' [data-fn="send"]', b => !b.disabled && b.textContent.trim() === 'Send all 2'), 'no signal: after 1.5 seconds the button is back for what is left');
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  await L.waitFor(p, k => !!window.__fake.dump()[k], TRIP(4)); await L.settle(p, 400);
  ok(/Trip 4 2 Fruit · sent 18:3\d Ann/.test(flat(await txt(p, '.fn-svc-shelf'))), 'signal back: the trip is sent and says who sent it');
  ok(await p.evaluate(() => window.__fake.reads.length) === asked, 'the service view, picks and sends ask for no read: only the listener hears each saved trip (' + (await reads(p) - bill) + ' billed by it)');
  ok(p.errors.length === 0 && !(await L.overflow(p)), '390 px cook: no page errors, no sideways scroll ' + p.errors.join(' | '));
  s = await store(p);
  await p.context().close();

  // 2. Fay, Functions only, at 18:40: her Home band and her service view
  const later = Object.assign({}, s);
  p = await L.open(b, '#/', { who: 'fay', extra: later, clock: at(today, '18:40'), width: 390, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('#fn-band [data-fn="trip-out"]'));
  ok(/Trip 1: 4 × Antipasto, 3 × Pizza, sent 18:3\d Ann/.test(flat(await txt(p, '#fn-band .fn-li-out'))) && /\+2 more waiting/.test(flat(await txt(p, '#fn-band .fn-li-out'))), 'Fay\'s band: the oldest trip with Confirm out beside the row, and how many more wait (' + flat(await txt(p, '#fn-band .fn-li-out')).slice(0, 160) + ')');
  await p.click('#fn-band [data-fn="trip-out"]');
  await L.waitFor(p, k => !!(window.__fake.dump()[k] || {}).outAt, TRIP(1)); await L.settle(p, 300);
  let t1 = (await store(p))[TRIP(1)];
  ok(t1.outBy === 'fay' && t1.outFor === false && t1.by === 'fay', 'Fay confirms trip 1 from her band');
  ok(/Trip 2: 3 × Sliders, sent 18:3\d Sam/.test(flat(await txt(p, '#fn-band .fn-li-out'))), 'Fay\'s band moves on to the next trip waiting');
  await p.goto(L.BASE + '#/fn/now'); await L.settle(p, 800);
  await L.waitFor(p, () => !!document.querySelector('.fn-svc-shelf'));
  const fayPage = await p.evaluate(() => ({ send: document.querySelectorAll('[data-fn="send"], [data-fn="pick"]').length, first: (document.querySelector('.fn-svc-board > :nth-child(2)') || {}).className, out: document.querySelectorAll('.fn-svc-shelf [data-fn="trip-out"]').length }));
  ok(fayPage.send === 0 && fayPage.first === 'fn-svc-shelf' && fayPage.out === 2, 'Fay\'s service view: the shelf first, Confirm out on each trip, no send or pick buttons (' + JSON.stringify(fayPage) + ')');
  ok(/Out today: 1 trip\. Last: Wedding reception trip 1, 18:40 Fay\./.test(flat(await txt(p, '.fn-svc-outs'))), 'Fay\'s service view: Out today names the last trip confirmed');
  await p.click('.fn-svc-trip:has-text("Trip 2") [data-fn="trip-out"]');
  await L.waitFor(p, k => !!(window.__fake.dump()[k] || {}).outAt, TRIP(2)); await L.settle(p, 300);
  ok((await p.$$('.fn-svc-trip')).length === 1, 'Fay confirms trip 2 on the shelf: one trip left waiting');
  ok(p.errors.length === 0 && !(await L.overflow(p)), '390 px Fay: no page errors, no sideways scroll ' + p.errors.join(' | '));
  s = await store(p);
  await p.context().close();

  // 3. Sam, sous chef, at 18:46: trip 4 waited 11 minutes, so Sam may confirm it for Functions
  p = await L.open(b, '#/fn/now', { who: 'sam', extra: Object.assign({}, s), clock: at(today, '18:46'), width: 390, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.fn-svc-trip'));
  ok(/Waiting 1\d min/.test(flat(await txt(p, '.fn-svc-trip'))) && !!(await p.$('.fn-svc-trip [data-fn="trip-for"]')) && !(await p.$('.fn-svc-trip [data-fn="trip-out"]')), 'Sam: after 10 minutes the trip says Waiting N min and a chef can confirm it for Functions');
  await p.click('.fn-svc-trip [data-fn="trip-for"]');
  await L.waitFor(p, k => !!(window.__fake.dump()[k] || {}).outAt, TRIP(4)); await L.settle(p, 300);
  const t4 = (await store(p))[TRIP(4)];
  ok(t4.outBy === 'sam' && t4.outFor === true, 'Sam confirms trip 4 for Functions');
  ok(/trip 4, 18:46 Sam for Functions\./.test(flat(await txt(p, '.fn-svc-outs'))), 'Out today says a chef confirmed it for Functions');
  await p.context().close();

  // 4. after the wedding's window, a trip still waiting keeps it on the board and says Not confirmed
  const late = Object.assign({}, s, { [TRIP(5)]: { fid: 'wed', at: RA, day: today, k: 5, n: { 'cheese-platter': 2 }, sentAt: at(today, '18:50'), sentBy: 'ann', by: 'ann' } });
  p = await L.open(b, '#/recipes', { who: 'fay', extra: late, clock: at(today, '19:45'), width: 390, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('#fn-band [data-fn="trip-out"]')).catch(() => {});
  ok(/Wedding reception/.test(flat(await txt(p, '#fn-band'))) && /Not confirmed/.test(flat(await txt(p, '#fn-band'))), 'after its window: the wedding stays on the band while a trip waits, and says Not confirmed (' + flat(await txt(p, '#fn-band')).slice(0, 160) + ')');
  await p.context().close();
  // a damaged trip (another phone, or a bad record): words only, no markup; a count that is not a whole number is left out
  const P = 'Zz<i id="pwn"></i><img src=x onerror="window.__pwn=1">" data-pwn="1';
  const bad = Object.assign({}, s, { [TRIP(7)]: { fid: 'wed', at: RA, day: today, k: 7, n: { [P]: 2, 'fruit-platter': '1" data-pwn="1' }, sentAt: at(today, '18:38'), sentBy: P, by: P } });
  p = await L.open(b, '#/fn/now', { who: 'fay', extra: bad, clock: at(today, '18:40'), width: 390, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.fn-svc-shelf'));
  await p.goto(L.BASE + '#/'); await L.settle(p, 900);
  ok(await p.evaluate(() => !document.getElementById('pwn') && !document.querySelector('[data-pwn]') && !window.__pwn), 'a damaged trip shows no markup on the shelf or the band');
  await p.goto(L.BASE + '#/fn/now'); await L.settle(p, 600);
  ok(/Trip 7 2 no longer booked · /.test(flat(await txt(p, '.fn-svc-shelf'))) && await p.evaluate(() => !document.getElementById('pwn') && !document.querySelector('[data-pwn]') && !window.__pwn), 'a damaged trip: an unknown platter is counted as no longer booked, its bad count left out (' + flat(await txt(p, '.fn-svc-shelf')).slice(0, 200) + ')');
  await p.context().close();

  // 5. every size: no sideways scroll, no errors, picks and the shelf on screen
  for (const w of [768, 1280]) {
    for (const who of ['ann', 'fay']) {
      p = await L.open(b, '#/fn/now', { who, extra: Object.assign({}, s), clock: at(today, '18:40'), width: w, height: 900, wait: 1500 });
      await L.waitFor(p, () => !!document.querySelector('.fn-svc-board'));
      if (who === 'ann') { await pick(p, 'cheese-platter').catch(() => {}); await L.settle(p, 200); }
      ok(p.errors.length === 0 && !(await L.overflow(p)), w + ' px ' + who + ': no page errors, no sideways scroll ' + p.errors.join(' | '));
      await p.context().close();
    }
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
