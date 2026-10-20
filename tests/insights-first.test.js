// The Insights first screen and the PIN move (usability U13c): Export is one menu, the time the numbers were read shows,
// What stands out comes before the tiles, empty tiles are left out, and the new kitchen PIN is typed twice.
const L = require('./lib');
const { R, ok } = L.results();
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, wait: 2500 });
  ok(await p.$('.a-export:not([open])') !== null && await p.$('[data-p="print-tab"]:visible') === null, 'Insights: Print and CSV sit in one closed Export menu');
  ok(/Updated \d\d:\d\d/.test(await L.txt(p, '.a-upd') || ''), 'Insights: says when the numbers were read');
  const order = await p.evaluate(() => { const sec = document.querySelector('.a-sec'); const g = sec.querySelector('.a-grid'), t = sec.querySelector('.a-tiles'); return g && t ? (g.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING ? 'grid-first' : 'tiles-first') : 'missing'; });
  ok(order === 'grid-first', 'Insights: What stands out comes before the tiles (' + order + ')');
  ok(!/n\/a|lines corrected by the proofreader/.test(await L.txt(p, '.a-tiles') || ''), 'Insights: tiles with nothing to say are left out');
  if (L.adminTab) await L.adminTab(p, 'tools'); else { await p.click('[data-p="a-tab"][data-t="tools"]'); await p.waitForTimeout(300); }
  ok(/Step 1/.test(await L.txt(p, '.a-step') || '') && /03:30/.test(await p.evaluate(() => document.querySelector('.a-pane').textContent)), 'Backup and PIN: the steps come first and the nightly backup is named');
  await p.fill('#a-newpin', '4321'); await p.fill('#a-newpin2', '4312');
  await p.click('[data-p="move-pin"]'); await p.waitForTimeout(200);
  ok(/do not match/.test(await p.evaluate(() => document.querySelector('.a-pane').textContent)), 'PIN move: two different PINs are caught');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})();
