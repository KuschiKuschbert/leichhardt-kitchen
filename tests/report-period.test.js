// One period for every report (5 Nov 2026, admin pages step 4, docs/admin-pages-options/brief.md): 7, 14 or 30 days
// chosen on one report is the period of Insights, Team, Transfers and Wastage alike, starting at 30 days like the
// Dashboard. Wastage's longer choices stay on Wastage. Example data only.
const L = require('./lib');
const { R, ok } = L.results();
const range = p => p.evaluate(() => LK_PREP.state.statsRange);
const whPeriod = p => p.evaluate(() => (LK_PREP.state.wh || {}).period);
const pressed = p => p.evaluate(() => { const b = document.querySelector('[data-p="range"][aria-pressed="true"]'); return b ? b.getAttribute('data-v') : ''; });
(async () => {
  const b = await L.start();
  for (const width of [390, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: 'insights', who: '', width, height: 900, wait: 1600 });
    await L.settle(p, 800);
    ok(await range(p) === 30 && await pressed(p) === '30', width + ': Insights starts at 30 days, like the Dashboard and Wastage');
    // a period chosen on Insights carries to Wastage
    await L.tap(p, '[data-p="range"][data-v="7"]'); await L.settle(p, 300);
    await L.adminTab(p, 'waste'); await L.settle(p, 600);
    ok(await whPeriod(p) === '7' && await p.$eval('[data-k="wh-period"]', e => e.value) === '7', width + ': 7 days chosen on Insights is Wastage\'s period too');
    // and one chosen on Wastage carries to Transfers and Team
    await L.pick(p, '[data-k="wh-period"]', '14'); await L.settle(p, 600);
    await L.adminTab(p, 'transfers'); await L.settle(p, 600);
    ok(await range(p) === 14 && await pressed(p) === '14', width + ': 14 days chosen on Wastage is the period of Transfers (' + await range(p) + ', ' + await pressed(p) + ')');
    await L.adminTab(p, 'team'); await L.settle(p, 400);
    ok(await range(p) === 14, width + ': and of Team');
    // Wastage's own longer choices stay on Wastage
    await L.adminTab(p, 'waste'); await L.settle(p, 400);
    await L.pick(p, '[data-k="wh-period"]', 'this'); await L.settle(p, 600);
    await L.adminTab(p, 'insights'); await L.settle(p, 400);
    ok(await range(p) === 14 && await pressed(p) === '14', width + ': This month on Wastage leaves the other reports on 14 days');
    ok(!await L.overflow(p), width + ': no sideways scroll');
    ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
