// Recorded items and saved links remain accessible. (The Training page and its assessments were retired on 10 Nov 2026.)
const L = require('./lib'), C = require('../js/analysis-core');
const { R, ok } = L.results();
const path = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const day = L.ymd(new Date(L.NOW - 86400000));
const reference = { alias: 'Milk', label: 'Milk', recipeId: 'laksa', supplierId: '', itemId: '', guideId: '', v: 1, at: L.NOW, by: 'owner' };
const daily = C.daily(day, {
  prep: [
    { id: 'milk', text: 'Milk', station: 'Larder', done: true, doneById: 'ann' },
    { id: 'burger', text: 'Chicken Burger', recipe: 'burger', station: 'Grill', done: true, doneById: 'sam' },
    { id: 'herbs', text: 'Chop herbs', station: 'Larder' }
  ],
  supplierOrders: [{ id: 'rolls', text: 'Bread rolls', sid: 'test-supplier', itemId: 'rolls', amount: 2, unit: 'bags' }]
}, [{ ...reference, id: 'ai-milk' }]);
const aggregate = C.aggregate([daily]);
const extra = {
  [path('references', 'ai-milk')]: reference,
  [path('analysis', 'current')]: { generation: 'g1', at: L.NOW, from: day, to: day, days: 1 },
  [path('analysis', 'health')]: { status: 'ok', at: L.NOW },
  [path('analysisDaily', 'g1_' + day)]: daily,
  [path('suppliers', 'test-supplier')]: { name: 'Test supplier', items: [{ id: 'rolls', name: 'Bread rolls' }] },
  [path('training', 'ai-recipe-only')]: { personId: 'ann', section: 'Grill', recipeId: 'burger', guideId: 'lk-smoke-service', status: 'confirmed', assessorId: 'sam', day, v: 1, at: L.NOW, by: 'owner' }
};
for (const n of [7, 30, 90]) extra[path('analysis', 'range-' + n)] = {
  ...aggregate, generation: 'g1', from: day, to: day, days: 1, totalItems: aggregate.items.length,
  at: L.NOW, dates: [{ day, counts: daily.counts }],
  people: { ann: { Larder: 4 }, sam: { Grill: 8, Larder: 1 }, bo: { Grill: 2 } }
};
extra[path('config', 'main')] = { ...L.seed()[path('config', 'main')], kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'larder', name: 'Larder' }] };

