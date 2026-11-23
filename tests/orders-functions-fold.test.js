// Orders starts with the existing Functions fold on routine days. Live warnings stay named and keep their actions.
// The synthetic events start on an actual order tick, with the Functions listener and paint running as in the app.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results();
const day = M.kday(L.NOW), nextDay = M.addDays(day, 1);
const at = (hm, d = day) => M.kat(d, M.hmMin(hm));
const clock = at('14:00');
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true, fn: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true }
];
function fn(name, time, extra = {}) {
  return M.derive({ v: 1, status: 'confirmed', name, date: day, start: at(time) - 1800000, loc: 'Beer garden',
    guests: 40, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0, rounds: [{ at: at(time), note: '' }],
    lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty: 3, u: M.toU([3]) }],
    was: {}, chg: [], cBy: 'sam', cAt: clock - 86400000, confBy: 'sam', confAt: clock - 86400000, by: 'sam', upd: clock - 3600000,
    ...extra });
}
const smith = fn('Smith 50th anniversary in the garden', '18:30', { od: day });
const jones = fn('Jones birthday', '19:00'), cook = fn('Cook dinner', '19:30');
const cancelled = fn('Jones birthday', '19:00', { status: 'cancelled', canAt: clock - 1800000, canBy: 'sam' });
const moved = fn('Cook dinner', '19:30', { date: nextDay, start: at('19:00', nextDay), rounds: [{ at: at('19:30', nextDay), note: '' }],
  was: { from: cook.from, until: cook.until, first: cook.first } });
const changed = fn('Smith 50th anniversary in the garden', '18:30', { od: day, lines: smith.lines.map(x => ({ ...x, qty: 4, u: M.toU([4]) })), chg: [{ at: clock - 1800000, by: 'sam', what: ['Platters'] }] });
function fixtures(fns = { smith, jones, cook }) {
  const line = (text, addedAt, etc = {}) => ({ text, qty: '1 box', recipes: [], ordered: false, deleted: false,
    addedBy: 'Ann', addedById: 'ann', addedAt, ...etc });
  const weekday = (new Date(at('14:00')).getUTCDay() + 1) % 7;
  const items = {
    [key('config', 'main')]: { people, sousIds: ['sam'], staffIds: ['sam', 'ann'], fnIds: ['sam'], pingIds: ['sam'], showBadges: true,
      cutoffs: [{ id: 'veg', name: 'Greenvale Produce', dd: [weekday], at: 900, pre: 1 }] },
    [key('orders', day, 'lines', 'fn-smith')]: line('', clock - 3600000, M.orderBody(smith, 'smith')),
    [key('orders', day, 'lines', 'lemons')]: line('Lemons', clock - 3000000, { need: 'out' }),
    [key('orders', day, 'lines', 'milk')]: line('Milk', clock - 2700000),
    [key('orders', day, 'lines', 'cream')]: line('Cream', clock - 2400000),
    [key('orders', day, 'lines', 'flour')]: line('Flour', clock - 2100000),
    [key('orders', day, 'lines', 'oil')]: line('Oil', clock - 1800000),
    [key('orders', day, 'lines', 'eggs')]: line('Eggs', clock - 1500000)
  };
  return Object.assign(items, ...Object.entries(fns).map(([id, f]) => ({ [key('functions', id)]: f })));
}
const fold = '#fn-band [data-fn="fold"]', milk = '.o-main .nb-row [data-id="milk"].nb-box';
const touched = '.o-main .nb-row [data-id="lemons"].nb-box';
const slot = p => p.evaluate(() => {
  const e = document.getElementById('fn-band'), b = e.querySelector('[data-fn="fold"]');
  const first = document.querySelector('.o-main .nb-row'), tick = document.querySelector('.o-main .nb-box[data-id="lemons"]');
  return { text: e.innerText.replace(/\s+/g, ' ').trim(), y: first?.getBoundingClientRect().y, tickY: tick?.getBoundingClientRect().y,
    closed: b?.getAttribute('aria-expanded') === 'false', off: b?.getAttribute('aria-disabled') === 'true',
    focus: document.activeElement === b ? 'fold' : document.activeElement === tick ? 'tick' : '', node: window.beforeBand === e.firstElementChild,
    requestNode: window.beforeTick === tick, h: Math.round(e.getBoundingClientRect().height), overflow: document.documentElement.scrollWidth > innerWidth };
});
const held = async (p, ev, type = 'touch') => p.evaluate(([name, pointerType, selector]) =>
  document.querySelector(selector).dispatchEvent(name === 'touchcancel' ? new TouchEvent(name, { bubbles: true }) :
    new PointerEvent(name, { bubbles: true, pointerType })), [ev, type, touched]);
async function open(b, extra = {}, o = {}) {
  const p = await L.open(b, '#/orders', { who: 'sam', clock, width: 390, height: 844, touch: true, extra: { ...fixtures(), ...extra }, ...o });
  await L.waitFor(p, () => !!document.querySelector('.o-main .nb-row') && !!document.getElementById('fn-band') && window.LK_FN.state().state !== '');
  return p;
}
const paint = p => p.evaluate(() => window.LK_FN.paint());

