// The line menu (22 Oct 2026, Option B): on a phone, Remove and who wrote a line sit behind a ⋯ on the line, so the item
// and the amount lead. The sheet dims the page and closes on the backdrop, Cancel and Escape; Remove in it removes the
// line with Undo, as before. On a laptop the line keeps Remove and the name, and there is no ⋯.
const L = require('./lib');
const { R, ok } = L.results();
const vis = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
(async () => {
  const b = await L.start();

  // phone, sous chef Sam (may remove)
  let p = await L.open(b, '#/prep', { wait: 1500 });
  ok(await vis(p, '.nb-row .nb-more'), 'phone: the line shows ⋯');
  ok(!(await vis(p, '.nb-row:has(.nb-more) .nb-x')) && !(await vis(p, '.nb-row:has(.nb-more) .nb-wrote')), 'phone: Remove and the name are not in the line');
  const id = await p.evaluate(() => document.querySelector('.nb-row .nb-more').getAttribute('data-id'));
  await p.click('.nb-row .nb-more'); await L.settle(p, 200);
  ok(await vis(p, '#lm-sheet .sheet') && await vis(p, '#lm-sheet .sheet-bg'), 'phone: ⋯ opens a sheet over a dimmed page');
  ok(/Written by|from /.test(await L.txt(p, '#lm-sheet .sheet') || ''), 'phone: the sheet says who wrote the line');
  ok(await p.evaluate(() => document.getElementById('lm-sheet').parentNode === document.body), 'phone: the sheet is appended to the body');
  await p.keyboard.press('Escape'); await L.settle(p, 150);
  ok(!(await p.$('#lm-sheet')), 'phone: Escape closes it');
  await p.click('.nb-row .nb-more'); await L.settle(p, 150);
  await p.mouse.click(195, 60); await L.settle(p, 150);
  ok(!(await p.$('#lm-sheet')), 'phone: a tap on the dimmed page closes it');
  await p.click('.nb-row .nb-more'); await L.settle(p, 150);
  await p.click('#lm-sheet .sheet-x'); await L.settle(p, 150);
  ok(!(await p.$('#lm-sheet')), 'phone: Cancel closes it');
  await p.click('[data-lm="open"][data-id="' + id + '"]'); await L.settle(p, 150);
  await p.click('#lm-sheet .lm-act'); await L.settle(p, 600);
  const gone = await p.evaluate(i => { const r = document.getElementById('nbr-' + i); return !r || r.classList.contains('is-removed'); }, id);
  ok(gone && /Undo/.test(await L.txt(p, '.p-toast') || ''), 'phone: Remove line removes it, with Undo');
  ok(!(await L.overflow(p)), 'phone: no sideways scroll');
  ok(p.errors.length === 0, 'phone: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // phone, staff Ann (may not remove): the line is as before, no ⋯
  p = await L.open(b, '#/prep', { who: 'ann', wait: 1500 });
  ok(!(await p.$('.nb-more')), 'staff phone: no ⋯ (nothing to remove)');
  await p.context().close();

  // laptop: no ⋯, Remove and the name in the line
  p = await L.open(b, '#/prep', { width: 1280, height: 900, wait: 1500 });
  ok(!(await vis(p, '.nb-more')) && await vis(p, '.nb-row .nb-x') && await vis(p, '.nb-row .nb-wrote'), 'laptop: Remove and the name in the line, no ⋯');
  await p.context().close();

  // orders on a phone: the same menu
  p = await L.open(b, '#/orders', { wait: 1500 });
  ok(await vis(p, '.o-page .nb-row .nb-more') && !(await vis(p, '.o-page .nb-row:has(.nb-more) > .p-x')), 'orders phone: Remove behind ⋯');
  await p.click('.o-page .nb-row .nb-more'); await L.settle(p, 150);
  ok(/Remove line/.test(await L.txt(p, '#lm-sheet') || ''), 'orders phone: the sheet has Remove line');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
