// A shift hidden on Today's team until someone is on it (head chef, 15 Nov 2026, docs/occasional-shifts-options/brief.md,
// B repaired): Admin, Kitchen, Shifts sets it; Add staff shows it as "+ Smoker" and a person's Add a service lists it
// "(hidden until someone is on it)" (step two, 16 Nov 2026) until someone on that date's draft is on it; the roster never
// fills it; Home and the rows do not change. Made-up staff, the stand-in.
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
// a person's row: the services they are on (the lines) and the ones they are not (Add a service), both in time order
const lines = (p, id) => p.$$eval('.tm-tlrow[data-id="' + id + '"] .tm-tlsvc', l => l.map(e => e.dataset.sh));
const adds = (p, id) => p.$$eval('select[data-k="tm-addsvc:' + id + '"] option', l => l.map(e => e.textContent).filter(t => t !== 'Add a service'));
const heads = p => p.$$eval('.tm-planhead .tm-grid-sh > b', l => l.map(e => e.textContent));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
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
  ok(JSON.stringify(await boxes(p)) === JSON.stringify(['Smoker [x]', 'Lunch [x]', 'Dinner']), '+ Smoker in Add staff: the Smoker box shows, ticked, in time order (06:00 first), and Lunch stays ticked (' + (await boxes(p)).join(', ') + ')');
  ok(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-k')) === 'tm-quick-shift:smoker', '+ Smoker in Add staff: the focus moves to the new Smoker box');
  await p.locator(field('tm-quick-shift:lunch')).setChecked(false); await L.settle(p, 150);
  await p.locator(field('tm-quick-person:cam')).setChecked(true); await L.settle(p, 150);
  ok(JSON.stringify(await boxes(p)) === JSON.stringify(['Smoker [x]', 'Lunch', 'Dinner']), 'Add staff: Smoker stays shown once unticked Lunch leaves it the only service');
  await click(p, '[data-p="tm-quick-add"]');
  await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:cam:smoker"]'), null, 4000);
  ok(await p.locator('select[data-k^="tm-sec:cam:"]').count() === 1, 'Add selected staff: Cam is on Smoker only, from the boxes on screen');
  ok(await writes(p) === 0, 'Add staff and + Smoker save nothing by themselves');
  ok(p.errors.length === 0, 'empty day: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // 2. A day with Ann and Bo on Lunch and Dinner: Add a service puts Ann on the hidden Smoker in one pick
  for (const width of [390, 1280]) {
    p = await L.open(b, '#/team', { who: 'sam', width, extra: { [CFG]: config(), [TEAM]: plan(DOUBLES) }, wait: 1500 });
    await L.waitFor(p, () => !!document.querySelector('select[data-k="tm-sec:ann:dinner"]'), null, 7000);
    ok(!await p.locator('select[data-k^="tm-sec:"][data-k$=":smoker"]').count() && same(await heads(p), ['Lunch', 'Dinner']), width + ': nobody is on Smoker, so no row has a Smoker line and the head has no Smoker');
    await click(p, '.tm-focus-toolbar [data-p="tm-add-staff"]');
    ok(JSON.stringify(await plus(p)) === JSON.stringify(['+ Smoker']) && !(await boxes(p)).some(t => /Smoker/.test(t)), width + ': Add staff offers + Smoker, not a Smoker box');
    await click(p, '.tm-focus-toolbar [data-p="tm-add-staff"]');
    // the chips "+ Smoker, Lunch, Dinner" became the lines (on) and Add a service (not on), both in time order
    ok(same(await lines(p, 'ann'), ['lunch', 'dinner']) && same(await adds(p, 'ann'), ['Smoker 06:00 to 11:00 (hidden until someone is on it)']), width + ': Ann is on Lunch and Dinner, and her Add a service offers Smoker, saying it is hidden until someone is on it (' + (await adds(p, 'ann')).join(', ') + ')');
    const before = await writes(p);
    await L.pick(p, 'select[data-k="tm-addsvc:ann"]', 'smoker');
    ok(await p.locator('select[data-k="tm-sec:ann:smoker"]').count() === 1 && same(await heads(p), ['Smoker', 'Lunch', 'Dinner']), width + ': one pick puts Ann on Smoker; the head gains Smoker, first in time order');
    ok(same(await lines(p, 'ann'), ['smoker', 'lunch', 'dinner']) && !await p.locator('select[data-k="tm-addsvc:ann"]').count(), width + ': Ann\'s Smoker line comes first, in time order, and Add a service goes, as she is on every service');
    // the chip that kept the focus is gone: the focus lands on Ann's new Smoker line, never on the page
    const focus = await p.evaluate(() => { const a = document.activeElement, line = a && a.closest('.tm-tlrow[data-id="ann"] .tm-tlsvc'); return line ? 'smoker line: ' + line.dataset.sh : a === document.body ? 'page' : a.className; });
    ok(focus === 'smoker line: smoker', width + ': the focus lands on Ann\'s new Smoker line (' + focus + ')');
    ok(/Ann added to Smoker\. Not saved yet\./.test(await L.txt(p, '.tm-page') || ''), width + ': the page says in words who was added and that it is not saved');
    // one break per person (17 Nov 2026): the Smoker line has its own Take off; + Break is Ann's, by her name, on no service line
    ok(await p.locator('.tm-tlrow[data-id="ann"] [data-p="tm-off"][data-sh="smoker"]').count() === 1 && await p.locator('.tm-tlrow[data-id="ann"] .tm-braddwho [data-p="tm-addbr"]').count() === 1 && !await p.locator('.tm-tlrow[data-id="ann"] .tm-tlsvc [data-p="tm-addbr"]').count(), width + ': Ann\'s Smoker line has its own Take off, and her one + Break sits by her name');
    ok(await writes(p) === before, width + ': nothing is saved until Save');
    ok(same(await adds(p, 'bo'), ['Smoker 06:00 to 11:00']), width + ': with Ann on it, Smoker shows as usual in Bo\'s Add a service (' + (await adds(p, 'bo')).join(', ') + ')');
    // a mistaken Take off is undone in place: Smoker stays shown for this date
    const off = '[data-p="tm-off"][data-id="ann"][data-sh="smoker"]';
    await click(p, off); await click(p, off);
    ok(!await p.locator('select[data-k="tm-sec:ann:smoker"]').count() && same(await adds(p, 'ann'), ['Smoker 06:00 to 11:00']), width + ': after Take off, Smoker stays shown for this date, in Ann\'s Add a service without the hidden words');
    ok(await p.locator('.tm-tlrow[data-id="ann"] [data-p="tm-off-undo"]').count() === 1 && /Ann taken off Smoker\. Not saved yet\./.test(await L.txt(p, '.tm-page') || ''), width + ': Undo is there to put it back');
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
  ok(same(await adds(p, 'ann'), ['Smoker 06:00 to 11:00']) && same(await heads(p), ['Smoker', 'Lunch', 'Dinner']), 'someone on it: Ann\'s Add a service offers Smoker as usual, and the head shows it in time order');
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
