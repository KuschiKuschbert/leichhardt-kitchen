// Fill from roster file in the admin panel's Today's team (14 Nov 2026, docs/roster-import-options/brief.md, the chosen
// combined design). Made-up people, a made-up roster (tests/roster-fixture.js) and the Firebase stand-in only.
const L = require('./lib');
const { build, DAYS, PEOPLE } = require('./roster-fixture.js');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const CFG = key('config', 'main');
// next week, Monday to Sunday, in kitchen dates
const today = L.ymd(new Date(L.NOW)), dow = (new Date(L.NOW + 10 * 3600000).getUTCDay() + 6) % 7;
const day = n => L.ymd(new Date(L.NOW + n * 86400000));
const days = [0, 1, 2, 3, 4, 5, 6].map(n => day(7 - dow + n)), monday = days[0];
const people = [
  { id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true },
  { id: 'sam', name: 'Sam K', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true },
  { id: 'fn', name: 'Functions only', role: 'fnc', active: true }
];
const services = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'adl', name: 'All day dining', from: 900, to: 1020 }, { id: 'dinner', name: 'Dinner', from: 1020, to: 1320 }];
const sections = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'larder', name: 'Larder' }];
// Wednesday already has a saved plan: the roster must not change it
const wed = { day: days[2], on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }], br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' };
const fixture = () => ({
  [CFG]: { people, headId: 'gus', sousIds: ['sam'], staffIds: ['gus', 'sam', 'ann', 'bo', 'fn'], fnOnlyIds: ['fn'], kitShifts: services, kitSecs: sections },
  [key('team', days[2])]: wed
});
const csv = o => ({ name: 'WeeklyDepartmentRosterReport.csv', mimeType: 'text/csv', buffer: Buffer.from(build(Object.assign({ monday }, o || {}))) });
const dump = (p, k) => p.evaluate(x => __fake.dump()[x], k);
const reads = p => p.evaluate(() => __fake.reads.filter(k => /\/team(\/|$)/.test(k)).length);
const text = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, sel);
const planner = p => L.waitFor(p, () => !!document.querySelector('.a-pane .tm-notebook .tm-work [data-p="tm-whole"]'), null, 9000);
async function choose(p, file, done) {
  await p.setInputFiles('[data-k="tm-roster-file"]', file);
  await L.waitFor(p, d => { const s = document.querySelector(d ? '.tm-roster [role="status"]' : '.tm-roster [role="alert"]'); return !!s && s.textContent.length > 10; }, done, 9000);
  await L.settle(p, 200);
}

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', extra: fixture(), wait: 1800 });
  await planner(p);
  ok(await p.locator('.a-tab[data-t="plan"]').count() === 1 && /Today's team/.test(await text(p, '.a-tab[data-t="plan"]')), 'admin panel: the Team room has a Today\'s team page beside Manage staff');
  ok(await p.locator('.tm-roster [data-p="tm-roster-choose"]').count() === 1 && /Choose roster file/.test(await text(p, '.tm-roster')), 'admin panel: Fill from roster file shows with its Choose roster file button');
  ok(await p.locator('.tm-batch .tm-roster').count() === 0, 'the roster block sits outside the per-date Copy a day fold, so it stays in view after a day change');
  const order = async () => p.evaluate(() => ['.tm-editor', '.tm-batch', '.tm-roster'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().top)));
  const o1 = await order();
  ok(o1[0] < o1[1] && o1[1] < o1[2], 'the roster block shows below the day\'s rows and the Copy a day fold (' + o1.join(' < ') + ')');
  const before = await reads(p);
  await choose(p, csv(), true);
  const after = await reads(p), card = await text(p, '.tm-roster');
  ok(after - before >= 1 && after - before <= 8, 'the file\'s week is read once from the server: ' + (after - before) + ' team reads (one bounded query, up to 7)');
  ok(/6 days filled as drafts, not saved yet/.test(card), 'six days are filled as drafts (' + card.slice(0, 120) + ')');
  ok(card.includes(await p.evaluate(d => new Date(d + 'T12:00:00+10:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }), days[2]) + ' already had a saved plan. Not changed.'), 'Wednesday, already saved, is named and not changed');
  ok(/Sam Lee \(looks for Sam L\)/.test(card) && /Mary Jo Kahale \(looks for Mary\)/.test(card) && /Not in the book, not filled/.test(card), 'people not in the book are listed with the name the book looks for');
  ok(/Breaks are not set on the filled days/.test(card), 'the card says breaks are not set');
  ok(await p.locator('.tm-roster [data-p="a-tab"][data-t="people"]').count() === 1, 'Manage staff is one tap from the card');
  const page = await text(p, '.a-pane');
  ok(!/\$|1,234|111\.11|Chef de Partie|Commi Chef|Demi Chef|Sous Chef\b/.test(page), 'no wage cost or award role from the file shows anywhere on the page');
  const chips = await p.$$eval('.tm-roster-days .chip', l => l.map(e => e.getAttribute('data-day') + '|' + e.textContent));
  ok(chips.length === 6 && chips.every(c => / · Draft$/.test(c)) && !chips.some(c => c.startsWith(days[2] + '|')), 'one chip for each filled day, each saying Draft in the week list\'s word: ' + chips.join(', '));
  ok(JSON.stringify(await dump(p, key('team', days[2]))) === JSON.stringify(wed) && !await dump(p, key('team', days[0])), 'nothing is saved by the import: Wednesday as it was, Monday still unsaved');
  // a chip opens that day: the same selection as the week list
  await p.locator('.tm-roster-days [data-day="' + days[3] + '"]').click(); await planner(p); await L.settle(p, 200);
  ok(await p.locator('.tm-notebook').getAttribute('data-day') === days[3], 'a day chip selects that date in the planner');
  const rows = await p.$$eval('.tm-person-row', l => l.map(e => e.getAttribute('data-id')));
  ok(['sam', 'ann', 'bo'].every(id => rows.includes(id)) && !rows.includes('gus'), 'Thursday has Sam K, Ann and Bo from the roster: ' + rows.join(', '));
  const o2 = await order(); ok(o2[0] < o2[2], 'after a day chip, the day\'s rows come before the roster block again (' + o2.join(' < ') + ')');
  ok(/Roster 10:00 to 21:00/.test(await text(p, '.tm-person-row[data-id="sam"] .tm-roster-time')) && /Roster 17:00 to 22:00/.test(await text(p, '.tm-person-row[data-id="bo"] .tm-roster-time')), 'each row says its roster time');
  await p.locator('[data-p="tm-save"]').click();
  await L.waitFor(p, k => !!__fake.dump()[k], key('team', days[3]), 8000); await L.settle(p, 300);
  const thu = await dump(p, key('team', days[3]));
  ok(thu && thu.v === 1 && JSON.stringify(thu.on.map(o => o.id + ':' + o.sh)) === JSON.stringify(['ann:adl', 'ann:dinner', 'ann:lunch', 'bo:dinner', 'sam:adl', 'sam:dinner', 'sam:lunch']), 'Save writes Thursday: every service each roster shift touches, nobody unmatched (' + (thu ? thu.on.map(o => o.id + ':' + o.sh).join(' ') : 'nothing') + ')');
  ok(/5 roster days are still drafts/.test(await text(p, '.tm-focus-save')), 'after Save, the band says how many roster days are still drafts');
  ok(/5 days filled as drafts, not saved yet\. 1 saved\./.test(await text(p, '.tm-roster')) && / · Saved$/.test(await text(p, '.tm-roster-days [data-day="' + days[3] + '"]')), 'the card and Thursday\'s chip follow the Save');
  ok(!await dump(p, key('team', days[0])) && !await dump(p, key('team', days[4])), 'the other filled days stay drafts until each is saved');
  for (const w of [390, 1280]) { await p.setViewportSize({ width: w, height: 900 }); await L.settle(p, 250); const o = await L.overflow(p); ok(!o, w + ' px: the admin Today\'s team with the roster card has no sideways scroll ' + (o || '')); }
  ok(!p.errors.length, 'no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // a file that does not fit: nothing filled, and it says so
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', extra: fixture(), wait: 1800 });
  await planner(p);
  await choose(p, csv({ rename: { '1:2': DAYS[0][0] } }), false);
  const bad = await text(p, '.tm-roster [role="alert"]');
  ok(/This file cannot be used\. Nothing was filled\./.test(bad) && /out of day order/.test(bad), 'a file whose days slip is refused in words: ' + bad.slice(0, 140));
  ok(!await p.locator('.tm-roster-days').count() && !(await p.$$eval('.tm-daypick small', l => l.map(e => e.textContent))).includes('Draft'), 'a refused file fills no day');
  ok(!/Sam Kerr|Ann Moss|\$/.test(bad), 'the refusal names the line, never a name or a cost from it');
  // a name from the file is shown as text, never as markup (the reader refuses < and >; quotes and & stay words)
  await choose(p, csv({ people: PEOPLE.concat([['Jo "Ace" & Co Smith', 'Demi Chef L5', { 4: '10:00-15:00' }]]) }), true);
  const odd = await p.$$eval('.tm-roster-missing li', l => l.map(e => ({ t: e.textContent.replace(/\s+/g, ' ').trim(), tags: Array.from(e.querySelectorAll('*')).map(x => x.tagName).join(',') })));
  ok(odd.some(x => x.t.startsWith('Jo "Ace" & Co Smith (looks for Jo)') && x.tags === 'SMALL,BR,SMALL'), 'a name with quotes and & shows as plain text: ' + JSON.stringify(odd[odd.length - 1]));
  ok(!p.errors.length, 'refused file: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // Save the filled days (head chef, 14 Nov 2026): one tap saves every filled day; a refused write saves none
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', extra: fixture(), wait: 1800 });
  await planner(p);
  await choose(p, csv(), true);
  ok(/Save the 6 filled days/.test(await text(p, '[data-p="tm-roster-saveall"]')), 'the block offers Save the 6 filled days');
  await p.evaluate(() => { __fake.mode = 'deny'; });
  await p.locator('[data-p="tm-roster-saveall"]').click();
  await L.waitFor(p, () => /none of the days were saved/.test((document.querySelector('.tm-roster') || {}).textContent || ''), null, 8000);
  ok(!(await Promise.all(days.map(d => dump(p, key('team', d))))).filter((r, i) => i !== 2).some(Boolean) && /Try again/.test(await text(p, '[data-p="tm-roster-saveall"]')), 'a refused save saves none of the days and offers Try again');
  ok((await p.$$eval('.tm-roster-days .chip', l => l.map(e => e.textContent))).every(c => / · Draft$/.test(c)), 'after a refusal every filled day is still a draft');
  await p.evaluate(() => { __fake.mode = 'ok'; });
  await p.locator('[data-p="tm-roster-saveall"]').click();
  await L.waitFor(p, ks => ks.every(k => !!__fake.dump()[k]), [0, 1, 3, 4, 5, 6].map(i => key('team', days[i])), 8000); await L.settle(p, 300);
  const saved = await Promise.all(days.map(d => dump(p, key('team', d))));
  ok([0, 1, 3, 4, 5, 6].every(i => saved[i] && saved[i].v === 1 && saved[i].on.length && saved[i].br.length === 0 && saved[i].day === days[i]), 'one tap saves the six filled days, each its own dated plan without breaks');
  ok(JSON.stringify(saved[2]) === JSON.stringify(wed), 'Wednesday, already saved, stays as it was');
  ok(JSON.stringify(saved[0].on.map(o => o.id + ':' + o.sh)) === JSON.stringify(['ann:adl', 'ann:dinner', 'bo:adl', 'bo:dinner', 'bo:lunch']), 'Monday holds every service each roster shift touches (' + saved[0].on.map(o => o.id + ':' + o.sh).join(' ') + ')');
  const said = await text(p, '.tm-roster');
  ok(/All 6 filled days are saved\./.test(said) && /Saved 6 days at \d\d:\d\d/.test(said) && /sous chefs see them in Today's team and set the breaks/.test(said) && !await p.locator('[data-p="tm-roster-saveall"]:not([disabled])').count(), 'the block says what was saved and the button is off: ' + said.slice(said.indexOf('Saved 6'), said.indexOf('Saved 6') + 90));
  ok((await p.$$eval('.tm-roster-days .chip', l => l.map(e => e.textContent))).every(c => / · Saved$/.test(c)), 'every filled day\'s chip now says Saved');
  ok(!p.errors.length, 'save the filled days: no browser errors ' + p.errors.join(' | '));
  const week = {}; [0, 1, 3, 4, 5, 6].forEach(i => { week[key('team', days[i])] = saved[i]; });
  await p.context().close();

  // a sous chef sees the imported team on the day and sets the breaks
  p = await L.open(b, '#/team', { who: 'sam', extra: Object.assign(fixture(), week), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.tm-notebook .tm-work [data-p="tm-whole"]'), null, 9000);
  const dates = async () => { if (!await p.locator('.tm-weeknav').isVisible()) { await p.locator('[data-p="tm-date-toggle"]').click(); await L.settle(p, 200); } };
  await dates();
  for (let n = 0; n < 3 && !await p.locator('[data-p="tm-day"][data-day="' + days[0] + '"]').count(); n++) { await p.locator('[data-p="tm-week-next"]').click(); await L.settle(p, 400); await dates(); }
  await p.locator('[data-p="tm-day"][data-day="' + days[0] + '"]').click();
  await L.waitFor(p, d => (document.querySelector('.tm-notebook') || {}).getAttribute && document.querySelector('.tm-notebook').getAttribute('data-day') === d && !!document.querySelector('.tm-person-row'), days[0], 9000);
  const seen = await p.$$eval('.tm-person-row', l => l.map(e => e.getAttribute('data-id')));
  ok(seen.includes('ann') && seen.includes('bo') && !await p.locator('.tm-roster').count(), 'the sous chef sees Monday\'s imported team (' + seen.join(', ') + '), without the roster tool');
  if (!await p.locator('[data-p="tm-spread"]').isVisible()) { await p.locator('[data-p="tm-batch-toggle"]').click(); await L.settle(p, 150); }
  await L.pick(p, 'select[data-k="tm-tool-sh"]', 'dinner'); await L.settle(p, 150);
  await p.locator('[data-p="tm-spread"]').click(); await L.settle(p, 200);
  await p.locator('[data-p="tm-save"]').click();
  await L.waitFor(p, k => { const r = __fake.dump()[k]; return !!r && r.v === 2; }, key('team', days[0]), 8000);
  const mon = await dump(p, key('team', days[0]));
  ok(mon.v === 2 && mon.br.length >= 2 && mon.br.every(x => x.sh === 'dinner') && JSON.stringify(mon.on) === JSON.stringify(saved[0].on), 'the sous chef sets the Dinner breaks and saves; the imported team stays as it was (' + mon.br.length + ' breaks)');
  ok(!p.errors.length, 'sous chef breaks: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // only the admin panel: not on the head chef's or a sous chef's Today's team page
  for (const [label, o] of [['head chef on #/team', { admin: true }], ['sous chef on #/team', { who: 'sam' }]]) {
    p = await L.open(b, '#/team', Object.assign({ extra: fixture(), wait: 1500 }, o));
    await L.waitFor(p, () => !!document.querySelector('.tm-notebook .tm-work [data-p="tm-whole"]'), null, 9000);
    ok(!await p.locator('.tm-roster, [data-k="tm-roster-file"]').count(), label + ': no roster file tool');
    await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
