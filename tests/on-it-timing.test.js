// How long a job takes (council quick check, 10 Nov 2026). Staff see no "Usually takes" tag on Prep: it timed written
// to ticked, so a line written early looked like a long job. The head chef's Insights show Time on it instead: from
// On it to the tick, only for lines someone put On it (the tick keeps the stamp).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW)), yday = L.ymd(new Date(L.NOW - 86400000)), ago2 = L.ymd(new Date(L.NOW - 2 * 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const M = 60000, DAY = 86400000;
(async () => {
  const b = await L.start();
  const extra = {};
  const line = (text, x) => Object.assign({ text, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - DAY - 8 * 60 * M, done: false, deleted: false }, x || {});
  const done = (at, x) => Object.assign({ done: true, doneBy: 'Ann', doneById: 'ann', doneAt: at, preparedBy: 'Ann', preparedById: 'ann', preparedAt: at }, x || {});
  // written at 06:00, ticked at 14:00 on two days: the old tag said "Usually takes 8 h"
  extra[fsKey(['days', yday, 'items', 'g1'])] = line('Make gravy', done(L.NOW - DAY, { onBy: 'Ann', onById: 'ann', onAt: L.NOW - DAY - 40 * M }));
  extra[fsKey(['days', ago2, 'items', 'g2'])] = line('Make gravy', Object.assign(done(L.NOW - 2 * DAY, { onBy: 'Ann', onById: 'ann', onAt: L.NOW - 2 * DAY - 60 * M }), { addedAt: L.NOW - 2 * DAY - 8 * 60 * M }));
  // ticked with no On it: no job time
  extra[fsKey(['days', yday, 'items', 'p1'])] = line('Pick herbs', done(L.NOW - DAY));
  extra[fsKey(['days', ago2, 'items', 'p2'])] = line('Pick herbs', Object.assign(done(L.NOW - 2 * DAY), { addedAt: L.NOW - 2 * DAY - 8 * 60 * M }));
  // today: gravy is open again, with three more lines so Start here numbers
  extra[fsKey(['days', today, 'items', 'tg'])] = line('Make gravy', { addedAt: L.NOW - 30 * M });

  let p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 2500 });
  ok(/Make gravy/.test(await txt(p, '.nb') || ''), 'prep: the list is shown');
  ok(!/Usually takes/.test(await txt(p, '.nb') || ''), 'prep: no Usually takes tag on any line');
  ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/admin', { admin: true, extra, wait: 2500 });
  await L.adminTab(p, 'insights');
  await L.settle(p, 800);
  const card = await p.evaluate(() => { const h = Array.from(document.querySelectorAll('h3')).find(x => x.textContent === 'Time on it'); return h ? h.parentElement.textContent : ''; });
  ok(/From On it to the tick/.test(card), 'insights: a Time on it card says what it measures (' + card.slice(0, 80) + ')');
  ok(/Make gravy\s*2\s*1 h/.test(card), 'insights: gravy took 40 min and 1 h on it, typical 1 h, not the 8 h on the list (' + card.slice(0, 200) + ')');
  ok(!/Pick herbs/.test(card), 'insights: a line never put On it has no job time');
  ok(p.errors.length === 0 && !(await L.overflow(p)), 'insights: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
