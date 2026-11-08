/* Operator-only repair: defaults to a read-only report. No public endpoint and no recurring polling. */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { createCoolingService } from './cooling-service.mjs';

const kitchen = process.env.KITCHEN_PIN || '';
if (!/^\d{4,6}$/.test(kitchen)) throw new Error('Set KITCHEN_PIN through the existing secret channel.');
initializeApp();
const db = getFirestore(), apply = process.argv.includes('--enqueue');
const jobs = await db.collection('kitchens').doc(kitchen).collection('coolingJobs').where('state', '==', 'pending').get();
console.log('Pending cooling deadlines: ' + jobs.size + '.');
if (apply) {
  if (process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Repair cannot enqueue live tasks while using the emulator.');
  const service = createCoolingService({ db, queue: getFunctions().taskQueue('locations/australia-southeast1/functions/coolingDeadline') });
  const result = await service.repairPending(kitchen);
  console.log('Queued: ' + result.queued + '. Still failed: ' + result.failed + '.');
  if (result.failed) process.exitCode = 1;
}
