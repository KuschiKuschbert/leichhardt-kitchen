// A cold start asks for the page's own list with the kitchen's settings, not one server answer after them (24 Nov
// 2026). The settings' answer is held back: the list must come in meanwhile, the page must still show only Loading,
// and once the settings are in the lines show, with one listener per list (no extra reads). What a list's watcher
// starts after it (the wastage summary; on Transfers the loans still out and the summary) must start too.
const fs = require('fs');
const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW));

(async () => {
  const b = await L.start();
  try {
    const sdk = fs.readFileSync(__dirname + '/fake/firebase-firestore.js', 'utf8');
    const sub = '  const s = { ref, next, error: err, last: null, cold: cold(ref) };', del = 'function deliver(s) {';
    if (!sdk.includes(sub) || !sdk.includes(del)) throw new Error('The fixture must be able to hold the settings answer');
    // config/main answers only when the page calls __releaseCfg(); every other read answers as usual
    const held = sdk.replace(sub, sub + '\n  if (window.__holdCfg && /\\/config\\/main$/.test(ref.path.join("/"))) { s.held = true; window.__releaseCfg = () => { s.held = false; if (subs.has(s)) deliver(s); }; }')
      .replace(del, del + '\n  if (s.held) return;');
    const cases = [
      { hash: '#/prep', state: 'itemsState', path: 'days/' + today + '/items', line: 'Slice onions' },
      { hash: '#/orders', state: 'ordState', path: 'orders/' + today + '/lines', line: 'Milk' },
      { hash: '#/waste', state: 'wState', path: 'waste/' + today + '/lines', line: 'Chips', after: { wSumFor: today }, also: 'the wastage summary is read' },
      { hash: '#/transfers', state: 'xState', path: 'transfers/' + today + '/lines', line: 'Butter', after: { xOpenState: 'ok', xSumFor: today }, also: 'the loans still out and the transfer summary are read' }
    ];
    const extra = {};
    extra[['kitchens', L.PIN, 'transfers', today, 'lines', 'x1'].join('/')] = { dir: 'out', venue: 'Riviera', person: 'Jess', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 60000, deleted: false, by: 'sam' };
    for (const c of cases) {
      // In the page: once the held settings listener exists, wait for the list (at most 4 s, so the old order, which
      // never asks for the list before the settings, still finishes), note what the page showed, then let them answer.
      const init = 'window.__holdCfg = true; (function () { var t0 = Date.now(), iv = setInterval(function () {' +
        ' var st = window.LK_PREP && window.LK_PREP.state; if (!window.__releaseCfg || !st) return;' +
        ' if (st[' + JSON.stringify(c.state) + '] !== "ok" && Date.now() - t0 < 4000) return; clearInterval(iv);' +
        ' window.__seen = { list: st[' + JSON.stringify(c.state) + '], cfg: st.configState, full: !!st.configFull,' +
        ' loading: !!document.querySelector(".is-loading"), shown: (document.getElementById("prep-root") || document.body).textContent.indexOf(' + JSON.stringify(c.line) + ') >= 0 };' +
        ' window.__releaseCfg(); }, 20); })();';
      const p = await L.open(b, c.hash, { who: 'sam', wait: 100, extra, fakeSDK: { 'firebase-firestore.js': held }, init });
      await L.waitFor(p, () => !!window.__seen, null, 8000);
      const seen = await p.evaluate(() => window.__seen);
      ok(seen.list === 'ok' && seen.cfg === 'loading' && !seen.full, c.hash + ': the list came in while the kitchen settings were still on their way ' + JSON.stringify(seen));
      ok(seen.loading && !seen.shown, c.hash + ': nothing from the list shows before the settings are in ' + JSON.stringify(seen));
      await L.waitFor(p, (st) => { const s = window.LK_PREP.state; return s.configState === 'ok' && s.configFull && s[st] === 'ok'; }, c.state, 5000);
      const shows = line => (document.getElementById('prep-root') || document.body).textContent.includes(line);
      await L.waitFor(p, shows, c.line, 5000).catch(() => {});
      ok(await p.evaluate(shows, c.line), c.hash + ': the lines show once the settings are in');
      if (c.after) {
        const done = await L.waitFor(p, exp => Object.keys(exp).every(k => window.LK_PREP.state[k] === exp[k]), c.after, 5000).then(() => true, () => false);
        const got = await p.evaluate(exp => Object.fromEntries(Object.keys(exp).map(k => [k, window.LK_PREP.state[k]])), c.after);
        ok(done, c.hash + ': ' + c.also + ' once the settings are in ' + JSON.stringify(got));
      }
      await L.settle(p, 300);
      const listens = await p.evaluate((path) => window.__fake.bill.filter(x => x.kind === 'listen' && x.path.endsWith(path)).length, c.path);
      ok(listens === 1, c.hash + ': one listener for the list, so no extra reads (' + listens + ')');
      ok(p.errors.length === 0, c.hash + ': no page errors ' + p.errors.join(' | '));
      await p.context().close();
    }
  } catch (e) { console.error(e); process.exit(1); }
  await b.close();
  L.report(R);
})();
