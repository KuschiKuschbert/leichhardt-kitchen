/*
  The book's Firestore calls, as the book makes them, against the real rules for each sign-in (28 Oct 2026, r2-1-4).
  One row per call shape: the read, query, listener or batch with the book's own paths, filters, fields and merges,
  labelled with its file and function (not line numbers, they move). A call that sends what a row sends (Put back after
  Remove, a second page that asks the same read) shares that row; a change with a rule clause of its own (an untick, an
  Undo, an edit, sous chef mail switched on) is a row of its own, and so is each list with a rule of its own (a row
  that read two would hide one of them let through). W() is copied from js/prep.js: by on every set and update (empty
  on the head chef's Google device with nobody signed in by PIN), and the public copy of a recipe, a drawing,
  book/index and book/matches in the same batch.

  Each row runs as 9 sign-ins (made-up people, the stand-in's own names):
    owner   the head chef's Google account, nobody signed in by PIN
    ownkit  the same Google device with Kit (the head chef, headId) signed in by PIN
    kit     Kit on their PIN only (headId, also in sousIds)
    sam     a sous chef (sousIds)
    ann     staff
    lou     a lead
    vic     view only
    fay     functions only (fnIds and fnOnlyIds, on the staff list but not kitchen staff)
    tab     Bo, staff, on a shared kitchen tablet (its own phone sign-in)
  ok lists who the rules let through; everyone else must be refused, and every cell is checked against it. asks lists
  the sign-ins whose pages make the call and need it to work, and the file checks that every one of them is in ok: a
  page that needs what the rules refuse is a live bug. Such a row is marked known for those sign-ins, with the pull
  request that fixes it, printed as KNOWN, and that need is kept out of the failure count. A known mark also notes a
  client bug that sends a call the rules rightly refuse. It never excuses the rules: a known cell that the rules start
  to answer the other way fails like any other.

  What the other files in tests/rules already check (not repeated here):
    rules.test.mjs         each rule with hand-made shapes: the staff lock, PIN tries and sessions, who sets a PIN,
                           config/main for sous chefs, tallies, pings, minutes and sign-offs, mail, drinks, sections,
                           the book and its versions, functions with the largest booking, Sent ticks, past days,
                           wastage, usage counts, transfers and returns, contacts and drafts (S9), to-do, pushes
    access.test.mjs        signed out, anonymous and a session that ran out: every private path refused, the public
                           recipe copies readable; what functions only and staff may read by path; public copies equal
                           to the canonical record
    owner-saves.test.mjs   the Google device with nobody on PIN saving after a sous chef (recipe, drawing, picks, a Sent
                           tick, transfer Remove, Put back and Return, function Cancel and Undo), through W()
    direct-pings.test.mjs  personal pings: who writes, reads and marks them seen
    deliveries.test.mjs    delivery receipts: every field, the day window, immutable records
    suppliers.test.mjs     the supplier catalogue, its orders, links and ticks, through the real Lite SDK
    wastage-history.test.mjs  the admin wastage history query (collection group by full path)
    probe.test.mjs         the live lock probe's own checks
  So the PIN sign-in itself, supplier writes, wastage history and the PIN move's writes are not rows here.
  Run with the other rules checks: cd tests/rules && npm test.
*/
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, getDocFromServer, getDocsFromServer, onSnapshot, collection, query, where, orderBy, limit, documentId,
  setDoc, deleteDoc, writeBatch, increment, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

setLogLevel('silent');   // a refusal is an answer here, not something to log
const PIN = '000000', OWNER = 'headchef@test.local', K = 'kitchens/' + PIN + '/';
const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8').replaceAll('KITCHEN_PIN', PIN).replaceAll('OWNER_EMAIL', OWNER);
const env = await initializeTestEnvironment({ projectId: 'demo-client-shapes', firestore: { rules } });
await env.clearFirestore();

// kitchen time is Queensland (UTC+10): today's date, its midnight, 18:00 tonight
const NOW = Date.now(), MIN = 60000, DAY = 86400000;
const kday = ms => new Date(ms + 10 * 3600000).toISOString().slice(0, 10);
const TODAY = kday(NOW), YDAY = kday(NOW - DAY), TMW = kday(NOW + DAY), PAST = kday(NOW - 5 * DAY);
const MIDNIGHT = Date.parse(TODAY + 'T00:00:00Z') - 10 * 3600000, T0 = Date.parse(TODAY + 'T08:00:00Z');

const P = (id, name, role, x) => Object.assign({ id, name, role, add: true, tick: true, del: role !== 'staff', ping: false, fn: false, active: true }, x || {});
const PEOPLE = [P('kit', 'Kit', 'head', { ping: true }), P('sam', 'Sam', 'sous', { ping: true }), P('ann', 'Ann', 'staff'), P('bo', 'Bo', 'staff'),
  P('lou', 'Lou', 'lead'), P('vic', 'Vic', 'view', { add: false, tick: false, del: false }),
  P('fay', 'Fay', 'fnc', { add: false, tick: false, del: false, fn: true }), P('finn', 'Finn', 'fnc', { add: false, tick: false, del: false, fn: true })];
const IDS = PEOPLE.map(p => p.id);
const CFG = { people: PEOPLE, headId: 'kit', sousIds: ['kit', 'sam'], pingIds: ['kit', 'sam'], staffIds: IDS, fnIds: ['fay', 'finn'], fnOnlyIds: ['fay', 'finn'],
  pinOpen: {}, sousMail: false, showBadges: true, staffSee: { guides: true, pings: true, minutes: true },
  kitSecs: [{ id: 'larder', name: 'Larder', off: false }], cutoffs: [{ id: 'northside', name: 'Northside Test Foods', dd: [1], at: 900, pre: 1, lead: 240 }] };
const ROSTER = { people: PEOPLE, staffIds: IDS, sousIds: CFG.sousIds, headId: 'kit', fnIds: CFG.fnIds, fnOnlyIds: CFG.fnOnlyIds };

/* ---------- the 9 sign-ins ---------- */
const ALL = ['owner', 'ownkit', 'kit', 'sam', 'ann', 'lou', 'vic', 'fay', 'tab'];
const WHO = { owner: '', ownkit: 'kit', kit: 'kit', sam: 'sam', ann: 'ann', lou: 'lou', vic: 'vic', fay: 'fay', tab: 'bo' };
const UID = { owner: 'g-owner', ownkit: 'g-ownkit', kit: 'u-kit', sam: 'u-sam', ann: 'u-ann', lou: 'u-lou', vic: 'u-vic', fay: 'u-fay', tab: 'u-tab' };
const NAME = { owner: '', ownkit: 'Kit', kit: 'Kit', sam: 'Sam', ann: 'Ann', lou: 'Lou', vic: 'Vic', fay: 'Fay', tab: 'Bo' };
const google = { email: OWNER, email_verified: true, firebase: { sign_in_provider: 'google.com' } }, anon = { firebase: { sign_in_provider: 'anonymous' } };
const DB = Object.fromEntries(ALL.map(r => [r, env.authenticatedContext(UID[r], r === 'owner' || r === 'ownkit' ? google : anon).firestore()]));
// who the pages are: kitchenAccess() is everyone but functions only; the chefs are headId and sousIds, on their PIN
// or the head chef's Google device (todoOK(), cutWho(), bookEdit()); the crew are staff, the lead, view only and the tablet
const not = (...x) => ALL.filter(r => !x.includes(r));
const KITCHEN = not('fay'), PINS = not('owner'), KPINS = not('owner', 'fay'), GOOGLE = ['owner', 'ownkit'];
const CHEFS = ['owner', 'ownkit', 'kit', 'sam'], CREW = ['ann', 'lou', 'vic', 'tab'];
const ADDS = not('vic', 'fay'), TICKS = ADDS, DELS = ['owner', 'ownkit', 'kit', 'sam', 'lou'];   // can('add'), can('tick'), can('del')
const MAIL = ['sam', 'ann', 'lou', 'vic', 'tab'];   // Kitchen mail in the chef hat: everyone signed in but the head chef
const FNMGR = ['owner', 'fay'], FNCANCEL = ['owner', 'ownkit', 'kit', 'sam', 'fay'];   // fnOK(), fnCancelOK()

/* ---------- the data the reads find and the writes change ---------- */
async function off(fn) { await env.withSecurityRulesDisabled(async c => fn(c.firestore())); }
const at = p => p.startsWith('/') ? p.slice(1) : K + p;
// set records with the rules off: { path: data } (a path starting with / is outside the kitchen); null deletes it
async function put(map) {
  await off(async db => {
    const b = writeBatch(db);
    for (const [p, d] of Object.entries(map)) { if (d === null) b.delete(doc(db, at(p))); else b.set(doc(db, at(p)), d); }
    await b.commit();
  });
}
// a field or two of config/main changed with the rules off (a switch the head chef turns on for one row, then off)
const cfgMerge = x => off(db => setDoc(doc(db, at('config/main')), x, { merge: true }));
const fnRec = (id, x) => Object.assign({ v: 1, status: 'confirmed', name: 'Party ' + id, date: TODAY, start: T0, loc: 'Deck', guests: 30, mode: 'all',
  lines: [{ rid: 'pizza', name: 'Pizza Platter', unit: 'platter', spec: '', fp: '', qty: 2, u: [0, 0] }], rounds: [{ at: T0, note: '' }],
  notes: '', kc: '', kcBy: '', kcAt: 0, od: TODAY, first: T0, last: T0, from: T0 - 18 * 3600000, until: T0 + 7200000, kq: T0 + 7200000,
  was: {}, chg: [], cBy: 'fay', cAt: NOW - 3 * DAY, confBy: 'fay', confAt: NOW - 3 * DAY, by: 'fay', upd: NOW - 3 * DAY }, x || {});
const pline = id => ({ text: 'Pizza Platter: Party ' + id + ', at 18:00', qty: '2 platters', station: 'Functions', recipe: 'pizza', fn: id, dupOk: true });
const oline = id => ({ text: 'Function stock: Party ' + id, qty: '2 platters', recipes: ['pizza'], fn: id, dupOk: true });
const line = x => Object.assign({ text: 'Slice onion', station: 'Larder', qty: '2 kg', qn: 2, qu: 'kg', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: NOW - 3600000, done: false, deleted: false, by: 'ann' }, x || {});
// a line as the page writes it: W() adds the writer
const newLine = x => { const d = line(x); delete d.by; return d; };
const xrec = x => Object.assign({ dir: 'out', venue: 'Causeway', person: 'Jo', text: 'Cream', amount: 2, unit: 'L', note: '', addedBy: 'Ann', addedById: 'ann', addedAt: NOW - 3600000, deleted: false, by: 'ann' }, x || {});
// a recipe record; with no by it is the record W() sends (W() adds the writer)
const recipe = (id, v, by, x) => Object.assign({ r: { id, kind: 'main', name: 'Recipe ' + id, yield: 'Per plate', ingredients: [], pins: [], sections: [] }, v, upd: NOW - DAY, src: 'new', base: '', removed: false }, by === undefined ? {} : { by }, x || {});
const drawing = (rid, v) => ({ rid, slot: 'plate', name: 'Plate', vb: '-110 -110 220 220', k: 1, surf: { fam: 'plate', size: 30 }, els: [], defs: '{}',
  svgS: '<circle cx="0" cy="0" r="100" fill="#FFFFFF"/>', svgF: '<circle cx="0" cy="0" r="20" fill="#8E5A22"/>', alt: 'Top-down drawing', from: '', layout: { auto: 1 }, v, upd: Date.now(), removed: false });
