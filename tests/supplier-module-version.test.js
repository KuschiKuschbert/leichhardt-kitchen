// The supplier fix must reach phones that already loaded an older lazy module.
const L = require('./lib');
const F = require('./supplier-fixtures');
const { R, ok } = L.results();
const supplierUrls = p => p.urls.filter(url => /\/js\/(suppliers|supplier-core|supplier-store)\.js(?:\?|$)/.test(url));
const revision = (p, file) => supplierUrls(p).filter(url => new URL(url).pathname.endsWith('/js/' + file)).every(url => new URL(url).searchParams.get('v') === (file === 'suppliers.js' ? '17' : file === 'supplier-core.js' ? '4' : '3'));
const staleCore = () => { window.LK_SUP_CORE = { API: 3 }; window.LK_SUP_STORE = { API: 1 }; };

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), init: staleCore, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  ok(supplierUrls(p).some(url => new URL(url).pathname.endsWith('/js/suppliers.js')) && revision(p, 'suppliers.js'), 'supplier page requests the revised workspace address');
  ok(supplierUrls(p).some(url => new URL(url).pathname.endsWith('/js/supplier-core.js')) && revision(p, 'supplier-core.js'), 'supplier page replaces an older core through the revised address');
  ok(supplierUrls(p).some(url => new URL(url).pathname.endsWith('/js/supplier-store.js')) && revision(p, 'supplier-store.js') && await p.evaluate(() => window.LK_SUP_STORE.API === 2), 'supplier page replaces the older store before preserving reviewed units');
  ok(await p.evaluate(() => window.LK_SUP.api === 9 && window.LK_SUP_CORE.API === 4), 'supplier page mounts only the matching workspace and core revision');
  ok(p.errors.length === 0, 'revised supplier page has no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // The order list groups a chef's requests by supplier (5 Nov 2026, round 2 of the work pages redesign): it loads the
  // current supplier core and store, replacing an old one in memory, but not the supplier workspace page, which waits for
  // the supplier's name on the tick list. Since 5 Nov 2026 the tick beside it confirms only; the name opens the sheet.
  p = await L.open(b, '#/orders', { who: 'bo', extra: F.fixture(), init: staleCore, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.o-sups .cut-tl a.cut-n[href*="/northside/"]'), null, 10000);
  ok(!supplierUrls(p).some(url => new URL(url).pathname.endsWith('/js/suppliers.js')) && revision(p, 'supplier-core.js') && revision(p, 'supplier-store.js') && await p.evaluate(() => window.LK_SUP_CORE.API === 4 && window.LK_SUP_STORE.API === 2), 'the order list loads only the current supplier core and store to group requests, not the workspace page');
  await p.click('.cut-tl a.cut-n[href*="/northside/"]');
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="qty"]'), null, 15000);
  ok(revision(p, 'supplier-core.js') && await p.evaluate(() => window.LK_SUP_CORE.API === 4), 'reminder entry replaces an old core with the current revision');
  ok(revision(p, 'supplier-store.js') && await p.evaluate(() => window.LK_SUP_STORE.API === 2), 'detailed reminder entry replaces an older store too');
  ok(await p.evaluate(({ day, key }) => location.hash === '#/suppliers/cutoff/northside/' + day && !window.__fake.dump()[key], { day: F.today, key: F.key(['cutdone', F.today + '_northside']) }), 'revised reminder entry opens the linked sheet without recording an order');
  ok(p.errors.length === 0, 'revised reminder entry has no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // The order-list tick confirms a reminder even when an old supplier core is already in memory and the current one has
  // not arrived (held back, as on a slow live site): the list stays plain and the tick waits for neither.
  p = await L.open(b, '#/orders', { who: 'bo', extra: F.fixture(), init: staleCore, hold: 'js/supplier-(core|store)\\.js|js/suppliers\\.js', wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.cut-tl [data-p="cut-tick"][data-id^="northside|"]:not([disabled])'), null, 10000);
  const asked = supplierUrls(p).length;
  await p.click('.cut-tl [data-p="cut-tick"][data-id^="northside|"]');
  await L.waitFor(p, k => window.__fake.dump()[k]?.on === true, F.key(['cutdone', F.today + '_northside']), 10000);
  ok(supplierUrls(p).length === asked && await p.evaluate(() => window.LK_SUP_CORE.API === 3 && location.hash === '#/orders' && !document.querySelector('.o-sups')), 'reminder-only completion does not depend on or replace an older supplier module');
  ok(p.errors.length === 0, 'reminder-only completion with an old module has no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // An old UI object must not be allowed to mount against the updated app shell.
  p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), wait: 1500, init: () => {
    window.__oldSupplierMounted = false;
    window.LK_SUP = { api: 4, mount() { window.__oldSupplierMounted = true; }, reset() {}, unmount() {}, dirty() { return false; } };
  } });
  await L.waitFor(p, () => /Reload the book/.test(document.querySelector('#supplier-root')?.textContent || ''), null, 10000);
  ok(await p.evaluate(() => !window.__oldSupplierMounted) && !(await p.$('input[data-sf="qty"]')), 'an old workspace API is rejected before an order sheet mounts');
  ok(await p.evaluate(() => !(window.__fake.reads || []).some(path => /\/suppliers(?:\/|$)/.test(path))), 'rejected old workspace reads no private catalogue');
  ok(p.errors.length === 0, 'old workspace rejection has no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // A fresh address can still fall back to an older offline copy. Check the API after delivery, before any data read.
  p = await L.open(b, '#/', { who: 'bo', extra: F.fixture(), wait: 1500 });
  await L.waitFor(p, () => window.LK_PREP.supplier().read(), null, 10000);
  await p.context().route(/\/js\/supplier-core\.js(?:\?|$)/, route => route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.LK_SUP_CORE = { API: 1 };' }));
  await p.evaluate(() => { location.hash = '#/suppliers/northside'; });
  await L.waitFor(p, () => /need an update/i.test(document.querySelector('#supplier-root')?.textContent || ''), null, 10000);
  ok(await p.evaluate(() => window.LK_SUP.api === 9 && window.LK_SUP_CORE.API === 1) && /reload the book/i.test(await p.textContent('#supplier-root')), 'current workspace explains how to update after an old core response is delivered');
  ok(!(await p.$('input[data-sf="qty"]')), 'an old delivered core cannot produce a partial order sheet');
  ok(await p.evaluate(() => !(window.__fake.reads || []).some(path => /\/suppliers(?:\/|$)/.test(path))), 'an old delivered core is rejected before any private catalogue read');
  ok(p.errors.length === 0, 'old delivered core rejection has no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})();
