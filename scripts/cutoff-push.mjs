/*
  Phone pushes for order cut-offs (24 Oct 2026). Run by .github/workflows/cutoff-push.yml every 10 minutes.

  Reads the cut-offs the head chef set (config/main cutoffs) and works out, with js/cutoffs.js (the same code the
  phones draw the bar with), which cut-offs today and tomorrow are due a push:
    start  when the supplier's reminder starts (Remind us: 4, 6 or 8 hours before; all day: 08:00, or 4 hours before
           a cut-off earlier than 12:00), so an early cut-off is pushed the night before
    now    1 hour before the cut-off ("Order now")
  Each goes once, to every phone a chef turned pushes on for (push/<id> { tok, by }, by a sous chef, the head chef or
  'owner'), through Firebase Cloud Messaging. A run that comes late still sends, as long as the cut-off has not passed;
  only the newest push is sent if both are due. Sent pushes are kept in pushsent/<cut-off day> { sent: { <supplier
  id>|<day>: start|now } }; a push no phone got because Firebase failed is tried again on the next run.
  A cut-off a chef ticked off as ordered (the Supplier orders tick list or Ordered on the bar: cutdone/<day>_<supplier
  id> with on true) gets no more pushes; one whose tick was taken off again (on false) does.
  A phone address Firebase says is gone is removed.

  Reads: config/main every run (1); only when a push is due, pushsent for that day and the tick of each cut-off due
  (1 each) and the push addresses (1 per phone). About 150 to 200 reads a day.

  Needs two secrets: FIREBASE_SA (a service account key, JSON) and KITCHEN_PIN. Nothing secret is printed, and no names:
  the log is public, so it says only how many pushes went.
  Against the Firestore emulator (FIRESTORE_EMULATOR_HOST set) nothing is sent: it prints what it would send, as JSON.
  PUSH_NOW (ms) sets the time, for tests.
*/
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { createRequire } from 'module';
const CUT = createRequire(import.meta.url)('../js/cutoffs.js');

const PIN = process.env.KITCHEN_PIN || '';
const ZONE = 10 * 3600000; // Queensland: UTC+10, no daylight saving
const DRY = !!process.env.FIRESTORE_EMULATOR_HOST;
if (!/^\d{4,6}$/.test(PIN)) { console.error('KITCHEN_PIN is missing or not 4 to 6 digits.'); process.exit(1); }

if (DRY) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-test' });
else {
  let sa;
  try { sa = JSON.parse(process.env.FIREBASE_SA || ''); } catch (e) { console.error('FIREBASE_SA is missing or not JSON.'); process.exit(1); }
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}
const db = getFirestore();
const K = db.collection('kitchens').doc(PIN);

const pad = n => (n < 10 ? '0' : '') + n;
const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
function shift(day, n) { const [y, m, d] = day.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
const left = m => m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '');

const nowMs = +process.env.PUSH_NOW || Date.now(), k = new Date(nowMs + ZONE);
const today = k.getUTCFullYear() + '-' + pad(k.getUTCMonth() + 1) + '-' + pad(k.getUTCDate()), m = k.getUTCHours() * 60 + k.getUTCMinutes(), dow = k.getUTCDay();

const cfg = (await K.collection('config').doc('main').get()).data() || {};
const list = CUT.clean(cfg.cutoffs);
// today's and tomorrow's cut-offs, at in minutes from today's midnight
const occ = [];
[0, 1].forEach(plus => CUT.on(list, (dow + plus) % 7).forEach(c => { c.off = plus * 1440; c.at += c.off; c.day = shift(today, plus); c.key = c.s.id + '|' + c.day; occ.push(c); }));
const due = occ.map(c => {
  if (c.at <= m) return null;
  const stage = m >= c.at - CUT.NOW ? 'now' : m >= CUT.pushAt(c.s) + c.off ? 'start' : '';
  return stage ? { c, stage } : null;
}).filter(Boolean);
if (!due.length) { console.log('Nothing due.'); process.exit(0); }

