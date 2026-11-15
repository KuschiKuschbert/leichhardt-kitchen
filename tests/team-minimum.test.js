// Too few on the plan at a busy time (head chef, 15 Nov 2026, docs/team-minimum-options/brief.md, the council's mix).
// The head chef sets a busy time and the people needed then on each shift in Admin, Kitchen, Shifts. Today's team says
// in one line of its Save dock when the plan leaves fewer on that shift and not on a break, and marks whose break it is.
// A warning only. From the draft and the shifts already on the phone: no read. Made-up people and the stand-in only.
const L = require('./lib');
const { R, ok, txt } = Object.assign(L.results(), { txt: L.txt });
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), tomorrow = L.ymd(new Date(L.NOW + 86400000)), yesterday = L.ymd(new Date(L.NOW - 86400000));
const CFG = key('config', 'main'), TEAM = key('team', today);
const MIN = 60000, AT = m => L.NOW + (m - 840) * MIN;   // L.NOW is 14:00 kitchen time: AT(1110) is 18:30
const people = [{ id: 'gus', name: 'Gus', role: 'head', active: true, add: true, tick: true, del: true }, { id: 'sam', name: 'Sam K', role: 'sous', active: true, add: true, tick: true, del: true },
  ...['Ari', 'Bea', 'Cal', 'Dev', 'Eli', 'Fen', 'Gia', 'Hal'].map(n => ({ id: n.toLowerCase(), name: n, role: 'staff', active: true, add: true, tick: true }))];
const secs = ['Grill', 'Pans', 'Larder', 'Fryer', 'Dessert', 'Pass'].map(n => ({ id: n.toLowerCase(), name: n }));
const BUSY = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false, busy: { from: 720, to: 840, n: 3 } }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260, off: false, busy: { from: 1050, to: 1230, n: 6 } }];
const PLAIN = BUSY.map(s => ({ id: s.id, name: s.name, from: s.from, to: s.to, off: false }));
// the study's made-up day (docs/team-minimum-options/data.js): 8 on Dinner; four meal breaks overlap from 18:15
const ON = [['sam', 'lunch', ''], ['sam', 'dinner', ''], ['ari', 'lunch', 'grill'], ['ari', 'dinner', 'grill'], ['bea', 'lunch', 'pans'], ['bea', 'dinner', 'pans'], ['cal', 'lunch', 'dessert'], ['dev', 'dinner', 'fryer'],
  ['eli', 'lunch', 'larder'], ['eli', 'dinner', 'pass'], ['fen', 'dinner', 'dessert'], ['gia', 'lunch', 'fryer'], ['gia', 'dinner', 'larder'], ['hal', 'dinner', 'larder']].map(([id, sh, sec]) => ({ id, sh, sec }));
const BR = [['ari', 'dinner', 870, 150], ['bea', 'dinner', 870, 150], ['eli', 'lunch', 780, 30], ['gia', 'dinner', 900, 150], ['dev', 'dinner', 1095, 30], ['fen', 'dinner', 1095, 45], ['hal', 'dinner', 1110, 30], ['sam', 'dinner', 1110, 30]]
  .map(([id, sh, at, len]) => ({ id, sh, at, len }));
