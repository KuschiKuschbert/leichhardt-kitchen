// The PIN screens open the keyboard by themselves: the kitchen PIN box and the own PIN box take focus as soon as they
// show (number pad from inputmode), the page heading does not take it back, and the own PIN box is already there while
// the book checks whether the person has a PIN, so a PIN typed early still goes in (19 Oct 2026).
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const active = p => p.evaluate(() => { const a = document.activeElement; return a ? (a.id || a.tagName) + ':' + (a.getAttribute('inputmode') || '') : ''; });
(async () => {
  const b = await L.start();
  // a phone with no kitchen PIN yet
  let p = await L.open(b, '#/prep', { noPin: true, who: '' });
  ok((await active(p)) === 'p-pin:numeric', 'kitchen PIN: the box has focus and asks for the number pad (' + await active(p) + ')');
  await p.keyboard.type('0000');   // typed with no click: only lands when the box already has focus (the stand-in's kitchen PIN is 6 digits, so this one is wrong and no names come up; the point is that the gate took it)
  await p.waitForTimeout(800);
  ok(/Who are you\?/.test(await txt(p, '#prep-root') || ''), 'kitchen PIN typed straight in: the gate took the four digits and moved on');
  await p.context().close();
  // the names screen on a phone that has the kitchen PIN
  p = await L.open(b, '#/prep', { who: '' });
  await p.click('.p-name[data-id="ann"]');
  ok((await active(p)) === 'pf1:numeric', 'own PIN: the box is there and has focus straight after the tap on the name (' + await active(p) + ')');
  await p.keyboard.type('2222');
  await p.waitForTimeout(900);
  ok(/Writing as\s*Ann/.test(await txt(p, '.nb-top') || ''), 'own PIN typed straight in: Ann is signed in (' + (await txt(p, '.nb-top') || '').trim() + ')');
  ok(p.errors.length === 0, 'pin keyboard phone: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a computer: the heading normally takes focus on a new page, but not from the PIN box
  p = await L.open(b, '#/prep', { noPin: true, who: '', width: 1280, height: 900 });
  ok((await active(p)) === 'p-pin:numeric', 'computer: the kitchen PIN box keeps focus over the heading (' + await active(p) + ')');
  await p.context().close();
  p = await L.open(b, '#/settings', { width: 1280, height: 900 });
  ok(/^rtitle:/.test(await active(p)), 'computer: other pages still move focus to the heading (' + await active(p) + ')');
  await p.context().close();

  // a person with no PIN yet, typed before the book knows: the first four digits stay and the cursor moves on
  const key = ['kitchens', L.PIN, 'config', 'main'].join('/');
  const extra = {}; extra[key] = { people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
    { id: 'kim', name: 'Kim', role: 'staff', add: true, tick: true, del: false, active: true }
  ], sousIds: ['sam'], staffIds: ['sam', 'kim'], showBadges: true };
  p = await L.open(b, '#/prep', { who: '', extra });
  await p.click('.p-name[data-id="kim"]');
  await p.keyboard.type('4444');
  await p.waitForTimeout(900);
  ok(/choose your PIN/.test(await txt(p, '#prep-root') || ''), 'new person: asked to choose a PIN');
  ok((await active(p)) === 'pf2:numeric', 'new person: after four digits the cursor is in "Type it again" (' + await active(p) + ')');
  await p.keyboard.type('4444');
  await p.waitForTimeout(900);
  ok(/One more thing, Kim/.test(await txt(p, '#prep-root') || ''), 'new person: asked for a usual drink straight after the PIN');
  await p.click('[data-p="dk-skip"]');
  await p.waitForTimeout(300);
  ok(/Writing as\s*Kim/.test(await txt(p, '.nb-top') || ''), 'new person: signed in with the PIN typed early (' + (await txt(p, '.nb-top') || '').trim() + ')');
  ok(p.errors.length === 0, 'pin keyboard new person: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
