// Idempotent preparation for private kitchen access. No PINs, contacts or private records enter the public recipe copy.
import { pathToFileURL } from 'node:url';
export async function bootstrapAccess(db, pin) {
  const kitchen = db.collection('kitchens').doc(pin), snap = await kitchen.collection('config').doc('main').get();
  if (!snap.exists) throw new Error('Kitchen configuration is missing. No access migration was performed.');
  const c = snap.data(), people = (c.people || []).filter(p => p.active !== false);
  const fnOnlyIds = Array.isArray(c.fnOnlyIds) ? c.fnOnlyIds : people.filter(p => p.role === 'fnc').map(p => p.id);
  const roster = { people: people.map(p => ({ id: p.id, name: p.name, role: p.role || 'staff', active: true })), staffIds: c.staffIds || people.map(p => p.id), sousIds: c.sousIds || [], headId: c.headId || '', fnIds: c.fnIds || [], fnOnlyIds };
  const b = db.batch(); b.set(kitchen.collection('config').doc('main'), { fnOnlyIds }, { merge: true });
  b.set(kitchen.collection('login').doc('roster'), roster); await b.commit();
  let count = 0;
  for (const [source, target] of [['book', 'publicBook'], ['recipes', 'publicRecipes'], ['drawings', 'publicDrawings']]) {
    const docs = source === 'book' ? await Promise.all(['index', 'matches'].map(id => kitchen.collection(source).doc(id).get())) : (await kitchen.collection(source).get()).docs;
    for (const doc of docs) { if (!doc.exists) continue; await db.collection(target).doc(doc.id).set(doc.data()); count++; }
  }
  return { roster: people.length, recipeAssets: count };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const pin = process.env.KITCHEN_PIN || '';
  if (!/^\d{4,8}$/.test(pin)) throw new Error('Kitchen PIN is missing or invalid.');
  if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-test' });
  else { const sa = JSON.parse(process.env.FIREBASE_SA || '{}'); initializeApp({ credential: cert(sa), projectId: sa.project_id }); }
  const result = await bootstrapAccess(getFirestore(), pin);
  console.log('Prepared login roster and public recipe assets: ' + result.roster + ' people, ' + result.recipeAssets + ' assets.');
}
