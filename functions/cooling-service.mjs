/* Shared Operandio state and delivery. No browser clock or phone is needed after an accepted start.
   Database, queue, messaging and server time are injected so tests never enqueue or send live notifications. */
import { createHash, randomUUID } from 'node:crypto';
import CORE from './shared-cooling.cjs';

export const HOURS = Object.freeze({ 1: CORE.duration(1) / 3600000, 2: CORE.duration(2) / 3600000 });
export const DELIVERY_WINDOW = 24 * 60 * 60 * 1000;
const LEASE_MS = 4 * 60 * 1000;
const UID = /^[A-Za-z0-9_-]{1,128}$/;
const idOk = CORE.id;
const uidOk = value => typeof value === 'string' && UID.test(value);
const personOk = value => typeof value === 'string' && value.length > 0 && value.length <= 80 && value.trim() === value && !value.includes('/') && value !== '.' && value !== '..';
const timestampMs = value => Number.isFinite(value) && value > 0;
const nextFour = value => value - ((value + 21600000) % 86400000) + 86400000;
const millis = value => typeof value?.toMillis === 'function' ? value.toMillis() : NaN;
const safeMs = value => Number.isSafeInteger(value) && value > 0;
const hash = value => createHash('sha256').update(value).digest('hex');
const data = snap => snap?.exists ? snap.data() : null;
const activeMember = (cfg, by) => typeof by === 'string' && by !== '' && Array.isArray(cfg?.staffIds)
  && cfg.staffIds.includes(by) && !(Array.isArray(cfg.fnOnlyIds) && cfg.fnOnlyIds.includes(by));
const goneToken = error => ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(error?.code)
  || error?.code === 'messaging/invalid-argument' && /token/i.test(error.message || '');

function validCurrent(value) { return CORE.parse(value) !== null; }
function validRequest(r) {
  return r?.v === 1 && uidOk(r.uid) && personOk(r.by) && [1, 2].includes(r.stage)
    && (r.expectedRun === '' || idOk(r.expectedRun)) && Number.isSafeInteger(r.expectedRev) && r.expectedRev >= 0
    && timestampMs(millis(r.sessionAt)) && timestampMs(millis(r.at));
}
function liveStartSession(session, pin, cfg, request, serverMs) {
  return activeMember(cfg, request.by) && session?.v === 2 && ['personal', 'shared'].includes(session.mode)
    && session.by === request.by && session.exp > serverMs && safeMs(pin?.at) && session.pinAt === pin.at
    && timestampMs(millis(session.issuedAt)) && session.exp === nextFour(millis(session.issuedAt))
    && millis(session.issuedAt) === millis(request.sessionAt)
    && millis(request.at) >= millis(session.issuedAt) && millis(request.at) <= serverMs;
}
function subscribedDevice(subscription, session, pin, cfg, uid) {
  return subscription?.v === 1 && subscription.uid === uid && subscription.mode === 'personal'
    && activeMember(cfg, subscription.by) && typeof subscription.tok === 'string' && subscription.tok.length > 0 && subscription.tok.length <= 4096
    && session?.v === 2 && session.mode === 'personal' && session.by === subscription.by
    && safeMs(pin?.at) && subscription.pinAt === session.pinAt && subscription.pinAt === pin.at
    && timestampMs(millis(session.issuedAt)) && session.exp === nextFour(millis(session.issuedAt));
}
function validJob(j, id) {
  return j?.v === 1 && idOk(j.run) && [1, 2].includes(j.stage) && id === j.run + '_' + j.stage && safeMs(j.due);
}

