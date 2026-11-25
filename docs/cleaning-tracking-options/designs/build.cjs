/* Round 2: three whole designs, drawn inside the book's real pages (26 Nov 2026). See frame.cjs for how.
     (cd <a checkout at the packet's commit> && node <this file>)
   Writes the pictures and measurements.json beside this file. The weights and kinds are examples made up by the lead
   (previews/jobs.js); the people are the click tests' made-up people. Nothing is saved and no application file changes. */
const path = require('path'), fs = require('fs');
const F = require('./frame.cjs'), P = require('../previews/planner.js'), J = require('../previews/jobs.js');
const OUT = __dirname, ONLY = process.env.ONLY || '';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const D = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], S = D.map(d => d.slice(0, 3)), ORDER = [1, 2, 3, 4, 5, 6, 0];
const W = ['No weight yet', 'Light', 'Medium', 'Heavy'], LEVEL = [3, 3, 2, 3, 3, 1, 1], TAKES = ['', 'light', 'medium', 'heavy'];
const SECTIONS = ['Grill', 'Pans', 'Fryers, salads and dessert', 'Hot larder', ''], secName = s => s || 'Shared kitchen';
const chosen = id => /^sc-/.test(id) && !['sc-pans-01', 'sc-grill-03', 'sc-gen-03'].includes(id);
const all = J.jobs(chosen), picked = all.filter(j => j.move), cost = j => j.w >= 1 && j.w <= 3 ? j.w : 2;
const dated = j => !j.every && j.days.length > 0 && j.days.length < 7;
const rhythm = (j, days) => j.every === 28 ? 'Every 4 weeks' : (days || j.days).length ? 'Every ' + (days || j.days).map(d => D[d]).join(' and ') : 'No day yet';
const fewest = P.plan(J.jobs(chosen), { level: LEVEL, order: 'fewest', needWeight: true }), full = P.plan(J.jobs(chosen), { level: LEVEL, order: 'section' });
const nights = days => { const s = {}; all.forEach(j => { if (!j.sec || j.every) return; ((days && days[j.id]) || (j.days.length < 7 ? j.days : [])).forEach(d => { s[j.sec] = s[j.sec] || [0, 0, 0, 0, 0, 0, 0]; s[j.sec][d] += cost(j); }); }); return s; };
const NOW = nights(null), sum = (a) => a.reduce((x, y) => x + y, 0);
const movedIn = r => picked.filter(j => dated(j) && r.days[j.id] && j.days.join() !== r.days[j.id].join());
const fresh = picked.filter(j => !j.every && !j.days.length), monthly = picked.filter(j => j.every === 28);
const cap1 = s => s[0].toUpperCase() + s.slice(1);
// a monthly job's first date: its weekday in its starting week, counted from Monday 7 December 2026
const firstDate = (r, j) => { const d = r.days[j.id][0], n = (r.week[j.id] - 1) * 7 + ((d + 6) % 7), on = new Date(Date.UTC(2026, 11, 7 + n)); return D[d] + ' ' + on.getUTCDate() + ' ' + (on.getUTCMonth() === 11 ? 'December' : 'January'); };

/* ---------- the few looks that do not exist in the book yet (each is the head chef's call) ---------- */
const CSS = `
[data-design].dz-outline, [data-design] .dz-outline { outline: 0; }
.dz-tag { display: inline-block; padding: 0 .5rem; border: 1.5px solid var(--ink); border-radius: 4px; background: var(--paper); font: 700 .8125rem/1.7 var(--display); letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
.dz-tag.is-quiet { border-color: var(--muted); color: var(--muted); }
.dz-levels { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: .25rem; margin: .35rem 0; }
.dz-levels > div { padding: .45rem .1rem; border: 1px solid var(--edge); border-radius: 8px; background: var(--paper); text-align: center; }
.dz-levels b { display: block; font: 700 .875rem var(--display); letter-spacing: .06em; text-transform: uppercase; }
.dz-levels span { display: block; font-size: .8125rem; color: var(--ink); }
.dz-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .35rem .8rem; align-items: center; padding: .7rem 0; border-top: 1px solid var(--line); }
.dz-row > div > b { display: block; font-size: 1rem; overflow-wrap: anywhere; }
.dz-row small { display: block; color: var(--muted); font-size: .8125rem; line-height: 1.45; overflow-wrap: anywhere; }
.dz-row .dz-now { color: var(--ink); font-size: 1rem; font-weight: 700; }
.dz-ctl { display: flex; flex-wrap: wrap; gap: .35rem; align-items: center; }
.dz-ctl .chip { min-width: 44px; }
@media (max-width: 700px) { .dz-row.is-weigh { grid-template-columns: minmax(0, 1fr); } }
.dz-dock { position: sticky; bottom: 0; z-index: 3; display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; justify-content: space-between; margin-top: 1rem; padding: .7rem 0; border-top: 2px solid var(--ink); background: var(--bg); }
.dz-dock .hint { flex: 1 1 14rem; }
@media (max-width: 899px) { .dz-dock.sv-dock { bottom: var(--tabbar-h, 68px); } }
.dz-change { margin: .1rem 0 .5rem; padding: .5rem .7rem; border-left: 3px solid var(--ink); background: var(--surface-paper, #FBF8F1); }
.dz-change .dz-now { display: block; font-size: 1rem; font-weight: 700; }
.dz-change small { display: block; color: var(--muted); font-size: .8125rem; line-height: 1.45; }
.dz-item { padding: 0 0 .5rem; border-bottom: 1px solid var(--line); }
.dz-item .cln-template-summary { border-bottom: 0; padding: .45rem 0 .25rem; }
.dz-item .dz-ctl .chip { padding: 0 .7rem; }
@media (max-width: 899px) { .dz-dock.sv-dock { padding: .45rem 0; } .dz-dock.sv-dock .hint { flex: 1 1 8rem; } }
.dz-state { display: block; margin-top: .45rem; font-size: .8125rem; color: var(--muted); }
.dz-miss { margin: .5rem 0; padding: .55rem .75rem; border-left: 4px solid var(--accent); background: var(--surface-paper, #FBF8F1); }
.dz-miss > b { display: block; font: 700 1.1rem/1.2 var(--display); }
.dz-miss small { display: block; font-size: .875rem; color: var(--ink); }
.dz-miss .p-link { min-height: 44px; }
.dz-box { margin: .8rem 0; padding: .7rem .8rem; border: 1px solid var(--edge); border-left: 4px solid var(--ink); border-radius: 6px; background: var(--surface-paper, #FBF8F1); }
.dz-box > b { display: block; font: 700 1.05rem/1.2 var(--display); }
.dz-box > .hint, .dz-box > .p-link { display: block; }
.dz-box > .p-link { text-align: left; }
.dz-box .p-link { min-height: 44px; }
.dz-step { border-top: 1px solid var(--line); }
.dz-step > summary { display: flex; justify-content: space-between; gap: .8rem; align-items: center; min-height: 48px; padding: .4rem 0; cursor: pointer; font: 700 1.05rem var(--display); }
.dz-step > summary span { font: 400 .8125rem var(--body, inherit); color: var(--muted); }
.dz-nights { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: .2rem; margin: .3rem 0 .1rem; }
.dz-nights > div { padding: .3rem .1rem; border: 1px solid var(--edge); border-radius: 6px; background: var(--paper); text-align: center; font-size: .8125rem; }
.dz-nights b { display: block; font: 700 .75rem var(--display); letter-spacing: .06em; text-transform: uppercase; }
.dz-nights span { display: block; font-weight: 700; font-size: 1rem; }
.dz-eg { margin: .2rem 0 .7rem; padding: .4rem .7rem; border: 1px dashed var(--ink); border-radius: 8px; font-size: .8125rem; }
.chip small { display: block; font-size: .75rem; font-weight: 400; line-height: 1.2; }
.chip[aria-pressed="true"] small { color: #fff; }
.cln-repeat.dz-days .chip { min-height: 56px; }
.dz-need-quiet .dsh-need-mark { background: var(--accent); }
`;
const EG = what => '<p class="dz-eg" data-design><b>Example only.</b> ' + what + '</p>';
const tag = (t, quiet) => '<span class="dz-tag' + (quiet ? ' is-quiet' : '') + '">' + t + '</span>';
const chips3 = w => '<span class="chips" role="group" aria-label="How long it takes">' + [1, 2, 3].map(n => '<button type="button" class="chip" aria-pressed="' + (w === n) + '">' + W[n] + '</button>').join('') + '</span>';
const levelsStrip = () => '<div class="dz-levels" aria-label="What each day takes">' + ORDER.map(d => '<div><b>' + S[d] + '</b><span>' + TAKES[LEVEL[d]] + '</span></div>').join('') + '</div>';
const levelsWords = () => ORDER.map(d => S[d] + ' ' + TAKES[LEVEL[d]]).join(' · ');
const TENTH = 'Friday and Saturday together take at most a tenth of the week\'s jobs: ' + fewest.quiet.most + ' of ' + fewest.quiet.of + '.';

