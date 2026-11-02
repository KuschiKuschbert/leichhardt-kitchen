// The Firestore stand-in keeps synthetic server records across reloads, but the real client's memoryLocalCache does
// not keep its read copy. Exercise the public SDK contract rather than storage keys so read budgets see that boundary.
const L = require('./lib');
const { R, ok } = L.results();
const path = ['kitchens', L.PIN, 'days', '2010-01-01', 'items'];
const key = path.join('/');
const extra = {};
extra[key + '/one'] = { text: 'Cache lifetime one', done: true, addedAt: 1 };
extra[key + '/two'] = { text: 'Cache lifetime two', done: true, addedAt: 2 };
extra[key + '/unread'] = { text: 'Never successfully read', done: true, addedAt: 3 };

async function ready(p) {
  await L.waitFor(p, () => !!window.LK_PREP);
  await p.evaluate(() => LK_PREP.book().ready().then(() => true));
  await L.waitFor(p, () => LK_PREP.state.authed && LK_PREP.state.configState === 'ok');
}
async function cached(p) {
  return p.evaluate(async path => {
    const b = LK_PREP.book(), f = b.fs(), db = b.db(), col = f.collection(db, ...path);
    const q = f.query(col, f.where('addedAt', '<=', 2));
    const billed = () => __fake.bill.filter(x => x.path.indexOf(path.join('/')) === 0).reduce((n, x) => n + x.n, 0);
    const before = billed();
    async function doc(id) { try { const s = await f.getDocFromCache(f.doc(col, id)); return { found: s.exists(), text: s.exists() ? s.data().text : '' }; } catch (e) { return { error: e.code }; } }
    const one = await doc('one'), missing = await doc('missing'), unread = await doc('unread');
    const lines = (await f.getDocsFromCache(q)).docs.map(x => x.data().text).sort();
    return { one, missing, unread, lines, reads: billed() - before };
  }, path);
}
async function read(p) {
  return p.evaluate(async path => {
    const b = LK_PREP.book(), f = b.fs(), col = f.collection(b.db(), ...path);
    const docs = await f.getDocs(f.query(col, f.where('addedAt', '<=', 2)));
    const missing = await f.getDoc(f.doc(col, 'missing'));
    return { lines: docs.docs.map(x => x.data().text).sort(), missing: missing.exists() };
  }, path);
}

(async () => {
  const b = await L.start(), p = await L.open(b, '#/recipes', { admin: true, extra, wait: 1200 });
  await ready(p);
  let c = await cached(p);
  ok(c.one.error === 'unavailable' && c.missing.error === 'unavailable' && c.lines.length === 0, 'an unread historical query has an empty memory copy while synthetic server records exist');
  const first = await read(p);
  ok(first.lines.join('|') === 'Cache lifetime one|Cache lifetime two' && !first.missing, 'server reads return the two matching records and establish a missing document');
  c = await cached(p);
  ok(c.one.found && c.one.text === 'Cache lifetime one' && c.lines.length === 2, 'successful reads populate this page\'s document and query cache');
  ok(c.missing.found === false && !c.missing.error, 'a missing document is known in memory only after its successful server read');
  ok(c.unread.error === 'unavailable' && c.reads === 0, 'cache reads neither expose unread records nor bill server reads');

  await p.evaluate(() => { location.hash = '#/settings'; }); await L.settle(p, 300);
  c = await cached(p);
  ok(c.one.found && c.lines.length === 2, 'same-page navigation retains the memory copy');

  await p.reload(); await ready(p);
  c = await cached(p);
  ok(c.one.error === 'unavailable', 'a full reload loses the historical document memory copy');
  ok(c.missing.error === 'unavailable', 'a full reload also forgets a previously known missing document');
  ok(c.lines.length === 0 && c.reads === 0, 'a full reload starts the historical query cache empty without billing a server read');
  const again = await read(p);
  ok(again.lines.join('|') === first.lines.join('|') && !again.missing, 'reloading retains the synthetic server fixtures, which can be fetched again');

  await p.evaluate(key => { __fake.failReads = new RegExp(key + '/unread$'); }, key);
  const failed = await p.evaluate(async path => {
    const b = LK_PREP.book(), f = b.fs(), ref = f.doc(b.db(), ...path, 'unread');
    let server, cache;
    try { await f.getDoc(ref); } catch (e) { server = e.code; }
    try { await f.getDocFromCache(ref); } catch (e) { cache = e.code; }
    return { server, cache };
  }, path);
  ok(failed.server === 'unavailable' && failed.cache === 'unavailable', 'a failed server read cannot warm the document cache');
  ok(p.errors.length === 0, 'memory-cache lifetime journey has no page errors ' + p.errors.join(' | '));
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