const mins = x => Object.assign({ no: 1, v: 1, status: 'published', pubAt: NOW - DAY, date: YDAY, start: '14:00', loc: 'Kitchen', guests: '', chair: 'sam', taker: 'sam', next: '',
  decisions: 'Label every tub', menu: '', safety: '', dates: '', other: '', att: [{ id: 'ann', st: 'present' }], acts: [], removed: false, at: 1, upd: 1, by: '' }, x || {});
const ping = x => Object.assign({ text: 'Fish delivery 10:00', tag: 'delivery', start: TODAY, until: TODAY, dows: [], tm: null, removed: false, upd: NOW, at: NOW, author: 'sam', by: 'sam' }, x || {});

const seed = {
  'config/main': CFG, 'login/roster': ROSTER, 'config/admins': { x: 1 },
  [`days/${TODAY}/items/l1`]: line(), [`days/${YDAY}/items/l0`]: line({ text: 'Pick herbs', addedAt: NOW - DAY }),
  [`orders/${TODAY}/lines/o1`]: { text: 'Cream', qty: '4 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: NOW - 3600000, ordered: false, deleted: false, by: 'ann' },
  [`orders/${PAST}/lines/o0`]: { text: 'Milk', qty: '10 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: NOW - 5 * DAY, ordered: true, deleted: false, by: 'ann' },
  [`waste/${TODAY}/lines/w1`]: { text: 'Bread', amount: 2, unit: 'kg', reason: 'excess', action: '', station: 'Larder', addedBy: 'Ann', addedById: 'ann', addedAt: NOW - 3600000, deleted: false, by: 'ann' },
  [`waste/${PAST}/lines/w0`]: { text: 'Chips', amount: 1, unit: 'kg', reason: 'excess', action: '', station: 'Fryer', addedBy: 'Ann', addedById: 'ann', addedAt: NOW - DAY, deleted: false, by: 'ann' },
  [`waste/${TODAY}`]: { avoidable: '', change: '', by: 'sam' }, [`waste/${YDAY}`]: { avoidable: 'Too many chips', change: 'Blanch two crates', by: 'sam' },
  [`transfers/${PAST}/lines/t1`]: xrec({ addedAt: NOW - 5 * DAY }), [`transferOpen/${PAST}_t1`]: { date: PAST, lineId: 't1', record: xrec({ addedAt: NOW - 5 * DAY }), open: true, by: 'ann' },
  [`transfers/${TODAY}/lines/t2`]: xrec(), [`transferOpen/${TODAY}_t2`]: { date: TODAY, lineId: 't2', record: xrec(), open: true, by: 'ann' },
  'notes/n1': ping({ dows: [] }), [`notes/n1/seen/${TODAY}_ann`]: { day: TODAY, at: NOW, by: 'ann' },
  'directnotes/d1': ping({ text: 'Ann, see me at 15:00', tag: 'none', to: 'ann' }), [`directnotes/d1/seen/${TODAY}_ann`]: { day: TODAY, at: NOW, by: 'ann' },
  'minutes/m1': mins(), 'minutes/m1/signs/1_ann': { v: 1, st: 'present', at: NOW, name: 'Ann', by: 'ann' }, 'minutes/m2': mins({ no: 2, status: 'draft', pubAt: null, date: TODAY }),
  'guides/g1': { title: 'Dishwasher', cat: 'equipment', pages: 1, v: 1, removed: false }, 'guides/g1/pages/0': { img: 'data:image/png;base64,AA', v: 1, n: 0 },
  'functions/f1': fnRec('f1'), 'functions/f1/hist/0': { was: {}, at: 1, by: 'fay' }, 'fncontact/f1': { cname: 'Jo Example', phone: '0400 000 000', email: '', upd: 1, by: 'fay' },
  [`fnsent/f1_${T0}`]: { fid: 'f1', at: T0, day: TODAY, sent: false, sentAt: 1, sentBy: 'ann', by: 'sam' },
  'mail/x1': { from: 'ann', by: 'ann', cat: 'stock', pri: 'week', text: 'Out of foil', at: NOW, done: false, seen: false },
  'mail/x0': { from: 'ann', by: 'ann', cat: 'stock', pri: 'week', text: 'Gloves', at: NOW - 3 * DAY, done: true, doneAt: NOW - DAY, seen: true },
  'mailstat/x1': { by: 'ann', seen: false, done: false },
  'todos/td1': { text: 'Call the fridge tech', st: 'open', due: '', for: '', from: 'sam', at: NOW, doneAt: 0, doneBy: '', upd: NOW, by: 'sam' },
  'todos/td0': { text: 'Fixed the dishwasher', st: 'done', due: '', for: '', from: 'sam', at: NOW - DAY, doneAt: NOW - DAY, doneBy: 'sam', upd: NOW - DAY, by: 'sam' },
  [`cutdone/${TODAY}_northside`]: { day: TODAY, sid: 'northside', on: true, at: NOW, by: 'sam' },
  'suppliers/s1': { name: 'Northside Test Foods', cutoffId: 'northside', v: 1, items: [], at: 1, by: 'kit' },
  [`supplierlinks/${TODAY}_northside`]: { sid: 's1', cutoffId: 'northside', day: TODAY, v: 1, orderId: 'o1', at: 1, by: 'sam' },
  'drinks/ann': { by: 'ann', kind: 'flat', at: 1 }, [`shifts/${TODAY}_ann`]: { by: 'ann', day: TODAY, sec: 'larder', name: 'Larder', auto: false, at: 1 },
  'activity/ann': { name: 'Ann', visits: 1, by: 'ann' }, 'sections/larder': { name: 'Larder', uses: 1, by: 'ann' },
  'learned/slice-onion': { text: 'Slice onion', uses: 3 }, 'ordlearned/cream': { text: 'Cream', uses: 3 },
  'summary/learned': { day: TODAY, items: [] }, 'summary/ordlearned': { day: TODAY, items: [] }, 'summary/waste': { day: TODAY, items: [] },
  'summary/transfers': { day: TODAY, venues: [], items: [] }, 'summary/usage': { day: TODAY, days: {} },
  'views/burger': { name: 'Burger', n: 1, by: 'ann' }, 'misses/tofu': { q: 'tofu', n: 1, by: 'ann' },
  'deliveries/del1': { day: TODAY, receivedAt: NOW - 60000, recordedAt: NOW, supplier: 'Valley Veg', chilled: 3, frozen: null, note: '', receivedBy: 'Ann', receivedById: 'ann', by: 'ann' },
  'deliveries/del0': { day: PAST, receivedAt: NOW - 5 * DAY, recordedAt: NOW - 5 * DAY, supplier: 'Valley Veg', chilled: 4, frozen: null, note: '', receivedBy: 'Ann', receivedById: 'ann', by: 'ann' },
  'book/index': { r: { burger: 1 }, d: { 'burger-plate': 1 }, by: 'sam', upd: 1 }, '/publicBook/index': { r: { burger: 1 }, d: { 'burger-plate': 1 }, by: 'sam', upd: 1 },
  'book/matches': { m: { onion: 'onion-ring' }, upd: 1, by: 'sam' }, '/publicBook/matches': { m: { onion: 'onion-ring' }, upd: 1, by: 'sam' },
  'recipes/burger': recipe('burger', 1, 'sam'), '/publicRecipes/burger': recipe('burger', 1, 'sam'), 'recipes/burger/hist/0': { was: {}, at: 1, by: 'sam' },
  'drawings/burger-plate': Object.assign(drawing('burger', 1), { by: 'sam' }), '/publicDrawings/burger-plate': Object.assign(drawing('burger', 1), { by: 'sam' }),
  'drawtpl/t1': { name: 'Round plate', slot: 'plate', surf: {}, els: [], v: 1, upd: 1, removed: false }, 'drawlib/p1': { type: 'surf', name: 'Board', v: 1, upd: 1, removed: false },
  'staffpins/ann': { hash: 'a'.repeat(64) }
};
for (const id of IDS) seed['pinset/' + id] = { at: 1 };
// every sign-in but the Google account alone has a running PIN session on its own phone (the tablet's is Bo's)
for (const r of PINS) seed['sessions/' + UID[r]] = { by: WHO[r], pinAt: 1, exp: NOW + 20 * DAY, at: 1 };
await put(seed);

/* W() from js/prep.js: the writer's id (by) on every set and update (a by the caller set wins; '' on the Google device
   with nobody on PIN), the public copy in the same batch, the same merge */
const BY = Object.fromEntries(ALL.map(r => [r, WHO[r]]));
function W(role, ops) {
  const db = DB[role], b = writeBatch(db);
  for (const [kind, p, d, merge] of ops) {
    const path = at(p), ref = doc(db, path);
    if (kind === 'del') { b.delete(ref); continue; }
    const data = Object.assign({ by: BY[role] }, d), parts = path.split('/');
    const pub = parts.length === 4 && ({ book: 'publicBook', recipes: 'publicRecipes', drawings: 'publicDrawings' })[parts[2]];
    if (pub && (parts[2] !== 'book' || parts[3] === 'index' || parts[3] === 'matches')) {
      const m = doc(db, pub + '/' + parts[3]);
      if (kind === 'upd') b.update(m, data); else b.set(m, data, merge ? { merge: true } : {});
    }
    if (kind === 'upd') b.update(ref, data); else b.set(ref, data, merge ? { merge: true } : {});
  }
  return b.commit();
}
const D = (db, p) => doc(db, at(p)), C = (db, p) => collection(db, at(p));
// a listener: its first answer from the server, or its refusal
function listen(ref) {
  return new Promise((res, rej) => {
    let stop = null;
    const t = setTimeout(() => { if (stop) stop(); rej(new Error('no answer in 8 s')); }, 8000);
    stop = onSnapshot(ref, { includeMetadataChanges: true }, sn => { if (!sn.metadata.fromCache) { clearTimeout(t); stop(); res(sn); } }, e => { clearTimeout(t); rej(e); });
  });
}

/* ---------- the rows ----------
   row(label, { ok, asks, known, prep, run }): run(db, who, role) sends the call; prep(role, who) sets the record it
   finds first (rules off), so each sign-in starts from the same state. known: { roles, pr, why }. */
const ROWS = [];
const row = (label, o) => ROWS.push(Object.assign({ label }, o));
const ownId = (role, who) => who || 'owner';   // the owner's own record id, where a page would use one

// sign-in and settings (js/prep.js)
row('js/prep.js connect(): login/roster listener (the name picker, and functions only)', { ok: ALL, asks: ALL, run: db => listen(D(db, 'login/roster')) });
row('js/prep.js connect(): config/main listener (the kitchen settings)', { ok: KITCHEN, asks: KITCHEN, run: db => listen(D(db, 'config/main')) });
row('js/prep.js pinAtOf() and pickName(): pinset/<me> get', { ok: ALL, asks: ALL, run: (db, w) => getDoc(D(db, 'pinset/' + (w || 'ann'))) });
row('js/prep.js loadAdmins(): config/admins get (the owner check)', { ok: GOOGLE, asks: GOOGLE, run: db => getDoc(D(db, 'config/admins')) });

// prep list
row('js/prep.js watchItems(): today\'s prep lines listener', { ok: KITCHEN, asks: KITCHEN, run: db => listen(C(db, `days/${TODAY}/items`)) });
row('js/prep.js sumList(): summary/learned get', { ok: KITCHEN, asks: KITCHEN, run: db => getDoc(D(db, 'summary/learned')) });
row('js/prep.js loadLearned(): learned, the 500 most used (summary missing or old)', { ok: KITCHEN, asks: KITCHEN, run: db => getDocs(query(C(db, 'learned'), orderBy('uses', 'desc'), limit(500))) });
row('js/prep.js watchSections(): sections listener', { ok: KITCHEN, asks: KITCHEN, run: db => listen(C(db, 'sections')) });
row('js/prep.js watchActivity(): activity listener (the Google device)', { ok: KITCHEN, asks: GOOGLE, run: db => listen(C(db, 'activity')) });
row('js/prep.js maybeRoll(): the last written day\'s prep lines', { ok: KITCHEN, asks: not('owner', 'vic', 'fay'), run: db => getDocs(C(db, `days/${YDAY}/items`)) });
row('js/prep.js loadPast(): a past day\'s prep lines (14 days, dayCache)', { ok: KITCHEN, asks: KITCHEN, run: db => getDocs(C(db, `days/${YDAY}/items`)) });
row('js/prep.js mergeDups(): today\'s lines by id from the server', { ok: KITCHEN, asks: not('owner', 'vic', 'fay'), run: db => getDocsFromServer(query(C(db, `days/${TODAY}/items`), where(documentId(), 'in', ['l1', 'l9']))) });
row('js/prep.js loadUsage(): summary/usage get (admin)', { ok: KITCHEN, asks: GOOGLE, run: db => getDoc(D(db, 'summary/usage')) });
row('js/prep.js loadViews(): the views list (admin Insights)', { ok: KITCHEN, asks: GOOGLE, run: db => getDocs(C(db, 'views')) });
row('js/prep.js loadMisses(): the misses list (admin Insights)', { ok: KITCHEN, asks: GOOGLE, run: db => getDocs(C(db, 'misses')) });

// orders
row('js/prep.js watchOrders(): today\'s order lines listener', { ok: KITCHEN, asks: KITCHEN, run: db => listen(C(db, `orders/${TODAY}/lines`)) });
row('js/prep.js loadOrdHist(), ordRoll(), loadOrdStats(): a past day\'s order lines', { ok: KITCHEN, asks: KITCHEN, run: db => getDocs(C(db, `orders/${PAST}/lines`)) });
row('js/prep.js loadOrdLearned(): summary/ordlearned get', { ok: KITCHEN, asks: KITCHEN, run: db => getDoc(D(db, 'summary/ordlearned')) });
row('js/prep.js loadOrdLearned(): ordlearned, the 300 most used (summary missing or old)', { ok: KITCHEN, asks: KITCHEN, run: db => getDocs(query(C(db, 'ordlearned'), orderBy('uses', 'desc'), limit(300))) });
row('js/prep.js book().requests(): today\'s order lines not ordered yet (Supplier order)', { ok: KITCHEN, asks: CHEFS, run: db => getDocs(query(C(db, `orders/${TODAY}/lines`), where('ordered', '==', false))) });

// wastage
row('js/prep.js watchWaste(): today\'s wastage lines listener', { ok: KITCHEN, asks: KITCHEN, run: db => listen(C(db, `waste/${TODAY}/lines`)) });
row('js/prep.js loadWSum(): summary/waste get', { ok: KITCHEN, asks: KITCHEN, run: db => getDoc(D(db, 'summary/waste')) });
row('js/prep.js loadPageReview() and loadWNote(): today\'s waste review and the last days\' (waste/<day>)', { ok: KITCHEN, asks: KITCHEN, run: db => Promise.all([getDoc(D(db, `waste/${TODAY}`)), getDoc(D(db, `waste/${YDAY}`))]) });
row('js/prep.js saveReview(): the review from the server before it is saved (waste/<day>)', { ok: KITCHEN, asks: CHEFS, run: db => getDocFromServer(D(db, `waste/${TODAY}`)) });
row('js/prep.js pastRead() (admin Reports): a past day\'s wastage lines', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(C(db, `waste/${PAST}/lines`)) });

// transfers
row('js/prep.js watchXOpen(): open loans listener (transferOpen, open == true)', { ok: KITCHEN, asks: KITCHEN, run: db => listen(query(C(db, 'transferOpen'), where('open', '==', true))) });
row('js/prep.js watchXfer(): today\'s transfer lines listener', { ok: KITCHEN, asks: KITCHEN, run: db => listen(C(db, `transfers/${TODAY}/lines`)) });
row('js/prep.js loadXSum(): summary/transfers get', { ok: KITCHEN, asks: KITCHEN, run: db => getDoc(D(db, 'summary/transfers')) });
row('js/prep.js xferStatsHTML() (admin Reports): a past day\'s transfer lines', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(C(db, `transfers/${PAST}/lines`)) });

