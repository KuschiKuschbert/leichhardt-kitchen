// Sign out waits until sent on the head chef's own Google device (head chef, 29 Oct 2026). A sign-out there signs the
// Google account out too, and a change still waiting to send went with it. While one waits, Sign out of Google, the
// lone Not you? and the head chef's own Sign out (the chef hat, Not you? beside Writing as) say "Not sent yet." and do
// nothing, a second tap too, like Update now. Once it is sent, the next tap signs out as usual, and the "Not saved yet"
// second tap for something half typed stays as it was. Only there: a shared kitchen device keeps "Not sent. Tap again"
// (staff phones are in chef-menu.test.js), and the idle lock and the other tab's lock never wait for it.
// Review, 29 Oct 2026: the chef hat's line goes once it is sent; Sign in with Google waits too; a change left under the
// PIN's sign-in when Google came in (never sent while Google is in) does not hold Sign out for good; the head chef on
// her PIN with no Google keeps Not sent. Tap again; her PIN session running out signs out over a waiting change.
// The stand-in's 'hold' stands in for no signal: a write waits until __fake.release().
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
// Ann is the head chef here (headId), Sam a sous chef, Bo staff
const extra = { [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } };
const S = (p, f, a) => p.evaluate(f, a);
const st = p => S(p, () => { const s = window.LK_PREP.state; return { user: !!s.user, who: s.who, authed: !!s.authed, unsent: window.LK_PREP.unsent(), admin: localStorage.getItem('lk.admin') || '' }; });
const hold = p => S(p, () => { window.__fake.mode = 'hold'; });
const release = async p => { await S(p, () => window.__fake.release()); await L.waitFor(p, () => !window.LK_PREP.unsent(), null, 5000).catch(() => {}); await L.settle(p, 300); };
// a line written while the signal is gone: it waits to send
const waiting = async (p, words) => { await p.fill('#p-text', words); await p.keyboard.press('Enter'); await L.settle(p, 400); };
const owner = (b, hash, o) => L.open(b, hash, Object.assign({ admin: true, who: '', extra, wait: 1800 }, o || {}));
const verified = p => L.waitFor(p, () => window.LK_PREP.state.level === 'owner', null, 8000).catch(() => {});
async function safe(label, fn) { try { await fn(); } catch (e) { ok(false, label + ' threw ' + String(e).split('\n')[0]); } }

