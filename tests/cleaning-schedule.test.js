// The supplied schedule is optional configuration. These checks use synthetic people and the Firebase stand-in.
const L = require('./lib');
const schedule = require('../js/cleaning-schedule');
const { R, ok } = L.results();
const DAY = 86400000, OPEN = 253402178400000;
const today = L.ymd(new Date(L.NOW)), yesterday = L.ymd(new Date(L.NOW - DAY));
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const id = code => 'clean-template-' + code;
const at = day => Date.parse(day + 'T00:00:00+10:00');
function task(code, changes = {}) {
  const draft = schedule.drafts().concat(schedule.packDownDrafts()).find(t => t.plan.template === code);
  return { ...draft, sectionName: '', root: id(code), prev: '', next: '', from: at(yesterday), until: OPEN,
    at: L.NOW - DAY, by: 'sam', ...changes };
}
function fixture(codes, changes = {}) {
  return { ...Object.fromEntries(codes.map(code => [key('cleaningTasks', id(code)), task(code)])), ...changes };
}
async function general(p) {
  if (await p.locator('[data-cln="group"][data-group="general"][aria-expanded="false"]').count()) await p.click('[data-cln="group"][data-group="general"]');
}
async function reopened(p) {
  await L.waitFor(p, () => !!document.querySelector('.cln-page') && !document.querySelector('.cln-loading'));
  await general(p);
  await L.waitFor(p, () => !!document.querySelector('.cln-plan-row'));
}
async function open(b, options = {}) {
  const p = await L.open(b, '#/cleaning', { who: 'sam', wait: 1000, ...options });
  await L.waitFor(p, () => !!document.querySelector('.cln-page') && !document.querySelector('.cln-loading'));
  await p.evaluate(async () => {
    const C = LK_PREP.cleaning(), day = LK_TIME.day();
    window.__cleanTest = { C, day, tasks: (await C.load(day, day)).tasks };
  });
  await general(p);
  return p;
}
async function act(p, code, action, options = {}) {
  return p.evaluate(async ({ code, action, options }) => {
    const { C, day, tasks } = __cleanTest, task = tasks.find(t => t.plan && t.plan.template === code);
    const slot = options.slot || 'daily', path = ['kitchens', LK_PREP.state.pin, 'cleaningDone', day + '_' + task.id + '__' + slot].join('/');
    const raw = __fake.dump()[path], current = raw ? { ...raw, id: path.split('/').pop() } : null;
    try { return { saved: await C.act(task, day, current, action, options.worker || C.who(), { ...options, slot, kind: options.kind || 'daily' }) }; }
    catch (e) { return { error: e.code || e.message || String(e) }; }
  }, { code, action, options });
}
const records = (p, collection) => p.evaluate(name => Object.entries(__fake.dump()).filter(([k]) => k.includes('/' + name + '/')).map(([path, data]) => ({ path, ...data, ...(data.at && typeof data.at.toMillis === 'function' ? { at: data.at.toMillis() } : {}) })), collection);
const row = code => '.cln-plan-row[data-id="' + id(code) + '"]';

