// All day dining rolls over (head chef, 17 Nov 2026): it gets no staff of its own; a cook on it keeps the section they
// have on Lunch, or with no Lunch, the one they have on Dinner. The book knows All day by its hours (it starts when
// Lunch ends and ends when Dinner starts); Smoker, an occasional shift, never makes Lunch roll over. A section picked
// on All day itself stays. A saved day is never changed by opening it. Made-up staff, the Firebase stand-in.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const today = L.ymd(new Date(L.NOW)), tomorrow = L.ymd(new Date(L.NOW + 86400000));
const TEAM = key('team', today), NEXT = key('team', tomorrow);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true },
  ...['Mo', 'Sue', 'Ari', 'Bea'].map(name => ({ id: name.toLowerCase(), name, role: 'staff', active: true, add: true, tick: true }))
];
const shifts = [
  { id: 'lunch', name: 'Lunch', from: 600, to: 900 },
  { id: 'allday', name: 'All day', from: 900, to: 1020 },
  { id: 'dinner', name: 'Dinner', from: 1020, to: 1260 },
  { id: 'smoker', name: 'Smoker', from: 360, to: 900, occ: true }
];
const secs = ['Grill', 'Pans', 'Larder', 'Fryer'].map(n => ({ id: n.toLowerCase(), name: n }));
const plan = (day, on) => ({ day, on, br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' });
const fixture = () => ({
  [key('config', 'main')]: { people, sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: shifts, kitSecs: secs },
  [TEAM]: plan(today, [
    { id: 'sam', sh: 'dinner', sec: '' },
    { id: 'mo', sh: 'lunch', sec: '' }, { id: 'mo', sh: 'allday', sec: '' }, { id: 'mo', sh: 'dinner', sec: '' },
    { id: 'sue', sh: 'allday', sec: '', from: 960, to: 1020 }, { id: 'sue', sh: 'dinner', sec: '' },
    { id: 'ari', sh: 'lunch', sec: 'grill' },
    { id: 'bea', sh: 'smoker', sec: '' }, { id: 'bea', sh: 'lunch', sec: '' }
  ]),
  // a day saved before this change: Mo on Lunch at Grill and All day with no section
  [NEXT]: plan(tomorrow, [{ id: 'mo', sh: 'lunch', sec: 'grill' }, { id: 'mo', sh: 'allday', sec: '' }])
});
const pick = (p, k, v) => L.pick(p, 'select[data-k="' + k + '"]', String(v));
const value = (p, k) => p.locator('select[data-k="' + k + '"]').inputValue();
const words = p => p.locator('.tm-save').innerText().then(t => t.replace(/\s+/g, ' '));
async function ready(p) { await L.waitFor(p, () => document.querySelectorAll('select[data-k^="tm-sec:"]').length > 0, null, 7000); }

(async () => {
  const b = await L.start();
  const p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), width: 1280, wait: 900 }); await ready(p);
  await L.teamWarm(p, tomorrow, ready);

  // Lunch's section rolls over to All day; Dinner is not touched
  await pick(p, 'tm-sec:mo:lunch', 'grill');
  ok(await value(p, 'tm-sec:mo:allday') === 'grill' && await value(p, 'tm-sec:mo:dinner') === '' && /Mo assigned to Grill for Lunch\. All day follows\. Not saved yet\./.test(await words(p)), 'Lunch to Grill: Mo\'s All day follows with Grill and says so; Dinner stays as it was');
  await pick(p, 'tm-sec:mo:lunch', 'pans');
  ok(await value(p, 'tm-sec:mo:allday') === 'pans', 'Lunch changed to Pans: All day follows again');
  // a section picked on All day itself stays when Lunch changes
  await pick(p, 'tm-sec:mo:allday', 'fryer'); await pick(p, 'tm-sec:mo:lunch', 'larder');
  ok(await value(p, 'tm-sec:mo:allday') === 'fryer' && !/follows/.test(await words(p)), 'All day picked by hand (Fryer) stays when Lunch moves to Larder, and the words do not say it follows');
  ok(await p.locator('select[data-k="tm-sec:mo:allday"] option').first().innerText() === 'Same as Lunch: Larder', 'All day\'s picker offers the Lunch section first');
  // no Lunch: All day rolls over from Dinner
  await pick(p, 'tm-sec:sue:dinner', 'grill');
  ok(await value(p, 'tm-sec:sue:allday') === 'grill' && /Sue assigned to Grill for Dinner\. All day follows\./.test(await words(p)), 'Sue, on All day and Dinner with no Lunch: All day follows her Dinner section');
  // Add a service: All day starts with their Lunch section
  await pick(p, 'tm-addsvc:ari', 'allday');
  ok(await value(p, 'tm-sec:ari:allday') === 'grill', 'Ari adds All day: it starts with her Lunch section, Grill');
  // Smoker is occasional: it never makes Lunch roll over
  await pick(p, 'tm-sec:bea:smoker', 'pans');
  ok(await value(p, 'tm-sec:bea:lunch') === '', 'Bea on Smoker and Lunch: Smoker\'s section never reaches Lunch (Lunch is not All day)');
  ok(!p.errors.length, 'today: no browser errors ' + p.errors.join(' | '));

  // a day saved before this change opens as it was saved: nothing filled in, Save off
  await L.teamDay(p, tomorrow); await ready(p);
  ok(await value(p, 'tm-sec:mo:allday') === '' && await value(p, 'tm-sec:mo:lunch') === 'grill' && await p.locator('[data-p="tm-save"]').isDisabled(), 'a saved day is not changed by opening it: All day stays as saved, Save off');
  await pick(p, 'tm-sec:mo:lunch', 'pans');
  ok(await value(p, 'tm-sec:mo:allday') === 'pans', 'on that day, a Lunch change fills the empty All day');
  ok(!p.errors.length, 'tomorrow: no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
