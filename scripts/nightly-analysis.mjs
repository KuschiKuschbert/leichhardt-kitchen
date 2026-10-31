import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { analyse } from './analysis.mjs';
const pin = process.env.KITCHEN_PIN || '';
if (!/^\d{4,6}$/.test(pin)) throw new Error('Missing kitchen configuration');
if (process.env.FIRESTORE_EMULATOR_HOST) initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-test' });
else { const sa = JSON.parse(process.env.FIREBASE_SA || '{}'); initializeApp({ credential: cert(sa), projectId: sa.project_id }); }
const K = getFirestore().collection('kitchens').doc(pin);
try {
  const result = await analyse(K);
  console.log('Analysis complete: ' + result.days + ' days; ' + result.reads + ' reads.');
} catch (e) {
  // Error messages can contain document paths or typed text. Neither belongs in public Actions logs.
  await K.collection('analysis').doc('health').set({ at: Date.now(), status: 'failed' }).catch(() => {});
  console.error('Analysis failed. Previous published summaries remain available.'); process.exitCode = 1;
}
