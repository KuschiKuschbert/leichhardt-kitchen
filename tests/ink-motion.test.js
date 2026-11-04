// Real waiting paths keep the book visible, tell the truth, and respect the device's motion/connection settings.
const L = require('./lib');
const { R, ok } = L.results();
const loops = p => p.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity && a.effect.target.closest('.ink-icon')).length);
const retainedSearch = p => p.evaluate(() => document.getElementById('find') === window.__inkFind && document.activeElement === window.__inkFind && window.__inkFind.value === 'chicken' && document.getElementById('results') === window.__inkResults && window.__inkResults.innerHTML === window.__inkResultsHTML);

(async () => {
  const b = await L.start();
  try {
    // Hold the deferred app script, so this checks the HTML a slow first visit actually receives.
    let releaseApp, gotPage;
    const appGate = new Promise(resolve => { releaseApp = resolve; });
    const earlyPage = new Promise(resolve => { gotPage = resolve; });
    const delayedBrowser = { newContext: async options => {
      const ctx = await b.newContext(options);
      await ctx.route('**/js/app.js*', async route => { await appGate; await route.continue(); });
      ctx.on('page', gotPage);
      return ctx;
    } };
    const opening = L.open(delayedBrowser, '#/', { noPin: true, who: '' });
    let p = await earlyPage;
    try {
      await p.locator('.ink-startup').waitFor({ state: 'visible' });
      ok(await L.txt(p, '.ink-startup h1') === 'Kitchen Book', 'a delayed first app script still shows the book heading');
      ok(/Opening the kitchen book/.test(await L.txt(p, '.ink-startup [role="status"]')), 'the initial HTML explains the wait before the app runs');
      ok(await p.locator('.ink-startup .ink-icon[data-icon="chef"][data-state="busy"]').count() === 1, 'the initial wait uses the native chef ink motif');
      ok(!(await L.overflow(p)), 'the initial waiting shell fits a phone');
    } finally { releaseApp(); }
    p = await opening;
    ok(await p.locator('.ink-startup').count() === 0 && await p.locator('.docket').count() > 0, 'the loaded landing replaces the startup shell with the book');
    ok(p.errors.length === 0, 'startup has no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    // Exercise the actual private script loader, including its fetch-then-script failure and retry.
    p = await L.open(b, '#/recipes', { admin: true });
    let releaseEditor;
    const editorGate = new Promise(resolve => { releaseEditor = resolve; });
    const editorRoute = async route => { await editorGate; await route.abort(); };
    await p.context().route('**/js/manage.js*', editorRoute);
    await p.evaluate(() => { location.hash = '#/manage'; });
    await L.waitFor(p, () => /Opening the recipe editor/.test((document.getElementById('mg-root') || {}).textContent || ''));
    ok(await p.locator('#mg-root [role="status"] .ink-icon[data-state="busy"]').count() === 1, 'the real lazy editor loader shows a labelled busy recipe icon');
    ok(await p.locator('#mg-root .ink-skeleton[aria-hidden="true"]').count() === 1 && await p.locator('#mg-root .ink-icon[data-state="done"]').count() === 0, 'pending editor rows are decorative and never claim success');
    await L.waitFor(p, () => document.getAnimations().some(a => a.effect && a.effect.getTiming().iterations === Infinity));
    ok(await loops(p) > 0, 'a visible pending editor has an actual ink animation');
    await p.emulateMedia({ reducedMotion: 'reduce' });
    ok(await loops(p) === 0 && /Opening/.test(await L.txt(p, '#mg-root')), 'reduced motion stops the actual loop while preserving waiting text');
    await p.emulateMedia({ reducedMotion: 'no-preference' });
    ok(await loops(p) > 0, 'the busy stroke returns when normal motion is allowed');
    await p.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      window.dispatchEvent(new Event('offline'));
    });
    ok(await p.evaluate(() => document.documentElement.classList.contains('ink-offline')) && await loops(p) === 0, 'the real offline event stops waiting loops immediately');
    await p.evaluate(() => {
      // A config read can finish while disconnected and redraw the still-pending script loader.
      window.dispatchEvent(new Event('lk-cfg'));
      window.__inkOfflineIcon = document.querySelector('#mg-root .ink-icon');
    });
    ok(await loops(p) === 0 && /Opening the recipe editor/.test(await L.txt(p, '#mg-root')), 'a config redraw while offline keeps the pending editor readable without restarting motion');
    ok(await p.locator('#mg-root .ink-icon svg > g:first-child').count() === 1, 'offline motion leaves the readable native icon in place');
    await p.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
      window.dispatchEvent(new Event('online'));
    });
    ok(await loops(p) > 0, 'an ongoing request resumes ink after an offline config redraw when the connection returns');
    ok(await p.evaluate(() => document.querySelector('#mg-root .ink-icon') === window.__inkOfflineIcon), 'reconnection resumes the existing icon without another DOM redraw');
    releaseEditor();
    await p.locator('[data-act="mgretry"]').waitFor({ state: 'visible' });
    ok(/Could not open the recipe editor/.test(await L.txt(p, '#mg-root')) && await p.locator('#mg-root .ink-icon[data-state="busy"]').count() === 0, 'a failed lazy download replaces busy feedback with an honest retry state');
    await p.context().unroute('**/js/manage.js*', editorRoute);
    await p.click('[data-act="mgretry"]');
    await L.waitFor(p, () => !!window.LK_MG && !document.querySelector('[data-act="mgretry"]'));
    ok(await p.locator('#mg-root .ink-status[data-state="busy"]').count() === 0, 'retry opens the real editor and clears its waiting message');
    const unexpected = p.errors.filter(e => !/Failed to load resource: net::ERR_FAILED/.test(e));
    ok(unexpected.length === 0, 'lazy loading has no unexpected browser errors ' + unexpected.join(' | '));
    await p.context().close();

    // Hold the real refresh's first asynchronous read, without replacing rxSync or its state events.
    p = await L.open(b, '#/recipes', { settings: { view: 'tiles' } });
    await L.waitFor(p, () => window.LK_PREP.rxState() === 'ok');
    await p.fill('#find', 'chicken');
    await L.settle(p, 300);
    await p.evaluate(() => {
      window.__inkFind = document.getElementById('find');
      window.__inkResults = document.getElementById('results');
      window.__inkResultsHTML = window.__inkResults.innerHTML;
      const artReady = window.LK_RX.artReady;
      window.LK_RX.artReady = () => new Promise(resolve => { window.__inkReleaseRefresh = () => resolve(artReady()); });
      window.__inkRefresh = window.LK_PREP.rxSync(true);
    });
    await p.locator('#recipe-sync-status .ink-icon[data-state="busy"]').waitFor({ state: 'visible' });
    ok(await retainedSearch(p), 'a slow recipe refresh keeps the search text, results, DOM nodes and keyboard focus');
    ok(await p.locator('#recipe-sync-status').getAttribute('aria-live') === 'polite' && await p.locator('#recipe-sync-status').getAttribute('aria-busy') !== 'true', 'the recipe wait can be announced without silencing its live region');
    await p.evaluate(async () => { window.__inkReleaseRefresh(); await window.__inkRefresh; });
    ok(await p.evaluate(() => window.LK_PREP.rxState() === 'ok') && await p.locator('#recipe-sync-status').isHidden(), 'a completed real refresh removes the waiting status');
    ok(await retainedSearch(p), 'successful checking leaves the current recipe search and focus intact');
    await p.evaluate(() => { window.__fake.failReads = /\/book\/index$/; window.__inkRefresh = window.LK_PREP.rxSync(true); });
    await p.locator('#recipe-sync-status .ink-icon[data-state="busy"]').waitFor({ state: 'visible' });
    await p.evaluate(async () => { window.__inkReleaseRefresh(); await window.__inkRefresh; });
    ok(await p.evaluate(() => window.LK_PREP.rxState() === 'error') && /Could not check for recipe updates/.test(await L.txt(p, '#recipe-sync-status')), 'a failed real refresh explains that the loaded book remains available');
    ok(await p.locator('#recipe-sync-status .ink-icon[data-state="busy"]').count() === 0 && await loops(p) === 0, 'a failed recipe refresh stops its busy animation');
    ok(await retainedSearch(p), 'refresh failure also retains search, results and keyboard focus');
    ok(p.errors.length === 0, 'recipe refresh has no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  } finally { await b.close(); }
  R.forEach(line => console.log(line));
  if (R.some(line => line.startsWith('FAIL'))) process.exitCode = 1;
})().catch(error => { R.forEach(line => console.log(line)); console.error(error); process.exitCode = 1; });
