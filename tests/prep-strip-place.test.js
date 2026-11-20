/*
  Prep's first screen and coming back to it (head chef, 19 Nov 2026, docs/band-options/brief.md, Round 3):
    1. The strip mended: it leads with a cancelled, then a rescheduled, then a changed function (never only when that
       one is the earliest), counts every other one in "+N", says Functions, and carries the band's No signal and
       Could not load words.
    2. Prep keeps your place: back on Prep from another page the same line is at the top; tapping Prep on Prep goes to
       the top; never put back while a finger is down.
    3. Prep starts with the strip instead of the full band; a tap opens the service view; other pages keep the band.
  The checks marked (old) failed on the code before this change.
*/
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), DAY = 86400000;
const t = hm => M.kat(today, M.hmMin(hm));
const later = L.ymd(new Date(L.NOW + 3 * DAY));
function fn(id, name, start, round, o) {
  o = o || {};
  const date = o.date || today, at = hm => M.kat(date, M.hmMin(hm));
  const f = { v: 1, status: o.status || 'confirmed', name, date, start: at(start), loc: 'Beer garden', guests: 40, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at: at(round), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 2, u: M.toU([2]) }],
    was: o.was || {}, chg: o.chg || [], cBy: 'fay', cAt: L.NOW - DAY, confBy: 'fay', confAt: L.NOW - DAY, by: 'fay', upd: L.NOW - 3600000 };
  if (f.status === 'cancelled') { f.canBy = 'fay'; f.canAt = L.NOW - 1800000; }
  return M.derive(f);
}
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const config = { [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'staff'), P('bo', 'Bo', 'staff')], headId: 'sam', sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true } };
const extra = fns => Object.assign({}, config, ...Object.entries(fns).map(([id, f]) => ({ [fsKey(['functions', id])]: f })));
const live = { early: fn('early', 'Early lunch', '18:00', '18:30'), late: fn('late', 'Late dinner', '18:30', '19:00') };
// a rescheduled function: its old window is today, it is now on another day
const movedWas = fn('moved', 'Moved do', '19:00', '19:30');
const moved = fn('moved', 'Moved do', '19:00', '19:30', { date: later, was: { from: movedWas.from, until: movedWas.until, first: movedWas.first } });
const bandText = p => p.evaluate(() => (document.getElementById('fn-band') || {}).textContent.replace(/\s+/g, ' ').trim());
const open = (b, hash, fns, o) => L.open(b, hash, Object.assign({ who: 'sam', width: 390, height: 844, touch: true, wait: 1800, extra: extra(fns) }, o || {}));

