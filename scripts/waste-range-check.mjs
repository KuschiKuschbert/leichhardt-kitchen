// Read-only release check: prove the history path query works with the deployed indexes. Never log saved records.
import { initializeApp, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const pin = process.env.KITCHEN_PIN || (emulator ? '000000' : '');
if (!/^\d{4,8}$/.test(pin)) throw new Error('KITCHEN_PIN is required');
const app = initializeApp(emulator ? { projectId: 'demo-test' } : { credential: cert(JSON.parse(process.env.FIREBASE_SA || '{}')) });
try {
  const db = getFirestore(app), today = new Date(Date.now() + 10 * 3600000).toISOString().slice(0, 10);
  const first = today.slice(0, 8) + '01', parts = first.split('-');
  const from = new Date(Date.UTC(+parts[0], +parts[1] - 4, 1)).toISOString().slice(0, 10);
  const base = 'kitchens/' + pin + '/waste/';
  const snap = await db.collectionGroup('lines').where(FieldPath.documentId(), '>=', db.doc(base + from + '/lines/\u0000'))
    .where(FieldPath.documentId(), '<', db.doc(base + first + '/lines/\u0000')).limit(1).get();
  if (snap.docs.some(x => !x.ref.path.startsWith(base))) throw new Error('Unexpected history path');
  console.log('Wastage history range query succeeded. No records changed.');
} finally { await deleteApp(app); }
