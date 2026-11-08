// Kitchen, Overview (5 Nov 2026, admin pages step 6, docs/admin-pages-options/brief.md): the Kitchen room opens on every
// kitchen setting as a row that says what it is set to, opening the page that changes it, with no reads. The Settings
// page's kitchen rows name the rooms (they named the chapters from before the rooms). Part 2: Kitchen sections, Pages
// staff see and Weekly top tickers open in place on the Overview, saved with the team list's one draft and Save.
// Example data only.
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
    // part 2: sections, pages staff see and the top tickers open in place, one at a time; who books functions stays with
    // the people, in Team
    await L.adminTab(p, 'kitchen-home'); await L.settle(p, 300);
    const rowsOf = () => p.$$eval('.k-home .st-btn', els => els.map(e => (e.getAttribute('data-r') || e.getAttribute('data-t')) + ':' + e.querySelector('.st-l').textContent + ':' + (e.getAttribute('aria-expanded') || '') + ':' + ((e.querySelector('.st-sub') || {}).textContent || '')));
    const shut = await rowsOf();
    ok(['secs:Kitchen sections:false:', 'see:Pages staff see:false:', 'badges:Weekly top tickers on the prep book:false:', 'people:Who books functions::Team, People'].every(x => shut.includes(x)),
      width + ': sections, pages staff see and top tickers are rows that open in place; who books functions says Team, People (' + shut.join(' | ') + ')');
    ok(await p.locator('.k-home .k-body, .k-home .a-savebar').count() === 0, width + ': every row starts closed, with no Save bar');
    await p.click('[data-p="k-row"][data-r="secs"]'); await L.settle(p, 400);
    ok(await p.evaluate(() => LK_PREP.state.atab) === 'kitchen-home' && await p.locator('#k-b-secs .a-ks [data-p="ks-add"]').count() === 1 && await p.locator('#k-b-secs .a-savebar [data-p="a-save"][disabled]').count() === 1,
      width + ': Kitchen sections opens in its row, with the editor and the Save bar (off)');
    await p.click('[data-p="k-row"][data-r="see"]'); await L.settle(p, 400);
    ok(await p.locator('#k-b-secs').count() === 0 && await p.locator('#k-b-see [data-a="staffsee"]').count() === 4 && await p.locator('[data-p="k-row"][data-r="see"][aria-expanded="true"]').count() === 1,
      width + ': Pages staff see opens in its row with the four pages, and Kitchen sections closes');
    const top = await p.evaluate(() => document.getElementById('k-h-see').getBoundingClientRect().top);
    ok(top >= 0 && top < 900 - 160, width + ': the row just opened is in view (' + Math.round(top) + ')');
    await p.click('[data-p="k-row"][data-r="badges"]'); await L.settle(p, 400);
    ok(await p.locator('#k-b-badges [data-a="badges"]').count() === 1 && await p.locator('#k-b-see').count() === 0, width + ': Weekly top tickers opens in its row with the tick');
    ok(!await L.overflow(p), width + ': no sideways scroll with a row open');
    await p.click('[data-p="k-row"][data-r="badges"]'); await L.settle(p, 300);
    ok(await p.locator('.k-home .k-body').count() === 0, width + ': a second tap closes the row');
    await p.click('.k-home [data-p="k-open"][data-t="people"] >> nth=0'); await L.settle(p, 300);
    ok(await p.evaluate(() => LK_PREP.state.atab) === 'people' && await p.locator('[data-g="team"][aria-current="page"]').count() === 1, width + ': Who books functions opens Team, People, where the ticks are changed');
    ok(await p.locator('.a-pane .a-ks, .a-pane .a-feats, .a-pane [data-a="badges"]').count() === 0, width + ': Team, People no longer has the sections, pages or top tickers');
    ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // one draft and one Save across People and the Kitchen rows: the Save bar names where the changes are, a closed row's
  // changes keep a Save bar on the Overview, and one Save stores them all, with the canonical capability lists worked out
  // from the list as before (docs/staff-capabilities.md)
  {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width: 390, height: 900, extra, wait: 1600 });
    await L.settle(p, 600);
    const unsaved = () => p.evaluate(() => [...document.querySelectorAll('.a-unsaved')].map(e => e.textContent.trim()).join(' / '));
    await L.kitchenRow(p, 'secs');
    await p.click('[data-p="ks-add"]'); await L.settle(p, 200);
    await p.fill('[data-k="a-ks2"]', 'Pastry'); await L.settle(p, 200);
    ok(await unsaved() === '1 unsaved change', 'one Save: a section added says 1 unsaved change, with no names (' + await unsaved() + ')');
    await L.kitchenRow(p, 'see');
    await p.click('[data-a="staffsee"][data-f="guides"]'); await L.settle(p, 200);
    ok(await unsaved() === '2 unsaved changes: Kitchen sections, Pages staff see', 'one Save: the Save bar names both rows (' + await unsaved() + ')');
    await p.click('[data-p="k-row"][data-r="see"]'); await L.settle(p, 300);
    ok(await p.locator('.k-body').count() === 0 && await unsaved() === '2 unsaved changes: Kitchen sections, Pages staff see', 'one Save: with every row closed, the Save bar stays on the Overview (' + await unsaved() + ')');
    await L.adminTab(p, 'people'); await L.settle(p, 300);
    const bo = await p.evaluate(() => LK_PREP.state.draft.people.findIndex(x => x.id === 'bo'));
    await p.evaluate(i => document.querySelector('[data-a="perm"][data-perm="del"][data-i="' + i + '"]').click(), bo); await L.settle(p, 200);
    ok(await unsaved() === '3 unsaved changes: People, Kitchen sections, Pages staff see', 'one Save: People names all three (' + await unsaved() + ')');
    await p.click('[data-p="a-save"]');
    const saved = await L.waitFor(p, k => ((window.__fake.dump()[k] || {}).kitSecs || []).some(x => x.name === 'Pastry'), cfgKey, 5000).then(() => true, () => false);
    const c = (await p.evaluate(() => window.__fake.dump()))[cfgKey] || {};
    ok(saved && (c.kitSecs || []).map(x => x.name).join() === 'Grill,Larder,Pastry' && (c.staffSee || {}).guides === false && (c.staffSee || {}).pings === true && (c.staffSee || {}).minutes === true && (c.staffSee || {}).cleaning === true && c.showBadges === false,
      'one Save: the new section and the held back page are stored, the top tickers left as they were (' + JSON.stringify(c.kitSecs) + ' ' + JSON.stringify(c.staffSee) + ')');
    ok((c.delIds || []).includes('bo') && !(c.delIds || []).includes('ann') && (c.sousIds || []).includes('sam') && !(c.sousIds || []).includes('bo') && (c.staffIds || []).includes('bo'),
      'one Save: the canonical lists come from the list (delIds ' + JSON.stringify(c.delIds) + ', sousIds ' + JSON.stringify(c.sousIds) + ')');
    ok(await unsaved() === '' && await p.locator('[data-p="a-save"][disabled]').count() === 1, 'one Save: nothing left unsaved after it');
    await L.adminTab(p, 'kitchen-home'); await L.settle(p, 300);
    ok(await p.locator('.k-home .a-savebar').count() === 0, 'one Save: no Save bar on the Overview once saved');
    ok(p.errors.length === 0, 'one Save: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // the Settings page's kitchen rows say where each setting is changed, by room
  const s = await L.open(b, '#/settings', { admin: true, width: 1280, height: 900, extra, wait: 1600 });
  await L.settle(s, 600);
  const subs = await s.$$eval('.st-sub', els => els.map(e => e.textContent.trim()).filter(t => /^Changed in Admin/.test(t)));
  ok(subs.length > 0 && subs.every(t => /^Changed in Admin, (Today|Reports|Team|Kitchen), /.test(t)), 'Settings names the admin rooms where each kitchen setting is changed (' + subs.join(' | ') + ')');
  const kRows = await s.$$eval('[data-act="stadmin"]', els => els.map(e => e.getAttribute('data-val') + ':' + e.querySelector('.st-sub').textContent));
  ok(['kitchen-home:secs', 'kitchen-home:see', 'kitchen-home:badges'].every(v => kRows.includes(v + ':Changed in Admin, Kitchen, Overview')), 'Settings sends sections, pages staff see and top tickers to Kitchen, Overview (' + kRows.join(' | ') + ')');
  await s.click('[data-act="stadmin"][data-val="kitchen-home:badges"]'); await L.settle(s, 900);
  ok(await s.evaluate(() => location.hash === '#/admin' && LK_PREP.state.atab === 'kitchen-home' && !!document.querySelector('#k-b-badges [data-a="badges"]')), 'Settings opens Kitchen, Overview with Weekly top tickers open');
  const kt = await s.evaluate(() => document.getElementById('k-h-badges').getBoundingClientRect().top);
  ok(kt >= 0 && kt < 900 - 160, 'Settings: the open row is in view (' + Math.round(kt) + ')');
  await s.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
