// The worker accepts only a fixed cooling event and opens a fixed local route.
// No real push service, browser permission, kitchen data or external URL is used.
const fs = require('fs'), path = require('path'), vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
const scope = 'https://example.test/kitchen/', run = 'cooling_run_0123456789';
const R = [], ok = (condition, message) => R.push((condition ? 'PASS ' : 'FAIL ') + message);
function fixture(clients) {
  const events = {}, shown = [], opened = [], calls = [];
  const self = {
    registration: { scope, showNotification: async (title, options) => { shown.push({ title, options }); } },
    addEventListener: (name, fn) => { events[name] = fn; },
    clients: { matchAll: async () => clients || [], openWindow: async url => { opened.push(url); } }
  };
  vm.runInNewContext(source, { self, URL, setTimeout: fn => { fn(); }, caches: {} });
  async function event(name, fields) {
    let promise;
    events[name](Object.assign({ waitUntil: p => { promise = p; } }, fields));
    await promise;
  }
  return {
    shown, opened, calls,
    push: data => event('push', { data: { json: () => ({ data }) } }),
    raw: raw => event('push', { data: { json: raw } }),
    click: data => event('notificationclick', { notification: { close: () => calls.push('close'), data } })
  };
}
(async () => {
  const f = fixture();
  for (const stage of ['1', '2']) {
    const before = f.shown.length;
    await f.push({ type: 'cooling', run, stage, title: 'Untrusted title', body: 'Untrusted body', tag: 'same-tag', url: 'https://outside.test/', sid: 'other', day: '2026-11-08' });
    const item = f.shown[before], hours = stage === '1' ? 2 : 4;
    ok(!!item && item.title === 'Operandio', 'cooling stage ' + stage + ': fixed Operandio title');
    ok(!!item && item.options.body === 'Operandio batch cooling time ' + hours + ' hours is done.', 'cooling stage ' + stage + ': exact fixed duration message');
    ok(!!item && item.options.tag === 'lk-cooling-' + run + '-' + stage, 'cooling stage ' + stage + ': stable run and stage notification tag');
    ok(!!item && item.options.renotify === false, 'cooling stage ' + stage + ': a retried delivery replaces its notification without another alert sound');
    ok(!!item && JSON.stringify(item.options.data) === JSON.stringify({ type: 'cooling', run, stage }), 'cooling stage ' + stage + ': only validated event context is retained');
    if (item) await f.click(item.options.data);
    ok(f.opened.pop() === scope + '#/cooling', 'cooling stage ' + stage + ': click opens only the fixed cooling route');
  }
  await f.push({ type: 'cooling', run, stage: '1' });
  const again = f.shown.at(-1);
  ok(again && again.options.tag === 'lk-cooling-' + run + '-1', 'same stage retry keeps the same tag');
  await f.push({ type: 'cooling', run: run + '_next', stage: '1' });
  ok(f.shown.at(-1).options.tag !== again.options.tag, 'a different batch has a different notification tag');

  const invalid = [
    { type: 'cooling', run, stage: '3' }, { type: 'cooling', run, stage: 1 },
    { type: 'cooling', run, stage: '2 hours' }, { type: 'cooling', run: '../outside', stage: '1' },
    { type: 'cooling', run: 'short', stage: '1' }, { type: 'cooling', run: 'a'.repeat(81), stage: '1' },
    { type: 'cooling', run: 'a'.repeat(16) + '/path', stage: '1' }, { type: 'cooling', run: null, stage: '1' },
    { type: 'cooling', stage: '1' }, { type: 'unsupported', run, stage: '1' },
    { type: '', run, stage: '1' }, { type: { toString: () => 'cooling' }, run, stage: '1' }
  ];
  for (const [index, data] of invalid.entries()) {
    const shown = f.shown.length, opened = f.opened.length;
    await f.push(data);
    ok(f.shown.length === shown, 'invalid typed event ' + index + ' is not displayed');
    await f.click(Object.assign({ url: 'https://outside.test/', sid: 'other', day: '2026-11-08' }, data));
    ok(f.opened.length === opened, 'invalid typed click ' + index + ' cannot become a supplier or external route');
  }
  const count = f.shown.length;
  await f.raw(() => { throw new SyntaxError('Malformed JSON'); });
  await f.raw(() => null);
  await f.raw(() => ({ data: [] }));
  await f.raw(() => ({ data: 'wrong shape' }));
  ok(f.shown.length === count, 'unreadable or non-object payloads do not display an empty notification');

  await f.push({ title: 'Order now', body: 'Supplier cut-off', tag: 'lk-cut-test', sid: 'northside', day: '2026-11-08', url: 'https://outside.test/' });
  const order = f.shown.at(-1);
  ok(order.title === 'Order now' && order.options.body === 'Supplier cut-off' && order.options.tag === 'lk-cut-test' && order.options.renotify === true, 'existing order push presentation is retained');
  await f.click(order.options.data);
  ok(f.opened.pop() === scope + '#/suppliers/cutoff/northside/2026-11-08', 'existing supplier click route is retained');
  await f.click({ url: 'https://outside.test/' });
  ok(f.opened.pop() === scope + '#/orders', 'old untyped notification retains the fixed Orders fallback');

  const called = [];
  const own = { url: scope + '#/prep', focus: async () => { called.push('focus'); return own; }, navigate: async url => { called.push(url); } };
  const other = { url: 'https://example.test/other-project/', focus: async () => { called.push('wrong-window'); } };
  const sameWindow = fixture([other, own]);
  await sameWindow.click({ type: 'cooling', run, stage: '1', url: 'https://outside.test/' });
  ok(called.join('|') === 'focus|' + scope + '#/cooling' && sameWindow.opened.length === 0, 'only this app’s existing window is focused and moved to cooling');
  const unrelated = fixture([other]);
  await unrelated.click({ type: 'cooling', run, stage: '2' });
  ok(unrelated.opened[0] === scope + '#/cooling' && !called.includes('wrong-window'), 'a new app window opens without navigating another project');

  R.forEach(line => console.log(line));
  const failed = R.filter(line => line.startsWith('FAIL')).length;
  console.log(failed + ' failed of ' + R.length);
  process.exit(failed ? 1 : 0);
})().catch(error => { console.error(error); process.exit(1); });
