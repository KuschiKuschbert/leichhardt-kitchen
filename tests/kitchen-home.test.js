// Kitchen, Overview (5 Nov 2026, admin pages step 6, docs/admin-pages-options/brief.md): the Kitchen room opens on every
// kitchen setting as a row that says what it is set to, opening the page that changes it, with no reads. The Settings
// page's kitchen rows name the rooms (they named the chapters from before the rooms). Example data only.
const L = require('./lib');
const { R, ok } = L.results();
const cfgKey = ['kitchens', L.PIN, 'config', 'main'].join('/');
(async () => {
  const b = await L.start();
  const seed = L.seed()[cfgKey];
  const extra = { [cfgKey]: { ...seed, kitSecs: [{ id: 's-grill', name: 'Grill' }, { id: 's-larder', name: 'Larder' }], showBadges: false, cutoffs: [{ id: 'pfd', name: 'PFD', dd: [2, 5], at: 14 * 60, pre: 1 }] } };
  for (const width of [390, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width, height: 900, extra, wait: 1600 });
    await L.settle(p, 600);
    const before = await p.evaluate(() => window.__fake.reads.length);
    await p.click('[data-p="a-group"][data-g="kitchen"]'); await L.settle(p, 400);
    ok(await p.evaluate(() => LK_PREP.state.atab) === 'kitchen-home', width + ': the Kitchen room opens on its Overview');
    const rows = await p.$$eval('.k-home .st-row', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    const has = re => rows.some(r => re.test(r));
    ok(has(/^Order cut-offs ?1 supplier/) && has(/^Kitchen sections ?Grill, Larder/) && has(/^Weekly top tickers on the prep book ?Hidden/) && has(/^Backup ?Every night at 03:30/),
      width + ': each row says what the setting is (' + rows.slice(0, 4).join(' | ') + ')');
    ok(await p.evaluate(() => window.__fake.reads.length) === before, width + ': the Overview reads nothing');
    ok(!await L.overflow(p), width + ': no sideways scroll on the Overview');
    // a row opens the page that changes it, in whichever room that page lives
    await p.click('.k-home [data-p="k-open"][data-t="cutoffs"]'); await L.settle(p, 300);
    ok(await p.evaluate(() => LK_PREP.state.atab) === 'cutoffs' && await p.locator('[data-g="kitchen"][aria-current="page"]').count() === 1, width + ': Order cut-offs opens its page in Kitchen');
    await L.adminTab(p, 'kitchen-home'); await L.settle(p, 300);
    await p.click('.k-home [data-p="k-open"][data-t="people"] >> nth=0'); await L.settle(p, 300);
    ok(await p.evaluate(() => LK_PREP.state.atab) === 'people' && await p.locator('[data-g="team"][aria-current="page"]').count() === 1, width + ': Kitchen sections opens Team, People, where they are changed');
    ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // the Settings page's kitchen rows say where each setting is changed, by room
  const s = await L.open(b, '#/settings', { admin: true, width: 1280, height: 900, extra, wait: 1600 });
  await L.settle(s, 600);
  const subs = await s.$$eval('.st-sub', els => els.map(e => e.textContent.trim()).filter(t => /^Changed in Admin/.test(t)));
  ok(subs.length > 0 && subs.every(t => /^Changed in Admin, (Today|Reports|Team|Kitchen), /.test(t)), 'Settings names the admin rooms where each kitchen setting is changed (' + subs.join(' | ') + ')');
  await s.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
