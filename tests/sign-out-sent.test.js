// Sign out waits until sent on the head chef's own Google device (head chef, 29 Oct 2026). A sign-out there signs the
// Google account out too, and a change still waiting to send went with it. While one waits, Sign out of Google, the
// lone Not you? and the head chef's own Sign out (the chef hat, Not you? beside Writing as) say "Not sent yet." and do
// nothing, a second tap too, like Update now. Once it is sent, the next tap signs out as usual, and the "Not saved yet"
// second tap for something half typed stays as it was. Only there: a shared kitchen device keeps "Not sent. Tap again"
// (staff phones are in chef-menu.test.js), and the idle lock and the other tab's lock never wait for it.
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

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
