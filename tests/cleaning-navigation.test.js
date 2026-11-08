// Kitchen cleaning takes the sixth main tab; Guides remains a private kitchen link in the chef hat.
const L = require('./lib'), { R, ok } = L.results();
const go = async (p, hash) => { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 400); };
const back = '.wtop [data-act="back"]';

(async () => {
  const b = await L.start();
  for (const width of [390, 1280]) {
    const p = await L.open(b, '#/recipes', { who: 'ann', extra: L.guides(), width, height: width > 400 ? 900 : 844, wait: 1600 });
    const nav = await p.evaluate(() => ['.pnav', '.tabbar'].map(s => [...document.querySelectorAll(s + ' a')].map(a => a.getAttribute('href')).join(',')));
    ok(nav.every(x => x === '#/recipes,#/prep,#/orders,#/waste,#/transfers,#/cleaning'), width + ' px: six main links with Cleaning in the final position');
    ok(await p.evaluate(() => !window.LK_CLEANING && !performance.getEntriesByType('resource').some(r => /\/js\/cleaning\.js/.test(r.name))), width + ' px: opening Recipes does not download cleaning tools');
    await p.click('.wtop-who');
    const groups = await p.evaluate(() => ['cleaning', 'guides'].map(id => {
      const a = document.querySelector('.wm a[href="#/' + id + '"]'), h = a && a.closest('.wm-grid').previousElementSibling;
      return { group: h && h.textContent.trim(), label: a && a.textContent.trim(), icon: !!(a && a.querySelector('svg[aria-hidden="true"][stroke="currentColor"]')), height: a && a.getBoundingClientRect().height };
    }));
    ok(groups[0].group === 'Every day' && groups[0].label === 'Kitchen cleaning' && groups[1].group === 'More' && groups[1].label === 'Guides', width + ' px: Kitchen cleaning is under Every day and Guides under More');
    ok(groups.every(x => x.icon && x.height >= 44), width + ' px: both rows use the existing ink icons and full touch targets');
    ok(!(await L.overflow(p)), width + ' px: the navigation and hat have no sideways overflow');
    await p.click('.wm a[href="#/guides"]');
    await L.waitFor(p, () => !!document.querySelector('.g-card'));
    ok(await p.evaluate(() => !document.querySelector('.wm-wrap') && !document.querySelector('.pnav [aria-current], .tabbar [aria-current]')), width + ' px: Guides opens and closes the hat without selecting another main tab');
    ok(await p.locator(back).getAttribute('aria-label') === 'Back to recipes', width + ' px: Guides keeps contextual Back');
    await p.click(back); await L.settle(p, 400);
    ok(await p.evaluate(() => location.hash === '#/recipes'), width + ' px: Back returns to Recipes');
    ok(!p.errors.length, width + ' px: no navigation errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // A failed first download must be recoverable without reloading or losing the route. The small module stand-in
  // isolates the router's mount/unmount contract from the cleaning page and its saved records.
  const p = await L.open(b, '#/recipes', { who: 'ann', block: 'js/cleaning\\.js', wait: 1600 });
  await go(p, '#/cleaning');
  await L.waitFor(p, () => !!document.querySelector('[data-cleaning-retry]'));
  ok(await p.locator('#cleaning-root').innerText().then(t => /Could not open kitchen cleaning/.test(t)), 'failed first download gives a visible Retry action');
  const failedLoadErrors = p.errors.splice(0);
  ok(failedLoadErrors.every(e => e === 'console: Failed to load resource: net::ERR_FAILED'), 'the deliberately blocked download reports only its expected network failure');
  ok(await p.evaluate(() => document.title === 'Kitchen cleaning · Leichhardt Kitchen Book' && [...document.querySelectorAll('.pnav [aria-current], .tabbar [aria-current]')].every(a => a.getAttribute('href') === '#/cleaning')), 'cleaning route has its own title and active main tab');
  await p.context().route(/js\/cleaning\.js/, r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.LK_CLEANING = { api: 1, mount: function (root) { root.innerHTML = \'<h2 id="rtitle" tabindex="-1">Kitchen cleaning</h2>\'; window.cleaningMounted = true; }, unmount: function () { window.cleaningMounted = false; }, reset: function () { window.cleaningMounted = false; }, dirty: function () { return false; } };' }));
  await p.click('[data-cleaning-retry]');
  await L.waitFor(p, () => !!window.cleaningMounted);
  ok(await p.locator('#cleaning-root #rtitle').innerText() === 'Kitchen cleaning', 'Retry opens the cleaning page when the connection returns');
  await p.click(back); await L.settle(p, 400);
  ok(await p.evaluate(() => location.hash === '#/recipes' && !window.cleaningMounted), 'leaving Cleaning unmounts its page and returns to Recipes');
  await go(p, '#/cleaning'); await p.reload({ waitUntil: 'load' }); await L.settle(p, 1200);
  await L.waitFor(p, () => !!window.cleaningMounted);
  ok(await p.locator(back).getAttribute('aria-label') === 'Back to Kitchen Book', 'a direct Cleaning link uses Home as its Back destination');
  await p.evaluate(() => window.LK_PREP.signOut(true)); await L.settle(p, 700);
  ok(await p.evaluate(() => !window.cleaningMounted && !document.querySelector('#cleaning-root') && !document.querySelector('.tabbar a[href="#/cleaning"]')), 'signing out removes the cleaning page and its tab immediately');
  ok(!p.errors.length, 'loading, Retry, Back and sign out have no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
