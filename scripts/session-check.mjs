/*
  Session check (22 Oct 2026, review S8): are the phones ready for phase 2 of PIN sessions, when the rules stop
  accepting the older PIN proof? Run by .github/workflows/session-check.yml from the Actions tab. Reads only.

  For each person on the staff list it shows when they were last seen in the book (activity lastSeen), when a phone
  last wrote as them the older way (proofs/<id> at) and their newest PIN session (sessions/<uid>). A phone that opened
  the book since phase 1 went live (SINCE) opens a session within seconds, so:
    - someone seen since SINCE with no running session, or
    - an older-way write after SINCE with no session opened within 2 minutes of it
  means a phone that cannot open a session (its Firebase sign-in fails). Phase 2 would stop that phone saving.

  The log of a public repository is public: no names, ids, PINs or PIN fingerprints are printed. People are shown by
  their place on the staff list (as in the admin People tab) and their role.
  Needs FIREBASE_SA and KITCHEN_PIN. Emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 KITCHEN_PIN=000000 node session-check.mjs
*/
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PIN = process.env.KITCHEN_PIN || '';
const SINCE = Date.parse(process.env.SINCE || '2026-10-22T10:15:00Z');   // phase 1 live on every phone that opened since
const ZONE = 10 * 3600000;   // Queensland: UTC+10, no daylight saving
if (!/^\d{4,6}$/.test(PIN)) { console.error('KITCHEN_PIN is missing or not 4 to 6 digits.'); process.exit(1); }
if (!SINCE) { console.error('SINCE is not a time.'); process.exit(1); }
if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-test' });
else {
  let sa;
  try { sa = JSON.parse(process.env.FIREBASE_SA || ''); } catch (e) { console.error('FIREBASE_SA is missing or not JSON.'); process.exit(1); }
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}
const db = getFirestore(), K = db.collection('kitchens').doc(PIN);
const ms = v => (v && typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : 0);
const pad = n => (n < 10 ? '0' : '') + n;
function when(t) {
  if (!t) return '-';
  const d = new Date(t + ZONE);
  return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}
const byId = snap => { const m = {}; snap.docs.forEach(d => { m[d.id] = d.data(); }); return m; };

const [cfgSn, sessSn, setSn, proofSn, actSn] = await Promise.all([K.collection('config').doc('main').get(), K.collection('sessions').get(),
  K.collection('pinset').get(), K.collection('proofs').get(), K.collection('activity').get()]);
const cfg = cfgSn.exists ? cfgSn.data() : {}, pinset = byId(setSn), proofs = byId(proofSn), act = byId(actSn), t = Date.now();
const people = (cfg.people || []).filter(p => p && p.id && p.active !== false && (!cfg.staffIds || cfg.staffIds.indexOf(p.id) >= 0));
// running sessions per person: not run out, and opened with the person's current PIN
const sess = {};
sessSn.docs.forEach(d => {
  const s = d.data(), ps = pinset[s.by];
  if (!s.by || !(s.exp > t) || !ps || ps.at !== s.pinAt) return;
  const x = sess[s.by] = sess[s.by] || { n: 0, at: 0 };
  x.n++; x.at = Math.max(x.at, ms(s.at));
});

console.log('Phase 1 of PIN sessions went live before ' + when(SINCE) + ' (kitchen time). Now ' + when(t) + '.');
console.log('Running sessions: ' + Object.values(sess).reduce((a, x) => a + x.n, 0) + ', for ' + Object.keys(sess).length + ' of ' + people.length + ' people on the list.');
console.log('');
console.log('  #  role    last seen     older-way write  newest session  sessions  note');
let notSeen = 0, problems = 0;
people.forEach((p, i) => {
  const seen = +(act[p.id] && act[p.id].lastSeen) || 0, pf = ms(proofs[p.id] && proofs[p.id].at), s = sess[p.id] || { n: 0, at: 0 };
  let note = '';
  if (!pinset[p.id]) note = 'no PIN yet';
  else if (seen >= SINCE && !s.n) { note = 'SEEN SINCE, NO SESSION'; problems++; }
  else if (pf >= SINCE && !(s.at && s.at >= pf - 120000)) { note = 'OLDER-WAY WRITE, NO SESSION AFTER IT'; problems++; }
  else if (seen < SINCE) { note = 'not seen since'; notSeen++; }
  console.log(String(i + 1).padStart(3) + '  ' + String(p.role || '').padEnd(6) + '  ' + when(seen).padEnd(12) + '  ' + when(pf).padEnd(15) + '  ' + when(s.at).padEnd(14) + '  ' + String(s.n).padStart(8) + '  ' + note);
});
console.log('');
if (problems) console.log('NOT READY: ' + problems + ' ' + (problems === 1 ? 'person has' : 'people have') + ' a phone that saves without a session. Phase 2 would stop it saving. Find out why first (that phone\'s Firebase sign-in).');
else console.log('Ready for phase 2: everyone seen since phase 1 has a running session, and no phone saves the older way.' +
  (notSeen ? ' ' + notSeen + ' ' + (notSeen === 1 ? 'person has' : 'people have') + ' not opened the book since: their phone moves over by itself when it opens (they may be asked for their PIN once).' : ''));
process.exit(0);
