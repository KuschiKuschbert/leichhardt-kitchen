// Every account that already has Prep access can use Wall board on its own device.
// This changes the presentation choice, not data permissions or personal/shared attribution.
const L = require('./lib');
const { R, ok } = L.results(), { tap, txt } = L;
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW)), yesterday = L.ymd(new Date(L.NOW - 86400000));
const person = (id, name, role, rights) => Object.assign({ id, name, role, active: true, add: true, tick: true, del: true }, rights || {});
const people = [person('head', 'Head chef', 'head'), person('sam', 'Sam', 'sous'), person('ann', 'Ann', 'staff', { del: false }),
  person('lou', 'Lou', 'lead'), person('vic', 'Vic', 'view', { add: false, tick: false, del: false }), person('fay', 'Fay', 'fnc', { add: false, tick: false, del: false, fn: true })];
const line = (text, station) => ({ text, station, qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, done: false, deleted: false });
const fixture = {
  [key(['config', 'main'])]: { people, headId: 'head', staffIds: people.map(p => p.id), sousIds: ['head', 'sam'], pingIds: ['head', 'sam'], fnIds: ['fay'], fnOnlyIds: ['fay'], showBadges: true },
  [key(['days', yesterday, 'items', 'past1'])]: line('Yesterday parsley', 'Larder'),
  [key(['days', yesterday, 'items', 'past2'])]: line('Yesterday steak', 'Grill')
};
for (const id of ['head', 'lou', 'vic', 'fay']) {
  fixture[key(['pinset', id])] = { at: 1 };
  fixture[key(['drinks', id])] = { kind: 'flat', size: 'reg', at: L.NOW - 86400000, by: id };
}
const readSet = p => p.evaluate(() => (window.__fake.reads || []).slice().sort());
const pref = p => p.evaluate(() => localStorage.getItem('lk.wall'));
const opens = [
  { name: 'admin with head PIN and grant', who: 'head', admin: true },
  { name: 'head chef with PIN', who: 'head' },
  { name: 'sous chef', who: 'sam' },
  { name: 'chef / staff', who: 'ann' },
  { name: 'lead', who: 'lou' },
  { name: 'view-only staff', who: 'vic', readonly: true }
];

(async () => {
  const b = await L.start();
  for (const c of opens) {
    const p = await L.open(b, '#/prep', { who: c.who, admin: !!c.admin, extra: fixture, width: 1280, height: 844, wait: 1400 });
    await L.waitFor(p, () => !!document.querySelector('#nbr-i1'), null, 6000);
    const entry = !!(await p.$('.nb-tabs [data-p="wall"]'));
    ok(entry && !(await p.$('.wb')), c.name + ': personal Prep offers the existing Wall board entry');
    if (!entry) { await p.context().close(); continue; }
    const reads = await readSet(p);
    await tap(p, '.nb-tabs [data-p="wall"]'); await L.settle(p, 200);
    ok(!!(await p.$('.wb-cols .wb-col')) && await pref(p) === '1', c.name + ': one tap opens the board and keeps this browser choice');
    if (c.readonly) {
      const edits = await p.evaluate(() => ({ ticks: [...document.querySelectorAll('.wb .nb-box')].every(e => e.disabled), on: !!document.querySelector('.wb .nb-onbtn'), urgent: !!document.querySelector('.wb .nb-star') }));
      ok(edits.ticks && !edits.on && !edits.urgent, 'view-only staff: board has disabled ticks and no On it or Urgent controls');
    } else ok(await p.$eval('.wb .nb-box', e => !e.disabled), c.name + ': the existing tick permission remains available');
    await tap(p, '.wb-h [data-p="wall"]'); await L.settle(p, 200);
    ok(!(await p.$('.wb')) && !!(await p.$('.nb-tabs [data-p="wall"]')) && !(await pref(p)), c.name + ': Back returns to the existing list');
    const refused = await p.evaluate(() => window.__fake.refused || []);
    ok(JSON.stringify(await readSet(p)) === JSON.stringify(reads) && !refused.length && !p.errors.length && !(await L.overflow(p)), c.name + ': switching views adds no reads, refused access, errors or overflow ' + p.errors.join(' | '));
    await p.context().close();
  }

  // A saved presentation flag never grants a private Prep session or extends an account's route permissions.
  const blocked = [
    { name: 'signed out', who: '', gate: '.p-name' },
    { name: 'Functions-only account', who: 'fay', gate: 'functions' },
    { name: 'expired personal PIN session', who: 'ann', sessionExp: L.NOW - 1, gate: '#pf1' },
    { name: 'remembered owner Google without head PIN', who: 'head', admin: true, noTok: true, gate: '#pf1' }
  ];
  for (const c of blocked) {
    const p = await L.open(b, '#/prep', Object.assign({ extra: fixture, width: 1280, height: 844, wait: 1300,
      init: () => localStorage.setItem('lk.wall', '1') }, c));
    await L.waitFor(p, gate => gate === 'functions'
      ? [...document.querySelectorAll('#prep-root h2')].some(e => e.textContent === 'Functions account')
      : !!document.querySelector(gate), c.gate, 6000);
    ok(!(await p.$('.wb')) && !(await p.$('[data-p="wall"]')) && !(await p.$('.nb .nb-left')), c.name + ': kept wall preference cannot expose the board or private list');
    ok(!p.errors.length, c.name + ': blocked state raises no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // Authorised historical browsing is unchanged: the wall presentation is only for today's Prep.
  const p = await L.open(b, '#/prep', { who: 'sam', extra: fixture, width: 1280, height: 844, wait: 1300 });
  await L.waitFor(p, () => !!document.querySelector('#nbr-i1'), null, 6000);
  await p.fill('[data-k="p-day"]', yesterday);
  await L.waitFor(p, () => !!document.querySelector('#nbr-past1'), null, 6000);
  await p.evaluate(() => localStorage.setItem('lk.wall', '1'));
  await tap(p, '.nb-tabs [data-p="tab"][data-v=""]'); await L.settle(p, 150);
  ok(!(await p.$('.wb')) && !(await p.$('[data-p="wall"]')) && await p.$eval('[data-k="p-day"]', e => e.value) === yesterday && /Yesterday parsley/.test(await txt(p, '.nb-left') || ''), 'past date: a sous chef keeps historical list access without opening the saved wall view');
  ok(!p.errors.length, 'past date: no page errors ' + p.errors.join(' | '));
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
