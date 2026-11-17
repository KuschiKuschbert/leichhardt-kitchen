// Today's team, step one of the chosen design D (head chef, 16 Nov 2026, docs/team-order-clear-options/brief.md): services
// in time order; the hours in words in each row; a service added by hand takes that day's roster hours; Clear this day
// for the head chef, its second tap keyed by the date; a plan saved with nobody on reads as Not set. Step two's row
// actions: Add a service, Take off with a second tap and Undo in place. One break per person (head chef, 17 Nov 2026,
// docs/team-one-break-options/brief.md, D): one break line per person across their whole day, + Break by the name,
// two at most, times only inside their own hours (never in a gap), + Break's default with its reason in words (a split
// for an unbroken 9 hour stretch, else the middle of their day, an hour clear of their other break, apart from anyone
// else on that service on break, never a time already gone today), Take off keeping a break another service holds, and
// Spread capped. The stand-in clock is 14:00 today, so the middle-of-day defaults are planned on tomorrow's date.
// Made-up people and the stand-in only.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), TEAM = key('team', today), CFG = key('config', 'main');
const tomorrow = L.ymd(new Date(L.NOW + 86400000));
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cy', 'Dev', 'Mo'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))
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
// tomorrow (no clock in the way): Sam also on Lunch 08:00 to 15:00 (two parts of a day with a gap), Cy on Lunch, and Bea
// on Lunch and All day dining (one unbroken day across a service edge)
const NEXT = key('team', tomorrow);
const ON_NEXT = ON.filter(o => o.id !== 'bea').concat([
  { id: 'sam', sh: 'lunch', sec: '', from: 480, to: 900 }, { id: 'cy', sh: 'lunch', sec: '', from: 600, to: 900 },
  { id: 'bea', sh: 'lunch', sec: '', from: 660, to: 900 }, { id: 'bea', sh: 'adl', sec: '', from: 900, to: 1020 }
]);
const fixture = (x) => ({
  [CFG]: { people, sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: SHIFTS, kitSecs: SECS },
  [TEAM]: Object.assign({ day: today, on: ON, br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' }, x || {}),
  [NEXT]: { day: tomorrow, on: ON_NEXT, br: [], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' }
});
const admin = (b, w, x) => L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: w || 1280, height: 900, extra: fixture(x), wait: 1800 });
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 5, null, 9000);
const click = async (p, sel) => { await p.locator(sel).first().click(); await L.settle(p, 200); };
const options = (p, k) => p.$eval('select[data-k="' + k + '"]', e => [...e.options].map(o => o.textContent));
const value = (p, k) => p.$eval('select[data-k="' + k + '"]', e => e.value);
const saved = p => p.evaluate(k => window.__fake.dump()[k], TEAM);
const page = p => p.evaluate(() => document.body.innerText);
// a person's row: the services they work, in the order shown, and the one sentence of their hours and breaks
const lines = (p, id) => p.$$eval('.tm-tlrow[data-id="' + id + '"] .tm-tlsvc', l => l.map(e => e.dataset.sh).join());
// (17 Nov 2026) the roster hours are the label under the name, "Rostered hours: 12:00 to 15:00"; the words joined as read
const words = (p, id) => p.$eval('.tm-tlrow[data-id="' + id + '"]', r => { const t = r.querySelector('.tm-rostered'); return (t ? t.textContent.replace(/\s+/g, ' ').trim() + ' · ' : '') + r.querySelector('p.tm-roster-time').textContent; });
const times = async (p, k) => (await options(p, k)).filter(t => t !== 'No break');
// the control that has the focus, by its key: a picker's trigger names the select behind it
const focused = p => p.evaluate(() => { const a = document.activeElement, s = a && (a._uxSource || a); return !s || s === document.body ? 'page' : s.getAttribute('data-k') || [s.getAttribute('data-p'), s.getAttribute('data-id'), s.getAttribute('data-sh')].filter(Boolean).join(':'); });
const writes = p => p.evaluate(() => window.__fake.writes.filter(batch => batch.some(op => /\/team\//.test(op.path))).length);
// one break per person: + Break (or + 2nd break) is the person's, with no service; its pickers are found by their place
const addBreak = (p, id) => click(p, '[data-p="tm-addbr"][data-id="' + id + '"]');
const bk = (p, id, n, kind) => L.brKey(p, id, n || 0, kind);
const bval = async (p, id, n, kind) => { const k = await bk(p, id, n, kind); return k ? value(p, k) : ''; };
const btimes = async (p, id, n) => times(p, await bk(p, id, n));
const bpick = async (p, id, n, v) => { await L.pick(p, 'select[data-k="' + await bk(p, id, n) + '"]', String(v)); await L.settle(p, 150); };
const said = async (p, who) => ((await page(p)).match(new RegExp('(^|\\n)(' + who + ': [^\\n]*)')) || [])[2] || '';
const plan = (p, k) => p.evaluate(k => window.__fake.dump()[k], k);
const readyNext = p => L.waitFor(p, () => document.querySelectorAll('.tm-person-row').length >= 6 && !!document.querySelector('.tm-person-row[data-id="cy"]'), null, 9000);

(async () => {
  const b = await L.start();

  // 1. time order, + Break by the name, times across the person's whole day, the default with its reason, the words
  let p = await admin(b); await ready(p);
  await L.teamWarm(p, tomorrow, ready);   // tomorrow's week read first: on a Sunday it is next week
  ok(await p.$$eval('.tm-planhead .tm-grid-sh > b', l => l.map(e => e.textContent).join()) === 'Lunch,All day dining,Dinner', 'time order: the head runs Lunch 10:00, All day dining 15:00, Dinner 17:00, not the saved order');
  ok(await lines(p, 'mo') === 'lunch,adl,dinner' && JSON.stringify(await options(p, 'tm-addsvc:dev')) === JSON.stringify(['Add a service', 'Smoker 06:00 to 15:00', 'All day dining 15:00 to 17:00', 'Dinner 17:00 to 21:00']), 'time order: Mo\'s lines run Lunch, All day dining, Dinner, and Dev\'s Add a service lists Smoker 06:00, All day dining, Dinner (' + (await options(p, 'tm-addsvc:dev')).join(', ') + ')');
  ok(await words(p, 'dev') === 'Rostered hours: 12:00 to 15:00 · No break yet', 'words: Dev\'s row says his hours and that no break is set (' + await words(p, 'dev') + ')');
  // was: a + Break on every service line (Mo had three). Now one per person, by the name, and none on a service line
  ok(await p.locator('[data-p="tm-addbr"]').count() === 5 && await p.locator('.tm-tlrow[data-id="mo"] [data-p="tm-addbr"]').count() === 1 && await p.locator('.tm-tlrow[data-id="mo"] .tm-braddwho [data-p="tm-addbr"]').count() === 1 && !await p.locator('.tm-tlsvc [data-p="tm-addbr"]').count(), 'one break per person: 5 people, 5 + Break, Mo\'s one by his name though he works three services, none on a service line');
  await addBreak(p, 'dev');
  const devTimes = await btimes(p, 'dev');
  ok(devTimes[0] === 'Break 12:00' && devTimes[devTimes.length - 1] === 'Break 14:30' && devTimes.length === 11, 'break times: Dev (roster 12:00 to 15:00) is offered 12:00 to 14:30, ending by his finish, not 10:00 to 15:00 (' + devTimes[0] + ' to ' + devTimes[devTimes.length - 1] + ', ' + devTimes.length + ')');
  // (5) today at 14:00 the middle of Dev's day (13:15) has gone: the default is the first quarter hour left, said so
  ok(+await bval(p, 'dev') >= 840 && await bval(p, 'dev') === '840' && await said(p, 'Dev') === 'Dev: break 14:00 to 14:30, the first time left today. Not saved yet.', 'past time: on today\'s date + Break never picks a time already gone; at 14:00 Dev\'s break is 14:00, and the words say why (' + await said(p, 'Dev') + ')');
  ok(await words(p, 'dev') === 'Rostered hours: 12:00 to 15:00 · Break 14:00 to 14:30', 'words: Dev\'s sentence says his break once it is set (' + await words(p, 'dev') + ')');
  ok(await p.locator('.tm-tlrow[data-id="dev"] .tm-braddwho').count() === 0 && await p.$eval('.tm-tlrow[data-id="dev"] .tm-brline [data-p="tm-addbr"]', e => e.textContent) === '+ 2nd break', 'one break per person: once Dev has a break, + Break leaves his name and + 2nd break ends his break line');
  // (1) Mo 10:00 to 21:00, cut into Lunch, All day dining and Dinner: one unbroken 11 hour day, so one tap gives his split
  await addBreak(p, 'mo');
  ok(await bval(p, 'mo') === '870' && await bval(p, 'mo', 0, 'blen') === '150' && await said(p, 'Mo') === 'Mo: split 14:30 to 17:00, an 11 hour day. Not saved yet.', 'long day: one + Break gives Mo, 10:00 to 21:00 across three services, a split 14:30 to 17:00, said why (' + await said(p, 'Mo') + ')');
  const moTimes = await btimes(p, 'mo');
  ok(moTimes[0] === 'Split 10:00' && moTimes[moTimes.length - 1] === 'Split 18:30' && moTimes.length === 35, 'break times: Mo\'s split is offered across his whole day, 10:00 to 18:30, ending by his finish (' + moTimes[0] + ' to ' + moTimes[moTimes.length - 1] + ', ' + moTimes.length + ')');
  ok(await words(p, 'mo') === 'Rostered hours: 10:00 to 21:00 · Split 14:30 to 17:00 (nobody else on All day dining 15:00 to 17:00)', 'words: Mo\'s split leaves nobody on All day dining, and his row says so (' + await words(p, 'mo') + ')');
  // (4) + 2nd break: the middle of his longest stretch without a break has gone today; the next time an hour clear of his split
  await addBreak(p, 'mo');
  const moSecond = +await bval(p, 'mo', 1);
  ok(moSecond >= 1020 + 60 && await said(p, 'Mo') === 'Mo: 2nd break 18:00 to 18:30, the first time left today. Not saved yet.', '2nd break: an hour clear of his split (ends 17:00), never against it (' + await said(p, 'Mo') + ')');
  ok(!await p.locator('.tm-tlrow[data-id="mo"] [data-p="tm-addbr"]').count() && await words(p, 'mo') === 'Rostered hours: 10:00 to 21:00 · Split 14:30 to 17:00 (nobody else on All day dining 15:00 to 17:00), 2nd break 18:00 to 18:30', 'two at most: with two breaks Mo has no + Break left, and his sentence names both (' + await words(p, 'mo') + ')');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, TEAM, 6000);
  const moBr = (await saved(p)).br.filter(x => x.id === 'mo').map(x => x.sh + ' ' + x.at + ' ' + x.len).sort().join(', ');
  ok(moBr === 'dinner 1080 30, lunch 870 150', 'saved shape: each break is still { id, sh, at, len }, its service worked out from its start (' + moBr + ')');
  // (8) a day saved by this code and opened again reads the same breaks
  const savedDay = await saved(p);
  ok(p.errors.length === 0, 'hours: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  p = await admin(b, 1280, { on: savedDay.on, br: savedDay.br, v: savedDay.v }); await ready(p);
  ok(await bval(p, 'mo') === '870' && await bval(p, 'mo', 0, 'blen') === '150' && await bval(p, 'mo', 1) === '1080' && await bval(p, 'dev') === '840' && await words(p, 'mo') === 'Rostered hours: 10:00 to 21:00 · Split 14:30 to 17:00 (nobody else on All day dining 15:00 to 17:00), 2nd break 18:00 to 18:30' && await p.locator('[data-p="tm-save"]').isDisabled(), 'read back: the saved day opens with the same breaks and nothing to save');
  await p.context().close();

  // 1b. tomorrow, where the clock is not in the way: the middle of the day, a day with a gap, apart from others, a service edge
  p = await admin(b); await ready(p);
  await L.teamDay(p, tomorrow); await readyNext(p);
  await addBreak(p, 'mo'); await addBreak(p, 'mo');
  ok(await bval(p, 'mo') === '720' && await bval(p, 'mo', 1) === '870' && await said(p, 'Mo') === 'Mo: break 12:00 to 12:30, the middle of the longest stretch without a break. Not saved yet.', '2nd break: Mo\'s split 14:30, then a break in the middle of 10:00 to 14:30, an hour clear of it (' + await said(p, 'Mo') + ')');
  // (2) Sam works 08:00 to 15:00 and 17:00 to 21:00: 13 hours first to last, but no unbroken 9 hours, so no split
  await addBreak(p, 'sam');
  ok(await bval(p, 'sam') === '675' && await bval(p, 'sam', 0, 'blen') === '30' && await said(p, 'Sam') === 'Sam: break 11:15 to 11:45, the middle of their day. Not saved yet.', 'gap day: Sam (08:00 to 15:00, 17:00 to 21:00) gets a 30 minute break in the middle of his longer part, not a split (' + await said(p, 'Sam') + ')');
  const samTimes = await btimes(p, 'sam');
  ok(samTimes.includes('Break 14:30') && samTimes.includes('Break 17:00') && !samTimes.some(t => /^Break (14:45|15:\d\d|16:\d\d)$/.test(t)), 'gap day: Sam\'s break times stop at 14:30 and start again at 17:00, none in his gap');
  await addBreak(p, 'dev');
  ok(await bval(p, 'dev') === '795' && await said(p, 'Dev') === 'Dev: break 13:15 to 13:45, the middle of their day. Not saved yet.', '+ Break: Dev\'s first break starts in the middle of his hours, 13:15 (' + await said(p, 'Dev') + ')');
  // apart from others on that service: Ari's middle (12:15) has Mo on break, so it moves; Cy's has nobody free near it
  await addBreak(p, 'ari');
  ok(await said(p, 'Ari') === 'Ari: break 12:30 to 13:00, moved so Ari is not on break with Mo. Not saved yet.', 'apart: Ari\'s break moves off Mo\'s, and the words say why (' + await said(p, 'Ari') + ')');
  await addBreak(p, 'cy');
  ok(await said(p, 'Cy') === 'Cy: break 12:15 to 12:45, the middle of their day. Mo and Ari are on break then too. Not saved yet.', 'apart: with nobody free within an hour, Cy keeps the middle and the words name who else is on break (' + await said(p, 'Cy') + ')');
  // (3) Bea works Lunch and All day dining, 11:00 to 17:00: a 15:00 break, or one across the service edge, needs no hunting
  await addBreak(p, 'bea');
  const beaEdge = await btimes(p, 'bea');
  ok(beaEdge.includes('Break 14:45') && beaEdge.includes('Break 15:00') && beaEdge[beaEdge.length - 1] === 'Break 16:30', 'service edge: Bea\'s times run across Lunch and All day dining, 14:45 and 15:00 included, to 16:30');
  await bpick(p, 'bea', 0, 885);
  // inside her hours, so no "(outside their hours)"; Mo (on his split) is the only other on All day dining, so it says so
  ok(await words(p, 'bea') === 'Rostered hours: 11:00 to 17:00 · Break 14:45 to 15:15 (nobody else on All day dining 15:00 to 15:15)' && await said(p, 'Bea') === 'Bea: break 14:45 to 15:15. Not saved yet.', 'service edge: a 14:45 break across Lunch and All day dining is inside her hours, and the row names the one gap it leaves (' + await words(p, 'bea') + ')');
  await bpick(p, 'bea', 0, 900);
  ok(await words(p, 'bea') === 'Rostered hours: 11:00 to 17:00 · Break 15:00 to 15:30 (nobody else on All day dining 15:00 to 15:30)' && await focused(p) === 'tm-bat:bea:900:0', 'service edge: then 15:00, and the focus stays on her break\'s time picker (' + await focused(p) + ')');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, NEXT, 6000);
  const next = await plan(p, NEXT), beaBr = next.br.filter(x => x.id === 'bea').map(x => x.sh + ' ' + x.at + ' ' + x.len).join();
  ok(beaBr === 'adl 900 30' && next.br.length === 7, 'service edge: Bea\'s 15:00 break is saved on All day dining, the service that holds it, and 7 breaks in all (' + beaBr + ')');
  ok(p.errors.length === 0, 'tomorrow: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. a break already outside the person's hours is kept and said in words, never dropped
  p = await admin(b, 1280, { br: [{ id: 'bea', sh: 'lunch', at: 630, len: 30 }] }); await ready(p);
  ok(await bval(p, 'bea') === '630' && (await options(p, await bk(p, 'bea'))).includes('Break 10:30 (outside their hours)'), 'outside: Bea\'s saved 10:30 break (roster from 11:00) is kept and says it is outside her hours');
  ok(await words(p, 'bea') === 'Rostered hours: 11:00 to 15:00 · Break 10:30 to 11:00 (outside their hours)', 'outside: her row\'s sentence says it too (' + await words(p, 'bea') + ')');
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
  // (7) Spread on Dinner next: Mo has a 30 minute break already (Lunch), so he is left as he was and named; Sam gets one
  await L.pick(p, 'select[data-k="tm-tool-sh"]', 'dinner'); await L.settle(p, 150);
  await click(p, '[data-p="tm-spread"]');
  ok(/1 break from \d\d:\d\d[^\n]*Left as they were \(a break already, or a break then\): Mo\./.test(await page(p)), 'Spread capped: on Dinner, Mo, with a break already that day, is left as he was and named');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 3, TEAM, 6000);
  const spreadBr = (await saved(p)).br.filter(x => x.id === 'mo' || x.id === 'sam').map(x => x.id + ' ' + x.sh).sort().join(', ');
  ok(spreadBr === 'mo lunch, sam dinner', 'Spread capped: Mo keeps one break, Sam has his Dinner break (' + spreadBr + ')');
  await p.context().close();

  // 4. a service added by hand takes that day's roster hours, cut to the service
  p = await admin(b); await ready(p);
  await L.pick(p, 'select[data-k="tm-addsvc:bea"]', 'smoker');
  await addBreak(p, 'bea');
  const beaTimes = await btimes(p, 'bea');
  // Smoker (a usual shift in this kitchen's list here) holds her break before Lunch, as the earlier service; she is the
  // only one on it, so her row says her break leaves nobody on Smoker
  ok(beaTimes[0] === 'Break 11:00' && beaTimes[beaTimes.length - 1] === 'Break 14:30' && await words(p, 'bea') === 'Rostered hours: 11:00 to 15:00 · Break 14:00 to 14:30 (nobody else on Smoker 14:00 to 14:30)', 'by hand: Bea on Smoker (06:00 to 15:00) takes her roster hours that day, 11:00 to 15:00: her day still reads Roster 11:00 to 15:00 and her break times run 11:00 to 14:30 (' + await words(p, 'bea') + ')');
  await L.pick(p, 'select[data-k="tm-addsvc:ari"]', 'dinner');
  await addBreak(p, 'ari');
  const ariTimes = await btimes(p, 'ari');
  // one break per person: Ari's times run across both parts of his day, 10:00 to 14:30 and 17:00 to 20:30, none in his gap
  ok(ariTimes.includes('Break 17:00') && ariTimes[ariTimes.length - 1] === 'Break 20:30' && !ariTimes.some(t => /^Break (14:45|15:\d\d|16:\d\d)$/.test(t)) && /^Rostered hours: 10:00 to 15:00 · Dinner hours 17:00 to 21:00 · /.test(await words(p, 'ari')), 'by hand: Ari (roster 10:00 to 15:00) on Dinner has no roster hours inside it, so Dinner takes its own hours, 17:00 to 21:00, and nothing is offered in his gap (' + await words(p, 'ari') + ')');
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

  // 7. the roster is the source of truth (head chef, 16 Nov 2026): anyone on a service it did not give them is flagged, never blocked
  p = await admin(b); await ready(p);
  ok(!await p.locator('.tm-roster-flag').count(), 'roster: a day as the roster file left it has no flags');
  await L.pick(p, 'select[data-k="tm-addsvc:ari"]', 'dinner');
  const ariFlag = await p.$eval('.tm-person-row[data-id="ari"] .tm-roster-flag', e => e.textContent).catch(() => '');
  ok(ariFlag === 'Not on the roster for Dinner: rostered 10:00 to 15:00', 'roster: Ari (rostered 10:00 to 15:00) put on Dinner is flagged under his name (' + ariFlag + ')');
  ok(/Ari added to Dinner\. Not saved yet\. Not on the roster for Dinner: rostered 10:00 to 15:00\./.test(await page(p)), 'roster: the words say it as he is added');
  await click(p, '[data-p="tm-add-staff"]');
  await p.locator('[data-k="tm-quick-person:cy"]').setChecked(true); await L.settle(p, 150);
  await p.locator('[data-k="tm-quick-shift:lunch"]').setChecked(true); await L.settle(p, 150);
  await click(p, '[data-p="tm-quick-add"]');
  ok(/Not on the roster for this: Cy\./.test(await page(p)) && await p.$eval('.tm-person-row[data-id="cy"] .tm-roster-flag', e => e.textContent).catch(() => '') === 'Not on the roster this day', 'roster: Cy, not on the roster at all, is added and flagged: Not on the roster this day');
  ok(await p.locator('.tm-roster-flag').count() === 2, 'roster: only Ari and Cy are flagged');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, TEAM, 6000);
  ok(/Not on the roster: Ari \(Dinner\), Cy \(Lunch\)\./.test(await page(p)) && (await saved(p)).on.some(o => o.id === 'cy'), 'roster: Save is never stopped, and its words name who is off the roster');
  ok(p.errors.length === 0, 'roster: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // a day with no roster hours flags nobody
  p = await admin(b, 1280, { on: ON.map(o => ({ id: o.id, sh: o.sh, sec: o.sec })) }); await ready(p);
  await L.pick(p, 'select[data-k="tm-addsvc:ari"]', 'dinner');
  ok(!await p.locator('.tm-roster-flag').count() && !/Not on the roster/.test(await page(p)), 'roster: a day planned without the roster file flags nobody');
  await p.context().close();

  // 6. a plan saved with nobody on: the chef is asked to set today's team again
  p = await L.open(b, '#/', { who: 'sam', extra: fixture({ on: [], br: [] }), wait: 1500 });
  ok(await p.locator('.nb-tmset').count() > 0 || /Today's team, not set yet/.test(await p.evaluate(() => [...document.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join(' | '))), 'Not set: with nobody on the saved plan, the sous chef is asked to set today\'s team');
  await p.context().close();

  // 8. the row actions (step two, 16 Nov 2026), on a phone: Add a service, Take off with a second tap, Undo in place
  // that puts back the section, the breaks that went and roster hours, a last service leaving its Undo where the row
  // was, + Break's focus; (6) Take off keeping a break another service they keep still holds (17 Nov 2026)
  const MO_ON = ON.map(o => o.id === 'mo' && o.sh === 'lunch' ? Object.assign({}, o, { sec: 'grill' }) : o);
  const MO_BR = [{ id: 'mo', sh: 'lunch', at: 735, len: 30 }, { id: 'mo', sh: 'dinner', at: 1125, len: 30 }];
  p = await admin(b, 390, { on: MO_ON, br: MO_BR }); await ready(p);
  await L.pick(p, 'select[data-k="tm-addsvc:bea"]', 'smoker');
  ok(await lines(p, 'bea') === 'smoker,lunch' && await p.locator('select[data-k="tm-sec:bea:smoker"]').count() === 1 && /(^|\n)Bea added to Smoker\. Not saved yet\.(\n|$)/.test(await page(p)), 'Add a service: one pick puts Bea on Smoker, before Lunch in time order, with its own Section picker, and says Bea added to Smoker. Not saved yet.');
  ok(!(await options(p, 'tm-addsvc:bea')).some(o => /^Smoker/.test(o)), 'Add a service: Smoker leaves Bea\'s Add a service once she is on it');
  // (6) Bea's break at 14:00 is held by Smoker and Lunch (both 11:00 to 15:00), saved on Smoker, the earlier service:
  // taken off Smoker, it stays, now held by Lunch
  await addBreak(p, 'bea');
  ok(await bval(p, 'bea') === '840', 'Take off keeps: Bea\'s break is 14:00, the first time left today');
  const beaOff = '[data-p="tm-off"][data-id="bea"][data-sh="smoker"]';
  await click(p, beaOff); await click(p, beaOff);
  ok(await lines(p, 'bea') === 'lunch' && await bval(p, 'bea') === '840' && /Bea taken off Smoker\. Their break 14:00 stays\. Not saved yet\./.test(await page(p)) && await words(p, 'bea') === 'Rostered hours: 11:00 to 15:00 · Break 14:00 to 14:30', 'Take off keeps: Bea taken off Smoker keeps her 14:00 break, still inside her Lunch hours, and the words say it stays');
  ok(/^Bea taken off Smoker\. Not saved yet\./.test(await p.$eval('.tm-tlrow[data-id="bea"] .tm-tlundo', e => e.innerText)), 'Take off keeps: her Undo line names no break, as none went');
  await click(p, '[data-p="tm-off-undo"][data-id="bea"]');
  ok(await lines(p, 'bea') === 'smoker,lunch' && await bval(p, 'bea') === '840' && await p.locator('select[data-k^="tm-bat:bea:"]').count() === 1, 'Take off keeps: Undo puts Bea back on Smoker with one break, not two');
  // Take off: the first tap only asks again; the second takes the service and its breaks off, Mo's other services stay
  const off = '[data-p="tm-off"][data-id="mo"][data-sh="lunch"]';
  ok(await p.$eval(off, e => e.textContent) === 'Take off Lunch', 'Take off: each service line says which service it takes off');
  await click(p, off);
  ok(await p.$eval(off, e => e.textContent + ' | ' + e.getAttribute('aria-label')) === 'Tap again to take off | Tap again to take Mo off Lunch' && await lines(p, 'mo') === 'lunch,adl,dinner', 'Take off: the first tap only asks again, in words, and Mo stays on Lunch');
  await click(p, off);
  ok(await lines(p, 'mo') === 'adl,dinner' && await p.locator('select[data-k^="tm-bat:mo:"]').count() === 1 && await bval(p, 'mo') === '1125', 'Take off: the second tap takes Mo off Lunch and his 12:15 break, which only Lunch held; his Dinner and its break stay');
  ok(/Mo taken off Lunch\. Break 12:15 to 12:45 goes too\. Not saved yet\./.test(await page(p)) && await words(p, 'mo') === 'Rostered hours: 15:00 to 21:00 · Break 18:45 to 19:15', 'Take off: the words say what goes, and his day loses the Lunch part (' + await words(p, 'mo') + ')');
  ok(await focused(p) === 'tm-off-undo:mo' && await p.locator('.tm-tlrow[data-id="mo"] [data-p="tm-off-undo"]').count() === 1, 'Take off: the focus moves to Undo, in Mo\'s row (' + await focused(p) + ')');
  await click(p, '[data-p="tm-off-undo"][data-id="mo"]');
  ok(await lines(p, 'mo') === 'lunch,adl,dinner' && await value(p, 'tm-sec:mo:lunch') === 'grill' && await bval(p, 'mo') === '735' && await words(p, 'mo') === 'Rostered hours: 10:00 to 21:00 · Break 12:15 to 12:45, 2nd break 18:45 to 19:15', 'Undo: Mo is back on Lunch with Grill, his 12:15 break and his roster hours, 10:00 to 21:00 again (' + await words(p, 'mo') + ')');
  ok(/Undone: Mo is back on Lunch with their section and breaks\. Not saved yet\./.test(await page(p)) && !await p.locator('[data-p="tm-off-undo"]').count(), 'Undo: the words say what came back, and the Undo line goes');
  ok(await focused(p) === 'tm-off:mo:lunch', 'Undo: the focus goes back to Take off Lunch (' + await focused(p) + ')');
  // a person's last service: the row leaves its Undo line where it was, between Bea and Mo
  const devOff = '[data-p="tm-off"][data-id="dev"][data-sh="lunch"]';
  await click(p, devOff); await click(p, devOff);
  ok(await p.$$eval('ul.tm-plan > li.tm-person-row', l => l.map(e => e.getAttribute('data-id')).join()) === 'sam,ari,bea,dev,mo' && !await p.locator('.tm-tlrow[data-id="dev"]').count() && await p.locator('li.tm-tlgone[data-id="dev"] [data-p="tm-off-undo"]').count() === 1, 'last service: Dev\'s row leaves an Undo line in its place, between Bea and Mo');
  ok(/Dev taken off Lunch\. Not saved yet\. Dev is not on this day now: Undo, or Add staff, puts them back\./.test(await page(p)) && await focused(p) === 'tm-off-undo:dev', 'last service: the words say Dev is not on this day now and how to put him back, with the focus on Undo');
  await click(p, '[data-p="tm-off-undo"][data-id="dev"]');
  ok(await lines(p, 'dev') === 'lunch' && await words(p, 'dev') === 'Rostered hours: 12:00 to 15:00 · No break yet', 'last service: Undo brings Dev\'s row back with his roster hours (' + await words(p, 'dev') + ')');
  // + Break: the focus moves to the new break's time picker, the next thing to choose
  await addBreak(p, 'dev');
  ok(await focused(p) === await bk(p, 'dev') && /^tm-bat:dev:\d+:0$/.test(await focused(p)), '+ Break: the focus moves to the new break\'s time picker (' + await focused(p) + ')');
  ok(await writes(p) === 0, 'row actions: nothing is written before Save');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, TEAM, 6000);
  const after = await saved(p), sig = l => l.map(x => JSON.stringify(x)).sort().join(' ');
  ok(sig(after.on.filter(o => o.id === 'mo')) === sig(MO_ON.filter(o => o.id === 'mo')) && sig(after.br.filter(x => x.id === 'mo')) === sig(MO_BR), 'Undo then Save: Mo\'s services, section, breaks and roster hours are saved as they were (' + sig(after.on.filter(o => o.id === 'mo')) + ')');
  const beaSm = after.on.find(o => o.id === 'bea' && o.sh === 'smoker'), devOn = after.on.find(o => o.id === 'dev');
  ok(beaSm && beaSm.from === 660 && beaSm.to === 900 && devOn && devOn.from === 720 && devOn.to === 900 && after.br.some(x => x.id === 'dev' && x.sh === 'lunch' && x.at >= 840) && after.br.some(x => x.id === 'bea' && x.at === 840 && ['lunch', 'smoker'].includes(x.sh)), 'Save: Bea\'s Smoker with her roster hours and her 14:00 break, Dev back on Lunch with his roster hours and a new break no earlier than 14:00');
  ok(p.errors.length === 0 && !await L.overflow(p), 'row actions: no page errors and no sideways scroll at 390 px ' + p.errors.join(' | '));
  await p.context().close();

  // 9. found by the test rewrite (16 Nov 2026), each failing first: a stale Undo, and + Break copying the last break
  p = await admin(b); await ready(p);
  await click(p, '[data-p="tm-off"][data-id="mo"][data-sh="lunch"]'); await click(p, '[data-p="tm-off"][data-id="mo"][data-sh="lunch"]');
  ok(await p.locator('.tm-tlrow[data-id="mo"] .tm-tlundo').count() === 1, 'stale Undo: Mo taken off Lunch shows the Undo line');
  await L.pick(p, 'select[data-k="tm-addsvc:mo"]', 'lunch'); await L.settle(p, 200);
  ok(!await p.locator('.tm-tlundo').count() && await p.locator('select[data-k="tm-sec:mo:lunch"]').count() === 1, 'stale Undo: putting Mo back on Lunch with Add a service takes the Undo line away');
  // today, 14:00: Dev's break moved to 14:30, the end of his hours; + 2nd break has only 14:00 left, against it. An hour
  // clear is wanted only where the day allows it, so 14:00 is still offered, never "no time left"
  await addBreak(p, 'dev');
  await bpick(p, 'dev', 0, 870);
  await addBreak(p, 'dev');
  const devToday = [await bval(p, 'dev', 0), await bval(p, 'dev', 1)];
  ok(devToday[0] === '840' && devToday[1] === '870' && await said(p, 'Dev') === 'Dev: break 14:00 to 14:30, the first time left today. Not saved yet.', '+ 2nd break today: with Dev\'s break at 14:30, the only time left, 14:00, is given, never a copy or "no time left" (' + devToday.join(', ') + '; ' + (await said(p, 'Dev') || ((await page(p)).match(/No time left[^\n]*/) || [''])[0]) + ')');
  ok(p.errors.length === 0, 'found by the rewrite: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // tomorrow: the same, with the day free: the second break takes a free time an hour clear of the first, never a copy
  p = await admin(b); await ready(p);
  await L.teamDay(p, tomorrow); await readyNext(p);
  await addBreak(p, 'dev');
  await bpick(p, 'dev', 0, 870);
  await addBreak(p, 'dev');
  const devTwo = [await bval(p, 'dev', 0), await bval(p, 'dev', 1)];
  // the breaks read in time order, so the new one comes first
  ok(devTwo[1] === '870' && devTwo[0] !== '870' && +devTwo[0] + 30 + 60 <= 870, '+ 2nd break: with Dev\'s break at 14:30, the end of his hours, a second break takes a free time an hour before it, never a copy (' + devTwo.join(', ') + ')');
  ok(p.errors.length === 0, 'found by the rewrite, tomorrow: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
