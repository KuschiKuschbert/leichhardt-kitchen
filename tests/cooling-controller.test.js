/* Controller tests inject W acknowledgements and canonical snapshots. No live account, clock timers or database. */
const assert = require('node:assert/strict');
const C = require('../js/cooling-core');
const app = require('../js/cooling');
const AT = 1800000000000, HOUR = 3600000, RUN = 'batch_00000000001';
function stamp(ms) { return { seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1000000 }; }
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
function record(patch = {}) { return Object.assign({ v: 1, run: RUN, rev: 1, firstAt: stamp(AT), firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' }, patch); }
function second(patch = {}) { return record(Object.assign({ rev: 2, secondAt: stamp(AT + 2 * HOUR), secondBy: 'ann' }, patch)); }
function snap(data, meta = {}) { return Object.assign({ exists: data !== null, data, fromCache: false, hasPendingWrites: false }, meta); }
function harness(options = {}) {
  let user = options.signedOut ? null : { uid: 'device-a', by: 'ann', pin: '000000', issuedAt: 1000, canRead: true };
  let clock = AT, nextId = 0, canOpen = true, uiOpen = '', uiRun = '', uiHours = 0, hooks;
  const reads = [], writes = [], watchers = [], models = [], pings = [], seenWrites = [], chimes = [], storage = new Map();
  const state = { synchronousWatchError: false };
  const host = {
    core: C, session: () => user, now: () => clock, timestamp: () => ({ serverTimestamp: true }),
    requestId: () => 'batch_000000000' + String(++nextId).padStart(4, '0'),
    get(path) { reads.push(path); throw new Error('The cooling controller must not issue a document read'); },
    watch(path, next, failed, session) { const item = { path, next, failed, session, active: true }; watchers.push(item); if (state.synchronousWatchError) failed({ code: 'unavailable' }); return () => { item.active = false; }; },
    write(kind, path, data, session) { const wait = deferred(); writes.push({ kind, path, data, session, wait }); return wait.promise; },
    readSeen(session) { return storage.get(session.by) || {}; },
    writeSeen(session, value) { seenWrites.push({ session, value }); storage.set(session.by, value); },
    uiHooks: { canOpen: () => canOpen }, chime: value => chimes.push(value),
    mountUI(callbacks) {
      hooks = callbacks;
      return {
        render(model) { models.push(model); if (!model.available) this.close(true); },
        chipHTML: () => models.at(-1).available ? '<clock>' : '',
        isOpen: () => !!uiOpen,
        open() { if (uiOpen || !canOpen) return false; uiOpen = 'menu'; return true; },
        ping(hours) { if (uiOpen || !canOpen) return false; uiOpen = 'ping'; uiHours = hours; uiRun = models.at(-1).run.id; pings.push({ hours, run: uiRun }); return true; },
        close() { uiOpen = ''; },
        dispose() { this.close(true); }
      };
    }
  };
  const controller = app.create(host);
  return { controller, host, reads, writes, watchers, models, pings, seenWrites, chimes, storage, state,
    user: value => { user = value; }, currentUser: () => user, clock: value => { clock = value; }, allow: value => { canOpen = value; },
    emit(data, meta) { watchers.filter(w => w.active).forEach(w => w.next(snap(data, meta))); },
    fail(error = { code: 'unavailable' }) { watchers.filter(w => w.active).forEach(w => w.failed(error)); },
    close() { uiOpen = ''; },
    got() { hooks.onAcknowledge(uiHours, uiRun); this.close(); },
    model: () => models.at(-1),
    async ready(data = null) { controller.sync(); this.emit(data); await settle(); },
    async ack(index = writes.length - 1) { writes[index].wait.resolve(); await settle(); return writes[index]; },
    async reject(code, index = writes.length - 1) { writes[index].wait.reject({ code }); await settle(); return writes[index]; }
  };
}
let count = 0;
async function test(name, body) { await body(); count++; console.log('ok ' + name); }
(async () => {
  await test('signed-out devices have no cooling reads, listener, writes or chip', async () => {
    const h = harness({ signedOut: true }); h.controller.sync(); h.controller.tick(); assert.equal(h.controller.start(2), false);
    assert.equal(h.reads.length, 0); assert.equal(h.watchers.length, 0); assert.equal(h.controller.chipHTML(), ''); assert.equal(h.model().available, false);
  });
  await test('one canonical listener and no document reads; clock ticks never poll', async () => {
    const h = harness(); await h.ready(); assert.equal(h.model().ready, true);
    for (let i = 0; i < 120; i++) { h.clock(AT + i * 1000); h.controller.tick(); }
    assert.equal(h.reads.length, 0); assert.deepEqual(h.watchers.map(w => w.path), ['cooling/current']); assert.equal(h.writes.length, 0);
  });
  await test('cached or pending empty snapshots never manufacture an idle timer', async () => {
    for (const meta of [{ fromCache: true }, { hasPendingWrites: true }]) {
      const h = harness(); h.controller.sync(); h.emit(null, meta);
      assert.equal(h.model().ready, false); assert.equal(h.model().stale, true); assert.equal(h.controller.start(2), false); assert.equal(h.writes.length, 0);
      h.emit(null); assert.equal(h.model().ready, true); assert.equal(h.model().stale, false);
    }
  });
  await test('canonical-first start stays pending until W acknowledgement', async () => {
    const h = harness(); await h.ready(); assert.equal(h.controller.start(2), true); assert.equal(h.model().pending, 2); assert.equal(h.controller.start(2), false); await settle();
    assert.equal(h.writes.length, 1); const write = h.writes[0];
    assert.equal(write.kind, 'set'); assert.equal(write.path, 'cooling/current');
    assert.deepEqual(Object.keys(write.data).sort(), ['v', 'run', 'rev', 'firstAt', 'firstBy', 'secondAt', 'secondBy'].sort());
    assert.deepEqual(write.data.firstAt, { serverTimestamp: true }); assert.equal(write.data.firstBy, 'ann'); assert.equal(write.data.rev, 1); assert.equal(write.data.secondAt, 0);
    h.emit(record({ run: write.data.run })); assert.equal(h.model().run, null); assert.equal(h.model().pending, 2); assert.equal(h.controller.isBusy(), true);
    await h.ack(); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.id, write.data.run); assert.equal(h.model().pending, 0); assert.equal(h.watchers.length, 1);
  });
  await test('W acknowledgement alone and cached estimates cannot confirm a start', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); const write = await h.ack();
    assert.equal(h.controller.pendingWork().accepted, true); assert.equal(h.controller.isBusy(), true); assert.equal(h.model().run, null);
    h.emit(record({ run: write.data.run }), { hasPendingWrites: true }); assert.equal(h.controller.isBusy(), true);
    h.emit(record({ run: write.data.run }), { fromCache: true }); assert.equal(h.controller.isBusy(), true);
    h.emit(record({ run: write.data.run })); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.firstDue, AT + 2 * HOUR);
  });
  await test('manual stage two uses an update only after the first server-derived deadline', async () => {
    const h = harness(); await h.ready(record()); assert.equal(h.controller.start(4), false); h.clock(AT + 2 * HOUR); assert.equal(h.writes.length, 0);
    assert.equal(h.controller.start(4), true); await settle(); const write = await h.ack();
    assert.equal(write.kind, 'update'); assert.equal(write.path, 'cooling/current');
    assert.deepEqual(write.data, { rev: 2, secondAt: { serverTimestamp: true }, secondBy: 'ann' }); assert.equal(h.controller.isBusy(), true);
    const later = AT + 2 * HOUR + 600000; h.emit(second({ secondAt: stamp(later) }));
    assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.secondAt, later); assert.equal(h.model().run.secondDue, later + 4 * HOUR);
  });
  await test('another batch requires both stages finished and increments the shared revision', async () => {
    const h = harness(); h.clock(AT + 3 * HOUR); await h.ready(second()); assert.equal(h.controller.start(2), false);
    h.clock(AT + 6 * HOUR); assert.equal(h.controller.start(2), true); await settle(); const write = h.writes[0];
    assert.equal(write.kind, 'set'); assert.equal(write.data.rev, 3); assert.notEqual(write.data.run, RUN);
    assert.equal(write.data.secondAt, 0); assert.equal(write.data.secondBy, '');
    h.emit(record({ run: write.data.run, rev: 3, firstAt: stamp(AT + 6 * HOUR) })); await h.ack();
    assert.equal(h.model().run.rev, 3); assert.equal(h.model().run.firstDue, AT + 8 * HOUR);
  });
  await test('a simultaneous rejected start shows the shared winner and an explicit refusal', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle();
    h.emit(record({ firstBy: 'bo', by: 'bo' })); await h.reject('permission-denied');
    assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.firstBy, 'bo'); assert.match(h.model().actionError.message, /not saved.*shared timer changed/);
    assert.equal(h.controller.start(2), false); assert.equal(h.writes.length, 1);
  });
  await test('same-person competing stage two cannot turn a definite refusal into own success', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record()); h.controller.start(4); await settle();
    h.emit(second()); assert.equal(h.model().run.secondAt, 0); assert.equal(h.controller.isBusy(), true);
    await h.reject('permission-denied'); assert.equal(h.controller.isBusy(), false); assert.match(h.model().actionError.message, /not saved/);
    for (let i = 0; i < 10; i++) h.controller.tick();
    assert.match(h.model().actionError.message, /not saved/); assert.equal(h.model().run.secondDue, AT + 6 * HOUR); assert.equal(h.writes.length, 1);
  });
  await test('lost first-stage acknowledgement recovers from its unique canonical run without replay', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); const write = await h.reject('unavailable');
    assert.equal(h.controller.isBusy(), true); assert.match(h.model().error, /unknown/); assert.equal(h.controller.start(2), false);
    h.controller.retryRead(); assert.equal(h.watchers.filter(w => w.active).length, 1);
    h.emit(record({ run: write.data.run })); assert.equal(h.controller.isBusy(), false); assert.equal(h.writes.length, 1); assert.equal(h.reads.length, 0); assert.equal(h.model().error, '');
  });
  await test('lost second-stage acknowledgement recovers a matching transition and reports an exact competing winner', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record()); h.controller.start(4); await settle(); await h.reject('unavailable');
    h.emit(second()); assert.equal(h.controller.isBusy(), false); assert.equal(h.writes.length, 1);
    const other = harness(); other.clock(AT + 2 * HOUR); await other.ready(record()); other.controller.start(4); await settle(); await other.reject('unavailable');
    other.emit(second({ secondBy: 'bo', by: 'bo' })); assert.equal(other.controller.isBusy(), false); assert.match(other.model().actionError.message, /not saved.*shared timer changed/);
    assert.equal(other.model().error, ''); assert.equal(other.model().run.secondBy, 'bo');
    other.emit(record({ run: 'later_00000000002', rev: 3, firstAt: stamp(AT + 6 * HOUR) })); other.controller.tick();
    assert.match(other.model().actionError.message, /not saved/); assert.equal(other.writes.length, 1);
  });
  await test('an exact competing first-stage revision resolves an unknown acknowledgement as refused', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); const write = await h.reject('unavailable');
    h.emit(record({ firstBy: 'bo', by: 'bo' }));
    assert.equal(h.controller.isBusy(), false); assert.equal(h.model().error, ''); assert.equal(h.model().run.firstBy, 'bo');
    assert.match(h.model().actionError.message, /not saved.*shared timer changed/);
    // A later snapshot matching the old attempted run must not reclassify its proved refusal as success.
    h.emit(record({ run: write.data.run, rev: 3, firstAt: stamp(AT + 6 * HOUR) })); h.controller.tick();
    assert.match(h.model().actionError.message, /not saved/); assert.equal(h.writes.length, 1);
  });
  await test('a matching callback before an uncertain W rejection can prove the shared transition', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); const write = h.writes[0];
    h.emit(record({ run: write.data.run })); assert.equal(h.controller.isBusy(), true);
    await h.reject('unavailable'); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().error, '');
  });
  await test('daily lock hides state and retains the original pending person through acknowledgement', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); const write = h.writes[0], oldWatch = h.watchers[0];
    h.user(null); h.controller.sync(); assert.equal(h.model().available, false); assert.equal(h.model().run, null);
    assert.equal(h.controller.pendingWork().person, 'ann'); assert.equal(h.controller.isBusy(), true); assert(h.watchers.every(w => !w.active));
    oldWatch.next(snap(record({ run: write.data.run }))); await h.ack(); assert.equal(h.model().available, false); assert.equal(h.controller.isBusy(), true);
    h.user({ uid: 'device-a', by: 'bo', pin: '000000', issuedAt: 2000, canRead: true }); h.controller.sync(); assert.equal(h.model().available, false); assert.equal(h.watchers.length, 1);
    h.user({ uid: 'device-a', by: 'ann', pin: '000000', issuedAt: 3000, canRead: true }); h.controller.sync(); h.emit(record({ run: write.data.run }));
    assert.equal(h.controller.isBusy(), false); assert.equal(h.writes.length, 1); assert.equal(write.session.issuedAt, 1000); assert.equal(h.model().run.id, write.data.run);
  });
  await test('lock before deferred submission cannot send under a replacement session', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); h.user(null); h.controller.sync(); await settle();
    assert.equal(h.writes.length, 0); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().available, false);
  });
  await test('definite refusal allows an explicit fresh attempt and never retries itself', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); await h.reject('permission-denied');
    assert.equal(h.controller.isBusy(), false); assert.match(h.model().actionError.message, /Sign in again/);
    for (let i = 0; i < 10; i++) h.controller.tick();
    assert.equal(h.writes.length, 1); assert.equal(h.controller.start(2), true); await settle();
    assert.equal(h.writes.length, 2); assert.notEqual(h.writes[0].data.run, h.writes[1].data.run);
  });
  await test('malformed, regressed and rewritten canonical starts never become ready', async () => {
    const h = harness(); await h.ready(record()); h.emit(record({ firstAt: AT }));
    assert.equal(h.model().ready, false); assert.match(h.model().error, /verify/); assert.equal(h.model().run.firstDue, AT + 2 * HOUR);
    h.emit(record({ firstAt: stamp(AT + 1) })); assert.equal(h.model().ready, false);
    h.emit(second()); assert.equal(h.model().ready, true); h.emit(record()); assert.equal(h.model().ready, false);
    h.emit(null); assert.equal(h.model().ready, false); assert.equal(h.controller.start(2), false);
  });
  await test('listener failure and cached reconnect are explicit and never become empty state', async () => {
    const h = harness(); await h.ready(record()); h.fail(); assert.equal(h.model().stale, true); assert.match(h.model().error, /read/);
    h.controller.retryRead(); assert.equal(h.model().stale, true); h.emit(null, { fromCache: true }); assert.equal(h.model().run.id, RUN);
    h.emit(record()); assert.equal(h.model().stale, false); assert.equal(h.model().error, ''); assert.equal(h.reads.length, 0); assert.equal(h.watchers.filter(w => w.active).length, 1);
    const syncFailure = harness(); syncFailure.state.synchronousWatchError = true; syncFailure.controller.sync();
    assert.equal(syncFailure.model().stale, true); assert(syncFailure.watchers.every(w => !w.active));
  });
  await test('invalid clocks block both a new batch and the second stage', async () => {
    for (const data of [null, record()]) for (const time of [NaN, Infinity, 0, -1]) {
      const h = harness(); await h.ready(data); h.clock(time); h.controller.tick();
      assert.equal(h.model().ready, false); assert.equal(h.controller.start(data ? 4 : 2), false); assert.equal(h.writes.length, 0);
    }
  });
  await test('blocked alerts queue once and Got it stores only this person’s event IDs', async () => {
    const h = harness(); h.allow(false); await h.ready(record()); h.clock(AT + 2 * HOUR); h.controller.tick(); assert.equal(h.pings.length, 0);
    h.allow(true); h.controller.tick(); assert.equal(h.pings.length, 1); assert.equal(h.chimes.length, 1); h.got(); h.controller.tick(); assert.equal(h.pings.length, 1);
    assert.deepEqual(Object.keys(h.seenWrites[0].value), [RUN + '_1']); assert.equal(h.seenWrites[0].session.by, 'ann'); assert.equal(h.writes.length, 0);
    h.user({ uid: 'device-a', by: 'bo', pin: '000000', issuedAt: 2000, canRead: true }); h.controller.sync(); h.emit(record()); assert.equal(h.pings.length, 2);
  });
  await test('closing a ping without Got it does not repeat on each clock tick', async () => {
    const h = harness(); await h.ready(record()); h.clock(AT + 2 * HOUR); h.controller.tick(); h.close();
    for (let i = 0; i < 10; i++) h.controller.tick();
    assert.equal(h.pings.length, 1); assert.equal(h.seenWrites.length, 0);
  });
  await test('an old open ping cannot acknowledge a new batch', async () => {
    const h = harness(); await h.ready(record()); h.clock(AT + 2 * HOUR); h.controller.tick();
    h.emit(record({ run: 'batch_00000000002', rev: 3 })); h.got(); assert.deepEqual(Object.keys(h.seenWrites[0].value), [RUN + '_1']);
  });
  await test('acknowledged work can settle against a later canonical revision', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); await h.ack();
    h.emit(record({ run: 'later_00000000001', rev: 3 })); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.rev, 3);
    const uncertain = harness(); await uncertain.ready(); uncertain.controller.start(2); await settle(); await uncertain.reject('unavailable');
    uncertain.emit(record({ run: 'later_00000000001', rev: 3 })); assert.equal(uncertain.controller.isBusy(), true);
  });
  await test('failed construction and disposal cannot strand or submit pending work', async () => {
    const h = harness(); await h.ready(); h.host.timestamp = () => { throw new Error('SDK not ready'); };
    assert.equal(h.controller.start(2), false); assert.equal(h.controller.isBusy(), false); assert.equal(h.writes.length, 0); assert.match(h.model().actionError.message, /Couldn’t start/);
    const disposed = harness(); await disposed.ready(); disposed.controller.start(2); disposed.controller.dispose(); await settle();
    assert.equal(disposed.writes.length, 0); assert(disposed.watchers.every(w => !w.active)); assert.equal(disposed.model().available, false);
  });
  console.log(count + ' controller checks passed');
})().catch(error => { console.error('FAIL cooling controller', error); process.exit(1); });
