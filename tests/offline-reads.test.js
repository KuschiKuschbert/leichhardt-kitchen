// No signal for a listener started again, or a read made, after the book opened (28 Oct 2026). Since 26 Oct 2026 (#387)
// Firestore keeps only a copy in memory, so with no signal a new listener or a read answers at once from that copy,
// which holds only this page's own unsent writes. That answer means "not loaded yet", never "nothing there" (the lists
// learned it in #400): the supplier order ticks and the rounds sent after midnight, the head chef's Team table, the past
// days behind the prep list's hints, last night's waste review note and today's review on the wastage page. Each one
// keeps what it knew, says so where people look, keeps nothing empty on the phone, and loads by itself once the signal
// is back. The stand-in answers like that with __fake.cold.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), tom = M.addDays(today, 1), day = n => L.ymd(new Date(L.NOW - n * 86400000));
const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
];
const warm = p => p.evaluate(() => { window.__fake.warm(); window.dispatchEvent(new Event('online')); });
const until = (p, fn, arg) => L.waitFor(p, fn, arg, 6000).then(() => true, () => false);
const go = async (p, h) => { await p.evaluate(h => { location.hash = h; }, h); await L.settle(p, 700); };
// a mouse move each minute while the clock runs, so the phone is not signed out for being left alone
const minutes = async (p, n) => { for (let i = 0; i < n; i++) { await p.mouse.move(20 + i, 20 + (i % 3)); await p.clock.runFor(60000); } };
// no sideways scroll at the three widths, then back to the width the page opened at
async function fits(p, what, back) {
  for (const w of [390, 768, 1280]) {
    await p.setViewportSize({ width: w, height: 900 }); await L.settle(p, 250);
    const o = await L.overflow(p);
    ok(!o, what + ': no sideways scroll at ' + w + ' px' + (o ? ' (' + o + ')' : ''));
  }
  await p.setViewportSize({ width: back, height: 900 }); await L.settle(p, 250);
}
const reads = (p, re) => p.evaluate(s => window.__fake.reads.filter(k => new RegExp(s).test(k)).length, re.source);

