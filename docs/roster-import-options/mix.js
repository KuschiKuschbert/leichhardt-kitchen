/* Combined preview (A + C's tap-a-day jump + B's unmatched-first order). Fictional people and roster (roster-data.js,
   made-up names, wages already wiped). Memory only; never connects to the kitchen. The page order follows the real
   Today's team page at 390 px: date, break board, Add staff, the day's rows, Whole day review, then the folds. */
(function () {
  'use strict';
  var root = document.getElementById('preview');
  var DAYS = ['Monday 16 November', 'Tuesday 17 November', 'Wednesday 18 November', 'Thursday 19 November', 'Friday 20 November', 'Saturday 21 November', 'Sunday 22 November'];
  var SHORT = ['Mon 16', 'Tue 17', 'Wed 18', 'Thu 19', 'Fri 20', 'Sat 21', 'Sun 22'];
  var DAY3 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var SV = { L: 'Lunch', A: 'All day dining', D: 'Dinner' };
  var BOOK = ['Gus', 'Sam K', 'Ann', 'Bo', 'Cal', 'Dev', 'Eli', 'Fran'];
  var USUAL = { Gus: 'Pass', 'Sam K': 'Grill', Ann: 'Larder', Bo: 'Pans', Cal: 'Grill', Dev: 'Pans', Eli: 'Larder', Fran: 'Pans' };
  var SAVED_BEFORE = 2; // Wednesday already has a saved plan in the book
  var TODAY = 'Friday 13 November';
  function fresh() { return { phase: 'start', fold: false, sel: -1, saved: {}, saving: {}, bad: false }; }
  var st = fresh();
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // Matched against the names already in the book: the given name, or the given name and the family initial.
  // Exactly one book name must fit; anything else is listed, never guessed.
  function bookName(p) {
    var parts = p.full.split(' '), given = parts[0], fam = parts[parts.length - 1];
    var fits = BOOK.filter(function (n) { return n === given || n === given + ' ' + fam[0]; });
    return fits.length === 1 ? fits[0] : '';
  }
  var unmatched = ROSTER.filter(function (p) { return !bookName(p); });
  function onDay(d) { return ROSTER.filter(function (p) { return p.shifts[d] && bookName(p); }).map(function (p) { return { name: bookName(p), time: p.shifts[d][0], sv: p.shifts[d][1] }; }); }
  function isDraft(d) { return st.phase === 'read' && d !== SAVED_BEFORE && !st.saved[d]; }
  // The week list's own words: Draft, Saved, Not set (js/prep.js tmPlan status)
  function word(d) { if (d < 0) return 'Not set'; if (d === SAVED_BEFORE || st.saved[d]) return 'Saved'; if (st.saving[d]) return 'Saving...'; return st.phase === 'read' ? 'Draft' : 'Not set'; }
  function time(t) { return t.replace('-', ' to '); }
  function rows(d) {
    if (d < 0) return '<p class="ri-note">Nobody on today yet.</p>';
    if (d === SAVED_BEFORE) return '<p class="ri-note">The saved plan from earlier this week. The roster did not change it.</p>';
    if (st.phase !== 'read' && !st.saved[d]) return '<p class="ri-note">Nobody on this day yet.</p>';
    return '<h2 class="mx-dh" id="mx-day" tabindex="-1">' + esc(DAYS[d]) + '</h2><ul class="ri-rows">' + onDay(d).map(function (r) {
      return '<li><b>' + esc(r.name) + '</b><span class="ri-sec">' + esc(USUAL[r.name]) + '</span><small>Roster ' + esc(time(r.time)) + ' · ' + r.sv.map(function (s) { return SV[s]; }).join(', ') + '</small></li>';
    }).join('') + '</ul>';
  }
  function result() {
    var drafts = [0, 1, 3, 4, 5, 6].filter(isDraft).length, saved = [0, 1, 3, 4, 5, 6].filter(function (d) { return st.saved[d]; }).length;
    var head = '<div class="ri-card"><h3>Roster 16 to 22 November</h3><p>' + (drafts ? drafts + ' day' + (drafts === 1 ? '' : 's') + ' filled as drafts, not saved yet.' : 'All filled days are saved.') + (saved ? ' ' + saved + ' saved.' : '') + '</p><p>Wednesday 18 November already had a saved plan. Not changed.</p><p>Breaks are not set on the filled days. Set them with Spread them below, then Save.</p></div>';
    var unm = '<div class="ri-card"><h3>Not in the book, not filled</h3><ul class="ri-rows mx-unm">' + unmatched.map(function (p) {
      return '<li>' + esc(p.full) + '<span>' + Object.keys(p.shifts).map(function (d) { return DAY3[d] + ' ' + time(p.shifts[d][0]); }).join(', ') + '</span></li>';
    }).join('') + '</ul><p>Add them in Manage staff. Then put them on these days with Add staff.</p><button type="button" class="btn" data-a="staff">Manage staff</button></div>';
    var days = '<p><b>Check each day, then Save it:</b></p><div class="mx-days" role="group" aria-label="Days from the roster">' + DAYS.map(function (_, d) {
      if (d === SAVED_BEFORE) return '<button type="button" disabled>' + SHORT[d] + ' <small>· not changed</small></button>';
      return '<button type="button" data-a="day" data-d="' + d + '"' + (d === st.sel ? ' aria-current="date"' : '') + '>' + SHORT[d] + ' <small>· ' + (st.saved[d] ? '&#10003; Saved' : 'Draft') + '</small></button>';
    }).join('') + '</div>';
    return head + unm + days;
  }
  function bad() { return '<div class="ri-card ri-bad" role="alert"><h3>This file cannot be used. Nothing was filled.</h3><p>The days in the file do not line up with the week it names.</p><p>Export the Weekly Department Roster Report from Humanforce again as CSV, then choose it here.</p></div>'; }
  function render() {
    var d = st.sel, name = d < 0 ? TODAY : DAYS[d], w = word(d), canSave = d >= 0 && isDraft(d) && !st.saving[d];
    root.innerHTML = '<div class="ri-controls"><a href="index.html">All designs</a> · Combined preview · <button type="button" data-a="reset">Start again</button> <button type="button" data-a="bad">Try a file that cannot be used</button></div>' +
      '<div class="ri-frame mx-frame"><div class="ri-bar"><b>KB</b><small>COMBINED · PREVIEW</small></div>' +
      '<div class="ri-book"><div class="ri-head"><h1>Today\'s team</h1><p>' + esc(name) + ' · ' + esc(w) + '</p></div><div class="ri-pad">' +
      '<label class="visually-hidden" for="mx-date">Day</label><select id="mx-date" class="mx-sel" data-a="date"><option value="-1"' + (d < 0 ? ' selected' : '') + '>' + TODAY + ' · Today · ' + word(-1) + '</option>' + DAYS.map(function (n, i) { return '<option value="' + i + '"' + (i === d ? ' selected' : '') + '>' + n + ' · ' + word(i) + '</option>'; }).join('') + '</select>' +
      '<div class="mx-board"><b>ON BREAK NOW</b> · Today · Saved plan<br>No saved plan for today.</div>' +
      '<div class="mx-tools"><button type="button" class="btn">Add staff</button><input aria-label="Find a person" placeholder="Find a person"></div>' + rows(d) +
      '<p><button type="button" class="btn">Whole day review</button></p>' +
      '<details class="mx-fold"' + (st.fold ? ' open' : '') + '><summary data-a="fold">Copy a day or spread breaks</summary>' +
      '<div class="ri-tool"><b>Copy last ' + esc(name.split(' ')[0]) + '</b><p>Fills this empty day with last week\'s shifts, sections and breaks. Check, then Save.</p><button type="button" class="btn" disabled>Use it</button></div>' +
      '<div class="ri-tool"><b>Fill from roster file</b><p>Fills empty days with the Humanforce roster (CSV). Money columns are wiped first. Check, then Save each day.</p><button type="button" class="btn" data-a="choose"' + (st.phase === 'checking' ? ' disabled' : '') + '>' + (st.phase === 'checking' ? 'Checking 16 to 22 November...' : 'Choose roster file') + '</button></div>' +
      (st.bad ? bad() : st.phase === 'read' ? result() : '') +
      '<div class="ri-tool"><b>Spread them</b><p>Breaks for one service, one or two at a time.</p><button type="button" class="btn" disabled>Spread breaks</button></div></details>' +
      '<details class="mx-fold"><summary>Next planned breaks today</summary></details></div></div>' +
      '<div class="mx-band"><p>' + esc(name) + ' · ' + esc(w) + '</p>' + (d >= 0 && st.saved[d] ? '<span class="ri-stamp">Saved 10:02</span> <span class="ri-note">' + esc(DAYS[d]) + ' is saved.</span>' : '<button type="button" class="btn dark" data-a="save"' + (canSave ? '' : ' disabled') + '>' + (st.saving[d] ? 'Saving...' : 'Save ' + esc(name)) + '</button>') + '</div></div>' +
      '<nav class="ri-tabs" aria-hidden="true"><span>RECIPES</span><span>PREP</span><span>ORDERS</span><span>WASTAGE</span><span>TRANSFERS</span></nav>';
  }
  root.addEventListener('click', function (e) {
    var el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
    var a = el.dataset.a;
    if (a === 'fold') { e.preventDefault(); st.fold = !st.fold; }
    else if (a === 'choose') { st.bad = false; st.phase = 'checking'; render(); setTimeout(function () { st.phase = 'read'; render(); }, 500); return; }
    else if (a === 'bad') { st = fresh(); st.fold = true; st.bad = true; }
    else if (a === 'reset') { st = fresh(); }
    else if (a === 'day') { st.sel = Number(el.dataset.d); render(); var h = document.getElementById('mx-day'); if (h) { h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -56); h.focus({ preventScroll: true }); } return; }
    else if (a === 'save') { var d = st.sel; st.saving[d] = true; render(); setTimeout(function () { st.saving[d] = false; st.saved[d] = true; render(); }, 600); return; }
    else return;
    render();
  });
  root.addEventListener('change', function (e) { if (e.target.dataset.a === 'date') { st.sel = Number(e.target.value); render(); } });
  window.__ri = { state: function () { return st; } };
  render();
})();
