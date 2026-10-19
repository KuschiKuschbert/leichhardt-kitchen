// Staff are told who removes a wrong line and who ticks orders, instead of finding a missing button or a greyed box
// (audit, October 2026). The head chef and sous chefs do not see the line.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
  ok(/ask the head chef or a sous chef to remove it/.test(await txt(p, '.nb-who') || ''), 'prep, staff: the line says who removes a wrong line');
  ok(!/admin/.test(await txt(p, '#prep-root') || ''), 'prep, staff: nobody is called "the admin"');
  ok(p.errors.length === 0, 'prep, staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/prep', { wait: 1500 });
  ok(await p.$('.nb-who') === null, 'prep, sous chef: no such line (they can remove)');
  await p.context().close();
  p = await L.open(b, '#/orders', { who: 'ann', wait: 1500 });
  ok(/Only the head chef or a sous chef ticks a line as ordered/.test(await txt(p, '.nb-who') || ''), 'orders, staff: the line explains the greyed tick box');
  ok(await p.$('[data-p="otick"][disabled]') !== null, 'orders, staff: the tick box is still shown greyed');
  ok(p.errors.length === 0, 'orders, staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/orders', { wait: 1500 });
  ok(await p.$('.nb-who') === null, 'orders, sous chef: no such line');
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