(async () => {
  const drafts = schedule.drafts();
  ok(drafts.length === 26 && new Set(drafts.map(t => t.plan.template)).size === 26, 'data: exactly 26 uniquely identified templates');
  ok(drafts.map(t => t.plan.template).join(',') === Array.from({ length: 26 }, (_, i) => 'c' + String(i + 1).padStart(2, '0')).join(','), 'data: stable generic template IDs cover every supplied task');
  const weekdays = [1, 2, 3, 4, 5, 6, 0].map(d => drafts.filter(t => t.dows.includes(d)).length);
  ok(weekdays.join(',') === '23,22,24,23,23,22,25' && weekdays.reduce((a, n) => a + n, 0) === 162, 'data: Monday to Sunday task-day totals are 23,22,24,23,23,22,25 and 162 before event expansion');
  ok(!/Australian Venue|\bAVC\b|Winery|Surry Hills|Rory|source|transcrib/i.test(JSON.stringify(drafts)), 'data: no other-venue branding, provenance labels or private contact name');
  ok(drafts.find(t => t.plan.template === 'c15').plan.responsibility === 'Senior chefs x 3' && drafts.find(t => t.plan.template === 'c24').plan.timing === 'daily', 'data: responsibility labels do not multiply occurrences');
  ok(drafts.find(t => t.plan.template === 'c15').plan.review.includes('daily'), 'data: the chemical-room repeat-day and daily sanitiser discrepancy remains a setup clarification');
  const timing = Object.fromEntries(drafts.map(t => [t.plan.template, t.plan.timing]));
  ok(timing.c03 === 'service' && timing.c18 === 'prep-service' && timing.c11 === 'food' && timing.c16 === 'use' && timing.c17 === 'close', 'data: service, prep, food, use and closing work retain distinct timing');
  ok(drafts.filter(t => t.plan.verification).map(t => t.plan.template).join(',') === 'c11' && drafts.every(t => !t.plan.verifiers.length), 'data: only food labelling requires verification, with explicit local checker assignment');
  drafts[0].plan.checks.push('Synthetic change'); drafts[0].dows.length = 0;
  ok(!schedule.drafts()[0].plan.checks.includes('Synthetic change') && schedule.drafts()[0].dows.length === 7, 'data: editing an import draft cannot change the canonical templates or another draft');
  const pack = schedule.packDownDrafts(), packIds = pack.map(t => t.plan.template);
  const orderedIds = [['hot', 5], ['grill', 10], ['pans', 10]].flatMap(([section, count]) => Array.from({ length: count }, (_, i) => 'pd-' + section + '-' + String(i + 1).padStart(2, '0')));
  ok(pack.length === 25 && new Set(packIds).size === 25 && packIds.join(',') === orderedIds.join(','), 'pack down data: 25 unique tasks retain Hot larder, Grill and Pans step order');
  ok(pack.every(t => t.plan.timing === 'close') && schedule.templates.length === 26, 'pack down data: nightly closing tasks extend the schedule without changing the original 26 templates');
  ok(pack.filter(t => t.dows.length === 1).map(t => t.plan.template).join(',') === 'pd-grill-02' && pack.find(t => t.plan.template === 'pd-grill-02').dows[0] === 0, 'pack down data: only the grill and OZ tank deep clean is Sunday-only');
  ok(pack.filter(t => t.plan.repeat).length === 1 && JSON.stringify(pack.find(t => t.plan.template === 'pd-grill-03').plan.repeat) === JSON.stringify({ days: 2, anchor: '2026-11-09' }), 'pack down data: grill drip trays repeat every two days from the confirmed 9 November anchor');
  ok(['pd-grill-03', 'pd-pans-05'].every(code => pack.find(t => t.plan.template === code).plan.checks.includes('No aluminium foil used')), 'pack down data: both drip-tray procedures retain the no-foil requirement');
  ok(['pd-grill-06', 'pd-pans-07'].every(code => pack.find(t => t.plan.template === code).plan.checks.includes('Service stickers applied')) && pack.find(t => t.plan.template === 'pd-grill-09').plan.checks.includes('Pans heat lamps double-checked') && /kick oven/i.test(pack.find(t => t.plan.template === 'pd-pans-08').plan.method), 'pack down data: service stickers, the heat-lamp double check and kick-oven shutdown remain required');
  pack.find(t => t.plan.repeat).plan.repeat.anchor = '2030-01-01';
  ok(schedule.packDownDrafts().find(t => t.plan.repeat).plan.repeat.anchor === '2026-11-09', 'pack down data: draft edits cannot change the canonical interval anchor');

  const b = await L.start(); let p;
  async function step(label, run) {
    try { await run(); }
    catch (e) { ok(false, label + ': ' + String(e.stack || e).split('\n').slice(0, 2).join(' ')); }
    finally { if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }

  await step('explicit import and repeat import', async () => {
    p = await open(b);
    ok((await records(p, 'cleaningTasks')).length === 0, 'import: opening Cleaning never seeds tasks automatically');
    await p.locator('[data-cln="setup"]').first().click(); await p.click('.cln-import summary');
    await p.check('[data-cln-import-verifier="sam"]'); await p.click('[data-cln="import-schedule"]');
    await L.waitFor(p, () => Object.keys(__fake.dump()).filter(k => k.includes('/cleaningTasks/')).length === 26 && !LK_PREP.unsent());
    const first = await records(p, 'cleaningTasks');
    ok(first.length === 26 && first.every(t => t.path.endsWith('/clean-template-' + t.plan.template)), 'import: chef setup creates exactly 26 deterministic roots');
    ok(first.find(t => t.plan.template === 'c11').plan.verifiers.join(',') === 'sam', 'import: the explicitly selected local Pass checker is stored with food labelling');
    const twice = await p.evaluate(() => LK_PREP.cleaning().importTasks(LK_CLEANING_SCHEDULE.drafts()));
    ok(twice.imported === 0 && twice.skipped === 26 && (await records(p, 'cleaningTasks')).length === 26, 'import: a repeated import creates no duplicate task or revision');
    ok(JSON.stringify(first) === JSON.stringify(await records(p, 'cleaningTasks')), 'import: a repeated import preserves existing task versions byte for byte');
    await p.reload(); await reopened(p);
    ok((await records(p, 'cleaningTasks')).length === 26, 'import: imported tasks survive a real page reload');
  });

  await step('archived import root and completion history', async () => {
    const archived = task('c01', { until: at(today) });
    const history = { day: yesterday, task: id('c01'), version: 1, done: true, doneAt: L.NOW - DAY, doneById: 'ann', doneBy: 'Ann', workerId: 'ann', worker: 'Ann', by: 'ann' };
    const historyPath = key('cleaningDone', yesterday + '_' + id('c01'));
    p = await open(b, { extra: { [key('cleaningTasks', id('c01'))]: archived, [historyPath]: history } });
    const imported = await p.evaluate(() => LK_PREP.cleaning().importTasks(LK_CLEANING_SCHEDULE.drafts()));
    ok(imported.imported === 25 && imported.skipped === 1, 'import: an archived deterministic root is skipped rather than resurrected');
    const kept = await p.evaluate(paths => paths.map(path => __fake.dump()[path]), [key('cleaningTasks', id('c01')), historyPath]);
    ok(JSON.stringify(kept[0]) === JSON.stringify(archived) && JSON.stringify(kept[1]) === JSON.stringify(history), 'import: archived wording and historical completion remain unchanged');
  });

  await step('ordered pack down import and nightly work', async () => {
    p = await open(b, { clock: Date.parse('2026-11-09T12:00:00Z'), extra: { [key('cleaningTasks', id('c03'))]: task('c03', { from: at('2026-11-01') }) } });
    await p.locator('[data-cln="setup"]').first().click(); await p.click('.cln-pack-import summary'); await p.click('[data-cln="import-packdown"]');
    await L.waitFor(p, () => Object.values(__fake.dump()).filter(t => t.plan && /^pd-/.test(t.plan.template)).length === 25 && !LK_PREP.unsent());
    const imported = (await records(p, 'cleaningTasks')).filter(t => /^pd-/.test(t.plan.template));
    ok(imported.length === 25 && (await records(p, 'cleaningTasks')).length === 26, 'pack down import: the explicit setup action adds 25 ordered tasks and preserves the existing floor task');
    const twice = await p.evaluate(() => LK_PREP.cleaning().importTasks(LK_CLEANING_SCHEDULE.packDownDrafts()));
    ok(twice.imported === 0 && twice.skipped === 25, 'pack down import: running the separate importer again creates no duplicate task or revision');
    await p.click('[data-cln="today"]');
    const shownGroups = await p.$$eval('[data-cln="group"]', es => es.map(e => e.getAttribute('data-group'))), order = [];
    for (const group of ['hot', 'grill', 'pans']) {
      await p.click('[data-cln="group"][data-group="' + group + '"]');
      order.push(...await p.$$eval('[data-cln-group="' + group + '"] .cln-plan-row', es => es.map(r => r.getAttribute('data-id').replace('clean-template-', ''))));
      if (await p.locator('[data-cln="group-page"][data-group="' + group + '"][data-page="1"]').count()) {
        await p.click('[data-cln="group-page"][data-group="' + group + '"][data-page="1"]');
        order.push(...await p.$$eval('[data-cln-group="' + group + '"] .cln-plan-row', es => es.map(r => r.getAttribute('data-id').replace('clean-template-', ''))));
      }
    }
    ok(shownGroups.join(',') === 'hot,grill,pans,floor' && order.join(',') === orderedIds.filter(code => code !== 'pd-grill-02').join(','), 'pack down order: bounded daily groups retain section and numeric step order, excluding the Sunday extra on Monday');
    await p.click('[data-cln="group"][data-group="floor"]');
    ok(await p.locator('.cln-row[data-id="clean-template-c03"]').count() === 1 && shownGroups.at(-1) === 'floor', 'pack down order: the existing floor clean appears once in the last group after overhead shelving work');
    const sunday = await p.evaluate(() => { const C = LK_PREP.cleaning(), t = __fake.dump()[['kitchens', LK_PREP.state.pin, 'cleaningTasks', 'clean-template-pd-grill-02'].join('/')]; return [C.due(t, '2026-11-15'), C.due(t, '2026-11-16')]; });
    ok(sunday[0] && !sunday[1], 'pack down schedule: the deep grill and OZ tank clean applies on Sunday and is not due on Monday');
    await p.locator('[data-cln="setup"]').first().click();
    await p.fill('#cln-repeat-search', task('pd-grill-03').text);
    await p.click('[data-cln="edit"][data-id="' + id('pd-grill-03') + '"]');
    ok(await p.inputValue('#cln-repeat-days') === '2' && await p.inputValue('#cln-repeat-anchor') === '2026-11-09', 'pack down setup: the two-day interval and confirmed anchor are visible for prospective editing');
    // A blank, decimal or out of range repeat says what to fix before any write, not "Could not save".
    for (const days of ['', '2.5', '1', '31']) {
      await p.fill('#cln-repeat-days', days); await p.click('[data-cln="save"]');
      await L.waitFor(p, () => /\S/.test((document.querySelector('.cln-save-note') || {}).textContent || ''));
      const said = await p.locator('.cln-save-note').innerText();
      ok(/Repeat every 2 to 30 days, whole days only\./.test(said), 'pack down setup: repeat every "' + days + '" days is refused with a clear message (' + said + ')');
    }
    await p.fill('#cln-repeat-days', '2');
    await p.click('[data-cln="cancel-edit"]');
    await p.click('[data-cln="today"]');
    await p.click('[data-cln="group"][data-group="hot"]');
    await p.locator('[data-cln="details"][data-id="' + id('pd-hot-02') + '"]').first().click();
    const checks = p.locator('[data-cln-check][data-id="' + id('pd-hot-02') + '"]');
    ok(await p.locator('[data-cln="flow-perform"][data-id="' + id('pd-hot-02') + '"]').isDisabled(), 'pack down work: a nightly clean cannot bypass the required shutdown and cleaning checks');
    for (let i = 0; i < await checks.count(); i++) await checks.nth(i).check();
    await p.click('[data-cln="flow-perform"][data-id="' + id('pd-hot-02') + '"]');
    await L.waitFor(p, () => Object.values(__fake.dump()).some(r => r.task === 'clean-template-pd-hot-02' && r.done) && !LK_PREP.unsent());
    const saved = await records(p, 'cleaningDone');
    ok(saved.length === 1 && saved[0].flow.kind === 'close' && saved[0].flow.slot === 'close', 'pack down work: completion records the dated closing occurrence without completing another task');
    await p.evaluate(() => LK_PREP.cleaning().importTasks(LK_CLEANING_SCHEDULE.packDownDrafts()));
    ok(JSON.stringify(await records(p, 'cleaningDone')) === JSON.stringify(saved), 'pack down import: later imports preserve completed nightly work');
    ok(!(await L.overflow(p)), 'pack down work: the saved nightly checklist fits a 390 px phone');
  });

  await step('prospective template edits', async () => {
    p = await open(b, { extra: fixture(['c08']) });
    const checks = schedule.drafts().find(t => t.plan.template === 'c08').plan.checks;
    const completed = await act(p, 'c08', 'perform', { checked: checks });
    const changed = await p.evaluate(async () => {
      const { C, tasks, day } = __cleanTest, original = tasks.find(t => t.plan.template === 'c08');
      const revision = await C.saveTask({ ...original, plan: { ...original.plan, method: 'Synthetic future method' } }, original);
      const tomorrow = LK_TIME.day(LK_TIME.at(day) + 86400000);
      return { ...revision, tomorrow, future: await C.load(tomorrow, tomorrow), previous: __fake.dump()[['kitchens', LK_PREP.state.pin, 'cleaningTasks', original.id].join('/')] };
    });
    ok(changed.task.from === at(changed.tomorrow) && changed.closed.until === changed.task.from && changed.task.prev === id('c08') && changed.previous.next === changed.task.id, 'edits: a template change creates a linked revision for tomorrow');
    ok(changed.previous.plan.method !== changed.task.plan.method && changed.task.plan.method === 'Synthetic future method', 'edits: the completed day retains its original method and required checks');
    ok(changed.future.tasks.some(t => t.id === changed.task.id) && !changed.future.tasks.some(t => t.id === id('c08')), 'edits: the next date loads the applicable new version');
    const kept = (await records(p, 'cleaningDone')).find(r => r.task === id('c08'));
    ok(completed.saved && kept && kept.version === completed.saved.version && kept.done, 'edits: historical completion keeps its original task revision and state');
  });

  await step('required checks, blocked reason and audit', async () => {
    p = await open(b, { extra: fixture(['c08']) });
    const checks = schedule.drafts().find(t => t.plan.template === 'c08').plan.checks;
    ok(!!(await act(p, 'c08', 'perform', { checked: checks.slice(0, -1) })).error, 'checks: performance cannot bypass an unfinished required action');
    ok(!!(await act(p, 'c08', 'block', { note: '  ' })).error, 'blocked: a blank reason cannot be saved');
    const blocked = await act(p, 'c08', 'block', { checked: checks.slice(0, 1), note: 'Synthetic equipment fault' });
    ok(blocked.saved && blocked.saved.flow.status === 'blocked' && !blocked.saved.done, 'blocked: a reason and partial checks persist while the occurrence remains incomplete');
    const performed = await act(p, 'c08', 'perform', { checked: checks, note: 'Fault cleared' });
    ok(performed.saved && performed.saved.done && performed.saved.version === 2, 'checks: all required checks permit the ordinary task to complete');
    const reopened = await act(p, 'c08', 'reopen', { note: 'Synthetic correction' });
    ok(reopened.saved && !reopened.saved.done && reopened.saved.flow.status === 'pending' && !reopened.saved.flow.checked.length, 'correction: reopening resets completion and checks with a mandatory explanation');
    const audit = await records(p, 'cleaningActions');
    ok(audit.map(a => a.action).join(',') === 'block,perform,reopen' && audit.every(a => a.snapshot.version === a.version && a.at >= L.NOW), 'audit: each accepted change has a separate immutable versioned snapshot and server time');
    ok(audit[1].snapshot.done && audit[1].snapshot.workerId === 'sam' && audit[2].snapshot.flow.note === 'Synthetic correction', 'audit: reopening retains the completed worker and correction reason in separate historical events');
  });

  await step('independent events and duplicate submission', async () => {
    p = await open(b, { extra: fixture(['c03', 'c16', 'c18']) });
    const eventChecks = schedule.drafts().find(t => t.plan.template === 'c03').plan.checks;
    const slots = await p.evaluate(() => [__cleanTest.C.newSlot('service'), __cleanTest.C.newSlot('service')]);
    ok(slots[0] !== slots[1] && slots.every(s => s.startsWith('service-')), 'events: explicitly recorded services receive separate stable identifiers');
    const first = await act(p, 'c03', 'perform', { slot: slots[0], kind: 'service', checked: eventChecks });
    const second = await act(p, 'c03', 'save', { slot: slots[1], kind: 'service', checked: [] });
    ok(first.saved && first.saved.done && second.saved && !second.saved.done && second.saved.flow.status === 'pending', 'events: one completed service cannot complete a second service');
    ok(!!(await act(p, 'c03', 'perform', { checked: eventChecks })).error, 'events: a single daily tick cannot satisfy a service task');
    const benchChecks = schedule.drafts().find(t => t.plan.template === 'c18').plan.checks;
    const prep = await act(p, 'c18', 'perform', { slot: 'prep-fixture', kind: 'prep', checked: benchChecks });
    const service = await act(p, 'c18', 'save', { slot: 'service-fixture', kind: 'service' });
    ok(prep.saved && prep.saved.done && service.saved && !service.saved.done, 'events: bench prep completion and service completion are independent');
    const mixerChecks = schedule.drafts().find(t => t.plan.template === 'c16').plan.checks;
    const repeated = await p.evaluate(async ({ checks }) => {
      const { C, tasks, day } = __cleanTest, t = tasks.find(t => t.plan.template === 'c16');
      const submit = () => C.act(t, day, null, 'perform', 'sam', { slot: 'use-duplicate', kind: 'use', checked: checks });
      return (await Promise.allSettled([submit(), submit()])).map(r => r.status);
    }, { checks: mixerChecks });
    const mixer = (await records(p, 'cleaningDone')).filter(r => r.task === id('c16'));
    const mixerAudit = (await records(p, 'cleaningActions')).filter(r => r.task === id('c16'));
    ok(repeated.includes('fulfilled') && mixer.length === 1 && mixer[0].version === 1 && mixerAudit.length === 1, 'events: concurrent duplicate submissions create one occurrence and one audit event');
  });

  await step('food performance and explicit Pass verification', async () => {
    const food = task('c11');
    p = await open(b, { extra: fixture(['c11']) });
    const performed = await act(p, 'c11', 'perform', { slot: 'start', kind: 'start', checked: food.plan.checks });
    ok(performed.saved && !performed.saved.done && performed.saved.flow.status === 'awaiting', 'food: completed actions remain awaiting verification');
    ok(!!(await act(p, 'c11', 'verify', { slot: 'start', kind: 'start' })).error, 'food: chef status alone does not imply the configured Pass-checker assignment');
    await p.context().close(); p = null;
    food.plan.verifiers = ['sam'];
    p = await open(b, { extra: { [key('cleaningTasks', id('c11'))]: food } });
    const before = await act(p, 'c11', 'perform', { slot: 'start', kind: 'start', checked: food.plan.checks });
    const verified = await act(p, 'c11', 'verify', { slot: 'start', kind: 'start' });
    ok(verified.saved && verified.saved.done && verified.saved.flow.verifiedBy === 'sam' && verified.saved.flow.verifiedAt >= L.NOW, 'food: only the assigned checker can record Pass verification');
    ok(verified.saved && verified.saved.workerId === before.saved.workerId && verified.saved.doneAt === before.saved.doneAt, 'food: verification preserves the original performance identity and time');
    const close = await act(p, 'c11', 'save', { slot: 'close', kind: 'close' });
    ok(close.saved && !close.saved.done, 'food: a verified start-of-day occurrence leaves end-of-night work incomplete');
    await p.reload(); await reopened(p);
    const persisted = await records(p, 'cleaningDone');
    ok(persisted.some(r => r.flow.slot === 'start' && r.done && r.flow.verifiedBy === 'sam') && persisted.some(r => r.flow.slot === 'close' && !r.done), 'food: performance, verification and independent pending work survive refresh');
  });

  await step('Pass checkers are people who can check', async () => {
    // Bo lost Tick after being saved as the checker; Vi is View only and was never chosen. Neither can verify.
    const cfg = L.seed()[key('config', 'main')];
    const people = cfg.people.map(x => x.id === 'bo' ? { ...x, tick: false } : x).concat([{ id: 'vi', name: 'Vi', role: 'view', add: false, tick: false, del: false, active: true }]);
    const food = task('c11'); food.plan.verifiers = ['bo'];
    p = await open(b, { extra: { [key('config', 'main')]: { people, sousIds: ['sam'], showBadges: true, staffSee: { cleaning: true } }, [key('cleaningTasks', id('c11'))]: food } });
    await p.locator('[data-cln="setup"]').first().click();
    await p.fill('#cln-repeat-search', food.text);
    await p.click('[data-cln="edit"][data-id="' + id('c11') + '"]');
    const offered = await p.$$eval('[data-cln-verifier]', es => es.map(e => e.getAttribute('data-cln-verifier') + ':' + e.checked + ':' + e.closest('label').textContent));
    ok(offered.some(x => x.startsWith('sam:false:')) && offered.some(x => x.startsWith('ann:false:')) && !offered.some(x => x.startsWith('vi:')), 'checkers: only people with Tick are offered, View only is not (' + offered.join(' | ') + ')');
    ok(offered.some(x => x === 'bo:true:Bo · cannot do the Pass check'), 'checkers: a saved checker who lost Tick stays ticked and is marked (' + offered.join(' | ') + ')');
    await p.fill('#cln-text', food.text + ' edited'); await p.click('[data-cln="save"]');
    await L.waitFor(p, () => /\S/.test((document.querySelector('.cln-save-note') || {}).textContent || ''));
    ok(/Bo cannot do the Pass check\. Untick them, or give them Tick in Staff\./.test(await p.locator('.cln-save-note').innerText()), 'checkers: Save says who cannot check (' + await p.locator('.cln-save-note').innerText() + ')');
    ok((await records(p, 'cleaningTasks')).every(t => t.text === food.text), 'checkers: nothing is saved while a checker cannot check');
    await p.uncheck('[data-cln-verifier="bo"]'); await p.check('[data-cln-verifier="sam"]'); await p.click('[data-cln="save"]');
    await L.waitFor(p, () => /Saved/.test((document.querySelector('.cln-save-note') || {}).textContent || '') && !LK_PREP.unsent());
    const saved = (await records(p, 'cleaningTasks')).filter(t => t.text === food.text + ' edited');
    ok(saved.length === 1 && saved[0].plan.verifiers.join(',') === 'sam', 'checkers: after unticking, Save stores the checker who can check');
  });

  await step('weekday and date scope', async () => {
    const weekday = new Date(L.NOW).getDay(), offday = task('c08', { dows: [(weekday + 1) % 7] });
    p = await open(b, { extra: fixture(['c26'], { [key('cleaningTasks', id('c08'))]: offday }) });
    ok(!!(await act(p, 'c08', 'perform', { checked: offday.plan.checks })).error && !(await records(p, 'cleaningDone')).length, 'schedule: an unscheduled weekday cannot be completed through the API');
    ok(/^0\/1/.test(await L.txt(p, '.cln-progress')), 'schedule: non-scheduled work never inflates today\'s incomplete denominator');
    await p.setViewportSize({ width: 1280, height: 844 }); await p.click('[data-cln="week"]');
    await L.waitFor(p, () => !!document.querySelector('.cln-week-day') && !document.querySelector('.cln-loading'));
    await general(p);
    const week = await p.evaluate(() => ({ label: document.querySelector('.cln-week-nav').textContent,
      first: document.querySelector('[data-cln="day"]').textContent,
      day: document.querySelector('[data-cln="day"][aria-pressed="true"]').getAttribute('data-day'),
      unscheduled: !document.querySelector('.cln-week-day [data-id="clean-template-c08"]') }));
    ok(/Week commencing/.test(week.label) && /Mon/.test(week.first) && week.day === today && week.unscheduled, 'schedule: the week starts Monday and the selected day excludes work not scheduled for it');
  });

  await step('anchored repeat cadence', async () => {
    const repeated = task('pd-grill-03', { from: at('2026-11-01') });
    p = await open(b, { who: 'ann', clock: Date.parse('2026-11-10T04:00:00Z'), extra: { [key('cleaningTasks', id('pd-grill-03'))]: repeated } });
    const dates = ['2026-11-07', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-15', '2026-11-16', '2026-12-31', '2027-01-01', '2027-01-02'];
    const due = await p.evaluate(dates => { const { C, tasks } = __cleanTest; return dates.map(day => C.due(tasks[0], day)); }, dates);
    ok(due.join(',') === 'false,true,false,true,true,false,true,false,true', 'repeat: every two days stays anchored across weekdays, weeks and the year boundary');
    ok(!!(await act(p, 'pd-grill-03', 'perform', { slot: 'close', kind: 'close', checked: repeated.plan.checks })).error && !(await records(p, 'cleaningDone')).length, 'repeat: an off-cadence date cannot create an ordinary completion');
    const unanchored = await p.evaluate(() => { const { C, tasks } = __cleanTest; const t = tasks[0]; return C.due({ ...t, plan: { ...t.plan, repeat: { days: 2, anchor: '' } } }, '2026-11-09'); });
    ok(!unanchored, 'repeat: a missing anchor never silently becomes a daily occurrence');
  });

  await step('enhanced completion permissions', async () => {
    const cfg = L.seed()[key('config', 'main')];
    cfg.tickIds = ['sam', 'bo']; cfg.people = cfg.people.map(person => person.id === 'ann' ? { ...person, tick: false } : person);
    p = await open(b, { who: 'ann', extra: fixture(['c26'], { [key('config', 'main')]: cfg }) });
    ok(!!(await act(p, 'c26', 'perform')).error && !(await records(p, 'cleaningDone')).length && !(await records(p, 'cleaningActions')).length, 'permissions: enhanced occurrences require the authenticated recorder\'s existing Tick capability');
    const importDenied = await p.evaluate(async () => { try { await LK_PREP.cleaning().importTasks(LK_CLEANING_SCHEDULE.drafts()); return false; } catch (e) { return true; } });
    ok(importDenied && (await records(p, 'cleaningTasks')).length === 1, 'permissions: staff cannot import the schedule by calling the bridge directly');
  });

  await step('active kitchen clock and fresh date', async () => {
    p = await open(b, { who: 'ann', tz: 'Australia/Sydney', clock: Date.parse('2026-10-04T13:59:00Z'),
      extra: { [key('cleaningTasks', id('c26'))]: task('c26', { from: at('2026-10-01') }) } });
    const clock = await p.evaluate(() => ({ day: LK_TIME.day(), time: LK_TIME.clock(), phoneDay: new Date().getDate() }));
    ok(clock.day === '2026-10-04' && clock.time === '23:59' && clock.phoneDay === 5, 'clock: a phone observing daylight saving retains the active kitchen\'s Queensland date and time');
    await p.click('[data-cln="flow-quick"][data-id="' + id('c26') + '"]');
    await L.waitFor(p, () => Object.values(__fake.dump()).some(r => r.task === 'clean-template-c26' && r.day === '2026-10-04' && r.done) && !LK_PREP.unsent());
    await p.clock.runFor(90000);
    await L.waitFor(p, () => LK_TIME.day() === '2026-10-05' && /^0\/1/.test((document.querySelector('.cln-progress') || {}).textContent || ''));
    const saved = await records(p, 'cleaningDone');
    ok(saved.length === 1 && saved[0].day === '2026-10-04', 'clock: a new kitchen date starts incomplete and never copies the previous completion');
  });

  await step('earlier unsaved checks after midnight', async () => {
    p = await open(b, { who: 'ann', clock: at(today) + 23 * 3600000 + 59 * 60000, extra: fixture(['c08', 'c26']) });
    await p.click('[data-cln="flow-quick"][data-id="' + id('c26') + '"]');
    await L.waitFor(p, () => Object.values(__fake.dump()).some(r => r.task === 'clean-template-c26' && r.done) && !LK_PREP.unsent());
    const saved = await records(p, 'cleaningDone'), audit = await records(p, 'cleaningActions');
    await p.locator('[data-cln="details"][data-id="' + id('c08') + '"]').first().click();
    await p.check('[data-cln-check="0"][data-id="' + id('c08') + '"]');
    ok(await p.evaluate(() => LK_CLEANING.dirty() && LK_PREP.dirtyForUpdate() && !LK_PREP.unsent()), 'midnight draft: unsaved local checks use the existing update guard without claiming a sent write');
    await p.clock.runFor(90000);
    await L.waitFor(p, date => LK_TIME.day() !== date && !!document.querySelector('.cln-earlier'), today);
    ok(/not been recorded or backdated/.test(await L.txt(p, '.cln-earlier')) && await p.evaluate(() => LK_CLEANING.dirty()), 'midnight draft: prior-date checks remain protected behind a visible inline explanation');
    await p.locator('[data-cln="details"][data-id="' + id('c08') + '"]').first().click();
    ok(!await p.isChecked('[data-cln-check="0"][data-id="' + id('c08') + '"]'), 'midnight draft: the new date never inherits the earlier unfinished checks');
    await p.check('[data-cln-check="1"][data-id="' + id('c08') + '"]');
    await p.click('[data-cln="discard-earlier"]');
    ok(/Tap again/.test(await L.txt(p, '[data-cln="discard-earlier"]')) && await p.evaluate(() => LK_CLEANING.dirty()), 'midnight draft: the first Undo tap asks before dropping earlier local work');
    await p.click('[data-cln="discard-earlier"]');
    ok(!await p.locator('.cln-earlier').count() && await p.isChecked('[data-cln-check="1"][data-id="' + id('c08') + '"]'), 'midnight draft: confirmed Undo removes earlier drafts and preserves today\'s unsaved checks');
    ok(await p.evaluate(() => document.activeElement.matches('.cln-earlier-status')) && /Saved records were kept/.test(await L.txt(p, '.cln-earlier-status')), 'midnight draft: the confirmation receives focus and names the preserved saved records');
    await p.click('[data-cln="flow-discard"][data-id="' + id('c08') + '"]');
    ok(await p.evaluate(() => !LK_CLEANING.dirty() && !LK_PREP.dirtyForUpdate()), 'midnight draft: after explicit local discard no unreachable prior-date work blocks updates');
    ok(JSON.stringify(await records(p, 'cleaningDone')) === JSON.stringify(saved) && JSON.stringify(await records(p, 'cleaningActions')) === JSON.stringify(audit), 'midnight draft: discarding local checks writes no backdated completion and changes no saved history');
  });

  await step('failed save and retry', async () => {
    p = await open(b, { who: 'ann', extra: fixture(['c08']) });
    await p.locator('[data-cln="details"][data-id="' + id('c08') + '"]').first().click();
    const checks = p.locator('[data-cln-check][data-id="' + id('c08') + '"]');
    for (let i = 0; i < await checks.count(); i++) await checks.nth(i).check();
    await p.evaluate(() => { __fake.mode = 'fail'; });
    await p.click('[data-cln="flow-perform"][data-id="' + id('c08') + '"]');
    await L.waitFor(p, () => !!document.querySelector('.cln-occurrence .p-err'));
    ok(!(await records(p, 'cleaningDone')).length && !(await records(p, 'cleaningActions')).length, 'failed save: neither completion nor its audit event is fabricated');
    ok(/not saved|not confirm|try again|could not/i.test(await L.txt(p, '.cln-occurrence')) && await checks.evaluateAll(es => es.every(e => e.checked)), 'failed save: the error remains beside the occurrence and preserves checked actions for retry');
    await p.evaluate(() => { __fake.mode = 'ok'; });
    await p.click('[data-cln="flow-perform"][data-id="' + id('c08') + '"]');
    await L.waitFor(p, () => Object.values(__fake.dump()).some(r => r.task === 'clean-template-c08' && r.done) && !LK_PREP.unsent());
    ok((await records(p, 'cleaningDone')).length === 1 && (await records(p, 'cleaningActions')).length === 1, 'failed save: retry creates one acknowledged occurrence and one audit event');
  });

  await step('lost completion acknowledgement', async () => {
    p = await open(b, { who: 'ann', extra: fixture(['c08']) });
    // The server accepts the atomic occurrence and audit batch; its acknowledgement alone is lost.
    const first = await p.evaluate(async () => {
      const fs = LK_PREP.book().fs(), original = fs.writeBatch;
      fs.writeBatch = function () {
        const batch = original.apply(fs, arguments), set = batch.set, commit = batch.commit; let occurrence = false;
        batch.set = function (ref) { const path = Array.isArray(ref.path) ? ref.path.join('/') : ref.path; if (path.includes('/cleaningDone/')) occurrence = true; return set.apply(batch, arguments); };
        batch.commit = function () { return commit.apply(batch, arguments).then(value => { if (occurrence) { fs.writeBatch = original; throw { code: 'unavailable' }; } return value; }); };
        return batch;
      };
      const { C, day, tasks } = __cleanTest, task = tasks.find(t => t.plan.template === 'c08');
      // Keep the caller's original state. A server read made by the UI must not mask retry behaviour here.
      window.__retryClean = () => C.act(task, day, null, 'perform', 'ann', { slot: 'daily', kind: 'daily', checked: task.plan.checks.slice(), note: '' });
      try { await __retryClean(); return ''; } catch (e) { return e.code; }
    });
    const before = await records(p, 'cleaningDone');
    ok(first === 'unavailable' && before.length === 1 && before[0].done && (await records(p, 'cleaningActions')).length === 1, 'lost acknowledgement: the server has one complete occurrence and one audit event while the caller remains unconfirmed');
    const failedRead = await p.evaluate(async () => { __fake.failReads = /\/cleaningDone\//; try { await __retryClean(); return ''; } catch (e) { return e.code; } });
    ok(failedRead === 'unavailable' && JSON.stringify(await records(p, 'cleaningDone')) === JSON.stringify(before), 'lost acknowledgement: a failed authoritative reread preserves the exact saved occurrence');
    const recovered = await p.evaluate(async () => { __fake.failReads = null; return __retryClean(); });
    ok(recovered.recovered && recovered.done && JSON.stringify(await records(p, 'cleaningDone')) === JSON.stringify(before) && (await records(p, 'cleaningActions')).length === 1, 'lost acknowledgement: retry confirms the saved version without a second occurrence or audit event');
  });

  await step('mobile working journey and honest temperature reminder', async () => {
    p = await open(b, { who: 'ann', extra: fixture(['c08', 'c26']) });
    const text = await L.txt(p, '.cln-page');
    ok(/Temperature logs: morning and before dinner/.test(text), 'temperature: the morning and pre-dinner reminder is visible');
    await p.click('[data-cln="temperature"]');
    ok((await L.txt(p, '.cln-temperature')).includes('Temperature logs must be completed first thing in the morning and before dinner service.'), 'temperature: the disclosure states the exact reminder without claiming saved or validated readings');
    ok(/temperature log is not connected here/i.test(await L.txt(p, '.cln-temperature')), 'temperature: the disclosure honestly identifies the missing saved-record integration');
    ok(!/AVC|Winery|Surry Hills|source schedule/i.test(text), 'page: no other-venue branding or provenance labels');
    await p.click('[data-cln="flow-quick"][data-id="' + id('c26') + '"]');
    await L.waitFor(p, () => Object.values(__fake.dump()).some(r => r.task === 'clean-template-c26' && r.done) && !LK_PREP.unsent());
    ok(!await p.locator(row('c26') + ' .cln-detail').count() && (await records(p, 'cleaningDone')).some(r => r.task === id('c26') && r.workerId === 'ann'), 'routine: a task without required subchecks completes in one tap');
    ok(/Ann/.test(await L.txt(p, row('c26') + ' .nb-meta')) && /14:00/.test(await L.txt(p, row('c26') + ' .nb-meta')), 'routine: collapsed completion names the confirmed worker and 24-hour time');
    await p.locator('[data-cln="details"][data-id="' + id('c08') + '"]').first().focus();
    await p.keyboard.press('Enter'); await L.waitFor(p, () => !!document.querySelector('.cln-detail'));
    ok((await L.txt(p, row('c08'))).includes('Empty filter; hot soapy'), 'details: keyboard activation opens the cleaning method inline');
    ok(!(await p.$('#cln-worker-sheet, .cln-page [role="dialog"]')), 'details: instructions introduce no service overlay');
    const checks = p.locator('[data-cln-check][data-id="' + id('c08') + '"]');
    for (let i = 0; i < await checks.count(); i++) await checks.nth(i).check();
    await p.click('[data-cln="flow-perform"][data-id="' + id('c08') + '"]');
    await L.waitFor(p, () => Object.values(__fake.dump()).some(r => r.task === 'clean-template-c08' && r.done === true) && !LK_PREP.unsent());
    ok(/Ann|Saved/.test(await L.txt(p, row('c08'))), 'working journey: required checks and Complete save the signed-in worker visibly');
    for (const width of [390, 768, 1280]) { await p.setViewportSize({ width, height: 844 }); await L.settle(p, 150); ok(!(await L.overflow(p)), 'working journey: expanded instructions fit at ' + width + ' px'); }
    await p.reload(); await reopened(p);
    ok((await records(p, 'cleaningDone')).some(r => r.task === id('c08') && r.done && r.workerId === 'ann'), 'working journey: acknowledged completion survives navigation and refresh');
  });

  await step('long task confirmation on a phone', async () => {
    p = await open(b, { who: 'ann', extra: fixture(['c03']) });
    await p.locator('[data-cln="details"][data-id="' + id('c03') + '"]').first().click();
    await p.click('[data-cln="flow-add"][data-id="' + id('c03') + '"][data-kind="service"]');
    const checks = p.locator('[data-cln-check][data-id="' + id('c03') + '"]');
    for (let i = 0; i < await checks.count(); i++) await checks.nth(i).check();
    await p.click('[data-cln="flow-perform"][data-id="' + id('c03') + '"]');
    await L.waitFor(p, () => !!document.querySelector('.cln-occurrence .lk-stamp') && !LK_PREP.unsent());
    ok(!(await L.overflow(p)), 'confirmation: the saved long floor-cleaning task wraps without overflow at 390 px');
  });

  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
