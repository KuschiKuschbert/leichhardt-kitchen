// A slow response from before Refresh must not replace the newly loaded review queue.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const C = require('../js/analysis-core');
(async () => {
  const events = {}, reads = [], window = { LK_ANALYSIS: C };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/admin-intelligence'), 'utf8'), {
    window, document: { addEventListener: (name, fn) => { events[name] = fn; } }, requestAnimationFrame: () => {}
  });
  let html = '', writes = 0, page = 'reference-records';
  const ref = { id: 'ai-milk', alias: 'Milk', label: 'Milk', recipeId: 'milk' };
  const api = {
    allowed: () => true, context: () => 'owner', loadGuides: () => {},
    draw: () => { html = window.LK_INTELLIGENCE.html(page, api); },
    list: name => Promise.resolve(name === 'references' ? [ref] : []),
    get: name => name === 'analysis/range-90' ? new Promise(resolve => reads.push(resolve)) : Promise.resolve(null),
    save: () => { writes++; }, recipes: () => [], guides: () => [], people: () => [], sections: () => []
  };
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  const summary = text => ({ from: '2026-08-01', to: '2026-10-30', items: [{ id: text, text, counts: { prep: 1 }, sample: 1 }], totalItems: 1 });
  api.draw(); await settle();
  assert.match(html, /ai-reference-confirmed/); assert.match(html, /Milk/);
  assert.equal(reads.length, 0, 'Saved records do not depend on an activity-summary read');
  page = 'references'; api.draw(); await settle();
  assert.match(html, /ai-reference-queue/);
  assert.doesNotMatch(html, /ai-reference-confirmed/, 'Confirmed links have their own Saved records page');
  assert.equal(reads.length, 1);
  events.click({ target: { closest: () => ({ getAttribute: name => name === 'data-ai' ? 'refresh' : '' }) } });
  await settle(); assert.equal(reads.length, 2, 'Refresh starts a new read while the earlier read is pending');
  reads[1](summary('Fresh bread')); await settle();
  assert.match(html, /Fresh bread/);
  reads[0](summary('Old bread')); await settle();
  assert.match(html, /Fresh bread/); assert.doesNotMatch(html, /Old bread/);
  page = 'reference-records'; api.draw(); await settle();
  assert.match(html, /ai-reference-confirmed/); assert.match(html, /Milk/); assert.equal(writes, 0);
  console.log('PASS Refresh retains the fresh review queue and independent saved links when an earlier request finishes late');
})().catch(e => { console.error(e); process.exit(1); });
