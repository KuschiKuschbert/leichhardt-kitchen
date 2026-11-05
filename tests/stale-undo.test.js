// An Undo never does the opposite of what it says (4 Nov 2026, LF-01 and LF-02 in docs/loading-feedback-options/brief.md).
// After a tick fails to save, no "Undo ticked" is left on screen. A Ticked Undo only ever unticks: if the line was
// unticked some other way first, it does nothing. The older Undo keeps its time when a short toast after it ends, or
// when the page scrolls.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const item = (p, id) => p.evaluate(k => window.__fake.dump()[k] || {}, fsKey(['days', today, 'items', id]));
(async () => {
  const b = await L.start();

  // 1. a tick that fails: the line stays unticked and no Undo for it is offered
  let p = await L.open(b, '#/prep', { wait: 1500 });
  await p.evaluate(() => { window.__fake.mode = 'fail'; });
  await L.tap(p, '[data-p="tick"][data-id="i3"]'); await L.settle(p, 800);
  ok((await item(p, 'i3')).done !== true, 'failed tick: the line is not ticked');
  ok(/Not saved/.test(await txt(p, '.p-toast:not(.p-toast-old)') || ''), 'failed tick: the toast says Not saved');
  const stale = await p.$('.p-toast-old [data-p="toast-old"]');
  ok(stale === null, 'failed tick: no "Undo ticked" is left on screen (' + (stale ? await txt(p, '.p-toast-old') : 'none') + ')');
  await p.evaluate(() => { window.__fake.mode = 'ok'; });
  if (stale) { await p.click('.p-toast-old [data-p="toast-old"]'); await L.settle(p, 600); }
  ok((await item(p, 'i3')).done !== true, 'failed tick: nothing on screen can tick the line by itself');
  ok(p.errors.length === 0, 'failed tick: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. Undo after the line was unticked elsewhere does nothing (it used to tick it again)
  p = await L.open(b, '#/prep', { wait: 1500 });
  await L.tap(p, '[data-p="tick"][data-id="i1"]'); await L.settle(p, 400);
  ok((await item(p, 'i1')).done === true, 'tick: the line is ticked');
  const k = fsKey(['days', today, 'items', 'i1']);
  await p.evaluate(key => { const d = Object.assign({}, window.__fake.dump()[key], { done: false, doneBy: '', doneById: '', doneAt: 0, preparedBy: '', preparedById: '', preparedAt: 0 }); window.__fake.write(key, d); }, k);
  await L.settle(p, 400);
  ok((await item(p, 'i1')).done === false, 'another phone unticks it');
  ok(await p.$('[data-p="toast-act"]') !== null, 'the Ticked Undo is still on screen');
  if (await p.$('[data-p="toast-act"]')) { await p.click('[data-p="toast-act"]'); await L.settle(p, 600); }
  ok((await item(p, 'i1')).done === false, 'Undo on an unticked line leaves it unticked');
  ok(p.errors.length === 0, 'undo after untick: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 3. the older Undo outlives a short toast after it
  p = await L.open(b, '#/prep', { wait: 1500 });
  await L.tap(p, '[data-p="tick"][data-id="i6"]'); await L.settle(p, 300);
  await p.evaluate(() => window.LK_PREP.toast('Copied to the order list.'));
  await L.settle(p, 200);
  ok(await p.$('.p-toast-old [data-p="toast-old"]') !== null, 'short toast: the earlier Undo shows as a chip above it');
  await p.clock.runFor(4000); await L.settle(p, 200);
  ok(await p.$('.p-toast:not(.p-toast-old)') === null, 'short toast: it goes after its 3.5 seconds');
  ok(await p.$('.p-toast-old [data-p="toast-old"]') !== null, 'short toast: the earlier Undo is still there after it goes');
  if (await p.$('.p-toast-old [data-p="toast-old"]')) { await p.click('.p-toast-old [data-p="toast-old"]'); await L.settle(p, 500); }
  ok((await item(p, 'i6')).done === false, 'short toast: the earlier Undo still unticks the line');
  await p.clock.runFor(7000); await L.settle(p, 200);
  ok(await p.$('.p-toast') === null, 'everything has gone after its time');
  ok(p.errors.length === 0, 'short toast: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 4. a scroll puts a short toast away but keeps the earlier Undo
  const busy = {};
  for (let i = 0; i < 14; i++) busy[fsKey(['days', today, 'items', 'm' + i])] = { text: 'Mise ' + i, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - (90 - i) * 60000, done: false, deleted: false };
  p = await L.open(b, '#/prep', { wait: 1500, extra: busy });
  await L.tap(p, '[data-p="tick"][data-id="i2"]'); await L.settle(p, 300);
  await p.evaluate(() => window.LK_PREP.toast('Copied to the order list.'));
  await p.clock.runFor(1000); await L.settle(p, 200);
  // a thumb keeps moving: up to four scrolls of 400 px, so a first scroll the page counts as moving to the box, or a page
  // that settles a little after it, still ends with the toast gone; a toast that never goes still fails
  let gone = false;
  for (let k = 0; k < 4 && !gone; k++) {
    await p.evaluate(() => { window.scrollBy(0, scrollY > 600 ? -400 : 400); });
    gone = await L.waitFor(p, () => !document.querySelector('.p-toast:not(.p-toast-old)'), null, 700).then(() => true, () => false);
  }
  ok(gone, 'scroll: the short toast goes');
  ok(await p.$('.p-toast-old [data-p="toast-old"]') !== null, 'scroll: the earlier Undo stays');
  ok(p.errors.length === 0, 'scroll: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
