// New pages held back from staff: the head chef unticks Guides, Shift pings or Meeting minutes under New pages in the
// People tab, and Staff no longer see the links, the bell, the popup or the minutes card. Sous chefs and leads still do.
// With nothing saved yet (staffSee missing) everyone sees everything, as before.
const L = require('./lib');
const R = [];
const ok = (c, m) => L.check(c, m, R);
const today = L.ymd(new Date(L.NOW));
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const store = page => page.evaluate(() => window.__fake.dump());
const txt = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.trim() : null; }, sel);
const shown = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.offsetParent !== null; }, sel);
/* Sam is a sous chef, Ann is staff, Bo is a lead. A ping and unsigned minutes for today, and the two seed guides. */
function world(see) {
  const x = Object.assign({}, L.guides());
  x[CFG] = { people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, ping: false, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, ping: false, active: true },
    { id: 'bo', name: 'Bo', role: 'lead', add: true, tick: true, del: true, ping: false, active: true }
  ], sousIds: ['sam'], pingIds: ['sam'], showBadges: true };
  if (see) x[CFG].staffSee = see;
  x[fsKey(['notes', 'n1'])] = { text: 'Delivery: Bidfood 09:00', tag: 'delivery', start: today, until: today, dows: [], removed: false, at: 1, by: 'sam' };
  x[fsKey(['minutes', 'm1'])] = { no: 1, v: 1, status: 'published', date: today, start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam', att: [{ id: 'ann', st: 'present' }], guests: '', decisions: 'Fryer oil every Monday', menu: '', safety: '', dates: '', other: '', acts: [], next: '', pubAt: L.NOW, removed: false, at: 1, upd: 1, by: 'sam' };
  return x;
}
const HIDE = { guides: false, pings: false, minutes: false };
const docket = p => p.evaluate(() => Array.prototype.some.call(document.querySelectorAll('.docket'), a => a.getAttribute('href') === '#/guides'));
const tab = p => p.evaluate(() => Array.prototype.some.call(document.querySelectorAll('.tabbar a'), a => a.getAttribute('href') === '#/guides'));

