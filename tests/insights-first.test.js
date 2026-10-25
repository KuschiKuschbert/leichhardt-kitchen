// The Insights first screen and the PIN move (usability U13c): Export is one menu, the time the numbers were read shows,
// What stands out comes before the tiles, empty tiles are left out, and the new kitchen PIN is typed twice. On a phone
// (23 Oct 2026) the report pages do not repeat the page name and Export is a small button; Learning says its time once.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, wait: 2500 });
  ok(await p.$('.a-export:not([open])') !== null && await p.$('[data-p="csv"]:visible') === null, 'Insights: Download CSV sits in one closed Export menu');
  ok(/Updated \d\d:\d\d/.test(await L.txt(p, '.a-upd') || ''), 'Insights: says when the numbers were read');
  const order = await p.evaluate(() => { const sec = document.querySelector('.a-sec'); const g = sec.querySelector('.a-grid'), t = sec.querySelector('.a-tiles'); return g && t ? (g.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING ? 'grid-first' : 'tiles-first') : 'missing'; });
  ok(order === 'grid-first', 'Insights: What stands out comes before the tiles (' + order + ')');
  ok(!/n\/a|lines corrected by the proofreader/.test(await L.txt(p, '.a-tiles') || ''), 'Insights: tiles with nothing to say are left out');
  if (L.adminTab) await L.adminTab(p, 'tools'); else { await p.click('[data-p="a-tab"][data-t="tools"]'); await L.settle(p, 300); }
  ok(/Step 1/.test(await L.txt(p, '.a-step') || '') && /03:30/.test(await p.evaluate(() => document.querySelector('.a-pane').textContent)), 'Backup and PIN: the steps come first and the nightly backup is named');
  await p.fill('#a-newpin', '4321'); await p.fill('#a-newpin2', '4312');
  await p.click('[data-p="move-pin"]'); await L.settle(p, 200);
  ok(/do not match/.test(await p.evaluate(() => document.querySelector('.a-pane').textContent)), 'PIN move: two different PINs are caught');
  // Learning, nothing learned yet or not: when the book learns is said once (23 Oct 2026, it was said twice)
  await L.adminTab(p, 'learning'); await L.settle(p, 300);
  const learns = await p.evaluate(() => (document.querySelector('.a-pane').textContent.match(/learns every night at 03:00/g) || []).length);
  ok(learns === 1, 'Learning: "learns every night at 03:00" is said once (' + learns + ')');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // on a phone (23 Oct 2026): the page name is not shown again under the page buttons, and Export is a small button
  // next to the dates, not a bar across the screen; the heading stays for screen readers
  p = await L.open(b, '#/admin', { admin: true, width: 390, height: 900, wait: 2500 });
  for (const t of ['insights', 'team', 'waste']) {
    await L.adminTab(p, t); await L.settle(p, 300);
    const m = await p.evaluate(t => {
      const box = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
      const hs = t === 'waste' ? '.wh-report > .a-title' : '.a-tools .a-title';
      const h = box(hs), x = box(t === 'waste' ? '[data-p="csv"][data-v="waste"]' : '.a-export > summary'), d = box(t === 'waste' ? '[data-k="wh-period"]' : '.a-tools .hint');
      return { title: document.querySelector(hs) ? document.querySelector(hs).textContent : '', hw: h && Math.round(h.width), xw: x && Math.round(x.width), sameRow: !!(x && d && x.top < d.bottom && x.bottom > d.top) };
    }, t);
    ok(m.title && m.hw <= 1, t + ' on a phone: the page name is for screen readers only (' + JSON.stringify(m) + ')');
    ok(m.xw && m.xw < 195 && m.sameRow, t + ' on a phone: Export is a small button next to the dates (' + JSON.stringify(m) + ')');
  }
  ok(await p.$('[data-p="csv"][data-v="waste"]:visible') !== null && !(await L.overflow(p)), 'phone: wastage exports directly from one compact CSV button with no sideways scroll');
  ok(p.errors.length === 0, 'phone: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})();
