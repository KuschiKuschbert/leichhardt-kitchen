// Today's team, step one of the chosen design D (head chef, 16 Nov 2026, docs/team-order-clear-options/brief.md): services
// in time order; break times, + Break and Spread inside each person's own hours on a service; the hours in words where
// breaks are set; a service added by hand takes that day's roster hours; Clear this day for the head chef, its second tap
// keyed by the date; a plan saved with nobody on reads as Not set. Made-up people and the stand-in only.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), TEAM = key('team', today), CFG = key('config', 'main');
const tomorrow = L.ymd(new Date(L.NOW + 86400000));
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Dev', 'Mo'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))
];
// saved in this order on purpose: time order puts Smoker (06:00) first and All day dining (15:00) before Dinner (17:00)
const SHIFTS = [
  { id: 'lunch', name: 'Lunch', from: 600, to: 900 },
  { id: 'dinner', name: 'Dinner', from: 1020, to: 1260 },
  { id: 'adl', name: 'All day dining', from: 900, to: 1020 },
  { id: 'smoker', name: 'Smoker', from: 360, to: 900 }
];
const SECS = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }];
// a day as the roster file leaves it, each roster time cut to each service (Mo 10:00 to 21:00: Lunch, All day dining, Dinner)
const ON = [
  { id: 'sam', sh: 'dinner', sec: '', from: 1020, to: 1260 },
  { id: 'ari', sh: 'lunch', sec: '', from: 600, to: 900 },
  { id: 'bea', sh: 'lunch', sec: '', from: 660, to: 900 },
  { id: 'dev', sh: 'lunch', sec: '', from: 720, to: 900 },
  { id: 'mo', sh: 'lunch', sec: '', from: 600, to: 900 }, { id: 'mo', sh: 'adl', sec: '', from: 900, to: 1020 }, { id: 'mo', sh: 'dinner', sec: '', from: 1020, to: 1260 }
];
const fixture = (x) => ({
  [CFG]: { people, sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: SHIFTS, kitSecs: SECS },
  [TEAM]: Object.assign({ day: today, on: ON, br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' }, x || {})
});
const admin = (b, w, x) => L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: w || 1280, height: 900, extra: fixture(x), wait: 1800 });
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 5, null, 9000);
const click = async (p, sel) => { await p.locator(sel).first().click(); await L.settle(p, 200); };
const options = (p, k) => p.$eval('select[data-k="' + k + '"]', e => [...e.options].map(o => o.textContent));
const value = (p, k) => p.$eval('select[data-k="' + k + '"]', e => e.value);
const saved = p => p.evaluate(k => window.__fake.dump()[k], TEAM);
const page = p => p.evaluate(() => document.body.innerText);

