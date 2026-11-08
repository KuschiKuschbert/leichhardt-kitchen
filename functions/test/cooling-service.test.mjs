import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createCoolingService, DELIVERY_WINDOW } from '../cooling-service.mjs';
import { FakeFirestore, Stamp } from './fake-firestore.mjs';
const PIN = '123456', K = 'kitchens/' + PIN; // Synthetic kitchen only.
const RUN = 'request-first-0000000001';
const nextFour = ms => ms - ((ms + 21600000) % 86400000) + 86400000;
function fixture() {
  const db = new FakeFirestore();let clock = Date.UTC(2026, 10, 8, 4);
  const enqueued = [], submissions = [], taskIds = new Set();let queueError = null, sendResponse = null;
  const cfg = { staffIds: ['staff', 'view', 'head', 'chef', 'fn'], fnOnlyIds: ['fn'], headId: 'head', sousIds: ['chef'] };
  db.seed(K + '/config/main', cfg);db.seed(K + '/cooling/config', { v: 1, enabled: true });
  const session = (uid = 'device-a', by = 'staff', mode = 'personal') => {
    const issued = clock - 1000 + .125, pinAt = clock - 86400000;
    db.seed(K + '/pinset/' + by, { at: pinAt });db.seed(K + '/sessions/' + uid, { by, mode, v: 2, pinAt, issuedAt: new Stamp(issued), exp: nextFour(issued) });
    return db.value(K + '/sessions/' + uid);
  };
  session();
  const request = (id = RUN, extra = {}) => {
    const s = db.value(K + '/sessions/' + (extra.uid || 'device-a'));
    db.seed(K + '/coolingRequests/' + id, { v: 1, uid: 'device-a', by: 'staff', sessionAt: s?.issuedAt, at: new Stamp(clock - 1), stage: 1, expectedRun: '', expectedRev: 0, ...extra });
  };
  request();
  const subscription = (uid = 'device-a', by = 'staff', mode = 'personal') => {
    const s = db.value(K + '/sessions/' + uid) || session(uid, by, mode);
    db.seed(K + '/coolingPush/' + uid, { v: 1, uid, by, mode, pinAt: s.pinAt, tok: 'token-' + uid, at: new Stamp(clock) });
  };
  const service = createCoolingService({ db, serverNow: () => clock,
    queue: { enqueue: async (payload, options) => { if (queueError) throw queueError;if (taskIds.has(options.id)) throw { code: 'functions/task-already-exists' };taskIds.add(options.id);enqueued.push({ payload, options }); } },
    messaging: { sendEach: async messages => { submissions.push(messages);return sendResponse ? sendResponse(messages) : { responses: messages.map(() => ({ success: true })) }; } }
  });
  return { db, service, cfg, session, request, subscription, enqueued, submissions, clock: () => clock, setTime: ms => { clock = ms; }, queueFail: value => { queueError = value; }, send: fn => { sendResponse = fn; } };
}
async function start(f) { assert.equal((await f.service.acceptRequest(PIN, RUN)).status, 'accepted');return f.db.value(K + '/cooling/current'); }

