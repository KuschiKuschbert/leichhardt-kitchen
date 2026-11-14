/* Roster import design previews A, B and C. Fictional people and a fictional roster (roster-data.js, made-up names,
   wages already wiped). Memory only; never connects to the kitchen. Schematic: the real page has more above the fold. */
(function () {
  'use strict';
  var design = document.body.dataset.design, root = document.getElementById('preview');
  var DAYS = ['Monday 16 November', 'Tuesday 17 November', 'Wednesday 18 November', 'Thursday 19 November', 'Friday 20 November', 'Saturday 21 November', 'Sunday 22 November'];
  var SHORT = ['Mon 16 Nov', 'Tue 17 Nov', 'Wed 18 Nov', 'Thu 19 Nov', 'Fri 20 Nov', 'Sat 21 Nov', 'Sun 22 Nov'];
  var SV = { L: 'Lunch', A: 'All day dining', D: 'Dinner' };
  var BOOK = ['Gus', 'Sam K', 'Ann', 'Bo', 'Cal', 'Dev', 'Eli', 'Fran'];
  var USUAL = { Gus: 'Pass', 'Sam K': 'Grill', Ann: 'Larder', Bo: 'Pans', Cal: 'Grill', Dev: 'Pans', Eli: 'Larder', Fran: 'Pans' };
  var TODAY = 1, PLANNED = 2;
  var st = { phase: 'start', fold: false, sel: TODAY, saved: {}, saving: {}, open: {}, fill: {}, bad: false };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Head chef rule: given name; two roster people with the same given name get the family initial. Exact match only.
  function bookName(p) {
    var parts = p.full.split(' '), given = parts[0];
    var twins = ROSTER.filter(function (q) { return q.full.split(' ')[0] === given; }).length > 1;
    var want = twins ? given + ' ' + parts[parts.length - 1][0] : given;
    return BOOK.indexOf(want) >= 0 && parts.length === 2 ? want : '';
  }
  var unmatched = ROSTER.filter(function (p) { return !bookName(p); }).map(function (p) { return p.full; });
  function kind(d) { return d < TODAY ? 'past' : d === PLANNED ? 'planned' : 'fill'; }
  function onDay(d) { return ROSTER.filter(function (p) { return p.shifts[d] && bookName(p); }).map(function (p) { return { name: bookName(p), time: p.shifts[d][0], sv: p.shifts[d][1] }; }); }
  function filled(d) { return kind(d) === 'fill' && (st.phase === 'read' && (design !== 'b' || st.fill[d])); }
  function status(d) {
    if (kind(d) === 'past') return ['is-skip', 'Past, not changed'];
    if (kind(d) === 'planned') return ['is-skip', 'Already planned, not changed'];
    if (st.saved[d]) return ['is-saved', 'Saved 10:02'];
    if (st.saving[d]) return ['is-draft', 'Saving...'];
    if (filled(d)) return ['is-draft', 'Filled, not saved'];
    return ['is-skip', st.phase === 'read' ? 'Not filled' : 'No plan yet'];
  }
  function counts(d) { var c = { L: 0, A: 0, D: 0 }; onDay(d).forEach(function (r) { r.sv.forEach(function (s) { c[s]++; }); }); return onDay(d).length + ' on · Lunch ' + c.L + ' · All day dining ' + c.A + ' · Dinner ' + c.D; }
  function rowsHTML(d, withSec) {
    return '<ul class="ri-rows">' + onDay(d).map(function (r) {
      return '<li><b>' + esc(r.name) + '</b>' + (withSec ? '<span class="ri-sec">' + esc(USUAL[r.name] || 'No section') + '</span>' : '') + '<small>Roster ' + esc(r.time.replace('-', ' to ')) + ' · ' + r.sv.map(function (s) { return SV[s]; }).join(', ') + '</small></li>';
    }).join('') + '</ul>';
  }
  function btn(act, text, cls, extra) { return '<button type="button" class="ri-btn ' + (cls || '') + '" data-a="' + act + '" ' + (extra || '') + '>' + text + '</button>'; }
  function unmatchedCard() {
    return '<div class="ri-card"><h3>Not in the book, not filled</h3><ul class="ri-rows ri-unmatched">' + unmatched.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul><p>Add or pair them in Manage staff, then choose the file again.</p>' + btn('staff', 'Manage staff', 'ri-small') + '</div>';
  }
  function badCard() {
    return '<div class="ri-card ri-bad" role="alert"><h3>This file does not check out. Nothing was filled.</h3><p>Line 4 has a shift on a day the report does not name.</p><p>Export the Weekly Department Roster Report from Humanforce again as CSV and choose it.</p></div>';
  }
  function dayList(withActs) {
    return '<ul class="ri-days">' + DAYS.map(function (_, d) {
      var s = status(d), acts = '';
      if (withActs && filled(d)) acts = '<div class="ri-acts">' + btn('open', st.open[d] ? 'Close' : 'Open', 'ri-small', 'data-d="' + d + '" aria-expanded="' + !!st.open[d] + '"') + (st.saved[d] ? '<span class="ri-stamp">Saved 10:02</span>' : btn('save', st.saving[d] ? 'Saving...' : 'Save ' + SHORT[d], 'ri-small ri-main', 'data-d="' + d + '"' + (st.saving[d] ? ' disabled' : ''))) + '</div>' + (st.open[d] ? rowsHTML(d, true) : '');
      return '<li><span class="ri-day">' + SHORT[d] + '</span><span class="ri-st ' + s[0] + '">' + s[1] + '</span>' + (filled(d) || st.saved[d] ? '<small>' + counts(d) + '</small>' : '') + acts + '</li>';
    }).join('') + '</ul>';
  }
  function review() {
    var n = 0; DAYS.forEach(function (_, d) { if (st.fill[d]) n++; });
    return '<div class="ri-review"><p class="ri-note">Roster 16 to 22 November checked. Wages wiped before reading. Tick the days to fill.</p>' + unmatchedCard() + DAYS.map(function (_, d) {
      var k = kind(d), why = k === 'past' ? 'Past, not changed' : k === 'planned' ? 'Already planned, not changed' : '';
      return '<details' + (d === 3 ? ' open' : '') + '><summary><b>' + SHORT[d] + '</b> <span>' + onDay(d).length + ' on</span>' + (why ? '<span class="ri-st is-skip" style="margin-left:auto">' + why + '</span>' : '<label><input type="checkbox" data-a="tick" data-d="' + d + '"' + (st.fill[d] ? ' checked' : '') + '> Fill</label>') + '</summary>' + rowsHTML(d, false) + '</details>';
    }).join('') + '<p style="margin-top:10px">' + btn('fill', 'Fill ' + n + ' day' + (n === 1 ? '' : 's') + ', not saved', 'ri-main', n ? '' : 'disabled') + '</p></div>';
  }
  function rosterTool() {
    var t = '<div class="ri-tool"><b>Fill from roster file</b><p>Fills empty days from today on with the Humanforce roster (CSV). Wages are wiped first. Check, then Save each day.</p>' + btn('choose', 'Choose roster file') + '</div>';
    if (st.bad) return t + badCard();
    if (st.phase === 'start') return t;
    if (design === 'b' && st.phase === 'review') return review();
    var head = '<p class="ri-note">Roster 16 to 22 November read. Wages wiped before reading.</p>';
    if (design === 'a') return head + '<div class="ri-card"><h3>Filled ' + DAYS.filter(function (_, d) { return filled(d); }).length + ' days, not saved</h3>' + dayList(false) + '<p>Open each day with the date at the top and Save it.</p></div>' + unmatchedCard();
    if (design === 'b') return head + '<div class="ri-card"><h3>Filled, not saved</h3>' + dayList(false) + '<p>Open each day with the date at the top and Save it.</p></div>' + unmatchedCard();
    return head + '<div class="ri-card"><h3>This week from the roster</h3>' + dayList(true) + '</div>' + unmatchedCard();
  }
  function render() {
    var s = status(st.sel), dirty = filled(st.sel) && !st.saved[st.sel];
    var sel = '<label class="visually-hidden" for="ri-date">Day</label><select id="ri-date" data-a="date" class="ri-btn" style="flex:1">' + DAYS.map(function (n, d) { return '<option value="' + d + '"' + (d === st.sel ? ' selected' : '') + '>' + n + ' · ' + status(d)[1] + '</option>'; }).join('') + '</select>';
    var work = filled(st.sel) || st.saved[st.sel] ? rowsHTML(st.sel, true) : st.sel === PLANNED ? '<p class="ri-note">Saved plan from earlier this week (not changed by the roster).</p>' : '<p class="ri-note">Nobody on this day yet.</p>';
    root.innerHTML = '<div class="ri-controls"><a href="index.html">All designs</a> · Design ' + design.toUpperCase() + ' · <button type="button" data-a="reset">Start again</button> <button type="button" data-a="bad">Try a file that does not check out</button></div>' +
      '<div class="ri-frame"><div class="ri-bar"><b>KB</b><small>DESIGN ' + design.toUpperCase() + ' · PREVIEW</small></div>' +
      '<div class="ri-book"><div class="ri-head"><h1>Today\'s team</h1><p>' + esc(DAYS[st.sel]) + ' · ' + esc(s[1]) + '</p></div>' +
      '<div class="ri-pad"><div class="ri-date">' + sel + '</div>' + work + '</div>' +
      '<details class="ri-fold"' + (st.fold ? ' open' : '') + '><summary data-a="fold">Copy a day or spread breaks</summary><div class="ri-fold-body"><div class="ri-tool"><b>Copy last Tuesday</b><p>Fills this empty day with last week\'s shifts, sections and breaks. Check, then Save.</p>' + btn('noop', 'Use it', '', 'disabled') + '</div>' + rosterTool() + '</div></details>' +
      '<div class="ri-save"><p>' + esc(s[1]) + '</p>' + (st.saved[st.sel] ? '<span class="ri-stamp">Saved 10:02</span>' : btn('save', st.saving[st.sel] ? 'Saving...' : 'Save ' + DAYS[st.sel], 'ri-main', 'data-d="' + st.sel + '"' + (dirty && !st.saving[st.sel] ? '' : ' disabled'))) + '</div></div></div>' +
      '<nav class="ri-tabs" aria-hidden="true"><span>RECIPES</span><span>PREP</span><span>ORDERS</span><span>WASTAGE</span><span>TRANSFERS</span></nav>';
  }
  function save(d) { st.saving[d] = true; render(); setTimeout(function () { st.saving[d] = false; st.saved[d] = true; render(); }, 600); }
  root.addEventListener('click', function (e) {
    var el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
    var a = el.dataset.a, d = Number(el.dataset.d);
    if (a === 'fold') { e.preventDefault(); st.fold = !st.fold; }
    else if (a === 'choose') { st.bad = false; st.phase = design === 'b' ? 'review' : 'read'; if (design === 'b') DAYS.forEach(function (_, i) { st.fill[i] = kind(i) === 'fill'; }); }
    else if (a === 'bad') { st = { phase: 'start', fold: true, sel: TODAY, saved: {}, saving: {}, open: {}, fill: {}, bad: true }; }
    else if (a === 'reset') { st = { phase: 'start', fold: false, sel: TODAY, saved: {}, saving: {}, open: {}, fill: {}, bad: false }; }
    else if (a === 'fill') { st.phase = 'read'; }
    else if (a === 'open') { st.open[d] = !st.open[d]; }
    else if (a === 'save') { save(d); return; }
    else if (a === 'tick') { st.fill[d] = el.checked; }
    else return;
    render();
  });
  root.addEventListener('change', function (e) { if (e.target.dataset.a === 'date') { st.sel = Number(e.target.value); render(); } });
  window.__ri = { state: function () { return st; } };
  render();
})();
