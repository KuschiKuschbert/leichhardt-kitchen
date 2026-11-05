// Wall board (5 Nov 2026, head chef, round 2 of the work pages redesign, as drawn in B): on the shared kitchen tablet,
// today's prep list as one column per section, like dockets on the rail. View and tick: the rows are the list's own, so
// On it asks Who's on it? and the box asks Who did this?, the cook on it first. Wall board at the end of the section
// tabs turns it on and the tablet keeps it (lk.wall); List turns it off. A personal phone never gets it.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW));
const key = id => ['kitchens', L.PIN, 'days', today, 'items', id].join('/');
const line = (text, station, x) => Object.assign({ text, qty: '2 tubs', station, recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, done: false, deleted: false }, x || {});
const extra = {
  [key('w1')]: line('Dice carrot', 'Larder'), [key('w2')]: line('Pick parsley', 'Larder'),
  [key('w3')]: line('Portion steaks', 'Grill'), [key('w4')]: line('Blind bake tart cases', 'Pastry'),
  [key('w5')]: line('Old line', 'Grill', { deleted: true })
};
const item = (p, id) => p.evaluate(k => window.__fake.dump()[k] || {}, key(id));
// the seed has open lines in Grill, Sauce and Larder too: these add Pastry, and lines to Larder and Grill
const cols = p => p.$$eval('.wb-cols .wb-col', l => l.map(e => ({ name: e.getAttribute('aria-label'), top: Math.round(e.getBoundingClientRect().top), rows: [...e.querySelectorAll('.nb-row .nb-t')].map(t => t.firstChild.textContent.trim()) })));
const col = (c, n) => c.filter(x => x.name === n)[0] || { rows: [] };
const wallSaved = p => p.evaluate(() => localStorage.getItem('lk.wall'));
(async () => {
  const b = await L.start();

  // the shared tablet on the wall, landscape
  let p = await L.open(b, '#/prep', { who: 'sam', settings: { shared: true }, extra, width: 1280, height: 800, wait: 1600 });
  ok(!(await p.$('.wb')) && !!(await p.$('.nb-tabs [data-p="wall"]')), 'shared tablet: the list first, with Wall board at the end of the section tabs');
  await p.click('.nb-tabs [data-p="wall"]'); await L.settle(p, 400);
  let c = await cols(p);
  ok(c.map(x => x.name).sort().join() === 'Grill,Larder,Pastry,Sauce' && c.slice(0, 3).every(x => x.top === c[0].top) && c[3].top > c[0].top, 'one column per section, three side by side at 1280 px, the fourth below (' + JSON.stringify(c.map(x => [x.name, x.top])) + ')');
  ok(col(c, 'Larder').rows.indexOf('Dice carrot') >= 0 && col(c, 'Larder').rows.indexOf('Pick parsley') >= 0 && col(c, 'Grill').rows.indexOf('Portion steaks') >= 0 && col(c, 'Pastry').rows.join() === 'Blind bake tart cases' && !/Old line/.test(await txt(p, '.wb') || ''), 'each line under its own section, no removed lines');
  const total = c.reduce((n, x) => n + x.rows.length, 0);
  ok(!(await p.$('.nb-tabs')) && !(await p.$('.nb-right')) && new RegExp('0 of ' + total + ' done').test(await txt(p, '.wb-h') || '') && await wallSaved(p) === '1', 'no tabs and no Handy page, the count in the header, and the tablet keeps the choice');
  ok(!(await p.$('.wb .nb-x:visible, .wb .nb-star:visible, .wb .nb-more:visible')), 'view and tick: no urgent toggle, Remove or More on the board');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-p') === 'wall' && document.activeElement.textContent === 'List'), 'focus goes to List, the way back');

  // view and tick: On it asks Who's on it?; the box ticks, asking Who did this? with the cook on it first
  await p.click('#nbr-w3 .nb-onbtn'); await L.settle(p, 400);
  ok(/Who's on it\?/.test(await txt(p, '#pt-sheet h3') || ''), 'On it on the board asks Who\'s on it?');
  const choice = p.locator('#pt-sheet [data-pt="choose"][data-id="ann"]');
  if (!(await choice.count()) || !(await choice.isVisible())) { await p.locator('#pt-sheet [data-pt="others"]').click(); await L.settle(p, 150); }
  await choice.click(); await L.settle(p, 500);
  let d = await item(p, 'w3');
  ok(d.onById === 'ann' && d.done === false && /Ann on it/.test(await txt(p, '#nbr-w3 .nb-on') || '') && /Ann ✓/.test(await txt(p, '.wb #nbr-w3 .nb-onbtn') || ''), 'Ann is on it, and the board shows it (' + JSON.stringify({ on: d.onById, done: d.done }) + ')');
  await p.click('#nbr-w3 .nb-box'); await L.settle(p, 400);
  ok(/Who did this\?/.test(await txt(p, '#pt-sheet h3') || '') && !!(await p.$('#pt-sheet .pt-on [data-id="ann"]')), 'the box asks Who did this?, Ann first under On it');
  await p.click('#pt-sheet .pt-on [data-pt="choose"]'); await L.settle(p, 500);
  d = await item(p, 'w3');
  ok(!(await p.$('#pt-sheet')) && d.done === true && d.preparedById === 'ann' && d.doneById === 'sam', 'ticked for Ann, Sam recorded it');
  ok(new RegExp('1 of ' + total + ' done').test(await txt(p, '.wb-h') || '') && /1\/\d/.test(await txt(p, '.wb-col[aria-label="Grill"] .nb-hd') || ''), 'the count and the Grill column count the tick');
  ok(p.errors.length === 0 && !(await L.overflow(p)), '1280 px board: no page errors, no sideways scroll ' + p.errors.join(' | '));

  // the board stays after a reload (the 04:00 refresh), and List takes it off
  await p.reload(); await L.settle(p, 1600);
  ok(!!(await p.$('.wb-cols .wb-col')), 'after a reload the tablet is still on the board');
  await p.click('.wb-h [data-p="wall"]'); await L.settle(p, 400);
  ok(!(await p.$('.wb')) && !!(await p.$('.nb .nb-left')) && !(await wallSaved(p)) && await p.evaluate(() => document.activeElement && document.activeElement.textContent === 'Wall board'), 'List: back to the notebook, the choice forgotten, focus on Wall board');
  await p.context().close();

  // a tablet held upright and a phone: the columns wrap, nothing scrolls sideways
  for (const [w, h] of [[768, 1024], [390, 844]]) {
    p = await L.open(b, '#/prep', { who: 'sam', settings: { shared: true }, extra, width: w, height: h, wait: 1600, init: () => { try { localStorage.setItem('lk.wall', '1'); } catch (e) {} } });
    c = await cols(p);
    ok(c.length === 4 && !(await L.overflow(p)) && p.errors.length === 0, w + ' px board: four columns, no sideways scroll, no page errors ' + p.errors.join(' | '));
    if (w === 390) ok(c[1].top > c[0].top, '390 px: one column at a time');
    await p.context().close();
  }

  // a personal phone: no Wall board, and a kept choice does nothing there
  p = await L.open(b, '#/prep', { who: 'ann', extra, width: 1280, height: 800, wait: 1600, init: () => { try { localStorage.setItem('lk.wall', '1'); } catch (e) {} } });
  ok(!(await p.$('.wb')) && !(await p.$('[data-p="wall"]')) && !!(await p.$('.nb .nb-left')), 'personal phone: the list, with no Wall board');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