(async () => {
  const b = await L.start();

  // 1. time order, break times inside the person's hours, + Break in the middle of them, the hours in words
  let p = await admin(b); await ready(p);
  ok(await p.$$eval('.tm-grid-head .tm-grid-sh > b', l => l.map(e => e.textContent).join()) === 'Lunch,All day dining,Dinner', 'time order: the grid runs Lunch 10:00, All day dining 15:00, Dinner 17:00, not the saved order');
  await click(p, '[data-p="tm-focus"][data-id="dev"]');
  ok(JSON.stringify(await p.$$eval('.tm-bench-shifts button', l => l.map(e => e.textContent.trim()))) === JSON.stringify(['Smoker (off)', 'Lunch', 'All day dining (off)', 'Dinner (off)']), 'time order: Dev\'s services run Smoker 06:00, Lunch, All day dining, Dinner');
  ok(/Lunch: Roster 12:00 to 15:00/.test(await p.$eval('.tm-detail-workbench', e => e.innerText)), 'words: Dev\'s details say his hours where his break is set (Lunch: Roster 12:00 to 15:00)');
  await click(p, '.tm-detail-workbench [data-p="tm-addbr"]');
  const devTimes = (await options(p, 'tm-at:dev:0')).filter(t => t !== 'No break');
  ok(devTimes[0] === 'Break 12:00' && devTimes[devTimes.length - 1] === 'Break 14:30' && devTimes.length === 11, 'break times: Dev (roster 12:00 to 15:00) is offered 12:00 to 14:30, ending by his finish, not 10:00 to 15:00 (' + devTimes[0] + ' to ' + devTimes[devTimes.length - 1] + ', ' + devTimes.length + ')');
  ok(await value(p, 'tm-at:dev:0') === '795', '+ Break: Dev\'s first break starts in the middle of his hours, 13:15 (' + await value(p, 'tm-at:dev:0') + ')');
  // Mo works Lunch, All day dining and Dinner: each + Break sits inside that service's own part, never all at one time
  await click(p, '[data-p="tm-focus"][data-id="mo"]');
  for (const sh of ['lunch', 'dinner']) {
    await click(p, '[data-p="tm-sh"][data-id="mo"][data-v="' + sh + '"]');
    await click(p, '.tm-detail-workbench [data-p="tm-addbr"]');
  }
  ok(/Dinner: Roster 17:00 to 21:00/.test(await p.$eval('.tm-detail-workbench', e => e.innerText)), 'words: Mo\'s Dinner says its own part of his roster time');
  ok(/Roster 10:00 to 21:00/.test(await p.$eval('.tm-person-row[data-id="mo"] .tm-roster-time', e => e.textContent)), 'words: Mo\'s row joins the touching parts into one roster time, 10:00 to 21:00');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, TEAM, 6000);
  const moBr = (await saved(p)).br.filter(x => x.id === 'mo').map(x => x.sh + ' ' + x.at).sort().join(', ');
  ok(moBr === 'dinner 1125, lunch 735', 'double shift: Mo\'s Lunch break is 12:15 and his Dinner break 18:45, one inside each service (' + moBr + ')');
  ok(p.errors.length === 0, 'hours: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. a break already outside the person's hours is kept and said in words, never dropped
  p = await admin(b, 1280, { br: [{ id: 'bea', sh: 'lunch', at: 630, len: 30 }] }); await ready(p);
  await click(p, '[data-p="tm-focus"][data-id="bea"]');
  ok(await value(p, 'tm-at:bea:0') === '630' && (await options(p, 'tm-at:bea:0')).includes('Break 10:30 (outside their hours)'), 'outside: Bea\'s saved 10:30 break (roster from 11:00) is kept and says it is outside her hours');
  await p.context().close();

  // 3. Spread keeps each break inside the person's hours and names who it moved
  p = await admin(b); await ready(p);
  await click(p, 'details.tm-batch > summary');
  await L.pick(p, 'select[data-k="tm-tool-sh"]', 'lunch'); await L.settle(p, 150);
  await L.pick(p, 'select[data-k="tm-spfrom"]', '600'); await L.settle(p, 150);
  await L.pick(p, 'select[data-k="tm-spmode"]', '0'); await L.settle(p, 150);
  await click(p, '[data-p="tm-spread"]');
  ok(/Moved inside their hours: Bea 11:00, Dev 12:00\./.test(await page(p)), 'Spread: from 10:00 all together, Bea and Dev start their breaks when they start, and the words name them');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, TEAM, 6000);
  const lunchBr = (await saved(p)).br.filter(x => x.sh === 'lunch').map(x => x.id + ' ' + x.at).sort().join(', ');
  ok(lunchBr === 'ari 600, bea 660, dev 720, mo 600', 'Spread: every Lunch break sits inside its person\'s hours (' + lunchBr + ')');
  await p.context().close();

  // 4. a service added by hand takes that day's roster hours, cut to the service
  p = await admin(b); await ready(p);
  await click(p, '[data-p="tm-focus"][data-id="bea"]');
  await click(p, '[data-p="tm-sh"][data-id="bea"][data-v="smoker"]');
  await click(p, '.tm-detail-workbench [data-p="tm-on"][data-id="bea"][data-sh="smoker"]');
  ok(/Smoker: Roster 11:00 to 15:00/.test(await p.$eval('.tm-detail-workbench', e => e.innerText)), 'by hand: Bea on Smoker (06:00 to 15:00) takes her roster hours that day, 11:00 to 15:00');
  await click(p, '[data-p="tm-focus"][data-id="ari"]');
  await click(p, '[data-p="tm-sh"][data-id="ari"][data-v="dinner"]');
  await click(p, '.tm-detail-workbench [data-p="tm-on"][data-id="ari"][data-sh="dinner"]');
  ok(/Dinner: Dinner hours 17:00 to 21:00/.test(await p.$eval('.tm-detail-workbench', e => e.innerText)), 'by hand: Ari (roster 10:00 to 15:00) on Dinner has no roster hours inside it, so it says Dinner hours');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, TEAM, 6000);
  const bea = (await saved(p)).on.find(o => o.id === 'bea' && o.sh === 'smoker'), ari = (await saved(p)).on.find(o => o.id === 'ari' && o.sh === 'dinner');
  ok(bea && bea.from === 660 && bea.to === 900 && ari && ari.from === undefined, 'by hand: Save keeps Bea\'s Smoker as 11:00 to 15:00 and Ari\'s Dinner with no roster hours');
  await p.context().close();

  // 5. Clear this day: the head chef only, a second tap keyed by the date, Save writes a plan that reads as Not set
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture(), wait: 1800 }); await ready(p);
  await click(p, 'details.tm-batch > summary');
  ok(!await p.locator('[data-p="tm-clear"]').count() && /Copy a day or spread breaks/.test(await page(p)), 'Clear: a sous chef has no Clear this day');
  await p.context().close();
  p = await admin(b, 390); await ready(p);
  await click(p, 'details.tm-batch > summary');
  ok(/Copy, clear or spread breaks/.test(await page(p)), 'Clear: the head chef\'s fold is named Copy, clear or spread breaks');
  await click(p, '[data-p="tm-clear"]');
  ok(await p.$eval('[data-p="tm-clear"]', e => e.textContent) === 'Tap again to clear ' + await p.$eval('[data-p="tm-date-toggle"]', e => e.textContent.replace(/\s*▾[\s\S]*$/, '').trim()) && await p.locator('.tm-person-row').count() === 5, 'Clear: the first tap only asks again, naming the date');
  // a date pick in between cancels the second tap, so it never lands on another date
  await click(p, '[data-p="tm-date-toggle"]');
  await click(p, '[data-p="tm-day"][data-day="' + tomorrow + '"]');
  await click(p, '[data-p="tm-today"]');
  await L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 5, null, 6000);
  if (!await p.locator('details.tm-batch[open]').count()) await click(p, 'details.tm-batch > summary');
  ok(await p.$eval('[data-p="tm-clear"]', e => e.textContent) === 'Clear this day', 'Clear: picking another date and coming back cancels the armed second tap');
  await click(p, '[data-p="tm-clear"]'); await click(p, '[data-p="tm-clear"]');
  ok(await p.locator('.tm-person-row').count() === 0 && /Everyone taken off .*: 5 people\. Not saved yet\./.test(await page(p)), 'Clear: the second tap takes all 5 people off, and says it is not saved yet');
  ok(!(await saved(p)).on.every(o => false) && (await saved(p)).v === 1, 'Clear: nothing is written before Save');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, TEAM, 6000);
  const cleared = await saved(p);
  ok(cleared.on.length === 0 && cleared.br.length === 0 && cleared.v === 2 && cleared.at === L.NOW - 3600000, 'Clear: Save writes the next version with nobody on, keeping the day\'s first save time');
  ok(/saved at \d\d:\d\d: nobody on, so the day reads as Not set\./.test(await page(p)), 'Clear: the Save words say the saved day has nobody on and reads as Not set');
  await click(p, '[data-p="tm-date-toggle"]');
  ok(/Not set/.test(await p.$eval('[data-p="tm-day"][data-day="' + today + '"]', e => e.innerText)), 'Not set: the week list shows the cleared day as Not set, not Saved');
  ok(p.errors.length === 0 && !await L.overflow(p), 'Clear: no page errors and no sideways scroll at 390 px ' + p.errors.join(' | '));
  await p.context().close();

  // 6. a plan saved with nobody on: the chef is asked to set today's team again
  p = await L.open(b, '#/', { who: 'sam', extra: fixture({ on: [], br: [] }), wait: 1500 });
  ok(await p.locator('.nb-tmset').count() > 0 || /Today's team, not set yet/.test(await p.evaluate(() => [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' | '))), 'Not set: with nobody on the saved plan, the sous chef is asked to set today\'s team');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
