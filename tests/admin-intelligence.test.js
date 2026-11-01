const L = require('./lib'), C = require('../js/analysis-core');
const { R, ok } = L.results();
const path = (...p) => ['kitchens', L.PIN, ...p].join('/');
const day = L.ymd(new Date(L.NOW - 86400000));
const ref = { alias: 'Milk', label: 'Milk', recipeId: 'laksa', supplierId: '', itemId: '', guideId: 'lk-smoke-service', v: 1, at: L.NOW, by: 'owner' };
const daily = C.daily(day, { prep: [{ id: 'p', text: 'Milk', done: true, doneById: 'ann', station: 'Larder' }], waste: [{ id: 'w', text: 'Milk', amount: 2, unit: 'L', reason: 'excess' }] }, [{ ...ref, id: 'ai-milk' }]);
const agg = C.aggregate([daily]);
const extra = { [path('references', 'ai-milk')]: ref,
  [path('analysis', 'current')]: { generation: 'g1', at: L.NOW, from: day, to: day, days: 1 },
  [path('analysis', 'health')]: { at: L.NOW, status: 'failed' }, [path('analysisDaily', 'g1_' + day)]: daily };
for (const n of [7, 30, 90]) extra[path('analysis', 'range-' + n)] = { ...agg, generation: 'g1', from: day, to: day, days: 1, totalItems: agg.items.length, at: L.NOW, dates: [{ day, counts: daily.counts }] };
extra[path('config', 'main')] = { ...L.seed()[path('config', 'main')], kitSecs: [{ id: 'larder', name: 'Larder' }] };
const editSavedReference = async (p, label) => {
  await L.adminTab(p, 'reference-records');
  await p.click('.ai-reference-confirmed [data-ai="edit-reference"]');
  await p.locator('[data-ai-disclosure="reference-options"] summary').click();
  await p.fill('#ai-label', label);
};
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width, extra, wait: 1800 });
    await L.adminTab(p, 'overview'); await L.waitFor(p, () => /latest analysis run failed/.test(document.body.textContent));
    ok(await p.locator('.a-section-picker').isVisible() === (width < 1000), width + ': responsive section picker');
    await L.adminTab(p, 'analysis'); await p.locator('[data-ai="item"]').first().click();
    ok(/Confirmed or explicit source reference/.test(await L.txt(p, '.ai-workspace')), width + ': confirmed item evidence');
    await p.locator('[data-ai="evidence"]').first().click(); await L.settle(p, 500);
    ok(/Record: w/.test(await L.txt(p, '.ai-workspace')), width + ': opens daily source evidence');
    ok(await p.locator('.ai-workspace a[href="#/r/laksa"]').count() === 1, width + ': recipe reference');
    await editSavedReference(p, 'Milk reference');
    await p.click('[data-ai="save"]');
    await L.waitFor(p, k => (window.__fake.dump()[k] || {}).v === 2, path('references', 'ai-milk'));
    const dump = await p.evaluate(() => window.__fake.dump());
    ok(dump[path('references', 'ai-milk')].v === 2 && dump[path('references', 'ai-milk')].alias === 'Milk' && dump[path('references', 'ai-milk')].label === 'Milk reference' && dump[path('references', 'ai-milk', 'hist', '1')].label === 'Milk', width + ': prior revision retained ' + JSON.stringify({ current: dump[path('references', 'ai-milk')], previous: dump[path('references', 'ai-milk', 'hist', '1')] }));
    await L.adminTab(p, 'training'); await p.click('[data-ai="new-training"]');
    await p.selectOption('#ai-personId', 'ann'); await p.selectOption('#ai-section', 'Larder');
    await p.selectOption('#ai-status', 'in-training'); await p.selectOption('#ai-assessorId', 'sam');
    await p.click('[data-ai="save"]');
    await L.waitFor(p, () => Object.keys(window.__fake.dump()).some(k => /\/training\/[^/]+$/.test(k)));
    const saved = await p.evaluate(() => Object.entries(window.__fake.dump()).filter(([k]) => /\/training\/[^/]+$/.test(k)).map(([, v]) => v));
    ok(saved.length === 1 && saved[0].status === 'in-training', width + ': explicit training assessment saved');
    await p.selectOption('#ai-person-filter', 'ann');
    ok(/Larder/.test(await L.txt(p, '.ai-workspace')), width + ': person activity accessible');
    ok(!(await L.overflow(p)), width + ': no overflow');
    ok(p.errors.length === 0, width + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  let p = await L.open(b, '#/admin', { admin: true, who: '', extra, wait: 1800 });
  await editSavedReference(p, 'Keep my draft');
  await p.evaluate(() => { window.__fake.deny = /\/references\//; });
  await p.click('[data-ai="save"]');
  await L.waitFor(p, () => /Could not save/.test((document.querySelector('.ai-message') || {}).textContent || ''), null, 5000).catch(() => {});
  const failedLabel = await p.locator('#ai-label').count() ? await p.inputValue('#ai-label') : '(missing form)';
  const failedMessage = await L.txt(p, '.ai-workspace');
  ok(failedLabel === 'Keep my draft' && /Could not save/.test(failedMessage), 'failed save retains draft (' + failedLabel + ', ' + (await L.txt(p, '.ai-message') || 'no save error') + ')');
  ok(await p.evaluate(() => LK_PREP.unsaved()), 'reference draft participates in unsaved guard');
  ok(p.errors.length === 0, 'failed-save handling has no browser errors ' + p.errors.join(' | '));
  await p.evaluate(() => { window.__fake.deny = null; });
  await p.click('[data-p="signout"]'); await L.settle(p, 100); await p.click('[data-p="signout"]'); await L.settle(p, 500);
  ok(!(await p.locator('.ai-workspace').count()) && !(await p.evaluate(() => LK_INTELLIGENCE.dirty())), 'hand-over clears private views and drafts');
  await p.context().close();
  p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1500 });
  ok(!(await p.evaluate(() => window.LK_INTELLIGENCE)) && !(await p.evaluate(() => window.__fake.reads.some(x => /\/(analysis|analysisDaily|references|training)\//.test(x)))), 'staff never load private analysis');
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
