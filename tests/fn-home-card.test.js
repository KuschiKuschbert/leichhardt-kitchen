// Functions ahead of time, step 2 (head chef, 10 Nov 2026, docs/function-ahead-options/brief.md, Chosen): Home's
// Function this week card under Your day, once per person per function, with its food times, platters and the notes as
// typed, and Got it; once more the day before (Function tomorrow, for everyone); once if the booking changes; once if it
// is cancelled after the person was told; one card for three or more. Got it folds the card into the Next function
// line in the same place, with Undo inside it. What shows is decided when Home opens; until the next open only the
// words change. All people and functions here are made up.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results(), { txt } = L;
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), at = (d, hm) => M.kat(d, M.hmMin(hm));
const names = { ann: 'Ann', bo: 'Bo', cleo: 'Cleo', dev: 'Dev', sam: 'Sam' };
const people = Object.keys(names).map(id => ({ id, name: names[id], role: id === 'bo' ? 'head' : id === 'sam' ? 'sous' : 'staff', active: true, add: true, tick: true, del: id === 'bo' || id === 'sam', fn: false }));
const secs = [{ id: 'hot', name: 'Hot larder' }, { id: 'pans', name: 'Pans' }, { id: 'pass', name: 'Pass' }, { id: 'prep', name: 'Prep' }];
const shifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }];
const on = [{ id: 'ann', sh: 'lunch', sec: 'hot' }, { id: 'bo', sh: 'lunch', sec: 'pans' }, { id: 'cleo', sh: 'lunch', sec: 'pass' }, { id: 'dev', sh: 'lunch', sec: 'prep' }, { id: 'sam', sh: 'lunch', sec: 'prep' }];
const cfg = { people, headId: 'bo', sousIds: ['sam', 'bo'], pingIds: ['bo'], fnIds: [], staffIds: Object.keys(names), showBadges: true, kitSecs: secs, kitShifts: shifts };
function fn(name, plus, o) {
  o = o || {};
  const date = M.addDays(today, plus), rounds = (o.rounds || ['18:30']).map(x => ({ at: at(date, x), note: '' }));
  return M.derive(Object.assign({ v: 1, status: 'confirmed', name, date, start: at(date, o.start || '17:30'), loc: o.loc || 'Function room', guests: o.guests || 40,
    mode: rounds.length > 1 ? 'stag' : 'all', notes: o.notes || '', kc: '', kcBy: '', kcAt: 0, rounds, od: M.addDays(today, -2),
    lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty: 5, u: M.toU(rounds.length > 1 ? [3, 2] : [5]) }],
    was: {}, chg: [], cBy: 'bo', cAt: 1, confBy: 'bo', confAt: 1, by: 'bo', upd: L.NOW - 86400000 }, o.x || {}));
}
const SMITH = fn('Smith 60th', 2, { start: '18:00', rounds: ['18:30', '19:15'], guests: 60, notes: '4 gluten free, 1 nut allergy at table 4.' });
const JONES = fn('Jones wedding', 4, { guests: 90, loc: 'Beer garden' });
const extra = fs => Object.assign({ [key(['config', 'main'])]: cfg, [key(['team', today])]: { day: today, on, br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'bo' } },
  ...Object.keys(fs).map(id => ({ [key(['functions', id])]: fs[id] })));
