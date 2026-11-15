/* Shared preview frame for the section designs (docs/team-sections-options/brief.md). Made-up data in memory only:
   no Firebase, no network, no storage. URL options: ?fx=double (two services, doubles often on another section, as the
   head chef described the real day on 10 Nov 2026), ?long=1 (long name and section names), ?team=1 (a sous chef on
   #/team, no admin header), ?fail=1 (Save is refused), ?hold=1 (Save waits until window.__release()). */
(function () {
  var q = new URLSearchParams(location.search), D = window.TS_DATA;
  var fx = q.get('fx') || 'three';
  var services = D.services.slice(), sections = D.sections.slice(), people = D.people.map(function (p) { return Object.assign({}, p, { on: p.on.slice() }); });
  var want = JSON.parse(JSON.stringify(D.want));
  if (fx === 'double') {
    // Lunch 10:00 to 15:00, then Dinner 15:00 to 21:00 (head chef, docs/home-staff-first.md), doubles often move
    services = [{ id: 'lunch', name: 'Lunch', short: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', short: 'Dinner', from: 900, to: 1260 }];
    people = [
      { id: 'ari', name: 'Ari', roster: [600, 1260], on: ['lunch', 'dinner'] }, { id: 'bea', name: 'Bea', roster: [600, 1260], on: ['lunch', 'dinner'] },
      { id: 'cal', name: 'Cal', roster: [600, 900], on: ['lunch'] }, { id: 'dev', name: 'Dev', roster: [600, 1260], on: ['lunch', 'dinner'] },
      { id: 'eli', name: 'Eli', roster: [600, 1260], on: ['lunch', 'dinner'] }, { id: 'fen', name: 'Fen', roster: [900, 1260], on: ['dinner'] },
      { id: 'gia', name: 'Gia', roster: [600, 1260], on: ['lunch', 'dinner'] }, { id: 'hal', name: 'Hal', roster: [600, 1260], on: ['lunch', 'dinner'] }
    ];
    want = { ari: { lunch: 'grill', dinner: 'pans' }, bea: { lunch: 'pans', dinner: 'grill' }, cal: { lunch: 'dessert' }, dev: { lunch: 'fryer', dinner: 'fryer' },
      eli: { lunch: 'larder', dinner: 'pass' }, fen: { dinner: 'dessert' }, gia: { lunch: 'pass', dinner: 'larder' }, hal: { lunch: 'larder', dinner: 'fryer' } };
  }
  // ?chefs=1 puts the head chef and a sous chef on the day: their empty section reads Head chef or Sous chef, as in the app
  if (q.get('chefs')) people = [{ id: 'gus', name: 'Gus', chef: 'Head chef', roster: [600, 1260], on: services.map(function (s) { return s.id; }) }, { id: 'sam', name: 'Sam K', chef: 'Sous chef', roster: [900, 1260], on: services.slice(-1).map(function (s) { return s.id; }) }].concat(people);
  if (q.get('long')) { people = people.concat(D.longPeople.map(function (p) { return Object.assign({}, p, { on: services.map(function (s) { return s.id; }) }); })); sections = sections.concat(D.longSections); }
  var on = {};
  people.forEach(function (p) { on[p.id] = {}; p.on.forEach(function (sh) { on[p.id][sh] = ''; }); });
  var snap = JSON.stringify(on), saved = JSON.parse(snap), st = '', said = '', savedAt = '', stamp = '';
  var TS = window.TS = {
    q: q, fx: fx, services: services, sections: sections, people: people, want: want, on: on, hhmm: D.hhmm, date: D.date,
    svc: function (id) { return services.filter(function (s) { return s.id === id; })[0]; },
    sec: function (id) { var s = sections.filter(function (x) { return x.id === id; })[0]; return s ? s.name : ''; },
    works: function (pid) { return services.filter(function (s) { return on[pid] && on[pid][s.id] !== undefined; }); },
    hours: function (p) { return 'Roster ' + D.hhmm(p.roster[0]) + ' to ' + D.hhmm(p.roster[1]); },
    dirty: function () { return JSON.stringify(on) !== snap; },
    busy: function () { return st === 'busy'; },
    missing: function () {
      var out = [];
      people.forEach(function (p) { if (p.chef) return; TS.works(p.id).forEach(function (s) { if (!on[p.id][s.id]) out.push(p.name + ' ' + s.name); }); });
      return out;
    },
    redraw: null,
    set: function (pid, sh, sec) { on[pid][sh] = sec; if (st === 'done' || st === 'fail') { st = ''; said = ''; } },
    // the shared picker frame: open (1 tap) then choose (1 tap)
    pick: function (title, opts, cur, done) {
      // focus goes back to the control that opened the picker; a tap within 350 ms of opening is ignored (a double tap
      // must not choose the option that appeared under the finger); Escape closes without a change
      var opener = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-focus'), opened = Date.now();
      var back = document.createElement('div'); back.className = 'ts-sheet-back';
      var shut = function () { back.remove(); TS.closedAt = Date.now(); var o = opener && document.querySelector('[data-focus="' + opener + '"]'); if (o) o.focus({ preventScroll: true }); };
      back.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
      back.innerHTML = '<div class="ts-sheet" role="dialog" aria-label="' + title + '"><h3>' + title + '</h3>' + opts.map(function (o, i) { return '<button type="button" data-i="' + i + '" aria-selected="' + (String(o[0]) === String(cur)) + '">' + o[1] + '</button>'; }).join('') + '</div>';
      back.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-i]');
        if (Date.now() - opened < 350) { e.stopPropagation(); return; }
        if (b) { TS.closedXY = [e.clientX, e.clientY]; back.remove(); done(opts[+b.getAttribute('data-i')][0]); TS.redraw(); shut(); return; }
        if (e.target === back) shut();
      });
      document.body.appendChild(back);
      var sel = back.querySelector('[aria-selected="true"]') || back.querySelector('button'); if (sel) sel.focus();
    },
    // Breaks stay in one named details panel (C contract). It now chooses its own service with chips, starting on
    // the service on now or next at 13:00 (Lunch), so no row needs a Service to edit switch.
    focus: null,
    bench: function () {
      var f = TS.focus; if (!f) return '';
      var p = people.filter(function (x) { return x.id === f.pid; })[0], s = TS.svc(f.sh), worked = on[p.id][s.id] !== undefined;
      return '<aside class="ts-bench" aria-label="Break details for ' + p.name + ' on ' + s.name + '"><header><b>' + p.name + ' · ' + s.name + '</b><span>' + D.date + ' · Draft</span></header>' +
        '<div class="ts-chips" role="group" aria-label="Service">' + services.map(function (x) { var w = on[p.id][x.id] !== undefined; return '<button type="button" class="ts-chip" data-a="bench-sh" data-sh="' + x.id + '" aria-pressed="' + (x.id === s.id) + '">' + x.name + (w ? '' : ' (off)') + '</button>'; }).join('') + '</div>' +
        (worked ? '<p class="ts-note">Break not set. <button type="button" class="ts-btn" data-a="noop">+ Break</button></p><p><button type="button" class="ts-link" data-a="noop">Remove ' + s.name + ' and its breaks</button></p>' : '<p class="ts-note">Not on ' + s.name + '. <button type="button" class="ts-btn" data-a="noop">Add ' + s.name + '</button></p>') +
        '<p><button type="button" class="ts-link" data-a="bench-close">Close details</button></p></aside>';
    },
    benchClick: function (b) {
      var a = b.getAttribute('data-a');
      if (a === 'bench-open') {
        // the service on now, else the next one to start, else the last (?at=1080 tries 18:00; 13:00 by default)
        var pid = b.getAttribute('data-id'), w = TS.works(pid), m = +(q.get('at') || 780);
        var now = w.filter(function (s) { return s.from <= m && m < s.to; })[0] || w.filter(function (s) { return s.from > m; })[0] || w[w.length - 1];
        TS.focus = TS.focus && TS.focus.pid === pid ? null : { pid: pid, sh: now ? now.id : services[0].id }; TS.redraw(); return true; }
      if (a === 'bench-sh') { TS.focus.sh = b.getAttribute('data-sh'); TS.redraw(); return true; }
      if (a === 'bench-close') { TS.focus = null; TS.redraw(); return true; }
      return false;
    },
    secOpts: function (none) { return [['', none || 'No section']].concat(sections.map(function (s) { return [s.id, s.name]; })); },
    save: function () {
      if (!TS.dirty() || st === 'busy') return;
      st = 'busy'; said = ''; TS.redraw();
      var finish = function () {
        if (q.get('fail')) { st = 'fail'; said = 'Not saved. The plan for ' + D.date + ' is kept on this phone. Try again.'; TS.redraw(); return; }
        st = 'done'; snap = JSON.stringify(on); saved = JSON.parse(snap); savedAt = '13:05';
        var miss = TS.missing();
        said = 'Saved ' + D.date + ' at 13:05. The team sees it on Home.' + (miss.length ? ' Still no section: ' + miss.join(', ') + '.' : ' Everyone has a section.');
        TS.redraw();
      };
      if (q.get('hold')) window.__release = finish; else setTimeout(finish, 500);
    },
    saveHTML: function () {
      var dirty = TS.dirty(), status = st === 'busy' ? 'Saving...' : st === 'fail' ? 'Not saved. Changes kept.' : dirty ? 'Unsaved changes' : savedAt ? 'Saved ' + savedAt + ' · Gus' : 'Saved 13:00 · Gus';
      return '<div class="ts-save"><p class="' + (st === 'fail' ? 'is-fail' : dirty ? 'is-dirty' : '') + '" role="status">' + status + '</p>' +
        '<button type="button" class="ts-btn" data-a="save"' + (!dirty || st === 'busy' ? ' disabled' : '') + '>' + (st === 'busy' ? 'Saving...' : st === 'done' && !dirty ? '<span class="ts-stamp">✓ Saved</span>' : st === 'fail' ? 'Try again: Save ' + D.date : 'Save ' + D.date) + '</button>' +
        (said ? '<p class="ts-said" role="' + (st === 'fail' ? 'alert' : 'status') + '">' + said + '</p>' : '') + '</div>';
    },
    shell: function (title, inner) {
      var team = !!q.get('team');
      document.body.className = 'ts' + (team ? ' ts-team' : '') + (q.get('shot') ? ' ts-shot' : '');
      return '<header class="ts-top"><b>KB</b><span><i></i><i></i><i></i><i></i></span></header><main class="ts-shell">' +
        '<div class="ts-adminonly"><p class="ts-google">Google account: <b>headchef@example.test</b></p><div class="ts-rooms"><b>Today</b><b>Reports</b><b class="on">Team</b><b>Kitchen</b><b>Prep</b></div>' +
        '<p class="ts-kicker">KITCHEN ADMINISTRATION</p><h1 class="ts-h1">Team</h1><div class="ts-subtabs"><b>People</b><b class="on">Today\'s team</b></div></div>' +
        '<section class="ts-book" aria-label="Today\'s team"><header class="ts-bhead"><h2>Today\'s team</h2><p>Saved 13:00 · Gus <u>Refresh</u></p></header><div class="ts-pad">' +
        '<div class="ts-daterow"><span class="ts-pill">' + D.date + ' ▾</span><span class="ts-pill">Today</span></div>' +
        '<div class="ts-toolrow"><button type="button" class="ts-btn" data-a="noop">Add staff</button><input type="search" placeholder="Find a person" aria-label="Find a person"></div>' +
        inner + '</div>' + TS.saveHTML() + '</section></main><nav class="ts-tabbar" aria-label="Pages"><span>RECIPES</span><span>PREP</span><span>ORDERS</span><span>WASTAGE</span><span>TRANSFERS</span><span>CLEANING</span></nav>' +
        '<div class="ts-design-switch">Preview: <a href="a.html' + location.search + '">A</a><a href="b.html' + location.search + '">B</a><a href="c.html' + location.search + '">C</a><a href="mix.html' + location.search + '">Mix</a></div>';
    },
    mount: function (draw) {
      var root = document.getElementById('ts');
      TS.redraw = function () {
        var f = document.activeElement, key = f && f.getAttribute && f.getAttribute('data-focus');
        root.innerHTML = draw();
        if (key) { var again = root.querySelector('[data-focus="' + key + '"]'); if (again) again.focus({ preventScroll: true }); }
      };
      // every tap on a control inside the preview is counted for the measured task paths
      window.__taps = 0;
      // the second half of a double tap on a picker option must not open the picker of the cell underneath
      document.addEventListener('click', function (e) { var xy = TS.closedXY; if (e.target.closest('[data-a="pick"]') && Date.now() - (TS.closedAt || 0) < 350 && xy && Math.abs(e.clientX - xy[0]) < 40 && Math.abs(e.clientY - xy[1]) < 40) { e.stopPropagation(); e.preventDefault(); } }, true);
      document.addEventListener('click', function (e) { if (e.target.closest('button, a, summary, input')) window.__taps++; }, true);
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return;
        if (b.getAttribute('data-a') === 'save') TS.save(); else TS.benchClick(b);
      });
      TS.redraw();
    }
  };
})();
