// Idempotent preparation for private kitchen access. No PINs, contacts or private records enter the public recipe copy.
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
const functionModel = createRequire(import.meta.url)('../js/functions.js');
const isMap = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// The platform owner's own profile at a venue (24 Nov 2026, docs/venues.md): PLATFORM_STAFF_ID, empty at Leichhardt.
export const PLATFORM_ID = /^[A-Za-z0-9_-]{0,80}$/;
/* config/platform holds exactly { id } when the venue has a platform owner's profile, and does not exist when it has
   none (Leichhardt: the owner is the platform owner). Only this script writes it; the rules let no phone write it. His
   Google reads it to know the profile is his; a live admin reads it to keep that profile out of the venue admin's saves.
   Publish sets or deletes it, a dry run only says what it would do, and verify throws when it does not match. */
async function syncPlatform(kitchen, id, { dryRun, verifyOnly }) {
  const ref = kitchen.collection('config').doc('platform'), snap = await ref.get(), have = snap.exists ? snap.data() : null;
  const right = id ? !!have && Object.keys(have).length === 1 && have.id === id : !have;
  if (right) return 'kept';
  if (verifyOnly) throw new Error('The platform owner record does not match PLATFORM_STAFF_ID. Do not release the client.');
  if (!dryRun) { if (id) await ref.set({ id }); else await ref.delete(); }
  return id ? 'set' : 'removed';
}
export async function bootstrapAccess(db, pin, options = {}) {
  const kitchen = db.collection('kitchens').doc(pin);
  const verifyOnly = options.verifyOnly === true, dryRun = options.dryRun === true || verifyOnly;
  const platformId = options.platformId === undefined ? '' : options.platformId;
  if (typeof platformId !== 'string' || !PLATFORM_ID.test(platformId)) throw new Error('The platform owner\'s profile id is not valid. No access migration was performed.');
  let capabilityLists = 0, functionBookings = 0, bookingsScanned = 0;
  // One configuration transaction per deployment. Only missing canonical lists are seeded; approved lists survive reruns.
  const people = await db.runTransaction(async tx => {
    const config = kitchen.collection('config').doc('main'), snap = await tx.get(config);
    // A new venue (19 Nov 2026, docs/venues.md) has no settings until its first head chef is set up in the book, which
    // needs its rules published first. Only the first publish for a new venue (VENUE_NEW=1) goes on with nothing to
    // prepare; anywhere else a missing configuration still stops the run (a wrong PIN would point at an empty path).
    if (!snap.exists && options.newVenue === true) return null;
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
  if (people === null) {
    const platform = await syncPlatform(kitchen, platformId, { dryRun, verifyOnly });
    if (dryRun) return { roster: 0, recipeAssets: 0, capabilityLists: 0, functionBookings: 0, bookingsScanned: 0, platform, dryRun: true };
    return { roster: 0, recipeAssets: await mirrorPublic(db, kitchen), capabilityLists: 0, functionBookings: 0, bookingsScanned: 0, platform, dryRun: false };
  }
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
  const platform = await syncPlatform(kitchen, platformId, { dryRun, verifyOnly });
  if (dryRun) return { roster: people.length, recipeAssets: 0, capabilityLists, functionBookings, bookingsScanned, platform, dryRun: true };
  return { roster: people.length, recipeAssets: await mirrorPublic(db, kitchen), capabilityLists, functionBookings, bookingsScanned, platform, dryRun: false };
}
// The public recipe copy: the current book index, recipes and drawings, as the phones' saves mirror them.
async function mirrorPublic(db, kitchen) {
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
  return count;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.length === 1 && !['--dry-run', '--verify'].includes(args[0])) throw new Error('Usage: node scripts/access-bootstrap.mjs [--dry-run|--verify]. Unknown or conflicting modes are refused before data access.');
  // the platform owner's profile id (PLATFORM_STAFF_ID, empty at Leichhardt): checked before any read, never printed
  const platformId = process.env.PLATFORM_ID || '';
  if (!PLATFORM_ID.test(platformId)) throw new Error('PLATFORM_ID is not a profile id. It is refused before data access.');
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const pin = process.env.KITCHEN_PIN || '';
  if (!/^\d{4,8}$/.test(pin)) throw new Error('Kitchen PIN is missing or invalid.');
  if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-test' });
  else {
    const sa = JSON.parse(process.env.FIREBASE_SA || '{}');
    // only the venue this run is for (docs/venues.md): another venue's service account is refused before any read
    const { default: venues } = await import('./venues.cjs');
    if (sa.project_id !== venues.scriptProject()) throw new Error('The service account is not this venue\'s. No access migration was performed.');
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  }
  const result = await bootstrapAccess(getFirestore(), pin, { dryRun: args[0] === '--dry-run', verifyOnly: args[0] === '--verify', newVenue: process.env.VENUE_NEW === '1', platformId });
  const platformSaid = { kept: 'as it should be', set: result.dryRun ? 'would be set' : 'set', removed: result.dryRun ? 'would be removed' : 'removed' }[result.platform];
  console.log((args[0] === '--verify' ? 'Verified preparation' : result.dryRun ? 'Preparation preview' : 'Prepared access') + ': ' + result.roster + ' people, ' + result.recipeAssets + ' public assets, ' + result.capabilityLists + ' capability lists, ' + result.functionBookings + ' effect sets from ' + result.bookingsScanned + ' bookings, platform owner record ' + platformSaid + '.');
}
