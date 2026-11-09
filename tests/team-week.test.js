// Dated section planning: a future plan must never become today's live team.
const L = require('./lib');
const fs = require('fs'), path = require('path');
const { R, ok } = L.results(), { txt, tap } = L;
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const dateAt = n => L.ymd(new Date(L.NOW + n * 86400000));
const today = dateAt(0), tomorrow = dateAt(1), later = dateAt(2), nextWeek = dateAt(7), yesterday = dateAt(-1);
const TEAM = key(['team', today]), CFG = key(['config', 'main']);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true }
];
const secs = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'larder', name: 'Larder' }];
const shifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }];
const plan = (day, x) => Object.assign({ day,
  on: [{ id: 'ann', sh: 'lunch', sec: day === today ? 'grill' : 'pans' }, { id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'bo', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'pans' }],
  br: [{ id: 'ann', sh: 'lunch', at: 825, len: 45 }],
  v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' }, x || {});
const fixture = () => Object.assign({ [CFG]: { people, staffIds: ['sam', 'ann', 'bo'], sousIds: ['sam'], kitSecs: secs, kitShifts: shifts, pastEdit: { t: 10 } },
  [key(['teamsum', 'main'])]: { day: today, days: [], usual: {
    [new Date(L.NOW).getDay() + '|lunch']: { sam: ['grill', 6, 8] },
    [new Date(L.NOW + 86400000).getDay() + '|lunch']: { sam: ['larder', 6, 8] }
  }, learn: {} } },
  Object.fromEntries([today, tomorrow, later, nextWeek, yesterday].map(d => [key(['team', d]), plan(d)])));
const fullDate = d => new Date(d + 'T12:00:00+10:00').toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'long', day: 'numeric', month: 'long' });
const click = async (p, s) => { const found = await tap(p, s); await L.settle(p, 120); return found; };
const read = (p, d) => p.evaluate(k => window.__fake.dump()[k], key(['team', d]));
const assignment = (p, person, sh, sec) => click(p, '[data-p="tm-sh"][data-v="' + sh + '"]').then(() => L.pick(p, 'select[data-k="tm-sec:' + person + '"]', sec));
const rowSection = (p, id) => p.$eval('select[data-k="tm-sec:' + id + '"]', e => e.value);
const savedSection = (rec, id, sh) => (rec.on.find(x => x.id === id && x.sh === sh) || {}).sec;
const selected = p => p.$eval('[data-p="tm-day"][aria-pressed="true"]', e => e.getAttribute('data-day'));
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('.tm-weeknav') && !!document.querySelector('.tm-work [data-p="tm-whole"]'), null, 7000); }
async function goDate(p, d, edit = true) {
  for (let tries = 0; tries < 12; tries++) {
    const ds = await p.$$eval('[data-p="tm-day"]', all => all.map(e => e.getAttribute('data-day')).sort());
    if (ds.includes(d)) { await click(p, '[data-p="tm-day"][data-day="' + d + '"]'); break; }
    await click(p, '[data-p="' + (d < ds[0] ? 'tm-week-prev' : 'tm-week-next') + '"]');
  }
  await L.waitFor(p, d => !!document.querySelector('[data-p="tm-day"][data-day="' + d + '"][aria-pressed="true"]'), d, 6000);
  if (edit) await ready(p);
}
const sdk = fs.readFileSync(path.join(__dirname, 'fake', 'firebase-firestore.js'), 'utf8').replace('export function getDocsFromServer(ref) {', `export function getDocsFromServer(ref) {
  if (/\\/team$/.test(key(ref.path))) {
    window.__fake.teamQueries = window.__fake.teamQueries || [];
    window.__fake.teamQueries.push(ref.c || []);
  }`);
const heldWeekSDK = sdk.replace('export function getDocsFromServer(ref) {', `export function getDocsFromServer(ref) {
  if (/\\/team$/.test(key(ref.path)) && !window.__fake.firstWeekHeld) {
    window.__fake.firstWeekHeld = true;
    return getDocsFromServer(ref).then(snapshot => new Promise(resolve => {
      window.__fake.releaseInitialWeek = () => resolve(snapshot);
    }));
  }`);

