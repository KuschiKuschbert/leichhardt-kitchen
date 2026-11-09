// Home's On today as a board (head chef, 10 Nov 2026, chosen C): sections down, the day's shifts across, each name and
// break in its cell, each shift's hours once, and no second copy of the same team behind the fold. Synthetic records only,
// laid out like a real day where most chefs work a double (Lunch then Dinner, often on another section).
const L = require('./lib'), M = require('../js/functions');
const { R, ok } = L.results(), { txt } = L;
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW)), CFG = key(['config', 'main']), TEAM = key(['team', day]);
const names = { ann: 'Ann', bo: 'Bo', cleo: 'Cleo', dev: 'Dev', eli: 'Eli', fern: 'Fern', gus: 'Gus', hana: 'Hana' };
const people = Object.keys(names).map(id => ({ id, name: names[id], role: 'staff', active: true, add: true, tick: true }));
const secs = [{ id: 'hot', name: 'Hot larder' }, { id: 'pans', name: 'Pans' }, { id: 'pass', name: 'Pass' }, { id: 'prep', name: 'Prep' }, { id: 'grill', name: 'Grill' }, { id: 'salad', name: 'Salads and cold larder' }];
// Dinner is listed first in the kitchen's shifts on purpose: the board orders its columns by start time
const shifts = [{ id: 'dinner', name: 'Dinner', from: 900, to: 1260 }, { id: 'lunch', name: 'Lunch', from: 600, to: 900 }];
const on = [
  { id: 'ann', sh: 'lunch', sec: 'hot' }, { id: 'ann', sh: 'dinner', sec: 'prep' }, { id: 'bo', sh: 'lunch', sec: 'pans' }, { id: 'bo', sh: 'dinner', sec: 'hot' },
  { id: 'cleo', sh: 'lunch', sec: 'pass' }, { id: 'cleo', sh: 'dinner', sec: 'pans' }, { id: 'dev', sh: 'lunch', sec: 'prep' },
  { id: 'eli', sh: 'lunch', sec: 'grill' }, { id: 'eli', sh: 'dinner', sec: 'grill' }, { id: 'fern', sh: 'lunch', sec: 'salad' }, { id: 'fern', sh: 'dinner', sec: 'salad' },
  { id: 'gus', sh: 'dinner', sec: 'pass' }, { id: 'hana', sh: 'lunch', sec: 'salad' }];
const br = [{ id: 'ann', sh: 'lunch', at: 780, len: 120 }, { id: 'bo', sh: 'lunch', at: 780, len: 120 }, { id: 'cleo', sh: 'lunch', at: 840, len: 120 },
  { id: 'eli', sh: 'lunch', at: 900, len: 120 }, { id: 'fern', sh: 'lunch', at: 870, len: 120 }];
const fixture = (x, c) => ({ [CFG]: Object.assign({ people, staffIds: Object.keys(names), sousIds: [], kitSecs: secs, kitShifts: shifts }, c || {}),
  [TEAM]: Object.assign({ day, on, br, v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'ann' }, x || {}) });
const board = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s + ' .hm-rota')].map(t => ({
  cols: [...t.querySelectorAll('thead th')].map(e => e.textContent.trim()),
  rows: [...t.querySelectorAll('tbody tr')].map(r => ({ sec: r.querySelector('th').textContent.trim(), cells: [...r.querySelectorAll('td')].map(c => c.textContent.trim()) }))
})), sel);
const ready = p => L.waitFor(p, () => !!document.querySelector('#hm-with-body .hm-tp'), null, 6000).catch(() => {});

