/*
  Two admins at a second venue, in the book (24 Nov 2026, docs/venues.md). Made-up people, emails and ids only.
  - Leichhardt's shape (no config/platform record, the owner is the platform owner): the owner's Google and the head
    chef's PIN open Admin as before, with one more read (config/platform, not there), no lock and nothing kept on the
    phone; picking another name still signs Google out.
  - A venue's shape (window.__fakePlatform, the record { id: 'plat-1' }): the platform owner signs in with Google on his
    own PIN and gets Admin, the grant names him, and a reload keeps his Google like the head chef's; picking another
    name still signs it out. The venue owner's Google cannot read the record; his head chef PIN gets Admin, and his
    People page shows the platform owner's row locked with one sentence, while Save leaves that row and his place on
    every list as stored.
  - A failed config/platform read never grants Admin and never locks a row by guess, and the lock comes once it reads.
*/
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const K = 'kitchens/' + L.PIN + '/';
const PLAT_USER = { uid: 'google-plat', email: 'platform@test.local', emailVerified: true, isAnonymous: false };
// in the page before the book starts: this is a second venue whose platform owner has the profile plat-1
const venueInit = () => {
  window.__fakePlatform = { email: 'platform@test.local', id: 'plat-1' };
  window.__fakeGoogleUser = { uid: 'google-plat', email: 'platform@test.local', emailVerified: true, isAnonymous: false, authTime: Math.floor(Date.now() / 1000) };
};
/* The venue: Hana is its head chef (the venue owner), Pat is the platform owner's own profile there, shown as a sous chef.
   His stored lists say more than his row does (on delIds though his row has Remove off, and no PIN window yet), as
   after a sous chef changed his row: a save that worked his lists out from his row would change them, which only he
   may do, so the stand-in refuses it as the rules do. */
