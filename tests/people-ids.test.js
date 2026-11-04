// Who may set a PIN (staffIds), and roles changed from the prep book. A sous chef's staff list save sends the people
// list and staffIds only. When a role in the people list does not match sousIds (a sous
// chef changed it), the admin panel does not publish it quietly: it shows "Changed from the prep book" with Keep these
// changes and Undo them, and keeps the signed-in head and only adds staffIds by itself.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const store = page => page.evaluate(() => window.__fake.dump());
const people = x => [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, ping: false, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, ping: false, active: true },
  Object.assign({ id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, ping: false, active: true }, x || {})
];
// Bo's edited row is a pending request; the owner-approved capabilities still describe the original Staff row.
const cfg = (bo, lists) => { const e = {}; e[CFG] = Object.assign({ people: people(bo), sousIds: ['sam'], pingIds: ['sam'],
  addIds: ['sam', 'ann', 'bo'], tickIds: ['sam', 'ann', 'bo'], delIds: ['sam'], showBadges: true }, lists || {}); return e; };
const same = (a, b) => (a || []).slice().sort().join(',') === b.slice().sort().join(',');

(async () => {
  const b = await L.start();
  let p, s;

  // admin: Bo was marked Sous chef in the people list but is not in sousIds: the card shows, sousIds is left alone, staffIds is added
  p = await L.open(b, '#/admin', { admin: true, extra: cfg({ role: 'sous', del: true }), wait: 1800 });
  s = await store(p);
  ok(/Bo/.test(await txt(p, '.a-ids-list')) && /now marked Sous chef/.test(await txt(p, '.a-ids-list')), 'admin: the card says Bo is now marked Sous chef');
  ok(same(s[CFG].sousIds, ['sam', 'head']) && same(s[CFG].pingIds, ['sam', 'head']), 'admin: sousIds and pingIds were not published quietly');
  ok(same(s[CFG].staffIds, ['sam', 'ann', 'bo', 'head']), 'admin: staffIds was added by itself');
  ok(s[CFG].people.find(x => x.id === 'bo').del === true && !s[CFG].delIds.includes('bo'), 'admin: the requested Delete tick has not changed the owner-approved Staff permission');
  await L.adminTab(p, 'people');
  await L.settle(p, 300);
  ok(await p.$('.a-ids') !== null, 'admin: the card is on every tab');
  await p.click('[data-p="a-ids-undo"]');
  await L.settle(p, 400);
  s = await store(p);
  const bo = s[CFG].people.filter(x => x.id === 'bo')[0];
  ok(bo.role === 'staff' && bo.del === false && same(s[CFG].sousIds, ['sam', 'head']), 'admin: Undo puts Bo back to Staff with Staff permissions');
  ok(await p.$('.a-ids') === null, 'admin: the card goes once settled');
  ok(await p.evaluate(() => document.querySelector('#a-r2') && document.querySelector('#a-r2').value) === 'staff', 'admin: the People tab shows Bo as Staff again');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // admin: Keep on the card while the People tab has a change not saved keeps that change (28 Oct 2026: it went), and
  // its save carries it onto the list without undoing what was kept
  p = await L.open(b, '#/admin', { admin: true, extra: cfg({ role: 'sous', del: true }), wait: 1800 });
  await L.adminTab(p, 'people');
  await L.settle(p, 300);
  await p.fill('#a-bulk', 'Zed');
  await p.click('[data-p="a-bulk-add"]');
  await L.settle(p, 200);
  await L.tap(p, '[data-p="a-ids-keep"]');
  await L.settle(p, 600);
  ok(await p.evaluate(() => (window.LK_PREP.state.draft.people || []).some(x => x.name === 'Zed')) && /1 unsaved change/.test(await txt(p, '.a-unsaved') || ''), 'admin: Keep these changes keeps the person added and not saved yet (' + await txt(p, '.a-unsaved') + ')');
  await L.tap(p, '[data-p="a-save"]');
  await L.settle(p, 500);
  s = await store(p);
  ok(s[CFG].people.some(x => x.name === 'Zed') && same(s[CFG].sousIds, ['sam', 'bo', 'head']) && s[CFG].people.filter(x => x.id === 'bo')[0].role === 'sous' && s[CFG].delIds.includes('bo'), 'admin: Keep approves Bo as Sous chef with Delete and Save adds Zed');
  ok(p.errors.length === 0, 'admin keep with a draft: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // admin: an old Pings tick on Bo (before 20 Oct 2026) asks nothing: pings follow the role, so pingIds stays the sous chefs
  p = await L.open(b, '#/admin', { admin: true, extra: cfg({ ping: true }), wait: 1800 });
  s = await store(p);
  ok(await p.$('.a-ids') === null && same(s[CFG].pingIds, ['sam', 'head']), 'admin: no card for an old Pings tick, pingIds keeps Sam and the head');
  await p.context().close();

  // admin: everything in step, no card, and staffIds is seeded on its own
  p = await L.open(b, '#/admin', { admin: true, extra: cfg(), wait: 1800 });
  s = await store(p);
  ok(await p.$('.a-ids') === null, 'admin: no card when the lists match the roles');
  ok(same(s[CFG].staffIds, ['sam', 'ann', 'bo', 'head']), 'admin: staffIds seeded');
  await p.context().close();

  // admin: a save from the People tab writes all three lists from the roles
  p = await L.open(b, '#/admin', { admin: true, extra: cfg(), wait: 1800 });
  await L.adminTab(p, 'people');
  await L.settle(p, 300);
  // Finish the returning owner's canonical setup save before editing this fixture's original Staff row.
  await L.waitFor(p, () => { const c = LK_PREP.state.config; return ['addIds', 'tickIds', 'delIds'].every(k => c[k].includes(c.headId)) && !LK_PREP.unsent(); });
  // A redraw while the picker is open (any write tells every listener again) no longer loses the choice: see below
  await L.pick(p, '#a-r2', 'sous');
  await L.waitFor(p, () => LK_PREP.state.draft.people.find(x => x.id === 'bo').role === 'sous' && !document.querySelector('[data-p="a-save"]').disabled);
  await p.click('[data-p="a-save"]');
  await L.settle(p, 400);
  s = await store(p);
  ok(same(s[CFG].sousIds, ['sam', 'bo', 'head']) && same(s[CFG].pingIds, ['sam', 'bo', 'head']) && same(s[CFG].staffIds, ['sam', 'ann', 'bo', 'head']), 'admin: Save writes sousIds, pingIds and staffIds from the roles');
  ok(await p.$('.a-ids') === null, 'admin: no card after the head chef saves');
  await p.context().close();

  // admin: another phone saves the staff list while the Role picker is open. The page draws again under the picker, so
  // the Role box the picker came from is gone. The choice still lands on Bo's row as it is now (4 Nov 2026: it went to
  // the old box and was lost, and the step above timed out on a busy runner).
  p = await L.open(b, '#/admin', { admin: true, extra: cfg(), wait: 1800 });
  await L.adminTab(p, 'people');
  await L.waitFor(p, () => { const c = LK_PREP.state.config; return ['addIds', 'tickIds', 'delIds'].every(k => c[k].includes(c.headId)) && !LK_PREP.unsent(); });
  await p.evaluate(() => { const s = document.querySelector('#a-r2'); s.dataset.was = '1'; s.nextElementSibling.click(); });
  await L.waitFor(p, () => !!document.querySelector('.ux-picker[open]'));
  await p.evaluate(path => { const c = JSON.parse(JSON.stringify(__fake.dump()[path])); c.people.push({ id: 'cal', name: 'Cal', role: 'staff', add: true, tick: true, del: false, ping: false, active: true }); __fake.write(path, c); }, CFG);
  const redrawn = await L.waitFor(p, () => !document.querySelector('#a-r2[data-was]') && LK_PREP.state.draft.people.some(x => x.id === 'cal')).catch(() => false);
  ok(redrawn && await p.$('.ux-picker[open]') !== null, 'admin redraw: Cal from the other phone is on the list and the picker is still open');
  await p.locator('.ux-picker [data-index="2"]').click();   // Sous chef (head, lead, sous, staff, ...)
  const kept = await L.waitFor(p, () => LK_PREP.state.draft.people.find(x => x.id === 'bo').role === 'sous' && !document.querySelector('[data-p="a-save"]').disabled, null, 3000).catch(() => false);
  ok(kept, 'admin redraw: Bo is Sous chef in the draft and Save is on (' + await p.evaluate(() => LK_PREP.state.draft.people.find(x => x.id === 'bo').role) + ')');
  ok(/Sous chef/.test(await txt(p, '#a-r2-picker') || ''), 'admin redraw: Bo\'s Role box says Sous chef (' + await txt(p, '#a-r2-picker') + ')');
  ok(p.errors.length === 0, 'admin redraw: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // sous chef's staff page: adding a person sends people and staffIds, nothing else
  p = await L.open(b, '#/prep', { extra: cfg(), wait: 1500 });
  await L.chef(p, 'staff');
  await L.settle(p, 200);
  await p.fill('#a-bulk', 'Dee');
  await p.click('[data-p="a-bulk-add"]');
  await L.settle(p, 200);
  await p.evaluate(() => { window.__fake.writes.length = 0; });
  await p.click('[data-p="a-save"]');
  await L.settle(p, 500);
  const w = await p.evaluate(() => window.__fake.writes.map(ops => ops.filter(o => /config\/main$/.test(o.path))).filter(x => x.length)[0]);
  const keys = w ? Object.keys(w[0].data).sort().join(',') : '';
  ok(keys === 'by,people,pinOpen,staffIds,updated,updatedBy', 'staff: the save sends people, staffIds and the PIN set-up windows only (' + keys + ')');
  s = await store(p);
  const dee = s[CFG].people.filter(x => x.name === 'Dee')[0];
  ok(!!dee && dee.role === 'staff' && s[CFG].staffIds.indexOf(dee.id) >= 0, 'staff: Dee is on the list and may set a PIN');
  ok(same(s[CFG].sousIds, ['sam']), 'staff: sousIds untouched');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
