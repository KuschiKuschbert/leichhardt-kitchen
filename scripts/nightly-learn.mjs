/*
  Nightly learning for the Kitchen Book. Run by .github/workflows/nightly-learning.yml at 03:00 kitchen time.

  Reads every finished kitchen day (Brisbane, UTC+10) from the last 90 days that has not been learned yet and adds it to
  what the book has learned:
    learned/<item>      the prep list: uses, typed or picked, weekdays (dow, 0 is Sunday), sections (secs), amounts (qtys)
    ordlearned/<item>   the order list: uses, weekdays, amounts
  A day is claimed in learnlog/<date> (prep) and learnlog/o-<date> (orders) in the same batch as its counts, so a day is
  never counted twice and never half counted. Removed lines and rolled-over copies are not counted.

  It also writes summary/waste (22 Oct 2026): what was wasted in the last 14 finished days, one small record. The phones
  read it once a day for the Logged often chips, the suggestions and the waste hints on the prep and order lists, so a
  staff phone never reads past wastage lines (the rules let only the head chef's Google account read them).

  Then summary/transfers (23 Oct 2026): what was shared with other venues in the last 28 finished days, by venue (which
  way, who came for it or gave it) and by item (the usual unit, amount, way and venue). The phones read it once a day for
  the venue and item chips on the transfers page, so a staff phone never reads past transfer lines either. A problem
  there is logged and never stops the learning.

  And summary/learned and summary/ordlearned (22 Oct 2026): the most used 500 prep items and 300 order items, the same
  lists every phone used to read item by item (about 380 reads a phone a day), as one record each, so a phone reads 2.
  Written after the day's learning, so they hold last night's counts.

  summary/learned also holds lists (22 Oct 2026): when tomorrow's prep list was written on each of the last 28 nights
  and the usual time, worked out by js/learn.js (the same code the phones run). The phones roll over what was written
  before it and treat what was written from then on as tomorrow's list. No new reads on the phones.

  Needs two secrets: FIREBASE_SA (a service account key, JSON) and KITCHEN_PIN. Nothing secret is ever printed.
  For a test run against the Firestore emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 KITCHEN_PIN=000000 node nightly-learn.mjs
*/
import { syncTransfers } from './transfer-index.mjs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createRequire } from 'module';
const LEARN = createRequire(import.meta.url)('../js/learn.js');

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
function kitchenMins(ms) { const d = new Date(ms + ZONE); return d.getUTCHours() * 60 + d.getUTCMinutes(); }
const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
function shift(day, n) { const [y, m, d] = day.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
function dowOf(day) { const [y, m, d] = day.split('-').map(Number); return String(new Date(Date.UTC(y, m - 1, d)).getUTCDay()); }

/* Counts one day's lines into a map of records, ready to write as increments. */
function tally(lines, day, kind) {
  const map = {}, dw = dowOf(day);
  lines.forEach(x => {
    if (!x || x.deleted || x.rolled || x.fn || x.tst || !x.text) return;   // fn: a function's platters, not a usual job; tst: practice
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

const seen = {};   // the prep days learnDay() read tonight: day -> its lines
async function learnDay(day, kind) {
  const claimId = kind === 'prep' ? day : 'o-' + day;
  const col = kind === 'prep' ? K.collection('days').doc(day).collection('items') : K.collection('orders').doc(day).collection('lines');
  const target = kind === 'prep' ? 'learned' : 'ordlearned';
  const sn = await col.get();
  if (kind === 'prep') seen[day] = sn.docs.map(d => d.data());   // for listTimes(), so the day is not read twice
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

/* What was wasted in the last 14 finished days, by item: how often, the reasons, the usual unit, reason, section and
   amount, and what was used the last time. The same key as okey() in js/prep.js. */
const okey = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim();
const top = o => Object.keys(o).sort((a, b) => o[b] - o[a])[0] || '';
// every map below is keyed by typed words, so none has inherited keys: an item, reason or section typed as "constructor" or "__proto__" counts like any other word
const map = () => Object.create(null);
const WASTE_DAYS = 14, WASTE_ITEMS = 300;
async function wasteSummary(today) {
  const days = [];
  for (let i = 1; i <= WASTE_DAYS; i++) days.push(shift(today, -i));
  const snaps = await Promise.all(days.map(d => K.collection('waste').doc(d).collection('lines').get()));
  const m = map();
  snaps.forEach(sn => sn.docs.forEach(doc => {
    const x = doc.data(); if (!x || x.deleted || x.tst || !x.text) return;   // tst: written in practice mode
    const text = String(x.text).trim().slice(0, 80), k = okey(text); if (!k) return;
    const e = m[k] = m[k] || { t: text, n: 0, r: map(), u: map(), s: map(), a: map(), at: -1, last: null };
    const amt = +x.amount || 0, sec = String(x.station || '').slice(0, 40);
    e.n++; e.r[x.reason] = (e.r[x.reason] || 0) + 1; e.u[x.unit] = (e.u[x.unit] || 0) + 1;
    if (sec) e.s[sec] = (e.s[sec] || 0) + 1;
    if (amt > 0) { const ak = amt + ' ' + x.unit; e.a[ak] = (e.a[ak] || 0) + 1; }
    if ((x.addedAt || 0) > e.at) { e.at = x.addedAt || 0; e.t = text; e.last = { unit: x.unit || '', reason: x.reason || '', sec, amt }; }
  }));
  const items = Object.keys(m).map(k => {
    const e = m[k], ta = top(e.a);
    return { t: e.t, n: e.n, r: Object.fromEntries(Object.entries(e.r)), unit: top(e.u), reason: top(e.r), sec: top(e.s), amt: ta ? +ta.split(' ')[0] : 0, last: e.last, at: e.at };
  }).sort((a, b) => b.n - a.n || b.at - a.at).slice(0, WASTE_ITEMS);
  await K.collection('summary').doc('waste').set({ day: today, from: days[days.length - 1], to: days[0], items, at: Date.now() });
  return items.length;
}

/* What was shared with other venues in the last 28 finished days (23 Oct 2026). By venue: how many lines, how many each
   way and who came for it or gave it. By item: how many lines and the usual unit, amount, way and venue. Venues, items
   and people are grouped by okey(), and each shows the spelling used most (an item's venue the same as the venue list).
   A tie goes to the most recent. Reads, every night: 28 queries (one per day, an empty day still costs 1) plus one read
   per transfer line in those days. Every map is keyed by typed words, so none has inherited keys (map()): an item,
   venue or person typed as "constructor" or "__proto__" counts like any other word. */
const TR_DAYS = 28, TR_VENUES = 30, TR_ITEMS = 200, TR_PEOPLE = 6;
const tidy = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
// one more of the words s in o, under okey(s) with each spelling, and when each was last seen (more: the group's own fields)
function tick(o, s, at, more) {
  const k = okey(s), c = o[k] = o[k] || Object.assign({ n: 0, at: -1, s: map() }, more), w = c.s[s] = c.s[s] || { n: 0, at: -1 };
  c.n++; w.n++; c.at = Math.max(c.at, at); w.at = Math.max(w.at, at);
  return c;
}
const most = o => Object.keys(o || {}).sort((a, b) => o[b].n - o[a].n || o[b].at - o[a].at);   // used most first, then the most recent
const word = c => (c ? most(c.s)[0] : '') || '';   // the spelling used most
async function transferSummary(today) {
  const days = [];
  for (let i = 1; i <= TR_DAYS; i++) days.push(shift(today, -i));
  const snaps = await Promise.all(days.map(d => K.collection('transfers').doc(d).collection('lines').get()));
  const vs = map(), its = map();
  snaps.forEach(sn => sn.docs.forEach(doc => {
    const x = doc.data(); if (!x || x.deleted || x.tst) return;   // tst: written in practice mode
    const text = tidy(x.text, 80), venue = tidy(x.venue, 40); if (!okey(text) || !okey(venue)) return;
    const at = +x.addedAt || 0, dir = x.dir === 'in' ? 'in' : 'out', unit = tidy(x.unit, 10), amt = +x.amount || 0, who = tidy(x.person, 40);
    const v = tick(vs, venue, at, { out: 0, in: 0, p: map() }), e = tick(its, text, at, { u: map(), a: map(), d: map(), v: map() });
    v[dir]++; if (who) tick(v.p, who, at);
    tick(e.d, dir, at); tick(e.v, venue, at);
    if (unit) { tick(e.u, unit, at); if (amt > 0) tick(e.a[okey(unit)] = e.a[okey(unit)] || map(), String(amt), at); }
  }));
  const venues = most(vs).slice(0, TR_VENUES).map(k => {
    const v = vs[k];
    return { v: word(v), n: v.n, out: v.out, in: v.in, people: most(v.p).slice(0, TR_PEOPLE).map(p => word(v.p[p])) };
  });
  const items = most(its).slice(0, TR_ITEMS).map(k => {
    const e = its[k], uk = most(e.u)[0] || '', ak = most(e.a[uk])[0];
    return { t: word(e), n: e.n, unit: word(e.u[uk]), amt: ak ? +ak : 0, dir: most(e.d)[0] || 'out', venue: word(vs[most(e.v)[0]]) };
  });
  await K.collection('summary').doc('transfers').set({ day: today, from: days[days.length - 1], to: days[0], venues, items, at: Date.now() });
  return [items.length, venues.length];
}

const today = kitchenDay(Date.now());
// first, so a problem with one day's learning never leaves the phones without a fresh wastage summary
// on its own, like the transfers: a problem there is logged (the error only) and the learning goes on
try {
  const wItems = await wasteSummary(today);
  console.log('Wastage summary: ' + wItems + ' items from the last ' + WASTE_DAYS + ' days.');
} catch (e) { console.error('Wastage summary failed (' + String((e && (e.code || e.name)) || 'error') + '). The log leaves out the message: it can hold a typed name.'); process.exitCode = 1; }
// then the transfers, on their own: a problem there is logged (counts and the error only) and the learning goes on
try {
  const [tItems, tVenues] = await transferSummary(today);
  console.log('Transfer summary: ' + tItems + ' items, ' + tVenues + ' venues from ' + TR_DAYS + ' days.');
} catch (e) { console.error('Transfer summary failed (' + String((e && (e.code || e.name)) || 'error') + '). The log leaves out the message: it can hold a typed name.'); process.exitCode = 1; }
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

// Usage and speed counts (22 Oct 2026): the phones send one record a day each (daily/<day>_<tag>). Yesterday's are added
// into summary/usage, which keeps the last 28 days (one small record the admin panel reads once a day), and records older
// than 7 days are deleted, so nothing per phone is kept longer than a week.
const USE_DAYS = 28, KEEP_DAILY = 7;
async function usageSummary() {
  const yday = shift(today, -1);
  const got = await K.collection('daily').where('day', '==', yday).get();
  const sg = {}, pf = {};
  got.docs.forEach(d => {
    const x = d.data() || {};
    Object.keys(x.sg || {}).forEach(f => { const e = x.sg[f] || {}, o = sg[f] = sg[f] || { s: 0, t: 0, d: 0 }; ['s', 't', 'd'].forEach(k => { o[k] += Math.max(0, Math.min(1000, +e[k] || 0)); }); });
    Object.keys(x.pf || {}).forEach(k => { const a = Array.isArray(x.pf[k]) ? x.pf[k] : []; const o = pf[k] = pf[k] || a.map(() => 0); a.forEach((v, i) => { if (i < o.length) o[i] += Math.max(0, Math.min(1000, +v || 0)); }); });
  });
  const ref = K.collection('summary').doc('usage'), old = ((await ref.get()).data() || {}).days || {};
  const days = {};
  Object.keys(old).filter(d => d >= shift(today, -USE_DAYS)).forEach(d => { days[d] = old[d]; });
  days[yday] = { phones: got.size, sg, pf };
  await ref.set({ day: today, days, at: Date.now() });
  const gone = await K.collection('daily').where('day', '<', shift(today, -KEEP_DAILY)).get();
  for (let i = 0; i < gone.docs.length; i += 400) { const b = db.batch(); gone.docs.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
  return [got.size, gone.size];
}
const [uN, uGone] = await usageSummary();
console.log('Usage: ' + uN + ' phone records for yesterday, ' + uGone + ' older than ' + KEEP_DAILY + ' days deleted.');
// the lists the phones read once a day, as one record each (fields the phones use only, so each stays well under 1 MB)
const LEARN_TOP = 500, ORD_TOP = 300;
async function listSummary(col, n, keep, extra) {
  const sn = await K.collection(col).orderBy('uses', 'desc').limit(n).get();
  const items = sn.docs.map(d => { const x = d.data(), o = { id: d.id }; keep.forEach(k => { if (x[k] != null && x[k] !== '') o[k] = x[k]; }); return o; });
  await K.collection('summary').doc(col).set(Object.assign({ day: today, n: items.length, items, at: Date.now() }, extra || {}));
  return items.length;
}
/* When tomorrow's list was written on each of the last 28 finished nights (js/learn.js), kept in summary/learned. A night
   already in last night's summary is not read again; a night learnDay() read tonight is not read twice. So the first run
   reads up to 28 days of prep lines once, and after that nothing extra. */
const LIST_DAYS = 28;
async function listTimes() {
  const old = (((await K.collection('summary').doc('learned').get()).data() || {}).lists || {}).days || {};
  const clock = { day: kitchenDay, mins: kitchenMins }, days = {};
  let read = 0;
  for (let i = 1; i <= LIST_DAYS; i++) {
    const d = shift(today, -i), o = old[d];
    if (seen[d]) days[d] = LEARN.listStart(seen[d], d, clock);
    else if (o && typeof o.m === 'number') days[d] = { m: o.m, n: +o.n || 0 };
    else { read++; days[d] = LEARN.listStart((await K.collection('days').doc(d).collection('items').get()).docs.map(x => x.data()), d, clock); }
  }
  const u = LEARN.usual(days);
  return { lists: { days, usual: u.usual, dow: u.dow, n: u.n }, read };
}
const LT = await listTimes(), yl = LT.lists.days[shift(today, -1)];
console.log("Tomorrow's list: " + (LT.lists.usual >= 0 ? 'usually from ' + hhmm(LT.lists.usual) : 'not clocked yet') + ' (' + LT.lists.n + ' of the last ' + LIST_DAYS + ' nights). ' +
  'Last night: ' + (yl && yl.m >= 0 ? 'from ' + hhmm(yl.m) + ', ' + yl.n + ' lines' : 'no list found') + '. ' + LT.read + ' nights read again.');
const nL = await listSummary('learned', LEARN_TOP, ['text', 'uses', 'typed', 'picked', 'dow', 'secs', 'qtys', 'lastUsed', 'hidden'], { lists: LT.lists });
const nO = await listSummary('ordlearned', ORD_TOP, ['text', 'uses', 'dow', 'qtys', 'hidden']);
console.log('Summaries for the phones: ' + nL + ' prep items, ' + nO + ' order items.');

// Repair the index for transfers logged by a phone running the previous app.
await syncTransfers(K);
