/* A device choice is a preference, never proof of a person's identity or role.
   PIN sessions and Google device grants are checked separately by Firestore. */
(function () {
  'use strict';
  var KEY = 'lk.device.v2', dialog = null, finishDialog = null, requested = false;
  function read() {
    try {
      var p = JSON.parse(localStorage.getItem(KEY) || 'null');
      return p && p.v === 2 && (p.mode === 'personal' || p.mode === 'shared') && typeof p.ownerId === 'string' ? p : null;
    } catch (e) { return null; }
  }
  function emit() { window.dispatchEvent(new Event('lk-device')); }
  function save(p) {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
      var saved = read();
      if (!saved || saved.mode !== p.mode || saved.ownerId !== p.ownerId) return false;
      emit(); return true;
    } catch (e) { return false; }
  }
  function mode() { var p = read(); return p ? p.mode : ''; }
  function ownerId() { var p = read(); return p ? p.ownerId : ''; }
  function choose(value) {
    if (read() || (value !== 'personal' && value !== 'shared')) return false;
    return save({ v: 2, mode: value, ownerId: '' });
  }
  function verify(id) {
    var p = read();
    if (!p || typeof id !== 'string' || !id || id.length > 160) return false;
    if (p.mode === 'shared') return true;
    if (p.ownerId) return p.ownerId === id;
    p.ownerId = id; return save(p);
  }
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) { return false; }
    if (read()) return false;
    emit(); return true;
  }
  function close() {
    if (!dialog) return;
    var d = dialog; dialog = null; d.close(); d.remove();
  }
  function picker(changing) {
    if (dialog) { dialog.focus(); return; }
    var p = window.LK_PREP, trigger = document.activeElement;
    var d = document.createElement('dialog'); d.className = 'ux-picker device-choice'; d.id = 'lk-device-choice';
    d.setAttribute('aria-labelledby', 'lk-device-title'); d.setAttribute('aria-describedby', 'lk-device-note');
    d.innerHTML = '<header class="ux-picker-head"><div class="ux-picker-grip" aria-hidden="true"></div>' +
      '<h2 id="lk-device-title">How is this device used?</h2><p class="hint" id="lk-device-note">Choose once for this browser or installed app.</p></header>' +
      '<div class="ux-picker-options device-options"><button type="button" class="device-option" data-device="personal"><strong>My own device</strong><span>Just me. No idle lock. My PIN unlocks it each day after 04:00.</span></button>' +
      '<button type="button" class="device-option" data-device="shared"><strong>Shared kitchen screen</strong><span>Used by the team. Locks after 10 minutes and signs out at 04:00.</span></button>' +
      '<p class="hint">On your own device, your Google sign-in stays remembered.</p><p class="hint" role="status" data-device-error></p></div>' +
      '<footer class="ux-picker-footer"><span class="hint">You can change this in Settings after signing in.</span>' + (changing ? '<button type="button" class="btn" data-device-cancel>Keep current setting</button>' : '<button type="button" class="btn" data-device-cancel>View recipes for now</button>') + '</footer>';
    dialog = d; document.body.appendChild(d); d.showModal();
    var historyClose = null, fromHistory = false;
    function finish() { if (dialog !== d) return; finishDialog = null; close(); if (historyClose) historyClose(fromHistory || location.hash !== openedHash); if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true }); }
    finishDialog = finish;
    function cancel() {
      finish();
      if (!changing) {
        var recipes = function () { if (location.hash !== '#/recipes') location.hash = '#/recipes'; };
        if (p && p.afterOverlay) p.afterOverlay(recipes); else recipes();
      }
    }
    var openedHash = location.hash;
    if (p && p.pickerOverlay) historyClose = p.pickerOverlay(function () { fromHistory = true; cancel(); });
    d.querySelector('[data-device-cancel]').addEventListener('click', cancel);
    d.addEventListener('cancel', function (e) { e.preventDefault(); cancel(); });
    d.addEventListener('click', function (e) {
      var button = e.target.closest('[data-device]'); if (!button) return;
      var value = button.dataset.device;
      if (changing) {
        if (value === mode()) { finish(); return; }
        change(value, { dialog: d, finish: finish }); return;
      }
      if (choose(value)) finish();
      else d.querySelector('[data-device-error]').textContent = 'This browser could not remember the choice. Allow site storage, then try again.';
    });
    d.querySelector('[data-device]').focus();
  }
  function confirmDiscard(reuse) {
    return new Promise(function (resolve) {
      // Keep the existing picker history entry when its next step asks about a draft. Popping one overlay and
      // pushing another in the same turn lets the queued Back consume the new confirmation's history entry.
      var d = reuse ? reuse.dialog : document.createElement('dialog'); d.className = 'ux-picker'; d.id = 'lk-device-discard';
      d.setAttribute('aria-labelledby', 'lk-device-discard-title');
      d.removeAttribute('aria-describedby');
      d.innerHTML = '<header class="ux-picker-head"><h2 id="lk-device-discard-title">Unsaved changes</h2></header><div class="ux-picker-options"><p class="hint">Changing this device signs you out. Your unsaved changes will be discarded.</p></div><footer class="ux-picker-footer"><button class="btn" type="button" data-keep>Keep working</button><button class="btn dark" type="button" data-discard>Discard and continue</button></footer>';
      if (!reuse) { document.body.appendChild(d); d.showModal(); }
      var finishHistory = null, fromHistory = false, settled = false;
      function finish(yes) { if (settled) return; settled = true; if (reuse) reuse.finish(); else { d.close(); d.remove(); if (finishHistory) finishHistory(fromHistory); } resolve(yes); }
      if (!reuse && window.LK_PREP && window.LK_PREP.pickerOverlay) finishHistory = window.LK_PREP.pickerOverlay(function () { fromHistory = true; finish(false); });
      d.querySelector('[data-keep]').addEventListener('click', function () { finish(false); });
      d.querySelector('[data-discard]').addEventListener('click', function () { finish(true); });
      d.addEventListener('cancel', function (e) { e.preventDefault(); finish(false); });
      d.addEventListener('close', function () { finish(false); });
      d.querySelector('[data-keep]').focus();
    });
  }
  function change(value, reuse) {
    var p = window.LK_PREP;
    if (!p || !p.canChangeDevice || !p.canChangeDevice()) return;
    // Unsent work never has a discard path. The auth layer rechecks this before changing anything.
    if (p.unsent && p.unsent()) { if (reuse) reuse.finish(); p.changeDevice(value, false); return; }
    var dirty = p.dirtyForUpdate && p.dirtyForUpdate();
    if (!dirty && reuse) reuse.finish();
    (dirty ? confirmDiscard(reuse) : Promise.resolve(true)).then(function (yes) { if (yes) p.changeDevice(value, !!dirty); });
  }
  window.LK_DEVICE = {
    mode: mode, ownerId: ownerId, classified: function () { return !!read(); }, choose: choose, verify: verify, reset: reset,
    request: function () {
      if (read()) return;
      // Deferred scripts run while readyState is interactive. Wait for the Prep overlay API before opening the
      // first prompt, so the browser's Back dismisses it instead of leaving a directly opened kitchen route.
      if (!window.LK_PREP && document.readyState !== 'complete') { document.addEventListener('DOMContentLoaded', function () { window.LK_DEVICE.request(); }, { once: true }); return; }
      var open = function () { if (!read()) picker(false); };
      if (window.LK_PREP && window.LK_PREP.afterOverlay) window.LK_PREP.afterOverlay(open); else open();
    },
    settings: function () {
      if (!read()) { window.LK_DEVICE.request(); return; }
      var p = window.LK_PREP, open = function () { if (p && p.canChangeDevice && p.canChangeDevice()) picker(true); };
      if (p && p.afterOverlay) p.afterOverlay(open); else open();
    },
    forget: function () { change('forget'); }
  };
  window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) { if (read() && finishDialog) finishDialog(); emit(); } });
  function start() { if (!requested && !read()) { requested = true; window.LK_DEVICE.request(); } }
  if (document.readyState !== 'complete') document.addEventListener('DOMContentLoaded', start, { once: true }); else setTimeout(start, 0);
}());
