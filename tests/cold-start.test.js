// A cold start asks for the page's own list with the kitchen's settings, not one server answer after them (24 Nov
// 2026). The settings' answer is held back: the list must come in meanwhile, the page must still show only Loading,
// and once the settings are in the lines show, with one listener per list (no extra reads).
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
      { hash: '#/waste', state: 'wState', path: 'waste/' + today + '/lines', line: 'Chips' }
    ];
    for (const c of cases) {
      // In the page: once the held settings listener exists, wait for the list (at most 4 s, so the old order, which
      // never asks for the list before the settings, still finishes), note what the page showed, then let them answer.
      const init = 'window.__holdCfg = true; (function () { var t0 = Date.now(), iv = setInterval(function () {' +
        ' var st = window.LK_PREP && window.LK_PREP.state; if (!window.__releaseCfg || !st) return;' +
        ' if (st[' + JSON.stringify(c.state) + '] !== "ok" && Date.now() - t0 < 4000) return; clearInterval(iv);' +
        ' window.__seen = { list: st[' + JSON.stringify(c.state) + '], cfg: st.configState, full: !!st.configFull,' +
        ' loading: !!document.querySelector(".is-loading"), rows: document.querySelectorAll(".nb-row").length };' +
        ' window.__releaseCfg(); }, 20); })();';
      const p = await L.open(b, c.hash, { who: 'sam', wait: 100, fakeSDK: { 'firebase-firestore.js': held }, init });
      await L.waitFor(p, () => !!window.__seen, null, 8000);
      const seen = await p.evaluate(() => window.__seen);
      ok(seen.list === 'ok' && seen.cfg === 'loading' && !seen.full, c.hash + ': the list came in while the kitchen settings were still on their way ' + JSON.stringify(seen));
      ok(seen.loading && seen.rows === 0, c.hash + ': nothing from the list shows before the settings are in ' + JSON.stringify(seen));
      await L.waitFor(p, (st) => { const s = window.LK_PREP.state; return s.configState === 'ok' && s.configFull && s[st] === 'ok'; }, c.state, 5000);
      await L.waitFor(p, (line) => [...document.querySelectorAll('.nb-row')].some(r => r.textContent.includes(line)), c.line, 5000).catch(() => {});
      ok(await p.evaluate((line) => [...document.querySelectorAll('.nb-row')].some(r => r.textContent.includes(line)), c.line), c.hash + ': the lines show once the settings are in');
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
