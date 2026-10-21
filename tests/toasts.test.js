// Small, see-through toasts (21 Oct 2026): one 48 px pill, the older Undo shrinks to a chip above, a tap on the words or a
// swipe down puts a toast away, a toast without a button goes when the page scrolls, and the update notice is a strip at the top.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const item = (p, id) => p.evaluate(k => window.__fake.dump()[k] || {}, fsKey(['days', today, 'items', id]));
const box = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return { top: r.top, bottom: r.bottom, h: r.height, w: r.width, bg: cs.backgroundColor }; }, sel);
const seeThrough = bg => { const m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(bg || ''); return !!m && +m[1] < 1; };
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { wait: 1500 });

  // one toast: a single pill, no taller than 52 px, see-through, Undo still a full target
  await L.tap(p, '[data-p="tick"][data-id="i1"]'); await L.settle(p, 300);
  let t = await box(p, '.p-toast'), u = await box(p, '.p-toast-btn');
  ok(t && t.h <= 52, 'phone: "Ticked" is one small pill (' + (t && t.h) + ' px tall)');
  ok(u && u.h >= 44, 'phone: Undo is still 44 px tall (' + (u && u.h) + ')');
  ok(t && seeThrough(t.bg), 'phone: the toast is see-through (' + (t && t.bg) + ')');

  // a second Undo: the first one becomes a chip above the new toast
  await L.tap(p, '[data-p="del"][data-id="i2"]'); await L.settle(p, 200);
  if (!(await item(p, 'i2')).deleted) { await L.tap(p, '[data-p="del"][data-id="i2"]'); await L.settle(p, 300); }
  const chip = await txt(p, '.p-toast-old .p-toast-chip') || '';
  ok(/^Undo ticked$/.test(chip.trim()), 'two Undos: the older one is a chip that says what it undoes (' + chip + ')');
  const c = await box(p, '.p-toast-old'), m = await box(p, '.p-toast:not(.p-toast-old)');
  ok(c && m && c.bottom <= m.top && c.h <= 52, 'two Undos: the chip sits above the new toast and is small (' + (c && c.h) + ' px)');
  ok(/Removed/.test(await txt(p, '.p-toast') || ''), 'two Undos: the new toast comes first on the page');

  // a tap on the words puts the toast away and undoes nothing
  await p.click('.p-toast:not(.p-toast-old) .p-toast-msg'); await L.settle(p, 300);
  ok(await p.$('.p-toast') === null, 'tap on the words: the toasts go');
  ok((await item(p, 'i2')).deleted === true && (await item(p, 'i1')).done === true, 'tap on the words: nothing is undone');

  // a swipe down puts it away too, without pressing Undo
  await L.tap(p, '[data-p="tick"][data-id="i6"]'); await L.settle(p, 300);
  t = await box(p, '.p-toast');
  const x = 30 + (t ? (await p.evaluate(() => document.querySelector('.p-toast').getBoundingClientRect().left)) : 0), y = t ? t.top + t.h / 2 : 0;
  await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x, y + 25); await p.mouse.move(x, y + 60); await p.mouse.up();
  await L.settle(p, 300);
  ok(await p.$('.p-toast') === null, 'swipe down: the toast goes');
  ok((await item(p, 'i6')).done === true, 'swipe down: the tick stays');
  ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a toast without a button goes once the page is scrolled
  p = await L.open(b, '#/waste', { wait: 1500 });
  await p.click('.nb-addbtn'); await L.settle(p, 300);
  ok(/Write what was wasted/.test(await txt(p, '.p-toast') || ''), 'waste: an empty entry says what is missing');
  await p.clock.runFor(1000); // past the first moment, when the page moving to the box does not count
  await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 300);
  ok(await p.$('.p-toast') === null, 'waste: the message goes when the page scrolls');
  ok(p.errors.length === 0, 'waste: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the update notice is a slim strip at the top, under nothing and over nothing that matters
  for (const w of [390, 1280]) {
    p = await L.open(b, '#/prep', { wait: 1500, width: w, height: w === 390 ? 844 : 800 });
    await p.click('#nbr-i1 .nb-box'); await L.settle(p, 200); // a real tap: the book only reloads by itself before anyone touches it
    await p.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
    await L.waitFor(p, () => !!document.querySelector('.upd-bar'), null, 3000).catch(() => {});
    await p.evaluate(() => window.scrollTo(0, 0)); await L.settle(p, 200);
    const bar = await box(p, '.upd-bar'), top = await box(p, '.wtop'), tt = await box(p, '.p-toast');
    ok(bar && bar.top === 0 && bar.h <= 52, w + ': the update strip is at the top and slim (' + (bar && bar.h) + ' px)');
    ok(bar && top && top.top >= bar.bottom - 1, w + ': the strip does not cover the top bar');
    ok(bar && seeThrough(bar.bg), w + ': the strip is see-through like the toasts (' + (bar && bar.bg) + ')');
    ok(tt && bar && tt.top > bar.bottom + 200, w + ': the toast stays at the bottom, away from the strip');
    await p.evaluate(() => window.scrollTo(0, 600)); await L.settle(p, 200);
    const bar2 = await box(p, '.upd-bar');
    ok(bar2 && Math.abs(bar2.top) < 1, w + ': the strip stays at the top while the page scrolls');
    ok(!(await L.overflow(p)), w + ': no sideways scroll with the strip');
    ok(p.errors.length === 0, w + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})();