/* ---------- what each scene puts into the real page ---------- */
const scenes = {};
const put = (p, fn, arg) => p.evaluate(fn, arg);

// A: on the job. Weight, kind and day in the job's own form; the book checks and suggests, one job at a time.
scenes['a1-job-form'] = { open: w => F.chef(w, 'topper'), draw: async p => {
  const j = all.find(x => x.id === 'sc-fry-01'), has = NOW[j.sec], alt = 3;
  await put(p, a => {
    const rep = document.querySelector('.cln-repeat'); rep.classList.add('dz-days'); rep.setAttribute('data-design', '');
    rep.querySelectorAll('.chip').forEach(c => { const d = +c.dataset.dow; c.innerHTML = c.textContent.trim() + '<small>' + a.under[d] + '</small>'; });
    rep.parentElement.insertAdjacentHTML('beforeend', a.afterDays);
    rep.parentElement.insertAdjacentHTML('afterend', a.weight);
    const area = document.querySelector('#cln-area'); area.value = 'Fridges'; area.closest('.field').insertAdjacentHTML('beforeend', a.area);
    const note = document.querySelector('.cln-save-note'); note.textContent = 'Not saved. A change starts tomorrow.'; note.setAttribute('data-design', '');
    document.querySelector('.cln-editor').scrollIntoView(); scrollBy(0, -70);
  }, {
    under: ORDER.reduce((o, d) => { o[d] = LEVEL[d] < cost(j) ? TAKES[LEVEL[d]] + ' only' : 'has ' + (has[d] || 0); return o; }, {}),
    afterDays: '<p class="hint" data-design>Under each day: the weight points ' + esc(j.sec) + ' already has that night (light 1, medium 2, heavy 3), or what the day takes. Thursday is its heaviest night, with 3.</p>' +
      '<div class="dz-box" data-design><b>Suggested: ' + D[alt] + '</b><span class="hint">' + esc(j.sec) + ' has nothing that night, and Hot larder cleans its fridges on a Monday. Not chosen until you press ' + S[alt] + '.</span></div>',
    weight: '<div data-design><span class="label">How long it takes</span><div class="chips" role="group">' + [1, 2, 3].map(n => '<button type="button" class="chip" aria-pressed="' + (n === 2) + '">' + W[n] + '</button>').join('') + '</div><span class="hint">Your call. Friday and Saturday take light jobs only. Tuesday takes up to medium.</span></div>',
    area: '<span class="hint" data-design>Jobs with the same area fall on the same day where each section\'s night allows. This job said "Fryers, salads and dessert" here; its section is in the next box.</span>'
  });
} };
scenes['a2-repeat-tasks'] = { open: w => F.chef(w), draw: async p => {
  const noW = 18, rows = ['sc-grill-01', 'sc-pans-02', 'sc-fry-01', 'sc-hot-02'];
  await put(p, a => {
    const body = document.querySelector('.cln-plan-body'), first = body.querySelector('.cln-first-date') || body.children[2];
    first.insertAdjacentHTML('beforebegin', a.block);
    document.querySelectorAll('.cln-template-item .cln-template-summary > div:first-child').forEach((d, i) => d.insertAdjacentHTML('beforeend', '<small data-design>' + a.lines[i % a.lines.length] + '</small>'));
  }, {
    block: '<div class="dz-box" data-design><b>What each day takes</b><span class="hint">' + levelsWords() + '.</span><span class="hint">' + TENTH + ' Set by the admin.</span><button type="button" class="p-link">Change what a day takes</button></div>' +
      '<div class="cln-attention" role="status" data-design><b>To look at: 4</b><span class="hint">The book checks every job against what each day takes. It moves nothing.</span>' +
      '<button type="button" class="p-link">' + noW + ' jobs have no weight yet</button><button type="button" class="p-link">Clean both sides of the stove: heavy, on Tuesday, which takes up to medium</button>' +
      '<button type="button" class="p-link">Sort the meat doneness sticks: no day yet</button><button type="button" class="p-link">Wipe out and sanitise the drawer fridge: no day yet</button></div>',
    lines: ['No weight yet', 'Medium · Ovens', 'No weight yet', 'Light · Fridges', 'No weight yet', 'Heavy · Fryers']
  });
} };
const nightLines = (withStates) =>
  '<p class="rec-line" data-design><b>Cleaning, jobs that come round:</b> 5 of 6 done. Nightly Pack down is in the count below, not here.</p>' +
  [['Grill', '1 of 1 done', ''], ['Pans', 'none due', ''], ['Fryers, salads and dessert', '2 of 2 done', ''],
    ['Hot larder', '1 of 2 done', '<b>Not ticked by midnight:</b> Clean behind the pizza ovens (every Wednesday).'], ['Shared kitchen', '1 of 1 done', 'A shared job has no section, so nobody is listed.']].map(r =>
    '<div class="dz-row" data-design><div><b>' + r[0] + '</b><small>' + r[1] + '</small>' + (r[2] ? '<small>' + r[2] + '</small>' : '') + '</div><div>' + (r[0] === 'Hot larder' ? '<button type="button" class="chip" aria-expanded="false">Who was rostered on Hot larder</button>' : '') + '</div></div>').join('') +
  '<p class="rec-line" data-design><b>Unable to complete:</b> Deep clean the oil filter machine, Hot larder: "No degreaser". Not a miss, not in the 5 of 6.</p>' +
  (withStates ? '<div class="dz-box" data-design><b>What this page says when it cannot know</b><span class="hint"><span class="rec-wait">Count not ready.</span> The nightly run counts this day at 03:00.</span><span class="hint">Not counted: Cleaning was switched off that day.</span><span class="hint">Rostered on Hot larder: nobody was set on the plan that day.</span></div>' : '');
