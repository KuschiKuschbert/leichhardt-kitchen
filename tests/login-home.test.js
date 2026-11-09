// The first personal PIN of a person's day opens Home; later PINs that day keep the page (10 Nov 2026,
// docs/home-staff-first.md "First sign-in of the day"). Rebuilt from #599 without its shift rows: Home's own staff block
// (#618) shows the person's section, break and coworkers. The day turns at 04:00 Queensland, as the PIN session does.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const day = L.ymd(new Date(L.NOW));
const people = L.seed()[key('config', 'main')].people;
const hash = p => p.evaluate(() => location.hash);
const button = p => txt(p, '.p-card button[type="submit"]');
async function pin(p, id, value) {
  const name = p.locator('.p-name[data-id="' + id + '"]');
  if (await name.isVisible()) await name.click();
  await p.locator('#pf1').fill(value);
  await L.waitFor(p, () => LK_PREP.privateAccess());
  await L.settle(p, 500);
}
// PIN tries are one every 20 seconds per person: the clock moves on after each sign-out
async function signOutTo(p, route) {
  await p.evaluate(route => { if (!LK_PREP.signOut(true)) throw new Error('Sign-out still has unfinished sending'); location.hash = route; }, route);
  await L.waitFor(p, () => !LK_PREP.privateAccess());
  await p.clock.runFor(21000); await L.settle(p, 200);
}
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { who: '', noPin: true, wait: 700 });
  ok(!!(await p.$('#p-pin')) && !(await p.$('#hm-board')) && !p.errors.length, 'a new device opens the kitchen PIN screen, not Home');
  ok(/Open the prep list/.test(await txt(p, '[data-p="pin-go"]') || ''), 'the kitchen PIN button still names the page (' + await txt(p, '[data-p="pin-go"]') + ')');
  await p.context().close();

  // 1. The first PIN of the day, from each work page, on a shared screen
  for (const route of ['#/prep', '#/orders', '#/waste']) {
    p = await L.open(b, route, { who: '', deviceMode: 'shared', wait: 700 });
    await p.click('.p-name[data-id="ann"]'); await L.settle(p, 400);
    ok(await button(p) === 'Open Home', route + ': the PIN button says Open Home (' + await button(p) + ')');
    await pin(p, 'ann', '2222');
    ok(await hash(p) === '#/' && !!(await p.$('#hm-board')), route + ': the right PIN opens Home (' + await hash(p) + ')');
    const overflow = await L.overflow(p);
    ok(!overflow && !p.errors.length, route + ': no sideways scroll or browser errors (overflow: ' + overflow + '; errors: ' + p.errors.join(' | ') + ')');
    await p.context().close();
  }

  // 2. A session already open counts as today's sign-in
  p = await L.open(b, '#/orders', { who: 'ann', wait: 700 });
  ok(await hash(p) === '#/orders', 'a restored session keeps its page');
  await signOutTo(p, '#/orders'); await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/orders', 'a restored session already counts as today\'s first sign-in');
  await p.context().close();

  // 3. Later PINs that day keep the page, and the button names that page
  p = await L.open(b, '#/orders', { who: '', deviceMode: 'shared', wait: 700 });
  await pin(p, 'ann', '2222');
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 300);
  await p.clock.runFor(11 * 60000); await L.waitFor(p, () => !LK_PREP.privateAccess());
  ok(await button(p) === 'Open the order list', 'a later unlock names the page it keeps (' + await button(p) + ')');
  await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/orders', 'an idle unlock later that day keeps Orders open');
  await signOutTo(p, '#/waste'); await p.reload({ waitUntil: 'load' }); await L.settle(p, 700);
  await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/waste', 'the day\'s mark survives sign-out and reload: Wastage stays open');
  await signOutTo(p, '#/r/laksa');
  await p.click('.wtop-who'); await p.click('.wm [data-who="signin"]'); await L.settle(p, 300);
  await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/r/laksa', 'a later Sign in from the chef hat goes back to the recipe');
  await signOutTo(p, '#/waste'); await pin(p, 'bo', '3333');
  ok(await hash(p) === '#/', 'another person on the shared screen gets their own first Home');
  await signOutTo(p, '#/orders'); await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/orders', 'another person signing in does not reset the first person\'s day');
  await p.context().close();

  // 4. A shared screen reopened past its idle time, with a session from today, is a later sign-in
  p = await L.open(b, '#/orders', { who: 'ann', deviceMode: 'shared', wait: 700, init: () => localStorage.setItem('lk.prep.seen', String(Date.now() - 11 * 60000)) });
  await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/orders', 'reopening an idle session from today keeps the page');
  await p.context().close();

  // 5. A new day's PIN opens Home; 04:00 is the turn, not midnight
  p = await L.open(b, '#/orders', { who: 'ann', dailyLocked: true, wait: 700 });
  await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/', 'the daily PIN after 04:00 opens Home');
  await p.context().close();
  const cutoff = Date.parse(day + 'T04:00:00+10:00');
  p = await L.open(b, '#/orders', { who: '', deviceMode: 'shared', clock: cutoff - 60000, wait: 700 });
  await pin(p, 'ann', '2222');
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 200);
  await p.clock.runFor(90000); await L.waitFor(p, () => !LK_PREP.privateAccess());
  await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/', '04:00 starts a new day even straight after a sign-in at 03:59');
  await p.context().close();
  p = await L.open(b, '#/orders', { who: '', deviceMode: 'shared', clock: cutoff + (19 * 60 + 59) * 60000, wait: 700 });
  await pin(p, 'ann', '2222');
  await p.clock.runFor(90000); await signOutTo(p, '#/orders'); await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/orders', 'midnight does not start a new day');
  await p.context().close();

  // 6. Work to finish keeps its page: a typed order on a screen locked at 04:00
  p = await L.open(b, '#/orders', { who: 'ann', deviceMode: 'shared', clock: cutoff - 60000, wait: 700 });
  await p.locator('#o-text').fill('Keep this order');
  await p.clock.runFor(90000); await L.settle(p, 300);
  await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/orders' && await p.locator('#o-text').inputValue() === 'Keep this order', 'the first PIN of the day finishes the same person\'s typed order before Home');
  await signOutTo(p, '#/orders'); await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/orders', 'and counts as that day\'s sign-in, so Home does not jump in later');
  await p.context().close();

  // 7. A Functions-only account stays on its functions
  const fnOnly = { [key('config', 'main')]: Object.assign({}, L.seed()[key('config', 'main')], { fnOnlyIds: ['bo'], fnIds: ['bo'] }) };
  p = await L.open(b, '#/functions', { who: '', deviceMode: 'shared', extra: fnOnly, wait: 700 });
  await pin(p, 'bo', '3333');
  ok(await hash(p) === '#/functions' && !(await p.$('#hm-board')) && !p.errors.length, 'a Functions-only PIN keeps Functions (' + await hash(p) + ')');
  await p.context().close();

  // 8. A wrong PIN never uses up the day's first Home
  p = await L.open(b, '#/prep', { who: '', deviceMode: 'shared', wait: 700 });
  await p.click('.p-name[data-id="ann"]'); await p.locator('#pf1').fill('9999'); await L.settle(p, 700);
  ok(await p.evaluate(() => !LK_PREP.privateAccess() && location.hash === '#/prep'), 'a wrong PIN stays on the locked page');
  await p.clock.runFor(21000); await pin(p, 'ann', '2222');
  ok(await hash(p) === '#/', 'the right PIN after it still opens Home');
  await p.context().close();

  // 9. A new starter choosing a PIN on Prep answers the usual drink question there, as before; Home comes the next day
  const nopin = { [key('pinset', 'bo')]: undefined, [key('staffpins', 'bo')]: undefined };
  p = await L.open(b, '#/prep', { who: 'bo', noTok: true, extra: nopin, wait: 1500 });
  await p.type('#pf1', '4646'); await p.type('#pf2', '4646');
  await L.waitFor(p, () => LK_PREP.privateAccess()); await L.settle(p, 800);
  ok(await hash(p) === '#/prep' && !!(await p.$('[data-p="dk-skip"]')), 'a new starter stays on Prep with the usual drink question (' + await hash(p) + ')');
  ok(!p.errors.length, 'new starter: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // 10. The welcome on Home fits a phone with a long name on a shared screen, through the whole animation
  const longName = { [key('config', 'main')]: Object.assign({}, L.seed()[key('config', 'main')], { people: people.map(x => x.id === 'ann' ? Object.assign({}, x, { name: 'Alexandertheverylongname' }) : x) }) };
  p = await L.open(b, '#/prep', { who: '', deviceMode: 'shared', extra: longName, wait: 700 });
  await pin(p, 'ann', '2222');
  const worst = await p.evaluate(() => {
    const el = document.querySelector('.wtop-who'), a = el && el.getAnimations({ subtree: true })[0];
    let w = document.documentElement.scrollWidth - innerWidth;
    if (!a) return 'no welcome animation';
    a.pause();
    for (let t = 0; t <= 1200; t += 25) { a.currentTime = t; w = Math.max(w, document.documentElement.scrollWidth - innerWidth); }
    a.play();
    return w;
  });
  ok(await hash(p) === '#/' && typeof worst === 'number' && worst <= 1, 'the welcome plays on Home after a long-name sign-in, with no sideways scroll at any point (' + worst + (typeof worst === 'number' ? ' px over' : '') + ')');
  await p.context().close();

  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
