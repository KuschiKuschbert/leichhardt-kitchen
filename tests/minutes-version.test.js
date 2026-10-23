// Change as a new version: published minutes changed by the head chef become version 2, the old version is kept as a
// frozen copy under hist, and the book says a new version was published (19 Oct 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const store = page => page.evaluate(() => window.__fake.dump());
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  await L.adminTab(p, 'minutes');
  await L.settle(p, 400);
  await p.click('[data-p="mn-new"]');
  await L.settle(p, 200);
  await p.fill('[data-k="mn-decisions"]', 'New fryer oil every Monday');
  await p.evaluate(() => { const b = document.querySelector('[data-p="mn-attopen"]'); if (b && !document.querySelector('[data-p="mn-all"]')) b.click(); });
  await L.settle(p, 100);
  await p.click('[data-p="mn-all"]', { timeout: 2000 }).catch(() => {});
  await L.settle(p, 100);
  await p.click('[data-p="mn-pub"]'); await L.settle(p, 150);
  await p.click('[data-p="mn-pub"]'); await L.settle(p, 600);
  let s = await store(p);
  const key = Object.keys(s).find(k => /\/minutes\/[^/]+$/.test(k) && s[k].status === 'published');
  ok(!!key && s[key].v === 1, 'published: version 1 is in the store (' + (key ? 'v' + s[key].v : 'none') + ')');
  const id = key ? key.split('/').pop() : '';
  // change it
  ok(await p.$('[data-p="mn-edit"][data-id="' + id + '"]') !== null, 'published: "Change as a new version" is offered');
  await p.click('[data-p="mn-edit"][data-id="' + id + '"]');
  await L.settle(p, 300);
  ok(/becomes version 2/.test(await txt(p, '.mn-form') || ''), 'change: the form says it becomes version 2');
  await p.fill('[data-k="mn-decisions"]', 'New fryer oil every Monday and Thursday');
  await p.click('[data-p="mn-pub"]'); await L.settle(p, 150);
  ok(/Tap again to publish/.test(await txt(p, '[data-p="mn-pub"]') || ''), 'change: publishing as a new version asks for a second tap');
  await p.click('[data-p="mn-pub"]'); await L.settle(p, 600);
  s = await store(p);
  ok(s[key] && s[key].v === 2 && s[key].status === 'published' && /Thursday/.test(s[key].decisions), 'new version: the minutes are version 2 with the new words');
  const hist = s[key.replace(/\/minutes\/[^/]+$/, '/minutes/' + id + '/hist/1')];
  ok(!!hist && hist.v === 1 && /Monday$/.test(hist.decisions) && !/Thursday/.test(hist.decisions), 'new version: version 1 is kept as it was under hist (' + (hist ? hist.decisions : 'missing') + ')');
  ok(/Minutes 01 version 2 published at \d\d:\d\d\./.test(await txt(p, '#prep-root') || ''), 'new version: the page says version 2 was published, and when');
  ok(p.errors.length === 0, 'minutes version: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
