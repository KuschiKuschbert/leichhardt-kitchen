// Shift pings (they used to be called daily notes): the new names, the Pings tick in the admin People tab, and a person
// ticked for Pings writing them from the prep book. Sous chefs always may; a sous chef's staff list save sends only people and staffIds.
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const today = L.ymd(new Date());
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const store = page => page.evaluate(() => window.__fake.dump());
/* the seed people, with Ann ticked for Pings */
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

  // admin: the tab is called Shift pings, the People tab has a Pings tick, and saving keeps pingIds in step
  p = await L.open(b, '#/admin', { admin: true, wait: 1800 });
  await L.adminTab(p, 'notes');
  ok(await txt(p, '[data-p="a-tab"][data-t="notes"]') === 'Shift pings', 'admin: the Notes tab is now called Shift pings');
  s = await store(p);
  ok(JSON.stringify(s[CFG].pingIds) === '["sam"]', 'admin: opening the panel adds pingIds (sous chefs) when it is missing (' + JSON.stringify(s[CFG].pingIds) + ')');
  await L.adminTab(p, 'notes');
  await p.waitForTimeout(300);
  ok(/Write a ping/.test(await txt(p, '[data-p="n-new"]') || ''), 'admin: Write a ping button');
  await L.adminTab(p, 'people');
  await p.waitForTimeout(300);
  const box = i => p.evaluate(i => { const e = document.querySelector('[data-a="perm"][data-perm="ping"][data-i="' + i + '"]'); return e ? { on: e.checked, off: e.disabled } : null; }, i);
  const sam = await box(0), ann = await box(1);
  ok(!!sam && sam.on && sam.off, 'people: a sous chef\'s Pings tick is on and cannot be changed');
  ok(!!ann && !ann.on && !ann.off, 'people: a staff member\'s Pings tick starts off');
  await p.click('[data-a="perm"][data-perm="ping"][data-i="1"]');
  await p.click('[data-p="a-save"]');
  await p.waitForTimeout(500);
  s = await store(p);
  const annP = s[CFG].people.filter(x => x.id === 'ann')[0];
  ok(annP && annP.ping === true, 'people: ticking Pings for Ann saves ping on her record');
  ok(JSON.stringify((s[CFG].pingIds || []).slice().sort()) === '["ann","sam"]', 'people: pingIds lists Ann and the sous chef (' + JSON.stringify(s[CFG].pingIds) + ')');
  ok(JSON.stringify(s[CFG].sousIds) === '["sam"]', 'people: sousIds unchanged');
  await p.selectOption('[data-a="role"][data-i="1"]', 'view');
  await p.waitForTimeout(150);
  ok((await box(1)).on === false, 'people: picking a role resets the Pings tick');
  await p.selectOption('[data-a="role"][data-i="2"]', 'sous');
  await p.waitForTimeout(150);
  const bo = await box(2);
  ok(bo.on && bo.off, 'people: making someone a sous chef turns Pings on');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Ann (ticked for Pings) gets Shift pings in the prep book and can write one
  const ping = withAnn();
  ping[fsKey(['notes', 'n1'])] = { text: 'Delivery: Bidfood 09:00', tag: 'delivery', start: today, until: today, dows: [], removed: false, at: 1, by: 'sam' };
  p = await L.open(b, '#/prep', { who: 'ann', extra: ping, wait: 2000 });
  ok(/Today's shift pings/.test(await txt(p, '#nt-h') || ''), 'popup: called Today\'s shift pings');
  ok(/Write or edit pings/.test(await txt(p, '.nt-edit') || ''), 'popup: Ann gets the Write or edit pings link');
  ok(await txt(p, '.nbell .wtop-lbl') === 'Pings', 'top bar: the bell says Pings');
  await p.click('.nt-got');
  await p.waitForTimeout(200);
  ok(/Shift pings/.test(await txt(p, '[data-p="notes-open"]') || ''), 'prep: Ann sees Shift pings in Handy');
  ok(await p.$('[data-p="staff-open"]') === null, 'prep: Ann does not get Manage staff (sous chefs only)');
  await tap(p, '[data-p="notes-open"]');
  await p.waitForTimeout(300);
  ok(await txt(p, '#rtitle') === 'Shift pings', 'prep: Shift pings page opens for Ann');
  await tap(p, '[data-p="n-new"]');
  await p.waitForTimeout(200);
  await p.fill('[data-k="n-text"]', 'Special: pork belly tonight');
  await tap(p, '[data-p="n-save"]');
  await p.waitForTimeout(500);
  s = await store(p);
  ok(Object.keys(s).some(k => /\/notes\/[^/]+$/.test(k) && s[k].text === 'Special: pork belly tonight' && s[k].by === 'ann'), 'prep: Ann\'s ping is saved with her id');
  ok(/Saved/.test(await p.evaluate(() => window.LK_PREP.state.nMsg)), 'prep: Saved message');
  ok(p.errors.length === 0, 'Ann: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Bo (not ticked) gets neither the button nor the link
  p = await L.open(b, '#/prep', { who: 'bo', extra: ping, wait: 2000 });
  ok(await p.$('.nt') !== null && await p.$('.nt-edit') === null, 'popup: Bo sees the ping but no Write or edit link');
  await p.click('.nt-got');
  await p.waitForTimeout(200);
  ok(await p.$('[data-p="notes-open"]') === null, 'prep: Bo does not see Shift pings in Handy');
  await p.context().close();

  // a sous chef saving the staff list sends only the people list, so pingIds and the Pings ticks stay as they are
  p = await L.open(b, '#/prep', { who: 'sam', extra: withAnn(), wait: 2000 });
  ok(/Shift pings/.test(await txt(p, '[data-p="notes-open"]') || ''), 'prep: a sous chef still sees Shift pings');
  await p.click('[data-p="staff-open"]');
  await p.waitForTimeout(300);
  await p.click('[data-p="a-add-person"]');
  await p.waitForTimeout(150);
  await p.fill('[data-k="a-n3"]', 'Cy');
  await p.evaluate(() => { window.__fake.writes.length = 0; });
  await p.click('[data-p="a-save"]');
  await p.waitForTimeout(500);
  const w = await p.evaluate(k => { const all = [].concat.apply([], window.__fake.writes); return all.filter(o => o.path === k).map(o => Object.keys(o.data).sort().join(',')); }, CFG);
  ok(w.length === 1 && w[0] === 'by,people,staffIds,updated,updatedBy', 'staff: a sous chef sends only people and staffIds (' + w.join(' | ') + ')');
  s = await store(p);
  ok(JSON.stringify(s[CFG].pingIds) === '["sam","ann"]' && JSON.stringify(s[CFG].sousIds) === '["sam"]', 'staff: pingIds and sousIds kept');
  ok(s[CFG].people.length === 4 && s[CFG].people.filter(x => x.id === 'ann')[0].ping === true, 'staff: new person added, Ann keeps her Pings tick');
  ok(p.errors.length === 0, 'sous: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
