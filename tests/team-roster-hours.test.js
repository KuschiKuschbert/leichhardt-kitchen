// Roster hours saved with the day's plan (head chef, 15 Nov 2026: "everyone on the day sees who's coming in when";
// docs/team-sections-options/brief.md, Roster hours). Each entry of team/<day>.on may carry the person's own start and
// finish for that shift (from, to in minutes). Everyone on the day sees them: Home's On today board and Your day, and
// the chefs' Today's team (each row's sentence, since 16 Nov 2026 in place of Whole day review) and saved overview. Old or broken values are dropped. Copy last weekday
// never copies last week's hours. Made-up people and the stand-in only.
const L = require('./lib');
const { R, ok, txt } = Object.assign(L.results(), { txt: L.txt });
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), tomorrow = L.ymd(new Date(L.NOW + 86400000)), lastWeek = L.ymd(new Date(L.NOW - 6 * 86400000));
const CFG = key('config', 'main'), TEAM = key('team', today);
const people = [{ id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ann', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))];
const shifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260 }];
const secs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'larder', name: 'Larder' }];
const on = [
  { id: 'ann', sh: 'lunch', sec: 'grill', from: 600, to: 1290 }, { id: 'ann', sh: 'dinner', sec: 'pans', from: 600, to: 1290 },   // a double, one roster shift
  { id: 'bea', sh: 'lunch', sec: 'larder', from: 600, to: 840 }, { id: 'bea', sh: 'dinner', sec: 'larder', from: 1020, to: 1260 }, // a split: two roster shifts
  { id: 'cal', sh: 'lunch', sec: 'pans' },                                                                                     // an older plan: no hours
  { id: 'dev', sh: 'lunch', sec: 'pans', from: '<b>9</b>', to: 900 }, { id: 'eli', sh: 'lunch', sec: 'pans', from: 900, to: 600 }, { id: 'fen', sh: 'lunch', sec: 'pans', from: 600.5, to: 900 }];