const seen = (who, m) => "localStorage.setItem('lk.fn.hu." + who + "', " + JSON.stringify(JSON.stringify(m)) + ')';
const geo = p => p.evaluate(() => {
  const top = s => { const e = document.querySelector(s); return e && !e.hidden && e.getBoundingClientRect().height ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
  const tb = document.querySelector('.tabbar');
  return { day: top('#hm-day'), hm: top('#fn-hm'), with: top('#hm-with'), card: top('#fn-hm .fn-hu'), line: top('#fn-hm .fn-hm-line'), tab: tb ? Math.round(tb.getBoundingClientRect().top) : 0,
    cardText: ((document.querySelector('#fn-hm .fn-hu') || {}).innerText || '').replace(/\s+/g, ' ').trim(), lineText: ((document.querySelector('#fn-hm .fn-hm-line') || {}).innerText || '').replace(/\s+/g, ' ').trim(),
    up: ((document.querySelector('.hm-up') || {}).innerText || '').replace(/\s+/g, ' ') };
});
const homeWait = p => L.waitFor(p, () => { const e = document.getElementById('fn-hm'); return !!e && !e.hidden && !!e.textContent.trim(); }, null, 6000);
(async () => {
  const b = await L.start(); let p;
  async function step(name, task) {
    try { await task(); }
    catch (e) { ok(false, name + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, name + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }

  // 1. a cook's first Home of the day with functions on Thursday and Saturday: the card under Your day, on the first screen
  await step('the card', async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: extra({ smith: SMITH, jones: JONES }), width: 390, height: 844, wait: 1800 });
    await homeWait(p);
    const g = await geo(p);
    ok(g.day < g.hm && g.hm < g.with, 'order: Your day, then the function card, then On with you (' + [g.day, g.hm, g.with].join(' < ') + ')');
    ok(g.card !== null && g.card < g.tab, 'the card starts on the first screen, above the tab bar (' + g.card + ' < ' + g.tab + ')');
    ok(/FUNCTION THIS WEEK/i.test(g.cardText) && /1 of 2 this week/i.test(g.cardText) && /Smith 60th/.test(g.cardText) && /in 2 days/i.test(g.cardText), 'it names the nearest function, which of how many, and how soon (' + g.cardText.slice(0, 90) + ')');
    ok(/60 guests/.test(g.cardText) && /18:30 and 19:15 \(2 rounds\)/.test(g.cardText) && /5 × Antipasto \(5\)/.test(g.cardText), 'guests, food times and platters on the card, no tap');
    ok(/4 gluten free, 1 nut allergy at table 4\./.test(g.cardText), 'the notes as typed: the allergy keeps its words');
    ok(/Also this week: SAT 14 NOV Jones wedding/i.test(g.cardText), 'the other function this week is named in one line');
    ok(!/Smith 60th/.test(g.up), 'Coming up does not repeat the function on the card');
    ok(!(await L.overflow(p)), '390: no sideways scroll');
  });

  // 2. Got it: the card folds into the line in its place, says so with Undo; the next card follows; a double tap is ignored
  await step('got it', async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: extra({ smith: SMITH, jones: JONES }), width: 390, height: 844, wait: 1800 });
    await homeWait(p);
    const a = await geo(p);
    await p.dblclick('#fn-hm .fn-hu-got');
    await L.settle(p, 400);
    const g = await geo(p);
    ok(g.line === a.card && /Got it\. It stays here as one line\./.test(g.lineText) && /Smith 60th/.test(g.lineText), 'Got it: the line in the card\'s place says Got it, naming the function (' + g.lineText + ')');
    ok(/Jones wedding/.test(g.cardText), 'the next card follows under the line, and the second tap of a double tap did not put it away (' + g.cardText.slice(0, 60) + ')');
    ok(!/Also this week: .*Smith/i.test(g.cardText), 'the next card does not repeat the function the line names');
    const m = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.fn.hu.ann') || '{}'));
    ok(m.smith && m.smith.s === 'week' && m.smith.v === SMITH.upd && !m.jones, 'Got it is kept for Ann, stamped with the booking\'s version the card showed (' + JSON.stringify(m) + ')');
    await p.click('#fn-hm .fn-hu-undo'); await L.settle(p, 400);
    const u = await geo(p);
    ok(/Smith 60th/.test(u.cardText) && u.line === null, 'Undo brings the Smith card back');
    ok(await p.evaluate(() => !JSON.parse(localStorage.getItem('lk.fn.hu.ann') || '{}').smith), 'Undo takes the mark away');
    await p.clock.fastForward(1000); await p.click('#fn-hm .fn-hu-got'); await L.settle(p, 400);
    ok(await p.evaluate(() => document.activeElement && document.activeElement.classList.contains('fn-hu-undo')), 'after a single Got it the focus is on Undo, inside the line');
    await p.clock.fastForward(1000); await p.click('#fn-hm .fn-hu-got'); await L.settle(p, 400);
    await p.clock.fastForward(10000); await L.settle(p, 300);
    const e = await geo(p);
    ok(e.card === null && /NEXT FUNCTION/i.test(e.lineText) && /Smith 60th/.test(e.lineText) && /\+1 more/.test(e.lineText) && !/Got it/.test(e.lineText), 'both seen: after 9 s the line says Next function, Smith 60th, +1 more (' + e.lineText + ')');
    ok(e.with < a.with, 'On with you moves back up once the cards are seen (' + a.with + ' to ' + e.with + ')');
  });

  // 3. seen before: the next open shows only the line; the cards are per person, so Sam on the same phone gets his own
  await step('seen, next open', async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: extra({ smith: SMITH, jones: JONES }), width: 390, height: 844, wait: 1800,
      init: seen('ann', { smith: { s: 'week', v: SMITH.upd, d: SMITH.date }, jones: { s: 'week', v: JONES.upd, d: JONES.date } }) });
    await homeWait(p);
    const g = await geo(p);
    ok(g.card === null && /Smith 60th/.test(g.lineText) && /60 guests/.test(g.lineText), 'seen both: just the line (' + g.lineText + ')');
  });
  await step('per person', async () => {
    p = await L.open(b, '#/', { who: 'sam', extra: extra({ smith: SMITH, jones: JONES }), width: 390, height: 844, wait: 1800,
      init: seen('ann', { smith: { s: 'week', v: SMITH.upd, d: SMITH.date }, jones: { s: 'week', v: JONES.upd, d: JONES.date } }) });
    await homeWait(p);
    ok(/Smith 60th/.test((await geo(p)).cardText), 'Ann saw them on this phone; Sam still gets his own card');
  });

  // 4. the day before: everyone sees Function tomorrow once more, even after Got it
  await step('function tomorrow', async () => {
    const tom = fn('Smith 60th', 1, { start: '18:00', rounds: ['18:30'], guests: 60, notes: '1 nut allergy' });
    p = await L.open(b, '#/', { who: 'ann', extra: extra({ smith: tom }), width: 390, height: 844, wait: 1800, init: seen('ann', { smith: { s: 'week', v: tom.upd, d: tom.date } }) });
    await homeWait(p);
    const g = await geo(p);
    ok(/FUNCTION TOMORROW/i.test(g.cardText) && /Everyone sees this once, the day before/.test(g.cardText) && /1 nut allergy/.test(g.cardText), 'the day before: Function tomorrow, once more, after a Got it in the week (' + g.cardText.slice(0, 80) + ')');
  });

  // 5. changed since Got it: the card comes back once, marked Changed
  await step('changed', async () => {
    const chg = Object.assign({}, SMITH, { upd: L.NOW - 600000, chg: [{ at: L.NOW - 600000, by: 'bo', what: 'Guests 60 to 70' }], guests: 70 });
    p = await L.open(b, '#/', { who: 'ann', extra: extra({ smith: chg }), width: 390, height: 844, wait: 1800, init: seen('ann', { smith: { s: 'week', v: SMITH.upd, d: SMITH.date } }) });
    await homeWait(p);
    const g = await geo(p);
    ok(/Changed/.test(g.cardText) && /70 guests/.test(g.cardText), 'a booking changed after Got it brings its card back once, marked Changed (' + g.cardText.slice(0, 80) + ')');
  });

  // 6. cancelled: told people get a red card once; the line says Cancelled, Do not prep, to everyone until the day passes
  const OFF = Object.assign({}, SMITH, { status: 'cancelled', canAt: L.NOW - 3600000, canBy: 'bo', upd: L.NOW - 3600000 });
  await step('cancelled, told', async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: extra({ smith: OFF }), width: 390, height: 844, wait: 1800, init: seen('ann', { smith: { s: 'week', v: SMITH.upd, d: SMITH.date } }) });
    await homeWait(p);
    let g = await geo(p);
    ok(/CANCELLED/i.test(g.cardText) && /Do not prep or order for it/.test(g.cardText), 'told before: a cancelled card, once (' + g.cardText.slice(0, 70) + ')');
    await p.clock.fastForward(1000); await p.click('#fn-hm .fn-hu-got'); await L.settle(p, 400); await p.clock.fastForward(10000); await L.settle(p, 300);
    g = await geo(p);
    ok(g.card === null && /CANCELLED/i.test(g.lineText) && /Do not prep/.test(g.lineText), 'after Got it the line still says Cancelled, Do not prep (' + g.lineText + ')');
  });
  await step('cancelled, never told', async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: extra({ smith: OFF }), width: 390, height: 844, wait: 1800 });
    await homeWait(p);
    const g = await geo(p);
    ok(g.card === null && /CANCELLED/i.test(g.lineText) && /Do not prep/.test(g.lineText), 'never told: no red card, the line says Cancelled, Do not prep (' + g.lineText + ')');
  });

  // 7. a busy week: one card for three or more, one Got it for all, the notes as typed
  await step('busy week', async () => {
    const fs = { smith: SMITH, jones: JONES, lee: fn('Lee engagement', 5, { guests: 40, notes: 'Coeliac guest, separate board.' }) };
    p = await L.open(b, '#/', { who: 'ann', extra: extra(fs), width: 390, height: 844, wait: 1800 });
    await homeWait(p);
    let g = await geo(p);
    const rows = await p.$$eval('#fn-hm .fn-wk-r', l => l.length);
    ok(/FUNCTIONS THIS WEEK/i.test(g.cardText) && /3 this week/i.test(g.cardText) && rows === 3, 'three not seen: one card, one row each (' + rows + ')');
    ok(/1 nut allergy/.test(g.cardText) && /Coeliac guest/.test(g.cardText) && !/\bGF\b/.test(g.cardText), 'each row\'s notes as typed, never shortened by rule');
    await p.clock.fastForward(1000); await p.click('#fn-hm .fn-hu-got'); await L.settle(p, 400);
    await p.clock.fastForward(10000); await L.settle(p, 300);
    const m = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.fn.hu.ann') || '{}'));
    g = await geo(p);
    ok(m.smith && m.jones && m.lee && g.card === null && /\+2 more/.test(g.lineText), 'one Got it for all three; the line says +2 more (' + g.lineText + ')');
  });

  // 8. Home stays still while it is open: a booking from another phone adds no card; the next open shows it
  await step('open only', async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: extra({}), width: 390, height: 844, wait: 1800 });
    await L.settle(p, 800);
    const a = await geo(p);
    ok(a.hm === null, 'no function this week: nothing under Your day');
    await p.evaluate(([k, v]) => window.__fake.write(k, v), [key(['functions', 'smith']), SMITH]); await L.settle(p, 900);
    const g = await geo(p);
    ok(g.hm === null && g.with === a.with, 'a booking while Home is open: no card inserts itself, On with you does not move (' + a.with + '/' + g.with + ')');
    await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 700);
    await p.evaluate(() => { location.hash = '#/'; }); await homeWait(p);
    ok(/Smith 60th/.test((await geo(p)).cardText), 'the next open of Home shows its card');
  });

  // 9. large text: after Got it, the next card's Got it is never left under the tab bar
  await step('large text', async () => {
    p = await L.open(b, '#/', { who: 'ann', extra: extra({ smith: SMITH, jones: JONES }), width: 390, height: 844, wait: 1800, settings: { text: 'xlarge' } });
    await homeWait(p);
    await p.clock.fastForward(1000); await p.click('#fn-hm .fn-hu-got'); await L.settle(p, 500);
    const r = await p.evaluate(() => { const g = document.querySelector('#fn-hm .fn-hu-got'), t = document.querySelector('.tabbar'); return g && t ? [Math.round(g.getBoundingClientRect().bottom), Math.round(t.getBoundingClientRect().top)] : null; });
    ok(r && r[0] <= r[1], 'the next card\'s Got it sits above the tab bar (' + JSON.stringify(r) + ')');
  });

  // 10. wider screens, roles and booby-trapped words
  for (const [width, height] of [[768, 1024], [1280, 900]]) {
    await step('width ' + width, async () => {
      p = await L.open(b, '#/', { who: 'ann', extra: extra({ smith: SMITH, jones: JONES }), width, height, wait: 1800 });
      await homeWait(p);
      const g = await geo(p);
      ok(g.card !== null && g.card < height && !(await L.overflow(p)), width + ': the card on the first screen, no sideways scroll (' + g.card + ')');
    });
  }
  await step('signed out', async () => {
    p = await L.open(b, '#/', { noPin: true, extra: extra({ smith: SMITH }), width: 390, height: 844, wait: 1500 });
    await L.settle(p, 800);
    ok(!(await p.$('#fn-hm')) && !/Smith 60th/.test(await p.evaluate(() => document.body.innerText)), 'signed out: no card, no function names');
  });
  await step('safe text', async () => {
    const bad = fn('<img src=x onerror=window.__pwn=1>Bad do', 3, { notes: '<b>bold</b> & "quoted"' });
    p = await L.open(b, '#/', { who: 'ann', extra: extra({ bad }), width: 390, height: 844, wait: 1800 });
    await homeWait(p);
    ok(await p.evaluate(() => !window.__pwn && !document.querySelector('#fn-hm img, #fn-hm b:not(.fn-ahead-n):not(.fn-hu-also b)') && /<img src=x/.test(document.getElementById('fn-hm').innerText) && /<b>bold<\/b>/.test(document.getElementById('fn-hm').innerText)), 'a name and notes with markup show as words, add no markup');
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