function venue(extra) {
  const people = [
    { id: 'hc', name: 'Hana', role: 'head', add: true, tick: true, del: true, ping: true, active: true },
    { id: 'plat-1', name: 'Pat', role: 'sous', add: true, tick: true, del: false, ping: true, active: true },
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
    { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
  ];
  const x = {};
  x[K + 'config/main'] = { people, headId: 'hc', sousIds: ['hc', 'plat-1', 'sam'], pingIds: ['hc', 'plat-1', 'sam'], delIds: ['hc', 'plat-1', 'sam'], showBadges: true, staffSee: { cleaning: true } };
  x[K + 'config/platform'] = { id: 'plat-1' };
  x[K + 'pinset/plat-1'] = { at: 1 }; x[K + 'staffpins/plat-1'] = { hash: L.sha('lk:plat-1:6161') };
  x[K + 'drinks/plat-1'] = { kind: 'flat', size: 'reg', at: L.NOW - 86400000, by: 'plat-1' };
  x[K + 'drinks/hc'] = { kind: 'flat', size: 'reg', at: L.NOW - 86400000, by: 'hc' };
  return Object.assign(x, extra || {});
}
const state = p => p.evaluate(() => { const s = window.LK_PREP.state; return { level: s.level, who: s.who, me: s.platformMe || '', id: s.platformId || '', st: s.platformSt || '', here: window.LK_PREP.ownerHere(), user: !!s.user }; });
const dump = (p, path) => p.evaluate(k => window.__fake.dump()[k], path);
const googleUser = p => p.evaluate(() => { const u = window.__fakeUser; return u ? u.email : ''; });
// "Who are you?": the name button for this person, as the PIN screen draws it (pickName())
// (the book answers taps inside its own page root only)
const press = (p, act, id) => p.evaluate(([act, id]) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-p', act); b.setAttribute('data-id', id); window.LK_PREP.state.root.appendChild(b); b.click(); b.remove(); }, [act, id]);
const pickName = (p, id) => press(p, 'who', id);
async function googleSignIn(p) {
  await L.waitFor(p, () => !!document.querySelector('[data-p="signin"]'), null, 8000);
  await L.tap(p, '[data-p="signin"]'); await L.settle(p, 600);
}
const owner = p => L.waitFor(p, () => window.LK_PREP.state.level === 'owner' && window.LK_PREP.ownerHere(), null, 8000).then(() => true, () => false);

(async () => {
  const b = await L.start();

  // (a) Leichhardt's shape: no record, the owner is the platform owner. Everything as before.
  let p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, wait: 1800 });
  ok(await owner(p), 'Leichhardt: the owner\'s Google and the head chef\'s PIN open Admin');
  let s = await state(p);
  const grant = await dump(p, K + 'adminDevices/anon-test');
  ok(s.who === 'head' && grant && grant.by === 'head', 'Leichhardt: the grant names the head chef (' + (grant && grant.by) + ')');
  const reads = await p.evaluate(k => ['platform', 'admins'].map(n => window.__fake.reads.filter(x => x === k + n).length), K + 'config/');
  ok(reads[0] >= 1 && reads[0] === reads[1] && s.st === 'ok' && s.id === '' && s.me === '', 'Leichhardt: one read of config/platform with each owner check (none from the device: the owner\'s Google answered), not there, so nobody is the platform owner (' + reads.join(' and ') + ' reads, ' + JSON.stringify(s) + ')');
  ok(await p.evaluate(() => localStorage.getItem('lk.platform')) === null, 'Leichhardt: nothing about a platform owner is kept on the phone');
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  ok(await p.locator('.pp-st.is-lock').count() === 0 && await p.locator('[data-p="a-person-open"]').count() === 4, 'Leichhardt: no row is locked; every name opens its editor');
  ok(p.errors.length === 0, 'Leichhardt: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // a personal device belongs to its one person, so another name is picked on a shared kitchen screen
  p = await L.open(b, '#/admin', { admin: true, deviceMode: 'shared', width: 1280, height: 900, wait: 1800 });
  ok(await owner(p), 'Leichhardt, shared screen: Admin as before');
  await pickName(p, 'ann'); await L.settle(p, 600);
  ok(await googleUser(p) === '' && (await state(p)).level !== 'owner', 'Leichhardt, shared screen: picking another name still signs the owner\'s Google out');
  ok(p.errors.length === 0, 'Leichhardt, shared screen: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // (b1) A venue: the platform owner on his own PIN signs in with Google on the admin page and gets Admin.
  p = await L.open(b, '#/admin', { who: 'plat-1', ownerGoogle: false, width: 1280, height: 900, wait: 1800, extra: venue(), init: venueInit });
  ok(await L.waitFor(p, () => window.LK_PREP.privateAccess(), null, 5000).then(() => true, () => false), 'venue: the platform owner is signed in on his own PIN');
  await googleSignIn(p);
  ok(await owner(p), 'venue: the platform owner\'s Google and his own PIN open Admin');
  s = await state(p);
  const pGrant = await dump(p, K + 'adminDevices/anon-test');
  ok(pGrant && pGrant.by === 'plat-1' && pGrant.googleUid === PLAT_USER.uid && s.me === 'plat-1', 'venue: the grant names him, by plat-1 (' + JSON.stringify(pGrant && { by: pGrant.by, g: pGrant.googleUid }) + ')');
  ok(await p.evaluate(() => localStorage.getItem('lk.platform')) === 'google-plat|plat-1', 'venue: the server\'s answer is kept on the phone for the next reload');
  ok(await p.locator('.a-nav').count() === 1 && /platform@test\.local/.test(await txt(p, '.p-bar') || ''), 'venue: the admin panel opens for him (' + await txt(p, '.p-bar') + ')');
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  ok(await p.locator('.pp-st.is-lock').count() === 0 && await p.locator('[data-p="a-person-open"][data-id="plat-1"]').count() === 1, 'venue: his own row is not locked for him');
  await p.reload({ waitUntil: 'load' }); await L.settle(p, 1500, 300);
  ok(await owner(p) && await googleUser(p) === PLAT_USER.email, 'venue: after a reload his Google stays signed in and Admin opens again');
  ok(p.errors.length === 0, 'venue, platform owner: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  // on a shared kitchen screen: Admin the same way, and another name picked signs his Google out
  p = await L.open(b, '#/admin', { who: 'plat-1', ownerGoogle: false, deviceMode: 'shared', width: 1280, height: 900, wait: 1800, extra: venue(), init: venueInit });
  await googleSignIn(p);
  ok(await owner(p), 'venue, shared screen: the platform owner gets Admin');
  await pickName(p, 'ann'); await L.settle(p, 600);
  ok(await googleUser(p) === '' && (await state(p)).level !== 'owner' && await p.evaluate(() => localStorage.getItem('lk.platform')) === null, 'venue, shared screen: picking another name signs his Google out and forgets the kept answer');
  ok(p.errors.length === 0, 'venue, shared screen: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // (b2) The venue owner: his Google cannot read the record; his head chef PIN gets Admin; the platform row is locked.
  p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, wait: 1800, extra: venue(), init: venueInit });
  ok(await owner(p), 'venue: the venue owner\'s Google and the head chef\'s PIN open Admin');
  s = await state(p);
  // One read with each owner check, as at Leichhardt above: on a busy runner the owner check runs a second time once the
  // PIN session is in, and both reads are refused (2 of 12 runs under load counted two and failed, 24 Nov 2026).
  const refused = await p.evaluate(k => window.__fake.refused.filter(x => x.path === k).map(x => x.kind), K + 'config/platform');
  const checks = await p.evaluate(k => window.__fake.reads.filter(x => x === k).length, K + 'config/admins');
  ok(refused.length >= 1 && refused.length === checks && refused.every(k => k === 'server') && s.me === '', 'venue: the venue owner\'s Google cannot read config/platform, once with each owner check (' + refused.join(', ') + '; ' + checks + ' owner checks)');
  ok(s.who === 'hc' && (await dump(p, K + 'adminDevices/anon-test')).by === 'hc', 'venue: the grant names the head chef');
  ok(await L.waitFor(p, () => window.LK_PREP.state.platformSt === 'ok', null, 5000).then(() => true, () => false) && (await state(p)).id === 'plat-1', 'venue: the admin session reads the platform owner\'s id once the grant is in');
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  const lockRow = '.pp-row[data-pid="plat-1"]';
  ok(await txt(p, lockRow + ' .pp-st.is-lock') === 'The owner\'s own profile. Only the owner can change it.', 'venue: the platform owner\'s row says why it is locked (' + await txt(p, lockRow + ' .pp-st') + ')');
  ok(await p.locator(lockRow + ' [data-p="a-person-open"]').count() === 0 && /Pat/.test(await txt(p, lockRow + ' .pp-n') || ''), 'venue: his name is shown, with no editor to open');
  ok(await p.locator('.a-ids').count() === 0, 'venue: no "Changed from the prep book" card about his lists');
  await press(p, 'a-person-open', 'plat-1'); await L.settle(p, 200);
  ok(await p.locator('#pp-editor').count() === 0 && await p.locator('[data-p="a-reset-pin"][data-id="plat-1"]').count() === 0, 'venue: a stray open finds no editor and no Reset PIN for him');
  await press(p, 'a-reset-pin', 'plat-1'); await L.settle(p, 100); await press(p, 'a-reset-pin', 'plat-1'); await L.settle(p, 400);
  ok(!!(await dump(p, K + 'staffpins/plat-1')) && !!(await dump(p, K + 'pinset/plat-1')), 'venue: a stray Reset PIN for him does nothing');
  const before = await dump(p, K + 'config/main');
  await L.tap(p, '[data-p="a-person-open"][data-id="ann"]'); await L.settle(p, 250);
  await p.locator('#pp-editor[data-pid="ann"] input[data-perm="del"]').check(); await L.settle(p, 200);
  await L.tap(p, '[data-p="a-save"]');
  await L.waitFor(p, () => /Saved|Could not|Not allowed/.test((document.querySelector('.pp-room') || document.body).textContent), null, 6000).catch(() => {});
  await L.settle(p, 400);
  const after = await dump(p, K + 'config/main');
  const pat = c => JSON.stringify((c.people || []).find(x => x.id === 'plat-1'));
  const lists = c => ['staffIds', 'sousIds', 'pingIds', 'fnIds', 'fnOnlyIds', 'addIds', 'tickIds', 'delIds'].map(k => k + ':' + (c[k] || []).includes('plat-1')).join(',') + ',head:' + (c.headId === 'plat-1') + ',window:' + ((c.pinOpen || {})['plat-1'] || 0);
  ok((after.people || []).find(x => x.id === 'ann').del === true && (after.delIds || []).includes('ann'), 'venue: the venue admin\'s change to Ann is saved');
  ok(pat(after) === pat(before) && lists(after) === lists(before), 'venue: Save leaves the platform owner\'s row and place on every list as stored (' + lists(after) + ')');
  const roster = await dump(p, K + 'login/roster');
  ok((roster.staffIds || []).includes('plat-1'), 'venue: the sign-in roster keeps him');
  ok(p.errors.length === 0, 'venue, venue owner: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // (c1) A failed read never grants: the platform owner's Google cannot read the record (no signal for it).
  p = await L.open(b, '#/admin', { who: 'plat-1', ownerGoogle: false, width: 1280, height: 900, wait: 1800, extra: venue(), init: venueInit, failReads: 'config/platform$' });
  await googleSignIn(p); await L.settle(p, 800);
  s = await state(p);
  ok(s.level !== 'owner' && !s.here && s.me === '' && !(await dump(p, K + 'adminDevices/anon-test')), 'a failed read: the platform owner gets no Admin and no grant (' + JSON.stringify(s) + ')');
  ok(/No signal|Could not check your access/.test(await txt(p, '#prep-root') || await txt(p, 'body') || ''), 'a failed read: the admin page says the check could not be made');
  await p.context().close();

  // (c2) A failed read never locks: the venue admin's own read of the record fails, so no row is locked by guess.
  p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900, wait: 1800, extra: venue(), failReads: 'config/platform$',
    init: () => { window.__fakePlatform = { email: 'platform@test.local', id: 'plat-1' }; window.__fake.failApp = '[DEFAULT]'; } });
  ok(await owner(p), 'a failed lock read: the venue admin still has Admin');
  ok(await L.waitFor(p, () => window.LK_PREP.state.platformSt === 'err', null, 5000).then(() => true, () => false), 'a failed lock read: it is marked failed, not empty');
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  ok(await p.locator('.pp-st.is-lock').count() === 0 && await p.locator('[data-p="a-person-open"][data-id="plat-1"]').count() === 1, 'a failed lock read: no row is locked by guess');
  ok(/Could not check which profile is the owner/.test(await txt(p, '.a-plat-err') || ''), 'a failed lock read: the People page says so (' + await txt(p, '.a-plat-err') + ')');
  ok(!(await p.evaluate(() => window.__fake.writes.some(w => w.some(o => /config\/main$/.test(o.path))))), 'a failed lock read: the panel\'s own list seeding waits, nothing is written to the settings');
  await p.evaluate(() => { window.__fake.failReads = null; delete window.LK_PREP.state.retryAt.platform; });
  await L.adminTab(p, 'inbox'); await L.adminTab(p, 'people'); await L.settle(p, 500);
  ok(await L.waitFor(p, () => !!document.querySelector('.pp-row[data-pid="plat-1"] .pp-st.is-lock'), null, 5000).then(() => true, () => false) && await p.locator('.a-plat-err').count() === 0, 'a failed lock read: once it reads, the row is locked and the line goes');
  ok(p.errors.length === 0, 'a failed lock read: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
