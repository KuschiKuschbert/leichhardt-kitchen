/* Transactional stand-in; no network calls, credentials, queues or notifications. */
export class Stamp { constructor(ms) { this.ms = ms; } toMillis() { return this.ms; } }
function copy(value) {
  if (value instanceof Stamp) return new Stamp(value.ms);
  if (Array.isArray(value)) return value.map(copy);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, copy(entry)]));
  return value;
}
function patch(value, updates) {
  const out = copy(value || {});
  for (const [key, entry] of Object.entries(updates)) { const path = key.split('.');let target = out;while (path.length > 1) { const part = path.shift();target = target[part] ||= {}; }target[path[0]] = copy(entry); }
  return out;
}
export class FakeFirestore {
  constructor() { this.records = new Map();this.queue = Promise.resolve();this.failNextTransaction = false; }
  seed(path, value) { this.records.set(path, copy(value)); }
  value(path) { return copy(this.records.get(path)); }
  collection(path) { return new Collection(this, path); }
  snap(ref) { const value = this.value(ref.path);return { id: ref.id, ref, exists: this.records.has(ref.path), data: () => copy(value) }; }
  async getAll(...refs) { return refs.map(ref => this.snap(ref)); }
  async runTransaction(fn) {
    const run = this.queue.then(async () => {
      if (this.failNextTransaction) { this.failNextTransaction = false;throw new Error('Simulated transaction failure'); }
      const tx = this.batch();tx.get = async ref => this.snap(ref);tx.getAll = (...refs) => this.getAll(...refs);
      const result = await fn(tx);await tx.commit();return result;
    });
    this.queue = run.catch(() => {});return run;
  }
  batch() {
    const pending = [];
    return { set: (ref, value) => pending.push(['set', ref, value]), update: (ref, value) => pending.push(['update', ref, value]),
      create: (ref, value) => pending.push(['create', ref, value]), delete: ref => pending.push(['delete', ref]),
      commit: async () => {
        const next = new Map(this.records);
        for (const [op, ref, value] of pending) {
          if (op === 'create' && next.has(ref.path)) throw new Error('Already exists');
          if (op === 'update' && !next.has(ref.path)) throw new Error('Missing record');
          if (op === 'delete') next.delete(ref.path);else next.set(ref.path, op === 'update' ? patch(next.get(ref.path), value) : copy(value));
        }
        this.records = next;
      } };
  }
}
class Ref {
  constructor(db, path) { this.db = db;this.path = path;this.id = path.split('/').at(-1); }
  collection(name) { return new Collection(this.db, this.path + '/' + name); }
  async get() { return this.db.snap(this); }
}
class Collection {
  constructor(db, path, condition = null) { this.db = db;this.path = path;this.condition = condition; }
  doc(id) { if (typeof id !== 'string' || !id || id.includes('/')) throw new Error('Invalid document id');return new Ref(this.db, this.path + '/' + id); }
  where(field, operator, value) { if (operator !== '==') throw new Error('Unsupported test query');return new Collection(this.db, this.path, [field, value]); }
  async get() {
    const prefix = this.path + '/', docs = [];
    for (const [path, value] of this.db.records) {
      if (!path.startsWith(prefix) || path.slice(prefix.length).includes('/')) continue;
      if (this.condition && value[this.condition[0]] !== this.condition[1]) continue;
      docs.push(this.db.snap(new Ref(this.db, path)));
    }
    return { docs, size: docs.length };
  }
}