test('one accepted first tick establishes two hours and an atomic durable scheduling intent', async () => {
  const f = fixture(), x = await start(f);assert.equal(x.firstAt, f.clock());assert.equal(x.firstDue - x.firstAt, 7200000);assert.equal(x.secondAt, 0);assert.equal(x.secondDue, 0);assert.equal(x.rev, 1);
  assert.equal(f.db.value(K + '/coolingJobs/' + RUN + '_1').state, 'pending');assert.equal(f.db.value(K + '/coolingJobs/' + RUN + '_2'), undefined);assert.equal(f.db.value(K + '/coolingRequests/' + RUN).revision, 1);assert.equal(f.enqueued.length, 0);assert.equal(f.submissions.length, 0);
});
test('duplicate triggers and simultaneous first ticks cannot restart a shared deadline', async () => {
  const f = fixture(), other = 'request-other-0000000002';f.request(other);
  const results = await Promise.all([f.service.acceptRequest(PIN, RUN), f.service.acceptRequest(PIN, other)]);
  assert.deepEqual(results.map(x => x.status), ['accepted', 'rejected']);assert.equal(results[1].code, 'changed');
  const before = f.db.value(K + '/cooling/current');f.setTime(f.clock() + 60000);assert.equal((await f.service.acceptRequest(PIN, RUN)).status, 'accepted');assert.deepEqual(f.db.value(K + '/cooling/current'), before);
});
test('stage two waits for its own tick and runs four hours from its accepted start', async () => {
  const f = fixture(), first = await start(f), early = 'request-second-early0001', second = 'request-second-00000001';
  f.request(early, { stage: 2, expectedRun: RUN, expectedRev: 1 });assert.equal((await f.service.acceptRequest(PIN, early)).code, 'not-ready');
  f.setTime(first.firstDue + 10 * 60000);f.request(second, { stage: 2, expectedRun: RUN, expectedRev: 1 });assert.equal((await f.service.acceptRequest(PIN, second)).status, 'accepted');
  const x = f.db.value(K + '/cooling/current');assert.equal(x.secondAt, f.clock());assert.equal(x.secondDue - x.secondAt, 14400000);assert.equal(x.firstAt, first.firstAt);assert.equal(x.firstDue, first.firstDue);assert.equal(x.rev, 2);assert.equal(f.db.value(K + '/coolingJobs/' + RUN + '_2').due, x.secondDue);
});
test('completed batch starts a distinct run with monotonic revision and retained archive', async () => {
  const f = fixture(), first = await start(f);f.setTime(first.firstDue + 1);f.request('request-second-00000001', { stage: 2, expectedRun: RUN, expectedRev: 1 });await f.service.acceptRequest(PIN, 'request-second-00000001');
  const second = f.db.value(K + '/cooling/current');f.setTime(second.secondDue);f.request('request-newrun-00000001', { expectedRun: RUN, expectedRev: 2 });assert.equal((await f.service.acceptRequest(PIN, 'request-newrun-00000001')).status, 'accepted');assert.equal(f.db.value(K + '/cooling/current').rev, 3);assert.equal(f.db.value(K + '/coolingRuns/' + RUN).secondDue, second.secondDue);
});
for (const [name, change, code] of [
  ['expired session', f => f.setTime(f.db.value(K + '/sessions/device-a').exp), 'access-denied'],
  ['removed staff', f => f.db.seed(K + '/config/main', { ...f.cfg, staffIds: [] }), 'access-denied'],
  ['functions-only member', f => f.db.seed(K + '/config/main', { ...f.cfg, fnOnlyIds: ['staff'] }), 'access-denied'],
  ['PIN reset', f => f.db.seed(K + '/pinset/staff', { at: f.clock() }), 'access-denied'],
  ['replaced session', f => f.db.seed(K + '/sessions/device-a', { ...f.db.value(K + '/sessions/device-a'), issuedAt: new Stamp(f.clock()) }), 'access-denied'],
  ['disabled backend', f => f.db.seed(K + '/cooling/config', { v: 1, enabled: false }), 'setup-needed'],
  ['malformed request', f => f.request(RUN, { uid: undefined }), 'invalid-request'],
  ['forged session marker', f => f.request(RUN, { sessionAt: new Stamp(f.clock()) }), 'access-denied']
]) test(name + ' cannot start a stage', async () => { const f = fixture();change(f);const result = await f.service.acceptRequest(PIN, RUN);assert.equal(result.status, 'rejected');assert.equal(result.code, code);assert.equal(f.db.value(K + '/cooling/current'), undefined); });
for (const who of ['view', 'head', 'chef']) test(who + ' starts with their ordinary kitchen PIN session', async () => { const f = fixture();f.session('device-a', who);f.request(RUN, { by: who });assert.equal((await f.service.acceptRequest(PIN, RUN)).status, 'accepted'); });

