// A selected review opens beside its queue, or as a focused phone task.
const L = require('./lib'), C = require('../js/analysis-core'), fs = require('node:fs'), vm = require('node:vm');
const { R, ok } = L.results();
const path = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const day = L.ymd(new Date(L.NOW - 86400000));
const reference = { alias: 'Milk', label: 'Milk', recipeId: 'laksa', supplierId: '', itemId: '', guideId: '', v: 1, at: L.NOW, by: 'owner' };
const daily = C.daily(day, { prep: [
  { id: 'burger', text: 'Chicken Burger', recipe: 'burger', station: 'Grill', done: true, doneById: 'ann' },
  { id: 'herbs', text: 'Chop herbs', station: 'Grill' },
  ...Array.from({ length: 45 }, (_, n) => ({ id: 'p' + n, text: 'Recorded item ' + String(n).padStart(2, '0'), station: 'Grill', done: true, doneById: 'ann' }))
], supplierOrders: [{ id: 'rolls', text: 'Bread rolls', sid: 'test-supplier', itemId: 'rolls', amount: 2, unit: 'bags' }] }, [{ ...reference, id: 'ai-milk' }]);
const aggregate = C.aggregate([daily]);
const extra = {
  [path('analysis', 'current')]: { generation: 'g1', at: L.NOW, from: day, to: day, days: 1 },
  [path('analysis', 'health')]: { status: 'ok', at: L.NOW },
  [path('analysisDaily', 'g1_' + day)]: daily,
  [path('references', 'ai-milk')]: reference,
  [path('suppliers', 'test-supplier')]: { name: 'Test supplier', items: [{ id: 'rolls', name: 'Bread rolls' }] }
};
for (const n of [7, 30, 90]) extra[path('analysis', 'range-' + n)] = {
  ...aggregate, generation: 'g1', at: L.NOW, from: day, to: day, days: 1,
  dates: [{ day, counts: daily.counts }], totalItems: aggregate.items.length
};
const clickValue = (p, action, value) => p.locator('[data-ai="' + action + '"]').evaluateAll((nodes, value) => {
  const node = nodes.find(el => el.getAttribute('data-value') === value);
  if (!node) throw Error('Missing action value: ' + value);
  node.click();
}, value);
const search = async (p, text) => {
  await p.fill('#record-q-analysis-items', text);
  await p.press('#record-q-analysis-items', 'Enter');
  await L.settle(p, 100);
};
const openOptions = async p => {
  const details = p.locator('[data-ai-disclosure="reference-options"]');
  if (!(await details.evaluate(el => el.open))) await details.locator('summary').click();
};
const privateWrites = p => p.evaluate(() => window.__fake.writes.flat().filter(x => /\/(references|training)\//.test(x.path)).length);
const initialListGuard = async () => {
  const events = {}, window = { LK_ANALYSIS: C, scrollY: 0, scrollTo: () => {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/admin-intelligence'), 'utf8'), {
    window, document: { addEventListener: (name, fn) => { events[name] = fn; }, querySelector: () => null, querySelectorAll: () => [] }
  });
  let html = '', releaseReferences, writes = 0;
  const references = new Promise(resolve => { releaseReferences = resolve; });
  const adapter = { allowed: () => true, context: () => 'owner', loadGuides: () => {},
    draw: () => { html = window.LK_INTELLIGENCE.html('references', adapter); },
    list: name => name === 'references' ? references : Promise.resolve([]),
    get: () => Promise.resolve({ items: [], totalItems: 0, from: day, to: day }),
    recipes: () => [{ id: 'burger', name: 'Chicken Burger' }], guides: () => [], people: () => [], sections: () => [],
    day: () => day, now: () => L.NOW, save: () => { writes++; return Promise.resolve(); }
  };
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  const action = name => events.click({ target: { closest: () => ({ getAttribute: key => key === 'data-ai' ? name : '' }) } });
  adapter.draw(); await settle(); action('new-reference');
  for (const [field, value] of [['alias', 'Milk'], ['label', 'Milk'], ['recipeId', 'burger']]) {
    events.input({ target: { matches: selector => selector === '[data-ai-field]', getAttribute: () => field, value } });
  }
  adapter.draw();
  ok(/data-ai="save"[^>]* disabled/.test(html), 'a new valid link cannot be saved until the existing reference list has loaded');
  action('save'); await settle();
  ok(writes === 0, 'the save handler also refuses a new link while duplicate checking is unavailable');
  releaseReferences([{ ...reference, id: 'ai-milk' }]); await settle(); action('save'); await settle();
  ok(writes === 0 && /already has a reference/.test(html), 'a late existing list cannot be bypassed to create a duplicate alias');
};

(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, who: '', width, extra, wait: 1600 });
    await L.adminTab(p, 'analysis');
    await L.waitFor(p, () => document.querySelectorAll('[data-ai="item"]').length >= 40);
    await clickValue(p, 'range', '7'); await search(p, 'Recorded item');
    await p.locator('[data-ai="item"]').last().scrollIntoViewIfNeeded();
    const position = await p.evaluate(() => ({ top: scrollY, queue: document.querySelector('.ai-queue').scrollTop }));
    await p.locator('[data-ai="item"]').last().click();
    const detail = await p.evaluate(() => {
      const el = document.querySelector('.ai-detail'), heading = document.querySelector('.ai-task-heading');
      const r = el && el.getBoundingClientRect();
      return { desk: !!document.querySelector('.ai-desk'), visible: !!r && r.top >= 0 && r.top < innerHeight,
        focused: !!heading && document.activeElement === heading };
    });
    ok(detail.desk && detail.visible, width + ': selecting an item reveals its detail before the 40-row queue (' + JSON.stringify(detail) + ')');
    ok(detail.focused, width + ': opening a task focuses its heading for keyboard and screen-reader users');
    await p.evaluate(() => LK_PREP.mount('admin', LK_PREP.state.root));
    ok(await p.evaluate(() => document.activeElement === document.querySelector('.ai-task-heading')), width + ': a background redraw keeps focus on the current task heading');
    const layout = await p.evaluate(() => {
      const q = document.querySelector('.ai-queue'), d = document.querySelector('.ai-detail');
      const a = q.getBoundingClientRect(), b = d.getBoundingClientRect();
      return { queueVisible: !!q.getClientRects().length && getComputedStyle(q).display !== 'none', beside: a.right <= b.left + 2 };
    });
    ok(width < 1100 ? !layout.queueVisible : layout.queueVisible && layout.beside, width + ': review uses a focused phone or tablet view, or a queue beside the detail on desktop');
    await p.click('.wtop [data-act="back"]'); await L.settle(p, 150);
    const restored = await p.evaluate(() => ({ query: document.querySelector('#record-q-analysis-items').dataset.committedQuery,
      range: document.querySelector('[data-ai="range"][aria-pressed="true"]').getAttribute('data-value'), top: scrollY,
      queue: document.querySelector('.ai-queue').scrollTop }));
    ok(restored.query === 'Recorded item' && restored.range === '7', width + ': contextual Back preserves the item search and activity period');
    ok(Math.abs(restored.top - position.top) < 48 && Math.abs(restored.queue - position.queue) < 4, width + ': contextual Back restores the list position (' + JSON.stringify({ position, restored }) + ')');

    await search(p, 'Chicken Burger'); await clickValue(p, 'item', 'ref:recipe:burger');
    await p.locator('.ai-detail [data-ai="map"]').last().click();
    ok(await p.inputValue('#ai-alias') === 'Chicken Burger' && await p.inputValue('#ai-recipeId') === 'burger' && await p.inputValue('#ai-linkType') === 'recipe', width + ': Confirm reference keeps the explicit recipe identity from Analysis');
    await p.click('[data-ai="cancel"]');
    await L.adminTab(p, 'analysis'); await p.click('.wtop [data-act="back"]');
    await search(p, 'Bread rolls'); await clickValue(p, 'item', 'ref:supplier:test-supplier:rolls');
    await p.locator('.ai-detail [data-ai="map"]').last().click();
    ok(await p.inputValue('#ai-alias') === 'Bread rolls' && await p.inputValue('#ai-supplierId') === 'test-supplier' && await p.inputValue('#ai-itemId') === 'rolls' && await p.inputValue('#ai-linkType') === 'supplier', width + ': Confirm reference keeps the explicit supplier and item identity from Analysis');
    await p.click('[data-ai="cancel"]');
    ok(await privateWrites(p) === 0, width + ': evidence navigation and opening reference drafts perform no private writes');

    await L.adminTab(p, 'references'); await clickValue(p, 'review-reference', 'prep:chop herbs');
    await openOptions(p); await p.fill('#ai-label', 'Keep the unfinished herb link');
    await p.click('.wtop [data-act="back"]');
    ok(await p.locator('.ai-resume [data-ai="resume"]').isVisible() && await p.locator('.ai-editor:visible').count() === 0 && await p.evaluate(() => LK_PREP.unsaved()), width + ': header Back returns to the queue and exposes the unfinished draft');
    await L.adminTab(p, 'people');
    ok(await p.locator('.ai-resume [data-ai="resume"]').isVisible(), width + ': an unfinished review stays discoverable on a legacy admin page');
    await p.click('.ai-resume [data-ai="resume"]'); await openOptions(p);
    ok(await p.inputValue('#ai-alias') === 'Chop herbs' && await p.inputValue('#ai-label') === 'Keep the unfinished herb link', width + ': Resume returns to the correct subject with its entered values');
    await p.click('[data-ai="cancel"]');

    await L.adminTab(p, 'references'); await clickValue(p, 'review-reference', 'ref:recipe:burger');
    await p.evaluate(() => { document.querySelector('[data-ai="save-next"]').click(); window.__fake.mode = 'hold'; });
    await L.waitFor(p, () => window.__fake.writes.flat().some(x => /\/references\//.test(x.path)));
    ok(await p.inputValue('#ai-alias') === 'Chicken Burger' && await p.locator('[data-ai="save-next"]').isDisabled() && await p.evaluate(() => LK_PREP.unsaved()), width + ': Save and next keeps the current task while acknowledgement is pending');
    ok(await p.locator('.ai-editor input, .ai-editor select, .ai-editor textarea').evaluateAll(nodes => nodes.length > 0 && nodes.every(el => el.matches(':disabled'))), width + ': a pending save disables every editable field so acknowledgement cannot discard later edits');
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await L.waitFor(p, () => document.getElementById('ai-alias') && document.getElementById('ai-alias').value !== 'Chicken Burger');
    const nextAlias = await p.inputValue('#ai-alias');
    ok(nextAlias !== 'Chicken Burger' && await p.evaluate(() => Object.values(window.__fake.dump()).some(v => v && v.alias === 'Chicken Burger' && v.recipeId === 'burger')), width + ': acknowledged Save and next confirms only that reference and opens another queued item');
    await openOptions(p); await p.fill('#ai-label', 'Keep the failed next link');
    if (await p.inputValue('#ai-linkType') === 'recipe') await L.pick(p, '#ai-recipeId', 'burger');
    await p.evaluate(() => { window.__fake.deny = /\/references\//; });
    await p.click('[data-ai="save-next"]');
    await L.waitFor(p, () => /Could not save/.test((document.querySelector('.ai-message') || {}).textContent || ''));
    await openOptions(p);
    ok(await p.inputValue('#ai-alias') === nextAlias && await p.inputValue('#ai-label') === 'Keep the failed next link' && await p.evaluate(() => LK_PREP.unsaved()), width + ': failed Save and next retains this draft instead of advancing');
    await p.evaluate(() => { window.__fake.deny = null; }); await p.click('[data-ai="cancel"]');
    await L.adminTab(p, 'reference-records');
    await L.waitFor(p, () => document.querySelectorAll('.ai-reference-confirmed [data-ai="edit-reference"]').length === 2);
    ok(/Milk/.test(await L.txt(p, '.ai-reference-confirmed')) && /Chicken Burger/.test(await L.txt(p, '.ai-reference-confirmed')), width + ': confirmed links remain accessible in Saved records');
    await L.adminTab(p, 'references');
    ok(await p.locator('.ai-reference-candidates [data-ai="review-reference"]').count() >= 2 && await p.locator('.ai-reference-confirmed').count() === 0, width + ': other opportunities remain in the separate review queue');
    await p.click('[data-ai="new-reference"]');
    const optional = p.locator('[data-ai-disclosure="reference-options"]');
    if (await optional.evaluate(el => el.open)) await optional.locator('summary').click();
    const manualAlias = 'Manual recipe link ' + width;
    await p.fill('#ai-alias', manualAlias); await L.pick(p, '#ai-recipeId', 'burger');
    const manualReady = await p.locator('[data-ai="save"]').isEnabled();
    ok(manualReady && !(await optional.evaluate(el => el.open)), width + ': a manually added link can be saved using its visible name and recipe fields');
    if (manualReady) {
      await p.click('[data-ai="save"]');
      await L.waitFor(p, alias => Object.values(window.__fake.dump()).some(r => r && r.alias === alias), manualAlias);
      const manual = await p.evaluate(alias => Object.values(window.__fake.dump()).find(r => r && r.alias === alias), manualAlias);
      ok(manual.label === manualAlias && manual.recipeId === 'burger', width + ': a manual link saves its visible name as the initial reference name');
    } else await p.click('[data-ai="cancel"]');
    ok(!(await L.overflow(p)), width + ': review and saved-record flows fit without horizontal scrolling');
    ok(p.errors.length === 0, width + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close(); await initialListGuard(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
