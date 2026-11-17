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
  // The whole day (head chef, 17 Nov 2026, docs/home-roster-options/brief.md, D for everyone): names grouped by start
  // time with a Now line, each person once, the section now and until when, "back 15:00" while on a break; break windows
  // and later shifts' details live in Today's team. It replaced the 10 Nov board for the whole day only: On with you
  // (below) keeps the board.
  const starts = (p, sel) => p.evaluate(s => [...document.querySelectorAll(s + ' .hm-starts > li')].map(li => li.classList.contains('hm-st-now') ? 'NOW' :
    { t: li.querySelector('.hm-st-t').textContent.trim(), people: [...li.querySelectorAll('.hm-tp')].map(e => e.innerText.replace(/\s+/g, ' ').trim()) }), sel);
  for (const width of [390, 768, 1280]) await step('head chef ' + width, async () => {
    p = await L.open(browser, '#/', { admin: true, extra: fixture(), width, height: width === 390 ? 844 : 1000, wait: 1200 });
    await ready(p);
    const d = await starts(p, '#hm-with-body'), card = await txt(p, '#hm-with-body') || '';
    const order = d.map(x => x === 'NOW' ? x : x.t), all = [].concat(...d.filter(x => x !== 'NOW').map(x => x.people));
    ok(/On today/.test(await txt(p, '#hm-with') || '') && JSON.stringify(order) === JSON.stringify(['10:00', 'NOW', '15:00']), width + ': the whole day by start time, the Now line before the starts still to come (' + JSON.stringify(order) + ')');
    ok(all.length === 8 && JSON.stringify(d[0].people.map(x => x.split(' ')[0])) === JSON.stringify(['Ann', 'Bo', 'Cleo', 'Dev', 'Eli', 'Fern', 'Hana']) && /^Gus Pass · until 21:00$/.test(d[2].people[0]), width + ': each person once, a double as one day (' + JSON.stringify(all) + ')');
    ok(d[0].people[0] === 'Ann Hot larder, then Prep from 15:00 · until 21:00 back 15:00' && await p.$$eval('#hm-with-body .hm-tp.is-away', l => l.length) === 3, width + ': the section now, a later move, until when, and when they are back from a break (' + d[0].people[0] + ')');
    ok(d[0].people[3] === 'Dev Prep · until 15:00' && d[0].people[4] === 'Eli Grill · until 21:00' && !/break/.test(card), width + ': a break to come is not on the card (Today\'s team has it) (' + d[0].people[4] + ')');
    ok(await p.locator('#hm-full-team').evaluate(e => e.hidden && e.getBoundingClientRect().height === 0), width + ': no second copy of the same team behind a fold');
    ok(!!(await p.$('#hm-with-body a.hm-pl[href="#/team"]')), width + ': the head chef keeps the Today\'s team link');
    ok(!(await L.overflow(p)), width + ': no sideways scroll');
    if (width === 390) {
      const h = await p.locator('#hm-with').evaluate(e => e.getBoundingClientRect().height);
      // the 10 Nov board was 491 px for this day with the real fonts, the list before it 858 px
      ok(h < 620, 'phone: the whole day fits in a short card (' + Math.round(h) + ' px)');
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
    const all = await starts(p, '#hm-team'), names = JSON.stringify(all);
    ok(JSON.stringify(all.map(x => x === 'NOW' ? x : x.t)) === JSON.stringify(['10:00', 'NOW', '15:00']) && /"Gus Pass · until 21:00"/.test(names) && /"Ann Hot larder/.test(names), 'staff: the fold opens the whole day by start time, themselves included (' + names.slice(0, 160) + ')');
    ok(!/On today/.test(await txt(p, '#hm-team') || ''), 'staff: the fold does not repeat the card\'s heading');
    ok(!(await p.$('#hm-with a[href="#/team"]')), 'staff: no planner link');
    await p.clock.runFor(31000); await L.settle(p, 100);
    ok(await p.locator('#hm-full-team').evaluate(e => e.open && !e.hidden), 'staff: a clock repaint keeps the open fold');
  });
  await step('four shifts on a phone', async () => {
    const four = [{ id: 'bfast', name: 'Breakfast', from: 360, to: 600 }, { id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'aft', name: 'Afternoon', from: 780, to: 1020 }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260 }];
    p = await L.open(browser, '#/', { admin: true, extra: fixture({ on: on.concat([{ id: 'dev', sh: 'aft', sec: 'grill' }, { id: 'gus', sh: 'bfast', sec: 'hot' }]) }, { kitShifts: four }), wait: 1200 });
    await ready(p);
    const d = await starts(p, '#hm-with-body'), names = JSON.stringify(d);
    ok(JSON.stringify(d.map(x => x === 'NOW' ? x : x.t)) === JSON.stringify(['06:00', '10:00', 'NOW', '15:00']) && /"Gus again Pass · until 21:00"/.test(names) && /"Dev Grill · until 17:00"/.test(names) && /"Gus Hot larder · finished 10:00"/.test(names), 'four shifts: a split is listed at each start, its first part finished; overlapping services make one day, on the section of the service on now (' + names + ')');
    ok(!(await L.overflow(p)), 'four shifts: no sideways scroll');
  });
  await step('three shifts on a phone', async () => {
    const three = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'aft', name: 'Afternoon', from: 780, to: 1020 }, { id: 'dinner', name: 'Dinner', from: 900, to: 1260 }];
    p = await L.open(browser, '#/', { admin: true, extra: fixture({ on: on.concat([{ id: 'dev', sh: 'aft', sec: 'grill' }]) }, { kitShifts: three }), wait: 1200 });
    await ready(p);
    const d = await starts(p, '#hm-with-body');
    ok(JSON.stringify(d.map(x => x === 'NOW' ? x : x.t)) === JSON.stringify(['10:00', 'NOW', '15:00']), 'three shifts: one list by start time (' + JSON.stringify(d) + ')');
    ok(!(await L.overflow(p)), 'three shifts: no sideways scroll');
  });
  // A roster day (head chef, 17 Nov 2026, docs/home-roster-options/brief.md): the roster file cuts a long day into its
  // services, so Home joins each person's parts back into one day; a split keeps its gap; a service added by hand without
  // roster hours counts with its own; a double that moves section later says so where the later column is not shown;
  // Your day says the whole stretch; the head chef always sees the whole day, on the plan or not. At 14:00.
  const rosterOn = [
    { id: 'ann', sh: 'lunch', sec: 'hot', from: 600, to: 900 }, { id: 'ann', sh: 'dinner', sec: 'prep', from: 900, to: 1260 },   // 10:00 to 21:00, Hot larder then Prep
    { id: 'bo', sh: 'lunch', sec: 'pans', from: 600, to: 840 }, { id: 'bo', sh: 'dinner', sec: 'pans', from: 1020, to: 1260 },     // a split
    { id: 'cleo', sh: 'lunch', sec: 'pass', from: 660, to: 900 }, { id: 'cleo', sh: 'dinner', sec: 'grill' },                       // Dinner added by hand
    { id: 'dev', sh: 'lunch', sec: 'prep' },                                                                                       // no roster hours
    { id: 'gus', sh: 'lunch', sec: 'pass', from: 600, to: 900 }, { id: 'eli', sh: 'dinner', sec: 'grill', from: 1020, to: 1260 }];
  const rosterFx = () => fixture({ on: rosterOn, br: [] }, { headId: 'gus', people: people.map(x => x.id === 'gus' ? Object.assign({}, x, { role: 'head', del: true }) : x) });
  // each person on a board as read: name, hours, a later section, breaks
  const persons = (p, sel) => p.$$eval(sel + ' .hm-tp', l => l.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  const cellOf = (list, name) => list.filter(c => c === name || c.indexOf(name + ' ') === 0);
  await step('roster day: a cook on Lunch', async () => {
    p = await L.open(browser, '#/', { who: 'bo', extra: rosterFx(), wait: 1200 });
    await ready(p);
    const b = await persons(p, '#hm-with-body');
    ok(JSON.stringify(cellOf(b, 'Ann')) === JSON.stringify(['Ann 10:00 to 21:00 Prep from 15:00']), 'roster day: a long day cut into services reads as one day, with the later section where Dinner is not on the board (' + JSON.stringify(cellOf(b, 'Ann')) + ')');
    ok(JSON.stringify(cellOf(b, 'Cleo')) === JSON.stringify(['Cleo 11:00 to 21:00 Grill from 15:00']), 'roster day: a service added by hand counts with its own hours (' + JSON.stringify(cellOf(b, 'Cleo')) + ')');
    ok(JSON.stringify(cellOf(b, 'Dev')) === JSON.stringify(['Dev']) && JSON.stringify(cellOf(b, 'Gus')) === JSON.stringify(['Gus 10:00 to 15:00']), 'roster day: no roster hours, no hours line; one service, its own hours (' + JSON.stringify([cellOf(b, 'Dev'), cellOf(b, 'Gus')]) + ')');
    ok(/Lunch · 10:00 to 14:00/.test(await txt(p, '#hm-day') || ''), 'roster day: Your day on a split says the part of the day now (' + ((await txt(p, '#hm-day')) || '').replace(/\s+/g, ' ').slice(0, 90) + ')');
    ok(!(await L.overflow(p)), 'roster day: no sideways scroll');
  });
  await step('roster day: Your day for a long day', async () => {
    p = await L.open(browser, '#/', { who: 'ann', extra: rosterFx(), wait: 1200 });
    await ready(p);
    ok(/Lunch · 10:00 to 21:00/.test(await txt(p, '#hm-day') || ''), 'roster day: Your day says the whole roster day, not the Lunch slice (' + ((await txt(p, '#hm-day')) || '').replace(/\s+/g, ' ').slice(0, 90) + ')');
  });
  await step('roster day: the head chef on the plan', async () => {
    p = await L.open(browser, '#/', { admin: true, extra: rosterFx(), wait: 1200 });
    await ready(p);
    const card = (await txt(p, '#hm-with') || '').replace(/\s+/g, ' ');
    ok(/On today/.test(card) && !/On with you/.test(card) && /Eli/.test(card) && /Bo/.test(card), 'head chef on the plan: Home shows the whole day, Dinner included (' + card.slice(0, 120) + ')');
    ok(await p.locator('#hm-full-team').evaluate(e => e.hidden && e.getBoundingClientRect().height === 0) && !!(await p.$('#hm-with a.hm-pl[href="#/team"]')), 'head chef on the plan: no second copy behind a fold, the Today\'s team link stays');
    ok(!(await L.overflow(p)), 'head chef on the plan: no sideways scroll');
  });
  await browser.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