test('failed enqueue remains recoverable and reports its state until repair succeeds', async () => {
  const f = fixture(), current = await start(f), id = RUN + '_1';f.queueFail(new Error('Temporary outage'));await assert.rejects(f.service.scheduleJob(PIN, id));assert.equal(f.db.value(K + '/coolingJobs/' + id).state, 'pending');assert.equal(f.db.value(K + '/cooling/current').schedule.first, 'failed');
  f.queueFail(null);assert.deepEqual(await f.service.repairPending(PIN), { inspected: 1, queued: 1, failed: 0 });assert.equal(f.enqueued[0].options.scheduleTime.getTime(), current.firstDue);assert.equal(f.enqueued[0].payload.jobId, id);assert.equal(f.db.value(K + '/cooling/current').schedule.first, 'queued');assert.equal(f.db.value(K + '/cooling/current').rev, 1);
});
test('successful enqueue with failed acknowledgement deduplicates the retry', async () => { const f = fixture();await start(f);f.db.failNextTransaction = true;await assert.rejects(f.service.scheduleJob(PIN, RUN + '_1'));assert.equal(f.enqueued.length, 1);assert.equal((await f.service.scheduleJob(PIN, RUN + '_1')).status, 'queued');assert.equal(f.enqueued.length, 1); });
test('personal daily lock preserves push but changed ownership, shared screens and removed members do not', async () => {
  const f = fixture(), first = await start(f);
  for (const [uid, who, mode] of [['device-a', 'staff', 'personal'], ['device-view', 'view', 'personal'], ['device-shared', 'staff', 'shared'], ['device-removed', 'removed', 'personal'], ['device-fn', 'fn', 'personal']]) { f.session(uid, who, mode);f.subscription(uid, who, mode); }
  f.setTime(first.firstDue + 1000);const s = f.db.value(K + '/sessions/device-a');f.db.seed(K + '/sessions/device-a', { ...s, issuedAt: new Stamp(s.issuedAt.toMillis() - 86400000), exp: s.exp - 86400000 });f.db.seed(K + '/sessions/device-view', { ...f.db.value(K + '/sessions/device-view'), by: 'chef' });
  assert.equal((await f.service.dispatchJob(PIN, RUN + '_1')).accepted, 1);assert.deepEqual(f.submissions.flat().map(x => x.token), ['token-device-a']);assert.deepEqual(f.submissions[0][0].data, { type: 'cooling', run: RUN, stage: '1' });assert.equal(f.submissions[0][0].webpush.headers.Urgency, 'high');assert.equal((await f.service.dispatchJob(PIN, RUN + '_1')).status, 'ignored');assert.equal(f.submissions.length, 1);
});
test('partial FCM failure retries only failed devices and retains successful receipts', async () => {
  const f = fixture(), first = await start(f);f.subscription();f.session('device-b', 'view');f.subscription('device-b', 'view');f.setTime(first.firstDue);f.send(messages => ({ responses: messages.map(x => x.token === 'token-device-a' ? { success: true } : { success: false, error: { code: 'messaging/server-unavailable' } }) }));await assert.rejects(f.service.dispatchJob(PIN, RUN + '_1'));
  assert.equal(f.db.value(K + '/coolingJobs/' + RUN + '_1/devices/device-a').state, 'sent');assert.equal(f.db.value(K + '/coolingJobs/' + RUN + '_1/devices/device-b').state, 'retry');f.send(null);assert.equal((await f.service.dispatchJob(PIN, RUN + '_1')).status, 'sent');assert.deepEqual(f.submissions[1].map(x => x.token), ['token-device-b']);
});
test('delivery accepts the registration token size boundary and skips oversized records', async () => {
  const f = fixture(), first = await start(f), allowedToken = 'a'.repeat(4096);
  f.subscription();f.session('device-oversized', 'view');f.subscription('device-oversized', 'view');
  f.db.seed(K + '/coolingPush/device-a', { ...f.db.value(K + '/coolingPush/device-a'), tok: allowedToken });
  f.db.seed(K + '/coolingPush/device-oversized', { ...f.db.value(K + '/coolingPush/device-oversized'), tok: 'b'.repeat(4097) });
  f.setTime(first.firstDue);
  assert.equal((await f.service.dispatchJob(PIN, RUN + '_1')).accepted, 1);
  assert.deepEqual(f.submissions.flat().map(message => message.token), [allowedToken]);
  assert.equal(f.db.value(K + '/coolingJobs/' + RUN + '_1/devices/device-a').state, 'sent');
  assert.equal(f.db.value(K + '/coolingJobs/' + RUN + '_1/devices/device-oversized').state, 'skipped');
});
test('dead-token cleanup cannot delete a refreshed registration', async () => {
  const f = fixture(), first = await start(f);f.subscription();f.setTime(first.firstDue);f.send(() => { f.db.seed(K + '/coolingPush/device-a', { ...f.db.value(K + '/coolingPush/device-a'), tok: 'refreshed-token' });return { responses: [{ success: false, error: { code: 'messaging/registration-token-not-registered' } }] }; });await assert.rejects(f.service.dispatchJob(PIN, RUN + '_1'));assert.equal(f.db.value(K + '/coolingPush/device-a').tok, 'refreshed-token');
  assert.equal(f.db.value(K + '/coolingJobs/' + RUN + '_1/devices/device-a').state, 'retry');
  f.send(null);await f.service.dispatchJob(PIN, RUN + '_1');assert.equal(f.submissions[1][0].token, 'refreshed-token');
});
test('early, expired and forged-deadline tasks send nothing', async () => {
  const f = fixture(), first = await start(f);f.subscription();await assert.rejects(f.service.dispatchJob(PIN, RUN + '_1'));assert.equal(f.submissions.length, 0);f.setTime(first.firstDue + DELIVERY_WINDOW + 1);assert.equal((await f.service.dispatchJob(PIN, RUN + '_1')).status, 'expired');
  const g = fixture();await start(g);g.db.seed(K + '/coolingJobs/' + RUN + '_1', { ...g.db.value(K + '/coolingJobs/' + RUN + '_1'), due: g.clock() });assert.equal((await g.service.dispatchJob(PIN, RUN + '_1')).status, 'ignored');assert.equal(g.submissions.length, 0);
});
test('emulator dry mode cannot enqueue, send, claim or mark delivery successful', async () => {
  const f = fixture(), first = await start(f);f.subscription();f.setTime(first.firstDue);const dry = createCoolingService({ db: f.db, dry: true, serverNow: f.clock, queue: { enqueue: () => assert.fail('No live queue') }, messaging: { sendEach: () => assert.fail('No live messaging') } });assert.equal((await dry.scheduleJob(PIN, RUN + '_1')).status, 'dry-run');assert.equal((await dry.dispatchJob(PIN, RUN + '_1')).status, 'dry-run');assert.equal(f.db.value(K + '/coolingJobs/' + RUN + '_1').state, 'pending');assert.equal(f.db.value(K + '/coolingJobs/' + RUN + '_1').lease, undefined);
});

