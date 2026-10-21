// Who may set a PIN (staffIds), and roles changed from the prep book. A sous chef's staff list save sends the people
// list and staffIds only. When a role in the people list does not match sousIds (a sous
// chef changed it), the admin panel does not publish it quietly: it shows "Changed from the prep book" with Keep these
// changes and Undo them, and only adds staffIds by itself.
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
const cfg = (bo, lists) => { const e = {}; e[CFG] = Object.assign({ people: people(bo), sousIds: ['sam'], pingIds: ['sam'], showBadges: true }, lists || {}); return e; };
const same = (a, b) => (a || []).slice().sort().join(',') === b.slice().sort().join(',');

(async () => {
  const b = await L.start();
  let p, s;

  // admin: Bo was marked Sous chef in the people list but is not in sousIds: the card shows, sousIds is left alone, staffIds is added
  p = await L.open(b, '#/admin', { admin: true, extra: cfg({ role: 'sous', del: true }), wait: 1800 });
  s = await store(p);
  ok(/Bo/.test(await txt(p, '.a-ids-list')) && /now marked Sous chef/.test(await txt(p, '.a-ids-list')), 'admin: the card says Bo is now marked Sous chef');
  ok(same(s[CFG].sousIds, ['sam']) && same(s[CFG].pingIds, ['sam']), 'admin: sousIds and pingIds were not published quietly');
  ok(same(s[CFG].staffIds, ['sam', 'ann', 'bo']), 'admin: staffIds was added by itself');
  await L.adminTab(p, 'people');
  await L.settle(p, 300);
  ok(await p.$('.a-ids') !== null, 'admin: the card is on every tab');
  await p.click('[data-p="a-ids-undo"]');
  await L.settle(p, 400);
  s = await store(p);
  const bo = s[CFG].people.filter(x => x.id === 'bo')[0];
  ok(bo.role === 'staff' && bo.del === false && same(s[CFG].sousIds, ['sam']), 'admin: Undo puts Bo back to Staff with Staff permissions');
  ok(await p.$('.a-ids') === null, 'admin: the card goes once settled');
  ok(await p.evaluate(() => document.querySelector('#a-r2') && document.querySelector('#a-r2').value) === 'staff', 'admin: the People tab shows Bo as Staff again');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // admin: an old Pings tick on Bo (before 20 Oct 2026) asks nothing: pings follow the role, so pingIds stays the sous chefs
  p = await L.open(b, '#/admin', { admin: true, extra: cfg({ ping: true }), wait: 1800 });
  s = await store(p);
  ok(await p.$('.a-ids') === null && same(s[CFG].pingIds, ['sam']), 'admin: no card for an old Pings tick, pingIds stays Sam');
  await p.context().close();

  // admin: everything in step, no card, and staffIds is seeded on its own
  p = await L.open(b, '#/admin', { admin: true, extra: cfg(), wait: 1800 });
  s = await store(p);
  ok(await p.$('.a-ids') === null, 'admin: no card when the lists match the roles');
  ok(same(s[CFG].staffIds, ['sam', 'ann', 'bo']), 'admin: staffIds seeded');
  await p.context().close();

  // admin: a save from the People tab writes all three lists from the roles
  p = await L.open(b, '#/admin', { admin: true, extra: cfg(), wait: 1800 });
  await L.adminTab(p, 'people');
  await L.settle(p, 300);
  await p.selectOption('#a-r2', 'sous');
  await L.settle(p, 200);
  await p.click('[data-p="a-save"]');
  await L.settle(p, 400);
  s = await store(p);
  ok(same(s[CFG].sousIds, ['sam', 'bo']) && same(s[CFG].pingIds, ['sam', 'bo']) && same(s[CFG].staffIds, ['sam', 'ann', 'bo']), 'admin: Save writes sousIds, pingIds and staffIds from the roles');
  ok(await p.$('.a-ids') === null, 'admin: no card after the head chef saves');
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
  ok(keys === 'by,people,staffIds,updated,updatedBy', 'staff: the save sends people and staffIds only (' + keys + ')');
  s = await store(p);
  const dee = s[CFG].people.filter(x => x.name === 'Dee')[0];
  ok(!!dee && dee.role === 'staff' && s[CFG].staffIds.indexOf(dee.id) >= 0, 'staff: Dee is on the list and may set a PIN');
  ok(same(s[CFG].sousIds, ['sam']), 'staff: sousIds untouched');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