scenes['a3-records-day'] = { open: w => F.adminPage(w, 'records'), draw: async p => {
  await p.click('.rec-dayrow'); await F.L.settle(p, 500);
  await put(p, a => { const v = document.querySelector('.rec-dayv'), line = v.querySelector('.rec-line'); line.insertAdjacentHTML('beforebegin', a); line.textContent = 'Every cleaning job that day: 47 of 52 done, as Records shows today.'; }, EG('The counts and people are made up.') + nightLines(true));
} };

// B: one list. Weigh every job in one list by section; the plan lands in that list as was and now; one Save.
const planBody = (state) => {
  const r = fewest, mv = movedIn(r), noFit = picked.filter(j => /No day fits/.test(r.why[j.id] || '')), kept = picked.filter(j => dated(j) && r.days[j.id] && j.days.join() === r.days[j.id].join());
  const changes = mv.length + fresh.length + monthly.length;
  const head = '<p class="hint" data-design>Jobs that come round. Nightly jobs and the numbered Pack down steps are not planned.</p>' + EG('The weights and kinds are made up. Yours will change the days.') +
    '<div data-design><span class="label">What each day takes</span>' + levelsStrip() + '<span class="hint">' + TENTH + ' Set by the admin.</span> <button type="button" class="p-link">Change</button></div>';
  if (state === 'weigh') {
    const blank = ['sc-hot-05', 'sc-fry-04'];
    return head + SECTIONS.map(s => { const js = picked.filter(j => j.sec === s); if (!js.length) return '';
      return '<h3 class="nb-hd" data-design>' + esc(secName(s)) + '<span>' + js.length + ' jobs' + (js.some(j => blank.includes(j.id)) ? ' · ' + js.filter(j => blank.includes(j.id)).length + ' with no weight' : '') + '</span></h3>' +
        js.map(j => '<div class="dz-row is-weigh" data-design><div><b>' + esc(j.text) + '</b><small>' + rhythm(j) + (blank.includes(j.id) ? ' · <b>No weight yet</b>' : '') + '</small></div><div class="dz-ctl">' + chips3(blank.includes(j.id) ? 0 : j.w) + '<button type="button" class="chip sq">' + esc(blank.includes(j.id) ? 'Kind' : j.kind) + ' ▾</button></div></div>').join(''); }).join('') +
      '<div class="dz-dock" data-design><span class="hint"><b>18 weights not saved.</b> 2 jobs have no weight yet: they will not be planned.</span><span class="dz-ctl"><button type="button" class="btn">Plan the days</button><button type="button" class="btn dark">Save 18 weights</button></span></div>';
  }
  const stateOf = i => state !== 'saving' ? tag('Proposed, not saved') : i < 2 ? '<span class="lk-stamp">Saved</span> starts tomorrow' : i === 2 ? tag('Not sent') + ' no signal. Try again keeps it.' : i === 3 ? '<span style="color:var(--bad-ink)"><b>Refused.</b> This job was changed on another phone. Refresh, then plan again.</span>' : tag('Waiting', true);
  let n = 0;
  const line = (j, now, why, keep) => '<div class="dz-row" data-design><div><b>' + esc(j.text) + '</b><small>' + esc(secName(j.sec)) + ' · ' + W[j.w] + (j.kind ? ' · ' + esc(j.kind) : '') + '</small><small class="dz-now">' + now + '</small><small>' + esc(cap1(why)) + '.</small><small>' + stateOf(n++) + '</small></div><div><button type="button" class="btn">' + keep + '</button></div></div>';
  return head +
    '<div class="dz-box" data-design><b>The plan: ' + changes + ' changes</b><span class="hint">' + mv.length + ' jobs move, ' + fresh.length + ' new jobs get a day, ' + monthly.length + ' monthly jobs get a first date. ' + kept.length + ' keep their day.' + (noFit.length ? ' ' + noFit.length + ' has no day that fits.' : '') + '</span><span class="hint">A job moves only when its day does not take it, or when its section\'s heaviest night gets lighter.</span></div>' +
    '<h3 class="nb-hd" data-design>Moves<span>' + mv.length + ' jobs that have a day</span></h3>' + mv.map(j => line(j, D[r.days[j.id][0]] + ', was ' + D[j.days[0]], r.why[j.id], 'Keep ' + S[j.days[0]])).join('') +
    '<h3 class="nb-hd" data-design>New days<span>' + fresh.length + ' jobs with no day yet</span></h3>' + fresh.map(j => line(j, D[r.days[j.id][0]], r.why[j.id], S[r.days[j.id][0]] + ' ▾')).join('') +
    '<h3 class="nb-hd" data-design>First dates<span>' + monthly.length + ' jobs every 4 weeks</span></h3>' + monthly.map(j => line(j, firstDate(r, j) + ', then every 4 weeks', r.why[j.id], 'Pick a date')).join('') +
    (state === 'saving' ? '<div class="dz-row" data-design><div><b>Deep clean the oil filter machine</b><small>Hot larder · Heavy · Equipment</small><small class="dz-now">No day fits</small><small>Hot larder already has a heavy job on every day that takes one. Left on Thursday.</small></div><div><button type="button" class="btn">Open the job</button></div></div>' : '') +
    '<details class="pv-fold" data-design><summary style="min-height:44px;padding:.7rem 0;font-weight:600">' + kept.length + ' jobs keep their day</summary></details>' +
    '<div class="dz-dock" data-design>' + (state === 'saving'
      ? '<span class="hint"><b>2 of ' + changes + ' saved.</b> 1 not sent, 1 refused, ' + (changes - 4) + ' waiting. Saved changes start tomorrow. Nothing else has changed.</span><span class="dz-ctl"><button type="button" class="btn dark">Try again</button></span>'
      : '<span class="hint"><b>Nothing is saved yet.</b> Cleaning is off, so no job waits. Saved 5 at a time.</span><span class="dz-ctl"><button type="button" class="btn">Back to weights</button><button type="button" class="btn dark">Save ' + changes + ' changes</button></span>') + '</div>';
};
const planView = state => ({ open: w => F.chef(w), draw: async p => {
  await put(p, a => { document.querySelector('#cln-plan-title').textContent = a.title; const back = document.querySelector('.cln-plan .nb-ph .p-link'); back.textContent = 'Back to Repeat tasks'; document.querySelector('.cln-plan-body').innerHTML = a.body; },
    { title: 'Weigh and plan · ' + picked.length + ' jobs that come round', body: planBody(state) });
} });
scenes['b1-weigh'] = planView('weigh');
scenes['b2-plan'] = planView('plan');
scenes['b2s-saving'] = Object.assign(planView('saving'), { widths: [390] });
scenes['b3-report'] = { open: w => F.adminPage(w, 'records'), draw: async p => {
  const secs = [['Grill', 5, 5, ''], ['Pans', 4, 4, ''], ['Fryers, salads and dessert', 20, 19, ''], ['Hot larder', 27, 26, 'open'], ['Shared kitchen', 36, 35, '']];
  await put(p, a => { const tabs = document.querySelector('.a-tabs'); tabs.querySelectorAll('.a-tab').forEach(t => t.setAttribute('aria-pressed', 'false')); tabs.insertAdjacentHTML('beforeend', '<button type="button" class="a-tab" aria-pressed="true" data-design>Cleaning</button>');
    const pane = document.querySelector('.a-pane'); pane.innerHTML = a; }, '<section class="set-block" data-design><h3 class="a-title">Cleaning by section</h3>' + EG('The counts and people are made up.') +
    '<p class="hint">Jobs that come round, the last 4 weeks. Counted to Wednesday 2 December. Counting began Monday 9 November, the first night Cleaning was on.</p>' +
    secs.map(s => '<div class="dz-row"><div><b>' + s[0] + '</b><small>' + (s[1] - s[2] ? (s[1] - s[2]) + ' not ticked' : 'Nothing missed') + ' in 4 weeks · ' + s[2] + ' of ' + s[1] + ' done</small>' +
      (s[3] ? '<small><b>Clean behind the pizza ovens</b> · not ticked Wed 2 Dec. Done Wed 11, 18 and 25 Nov (Lou 21:40, Vic 22:05, Lou 21:55).</small>' : '') + '</div><div>' +
      (s[3] ? '<button type="button" class="chip" aria-expanded="false">Who was rostered, Wed 2 Dec</button>' : '<button type="button" class="chip" aria-expanded="false">Open</button>') + '</div></div>').join('') +
    '<h4 class="a-ch-h">Unable to complete</h4><div class="dz-row"><div><b>Deep clean the oil filter machine</b><small>Hot larder · Thu 5 Nov · "No degreaser". Not a miss, not in the counts.</small></div><div></div></div>' +
    '<div class="dz-box"><b>What this page says when it cannot know</b><span class="hint"><span class="rec-wait">Count not ready.</span> The nightly run counts yesterday at 03:00.</span><span class="hint">Nothing to show yet: Cleaning is switched off, so nothing is counted.</span><span class="hint">Could not read the counts. Check the signal and press Refresh.</span></div></section>');
} };