const review = async (p, id) => {
  const controls = p.locator('.ai-reference-candidates [data-ai="review-reference"]');
  for (let i = 0; i < await controls.count(); i++) if (await controls.nth(i).getAttribute('data-value') === id) { await controls.nth(i).click(); return; }
  throw new Error('Missing recorded item: ' + id);
};
const waitReferences = p => L.waitFor(p, () => document.querySelectorAll('.ai-reference-candidates [data-ai="review-reference"]').length >= 2);
const savedReferences = async p => {
  await L.adminTab(p, 'reference-records');
  await L.waitFor(p, () => !!document.querySelector('.ai-reference-confirmed [data-ai="edit-reference"]'));
};
const referenceOptions = async p => {
  if (!(await p.locator('[data-ai-disclosure="reference-options"]').evaluate(el => el.open))) {
    await p.locator('[data-ai-disclosure="reference-options"] summary').click();
  }
};
const privateWrites = p => p.evaluate(() => window.__fake.writes.flat().filter(x => /\/(references|training)\//.test(x.path)).length);
const searchReferences = async (p, text) => {
  if (text) await p.locator('#record-q-reference-queue, #record-q-reference-records').fill(text); else await L.clear(p, '#record-q-reference-queue, #record-q-reference-records');
  await L.settle(p, 250);
  await L.settle(p, 200);
};

(async () => {
  const b = await L.start();
  for (const width of [390, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, who: '', width, extra, wait: 1600 });
    await savedReferences(p);
    ok(await p.locator('.ai-reference-confirmed [data-ai="edit-reference"]').count() === 1, width + ': the saved confirmed reference stays visible');
    await L.adminTab(p, 'references'); await waitReferences(p);
    const candidates = await L.txt(p, '.ai-reference-candidates');
    ok(/Chicken Burger/.test(candidates) && /Bread rolls/.test(candidates) && /Chop herbs/.test(candidates), width + ': other recorded items remain available after opening the confirmed reference');
    ok(await p.locator('.ai-reference-confirmed').count() === 0 && await p.locator('[data-ai="page"][data-value="reference-records"]').count() > 0, width + ': saved links have a direct destination instead of extending the review queue');
    ok(await p.locator('.ai-reference-candidates [data-ai="review-reference"]').count() === 3, width + ': the confirmed Milk alias is not offered again');
    ok(await privateWrites(p) === 0, width + ': browsing records creates no links or training records');

    await searchReferences(p, 'herbs');
    ok(await p.locator('.ai-reference-candidates [data-ai="review-reference"]').count() === 1 && /Chop herbs/.test(await L.txt(p, '.ai-reference-candidates')), width + ': search finds a recorded name');
    await searchReferences(p, '');
    await review(p, 'ref:supplier:test-supplier:rolls');
    ok(await p.inputValue('#ai-alias') === 'Bread rolls' && await p.inputValue('#ai-supplierId') === 'test-supplier' && await p.inputValue('#ai-itemId') === 'rolls', width + ': supplier source ids prefill the review form');
    await p.click('[data-ai="cancel"]');
    await review(p, 'ref:recipe:burger');
    ok(await p.inputValue('#ai-alias') === 'Chicken Burger' && await p.inputValue('#ai-recipeId') === 'burger', width + ': explicit recipe source preloads a draft for confirmation');
    await p.click('[data-ai="save"]');
    await L.waitFor(p, () => Object.keys(window.__fake.dump()).filter(k => /\/references\/[^/]+$/.test(k)).length === 2);
    ok(await p.locator('.ai-reference-candidates [data-ai="review-reference"]').count() === 2 && /Chop herbs/.test(await L.txt(p, '.ai-reference-candidates')), width + ': confirming one item leaves the other recorded items available');
    await savedReferences(p);
    const confirmedCount = await p.locator('.ai-reference-confirmed [data-ai="edit-reference"]').count();
    await L.adminTab(p, 'analysis'); await L.adminTab(p, 'references');
    ok(confirmedCount === 2 && await p.locator('.ai-reference-candidates [data-ai="review-reference"]').count() === 2, width + ': returning to review preserves both the remaining queue and saved links');

    await review(p, 'prep:chop herbs'); await referenceOptions(p); await p.fill('#ai-label', 'Keep this draft');
    await L.adminTab(p, 'analysis'); await L.adminTab(p, 'references');
    if (await p.locator('.ai-resume [data-ai="resume"]').count()) await p.click('.ai-resume [data-ai="resume"]');
    await referenceOptions(p);
    ok(await p.inputValue('#ai-label') === 'Keep this draft' && await p.evaluate(() => LK_PREP.unsaved()), width + ': a reference draft survives changing admin pages');
    await p.evaluate(() => { const label = document.getElementById('ai-label'); label.focus(); label.setSelectionRange(2, 5); LK_PREP.mount('admin', LK_PREP.state.root); });
    const labelFocus = await p.evaluate(() => { const label = document.getElementById('ai-label'); return { focused: document.activeElement === label, value: label.value, start: label.selectionStart, end: label.selectionEnd, open: label.closest('details').open }; });
    ok(labelFocus.focused && labelFocus.value === 'Keep this draft' && labelFocus.start === 2 && labelFocus.end === 5, width + ': a background redraw preserves the chosen field, text and selection (' + JSON.stringify(labelFocus) + ')');
    await p.click('[data-ai="cancel"]');
    // the Training page and its assessments were retired on 10 Nov 2026: no opportunity queue, nothing written
    ok(await p.locator('[data-t="training"], .ai-training-opportunities').count() === 0 && await privateWrites(p) === 1, width + ': no Training page, and only the confirmed link was written');
    ok(!(await L.overflow(p)), width + ': references fit without sideways scroll');
    ok(p.errors.length === 0, width + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  let p;
  p = await L.open(b, '#/admin', { admin: true, who: '', extra, failReads: '/analysis/range-90$', wait: 1600 });
  await L.adminTab(p, 'references');
  await L.waitFor(p, () => /Could not|Unable|unavailable|Try again/i.test((document.querySelector('.ai-reference-queue') || {}).textContent || ''));
  ok(/Could not|Unable|unavailable|Try again/i.test(await L.txt(p, '.ai-reference-queue')), 'unavailable recorded items are shown as a loading error, not an empty catalogue');
  await savedReferences(p);
  ok(/Milk/.test(await L.txt(p, '.ai-reference-confirmed')), 'a failed source-summary read never hides saved confirmed references');
  ok(p.errors.length === 0, 'source-summary failure has no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/admin', { admin: true, who: '', extra, wait: 1400 });
  await p.evaluate(() => { window.__fake.stall = /\/analysis\/range-90$/; });
  await L.adminTab(p, 'references');
  await savedReferences(p);
  ok(/Milk/.test(await L.txt(p, '.ai-reference-confirmed')), 'confirmed links remain visible while recorded items are still loading');
  await p.evaluate(() => { window.__fake.stall = null; });
  await L.adminTab(p, 'references');
  await p.click('[data-ai="refresh"]'); await waitReferences(p);
  ok(await p.locator('.ai-reference-candidates [data-ai="review-reference"]').count() === 3, 'Refresh recovers recorded items after a stalled earlier read');
  ok(p.errors.length === 0, 'loading-order recovery has no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/admin', { admin: true, who: '', extra, wait: 1400 });
  await p.route('**/js/admin-intelligence.js?v=7', route => route.fulfill({ contentType: 'text/javascript', body: 'window.LK_INTELLIGENCE = { API: 2 };' }));
  await L.adminTab(p, 'references');
  await L.waitFor(p, () => /Could not load the workspace/.test(document.body.textContent));
  await L.settle(p, 300);
  ok(p.urls.filter(url => /admin-intelligence\.js\?v=7/.test(url)).length === 2, 'an old cached module shows a recoverable error without repeated load or render loops');
  ok(p.errors.length === 0, 'mixed module version has no uncaught browser errors');
  await p.context().close();

  p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1400 });
  ok(!(await p.evaluate(() => window.LK_INTELLIGENCE)) && !(await p.evaluate(() => window.__fake.reads.some(x => /\/(analysis|analysisDaily|references|training)\//.test(x)))), 'staff entry still loads no private training or reference data');
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
