// No signal on the pages other scripts draw, and on the admin panel (28 Oct 2026). Since 26 Oct 2026 (#387) Firestore
// keeps only a copy in memory, so with no signal a listener started again or a read answers from that copy, or fails.
// That is "not loaded yet", never "nothing there", "not allowed" or "still checking":
// - the kitchen's settings listener starting again in a dead spot: Manage functions, Supplier order and Manage Recipes &
//   Drawings say there is no signal, not "Checking who is signed in", and open by themselves once it is back;
// - the head chef's owner check (config/admins) says there is no signal rather than rejecting their account, while a
//   real daily head PIN continues to grant its own kitchen role and never substitutes for verified admin access;
// - Templates and Made in the book on Manage Recipes & Drawings, and Start from a copy in the drawing editor, say there
//   is no signal, not "No templates yet", and show once it is back.
// The stand-in answers like the memory copy with __fake.cold; __fake.notOwner refuses the owner check.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const NO_KITCHEN = /No signal\. The kitchen pages open when the phone is back online\./;
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const cfgFn = { [fsKey(['config', 'main'])]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], fnIds: ['sam'], showBadges: true } };
const tpl = { [fsKey(['drawtpl', 't1'])]: { name: 'House plate', slot: 'plate', surf: { fam: 'none' }, els: [], defs: {}, vb: '-110 -110 220 220', svgS: '', svgF: '', v: 1, by: 'sam' } };
const text = (p, sel) => txt(p, sel).then(t => t || '');
const cold = p => p.evaluate(() => { window.__fake.cold = /./; window.__fake.mode = 'hold'; });
const warm = p => p.evaluate(() => { window.__fake.warm(); window.dispatchEvent(new Event('online')); });
const until = (p, fn, arg) => L.waitFor(p, fn, arg, 6000).then(() => true, () => false);
const shows = (p, sel, re) => until(p, a => new RegExp(a[1]).test((document.querySelector(a[0]) || {}).textContent || ''), [sel, re.source]);
const go = async (p, h) => { await p.evaluate(h => { location.hash = h; }, h); await L.settle(p, 700); };
const reads = (p, re) => p.evaluate(s => window.__fake.reads.filter(k => new RegExp(s).test(k)).length, re.source);
// no sideways scroll at the three widths, then back to the width the page opened at
async function fits(p, what, back) {
  for (const w of [390, 768, 1280]) {
    await p.setViewportSize({ width: w, height: 900 }); await L.settle(p, 250);
    const o = await L.overflow(p);
    ok(!o, what + ': no sideways scroll at ' + w + ' px' + (o ? ' (' + o + ')' : ''));
  }
  await p.setViewportSize({ width: back, height: 900 }); await L.settle(p, 250);
}

