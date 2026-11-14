// Functions in the redesign (step 5, 8 Nov 2026, head chef; docs/whole-app-redesign-options/brief.md, every-page.html
// e-fn and e-service). #/fn is Today then Upcoming on one page: each function one card with its next round today and its
// notes in short, Cancel at the card's end; the days with nothing booked fold into one line. The function card keeps
// every part, with Cancel alone at its end, away from Print. The service view is a live board: how long until each
// round goes, the dietaries on every round, Sent as before, both prints at the end. The band is dark like Home's board.
// No reads of its own. All records and people here are made up.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results(), { txt } = L;
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm));
const cfg = {
  people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true, fn: false },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true, fn: false },
    { id: 'bo', name: 'Bo', role: 'head', add: true, tick: true, del: true, active: true, fn: false }
  ], headId: 'bo', sousIds: ['sam', 'bo'], pingIds: ['sam', 'bo'], fnIds: [], staffIds: ['sam', 'ann', 'bo'], showBadges: true
};
function fn(o) {
  const date = o.date || today, rounds = (o.rounds || ['18:30']).map(x => ({ at: at(date, x), note: '' }));
  return M.derive({ v: 1, status: 'confirmed', name: o.name, date, start: at(date, o.start || '13:30'), loc: o.loc || 'Function room', guests: o.guests || 40,
    mode: rounds.length > 1 ? 'stag' : 'all', notes: o.notes || '', kc: '', kcBy: '', kcAt: 0, rounds,
    lines: (o.lines || [['antipasto-platter', 'Antipasto Platter', [3]]]).map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: '', fp: '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: {}, chg: [], cBy: 'bo', cAt: 1, confBy: 'bo', confAt: 1, by: 'bo', upd: L.NOW - 3600000 });
}
const F = {
  b60: fn({ name: 'Birthday 60th', start: '13:45', rounds: ['14:10', '14:50', '15:30'], notes: '3 gluten free, 1 vegan. <b>Nut</b> allergy at table 4.',
    lines: [['antipasto-platter', 'Antipasto Platter', [2, 1, 0]], ['pizza-platter', 'Pizza Platter', [2, 2, 1]]] }),
  club: fn({ name: 'Club lunch', start: '12:00', rounds: ['14:30'], guests: 25, loc: 'Beer garden', lines: [['antipasto-platter', 'Antipasto Platter', [4]]] }),
  wed: fn({ name: 'Wedding reception', date: M.addDays(today, 1), start: '17:30', rounds: ['18:30'], guests: 80 }),
  quiz: fn({ name: 'Quiz night', date: M.addDays(today, 3), start: '18:00', rounds: ['19:00'], guests: 30 })
};
const extra = (fs = F) => Object.assign({ [key(['config', 'main'])]: cfg }, ...Object.keys(fs).map(id => ({ [key(['functions', id])]: fs[id] })));
const reads = p => p.evaluate(() => window.__fake.bill.reduce((n, x) => n + x.n, 0));
const flat = s => (s || '').replace(/\s+/g, ' ').trim();
(async () => {
  const b = await L.start();

  // 1. #/fn for a sous chef: Today, then Upcoming with only the booked days, the empty day in one quiet line
  let p = await L.open(b, '#/fn', { who: 'sam', extra: extra(), width: 390, height: 844, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.fn-list-page .fn-card'));
  const secs = await p.$$eval('.fn-list-page .fn-sec-h', l => l.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ok(secs.length === 2 && /^Today /.test(secs[0]) && /^Upcoming functions the next 7 days$/.test(secs[1]), 'list: Today, then Upcoming functions, as headings on one page (' + secs.join(' | ') + ')');
  const cards = await p.$$eval('.fn-list-page .fn-card', l => l.map(c => ({ eb: (c.querySelector('.fn-c0') || {}).textContent, name: c.querySelector('.fn-c1 b').textContent,
    next: ((c.querySelector('.fn-cnext') || {}).textContent || '').replace(/\s+/g, ' ').trim(), note: ((c.querySelector('.fn-cnote') || {}).textContent || ''),
    noteHtml: !!(c.querySelector('.fn-cnote b')), last: c.lastElementChild.className, cancel: !!c.querySelector('.fn-card-actions [data-fn="status"]') })));
  const c60 = cards.filter(c => c.name === 'Birthday 60th')[0] || {};
  ok(cards.map(c => c.name).join() === 'Birthday 60th,Club lunch,Wedding reception,Quiz night', 'list: today\'s two by the next round, then the booked days (' + cards.map(c => c.name).join() + ')');
  ok(c60.eb === 'Event 13:45 · Function room · 40 guests' && /^Next out 14:10 Round 1 of 3: 2 × Antipasto, 2 × Pizza \(4 of 8\)$/.test(c60.next), 'a card today: the event line, and what goes out next (' + c60.eb + ' / ' + c60.next + ')');
  ok(/Notes 3 gluten free, 1 vegan\. <b>Nut<\/b> allergy/.test(c60.note) && !c60.noteHtml, 'a card: the service and dietary notes in short, as text (' + c60.note + ')');
  ok(cards.filter(c => c.name === 'Wedding reception')[0].next === '', 'a card on another day: no next round');
  ok(cards.every(c => c.last === 'fn-card-actions' && c.cancel), 'Cancel is the last thing on every card');
  const days = await p.$$eval('.fn-list-page .fn-day h4', l => l.map(e => e.textContent));
  const quiet = await txt(p, '.fn-quiet') || '';
  ok(days.join() === [M.dayName(M.addDays(today, 1)), M.dayName(M.addDays(today, 3))].join() && quiet === 'Nothing booked on the other 5 days.', 'Upcoming, a week ahead (10 Nov 2026): only the booked days; the 5 empty ones in one line (' + days.join() + ' / ' + quiet + ')');
  ok((await p.$$('.fn-list-page [data-fn="print-prep"]')).length === 3, 'Print prep sheet: today and each booked day only');
  ok(p.errors.length === 0 && !(await L.overflow(p)), '390 px list: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.click('[data-fn="days"][data-v="14"]'); await L.settle(p, 300);
  ok(await txt(p, '.fn-quiet') === 'Nothing booked on the other 12 days.', 'the next 14 days: the 12 empty days in one line (' + await txt(p, '.fn-quiet') + ')');
  const bill = await reads(p);

  // 2. the function card: every part, Print with the others, Cancel alone at the end
  await p.click('.fn-card a[href="#/fn/b60"]'); await L.settle(p, 500);
  await L.waitFor(p, () => !!document.querySelector('.fn-cardbox'));
  const card = await p.evaluate(() => {
    const box = document.querySelector('.fn-cardbox'), end = box.lastElementChild, print = box.querySelector('[data-fn="print"]'), sent = box.querySelector('.fn-next [data-fn="send"]');
    const cs = sent && getComputedStyle(sent), lum = c => { const m = c.match(/\d+/g).map(Number); return (m[0] * 299 + m[1] * 587 + m[2] * 114) / 1000; };
    return { end: end.className, cancelAtEnd: !!end.querySelector('[data-fn="status"][data-v="cancel"]'), printRow: print.closest('.btn-row') && !print.closest('.btn-row').querySelector('[data-fn="status"]'),
      parts: ['.fn-sub', '.fn-next', '.fn-whole', '.fn-rounds', '.fn-acts'].every(s => !!box.querySelector(s)), sentReadable: !!cs && Math.abs(lum(cs.color) - lum(cs.backgroundColor)) > 100 };
  });
  ok(card.end === 'fn-end' && card.cancelAtEnd && card.printRow, 'card: Cancel alone at the end, away from Print (' + JSON.stringify(card) + ')');
  ok(card.parts && card.sentReadable, 'card: the date line, Next out, the whole function, every round and the buttons; Sent readable on the dark box');
  ok(/Takes its platters off the prep and order lists/.test(await txt(p, '.fn-end') || ''), 'card: one line says what Cancel does');
  ok(await reads(p) === bill, 'opening a function reads nothing');
  ok(p.errors.length === 0 && !(await L.overflow(p)), '390 px card: no page errors, no sideways scroll ' + p.errors.join(' | '));

  // 3. the service view: the board with the time left, the dietaries on every round, the prints at the end
  await p.goto(L.BASE + '#/fn/now'); await L.settle(p, 600);
  // every round still to go: the birthday's three and the club lunch, in time order (8 Nov 2026, as drawn)
  await L.waitFor(p, () => document.querySelectorAll('.fn-svc-board .fn-svc-row').length === 4);
  const rows = await p.$$eval('.fn-svc-board .fn-svc-row', l => l.map(r => ({ t: r.textContent.replace(/\s+/g, ' ').trim(), cd: r.querySelector('.fn-svc-cd').textContent,
    diet: ((r.querySelector('.fn-svc-diet') || {}).textContent || ''), html: !!r.querySelector('.fn-svc-diet b') })));
  ok(/^14:10 Birthday 60th · Function room · round 1 of 3/.test(rows[0].t) && rows[0].cd === 'In 10 min' && rows[1].cd === 'In 30 min' && rows[2].cd === 'In 50 min' && rows[3].cd === 'In 1 h 30 min' && /^14:30 Club lunch/.test(rows[1].t) && /round 3 of 3/.test(rows[3].t), 'service: every round in time order, each saying how long until it goes (' + rows.map(r => r.cd).join(', ') + ')');
  ok(/^Dietaries and notes3 gluten free, 1 vegan\. <b>Nut<\/b> allergy at table 4\.$/.test(rows[0].diet) && !rows[0].html && rows[1].diet === '' && rows[2].diet === rows[0].diet && rows[3].diet === rows[0].diet, 'service: the dietaries on every round, as text; none where the booking has none (' + rows[0].diet + ')');
  ok(rows.every(r => !/Later/.test(r.t)), 'service: one state a row: no Later beside a time left');
  const ends = await p.evaluate(() => { const bd = document.querySelector('.fn-svc-board'), pr = document.querySelector('.fn-svc-prints'); return !!pr && !!(bd.compareDocumentPosition(pr) & Node.DOCUMENT_POSITION_FOLLOWING) && !!pr.querySelector('[data-fn="print-prep"]') && !!pr.querySelector('[data-fn="print-day"]'); });
  ok(ends, 'service: both prints at the end, after the board');
  ok(await reads(p) === bill, 'the service view reads nothing (before a tick: its own record comes back through the listener, as before)');
  await p.click('.fn-svc-row [data-fn="send"][data-id="b60"]'); await L.settle(p, 500);
  ok(await p.evaluate(k => !!(window.__fake.dump()[k] || {}).sent, key(['fnsent', 'b60_' + F.b60.rounds[0].at])) && /^14:30 /.test(flat(await txt(p, '.fn-svc-board .fn-svc-row'))), 'service: Send all ticks the round as before (the round\'s own Sent record), and the next one leads');
  ok(p.errors.length === 0 && !(await L.overflow(p)), '390 px service: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // a round past its time: late, and by how much
  p = await L.open(b, '#/fn/now', { who: 'sam', extra: extra(), clock: at(today, '14:16'), width: 390, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.fn-svc-board .fn-svc-row'));
  ok(await txt(p, '.fn-svc-row.is-late .fn-svc-cd') === '6 min late' && /Late/.test(await txt(p, '.fn-svc-row.is-late .fn-svc-top') || ''), 'service: a late round says Late and how late (' + await txt(p, '.fn-svc-row.is-late .fn-svc-cd') + ')');
  await p.context().close();

  // the night as drawn (every-page.html e-service, 8 Nov 2026 audit): at 18:10, rounds at 18:30, 19:15 and 20:00 are all on
  // the board, in order, each with the dietaries and its own Sent, one state each (it showed only the next round)
  const night = { eve: fn({ name: 'Birthday 60th', start: '17:30', rounds: ['18:30', '19:15', '20:00'], notes: '3 gluten free, 1 vegan.', lines: [['antipasto-platter', 'Antipasto Platter', [2, 2, 1]]] }) };
  p = await L.open(b, '#/fn/now', { who: 'sam', extra: extra(night), clock: at(today, '18:10'), width: 390, wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('.fn-svc-board .fn-svc-row').length === 3).catch(() => {});
  const nr = await p.$$eval('.fn-svc-board .fn-svc-row', l => l.map(r => ({ t: r.querySelector('.fn-due').textContent, cd: r.querySelector('.fn-svc-cd').textContent, top: r.querySelector('.fn-svc-top').textContent,
    diet: ((r.querySelector('.fn-svc-dt') || {}).textContent || ''), sent: !!r.querySelector('[data-fn="send"]') })));
  ok(nr.map(r => r.t).join() === '18:30,19:15,20:00' && nr.map(r => r.cd).join() === 'In 20 min,In 1 h 5 min,In 1 h 50 min', 'service at 18:10: all three rounds in order, each with its time left (' + JSON.stringify(nr.map(r => [r.t, r.cd])) + ')');
  ok(nr.every(r => r.diet === '3 gluten free, 1 vegan.' && r.sent), 'service at 18:10: the dietaries and a Sent on every round');
  ok(nr.every(r => !(/Later/.test(r.top) && /In \d/.test(r.cd))) && !(await p.$('.fn-svc-page .fn-rounds')), 'service at 18:10: no row says Later and In N min; no second list of the next hour');
  ok(p.errors.length === 0 && !(await L.overflow(p)), 'service at 18:10: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.screenshot({ path: '/tmp/claude-0/-home-user-leichhardt-kitchen/36563980-12d7-5a57-ba66-3e8ec92e72c1/scratchpad/gap-service-390.png', fullPage: true }).catch(() => {});
  await p.context().close();

  // 4. the band: dark like Home's board, and the tags still readable
  p = await L.open(b, '#/recipes', { who: 'ann', extra: extra(), width: 390, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('#fn-band .fn-row'));
  const band = await p.evaluate(() => { const bd = document.getElementById('fn-band'), row = bd.querySelector('.fn-row'); return { bg: getComputedStyle(bd).backgroundColor, text: getComputedStyle(row).color }; });
  ok(band.bg === 'rgb(43, 42, 39)' && band.text === 'rgb(251, 248, 241)', 'band: dark, with light words (' + JSON.stringify(band) + ')');
  ok(!(await p.$('[data-fn="status"]')), 'staff: no Cancel anywhere');
  await p.goto(L.BASE + '#/fn'); await L.settle(p, 600);
  await L.waitFor(p, () => !!document.querySelector('.fn-list-page .fn-card'));
  ok(await p.$$eval('.fn-card', l => l.length === 4 && l.every(c => !c.querySelector('.fn-card-actions, [data-fn="status"]'))), 'staff: the cards end with what is booked, no Cancel');
  await p.context().close();

  // 5. nothing booked at all in the coming days: one line
  p = await L.open(b, '#/fn', { who: 'sam', extra: extra({ b60: F.b60 }), width: 390, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.fn-quiet'));
  ok(await txt(p, '.fn-quiet') === 'Nothing booked in the next 7 days.' && !(await p.$('.fn-day')), 'no function in the coming days: one line, no empty days');
  await p.context().close();

  // 6. every size: no sideways scroll, no errors, Cancel at the card's end
  for (const w of [768, 1280]) {
    for (const route of ['#/fn', '#/fn/b60', '#/fn/now']) {
      p = await L.open(b, route, { who: 'sam', extra: extra(), width: w, height: 900, wait: 1500 });
      await L.waitFor(p, () => !!document.querySelector('.fn-page'));
      await L.settle(p, 300);
      ok(p.errors.length === 0 && !(await L.overflow(p)), w + ' px ' + route + ': no page errors, no sideways scroll ' + p.errors.join(' | '));
      await p.context().close();
    }
  }

  // 7. Cancel from the end of the card still cancels, with Undo on the slip
  p = await L.open(b, '#/fn/club', { who: 'sam', extra: extra(), width: 390, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.fn-end [data-fn="status"][data-id="club"]'));
  await p.click('.fn-end [data-fn="status"][data-id="club"]');
  await L.waitFor(p, k => (window.__fake.dump()[k] || {}).status === 'cancelled' && !window.LK_FN.statusBusy('club'), key(['functions', 'club']));
  await L.waitFor(p, () => !!document.querySelector('.p-toasts .p-toast-btn'));
  ok(/cancelled/.test(await txt(p, '.p-toasts') || '') && !!(await p.$('.fn-end [data-fn="status"][data-v="undo"]')), 'Cancel at the end cancels, says so with Undo, and the end offers Undo cancel');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
