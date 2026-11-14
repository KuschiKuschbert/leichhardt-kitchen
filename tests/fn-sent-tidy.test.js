// Function sent, lines off (head chef, 14 Nov 2026, docs/fn-sent-tidy-options/brief.md): once every round of a function
// is ticked Sent and the server holds the ticks, its open platter lines, its stock order line and the lines added for it
// from What the platters need leave the prep and order lists on every phone. The phone that ticked the last round names
// what came off, with Undo; a line leaving on another phone holds its place a moment (longer while a finger is down);
// the Functions tab stays with a sentence; Put back keeps a line; a held tick, a double tap and a tick made days early
// take nothing off.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const today = L.ymd(new Date(L.NOW)), tomorrow = M.addDays(today, 1), D8 = today.replace(/-/g, '');
const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
const R1 = at(today, '12:00'), R2 = at(today, '12:45');
// Smith 60th, today at lunch: two rounds (L.NOW is 14:00), Aussie and Pizza platters
const smith = M.derive({ v: 1, status: 'confirmed', name: 'Smith 60th', date: today, start: at(today, '11:30'), loc: 'Function room', guests: 60, mode: 'stag', notes: '', kc: '', kcBy: '', kcAt: 0,
  rounds: [{ at: R1, note: '' }, { at: R2, note: '' }], od: M.addDays(today, -2),
  lines: [['aussie-platter', 'Aussie Platter', [3, 2]], ['pizza-platter', 'Pizza Platter', [2, 3]]].map(([rid, name, a]) => ({ rid, name, unit: 'platter', spec: '', fp: '', qty: a[0] + a[1], u: M.toU(a) })),
  was: {}, chg: [], cBy: 'sam', cAt: 1, confBy: 'sam', confAt: 1, by: 'sam', upd: L.NOW - 3 * 86400000 });
// Jones, tomorrow: its Sent ticked today by mistake, a day early, so it never counts
const jones = M.derive({ v: 1, status: 'confirmed', name: 'Jones', date: tomorrow, start: at(tomorrow, '17:30'), loc: '', guests: 30, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
  rounds: [{ at: at(tomorrow, '18:00'), note: '' }], od: today, lines: [{ rid: 'pizza-platter', name: 'Pizza Platter', unit: 'platter', spec: '', fp: '', qty: 2, u: M.toU([2]) }],
  was: {}, chg: [], cBy: 'sam', cAt: 1, confBy: 'sam', confAt: 1, by: 'sam', upd: L.NOW - 86400000 });
