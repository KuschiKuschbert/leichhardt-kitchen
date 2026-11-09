// Cleaning uses dated occurrences, acknowledged ticks and immutable repeat-schedule revisions.
// These are synthetic jobs for the Firebase stand-in, not the kitchen's cleaning programme.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const DAY = 86400000, OPEN = 253402178400000;
const day = offset => L.ymd(new Date(L.NOW + offset * DAY));
const today = day(0), tomorrow = day(1), yesterday = day(-1);
const at = value => Date.parse(value + 'T00:00:00+10:00');
const dow = new Date(L.NOW).getDay();
const task = (id, changes = {}) => ({ root: id, prev: '', next: '', text: 'Job ' + id, area: 'Coldroom',
  section: 'larder', sectionName: 'Larder', shared: false, dows: [0, 1, 2, 3, 4, 5, 6], guide: '',
  from: at(day(-14)), until: OPEN, at: L.NOW - 15 * DAY, by: 'sam', ...changes });
const completion = (id, changes = {}) => ({ day: today, task: id, version: 1, done: true,
  doneAt: L.NOW - 60000, doneById: 'ann', doneBy: 'Ann', workerId: 'ann', worker: 'Ann', by: 'ann', ...changes });
function fixture(changes = {}) {
  return {
    [key('sections', 'larder')]: { name: 'Larder', uses: 5, hidden: false },
    [key('sections', 'grill')]: { name: 'Grill', uses: 3, hidden: false },
    [key('cleaningTasks', 'coldroom')]: task('coldroom', { text: 'Wipe coldroom handles' }),
    [key('cleaningTasks', 'pass')]: task('pass', { text: 'Wipe the pass', area: 'Pass', section: '', sectionName: '', shared: true }),
    [key('cleaningTasks', 'offday')]: task('offday', { text: 'Not due today', dows: [(dow + 1) % 7] }),
    [key('cleaningTasks', 'future')]: task('future', { text: 'Starts tomorrow', from: at(tomorrow) }),
    [key('cleaningTasks', 'archived')]: task('archived', { text: 'Archived yesterday', until: at(today) }),
    ...changes,
    [key('config', 'main')]: { ...(changes[key('config', 'main')] || L.seed()[key('config', 'main')]),
      kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }] }
  };
}
const record = (p, id, when = today) => p.evaluate(k => __fake.dump()[k] || null, key('cleaningDone', when + '_' + id));
const dump = p => p.evaluate(() => __fake.dump());
const cleanReads = p => p.evaluate(() => (__fake.reads || []).filter(k => /\/cleaning(Tasks|Done)(\/|$)/.test(k)));
const cleanWrites = p => p.evaluate(() => (__fake.writes || []).flat().filter(x => /\/cleaning(Tasks|Done)\//.test(x.path)));
const identity = p => p.evaluate(() => ({ who: LK_PREP.state.who, uid: LK_PREP.state.uid,
  session: localStorage.getItem('lk.prep.sess'), here: localStorage.getItem('lk.prep.here') }));
const visible = async (p, selector) => await p.locator(selector).count() > 0 && await p.locator(selector).first().isVisible();
async function general(p) {
  if (await p.locator('[data-cln="group"][data-group="general"][aria-expanded="false"]').count()) await p.click('[data-cln="group"][data-group="general"]');
}
const row = id => '.cln-row[data-id="' + id + '"]';
const tick = async (p, id = 'coldroom') => { await p.click('[data-cln="tick"][data-id="' + id + '"]'); await L.settle(p, 200); };
async function done(p, id = 'coldroom') {
  await L.waitFor(p, k => { const d = __fake.dump()[k]; return d && d.done === true && !LK_PREP.unsent(); }, key('cleaningDone', today + '_' + id));
  await L.settle(p, 150);
}
async function open(b, options = {}) {
  const p = await L.open(b, '#/cleaning', { who: 'ann', extra: fixture(), wait: 1000, init: () => {
    const date = new Date(Date.now() + 10 * 3600000).toISOString().slice(0, 10);
    ['ann', 'bo', 'sam'].forEach(id => localStorage.setItem('lk.sec.' + id, JSON.stringify({ d: date, sec: 'larder', name: 'Larder', self: true, at: Date.now() })));
  }, ...options });
  await L.waitFor(p, () => !!document.querySelector('.cln-page') && !document.querySelector('.cln-loading'));
  await general(p);
  return p;
}

(async () => {
  const b = await L.start(); let p;
  async function step(label, run) {
    try { await run(); }
    catch (e) { ok(false, label + ': ' + String(e.stack || e).split('\n').slice(0, 2).join(' ')); }
    finally {
      if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; }
    }
  }

  for (const width of [390, 768, 1280]) await step('daily list ' + width, async () => {
    p = await open(b, { width, extra: fixture({ [key('cleaningTasks', 'coldroom')]: task('coldroom', { text: 'Wipe coldroom handles ' + 'x'.repeat(65) }) }) });
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    const words = await L.txt(p, '.cln-page');
    ok(/Wipe coldroom handles/.test(words) && /Wipe the pass/.test(words) && /Coldroom/.test(words) && /Larder/.test(words), width + ': today shows section-owned work and shared areas together');
    ok(!/Not due today|Starts tomorrow|Archived yesterday/.test(words), width + ': weekdays and effective dates exclude non-due jobs');
    ok(!(await p.$('[data-cln="week"], [data-cln="add"]')), width + ': staff have today only, without chef planning controls');
    ok(!(await L.overflow(p)), width + ': long task text wraps without horizontal page overflow');
    const targets = await p.$$eval('.cln-row button', es => es.filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
    ok(targets.length >= 2 && targets.every(r => r.w >= 44 && r.h >= 44), width + ': visible row controls keep 44 px touch targets');
  });

  await step('personal tick, Undo and reopen', async () => {
    p = await open(b); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    const before = await p.locator(row('pass')).boundingBox();
    await tick(p); await done(p);
    const first = await record(p, 'coldroom'), words = await L.txt(p, row('coldroom'));
    ok(first.day === today && first.task === 'coldroom' && first.version === 1 && first.doneById === 'ann' && first.by === 'ann' && first.workerId === 'ann' && first.worker === 'Ann' && first.doneAt >= L.NOW, 'personal tick: one tap saves today, the task revision, authenticated worker and server-confirmed time');
    ok(/Ann/.test(words) && /14:00/.test(words) && !/Not sent/.test(words), 'personal tick: acknowledged row shows who and the 24-hour time');
    const after = await p.locator(row('pass')).boundingBox();
    ok(Math.abs(before.y - after.y) <= 1, 'ticking: acknowledgement keeps the following task in place');
    await tick(p);
    await L.waitFor(p, k => { const d = __fake.dump()[k]; return d && !d.done && d.version === 2; }, key('cleaningDone', today + '_coldroom'));
    const undone = await record(p, 'coldroom');
    ok(!undone.done && undone.doneAt === first.doneAt && undone.workerId === first.workerId && undone.by === 'ann', 'Undo: reopens the same occurrence with a newer version and preserves its recorded cycle');
    await tick(p); await done(p);
    ok((await record(p, 'coldroom')).version === 3, 'ticking again creates the next completion cycle');
    await p.reload();
    await L.waitFor(p, () => /Ann/.test((document.querySelector('.cln-row[data-id="coldroom"]') || {}).textContent || ''));
    ok(/Ann/.test(await L.txt(p, row('coldroom'))) && (await record(p, 'coldroom')).version === 3, 'saved completion survives reopening the book');
    const reads = (await cleanReads(p)).length; await p.clock.runFor(121000); await L.settle(p, 150);
    ok(await p.locator(row('coldroom') + ' [data-cln="tick"]').isDisabled(), 'after two minutes the saved completion no longer offers Undo');
    ok((await cleanReads(p)).length === reads, 'Undo expiry is a local clock change and makes no cleaning read');
  });

  await step('pending completion', async () => {
    p = await open(b, { who: 'sam' }); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    const reads = (await cleanReads(p)).length;
    await p.evaluate(() => { __fake.mode = 'hold'; }); await tick(p);
    await L.waitFor(p, () => LK_PREP.unsent());
    const pending = await L.txt(p, row('coldroom'));
    ok(/Not sent/.test(pending) && !/Sam|14:00/.test(pending), 'pending tick: says Not sent without a confirmed worker or time');
    ok(await p.evaluate(() => LK_CLEANING.dirty() && LK_PREP.dirtyForUpdate()), 'pending tick: existing update and unfinished-work guards remain active');
    ok(await p.locator('[data-cln="week"]').isDisabled() && await p.locator('[data-cln="refresh"]').isDisabled(), 'pending tick: chef week navigation and Refresh wait for the outstanding write');
    await L.tap(p, '[data-cln="week"]'); await L.tap(p, '[data-cln="refresh"]');
    ok((await cleanReads(p)).length === reads, 'pending tick: blocked navigation cannot read older completion state over the pending tick');
    await L.tap(p, '[data-cln="tick"][data-id="coldroom"]');
    ok((await cleanWrites(p)).filter(x => /\/cleaningDone\//.test(x.path)).length <= 1, 'pending tick: repeated taps cannot queue duplicate completions');
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); }); await done(p);
    ok(/Sam/.test(await L.txt(p, row('coldroom'))) && !/Not sent/.test(await L.txt(p, row('coldroom'))), 'pending tick: worker and time appear only after acknowledgement');
    ok(await p.locator('[data-cln="week"]').isEnabled() && await p.locator('[data-cln="refresh"]').isEnabled(), 'acknowledged tick: week navigation and Refresh become available again');
  });

  await step('shared attribution', async () => {
    const cfg = L.seed()[key('config', 'main')];
    cfg.people.push({ id: 'viewer', name: 'Viewer', role: 'view', active: true, add: false, tick: false, del: false });
    cfg.people.push({ id: 'function', name: 'Functions', role: 'fnc', active: true });
    cfg.staffIds.push('viewer', 'function'); cfg.fnOnlyIds = ['function'];
    p = await open(b, { deviceMode: 'shared', extra: fixture({ [key('config', 'main')]: cfg }) });
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    const signedIn = await identity(p), reads = (await cleanReads(p)).length;
    await tick(p);
    const shape = await p.$eval('#cln-worker-sheet', wrap => { const dialog = wrap.querySelector('[role="dialog"]'); return { outside: !document.querySelector('#cleaning-root').contains(wrap), modal: dialog.getAttribute('aria-modal'), focus: dialog.contains(document.activeElement), text: dialog.textContent }; });
    ok(shape.outside && shape.modal === 'true' && shape.focus && /Who did this\?|Wipe coldroom handles/.test(shape.text), 'shared screen: the native modal names this task and receives focus outside the page');
    await p.keyboard.press('Escape'); await L.settle(p, 150);
    ok(!(await p.$('#cln-worker-sheet')) && !(await record(p, 'coldroom')), 'shared screen: Escape leaves the task unticked');
    await tick(p);
    if (await visible(p, '[data-cln-picker="others"]')) await p.click('[data-cln-picker="others"]');
    ok(!(await p.$('[data-cln-person="function"]')) && !!(await p.$('[data-cln-person="viewer"]')), 'shared names: active kitchen workers include View only and exclude Functions only');
    ok((await cleanReads(p)).length === reads, 'shared picker: choosing from loaded names adds no cleaning or roster read');
    await p.click('[data-cln-person="viewer"]'); await done(p);
    const saved = await record(p, 'coldroom');
    ok(saved.workerId === 'viewer' && saved.worker === 'Viewer' && saved.doneById === 'ann' && saved.doneBy === 'Ann' && saved.by === 'ann', 'shared tick: reported worker is separate from the authenticated recorder');
    ok(JSON.stringify(await identity(p)) === JSON.stringify(signedIn), 'shared choice changes no identity, PIN session or authentic device history');
    ok(/Viewer/.test(await L.txt(p, row('coldroom'))) && !(await p.$('#cln-worker-sheet')), 'shared tick: acknowledged row credits the chosen worker and closes the picker');
    await tick(p);
    await L.waitFor(p, k => __fake.dump()[k] && !__fake.dump()[k].done, key('cleaningDone', today + '_coldroom'));
    ok(!(await p.$('#cln-worker-sheet')) && (await record(p, 'coldroom')).by === 'ann', 'shared Undo belongs to the recorder and does not ask for another worker');
  });

  await step('stale tick and Undo', async () => {
    p = await open(b); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    const other = completion('coldroom', { doneById: 'bo', doneBy: 'Bo', workerId: 'bo', worker: 'Bo', by: 'bo' });
    await p.evaluate(({ k, data }) => __fake.write(k, data), { k: key('cleaningDone', today + '_coldroom'), data: other });
    await tick(p);
    await L.waitFor(p, () => !!document.querySelector('.cln-row-error'));
    ok((await record(p, 'coldroom')).workerId === 'bo' && (await record(p, 'coldroom')).version === 1, 'two phones: stale tick cannot overwrite the other worker');
    ok(!/Ann ·/.test(await L.txt(p, row('coldroom'))), 'two phones: refused stale tick never invents the current worker');
    await p.locator('[data-cln="refresh"]').first().click();
    await L.waitFor(p, () => /Bo/.test((document.querySelector('.cln-row[data-id="coldroom"]') || {}).textContent || ''));
    ok(await p.locator(row('coldroom') + ' [data-cln="tick"]').isDisabled(), 'another recorder\'s completion has no Undo');
    await tick(p, 'pass'); await done(p, 'pass');
    const first = await record(p, 'pass');
    await p.evaluate(({ k, data }) => __fake.write(k, data), { k: key('cleaningDone', today + '_pass'), data: { ...first, version: 3, doneById: 'bo', doneBy: 'Bo', workerId: 'bo', worker: 'Bo', by: 'bo' } });
    await tick(p, 'pass');
    await L.waitFor(p, () => !!document.querySelector('.cln-row[data-id="pass"] .cln-row-error'));
    const newer = await record(p, 'pass');
    ok(newer.done && newer.workerId === 'bo' && newer.version === 3, 'stale Undo cannot erase a newer completion cycle');
  });

  await step('no tick permission', async () => {
    const cfg = L.seed()[key('config', 'main')];
    cfg.tickIds = ['sam', 'bo']; cfg.people = cfg.people.map(x => x.id === 'ann' ? { ...x, tick: false } : x);
    p = await open(b, { extra: fixture({ [key('config', 'main')]: cfg }) });
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    ok(await p.$$eval('[data-cln="tick"]', es => es.every(e => e.disabled)), 'without Tick: the daily tasks can be read but cannot be completed');
    const refused = await p.evaluate(async () => {
      const C = LK_PREP.cleaning(), T = LK_TIME, data = await C.load(T.day(T.now()), T.day(T.now()));
      try { await C.tick(data.tasks.find(x => x.id === 'coldroom'), T.day(T.now()), null, 'bo'); return false; } catch (e) { return true; }
    });
    ok(refused && !(await record(p, 'coldroom')), 'without Tick: choosing an eligible worker cannot grant the recorder permission');
  });

  await step('chef role needs canonical membership', async () => {
    const cfg = L.seed()[key('config', 'main')];
    cfg.people = cfg.people.map(x => x.id === 'bo' ? { ...x, role: 'sous' } : x);
    p = await open(b, { who: 'bo', extra: fixture({ [key('config', 'main')]: cfg }) });
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    ok(!(await p.$('[data-cln="week"], [data-cln="setup"]')), 'an editable sous role label alone does not expose weekly history or task setup');
    const refused = await p.evaluate(async () => {
      try { await LK_PREP.cleaning().saveTask({ text: 'Unauthorised task', area: 'Oven', section: '', shared: true, dows: [1], guide: '' }, null); return false; } catch (e) { return true; }
    });
    ok(refused && !(await cleanWrites(p)).length, 'task administration requires canonical chef membership even when called directly');
  });

  await step('chef week review', async () => {
    p = await open(b, { who: 'sam', width: 1280, extra: fixture({ [key('cleaningDone', yesterday + '_coldroom')]: completion('coldroom', { day: yesterday, doneAt: L.NOW - DAY }) }) });
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    const firstReads = (await cleanReads(p)).length;
    await p.click('[data-cln="week"]');
    await L.waitFor(p, () => !!document.querySelector('.cln-week-day') && !document.querySelector('.cln-loading'));
    await general(p);
    const weekReads = await cleanReads(p);
    ok(weekReads.length - firstReads === 2, 'week review uses one template range and one completion range, not seven daily requests');
    ok(await p.locator('[data-cln="day"]').count() === 7 && !await p.locator('.cln-matrix').count(), 'wide week: seven labelled days use the same grouped notebook without a matrix');
    const fit = await p.evaluate(() => { const list = document.querySelector('.cln-week-day').getBoundingClientRect(), book = document.querySelector('.cln-book').getBoundingClientRect(), footer = document.querySelector('.foot').getBoundingClientRect(); return { list: list.bottom, book: book.bottom, footer: footer.top }; });
    ok(fit.list <= fit.book + 1 && fit.footer >= fit.book - 1, 'wide week: the grouped day stays inside its notebook and above the page footer');
    ok(await p.$$eval('.cln-week-day [data-cln="tick"]', (es, date) => es.length > 0 && es.every(e => e.getAttribute('data-day') === date), today), 'wide week: the selected today owns the completion buttons');
    await p.setViewportSize({ width: 390, height: 844 }); await L.settle(p, 200);
    ok(await visible(p, '.cln-day-pick') && !(await visible(p, '.cln-matrix')), 'phone week: labelled days and grouped task rows remain visible');
    const dates = await p.$$eval('[data-cln="day"]', es => es.map(e => e.getAttribute('data-day'))), old = dates.find(d => d < today);
    if (old) {
      await p.click('[data-cln="day"][data-day="' + old + '"]');
      await general(p);
      ok(await p.$$eval('.cln-week-day [data-cln="tick"]', es => es.every(e => e.disabled)), 'past day: all occurrence controls are read only');
    }
    ok((await cleanReads(p)).length === weekReads.length, 'changing a day inside the loaded week makes no read');
    ok(!(await L.overflow(p)), 'phone week fits without sideways page scroll');
    await p.click('[data-cln="next"]');
    await L.waitFor(p, dates => [...document.querySelectorAll('[data-cln="day"]')].every(e => !dates.includes(e.getAttribute('data-day'))), dates);
    await L.waitFor(p, () => !document.querySelector('.cln-loading'));
    await general(p);
    await L.waitFor(p, () => !!document.querySelector('.cln-week-day .cln-row'));
    ok(await p.$$eval('.cln-week-day [data-cln="tick"]', es => es.every(e => e.disabled)), 'future week: scheduled work cannot be pre-ticked');
  });

  await step('chef task setup and immutable changes', async () => {
    p = await open(b, { who: 'sam' }); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    await p.locator('[data-cln="setup"]').first().click(); await p.click('[data-cln="add"]');
    const areas = await p.$$eval('#cln-areas option', es => es.map(e => e.value));
    ok(['Coldroom', 'Freezer', 'Dry store', 'Oven', 'Fryers', 'Behind equipment', 'Pass', 'Shelves'].every(x => areas.includes(x)), 'task setup offers every requested kitchen area without adding staff sections');
    ok(await p.locator('[data-cln="save"]').isDisabled(), 'empty setup has nothing to save');
    await p.fill('#cln-text', 'Wipe freezer handles'); await p.fill('#cln-area', 'Freezer');
    await p.selectOption('#cln-section', 'larder', { force: true }); await p.click('[data-cln="repeat"][data-dow="' + dow + '"]');
    await p.click('[data-cln="save"]');
    await L.waitFor(p, () => /Saved Wipe freezer handles/.test((document.querySelector('.cln-save-note') || {}).textContent || ''));
    let records = await dump(p), path = Object.keys(records).find(k => /\/cleaningTasks\//.test(k) && records[k].text === 'Wipe freezer handles'), first = records[path], id = path.split('/').pop();
    ok(first.from === at(today) && first.until === OPEN && first.root === id && first.prev === '' && first.section === 'larder' && first.sectionName === 'Larder' && first.by === 'sam', 'new task starts today with a stable revision and current section name');
    await p.click('[data-cln="today"]');
    ok(/Wipe freezer handles/.test(await L.txt(p, '.cln-body')), 'new due task appears in the daily list after acknowledgement');
    await p.locator('[data-cln="setup"]').first().click();
    await p.fill('#cln-text', 'Clean freezer door seals'); await p.click('[data-cln="save"]');
    await L.waitFor(p, () => /Saved Clean freezer door seals/.test((document.querySelector('.cln-save-note') || {}).textContent || ''));
    records = await dump(p); const nextPath = Object.keys(records).find(k => /\/cleaningTasks\//.test(k) && records[k].text === 'Clean freezer door seals'), next = records[nextPath];
    ok(records[path].text === 'Wipe freezer handles' && records[path].until === at(tomorrow) && records[path].next === nextPath.split('/').pop() && next.root === id && next.prev === id && next.from === at(tomorrow), 'editing makes an atomically linked tomorrow revision and retains today\'s original wording');
    await p.click('[data-cln="today"]');
    ok(/Wipe freezer handles/.test(await L.txt(p, '.cln-body')) && !/Clean freezer door seals/.test(await L.txt(p, '.cln-body')), 'today\'s daily task remains unchanged after an edit');
    await p.locator('[data-cln="setup"]').first().click();
    await p.click('[data-cln="cancel-edit"]');
    const newId = nextPath.split('/').pop(); await p.click('[data-cln="archive"][data-id="' + newId + '"]'); await p.click('[data-cln="archive"][data-id="' + newId + '"]');
    await L.waitFor(p, k => __fake.dump()[k].until !== 253402178400000, nextPath);
    await p.click('[data-cln="today"]');
    ok((await dump(p))[nextPath].until === at(tomorrow) && /Wipe freezer handles/.test(await L.txt(p, '.cln-body')), 'archiving tomorrow\'s revision leaves today and earlier records intact');
  });

  await step('midnight rollover', async () => {
    p = await open(b, { deviceMode: 'shared', clock: at(tomorrow) - 60000 });
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    await tick(p); await p.clock.runFor(90000); await L.settle(p, 200);
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await L.waitFor(p, date => !document.querySelector('#cln-worker-sheet') && [...document.querySelectorAll('.cln-row [data-cln="tick"]')].every(e => e.getAttribute('data-day') === date), tomorrow);
    ok(!(await record(p, 'coldroom')) && !(await record(p, 'coldroom', tomorrow)), 'midnight: an open attribution choice neither completes yesterday nor silently carries into today');
    ok(/Starts tomorrow/.test(await L.txt(p, '.cln-body')), 'midnight: newly effective work appears for the new calendar day');
  });

  for (const deviceMode of ['personal', 'shared']) await step(deviceMode + ' privacy lock', async () => {
    p = await open(b, { who: 'sam', deviceMode, clock: at(today) + 4 * 3600000 - 60000 });
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    await p.locator('[data-cln="setup"]').first().click(); await p.click('[data-cln="add"]');
    await p.fill('#cln-text', 'Unfinished oven cleaning task'); await p.fill('#cln-area', 'Oven');
    const original = await p.evaluate(() => LK_PREP.identity());
    await p.clock.runFor(90000); await L.settle(p, 200);
    await L.waitFor(p, () => !LK_PREP.privateAccess() && !!LK_PREP.workLock());
    ok(!(await p.$('#cln-form, .cln-row')) && await p.evaluate(id => LK_CLEANING.dirty() && LK_PREP.dirtyForUpdate() && LK_PREP.workLock().identity === id, original), deviceMode + ': 04:00 hides the private list and keeps the original chef\'s actual draft');
    await p.fill('#pf1', '3333');
    await L.waitFor(p, () => LK_PREP.state.pinMsg === 'That PIN is not right.' && LK_PREP.state.pf1 === '');
    ok(!(await p.$('#cln-form')) && !(await cleanWrites(p)).length, deviceMode + ': another person\'s PIN cannot reveal or submit the retained task');
    await p.clock.runFor(21000); await p.fill('#pf1', '1111');
    await L.waitFor(p, () => LK_PREP.privateAccess() && !!document.querySelector('#cln-text'), null, 10000);
    ok(await p.inputValue('#cln-text') === 'Unfinished oven cleaning task' && await p.inputValue('#cln-area') === 'Oven', deviceMode + ': original chef PIN restores the exact unfinished fields');
    ok(!(await cleanWrites(p)).length, deviceMode + ': restoring the draft never automatically publishes a task');
    await L.waitFor(p, () => !LK_PREP.unsent());
    await p.evaluate(() => LK_PREP.signOut(true, true));
    await L.waitFor(p, () => !document.querySelector('#cln-form') && !LK_CLEANING.dirty());
    ok(!(await p.$('#cln-form')) && !await p.evaluate(() => LK_CLEANING.dirty()), deviceMode + ': explicit handover clears the private draft');
  });

  await step('retained edit with failed reload', async () => {
    p = await open(b, { who: 'sam', deviceMode: 'shared', clock: at(today) + 4 * 3600000 - 60000 });
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    await p.locator('[data-cln="setup"]').first().click(); await p.click('[data-cln="edit"][data-id="coldroom"]');
    await p.fill('#cln-text', 'Edited coldroom cleaning');
    await p.evaluate(() => { __fake.failReads = /\/cleaningTasks$/; });
    await p.clock.runFor(90000); await L.settle(p, 150);
    await L.waitFor(p, () => !LK_PREP.privateAccess() && !!document.querySelector('#pf1'));
    await p.fill('#pf1', '1111');
    await L.waitFor(p, () => LK_PREP.privateAccess() && !!document.querySelector('.cln-plan-body > .p-err'), null, 10000);
    ok(await p.inputValue('#cln-text') === 'Edited coldroom cleaning' && await p.locator('[data-cln="save"]').isDisabled(), 'retained edit: failed reload keeps the draft and disables Save until its original revision is known');
    await p.dispatchEvent('#cln-form', 'submit'); await L.settle(p, 150);
    ok(!(await cleanWrites(p)).length, 'retained edit: even a direct submit cannot turn the missing edit target into a new task');
    await p.evaluate(() => { __fake.failReads = null; }); await p.locator('[data-cln="refresh"]').first().click();
    await L.waitFor(p, () => !document.querySelector('.cln-plan-body > .p-err') && document.querySelector('[data-cln="save"]') && !document.querySelector('[data-cln="save"]').disabled);
    await p.click('[data-cln="save"]');
    await L.waitFor(p, () => /Saved Edited coldroom cleaning/.test((document.querySelector('.cln-save-note') || {}).textContent || ''));
    const docs = await dump(p), old = docs[key('cleaningTasks', 'coldroom')], replacements = Object.entries(docs).filter(([k, d]) => /\/cleaningTasks\//.test(k) && d.text === 'Edited coldroom cleaning');
    ok(old.until === at(tomorrow) && replacements.length === 1 && replacements[0][1].prev === 'coldroom' && replacements[0][1].root === 'coldroom', 'retained edit: after Refresh, Save creates one linked replacement for tomorrow');
  });

  await step('lost acknowledgement across unlock', async () => {
    p = await open(b, { who: 'sam', deviceMode: 'shared', clock: at(today) + 4 * 3600000 - 60000 });
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    await p.locator('[data-cln="setup"]').first().click(); await p.click('[data-cln="add"]');
    await p.fill('#cln-text', 'First saved shelf task'); await p.fill('#cln-area', 'Shelves');
    await p.selectOption('#cln-section', '_shared', { force: true }); await p.click('[data-cln="repeat"][data-dow="' + dow + '"]');
    // The server commits the task but this caller loses the acknowledgement. Only this one task batch is affected.
    await p.evaluate(() => {
      const fs = LK_PREP.book().fs(), real = fs.writeBatch;
      fs.writeBatch = function () {
        const batch = real.apply(fs, arguments), set = batch.set, commit = batch.commit; let cleaning = false;
        batch.set = function (ref) { const path = Array.isArray(ref.path) ? ref.path.join('/') : ref.path; if (/\/cleaningTasks\//.test(path)) cleaning = true; return set.apply(batch, arguments); };
        batch.commit = function () { return commit.apply(batch, arguments).then(value => { if (cleaning) { fs.writeBatch = real; throw { code: 'unavailable' }; } return value; }); };
        return batch;
      };
    });
    await p.click('[data-cln="save"]');
    await L.waitFor(p, () => !!document.querySelector('.cln-save-note.p-err') && !LK_PREP.unsent());
    let docs = await dump(p), initial = Object.entries(docs).filter(([k, d]) => /\/cleaningTasks\//.test(k) && d.text === 'First saved shelf task');
    ok(initial.length === 1 && await p.inputValue('#cln-text') === 'First saved shelf task', 'lost acknowledgement: committed job exists once and the form remains available to reconcile');
    await p.fill('#cln-text', 'Newer shelf task wording');
    await p.clock.runFor(90000); await L.settle(p, 150);
    await L.waitFor(p, () => !LK_PREP.privateAccess() && !!document.querySelector('#pf1'));
    await p.fill('#pf1', '1111');
    await L.waitFor(p, () => LK_PREP.privateAccess() && !!document.querySelector('#cln-text') && document.querySelector('[data-cln="save"]') && !document.querySelector('[data-cln="save"]').disabled, null, 10000);
    await p.click('[data-cln="save"]');
    await L.waitFor(p, () => !document.querySelector('.cln-save-note.p-err') && !document.querySelector('[data-cln="save"]').disabled);
    docs = await dump(p);
    ok(Object.entries(docs).filter(([k, d]) => /\/cleaningTasks\//.test(k) && /shelf task/.test(d.text)).length === 1, 'same-person unlock: retry reconciles the exact acknowledged task instead of creating a duplicate');
    ok(await p.inputValue('#cln-text') === 'Newer shelf task wording' && await p.evaluate(() => LK_CLEANING.dirty()), 'reconciliation preserves words typed after the uncertain save as an unsaved edit');
    await p.click('[data-cln="save"]');
    await L.waitFor(p, () => /Saved Newer shelf task wording/.test((document.querySelector('.cln-save-note') || {}).textContent || ''));
    docs = await dump(p); const later = Object.entries(docs).find(([k, d]) => /\/cleaningTasks\//.test(k) && d.text === 'Newer shelf task wording');
    ok(!!later && later[1].prev === initial[0][0].split('/').pop() && later[1].from === at(tomorrow), 'explicit next save applies the newer words as a tomorrow revision of the recovered task');
  });

  // A failed or incomplete server answer is never an empty cleaning list.
  for (const source of ['cleaningTasks', 'cleaningDone']) await step(source + ' failed read', async () => {
    p = await open(b, { failReads: '/' + source + '$' });
    await L.waitFor(p, () => /Could not (load|read)/.test(document.querySelector('.cln-page').textContent));
    const words = await L.txt(p, '.cln-page');
    ok(/Could not (load|read)/.test(words) && !/No (cleaning )?(jobs|tasks)|0 of 0/.test(words), source + ': failure says it could not load, without a false empty count');
    ok(!(await p.$('.cln-row')), source + ': partial results cannot be ticked');
    await p.evaluate(() => { __fake.failReads = null; }); await p.locator('[data-cln="refresh"]').first().click();
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    ok(/Wipe coldroom handles/.test(await L.txt(p, '.cln-body')), source + ': explicit Refresh recovers the full daily list');
  });

  await step('cold read', async () => {
    p = await open(b, { cold: '/cleaning(Tasks|Done)$' });
    await L.waitFor(p, () => /Could not (load|read)|signal|connection/i.test(document.querySelector('.cln-page').textContent));
    ok(!(await p.$('.cln-row')) && !/No (cleaning )?(jobs|tasks)|0 of 0/.test(await L.txt(p, '.cln-page')), 'cold cache: an empty offline answer is not an empty cleaning programme');
  });

  await step('task overflow', async () => {
    const many = {};
    for (let n = 0; n < 501; n++) many[key('cleaningTasks', 'many-' + n)] = task('many-' + n);
    p = await open(b, { extra: fixture(many) });
    await L.waitFor(p, () => /Could not (load|read)|too many|too large|limit/i.test(document.querySelector('.cln-page').textContent));
    ok(!(await p.$('.cln-row')) && !/0 of 0/.test(await L.txt(p, '.cln-page')), 'overflow: 501 returned templates show an explicit incomplete-list error, never a truncated tick list');
  });

  await step('no startup cleaning reads', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra: fixture(), wait: 1000 });
    ok((await cleanReads(p)).length === 0, 'opening another work page makes no cleaning query');
    await p.evaluate(() => { location.hash = '#/cleaning'; });
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    const reads = await cleanReads(p);
    ok(reads.length === 2 && reads.some(k => /\/cleaningTasks$/.test(k)) && reads.some(k => /\/cleaningDone$/.test(k)), 'daily open reads one bounded template query and one occurrence query');
    const billing = await p.evaluate(() => __fake.bill.filter(x => /\/cleaning(Tasks|Done)(\/|$)/.test(x.path)));
    ok(billing.every(x => x.kind !== 'listen') && billing.reduce((n, x) => n + x.n, 0) <= 6, 'daily read budget: this five-template fixture costs at most six document reads and has no listener');
    await p.evaluate(() => { location.hash = '#/recipes'; }); await L.settle(p, 150);
    await p.evaluate(() => { location.hash = '#/cleaning'; });
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 2);
    ok((await cleanReads(p)).length === reads.length, 'returning to the loaded daily list reuses its memory read');
  });

  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