(async () => {
  const b = await L.start();
  let p, t;

  // 1. The kitchen's settings listener starting again with no signal (P3). cold '/config/main$': the names come from the
  // server, then Sam's sign-in starts the settings listener on the kitchen's own settings, which answers from the empty
  // copy in memory. Sam is ticked for Functions; Bo is the head chef in the supplier fixture.
  for (const w of [390, 768, 1280]) {
    p = await L.open(b, '#/functions', { who: 'sam', extra: cfgFn, cold: '/config/main$', width: w, wait: 1500 });
    const said = await shows(p, '#fe-root', NO_KITCHEN);
    t = await text(p, '#fe-root');
    ok(said && !/Checking who is signed in/.test(t), 'Manage functions, settings started again with no signal, ' + w + ' px: says there is no signal, not "Checking who is signed in" (' + t.slice(0, 120) + ')');
    const o = await L.overflow(p);
    ok(!o, 'Manage functions with no signal: no sideways scroll at ' + w + ' px' + (o ? ' (' + o + ')' : ''));
    if (w === 390) { await warm(p); ok(await shows(p, '#fe-root', /New function/), 'Manage functions, signal back: it opens by itself'); }
    ok(p.errors.length === 0, 'Manage functions with no signal at ' + w + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();

    p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), cold: '/config/main$', width: w, wait: 1500 });
    const sup = await shows(p, '#supplier-root', NO_KITCHEN);
    t = await text(p, '#supplier-root');
    ok(sup && !/Checking your kitchen sign-in/.test(t), 'Supplier order, settings started again with no signal, ' + w + ' px: says there is no signal, not "Checking your kitchen sign-in" (' + t.slice(0, 120) + ')');
    const so = await L.overflow(p);
    ok(!so, 'Supplier order with no signal: no sideways scroll at ' + w + ' px' + (so ? ' (' + so + ')' : ''));
    if (w === 390) { await warm(p); ok(await until(p, () => !!document.querySelector('input[data-sf="qty"]')), 'Supplier order, signal back: the supplier sheet opens by itself'); }
    ok(p.errors.length === 0, 'Supplier order with no signal at ' + w + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // Ann (staff) on Manage Recipes & Drawings: who may change recipes is not known yet, so not "Checking" for ever either
  p = await L.open(b, '#/manage', { who: 'ann', cold: '/config/main$', wait: 1500 });
  const mg = await shows(p, '#mg-root', NO_KITCHEN);
  t = await text(p, '#mg-root');
  ok(mg && !/Checking who is signed in/.test(t), 'Manage Recipes & Drawings for staff, settings started again with no signal: says there is no signal (' + t.slice(0, 120) + ')');
  await fits(p, 'Manage Recipes & Drawings with no signal', 390);
  await warm(p);
  ok(await shows(p, '#mg-root', /Only the head chef can change recipes/), 'Manage Recipes & Drawings for staff, signal back: says only the head chef changes recipes');
  ok(p.errors.length === 0, 'Manage Recipes & Drawings with no signal: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. A lost owner probe must say there is no signal rather than rejecting the Google identity. The current daily
  // head PIN remains real kitchen authentication; the admin workspace still waits for successful owner verification.
  p = await L.open(b, '#/admin', { admin: true, cold: '/config/admins$', width: 1280, wait: 1500, init: () => { localStorage.setItem('lk.admin', '1'); } });
  const said = await shows(p, '#prep-root', /No signal\. The admin panel opens when the phone is back online\./);
  t = await text(p, '#prep-root');
  ok(said && !/is not the head chef's Google account/.test(t), 'owner check with no signal: says there is no signal, not "not the head chef\'s Google account" (' + t.slice(0, 140) + ')');
  ok(await p.evaluate(() => localStorage.getItem('lk.admin')) !== '1', 'owner check with no signal: a remembered mark does not claim verified current admin access');
  ok(await L.admItem(p) === 'outline', 'owner check with no signal: the head PIN keeps the admin entry available without claiming a verified Google grant');
  const r0 = await reads(p, /config\/admins$/);
  await p.mouse.move(30, 30); await L.settle(p, 2000); await p.mouse.move(40, 40); await L.settle(p, 300);
  const r1 = await reads(p, /config\/admins$/);
  ok(r1 === r0 && r0 <= 2, 'owner check with no signal: not read again on every draw (' + r0 + ' then ' + r1 + ' reads)');
  await fits(p, 'admin panel with no signal', 1280);
  await warm(p);
  ok(await until(p, () => window.LK_PREP.state.level === 'owner' && !!document.querySelector('.a-nav')), 'owner check, signal back: the admin panel opens by itself');
  ok(p.errors.length === 0, 'owner check with no signal: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // each Google account is checked for itself: a second account on the device after the first one's check failed is
  // checked at once, not after the first one's 5-minute wait
  p = await L.open(b, '#/admin', { admin: true, cold: '/config/admins$', width: 1280, wait: 1500, init: () => { localStorage.setItem('lk.admin', '1'); } });
  await shows(p, '#prep-root', /No signal\. The admin panel opens/);
  await p.evaluate(() => { window.__fakeUser = { ...window.__fakeUser, uid: 'different-google', email: 'second@test.local' }; });
  await go(p, '#/recipes'); await go(p, '#/admin');
  ok(await shows(p, '#prep-root', /is not the head chef's Google account/) && await p.evaluate(() => LK_PREP.state.level !== 'owner'), 'another Google identity is checked at once and cannot inherit the earlier identity\'s owner status');
  await p.context().close();

  // 2b. The signal back with no online event (wifi that stayed up while the internet dropped): the settings listener
  // hears the server and the owner check goes again at once, not after its 5-minute wait (review of 28 Oct 2026: the
  // panel stayed on No signal). And the card has Try again and Back to the prep book, for a lost read on a good signal
  // (the listener then hears nothing new).
  for (const how of ['the settings listener', 'Try again']) {
    p = await L.open(b, '#/admin', { admin: true, cold: '/config/admins$', width: 1280, wait: 1500, init: () => { localStorage.setItem('lk.admin', '1'); } });
    await shows(p, '#prep-root', /No signal\. The admin panel opens/);
    if (how === 'Try again') {
      ok(!!(await p.$('#prep-root [data-p="admins-retry"]')) && !!(await p.$('#prep-root a[href="#/prep"]')), 'owner check with no signal: the card offers Try again and Back to the prep book');
      await p.evaluate(() => { window.__fake.cold = null; });   // the read would go through now, and no listener hears it
      await L.settle(p, 500);
      await p.click('#prep-root [data-p="admins-retry"]', { timeout: 2000 }).catch(() => {});
    } else await p.evaluate(() => window.__fake.warm());   // no online event
    ok(await until(p, () => window.LK_PREP.state.level === 'owner' && !!document.querySelector('.a-nav')), 'owner check, signal back with no online event, ' + how + ': the admin panel opens at once');
    ok(p.errors.length === 0, 'owner check, ' + how + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 2c. A real head PIN remains a kitchen login while Google owner verification waits. Its normal role permissions
  // continue to work; admin never opens from the remembered Google account alone.
  p = await L.open(b, '#/', { admin: true, cold: '/config/admins$', width: 1280, wait: 1500, init: () => { localStorage.setItem('lk.admin', '1'); } });
  await until(p, () => !!window.LK_PREP.state.adminsOff);
  ok(await p.evaluate(() => LK_PREP.privateAccess() && LK_PREP.state.authed && LK_PREP.state.who === LK_PREP.state.config.headId) && !/Kitchen sign in/.test(await text(p, '.wall-main')), 'owner check waiting: the real head PIN still opens the kitchen start page');
  await p.click('.wtop-who'); await L.settle(p, 150);
  t = await text(p, '.wm');
  ok(/Signed in as Head chef/.test(t) && !(await p.$('.wm [data-who="signin"]')) && !!(await p.$('.wm .wm-adm:not(.is-signed)')), 'owner check waiting: the chef menu identifies the PIN user and offers admin without claiming Google verification');
  await p.keyboard.press('Escape'); await L.settle(p, 100);
  for (const h of ['#/prep', '#/orders', '#/todo', '#/manage', '#/functions', '#/suppliers']) {
    const sel = 'main';
    await go(p, h);
    t = await text(p, sel);
    ok(await p.evaluate(() => LK_PREP.privateAccess() && LK_PREP.state.authed && LK_PREP.state.level !== 'owner') && !/Who are you/.test(t) && !(await p.$('.ad-admin')), 'owner check waiting, ' + h + ': the daily head PIN retains its role access and no admin workspace opens');
  }
  ok(await p.evaluate(() => LK_PREP.state.authed && LK_PREP.state.who === LK_PREP.state.config.headId && localStorage.getItem('lk.admin') !== '1'), 'navigation while the owner check waits preserves the actual PIN identity without a stale admin mark');
  await fits(p, 'head chef\'s device, owner check waiting', 1280);
  await go(p, '#/prep');
  await warm(p);
  ok(await until(p, () => window.LK_PREP.state.level === 'owner' && !document.querySelector('#prep-root [data-p="who"]') && !/No signal/.test(document.querySelector('#prep-root').textContent)), 'head chef\'s device, signal back: the prep list opens for the head chef');
  ok(p.errors.length === 0, 'head chef\'s device, owner check waiting: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a Google account the rules refuse is still told it is not the head chef's account
  p = await L.open(b, '#/admin', { admin: true, width: 1280, wait: 1500, init: () => { window.__fake = window.__fake || { mode: 'ok', writes: [], reads: [] }; window.__fake.notOwner = true; } });
  ok(await shows(p, '#prep-root', /is not the head chef's Google account/) && !/No signal/.test(await text(p, '#prep-root')), 'owner check refused: says it is not the head chef\'s Google account');
  ok(await p.evaluate(() => localStorage.getItem('lk.admin')) !== '1', 'owner check refused: no head chef mark on the device');
  await p.context().close();

  // 3. Templates and Made in the book with no signal (P6). Sam opened Manage Recipes & Drawings with signal; the head
  // chef's templates are read the first time their list opens. Before, a failed read showed "No templates yet" and
  // "Nothing made in the book yet" for the rest of the visit.
  for (const w of [390, 768, 1280]) {
    p = await L.open(b, '#/manage', { who: 'sam', extra: tpl, width: w, wait: 1500 });
    await until(p, () => !!document.querySelector('[data-mg="chip"][data-v="templates"]'));
    await cold(p);
    await L.choose(p, '[data-mg="chip"][data-v="templates"]'); await L.settle(p, 600);
    t = await text(p, '#mg-root');
    ok(/No signal\. Your templates show when the phone is back online\./.test(t) && !/No templates yet/.test(t), 'Templates with no signal at ' + w + ' px: says there is no signal, not "No templates yet"');
    const o = await L.overflow(p);
    ok(!o, 'Templates with no signal: no sideways scroll at ' + w + ' px' + (o ? ' (' + o + ')' : ''));
    await L.choose(p, '[data-mg="chip"][data-v="mylib"]'); await L.settle(p, 600);
    t = await text(p, '#mg-root');
    ok(/No signal\. What you made in the book shows when the phone is back online\./.test(t) && !/Nothing made in the book yet/.test(t), 'Made in the book with no signal at ' + w + ' px: says there is no signal, not "Nothing made in the book yet"');
    if (w === 390) {
      // typing in Find a recipe draws the list again each time: no read on each one
      const n0 = await reads(p, /drawtpl$/);
      await p.type('#mg-q', 'pl'); await L.settle(p, 300);
      t = await text(p, '#mg-root');
      ok(await reads(p, /drawtpl$/) === n0 && /No signal/.test(t) && !/Nothing made in the book yet/.test(t), 'Made in the book with no signal: typing a search reads nothing again and still says there is no signal');
      await L.clear(p, '#mg-q'); await L.settle(p, 300);
      // the signal back with no online event (wifi that stayed up): a tap on the chip reads again
      await p.evaluate(() => { window.__fake.cold = null; });
      await L.choose(p, '[data-mg="chip"][data-v="templates"]'); await L.settle(p, 300);
      ok(await shows(p, '#mg-root', /House plate/), 'Templates, signal back with no online event: a tap on the chip reads again and the template shows');
    }
    if (w === 768) {
      await warm(p);
      ok(await shows(p, '#mg-root', /Nothing made in the book yet/) && !/No signal/.test(await text(p, '#mg-root')), 'Made in the book, signal back: read again by itself');
    }
    ok(p.errors.length === 0, 'Templates with no signal at ' + w + ' px: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 4. Start from a copy in the drawing editor with no signal (P6). Every drawing opened reads the templates again; with
  // no signal that read fails, and the panel said nothing: it looked as if there were no templates.
  p = await L.open(b, '#/manage', { who: 'sam', extra: tpl, width: 1280, wait: 1500 });
  await until(p, () => !!document.querySelector('[data-mg="chip"]'));
  await cold(p);
  await go(p, '#/manage/draw/new/burger/plate');
  await until(p, () => !!document.querySelector('.dw-start'));
  await p.click('.dw-start summary'); await L.settle(p, 300);
  t = await text(p, '.dw-start');
  ok(/No signal\. Your templates show when the phone is back online\./.test(t) && !/House plate/.test(t), 'Start from a copy with no signal: says the templates show when the phone is back online (' + t.slice(0, 160) + ')');
  await fits(p, 'Start from a copy with no signal', 1280);
  await warm(p);
  ok(await shows(p, '.dw-start', /Template: House plate/) && !/No signal/.test(await text(p, '.dw-start')), 'Start from a copy, signal back: the template is offered by itself');
  ok(p.errors.length === 0, 'Start from a copy with no signal: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
