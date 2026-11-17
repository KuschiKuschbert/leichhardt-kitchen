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
const BUSY = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false, occ: false, busy: { from: 720, to: 840, n: 3 } }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260, off: false, occ: true, busy: { from: 1050, to: 1230, n: 6 } }];
const PLAIN = BUSY.map(s => ({ id: s.id, name: s.name, from: s.from, to: s.to, off: false, occ: false }));
// the study's made-up day (docs/team-minimum-options/data.js): 8 on Dinner; four meal breaks overlap from 18:15
const ON = [['sam', 'lunch', ''], ['sam', 'dinner', ''], ['ari', 'lunch', 'grill'], ['ari', 'dinner', 'grill'], ['bea', 'lunch', 'pans'], ['bea', 'dinner', 'pans'], ['cal', 'lunch', 'dessert'], ['dev', 'dinner', 'fryer'],
  ['eli', 'lunch', 'larder'], ['eli', 'dinner', 'pass'], ['fen', 'dinner', 'dessert'], ['gia', 'lunch', 'fryer'], ['gia', 'dinner', 'larder'], ['hal', 'dinner', 'larder']].map(([id, sh, sec]) => ({ id, sh, sec }));
const BR = [['ari', 'dinner', 870, 150], ['bea', 'dinner', 870, 150], ['eli', 'lunch', 780, 30], ['gia', 'dinner', 900, 150], ['dev', 'dinner', 1095, 30], ['fen', 'dinner', 1095, 45], ['hal', 'dinner', 1110, 30], ['sam', 'dinner', 1110, 30]]
  .map(([id, sh, at, len]) => ({ id, sh, at, len }));
