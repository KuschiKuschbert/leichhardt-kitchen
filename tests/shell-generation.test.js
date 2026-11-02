// Failed storage writes and obsolete update rounds must never split the saved public book.
// A bare synthetic page loads two revision markers; the real service worker and browser Cache/IndexedDB APIs run.
const L = require('./lib');
const fs = require('fs'), path = require('path'), os = require('os');
const { R, ok } = L.results();
const source = fs.readFileSync(path.join(__dirname, process.env.SHELL_BEFORE ? 'fake/sw-legacy.js' : '../sw.js'), 'utf8');
const wrapper = `
var auditOptions = caches.open('audit-shell-options');
var auditSetup = auditOptions.then(function (cache) { return cache.match('options'); }).then(function (r) { return r ? r.text() : ''; }).then(function (text) { auditBlocked = text === 'blocked'; });
var auditTransaction = IDBDatabase.prototype.transaction, auditBlocked = false;
IDBDatabase.prototype.transaction = function () {
  if (auditBlocked && this.name.indexOf('lk-shell-v1-') === 0) throw new DOMException('Synthetic metadata failure', 'SecurityError');
  return auditTransaction.apply(this, arguments);
};
var auditPut = Cache.prototype.put, auditFetch = self.fetch.bind(self), auditHold = false, auditRelease = null, auditFail = false, auditLate = false;
Cache.prototype.put = function (request, response) {
  var url = new URL(typeof request === 'string' ? request : request.url, self.location);
  if (auditFail && /\\/js\\/prep\\.js$/.test(url.pathname) && response.headers.get('etag') === '"shell-2"') {
    auditFail = false; return Promise.reject(new DOMException('Synthetic storage failure', 'QuotaExceededError'));
  }
  return auditPut.call(this, request, response);
};
self.fetch = function (request, options) {
  var url = new URL(typeof request === 'string' ? request : request.url, self.location);
  if (auditHold && /\\/js\\/prep\\.js$/.test(url.pathname)) {
    auditHold = false;
    // Deliberately ignore cancellation, so a late response still tests ownership after timeout.
    return auditFetch(request, { cache: 'no-cache' }).then(function (r) { return r.arrayBuffer().then(function (body) {
      var copy = new Response(body, { status: r.status, headers: r.headers });
      return new Promise(function (resolve) { auditRelease = function () { resolve(copy); }; });
    }); });
  }
  return auditFetch(request, options);
};
var auditTimer = self.setTimeout.bind(self);
self.setTimeout = function (fn, ms) { return auditTimer(fn, auditLate && (ms === 30000 || ms === 8000) ? 500 : ms); };
self.addEventListener('message', function (e) {
  if (!e.data || !e.data.audit || !e.ports[0]) return;
  var p = e.ports[0];
  if (e.data.audit === 'fail') auditFail = true;
  if (e.data.audit === 'forget' && typeof shellPins !== 'undefined') shellPins = {};
  if (e.data.audit === 'block' || e.data.audit === 'unblock') {
    auditBlocked = e.data.audit === 'block';
    auditOptions.then(function (cache) { return cache.put('options', new Response(auditBlocked ? 'blocked' : '')); }).then(function () { p.postMessage(true); }); return;
  }
  if (e.data.audit === 'hold') { auditHold = true; auditLate = true; self.auditRoundPort = p; return; }
  if (e.data.audit === 'release') { if (auditRelease) auditRelease(); auditLate = false; }
  p.postMessage(true);
});
`;
const after = `
if (typeof shellMeta === 'function') {
  var auditMeta = shellMeta;
  shellMeta = function (mode, round, work) {
    return auditSetup.then(function () { return auditMeta(mode, round, work); });
  };
}
var auditRound = freshRound;
freshRound = function () {
  var port = self.auditRoundPort; self.auditRoundPort = null;
  var result = auditRound.apply(this, arguments);
  if (port) result.then(function () { port.postMessage('settled'); }, function () { port.postMessage('settled'); });
  return result;
};
`;
const html = '<!doctype html><meta charset="utf-8"><title>Saved shell fixture</title><script src="js/app.js"></script><script src="js/prep.js"></script>';
const over = {
  '/index.html': { body: html, lastModified: 'Sun, 18 Oct 2026 00:00:00 GMT', etag: '"shell-1"' },
  '/sw.js': { body: wrapper + source + after, lastModified: 'Sun, 18 Oct 2026 00:00:00 GMT' },
  '/shell-start.html': { body: '<!doctype html><script>navigator.serviceWorker.register("sw.js");</script>', lastModified: 'Sun, 18 Oct 2026 00:00:00 GMT' }
};
function revision(n) {
  ['app', 'prep'].forEach(part => { over['/js/' + part + '.js'] = { body: 'window.__' + part + ' = ' + n + ';', etag: '"shell-' + n + '"', lastModified: 'Sun, ' + (18 + n) + ' Oct 2026 00:00:00 GMT' }; });
}
async function message(p, data) {
  return p.evaluate(data => new Promise((resolve, reject) => {
    const ch = new MessageChannel(), timer = setTimeout(() => { ch.port1.close(); reject(new Error('Worker message did not finish: ' + JSON.stringify(data))); }, 12000); ch.port1.onmessage = e => { if (e.data && e.data.started) return; clearTimeout(timer); resolve(e.data); ch.port1.close(); };
    navigator.serviceWorker.controller.postMessage(data, [ch.port2]);
  }), data);
}
async function loaded(p, base) {
  await p.goto(base, { waitUntil: 'load' });
  return p.evaluate(() => [window.__app, window.__prep]);
}
(async () => {
  revision(1);
  const server = require('./serve').make(over);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-shell-')), profiles = [profile];
  const newProfile = () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-shell-')); profiles.push(dir); return dir; };
  let c, p;
  async function browser(offline, directory) {
    c = await L.chromium.launchPersistentContext(directory || profile, Object.assign(L.chromeOpts(), { serviceWorkers: 'allow', offline: !!offline }));
    c.setDefaultTimeout(10000); p = c.pages()[0] || await c.newPage();
  }
  try {
    await browser();
    p.on('pageerror', error => console.log('Fixture error: ' + error.message));
    await p.goto(base + 'shell-start.html'); await p.evaluate(() => navigator.serviceWorker.ready);
    await loaded(p, base);
    await L.waitFor(p, () => !!navigator.serviceWorker.controller, null, 10000);
    ok((await loaded(p, base)).join('/') === '1/1', 'initial install opens one complete shell');
    // Finish the navigation's background refresh before requesting a controlled fault.
    await message(p, { lk: 'fresh' });
    revision(2); await message(p, { audit: 'fail' });
    const failed = await message(p, { lk: 'fresh' });
    ok(failed.ok === false, 'a storage refusal is reported as an unsuccessful update');
    const read = await p.evaluate(() => Promise.all(['app', 'prep'].map(part => fetch('js/' + part + '.js').then(r => r.text()))));
    ok(read.every(x => / = 1;/.test(x)), 'a failed cache write leaves both public scripts on the previous complete generation');
    // Stop/restart the real worker and reopen offline: durable metadata must retain the last good generation.
    await c.close(); await browser(true);
    await c.setOffline(true);
    const reopened = await loaded(p, base);
    ok(reopened.join('/') === '1/1', 'after browser restart, a failed publication reopens the complete old shell offline (' + reopened.join('/') + ')');
    await c.setOffline(false); await message(p, { lk: 'fresh' });
    ok((await loaded(p, base)).join('/') === '2/2', 'retry publishes both new scripts and a new navigation takes them together');
    await message(p, { lk: 'fresh' });
    revision(3); await message(p, { lk: 'fresh' });
    const pinned = await p.evaluate(() => Promise.all(['app', 'prep'].map(part => fetch('js/' + part + '.js').then(r => r.text()))));
    ok(pinned.every(x => / = 2;/.test(x)), 'an already loaded document keeps its shell while a newer complete generation is published');
    ok((await loaded(p, base)).join('/') === '3/3', 'a fresh navigation selects the newly published complete generation');
    await message(p, { lk: 'fresh' });
    revision(4);
    await p.evaluate(() => {
      window.__lateSettled = false;
      const ch = new MessageChannel(); ch.port1.onmessage = () => { window.__lateSettled = true; ch.port1.close(); };
      navigator.serviceWorker.controller.postMessage({ audit: 'hold' }, [ch.port2]);
    });
    const timedOut = await message(p, { lk: 'fresh' });
    ok(timedOut.ok === false, 'a stalled update has an unsuccessful timeout');
    revision(5); const latest = await message(p, { lk: 'fresh' });
    ok(latest.ok === true, 'a subsequent update can complete while the older response is delayed');
    await message(p, { audit: 'release' });
    await L.waitFor(p, () => window.__lateSettled, null, 10000);
    await c.setOffline(true);
    ok((await loaded(p, base)).join('/') === '5/5', 'a late response cannot overwrite the newer generation before an offline restart');
    await c.setOffline(false);
    await message(p, { audit: 'block' }); revision(6);
    const blocked = await message(p, { lk: 'fresh' });
    ok(blocked.ok === false, 'blocked metadata refuses publication instead of writing files individually');
    await c.close(); await browser(true);
    ok((await loaded(p, base)).join('/') === '5/5', 'a browser restart with metadata blocked reopens one complete last-good generation offline');
    await c.setOffline(false);
    ok((await loaded(p, base)).join('/') === '5/5', 'blocked metadata reopens the complete last-good shell through its public fallback');
    await message(p, { audit: 'unblock' }); await message(p, { lk: 'fresh' });
    ok((await loaded(p, base)).join('/') === '6/6', 'metadata recovery publishes the next complete generation');
    await c.close();
    if (!process.env.SHELL_BEFORE) {
      // A first uncontrolled document can still be reading network files when the installation activates.
      // Seed a complete older public cache, then load one new script before registering and the other afterwards.
      revision(1); await browser(false, newProfile());
      over['/seed.html'] = { body: '<!doctype html><title>Public cache fixture</title>', lastModified: 'Sun, 18 Oct 2026 00:00:00 GMT' };
      await p.goto(base + 'seed.html');
      const files = (source.match(/var SHELL = (\[.*?\]);/)[1].match(/'([^']+)'/g) || []).map(x => x.slice(1, -1));
      await p.evaluate(files => caches.open('lk-book-v8').then(cache => cache.addAll(files)), files);
      revision(2);
      over['/bootstrap.html'] = { body: '<!doctype html><script src="js/app.js"></script><script>navigator.serviceWorker.register("sw.js").then(()=>navigator.serviceWorker.ready).then(()=>{window.__claimedMidStart=!!navigator.serviceWorker.controller;const s=document.createElement("script");s.src="js/prep.js";document.body.appendChild(s);});</script><body>', lastModified: 'Sun, 18 Oct 2026 00:00:00 GMT' };
      await p.goto(base + 'bootstrap.html');
      await L.waitFor(p, () => window.__prep !== undefined, null, 15000);
      ok(await p.evaluate(() => !window.__claimedMidStart && __app === 2 && __prep === 2), 'activation leaves an uncontrolled first document on its coherent network files');
      ok((await loaded(p, base)).join('/') === '2/2', 'its next navigation is controlled by the complete saved generation');
      await c.close(); delete over['/seed.html']; delete over['/bootstrap.html'];

      // Migrate an actually installed legacy worker, preserving its previously saved lazy modules and external files.
      revision(1); over['/sw.js'] = { body: fs.readFileSync(path.join(__dirname, 'fake/sw-legacy.js'), 'utf8'), lastModified: 'Sun, 18 Oct 2026 00:00:00 GMT' };
      await browser(false, newProfile()); await p.goto(base + 'shell-start.html'); await p.evaluate(() => navigator.serviceWorker.ready);
      await loaded(p, base); await message(p, { lk: 'fresh' });
      await p.evaluate(() => caches.open('lk-book-v8').then(cache => Promise.all([
        cache.put('js/library.js', new Response('legacy-library')),
        cache.put('https://fonts.gstatic.com/fixture-font.woff2', new Response('legacy-font')),
        caches.open('other-project-saved-copy').then(other => other.put('unrelated', new Response('other-project'))),
        caches.open('lk-shell-v1-%2Fother-project%2F-old').then(other => other.put('unrelated', new Response('other-project')))
      ])));
      revision(2); over['/sw.js'] = { body: wrapper + source + after + '\n// legacy migration fixture\n', lastModified: 'Mon, 19 Oct 2026 00:00:00 GMT' };
      await p.evaluate(() => { window.__changedWorker = false; navigator.serviceWorker.addEventListener('controllerchange', () => { window.__changedWorker = true; }); });
      await p.evaluate(() => navigator.serviceWorker.getRegistration().then(reg => reg.update()));
      await L.waitFor(p, () => window.__changedWorker, null, 15000);
      const oldTab = await p.evaluate(() => fetch('js/app.js').then(r => r.text()));
      ok(/ = 1;/.test(oldTab), 'legacy migration pins an already controlled document to its previous shell');
      await c.setOffline(true);
      const retained = await p.evaluate(() => Promise.all([fetch('js/library.js').then(r => r.text()), fetch('https://fonts.gstatic.com/fixture-font.woff2').then(r => r.text())]));
      ok(retained.join('/') === 'legacy-library/legacy-font', 'legacy lazy modules and fonts remain available offline after migration');
      ok((await loaded(p, base)).join('/') === '2/2', 'legacy migration opens the complete new shell offline');
      const foreign = await p.evaluate(() => caches.keys());
      ok(foreign.includes('other-project-saved-copy') && foreign.includes('lk-shell-v1-%2Fother-project%2F-old'), 'activation and cleanup preserve other GitHub Pages projects on the same origin');
      await c.setOffline(false);
      await p.evaluate(() => new Promise((resolve, reject) => {
        const q = indexedDB.open('lk-shell-v1-' + encodeURIComponent(new URL('.', location.href).pathname), 1);
        q.onsuccess = () => {
          const db = q.result, tx = db.transaction('meta', 'readwrite'), store = tx.objectStore('meta'), state = store.get('state');
          state.onsuccess = () => { for (let i = 0; i < 70; i++) store.put({ cache: state.result.active, at: Date.now() }, 'client:closed-fixture-' + i); };
          tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
        }; q.onerror = () => reject(q.error);
      }));
      await message(p, { lk: 'fresh' });
      const bounded = await L.waitFor(p, () => new Promise(resolve => {
        const q = indexedDB.open('lk-shell-v1-' + encodeURIComponent(new URL('.', location.href).pathname), 1);
        q.onsuccess = () => { const db = q.result, tx = db.transaction('meta'), request = tx.objectStore('meta').getAllKeys(); request.onsuccess = () => { resolve(request.result.filter(k => k.startsWith('client:')).length <= 33); db.close(); }; };
      }), null, 10000).then(() => true, () => false);
      ok(bounded, 'closed document metadata is bounded while the current client stays pinned');
      revision(3); await message(p, { lk: 'fresh' });
      await message(p, { audit: 'forget' }); await message(p, { audit: 'block' });
      const mirrored = await p.evaluate(() => fetch('js/app.js').then(r => r.text()));
      ok(/ = 2;/.test(mirrored), 'a lost in-memory binding and blocked metadata recover the exact older document generation from its public mirror');
      await p.evaluate(() => {
        window.__savedCopyWarning = false;
        navigator.serviceWorker.addEventListener('message', e => { if (e.data === 'lk-shell-unavailable') window.__savedCopyWarning = true; });
        return caches.open('lk-book-v8').then(cache => cache.keys().then(keys => Promise.all(keys.filter(key => key.url.startsWith(new URL('__lk-shell-client/', location.href).href)).map(key => cache.delete(key)))));
      });
      await message(p, { audit: 'forget' });
      const unavailable = await p.evaluate(() => fetch('js/app.js').then(r => r.status));
      await L.waitFor(p, () => window.__savedCopyWarning, null, 5000);
      ok(unavailable === 503, 'a missing binding refuses guessed files and warns the existing document for guarded recovery');
      ok((await loaded(p, base)).join('/') === '3/3', 'an explicit navigation recovers one complete generation even when the old binding and metadata are unavailable');
      await c.close();
    }
  } finally { if (c) await c.close(); await new Promise(resolve => server.close(resolve)); profiles.forEach(dir => fs.rmSync(dir, { recursive: true, force: true })); }
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
