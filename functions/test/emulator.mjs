/* Run only via the Firestore emulator. Real Cloud Tasks and FCM are replaced with in-memory adapters. */
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { createCoolingService } from '../cooling-service.mjs';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-test') throw new Error('Use the demo-test Firestore emulator only.');
const app = initializeApp({ projectId: 'demo-test' }), db = getFirestore(app);
const kitchen = '123456', k = db.collection('kitchens').doc(kitchen);
let serverMs = Date.now();
const nextFour = ms => ms - ((ms + 21600000) % 86400000) + 86400000;
const issued = Timestamp.fromMillis(serverMs - 1000), pinAt = serverMs - 86400000;
const requests = ['emulator-first-00000001', 'emulator-first-00000002'];
const payload = { v: 1, uid: 'emulator-device', by: 'staff', sessionAt: issued, stage: 1, expectedRun: '', expectedRev: 0, at: FieldValue.serverTimestamp() };
const batch = db.batch();
batch.set(k.collection('config').doc('main'), { staffIds: ['staff', 'view'], fnOnlyIds: [] });
batch.set(k.collection('cooling').doc('config'), { v: 1, enabled: true });
batch.set(k.collection('sessions').doc('emulator-device'), { v: 2, by: 'staff', pinAt, mode: 'personal', issuedAt: issued, exp: nextFour(issued.toMillis()) });
batch.set(k.collection('pinset').doc('staff'), { at: pinAt });
requests.forEach(id => batch.set(k.collection('coolingRequests').doc(id), payload));
await batch.commit();serverMs = Date.now();
const tasks = [], pushes = [];let failQueue = true;
const service = createCoolingService({ db, serverNow: () => serverMs,
  queue: { enqueue: async (data, options) => { if (failQueue) throw new Error('Simulated queue outage');tasks.push({ data, options }); } },
  messaging: { sendEach: async messages => { pushes.push(...messages);return { responses: messages.map(() => ({ success: true })) }; } }
});
try {
  const outcomes = await Promise.all(requests.map(id => service.acceptRequest(kitchen, id)));
  assert.equal(outcomes.filter(x => x.status === 'accepted').length, 1);assert.equal(outcomes.filter(x => x.code === 'changed').length, 1);
  const first = (await k.collection('cooling').doc('current').get()).data();
  assert.equal(first.rev, 1);assert.equal(first.firstDue - first.firstAt, 7200000);assert.equal(first.secondAt, 0);
  const jobs = await k.collection('coolingJobs').get();assert.equal(jobs.size, 1);
  await service.acceptRequest(kitchen, first.run);assert.equal((await k.collection('cooling').doc('current').get()).data().firstAt, first.firstAt);
  await assert.rejects(service.scheduleJob(kitchen, first.run + '_1'));
  assert.equal((await k.collection('cooling').doc('current').get()).data().schedule.first, 'failed');
  failQueue = false;await service.scheduleJob(kitchen, first.run + '_1');assert.equal(tasks.length, 1);assert.equal(tasks[0].options.scheduleTime.getTime(), first.firstDue);
  serverMs = first.firstDue + 600000;
  const secondIssued = Timestamp.fromMillis(serverMs - 1000), secondId = 'emulator-second-00000001';
  await k.collection('sessions').doc('emulator-device').set({ v: 2, by: 'staff', pinAt, mode: 'personal', issuedAt: secondIssued, exp: nextFour(secondIssued.toMillis()) });
  await k.collection('coolingRequests').doc(secondId).set({ ...payload, sessionAt: secondIssued, stage: 2, expectedRun: first.run, expectedRev: 1, at: Timestamp.fromMillis(serverMs) });
  assert.equal((await service.acceptRequest(kitchen, secondId)).status, 'accepted');
  const second = (await k.collection('cooling').doc('current').get()).data();assert.equal(second.firstAt, first.firstAt);assert.equal(second.secondDue - second.secondAt, 14400000);
  await k.collection('coolingPush').doc('emulator-device').set({ v: 1, uid: 'emulator-device', by: 'staff', mode: 'personal', pinAt, tok: 'synthetic-device-token', at: Timestamp.fromMillis(serverMs) });
  await service.dispatchJob(kitchen, first.run + '_1');assert.equal(pushes.length, 1);assert.deepEqual(pushes[0].data, { type: 'cooling', run: first.run, stage: '1' });
  await service.dispatchJob(kitchen, first.run + '_1');assert.equal(pushes.length, 1);
  console.log('Cooling backend emulator: concurrent starts, durable outbox, second tick and deduplicated delivery passed. No live queues or notifications.');
} finally { await db.terminate();await deleteApp(app); }
