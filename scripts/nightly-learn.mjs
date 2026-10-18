/*
  Nightly learning for the Kitchen Book. Run by .github/workflows/nightly-learning.yml at 03:00 kitchen time.

  Reads every finished kitchen day (Brisbane, UTC+10) from the last 90 days that has not been learned yet and adds it to
  what the book has learned:
    learned/<item>      the prep list: uses, typed or picked, weekdays (dow, 0 is Sunday), sections (secs), amounts (qtys)
    ordlearned/<item>   the order list: uses, weekdays, amounts
  A day is claimed in learnlog/<date> (prep) and learnlog/o-<date> (orders) in the same batch as its counts, so a day is
  never counted twice and never half counted. Removed lines and rolled-over copies are not counted.

  Needs two secrets: FIREBASE_SA (a service account key, JSON) and KITCHEN_PIN. Nothing secret is ever printed.
  For a test run against the Firestore emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 KITCHEN_PIN=000000 node nightly-learn.mjs
*/
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PIN = process.env.KITCHEN_PIN || '';
const DAYS = +(process.env.LEARN_DAYS || 90);
const ZONE = 10 * 3600000; // Queensland: UTC+10, no daylight saving
if (!/^\d{4,6}$/.test(PIN)) { console.error('KITCHEN_PIN is missing or not 4 to 6 digits.'); process.exit(1); }

if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-test' });
else {
  let sa;
  try { sa = JSON.parse(process.env.FIREBASE_SA || ''); } catch (e) { console.error('FIREBASE_SA is missing or not JSON.'); process.exit(1); }
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}
const db = getFirestore();
const K = db.collection('kitchens').doc(PIN);
const inc = n => FieldValue.increment(n);

// the same keys as js/prep.js (lkey, slug), so the server and the phones write to the same records
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person';
const lkey = t => slug(String(t).toLowerCase()).slice(0, 80);
const pad = n => (n < 10 ? '0' : '') + n;
function kitchenDay(ms) { const d = new Date(ms + ZONE); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
function shift(day, n) { const [y, m, d] = day.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
function dowOf(day) { const [y, m, d] = day.split('-').map(Number); return String(new Date(Date.UTC(y, m - 1, d)).getUTCDay()); }

/* Counts one day's lines into a map of records, ready to write as increments. */
function tally(lines, day, kind) {
  const map = {}, dw = dowOf(day);
  lines.forEach(x => {
    if (!x || x.deleted || x.rolled || !x.text) return;
    const text = String(x.text).trim().slice(0, kind === 'prep' ? 160 : 120), k = lkey(text);
    if (!k) return;
    const m = map[k] = map[k] || { text, n: 0, typed: 0, picked: 0, dow: {}, secs: {}, q: {}, last: 0, by: '' };
    m.n++; m.dow[dw] = (m.dow[dw] || 0) + 1;
    if (kind === 'prep') {
      if (x.recipe) m.picked++; else m.typed++;
      const sk = lkey(x.station || 'general');
      m.secs[sk] = m.secs[sk] || { name: x.station || '', n: 0 }; m.secs[sk].n++;
    }
    const qty = String(x.qty || '').trim().slice(0, 40), qk = lkey(qty).slice(0, 40);
    if (qty && qk) { m.q[qk] = m.q[qk] || { q: qty, n: 0 }; m.q[qk].n++; }
    if ((x.addedAt || 0) >= m.last) { m.last = x.addedAt || 0; m.by = x.addedBy || ''; }
  });
  return map;
}
function record(m, kind, known) {
  const dow = {}, qtys = {};
  Object.keys(m.dow).forEach(d => { dow[d] = inc(m.dow[d]); });
  Object.keys(m.q).forEach(q => { qtys[q] = { q: m.q[q].q, n: inc(m.q[q].n) }; });
  const data = { text: m.text, uses: inc(m.n), dow, qtys };
  if (kind === 'prep') {
    const secs = {};
    Object.keys(m.secs).forEach(sk => { secs[sk] = { name: m.secs[sk].name, n: inc(m.secs[sk].n) }; });
    data.secs = secs;
    if (m.typed) data.typed = inc(m.typed);
    if (m.picked) data.picked = inc(m.picked);
  }
  // the newest use wins, so a catch-up of an old day never makes "last used" go backwards
  if (!known || (known.lastUsed || 0) < m.last) { data.lastUsed = m.last; data.lastBy = m.by; }
  return data;
}

async function learnDay(day, kind) {
  const claimId = kind === 'prep' ? day : 'o-' + day;
  const col = kind === 'prep' ? K.collection('days').doc(day).collection('items') : K.collection('orders').doc(day).collection('lines');
  const target = kind === 'prep' ? 'learned' : 'ordlearned';
  const sn = await col.get();
  const map = tally(sn.docs.map(d => d.data()), day, kind), keys = Object.keys(map);
  const refs = keys.map(k => K.collection(target).doc(k));
  const known = refs.length ? await db.getAll(...refs) : [];
  // one batch per day: the claim and the counts land together or not at all (up to 498 items a day)
  const batch = db.batch();
  batch.create(K.collection('learnlog').doc(claimId), { at: Date.now(), who: 'server', kind: kind === 'prep' ? 'nightly' : 'order-nightly' });
  keys.slice(0, 498).forEach((k, i) => batch.set(refs[i], record(map[k], kind, known[i].exists ? known[i].data() : null), { merge: true }));
  try { await batch.commit(); }
  catch (e) { if (e.code === 6 || /ALREADY_EXISTS/.test(e.message)) return { day, kind, skipped: true }; throw e; }
  return { day, kind, lines: sn.size, items: keys.length };
}

const today = kitchenDay(Date.now());
const claimed = new Set((await K.collection('learnlog').select().get()).docs.map(d => d.id));
const todo = [];
for (let i = 1; i <= DAYS; i++) {
  const d = shift(today, -i);
  if (!claimed.has(d)) todo.push([d, 'prep']);
  if (!claimed.has('o-' + d)) todo.push([d, 'order']);
}
let n = 0, lines = 0;
for (const [d, kind] of todo) {
  const r = await learnDay(d, kind);
  if (!r.skipped) { n++; lines += r.lines; }
}
console.log('Learned ' + n + ' kitchen days (' + lines + ' lines). Up to ' + shift(today, -1) + ' (kitchen time).');