export function createCoolingService({ db, queue, messaging, serverNow = () => Date.now(), dry = false }) {
  function kitchenRef(kitchen) {
    if (!/^\d{4,6}$/.test(kitchen)) throw new Error('Invalid kitchen identifier.');
    return db.collection('kitchens').doc(kitchen);
  }
  // One request event: one transaction reads the request, current run, config, session and PIN marker.
  async function acceptRequest(kitchen, requestId) {
    if (!idOk(requestId)) return { status: 'ignored' };
    const k = kitchenRef(kitchen), ref = k.collection('coolingRequests').doc(requestId);
    return db.runTransaction(async tx => {
      const [requestSnap, currentSnap, cfgSnap, enabledSnap] = await tx.getAll(ref, k.collection('cooling').doc('current'), k.collection('config').doc('main'), k.collection('cooling').doc('config'));
      const r = data(requestSnap), current = data(currentSnap), cfg = data(cfgSnap), enabled = data(enabledSnap);
      if (!r) return { status: 'missing' };
      if (r.status === 'accepted' || r.status === 'rejected') return { status: r.status, run: r.run, revision: r.revision };
      const serverMs = serverNow();
      const reject = code => {
        tx.update(ref, { status: 'rejected', code, resolvedAt: serverMs });
        return { status: 'rejected', code };
      };
      if (!validRequest(r)) return reject('invalid-request');
      if (enabled?.v !== 1 || enabled.enabled !== true) return reject('setup-needed');
      const [sessionSnap, pinSnap] = await tx.getAll(k.collection('sessions').doc(r.uid), k.collection('pinset').doc(r.by));
      if (!liveStartSession(data(sessionSnap), data(pinSnap), cfg, r, serverMs)) return reject('access-denied');
      if (current && !validCurrent(current)) return reject('invalid-state');
      if (r.expectedRun !== (current?.run || '') || r.expectedRev !== (current?.rev || 0)) return reject('changed');
      if (r.stage === 2 && (!current || !current.firstAt || current.secondAt || serverMs < current.firstDue)) return reject('not-ready');
      if (r.stage === 1 && current && (!current.secondAt || serverMs < current.secondDue)) return reject('not-ready');
      if ((current?.rev || 0) >= Number.MAX_SAFE_INTEGER - 1) return reject('invalid-state');
      const run = r.stage === 1 ? requestId : current.run;
      const next = r.stage === 1
        ? { v: 1, run, rev: (current?.rev || 0) + 1, firstAt: serverMs, firstDue: serverMs + HOURS[1] * 3600000, firstBy: r.by,
          secondAt: 0, secondDue: 0, secondBy: '', schedule: { first: 'pending', second: '' } }
        : { ...current, rev: current.rev + 1, secondAt: serverMs, secondDue: serverMs + HOURS[2] * 3600000, secondBy: r.by,
          schedule: { first: current.schedule?.first || 'pending', second: 'pending' } };
      const job = { v: 1, run, stage: r.stage, due: r.stage === 1 ? next.firstDue : next.secondDue, state: 'pending', createdAt: serverMs, queueAttempts: 0 };
      // The canonical deadline and its durable scheduling intent commit together. Enqueue happens after this transaction.
      tx.set(k.collection('cooling').doc('current'), next);
      tx.set(k.collection('coolingRuns').doc(run), next);
      tx.create(k.collection('coolingJobs').doc(run + '_' + r.stage), job);
      tx.update(ref, { status: 'accepted', code: '', run, revision: next.rev, resolvedAt: serverMs });
      return { status: 'accepted', run, revision: next.rev };
    });
  }

  async function markQueue(k, ref, job, success) {
    return db.runTransaction(async tx => {
      const [jobSnap, currentSnap] = await tx.getAll(ref, k.collection('cooling').doc('current'));
      const latest = data(jobSnap), current = data(currentSnap);
      if (!latest || !success && latest.state !== 'pending') return;
      tx.update(ref, { queueAttempts: (latest.queueAttempts || 0) + 1, queueError: success ? '' : 'queue-unavailable',
        ...(success ? { ...(latest.state === 'pending' ? { state: 'queued' } : {}), queuedAt: latest.queuedAt || serverNow() } : {}) });
      if (current?.run === job.run) tx.update(k.collection('cooling').doc('current'), { ['schedule.' + (job.stage === 1 ? 'first' : 'second')]: success ? 'queued' : 'failed' });
    });
  }
  // One outbox event or explicit repair: two reads, one queue call, then a bounded status transaction.
  async function scheduleJob(kitchen, jobId) {
    if (typeof jobId !== 'string' || !/^[A-Za-z0-9_-]{16,80}_[12]$/.test(jobId)) return { status: 'ignored' };
    const k = kitchenRef(kitchen), ref = k.collection('coolingJobs').doc(jobId);
    const [jobSnap, enabledSnap] = await db.getAll(ref, k.collection('cooling').doc('config'));
    const job = data(jobSnap);
    if (!validJob(job, jobId) || job.state !== 'pending') return { status: 'ignored' };
    if (data(enabledSnap)?.enabled !== true) throw new Error('Cooling scheduling is disabled.');
    if (dry) return { status: 'dry-run', jobId, due: job.due };
    try {
      await queue.enqueue({ jobId }, { id: hash(k.path + '/' + jobId), scheduleTime: new Date(job.due), dispatchDeadlineSeconds: 180 });
    } catch (error) {
      if (error?.code !== 'functions/task-already-exists') {
        await markQueue(k, ref, job, false);
        throw new Error('Cooling deadline could not be queued.');
      }
      // An earlier enqueue may have succeeded before its Firestore acknowledgement failed.
    }
    await markQueue(k, ref, job, true);
    return { status: 'queued' };
  }

  async function finishJob(ref, lease, patch) {
    return db.runTransaction(async tx => {
      const latest = data(await tx.get(ref));
      if (latest?.lease === lease) tx.update(ref, { ...patch, lease: '', leaseUntil: 0 });
    });
  }
  async function persistReceipts(writes) {
    const records = writes.filter(item => item.ref);
    // Each completed messaging chunk is recorded before sending the next chunk.
    for (let n = 0; n < records.length; n += 400) {
      const batch = db.batch();
      records.slice(n, n + 400).forEach(item => batch.set(item.ref, item.value));
      await batch.commit();
    }
    const gone = writes.filter(item => item.remove);
    // A registration may have refreshed while messaging rejected its former token.
    let refreshed = 0;
    for (let n = 0; n < gone.length; n += 400) refreshed += await db.runTransaction(async tx => {
      const part = gone.slice(n, n + 400), snaps = await tx.getAll(...part.map(item => item.remove));
      let changed = 0;
      part.forEach((item, i) => {
        const latest = data(snaps[i]), replaced = latest && latest.tok !== item.token;
        if (latest?.tok === item.token) tx.delete(item.remove);
        // Receipt and conditional deletion share a commit. A refreshed token remains eligible for the retry.
        tx.set(item.receipt, { state: replaced ? 'retry' : 'gone', at: serverNow() });
        if (replaced) changed++;
      });
      return changed;
    });
    return refreshed;
  }
  // One due task: bounded shared reads, one registration query, batched authority reads, and per-device receipts.
  async function dispatchJob(kitchen, jobId) {
    if (typeof jobId !== 'string' || !/^[A-Za-z0-9_-]{16,80}_[12]$/.test(jobId)) return { status: 'ignored' };
    const k = kitchenRef(kitchen), ref = k.collection('coolingJobs').doc(jobId), lease = randomUUID();
    const claim = await db.runTransaction(async tx => {
      const [jobSnap, runSnap, enabledSnap, currentSnap] = await tx.getAll(ref, k.collection('coolingRuns').doc(jobId.replace(/_[12]$/, '')), k.collection('cooling').doc('config'), k.collection('cooling').doc('current'));
      const job = data(jobSnap), run = data(runSnap), serverMs = serverNow();
      if (!validJob(job, jobId) || ['sent', 'expired', 'invalid'].includes(job.state)) return { status: 'ignored' };
      if (!validCurrent(run) || job.due !== (job.stage === 1 ? run.firstDue : run.secondDue)) {
        tx.update(ref, { state: 'invalid', completedAt: serverMs });return { status: 'ignored' };
      }
      if (serverMs < job.due) throw new Error('Cooling deadline has not arrived.');
      if (data(enabledSnap)?.enabled !== true) throw new Error('Cooling delivery is disabled.');
      if (serverMs > job.due + DELIVERY_WINDOW) {
        tx.update(ref, { state: 'expired', completedAt: serverMs });return { status: 'expired' };
      }
      if (job.leaseUntil > serverMs) throw new Error('Cooling delivery is already in progress.');
      if (!dry) {
        tx.update(ref, { lease, leaseUntil: serverMs + LEASE_MS, dispatchAttempts: (job.dispatchAttempts || 0) + 1, queuedAt: job.queuedAt || serverMs });
        // Task execution itself proves enqueue succeeded, including a lost scheduling acknowledgement.
        if (data(currentSnap)?.run === job.run) tx.update(k.collection('cooling').doc('current'), { ['schedule.' + (job.stage === 1 ? 'first' : 'second')]: 'queued' });
      }
      return { status: 'claimed', job };
    });
    if (claim.status !== 'claimed') return claim;
    if (dry) return { status: 'dry-run', jobId, due: claim.job.due };
    try {
      const [cfgSnap, subscriptions, receipts] = await Promise.all([
        k.collection('config').doc('main').get(), k.collection('coolingPush').get(), ref.collection('devices').get()
      ]);
      const cfg = data(cfgSnap), sent = new Set(receipts.docs.filter(d => ['sent', 'gone', 'skipped'].includes(d.data().state)).map(d => d.id));
      const candidates = subscriptions.docs.filter(d => uidOk(d.id) && !sent.has(d.id));
      const refs = new Map();
      for (const sub of candidates) {
        refs.set('s:' + sub.id, k.collection('sessions').doc(sub.id));
        const by = sub.data().by;
        if (personOk(by)) refs.set('p:' + by, k.collection('pinset').doc(by));
      }
      const keys = [...refs.keys()], authority = new Map();
      // getAll groups document paths; no per-person network query loop.
      for (let n = 0; n < keys.length; n += 400) {
        const part = keys.slice(n, n + 400), snaps = await db.getAll(...part.map(key => refs.get(key)));
        part.forEach((key, i) => authority.set(key, data(snaps[i])));
      }
      let failed = 0, accepted = 0;
      const writes = [];
      const eligible = [];
      for (const sub of candidates) {
        const x = sub.data();
        if (!subscribedDevice(x, authority.get('s:' + sub.id), authority.get('p:' + x.by), cfg, sub.id)) {
          writes.push({ ref: ref.collection('devices').doc(sub.id), value: { state: 'skipped', at: serverNow() } });continue;
        }
        eligible.push(sub);
      }
      await persistReceipts(writes);writes.length = 0;
      for (let n = 0; n < eligible.length; n += 500) {
        const part = eligible.slice(n, n + 500);
        const ttl = Math.max(1, Math.floor((claim.job.due + DELIVERY_WINDOW - serverNow()) / 1000));
        const response = await messaging.sendEach(part.map(sub => ({ token: sub.data().tok,
          data: { type: 'cooling', run: claim.job.run, stage: String(claim.job.stage) },
          webpush: { headers: { Urgency: 'high', TTL: String(ttl), Topic: hash(jobId).slice(0, 32) } } })));
        response.responses.forEach((result, i) => {
          const sub = part[i];
          const state = result.success ? 'sent' : goneToken(result.error) ? 'gone' : 'retry';
          if (state === 'sent') accepted++;if (state === 'retry') failed++;
          if (state === 'gone') writes.push({ remove: sub.ref, token: sub.data().tok, receipt: ref.collection('devices').doc(sub.id) });
          else writes.push({ ref: ref.collection('devices').doc(sub.id), value: { state, at: serverNow() } });
        });
        failed += await persistReceipts(writes);writes.length = 0;
      }
      await finishJob(ref, lease, failed ? { lastFailure: 'delivery-retry', state: 'retry' } : { state: 'sent', completedAt: serverNow(), lastFailure: '' });
      if (failed) throw new Error('Some cooling notifications need retry.');
      return { status: 'sent', accepted };
    } catch (error) {
      await finishJob(ref, lease, { state: 'retry', lastFailure: 'delivery-retry' });
      throw new Error('Cooling notifications need retry.');
    }
  }

  // Operator-only, on demand. No cron polling and no client access to pending jobs.
  async function repairPending(kitchen) {
    const k = kitchenRef(kitchen), jobs = await k.collection('coolingJobs').where('state', '==', 'pending').get();
    const result = { inspected: jobs.size, queued: 0, failed: 0 };
    for (const job of jobs.docs) {
      try { const value = await scheduleJob(kitchen, job.id);if (value.status === 'queued') result.queued++; }
      catch { result.failed++; }
    }
    return result;
  }
  return { acceptRequest, scheduleJob, dispatchJob, repairPending };
}