(async () => {
  const b = await L.start();
  let p, s;

  // nobody on a PIN: the lone Not you? and Sign out of Google wait, a second tap too; once sent, one tap signs out
  for (const w of [390, 1280]) await safe(w + ' Google only', async () => {
    p = await owner(b, '#/prep', { width: w, height: w > 400 ? 900 : 844 });
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    ok((await st(p)).unsent, w + ' Google only: the line waits to send');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 300);
    s = await st(p);
    ok(s.user && s.admin === '1' && await txt(p, '.nb-top [data-p="who-change"]') === 'Not sent yet.', w + ' Google only: Not you? says Not sent yet and keeps the Google account (' + await txt(p, '.nb-top [data-p="who-change"]') + ', ' + JSON.stringify(s) + ')');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 400);
    s = await st(p);
    ok(s.user && s.unsent && await txt(p, '.nb-top [data-p="who-change"]') === 'Not sent yet.', w + ' Google only: a second tap on Not you? does not get past it (' + JSON.stringify(s) + ')');
    ok(!(await L.overflow(p)), w + ' Google only: no sideways scroll with Not sent yet (' + await L.overflow(p) + ')');
    await S(p, () => { location.hash = '#/admin'; }); await L.settle(p, 800);
    await L.waitFor(p, () => !!document.querySelector('.p-bar [data-p="signout"]'), null, 8000).catch(() => {});
    await p.click('.p-bar [data-p="signout"]'); await L.settle(p, 300);
    s = await st(p);
    ok(s.user && await txt(p, '.p-bar [data-p="signout"]') === 'Not sent yet.', w + ' Google only: Sign out of Google says Not sent yet and keeps the account (' + await txt(p, '.p-bar [data-p="signout"]') + ', ' + JSON.stringify(s) + ')');
    await p.click('.p-bar [data-p="signout"]'); await L.settle(p, 400);
    s = await st(p);
    ok(s.user && s.unsent, w + ' Google only: a second tap on Sign out of Google does not get past it (' + JSON.stringify(s) + ')');
    ok(!(await L.overflow(p)), w + ' Google only, admin: no sideways scroll with Not sent yet (' + await L.overflow(p) + ')');
    await release(p);
    ok(await S(p, () => { const d = window.__fake.dump(); return Object.keys(d).some(k => /\/items\//.test(k) && d[k].text === 'Peel garlic'); }), w + ' Google only: the line reaches the server once the signal is back');
    await p.click('.p-bar [data-p="signout"]'); await L.settle(p, 600);
    s = await st(p);
    ok(!s.user && s.admin === '', w + ' Google only: once it is sent, one tap on Sign out of Google signs out (' + JSON.stringify(s) + ')');
    ok(p.errors.length === 0, w + ' Google only: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // the head chef on her PIN on her Google device: the chef hat's Sign out and Not you? wait, a second tap too. Half a
  // line typed as well still says Not sent yet. Once sent, half a line typed asks the usual second tap.
  await safe('head chef on PIN', async () => {
    p = await owner(b, '#/prep', { who: 'ann' });
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 200);
    s = await st(p);
    ok(s.authed && s.user && await txt(p, '.wm-out small') === 'Not sent yet.', 'head chef on PIN: the chef hat\'s Sign out says Not sent yet (' + await txt(p, '.wm-out small') + ', ' + JSON.stringify(s) + ')');
    await p.click('.wm [data-who="out"]'); await L.settle(p, 400);
    s = await st(p);
    ok(s.authed && s.user && s.who === 'ann' && await txt(p, '.wm-out small') === 'Not sent yet.' && !(await p.$('.wm-out.is-armed')), 'head chef on PIN: a second tap on Sign out does not get past it (' + JSON.stringify(s) + ')');
    await p.keyboard.press('Escape'); await L.settle(p, 150);
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 300);
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 400);
    s = await st(p);
    ok(s.authed && s.user && await txt(p, '.nb-top [data-p="who-change"]') === 'Not sent yet.', 'head chef on PIN: Not you? beside Writing as says Not sent yet, a second tap too (' + await txt(p, '.nb-top [data-p="who-change"]') + ', ' + JSON.stringify(s) + ')');
    await p.fill('#p-text', 'Pick parsley');
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 200);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 400);
    ok((await st(p)).authed && await txt(p, '.wm-out small') === 'Not sent yet.', 'head chef on PIN: half a line typed as well, Sign out still says Not sent yet (' + await txt(p, '.wm-out small') + ')');
    await p.keyboard.press('Escape'); await L.settle(p, 150);
    await release(p);
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 200);
    ok((await st(p)).authed && await txt(p, '.wm-out small') === 'Not saved yet. Tap again to sign out', 'head chef on PIN: sent, half a line typed asks the usual second tap (' + await txt(p, '.wm-out small') + ')');
    await p.click('.wm [data-who="out"]'); await L.settle(p, 600);
    s = await st(p);
    ok(!s.authed && !s.user && s.who === '', 'head chef on PIN: the second tap signs out, Google too (' + JSON.stringify(s) + ')');
    ok(p.errors.length === 0, 'head chef on PIN: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });
  // sent and nothing typed: one tap on the chef hat's Sign out
  await safe('head chef on PIN, sent', async () => {
    p = await owner(b, '#/prep', { who: 'ann' });
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 300);
    await release(p);
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 600);
    s = await st(p);
    ok(!s.authed && !s.user, 'head chef on PIN: once it is sent, the next tap on Not you? signs out (' + JSON.stringify(s) + ')');
    await p.context().close();
    p = await owner(b, '#/recipes', { who: 'ann' });
    await verified(p); await S(p, () => { location.hash = '#/prep'; }); await L.settle(p, 800);
    await hold(p);
    await waiting(p, 'Peel garlic');
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 200);
    await release(p);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 600);
    s = await st(p);
    ok(!s.authed && !s.user, 'head chef on PIN: once it is sent, the next tap on the chef hat\'s Sign out signs out (' + JSON.stringify(s) + ')');
    ok(p.errors.length === 0, 'head chef on PIN, sent: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // the chef hat's "Not sent yet." goes once the change is sent, and its toast says what happens next on every tap
  // (review, 29 Oct 2026: the menu went on saying Not sent yet after the change was sent)
  for (const w of [390, 1280]) await safe(w + ' chef hat once sent', async () => {
    p = await owner(b, '#/prep', { who: 'ann', width: w, height: w > 400 ? 900 : 844 });
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 300);
    ok(await txt(p, '#lk-live') === 'Not sent yet. Sign out once it is sent.', w + ' chef hat: the toast says Sign out once it is sent (' + await txt(p, '#lk-live') + ')');
    await S(p, () => { document.getElementById('lk-live').textContent = ''; });
    await p.click('.wm [data-who="out"]'); await L.settle(p, 300);
    ok(await txt(p, '#lk-live') === 'Not sent yet. Sign out once it is sent.', w + ' chef hat: a second tap says it again, for a screen reader (' + await txt(p, '#lk-live') + ')');
    await release(p);
    ok(!!(await p.$('.wm .wm-out')) && !(await p.$('.wm-out.is-wait')) && await txt(p, '.wm-out small') === '', w + ' chef hat: once it is sent the menu stays open and no longer says Not sent yet (' + await txt(p, '.wm-out small') + ')');
    ok(!(await L.overflow(p)), w + ' chef hat: no sideways scroll (' + await L.overflow(p) + ')');
    await p.click('.wm [data-who="out"]'); await L.settle(p, 600);
    s = await st(p);
    ok(!s.authed && !s.user, w + ' chef hat: then one tap signs out (' + JSON.stringify(s) + ')');
    ok(p.errors.length === 0, w + ' chef hat once sent: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // the head chef on her PIN with no Google account on the device: Sign in with Google waits for a change on its way,
  // with no second tap past it (review, 29 Oct 2026). The sign-in changes who the device writes as, and Firestore never
  // sends a write left under the PIN's sign-in after that. Once it is sent, one tap signs in.
  await safe('sign in waits', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1800 });
    await hold(p);
    await waiting(p, 'Peel garlic');
    await S(p, () => { location.hash = '#/admin'; }); await L.settle(p, 800);
    await L.waitFor(p, () => !!document.querySelector('[data-p="signin"]'), null, 8000).catch(() => {});
    await p.click('[data-p="signin"]'); await L.settle(p, 300);
    s = await st(p);
    ok(!s.user && s.authed && s.unsent && await txt(p, '[data-p="signin"]') === 'Not sent yet.' && await txt(p, '#lk-live') === 'Not sent yet. Sign in once it is sent.', 'head chef PIN only: Sign in with Google says Not sent yet and does not sign in (' + await txt(p, '[data-p="signin"]') + ', ' + await txt(p, '#lk-live') + ', ' + JSON.stringify(s) + ')');
    await p.click('[data-p="signin"]'); await L.settle(p, 400);
    s = await st(p);
    ok(!s.user && s.unsent, 'head chef PIN only: a second tap on Sign in with Google does not get past it (' + JSON.stringify(s) + ')');
    ok(!(await L.overflow(p)), 'head chef PIN only: no sideways scroll with Not sent yet (' + await L.overflow(p) + ')');
    await release(p);
    await p.click('[data-p="signin"]'); await L.settle(p, 600);
    s = await st(p);
    ok(s.user && s.who === 'ann', 'head chef PIN only: once it is sent, one tap signs in with Google (' + JSON.stringify(s) + ')');
    ok(p.errors.length === 0, 'sign in waits: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // a write left under the PIN's sign-in when the Google sign-in comes in anyway (a popup opened before the line was
  // written) never sends while Google is in, so it must not hold Sign out for good (review, 29 Oct 2026). It keeps the
  // usual Not sent yet. Tap again, and the second tap signs out. The stand-in's hold stands in for it: never let go.
  await safe('stranded', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1800 });
    await hold(p);
    await waiting(p, 'Peel garlic');
    await S(p, async () => { window.__fake.mode = 'ok'; const a = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'); await a.signInWithPopup(); });
    await verified(p); await L.settle(p, 400);
    s = await st(p);
    ok(s.user && s.who === 'ann' && s.unsent && !(await S(p, () => window.LK_PREP.sendFirst())), 'stranded: Google in, Ann still on her PIN, the old line still waits, and Sign out does not wait for it (' + JSON.stringify(s) + ')');
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 200);
    ok((await st(p)).authed && await txt(p, '.wm-out small') === 'Not sent yet. Tap again to sign out', 'stranded: the chef hat\'s Sign out asks the usual second tap (' + await txt(p, '.wm-out small') + ')');
    await p.click('.wm [data-who="out"]'); await L.settle(p, 600);
    s = await st(p);
    ok(!s.authed && !s.user, 'stranded: the second tap signs out, Google too (' + JSON.stringify(s) + ')');
    ok(p.errors.length === 0, 'stranded: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // the head chef on her PIN on a phone with no Google account: no different from anyone else's PIN sign-out. The chef
  // hat and Not you? say Not sent yet. Tap again, and the second tap signs out (the change still goes while the tab is open)
  await safe('head chef PIN only', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1800 });
    await hold(p);
    await waiting(p, 'Peel garlic');
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 200);
    ok((await st(p)).authed && await txt(p, '.wm-out small') === 'Not sent yet. Tap again to sign out', 'head chef PIN only: the chef hat\'s Sign out says Not sent yet. Tap again to sign out (' + await txt(p, '.wm-out small') + ')');
    await p.click('.wm [data-who="out"]'); await L.settle(p, 600);
    s = await st(p);
    ok(!s.authed && s.who === '', 'head chef PIN only: the second tap on the chef hat\'s Sign out signs out (' + JSON.stringify(s) + ')');
    await p.context().close();
    p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1800 });
    await hold(p);
    await waiting(p, 'Peel garlic');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 300);
    ok((await st(p)).authed && await txt(p, '.nb-top [data-p="who-change"]') === 'Not sent. Tap again', 'head chef PIN only: Not you? says Not sent. Tap again (' + await txt(p, '.nb-top [data-p="who-change"]') + ')');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 600);
    s = await st(p);
    ok(!s.authed && s.who === '', 'head chef PIN only: the second tap on Not you? signs out (' + JSON.stringify(s) + ')');
    ok(p.errors.length === 0, 'head chef PIN only: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // a shared kitchen device keeps today's: Not sent. Tap again, and the second tap signs out
  await safe('shared', async () => {
    p = await owner(b, '#/prep', { settings: { shared: true } });
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 300);
    ok((await st(p)).user && await txt(p, '.nb-top [data-p="who-change"]') === 'Not sent. Tap again', 'shared kitchen device: Not you? says Not sent. Tap again, as before (' + await txt(p, '.nb-top [data-p="who-change"]') + ')');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 600);
    ok(!(await st(p)).user, 'shared kitchen device: the second tap signs out');
    await p.context().close();
  });

  // nothing automatic waits for it: the idle lock and the other tab's lock sign out over a change waiting to send
  await safe('idle lock', async () => {
    p = await owner(b, '#/prep');
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    await p.clock.runFor(8 * 60000); await L.settle(p, 400);
    s = await st(p);
    ok(!s.user && s.admin === '', 'idle lock on the head chef\'s Google device: it signs out over a change waiting to send (' + JSON.stringify(s) + ')');
    await p.context().close();
  });
  await safe('other tab', async () => {
    p = await owner(b, '#/prep', { who: 'ann' });
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    await S(p, () => window.dispatchEvent(new StorageEvent('storage', { key: 'lk.auth.lock', newValue: '1:x' }))); await L.settle(p, 400);
    s = await st(p);
    ok(!s.user && !s.authed, 'the other tab\'s lock on the head chef\'s Google device: it signs out over a change waiting to send (' + JSON.stringify(s) + ')');
    await p.context().close();
  });
  await safe('session ran out', async () => {
    p = await owner(b, '#/prep', { who: 'ann' });
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    ok(await S(p, () => window.LK_PREP.sendFirst()), 'session ran out: to start, Sign out waits for the line on the head chef\'s Google device');
    await S(p, () => { window.LK_PREP.state.sessExp = window.LK_TIME.now() - 1000; });
    await p.clock.runFor(16000); await L.settle(p, 400);
    s = await st(p);
    ok(!s.user && !s.authed, 'her PIN session running out on the head chef\'s Google device: it signs out over a change waiting to send (' + JSON.stringify(s) + ')');
    await p.context().close();
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
