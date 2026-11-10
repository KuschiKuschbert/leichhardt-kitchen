// Functions ahead of time, step 1 (head chef, 10 Nov 2026, docs/function-ahead-options/brief.md, Chosen): on a day the
// band would draw nothing, the slot under the top bar holds one quiet Next function line on every work page. It is
// decided when the page opens and keeps its place until the next open, so a booking from another phone, no signal,
// midnight or a cancellation change its words only and the list never moves under a finger. A function today is the
// one exception: the full band, once no finger is down. The minus hides it for this person on this phone until
// tomorrow. The band's Order, Tomorrow and today lines stay as they were. #/fn looks 7 days ahead and the sheet shows
// the guests. All people and functions here are made up.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results(), { txt } = L;
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm));
const cfg = {
  people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true, fn: false },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true, fn: false },
    { id: 'bo', name: 'Bo', role: 'head', add: true, tick: true, del: true, active: true, fn: false }
  ], headId: 'bo', sousIds: ['sam', 'bo'], pingIds: ['sam', 'bo'], fnIds: [], staffIds: ['sam', 'ann', 'bo'], showBadges: true
};
function fn(o) {
  const date = o.date, rounds = (o.rounds || ['18:30']).map(x => ({ at: at(date, x), note: '' }));
  return M.derive(Object.assign({ v: 1, status: 'confirmed', name: o.name, date, start: at(date, o.start || '17:30'), loc: 'Function room', guests: o.guests || 40,
    mode: rounds.length > 1 ? 'stag' : 'all', notes: '', kc: '', kcBy: '', kcAt: 0, rounds, od: o.od || M.addDays(today, -2),
    lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty: 4, u: M.toU([4]) }],
    was: {}, chg: [], cBy: 'bo', cAt: 1, confBy: 'bo', confAt: 1, by: 'bo', upd: L.NOW - 86400000 }, o.x || {}));
}
const SMITH = fn({ name: 'Smith 60th', date: M.addDays(today, 2), guests: 60, start: '18:00', rounds: ['18:30', '19:15'] });
const JONES = fn({ name: 'Jones wedding', date: M.addDays(today, 4), guests: 90 });
const extra = fs => Object.assign({ [key(['config', 'main'])]: cfg }, ...Object.keys(fs).map(id => ({ [key(['functions', id])]: fs[id] })));
const WEEK = { smith: SMITH, jones: JONES };
const band = p => p.evaluate(() => {
  const b = document.getElementById('fn-band'), r = b && !b.hidden ? b.getBoundingClientRect() : null;
  const row = document.querySelector('#main .p-item, #main li[data-id], #main [data-id]');
  return { shown: !!r && r.height > 0, ahead: !!b && b.classList.contains('is-ahead'), h: r ? Math.round(r.height) : 0, text: b && !b.hidden ? b.innerText.replace(/\s+/g, ' ').trim() : '',
    label: b ? b.getAttribute('aria-label') : '', row: row ? Math.round(row.getBoundingClientRect().top) : null, l1: (document.querySelector('#fn-band .fn-ahead-l') || {}).scrollWidth || 0,
    l1w: (document.querySelector('#fn-band .fn-ahead-l') || {}).clientWidth || 0 };
});
const settle = (p, ms) => L.settle(p, ms || 400);
(async () => {
  const b = await L.start(); let p;
  async function step(name, task) {
    try { await task(); }
    catch (e) { ok(false, name + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, name + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }
  const prepWait = () => L.waitFor(p, () => !!document.querySelector('#fn-band.is-ahead .fn-ahead-b'), null, 6000);

  // 1. Prep on a Tuesday with functions on Thursday and Saturday: one quiet line, the nearest named, "+1 more this week"
  await step('prep line', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra: extra(WEEK), width: 390, height: 844, wait: 1500 });
    await prepWait();
    const x = await band(p);
    ok(x.ahead && x.label === 'Next function', 'Prep: the slot holds the Next function line, named for a screen reader (' + x.label + ')');
    ok(/NEXT FUNCTION/i.test(x.text) && /Smith 60th/.test(x.text) && new RegExp(M.dayName(SMITH.date), 'i').test(x.text) && /60 guests/.test(x.text), 'the line names the nearest function, its day in words and its guests (' + x.text + ')');
    ok(/\+1 more/.test(x.text) && /this week/.test(x.text) && !/Jones/.test(x.text), 'the other function this week is "+1 more this week", not a second row');
    ok(x.h >= 44 && x.h <= 64, 'the line is one slim slot, 44 to 64 px at 390 (' + x.h + ' px)');
    ok(x.l1 <= x.l1w + 1, 'row 1 (Next function and the day) is not cut');
    const bg = await p.$eval('#fn-band', e => getComputedStyle(e).backgroundColor);
    ok(bg !== 'rgb(28, 29, 31)' && !/^rgb\(2[0-9], 2[0-9], 3[0-9]\)$/.test(bg), 'quiet reference paper, not the dark live band (' + bg + ')');
    ok(!(await L.overflow(p)), '390: no sideways scroll');
    // the tap opens the function's sheet, which now says the guests on its first line
    await p.click('#fn-band .fn-ahead-b');
    await L.waitFor(p, () => !!document.querySelector('.fn-sheet .fn-sub'), null, 4000);
    ok(/60 guests/.test(await txt(p, '.fn-sheet .fn-sub') || ''), 'one tap opens the sheet; its first line has the guests (' + await txt(p, '.fn-sheet .fn-sub') + ')');
  });

  // 2. while Prep is open: a booking for tomorrow, no signal, a cancellation, midnight words. The list never moves.
  await step('locked while open', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra: extra(WEEK), width: 390, height: 844, wait: 1500 });
    await prepWait();
    const a = await band(p);
    ok(a.row !== null, 'a prep row to watch (' + a.row + ')');
    // another phone books a function for tomorrow: the band would show its Tomorrow line; here the line's words change
    await p.evaluate(([k, v]) => window.__fake.write(k, v), [key(['functions', 'lee']), fn({ name: 'Lee engagement', date: M.addDays(today, 1), guests: 40 })]);
    await L.waitFor(p, () => /Lee engagement/.test((document.getElementById('fn-band') || {}).innerText || ''), null, 4000);
    let x = await band(p);
    ok(x.ahead && /TOMORROW/i.test(x.text) && x.h === a.h && x.row === a.row, 'a booking for tomorrow while open: Tomorrow words in the same slot, the list does not move (' + a.h + '/' + x.h + ' px, row ' + a.row + '/' + x.row + ')');
    await p.evaluate(k => window.__fake.write(k, null), key(['functions', 'lee']));
    // no signal
    await p.context().setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline')));
    await L.waitFor(p, () => /No signal/i.test((document.getElementById('fn-band') || {}).innerText || ''), null, 4000);
    x = await band(p);
    ok(x.ahead && /updated \d\d:\d\d/i.test(x.text) && x.h === a.h && x.row === a.row, 'no signal: "No signal · updated" in the same slot, the list does not move (' + x.text + ')');
    await p.context().setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online')));
    await L.waitFor(p, () => !/No signal/i.test((document.getElementById('fn-band') || {}).innerText || ''), null, 4000);
    // Smith 60th is cancelled on another phone, with a long new name: Cancelled · Do not prep, never cut, same height
    const long = Object.assign({}, SMITH, { name: 'Robertson and Nguyen engagement party lunch', status: 'cancelled', canAt: L.NOW - 60000, canBy: 'bo', upd: L.NOW - 60000 });
    await p.evaluate(([k, v]) => window.__fake.write(k, v), [key(['functions', 'smith']), long]);
    await L.waitFor(p, () => /Do not prep/i.test((document.getElementById('fn-band') || {}).innerText || ''), null, 4000);
    x = await band(p);
    const stop = await p.evaluate(() => { const e = document.querySelector('#fn-band .fn-ahead-stop'), s = document.querySelector('#fn-band .fn-ahead-s'); return { stop: e ? e.innerText : '', whole: !!e && e.scrollWidth <= e.clientWidth + 1 && e.getBoundingClientRect().right <= e.closest('.fn-ahead-t').getBoundingClientRect().right + 1, s: !!s && s.scrollWidth <= s.clientWidth + 1 }; });
    ok(x.ahead && /CANCELLED/i.test(x.text) && /Do not prep/.test(stop.stop) && stop.whole && stop.s && x.h === a.h && x.row === a.row && x.l1 <= x.l1w + 1, 'cancelled with a long name: Cancelled on row 1 and Do not prep leading row 2, both whole, same height, the list does not move (' + x.text + '; ' + a.h + '/' + x.h + ' px, row ' + a.row + '/' + x.row + ', row 1 ' + x.l1 + '/' + x.l1w + ')');
    ok(await p.$eval('#fn-band .fn-ahead-n', e => e.scrollWidth > e.clientWidth && getComputedStyle(e).textOverflow === 'ellipsis'), 'the long name is shortened with an ellipsis, not wrapped');
  });

  // 2b. after the review (10 Nov 2026): a cancellation stays through no signal; the minus on changed words hides, not
  // swaps in the band; the slot is not rebuilt every 20 s; lk-who (sent on every shared-tablet tick) is not an open
  await step('review fixes', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra: extra(WEEK), width: 390, height: 844, wait: 1500 });
    await prepWait();
    const a = await band(p);
    // the slot keeps the same element and the focus through two 20 s ticks
    await p.focus('#fn-band .fn-ahead-b'); await p.evaluate(() => { document.querySelector('#fn-band .fn-ahead-b').lkMark = 1; });
    await p.clock.fastForward(45000); await settle(p, 300);
    ok(await p.evaluate(() => { const e = document.activeElement; return !!e && e.lkMark === 1 && e.classList.contains('fn-ahead-b'); }), 'two 20 s ticks: the line is not rebuilt, the focus stays on it');
    // a cancellation the phone knows stays on the line when the signal drops
    await p.evaluate(([k, v]) => window.__fake.write(k, v), [key(['functions', 'smith']), Object.assign({}, SMITH, { status: 'cancelled', canAt: L.NOW - 60000, canBy: 'bo' })]);
    await L.waitFor(p, () => /Do not prep/.test((document.getElementById('fn-band') || {}).innerText || ''), null, 4000);
    await p.context().setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline'))); await settle(p, 500);
    let x = await band(p);
    ok(/CANCELLED/i.test(x.text) && /Do not prep/.test(x.text) && x.h === a.h, 'no signal does not hide a cancellation the phone already knows (' + x.text + ')');
    await p.context().setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online')));
    // a booking for tomorrow while open turns the words to Tomorrow; the minus then hides the line, never the full band
    await p.evaluate(([k, v]) => window.__fake.write(k, v), [key(['functions', 'lee']), fn({ name: 'Lee engagement', date: M.addDays(today, 1), guests: 40 })]);
    await L.waitFor(p, () => /TOMORROW/i.test((document.getElementById('fn-band') || {}).innerText || ''), null, 4000);
    await p.click('#fn-band [data-fn="ahead-hide"]'); await settle(p, 400);
    ok(await p.evaluate(() => document.getElementById('fn-band').hidden), 'the minus on Tomorrow words hides the line; the full band does not drop in');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('p-toast-btn')), 'the focus moves to the slip\'s Undo, not to the page');
    await p.click('.p-toasts .p-toast-btn');
    await L.waitFor(p, () => { const e = document.getElementById('fn-band'); return !e.hidden && e.classList.contains('is-ahead'); }, null, 4000);
    ok(/TOMORROW/i.test((await band(p)).text), 'Undo brings the same line back');
  });
  await step('lk-who is not an open', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra: extra({}), width: 390, height: 844, wait: 1500 });
    await settle(p, 800);
    const a = await band(p);
    ok(!a.shown, 'no function this week: no line (' + a.text + ')');
    await p.evaluate(([k, v]) => window.__fake.write(k, v), [key(['functions', 'smith']), SMITH]); await settle(p, 600);
    await p.evaluate(() => window.dispatchEvent(new Event('lk-who'))); await settle(p, 600);
    const x = await band(p);
    ok(!x.shown && x.row === a.row, 'a booking while Prep is open, then lk-who (a shared-tablet tick): no line appears, the list does not move (row ' + a.row + '/' + x.row + ')');
    await p.evaluate(() => { location.hash = '#/orders'; }); await settle(p, 900);
    ok((await band(p)).ahead, 'the next page open shows it');
  });
  await step('cancelled the day before', async () => {
    const c = fn({ name: 'Smith 60th', date: M.addDays(today, 1), guests: 60, x: { status: 'cancelled', canAt: L.NOW - 3600000, canBy: 'bo' } });
    p = await L.open(b, '#/prep', { who: 'ann', extra: extra({ smith: c, jones: JONES }), width: 390, height: 844, wait: 1500 });
    await prepWait();
    const x = await band(p);
    ok(/CANCELLED/i.test(x.text) && /Do not prep/.test(x.text) && /Smith 60th/.test(x.text), 'the day before a cancelled function (the prep day), the line says Cancelled, Do not prep (' + x.text + ')');
  });
  await step('a scrolling finger is still down', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra: extra(WEEK), width: 390, height: 844, wait: 1500 });
    await prepWait();
    const a = await band(p);
    await p.evaluate(() => { const o = { bubbles: true, pointerType: 'touch', pointerId: 7 }; document.body.dispatchEvent(new PointerEvent('pointerdown', o)); document.body.dispatchEvent(new PointerEvent('pointercancel', o)); });
    await p.evaluate(([k, v]) => window.__fake.write(k, v), [key(['functions', 'now']), fn({ name: 'Club lunch', date: today, start: '13:30', rounds: ['14:30'] })]);
    await settle(p, 900);
    let x = await band(p);
    ok(x.ahead && x.row === a.row && /TODAY/i.test(x.text), 'a touch that turned into a scroll (pointercancel) still holds the band back; the line says Today meanwhile (' + x.text + ')');
    await p.evaluate(() => document.body.dispatchEvent(new TouchEvent('touchend', { bubbles: true, touches: [] })));
    await L.waitFor(p, () => { const e = document.getElementById('fn-band'); return !e.classList.contains('is-ahead') && /Club lunch/.test(e.innerText); }, null, 4000);
    ok(true, 'the finger leaves the glass: the full band shows today\'s function');
  });

  // 3. a function booked for today breaks the line, but only once the finger is up
  await step('today breaks the lock', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra: extra(WEEK), width: 390, height: 844, wait: 1500 });
    await prepWait();
    const a = await band(p);
    await p.mouse.move(200, 600); await p.mouse.down();
    await p.evaluate(([k, v]) => window.__fake.write(k, v), [key(['functions', 'now']), fn({ name: 'Club lunch', date: today, start: '13:30', rounds: ['14:30'] })]);
    await settle(p, 800);
    let x = await band(p);
    ok(x.ahead && x.row === a.row, 'a function today while a finger is down: the list stays put (row ' + a.row + '/' + x.row + ')');
    await p.mouse.up();
    await L.waitFor(p, () => { const e = document.getElementById('fn-band'); return e && !e.classList.contains('is-ahead') && /Club lunch/.test(e.innerText); }, null, 4000);
    x = await band(p);
    ok(!x.ahead && /Club lunch/.test(x.text) && x.h > a.h, 'once the finger is up, the full band shows today\'s function (' + x.h + ' px)');
  });

  // 4. the band's own days are as before: the day before shows its Tomorrow line, today its rounds
  await step('band days unchanged', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra: extra({ smith: fn({ name: 'Smith 60th', date: M.addDays(today, 1), guests: 60 }), jones: JONES }), width: 390, height: 844, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('#fn-band:not([hidden]) .fn-row'), null, 6000);
    const x = await band(p);
    ok(!x.ahead && /Tomorrow/.test(x.text) && /Smith 60th/.test(x.text), 'the day before: the band\'s Tomorrow line, as before, no Next function line (' + x.text.slice(0, 80) + ')');
  });

  // 5. the minus: this person, this phone, until tomorrow, with Undo; another person on the same device still sees it
  await step('minus', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra: extra(WEEK), width: 390, height: 844, wait: 1500 });
    await prepWait();
    await p.click('#fn-band [data-fn="ahead-hide"]');
    await L.waitFor(p, () => document.getElementById('fn-band').hidden && !!document.querySelector('.p-toasts .p-toast-btn'), null, 4000);
    ok(/hidden on this phone until tomorrow/i.test(await txt(p, '.p-toasts') || ''), 'the minus hides the line and says so where the eye is, with Undo (' + await txt(p, '.p-toasts') + ')');
    ok(await p.evaluate(d => localStorage.getItem('lk.fn.ahead.fold') === d + '|ann', today), 'kept for this person and this kitchen day (lk.fn.ahead.fold)');
    ok(await p.evaluate(() => localStorage.getItem('lk.fn.fold') === null), 'the band\'s own minus is untouched, so a later Order or Tomorrow band still opens');
    await p.click('.p-toasts .p-toast-btn');
    await L.waitFor(p, () => !document.getElementById('fn-band').hidden && document.getElementById('fn-band').classList.contains('is-ahead'), null, 4000);
    ok(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-fn') === 'ahead-hide'), 'Undo brings the line back and puts the focus on its minus');
    await p.click('#fn-band [data-fn="ahead-hide"]'); await settle(p, 300);
    await p.evaluate(() => { location.hash = '#/orders'; }); await settle(p, 900);
    ok(await p.evaluate(() => { const e = document.getElementById('fn-band'); return !e || e.hidden; }), 'hidden stays hidden on the next page today');
  });
  await step('minus is per person', async () => {
    p = await L.open(b, '#/prep', { who: 'sam', extra: extra(WEEK), width: 390, height: 844, wait: 1500, init: "localStorage.setItem('lk.fn.ahead.fold', '" + today + "|ann')" });
    await L.waitFor(p, () => !!document.querySelector('#fn-band.is-ahead'), null, 6000).catch(() => {});
    ok((await band(p)).ahead, 'Ann hid it on this device; Sam signed in on the same device still sees the line');
  });

  // 6. every work page has it; #/fn (which lists the functions) and Home's board do not; signed out sees nothing
  for (const hash of ['#/orders', '#/waste', '#/transfers', '#/recipes']) {
    await step('page ' + hash, async () => {
      p = await L.open(b, hash, { who: 'ann', extra: extra(WEEK), width: 390, height: 844, wait: 1500 });
      await L.waitFor(p, () => !!document.querySelector('#fn-band.is-ahead'), null, 6000).catch(() => {});
      ok((await band(p)).ahead && !(await L.overflow(p)), hash + ': the Next function line, no sideways scroll');
    });
  }
  await step('fn page', async () => {
    p = await L.open(b, '#/fn', { who: 'ann', extra: extra(WEEK), width: 390, height: 844, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('.fn-list-page .fn-card'), null, 6000);
    ok(!(await band(p)).ahead, '#/fn lists the functions itself: no line above it');
    const secs = await p.$$eval('.fn-list-page .fn-sec-h', l => l.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    ok(secs.some(s => /next 7 days/.test(s)), 'Upcoming looks a week ahead (' + secs.join(' | ') + ')');
    ok(/Jones wedding/.test(await txt(p, '#main') || ''), 'Saturday\'s function is on #/fn without "Show the next 14 days"');
  });
  await step('home', async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: extra(WEEK), width: 390, height: 844, wait: 1500 });
    await settle(p, 800);
    ok(!(await p.$('#fn-band')), 'Home\'s board has no band slot, as before (the Home card is step 2)');
  });
  await step('signed out', async () => {
    p = await L.open(b, '#/recipes', { noPin: true, extra: extra(WEEK), width: 390, height: 844, wait: 1500 });
    await settle(p, 800);
    const so = await band(p), body = await p.evaluate(() => document.body.innerText);
    ok(!so.ahead && !/Smith 60th|Jones wedding/.test(body), 'signed out: no line, no function names (' + so.ahead + ', ' + (body.match(/.{0,60}(Smith 60th|Jones wedding).{0,20}/) || [''])[0] + ')');
  });

  // 7. midnight while Prep is open: Thursday becomes tomorrow, the words change, the list does not move
  await step('midnight', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra: extra(WEEK), width: 390, height: 844, wait: 1500, clock: at(today, '23:59') });
    await prepWait();
    const a = await band(p);
    ok(/NEXT FUNCTION/i.test(a.text), 'at 23:59 the line says Next function');
    await p.clock.fastForward('02:00'); await settle(p, 600);
    await p.clock.fastForward(25000); await settle(p, 600);
    const x = await band(p);
    ok(x.ahead && /TOMORROW/i.test(x.text) && /Smith 60th/.test(x.text) && x.h === a.h && x.row === a.row, 'after midnight: Tomorrow words in the same slot, never both lines, the list does not move (' + x.text + ')');
  });

  // 8. wider screens: one line, no sideways scroll
  for (const width of [768, 1280]) {
    await step('width ' + width, async () => {
      p = await L.open(b, '#/prep', { who: 'ann', extra: extra(WEEK), width, height: 900, wait: 1500 });
      await prepWait();
      const x = await band(p);
      ok(x.ahead && x.h <= 64 && !(await L.overflow(p)), width + ': the line in one slim slot, no sideways scroll (' + x.h + ' px)');
    });
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
