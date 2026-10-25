// The page takes who is a chef from the lists the rules check (sousIds, headId), not from the role label (22 Oct 2026
// review, S4). A sous chef can change a role in the people list; until the head chef keeps it, that person gets the
// staff view, even on the head chef's Google device. And on a shared kitchen device, Sign out takes away the drafts and
// the sent mail the person left on it (S7); the idle lock does not.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const key = async p => (await L.admItem(p)) === 'none' ? null : true;
(async () => {
  const b = await L.start();
  const people = [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'bo', name: 'Bo', role: 'sous', add: true, tick: true, del: true, active: true }   // relabelled, not kept yet
  ];
  const extra = { [fsKey(['config', 'main'])]: { people, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], showBadges: true } };

  let p = await L.open(b, '#/', { admin: true, who: 'bo', extra, wait: 1800 });
  ok(await key(p) === null, 'relabelled as sous chef, not in sousIds: no Admin in the menu on the head chef device');
  await p.goto(L.BASE + '#/admin'); await L.settle(p, 1200);
  ok(await p.$('.a-groups') === null, 'relabelled: #/admin shows no admin sections');
  await p.goto(L.BASE + '#/prep'); await L.settle(p, 1200);
  ok(await p.$('[data-p="staff-open"]') === null, 'relabelled: no Manage staff on the prep list');
  ok(p.errors.length === 0, 'relabelled: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  p = await L.open(b, '#/', { admin: true, who: 'sam', extra, wait: 1800 });
  ok(await key(p) === null, 'sous chef does not inherit Google admin');
  await p.context().close();

  // shared device: Sign out clears what Sam left; Ann's sent mail stays
  p = await L.open(b, '#/prep', { who: 'sam', settings: { shared: true }, wait: 1800 });
  await p.evaluate(() => {
    localStorage.setItem('lk.fe.draft.new', JSON.stringify({ name: 'Smith 50th', phone: '0400 000 000' }));
    localStorage.setItem('lk.mg.draft.burger', '{}');
    localStorage.setItem('lk.mail.sent', JSON.stringify([{ id: 'm1', w: 'sam', text: 'Sam mail', at: Date.now() }, { id: 'm2', w: 'ann', text: 'Ann mail', at: Date.now() }]));
  });
  const out = await p.evaluate(() => window.LK_PREP.signOut(true));
  await L.settle(p, 400);
  const left = await p.evaluate(() => ({ fe: localStorage.getItem('lk.fe.draft.new'), mg: localStorage.getItem('lk.mg.draft.burger'), mail: JSON.parse(localStorage.getItem('lk.mail.sent') || '[]').map(x => x.w) }));
  ok(out === true && left.fe === null && left.mg === null, 'shared device, Sign out: the function and recipe drafts are gone');
  ok(left.mail.length === 0, 'shared device, Sign out: Sam\'s sent mail is gone, Ann\'s stays (' + left.mail.join() + ')');
  ok(p.errors.length === 0, 'shared device: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // "Not you?" hands over the same way (23 Oct 2026): what Sam left goes, the names show for the next person
  p = await L.open(b, '#/orders', { who: 'sam', settings: { shared: true }, wait: 1800 });
  await p.evaluate(() => localStorage.setItem('lk.fe.draft.new', JSON.stringify({ name: 'Smith 50th', phone: '0400 000 000' })));
  await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 400);
  ok(await p.evaluate(() => localStorage.getItem('lk.fe.draft.new')) === null && !!(await p.$('.p-name')), 'shared device, Not you?: the function draft is gone and the names show');
  ok(p.errors.length === 0, 'shared device, Not you?: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a personal phone keeps them
  p = await L.open(b, '#/prep', { who: 'sam', wait: 1800 });
  await p.evaluate(() => localStorage.setItem('lk.fe.draft.new', '{"name":"x"}'));
  await p.evaluate(() => window.LK_PREP.signOut(true)); await L.settle(p, 400);
  ok(await p.evaluate(() => localStorage.getItem('lk.fe.draft.new')) === null, 'personal phone, Sign out: private drafts are cleared');
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
