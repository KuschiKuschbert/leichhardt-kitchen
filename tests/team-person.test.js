// A page for each person (5 Nov 2026, admin pages step 5, docs/admin-pages-options/brief.md): opened from the team list,
// it shows what the person may do (read only: changes stay in the list and its Save), their activity over the shared
// report period, counted like the Team report. Part 2 (their saved assessments) was retired on 10 Nov 2026; the
// test keeps saved assessments in the data to prove the page no longer shows or reads them. Example data only.
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
// part 2: two saved assessments for Sam (the newer first) and one for Ann
extra[fsKey(['training', 'ai-sam-larder'])] = { personId: 'sam', section: 'Larder', recipeId: '', guideId: '', status: 'confirmed', assessorId: 'ann', day: ago(2), v: 1, at: L.NOW - 2 * 86400000, by: 'owner' };
extra[fsKey(['training', 'ai-sam-grill'])] = { personId: 'sam', section: 'Grill', recipeId: '', guideId: '', status: 'in-training', assessorId: 'ann', day: ago(9), v: 1, at: L.NOW - 9 * 86400000, by: 'owner' };
extra[fsKey(['training', 'ai-ann-larder'])] = { personId: 'ann', section: 'Larder', recipeId: '', guideId: '', status: 'confirmed', assessorId: 'sam', day: ago(4), v: 1, at: L.NOW - 4 * 86400000, by: 'owner' };
// Shifts by section (14 Nov 2026): the nightly shift counts, as on Who has worked where. Sam had 22 Larder and 8 Grill
// shifts in the last 30 days, Ann 30 on Grill, Bo none.
const SECS = [{ id: 'larder', name: 'Larder', off: false }, { id: 'grill', name: 'Grill', off: false }];
const CFG = fsKey(['config', 'main']);
extra[CFG] = Object.assign({}, L.seed()[CFG], { kitSecs: SECS });
const tsum = to => { const days = []; for (let i = 1; i <= 30; i++) days.push({ day: ago(i), s: [{ p: 'sam', sec: i % 4 === 1 ? 'Grill' : 'Larder', sh: 'lunch' }, { p: 'ann', sec: 'Grill', sh: 'lunch' }] }); return { v: 1, at: L.NOW - 11 * 3600000, day: ago(0), from: ago(30), to: ago(to), days, usual: {}, learn: {} }; };
extra[fsKey(['teamsum', 'main'])] = tsum(1);
const shiftLine = p => p.evaluate(() => { const e = [...document.querySelectorAll('.a-personpage p')].filter(x => /shift/i.test(x.textContent))[0]; return e ? { t: e.textContent, err: e.classList.contains('p-err') } : null; });
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
    ok(/Ticks and shifts record activity\. They do not confirm skill\./.test(page), width + ': the page says ticks and shifts are activity, not skill');
    const sl = await shiftLine(p);
    ok(sl && /^Shifts by section: Larder 22, Grill 8\. Counted to [^.]+\.$/.test(sl.t) && !sl.err, width + ': Sam\'s shifts by section, most first, and the day they are counted to (' + (sl && sl.t) + ')');
    // part 2 retired 10 Nov 2026: the page shows no assessments, though Sam has saved ones, and reads nothing more
    await L.settle(p, 600);
    ok(await p.locator('.a-pp-assess, [data-p="a-person-assess"]').count() === 0 && !/Assessments/.test(await L.txt(p, '.a-personpage') || ''), width + ': Sam\'s page shows no assessments block');
    const extraReads = await p.evaluate(b => window.__fake.reads.slice(b), before);
    ok(!extraReads.some(r => /training/.test(r)), width + ': the person page reads no assessments (' + extraReads.join(', ') + ')');
    ok(await p.locator('.a-personpage input, .a-personpage select, .a-personpage [data-a]').count() === 0, width + ': nothing on the page changes what Sam may do: that stays in the team list');
    ok(!await L.overflow(p), width + ': no sideways scroll on the person page');
    await L.adminTab(p, 'people'); await L.settle(p, 300);
    await L.tap(p, '[data-p="a-person"][data-id="sam"]'); await L.settle(p, 400);
    // the top bar's Back goes back to the list, and so does changing page
    await p.click('.wtop [data-act="back"]'); await L.settle(p, 300);
    ok(await p.evaluate(() => !LK_PREP.state.personId) && await p.locator('[data-p="a-person"][data-id="sam"]').count() === 1, width + ': Back returns to all people');
    await L.tap(p, '[data-p="a-person"][data-id="ann"]'); await L.settle(p, 300);
    await L.adminTab(p, 'insights'); await L.settle(p, 300);
    await L.adminTab(p, 'people'); await L.settle(p, 300);
    ok(await p.locator('.a-personpage').count() === 0 && await p.locator('[data-p="a-person"][data-id="ann"]').count() === 1, width + ': changing page closes the person, so People opens on the list');
    // an unsaved change in the list keeps its Save bar on a person's page
    await p.evaluate(() => { const c = document.querySelector('[data-a="perm"][data-perm="del"][data-i="1"]'); if (c) c.click(); });
    await L.settle(p, 300);
    await L.tap(p, '[data-p="a-person"][data-id="bo"]'); await L.settle(p, 300);
    ok(await p.locator('[data-p="a-save"]').count() === 1, width + ': an unsaved change in the list keeps its Save bar on the person page');
    const bo = await L.txt(p, '.a-personpage') || '';
    ok(/No lines written or ticked off in the last 30 days/.test(bo), width + ': a person with nothing in the period says so in words (' + bo.slice(0, 160) + ')');
    ok(/No shifts on a section in the last 30 days\./.test(bo), width + ': a person with no shifts says so, with no count of 0');
    ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // People opened straight away: the counts are read once for the day, and a second person reads nothing more
  let p = await L.open(b, '#/admin', { admin: true, adminPage: 'people', who: '', width: 1280, height: 900, extra, wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('[data-p="a-person"][data-id="sam"]'), null, 8000).catch(() => {});
  await L.tap(p, '[data-p="a-person"][data-id="sam"]');
  await L.waitFor(p, () => /Shifts by section/.test((document.querySelector('.a-personpage') || {}).textContent || ''), null, 8000).catch(() => {});
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  await L.tap(p, '[data-p="a-person"][data-id="ann"]'); await L.settle(p, 500);
  const ann = await shiftLine(p);
  const tsReads = await p.evaluate(() => window.__fake.reads.filter(r => /\/teamsum\/main$/.test(r)).length);
  ok(ann && /^Shifts by section: Grill 30\./.test(ann.t), 'people first: Ann\'s 30 Grill shifts (' + (ann && ann.t) + ')');
  ok(tsReads === 1, 'people first: the shift counts are read once for both pages (' + tsReads + ')');
  ok(p.errors.length === 0, 'people first: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the counts did not load: said in red, never as no shifts
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'people', who: '', width: 390, height: 844, extra, wait: 2000, failReads: '/teamsum/main' });
  await L.waitFor(p, () => !!document.querySelector('[data-p="a-person"][data-id="sam"]'), null, 8000).catch(() => {});
  await L.tap(p, '[data-p="a-person"][data-id="sam"]');
  await L.waitFor(p, () => /shift counts/.test((document.querySelector('.a-personpage') || {}).textContent || ''), null, 8000).catch(() => {});
  const failed = await shiftLine(p), fp = await L.txt(p, '.a-personpage') || '';
  ok(failed && failed.err && /Could not load the shift counts\. This does not mean no shifts\./.test(failed.t) && !/No shifts on a section/.test(fp), 'failed: the page says the counts did not load, in red, and never no shifts (' + (failed && failed.t) + ')');
  ok(p.errors.length === 0, 'failed: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the nightly run is late: the line says how many days are missing
  const late = Object.assign({}, extra, { [fsKey(['teamsum', 'main'])]: tsum(3) });
  p = await L.open(b, '#/admin', { admin: true, adminPage: 'people', who: '', width: 1280, height: 900, extra: late, wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('[data-p="a-person"][data-id="sam"]'), null, 8000).catch(() => {});
  await L.tap(p, '[data-p="a-person"][data-id="sam"]');
  await L.waitFor(p, () => /Shifts by section/.test((document.querySelector('.a-personpage') || {}).textContent || ''), null, 8000).catch(() => {});
  const old = await shiftLine(p);
  ok(old && /Counted to [A-Z][a-z]{2}, \d+ [A-Z][a-z]{2}, the last 2 days missing\.$/.test(old.t), 'late: the line says the last 2 days are missing (' + (old && old.t) + ')');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