// shift pings
row('js/prep.js loadNotes(): Everyone pings (notes, until >= today)', { ok: KITCHEN, asks: KITCHEN, run: db => getDocs(query(C(db, 'notes'), where('until', '>=', TODAY))) });
row('js/prep.js loadNotes(): my own personal pings (directnotes, until >= today, to == me)', { ok: KITCHEN, asks: CREW,
  run: (db, w) => getDocsFromServer(query(C(db, 'directnotes'), where('until', '>=', TODAY), where('to', '==', w))) });
row('js/prep.js loadNotes(): every personal ping, for those who manage pings', { ok: CHEFS, asks: CHEFS, run: db => getDocsFromServer(query(C(db, 'directnotes'), where('until', '>=', TODAY))) });
row('js/prep.js loadSeen(): who tapped Got it on an Everyone ping (notes/<id>/seen)', { ok: KITCHEN, asks: CHEFS, run: db => getDocs(query(C(db, 'notes/n1/seen'), where('day', '==', TODAY))) });
row('js/prep.js loadSeen(): who tapped Got it on a personal ping (directnotes/<id>/seen)', { ok: CHEFS, asks: CHEFS, run: db => getDocs(query(C(db, 'directnotes/d1/seen'), where('day', '==', TODAY))) });
// loadPastNotes(): the finished pings, for those who manage pings (noteQuery(): from the server, 30 at a time)
const pastPings = (db, col) => getDocsFromServer(query(C(db, col), where('until', '<', TODAY), orderBy('until', 'desc'), limit(30)));
row('js/prep.js loadPastNotes(): finished Everyone pings (notes, until < today, newest first)', { ok: KITCHEN, asks: CHEFS, run: db => pastPings(db, 'notes') });
row('js/prep.js loadPastNotes(): finished personal pings (directnotes, until < today, newest first)', { ok: CHEFS, asks: CHEFS, run: db => pastPings(db, 'directnotes') });

// meeting minutes
row('js/prep.js loadMinutes(): published minutes by pubAt (not the Google device)', { ok: KITCHEN, asks: KPINS.filter(r => r !== 'ownkit'),
  run: db => getDocs(query(C(db, 'minutes'), where('pubAt', '>=', NOW - 90 * DAY))) });
row('js/prep.js loadMinutes(): every minutes by meeting date, drafts too (the Google device)', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(query(C(db, 'minutes'), where('date', '>=', kday(NOW - 90 * DAY)))) });
row('js/prep.js loadMine(): my own sign-off (minutes/<id>/signs/<v>_<me>)', { ok: KITCHEN, asks: KPINS, run: (db, w) => getDoc(D(db, 'minutes/m1/signs/1_' + w)) });
row('js/prep.js loadSigns(): the register (minutes/<id>/signs)', { ok: CHEFS, asks: CHEFS, run: db => getDocs(C(db, 'minutes/m1/signs')) });

// guides, recipes, drinks, sections, mail, to-do, cut-offs
row('js/prep.js loadGuides(): the guides list', { ok: KITCHEN, asks: KITCHEN, run: db => getDocs(C(db, 'guides')) });
row('js/prep.js gPagesFor(): a guide\'s pages (guides/<id>/pages)', { ok: KITCHEN, asks: KITCHEN, run: db => getDocs(C(db, 'guides/g1/pages')) });
row('js/prep.js rxSync(): book/index, a changed recipe and drawing (with the kitchen PIN)', { ok: ALL, asks: ALL,
  run: db => Promise.all([getDoc(D(db, 'book/index')), getDoc(D(db, 'recipes/burger')), getDoc(D(db, 'drawings/burger-plate'))]) });
row('js/prep.js dkCheck(): my usual drink (drinks/<me>)', { ok: KITCHEN, asks: KPINS, run: (db, w, r) => getDoc(D(db, 'drinks/' + ownId(r, w))) });
row('js/prep.js dkLoad(): the drinks run (the drinks list)', { ok: KITCHEN, asks: KITCHEN, run: db => getDocs(C(db, 'drinks')) });
row('js/prep.js dkLoad(): who was in today (the activity list)', { ok: KITCHEN, asks: KITCHEN, run: db => getDocs(C(db, 'activity')) });
row('js/prep.js ksCheck(): my section today (shifts/<today>_<me>)', { ok: KITCHEN, asks: ['ann', 'lou', 'tab'], run: (db, w, r) => getDoc(D(db, `shifts/${TODAY}_${ownId(r, w)}`)) });
row('js/prep.js loadShifts() (admin People, Manage staff): 14 days of sections', { ok: KITCHEN, asks: CHEFS, run: db => getDocs(query(C(db, 'shifts'), where('day', '>=', kday(NOW - 13 * DAY)))) });
row('js/prep.js mlStatLoad(): what happened to a mail I sent (mailstat/<id>)', { ok: KITCHEN, asks: MAIL, run: db => getDoc(D(db, 'mailstat/x1')) });
row('js/prep.js loadMail(): open mail (mail, done == false; sous chef mail off)', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(query(C(db, 'mail'), where('done', '==', false))) });
row('js/prep.js loadMailDone(): mail ticked in the last 30 days', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(query(C(db, 'mail'), where('doneAt', '>=', NOW - 30 * DAY))) });
row('js/prep.js todoLoad() and the Done list: todos, st == open and doneAt in 30 days', { ok: CHEFS, asks: CHEFS,
  run: db => Promise.all([getDocs(query(C(db, 'todos'), where('st', '==', 'open'))), getDocs(query(C(db, 'todos'), where('doneAt', '>=', NOW - 30 * DAY)))]) });
row('js/prep.js cutWatch(): supplier order ticks listener (cutdone, day in today and tomorrow)', { ok: CHEFS, asks: CHEFS, run: db => listen(query(C(db, 'cutdone'), where('day', 'in', [TODAY, TMW]))) });
row('js/supplier-store.js: the catalogue and a supplier (suppliers)', { ok: CHEFS, asks: CHEFS, run: db => Promise.all([getDocs(C(db, 'suppliers')), getDoc(D(db, 'suppliers/s1'))]) });
row('js/supplier-store.js: a supplier\'s orders (suppliers/<id>/orders, the last 21)', { ok: CHEFS, asks: CHEFS, run: db => getDocs(query(C(db, 'suppliers/s1/orders'), orderBy('at', 'desc'), limit(21))) });
row('js/supplier-store.js: a cut-off\'s link (supplierlinks/<day>_<cut-off>)', { ok: CHEFS, asks: CHEFS, run: db => getDoc(D(db, `supplierlinks/${TODAY}_northside`)) });
// the admin Backup (exportAll(), the Google device only): one row per list that has a rule of its own, so a rule
// loosened for one of them shows on its own row. The lists every kitchen phone reads are rows above.
const EXP_ALL = 'js/prep.js exportAll() (admin Backup): ';
row(EXP_ALL + 'the pinset list (who has a PIN)', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(C(db, 'pinset')) });
row(EXP_ALL + 'every booking contact (the fncontact list)', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(C(db, 'fncontact')) });
row(EXP_ALL + 'delivery receipts of the last 400 days', { ok: GOOGLE, asks: GOOGLE,
  run: db => getDocs(query(C(db, 'deliveries'), where('day', '>=', kday(NOW - 399 * DAY)), where('day', '<=', TODAY))) });
