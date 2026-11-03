// The docket slip (4 Nov 2026, was a see-through pill from 21 Oct 2026): one solid slip on the tab bar, Undo with its time
// left as a line, the older Undo a tab above it, errors with a red edge that stay, a tap on the words or a swipe down puts a
// toast away, a toast without a button goes when the page scrolls, and the update notice is a strip at the top.
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

  // one toast: a solid slip sitting on the tab bar, no taller than 64 px, Undo a full target, its time left as a line
  await L.tap(p, '[data-p="tick"][data-id="i1"]'); await L.settle(p, 300);
  let t = await box(p, '.p-toast'), u = await box(p, '.p-toast-btn'), tb = await box(p, '.tabbar');
  ok(t && t.h <= 64, 'phone: "Ticked" is one slim slip (' + (t && t.h) + ' px tall)');
  ok(u && u.h >= 44, 'phone: Undo is still 44 px tall (' + (u && u.h) + ')');
  ok(t && !seeThrough(t.bg), 'phone: the slip is solid, so the words read over any line (' + (t && t.bg) + ')');
  ok(t && tb && Math.abs(t.bottom - tb.top) <= 1 && t.w >= 389, 'phone: the slip spans the width and sits on the tab bar (' + (t && t.bottom) + ' / ' + (tb && tb.top) + ')');
  ok(await p.evaluate(() => { const e = document.querySelector('.p-toast'), a = getComputedStyle(e, '::before'); return a.content !== 'none' && a.animationName === 'slip-time' && /9000ms/.test(e.getAttribute('style') || ''); }), 'phone: Undo shows its 9 seconds as a line along the top');
  ok(await p.evaluate(() => { const r = document.querySelector('#app').getBoundingClientRect(); return parseFloat(getComputedStyle(document.querySelector('#app')).paddingBottom) >= 130; }), 'phone: the page makes room below its last line while the slip is up');

  // a second Undo: the first one becomes a chip above the new toast
  await L.tap(p, '[data-p="del"][data-id="i2"]'); await L.settle(p, 200);
  if (!(await item(p, 'i2')).deleted) { await L.tap(p, '[data-p="del"][data-id="i2"]'); await L.settle(p, 300); }
  const chip = await txt(p, '.p-toast-old .p-toast-chip') || '';
  ok(/^Undo ticked$/.test(chip.trim()), 'two Undos: the older one is a chip that says what it undoes (' + chip + ')');
  const c = await box(p, '.p-toast-old'), m = await box(p, '.p-toast:not(.p-toast-old)');
  ok(c && m && c.bottom <= m.top + 1 && c.h <= 52, 'two Undos: the chip sits as a tab on top of the new slip (' + (c && c.h) + ' px)');
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
  // a busy day, so the page is long enough to scroll
  const busy = {}, td = L.ymd(new Date(L.NOW));
  for (let i = 0; i < 12; i++) busy[['kitchens', L.PIN, 'waste', td, 'lines', 'b' + i].join('/')] = { text: 'Item ' + i, amount: 1, unit: 'kg', reason: 'prep', action: '', station: 'Larder', addedBy: 'Bo', addedById: 'bo', addedAt: L.NOW - (i + 2) * 600000, deleted: false };
  p = await L.open(b, '#/waste', { wait: 1500, extra: busy });
  await p.click('.nb-addbtn'); await L.settle(p, 300);
  ok(/Write what was wasted/.test(await txt(p, '.p-toast') || ''), 'waste: an empty entry says what is missing');
  await p.clock.runFor(1000); // past the first moment, when the page moving to the box does not count
  // scroll the other way from where the box left the page (the page is shorter since the review moved to the admin panel)
  const sy = await p.evaluate(() => { window.scrollTo(0, scrollY > 0 ? 0 : document.documentElement.scrollHeight); return scrollY; }); await L.settle(p, 300);
  ok(await p.$('.p-toast') === null, 'waste: the message goes when the page scrolls (to ' + sy + ')');
  ok(p.errors.length === 0, 'waste: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // an error has a red edge, no time line, and stays until OK (it went after 12 seconds before 4 Nov 2026)
  p = await L.open(b, '#/prep', { wait: 1500 });
  await p.evaluate(() => { window.__fake.mode = 'fail'; });
  await L.tap(p, '[data-p="tick"][data-id="i3"]'); await L.settle(p, 800);
  ok(await p.$('.p-toast.p-toast-bad') !== null && /Not saved/.test(await txt(p, '.p-toast-bad') || ''), 'error: the slip has the error look');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.p-toast-bad'), '::before').content === 'none'), 'error: no time line');
  await p.clock.runFor(20000); await L.settle(p, 300);
  ok(await p.$('.p-toast-bad') !== null, 'error: still there 20 seconds later');
  await p.click('.p-toast-bad .p-toast-btn'); await L.settle(p, 300);
  ok(await p.$('.p-toast') === null, 'error: OK puts it away');
  ok(p.errors.length === 0, 'error: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // on a laptop the slip is a docket at the bottom middle
  p = await L.open(b, '#/prep', { wait: 1500, width: 1280, height: 800 });
  await L.tap(p, '[data-p="tick"][data-id="i1"]'); await L.settle(p, 300);
  t = await box(p, '.p-toast');
  ok(t && t.w <= 545 && t.bottom <= 800 - 15 && !seeThrough(t.bg), '1280: a solid docket at the bottom middle (' + (t && t.w) + ' px wide)');
  ok(p.errors.length === 0, '1280: no page errors ' + p.errors.join(' | '));
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
    ok(bar && seeThrough(bar.bg), w + ': the strip is see-through (' + (bar && bar.bg) + ')');
    ok(tt && bar && tt.top > bar.bottom + 200, w + ': the slip stays at the bottom, away from the strip');
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