// C: set up once. A short run of steps before Cleaning is switched on; after that the job form proposes a day.
const weekBySection = r => SECTIONS.filter(Boolean).map(s => { const before = NOW[s] || [0, 0, 0, 0, 0, 0, 0], after = nights(r.days)[s], top = a => Math.max.apply(null, a);
  return '<div class="dz-row"><div><b>' + esc(s) + '</b><small>Heaviest night ' + top(before) + ' points now, ' + top(after) + ' with this week.</small><div class="dz-nights">' + ORDER.map(d => '<div><b>' + S[d] + '</b><span>' + after[d] + '</span>was ' + before[d] + '</div>').join('') + '</div>' +
    '<small>' + ORDER.filter(d => after[d]).map(d => '<b>' + S[d] + ':</b> ' + all.filter(j => j.sec === s && !j.every && (j.move ? r.days[j.id] : j.days.length < 7 ? j.days : []).includes(d)).map(j => esc(j.text) + (!j.move ? ' (Pack down, not moved)' : j.days.length && !j.days.includes(d) ? ' (was ' + S[j.days[0]] + ')' : j.days.length ? '' : ' (new)')).join('; ')).join('. ') + '.</small></div><div></div></div>'; }).join('');
const setup = step => ({ open: w => F.chef(w), draw: async p => {
  const grill = picked.filter(j => j.sec === 'Grill'), mv = movedIn(full);
  const s1 = '<details class="dz-step"' + (step === 1 ? ' open' : '') + '><summary>1. Weigh the jobs<span>' + (step === 1 ? '3 of ' + picked.length + ' done' : 'Done · ' + picked.length + ' jobs') + '</span></summary>' + (step === 1 ? '<p class="hint">One section at a time. Grill, the first of 5.</p>' +
    grill.map((j, i) => '<div class="dz-row is-weigh"><div><b>' + esc(j.text) + '</b><small>' + rhythm(j) + (i === 2 ? ' · <b>No weight yet</b>' : '') + '</small></div><div class="dz-ctl">' + chips3(i === 2 ? 0 : j.w) + '<button type="button" class="chip sq">' + esc(i === 2 ? 'Kind' : j.kind) + ' ▾</button></div></div>').join('') +
    '<div class="dz-dock" style="position:static"><span class="hint"><b>Not saved.</b> 1 job on Grill has no weight yet.</span><span class="dz-ctl"><button type="button" class="btn dark">Save Grill, then Pans</button></span></div>' : '') + '</details>';
  const s2 = '<details class="dz-step"><summary>2. Say what each day takes<span>' + (step === 1 ? 'Not started' : 'Done · ' + levelsWords().replace(/ · /g, ', ')) + '</span></summary></details>';
  const s3 = '<details class="dz-step"' + (step === 3 ? ' open' : '') + '><summary>3. See the week<span>' + (step === 3 ? 'Proposed, not saved' : 'Not started') + '</span></summary>' + (step === 3 ? EG('The weights and kinds are made up. Yours will change the days.') +
    '<p class="hint">Cleaning is off, so the book plans the whole week: no job waits. ' + mv.length + ' of ' + picked.filter(dated).length + ' jobs change day, ' + fresh.length + ' new jobs get a day. Each number is that section\'s weight points that night (light 1, medium 2, heavy 3).</p>' + weekBySection(full) +
    '<p class="hint"><b>First dates:</b> ' + monthly.map(j => esc(j.text) + ', ' + firstDate(full, j)).join('; ') + '. ' + TENTH + '</p>' +
    '<div class="dz-dock" style="position:static"><span class="hint"><b>Nothing is saved yet.</b> To change one job, open it from the list below.</span><span class="dz-ctl"><button type="button" class="btn dark">Save this week</button></span></div>' : '') + '</details>';
  const s4 = '<details class="dz-step"><summary>4. Switch Cleaning on<span>Counting starts that night</span></summary></details>';
  await put(p, a => { const body = document.querySelector('.cln-plan-body'), first = body.querySelector('.cln-first-date') || body.children[2]; first.insertAdjacentHTML('beforebegin', a); },
    '<div class="dz-box" data-design><b>Get Cleaning ready</b><span class="hint">Cleaning is switched off for the team. Four steps, once. After that the book suggests a day whenever you add a job.</span>' + s1 + s2 + s3 + s4 + '</div>');
} });
scenes['c1-setup-weigh'] = setup(1);
scenes['c2-setup-week'] = setup(3);
scenes['c3-new-job'] = { open: w => F.chef(w), draw: async p => {
  await p.click('[data-cln="add"]'); await F.L.settle(p, 500);
  const sec = 'Pans', has = nights(full.days)[sec], sug = 1;
  await put(p, a => {
    document.querySelector('#cln-text').value = 'Wipe out and sanitise the drawer fridge';
    const rep = document.querySelector('.cln-repeat'); rep.classList.add('dz-days'); rep.setAttribute('data-design', '');
    rep.querySelectorAll('.chip').forEach(c => { const d = +c.dataset.dow; c.setAttribute('aria-pressed', 'false'); c.innerHTML = c.textContent.trim() + '<small>' + a.under[d] + '</small>'; });
    rep.parentElement.insertAdjacentHTML('beforeend', a.afterDays); rep.parentElement.insertAdjacentHTML('afterend', a.weight);
    document.querySelector('.cln-editor').scrollIntoView(); scrollBy(0, -70);
  }, { under: ORDER.reduce((o, d) => { o[d] = d === sug ? 'suggested' : d === 3 ? 'today' : LEVEL[d] < 2 ? 'light only' : 'has ' + (has[d] || 0); return o; }, {}),
    afterDays: '<div class="dz-box" data-design><b>Suggested: Monday</b><span class="hint">Pans has the least on that night, and Hot larder cleans its fridges on a Monday too. No day is chosen until you press one.</span><span class="hint">Wednesday is today: a new job starts the day it is saved, so it would be due tonight.</span></div>',
    weight: '<div data-design><span class="label">How long it takes</span><div class="chips" role="group">' + [1, 2, 3].map(n => '<button type="button" class="chip" aria-pressed="' + (n === 2) + '">' + W[n] + '</button>').join('') + '</div><span class="hint">Your call. The book needs it to suggest a day.</span><span class="label" style="display:block;margin-top:.7rem">Kind of job</span><button type="button" class="chip sq">Fridges ▾</button></div>' });
} };