row(EXP_ALL + 'the mailstat list', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(C(db, 'mailstat')) });
row(EXP_ALL + 'every kitchen mail (the mail list, sous chef mail off)', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(C(db, 'mail')) });
row(EXP_ALL + 'the usage counts (the daily list)', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(C(db, 'daily')) });
row(EXP_ALL + 'every loan, returned and removed too (the transferOpen list)', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(C(db, 'transferOpen')) });
row(EXP_ALL + 'every minutes record, drafts too (no filter)', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(C(db, 'minutes')) });
row(EXP_ALL + 'a minutes record\'s earlier versions (minutes/<id>/hist)', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(C(db, 'minutes/m1/hist')) });
row(EXP_ALL + 'every personal ping (the directnotes list, no filter)', { ok: CHEFS, asks: GOOGLE, run: db => getDocs(C(db, 'directnotes')) });
row(EXP_ALL + 'every chef job (the todos list, no filter)', { ok: CHEFS, asks: GOOGLE, run: db => getDocs(C(db, 'todos')) });
row(EXP_ALL + 'every supplier order tick (the cutdone list, no filter)', { ok: CHEFS, asks: GOOGLE, run: db => getDocs(C(db, 'cutdone')) });
// the PIN move copies the PIN fingerprints too (copyCol(); its writes go to the new kitchen PIN, not rows here)
row('js/prep.js movePin() copyCol(): the staffpins list', { ok: GOOGLE, asks: GOOGLE, run: db => getDocs(C(db, 'staffpins')) });

// functions
row('js/functions.js watch(): functions from today (kq >= midnight, by kq, 150) listener', { ok: ALL, asks: ALL, run: db => listen(query(C(db, 'functions'), where('kq', '>=', MIDNIGHT), orderBy('kq'), limit(150))) });
row('js/functions.js watchSent(): rounds ticked sent (fnsent, day >= yesterday) listener', { ok: ALL, asks: ALL, run: db => listen(query(C(db, 'fnsent'), where('day', '>=', YDAY))) });
row('js/functions.js setStatus(): the function from the server (Cancel and Undo)', { ok: ALL, asks: FNCANCEL, run: db => getDocFromServer(D(db, 'functions/f1')) });
row('js/functions.js setStatus() Undo: the version before (functions/<id>/hist/<v>)', { ok: FNCANCEL, asks: FNCANCEL, run: db => getDocFromServer(D(db, 'functions/f1/hist/0')) });
row('js/fnedit.js loadList(): the managers\' list (functions by date, 400)', { ok: ALL, asks: FNMGR, run: db => getDocs(query(C(db, 'functions'), orderBy('date', 'desc'), limit(400))) });
row('js/fnedit.js openId(): the booking contact (fncontact/<id>)', { ok: ['owner', 'ownkit', 'fay'], asks: FNMGR, run: db => getDocFromServer(D(db, 'fncontact/f1')) });
row('js/fnedit.js loadHist(): every earlier version (functions/<id>/hist)', { ok: FNCANCEL, asks: FNMGR, run: db => getDocs(C(db, 'functions/f1/hist')) });

// deliveries
row('js/deliveries.js load(): today\'s receipts listener (deliveries, day == today)', { ok: ALL, asks: ALL, run: db => listen(query(C(db, 'deliveries'), where('day', '==', TODAY))) });
row('js/deliveries.js load(): a past day from the server (admin)', { ok: GOOGLE, asks: GOOGLE, run: db => getDocsFromServer(query(C(db, 'deliveries'), where('day', '==', PAST))) });
row('js/deliveries.js save(): the retry check of a new receipt id', { ok: ALL, asks: ALL, run: (db, w, r) => getDocFromServer(D(db, 'deliveries/new-' + r)) });

// Manage Recipes & Drawings
row('js/manage.js loadMine() and js/draw.js loadMine(): templates and own pieces (drawtpl, drawlib)', { ok: ALL, asks: CHEFS, run: db => Promise.all([getDocs(C(db, 'drawtpl')), getDocs(C(db, 'drawlib'))]) });
row('js/manage.js save(), js/draw.js commit(): the recipe and the drawing from the server', { ok: ALL, asks: CHEFS, run: db => Promise.all([getDocFromServer(D(db, 'recipes/burger')), getDocFromServer(D(db, 'drawings/burger-plate'))]) });
row('js/manage.js loadHist(): a recipe\'s earlier versions (recipes/<id>/hist)', { ok: KITCHEN, asks: CHEFS, run: db => getDocs(C(db, 'recipes/burger/hist')) });
row('js/smart.js loadLearned(): the head chef\'s picks (book/matches)', { ok: ALL, asks: CHEFS, run: db => getDoc(D(db, 'book/matches')) });

/* ---------- writes ---------- */
const MINE = r => 'z-' + r;   // each sign-in writes its own record, so one cell never changes the next
const EXP = { pr: 'a later fix (client, not rules)' };
row('js/prep.js resume() and bump(): activity/<me> merge (visits, lastSeen)', { ok: KITCHEN, asks: KPINS,
  known: Object.assign({ roles: ['fay'], why: 'bump() after a PIN sign-in sends it for a functions-only person too; the rules refuse it and the page drops the error. resume() already skips it' }, EXP),
  run: (db, w, r) => W(r, [['set', 'activity/' + ownId(r, w), { name: NAME[r], visits: increment(1), lastSeen: Date.now() }, true]]) });
// (functions only never sends them: the prep pages stop at the Functions account card before flushViews())
row('js/prep.js flushViews() and flushMisses(): views/<id> and misses/<q> merges', { ok: KITCHEN, asks: KPINS,
  run: (db, w, r) => W(r, [['set', 'views/burger', { name: 'Burger', n: increment(1), last: Date.now() }, true], ['set', 'misses/tofu', { q: 'tofu', n: increment(1), last: Date.now(), lastBy: NAME[r] }, true]]) });
row('js/prep.js newItem(): a prep line on today\'s list', { ok: KITCHEN, asks: ADDS,
  run: (db, w, r) => W(r, [['set', `days/${TODAY}/items/${MINE(r)}`, newLine({ text: 'Dice carrot', addedBy: NAME[r], addedById: w, addedAt: Date.now() })]]) });
row('js/prep.js maybeRoll(): a line rolled onto today (addedById empty)', { ok: KITCHEN, asks: not('owner', 'vic', 'fay'),
  run: (db, w, r) => W(r, [['set', `days/${TODAY}/items/r-${r}`, newLine({ addedBy: 'Rolled over', addedById: '', addedAt: Date.now(), rolled: 1, root: 'l0', from: 'l0', rolledFrom: YDAY, origBy: 'Ann', origAt: NOW - DAY, urgent: false, ahead: false })]]) });
row('js/prep.js tickNow(): tick a prep line', { ok: KITCHEN, asks: TICKS,
  known: Object.assign({ roles: ['owner'], why: 'on the Google device with nobody on PIN tickNow() reads me().name, which is null, so the tick throws before it is sent' }, EXP),
  prep: r => put({ [`days/${TODAY}/items/${MINE(r)}`]: line() }),
  run: (db, w, r) => W(r, [['upd', `days/${TODAY}/items/${MINE(r)}`, { done: true, doneBy: NAME[r], doneById: w, doneAt: Date.now() }]]) });
// an untick (canUntick()): a chef any time (canBrowse()), or the person who ticked it within 2 minutes. tickNow() then
// takes the tick off that person's tally, a write of its own (activity/<doneById>, ticked - 1)
const UNTICK = { done: false, doneBy: '', doneById: '', doneAt: 0 };
row('js/prep.js tickNow(): a chef unticks a line Ann ticked 10 minutes ago', { ok: CHEFS, asks: CHEFS,
  prep: r => put({ [`days/${TODAY}/items/u-${r}`]: line({ done: true, doneBy: 'Ann', doneById: 'ann', doneAt: Date.now() - 10 * MIN }) }),
  run: (db, w, r) => W(r, [['upd', `days/${TODAY}/items/u-${r}`, UNTICK]]) });
// (Ann may write her own tally, as every visit does; nobody else but a chef may write hers)
row('js/prep.js tickNow(): a chef\'s untick takes it off Ann\'s tally (activity/ann, ticked - 1)', { ok: CHEFS.concat('ann'), asks: CHEFS,
  run: (db, w, r) => W(r, [['set', 'activity/ann', { name: 'Ann', ticked: increment(-1) }, true]]) });
row('js/prep.js tickNow(): untick my own tick within 2 minutes, and off my tally', { ok: KITCHEN, asks: not('owner', 'vic', 'fay'),
  prep: (r, w) => put({ [`days/${TODAY}/items/m-${r}`]: line({ done: true, doneBy: NAME[r], doneById: w, doneAt: Date.now() - 30000 }) }),
  run: async (db, w, r) => { await W(r, [['upd', `days/${TODAY}/items/m-${r}`, UNTICK]]); return W(r, [['set', 'activity/' + ownId(r, w), { name: NAME[r], ticked: increment(-1) }, true]]); } });
row('js/prep.js removeItem(): remove a prep line', { ok: KITCHEN, asks: DELS,
  known: Object.assign({ roles: ['owner'], why: 'on the Google device with nobody on PIN removeItem() reads me().name, which is null, so Remove throws before it is sent' }, EXP),
  prep: r => put({ [`days/${TODAY}/items/${MINE(r)}`]: line() }),
  run: (db, w, r) => W(r, [['upd', `days/${TODAY}/items/${MINE(r)}`, { deleted: true, deletedBy: NAME[r], deletedAt: Date.now() }]]) });
row('js/prep.js noteSection(): sections/<name> merge (uses + 1)', { ok: KITCHEN, asks: ADDS,
  run: (db, w, r) => W(r, [['set', 'sections/' + MINE(r), { name: 'Grill ' + r, uses: increment(1), lastUsed: Date.now(), lastBy: NAME[r] }, true]]) });
row('js/prep.js dailyFlush(): daily/<day>_<tag> (usage counts)', { ok: KITCHEN, asks: KPINS,
  run: (db, w, r) => W(r, [['set', `daily/${YDAY}_${r}`, { day: YDAY, tag: r, sg: {}, pf: {}, at: Date.now() }]]) });
row('js/prep.js addOrder(): an order line', { ok: KITCHEN, asks: ADDS,
  run: (db, w, r) => W(r, [['set', `orders/${TODAY}/lines/${MINE(r)}`, { text: 'Lemons', qty: '2 kg', qn: 2, qu: 'kg', recipes: [], addedBy: NAME[r], addedById: w, addedAt: Date.now(), ordered: false, deleted: false }]]) });
