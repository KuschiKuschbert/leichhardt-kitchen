/* Controller tests inject W acknowledgements and canonical snapshots. No live account, clock timers or database. */
const assert = require('node:assert/strict');
const C = require('../js/cooling-core');
const app = require('../js/cooling');
const AT = Date.parse('2027-01-15T12:00:00+10:00'), HOUR = 3600000, RUN = 'batch_00000000001';
function stamp(ms) { return { seconds: Math.floor(ms / 1000), nanoseconds: (ms % 1000) * 1000000 }; }
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
function record(patch = {}) { return Object.assign({ v: 1, run: RUN, rev: 1, firstAt: stamp(AT), firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' }, patch); }
function second(patch = {}) { return record(Object.assign({ rev: 2, secondAt: stamp(AT + 2 * HOUR), secondBy: 'ann' }, patch)); }
function declaration(patch = {}) { return Object.assign({ v: 1, run: RUN, firstAt: stamp(AT + 2 * HOUR), firstBy: 'ann', secondAt: 0, secondBy: '', by: 'ann' }, patch); }
function snap(data, meta = {}) { return Object.assign({ exists: data !== null, data, fromCache: false, hasPendingWrites: false }, meta); }
function harness(options = {}) {
  let user = options.signedOut ? null : { uid: 'device-a', by: 'ann', pin: '000000', issuedAt: 1000, canRead: true };
  let clock = AT, nextId = 0, canOpen = true, uiOpen = '', uiRun = '', uiHours = 0, hooks;
  const reads = [], writes = [], watchers = [], models = [], pings = [], seenWrites = [], chimes = [], soundStops = [], storage = options.storage || new Map();
  const state = { synchronousWatchError: false };
  const host = {
    core: C, session: () => user, now: () => clock, timestamp: () => ({ serverTimestamp: true }),
    requestId: () => 'batch_000000000' + String(++nextId).padStart(4, '0'),
    get(path) { reads.push(path); throw new Error('The cooling controller must not issue a document read'); },
    watch(path, next, failed, session) { const item = { path, next, failed, session, active: true }; watchers.push(item); if (state.synchronousWatchError) failed({ code: 'unavailable' }); return () => { item.active = false; }; },
    write(kind, path, data, session) { const wait = deferred(); writes.push({ kind, path, data, session, wait }); return wait.promise; },
    readSeen(session) { return storage.get(session.uid + '|' + session.pin) || {}; },
    writeSeen(session, value) { seenWrites.push({ session, value }); storage.set(session.uid + '|' + session.pin, value); },
    uiHooks: { canOpen: () => canOpen }, chime: value => chimes.push(value), stopChime: () => soundStops.push(true),
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
  return { controller, host, reads, writes, watchers, models, pings, seenWrites, chimes, soundStops, storage, state,
    user: value => { user = value; }, currentUser: () => user, clock: value => { clock = value; }, allow: value => { canOpen = value; },
    emit(data, meta) { watchers.filter(w => w.active && w.path === 'cooling/current').forEach(w => w.next(snap(data, meta))); },
    recorded(data, meta) { watchers.filter(w => w.active && w.path === 'cooling/recorded').forEach(w => w.next(snap(data, meta))); },
    fail(error = { code: 'unavailable' }, path = 'cooling/current') { watchers.filter(w => w.active && w.path === path).forEach(w => w.failed(error)); },
    close() { uiOpen = ''; },
    isOpen: () => !!uiOpen,
    got() { hooks.onAcknowledge(uiHours, uiRun); this.close(); },
    model: () => models.at(-1),
    async ready(data = null, recorded = null) { controller.sync(); this.emit(data); this.recorded(recorded); await settle(); },
    async ack(index = writes.length - 1) { writes[index].wait.resolve(); await settle(); return writes[index]; },
    async reject(code, index = writes.length - 1) { writes[index].wait.reject({ code }); await settle(); return writes[index]; }
  };
}
let count = 0;
async function test(name, body) { await body(); count++; console.log('ok ' + name); }
(async () => {
  await test('a screen waking at 21:00 hides the old run without a reset write', async () => {
    const h = harness(); h.clock(Date.parse('2027-01-15T21:00:00+10:00')); await h.ready(record());
    assert.equal(h.model().run, null); assert.equal(h.pings.length, 0); assert.equal(h.writes.length, 0);
  });
  await test('automatic presentation persists on this device before any dismissal', async () => {
    const h = harness(); await h.ready(record()); h.clock(AT + 2 * HOUR); h.controller.tick();
    assert.equal(h.pings.length, 1); assert.equal(h.seenWrites.length, 1);
    assert.equal(h.seenWrites[0].value[RUN + '_1'], true); assert.equal(h.writes.length, 0);
  });
  await test('signed-out devices have no cooling reads, listener, writes or chip', async () => {
    const h = harness({ signedOut: true }); h.controller.sync(); h.controller.tick(); assert.equal(h.controller.start(2), false);
    assert.equal(h.reads.length, 0); assert.equal(h.watchers.length, 0); assert.equal(h.controller.chipHTML(), ''); assert.equal(h.model().available, false);
  });
  await test('two bounded live documents and no document reads; clock ticks never poll', async () => {
    const h = harness(); await h.ready(); assert.equal(h.model().ready, true);
    for (let i = 0; i < 120; i++) { h.clock(AT + i * 1000); h.controller.tick(); }
    assert.equal(h.reads.length, 0); assert.deepEqual(h.watchers.map(w => w.path), ['cooling/current', 'cooling/recorded']); assert.equal(h.writes.length, 0);
  });
  await test('locking or replacing the session stops any remaining cooling chimes', async () => {
    const h = harness(); await h.ready(record()); h.soundStops.length = 0;
    h.clock(AT + 2 * HOUR); h.controller.tick(); assert.equal(h.chimes.length, 1);
    h.controller.sync(); assert.equal(h.soundStops.length, 0);
    h.user(Object.assign({}, h.currentUser(), { issuedAt: 2000 })); h.controller.sync();
    assert.equal(h.soundStops.length, 1);
    h.controller.stop(); assert.equal(h.soundStops.length, 2);
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
    assert.deepEqual(Object.keys(write.data).sort(), ['v', 'run', 'rev', 'windowAt', 'firstAt', 'firstBy', 'secondAt', 'secondBy'].sort());
    assert.deepEqual(write.data.firstAt, { serverTimestamp: true }); assert.equal(write.data.firstBy, 'ann'); assert.equal(write.data.rev, 1); assert.equal(write.data.secondAt, 0); assert.equal(write.data.windowAt, C.windowAt(AT).opensAt);
    h.emit(record({ run: write.data.run })); assert.equal(h.model().run, null); assert.equal(h.model().pending, 2); assert.equal(h.controller.isBusy(), true);
    await h.ack(); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.id, write.data.run); assert.equal(h.model().pending, 0); assert.equal(h.watchers.length, 2);
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
  await test('the next daily window permits another batch and increments the shared revision', async () => {
    const h = harness(); h.clock(AT + 3 * HOUR); await h.ready(second()); assert.equal(h.controller.start(2), false);
    const unlock = C.windowAt(AT + 86400000).opensAt; h.clock(unlock); assert.equal(h.controller.start(2), true); await settle(); const write = h.writes[0];
    assert.equal(write.kind, 'set'); assert.equal(write.data.rev, 3); assert.notEqual(write.data.run, RUN);
    assert.equal(write.data.secondAt, 0); assert.equal(write.data.secondBy, '');
    h.emit(record({ run: write.data.run, rev: 3, firstAt: stamp(unlock) })); await h.ack();
    assert.equal(h.model().run.rev, 3); assert.equal(h.model().run.firstDue, unlock + 2 * HOUR);
  });
  await test('completion, refresh and direct calls stay locked until next 10:00 without extra reads or writes', async () => {
    const due = Date.parse('2026-11-09T18:00:00+10:00'), unlock = Date.parse('2026-11-10T10:00:00+10:00');
    const complete = second({ firstAt: stamp(due - 6 * HOUR), secondAt: stamp(due - 4 * HOUR) });
    for (const at of [due, unlock - 1]) {
      const h = harness(); h.clock(at); await h.ready(complete);
      assert.equal(h.controller.start(2), false); assert.equal(h.writes.length, 0); assert.equal(h.reads.length, 0);
      h.controller.dispose();
    }
    const h = harness(); h.clock(unlock - 1); await h.ready(complete);
    h.clock(unlock); h.controller.tick(); assert.equal(h.writes.length, 0);
    assert.equal(h.controller.start(2), true); await settle();
    assert.equal(h.writes.length, 1); assert.equal(h.writes[0].data.rev, 3);
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
    h.controller.retryRead(); assert.equal(h.watchers.filter(w => w.active).length, 2);
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
    h.user({ uid: 'device-a', by: 'bo', pin: '000000', issuedAt: 2000, canRead: true }); h.controller.sync(); assert.equal(h.model().available, false); assert.equal(h.watchers.length, 2);
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
    h.emit(record()); assert.equal(h.model().stale, false); assert.equal(h.model().error, ''); assert.equal(h.reads.length, 0); assert.equal(h.watchers.filter(w => w.active).length, 2);
    const syncFailure = harness(); syncFailure.state.synchronousWatchError = true; syncFailure.controller.sync();
    assert.equal(syncFailure.model().stale, true); assert(syncFailure.watchers.every(w => !w.active));
  });
  await test('invalid clocks block both a new batch and the second stage', async () => {
    for (const data of [null, record()]) for (const time of [NaN, Infinity, 0, -1]) {
      const h = harness(); await h.ready(data); h.clock(time); h.controller.tick();
      assert.equal(h.model().ready, false); assert.equal(h.controller.start(data ? 4 : 2), false); assert.equal(h.writes.length, 0);
    }
  });
  await test('blocked alerts queue once and presentation IDs persist across people on the device', async () => {
    const h = harness(); h.allow(false); await h.ready(record()); h.clock(AT + 2 * HOUR); h.controller.tick(); assert.equal(h.pings.length, 0);
    h.allow(true); h.controller.tick(); assert.equal(h.pings.length, 1); assert.equal(h.chimes.length, 1); h.got(); h.controller.tick(); assert.equal(h.pings.length, 1);
    assert.deepEqual(Object.keys(h.seenWrites[0].value), [RUN + '_1']); assert.equal(h.seenWrites[0].session.by, 'ann'); assert.equal(h.writes.length, 0);
    h.user({ uid: 'device-a', by: 'bo', pin: '000000', issuedAt: 2000, canRead: true }); h.controller.sync(); h.emit(record()); h.recorded(null); assert.equal(h.pings.length, 1);
  });
  await test('closing a ping without Got it does not repeat on each clock tick', async () => {
    const h = harness(); await h.ready(record()); h.clock(AT + 2 * HOUR); h.controller.tick(); h.close();
    for (let i = 0; i < 10; i++) h.controller.tick();
    assert.equal(h.pings.length, 1); assert.equal(h.seenWrites.length, 1);
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
  await test('first popup waits for both fresh documents and never trusts cached absence', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); h.controller.sync(); h.emit(record());
    assert.equal(h.pings.length, 0); assert.equal(h.model().recordedReady, false); assert.equal(h.controller.confirm(2, RUN), false);
    h.recorded(null, { fromCache: true }); assert.equal(h.pings.length, 0); assert.equal(h.model().recordedReady, false);
    h.recorded(null, { hasPendingWrites: true }); assert.equal(h.pings.length, 0);
    h.recorded(null); assert.equal(h.pings.length, 1); assert.equal(h.model().recordedReady, true); assert.equal(h.writes.length, 0);
  });
  await test('a fresh browser instance and another person on this device do not replay an already presented stage', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record()); assert.equal(h.pings.length, 1); h.close();
    const reload = harness({ storage: h.storage }); reload.clock(AT + 2 * HOUR); await reload.ready(record()); assert.equal(reload.pings.length, 0);
    reload.user({ ...reload.currentUser(), by: 'bo', issuedAt: 2000 }); reload.controller.sync(); reload.emit(record()); reload.recorded(null);
    assert.equal(reload.pings.length, 0);
    const otherDevice = harness(); otherDevice.clock(AT + 2 * HOUR); await otherDevice.ready(record()); assert.equal(otherDevice.pings.length, 1);
    reload.emit(record({ run: 'batch_00000000002', rev: 3 })); assert.equal(reload.pings.length, 1);
  });
  await test('a storage event imports sibling-tab presentation IDs without database work', async () => {
    const h = harness(); await h.ready(record()); h.storage.set('device-a|000000', { [RUN + '_1']: true });
    h.controller.refreshSeen(); h.clock(AT + 2 * HOUR); h.controller.tick();
    assert.equal(h.pings.length, 0); assert.equal(h.writes.length, 0); assert.equal(h.watchers.length, 2);
  });
  await test('saved confirmation prevents all devices from receiving that stage but not the next one', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(second(), declaration()); assert.equal(h.pings.length, 0);
    h.clock(AT + 6 * HOUR); h.controller.tick(); assert.equal(h.pings.length, 1); assert.equal(h.pings[0].hours, 4);
    const other = harness(); other.clock(AT + 6 * HOUR); await other.ready(second(), declaration({ secondAt: stamp(AT + 6 * HOUR), secondBy: 'bo', by: 'bo' }));
    assert.equal(other.pings.length, 0); assert.equal(other.writes.length, 0);
  });
  await test('confirmation uses a separate server-timestamped record and waits for its write acknowledgement', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record());
    assert.equal(h.controller.confirm(2, RUN), true); assert.equal(h.model().confirmPending, 2); assert.equal(h.controller.isBusy(), true);
    assert.equal(h.controller.confirm(2, RUN), false); assert.equal(h.controller.start(4), false); await settle();
    assert.equal(h.writes.length, 1); const w = h.writes[0]; assert.equal(w.kind, 'set'); assert.equal(w.path, 'cooling/recorded');
    assert.deepEqual(w.data, { v: 1, run: RUN, firstAt: { serverTimestamp: true }, firstBy: 'ann', secondAt: 0, secondBy: '' });
    h.recorded(declaration()); assert.equal(h.model().confirmPending, 2); assert.equal(h.controller.isBusy(), true);
    await h.ack(); assert.equal(h.model().confirmPending, 0); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.rev, 1);
    assert.equal(h.controller.start(4), true);
  });
  await test('confirmation promise alone or local estimates cannot claim shared completion', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record()); h.controller.confirm(2, RUN); await settle(); await h.ack();
    assert.equal(h.model().confirmPending, 2); assert.equal(h.model().recorded, null);
    h.recorded(declaration(), { fromCache: true }); assert.equal(h.model().confirmPending, 2); assert.equal(h.model().recorded, null);
    h.recorded(declaration(), { hasPendingWrites: true }); assert.equal(h.model().confirmPending, 2);
    h.recorded(declaration()); assert.equal(h.model().confirmPending, 0); assert.equal(h.model().recorded.firstBy, 'ann');
  });
  await test('second-stage confirmation updates only its own fields and may be recorded before the first declaration', async () => {
    const h = harness(); h.clock(AT + 6 * HOUR); await h.ready(second(), declaration());
    h.controller.confirm(4, RUN); await settle();
    assert.equal(h.writes[0].kind, 'update'); assert.deepEqual(h.writes[0].data, { run: RUN, secondAt: { serverTimestamp: true }, secondBy: 'ann' });
    await h.ack(); h.recorded(declaration({ secondAt: stamp(AT + 6 * HOUR), secondBy: 'ann' })); assert.equal(h.controller.isBusy(), false);
    const other = harness(); other.clock(AT + 6 * HOUR); await other.ready(second()); other.controller.confirm(4, RUN); await settle();
    assert.deepEqual(other.writes[0].data, { v: 1, run: RUN, firstAt: 0, firstBy: '', secondAt: { serverTimestamp: true }, secondBy: 'ann' });
  });
  await test('early, wrong-run, unsupported and already recorded confirmations do not write', async () => {
    const h = harness(); await h.ready(record()); assert.equal(h.controller.confirm(2, RUN), false);
    h.clock(AT + 2 * HOUR); assert.equal(h.controller.confirm(4, RUN), false); assert.equal(h.controller.confirm(2, 'batch_00000000002'), false);
    assert.equal(h.controller.confirm(3, RUN), false); h.recorded(declaration()); assert.equal(h.controller.confirm(2, RUN), false);
    assert.equal(h.writes.length, 0); assert.equal(h.controller.isBusy(), false);
  });
  await test('an existing earlier-run declaration is replaced without changing the timer', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record(), declaration({ run: 'batch_previous_01' }));
    assert.equal(h.controller.confirm(2, RUN), true); await settle(); assert.equal(h.writes[0].kind, 'set'); assert.equal(h.writes[0].path, 'cooling/recorded');
    assert.equal(h.writes[0].data.run, RUN); assert.equal(h.writes[0].data.secondAt, 0);
    h.recorded(declaration()); await h.ack(); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.rev, 1);
  });
  await test('a refused confirmation stays named until an explicit retry and never retries on ticks', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record()); h.controller.confirm(2, RUN); await settle(); await h.reject('permission-denied');
    assert.equal(h.controller.isBusy(), false); assert.match(h.model().confirmError.message, /Couldn’t save the Operandio 2-hour confirmation/);
    for (let i = 0; i < 10; i++) h.controller.tick(); assert.equal(h.writes.length, 1);
    assert.equal(h.controller.confirm(2, RUN), true); assert.equal(h.model().confirmError, null); await settle(); assert.equal(h.writes.length, 2);
  });
  await test('another person winning the same confirmation settles a refused or uncertain request as shared completion', async () => {
    for (const code of ['permission-denied', 'unavailable']) {
      const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record()); h.controller.confirm(2, RUN); await settle();
      h.recorded(declaration({ firstBy: 'bo', by: 'bo' })); assert.equal(h.model().confirmPending, 2); await h.reject(code);
      assert.equal(h.controller.isBusy(), false); assert.equal(h.model().confirmError, null); assert.equal(h.model().recorded.firstBy, 'bo');
      assert.equal(h.writes.length, 1);
    }
  });
  await test('uncertain confirmation remains protected and is reconciled without replay', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record()); h.controller.confirm(2, RUN); await settle(); await h.reject('unavailable');
    assert.equal(h.controller.isBusy(), true); assert.match(h.model().recordedError, /unknown/); assert.equal(h.controller.confirm(2, RUN), false);
    h.controller.retryRead(); h.emit(record()); h.recorded(null); assert.equal(h.controller.isBusy(), true); assert.equal(h.writes.length, 1);
    h.recorded(declaration()); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().recordedError, '');
    const replaced = harness(); replaced.clock(AT + 2 * HOUR); await replaced.ready(record()); replaced.controller.confirm(2, RUN); await settle(); await replaced.reject('unavailable');
    replaced.emit(record({ run: 'batch_00000000002', rev: 3 })); assert.equal(replaced.controller.isBusy(), false);
    assert.match(replaced.model().confirmError.message, /batch changed/); assert.equal(replaced.writes.length, 1);
  });
  await test('confirmation follows original-person lock recovery and cannot submit under another identity', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record()); h.controller.confirm(2, RUN); await settle(); const old = h.watchers.find(w => w.path === 'cooling/recorded');
    h.user(null); h.controller.sync(); old.next(snap(declaration())); await h.ack(); assert.equal(h.model().available, false); assert.equal(h.controller.isBusy(), true);
    assert.equal(h.controller.pendingWork().person, 'ann');
    h.user({ uid: 'device-a', by: 'bo', pin: '000000', issuedAt: 2000, canRead: true }); h.controller.sync(); assert.equal(h.model().available, false);
    h.user({ uid: 'device-a', by: 'ann', pin: '000000', issuedAt: 3000, canRead: true }); h.controller.sync(); h.emit(record()); h.recorded(declaration());
    assert.equal(h.controller.isBusy(), false); assert.equal(h.writes[0].session.by, 'ann'); assert.equal(h.writes[0].session.issuedAt, 1000);
    const before = harness(); before.clock(AT + 2 * HOUR); await before.ready(record()); before.controller.confirm(2, RUN); before.user(null); before.controller.sync(); await settle();
    assert.equal(before.writes.length, 0); assert.equal(before.controller.isBusy(), false);
  });
  await test('confirmation read failure does not stop an existing timer start or pretend the missing declaration is empty', async () => {
    const h = harness(); await h.ready(); h.fail({ code: 'unavailable' }, 'cooling/recorded');
    assert.equal(h.model().recordedReady, false); assert.match(h.model().recordedError, /read/); assert.equal(h.controller.start(2), true);
    const due = harness(); due.clock(AT + 2 * HOUR); due.controller.sync(); due.emit(record()); due.fail({ code: 'unavailable' }, 'cooling/recorded');
    assert.equal(due.pings.length, 0); assert.equal(due.controller.confirm(2, RUN), false); assert.equal(due.writes.length, 0);
    due.controller.retryRead(); due.emit(record()); due.recorded(declaration()); assert.equal(due.pings.length, 0); assert.equal(due.model().recordedReady, true);
  });
  await test('malformed, regressed or before-deadline declarations fail closed', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record(), declaration());
    h.recorded(declaration({ firstAt: stamp(AT + 2 * HOUR + 1) })); assert.equal(h.model().recordedReady, false); assert.match(h.model().recordedError, /verify/);
    assert.equal(h.model().recorded.firstAt, AT + 2 * HOUR); h.recorded(declaration()); assert.equal(h.model().recordedReady, true);
    h.recorded(null); assert.equal(h.model().recordedReady, false);
    const early = harness(); early.clock(AT + 2 * HOUR); await early.ready(record(), declaration({ firstAt: stamp(AT) }));
    assert.equal(early.model().recordedReady, false); assert.equal(early.pings.length, 0); assert.equal(early.controller.confirm(2, RUN), false);
  });
  await test('confirmation construction failure and disposal leave no hidden pending write', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record()); h.host.timestamp = () => { throw new Error('SDK not ready'); };
    assert.equal(h.controller.confirm(2, RUN), false); assert.equal(h.controller.isBusy(), false); assert.match(h.model().confirmError.message, /Couldn’t save/);
    const other = harness(); other.clock(AT + 2 * HOUR); await other.ready(record()); other.controller.confirm(2, RUN); other.controller.dispose(); await settle();
    assert.equal(other.writes.length, 0); assert(other.watchers.every(w => !w.active));
  });
  await test('21:00 closes an outstanding ping and stops its remaining chimes without a write', async () => {
    const close = Date.parse('2027-01-15T21:00:00+10:00'), h = harness();
    h.clock(close - 1); await h.ready(record()); assert.equal(h.pings.length, 1); assert.equal(h.isOpen(), true);
    const reads = h.watchers.length, writes = h.writes.length, stops = h.soundStops.length;
    h.clock(close); h.controller.tick();
    assert.equal(h.model().window.open, false); assert.equal(h.model().run, null); assert.equal(h.model().rawRun.id, RUN);
    assert.equal(h.isOpen(), false); assert.equal(h.soundStops.length, stops + 1); assert.equal(h.pings.length, 1);
    assert.equal(h.controller.open(), false); assert.equal(h.controller.start(2), false); assert.equal(h.controller.start(4), false);
    assert.equal(h.controller.confirm(2, RUN), false); assert.equal(h.writes.length, writes); assert.equal(h.watchers.length, reads);
    h.controller.tick(); assert.equal(h.soundStops.length, stops + 1);
  });
  await test('10:00 returns to idle after an unfinished previous day without automatic activation', async () => {
    const open = Date.parse('2027-01-16T10:00:00+10:00'), h = harness();
    h.clock(open - 1); await h.ready(record()); assert.equal(h.model().run, null); assert.equal(h.model().window.open, false); assert.equal(h.pings.length, 0);
    const reads = h.watchers.length; h.clock(open); h.controller.tick();
    assert.equal(h.model().window.open, true); assert.equal(h.model().run, null); assert.equal(h.model().rawRun.rev, 1);
    assert.equal(h.writes.length, 0); assert.equal(h.watchers.length, reads); assert.equal(h.controller.confirm(2, RUN), false);
    assert.equal(h.controller.start(4), false); assert.equal(h.controller.start(2), true); await settle();
    assert.equal(h.writes.length, 1); assert.equal(h.writes[0].data.rev, 2); assert.equal(h.writes[0].data.secondAt, 0);
    const id = h.writes[0].data.run; h.emit(record({ run: id, rev: 2, firstAt: stamp(open) })); await h.ack();
    assert.equal(h.model().run.id, id); assert.equal(h.model().run.firstDue, open + 2 * HOUR); assert.equal(h.pings.length, 0);
  });
  await test('a screen sleeping across cutoff and the next opening cannot resume yesterday’s ping', async () => {
    const h = harness(); h.clock(AT + 2 * HOUR); await h.ready(record()); assert.equal(h.isOpen(), true);
    const count = h.pings.length, stops = h.soundStops.length;
    h.clock(Date.parse('2027-01-16T12:00:00+10:00')); h.controller.tick();
    assert.equal(h.model().window.open, true); assert.equal(h.model().run, null); assert.equal(h.isOpen(), false);
    assert.equal(h.soundStops.length, stops + 1); assert.equal(h.pings.length, count); assert.equal(h.writes.length, 0);
    const fresh = harness(); fresh.clock(Date.parse('2027-01-16T12:00:00+10:00')); await fresh.ready(record());
    assert.equal(fresh.model().run, null); assert.equal(fresh.pings.length, 0); assert.equal(fresh.writes.length, 0);
  });
  await test('cutoff between a tap and its deferred submission sends neither start nor confirmation', async () => {
    const close = Date.parse('2027-01-15T21:00:00+10:00');
    for (const action of ['first', 'second', 'confirm']) {
      const h = harness(); h.clock(close - 1); await h.ready(action === 'first' ? null : record());
      const accepted = action === 'confirm' ? h.controller.confirm(2, RUN) : h.controller.start(action === 'first' ? 2 : 4);
      assert.equal(accepted, true); h.clock(close); h.controller.tick(); await settle();
      assert.equal(h.writes.length, 0); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run, null);
      assert.equal(h.model().window.open, false); assert.equal(h.isOpen(), false);
      h.clock(close + 13 * HOUR); h.controller.tick();
      assert.equal(h.model().window.open, true); assert.equal(h.model().actionError, null); assert.equal(h.model().confirmError, null);
    }
  });
  await test('a submission cannot jump the night and start tomorrow from yesterday’s tap', async () => {
    const close = Date.parse('2027-01-15T21:00:00+10:00'), h = harness();
    h.clock(close - 1); await h.ready(); h.controller.start(2);
    h.clock(close + 13 * HOUR); h.controller.tick(); await settle();
    assert.equal(h.writes.length, 0); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run, null);
  });
  await test('a submitted first start carries its original daily window through a late acknowledgement', async () => {
    const close = Date.parse('2027-01-15T21:00:00+10:00'), h = harness();
    h.clock(close - 1); await h.ready(); h.controller.start(2); await settle();
    const write = h.writes[0], originalWindow = close - 11 * HOUR;
    assert.equal(write.data.windowAt, originalWindow);
    h.clock(close + 13 * HOUR); h.controller.tick();
    assert.notEqual(write.data.windowAt, h.model().window.opensAt); assert.equal(h.controller.isBusy(), true);
    assert.equal(h.controller.start(2), false); assert.equal(h.writes.length, 1);
    await h.reject('permission-denied'); assert.equal(h.controller.isBusy(), false);
    assert.equal(h.controller.start(2), true); await settle();
    assert.equal(h.writes[1].data.windowAt, h.model().window.opensAt); assert.notEqual(h.writes[1].data.run, write.data.run);
  });
  await test('accepted starts remain protected across cutoff until acknowledgement reconciles the raw record', async () => {
    const close = Date.parse('2027-01-15T21:00:00+10:00'), h = harness();
    h.clock(close - 1); await h.ready(); h.controller.start(2); await settle(); const id = h.writes[0].data.run;
    h.clock(close); h.controller.tick(); assert.equal(h.model().run, null); assert.equal(h.controller.isBusy(), true);
    assert.equal(h.controller.pendingWork().person, 'ann');
    h.emit(record({ run: id, firstAt: stamp(close - 1) })); assert.equal(h.controller.isBusy(), true);
    await h.ack(); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run, null); assert.equal(h.model().rawRun.id, id);
    assert.equal(h.pings.length, 0); assert.equal(h.writes.length, 1);
  });
  await test('an uncertain first start survives cutoff and same-person unlock without replay', async () => {
    const close = Date.parse('2027-01-15T21:00:00+10:00'), open = close + 13 * HOUR, h = harness();
    h.clock(close - 1); await h.ready(); h.controller.start(2); await settle(); const id = h.writes[0].data.run; await h.reject('unavailable');
    h.clock(close); h.controller.tick(); assert.equal(h.controller.isBusy(), true); assert.equal(h.model().run, null);
    h.user(null); h.controller.sync(); h.clock(open);
    h.user({ uid: 'device-a', by: 'bo', pin: '000000', issuedAt: open, canRead: true }); h.controller.sync(); assert.equal(h.model().available, false);
    h.user({ uid: 'device-a', by: 'ann', pin: '000000', issuedAt: open, canRead: true }); h.controller.sync(); h.emit(null); h.recorded(null);
    assert.equal(h.controller.isBusy(), true); assert.equal(h.controller.start(2), false); assert.equal(h.writes.length, 1);
    h.emit(record({ run: id, firstAt: stamp(close - 1) }));
    assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run, null); assert.equal(h.model().rawRun.id, id);
    assert.equal(h.pings.length, 0); assert.equal(h.writes.length, 1);
  });
  await test('an unresolved second start can finish after cutoff without reviving its countdown or ping', async () => {
    const close = Date.parse('2027-01-15T21:00:00+10:00'), h = harness();
    h.clock(close - 1); await h.ready(record()); h.controller.start(4); await settle(); await h.reject('unavailable');
    h.clock(close); h.controller.tick(); assert.equal(h.controller.isBusy(), true); assert.equal(h.model().run, null);
    h.emit(second({ secondAt: stamp(close - 1) })); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run, null);
    assert.equal(h.model().rawRun.secondAt, close - 1); assert.equal(h.writes.length, 1);
  });
  await test('unknown confirmation survives cutoff and clears only after its saved declaration arrives', async () => {
    const close = Date.parse('2027-01-15T21:00:00+10:00'), h = harness();
    h.clock(close - 1); await h.ready(record()); h.controller.confirm(2, RUN); await settle(); await h.reject('unavailable');
    h.clock(close); h.controller.tick(); assert.equal(h.controller.isBusy(), true); assert.equal(h.model().run, null); assert.equal(h.isOpen(), false);
    h.clock(close + 13 * HOUR); h.controller.tick(); assert.equal(h.controller.isBusy(), true); assert.equal(h.controller.start(2), false);
    h.recorded(declaration({ firstAt: stamp(close - 1) }));
    assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run, null); assert.equal(h.model().recorded, null); assert.equal(h.writes.length, 1);
    assert.equal(h.controller.start(2), true);
  });
  console.log(count + ' controller checks passed');
})().catch(error => { console.error('FAIL cooling controller', error); process.exit(1); });
