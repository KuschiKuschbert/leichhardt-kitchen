// Signing in on a shared kitchen tablet (usability U2b, 20 Oct 2026). After the 10 minute lock the lists still show;
// a tap that writes asks who you are, then does that same thing; typed text stays; people from today come first;
// wrong PINs only make that one person wait.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const today = L.ymd(new Date(L.NOW));
const item = (p, id) => p.evaluate(a => window.__fake.dump()[['kitchens', a.pin, 'days', a.d, 'items', a.id].join('/')], { pin: L.PIN, d: today, id });
const lineBy = (p, text) => p.evaluate(a => { const s = window.__fake.dump(); const k = Object.keys(s).filter(k => k.indexOf('/days/' + a.d + '/items/') > 0 && s[k].text === a.t)[0]; return k ? s[k] : null; }, { d: today, t: text });
async function pin(p, name, digits) { await p.click('.p-name[data-id="' + name + '"]'); await L.settle(p, 250); await p.keyboard.type(digits); await L.settle(p, 900); }
async function idle(p) { await p.clock.runFor(11 * 60000); await L.settle(p, 300); }
(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/prep', { who: 'sam', touch: true, settings: { shared: true }, wait: 1200 });
  await p.fill('#p-text', 'Half typed');
  await idle(p);
  ok(await p.$('.nb-guest') !== null && await p.$('#nbr-i1') !== null, 'after the lock the list still shows, with the sign-in bar');
  ok(await p.inputValue('#p-text') === 'Half typed', 'the half-typed line is still in the box');
  ok(await p.$('[data-p="tick"][data-id="i1"]') !== null, 'tick boxes still show');

  // a tick asks who you are, then ticks
  await p.click('[data-p="tick"][data-id="i1"]');
  await L.settle(p, 300);
  ok(await p.$('.p-name') !== null && /Then it is done for you/.test(await txt(p, '.p-card') || ''), 'a tick asks who you are first');
  ok(await p.evaluate(() => [...document.querySelectorAll('.p-names')][0].querySelector('.p-name').getAttribute('data-id')) === 'sam', 'Sam, signed in here today, is listed first');
  ok(/Here today/.test(await txt(p, '.p-card') || ''), 'the list says Here today');
  await pin(p, 'sam', '1111');
  const i1 = await item(p, 'i1');
  ok(i1 && i1.done === true && i1.doneById === 'sam', 'after the PIN the line is ticked by Sam (' + JSON.stringify(i1 && { done: i1.done, by: i1.doneById }) + ')');
  ok(/Writing as\s*Sam/.test(await txt(p, '.nb-top') || ''), 'Sam is signed in');

  // Enter in the add box asks who you are, then adds the typed line under that person
  await idle(p);
  await p.press('#p-text', 'Enter');
  await L.settle(p, 300);
  ok(await p.$('.p-name') !== null, 'Enter with a typed line asks who you are');
  await pin(p, 'ann', '2222');
  const ht = await lineBy(p, 'Half typed');
  ok(ht && ht.addedById === 'ann', 'after the PIN the typed line is added by Ann (' + (ht && ht.addedById) + ')');

  // Back to the list puts the list back with nothing done
  await idle(p);
  await p.click('[data-p="guest-who"]');
  await L.settle(p, 200);
  await p.click('[data-p="who-back"]');
  await L.settle(p, 200);
  ok(await p.$('.nb-guest') !== null, 'Back to the list returns to the list');

  // wrong PINs make only that person wait
  await p.click('[data-p="guest-who"]'); await L.settle(p, 200);
  await p.click('.p-name[data-id="bo"]'); await L.settle(p, 250);
  // one try every 20 seconds per person (PIN sessions, 22 Oct 2026), so each wrong PIN is typed 21 seconds after the last
  for (let k = 0; k < 3; k++) { if (k) await p.clock.runFor(21000); await p.keyboard.type('9999'); await L.settle(p, 600); }
  ok(/Too many wrong tries/.test(await txt(p, '.p-card') || ''), 'three wrong PINs make Bo wait');
  await p.click('[data-p="who-change"]'); await L.settle(p, 200);
  await pin(p, 'ann', '2222');
  ok(/Writing as\s*Ann/.test(await txt(p, '.nb-top') || ''), 'Ann can still sign in straight after');
  ok(p.errors.length === 0, 'shared tablet: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a new starter's first PIN on a shared tablet (23 Oct 2026): the tick that asked who they are is done under them, and
  // the drinks run card asks for their usual instead of taking the prep list over
  const kimCfg = { people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'kim', name: 'Kim Lee', role: 'staff', add: true, tick: true, del: false, active: true }
  ], sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo', 'kim'], showBadges: true };
  p = await L.open(b, '#/prep', { who: '', touch: true, settings: { shared: true }, extra: { [['kitchens', L.PIN, 'config', 'main'].join('/')]: kimCfg }, wait: 1200 });
  await p.click('[data-p="tick"][data-id="i1"]'); await L.settle(p, 300);
  await p.click('.p-name[data-id="kim"]'); await L.settle(p, 300);
  await p.keyboard.type('4444'); await L.settle(p, 600);
  await p.keyboard.type('4444'); await L.settle(p, 1200);
  const k1 = await item(p, 'i1');
  ok(k1 && k1.done === true && k1.doneById === 'kim', 'first PIN: the tick is done under Kim (' + JSON.stringify(k1 && { done: k1.done, by: k1.doneById }) + ')');
  ok(!/That line has changed/.test(await txt(p, '#prep-root') || '') && !/One more thing/.test(await txt(p, '#prep-root') || '') && !!(await p.$('.dr-nudge')), 'first PIN: the list with the drinks run card, not One more thing');
  ok(p.errors.length === 0, 'first PIN: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the old shared wait goes to the first person who types a PIN, once
  p = await L.open(b, '#/prep', { who: '', touch: true, settings: { shared: true }, wait: 1200 });
  await p.evaluate(n => localStorage.setItem('lk.prep.lock', JSON.stringify({ n: 0, f: 1, until: n + 600000 })), L.NOW);
  await p.click('[data-p="guest-who"]'); await L.settle(p, 200);
  await pin(p, 'bo', '3333');
  ok(/Too many wrong tries/.test(await txt(p, '.p-card') || ''), 'old shared wait: still applies to the first person');
  ok(await p.evaluate(() => !localStorage.getItem('lk.prep.lock') && !!localStorage.getItem('lk.prep.lock.bo')), 'old shared wait: moved to that person');
  await p.click('[data-p="who-change"]'); await L.settle(p, 200);
  await pin(p, 'ann', '2222');
  ok(/Writing as\s*Ann/.test(await txt(p, '.nb-top') || ''), 'old shared wait: the next person is not held up');
  await p.context().close();

  // a personal phone with nobody picked still opens on the names, as before
  p = await L.open(b, '#/prep', { who: '', wait: 1200 });
  ok(await p.$('.p-name') !== null && await p.$('.nb-guest') === null, 'personal phone: the names screen, no sign-in bar');
  await p.context().close();

  // orders on a shared tablet: the list shows, and Add asks who you are, then adds the line
  p = await L.open(b, '#/orders', { who: '', touch: true, settings: { shared: true }, wait: 1500 });
  ok(await p.$('.nb-guest') !== null && /Milk/.test(await txt(p, '.o-page') || ''), 'orders: the list and sign-in bar show');
  await p.fill('#o-text', 'Eggs');
  await p.press('#o-text', 'Enter');
  await L.settle(p, 300);
  ok(await p.$('.p-name') !== null, 'orders: Add asks who you are');
  await pin(p, 'ann', '2222');
  ok(await p.evaluate(() => Object.values(window.__fake.dump()).some(v => v && v.text === 'Eggs' && v.addedById === 'ann')), 'orders: after the PIN Eggs is added by Ann');
  ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
