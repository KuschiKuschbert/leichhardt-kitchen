// I'm on it (5 Nov 2026, head chef, round 2 of the work pages redesign): the first tap on an open prep line stamps who
// is on it, and on a phone greys it for everyone else; the second tap ticks it done. A tap on someone else's stamped
// line takes it over. On the shared kitchen device the first tap asks Who's on it? and the second ticks it for that
// cook, without asking again. The tick clears the stamp. Start here leaves out what someone else is on.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW));
const key = id => ['kitchens', L.PIN, 'days', today, 'items', id].join('/');
const line = (text, x) => Object.assign({ text, qty: '2 tubs', station: 'Larder', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, done: false, deleted: false }, x || {});
const extra = { [key('on1')]: line('Dice carrot'), [key('on2')]: line('Pick parsley', { onBy: 'Bo', onById: 'bo', onAt: L.NOW - 600000 }) };
const item = (p, id) => p.evaluate(k => window.__fake.dump()[k] || {}, key(id));
const box = id => '#nbr-' + id + ' .nb-box';
async function tap(p, id) { await p.click(box(id)); await L.settle(p, 400); }
(async () => {
  const b = await L.start();

  // Ann on her phone: stamp, Undo, stamp again, then tick
  let p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1600 });
  ok(/I'm on it: Dice carrot/.test(await p.getAttribute(box('on1'), 'aria-label')), 'the box says the first tap puts you on it');
  await tap(p, 'on1');
  let d = await item(p, 'on1');
  ok(d.done === false && d.onById === 'ann' && d.onBy === 'Ann' && d.onAt > 0, 'first tap: Ann is on it, not ticked (' + JSON.stringify({ done: d.done, on: d.onById }) + ')');
  ok(/You're on it/.test(await txt(p, '#nbr-on1 .nb-on') || '') && (await txt(p, box('on1') + ' .nb-on-i') || '').trim() === 'A' && /Tap again when it is done/.test(await txt(p, '.p-toast') || ''), 'the line says You\'re on it, the box shows A, and the toast says to tap again');
  await p.click('.p-toast-btn'); await L.settle(p, 400);
  d = await item(p, 'on1');
  ok(!d.onById && d.done === false, 'Undo takes the stamp off');
  await tap(p, 'on1'); await tap(p, 'on1');
  d = await item(p, 'on1');
  ok(d.done === true && d.preparedById === 'ann' && d.doneById === 'ann' && d.onById === '' && d.onAt === 0, 'the second tap ticks it, for Ann, and clears the stamp (' + JSON.stringify({ done: d.done, prep: d.preparedById, on: d.onById }) + ')');
  // Bo's line: greyed for Ann; her tap takes it over, the next one ticks it
  ok(await p.$eval('#nbr-on2', e => e.classList.contains('is-on-other') && getComputedStyle(e).opacity < 1) && /Bo on it/.test(await txt(p, '#nbr-on2 .nb-on') || ''), 'someone else\'s stamp: greyed, saying Bo on it');
  ok(/Take over Pick parsley from Bo/.test(await p.getAttribute(box('on2'), 'aria-label')), 'its box says a tap takes it over');
  await tap(p, 'on2');
  d = await item(p, 'on2');
  ok(d.onById === 'ann' && d.done === false && /Taken over from Bo/.test(await txt(p, '.p-toast') || ''), 'Ann\'s tap takes it over from Bo');
  await tap(p, 'on2');
  ok((await item(p, 'on2')).done === true, 'and her next tap ticks it');
  ok(p.errors.length === 0 && !(await L.overflow(p)), 'phone: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // Start here leaves out what someone else is on (four or more open lines number the first three)
  const many = Object.assign({}, extra);
  ['m1', 'm2', 'm3', 'm4'].forEach((id, i) => { many[key(id)] = line('Job ' + id, { addedAt: L.NOW - 7200000 + i * 60000 }); });
  many[key('m1')].onBy = 'Bo'; many[key('m1')].onById = 'bo'; many[key('m1')].onAt = L.NOW - 60000;
  p = await L.open(b, '#/prep', { who: 'ann', extra: many, wait: 1600 });
  ok(!(await p.$eval('#nbr-m1 .nb-t', e => e.hasAttribute('data-n'))) && await p.$eval('#nbr-m2 .nb-t', e => e.hasAttribute('data-n')), 'Start here skips the job Bo is on');
  await p.context().close();

  // the shared kitchen device: Who's on it?, then the second tap ticks it for that cook
  p = await L.open(b, '#/prep', { who: 'sam', settings: { shared: true }, extra, wait: 1600 });
  await tap(p, 'on1');
  ok(/Who's on it\?/.test(await txt(p, '#pt-sheet h3') || ''), 'shared: the first tap asks Who\'s on it?');
  let choice = p.locator('#pt-sheet [data-pt="choose"][data-id="ann"]');
  if (!(await choice.count()) || !(await choice.isVisible())) { await p.locator('#pt-sheet [data-pt="others"]').click(); await L.settle(p, 150); }
  await choice.click(); await L.settle(p, 500);
  d = await item(p, 'on1');
  ok(d.onById === 'ann' && d.done === false && !(await p.$('#pt-sheet')), 'shared: Ann is on it, the sheet closed (' + JSON.stringify({ on: d.onById, done: d.done }) + ')');
  ok(/Ann on it/.test(await txt(p, '#nbr-on1 .nb-on') || '') && !(await p.$eval('#nbr-on1', e => e.classList.contains('is-on-other'))), 'shared: the line says Ann on it and is not greyed');
  await tap(p, 'on1');
  d = await item(p, 'on1');
  ok(!(await p.$('#pt-sheet')) && d.done === true && d.preparedById === 'ann' && d.doneById === 'sam', 'shared: the second tap ticks it for Ann, with no second question (Sam recorded it)');
  ok(p.errors.length === 0, 'shared: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a laptop
  p = await L.open(b, '#/prep', { who: 'ann', extra, width: 1280, height: 900, wait: 1600 });
  ok(/Bo on it/.test(await txt(p, '#nbr-on2') || '') && !(await L.overflow(p)), '1280 px: the stamp shows, no sideways scroll');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