// the morning flag in the Inbox. A and B: one row. C: the row, and a line in today's numbers.
const flagRow = where => '<li class="dsh-need dsh-need-att dz-need-quiet" data-design><span class="dsh-need-mark" aria-hidden="true"></span><div><p class="dsh-tag dsh-tag-att">Not ticked</p><p class="dsh-need-title">Hot larder: 1 cleaning job last night</p><p class="dsh-need-detail">Wednesday 2 December · Clean behind the pizza ovens (every Wednesday). Jobs that come round only.</p></div><button type="button" class="btn">' + where + '</button></li>';
scenes['ab-inbox'] = { open: w => F.adminPage(w, ''), draw: p => put(p, a => { document.querySelector('.dsh-need-list').insertAdjacentHTML('beforeend', a); const h = document.querySelector('.dsh-needs .hint'); if (h) h.textContent = '2 to look at'; document.querySelectorAll('.a-quick').forEach(q => { const n = [...q.querySelectorAll('*')].find(e => !e.children.length && e.textContent.trim() === '1'); if (n) n.textContent = '2'; }); }, flagRow('Open that night')) };
scenes['c-inbox'] = { open: w => F.adminPage(w, ''), draw: p => put(p, a => { document.querySelector('.dsh-need-list').insertAdjacentHTML('beforeend', a.row); const h = document.querySelector('.dsh-needs .hint'); if (h) h.textContent = '2 to look at'; document.querySelectorAll('.a-quick').forEach(q => { const n = [...q.querySelectorAll('*')].find(e => !e.children.length && e.textContent.trim() === '1'); if (n) n.textContent = '2'; }); document.querySelector('.dsh-dtiles').insertAdjacentHTML('afterbegin', a.tile); },
  { row: flagRow('Open that night'), tile: '<button type="button" class="dsh-dtile" data-design><span class="dsh-dtile-lab">Cleaning, Wednesday</span> <span class="dsh-dtile-num">5<small> of 6</small></span> <span class="dsh-dtile-sub">jobs that came round. Hot larder: 1 not ticked</span></button>' }) };

