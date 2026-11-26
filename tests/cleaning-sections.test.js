// Section cleaning (25 Nov 2026): the head chef's own jobs for each section, loaded by a chef, each to a kitchen section,
// and the words that say how often a job comes round. Synthetic kitchen sections and people on the Firebase stand-in.
const L = require('./lib');
const schedule = require('../js/cleaning-schedule');
const { R, ok } = L.results();
const DAY = 86400000, OPEN = 253402178400000;
const MON = Date.parse('2026-11-30T04:00:00Z');   // Monday 30 November 2026, 14:00 in the kitchen
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const id = code => 'clean-template-' + code;
const at = day => Date.parse(day + 'T00:00:00+10:00');
const all = () => schedule.drafts().concat(schedule.packDownDrafts(), schedule.sectionDrafts());
// "Hot Larder" is spelt with a capital L here and no section is called "Fryers, salads and dessert": the Load panel
// offers the section with the same name whatever its capitals, and leaves the other group on Shared kitchen
const SECS = [['grill', 'Grill'], ['pans', 'Pans'], ['fryers', 'Fryers'], ['salads', 'Salads and dessert'], ['hl', 'Hot Larder']];
const sections = (list = SECS) => ({
  ...Object.fromEntries(list.map(([sec, name]) => [key('sections', sec), { name, uses: 5, hidden: false }])),
  [key('config', 'main')]: { ...L.seed()[key('config', 'main')], kitSecs: list.map(([sec, name]) => ({ id: sec, name })) }
});
// a task as the import writes it: section is a kitchen section id, or '' for a shared one
function task(code, section, changes = {}) {
  const draft = all().find(t => t.plan.template === code), sec = SECS.find(s => s[0] === section);
  return { ...draft, section: sec ? sec[0] : '', sectionName: sec ? sec[1] : '', shared: !sec, root: id(code), prev: '', next: '',
    from: at('2026-11-01'), until: OPEN, at: MON - 20 * DAY, by: 'sam', ...changes };
}
const loaded = (list, changes = {}) => ({ ...sections(), ...Object.fromEntries(list.map(([code, section, more]) => [key('cleaningTasks', id(code)), task(code, section, more)])), ...changes });
const records = (p, collection) => p.evaluate(name => Object.entries(__fake.dump()).filter(([k]) => k.includes('/' + name + '/')).map(([path, data]) => ({ path, ...data })), collection);
const listed = p => L.waitFor(p, () => { const page = document.querySelector('.cln-page'); return !!page && !/Loading cleaning/.test(page.textContent); });
// the cook picked a section at the start of shift, so Your section today stays away
// L.open runs these in the page, so each names its section itself
const pickedGrill = () => { const d = new Date(Date.now() + 36e5 * 10).toISOString().slice(0, 10); localStorage.setItem('lk.sec.ann', JSON.stringify({ d, sec: 'grill', name: 'Grill', self: true, at: Date.now() })); };
const pickedSalads = () => { const d = new Date(Date.now() + 36e5 * 10).toISOString().slice(0, 10); localStorage.setItem('lk.sec.ann', JSON.stringify({ d, sec: 'salads', name: 'Salads and dessert', self: true, at: Date.now() })); };
const pickedPans = () => { const d = new Date(Date.now() + 36e5 * 10).toISOString().slice(0, 10); localStorage.setItem('lk.sec.ann', JSON.stringify({ d, sec: 'pans', name: 'Pans', self: true, at: Date.now() })); };
// a shared kitchen screen's own record, set to a section (js/device.js)
const screen = sec => ({ v: 2, mode: 'shared', ownerId: '', ...(sec ? { sec } : {}) });
// the page's titles and headings, top to bottom
const outline = p => p.$$eval('.cln-body .cln-mine-title > span, .cln-body .cln-mine-title > small, .cln-body .cln-rest-title, .cln-body .cln-packdown-title, .cln-body .nb-hd > span:first-child', es => es.map(e => e.textContent.trim()).join('|'));
const rowsIn = (p, sel) => p.$$eval(sel + ' .cln-row', es => es.map(e => e.getAttribute('data-id').replace('clean-template-', '')).join(','));
const row = code => '.cln-row[data-id="' + id(code) + '"]';
const meta = (p, code) => p.locator(row(code) + ' .nb-meta').innerText();

