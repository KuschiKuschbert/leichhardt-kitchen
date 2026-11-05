// Approved narrow Prep option A: keep Tick beside the words and the existing actions below them.
// Check real rendered rows and acknowledged outcomes, including the fixed-width controls that caused the collapse.
const fs = require('fs'), path = require('path'), L = require('./lib');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW));
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const itemKey = id => key('days', day, 'items', id);
const longName = 'Prepare roasted vegetable and chickpea salad for the function after service';
const longQuantity = '12.5 kg across 4 labelled containers';
const extra = { [itemKey('reflow-long')]: { text: longName, qty: longQuantity, station: 'Sauce', recipe: 'gravy', urgent: true,
  done: false, deleted: false, addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 300000 } };
// below 480 px at any text size since 5 Nov 2026 (I'm on it's own button made the row too full for the words)
const expectedReflow = width => width < 480;
const item = (p, id) => p.evaluate(k => __fake.dump()[k], itemKey(id));
async function resize(p, width, text, height = width === 568 ? 320 : 900) {
  await p.setViewportSize({ width, height });
  await p.evaluate(text => document.documentElement.setAttribute('data-text', text), text);
  await L.settle(p, 200);
}
function geometry() {
  const visible = e => !!e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
  const box = e => { const r = e.getBoundingClientRect ? e.getBoundingClientRect() : e; return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
  const rows = ['i4', 'reflow-long'].map(id => {
    const row = document.getElementById('nbr-' + id), text = row.querySelector('.nb-t'), quantity = row.querySelector('.nb-q');
    const words = text.firstChild, source = words.textContent, wordLines = [];
    for (const match of source.matchAll(/\S+/g)) {
      const range = document.createRange(); range.setStart(words, match.index); range.setEnd(words, match.index + match[0].length);
      wordLines.push({ word: match[0], lines: range.getClientRects().length });
    }
    const range = document.createRange(); range.selectNodeContents(quantity);
    return { id, row: box(row), text: box(text), quantity: box(quantity), quantityText: quantity.textContent,
      quantityRects: [...range.getClientRects()].map(box), wordLines,
      tick: box(row.querySelector('.nb-box')), actions: box(row.querySelector('.nb-acts')),
      controls: [...row.querySelectorAll('button,a')].filter(visible).map(e => ({ name: e.getAttribute('aria-label'), ...box(e) })) };
  });
  return { rows, overflow: document.documentElement.scrollWidth - innerWidth };
}
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('#nbr-i4 .nb-acts')); }
async function ticked(p, id, done) { await L.waitFor(p, ({ k, done }) => !!__fake.dump()[k].done === done, { k: itemKey(id), done }); }

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { width: 390, extra, wait: 1200 }); await ready(p);
  const readings = [];
  for (const text of ['normal', 'large', 'xlarge']) for (const width of [320, 359, 360, 390, 479, 480, 568, 768, 1280]) {
    await resize(p, width, text);
    const g = await p.evaluate(geometry), reflow = expectedReflow(width, text), first = g.rows[0];
    readings.push({ width, text, reflow, ...g });
    ok(first.wordLines.every(w => w.lines === 1), width + ' ' + text + ': Make gravy keeps each word together (' + first.text.width.toFixed(1) + ' px text)');
    if (reflow) {
      ok(g.rows.every(r => r.actions.top >= r.text.bottom - 1 && Math.abs(r.tick.top - r.text.top) < 2), width + ' ' + text + ': Tick stays beside the words and actions sit below');
      ok(g.rows.every(r => r.quantityRects.every(q => q.left >= r.row.left - 1 && q.right <= r.row.right + 1)), width + ' ' + text + ': complete quantities wrap inside their own row');
      ok(g.overflow <= 1, width + ' ' + text + ': constrained Prep and long quantities fit the document');
    } else {
      ok(first.actions.left >= first.text.right - 1 && first.tick.right <= first.text.left + 1, width + ' ' + text + ': existing horizontal row is retained');
    }
    ok(g.rows.every(r => r.controls.every(c => c.width >= 44 - .1 && c.height >= 44 - .1)), width + ' ' + text + ': visible row controls retain 44 px targets');
  }
  fs.mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'shots', 'prep-reflow.json'), JSON.stringify(readings, null, 2));
  ok(p.errors.length === 0, 'responsive Prep has no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // Keyboard and named controls use the original handlers and acknowledgement, not prototype event plumbing.
  p = await L.open(b, '#/prep', { width: 320, who: 'ann', settings: { text: 'xlarge' }, wait: 1200 }); await ready(p);
  await p.locator('#nbr-i4 .nb-box').focus(); await p.keyboard.press('Space'); await ticked(p, 'i4', true);
  ok((await item(p, 'i4')).doneById === 'ann' && !(await p.$('#pt-sheet')), 'personal keyboard Tick is one action with the same recorder');
  ok(await p.evaluate(() => document.activeElement?.matches('#nbr-i4 .nb-box')), 'keyboard tick keeps focus on its current box through redraw');
  await p.locator('.p-toast:not(.p-toast-old) .p-toast-btn').click(); await ticked(p, 'i4', false);
  ok(!(await item(p, 'i4')).done, 'native Undo restores the original open row');
  await p.locator('#nbr-i4 .nb-star').click();
  await L.waitFor(p, k => __fake.dump()[k].urgent === true, itemKey('i4'));
  ok(await p.locator('#nbr-i4 .nb-urg').count() === 1 && (await item(p, 'i4')).qty === '5 L', 'direct priority toggle keeps quantity and the visible Urgent mark');
  const bill = await p.evaluate(() => __fake.bill.reduce((n, x) => n + x.n, 0));
  await resize(p, 359, 'normal'); await resize(p, 390, 'xlarge');
  ok(await p.evaluate(old => __fake.bill.reduce((n, x) => n + x.n, 0) === old, bill), 'responsive reflow adds no Firestore reads');
  await p.locator('#nbr-i4 .nb-go').click();
  await L.waitFor(p, () => location.hash.startsWith('#/r/gravy'));
  ok(!(await p.locator('#r-edit').count()) || !(await p.locator('#r-edit').isVisible()), 'staff recipe entry keeps recipe-management rights unchanged');
  await p.goBack(); await ready(p);
  ok((await item(p, 'i4')).urgent && (await item(p, 'i4')).qty === '5 L', 'recipe Back returns to the same task without changing its data');
  await p.locator('#nbr-i4 .nb-tt').click(); await ticked(p, 'i4', true);
  ok(!(await p.$('#pt-sheet')) && (await item(p, 'i4')).preparedById === 'ann', 'personal tapping the task words remains one action');
  ok(p.errors.length === 0, 'personal actions have no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/prep', { width: 320, settings: { text: 'xlarge' }, wait: 1200 }); await ready(p);
  await p.locator('#nbr-i1 .nb-more').click();
  ok(await p.locator('#lm-sheet .lm-who').count() === 1 && await p.locator('#lm-sheet .lm-act').isVisible(), 'More retains writer information and Remove');
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  ok(!(await p.$('#lm-sheet')) && await p.evaluate(() => document.activeElement?.matches('#nbr-i1 .nb-more')), 'Escape returns focus to the original More control');
  await p.locator('#nbr-i1 .nb-more').click(); await p.locator('#lm-sheet .lm-act').click();
  await L.waitFor(p, k => __fake.dump()[k].deleted === true, itemKey('i1'));
  await p.locator('.p-toast:not(.p-toast-old) .p-toast-btn').click();
  await L.waitFor(p, k => __fake.dump()[k].deleted === false, itemKey('i1'));
  ok((await item(p, 'i1')).qty === '2 tubs' && !!(await p.$('#nbr-i1 .nb-box')), 'Remove and native Undo retain the amount and original row');
  ok(p.errors.length === 0, 'line menu has no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/prep', { width: 320, settings: { text: 'xlarge', shared: true }, wait: 1200 }); await ready(p);
  await p.locator('#nbr-i4 .nb-box').click(); await L.waitFor(p, () => !!document.querySelector('#pt-sheet'));
  ok(!(await item(p, 'i4')).done, 'shared Tick still waits for the reported worker');
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  ok(!(await item(p, 'i4')).done && await p.evaluate(() => document.activeElement?.matches('#nbr-i4 .nb-box')), 'shared cancellation leaves the task open and returns Tick focus');
  await p.locator('#nbr-i4 .nb-tt').click();
  const worker = p.locator('#pt-sheet [data-pt="choose"][data-id="bo"]');
  if (!(await worker.count()) || !(await worker.isVisible())) await p.locator('#pt-sheet [data-pt="others"]').click();
  await worker.click(); await ticked(p, 'i4', true);
  const shared = await item(p, 'i4');
  ok(shared.preparedById === 'bo' && shared.doneById === 'sam' && shared.by === 'sam', 'shared selection keeps reported worker separate from the authenticated recorder');
  ok(p.errors.length === 0, 'shared actions have no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  const people = [{ id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
    { id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true, del: false },
    { id: 'lou', name: 'Lou', role: 'lead', active: true, add: true, tick: true, del: true },
    { id: 'vic', name: 'Vic', role: 'view', active: true, add: false, tick: false, del: false }];
  const roleData = { [key('config', 'main')]: { people, staffIds: people.map(x => x.id), sousIds: ['sam'] } };
  for (const id of ['lou', 'vic']) { roleData[key('pinset', id)] = { at: 1 }; roleData[key('drinks', id)] = { kind: 'flat', size: 'reg', at: L.NOW, by: id }; }
  for (const who of ['ann', 'lou', 'vic']) {
    p = await L.open(b, '#/prep', { width: 320, who, settings: { text: 'xlarge' }, extra: roleData, wait: 1200 }); await ready(p);
    const row = p.locator('#nbr-i4'), before = await item(p, 'i4');
    ok(who === 'vic' ? await row.locator('.nb-box').isDisabled() && !(await row.locator('.nb-tt, .nb-star, .nb-more').count()) : await row.locator('.nb-box').isEnabled(), who + ': reflow preserves role-dependent controls');
    ok(row && !(await L.overflow(p)) && (await item(p, 'i4')).qty === before.qty, who + ': role-specific rows fit without changing records');
    ok(p.errors.length === 0, who + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  p = await L.open(b, '#/prep', { width: 320, who: 'ann', extra, settings: { text: 'xlarge' }, wait: 1200 }); await ready(p);
  await p.fill('#p-text', 'Extra gravy for service'); await p.fill('#p-qty', '1 jug');
  await p.keyboard.press('Escape'); await L.settle(p, 200);   // the Add a line sheet closed, the words kept (3 Nov 2026)
  await p.evaluate(() => { __fake.mode = 'hold'; }); await p.context().setOffline(true); await L.settle(p, 250);
  const openWidth = await p.locator('#nbr-i4 .nb-t').evaluate(e => e.getBoundingClientRect().width);
  await p.locator('#nbr-i4 .nb-tt').click();
  await L.waitFor(p, () => LK_PREP.unsent() && !!document.querySelector('#nbr-i4 .nb-unsent'));
  const pending = await p.locator('#nbr-i4').evaluate(row => {
    const words = row.querySelector('.nb-t').getBoundingClientRect(), mark = row.querySelector('.nb-unsent').getBoundingClientRect(), r = row.getBoundingClientRect();
    return { width: words.width, visible: mark.width > 0 && mark.height > 0, fits: mark.left >= r.left - 1 && mark.right <= r.right + 1 };
  });
  ok(pending.visible && pending.fits && Math.abs(openWidth - pending.width) < 1, 'Not sent remains visible inside the row without narrowing the task words');
  ok(await p.locator('#p-text').inputValue() === 'Extra gravy for service' && await p.locator('#p-qty').inputValue() === '1 jug', 'a pending tick preserves unfinished Add fields');
  ok(await p.evaluate(() => LK_PREP.unsent() && lkUnsaved()), 'a queued personal tick keeps the existing unsent and update guards active');
  await p.context().setOffline(false); await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
  await L.waitFor(p, () => !LK_PREP.unsent()); await ticked(p, 'i4', true);
  ok((await item(p, 'i4')).doneById === 'ann' && await p.locator('#p-text').inputValue() === 'Extra gravy for service', 'acknowledgement keeps the original recorder and unfinished words');
  ok(p.errors.filter(e => !/Failed to load resource: net::ERR_(FAILED|INTERNET_DISCONNECTED)/.test(e)).length === 0, 'pending Prep has no unexpected browser errors');
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
