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
  // (17 Nov 2026) each cell says the person's whole roster day, so a split reads with its gap in each column it works
  ok(all.filter(x => /^Bea 10:00 to 14:00, 17:00 to 21:00$/.test(x)).length >= 2, 'On today, the whole day: a split roster shows both parts, with the gap, in each column (' + all.join(' | ') + ')');
  ok(all.filter(x => /^Ann 10:00 to 21:30$/.test(x)).length === 2 && !all.some(x => / from /.test(x)), 'On today, the whole day: a double on both columns needs no "from" note, both are on the board (' + all.join(' | ') + ')');
  ok(c.includes('Cal') && c.filter(x => /^(Dev|Eli|Fen)$/.test(x)).length === 3, 'On today: no hours for an older plan or for broken values (dropped, never shown as text)');
  const day = (await txt(p, '#hm-day') || '').replace(/\s+/g, ' ');
  ok(/Lunch · 10:00 to 21:30/.test(day), 'Your day: Ann\'s own roster hours in place of the service\'s (' + day.slice(0, 120) + ')');
  ok(!(await p.content()).includes('<b>9</b>') && !p.errors.length, 'Home: a broken time is never drawn and no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // a chef: the rows on one clock (each person's sentence of hours and breaks) and the saved overview
  p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), wait: 1500 });
  await L.waitFor(p, () => document.querySelectorAll('.tm-tlrow').length >= 6, null, 9000);
  // (17 Nov 2026) the roster hours are the label under the name; a row's words are the label, then the sentence
  const said = id => p.$eval('.tm-tlrow[data-id="' + id + '"]', r => { const t = r.querySelector('.tm-rostered'), s = r.querySelector('.tm-roster-time'); return (t ? t.textContent.replace(/\s+/g, ' ').trim() + ' · ' : '') + (s ? s.textContent : ''); });
  ok(/^Rostered hours: 10:00 to 21:30 · No break yet$/.test(await said('ann')) && /^Rostered hours: 10:00 to 14:00 and 17:00 to 21:00 · No break yet$/.test(await said('bea')), 'rows: each person\'s saved roster hours, a split in order (' + await said('ann') + ' | ' + await said('bea') + ')');
  const plain = await Promise.all(['cal', 'dev', 'eli', 'fen'].map(said));
  ok(plain.every(x => /^Lunch hours 10:00 to 15:00 · No break yet$/.test(x)), 'rows: no roster hours without valid saved hours; the service\'s own hours say so (' + plain.join(' | ') + ')');
  // the roster hours as a label under the name (head chef, 17 Nov 2026: "a colour coded line or label with Rostered
  // hours"): its own words, one line per part of the day, in the people colour; a service's own hours get no label
  const tag = id => p.$$eval('.tm-tlrow[data-id="' + id + '"] .tm-grid-who > .tm-rostered', l => l.map(e => [e.querySelector('.tm-rostered-k').textContent.replace(/\s+/g, ' ').trim(), ...[...e.querySelectorAll('.tm-hrs')].map(b => b.lastChild.textContent.trim())]));
  const annT = await tag('ann'), beaT = await tag('bea'), plainT = await Promise.all(['cal', 'dev', 'eli', 'fen'].map(tag));
  ok(JSON.stringify(annT) === '[["Rostered hours:","10:00 to 21:30"]]' && JSON.stringify(beaT) === '[["Rostered hours:","10:00 to 14:00","17:00 to 21:00"]]' && plainT.every(l => !l.length), 'rows: the label under the name says Rostered hours and each part of the day; no label for a service\'s own hours (' + JSON.stringify([annT, beaT, plainT]) + ')');
  const look = await p.$eval('.tm-tlrow[data-id="ann"] .tm-rostered', e => { const c = x => { const i = document.createElement('i'); i.style.color = x; document.body.appendChild(i); const v = getComputedStyle(i).color; i.remove(); return v; }, s = getComputedStyle(e), h = getComputedStyle(e.querySelector('.tm-hrs')), r = e.getBoundingClientRect(), name = e.parentNode.querySelector('.tm-person-name').getBoundingClientRect();
    const lum = v => { const [r, g, b] = v.match(/\d+/g).map(Number).map(x => x / 255).map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }, a = lum(s.backgroundColor), t = lum(s.color);
    return { bg: s.backgroundColor === c('var(--surface-people-edge)'), ink: s.color === c('var(--ink)'), w: +h.fontWeight, ws: h.whiteSpace, contrast: Math.round((Math.max(a, t) + 0.05) / (Math.min(a, t) + 0.05) * 10) / 10, under: r.top >= name.bottom - 2 }; });
  ok(look.bg && look.ink && look.w >= 700 && look.ws === 'nowrap' && look.contrast >= 4.5 && look.under, 'rows: the label is the people colour with ink text (contrast ' + look.contrast + ':1), the times bold on one line, under the name (' + JSON.stringify(look) + ')');
  const glance = (await p.$$eval('.tm-tlr', l => l.map(e => e.textContent.replace(/\s+/g, ' ').trim()))).find(x => /^Ann/.test(x)) || '';
  ok(/Lunch, roster 10:00 to 21:30/.test(glance), 'saved overview: Ann\'s line says his roster hours (' + glance + ')');
  // Whole day review is gone: each row is the whole day, the hours in its sentence and the section on each service line
  ok(await p.locator('select[data-k="tm-sec:ann:lunch"]').inputValue() === 'grill' && await p.locator('select[data-k="tm-sec:cal:lunch"]').inputValue() === 'pans' && !await p.locator('[data-p="tm-whole"], .tm-dayperson').count(), 'rows: the section beside the hours, roster hours where saved, the service hours where not');
  // a Save keeps the hours; taking off a service takes its hours, and Undo puts them back
  await L.pick(p, 'select[data-k="tm-sec:ann:dinner"]', 'larder');
  const off = '[data-p="tm-off"][data-id="bea"][data-sh="dinner"]';
  await p.locator(off).click(); await L.settle(p, 150); await p.locator(off).click(); await L.settle(p, 150);
  ok(/^Rostered hours: 10:00 to 14:00 · No break yet$/.test(await said('bea')), 'Take off: Bea\'s Dinner hours go with the service (' + await said('bea') + ')');
  await p.locator('.tm-tlrow[data-id="bea"] [data-p="tm-off-undo"]').click(); await L.settle(p, 150);
  ok(/^Rostered hours: 10:00 to 14:00 and 17:00 to 21:00 · /.test(await said('bea')) && await p.locator('select[data-k="tm-sec:bea:dinner"]').inputValue() === 'larder', 'Undo: Bea is back on Dinner with her section and roster hours (' + await said('bea') + ')');
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