const plan = (day, list) => ({ day, on: list, br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' });
const fixture = () => ({
  [CFG]: { people, sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: shifts, kitSecs: secs },
  [TEAM]: plan(today, on),
  // the same weekday as tomorrow, last week: Copy last weekday must not bring these hours
  [key('team', lastWeek)]: plan(lastWeek, [{ id: 'ann', sh: 'lunch', sec: 'grill', from: 660, to: 900 }])
});
const cells = p => p.$$eval('#hm-with-body .hm-tp', l => l.map(e => e.textContent.replace(/\s+/g, ' ').trim()));

(async () => {
  const b = await L.start();
  // a cook on the day: the On today board and Your day
  let p = await L.open(b, '#/', { who: 'ann', extra: fixture(), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('#hm-with-body .hm-tp'), null, 8000).catch(() => {});
  // the card leaves out the viewer and shows their shift; the whole day is in the card's fold (all .hm-tp in #hm-with)
  const c = await cells(p), all = await p.$$eval('#hm-with .hm-tp', l => l.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  ok(c.some(x => /^Bea 10:00 to 14:00/.test(x)), 'On today: everyone on the day sees when a coworker comes in and goes (' + c.join(' | ') + ')');
  ok(all.some(x => /^Bea 17:00 to 21:00/.test(x)), 'On today, the whole day: a split roster shows each part under its own service (' + all.join(' | ') + ')');
  ok(c.includes('Cal') && c.filter(x => /^(Dev|Eli|Fen)$/.test(x)).length === 3, 'On today: no hours for an older plan or for broken values (dropped, never shown as text)');
  const day = (await txt(p, '#hm-day') || '').replace(/\s+/g, ' ');
  ok(/Lunch · 10:00 to 21:30/.test(day), 'Your day: Ann\'s own roster hours in place of the service\'s (' + day.slice(0, 120) + ')');
  ok(!(await p.content()).includes('<b>9</b>') && !p.errors.length, 'Home: a broken time is never drawn and no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // a chef: the rows on one clock (each person's sentence of hours and breaks) and the saved overview
  p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('.tm-tlrow').length >= 6, null, 9000);
  const said = id => txt(p, '.tm-tlrow[data-id="' + id + '"] .tm-roster-time').then(x => x || '');
  ok(/^Roster 10:00 to 21:30 · No break yet$/.test(await said('ann')) && /^Roster: Lunch 10:00 to 14:00, Dinner 17:00 to 21:00 · No break yet$/.test(await said('bea')), 'rows: each person\'s saved roster hours, a split in order with its services (' + await said('ann') + ' | ' + await said('bea') + ')');
  const plain = await Promise.all(['cal', 'dev', 'eli', 'fen'].map(said));
  ok(plain.every(x => /^Lunch hours 10:00 to 15:00 · No break yet$/.test(x)), 'rows: no roster hours without valid saved hours; the service\'s own hours say so (' + plain.join(' | ') + ')');
  // the roster times in bold ink, found at a glance while placing sections (head chef, 17 Nov 2026); the words above
  // are unchanged, and a service's own hours (no roster) stay quiet
  const bold = id => p.$$eval('.tm-tlrow[data-id="' + id + '"] .tm-roster-time .tm-hrs', l => l.map(e => e.textContent));
  const annB = await bold('ann'), beaB = await bold('bea'), plainB = await Promise.all(['cal', 'dev', 'eli', 'fen'].map(bold));
  ok(JSON.stringify(annB) === '["10:00 to 21:30"]' && JSON.stringify(beaB) === '["10:00 to 14:00","17:00 to 21:00"]' && plainB.every(l => !l.length), 'rows: each roster time is marked on its own, a split in two parts; a service\'s own hours are not (' + JSON.stringify([annB, beaB, plainB]) + ')');
  const look = await p.$eval('.tm-tlrow[data-id="ann"] .tm-roster-time', e => { const s = getComputedStyle(e), t = getComputedStyle(e.querySelector('.tm-hrs')), i = document.createElement('i'); i.style.color = 'var(--ink)'; document.body.appendChild(i); const ink = getComputedStyle(i).color; i.remove(); return { w: +t.fontWeight, c: t.color, sc: s.color, ws: t.whiteSpace, ink }; });
  ok(look.w >= 700 && look.c !== look.sc && look.c === look.ink && look.ws === 'nowrap', 'rows: the roster time is bold ink on one line, the rest of the sentence stays quiet (' + JSON.stringify(look) + ')');
  const glance = (await p.$$eval('.tm-tlr', l => l.map(e => e.textContent.replace(/\s+/g, ' ').trim()))).find(x => /^Ann/.test(x)) || '';
  ok(/Lunch, roster 10:00 to 21:30/.test(glance), 'saved overview: Ann\'s line says his roster hours (' + glance + ')');
  // Whole day review is gone: each row is the whole day, the hours in its sentence and the section on each service line
  ok(await p.locator('select[data-k="tm-sec:ann:lunch"]').inputValue() === 'grill' && await p.locator('select[data-k="tm-sec:cal:lunch"]').inputValue() === 'pans' && !await p.locator('[data-p="tm-whole"], .tm-dayperson').count(), 'rows: the section beside the hours, roster hours where saved, the service hours where not');
  // a Save keeps the hours; taking off a service takes its hours, and Undo puts them back
  await L.pick(p, 'select[data-k="tm-sec:ann:dinner"]', 'larder');
  const off = '[data-p="tm-off"][data-id="bea"][data-sh="dinner"]';
  await p.locator(off).click(); await L.settle(p, 150); await p.locator(off).click(); await L.settle(p, 150);
  ok(/^Roster 10:00 to 14:00 · No break yet$/.test(await said('bea')), 'Take off: Bea\'s Dinner hours go with the service (' + await said('bea') + ')');
  await p.locator('.tm-tlrow[data-id="bea"] [data-p="tm-off-undo"]').click(); await L.settle(p, 150);
  ok(/^Roster: Lunch 10:00 to 14:00, Dinner 17:00 to 21:00/.test(await said('bea')) && await p.locator('select[data-k="tm-sec:bea:dinner"]').inputValue() === 'larder', 'Undo: Bea is back on Dinner with her section and roster hours (' + await said('bea') + ')');
  await p.locator(off).click(); await L.settle(p, 150); await p.locator(off).click(); await L.settle(p, 150);
  await p.locator('[data-p="tm-save"]').click();
  await L.waitFor(p, k => (__fake.dump()[k] || {}).v === 2, TEAM, 8000);
  const saved = await p.evaluate(k => __fake.dump()[k].on, TEAM);
  ok(saved.filter(o => o.id === 'ann').every(o => o.from === 600 && o.to === 1290) && saved.some(o => o.id === 'ann' && o.sh === 'dinner' && o.sec === 'larder'), 'Save: a section change keeps the roster hours');
  ok(!saved.some(o => o.id === 'bea' && o.sh === 'dinner') && saved.some(o => o.id === 'bea' && o.sh === 'lunch' && o.from === 600 && o.to === 840), 'Save: removing Bea\'s Dinner removes its hours and keeps her Lunch hours');
  ok(!saved.some(o => ['cal', 'dev', 'eli', 'fen'].includes(o.id) && (o.from != null || o.to != null)), 'Save: broken or missing hours are not written back');
  // Copy last weekday brings sections, never last week's hours
  await L.teamDay(p, tomorrow); await L.waitFor(p, () => !!document.querySelector('[data-p="tm-use"]'), null, 8000);
  if (!await p.locator('[data-p="tm-use"]').isVisible()) { await p.locator('[data-p="tm-batch-toggle"]').click(); await L.settle(p, 150); }
  await p.locator('[data-p="tm-use"]').click();
  await L.waitFor(p, () => !!document.querySelector('.tm-tlrow[data-id="ann"]'), null, 8000);
  // every row has its sentence now: Ann's says Lunch's own hours, never last week's roster 11:00 to 15:00
  ok(/^Lunch hours 10:00 to 15:00 · No break yet$/.test(await said('ann')) && !(await p.$$eval('.tm-roster-time', l => l.map(e => e.textContent))).some(x => /Roster|11:00/.test(x)), 'Copy last weekday: last week\'s roster hours are not copied (' + await said('ann') + ')');
  ok(!p.errors.length, 'chef: no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