(async () => {
  const b = await L.start();
  let p = await open(b);
  await L.waitFor(p, () => /Smith/.test(document.getElementById('fn-band').textContent) && !!document.querySelector('.o-fn-tag'));
  const initial = await slot(p);
  ok(initial.closed && initial.h >= 44 && initial.h <= 55 && /18:30 Smith/.test(initial.text), 'routine Orders starts with the one-line fold and actual time and name (' + JSON.stringify(initial) + ')');
  if (initial.closed) {
    const actual = await p.evaluate(() => {
      const summary = document.querySelector('.fn-band-sum'), count = document.querySelector('.fn-sum-more');
      const r = summary.getBoundingClientRect(), items = [...summary.querySelectorAll('.fn-sum-i')];
      return { actual: items.filter(item => item.hidden).length,
        count: count.hidden ? 0 : Number(count.textContent.slice(1)),
        visible: items.filter(item => !item.hidden).every(item => item.getBoundingClientRect().right <= r.right + 1) };
    });
    ok(actual.visible && actual.count === actual.actual, 'a name outside the fold is counted while the first time stays visible');
    await p.locator(fold).press('Enter');
    const expanded = await slot(p);
    ok(!expanded.closed && expanded.focus === 'fold' && /Service view/.test(expanded.text), 'Enter shows real Functions details inline and retains focus');
    await p.goto(L.BASE + '#/prep'); await L.waitFor(p, () => !!document.querySelector('#fn-band.is-strip'));
    await p.goto(L.BASE + '#/waste'); await L.waitFor(p, () => !!document.querySelector('#fn-band .fn-row'));
    ok(await p.locator('#fn-band .fn-band-h').textContent() === 'Functions today', 'Prep keeps the strip and Wastage opens expanded independently');
    await p.goto(L.BASE + '#/orders'); await L.waitFor(p, () => !!document.querySelector('.o-main .nb-row'));
    ok(!(await slot(p)).closed, 'the same person returns to their expanded preference this kitchen day');
    await p.locator(fold).press('Space');
    const returned = await slot(p);
    ok(returned.closed && returned.focus === 'fold' && Math.abs(returned.y - initial.y) <= 1, 'Space folds again and recovers row position and focus');
  }
  await p.locator('.o-cut-fold > summary').press('Enter');
  const place = p.getByRole('button', { name: 'Order placed for Greenvale Produce', exact: true });
  await place.click();
  const undoPlace = p.getByRole('button', { name: 'Undo order placed for Greenvale Produce', exact: true });
  await undoPlace.waitFor();
  await undoPlace.click(); await place.waitFor();
  await p.locator('.o-cut-fold > summary').press('Space');
  await p.locator(milk).click();
  await L.waitFor(p, k => window.__fake.dump()[k]?.ordered === true, key('orders', day, 'lines', 'milk'));
  const undo = p.locator('.p-toast').filter({ hasText: 'Milk' }).getByRole('button', { name: 'Undo' });
  await undo.click();
  await L.waitFor(p, k => window.__fake.dump()[k]?.ordered === false, key('orders', day, 'lines', 'milk'));
  ok(await p.locator('.o-fn-tag').textContent() === 'Order today' && await p.locator('[data-p="o-write"]').isVisible(), 'real Orders tick, named Undo, cut-off placed and Undo, stock tag and Add request still work');

  await p.context().close();
  p = await open(b);
  await L.waitFor(p, () => /Smith/.test(document.getElementById('fn-band').textContent) && !!document.querySelector('.o-fn-tag'));
  await L.settle(p, 200);
  // Focus and exact untouched nodes while a late listener arrives while the first order is being handled.
  await p.evaluate(sel => {
    const tick = document.querySelector(sel);
    document.querySelector('html').style.scrollBehavior = 'auto'; window.scrollTo(0, 0);
    tick.focus({ preventScroll: true });
    window.__fake.quiet = true; // A real listener does not repeat an unchanged Orders or config snapshot.
    window.beforeBand = document.querySelector('#fn-band').firstElementChild;
    window.beforeTick = tick;
  }, touched);
  const opening = await slot(p);
  await held(p, 'pointerdown');
  await p.evaluate(updates => updates.forEach(([k, f]) => window.__fake.write(k, f)),
    [[key('functions', 'smith'), changed], [key('functions', 'jones'), cancelled], [key('functions', 'cook'), moved]]);
  await L.waitFor(p, () => window.LK_FN.list().some(x => x.id === 'cook' && x.was.first));
  await paint(p);
  const during = await slot(p);
  ok(during.closed && during.node && during.requestNode && during.focus === 'tick' && during.tickY === opening.tickY,
    'live function change keeps the same band and focused order tick under a held finger (' + JSON.stringify(during) + ')');
  await held(p, 'pointercancel');
  await L.settle(p, 460);
  ok((await slot(p)).tickY === opening.tickY, 'touch pointercancel from scrolling holds until the actual touch ends');
  await held(p, 'touchcancel'); await L.settle(p, 560);
  const alert = await slot(p);
  ok(!alert.closed && alert.off && alert.focus === 'tick' && /Changed 13:30/.test(alert.text) &&
    /Cancelled.*Jones birthday.*Do not send/.test(alert.text) && /Rescheduled.*Cook dinner/.test(alert.text),
    'after touchcancel all three named warnings appear and the order tick retains focus (' + alert.text + ')');
  await held(p, 'pointerdown');
  await p.evaluate(([k, f]) => window.__fake.write(k, f), [key('functions', 'jones'), { ...cancelled, loc: 'Verandah' }]);
  await paint(p);
  const again = await slot(p);
  ok(again.tickY === alert.tickY && again.text === alert.text && again.focus === 'tick', 'an already-visible warning stays on an unrelated paint during a second hold');
  await held(p, 'pointerup'); await L.settle(p, 550);
  ok(/Verandah/.test((await slot(p)).text) && (await slot(p)).focus === 'tick',
    'pointerup applies the updated visible warning and leaves focus on the same order tick');
  if (await p.locator(fold).count()) await p.locator(fold).press('Enter');
  ok(!(await slot(p)).closed && (await slot(p)).focus === 'fold', 'a manual fold cannot hide current warnings and it retains keyboard focus');
  await p.evaluate(([k, f]) => window.__fake.write(k, f), [key('functions', 'jones'), { ...cancelled, loc: 'Pavilion' }]);
  await L.waitFor(p, () => /Pavilion/.test(document.getElementById('fn-band').textContent));
  ok((await slot(p)).focus === 'fold', 'a live band redraw preserves focus on the same disclosure');
  await p.evaluate(() => window.scrollTo(0, 680));
  const pin = 'body > .fn-strip:not([hidden])';
  await p.locator(pin).waitFor();
  const beforePin = await p.locator(pin).boundingBox();
  await held(p, 'pointerdown', 'mouse');
  await p.context().setOffline(true); await paint(p);
  ok((await p.locator(pin).boundingBox()).height === beforePin.height &&
    !(await p.locator(pin).textContent()).includes('No signal'), 'the pinned strip holds its height while a pointer is down with stale data waiting');
  await held(p, 'pointercancel', 'mouse'); await L.settle(p, 560);
  ok((await p.locator(pin).textContent()).includes('No signal'), 'pointercancel applies the queued pinned warning');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  const time = at('18:30');
  const trip = { [key('fnsent', 'smith_' + time + '_t1')]: { fid: 'smith', at: time, day, k: 1, n: { 'antipasto-platter': 1 }, sentAt: clock - 300000, sentBy: 'ann', by: 'ann' } };
  p = await open(b, trip);
  await L.waitFor(p, () => !!document.querySelector('#fn-band [data-fn="trip-out"]'), null, 5000).catch(() => {});
  ok(await p.getByRole('button', { name: 'Confirm out', exact: true }).count() === 1, 'Functions-capable chef sees the actual Confirm out action');
  await p.context().close();
  p = await open(b, trip, { who: 'ann' });
  await L.waitFor(p, () => /Smith/.test(document.getElementById('fn-band').textContent));
  ok((await slot(p)).closed && !(await p.$('.o-cut-fold')) && await p.locator(milk).isDisabled(),
    'ordinary staff do not inherit chef cut-offs, ordering or someone else’s Confirm out');
  await p.context().close();

  // Compare the same kitchen time on a device in another time zone. Drive the existing clock/paint path on each side.
  p = await open(b, {}, { clock: at('17:29') + 50000, tz: 'America/New_York', settings: { text: 'xlarge' } });
  await L.waitFor(p, () => /Smith/.test(document.getElementById('fn-band').textContent));
  await p.clock.setFixedTime(at('17:29') + 59000); await paint(p);
  ok((await slot(p)).closed && !(await slot(p)).overflow, 'Extra large, outside the last hour at 17:29:59 Queensland, starts folded and fits');
  await p.clock.setFixedTime(at('17:30')); await paint(p);
  ok(!(await slot(p)).closed && /18:30 Smith/.test((await slot(p)).text), 'the due round opens the band from exactly 17:30 Queensland');
  await p.clock.setFixedTime(at('18:31')); await paint(p);
  ok(/not sent yet/.test((await slot(p)).text), 'an overdue unsent round keeps its actual late wording');
  await p.context().setOffline(true);
  await L.waitFor(p, () => document.querySelector('#fn-band .fn-stale')?.textContent.includes('No signal'), null, 5000).catch(() => {});
  ok(!(await slot(p)).closed && /No signal.*Functions last updated/.test((await slot(p)).text), 'a cached offline band names its last read and stays open');
  await p.context().close();
  p = await open(b, {}, { exhausted: 'functions' });
  await L.waitFor(p, () => document.querySelector('#fn-band .fn-stale')?.textContent.includes('Could not load functions'), null, 5000).catch(() => {});
  ok(/Could not load functions/.test((await slot(p)).text), 'a cold failed read remains explicit');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
