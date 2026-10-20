// A ping keeps the name of the person who wrote it, even after a sous chef edits or removes it: the writer is kept in
// author from the first save, and by is whoever saved last (audit, October 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const today = L.ymd(new Date(L.NOW));
(async () => {
  const b = await L.start();
  // a ping Bo wrote that Sam (sous chef) saved last: the list still says Bo wrote it
  const extra = {};
  extra[fsKey(['notes', 'n1'])] = { text: 'Function in the garden at 18:00', tag: 'function', start: today, until: today, dows: [], removed: false, at: L.NOW - 3600000, upd: L.NOW - 1800000, author: 'bo', by: 'sam' };
  let p = await L.open(b, '#/prep', { extra, wait: 1500 });
  await L.chef(p, 'pings');
  await p.waitForTimeout(400);
  ok(/Written by Bo/.test(await txt(p, '#prep-root') || ''), 'pings list: a ping Sam edited still says Written by Bo');
  ok(!/Written by Sam/.test(await txt(p, '#prep-root') || ''), 'pings list: not Written by Sam');
  // a new ping records its writer in author
  await tap(p, '[data-p="n-new"]');
  await p.waitForTimeout(200);
  await p.fill('[data-k="n-text"]', 'Delivery at 07:00, check the cold room');
  await tap(p, '[data-p="n-save"]');
  await p.waitForTimeout(600);
  const s = await store(p);
  const mine = Object.keys(s).filter(k => /\/notes\/[^/]+$/.test(k) && s[k].text === 'Delivery at 07:00, check the cold room').map(k => s[k])[0];
  ok(!!mine && mine.author === 'sam' && mine.by === 'sam', 'new ping: author and by are both the writer (' + (mine && mine.author) + ')');
  ok(p.errors.length === 0, 'ping author: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
