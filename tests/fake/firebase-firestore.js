// Stand-in for the Firestore web SDK, for the click tests only (tests/lib.js serves it instead of the real SDK).
// Data lives in localStorage ('fake.fs') so reloads keep it. window.__fake controls failures:
//   __fake.mode = 'ok' | 'deny' (every write refused, permission-denied) | 'hold' (writes wait, like no signal)
//   | 'fail' (every write and every read from the server fails, unavailable; getDoc, getDocs and listeners still
//   answer, so it is not no signal: __fake.cold below is)
//   __fake.deny = /regex/ refuses only the writes whose path matches
//   __fake.failReads = /regex/ makes getDoc, getDocs and getDocFromServer fail (unavailable) for the paths that match, like a read lost to a bad signal
//   __fake.denyReads = /regex/ makes getDocs refuse (permission-denied) the collections that match, like rules not published yet
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
function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
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
window.__fake.readLog = [];
window.__fake.refused = window.__fake.refused || [];
function refuse(kind, ref) { window.__fake.refused.push({ kind, path: key(ref.path) }); return Promise.reject({ code: 'permission-denied' }); }
/* the documents this tab has read, for getDocFromCache and getDocsFromCache. Kept across a reload (sessionStorage), which
   the book's own cache no longer does: since #387 (26 Oct 2026) it keeps a copy in memory only (memoryLocalCache), lost
   on every reload. A test that needs the real no-signal answer uses __fake.cold (o.cold in tests/lib.js). */
const seen = new Set((() => { try { return JSON.parse(sessionStorage.getItem('fake.seen') || '[]'); } catch (e) { return []; } })());
let seenSave = 0;
function remember(k) { if (seen.has(k)) return; seen.add(k); if (!seenSave) seenSave = setTimeout(() => { seenSave = 0; try { sessionStorage.setItem('fake.seen', JSON.stringify([...seen])); } catch (e) {} }, 0); }
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
  store[path] = JSON.parse(JSON.stringify(data));
  if (/\/config\/main$/.test(path)) {
    const c=store[path], roster={}; ['people','staffIds','sousIds','headId','fnIds','fnOnlyIds'].forEach(k=>{if(c[k] !== undefined) roster[k]=c[k];});
    store[path.replace(/config\/main$/, 'login/roster')] = roster;
  }
  save(); notify();
};
let seq = 0;
function rid() { return 'id' + Date.now().toString(36) + (seq++).toString(36); }

export function initializeFirestore() { return { kind: 'db' }; }
export function getFirestore() { return { kind: 'db' }; }
export function memoryLocalCache() { return {}; }
export function persistentLocalCache() { return {}; }
export function persistentMultipleTabManager() { return {}; }
export function terminate() { window.__fake.terminated = true; return Promise.resolve(); }
function segs(a) { return a.filter(x => typeof x === 'string'); }
function baseOf(x) { return x && x.path ? x.path : []; }
export function collection(parent, ...p) { return { type: 'col', path: baseOf(parent).concat(segs(p)) }; }
export function collectionGroup(parent, group) { return { type: 'group', path: ['**', group], group }; }
export function doc(parent, ...p) {
  let path = baseOf(parent).concat(segs(p));
  if (parent && parent.type === 'col' && !p.length) path = parent.path.concat([rid()]);
  return { type: 'doc', path, id: path[path.length - 1] };
}
export function where(f, op, v) { return { k: 'where', f, op, v }; }
export function documentId() { return '__name__'; }
export function orderBy(f, dir) { return { k: 'order', f, dir: dir || 'asc' }; }
export function limit(n) { return { k: 'limit', n }; }
export function startAfter(sn) { return { k: 'after', id: sn.id }; }
export function query(col, ...c) { return { type: 'query', path: col.path, group: col.group, c }; }
export function serverTimestamp() { return { __st: 1 }; }
export function increment(n) { return { __inc: n }; }

