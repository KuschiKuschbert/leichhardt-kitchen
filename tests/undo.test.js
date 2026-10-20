// Undo you can trust (usability U6): a new toast does not wipe an Undo still showing, Urgent says so and can be undone
// and keeps the line in place for a moment, and a removed shift ping can be put back.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const item = (p, id) => p.evaluate(k => window.__fake.dump()[k] || {}, fsKey(['days', today, 'items', id]));
const larder = p => p.evaluate(() => [...document.querySelectorAll('.nb-rows li[id^="nbr-"]')].map(e => e.id.slice(4)).filter(id => ['i1', 'i2', 'i6'].indexOf(id) >= 0));
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { wait: 1500 });

  // remove, then tick: both Undos stay reachable
  await L.tap(p, '[data-p="del"][data-id="i2"]'); await p.waitForTimeout(200);
  if (!(await item(p, 'i2')).deleted) { await L.tap(p, '[data-p="del"][data-id="i2"]'); await p.waitForTimeout(300); }
  ok((await item(p, 'i2')).deleted === true, 'remove: Pick coriander is removed');
  await L.tap(p, '[data-p="tick"][data-id="i1"]'); await p.waitForTimeout(300);
  ok((await item(p, 'i1')).done === true, 'tick: Slice onions is ticked');
  ok(await p.$('.p-toast-old [data-p="toast-old"]') !== null, 'the earlier Undo still shows above the new toast');
  await p.click('.p-toast-old [data-p="toast-old"]'); await p.waitForTimeout(400);
  ok((await item(p, 'i2')).deleted === false && (await item(p, 'i1')).done === true, 'the earlier Undo puts the removed line back, the tick stays');

  // Urgent: a toast with Undo, and the line stays put for a moment
  const before = await larder(p);
  await L.tap(p, '[data-p="urgent"][data-id="i6"]'); await p.waitForTimeout(300);
  ok((await item(p, 'i6')).urgent === true && /Marked urgent/.test(await txt(p, '.p-toast:not(.p-toast-old)') || ''), 'urgent: saved, and the toast says Marked urgent');
  const now1 = await larder(p);
  ok(now1.indexOf('i6') === before.indexOf('i6'), 'urgent: the line stays where it was straight away (' + before + ' / ' + now1 + ')');
  await p.waitForTimeout(3800);
  const later = await larder(p);
  ok(later[0] === 'i6', 'urgent: after a moment it moves to the top of its section (' + later + ')');
  await p.click('.p-toast:not(.p-toast-old) .p-toast-btn').catch(() => {});
  await p.waitForTimeout(400);
  ok((await item(p, 'i6')).urgent === false, 'urgent: Undo takes it back');
  ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // admin: a removed shift ping can be put back
  const extra = {}; extra[fsKey(['notes', 'n1'])] = { text: 'Delivery: Bidfood 09:00', tag: 'delivery', start: today, until: today, dows: [], removed: false, at: 1, upd: 1, by: 'sam' };
  p = await L.open(b, '#/admin', { admin: true, extra, width: 1280, height: 900, wait: 1800 });
  await L.adminTab(p, 'notes'); await p.waitForTimeout(400);
  await L.tap(p, '[data-p="n-del"][data-id="n1"]'); await p.waitForTimeout(150);
  await L.tap(p, '[data-p="n-del"][data-id="n1"]'); await p.waitForTimeout(500);
  const n = () => p.evaluate(k => window.__fake.dump()[k] || {}, fsKey(['notes', 'n1']));
  ok((await n()).removed === true && /Ping removed/.test(await txt(p, '.p-toast') || ''), 'pings: removed, with Undo');
  await L.tap(p, '.p-toast .p-toast-btn'); await p.waitForTimeout(500);
  ok((await n()).removed === false, 'pings: Undo puts the ping back');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