(async () => {
  // ---- the list itself, no browser ----
  const drafts = schedule.sectionDrafts(), codes = drafts.map(t => t.plan.template);
  ok(drafts.length === 21 && new Set(codes).size === 21 && codes.every(c => /^sc-(grill|pans|fry|hot|gen)-\d\d$/.test(c)), 'data: 21 section jobs with their own stable ids');
  ok(schedule.templates.length === 26 && schedule.packDown.length === 25 && !schedule.drafts().concat(schedule.packDownDrafts()).some(t => /^sc-/.test(t.plan.template)), 'data: the general list and Pack down are untouched');
  ok(drafts.every(t => !t.plan.checks.length && !t.plan.verification && t.plan.timing === 'daily'), 'data: every job is one tap, with no check list and no Pass check');
  ok(drafts.every(t => t.dows.length >= 1 && t.shared === true && t.section === ''), 'data: every draft has a day and no section until a chef chooses one');
  const monthly = drafts.filter(t => t.plan.repeat);
  ok(monthly.length === 3 && monthly.every(t => t.plan.repeat.days === 28 && t.plan.repeat.anchor === '' && t.dows.length === 7), 'data: three monthly jobs repeat every 28 days and wait for a first date');
  const byGroup = g => drafts.filter(t => schedule.sectionGroupOf(t) === g).length;
  ok(schedule.sectionGroups.map(g => g.id + byGroup(g.id)).join(',') === 'grill3,pans3,fry5,hot7' && byGroup('') === 3, 'data: Grill 3, Pans 3, Fryers with salads and dessert 5, Hot larder 7, shared 3');
  const two = drafts.filter(t => t.plan.review);
  ok(two.length === 2 && two.every(t => schedule.sectionGroupOf(t) === '' && / and /.test(t.plan.responsibility)), 'data: a job the list gives to two sections is one shared job that names both, with a note');
  const days = [1, 2, 3, 4, 5, 6, 0].map(d => drafts.filter(t => !t.plan.repeat && t.dows.includes(d)).length);
  ok(days.join(',') === '6,7,5,6,3,3,6', 'data: Monday to Sunday the list adds 6,7,5,6,3,3,6 jobs, three of them every day (' + days.join(',') + ')');
  ok(!/\u2014|Australian Venue|\bAVC\b/.test(JSON.stringify(drafts)) && drafts.every(t => t.text.length <= 160 && t.area.length <= 80 && t.plan.method.length <= 1000 && t.plan.review.length <= 500), 'data: plain words within the saved sizes');
  drafts[0].text = 'Changed'; drafts[0].dows.push(9);
  ok(schedule.sectionDrafts()[0].text === 'Clean the drawers' && schedule.sectionDrafts()[0].dows.length === 1, 'data: editing a draft cannot change the built-in list');

  const b = await L.start(); let p;
  async function step(label, run) {
    try { await run(); }
    catch (e) { ok(false, label + ': ' + String(e.stack || e).split('\n').slice(0, 2).join(' ')); }
    finally { if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }

  await step('a chef loads the list and chooses the sections', async () => {
    p = await L.open(b, '#/cleaning', { who: 'sam', wait: 1000, clock: MON, extra: sections() });
    await listed(p);
    ok((await records(p, 'cleaningTasks')).length === 0, 'load: opening Cleaning never adds the section jobs by itself');
    await p.locator('[data-cln="setup"]').first().click(); await p.click('.cln-section-import summary');
    const offered = await p.$$eval('[data-cln-import-section]', es => es.map(e => e.getAttribute('data-cln-import-section') + '=' + e.value).join(','));
    ok(offered === 'grill=grill,pans=pans,fry=_shared,hot=hl', 'load: the section with the same name is offered, and a group with none stays on Shared kitchen (' + offered + ')');
    // the book's own picker stands in for the select (docs/adaptive-controls.md)
    await L.pick(p, '[data-cln-import-section="fry"]', 'fryers');
    ok(await p.inputValue('[data-cln-import-section="fry"]') === 'fryers' && await p.inputValue('[data-cln-import-section="hot"]') === 'hl', 'load: a chosen section stays chosen, and the others stay as offered');
    await p.click('[data-cln="import-section"]');
    await L.waitFor(p, () => Object.keys(__fake.dump()).filter(k => k.includes('/cleaningTasks/')).length === 21 && !LK_PREP.unsent());
    await L.waitFor(p, () => /Loaded section cleaning: 21 added, 0 already present/.test((document.querySelector('.cln-section-import') || {}).textContent || ''));
    const said = await p.locator('.cln-section-import .lk-stamp').innerText();
    ok(/3 repeat jobs need a first date in Repeat tasks/i.test(said), 'load: the panel says what it added and that three jobs wait for a first date');
    const saved = await records(p, 'cleaningTasks'), find = code => saved.find(t => t.plan.template === code);
    ok(find('sc-grill-01').section === 'grill' && find('sc-grill-01').sectionName === 'Grill' && find('sc-grill-01').shared === false, 'load: a Grill job is saved to the Grill section by its id');
    ok(find('sc-fry-03').section === 'fryers' && find('sc-hot-05').section === 'hl' && find('sc-hot-05').sectionName === 'Hot Larder', 'load: the chosen section is saved for Fryers and Hot larder');
    ok(['sc-gen-01', 'sc-gen-02', 'sc-gen-03'].every(code => find(code).shared === true && find(code).section === ''), 'load: the three shared jobs stay under Shared kitchen');
    ok(saved.every(t => t.path.endsWith('/' + id(t.plan.template)) && t.by === 'sam' && t.until === OPEN && t.from === at('2026-11-30')), 'load: each job has its own stable document and starts today');
    ok((await records(p, 'cleaningDone')).length === 0, 'load: loading records no cleaning');
    const again = await p.evaluate(() => LK_PREP.cleaning().importTasks(LK_CLEANING_SCHEDULE.sectionDrafts()));
    ok(again.imported === 0 && again.skipped === 21 && (await records(p, 'cleaningTasks')).length === 21, 'load: loading again adds nothing and keeps the sections a chef chose');

    // the monthly jobs wait for a first date, and the page says so
    const notice = p.locator('.cln-plan .cln-first-date');
    ok(/3 repeat jobs need a first date/.test(await notice.innerText()) && await notice.locator('[data-cln="first-date"]').count() === 3, 'first date: Repeat tasks lists the three jobs that are not due yet');
    const due = await p.evaluate(code => { const C = LK_PREP.cleaning(), t = Object.values(__fake.dump()).find(x => x.plan && x.plan.template === code); return [C.due(t, '2026-11-30'), C.due(t, '2026-12-28')]; }, 'sc-grill-02');
    ok(!due[0] && !due[1], 'first date: a monthly job with no first date is never due');
    await notice.locator('[data-cln="first-date"][data-id="' + id('sc-grill-02') + '"]').click();
    ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'cln-repeat-anchor') && await p.inputValue('#cln-repeat-days') === '28', 'first date: the job opens in the editor on its first date, repeating every 28 days');
    await p.fill('#cln-repeat-anchor', '2026-12-07'); await p.click('[data-cln="save"]');
    await L.waitFor(p, () => Object.values(__fake.dump()).some(t => t.plan && t.plan.template === 'sc-grill-02' && t.plan.repeat.anchor === '2026-12-07') && !LK_PREP.unsent());
    await L.waitFor(p, () => /2 repeat jobs need a first date/.test((document.querySelector('.cln-plan .cln-first-date') || {}).textContent || ''));
    const dated = await p.evaluate(() => { const C = LK_PREP.cleaning(), t = Object.values(__fake.dump()).find(x => x.plan && x.plan.template === 'sc-grill-02' && x.plan.repeat.anchor); return [C.due(t, '2026-12-07'), C.due(t, '2026-12-08'), C.due(t, '2027-01-04')]; });
    ok(dated[0] && !dated[1] && dated[2], 'first date: with a date set the job is due that day and every 28 days after');
    await p.click('[data-cln="today"]'); await listed(p);
    ok(/2 repeat jobs need a first date/.test(await p.locator('.cln-first-date').first().innerText()), 'first date: the chef also sees the count on Today');
  });

  for (const width of [390, 768, 1280]) await step('a cook reads the day at ' + width, async () => {
    // Salads and dessert has no cleaning list here, so the page keeps its usual order (the section first layout is below)
    p = await L.open(b, '#/cleaning', { who: 'ann', width, wait: 1000, clock: MON, init: pickedSalads, extra: loaded([
      ['c01'], ['c15'], ['pd-grill-01'], ['pd-grill-04'],
      ['sc-grill-01', 'grill'], ['sc-grill-02', 'grill', { plan: { ...task('sc-grill-02').plan, repeat: { days: 28, anchor: '2026-11-02' } } }],
      ['sc-pans-01', 'pans'], ['sc-pans-02', 'pans'], ['sc-pans-03', 'pans'], ['sc-fry-02', 'fryers'], ['sc-hot-01', 'hl'], ['sc-gen-01'], ['sc-gen-03']]) });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 10);
    const heads = await p.$$eval('.cln-body .nb-hd > span:first-child, .cln-packdown-title', es => es.map(e => e.textContent.trim()));
    ok(heads.join('|') === 'Fryers: section clean|Grill: section clean|Hot Larder: section clean|Pans: section clean|Shared kitchen|Pack down|Grill', width + ': each section has its own section clean heading, apart from its Pack down (' + heads.join('|') + ')');
    ok(await p.locator(row('sc-pans-02')).count() === 0 && await p.locator(row('sc-pans-03')).count() === 0 && await p.locator(row('sc-gen-01')).count() === 0, width + ': a Tuesday job, a Wednesday job and a monthly job with no first date are not on Monday');
    ok(/^Every Monday · /.test(await meta(p, 'sc-grill-01')) && /^Every 4 weeks · /.test(await meta(p, 'sc-grill-02')) && /^Mon, Wed, Fri · /.test(await meta(p, 'c15')), width + ': a job that is not nightly says how often before anything else');
    // design M (26 Nov 2026): a row does not repeat the section its heading says; a shared job keeps its place
    ok(await meta(p, 'sc-pans-01') === 'To do' && await meta(p, 'pd-grill-04') === 'To do' && await meta(p, 'sc-gen-03') === 'Sauces · Everyone · To do', width + ': a nightly job says only what its heading does not (' + await meta(p, 'pd-grill-04') + ')');
    ok(/To do$/.test(await meta(p, 'sc-grill-01')) && /To do$/.test(await meta(p, 'c15')), width + ': the state is still the last words on the line');
    const cut = await p.$$eval('.cln-row .nb-meta.cln-often', es => es.filter(e => e.scrollWidth > e.clientWidth + 1).length);
    ok(cut === 0 && await p.locator('.cln-row .nb-meta.cln-often').count() === 5, width + ': no line that says how often is cut off');
    ok(!(await L.overflow(p)), width + ': no sideways scroll');
    const targets = await p.$$eval('.cln-row button', es => es.filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
    ok(targets.length >= 10 && targets.every(r => r.w >= 44 && r.h >= 44), width + ': every row control is at least 44 px');
    if (width !== 390) return;

    // one tap, and the same tap undoes it
    const box = '[data-cln="flow-quick"][data-id="' + id('sc-grill-01') + '"]';
    ok(await p.getAttribute(box, 'aria-pressed') === 'false', 'tick: a section job has a one-tap box');
    const before = await p.locator(row('sc-grill-01')).boundingBox();
    await p.click(box);
    await L.waitFor(p, () => Object.values(__fake.dump()).some(r => r.task === 'clean-template-sc-grill-01' && r.day === '2026-11-30' && r.done) && !LK_PREP.unsent());
    await L.waitFor(p, sel => { const r = document.querySelector(sel); return !!r && r.classList.contains('is-done') && !r.classList.contains('is-pending'); }, row('sc-grill-01'));
    const done = (await records(p, 'cleaningDone')).filter(r => r.task === id('sc-grill-01'));
    ok(done.length === 1 && done[0].doneById === 'ann' && done[0].flow && done[0].flow.slot === 'daily', 'tick: one tap records the job done by the cook');
    ok(/^Every Monday · /.test(await meta(p, 'sc-grill-01')) && /Ann · \d\d:\d\d$/.test(await meta(p, 'sc-grill-01')), 'tick: the line now ends with who and when (' + await meta(p, 'sc-grill-01') + ')');
    const after = await p.locator(row('sc-grill-01')).boundingBox();
    ok(Math.abs(after.height - before.height) < 1 && Math.abs(after.y - before.y) < 1, 'tick: the row does not move or change height when ticked');
    ok(/^1 of \d+\s+done today/.test(await p.locator('.cln-progress').innerText()), 'tick: the page count goes up by one, in words (' + await p.locator('.cln-progress').innerText() + ')');
    await p.click(box);
    await L.waitFor(p, () => Object.values(__fake.dump()).some(r => r.task === 'clean-template-sc-grill-01' && r.done === false) && !LK_PREP.unsent());
    await L.waitFor(p, sel => { const r = document.querySelector(sel); return !!r && !r.classList.contains('is-done') && !r.classList.contains('is-pending'); }, row('sc-grill-01'));
    ok(/To do$/.test(await meta(p, 'sc-grill-01')), 'tick: the same tap undoes it within the two minutes');

    // the words open the job: a method only where the head chef gave one
    await p.click('[data-cln="details"][data-id="' + id('sc-grill-01') + '"].cln-task-detail');
    const plain = await p.locator(row('sc-grill-01') + ' + .cln-detail, #cln-detail-2026-11-30_' + id('sc-grill-01')).first().innerText();
    ok(!/Method/.test(plain) && /Responsible:\s*Grill/.test(plain), 'details: a job with no method shows who is responsible and no empty Method heading');
    await p.click('[data-cln="details"][data-id="' + id('sc-fry-02') + '"].cln-task-detail');
    const how = await p.locator('#cln-detail-2026-11-30_' + id('sc-fry-02')).innerText();
    ok(/Method/.test(how) && /takeaway containers/.test(how), 'details: a job with a method shows it');
  });


  // ---- step 2: the page opens on your section ----
  const dated = { plan: { ...task('sc-grill-02').plan, repeat: { days: 28, anchor: '2026-11-02' } } };
  const whole = [['c01'], ['c15'], ['pd-hot-01'], ['pd-grill-01'], ['pd-grill-04'], ['pd-pans-01'],
    ['sc-grill-01', 'grill'], ['sc-grill-02', 'grill', dated], ['sc-grill-03', 'grill'],
    ['sc-pans-01', 'pans'], ['sc-pans-02', 'pans'], ['sc-hot-01', 'hl'], ['sc-fry-02', 'fryers'], ['sc-gen-03']];
  for (const width of [390, 768, 1280]) await step('your section first at ' + width, async () => {
    p = await L.open(b, '#/cleaning', { who: 'ann', width, wait: 1000, clock: MON, init: pickedGrill, extra: loaded(whole) });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 13);
    const said = await outline(p);
    ok(said === 'Grill|Your section today|Section clean|Pack down|Shared kitchen|Rest of the kitchen|Hot Larder: section clean|Hot larder: pack down|Pans: pack down|Fryers: section clean', width + ': the cook\'s section leads, Shared kitchen follows, then the rest, nothing folded (' + said + ')');
    ok(await rowsIn(p, '.cln-mine section:not([data-cln-packdown-group])') === 'sc-grill-01,sc-grill-02', width + ': Section clean holds the jobs that come round');
    ok(await rowsIn(p, '.cln-mine [data-cln-packdown-group="Grill"]') === 'pd-grill-01,pd-grill-04,sc-grill-03', width + ': the section\'s nightly job follows its numbered Pack down steps');
    ok(await rowsIn(p, '.cln-others > [data-cln-packdown-group="Pans"]') === 'pd-pans-01,sc-pans-01', width + ': the same rule for another section: the kick oven door after the Pans steps');
    ok(/Overhead shelves and frames first\. Floors are last\./.test(await p.locator('.cln-mine [data-cln-packdown-group="Grill"] .hint').innerText()), width + ': the floor reminder stays with the leading Pack down');
    ok(await p.locator('.cln-body [hidden], .cln-body details').count() === 0 && await p.locator('.cln-row').count() === 13, width + ': all 13 jobs are on the page, none behind a tap');
    ok(!(await L.overflow(p)) && await p.$$eval('.cln-row .nb-meta.cln-often', es => es.filter(e => e.scrollWidth > e.clientWidth + 1).length) === 0, width + ': no sideways scroll and no line that says how often cut off');
    const targets = await p.$$eval('.cln-row button', es => es.filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height }; }));
    ok(targets.every(r => r.w >= 44 && r.h >= 44), width + ': every row control is at least 44 px');
    // design M (head chef, 26 Nov 2026, docs/cleaning-look-options/brief.md): the frame above the jobs is cut
    const frame = await p.evaluate(() => {
      const count = document.querySelector('.cln-progress'), mine = document.querySelector('.cln-mine'), temp = document.querySelector('.cln-mine .cln-temp-line');
      const shared = [...document.querySelectorAll('.cln-others > section')].find(s => /^Shared kitchen/.test(s.querySelector('.nb-hd').textContent));
      return { count: count.innerText.replace(/\s+/g, ' ').trim(), handwritten: count.classList.contains('nb-prog'), toggle: !!document.querySelector('[data-cln="temperature"]'),
        temp: temp ? temp.textContent : '', tempLast: !!temp && mine.lastElementChild === temp, topHint: /Record every/.test((document.querySelector('.cln-coverage') || {}).textContent || ''),
        sharedHint: shared ? [...shared.querySelectorAll(':scope > .hint')].map(h => h.textContent).join('') : '', groupCount: (document.querySelector('.cln-mine .cln-group-count') || {}).textContent || '' };
    });
    ok(/^Grill: 0 of \d+ 0 of \d+ in the kitchen$/.test(frame.count) && !frame.handwritten, width + ': the count is the cook\'s section first, in plain ink, the kitchen\'s under it (' + frame.count + ')');
    ok(!frame.toggle && frame.temp === 'Temperature logs must be completed first thing in the morning and before dinner service. Record them in the venue\'s temperature log.' && frame.tempLast, width + ': the temperature reminder is in full after the cook\'s own jobs, not a link above them');
    ok(!frame.topHint && (!frame.sharedHint || /^Jobs after each service, prep or use: record each one\./.test(frame.sharedHint)), width + ': no repeats hint above the jobs; where there is one, it sits under Shared kitchen in plain words (' + frame.sharedHint + ')');
    ok(/^\d+ of \d+$/.test(frame.groupCount), width + ': a group\'s count is in words (' + frame.groupCount + ')');
    if (width !== 390) return;

    // Go to Pack down lands on the leading section's Pack down
    await p.click('[data-cln="pack-down-jump"]');
    ok(await p.evaluate(() => { const e = document.activeElement; return !!e && e.id === 'cln-packdown-2026-11-30' && !!e.closest('.cln-mine') && /Pack down/.test(e.textContent); }), 'jump: Go to Pack down moves to the leading section\'s Pack down heading');

    // a tick inside the leading section: one tap, and nothing on the page moves
    // where a row sits on the page itself, so a scroll does not count as a move
    const place = code => p.$eval(row(code), e => { const r = e.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), height: Math.round(r.height) }; });
    const first = await place('sc-grill-01'), before = await place('sc-grill-03');
    await p.click('[data-cln="flow-quick"][data-id="' + id('sc-grill-03') + '"]');
    await L.waitFor(p, () => Object.values(__fake.dump()).some(r => r.task === 'clean-template-sc-grill-03' && r.done) && !LK_PREP.unsent());
    await L.waitFor(p, sel => { const r = document.querySelector(sel); return !!r && r.classList.contains('is-done') && !r.classList.contains('is-pending'); }, row('sc-grill-03'));
    const after = await place('sc-grill-03'), firstAfter = await place('sc-grill-01'), saidAfter = await outline(p);
    ok(after.y === before.y && after.height === before.height && firstAfter.y === first.y && saidAfter === said, 'tick: one tap in the leading section, and no row or heading moves (' + JSON.stringify([before, after, first, firstAfter]) + (saidAfter === said ? '' : ' ' + saidAfter) + ')');

    // moved to another section mid-shift: the page keeps its order until it is read again
    await p.evaluate(() => { const v = JSON.parse(localStorage.getItem('lk.sec.ann')); localStorage.setItem('lk.sec.ann', JSON.stringify({ ...v, sec: 'pans', name: 'Pans', at: Date.now() })); });
    await p.click('[data-cln="details"][data-id="' + id('c01') + '"].cln-task-detail');
    ok(await outline(p) === said, 'moved: a redraw does not reorder the page under the cook');
    await p.click('[data-cln="refresh"]');
    await L.waitFor(p, () => { const t = document.querySelector('.cln-mine-title > span'); return !!t && t.textContent === 'Pans' && !/Loading cleaning/.test(document.querySelector('.cln-page').textContent); });
    const moved = await outline(p);
    ok(moved === 'Pans|Your section today|Pack down|Shared kitchen|Rest of the kitchen|Hot Larder: section clean|Hot larder: pack down|Grill: section clean|Grill: pack down|Fryers: section clean', 'moved: Refresh opens the page on the new section (' + moved + ')');
  });

  await step('the section arrives after the list is read', async () => {
    // no pick yet: the book asks Your section today over the page, and the answer brings the section to the top at once
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1000, clock: MON, extra: loaded(whole) });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 13);
    await L.waitFor(p, () => !!document.querySelector('.ks-wrap, .ux-section-picker'));
    let said = await outline(p);
    ok(/^Fryers: section clean\|Grill: section clean/.test(said) && !(await p.locator('.cln-mine').count()), 'no section yet: the page keeps its usual order while the book asks (' + said + ')');
    await p.locator('.ks-wrap [data-ks="grill"], .ux-section-picker [data-ks="grill"], .ux-picker-option:has-text("Grill")').first().click();
    await L.waitFor(p, () => { const t = document.querySelector('.cln-mine-title > span'); return !!t && t.textContent === 'Grill'; });
    said = await outline(p);
    ok(/^Grill\|Your section today\|Section clean\|Pack down\|Shared kitchen/.test(said), 'answered: the page opens on the chosen section without Refresh (' + said + ')');
    await p.context().close();

    // rostered: Today's team has the cook on Grill for lunch, so nobody is asked and Grill leads
    const cfgKey = key('config', 'main'), rostered = loaded(whole);
    rostered[cfgKey] = { ...rostered[cfgKey], kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320, off: false }] };
    rostered[key('team', '2026-11-30')] = { day: '2026-11-30', on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'dinner', sec: 'pans' }], br: [], v: 1, at: MON - 3600000, upd: MON - 3600000, by: 'sam' };
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1500, clock: MON, extra: rostered });
    await listed(p);
    await L.waitFor(p, () => { const t = document.querySelector('.cln-mine-title > span'); return !!t && t.textContent === 'Grill'; });
    said = await outline(p);
    ok(/^Grill\|Your section today\|Section clean\|Pack down\|Shared kitchen/.test(said) && !(await p.locator('.ks-wrap').count()), 'rostered: the section from Today\'s team leads, and the cook is not asked (' + said + ')');
  });

  await step('a Pack down is tied only by the section a chef chose', async () => {
    // one Grill job moved to another section: Grill's Pack down is tied to no section and stays with the rest
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1000, clock: MON, init: pickedGrill, extra: loaded([['c01'], ['pd-grill-01'], ['sc-grill-01', 'grill'], ['sc-grill-03', 'pans']]) });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 4);
    let said = await outline(p);
    ok(said === 'Grill|Your section today|Section clean|Shared kitchen|Rest of the kitchen|Grill: pack down|Pans: section clean', 'one job moved: the section still leads with its own jobs, and its Pack down is not claimed (' + said + ')');
    ok(await rowsIn(p, '[data-cln-packdown-group="Grill"]') === 'pd-grill-01' && await rowsIn(p, '.cln-others > section:last-child') === 'sc-grill-03', 'one job moved: a nightly job stays under its own section when no Pack down is tied to it');
    await p.context().close();

    // the group left on Shared kitchen: nothing is tied, so the page keeps its usual order for a Grill cook too
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1000, clock: MON, init: pickedGrill, extra: loaded([['c01'], ['pd-grill-01'], ['sc-grill-01'], ['sc-grill-03']]) });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 4);
    said = await outline(p);
    ok(said === 'Shared kitchen|Pack down|Grill', 'left on Shared kitchen: no section leads and Pack down stays where it was (' + said + ')');
    await p.context().close();

    // a renamed section: the link is the section's id, so the new name leads with its Pack down
    const renamed = SECS.map(([sec, name]) => [sec, sec === 'grill' ? 'Char grill' : name]);
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1000, clock: MON, init: pickedGrill, extra: { ...loaded([['c01'], ['pd-grill-01'], ['sc-grill-01', 'grill'], ['sc-grill-03', 'grill']]), ...sections(renamed) } });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 4);
    said = await outline(p);
    ok(said === 'Char grill|Your section today|Section clean|Pack down|Shared kitchen', 'renamed: the section leads under its name now, with its Pack down (' + said + ')');
    await p.context().close();

    // a section taken off the kitchen's list: its jobs tie nothing
    const removed = SECS.filter(([sec]) => sec !== 'grill');
    p = await L.open(b, '#/cleaning', { who: 'sam', wait: 1000, clock: MON, extra: { ...loaded([['c01'], ['pd-grill-01'], ['pd-pans-01'], ['sc-grill-01', 'grill'], ['sc-pans-01', 'pans']]), ...sections(removed) } });
    await listed(p);
    await p.locator('[data-cln="setup"]').first().click(); await p.click('.cln-section-import summary');
    const links = await p.locator('.cln-pack-links').innerText();
    ok(/Grill pack down is not tied to a section/.test(links) && /Pans pack down opens with Pans/.test(links) && /Hot larder pack down is not tied to a section/.test(links), 'setup: Repeat tasks says which section each Pack down opens with, and which is not tied (' + links + ')');
  });

  await step('design M: the repeats hint sits under Shared kitchen', async () => {
    // a job recorded after each use (c16) is on the day: the plain hint goes with Shared kitchen, not above the jobs
    p = await L.open(b, '#/cleaning', { who: 'ann', width: 390, wait: 1000, clock: MON, init: pickedGrill, extra: loaded(whole.concat([['c16']])) });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 14);
    const at = await p.evaluate(() => { const shared = [...document.querySelectorAll('.cln-others > section')].find(s => /^Shared kitchen/.test(s.querySelector('.nb-hd').textContent)); const hint = shared && shared.querySelector(':scope > .hint'); return { hint: hint ? hint.textContent : '', top: /Record every/.test((document.querySelector('.cln-coverage') || {}).textContent || ''), count: (shared.querySelector('.cln-group-count') || {}).textContent }; });
    ok(at.hint === 'Jobs after each service, prep or use: record each one. The count only knows the ones recorded.' && !at.top, 'repeats: the hint is one plain line under Shared kitchen, none above the jobs');
    ok(/^\d+ of \d+$/.test(at.count), 'repeats: Shared kitchen counts in words, without "+ repeats" beside the hint (' + at.count + ')');
  });

  await step('design M on a phone still holding the older saved stylesheet', async () => {
    // the page is lazy and can be newer than the saved css/app.css (sw.js): without the new rules it must still read and fit
    p = await L.open(b, '#/cleaning', { who: 'ann', width: 390, wait: 1000, clock: MON, deviceMode: 'shared', profile: screen('grill'), init: pickedPans, extra: loaded(whole) });
    await listed(p); await L.waitFor(p, () => !!document.querySelector('.cln-you'));
    await p.evaluate(() => { for (const sheet of document.styleSheets) { let rules; try { rules = sheet.cssRules; } catch (e) { continue; } for (let i = rules.length - 1; i >= 0; i--) if (/\.cln-(count|you|temp-line)|is-screen/.test(rules[i].cssText)) sheet.deleteRule(i); } });
    await L.settle(p, 200);
    const old = await p.evaluate(() => { const b = document.querySelector('.cln-you .btn').getBoundingClientRect(); return { h: b.height, band: document.querySelector('.cln-you b').textContent, temp: !!document.querySelector('.cln-temp-line').textContent }; });
    ok(!(await L.overflow(p)) && old.h >= 44 && /^You: Pans/.test(old.band) && old.temp, 'old stylesheet: the band, its 44 px link and the temperature words still show, with no sideways scroll (' + Math.round(old.h) + ' px)');
  });

  await step('design M step 2: two columns on a section screen', async () => {
    // a 1920 x 1080 touch station screen set to Grill, Ann on Pans: the screen's section left, the rest of the kitchen right
    p = await L.open(b, '#/cleaning', { who: 'ann', width: 1920, height: 1080, touch: true, wait: 1000, clock: MON, deviceMode: 'shared', profile: screen('grill'), init: pickedPans, extra: loaded(whole) });
    await listed(p); await L.waitFor(p, () => !!document.querySelector('.cln-split .cln-you'));
    const wide = await p.evaluate(() => { const m = document.querySelector('.cln-split > .cln-mine').getBoundingClientRect(), o = document.querySelector('.cln-split > .cln-others').getBoundingClientRect(), page = document.querySelector('.page').getBoundingClientRect();
      return { side: o.left > m.right && Math.abs(o.top - m.top) < 40, page: Math.round(page.width), rows: [...document.querySelectorAll('.cln-row')].filter(r => { const b = r.getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight; }).length }; });
    ok(wide.side && wide.page > 1700 && !(await L.overflow(p)), 'wide: the screen\'s section and the rest sit side by side across the screen (' + wide.page + ' px)');
    ok(wide.rows === 13, 'wide: every job of the day is in view on one 1920 x 1080 screen (' + wide.rows + ' of 13)');
    ok(await outline(p) === 'This screen: Grill|Section clean|Pack down|Shared kitchen|Rest of the kitchen|Hot Larder: section clean|Hot larder: pack down|Pans: pack down|Fryers: section clean', 'wide: the order is the same as on a phone');
    // the band's link lands on Pans pack down in the right column; a tick there through Who did this moves nothing
    await p.click('.cln-you [data-cln="pack-down-jump"]');
    ok(await p.evaluate(() => /Pans: pack down/.test(document.activeElement.textContent) && !!document.activeElement.closest('.cln-others')), 'wide: Go to Pans pack down lands on Pans pack down in the right column');
    const pans = id('sc-pans-01'), y = () => p.evaluate(() => [...document.querySelectorAll('.nb-box')].map(b => Math.round(b.getBoundingClientRect().top + scrollY)).join(','));
    const before = await y();
    await p.evaluate(() => { __fake.mode = 'hold'; });
    const box = '[data-cln="flow-quick"][data-id="' + pans + '"], [data-cln="tick"][data-id="' + pans + '"]';
    await p.click(box);
    await L.waitFor(p, () => !!document.querySelector('#cln-worker-sheet [data-cln-person], #cln-worker-sheet [data-cln-picker="others"]'));
    await p.evaluate(sel => document.querySelector(sel).click(), box);   // a second tap while the sheet is open
    ok(await p.locator('#cln-worker-sheet').count() === 1, 'double tap: one Who did this, not two');
    if (await p.locator('[data-cln-picker="others"]').count() && await p.locator('[data-cln-picker="others"]').isVisible()) await p.click('[data-cln-picker="others"]');
    await p.click('[data-cln-person="ann"]');
    await L.waitFor(p, () => !!document.querySelector('.cln-row.is-pending'));   // held: Not sent, not Saved
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });   // the signal comes back, the held tick is sent
    await L.waitFor(p, () => !LK_PREP.unsent());
    const done = Object.values(await p.evaluate(() => __fake.dump())).filter(r => r.task === 'clean-template-sc-pans-01' && r.done);
    // a held write, once sent, makes the page read the day again: wait for the list to be back
    await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 13 && !!document.querySelector('.cln-you') && !document.querySelector('.cln-row.is-pending'));
    ok(done.length === 1 && await y() === before, 'double tap: one record, and no box moved on the page (' + done.length + ')');
    const counts = await p.evaluate(() => ({ band: document.querySelector('.cln-you b').textContent, heading: document.querySelector('[data-cln-packdown-group="Pans"] .cln-group-count').textContent }));
    ok(counts.band.endsWith(counts.heading) && /1 of/.test(counts.heading), 'wide: the band and the Pans heading show the same count (' + counts.band + ' / ' + counts.heading + ')');
    await p.context().close();
    // only a cook's Cleaning page widens: another page at 1920 keeps the book's width
    p = await L.open(b, '#/prep', { who: 'ann', width: 1920, height: 1080, wait: 1000, clock: MON });
    await L.settle(p, 400);
    ok(await p.evaluate(() => Math.round(document.querySelector('.page').getBoundingClientRect().width)) <= 1240, 'wide: Prep at 1920 keeps the book\'s width');
    await p.context().close();
    // a phone keeps one column: the cook's section above the rest
    p = await L.open(b, '#/cleaning', { who: 'ann', width: 390, wait: 1000, clock: MON, init: pickedGrill, extra: loaded(whole) });
    await listed(p); await L.waitFor(p, () => !!document.querySelector('.cln-split'));
    ok(await p.evaluate(() => document.querySelector('.cln-others').getBoundingClientRect().top > document.querySelector('.cln-mine').getBoundingClientRect().bottom - 1), 'phone: one column, the cook\'s section first');
  });

  // ---- step 3: a shared kitchen screen set to a section ----
  await step('a station screen opens on its own section', async () => {
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1000, clock: MON, deviceMode: 'shared', profile: screen('grill'), init: pickedPans, extra: loaded(whole) });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 13);
    const said = await outline(p);
    ok(said === 'This screen: Grill|Section clean|Pack down|Shared kitchen|Rest of the kitchen|Hot Larder: section clean|Hot larder: pack down|Pans: pack down|Fryers: section clean', 'station: the screen\'s section leads whoever signs in, and says so (' + said + ')');
    ok(await p.locator('.cln-row').count() === 13 && await p.locator('.cln-body [hidden], .cln-body details').count() === 0, 'station: the rest of the kitchen is open below, nothing behind a tap');
    ok(await p.locator('[data-cln="pack-down-jump"]').innerText() === 'Go to Pans pack down', 'station: the link names the cook\'s own Pack down');
    await p.click('[data-cln="pack-down-jump"]');
    ok(await p.evaluate(() => { const e = document.activeElement; return !!e && e.id === 'cln-packdown-2026-11-30' && /Pans: pack down/.test(e.textContent); }), 'station: Go to Pans pack down moves to the cook\'s own Pack down');
    ok(!(await L.overflow(p)), 'station: no sideways scroll at 390 px');
    ok(await p.evaluate(() => !localStorage.getItem('lk.sec.ann') || JSON.parse(localStorage.getItem('lk.sec.ann')).sec === 'pans') && (await records(p, 'shifts')).length === 0, 'station: the cook\'s own section is untouched and no shift record is written');

    // one tick through Who did this, as on every shared screen
    const before = await outline(p);
    await p.click('[data-cln="flow-quick"][data-id="' + id('sc-grill-03') + '"]');
    await L.waitFor(p, () => !!document.querySelector('#cln-worker-sheet [data-cln-person], #cln-worker-sheet [data-cln-picker="others"]'));
    if (await p.locator('[data-cln-picker="others"]').count() && await p.locator('[data-cln-picker="others"]').isVisible()) await p.click('[data-cln-picker="others"]');
    await p.click('[data-cln-person="ann"]');
    await L.waitFor(p, () => Object.values(__fake.dump()).some(r => r.task === 'clean-template-sc-grill-03' && r.done && r.workerId === 'ann') && !LK_PREP.unsent());
    ok(await outline(p) === before, 'station: a tick asks who did it, records them, and nothing reorders');
  });

  await step('a station screen and the cook\'s own section', async () => {
    // nobody picked yet: the screen leads; the answer changes the words and the link, never the order
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1000, clock: MON, deviceMode: 'shared', profile: screen('grill'), extra: loaded(whole) });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 13);
    await L.waitFor(p, () => !!document.querySelector('.ks-wrap, .ux-section-picker'));
    let said = await outline(p);
    ok(/^This screen: Grill\|Section clean\|Pack down\|Shared kitchen/.test(said) && !(await p.locator('.cln-you').count()) && await p.locator('[data-cln="pack-down-jump"]').innerText() === 'Go to Pack down', 'no pick yet: the screen\'s section leads and the link is the plain one (' + said + ')');
    await p.locator('.ks-wrap [data-ks="pans"], .ux-section-picker [data-ks="pans"], .ux-picker-option:has-text("Pans")').first().click();
    await L.waitFor(p, () => /^You: Pans/.test((document.querySelector('.cln-you b') || {}).textContent || ''));
    const answered = await outline(p), band = await p.locator('.cln-you b').innerText();
    ok(answered === said && /^You: Pans, pack down 0 of \d+$/.test(band) && await p.locator('[data-cln="pack-down-jump"]').count() === 1 && await p.locator('.cln-you [data-cln="pack-down-jump"]').innerText() === 'Go to Pans pack down', 'answered: a band names the cook\'s section, its count and the one link; the order does not change (' + band + ')');
    // the cook moves to another section later: the words and the link follow, and still nothing reorders
    await p.evaluate(() => { const v = JSON.parse(localStorage.getItem('lk.sec.ann')); localStorage.setItem('lk.sec.ann', JSON.stringify({ ...v, sec: 'hl', name: 'Hot Larder', at: Date.now() })); });
    await p.click('[data-cln="details"][data-id="' + id('c01') + '"].cln-task-detail');
    const later = await outline(p);
    ok(later === said && /^You: Hot Larder/.test(await p.locator('.cln-you b').innerText()) && await p.locator('[data-cln="pack-down-jump"]').innerText() === 'Go to Hot larder pack down', 'moved later: the words and the link name the section now, the order holds (' + later + ')');
    // the screen's section is taken off the kitchen's list while the page is open: the cook's own section leads
    const cfgKey = key('config', 'main');
    await p.evaluate(k => { const c = __fake.dump()[k]; __fake.write(k, { ...c, kitSecs: c.kitSecs.filter(x => x.id !== 'grill') }); }, cfgKey);
    await L.waitFor(p, () => { const t = document.querySelector('.cln-mine-title > span'); return !!t && t.textContent === 'Pans'; });
    const gone = await outline(p);
    ok(/^Pans\|Your section today\|/.test(gone), 'removed while open: the cook\'s own section leads without Refresh (' + gone + ')');
    await p.context().close();

    // the link names the Pack down group it goes to, whatever the section is called now
    const saute = SECS.map(([sec, name]) => [sec, sec === 'pans' ? 'A much longer name for the saute and stove section' : name]);
    p = await L.open(b, '#/cleaning', { who: 'ann', width: 360, wait: 1000, clock: MON, deviceMode: 'shared', profile: screen('grill'), init: pickedPans, extra: { ...loaded(whole), ...sections(saute) } });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 13);
    ok(await p.locator('[data-cln="pack-down-jump"]').innerText() === 'Go to Pans pack down' && /Pans: pack down/.test(await outline(p)) && !(await L.overflow(p)), 'renamed long: the link is the Pack down group\'s own short name, matches its heading, and fits a 360 px phone');
    ok(await p.$eval('.cln-readline', e => e.scrollWidth <= e.clientWidth + 1), 'renamed long: the line with the check time and the links does not run over');
    await p.context().close();

    // the screen is set to a section with no cleaning today: the cook's own section leads, as on a screen with none set
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1000, clock: MON, deviceMode: 'shared', profile: screen('salads'), init: pickedPans, extra: loaded(whole) });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 13);
    said = await outline(p);
    ok(/^Pans\|Your section today\|Pack down\|Shared kitchen/.test(said), 'no cleaning for the screen\'s section: the cook\'s own section leads (' + said + ')');
    await p.context().close();

    // renamed: the screen keeps its section by id and shows the name now
    const renamed = SECS.map(([sec, name]) => [sec, sec === 'grill' ? 'Char grill' : name]);
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1000, clock: MON, deviceMode: 'shared', profile: screen('grill'), init: pickedPans, extra: { ...loaded(whole), ...sections(renamed) } });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 13);
    said = await outline(p);
    ok(/^This screen: Char grill\|Section clean\|Pack down/.test(said) && /^You: Pans/.test(await p.locator('.cln-you b').innerText()), 'renamed: the screen\'s section leads under its name now (' + said + ')');
    await p.context().close();

    // taken off the kitchen's list: the screen has no section, so the cook's own leads
    const removed = SECS.filter(([sec]) => sec !== 'grill');
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1000, clock: MON, deviceMode: 'shared', profile: screen('grill'), init: pickedPans, extra: { ...loaded(whole), ...sections(removed) } });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 13);
    said = await outline(p);
    ok(/^Pans\|Your section today\|/.test(said), 'removed: a section no longer on the list leads nothing (' + said + ')');
    await p.context().close();

    // a personal device never follows a screen's section, even with one in its record
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1000, clock: MON, profile: { v: 2, mode: 'personal', ownerId: 'ann', sec: 'grill' }, init: pickedPans, extra: loaded(whole) });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 13);
    said = await outline(p);
    ok(/^Pans\|Your section today\|/.test(said) && await p.evaluate(() => LK_DEVICE.section() === '' && LK_DEVICE.setSection('grill') === false), 'personal device: the person\'s own section leads, and a screen\'s section cannot be set (' + said + ')');
    await p.context().close();

    // the longest names on the title line of a phone
    const long = SECS.map(([sec, name]) => [sec, sec === 'fryers' ? 'Fryers, salads and dessert' : name]);
    p = await L.open(b, '#/cleaning', { who: 'ann', width: 390, wait: 1000, clock: MON, deviceMode: 'shared', profile: screen('fryers'), init: pickedSalads, extra: { ...loaded(whole), ...sections(long) } });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 13);
    const title = await p.$eval('.cln-mine-title', e => ({ text: e.textContent, cut: e.scrollWidth > e.clientWidth + 1, wide: e.getBoundingClientRect().right > innerWidth }));
    const you = await p.$eval('.cln-you', e => ({ text: e.textContent, cut: e.scrollWidth > e.clientWidth + 1, wide: e.getBoundingClientRect().right > innerWidth }));
    ok(/This screen: Fryers, salads and dessert/.test(title.text) && /^You: Salads and dessert/.test(you.text) && !title.cut && !title.wide && !you.cut && !you.wide && !(await L.overflow(p)), 'long names: the title and the band wrap and nothing runs off a 390 px phone (' + you.text + ')');
  });

  await step('the head chef sets this screen\'s section in Settings', async () => {
    p = await L.open(b, '#/settings', { admin: true, deviceMode: 'shared', wait: 1800, extra: sections() });
    await L.waitFor(p, () => !!document.querySelector('[data-row="screensec"]'), null, 10000);
    const val = () => p.$eval('[data-row="screensec"] .st-v', e => e.textContent);
    ok(await val() === 'None', 'settings: a shared kitchen screen shows This screen\'s section, None at first');
    await p.click('[data-row="screensec"] .st-btn');
    const chips = await p.$$eval('[data-row="screensec"] .chip', es => es.map(e => e.textContent + (e.getAttribute('aria-pressed') === 'true' ? '*' : '')).join('|'));
    ok(chips === 'No section*|Grill|Pans|Fryers|Salads and dessert|Hot Larder', 'settings: the head chef has a chip for each kitchen section (' + chips + ')');
    ok(/A head or sous chef's own view does not change/.test(await p.locator('[data-row="screensec"] .st-body').innerText()), 'settings: the row says whose page changes');
    const signedIn = await p.evaluate(() => ({ who: LK_PREP.state.who, authed: LK_PREP.state.authed }));
    await p.evaluate(() => { __fake.bill = []; __fake.ruleBill = []; __fake.writes = []; });
    await p.click('[data-row="screensec"] [data-act="setscreensec"][data-val="grill"]');
    await L.waitFor(p, () => (document.querySelector('[data-row="screensec"] .st-v') || {}).textContent === 'Grill');
    const after = await p.evaluate(() => ({ who: LK_PREP.state.who, authed: LK_PREP.state.authed, profile: JSON.parse(localStorage.getItem('lk.device.v2')), reads: (__fake.bill || []).length + (__fake.ruleBill || []).length, writes: (__fake.writes || []).length, pressed: [...document.querySelectorAll('[data-row="screensec"] .chip[aria-pressed="true"]')].map(e => e.textContent).join(',') }));
    ok(after.profile.sec === 'grill' && after.profile.mode === 'shared' && after.pressed === 'Grill', 'settings: one tap saves the section on this screen and the chip shows it');
    ok(after.who === signedIn.who && after.authed === signedIn.authed && after.reads === 0 && after.writes === 0, 'settings: nobody is signed out, and the change costs no read and no write (' + after.reads + ' reads, ' + after.writes + ' writes)');
    await p.click('[data-row="screensec"] [data-act="setscreensec"][data-val=""]');
    await L.waitFor(p, () => (document.querySelector('[data-row="screensec"] .st-v') || {}).textContent === 'None');
    ok(await p.evaluate(() => !('sec' in JSON.parse(localStorage.getItem('lk.device.v2')))), 'settings: No section clears it');
    ok(await p.evaluate(() => { LK_DEVICE.setSection('grill'); LK_DEVICE.reset(); return localStorage.getItem('lk.device.v2') === null && LK_DEVICE.section() === ''; }), 'settings: Forget this device forgets the section with the device');
    await p.context().close();

    // the head chef comes back to a screen that already has a section, and changes it
    p = await L.open(b, '#/settings', { admin: true, deviceMode: 'shared', profile: screen('grill'), wait: 1800, extra: sections() });
    await L.waitFor(p, () => !!document.querySelector('[data-row="screensec"]'), null, 10000);
    ok(await val() === 'Grill', 'settings: a screen already set shows its section to the head chef');
    await p.click('[data-row="screensec"] .st-btn');
    ok(await p.$$eval('[data-row="screensec"] .chip[aria-pressed="true"]', es => es.map(e => e.textContent).join(',')) === 'Grill', 'settings: its chip is the pressed one');
    await p.click('[data-row="screensec"] [data-act="setscreensec"][data-val="pans"]');
    await L.waitFor(p, () => (document.querySelector('[data-row="screensec"] .st-v') || {}).textContent === 'Pans');
    ok(await p.evaluate(() => JSON.parse(localStorage.getItem('lk.device.v2')).sec === 'pans' && !!LK_PREP.state.who), 'settings: the head chef changes it to another section and stays signed in');
    ok(await p.evaluate(() => LK_PREP.setScreenSection('not-a-section') === 'gone' && JSON.parse(localStorage.getItem('lk.device.v2')).sec === 'pans'), 'settings: a section that is not on the kitchen\'s list is refused as gone, and the saved one stays');
    // another tab on this device changes only the section: Cleaning is told, and the access listeners stay asleep
    const heard = await p.evaluate(() => { const got = []; ['lk-device', 'lk-device-section'].forEach(n => window.addEventListener(n, () => got.push(n))); const was = localStorage.getItem('lk.device.v2'), next = JSON.stringify({ ...JSON.parse(was), sec: 'grill' }); window.dispatchEvent(new StorageEvent('storage', { key: 'lk.device.v2', oldValue: was, newValue: next })); window.dispatchEvent(new StorageEvent('storage', { key: 'lk.device.v2', oldValue: was, newValue: JSON.stringify({ ...JSON.parse(was), mode: 'personal' }) })); return got.join(','); });
    ok(heard === 'lk-device-section,lk-device', 'another tab: a change of the section alone is not an access change; a change of device type still is (' + heard + ')');
    await p.context().close();

    // a cook on the same kind of screen reads it and cannot change it
    p = await L.open(b, '#/settings', { who: 'ann', deviceMode: 'shared', profile: screen('grill'), wait: 1800, init: pickedPans, extra: sections() });
    await L.waitFor(p, () => !!document.querySelector('[data-row="screensec"]'), null, 10000);
    await p.click('[data-row="screensec"] .st-btn');
    ok(await val() === 'Grill' && await p.locator('[data-row="screensec"] .chip').count() === 0 && /The head chef can change this after signing in/.test(await p.locator('[data-row="screensec"] .st-body').innerText()), 'settings: a cook sees the section and cannot change it');
    ok(await p.evaluate(() => LK_PREP.setScreenSection('pans') === 'locked' && JSON.parse(localStorage.getItem('lk.device.v2')).sec === 'grill'), 'settings: the book refuses a change from anyone but the head chef, and says why');
    await p.context().close();

    // a personal device has no such row
    p = await L.open(b, '#/settings', { who: 'ann', wait: 1800, init: pickedPans, extra: sections() });
    await L.waitFor(p, () => !!document.querySelector('[data-row="device"]'), null, 10000);
    ok(await p.locator('[data-row="screensec"]').count() === 0, 'settings: a personal device has no screen section row');
  });

  await step('a held save says Not sent', async () => {
    p = await L.open(b, '#/cleaning', { who: 'ann', wait: 1000, clock: MON, init: pickedGrill, extra: loaded([['sc-grill-01', 'grill']]) });
    await listed(p); await L.waitFor(p, () => document.querySelectorAll('.cln-row').length === 1);
    await p.evaluate(() => { __fake.mode = 'hold'; });
    await p.click('[data-cln="flow-quick"][data-id="' + id('sc-grill-01') + '"]');
    await L.waitFor(p, sel => { const r = document.querySelector(sel); return !!r && r.classList.contains('is-pending'); }, row('sc-grill-01'));
    const held = await meta(p, 'sc-grill-01');
    ok(/^Every Monday · /.test(held) && !/Ann · \d\d:\d\d$/.test(held), 'held save: the line keeps how often and does not say done (' + held + ')');
    ok(await p.evaluate(() => !!LK_PREP.unsent()) && await p.getAttribute('[data-cln="flow-quick"][data-id="' + id('sc-grill-01') + '"]', 'aria-busy') === 'true', 'held save: the tick is waiting to send and the box says so');
  });

  await step('a chef sees the section jobs in General cleaning', async () => {
    p = await L.open(b, '#/cleaning', { who: 'sam', wait: 1000, clock: MON, extra: loaded([['c01'], ['pd-grill-01'], ['sc-grill-01', 'grill'], ['sc-hot-01', 'hl']]) });
    await listed(p);
    const groups = await p.$$eval('[data-cln="group"]', es => es.map(e => e.getAttribute('data-group')).join(','));
    ok(groups === 'general,grill', 'chef: the five work groups are unchanged; section jobs sit in General cleaning (' + groups + ')');
    await p.click('[data-cln="group"][data-group="general"]');
    ok(await p.locator('[data-cln-group="general"] ' + row('sc-grill-01')).count() === 1 && /^Every Monday · Grill · Grill · /.test(await meta(p, 'sc-grill-01')), 'chef: the row says how often, the area and its section');
    await p.locator('[data-cln="setup"]').first().click();
    await p.fill('#cln-repeat-search', 'drawers');
    await p.click('[data-cln="edit"][data-id="' + id('sc-grill-01') + '"]');
    ok(await p.inputValue('#cln-section') === 'grill' && await p.locator('[data-cln="dow"][aria-pressed="true"], .cln-repeat [aria-pressed="true"]').count() === 1, 'chef: a loaded job opens in the same editor, with its section and its day');
  });

  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