(async () => {
  const b = await L.start();
  let p, t;

  // 1. The supplier order ticks after midnight with no signal (cutWatch()). The listener starts again for the new kitchen
  // day and the copy in memory is empty. Sam ticked Early Meats for tomorrow's 06:00 cut-off: it must not come back onto
  // the bar with Order done, or a second chef orders it again. The bar says ticks from other phones are not in yet.
  const dow = new Date(L.NOW).getDay();
  const cuts = [{ id: 'early', name: 'Early Meats', dd: [(dow + 2) % 7], at: 6 * 60, pre: 1, lead: 480 }, { id: 'veg', name: 'Veg Co', dd: [(dow + 2) % 7], at: 7 * 60, pre: 1, lead: 480 }];
  const cutX = { [fsKey(['config', 'main'])]: { people, sousIds: ['sam'], pingIds: ['sam'], showBadges: true, cutoffs: cuts },
    [fsKey(['cutdone', tom + '_early'])]: { day: tom, sid: 'early', on: true, at: at(today, '23:00'), by: 'sam' } };
  p = await L.open(b, '#/', { who: 'sam', extra: cutX, clock: at(today, '23:50'), wait: 1800 });
  const band = () => p.evaluate(() => { const e = document.getElementById('cut-band'); return e && !e.hidden ? e.textContent : ''; });
  ok(await until(p, () => { const e = document.getElementById('cut-band'); return !!e && !e.hidden && /Veg Co/.test(e.textContent) && !/Early Meats/.test(e.textContent); }), 'cut-offs before midnight: Early Meats is ticked (off the bar) and Veg Co is on it (' + await band() + ')');
  await p.evaluate(() => { window.__fake.cold = /cutdone/; });
  await minutes(p, 12);
  await L.settle(p, 500);
  t = await band();
  ok(/Veg Co/.test(t) && !/Early Meats/.test(t), 'cut-offs after midnight with no signal: Early Meats, already ordered, is not offered again (' + t.slice(0, 160) + ')');
  ok(/No signal\. Orders ticked on other phones show when the phone is back online\./.test(t), 'cut-offs after midnight with no signal: the bar says ticks from other phones are not in yet');
  await fits(p, 'cut-off bar with the no-signal words', 390);
  await warm(p);
  ok(await until(p, () => { const e = document.getElementById('cut-band'); return !!e && !/No signal/.test(e.textContent) && /Veg Co/.test(e.textContent) && !/Early Meats/.test(e.textContent); }), 'cut-offs, signal back: the note goes and Early Meats stays off (' + await band() + ')');
  ok(p.errors.length === 0, 'cut-offs: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. Rounds sent after midnight with no signal (watchSent() in js/functions.js): the rounds already ticked as sent stay
  // sent, so nobody plates round 1 again
  const fn = M.derive({ v: 1, status: 'confirmed', name: 'Late 40th', date: today, start: at(today, '22:30'), loc: 'Beer garden', guests: 40, mode: 'stag', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at: at(today, '23:00'), note: '' }, { at: at(today, '23:30'), note: '' }, { at: at(tom, '00:20'), note: '' }],
    lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 3, u: M.toU([1, 1, 1]) }],
    was: {}, chg: [], cBy: 'sam', cAt: L.NOW - 86400000, confBy: 'sam', confAt: L.NOW - 86400000, by: 'sam', upd: L.NOW - 3600000 });
  const sent = r => ({ fid: 'late', at: r, day: M.kday(r), sent: true, sentAt: r + 60000, sentBy: 'sam', by: 'sam' });
  const fnX = { [fsKey(['functions', 'late'])]: fn, [fsKey(['fnsent', 'late_' + fn.rounds[0].at])]: sent(fn.rounds[0].at), [fsKey(['fnsent', 'late_' + fn.rounds[1].at])]: sent(fn.rounds[1].at) };
  p = await L.open(b, '#/prep', { who: 'sam', extra: fnX, clock: at(today, '23:45'), wait: 1800 });
  ok(await until(p, () => /Round 3 of 3/.test((document.getElementById('fn-band') || {}).textContent || '')), 'rounds before midnight: the band says Round 3 of 3 is next (' + (await txt(p, '#fn-band') || '').slice(0, 120) + ')');
  await p.evaluate(() => { window.__fake.cold = /fnsent/; });
  await minutes(p, 18);
  await L.settle(p, 500);
  t = await txt(p, '#fn-band') || '';
  ok(/Round 3 of 3/.test(t) && !/Round 1 of 3 not sent yet/.test(t), 'rounds after midnight with no signal: rounds 1 and 2 still show as sent (' + t.slice(0, 160) + ')');
  ok(await p.evaluate(() => Object.keys(window.LK_FN.state().sent).length) >= 2, 'rounds after midnight with no signal: the ticks read before are kept');
  await warm(p);
  ok(await until(p, () => /Round 3 of 3/.test((document.getElementById('fn-band') || {}).textContent || '')), 'rounds, signal back: still Round 3 of 3');
  ok(p.errors.length === 0, 'rounds: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 3. The head chef's Team table first opened with no signal (watchActivity()): nobody shown as never seen
  const actX = { [fsKey(['activity', 'ann'])]: { name: 'Ann', added: 12, ticked: 30, visits: 5, lastSeen: L.NOW - 3600000 } };
  p = await L.open(b, '#/', { admin: true, who: '', extra: actX, width: 1280, height: 900, wait: 2000 });
  await p.evaluate(() => { window.__fake.cold = /\/activity$/; });
  await go(p, '#/admin');
  await L.adminTab(p, 'team'); await L.settle(p, 800);
  const who = () => p.evaluate(() => { const l = [...document.querySelectorAll('.set-block')].find(x => /Who is writing and ticking/.test(x.textContent)); return l ? l.textContent.replace(/\s+/g, ' ') : ''; });
  t = await who();
  ok(/No signal\. This table shows when the phone is back online\./.test(t) && !/never/.test(t), 'team with no signal: says there is no signal, nobody shown as never seen (' + t.slice(0, 200) + ')');
  await fits(p, 'team with the no-signal words', 1280);
  await warm(p);
  ok(await until(p, () => { const l = [...document.querySelectorAll('.set-block')].find(x => /Who is writing and ticking/.test(x.textContent)); return !!l && /Ann/.test(l.textContent) && /12/.test(l.textContent) && !/No signal/.test(l.textContent); }), 'team, signal back: the table shows Ann with her 12 lines');
  ok(p.errors.length === 0, 'team: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 4. The past days behind the prep list's hints read with no signal (loadPast()): not taken as read, nothing kept, no
  // read on every draw, and read again once the signal is back (Pace needs them)
  const pastX = {};
  [1, 2, 3].forEach(n => { const d = day(n); for (let k = 0; k < 5; k++) pastX[fsKey(['days', d, 'items', 'p' + n + k])] = { text: 'Past job ' + n + k, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - n * 86400000 - 7200000, done: true, doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW - n * 86400000 - 3600000 * (k + 1), deleted: false }; });
  p = await L.open(b, '#/', { who: 'sam', extra: pastX, width: 1280, height: 900, wait: 1800 });
  const pastRe = new RegExp('/days/(?!' + today + ')\\d{4}-\\d\\d-\\d\\d/items$');   // the past days, not today
  await p.evaluate(() => { window.__fake.cold = /\/days\/[^/]+\/items$/; });
  await go(p, '#/prep');
  const st = await p.evaluate(() => ({ pastFor: window.LK_PREP.state.pastFor, kept: localStorage.getItem('lk.past') }));
  ok(!st.pastFor && !st.kept, 'past days with no signal: not taken as read, and nothing kept on the phone (' + JSON.stringify({ pastFor: st.pastFor, kept: !!st.kept }) + ')');
  const r0 = await reads(p, pastRe);
  for (const h of ['#/orders', '#/prep', '#/orders', '#/prep']) await go(p, h);
  ok(await reads(p, pastRe) === r0, 'past days with no signal: no read on every draw (' + r0 + ' then ' + await reads(p, pastRe) + ')');
  ok(!(await p.$('.nb-pace')), 'past days with no signal: no Pace card from no past days');
  await warm(p);
  ok(await until(p, () => !!document.querySelector('.nb-pace')), 'past days, signal back: read again by themselves, and Pace shows');
  ok(await p.evaluate(() => !!localStorage.getItem('lk.past')), 'past days, signal back: kept on the phone for the day');
  ok(p.errors.length === 0, 'past days: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 5. Last night's waste review note read with no signal (loadWNote()): never kept as "no note" for the day, and it
  // shows on the prep list once the signal is back, with no reload
  const noteX = { [fsKey(['waste', day(1)])]: { avoidable: 'Rice', change: 'Cook half the rice on Mondays', reviewBy: 'Sam', reviewAt: L.NOW - 80000000 } };
  p = await L.open(b, '#/', { who: 'sam', extra: noteX, width: 1280, height: 900, wait: 1800 });
  await p.evaluate(() => { window.__fake.cold = /\/waste\/\d{4}-\d\d-\d\d$/; });
  await go(p, '#/prep');
  t = await p.evaluate(() => localStorage.getItem('lk.w.note'));
  ok(!t, 'waste review note with no signal: nothing kept on the phone for the day (' + t + ')');
  ok(!/Cook half the rice/.test(await txt(p, '#prep-root') || ''), 'waste review note with no signal: not shown yet');
  await fits(p, 'prep list with no signal', 1280);
  await warm(p);
  ok(await until(p, () => /From yesterday's waste review[\s\S]*Cook half the rice on Mondays/.test((document.querySelector('#prep-root') || {}).textContent || '')), 'waste review note, signal back: it shows on the prep list by itself');
  ok(/Cook half the rice/.test(await p.evaluate(() => localStorage.getItem('lk.w.note')) || ''), 'waste review note, signal back: kept for the day');
  ok(p.errors.length === 0, 'waste review note: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 6. Today's review on the wastage page read with no signal (loadPageReview()): says it could not load instead of
  // Loading... for good, and does not read again on every draw
  p = await L.open(b, '#/waste', { who: 'sam', cold: '/waste/\\d{4}-\\d\\d-\\d\\d$', wait: 1800 });
  const revRe = new RegExp('/waste/' + today + '$');
  ok(await until(p, () => /Could not load today's review\. Check the signal\./.test((document.querySelector('.w-review') || {}).textContent || '')), 'wastage review with no signal: says it could not load (' + (await txt(p, '.w-review') || '') + ')');
  const w0 = await reads(p, revRe);
  for (const u of ['g', 'kg', 'L', 'kg']) { await p.click('[data-p="wunit"][data-v="' + u + '"]'); await L.settle(p, 150); }
  const w1 = await reads(p, revRe);
  ok(w1 === w0 && w0 <= 1, 'wastage review with no signal: no read on every draw (' + w0 + ' then ' + w1 + ')');
  await fits(p, 'wastage with the review note', 390);
  await warm(p);
  ok(await until(p, () => !!document.getElementById('w-ra')), 'wastage review, signal back: the review form shows by itself');
  ok(p.errors.length === 0, 'wastage review: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
