// A round time set by hand on the function form stays when the first round, Rounds or the gap changes (18 Nov 2026,
// C in docs/fn-time-picker-options/brief.md). Before, retime() put every round back on the gap with no word, so a
// staggered round typed as 19:15 went out at 19:30 after the gap changed. The line under the gap says which rounds are
// kept, and Work the times out again moves them only after a second tap. The marker is worked out again from the saved
// rounds, so it holds after Save and reopen.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const day2 = M.addDays(L.ymd(new Date(L.NOW)), 2);
const at = hm => M.kat(day2, M.hmMin(hm));
const PEOPLE = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'fay', name: 'Fay', role: 'fnc', add: false, tick: false, del: false, fn: true, active: true }
];
const CFG = { people: PEOPLE, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'fay'], fnIds: ['fay'], showBadges: true };
const base = {
  [fsKey(['config', 'main'])]: CFG,
  [fsKey(['staffpins', 'fay'])]: { hash: L.sha('lk:fay:5151') }, [fsKey(['pinset', 'fay'])]: { at: 1 },
  [fsKey(['drinks', 'fay'])]: { kind: 'flat', at: 1, by: 'fay' }
};
// a staggered function the way the book saves it: 18:00, 18:30 and 19:00, one pizza platter a round
const hand = M.derive({ v: 1, status: 'confirmed', name: 'Hand do', date: day2, start: at('18:00'), st: false, loc: 'Beer garden', guests: 40, gu: false,
  mode: 'stag', notes: '', kc: '', kcBy: '', kcAt: 0, rounds: ['18:00', '18:30', '19:00'].map(t => ({ at: at(t), note: '' })),
  lines: [{ rid: 'pizza-platter', name: 'Pizza Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 3, u: M.toU([1, 1, 1]) }],
  was: {}, chg: [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: 'fay', upd: L.NOW - 3600000 });
const setV = async (p, sel, v) => { await p.fill(sel, v); await p.$eval(sel, e => e.dispatchEvent(new Event('change', { bubbles: true }))); await L.settle(p, 80); };
const times = p => p.$$eval('[data-ff^="rt"]', els => els.map(e => e.value).join(', '));
const line = async p => (await txt(p, '.fe-hand')) || '';

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/functions/hand', { who: 'fay', extra: Object.assign({}, base, { [fsKey(['functions', 'hand'])]: hand }), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-ff="rt2"]'));
  ok(!(await p.$('.fe-hand')), 'rounds on the gap: no set-by-hand line');

  // 1. round 3 typed as 19:15: the line names it, and one more round keeps it
  await setV(p, '[data-ff="rt2"]', '19:15');
  ok(/Round 3 set by hand \(19:15\)/.test(await line(p)), 'round 3 typed by hand: the line names it (' + await line(p) + ')');
  await setV(p, '[data-ff="n"]', '4');
  ok(await times(p) === '18:00, 18:30, 19:15, 19:30', 'one more round: round 3 stays at 19:15, round 4 follows the gap (' + await times(p) + ')');
  await setV(p, '[data-ff="n"]', '3');
  ok(await times(p) === '18:00, 18:30, 19:15', 'back to 3 rounds: round 3 still 19:15 (' + await times(p) + ')');
  await tap(p, '[data-fe="save"]');
  await L.waitFor(p, () => /Version 2/.test((document.getElementById('fe-root') || {}).textContent || ''), null, 6000).catch(() => {});
  const s = await store(p);
  ok(s[fsKey(['functions', 'hand'])].rounds[2].at === at('19:15') && !('h' in s[fsKey(['functions', 'hand'])].rounds[2]), 'saved: round 3 at 19:15, and no marker in the saved round');
  ok(p.errors.length === 0, 'typing and saving: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. opened again: the marker is worked out from the saved rounds, and it is not a change to save
  p = await L.open(b, '#/functions/hand', { who: 'fay', extra: s, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-ff="rt2"]'));
  ok(/Round 3 set by hand \(19:15\)/.test(await line(p)), 'reopened: round 3 still shows as set by hand (' + await line(p) + ')');
  ok(await p.$eval('[data-fe="save"]', e => e.disabled), 'reopened: nothing to save (the marker is not a change)');

  // 3. the gap changes: round 2 follows it, round 3 is not moved without a yes
  await setV(p, '[data-ff="gap"]', '45');
  ok(await times(p) === '18:00, 18:45, 19:15', 'gap 45: round 2 moves, round 3 stays at 19:15 (' + await times(p) + ')');
  ok(/Round 3 set by hand \(19:15\)\. Changing the first round, Rounds or the gap keeps it/.test(await line(p)), 'gap 45: the line says round 3 was kept (' + await line(p) + ')');

  // 4. the first round moves later than round 3: the form names the order problem, never confirms it
  await setV(p, '[data-ff="foodT"]', '18:45');
  ok(await times(p) === '18:45, 19:30, 19:15', 'first round 18:45: round 3 kept at 19:15 (' + await times(p) + ')');
  await tap(p, '[data-fe="save"]'); await L.settle(p, 300);
  ok(/Round 3 must be after round 2/.test((await txt(p, '.fe-probs')) || '') && (await store(p))[fsKey(['functions', 'hand'])].v === 2,
    'a kept round before the one ahead of it is named, and the confirmed function is not saved (' + ((await txt(p, '.fe-probs')) || 'no problems shown') + ')');
  await setV(p, '[data-ff="foodT"]', '18:00');

  // 5. Work the times out again: the first tap only asks, the second moves round 3 onto the gap and says so
  await tap(p, '[data-fe="regrid"]'); await L.settle(p, 100);
  ok(await times(p) === '18:00, 18:45, 19:15' && /Tap again: round 3 goes to 19:30/.test(await line(p)), 'first tap asks, nothing moves (' + await line(p) + ')');
  await tap(p, '[data-fe="regrid"]'); await L.settle(p, 150);
  ok(await times(p) === '18:00, 18:45, 19:30' && !(await p.$('.fe-hand')), 'second tap: round 3 on the gap at 19:30, the line goes (' + await times(p) + ')');
  ok(/Round 3 back on the gap: 19:30/.test((await txt(p, '.fe-toasts')) || ''), 'the slip says what moved');
  await setV(p, '[data-ff="gap"]', '30');
  ok(await times(p) === '18:00, 18:30, 19:00', 'with no round set by hand the gap moves every round, as before (' + await times(p) + ')');
  ok(p.errors.length === 0, 'reopened: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
