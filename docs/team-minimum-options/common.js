/* Shared preview frame for the minimum designs (docs/team-minimum-options/brief.md). Made-up data in memory only: no
   Firebase, no network, no storage. It draws the admin panel shell, Today's team as built on 15 Nov 2026 (the On break
   now board from the saved plan, the day grid, one Breaks details panel, one dated Save) and the admin Kitchen rows.
   URL options: ?team=1 (a sous chef on #/team, no admin header), ?page=kitchen (Admin, Kitchen, the setting),
   ?state=loading|error|unset (the saved plan not ready), ?quiet=1 (a quiet day: three on Dinner), ?nomin=1 (no
   minimum set), ?fail=1 (Save is refused), ?at=1110 (the kitchen clock in minutes, 18:30 by default),
   ?open=<id> (open that person's Breaks details), ?shot=1 (hide the design switch). */
(function () {
  var q = new URLSearchParams(location.search), D = window.TM_DATA, C = window.TM_CORE;
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  var people = D.people.slice(), on = clone(D.on), br = clone(D.br), mins = q.get('nomin') ? [] : clone(D.mins);
  if (q.get('quiet')) { on = on.filter(function (o) { return o.sh === 'lunch' || ['sam', 'dev', 'hal'].indexOf(o.id) >= 0; }); br = br.filter(function (b) { return ['sam', 'dev', 'hal', 'eli'].indexOf(b.id) >= 0; }); }
  var saved = { on: clone(on), br: clone(br) }, st = '', said = '', savedAt = '13:00', clock = +(q.get('at') || D.clock);
  var state = q.get('state') || 'ready';
  var LENS = [30, 45, 60, 90, 120, 150, 180];
  var TM = window.TM = {
    q: q, D: D, C: C, people: people, mins: mins, clock: clock, hhmm: D.hhmm, date: D.date, state: state, LENS: LENS,
    plan: function () { return { services: D.services, people: people, on: on, br: br, mins: mins }; },
    savedPlan: function () { return { services: D.services, people: people, on: saved.on, br: saved.br, mins: mins }; },
    person: function (id) { return people.filter(function (p) { return p.id === id; })[0]; },
    svc: function (id) { return D.services.filter(function (s) { return s.id === id; })[0]; },
    sec: function (id) { var s = D.sections.filter(function (x) { return x.id === id; })[0]; return s ? s.name : ''; },
    onSh: function (pid, sh) { return on.filter(function (o) { return o.id === pid && o.sh === sh; })[0]; },
    breaksOf: function (pid, plan) { return (plan || TM.plan()).br.filter(function (b) { return b.id === pid; }).sort(function (a, b) { return a.at - b.at; }); },
    dirty: function () { return JSON.stringify({ on: on, br: br }) !== JSON.stringify(saved); },
    busy: function () { return st === 'busy'; },
    brWords: function (b) { return (b.len >= 150 ? 'Split ' : 'Break ') + D.hhmm(b.at) + ' to ' + D.hhmm(b.at + b.len); },
    setBreak: function (pid, i, at, len) { var list = TM.breaksOf(pid); var b = list[i]; if (!b) return; if (at != null) b.at = at; if (len != null) b.len = len; if (st === 'done' || st === 'fail') { st = ''; said = ''; } },
    // the short spells: draft (what is being edited) or saved; null while the saved plan is not ready
    spells: function (which) { if (state !== 'ready') return null; return C.spells(which === 'saved' ? TM.savedPlan() : TM.plan(), mins); },
    spellWords: function (s, svcName) {
      return D.hhmm(s.from) + ' to ' + D.hhmm(s.to) + ': ' + TM.howMany(s) + ' on ' + svcName + ' and not on break. Need ' + s.w.n + '.';
    },
    // a short time's count in words: 4, or 4 to 5 when it changes inside the time
    howMany: function (s) { return s.low === s.high ? String(s.low) : s.low + ' to ' + s.high;
    },
    svcAt: function (m) { var s = D.services.filter(function (x) { return x.from <= m && m < x.to; })[0]; return s ? s.name : 'the plan'; },
    redraw: null, focus: q.get('open') ? { pid: q.get('open') } : null,
    // the shared picker frame: open (1 tap) then choose (1 tap)
    pick: function (title, opts, cur, done) {
      var opener = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-focus'), opened = Date.now();
      var back = document.createElement('div'); back.className = 'ts-sheet-back';
      var shut = function () { back.remove(); var o = opener && document.querySelector('[data-focus="' + opener + '"]'); if (o) o.focus({ preventScroll: true }); };
      back.addEventListener('keydown', function (e) { if (e.key === 'Escape') shut(); });
      back.innerHTML = '<div class="ts-sheet" role="dialog" aria-label="' + title + '"><h3>' + title + '</h3>' + opts.map(function (o, i) { return '<button type="button" data-i="' + i + '" aria-selected="' + (String(o[0]) === String(cur)) + '">' + o[1] + '</button>'; }).join('') + '</div>';
      back.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-i]');
        if (Date.now() - opened < 350) { e.stopPropagation(); return; }
        if (b) { back.remove(); done(opts[+b.getAttribute('data-i')][0]); TM.redraw(); shut(); return; }
        if (e.target === back) shut();
      });
      document.body.appendChild(back);
      var sel = back.querySelector('[aria-selected="true"]') || back.querySelector('button'); if (sel) sel.focus();
    },
    // a time chosen from the book's picker (15 minute steps, 24-hour), drawn as the picker's pill
    timeBtn: function (v, label) { return '<span class="ts-pick tk-time"><button type="button" data-a="noop" aria-label="' + label + ': ' + (v == null ? 'not set' : D.hhmm(v)) + '">' + (v == null ? 'Not set' : D.hhmm(v)) + '</button></span>'; },
    timeOpts: function (from, to) { var out = []; for (var m = from; m <= to; m += 15) out.push([m, D.hhmm(m)]); return out; },
    // The Breaks details panel, as built: the person, the service, each break with its own time and length pickers.
    // extra(p) is the design's own content inside the panel (A puts its warning here).
    bench: function (extra) {
      var f = TM.focus; if (!f) return '';
      var p = TM.person(f.pid), bs = TM.breaksOf(p.id), s = TM.svc(f.sh || (TM.onSh(p.id, 'dinner') ? 'dinner' : 'lunch'));
      return '<aside class="ts-bench" aria-label="Break details for ' + p.name + ' on ' + s.name + '"><header><b>' + p.name + ' · ' + s.name + '</b><span>' + D.date + ' · Draft</span></header>' +
        '<div class="ts-chips" role="group" aria-label="Service">' + D.services.map(function (x) { var w = TM.onSh(p.id, x.id); return '<button type="button" class="ts-chip" data-a="bench-sh" data-sh="' + x.id + '" aria-pressed="' + (x.id === s.id) + '">' + x.name + (w ? '' : ' (off)') + '</button>'; }).join('') + '</div>' +
        (bs.length ? bs.map(function (b, i) {
          return '<div class="tm-brow"><span class="ts-pick"><span>Break ' + (i + 1) + ' from</span><button type="button" data-a="br-at" data-i="' + i + '" data-focus="at:' + p.id + ':' + i + '"' + (TM.busy() ? ' disabled' : '') + '>' + D.hhmm(b.at) + '</button></span>' +
            '<span class="ts-pick"><span>For</span><button type="button" data-a="br-len" data-i="' + i + '" data-focus="len:' + p.id + ':' + i + '"' + (TM.busy() ? ' disabled' : '') + '>' + (b.len >= 150 ? 'Split ' + b.len / 60 + ' h' : b.len + ' min') + '</button></span><small>Back ' + D.hhmm(b.at + b.len) + '</small></div>';
        }).join('') : '<p class="ts-note">Break not set.</p>') +
        (extra ? extra(p, s) : '') +
        '<p class="tm-benchacts"><button type="button" class="ts-btn" data-a="noop">+ Break</button><button type="button" class="ts-link" data-a="bench-close">Close details</button></p></aside>';
    },
    benchClick: function (b) {
      var a = b.getAttribute('data-a');
      if (a === 'bench-open') { var pid = b.getAttribute('data-id'); TM.focus = TM.focus && TM.focus.pid === pid ? null : { pid: pid }; TM.redraw(); return true; }
      if (a === 'bench-sh') { TM.focus.sh = b.getAttribute('data-sh'); TM.redraw(); return true; }
      if (a === 'bench-close') { TM.focus = null; TM.redraw(); return true; }
      if (a === 'br-at' || a === 'br-len') {
        var i = +b.getAttribute('data-i'), p = TM.person(TM.focus.pid), cur = TM.breaksOf(p.id)[i];
        if (a === 'br-at') TM.pick('Break ' + (i + 1) + ' for ' + p.name + ' from', TM.timeOpts(600, 1230), cur.at, function (v) { TM.setBreak(p.id, i, +v); });
        else TM.pick('Break ' + (i + 1) + ' for ' + p.name, LENS.map(function (l) { return [l, l >= 150 ? 'Split ' + l / 60 + ' h' : l + ' min']; }), cur.len, function (v) { TM.setBreak(p.id, i, null, +v); });
        return true;
      }
      return false;
    },
    save: function () {
      if (!TM.dirty() || st === 'busy') return;
      st = 'busy'; said = ''; TM.redraw();
      var finish = function () {
        if (q.get('fail')) { st = 'fail'; said = 'Not saved. The plan for ' + D.date + ' is kept on this phone. Try again.'; TM.redraw(); return; }
        st = 'done'; saved = { on: clone(on), br: clone(br) }; savedAt = D.hhmm(clock);
        said = 'Saved ' + D.date + ' at ' + savedAt + '. The team sees the breaks on Home.'; TM.redraw();
      };
      if (q.get('hold')) window.__release = finish; else setTimeout(finish, 500);
    },
    // extraLine(): the design's own line in the Save dock (B puts its warning here)
    saveHTML: function (extraLine) {
      var dirty = TM.dirty(), status = st === 'busy' ? 'Saving...' : st === 'fail' ? 'Not saved. Changes kept.' : dirty ? 'Unsaved changes' : 'Saved ' + savedAt + ' · ' + (savedAt === '13:00' ? 'Gus' : 'Gus');
      return '<div class="ts-save"><p class="' + (st === 'fail' ? 'is-fail' : dirty ? 'is-dirty' : '') + '" role="status">' + status + '</p>' + (extraLine ? extraLine() : '') +
        '<button type="button" class="ts-btn" data-a="save"' + (!dirty || st === 'busy' ? ' disabled' : '') + '>' + (st === 'busy' ? 'Saving...' : st === 'done' && !dirty ? '<span class="ts-stamp">✓ Saved</span>' : st === 'fail' ? 'Try again: Save ' + D.date : 'Save ' + D.date) + '</button>' +
        (said ? '<p class="ts-said" role="' + (st === 'fail' ? 'alert' : 'status') + '">' + said + '</p>' : '') + '</div>';
    },
    // The On break now board, from the saved plan only, as built. extra(): the design's own line on the board.
    board: function (extra) {
      var head = '<div class="tm-bhead"><b>ON BREAK NOW</b><span>' + D.hhmm(clock) + '</span></div><p class="tm-bsrc">Today · Saved plan · All services</p>';
      if (state === 'loading') return '<aside class="tm-board">' + head + '<p class="tm-bempty">Checking the saved plan. Current scheduled status is not available yet.</p>' + (extra ? extra() : '') + '</aside>';
      if (state === 'error') return '<aside class="tm-board">' + head + '<p class="tm-bwarn">Could not check the latest saved plan. Try Refresh. Current scheduled status is unknown.</p>' + (extra ? extra() : '') + '</aside>';
      if (state === 'unset') return '<aside class="tm-board">' + head + '<p class="tm-bempty">No saved plan for today. Save today\'s team to publish the planned breaks.</p>' + (extra ? extra() : '') + '</aside>';
      var c = C.inAt(TM.savedPlan(), clock);
      return '<aside class="tm-board">' + head + (c.away.length ? c.away.map(function (a) { return '<div class="tm-brow2"><b>' + a.p.name + '</b> <small>' + (a.b.len >= 150 ? 'Split' : 'Meal break') + '</small> <em>Until ' + D.hhmm(a.b.at + a.b.len) + '</em></div>'; }).join('') : '<p class="tm-bempty">Nobody scheduled away now.</p>') + (extra ? extra() : '') + '</aside>';
    },
    grid: function (rowExtra, headExtra) {
      var shs = D.services;
      var head = '<li class="tx-ghead" aria-hidden="true"><span class="tx-who">Who</span>' + shs.map(function (s) {
        return '<span class="tx-sh"><b>' + s.name + '</b><small>' + D.hhmm(s.from) + ' to ' + D.hhmm(s.to) + '</small>' + (headExtra ? headExtra(s) : '<small class="tx-count">All have one</small>') + '</span>';
      }).join('') + '</li>';
      var rows = people.map(function (p) {
        var bs = TM.breaksOf(p.id), open = TM.focus && TM.focus.pid === p.id;
        var brk = bs.length ? bs.map(function (b) { return (b.len >= 150 ? 'Split ' : '') + D.hhmm(b.at); }).join(', ') : 'not set';
        return '<li class="tx-row" data-id="' + p.id + '"><div class="tx-who"><span class="ts-name">' + p.name + '</span><button type="button" class="tx-brk" data-a="bench-open" data-id="' + p.id + '" data-focus="brk:' + p.id + '" aria-expanded="' + !!open + '">Breaks <span>' + brk + '</span>' + (rowExtra ? rowExtra(p) : '') + '</button></div>' +
          shs.map(function (s) { var o = TM.onSh(p.id, s.id); return '<div class="tx-c">' + (o ? '<button type="button" class="tx-cell' + (o.sec ? '' : ' is-empty') + '" data-a="noop">' + (TM.sec(o.sec) || p.chef || 'No section') + '</button>' : '<span class="tx-off">Off</span>') + '</div>'; }).join('') +
          (open ? '<div class="tx-benchwrap">' + TM.benchHTML() + '</div>' : '') + '</li>';
      }).join('');
      return '<ul class="tx-grid tx-n' + shs.length + '" aria-label="Sections on ' + D.date + '">' + head + rows + '</ul>';
    },
    benchHTML: function () { return TM.bench(); },
    shell: function (inner, extraLine, boardExtra) {
      var team = !!q.get('team');
      document.body.className = 'ts' + (team ? ' ts-team' : '') + (q.get('shot') ? ' ts-shot' : '');
      return '<header class="ts-top"><b>KB</b><span><i></i><i></i><i></i><i></i></span></header><main class="ts-shell">' +
        '<div class="ts-adminonly"><p class="ts-google">Google account: <b>headchef@example.test</b></p><div class="ts-rooms"><b>Today</b><b>Reports</b><b class="on">Team</b><b>Kitchen</b><b>Prep</b></div>' +
        '<p class="ts-kicker">KITCHEN ADMINISTRATION</p><h1 class="ts-h1">Team</h1><div class="ts-subtabs"><b>People</b><b class="on">Today\'s team</b></div></div>' +
        '<section class="ts-book" aria-label="Today\'s team"><header class="ts-bhead"><h2>Today\'s team</h2><p>Saved ' + savedAt + ' · Gus <u>Refresh</u></p></header><div class="ts-pad">' +
        '<div class="ts-daterow"><span class="ts-pill">' + D.date + ' ▾</span><span class="ts-pill">Today</span></div>' + TM.board(boardExtra) +
        '<div class="ts-toolrow"><button type="button" class="ts-btn" data-a="noop">Add staff</button><input type="search" placeholder="Find a person" aria-label="Find a person"></div>' +
        inner + '<p class="tm-after"><button type="button" class="ts-pill" data-a="noop">Whole day review</button></p></div>' + TM.saveHTML(extraLine) + '</section></main><nav class="ts-tabbar" aria-label="Pages"><span>RECIPES</span><span>PREP</span><span>ORDERS</span><span>WASTAGE</span><span>TRANSFERS</span><span>CLEANING</span></nav>' +
        TM.switcher();
    },
    // Admin, Kitchen: the kitchen's settings rows. body(): the design's own setting (open), value: the row's summary
    kitchen: function (label, value, body, sub) {
      document.body.className = 'ts' + (q.get('shot') ? ' ts-shot' : '');
      var row = function (l, v, open, b) { return '<div class="tk-row"><button type="button" class="tk-btn" data-a="noop" aria-expanded="' + !!open + '"><span class="tk-l">' + l + '</span><span class="tk-v">' + v + '</span></button>' + (open ? '<div class="tk-body">' + b + '</div>' : '') + '</div>'; };
      return '<header class="ts-top"><b>KB</b><span><i></i><i></i><i></i><i></i></span></header><main class="ts-shell"><p class="ts-google">Google account: <b>headchef@example.test</b></p><div class="ts-rooms"><b>Today</b><b>Reports</b><b>Team</b><b class="on">Kitchen</b><b>Prep</b></div>' +
        '<p class="ts-kicker">KITCHEN ADMINISTRATION</p><h1 class="ts-h1">Kitchen</h1><p class="ts-note">Each row says what it is set to. Tap it to change it.</p><h3 class="tk-h">The kitchen</h3>' +
        row('Order cut-offs', '6 suppliers') + row('Kitchen sections', 'Grill, Pans, Larder, Fryer, Dessert, Pass') +
        (sub === 'shifts' ? row(label, value, true, body()) : row('Shifts', 'Lunch 10:00 to 15:00, Dinner 15:00 to 21:00') + row(label, value, true, body())) +
        row('Shift pings', 'Sound: Pass bell') + '</main>' + TM.switcher();
    },
    switcher: function () {
      var s = location.search.replace(/([?&])page=kitchen&?/, '$1').replace(/[?&]$/, '');
      var k = (s ? s + '&' : '?') + 'page=kitchen';
      return '<div class="ts-design-switch">Preview: <a href="a.html' + s + '">A</a><a href="b.html' + s + '">B</a><a href="c.html' + s + '">C</a> · <a href="' + location.pathname.split('/').pop() + k + '">Setting</a></div>';
    },
    mount: function (draw) {
      var root = document.getElementById('ts');
      TM.redraw = function () {
        var f = document.activeElement, key = f && f.getAttribute && f.getAttribute('data-focus');
        root.innerHTML = draw();
        if (key) { var again = root.querySelector('[data-focus="' + key + '"]'); if (again) again.focus({ preventScroll: true }); }
      };
      window.__taps = 0;
      document.addEventListener('click', function (e) { if (e.target.closest('button, a, summary, input')) window.__taps++; }, true);
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-a]'); if (!b) return;
        if (b.getAttribute('data-a') === 'save') TM.save(); else if (!TM.benchClick(b) && TM.click) TM.click(b);
      });
      TM.redraw();
    }
  };
})();