// THE MIX (after round 2): B's one list leads, with one Save for weight and day together; the book plans in bulk only
// while Cleaning is off; results are the Inbox row and that night in Records. No new room, no new Reports tab.
const LEVELS_LINE = '<p class="hint" data-design><b>Each day takes jobs up to:</b> ' + ORDER.map(d => S[d] + ' ' + TAKES[LEVEL[d]]).join(', ') + '. Friday and Saturday together: at most ' + fewest.quiet.most + ' of the week\'s ' + fewest.quiet.of + ' jobs. Set by the admin. <button type="button" class="p-link">Change</button></p>';
const RULES_FOLD = '<details class="pv-fold" data-design><summary style="min-height:44px;padding:.7rem 0;font-weight:600">How the book suggests a day</summary><ol><li>A day takes no job longer than it is set for.</li><li>A job keeps the day it has, unless that day does not take it.</li><li>A job with no day goes on the night its section has least on.</li><li>A job moves only when that makes its section\'s heaviest night lighter.</li><li>Jobs of one kind share a day where rule 3 or 4 leaves a choice.</li></ol><p class="hint"><b>Two more rules are the book\'s suggestion, not yours yet:</b> no section gets two heavy jobs on one night, and a section\'s night over 5 points is called too heavy. Change them or drop them. Points: light 1, medium 2, heavy 3.</p></details>';
const kindBtn = j => '<button type="button" class="ux-picker-trigger" style="min-height:44px;width:auto;flex:0 1 auto" aria-label="Kind of job, optional">' + (j && j.kind ? esc(j.kind) : 'Kind') + ' ▾</button>';
const mixRow = (j, o) => { o = o || {}; const blank = o.blank, r = fewest, ch = !blank && (movedIn(r).includes(j) || !j.days.length || j.every === 28);
  const now = j.every === 28 ? firstDate(r, j) + ', then every 4 weeks' : !j.days.length ? D[r.days[j.id][0]] : D[r.days[j.id][0]] + ', was ' + D[j.days[0]];
  const keep = j.every === 28 ? '<button type="button" class="btn">Pick a date</button>' : !j.days.length ? '<button type="button" class="btn">Another day ▾</button>' : '<button type="button" class="btn">Keep ' + D[j.days[0]] + '</button><button type="button" class="btn">Another day ▾</button>';
  return '<li class="cln-template-item dz-item" role="listitem" data-design><div class="cln-template-summary"><div><b>' + esc(j.text) + '</b><small>' + esc(secName(j.sec)) + ' · ' + rhythm(j) + (blank ? ' · <b>No weight yet</b>' : '') + '</small></div></div>' +
    '<div class="dz-ctl">' + chips3(blank ? 0 : j.w) + kindBtn(blank ? null : j) + '</div>' +
    (ch && o.change !== false ? '<div class="dz-change"><span class="dz-now">' + now + '</span><small>' + esc(cap1(r.why[j.id])) + '.</small>' + (o.state && /Saved|Refused|No day/.test(o.state) ? '' : '<div class="dz-ctl" style="margin-top:.4rem">' + keep + '</div>') + '</div>' : '') +
    (o.state ? '<span class="dz-state">' + o.state + '</span>' : ch && o.change !== false ? '<span class="dz-state">' + tag('Suggested, not saved') + '</span>' : '') + '</li>'; };
