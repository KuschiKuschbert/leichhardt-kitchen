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
  ok(/Not saved yet/.test(await txt(p, '.p-toast') || '') && /headchef/.test(await txt(p, '.p-bar') || ''), 'Sign out with changes waiting asks again and stays signed in');
  // the bar is about the Google account, not the person, and Prep is in the top bar (23 Oct 2026)
  // the button itself waits for the second tap (29 Oct 2026: only the toast said so)
  ok(await txt(p, '.p-bar [data-p="signout"]') === 'Not saved. Tap again' && /^Google account:/.test(await txt(p, '.p-bar') || '') && !(await p.$('.p-bar a[href="#/prep"]')), 'admin bar: Google account, Sign out of Google asking again, no Prep list link (' + await txt(p, '.p-bar') + ')');
  ok(/Sign out of Google again/.test(await txt(p, '.p-toast') || ''), 'admin bar: the toast names Sign out of Google');
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
  // Delete for good (head chef, 19 Nov 2026): on each saved row but the head chef's, two taps, Undo, then Save takes the
  // person off the list itself and wipes their PIN in the same write
  const pinOf = id => p.evaluate(o => { const s = window.__fake.dump(); return [!!s[o.r + '/staffpins/' + o.id], !!s[o.r + '/pinset/' + o.id]]; }, { r: ['kitchens', L.PIN].join('/'), id });
  const names = () => p.$$eval('.a-name', els => els.map(e => e.value));
  ok((await p.$$('[data-p="a-delete-person"]')).length === 3 && !(await p.$('[data-p="a-delete-person"][data-i="3"]')), 'Delete on Sam, Ann and Bo, not on the head chef');
  await L.tap(p, '[data-p="a-delete-person"][data-i="2"]'); await L.settle(p, 150);
  ok(/Tap again: delete for good/.test(await txt(p, '[data-p="a-delete-person"][data-i="2"]')) && (await names()).includes('Bo'), 'Delete asks again and Bo is still there');
  await L.tap(p, '[data-p="a-delete-person"][data-i="2"]'); await L.settle(p, 200);
  ok(!(await names()).includes('Bo') && /Bo is deleted when you save/.test(await txt(p, '.p-toast') || '') && /1 unsaved change/.test(await txt(p, '.a-unsaved') || ''), 'Bo leaves the list, named, with 1 unsaved change');
  await L.tap(p, '.p-toast .p-toast-btn'); await L.settle(p, 200);
  ok((await names()).includes('Bo') && await p.$('.a-unsaved') === null, 'Undo brings Bo back, nothing to save');
  await L.tap(p, '[data-p="a-delete-person"][data-i="2"]'); await L.settle(p, 150);
  await L.tap(p, '[data-p="a-delete-person"][data-i="2"]'); await L.settle(p, 200);
  ok(JSON.stringify(await pinOf('bo')) === '[true,true]', 'Bo\'s PIN stays until Save');
  await L.tap(p, '[data-p="a-save"]'); await L.settle(p, 1800);
  const after = await cfg(p);
  ok(!(after.people || []).some(x => x.id === 'bo') && !(after.staffIds || []).includes('bo'), 'saved: Bo is off the team list itself');
  ok(JSON.stringify(await pinOf('bo')) === '[false,false]' && JSON.stringify(await pinOf('sam')) === '[true,true]', 'saved: Bo\'s PIN is wiped, Sam\'s is kept');
  ok(/Deleted: Bo\./.test(await p.evaluate(() => document.body.innerText)), 'the Save line names who was deleted');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})();
