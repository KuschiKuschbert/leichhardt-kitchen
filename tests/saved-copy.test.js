// The service worker opens the book from the copy saved on the phone (21 Oct 2026): fast on slow wifi, still there with
// no signal, and a new version is fetched behind it and taken up by itself, or with Update now once someone has
// touched the screen. This file starts its own copy of the test server (also with BASE set), whose files and speed it can
// change; the worker's own requests go through the page's routes too (tests/lib.js), so Firebase is still the stand-in.
const L = require('./lib');
const F = require('./supplier-fixtures');
const M = require('../js/functions.js');
const fs = require('fs'), path = require('path');
const { R, ok, txt } = Object.assign(L.results(), { txt: L.txt });
const file = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const DATA = file('js/data.js'), APP = file('js/app.js'), PREP = file('js/prep.js'), SMART = file('js/smart.js'), INDEX = file('index.html'), SW = file('sw.js');
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
const go = async (p, hash) => { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 300); };
// the saved copy: the addresses it holds (path and query), and whether its copy of a file holds this text
const savedList = p => p.evaluate(() => caches.keys().then(ks => Promise.all(ks.map(k => caches.open(k).then(c => c.keys())))).then(a => [].concat(...a).map(q => { const u = new URL(q.url); return u.pathname + u.search; })));
const savedHas = (p, f, t) => p.evaluate(({ f, t }) => caches.keys().then(ks => caches.open(ks[0])).then(c => c.match(f)).then(r => r ? r.text() : '').then(x => x.indexOf(t) >= 0), { f, t });
// opens a page with the worker in charge (the first visit installs it, the reload puts it in charge)
async function swOpen(b, hash, o) {
  const p = await L.open(b, hash, Object.assign({ sw: true, wait: 1500 }, o));
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload(); await L.settle(p, 1000);
  return p;
}
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

  // Pages loaded only when they open (28 Oct 2026, r2-2-5): the worker keeps their scripts (js/manage.js?v=4 and the
  // others) under their plain address, so a page that has opened with signal opens with no signal too. Before, nothing
  // with a ? was kept, so after the book reloaded (an update, the 04:00 refresh) they said "Could not open delivery
  // records" and the like. Bo is the head chef here and books functions.
  const day = L.ymd(new Date(L.NOW)), cfgKey = F.key(['config', 'main']);
  const lazyExtra = F.fixture({
    [cfgKey]: Object.assign({}, F.fixture()[cfgKey], { fnIds: ['bo'] }),
    [F.key(['functions', 'test'])]: {
      v: 1, status: 'draft', name: 'Test booking', date: day, start: M.kat(day, 1080), guests: 20, gu: false, st: false, loc: 'Dining room', mode: 'all',
      rounds: [{ at: M.kat(day, 1110), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 2, u: M.toU([2]) }],
      notes: '', kc: '', by: 'bo', upd: L.NOW - 3600000, cAt: L.NOW - 86400000, cBy: 'bo'
    }
  });
  const LAZY = [
    { name: 'Delivery received', hash: '#/deliveries', root: '#delivery-root', sel: '#dl-supplier' },
    { name: 'Manage recipes', hash: '#/manage/r/burger', root: '#mg-root', sel: '#mg-name' },
    { name: 'the drawing editor', hash: '#/manage/draw/new/burger/plate', root: '#mg-root', sel: '.dw-svg' },
    { name: 'Manage functions', hash: '#/functions/test', root: '#fe-root', sel: '#fe-name' },
    { name: 'Supplier order', hash: '#/suppliers/northside', root: '#supplier-root', sel: 'input[data-sf="qty"]' }
  ];
  const opened = (p, c) => L.waitFor(p, ({ s, r }) => !!document.querySelector(s) || /Could not|Reload the book/.test((document.querySelector(r) || {}).textContent || ''), { s: c.sel, r: c.root }, 15000)
    .then(() => p.evaluate(s => !!document.querySelector(s), c.sel), () => false);
  // with no signal Supplier order's scripts load, and its data needs the signal (js/suppliers.js errorText()), unless the
  // stand-in still answers
  const supOff = p => L.waitFor(p, () => !!(window.LK_SUP && window.LK_SUP_CORE && window.LK_SUP_STORE) && (!!document.querySelector('input[data-sf="qty"]') || /No signal/.test(document.querySelector('#supplier-root').textContent)), null, 15000).then(() => true, () => false);
  const rootText = (p, c) => p.evaluate(r => ((document.querySelector(r) || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120), c.root);
  let q = await swOpen(b, '#/prep', { who: 'bo', extra: lazyExtra, base });
  const access = () => L.waitFor(q, () => window.LK_PREP && window.LK_PREP.privateAccess(), null, 8000).catch(() => {});
  await access();
  for (const c of LAZY) { await go(q, c.hash); ok(await opened(q, c), c.name + ': opens with signal'); }
  await go(q, '#/prep');
  await q.reload(); await L.settle(q, 1500); await access();
  const plain = await savedList(q);
  ok(['/js/manage.js', '/js/draw.js', '/js/fnedit.js', '/js/deliveries.js', '/js/suppliers.js', '/js/supplier-core.js', '/js/supplier-store.js'].every(f => plain.indexOf(f) >= 0) && !plain.some(x => /\?/.test(x) && /\.js/.test(x)),
    'the worker keeps each page\'s script under its plain address, once (' + plain.filter(x => /\/js\/(manage|draw|fnedit|deliveries|supplier)/.test(x)).join(' ') + ')');
  await q.context().setOffline(true);
  for (const c of LAZY) {
    await go(q, c.hash);
    ok(await (c.root === '#supplier-root' ? supOff(q) : opened(q, c)), c.name + ': with no signal after a reload, it still opens (' + await rootText(q, c) + ')');
  }
  ok(!(await L.overflow(q)), 'Supplier order with no signal: no sideways scroll at 390');
  // Daily-lock draft retention changes the lazy-page contract. Deployed Delivery1/Manage4/Draw4 copies must not
  // mount under the new shell, because they clear drafts at04. Open the revised pages once with signal, then their
  // saved revised modules still open offline. The API guard must reject an unsafe cached copy before it mounts.
  const OLD = { '/js/deliveries.js': [/api: \d+,/, 'api: 1,'], '/js/manage.js': [/var API = \d+;/, 'var API = 4;'], '/js/draw.js': [/var API = \d+;/, 'var API = 4;'] };
  await q.context().setOffline(false);
  Object.keys(OLD).forEach(f => { over[f] = { lastModified: 'Wed, 28 Oct 2026 00:00:00 GMT', body: file(f.slice(1)).replace(OLD[f][0], OLD[f][1]) }; });
  await q.reload(); await L.settle(q, 1500); await access();
  for (const c of LAZY.slice(0, 3)) {
    await go(q, c.hash);
    await L.waitFor(q, root => /Reload the book/.test((document.querySelector(root) || {}).textContent || ''), c.root);
    ok(/Reload the book/.test(await rootText(q, c)), c.name + ': unsafe pre-lock module is rejected before mounting');
  }
  Object.keys(OLD).forEach(f => { delete over[f]; });
  await go(q, '#/prep'); await q.reload(); await L.settle(q, 1500); await access();
  for (const c of LAZY.slice(0, 3)) { await go(q, c.hash); await opened(q, c); }
  await go(q, '#/prep'); await q.reload(); await L.settle(q, 1500); await access();
  await q.context().setOffline(true);
  for (const c of LAZY.slice(0, 3)) {
    await go(q, c.hash);
    ok(await opened(q, c), c.name + ': revised saved module still opens with no signal (' + await rootText(q, c) + ')');
  }
  // a script with no version (js/smart.js) asked for with X-LK-Fresh (js/app.js mgScript()): the worker answers once the
  // new copy is saved, so the script tag that follows runs it. Before, it answered first and the tag got the old copy
  // while the new one was still coming in (the server sends its last part 1.5 s after the first).
  await q.context().setOffline(false);
  over['/js/smart.js'] = { lastModified: 'Tue, 27 Oct 2026 00:00:00 GMT', body: SMART + '\nwindow.__smart = 2;\n', trickle: 1500 };
  await q.reload(); await L.settle(q, 1500); await access();
  await go(q, LAZY[2].hash);
  await opened(q, LAZY[2]);
  ok(await q.evaluate(() => window.__smart === 2), 'the drawing editor after a change to js/smart.js: the new copy runs, not the saved one');
  delete over['/js/smart.js'];
  await q.context().close();
  // a staff phone never fetches the recipe editor: it stays out of the saved shell, also with the worker keeping scripts
  q = await swOpen(b, '#/recipes', { who: 'ann', extra: lazyExtra, base });
  await go(q, '#/prep'); await go(q, '#/manage'); await L.settle(q, 800);
  ok(!(await savedList(q)).some(x => /\/js\/manage\.js/.test(x)) && !q.urls.some(u => /\/js\/manage\.js/.test(u)), 'a staff phone: js/manage.js is never fetched or kept');
  await q.context().close();

  // The update and the 04:00 refresh on a weak signal (28 Oct 2026): a deploy changes js/app.js and js/prep.js together,
  // and js/prep.js does not come in. The worker's round is all or nothing, so the book does not reload, the saved copy
  // stays all old, and once the signal is back both new files come in together. Before, every file that came in was
  // saved at once and the book reloaded anyway, into a new js/app.js with an old js/prep.js.
  const NEW = 'Tue, 27 Oct 2026 00:00:00 GMT';
  for (const how of ['Update now', '04:00']) {
    delete over['/js/app.js']; delete over['/js/prep.js'];
    q = await swOpen(b, '#/recipes', { base, touch: true, wait: 800 });
    const qc = q.context();
    await L.sleep(2500);   // the worker's round for that opening
    over['/js/app.js'] = { lastModified: NEW, body: APP + '\nwindow.__va = 1;\n' };
    over['/js/prep.js'] = { lastModified: NEW, body: PREP + '\nwindow.__vp = 1;\n' };
    let lost = 0;
    const drop = u => new URL(u).pathname === '/js/prep.js';
    // weak wifi: js/prep.js hangs for 3 seconds, then is lost. The worker says at once that its round started, so the
    // book waits for it and does not fetch the files itself after 2 seconds (which saves each file as it comes)
    await qc.route(drop, async r => { lost++; await L.sleep(3000); return r.abort('internetdisconnected'); });
    await q.evaluate(() => { window.__mark = 1; });
    if (how === 'Update now') {
      await q.clock.fastForward(10000);
      await q.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
      await L.waitFor(q, () => !!document.querySelector('.upd-bar'), null, 3000).catch(() => {});
      await q.click('.upd-bar button');
      await L.waitFor(q, () => /^No signal\./.test((document.querySelector('.upd-bar span') || {}).textContent || ''), null, 12000).catch(() => {});
    } else {
      await q.clock.fastForward('13:58:00'); await L.settle(q, 300);
      await q.clock.fastForward('00:03:00');
      for (let i = 0; i < 100 && !lost; i++) await L.sleep(50);
      await L.settle(q, 1500);
    }
    await L.sleep(how === '04:00' ? 5000 : 500);
    const v = await q.evaluate(() => ({ mark: window.__mark, a: window.__va, p: window.__vp })).catch(e => ({ err: String(e) }));
    ok(lost > 0 && v.mark === 1, how + ', js/prep.js not coming in: no reload (' + JSON.stringify(v) + ')');
    const sa = await savedHas(q, 'js/app.js', '__va'), sp = await savedHas(q, 'js/prep.js', '__vp');
    ok(!sa && !sp, how + ', js/prep.js not coming in: the saved copy stays all old (new js/app.js ' + sa + ', new js/prep.js ' + sp + ')');
    await qc.unroute(drop);
    if (how === 'Update now') { await L.settle(q, 4500); await L.tap(q, '.upd-bar button'); }
    else await q.clock.fastForward('00:10:30');
    const re = await until(q, () => window.__mark !== 1 && document.readyState === 'complete', 15000);
    await L.settle(q, 800);
    const v2 = await q.evaluate(() => ({ a: window.__va, p: window.__vp })).catch(e => ({ err: String(e) }));
    ok(re && v2.a === 1 && v2.p === 1, how + ', the signal back: it updates to both new files together (' + JSON.stringify(v2) + ')');
    await qc.close();
  }
  delete over['/js/app.js']; delete over['/js/prep.js'];

  // Opened from the saved copy with no signal, while a new version came out (28 Oct 2026): the first look once the
  // signal is back compares with the saved copy the page opened from, so the strip comes. It used to take that answer as
  // the version running, and the update waited until 04:00. With nothing new, no strip.
  for (const how of ['a new version', 'nothing new']) {
    delete over['/index.html'];
    q = await swOpen(b, '#/recipes', { base, wait: 800 });
    const qc = q.context();
    // the HEAD of index.html is answered from the test side (tests/lib.js), past the browser's offline switch: it fails
    // here while the signal is off
    let dead = false;
    const head = u => u.href === base + 'index.html';
    await qc.route(head, r => dead ? r.abort('internetdisconnected') : r.fallback());
    await L.sleep(2000);   // the worker's round for that opening
    await qc.setOffline(true); dead = true;
    await q.reload({ waitUntil: 'load' }).catch(() => {});
    await L.settle(q, 1500);
    ok(/Barramundi|Recipes/i.test(await q.evaluate(() => document.body.textContent.slice(0, 3000))), how + ': opened from the saved copy with no signal');
    if (how === 'a new version') over['/index.html'] = { lastModified: NEW, body: INDEX };
    await qc.setOffline(false); dead = false;
    await L.settle(q, 500);
    // the next look: back after a minute or more
    await q.clock.fastForward(61000);
    await q.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    const shown = await L.waitFor(q, () => !!document.querySelector('.upd-bar'), null, 4000).then(() => true, () => false);
    if (how === 'nothing new') ok(!shown, 'opened with no signal, nothing new: no strip once the signal is back');
    else {
      ok(shown, 'opened with no signal, a new version out meanwhile: the strip comes once the signal is back');
      ok(!(await L.overflow(q)), 'opened with no signal, a new version: no sideways scroll at 390');
    }
    await qc.close();
  }
  delete over['/index.html'];

  // Opened with signal while the worker's round lost a file of a new version (weak wifi, review of 28 Oct 2026): nothing
  // new is saved and the worker says nothing, but the look at opening gets the new stamp. It used to take that as the
  // version running, so the strip never came and the update waited until 04:00. It compares with the saved copy the
  // page opened from. And with nothing new, a saved copy whose ETag is marked weak (a zipped answer, W/) against a HEAD
  // that is not: no strip.
  for (const how of ['a lost file', 'a weak ETag']) {
    delete over['/index.html'];
    if (how === 'a weak ETag') over['/index.html'] = { lastModified: 'Sun, 18 Oct 2026 00:00:00 GMT', body: INDEX, etag: 'W/"lk-1"', headEtag: '"lk-1"' };
    q = await swOpen(b, '#/recipes', { base, wait: 800 });
    const qc = q.context();
    await L.sleep(2000);   // the worker's round for that opening
    let lost = 0;
    const drop = u => new URL(u).pathname === '/js/prep.js';
    if (how === 'a lost file') {
      over['/index.html'] = { lastModified: NEW, body: INDEX };
      await qc.route(drop, r => r.request().method() === 'GET' && !lost++ ? r.abort('internetdisconnected') : r.fallback());
    }
    await q.reload({ waitUntil: 'load' });
    const shown = await L.waitFor(q, () => !!document.querySelector('.upd-bar'), null, 5000).then(() => true, () => false);
    if (how === 'a lost file') ok(lost === 1 && shown && await q.evaluate(() => !!navigator.serviceWorker.controller), 'opened with signal, the worker\'s round lost a file of a new version: the strip comes (' + lost + ' lost)');
    else ok(!shown, 'opened with signal, nothing new, the saved copy\'s ETag weak: no strip');
    await qc.close();
  }
  delete over['/index.html'];

  // The worker from before 28 Oct 2026 still in charge (review): it has no round to ask and never answers. A new worker
  // that failed to install once on weak wifi leaves it in place. Update now said No signal after 8 seconds with the wifi
  // fine and never reloaded, so the browser did not look for the new worker either. Now no word in 2 seconds means the
  // old worker: the book fetches the files itself, as it did then, and reloads into the new version.
  {
    const OLD_SW = SW.replace(/self\.addEventListener\('message'[\s\S]*?\n\}\);\n/, '');
    ok(OLD_SW !== SW && !/'message'/.test(OLD_SW), 'the stand-in for the old worker has no message handler');
    over['/sw.js'] = { lastModified: 'Mon, 26 Oct 2026 00:00:00 GMT', body: OLD_SW };
    q = await swOpen(b, '#/recipes', { base, wait: 800, touch: true });
    const qc = q.context();
    await L.sleep(2000);
    newData(5);
    await q.evaluate(() => { window.__mark = 1; });
    await q.clock.fastForward(10000);
    await q.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
    await L.waitFor(q, () => !!document.querySelector('.upd-bar'), null, 3000).catch(() => {});
    const t0 = Date.now();
    await q.click('.upd-bar button');
    const re = await until(q, () => window.__v === 5, 15000);
    const said = re ? '' : await q.evaluate(() => (document.querySelector('.upd-bar span') || {}).textContent).catch(() => '');
    ok(re, 'the old worker in charge, Update now with the wifi fine: it updates (' + (Date.now() - t0) + ' ms' + (said ? ', strip: ' + said : '') + ')');
    await qc.close();
    delete over['/sw.js']; delete over['/js/data.js'];
  }

  // A start file asked for with a version (js/learn.js?v=2) is never kept under its plain address (review): it would
  // replace the saved shell one file at a time, outside the all-or-nothing round.
  {
    q = await swOpen(b, '#/recipes', { base, wait: 800 });
    await L.sleep(2000);
    over['/js/learn.js'] = { lastModified: NEW, body: file('js/learn.js') + '\nwindow.__learn = 2;\n' };
    const got = await q.evaluate(() => fetch('js/learn.js?v=2').then(r => r.text()).then(t => t.indexOf('__learn = 2') >= 0));
    await L.sleep(1000);
    ok(got && !(await savedHas(q, 'js/learn.js', '__learn = 2')), 'a start file asked for with a version: it comes from the network, and the saved shell copy is not replaced');
    await q.context().close();
    delete over['/js/learn.js'];
  }

  // A new worker saves the shell past the browser's own cache (28 Oct 2026): GitHub Pages lets the browser keep a file
  // for 10 minutes, and the install used to take it from there, so it could save a file from before the deploy next to
  // new ones. The tests' routes turn the browser's cache off, so this one runs with none, on a bare page that only
  // starts the worker (the book itself, and so Firebase, never loads here).
  over.maxAge = 600;
  over['/sw-start.html'] = { lastModified: NEW, body: '<!doctype html><meta charset="utf-8"><title>Worker</title><script>navigator.serviceWorker.register("sw.js");</script>' };
  {
    const c = await b.newContext({ serviceWorkers: 'allow' });
    const w = await c.newPage();
    // A page's script with its version, and a file asked for with X-LK-Fresh, go past the browser's 10-minute copy too
    // (review of 28 Oct 2026): after a deploy the drawing editor opened again ran its old scripts, and the worker kept
    // those for no signal.
    const OLD = 'Mon, 26 Oct 2026 00:00:00 GMT', MANAGE = file('js/manage.js');
    over['/js/smart.js'] = { lastModified: OLD, body: SMART + '\nwindow.__smart = "old";\n' };
    over['/js/manage.js'] = { lastModified: OLD, body: MANAGE + '\nwindow.__smart = "old";\n' };
    await w.goto(base + 'sw-start.html', { waitUntil: 'load' });
    await w.evaluate(() => navigator.serviceWorker.ready);
    await until(w, () => !!navigator.serviceWorker.controller, 8000);
    // js/smart.js the way mgScript() asks for it, js/manage.js?v=4 the way its script tag does
    const get = (f, asked) => w.evaluate(({ f, asked }) => fetch(f, asked ? { headers: { 'X-LK-Fresh': '1' } } : {}).then(r => r.text()).then(t => (t.match(/window\.__smart = "(\w+)"/) || [])[1] || '?'), { f, asked });
    const before = [await get('js/smart.js', true), await get('js/manage.js?v=4', false)];
    over['/js/smart.js'] = { lastModified: NEW, body: SMART + '\nwindow.__smart = "new";\n' };
    over['/js/manage.js'] = { lastModified: NEW, body: MANAGE + '\nwindow.__smart = "new";\n' };
    const after = [await get('js/smart.js', true), await get('js/manage.js?v=4', false)];
    await L.sleep(500);
    const keptNew = await savedHas(w, 'js/smart.js', '__smart = "new"') && await savedHas(w, 'js/manage.js', '__smart = "new"');
    ok(before.join('/') === 'old/old' && after.join('/') === 'new/new' && keptNew, 'a deploy within the browser\'s 10 minutes: js/smart.js with X-LK-Fresh and js/manage.js?v=4 come new, and are kept new (' + before.join('/') + ' then ' + after.join('/') + ', kept new ' + keptNew + ')');
    delete over['/js/smart.js']; delete over['/js/manage.js'];
    await L.sleep(500);
    over['/js/data.js'] = { lastModified: NEW, body: DATA + '\nwindow.__v = 9;\n' };
    over['/sw.js'] = { lastModified: NEW, body: SW + '\n// the next version\n' };
    await w.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
    let got = false;
    for (let i = 0; i < 40 && !got; i++) { await L.sleep(150); got = await savedHas(w, 'js/data.js', '__v = 9'); }
    ok(got, 'a new worker saves the newest files, not the browser\'s 10-minute copy');
    await c.close();
  }
  delete over.maxAge; delete over['/sw-start.html']; delete over['/sw.js'];
  await b.close();
  srv.close();
  L.report(R);
})().catch(e => { console.log(R.join("\n")); console.error(e); process.exit(1); });
