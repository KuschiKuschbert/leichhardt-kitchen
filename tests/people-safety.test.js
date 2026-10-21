// Admin People safety (usability U13a, head chef decision D6): the Save bar counts unsaved changes and Save is off
// when there are none, Undo and Sign out ask again with changes waiting, someone who leaves is taken off the list with
// Put back instead of deleted, and Reset PIN names the person.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const CFG = ['kitchens', L.PIN, 'config', 'main'].join('/');
const cfg = p => p.evaluate(k => window.__fake.dump()[k], CFG);
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, wait: 1800 });
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  ok(await p.$('[data-p="a-save"][disabled]') !== null && await p.$('.a-unsaved') === null, 'nothing changed: Save is off, no count');
  await L.tap(p, '[data-p="a-remove-person"][data-i="2"]'); await L.settle(p, 150);
  ok(/Tap again: stopped working here/.test(await txt(p, '[data-p="a-remove-person"][data-i="2"]')), 'Stopped working here asks again');
  await L.tap(p, '[data-p="a-remove-person"][data-i="2"]'); await L.settle(p, 200);
  ok(/Put back/.test(await txt(p, '[data-p="a-remove-person"][data-i="2"]')) && /1 unsaved change/.test(await txt(p, '.a-unsaved') || ''), 'Bo is off the list, with Put back, and 1 unsaved change');
  ok(await p.$('[data-p="a-save"]:not([disabled])') !== null, 'Save is on');
  await L.tap(p, '[data-p="signout"]'); await L.settle(p, 200);
  ok(/Unsaved staff changes/.test(await txt(p, '.p-toast') || '') && /headchef/.test(await txt(p, '.p-bar') || ''), 'Sign out with changes waiting asks again and stays signed in');
  await L.tap(p, '[data-p="a-reset"]'); await L.settle(p, 150);
  ok(/Tap again to undo/.test(await txt(p, '[data-p="a-reset"]')), 'Undo unsaved changes asks again');
  await L.tap(p, '[data-p="a-save"]'); await L.settle(p, 600);
  const bo = ((await cfg(p)).people || []).filter(x => x.id === 'bo')[0];
  ok(bo && bo.active === false, 'saved: Bo is kept, off the list (' + JSON.stringify(bo && bo.active) + ')');
  await L.tap(p, '[data-p="a-remove-person"][data-i="2"]'); await L.settle(p, 150);
  await L.tap(p, '[data-p="a-save"]'); await L.settle(p, 600);
  ok(((await cfg(p)).people || []).filter(x => x.id === 'bo')[0].active === true, 'Put back and Save: Bo is on the list again');
  await L.tap(p, '[data-p="a-reset-pin"][data-id="ann"]'); await L.settle(p, 100);
  await L.tap(p, '[data-p="a-reset-pin"][data-id="ann"]'); await L.settle(p, 500);
  ok(/Ann's PIN is reset/.test(await txt(p, '.p-toast') || ''), 'Reset PIN names the person (' + await txt(p, '.p-toast') + ')');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})();
