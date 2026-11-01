// Every manual identity change waits until primary-device writes are acknowledged; no second tap bypasses it.
// A separate Google proof does not strand a PIN writer's changes. Draft discard still needs confirmation.
// Automatic privacy locks hide private content immediately, keeping the original recorder's unsent work:
// personal devices have no idle lock and retain Google at04; shared devices locally sign out Google after10min/04.
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
const owner = (b, hash, o) => L.open(b, hash, Object.assign({ admin: true, who: 'ann', extra, wait: 1800 }, o || {}));
const verified = p => L.waitFor(p, () => window.LK_PREP.state.level === 'owner', null, 8000).catch(() => {});
async function safe(label, fn) { try { await fn(); } catch (e) { ok(false, label + ' threw ' + String(e).split('\n')[0]); } }

(async () => {
  const b = await L.start();
  let p, s;

  // A daily head PIN plus Google grant: every sign-out surface waits, a second tap too.
  for (const w of [390, 1280]) await safe(w + ' daily head and Google', async () => {
    p = await owner(b, '#/prep', { width: w, height: w > 400 ? 900 : 844 });
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    ok((await st(p)).unsent, w + ' head PIN + Google: the line waits to send');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 300);
    s = await st(p);
    ok(s.user && s.admin === '1' && await txt(p, '.nb-top [data-p="who-change"]') === 'Not sent yet.', w + ' head PIN + Google: Not you? says Not sent yet and keeps the Google account (' + await txt(p, '.nb-top [data-p="who-change"]') + ', ' + JSON.stringify(s) + ')');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 400);
    s = await st(p);
    ok(s.user && s.unsent && await txt(p, '.nb-top [data-p="who-change"]') === 'Not sent yet.', w + ' head PIN + Google: a second tap on Not you? does not get past it (' + JSON.stringify(s) + ')');
    ok(!(await L.overflow(p)), w + ' head PIN + Google: no sideways scroll with Not sent yet (' + await L.overflow(p) + ')');
    await S(p, () => { location.hash = '#/admin'; }); await L.settle(p, 800);
    await L.waitFor(p, () => !!document.querySelector('.p-bar [data-p="signout"]'), null, 8000).catch(() => {});
    await p.click('.p-bar [data-p="signout"]'); await L.settle(p, 300);
    s = await st(p);
    ok(s.user && await txt(p, '.p-bar [data-p="signout"]') === 'Not sent yet.', w + ' head PIN + Google: Sign out of Google says Not sent yet and keeps the account (' + await txt(p, '.p-bar [data-p="signout"]') + ', ' + JSON.stringify(s) + ')');
    await p.click('.p-bar [data-p="signout"]'); await L.settle(p, 400);
    s = await st(p);
    ok(s.user && s.unsent, w + ' head PIN + Google: a second tap on Sign out of Google does not get past it (' + JSON.stringify(s) + ')');
    ok(!(await L.overflow(p)), w + ' head PIN + Google, admin: no sideways scroll with Not sent yet (' + await L.overflow(p) + ')');
    await release(p);
    ok(await S(p, () => { const d = window.__fake.dump(); return Object.keys(d).some(k => /\/items\//.test(k) && d[k].text === 'Peel garlic'); }), w + ' head PIN + Google: the line reaches the server once the signal is back');
    await p.click('.p-bar [data-p="signout"]'); await L.settle(p, 600);
    s = await st(p);
    ok(!s.user && s.admin === '', w + ' head PIN + Google: once it is sent, one tap on Sign out of Google signs out (' + JSON.stringify(s) + ')');
    ok(p.errors.length === 0, w + ' head PIN + Google: no page errors ' + p.errors.join(' | '));
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

  // Google sign-in waits for ordinary pending work, with no second-tap override.
  // Once acknowledged, the secondary Google proof can augment the same head-PIN session.
  await safe('sign in waits', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1800 });
    await hold(p);
    await waiting(p, 'Peel garlic');
    await S(p, () => { location.hash = '#/admin'; }); await L.settle(p, 800);
    await L.waitFor(p, () => !!document.querySelector('[data-p="signin"]'), null, 8000).catch(() => {});
    await p.click('[data-p="signin"]'); await L.settle(p, 300);
    s = await st(p);
    ok(!s.user && s.authed && s.unsent && !await S(p, () => __fakeAuthUser('kitchen-owner')) && await txt(p, '#lk-live') === 'Not sent yet. Sign in once it is sent.', 'head chef PIN only: Sign in with Google announces Not sent yet and does not authenticate (' + await txt(p, '[data-p="signin"]') + ', ' + await txt(p, '#lk-live') + ', ' + JSON.stringify(s) + ')');
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

  // A popup already open may finish during a pending write. Secondary Google never replaces its primary recorder.
  await safe('popup completes while sending', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1800 });
    const primary = await S(p, () => __fakeUid());
    await hold(p);
    await waiting(p, 'Peel garlic');
    await S(p, async () => { window.__fake.mode = 'ok'; const a = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'); await a.signInWithPopup(a.getAuth({name:'kitchen-owner'})); });
    await verified(p); await L.settle(p, 400);
    s = await st(p);
    ok(s.user && s.who === 'ann' && s.unsent && await S(p, () => window.LK_PREP.sendFirst()) && await S(p, () => __fakeUid()) === primary, 'popup: Google proof retains Ann primary UID, pending recorder and sign-out guard (' + JSON.stringify(s) + ')');
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 200);
    ok((await st(p)).authed && await txt(p, '.wm-out small') === 'Not sent yet.', 'popup: Sign out keeps waiting for the original write');
    await p.click('.wm [data-who="out"]'); await L.settle(p, 600);
    s = await st(p);
    ok(s.authed && s.user && s.unsent, 'popup: a second tap cannot bypass the pending recorder guard (' + JSON.stringify(s) + ')');
    await release(p);
    ok(await S(p, () => {
      const lines = Object.entries(__fake.dump()).filter(([path, d]) => /\/days\/[^/]+\/items\/[^/]+$/.test(path) && d.text === 'Peel garlic');
      const writes = __fake.writes.flat().filter(op => /\/items\/[^/]+$/.test(op.path) && op.data && op.data.text === 'Peel garlic');
      return lines.length === 1 && lines[0][1].by === 'ann' && writes.length === 1 && writes[0].app === '[DEFAULT]';
    }), 'popup: exactly one acknowledged primary-device line retains Ann attribution');
    await p.click('.wm [data-who="out"]'); await L.settle(p, 600);
    ok(!(await st(p)).authed && !(await st(p)).user, 'popup: acknowledged work permits ordinary sign-out');
    ok(p.errors.length === 0, 'popup during send: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // PIN-only writers keep the same pending guard, through both manual handover surfaces.
  await safe('head chef PIN only', async () => {
    p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1800 });
    await hold(p);
    await waiting(p, 'Peel garlic');
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 200);
    ok((await st(p)).authed && await txt(p, '.wm-out small') === 'Not sent yet.', 'head chef PIN only: the chef hat announces Not sent yet');
    await p.click('.wm [data-who="out"]'); await L.settle(p, 600);
    s = await st(p);
    ok(s.authed && s.who === 'ann' && s.unsent, 'head chef PIN only: the second tap cannot discard a pending writer (' + JSON.stringify(s) + ')');
    await release(p); await p.click('.wm [data-who="out"]'); await L.settle(p, 500);
    ok(!(await st(p)).authed, 'head chef PIN only: acknowledgement permits chef-hat sign-out');
    await p.context().close();
    p = await L.open(b, '#/prep', { who: 'ann', extra, wait: 1800 });
    await hold(p);
    await waiting(p, 'Peel garlic');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 300);
    ok((await st(p)).authed && await txt(p, '.nb-top [data-p="who-change"]') === 'Not sent yet.', 'head chef PIN only: Not you? announces Not sent yet');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 600);
    s = await st(p);
    ok(s.authed && s.who === 'ann' && s.unsent, 'head chef PIN only: a second Not you? tap cannot bypass pending work (' + JSON.stringify(s) + ')');
    await release(p); await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 500);
    ok(!(await st(p)).authed, 'head chef PIN only: acknowledgement permits Not you? handover');
    ok(p.errors.length === 0, 'head chef PIN only: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  });

  // Shared devices use the same manual guard. Automatic privacy locks remain immediate.
  await safe('shared', async () => {
    p = await owner(b, '#/prep', { settings: { shared: true } });
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 300);
    ok((await st(p)).user && await txt(p, '.nb-top [data-p="who-change"]') === 'Not sent yet.', 'shared kitchen device: Not you? announces Not sent yet');
    await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 600);
    ok((await st(p)).user && (await st(p)).authed, 'shared kitchen device: a second tap cannot bypass pending work');
    await release(p); await p.click('.nb-top [data-p="who-change"]'); await L.settle(p, 500);
    ok(!(await st(p)).user && !(await st(p)).authed, 'shared kitchen device: acknowledgement permits manual handover');
    await p.context().close();
  });

  await safe('personal has no idle lock', async () => {
    p = await owner(b, '#/prep');
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    await p.clock.runFor(11 * 60000); await L.settle(p, 400);
    s = await st(p);
    ok(s.user && s.authed && s.unsent && s.admin === '1', 'personal device: eleven idle minutes retain the daily head session and pending work (' + JSON.stringify(s) + ')');
    await p.context().close();
  });
  await safe('shared idle lock', async () => {
    p = await owner(b, '#/prep', { deviceMode: 'shared' });
    await verified(p); await hold(p); await waiting(p, 'Peel garlic');
    await p.clock.runFor(10 * 60000 + 16000); await L.settle(p, 400);
    s = await st(p);
    ok(!s.user && !s.authed && s.unsent && !await S(p, () => __fakeAuthUser('kitchen-owner')) && !await p.$('.nb-row'), 'shared ten-minute lock hides private UI and locally signs Google out while its deletes and original work are held');
    await p.context().close();
  });
  await safe('other tab', async () => {
    p = await owner(b, '#/prep', { who: 'ann' });
    await verified(p); await hold(p);
    await waiting(p, 'Peel garlic');
    await S(p, () => window.dispatchEvent(new StorageEvent('storage', { key: 'lk.auth.lock', newValue: '1:x' }))); await L.settle(p, 400);
    s = await st(p);
    ok(!s.authed && s.unsent && !await S(p, () => LK_PREP.privateAccess()) && !await p.$('.nb-row'), 'other-tab handover: private UI locks immediately while the original pending recorder is retained (' + JSON.stringify(s) + ')');
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
    ok(s.user && !s.authed && s.unsent && !await S(p, () => LK_PREP.privateAccess()) && !await p.$('.nb-row'), 'personal daily cutoff: Google remains remembered, private UI locks immediately and pending work stays with its recorder (' + JSON.stringify(s) + ')');
    await p.context().close();
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