// what was sent (pushsent/<day>) and what the chefs ticked (cutdone/<day>_<supplier id>, on true), in one read
const days = [...new Set(due.map(d => d.c.day))];
const snaps = await db.getAll(...days.map(d => K.collection('pushsent').doc(d)), ...due.map(d => K.collection('cutdone').doc(d.c.day + '_' + d.c.s.id)));
const sent = {};
days.forEach((d, i) => { sent[d] = (snaps[i].exists && snaps[i].data().sent) || {}; });
const go = due.filter(({ c, stage }, i) => {
  const was = sent[c.day][c.key], tick = snaps[days.length + i];
  if (was === stage || (stage === 'start' && was === 'now')) return false;
  return !(tick.exists && tick.data().on === true);
});
if (!go.length) { console.log('Nothing new to send.'); process.exit(0); }

// the phones of people who are chefs now (a sous chef taken off the list gets nothing), and the head chef's Google device
const chefs = new Set([].concat(Array.isArray(cfg.sousIds) ? cfg.sousIds : [], cfg.headId || [], 'owner'));
const phones = (await K.collection('push').get()).docs.map(d => ({ id: d.id, x: d.data() })).filter(p => typeof p.x.tok === 'string' && p.x.tok && chefs.has(p.x.by));

const pushes = go.map(({ c, stage }) => {
  const when = (c.at >= 1440 ? 'tomorrow ' : '') + hhmm(c.at % 1440), to = left(c.at - m);
  return {
    c,
    data: stage === 'now'
      ? { title: 'Order now: ' + c.s.name, body: 'Closes at ' + when + ' ' + CUT.forText(c) + '. ' + to + ' to go.', tag: 'cut-' + c.s.id }
      : { title: c.s.name + ': order by ' + when, body: CUT.forText(c).replace(/^f/, 'F') + '. ' + to + ' to go.', tag: 'cut-' + c.s.id },
    ttl: Math.max(60, (c.at - m) * 60)
  };
});
const msgs = [];
pushes.forEach((p, pi) => phones.forEach(ph => msgs.push({ pi, ph, msg: { token: ph.x.tok, data: p.data, webpush: { headers: { Urgency: 'high', TTL: String(p.ttl) } } } })));

// an address Firebase says is gone: not registered any more, or not a valid address (the message itself is fixed, so
// an invalid-argument answer that names the token is the address, not the message)
const isGone = e => !!e && (e.code === 'messaging/registration-token-not-registered' || e.code === 'messaging/invalid-registration-token' || (e.code === 'messaging/invalid-argument' && /token/i.test(e.message || '')));
let ok = 0, gone = 0, failed = 0;
const dels = [];
const tried = pushes.map(() => ({ ok: 0, failed: 0 }));
if (DRY) { console.log(JSON.stringify({ would: msgs.map(x => ({ by: x.ph.x.by, data: x.msg.data })) })); ok = msgs.length; msgs.forEach(x => tried[x.pi].ok++); }
else {
  for (let i = 0; i < msgs.length; i += 500) {
    const part = msgs.slice(i, i + 500), res = await getMessaging().sendEach(part.map(x => x.msg));
    res.responses.forEach((r, j) => {
      if (r.success) { ok++; tried[part[j].pi].ok++; return; }
      if (isGone(r.error)) { gone++; dels.push(K.collection('push').doc(part[j].ph.id).delete()); return; }
      failed++; tried[part[j].pi].failed++;
    });
  }
}
/* A cut-off is marked as sent once a phone got it, or when no phone could (none turned on, or only gone addresses), so a
   phone turned on later does not get an old reminder. One where every send failed for another reason (Firebase busy, a
   network fault) is not marked, so the next run tries again while the cut-off is still ahead. */
const b = db.batch();
let marked = 0;
go.forEach(({ c, stage }, i) => {
  if (tried[i].failed && !tried[i].ok) return;
  marked++;
  b.set(K.collection('pushsent').doc(c.day), { sent: { [c.key]: stage }, at: FieldValue.serverTimestamp() }, { merge: true });
});
if (marked) await b.commit();
await Promise.allSettled(dels);   // gone addresses are removed even on a run that ends in failure
console.log('Sent ' + ok + ' push' + (ok === 1 ? '' : 'es') + ' for ' + go.length + ' cut-off' + (go.length === 1 ? '' : 's') + ' to ' + phones.length + ' phone' + (phones.length === 1 ? '' : 's') + '.' + (gone ? ' ' + gone + ' old phone address' + (gone === 1 ? '' : 'es') + ' removed.' : '') + (failed ? ' ' + failed + ' failed.' : ''));
if (failed && !ok) process.exit(1);