(async () => {
  const browser = await L.start();
  let p = await L.open(browser, '#/team', { who: 'sam', extra: fixture(), fakeSDK: { 'firebase-firestore.js': sdk }, wait: 1000 });
  await ready(p);
  const originalToday = await read(p, today), originalCfg = await p.evaluate(k => window.__fake.dump()[k], CFG);
  ok(await selected(p) === today, 'opening: Today is selected and the week has seven date buttons');
  ok(await p.$$eval('[data-p="tm-day"]', es => es.length) === 7 && /On break now/.test(await txt(p, '.tm-away-slot') || ''), 'opening: seven days share the notebook and today keeps the saved break board');
  await goDate(p, tomorrow);
  ok((await txt(p, '.tm-page') || '').includes(fullDate(tomorrow)) && (await txt(p, '[data-p="tm-save"]') || '').includes(fullDate(tomorrow)), 'future date: editor and Save identify the full selected date');
  ok(!/On break now|Nobody scheduled away/.test(await txt(p, '.tm-away-slot') || ''), 'future date: a future plan is never presented as current break status');
  ok(/Usually Larder/.test(await txt(p, '.tm-work') || '') && !/Usually Grill/.test(await txt(p, '.tm-work') || ''), 'usual sections: future hints use the selected weekday rather than today');
  await assignment(p, 'ann', 'lunch', 'grill');
  await assignment(p, 'ann', 'dinner', 'larder');
  await goDate(p, later);
  await assignment(p, 'bo', 'lunch', 'pans');
  await goDate(p, tomorrow);
  await click(p, '[data-p="tm-whole"]');
  const whole = await txt(p, '.tm-work') || '';
  ok(/Ann/.test(whole) && /Grill/.test(whole) && /Larder/.test(whole) && /Draft|not saved/i.test(whole), 'drafts: tomorrow retains Lunch and Dinner edits through another date and Whole day');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, key(['team', tomorrow]), 6000);
  const out = await read(p, tomorrow);
  ok(savedSection(out, 'ann', 'lunch') === 'grill' && savedSection(out, 'ann', 'dinner') === 'larder' && JSON.stringify(out.br) === JSON.stringify(plan(tomorrow).br), 'Save: only the selected date receives both shift edits and retains its meal break');
  ok((await txt(p, '.tm-save') || '').includes(fullDate(tomorrow)) && /saved/i.test(await txt(p, '.tm-save') || ''), 'Save acknowledgement names the future date after the server answers');
  ok(JSON.stringify(await read(p, today)) === JSON.stringify(originalToday) && await p.evaluate(([k, value]) => window.__fake.dump()[k].pastEdit.t === value, [CFG, originalCfg.pastEdit.t]), 'isolation: saving a future date preserves today and its live-team stamp');
  await goDate(p, later);
  await click(p, '[data-p="tm-sh"][data-v="lunch"]');
  ok(await rowSection(p, 'bo') === 'pans' && !await p.$eval('[data-p="tm-save"]', e => e.disabled), 'drafts: saving tomorrow does not discard the other date\'s unsaved section');
  await click(p, '[data-p="tm-today"]');
  await ready(p);
  ok(await selected(p) === today && /Ann|14:30/.test(await txt(p, '.tm-away-slot') || ''), 'Today returns directly to the unchanged live saved plan');
  ok(await p.evaluate(() => window.LK_PREP.unsaved() && window.LK_PREP.dirtyForUpdate()), 'protected work: a hidden future-date draft still blocks reload and destructive Update');
  await goDate(p, nextWeek);
  await goDate(p, tomorrow);
  const queryInfo = await p.evaluate(() => ({ queries: window.__fake.teamQueries || [], reads: window.__fake.reads.filter(k => /\/team(?:\/|$)/.test(k)) }));
  ok(queryInfo.queries.length >= 2 && queryInfo.queries.every(q => q.some(x => x.k === 'where' && x.f === 'day' && x.op === '>=') && q.some(x => x.k === 'where' && x.f === 'day' && x.op === '<=')), 'read policy: each new week uses one bounded date-range query');
  ok(queryInfo.reads.every(k => !/\/team\//.test(k) || k.endsWith('/' + today)), 'read policy: future dates are not fetched one document at a time');
  const beforeReuse = await p.evaluate(() => (window.__fake.teamQueries || []).length);
  await goDate(p, later); await goDate(p, tomorrow);
  ok(await p.evaluate(() => (window.__fake.teamQueries || []).length) === beforeReuse, 'read policy: selecting loaded dates reuses that week without extra queries');
  await goDate(p, later); await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, key(['team', later]), 6000);
  await p.reload(); await ready(p); await goDate(p, tomorrow);
  await click(p, '[data-p="tm-whole"]');
  ok(/Grill/.test(await txt(p, '.tm-work') || '') && /Larder/.test(await txt(p, '.tm-work') || '') && (await read(p, tomorrow)).v === 2, 'reload: the future plan survives a fresh page and is read from its own dated record');
  await goDate(p, yesterday, false);
  ok(/read.only|past|saved/i.test(await txt(p, '.tm-page') || '') && !(await p.$('[data-p="tm-save"]')) && !(await p.$('.tm-person-section')), 'past dates: the saved plan is browsable without editing or Save controls');
  ok(p.errors.length === 0, 'dated planning: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // A newer save on one date protects that date, while the losing chef's draft remains on screen.
  p = await L.open(browser, '#/team', { who: 'sam', extra: fixture(), wait: 900 }); await ready(p); await goDate(p, tomorrow);
  await assignment(p, 'ann', 'lunch', 'grill');
  await p.evaluate(([k, rec]) => window.__fake.write(k, rec), [key(['team', tomorrow]), plan(tomorrow, { v: 2, upd: L.NOW + 60000 })]);
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, () => /Not saved|not save/i.test((document.querySelector('.tm-save') || {}).textContent || ''), null, 6000);
  ok((await read(p, tomorrow)).v === 2 && savedSection(await read(p, tomorrow), 'ann', 'lunch') === 'pans', 'conflict: another chef\'s newer future plan is not overwritten');
  ok(await rowSection(p, 'ann') === 'grill', 'conflict: the losing future section edit remains recoverable');
  await click(p, '[data-p="tm-refresh"]');
  ok(await rowSection(p, 'ann') === 'grill', 'Refresh requires confirmation before discarding a future-date draft');
  await click(p, '[data-p="tm-refresh"]'); await ready(p);
  ok(await p.$eval('[data-p="tm-save"]', e => e.disabled) && await rowSection(p, 'ann') === 'pans', 'Refresh confirmation loads the winning plan for that date');
  ok(p.errors.length === 0, 'conflicts: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // Copying next week's same weekday must use today as its source, rather than today minus seven.
  const emptyFuture = fixture(); emptyFuture[key(['team', nextWeek])] = undefined;
  p = await L.open(browser, '#/team', { who: 'sam', extra: emptyFuture, wait: 900 }); await ready(p); await goDate(p, nextWeek);
  ok(!!(await p.$('[data-p="tm-use"]')), 'copy: an empty selected future day offers Same as last weekday');
  await p.locator('details.tm-batch > summary').click(); await click(p, '[data-p="tm-use"]');
  await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:ann"]'), null, 6000);
  ok(await rowSection(p, 'ann') === 'grill' && !await p.$eval('[data-p="tm-save"]', e => e.disabled), 'copy: next week copies today\'s dated plan into an unsaved draft');
  ok(!await read(p, nextWeek) && JSON.stringify(await read(p, today)) === JSON.stringify(plan(today)), 'copy: neither source nor destination is saved automatically');
  ok(p.errors.length === 0, 'copy: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(browser, '#/team', { who: 'sam', extra: fixture(), wait: 900 }); await ready(p); await goDate(p, tomorrow);
  await assignment(p, 'ann', 'lunch', 'grill');
  await p.evaluate(() => { window.__fake.mode = 'fail'; });
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, () => /Not saved|not save|Try again/i.test((document.querySelector('.tm-save') || {}).textContent || ''), null, 6000);
  ok((await read(p, tomorrow)).v === 1 && await rowSection(p, 'ann') === 'grill', 'failed Save: a lost connection preserves the future draft and the last confirmed record');
  await p.evaluate(() => { window.__fake.mode = 'ok'; });
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, key(['team', tomorrow]), 6000);
  ok(savedSection(await read(p, tomorrow), 'ann', 'lunch') === 'grill', 'failed Save: retry sends the retained draft to the correct future date');
  await p.context().close();

  // A query denied or lost to the signal cannot turn every missing future date into a blank editable plan.
  for (const failure of [{ failReads: '/team$' }, { cold: '/team$' }]) {
    p = await L.open(browser, '#/team', Object.assign({ who: 'sam', extra: fixture(), wait: 900 }, failure));
    await L.waitFor(p, () => !!document.querySelector('.tm-weeknav'), null, 6000);
    await goDate(p, tomorrow, false);
    const words = await txt(p, '.tm-page') || '';
    ok(/Could not|could not|Check|Try again/.test(words) && !(await p.$('.tm-person-section')), (failure.cold ? 'offline' : 'failed') + ' week: unknown dates have an error and no assignment controls');
    ok(!(await p.$('[data-p="tm-save"]')) || await p.$eval('[data-p="tm-save"]', e => e.disabled), 'unknown future plan cannot be saved as empty');
    ok(p.errors.length === 0, 'failed week: no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // A staff member still consumes only today's plan, even when different future sections are already saved.
  p = await L.open(browser, '#/prep', { who: 'ann', extra: fixture(), wait: 1100 });
  await L.waitFor(p, () => !!document.querySelector('.nb-tmday'), null, 6000);
  ok(/Grill/.test(await txt(p, '.nb-tmday') || '') && !/Pans/.test(await txt(p, '.nb-tmday') || ''), 'staff: today\'s section default remains Grill when a future record says Pans');
  ok(await p.evaluate(() => !window.__fake.bill.some(x => /\/team$/.test(x.path))), 'staff: opening service does not read a planning week');
  await p.evaluate(() => { location.hash = '#/team'; }); await L.settle(p, 400);
  ok(!(await p.$('.tm-weeknav')) && !(await p.$('[data-p="tm-save"]')), 'staff: the week planner and Save remain chef-only');
  ok(p.errors.length === 0, 'staff isolation: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // A scheduled lock hides all dates, then restores the original chef's hidden-date draft with the same PIN.
  p = await L.open(browser, '#/team', { who: 'sam', extra: fixture(), deviceMode: 'shared', touch: true, wait: 900 }); await ready(p);
  await goDate(p, tomorrow); await assignment(p, 'ann', 'lunch', 'grill');
  await click(p, '[data-p="tm-today"]'); await ready(p);
  await p.clock.runFor(11 * 60000); await L.settle(p, 250);
  ok(await p.evaluate(() => !LK_PREP.privateAccess() && LK_PREP.dirtyForUpdate()) && !(await p.$('.tm-weeknav')) && !!(await p.$('#pf1')), 'privacy lock: hidden future work stays protected while all planning dates disappear');
  const sameChef = p.locator('.p-name[data-id="sam"]');
  if (await sameChef.count() && await sameChef.isVisible()) { await sameChef.click(); await L.settle(p, 120); }
  await p.fill('#pf1', '1111');
  await L.waitFor(p, () => LK_PREP.privateAccess() && LK_PREP.state.who === 'sam', null, 8000); await ready(p);
  await goDate(p, tomorrow);
  ok(await rowSection(p, 'ann') === 'grill' && !await p.$eval('[data-p="tm-save"]', e => e.disabled) && (await read(p, tomorrow)).v === 1, 'privacy unlock: the same chef recovers the unsaved future section after a fresh authority check');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, key(['team', tomorrow]), 6000);
  ok(savedSection(await read(p, tomorrow), 'ann', 'lunch') === 'grill' && JSON.stringify(await read(p, today)) === JSON.stringify(plan(today)), 'privacy recovery: Save sends the retained draft to its original future date only');
  ok(p.errors.length === 0, 'privacy recovery: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // Midnight changes which dated record is live, without retargeting the already selected future draft.
  const midnight = Date.parse(tomorrow + 'T00:00:00+10:00');
  p = await L.open(browser, '#/team', { who: 'sam', extra: fixture(), clock: midnight - 30000, wait: 900 }); await ready(p);
  await goDate(p, tomorrow); await assignment(p, 'ann', 'lunch', 'grill');
  await p.clock.runFor(90000); await L.settle(p, 250);
  await L.waitFor(p, d => LK_TIME.day(LK_TIME.now()) === d, tomorrow, 6000);
  ok(await selected(p) === tomorrow && await rowSection(p, 'ann') === 'grill' && (await read(p, tomorrow)).v === 1, 'midnight: tomorrow becomes the live date without losing or automatically saving its selected draft');
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, key(['team', tomorrow]), 6000);
  ok(savedSection(await read(p, tomorrow), 'ann', 'lunch') === 'grill' && JSON.stringify(await read(p, today)) === JSON.stringify(plan(today)), 'midnight Save: the new live date receives the draft and the previous day remains unchanged');
  ok(await p.evaluate(k => window.__fake.dump()[k].pastEdit.t > 10, CFG), 'midnight Save: a plan that is now today uses the normal live-team invalidation stamp');
  await click(p, '[data-p="tm-today"]'); await ready(p);
  ok(await selected(p) === tomorrow && (await txt(p, '[data-p="tm-save"]') || '').includes(fullDate(tomorrow)) && /On break now/.test(await txt(p, '.tm-away-slot') || ''), 'midnight Today: navigation and the live break board now refer to the new Queensland date');
  ok(p.errors.length === 0, 'midnight: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // The first week answer may arrive after an acknowledged current-day save. Its old snapshot cannot win.
  p = await L.open(browser, '#/team', { who: 'sam', extra: fixture(), fakeSDK: { 'firebase-firestore.js': heldWeekSDK }, wait: 900 }); await ready(p);
  await L.waitFor(p, () => typeof window.__fake.releaseInitialWeek === 'function', null, 6000);
  await assignment(p, 'ann', 'lunch', 'pans');
  await p.evaluate(() => {
    const field = document.querySelector('select[data-k="tm-at:ann:0"]');
    field.value = '870'; field.dispatchEvent(new Event('change', { bubbles: true }));
  }); await L.settle(p, 120);
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 2, TEAM, 6000);
  await p.evaluate(() => window.__fake.releaseInitialWeek()); await L.settle(p, 200);
  ok(await rowSection(p, 'ann') === 'pans' && !/Ann/.test(await txt(p, '.tm-away-slot') || ''), 'late week read: an older snapshot cannot replace the saved section or restore an old current break');
  await assignment(p, 'ann', 'lunch', 'larder'); await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => window.__fake.dump()[k].v === 3, TEAM, 6000);
  ok(savedSection(await read(p, today), 'ann', 'lunch') === 'larder', 'late week read: the next Save retains the acknowledged version and advances to version three');
  ok(p.errors.length === 0, 'late week read: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // A future write can be queued before midnight and only acknowledged when that plan has become today's.
  p = await L.open(browser, '#/team', { who: 'sam', extra: fixture(), clock: midnight - 30000, wait: 900 }); await ready(p);
  await goDate(p, tomorrow); await assignment(p, 'ann', 'lunch', 'grill');
  await p.evaluate(() => { window.__fake.mode = 'hold'; }); await click(p, '[data-p="tm-save"]');
  ok(await p.evaluate(k => window.__fake.dump()[k].pastEdit.t === 10, CFG) && /Saving/.test(await txt(p, '[data-p="tm-save"]') || ''), 'pending midnight Save: a still-future queued plan does not send a live-team stamp or claim Saved');
  await p.clock.runFor(90000); await L.settle(p, 150);
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
  await L.waitFor(p, k => window.__fake.dump()[k].pastEdit.t > 10 && /saved/i.test((document.querySelector('.tm-save') || {}).textContent || '') && !/Saving/.test((document.querySelector('[data-p="tm-save"]') || {}).textContent || ''), CFG, 6000);
  const noticeWrites = await p.evaluate(k => window.__fake.writes.flat().filter(x => x.path === k && x.data.pastEdit && Object.prototype.hasOwnProperty.call(x.data.pastEdit, 't')), CFG);
  ok(noticeWrites.length === 1 && savedSection(await read(p, tomorrow), 'ann', 'lunch') === 'grill', 'pending midnight acknowledgement: one follow-up signal tells staff the now-current plan is saved');
  ok(JSON.stringify(await read(p, today)) === JSON.stringify(plan(today)) && (await read(p, tomorrow)).v === 2, 'pending midnight acknowledgement: the confirmed plan is written once to its original date and the previous day stays intact');
  ok(p.errors.length === 0, 'pending midnight acknowledgement: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  for (const width of [390, 768, 1280]) {
    p = await L.open(browser, '#/team', { who: 'sam', extra: fixture(), width, wait: 900 }); await ready(p); await goDate(p, tomorrow);
    ok(!(await L.overflow(p)), width + ' px: dated planner has no sideways page scroll');
    const controls = await p.$$eval('.tm-weeknav button', es => es.map(e => ({ label: e.getAttribute('aria-label') || e.textContent, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })));
    ok(controls.length >= 10 && controls.every(x => x.width >= 43.9 && x.height >= 43.9), width + ' px: day and week controls retain 44 px targets ' + JSON.stringify(controls.filter(x => x.width < 43.9 || x.height < 43.9)));
    const keyboardDay = await p.$$eval('[data-p="tm-day"]', es => es[3].getAttribute('data-day'));
    await p.focus('[data-p="tm-day"][data-day="' + keyboardDay + '"]'); await p.keyboard.press('Enter'); await L.settle(p, 120);
    ok(await selected(p) === keyboardDay && await p.evaluate(d => document.activeElement.getAttribute('data-day') === d, keyboardDay) && p.errors.length === 0, width + ' px: keyboard day selection retains focus on the chosen date without browser errors');
    if (width === 390) {
      await p.evaluate(() => { document.documentElement.dataset.text = 'xlarge'; });
      ok(!(await L.overflow(p)) && await p.$$eval('.tm-weeknav button', es => es.every(e => e.getBoundingClientRect().width >= 43.9 && e.getBoundingClientRect().height >= 43.9)), 'largest text on 390 px: date targets remain 44 px without sideways page scroll');
    }
    await p.context().close();
  }
  await browser.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
