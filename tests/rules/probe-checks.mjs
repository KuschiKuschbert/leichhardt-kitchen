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
    ['a proof cannot be read back', () => fs.get(K + 'proofs/' + id), false]
  ];
}

/* A tiny Firestore REST client: get(path) and patch(path, fields, updateMask). Refused calls throw { code: 'permission-denied' }. */
export function restClient(base, headers) {
  async function call(method, url, body) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), PROBE_WAIT);
    let res;
    try { res = await fetch(url, { method, headers: Object.assign({ 'content-type': 'application/json' }, headers || {}), body: body ? JSON.stringify(body) : undefined, signal: ctl.signal }); }
    catch (e) { throw { code: ctl.signal.aborted ? 'no answer after ' + PROBE_WAIT / 1000 + ' seconds' : 'error: ' + String(e && e.message || e) }; }
    finally { clearTimeout(t); }
    if (res.ok) return res.json();
    let msg = ''; try { msg = (await res.json()).error.status; } catch (e) {}
    if (res.status === 403 && msg === 'PERMISSION_DENIED') throw { code: 'permission-denied' };
    if (res.status === 401 || res.status === 403) throw { code: 'refused ' + res.status + (msg ? ' ' + msg : '') };
    throw { code: 'http ' + res.status + (msg ? ' ' + msg : '') };
  }
  return {
    get: path => call('GET', base + '/' + path),
    patch: (path, fields, mask) => call('PATCH', base + '/' + path + (mask ? '?' + mask.map(f => 'updateMask.fieldPaths=' + encodeURIComponent(f)).join('&') : ''), { fields })
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