const plan = (day, on, br) => ({ day, on: on || ON, br: br || BR, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'gus' });
const fixture = (x, more) => Object.assign({ [CFG]: Object.assign({ people, headId: 'gus', sousIds: ['sam'], staffIds: people.map(p => p.id), kitShifts: BUSY, kitSecs: secs }, x || {}), [TEAM]: plan(today) }, more || {});
const store = p => p.evaluate(() => window.__fake.dump());
const reads = p => p.evaluate(() => window.__fake.reads.filter(k => /\/(team|teamsum|config)\//.test(k)).length);
// the band's words (16 Nov 2026: the fact, then why; the link and Accept are read on their own)
const line = p => p.evaluate(() => { const e = document.querySelector('.tm-short-line'); return e && !e.hidden ? [...e.querySelectorAll('.tm-short-fact, .tm-short-why, .tm-short-words')].map(x => x.innerText.replace(/\s+/g, ' ').trim()).join(' ') : ''; });
const goLink = p => p.evaluate(() => { const e = document.querySelector('.tm-short-line [data-p="tm-short-go"]'); return e ? e.innerText.trim() : ''; });
const acceptBtn = p => p.evaluate(() => { const e = document.querySelector('.tm-short-line [data-p="tm-short-ok"]'); return e ? e.innerText.trim() : ''; });
// the marks sit in each row's name column (rows on one clock, 16 Nov 2026); a mark in another person's row reads as "!"
const marks = p => p.$$eval('.tm-short-mark:not([hidden])', l => l.map(e => { const row = e.closest('.tm-tlrow'); return row && e.closest('.tm-grid-who') && row.dataset.id === e.dataset.id ? e.dataset.id : '!' + e.dataset.id; }));
const rows = n => p => L.waitFor(p, n => document.querySelectorAll('.tm-tlrow').length >= n, n, 9000);
const ready = rows(7);
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
  await p.locator('[data-a="shocc"][data-i="1"]').check();
  await p.locator('[data-p="a-save"]').click(); await L.settle(p, 1200);
  let cfg = (await store(p))[CFG];
  ok(JSON.stringify(cfg.kitShifts) === JSON.stringify([PLAIN[0], Object.assign({}, PLAIN[1], { occ: true, busy: { from: 1050, to: 1230, n: 6 } })]), 'setting: Dinner keeps its busy time and hidden setting together, Lunch without either (' + JSON.stringify(cfg.kitShifts) + ')');
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
  ok(JSON.stringify(cfg.kitShifts.map(s => s.occ)) === JSON.stringify(BUSY.map(s => s.occ)), 'People save: the shifts also keep their hidden settings');
  await p.context().close();

  // 2. The head chef's Today's team at 18:30: the line in the Save dock, the marks, and the dock's own saved words
  //    stepping aside while the line shows. No read for any of it.
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: 390, extra: fixture(), clock: AT(1110), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(await line(p) === 'Too few now until 19:00: 4 on, 6 needed', 'band: the fact first, when, how many and the need, from the saved plan (' + await line(p) + ')');
  ok(await goLink(p) === 'Go to Sam K\u2019s break' && await acceptBtn(p) === 'Accept 4 on', 'band: the fix first, then Accept, on one row (' + await goLink(p) + ' / ' + await acceptBtn(p) + ')');
  ok(JSON.stringify(await marks(p)) === JSON.stringify(['sam', 'dev', 'fen', 'hal']), 'marks: the four away in the short time (' + (await marks(p)).join(',') + ')');
  ok(await p.$eval('.tm-focus-save .tm-save-state', e => e.hidden) && /Saved 13:00/.test(await txt(p, '.tm-draftstate') || ''), 'dock: its own saved words step aside; the notebook head still says Saved');
  ok(await p.$eval('.tm-short-tf', e => getComputedStyle(e).color) !== await p.$eval('.tm-short-fact', e => getComputedStyle(e).color), 'band: "Too few" stands out (attention orange), the rest in ink');
  const r0 = await reads(p);

  // 3. A half-done fix: Sam K's Dinner break moves to 19:30 in his own row. The line follows at once and says Unsaved.
  //    The Breaks panel and its hold went with the rows (16 Nov 2026): Sam K's mark goes on the same draw, in his name
  //    column, and the picker he just used stays where his thumb is (the hold's reason: a row never moves under a thumb).
  //    The thumb check fails on the 16 Nov build at 390 px: the mark's line goes and the picker moves up 19 px.
  //    One break per person (17 Nov 2026): his only break's time picker on his break line, tm-bat:sam:<at>:0, whatever
  //    its start is now (the key follows the break's start)
  const samAt = 'select[data-k^="tm-bat:sam:"]', halAt = 'select[data-k^="tm-bat:hal:"]';
  const thumb = () => p.$eval(samAt, e => Math.round(e.nextElementSibling.getBoundingClientRect().top + scrollY));
  const thumbBefore = await thumb();
  await L.pick(p, samAt, '1170'); await L.settle(p, 200);
  ok(await line(p) === 'Not saved yet. Too few now until 18:45: 5 on, 6 needed', 'half-done fix: still too few until 18:45, said as Not saved yet (' + await line(p) + ')');
  ok(JSON.stringify(await marks(p)) === JSON.stringify(['dev', 'fen', 'hal']), 'marks: Sam K\'s mark goes with his moved break; the others stay in their own rows (' + (await marks(p)).join(',') + ')');
  ok(await thumb() === thumbBefore, 'marks: Sam K\'s break picker stays where it was when his mark goes (' + thumbBefore + ' to ' + await thumb() + ')');
  ok(await p.$eval('.tm-focus-save .tm-save-state', e => e.hidden) && /Unsaved changes/.test(await txt(p, '.tm-draftstate') || ''), 'dock: the band says Not saved yet, so the dock\'s own words step aside; the notebook head says it too');
  // the rest of the fix and Save: the line goes, no marks
  await L.pick(p, halAt, '1140'); await L.settle(p, 200);
  ok(await line(p) === '', 'full fix: the line goes as soon as the draft has enough');
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
  ok(/Too few now until 19:00: 5 on, 6 needed/.test(await line(p)), 'sous chef at 18:59: the band shows on #/team too (' + await line(p) + ')');
  await L.pick(p, 'select[data-k="tm-sec:cal:lunch"]', 'grill'); await L.settle(p, 150);
  // a section picker and a break picker in the rows: the minute paint must not rebuild either
  await p.evaluate(() => { window.__saveProbe = document.querySelector('[data-p="tm-save"]'); window.__cellProbe = document.querySelector('select[data-k="tm-sec:ari:dinner"]'); window.__breakProbe = document.querySelector('select[data-k^="tm-bat:hal:"]'); });
  const r1 = await reads(p);
  await p.clock.fastForward(60000); await L.settle(p, 200);
  ok(await line(p) === '' && !(await marks(p)).length, 'clock: at 19:00 the short time is over, the line and the marks go by themselves');
  ok(await p.evaluate(() => window.__saveProbe === document.querySelector('[data-p="tm-save"]') && window.__cellProbe === document.querySelector('select[data-k="tm-sec:ari:dinner"]') && !!window.__breakProbe && window.__breakProbe === document.querySelector('select[data-k^="tm-bat:hal:"]')), 'clock: the minute paint leaves the Save button, the section and the break pickers in place');
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
  ok(await line(p) === 'Too few now until 17:00: 5 on, 6 needed Only 5 on Dinner.', 'roster hours: late starters count from 17:00; Cal on the Function shift does not count for Dinner (' + await line(p) + ')');
  ok(!(await marks(p)).length && await goLink(p) === '' && await acceptBtn(p) === 'Accept 5 on', 'short roster with nobody on a break: nobody is marked, no break to go to, Accept still offered');
  await p.context().close();

  // 6. A short roster says so, never blames one break; a planned day counts the whole day; a past day and a kitchen
  //    with no busy time say nothing.
  const quiet = ON.filter(o => o.sh === 'lunch' || ['sam', 'dev', 'hal'].includes(o.id)), quietBr = BR.filter(x => ['sam', 'dev', 'hal', 'eli'].includes(x.id));
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({}, { [TEAM]: plan(today, quiet, quietBr) }), clock: AT(1110), wait: 1800 });
  await rows(4)(p); await L.settle(p, 300);
  ok(await line(p) === 'Too few now until 20:30: 0 on, 6 needed Only 3 on Dinner.', 'short roster: said as such, with the lowest count (' + await line(p) + ')');
  await L.teamDay(p, tomorrow); await L.settle(p, 300);
  ok(await line(p) === '', 'planned day with nobody on it: nothing to warn');
  await p.context().close();
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({}, { [key('team', tomorrow)]: plan(tomorrow) }), clock: AT(840), wait: 1800 });
  await ready(p); await L.teamDay(p, tomorrow); await ready(p); await L.settle(p, 300);
  ok(await line(p) === 'Too few 18:30 to 19:00: 4 on, 6 needed', 'planned day: the whole day, with real times (' + await line(p) + ')');
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
  ok(await line(p) === 'Too few 18:30 to 19:00: 4 on, 6 needed Next: 19:45 to 20:15.', 'two short times: the first, then the next one\'s time (' + await line(p) + ')');
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
  await L.pick(p, samAt, '1170'); await L.settle(p, 200);
  await p.locator('[data-p="tm-save"]').click(); await L.settle(p, 1500);
  ok(/^Not saved yet\. Too few now until 18:45/.test(await line(p)) && /Not saved/.test(await txt(p, '.tm-focus-save') || '') && !await p.$eval('.tm-focus-save .tm-save-state', e => e.hidden), 'refused Save: the draft is kept, the dock says Not saved and the band says Not saved yet (' + await line(p) + ')');
  await p.context().close();

  // 9. Words from the kitchen's settings are text, never markup
  const odd = BUSY.map(s => s.id === 'dinner' ? Object.assign({}, s, { name: '<img src=x onerror=window.__x=1>Dinner' }) : s);
  const quiet2 = ON.filter(o => o.sh === 'lunch' || ['sam', 'dev', 'hal'].includes(o.id));
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({ kitShifts: odd }, { [TEAM]: plan(today, quiet2, []) }), clock: AT(1110), wait: 1800 });
  await rows(4)(p); await L.settle(p, 300);
  ok(/Only 3 on <img src=x onerror=window.__x=1>Dinner\.$/.test(await line(p)) && !await p.evaluate(() => window.__x) && !await p.locator('.tm-short-line img').count(), 'safe text: a shift name is shown as typed, never run (' + await line(p) + ')');
  await p.context().close();

  // 11. Accept for today (head chef, 16 Nov 2026, docs/team-short-ok-options/brief.md). Accept goes into the plan and
  //     Save shares it; Undo before Save leaves nothing to save; once saved it is one quiet line with who and when, the
  //     marks turn grey, and it still covers the short time a minute later. Undo then Save takes it off. A plan made
  //     worse brings the band back and says who saved it; a tap on an Accept that changed under the finger is refused;
  //     Go to <name>'s break moves to each marked break in turn. The clock not ready keeps acceptances; a fixed plan
  //     clears them. None of it reads. On the old code there is no Accept at all: the first check fails.
  const okRow = (x) => Object.assign({ sh: 'dinner', from: 1110, to: 1140, n: 6, low: 4, by: 'gus', at: AT(1080) }, x || {});
  const bandBtn = (p, k) => p.locator('.tm-short-line [data-p="' + k + '"]');
  const dockWords = p => txt(p, '.tm-focus-save');
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: 390, extra: fixture(), clock: AT(1110), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  const r11 = await reads(p);
  ok(await bandBtn(p, 'tm-short-ok').count() === 1, 'accept: the band offers Accept 4 on beside the fix');
  await bandBtn(p, 'tm-short-ok').click(); await L.settle(p, 200);
  ok(await line(p) === 'Not saved yet: 4 on, 6 needed, accepted until 19:00 today Tap Save to share it with the chefs.', 'accept: it goes into the plan and says it is not saved yet (' + await line(p) + ')');
  ok(!await p.$eval('[data-p="tm-save"]', e => e.disabled) && !(await store(p))[TEAM].ok, 'accept: Save turns on; nothing is written yet');
  ok(await p.$eval('.tm-short-band', e => getComputedStyle(e).borderLeftStyle) === 'dashed', 'accept: the waiting band has a dashed edge, a cue that is not colour');
  await bandBtn(p, 'tm-short-undo').click(); await L.settle(p, 200);
  ok(await line(p) === 'Too few now until 19:00: 4 on, 6 needed' && await p.$eval('[data-p="tm-save"]', e => e.disabled), 'accept: Undo before Save puts the band back, with nothing to save');
  await bandBtn(p, 'tm-short-ok').click(); await L.settle(p, 200);
  await p.locator('[data-p="tm-save"]').click();
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, TEAM, 8000); await L.settle(p, 300);
  let doc = (await store(p))[TEAM];
  ok(JSON.stringify(doc.ok) === JSON.stringify([okRow({ at: doc.upd })]), 'accept: Save shares it with the plan, stamped with the save (' + JSON.stringify(doc.ok) + ')');
  ok(await line(p) === 'Accepted until 19:00 today: 4 on, 6 needed. By Gus at 18:30.', 'accepted: one quiet line, who and when (' + await line(p) + ')');
  ok(/Accepted for the chefs: 4 on, 6 needed, 18:30 to 19:00\./.test(await dockWords(p) || ''), 'accepted: the Save words say what was accepted');
  const grey = await p.$$eval('.tm-short-mark:not([hidden])', l => l.map(e => e.dataset.id + ':' + e.textContent + ':' + e.classList.contains('is-accepted')));
  ok(grey[0] === 'sam:Break 18:30, too few, accepted:true' && grey.length === 4, 'accepted: the marks stay, grey, with each break\'s time (' + grey.join(' | ') + ')');
  await focusAt(p, AT(1111));
  ok(await line(p) === 'Accepted until 19:00 today: 4 on, 6 needed. By Gus at 18:30.', 'accepted: a minute later the trimmed short time is still covered (' + await line(p) + ')');
  await bandBtn(p, 'tm-short-undo').click(); await L.settle(p, 200);
  ok(await line(p) === 'Not saved yet. Too few now until 19:00: 4 on, 6 needed Acceptance undone.', 'undo: the band comes back and says the acceptance is undone (' + await line(p) + ')');
  await p.locator('[data-p="tm-save"]').click();
  await L.waitFor(p, k => window.__fake.dump()[k].v === 3, TEAM, 8000); await L.settle(p, 300);
  doc = (await store(p))[TEAM];
  ok(!('ok' in doc) && /Acceptance undone: 18:30 to 19:00\./.test(await dockWords(p) || ''), 'undo: Save takes it off the plan and says so (' + JSON.stringify(doc.ok) + ')');
  ok(await reads(p) === r11, 'accept: no read for any of it');
  ok(p.errors.length === 0, 'accept: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // a plan made worse after the acceptance: Eli's Dinner break at 18:30 too, saved by Sam K at 18:10
  const worseBr = BR.concat([{ id: 'eli', sh: 'dinner', at: 1110, len: 30 }]);
  const worse = Object.assign(plan(today, ON, worseBr), { ok: [okRow()], v: 2, upd: AT(1090), by: 'sam' });
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({}, { [TEAM]: worse }), clock: AT(1110), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(await line(p) === 'Too few now until 19:00: 3 on, 6 needed At 18:00 Gus accepted 4 on. Sam K’s save at 18:10 left 3 on.', 'worse: the band comes back and says who saved it (' + await line(p) + ')');
  ok(await acceptBtn(p) === 'Accept 3 on' && (await marks(p)).length === 5, 'worse: Accept offers the new count; all five away are marked');
  // the minute paint changed the band under the finger: the button's own times no longer match, so the tap is refused
  await p.evaluate(() => { document.querySelector('.tm-short-line [data-p="tm-short-ok"]').setAttribute('data-low', '4'); });
  await bandBtn(p, 'tm-short-ok').click(); await L.settle(p, 200);
  ok(/Not accepted: the short time changed as you tapped/.test(await dockWords(p) || '') && await p.$eval('[data-p="tm-save"]', e => e.disabled), 'refused tap: a changed short time is not accepted, and says so');
  // Go to <name>'s break: each marked person in row order, their break picker in view and focused
  await bandBtn(p, 'tm-short-go').click(); await L.settle(p, 200);
  const here = () => p.evaluate(() => { const r = document.querySelector('.tm-tlrow.is-short-here'), a = document.activeElement, f = a && a.getBoundingClientRect(), d = document.querySelector('.tm-focus-save').getBoundingClientRect(), h = document.querySelector('.tm-planhead').getBoundingClientRect();
    return { row: r && r.dataset.id, focus: a && a.closest('.tm-tlrow') ? a.closest('.tm-tlrow').dataset.id : '', clear: !!f && f.top >= h.bottom - 1 && f.bottom <= d.top + 1 }; });
  let h1 = await here();
  ok(h1.row === 'sam' && h1.focus === 'sam' && h1.clear && await goLink(p) === 'Next: Dev’s break (2 of 5)', 'go to: Sam K\'s row first, his break picker focused, clear of the list head and the dock (' + JSON.stringify(h1) + ', ' + await goLink(p) + ')');
  await bandBtn(p, 'tm-short-go').click(); await L.settle(p, 200);
  h1 = await here();
  ok(h1.row === 'dev' && h1.focus === 'dev' && h1.clear && await goLink(p) === 'Next: Eli’s break (3 of 5)', 'go to: then Dev\'s (' + JSON.stringify(h1) + ', ' + await goLink(p) + ')');
  ok(p.errors.length === 0, 'worse: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // the kitchen clock not ready at Save: acceptances are kept; a plan fixed where it was accepted clears it at Save
  const accepted = Object.assign(plan(today), { ok: [okRow()], v: 2, upd: AT(1085) });
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: 390, extra: fixture({}, { [TEAM]: accepted }), clock: AT(1110), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(await line(p) === 'Accepted until 19:00 today: 4 on, 6 needed. By Gus at 18:00.', 'accepted on another phone: the quiet line from the saved plan (' + await line(p) + ')');
  await L.pick(p, 'select[data-k="tm-sec:cal:lunch"]', 'grill'); await L.settle(p, 150);
  await p.evaluate(() => { window.LK_TIME.ready = () => false; });
  await p.locator('[data-p="tm-save"]').click();
  await L.waitFor(p, k => window.__fake.dump()[k].v === 3, TEAM, 8000);
  ok(JSON.stringify((await store(p))[TEAM].ok) === JSON.stringify([okRow()]), 'clock not ready: Save keeps the acceptance as it was');
  await p.context().close();
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: 390, extra: fixture({}, { [TEAM]: accepted }), clock: AT(1110), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  await L.pick(p, samAt, '1170'); await L.settle(p, 150);
  await L.pick(p, halAt, '1140'); await L.settle(p, 150);
  ok(await line(p) === '', 'fixed: with enough on, the band goes');
  await p.locator('[data-p="tm-save"]').click();
  await L.waitFor(p, k => window.__fake.dump()[k].v === 3, TEAM, 8000); await L.settle(p, 300);
  ok(!('ok' in (await store(p))[TEAM]) && /No longer too few at 18:30 to 19:00, so its acceptance is cleared\./.test(await dockWords(p) || ''), 'fixed: Save clears the acceptance and says why');
  ok(p.errors.length === 0, 'fixed: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // 10. The On break now board ends above the Save dock on the head chef's phone (Board above the dock, 16 Nov 2026).
  //     Admin, Team, Today's team at 390 x 844 and scroll 0, four on a break at 18:30: every name, the board's words, the
  //     dock's words and Save show on the first screen, with the too few line and without it, and all six when six are
  //     away. Measured in the book's own fonts (Barlow, Barlow Condensed, Caveat), as the phones show them: the stand-in
  //     fonts are wider on GitHub's runner and wrap the board (16 Nov 2026). If they cannot load here, the check says so
  //     and measures nothing. On the old code the dock covered Sam K while the line showed (3 of 4 names; 3 of 6 with six
  //     away). From 720 px the admin heading is as before (compared in the same fonts, so any font will do).
  const board = p => p.evaluate(() => {
    const dock = document.querySelector('.tm-focus-save').getBoundingClientRect(), save = document.querySelector('.tm-focus-save [data-p="tm-save"]').getBoundingClientRect();
    const names = [...document.querySelectorAll('.tm-away-row')], words = s => { const e = document.querySelector(s); return e && !e.hidden && e.getClientRects().length ? e.innerText.replace(/\s+/g, ' ').trim() : ''; };
    return { scroll: Math.round(scrollY), dockTop: Math.round(dock.top), saveIn: save.top >= 0 && save.bottom <= dock.bottom + .5 && dock.bottom <= innerHeight + .5,
      above: names.filter(e => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= dock.top + .5; }).map(e => e.querySelector('.tm-away-name').innerText.trim()),
      lastBottom: names.length ? Math.round(names[names.length - 1].getBoundingClientRect().bottom) : 0, head: words('.tm-away .tm-away-head'),
      state: words('.tm-focus-save .tm-save-state'), line: words('.tm-focus-save .tm-short-line') };
  });
  // the order of the board, the notebook head, the date and the rows, top to bottom
  const sequence = p => p.evaluate(() => [['board', '.tm-away'], ['head', '.tm-nhead'], ['date', '.tm-date-controls'], ['editor', '.tm-editor']].map(([n, s]) => [n, document.querySelector(s).getBoundingClientRect().top]).sort((a, b) => a[1] - b[1]).map(x => x[0]).join(','));
  const bookFonts = async p => {
    await p.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
    const css = await p.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&family=Caveat:wght@700&display=swap' }).then(() => true, () => false);
    const got = css && await p.evaluate(() => Promise.race([Promise.all(['400 13px Barlow', '600 13px Barlow', '700 13px Barlow', '700 16px "Barlow Condensed"', '700 16px Caveat'].map(f => document.fonts.load(f))).then(r => r.every(x => x.length > 0)), new Promise(r => setTimeout(() => r(false), 8000))]));
    if (got) { await p.evaluate(() => document.fonts.ready); await L.settle(p, 300); }
    return got;
  };
  // six away at 18:30: Eli and Gia take their Dinner break then too
  const six = BR.filter(x => !['eli', 'gia'].includes(x.id) || x.sh !== 'dinner').concat(['eli', 'gia'].map(id => ({ id, sh: 'dinner', at: 1110, len: 30 })));
  for (const [label, shifts, br, names] of [['with the too few line', BUSY, BR, ['Dev', 'Fen', 'Hal', 'Sam K']], ['without it', PLAIN, BR, ['Dev', 'Fen', 'Hal', 'Sam K']], ['six away, with the too few line', BUSY, six, ['Dev', 'Eli', 'Fen', 'Gia', 'Hal', 'Sam K']]]) {
    p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: 390, height: 844, extra: fixture({ kitShifts: shifts }, { [TEAM]: plan(today, ON, br) }), clock: AT(1110), wait: 1800 });
    await ready(p); await L.waitFor(p, n => document.querySelectorAll('.tm-away-row').length >= n, names.length, 9000); await L.settle(p, 300);
    if (!await bookFonts(p)) { ok(true, 'board above the dock, admin 390, ' + label + ': the book\'s fonts could not load here, the board was not measured'); await p.context().close(); continue; }
    const m = await board(p);
    ok(m.scroll === 0 && JSON.stringify([...m.above].sort()) === JSON.stringify(names), 'board above the dock, admin 390, ' + label + ', in Barlow: all ' + names.length + ' names end above the Save dock (' + m.above.join(', ') + '; last name ends at ' + m.lastBottom + ' px, the dock starts at ' + m.dockTop + ' px)');
    ok(/On break now/i.test(m.head) && m.saveIn && (shifts === BUSY ? /^Too few now until 19:00/.test(m.line) && !m.state : /^Saved 13:00/.test(m.state) && !m.line), 'board above the dock, admin 390, ' + label + ': the board\'s words, the dock\'s words and Save all show (' + (m.line || m.state) + ')');
    ok(!await L.overflow(p) && p.errors.length === 0, 'board above the dock, admin 390, ' + label + ': no sideways scroll, no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  for (const width of [768, 1280]) {
    p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width, extra: fixture(), clock: AT(1110), wait: 1800 });
    await ready(p); await L.settle(p, 300);
    const head = () => p.evaluate(() => { const h = document.querySelector('.ad-heading'), t = h.querySelector('.ad-title'), s = getComputedStyle(h); return [Math.round(h.getBoundingClientRect().height), getComputedStyle(t).fontSize, s.borderBottomWidth, getComputedStyle(h.querySelector('.ad-eyebrow')).textTransform].join(' '); });
    const plan = await head(), m = await board(p), order = await sequence(p);
    await L.adminTab(p, 'people'); await L.settle(p, 300);
    const other = await head();
    ok(plan === other && m.above.length === 4, 'board above the dock, admin ' + width + ': the Team heading is the same on Today\'s team as on People (' + plan + ' / ' + other + '), all four names show');
    ok(order === 'head,date,board,editor', 'short phones, admin ' + width + ': the board stays under the notebook head and the date (' + order + ')');
    await p.context().close();
  }

  // 11. Short phones (head chef, 16 Nov 2026, the brief's Short phones): on every phone the board sits at the top of
  //     Today's team, above the notebook head and the date, which stays directly above the rows. A 375 x 667 or 360 x 740
  //     phone then shows all four names above the Save dock, on the admin page and in the chef panel, while the too few
  //     line shows. In the book's fonts, as part 10. On the old code the admin page at 375 x 667 showed none of the four.
  for (const [w, h] of [[375, 667], [360, 740]]) for (const [label, hash, o] of [['admin', '#/admin', { admin: true, adminPage: 'plan' }], ['chef panel', '#/chef', { who: 'sam' }]]) {
    p = await L.open(b, hash, Object.assign({ width: w, height: h, extra: fixture(), clock: AT(1110), wait: 1800 }, o));
    if (hash === '#/chef') {
      await L.waitFor(p, () => !!document.querySelector('[data-p="c-group"][data-g="team"]'), null, 8000);
      await p.locator('[data-p="c-group"][data-g="team"]').click(); await L.settle(p, 300);
      const tab = p.locator('[data-p="c-tab"][data-t="plan"]'); if (await tab.getAttribute('aria-pressed') !== 'true') await tab.click();
    }
    await ready(p); await L.waitFor(p, () => document.querySelectorAll('.tm-away-row').length >= 4, null, 9000); await L.settle(p, 300);
    if (!await bookFonts(p)) { ok(true, 'short phones, ' + label + ' ' + w + ' x ' + h + ': the book\'s fonts could not load here, the board was not measured'); await p.context().close(); continue; }
    const m = await board(p), order = await sequence(p);
    ok(m.scroll === 0 && JSON.stringify([...m.above].sort()) === JSON.stringify(['Dev', 'Fen', 'Hal', 'Sam K']), 'short phones, ' + label + ' ' + w + ' x ' + h + ', in Barlow: all 4 names end above the Save dock (' + m.above.join(', ') + '; last name ends at ' + m.lastBottom + ' px, the dock starts at ' + m.dockTop + ' px)');
    ok(order === 'board,head,date,editor' && m.saveIn && /^Too few now until 19:00/.test(m.line), 'short phones, ' + label + ' ' + w + ' x ' + h + ': the board, then the notebook head, the date and the rows; the too few line and Save show (' + order + ')');
    ok(!await L.overflow(p) && p.errors.length === 0, 'short phones, ' + label + ' ' + w + ' x ' + h + ': no sideways scroll, no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 12. One break per person (17 Nov 2026, docs/team-one-break-options/brief.md): a break belongs to the person's day.
  //     (a) Ari's split saved on Lunch from 14:00 runs to 18:00, into Dinner's busy time from 17:30: with Bea's and Eli's
  //     Dinner breaks at 17:30 it leaves 5 on, and Ari is marked with the split's own time. On the 16 Nov build the mark
  //     matched only breaks saved on the short shift and read "Break, too few", with no time.
  const lunchSplit = [{ id: 'ari', sh: 'lunch', at: 840, len: 240 }, { id: 'bea', sh: 'dinner', at: 1050, len: 30 }, { id: 'eli', sh: 'dinner', at: 1050, len: 30 }];
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({}, { [TEAM]: plan(today, ON, lunchSplit) }), clock: AT(1050), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(await line(p) === 'Too few now until 18:00: 5 on, 6 needed', 'one break per person: a split saved on Lunch that runs into Dinner\'s busy time counts (' + await line(p) + ')');
  ok(JSON.stringify(await marks(p)) === JSON.stringify(['ari', 'bea', 'eli']) && await txt(p, '.tm-short-mark[data-id="ari"]') === 'Split 14:00, too few', 'one break per person: Ari is marked with his Lunch-saved split and its time (' + (await marks(p)).join(',') + ' / ' + await txt(p, '.tm-short-mark[data-id="ari"]') + ')');
  ok(p.errors.length === 0, 'one break per person, too few: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  //     (b) Sam K has two breaks, Lunch at 12:30 and Dinner at 18:30: Go to Sam K's break focuses the one in the short
  //     time, on his break line (tm-short-go carries the short time, data-from and data-to)
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'plan', width: 390, extra: fixture({}, { [TEAM]: plan(today, ON, BR.concat([{ id: 'sam', sh: 'lunch', at: 750, len: 30 }])) }), clock: AT(1110), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(await goLink(p) === 'Go to Sam K\u2019s break' && await p.$$eval('select[data-k^="tm-bat:sam:"]', l => l.length) === 2, 'go to, two breaks: the band offers Sam K\'s break, and he has two break pickers');
  await p.locator('.tm-short-line [data-p="tm-short-go"]').click(); await L.settle(p, 200);
  const goFocus = await p.evaluate(() => { const a = document.activeElement, s = document.querySelector('select[data-k^="tm-bat:sam:1110:"]'); return { ok: !!s && (a === s || a === s._uxTrigger || a === s.nextElementSibling) && !!a.closest('.tm-brline'), at: a ? (a._uxSource || a).getAttribute('data-k') || a.tagName : 'none' }; });
  ok(goFocus.ok, 'go to, two breaks: the focus lands on the 18:30 break in the short time, not his 12:30 one (' + goFocus.at + ')');
  ok(p.errors.length === 0, 'go to, two breaks: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  //     (c) a break that leaves a service with nobody else on says so in that person's sentence, and only then: Cal and
  //     Eli alone on Lunch, both at 12:30; Eli's moved to 13:00 and the words go
  const words = (p, id) => txt(p, '.tm-tlrow[data-id="' + id + '"] .tm-roster-time');
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture({}, { [TEAM]: plan(today, [{ id: 'cal', sh: 'lunch', sec: 'grill' }, { id: 'eli', sh: 'lunch', sec: 'larder' }], [{ id: 'cal', sh: 'lunch', at: 750, len: 30 }, { id: 'eli', sh: 'lunch', at: 750, len: 30 }]) }), wait: 1800 });
  await rows(2)(p); await L.settle(p, 300);
  ok(await words(p, 'cal') === 'Lunch hours 10:00 to 15:00 \u00b7 Break 12:30 to 13:00 (nobody else on Lunch 12:30 to 13:00)' && /\(nobody else on Lunch 12:30 to 13:00\)$/.test(await words(p, 'eli') || ''), 'nobody else on: both breaks at 12:30 leave Lunch empty, and each sentence says so (' + await words(p, 'cal') + ')');
  await L.pick(p, 'select[data-k^="tm-bat:eli:"]', '780'); await L.settle(p, 200);
  ok(await words(p, 'cal') === 'Lunch hours 10:00 to 15:00 \u00b7 Break 12:30 to 13:00' && await words(p, 'eli') === 'Lunch hours 10:00 to 15:00 \u00b7 Break 13:00 to 13:30', 'nobody else on: once Eli\'s break moves to 13:00, neither sentence says it (' + await words(p, 'cal') + ' / ' + await words(p, 'eli') + ')');
  ok(p.errors.length === 0, 'nobody else on: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // and the study's day, where every service keeps people on through each break, never says it
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: fixture(), clock: AT(1110), wait: 1800 });
  await ready(p); await L.settle(p, 300);
  ok(!await p.$$eval('.tm-tlrow .tm-roster-time', l => l.some(e => /nobody else on/.test(e.textContent))), 'nobody else on: a day with people on through every break says it nowhere');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
