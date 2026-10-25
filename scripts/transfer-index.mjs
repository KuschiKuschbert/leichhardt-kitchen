// Dated lines stay authoritative, including lines with no parent document.
import { pathToFileURL } from 'node:url';
export async function syncTransfers(kitchen) {
  const days = await kitchen.collection('transfers').listDocuments();
  let count = 0;
  for (const day of days) {
    const lines = await day.collection('lines').listDocuments();
    for (const line of lines) {
      const target = kitchen.collection('transferOpen').doc(day.id + '_' + line.id);
      await kitchen.firestore.runTransaction(async tx => {
        const [source, indexed] = await Promise.all([tx.get(line), tx.get(target)]);
        if (!source.exists) return;
        const record = source.data();
        const data = { date: day.id, lineId: line.id, record, open: !record.deleted && !record.returned };
        const previous = indexed.exists ? indexed.data() : null;
        if (previous && previous.open === data.open && JSON.stringify(previous.record) === JSON.stringify(record)) return;
        tx.set(target, data);
      });
      count++;
    }
  }
  return count;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { initializeApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const pin = process.env.KITCHEN_PIN || '';
  if (!/^\d{4,8}$/.test(pin)) throw new Error('KITCHEN_PIN is missing or invalid.');
  if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-test' });
  else {
    const sa = JSON.parse(process.env.FIREBASE_SA || '{}');
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
  }
  const count = await syncTransfers(getFirestore().collection('kitchens').doc(pin));
  console.log('Transfer index checked: ' + count + ' lines.');
}
