// A slow response from before Refresh must not replace the newly loaded review queue.
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const C = require('../js/analysis-core');
(async () => {
  const events = {}, reads = [], window = { LK_ANALYSIS: C };
  vm.runInNewContext(fs.readFileSync(require.resolve('../js/admin-intelligence'), 'utf8'), {
    window, document: { addEventListener: (name, fn) => { events[name] = fn; } }, requestAnimationFrame: () => {}
  });
  let html = '', writes = 0;
  const ref = { id: 'ai-milk', alias: 'Milk', label: 'Milk', recipeId: 'milk' };
  const api = {
    allowed: () => true, context: () => 'owner', loadGuides: () => {},
    draw: () => { html = window.LK_INTELLIGENCE.html('references', api); },
    list: name => Promise.resolve(name === 'references' ? [ref] : []),
    get: () => new Promise(resolve => reads.push(resolve)), save: () => { writes++; },
    recipes: () => [], guides: () => []
  };
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  const summary = text => ({ from: '2026-08-01', to: '2026-10-30', items: [{ id: text, text, counts: { prep: 1 }, sample: 1 }], totalItems: 1 });
  api.draw(); await settle();
  assert.match(html, /Confirmed references \(1\)/);
  assert.equal(reads.length, 1);
  events.click({ target: { closest: () => ({ getAttribute: name => name === 'data-ai' ? 'refresh' : '' }) } });
  await settle(); assert.equal(reads.length, 2, 'Refresh starts a new read while the earlier read is pending');
  reads[1](summary('Fresh bread')); await settle();
  assert.match(html, /Fresh bread/);
  reads[0](summary('Old bread')); await settle();
  assert.match(html, /Fresh bread/); assert.doesNotMatch(html, /Old bread/);
  assert.match(html, /Confirmed references \(1\)/); assert.equal(writes, 0);
  console.log('PASS Refresh keeps fresh recorded items and confirmed references when an older request finishes late');
})().catch(e => { console.error(e); process.exit(1); });
