/*
  Nightly backup for the Kitchen Book. Run by .github/workflows/nightly-backup.yml at 03:30 kitchen time.

  Reads what the Backup button in the admin panel reads (js/prep.js, exportAll) and writes it as one JSON file in the
  same shape: config (people), prep lines, order lines, wastage and reviews, and transfers between venues (23 Oct 2026)
  for the last BACKUP_DAYS days (45), every shift ping with who has seen it, every meeting minutes with earlier versions
  and sign-offs, what the prep and order lists have learned, the learning log, the chef to-do list, tallies, sections,
  empty searches, card opens, the guides' words and small pictures, the recipes the head chef changed or added in the
  book with their earlier versions, and who has set a PIN.
  People's PIN fingerprints and the guides' page pictures are left out, like the button.
  The workflow then encrypts the file with the BACKUP_KEY secret and keeps it as a GitHub artifact for 90 days.

  Needs FIREBASE_SA (a service account key, JSON) and KITCHEN_PIN. Nothing secret is printed: the log says how many
  records were read. Reads only; nothing is written to the book.
  For a test run against the Firestore emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 KITCHEN_PIN=000000 node nightly-backup.mjs out.json
*/
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync } from 'fs';

const PIN = process.env.KITCHEN_PIN || '';
const DAYS = +(process.env.BACKUP_DAYS || 45);
const OUT = process.argv[2] || 'backup.json';
const ZONE = 10 * 3600000; // Queensland: UTC+10, no daylight saving
if (!/^\d{4,8}$/.test(PIN)) { console.error('KITCHEN_PIN is missing or not 4 to 8 digits.'); process.exit(1); }

if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-test' });
else {
  let sa;
  try { sa = JSON.parse(process.env.FIREBASE_SA || ''); } catch (e) { console.error('FIREBASE_SA is missing or not JSON.'); process.exit(1); }
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
}
const db = getFirestore();
const K = db.collection('kitchens').doc(PIN);

const pad = n => (n < 10 ? '0' : '') + n;
function kitchenDay(ms) { const d = new Date(ms + ZONE); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
function shift(day, n) { const [y, m, d] = day.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
// Firestore timestamps become milliseconds, like the phones store them
function plain(x) {
  if (x && typeof x.toMillis === 'function') return x.toMillis();
  if (Array.isArray(x)) return x.map(plain);
  if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x)) o[k] = plain(x[k]); return o; }
  return x;
}
const grab = sn => sn.docs.map(d => Object.assign(plain(d.data()), { id: d.id }));
const all = name => K.collection(name).get().then(grab);
async function subs(list, top, name) {
  const into = {};
  for (const x of list) { const r = grab(await K.collection(top).doc(x.id).collection(name).get()); if (r.length) into[x.id] = r; }
  return into;
}

const today = kitchenDay(Date.now());
const out = { exportedAt: new Date().toISOString(), by: 'nightly backup', days: {}, orders: {}, waste: {}, wasteReviews: {}, transfers: {} };
let reads = 0;
const cfg = await K.collection('config').doc('main').get(); reads++;
out.config = cfg.exists ? plain(cfg.data()) : null;
for (const name of ['activity', 'sections', 'learned', 'ordlearned', 'learnlog', 'summary', 'analysis', 'analysisDaily', 'references', 'training', 'misses', 'views', 'guides', 'mail', 'mailstat', 'drinks', 'shifts', 'daily', 'todos', 'cutdone', 'transferOpen']) { out[name] = await all(name); reads += out[name].length; }
// One day range query, only the backup window. No separate read for each delivery day.
out.deliveries = grab(await K.collection('deliveries').where('day', '>=', shift(today, -(DAYS - 1))).where('day', '<=', today).get());
reads += Math.max(1, out.deliveries.length);
out.referencesHist = await subs(out.references, 'references', 'hist');
out.trainingHist = await subs(out.training, 'training', 'hist');
out.notes = await all('notes'); out.notesSeen = await subs(out.notes, 'notes', 'seen');
out.directnotes = await all('directnotes'); out.directnotesSeen = await subs(out.directnotes, 'directnotes', 'seen');
out.minutes = await all('minutes'); out.minutesHist = await subs(out.minutes, 'minutes', 'hist'); out.minutesSigns = await subs(out.minutes, 'minutes', 'signs');
// the head chef's book: the index, every recipe changed or added in the book and every drawing, with their earlier versions
out.book = await all('book'); out.recipes = await all('recipes'); out.recipesHist = await subs(out.recipes, 'recipes', 'hist');
out.drawings = await all('drawings'); out.drawingsHist = await subs(out.drawings, 'drawings', 'hist');
out.drawtpl = await all('drawtpl'); out.drawlib = await all('drawlib');
// Private supplier catalogue, immutable order snapshots, catalogue audit and reminder occurrence links.
out.suppliers = await all('suppliers'); out.supplierOrders = await subs(out.suppliers, 'suppliers', 'orders');
out.supplierAudit = await subs(out.suppliers, 'suppliers', 'audit'); out.supplierlinks = await all('supplierlinks');
reads += out.suppliers.length + out.supplierlinks.length;
// function bookings (21 Oct 2026), their earlier versions and the booking contacts
out.functions = await all('functions'); out.functionsHist = await subs(out.functions, 'functions', 'hist'); out.fncontact = await all('fncontact'); out.fnsent = await all('fnsent');
reads += out.functions.length + out.fncontact.length;
reads += out.book.length + out.recipes.length + out.drawings.length;
out.pins = (await all('pinset')).map(x => ({ id: x.id, name: x.name, setAt: x.setAt }));
reads += out.notes.length + out.directnotes.length + out.minutes.length + out.pins.length;
let lines = 0, dayN = 0;
for (let k = 0; k < DAYS; k++) {
  const d = shift(today, -k);
  const [items, ords, waste, review, trans] = await Promise.all([
    K.collection('days').doc(d).collection('items').get(), K.collection('orders').doc(d).collection('lines').get(),
    K.collection('waste').doc(d).collection('lines').get(), K.collection('waste').doc(d).get(),
    K.collection('transfers').doc(d).collection('lines').get()
  ]);
  reads += items.size + ords.size + waste.size + trans.size + 1;
  if (items.size) { out.days[d] = grab(items); lines += items.size; dayN++; }
  if (ords.size) out.orders[d] = grab(ords);
  if (waste.size) out.waste[d] = grab(waste);
  if (review.exists) out.wasteReviews[d] = plain(review.data());
  if (trans.size) out.transfers[d] = grab(trans);
}
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('Backed up ' + lines + ' prep lines from ' + dayN + ' of the last ' + DAYS + ' days, ' + (out.notes.length + out.directnotes.length) + ' shift pings, minutes from ' + out.minutes.length + ' meetings, ' + out.learned.length + ' learned items, ' + out.guides.length + ' guides and ' + out.recipes.length + ' recipes changed in the book (' + reads + ' reads).');
process.exit(0);
