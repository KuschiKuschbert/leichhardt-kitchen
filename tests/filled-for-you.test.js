// Filled for you (head chef, 13 Nov 2026, docs/smart-book-options/brief.md): an item typed in full fills what describes
// it from its last 2 weeks (Wastage: section, reason, unit; Transfers: unit), never the amount, says so in words under
// the boxes and in a tag, takes it away again for a new name or Empty these boxes, and never fills over what was typed.
// Orders keeps its usual amount fill, now said right under the box, with no second "Add" chip for the same amount.
// On the code before this change, typing "Rice" in full filled nothing (docs/smart-book-options/baseline/waste-exact-390.png).
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const extra = Object.assign({}, L.wasteSum([
  { t: 'Rice', n: 2, r: { expired: 2 }, unit: 'portions', reason: 'expired', sec: 'Pans', amt: 4, last: { unit: 'portions', reason: 'expired', sec: 'Pans', amt: 4 } }
]));
extra[fsKey(['summary', 'transfers'])] = { day: today, from: today, to: today, at: L.NOW - 3600000, venues: [{ v: 'Riviera', n: 2, out: 2, in: 0, people: ['Jess'] }],
  items: [{ t: 'Lemons', n: 2, unit: 'pieces', amt: 12, dir: 'out', venue: 'Riviera' }] };
