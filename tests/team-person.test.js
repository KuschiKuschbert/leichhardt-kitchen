// A page for each person (5 Nov 2026, admin pages step 5, docs/admin-pages-options/brief.md): opened from the team list,
// it shows what the person may do (read only: changes stay in the list and its Save) and their activity over the shared
// report period, counted like the Team report, with no reads beyond the Team report's. Example data only.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const ago = d => L.ymd(new Date(L.NOW - d * 86400000));
const extra = {};
const line = (text, station, x) => Object.assign({ text, station, qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 90000000, done: false, deleted: false }, x || {});
extra[fsKey(['days', ago(1), 'items', 's1'])] = line('Make stock', 'Larder', { done: true, doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW - 86000000 });
extra[fsKey(['days', ago(1), 'items', 's2'])] = line('Pick herbs', 'Larder', { done: true, doneBy: 'Sam', doneById: 'sam', doneAt: L.NOW - 86000000 });
extra[fsKey(['days', ago(3), 'items', 's3'])] = line('Slice onions', 'Grill');
extra[fsKey(['days', ago(3), 'items', 'a1'])] = line('Peel carrots', 'Larder', { addedBy: 'Ann', addedById: 'ann' });
(async () => {
  const b = await L.start();
  for (const width of [390, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: 'team', who: '', width, height: 900, extra, wait: 2000 });
    await L.waitFor(p, () => LK_PREP.state.stats && !LK_PREP.state.stats.loading, null, 8000).catch(() => {});
    await L.settle(p, 500);
    // the Team report has read its days; the person page reads nothing more
    await L.adminTab(p, 'people'); await L.settle(p, 600);
    const before = await p.evaluate(() => window.__fake.reads.length);
    ok(await p.locator('[data-p="a-person"][data-id="sam"]').count() === 1, width + ': a saved person has Open page in their row');
    await L.tap(p, '[data-p="a-person"][data-id="sam"]'); await L.settle(p, 500);
    const page = await L.txt(p, '.a-personpage') || '';
    ok(/Sam/.test(page) && /Sous chef/.test(page) && /Can: Write, Tick, Remove/.test(page), width + ': the page says the role and what Sam may do (' + page.slice(0, 160) + ')');
    const tiles = await p.$$eval('.a-personpage .a-tile', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    const num = re => { const t = tiles.find(x => re.test(x)); return t ? parseInt(t, 10) : -1; };
    ok(num(/lines written/) >= 3 && num(/lines ticked off/) >= 2 && tiles.some(t => /in Larder, the main section/.test(t)), width + ': Sam\'s last 30 days: written, ticked off and the main section (' + tiles.join(' | ') + ')');
    ok(/Ticks record activity\. They do not confirm skill\./.test(page), width + ': the page says ticks are activity, not skill');
    ok(await p.evaluate(() => window.__fake.reads.length) === before, width + ': the person page reads nothing beyond the Team report');
    ok(await p.locator('.a-personpage input, .a-personpage select, .a-personpage [data-a]').count() === 0, width + ': nothing on the page changes what Sam may do: that stays in the team list');
    ok(!await L.overflow(p), width + ': no sideways scroll on the person page');
    // the top bar's Back goes back to the list, and so does changing page
    await p.click('.wtop [data-act="back"]'); await L.settle(p, 300);
    ok(await p.evaluate(() => !LK_PREP.state.personId) && await p.locator('[data-p="a-person"][data-id="sam"]').count() === 1, width + ': Back returns to all people');
    await L.tap(p, '[data-p="a-person"][data-id="ann"]'); await L.settle(p, 300);
    await L.adminTab(p, 'training-records'); await L.settle(p, 300);
    await L.adminTab(p, 'people'); await L.settle(p, 300);
    ok(await p.locator('.a-personpage').count() === 0 && await p.locator('[data-p="a-person"][data-id="ann"]').count() === 1, width + ': changing page closes the person, so People opens on the list');
    // an unsaved change in the list keeps its Save bar on a person's page
    await p.evaluate(() => { const c = document.querySelector('[data-a="perm"][data-perm="del"][data-i="1"]'); if (c) c.click(); });
    await L.settle(p, 300);
    await L.tap(p, '[data-p="a-person"][data-id="bo"]'); await L.settle(p, 300);
    ok(await p.locator('[data-p="a-save"]').count() === 1, width + ': an unsaved change in the list keeps its Save bar on the person page');
    const bo = await L.txt(p, '.a-personpage') || '';
    ok(/No lines written or ticked off in the last 30 days/.test(bo), width + ': a person with nothing in the period says so in words (' + bo.slice(0, 160) + ')');
    ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
