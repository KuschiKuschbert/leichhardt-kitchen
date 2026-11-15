// Today's team rows (head chef, 15 Nov 2026, docs/team-sections-options/brief.md, the chosen mix; on the rows of design
// D since 16 Nov 2026, docs/team-order-clear-options/brief.md): one section picker per person and service, the usual
// section and "Same as Lunch" offered first and never applied by themselves, plain counts in the service heads (no green
// before Save, chefs not counted), heads that stay in view under the admin panel's room tabs on a phone, and three
// services on a phone. Made-up people and the stand-in only.
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
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-tlrow').length >= 8, null, 9000);
const heads = p => p.$$eval('.tm-planhead .tm-grid-sh', l => l.map(e => e.innerText.replace(/\s+/g, ' ').trim()));
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
  // on a phone the heads say only the counts (D); the hours show from 600 px, checked at 1280 below
  const phone = await heads(p);
  ok(phone[0] === 'Lunch 4 no section' && phone[1] === 'Dinner 6 no section', 'heads: each service with how many still have no section, the sous chef not counted (' + phone.join(' | ') + ')');
  const colours = await p.evaluate(() => { const probe = document.createElement('i'); document.body.appendChild(probe); probe.style.color = 'var(--done-ink)'; const done = getComputedStyle(probe).color; probe.style.color = 'var(--done)'; const done2 = getComputedStyle(probe).color; probe.remove();
    return [...document.querySelectorAll('.tm-plan *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && [done, done2].includes(getComputedStyle(e).color)).map(e => e.textContent.trim()); });
  ok(!colours.length, 'colour: nothing in the draft rows is green before Save (' + colours.join(' | ') + ')');
  // a chef's unset picker reads their role with a solid edge (D's follow-up: dashed read as empty); a cook's keeps the dashed not-set edge
  const edge = (p, k) => p.$eval('select[data-k="' + k + '"]', e => e.options[e.selectedIndex].textContent + ' ' + getComputedStyle(e.closest('.tm-pick').querySelector('.ux-picker-trigger')).borderStyle);
  ok(await edge(p, 'tm-sec:sam:lunch') === 'Sous chef solid' && await p.$eval('.tm-tlrow[data-id="sam"] .tm-tlrole', e => e.textContent) === 'Sous chef', 'chef row: Sam\'s unset cell reads Sous chef with a solid edge, and his name says Sous chef (' + await edge(p, 'tm-sec:sam:lunch') + ')');
  ok(await edge(p, 'tm-sec:cal:lunch') === 'No section dashed', 'not set: a cook\'s unset cell reads No section with the dashed not-set edge (' + await edge(p, 'tm-sec:cal:lunch') + ')');
  // the grid's Off cell: a service not worked has no line; it is offered in Add a service instead
  ok(JSON.stringify(await p.$$eval('.tm-tlrow[data-id="fen"] .tm-tlsvc', l => l.map(e => e.dataset.sh))) === '["dinner"]' && !await p.locator('select[data-k="tm-sec:fen:lunch"]').count() && (await options(p, 'tm-addsvc:fen')).includes('Lunch 10:00 to 15:00'), 'Off: Fen, on Dinner only, has no Lunch line, and Lunch is offered in his Add a service');
  // Save names who still has no section, chefs left out
  await p.locator('[data-p="tm-save"]').click();
  await L.waitFor(p, k => (__fake.dump()[k] || {}).v === 2 && /saved at/.test(document.querySelector('.tm-save').textContent), TEAM, 7000);
  const said = (await p.locator('.tm-save').innerText()).replace(/\s+/g, ' ');
  ok(!/Ari/.test(said.split('Still no section')[1] || '') && /Still no section: Bea Dinner, Cal Lunch, Cal Dinner, Dev Lunch, Dev Dinner, Eli Lunch and 4 more\./.test(said) && !/Sam/.test(said.split('Still no section')[1] || ''), 'Save words: the services still without a section are named, six then a count, chefs left out (' + said + ')');
  for (const w of [390, 768, 1280]) { await p.setViewportSize({ width: w, height: 844 }); await L.settle(p, 200); ok(!(await L.overflow(p)), 'two services ' + w + ' px: no sideways scroll'); }
  const wide = await heads(p);
  ok(wide[0] === 'Lunch 10:00 to 15:00 4 no section' && wide[1] === 'Dinner 15:00 to 21:00 6 no section', 'heads at 1280 px: each service with its hours and its count (' + wide.join(' | ') + ')');
  // a long name wraps between words, never inside one
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => document.documentElement.setAttribute('data-text', 'xlarge')); await L.settle(p, 200);
  const longName = await p.$eval('.tm-person-row[data-id="mjk"] .tm-person-name', e => { const r = document.createRange(), words = e.textContent.split(/\s+/).flatMap(w => w.split(/(?<=-)/)); let at = 0; const lines = []; for (const w of words) { const i = e.textContent.indexOf(w, at); r.setStart(e.firstChild, i); r.setEnd(e.firstChild, i + w.length); lines.push(r.getClientRects().length); at = i + w.length; } return { split: lines.filter(n => n > 1).length, over: e.scrollWidth > e.clientWidth + 1 }; });
  ok(!longName.split && !longName.over && !(await L.overflow(p)), 'long name: Mary Jo Kahale-Whitford wraps between words at the largest text, with no sideways scroll (' + JSON.stringify(longName) + ')');
  ok(!p.errors.length, 'two services: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // three services on a phone in the admin panel: the name on its own line, a line per service, heads in view under the room tabs
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', extra: fixture(three), wait: 1800 }); await ready(p);
  ok(await p.$$eval('.tm-planhead .tm-grid-sh > b', l => l.map(e => e.textContent).join()) === 'Lunch,All day dining,Dinner', 'three services: in time order, Lunch 10:00, All day dining 15:00, Dinner 17:00 (head chef, 16 Nov 2026)');
  const layout = await p.evaluate(() => { const row = document.querySelector('.tm-tlrow[data-id="ari"]'), box = row.getBoundingClientRect(), who = row.querySelector('.tm-grid-who').getBoundingClientRect(), lines = [...row.querySelectorAll('.tm-tlsvc')].map(e => e.getBoundingClientRect());
    return { whoAbove: who.bottom <= lines[0].top + 1, fullWidth: who.width > box.width * 0.9, lines: lines.length, stacked: lines.every((r, i) => !i || r.top >= lines[i - 1].bottom - 1), inside: lines.every(r => r.left >= box.left - 1 && r.right <= box.right + 1),
      pickers: [...row.querySelectorAll('.tm-tlsvc .ux-picker-trigger')].every(t => { const r = t.getBoundingClientRect(); return r.width > 0 && r.left >= box.left - 1 && r.right <= box.right + 1; }) }; });
  ok(layout.whoAbove && layout.fullWidth && layout.lines === 3 && layout.stacked && layout.inside && layout.pickers && !(await L.overflow(p)), 'three services at 390 px: the name takes its own line above three service lines, one under the other, each with its pickers inside the row (' + JSON.stringify(layout) + ')');
  await p.evaluate(() => { const r = document.querySelector('.tm-person-row[data-id="eli"]'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 200); }); await L.settle(p, 250);
  const stuck = await p.evaluate(() => { const nav = document.querySelector('.a-nav').getBoundingClientRect(), head = document.querySelector('.tm-planhead').getBoundingClientRect(); return { nav: Math.round(nav.bottom), head: Math.round(head.top), shown: head.height > 40 }; });
  ok(stuck.shown && Math.abs(stuck.head - stuck.nav) <= 2, 'sticky heads: scrolled down the list, the service heads sit just under the admin room tabs (' + JSON.stringify(stuck) + ')');
  ok(!p.errors.length, 'three services: no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  // Often and one freshness rule (head chef, 15 Nov 2026, docs/team-smart-sections-options/brief.md)
  const dayAgo = n => L.ymd(new Date(L.NOW - n * 86400000));
  const stints = [];
  [1, 2, 3, 5].forEach(n => stints.push({ day: dayAgo(n), s: [{ p: 'cal', sec: 'Pans', sh: 'dinner' }] }));
  stints.push({ day: dayAgo(6), s: [{ p: 'cal', sec: 'Grill', sh: 'dinner' }, { p: 'cal', sec: 'Pans', sh: 'dinner' }] });   // a move: one day each
  [1, 2, 3].forEach(n => stints.push({ day: dayAgo(n + 7), s: [{ p: 'dev', sec: 'Pans', sh: 'dinner' }] }));
  [4, 5, 6].forEach(n => stints.push({ day: dayAgo(n + 7), s: [{ p: 'dev', sec: 'Grill', sh: 'dinner' }] }));
  [1, 2].forEach(n => stints.push({ day: dayAgo(n + 14), s: [{ p: 'eli', sec: 'Larder', sh: 'dinner' }] }));
  [1, 2, 3].forEach(n => stints.push({ day: dayAgo(n + 20), s: [{ p: 'bea', sec: 'Fryer', sh: 'dinner' }] }));
  const peopleHal = people.concat([{ id: 'hal', name: 'Hal', role: 'staff', active: true, add: true, tick: true }]);
  const sum = made => ({ [key('teamsum', 'main')]: { day: made, to: dayAgo(1), days: stints.slice().sort((x, y) => x.day < y.day ? -1 : 1), usual: { [dow + '|dinner']: { bea: ['larder', 6, 8], hal: ['fryer', 4, 8] } }, learn: {} } });
  const withHal = made => { const f = fixture(two, sum(made)); f[CFG] = Object.assign({}, f[CFG], { people: peopleHal, staffIds: peopleHal.map(x => x.id) }); return f; };
  const first3 = (p, k) => options(p, k).then(o => o.slice(0, 2));
  p = await L.open(b, '#/team', { who: 'sam', extra: withHal(today), wait: 1500 }); await ready(p);
  ok((await first3(p, 'tm-sec:cal:dinner'))[0] === 'Often Pans, 5 of 5 Dinner shifts in 30 days' && await value(p, 'tm-sec:cal:dinner') === '', 'Often: Cal, with no usual, is offered the section he worked most at Dinner, counted by days, and it is not filled in (' + (await first3(p, 'tm-sec:cal:dinner')).join(' | ') + ')');
  ok(!(await options(p, 'tm-sec:dev:dinner')).some(o => /^Often/.test(o)), 'Often: a tie (Pans 3, Grill 3) offers nothing');
  ok(!(await options(p, 'tm-sec:eli:dinner')).some(o => /^Often/.test(o)), 'Often: fewer than 3 days offers nothing');
  ok((await first3(p, 'tm-sec:bea:dinner'))[0] === 'Usually Larder, 6 of the last 8 ' + weekday + 's' && !(await options(p, 'tm-sec:bea:dinner')).some(o => /^Often/.test(o)), 'Often: a weekday usual comes first and Often is not added beside it');
  await L.pick(p, 'select[data-k="tm-sec:cal:dinner"]', { label: 'Often Pans, 5 of 5 Dinner shifts in 30 days' });
  ok(await value(p, 'tm-sec:cal:dinner') === 'pans' && !(await options(p, 'tm-sec:cal:dinner')).some(o => /^Often/.test(o)), 'Often: chosen, it sets only that cell, and is no longer offered once the cell matches');
  await p.locator('.tm-focus-toolbar [data-p="tm-add-staff"]').click(); await L.settle(p, 150);
  for (const choice of await p.locator('input[data-k^="tm-quick-shift:"]').all()) await choice.setChecked(await choice.getAttribute('data-k') === 'tm-quick-shift:dinner');
  await p.locator('input[data-k="tm-quick-person:hal"]').check(); await p.locator('[data-p="tm-quick-add"]').click(); await L.settle(p, 200);
  ok(await value(p, 'tm-sec:hal:dinner') === 'fryer', 'fresh counts: Add staff still fills Hal\'s usual Dinner section, as before');
  ok(!p.errors.length, 'Often: no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  // a nightly record three days old: no Usually, no Often, no usual filled in (fails on the code before 15 Nov 2026)
  p = await L.open(b, '#/team', { who: 'sam', extra: withHal(dayAgo(3)), wait: 1500 }); await ready(p);
  ok(!(await options(p, 'tm-sec:bea:dinner')).some(o => /^Usually/.test(o)) && !(await options(p, 'tm-sec:cal:dinner')).some(o => /^Often/.test(o)), 'old counts: a record three days old offers no Usually and no Often');
  await p.locator('.tm-focus-toolbar [data-p="tm-add-staff"]').click(); await L.settle(p, 150);
  for (const choice of await p.locator('input[data-k^="tm-quick-shift:"]').all()) await choice.setChecked(await choice.getAttribute('data-k') === 'tm-quick-shift:dinner');
  await p.locator('input[data-k="tm-quick-person:hal"]').check(); await p.locator('[data-p="tm-quick-add"]').click(); await L.settle(p, 200);
  ok(await value(p, 'tm-sec:hal:dinner') === '', 'old counts: Add staff does not fill a usual section from a record three days old');
  ok(!p.errors.length, 'old counts: no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