const key = p => p.join('/');
function snapDoc(path) {
  const v = store[key(path)];
  return { id: path[path.length - 1], ref: { type: 'doc', path, id: path[path.length - 1] }, metadata: { fromCache: false, hasPendingWrites: pendingKeys.has(key(path)) }, exists: () => v !== undefined, data: () => (v === undefined ? undefined : JSON.parse(JSON.stringify(v))) };
}
// __fake.cold: is this path answered from the empty copy in memory (no signal)?
function cold(ref) { const c = window.__fake.cold; return !!(c && c.test(key(ref.path))); }
// what the memory copy holds with no signal: only this page's unsent writes, marked fromCache
function cacheSnap(ref) {
  if (ref.type === 'doc') {
    const k = key(ref.path), has = pendingKeys.has(k), d = snapDoc(ref.path);
    return { id: d.id, ref: d.ref, metadata: { fromCache: true, hasPendingWrites: has }, exists: () => has && d.exists(), data: () => (has ? d.data() : undefined) };
  }
  const docs = listCol(ref.path, ref.c, ref.group).docs.filter(d => pendingKeys.has(key(d.ref.path)));
  return { docs, empty: !docs.length, size: docs.length, metadata: { fromCache: true, hasPendingWrites: docs.length > 0 }, forEach: f => docs.forEach(f) };
}
function listCol(path, c, group) {
  const pre = key(path) + '/', n = path.length + 1;
  let docs = Object.keys(store).filter(k => group ? k.split('/').slice(-2)[0] === group : k.indexOf(pre) === 0 && k.split('/').length === n).map(k => snapDoc(k.split('/')));
  if (group) docs.sort((a, b) => key(a.ref.path).localeCompare(key(b.ref.path)));
  (c || []).forEach(x => {
    if (x.k === 'where' && x.f === '__name__') {
      const v = x.v && x.v.path ? key(x.v.path) : x.v;
      docs = docs.filter(d => { const id = group ? key(d.ref.path) : d.id; return x.op === 'in' ? v.indexOf(id) >= 0 : x.op === '>=' ? id >= v : x.op === '<=' ? id <= v : x.op === '<' ? id < v : x.op === '>' ? id > v : id === v; }); return;
    }
    if (x.k === 'where') docs = docs.filter(d => { const v = (d.data() || {})[x.f]; if (x.op === 'in') return x.v.indexOf(v) >= 0; return x.op === '==' ? v === x.v : x.op === '>=' ? v >= x.v : x.op === '<' ? v < x.v : x.op === '<=' ? v <= x.v : x.op === '>' ? v > x.v : true; });
    if (x.k === 'order') docs.sort((a, b) => { const A = a.data()[x.f], B = b.data()[x.f]; return (A > B ? 1 : A < B ? -1 : 0) * (x.dir === 'desc' ? -1 : 1); });
    if (x.k === 'after') { const i = docs.findIndex(d => d.id === x.id); docs = i < 0 ? [] : docs.slice(i + 1); }
    if (x.k === 'limit') docs = docs.slice(0, x.n);
  });
  return { docs, empty: !docs.length, size: docs.length, metadata: { fromCache: false, hasPendingWrites: docs.some(d => d.metadata.hasPendingWrites) }, forEach: f => docs.forEach(f) };
}
function result(ref, keep = true) {
  const r = ref.type === 'doc' ? snapDoc(ref.path) : listCol(ref.path, ref.c, ref.group);
  (ref.type === 'doc' ? [r] : r.docs).forEach(d => { const k = key(d.ref.path); if (d.exists()) { if (keep) remember(k); window.__fake.readLog.push(k); } else if (keep && ref.type === 'doc') remember(k); });
  return r;
}
function delay(v) { return new Promise(r => setTimeout(() => r(v), 5)); }
/* Who this phone reads as, like the rules (firestore.rules sessOk(reader()), kitchenRead(), chefId()), for the person on
   this phone's PIN session; the head chef's Google account (window.__fakeUser) is the verified owner and reads it all. */