const sentRec = (fid, r, sentAt) => ({ fid, at: r, day: M.kday(r), sent: true, sentAt, sentBy: 'ann', by: 'ann' });
function docs(sent) {
  const e = { [fsKey(['functions', 'smith'])]: smith, [fsKey(['functions', 'jones'])]: jones };
  smith.lines.forEach((l, k) => {
    e[fsKey(['days', today, 'items', 'fn-smith-' + l.rid])] = Object.assign({}, M.prepBody(smith, l, 'smith'), { deleted: false, addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3 * 86400000, done: k === 0 },
      k === 0 ? { doneBy: 'Ann', doneById: 'ann', doneAt: at(today, '11:40') } : {});
  });
  const ob = M.orderBody(smith, 'smith'), jb = M.orderBody(jones, 'jones');
  e[fsKey(['orders', today, 'lines', 'r' + D8 + '-fn-smith'])] = { text: ob.text, qty: ob.qty, recipes: ob.recipes, addedBy: 'Rolled over', addedById: '', addedAt: L.NOW - 8 * 3600000, ordered: false, deleted: false, rolled: 2, root: 'fn-smith', from: 'fn-smith', rolledFrom: M.addDays(today, -1), origBy: 'Sam' };
  e[fsKey(['orders', today, 'lines', 'fn-jones'])] = Object.assign({}, jb, { addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, ordered: false, deleted: false });
  e[fsKey(['days', today, 'items', 'need0'])] = { text: 'Party pies', qty: '50', station: 'Larder', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 26 * 3600000, done: false, deleted: false, fnFor: ['smith'] };
  e[fsKey(['fnsent', 'jones_' + at(tomorrow, '18:00')])] = sentRec('jones', at(tomorrow, '18:00'), L.NOW - 600000);
  if (sent >= 1) e[fsKey(['fnsent', 'smith_' + R1])] = sentRec('smith', R1, R1 + 120000);
  if (sent >= 2) e[fsKey(['fnsent', 'smith_' + R2])] = sentRec('smith', R2, R2 + 180000);
  return e;
}
const rowText = p => p.evaluate(() => [...document.querySelectorAll('.nb-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));

(async () => {
  const b = await L.start();

  // 1. the function went out before the page opened: its open lines are already off, the Functions tab stays and says what
  let p = await L.open(b, '#/prep', { who: 'ann', extra: docs(2), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.nb-tab-fn'), null, 6000).catch(() => {});
  let rows = await rowText(p);
  ok(!rows.some(t => /Party pies/.test(t)), 'prep: the line added for Smith 60th is off the list once it is all sent (' + rows.join(' | ').slice(0, 200) + ')');
  ok(/^Functions$/.test((await txt(p, '.nb-tab-fn') || '').trim()), 'prep: the Functions tab stays, with no open count');
  ok(!/today/.test(await txt(p, '.fnn-sum') || ''), 'prep: What the platters need leaves Smith 60th out (' + (await txt(p, '.fnn-sum') || 'none') + ')');
  await tap(p, '.nb-tab-fn'); await L.settle(p, 300);
  const say = (await txt(p, '.nb-fnoff') || '').replace(/\s+/g, ' ');
  ok(/Smith 60th all sent 12:48\./.test(say) && /Pizza Platter \(Functions\)/.test(say) && /Party pies \(Larder\)/.test(say), 'prep: the Functions tab names what came off and where (' + say + ')');
  ok(!(await rowText(p)).some(t => /Pizza Platter/.test(t)), 'prep: the open platter line is off the Functions tab');
  ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. a sous chef's Orders: the stock line is off, a tick made a day early (Jones) takes nothing; Put back keeps the line
  p = await L.open(b, '#/orders', { who: 'sam', extra: docs(2), wait: 1500 });
  await L.waitFor(p, () => /Jones/.test(document.body.textContent), null, 6000).catch(() => {});
  rows = await rowText(p);
  ok(!rows.some(t => /Smith 60th/.test(t)), 'orders: Smith 60th\'s stock line is off the list (' + rows.join(' | ').slice(0, 200) + ')');
  ok(rows.some(t => /Function stock: Jones/.test(t)), 'orders: Jones, ticked Sent a day before its day, keeps its stock line');
  await tap(p, '[data-p="oremoved"]'); await L.settle(p, 300);
  const rem = (await rowText(p)).filter(t => /Smith 60th/.test(t))[0] || '';
  ok(/Not needed: Smith 60th all sent 12:48/.test(rem), 'orders: Show removed lists it as not needed, by the function (' + rem.slice(0, 160) + ')');
  await tap(p, '[data-p="orestore"]'); await L.settle(p, 500);
  const kept = (await store(p))[fsKey(['orders', today, 'lines', 'r' + D8 + '-fn-smith'])];
  ok(kept && kept.keep === true && kept.deleted === false, 'orders: Put back keeps the line (keep), so it is not taken off again');
  await tap(p, '[data-p="oremoved"]'); await L.settle(p, 300);
  ok((await rowText(p)).some(t => /Function stock: Smith 60th/.test(t) && !/Not needed/.test(t)), 'orders: the kept line is back on the list');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 3. the last round's Sent, held (no signal): nothing comes off and nothing says so; once the server has it, the slip
  // names every line that came off, with Undo, and the All sent box says the same
  p = await L.open(b, '#/fn/smith', { who: 'ann', extra: docs(1), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.fn-next [data-fn="sent"]'), null, 6000).catch(() => {});
  await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await tap(p, '.fn-next [data-fn="sent"]'); await L.settle(p, 600);
  ok(!/all sent/i.test(await txt(p, '.p-toasts') || '') && !/Taken off/.test(await txt(p, '.fn-next') || ''), 'sent, held: no line comes off and no slip says so before the server has the tick');
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  await L.waitFor(p, () => /all sent/.test((document.querySelector('.p-toasts') || {}).textContent || ''), null, 6000).catch(() => {});
  const slip = (await txt(p, '.p-toasts') || '').replace(/\s+/g, ' ');
  ok(/Smith 60th all sent\. Taken off the lists:/.test(slip) && /Pizza Platter/.test(slip) && /Party pies/.test(slip) && /Function stock/.test(slip) && !/Aussie/.test(slip), 'sent: the slip names what came off, never a ticked line (' + slip + ')');
  ok(/Taken off the lists:/.test(await txt(p, '.fn-next') || ''), 'sent: the All sent box names it too');
  ok((await p.$$('.p-toasts .p-toast-btn')).length === 1 && !(await p.$('.fn-next .fn-next-off button')), 'sent: one Undo, on the slip');
  await tap(p, '.p-toasts .p-toast-btn'); await L.settle(p, 600);
  ok((await store(p))[fsKey(['fnsent', 'smith_' + R2])].sent === false, 'sent: Undo on the slip takes the last round back');
  ok(/Undone: round 2 of Smith 60th not sent\. Its open lines are back on the lists\./.test((await txt(p, '.p-toasts') || '').replace(/\s+/g, ' ')), 'sent: Undo says what it undid');
  ok(p.errors.length === 0, 'sent: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 4. a double tap on Sent ticks one round, not the next one that took its place
  p = await L.open(b, '#/fn/smith', { who: 'ann', extra: docs(0), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.fn-next [data-fn="sent"]'), null, 6000).catch(() => {});
  await p.evaluate(() => { const b = document.querySelector('.fn-next [data-fn="sent"]'); b.click(); setTimeout(() => { const c = document.querySelector('.fn-next [data-fn="sent"]'); if (c) c.click(); }, 150); });
  await L.settle(p, 900);
  let s = await store(p);
  ok(!!s[fsKey(['fnsent', 'smith_' + R1])] && !s[fsKey(['fnsent', 'smith_' + R2])], 'sent: a double tap ticks round 1 only');
  await p.context().close();

  // 5. another phone ticks the last round while this one shows the prep list: the line leaves in place, says why, and a
  // finger on the screen holds it; once the finger lifts it goes
  p = await L.open(b, '#/prep', { who: 'ann', extra: docs(1), wait: 1500 });
  await L.waitFor(p, () => /Party pies/.test(document.body.textContent), null, 6000).catch(() => {});
  ok(/For Smith 60th/.test((await rowText(p)).filter(t => /Party pies/.test(t))[0] || ''), 'prep: before it goes out, the linked line says which function it is for');
  await p.mouse.move(200, 400); await p.mouse.down();
  await p.evaluate(([k, v]) => window.__fake.write(k, v), [fsKey(['fnsent', 'smith_' + R2]), sentRec('smith', R2, L.NOW - 60000)]);
  await L.settle(p, 400);
  const leaving = await p.evaluate(() => { const r = [...document.querySelectorAll('.nb-row.is-leaving')].find(x => /Party pies/.test(x.textContent)); return r ? r.textContent.replace(/\s+/g, ' ') : ''; });
  ok(/Not needed: Smith 60th all sent/.test(leaving), 'leaving: the line stays in place a moment with the reason (' + leaving + ')');
  await L.sleep(3200);
  ok(!!(await p.$('.nb-row.is-leaving')), 'leaving: a finger on the screen holds it past the moment');
  await p.mouse.up(); await L.sleep(1300); await L.settle(p, 200);
  ok(!(await rowText(p)).some(t => /Party pies/.test(t)), 'leaving: once the finger lifts, the line is off the list');
  ok(p.errors.length === 0, 'leaving: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
