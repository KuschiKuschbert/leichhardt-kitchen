// A held picker keeps its own date, person and service when the page redraws under it. Rows on one clock (16 Nov 2026):
// each row control's key names its person and service (tm-sec:ID:SH, tm-addsvc:ID) and carries the date it was drawn
// for. One break per person (17 Nov 2026, docs/team-one-break-options/brief.md): a break picker's key names the person
// and the break's start when drawn (tm-bat:ID:AT:N, tm-blen:ID:AT:N) with the date, so a choice held while that break
// moves or goes, or the old per-service keys (tm-at:ID:SH:N), can never land on another person, break or date.
// Every person, time and Firebase record here is synthetic. The server belongs to this test only.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
// A Tuesday keeps both dates visible while a picker from the first date is held open.
const clock = Date.parse('2026-11-17T04:00:00Z');
const today = L.ymd(new Date(clock)), tomorrow = L.ymd(new Date(clock + 86400000)), CFG = key('config', 'main'), TEAM = key('team', today);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true },
  { id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true }
];
const fixture = overlap => ({
  [CFG]: { people, staffIds: ['sam', 'ann', 'bo'], sousIds: ['sam'],
    kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }],
    kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: overlap ? 1320 : 900 },
      { id: 'dinner', name: 'Dinner', from: overlap ? 600 : 960, to: 1320 }] },
  [TEAM]: { day: today, on: [{ id: 'sam', sh: 'lunch', sec: 'pans' },
    { id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'dinner', sec: 'pans' },
    { id: 'bo', sh: 'dinner', sec: 'grill' }],
  br: [{ id: 'ann', sh: 'lunch', at: 825, len: 45 }, { id: 'ann', sh: 'dinner', at: 1140, len: 30 }],
  v: 1, at: clock - 3600000, upd: clock - 3600000, by: 'sam' }
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const read = p => p.evaluate(k => __fake.dump()[k], TEAM);
const field = (p, name) => p.locator('select[data-k="' + name + '"]');
const value = (p, name) => p.evaluate(k => { const e = document.querySelector('select[data-k="' + k + '"]'); return e ? e.value : null; }, name);
const saveOff = p => p.locator('[data-p="tm-save"]').isDisabled();
const click = async (p, selector) => { await p.locator(selector).click(); await L.settle(p, 150); };
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:ann:lunch"]'), null, 7000); }
async function open(browser, base, options) {
  const p = await L.open(browser, '#/team', Object.assign({ base, clock, who: 'sam', width: 1280, extra: fixture(), wait: 900 }, options));
  await ready(p); return p;
}
async function holdPicker(p, name, value) {
  const source = field(p, name);
  const option = await source.evaluate((el, v) => [...el.options].findIndex(o => o.value === v), value);
  if (option < 0) throw new Error('Fixture has no picker option ' + name + ': ' + value);
  await source.locator('xpath=following-sibling::*[1]').click();
  return 'dialog.ux-picker [data-index="' + option + '"]';
}
async function removeLunch(p) {
  await p.evaluate(k => {
    const config = __fake.dump()[k];
    config.kitShifts = config.kitShifts.map(s => s.id === 'lunch' ? Object.assign({}, s, { off: true }) : s);
    __fake.write(k, config);
  }, CFG);
  await L.waitFor(p, () => !document.querySelector('select[data-k="tm-sec:ann:lunch"]') && !!document.querySelector('select[data-k="tm-sec:ann:dinner"]'), null, 7000);
}
async function save(p) {
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => __fake.dump()[k].v === 2 && !/Saving/.test(document.querySelector('[data-p="tm-save"]').textContent), TEAM, 6000);
}
// A change from a picker the page did not draw this way: [key, data-sh (null for none), value, data-day (default: the
// page's; '' for none)]. Each goes in the rows' list, as a held or stray picker would, and is taken out again.
const forge = (p, list) => p.evaluate(list => {
  const root = document.querySelector('.tm-plan'), day = document.querySelector('.tm-notebook').getAttribute('data-day');
  list.forEach(([k, sh, v, d]) => {
    const el = document.createElement('select'), o = document.createElement('option');
    el.setAttribute('data-k', k); if (d !== '') el.setAttribute('data-day', d || day); if (sh !== null) el.setAttribute('data-sh', sh);
    o.value = v; o.textContent = v; o.selected = true; el.appendChild(o);
    root.appendChild(el); el.dispatchEvent(new Event('change', { bubbles: true })); el.remove();
  });
}, list);

