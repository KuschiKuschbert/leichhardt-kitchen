// Refusal follows the Prep line it belongs to. The old Orders Undo identifies which request it restores.
const L = require('./lib');
const { R, ok } = L.results();
const date = L.ymd(new Date(L.NOW));
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const prepKey = id => key('days', date, 'items', id);
const orderKey = id => key('orders', date, 'lines', id);
const row = id => '.nb-row[data-ln$="/' + id + '"]';
const tick = (p, id) => p.click(row(id) + ' .nb-box');
const slipText = p => L.txt(p, '.p-toast:not(.p-toast-old) .p-toast-msg');
const mode = (p, mode) => p.evaluate(mode => { window.__fake.mode = mode; }, mode);
const stored = (p, k) => p.evaluate(k => window.__fake.dump()[k], k);
const fault = (p, id) => L.txt(p, row(id) + ' .nb-tick-status');

(async () => {
  const browser = await L.start();
  for (const [width, height] of [[390, 844], [1280, 800]]) {
    const p = await L.open(browser, '#/prep', { width, height, touch: width === 390 });
    await mode(p, 'fail');
    await tick(p, 'i3');
    await L.waitFor(p, () => !!document.querySelector('.nb-tick-status, .p-toast-bad'), null, 6000);
    ok(/Not saved.*retry/i.test(await fault(p, 'i3') || '') && !(await stored(p, prepKey('i3'))).done, width + ': the refused tick is marked at Portion rump and leaves it open');
    await p.clock.runFor(20000);
    ok(!!(await fault(p, 'i3')), width + ': the refused tick has no timer');

    await mode(p, 'ok');
    await tick(p, 'i1');
    await L.waitFor(p, k => !!window.__fake.dump()[k].done, prepKey('i1'), 6000);
    ok(/Not saved/.test(await fault(p, 'i3') || '') && !(await fault(p, 'i1')), width + ': ticking a different line cannot dismiss the failure');
    ok(/^Ticked Slice onions/.test(await slipText(p) || '') && await p.locator('.p-toast [data-p="toast-act"]').isVisible(), width + ': Slice onions still has its named feedback and Undo');

    const box = await p.locator(row('i3') + ' .nb-box').boundingBox();
    const focusDescription = await p.locator(row('i3') + ' .nb-box').getAttribute('aria-describedby');
    ok(box.width >= 44 && box.height >= 44 && !!focusDescription, width + ': the same tick retains a 44 px target and describes the error');

    await mode(p, 'hold');
    await tick(p, 'i3');
    await p.clock.runFor(5200);
    await L.settle(p, 250);
    ok(/Retrying/.test(await fault(p, 'i3') || '') && !/Ticked Portion rump/.test(await slipText(p) || ''), width + ': a waiting retry says so in the same line');
    await p.evaluate(() => window.__fake.warm());
    await L.waitFor(p, k => !!window.__fake.dump()[k].done && !document.querySelector('.nb-tick-status'), prepKey('i3'), 6000);
    ok(/^Ticked Portion rump/.test(await slipText(p) || '') && (await stored(p, prepKey('i1'))).done, width + ': the accepted retry clears the failure and only changes its own line');
    ok(!p.errors.length && !(await L.overflow(p)), width + ': no page errors or sideways scroll');
    await p.context().close();
  }

  const orders = Object.fromEntries([['older', 'Roasted pumpkin for afternoon function'], ['newer', 'Lemon wedges']].map(([id, text], n) => [
    orderKey(id), { text, qty: '3 trays', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - (70 - n) * 60000, ordered: false, deleted: false }
  ]));
  const p = await L.open(browser, '#/orders', { width: 390, height: 844, touch: true, settings: { text: 'xlarge' }, extra: orders });
  for (const id of ['older', 'newer']) {
    await tick(p, id);
    await L.waitFor(p, k => !!window.__fake.dump()[k].ordered, orderKey(id), 6000);
  }
  const label = await p.locator('.p-toast-chip').evaluate(e => ({ text: e.textContent, clipped: e.scrollWidth > e.clientWidth, height: e.getBoundingClientRect().height }));
  ok(/Undo ordered Roasted pumpkin for afternoon function/.test(label.text) && !label.clipped && label.height >= 44, 'Extra large phone text shows the full older Undo in its own 44 px target');
  await p.click('.p-toast-chip');
  await L.waitFor(p, k => !window.__fake.dump()[k].ordered, orderKey('older'), 6000);
  ok((await stored(p, orderKey('newer'))).ordered && /pumpkin.*back on the order list/.test(await slipText(p) || ''), 'the older Undo restores only the named request');
  ok(!p.errors.length && !(await L.overflow(p)), 'Orders has no page errors or sideways scroll');
  await p.context().close();
  await browser.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
