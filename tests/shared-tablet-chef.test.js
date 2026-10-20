// The head chef's Google sign-in stays on a device. On a shared kitchen tablet that opened the head chef's tools for
// whoever picked it up (20 Oct 2026). Now staff signed in there get their own view: no Admin key, no admin panel, no
// reports, no guide or minutes editing. A chef (head or sous) signed in, or nobody on a personal device, keeps them.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const key = p => p.$('.wtop .adm');
(async () => {
  const b = await L.start();

  // staff (Bo) signed in on the head chef's device: the staff view everywhere
  let p = await L.open(b, '#/', { admin: true, who: 'bo', wait: 1800 });
  ok(await key(p) === null, 'staff on the head chef device: no Admin key in the top bar');
  await p.goto(L.BASE + '#/prep'); await p.waitForTimeout(1200);
  ok(await p.$('[data-p="staff-open"]') === null && await p.$('[data-p="mn-open"]') === null, 'staff on the head chef device: no Manage staff, no Minutes register');
  ok(await p.$('.nb-pace') === null && !/Pace/.test(await txt(p, '#prep-root') || ''), 'staff on the head chef device: no Pace box');
  await p.goto(L.BASE + '#/admin'); await p.waitForTimeout(1200);
  const adm = await txt(p, '#prep-root') || '';
  ok(/Bo is signed in on this device/.test(adm) && await p.$('.a-groups') === null, 'staff on the head chef device: #/admin says a chef has to sign in, no admin sections (' + adm.slice(0, 120) + ')');
  await p.goto(L.BASE + '#/minutes'); await p.waitForTimeout(1000);
  ok(await p.$('[data-p="mn-admin"]') === null, 'staff on the head chef device: no "Write minutes" link');
  await p.goto(L.BASE + '#/guides'); await p.waitForTimeout(1000);
  ok(await p.$('[data-p="g-admin"]') === null, 'staff on the head chef device: no "Add or change guides"');
  await p.goto(L.BASE + '#/settings'); await p.waitForTimeout(600);
  ok(await p.$('[data-act="clearticks"]') === null, 'staff on the head chef device: Settings has no head chef blocks');
  ok(p.errors.length === 0, 'staff on the head chef device: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a sous chef (Sam) signed in on the same device: the chef tools stay
  p = await L.open(b, '#/', { admin: true, who: 'sam', wait: 1800 });
  ok(await key(p) !== null, 'sous chef on the head chef device: the Admin key shows');
  await p.context().close();

  // nobody signed in: a personal device keeps the tools, a shared kitchen device does not
  p = await L.open(b, '#/', { admin: true, who: '', wait: 1800 });
  ok(await key(p) !== null, 'nobody signed in, personal device: the Admin key shows');
  await p.context().close();
  p = await L.open(b, '#/', { admin: true, who: '', settings: { shared: true }, wait: 1800 });
  ok(await key(p) === null, 'nobody signed in, shared device: no Admin key');
  await p.context().close();

  // staff signs out with "Not you?" and Sam signs in: the key comes back without a reload
  p = await L.open(b, '#/prep', { admin: true, who: 'bo', wait: 1800 });
  ok(await key(p) === null, 'swap: no key while Bo is signed in');
  await p.click('[data-p="who-change"]'); await p.waitForTimeout(300);
  await p.click('.p-name[data-id="sam"]'); await p.waitForTimeout(500);
  await p.type('#pf1', '1111'); await p.waitForTimeout(1200);
  ok(await key(p) !== null, 'swap: the key is back once Sam signs in');
  ok(p.errors.length === 0, 'swap: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  R.forEach(r => console.log(r));
  const bad = R.filter(r => r.startsWith('FAIL')).length;
  console.log(bad + ' failed of ' + R.length);
  process.exit(bad ? 1 : 0);
})();
