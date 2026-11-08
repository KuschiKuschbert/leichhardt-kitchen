/* Controller tests inject an acknowledged writer and canonical snapshots. No live account, timers or database. */
const assert = require('node:assert/strict');
const C = require('../js/cooling-core');
const app = require('../js/cooling');
const AT = 1800000000000;
const RUN = 'batch_00000000001';
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
async function settle() { for (let i = 0; i < 8; i++) await Promise.resolve(); }
function record(patch = {}) { return Object.assign({ v: 1, run: RUN, rev: 1, firstAt: AT, firstDue: AT + 7200000, firstBy: 'ann', secondAt: 0, secondDue: 0, secondBy: '', schedule: { first: 'queued', second: '' } }, patch); }
function snap(data, meta = {}) { return Object.assign({ exists: data !== null, data, fromCache: false, hasPendingWrites: false }, meta); }
function harness(options = {}) {
  let user = options.signedOut ? null : { uid: 'device-a', by: 'ann', pin: '000000', issuedAt: 1000, canRead: true };
  let clock = AT, nextId = 0, canOpen = true, uiOpen = '', uiRun = '', uiHours = 0, hooks;
  const docs = new Map([['cooling/config', snap(options.config === undefined ? { v: 1, enabled: true } : options.config)]]);
  const reads = [], writes = [], watchers = [], models = [], pings = [], seenWrites = [], chimes = [], storage = new Map();
  const state = { getFailure: null, synchronousWatchError: false };
  const host = {
    core: C, session: () => user, now: () => clock, timestamp: () => ({ serverTimestamp: true }),
    requestId: () => 'request_0000000' + String(++nextId).padStart(4, '0'),
    get(path, session) { reads.push({ path, session }); if (state.getFailure) return Promise.reject(state.getFailure); return Promise.resolve(docs.get(path) || snap(null)); },
    watch(path, next, failed, session) { const item = { path, next, failed, session, active: true }; watchers.push(item); if (state.synchronousWatchError) failed({ code: 'unavailable' }); return () => { item.active = false; }; },
    write(path, data, session) { const wait = deferred(); writes.push({ path, data, session, wait }); return wait.promise; },
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
        close(noBack) { if (!uiOpen) return; const kind = uiOpen; uiOpen = ''; callbacks.closed(kind, !!noBack, uiHours, uiRun); },
        dispose() { this.close(true); }
      };
    }
  };
  const controller = app.create(host);
  const out = { controller, host, docs, reads, writes, watchers, models, pings, seenWrites, chimes, storage, state,
    user: value => { user = value; }, currentUser: () => user, clock: value => { clock = value; }, allow: value => { canOpen = value; },
    emit(path, data, meta) { docs.set(path, snap(data, meta)); watchers.filter(w => w.active && w.path === path).forEach(w => w.next(snap(data, meta))); },
    fail(path, error = { code: 'unavailable' }) { watchers.filter(w => w.active && w.path === path).forEach(w => w.failed(error)); },
    close() { hooks.closed(uiOpen, false, uiHours, uiRun); uiOpen = ''; },
    got() { hooks.onAcknowledge(uiHours, uiRun); this.close(); },
    model: () => models.at(-1),
    async ready(data = null) { await controller.sync(); this.emit('cooling/current', data); await settle(); },
    async written(index = writes.length - 1) { const write = writes[index]; docs.set(write.path, snap(write.data)); write.wait.resolve(); await settle(); return write; },
    result(write, status, extra = {}) { const value = Object.assign({}, write.data, { status }, extra); this.emit(write.path, value); }
  };
  return out;
}
let count = 0;
async function test(name, body) { await body(); count++; console.log('ok ' + name); }
(async () => {
  await test('signed-out devices have no cooling reads, listener, writes or chip', async () => {
    const h = harness({ signedOut: true }); await h.controller.sync(); h.controller.tick(); assert.equal(h.controller.start(2), false);
    assert.equal(h.reads.length, 0); assert.equal(h.watchers.length, 0); assert.equal(h.controller.chipHTML(), ''); assert.equal(h.model().available, false);
  });
  await test('one readiness read and one live record; clock ticks never poll', async () => {
    const h = harness(); await h.ready(); assert.equal(h.model().ready, true);
    for (let i = 0; i < 120; i++) { h.clock(AT + i * 1000); h.controller.tick(); }
    assert.equal(h.reads.length, 1); assert.equal(h.watchers.length, 1); assert.equal(h.writes.length, 0);
  });
  await test('missing readiness and cached empty answers never manufacture an idle timer', async () => {
    const missing = harness({ config: null }); await missing.controller.sync(); assert.equal(missing.model().ready, false); assert.match(missing.model().error, /not set up/); assert.equal(missing.watchers.length, 0);
    const h = harness(); await h.controller.sync(); h.emit('cooling/current', null, { fromCache: true }); assert.equal(h.model().ready, false); assert.equal(h.model().stale, true); assert.equal(h.controller.start(2), false); assert.equal(h.writes.length, 0);
  });
  await test('create acknowledgement and canonical-first race stay pending until accepted result', async () => {
    const h = harness(); await h.ready(); assert.equal(h.controller.start(2), true); assert.equal(h.model().pending, 2); assert.equal(h.controller.start(2), false); await settle();
    assert.equal(h.writes.length, 1); const write = h.writes[0]; assert.deepEqual(Object.keys(write.data).sort(), ['at','by','expectedRev','expectedRun','sessionAt','stage','uid','v'].sort()); assert.equal(write.data.expectedRev, 0); assert.equal(write.data.stage, 1);
    assert.equal(h.watchers.length, 1); await h.written(); assert.equal(h.watchers.length, 2); assert.equal(h.controller.isBusy(), true);
    const id = write.path.split('/').pop(); h.emit('cooling/current', record({ run: id })); assert.equal(h.model().run, null); assert.equal(h.model().pending, 2);
    h.result(write, 'accepted', { run: id, revision: 1, resolvedAt: AT }); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.id, id); assert.equal(h.model().pending, 0);
  });
  await test('accepted-first race and cached result cannot confirm before canonical acknowledgement', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); const write = await h.written(), id = write.path.split('/').pop();
    h.emit(write.path, Object.assign({}, write.data, { status: 'accepted', run: id, revision: 1 }), { hasPendingWrites: true }); assert.equal(h.controller.pendingWork().accepted, false);
    h.result(write, 'accepted', { run: id, revision: 1 }); assert.equal(h.controller.isBusy(), true); assert.equal(h.model().run, null);
    h.emit('cooling/current', record({ run: id }), { fromCache: true }); assert.equal(h.controller.isBusy(), true);
    h.emit('cooling/current', record({ run: id })); assert.equal(h.controller.isBusy(), false);
  });
  await test('manual stage two starts only after first deadline with its own expected revision', async () => {
    const h = harness(); await h.ready(record()); assert.equal(h.controller.start(4), false); h.clock(AT + 7200000); assert.equal(h.writes.length, 0);
    assert.equal(h.controller.start(4), true); await settle(); const write = await h.written(); assert.equal(write.data.stage, 2); assert.equal(write.data.expectedRun, RUN); assert.equal(write.data.expectedRev, 1);
    h.result(write, 'accepted', { run: RUN, revision: 2 }); assert.equal(h.controller.isBusy(), true);
    const secondAt = AT + 7200000 + 600000; h.emit('cooling/current', record({ rev: 2, secondAt, secondDue: secondAt + 14400000, secondBy: 'ann', schedule: { first: 'queued', second: 'queued' } }));
    assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.secondAt, secondAt); assert.equal(h.model().run.secondDue, secondAt + 14400000);
  });
  await test('competing start rejection preserves accepted shared deadline and clears own pending work', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); const write = await h.written();
    h.emit('cooling/current', record({ firstBy: 'bo' })); h.result(write, 'rejected', { code: 'stale-revision' });
    assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.firstBy, 'bo'); assert.match(h.model().actionError.message, /changed/); assert.equal(h.controller.start(2), false); assert.equal(h.writes.length, 1);
  });
  await test('a blocked deadline queues once and Got it only stores this person event IDs', async () => {
    const h = harness(); h.allow(false); await h.ready(record()); h.clock(AT + 7200000); h.controller.tick(); assert.equal(h.pings.length, 0);
    h.allow(true); h.controller.tick(); assert.equal(h.pings.length, 1); assert.equal(h.chimes.length, 1); h.got(); h.controller.tick(); assert.equal(h.pings.length, 1);
    assert.deepEqual(Object.keys(h.seenWrites[0].value), [RUN + '_1']); assert.equal(h.seenWrites[0].session.by, 'ann'); assert.equal(h.writes.length, 0);
    h.user({ uid: 'device-a', by: 'bo', pin: '000000', issuedAt: 2000, canRead: true }); await h.controller.sync(); h.emit('cooling/current', record()); assert.equal(h.pings.length, 2);
  });
  await test('dismissing without Got it does not repeat the same ping each clock tick', async () => {
    const h = harness(); await h.ready(record()); h.clock(AT + 7200000); h.controller.tick(); h.close(); for (let i = 0; i < 10; i++) h.controller.tick(); assert.equal(h.pings.length, 1); assert.equal(h.seenWrites.length, 0);
  });
  await test('daily lock hides private state and retains original pending owner until resolution', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); const write = await h.written(); const oldWatch = h.watchers.find(w => w.path === write.path);
    h.user(null); h.controller.sync(); assert.equal(h.model().available, false); assert.equal(h.model().run, null); assert.equal(h.controller.pendingWork().person, 'ann'); assert.equal(h.controller.isBusy(), true); assert(h.watchers.every(w => !w.active));
    oldWatch.next(snap(Object.assign({}, write.data, { status: 'accepted', run: write.path.split('/').pop(), revision: 1 }))); assert.equal(h.model().available, false);
    h.user({ uid: 'device-a', by: 'bo', pin: '000000', issuedAt: 2000, canRead: true }); h.controller.sync(); assert.equal(h.model().available, false); assert.equal(h.reads.length, 1);
    h.user({ uid: 'device-a', by: 'ann', pin: '000000', issuedAt: 3000, canRead: true }); await h.controller.sync(); const id = write.path.split('/').pop(); h.emit('cooling/current', record({ run: id })); h.result(write, 'accepted', { run: id, revision: 1 });
    assert.equal(h.controller.isBusy(), false); assert.equal(h.writes.length, 1); assert.equal(h.model().run.id, id);
  });
  await test('uncertain acknowledgement keeps one request and recovers without another write', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); const write = h.writes[0], id = write.path.split('/').pop(); write.wait.reject({ code: 'unavailable' }); await settle();
    assert.equal(h.controller.isBusy(), true); assert.match(h.model().error, /unknown/); assert.equal(h.controller.start(2), false);
    h.docs.set(write.path, snap(Object.assign({}, write.data, { status: 'accepted', run: id, revision: 1 }))); h.controller.retryRead(); await settle(); h.emit('cooling/current', record({ run: id }));
    assert.equal(h.controller.isBusy(), false); assert.equal(h.writes.length, 1); assert.equal(h.model().error, '');
  });
  await test('unknown result stays protected when ownership cannot be established on read', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); h.writes[0].wait.reject({ code: 'unavailable' }); await settle(); h.state.getFailure = { code: 'permission-denied' }; h.controller.retryRead(); await settle();
    assert.equal(h.controller.isBusy(), true); assert.equal(h.writes.length, 1); assert.match(h.model().error, /unknown/);
  });
  await test('definite refusal permits explicit retry and never silently resubmits', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); h.writes[0].wait.reject({ code: 'permission-denied' }); await settle(); assert.equal(h.controller.isBusy(), false); assert.match(h.model().actionError.message, /Sign in again/);
    for (let i = 0; i < 10; i++) h.controller.tick(); assert.equal(h.writes.length, 1); assert.equal(h.controller.start(2), true); await settle(); assert.equal(h.writes.length, 2); assert.notEqual(h.writes[0].path, h.writes[1].path);
  });
  await test('lock before deferred submission cannot send the action as another session', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); h.user(null); h.controller.sync(); await settle(); assert.equal(h.writes.length, 0); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().available, false);
  });
  await test('malformed, regressed or rewritten canonical deadlines never become ready', async () => {
    const h = harness(); await h.ready(record()); h.emit('cooling/current', record({ firstDue: AT + 1 })); assert.equal(h.model().ready, false); assert.match(h.model().error, /verify/); assert.equal(h.model().run.firstDue, AT + 7200000);
    h.emit('cooling/current', record({ firstAt: AT + 1, firstDue: AT + 7200001 })); assert.equal(h.model().ready, false); h.emit('cooling/current', null); assert.equal(h.model().ready, false); assert.equal(h.controller.start(2), false);
  });
  await test('listener failure is explicit and manual retry reattaches without polling config', async () => {
    const h = harness(); await h.ready(record()); h.fail('cooling/current'); assert.equal(h.model().stale, true); assert.match(h.model().error, /read/); h.controller.retryRead(); assert.equal(h.model().stale, true); assert.equal(h.controller.start(4), false); h.emit('cooling/current', record()); assert.equal(h.model().stale, false); assert.equal(h.model().error, ''); assert.equal(h.reads.length, 1);
    const syncFailure = harness(); syncFailure.state.synchronousWatchError = true; await syncFailure.controller.sync(); assert.equal(syncFailure.model().stale, true); assert(syncFailure.watchers.every(w => !w.active));
  });
  await test('old ping acknowledgement cannot dismiss a newer run', async () => {
    const h = harness(); await h.ready(record()); h.clock(AT + 7200000); h.controller.tick(); const next = record({ run: 'batch_00000000002', rev: 3 }); h.emit('cooling/current', next); h.got(); assert.deepEqual(Object.keys(h.seenWrites[0].value), [RUN + '_1']);
  });
  await test('accepted request may resolve against a later server revision without stranding handover', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); const write = await h.written(); h.emit('cooling/current', record({ run: 'later_00000000001', rev: 3 })); h.result(write, 'accepted', { run: write.path.split('/').pop(), revision: 1 }); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().run.rev, 3);
  });
  await test('failed request construction never strands an unsent-work guard', async () => {
    const h = harness(); await h.ready(); h.host.timestamp = () => { throw new Error('SDK not ready'); }; assert.equal(h.controller.start(2), false); assert.equal(h.controller.isBusy(), false); assert.equal(h.writes.length, 0); assert.match(h.model().actionError.message, /Couldn’t start/);
  });
  await test('backend readiness disabled after relock cannot strand an already accepted request', async () => {
    const h = harness(); await h.ready(); h.controller.start(2); await settle(); const write = await h.written(), id = write.path.split('/').pop(); h.user(null); h.controller.sync(); h.docs.set('cooling/config', snap(null));
    h.user({ uid: 'device-a', by: 'ann', pin: '000000', issuedAt: 2000, canRead: true }); await h.controller.sync(); h.result(write, 'accepted', { run: id, revision: 1 }); h.emit('cooling/current', record({ run: id })); assert.equal(h.controller.isBusy(), false); assert.equal(h.model().ready, false); assert.match(h.model().error, /not set up/);
  });
  console.log(count + ' controller checks passed');
})().catch(error => { console.error('FAIL cooling controller', error); process.exit(1); });
