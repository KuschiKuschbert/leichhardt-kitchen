// The head chef's own name on the list (role head, config/main headId). Only the head chef's Google account can give it.
// That person always has every permission and the sous chef pages, is in sousIds and pingIds, and a sous chef's save
// can neither change nor remove the role: headId is kept, and every phone reads the person back as Head chef.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const store = page => page.evaluate(() => window.__fake.dump());
const same = (a, b) => (a || []).slice().sort().join(',') === b.slice().sort().join(',');
const P = (id, name, role, x) => Object.assign({ id, name, role, add: true, tick: true, del: role !== 'staff', ping: role === 'sous', active: true }, x || {});
const cfg = (people, lists) => { const e = {}; e[CFG] = Object.assign({ people, showBadges: true }, lists || {}); return e; };

(async () => {
  const b = await L.start();
  let p, s;

  // admin: no head chef yet, the People tab says so; picking Head chef and saving writes headId, sousIds and pingIds
  p = await L.open(b, '#/admin', { admin: true, extra: cfg([P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('bo', 'Bo', 'staff')], { sousIds: ['sam'], pingIds: ['sam'] }), wait: 1800 });
  await L.adminTab(p, 'people');
  await L.settle(p, 300);
  ok(/No one is marked Head chef yet/.test(await txt(p, '.a-nohead')), 'admin: the People tab asks for a head chef');
  ok(await p.evaluate(() => [...document.querySelectorAll('#a-r1 option')].some(o => o.value === 'head')), 'admin: Head chef is a role the head chef can pick');
  await p.selectOption('#a-r1', 'head');
  await L.settle(p, 200);
  await p.click('[data-p="a-save"]');
  await L.settle(p, 500);
  s = await store(p);
  const ann = s[CFG].people.filter(x => x.id === 'ann')[0];
  ok(s[CFG].headId === 'ann' && ann.role === 'head' && ann.add && ann.tick && ann.del && ann.ping, 'admin: Ann is saved as Head chef with every permission');
  ok(same(s[CFG].sousIds, ['sam', 'ann']) && same(s[CFG].pingIds, ['sam', 'ann']), 'admin: the head chef is in sousIds and pingIds');
  ok(await p.$('.a-nohead') === null, 'admin: the hint goes once a head chef is set');
  // only one head chef: picking Bo makes Ann a sous chef
  await p.selectOption('#a-r2', 'head');
  await L.settle(p, 200);
  ok(await p.evaluate(() => document.querySelector('#a-r1').value) === 'sous', 'admin: a second Head chef turns the first into Sous chef');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a sous chef's save once demoted the head chef to Staff in the people list: every phone still reads Ann as Head chef
  const demoted = cfg([P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff', { del: false, ping: false }), P('bo', 'Bo', 'staff')], { headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'] });
  p = await L.open(b, '#/prep', { who: 'ann', extra: demoted, wait: 1500 });
  { const m = await L.chefItems(p); ok(m.join(',') === 'drinks,minutes,fn,admin,manage,pings,todo,staff,settings,out', 'head chef PIN: the chef menu has Shift pings, Chef to-do and Manage staff like a sous chef, and no Kitchen mail to herself (' + m + ')'); }
  ok(p.errors.length === 0, 'head chef PIN: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // admin opens on the demoted list: no "Changed from the prep book" card, the head chef is still Head chef
  p = await L.open(b, '#/admin', { admin: true, extra: demoted, wait: 1800 });
  ok(await p.$('.a-ids') === null, 'admin: a sous chef cannot demote the head chef, so there is nothing to ask');
  await L.adminTab(p, 'people');
  await L.settle(p, 300);
  ok(await p.evaluate(() => document.querySelector('#a-r1').value) === 'head', 'admin: Ann shows as Head chef');
  await p.context().close();

  // sous chef's staff page: no Remove for the head chef, and the save keeps her as Head chef
  p = await L.open(b, '#/prep', { extra: demoted, wait: 1500 });
  await L.chef(p, 'staff');
  await L.settle(p, 200);
  const rows = await p.evaluate(() => [...document.querySelectorAll('.a-person')].map(li => li.textContent));
  const annRow = rows.filter(t => /Ann/.test(t))[0] || '';
  ok(/Head chef/.test(annRow) && !/Remove|Stopped working here/.test(annRow), 'staff: the head chef has no Stopped working here button');
  ok(rows.filter(t => /Bo/.test(t)).every(t => /Stopped working here/.test(t)), 'staff: everyone else can still be taken off the list');
  await p.fill('#a-bulk', 'Dee');
  await p.click('[data-p="a-bulk-add"]');
  await L.settle(p, 200);
  await p.click('[data-p="a-save"]');
  await L.settle(p, 500);
  s = await store(p);
  const ann2 = s[CFG].people.filter(x => x.id === 'ann')[0];
  ok(ann2 && ann2.role === 'head' && ann2.active && s[CFG].headId === 'ann', 'staff: the save keeps Ann as Head chef and on the list');
  ok(same(s[CFG].sousIds, ['sam', 'ann']), 'staff: sousIds untouched');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // staff stay staff: Bo has no sous chef pages
  p = await L.open(b, '#/prep', { who: 'bo', extra: demoted, wait: 1500 });
  { const m = await L.chefItems(p); ok(!m.includes('staff') && !m.includes('pings') && m.includes('out'), 'staff PIN: no Chef group for Bo, Sign out is there (' + m + ')'); }
  await p.context().close();

  // the Head chef's PIN on a phone without the Google sign-in: Admin shows in the chef hat menu and leads to the sign-in.
  // The PIN alone never opens the panel.
  const admBtn = L.admItem;
  p = await L.open(b, '#/', { who: 'ann', extra: demoted, wait: 1800 });
  ok((await admBtn(p)) === 'outline', 'head chef PIN: Admin shows in the menu, Sign in with Google (' + await admBtn(p) + ')');
  ok(!(await L.overflow(p)), 'head chef PIN: no sideways scroll with Admin (' + await L.overflow(p) + ')');
  await p.click('.wtop-who'); await L.settle(p, 150);
  await p.click('.wm .wm-adm');
  await L.settle(p, 800);
  ok(/stays signed in/.test(await txt(p, '.a-headpin')) && await p.$('[data-p="signin"]') !== null, 'head chef PIN: Admin opens the page with Sign in with Google');
  ok(await p.$('[data-p="a-tab"]') === null, 'head chef PIN: the PIN alone does not open the admin panel');
  ok(p.errors.length === 0, 'head chef PIN Admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  for (const w of [1280, 1440]) {
    p = await L.open(b, '#/', { who: 'ann', extra: demoted, width: w, height: 900, wait: 1800 });
    const lines = await p.evaluate(() => { const el = document.querySelector('.wtop-brand b'); return el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).fontSize); });
    ok(lines < 1.6, 'head chef PIN at ' + w + ': "Kitchen Book" stays on one line with Admin (' + lines.toFixed(1) + ' lines)');
    await p.context().close();
  }
  p = await L.open(b, '#/', { who: 'bo', extra: demoted, wait: 1800 });
  ok((await admBtn(p)) === 'none', 'staff PIN: no Admin in the menu for Bo (' + await admBtn(p) + ')');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