(async () => {
  const b = await L.start();

  // 3. Prep starts with the strip; the band's words, +N apart; a tap opens the service view (two functions on)
  let p = await open(b, '#/prep', live);
  await L.waitFor(p, () => /Early lunch|Late dinner/.test((document.getElementById('fn-band') || {}).textContent || ''), null, 8000).catch(() => {});
  const band = await p.evaluate(() => { const e = document.getElementById('fn-band'); return { cls: e.className, h: Math.round(e.getBoundingClientRect().height), rows: e.querySelectorAll('.fn-row').length }; });
  ok(/is-strip/.test(band.cls) && band.h <= 52 && band.rows === 0, '(old) Prep starts with the slim strip, not the full band (' + band.h + ' px, ' + band.rows + ' rows)');
  let bt = await bandText(p);
  ok(/^Functions\s*18:30 .*Early lunch/.test(bt) && /\+1/.test(bt), '(old) the strip says Functions, then the next function, then +1 (' + bt + ')');
  const sb = await p.$('#fn-band .fn-strip-b'); if (sb) { await sb.click(); await L.settle(p, 600); }
  ok(await p.evaluate(() => location.hash) === '#/fn/now', 'with two functions on, a tap on the strip opens the service view');
  await p.goto(L.BASE + '#/orders'); await L.settle(p, 1400);
  ok(await p.evaluate(() => { const e = document.getElementById('fn-band'); return !!e && !e.classList.contains('is-strip') && e.querySelectorAll('.fn-row').length >= 2; }), 'Orders keeps the full band');
  ok(!p.errors.length, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 1. notices lead the strip: cancelled, then rescheduled, then changed, whatever their times
  p = await open(b, '#/prep', Object.assign({}, live, { gone: fn('gone', 'Gone party', '19:30', '20:00', { status: 'cancelled' }) }));
  await L.waitFor(p, () => /Gone party/.test((document.getElementById('fn-band') || {}).textContent || ''), null, 8000).catch(() => {});
  bt = await bandText(p);
  ok(/^Functions\s*Cancelled, do not send · Gone party/.test(bt) && /\+2/.test(bt), '(old) a cancelled function leads the strip though it is the latest (' + bt + ')');
  // the strip pinned on another page leads with it too
  await p.goto(L.BASE + '#/waste'); await L.settle(p, 1400);
  await p.evaluate(() => { document.body.style.minHeight = '4000px'; window.scrollTo(0, 1500); }); await L.settle(p, 400);
  const pin = await p.evaluate(() => { const s = document.querySelector('body > .fn-strip'); return s && !s.hidden ? s.textContent.replace(/\s+/g, ' ').trim() : ''; });
  ok(/^Functions\s*Cancelled, do not send · Gone party/.test(pin), '(old) scrolled on Wastage, the pinned strip leads with the cancellation too (' + pin + ')');
  await p.context().close();

  p = await open(b, '#/prep', Object.assign({}, live, { moved }));
  await L.waitFor(p, () => /Moved do/.test((document.getElementById('fn-band') || {}).textContent || ''), null, 8000).catch(() => {});
  bt = await bandText(p);
  ok(/^Functions\s*Rescheduled Moved do · now/.test(bt) && /\+2/.test(bt), '(old) a rescheduled function leads the strip and the others are counted (' + bt + ')');
  await p.context().close();

  const changed = fn('chg', 'Changed do', '19:00', '19:30', { chg: [{ at: L.NOW - 1800000, by: 'fay', what: ['Platters'] }] });
  p = await open(b, '#/prep', Object.assign({}, live, { chg: changed }));
  await L.waitFor(p, () => /Changed do/.test((document.getElementById('fn-band') || {}).textContent || ''), null, 8000).catch(() => {});
  bt = await bandText(p);
  ok(/^Functions\s*19:30 Changed 13:30 .*Changed do/.test(bt), '(old) a function changed in the last 3 hours leads the strip, with Changed and its time (' + bt + ')');
  await p.context().close();

  // 1. a failed functions read: the strip says so, on Prep and pinned elsewhere
  p = await open(b, '#/prep', live, { exhausted: 'functions' });
  await L.settle(p, 800);
  bt = await bandText(p);
  ok(/Could not load functions/.test(bt), 'Prep: a failed functions read says so in the strip (' + bt + ')');
  await p.context().close();

  // 2. Prep keeps your place
  p = await open(b, '#/prep', live);
  await L.waitFor(p, () => document.querySelectorAll('#prep-root .nb-row[id]').length > 3, null, 8000).catch(() => {});
  const mark = await p.evaluate(() => { const rows = document.querySelectorAll('#prep-root .nb-row[id]'), r = rows[2]; window.scrollTo(0, scrollY + r.getBoundingClientRect().top - 120); return r.id; });
  await L.settle(p, 400);
  const at0 = await p.evaluate(id => Math.round(document.getElementById(id).getBoundingClientRect().top), mark);
  await p.click('.tabbar a[href="#/orders"]'); await L.settle(p, 1400);
  await p.click('.tabbar a[href="#/prep"]'); await L.settle(p, 1400);
  const at1 = await p.evaluate(id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().top) : -999; }, mark);
  ok(Math.abs(at1 - at0) <= 8 && await p.evaluate(() => scrollY) > 100, '(old) back on Prep from Orders, the same line is where it was (' + at0 + ' then ' + at1 + ' px)');
  await p.click('.tabbar a[href="#/prep"]'); await L.settle(p, 500);
  ok(await p.evaluate(() => scrollY) === 0, 'Prep tapped while on Prep goes to the top');
  // never while a finger is down: away again, then back with a finger on the screen
  await p.evaluate(id => { const r = document.getElementById(id); window.scrollTo(0, scrollY + r.getBoundingClientRect().top - 120); }, mark); await L.settle(p, 400);
  await p.click('.tabbar a[href="#/orders"]'); await L.settle(p, 1400);
  await p.evaluate(() => { document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); location.hash = '#/prep'; });
  await L.settle(p, 900);
  ok(await p.evaluate(() => scrollY) === 0, 'with a finger down, the page waits at the top');
  await p.evaluate(() => document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  await L.settle(p, 1200);
  const at2 = await p.evaluate(id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().top) : -999; }, mark);
  ok(Math.abs(at2 - at0) <= 8, '(old) once the finger lifts, the place comes back (' + at2 + ' px)');
  ok(!p.errors.length, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
