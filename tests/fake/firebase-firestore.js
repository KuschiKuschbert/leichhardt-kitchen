// Stand-in for the Firestore web SDK, for the click tests only (tests/lib.js serves it instead of the real SDK).
// Data lives in localStorage ('fake.fs') so reloads keep it. window.__fake controls failures:
//   __fake.mode = 'ok' | 'deny' (every write refused, permission-denied) | 'hold' (writes wait, like no signal)
//   __fake.deny = /regex/ refuses only the writes whose path matches
//   __fake.failReads = /regex/ makes getDoc and getDocs fail (unavailable) for the paths that match, like a read lost to a bad signal
// __fake.reads lists the paths asked for (getDoc, getDocs, getDocFromServer) and __fake.readLog every document read from the "server";
// getDocsFromCache only returns documents this page has read before.
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
// the documents this tab has read (its "offline copy"): kept across a reload, like the real persistent cache
const seen = new Set((() => { try { return JSON.parse(sessionStorage.getItem('fake.seen') || '[]'); } catch (e) { return []; } })());
let seenSave = 0;
function remember(k) { if (seen.has(k)) return; seen.add(k); if (!seenSave) seenSave = setTimeout(() => { seenSave = 0; try { sessionStorage.setItem('fake.seen', JSON.stringify([...seen])); } catch (e) {} }, 0); }
window.__fake.release = function () { const h = held.splice(0); pendingKeys.clear(); h.forEach(f => f()); notify(); };
window.__fake.dump = function () { return store; };
// a write from another phone: the document changes under this page and its listeners hear about it
window.__fake.write = function (path, data) { store[path] = JSON.parse(JSON.stringify(data)); save(); notify(); };
let seq = 0;
function rid() { return 'id' + Date.now().toString(36) + (seq++).toString(36); }

export function initializeFirestore() { return { kind: 'db' }; }
export function getFirestore() { return { kind: 'db' }; }
export function persistentLocalCache() { return {}; }
export function persistentMultipleTabManager() { return {}; }
export function terminate() { window.__fake.terminated = true; return Promise.resolve(); }
function segs(a) { return a.filter(x => typeof x === 'string'); }
function baseOf(x) { return x && x.path ? x.path : []; }
export function collection(parent, ...p) { return { type: 'col', path: baseOf(parent).concat(segs(p)) }; }
export function doc(parent, ...p) {
  let path = baseOf(parent).concat(segs(p));
  if (parent && parent.type === 'col' && !p.length) path = parent.path.concat([rid()]);
  return { type: 'doc', path, id: path[path.length - 1] };
}
export function where(f, op, v) { return { k: 'where', f, op, v }; }
export function orderBy(f, dir) { return { k: 'order', f, dir: dir || 'asc' }; }
export function limit(n) { return { k: 'limit', n }; }
export function query(col, ...c) { return { type: 'query', path: col.path, c }; }
export function serverTimestamp() { return { __st: 1 }; }
export function increment(n) { return { __inc: n }; }

