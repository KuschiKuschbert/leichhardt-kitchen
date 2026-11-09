// I'm on it (5 Nov 2026, head chef, round 2 of the work pages redesign; its own button since that evening): the tick
// box stays one tap = done, as cooks have used it since 20 Oct. On it, a button on each open line of today's list,
// stamps who is on it: on a phone the person signed in, and a neutral badge names other cooks without fading work; on your own line it
// takes you off, on someone else's it takes it over. On the shared kitchen device On it asks Who's on it?, and on a
// stamped line takes the cook off; the tick asks Who did this? with the cook on it first. The tick clears the stamp.
// Start here leaves out what someone else is on.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW));
const key = id => ['kitchens', L.PIN, 'days', today, 'items', id].join('/');
const line = (text, x) => Object.assign({ text, qty: '2 tubs', station: 'Larder', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, done: false, deleted: false }, x || {});
const bo = { onBy: 'Bo', onById: 'bo', onAt: L.NOW - 600000 };
const extra = { [key('on1')]: line('Dice carrot'), [key('on2')]: line('Pick parsley', bo), [key('on3')]: line('Peel garlic'), [key('on4')]: line('Zest lemons', bo) };
const item = (p, id) => p.evaluate(k => window.__fake.dump()[k] || {}, key(id));
const box = id => '#nbr-' + id + ' .nb-box';
const onBtn = id => '#nbr-' + id + ' .nb-onbtn';
async function tap(p, sel) { await p.click(sel); await L.settle(p, 400); }
(async () => {
  const b = await L.start();

  // Ann on her phone
  let p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1600 });
  // one tap on the box ticks a line, as before: nobody has to learn a second tap
  ok(await p.getAttribute(box('on3'), 'aria-label') === 'Tick Peel garlic', 'the box says Tick, not I\'m on it');
  await tap(p, box('on3'));
  let d = await item(p, 'on3');
  ok(d.done === true && d.preparedById === 'ann' && !d.onById, 'one tap on the box ticks it, for Ann (' + JSON.stringify({ done: d.done, on: d.onById }) + ')');

  // On it: its own button
  ok(/On it/.test(await txt(p, onBtn('on1')) || '') && await p.getAttribute(onBtn('on1'), 'aria-label') === 'I\'m on it: Dice carrot' && await p.getAttribute(onBtn('on1'), 'aria-pressed') === 'false', 'an open line has an On it button');
  await tap(p, onBtn('on1'));
  d = await item(p, 'on1');
  ok(d.done === false && d.onById === 'ann' && d.onBy === 'Ann' && d.onAt > 0, 'On it puts Ann on it, not ticked (' + JSON.stringify({ done: d.done, on: d.onById }) + ')');
  ok(/You're on it/.test(await txt(p, '#nbr-on1 .nb-on') || '') && (await txt(p, box('on1') + ' .nb-on-i') || '').trim() === 'A' && /Ann ✓/.test(await txt(p, onBtn('on1')) || '') && await p.getAttribute(onBtn('on1'), 'aria-pressed') === 'true', 'the line says You\'re on it, the box shows A and the button Ann ✓');
  ok(/You're on it\. Tick it when it is done/.test(await txt(p, '.p-toast') || ''), 'the toast says to tick it when it is done');
  await p.click('.p-toast-btn'); await L.settle(p, 400);
  d = await item(p, 'on1');
  ok(!d.onById && d.done === false, 'Undo takes the stamp off');
  await tap(p, onBtn('on1'));
  ok(await p.getAttribute(onBtn('on1'), 'aria-label') === 'Take me off Dice carrot', 'on her own line the button takes her off');
  await tap(p, onBtn('on1'));
  d = await item(p, 'on1');
  ok(!d.onById && d.done === false && /You are off Dice carrot/.test(await txt(p, '.p-toast') || ''), 'a second tap on On it takes her off (' + JSON.stringify({ on: d.onById }) + ')');
  await tap(p, onBtn('on1')); await tap(p, box('on1'));
  d = await item(p, 'on1');
  ok(d.done === true && d.preparedById === 'ann' && d.doneById === 'ann' && d.onById === '' && d.onAt === 0, 'on it, then one tap on the box ticks it and clears the stamp (' + JSON.stringify({ done: d.done, prep: d.preparedById, on: d.onById }) + ')');

  // Bo's neutral badge and name identify ownership without fading work that Ann can still take over.
  ok(await p.$eval('#nbr-on2', e => e.classList.contains('is-on-other') && getComputedStyle(e).opacity === '1') && /Bo on it/.test(await txt(p, '#nbr-on2 .nb-on') || '') && /Bo ✓/.test(await txt(p, onBtn('on2')) || ''), 'someone else\'s stamp: readable row, Bo on it, Bo ✓ on the button');
  ok(await p.getAttribute(onBtn('on2'), 'aria-label') === 'Take over Pick parsley from Bo' && await p.getAttribute(box('on2'), 'aria-label') === 'Tick Pick parsley, Bo on it', 'its button takes it over; its box still ticks');
  await tap(p, onBtn('on2'));
  d = await item(p, 'on2');
  ok(d.onById === 'ann' && d.done === false && /Taken over from Bo/.test(await txt(p, '.p-toast') || ''), 'On it on Bo\'s line takes it over');
  await tap(p, box('on4'));
  d = await item(p, 'on4');
  ok(d.done === true && d.preparedById === 'ann' && d.onById === '', 'one tap on the box of a line Bo is on ticks it for Ann and clears his stamp');
  ok(p.errors.length === 0 && !(await L.overflow(p)), 'phone: no page errors, no sideways scroll ' + p.errors.join(' | '));
  await p.context().close();

  // Start here leaves out what someone else is on (four or more open lines number the first three)
  const many = Object.assign({}, extra);
  ['m1', 'm2', 'm3', 'm4'].forEach((id, i) => { many[key(id)] = line('Job ' + id, { addedAt: L.NOW - 7200000 + i * 60000 }); });
  Object.assign(many[key('m1')], bo, { onAt: L.NOW - 60000 });
  p = await L.open(b, '#/prep', { who: 'ann', extra: many, wait: 1600 });
  ok(!(await p.$eval('#nbr-m1 .nb-t', e => e.hasAttribute('data-n'))) && await p.$eval('#nbr-m2 .nb-t', e => e.hasAttribute('data-n')), 'Start here skips the job Bo is on');
  await p.context().close();

  // the shared kitchen device: On it asks Who's on it?; the tick asks Who did this? with the cook on it first
  p = await L.open(b, '#/prep', { who: 'sam', settings: { shared: true }, extra, wait: 1600 });
  ok(await p.getAttribute(onBtn('on1'), 'aria-label') === 'Who\'s on it: Dice carrot', 'shared: On it asks who');
  await tap(p, box('on3'));
  ok(/Who did this\?/.test(await txt(p, '#pt-sheet h3') || '') && !(await p.$('#pt-sheet .pt-on')), 'shared: the box asks Who did this?, as before');
  await p.click('#pt-sheet [data-pt="cancel"]'); await L.settle(p, 300);
  await tap(p, onBtn('on1'));
  ok(/Who's on it\?/.test(await txt(p, '#pt-sheet h3') || ''), 'shared: On it asks Who\'s on it?');
  let choice = p.locator('#pt-sheet [data-pt="choose"][data-id="ann"]');
  if (!(await choice.count()) || !(await choice.isVisible())) { await p.locator('#pt-sheet [data-pt="others"]').click(); await L.settle(p, 150); }
  await choice.click(); await L.settle(p, 500);
  d = await item(p, 'on1');
  ok(d.onById === 'ann' && d.done === false && !(await p.$('#pt-sheet')), 'shared: Ann is on it, the sheet closed (' + JSON.stringify({ on: d.onById, done: d.done }) + ')');
  ok(/Ann on it/.test(await txt(p, '#nbr-on1 .nb-on') || '') && !(await p.$eval('#nbr-on1', e => e.classList.contains('is-on-other'))) && /Ann ✓/.test(await txt(p, onBtn('on1')) || ''), 'shared: the line says Ann on it, not greyed, Ann ✓ on the button');
  await tap(p, box('on1'));
  ok(/Who did this\?/.test(await txt(p, '#pt-sheet h3') || '') && await p.$eval('#pt-sheet .pt-on [data-pt="choose"]', e => e.getAttribute('data-id') === 'ann' && document.activeElement === e), 'shared: the tick asks Who did this?, Ann first under On it and focused');
  await p.click('#pt-sheet .pt-on [data-pt="choose"]'); await L.settle(p, 500);
  d = await item(p, 'on1');
  ok(!(await p.$('#pt-sheet')) && d.done === true && d.preparedById === 'ann' && d.doneById === 'sam' && d.onById === '', 'shared: ticked for Ann, Sam recorded it, the stamp cleared');
  ok(await p.getAttribute(onBtn('on2'), 'aria-label') === 'Take Bo off Pick parsley', 'shared: On it on Bo\'s line takes him off');
  await tap(p, onBtn('on2'));
  d = await item(p, 'on2');
  ok(!d.onById && d.done === false && !(await p.$('#pt-sheet')) && /Bo is off Pick parsley/.test(await txt(p, '.p-toast') || ''), 'shared: Bo is off it, with no sheet');
  ok(p.errors.length === 0, 'shared: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a laptop
  p = await L.open(b, '#/prep', { who: 'ann', extra, width: 1280, height: 900, wait: 1600 });
  ok(/Bo on it/.test(await txt(p, '#nbr-on2') || '') && !(await L.overflow(p)), '1280 px: the stamp shows, no sideways scroll');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
