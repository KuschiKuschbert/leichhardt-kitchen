/* Operandio presentation. The caller owns authorisation, canonical records, writes and the shared clock.
   No timers, database reads or saved copies here; render() is called by the existing service clock. */
(function () {
  'use strict';
  var CLOCK = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  var CLOCK_FACE = '<span class="cooling-clock-face" aria-hidden="true"><svg class="cooling-clock-progress" viewBox="0 0 44 44"><circle class="cooling-clock-track" cx="22" cy="22" r="18"/><circle class="cooling-clock-ring" cx="22" cy="22" r="18" pathLength="100"/><path class="cooling-clock-sector"/></svg><span class="cooling-clock-drawing">' + CLOCK + '</span><b class="cooling-clock-stage"></b><span class="cooling-clock-check">✓</span><svg class="cooling-clock-play" viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z" fill="currentColor"/></svg><span class="cooling-clock-wait">···</span><span class="cooling-clock-alert">!</span></span><span class="cooling-clock-copy"><strong></strong><small></small></span>';
  function mount(hooks) {
    var H = hooks || {}, model = {}, wrap = null, kind = '', pingStage = 0, pingRun = null, previous = null, disposed = false, attempt = 0, pendingFocus = 0, armed = '', clockFocus = false, startingCall = false, deferredModel = null, dismissedError = '';
    if (typeof H.esc !== 'function' || typeof H.clock !== 'function') throw new Error('Cooling UI needs the book text and clock helpers.');
    var live = document.createElement('div');
    live.className = 'visually-hidden'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);
    function say(text) { if (live.textContent !== text) live.textContent = text; }
    function text(el, value) { if (el && el.textContent !== value) el.textContent = value; }
    function finite(value) { return typeof value === 'number' && Number.isFinite(value) && value > 0; }
    function validRun(run) {
      return run && typeof run.id === 'string' && finite(run.firstAt) && finite(run.firstDue) && run.firstDue > run.firstAt &&
        ((!run.secondAt && !run.secondDue) || finite(run.secondAt) && finite(run.secondDue) && run.secondAt >= run.firstDue && run.secondDue > run.secondAt && finite(run.restartAt) && run.restartAt >= run.secondDue);
    }
    function state() {
      var run = validRun(model.run) ? model.run : null, bad = !!model.run && !run, clockOK = finite(model.now);
      return { run: run, ready: !!model.available && !!model.ready && !model.stale && !model.error && !bad && clockOK,
        bad: bad, firstDone: !!run && clockOK && model.now >= run.firstDue,
        newBatchReady: !!run && !!run.restartAt && clockOK && model.now >= run.restartAt,
        secondDone: !!run && !!run.secondDue && clockOK && model.now >= run.secondDue };
    }
    function left(until) {
      var minutes = Math.max(0, Math.ceil((until - model.now) / 60000)), hours = Math.floor(minutes / 60), rest = minutes % 60;
      if (!minutes) return 'Time reached';
      return (hours ? hours + ' h' + (rest ? ' ' : '') : '') + (rest ? rest + ' min' : '') + ' left';
    }
    function at(value) { return H.clock(value); }
    function recordedAt(hours, runId) {
      var value = model.recorded;
      if (!model.recordedReady || model.recordedStale || model.recordedError || !value || value.id !== runId) return 0;
      var stamp = hours === 2 ? value.firstAt : value.secondAt;
      return finite(stamp) ? stamp : 0;
    }
    function outstanding(s) {
      if (!s.run) return 0;
      if (s.firstDone && !recordedAt(2, s.run.id)) return 2;
      return s.secondDone && !recordedAt(4, s.run.id) ? 4 : 0;
    }
    function rowState(hours) {
      var s = state(), run = s.run, first = hours === 2, started = run && (first ? run.firstAt : run.secondAt), due = run && (first ? run.firstDue : run.secondDue);
      var done = !!started && finite(model.now) && model.now >= due;
      var ready = s.ready && (first ? !run : s.firstDone && !run.secondAt), busy = model.pending === hours;
      var error = !busy && model.actionError && model.actionError.stage === hours ? String(model.actionError.message || '') : '';
      return { hours: hours, started: started, due: due, done: done, ready: ready, busy: busy, error: error,
        caption: started ? done ? 'Finished at ' + at(due) : left(due) : busy ? 'Waiting for confirmation' : error ? 'Not started' : first ? '' : s.firstDone ? 'Ready to start' : 'After 2 hours' };
    }
    function chipHTML() {
      if (!model.available) return '';
      // Stable markup: the app inserts this once; paintChip updates the original controls in place.
      return '<span class="cooling-clock" data-clock-state="checking"><button type="button" class="tm-chip cooling-chip cooling-clock-control" data-cooling="clock" aria-label="Checking Operandio timers">' + CLOCK_FACE + '</button><span class="cooling-clock-status cooling-clock-control" role="status" aria-live="off" tabindex="-1" hidden>' + CLOCK_FACE + '</span></span>';
    }
    function armKey(s) { return s.run ? s.run.id + ':' + s.run.secondAt : 'empty'; }
    function actionErrorKey(value) {
      var error = value && value.actionError;
      return error ? JSON.stringify([error.stage, String(error.message || '')]) : '';
    }
    function headerError(s) {
      // Acknowledging our refusal never changes the shared result or removes its detail from the menu.
      return !!model.actionError && !(dismissedError === actionErrorKey(model) && s.ready && s.run);
    }
    function clockState() {
      var s = state(), run = s.run, dueCheck = outstanding(s), hours = model.pending || model.confirmPending || dueCheck || (run && run.secondAt ? 4 : 2), phase;
      if (model.pending) phase = 'pending';
      else if (model.confirmPending) phase = 'recording';
      else if (headerError(s)) phase = 'error';
      else if (!s.ready) phase = model.error || s.bad ? 'error' : 'checking';
      else if (dueCheck && (!model.recordedReady || model.recordedStale || model.recordedError)) phase = model.recordedError ? 'error' : 'checking';
      else if (dueCheck) phase = 'record';
      else if (armed && armed === armKey(s)) phase = 'armed';
      else if (!run) phase = 'idle';
      else if (s.secondDone) phase = s.newBatchReady ? 'idle' : 'done2';
      else if (run.secondAt) phase = 'second';
      else if (s.firstDone) phase = 'done1';
      else phase = 'first';
      var running = phase === 'first' || phase === 'second', due = run && (hours === 4 ? run.secondDue : run.firstDue), began = run && (hours === 4 ? run.secondAt : run.firstAt);
      var progress = running ? Math.max(0, Math.min(1, (model.now - began) / (due - began))) : phase === 'done1' || phase === 'done2' ? 1 : 0;
      var seconds = running ? Math.max(0, Math.ceil((due - model.now) / 1000)) : 0;
      var countdown = Math.floor(seconds / 3600) + ':' + String(Math.floor(seconds % 3600 / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
      var primary = phase === 'idle' ? '' : phase === 'armed' ? 'Start' : phase === 'pending' ? 'Starting…' : phase === 'recording' ? 'Saving…' : phase === 'record' ? 'Record ' + hours + ' h' : phase === 'error' ? 'Check timer' : phase === 'checking' ? 'Check timer' : running ? countdown : 'Done';
      var secondary = phase === 'done1' ? 'Start 4 h →' : phase === 'done2' ? 'Tomorrow · 00:00' : phase === 'checking' ? model.stale || model.recordedStale ? 'Not connected' : 'Checking…' : phase === 'error' || phase === 'record' ? 'Operandio · details' : 'Operandio · ' + (phase === 'armed' ? 2 : hours) + ' h';
      var label = phase === 'idle' ? 'Operandio cooling timer. Prepare 2-hour start' : phase === 'armed' ? (s.secondDone ? 'Start another Operandio batch, 2-hour timer' : 'Start Operandio 2-hour timer') : phase === 'pending' ? 'Starting Operandio ' + hours + '-hour timer. Waiting for confirmation.' : phase === 'recording' ? 'Saving Operandio ' + hours + '-hour confirmation.' : phase === 'record' ? 'Operandio ' + hours + '-hour check needs recording. Open timer details.' : phase === 'done1' ? 'Operandio 2 hours done. Start 4-hour timer' : phase === 'done2' ? 'Operandio cooling finished. Timer disabled until tomorrow at 00:00 Queensland time.' : running ? 'Operandio ' + hours + '-hour timer, ' + countdown + ' remaining' : model.actionError ? String(model.actionError.message || 'Couldn’t start Operandio. Check the timer.') : readStatus();
      if (phase === 'pending' && model.error) label += ' ' + String(model.error);
      return { phase: phase, hours: hours, running: running, readOnly: running || phase === 'done2', progress: progress, primary: primary, secondary: secondary, label: label || 'Check Operandio timers' };
    }
    function sector(progress) {
      if (progress <= 0) return '';
      if (progress >= 1) return 'M22 4 A18 18 0 1 1 22 40 A18 18 0 1 1 22 4Z';
      var angle = progress * Math.PI * 2 - Math.PI / 2;
      return 'M22 22 L22 4 A18 18 0 ' + (progress > .5 ? 1 : 0) + ' 1 ' + (22 + 18 * Math.cos(angle)).toFixed(3) + ' ' + (22 + 18 * Math.sin(angle)).toFixed(3) + 'Z';
    }
    function paintChip() {
      if (disposed) return;
      var c = clockState(), restore = clockFocus && !model.pending && !wrap;
      document.querySelectorAll('.cooling-clock').forEach(function (chip) {
        var button = chip.querySelector('button'), status = chip.querySelector('.cooling-clock-status');
        var focused = document.activeElement === button || document.activeElement === status || restore && document.activeElement === document.body;
        chip.hidden = !model.available; chip.dataset.clockState = c.phase;
        button.hidden = c.readOnly; status.hidden = !c.readOnly; button.disabled = c.phase === 'pending';
        button.setAttribute('aria-busy', String(c.phase === 'pending' || c.phase === 'recording'));
        button.setAttribute('aria-label', c.label); status.setAttribute('aria-label', c.label); button.title = c.label; status.title = c.label;
        if (c.phase === 'checking' || c.phase === 'error' || c.phase === 'record' || c.phase === 'recording') { button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-expanded', String(!!wrap)); }
        else { button.removeAttribute('aria-haspopup'); button.removeAttribute('aria-expanded'); }
        chip.querySelectorAll('.cooling-clock-control').forEach(function (control) {
          text(control.querySelector('strong'), c.primary); text(control.querySelector('small'), c.secondary); text(control.querySelector('.cooling-clock-stage'), c.hours + 'h');
          control.querySelector('.cooling-clock-ring').style.strokeDashoffset = String(100 * (1 - c.progress));
          control.querySelector('.cooling-clock-sector').setAttribute('d', sector(c.progress));
        });
        if (focused && model.available && !wrap && !model.pending) (c.readOnly ? status : button).focus({ preventScroll: true });
      });
      if (restore) clockFocus = false;
    }
    function errorLine(host, message) {
      var line = host.querySelector(':scope > .cooling-error');
      if (!message) { if (line) line.remove(); return; }
      if (!line) { line = document.createElement('p'); line.className = 'p-err cooling-error'; line.setAttribute('role', 'alert'); host.appendChild(line); }
      text(line, message);
    }
    function actionButton(host, hours, ready, busy, error, label) {
      var button = host.querySelector('button');
      if (!button) { host.innerHTML = '<button type="button" class="btn cooling-start"></button>'; button = host.firstElementChild; }
      button.classList.toggle('dark', !!ready || !!busy);
      button.setAttribute('data-cooling', 'start'); button.setAttribute('data-stage', String(hours));
      button.disabled = !ready || !!model.pending || !!model.confirmPending;
      if (busy) button.setAttribute('aria-busy', 'true'); else button.removeAttribute('aria-busy');
      button.setAttribute('aria-label', (busy ? 'Starting' : error ? 'Try again: start' : 'Start') + ' Operandio ' + hours + '-hour timer');
      text(button, busy ? 'Starting…' : error ? 'Try again' : label || 'Start');
      return button;
    }
    function paintConfirmation(host, hours, source) {
      if (!host) return;
      var s = state(), same = !!source && !!s.run && source.id === s.run.id;
      var due = source && (hours === 2 ? source.firstDue : source.secondDue), elapsed = finite(due) && finite(model.now) && model.now >= due;
      host.hidden = !elapsed;
      if (!elapsed) return;
      var busy = model.confirmPending === hours, stamp = same && !busy ? recordedAt(hours, source.id) : 0;
      if (stamp) {
        var actor = hours === 2 ? model.recorded.firstBy : model.recorded.secondBy;
        var person = H.personName && actor ? H.personName(actor) : '';
        var recorded = '<span class="lk-stamp">Recorded ' + H.esc(at(stamp)) + (person ? ' · ' + H.esc(person) : '') + '</span>';
        var focused = host.contains(document.activeElement);
        if (host.innerHTML !== recorded) host.innerHTML = recorded;
        if (focused) host.closest('.cooling-entry').focus({ preventScroll: true });
        return;
      }
      var button = host.querySelector('.cooling-confirm');
      if (!button) {
        host.innerHTML = '<p class="cooling-record-note"></p><button type="button" class="btn dark cooling-confirm nt-got" data-cooling="confirm"></button><div class="cooling-confirm-error"></div>';
        button = host.querySelector('button');
      }
      var error = !busy && model.confirmError && model.confirmError.stage === hours ? String(model.confirmError.message || '') : '';
      var canConfirm = same && s.ready && model.recordedReady && !model.recordedStale && !model.recordedError;
      text(host.querySelector('.cooling-record-note'), busy ? 'Waiting for confirmation. Keep this tab open.' : !same ? 'This batch has been replaced. Open the clock for the current batch.' : 'Record this check in Operandio, then confirm here.');
      button.dataset.confirmStage = String(hours);
      button.setAttribute('aria-describedby', kind === 'menu' ? 'cooling-label-' + hours + ' cooling-detail-' + hours : 'cooling-title');
      button.disabled = !canConfirm || !!model.pending || !!model.confirmPending;
      if (busy) button.setAttribute('aria-busy', 'true'); else button.removeAttribute('aria-busy');
      text(button, busy ? 'Saving…' : error ? 'Try again: recorded in Operandio' : 'I’ve recorded this in Operandio');
      errorLine(host.querySelector('.cooling-confirm-error'), error);
    }
    function paintRow(entry, hours) {
      var r = rowState(hours), action = entry.querySelector('.cooling-action'), focused = action.contains(document.activeElement) || pendingFocus === hours && !model.pending && document.activeElement === document.body;
      text(entry.querySelector('.cooling-detail'), r.caption);
      if (r.started) {
        var html = r.done ? '<span class="cooling-done">✓ Finished</span>' : '<span class="cooling-status"><span class="lk-stamp">Started ' + H.esc(at(r.started)) + '</span><small>Due ' + H.esc(at(r.due)) + '</small></span>';
        if (action.innerHTML !== html) action.innerHTML = html;
        if (focused) entry.focus({ preventScroll: true });
      } else {
        var button = actionButton(action, hours, r.ready, r.busy, r.error);
        button.setAttribute('aria-describedby', 'cooling-detail-' + hours);
        if (focused && pendingFocus === hours && !model.pending && !button.disabled) button.focus({ preventScroll: true });
      }
      if (pendingFocus === hours && !model.pending) pendingFocus = 0;
      errorLine(entry, r.error);
      paintConfirmation(entry.querySelector('.cooling-record'), hours, state().run);
    }
    function readStatus() {
      var s = state();
      if (model.error) return String(model.error);
      if (s.bad) return 'Couldn’t read Operandio timers. Try again.';
      if (model.stale) return 'Not connected. The last timer is shown. Reconnect before starting.';
      if (!model.ready || !finite(model.now)) return 'Checking Operandio timers…';
      if (model.recordedError) return String(model.recordedError);
      if (model.recordedStale) return 'Not connected. Reconnect to check Operandio confirmations.';
      if (!model.recordedReady) return 'Checking Operandio confirmations…';
      return '';
    }
    function paintRead(host) {
      var message = readStatus(), retry = !!model.error || !!model.recordedError || state().bad, line = host.querySelector('.cooling-read');
      if (!message) { if (line) line.remove(); return; }
      if (!line) { line = document.createElement('div'); line.className = 'cooling-read'; line.innerHTML = '<p></p>'; host.appendChild(line); }
      var p = line.querySelector('p'); p.className = retry ? 'p-err' : ''; p.setAttribute('role', retry ? 'alert' : 'status'); text(p, message);
      var button = line.querySelector('button');
      if (retry && !button) { button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.dataset.cooling = 'retry'; button.textContent = 'Try again'; line.appendChild(button); }
      else if (!retry && button) button.remove();
    }
    function paintNewBatch(host) {
      var s = state(), footer = host.querySelector('.cooling-new');
      if (!s.secondDone) { if (footer) footer.remove(); return; }
      if (!footer) { footer = document.createElement('footer'); footer.className = 'cooling-new'; footer.innerHTML = '<div class="cooling-action"></div>'; host.appendChild(footer); }
      var error = model.pending !== 2 && model.actionError && model.actionError.stage === 2 ? String(model.actionError.message || '') : '';
      actionButton(footer.querySelector('.cooling-action'), 2, s.ready && s.newBatchReady, model.pending === 2, error, s.newBatchReady ? 'Start another batch' : 'Available tomorrow');
      errorLine(footer, error);
    }
    function paintMenu() {
      var box = wrap.querySelector('.cooling-menu');
      paintRow(box.querySelector('[data-timer="2"]'), 2); paintRow(box.querySelector('[data-timer="4"]'), 4);
      paintRead(box.querySelector('.cooling-read-slot')); paintNewBatch(box.querySelector('.cooling-new-slot')); place();
    }
    function paintPing() {
      var s = state(), run = pingRun, same = !!s.run && !!run && s.run.id === run.id, line = wrap.querySelector('.cooling-ping-time'), next = wrap.querySelector('.cooling-next');
      if (same && recordedAt(pingStage, run.id) && model.confirmPending !== pingStage) {
        say('Operandio ' + pingStage + '-hour check confirmed. The reminder is cleared for everyone.'); close(); return;
      }
      text(line, run ? 'Time reached at ' + at(pingStage === 2 ? run.firstDue : run.secondDue) + '.' + (pingStage === 4 && same && !s.newBatchReady ? ' Timer available tomorrow at 00:00.' : '') : 'The shared timer has changed. Open the clock for the current batch.');
      if (pingStage === 2 && run) {
        next.hidden = false;
        var title = next.querySelector('b'), detail = next.querySelector('p'), host = next.querySelector('.cooling-action'), error = model.pending !== 4 && model.actionError && model.actionError.stage === 4 ? String(model.actionError.message || '') : '';
        if (!same) {
          text(title, 'Another Operandio batch has started.'); text(detail, 'Open the clock to see the current timers.');
          var oldFocus = host.contains(document.activeElement); host.replaceChildren(); if (oldFocus) wrap.querySelector('.nt-got').focus({ preventScroll: true });
          errorLine(next, error);
        } else if (run.secondAt) {
          text(title, s.secondDone ? 'The next 4 hours have finished.' : 'The next 4 hours are running.');
          text(detail, 'Started ' + at(run.secondAt) + ' · due ' + at(run.secondDue) + '.');
          var focus = host.contains(document.activeElement) || pendingFocus === 4 && !model.pending && document.activeElement === document.body; host.replaceChildren(); if (focus) wrap.querySelector('.nt-got').focus({ preventScroll: true });
          if (!model.pending) pendingFocus = 0;
          errorLine(next, error);
        } else {
          text(title, 'Next: another 4 hours'); text(detail, model.pending === 4 ? 'Waiting for confirmation.' : 'Waiting for someone to start it.');
          actionButton(host, 4, s.ready && s.firstDone, model.pending === 4, error, 'Start 4 hours'); errorLine(next, error);
        }
      } else next.hidden = true;
      paintConfirmation(wrap.querySelector('.cooling-ping-record'), pingStage, run);
      paintRead(wrap.querySelector('.cooling-ping-read'));
    }
    function place() {
      if (!wrap || kind !== 'menu') return;
      var menu = wrap.querySelector('.cooling-menu'), chip = document.querySelector('.cooling-clock-control:not([hidden])'), anchor = chip || previous;
      var rect = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: innerWidth - 44, width: 44, bottom: 56 };
      menu.style.top = Math.max(8, Math.min(rect.bottom + 8, innerHeight - menu.offsetHeight - 8)) + 'px';
      menu.style.left = Math.max(8, Math.min(innerWidth - menu.offsetWidth - 8, rect.left + rect.width / 2 - menu.offsetWidth / 2)) + 'px';
    }
    function rowHTML(hours) {
      return '<div class="cooling-entry" data-timer="' + hours + '" tabindex="-1"><div class="cooling-row"><span class="cooling-label"><b id="cooling-label-' + hours + '">' + hours + ' hours</b><small class="cooling-detail" id="cooling-detail-' + hours + '"></small></span><span class="cooling-action"></span></div><div class="cooling-record" hidden></div></div>';
    }
    function show(nextKind, stage, anchor) {
      if (disposed || !model.available || wrap || H.canOpen && !H.canOpen(nextKind)) return false;
      if (nextKind === 'ping') {
        var s = state(); if (!s.ready || !model.recordedReady || model.recordedStale || model.recordedError || recordedAt(stage, s.run && s.run.id) || (stage === 2 ? !s.firstDone : stage !== 4 || !s.secondDone)) return false;
      }
      armed = '';
      previous = anchor || document.querySelector('.cooling-clock-control:not([hidden])') || document.activeElement;
      kind = nextKind; pingStage = stage || 0; pingRun = nextKind === 'ping' ? Object.assign({}, state().run) : null; wrap = document.createElement('div');
      wrap.className = nextKind === 'menu' ? 'wm-wrap cooling-wrap' : 'nt-wrap cooling-wrap';
      if (nextKind === 'menu') {
        wrap.innerHTML = '<div class="wm-bg" data-cooling="close"></div><section class="cooling-menu" role="dialog" aria-modal="true" aria-labelledby="cooling-title" tabindex="-1"><header class="cooling-head"><h2 id="cooling-title">Operandio</h2><button type="button" class="btn cooling-close" data-cooling="close" aria-label="Close cooling timers">×</button></header>' + rowHTML(2) + rowHTML(4) + '<div class="cooling-read-slot"></div><div class="cooling-new-slot"></div></section>';
      } else {
        wrap.innerHTML = '<div class="nt-bg" data-cooling="close"></div><section class="nt cooling-ping" role="dialog" aria-modal="true" aria-labelledby="cooling-title" tabindex="-1"><div class="nt-grip" aria-hidden="true"></div><div class="nt-in"><header class="nt-head"><span class="nt-eb">Cooling timer · everyone</span><h2 class="nt-h" id="cooling-title">' + (stage === 2 ? 'First 2 hours finished' : 'Next 4 hours finished') + '</h2></header><div class="nt-body"><h3>Operandio batch cooling time ' + stage + ' hours is done.</h3><p class="cooling-ping-time"></p><div class="cooling-next"><b></b><p></p><div class="cooling-action"></div></div><div class="cooling-ping-read"></div></div><footer class="nt-foot"><div class="cooling-record cooling-ping-record"></div><button type="button" class="btn cooling-later" data-cooling="close">Not yet</button><p>Confirmation clears this reminder for everyone.</p></footer></div></section>';
      }
      document.body.appendChild(wrap); document.documentElement.classList.add('cooling-open');
      if (kind === 'menu') paintMenu(); else paintPing();
      paintChip();
      if (H.opened) H.opened(kind, function () { close(true); });
      wrap.querySelector(kind === 'menu' ? '.cooling-menu' : '.nt-got').focus({ preventScroll: true });
      return true;
    }
    function close(noBack) {
      if (!wrap) return;
      var oldKind = kind, oldStage = pingStage, oldRun = pingRun && pingRun.id, focus = previous;
      if (model.available && model.actionError && Array.prototype.some.call(wrap.querySelectorAll('.cooling-error'), function (line) {
        return !!line.getClientRects().length && line.textContent === String(model.actionError.message || '');
      })) dismissedError = actionErrorKey(model);
      wrap.remove(); wrap = null; kind = ''; pingStage = 0; pingRun = null; previous = null; pendingFocus = 0;
      document.documentElement.classList.remove('cooling-open'); paintChip();
      if (focus && focus.isConnected && focus.focus) {
        if (focus.hidden) focus = document.querySelector('.cooling-clock-control:not([hidden])') || focus;
        focus.focus({ preventScroll: true });
      }
      if (H.closed) H.closed(oldKind, !!noBack, oldStage, oldRun);
    }
    function start(hours) {
      var s = state();
      if (model.pending || model.confirmPending || !s.ready || !(hours === 2 ? !s.run || s.secondDone && s.newBatchReady : hours === 4 && s.firstDone && !s.run.secondAt)) return;
      var token = ++attempt;
      pendingFocus = hours; armed = ''; dismissedError = '';
      model = Object.assign({}, model, { pending: hours, actionError: null });
      if (wrap) { if (kind === 'menu') paintMenu(); else paintPing(); }
      paintChip();
      say('Starting Operandio ' + hours + '-hour timer. Waiting for confirmation.');
      function failed() {
        if (disposed || token !== attempt || model.pending !== hours) return;
        render(Object.assign({}, model, { pending: 0, actionError: { stage: hours, message: 'Couldn’t start Operandio ' + hours + '-hour timer. Try again.' } }));
      }
      // The controller synchronises first, then publishes its pending state. Keep that synchronous reconciliation
      // inside this tap so the button and focus do not briefly fall back to the pre-start state.
      startingCall = true; deferredModel = null;
      try { var result = H.onStart && H.onStart(hours); if (result && result.catch) result.catch(failed); if (!H.onStart || result === false && !deferredModel) failed(); } catch (e) { failed(); }
      finally { startingCall = false; if (deferredModel) { var next = deferredModel; deferredModel = null; render(next); } }
    }
    function confirm(hours) {
      var s = state(), source = kind === 'ping' ? pingRun : s.run;
      if (model.pending || model.confirmPending || !source || !s.run || source.id !== s.run.id || !s.ready || !model.recordedReady || model.recordedStale || model.recordedError || recordedAt(hours, source.id) || !(hours === 2 ? s.firstDone : hours === 4 && s.secondDone)) return;
      var token = ++attempt;
      model = Object.assign({}, model, { confirmPending: hours, confirmError: null });
      if (kind === 'menu') paintMenu(); else paintPing();
      paintChip(); say('Saving Operandio ' + hours + '-hour confirmation.');
      function failed() {
        if (disposed || token !== attempt || model.confirmPending !== hours) return;
        render(Object.assign({}, model, { confirmPending: 0, confirmError: { stage: hours, message: 'Couldn’t save the Operandio ' + hours + '-hour confirmation. Try again.' } }));
      }
      startingCall = true; deferredModel = null;
      try { var result = H.onConfirm && H.onConfirm(hours, source.id); if (result && result.catch) result.catch(failed); if (!H.onConfirm || result === false && !deferredModel) failed(); } catch (e) { failed(); }
      finally { startingCall = false; if (deferredModel) { var next = deferredModel; deferredModel = null; render(next); } }
    }
    function click(event) {
      if (disposed) return;
      if (armed && !event.target.closest('.cooling-clock')) { armed = ''; paintChip(); }
      var button = event.target.closest('[data-cooling]'); if (!button) return;
      var action = button.getAttribute('data-cooling');
      if (action === 'clock') {
        event.preventDefault();
        if (!model.available || model.pending || wrap || H.canOpen && !H.canOpen('menu')) return;
        var c = clockState(), s = state();
        if (c.readOnly) return;
        if (c.phase === 'error' || c.phase === 'checking' || c.phase === 'record' || c.phase === 'recording') { show('menu', 0, button); return; }
        if (c.phase === 'done1') { clockFocus = true; start(4); return; }
        if (c.phase === 'armed') { clockFocus = true; start(2); return; }
        armed = armKey(s); paintChip(); say(s.secondDone ? 'Start another Operandio batch. Tap Start for 2 hours.' : 'Start Operandio 2-hour timer. Tap Start to confirm.');
        return;
      }
      if (action === 'open') { event.preventDefault(); if (wrap) close(); else show('menu', 0, button); return; }
      if (!wrap || !wrap.contains(button)) return;
      if (action === 'close') { close(); return; }
      if (action === 'start') { start(Number(button.getAttribute('data-stage'))); return; }
      if (action === 'confirm') { confirm(Number(button.getAttribute('data-confirm-stage'))); return; }
      if (action === 'retry' && H.onRetryRead) {
        button.disabled = true; text(button, 'Checking…');
        var line = button.closest('.cooling-read').querySelector('p'); line.className = ''; line.setAttribute('role', 'status'); text(line, 'Checking Operandio timers…');
        try { var result = H.onRetryRead(); if (result && result.catch) result.catch(function () { render(Object.assign({}, model, { error: 'Couldn’t read Operandio timers. Try again.' })); }); }
        catch (e) { render(Object.assign({}, model, { error: 'Couldn’t read Operandio timers. Try again.' })); }
      }
    }
    function key(event) {
      if (!wrap && armed && event.key === 'Escape') { armed = ''; paintChip(); event.preventDefault(); return; }
      if (!wrap) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
      if (event.key === 'Tab') {
        var box = wrap.querySelector('[role="dialog"]'), active = document.activeElement;
        // The book trap handles edge controls; a read-only row focused after confirmation needs the same first step.
        if (active === box || active && active.matches('.cooling-entry')) {
          var controls = Array.prototype.filter.call(box.querySelectorAll('button:not(:disabled)'), function (el) { return !!el.getClientRects().length; });
          if (controls.length) { event.preventDefault(); controls[event.shiftKey ? controls.length - 1 : 0].focus(); }
        } else if (H.trapTab) H.trapTab(event, box);
      }
    }
    function render(next) {
      if (disposed) return;
      if (startingCall) { deferredModel = next; return; }
      var old = model, runBefore = validRun(old.run) ? old.run : null;
      model = Object.assign({}, next || {});
      if (!model.available || model.pending || model.actionError !== old.actionError || actionErrorKey(model) !== actionErrorKey(old)) dismissedError = '';
      var current = validRun(model.run) ? model.run : null;
      var s = state();
      if (!s.ready || model.pending || headerError(s) || armed && (armed !== armKey(s) || s.run && !s.newBatchReady)) armed = '';
      if (pingRun && current && current.id === pingRun.id) pingRun = Object.assign({}, current);
      if (!model.available) { attempt++; model = { available: false }; armed = ''; clockFocus = false; close(); say(''); paintChip(); return; }
      if (model.actionError) say('');
      else if (current && model.ready && !model.stale && !model.error) {
        if (!runBefore || runBefore.id !== current.id) say('Started Operandio 2-hour timer. Due ' + at(current.firstDue) + '.');
        else if (!runBefore.secondAt && current.secondAt) say('Started Operandio 4-hour timer. Due ' + at(current.secondDue) + '.');
      }
      if (wrap) { if (kind === 'menu') paintMenu(); else paintPing(); }
      if (clockFocus && !wrap && (headerError(s) || model.error)) show('menu', 0);
      paintChip();
    }
    function dispose() {
      if (disposed) return; disposed = true; attempt++; close(); live.remove();
      document.removeEventListener('click', click); document.removeEventListener('keydown', key); window.removeEventListener('resize', place);
    }
    document.addEventListener('click', click); document.addEventListener('keydown', key); window.addEventListener('resize', place);
    return { chipHTML: chipHTML, paintChip: paintChip, open: function (anchor) { return show('menu', 0, anchor); }, ping: function (stage, anchor) { return show('ping', stage, anchor); }, render: render, close: close, dispose: dispose, isOpen: function () { return !!wrap; } };
  }
  window.LK_COOLING_UI = { mount: mount };
}());
