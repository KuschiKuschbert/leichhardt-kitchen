// The service worker opens the book from the copy saved on the phone (21 Oct 2026): fast on slow wifi, still there with
// no signal, and a new version is fetched behind it and taken up by itself, or with Update now once someone has
// touched the screen. Requests from the service worker do not pass through the test's routes, so this file starts its
// own copy of the test server (also with BASE set), whose files and speed it can change.
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
  while (Date.now() < end) { try { if (await p.evaluate(fn)) return true; } catch (e) {} await p.waitForTimeout(100); }
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
  await p.reload(); await p.waitForTimeout(500);
  ok(await controlled(p), 'the service worker is in charge after the first visit');

  // slow wifi: every file takes 4 s from the server, the book opens from the saved copy anyway
  over.delay = 4000;
  const t0 = Date.now();
  await p.reload({ waitUntil: 'load' });
  await L.waitFor(p, () => !!document.querySelector('#rtitle'), null, 10000).catch(() => {});
  const took = Date.now() - t0;
  ok(took < 3000 && /Barramundi/i.test(await txt(p, '#rtitle') || ''), 'slow wifi: the recipe opens from the saved copy (' + took + ' ms)');
  await p.waitForTimeout(4500);   // let the background round finish before the next step
  over.delay = 0;


  // a new version while someone is using the book: the saved copy shows first, then the bar offers Update now
  newData(1);
  await p.evaluate(() => localStorage.setItem('lk.upd.last', String(Date.now())));   // updated a moment ago: no reload by itself
  await p.reload({ waitUntil: 'load' });
  ok(await p.evaluate(() => window.__v === undefined), 'new version: the book opens from the saved copy first');
  await L.waitFor(p, () => !!document.querySelector('.upd-bar'), null, 8000).catch(() => {});
  ok(/New version available/.test(await txt(p, '.upd-bar') || ''), 'new version: the update bar shows');
  await p.click('.upd-bar button');
  ok(await until(p, () => window.__v === 1, 10000), 'Update now: the new version is on the screen');

  // a new version found just after opening, before anyone touched the screen: the book reloads into it by itself
  newData(2);
  await p.evaluate(() => localStorage.removeItem('lk.upd.last'));
  await p.reload({ waitUntil: 'load' });
  ok(await until(p, () => window.__v === 2, 10000), 'just opened: the book takes up the new version by itself');
  await p.waitForTimeout(1500);
  ok(await p.evaluate(() => window.__v === 2 && !document.querySelector('.upd-bar')), 'just opened: no loop and no bar once it is on the new version');
  // no signal: the book still opens
  await ctx.setOffline(true);
  await p.reload({ waitUntil: 'load' }).catch(() => {});
  await p.waitForTimeout(800);
  ok(/Barramundi/i.test(await txt(p, '#rtitle') || ''), 'no signal: the recipe still opens');
    ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await ctx.close();
  await b.close();
  srv.close();
  L.report(R);
})().catch(e => { console.log(R.join("\n")); console.error(e); process.exit(1); });
