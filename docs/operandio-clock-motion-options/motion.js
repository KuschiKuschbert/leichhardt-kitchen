/* Presentation study only. Synthetic time, no app state, network, storage or kitchen writes. */
(function () {
  'use strict';
  var slot = document.querySelector('.wtop .cooling-slot');
  if (!slot) return;
  var header = slot.closest('.wtop'), query = new URLSearchParams(location.search);
  var design = ['a', 'b', 'c'].includes(query.get('design')) ? query.get('design') : 'a';
  var states = ['idle', 'armed', 'starting1', 'first', 'done1', 'starting2', 'second', 'done2', 'error'];
  var state = 'idle', progress = 0, peek = false, playing = false, muted = query.get('muted') === '1';
  var pendingTimer = 0, stageFrame = 0, playFrame = 0, stageStart = 0, errorStage = 1;
  var desktop = matchMedia('(min-width: 1100px)'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var originalIcon = slot.querySelector('svg');
  var clock = originalIcon ? originalIcon.outerHTML : '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>';
  var contents = '<span class="cm-face" aria-hidden="true"><svg class="cm-progress" viewBox="0 0 44 44"><circle class="cm-track" cx="22" cy="22" r="18"/><circle class="cm-ring" cx="22" cy="22" r="18" pathLength="100"/><path class="cm-sector"/><path class="cm-half cm-half-first" d="M22 4 A18 18 0 0 1 22 40" pathLength="100"/><path class="cm-half cm-half-second" d="M22 40 A18 18 0 0 1 22 4" pathLength="100"/></svg><span class="cm-clock">' + clock + '</span><b class="cm-stage"></b><span class="cm-check">✓</span></span><span class="cm-copy"><strong></strong><small></small></span>';
  slot.classList.add('cm-slot');
  header.classList.add('cm-header');
  slot.dataset.design = design;
  slot.innerHTML = '<button class="tm-chip cooling-chip cm-control" type="button">' + contents + '</button><div class="cm-control cm-status" role="status" aria-live="off" hidden>' + contents + '</div><span class="cm-announcement" role="status" aria-live="polite" aria-atomic="true"></span>';
  var button = slot.querySelector('button'), status = slot.querySelector('.cm-status'), announcement = slot.querySelector('.cm-announcement');

  function stage() { return ['starting2', 'second', 'done2'].includes(state) ? 2 : state === 'error' ? errorStage : 1; }
  function running() { return state === 'first' || state === 'second'; }
  function expanded() { return !['idle', 'first', 'second'].includes(state) || running() && (desktop.matches || peek); }
  function remaining() {
    var seconds = Math.max(0, Math.ceil((1 - progress) * (stage() === 1 ? 7200 : 14400)));
    return Math.floor(seconds / 3600) + ':' + String(Math.floor(seconds % 3600 / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
  }
  function snapshot() {
    return { design: design, state: state, progress: progress, stage: stage(), remaining: remaining(), expanded: expanded(), desktop: desktop.matches, playing: playing, muted: muted };
  }
  function announce(type) {
    var detail = snapshot();
    window.dispatchEvent(new CustomEvent(type || 'clock-demo-state', { detail: detail }));
    if (parent !== window) parent.postMessage(Object.assign({ type: type || 'clock-demo-state' }, detail), location.origin);
  }
  function sector(fraction) {
    if (fraction <= 0) return '';
    if (fraction >= 1) return 'M22 4 A18 18 0 1 1 22 40 A18 18 0 1 1 22 4Z';
    var angle = fraction * Math.PI * 2 - Math.PI / 2;
    return 'M22 22 L22 4 A18 18 0 ' + (fraction > .5 ? 1 : 0) + ' 1 ' + (22 + 18 * Math.cos(angle)).toFixed(3) + ' ' + (22 + 18 * Math.sin(angle)).toFixed(3) + 'Z';
  }
  function fit() {
    var bounds = slot.getBoundingClientRect(), back = header.querySelector('.wtop-back');
    var left = back ? back.getBoundingClientRect().right + 4 : 8;
    var width = desktop.matches ? 152 : Math.max(44, Math.min(152, bounds.right - left));
    slot.style.setProperty('--cm-width', width + 'px');
  }
  function paint() {
    var wide = expanded(), busy = state === 'starting1' || state === 'starting2';
    var done = state === 'done1' || state === 'done2', readOnly = state === 'done2' || running() && desktop.matches;
    var primary = state === 'idle' ? '' : state === 'armed' ? 'Start' : busy ? 'Starting...' : done ? 'Done' : state === 'error' ? 'Try again' : remaining();
    var secondary = state === 'done1' ? 'Start 4 h →' : state === 'done2' ? 'Both stages' : state === 'error' ? 'Operandio failed' : 'Operandio · ' + (stage() === 1 ? '2 h' : '4 h');
    slot.dataset.state = state;
    slot.classList.toggle('cm-expanded', wide);
    slot.classList.toggle('cm-running', running());
    slot.classList.toggle('cm-done', done);
    slot.classList.toggle('cm-busy', busy);
    header.classList.toggle('cm-open', wide && !desktop.matches);
    button.hidden = readOnly; status.hidden = !readOnly;
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
    if (running()) button.setAttribute('aria-expanded', String(peek)); else button.removeAttribute('aria-expanded');
    var label = state === 'idle' ? 'Operandio cooling timers' : state === 'done1' ? 'Operandio 2 hours done. Start 4-hour timer' : state === 'done2' ? 'Operandio cooling done. Both stages complete' : running() ? 'Operandio ' + (stage() === 1 ? '2-hour' : '4-hour') + ' timer, ' + remaining() + ' remaining' : primary + ' Operandio ' + (stage() === 1 ? '2-hour' : '4-hour') + ' timer';
    button.setAttribute('aria-label', label); status.setAttribute('aria-label', label);
    slot.querySelectorAll('.cm-control').forEach(function (control) {
      control.querySelector('strong').textContent = primary;
      control.querySelector('small').textContent = secondary;
      control.querySelector('.cm-stage').textContent = design === 'c' ? String(stage()) : stage() === 1 ? '2h' : '4h';
      control.querySelector('.cm-ring').style.strokeDashoffset = String(100 * (1 - progress));
      control.querySelector('.cm-sector').setAttribute('d', sector(progress));
      control.querySelector('.cm-half-first').style.strokeDashoffset = String(100 * (1 - (stage() === 2 || state === 'done1' ? 1 : progress)));
      control.querySelector('.cm-half-second').style.strokeDashoffset = String(100 * (1 - (stage() === 2 ? progress : 0)));
    });
    fit();
  }
  function transition(next, value, audible) {
    var before = state;
    if (next === 'error') errorStage = stage();
    state = next; progress = Math.max(0, Math.min(1, Number.isFinite(value) ? value : next === 'done1' || next === 'done2' ? 1 : 0));
    peek = false;
    slot.classList.remove('cm-settle', 'cm-jiggle');
    paint();
    if (before !== state) {
      if (state === 'first' || state === 'second') announcement.textContent = 'Operandio ' + (stage() === 1 ? '2-hour' : '4-hour') + ' timer started.';
      else if (state === 'done1' || state === 'done2') announcement.textContent = 'Operandio batch cooling time ' + (stage() === 1 ? '2' : '4') + ' hours is done.';
      else if (state === 'error') announcement.textContent = 'Operandio timer was not started. Try again.';
      else announcement.textContent = '';
      if (!reduced.matches) {
        if (design === 'b' && state === 'armed') slot.classList.add('cm-settle');
        if (design === 'c' && (state === 'done1' || state === 'done2')) slot.classList.add('cm-jiggle');
      }
      if (audible && !muted && (state === 'done1' || state === 'done2') && window.LK_CHIME) window.LK_CHIME.play('chime');
    }
    announce();
  }
  function stop() {
    clearTimeout(pendingTimer); cancelAnimationFrame(stageFrame); cancelAnimationFrame(playFrame);
    pendingTimer = stageFrame = playFrame = 0; playing = false;
  }
  function set(next, value) {
    if (!states.includes(next)) throw new Error('Unknown clock demo state: ' + next);
    stop(); transition(next, value, false); return snapshot();
  }
  function manualRun(next) {
    transition(next, 0, false); stageStart = performance.now();
    function advance(tick) {
      if (state !== next) return;
      progress = Math.min(1, (tick - stageStart) / 8000); paint();
      if (progress === 1) transition(next === 'first' ? 'done1' : 'done2', 1, true);
      else stageFrame = requestAnimationFrame(advance);
    }
    stageFrame = requestAnimationFrame(advance);
  }
  function startStage(second) {
    transition(second ? 'starting2' : 'starting1', 0, false);
    pendingTimer = setTimeout(function () { manualRun(second ? 'second' : 'first'); }, 650);
  }
  function tap() {
    if (playing) stop();
    if (state === 'idle') transition('armed', 0, false);
    else if (state === 'armed') startStage(false);
    else if (state === 'done1') startStage(true);
    else if (state === 'error') startStage(errorStage === 2);
    else if (running() && !desktop.matches) { peek = !peek; paint(); announce(); }
    return snapshot();
  }
  function reset() { return set('idle', 0); }
  function sound(enabled) { muted = !enabled; announce(); return snapshot(); }
  function play() {
    stop(); transition('idle', 0, false); playing = true;
    var began = performance.now(), last = '';
    function advance(tick) {
      var elapsed = (tick - began) / 1000;
      var next = elapsed < .7 ? 'idle' : elapsed < 2 ? 'armed' : elapsed < 2.65 ? 'starting1' : elapsed < 8 ? 'first' : elapsed < 10 ? 'done1' : elapsed < 10.65 ? 'starting2' : elapsed < 16 ? 'second' : 'done2';
      var fraction = next === 'first' ? (elapsed - 2.65) / 5.35 : next === 'second' ? (elapsed - 10.65) / 5.35 : next === 'done1' || next === 'done2' ? 1 : 0;
      if (next !== last) { last = next; transition(next, fraction, true); }
      else { progress = Math.min(1, fraction); paint(); }
      // A short inspect shows the exact countdown without changing a running timer.
      var inspect = !desktop.matches && (elapsed >= 4.4 && elapsed < 5.5 || elapsed >= 12.4 && elapsed < 13.5);
      if (peek !== inspect) { peek = inspect; paint(); announce(); }
      if (elapsed < 18) playFrame = requestAnimationFrame(advance);
      else { playing = false; announce(); }
    }
    playFrame = requestAnimationFrame(advance); announce(); return snapshot();
  }
  button.addEventListener('click', tap);
  document.addEventListener('click', function (event) {
    if (slot.contains(event.target)) return;
    if (state === 'armed') { stop(); transition('idle', 0, false); }
    else if (peek) { peek = false; paint(); announce(); }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (state === 'armed') { stop(); transition('idle', 0, false); button.focus(); }
    else if (peek) { peek = false; paint(); announce(); button.focus(); }
  });
  window.addEventListener('resize', paint);
  desktop.addEventListener('change', function () { peek = false; paint(); announce(); });
  window.addEventListener('message', function (event) {
    if (event.origin !== location.origin || event.source !== parent || !event.data || event.data.type !== 'clock-demo') return;
    var data = event.data;
    if (data.action === 'play') play();
    else if (data.action === 'reset') reset();
    else if (data.action === 'tap') tap();
    else if (data.action === 'sound') sound(data.enabled === true);
    else if (data.action === 'set' && states.includes(data.state)) set(data.state, data.progress);
  });
  window.CLOCK_DEMO = { set: set, tap: tap, play: play, reset: reset, snapshot: snapshot, sound: sound };
  paint(); announce('clock-demo-ready');
  if (query.get('play') === '1') play();
})();
