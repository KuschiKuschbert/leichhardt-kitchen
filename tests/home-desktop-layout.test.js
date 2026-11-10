// Desktop Home keeps the approved staff-first order while its cards share clear, aligned rows.
// Synthetic records only; geometry is checked rather than the CSS implementation.
const L = require('./lib'), M = require('../js/functions');
const { R, ok } = L.results(), day = L.ymd(new Date(L.NOW)), tomorrow = M.addDays(day, 1);
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const config = { ...L.seed()[key(['config', 'main'])],
  people: L.seed()[key(['config', 'main'])].people.concat([{ id: 'jo', name: 'Jo', role: 'staff', active: true, add: true, tick: true }]),
  staffIds: ['ann', 'sam', 'bo', 'jo'],
  kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }],
  kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }] };
const plan = { day, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'larder' }, { id: 'jo', sh: 'lunch', sec: 'sauce' }],
  br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }], v: 1, by: 'sam', at: L.NOW - 3600000, upd: L.NOW - 3600000 };
function booking(date, min, name) {
  const at = M.kat(date, min);
  return M.derive({ v: 1, status: 'confirmed', name, date, start: at, st: false, loc: '', guests: 40, gu: false, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at, note: '' }], lines: [{ rid: 'pizza-platter', name: 'Pizza Platter', unit: 'platter', spec: '', fp: '', qty: 2, u: M.toU([2]) }],
    was: {}, chg: [], cBy: 'sam', cAt: L.NOW - 86400000, confBy: 'sam', confAt: L.NOW - 86400000, by: 'sam', upd: L.NOW - 3600000 });
}
// tomorrow's goes on Home's Function tomorrow card (10 Nov 2026), so a second one later in the week keeps Coming up's
// function group in these layout checks
const current = booking(day, 850, 'Example service'), future = booking(tomorrow, 1080, 'Example tomorrow'), later = booking(M.addDays(day, 3), 1080, 'Example later');
const fixture = busy => ({ [key(['config', 'main'])]: config, [key(['team', day])]: plan,
  ...(busy ? { [key(['functions', 'service'])]: current, [key(['functions', 'future'])]: future, [key(['functions', 'later'])]: later } : {}) });
