// The day grid in Today's team (head chef, 15 Nov 2026, docs/team-sections-options/brief.md, the chosen mix): one
// section picker per person and service, the usual section and "Same as Lunch" offered first and never applied by
// themselves, plain counts in the service heads (no green before Save, chefs not counted), heads that stay in view
// under the admin panel's room tabs on a phone, and three services on a phone. Made-up people and the stand-in only.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), TEAM = key('team', today), CFG = key('config', 'main');
const people = [
  { id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true },
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true })),
  { id: 'mjk', name: 'Mary Jo Kahale-Whitford', role: 'staff', active: true, add: true, tick: true }
];
const two = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260 }];
const three = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'adl', name: 'All day dining', from: 900, to: 1020 }, { id: 'dinner', name: 'Dinner', from: 1020, to: 1320 }];
const sections = ['Grill', 'Pans', 'Larder', 'Fryer'].map(n => ({ id: n.toLowerCase(), name: n }));
const dow = new Date(L.NOW).getDay(), weekday = new Date(L.NOW).toLocaleDateString('en-AU', { weekday: 'long', timeZone: 'Australia/Brisbane' });
const fixture = (shifts, extra) => {
  const on = [];
  ['sam', 'ari', 'bea', 'cal', 'dev', 'eli', 'mjk'].forEach(id => shifts.forEach(s => on.push({ id, sh: s.id, sec: id === 'ari' && s.id === 'lunch' ? 'grill' : '' })));
  on.push({ id: 'fen', sh: 'dinner', sec: '' });
  return Object.assign({
    [CFG]: { people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: shifts, kitSecs: sections },
    [TEAM]: { day: today, on, br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' }
  }, extra || {});
};
const usual = { [key('teamsum', 'main')]: { day: today, days: [], usual: { [dow + '|dinner']: { bea: ['larder', 6, 8], ari: ['pans', 5, 8] } }, learn: {} } };
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-grid-row').length >= 8, null, 9000);
const options = (p, k) => p.$eval('select[data-k="' + k + '"]', e => [...e.options].map(o => o.textContent));
const value = (p, k) => p.locator('select[data-k="' + k + '"]').inputValue();
const dump = p => p.evaluate(k => __fake.dump()[k], TEAM);

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/team', { who: 'sam', extra: fixture(two, usual), wait: 1500 }); await ready(p);
  const original = await dump(p);
  // the usual section first, then the person's section on the service before; neither is applied by itself
  ok(await value(p, 'tm-sec:ari:dinner') === '' && JSON.stringify((await options(p, 'tm-sec:ari:dinner')).slice(0, 3)) === JSON.stringify(['Usually Pans, 5 of the last 8 ' + weekday + 's', 'Same as Lunch: Grill', 'No section']), 'suggestions: Ari\'s Dinner offers his usual Pans, then Same as Lunch: Grill, and stays on No section (' + (await options(p, 'tm-sec:ari:dinner')).slice(0, 3).join(' | ') + ')');
  await L.pick(p, 'select[data-k="tm-sec:ari:dinner"]', { label: 'Same as Lunch: Grill' });
  ok(await value(p, 'tm-sec:ari:dinner') === 'grill' && await value(p, 'tm-sec:ari:lunch') === 'grill' && !(await options(p, 'tm-sec:ari:dinner')).some(o => /^Same as/.test(o)), 'Same as Lunch: chosen, it sets only Ari\'s Dinner, and is no longer offered once Dinner matches');
  ok(await value(p, 'tm-sec:bea:dinner') === '' && (await options(p, 'tm-sec:bea:dinner'))[0] === 'Usually Larder, 6 of the last 8 ' + weekday + 's', 'usual: Bea\'s usual Larder is offered first, not filled in');
  await L.pick(p, 'select[data-k="tm-sec:bea:lunch"]', 'pans');
  ok(await value(p, 'tm-sec:bea:dinner') === '', 'no automatic fill: choosing Bea\'s Lunch leaves her Dinner on No section');
  ok(JSON.stringify(await dump(p)) === JSON.stringify(original), 'draft only: suggestions and choices write nothing before Save');
  // the heads: plain words, chefs not counted, never green before Save
  const heads = await p.$$eval('.tm-grid-head .tm-grid-sh', l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
  ok(/^Lunch 10:00 to 15:00 4 no section$/.test(heads[0]) && /^Dinner 15:00 to 21:00 6 no section$/.test(heads[1]), 'heads: each service with its hours and how many still have no section, the sous chef not counted (' + heads.join(' | ') + ')');
  const colours = await p.evaluate(() => { const probe = document.createElement('i'); document.body.appendChild(probe); probe.style.color = 'var(--done-ink)'; const done = getComputedStyle(probe).color; probe.style.color = 'var(--done)'; const done2 = getComputedStyle(probe).color; probe.remove();
    return [...document.querySelectorAll('.tm-grid *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && [done, done2].includes(getComputedStyle(e).color)).map(e => e.textContent.trim()); });
  ok(!colours.length, 'colour: nothing in the draft grid is green before Save (' + colours.join(' | ') + ')');
  ok(await p.$eval('select[data-k="tm-sec:sam:lunch"]', e => e.options[e.selectedIndex].textContent) === 'Sous chef' && await p.$eval('select[data-k="tm-sec:sam:lunch"]', e => getComputedStyle(e.closest('.tm-pick').querySelector('.ux-picker-trigger')).borderStyle) === 'dashed', 'chef row: Sam\'s unset cell reads Sous chef with the dashed not-set edge');
  ok(await p.locator('.tm-person-row[data-id="fen"] .tm-grid-off').count() === 1 && !await p.locator('select[data-k="tm-sec:fen:lunch"]').count(), 'Off: Fen, on Dinner only, shows Off under Lunch');
  // Save names who still has no section, chefs left out
  await p.locator('[data-p="tm-save"]').click();
  await L.waitFor(p, k => (__fake.dump()[k] || {}).v === 2 && /saved at/.test(document.querySelector('.tm-save').textContent), TEAM, 7000);
  const said = (await p.locator('.tm-save').innerText()).replace(/\s+/g, ' ');
  ok(!/Ari/.test(said.split('Still no section')[1] || '') && /Still no section: Bea Dinner, Cal Lunch, Cal Dinner, Dev Lunch, Dev Dinner, Eli Lunch and 4 more\./.test(said) && !/Sam/.test(said.split('Still no section')[1] || ''), 'Save words: the services still without a section are named, six then a count, chefs left out (' + said + ')');
  for (const w of [390, 768, 1280]) { await p.setViewportSize({ width: w, height: 844 }); await L.settle(p, 200); ok(!(await L.overflow(p)), 'two services ' + w + ' px: no sideways scroll'); }
  // a long name wraps between words, never inside one
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => document.documentElement.setAttribute('data-text', 'xlarge')); await L.settle(p, 200);
  const longName = await p.$eval('.tm-person-row[data-id="mjk"] .tm-person-name', e => { const r = document.createRange(), words = e.textContent.split(/\s+/).flatMap(w => w.split(/(?<=-)/)); let at = 0; const lines = []; for (const w of words) { const i = e.textContent.indexOf(w, at); r.setStart(e.firstChild, i); r.setEnd(e.firstChild, i + w.length); lines.push(r.getClientRects().length); at = i + w.length; } return { split: lines.filter(n => n > 1).length, over: e.scrollWidth > e.clientWidth + 1 }; });
  ok(!longName.split && !longName.over && !(await L.overflow(p)), 'long name: Mary Jo Kahale-Whitford wraps between words at the largest text, with no sideways scroll (' + JSON.stringify(longName) + ')');
  ok(!p.errors.length, 'two services: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // three services on a phone in the admin panel: name and Breaks on their own line, heads in view under the room tabs
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', extra: fixture(three), wait: 1800 }); await ready(p);
  ok(await p.$$eval('.tm-grid-head .tm-grid-sh > b', l => l.map(e => e.textContent).join()) === 'Lunch,Dinner,All day dining', 'three services: Lunch and Dinner first, then the configured order');
  const layout = await p.evaluate(() => { const row = document.querySelector('.tm-person-row[data-id="ari"]'), who = row.querySelector('.tm-grid-who').getBoundingClientRect(), cell = row.querySelector('.tm-grid-cell').getBoundingClientRect(); return { whoAbove: who.bottom <= cell.top + 1, fullWidth: who.width > row.getBoundingClientRect().width * 0.9 }; });
  ok(layout.whoAbove && layout.fullWidth && !(await L.overflow(p)), 'three services at 390 px: the name and Breaks take their own line above the three sections');
  await p.evaluate(() => { const r = document.querySelector('.tm-person-row[data-id="eli"]'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 200); }); await L.settle(p, 250);
  const stuck = await p.evaluate(() => { const nav = document.querySelector('.a-nav').getBoundingClientRect(), head = document.querySelector('.tm-grid-head').getBoundingClientRect(); return { nav: Math.round(nav.bottom), head: Math.round(head.top), shown: head.height > 40 }; });
  ok(stuck.shown && Math.abs(stuck.head - stuck.nav) <= 2, 'sticky heads: scrolled down the list, the service heads sit just under the admin room tabs (' + JSON.stringify(stuck) + ')');
  ok(!p.errors.length, 'three services: no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
