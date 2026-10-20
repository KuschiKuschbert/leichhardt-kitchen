// The drinks run: a new person is asked for their usual coffee or drink straight after setting their PIN, people who
// signed up before see a card once, and #/drinks shows everyone's usual so whoever does the run can share the order.
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
// a group of drink chips folds to one line once something is picked: open it first if it is folded
const pick = async (p, f, v) => {
  if (!(await p.$('[data-f="' + f + '"][data-v="' + v + '"]'))) { await tap(p, '.dr-fold[data-f="' + f + '"]'); await p.waitForTimeout(100); }
  await tap(p, '[data-f="' + f + '"][data-v="' + v + '"]');
};
const val = (p, f) => txt(p, '.dr-fold[data-f="' + f + '"] .dr-val');
(async () => {
  const b = await L.start();

  // a new person: PIN, then "One more thing"
  const cfg = { people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'kim', name: 'Kim Lee', role: 'staff', add: true, tick: true, del: false, active: true }
  ], sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo', 'kim'], showBadges: true };
  let p = await L.open(b, '#/prep', { who: '', extra: { [fsKey(['config', 'main'])]: cfg }, wait: 1200 });
  await p.click('.p-name[data-id="kim"]');
  await p.keyboard.type('4444'); await p.waitForTimeout(600);
  await p.keyboard.type('4444'); await p.waitForTimeout(1000);
  ok(/One more thing, Kim/.test(await txt(p, '#prep-root') || ''), 'first PIN: asked for a usual drink straight after');
  ok(!!(await p.$('[data-p="dk-skip"]')), 'first PIN: Skip for now is offered');
  await tap(p, '[data-p="dk-save"]'); await p.waitForTimeout(200);
  ok(/Pick a coffee or a cold drink first/.test(await txt(p, '.dr-form') || ''), 'first PIN: saving with nothing picked asks for a drink');
  ok(!(await p.$('[data-f="size"]')), 'form: no size until a coffee is picked');
  ok(!!(await p.$('[data-f="kind"][data-v="flat"]')) && !(await p.$('[data-f="cold"][data-v="water"]')), 'form: a new usual opens on the coffee, the other groups are folded');
  ok(await p.$eval('[data-f="kind"][data-v="flat"]', e => e.getBoundingClientRect().height) >= 44, 'form: drink buttons are 44 px to tap');
  await pick(p, 'kind', 'flat'); await p.waitForTimeout(150);
  ok(!(await p.$('[data-f="kind"][data-v="latte"]')) && /Flat white/.test(await val(p, 'kind') || '') && !!(await p.$('[data-f="milk"][data-v="oat"]')), 'form: picking a coffee folds it and opens Milk');
  await pick(p, 'size', 'large');
  await pick(p, 'milk', 'oat');
  await pick(p, 'shot', 'extra');
  await pick(p, 'sugar', '1'); await p.waitForTimeout(150);
  await p.fill('[data-k="dk-note"]', 'Extra hot');
  await pick(p, 'cold', 'water'); await p.waitForTimeout(100);
  await p.fill('[data-k="dk-other"]', 'no ice');
  await pick(p, 'milk', 'skim'); await p.waitForTimeout(150);
  ok(await p.$eval('[data-k="dk-note"]', e => e.value) === 'Extra hot', 'form: typed words stay while picking');
  await pick(p, 'milk', 'oat'); await p.waitForTimeout(150);
  const prev = await txt(p, '.dr-prev') || '';
  ok(/Large oat flat white, extra shot, 1 sugar\. Extra hot\. Also Water, no ice/.test(prev), 'form: the preview reads like a cafe order (' + prev + ')');
  await tap(p, '[data-p="dk-save"]'); await p.waitForTimeout(900);
  let s = await store(p), d = s[fsKey(['drinks', 'kim'])];
  ok(!!d && d.by === 'kim' && d.kind === 'flat' && d.size === 'large' && d.milk === 'oat' && d.shot === 'extra' && d.sugar === '1' && d.note === 'Extra hot' && d.cold === 'water' && d.other === 'no ice' && d.at >= L.NOW, 'save: Kim\'s usual is saved under her own id');
  ok(/Writing as\s*Kim/.test(await txt(p, '.nb-top') || ''), 'save: then the prep list');
  ok(!(await p.$('.dr-nudge')), 'save: no drinks card afterwards');
  ok(p.errors.length === 0, 'first PIN: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // someone who signed up before: a card once, Not now keeps it away
  const noAnn = { [fsKey(['drinks', 'ann'])]: undefined };
  p = await L.open(b, '#/prep', { who: 'ann', extra: noAnn, wait: 1500 });
  ok(/New: the drinks run/.test(await txt(p, '.dr-nudge') || ''), 'card: Ann (no usual yet) sees the drinks run card');
  await tap(p, '[data-p="dk-later"]'); await p.waitForTimeout(200);
  ok(!(await p.$('.dr-nudge')), 'card: Not now hides it');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
  ok(!(await p.$('.dr-nudge')), 'card: and it stays away after a reload');
  await p.context().close();
  p = await L.open(b, '#/orders', { who: 'ann', extra: noAnn, wait: 1500 });
  ok(!!(await p.$('.dr-nudge')), 'card: shows on the order list too');
  await p.click('.dr-nudge a[data-p="dk-set"]'); await p.waitForTimeout(800);
  ok(/#\/drinks$/.test(p.url()) && !!(await p.$('.dr-page .dr-form')), 'card: Set my usual opens the drinks run with the form open');
  await pick(p, 'kind', 'tea'); await p.waitForTimeout(150);
  ok(!(await p.$('[data-f="shot"]')), 'form: tea has no strength');
  await pick(p, 'milk', 'none'); await p.waitForTimeout(100);
  await tap(p, '[data-p="dk-save"]'); await p.waitForTimeout(800);
  ok(/Regular tea, no milk/.test(await txt(p, '.dr-mine') || ''), 'save: Your usual shows the new drink (' + await txt(p, '.dr-mine') + ')');
  // a cold drink on its own is a usual too
  await tap(p, '[data-p="dk-edit"]'); await p.waitForTimeout(150);
  await pick(p, 'kind', 'tea'); await p.waitForTimeout(100);
  await pick(p, 'cold', 'sparkling'); await p.waitForTimeout(100);
  await pick(p, 'cold', 'cokens'); await p.waitForTimeout(100);
  ok(await val(p, 'cold') === 'Coke No Sugar', 'cold: one soft drink or water at a time (' + await val(p, 'cold') + ')');
  await tap(p, '[data-p="dk-save"]'); await p.waitForTimeout(800);
  ok(/^Your usualCoke No SugarChange it$/.test(await txt(p, '.dr-mine') || ''), 'cold: just a soft drink saves as the usual (' + await txt(p, '.dr-mine') + ')');
  const ac = (await store(p))[fsKey(['drinks', 'ann'])];
  ok(ac.kind === '' && ac.cold === 'cokens' && ac.milk === '' && ac.sugar === '', 'cold: saved with no coffee');
  ok(p.errors.length === 0, 'card: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // a person with a usual already: no card, and the check is not read again on this phone
  p = await L.open(b, '#/prep', { who: 'bo', wait: 1500 });
  ok(!(await p.$('.dr-nudge')), 'card: Bo (has a usual) sees no card');
  ok(await p.evaluate(() => localStorage.getItem('lk.drink.bo')) === 'set', 'card: the phone remembers Bo has one');
  await p.context().close();

  // the drinks run: from the chef mark menu, tick who is in, the order counts the same drinks together
  p = await L.open(b, '#/', { who: 'sam', extra: { [fsKey(['drinks', 'bo'])]: undefined, [fsKey(['drinks', 'kim'])]: undefined }, wait: 1500 });
  await tap(p, '.wtop-who'); await p.waitForTimeout(200);
  ok(!!(await p.$('.wm a[href="#/drinks"]')), 'menu: the chef mark offers Drinks run');
  await p.click('.wm a[href="#/drinks"]'); await p.waitForTimeout(1000);
  ok(/Drinks run/.test(await txt(p, '#rtitle') || ''), 'page: opens from the menu');
  ok(/Large long black, extra shot/.test(await txt(p, '.dr-mine') || ''), 'page: Sam sees his own usual');
  ok(/Not signed in today: 2 more people/.test(await txt(p, '.dr-more') || ''), 'page: people not signed in today wait behind a note (' + await txt(p, '.dr-more') + ')');
  await tap(p, '[data-p="dk-all"]'); await p.waitForTimeout(150);
  ok(/No usual yet: Bo\. Ask them\./.test(await txt(p, '.dr-team') || ''), 'page: the people with no usual share one line (' + await txt(p, '.dr-team .is-none') + ')');
  await p.close();
  // Ann opened the book today, Bo last did yesterday: Sam (on this phone) and Ann are in by themselves, Bo waits behind the note
  const runSeed = { [fsKey(['drinks', 'bo'])]: { kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: '', cold: 'cokens', other: '', at: 1, by: 'bo' },
    [fsKey(['activity', 'ann'])]: { name: 'Ann', lastSeen: L.NOW - 3600000 }, [fsKey(['activity', 'bo'])]: { name: 'Bo', lastSeen: L.NOW - 86400000 } };
  p = await L.open(b, '#/drinks', { who: 'sam', extra: runSeed, wait: 1500 });
  const pressed = id => p.$eval('[data-p="dk-in"][data-id="' + id + '"]', e => e.getAttribute('aria-pressed')).catch(() => null);
  ok(await pressed('sam') === 'true' && await pressed('ann') === 'true', 'run: Sam and Ann (in the book today) are in by themselves');
  ok(await pressed('bo') === null && /Not signed in today: 1 more person/.test(await txt(p, '.dr-more') || ''), 'run: Bo (not in today) is behind the note');
  ok(/2 people/.test(await txt(p, '.dr-run h3') || ''), 'run: the order starts with 2 people');
  await tap(p, '[data-p="dk-in"][data-id="sam"]'); await p.waitForTimeout(100);
  await tap(p, '[data-p="dk-all"]'); await p.waitForTimeout(150);
  await tap(p, '[data-p="dk-in"][data-id="bo"]'); await p.waitForTimeout(150);
  ok(await pressed('sam') === 'false' && await pressed('bo') === 'true', 'run: Sam taken out, Bo added by hand');
  const order = await p.$$eval('.dr-order li', l => l.map(e => e.textContent));
  ok(order.length === 2 && /^2 x Regular oat flat white, 1 sugar$/.test(order[0]) && /^2 x Coke No Sugar$/.test(order[1]), 'run: the same drinks are counted together (' + order.join(' / ') + ')');
  ok(/2 people/.test(await txt(p, '.dr-run h3') || ''), 'run: says 2 people');
  ok(!(await p.$('[data-p="dk-share"]')) && !(await p.$('[data-p="dk-clear"]')), 'run: just for looking at, nothing to send or clear');
  await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
  ok((await p.$$('.dr-order li')).length === 2 && await pressed('bo') === 'true', 'run: who is in stays after a reload, Bo still shows');
  await tap(p, '[data-p="dk-in"][data-id="bo"]'); await p.waitForTimeout(150);
  ok((await p.$$eval('.dr-order li', l => l.map(e => e.textContent))).some(t => /^1 x Regular oat flat white/.test(t)), 'run: untick Bo, 1 flat white');
  // change it
  await tap(p, '[data-p="dk-edit"]'); await p.waitForTimeout(150);
  ok(await val(p, 'kind') === 'Long black' && await val(p, 'shot') === 'Extra shot' && !(await p.$('.dr-chips')), 'change: the form starts from the saved usual, every group folded');
  ok(!(await p.$('.dr-runbox')), 'change: the team list steps aside while the form is open');
  await pick(p, 'kind', 'cap'); await p.waitForTimeout(100);
  await tap(p, '[data-p="dk-save"]'); await p.waitForTimeout(800);
  s = await store(p);
  ok(s[fsKey(['drinks', 'sam'])].kind === 'cap' && s[fsKey(['drinks', 'sam'])].by === 'sam', 'change: saved');
  ok(!(await L.overflow(p)), 'page: no sideways scroll at 390 px');
  ok(p.errors.length === 0, 'run: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  for (const w of [768, 1280]) {
    p = await L.open(b, '#/drinks', { who: 'sam', width: w, height: 900, wait: 1500 });
    await tap(p, '[data-p="dk-in"][data-id="sam"]'); await tap(p, '[data-p="dk-edit"]'); await p.waitForTimeout(200);
    const ov = await L.overflow(p);
    ok(!ov, 'page: no sideways scroll at ' + w + ' px ' + (ov || ''));
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
