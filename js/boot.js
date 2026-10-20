/* Runs in <head> before anything draws (moved out of index.html for the security header, 20 Oct 2026). */
// Catch the browser's install offer the moment it arrives, before the app scripts load.
// Chrome only lets the page open its install box after preventDefault() has been called on the event.
window.lkInstall = null;
window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.lkInstall = e; window.dispatchEvent(new Event('lk-install')); });
window.addEventListener('appinstalled', function () { window.lkInstall = null; });
// Apply the saved text size before the page draws, so nothing jumps.
try { var s = JSON.parse(localStorage.getItem('lk.settings.v1') || '{}'); if (s.text) document.documentElement.setAttribute('data-text', s.text); } catch (e) {}
// One clock for the whole book: the server's time, in kitchen time (Queensland, UTC+10, no daylight saving).
// A phone's own clock can be minutes or hours out, or set to another zone. The update check further down asks the site
// for its headers anyway; their Date is the server's time, so the book keeps the gap (lk.clock.gap) and adds it.
// now() is the time to save on a line and to compare with saved times. Time passing on this phone (a timer, a lock,
// "30 minutes away") still uses Date.now(). day, hour, mins, dow and clock read a time in kitchen time.
// ready() turns true once this visit has asked the server (or after 10 s without an answer); the prep pages wait for it
// before rolling lines onto today, so a phone with the wrong date never rolls them onto the wrong day.
window.LK_TIME = (function () {
  var ZONE = 10 * 3600000, gap = 0, checked = false;
  try { gap = +localStorage.getItem('lk.clock.gap') || 0; } catch (e) {}
  function now() { return Date.now() + gap; }
  function done(changed) { var first = !checked; checked = true; if (first || changed) window.dispatchEvent(new Event('lk-clock')); }
  setTimeout(function () { if (!checked) done(false); }, 10000);
  function k(ms) { return new Date((ms == null ? now() : ms) + ZONE); }   // read with the getUTC... methods
  function p(n) { return (n < 10 ? '0' : '') + n; }
  return {
    now: now,
    gap: function () { return gap; },
    ready: function () { return checked; },
    day: function (ms) { var d = k(ms); return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()); },
    hour: function (ms) { return k(ms).getUTCHours(); },
    mins: function (ms) { var d = k(ms); return d.getUTCHours() * 60 + d.getUTCMinutes(); },
    dow: function (ms) { return k(ms).getUTCDay(); },
    clock: function (ms) { var d = k(ms); return p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); },
    // a kitchen date (YYYY-MM-DD) and minutes after midnight, as a time
    at: function (ymd, min) { var a = ymd.split('-'); return Date.UTC(+a[0], a[1] - 1, +a[2]) - ZONE + (min || 0) * 60000; },
    // learn the gap from a server answer, sent at t0 and back at t1 (phone time). Date is whole seconds, so add half a second.
    // With no answer (no signal) the saved gap stays. lk-clock tells the pages to draw again.
    learn: function (r, t0, t1) {
      var s = Date.parse((r && r.headers && r.headers.get('date')) || '');
      if (!isFinite(s) || t1 - t0 > 5000) return done(false);
      var g = Math.round(s + 500 - (t0 + t1) / 2);
      if (Math.abs(g - gap) < 1500) return done(false);
      var jump = Math.abs(g - gap) > 60000;
      gap = g;
      try { localStorage.setItem('lk.clock.gap', String(g)); } catch (e) {}
      done(jump);
    }
  };
})();