const near = (a, b) => Math.abs(a - b) <= 1;
const geometry = p => p.evaluate(() => {
  const rect = s => { const r = document.querySelector(s).getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
  return { day: rect('#hm-day'), crew: rect('#hm-with'), work: rect('#hm-board'), prep: rect('#hm-prep'), future: rect('.hm-up'),
    sections: [...document.querySelectorAll('#hm-prep .hm-sec')].map(e => { const r = e.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right }; }) };
});
function aligned(g) {
  return near(g.work.left, g.day.left) && near(g.work.right, g.day.right) && near(g.prep.left, g.crew.left) && near(g.prep.right, g.crew.right) && near(g.work.top, g.prep.top);
}
function below(g) { return g.work.top >= Math.max(g.day.bottom, g.crew.bottom) - 1 && g.future.top >= Math.max(g.work.bottom, g.prep.bottom) - 1; }
(async () => {
  const browser = await L.start(); let p;
  async function step(name, task) {
    try { await task(); }
    catch (e) { ok(false, name + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, name + ': no page errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }
  for (const width of [1100, 1280, 1440]) await step('quiet ' + width, async () => {
    p = await L.open(browser, '#/', { who: 'ann', extra: fixture(false), width, height: 900, wait: 1200 });
    await L.waitFor(p, () => !!document.querySelector('#hm-prep .hm-sec') && document.querySelector('#hm-board')?.hidden);
    const g = await geometry(p);
    ok(near(g.prep.left, g.day.left) && near(g.prep.right, g.crew.right), width + ': quiet Prep uses the available row rather than leaving an empty work column (' + JSON.stringify(g) + ')');
    ok(g.sections.length === 3 && g.sections.every(x => near(x.top, g.sections[0].top)), width + ': the quiet section progress is readable together on one row');
    ok(g.prep.top >= Math.max(g.day.bottom, g.crew.bottom) - 1 && !(await L.overflow(p)), width + ': personal day and coworkers still precede work with no sideways scroll');
  });
  for (const width of [1100, 1280, 1440]) for (const who of ['ann', 'sam']) await step('busy ' + who + ' ' + width, async () => {
    p = await L.open(browser, '#/', { who, extra: fixture(true), width, height: 900, wait: 1200 });
    await L.waitFor(p, () => /Example service/.test(document.querySelector('#hm-board')?.textContent || '') && /Example later/.test(document.querySelector('.hm-up')?.textContent || ''));
    let g = await geometry(p);
    ok(aligned(g), who + '/' + width + ': work and Prep align with the day/team columns (' + JSON.stringify(g) + ')');
    ok(below(g) && near(g.future.left, g.day.left) && near(g.future.right, g.crew.right), who + '/' + width + ': Coming up follows both work cards on a complete row');
    await p.click('#hm-full-team > summary'); g = await geometry(p);
    ok(aligned(g) && below(g) && await p.locator('#hm-full-team').evaluate(e => e.open), who + '/' + width + ': opening the full team reflows work without overlap or collapsing the detail');
    ok(!(await L.overflow(p)), who + '/' + width + ': no sideways scroll');
  });
  await step('arriving reminders', async () => {
    p = await L.open(browser, '#/', { who: 'ann', extra: fixture(false), width: 1280, height: 900, wait: 1200 });
    await L.waitFor(p, () => document.querySelector('#hm-board')?.hidden);
    await p.click('#hm-full-team > summary');
    await p.evaluate(([a, b, c, d]) => { __fake.write(a, b); __fake.write(c, d); }, [key(['functions', 'service']), current, key(['functions', 'future']), future]);
    await L.waitFor(p, () => /Example service/.test(document.querySelector('#hm-board')?.textContent || '') && !document.querySelector('#hm-board').hidden && /Example tomorrow/.test(document.querySelector('.hm-up')?.textContent || ''));
    const g = await geometry(p);
    ok(aligned(g) && below(g), 'a new saved reminder moves Prep into its aligned column and Coming up below without overlap');
    ok(await p.locator('#hm-full-team').evaluate(e => e.open) && !(await L.overflow(p)), 'new reminders preserve the open full team and the page width');
  });
  for (const state of [{ name: 'empty', cuts: false, functions: false }, { name: 'cut-offs only', cuts: true, functions: false },
    { name: 'functions only', cuts: false, functions: true }, { name: 'both groups', cuts: true, functions: true }]) await step('Coming up ' + state.name, async () => {
    const extra = fixture(false);
    extra[key(['config', 'main'])] = { ...config, cutoffs: state.cuts ? [{ id: 'pfd', name: 'Example Foods', dd: [0, 1, 2, 3, 4, 5, 6], at: 900, pre: 1 }] : [] };
    if (state.functions) { extra[key(['functions', 'future'])] = future; extra[key(['functions', 'later'])] = later; }
    p = await L.open(browser, '#/', { who: 'sam', extra, width: 1280, height: 900, wait: 1200 });
    await L.waitFor(p, wanted => {
      const cuts = document.querySelector('#hm-cuts'), functions = document.querySelector('#fn-land');
      return cuts && functions && cuts.hidden === !wanted.cuts && functions.hidden === !wanted.functions;
    }, state);
    const shown = await p.locator('.hm-up').isVisible();
    ok(shown === (state.cuts || state.functions), state.name + ': Coming up is visible whenever it contains an upcoming item, and hidden when empty');
    if (shown) {
      const groups = await p.evaluate(() => {
        const r = selector => { const b = document.querySelector(selector).getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, width: b.width }; };
        return { card: r('.hm-up'), cuts: r('#hm-cuts'), functions: r('#fn-land') };
      });
      if (state.cuts && state.functions) ok(near(groups.cuts.top, groups.functions.top) && groups.cuts.right <= groups.functions.left + 1, 'both groups: supplier reminders and functions sit side by side without overlap');
      else { const only = state.cuts ? groups.cuts : groups.functions; ok(only.width >= groups.card.width * 0.85, state.name + ': the only upcoming group uses the available row'); }
      ok((!state.cuts || /Example Foods/.test(await L.txt(p, '#hm-cuts'))) && (!state.functions || /Example later/.test(await L.txt(p, '#fn-land'))), state.name + ': the actual reminder words remain visible');
    }
    ok(!(await L.overflow(p)), state.name + ': no sideways scroll');
  });
  await browser.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
