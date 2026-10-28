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
  // the tick list on the order list says the same, above its rows (review of 28 Oct 2026: no check reached it)
  await go(p, '#/orders');
  t = await p.evaluate(() => { const l = document.querySelector('.cut-tl'), n = l && l.previousElementSibling; return n && n.classList.contains('cut-note') ? n.textContent : ''; });
  ok(/No signal\. Orders ticked on other phones show when the phone is back online\./.test(t), 'cut-offs after midnight with no signal: the tick list on the order list says so too (' + t + ')');
  await go(p, '#/');
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

  // 7. A past day lost to a bad signal (loadPast(), review of 28 Oct 2026): the 13 days that came in stay in memory,
  // and once the signal is back only the missing day is read again. A first fix read all 14 again every 5 minutes.
  p = await L.open(b, '#/prep', { who: 'sam', extra: pastX, failReads: '/days/' + day(2) + '/items$', width: 1280, height: 900, wait: 1800 });
  ok(await p.evaluate(() => !window.LK_PREP.state.pastFor && !localStorage.getItem('lk.past')), 'a past day unreadable: not taken as read, nothing kept');
  const m0 = await reads(p, pastRe), d0 = await reads(p, new RegExp('/days/' + day(2) + '/items$'));
  await p.evaluate(() => { window.__fake.failReads = null; window.dispatchEvent(new Event('online')); });
  ok(await until(p, () => !!localStorage.getItem('lk.past')), 'a past day unreadable, signal back: read again by itself and kept');
  ok(await reads(p, pastRe) - m0 === 1 && await reads(p, new RegExp('/days/' + day(2) + '/items$')) - d0 === 1, 'a past day unreadable, signal back: only that day is read again (' + (await reads(p, pastRe) - m0) + ' past-day reads)');
  ok(await p.evaluate(d => (window.LK_PREP.state.past[d] || []).length === 5, day(2)), 'a past day unreadable, signal back: its 5 lines are in');
  ok(p.errors.length === 0, 'a past day unreadable: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 8. A handover after a failed read (review of 28 Oct 2026). Sam opens the prep list with no signal for the past days,
  // signs out, the signal comes back and Ann signs in: her past days are read for her at once. They waited 5 minutes
  // or more behind Sam's failed read, with no Pace or usual amounts, and her rollover read 7 days instead of 1.
  p = await L.open(b, '#/prep', { who: 'sam', extra: pastX, cold: pastRe.source, width: 1280, height: 900, wait: 2500 });
  ok(await p.evaluate(() => !window.LK_PREP.state.pastFor), 'handover: Sam\'s past days could not be read');
  await p.evaluate(() => window.LK_PREP.signOut(true)); await L.settle(p, 500);
  await warm(p); await L.settle(p, 2500);
  await p.click('.p-name[data-id="ann"]'); await L.settle(p, 300); await p.fill('#pf1', '2222'); await L.settle(p, 2000);
  if (await p.evaluate(() => location.hash) !== '#/prep') await go(p, '#/prep');
  ok(await until(p, () => { const s = window.LK_PREP.state; return s.who === 'ann' && s.authed && !!s.pastFor && Object.keys(s.past || {}).length === 14; }), 'handover: Ann signs in and her 14 past days are read at once (' + JSON.stringify(await p.evaluate(() => { const s = window.LK_PREP.state; return { who: s.who, pastFor: !!s.pastFor, n: Object.keys(s.past || {}).length }; })) + ')');
  ok(p.errors.length === 0, 'handover: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 9. The head chef signs out while Team's 30 order days are still being read (review of 28 Oct 2026). The late
  // answers armed their retry for the next person, so the next online event read 30 order days on a phone signed out
  // (all refused) or on a staff phone (Ann). Now the answers for the person before are dropped.
  const ordX = {};
  for (let i = 1; i < 30; i++) ordX[fsKey(['orders', day(i), 'lines', 'o' + i])] = { text: 'Cream ' + i, qty: '2 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - i * 86400000, ordered: false, deleted: false };
  const ordRe = /\/orders\/[^/]+\/lines$/;
  for (const next of ['nobody', 'Ann']) {
    p = await L.open(b, '#/admin', { admin: true, who: '', extra: ordX, width: 1280, height: 900, wait: 2000 });
    await L.waitFor(p, () => { const s = window.LK_PREP.state.stats; return !!s && !s.loading; }, null, 8000).catch(() => {});
    const mid = await p.evaluate(() => {
      const st = () => window.LK_PREP.state, leaf = () => document.querySelector('[data-p="a-tab"][data-t="team"]');
      if (leaf()) leaf().click();
      else for (const g of [...document.querySelectorAll('[data-p="a-group"]')].map(x => x.getAttribute('data-g'))) {
        document.querySelector('[data-p="a-group"][data-g="' + g + '"]').click();
        if (st().atab === 'team') break;
        if (leaf()) { leaf().click(); break; }
      }
      const o = st().ordStats, busy = !!(o && o.loading);
      window.LK_PREP.signOut(true);
      return busy;
    });
    await L.settle(p, 1500);
    if (next === 'Ann') {
      await go(p, '#/prep');
      if (await p.$('.p-name[data-id="ann"]')) { await p.click('.p-name[data-id="ann"]'); await L.settle(p, 600); }
      if (await p.$('#pf1')) await p.type('#pf1', '2222');
      await L.settle(p, 1500);
    }
    const o0 = await reads(p, ordRe);
    await p.evaluate(() => window.dispatchEvent(new Event('online')));
    await L.settle(p, 3000);
    ok(mid && await reads(p, ordRe) === o0, 'Team\'s reads cut short by a sign-out, then ' + next + ' on the phone and an online event: no order days read (' + (await reads(p, ordRe) - o0) + ')');
    ok(p.errors.length === 0, 'Team cut short, ' + next + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 11. The sections people write (watchSections()), started again with no signal for the next person: the copy in
  // memory is empty, which is not "no sections". The ones already known stay for the suggestions and the spell check.
  const secX = { [fsKey(['sections', 'larder'])]: { name: 'Larder', uses: 5 }, [fsKey(['sections', 'pastry'])]: { name: 'Pastry', uses: 3 } };
  p = await L.open(b, '#/prep', { who: 'sam', extra: secX, wait: 1800 });
  ok(await until(p, () => window.LK_PREP.state.sections.length === 2), 'sections: both read with signal');
  await p.evaluate(() => window.LK_PREP.signOut(true)); await L.settle(p, 500);
  await p.evaluate(() => { window.__fake.cold = /\/sections$/; });
  await p.click('.p-name[data-id="ann"]'); await L.settle(p, 300); await p.fill('#pf1', '2222'); await L.settle(p, 2000);
  ok(await p.evaluate(() => window.LK_PREP.state.who === 'ann' && window.LK_PREP.state.sections.length === 2), 'sections started again with no signal: the two known stay (' + await p.evaluate(() => window.LK_PREP.state.sections.length) + ')');
  ok(p.errors.length === 0, 'sections: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 12. A rollover while a far past day (10 days ago) could not be read (review of 28 Oct 2026): the 7 days it needs are
  // in, so yesterday's open line still rolls over now, not after the past days' retry
  const rollX = Object.assign({}, pastX, { [fsKey(['days', day(1), 'items', 'open1'])]: { text: 'Open job yesterday', station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 86400000 - 7200000, done: false, deleted: false } });
  p = await L.open(b, '#/prep', { who: 'sam', extra: rollX, failReads: '/days/' + day(10) + '/items$', width: 1280, height: 900, wait: 2500 });
  ok(await until(p, () => window.LK_PREP.state.items.some(x => x.text === 'Open job yesterday' && x.rolled === 1)) && await p.evaluate(() => !window.LK_PREP.state.pastFor), 'a far past day unreadable: yesterday\'s open line rolls over now');
  ok(p.errors.length === 0, 'rollover with a far day lost: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 10. The same for a read that fails after the sign-out (no signal): who is on today in the admin People tab. The
  // failure came back as no signal, not as cut short, so it armed its retry and Ann's staff phone read the shifts on the
  // next online event. Now any answer after the person changed is cut short (sdk()).
  const ksX = { [fsKey(['config', 'main'])]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, kitSecs: [{ id: 'grill', name: 'Grill', off: false }] } };
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: ksX, width: 1280, height: 900, failReads: '/shifts$', wait: 2000 });
  const sh0 = await reads(p, /\/shifts$/);
  await p.evaluate(() => {
    const st = () => window.LK_PREP.state, leaf = () => document.querySelector('[data-p="a-tab"][data-t="people"]');
    if (leaf()) leaf().click();
    else for (const g of [...document.querySelectorAll('[data-p="a-group"]')].map(x => x.getAttribute('data-g'))) {
      document.querySelector('[data-p="a-group"][data-g="' + g + '"]').click();
      if (st().atab === 'people') break;
      if (leaf()) { leaf().click(); break; }
    }
    window.LK_PREP.signOut(true);
  });
  await L.settle(p, 1000);
  const sh1 = await reads(p, /\/shifts$/);
  await go(p, '#/prep');
  if (await p.$('.p-name[data-id="ann"]')) { await p.click('.p-name[data-id="ann"]'); await L.settle(p, 600); }
  if (await p.$('#pf1')) await p.type('#pf1', '2222');
  await L.settle(p, 1500);
  await p.evaluate(() => { window.__fake.failReads = null; window.dispatchEvent(new Event('online')); });
  await L.settle(p, 3000);
  ok(sh1 === sh0 + 1 && await reads(p, /\/shifts$/) === sh1 && await p.evaluate(() => window.LK_PREP.state.who === 'ann'), 'a read that failed after the sign-out, then Ann on the phone and an online event: nothing read for the person before (' + sh0 + ', ' + sh1 + ', ' + await reads(p, /\/shifts$/) + ' reads)');
  ok(p.errors.length === 0, 'a read that failed after the sign-out: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
