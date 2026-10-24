// Push links accept only the configured cut-off ID and calendar date. Older notifications keep the Order list.
const fs = require('fs'), vm = require('vm'), path = require('path');
const L = require('./lib'), { R, ok } = L.results();
const events = {}, shown = [], opened = [], scope = 'https://example.test/kitchen/';
const self = { addEventListener: (n, f) => { events[n] = f; }, registration: { scope, showNotification: async (title, options) => { shown.push({ title, options }); } },
  clients: { matchAll: async () => [], openWindow: async u => { opened.push(u); } } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'), { self, URL, setTimeout, caches: {} });
async function event(n, fields) { let pending; events[n](Object.assign({ waitUntil: p => { pending = p; } }, fields)); await pending; }
(async () => {
  await event('push', { data: { json: () => ({ data: { title: 'Order now', sid: 'northside', day: '2026-10-24', url: 'https://bad.test' } }) } });
  ok(shown[0].options.data.sid === 'northside', 'push retains only the safe supplier context');
  await event('notificationclick', { notification: { close() {}, data: shown[0].options.data } });
  ok(opened.pop() === scope + '#/suppliers/cutoff/northside/2026-10-24', 'valid push opens the matching supplier and occurrence');
  for (const data of [{}, { sid: '../outside', day: '2026-10-24' }, { sid: 'northside', day: '../../' }, { url: 'https://bad.test' }]) {
    await event('notificationclick', { notification: { close() {}, data } });
    ok(opened.pop() === scope + '#/orders', 'old or invalid push opens only the fixed Order list');
  }
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
