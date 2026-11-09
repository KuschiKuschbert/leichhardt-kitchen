// Stand-in for the Firestore web SDK, for the click tests only (tests/lib.js serves it instead of the real SDK).
// Synthetic server data lives in localStorage ('fake.fs') so reloads keep it. The client read cache is memory only.
// window.__fake controls failures:
//   __fake.mode = 'ok' | 'deny' (every write refused, permission-denied) | 'hold' (writes wait, like no signal)
//   | 'fail' (every write and every read from the server fails, unavailable; getDoc, getDocs and listeners still
//   answer, so it is not no signal: __fake.cold below is)
//   __fake.deny = /regex/ refuses only the writes whose path matches
//   __fake.failReads = /regex/ makes getDoc, getDocs and getDocFromServer fail (unavailable) for the paths that match, like a read lost to a bad signal
//   __fake.denyReads = /regex/ makes queries and explicit server reads refuse matching paths (permission-denied), like unpublished rules
//   __fake.cold = /regex/ is no signal the way the book's memory cache answers it (26 Oct 2026, #387, memoryLocalCache), for
//   the paths that match: a listener started then answers at once from an empty copy (only this page's own unsent
//   writes), marked fromCache; getDocs answers the same way; getDoc, getDocFromServer and getDocsFromServer refuse
//   (unavailable). Listeners started before keep their documents, marked fromCache. __fake.warm() is the signal coming
//   back: cold goes, held writes are sent ('hold' becomes 'ok') and every listener gets the server's answer.
//   __fake.ack() lets the listeners hear the server's confirm of the held writes, whose promises still wait for
//   release(); __fake.quiet = true tells a listener only what changed for it, like the SDK (see sigOf below).
//   __fake.notOwner = true: the Google account is not the head chef's (the owner check, config/admins, is refused)
// __fake.reads lists the paths asked for (getDoc, getDocs, getDocFromServer) and __fake.readLog every document read from the "server";
// getDocsFromCache only returns documents this page has read before.
// Reads the real rules refuse are refused here too, for the sign-in on this page (colRefused(), readRefused(),
// rulesDenied(), listeners included): the kitchen's records without a live PIN session or for functions only, past
// wastage and transfer lines, loans not on the open list, functions and deliveries without a session, deliveries of
// another day, what only the head chef's Google account reads, and record by record the chef, function manager, mail,
// sign-off and personal ping rules. Each one is listed in __fake.refused ({ kind, path }), so a page that starts asking
// for one shows up in the click tests (tests/roles.test.js). __fake.failReads and __fake.denyReads are not listed: a
// test asked for those. The PIN screen's own reads (login/roster, pinset/<id>) are not checked here.
const KEY = 'fake.fs';
export class Timestamp {
  constructor(seconds, nanoseconds = 0) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
  static fromMillis(value) { const seconds = Math.floor(value / 1000); return new Timestamp(seconds, Math.round((value - seconds * 1000) * 1000000)); }
  toMillis() { return this.seconds * 1000 + this.nanoseconds / 1000000; }
  valueOf() { return this.toMillis(); }
  isEqual(other) { return other instanceof Timestamp && other.seconds === this.seconds && other.nanoseconds === this.nanoseconds; }
  toJSON() { return { __fakeTimestamp: this.toMillis() }; }
}
function revive(key, value) {
  if (value && typeof value === 'object' && typeof value.__fakeTimestamp === 'number') return Timestamp.fromMillis(value.__fakeTimestamp);
  if (value && typeof value === 'object' && Object.keys(value).every(k => ['seconds', 'nanoseconds'].includes(k)) && Number.isInteger(value.seconds) && Number.isInteger(value.nanoseconds)) return new Timestamp(value.seconds, value.nanoseconds);
  return value;
}
const clone = value => JSON.parse(JSON.stringify(value), revive);
const requestNow = () => Date.now() + (window.__fakeServerOffset || 0);
const stampMillis = value => value instanceof Timestamp ? value.toMillis() : NaN;
const nextFour = value => (Math.floor((value + 6 * 3600000) / 86400000) + 1) * 86400000 - 6 * 3600000;
function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}', revive); } catch (e) { return {}; } }
let store = load();
function save() { localStorage.setItem(KEY, JSON.stringify(store)); }
const subs = new Set();
const held = [];
// documents written while 'hold' (no signal): their snapshots say hasPendingWrites until release()
const pendingKeys = new Set();
window.__fake = window.__fake || { mode: 'ok', writes: [], reads: [] };
// __fake.bill lists what each read would cost on the real Firestore (22 Oct 2026, tests/read-budget.test.js): a getDoc is
// one read, a query one per document it returns (at least one, even when empty), a listener the documents it first
// sends (at least one) and then one per document that changed. Reads from the phone's own cache cost nothing.
window.__fake.bill = window.__fake.bill || [];
function bill(kind, path, n) { window.__fake.bill.push({ kind, path, n: Math.max(1, n) }); }
/* The records the rules look up (Plan B 6.2, 7 Nov 2026): Firestore bills a read for each record a request's rules get()
   or exists(), once per request. For the kitchen's records from a phone's device identity that is its admin grant
   (adminDevices/<uid>, deviceAdmin()) and its session (sessions/<uid>), and with a session the person's PIN record
   (pinset/<by>) and the kitchen settings (config/main): 4 a request, 2 with no session. Counted for each read, query,
   listener start and write the rules let through; the head chef's Google account's own checks read nothing, and the
   name picker (login/roster) is open. Kept apart from bill, so the tests that count a path's own reads are unchanged:
   tests/read-budget.test.js adds them in. */
