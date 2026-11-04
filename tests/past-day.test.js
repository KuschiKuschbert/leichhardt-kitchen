// Browsing a past day (head chef and sous chefs): the add box and Quick add are for today only, since a line written
// onto a past day never rolls over, and the Done box says which day it shows (audit, October 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/prep', { wait: 1500 });
  // the add box is in the Add a line sheet since 3 Nov 2026 (work pages redesign A)
  ok(await p.$('[data-p="write"]') !== null, 'today: Add a line is there');
  ok(/Done today/.test(await txt(p, '.nb-right') || ''), 'today: the Done box says today');
  await p.click('[data-p="day"][data-d="-1"]');
  await L.settle(p, 500);
  ok(await p.$('form[data-p-form="add"]') === null && await p.$('[data-p="write"]') === null, 'past day: no add box and no Add a line');
  ok(/Lines are added on Today only/.test(await txt(p, '.nb-left') || ''), 'past day: the page says lines are added on Today only');
  ok(await p.$('[data-p="quick"]') === null, 'past day: no Quick add chips');
  ok(/Done on /.test(await txt(p, '.nb-right') || '') && !/Done today/.test(await txt(p, '.nb-right') || ''), 'past day: the Done box names the day, not today');
  await p.click('[data-p="today"]');
  await L.settle(p, 500);
  ok(await p.$('[data-p="write"]') !== null, 'back on today: Add a line is back');
  ok(p.errors.length === 0, 'past day: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
