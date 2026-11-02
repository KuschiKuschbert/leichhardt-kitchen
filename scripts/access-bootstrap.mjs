// Idempotent preparation for private kitchen access. No PINs, contacts or private records enter the public recipe copy.
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
const functionModel = createRequire(import.meta.url)('../js/functions.js');
const isMap = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export async function bootstrapAccess(db, pin, options = {}) {
  const kitchen = db.collection('kitchens').doc(pin);
  const verifyOnly = options.verifyOnly === true, dryRun = options.dryRun === true || verifyOnly;
  let capabilityLists = 0, functionBookings = 0, bookingsScanned = 0;
  // One configuration transaction per deployment. Only missing canonical lists are seeded; approved lists survive reruns.
  const people = await db.runTransaction(async tx => {
    const config = kitchen.collection('config').doc('main'), snap = await tx.get(config);
    if (!snap.exists) throw new Error('Kitchen configuration is missing. No access migration was performed.');
    const c = snap.data(), people = (c.people || []).filter(p => p.active !== false);
    capabilityLists = 0;
    const fnOnlyIds = Array.isArray(c.fnOnlyIds) ? c.fnOnlyIds : people.filter(p => p.role === 'fnc').map(p => p.id);
    const additions = { fnOnlyIds };
    for (const cap of ['add', 'tick', 'del']) {
      const field = cap + 'Ids';
      if (verifyOnly && c[field] === undefined) throw new Error('Canonical access preparation is incomplete. Do not release the client.');
      if (c[field] !== undefined && (!Array.isArray(c[field]) || c[field].length > 80)) throw new Error('Canonical capability list is invalid. No access migration was performed.');
      additions[field] = c[field] || people.filter(p => (c.staffIds || people.map(p => p.id)).includes(p.id) && !fnOnlyIds.includes(p.id) &&
        (p.id === c.headId || p[cap] === true)).map(p => p.id);
      if (c[field] === undefined) capabilityLists++;
    }
    const roster = { people: people.map(p => ({ id: p.id, name: p.name, role: p.role || 'staff', active: true })), staffIds: c.staffIds || people.map(p => p.id), sousIds: c.sousIds || [], headId: c.headId || '', fnIds: c.fnIds || [], fnOnlyIds };
    if (!dryRun) { tx.set(config, additions, { merge: true }); tx.set(kitchen.collection('login').doc('roster'), roster); }
    return people;
  });
  // Existing bookings gain canonical status effects without changing versions, history or contacts.
  // Each bounded query and its writes share a transaction, protecting concurrent saves without per-item rereads.
  // An unexpectedly large kitchen requires a separately reviewed migration before rules publication.
  let cursor = null;
  for (;;) {
    const page = await db.runTransaction(async tx => {
      let query = kitchen.collection('functions').orderBy('__name__');
      if (cursor) query = query.startAfter(cursor);
      // One overflow sentinel proves the cap, without reading another full page past it.
      const result = await tx.get(query.limit(Math.min(80, 4001 - bookingsScanned)));
      if (bookingsScanned + result.docs.length > 4000) throw new Error('Booking preparation exceeds its reviewed 4000-record bound. Rules must not be published.');
      let prepared = 0;
      for (const booking of result.docs) {
        const f = booking.data(), existing = f.effects;
        if (existing !== undefined) {
          if (!isMap(existing) || !isMap(existing.prep) || Object.keys(existing.prep).length > 12 ||
            !isMap(existing.order) || !isMap(existing.cancel) || !isMap(existing.restore) || Object.keys(existing).some(k => !['prep', 'order', 'cancel', 'restore'].includes(k))) throw new Error('Canonical booking effects are invalid. Release is blocked.');
        }
        const effects = functionModel.effects(f, booking.id);
        if (existing !== undefined && isDeepStrictEqual(existing, effects)) continue;
        if (verifyOnly) throw new Error('Canonical booking preparation is incomplete or stale. Do not release the client.');
        if (!dryRun) tx.set(kitchen.collection('functions').doc(booking.id), { effects }, { merge: true });
        prepared++;
      }
      return { size: result.docs.length, prepared, last: result.docs[result.docs.length - 1] };
    });
    bookingsScanned += page.size; functionBookings += page.prepared;
    if (page.size < 80) break;
    cursor = page.last;
  }
  if (dryRun) return { roster: people.length, recipeAssets: 0, capabilityLists, functionBookings, bookingsScanned, dryRun: true };
  let count = 0;
  for (const [source, target] of [['book', 'publicBook'], ['recipes', 'publicRecipes'], ['drawings', 'publicDrawings']]) {
    const docs = source === 'book' ? await Promise.all(['index', 'matches'].map(id => kitchen.collection(source).doc(id).get())) : (await kitchen.collection(source).get()).docs;
    for (let doc of docs) {
      // A kitchen that has never edited a recipe still needs a readable public index for the lock probe.
      if (!doc.exists && source === 'book' && doc.id === 'index') {
        const index = kitchen.collection('book').doc('index');
        try { await index.create({ r: {}, d: {} }); } catch (e) { if (e.code !== 6 && e.code !== 'already-exists') throw e; }
        doc = await index.get();
      }
      if (!doc.exists) continue;
      await db.collection(target).doc(doc.id).set(doc.data()); count++;
    }
  }
  return { roster: people.length, recipeAssets: count, capabilityLists, functionBookings, bookingsScanned, dryRun: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.length === 1 && !['--dry-run', '--verify'].includes(args[0])) throw new Error('Usage: node scripts/access-bootstrap.mjs [--dry-run|--verify]. Unknown or conflicting modes are refused before data access.');
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const pin = process.env.KITCHEN_PIN || '';
  if (!/^\d{4,8}$/.test(pin)) throw new Error('Kitchen PIN is missing or invalid.');
  if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-test' });
  else { const sa = JSON.parse(process.env.FIREBASE_SA || '{}'); initializeApp({ credential: cert(sa), projectId: sa.project_id }); }
  const result = await bootstrapAccess(getFirestore(), pin, { dryRun: args[0] === '--dry-run', verifyOnly: args[0] === '--verify' });
  console.log((args[0] === '--verify' ? 'Verified preparation' : result.dryRun ? 'Preparation preview' : 'Prepared access') + ': ' + result.roster + ' people, ' + result.recipeAssets + ' public assets, ' + result.capabilityLists + ' capability lists, ' + result.functionBookings + ' effect sets from ' + result.bookingsScanned + ' bookings.');
}
