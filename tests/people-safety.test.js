// Admin People safety (usability U13a, head chef decision D6): the Save bar counts unsaved changes and Save is off
// when there are none, Undo and Sign out ask again with changes waiting, someone who leaves is taken off the list with
// Put back instead of deleted, and Reset PIN names the person.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const CFG = ['kitchens', L.PIN, 'config', 'main'].join('/');
const cfg = p => p.evaluate(k => window.__fake.dump()[k], CFG);
const row = id => '.pp-row[data-pid="' + id + '"]';
const editor = id => '#pp-editor[data-pid="' + id + '"]';
const resetPin = id => '[data-p="a-reset-pin"][data-id="' + id + '"]';
(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, wait: 1800 });
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  const open = async id => { await L.tap(p, '[data-p="a-person-open"][data-id="' + id + '"]'); await L.settle(p, 200); };
  ok(await p.$('[data-p="a-save"][disabled]') !== null && await p.$('.a-unsaved') === null, 'nothing changed: Save is off, no count');
  ok(/Staff · Add, Tick/.test(await txt(p, row('bo') + ' .pp-can') || '') && /Head chef · Everything/.test(await txt(p, row('head') + ' .pp-can') || '') && await p.locator('.pp-ed, .pp-row input, .pp-row select, [data-p="a-reset-pin"]').count() === 0, 'rows say role and rights in words. Fields and Reset PIN appear after selecting a person');
  const boName = p.locator(row('bo')).getByRole('button', { name: 'Bo', exact: true });
  ok(await boName.count() === 1 && await boName.getAttribute('aria-expanded') === 'false' &&
    !await p.locator('.pp-row button').filter({ hasText: /^Change/ }).count(), 'the name is the only toggle, with no separate Change button');
  await boName.locator('.pp-n').click(); await L.settle(p, 200);
  ok(await p.locator(row('bo') + '.is-open').count() === 1 && await p.locator(editor('bo') + ' .a-name').count() === 1 &&
    await boName.getAttribute('aria-expanded') === 'true', 'tapping Bo selects him and opens his editor');
  const listBox = await p.locator('[data-lvb="people"]').boundingBox();
  const editorBox = await p.locator(editor('bo')).boundingBox();
  ok(listBox && editorBox && editorBox.x >= listBox.x + listBox.width, 'desktop: the roster stays visible to the left of the editor');
  const columns = id => p.locator(row(id)).evaluate(e => ['.pp-n', '.pp-role', '.pp-perms'].map(s => e.querySelector(s).getBoundingClientRect().left));
  const annColumns = await columns('ann'), boColumns = await columns('bo');
  ok(annColumns.every((x, i) => Math.abs(x - boColumns[i]) < 1) && boColumns[0] < boColumns[1] && boColumns[1] < boColumns[2], 'desktop: name, role and permissions align across rows');
  await boName.press('Enter'); await L.settle(p, 200);
  ok(await boName.getAttribute('aria-expanded') === 'false' && !await p.locator('.pp-row.is-open').count() &&
    await boName.evaluate(e => e === document.activeElement && e.matches(':focus-visible')), 'Enter closes the editor and leaves visible focus on Bo');
  await boName.press('Space'); await L.settle(p, 200);
  ok(await boName.getAttribute('aria-expanded') === 'true', 'Space opens Bo again');
  await open('ann');
  ok(await p.$(row('bo') + '.is-open') === null && await p.$(row('ann') + '.is-open') !== null &&
    await p.locator(editor('ann') + ' .a-name').inputValue() === 'Ann' && await p.locator('.pp-ed').count() === 1, 'opening Ann replaces Bo in the editor');
  await open('bo');
  await L.tap(p, '[data-p="a-remove-person"][data-i="2"]'); await L.settle(p, 150);
  ok(/Tap again: stopped working here/.test(await txt(p, '[data-p="a-remove-person"][data-i="2"]')), 'Stopped working here asks again');
  await L.tap(p, '[data-p="a-remove-person"][data-i="2"]'); await L.settle(p, 200);
  ok(/Put back on the list/.test(await txt(p, '[data-p="a-remove-person"][data-i="2"]')) && /Not saved: stopped working here/.test(await txt(p, row('bo') + ' .pp-st') || '') && /1 unsaved change: Bo/.test(await txt(p, '.a-unsaved') || ''), 'Bo is off the list, with Put back, Not saved in his row, and the bar names him');
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
  ok(await p.$('.pp-row.is-open') === null && /Off the list/.test(await txt(p, row('bo') + ' .pp-st') || ''), 'after Save: the editor closes and Bo says Off the list');
  await open('bo');
  ok(await p.locator(editor('bo') + ' ' + resetPin('bo')).count() === 0, 'Bo has no Reset PIN while he is off the list');
  await L.tap(p, '[data-p="a-remove-person"][data-i="2"]'); await L.settle(p, 150);
  await L.tap(p, '[data-p="a-save"]'); await L.settle(p, 600);
  ok(((await cfg(p)).people || []).filter(x => x.id === 'bo')[0].active === true, 'Put back and Save: Bo is on the list again');
  await open('ann');
  ok(await p.locator('[data-p="a-reset-pin"]').count() === 1 && await p.locator(editor('ann') + ' ' + resetPin('ann')).count() === 1, 'Reset PIN is available only in the selected editor');
  await L.tap(p, resetPin('ann')); await L.settle(p, 100);
  await L.tap(p, resetPin('ann')); await L.settle(p, 500);
  ok(/Ann's PIN is reset/.test(await txt(p, '.p-toast') || ''), 'Reset PIN in the editor names the person (' + await txt(p, '.p-toast') + ')');
  // Delete for good is in the selected editor and unavailable for the head chef. The row stays struck through with
  // Undo delete until Save, and the bar names who will be deleted; Save takes them off the list and wipes their PIN
  const pinOf = id => p.evaluate(o => { const s = window.__fake.dump(); return [!!s[o.r + '/staffpins/' + o.id], !!s[o.r + '/pinset/' + o.id]]; }, { r: ['kitchens', L.PIN].join('/'), id });
  await open('head');
  ok(await p.$('[data-p="a-delete-person"]') === null, 'the head chef, opened, has no Delete for good');
  await open('bo');
  ok(await p.$$eval('[data-p="a-delete-person"]', e => e.length) === 1, 'Bo, opened, has Delete for good');
  await L.tap(p, '[data-p="a-delete-person"]'); await L.settle(p, 150);
  ok(/Tap again: delete for good/.test(await txt(p, '[data-p="a-delete-person"]')), 'Delete for good asks again');
  await L.tap(p, '[data-p="a-delete-person"]'); await L.settle(p, 200);
  ok(await p.$(row('bo') + '.is-gone:not(.is-open)') !== null && /Deleted when you save/.test(await txt(p, row('bo') + ' .pp-st') || '') && await p.$(row('bo') + ' [data-p="a-undelete-person"]') !== null && await p.$(row('bo') + ' [data-p="a-reset-pin"], ' + row('bo') + ' [data-p="a-person-open"]') === null, 'Bo stays, closed and struck through: Deleted when you save, only Undo delete');
  ok(/Bo is deleted when you save/.test(await txt(p, '.p-toast') || '') && /Deleted when you save: Bo/.test(await txt(p, '.a-gone') || ''), 'the slip and the Save bar name Bo');
  await L.tap(p, row('bo') + ' [data-p="a-undelete-person"]'); await L.settle(p, 200);
  ok(await p.$(row('bo') + '.is-gone') === null && await p.$('.a-unsaved') === null && /Undone: Bo stays on the team list/.test(await txt(p, '.p-toast') || ''), 'Undo delete brings Bo back, says Undone, nothing to save');
  // the keeper's check: change Ann, delete Bo, another phone saves meanwhile, one Save keeps all three
  await open('ann');
  await p.locator(editor('ann') + ' [data-a="perm"][data-perm="del"]').click();
  await L.settle(p, 200);
  ok(/Not saved: Remove on/.test(await txt(p, row('ann') + ' .pp-st') || '') && /Staff · Add, Tick, Remove/.test(await txt(p, row('ann') + ' .pp-can') || ''), 'Ann: the tick shows at once in her row, Not saved: Remove on');
  await open('bo');
  await L.tap(p, '[data-p="a-delete-person"]'); await L.settle(p, 120); await L.tap(p, '[data-p="a-delete-person"]'); await L.settle(p, 200);
  await p.evaluate(k => { const c = JSON.parse(JSON.stringify(window.__fake.dump()[k])); c.people.forEach(x => { if (x.id === 'sam') x.name = 'Sam B'; }); c.updated = Date.now(); window.__fake.write(k, c); }, CFG);
  await L.settle(p, 400);
  ok(/2 unsaved changes: Ann/.test(await txt(p, '.a-unsaved') || '') && /Deleted when you save: Bo/.test(await txt(p, '.a-gone') || ''), 'the bar counts both and names Ann, and Bo in red (' + await txt(p, '.a-unsaved') + ')');
  ok(JSON.stringify(await pinOf('bo')) === '[true,true]', 'Bo\'s PIN stays until Save');
  await L.tap(p, '[data-p="a-save"]'); await L.settle(p, 1800);
  const after = await cfg(p), ann = (after.people || []).filter(x => x.id === 'ann')[0], sam = (after.people || []).filter(x => x.id === 'sam')[0];
  ok(!(after.people || []).some(x => x.id === 'bo') && !(after.staffIds || []).includes('bo'), 'saved: Bo is off the team list itself');
  ok(ann && ann.del === true && (after.delIds || []).includes('ann') && sam && sam.name === 'Sam B', 'saved: Ann may Remove, and the other phone\'s change to Sam is kept');
  ok(JSON.stringify(await pinOf('bo')) === '[false,false]' && JSON.stringify(await pinOf('sam')) === '[true,true]', 'saved: Bo\'s PIN is wiped, Sam\'s is kept');
  ok(/Deleted: Bo\./.test(await p.evaluate(() => document.body.innerText)) && await p.$(row('bo')) === null, 'the Save line names who was deleted, and Bo\'s row is gone');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  const more = L.seed()[CFG];
  for (let i = 1; i <= 12; i++) {
    more.people.push({ id: 'person-' + i, name: 'Person ' + i, role: 'staff', add: true, tick: true, del: false, active: true });
  }
  const mobile = await L.open(b, '#/admin', { admin: true, width: 390, height: 844, extra: { [CFG]: more }, wait: 1800 });
  await L.adminTab(mobile, 'people');
  const activeFilter = '[data-p="lv-f"][data-lv="people"][data-v="on"]';
  await mobile.locator(activeFilter).evaluate(e => e.click());
  const search = mobile.locator('[data-k="lv-q:people"]');
  await search.fill('Person');
  await L.waitFor(mobile, () => document.querySelectorAll('.pp-row').length === 12);
  const person = mobile.locator(row('person-10') + ' [data-p="a-person-open"]');
  const openOnMobile = async () => {
    await person.evaluate(e => {
      e.scrollIntoView({ block: 'center' });
      e.addEventListener('click', () => { window.peoplePosition = { y: scrollY, top: e.getBoundingClientRect().top }; }, { once: true });
    });
    await person.click();
    return mobile.evaluate(() => window.peoplePosition);
  };
  const before = await openOnMobile();
  const mobileEditor = mobile.locator(editor('person-10'));
  const back = mobile.locator('.wtop [aria-label="Back to people"]');
  ok(await mobileEditor.isVisible() && !await search.isVisible() && await back.isVisible() &&
    await mobile.locator('#pp-editor-title').evaluate(e => e === document.activeElement), 'phone: a person opens a focused editor with Back to people');
  const remove = mobileEditor.locator('[data-a="perm"][data-perm="del"]');
  await remove.check();
  await back.click();
  await L.settle(mobile, 150);
  const afterY = await mobile.evaluate(() => scrollY);
  ok(!await mobileEditor.isVisible() && await search.inputValue() === 'Person' && await mobile.locator('.pp-row').count() === 12 &&
    await mobile.locator(activeFilter).getAttribute('aria-pressed') === 'true' && before.y > 0 && Math.abs(before.y - afterY) <= 2 &&
    await person.evaluate(e => e === document.activeElement), 'phone: Back restores the filtered roster, scroll position and focus (' + before.y + ' to ' + afterY + ')');
  ok(/Not saved: Remove on/.test(await txt(mobile, row('person-10') + ' .pp-st') || ''), 'phone: the roster shows the unsaved edit');
  const beforeResize = await openOnMobile();
  ok(await remove.isChecked() && !(await cfg(mobile)).people.find(x => x.id === 'person-10').del, 'phone: reopening keeps the permission draft pending Save');
  await mobile.setViewportSize({ width: 1000, height: 844 });
  await L.settle(mobile, 150);
  ok(await search.isVisible() && await mobileEditor.getByRole('button', { name: 'Close editor' }).isVisible() &&
    !await back.isVisible() && await remove.isChecked(), 'at desktop width the roster and Close editor appear and the header Back returns to page navigation');
  await mobile.setViewportSize({ width: 600, height: 844 });
  await L.settle(mobile, 150);
  ok(!await search.isVisible() && await back.isVisible() && await remove.isChecked(),
    'at phone width the header Back returns to People and the permission draft stays open');
  await back.click();
  await L.settle(mobile, 150);
  const afterResize = await person.evaluate(e => ({ top: e.getBoundingClientRect().top, focused: document.activeElement === e }));
  ok(Math.abs(afterResize.top - beforeResize.top) <= 2 && afterResize.focused &&
    await search.inputValue() === 'Person' && await mobile.locator(activeFilter).getAttribute('aria-pressed') === 'true' &&
    /Not saved: Remove on/.test(await txt(mobile, row('person-10') + ' .pp-st') || ''),
    'phone: Back after resizing keeps the selected name in the same place (' + beforeResize.top + ' to ' + afterResize.top + '), with focus, filters and the draft');
  ok(mobile.errors.length === 0, 'phone: no page errors ' + mobile.errors.join(' | '));
  await mobile.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
