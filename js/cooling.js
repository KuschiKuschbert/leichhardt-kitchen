/* Shared Operandio control. The host supplies the PIN/session, W(), Firestore, sheets and kitchen clock.
   One canonical current-run listener while authorised; clock ticks do no database work. Starts use server
   timestamps and revision-checked writes. Only personal alert IDs persist; runs and pending work stay in memory. */
(function (root) {
  'use strict';
  function create(host) {
    var H = host || {}, C = H.core || root.LK_COOLING;
    if (!C || !H.session || !H.now || !H.watch || !H.write || !H.timestamp) throw new Error('Cooling needs the book session, clock and writer.');
    var mount = H.mountUI || (root.LK_COOLING_UI && root.LK_COOLING_UI.mount);
    if (!mount) throw new Error('Cooling needs its presentation.');
    var disposed = false, epoch = 0, session = null, sessionKey = '', ownerKey = '';
    var currentRead = false, stale = false, error = '', actionError = null;
    var run = null, pending = null, currentWatch = null, notified = '';
    var seen = Object.create(null), presented = Object.create(null), presentationOwner = '';
    var hooks = Object.assign({}, H.uiHooks || {});
    hooks.onStart = start;
    hooks.onNewBatch = function () { return start(2); };
    hooks.onAcknowledge = acknowledge;
    hooks.onRetryRead = retryRead;
    var ui = mount(hooks);
    function timeOf(value) { return value && typeof value.toMillis === 'function' ? value.toMillis() : value; }
    function validSession(value) {
      return value && value.canRead === true && typeof value.uid === 'string' && value.uid && typeof value.by === 'string' && value.by &&
        typeof value.pin === 'string' && value.pin && Number.isFinite(timeOf(value.issuedAt));
    }
    function ownerOf(value) { return value ? [value.uid, value.by, value.pin].join('|') : ''; }
    function keyOf(value) { return validSession(value) ? ownerOf(value) + '|' + timeOf(value.issuedAt) : ''; }
    function clockOK(value) { return Number.isSafeInteger(value) && value > 0; }
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
    function model() {
      var available = !!session, ownPending = pending && ownerOf(pending.session) === ownerKey, at = H.now();
      // A local Firestore estimate or an early canonical callback cannot confirm an unresolved write.
      var shown = ownPending ? pending.before : run;
      return { available: available, ready: available && currentRead && clockOK(at), stale: stale,
        error: error || (ownPending && pending.unknown ? 'The Operandio start result is unknown. Keep this tab open and try checking again.' : ''),
        pending: ownPending ? pending.hours : 0, actionError: actionError, run: available ? shown : null, now: at };
    }
    function paint() {
      if (disposed) return;
      var next = model(); ui.render(next);
      var signature = JSON.stringify([next.available, next.ready, next.stale, next.error, next.pending,
        next.actionError, run && run.id, run && run.rev, run && C.phase(run, next.now), !!pending]);
      if (signature !== notified) { notified = signature; if (H.changed) H.changed(); }
    }
    function readFailure() { return 'Couldn’t read Operandio timers. Check the connection and try again.'; }
    function startFailure(hours, code, conflict) {
      var name = 'Operandio ' + hours + '-hour timer';
      if (conflict || code === 'aborted' || code === 'conflict' || code === 'already-exists')
        return 'Your ' + name + ' start was not saved. The shared timer changed. Check its current stage.';
      if (code === 'permission-denied' || code === 'unauthenticated') return 'Couldn’t start ' + name + '. Sign in again, then try once more.';
      return 'Couldn’t start ' + name + '. Try again.';
    }
    function clearPending() { pending = null; }
    function targetMatches(value, work) {
      if (!value || value.id !== work.id || value.rev < work.revision) return false;
      if (work.stage === 1) return value.firstBy === work.session.by;
      var before = work.before;
      return !!before && value.firstAt === before.firstAt && value.firstDue === before.firstDue &&
        value.firstBy === before.firstBy && !!value.secondAt && value.secondBy === work.session.by;
    }
    function resolvePending() {
      if (!pending || !currentRead || stale || !run) return;
      var matched = targetMatches(run, pending);
      if (matched) pending.observed = true;
      if (pending.writing) return;
      // The exact next revision can contain only one accepted transition. A different winner proves this
      // unknown write lost; a later revision alone cannot tell us which intermediate write was accepted.
      if (pending.unknown && run.rev === pending.revision && !matched) {
        var hours = pending.hours; clearPending();
        actionError = { stage: hours, message: startFailure(hours, '', true) }; return;
      }
      // W acknowledgement proves our commit. A later canonical revision may already be another stage or batch.
      // With a lost acknowledgement, recover only an observed matching shared transition, never replay it.
      if (pending.acked && (targetMatches(run, pending) || run.rev > pending.revision) ||
          pending.unknown && pending.observed && run.rev >= pending.revision) {
        clearPending(); actionError = null;
      }
    }
    function validProgress(next) {
      if (!run) return true;
      if (!next || next.rev < run.rev) return false;
      if (next.id !== run.id) return next.rev > run.rev;
      return next.firstAt === run.firstAt && next.firstDue === run.firstDue && next.firstBy === run.firstBy &&
        (!run.secondAt || next.secondAt === run.secondAt && next.secondDue === run.secondDue && next.secondBy === run.secondBy) &&
        (next.rev !== run.rev || next.secondAt === run.secondAt && next.secondDue === run.secondDue && next.secondBy === run.secondBy);
    }
    function subscribe(receive, failed, captured) {
      var unsubscribe = null, ended = false;
      function cancel() { if (ended) return; ended = true; if (unsubscribe) unsubscribe(); }
      cancel.ended = function () { return ended; };
      try {
        unsubscribe = H.watch('cooling/current', function (snap) { if (!ended) receive(snap); }, function (failure) {
          if (ended) return; cancel(); failed(failure);
        }, captured);
        if (ended && unsubscribe) unsubscribe();
      } catch (failure) { cancel(); failed(failure); }
      return cancel;
    }
    function watchCurrent(atEpoch) {
      if (!sameAuthority(atEpoch) || currentWatch) return;
      // Only today's shared live timer, including an unfinished run crossing midnight. No collection or request reads.
      var unsubscribe = subscribe(function (snap) {
        if (!sameAuthority(atEpoch)) return;
        if (!serverSnapshot(snap)) { stale = true; paint(); return; }
        var next = snap.exists ? C.parse(snap.data) : null;
        if (snap.exists && !next || !validProgress(next)) {
          currentRead = false; error = 'Couldn’t verify the saved Operandio timer. Try again.'; paint(); return;
        }
        run = next; currentRead = true; stale = false; error = ''; resolvePending(); paint(); maybeAlert();
      }, function () {
        if (!sameAuthority(atEpoch)) return;
        stopCurrent(); stale = true; error = readFailure(); paint();
      }, session);
      if (atEpoch !== epoch || disposed) { if (unsubscribe) unsubscribe(); }
      else if (!unsubscribe.ended()) currentWatch = unsubscribe;
    }
    function suspend() {
      epoch++; stopCurrent();
      if (H.stopChime) H.stopChime();
      session = null; sessionKey = ''; ownerKey = ''; currentRead = false;
      stale = false; error = ''; actionError = null; run = null;
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
      paint(); watchCurrent(epoch);
    }
    function maybeAlert() {
      if (!session || !currentRead || stale || error || pending || ui.isOpen() || !sameAuthority(epoch)) return false;
      var alert = C.alert(run, H.now(), Object.assign(Object.create(null), seen, presented));
      if (!alert || hooks.canOpen && !hooks.canOpen('ping')) return false;
      if (!ui.ping(alert.hours)) return false;
      presented[alert.key] = true; presented = cleanSeen(presented);
      if (H.chime) H.chime(alert);
      return true;
    }
    function start(hours) {
      sync();
      if (disposed || !session || !sameAuthority(epoch) || pending) return false;
      var stage = hours === 2 ? 1 : hours === 4 ? 2 : 0, at = H.now();
      if (!currentRead || stale || error || !clockOK(at) || !stage || !C.allowed(run, stage, at)) {
        actionError = { stage: hours, message: 'Check the current Operandio timer before starting it.' }; paint(); return false;
      }
      var expected = C.expected(run), id = run && run.id, data;
      try {
        if (stage === 1) id = H.requestId ? H.requestId() : root.crypto.randomUUID();
        if (!C.id(id) || !expected || !Number.isSafeInteger(expected.expectedRev + 1)) throw new Error('Invalid cooling start');
        data = stage === 1 ? { v: 1, run: id, rev: expected.expectedRev + 1, firstAt: H.timestamp(), firstBy: session.by, secondAt: 0, secondBy: '' } :
          { rev: expected.expectedRev + 1, secondAt: H.timestamp(), secondBy: session.by };
      } catch (failure) { actionError = { stage: hours, message: startFailure(hours) }; paint(); return false; }
      var work = { id: id, hours: hours, stage: stage, session: Object.assign({}, session), expectedRun: expected.expectedRun,
        expectedRev: expected.expectedRev, revision: expected.expectedRev + 1, before: run, writing: true, submitted: false, acked: false, unknown: false, observed: false };
      pending = work; actionError = null; paint();
      Promise.resolve().then(function () {
        if (disposed || keyOf(H.session()) !== keyOf(work.session)) throw { code: 'cancelled', definite: true };
        work.submitted = true;
        return H.write(stage === 1 ? 'set' : 'update', 'cooling/current', data, work.session);
      }).then(function () {
        work.writing = false; work.acked = true;
        if (disposed || pending !== work) return;
        sync(); if (session && ownerOf(work.session) === ownerKey) { resolvePending(); paint(); maybeAlert(); }
      }, function (failure) {
        work.writing = false;
        if (disposed || pending !== work) return;
        sync();
        var code = failure && failure.code || '', definite = failure && failure.definite === true ||
          ['permission-denied', 'unauthenticated', 'invalid-argument', 'failed-precondition', 'cancelled', 'aborted', 'already-exists', 'not-found'].indexOf(code) !== -1;
        if (definite) {
          var conflict = currentRead && !stale && !C.matches(run, work.expectedRun, work.expectedRev);
          clearPending();
          if (session && ownerKey === ownerOf(work.session)) actionError = { stage: hours, message: startFailure(hours, code, conflict) };
        } else { work.unknown = true; if (session && ownerKey === ownerOf(work.session)) resolvePending(); }
        paint();
      });
      return true;
    }
    function acknowledge(hours, runId) {
      if (!session || !sameAuthority(epoch) || !C.id(runId) || hours !== 2 && hours !== 4) return false;
      var key = runId + '_' + (hours === 2 ? '1' : '2'); seen[key] = true; seen = cleanSeen(seen);
      // Bounded event identities, scoped by kitchen/device/person. No timer content or deadlines are persisted.
      try { var saved = H.writeSeen && H.writeSeen(session, Object.assign({}, seen)); if (saved && saved.catch) saved.catch(function () {}); } catch (e) {}
      return true;
    }
    function retryRead() {
      sync(); if (!session || disposed) return;
      error = ''; stale = true; stopCurrent(); paint(); watchCurrent(epoch);
    }
    function tick() { sync(); if (!session || disposed) return false; paint(); return maybeAlert(); }
    function open(anchor) { sync(); if (!session || disposed) return false; paint(); return ui.open(anchor); }
    function pendingWork() {
      return pending ? { uid: pending.session.uid, by: pending.session.by, person: pending.session.by, pin: pending.session.pin,
        id: pending.id, writing: pending.writing, accepted: pending.acked, created: pending.submitted } : null;
    }
    function dispose() { if (disposed) return; suspend(); disposed = true; ui.dispose(); }
    paint();
    return { sync: sync, tick: tick, open: open, chipHTML: function () { return ui.chipHTML(); },
      paintChip: function () { if (ui.paintChip) ui.paintChip(); }, start: start, acknowledge: acknowledge,
      retryRead: retryRead, isBusy: function () { return !!pending; }, pendingWork: pendingWork, stop: suspend, dispose: dispose,
      snapshot: function () { return model(); } };
  }
  var api = { create: create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LK_COOLING_APP = api;
}(typeof window !== 'undefined' ? window : globalThis));
