// Chef M1 uses bounded groups and the existing task/editor paths. Staff keep the daily service list.
// The programme below uses built-in unbranded drafts with synthetic people in the Firebase stand-in.
const L = require('./lib'), schedule = require('../js/cleaning-schedule');
const { R, ok } = L.results();
const DAY = 86400000, OPEN = 253402178400000, CLOCK = Date.parse('2026-11-09T12:00:00Z');
const TODAY = '2026-11-09', key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const source = schedule.drafts().concat(schedule.packDownDrafts());
const id = code => 'clean-template-' + code;
const title = code => source.find(t => t.plan.template === code).text;
const row = code => '.cln-row[data-id="' + id(code) + '"]';
const group = name => '[data-cln="group"][data-group="' + name + '"]';
function fixture() {
  return Object.fromEntries(source.map(t => [key('cleaningTasks', id(t.plan.template)), {
    ...t, sectionName: '', root: id(t.plan.template), prev: '', next: '', from: CLOCK - 30 * DAY, until: OPEN, at: CLOCK - 31 * DAY, by: 'sam'
  }]));
}
const reads = p => p.evaluate(() => __fake.reads.filter(k => /\/cleaning(Tasks|Done)(\/|$)/.test(k)).length);
const writes = p => p.evaluate(() => __fake.writes.flat().filter(w => /\/cleaning(Tasks|Done|Actions)\//.test(w.path)).length);
async function open(b, options = {}) {
  const p = await L.open(b, '#/cleaning', { who: 'sam', clock: CLOCK, extra: fixture(), wait: 1000, ...options });
  await L.waitFor(p, () => !!document.querySelector('.cln-page') && !document.querySelector('.cln-loading'));
  return p;
}
async function contract(p, label) {
  const present = await p.locator(group('general')).count() > 0;
  ok(present, label + ': canonical chefs receive the grouped workspace');
  return present;
}
async function openGroup(p, name) {
  if (await p.locator(group(name)).getAttribute('aria-expanded') !== 'true') await p.click(group(name));
}
async function pageTo(p, name, page) {
  const button = p.locator('[data-cln="group-page"][data-group="' + name + '"][data-page="' + page + '"]').first();
  if (await button.isEnabled()) await button.click();
}

(async () => {
  const b = await L.start(); let p;
  async function step(label, run) {
    try { await run(); }
    catch (e) { ok(false, label + ': ' + String(e.stack || e).split('\n').slice(0, 2).join(' ')); }
    finally { if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }

  await step('bounded groups, search and retained checks', async () => {
    p = await open(b, { width: 390 }); if (!await contract(p, 'Today')) return;
    const before = await reads(p);
    const initial = await p.$$eval('[data-cln="group"]', es => es.map(e => ({ id: e.getAttribute('data-group'), open: e.getAttribute('aria-expanded'), text: e.textContent })));
    ok(initial.map(g => g.id).join(',') === 'general,hot,grill,pans,floor' && initial.every(g => g.open === 'false' && /\d/.test(g.text)), 'Today: five ordered, closed summaries show workload before any task rows');
    ok(await p.locator('.cln-row').count() === 0, 'Today: closed groups keep the initial programme bounded');
    await p.locator(group('pans')).focus(); await p.keyboard.press('Enter');
    const first = await p.$$eval('[data-cln-group="pans"] .cln-row', es => es.map(e => e.getAttribute('data-id')));
    await p.locator('[data-cln="group-page"][data-group="pans"][data-page="1"]').focus(); await p.keyboard.press('Enter');
    ok(await p.evaluate(() => document.activeElement.matches('.cln-pager [role="status"]') && /7.*10 of 10/.test(document.activeElement.textContent)), 'keyboard pager: reaching the last page focuses its announced range instead of losing focus');
    const second = await p.$$eval('[data-cln-group="pans"] .cln-row', es => es.map(e => e.getAttribute('data-id')));
    ok(first.length === 6 && second.length === 4 && first.concat(second).join(',') === Array.from({ length: 10 }, (_, n) => id('pd-pans-' + String(n + 1).padStart(2, '0'))).join(','), 'Pans: keyboard opening and two six-row pages retain exact numeric order');
    await p.fill('#cln-search', 'fridge parmie'); await L.settle(p, 400);
    await L.waitFor(p, () => !!document.querySelector('.cln-row[data-id="clean-template-pd-hot-02"]'));
    ok(await p.locator(row('pd-hot-02')).count() === 1 && await p.locator('.cln-row').count() === 1, 'search: a task in another closed group is directly reachable without duplicate rows');
    await p.click('[data-cln="details"][data-id="' + id('pd-hot-02') + '"]');
    await p.locator('[data-cln-check][data-id="' + id('pd-hot-02') + '"]').first().check();
    await p.fill('textarea[data-cln-note][data-id="' + id('pd-hot-02') + '"]', 'Synthetic unsaved check note');
    await p.click('[data-cln="clear-work"]'); await openGroup(p, 'pans'); await pageTo(p, 'pans', 0);
    const returnLink = p.locator('.cln-work-notices [data-cln="exception"][data-id="' + id('pd-hot-02') + '"]').first();
    ok(await returnLink.isVisible(), 'hidden draft: a named return link keeps unsaved checks reachable after leaving the group');
    await returnLink.click();
    ok(await p.locator(row('pd-hot-02') + ' .cln-detail').count() === 1 && await p.locator('[data-cln-check][data-id="' + id('pd-hot-02') + '"]').first().isChecked(), 'hidden draft: the return link restores the same checked occurrence');
    await openGroup(p, 'pans');
    await p.locator('[data-cln="setup"]').first().click();
    ok(!await p.locator('.cln-row').count() && await p.locator('.cln-repeat-browser').count() === 1, 'Repeat tasks: the task browser replaces operational rows');
    await p.click('[data-cln="today"]'); await openGroup(p, 'hot');
    if (!await p.locator(row('pd-hot-02') + ' .cln-detail').count()) await p.click('[data-cln="details"][data-id="' + id('pd-hot-02') + '"]');
    ok(await p.locator('[data-cln-check][data-id="' + id('pd-hot-02') + '"]').first().isChecked() && await p.inputValue('textarea[data-cln-note][data-id="' + id('pd-hot-02') + '"]') === 'Synthetic unsaved check note', 'checks: fold, page, search and mode changes retain the exact task draft');
    ok(await p.locator('[data-cln="flow-perform"][data-id="' + id('pd-hot-02') + '"]').isDisabled(), 'checks: retaining a partial draft never bypasses the remaining required checks');
    ok(await reads(p) === before && await writes(p) === 0 && await p.evaluate(() => LK_CLEANING.dirty() && LK_PREP.dirtyForUpdate()), 'local navigation: no extra cleaning reads or writes, and unfinished-work protection remains active');
    const targets = await p.$$eval('.cln-body button', es => es.filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
    ok(targets.length > 0 && targets.every(r => r.w >= 44 && r.h >= 44), 'Today: group, page and task controls retain 44 px targets');
    ok(!(await L.overflow(p)), 'Today: expanded checks and the pager fit a 390 px phone');
  });

  await step('pending legacy return keeps its range and recorder', async () => {
    const deltas = [];
    for (const useReturn of [false, true]) {
      p = await open(b, { extra: { ...fixture(), [key('cleaningTasks', 'legacy')]: {
        root: 'legacy', prev: '', next: '', text: 'Synthetic legacy cleaning', area: 'Bench', section: '', sectionName: '', shared: true,
        dows: [0, 1, 2, 3, 4, 5, 6], guide: '', from: CLOCK - DAY, until: OPEN, at: CLOCK - 2 * DAY, by: 'sam' } } });
      await p.fill('#cln-search', 'Synthetic legacy cleaning'); await L.settle(p, 400);
      await p.evaluate(() => { __fake.mode = 'hold'; });
      await p.click('[data-cln="tick"][data-id="legacy"]'); await L.waitFor(p, () => LK_PREP.unsent());
      await p.click('[data-cln="clear-work"]'); await openGroup(p, 'pans');
      const before = await reads(p);
      if (useReturn) {
        const kept = p.locator('.cln-work-notices [data-cln="exception"][data-id="legacy"]').first();
        ok(await kept.isVisible(), 'not sent: the hidden legacy tick has a named return action'); await kept.click();
        ok(await p.evaluate(() => document.activeElement.matches('.cln-row[data-id="legacy"]')) && await reads(p) === before && await p.evaluate(() => LK_PREP.unsent()), 'not sent: returning focuses the existing row without reading over the pending tick');
      }
      await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
      await L.waitFor(p, k => { const r = __fake.dump()[k]; return r && r.done && !LK_PREP.unsent(); }, key('cleaningDone', TODAY + '_legacy'));
      await L.settle(p, 300); deltas.push(await reads(p) - before);
      ok(await p.evaluate(k => __fake.dump()[k].doneById === 'sam', key('cleaningDone', TODAY + '_legacy')), 'not sent ' + (useReturn ? 'with return' : 'control') + ': acknowledgement keeps the original recorder');
      ok(!p.errors.length, 'not sent ' + (useReturn ? 'with return' : 'control') + ': no browser errors ' + p.errors.join(' | '));
      await p.context().close(); p = null;
    }
    ok(deltas[1] === deltas[0], 'not sent: the return action schedules no extra range read compared with the same tick without returning');
  });

  for (const importer of [['cleaning schedule', '.cln-import:not(.cln-pack-import)', 'import-schedule'], ['pack down schedule', '.cln-pack-import', 'import-packdown']]) await step(importer[0] + ' preserves loaded historical occurrences', async () => {
    const past = { day: TODAY, task: id('c26'), version: 1, done: true, doneAt: Date.parse('2026-11-09T04:00:00Z'),
      doneById: 'ann', doneBy: 'Ann', workerId: 'ann', worker: 'Ann', by: 'ann',
      flow: { slot: 'daily', kind: 'daily', status: 'complete', checked: source.find(t => t.plan.template === 'c26').plan.checks, note: '', verifiedBy: '', verifiedAt: 0 } };
    const savedPath = key('cleaningDone', TODAY + '_' + id('c26') + '__daily');
    p = await open(b, { clock: Date.parse('2026-11-11T12:00:00Z'), extra: { ...fixture(), [savedPath]: past } });
    await p.click('[data-cln="week"]'); await L.waitFor(p, () => !!document.querySelector('.cln-week-day') && !document.querySelector('.cln-loading'));
    await p.click('[data-cln="day"][data-day="' + TODAY + '"]');
    await p.fill('#cln-search', title('c26')); await L.settle(p, 400);
    ok(/Ann.*14:00/.test(await L.txt(p, row('c26'))), importer[0] + ': the requested Week initially includes the confirmed Monday completion');
    await p.locator('[data-cln="setup"]').first().click(); await p.click(importer[1] + ' summary'); await p.click('[data-cln="' + importer[2] + '"]');
    await L.waitFor(p, text => [...document.querySelectorAll('.lk-stamp')].some(e => e.textContent.includes('Loaded ' + text)) && !LK_PREP.unsent(), importer[0]);
    await p.click('[data-cln="week"]'); await L.waitFor(p, () => !!document.querySelector('.cln-week-day') && !document.querySelector('.cln-loading'));
    await p.click('[data-cln="day"][data-day="' + TODAY + '"]');
    ok(/Ann.*14:00/.test(await L.txt(p, row('c26'))), importer[0] + ': returning from the today-only import result reloads the Week and retains its actual historical completion');
    ok(await p.evaluate(k => JSON.stringify(__fake.dump()[k]), savedPath) === JSON.stringify(past), importer[0] + ': import and review never rewrite the saved historical occurrence');
  });

  await step('cross-kitchen exceptions stay reachable', async () => {
    const occurrence = (code, slot, status, note) => ({ day: TODAY, task: id(code), version: 1, done: false,
      doneAt: status === 'awaiting' ? CLOCK - 60000 : 0, doneById: status === 'awaiting' ? 'ann' : '', doneBy: status === 'awaiting' ? 'Ann' : '',
      workerId: status === 'awaiting' ? 'ann' : '', worker: status === 'awaiting' ? 'Ann' : '', by: 'ann',
      flow: { slot, kind: slot, status, checked: status === 'awaiting' ? source.find(t => t.plan.template === code).plan.checks : [], note, verifiedBy: '', verifiedAt: 0 } });
    p = await open(b, { width: 390, extra: { ...fixture(),
      [key('cleaningDone', TODAY + '_' + id('pd-pans-10') + '__close')]: occurrence('pd-pans-10', 'close', 'blocked', 'Synthetic blocked pans task'),
      [key('cleaningDone', TODAY + '_' + id('c11') + '__start')]: occurrence('c11', 'start', 'awaiting', '') } });
    if (!await contract(p, 'exceptions')) return;
    ok(await p.locator('.cln-attention [data-cln="exception"]').count() === 2 && !await p.locator('.cln-row').count(), 'exceptions: blocked work and awaiting Pass checks have direct entries above closed groups');
    await p.fill('#cln-search', 'Synthetic no matching cleaning task'); await L.settle(p, 400);
    ok(await p.locator('.cln-attention [data-cln="exception"]').count() === 2, 'exceptions: a search never hides cross-kitchen blocked or Pass entries');
    await p.click('.cln-attention [data-cln="exception"][data-id="' + id('pd-pans-10') + '"]');
    ok(await p.locator(row('pd-pans-10') + ' .cln-detail').count() === 1 && await p.inputValue('textarea[data-cln-note][data-id="' + id('pd-pans-10') + '"]') === 'Synthetic blocked pans task', 'blocked link: opens its group, second page and exact existing occurrence');
    await p.click('[data-cln="week"]');
    await L.waitFor(p, () => !!document.querySelector('.cln-week-day') && !document.querySelector('.cln-loading'));
    ok(await p.locator('.cln-attention [data-cln="exception"]').count() === 2, 'Week: cross-kitchen blocked and Pass entries remain visible for the selected day');
    await p.click('.cln-attention [data-cln="exception"][data-id="' + id('c11') + '"]');
    ok(await p.locator(row('c11') + ' .cln-detail').count() === 1 && /Awaiting Pass check/.test(await L.txt(p, row('c11'))), 'Pass link: opens the existing verification path without treating performance as complete');
    ok(await writes(p) === 0 && !(await L.overflow(p)), 'exception navigation: no write and no sideways phone scroll');
  });

  await step('independent blocked and Pass filters', async () => {
    const state = (slot, status) => ({ day: TODAY, task: id('c11'), version: 1, done: false, doneAt: status === 'awaiting' ? CLOCK - 60000 : 0,
      doneById: status === 'awaiting' ? 'ann' : '', doneBy: status === 'awaiting' ? 'Ann' : '', workerId: status === 'awaiting' ? 'ann' : '', worker: status === 'awaiting' ? 'Ann' : '', by: 'ann',
      flow: { slot, kind: slot, status, checked: status === 'awaiting' ? source.find(t => t.plan.template === 'c11').plan.checks : [], note: status === 'blocked' ? 'Synthetic blocked closing clean' : '', verifiedBy: '', verifiedAt: 0 } });
    p = await open(b, { extra: { ...fixture(),
      [key('cleaningDone', TODAY + '_' + id('c11') + '__start')]: state('start', 'awaiting'),
      [key('cleaningDone', TODAY + '_' + id('c11') + '__close')]: state('close', 'blocked') } });
    if (!await contract(p, 'mixed filters')) return;
    const before = await reads(p);
    for (const filter of ['blocked', 'awaiting']) {
      await p.selectOption('#cln-status-filter', filter, { force: true });
      ok(await p.locator('.cln-row').count() === 1 && await p.locator(row('c11')).count() === 1, filter + ': a task with both a blocked occurrence and an awaiting occurrence appears in each relevant filter');
    }
    ok(await reads(p) === before && await writes(p) === 0, 'mixed filters: filtering independent occurrence states uses loaded records and never changes them');
  });

  await step('saved Week programme reused by Repeat tasks', async () => {
    p = await open(b); if (!await contract(p, 'saved Week')) return;
    await p.click('[data-cln="week"]');
    await L.waitFor(p, () => !!document.querySelector('.cln-week-day') && !document.querySelector('.cln-loading'));
    const weekReads = await reads(p);
    await p.locator('[data-cln="setup"]').first().click();
    ok(await reads(p) === weekReads, 'Week to Repeat: the loaded programme is reused without a second Today query');
    await p.fill('#cln-repeat-search', title('c08')); await L.settle(p, 400);
    await p.click('[data-cln="edit"][data-id="' + id('c08') + '"]');
    await p.fill('#cln-area', 'Synthetic changed cleaning area'); await p.click('[data-cln="save"]');
    await L.waitFor(p, () => /Saved/.test((document.querySelector('.cln-save-note') || {}).textContent || '') && !LK_PREP.unsent());
    const afterSave = await reads(p);
    await p.click('[data-cln="week"]'); await L.waitFor(p, () => !!document.querySelector('.cln-week-day') && !document.querySelector('.cln-loading'));
    const reloadedWeekReads = await reads(p);
    ok(reloadedWeekReads - afterSave <= 2, 'after a saved edit: reloading an invalidated Week uses at most its existing bounded query pair');
    await p.locator('[data-cln="setup"]').first().click();
    ok(await reads(p) === reloadedWeekReads && await p.inputValue('#cln-area') === 'Synthetic changed cleaning area', 'after a saved edit: Repeat reuses the loaded Week programme and retains the current revision');
    const revisions = await p.evaluate(taskId => Object.values(__fake.dump()).filter(t => t.root === taskId && t.until === 253402178400000), id('c08'));
    ok(revisions.length === 1 && revisions[0].prev === id('c08') && revisions[0].area === 'Synthetic changed cleaning area', 'after a saved edit: Repeat tasks retains one open replacement and the original linked history');
  });

  for (const width of [390, 768, 1280]) await step('single responsive editor ' + width, async () => {
    p = await open(b, { width }); if (!await contract(p, 'editor ' + width)) return;
    const before = await reads(p);
    await p.locator('[data-cln="setup"]').first().click();
    ok(await p.locator('[data-cln="add"]').isVisible() && !await p.locator('.cln-row, .cln-week-day').count(), width + ': Add is above a separate Repeat tasks browser');
    const add = await p.locator('[data-cln="add"]').boundingBox(), first = await p.locator('.cln-template-summary').first().boundingBox();
    ok(add.y + add.height <= first.y + 1, width + ': Add precedes the template rows');
    await p.selectOption('#cln-repeat-group', 'pans', { force: true });
    await p.click('[data-cln="repeat-page"][data-page="1"]');
    await p.click('[data-cln="edit"][data-id="' + id('pd-pans-10') + '"]');
    ok(await p.locator('#cln-form').count() === 1 && await p.locator('.cln-editor').count() === 1 && await p.locator('[data-cln="save"]').isDisabled(), width + ': selecting a task opens one unchanged editor with Save off');
    const shape = await p.evaluate(taskId => {
      const form = document.querySelector('.cln-editor'), item = document.querySelector('[data-template="' + taskId + '"]'), summary = item.querySelector('.cln-template-summary');
      const a = form.getBoundingClientRect(), z = summary.getBoundingClientRect(); return { adjacent: a.left >= z.right - 1, inline: a.top >= z.bottom - 1, sameItem: item.contains(form) };
    }, id('pd-pans-10'));
    ok(shape.sameItem && (width >= 1000 ? shape.adjacent : shape.inline), width + ': the same form sits ' + (width >= 1000 ? 'beside the task list' : 'directly below its selected row'));
    await p.fill('#cln-text', 'Synthetic unfinished cleaning draft');
    await p.selectOption('#cln-repeat-group', 'general', { force: true }); await p.fill('#cln-repeat-search', title('c08')); await L.settle(p, 400);
    ok(await p.locator('#cln-form').count() === 1 && await p.inputValue('#cln-text') === 'Synthetic unfinished cleaning draft', width + ': changing group and search keeps the selected editor and its unsaved words reachable');
    await p.click('[data-cln="edit"][data-id="' + id('c08') + '"]');
    ok(await p.inputValue('#cln-text') === 'Synthetic unfinished cleaning draft', width + ': selecting another task cannot overwrite a dirty draft');
    await p.click('[data-cln="today"]'); await p.locator('[data-cln="setup"]').first().click();
    await p.setViewportSize({ width: width >= 1000 ? 390 : 1280, height: 844 }); await L.settle(p, 150);
    ok(await p.locator('#cln-form').count() === 1 && await p.inputValue('#cln-text') === 'Synthetic unfinished cleaning draft', width + ': mode changes and resizing preserve one exact editor draft');
    ok(await reads(p) === before && await writes(p) === 0, width + ': setup browsing and resizing use loaded data and never autosave');
    ok(!(await L.overflow(p)), width + ': the editor and Add fit after resizing');
  });

  await step('whole repeat programme and bounded Week', async () => {
    p = await open(b, { width: 1280 }); if (!await contract(p, 'programme')) return;
    await p.locator('[data-cln="setup"]').first().click(); await p.selectOption('#cln-repeat-group', 'all', { force: true });
    const all = [];
    for (let page = 0; page < 9; page++) {
      if (page) await p.click('[data-cln="repeat-page"][data-page="' + page + '"]');
      const shown = await p.$$eval('.cln-template-item[data-template]', es => es.map(e => e.getAttribute('data-template')));
      ok(shown.length > 0 && shown.length <= 6, 'Repeat tasks: page ' + (page + 1) + ' contains at most six templates'); all.push(...shown);
    }
    ok(all.length === 51 && new Set(all).size === 51 && source.every(t => all.includes(id(t.plan.template))), 'Repeat tasks: all 51 templates, including off-day and anchored tasks, are reachable exactly once');
    ok(all.filter(value => value === id('c03')).length === 1, 'Repeat tasks: the existing floor template is not duplicated');
    await p.selectOption('#cln-repeat-group', 'hot', { force: true }); await p.fill('#cln-repeat-search', title('pd-pans-10')); await L.settle(p, 400);
    ok(await p.locator('[data-cln="edit"][data-id="' + id('pd-pans-10') + '"]').count() === 1, 'Repeat search: a task outside the selected group and its old page is reachable');
    const dailyReads = await reads(p); await p.click('[data-cln="week"]');
    await L.waitFor(p, () => !!document.querySelector('.cln-week-day') && !document.querySelector('.cln-loading'));
    const weekReads = await reads(p);
    ok(weekReads === dailyReads + 2 && !await p.locator('.cln-matrix').count() && await p.locator('[data-cln="day"]').count() === 7, 'Week: one bounded range pair opens the grouped day notebook with seven days');
    await p.click('[data-cln="next"]');
    await L.waitFor(p, () => !!document.querySelector('[data-cln="day"][data-day="2026-11-16"]') && !document.querySelector('.cln-loading'));
    await openGroup(p, 'pans');
    ok(await p.locator('.cln-week-day .cln-row').count() > 0 && await p.$$eval('.cln-week-day [data-cln="flow-quick"], .cln-week-day [data-cln="tick"]', es => es.every(e => e.disabled)), 'future Week: due task rows are visible and completion remains read only');
    const futureReads = await reads(p); await p.click('[data-cln="day"][data-day="2026-11-17"]');
    ok(await reads(p) === futureReads && !/recorded today/i.test(await L.txt(p, '[data-cln-group="pans"]')), 'future day: local selection adds no read and due counts do not claim today\'s completions');
    await p.click('[data-cln="previous"]');
    await L.waitFor(p, () => !!document.querySelector('[data-cln="day"][data-day="2026-11-09"]') && !document.querySelector('.cln-loading'));
    await p.click('[data-cln="previous"]');
    await L.waitFor(p, () => !!document.querySelector('[data-cln="day"][data-day="2026-11-02"]') && !document.querySelector('.cln-loading'));
    await openGroup(p, 'pans');
    ok(await p.locator('.cln-week-day .cln-row').count() > 0 && await p.$$eval('.cln-week-day [data-cln="flow-quick"], .cln-week-day [data-cln="tick"]', es => es.every(e => e.disabled)), 'past Week: task checks remain readable and cannot backdate completion');
    ok(!(await L.overflow(p)), 'Week: bounded groups fit a wide screen');
  });

  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