window.__fake.ruleBill = window.__fake.ruleBill || [];
function ruleBill(kind, ref) {
  const k = key(ref.path);
  if (!/^kitchens\/[^/]+\//.test(k) || /^kitchens\/[^/]+\/login\/roster$/.test(k)) return;
  const u = authUser(ref); if (!u || !u.isAnonymous) return;
  // A declaration write also checks the exact canonical cooling run and its server deadline.
  const coolingLookup = kind === 'write' && /^kitchens\/[^/]+\/cooling\/recorded$/.test(k) ? 1 : 0;
  window.__fake.ruleBill.push({ kind, path: k, n: (store[rootOfRef(ref) + '/sessions/' + authUid(ref)] ? 4 : 2) + coolingLookup });
}
window.__fake.readLog = [];
window.__fake.refused = window.__fake.refused || [];
function refuse(kind, ref) { window.__fake.refused.push({ kind, path: key(ref.path) }); return Promise.reject({ code: 'permission-denied' }); }
/* The documents this page has read, for getDocFromCache and getDocsFromCache. Like memoryLocalCache in the app, this
   copy lasts through same-page navigation and disappears on a full reload. The synthetic server above remains intact.
   __fake.cold (o.cold in tests/lib.js) separately models a cold read with no signal. */
const seen = new Set();
const cacheKey = (k, appName) => !appName || appName === '[DEFAULT]' ? k : appName + '|' + k;
function remember(k, appName) { seen.add(cacheKey(k, appName)); }
window.__fake.release = function () { const h = held.splice(0); pendingKeys.clear(); h.forEach(f => f()); notify(); };
// the server's confirm reaching the listeners first (28 Oct 2026): the snapshots lose hasPendingWrites while the writes'
// promises still wait (release() ends them), so a page's own .then() after a write does not draw
window.__fake.ack = function () { pendingKeys.clear(); notify(); };
// __fake.quiet = true: like the SDK, a listener hears nothing when nothing it holds changed (documents, hasPendingWrites
// and fromCache all the same as its last snapshot). Off by default: every listener is told again after any write, which
// redraws the page, so a check that something is patched in place without a redraw turns this on
function sigOf(docs, fromCache) { return JSON.stringify(docs.map(d => [key(d.ref.path), d.exists() ? d.data() : null, !!(d.metadata && d.metadata.hasPendingWrites)])) + '|' + !!fromCache; }
window.__fake.warm = function () {
  window.__fake.cold = null; subs.forEach(s => { s.cold = false; });
  if (window.__fake.mode === 'hold') { window.__fake.mode = 'ok'; window.__fake.release(); } else notify();
};
window.__fake.dump = function () { return store; };
// a write from another phone: the document changes under this page and its listeners hear about it
window.__fake.write = function (path, data) {
  if (data == null) delete store[path]; else store[path] = clone(data);
  if (/\/config\/main$/.test(path)) {
    const c=store[path], roster={}; ['people','staffIds','sousIds','headId','fnIds','fnOnlyIds'].forEach(k=>{if(c[k] !== undefined) roster[k]=c[k];});
    store[path.replace(/config\/main$/, 'login/roster')] = roster;
  }
  save(); notify();
};
let seq = 0;
function rid() { return 'id' + Date.now().toString(36) + (seq++).toString(36); }

export function initializeFirestore(app) { return { kind: 'db', app, appName: app && app.name || '[DEFAULT]' }; }
export function getFirestore(app) { return initializeFirestore(app); }
export function memoryLocalCache() { return {}; }
export function persistentLocalCache() { return {}; }
export function persistentMultipleTabManager() { return {}; }
export function terminate() { window.__fake.terminated = true; return Promise.resolve(); }
function segs(a) { return a.filter(x => typeof x === 'string'); }
function baseOf(x) { return x && x.path ? x.path : []; }
const appOf = value => value && (value.appName || value.app && value.app.name) || '[DEFAULT]';
const authUser = ref => window.__fakeAuthUser ? window.__fakeAuthUser(appOf(ref)) : null;
const authUid = ref => (authUser(ref) || {}).uid || '';
export function collection(parent, ...p) { return { type: 'col', path: baseOf(parent).concat(segs(p)), appName: appOf(parent) }; }
export function collectionGroup(parent, group) { return { type: 'group', path: ['**', group], group, appName: appOf(parent) }; }
export function doc(parent, ...p) {
  let path = baseOf(parent).concat(segs(p));
  if (parent && parent.type === 'col' && !p.length) path = parent.path.concat([rid()]);
  return { type: 'doc', path, id: path[path.length - 1], appName: appOf(parent) };
}
export function where(f, op, v) { return { k: 'where', f, op, v }; }
export function documentId() { return '__name__'; }
export function orderBy(f, dir) { return { k: 'order', f, dir: dir || 'asc' }; }
export function limit(n) { return { k: 'limit', n }; }
export function startAfter(sn) { return { k: 'after', id: typeof sn === 'string' ? sn : sn.id, byName: typeof sn === 'string' }; }
export function query(col, ...c) { return { type: 'query', path: col.path, group: col.group, c, appName: appOf(col) }; }
export function serverTimestamp() { return { __st: 1 }; }
export function increment(n) { return { __inc: n }; }

const key = p => p.join('/');
function snapDoc(path, appName = '[DEFAULT]') {
  const v = store[key(path)];
  return { id: path[path.length - 1], ref: { type: 'doc', path, id: path[path.length - 1], appName }, metadata: { fromCache: false, hasPendingWrites: pendingKeys.has(key(path)) }, exists: () => v !== undefined, data: () => (v === undefined ? undefined : clone(v)) };
}
// __fake.cold: is this path answered from the empty copy in memory (no signal)?
function cold(ref) { const c = window.__fake.cold; return !!(c && c.test(key(ref.path))); }
// what the memory copy holds with no signal: only this page's unsent writes, marked fromCache
function cacheSnap(ref) {
  if (ref.type === 'doc') {
    const k = key(ref.path), has = pendingKeys.has(k), d = snapDoc(ref.path, appOf(ref));
    return { id: d.id, ref: d.ref, metadata: { fromCache: true, hasPendingWrites: has }, exists: () => has && d.exists(), data: () => (has ? d.data() : undefined) };
  }
  const docs = listCol(ref.path, ref.c, ref.group, appOf(ref)).docs.filter(d => pendingKeys.has(key(d.ref.path)));
  return { docs, empty: !docs.length, size: docs.length, metadata: { fromCache: true, hasPendingWrites: docs.length > 0 }, forEach: f => docs.forEach(f) };
}
function listCol(path, c, group, appName = '[DEFAULT]') {
  const pre = key(path) + '/', n = path.length + 1;
  let docs = Object.keys(store).filter(k => group ? k.split('/').slice(-2)[0] === group : k.indexOf(pre) === 0 && k.split('/').length === n).map(k => snapDoc(k.split('/'), appName));
  if (group) docs.sort((a, b) => key(a.ref.path).localeCompare(key(b.ref.path)));
  (c || []).forEach(x => {
    if (x.k === 'where' && x.f === '__name__') {
      const v = x.v && x.v.path ? key(x.v.path) : x.v;
      docs = docs.filter(d => { const id = group ? key(d.ref.path) : d.id; return x.op === 'in' ? v.indexOf(id) >= 0 : x.op === '>=' ? id >= v : x.op === '<=' ? id <= v : x.op === '<' ? id < v : x.op === '>' ? id > v : id === v; }); return;
    }
    if (x.k === 'where') docs = docs.filter(d => { const v = (d.data() || {})[x.f]; if (x.op === 'in') return x.v.indexOf(v) >= 0; return x.op === '==' ? v === x.v : x.op === '>=' ? v >= x.v : x.op === '<' ? v < x.v : x.op === '<=' ? v <= x.v : x.op === '>' ? v > x.v : true; });
    if (x.k === 'order') docs.sort((a, b) => { const A = x.f === '__name__' ? a.id : a.data()[x.f], B = x.f === '__name__' ? b.id : b.data()[x.f]; return (A > B ? 1 : A < B ? -1 : 0) * (x.dir === 'desc' ? -1 : 1); });
    if (x.k === 'after') { if (x.byName) { const order = (c || []).find(y => y.k === 'order' && y.f === '__name__'); docs = docs.filter(d => order && order.dir === 'desc' ? d.id < x.id : d.id > x.id); } else { const i = docs.findIndex(d => d.id === x.id); docs = i < 0 ? [] : docs.slice(i + 1); } }
    if (x.k === 'limit') docs = docs.slice(0, x.n);
  });
  return { docs, empty: !docs.length, size: docs.length, metadata: { fromCache: false, hasPendingWrites: docs.some(d => d.metadata.hasPendingWrites) }, forEach: f => docs.forEach(f) };
}
function result(ref, keep = true) {
  const r = ref.type === 'doc' ? snapDoc(ref.path, appOf(ref)) : listCol(ref.path, ref.c, ref.group, appOf(ref));
  (ref.type === 'doc' ? [r] : r.docs).forEach(d => { const k = key(d.ref.path); if (d.exists()) { if (keep) remember(k, appOf(ref)); window.__fake.readLog.push(k); } else if (keep && ref.type === 'doc') remember(k, appOf(ref)); });
  return r;
}
function delay(v) { return new Promise(r => setTimeout(() => r(v), 5)); }
/* Who this phone reads as, like the rules (firestore.rules sessOk(reader()), kitchenRead(), chefId()), for the person on
   this phone's PIN session; the head chef's Google account (isAdmin(ref)) is the verified owner and reads it all. */
function rootOfRef(ref) { return ref.path[0] === 'kitchens' ? ref.path.slice(0, 2).join('/') : (Object.keys(store).find(k => /^kitchens\/[^/]+\/config\/main$/.test(k)) || 'kitchens/000000/config/main').split('/').slice(0, 2).join('/'); }
function cfgOf(ref) { return store[rootOfRef(ref) + '/config/main'] || {}; }
function rawOwner(ref) { const user = authUser(ref); return !!(user && !user.isAnonymous && user.emailVerified === true && user.email === 'headchef@test.local' && !window.__fake.notOwner); }
function validSession(ss, c, root) {
  const ps = ss && store[root + '/pinset/' + ss.by], issued = ss && stampMillis(ss.issuedAt), at = ss && stampMillis(ss.at), t = requestNow();
  return !!(ss && ss.v === 2 && ['personal', 'shared'].includes(ss.mode) && ps && ps.at === ss.pinAt && (c.staffIds || []).includes(ss.by) &&
    Number.isFinite(issued) && Number.isFinite(at) && issued <= t && at >= issued && at <= t && ss.exp === nextFour(issued) && ss.exp > t);
}
function isAdmin(ref) {
  const user = authUser(ref), root = rootOfRef(ref), c = cfgOf(ref), uid = authUid(ref), ss = store[root + '/sessions/' + uid], grant = store[root + '/adminDevices/' + uid];
  return !!(user && user.isAnonymous && validSession(ss, c, root) && c.headId && ss.by === c.headId && !(c.fnOnlyIds || []).includes(ss.by) && grant && grant.v === 2 && grant.by === ss.by &&
    grant.pinAt === ss.pinAt && grant.exp === ss.exp && stampMillis(grant.issuedAt) === stampMillis(ss.issuedAt) && stampMillis(grant.at) >= stampMillis(ss.issuedAt) && stampMillis(grant.at) <= requestNow() &&
    typeof grant.googleUid === 'string' && grant.googleUid.length > 0 && grant.googleUid.length <= 160);
}
// sessOk(reader()): a PIN session that has not run out, opened since their PIN was last set, for someone on the staff
// list. '' when there is none
function sessionReader(ref) {
  const root = rootOfRef(ref), uid = authUid(ref), ss = uid ? store[root + '/sessions/' + uid] : null;
  return authUser(ref) && authUser(ref).isAnonymous && validSession(ss, cfgOf(ref), root) ? ss.by : '';
}
/* kitchenRead(): the same, for someone who is not functions only */
function kitchenReader(ref) { const by = sessionReader(ref); return by && (cfgOf(ref).fnOnlyIds || []).indexOf(by) < 0 ? by : ''; }
/* the chef to-do list (23 Oct 2026), the supplier tools, the sign-off register (27 Oct 2026), the supplier order ticks
   (cutdone), the personal pings of others and who has seen them: like the rules, only the head chef's Google account or a
   phone whose kitchen reader is a chef (sousIds or headId in config/main) reads them */
function chefReader(ref) {
  if (isAdmin(ref)) return true;
  const by = kitchenReader(ref), c = cfgOf(ref);
  return !!by && ((c.sousIds || []).indexOf(by) >= 0 || (!!c.headId && c.headId === by));
}
// Cleaning is held back until the admin enables it; canonical chefs retain the setup workspace.
function cleaningReader(ref) { return !!kitchenReader(ref) && (chefReader(ref) || (cfgOf(ref).staffSee || {}).cleaning === true); }
// someone ticked for Functions (fnIds) on their own PIN session, functions only or not (fncontact, functions/<id>/hist)
function fnReader(ref) { if (isAdmin(ref)) return true; const by = sessionReader(ref); return !!by && (cfgOf(ref).fnIds || []).indexOf(by) >= 0; }
// kitchen mail: the Google account, or a sous chef on their PIN session while the head chef has sous chef mail on
function mailReader(ref) { if (isAdmin(ref)) return true; const c = cfgOf(ref), by = kitchenReader(ref); return c.sousMail === true && !!by && (c.sousIds || []).indexOf(by) >= 0; }
const at3 = (k, name) => new RegExp('^kitchens/[^/]+/' + name).test(k);
/* isToday(day) in the rules: the path's date is today in kitchen time (Queensland, UTC+10), with 15 minutes either side
   for a phone's clock. On the page's own clock, which the tests set */
function isToday(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return false;
  const mid = Date.parse(day + 'T00:00:00Z') - 10 * 3600000, t = Date.now();
  return t >= mid - 15 * 60000 && t < mid + 86400000 + 15 * 60000;
}
// the operational records (kitchenRead() in the rules): a live PIN session for someone who is not functions only
const KITCHEN_COLS = ['config', 'days', 'orders', 'waste', 'summary', 'misses', 'views', 'notes', 'guides', 'drinks', 'shifts', 'team', 'activity', 'sections',
  'learned', 'ordlearned', 'learnlog', 'minutes', 'mailstat', 'transfers', 'transferOpen', 'digest', 'prepStandards', 'cleaningTasks'];
const coolingCollection = ref => ref.path[0] === 'kitchens' && ref.path[2] === 'cooling';
/* The read rules by collection, before the record-by-record ones in readRefused() and rulesDenied(): true when the real
   rules refuse this phone the record (list false) or the query (list true). Everything here is open to the head chef's
   Google account, apart from the records nobody reads (pushes, PIN tries, the old proofs). */
function colRefused(ref, list) {
  const rel = ref.path.slice(2), c = rel[0], k = key(ref.path);
  if (ref.path[0] !== 'kitchens' || ref.group) return false;
  // A live kitchen session reads the shared timer and declarations, including View only. No list exception.
  if (coolingCollection(ref)) return list || rel.length !== 2 || !['current', 'recorded'].includes(rel[1]) || !kitchenReader(ref);
  if (c === 'adminDevices') return list || !(rawOwner(ref) || authUid(ref) && rel[1] === authUid(ref));
  if (c === 'sessions') return list || !authUid(ref) || rel[1] !== authUid(ref);
  if (c === 'push' || c === 'tries' || c === 'proofs') return true;
  if (rawOwner(ref) && !list && c === 'config' && ['main', 'admins'].includes(rel[1])) return false;
  if (isAdmin(ref)) return false;
  // only the head chef's Google account: PIN fingerprints, the usage counts, the minutes' earlier versions, and the
  // lists of who has a PIN and of every mail's status (one record by id is for the kitchen)
  if (c === 'staffpins' || c === 'daily' || c === 'proofHistory' || c === 'dashwatch' || (c === 'minutes' && rel[2] === 'hist')) return true;
  if (list && (c === 'pinset' || c === 'mailstat')) return true;
  // recipes and drawings are public, their earlier versions are for the kitchen
  if ((c === 'recipes' || c === 'drawings') && rel[2] === 'hist' && !kitchenReader(ref)) return true;
  // functions, the rounds sent and today's delivery receipts (functionRead(): any live PIN session, functions only too)
  if (c === 'functions' || c === 'fnsent') return !sessionReader(ref) && rel[2] !== 'hist';
  if (c === 'deliveries') {
    if (!sessionReader(ref)) return true;
    if (list) return !(ref.c || []).some(x => x.k === 'where' && x.f === 'day' && x.op === '==' && isToday(x.v));
    return store[k] !== undefined && !isToday(store[k].day);   // a new receipt's id may be checked before it is written
  }
  if (c === 'cleaningTasks') return !cleaningReader(ref);
  if (c === 'cleaningDone' || c === 'cleaningActions') {
    if (!cleaningReader(ref)) return true;
    if (chefReader(ref)) return false;
    const today = new Date(requestNow() + 36000000).toISOString().slice(0, 10);
    return list ? !asks(ref, 'day', '==', today) : store[k] !== undefined && store[k].day !== today;
  }
  if (KITCHEN_COLS.indexOf(c) < 0 || (c === 'config' && rel[1] !== 'main')) return false;
  if (!kitchenReader(ref)) return true;
  // past wastage and transfer lines are for the head chef's Google account (admin Reports): the kitchen reads today's
  if ((c === 'waste' || c === 'transfers') && rel[2] === 'lines') return !isToday(rel[1]);
  // a loan is read from the open list only: a query for open == true, or one record that is open
  if (c === 'transferOpen') return list ? !asks(ref, 'open', '==', true) : !(store[k] && store[k].open === true);
  return false;
}
/* One record the real rules refuse this phone (getDoc, getDocFromServer, a listener on it, Lite). */
function readRefused(ref) {
  if (colRefused(ref, false)) return true;
  // __fake.notOwner = true: the Google account signed in is not the head chef's, so the owner check is refused (28 Oct
  // 2026: only that refusal means "not the head chef's account", no signal does not)
  if (window.__fake.notOwner && /\/config\/admins$/.test(key(ref.path))) return true;
  if (rawOwner(ref) && /\/config\/(main|admins)$/.test(key(ref.path))) return false;
  if (isAdmin(ref)) return false;
  const k = key(ref.path), root = ref.path.slice(0, 2).join('/');
  if (/\/config\/admins$/.test(k)) return true;   // the owner check: only the head chef's Google account reads it
  // a function contact (22 Oct 2026, review S9) and a function's history (fnIds or a chef)
  if (/\/fncontact\/[^/]+$/.test(k)) return !fnReader(ref);
  if (at3(k, 'functions/[^/]+/hist/[^/]+$')) return !(chefReader(ref) || fnReader(ref));
  // one minutes record only when it is published
  if (/\/minutes\/[^/]+$/.test(k)) return store[k] !== undefined && store[k].status !== 'published';
  // a sign-off (27 Oct 2026), like the rules: a chef reads any of them; anyone else reads only their own, signed or not
  // yet: the id is the version (digits), '_', then the id of the person on this phone's session, as a whole
  if (/\/minutes\/[^/]+\/signs\/[^/]+$/.test(k)) {
    const by = kitchenReader(ref), sid = ref.path[ref.path.length - 1], v = sid.split('_')[0];
    return !(chefReader(ref) || (by && /^[0-9]+$/.test(v) && sid === v + '_' + by));
  }
  // a personal ping: its person, or a chef; who has seen it: a chef, or its person reading their own record
  if (at3(k, 'directnotes/[^/]+$')) { const by = kitchenReader(ref); return !(chefReader(ref) || (by && store[k] && store[k].to === by)); }
  if (at3(k, 'directnotes/[^/]+/seen/[^/]+$')) {
    const by = kitchenReader(ref), parent = store[ref.path.slice(0, 4).join('/')];
    return !(chefReader(ref) || (by && parent && parent.to === by && store[k] && store[k].by === by));
  }
  if (/\/todos\/[^/]+$/.test(k)) return !chefReader(ref);
  // the nightly training numbers for Today's team (teamsum/main, 7 Nov 2026): chefs and the admin, never staff
  if (/\/teamsum\/[^/]+$/.test(k)) return !chefReader(ref);
  if (at3(k, '(suppliers|supplierlinks|cutdone)(/|$)')) return !chefReader(ref);
  if (at3(k, 'mail/[^/]+$')) return !mailReader(ref);
  return false;
}
export function getDoc(ref) {
  if (readRefused(ref)) return refuse('get', ref);
  window.__fake.reads.push(key(ref.path));
  if (spent(ref)) return SPENT();
  if (cold(ref)) return pendingKeys.has(key(ref.path)) ? delay(cacheSnap(ref)) : Promise.reject({ code: 'unavailable' });
  if (readFails(ref)) return Promise.reject({ code: 'unavailable' });
  bill('get', key(ref.path), 1); ruleBill('get', ref);
  return delay(result(ref));
}
// a query asks for a where on this field with this value
const asks = (ref, f, op, v) => (ref.c || []).some(x => x.k === 'where' && x.f === f && x.op === op && (v === undefined || x.v === v));
/* A query (or a listener on one) the real rules refuse this phone: book/index and book/matches are allowed by name only,
   so a query on the whole book collection is refused; the minutes are listed by pubAt (published only) except by the
   head chef's Google account (22 Oct 2026, S9); the lists only chefs or the Google account read; a personal ping asked for
   by someone who does not manage pings must ask for their own (to == them), and only a chef lists who has seen one. */
function rulesDenied(ref) {
  const k = key(ref.path);
  if (ref.group === 'cooling') return true;
  if (/^kitchens\/[^/]+\/(adminDevices|sessions)$/.test(k)) return true;
  if (ref.group && !isAdmin(ref)) return true;
  if (colRefused(ref, true)) return true;
  if (/^kitchens\/[^/]+\/todos$/.test(k) && !chefReader(ref)) return true;
  if (/^kitchens\/[^/]+\/minutes\/[^/]+\/signs$/.test(k) && !chefReader(ref)) return true;   // the register, chefs only
  if (at3(k, '(suppliers|supplierlinks|cutdone)(/|$)') && !chefReader(ref)) return true;
  if (/^kitchens\/[^/]+\/minutes$/.test(k) && !isAdmin(ref) && !(ref.c || []).some(x => x.k === 'where' && x.f === 'pubAt' && (x.op === '>=' || x.op === '>') && x.v >= 1)) return true;
  if (at3(k, 'mail$') && !mailReader(ref)) return true;
  if (at3(k, 'fncontact$') && !isAdmin(ref)) return true;   // listed only by the Google account (the backup)
  if (at3(k, 'functions/[^/]+/hist$') && !(chefReader(ref) || fnReader(ref))) return true;
  if (at3(k, 'directnotes$') && !chefReader(ref)) { const by = kitchenReader(ref); return !(by && asks(ref, 'to', '==', by)); }
  if (at3(k, 'directnotes/[^/]+/seen$') && !chefReader(ref)) {
    const by = kitchenReader(ref), parent = store[ref.path.slice(0, 4).join('/')];
    return !(by && parent && parent.to === by && asks(ref, 'by', '==', by));
  }
  return /^kitchens\/[^/]+\/book$/.test(k);
}
function denied(ref) { const d = window.__fake.denyReads; return !!(d && d.test(key(ref.path))); }
// __fake.exhausted = /regex/: reads of the paths that match are refused with resource-exhausted, like the free plan's
// 50,000 reads a day used up (5 Nov 2026). Refused reads are not billed.
function spent(ref) { const x = window.__fake.exhausted; return !!(x && x.test(key(ref.path))); }
const SPENT = () => Promise.reject({ code: 'resource-exhausted' });
export function getDocs(ref) { window.__fake.reads.push(key(ref.path)); if (cold(ref)) return delay(cacheSnap(ref)); if (spent(ref)) return SPENT(); if (readFails(ref)) return Promise.reject({ code: 'unavailable' }); if (rulesDenied(ref)) return refuse('query', ref); if (denied(ref)) return Promise.reject({ code: 'permission-denied' }); const r = result(ref); bill('query', key(ref.path), r.docs.length); ruleBill('query', ref); return delay(r); }
function readFails(ref) { const f = window.__fake.failReads; return !!(f && f.test(key(ref.path))); }
// a read that must come from the server: refused when there is no signal ('hold', 'fail'). __fake.server can hold a
// newer copy of a document than this phone has (say a line ticked on another phone), keyed by path.
export function getDocFromServer(ref) {
  const k = key(ref.path), sv = window.__fake.server;
  window.__fake.reads.push(k);
  // __fake.stall = /regex/: a read from the server that never answers, like a half-dropped connection
  if (window.__fake.stall && window.__fake.stall.test(k)) return new Promise(() => {});
  if (window.__fake.mode === 'hold' || window.__fake.mode === 'fail' || cold(ref) || readFails(ref)) return Promise.reject({ code: 'unavailable' });
  if (spent(ref)) return SPENT();
  if (readRefused(ref)) return refuse('server', ref);
  if (denied(ref)) return Promise.reject({ code: 'permission-denied' });
  bill('server', k, 1); ruleBill('server', ref);
  if (sv && k in sv) { const v = sv[k]; return delay({ id: ref.path[ref.path.length - 1], ref, exists: () => v != null, data: () => (v == null ? undefined : clone(v)) }); }
  return delay(result(ref));
}
// a query that must come from the server, like getDocFromServer: refused with no signal, and __fake.server's newer copies
// win. A query by document id ('in') answers from those ids, so a document only the server has is found too.
export function getDocsFromServer(ref) {
  const k = key(ref.path), sv = window.__fake.server || {};
  const byId = (ref.c || []).filter(x => x.k === 'where' && x.f === '__name__' && (x.op === 'in' || x.op === '=='))[0];
  // a query by id asks for those documents by name, so each one is listed in reads, like getDocFromServer
  if (byId) (byId.op === 'in' ? byId.v : [byId.v]).forEach(id => window.__fake.reads.push(k + '/' + id)); else window.__fake.reads.push(k);
  if (window.__fake.mode === 'hold' || window.__fake.mode === 'fail' || cold(ref) || readFails(ref)) return Promise.reject({ code: 'unavailable' });
  if (spent(ref)) return SPENT();
  if (rulesDenied(ref)) return refuse('server-query', ref);
  if (denied(ref)) return Promise.reject({ code: 'permission-denied' });
  let docs;
  if (byId) {
    const ids = byId.op === 'in' ? byId.v : [byId.v];
    docs = ids.map(id => { const p = ref.path.concat([id]), dk = key(p); if (dk in sv) { const v = sv[dk]; return { id, ref: { path: p, appName: appOf(ref) }, exists: () => v != null, data: () => (v == null ? undefined : clone(v)) }; } return result({ type: 'doc', path: p, appName: appOf(ref) }); }).filter(d => d.exists());
  } else docs = result(ref).docs;
  bill('query', k, docs.length); ruleBill('server-query', ref);
  return delay({ docs, empty: !docs.length, size: docs.length, forEach: f => docs.forEach(f) });
}
// a document from the offline copy: known (even known to be missing) once it was read, refused otherwise, like the SDK
export function getDocFromCache(ref) {
  const k = key(ref.path);
  if (!seen.has(cacheKey(k, appOf(ref)))) return Promise.reject({ code: 'unavailable' });
  return delay(snapDoc(ref.path, appOf(ref)));
}
export function getDocsFromCache(ref) {
  const r = listCol(ref.path, ref.c, ref.group, appOf(ref)), docs = r.docs.filter(d => seen.has(cacheKey(key(d.ref.path), appOf(ref))));
  return delay({ docs, empty: !docs.length, size: docs.length, forEach: f => docs.forEach(f) });
}
export function onSnapshot(ref, next, err) {
  if (next && typeof next === 'object') { next = err; err = arguments[3]; }   // onSnapshot(ref, options, next, error)
  if (spent(ref)) { let live = true; setTimeout(() => { if (live && err) err({ code: 'resource-exhausted' }); }, 5); return () => { live = false; }; }
  // a listener the rules refuse gets the refusal instead of its first answer, and nothing after (like the SDK). One
  // started with no signal (cold) answers from the copy in memory, as the SDK does, and is not refused here later
  if (!cold(ref) && (ref.type === 'doc' ? readRefused(ref) : rulesDenied(ref))) {
    let live = true;
    refuse('listen', ref).catch(e => setTimeout(() => { if (live && err) err(e); }, 5));
    return () => { live = false; };
  }
  const s = { ref, next, error: err, last: null, cold: cold(ref) };
  subs.add(s);
  setTimeout(() => { if (subs.has(s)) deliver(s); }, 5);
  return () => subs.delete(s);
}
// a listener pays for what it first sends, then only for documents that changed since its last snapshot; an answer
// from the empty copy in memory (cold) costs nothing
function deliver(s) {
  if (!s.cold && (s.ref.type === 'doc' ? readRefused(s.ref) : rulesDenied(s.ref))) {
    subs.delete(s); window.__fake.refused.push({ kind: 'listen', path: key(s.ref.path) });
    if (s.error) setTimeout(() => s.error({ code: 'permission-denied' }), 0);
    return;
  }
  if (s.cold) {
    const c = cacheSnap(s.ref), sg = sigOf(c.docs || [c], true);
    if (window.__fake.quiet && s.sig === sg) return;
    s.sig = sg; s.next(c); return;
  }
  const r = s.ref.type === 'doc' ? snapDoc(s.ref.path, appOf(s.ref)) : listCol(s.ref.path, s.ref.c, s.ref.group, appOf(s.ref)), docs = s.ref.type === 'doc' ? [r] : r.docs;
  const sg = sigOf(docs, cold(s.ref));
  if (window.__fake.quiet && s.sig === sg) return;
  s.sig = sg;
  const now = {}; docs.forEach(d => { now[key(d.ref.path)] = JSON.stringify(d.exists() ? d.data() : null); });
  if (!s.last) { bill('listen', key(s.ref.path), docs.length); ruleBill('listen', s.ref); }
  else { const ch = Object.keys(now).filter(k => s.last[k] !== now[k]).length; if (ch) window.__fake.bill.push({ kind: 'listen+', path: key(s.ref.path), n: ch }); }
  s.last = now;
  const out = result(s.ref);
  // started before the signal went: it keeps its documents, from the copy in memory
  if (cold(s.ref)) out.metadata = Object.assign({}, out.metadata, { fromCache: true });
  s.next(out);
}
function notify() { subs.forEach(s => { try { deliver(s); } catch (e) { console.error(e); } }); }
window.addEventListener('fake-auth-changed', notify);
function resolveVal(v, old, stamp = requestNow()) {
  if (v && typeof v === 'object' && v.__inc != null) return (typeof old === 'number' ? old : 0) + v.__inc;
  if (v instanceof Timestamp) return clone(v);
  if (v && typeof v === 'object' && v.__st) return Timestamp.fromMillis(stamp);
  if (v && typeof v === 'object' && !Array.isArray(v)) { const o = {}; Object.keys(v).forEach(k => { o[k] = resolveVal(v[k], old && old[k], stamp); }); return Object.assign({}, old && typeof old === 'object' && !Array.isArray(old) ? old : {}, o); }
  return v;
}
function applyOp(o, stamp) {
  const k = key(o.ref.path), old = store[k];
  if (o.kind === 'delete') { delete store[k]; return; }
  if (o.kind === 'update' && old === undefined) throw { code: 'not-found' };
  const base = o.kind === 'set' && !o.merge ? {} : (old || {});
  const out = Object.assign({}, base);
  Object.keys(o.data).forEach(f => { out[f] = resolveVal(o.data[f], base[f], stamp); });
  store[k] = out;
}
function finishOps(ops) {
  if (window.__fake.mode === 'deny' || window.__fake.deny && ops.some(o => window.__fake.deny.test(key(o.ref.path)))) return Promise.reject({ code: 'permission-denied' });
  if (window.__fake.mode === 'fail') return Promise.reject({ code: 'unavailable' });
  if (ops.length) ruleBill('write', ops[0].ref);   // one request, however many records it writes
  const stamp = requestNow(), run = () => { ops.forEach(o => applyOp(o, stamp)); save(); notify(); };
  if (window.__fake.mode === 'hold') {
    ops.forEach(o => pendingKeys.add(key(o.ref.path))); run();
    return new Promise(res => held.push(res));
  }
  run(); return delay(undefined);
}
const exactKeys = (value, names) => value && Object.keys(value).length === names.length && names.every(name => Object.hasOwn(value, name));
const freshStamp = value => !!(value && value.__st) || stampMillis(value) === requestNow();
const coolingOpening = stamp => Math.floor((stamp + 36000000) / 86400000) * 86400000;
const coolingOpen = stamp => stamp >= coolingOpening(stamp) && stamp < coolingOpening(stamp) + 39600000;
// Compare whole seconds at the exact opening boundary; converting toMillis can round the final nanosecond.
const coolingToday = (at, stamp) => at instanceof Timestamp && at.seconds >= coolingOpening(stamp) / 1000 && at.seconds < (coolingOpening(stamp) + 39600000) / 1000;
// Match coolingRecordedNext: each server-timed declaration is immutable and belongs to the current run.
function coolingRecordedRefused(o, stamp, by, old) {
  if (!by || o.kind === 'delete') return true;
  const base = o.kind === 'set' && !o.merge ? {} : old || {}, d = resolveVal(o.data, base, stamp);
  const timer = store[key(o.ref.path.slice(0, 2).concat(['cooling', 'current']))];
  const actor = value => typeof value === 'string' && value.length > 0 && value.length <= 80;
  const pair = (at, who) => at === 0 && who === '' || at instanceof Timestamp && actor(who);
  if (!exactKeys(d, ['v', 'run', 'firstAt', 'firstBy', 'secondAt', 'secondBy', 'by']) || d.v !== 1 ||
    typeof d.run !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(d.run) || d.by !== by ||
    !pair(d.firstAt, d.firstBy) || !pair(d.secondAt, d.secondBy) || !timer || !coolingToday(timer.firstAt, stamp) || d.run !== timer.run) return true;
  const prior = old && old.run === d.run ? old : { firstAt: 0, firstBy: '', secondAt: 0, secondBy: '' };
  const equal = (a, b) => a instanceof Timestamp ? a.isEqual(b) : a === b;
  const first = prior.firstAt === 0 && prior.firstBy === '' && stampMillis(d.firstAt) === stamp && d.firstBy === by &&
    equal(d.secondAt, prior.secondAt) && d.secondBy === prior.secondBy && timer.firstAt instanceof Timestamp && stamp >= stampMillis(timer.firstAt) + 7200000;
  const second = prior.secondAt === 0 && prior.secondBy === '' && stampMillis(d.secondAt) === stamp && d.secondBy === by &&
    equal(d.firstAt, prior.firstAt) && d.firstBy === prior.firstBy && timer.secondAt instanceof Timestamp && stamp >= stampMillis(timer.secondAt) + 14400000;
  return !(first || second);
}
// Match coolingOk/coolingNext: no role can choose a start time, skip a stage or overwrite a newer revision.
function coolingWriteRefused(o, stamp) {
  if (!coolingCollection(o.ref)) return false;
  if (!coolingOpen(stamp)) return true;
  const rel = o.ref.path.slice(2), by = kitchenReader(o.ref), old = store[key(o.ref.path)];
  if (rel.length === 2 && rel[1] === 'recorded') return coolingRecordedRefused(o, stamp, by, old);
  if (rel.length !== 2 || rel[1] !== 'current' || !by || o.kind === 'delete') return true;
  const base = o.kind === 'set' && !o.merge ? {} : old || {}, d = resolveVal(o.data, base, stamp);
  const hasWindow = Object.hasOwn(d, 'windowAt');
  if (!exactKeys(d, ['v', 'run', 'rev', 'firstAt', 'firstBy', 'secondAt', 'secondBy', 'by'].concat(hasWindow ? ['windowAt'] : [])) ||
    hasWindow && (!Number.isInteger(d.windowAt) || d.windowAt < 0 || d.windowAt % 86400000 !== 0) ||
    d.v !== 1 || typeof d.run !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(d.run) || !Number.isInteger(d.rev) || d.rev < 1 ||
    d.by !== by || !(d.firstAt instanceof Timestamp) || typeof d.firstBy !== 'string' || !d.firstBy.length || d.firstBy.length > 80 ||
    !(d.secondAt === 0 || d.secondAt instanceof Timestamp) || typeof d.secondBy !== 'string' || d.secondBy.length > 80) return true;
  const first = d.windowAt === coolingOpening(stamp) && stampMillis(d.firstAt) === stamp && d.firstBy === by && d.secondAt === 0 && d.secondBy === '';
  if (!old) return o.kind !== 'set' || d.rev !== 1 || !first;
  if (d.rev !== old.rev + 1) return true;
  const second = coolingToday(old.firstAt, stamp) && hasWindow === Object.hasOwn(old, 'windowAt') && d.windowAt === old.windowAt && d.run === old.run && d.firstAt.isEqual(old.firstAt) && d.firstBy === old.firstBy && old.secondAt === 0 && old.secondBy === '' &&
    stamp >= stampMillis(old.firstAt) + 7200000 && stampMillis(d.secondAt) === stamp && d.secondBy === by;
  const next = d.run !== old.run && old.firstAt instanceof Timestamp && old.firstAt.seconds < coolingOpening(stamp) / 1000 && first;
  return !(second || next);
}
function controlWrite(ops) {
  const first = ops[0] && ops[0].ref;
  if (!first) return null;
  const raw = rawOwner(first), root = rootOfRef(first), config = cfgOf(first), head = config.headId, uid = authUid(first);
  if (ops.every(o => /^kitchens\/[^/]+\/adminDevices\/[^/]+$/.test(key(o.ref.path)))) return ops.every(o => {
    const target = o.ref.path.at(-1);
    if (o.kind === 'delete') return raw || !!uid && uid === target;
    const d = o.data, ss = store[root + '/sessions/' + target];
    return raw && exactKeys(d, ['by', 'pinAt', 'issuedAt', 'exp', 'googleUid', 'at', 'v']) && validSession(ss, config, root) && ss.by === head &&
      d.by === head && d.pinAt === ss.pinAt && stampMillis(d.issuedAt) === stampMillis(ss.issuedAt) && d.exp === ss.exp && d.googleUid === uid && d.v === 2 && freshStamp(d.at);
  });
  if (ops.some(o => /\/adminDevices\//.test(key(o.ref.path)))) return false;
  if (!raw) return null;
  // A raw Google owner has no operational role. Initial head setup, a fresh destination bootstrap,
  // and the tightly bounded PIN recovery path are the only configuration/PIN exceptions.
  const cfg = ops.find(o => key(o.ref.path) === root + '/config/main'), roster = ops.find(o => key(o.ref.path) === root + '/login/roster');
  // Inspect the exact after-image applyOp will commit, including merge:true's nested map leaves.
  const cfgBase = cfg && cfg.kind === 'set' && !cfg.merge ? {} : config;
  const next = cfg && resolveVal(cfg.data, cfgBase), allowed = ['people', 'staffIds', 'sousIds', 'headId', 'pingIds', 'fnIds', 'fnOnlyIds', 'addIds', 'tickIds', 'delIds', 'pinOpen', 'updated', 'updatedBy', 'by'];
  const user = authUser(first), authTime = user && user.authTime * 1000;
  const freshOwner = Number.isFinite(authTime) && authTime <= requestNow() + 60000 && authTime >= requestNow() - 300000;
  const afterConfig = next || config, configMissing = store[root + '/config/main'] === undefined;
  const onlyKeys = (value, names) => value && Object.keys(value).every(name => names.includes(name));
  const boundedList = value => Array.isArray(value) && value.length <= 80;
  const field = (value, name, fallback) => Object.hasOwn(value, name) ? value[name] : fallback;
  const canonicalHead = value => boundedList(field(value, 'people', [])) && boundedList(field(value, 'staffIds', [])) && boundedList(field(value, 'sousIds', [])) &&
    typeof value.headId === 'string' && value.headId.length > 0 && value.headId.length <= 80 &&
    (value.staffIds || []).includes(value.headId) && (value.sousIds || []).includes(value.headId) &&
    Array.isArray(field(value, 'fnOnlyIds', [])) && !field(value, 'fnOnlyIds', []).includes(value.headId);
  const proofState = value => Array.isArray(field(value, 'proofWords', [])) && field(value, 'proofWords', []).length <= 200 &&
    Number.isInteger(field(value, 'proofV', 0)) && field(value, 'proofV', 0) >= 0 &&
    (field(value, 'proofEvent', '') === '' || typeof value.proofEvent === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value.proofEvent));
  const changed = next && [...new Set(Object.keys(config).concat(Object.keys(next)))].filter(k => JSON.stringify(config[k]) !== JSON.stringify(next[k]));
  const pinAfter = id => {
    const op = ops.find(o => key(o.ref.path) === root + '/staffpins/' + id);
    return op ? op.kind === 'delete' ? undefined : op.data : store[root + '/staffpins/' + id];
  };
  const setAfter = id => {
    const op = ops.find(o => key(o.ref.path) === root + '/pinset/' + id);
    return op ? op.kind === 'delete' ? undefined : op.data : store[root + '/pinset/' + id];
  };
  const setupOnly = ops.every(o => {
    const path = key(o.ref.path), data = o.data || {};
    if (o.kind === 'delete') return false;
    if (o === cfg) return proofState(next) && canonicalHead(next) && (configMissing ? freshOwner : !head &&
      changed.every(k => allowed.includes(k)) && field(next, 'pinOpen', {}) && typeof field(next, 'pinOpen', {}) === 'object' &&
      !Array.isArray(field(next, 'pinOpen', {})) && Object.keys(field(next, 'pinOpen', {})).length <= 80);
    if (o === roster) return ((!head && !configMissing) || freshOwner && (configMissing || store[path] === undefined)) &&
      !!afterConfig.headId && onlyKeys(data, ['people', 'staffIds', 'sousIds', 'headId', 'fnIds', 'fnOnlyIds', 'by']) &&
      ['people', 'staffIds', 'sousIds', 'headId', 'fnIds', 'fnOnlyIds'].every(name => JSON.stringify(data[name]) === JSON.stringify(afterConfig[name] || (name === 'headId' ? '' : [])));
    if (!freshOwner || o.ref.path.at(-1) !== afterConfig.headId || store[path] !== undefined) return false;
    if (path === root + '/staffpins/' + afterConfig.headId) return onlyKeys(data, ['hash', 'setAt', 'name']) &&
      typeof data.hash === 'string' && data.hash.length === 64 && typeof field(data, 'name', '') === 'string' && field(data, 'name', '').length <= 40 &&
      typeof field(data, 'setAt', 0) === 'number' && !!setAfter(afterConfig.headId) && typeof setAfter(afterConfig.headId).at === 'number';
    if (path === root + '/pinset/' + afterConfig.headId) return onlyKeys(data, ['at', 'name']) && typeof data.at === 'number' &&
      typeof field(data, 'name', '') === 'string' && field(data, 'name', '').length <= 40 && store[root + '/staffpins/' + afterConfig.headId] === undefined &&
      !!pinAfter(afterConfig.headId) && typeof pinAfter(afterConfig.headId).hash === 'string';
    return false;
  });
  if (setupOnly) return true;
  if (head && cfg && freshOwner && ops.every(o =>
    o === cfg || o.kind === 'delete' && [root + '/staffpins/' + head, root + '/pinset/' + head].includes(key(o.ref.path)))) {
    const changed = [...new Set(Object.keys(config).concat(Object.keys(next)))].filter(k => JSON.stringify(config[k]) !== JSON.stringify(next[k]));
    const until = next.pinOpen && next.pinOpen[head];
    const oldWindows = config.pinOpen || {}, windows = next.pinOpen;
    return changed.every(k => ['pinOpen', 'updated', 'updatedBy', 'by'].includes(k)) && windows && typeof windows === 'object' && !Array.isArray(windows) && Object.keys(windows).length <= 80 &&
      [...new Set(Object.keys(oldWindows).concat(Object.keys(windows)))].every(id => id === head || oldWindows[id] === windows[id]) &&
      Number.isFinite(until) && until > requestNow() && until <= requestNow() + 1800000;
  }
  return false;
}
function commitOps(ops) {
  window.__fake.writes.push(ops.map(o => ({ kind: o.kind, path: key(o.ref.path), data: o.data, app: appOf(o.ref) })));
  if (ops.some(o => appOf(o.ref) !== appOf(ops[0].ref))) return Promise.reject({ code: 'invalid-argument' });
  const stamp = requestNow();
  if (ops.some(o => coolingWriteRefused(o, stamp))) return Promise.reject({ code: 'permission-denied' });
  const admin = !!(ops.length && isAdmin(ops[0].ref)), control = controlWrite(ops);
  if (control !== null) return control ? finishOps(ops) : Promise.reject({ code: 'permission-denied' });
  // the older PIN proof was switched off in phase 2 of PIN sessions (22 Oct 2026): the rules refuse any proofs write
  if (ops.some(o => /\/proofs\//.test(key(o.ref.path)))) return Promise.reject({ code: 'permission-denied' });
  // two of the real rules that order of writes depends on: a staff PIN hash is only created once its pinset record
  // exists (already stored or in the same batch), and a learnlog day is create only
  const has = p => store[p] !== undefined || ops.some(o => key(o.ref.path) === p && o.kind === 'set');
  const refused = ops.some(o => {
    const k = key(o.ref.path), m = k.match(/^(.*)\/staffpins\/([^/]+)$/);
    if (m && o.kind === 'set' && store[k] === undefined && !has(m[1] + '/pinset/' + m[2])) return true;
    return /\/learnlog\/[^/]+$/.test(k) && store[k] !== undefined;
  });
  if (refused) return Promise.reject({ code: 'permission-denied' });
  // PIN sessions (22 Oct 2026), like the real rules: a try is written as this phone, one per person every 20 s; a session
  // opens only after a right try from this phone in the last 2 minutes, or moves forward while it runs
  const uid = ops.length ? authUid(ops[0].ref) : '', rootOf = o => key(o.ref.path).split('/').slice(0, 2).join('/');
  const badSess = ops.some(o => {
    const k = key(o.ref.path), t = k.match(/\/tries\/([^/]+)$/), m = k.match(/\/sessions\/([^/]+)$/);
    if (t) { const old = store[k]; return !uid || o.data.uid !== uid || (old && Date.now() - old.at < 20000); }
    if (!m) return false;
    if (m[1] !== uid) return true;
    if (o.kind === 'delete') return false;
    const d = o.data, r = rootOf(o), tr = store[r + '/tries/' + d.by], pin = store[r + '/staffpins/' + d.by], ps = store[r + '/pinset/' + d.by], old = store[k];
    const stamp = requestNow(), issued = d.issuedAt && d.issuedAt.__st ? stamp : stampMillis(d.issuedAt), at = d.at && d.at.__st ? stamp : stampMillis(d.at);
    const fresh = !!tr && tr.uid === uid && stamp - tr.at >= 0 && stamp - tr.at < 120000 && Number(tr.at) >= nextFour(stamp) - 86400000 && !!pin && pin.hash === tr.tok && issued === stamp;
    const renew = validSession(old, store[r + '/config/main'] || {}, r) && old.by === d.by && old.pinAt === d.pinAt && stampMillis(old.issuedAt) === issued && old.mode === d.mode && old.exp === d.exp;
    return !exactKeys(d, ['by', 'pinAt', 'exp', 'at', 'issuedAt', 'mode', 'v']) || d.v !== 2 || !['personal', 'shared'].includes(d.mode) ||
      !ps || ps.at !== d.pinAt || !(fresh || renew) || !(Number.isFinite(issued) && issued <= stamp && at === stamp && d.exp === nextFour(issued) && d.exp > stamp);
  });
  if (badSess) return Promise.reject({ code: 'permission-denied' });
  // who is writing: this phone's running session, while that person's PIN is the one it was opened with (Reset PIN or a
  // new PIN stops it)
  const kitchenOp = ops.find(o => key(o.ref.path).startsWith('kitchens/')) || ops[0];
  const sessNow = uid && kitchenOp ? store[rootOf(kitchenOp) + '/sessions/' + uid] : null;
  const sessPin = sessNow ? store[rootOf(kitchenOp) + '/pinset/' + sessNow.by] : null;
  const actor = sessNow && kitchenOp && authUser(kitchenOp.ref) && authUser(kitchenOp.ref).isAnonymous && validSession(sessNow, cfgOf(kitchenOp.ref), rootOf(kitchenOp)) && sessPin && sessPin.at === sessNow.pinAt ? sessNow.by : '';
  // like staff() in the rules: any other write from a phone (no Google account) names its writer (by), and that writer
  // has this phone's running session
  const free = /\/(staffpins|pinset|tries|sessions|proofs)\/[^/]+$/;
  if (!admin && ops.some(o => o.kind !== 'delete' && !coolingCollection(o.ref) && !free.test(key(o.ref.path)) && !(o.data && o.data.by && o.data.by === actor))) return Promise.reject({ code: 'permission-denied' });
  // the rules see a record as it will be after the write (request.resource.data): a merge or an update keeps the fields
  // already stored, by among them (27 Oct 2026: a merge with no by kept a sous chef's id and the rules refused the head chef)
  const after = o => Object.assign({}, o.kind === 'set' && !o.merge ? {} : (store[key(o.ref.path)] || {}), o.data || {});
  // Match the canonical capability rule boundary. Fixture flags and UI visibility never grant a write.
  const equalField = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const fieldsChanged = (a, b) => [...new Set(Object.keys(a || {}).concat(Object.keys(b || {})))].filter(k => !equalField((a || {})[k], (b || {})[k]));
  const hasCap = (c, cap) => !!actor && !(c.fnOnlyIds || []).includes(actor) && (actor === c.headId || Array.isArray(c[cap + 'Ids']) && c[cap + 'Ids'].includes(actor));
  const chef = c => !!actor && !(c.fnOnlyIds || []).includes(actor) && (actor === c.headId || (c.sousIds || []).includes(actor));
  const ownUndo = (old, next, changes, c) => hasCap(c, 'add') && old.addedById === actor && Number.isFinite(old.addedAt) && old.addedAt <= requestNow() && requestNow() - old.addedAt < 120000 &&
    old.done !== true && old.ordered !== true && old.deleted !== true && next.deleted === true && changes.every(k => ['deleted', 'deletedBy', 'deletedAt', 'by'].includes(k));
  const fnLine = (op, old, next, changes, c) => {
    if (!actor || !((c.fnIds || []).includes(actor) || chef(c)) || !next.fn || !op.ref.path.at(-1).startsWith('fn-' + next.fn) || old && old.fn !== next.fn) return false;
    const path = rootOf(op) + '/functions/' + next.fn, fn = ops.find(x => key(x.ref.path) === path);
    const booking = fn && after(fn), previous = store[path];
    if (!booking || booking.by !== actor || booking.v !== (previous ? previous.v + 1 : 1)) return false;
    if ((c.fnIds || []).includes(actor)) return changes.every(k => ['text', 'qty', 'station', 'recipe', 'recipes', 'fn', 'dupOk', 'deleted', 'deletedBy', 'deletedAt', 'addedBy', 'addedById', 'addedAt', 'by'].includes(k));
    if (!previous || previous.status === booking.status || !previous.effects) return false;
    const parts = op.ref.path, day = parts[3], id = parts.at(-1), prep = parts[2] === 'days', effects = previous.effects;
    const bodySame = body => body && Object.keys(body).every(k => equalField(next[k], body[k]));
    const cancelled = booking.status === 'cancelled', today = new Date(requestNow() + 36000000).toISOString().slice(0, 10), suffix = day.replace(/-/g, '');
    const od = cancelled ? previous.od : booking.od, base = 'fn-' + next.fn;
    const cancelledDay = new Date((previous.canAt || 0) + 36000000).toISOString().slice(0, 10);
    const validBody = prep ? day === previous.date && bodySame(effects.prep[id]) && next.deleted === cancelled : !!od && (
      day === od && id === base && day >= today && next.deleted === cancelled && bodySame(effects.order) ||
      previous.date >= day && (
        id === base + '-x' + suffix && (cancelled ? od < day && day === today && next.deleted === false && bodySame(effects.cancel) : od <= day && od < today && day === cancelledDay && next.deleted === true && bodySame(effects.restore)) ||
        !cancelled && od < day && day === today && id === base + '-r' + suffix && next.deleted === false && bodySame(effects.restore)));
    const bodyFields = prep ? ['text', 'qty', 'station', 'recipe', 'fn', 'dupOk'] : ['text', 'qty', 'recipes', 'fn', 'dupOk'];
    return validBody && (next.deleted === true ? next.deletedAt === booking.upd && changes.every(k => [...bodyFields, 'deleted', 'deletedBy', 'deletedAt', 'by'].includes(k)) :
      next.addedById === actor && next.addedAt === booking.upd && changes.every(k => [...bodyFields, 'deleted', 'addedBy', 'addedById', 'addedAt', 'by'].includes(k)));
  };
  const capabilityRefused = ops.some(o => {
    const path = key(o.ref.path), old = store[path], next = o.kind === 'delete' ? null : after(o), c = cfgOf(o.ref), changes = fieldsChanged(old, next);
    if (/\/config\/main$/.test(path) && next) {
      const names = ['addIds', 'tickIds', 'delIds'];
      if (admin) return names.some(k => next[k] !== undefined && (!Array.isArray(next[k]) || next[k].length > 80)) || names.some(k => old && old[k] !== undefined) && names.some(k => next[k] === undefined);
      return names.some(k => changes.includes(k)) || changes.includes('prepStandardsEnabled');
    }
    if (admin) return false;
    const line = path.match(/^kitchens\/[^/]+\/(days|orders)\/[^/]+\/(items|lines)\/[^/]+$/);
    if (line) {
      if (!next) return true;
      if (fnLine(o, old, next, changes, c)) return false;
      if (!old) return !hasCap(c, 'add') || next.done === true || next.ordered === true || next.deleted === true || !Number.isFinite(next.addedAt || 0) || (next.addedAt || 0) > requestNow() + 60000;
      if (changes.some(k => ['addedById', 'addedBy', 'addedAt'].includes(k))) return true;
      const prep = line[1] === 'days', ticks = prep ? ['done', 'doneAt', 'doneBy', 'doneById', 'preparedBy', 'preparedById', 'preparedAt'] : ['ordered', 'orderedAt', 'orderedBy'];
      const removals = prep ? ['deleted', 'deletedBy', 'deletedAt', 'mergedInto'] : ['deleted', 'deletedBy', 'deletedAt'];
      return changes.some(k => ticks.includes(k)) && !(prep ? hasCap(c, 'tick') : chef(c)) ||
        changes.some(k => removals.includes(k)) && !(hasCap(c, 'del') && (prep || chef(c))) && !ownUndo(old, next, changes, c) ||
        changes.some(k => !['by', ...ticks, ...removals].includes(k)) && !hasCap(c, 'add');
    }
    if (/\/waste\/[^/]+\/lines\/[^/]+$/.test(path) && !old) return !hasCap(c, 'add');
    if (/\/transfers\/[^/]+\/lines\/[^/]+$/.test(path)) return !old ? !hasCap(c, 'add') : changes.some(k => ['returned', 'returnedBy', 'returnedById', 'returnedAt'].includes(k)) && !hasCap(c, 'tick');
    return false;
  });
  if (capabilityRefused) return Promise.reject({ code: 'permission-denied' });

  // Section standards use the same strict shape and revision contract as the real rules, including for the owner.
  // A head session may edit; the sous panel's visibility does not grant that authority.
  const badPrepStandard = ops.some(o => {
    const path = key(o.ref.path);
    if (!/^kitchens\/[^/]+\/prepStandards\/[^/]+$/.test(path)) return false;
    if (o.kind === 'delete') return true;
    const old = store[path], next = after(o), config = cfgOf(o.ref), by = kitchenReader(o.ref);
    const id = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
    const text = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max && /\S/.test(value);
    return !by || !(isAdmin(o.ref) || by === config.headId) || next.by !== by ||
      !id(o.ref.path.at(-1)) || !exactKeys(next, ['sectionId', 'name', 'aliases', 'minimum', 'unit', 'instruction', 'recipe', 'archived', 'v', 'at', 'by']) ||
      !id(next.sectionId) || !text(next.name, 160) || !Array.isArray(next.aliases) || next.aliases.length > 12 || next.aliases.some(value => !text(value, 160)) ||
      !(next.minimum === null || Number.isFinite(next.minimum) && next.minimum >= 0 && next.minimum <= 1000000) ||
      !text(next.unit, 40) || typeof next.instruction !== 'string' || next.instruction.length > 500 ||
      typeof next.recipe !== 'string' || !(next.recipe === '' || /^[a-zA-Z0-9_-]{1,160}$/.test(next.recipe)) ||
      typeof next.archived !== 'boolean' || !Number.isInteger(next.v) || next.v <= 0 || next.v !== (old ? old.v + 1 : 1) ||
      !!old && next.sectionId !== old.sectionId || !Number.isFinite(next.at) || next.at < 0 || next.at > requestNow() + 300000;
  });
  if (badPrepStandard) return Promise.reject({ code: 'permission-denied' });

  // Shared prep attributes reported work separately from the PIN-session recorder. Match the prep-only rules;
  // preparedAt ties the report to this tick so an old client's retained fields never credit its later re-tick.
  const preparedValue = (d, field) => d && d[field] !== undefined ? d[field] : field === 'preparedAt' ? 0 : '';
  const preparedEmpty = d => preparedValue(d, 'preparedBy') === '' && preparedValue(d, 'preparedById') === '' && preparedValue(d, 'preparedAt') === 0;
  const preparedSame = (a, b) => ['preparedBy', 'preparedById', 'preparedAt'].every(field => preparedValue(a, field) === preparedValue(b, field));
  const badPrepared = !admin && ops.some(o => {
    if (o.kind === 'delete' || !/^kitchens\/[^/]+\/days\/[^/]+\/items\/[^/]+$/.test(key(o.ref.path))) return false;
    const old = store[key(o.ref.path)], next = after(o), config = store[rootOf(o) + '/config/main'] || {};
    const same = preparedSame(next, old), inert = !!old && same && preparedValue(next, 'preparedAt') !== (next.doneAt || 0);
    if (next.done !== true) return !(preparedEmpty(next) || inert);
    if (old && old.done === true) return !same || (next.doneBy || '') !== (old.doneBy || '') || (next.doneById || '') !== (old.doneById || '');
    const worker = typeof next.preparedBy === 'string' && next.preparedBy.length > 0 && next.preparedBy.length <= 80 && /[^ ]/.test(next.preparedBy) &&
      typeof next.preparedById === 'string' && next.preparedById.length > 0 && next.preparedById.length <= 80 &&
      (config.staffIds || []).includes(next.preparedById) && !(config.fnOnlyIds || []).includes(next.preparedById) &&
      typeof next.preparedAt === 'number' && next.preparedAt > 0 && next.preparedAt === next.doneAt;
    return !(preparedEmpty(next) || worker || inert);
  });
  if (badPrepared) return Promise.reject({ code: 'permission-denied' });
  // Cleaning uses immutable schedule revisions and versioned ticks. Mirror the real rules, including the
  // atomic successor link, daily scope, canonical Tick capability and shared-device reported worker.
  const cleanOps = ops.filter(o => /^kitchens\/[^/]+\/(cleaningTasks|cleaningDone|cleaningActions)\/[^/]+$/.test(key(o.ref.path)));
  if (cleanOps.length) {
    const openUntil = 253402178400000, today = requestNow() - (requestNow() + 36000000) % 86400000;
    const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
    const bounded = (value, size) => typeof value === 'string' && value.length <= size;
    const name = value => bounded(value, 80) && value.length > 0 && /[^ ]/.test(value);
    const midnight = value => Number.isInteger(value) && value >= 0 && (value + 36000000) % 86400000 === 0;
    const recent = value => Number.isFinite(value) && value >= requestNow() - 60000 && value <= requestNow() + 60000;
    const sameData = (a, b) => a === b || !!a && !!b && typeof a === 'object' && typeof b === 'object' &&
      Array.isArray(a) === Array.isArray(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => Object.hasOwn(b, k) && sameData(a[k], b[k]));
    const dayStart = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(value + 'T00:00:00Z') - 36000000 : NaN;
    const pathAfter = path => {
      const op = ops.find(value => key(value.ref.path) === path);
      return op ? op.kind === 'delete' ? null : after(op) : store[path];
    };
    const planKeys = ['template', 'method', 'responsibility', 'checks', 'timing', 'verification', 'verifiers', 'review'];
    const planShape = p => (exactKeys(p, planKeys) || exactKeys(p, planKeys.concat('repeat'))) &&
      bounded(p.template, 40) && (!p.template || /^[a-zA-Z0-9_-]+$/.test(p.template)) && bounded(p.method, 1000) && bounded(p.responsibility, 120) && bounded(p.review, 500) &&
      ['daily', 'service', 'prep-service', 'food', 'use', 'close'].includes(p.timing) && typeof p.verification === 'boolean' &&
      Array.isArray(p.checks) && p.checks.length <= 12 && new Set(p.checks).size === p.checks.length && p.checks.every(s => typeof s === 'string' && /^.{0,159}[^ ]$/.test(s)) &&
      Array.isArray(p.verifiers) && p.verifiers.length <= 30 && new Set(p.verifiers).size === p.verifiers.length && p.verifiers.every(identifier) &&
      (!Object.hasOwn(p, 'repeat') || exactKeys(p.repeat, ['days', 'anchor']) && Number.isInteger(p.repeat.days) && p.repeat.days >= 2 && p.repeat.days <= 30 &&
        (p.repeat.anchor === '' || Number.isFinite(dayStart(p.repeat.anchor)) && new Date(dayStart(p.repeat.anchor) + 36000000).toISOString().slice(0, 10) === p.repeat.anchor));
    const intervalDue = task => !task.plan || !task.plan.repeat || !!task.plan.repeat.anchor && today >= dayStart(task.plan.repeat.anchor) &&
      ((today - dayStart(task.plan.repeat.anchor)) / 86400000) % task.plan.repeat.days === 0;
    const taskKeys = ['root', 'prev', 'next', 'text', 'area', 'section', 'sectionName', 'shared', 'dows', 'guide', 'from', 'until', 'at', 'by'];
    const taskShape = d => (exactKeys(d, taskKeys) || exactKeys(d, taskKeys.concat('plan'))) && (!Object.hasOwn(d, 'plan') || planShape(d.plan)) &&
      identifier(d.root) && (d.prev === '' || identifier(d.prev)) && (d.next === '' || identifier(d.next)) &&
      bounded(d.text, 160) && d.text.length > 0 && /[^ ]/.test(d.text) && name(d.area) &&
      bounded(d.section, 80) && bounded(d.sectionName, 80) && typeof d.shared === 'boolean' && bounded(d.guide, 80) &&
      Array.isArray(d.dows) && d.dows.length > 0 && d.dows.length <= 7 && new Set(d.dows).size === d.dows.length &&
      d.dows.every(value => Number.isInteger(value) && value >= 0 && value <= 6) &&
      midnight(d.from) && midnight(d.until) && d.until >= d.from && Number.isFinite(d.at);
    const invalid = cleanOps.some(o => {
      const path = key(o.ref.path), old = store[path], d = after(o), c = cfgOf(o.ref), id = o.ref.path.at(-1);
      const root = rootOf(o), taskPath = tid => root + '/cleaningTasks/' + tid;
      if (o.kind === 'delete' || !actor || d.by !== actor || (c.fnOnlyIds || []).includes(actor) || !cleaningReader(o.ref)) return true;
      if (o.ref.path[2] === 'cleaningActions') {
        const prior = store[root + '/cleaningDone/' + d.occurrence], next = pathAfter(root + '/cleaningDone/' + d.occurrence);
        return !!old || !hasCap(c, 'tick') || !exactKeys(d, ['day', 'task', 'occurrence', 'version', 'action', 'at', 'by', 'snapshot']) ||
          dayStart(d.day) !== today || !freshStamp(d.at) || !Number.isInteger(d.version) || d.version < 1 || id !== d.occurrence + '_v' + d.version ||
          !next || !d.snapshot.flow || !sameData(d.snapshot, next) || d.snapshot.day !== d.day || d.snapshot.task !== d.task || d.snapshot.by !== d.by || d.snapshot.version !== d.version ||
          (prior ? prior.version !== d.version - 1 : d.version !== 1);
      }
      if (o.ref.path[2] === 'cleaningTasks') {
        if (!chef(c) || !old && (!identifier(id) || !taskShape(d))) return true;
        if (!old) {
          if (d.plan && d.plan.verifiers.some(person => !(c.staffIds || []).includes(person) || (c.fnOnlyIds || []).includes(person))) return true;
          if (d.next !== '' || d.until !== openUntil || !recent(d.at)) return true;
          if (d.prev === '') return d.root !== id || d.from !== today;
          const prev = store[taskPath(d.prev)], closed = pathAfter(taskPath(d.prev));
          return d.prev === id || !prev || prev.root !== d.root || prev.until !== openUntil || prev.from > d.from ||
            d.from !== today + 86400000 || !closed || closed.until !== d.from || closed.next !== id;
        }
        if (old.until !== openUntil || d.until !== today + 86400000 || d.until < d.from ||
          fieldsChanged(old, d).some(field => !['until', 'by', 'next'].includes(field))) return true;
        if (d.next === '') return false;
        if (!identifier(d.next)) return true;
        const next = pathAfter(taskPath(d.next));
        return d.next === id || !!store[taskPath(d.next)] || !next || next.prev !== id || next.root !== d.root || next.from !== d.until;
      }
      if (d.flow) {
        const task = store[taskPath(d.task)], p = task && task.plan, f = d.flow, previous = old && old.flow, stampKeys = ['doneAt', 'doneById', 'doneBy', 'workerId', 'worker'];
        const event = pathAfter(root + '/cleaningActions/' + id + '_v' + d.version), weekday = ((today + 36000000) / 86400000 + 4) % 7;
        if (!hasCap(c, 'tick') || !p || !exactKeys(d, ['day', 'task', 'version', 'done', 'doneAt', 'doneById', 'doneBy', 'workerId', 'worker', 'by', 'flow']) ||
          dayStart(d.day) !== today || !identifier(d.task) || !Number.isInteger(d.version) || d.version < 1 ||
          task.from > today || task.until <= today || !task.dows.includes(weekday) || !intervalDue(task) || typeof d.done !== 'boolean' || !Number.isFinite(d.doneAt) ||
          !stampKeys.slice(1).every(field => bounded(d[field], 80)) || !exactKeys(f, ['slot', 'kind', 'status', 'checked', 'note', 'verifiedBy', 'verifiedAt']) ||
          !identifier(f.slot) || id !== d.day + '_' + d.task + '__' + f.slot || !['pending', 'blocked', 'awaiting', 'complete'].includes(f.status) ||
          d.done !== (f.status === 'complete') || !Array.isArray(f.checked) || f.checked.length > 12 || new Set(f.checked).size !== f.checked.length ||
          f.checked.some(s => !p.checks.includes(s)) || !bounded(f.note, 500) || !bounded(f.verifiedBy, 80) || !Number.isFinite(f.verifiedAt)) return true;
        const slotOK = f.kind === 'daily' ? p.timing === 'daily' && f.slot === 'daily' : f.kind === 'start' ? p.timing === 'food' && f.slot === 'start'
          : f.kind === 'close' ? ['food', 'close'].includes(p.timing) && f.slot === 'close' : f.kind === 'service' ? ['service', 'prep-service'].includes(p.timing) && /^service-[a-zA-Z0-9_-]+$/.test(f.slot)
          : f.kind === 'prep' ? ['prep-service', 'food'].includes(p.timing) && /^prep-[a-zA-Z0-9_-]+$/.test(f.slot) : f.kind === 'use' && p.timing === 'use' && /^use-[a-zA-Z0-9_-]+$/.test(f.slot);
        if (!slotOK || (old ? !previous || d.task !== old.task || d.day !== old.day || f.slot !== previous.slot || f.kind !== previous.kind || d.version !== old.version + 1 : d.version !== 1) ||
          !event || !sameData(event.snapshot, d) || event.occurrence !== id || event.by !== d.by || !freshStamp(event.at)) return true;
        const empty = d.doneAt === 0 && stampKeys.slice(1).every(field => d[field] === ''), blank = f.verifiedBy === '' && f.verifiedAt === 0;
        const notPerformed = !old || ['pending', 'blocked'].includes(previous.status), same = old && stampKeys.every(field => d[field] === old[field]);
        if (['save', 'block'].includes(event.action)) return !notPerformed || !empty || !blank || f.status !== (event.action === 'block' ? 'blocked' : 'pending') || event.action === 'block' && !f.note.trim();
        if (event.action === 'perform') return !notPerformed || f.checked.length !== p.checks.length || f.status !== (p.verification ? 'awaiting' : 'complete') || !blank ||
          !recent(d.doneAt) || d.doneById !== d.by || !name(d.doneBy) || !name(d.worker) || !(c.staffIds || []).includes(d.workerId) ||
          (c.fnOnlyIds || []).includes(d.workerId) || sessNow.mode !== 'shared' && d.workerId !== d.by;
        if (event.action === 'verify') return !old || previous.status !== 'awaiting' || !p.verification || !p.verifiers.includes(d.by) || f.status !== 'complete' ||
          JSON.stringify(f.checked) !== JSON.stringify(previous.checked) || f.note !== previous.note || !same || f.verifiedBy !== d.by || !recent(f.verifiedAt);
        return event.action !== 'reopen' || !old || !['awaiting', 'complete'].includes(previous.status) || f.status !== 'pending' || !f.note.trim() || f.checked.length !== 0 || !empty || !blank ||
          !(chef(c) || old.doneById === d.by && requestNow() >= old.doneAt && requestNow() - old.doneAt < 120000);
      }
      if (!hasCap(c, 'tick') || !exactKeys(d, ['day', 'task', 'version', 'done', 'doneAt', 'doneById', 'doneBy', 'workerId', 'worker', 'by']) ||
        dayStart(d.day) !== today || !identifier(d.task) || id !== d.day + '_' + d.task || !Number.isInteger(d.version) || d.version < 1 ||
        typeof d.done !== 'boolean' || !Number.isFinite(d.doneAt) || d.doneAt <= 0 || !identifier(d.doneById) || !name(d.doneBy) ||
        !identifier(d.workerId) || !name(d.worker)) return true;
      const task = store[taskPath(d.task)], weekday = ((today + 36000000) / 86400000 + 4) % 7;
      if (!task || task.plan || task.from > today || task.until <= today || !task.dows.includes(weekday) || !intervalDue(task)) return true;
      const tick = () => d.done && recent(d.doneAt) && d.doneById === d.by && (c.staffIds || []).includes(d.workerId) &&
        !(c.fnOnlyIds || []).includes(d.workerId) && (sessNow.mode === 'shared' || d.workerId === d.by);
      if (!old) return d.version !== 1 || !tick();
      const changed = fieldsChanged(old, d);
      if (!changed.length) return false;
      if (d.task !== old.task || d.day !== old.day || d.version !== old.version + 1 || d.done === old.done) return true;
      return d.done ? !tick() : old.doneById !== d.by || requestNow() - old.doneAt >= 120000 || changed.some(field => !['done', 'version', 'by'].includes(field));
    });
    if (invalid) return Promise.reject({ code: 'permission-denied' });
  }
  // Manual proofreader repairs (2026-11): private immutable events accompany changes to existing source wording
  // or protected words. Copied new records may retain proof fields before their history copies arrive.
  const sameProof = (a, b) => a === b || !!a && !!b && typeof a === 'object' && typeof b === 'object' &&
    Array.isArray(a) === Array.isArray(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(name => Object.prototype.hasOwnProperty.call(b, name) && sameProof(a[name], b[name]));
  const proofFieldsOnly = (a, b, names) => [...new Set(Object.keys(a).concat(Object.keys(b)))].every(name => sameProof(a[name], b[name]) || names.includes(name));
  const proofId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
  const proofVersion = value => Number.isInteger(value) && value > 0;
  const proofEvents = ops.filter(o => /^kitchens\/[^/]+\/proofHistory\/[^/]+$/.test(key(o.ref.path)));
  const validProofEvent = o => {
    const event = after(o), word = event.kind === 'word', names = word ? ['kind', 'action', 'word', 'v', 'at', 'by'] : ['kind', 'action', 'source', 'day', 'recordId', 'before', 'after', 'original', 'v', 'at', 'by'];
    if (o.kind === 'delete' || !admin) return false;
    if (store[key(o.ref.path)] !== undefined) return sameProof(event, store[key(o.ref.path)]);
    if (!proofId(o.ref.path.at(-1)) ||
      !proofVersion(event.v) || !Number.isFinite(event.at) || event.at < 0 || event.at > Date.now() + 300000 || typeof event.by !== 'string' ||
      Object.keys(event).some(name => !names.includes(name)) || names.some(name => event[name] === undefined)) return false;
    if (word) return ['keep', 'release'].includes(event.action) && typeof event.word === 'string' && /^[a-z]{2,40}$/.test(event.word);
    const limit = event.source === 'prep' ? 160 : 120;
    return event.kind === 'line' && ['restore', 'edit'].includes(event.action) && ['prep', 'orders'].includes(event.source) &&
      /^\d{4}-\d{2}-\d{2}$/.test(event.day) && proofId(event.recordId) && ['before', 'after', 'original'].every(name => typeof event[name] === 'string') &&
      event.after.trim().length > 0 && event.after.length <= limit && event.after !== event.before && (event.action !== 'restore' || event.after === event.original);
  };
  const freshProofEvent = (o, eventId) => proofEvents.find(event => store[key(event.ref.path)] === undefined && rootOf(event) === rootOf(o) && event.ref.path.at(-1) === eventId && validProofEvent(event));
  const badProof = proofEvents.some(o => !validProofEvent(o)) || ops.some(o => {
    const path = key(o.ref.path), old = store[path], next = after(o);
    if (/\/config\/main$/.test(path)) {
      const changed = ['proofWords', 'proofV', 'proofEvent'].some(name => !sameProof((old || {})[name], next[name]));
      if (!changed) return false;
      if (!admin || !Array.isArray(next.proofWords) || next.proofWords.length > 200 || new Set(next.proofWords).size !== next.proofWords.length ||
        next.proofWords.some(word => typeof word !== 'string' || !/^[a-z]{2,40}$/.test(word)) || !proofVersion(next.proofV) || !proofId(next.proofEvent)) return true;
      if (!old) return false;
      const op = freshProofEvent(o, next.proofEvent), event = op && after(op), words = old.proofWords || [];
      return !event || event.kind !== 'word' || event.v !== next.proofV || next.proofV !== (old.proofV || 0) + 1 ||
        (event.action === 'keep' ? words.includes(event.word) || !sameProof(next.proofWords, words.concat([event.word])) : !words.includes(event.word) || !sameProof(next.proofWords, words.filter(word => word !== event.word)));
    }
    const match = path.match(/^kitchens\/[^/]+\/(days|orders)\/(\d{4}-\d{2}-\d{2})\/(items|lines)\/([^/]+)$/);
    if (!match) return false;
    const changed = ['proofV', 'proofEvent'].some(name => !sameProof((old || {})[name], next[name]));
    if (!changed) return !!old && old.proofV > 0 && (!sameProof(old.text, next.text) || !sameProof(old.orig, next.orig));
    if (!admin || !proofVersion(next.proofV) || !proofId(next.proofEvent)) return true;
    if (!old) return false;
    const op = freshProofEvent(o, next.proofEvent), event = op && after(op), source = match[1] === 'days' ? 'prep' : 'orders';
    return !event || event.kind !== 'line' || event.source !== source || event.day !== match[2] || event.recordId !== match[4] ||
      event.v !== next.proofV || next.proofV !== (old.proofV || 0) + 1 || event.before !== old.text || event.after !== next.text || event.original !== old.orig ||
      old.deleted === true || !!old.fn || !proofFieldsOnly(old, next, ['text', 'recipe', 'recipes', 'proofV', 'proofEvent', 'by']);
  });
  if (badProof) return Promise.reject({ code: 'permission-denied' });
  // the head chef's book (book/index, recipes, drawings and the library): only the head chef and the sous chefs write
  // it, with the Google account (nobody else signed in) or with their own PIN (headId, sousIds), like the real rules
  const book = ops.filter(o => /^kitchens\/[^/]+\/(book|recipes|drawings|drawtpl|drawlib)\//.test(key(o.ref.path)));
  if (book.length) {
    const head = (store[key(book[0].ref.path).split('/').slice(0, 2).join('/') + '/config/main'] || {}).headId || '';
    const by = book.map(o => (o.kind === 'delete' ? '' : after(o).by) || '');
    const config = store[key(book[0].ref.path).split('/').slice(0, 2).join('/') + '/config/main'] || {};
    const asHead = !!actor && (actor === head || (config.sousIds || []).includes(actor)) && by.every(b => b === actor);
    const asOwner = !!admin && by.every(b => !b || b === head);
    if (!asHead && !asOwner) return Promise.reject({ code: 'permission-denied' });
  }
  // functions (21 Oct 2026): only the Google account or someone in config/main fnIds writes them, each save the next
  // version (so a double tap or a save from an old copy is refused), and a confirmed line's rounds add up, like the rules
  const fnOps = ops.filter(o => /^kitchens\/[^/]+\/(functions|fncontact)\//.test(key(o.ref.path)));
  if (fnOps.length) {
    const c = store[key(fnOps[0].ref.path).split('/').slice(0, 2).join('/') + '/config/main'] || {};
    const pid = actor;
    const asFn = !!pid && (c.fnIds || []).indexOf(pid) >= 0 && fnOps.every(o => (o.data && o.data.by) === pid);
    if (!asFn && !admin) {
      const asChef = !!pid && ((c.sousIds || []).includes(pid) || c.headId === pid);
      const main = fnOps.filter(o => /\/functions\/[^/]+$/.test(key(o.ref.path)));
      const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      const only = (a, b, names) => [...new Set(Object.keys(a).concat(Object.keys(b)))].every(k => same(a[k], b[k]) || names.includes(k));
      let statusOnly = false;
      if (asChef && main.length === 1 && fnOps.length === 2) {
        const op = main[0], k = key(op.ref.path), before = store[k], d = op.data;
        const hist = before && fnOps.find(o => key(o.ref.path) === k + '/hist/' + before.v);
        const old = before && store[k + '/hist/' + (before.v - 1)], stamp = window.LK_TIME.now();
        const cancel = before && before.status === 'confirmed' && d.status === 'cancelled' && d.canBy === pid && d.canAt === d.upd && d.od === '' &&
          d.canAt >= stamp - 60000 && d.canAt <= stamp + 15000 && only(before, d, ['status', 'v', 'upd', 'by', 'canBy', 'canAt', 'od', 'chg']);
        const undo = before && before.status === 'cancelled' && d.status === 'confirmed' && before.canBy === pid && before.upd === before.canAt && stamp - before.canAt < 120000 &&
          old && old.was.status === 'confirmed' && d.kq === old.was.kq && d.od === (old.was.od || '') && only(before, d, ['status', 'v', 'upd', 'by', 'od', 'kq', 'chg']);
        statusOnly = !!(hist && same(hist.data.was, before) && hist.data.at === d.upd && fnOps.every(o => o.data.by === pid) && (cancel || undo));
      }
      if (!statusOnly) return Promise.reject({ code: 'permission-denied' });
    }
    const bad = fnOps.some(o => {
      const k = key(o.ref.path);
      if (/\/hist\//.test(k)) return store[k] !== undefined;
      if (!/\/functions\/[^/]+$/.test(k)) return false;
      const old = store[k], d = o.data;
      if (d.v !== (old ? old.v + 1 : 1)) return true;
      if (!old && !d.effects) return true;
      if (old && old.effects !== undefined && d.effects === undefined || d.effects !== undefined && (!d.effects || !d.effects.prep || Object.keys(d.effects.prep).length > 12 || !d.effects.order || !d.effects.cancel || !d.effects.restore || Object.keys(d.effects).some(k => !['prep', 'order', 'cancel', 'restore'].includes(k)))) return true;
      if (d.status === 'confirmed') return (d.lines || []).some(l => (l.u || []).length !== l.qty || l.u.some(r => !(r >= 0 && r < d.rounds.length)));
      return false;
    });
    if (bad) return Promise.reject({ code: 'permission-denied' });
  }
  // a round ticked as sent names who ticked it: sentBy is the writer (by) of the record as it will be, like the rules
  const badSent = ops.some(o => {
    if (o.kind === 'delete' || !/^kitchens\/[^/]+\/fnsent\/[^/]+$/.test(key(o.ref.path))) return false;
    const a = after(o), old = store[key(o.ref.path)];
    return a.sent === true && !(old && old.sent === true) && a.sentBy !== (a.by || '');
  });
  if (badSent) return Promise.reject({ code: 'permission-denied' });
  // Today's team (7 Nov 2026): team/<day> is written by the head chef and the sous chefs (or the admin), each save the
  // next version of the stored one, its day its own, and when it was first set kept, like teamOk() in the rules
  const badTeam = ops.some(o => {
    if (o.kind === 'delete' || !/^kitchens\/[^/]+\/team\/[^/]+$/.test(key(o.ref.path))) return false;
    const a = after(o), old = store[key(o.ref.path)];
    if (!admin && !chef(cfgOf(o.ref))) return true;
    return a.day !== o.ref.path.at(-1) || !Array.isArray(a.on) || !Array.isArray(a.br) || a.v !== (old ? old.v + 1 : 1) || (!!old && a.at !== old.at);
  });
  if (badTeam) return Promise.reject({ code: 'permission-denied' });
  return finishOps(ops);
}
export function writeBatch() {
  const ops = [];
  return {
    set(ref, data, opt) { ops.push({ kind: 'set', ref, data, merge: !!(opt && opt.merge) }); },
    update(ref, data) { ops.push({ kind: 'update', ref, data }); },
    delete(ref) { ops.push({ kind: 'delete', ref }); },
    commit() { return commitOps(ops); }
  };
}
export function setDoc(ref, data, opt) { return commitOps([{ kind: 'set', ref, data, merge: !!(opt && opt.merge) }]); }
export function deleteDoc(ref) { return commitOps([{ kind: 'delete', ref }]); }
export function updateDoc(ref, data) { return commitOps([{ kind: 'update', ref, data }]); }

// Supplier pages use Lite: requests go straight to the test server, never into the persistent offline copy.
// Keep the same backend and failure controls as the full stand-in, without its offline write queue.
export function liteGetDoc(ref) {
  const k = key(ref.path);
  window.__fake.reads.push(k);
  if (window.__fake.stall && window.__fake.stall.test(k)) return new Promise(() => {});
  if (window.__fake.mode === 'hold' || window.__fake.mode === 'fail' || readFails(ref)) return Promise.reject({ code: 'unavailable' });
  if (spent(ref)) return SPENT();
  if (readRefused(ref)) return refuse('lite-get', ref);
  if (window.__fake.denyReads && window.__fake.denyReads.test(k)) return Promise.reject({ code: 'permission-denied' });
  bill('lite-get', k, 1);
  return delay(result(ref, false));
}
export function liteGetDocs(ref) {
  const k = key(ref.path);
  window.__fake.reads.push(k);
  if (window.__fake.stall && window.__fake.stall.test(k)) return new Promise(() => {});
  if (window.__fake.mode === 'hold' || window.__fake.mode === 'fail' || readFails(ref)) return Promise.reject({ code: 'unavailable' });
  if (spent(ref)) return SPENT();
  if (rulesDenied(ref)) return refuse('lite-query', ref);
  if (denied(ref)) return Promise.reject({ code: 'permission-denied' });
  const r = result(ref, false); bill('lite-query', k, r.docs.length); return delay(r);
}
async function liteCommit(ops, reads) {
  // A test can delay server acknowledgement while the online-only Lite request remains in flight.
  const ms = Math.max(0, Math.min(60000, +window.__fake.liteCommitDelay || 0));
  if (ms) await new Promise(resolve => setTimeout(resolve, ms));
  if (window.__fake.mode === 'hold' || window.__fake.mode === 'fail') throw { code: 'unavailable' };
  if (reads && [...reads].some(([path, version]) => JSON.stringify(store[path]) !== version)) throw { code: 'aborted' };
  return commitOps(ops);
}
let transactionChain = Promise.resolve();
export function runTransaction(db, fn) {
  // Transactions on the same test backend are serialised, and a concurrent external write retries the callback.
  // Staged writes are applied together only after all reads and failure checks have succeeded.
  async function run() {
    for (let attempt = 0; attempt < 5; attempt++) {
      const reads = new Map(), ops = [];
      const tx = {
        async get(ref) {
          if (ops.length) throw { code: 'invalid-argument', message: 'Transaction reads must come before writes.' };
          const version = JSON.stringify(store[key(ref.path)]), sn = await liteGetDoc(ref); reads.set(key(ref.path), version); return sn;
        },
        set(ref, value, opt) { ops.push({ kind: 'set', ref, data: value, merge: !!(opt && opt.merge) }); return tx; },
        update(ref, value) { ops.push({ kind: 'update', ref, data: value }); return tx; },
        delete(ref) { ops.push({ kind: 'delete', ref }); return tx; }
      };
      const value = await fn(tx);
      if ([...reads].some(([path, version]) => JSON.stringify(store[path]) !== version)) continue;
      if (ops.length) {
        try { await liteCommit(ops, reads); }
        catch (e) { if (e && e.code === 'aborted') continue; throw e; }
      }
      return value;
    }
    throw { code: 'aborted', message: 'The record changed during the save.' };
  }
  const result = transactionChain.then(run, run); transactionChain = result.catch(() => {}); return result;
}