const mixView = state => ({ open: w => F.chef(w), draw: async p => {
  const r = fewest, mv = movedIn(r), changed = mv.concat(fresh, monthly), blank = ['sc-hot-05', 'sc-fry-04'];
  const filter = (a, c, n) => '<div class="chips" role="group" aria-label="Show" data-design style="margin:.6rem 0">' + [['All', picked.length], ['Changes', c], ['No weight', n]].map((x, i) => '<button type="button" class="chip" aria-pressed="' + (i === a) + '">' + x[0] + ' ' + x[1] + '</button>').join('') + '</div>';
  let body = '<p class="hint" data-design>Weekly and monthly jobs. Nightly jobs and the numbered Pack down steps are not here.</p>' + EG('The weights and kinds are made up. Yours will change the days.') + LEVELS_LINE, dock;
  if (state === 'all') {
    body += filter(0, 0, 2) + SECTIONS.map(s => { const js = picked.filter(j => j.sec === s); return js.length ? '<h3 class="nb-hd" data-design>' + esc(secName(s)) + '<span>' + js.length + ' jobs</span></h3><ul class="cln-templates" role="list" style="list-style:none;margin:0;padding:0">' + js.map(j => mixRow(j, { blank: blank.includes(j.id), change: false })).join('') + '</ul>' : ''; }).join('');
    dock = '<span class="hint"><b>18 not saved.</b> 2 have no weight yet.</span><span class="dz-ctl"><button type="button" class="btn">Suggest the days</button><button type="button" class="btn dark">Save 18 jobs</button></span>';
  } else if (state === 'changes') {
    body += '<div class="dz-box" data-design><b>The book suggests ' + changed.length + ' changes</b><span class="hint">' + mv.length + ' jobs move, ' + fresh.length + ' new jobs get a day, ' + monthly.length + ' monthly jobs get a first date. ' + (picked.length - changed.length) + ' keep their day. Cleaning is switched off, so no job waits. One Save keeps each job\'s weight and day together.</span></div>' + filter(1, changed.length, 0) +
      '<ul class="cln-templates" role="list" style="list-style:none;margin:0;padding:0">' + changed.map(j => mixRow(j)).join('') + '</ul>' + RULES_FOLD;
    dock = '<span class="hint"><b>Nothing is saved yet.</b></span><span class="dz-ctl"><button type="button" class="btn dark">Save 20 jobs</button></span>';
  } else if (state === 'saving') {
    const st = ['<span class="lk-stamp">Saved</span> 14:02. Starts tomorrow.', '<span class="lk-stamp">Saved</span> 14:02. Starts tomorrow.', tag('Not sent') + ' No signal. Your choice is kept on this phone. <button type="button" class="btn" style="margin-left:.4rem">Send again</button>', tag('Refused') + ' Someone changed this job on another phone. <button type="button" class="btn" style="margin-left:.4rem">Refresh</button>'];
    body += '<div class="dz-box" data-design><b>12 of 20 jobs saved</b><span class="hint">1 not sent, 1 refused, 6 waiting to send, 1 has no day that fits. The jobs already saved start tomorrow. Nothing else has changed.</span></div>' + filter(1, changed.length + 1, 0) +
      '<ul class="cln-templates" role="list" style="list-style:none;margin:0;padding:0">' + changed.map((j, i) => mixRow(j, { state: st[i] || tag('Waiting to send', true) })).join('') +
      '<li class="cln-template-item dz-item" role="listitem" data-design><div class="cln-template-summary"><div><b>Deep clean the oil filter machine</b><small>Hot larder · every Thursday</small></div></div><div class="dz-change"><span class="dz-now">No day fits. Left on Thursday.</span><small>Hot larder already has a heavy job on every day that takes one. That is one of the book\'s two suggested rules: open "How the book suggests a day" to change it.</small></div><span class="dz-state">' + tag('No day fits') + '</span></li></ul>';
    dock = '<span class="hint"><b>12 of 20 saved.</b> 8 still to send.</span><span class="dz-ctl"><button type="button" class="btn dark">Send the rest</button></span>';
  } else {
    const off = picked.find(j => j.id === 'sc-hot-03'), nw = fresh[0];
    body = '<p class="hint" data-design>Weekly and monthly jobs. Nightly jobs and the numbered Pack down steps are not here.</p>' + EG('The weights, kinds and the added jobs are made up.') +
      '<div class="dz-box" data-design><b>Cleaning is on</b><span class="hint">The book now gives a day to new jobs only. A job that has a day moves only when you say so, one at a time, because a moved job has one uneven week.</span></div>' + LEVELS_LINE + filter(1, 3, 0) +
      '<h3 class="nb-hd" data-design>New job<span>1 with no day yet</span></h3><ul class="cln-templates" role="list" style="list-style:none;margin:0;padding:0">' +
      '<li class="cln-template-item dz-item" role="listitem" data-design><div class="cln-template-summary"><div><b>' + esc(nw.text) + '</b><small>Grill · No day yet</small></div></div><div class="dz-ctl">' + chips3(1) + kindBtn(nw) + '</div><div class="dz-change"><span class="dz-now">Tuesday</span><small>Grill has the least on that night. A new job starts the day it is saved: today is Wednesday, so it is first due next Tuesday.</small><div class="dz-ctl" style="margin-top:.4rem"><button type="button" class="btn">Another day ▾</button></div></div><span class="dz-state">' + tag('Suggested, not saved') + '</span></li>' +
      '<li class="cln-template-item dz-item" role="listitem" data-design><div class="cln-template-summary"><div><b>Degrease the charcoal oven hood</b><small>Hot larder · No day yet</small></div></div><div class="dz-ctl">' + chips3(3) + kindBtn(null) + '</div><div class="dz-change"><span class="dz-now">Monday, but it becomes Hot larder\'s heaviest night, at 7 points</span><small>No lighter night takes a heavy job. That is over the book\'s suggested limit of 5 points. Pick another day, or move one of Monday\'s jobs first.</small><div class="dz-ctl" style="margin-top:.4rem"><button type="button" class="btn">Another day ▾</button></div></div><span class="dz-state">' + tag('To look at') + '</span></li></ul>' +
      '<h3 class="nb-hd" data-design>A move on offer<span>your call</span></h3><ul class="cln-templates" role="list" style="list-style:none;margin:0;padding:0">' +
      '<li class="cln-template-item dz-item" role="listitem" data-design><div class="cln-template-summary"><div><b>' + esc(off.text) + '</b><small>Hot larder · every Sunday · Medium</small></div></div><div class="dz-change"><span class="dz-now">Monday, was Sunday</span><small>Hot larder\'s heaviest night goes from 5 to 4 points. This once, 8 days between cleans: last cleaned Sunday, next due the Monday after.</small><div class="dz-ctl" style="margin-top:.4rem"><button type="button" class="btn">Leave on Sunday</button><button type="button" class="btn">Move to Monday</button></div></div><span class="dz-state">' + tag('Offered, not saved') + '</span></li></ul>' + RULES_FOLD;
    dock = '<span class="hint"><b>Nothing is saved yet.</b></span><span class="dz-ctl"><button type="button" class="btn dark">Save 1 job</button></span>';
  }
  await put(p, a => { document.querySelector('#cln-plan-title').textContent = a.title; document.querySelector('.cln-plan .nb-ph .p-link').textContent = 'Back to Repeat tasks'; document.querySelector('.cln-plan-body').innerHTML = a.body; },
    { title: 'Weights and days · ' + picked.length + ' weekly and monthly jobs', body: body + '<div class="dz-dock sv-dock" data-design>' + dock + '</div>' });
} });
scenes['m1-entry'] = { open: w => F.chef(w), draw: p => put(p, a => { const first = document.querySelector('.cln-first-date'); first.insertAdjacentHTML('afterend', a); },
  '<div class="cln-attention" role="status" data-design><b>18 weekly and monthly jobs have no weight yet</b><span class="hint">Say how long each takes: light, medium or heavy. Then the book can suggest the days.</span><button type="button" class="p-link">Weights and days</button></div>') };
