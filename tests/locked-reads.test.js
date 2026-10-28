// Function contacts and minutes drafts (22 Oct 2026, review S9). A booking contact is read only by a function manager
// (their PIN session) or the head chef's Google account, and the form writes it only when it changed, so a phone that
// could not read it never saves blanks over it. Minutes drafts are for the head chef's Google account only: everyone
// else lists the published minutes by pubAt, which a draft never has. The stand-in refuses what the rules refuse.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results(), { txt, tap } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const today = L.ymd(new Date(L.NOW));
const at = hm => M.kat(today, M.hmMin(hm));
const PEOPLE = [
  { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
  { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true },
  { id: 'finn', name: 'Finn', role: 'fnc', add: false, tick: false, del: false, fn: true, active: true }
];
const smith = M.derive({ v: 1, status: 'confirmed', name: 'Smith 50th', date: today, start: at('18:00'), loc: 'Beer garden', guests: 60, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
  rounds: [{ at: at('18:30'), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 3, u: [0, 0, 0] }],
  was: {}, chg: [], cBy: 'finn', cAt: L.NOW - 86400000, confBy: 'finn', confAt: L.NOW - 86400000, by: 'finn', upd: L.NOW - 3600000 });
const JO = { cname: 'Jo Smith', phone: '0400 111 222', email: 'jo@example.com', upd: 1 };
const fnExtra = {
  [fsKey(['config', 'main'])]: { people: PEOPLE, sousIds: ['sam'], pingIds: ['sam'], staffIds: ['sam', 'ann', 'bo', 'finn'], fnIds: ['finn'], showBadges: true },
  [fsKey(['staffpins', 'finn'])]: { hash: L.sha('lk:finn:5252') }, [fsKey(['pinset', 'finn'])]: { at: 1 },
  [fsKey(['drinks', 'finn'])]: { kind: 'flat', at: 1, by: 'finn' },
  [fsKey(['functions', 'smith'])]: smith, [fsKey(['fncontact', 'smith'])]: JO
};
const mins = (no, x) => Object.assign({ no, v: 1, date: today, start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam', att: [{ id: 'ann', st: 'present' }], guests: '',
  decisions: 'Fryer oil every Monday', menu: '', safety: '', dates: '', other: '', acts: [], next: '', removed: false, at: 1, upd: 1 }, x);
const minExtra = {
  [fsKey(['minutes', 'm1'])]: mins(1, { status: 'published', pubAt: L.NOW - 3600000 }),
  [fsKey(['minutes', 'd1'])]: mins(2, { status: 'draft', decisions: 'Draft: new rosters' })
};
const minIds = p => p.evaluate(() => (window.LK_PREP.state.mins || []).map(m => m.id).sort().join(','));

(async () => {
  const b = await L.start();

  // a function manager reads the contact through their PIN session
  let p = await L.open(b, '#/functions/smith', { who: 'finn', extra: fnExtra, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-ff="cname"]'));
  ok(await p.inputValue('[data-ff="cname"]') === 'Jo Smith' && await p.$('.fe-cmiss') === null, 'contact: Finn sees the booking contact');
  // a save that leaves the contact alone does not write it
  await p.fill('[data-ff="kc"]', 'Cake at 20:30.');
  await tap(p, '[data-fe="save"]');
  await L.waitFor(p, () => /Version 2/.test((document.getElementById('fe-root') || {}).textContent || ''));
  let w = await p.evaluate(() => window.__fake.writes.filter(b => b.some(o => /\/functions\/smith$/.test(o.path))).pop() || []);
  ok(w.length && !w.some(o => /\/fncontact\//.test(o.path)), 'contact: a save that leaves it alone does not write it (' + w.map(o => o.path.split('/')[2]).join(',') + ')');
  // a changed phone number is written
  await p.click('.fe-contact summary'); await L.settle(p, 100);   // the contact folds away once it is filled in
  await p.fill('[data-ff="phone"]', '0400 333 444');
  await tap(p, '[data-fe="save"]');
  await L.waitFor(p, () => /Version 3/.test((document.getElementById('fe-root') || {}).textContent || ''));
  let c = (await store(p))[fsKey(['fncontact', 'smith'])];
  ok(c && c.phone === '0400 333 444' && c.cname === 'Jo Smith', 'contact: a changed phone number is saved (' + JSON.stringify(c) + ')');
  ok(p.errors.length === 0, 'manager: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the contact cannot be read on this phone: the form says so, and a save keeps the contact as it was
  p = await L.open(b, '#/functions/smith', { who: 'finn', extra: fnExtra, failReads: '/fncontact/', wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-ff="kc"]'));
  ok(/could not be read on this phone/.test(await txt(p, '.fe-cmiss') || ''), 'no contact: the form says the contact could not be read');
  await p.fill('[data-ff="kc"]', 'Cake at 21:00.');
  await tap(p, '[data-fe="save"]');
  await L.waitFor(p, () => /Version 2/.test((document.getElementById('fe-root') || {}).textContent || ''));
  c = (await store(p))[fsKey(['fncontact', 'smith'])];
  ok(c && c.cname === 'Jo Smith' && c.phone === '0400 111 222' && c.email === 'jo@example.com', 'no contact: the save keeps the contact as it was, no blanks (' + JSON.stringify(c) + ')');
  ok(p.errors.length === 0, 'no contact: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // staff: a contact read straight from the database is refused, even with a PIN session
  p = await L.open(b, '#/prep', { who: 'ann', extra: fnExtra, wait: 1500 });
  let res = await p.evaluate(async k => {
    const fs = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    try { await fs.getDoc(fs.doc(fs.getFirestore(), 'kitchens', k, 'fncontact', 'smith')); return 'read'; } catch (e) { return e.code; }
  }, L.PIN);
  ok(res === 'permission-denied', 'contact: staff cannot read it, even straight from the database (' + res + ')');
  await p.context().close();

  // minutes: staff list only the published ones; a draft cannot be read
  p = await L.open(b, '#/minutes', { who: 'ann', extra: minExtra, wait: 1500 });
  await L.waitFor(p, () => (window.LK_PREP.state.mins || []).length > 0);
  ok(await minIds(p) === 'm1', 'minutes: Ann\'s phone has the published minutes and no draft (' + await minIds(p) + ')');
  ok(/Fryer oil every Monday/.test(await txt(p, '#prep-root') || '') && !/new rosters/.test(await txt(p, '#prep-root') || ''), 'minutes: the page shows the published minutes');
  res = await p.evaluate(async k => {
    const fs = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'), db = fs.getFirestore();
    const one = await fs.getDoc(fs.doc(db, 'kitchens', k, 'minutes', 'd1')).then(() => 'read', e => e.code);
    const byDate = await fs.getDocs(fs.query(fs.collection(db, 'kitchens', k, 'minutes'), fs.where('date', '>=', '2000-01-01'))).then(() => 'read', e => e.code);
    return one + ',' + byDate;
  }, L.PIN);
  ok(res === 'permission-denied,permission-denied', 'minutes: a draft cannot be read, nor listed by date, straight from the database (' + res + ')');
  ok(p.errors.length === 0, 'minutes: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the head chef's Google account sees the draft in the admin panel
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: minExtra, wait: 2000 });
  await L.adminTab(p, 'minutes');
  await L.waitFor(p, () => (window.LK_PREP.state.mins || []).length > 1).catch(() => {});
  ok(await minIds(p) === 'd1,m1', 'minutes: the head chef\'s Google account has the draft too (' + await minIds(p) + ')');
  ok(p.errors.length === 0, 'admin: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // the reads that are for the chefs, the function managers or the Google account (28 Oct 2026, checked against the real
  // rules in tests/rules/client-shapes.test.mjs): the stand-in refuses them for staff like the rules do, and lists each
  // in __fake.refused, so a page tests/roles.test.js opens that starts asking for one fails there
  const ping = (to, x) => Object.assign({ text: 'See me at 15:00', tag: 'none', start: today, until: today, dows: [], tm: null, removed: false, upd: L.NOW, at: L.NOW, author: 'sam', by: 'sam', to }, x || {});
  const lockExtra = Object.assign({}, fnExtra, L.mail(), {
    [fsKey(['functions', 'smith', 'hist', '0'])]: { was: {}, at: 1, by: 'finn' },
    [fsKey(['cutdone', today + '_northside'])]: { day: today, sid: 'northside', on: true, at: L.NOW, by: 'sam' },
    [fsKey(['directnotes', 'd1'])]: ping('bo'), [fsKey(['directnotes', 'd1', 'seen', today + '_bo'])]: { day: today, at: L.NOW, by: 'bo' },
    [fsKey(['directnotes', 'd2'])]: ping('ann')
  });
  const probe = page => page.evaluate(async ([k, day]) => {
    const fs = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'), db = fs.getFirestore(), col = (...x) => fs.collection(db, 'kitchens', k, ...x);
    const cut = fs.query(col('cutdone'), fs.where('day', 'in', [day]));
    const tries = {
      cutdone: () => fs.getDocs(cut),
      cutListen: () => new Promise((res, rej) => { const stop = fs.onSnapshot(cut, s => { stop(); res(s); }, rej); }),
      mail: () => fs.getDocs(fs.query(col('mail'), fs.where('done', '==', false))),
      hist: () => fs.getDoc(fs.doc(db, 'kitchens', k, 'functions', 'smith', 'hist', '0')),
      histList: () => fs.getDocs(col('functions', 'smith', 'hist')),
      contacts: () => fs.getDocs(col('fncontact')),
      everyPing: () => fs.getDocsFromServer(fs.query(col('directnotes'), fs.where('until', '>=', day))),
      seen: () => fs.getDocs(fs.query(col('directnotes', 'd1', 'seen'), fs.where('day', '==', day))),
      myPings: () => fs.getDocsFromServer(fs.query(col('directnotes'), fs.where('until', '>=', day), fs.where('to', '==', 'ann')))
    };
    const out = {};
    for (const n of Object.keys(tries)) out[n] = await tries[n]().then(() => 'read', e => e.code === 'permission-denied' ? 'refused' : e.code);
    return out;
  }, [L.PIN, today]);
  const want = (got, w) => Object.keys(w).filter(n => got[n] !== w[n]).map(n => n + ' ' + got[n]);
  p = await L.open(b, '#/prep', { who: 'ann', extra: lockExtra, wait: 1500 });
  let got = await probe(p), bad = want(got, { cutdone: 'refused', cutListen: 'refused', mail: 'refused', hist: 'refused', histList: 'refused', contacts: 'refused', everyPing: 'refused', seen: 'refused', myPings: 'read' });
  ok(!bad.length, 'staff: supplier ticks (a query and a listener), mail, a function\'s history, the contact list, others\' personal pings and who saw them are refused; Ann\'s own pings are not (' + (bad.join(', ') || 'as the rules') + ')');
  const listed = await p.evaluate(() => window.__fake.refused.map(x => x.kind + ' ' + x.path.split('/').slice(2).join('/')));
  ok(listed.length === 8, 'staff: each refusal is listed in __fake.refused (' + listed.join(', ') + ')');
  await p.context().close();
  p = await L.open(b, '#/prep', { who: 'sam', extra: lockExtra, wait: 1500 });
  got = await probe(p); bad = want(got, { cutdone: 'read', cutListen: 'read', mail: 'refused', hist: 'read', histList: 'read', contacts: 'refused', everyPing: 'read', seen: 'read', myPings: 'read' });
  ok(!bad.length, 'sous chef: the chefs\' reads work; mail stays the head chef\'s while sous chef mail is off, and only the Google account lists contacts (' + (bad.join(', ') || 'as the rules') + ')');
  await p.context().close();
  p = await L.open(b, '#/functions/smith', { who: 'finn', extra: lockExtra, wait: 1500 });
  got = await probe(p); bad = want(got, { hist: 'read', histList: 'read', cutdone: 'refused', mail: 'refused', everyPing: 'refused' });
  ok(!bad.length, 'function manager: the function\'s history, nothing of the kitchen\'s (' + (bad.join(', ') || 'as the rules') + ')');
  await p.context().close();

  await b.close();
  L.report(R);
})();
