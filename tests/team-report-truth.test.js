// The admin Team report tells the truth about its counts (12 Nov 2026): a shift count that stops before yesterday says
// how many days are missing, a section with no shifts under its current name never reads "nobody", shifts under a name
// no longer on the section list are said by name, and order days that did not load are said beside the standing
// order candidates. Made-up people and numbers only.
const L = require('./lib');
const { R, ok } = L.results();
const path = (...p) => ['kitchens', L.PIN, ...p].join('/');
const DAY = 86400000, dayN = n => L.ymd(new Date(L.NOW - n * DAY));
const SECS = [{ id: 'grill', name: 'Grill' }, { id: 'larder', name: 'Larder' }, { id: 'sauce', name: 'Sauce' }];

// Bo worked the sauce section while it was called "Sauces"; the section list now calls it "Sauce"
function tsum(lastDay) {
  const days = [];
  for (let i = lastDay; i <= 30; i++) days.push({ day: dayN(i), s: [{ p: 'ann', sec: 'Grill', sh: 'lunch' }, { p: 'sam', sec: 'Larder', sh: 'lunch' }, { p: 'bo', sec: 'Sauces', sh: 'dinner' }] });
  return { v: 1, at: L.NOW - lastDay * DAY, day: dayN(lastDay - 1), from: dayN(30), to: dayN(lastDay), days, usual: {}, learn: {} };
}
function extra(lastDay) {
  const x = { [path('teamsum', 'main')]: tsum(lastDay) };
  x[path('config', 'main')] = { ...L.seed()[path('config', 'main')], kitSecs: SECS };
  // Milk on the order list on four days of the last 14; one of those days will not load
  [1, 2, 3, 5].forEach((n, i) => { x[path('orders', dayN(n), 'lines', 'm' + i)] = { text: 'Milk', qty: '6 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - n * DAY, ordered: false, deleted: false }; });
  return x;
}
const pane = p => p.evaluate(() => (document.querySelector('.a-pane') || document.body).innerText);
const ready = p => L.waitFor(p, () => /Who has worked where/.test((document.querySelector('.a-pane') || {}).innerText || '') && /Standing order candidates/.test(document.body.innerText) && !!document.querySelector('.sk-shifts'), null, 10000);

(async () => {
  const b = await L.start();
  // the nightly run last finished four days ago, a section was renamed, and one order day does not load
  let p = await L.open(b, '#/admin', { admin: true, who: '', adminPage: 'team', width: 1280, height: 900, extra: extra(4), failReads: '/orders/' + dayN(2) + '/lines', wait: 2200 });
  await ready(p);
  let t = await pane(p);
  ok(/Old counts\s*Shift counts only go to [^.]+\. The nightly run has not finished since, so the last 3 days are missing\./.test(t), 'old counts say so, with the days missing (' + ((t.match(/Old counts.{0,160}/) || [''])[0]) + ')');
  ok(/Sauce: no shifts under this name in the last 30 days\./.test(t) && !/nobody/i.test(t), 'a section with no shifts under its current name never reads "nobody" (' + ((t.match(/Sauce:.{0,80}/) || [''])[0]) + ')');
  ok(/Not counted: shifts under names no longer on the section list: Sauces \(\d+\)\./.test(t), 'shifts under an old section name are said by name, not dropped silently (' + ((t.match(/Not counted.{0,120}/) || [''])[0]) + ')');
  ok(/1 of the last 14 days did not load, so an item may be missing here\./.test(t) && /Milk/.test((t.split('Standing order candidates')[1] || '')), 'an order day that did not load is said beside the standing order candidates, and Milk still shows from the days that loaded');
  ok(!(await L.overflow(p)), 'no sideways scroll');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // on time, every name current, every day loaded: none of the warnings
  const fresh = extra(1);
  fresh[path('teamsum', 'main')].days.forEach(d => d.s.forEach(v => { if (v.sec === 'Sauces') v.sec = 'Sauce'; }));
  p = await L.open(b, '#/admin', { admin: true, who: '', adminPage: 'team', width: 390, height: 844, extra: fresh, wait: 2200 });
  await ready(p);
  t = await pane(p);
  ok(!/Old counts|Not counted|did not load/.test(t), 'on time and all loaded: no warning lines');
  ok(/Sauce: 1 person in 30 days \(Bo, 30 shifts\)\./.test(t), 'the renamed section counts again once its shifts carry its name (' + ((t.match(/Sauce:.{0,60}/) || [''])[0]) + ')');
  ok(!(await L.overflow(p)), 'phone: no sideways scroll');
  ok(p.errors.length === 0, 'phone: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
