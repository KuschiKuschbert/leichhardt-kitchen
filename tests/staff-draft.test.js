// The staff list can change on another phone while the People tab or Manage staff is open. A draft with nothing changed
// follows it; a draft with changes keeps them and, on Save, carries only what it changed onto the latest list, so the
// other phone's save is not wiped by a copy taken when the page opened (audit, October 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const CFG = 'kitchens/' + L.PIN + '/config/main';
const store = page => page.evaluate(() => window.__fake.dump());
const people = s => (s[CFG].people || []);
const byName = (s, n) => people(s).filter(p => p.name === n)[0];
// another phone saves the list with one change
const elsewhere = (page, change) => page.evaluate(([k, ch]) => {
  const c = JSON.parse(JSON.stringify(window.__fake.dump()[k]));
  if (ch.rename) c.people.forEach(p => { if (p.name === ch.rename[0]) p.name = ch.rename[1]; });
  if (ch.role) c.people.forEach(p => { if (p.name === ch.role[0]) p.role = ch.role[1]; });
  if (ch.add) c.people.push({ id: ch.add.toLowerCase(), name: ch.add, role: 'staff', add: true, tick: true, del: false, active: true });
  c.updated = Date.now(); c.updatedBy = 'Other phone';
  window.__fake.write(k, c);
}, [CFG, change]);
(async () => {
  const b = await L.start();

  // head chef, People tab: a clean draft follows another phone's change
  let p = await L.open(b, '#/admin', { admin: true, wait: 1500 });
  await L.adminTab(p, 'people');
  await p.waitForTimeout(300);
  await elsewhere(p, { add: 'Dee' });
  await p.waitForTimeout(400);
  const names = page => page.evaluate(() => Array.from(document.querySelectorAll('#prep-root input')).map(i => i.value));
  ok((await names(p)).indexOf('Dee') >= 0, 'people: a person added on another phone shows up without saving');
  ok(await p.$('.a-stale') === null, 'people: no stale hint while nothing is changed here');

  // a draft with changes keeps them, and Save carries only those changes onto the latest list
  await p.fill('[data-k="a-bulk"]', 'Eve');
  await p.click('[data-p="a-bulk-add"]');
  await p.waitForTimeout(200);
  await elsewhere(p, { rename: ['Ann', 'Annie'] });
  await p.waitForTimeout(400);
  ok(await p.$('.a-stale') !== null, 'people: the stale hint shows once the list changed under a draft with changes');
  await p.click('[data-p="a-save"]');
  await p.waitForTimeout(600);
  let s = await store(p);
  ok(!!byName(s, 'Eve'), 'people: the person added here is saved');
  ok(!!byName(s, 'Annie') && !byName(s, 'Ann'), 'people: the rename from the other phone is kept, not wiped');
  ok(!!byName(s, 'Dee'), 'people: the person the other phone added is kept');
  ok(/Saved/.test(await txt(p, '.saved')), 'people: the save message shows');
  ok(await p.$('.a-stale') === null, 'people: the stale hint is gone after saving');
  ok(p.errors.length === 0, 'people: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // sous chef, Manage staff: the head chef makes Bo a sous chef while Sam adds someone
  p = await L.open(b, '#/prep', { wait: 1500 });
  await L.chef(p, 'staff');
  await p.waitForTimeout(300);
  await p.fill('[data-k="a-bulk"]', 'Fay');
  await p.click('[data-p="a-bulk-add"]');
  await p.waitForTimeout(200);
  await elsewhere(p, { role: ['Bo', 'sous'] });
  await p.waitForTimeout(400);
  await p.click('[data-p="a-save"]');
  await p.waitForTimeout(600);
  s = await store(p);
  ok(!!byName(s, 'Fay'), 'staff: the person Sam added is saved');
  ok(byName(s, 'Bo').role === 'sous', 'staff: the role the head chef set meanwhile is kept, not reverted');
  ok((s[CFG].sousIds || []).join() === 'sam', 'staff: a sous chef\'s save leaves sousIds alone');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
