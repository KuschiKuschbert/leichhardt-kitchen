/* Deployment adapters only. Importing this file does not enqueue a task, send a message or seed readiness. */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { defineSecret, defineString } from 'firebase-functions/params';
import { createCoolingService } from './cooling-service.mjs';

initializeApp();
const REGION = 'australia-southeast1';
const kitchenPin = defineSecret('KITCHEN_PIN');
const runtimeAccount = defineString('COOLING_SERVICE_ACCOUNT', { description: 'Dedicated cooling runtime service account email' });
const common = { region: REGION, serviceAccount: runtimeAccount, secrets: [kitchenPin], memory: '256MiB', maxInstances: 2, concurrency: 1 };
const dry = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const service = createCoolingService({ db: getFirestore(), messaging: getMessaging(),
  queue: getFunctions().taskQueue('locations/' + REGION + '/functions/coolingDeadline'), dry });

export const coolingStart = onDocumentCreated({ ...common, document: 'kitchens/{kitchen}/coolingRequests/{requestId}', retry: true }, async event => {
  if (event.params.kitchen !== kitchenPin.value()) return;
  await service.acceptRequest(event.params.kitchen, event.params.requestId);
});
export const coolingSchedule = onDocumentCreated({ ...common, document: 'kitchens/{kitchen}/coolingJobs/{jobId}', retry: true }, async event => {
  if (event.params.kitchen !== kitchenPin.value()) return;
  await service.scheduleJob(event.params.kitchen, event.params.jobId);
});
export const coolingDeadline = onTaskDispatched({ ...common, invoker: 'private', timeoutSeconds: 180,
  retryConfig: { maxAttempts: 100, maxRetrySeconds: 86400, minBackoffSeconds: 30, maxBackoffSeconds: 3600, maxDoublings: 5 },
  rateLimits: { maxConcurrentDispatches: 1, maxDispatchesPerSecond: 1 } }, async request => {
  if (typeof request.data?.jobId !== 'string') return;
  await service.dispatchJob(kitchenPin.value(), request.data.jobId);
});
