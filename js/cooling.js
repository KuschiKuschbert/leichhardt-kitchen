/* Shared Operandio control. The host supplies the existing PIN/session, W(), Firestore, sheet and clock helpers.
   Reads: one readiness document per authorised session, one current-run subscription while authorised, and one
   own-request subscription only after its create is acknowledged. Clock ticks only repaint; they never read/write.
   Canonical records and unfinished requests stay in this tab's memory. Only personal alert IDs may be kept by host. */
(function (root) {
  'use strict';
  function create(host) {
    var H = host || {}, C = H.core || root.LK_COOLING;
    if (!C || !H.session || !H.now || !H.get || !H.watch || !H.write || !H.timestamp) throw new Error('Cooling needs the book session, clock and writer.');
    var mount = H.mountUI || (root.LK_COOLING_UI && root.LK_COOLING_UI.mount);
    if (!mount) throw new Error('Cooling needs its presentation.');
    var disposed = false, epoch = 0, session = null, sessionKey = '', ownerKey = '';
    var enabled = false, checked = false, currentRead = false, stale = false, error = '', requestError = '', actionError = null;
    var run = null, pending = null, currentWatch = null, requestWatch = null, loading = null, notified = '';
    var seen = Object.create(null), presented = Object.create(null), presentationOwner = '';
    var hooks = Object.assign({}, H.uiHooks || {}), outerClosed = hooks.closed;
    hooks.onStart = start;
    hooks.onNewBatch = function () { return start(2); };
    hooks.onAcknowledge = acknowledge;
    hooks.onRetryRead = retryRead;
    hooks.closed = function (kind, noBack, hours, runId) {
      if (outerClosed) outerClosed(kind, noBack, hours, runId);
    };
    var ui = mount(hooks);
    function timeOf(value) { return value && typeof value.toMillis === 'function' ? value.toMillis() : value; }
    function validSession(value) {
      return value && value.canRead === true && typeof value.uid === 'string' && value.uid && typeof value.by === 'string' && value.by && typeof value.pin === 'string' && value.pin && Number.isFinite(timeOf(value.issuedAt));
    }
    function ownerOf(value) { return value ? [value.uid, value.by, value.pin].join('|') : ''; }
    function keyOf(value) { return validSession(value) ? ownerOf(value) + '|' + timeOf(value.issuedAt) : ''; }
    function sameAuthority(atEpoch) {
      if (disposed || atEpoch !== epoch || !session) return false;
      if (keyOf(H.session()) !== sessionKey) { sync(); return false; }
      return true;
    }
    function serverSnapshot(snap) { return snap && typeof snap.exists === 'boolean' && !snap.fromCache && !snap.hasPendingWrites && !snap.pending; }
    function alertKey(value) {
      var found = typeof value === 'string' && /^(.*)_([12])$/.exec(value);
      return !!found && C.id(found[1]);
    }
    function cleanSeen(value) {
      var out = Object.create(null);
      if (value && typeof value === 'object') Object.keys(value).filter(function (key) { return alertKey(key) && value[key] === true; }).slice(-64).forEach(function (key) { out[key] = true; });
      return out;
    }
    function stopCurrent() { if (currentWatch) currentWatch(); currentWatch = null; }
    function stopRequest() { if (requestWatch) requestWatch(); requestWatch = null; }
    function model() {
      var available = !!session, ownPending = pending && ownerOf(pending.session) === ownerKey;
      // A request create acknowledgement is not a stage acceptance. Keep the previous confirmed view until its
      // accepted response and the matching canonical revision have both arrived, in either order.
      var shown = ownPending ? pending.before : run;
      return { available: available, ready: available && enabled && currentRead, stale: stale, error: error || requestError,
        pending: ownPending ? pending.hours : 0, actionError: actionError, run: available ? shown : null, now: H.now() };
    }
    function paint() {
      if (disposed) return;
      var next = model(); ui.render(next);
      var signature = JSON.stringify([next.available, next.ready, next.stale, next.error, next.pending,
        next.actionError, run && run.id, run && run.rev, run && C.phase(run, next.now), !!pending]);
      if (signature !== notified) { notified = signature; if (H.changed) H.changed(); }
    }
    function readFailure() { return 'Couldn’t read Operandio timers. Check the connection and try again.'; }
    function startFailure(hours, code) {
      var name = 'Operandio ' + hours + '-hour timer';
      if (code === 'stale' || code === 'stale-revision' || code === 'conflict' || code === 'already-running') return 'The shared Operandio timer changed. Check its current stage before starting again.';
      if (code === 'disabled' || code === 'not-ready' || code === 'not-enabled') return 'Couldn’t start ' + name + '. Cooling alerts are not ready yet.';
      if (code === 'session-invalid' || code === 'permission-denied' || code === 'unauthenticated' || code === 'not-authorised') return 'Couldn’t start ' + name + '. Sign in again, then try once more.';
      return 'Couldn’t start ' + name + '. Try again.';
    }
    function clearPending() { stopRequest(); pending = null; requestError = ''; }
    function resolveAccepted() {
      if (!pending || !pending.accepted || !currentRead || stale || !run) return;
      var accepted = pending.accepted;
      if (run.rev < accepted.revision || run.rev === accepted.revision && run.id !== accepted.run) return;
      // A later canonical revision may already represent the next stage or batch. The accepted response still
      // proves this exact request succeeded; displaying the later shared state must not strand its work guard.
      clearPending(); actionError = null;
    }
    function validProgress(next) {
      if (!run) return true;
      if (!next || next.rev < run.rev) return false;
      if (next.id !== run.id) return next.rev > run.rev;
      return next.firstAt === run.firstAt && next.firstDue === run.firstDue && next.firstBy === run.firstBy &&
        (!run.secondAt || next.secondAt === run.secondAt && next.secondDue === run.secondDue && next.secondBy === run.secondBy) &&
        (next.rev !== run.rev || next.secondAt === run.secondAt && next.secondDue === run.secondDue && next.secondBy === run.secondBy);
    }
    function subscribe(path, receive, failed, captured) {
      var unsubscribe = null, ended = false;
      function cancel() { if (ended) return; ended = true; if (unsubscribe) unsubscribe(); }
      cancel.ended = function () { return ended; };
      try {
        unsubscribe = H.watch(path, function (snap) { if (!ended) receive(snap); }, function (failure) {
          if (ended) return; cancel(); failed(failure);
        }, captured);
        if (ended && unsubscribe) unsubscribe();
      } catch (failure) { cancel(); failed(failure); }
      return cancel;
    }
    function watchCurrent(atEpoch) {
      if (!sameAuthority(atEpoch) || currentWatch) return;
      // One live record, including a run crossing midnight. No collection query or per-second backend work.
      var unsubscribe = subscribe('cooling/current', function (snap) {
        if (!sameAuthority(atEpoch)) return;
        if (!serverSnapshot(snap)) { stale = true; paint(); return; }
        var next = snap.exists ? C.parse(snap.data) : null;
        if (snap.exists && !next || !validProgress(next)) {
          currentRead = false; error = 'Couldn’t verify the saved Operandio timer. Try again.'; paint(); return;
        }
        run = next; currentRead = true; stale = false; error = enabled ? '' : 'Operandio cooling alerts are not set up for this kitchen yet.'; resolveAccepted(); paint(); maybeAlert();
      }, function () {
        if (!sameAuthority(atEpoch)) return;
        stopCurrent(); stale = true; error = readFailure(); paint();
      }, session);
      if (atEpoch !== epoch || disposed) { if (unsubscribe) unsubscribe(); }
      else if (!unsubscribe.ended()) currentWatch = unsubscribe;
    }
    function requestMatches(data, request) {
      return data && data.v === 1 && data.uid === request.session.uid && data.by === request.session.by &&
        data.stage === request.stage && data.expectedRun === request.expectedRun && data.expectedRev === request.expectedRev;
    }
    function receiveRequest(request, snap, atEpoch) {
      if (!sameAuthority(atEpoch) || pending !== request || !serverSnapshot(snap)) return;
      if (!snap.exists || !requestMatches(snap.data, request)) {
        requestError = 'Couldn’t verify the Operandio start result. Keep this tab open and try checking again.'; paint(); return;
      }
      var data = snap.data; requestError = '';
      if (data.status === 'rejected') {
        var hours = request.hours; clearPending(); actionError = { stage: hours, message: startFailure(hours, data.code) }; paint(); return;
      }
      if (data.status === 'accepted') {
        var expectedId = request.stage === 1 ? request.id : request.expectedRun;
        if (data.run !== expectedId || !Number.isSafeInteger(data.revision) || data.revision !== request.expectedRev + 1) {
          requestError = 'Couldn’t verify the Operandio start result. Keep this tab open and try checking again.'; paint(); return;
        }
        request.accepted = { run: data.run, revision: data.revision };
        resolveAccepted(); paint();
      }
    }
    function watchRequest(request, atEpoch) {
      if (!sameAuthority(atEpoch) || pending !== request || !request.created || requestWatch) return;
      // Own immutable request only, after its creation was acknowledged. A missing document cannot prove ownership.
      var unsubscribe = subscribe('coolingRequests/' + request.id, function (snap) { receiveRequest(request, snap, atEpoch); }, function () {
        if (!sameAuthority(atEpoch) || pending !== request) return;
        stopRequest(); requestError = 'Couldn’t check the Operandio start result. Keep this tab open and try checking again.'; paint();
      }, session);
      if (atEpoch !== epoch || disposed || pending !== request) { if (unsubscribe) unsubscribe(); }
      else if (!unsubscribe.ended()) requestWatch = unsubscribe;
    }
    function recoverRequest(atEpoch) {
      var request = pending;
      if (!request || request.writing || !sameAuthority(atEpoch) || ownerOf(request.session) !== ownerKey) return;
      if (request.created) { watchRequest(request, atEpoch); return; }
      if (request.checking) return;
      request.checking = true;
      // One explicit check after reconnect/unlock or Try again, never a write replay after an uncertain result.
      Promise.resolve().then(function () { if (!sameAuthority(atEpoch)) return null; return H.get('coolingRequests/' + request.id, session); }).then(function (snap) {
        request.checking = false;
        if (!sameAuthority(atEpoch) || pending !== request) return;
        if (serverSnapshot(snap) && snap.exists && requestMatches(snap.data, request)) {
          request.created = true; receiveRequest(request, snap, atEpoch); if (pending === request) watchRequest(request, atEpoch);
        } else { requestError = 'The Operandio start result is still unknown. Keep this tab open and try checking again.'; paint(); }
      }, function () {
        request.checking = false;
        if (!sameAuthority(atEpoch) || pending !== request) return;
        requestError = 'The Operandio start result is still unknown. Keep this tab open and try checking again.'; paint();
      });
    }
    function load(atEpoch) {
      if (!sameAuthority(atEpoch) || loading) return loading;
      var captured = session;
      // Readiness is deployment-owned and read once per authenticated session, or on an explicit retry.
      var promise = Promise.resolve().then(function () { if (!sameAuthority(atEpoch)) return null; return H.get('cooling/config', captured); }).then(function (snap) {
        if (!sameAuthority(atEpoch)) return;
        if (!serverSnapshot(snap)) { stale = true; error = readFailure(); paint(); return; }
        checked = true; enabled = !!snap.exists && snap.data && snap.data.v === 1 && snap.data.enabled === true;
        if (!enabled) { error = 'Operandio cooling alerts are not set up for this kitchen yet.'; if (pending) watchCurrent(atEpoch); paint(); recoverRequest(atEpoch); return; }
        error = ''; stale = false; watchCurrent(atEpoch); recoverRequest(atEpoch); paint();
      }, function () {
        if (!sameAuthority(atEpoch)) return;
        error = readFailure(); stale = true; paint();
      }).then(function () { if (loading === promise) loading = null; });
      loading = promise; return promise;
    }
    function suspend() {
      epoch++; stopCurrent(); stopRequest(); loading = null;
      session = null; sessionKey = ''; ownerKey = ''; enabled = false; checked = false; currentRead = false;
      stale = false; error = ''; requestError = ''; actionError = null; run = null;
      ui.close(true); paint();
    }
    function sync() {
      if (disposed) return;
      var next = H.session(), key = keyOf(next);
      if (!key) { if (session) suspend(); return; }
      if (key === sessionKey) return;
      suspend();
      if (pending && ownerOf(pending.session) !== ownerOf(next)) return;
      session = Object.assign({}, next); sessionKey = key; ownerKey = ownerOf(next);
      if (presentationOwner !== ownerKey) { presentationOwner = ownerKey; presented = Object.create(null); }
      try { seen = cleanSeen(H.readSeen ? H.readSeen(session) : null); } catch (e) { seen = Object.create(null); }
      paint(); return load(epoch);
    }
    function readOnlySeen() { return Object.assign(Object.create(null), seen, presented); }
    function maybeAlert() {
      if (!session || !enabled || !currentRead || stale || error || requestError || pending || ui.isOpen() || !sameAuthority(epoch)) return false;
      var alert = C.alert(run, H.now(), readOnlySeen());
      if (!alert || hooks.canOpen && !hooks.canOpen('ping')) return false;
      if (!ui.ping(alert.hours)) return false;
      presented[alert.key] = true; presented = cleanSeen(presented);
      if (H.chime) H.chime(alert);
      return true;
    }
    function start(hours) {
      sync();
      if (disposed || !session || !sameAuthority(epoch) || pending) return false;
      var stage = hours === 2 ? 1 : hours === 4 ? 2 : 0;
      if (!enabled || !currentRead || stale || error || requestError || !stage || !C.allowed(run, stage, H.now())) {
        actionError = { stage: hours, message: 'Check the current Operandio timer before starting it.' }; paint(); return false;
      }
      var id;
      try { id = H.requestId ? H.requestId() : root.crypto.randomUUID(); } catch (e) { id = ''; }
      if (!C.id(id)) { actionError = { stage: hours, message: startFailure(hours) }; paint(); return false; }
      var expected = C.expected(run), request = { id: id, hours: hours, stage: stage, session: Object.assign({}, session),
        expectedRun: expected.expectedRun, expectedRev: expected.expectedRev, before: run, writing: true, created: false, accepted: null };
      var data;
      try { data = { v: 1, uid: session.uid, by: session.by, sessionAt: session.issuedAt, stage: stage,
        expectedRun: expected.expectedRun, expectedRev: expected.expectedRev, at: H.timestamp() }; }
      catch (failure) { actionError = { stage: hours, message: startFailure(hours) }; paint(); return false; }
      pending = request; actionError = null; paint();
      Promise.resolve().then(function () {
        if (keyOf(H.session()) !== keyOf(request.session)) throw { code: 'cancelled', definite: true };
        return H.write('coolingRequests/' + id, data, request.session);
      }).then(function () {
        request.writing = false; request.created = true;
        if (disposed || pending !== request) return;
        sync(); if (session && ownerOf(request.session) === ownerKey) { watchRequest(request, epoch); paint(); }
      }, function (failure) {
        request.writing = false;
        if (disposed || pending !== request) return;
        sync();
        var code = failure && failure.code || '', definite = failure && failure.definite === true || ['permission-denied', 'unauthenticated', 'invalid-argument', 'failed-precondition', 'cancelled'].indexOf(code) !== -1;
        if (definite) { clearPending(); if (session && ownerKey === ownerOf(request.session)) actionError = { stage: hours, message: startFailure(hours, code) }; }
        else if (session && ownerKey === ownerOf(request.session)) requestError = 'The Operandio start result is unknown. Keep this tab open and try checking again.';
        paint();
      });
      return true;
    }
    function acknowledge(hours, runId) {
      if (!session || !sameAuthority(epoch) || !C.id(runId) || hours !== 2 && hours !== 4) return false;
      var key = runId + '_' + (hours === 2 ? '1' : '2'); seen[key] = true; seen = cleanSeen(seen);
      // Only bounded event identities, scoped by kitchen/device/person. No timer text, deadline or record is kept.
      try { var saved = H.writeSeen && H.writeSeen(session, Object.assign({}, seen)); if (saved && saved.catch) saved.catch(function () {}); } catch (e) {}
      return true;
    }
    function retryRead() {
      sync(); if (!session || disposed) return;
      var atEpoch = epoch; error = ''; requestError = ''; stale = true;
      stopRequest();
      if (!enabled || !checked) { paint(); return load(atEpoch); }
      stopCurrent(); watchCurrent(atEpoch); recoverRequest(atEpoch); paint();
    }
    function tick() { sync(); if (!session || disposed) return false; paint(); return maybeAlert(); }
    function open(anchor) { sync(); if (!session || disposed) return false; paint(); return ui.open(anchor); }
    function pendingWork() {
      return pending ? { uid: pending.session.uid, by: pending.session.by, person: pending.session.by, pin: pending.session.pin,
        id: pending.id, writing: pending.writing, accepted: !!pending.accepted, created: pending.created } : null;
    }
    function dispose() { if (disposed) return; suspend(); disposed = true; ui.dispose(); }
    paint();
    return { sync: sync, tick: tick, open: open, chipHTML: function () { return ui.chipHTML(); }, start: start, acknowledge: acknowledge,
      retryRead: retryRead, isBusy: function () { return !!pending; }, pendingWork: pendingWork, stop: suspend, dispose: dispose,
      snapshot: function () { return model(); } };
  }
  var api = { create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LK_COOLING_APP = api;
}(typeof window !== 'undefined' ? window : globalThis));
