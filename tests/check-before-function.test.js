// To check before the functions (22 Oct 2026, review F5): the head chef and sous chefs see, on the landing page, what in
// the next 7 days' confirmed functions still needs a hand: times TBC, a platter gone from the book or changed since the
// booking. So does the head chef's own Google device with nobody signed in (23 Oct 2026). Staff do not see it. Hide for
// today keeps it away until tomorrow. No reads of its own.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), d2 = M.addDays(today, 2), d3 = M.addDays(today, 3), d12 = M.addDays(today, 12);
const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
function fn(o) {
  const R0 = (o.rounds || []).map(x => ({ at: at(o.date, x), note: '' }));
  return M.derive({ v: 1, status: 'confirmed', name: o.name, date: o.date, start: o.start ? at(o.date, o.start) : 0, st: !o.start, loc: '', guests: 40, gu: false, mode: R0.length > 1 ? 'stag' : 'all',
    notes: '', kc: '', kcBy: '', kcAt: 0, rounds: R0, lines: o.lines.map(([rid, name, a, fp]) => ({ rid, name, unit: 'platter', spec: 'Per platter.', fp: fp || '', qty: a.reduce((s, x) => s + x, 0), u: M.toU(a) })),
    was: {}, chg: [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: 'fay', upd: L.NOW - 3600000 });
}
(async () => {
  const b = await L.start();
  const extra = {
    [fsKey(['functions', 'tbc'])]: fn({ name: 'Jones wake', date: d2, lines: [['pizza-platter', 'Pizza Platter', [3]]] }),
    [fsKey(['functions', 'chg'])]: fn({ name: 'Brown 21st', date: d3, start: '18:00', rounds: ['18:30'], lines: [['antipasto-platter', 'Antipasto Platter', [2], 'old-fingerprint'], ['gone-platter', 'Gone Platter', [1]]] }),
    [fsKey(['functions', 'far'])]: fn({ name: 'Far away', date: d12, lines: [['pizza-platter', 'Pizza Platter', [2]]] })
  };
  let p = await L.open(b, '#/', { extra, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('#fn-check .fn-ck')).catch(() => {});
  const t = await L.txt(p, '#fn-check') || '';
  ok(/Jones wake.*times are still TBC/.test(t), 'sous chef: times TBC are listed (' + t.slice(0, 160) + ')');
  ok(/Antipasto Platter changed in the book since Brown 21st was booked/.test(t), 'sous chef: a platter changed since the booking is listed');
  ok(/Gone Platter is no longer in the book/.test(t), 'sous chef: a platter gone from the book is listed');
  ok(!/Far away/.test(t), 'sous chef: a function more than 7 days off is not listed');
  ok(await p.$eval('#fn-check a[href="#/fn/tbc"]', e => !!e).catch(() => false), 'sous chef: each line links to the function');
  if (process.env.SHOTS) await p.screenshot({ path: require('path').join(__dirname, 'shots', '390-landing-checks.png'), fullPage: false });
  await p.click('#fn-check [data-fn="ckhide"]'); await L.settle(p, 300);
  ok(await p.evaluate(() => { const e = document.getElementById('fn-check'); return !e || e.hidden; }), 'Hide for today hides it');
  await p.reload(); await L.settle(p, 1800);
  ok(await p.evaluate(() => { const e = document.getElementById('fn-check'); return !e || e.hidden; }), 'and it stays hidden after a reload today');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/', { who: 'ann', extra, wait: 1800 });
  await L.settle(p, 800);
  ok(await p.evaluate(() => { const e = document.getElementById('fn-check'); return !e || e.hidden; }), 'staff: no checks card');
  ok(!(await L.overflow(p)), 'staff: no sideways scroll');
  await p.context().close();

  // the head chef's own Google device with nobody signed in sees it too (23 Oct 2026), like Manage Recipes; a staff
  // member signed in on that device, or a shared kitchen device with nobody signed in, does not
  const ckShown = pg => pg.evaluate(() => { const e = document.getElementById('fn-check'); return !!e && !e.hidden && !!e.querySelector('.fn-ck'); });
  // the owner check is read and the functions are in before a "not shown" counts
  const ready = pg => L.waitFor(pg, () => !!window.LK_PREP && window.LK_PREP.state.level === 'owner' && !!window.LK_FN && window.LK_FN.list().length === 3).then(() => true, () => false);
  p = await L.open(b, '#/', { who: '', admin: true, extra, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('#fn-check .fn-ck')).catch(() => {});
  ok(await ckShown(p) && /Jones wake.*times are still TBC/.test(await L.txt(p, '#fn-check') || ''), 'head chef\'s Google device, nobody signed in: the checks card shows');
  ok(p.errors.length === 0, 'head chef\'s Google device: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/', { who: 'ann', admin: true, extra, wait: 1800 });
  let rd = await ready(p); await L.settle(p, 400);
  ok(rd && !(await ckShown(p)), 'head chef\'s Google device, staff signed in: no checks card');
  await p.context().close();
  p = await L.open(b, '#/', { who: '', admin: true, settings: { shared: true }, extra, wait: 1800 });
  rd = await ready(p); await L.settle(p, 400);
  ok(rd && !(await ckShown(p)), 'shared kitchen device, nobody signed in: no checks card');
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
