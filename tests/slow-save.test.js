// A save on a half-dropped connection (22 Oct 2026, the head chef's Antipasto Platter): the version check before a recipe
// save asks the server, and that question could hang without failing, so the save never went into the queue although
// the page said it would. Now the question gives up after 6 s and the save goes into the queue (sent with the signal).
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: true, active: true });
const cfg = { [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } };
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: cfg, wait: 1800 });
  await L.waitFor(p, () => !!document.getElementById('mg-name'), null, 8000).catch(() => {});
  await p.fill('#mg-name', 'Chicken Burger Deluxe'); await L.settle(p, 300);
  await p.evaluate(() => { window.__fake.stall = /recipes\/burger$/; });
  await p.click('[data-mg="save"]');
  await L.settle(p, 4500);
  ok(/Waiting for the signal/.test(await L.txt(p, '#mg-root') || ''), 'a slow server: the page says it is waiting for the signal');
  await L.waitFor(p, k => !!window.__fake.dump()[k], fsKey(['recipes', 'burger']), 8000).catch(() => {});
  const rb = await p.evaluate(k => window.__fake.dump()[k], fsKey(['recipes', 'burger']));
  ok(rb && rb.v === 1 && rb.r && rb.r.name === 'Chicken Burger Deluxe', 'after 6 s the save goes into the queue anyway (version 1 saved)');
  await L.waitFor(p, () => /Saved\. Version 1/.test(document.body.textContent), null, 6000).catch(() => {});
  ok(/Saved\. Version 1/.test(await L.txt(p, 'body') || ''), 'and the page says Saved once it is sent');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
