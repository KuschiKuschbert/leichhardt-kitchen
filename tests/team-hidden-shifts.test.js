// A shift hidden on Today's team until someone is on it (head chef, 15 Nov 2026, docs/occasional-shifts-options/brief.md,
// B repaired): Admin, Kitchen, Shifts sets it; Add staff and a person's details show it as "+ Smoker" until someone on
// that date's draft is on it; the roster never fills it; Home and the grid do not change. Made-up staff, the stand-in.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW));
const CFG = key('config', 'main'), TEAM = key('team', today);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true },
  { id: 'cam', name: 'Cam', role: 'staff', active: true, add: true, tick: true }
];
// Smoker is first in the Kitchen order: before this change Add staff ticked it by itself on an empty day
const SHIFTS = [
  { id: 'smoker', name: 'Smoker', from: 360, to: 660, off: false, occ: true },
  { id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false },
  { id: 'dinner', name: 'Dinner', from: 960, to: 1320, off: false }
];
const SECS = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'larder', name: 'Larder' }];
const config = (shifts = SHIFTS) => ({ people, sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo', 'cam'], kitShifts: shifts, kitSecs: SECS });
const plan = on => ({ day: today, on, br: [], v: 1, at: L.NOW, upd: L.NOW, by: 'sam' });
const DOUBLES = ['ann', 'bo'].flatMap(id => [{ id, sh: 'lunch', sec: 'grill' }, { id, sh: 'dinner', sec: 'pans' }]);
const field = k => '[data-k="' + k + '"]';
const boxes = p => p.$$eval('.tm-quick-services label', l => l.map(e => e.textContent.trim() + (e.querySelector('input').checked ? ' [x]' : '')));
const plus = p => p.$$eval('.tm-quick-services [data-p="tm-occ-show"]', l => l.map(e => e.textContent.trim()));
const chips = p => p.$$eval('.tm-bench-shifts button', l => l.map(e => e.textContent.trim()));
const writes = p => p.evaluate(() => window.__fake.writes.filter(batch => batch.some(op => /\/team\//.test(op.path))).length);
const click = async (p, sel) => { await p.locator(sel).first().click(); await L.settle(p, 200); };

(async () => {
  const b = await L.start();

  // 1. An empty day: Add staff opens by itself. Smoker is not a box and never the one ticked by itself.
  let p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: { [CFG]: config() }, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.tm-quick-services'), null, 7000);
  ok(JSON.stringify(await boxes(p)) === JSON.stringify(['Lunch [x]', 'Dinner']), 'empty day: Add staff shows Lunch (ticked) and Dinner, no Smoker box, though Smoker is first in the Kitchen order (' + (await boxes(p)).join(', ') + ')');
  ok(JSON.stringify(await plus(p)) === JSON.stringify(['+ Smoker']), 'empty day: Smoker is offered as + Smoker after the boxes');
  ok(await p.$eval('[data-p="tm-occ-show"]', e => e.getAttribute('aria-label')) === 'Add Smoker to the services for this group', 'empty day: + Smoker says what it does to a screen reader');
  await click(p, '[data-p="tm-occ-show"]');
  ok(JSON.stringify(await boxes(p)) === JSON.stringify(['Lunch [x]', 'Dinner', 'Smoker [x]']), '+ Smoker in Add staff: the Smoker box shows, ticked, and Lunch stays ticked (' + (await boxes(p)).join(', ') + ')');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-k')) === 'tm-quick-shift:smoker', '+ Smoker in Add staff: the focus moves to the new Smoker box');
  await p.locator(field('tm-quick-shift:lunch')).setChecked(false); await L.settle(p, 150);
  await p.locator(field('tm-quick-person:cam')).setChecked(true); await L.settle(p, 150);
  ok(JSON.stringify(await boxes(p)) === JSON.stringify(['Lunch', 'Dinner', 'Smoker [x]']), 'Add staff: Smoker stays shown once unticked Lunch leaves it the only service');
  await click(p, '[data-p="tm-quick-add"]');
  await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:cam:smoker"]'), null, 4000);
  ok(await p.locator('select[data-k^="tm-sec:cam:"]').count() === 1, 'Add selected staff: Cam is on Smoker only, from the boxes on screen');
  ok(await writes(p) === 0, 'Add staff and + Smoker save nothing by themselves');
  ok(p.errors.length === 0, 'empty day: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. A day with Ann and Bo on Lunch and Dinner: + Smoker in Ann's details puts her on Smoker in one tap
  for (const width of [390, 1280]) {
    p = await L.open(b, '#/team', { who: 'sam', width, extra: { [CFG]: config(), [TEAM]: plan(DOUBLES) }, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:ann:dinner"]'), null, 7000);
    ok(!await p.locator('select[data-k^="tm-sec:"][data-k$=":smoker"]').count(), width + ': nobody is on Smoker, so the grid has no Smoker column');
    await click(p, '.tm-focus-toolbar [data-p="tm-add-staff"]');
    ok(JSON.stringify(await plus(p)) === JSON.stringify(['+ Smoker']) && !(await boxes(p)).some(t => /Smoker/.test(t)), width + ': Add staff offers + Smoker, not a Smoker box');
    await click(p, '.tm-focus-toolbar [data-p="tm-add-staff"]');
    await click(p, '[data-p="tm-focus"][data-id="ann"]');
    ok(JSON.stringify(await chips(p)) === JSON.stringify(['Lunch', 'Dinner', '+ Smoker']), width + ': Ann\'s details offer Lunch, Dinner and + Smoker (' + (await chips(p)).join(', ') + ')');
    const before = await writes(p);
    await click(p, '[data-p="tm-on"][data-occ="1"][data-id="ann"]');
    ok(await p.locator('select[data-k="tm-sec:ann:smoker"]').count() === 1, width + ': + Smoker puts Ann on Smoker; the grid gains its Smoker column');
    ok(JSON.stringify(await chips(p)) === JSON.stringify(['Lunch', 'Dinner', 'Smoker']), width + ': the tapped chip is now the Smoker chip in the same place');
    ok(await p.evaluate(() => { const a = document.activeElement; return !!a && a.getAttribute('data-p') === 'tm-sh' && a.getAttribute('data-v') === 'smoker' && a.getAttribute('aria-pressed') === 'true'; }), width + ': the focus stays on the pressed Smoker chip');
    ok(/Ann added to Smoker\. Not saved yet\./.test(await L.txt(p, '.tm-page') || ''), width + ': the page says in words who was added and that it is not saved');
    ok(await p.$eval('.tm-detail-workbench', e => e.dataset.sh) === 'smoker', width + ': the details are on Ann\'s Smoker');
    ok(await writes(p) === before, width + ': nothing is saved until Save');
    await click(p, '[data-p="tm-focus"][data-id="bo"]');
    ok(JSON.stringify(await chips(p)) === JSON.stringify(['Lunch', 'Dinner', 'Smoker (off)']), width + ': with Ann on it, Smoker shows as usual for Bo (' + (await chips(p)).join(', ') + ')');
    // a mistaken Remove is undone in place: Smoker stays shown for this date
    await click(p, '[data-p="tm-focus"][data-id="ann"]');
    await click(p, '[data-p="tm-sh"][data-id="ann"][data-v="smoker"]');
    await click(p, '[data-p="tm-on"][data-id="ann"][data-sh="smoker"]');
    ok(!await p.locator('select[data-k="tm-sec:ann:smoker"]').count() && JSON.stringify(await chips(p)) === JSON.stringify(['Lunch', 'Dinner', 'Smoker (off)']), width + ': after Remove, Smoker stays shown for this date, as Smoker (off)');
    ok(await p.locator('[data-p="tm-on"][data-id="ann"][data-sh="smoker"]').textContent() === 'Add Smoker', width + ': Add Smoker is still there to undo it');
    ok(!(await L.overflow(p)), width + ': no sideways scroll');
    ok(p.errors.length === 0, width + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // 3. Cam is already on the hidden Smoker in the saved plan: it shows everywhere as usual
  p = await L.open(b, '#/team', { who: 'sam', width: 390, extra: { [CFG]: config(), [TEAM]: plan(DOUBLES.concat([{ id: 'cam', sh: 'smoker', sec: 'larder' }])) }, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:cam:smoker"]'), null, 7000);
  await click(p, '.tm-focus-toolbar [data-p="tm-add-staff"]');
  ok((await boxes(p)).some(t => /^Smoker/.test(t)) && !(await plus(p)).length, 'someone on it: Add staff shows the Smoker box, no + Smoker');
  await click(p, '.tm-focus-toolbar [data-p="tm-add-staff"]');
  await click(p, '[data-p="tm-focus"][data-id="ann"]');
  ok(JSON.stringify(await chips(p)) === JSON.stringify(['Lunch', 'Dinner', 'Smoker (off)']), 'someone on it: Ann\'s details show Smoker (off) as before');
  await p.context().close();

  // 4. Home: Ann on the hidden Smoker this morning still sees it as her shift (only Today's team's choices hide it)
  const morning = L.NOW - 6 * 3600000;   // 08:00 kitchen time
  p = await L.open(b, '#/', { who: 'ann', width: 390, clock: morning, extra: { [CFG]: config(), [TEAM]: plan([{ id: 'ann', sh: 'smoker', sec: 'larder' }, { id: 'ann', sh: 'lunch', sec: 'grill' }]) }, wait: 2000 });
  await L.settle(p, 800);
  ok(/Smoker/.test(await p.evaluate(() => document.body.innerText)) && /Larder/.test(await p.evaluate(() => document.body.innerText)), 'Home at 08:00: Ann sees her Smoker shift and its section');
  ok(p.errors.length === 0, 'Home: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // 5. Admin, Kitchen, Shifts: the tick box names its shift, saves, and survives a later save of something else
  const plain = SHIFTS.map(s => Object.assign({}, s, { occ: false }));
  p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, adminPage: '', wait: 2500, extra: { [CFG]: config(plain) } });
  await L.kitchenRow(p, 'shifts');
  const labels = await p.$$eval('.a-sh-occ', l => l.map(e => e.textContent.trim()));
  ok(JSON.stringify(labels) === JSON.stringify(['Hide Smoker on Today\'s team until someone is on it', 'Hide Lunch on Today\'s team until someone is on it', 'Hide Dinner on Today\'s team until someone is on it']), 'admin: each shift has its own tick box, named (' + labels.join(' | ') + ')');
  await p.locator('[data-a="shocc"][data-i="0"]').setChecked(true); await L.settle(p, 300);
  await p.locator('[data-p="a-save"]').click(); await L.settle(p, 1200);
  let saved = (await p.evaluate(k => window.__fake.dump()[k], CFG)).kitShifts;
  ok(saved.map(s => s.id + ':' + s.occ).join(' ') === 'smoker:true lunch:false dinner:false', 'admin: Save changes keeps Smoker hidden on Today\'s team (' + JSON.stringify(saved) + ')');
  await p.evaluate(() => { const e = document.querySelector('[data-a="shfrom"][data-i="1"]'); e.value = '10:30'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); });
  await L.settle(p, 300);
  await p.locator('[data-p="a-save"]').click(); await L.settle(p, 1200);
  saved = (await p.evaluate(k => window.__fake.dump()[k], CFG)).kitShifts;
  ok(saved[0].occ === true && saved[1].from === 630, 'admin: a later save of Lunch\'s time keeps Smoker hidden');
  ok(p.errors.length === 0, 'admin: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
