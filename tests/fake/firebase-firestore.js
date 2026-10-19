// Stand-in for the Firestore web SDK, for the click tests only (tests/lib.js serves it instead of the real SDK).
// Data lives in localStorage ('fake.fs') so reloads keep it. window.__fake controls failures:
//   __fake.mode = 'ok' | 'deny' (every write refused, permission-denied) | 'hold' (writes wait, like no signal)
//   __fake.deny = /regex/ refuses only the writes whose path matches
// __fake.reads lists the paths asked for (getDoc, getDocs, getDocFromServer) and __fake.readLog every document read from the "server";
// getDocsFromCache only returns documents this page has read before.
const KEY = 'fake.fs';
function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
let store = load();
function save() { localStorage.setItem(KEY, JSON.stringify(store)); }
const subs = new Set();
const held = [];
window.__fake = window.__fake || { mode: 'ok', writes: [], reads: [] };
window.__fake.readLog = [];
const seen = new Set();
window.__fake.release = function () { const h = held.splice(0); h.forEach(f => f()); };
window.__fake.dump = function () { return store; };
// a write from another phone: the document changes under this page and its listeners hear about it
window.__fake.write = function (path, data) { store[path] = JSON.parse(JSON.stringify(data)); save(); notify(); };
let seq = 0;
function rid() { return 'id' + Date.now().toString(36) + (seq++).toString(36); }

export function initializeFirestore() { return { kind: 'db' }; }
export function getFirestore() { return { kind: 'db' }; }
export function persistentLocalCache() { return {}; }
export function persistentMultipleTabManager() { return {}; }
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
  return { id: path[path.length - 1], ref: { type: 'doc', path, id: path[path.length - 1] }, exists: () => v !== undefined, data: () => (v === undefined ? undefined : JSON.parse(JSON.stringify(v))) };
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
  (ref.type === 'doc' ? [r] : r.docs).forEach(d => { if (d.exists()) { const k = key(d.ref.path); seen.add(k); window.__fake.readLog.push(k); } });
  return r;
}
function delay(v) { return new Promise(r => setTimeout(() => r(v), 5)); }
export function getDoc(ref) {
  if (/\/config\/admins$/.test(key(ref.path)) && !window.__fakeUser) return Promise.reject({ code: 'permission-denied' });
  window.__fake.reads.push(key(ref.path));
  return delay(result(ref));
}
export function getDocs(ref) { window.__fake.reads.push(key(ref.path)); return delay(result(ref)); }
// a read that must come from the server: refused when there is no signal ('hold', 'fail'). __fake.server can hold a
// newer copy of a document than this phone has (say a line ticked on another phone), keyed by path.
export function getDocFromServer(ref) {
  const k = key(ref.path), sv = window.__fake.server;
  window.__fake.reads.push(k);
  if (window.__fake.mode === 'hold' || window.__fake.mode === 'fail') return Promise.reject({ code: 'unavailable' });
  if (sv && k in sv) { const v = sv[k]; return delay({ id: ref.path[ref.path.length - 1], ref, exists: () => v != null, data: () => (v == null ? undefined : JSON.parse(JSON.stringify(v))) }); }
  return delay(result(ref));
}
export function getDocsFromCache(ref) {
  const r = listCol(ref.path, ref.c), docs = r.docs.filter(d => seen.has(key(d.ref.path)));
  return delay({ docs, empty: !docs.length, size: docs.length, forEach: f => docs.forEach(f) });
}
export function onSnapshot(ref, next, err) {
  const s = { ref, next };
  subs.add(s);
  setTimeout(() => { if (subs.has(s)) next(result(ref)); }, 5);
  return () => subs.delete(s);
}
function notify() { subs.forEach(s => { try { s.next(result(s.ref)); } catch (e) { console.error(e); } }); }
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
  if (window.__fake.mode === 'deny') return Promise.reject({ code: 'permission-denied' });
  // __fake.deny = /regex/ refuses only the writes whose path matches (a right the rules do not give), the rest go through
  if (window.__fake.deny && ops.some(o => window.__fake.deny.test(key(o.ref.path)))) return Promise.reject({ code: 'permission-denied' });
  if (window.__fake.mode === 'fail') return Promise.reject({ code: 'unavailable' });
  const run = () => { ops.filter(o => !/\/proofs\//.test(key(o.ref.path))).forEach(applyOp); save(); notify(); };
  if (window.__fake.mode === 'hold') {
    // like Firestore offline: the change shows on this phone at once, the promise waits for the server
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
