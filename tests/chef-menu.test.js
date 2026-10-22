// The chef mark menu and a quieter Handy (20 Oct 2026). Handy on the prep list has no Tools any more: Meeting minutes
// and the drinks run are in the chef menu for everyone, Shift pings and Manage staff are in its Chef group for the head
// chef and sous chefs only, and Sign out hands the phone over (it asks again when something is not saved). Print and
// share are gone from every page: the book is used on phones.
// A shorter menu (22 Oct 2026): one line per item, a second line only when it changes; the Minutes register is "See
// who has signed" at the top of Meeting minutes; no Kitchen mail for the head chef; on the head chef's own Google
// device Manage staff is People in the admin panel.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
// Ann is the head chef here (headId) and ticked for Functions, Sam a sous chef, Bo staff
const headCfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], fnIds: ['ann'], showBadges: true } });
// the open menu: each row's height, the second lines with words in them, Sign out's live line and the whole menu
const menuBox = p => p.evaluate(() => {
  const m = document.querySelector('.wm'), r = m.getBoundingClientRect(), o = document.querySelector('.wm-out small');
  return { rows: [...m.querySelectorAll('.wm-a')].map(e => Math.round(e.getBoundingClientRect().height)), small: [...m.querySelectorAll('.wm-a small')].map(e => e.textContent.trim()).filter(Boolean),
    live: o ? o.getAttribute('aria-live') : null, h: Math.round(r.height), b: Math.round(r.bottom), r: Math.round(r.right), w: innerWidth, vh: innerHeight };
});
const GONE = ['copy', 'print', 'ocopy', 'oprint', 'dk-share', 'mn-print', 'g-print', 'print-tab'];
const noPrint = p => p.evaluate(g => {
  const hit = g.filter(a => document.querySelector('[data-p="' + a + '"]'));
  [...document.querySelectorAll('#app button, #app a')].forEach(e => { if (/^(Print\b|(Share|Copy) (the|for)\b)/.test(e.textContent.trim())) hit.push(e.textContent.trim()); });
  return hit;
}, GONE);
const signedIn = p => p.evaluate(() => !!(window.LK_PREP && window.LK_PREP.whoName()));
(async () => {
  const b = await L.start();
  let p;

  // no print or share anywhere
  for (const h of ['#/prep', '#/orders', '#/drinks', '#/minutes', '#/guides']) {
    p = await L.open(b, h, { wait: 1800 });
    const hit = await noPrint(p);
    ok(!hit.length, h + ': no print or share buttons (' + hit.join(', ') + ')');
    ok(p.errors.length === 0, h + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, wait: 1800 });
  ok(!(await noPrint(p)).length, 'admin insights: no Print or save as PDF (' + (await noPrint(p)).join(', ') + ')');
  ok(!!(await p.$('[data-p="csv"]')), 'admin insights: Download CSV stays');
  await p.context().close();

  // Handy has no Tools, for a sous chef or for staff, at every width
  for (const who of ['sam', 'ann']) for (const w of [390, 768, 1280]) {
    p = await L.open(b, '#/prep', { who, width: w, height: w > 400 ? 900 : 844, wait: 1600 });
    const heads = await p.evaluate(() => [...document.querySelectorAll('.nb-side .nb-sh')].map(e => e.textContent.trim()));
    ok(heads.indexOf('Tools') < 0 && !(await p.$('.nb-tools')), who + ' ' + w + ' px: no Tools in Handy (' + heads.join(', ') + ')');
    await p.click('.wtop-who'); await L.settle(p, 150);
    const box = await p.evaluate(() => { const r = document.querySelector('.wm').getBoundingClientRect(); return { l: r.left, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight }; });
    ok(box.l >= 0 && box.r <= box.w && box.b <= box.h, who + ' ' + w + ' px: the chef menu fits on the screen (' + JSON.stringify(box) + ')');
    ok(!(await L.overflow(p)), who + ' ' + w + ' px: no sideways scroll with the menu open (' + await L.overflow(p) + ')');
    await p.keyboard.press('Escape');
    await p.context().close();
  }

  // what the menu offers
  p = await L.open(b, '#/recipes', { who: 'ann', wait: 1800 });
  let m = await L.chefItems(p);
  ok(m.join(',') === 'mail,drinks,fn,settings,out', 'staff, nothing published: Kitchen mail, Drinks run, Functions to read, Settings and Sign out, no Meeting minutes, no Chef group (' + m + ')');
  ok(!m.includes('prep'), 'staff: the old Prep list item is gone');
  await p.context().close();
  // once Chef has published minutes, Meeting minutes joins the staff menu
  const pub = {};
  pub[['kitchens', L.PIN, 'minutes', 'm1'].join('/')] = { no: 1, v: 1, status: 'published', date: L.ymd(new Date(L.NOW - 86400000)), start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam',
    att: [{ id: 'ann', st: 'present' }], guests: '', decisions: 'New menu from Friday', menu: '', safety: '', dates: '', other: '', acts: [], next: '', pubAt: L.NOW - 86400000, removed: false, at: 1, upd: 1, by: 'sam' };
  p = await L.open(b, '#/recipes', { who: 'ann', extra: pub, wait: 1800 });
  m = await L.chefItems(p);
  ok(m.join(',') === 'mail,drinks,minutes,fn,settings,out', 'staff, minutes published: Meeting minutes shows (' + m + ')');
  await p.context().close();
  // #/minutes by its address with nothing published: the notebook card, like the order list
  p = await L.open(b, '#/minutes', { who: 'ann', wait: 1800 });
  ok(!!(await p.$('.nb-page.mn-empty .nb-title')) && /No meeting minutes yet/.test(await txt(p, '#prep-root') || ''), 'minutes, nothing published: notebook card saying none yet');
  ok(p.errors.length === 0, 'minutes empty: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await L.open(b, '#/recipes', { who: 'sam', wait: 1800 });
  m = await L.chefItems(p);
  ok(m.join(',') === 'mail,drinks,minutes,fn,pings,staff,settings,out', 'sous chef: the Chef group has Shift pings and Manage staff, the register is in Meeting minutes (' + m + ')');
  // the short menu: 48 px rows, no second line with nothing to say, Sign out's line read out when it changes
  await p.click('.wtop-who'); await L.settle(p, 150);
  let box = await menuBox(p);
  ok(box.rows.every(h => h >= 48 && h <= 49), 'sous chef 390 px: every menu row is 48 px (' + box.rows + ')');
  ok(!box.small.length, 'sous chef: no second lines in the menu (' + box.small.join(' | ') + ')');
  ok(box.live === 'polite', 'sous chef: Sign out\'s second line is read out when it changes');
  ok(box.h < 500, 'sous chef 390 px: the menu is under 500 px tall (' + box.h + ', 579 before)');
  await p.click('.wm a[href="#/minutes"]'); await L.settle(p, 600);
  await L.waitFor(p, () => !!document.querySelector('[data-p="mn-sous"]'), null, 5000).catch(() => {});
  ok(!!(await p.$('[data-p="mn-sous"]')), 'sous chef: Meeting minutes has See who has signed');
  await p.click('[data-p="mn-sous"]'); await L.settle(p, 500);
  ok(/#\/prep$/.test(p.url()) && await txt(p, '#rtitle') === 'Meeting minutes' && !!(await p.$('[data-p="mn-close"]')), 'sous chef: See who has signed opens the Minutes register (' + p.url() + ')');
  await L.chef(p, 'staff');
  ok(!!(await p.$('[data-p="a-add-person"]')), 'sous chef: Manage staff opens from the menu over the register');
  // one name for the page (23 Oct 2026): the menu's Manage staff, not Staff list and Staff
  ok(await txt(p, '#rtitle') === 'Manage staff' && !/Staff list/.test(await txt(p, '.p-bar') || '') && /Back to the prep book/.test(await txt(p, '.p-bar') || ''), 'sous chef: the page is called Manage staff, with Back to the prep book (' + await txt(p, '#rtitle') + ')');
  ok(await p.evaluate(() => { const l = document.querySelector('.p-bar .p-links'), r = l.getBoundingClientRect(); return innerWidth - r.right < 40; }), 'sous chef: Back to the prep book stays on the right');

  // Sign out closes Manage staff, so the next person never lands in it
  await p.click('.wtop-who'); await L.settle(p, 150);
  await p.click('.wm [data-who="out"]'); await L.settle(p, 400);
  ok(!(await signedIn(p)) && !!(await p.$('.p-name[data-id="sam"]')), 'sign out: back to Who are you? on the prep list');
  ok(!(await p.$('.wm')), 'sign out: the menu closes');
  await p.click('.p-name[data-id="sam"]'); await L.settle(p, 400);
  await p.type('#pf1', '1111'); await L.settle(p, 900);
  ok(await signedIn(p) && !(await p.$('[data-p="a-add-person"]')) && !!(await p.$('.nb-left')), 'sign in again: the prep list, not the last Manage staff page');
  ok(p.errors.length === 0, 'sous chef menu: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Sign out on the recipes stays on the recipes (the kitchen PIN stays)
  p = await L.open(b, '#/recipes', { who: 'ann', wait: 1800 });
  await p.click('.wtop-who'); await L.settle(p, 150);
  await p.click('.wm [data-who="out"]'); await L.settle(p, 400);
  ok(!(await signedIn(p)) && /#\/recipes$/.test(p.url()) && await p.evaluate(() => !document.querySelector('.wtop-who').classList.contains('on') && document.querySelector('.wtop-who').getAttribute('title') === 'Menu and Settings'), 'recipes: signed out, still on the recipes, the chef mark is dashed (Menu and Settings)');
  ok(/Signed out/.test(await txt(p, '.p-toast') || ''), 'recipes: a toast says Signed out');
  ok(await p.evaluate(() => localStorage.getItem('lk.prep.pin')) === L.PIN, 'recipes: the kitchen PIN stays on the device');
  await p.context().close();

  // something not saved: the first tap asks, the second signs out
  p = await L.open(b, '#/prep', { who: 'ann', wait: 1800 });
  await p.fill('#p-text', 'Pick parsley');
  await p.click('.wtop-who'); await L.settle(p, 150);
  await p.click('.wm [data-who="out"]'); await L.settle(p, 200);
  ok(await signedIn(p) && /Tap again to sign out/.test(await txt(p, '.wm-out small') || ''), 'unsaved line: the first tap asks again (' + await txt(p, '.wm-out small') + ')');
  await p.click('.wm [data-who="out"]'); await L.settle(p, 400);
  ok(!(await signedIn(p)), 'unsaved line: the second tap signs out');
  ok(p.errors.length === 0, 'sign out: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // "Not you?" does what Sign out does (23 Oct 2026): a line typed asks a second tap, and the line stays for the next person
  p = await L.open(b, '#/prep', { who: 'ann', wait: 1800 });
  await p.fill('#p-text', 'Pick parsley');
  await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 200);
  ok(await signedIn(p) && /Not saved\. Tap again/.test(await txt(p, '.nb-top [data-p="who-change"]') || ''), 'Not you? with a line typed: the first tap asks again (' + await txt(p, '.nb-top [data-p="who-change"]') + ')');
  await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 400);
  ok(!(await signedIn(p)) && /Who are you\?/.test(await txt(p, '#prep-root') || ''), 'Not you?: the second tap asks who is writing');
  await p.click('.p-name[data-id="bo"]'); await L.settle(p, 300);
  await p.keyboard.type('3333'); await L.settle(p, 900);
  ok(/Writing as\s*Bo/.test(await txt(p, '.nb-top') || '') && await p.inputValue('#p-text') === 'Pick parsley', 'Not you?: Bo signs in and the typed line is still in the box');
  ok(p.errors.length === 0, 'Not you?: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // leaving the prep list closes Manage staff, the register and Shift pings (23 Oct 2026), so Prep is the prep list again
  const go = async (p, h) => { await p.evaluate(h => { location.hash = h; }, h); await L.settle(p, 600); };
  const onList = async p => !!(await p.$('.nb-left')) && !(await p.$('[data-p="a-add-person"]')) && !(await p.$('[data-p="mn-close"]')) && !(await p.$('[data-p="notes-close"]'));
  p = await L.open(b, '#/recipes', { who: 'sam', extra: pub, wait: 1800 });
  await L.chef(p, 'staff');
  ok(!!(await p.$('[data-p="a-add-person"]')), 'leave: Manage staff opens from the recipes');
  await go(p, '#/orders'); await go(p, '#/prep');
  ok(await onList(p), 'leave: Manage staff, then Orders, then Prep shows the prep list');
  await L.chef(p, 'staff');
  await go(p, '#/recipes'); await go(p, '#/prep');
  ok(await onList(p), 'leave: Manage staff, then Recipes, then Prep shows the prep list');
  await L.chef(p, 'staff');
  await go(p, '#/'); await go(p, '#/prep');
  ok(await onList(p), 'leave: Manage staff, then the landing page, then Prep shows the prep list');
  await L.chef(p, 'pings');
  ok(!!(await p.$('[data-p="notes-close"]')), 'leave: Shift pings opens');
  await go(p, '#/waste'); await go(p, '#/prep');
  ok(await onList(p), 'leave: Shift pings, then Wastage, then Prep shows the prep list');
  await go(p, '#/minutes');
  await L.waitFor(p, () => !!document.querySelector('[data-p="mn-sous"]'), null, 5000).catch(() => {});
  await p.click('[data-p="mn-sous"]'); await L.settle(p, 500);
  ok(!!(await p.$('[data-p="mn-close"]')), 'leave: See who has signed still opens the register on the prep list');
  await go(p, '#/orders'); await go(p, '#/prep');
  ok(await onList(p), 'leave: the register, then Orders, then Prep shows the prep list');
  // a staff list draft with a change keeps its page, as before
  await L.chef(p, 'staff');
  await p.fill('[data-k="a-bulk"]', 'Fay'); await p.click('[data-p="a-bulk-add"]'); await L.settle(p, 200);
  await go(p, '#/orders'); await go(p, '#/prep');
  ok(!!(await p.$('[data-p="a-add-person"]')) && /Fay/.test(await p.evaluate(() => JSON.stringify(window.LK_PREP.state.draft || {}))), 'leave: a staff list with a change not saved still comes back to Manage staff');
  ok(p.errors.length === 0, 'leave: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the biggest text size: the short menu still fits on a phone, with no sideways scroll
  p = await L.open(b, '#/recipes', { who: 'sam', settings: { text: 'xlarge' }, wait: 1800 });
  await p.click('.wtop-who'); await L.settle(p, 150);
  box = await menuBox(p);
  ok(box.b <= box.vh && box.r <= box.w && box.rows.every(h => h >= 48), 'extra large text: the menu fits on the screen, rows at least 48 px (' + JSON.stringify(box) + ')');
  ok(!(await L.overflow(p)), 'extra large text: no sideways scroll with the menu open (' + await L.overflow(p) + ')');
  await p.context().close();

  // the head chef by PIN: no Kitchen mail to herself, Admin panel says Sign in with Google, Manage staff stays
  p = await L.open(b, '#/recipes', { who: 'ann', extra: headCfg(), wait: 1800 });
  m = await L.chefItems(p);
  ok(m.join(',') === 'drinks,minutes,functions,admin,manage,pings,staff,settings,out', 'head chef by PIN: no Kitchen mail, Functions in its one place, Shift pings and Manage staff (' + m + ')');
  await p.click('.wtop-who'); await L.settle(p, 150);
  box = await menuBox(p);
  ok(box.small.join('|') === 'Sign in with Google', 'head chef by PIN: the only second line is Sign in with Google (' + box.small.join(' | ') + ')');
  await p.context().close();

  // the head chef on her own Google device: Manage staff is People in the admin panel, Shift pings opens the admin tab
  p = await L.open(b, '#/recipes', { who: 'ann', admin: true, extra: headCfg(), wait: 1800 });
  // Admin comes in after the owner check is read: wait for it, not for the page to be still
  for (let i = 0; i < 20 && await L.admItem(p) !== 'signed'; i++) await L.settle(p, 250);
  m = await L.chefItems(p);
  ok(m.join(',') === 'drinks,minutes,functions,admin,manage,pings,settings,out', 'head chef on her Google device: no Kitchen mail, no Manage staff (' + m + ')');
  await p.click('.wtop-who'); await L.settle(p, 150);
  box = await menuBox(p);
  ok(box.h < 563, 'head chef on her Google device, 390 px: the menu is under two thirds of the screen (' + box.h + ', 710 before)');
  await p.keyboard.press('Escape'); await L.settle(p, 100);
  await L.chef(p, 'pings'); await L.settle(p, 400);
  ok(await p.evaluate(() => location.hash) === '#/admin' && !!(await p.$('[data-p="a-tab"][data-t="notes"][aria-pressed="true"]')), 'head chef on her Google device: Shift pings opens the admin Shift pings page');
  ok(p.errors.length === 0, 'head chef menu: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a function manager who is not a chef: Functions in the same place as everyone's, no Chef heading over it
  const fay = headCfg(), fc = fay[fsKey(['config', 'main'])];
  fc.people.push({ id: 'fay', name: 'Fay', role: 'fnc', add: false, tick: false, del: false, fn: true, active: true }); fc.fnIds = ['fay'];
  fay[fsKey(['staffpins', 'fay'])] = { hash: L.sha('lk:fay:5151') }; fay[fsKey(['pinset', 'fay'])] = { at: 1 };
  fay[fsKey(['drinks', 'fay'])] = { kind: 'flat', at: 1, by: 'fay' };
  p = await L.open(b, '#/recipes', { who: 'fay', extra: fay, wait: 1800 });
  m = await L.chefItems(p);
  ok(m.join(',') === 'mail,drinks,functions,settings,out', 'function manager: Functions where everyone has it (' + m + ')');
  await p.click('.wtop-who'); await L.settle(p, 150);
  ok(!(await p.$('.wm .wm-sh')), 'function manager: no Chef heading over Functions');
  await p.context().close();

  // minutes published: See who has signed sits in the top bar of Meeting minutes, once, for a chef only
  p = await L.open(b, '#/minutes', { who: 'sam', extra: pub, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.mn'), null, 5000).catch(() => {});
  ok(await p.evaluate(() => document.querySelectorAll('[data-p="mn-sous"]').length === 1 && !!document.querySelector('.nb-top [data-p="mn-sous"]')), 'minutes: one See who has signed, in the top bar');
  ok(!(await L.overflow(p)), 'minutes: no sideways scroll with the link in the top bar (' + await L.overflow(p) + ')');
  await p.click('[data-p="mn-sous"]'); await L.settle(p, 500);
  ok(await txt(p, '#rtitle') === 'Meeting minutes' && !!(await p.$('[data-p="mn-close"]')), 'minutes: the link opens the register');
  await p.click('[data-p="mn-close"]'); await L.settle(p, 300);
  ok(!!(await p.$('.nb-left')) && !(await p.$('[data-p="mn-close"]')), 'minutes: closing the register goes back to the prep list');
  ok(p.errors.length === 0, 'minutes register: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // a ping half written stays behind the register: Back to the prep book finds it with its words
  p = await L.open(b, '#/prep', { who: 'sam', extra: pub, wait: 1800 });
  await L.chef(p, 'pings'); await L.settle(p, 300);
  await L.tap(p, '[data-p="n-new"]'); await L.settle(p, 200);
  await p.fill('[data-k="n-text"]', 'Special: pork belly tonight');
  await p.evaluate(() => { location.hash = '#/minutes'; }); await L.settle(p, 600);
  await L.waitFor(p, () => !!document.querySelector('[data-p="mn-sous"]'), null, 5000).catch(() => {});
  await p.click('[data-p="mn-sous"]'); await L.settle(p, 500);
  ok(await txt(p, '#rtitle') === 'Meeting minutes', 'ping half written: See who has signed still opens the register');
  await p.click('[data-p="mn-close"]'); await L.settle(p, 300);
  ok(await p.evaluate(() => { const t = document.querySelector('[data-k="n-text"]'); return !!t && t.value === 'Special: pork belly tonight'; }), 'ping half written: Back to the prep book brings the ping back with its words');
  await p.context().close();
  p = await L.open(b, '#/minutes', { who: 'ann', admin: true, extra: Object.assign(headCfg(), pub), wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.nb-top [data-p="mn-admin"]'), null, 5000).catch(() => {});
  ok(await p.evaluate(() => { const e = document.querySelector('.nb-top [data-p="mn-admin"]'); return !!e && e.getBoundingClientRect().height >= 18 && !document.querySelector('.mn-wl'); }), 'minutes on the head chef\'s Google device: See who has signed in the top bar, nothing more at the end');
  ok(!(await L.overflow(p)), 'minutes on the head chef\'s Google device: no sideways scroll (' + await L.overflow(p) + ')');
  await p.context().close();
  p = await L.open(b, '#/minutes', { who: 'ann', extra: pub, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.mn'), null, 5000).catch(() => {});
  ok(!(await p.$('[data-p="mn-sous"]')) && !(await p.$('[data-p="mn-admin"]')), 'minutes for staff: no register link');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
