// The first-PIN set-up window (22 Oct 2026, review S5): the rules let a person set their first PIN only while
// config/main pinOpen[id] is in the future. Everyone on the list gets 7 days the first time a chef opens the admin panel
// or Manage staff; a person added later gets 7 days; Reset PIN gives 30 minutes; a run-out window is never reopened by itself.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const cfg = p => p.evaluate(k => (window.__fake.dump()[k] || {}).pinOpen || null, fsKey(['config', 'main']));
const DAY = 86400000;
(async () => {
  const b = await L.start();
  // the head chef's Google account opens the admin panel: every person on the list gets a window
  let p = await L.open(b, '#/admin', { admin: true, who: '', wait: 2000 });
  await L.waitFor(p, k => !!((window.__fake.dump()[k] || {}).pinOpen), fsKey(['config', 'main'])).catch(() => {});
  let po = await cfg(p);
  ok(po && ['sam', 'ann', 'bo'].every(id => po[id] > L.NOW + 6 * DAY && po[id] < L.NOW + 8 * DAY), 'admin open: Sam, Ann and Bo get 7 days to set a first PIN (' + JSON.stringify(po) + ')');
  // Reset PIN: 30 minutes
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  await p.click('[data-p="a-reset-pin"][data-id="bo"]'); await L.settle(p, 150);
  await p.click('[data-p="a-reset-pin"][data-id="bo"]'); await L.settle(p, 500);
  po = await cfg(p);
  ok(po && po.bo > L.NOW + 25 * 60000 && po.bo < L.NOW + 35 * 60000, 'Reset PIN: Bo gets 30 minutes (' + (po && Math.round((po.bo - L.NOW) / 60000)) + ' min)');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a window that has run out is not given again by itself
  const extra = { [fsKey(['config', 'main'])]: { people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }],
    sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, pinOpen: { sam: 1, ann: 1 } } };
  p = await L.open(b, '#/prep', { extra, wait: 1800 });
  await L.chef(p, 'staff'); await L.settle(p, 800);
  po = await cfg(p);
  ok(po && po.sam === 1 && po.ann === 1 && po.bo > L.NOW + 6 * DAY, 'Manage staff open: Bo (no window yet) gets 7 days, run-out windows stay shut (' + JSON.stringify(po) + ')');
  ok(p.errors.length === 0, 'sous chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
