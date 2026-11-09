// A held picker keeps its original person/service context when a configuration update redraws the roster.
// Every person, time and Firebase record here is synthetic. The server belongs to this test only.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const today = L.ymd(new Date(L.NOW)), CFG = key('config', 'main'), TEAM = key('team', today);
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
  v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' }
});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const read = p => p.evaluate(k => __fake.dump()[k], TEAM);
const field = (p, name) => p.locator('select[data-k="' + name + '"]');
const click = async (p, selector) => { await p.locator(selector).click(); await L.settle(p, 150); };
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-row-sh:ann"]'), null, 7000); }
async function open(browser, base, options) {
  const p = await L.open(browser, '#/team', Object.assign({ base, who: 'sam', width: 1280, extra: fixture(), wait: 900 }, options));
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
  await L.waitFor(p, () => {
    const service = document.querySelector('select[data-k="tm-row-sh:ann"]');
    return service && service.value === 'dinner';
  }, null, 7000);
}
async function save(p) {
  await click(p, '[data-p="tm-save"]');
  await L.waitFor(p, k => __fake.dump()[k].v === 2 && !/Saving/.test(document.querySelector('[data-p="tm-save"]').textContent), TEAM, 6000);
}

(async () => {
  const server = require('./serve').make();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  try {
    browser = await L.start();
    let p = await open(browser, base);
    const beforeSection = await read(p);
    const sectionOption = await holdPicker(p, 'tm-sec:ann', 'grill');
    ok(/Section for Ann on Lunch/.test(await p.locator('dialog.ux-picker').innerText()), 'held section: picker identifies the original Ann Lunch context');
    await removeLunch(p);
    ok(await field(p, 'tm-row-sh:ann').inputValue() === 'dinner' && await field(p, 'tm-sec:ann').inputValue() === 'pans', 'configuration change: row falls back to Ann\'s existing Dinner section');
    if (await p.locator(sectionOption).count()) await p.locator(sectionOption).click();
    await L.settle(p, 180);
    ok(await field(p, 'tm-sec:ann').inputValue() === 'pans' && await p.locator('[data-p="tm-save"]').isDisabled(), 'held section: choosing the old Lunch option cannot create a Dinner draft change');
    ok(same(await read(p), beforeSection), 'held section: no acknowledged roster or break changes before Save');
    await L.pick(p, 'select[data-k="tm-sec:ann"]', 'grill'); await save(p);
    const afterSection = await read(p);
    ok(afterSection.on.some(x => x.id === 'ann' && x.sh === 'dinner' && x.sec === 'grill') &&
      afterSection.on.some(x => x.id === 'ann' && x.sh === 'lunch' && x.sec === 'grill') && same(afterSection.br, beforeSection.br),
    'fresh section: a new Dinner picker still changes only Dinner and retains the earlier breaks');
    ok(!p.errors.length, 'held section: no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    // Both services offer 14:00. Option compatibility alone cannot make an old service's picker safe to rebind.
    p = await open(browser, base, { extra: fixture(true) });
    await click(p, '[data-p="tm-focus"][data-id="ann"]');
    const beforeBreak = await read(p), breakOption = await holdPicker(p, 'tm-at:ann:0', '840');
    await removeLunch(p);
    ok(await p.locator('.tm-detail-workbench[data-id="ann"]').getAttribute('data-sh') === 'dinner' &&
      await field(p, 'tm-at:ann:0').inputValue() === '1140', 'configuration change: the named editor now shows the existing Dinner break');
    if (await p.locator(breakOption).count()) await p.locator(breakOption).click();
    await L.settle(p, 180);
    ok(await field(p, 'tm-at:ann:0').inputValue() === '1140' && await p.locator('[data-p="tm-save"]').isDisabled(),
      'held break: a valid 14:00 Lunch option cannot replace the Dinner break after redraw');
    ok(same(await read(p), beforeBreak), 'held break: the earlier selection writes no acknowledged data');
    await L.pick(p, 'select[data-k="tm-at:ann:0"]', '1155'); await save(p);
    const afterBreak = await read(p);
    ok(afterBreak.br.some(x => x.id === 'ann' && x.sh === 'lunch' && x.at === 825 && x.len === 45) &&
      afterBreak.br.some(x => x.id === 'ann' && x.sh === 'dinner' && x.at === 1155 && x.len === 30),
    'fresh break: a new Dinner picker saves only the intended service and retains Lunch');
    ok(!p.errors.length, 'held break: no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    const overlap = fixture();
    overlap[CFG].kitShifts.push({ id: 'full', name: 'Full day', from: 600, to: 1320 });
    overlap[TEAM].on.push({ id: 'ann', sh: 'full', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'pans' });
    overlap[TEAM].br = [{ id: 'ann', sh: 'lunch', at: 825, len: 30 }, { id: 'ann', sh: 'full', at: 750, len: 150 },
      { id: 'bo', sh: 'lunch', at: 825, len: 30 }];
    p = await open(browser, base, { extra: overlap });
    const beforeOverlap = await read(p);
    await click(p, '[data-p="tm-focus"][data-id="ann"]');
    ok(await p.locator('.tm-detail-workbench .tm-overlap-warning').isVisible() &&
      /Ann/.test(await p.locator('.tm-detail-workbench .tm-overlap-warning').innerText()),
    'cross-service review: Ann\'s Lunch meal overlapping her Full day split is visible in her details');
    ok(same(await read(p), beforeOverlap) && await p.locator('[data-p="tm-save"]').isDisabled(),
      'cross-service review: showing a warning neither corrects nor saves the plan automatically');
    await L.pick(p, 'select[data-k="tm-row-sh:bo"]', 'lunch'); await click(p, '[data-p="tm-focus"][data-id="bo"]');
    ok(!await p.locator('.tm-detail-workbench .tm-overlap-warning').count(), 'different people: Bo\'s simultaneous meal does not create a personal overlap warning');
    await click(p, '[data-p="tm-whole"]');
    const wholeReview = p.locator('.tm-editor .tm-overlap-review');
    const wholeWarnings = await wholeReview.count() ? await wholeReview.innerText() : '';
    ok(/Ann/.test(wholeWarnings), 'Whole day: the same cross-service overlap remains discoverable without opening a person');
    ok(!p.errors.length, 'overlap review: no browser errors ' + p.errors.join(' | '));
    await p.context().close();

    for (const width of [390, 1280]) {
      p = await open(browser, base, { width });
      await click(p, '[data-p="tm-focus"][data-id="ann"]');
      await L.pick(p, 'select[data-k="tm-at:ann:0"]', '840');
      await p.locator('[data-p="tm-focus-close"]').focus(); await p.keyboard.press('Enter'); await L.settle(p, 160);
      const returned = await p.evaluate(() => {
        const el = document.activeElement; return el && el.getAttribute('data-p') === 'tm-focus' && el.getAttribute('data-id') === 'ann';
      });
      ok(returned, width + ': keyboard Close details returns focus to Ann\'s Edit breaks action');
      if (returned) await p.keyboard.press('Enter'); else await p.locator('[data-p="tm-focus"][data-id="ann"]').click();
      await L.settle(p, 160);
      ok(await field(p, 'tm-at:ann:0').inputValue() === '840' && await p.locator('[data-p="tm-save"]').isEnabled(),
        width + ': reopening details retains the exact unsaved break draft');
      ok((await read(p)).v === 1 && !p.errors.length, width + ': closing details does not save or produce browser errors ' + p.errors.join(' | '));
      await p.context().close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