const plan = (day, on, br) => ({ day, on: on || ON, br: br || BR, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' });
const fixture = (x, more) => Object.assign({ [CFG]: Object.assign({ people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: BUSY, kitSecs: secs }, x || {}), [TEAM]: plan(today) }, more || {});
const store = p => p.evaluate(() => window.__fake.dump());
const reads = p => p.evaluate(() => window.__fake.reads.filter(k => /\/(team|teamsum|config)\//.test(k)).length);
const line = p => p.evaluate(() => { const e = document.querySelector('.tm-short-line'); return e && !e.hidden ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
const marks = p => p.$$eval('.tm-short-mark:not([hidden])', l => l.map(e => e.dataset.id));
const ready = p => L.waitFor(p, () => document.querySelectorAll('.tm-grid-row').length >= 7, null, 9000);
async function focusAt(p, time) { await p.context().clock.setSystemTime(time); await p.evaluate(() => window.dispatchEvent(new Event('focus'))); await L.settle(p, 150); }

(async () => {
  const b = await L.start();

  // 1. The setting: Admin, Kitchen, Shifts. A half-chosen busy time says so and is not saved; a whole one is, and the
  //    row says it; a People save afterwards keeps it.
  let p = await L.open(b, '#/admin', { admin: true, width: 390, adminPage: '', wait: 2500, extra: fixture({ kitShifts: PLAIN }) });
  await L.kitchenRow(p, 'shifts');
  const setTime = (k, i, v) => p.evaluate(([k, i, v]) => { const e = document.querySelector('[data-a="' + k + '"][data-i="' + i + '"]'); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }, [k, i, v]);
  ok(await p.locator('[data-a="shbfrom"][data-i="1"]').count() === 1 && await p.locator('select[data-a="shneed"][data-i="1"]').count() === 1, 'setting: each shift has Busy time from, to and People needed then');
  await setTime('shbfrom', 1, '17:30'); await L.settle(p, 200);
  ok(/Not saved until all three are set/.test(await txt(p, '.a-sh-bnote') || ''), 'setting: a half-chosen busy time says it is not saved yet');
  await setTime('shbto', 1, '17:00'); await L.pick(p, 'select[data-a="shneed"][data-i="1"]', '6'); await L.settle(p, 200);
  ok(/From must be before its To/.test(await txt(p, '.a-sh-bnote') || ''), 'setting: a back-to-front busy time says so');
  await setTime('shbto', 1, '20:30'); await L.settle(p, 200);
  ok(!await p.locator('.a-sh-bnote').count(), 'setting: a whole busy time has no note');
  await p.locator('[data-p="a-save"]').click(); await L.settle(p, 1200);
  let cfg = (await store(p))[CFG];
  ok(JSON.stringify(cfg.kitShifts) === JSON.stringify([PLAIN[0], Object.assign({}, PLAIN[1], { busy: { from: 1050, to: 1230, n: 6 } })]), 'setting: saved on Dinner only, Lunch without a busy time (' + JSON.stringify(cfg.kitShifts) + ')');
  ok(/Dinner 15:00 to 21:00 \(busy 17:30 to 20:30, 6 needed\)/.test(await txt(p, '[data-p="k-row"][data-r="shifts"]') || ''), 'setting: the Shifts row says the busy time');
  ok(p.errors.length === 0, 'setting: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // an admin People save (a name changed) keeps every shift's busy time
  p = await L.open(b, '#/admin', { admin: true, width: 1280, adminPage: 'people', wait: 2500, extra: fixture() });
  await L.adminTab(p, 'people');
  await p.fill('[data-a="name"][data-i="2"]', 'Ari B'); await p.keyboard.press('Tab');
  await p.click('[data-p="a-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k]?.people?.[2]?.name === 'Ari B', CFG, 10000);
  cfg = (await store(p))[CFG];
  ok(JSON.stringify(cfg.kitShifts.map(s => s.busy)) === JSON.stringify(BUSY.map(s => s.busy)), 'People save: the shifts keep their busy times (' + JSON.stringify(cfg.kitShifts.map(s => s.busy)) + ')');
  await p.context().close();

  // 2. The head chef's Today's team at 18:30: the line in the Save dock, the marks, and the dock's own saved words
  //    stepping aside while the line shows. No read for any of it.
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: 390, extra: fixture(), clock: AT(1110), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(await line(p) === 'Saved plan: too few now until 19:00. 4 now, 5 from 18:45, 6 needed. Move a marked break.', 'line: when, how many and the need, from the saved plan (' + await line(p) + ')');
  ok(JSON.stringify(await marks(p)) === JSON.stringify(['sam', 'dev', 'fen', 'hal']), 'marks: the four away in the short time (' + (await marks(p)).join(',') + ')');
  ok(await p.$eval('.tm-focus-save .tm-save-state', e => e.hidden) && /Saved 13:00/.test(await txt(p, '.tm-draftstate') || ''), 'dock: its own saved words step aside; the notebook head still says Saved');
  ok(await p.$eval('.tm-short-line b', e => getComputedStyle(e).color) !== await p.$eval('.tm-short-line', e => getComputedStyle(e).color), 'line: its first words stand out (attention orange), the rest in ink');
  const r0 = await reads(p);

  // 3. A half-done fix: Sam K's break moves to 19:30. The line follows at once and says Unsaved; Sam K's mark holds
  //    while his panel is open and goes on Close details.
  await p.locator('[data-p="tm-focus"][data-id="sam"]').click(); await L.settle(p, 200);
  await L.pick(p, 'select[data-k="tm-at:sam:0"]', '1170'); await L.settle(p, 200);
  ok(await line(p) === 'Unsaved plan: too few now until 18:45. 5 now, 6 needed. Move a marked break.', 'half-done fix: still too few until 18:45, said as Unsaved (' + await line(p) + ')');
  ok(JSON.stringify(await marks(p)) === JSON.stringify(['sam', 'dev', 'fen', 'hal']), 'hold: the marks stay still while a Breaks panel is open');
  await p.locator('[data-p="tm-focus-close"]').click(); await L.settle(p, 200);
  ok(JSON.stringify(await marks(p)) === JSON.stringify(['dev', 'fen', 'hal']), 'hold: Close details brings the marks up to date (' + (await marks(p)).join(',') + ')');
  ok(!await p.$eval('.tm-focus-save .tm-save-state', e => e.hidden), 'dock: with unsaved changes its own words show again');
  // the rest of the fix and Save: the line goes, no marks
  await p.locator('[data-p="tm-focus"][data-id="hal"]').click(); await L.settle(p, 200);
  await L.pick(p, 'select[data-k="tm-at:hal:0"]', '1140'); await L.settle(p, 200);
  ok(await line(p) === '', 'full fix: the line goes as soon as the draft has enough');
  await p.locator('[data-p="tm-focus-close"]').click(); await L.settle(p, 150);
  await p.locator('[data-p="tm-save"]').click();
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, TEAM, 8000);
  ok(!(await marks(p)).length && await line(p) === '' && !await p.$eval('.tm-focus-save .tm-save-state', e => e.hidden), 'Save: no line, no marks, the dock says Saved');
  ok(await reads(p) === r0, 'reads: the line and the marks add no read');
  ok(p.errors.length === 0, 'head chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 4. The clock passes the end of a short time while a draft is open: the line and marks go by the minute paint,
  //    the Save button and the inputs are the same nodes, the draft is kept, no read.
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture(), clock: AT(1139), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(/too few now until 19:00\. 5 now, 6 needed/.test(await line(p)), 'sous chef at 18:59: the line shows on #/team too (' + await line(p) + ')');
  await L.pick(p, 'select[data-k="tm-sec:cal:lunch"]', 'grill'); await L.settle(p, 150);
  await p.evaluate(() => { window.__saveProbe = document.querySelector('[data-p="tm-save"]'); window.__cellProbe = document.querySelector('select[data-k="tm-sec:ari:dinner"]'); });
  const r1 = await reads(p);
  await p.clock.fastForward(60000); await L.settle(p, 200);
  ok(await line(p) === '' && !(await marks(p)).length, 'clock: at 19:00 the short time is over, the line and the marks go by themselves');
  ok(await p.evaluate(() => window.__saveProbe === document.querySelector('[data-p="tm-save"]') && window.__cellProbe === document.querySelector('select[data-k="tm-sec:ari:dinner"]')), 'clock: the minute paint leaves the Save button and the pickers in place');
  ok(await p.$eval('select[data-k="tm-sec:cal:lunch"]', e => e.value) === 'grill' && !await p.$eval('[data-p="tm-save"]', e => e.disabled), 'clock: the unsaved draft is kept');
  ok(await reads(p) === r1, 'clock: no read');
  ok(p.errors.length === 0, 'sous chef: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 5. Roster hours: Dev, Fen and Hal start at 17:00, so a 15:00 to 17:30 busy time is short until they come in.
  //    A Function shift over Dinner does not count for Dinner.
  const late = ON.map(o => ['dev', 'fen', 'hal'].includes(o.id) ? Object.assign({}, o, { from: 1020, to: 1260 }) : o).concat([{ id: 'cal', sh: 'fn', sec: '' }]);
  // with Cal counted from 16:00 the short time would end at 16:00; with the whole of Dinner for the late starters, 8 are on
  const shifts5 = [BUSY[0], Object.assign({}, BUSY[1], { busy: { from: 900, to: 1050, n: 6 } }), { id: 'fn', name: 'Function', from: 960, to: 1260, off: false }];
  p = await L.open(b, '#/team', { who: 'sam', width: 1280, extra: fixture({ kitShifts: shifts5 }, { [TEAM]: plan(today, late, []) }), clock: AT(900), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(await line(p) === 'Saved plan: too few now until 17:00. Only 5 on Dinner, 6 needed. Add people.', 'roster hours: late starters count from 17:00; Cal on the Function shift does not count for Dinner (' + await line(p) + ')');
  ok(!(await marks(p)).length, 'short roster with nobody on a break: nobody is marked');
  await p.context().close();

  // 6. A short roster says so, never blames one break; a planned day counts the whole day; a past day and a kitchen
  //    with no busy time say nothing.
  const quiet = ON.filter(o => o.sh === 'lunch' || ['sam', 'dev', 'hal'].includes(o.id)), quietBr = BR.filter(x => ['sam', 'dev', 'hal', 'eli'].includes(x.id));
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({}, { [TEAM]: plan(today, quiet, quietBr) }), clock: AT(1110), wait: 1800 });
  await ready(p).catch(() => {}); await L.waitFor(p, () => document.querySelectorAll('.tm-grid-row').length >= 4, null, 9000); await L.settle(p, 300);
  ok(await line(p) === 'Saved plan: too few now until 20:30. Only 3 on Dinner (0 now with breaks), 6 needed. Add people or move a marked break.', 'short roster: said as such, with the lowest count (' + await line(p) + ')');
  await L.teamDay(p, tomorrow); await L.settle(p, 300);
  ok(await line(p) === '', 'planned day with nobody on it: nothing to warn');
  await p.context().close();
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({}, { [key('team', tomorrow)]: plan(tomorrow) }), clock: AT(840), wait: 1800 });
  await ready(p); await L.teamDay(p, tomorrow); await L.waitFor(p, () => document.querySelectorAll('.tm-grid-row').length >= 7, null, 9000); await L.settle(p, 300);
  ok(await line(p) === 'Saved plan: too few 18:30 to 19:00. 4 from 18:30, 5 from 18:45, 6 needed. Move a marked break.', 'planned day: the whole day, with real times (' + await line(p) + ')');
  await p.context().close();
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({ kitShifts: PLAIN }), clock: AT(1110), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(await line(p) === '' && !(await marks(p)).length && !await p.$eval('.tm-focus-save .tm-save-state', e => e.hidden), 'no busy time set: no line, no marks, the dock as before');
  await p.context().close();

  // 7. Two short times: the line names the first and gives the next one's time; only the first one's people are marked.
  //    A busy time on a shift with no hours, and someone on it without roster hours, says it cannot check.
  const two = BR.map(x => ['ari', 'bea', 'gia'].includes(x.id) ? Object.assign({}, x, { at: 1185, len: 30 }) : x);
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({}, { [TEAM]: plan(today, ON, two) }), clock: AT(1020), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(await line(p) === 'Saved plan: too few 18:30 to 19:00. 4 from 18:30, 5 from 18:45, 6 needed. Move a marked break. Next: 19:45 to 20:15.', 'two short times: the first, then the next one\'s time (' + await line(p) + ')');
  ok(JSON.stringify(await marks(p)) === JSON.stringify(['sam', 'dev', 'fen', 'hal']), 'two short times: only the first one\'s people are marked (' + (await marks(p)).join(',') + ')');
  await p.context().close();
  const noHours = BUSY.map(s => s.id === 'dinner' ? Object.assign({}, s, { from: null, to: null }) : s);
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({ kitShifts: noHours }), clock: AT(1110), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(await line(p) === 'Can\'t check the Dinner busy time: Dinner has no hours set.', 'no hours: says it cannot check, never a count (' + await line(p) + ')');
  await p.context().close();

  // 8. A refused Save keeps the draft and the line says Unsaved
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture(), clock: AT(1110), wait: 1800, fakeMode: 'fail' });
  await ready(p); await L.settle(p, 300);
  await p.locator('[data-p="tm-focus"][data-id="sam"]').click(); await L.settle(p, 200);
  await L.pick(p, 'select[data-k="tm-at:sam:0"]', '1170'); await L.settle(p, 200);
  await p.locator('[data-p="tm-save"]').click(); await L.settle(p, 1500);
  ok(/^Unsaved plan: too few now until 18:45/.test(await line(p)) && /Not saved/.test(await txt(p, '.tm-focus-save') || '') && !await p.$eval('.tm-focus-save .tm-save-state', e => e.hidden), 'refused Save: the draft is kept, the dock says Not saved and the line says Unsaved (' + await line(p) + ')');
  await p.context().close();

  // 9. Words from the kitchen's settings are text, never markup
  const odd = BUSY.map(s => s.id === 'dinner' ? Object.assign({}, s, { name: '<img src=x onerror=window.__x=1>Dinner' }) : s);
  const quiet2 = ON.filter(o => o.sh === 'lunch' || ['sam', 'dev', 'hal'].includes(o.id));
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({ kitShifts: odd }, { [TEAM]: plan(today, quiet2, []) }), clock: AT(1110), wait: 1800 });
  await L.waitFor(p, () => document.querySelectorAll('.tm-grid-row').length >= 4, null, 9000); await L.settle(p, 300);
  ok(/Only 3 on <img src=x onerror=window.__x=1>Dinner, 6 needed\. Add people\.$/.test(await line(p)) && !await p.evaluate(() => window.__x) && !await p.locator('.tm-short-line img').count(), 'safe text: a shift name is shown as typed, never run (' + await line(p) + ')');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