(async () => {
  const b = await L.start();
  let p, s;

  // admin: New pages shows three ticks, all on while nothing is saved; unticking them saves staffSee
  p = await L.open(b, '#/admin', { admin: true, extra: world(), wait: 1800 });
  await p.click('.nt-got', { timeout: 3000 }).catch(() => {});
  await L.settle(p, 200);
  await L.adminTab(p, 'people');
  await L.settle(p, 300);
  const ticks = await p.evaluate(() => Array.prototype.map.call(document.querySelectorAll('[data-a="staffsee"]'), e => e.getAttribute('data-f') + ':' + e.checked).join(','));
  ok(ticks === 'guides:true,pings:true,minutes:true', 'admin: New pages has Guides, Shift pings and Meeting minutes, all ticked to start (' + ticks + ')');
  ok(/Staff see Guides/.test(await txt(p, '.a-feats') || ''), 'admin: the ticks say Staff see ...');
  for (const f of ['guides', 'pings', 'minutes']) await p.click('[data-a="staffsee"][data-f="' + f + '"]');
  await p.click('[data-p="a-save"]');
  await L.settle(p, 500);
  s = await store(p);
  ok(JSON.stringify(s[CFG].staffSee) === JSON.stringify(HIDE), 'admin: saving stores staffSee all off (' + JSON.stringify(s[CFG].staffSee) + ')');
  ok(JSON.stringify(s[CFG].sousIds) === '["sam"]' && JSON.stringify(s[CFG].pingIds) === '["sam"]', 'admin: sousIds and pingIds kept');
  await p.goto(L.BASE + '#/');
  await L.settle(p, 1500);
  ok(await docket(p), 'admin: the head chef still sees the Guides docket');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Ann (staff) with all three held back: no Guides docket or tab, no bell, no popup, no minutes card
  p = await L.open(b, '#/', { who: 'ann', extra: world(HIDE), wait: 2500 });
  ok(!(await docket(p)), 'staff: no Guides docket on the landing page');
  ok(!(await tab(p)), 'staff: no Guides in the tab bar');
  ok(!(await shown(p, '.nbell')), 'staff: no Pings bell');
  ok(await p.$('.nt') === null, 'staff: the shift pings popup does not open');
  ok(await p.$('.wall-mn .mn-nudge') === null, 'staff: no Minutes not signed yet card');
  ok(await p.evaluate(() => localStorage.getItem('lk.feat')) === JSON.stringify(HIDE), 'staff: this phone remembers what it may see (lk.feat)');
  await p.reload({ waitUntil: 'load' });
  await L.settle(p, 150);
  ok(!(await docket(p)), 'staff: after a reload the Guides docket stays away before the book connects');
  await p.goto(L.BASE + '#/guides');
  await L.settle(p, 800);
  ok(/not open to everyone yet/.test(await txt(p, '#prep-root') || ''), 'staff: #/guides says Guides are not open yet');
  ok(await p.$('.g-card') === null, 'staff: no guide cards');
  await p.goto(L.BASE + '#/minutes');
  await L.settle(p, 800);
  ok(/Meeting minutes are not open to everyone yet/.test(await txt(p, '#prep-root') || ''), 'staff: #/minutes says the minutes are not open yet');
  await p.goto(L.BASE + '#/prep');
  await L.settle(p, 1000);
  ok(!(await L.chefItems(p)).includes('minutes'), 'staff: no Meeting minutes in the chef menu');
  ok(await p.$('.mn-nudge') === null, 'staff: no minutes nudge on the prep list');
  await p.goto(L.BASE + '#/recipes');
  await L.settle(p, 400);
  await p.fill('#find', 'icombi');
  await L.settle(p, 400);
  ok(await p.$('.g-hits') === null, 'staff: recipe search lists no guides');
  ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Bo (lead) sees all three while staff do not
  p = await L.open(b, '#/', { who: 'bo', extra: world(HIDE), wait: 2500 });
  ok(await docket(p), 'lead: Guides docket shows');
  ok(await p.$('.nt') !== null, 'lead: the shift pings popup opens');
  await p.click('.nt-got');
  await L.settle(p, 200);
  ok(await shown(p, '.nbell'), 'lead: the Pings bell shows');
  await p.goto(L.BASE + '#/guides');
  await L.settle(p, 800);
  ok(await p.$('.g-card') !== null, 'lead: guide cards show');
  await p.goto(L.BASE + '#/prep');
  await L.settle(p, 1000);
  ok((await L.chefItems(p)).includes('minutes'), 'lead: Meeting minutes in the chef menu');
  ok(p.errors.length === 0, 'lead: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // only Guides held back: Ann gets the pings popup and the minutes card, but no Guides
  p = await L.open(b, '#/', { who: 'ann', extra: world({ guides: false, pings: true, minutes: true }), wait: 2500 });
  ok(!(await docket(p)), 'guides only: no Guides docket for staff');
  ok(await p.$('.nt') !== null, 'guides only: the pings popup opens for staff');
  // the minutes are read from Firestore: wait for the card itself (under load the page goes still before the read)
  await L.waitFor(p, () => !!document.querySelector('.wall-mn .mn-nudge'), null, 8000).catch(() => false);
  ok(await p.$('.wall-mn .mn-nudge') !== null, 'guides only: the minutes card shows for staff');
  await p.context().close();

  // nothing saved yet: staff see everything, as before
  p = await L.open(b, '#/', { who: 'ann', extra: world(), wait: 2500 });
  ok(await docket(p) && await tab(p), 'default: staff see Guides when nothing is saved');
  ok(await p.$('.nt') !== null, 'default: staff get the pings popup');
  await p.click('.nt-got');
  await p.goto(L.BASE + '#/recipes');
  await L.settle(p, 400);
  await p.fill('#find', 'icombi');
  await L.settle(p, 400);
  ok(await p.$('.g-hits') !== null, 'default: recipe search lists the iCombi guide for staff');
  ok(p.errors.length === 0, 'default: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a sous chef saving the staff list leaves staffSee alone
  p = await L.open(b, '#/prep', { who: 'sam', extra: world(HIDE), wait: 2000 });
  await p.click('.nt-got', { timeout: 2000 }).catch(() => {});
  await L.settle(p, 200);
  await L.chef(p, 'staff');
  await L.settle(p, 300);
  await p.click('[data-p="a-add-person"]');
  // the new row is drawn after the tap: wait for its name box, not a fixed time (under load it comes later)
  await L.waitFor(p, () => !!document.querySelector('[data-k="a-n3"]'), null, 5000).catch(() => {});
  await p.fill('[data-k="a-n3"]', 'Cy');
  await p.click('[data-p="a-save"]');
  // the save reads the list first, then writes: wait for the write itself
  await L.waitFor(p, k => (window.__fake.dump()[k].people || []).length === 4, CFG, 5000).catch(() => {});
  s = await store(p);
  ok(s[CFG].people.length === 4 && JSON.stringify(s[CFG].staffSee) === JSON.stringify(HIDE), 'sous: staff list saved, staffSee kept (' + s[CFG].people.length + ' people, ' + JSON.stringify(s[CFG].staffSee) + ')');
  ok(p.errors.length === 0, 'sous: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
