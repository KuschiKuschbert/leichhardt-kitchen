/*
  The lock probe: what the published rules must refuse from a phone that holds only the kitchen PIN, and one read they
  must allow (so a dead connection or a wrong PIN never passes as "everything refused"). Shared by probe.mjs (the live
  book, run by the Publish rules and Lock probe workflows) and probe.test.mjs (the emulator, run with the rules tests).
  Nothing here can change the book: every write is one the rules refuse, and the one allowed call is a read.
*/
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const PROBE_WAIT = 60000;

export function probeChecks(db, pin) {
  const K = 'kitchens/' + pin + '/', day = new Date().toISOString().slice(0, 10), id = 'probe-' + Date.now();
  return [
    ['the kitchen PIN opens the book: config/main can be read', () => getDoc(doc(db, K + 'config/main')), true],
    ['a wrong kitchen PIN reads nothing', () => getDoc(doc(db, 'kitchens/0/config/main')), false],
    ['nobody can read a PIN hash', () => getDoc(doc(db, K + 'staffpins/' + id)), false],
    ['a prep line with a writer id and no PIN proof is refused', () => setDoc(doc(db, K + 'days/' + day + '/items/' + id), { text: 'probe', station: '', qty: '', recipe: '', addedBy: 'Probe', addedById: 'probe', addedAt: Date.now(), done: false, deleted: false, by: 'probe' }), false],
    ['the config cannot be changed without the head chef account', () => setDoc(doc(db, K + 'config/main'), { probe: 1 }, { merge: true }), false],
    ['a PIN hash cannot be planted', () => setDoc(doc(db, K + 'staffpins/' + id), { hash: 'a'.repeat(64) }), false],
    ['a proof cannot be read back', () => getDoc(doc(db, K + 'proofs/' + id)), false]
  ];
}

/* Runs the checks. Each line is PASS or FAIL with what came back; the PIN never appears in the output. */
export async function runProbe(db, pin, log) {
  let fails = 0;
  for (const [name, fn, allowed] of probeChecks(db, pin)) {
    let got = 'allowed';
    try { await withWait(fn(), PROBE_WAIT); }
    catch (e) { got = e && e.code ? String(e.code) : 'error: ' + String(e && e.message || e); }
    got = got.split(pin).join('****');
    const ok = allowed ? got === 'allowed' : got === 'permission-denied';
    if (!ok) fails++;
    log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' (got ' + got + ')'));
  }
  return fails;
}

function withWait(p, ms) {
  return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('no answer after ' + ms / 1000 + ' seconds')), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); });
}
