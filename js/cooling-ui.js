/* Operandio presentation. The caller owns authorisation, canonical records, writes and the shared clock.
   No timers, database reads or saved copies here; render() is called by the existing service clock. */
(function () {
  'use strict';
  var CLOCK = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
  function mount(hooks) {
    var H = hooks || {}, model = {}, wrap = null, kind = '', pingStage = 0, pingRun = null, previous = null, disposed = false, attempt = 0, pendingFocus = 0;
    if (typeof H.esc !== 'function' || typeof H.clock !== 'function') throw new Error('Cooling UI needs the book text and clock helpers.');
    var live = document.createElement('div');
    live.className = 'visually-hidden'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
    document.body.appendChild(live);
    function say(text) { if (live.textContent !== text) live.textContent = text; }
    function text(el, value) { if (el && el.textContent !== value) el.textContent = value; }
    function finite(value) { return typeof value === 'number' && Number.isFinite(value) && value > 0; }
    function validRun(run) {
      return run && typeof run.id === 'string' && finite(run.firstAt) && finite(run.firstDue) && run.firstDue > run.firstAt &&
        ((!run.secondAt && !run.secondDue) || finite(run.secondAt) && finite(run.secondDue) && run.secondAt >= run.firstDue && run.secondDue > run.secondAt);
    }
    function state() {
      var run = validRun(model.run) ? model.run : null, bad = !!model.run && !run, clockOK = finite(model.now);
      return { run: run, ready: !!model.available && !!model.ready && !model.stale && !model.error && !bad && clockOK,
        bad: bad, firstDone: !!run && clockOK && model.now >= run.firstDue,
        secondDone: !!run && !!run.secondDue && clockOK && model.now >= run.secondDue };
    }
    function left(until) {
      var minutes = Math.max(0, Math.ceil((until - model.now) / 60000)), hours = Math.floor(minutes / 60), rest = minutes % 60;
      if (!minutes) return 'Time reached';
      return (hours ? hours + ' h' + (rest ? ' ' : '') : '') + (rest ? rest + ' min' : '') + ' left';
    }
    function at(value) { return H.clock(value); }
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
      var s = state(), due = s.firstDone && (!s.run.secondAt || s.secondDone);
      return '<button type="button" class="tm-chip cooling-chip' + (due ? ' is-due' : '') + '" data-cooling="open" aria-haspopup="dialog" aria-expanded="' + !!wrap + '" aria-label="Operandio cooling timers">' + CLOCK + '</button>';
    }
    function paintChip() {
      var s = state(), due = s.firstDone && (!s.run.secondAt || s.secondDone);
      document.querySelectorAll('[data-cooling="open"]').forEach(function (chip) {
        chip.hidden = !model.available; chip.classList.toggle('is-due', !!due); chip.setAttribute('aria-expanded', String(!!wrap));
      });
    }
    function errorLine(host, message) {
      var line = host.querySelector('.cooling-error');
      if (!message) { if (line) line.remove(); return; }
      if (!line) { line = document.createElement('p'); line.className = 'p-err cooling-error'; line.setAttribute('role', 'alert'); host.appendChild(line); }
      text(line, message);
    }
    function actionButton(host, hours, ready, busy, error, label) {
      var button = host.querySelector('button');
      if (!button) { host.innerHTML = '<button type="button" class="btn cooling-start"></button>'; button = host.firstElementChild; }
      button.classList.toggle('dark', !!ready || !!busy);
      button.setAttribute('data-cooling', 'start'); button.setAttribute('data-stage', String(hours));
      button.disabled = !ready || !!model.pending;
      if (busy) button.setAttribute('aria-busy', 'true'); else button.removeAttribute('aria-busy');
      button.setAttribute('aria-label', (busy ? 'Starting' : error ? 'Try again: start' : 'Start') + ' Operandio ' + hours + '-hour timer');
      text(button, busy ? 'Starting…' : error ? 'Try again' : label || 'Start');
      return button;
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
      errorLine(entry, r.error && !r.started ? r.error : '');
    }
    function failedSchedule() {
      var run = state().run, schedule = run && run.schedule;
      return !!schedule && (schedule.first === 'failed' || !!run.secondAt && schedule.second === 'failed');
    }
    function readStatus() {
      var s = state();
      if (model.error) return String(model.error);
      if (s.bad) return 'Couldn’t read Operandio timers. Try again.';
      if (model.stale) return 'Not connected. The last timer is shown. Reconnect before starting.';
      if (!model.ready || !finite(model.now)) return 'Checking Operandio timers…';
      if (failedSchedule()) return 'The timer is running, but its phone alert could not be scheduled. Tell the head chef.';
      return '';
    }
    function paintRead(host) {
      var message = readStatus(), retry = !!model.error || state().bad, line = host.querySelector('.cooling-read');
      if (!message) { if (line) line.remove(); return; }
      if (!line) { line = document.createElement('div'); line.className = 'cooling-read'; line.innerHTML = '<p></p>'; host.appendChild(line); }
      var p = line.querySelector('p'), warning = retry || failedSchedule(); p.className = warning ? 'p-err' : ''; p.setAttribute('role', warning ? 'alert' : 'status'); text(p, message);
      var button = line.querySelector('button');
      if (retry && !button) { button = document.createElement('button'); button.type = 'button'; button.className = 'btn'; button.dataset.cooling = 'retry'; button.textContent = 'Try again'; line.appendChild(button); }
      else if (!retry && button) button.remove();
    }
    function paintNewBatch(host) {
      var s = state(), footer = host.querySelector('.cooling-new');
      if (!s.secondDone) { if (footer) footer.remove(); return; }
      if (!footer) { footer = document.createElement('footer'); footer.className = 'cooling-new'; footer.innerHTML = '<div class="cooling-action"></div>'; host.appendChild(footer); }
      var error = model.pending !== 2 && model.actionError && model.actionError.stage === 2 ? String(model.actionError.message || '') : '';
      actionButton(footer.querySelector('.cooling-action'), 2, s.ready, model.pending === 2, error, 'Start another batch');
      errorLine(footer, error);
    }
    function paintMenu() {
      var box = wrap.querySelector('.cooling-menu');
      paintRow(box.querySelector('[data-timer="2"]'), 2); paintRow(box.querySelector('[data-timer="4"]'), 4);
      paintRead(box.querySelector('.cooling-read-slot')); paintNewBatch(box.querySelector('.cooling-new-slot')); place();
    }
    function paintPing() {
      var s = state(), run = pingRun, same = !!s.run && !!run && s.run.id === run.id, line = wrap.querySelector('.cooling-ping-time'), next = wrap.querySelector('.cooling-next');
      text(line, run ? 'Time reached at ' + at(pingStage === 2 ? run.firstDue : run.secondDue) + '.' : 'The shared timer has changed. Open the clock for the current batch.');
      if (pingStage === 2 && run) {
        next.hidden = false;
        var title = next.querySelector('b'), detail = next.querySelector('p'), host = next.querySelector('.cooling-action'), error = model.pending !== 4 && model.actionError && model.actionError.stage === 4 ? String(model.actionError.message || '') : '';
        if (!same) {
          text(title, 'Another Operandio batch has started.'); text(detail, 'Open the clock to see the current timers.');
          var oldFocus = host.contains(document.activeElement); host.replaceChildren(); if (oldFocus) wrap.querySelector('.nt-got').focus({ preventScroll: true });
          errorLine(next, '');
        } else if (run.secondAt) {
          text(title, s.secondDone ? 'The next 4 hours have finished.' : 'The next 4 hours are running.');
          text(detail, 'Started ' + at(run.secondAt) + ' · due ' + at(run.secondDue) + '.');
          var focus = host.contains(document.activeElement) || pendingFocus === 4 && !model.pending && document.activeElement === document.body; host.replaceChildren(); if (focus) wrap.querySelector('.nt-got').focus({ preventScroll: true });
          if (!model.pending) pendingFocus = 0;
          errorLine(next, '');
        } else {
          text(title, 'Next: another 4 hours'); text(detail, model.pending === 4 ? 'Waiting for confirmation.' : 'Waiting for someone to start it.');
          actionButton(host, 4, s.ready && s.firstDone, model.pending === 4, error, 'Start 4 hours'); errorLine(next, error);
        }
      } else next.hidden = true;
      paintRead(wrap.querySelector('.cooling-ping-read'));
    }
    function place() {
      if (!wrap || kind !== 'menu') return;
      var menu = wrap.querySelector('.cooling-menu'), chip = document.querySelector('[data-cooling="open"]'), anchor = chip || previous;
      var rect = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: innerWidth - 44, width: 44, bottom: 56 };
      menu.style.top = Math.max(8, Math.min(rect.bottom + 8, innerHeight - menu.offsetHeight - 8)) + 'px';
      menu.style.left = Math.max(8, Math.min(innerWidth - menu.offsetWidth - 8, rect.left + rect.width / 2 - menu.offsetWidth / 2)) + 'px';
    }
    function rowHTML(hours) {
      return '<div class="cooling-entry" data-timer="' + hours + '" tabindex="-1"><div class="cooling-row"><span class="cooling-label"><b>' + hours + ' hours</b><small class="cooling-detail" id="cooling-detail-' + hours + '"></small></span><span class="cooling-action"></span></div></div>';
    }
    function show(nextKind, stage, anchor) {
      if (disposed || !model.available || wrap || H.canOpen && !H.canOpen(nextKind)) return false;
      if (nextKind === 'ping') {
        var s = state(); if (!s.ready || (stage === 2 ? !s.firstDone : stage !== 4 || !s.secondDone)) return false;
      }
      previous = anchor || document.querySelector('[data-cooling="open"]') || document.activeElement;
      kind = nextKind; pingStage = stage || 0; pingRun = nextKind === 'ping' ? Object.assign({}, state().run) : null; wrap = document.createElement('div');
      wrap.className = nextKind === 'menu' ? 'wm-wrap cooling-wrap' : 'nt-wrap cooling-wrap';
      if (nextKind === 'menu') {
        wrap.innerHTML = '<div class="wm-bg" data-cooling="close"></div><section class="cooling-menu" role="dialog" aria-modal="true" aria-labelledby="cooling-title" tabindex="-1"><header class="cooling-head"><h2 id="cooling-title">Operandio</h2><button type="button" class="btn cooling-close" data-cooling="close" aria-label="Close cooling timers">×</button></header>' + rowHTML(2) + rowHTML(4) + '<div class="cooling-read-slot"></div><div class="cooling-new-slot"></div></section>';
      } else {
        wrap.innerHTML = '<div class="nt-bg" data-cooling="close"></div><section class="nt cooling-ping" role="dialog" aria-modal="true" aria-labelledby="cooling-title" tabindex="-1"><div class="nt-grip" aria-hidden="true"></div><div class="nt-in"><header class="nt-head"><span class="nt-eb">Cooling timer · everyone</span><h2 class="nt-h" id="cooling-title">' + (stage === 2 ? 'First 2 hours finished' : 'Next 4 hours finished') + '</h2></header><div class="nt-body"><h3>Operandio batch cooling time ' + stage + ' hours is done.</h3><p class="cooling-ping-time"></p><div class="cooling-next"><b></b><p></p><div class="cooling-action"></div></div><div class="cooling-ping-read"></div></div><footer class="nt-foot"><button type="button" class="btn nt-got" data-cooling="got">Got it</button><p>Closes this message for you only.</p></footer></div></section>';
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
      wrap.remove(); wrap = null; kind = ''; pingStage = 0; pingRun = null; previous = null; pendingFocus = 0;
      document.documentElement.classList.remove('cooling-open'); paintChip();
      if (focus && focus.isConnected && focus.focus) focus.focus({ preventScroll: true });
      if (H.closed) H.closed(oldKind, !!noBack, oldStage, oldRun);
    }
    function start(hours) {
      var s = state();
      if (model.pending || !s.ready || !(hours === 2 ? !s.run || s.secondDone : hours === 4 && s.firstDone && !s.run.secondAt)) return;
      var token = ++attempt;
      pendingFocus = hours;
      model = Object.assign({}, model, { pending: hours, actionError: null });
      if (wrap) { if (kind === 'menu') paintMenu(); else paintPing(); }
      say('Starting Operandio ' + hours + '-hour timer. Waiting for confirmation.');
      function failed() {
        if (disposed || token !== attempt || model.pending !== hours) return;
        render(Object.assign({}, model, { pending: 0, actionError: { stage: hours, message: 'Couldn’t start Operandio ' + hours + '-hour timer. Try again.' } }));
      }
      try { var result = H.onStart && H.onStart(hours); if (result && result.catch) result.catch(failed); if (!H.onStart) failed(); } catch (e) { failed(); }
    }
    function click(event) {
      var button = event.target.closest('[data-cooling]'); if (!button || disposed) return;
      var action = button.getAttribute('data-cooling');
      if (action === 'open') { event.preventDefault(); if (wrap) close(); else show('menu', 0, button); return; }
      if (!wrap || !wrap.contains(button)) return;
      if (action === 'close') { close(); return; }
      if (action === 'start') { start(Number(button.getAttribute('data-stage'))); return; }
      if (action === 'got') { if (H.onAcknowledge) H.onAcknowledge(pingStage, pingRun && pingRun.id); close(); return; }
      if (action === 'retry' && H.onRetryRead) {
        button.disabled = true; text(button, 'Checking…');
        var line = button.closest('.cooling-read').querySelector('p'); line.className = ''; line.setAttribute('role', 'status'); text(line, 'Checking Operandio timers…');
        try { var result = H.onRetryRead(); if (result && result.catch) result.catch(function () { render(Object.assign({}, model, { error: 'Couldn’t read Operandio timers. Try again.' })); }); }
        catch (e) { render(Object.assign({}, model, { error: 'Couldn’t read Operandio timers. Try again.' })); }
      }
    }
    function key(event) {
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
      var old = model, runBefore = validRun(old.run) ? old.run : null;
      model = Object.assign({}, next || {});
      var current = validRun(model.run) ? model.run : null;
      if (pingRun && current && current.id === pingRun.id) pingRun = Object.assign({}, current);
      if (!model.available) { attempt++; model = { available: false }; close(); say(''); paintChip(); return; }
      if (current && model.ready && !model.stale && !model.error) {
        if (!runBefore || runBefore.id !== current.id) say('Started Operandio 2-hour timer. Due ' + at(current.firstDue) + '.');
        else if (!runBefore.secondAt && current.secondAt) say('Started Operandio 4-hour timer. Due ' + at(current.secondDue) + '.');
      }
      if (wrap) { if (kind === 'menu') paintMenu(); else paintPing(); }
      paintChip();
    }
    function dispose() {
      if (disposed) return; disposed = true; attempt++; close(); live.remove();
      document.removeEventListener('click', click); document.removeEventListener('keydown', key); window.removeEventListener('resize', place);
    }
    document.addEventListener('click', click); document.addEventListener('keydown', key); window.addEventListener('resize', place);
    return { chipHTML: chipHTML, open: function (anchor) { return show('menu', 0, anchor); }, ping: function (stage, anchor) { return show('ping', stage, anchor); }, render: render, close: close, dispose: dispose, isOpen: function () { return !!wrap; } };
  }
  window.LK_COOLING_UI = { mount: mount };
}());
