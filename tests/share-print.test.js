// Copy, share and print the lists (usability U7): the prep list copies only what is left (and only the open section),
// the order list copies one line per item for the supplier, a phone uses its share sheet, and each print sets its own
// class so other pages no longer print blank.
const L = require('./lib');
const { R, ok } = L.results();
const grab = p => p.evaluate(() => {
  window.__copied = null; window.__printed = 0; window.print = () => { window.__printed++; };
  try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__copied = t; return Promise.resolve(); } } }); } catch (e) {}
});
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { width: 1280, height: 900, wait: 1500 });
  await grab(p);
  await L.tap(p, '[data-p="tick"][data-id="i1"]'); await p.waitForTimeout(300);
  ok(/^Copy the list$/.test((await L.txt(p, '[data-p="copy"]')) || ''), 'prep: a computer copies (' + await L.txt(p, '[data-p="copy"]') + ')');
  await L.tap(p, '[data-p="copy"]'); await p.waitForTimeout(300);
  let t = await p.evaluate(() => window.__copied) || '';
  ok(/^Prep list, /.test(t) && /Pick coriander/.test(t) && !/Slice onions/.test(t) && !/\[x\]/.test(t), 'prep: the copy leaves out ticked lines');
  await L.tap(p, '[data-p="tab"][data-v="Grill"]'); await p.waitForTimeout(300);
  await L.tap(p, '[data-p="copy"]'); await p.waitForTimeout(300);
  t = await p.evaluate(() => window.__copied) || '';
  ok(/^Prep list, Grill/.test(t) && /Portion rump/.test(t) && !/Pick coriander/.test(t), 'prep: on the Grill tab only Grill is copied');
  await L.tap(p, '[data-p="print"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.documentElement.classList.contains('print-list')) && await p.evaluate(() => window.__printed) === 1, 'prep: Print the list prints with print-list');
  await p.waitForTimeout(1700);
  ok(!(await p.evaluate(() => document.documentElement.classList.contains('print-list'))), 'prep: the print class is taken off after');
  ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/orders', { width: 1280, height: 900, wait: 1500 });
  await grab(p);
  await L.tap(p, '[data-p="ocopy"]'); await p.waitForTimeout(300);
  t = await p.evaluate(() => window.__copied) || '';
  ok(/^Order, /.test(t) && /Milk: 6 L/.test(t) && /Brioche buns: 4 packs/.test(t), 'orders: Copy for the supplier gives one line per item with amounts');
  await L.tap(p, '[data-p="oview"][data-v="all"]'); await p.waitForTimeout(500);
  await L.tap(p, '[data-p="ocopy"]'); await p.waitForTimeout(300);
  t = await p.evaluate(() => window.__copied) || '';
  ok(/everything still to order/.test(t) && /Milk: 6 L/.test(t), 'orders: Everything to order copies every open item');
  await L.tap(p, '[data-p="oprint"]'); await p.waitForTimeout(150);
  ok(await p.evaluate(() => document.documentElement.classList.contains('print-orders')) && await p.evaluate(() => window.__printed) === 1, 'orders: Print prints with print-orders');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a phone with a share sheet shares instead of copying
  p = await L.open(b, '#/prep', { touch: true, wait: 1500 });
  const coarse = await p.evaluate(() => matchMedia('(pointer: coarse)').matches);
  await p.evaluate(() => { window.__shared = null; navigator.share = d => { window.__shared = d.text; return Promise.resolve(); }; });
  await p.evaluate(() => { location.hash = '#/orders'; }); await p.waitForTimeout(400); await p.evaluate(() => { location.hash = '#/prep'; }); await p.waitForTimeout(600);
  if (coarse) {
    ok(/^Share the list$/.test((await L.txt(p, '[data-p="copy"]')) || ''), 'phone: the button says Share the list');
    await L.tap(p, '[data-p="copy"]'); await p.waitForTimeout(300);
    ok(/^Prep list, /.test(await p.evaluate(() => window.__shared) || ''), 'phone: the list goes to the share sheet');
  } else ok(true, 'phone: this browser does not report a touch pointer, share check skipped');
  await p.context().close();

  await b.close();
  L.report(R);
})();