row('js/prep.js orderedOp(): tick an order line ordered', { ok: CHEFS, asks: CHEFS,
  known: Object.assign({ roles: ['owner'], why: 'on the Google device with nobody on PIN orderedOp() reads me().name, which is null, so Ordered throws before it is sent' }, EXP),
  prep: r => put({ [`orders/${TODAY}/lines/${MINE(r)}`]: { text: 'Cream', qty: '4 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: NOW - 3600000, ordered: false, deleted: false, by: 'ann' } }),
  run: (db, w, r) => W(r, [['upd', `orders/${TODAY}/lines/${MINE(r)}`, { ordered: true, orderedBy: NAME[r], orderedAt: Date.now() }]]) });
// (canBrowse() and can('del'): the chefs only, so a lead never sends it)
row('js/prep.js removeOrderLine(): remove an order line', { ok: KITCHEN, asks: CHEFS,
  prep: r => put({ [`orders/${TODAY}/lines/${MINE(r)}`]: { text: 'Cream', qty: '4 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: NOW - 3600000, ordered: false, deleted: false, by: 'ann' } }),
  run: (db, w, r) => W(r, [['upd', `orders/${TODAY}/lines/${MINE(r)}`, { deleted: true, deletedBy: NAME[r], deletedAt: Date.now() }]]) });
row('js/prep.js addWaste(): a wastage line', { ok: KITCHEN, asks: ADDS,
  run: (db, w, r) => W(r, [['set', `waste/${TODAY}/lines/${MINE(r)}`, { text: 'Rice', amount: 1.5, unit: 'kg', reason: 'expired', action: '', station: 'Larder', recipe: '', addedBy: NAME[r], addedById: w, addedAt: Date.now(), deleted: false }]]) });
row('js/prep.js removeWaste(): remove someone\'s wastage line (the Google device)', { ok: GOOGLE, asks: GOOGLE,
  prep: r => put({ [`waste/${TODAY}/lines/${MINE(r)}`]: seed[`waste/${TODAY}/lines/w1`] }),
  run: (db, w, r) => W(r, [['upd', `waste/${TODAY}/lines/${MINE(r)}`, { deleted: true, deletedBy: NAME[r] || 'Head chef', deletedAt: Date.now() }]]) });
row('js/prep.js addWaste() Undo: take back my own line straight after (2 minutes)', { ok: CHEFS, asks: CHEFS,
  prep: (r, w) => put({ [`waste/${TODAY}/lines/u-${r}`]: Object.assign({}, seed[`waste/${TODAY}/lines/w1`], { addedById: w, addedAt: Date.now(), by: w }) }),
  run: (db, w, r) => W(r, [['upd', `waste/${TODAY}/lines/u-${r}`, { deleted: true, deletedBy: NAME[r] || 'Head chef', deletedAt: Date.now() }]]) });
row('js/prep.js saveReview(): today\'s waste review (waste/<today> merge)', { ok: CHEFS, asks: CHEFS,
  run: (db, w, r) => W(r, [['set', `waste/${TODAY}`, { avoidable: 'Over-prepped rice', change: 'Half a batch on Mondays', reviewBy: NAME[r], reviewById: w, reviewAt: Date.now() }, true]]) });
row('js/prep.js addXfer() through xWrite(): a transfer line with its open copy', { ok: KITCHEN, asks: ADDS,
  run: (db, w, r) => { const rec = { dir: 'out', venue: 'Riviera', person: 'Jo', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: NAME[r], addedById: w, addedAt: Date.now(), deleted: false };
    return W(r, [['set', `transfers/${TODAY}/lines/${MINE(r)}`, rec], ['set', `transferOpen/${TODAY}_${MINE(r)}`, { date: TODAY, lineId: MINE(r), record: Object.assign({}, rec, { by: BY[r] }), open: true }]]); } });
row('js/prep.js returnXfer() through xWrite(): an old loan marked returned', { ok: KITCHEN, asks: TICKS,
  prep: r => put({ [`transfers/${PAST}/lines/${MINE(r)}`]: xrec({ addedAt: NOW - 5 * DAY }), [`transferOpen/${PAST}_${MINE(r)}`]: { date: PAST, lineId: MINE(r), record: xrec({ addedAt: NOW - 5 * DAY }), open: true, by: 'ann' } }),
  run: (db, w, r) => { const ch = { returned: true, returnedBy: NAME[r] || 'Head chef', returnedById: w, returnedAt: Date.now() };
    return W(r, [['upd', `transfers/${PAST}/lines/${MINE(r)}`, ch], ['set', `transferOpen/${PAST}_${MINE(r)}`, { date: PAST, lineId: MINE(r), record: Object.assign(xrec({ addedAt: NOW - 5 * DAY }), ch, { by: BY[r] }), open: false }],
      ['set', 'config/main', { pastEdit: { x: Date.now() } }, true]]); } });
row('js/prep.js removeXfer() through xWrite(): remove someone\'s transfer (the Google device)', { ok: GOOGLE, asks: GOOGLE,
  prep: r => put({ [`transfers/${TODAY}/lines/${MINE(r)}`]: xrec(), [`transferOpen/${TODAY}_${MINE(r)}`]: { date: TODAY, lineId: MINE(r), record: xrec(), open: true, by: 'ann' } }),
  run: (db, w, r) => { const ch = { deleted: true, deletedBy: NAME[r] || 'Head chef', deletedAt: Date.now() };
    return W(r, [['upd', `transfers/${TODAY}/lines/${MINE(r)}`, ch], ['set', `transferOpen/${TODAY}_${MINE(r)}`, { date: TODAY, lineId: MINE(r), record: Object.assign(xrec(), ch, { by: BY[r] }), open: false }]]); } });
// addXfer()'s Undo is offered to the chefs only (canBrowse()): their own line, straight after
row('js/prep.js addXfer() Undo through xWrite(): take back my own transfer within 2 minutes', { ok: CHEFS, asks: CHEFS,
  prep: (r, w) => { const rec = xrec({ addedBy: NAME[r], addedById: w, addedAt: Date.now() - 20000, by: w });
    return put({ [`transfers/${TODAY}/lines/u-${r}`]: rec, [`transferOpen/${TODAY}_u-${r}`]: { date: TODAY, lineId: 'u-' + r, record: rec, open: true, by: w } }); },
  run: async (db, w, r) => { const cur = await serverRec(`transfers/${TODAY}/lines/u-${r}`), ch = { deleted: true, deletedBy: NAME[r] || 'Head chef', deletedAt: Date.now() };
    return W(r, [['upd', `transfers/${TODAY}/lines/u-${r}`, ch], ['set', `transferOpen/${TODAY}_u-${r}`, { date: TODAY, lineId: 'u-' + r, record: Object.assign({}, cur, ch, { by: BY[r] }), open: false }]]); } });
// returnXfer(..., undo): the person who marked it returned within 2 minutes, or a chef any time (xReturnBtn())
const RETURNED = (by, at) => ({ returned: true, returnedBy: by === 'ann' ? 'Ann' : by, returnedById: by, returnedAt: at });
const UNRETURN = { returned: false, returnedBy: '', returnedById: '', returnedAt: 0 };
const xUndo = (r, id, rec) => W(r, [['upd', `transfers/${PAST}/lines/${id}`, UNRETURN],
  ['set', `transferOpen/${PAST}_${id}`, { date: PAST, lineId: id, record: Object.assign({}, rec, UNRETURN, { by: BY[r] }), open: true }],
  ['set', 'config/main', { pastEdit: { x: Date.now() } }, true]]);
row('js/prep.js returnXfer() undo through xWrite(): my own return within 2 minutes', { ok: KITCHEN, asks: TICKS,
  prep: (r, w) => { const rec = Object.assign(xrec({ addedAt: NOW - 5 * DAY }), RETURNED(w, Date.now() - 30000), { by: w });
    return put({ [`transfers/${PAST}/lines/ur-${r}`]: rec, [`transferOpen/${PAST}_ur-${r}`]: { date: PAST, lineId: 'ur-' + r, record: rec, open: false, by: w } }); },
  run: async (db, w, r) => xUndo(r, 'ur-' + r, await serverRec(`transfers/${PAST}/lines/ur-${r}`)) });
row('js/prep.js returnXfer() undo through xWrite(): a chef reopens a loan Ann returned 10 minutes ago', { ok: CHEFS, asks: CHEFS,
  prep: r => { const rec = Object.assign(xrec({ addedAt: NOW - 5 * DAY }), RETURNED('ann', Date.now() - 10 * MIN));
    return put({ [`transfers/${PAST}/lines/uc-${r}`]: rec, [`transferOpen/${PAST}_uc-${r}`]: { date: PAST, lineId: 'uc-' + r, record: rec, open: false, by: 'ann' } }); },
  run: async (db, w, r) => xUndo(r, 'uc-' + r, await serverRec(`transfers/${PAST}/lines/uc-${r}`)) });
row('js/prep.js saveNote(): a new Everyone ping', { ok: CHEFS, asks: CHEFS,
  run: (db, w, r) => W(r, [['set', 'notes/' + MINE(r), { text: 'Fryer 2 is out', tag: 'safety', start: TODAY, until: TODAY, dows: [], tm: 840, removed: false, upd: Date.now(), at: Date.now(), author: w }]]) });
row('js/prep.js saveNote(): a new personal ping to Ann (directnotes)', { ok: CHEFS, asks: CHEFS,
  run: (db, w, r) => W(r, [['set', 'directnotes/' + MINE(r), { text: 'Ann, pastry cream first', tag: 'none', start: TODAY, until: TODAY, dows: [], tm: 839, removed: false, upd: Date.now(), at: Date.now(), author: w, to: 'ann' }]]) });
// an edit (Edit this ping, then Save): merged onto the ping as Sam wrote it, author and at kept, by the one who saves
const pingEdit = to => Object.assign({ text: 'Fryer 2 is out until 16:00', tag: 'safety', start: TODAY, until: TODAY, dows: [], tm: 845, removed: false, upd: Date.now() }, to ? { to } : {});
row('js/prep.js saveNote(): change an Everyone ping Sam wrote (notes merge)', { ok: CHEFS, asks: CHEFS,
  prep: r => put({ ['notes/e-' + r]: ping() }), run: (db, w, r) => W(r, [['set', 'notes/e-' + r, pingEdit(), true]]) });
row('js/prep.js saveNote(): change a personal ping to Ann that Sam wrote (directnotes merge)', { ok: CHEFS, asks: CHEFS,
  prep: r => put({ ['directnotes/e-' + r]: ping({ text: 'Ann, see me at 15:00', tag: 'none', to: 'ann' }) }), run: (db, w, r) => W(r, [['set', 'directnotes/e-' + r, pingEdit('ann'), true]]) });
row('js/prep.js markPings() and markPast(): config/main pastEdit merge', { ok: CHEFS, asks: CHEFS,
  run: (db, w, r) => W(r, [['set', 'config/main', { pastEdit: { n: Date.now() } }, true]]) });
row('js/prep.js noteWriteSeen(): Got it on an Everyone ping (notes/<id>/seen/<today>_<me>)', { ok: KITCHEN, asks: KPINS,
  prep: (r, w) => put({ [`notes/n1/seen/${TODAY}_${w}`]: null }),
  run: (db, w, r) => W(r, [['set', `notes/n1/seen/${TODAY}_${w}`, { day: TODAY, at: Date.now() }]]) });
row('js/prep.js noteWriteSeen(): Got it on my personal ping (directnotes/<id>/seen/<today>_<me>)', { ok: KPINS, asks: KPINS,
  prep: (r, w) => put({ ['directnotes/' + MINE(r)]: ping({ text: 'For you', tag: 'none', to: w || 'ann' }), [`directnotes/${MINE(r)}/seen/${TODAY}_${w}`]: null }),
  run: (db, w, r) => W(r, [['set', `directnotes/${MINE(r)}/seen/${TODAY}_${w}`, { day: TODAY, at: Date.now() }]]) });
row('js/prep.js signMinutes(): sign the current version (minutes/<id>/signs/<v>_<me>)', { ok: KITCHEN, asks: KPINS,
  prep: r => put({ ['minutes/' + MINE(r)]: mins() }),
  run: (db, w, r) => W(r, [['set', `minutes/${MINE(r)}/signs/1_${w}`, { v: 1, st: 'present', at: Date.now(), name: NAME[r] }]]) });
row('js/prep.js saveMinutes() (admin): publish minutes', { ok: GOOGLE, asks: GOOGLE,
  run: (db, w, r) => W(r, [['set', 'minutes/p-' + r, mins({ pubAt: Date.now() })]]) });
row('js/prep.js saveGuide() (admin): a guide and its page picture', { ok: GOOGLE, asks: GOOGLE,
  run: (db, w, r) => W(r, [['set', `guides/${MINE(r)}/pages/0`, { img: 'data:image/png;base64,AA', w: 4, h: 6, v: 1, n: 0 }], ['set', 'guides/' + MINE(r), { title: 'Slicer', cat: 'equipment', sum: '', steps: 'Unplug it first.', kw: '', text: '', thumb: '', pages: 1, dims: [], v: 1, file: '', removed: false, at: Date.now(), upd: Date.now() }]]) });
row('js/prep.js dkSave(): my usual drink (drinks/<me>)', { ok: KITCHEN, asks: KPINS,
  run: (db, w, r) => W(r, [['set', 'drinks/' + ownId(r, w), { kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: '', cold: '', other: '', at: Date.now() }]]) });
row('js/prep.js ksPick() and ksCheck(): my section today (shifts/<today>_<me>)', { ok: KITCHEN, asks: ['ownkit', 'kit', 'sam', 'ann', 'lou', 'tab'],
  run: (db, w, r) => W(r, [['set', `shifts/${TODAY}_${ownId(r, w)}`, { day: TODAY, sec: 'grill', name: 'Grill', auto: false, at: Date.now() }]]) });
row('js/prep.js cutOrdered(): tick a supplier order (cutdone; the Google device as owner, setDoc)', { ok: CHEFS, asks: CHEFS,
  run: (db, w, r) => { const data = { day: TMW, sid: 'veg-' + r, on: true, at: Date.now(), by: w || 'owner' }, p = `cutdone/${data.day}_${data.sid}`;
    return w ? W(r, [['set', p, data]]) : setDoc(D(db, p), data); } });
// pushWhoId(): the Google device is 'owner' (setDoc, deleteDoc) also while the head chef is signed in by PIN there
row('js/prep.js pushSave(): this phone\'s push address (push/<hash>; the Google device as owner, setDoc)', { ok: CHEFS, asks: CHEFS,
  run: (db, w, r) => { const data = { tok: 'token-' + r, at: Date.now(), ua: 'android' }, p = 'push/h' + r;
    return GOOGLE.includes(r) ? setDoc(D(db, p), Object.assign({ by: 'owner' }, data)) : W(r, [['set', p, data]]); } });
row('js/prep.js cutSave(), mlSousSet(), seedPinOpen(): admin settings merged into config/main (setDoc, no by)', { ok: GOOGLE, asks: GOOGLE,
  run: (db, w, r) => setDoc(D(db, 'config/main'), { cutoffs: [Object.assign({}, CFG.cutoffs[0], { at: 900 + ALL.indexOf(r) })], sousMail: false, pinOpen: { finn: NOW + DAY + ALL.indexOf(r) } }, { merge: true }) });
row('js/prep.js mlSend(): a mail to the head chef with its status (mail and mailstat)', { ok: KITCHEN, asks: MAIL,
  run: (db, w, r) => W(r, [['set', 'mail/' + MINE(r), { from: w, cat: 'stock', pri: 'week', text: 'Need gloves', at: Date.now(), done: false, seen: false }], ['set', 'mailstat/' + MINE(r), { seen: false, done: false }]]) });
row('js/prep.js mlTick(): tick a mail done (mail and mailstat updates)', { ok: GOOGLE, asks: GOOGLE,
  prep: r => put({ ['mail/' + MINE(r)]: seed['mail/x1'], ['mailstat/' + MINE(r)]: seed['mailstat/x1'] }),
  run: (db, w, r) => { const t = Date.now(); return W(r, [['upd', 'mail/' + MINE(r), { done: true, doneAt: t, seen: true, seenAt: t }], ['upd', 'mailstat/' + MINE(r), { seen: true, done: true }]]); } });
row('js/prep.js mlSeenAll(): config/admins mailOpened merge', { ok: GOOGLE, asks: GOOGLE, run: (db, w, r) => W(r, [['set', 'config/admins', { mailOpened: Date.now() }, true]]) });
row('js/prep.js mlSeenAll(): the open mail marked seen (mail and mailstat updates)', { ok: GOOGLE, asks: GOOGLE,
  prep: r => put({ ['mail/s-' + r]: seed['mail/x1'], ['mailstat/s-' + r]: seed['mailstat/x1'] }),
  run: (db, w, r) => W(r, [['upd', 'mail/s-' + r, { seen: true, seenAt: Date.now() }], ['upd', 'mailstat/s-' + r, { seen: true, done: false }]]) });
// sous chef mail switched on (config/main sousMail, mlSousSet()): a sous chef on #/mail reads and ticks it with their own
// PIN (mlSous()); the Google device still reads it as the head chef. Kit (headId, also in sousIds) is let through too,
// though the head chef's menu has no Kitchen mail
const SOUSMAIL = ['owner', 'ownkit', 'kit', 'sam'];
const mailOn = { prep: () => cfgMerge({ sousMail: true }), after: () => cfgMerge({ sousMail: false }) };
row('js/prep.js loadMail() and loadMailDone(), sous chef mail on: the open mail and the last 30 days ticked', Object.assign({ ok: SOUSMAIL, asks: ['owner', 'ownkit', 'sam'],
  run: db => Promise.all([getDocs(query(C(db, 'mail'), where('done', '==', false))), getDocs(query(C(db, 'mail'), where('doneAt', '>=', NOW - 30 * DAY)))]) }, mailOn));
row('js/prep.js mlTick(), sous chef mail on: a sous chef ticks a mail done (seen left for the head chef)', Object.assign({ ok: SOUSMAIL, asks: ['sam'],
  run: (db, w, r) => W(r, [['upd', 'mail/t-' + r, { done: true, doneAt: Date.now() }], ['upd', 'mailstat/t-' + r, { done: true }]]) }, mailOn,
  { prep: async r => { await cfgMerge({ sousMail: true }); await put({ ['mail/t-' + r]: seed['mail/x1'], ['mailstat/t-' + r]: seed['mailstat/x1'] }); } }));
row('js/prep.js mlSetPri(), sous chef mail on: how soon a mail matters', Object.assign({ ok: SOUSMAIL, asks: ['owner', 'ownkit', 'sam'],
  run: (db, w, r) => W(r, [['upd', 'mail/q-' + r, { pri: 'today' }]]) }, mailOn,
  { prep: async r => { await cfgMerge({ sousMail: true }); await put({ ['mail/q-' + r]: seed['mail/x1'] }); } }));
row('js/prep.js todoSave() and todoTick(): a new chef job, then ticked done', { ok: CHEFS, asks: CHEFS,
  run: async (db, w, r) => { const t = Date.now(), me = w || 'kit';
    await W(r, [['set', 'todos/' + MINE(r), { text: 'Book the hood clean', st: 'open', due: '', for: '', from: me, at: t, doneAt: 0, doneBy: '', upd: t }]]);
    return W(r, [['upd', 'todos/' + MINE(r), { st: 'done', doneAt: t + 1, doneBy: me, upd: t + 1 }]]); } });
// the other to-do changes, each on a job Sam wrote (from and at never change; an open job names no one)
const job = x => Object.assign({ text: 'Call the fridge tech', st: 'open', due: '', for: '', from: 'sam', at: NOW - DAY, doneAt: 0, doneBy: '', upd: NOW - DAY, by: 'sam' }, x || {});
const DONE_JOB = { st: 'done', doneAt: NOW - 3600000, doneBy: 'sam' };
row('js/prep.js todoTick(): untick a job Sam ticked done', { ok: CHEFS, asks: CHEFS, prep: r => put({ ['todos/u-' + r]: job(DONE_JOB) }),
  run: (db, w, r) => W(r, [['upd', 'todos/u-' + r, { st: 'open', doneAt: 0, doneBy: '', upd: Date.now() }]]) });
row('js/prep.js todoSave(): change a job (text, due day, for whom)', { ok: CHEFS, asks: CHEFS, prep: r => put({ ['todos/e-' + r]: job() }),
  run: (db, w, r) => W(r, [['upd', 'todos/e-' + r, { text: 'Call the fridge tech before 10:00', due: TMW, for: 'sam', upd: Date.now() }]]) });
row('js/prep.js todoRemove(): remove a job (st gone)', { ok: CHEFS, asks: CHEFS, prep: r => put({ ['todos/g-' + r]: job() }),
  run: (db, w, r) => W(r, [['upd', 'todos/g-' + r, { st: 'gone', upd: Date.now() }]]) });
row('js/prep.js todoRemove() Undo: an open job put back (names no one)', { ok: CHEFS, asks: CHEFS, prep: r => put({ ['todos/b-' + r]: job({ st: 'gone' }) }),
  run: (db, w, r) => W(r, [['upd', 'todos/b-' + r, { st: 'open', doneAt: 0, doneBy: '', upd: Date.now() }]]) });
row('js/prep.js todoRemove() Undo: a done job put back, who ticked it kept', { ok: CHEFS, asks: CHEFS, prep: r => put({ ['todos/d-' + r]: job(Object.assign({}, DONE_JOB, { st: 'gone' })) }),
  run: (db, w, r) => W(r, [['upd', 'todos/d-' + r, { st: 'done', upd: Date.now() }]]) });
row('js/prep.js saveConfig(), a sous chef: people and staffIds merged into config/main, with login/roster', { ok: CHEFS, asks: ['kit', 'sam'],
  run: (db, w, r) => { const people = PEOPLE.map(p => p.id === 'ann' ? Object.assign({}, p, { name: 'Ann ' + r }) : p);
    // pinOpenFor(staffIds): a window for everyone on the list
    const pinOpen = Object.fromEntries(IDS.map(id => [id, NOW + 7 * DAY]));
    return W(r, [['set', 'config/main', { people, staffIds: IDS, pinOpen, updated: Date.now(), updatedBy: NAME[r] }, true],
      ['set', 'login/roster', { people, staffIds: IDS, sousIds: CFG.sousIds, headId: 'kit', fnIds: CFG.fnIds, fnOnlyIds: CFG.fnOnlyIds }]]); } });
row('js/prep.js saveConfig(), the Google device: config/main and login/roster (batch, no by)', { ok: GOOGLE, asks: GOOGLE,
  run: db => { const b = writeBatch(db); b.set(D(db, 'config/main'), Object.assign({}, CFG, { updated: Date.now(), updatedBy: 'Head chef' })); b.set(D(db, 'login/roster'), ROSTER); return b.commit(); } });
row('js/prep.js resetPin(): Reset PIN (staffpins and pinset deleted, pinOpen merged; batch, no by)', { ok: GOOGLE, asks: GOOGLE,
  prep: () => put({ 'staffpins/finn': { hash: 'f'.repeat(64) }, 'pinset/finn': { at: 1 } }),
  run: db => { const b = writeBatch(db); b.delete(D(db, 'staffpins/finn')); b.delete(D(db, 'pinset/finn')); b.set(D(db, 'config/main'), { pinOpen: { finn: Date.now() + 30 * MIN } }, { merge: true }); return b.commit(); } });

// smaller changes the pages make with W() (the hide ticks, Remove, Undo and the next version of a template)
row('js/prep.js toggleUrgent(): mark a prep line urgent', { ok: KITCHEN, asks: ADDS,
  prep: r => put({ [`days/${TODAY}/items/${MINE(r)}`]: line() }),
  run: (db, w, r) => W(r, [['upd', `days/${TODAY}/items/${MINE(r)}`, { urgent: true, urgentBy: NAME[r], urgentById: w, urgentAt: Date.now() }]]) });
row('js/prep.js mergeDups(): a double up merged into the line it repeats', { ok: KITCHEN, asks: not('owner', 'vic', 'fay'),
  prep: r => put({ [`days/${TODAY}/items/${MINE(r)}`]: line(), [`days/${TODAY}/items/${MINE(r)}-2`]: line({ qty: '1 kg', qn: 1 }) }),
  run: (db, w, r) => W(r, [['upd', `days/${TODAY}/items/${MINE(r)}`, { qty: '3 kg', qn: 3, qu: 'kg' }],
    ['upd', `days/${TODAY}/items/${MINE(r)}-2`, { deleted: true, deletedBy: NAME[r], deletedAt: Date.now(), mergedInto: MINE(r) }]]) });
row('js/prep.js ordRoll(): an order line rolled onto today (addedById empty)', { ok: KITCHEN, asks: not('owner', 'vic', 'fay'),
  run: (db, w, r) => W(r, [['set', `orders/${TODAY}/lines/r-${r}`, { text: 'Milk', qty: '10 L', recipes: [], addedBy: 'Rolled over', addedById: '', addedAt: Date.now(), ordered: false, deleted: false,
    rolled: 1, root: 'o0', from: 'o0', rolledFrom: PAST, origBy: 'Ann', origAt: NOW - 5 * DAY, ahead: false, since: PAST }]]) });
row('js/prep.js hideSection() and the learned items\' Hide: sections and learned, hidden merged', { ok: CHEFS, asks: CHEFS,
  prep: r => put({ ['sections/h-' + r]: { name: 'Old pass', uses: 3, hidden: false, by: 'ann' }, ['learned/h-' + r]: { text: 'Old pass', uses: 3, hidden: false } }),
  run: (db, w, r) => W(r, [['set', 'sections/h-' + r, { hidden: true }, true], ['set', 'learned/h-' + r, { hidden: true }, true]]) });
row('js/prep.js miss-hide (admin Insights): a search that found nothing, hidden', { ok: KITCHEN, asks: GOOGLE,
  prep: r => put({ ['misses/h-' + r]: { q: 'pavlova', n: 2, last: NOW - DAY, lastBy: 'Ann', hidden: false } }),
  run: (db, w, r) => W(r, [['set', 'misses/h-' + r, { hidden: true, q: 'pavlova' }, true]]) });
row('js/prep.js removeNote(): remove a ping (removed merged)', { ok: CHEFS, asks: CHEFS,
  prep: r => put({ ['notes/h-' + r]: ping() }),
  run: (db, w, r) => W(r, [['set', 'notes/h-' + r, { removed: true, upd: Date.now() }, true]]) });
row('js/prep.js minutes and guides Remove (admin): removed merged', { ok: GOOGLE, asks: GOOGLE,
  prep: r => put({ ['minutes/h-' + r]: mins(), ['guides/h-' + r]: seed['guides/g1'] }),
  run: (db, w, r) => W(r, [['set', 'minutes/h-' + r, { removed: true, upd: Date.now() }, true], ['set', 'guides/h-' + r, { removed: true, upd: Date.now() }, true]]) });
row('js/prep.js mlSetPri(): how soon a mail matters (mail update)', { ok: GOOGLE, asks: GOOGLE,
  prep: r => put({ ['mail/p-' + r]: seed['mail/x1'] }),
  run: (db, w, r) => W(r, [['upd', 'mail/p-' + r, { pri: 'today' }]]) });
row('js/prep.js seedPinOpen(), a sous chef: the PIN windows merged into config/main', { ok: CHEFS, asks: ['kit', 'sam'],
  run: (db, w, r) => W(r, [['set', 'config/main', { pinOpen: { finn: NOW + 7 * DAY + ALL.indexOf(r) } }, true]]) });
row('js/prep.js pushOff(): this phone\'s push address removed (the Google device: deleteDoc)', { ok: CHEFS, asks: CHEFS,
  prep: (r, w) => put({ ['push/off-' + r]: { tok: 'token-' + r, at: 1, ua: 'android', by: GOOGLE.includes(r) ? 'owner' : w } }),
  run: (db, w, r) => GOOGLE.includes(r) ? deleteDoc(D(db, 'push/off-' + r)) : W(r, [['del', 'push/off-' + r]]) });
row('js/manage.js mineHide(): hide a template or own piece (its next version)', { ok: CHEFS, asks: CHEFS,
  prep: r => put({ ['drawtpl/h-' + r]: { name: 'Round plate', slot: 'plate', surf: {}, els: [], defs: '{}', vb: '', svgS: '', svgF: '', v: 1, upd: 1, removed: false, by: 'sam' } }),
  run: (db, w, r) => W(r, [['set', 'drawtpl/h-' + r, { name: 'Round plate', slot: 'plate', surf: {}, els: [], defs: '{}', vb: '', svgS: '', svgF: '', v: 2, upd: Date.now(), removed: true }]]) });

// functions
const FN = r => 'fn-' + r;
async function fnState(r, w, cancelled) {
  const id = FN(r), f = fnRec(id);
  const map = { ['functions/' + id]: f, [`days/${TODAY}/items/fn-${id}-pizza`]: Object.assign(pline(id), { deleted: false, addedBy: 'Fay', addedById: 'fay', addedAt: NOW - 3 * DAY, by: 'fay' }),
    [`orders/${TODAY}/lines/fn-${id}`]: Object.assign(oline(id), { deleted: false, addedBy: 'Fay', addedById: 'fay', addedAt: NOW - 3 * DAY, by: 'fay' }), [`functions/${id}/hist/1`]: null };
  if (cancelled) {
    const t = Date.now() - 20000;
    map['functions/' + id] = Object.assign({}, f, { v: 2, status: 'cancelled', od: '', canBy: w, canAt: t, upd: t, by: w, chg: [{ at: t, by: w, what: 'Cancelled' }] });
    map[`functions/${id}/hist/1`] = { was: f, at: t, what: 'Cancelled', by: w };
    map[`functions/${id}/hist/2`] = null;
  }
  await put(map);
}
// setStatus() in js/functions.js: the next version, its history, and the prep and order lines in one batch
async function setStatus(db, w, r, undo) {
  const id = FN(r), before = (await (async () => { let v; await off(async a => { v = (await getDoc(doc(a, at('functions/' + id)))).data(); }); return v; })());
  const f = JSON.parse(JSON.stringify(before)), t = Date.now(), who = NAME[r] || 'Head chef';
  if (undo) { f.od = TODAY; f.kq = fnRec(id).kq; }
  f.status = undo ? 'confirmed' : 'cancelled'; f.v = before.v + 1; f.upd = t; f.by = w;
  if (!undo) { f.canBy = w; f.canAt = t; f.od = ''; }
  const what = undo ? 'Cancellation undone' : 'Cancelled';
  f.chg = [{ at: t, by: w, what }].concat((before.chg || []).slice(0, 7));
  return W(r, [['set', 'functions/' + id, f], ['set', `functions/${id}/hist/${before.v}`, { was: before, at: t, what }],
    ['set', `days/${TODAY}/items/fn-${id}-pizza`, undo ? Object.assign(pline(id), { deleted: false, addedBy: who, addedById: w, addedAt: t }) : Object.assign(pline(id), { deleted: true, deletedBy: who, deletedAt: t }), true],
    ['set', `orders/${TODAY}/lines/fn-${id}`, undo ? Object.assign(oline(id), { deleted: false, addedBy: who, addedById: w, addedAt: t }) : Object.assign(oline(id), { deleted: true, deletedBy: who, deletedAt: t }), true]]);
}
row('js/functions.js setStatus(): Cancel a function (its history, prep and order lines in the batch)', { ok: FNCANCEL, asks: FNCANCEL,
  prep: (r, w) => fnState(r, w, false), run: (db, w, r) => setStatus(db, w, r, false) });
row('js/functions.js setStatus(): Undo my cancellation within 2 minutes', { ok: FNCANCEL, asks: FNCANCEL,
  prep: (r, w) => fnState(r, w, true), run: (db, w, r) => setStatus(db, w, r, true) });
row('js/functions.js tickSent(): tick a round sent (fnsent merge)', { ok: ALL, asks: ALL,
  run: (db, w, r) => { const a = T0 + ALL.indexOf(r) + 1; return W(r, [['set', `fnsent/f1_${a}`, { fid: 'f1', at: a, day: TODAY, sent: true, sentAt: Date.now(), sentBy: w }, true]]); } });
row('js/functions.js tickSent(): a chef takes back a round someone else ticked', { ok: CHEFS, asks: ['ownkit', 'kit', 'sam'],
  prep: r => { const a = T0 + 100 + ALL.indexOf(r); return put({ [`fnsent/f1_${a}`]: { fid: 'f1', at: a, day: TODAY, sent: true, sentAt: NOW - 10 * MIN, sentBy: 'ann', by: 'ann' } }); },
  run: (db, w, r) => { const a = T0 + 100 + ALL.indexOf(r); return W(r, [['set', `fnsent/f1_${a}`, { fid: 'f1', at: a, day: TODAY, sent: false, sentAt: NOW - 10 * MIN, sentBy: 'ann' }, true]]); } });
row('js/functions.js tickSent(): take back my own tick within 2 minutes', { ok: ALL, asks: ALL,
  prep: (r, w) => { const a = T0 + 200 + ALL.indexOf(r), t = Date.now() - 30000; return put({ [`fnsent/f1_${a}`]: { fid: 'f1', at: a, day: TODAY, sent: true, sentAt: t, sentBy: w, by: w } }); },
  run: async (db, w, r) => { const a = T0 + 200 + ALL.indexOf(r), cur = await serverRec(`fnsent/f1_${a}`);
    return W(r, [['set', `fnsent/f1_${a}`, { fid: 'f1', at: a, day: TODAY, sent: false, sentAt: cur.sentAt, sentBy: cur.sentBy }, true]]); } });
row('js/fnedit.js save(): confirm a new function with its contact, prep line and order line', { ok: ['owner', 'ownkit', 'fay'], asks: FNMGR,
  prep: r => put({ ['functions/n' + FN(r)]: null }),
  run: (db, w, r) => { const id = 'n' + FN(r), t = Date.now(), f = fnRec(id, { cBy: w, cAt: t, confBy: w, confAt: t, by: w, upd: t });
    return W(r, [['set', 'functions/' + id, f], ['set', 'fncontact/' + id, { cname: 'Jo Example', phone: '0400 000 000', email: '', upd: t }],
      ['set', `days/${TODAY}/items/fn-${id}-pizza`, Object.assign(pline(id), { deleted: false, addedBy: NAME[r] || 'Head chef', addedById: w, addedAt: t }), true],
      ['set', `orders/${TODAY}/lines/fn-${id}`, Object.assign(oline(id), { deleted: false, addedBy: NAME[r] || 'Head chef', addedById: w, addedAt: t }), true]]); } });
// save() of a booking already confirmed: the next version and its history, the changed prep and order lines merged
// (prepOps(), orderOps(); the order day stays, so the order line changes in place). The contact is not sent: it did not change
row('js/fnedit.js save(): change a confirmed function (2 platters to 3)', { ok: ['owner', 'ownkit', 'fay'], asks: FNMGR,
  prep: r => { const id = 'e' + FN(r); return put({ ['functions/' + id]: fnRec(id), [`functions/${id}/hist/1`]: null,
    [`days/${TODAY}/items/fn-${id}-pizza`]: Object.assign(pline(id), { deleted: false, addedBy: 'Fay', addedById: 'fay', addedAt: NOW - 3 * DAY, by: 'fay' }),
    [`orders/${TODAY}/lines/fn-${id}`]: Object.assign(oline(id), { deleted: false, addedBy: 'Fay', addedById: 'fay', addedAt: NOW - 3 * DAY, by: 'fay' }) }); },
  run: async (db, w, r) => { const id = 'e' + FN(r), before = await serverRec('functions/' + id), t = Date.now(), what = 'Pizza Platter 2 to 3', who = NAME[r] || 'Head chef';
    const f = Object.assign(JSON.parse(JSON.stringify(before)), { v: before.v + 1, upd: t, by: w });
    f.lines[0].qty = 3; f.lines[0].u = [0, 0, 0]; f.chg = [{ at: t, by: w, what }].concat(before.chg || []).slice(0, 8);
    return W(r, [['set', 'functions/' + id, f], ['set', `functions/${id}/hist/${before.v}`, { was: before, at: t, what }],
      ['set', `days/${TODAY}/items/fn-${id}-pizza`, Object.assign(pline(id), { qty: '3 platters', deleted: false, addedBy: who, addedById: w, addedAt: t }), true],
      ['set', `orders/${TODAY}/lines/fn-${id}`, Object.assign(oline(id), { text: 'Function stock: Party ' + id + ', 3 Pizza', qty: '3 platters', deleted: false, addedBy: who, addedById: w, addedAt: t }), true]]); } });
row('js/fnedit.js setRemoved(): delete a cancelled function from the list', { ok: ['owner', 'ownkit', 'fay'], asks: FNMGR,
  prep: r => { const id = 'd' + FN(r), f = fnRec(id, { v: 2, status: 'cancelled', od: '', canBy: 'fay', canAt: NOW - DAY, upd: NOW - DAY }); return put({ ['functions/' + id]: f, [`functions/${id}/hist/2`]: null }); },
  run: async (db, w, r) => { const id = 'd' + FN(r); let before; await off(async a => { before = (await getDoc(doc(a, at('functions/' + id)))).data(); });
    const t = Date.now(), f = Object.assign(JSON.parse(JSON.stringify(before)), { removed: true, status: 'cancelled', od: '', kq: 0, v: before.v + 1, upd: t, by: w, chg: [{ at: t, by: w, what: 'Deleted from list' }] });
    return W(r, [['set', 'functions/' + id, f], ['set', `functions/${id}/hist/${before.v}`, { was: before, at: t, what: 'Deleted from list' }]]); } });
row('js/deliveries.js save(): a delivery receipt', { ok: ALL, asks: ALL,
  run: (db, w, r) => { const by = w || 'owner'; return W(r, [['set', 'deliveries/' + MINE(r), { day: TODAY, receivedAt: Date.now() - 60000, recordedAt: Date.now(), supplier: 'Valley Veg', chilled: 4, frozen: -18, note: '', receivedBy: NAME[r] || 'Admin', receivedById: by, by }]]); } });

// the book: a merge onto book/index or book/matches that another sign-in wrote last, with the public copies (#398)
async function lastWriter(by, extra) {
  let idx, mt;
  await off(async a => { idx = (await getDoc(doc(a, at('book/index')))).data(); mt = (await getDoc(doc(a, at('book/matches')))).data(); });
  await put(Object.assign({ 'book/index': Object.assign({}, idx, { by }), '/publicBook/index': Object.assign({}, idx, { by }),
    'book/matches': Object.assign({}, mt, { by }), '/publicBook/matches': Object.assign({}, mt, { by }) }, extra || {}));
}
async function serverRec(p) { let v = null; await off(async a => { const s = await getDoc(doc(a, at(p))); v = s.exists() ? s.data() : null; }); return v; }
// save() in js/manage.js: the recipe, book/index merged with its version, the version before kept
async function saveRecipe(r, id) {
  const cur = await serverRec('recipes/' + id), v = (cur ? cur.v : 0) + 1, t = Date.now();
  const ops = [['set', 'recipes/' + id, recipe(id, v, undefined, { upd: t })], ['set', 'book/index', { r: { [id]: v }, upd: t }, true]];
  if (cur) { const was = {}; ['r', 'v', 'upd', 'by', 'src', 'base', 'removed', 'off'].forEach(k => { if (cur[k] !== undefined) was[k] = cur[k]; }); ops.push(['set', `recipes/${id}/hist/${cur.v}`, { was, at: t }]); }
  return W(r, ops);
}
const rxPrep = by => async r => { const id = 'rx-' + r; await lastWriter(by, { ['recipes/' + id]: recipe(id, 1, by), ['/publicRecipes/' + id]: recipe(id, 1, by), [`recipes/${id}/hist/1`]: null }); await bumpIndex(id, 1); };
async function bumpIndex(id, v) { const idx = await serverRec('book/index'); idx.r[id] = v; await put({ 'book/index': idx, '/publicBook/index': idx }); }
row('js/manage.js save(): change a recipe after a sous chef saved last (book/index by Sam)', { ok: CHEFS, asks: CHEFS, prep: rxPrep('sam'), run: (db, w, r) => saveRecipe(r, 'rx-' + r) });
row('js/manage.js save(): change a recipe after the Google device saved last (book/index by nobody)', { ok: CHEFS, asks: CHEFS, prep: rxPrep(''), run: (db, w, r) => saveRecipe(r, 'rx-' + r) });
row('js/manage.js save(): a new recipe after a sous chef saved last', { ok: CHEFS, asks: CHEFS,
  prep: r => lastWriter('sam', { ['recipes/new-' + r]: null, ['/publicRecipes/new-' + r]: null }), run: (db, w, r) => saveRecipe(r, 'new-' + r) });
// commit() in js/draw.js: the drawing, the recipe's link (patchRecipe()), book/index merged, and the picks (book/matches,
// from LK_SMART.pendingOps(): teach() in js/smart.js only queues a pick, so the picks are only ever sent in this batch)
row('js/draw.js commit(): a new drawing with the recipe link and the picks (pendingOps()), after a sous chef saved last', { ok: CHEFS, asks: CHEFS,
  prep: async r => { const id = 'dr-' + r; await lastWriter('sam', { ['recipes/' + id]: recipe(id, 1, 'sam'), ['/publicRecipes/' + id]: recipe(id, 1, 'sam'), [`recipes/${id}/hist/1`]: null, [`drawings/${id}-plate`]: null, [`/publicDrawings/${id}-plate`]: null }); await bumpIndex(id, 1); },
  run: async (db, w, r) => { const id = 'dr-' + r, did = id + '-plate', t = Date.now(), rc = await serverRec('recipes/' + id), rv = rc.v + 1;
    const was = {}; ['r', 'v', 'upd', 'by', 'src', 'base', 'removed', 'off'].forEach(k => { if (rc[k] !== undefined) was[k] = rc[k]; });
    const rec = recipe(id, rv, undefined, { r: Object.assign({}, rc.r, { art: '@' + did }), upd: t });
    return W(r, [['set', 'drawings/' + did, drawing(id, 1)], ['set', 'recipes/' + id, rec], ['set', `recipes/${id}/hist/${rc.v}`, { was, at: t }],
      ['set', 'book/index', { d: { [did]: 1 }, r: { [id]: rv }, upd: t }, true], ['set', 'book/matches', { m: { ['leek-' + r]: 'leek-1' }, upd: t }, true]]); } });
row('js/draw.js saveTemplate(), savePiece(), saveWare(): drawtpl and drawlib', { ok: CHEFS, asks: CHEFS,
  run: (db, w, r) => W(r, [['set', 'drawtpl/' + MINE(r), { name: 'Round plate', slot: 'plate', surf: {}, els: [], defs: '{}', vb: '-110 -110 220 220', svgS: '', svgF: '', v: 1, upd: Date.now(), removed: false }],
    ['set', 'drawlib/' + MINE(r), { type: 'surf', name: 'Board ' + r, p: {}, v: 1, upd: Date.now(), removed: false }]]) });

/* ---------- a person's PIN reset while their book is open (r2-1-2) ----------
   The owner's Reset PIN deletes pinset/<id>; the person's running config/main listener is refused at once, which is
   right. login/roster still opens, so the page can tell this from a wrong kitchen PIN. Kept last: it takes PINs away. */
const RESET = KPINS.filter(r => r !== 'ownkit');
const resetPrep = (r, w) => w ? put({ ['pinset/' + w]: null }) : Promise.resolve();
const resetBack = (r, w) => w ? put({ ['pinset/' + w]: { at: 1 } }) : Promise.resolve();
row('js/prep.js connect(): config/main listener once my PIN is reset (Reset PIN, Stopped working here)', { ok: GOOGLE, asks: [],
  known: { roles: RESET, pr: 'PR 4 (r2-1-2)', why: 'the refusal is right, but the page reads it as a wrong kitchen PIN and forgets the kitchen PIN, when it should ask this person for their own PIN again (client)' },
  prep: resetPrep, after: resetBack, run: db => listen(D(db, 'config/main')) });
row('js/prep.js connect(): login/roster once my PIN is reset (what the page falls back to)', { ok: ALL, asks: KPINS,
  prep: resetPrep, after: resetBack, run: db => getDoc(D(db, 'login/roster')) });
// Sign out and the idle lock end this phone's session (put back after, so each sign-in starts the same)
row('js/prep.js signOutPerson(): this phone\'s session deleted', { ok: ALL, asks: PINS,
  after: r => r === 'owner' ? Promise.resolve() : put({ ['sessions/' + UID[r]]: seed['sessions/' + UID[r]] }), run: (db, w, r) => deleteDoc(D(db, 'sessions/' + UID[r])) });


/* ---------- run ---------- */
let fails = 0, cells = 0;
const known = [], grid = [];
const mark = ok => ok ? '+' : '.';
for (const [n, x] of ROWS.entries()) {
  const k = x.known || null, kr = k ? (k.roles || []) : [], bad = [], got = {};
  for (const r of ALL) {
    const w = WHO[r];
    if (x.prep) await x.prep(r, w);
    let ok;
    try { await x.run(DB[r], w, r); ok = true; }
    catch (e) { if (e && e.code !== 'permission-denied') { bad.push(r + ' failed: ' + String(e.code || e.message).slice(0, 80)); ok = null; } else ok = false; }
    if (x.after) await x.after(r, w);
    got[r] = ok; cells++;
    // every cell is checked against the rules, known or not: a known mark excuses what a page asks for, never a change
    // in what the rules let through
    const want = x.ok.includes(r);
    if (ok !== null && ok !== want) bad.push(r + (want ? ' refused, the rules should let it through' : ' let through, the rules should refuse it'));
  }
  // the pages' needs: every sign-in whose page makes the call must be let through, unless the row is known for it
  const need = (x.asks || []).filter(r => !x.ok.includes(r) && !kr.includes(r));
  if (need.length) bad.push('the page asks for it as ' + need.join(', ') + ', but the row expects a refusal (a live bug: mark it known with its fix)');
  const line = ALL.map(r => r + mark(got[r]) + (got[r] === null || got[r] !== x.ok.includes(r) ? '!' : kr.includes(r) ? '~' : '')).join(' ');
  grid.push(String(n + 1).padStart(3) + ' ' + line + '  ' + x.label);
  if (bad.length) { fails++; console.log('FAIL ' + x.label + ': ' + bad.join('; ')); }
  else console.log('PASS ' + x.label);
  if (k) { known.push(x.label + ' [' + kr.join(', ') + '] ' + k.why + ' (' + k.pr + ')'); console.log('KNOWN ' + x.label + ' [' + kr.join(', ') + ']: ' + k.why + ' (' + k.pr + ')'); }
}
await env.cleanup();
console.log('\nWho the rules let through (+) or refuse (.), in the order ' + ALL.join(', ') + '. ! is not as expected, ~ is a known mark:\n' + grid.join('\n'));
console.log('\nKnown (what the page needs there is not counted as a failure; what the rules do there still is):\n' + known.map(s => '- ' + s).join('\n'));
console.log('\n' + (fails ? fails + ' of ' + ROWS.length + ' client shape rows FAILED' : ROWS.length + ' client shape rows passed') + ' (' + cells + ' calls, ' + ALL.length + ' sign-ins, ' + known.length + ' known).');
if (fails) process.exit(1);