(async () => {
  const browser = await L.start(); let p;
  async function step(name, task) {
    try { await task(); }
    catch (e) { ok(false, name + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, name + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }
  for (const width of [390, 768, 1280]) await step('head chef ' + width, async () => {
    p = await L.open(browser, '#/', { admin: true, extra: fixture(), width, height: width === 390 ? 844 : 1000, wait: 1200 });
    await ready(p);
    const b = await board(p, '#hm-with-body'), card = await txt(p, '#hm-with-body') || '';
    ok(b.length === 1, width + ': the whole day is one board (' + b.length + ')');
    if (!b.length) return;
    ok(JSON.stringify(b[0].cols) === JSON.stringify(['Lunch 10:00 to 15:00', 'Dinner 15:00 to 21:00']), width + ': shifts across, in start order, each with its hours (' + JSON.stringify(b[0].cols) + ')');
    ok(JSON.stringify(b[0].rows.map(r => r.sec)) === JSON.stringify(secs.map(s => s.name)), width + ': sections down, in the kitchen\'s order (' + JSON.stringify(b[0].rows.map(r => r.sec)) + ')');
    const cell = (sec, col) => (b[0].rows.find(r => r.sec === sec) || { cells: [] }).cells[col] || '';
    ok(/^Ann/.test(cell('Hot larder', 0)) && /^Ann/.test(cell('Prep', 1)) && /^Bo/.test(cell('Hot larder', 1)), width + ': a chef on a double is in both columns, on each shift\'s section');
    ok(cell('Prep', 0) === 'Dev' && cell('Pass', 1) === 'Gus' && /Fern/.test(cell('Salads and cold larder', 0)) && /Hana/.test(cell('Salads and cold larder', 0)), width + ': every person on every shift, two to a cell where the plan has two');
    ok(await p.$$eval('#hm-with-body .hm-tp', l => l.length) === on.length, width + ': each saved shift row shows once');
    ok(card.split('10:00 to 15:00').length === 2 && card.split('15:00 to 21:00').length === 2, width + ': each shift\'s hours are said once, not on every person');
    ok(cell('Hot larder', 0) === 'Ann back 15:00' && await p.$$eval('#hm-with-body .hm-tp.is-away', l => l.length) === 3, width + ': a chef on a break now says when they are back (' + cell('Hot larder', 0) + ')');
    ok(cell('Grill', 0) === 'Eli break 15:00 to 17:00' && cell('Grill', 1) === 'Eli', width + ': a break to come shows its whole window (' + cell('Grill', 0) + ')');
    ok(await p.locator('#hm-full-team').evaluate(e => e.hidden && e.getBoundingClientRect().height === 0), width + ': no second copy of the same team behind a fold');
    ok(!!(await p.$('#hm-with-body a.hm-pl[href="#/team"]')), width + ': the head chef keeps the Today\'s team link');
    ok(!(await L.overflow(p)), width + ': no sideways scroll');
    if (width === 390) {
      const h = await p.locator('#hm-with').evaluate(e => e.getBoundingClientRect().height);
      // the old list was 858 px for this day with the real fonts (the same people again behind the fold); the board 491 px
      ok(h < 620, 'phone: the whole day fits in a much shorter card (' + Math.round(h) + ' px)');
    }
    ok(await p.evaluate(() => __fake.bill.filter(x => /\/team\//.test(x.path) && /listen/.test(x.kind)).length) === 0, width + ': no team listener');
  });
  await step('staff on lunch', async () => {
    p = await L.open(browser, '#/', { who: 'ann', extra: fixture(), wait: 1200 });
    await ready(p);
    const b = await board(p, '#hm-with-body'), card = await txt(p, '#hm-with-body') || '';
    ok(/On with you/.test(card) && b.length === 1 && JSON.stringify(b[0].cols) === JSON.stringify(['Lunch 10:00 to 15:00']), 'staff: the card is the board for their own shift (' + JSON.stringify(b.map(x => x.cols)) + ')');
    ok(!/Ann/.test(card) && /Bo/.test(card) && /Dev/.test(card) && !/Gus/.test(card), 'staff: coworkers on the same shift, not themselves or a later shift');
    ok(await p.locator('#hm-full-team').isVisible() && await p.locator('#hm-full-team').evaluate(e => !e.open), 'staff: the full day is one tap away, folded');
    await p.click('#hm-full-team > summary');
    const all = await board(p, '#hm-team');
    ok(all.length === 1 && all[0].cols.length === 2 && /Gus/.test(JSON.stringify(all)) && /Ann/.test(JSON.stringify(all)), 'staff: the fold opens the same board for the whole day (' + JSON.stringify(all.map(x => x.cols)) + ')');
    ok(!/On today/.test(await txt(p, '#hm-team') || ''), 'staff: the fold does not repeat the card\'s heading');
    ok(!(await p.$('#hm-with a[href="#/team"]')), 'staff: no planner link');
    await p.clock.runFor(31000); await L.settle(p, 100);
    ok(await p.locator('#hm-full-team').evaluate(e => e.open && !e.hidden), 'staff: a clock repaint keeps the open fold');
  });
  await step('four shifts on a phone', async () => {
    const four = [{ id: 'bfast', name: 'Breakfast', from: 360, to: 600 }, { id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'aft', name: 'Afternoon', from: 780, to: 1020 }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260 }];
    p = await L.open(browser, '#/', { admin: true, extra: fixture({ on: on.concat([{ id: 'dev', sh: 'aft', sec: 'grill' }, { id: 'gus', sh: 'bfast', sec: 'hot' }]) }, { kitShifts: four }), wait: 1200 });
    await ready(p);
    const b = await board(p, '#hm-with-body');
    ok(b.length === 4 && b.every(x => x.cols.length === 1) && JSON.stringify(b.map(x => x.cols[0].split(' ')[0])) === JSON.stringify(['Breakfast', 'Lunch', 'Afternoon', 'Dinner']), 'more than three shifts: one board per shift, one under the other (' + JSON.stringify(b.map(x => x.cols)) + ')');
    ok(!(await L.overflow(p)), 'four shifts: no sideways scroll');
  });
  await step('three shifts on a phone', async () => {
    const three = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'aft', name: 'Afternoon', from: 780, to: 1020 }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260 }];
    p = await L.open(browser, '#/', { admin: true, extra: fixture({ on: on.concat([{ id: 'dev', sh: 'aft', sec: 'grill' }]) }, { kitShifts: three }), wait: 1200 });
    await ready(p);
    const b = await board(p, '#hm-with-body');
    ok(b.length === 1 && b[0].cols.length === 3, 'three shifts still fit one board (' + JSON.stringify(b.map(x => x.cols)) + ')');
    ok(!(await L.overflow(p)), 'three shifts: no sideways scroll');
  });
  await browser.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