function cfgOf(ref) { return store[ref.path.slice(0, 2).join('/') + '/config/main'] || {}; }
// sessOk(reader()): a PIN session that has not run out, opened since their PIN was last set, for someone on the staff
// list. '' when there is none
function sessionReader(ref) {
  const root = ref.path.slice(0, 2).join('/'), uid = window.__fakeUid ? window.__fakeUid() : '', ss = uid ? store[root + '/sessions/' + uid] : null;
  const ps = ss ? store[root + '/pinset/' + ss.by] : null, c = cfgOf(ref);
  return ss && ss.exp > Date.now() && ps && ps.at === ss.pinAt && (!c.staffIds || c.staffIds.indexOf(ss.by) >= 0) ? ss.by : '';
}
/* kitchenRead(): the same, for someone who is not functions only */
function kitchenReader(ref) { const by = sessionReader(ref); return by && (cfgOf(ref).fnOnlyIds || []).indexOf(by) < 0 ? by : ''; }
/* the chef to-do list (23 Oct 2026), the supplier tools, the sign-off register (27 Oct 2026), the supplier order ticks
   (cutdone), the personal pings of others and who has seen them: like the rules, only the head chef's Google account or a
   phone whose kitchen reader is a chef (sousIds or headId in config/main) reads them */
function chefReader(ref) {
  if (window.__fakeUser) return true;
  const by = kitchenReader(ref), c = cfgOf(ref);
  return !!by && ((c.sousIds || []).indexOf(by) >= 0 || (!!c.headId && c.headId === by));
}
// someone ticked for Functions (fnIds) on their own PIN session, functions only or not (fncontact, functions/<id>/hist)
function fnReader(ref) { if (window.__fakeUser) return true; const by = sessionReader(ref); return !!by && (cfgOf(ref).fnIds || []).indexOf(by) >= 0; }
// kitchen mail: the Google account, or a sous chef on their PIN session while the head chef has sous chef mail on
function mailReader(ref) { if (window.__fakeUser) return true; const c = cfgOf(ref), by = kitchenReader(ref); return c.sousMail === true && !!by && (c.sousIds || []).indexOf(by) >= 0; }
const at3 = (k, name) => new RegExp('^kitchens/[^/]+/' + name).test(k);
/* isToday(day) in the rules: the path's date is today in kitchen time (Queensland, UTC+10), with 15 minutes either side
   for a phone's clock. On the page's own clock, which the tests set */
function isToday(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '')) return false;
  const mid = Date.parse(day + 'T00:00:00Z') - 10 * 3600000, t = Date.now();
  return t >= mid - 15 * 60000 && t < mid + 86400000 + 15 * 60000;
}
// the operational records (kitchenRead() in the rules): a live PIN session for someone who is not functions only
const KITCHEN_COLS = ['config', 'days', 'orders', 'waste', 'summary', 'misses', 'views', 'notes', 'guides', 'drinks', 'shifts', 'activity', 'sections',
  'learned', 'ordlearned', 'learnlog', 'minutes', 'mailstat', 'transfers', 'transferOpen'];
/* The read rules by collection, before the record-by-record ones in readRefused() and rulesDenied(): true when the real
   rules refuse this phone the record (list false) or the query (list true). Everything here is open to the head chef's
   Google account, apart from the records nobody reads (pushes, PIN tries, the old proofs). */
