// Insights with a Person filter: every part of the tab follows it, the Rolled over heatmap included, and the Recipe book
// section says the filters do not apply to it (audit, October 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW)), yday = L.ymd(new Date(L.NOW - 86400000));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
(async () => {
  const b = await L.start();
  // a line Ann wrote yesterday that rolled onto today (origBy Ann), and a line Sam wrote yesterday that rolled too
  const extra = {};
  const line = (text, by, id, x) => Object.assign({ text, station: 'Larder', qty: '', recipe: '', addedBy: by, addedById: id, addedAt: L.NOW - 90000000, done: false, deleted: false }, x || {});
  extra[fsKey(['days', yday, 'items', 'a1'])] = line('Peel carrots', 'Ann', 'ann');
  extra[fsKey(['days', yday, 'items', 's1'])] = line('Make stock', 'Sam', 'sam');
  extra[fsKey(['days', today, 'items', 'ra1'])] = line('Peel carrots', 'Rolled over', '', { rolled: 1, root: 'a1', from: 'a1', rolledFrom: yday, origBy: 'Ann', origAt: L.NOW - 90000000 });
  extra[fsKey(['days', today, 'items', 'rs1'])] = line('Make stock', 'Rolled over', '', { rolled: 1, root: 's1', from: 's1', rolledFrom: yday, origBy: 'Sam', origAt: L.NOW - 90000000 });
  const p = await L.open(b, '#/admin', { admin: true, extra, wait: 2500 });
  await p.click('[data-p="a-tab"][data-t="insights"]');
  await p.waitForTimeout(800);
  ok(/Recipe book counts are for everyone/.test(await txt(p, '#prep-root') || ''), 'insights: the Recipe book section says the filters do not apply to it');
  await p.selectOption('select[data-k="af-who"]', 'ann');
  await p.waitForTimeout(800);
  ok(/Showing: Ann/.test(await txt(p, '.a-fnote') || ''), 'insights: the filter note says Showing: Ann');
  await p.click('[data-p="heat"][data-v="r"]');
  await p.waitForTimeout(600);
  const heat = await p.evaluate(() => { const t = document.querySelector('.sk-t'); return t ? t.textContent : ''; });
  ok(heat.length > 0, 'insights: the Rolled over heatmap draws with a person picked');
  const sticky = await p.evaluate(() => { const h = Array.from(document.querySelectorAll('h3')).find(x => /Slow and sticky/.test(x.textContent)); return h ? h.parentElement.textContent : ''; });
  ok(!/Make stock/.test(sticky), 'insights: Slow and sticky lines leaves out the other person\'s rolled line');
  ok(p.errors.length === 0, 'insights person: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