test('delivery before the enqueue acknowledgement still confirms scheduling on the current run', async () => {
  const f = fixture(), first = await start(f);f.setTime(first.firstDue);f.subscription();
  const service = createCoolingService({ db: f.db, serverNow: f.clock, queue: { enqueue: async () => {
    await f.service.dispatchJob(PIN, RUN + '_1');
  } } });
  await service.scheduleJob(PIN, RUN + '_1');
  assert.equal(f.db.value(K + '/cooling/current').schedule.first, 'queued');
  assert.equal(f.db.value(K + '/coolingJobs/' + RUN + '_1').state, 'sent');
});

test('a lost enqueue acknowledgement after delivery cannot leave current scheduling pending', async () => {
  const f = fixture(), first = await start(f);f.setTime(first.firstDue);f.subscription();
  const service = createCoolingService({ db: f.db, serverNow: f.clock, queue: { enqueue: async () => {
    await f.service.dispatchJob(PIN, RUN + '_1');f.db.failNextTransaction = true;
  } } });
  await assert.rejects(service.scheduleJob(PIN, RUN + '_1'));
  await service.scheduleJob(PIN, RUN + '_1');
  assert.equal(f.db.value(K + '/cooling/current').schedule.first, 'queued');
  assert.equal(f.submissions.length, 1);
});

test('deployed core is the exact browser timing and validation source', async () => {
  const [source, bundled] = await Promise.all([
    readFile(new URL('../../js/cooling-core.js', import.meta.url)),
    readFile(new URL('../shared-cooling.cjs', import.meta.url))
  ]);
  assert.deepEqual(bundled, source);
});
