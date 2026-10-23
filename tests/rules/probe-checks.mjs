/*
  The lock probe: what the published rules must refuse from a client that holds only the kitchen PIN, and one read they
  must allow (so a dead connection or a wrong PIN never passes as "everything refused"). Shared by probe.mjs (the live
  book, run by the Publish rules and Lock probe workflows) and probe.test.mjs (the emulator, run with the rules tests).
  It talks to Firestore over plain HTTPS (the REST API), like a browser without the SDK: the rules apply the same way,
  and once App Check is enforced the request carries the App Check token in a header. Nothing here can change the
  book: every write is one the rules refuse, and the one allowed call is a read.
*/
export const PROBE_WAIT = 60000;

/* base: 'https://firestore.googleapis.com/v1/projects/<id>/databases/(default)/documents' (or the emulator's),
   headers: what every request carries (the App Check token, the emulator's owner header: none here) */
export function probeChecks(fs, pin) {
  const K = 'kitchens/' + pin + '/', day = new Date().toISOString().slice(0, 10), id = 'probe-' + Date.now();
  const str = s => ({ stringValue: s }), num = n => ({ integerValue: String(n) }), bool = b => ({ booleanValue: b });
  return [
    ['the kitchen PIN opens the book: config/main can be read', () => fs.get(K + 'config/main'), true],
    ['a wrong kitchen PIN reads nothing', () => fs.get('kitchens/0/config/main'), false],
    ['nobody can read a PIN hash', () => fs.get(K + 'staffpins/' + id), false],
    ['a prep line with a writer id and no PIN proof is refused', () => fs.patch(K + 'days/' + day + '/items/' + id, { text: str('probe'), station: str(''), qty: str(''), recipe: str(''), addedBy: str('Probe'), addedById: str('probe'), addedAt: num(Date.now()), done: bool(false), deleted: bool(false), by: str('probe') }), false],
    ['the config cannot be changed without the head chef account', () => fs.patch(K + 'config/main', { probe: num(1) }, ['probe']), false],
    ['a PIN hash cannot be planted', () => fs.patch(K + 'staffpins/' + id, { hash: str('a'.repeat(64)) }), false],
    ['a recipe cannot be changed with only the kitchen PIN', () => fs.patch(K + 'recipes/' + id, { r: { mapValue: { fields: { id: str(id), kind: str('main'), name: str('Probe') } } }, v: num(1), upd: num(Date.now()), by: str('probe') }), false],
    ['a drawing cannot be changed with only the kitchen PIN', () => fs.patch(K + 'drawings/' + id, { slot: str('plate'), vb: str('0 0 10 10'), svgS: str(''), svgF: str(''), v: num(1), upd: num(Date.now()), by: str('probe') }), false],
    ['a template or library piece cannot be saved with only the kitchen PIN', () => fs.patch(K + 'drawlib/' + id, { type: str('item'), name: str('Probe'), body: str('<circle r="1"/>'), w: num(1), h: num(1), v: num(1), upd: num(Date.now()), by: str('probe') }), false],
    ['the head chef\'s recipe index cannot be changed with only the kitchen PIN', () => fs.patch(K + 'book/index', { probe: num(1) }, ['probe']), false],
    ['a function booking cannot be saved with only the kitchen PIN', () => fs.patch(K + 'functions/' + id, { v: num(1), status: str('draft'), name: str('Probe'), upd: num(Date.now()), by: str('probe') }), false],
    ['a function contact cannot be saved with only the kitchen PIN', () => fs.patch(K + 'fncontact/' + id, { cname: str('Probe'), upd: num(Date.now()), by: str('probe') }), false],
    ['a proof cannot be read back', () => fs.get(K + 'proofs/' + id), false],
    // PIN sessions (22 Oct 2026): a try and a session need the phone's own Firebase sign-in, which a script with only the
    // kitchen PIN does not have, and nobody reads them
    ['a PIN try cannot be written without a phone sign-in', () => fs.patch(K + 'tries/' + id, { tok: str('a'.repeat(64)), at: { timestampValue: new Date().toISOString() }, uid: str('probe') }), false],
    ['a PIN session cannot be opened with only the kitchen PIN', () => fs.patch(K + 'sessions/' + id, { by: str('probe'), pinAt: num(1), exp: num(Date.now() + 86400000), at: { timestampValue: new Date().toISOString() } }), false],
    ['a PIN session cannot be read', () => fs.get(K + 'sessions/' + id), false],
    // function contacts and minutes drafts (22 Oct 2026, review S9): a contact only for function managers, a draft only
    // for the head chef's Google account (a list of minutes by date could hold drafts)
    ['a function contact cannot be read with only the kitchen PIN', () => fs.get(K + 'fncontact/' + id), false],
    ['minutes drafts cannot be listed with only the kitchen PIN', () => fs.query('kitchens/' + pin, 'minutes', 'date', 'GREATER_THAN_OR_EQUAL', str('2000-01-01')), false],
    // the chef to-do list (23 Oct 2026): only the head chef and the sous chefs read or write it
    ['the chef to-do list cannot be listed with only the kitchen PIN', () => fs.query('kitchens/' + pin, 'todos', 'st', 'EQUAL', str('open')), false],
    ['a chef to-do cannot be saved with only the kitchen PIN', () => fs.patch(K + 'todos/' + id, { text: str('Probe'), st: str('open'), at: num(1), doneAt: num(0), upd: num(1), by: str('probe') }), false]
  ];
}

/* A tiny Firestore REST client: get(path), patch(path, fields, updateMask) and query(parent, collection, field, op, value)
   (one filter, at most one record back). Refused calls throw { code: 'permission-denied' }. */
export function restClient(base, headers) {
  async function call(method, url, body) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), PROBE_WAIT);
    let res;
    try { res = await fetch(url, { method, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}), body: body ? JSON.stringify(body) : undefined, signal: ctl.signal }); }
    catch (e) { throw { code: ctl.signal.aborted ? 'no answer after ' + PROBE_WAIT / 1000 + ' seconds' : 'error: ' + String(e && e.message || e) }; }
    finally { clearTimeout(t); }
    if (res.ok) return res.json();
    // a refused query (runQuery) answers with a list holding the error; the other calls with the error itself
    let msg = ''; try { const j = await res.json(); msg = (Array.isArray(j) ? j[0] : j).error.status; } catch (e) {}
    if (res.status === 403 && msg === 'PERMISSION_DENIED') throw { code: 'permission-denied' };
    if (res.status === 401 || res.status === 403) throw { code: 'refused ' + res.status + (msg ? ' ' + msg : '') };
    throw { code: 'http ' + res.status + (msg ? ' ' + msg : '') };
  }
  return {
    get: path => call('GET', base + '/' + path),
    patch: (path, fields, mask) => call('PATCH', base + '/' + path + (mask ? '?' + mask.map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&') : ''), { fields }),
    query: (parent, col, field, op, value) => call('POST', base + '/' + parent + ':runQuery', { structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: field }, op, value } }, limit: 1 } })
  };
}

/* Runs the checks. Each line is PASS or FAIL with what came back; the PIN never appears in the output. */
export async function runProbe(fs, pin, log) {
  let fails = 0;
  for (const [name, fn, allowed] of probeChecks(fs, pin)) {
    let got = 'allowed';
    try { await fn(); }
    catch (e) { got = e && e.code ? String(e.code) : 'error: ' + String(e && e.message || e); }
    got = got.split(pin).join('****');
    const ok = allowed ? got === 'allowed' : got === 'permission-denied';
    if (!ok) fails++;
    log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' (got ' + got + ')'));
  }
  return fails;
}