function colRefused(ref, list) {
  const rel = ref.path.slice(2), c = rel[0], k = key(ref.path);
  if (ref.path[0] !== 'kitchens' || ref.group) return false;
  if (c === 'push' || c === 'tries' || c === 'proofs') return true;
  if (window.__fakeUser) return false;
  // only the head chef's Google account: PIN fingerprints, the usage counts, the minutes' earlier versions, and the
  // lists of who has a PIN and of every mail's status (one record by id is for the kitchen)
  if (c === 'staffpins' || c === 'daily' || c === 'proofHistory' || (c === 'minutes' && rel[2] === 'hist')) return true;
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
  if (window.__fakeUser) return false;
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
  if (at3(k, '(suppliers|supplierlinks|cutdone)(/|$)')) return !chefReader(ref);
  if (at3(k, 'mail/[^/]+$')) return !mailReader(ref);
  return false;
}
export function getDoc(ref) {
  if (readRefused(ref)) return refuse('get', ref);
  window.__fake.reads.push(key(ref.path));
  if (cold(ref)) return pendingKeys.has(key(ref.path)) ? delay(cacheSnap(ref)) : Promise.reject({ code: 'unavailable' });
  if (readFails(ref)) return Promise.reject({ code: 'unavailable' });
  bill('get', key(ref.path), 1);
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
  if (ref.group && !window.__fakeUser) return true;
  if (colRefused(ref, true)) return true;
  if (/^kitchens\/[^/]+\/todos$/.test(k) && !chefReader(ref)) return true;
  if (/^kitchens\/[^/]+\/minutes\/[^/]+\/signs$/.test(k) && !chefReader(ref)) return true;   // the register, chefs only
  if (at3(k, '(suppliers|supplierlinks|cutdone)(/|$)') && !chefReader(ref)) return true;
  if (/^kitchens\/[^/]+\/minutes$/.test(k) && !window.__fakeUser && !(ref.c || []).some(x => x.k === 'where' && x.f === 'pubAt' && (x.op === '>=' || x.op === '>') && x.v >= 1)) return true;
  if (at3(k, 'mail$') && !mailReader(ref)) return true;
  if (at3(k, 'fncontact$') && !window.__fakeUser) return true;   // listed only by the Google account (the backup)
  if (at3(k, 'functions/[^/]+/hist$') && !(chefReader(ref) || fnReader(ref))) return true;
  if (at3(k, 'directnotes$') && !chefReader(ref)) { const by = kitchenReader(ref); return !(by && asks(ref, 'to', '==', by)); }
  if (at3(k, 'directnotes/[^/]+/seen$') && !chefReader(ref)) {
    const by = kitchenReader(ref), parent = store[ref.path.slice(0, 4).join('/')];
    return !(by && parent && parent.to === by && asks(ref, 'by', '==', by));
  }
  return /^kitchens\/[^/]+\/book$/.test(k);
}
function denied(ref) { const d = window.__fake.denyReads; return !!(d && d.test(key(ref.path))); }
export function getDocs(ref) { window.__fake.reads.push(key(ref.path)); if (cold(ref)) return delay(cacheSnap(ref)); if (readFails(ref)) return Promise.reject({ code: 'unavailable' }); if (rulesDenied(ref)) return refuse('query', ref); if (denied(ref)) return Promise.reject({ code: 'permission-denied' }); const r = result(ref); bill('query', key(ref.path), r.docs.length); return delay(r); }
function readFails(ref) { const f = window.__fake.failReads; return !!(f && f.test(key(ref.path))); }
// a read that must come from the server: refused when there is no signal ('hold', 'fail'). __fake.server can hold a
// newer copy of a document than this phone has (say a line ticked on another phone), keyed by path.
export function getDocFromServer(ref) {
  const k = key(ref.path), sv = window.__fake.server;
  window.__fake.reads.push(k);
  // __fake.stall = /regex/: a read from the server that never answers, like a half-dropped connection
  if (window.__fake.stall && window.__fake.stall.test(k)) return new Promise(() => {});
  if (window.__fake.mode === 'hold' || window.__fake.mode === 'fail' || cold(ref) || readFails(ref)) return Promise.reject({ code: 'unavailable' });
  if (readRefused(ref)) return refuse('server', ref);
  bill('server', k, 1);
  if (sv && k in sv) { const v = sv[k]; return delay({ id: ref.path[ref.path.length - 1], ref, exists: () => v != null, data: () => (v == null ? undefined : JSON.parse(JSON.stringify(v))) }); }
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
  if (rulesDenied(ref)) return refuse('server-query', ref);
  if (denied(ref)) return Promise.reject({ code: 'permission-denied' });
  let docs;
  if (byId) {
    const ids = byId.op === 'in' ? byId.v : [byId.v];
    docs = ids.map(id => { const p = ref.path.concat([id]), dk = key(p); if (dk in sv) { const v = sv[dk]; return { id, ref: { path: p }, exists: () => v != null, data: () => (v == null ? undefined : JSON.parse(JSON.stringify(v))) }; } return result({ type: 'doc', path: p }); }).filter(d => d.exists());
  } else docs = result(ref).docs;
  bill('query', k, docs.length);
  return delay({ docs, empty: !docs.length, size: docs.length, forEach: f => docs.forEach(f) });
}
// a document from the offline copy: known (even known to be missing) once it was read, refused otherwise, like the SDK
export function getDocFromCache(ref) {
  const k = key(ref.path);
  if (!seen.has(k)) return Promise.reject({ code: 'unavailable' });
  return delay(snapDoc(ref.path));
}
export function getDocsFromCache(ref) {
  const r = listCol(ref.path, ref.c, ref.group), docs = r.docs.filter(d => seen.has(key(d.ref.path)));
  return delay({ docs, empty: !docs.length, size: docs.length, forEach: f => docs.forEach(f) });
}
export function onSnapshot(ref, next, err) {
  if (next && typeof next === 'object') { next = err; err = arguments[3]; }   // onSnapshot(ref, options, next, error)
  // a listener the rules refuse gets the refusal instead of its first answer, and nothing after (like the SDK). One
  // started with no signal (cold) answers from the copy in memory, as the SDK does, and is not refused here later
  if (!cold(ref) && (ref.type === 'doc' ? readRefused(ref) : rulesDenied(ref))) {
    let live = true;
    refuse('listen', ref).catch(e => setTimeout(() => { if (live && err) err(e); }, 5));
    return () => { live = false; };
  }
  const s = { ref, next, last: null, cold: cold(ref) };
  subs.add(s);
  setTimeout(() => { if (subs.has(s)) deliver(s); }, 5);
  return () => subs.delete(s);
}
// a listener pays for what it first sends, then only for documents that changed since its last snapshot; an answer
// from the empty copy in memory (cold) costs nothing
function deliver(s) {
  if (s.cold) {
    const c = cacheSnap(s.ref), sg = sigOf(c.docs || [c], true);
    if (window.__fake.quiet && s.sig === sg) return;
    s.sig = sg; s.next(c); return;
  }
  const r = s.ref.type === 'doc' ? snapDoc(s.ref.path) : listCol(s.ref.path, s.ref.c), docs = s.ref.type === 'doc' ? [r] : r.docs;
  const sg = sigOf(docs, cold(s.ref));
  if (window.__fake.quiet && s.sig === sg) return;
  s.sig = sg;
  const now = {}; docs.forEach(d => { now[key(d.ref.path)] = JSON.stringify(d.exists() ? d.data() : null); });
  if (!s.last) bill('listen', key(s.ref.path), docs.length);
  else { const ch = Object.keys(now).filter(k => s.last[k] !== now[k]).length; if (ch) window.__fake.bill.push({ kind: 'listen+', path: key(s.ref.path), n: ch }); }
  s.last = now;
  const out = result(s.ref);
  // started before the signal went: it keeps its documents, from the copy in memory
  if (cold(s.ref)) out.metadata = Object.assign({}, out.metadata, { fromCache: true });
  s.next(out);
}
function notify() { subs.forEach(s => { try { deliver(s); } catch (e) { console.error(e); } }); }
function resolveVal(v, old) {
  if (v && typeof v === 'object' && v.__inc != null) return (typeof old === 'number' ? old : 0) + v.__inc;
  if (v && typeof v === 'object' && v.__st) return Date.now();
  if (v && typeof v === 'object' && !Array.isArray(v)) { const o = {}; Object.keys(v).forEach(k => { o[k] = resolveVal(v[k], old && old[k]); }); return Object.assign({}, old && typeof old === 'object' && !Array.isArray(old) ? old : {}, o); }
  return v;
}
function applyOp(o) {
  const k = key(o.ref.path), old = store[k];
  if (o.kind === 'delete') { delete store[k]; return; }
  if (o.kind === 'update' && old === undefined) throw { code: 'not-found' };
  const base = o.kind === 'set' && !o.merge ? {} : (old || {});
  const out = Object.assign({}, base);
  Object.keys(o.data).forEach(f => { out[f] = resolveVal(o.data[f], base[f]); });
  store[k] = out;
}
function commitOps(ops) {
  window.__fake.writes.push(ops.map(o => ({ kind: o.kind, path: key(o.ref.path), data: o.data })));
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
  const uid = window.__fakeUid ? window.__fakeUid() : '', rootOf = o => key(o.ref.path).split('/').slice(0, 2).join('/');
  const badSess = ops.some(o => {
    const k = key(o.ref.path), t = k.match(/\/tries\/([^/]+)$/), m = k.match(/\/sessions\/([^/]+)$/);
    if (t) { const old = store[k]; return !uid || o.data.uid !== uid || (old && Date.now() - old.at < 20000); }
    if (!m) return false;
    if (m[1] !== uid) return true;
    if (o.kind === 'delete') return false;
    const d = o.data, r = rootOf(o), tr = store[r + '/tries/' + d.by], pin = store[r + '/staffpins/' + d.by], ps = store[r + '/pinset/' + d.by], old = store[k];
    const fresh = !!tr && tr.uid === uid && Date.now() - tr.at < 120000 && !!pin && pin.hash === tr.tok;
    const renew = !!old && old.by === d.by && old.pinAt === d.pinAt && old.exp > Date.now();
    return !ps || ps.at !== d.pinAt || !(fresh || renew);
  });
  if (badSess) return Promise.reject({ code: 'permission-denied' });
  // who is writing: this phone's running session, while that person's PIN is the one it was opened with (Reset PIN or a
  // new PIN stops it)
  const sessNow = uid && ops.length ? store[rootOf(ops.find(o => key(o.ref.path).startsWith('kitchens/')) || ops[0]) + '/sessions/' + uid] : null;
  const sessPin = sessNow ? store[rootOf(ops.find(o => key(o.ref.path).startsWith('kitchens/')) || ops[0]) + '/pinset/' + sessNow.by] : null;
  const actor = sessNow && sessNow.exp > Date.now() && sessPin && sessPin.at === sessNow.pinAt ? sessNow.by : '';
  // like staff() in the rules: any other write from a phone (no Google account) names its writer (by), and that writer
  // has this phone's running session
  const free = /\/(staffpins|pinset|tries|sessions|proofs)\/[^/]+$/;
  if (!window.__fakeUser && ops.some(o => o.kind !== 'delete' && !free.test(key(o.ref.path)) && !(o.data && o.data.by && o.data.by === actor))) return Promise.reject({ code: 'permission-denied' });
  // the rules see a record as it will be after the write (request.resource.data): a merge or an update keeps the fields
  // already stored, by among them (27 Oct 2026: a merge with no by kept a sous chef's id and the rules refused the head chef)
  const after = o => Object.assign({}, o.kind === 'set' && !o.merge ? {} : (store[key(o.ref.path)] || {}), o.data || {});
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
    if (o.kind === 'delete' || !window.__fakeUser) return false;
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
      if (!window.__fakeUser || !Array.isArray(next.proofWords) || next.proofWords.length > 200 || new Set(next.proofWords).size !== next.proofWords.length ||
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
    if (!window.__fakeUser || !proofVersion(next.proofV) || !proofId(next.proofEvent)) return true;
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
    const asOwner = !!window.__fakeUser && by.every(b => !b || b === head);
    if (!asHead && !asOwner) return Promise.reject({ code: 'permission-denied' });
  }
  // functions (21 Oct 2026): only the Google account or someone in config/main fnIds writes them, each save the next
  // version (so a double tap or a save from an old copy is refused), and a confirmed line's rounds add up, like the rules
  const fnOps = ops.filter(o => /^kitchens\/[^/]+\/(functions|fncontact)\//.test(key(o.ref.path)));
  if (fnOps.length) {
    const c = store[key(fnOps[0].ref.path).split('/').slice(0, 2).join('/') + '/config/main'] || {};
    const pid = actor;
    const asFn = !!pid && (c.fnIds || []).indexOf(pid) >= 0 && fnOps.every(o => (o.data && o.data.by) === pid);
    if (!asFn && !window.__fakeUser) {
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
  if (window.__fake.mode === 'deny') return Promise.reject({ code: 'permission-denied' });
  // __fake.deny = /regex/ refuses only the writes whose path matches (a right the rules do not give), the rest go through
  if (window.__fake.deny && ops.some(o => window.__fake.deny.test(key(o.ref.path)))) return Promise.reject({ code: 'permission-denied' });
  if (window.__fake.mode === 'fail') return Promise.reject({ code: 'unavailable' });
  const run = () => { ops.filter(o => !/\/proofs\//.test(key(o.ref.path))).forEach(applyOp); save(); notify(); };
  if (window.__fake.mode === 'hold') {
    // like Firestore offline: the change shows on this phone at once, the promise waits for the server
    ops.filter(o => !/\/proofs\//.test(key(o.ref.path))).forEach(o => pendingKeys.add(key(o.ref.path)));
    run();
    return new Promise(res => held.push(res));
  }
  run();
  return delay(undefined);
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