extra[fsKey(['ordlearned', 'duck-fat'])] = { text: 'Duck fat', uses: 6, dow: {}, qtys: { a: { q: '2 tubs', n: 5 } } };
const form = p => p.evaluate(() => {
  const q = s => document.querySelector(s), pressed = sel => (q(sel + '[aria-checked="true"]') || {}).getAttribute ? q(sel + '[aria-checked="true"]').getAttribute('data-v') : '';
  const note = q('#w-fill');
  return { sec: q('#w-sec').value, secTag: !!q('.lk-fb.is-filled #w-sec'), reason: pressed('[data-p="wreason"]'), unit: pressed('[data-p="wunit"]'), amt: q('#w-amt').value,
    note: note && !note.hidden ? note.textContent.replace(/\s+/g, ' ').trim() : '', weigh: q('#w-amt').classList.contains('lk-weigh'),
    why: !q('#w-why').hidden, btn: q('.w-add .nb-addbtn').textContent.trim(), off: q('.w-add .nb-addbtn').getAttribute('aria-disabled') === 'true',
    reasonTag: !q('#w-reason-l .lk-ftag').hidden, unitTag: !q('#w-unit-l .lk-ftag').hidden };
});
const leave = p => p.evaluate(() => { const el = document.querySelector('#w-text'); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); });
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/waste', { who: 'bo', extra, wait: 1500, touch: true });
  await L.wLog(p);

  // 1. the full name, left with Next: section, reason and unit filled and named; the amount stays the cook's
  await p.fill('#w-text', 'Rice'); await leave(p); await L.settle(p, 200);
  let f = await form(p);
  ok(f.sec === 'Pans' && f.secTag && f.reason === 'expired' && f.unit === 'portions' && f.amt === '', 'typed in full: section, reason and unit filled, amount empty (' + JSON.stringify(f) + ')');
  ok(/^Last time \(logged 2 times in the last 2 weeks\): Pans, Expired stock, in portions\. Weigh or count it and write today's amount\. ?Empty these boxes$/.test(f.note), 'the line under the boxes names what was filled (' + f.note + ')');
  ok(f.reasonTag && f.unitTag && f.weigh && f.why && f.off && f.btn === 'Log it', 'LAST TIME tags on Reason and Unit, the amount box outlined, Log it off with its words');
  await p.fill('#w-amt', '3'); await L.settle(p, 150);
  f = await form(p);
  ok(f.btn === 'Log 3 portions Rice' && !f.off && !f.why && /Change anything before you log it\./.test(f.note), 'an amount written: Log it says what it saves (' + f.btn + ')');
  await p.click('.w-add .nb-addbtn'); await L.settle(p, 400);
  const saved = await p.evaluate(d => Object.entries(window.__fake.dump()).filter(([k, v]) => k.indexOf('/waste/' + d + '/lines/') > 0 && v.text === 'Rice').map(([, v]) => v), today);
  ok(saved.length === 1 && saved[0].amount === 3 && saved[0].unit === 'portions' && saved[0].reason === 'expired' && saved[0].station === 'Pans', 'Log it saves the filled values with the typed amount (' + JSON.stringify(saved) + ')');

  const next = await form(p);
  ok(next.sec === '' && next.unit === 'kg', 'after Log it, the filled section and unit are not kept for the next line (' + next.sec + ', ' + next.unit + ')');

  // 2. a new name takes the filled values away, and keeps what the cook typed
  await p.fill('#w-text', 'Rice'); await leave(p); await L.settle(p, 200);
  await p.fill('#w-amt', '1.5'); await p.fill('#w-text', 'Rice salad'); await L.settle(p, 200);
  f = await form(p);
  ok(f.sec === '' && !f.secTag && f.reason === '' && f.unit === 'portions' && f.amt === '1.5' && f.note === '', 'a new name: the filled section, reason and tags go; the typed amount stays in the unit it was written in (' + JSON.stringify(f) + ')');
  await p.context().close();

  // 3. what the cook typed first is never filled over; Empty these boxes empties only what the book filled
  p = await L.open(b, '#/waste', { who: 'bo', extra, wait: 1500, touch: true });
  await L.wLog(p);
  await p.fill('#w-sec', 'Grill'); await p.fill('#w-text', 'Rice'); await leave(p); await L.settle(p, 200);
  f = await form(p);
  ok(f.sec === 'Grill' && !f.secTag && f.reason === 'expired' && /: Expired stock, in portions\./.test(f.note), 'a typed section is kept; only the empty boxes fill (' + JSON.stringify(f) + ')');
  await p.fill('#w-amt', '2'); await p.click('[data-p="w-unfill"]'); await L.settle(p, 200);
  f = await form(p);
  ok(f.sec === 'Grill' && f.reason === '' && f.unit === 'kg' && f.amt === '2' && f.note === 'Emptied the boxes from last time.', 'Empty these boxes: the filled reason and unit go, the typed section and amount stay (' + JSON.stringify(f) + ')');
  await p.context().close();

  // 4. leaving the name box by tapping a reason: the tap lands, and the fill does not change it
  p = await L.open(b, '#/waste', { who: 'bo', extra, wait: 1500, touch: true });
  await L.wLog(p);
  await p.fill('#w-text', 'Rice'); await p.click('[data-p="wreason"][data-v="excess"]'); await L.settle(p, 300);
  f = await form(p);
  ok(f.reason === 'excess' && f.sec === 'Pans' && f.unit === 'portions' && !f.reasonTag, 'a tap that leaves the box lands: the reason picked stays, the rest fills (' + JSON.stringify(f) + ')');
  ok(p.errors.length === 0, 'wastage: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 5. Transfers: the unit fills from last time, never the amount
  p = await L.open(b, '#/transfers', { who: 'bo', extra, wait: 1500, touch: true });
  await L.xLog(p);
  await p.fill('#tr-text', 'Lemons'); await p.evaluate(() => { const el = document.querySelector('#tr-text'); el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); }); await L.settle(p, 200);
  const x = await p.evaluate(() => ({ unit: (document.querySelector('[data-p="tr-unit"][aria-checked="true"]') || {}).textContent, amt: document.querySelector('#tr-amt').value, note: (document.querySelector('#tr-fill') || {}).textContent || '', tag: !document.querySelector('#tr-unit-l .lk-ftag').hidden }));
  ok(x.unit === 'pieces' && x.amt === '' && x.tag && /^Last time it was in pieces\. Write today's amount\.Put back kg$/.test(x.note.replace(/\s+/g, ' ').trim()), 'transfers: the unit fills and says so, the amount stays empty (' + JSON.stringify(x) + ')');
  ok(p.errors.length === 0, 'transfers: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 6. Orders: the usual amount fills as before, now said under the box with a USUAL tag, and no second Add chip
  p = await L.open(b, '#/orders', { who: 'ann', extra, wait: 1500, touch: true });
  await L.oLog(p);
  await p.fill('#o-text', 'Duck fat'); await L.settle(p, 300);
  const o = await p.evaluate(() => ({ qty: document.querySelector('#o-qty').value, tag: !!document.querySelector('.lk-fb.is-filled #o-qty'), note: (document.querySelector('#o-fill:not([hidden])') || {}).textContent || '', chips: document.querySelectorAll('[data-p="oqset"]').length, hint: document.querySelector('#o-hint').textContent }));
  ok(o.qty === '2 tubs' && o.tag && /^Filled with the usual amount: 2 tubs \(ordered 5 times with this amount\)\. Change it if you need more or less\.$/.test(o.note.trim()) && o.chips === 0 && !/Usual amount filled in/.test(o.hint), 'orders: the usual amount fills, is named under the box, and no second Add chip (' + JSON.stringify(o) + ')');
  await p.fill('#o-qty', '3 tubs'); await L.settle(p, 150);
  const o2 = await p.evaluate(() => ({ tag: !!document.querySelector('.lk-fb.is-filled #o-qty'), note: !document.querySelector('#o-fill').hidden }));
  ok(!o2.tag && !o2.note, 'orders: a typed amount takes the tag and the line away');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 7. no sideways scroll with a fill showing, at the three widths
  for (const w of [390, 768, 1280]) {
    p = await L.open(b, '#/waste', { who: 'bo', extra, width: w, height: w === 390 ? 844 : 900, wait: 1500, touch: true });
    await L.wLog(p); await p.fill('#w-text', 'Rice'); await leave(p); await L.settle(p, 200);
    ok(await L.overflow(p) <= 0, w + ' px: no sideways scroll with the fill showing (' + await L.overflow(p) + ')');
    await p.context().close();
  }
  L.report(R); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
