// The service worker opens the book from the copy saved on the phone (21 Oct 2026): fast on slow wifi, still there with
// no signal, and a new version is fetched behind it and taken up by itself, or with Update now once someone has
// touched the screen. This file starts its own copy of the test server (also with BASE set), whose files and speed it can
// change; the worker's own requests go through the page's routes too (tests/lib.js), so Firebase is still the stand-in.
const L = require('./lib');
const fs = require('fs'), path = require('path');
const { R, ok, txt } = Object.assign(L.results(), { txt: L.txt });
const DATA = fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8');
const over = {};
// a new version of js/data.js on the server: the same cards plus a marker, with its own Last-Modified
const newData = v => { over['/js/data.js'] = { lastModified: 'Tue, 2' + v + ' Oct 2026 00:00:00 GMT', body: DATA + '\nwindow.__v = ' + v + ';\n' }; };
// waits through the book reloading itself (L.waitFor stops at the first error, and a reload is one)
async function until(p, fn, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { if (await p.evaluate(fn)) return true; } catch (e) {} await L.sleep(100); }
  return false;
}
const controlled = p => L.waitFor(p, () => !!navigator.serviceWorker.controller, null, 10000).then(() => true, () => false);
(async () => {
  const srv = require('./serve').make(over);
  await new Promise(res => srv.listen(0, '127.0.0.1', res));
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await L.start();
  const p = await L.open(b, '#/r/barra', { sw: true, wait: 800, base }), ctx = p.context();
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload(); await L.settle(p, 500);
  ok(await controlled(p), 'the service worker is in charge after the first visit');

  // slow wifi: every file takes 4 s from the server, the book opens from the saved copy anyway
  over.delay = 4000;
  const t0 = Date.now();
  await p.reload({ waitUntil: 'load' });
  await L.waitFor(p, () => !!document.querySelector('#rtitle'), null, 10000).catch(() => {});
  const took = Date.now() - t0;
  ok(took < 3000 && /Barramundi/i.test(await txt(p, '#rtitle') || ''), 'slow wifi: the recipe opens from the saved copy (' + took + ' ms)');
  await L.sleep(4500);   // let the worker's background round finish (the page cannot see it, so no settle)
  over.delay = 0;

  // nothing changed on the server: opening again writes nothing to the saved copy (22 Oct 2026; it used to write all
  // the files, about 2.4 MB, on every opening). The saved file keeps the X-Served stamp it was first saved with.
  const savedAt = () => p.evaluate(() => caches.keys().then(ks => caches.open(ks[0])).then(c => c.match('js/app.js')).then(r => r ? r.headers.get('x-served') : ''));
  const d1 = await savedAt();
  await L.sleep(1200);
  await p.reload({ waitUntil: 'load' }); await L.sleep(6000);   // the worker's background round (the page cannot see it)
  const d2 = await savedAt();
  ok(!!d1 && d1 === d2, 'nothing new: opening again does not write the saved copy again (' + d1 + ' / ' + d2 + ')');


  // a new version while someone is using the book: the saved copy shows first, then the bar offers Update now
  newData(1);
  await p.evaluate(() => localStorage.setItem('lk.upd.last', String(Date.now())));   // updated a moment ago: no reload by itself
  // the server answers slowly, like kitchen wifi, so the worker's background round is still out when the book opens
  // (on this local server it can finish first and save the new file before the page asks: then the book simply opens new)
  over.delay = 1500;
  await p.reload({ waitUntil: 'load' });
  ok(await p.evaluate(() => window.__v === undefined), 'new version: the book opens from the saved copy first');
  over.delay = 0;
  await L.waitFor(p, () => !!document.querySelector('.upd-bar'), null, 8000).catch(() => {});
  ok(/New version available/.test(await txt(p, '.upd-bar') || ''), 'new version: the update bar shows');
  await p.click('.upd-bar button');
  ok(await until(p, () => window.__v === 1, 10000), 'Update now: the new version is on the screen');

  // a new version found just after opening, before anyone touched the screen: the book reloads into it by itself
  newData(2);
  await p.evaluate(() => localStorage.removeItem('lk.upd.last'));
  await p.reload({ waitUntil: 'load' });
  ok(await until(p, () => window.__v === 2, 10000), 'just opened: the book takes up the new version by itself');
  await L.sleep(1500);   // time for a reload loop to show, if there were one
  ok(await p.evaluate(() => window.__v === 2 && !document.querySelector('.upd-bar')), 'just opened: no loop and no bar once it is on the new version');
  // no signal: the book still opens
  await ctx.setOffline(true);
  await p.reload({ waitUntil: 'load' }).catch(() => {});
  await L.settle(p, 800);
  ok(/Barramundi/i.test(await txt(p, '#rtitle') || ''), 'no signal: the recipe still opens');
  // the Firebase files (22 Oct 2026, review P5): the worker keeps them once loaded, so with no signal and the browser's
  // own cache cleared the prep list still opens
  await ctx.setOffline(false);
  await p.goto(base + '#/prep', { waitUntil: 'load' });
  // how many Firebase files the worker holds, in any of its saved copies
  const kept = min => caches.keys().then(ks => Promise.all(ks.map(k => caches.open(k).then(c => c.keys()))))
    .then(a => [].concat(...a).filter(q => /\/firebasejs\//.test(q.url)).length).then(n => min ? n >= min : n);
  await L.waitFor(p, kept, 4, 15000).catch(() => {});
  const n = await p.evaluate(kept, 0);
  ok(n >= 4, 'the worker keeps the Firebase files on the phone (' + n + ')');
  const cdp = await ctx.newCDPSession(p); await cdp.send('Network.clearBrowserCache');
  const errsBefore = p.errors.length;
  await ctx.setOffline(true);
  // with no signal the stand-in's Firebase files cannot come either (the newest route is asked first)
  await ctx.route('https://www.gstatic.com/firebasejs/**', r => r.abort('internetdisconnected'));
  await p.reload({ waitUntil: 'load' }).catch(() => {});
  await L.waitFor(p, () => !!document.querySelector('.nb-row'), null, 10000).catch(() => {});
  ok(!!(await p.$('.nb-row')), 'no signal and the browser cache cleared: the prep list still opens');
  // with no signal the browser logs every request that cannot go out; those are expected here, anything else is not
  p.errors.splice(errsBefore, p.errors.length - errsBefore, ...p.errors.slice(errsBefore).filter(e => !/Failed to load resource: net::ERR_(FAILED|INTERNET_DISCONNECTED)/.test(e)));
    ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await ctx.close();
  await b.close();
  srv.close();
  L.report(R);
})().catch(e => { console.log(R.join("\n")); console.error(e); process.exit(1); });
