// The first personal PIN of the authentication day opens Home; later unlocks keep the person's task.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const day = L.ymd(new Date(L.NOW));
const people = L.seed()[key('config', 'main')].people;
const cfg = { people, staffIds: ['sam', 'ann', 'bo'], sousIds: ['sam'],
  kitSecs: [{ id: 'grill', name: 'Grill', off: false }, { id: 'pans', name: 'Pans', off: false }, { id: 'larder', name: 'Larder', off: false }],
  kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320, off: false }] };
const extra = { [key('config', 'main')]: cfg, [key('team', day)]: { day, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam',
  on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'bo', sh: 'lunch', sec: 'pans' }],
  br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }, { id: 'ann', sh: 'dinner', at: 1140, len: 60 }, { id: 'bo', sh: 'lunch', at: 840, len: 30 }] } };
async function pin(p, id, value) {
  const name = p.locator('.p-name[data-id="' + id + '"]');
  if (await name.isVisible()) await name.click();
  await p.locator('#pf1').fill(value);
  await L.waitFor(p, () => LK_PREP.privateAccess());
  await L.settle(p, 500);
}
async function signOutTo(p, route) {
  await p.evaluate(route => { if (!LK_PREP.signOut(true)) throw new Error('Sign-out still has unfinished sending'); location.hash = route; }, route);
  await L.waitFor(p, () => !LK_PREP.privateAccess());
  await p.clock.runFor(21000); await L.settle(p, 200);
}
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { who: '', noPin: true, wait: 700 });
  ok(!!(await p.$('#p-pin')) && !(await p.$('#hm-board')) && !p.errors.length, 'a new device can open the kitchen PIN screen before config is known');
  await p.context().close();
  for (const route of ['#/prep', '#/orders', '#/waste']) {
    const p = await L.open(b, route, { who: '', deviceMode: 'shared', extra, wait: 700 });
    ok(!(await p.$('#hm-board')), route + ': no private shift details before a personal PIN');
    await pin(p, 'ann', '2222');
    ok(await p.evaluate(() => location.hash) === '#/' && !!(await p.$('#hm-board')), route + ': the right PIN opens Home');
    const shift = await txt(p, '#hm-board') || '';
    ok(/Lunch/.test(shift) && /10:00 to 15:00/.test(shift) && /Grill/.test(shift) && /14:30/.test(shift), route + ': Home shows Ann\'s first shift, hours, section and break');
    ok(/Dinner/.test(shift) && /16:00 to 22:00/.test(shift) && /Pans/.test(shift) && /19:00/.test(shift), route + ': Home also shows her later shift and break');
    ok(!/Break 14:00/.test(shift), route + ': another person\'s break stays out of her shift details');
    ok(!(await L.overflow(p)) && !p.errors.length, route + ': no sideways scroll or browser errors');
    await p.context().close();
  }
  p = await L.open(b, '#/orders', { who: 'ann', extra, wait: 700 });
  ok(await p.evaluate(() => location.hash) === '#/orders', 'a restored active session keeps its current page');
  await signOutTo(p, '#/orders'); await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/orders', 'a restored active session already counts as today\'s first login');
  await p.context().close();
  p = await L.open(b, '#/orders', { who: '', deviceMode: 'shared', extra, wait: 700 });
  await pin(p, 'ann', '2222');
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 300);
  await p.clock.runFor(11 * 60000); await L.waitFor(p, () => !LK_PREP.privateAccess());
  ok(await txt(p, '.p-card button[type="submit"]') === 'Sign in', 'a later daily unlock button does not promise a move to Home');
  await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/orders', 'an idle unlock later that day keeps Orders open');
  await signOutTo(p, '#/waste'); await p.reload({ waitUntil: 'load' }); await L.settle(p, 700);
  await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/waste', 'the daily mark survives sign-out and reload, keeping Wastage open');
  await signOutTo(p, '#/r/laksa');
  await p.click('.wtop-who'); await p.click('.wm [data-who="signin"]'); await L.settle(p, 300);
  await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/r/laksa', 'a later sign-in from the chef hat returns to the recipe');
  await signOutTo(p, '#/waste'); await pin(p, 'bo', '3333');
  ok(await p.evaluate(() => location.hash) === '#/', 'another person on the shared screen gets their own first Home landing');
  await signOutTo(p, '#/orders'); await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/orders', 'another person signing in does not reset the original person\'s daily mark');
  await p.context().close();
  p = await L.open(b, '#/orders', { who: 'ann', deviceMode: 'shared', extra, wait: 700, init: () => localStorage.setItem('lk.prep.seen', String(Date.now() - 11 * 60000)) });
  await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/orders', 'reopening an already idle valid session counts as a later login');
  await p.context().close();
  p = await L.open(b, '#/orders', { who: 'ann', dailyLocked: true, extra, wait: 700 });
  await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/', 'a fresh daily PIN opens Home');
  await p.context().close();
  const cutoff = Date.parse(day + 'T04:00:00+10:00');
  p = await L.open(b, '#/orders', { who: '', deviceMode: 'shared', extra, clock: cutoff - 60000, wait: 700 });
  await pin(p, 'ann', '2222');
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 200);
  await p.clock.runFor(90000); await L.waitFor(p, () => !LK_PREP.privateAccess());
  await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/', '04:00 resets the daily Home landing even after a login just before it');
  await p.context().close();
  p = await L.open(b, '#/orders', { who: '', deviceMode: 'shared', extra, clock: cutoff + (19 * 60 + 59) * 60000, wait: 700 });
  await pin(p, 'ann', '2222');
  await p.clock.runFor(90000); await signOutTo(p, '#/orders'); await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/orders', 'calendar midnight does not reset the 04:00 authentication day');
  await p.context().close();
  p = await L.open(b, '#/orders', { who: 'ann', deviceMode: 'shared', extra, clock: cutoff - 60000, wait: 700 });
  await p.locator('#o-text').fill('Keep this original order draft');
  await p.clock.runFor(90000); await L.settle(p, 300);
  await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/orders' && await p.locator('#o-text').inputValue() === 'Keep this original order draft', 'a daily PIN recovers the same person\'s unfinished task before Home');
  await signOutTo(p, '#/orders'); await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/orders', 'a first daily PIN used to recover work does not defer a Home redirect to later');
  await p.context().close();
  const functionsOnly = Object.assign({}, extra, { [key('config', 'main')]: Object.assign({}, cfg, { fnOnlyIds: ['bo'], fnIds: ['bo'] }) });
  p = await L.open(b, '#/functions', { who: '', deviceMode: 'shared', extra: functionsOnly, wait: 700 });
  await pin(p, 'bo', '3333');
  ok(await p.evaluate(() => location.hash) === '#/functions' && !(await p.$('#hm-board')), 'a Functions-only PIN keeps its allowed destination');
  ok(!p.errors.length, 'Functions-only sign-in has no browser errors');
  await p.context().close();
  p = await L.open(b, '#/', { who: 'ann', extra, wait: 1000, init: () => {
    const day = new Date(Date.now() + 10 * 3600000).toISOString().slice(0, 10);
    localStorage.setItem('lk.sec.ann', JSON.stringify({ d: day, sec: 'larder', name: 'Larder', sh: 'lunch', self: true, at: Date.now() }));
  } });
  const shifts = await p.$$eval('#hm-board .hm-a', rows => rows.filter(e => /^Your shift:/.test(e.querySelector('.hm-t').textContent)).map(e => e.textContent));
  ok(shifts.some(s => /Lunch/.test(s) && /Larder/.test(s)) && shifts.some(s => /Dinner/.test(s) && /Pans/.test(s)), 'Home follows a current section move while keeping the later shift\'s planned section');
  await p.context().close();
  p = await L.open(b, '#/', { who: 'ann', extra: Object.assign({}, extra, { [key('team', day)]: undefined }), wait: 1000 });
  ok(await txt(p, '[data-hm-shift-status]') === 'No shift details set for you today.', 'Home says when no shift details have been set');
  await p.context().close();
  p = await L.open(b, '#/', { who: 'ann', extra, failReads: '/team/', wait: 1000 });
  ok(/Could not check your shift details/.test(await txt(p, '[data-hm-shift-status]') || ''), 'a failed plan read is shown as an error, not an empty shift');
  await p.context().close();
  p = await L.open(b, '#/prep', { who: '', deviceMode: 'shared', extra, wait: 700 });
  await p.click('.p-name[data-id="ann"]'); await p.locator('#pf1').fill('9999'); await L.settle(p, 700);
  ok(await p.evaluate(() => !LK_PREP.privateAccess() && location.hash === '#/prep') && !(await p.$('#hm-board')), 'a wrong PIN stays on the locked page');
  await p.clock.runFor(21000); await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => location.hash) === '#/', 'a failed PIN never consumes the first successful Home landing');
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
