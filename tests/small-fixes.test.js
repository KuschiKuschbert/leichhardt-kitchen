// Small fixes from the sanity audit (October 2026): the head chef signed in with Google only can browse days on the
// prep list without opening the admin panel first, lk.admin marks the device only once the owner probe has passed,
// and the Team tab says its tallies are all time.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
(async () => {
  const b = await L.start();
  // the head chef's phone (Google signed in, a chef signed in: staff signed in there get the staff view): day navigation on the prep list straight away
  let p = await L.open(b, '#/prep', { admin: true, who: '', wait: 1800 });
  ok(await p.$('[data-p="day"]') !== null, 'head chef on #/prep: day navigation without visiting the admin panel');
  ok(await p.evaluate(() => localStorage.getItem('lk.admin')) === '1', 'head chef: lk.admin set once the owner probe passed');
  ok(p.errors.length === 0, 'head chef prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // staff: no day navigation, no lk.admin
  p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
  ok(await p.$('[data-p="day"]') === null, 'staff: no day navigation');
  ok(!(await p.evaluate(() => localStorage.getItem('lk.admin'))), 'staff: lk.admin not set');
  await p.context().close();
  // Team tab: the tallies say all time
  p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  await L.adminTab(p, 'team');
  await L.settle(p, 400);
  ok(/Who is writing and ticking \(all time\)/.test(await txt(p, '#prep-root') || ''), 'team: tallies labelled all time');
  ok(p.errors.length === 0, 'team: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
