// One clock: the book takes the server's time from the Date header of its update check (LK_TIME in index.html) and
// works in kitchen time (Queensland), whatever the phone's own clock and time zone say.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const H = 3600000;
const today = L.ymd(new Date(L.NOW));
const tomorrow = L.ymd(new Date(L.NOW + 26 * H));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const near = (a, b, ms) => typeof a === 'number' && Math.abs(a - b) <= ms;
(async () => {
  const b = await L.start();
  let p, s;

  // right clock, no server time in the answer: nothing changes
  p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
  ok(await p.evaluate(() => window.LK_TIME.gap()) === 0, 'clock: no server time, no gap');
  ok(await p.evaluate(() => window.LK_TIME.ready()), 'clock: checked once the update check has answered');
  ok(p.errors.length === 0, 'clock: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // phone 3 hours slow and set to London time: saved and shown times are the server's, in kitchen time
  p = await L.open(b, '#/prep', { who: 'ann', wait: 2000, clock: L.NOW - 3 * H, tz: 'Europe/London', server: L.NOW });
  const gap = await p.evaluate(() => window.LK_TIME.gap());
  ok(near(gap, 3 * H, 5000), 'slow phone: the gap to the server is learned (' + Math.round(gap / 1000) + ' s)');
  ok(near(await p.evaluate(() => window.LK_TIME.now()), L.NOW, 60000), 'slow phone: now() is the server\'s time');
  ok(/Slice onions/.test(await txt(p, '.nb')), 'slow phone: today\'s list is shown');
  ok(/Waiting since 13:00/.test(await txt(p, '.nb')), 'slow phone in another zone: Waiting since is in kitchen time');
  await p.fill('#p-text', 'Zest lemons');
  await p.press('#p-text', 'Enter');
  await L.settle(p, 800);
  await p.click('[data-p="tick"][data-id="i2"]');
  await L.settle(p, 800);
  s = await store(p);
  const added = Object.keys(s).filter(k => k.indexOf(fsKey(['days', today, 'items'])) === 0).map(k => s[k]).filter(x => x.text === 'Zest lemons')[0];
  const ticked = s[fsKey(['days', today, 'items', 'i2'])];
  ok(!!added && near(added.addedAt, L.NOW, 120000), 'slow phone: a new line is stamped with the server\'s time');
  ok(!!ticked && ticked.done && near(ticked.doneAt, L.NOW, 120000), 'slow phone: a tick is stamped with the server\'s time');
  ok(/14:0\d/.test(await txt(p, '.nb-done')), 'slow phone in another zone: Done today shows the tick in kitchen time');
  ok(p.errors.length === 0, 'slow phone: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // phone set a day ahead: once the server's time is known the list is today's, and nothing rolls onto tomorrow
  p = await L.open(b, '#/prep', { who: 'ann', wait: 2500, clock: L.NOW + 26 * H, server: L.NOW });
  ok(near(await p.evaluate(() => window.LK_TIME.now()), L.NOW, 60000), 'fast phone: now() is the server\'s time');
  ok(/Slice onions/.test(await txt(p, '.nb')), 'fast phone: today\'s list is shown, not tomorrow\'s');
  s = await store(p);
  ok(!Object.keys(s).some(k => k.indexOf(fsKey(['days', tomorrow, 'items'])) === 0), 'fast phone: no lines rolled onto tomorrow');
  ok(p.errors.length === 0, 'fast phone: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