scenes['m2-weights'] = mixView('all');
scenes['m3-changes'] = mixView('changes');
scenes['m4-part-saved'] = Object.assign(mixView('saving'), { widths: [390] });
scenes['m5-cleaning-on'] = mixView('on');
const mixFlag = '<li class="dsh-need dsh-need-att dz-need-quiet" data-design><span class="dsh-need-mark" aria-hidden="true"></span><div><p class="dsh-tag dsh-tag-att">Not ticked</p><p class="dsh-need-title">Hot larder: 1 weekly job last night</p><p class="dsh-need-detail">Wednesday 25 November · Clean behind the pizza ovens (every Wednesday). Also not ticked Wednesday 18 November.</p></div><button type="button" class="btn">Open that night</button></li>';
scenes['m6-inbox'] = { open: w => F.adminPage(w, ''), draw: p => put(p, a => { document.querySelector('.dsh-need-list').insertAdjacentHTML('beforeend', a); const h = document.querySelector('.dsh-needs .hint'); if (h) h.textContent = '2 to look at'; document.querySelectorAll('.a-quick').forEach(q => { const n = [...q.querySelectorAll('*')].find(e => !e.children.length && e.textContent.trim() === '1'); if (n) n.textContent = '2'; }); }, mixFlag) };
scenes['m7-records'] = { open: w => F.adminPage(w, 'records'), draw: async p => {
  await p.click('.rec-dayrow[data-d="' + F.day(1) + '"]'); await F.L.settle(p, 500);
  await put(p, a => { const v = document.querySelector('.rec-dayv'), lines = v.querySelectorAll('.rec-line'), last = lines[lines.length - 1] || v.querySelector('.chiprow'); last.insertAdjacentHTML('afterend', a); },
    '<h4 class="a-ch-h" data-design style="margin-top:1rem">Weekly and monthly jobs, by section</h4>' + EG('The people are made up. The lines above are Records as it is today.') +
    '<div class="dz-miss" data-design><b>Hot larder: 1 of 1 not ticked by midnight</b><small>Clean behind the pizza ovens (every Wednesday). Also not ticked Wednesday 18 November. Done Wednesday 11 November.</small><button type="button" class="p-link" aria-expanded="false">Who was rostered on Hot larder</button></div>' +
    '<p class="rec-line" data-design><b>Shared kitchen:</b> 1 of 1 done. Clean the shelves above the pass. A shared job has no section, so nobody is listed.</p>' +
    '<p class="rec-line" data-design><b>Grill, Pans, Fryers salads and dessert:</b> no weekly or monthly job due that Wednesday.</p>' +
    '<div class="dz-box" data-design><b>What this says when it cannot know</b><span class="hint"><span class="rec-wait">Count not ready.</span> The nightly run counts this day at 03:00.</span><span class="hint">Not counted: Cleaning was switched off that day.</span><span class="hint">Rostered on Hot larder: nobody was set on the plan that day.</span></div>');
} };

// the page no design may change: a cook's Cleaning day (the same picture serves A, B and C)
scenes['cook-unchanged'] = { open: w => F.cook(w), draw: async () => {}, plain: true };

(async () => {
  await F.start(); const out = {};
  for (const name of Object.keys(scenes).filter(n => !ONLY || n.indexOf(ONLY) === 0)) for (const width of scenes[name].widths || [390, 1280]) {
    const sc = scenes[name], p = await sc.open(width);
    await p.addStyleTag({ content: CSS }); await sc.draw(p); await F.L.settle(p, 350);
    await p.evaluate(() => scrollTo(0, 0)); const firstScreen = await p.evaluate(() => ({ wholeDesignRows: (() => { const dock = document.querySelector('.dz-dock'), bar = document.querySelector('.tabbar, nav.tabs, #tabbar'), floor = Math.min(dock ? dock.getBoundingClientRect().top : innerHeight, innerWidth < 900 ? innerHeight - 68 : innerHeight); return [...document.querySelectorAll('.dz-row, .dz-item')].filter(e => { const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= floor; }).length; })(), firstDesignTop: (() => { const e = document.querySelector('[data-design]'); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; })() }));
    const m = sc.plain ? await p.evaluate(() => ({ screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10, sideways: document.documentElement.scrollWidth > innerWidth, rows: document.querySelectorAll('.cln-row').length, wholeRowsOnFirstScreen: [...document.querySelectorAll('.cln-row')].filter(e => { const b = e.getBoundingClientRect(); return b.top >= 0 && b.bottom <= (innerWidth < 900 ? innerHeight - 68 : innerHeight); }).length, day: 'Wednesday 2 December 2026, the day every chef scene here is drawn on' })) : await F.measure(p);
    await p.screenshot({ path: path.join(OUT, name + '-' + width + '.png') });
    // the whole page: the window is made as tall as the page, so the fixed tab bar and a sticky Save bar sit at the foot, not across the middle
    const tall = await p.evaluate(() => document.documentElement.scrollHeight), was = p.viewportSize();
    await p.setViewportSize({ width, height: Math.max(tall, was.height) }); await F.L.settle(p, 250);
    await p.screenshot({ path: path.join(OUT, name + '-' + width + '-full.png'), fullPage: true }); await p.setViewportSize(was);
    if (!sc.plain) Object.assign(m, firstScreen);
    if (!sc.plain && width === 390) m.focus = await F.focusRing(p);
    if (p.errors.length) m.errors = p.errors;
    out[name + '-' + width] = m; await p.context().close();
  }
  const file = path.join(OUT, 'measurements.json'), prior = ONLY && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)).results : {};
  fs.writeFileSync(file, JSON.stringify({ kind: 'Preview inside the implemented app\'s real pages (click-test stand-in, synthetic data). The page frame, top bar, tab bar, rail and the real forms are the app\'s; the parts marked data-design are drawn in and do nothing when tapped.',
    commit: require('child_process').execSync('git rev-parse --short HEAD').toString().trim(), viewports: '390 x 844 and 1280 x 900', plan: { fewestMoves: { moved: movedIn(fewest).length, new: fresh.length, monthly: monthly.length }, sectionFirst: { moved: movedIn(full).length } }, results: Object.assign(prior, out) }, null, 1) + '\n');
  console.log(Object.keys(out).map(k => k + ' ' + out[k].screensLong + (out[k].sideways ? ' SIDEWAYS' : '') + (out[k].under44 && out[k].under44.length ? ' under44:' + out[k].under44.length : '') + (out[k].lowestContrast ? ' c' + out[k].lowestContrast.ratio : '') + (out[k].errors ? ' ERRORS' : '')).join('\n'));
  await F.stop();
})().catch(e => { console.error(e); process.exit(1); });
