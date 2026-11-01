// Shared Google authentication never transfers admin authority to a staff name. Google alone
// needs the current head PIN on both device types, and signing out preserves the anonymous device UID.
const L = require('./lib'), { R, ok } = L.results();
const uid = p => p.evaluate(async () => (await LK_PREP.book().ready()).auth.currentUser.uid);
(async () => {
  const b = await L.start();
  for (const [person, pin] of [['bo', '3333'], ['sam', '1111']]) {
    const p = await L.open(b, '#/prep', { admin: true, who: person, deviceMode: 'shared', wait: 1600 });
    ok(await p.evaluate(() => !LK_PREP.state.user && !LK_PREP.state.authed), person + ': remembered Google signs out before staff login');
    await p.fill('#pf1', pin); await L.waitFor(p, () => LK_PREP.privateAccess(), null, 8000);
    ok(await L.admItem(p) === 'none', person + ': their own PIN grants no admin access');
    await p.goto(L.BASE + '#/admin'); await L.settle(p, 700);
    ok(!await p.$('.a-groups'), person + ': a direct admin URL contains no private admin sections');
    await p.goto(L.BASE + '#/prep'); await L.settle(p, 500);
    ok(!!await p.$('.nb-row'), person + ': normal kitchen access still works after login');
    ok(!p.errors.length, person + ': no page errors ' + p.errors.join(' | ')); await p.context().close();
  }
  for (const deviceMode of ['own', 'shared']) {
    const p = await L.open(b, '#/admin', { admin: true, who: '', deviceMode, dailyLocked: true, wait: 1600 });
    const initial = await uid(p);
    ok(!await p.$('.a-groups') && !await p.evaluate(() => LK_PREP.privateAccess()), deviceMode + ': remembered Google alone cannot open the admin panel');
    await p.fill('#pf1', '4444'); await L.waitFor(p, () => LK_PREP.state.level === 'owner' && !!document.querySelector('.a-groups'), null, 8000);
    ok(await uid(p) === initial, deviceMode + ': Google plus the head daily PIN unlocks the existing anonymous device');
    await L.waitFor(p, () => !LK_PREP.unsaved(), null, 8000);
    await p.evaluate(() => LK_PREP.signOut(true)); await L.settle(p, 500);
    ok(!await p.$('.a-groups') && await p.evaluate(async () => !LK_PREP.privateAccess() && !(await LK_PREP.book().ready()).ownerAuth.currentUser) && await uid(p) === initial, deviceMode + ': sign-out ends local private/Google access while retaining the device UID');
    ok(!p.errors.length, deviceMode + ': no page errors ' + p.errors.join(' | ')); await p.context().close();
  }
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exitCode = 1; });
