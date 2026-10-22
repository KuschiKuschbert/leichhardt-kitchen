// PIN sessions (22 Oct 2026, review S8). A right PIN opens a session for this phone (sessions/<its uid>); writes then carry
// only who wrote them, no proof, and nothing secret is kept on the phone. One PIN try every 20 seconds per person, checked
// by the rules (the stand-in checks it the same way). Sign out ends the session, a reset PIN stops it, a phone that signed
// in before moves to a session by itself, and the head chef signing in with Google moves the session to the new sign-in.
const L = require('./lib');
const { R, ok } = L.results();
const today = L.ymd(new Date(L.NOW));
const root = ['kitchens', L.PIN].join('/');
const fsKey = p => [root].concat(p).join('/');
const state = p => p.evaluate(() => { const s = window.LK_PREP.state; return { who: s.who, authed: s.authed, step: s.pinStep, msg: s.pinMsg }; });
const sessOf = (p, uid) => p.evaluate(a => { const u = a.uid || window.__fakeUid(); return u ? window.__fake.dump()[a.root + '/sessions/' + u] || null : null; }, { root, uid });
const item = (p, id) => p.evaluate(k => window.__fake.dump()[k] || null, fsKey(['days', today, 'items', id]));
// the last batch that wrote this path, as the stand-in logged it
const batchFor = (p, re) => p.evaluate(s => { const w = window.__fake.writes.filter(b => b.some(o => new RegExp(s).test(o.path))); return w[w.length - 1] || null; }, re);
// anything kept on the phone that looks like a PIN fingerprint (64 hex characters)
const secrets = p => p.evaluate(() => Object.keys(localStorage).filter(k => /^lk\./.test(k) && /[0-9a-f]{64}/.test(localStorage.getItem(k) || '')));
const hasSess = p => L.waitFor(p, r => { const u = window.__fakeUid(); return !!u && !!window.__fake.dump()[r + '/sessions/' + u]; }, root).catch(() => {});
async function signOut(p) {
  await p.evaluate(() => { const g = document.querySelector('.nt-got'); if (g) g.click(); });
  await p.click('.wtop-who'); await L.settle(p, 150);
  await p.click('.wm [data-who="out"]'); await L.settle(p, 400);
}
(async () => {
  const b = await L.start();

  // a phone that signed in before sessions (its PIN proof kept in lk.prep.tok) moves to a session by itself
  let p = await L.open(b, '#/prep', { who: 'sam', oldTok: true, wait: 1200 });
  await hasSess(p);
  let s = await sessOf(p);
  ok(s && s.by === 'sam' && s.pinAt === 1 && s.exp > L.NOW + 29 * 86400000 && s.exp < L.NOW + 31 * 86400000, 'an older phone: its kept proof opens a 30 day session for Sam (' + JSON.stringify(s) + ')');
  ok(await p.evaluate(() => localStorage.getItem('lk.prep.tok') || '') === '', 'the kept proof is dropped');
  ok((await secrets(p)).length === 0, 'nothing secret is kept on the phone');
  // a tick goes through the session: it carries who ticked it, and no proof
  await p.click('[data-p="tick"][data-id="i1"]'); await L.settle(p, 400);
  let wb = await batchFor(p, '/items/i1$'), i1 = await item(p, 'i1');
  ok(i1 && i1.done === true && i1.by === 'sam', 'a tick is saved, by Sam');
  ok(wb && !wb.some(o => /\/proofs\//.test(o.path)), 'with no proof in the batch (' + (wb ? wb.map(o => o.path.split('/').slice(2, 3)).join(',') : '') + ')');

  // a reload keeps Sam signed in through the session alone
  await p.reload(); await L.settle(p, 1200);
  let st = await state(p);
  ok(st.who === 'sam' && st.authed, 'reload: Sam is still signed in (' + JSON.stringify(st) + ')');
  await p.click('[data-p="tick"][data-id="i2"]'); await L.settle(p, 400);
  wb = await batchFor(p, '/items/i2$');
  ok((await item(p, 'i2') || {}).done === true && wb && !wb.some(o => /\/proofs\//.test(o.path)), 'reload: a tick still saves, with no proof');

  // Reset PIN (here a new PIN time set on another device) stops the session: the next tick is refused and the PIN asked
  await p.evaluate(a => window.__fake.write(a.k, { at: 99, name: 'Sam' }), { k: fsKey(['pinset', 'sam']) });
  await p.click('[data-p="tick"][data-id="i3"]'); await L.settle(p, 1200);
  st = await state(p);
  ok(!(await item(p, 'i3') || {}).done && !st.authed && st.step === 'enter', 'after Reset PIN a tick is refused and the PIN is asked again (' + JSON.stringify(st) + ')');
  // someone tried Sam's PIN on another phone a moment ago: this try waits 20 seconds (the rules say so, not the page)
  await p.evaluate(a => window.__fake.write(a.k, { tok: 'x'.repeat(64), at: Date.now(), uid: 'another-phone' }), { k: fsKey(['tries', 'sam']) });
  await p.keyboard.type('1111'); await L.settle(p, 900);
  st = await state(p);
  ok(!st.authed && /One try every 20 seconds/.test(st.msg), 'a second try within 20 seconds waits (' + st.msg + ')');
  await p.clock.runFor(25000); await L.settle(p, 300);
  await p.keyboard.type('1111'); await L.settle(p, 900);
  st = await state(p); s = await sessOf(p);
  ok(st.authed && s && s.by === 'sam' && s.pinAt === 99, 'then the PIN opens a new session with the new PIN time (' + JSON.stringify(s) + ')');
  await p.click('[data-p="tick"][data-id="i3"]'); await L.settle(p, 400);
  ok((await item(p, 'i3') || {}).done === true, 'and the tick saves');

  // Sign out ends the session on the server and on the phone
  const uid = await p.evaluate(() => window.__fakeUid());
  await signOut(p);
  ok(await sessOf(p, uid) === null && await p.evaluate(() => localStorage.getItem('lk.prep.sess') || '') === '', 'Sign out ends the session');

  // a wrong PIN, then the right one straight away: it waits, then goes in by itself
  await p.click('.p-name[data-id="ann"]'); await L.settle(p, 250);
  await p.keyboard.type('9999'); await L.settle(p, 900);
  st = await state(p);
  ok(/That PIN is not right/.test(st.msg) && !st.authed, 'a wrong PIN is refused (' + st.msg + ')');
  ok(await sessOf(p) === null, 'and opens no session');
  await p.keyboard.type('2222'); await L.settle(p, 600);
  st = await state(p);
  ok(/One try every 20 seconds. Your PIN goes in by itself in \d+ seconds/.test(st.msg) && !st.authed, 'the right PIN straight after waits for its turn (' + st.msg + ')');
  await p.clock.runFor(22000); await L.settle(p, 900);
  st = await state(p); s = await sessOf(p);
  ok(st.who === 'ann' && st.authed && s && s.by === 'ann', 'then it goes in by itself: Ann is signed in with a session (' + JSON.stringify(st) + ')');
  ok((await secrets(p)).length === 0, 'still nothing secret on the phone');

  // the head chef signs in with Google on this phone: the sign-in changes, so Ann's session moves to it
  await p.goto(L.BASE + '#/admin'); await L.settle(p, 800);
  await p.click('[data-p="signin"]'); await L.settle(p, 600);
  await p.clock.runFor(22000); await L.settle(p, 900);   // Ann's PIN went in a moment ago: the move waits for its turn
  s = await sessOf(p, 'owner');
  ok(s && s.by === 'ann', 'Google sign-in: the session moves to the new sign-in (' + JSON.stringify(s) + ')');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a first PIN opens a session straight away
  p = await L.open(b, '#/prep', { who: '', wait: 1200, extra: { [fsKey(['staffpins', 'bo'])]: undefined, [fsKey(['pinset', 'bo'])]: undefined } });
  await p.click('.p-name[data-id="bo"]'); await L.settle(p, 300);
  await p.keyboard.type('3434'); await L.settle(p, 300);
  await p.keyboard.type('3434'); await L.settle(p, 1200);
  st = await state(p); s = await sessOf(p);
  ok(st.who === 'bo' && st.authed && s && s.by === 'bo', 'a first PIN: Bo is signed in with a session (' + JSON.stringify(s) + ')');
  ok(await p.evaluate(() => localStorage.getItem('lk.prep.tok') || '') === '' && (await secrets(p)).length === 0, 'and nothing secret is kept on the phone');
  ok(p.errors.length === 0, 'first PIN: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})();