(async () => {
  const server = require('./serve').make();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  try {
    browser = await L.start();
    let p = await open(browser, base);
    const beforeSection = await read(p);
    // Each service line's section picker names its own service: tm-sec:<id>:<sh>
    const sectionOption = await holdPicker(p, 'tm-sec:ann:lunch', 'pans');
    ok(/Section for Ann on Lunch/.test(await p.locator('dialog.ux-picker').innerText()), 'held section: picker identifies the original Ann Lunch context');
    await removeLunch(p);
    ok(await field(p, 'tm-sec:ann:dinner').inputValue() === 'pans' && !await field(p, 'tm-sec:ann:lunch').count(), 'configuration change: Ann\'s Lunch line goes and her Dinner section stays');
    if (await p.locator(sectionOption).count()) await p.locator(sectionOption).click();
    await L.settle(p, 180);
    ok(await field(p, 'tm-sec:ann:dinner').inputValue() === 'pans' && await saveOff(p), 'held section: choosing the old Lunch option cannot create a Dinner draft change');
    ok(same(await read(p), beforeSection), 'held section: no acknowledged roster or break changes before Save');
    // A picker keyed the old way (no service in its key), or one whose captured service does not match its key, is
    // refused. This fails on the row-picker code, which took the service from the row's Service to edit.
    await forge(p, [['tm-sec:ann', 'dinner', 'grill'], ['tm-sec:ann:dinner', 'lunch', 'grill'], ['tm-sec:ann:dinner', 'dinner', 'grill', tomorrow]]);
    await L.settle(p, 150);
    ok(await value(p, 'tm-sec:ann:dinner') === 'pans' && await saveOff(p), 'old key: a section picker without its service, with a service that does not match its key, or from another date changes nothing');
    await L.pick(p, 'select[data-k="tm-sec:ann:dinner"]', 'grill'); await save(p);
    const afterSection = await read(p);
    ok(afterSection.on.some(x => x.id === 'ann' && x.sh === 'dinner' && x.sec === 'grill') &&
      afterSection.on.some(x => x.id === 'ann' && x.sh === 'lunch' && x.sec === 'grill') && same(afterSection.br, beforeSection.br),
    'fresh section: the Dinner line changes only Dinner and retains the earlier breaks');
    ok(!p.errors.length, 'held section: no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    // Both services offer 14:00. Option compatibility alone cannot make a picker for a break that has gone safe to rebind:
    // Ann's first break (13:45) is on Lunch, so it goes from view with Lunch; her 2nd break (19:00) stays
    p = await open(browser, base, { extra: fixture(true) });
    const beforeBreak = await read(p), breakOption = await holdPicker(p, 'tm-bat:ann:825:0', '840');
    ok(/Break for Ann/.test(await p.locator('dialog.ux-picker').innerText()), 'held break: the picker names Ann and the break');
    await removeLunch(p);
    ok(!await field(p, 'tm-bat:ann:825:0').count() && await field(p, 'tm-bat:ann:1140:0').inputValue() === '1140', 'configuration change: Ann\'s Lunch line and its break go from view and her 19:00 break shows as saved');
    if (await p.locator(breakOption).count()) await p.locator(breakOption).click();
    await L.settle(p, 180);
    ok(await field(p, 'tm-bat:ann:1140:0').inputValue() === '1140' && await p.locator('select[data-k^="tm-bat:ann:"]').count() === 1 && await saveOff(p),
      'held break: a valid 14:00 option for the break that went cannot move her other break after redraw');
    ok(same(await read(p), beforeBreak), 'held break: the earlier selection writes no acknowledged data');
    // the break keys: the old per-service keys (tm-at, tm-len) and the old details panel's are not read at all; a person
    // break key from another date, without its date, with no break at that start, for a person with no such break, or
    // with a length that is not one of the book's, changes nothing
    await forge(p, [['tm-at:ann:0', 'dinner', '1155'], ['tm-at:ann:dinner:0', 'dinner', '1155'], ['tm-at:ann:dinner:0', null, '1155'], ['tm-len:ann:dinner:0', 'dinner', '45'],
      ['tm-bat:ann:1140:0', null, '1155', tomorrow], ['tm-bat:ann:1140:0', null, '1155', ''], ['tm-bat:ann:1141:0', null, '1155'], ['tm-bat:ann:1140:1', null, '1155'], ['tm-bat:bo:1140:0', null, '1155'],
      ['tm-blen:ann:1140:0', null, '45', tomorrow], ['tm-blen:ann:1140:0', null, '50'], ['tm-blen:bo:1140:0', null, '45']]);
    await L.settle(p, 150);
    ok(await value(p, 'tm-bat:ann:1140:0') === '1140' && await value(p, 'tm-blen:ann:1140:0') === '30' && !await p.locator('select[data-k^="tm-bat:bo:"]').count() && await saveOff(p),
      'old key: an old per-service break key, or a person break key from another date, without its date, for a break or person that is not there, or with no such length, changes nothing');
    await L.pick(p, 'select[data-k="tm-bat:ann:1140:0"]', '1155'); await save(p);
    const afterBreak = await read(p);
    ok(afterBreak.br.some(x => x.id === 'ann' && x.sh === 'lunch' && x.at === 825 && x.len === 45) &&
      afterBreak.br.some(x => x.id === 'ann' && x.sh === 'dinner' && x.at === 1155 && x.len === 30) && afterBreak.br.length === 2,
    'fresh break: the 19:00 picker saves only that break, on the service that holds it, and keeps the hidden Lunch break');
    ok(!p.errors.length, 'held break: no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    // A picker held open while its own break is moved by another change (here its time, through the same break's
    // picker on the page, as a second chef's tap or a stray picker would): the held choice finds no break with the
    // start it was drawn for, so it is refused. Nothing changes and no other break is written.
    p = await open(browser, base);
    const beforeMove = await read(p), moveOption = await holdPicker(p, 'tm-bat:ann:1140:0', '1200');
    ok(/2nd break for Ann/.test(await p.locator('dialog.ux-picker').innerText()), 'held moved break: the picker names Ann\'s 2nd break');
    await p.evaluate(() => { const s = document.querySelector('select[data-k="tm-bat:ann:1140:0"]'); s.value = '1155'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-bat:ann:1155:0"]'), null, 4000);
    if (await p.locator(moveOption).count()) await p.locator(moveOption).click();
    await L.settle(p, 200);
    const movedBreaks = await p.locator('select[data-k^="tm-bat:"]').evaluateAll(l => l.map(e => e.dataset.k + '=' + e.value));
    ok(same(movedBreaks, ['tm-bat:ann:825:0=825', 'tm-bat:ann:1155:0=1155']) && same(await read(p), beforeMove),
      'held moved break: the 20:00 held for Ann\'s 2nd break at 19:00 is refused once it moved to 19:15; her first break and everyone else are as they were (' + movedBreaks.join(', ') + ')');
    ok(!p.errors.length, 'held moved break: no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    // The same break saved for one person on two services (an older plan could hold it so) is one break: one picker,
    // and the plan reads as it was saved, so Save stays off and nothing is written
    const twice = fixture();
    twice[TEAM].br = [{ id: 'ann', sh: 'lunch', at: 840, len: 30 }, { id: 'ann', sh: 'dinner', at: 840, len: 30 }];
    p = await open(browser, base, { extra: twice });
    const twiceWrites = await p.evaluate(() => __fake.writes.length);
    ok(await p.locator('select[data-k^="tm-bat:ann:"]').count() === 1 && await value(p, 'tm-bat:ann:840:0') === '840' && await p.locator('.tm-tlrow[data-id="ann"] .tm-brline [data-p="tm-addbr"]').count() === 1,
      'same break twice: Ann\'s 14:00 break saved on Lunch and on Dinner shows as one break picker, with + 2nd break');
    ok(await saveOff(p) && await p.evaluate(n => __fake.writes.length === n, twiceWrites) && same(await read(p), twice[TEAM]) && /Break 14:00 to 14:30/.test(await p.locator('.tm-tlrow[data-id="ann"] .tm-roster-time').innerText()),
      'same break twice: the plan reads as unchanged; Save is off and no draft is written');
    ok(!p.errors.length, 'same break twice: no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    // Add a service is held open while the chef's date moves on: today's choice reaches neither tomorrow nor today.
    // Tomorrow has the same plan, so Bo's Add a service there offers Lunch too: only the date tells them apart.
    const twoDays = fixture();
    twoDays[key('team', tomorrow)] = Object.assign({}, twoDays[TEAM], { day: tomorrow });
    p = await open(browser, base, { extra: twoDays });
    if (!await p.locator('.tm-weeknav').isVisible()) await click(p, '[data-p="tm-date-toggle"]');
    ok(await p.locator('.tm-notebook').getAttribute('data-day') === today && await field(p, 'tm-addsvc:bo').getAttribute('data-day') === today,
      'Add a service: Bo\'s picker carries the date it was drawn for');
    ok(same(await field(p, 'tm-addsvc:bo').evaluate(e => [...e.options].map(o => o.value)), ['', 'lunch']), 'Add a service: Bo is offered only the service he is not on');
    const beforeAdd = await read(p), addOption = await holdPicker(p, 'tm-addsvc:bo', 'lunch');
    ok(/Add a service for Bo/.test(await p.locator('dialog.ux-picker').innerText()), 'held Add a service: the picker names Bo');
    await p.evaluate(d => document.querySelector('[data-p="tm-day"][data-day="' + d + '"]').click(), tomorrow);
    await L.waitFor(p, d => (document.querySelector('.tm-notebook') || {}).getAttribute && document.querySelector('.tm-notebook').getAttribute('data-day') === d, tomorrow, 7000);
    await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-addsvc:bo"]'), null, 7000);
    ok(await field(p, 'tm-addsvc:bo').getAttribute('data-day') === tomorrow && await field(p, 'tm-addsvc:bo').evaluate(e => [...e.options].some(o => o.value === 'lunch')), 'tomorrow: Bo\'s own Add a service offers Lunch, drawn for tomorrow');
    if (await p.locator(addOption).count()) await p.locator(addOption).click();
    await L.settle(p, 250);
    ok(!await field(p, 'tm-sec:bo:lunch').count() && await p.locator('.tm-tlrow').count() === 3 && await saveOff(p), 'held Add a service: today\'s choice does not put Bo on tomorrow\'s Lunch');
    await L.teamDay(p, today); await ready(p);
    ok(!await field(p, 'tm-sec:bo:lunch').count() && await saveOff(p) && same(await read(p), beforeAdd), 'held Add a service: nor on today once the date has moved');
    // stray Add a service changes: another date, a person not on the list, a service that is not set up, one already worked
    await forge(p, [['tm-addsvc:bo', null, 'lunch', tomorrow], ['tm-addsvc:zed', null, 'lunch'], ['tm-addsvc:bo', null, 'nope'], ['tm-addsvc:ann', null, 'dinner'], ['tm-sec:bo:dinner', 'dinner', 'pans', tomorrow]]);
    await L.settle(p, 150);
    ok(!await field(p, 'tm-sec:bo:lunch').count() && await value(p, 'tm-sec:bo:dinner') === 'grill' && await p.locator('.tm-tlrow').count() === 3 && await saveOff(p),
      'old key: Add a service from another date, for someone not on the list, for no such service or one already worked changes nothing');
    await L.pick(p, 'select[data-k="tm-addsvc:bo"]', 'lunch');
    ok(await field(p, 'tm-sec:bo:lunch').count() === 1 && /Bo added to Lunch\. Not saved yet\./.test(await L.txt(p, '.tm-focus-save') || ''), 'fresh Add a service: Bo goes on Lunch, said by name');
    await save(p);
    const afterAdd = await read(p);
    ok(afterAdd.on.some(x => x.id === 'bo' && x.sh === 'lunch') && afterAdd.on.filter(x => x.id !== 'bo' || x.sh !== 'lunch').length === beforeAdd.on.length && same(afterAdd.br, beforeAdd.br),
      'fresh Add a service: only Bo\'s Lunch is added; everyone else and the breaks are as they were');
    ok(!p.errors.length, 'held Add a service: no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    const overlap = fixture();
    overlap[CFG].kitShifts.push({ id: 'full', name: 'Full day', from: 600, to: 1320 });
    overlap[TEAM].on.push({ id: 'ann', sh: 'full', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'pans' });
    overlap[TEAM].br = [{ id: 'ann', sh: 'lunch', at: 825, len: 30 }, { id: 'ann', sh: 'full', at: 750, len: 150 },
      { id: 'bo', sh: 'lunch', at: 825, len: 30 }];
    p = await open(browser, base, { extra: overlap });
    const beforeOverlap = await read(p), annWarn = p.locator('.tm-tlrow[data-id="ann"] .tm-overlap-warning');
    // the rows are the whole day (the details panel and Whole day review went, 16 Nov 2026): nothing to open. Since
    // 17 Nov 2026 a person's breaks are their day's, so the words name her, not services
    ok(await annWarn.count() === 1 && await annWarn.isVisible() && /Review overlapping meal breaks or splits for Ann\. Nothing has been changed automatically\./.test(await annWarn.innerText()),
      'overlap review: Ann\'s meal break inside her split is visible in her row without a tap');
    ok(same(await read(p), beforeOverlap) && await saveOff(p),
      'overlap review: showing a warning neither corrects nor saves the plan automatically');
    ok(!await p.locator('.tm-tlrow[data-id="bo"] .tm-overlap-warning').count(), 'different people: Bo\'s simultaneous meal does not create a personal overlap warning');
    const review = await p.locator('.tm-batch .tm-overlap-review').evaluateAll(l => l.map(e => e.textContent).join(' '));
    ok(/Ann/.test(review) && !/for Bo/.test(review), 'tools fold: the day\'s overlap review names Ann, not Bo');
    ok(!p.errors.length, 'overlap review: no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    // The details panel's Close and reopen went with the rows. The focus still lands on the next thing to do, for the
    // same person and service, and the unsaved break is kept until Save. The Take off focus check fails on the 16 Nov
    // build: draw() puts the focus back by data-p and data-id only (guestSel), so it lands on Ann's first service, Lunch.
    // Since 17 Nov 2026 + Break is the person's (Bo, by his name): the focus moves to his new break's time, named for him
    // and the date (its data-sh is empty: no service), and a time picked there changes his break only
    for (const width of [390, 1280]) {
      p = await open(browser, base, { width });
      await p.locator('[data-p="tm-addbr"][data-id="bo"]').focus(); await p.keyboard.press('Enter'); await L.settle(p, 200);
      const boKey = await L.brKey(p, 'bo', 0);
      const focused = await p.evaluate(() => {
        const el = document.activeElement, s = el && (el.matches('select') ? el : el.previousElementSibling);
        return s && s.matches && s.matches('select') ? s.getAttribute('data-k') + ' ' + s.getAttribute('data-day') + ' ' + s.getAttribute('data-sh') : el && [el.tagName, el.getAttribute('data-p'), el.getAttribute('data-id'), el.getAttribute('data-sh')].join(' ');
      });
      ok(/^tm-bat:bo:\d+:0$/.test(boKey) && focused === boKey + ' ' + today + ' ', width + ': keyboard + Break by Bo\'s name puts the focus on his new break\'s time (' + focused + ')');
      await L.pick(p, 'select[data-k="' + boKey + '"]', '1230');
      ok(await value(p, 'tm-bat:bo:1230:0') === '1230' && await value(p, 'tm-bat:ann:1140:0') === '1140' && await value(p, 'tm-bat:ann:825:0') === '825' && !await saveOff(p) && (await read(p)).v === 1,
        width + ': Bo\'s new break holds the time picked, unsaved; Ann\'s breaks are as they were');
      // Take off is armed by person, service and date. The second tap must reach the same button: Enter on Take off
      // Dinner keeps the focus on Ann's armed Dinner button, never her Lunch one.
      const offDinner = '[data-p="tm-off"][data-id="ann"][data-sh="dinner"]';
      await p.locator(offDinner).focus(); await p.keyboard.press('Enter'); await L.settle(p, 200);
      const armedFocus = await p.evaluate(() => { const a = document.activeElement; return [a.getAttribute('data-p'), a.getAttribute('data-id'), a.getAttribute('data-sh'), a.classList.contains('is-armed')].join(' '); });
      ok(armedFocus === 'tm-off ann dinner true', width + ': keyboard Take off Dinner keeps the focus on Ann\'s armed Dinner button (' + armedFocus + ')');
      await p.locator(offDinner).click(); await L.settle(p, 200);
      ok(JSON.stringify(await p.$$eval('.tm-tlrow[data-id="ann"] .tm-tlsvc', l => l.map(e => e.dataset.sh))) === '["lunch"]' && await value(p, 'tm-sec:ann:lunch') === 'grill' && await value(p, 'tm-bat:ann:825:0') === '825' && !await field(p, 'tm-bat:ann:1140:0').count() && await value(p, 'tm-sec:bo:dinner') === 'grill' && await value(p, 'tm-bat:bo:1230:0') === '1230',
        width + ': Take off Dinner takes Ann off Dinner and the break inside it only; her Lunch break and Bo are as they were');
      await p.keyboard.press('Enter'); await L.settle(p, 200);
      ok(await value(p, 'tm-sec:ann:dinner') === 'pans' && await value(p, 'tm-bat:ann:1140:0') === '1140' && await value(p, 'tm-bat:ann:825:0') === '825' && await value(p, 'tm-bat:bo:1230:0') === '1230' && (await read(p)).v === 1,
        width + ': Undo from the keyboard puts back Ann\'s Dinner with its section and its break, unsaved');
      ok(!p.errors.length, width + ': the break and Take off drafts raise no browser errors ' + p.errors.join(' | '));
      await p.context().close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
