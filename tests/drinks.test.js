// The drinks run: a new person is asked for their usual coffee or drink straight after setting their PIN, people who
// signed up before see a card once, and #/drinks shows everyone's usual so whoever does the run can read the order off the phone.
const L = require('./lib');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
// a group of drink chips folds to one line once something is picked: open it first if it is folded
const pick = async (p, f, v) => {
  if (!(await p.$('[data-f="' + f + '"][data-v="' + v + '"]'))) { await tap(p, '.dr-fold[data-f="' + f + '"]'); await L.settle(p, 100); }
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
  ], sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo', 'kim'], pinOpen: { kim: L.NOW + 7 * 86400000 }, showBadges: true };
  let p = await L.open(b, '#/prep', { who: '', extra: { [fsKey(['config', 'main'])]: cfg }, wait: 1200 });
  await p.click('.p-name[data-id="kim"]');
  await p.keyboard.type('4444'); await L.settle(p, 600);
  await p.keyboard.type('4444'); await L.settle(p, 1000);
  ok(/One more thing, Kim/.test(await txt(p, '#prep-root') || ''), 'first PIN: asked for a usual drink straight after');
  ok(!!(await p.$('[data-p="dk-skip"]')), 'first PIN: Skip for now is offered');
  await tap(p, '[data-p="dk-save"]'); await L.settle(p, 200);
  ok(/Pick a coffee or a cold drink first/.test(await txt(p, '.dr-form') || ''), 'first PIN: saving with nothing picked asks for a drink');
  ok(!(await p.$('[data-f="size"]')), 'form: no size until a coffee is picked');
  ok(!!(await p.$('[data-f="kind"][data-v="flat"]')) && !(await p.$('[data-f="cold"][data-v="water"]')), 'form: a new usual opens on the coffee, the other groups are folded');
  ok(await p.$eval('[data-f="kind"][data-v="flat"]', e => e.closest('.ux-choice-source').nextElementSibling.getBoundingClientRect().height) >= 44, 'form: drink buttons are 44 px to tap');
  await pick(p, 'kind', 'flat'); await L.settle(p, 150);
  ok(!(await p.$('[data-f="kind"][data-v="latte"]')) && /Flat white/.test(await val(p, 'kind') || '') && !!(await p.$('[data-f="milk"][data-v="oat"]')), 'form: picking a coffee folds it and opens Milk');
  await pick(p, 'size', 'large');
  await pick(p, 'milk', 'oat');
  await pick(p, 'shot', 'extra');
  await pick(p, 'sugar', '1'); await L.settle(p, 150);
  await p.fill('[data-k="dk-note"]', 'Extra hot');
  await pick(p, 'cold', 'water'); await L.settle(p, 100);
  await p.fill('[data-k="dk-other"]', 'no ice');
  await pick(p, 'milk', 'skim'); await L.settle(p, 150);
  ok(await p.$eval('[data-k="dk-note"]', e => e.value) === 'Extra hot', 'form: typed words stay while picking');
  await pick(p, 'milk', 'oat'); await L.settle(p, 150);
  const prev = await txt(p, '.dr-prev') || '';
  ok(/Large oat flat white, extra shot, 1 sugar\. Extra hot\. Also Water, no ice/.test(prev), 'form: the preview reads like a cafe order (' + prev + ')');
  await tap(p, '[data-p="dk-save"]'); await L.settle(p, 900);
  let s = await store(p), d = s[fsKey(['drinks', 'kim'])];
  ok(!!d && d.by === 'kim' && d.kind === 'flat' && d.size === 'large' && d.milk === 'oat' && d.shot === 'extra' && d.sugar === '1' && d.note === 'Extra hot' && d.cold === 'water' && d.other === 'no ice' && d.at >= L.NOW, 'save: Kim\'s usual is saved under her own id');
  ok(/Writing as\s*Kim/.test(await txt(p, '.nb-top') || ''), 'save: then the prep list');
  ok(!(await p.$('.dr-nudge')), 'save: no drinks card afterwards');
  ok(p.errors.length === 0, 'first PIN: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a first PIN set on the order list (23 Oct 2026): the drinks run card asks there, and Prep is the prep list after
  p = await L.open(b, '#/orders', { who: '', extra: { [fsKey(['config', 'main'])]: cfg }, wait: 1200 });
  await p.click('.p-name[data-id="kim"]');
  await p.keyboard.type('4444'); await L.settle(p, 600);
  await p.keyboard.type('4444'); await L.settle(p, 1000);
  ok(/Writing as\s*Kim/.test(await txt(p, '.nb-top') || '') && /#\/orders$/.test(p.url()) && !/One more thing/.test(await txt(p, '#prep-root') || ''), 'first PIN on the order list: the order list, not One more thing');
  ok(/New: the drinks run/.test(await txt(p, '.dr-nudge') || ''), 'first PIN on the order list: the drinks run card asks for a usual');
  await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 900);
  ok(!/One more thing/.test(await txt(p, '#prep-root') || '') && !!(await p.$('.nb-left')) && !!(await p.$('.dr-nudge')), 'first PIN on the order list: Prep shows the list with the card, not One more thing');
  ok(p.errors.length === 0, 'first PIN on the order list: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // someone who signed up before: a card once, Not now keeps it away
  const noAnn = { [fsKey(['drinks', 'ann'])]: undefined };
  p = await L.open(b, '#/prep', { who: 'ann', extra: noAnn, wait: 1500 });
  ok(/New: the drinks run/.test(await txt(p, '.dr-nudge') || ''), 'card: Ann (no usual yet) sees the drinks run card');
  await tap(p, '[data-p="dk-later"]'); await L.settle(p, 200);
  ok(!(await p.$('.dr-nudge')), 'card: Not now hides it');
  await p.reload({ waitUntil: 'load' }); await L.settle(p, 1500);
  ok(!(await p.$('.dr-nudge')), 'card: and it stays away after a reload');
  await p.context().close();
  p = await L.open(b, '#/orders', { who: 'ann', extra: noAnn, wait: 1500 });
  ok(!!(await p.$('.dr-nudge')), 'card: shows on the order list too');
  await p.click('.dr-nudge a[data-p="dk-set"]'); await L.settle(p, 800);
  ok(/#\/drinks$/.test(p.url()) && !!(await p.$('.dr-page .dr-form')), 'card: Set my usual opens the drinks run with the form open');
  await pick(p, 'kind', 'tea'); await L.settle(p, 150);
  ok(!(await p.$('[data-f="shot"]')), 'form: tea has no strength');
  await pick(p, 'milk', 'none'); await L.settle(p, 100);
  await tap(p, '[data-p="dk-save"]'); await L.settle(p, 800);
  ok(/Regular tea, no milk/.test(await txt(p, '.dr-mine') || ''), 'save: Your usual shows the new drink (' + await txt(p, '.dr-mine') + ')');
  // espresso: strength only, no size or milk
  await tap(p, '[data-p="dk-edit"]'); await L.settle(p, 150);
  await pick(p, 'kind', 'tea'); await L.settle(p, 100);
  await pick(p, 'kind', 'esp'); await L.settle(p, 150);
  ok(/Espresso/.test(await val(p, 'kind') || '') && !(await p.$('[data-f="milk"]')) && !(await p.$('[data-f="size"]')), 'form: espresso asks no size or milk');
  await pick(p, 'shot', 'decaf'); await L.settle(p, 100);
  await tap(p, '[data-p="dk-save"]'); await L.settle(p, 800);
  ok(/Decaf espresso/.test(await txt(p, '.dr-mine') || ''), 'save: espresso reads back as Decaf espresso (' + await txt(p, '.dr-mine') + ')');
  // a cold drink on its own is a usual too
  await tap(p, '[data-p="dk-edit"]'); await L.settle(p, 150);
  await pick(p, 'kind', 'esp'); await L.settle(p, 100);
  await pick(p, 'cold', 'sparkling'); await L.settle(p, 100);
  await pick(p, 'cold', 'cokens'); await L.settle(p, 100);
  ok(await val(p, 'cold') === 'Coke No Sugar', 'cold: one soft drink or water at a time (' + await val(p, 'cold') + ')');
  await tap(p, '[data-p="dk-save"]'); await L.settle(p, 800);
  ok(/^Your usualCoke No SugarChange$/.test(await txt(p, '.dr-mine') || ''), 'cold: just a soft drink saves as the usual (' + await txt(p, '.dr-mine') + ')');
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
  await tap(p, '.wtop-who'); await L.settle(p, 200);
  ok(!!(await p.$('.wm a[href="#/drinks"]')), 'menu: the chef mark offers Drinks run');
  await p.click('.wm a[href="#/drinks"]'); await L.settle(p, 1000);
  ok(/Drinks run/.test(await txt(p, '#rtitle') || ''), 'page: opens from the menu');
  ok(/Large long black, extra shot/.test(await txt(p, '.dr-mine') || ''), 'page: Sam sees his own usual');
  ok(/Not signed in today: 2 more\. Show them/.test(await txt(p, '.dr-more') || ''), 'page: people not signed in today wait behind a note (' + await txt(p, '.dr-more') + ')');
  await tap(p, '[data-p="dk-all"]'); await L.settle(p, 150);
  ok(/No usual yet: Bo\. Ask them\./.test(await txt(p, '.dr-page') || ''), 'page: the people with no usual share one line (' + await txt(p, '.dr-none') + ')');
  await p.close();
  // Ann and Bo opened the book today, Kim last did yesterday: Sam (on this phone), Ann and Bo show ticked, Kim waits behind the note
  const runCfg = { people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'kim', name: 'Kim Lee', role: 'staff', add: true, tick: true, del: false, active: true }
  ], sousIds: ['sam'], showBadges: true };
  const runSeed = { [fsKey(['config', 'main'])]: runCfg,
    [fsKey(['drinks', 'bo'])]: { kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: '', cold: 'cokens', other: '', at: 1, by: 'bo' },
    [fsKey(['drinks', 'kim'])]: { kind: 'latte', size: 'large', milk: 'skim', shot: '', sugar: '', note: '', cold: '', other: '', at: 1, by: 'kim' },
    [fsKey(['activity', 'ann'])]: { name: 'Ann', lastSeen: L.NOW - 3600000 }, [fsKey(['activity', 'bo'])]: { name: 'Bo', lastSeen: L.NOW - 1800000 },
    [fsKey(['activity', 'kim'])]: { name: 'Kim Lee', lastSeen: L.NOW - 86400000 } };
  p = await L.open(b, '#/drinks', { who: 'sam', extra: runSeed, wait: 1500 });
  const rows = () => p.$$eval('.dr-team .dr-row', l => l.map(e => e.textContent));
  let r = await rows();
  ok(r.length === 3 && r.every(t => t.charAt(0) === '✓') && /Ann/.test(r[0]) && /Bo/.test(r[1]) && /Sam \(you\)/.test(r[2]), 'run: Ann, Bo and Sam (in the book today) show ticked (' + r.join(' / ') + ')');
  ok(/^✓AnnReg oat flat white, 1 sugar\. Coke No Sugar$/.test(r[0]), 'run: one short line per person (' + r[0] + ')');
  ok(/On today\s*3/.test(await txt(p, '.dr-h') || ''), 'run: On today says 3');
  ok(!(await p.$('.dr-team button, [data-p="dk-in"]')), 'run: just a list to read, nobody is ticked by hand');
  ok(!(await p.$('[data-p="dk-share"]')) && !(await p.$('[data-p="dk-clear"]')), 'run: nothing to send or clear');
  ok(!/Kim/.test(await txt(p, '.dr-team') || '') && /^Not signed in today: 1 more\. Show them$/.test(await txt(p, '.dr-more') || ''), 'run: Kim (not in today) waits behind the note');
  const order = await p.$$eval('.dr-order li', l => l.map(e => e.textContent));
  ok(order.length === 3 && /^2 x Regular oat flat white, 1 sugar$/.test(order[0]) && /^2 x Coke No Sugar$/.test(order[1]) && /^1 x Large long black, extra shot$/.test(order[2]), 'run: the same drinks are counted together (' + order.join(' / ') + ')');
  await tap(p, '[data-p="dk-all"]'); await L.settle(p, 150);
  r = await rows();
  ok(r.length === 4 && /^Kim LeeLarge skim latte$/.test(r[3]) && /Not signed in today\s*1/.test(await txt(p, '.dr-h:last-of-type') || ''), 'run: Show them lists Kim, without a tick (' + r[3] + ')');
  ok((await p.$$('.dr-order li')).length === 3 && /^Hide them$/.test(await txt(p, '.dr-more') || ''), 'run: Kim is not in the order, Hide them folds the list again');
  await tap(p, '[data-p="dk-all"]'); await L.settle(p, 150);
  ok((await rows()).length === 3, 'run: Hide them');
  // change it
  await tap(p, '[data-p="dk-edit"]'); await L.settle(p, 150);
  ok(await val(p, 'kind') === 'Long black' && await val(p, 'shot') === 'Extra shot' && !(await p.$('.dr-chips')), 'change: the form starts from the saved usual, every group folded');
  ok(!(await p.$('.dr-team')) && !(await p.$('.dr-order')), 'change: the team list steps aside while the form is open');
  await pick(p, 'kind', 'cap'); await L.settle(p, 100);
  await tap(p, '[data-p="dk-save"]'); await L.settle(p, 800);
  s = await store(p);
  ok(s[fsKey(['drinks', 'sam'])].kind === 'cap' && s[fsKey(['drinks', 'sam'])].by === 'sam', 'change: saved');
  ok(!(await L.overflow(p)), 'page: no sideways scroll at 390 px');
  ok(p.errors.length === 0, 'run: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  for (const w of [768, 1280]) {
    p = await L.open(b, '#/drinks', { who: 'sam', width: w, height: 900, wait: 1500 });
    await tap(p, '[data-p="dk-edit"]'); await L.settle(p, 200);
    const ov = await L.overflow(p);
    ok(!ov, 'page: no sideways scroll at ' + w + ' px ' + (ov || ''));
    await p.context().close();
  }

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
