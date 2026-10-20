// The chef mark menu and a quieter Handy (20 Oct 2026). Handy on the prep list has no Tools any more: Meeting minutes
// and the drinks run are in the chef menu for everyone, Shift pings, the Minutes register and Manage staff are in its
// Chef group for the head chef and sous chefs only, and Sign out hands the phone over (it asks again when something is
// not saved). Print and share are gone from every page: the book is used on phones.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
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
    await p.click('.wtop-who'); await p.waitForTimeout(150);
    const box = await p.evaluate(() => { const r = document.querySelector('.wm').getBoundingClientRect(); return { l: r.left, r: r.right, b: r.bottom, w: innerWidth, h: innerHeight }; });
    ok(box.l >= 0 && box.r <= box.w && box.b <= box.h, who + ' ' + w + ' px: the chef menu fits on the screen (' + JSON.stringify(box) + ')');
    ok(!(await L.overflow(p)), who + ' ' + w + ' px: no sideways scroll with the menu open (' + await L.overflow(p) + ')');
    await p.keyboard.press('Escape');
    await p.context().close();
  }

  // what the menu offers
  p = await L.open(b, '#/recipes', { who: 'ann', wait: 1800 });
  let m = await L.chefItems(p);
  ok(m.join(',') === 'mail,drinks,minutes,out', 'staff: Kitchen mail, Drinks run, Meeting minutes and Sign out, no Chef group (' + m + ')');
  ok(!m.includes('prep'), 'staff: the old Prep list item is gone');
  await p.context().close();
  p = await L.open(b, '#/recipes', { who: 'sam', wait: 1800 });
  m = await L.chefItems(p);
  ok(m.join(',') === 'mail,drinks,minutes,pings,register,staff,out', 'sous chef: the Chef group has Shift pings, Minutes register and Manage staff (' + m + ')');
  await L.chef(p, 'register');
  await p.waitForTimeout(500);
  ok(/#\/prep$/.test(p.url()) && await txt(p, '#rtitle') === 'Meeting minutes' && !!(await p.$('[data-p="mn-close"]')), 'sous chef: Minutes register opens from the recipes (' + p.url() + ')');
  await L.chef(p, 'staff');
  ok(!!(await p.$('[data-p="a-add-person"]')), 'sous chef: Manage staff opens from the menu over the register');

  // Sign out closes Manage staff, so the next person never lands in it
  await p.click('.wtop-who'); await p.waitForTimeout(150);
  await p.click('.wm [data-who="out"]'); await p.waitForTimeout(400);
  ok(!(await signedIn(p)) && !!(await p.$('.p-name[data-id="sam"]')), 'sign out: back to Who are you? on the prep list');
  ok(!(await p.$('.wm')), 'sign out: the menu closes');
  await p.click('.p-name[data-id="sam"]'); await p.waitForTimeout(400);
  await p.type('#pf1', '1111'); await p.waitForTimeout(900);
  ok(await signedIn(p) && !(await p.$('[data-p="a-add-person"]')) && !!(await p.$('.nb-left')), 'sign in again: the prep list, not the last Manage staff page');
  ok(p.errors.length === 0, 'sous chef menu: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // Sign out on the recipes stays on the recipes (the kitchen PIN stays)
  p = await L.open(b, '#/recipes', { who: 'ann', wait: 1800 });
  await p.click('.wtop-who'); await p.waitForTimeout(150);
  await p.click('.wm [data-who="out"]'); await p.waitForTimeout(400);
  ok(!(await signedIn(p)) && /#\/recipes$/.test(p.url()) && await p.evaluate(() => getComputedStyle(document.querySelector('.wtop-who')).display === 'none' || document.querySelector('.wtop-who').getAttribute('aria-hidden') === 'true'), 'recipes: signed out, still on the recipes, the chef mark is off');
  ok(/Signed out/.test(await txt(p, '.p-toast') || ''), 'recipes: a toast says Signed out');
  ok(await p.evaluate(() => localStorage.getItem('lk.prep.pin')) === L.PIN, 'recipes: the kitchen PIN stays on the device');
  await p.context().close();

  // something not saved: the first tap asks, the second signs out
  p = await L.open(b, '#/prep', { who: 'ann', wait: 1800 });
  await p.fill('#p-text', 'Pick parsley');
  await p.click('.wtop-who'); await p.waitForTimeout(150);
  await p.click('.wm [data-who="out"]'); await p.waitForTimeout(200);
  ok(await signedIn(p) && /Tap again to sign out/.test(await txt(p, '.wm-out small') || ''), 'unsaved line: the first tap asks again (' + await txt(p, '.wm-out small') + ')');
  await p.click('.wm [data-who="out"]'); await p.waitForTimeout(400);
  ok(!(await signedIn(p)), 'unsaved line: the second tap signs out');
  ok(p.errors.length === 0, 'sign out: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
