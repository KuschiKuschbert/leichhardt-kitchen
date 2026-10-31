// Recorded items stay visible beside confirmed links. Training activity never becomes a section assessment.
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
const waitReferences = p => L.waitFor(p, () => !!document.querySelector('.ai-reference-confirmed [data-ai="edit-reference"]') && document.querySelectorAll('.ai-reference-candidates [data-ai="review-reference"]').length >= 2);
const privateWrites = p => p.evaluate(() => window.__fake.writes.flat().filter(x => /\/(references|training)\//.test(x.path)).length);
const searchReferences = async (p, text) => {
  await p.locator('[data-ai-reference-search] [name="q"]').fill(text);
  await p.locator('[data-ai-reference-search]').evaluate(form => form.requestSubmit());
  await L.settle(p, 200);
};

(async () => {
  const b = await L.start();
  for (const width of [390, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, who: '', width, extra, wait: 1600 });
    await L.adminTab(p, 'references'); await waitReferences(p);
    ok(await p.locator('.ai-reference-confirmed [data-ai="edit-reference"]').count() === 1, width + ': the saved confirmed reference stays visible');
    const candidates = await L.txt(p, '.ai-reference-candidates');
    ok(/Chicken Burger/.test(candidates) && /Bread rolls/.test(candidates) && /Chop herbs/.test(candidates), width + ': other recorded items remain available beside the confirmed reference');
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
    await L.waitFor(p, () => document.querySelectorAll('.ai-reference-confirmed [data-ai="edit-reference"]').length === 2);
    ok(await p.locator('.ai-reference-candidates [data-ai="review-reference"]').count() === 2 && /Chop herbs/.test(await L.txt(p, '.ai-reference-candidates')), width + ': confirming one item leaves the other recorded items available');
    await L.adminTab(p, 'training'); await L.adminTab(p, 'references');
    ok(await p.locator('.ai-reference-confirmed [data-ai="edit-reference"]').count() === 2 && await p.locator('.ai-reference-candidates [data-ai="review-reference"]').count() === 2, width + ': returning to Item references keeps both lists');

    await review(p, 'prep:chop herbs'); await p.fill('#ai-label', 'Keep this draft');
    await L.adminTab(p, 'training'); await L.adminTab(p, 'references');
    ok(await p.inputValue('#ai-label') === 'Keep this draft' && await p.evaluate(() => LK_PREP.unsaved()), width + ': a reference draft survives changing admin pages');
    await p.evaluate(() => { const label = document.getElementById('ai-label'); label.focus(); label.setSelectionRange(2, 5); LK_PREP.mount('admin', LK_PREP.state.root); });
    ok(await p.evaluate(() => { const label = document.getElementById('ai-label'); return document.activeElement === label && label.value === 'Keep this draft' && label.selectionStart === 2 && label.selectionEnd === 5; }), width + ': a background redraw preserves the chosen field, text and selection');
    await p.click('[data-ai="cancel"]');
    await L.adminTab(p, 'training');
    await L.waitFor(p, () => !!document.querySelector('.ai-training-opportunities [data-ai="training-opportunity"]'));
    const opportunityValues = await p.locator('.ai-training-opportunities [data-ai="training-opportunity"]').evaluateAll(nodes => nodes.map(el => JSON.parse(el.getAttribute('data-value'))));
    ok(opportunityValues.some(x => x.personId === 'ann' && x.section === 'Grill'), width + ': a confirmed recipe does not hide the whole-section training opportunity');
    ok(opportunityValues.some(x => x.personId === 'sam' && x.section === 'Grill'), width + ': recorded ticks alone do not confirm a section');
    ok(/Prep ticks show recorded work\. They do not confirm skill or training\./.test(await L.txt(p, '.ai-workspace')), width + ': training explains how activity and assessment differ');
    const opportunity = p.locator('.ai-training-opportunities [data-ai="training-opportunity"]');
    for (let i = 0; i < await opportunity.count(); i++) {
      const value = JSON.parse(await opportunity.nth(i).getAttribute('data-value'));
      if (value.personId === 'ann' && value.section === 'Grill') { await opportunity.nth(i).click(); break; }
    }
    ok(await p.inputValue('#ai-personId') === 'ann' && await p.inputValue('#ai-section') === 'Grill' && await p.inputValue('#ai-status') === 'not-assessed', width + ': an opportunity opens an explicit assessment draft without confirming it');
    ok(await privateWrites(p) === 1, width + ': reviewing opportunities creates no assessment write');
    const sectionFocus = await p.evaluate(() => {
      document.getElementById('ai-section').focus();
      LK_PREP.mount('admin', LK_PREP.state.root);
      return { id: document.activeElement && document.activeElement.id, value: document.getElementById('ai-section').value };
    });
    ok(sectionFocus.id === 'ai-section' && sectionFocus.value === 'Grill', width + ': a background redraw keeps focus and value in the training section field (' + JSON.stringify(sectionFocus) + ')');
    const sectionKeys = await p.evaluate(() => ({
      navigation: document.querySelector('.a-section-picker select').getAttribute('data-k'),
      editor: document.getElementById('ai-section').getAttribute('data-k')
    }));
    ok(sectionKeys.navigation !== sectionKeys.editor, width + ': admin navigation and training section use distinct focus keys (' + JSON.stringify(sectionKeys) + ')');

    await p.click('[data-ai="cancel"]');
    ok(!(await L.overflow(p)), width + ': references and training fit without sideways scroll');
    ok(p.errors.length === 0, width + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  let p = await L.open(b, '#/admin', { admin: true, who: '', extra, failReads: '/analysis/range-90$', wait: 1600 });
  await L.adminTab(p, 'references');
  await L.waitFor(p, () => !!document.querySelector('.ai-reference-confirmed [data-ai="edit-reference"]'));
  ok(/Milk/.test(await L.txt(p, '.ai-reference-confirmed')), 'a failed source-summary read never hides saved confirmed references');
  ok(/Could not|Unable|unavailable|Try again/i.test(await L.txt(p, '.ai-reference-candidates')), 'unavailable recorded items are shown as a loading error, not an empty catalogue');
  ok(p.errors.length === 0, 'source-summary failure has no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/admin', { admin: true, who: '', extra, wait: 1400 });
  await p.evaluate(() => { window.__fake.stall = /\/analysis\/range-90$/; });
  await L.adminTab(p, 'references');
  await L.waitFor(p, () => !!document.querySelector('.ai-reference-confirmed [data-ai="edit-reference"]'));
  ok(/Milk/.test(await L.txt(p, '.ai-reference-confirmed')), 'confirmed links remain visible while recorded items are still loading');
  await p.evaluate(() => { window.__fake.stall = null; });
  await p.click('[data-ai="refresh"]'); await waitReferences(p);
  ok(await p.locator('.ai-reference-candidates [data-ai="review-reference"]').count() === 3, 'Refresh recovers recorded items after a stalled earlier read');
  ok(p.errors.length === 0, 'loading-order recovery has no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/admin', { admin: true, who: '', extra, wait: 1400 });
  await p.route('**/js/admin-intelligence.js?v=2', route => route.fulfill({ contentType: 'text/javascript', body: 'window.LK_INTELLIGENCE = { API: 1 };' }));
  await L.adminTab(p, 'references');
  await L.waitFor(p, () => /Could not load the workspace/.test(document.body.textContent));
  await L.settle(p, 300);
  ok(p.urls.filter(url => /admin-intelligence\.js\?v=2/.test(url)).length === 2, 'an old cached module shows a recoverable error without repeated load or render loops');
  ok(p.errors.length === 0, 'mixed module version has no uncaught browser errors');
  await p.context().close();

  p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1400 });
  ok(!(await p.evaluate(() => window.LK_INTELLIGENCE)) && !(await p.evaluate(() => window.__fake.reads.some(x => /\/(analysis|analysisDaily|references|training)\//.test(x)))), 'staff entry still loads no private training or reference data');
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