const key = p => p.join('/');
function snapDoc(path) {
  const v = store[key(path)];
  return { id: path[path.length - 1], ref: { type: 'doc', path, id: path[path.length - 1] }, metadata: { hasPendingWrites: pendingKeys.has(key(path)) }, exists: () => v !== undefined, data: () => (v === undefined ? undefined : JSON.parse(JSON.stringify(v))) };
}
function listCol(path, c) {
  const pre = key(path) + '/', n = path.length + 1;
  let docs = Object.keys(store).filter(k => k.indexOf(pre) === 0 && k.split('/').length === n).map(k => snapDoc(k.split('/')));
  (c || []).forEach(x => {
    if (x.k === 'where') docs = docs.filter(d => { const v = (d.data() || {})[x.f]; return x.op === '==' ? v === x.v : x.op === '>=' ? v >= x.v : x.op === '<' ? v < x.v : x.op === '<=' ? v <= x.v : x.op === '>' ? v > x.v : true; });
    if (x.k === 'order') docs.sort((a, b) => { const A = a.data()[x.f], B = b.data()[x.f]; return (A > B ? 1 : A < B ? -1 : 0) * (x.dir === 'desc' ? -1 : 1); });
    if (x.k === 'limit') docs = docs.slice(0, x.n);
  });
  return { docs, empty: !docs.length, size: docs.length, forEach: f => docs.forEach(f) };
}
function result(ref) {
  const r = ref.type === 'doc' ? snapDoc(ref.path) : listCol(ref.path, ref.c);
  (ref.type === 'doc' ? [r] : r.docs).forEach(d => { const k = key(d.ref.path); if (d.exists()) { remember(k); window.__fake.readLog.push(k); } else if (ref.type === 'doc') remember(k); });
  return r;
}
function delay(v) { return new Promise(r => setTimeout(() => r(v), 5)); }
export function getDoc(ref) {
  if (/\/config\/admins$/.test(key(ref.path)) && !window.__fakeUser) return Promise.reject({ code: 'permission-denied' });
  window.__fake.reads.push(key(ref.path));
  if (readFails(ref)) return Promise.reject({ code: 'unavailable' });
  bill('get', key(ref.path), 1);
  return delay(result(ref));
}
export function getDocs(ref) { window.__fake.reads.push(key(ref.path)); if (readFails(ref)) return Promise.reject({ code: 'unavailable' }); const r = result(ref); bill('query', key(ref.path), r.docs.length); return delay(r); }
function readFails(ref) { const f = window.__fake.failReads; return !!(f && f.test(key(ref.path))); }
// a read that must come from the server: refused when there is no signal ('hold', 'fail'). __fake.server can hold a
// newer copy of a document than this phone has (say a line ticked on another phone), keyed by path.
export function getDocFromServer(ref) {
  const k = key(ref.path), sv = window.__fake.server;
  window.__fake.reads.push(k);
  if (window.__fake.mode === 'hold' || window.__fake.mode === 'fail') return Promise.reject({ code: 'unavailable' });
  bill('server', k, 1);
  if (sv && k in sv) { const v = sv[k]; return delay({ id: ref.path[ref.path.length - 1], ref, exists: () => v != null, data: () => (v == null ? undefined : JSON.parse(JSON.stringify(v))) }); }
  return delay(result(ref));
}
// a document from the offline copy: known (even known to be missing) once it was read, refused otherwise, like the SDK
export function getDocFromCache(ref) {
  const k = key(ref.path);
  if (!seen.has(k)) return Promise.reject({ code: 'unavailable' });
  return delay(snapDoc(ref.path));
}
export function getDocsFromCache(ref) {
  const r = listCol(ref.path, ref.c), docs = r.docs.filter(d => seen.has(key(d.ref.path)));
  return delay({ docs, empty: !docs.length, size: docs.length, forEach: f => docs.forEach(f) });
}
export function onSnapshot(ref, next, err) {
  if (next && typeof next === 'object') { next = err; err = arguments[3]; }   // onSnapshot(ref, options, next, error)
  const s = { ref, next, last: null };
  subs.add(s);
  setTimeout(() => { if (subs.has(s)) deliver(s); }, 5);
  return () => subs.delete(s);
}
// a listener pays for what it first sends, then only for documents that changed since its last snapshot
function deliver(s) {
  const r = s.ref.type === 'doc' ? snapDoc(s.ref.path) : listCol(s.ref.path, s.ref.c), docs = s.ref.type === 'doc' ? [r] : r.docs;
  const now = {}; docs.forEach(d => { now[key(d.ref.path)] = JSON.stringify(d.exists() ? d.data() : null); });
  if (!s.last) bill('listen', key(s.ref.path), docs.length);
  else { const ch = Object.keys(now).filter(k => s.last[k] !== now[k]).length; if (ch) window.__fake.bill.push({ kind: 'listen+', path: key(s.ref.path), n: ch }); }
  s.last = now;
  s.next(result(s.ref));
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
  // the staff lock: a proof in the batch must match the stored PIN hash
  const proof = ops.find(o => /\/proofs\//.test(key(o.ref.path)));
  if (proof) {
    const id = proof.ref.path[proof.ref.path.length - 1], pin = store[key(proof.ref.path.slice(0, -2).concat(['staffpins', id]))];
    if (!pin || pin.hash !== proof.data.tok) return Promise.reject({ code: 'permission-denied' });
  }
  // two of the real rules that order of writes depends on: a staff PIN hash is only created once its pinset record
  // exists (already stored or in the same batch), and a learnlog day is create only
  const has = p => store[p] !== undefined || ops.some(o => key(o.ref.path) === p && o.kind === 'set');
  const refused = ops.some(o => {
    const k = key(o.ref.path), m = k.match(/^(.*)\/staffpins\/([^/]+)$/);
    if (m && o.kind === 'set' && store[k] === undefined && !has(m[1] + '/pinset/' + m[2])) return true;
    return /\/learnlog\/[^/]+$/.test(k) && store[k] !== undefined;
  });
  if (refused) return Promise.reject({ code: 'permission-denied' });
  // the head chef's book (book/index, recipes, drawings and the library): only the head chef writes it, with the
  // Google account (nobody else signed in) or with their own PIN as config/main headId, like the real rules
  const book = ops.filter(o => /^kitchens\/[^/]+\/(book|recipes|drawings|drawtpl|drawlib)\//.test(key(o.ref.path)));
  if (book.length) {
    const head = (store[key(book[0].ref.path).split('/').slice(0, 2).join('/') + '/config/main'] || {}).headId || '';
    const by = book.map(o => (o.data && o.data.by) || '');
    const asHead = !!head && !!proof && by.every(b => b === head);
    const asOwner = !!window.__fakeUser && by.every(b => !b || b === head);
    if (!asHead && !asOwner) return Promise.reject({ code: 'permission-denied' });
  }
  // functions (21 Oct 2026): only the Google account or someone in config/main fnIds writes them, each save the next
  // version (so a double tap or a save from an old copy is refused), and a confirmed line's rounds add up, like the rules
  const fnOps = ops.filter(o => /^kitchens\/[^/]+\/(functions|fncontact)\//.test(key(o.ref.path)));
  if (fnOps.length) {
    const c = store[key(fnOps[0].ref.path).split('/').slice(0, 2).join('/') + '/config/main'] || {};
    const pid = proof ? proof.ref.path[proof.ref.path.length - 1] : '';
    const asFn = !!pid && (c.fnIds || []).indexOf(pid) >= 0 && fnOps.every(o => (o.data && o.data.by) === pid);
    if (!asFn && !window.__fakeUser) return Promise.reject({ code: 'permission-denied' });
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
export function updateDoc(ref, data) { return commitOps([{ kind: 'update', ref, data }]); }
