// Shift pings (they used to be called daily notes): only the head chef and sous chefs write them (20 Oct 2026), from
// the admin panel or the chef menu; everyone else reads them. A sous chef's staff list save sends only people and staffIds.
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const today = L.ymd(new Date());
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const store = page => page.evaluate(() => window.__fake.dump());
/* the seed people, with Ann ticked for Pings the old way (pingIds still has her) */
function withAnn() {
  const x = {};
  x[CFG] = { people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, ping: false, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, ping: true, active: true },
    { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, ping: false, active: true }
  ], sousIds: ['sam'], pingIds: ['sam', 'ann'], showBadges: true };
  return x;
}
(async () => {
  const b = await L.start();
  let p, s;

  // admin: the tab is called Shift pings, the People tab has no Pings tick any more (20 Oct 2026: only the head chef
  // and sous chefs write pings), and an old pingIds with Ann in it is put back to the sous chefs when the panel opens
  p = await L.open(b, '#/admin', { admin: true, extra: withAnn(), wait: 1800 });
  await L.adminTab(p, 'notes');
  ok(await txt(p, '[data-p="a-tab"][data-t="notes"]') === 'Shift pings', 'admin: the Notes tab is called Shift pings');
  s = await store(p);
  ok(JSON.stringify(s[CFG].pingIds) === '["sam"]', 'admin: pingIds is the sous chefs only, Ann taken off (' + JSON.stringify(s[CFG].pingIds) + ')');
  ok(!(await p.$('.a-ids-list')), 'admin: no Changed from the prep book card for the old Pings tick');
  ok(/Write a ping/.test(await txt(p, '[data-p="n-new"]') || ''), 'admin: Write a ping button');
  await L.adminTab(p, 'people');
  await L.settle(p, 300);
  ok(!(await p.$('[data-a="perm"][data-perm="ping"]')), 'people: no Pings tick');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Ann (staff, ticked for Pings before) only reads them now: no Write link, no Shift pings in the chef menu
  const ping = withAnn();
  ping[fsKey(['notes', 'n1'])] = { text: 'Delivery: Bidfood 09:00', tag: 'delivery', start: today, until: today, dows: [], removed: false, at: 1, by: 'sam' };
  p = await L.open(b, '#/prep', { who: 'ann', extra: ping, wait: 2000 });
  ok(/Today's shift pings/.test(await txt(p, '#nt-h') || ''), 'popup: called Today\'s shift pings');
  ok(await p.$('.nt') !== null && await p.$('.nt-edit') === null, 'popup: Ann sees the ping but no Write or edit link');
  ok(await txt(p, '.nbell .wtop-lbl') === 'Pings', 'top bar: the bell says Pings');
  await p.click('.nt-got');
  await L.settle(p, 200);
  { const m = await L.chefItems(p); ok(!m.includes('pings') && !m.includes('staff'), 'chef menu: no Shift pings or Manage staff for Ann (' + m + ')'); }
  ok(p.errors.length === 0, 'Ann: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a sous chef writes a ping from the chef menu
  p = await L.open(b, '#/recipes', { who: 'sam', extra: ping, wait: 2000 });
  await p.click('.nt-got', { timeout: 2000 }).catch(() => {});
  await L.chef(p, 'pings');
  await L.settle(p, 500);
  ok(/#\/prep$/.test(p.url()) && await txt(p, '#rtitle') === 'Shift pings', 'sous: Shift pings in the chef menu opens the pings page from another page (' + p.url() + ')');
  await tap(p, '[data-p="n-new"]');
  await L.settle(p, 200);
  await p.fill('[data-k="n-text"]', 'Special: pork belly tonight');
  await tap(p, '[data-p="n-save"]');
  await L.settle(p, 500);
  s = await store(p);
  ok(Object.keys(s).some(k => /\/notes\/[^/]+$/.test(k) && s[k].text === 'Special: pork belly tonight' && s[k].by === 'sam'), 'sous: the ping is saved with Sam\'s id');
  ok(p.errors.length === 0, 'sous pings: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a sous chef saving the staff list sends only the people list and staffIds
  p = await L.open(b, '#/prep', { who: 'sam', extra: withAnn(), wait: 2000 });
  await L.chef(p, 'staff');
  await p.click('[data-p="a-add-person"]');
  await L.settle(p, 150);
  await p.fill('[data-k="a-n3"]', 'Cy');
  await p.evaluate(() => { window.__fake.writes.length = 0; });
  await p.click('[data-p="a-save"]');
  // wait for the save itself: under load it can take longer than a fixed pause
  await L.waitFor(p, k => [].concat.apply([], window.__fake.writes).some(o => o.path === k), CFG, 10000);
  await L.settle(p, 300);
  const w =await p.evaluate(k => { const all = [].concat.apply([], window.__fake.writes); return all.filter(o => o.path === k).map(o => Object.keys(o.data).sort().join(',')); }, CFG);
  ok(w.length === 1 && w[0] === 'by,people,staffIds,updated,updatedBy', 'staff: a sous chef sends only people and staffIds (' + w.join(' | ') + ')');
  s = await store(p);
  ok(JSON.stringify(s[CFG].sousIds) === '["sam"]' && s[CFG].people.length === 4, 'staff: new person added, sousIds kept');
  ok(p.errors.length === 0, 'sous: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
