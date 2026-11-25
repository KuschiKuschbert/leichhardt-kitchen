/* Cleaning tracking and planning the days: round 2 previews (26 Nov 2026).
     node docs/cleaning-tracking-options/previews/build.cjs          writes the six pages
     SHOTS=1 node docs/cleaning-tracking-options/previews/build.cjs  also takes the pictures (needs the click tests' packages)
   Schematic previews, not the book: static pages with the book's stylesheet for its tokens, chips and buttons. The
   planner pages are fed by planner.js run on the book's own job lists, with example kinds and weights (jobs.js). The
   tracking pages use made-up people (the click tests' Ann, Bo and Sam, with Dee, Lou and Vic) and made-up counts. */
const fs = require('fs'), path = require('path');
const P = require('./planner.js'), J = require('./jobs.js');
const OUT = __dirname, D = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], S = D.map(d => d.slice(0, 3));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const page = (title, crumb, body) => '<!doctype html>\n<html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title>' +
  '<link rel="stylesheet" href="../../../css/app.css"><link rel="stylesheet" href="preview.css"></head><body class="pv"><div class="pv-bar"><span>Kitchen Book</span><small>Design preview · ' + esc(crumb) + '</small></div><main class="pv-page"><section class="pv-card">' + body + '</section></main></body></html>\n';
const W = ['', 'Light', 'Medium', 'Heavy'];

/* ---------- planning the days ---------- */
const chosen = id => /^sc-/.test(id) && !['sc-pans-01', 'sc-grill-03', 'sc-gen-03'].includes(id);
const jobs = J.jobs(chosen), plan = P.plan(jobs), picked = jobs.filter(j => j.move);
const was = j => j.days.length && j.days.length < 7 ? j.days.map(d => D[d]).join(', ') : '';
const now = j => plan.days[j.id].map(d => D[d]).join(', ');
const moved = picked.filter(j => was(j) && was(j) !== now(j)), stays = picked.filter(j => was(j) && was(j) === now(j)), fresh = picked.filter(j => !was(j) && j.every !== 28), monthly = picked.filter(j => j.every === 28);
const secName = j => j.sec || 'Shared kitchen';
// the days between this job's last clean on its old day and its first on the new one, if the change is saved on a Wednesday
const gap = j => { const a = j.days[0], b = plan.days[j.id][0], today = 3, last = (today - a + 7) % 7, next = ((b - today + 7) % 7) || 7; return last + next; };
const dayLoad = d => jobs.filter(j => !j.every && (j.move ? plan.days[j.id] : j.days.length < 7 ? j.days : []).includes(d));

// P-A: in the job editor. One job at a time; the day chips show what the section already has.
function pA() {
  const j = jobs.find(x => x.id === 'new-grill-sticks'), load = d => jobs.filter(x => x.sec === 'Grill' && x.id !== j.id && !x.every && x.days.length < 7 && x.days.includes(d));
  const put = plan.days[j.id][0];
  return page('A. In the job', 'Cleaning · Repeat tasks · New cleaning task',
    '<h1 class="pv-title">New cleaning task</h1><p class="pv-sub">Repeat tasks. One job at a time, as today, with three new parts: how heavy, what kind, and what each day already holds.</p>' +
    '<label class="field"><span class="label">What needs cleaning?</span><input type="text" value="' + esc(j.text) + '"></label>' +
    '<div class="pv-two"><label class="field pv-field"><span class="label">Responsible section</span><select><option>Grill</option></select></label>' +
    '<label class="field pv-field"><span class="label">Kind of job</span><select><option>Equipment</option><option>Shelves</option><option>Fridges</option><option>Behind equipment</option></select><span class="hint">Jobs of one kind can share a day across sections.</span></label></div>' +
    '<div class="pv-field"><span class="label">How heavy is it?</span><div class="pv-chips chips"><button class="chip" aria-pressed="true">Light<small>about 10 min</small></button><button class="chip" aria-pressed="false">Medium<small>about 20 min</small></button><button class="chip" aria-pressed="false">Heavy<small>30 min or more</small></button></div><span class="hint">Only light jobs go on Friday and Saturday. The times are examples for you to set.</span></div>' +
    '<div class="pv-field"><span class="label">Repeat on</span><div class="pv-chips chips">' + [1, 2, 3, 4, 5, 6, 0].map(d => { const l = load(d), quiet = d === 5 || d === 6; return '<button class="chip" aria-pressed="' + (d === put) + '">' + S[d] + '<small>' + (l.length ? 'Grill has ' + l.length : quiet ? 'light only' : 'free') + '</small></button>'; }).join('') + '</div>' +
    '<p class="hint"><b>Suggested: ' + D[put] + '.</b> ' + esc(plan.why[j.id][0].toUpperCase() + plan.why[j.id].slice(1)) + '. Tap another day to change it.</p></div>' +
    '<div class="pv-save"><span class="hint">Not saved yet. A new job starts today.</span><button class="btn dark">Save cleaning task</button></div>');
}
// P-B: the week as a board. Every job that comes round, day by day, with the proposed places dashed.
function pB() {
  const order = [0, 1, 2, 3, 4, 5, 6];
  return page('B. The week as a board', 'Cleaning · Repeat tasks · Plan the week',
    '<h1 class="pv-title">Plan the week</h1><p class="pv-sub">Every job that comes round, on its day. Nightly jobs and the numbered Pack down steps are not here and are never moved.</p>' +
    '<div class="pv-rules"><b>Friday and Saturday: light jobs only.</b> ' + plan.quiet.used + ' of at most ' + plan.quiet.most + ' used (a tenth of the week\'s ' + plan.quiet.of + ' jobs).<div class="pv-meter"><i style="width:' + Math.round(plan.quiet.used / Math.max(1, plan.quiet.most) * 100) + '%"></i></div></div>' +
    '<div class="pv-week">' + order.map(d => { const list = dayLoad(d), sum = list.reduce((n, j) => n + (j.w || 2), 0);
      return '<div class="pv-day"><b>' + S[d] + '<span>' + list.length + ' jobs · weight ' + sum + '</span></b>' + list.sort((a, b) => secName(a).localeCompare(secName(b))).map(j => { const prop = j.move && was(j) !== now(j);
        return '<div class="pv-job' + (prop ? ' is-new' : '') + '"><span>' + esc(j.text) + '<small> · ' + esc(secName(j).split(',')[0]) + '</small></span><small>' + (prop ? '<span class="pv-tag">Proposed</span> ' : '') + (W[j.w] || 'No weight') + '</small></div>'; }).join('') + (list.length ? '' : '<p class="pv-note">Nothing</p>') + '</div>'; }).join('') + '</div>' +
    '<p class="pv-note">Dashed means proposed, not saved. Drag is not needed: tap a job to choose another day.</p>' +
    '<div class="pv-save"><span class="hint">' + (moved.length + fresh.length) + ' proposed changes. Saved 5 at a time. Changes start tomorrow.</span><span><button class="btn">Spread the days again</button> <button class="btn dark">Save ' + (moved.length + fresh.length) + ' changes</button></span></div>');
}
// P-C: a list of changes. One tap proposes; each line says what changes and why, and can be turned off.
function pC() {
  const line = (j, what) => '<div class="pv-row"><div><b>' + esc(j.text) + '</b><small>' + esc(secName(j)) + ' · ' + (W[j.w] || 'No weight') + (j.kind ? ' · ' + esc(j.kind) : '') + '</small><small>' + what + '</small></div><div><label class="pv-note"><input type="checkbox" checked> Change</label></div></div>';
  return page('C. A list of changes', 'Cleaning · Repeat tasks · Spread the days',
    '<h1 class="pv-title">Spread the days</h1><p class="pv-sub">One tap proposed these. Nothing is saved until you confirm. Untick a line to leave that job alone, or tap its day to choose another.</p>' +
    '<div class="pv-rules"><b>The rules, in the order they win:</b><ol><li>Friday and Saturday take light jobs only, and at most a tenth of the week (' + plan.quiet.used + ' of ' + plan.quiet.most + ' used).</li><li>No section gets two heavy jobs on one day.</li><li>Jobs of one kind share a day across sections.</li><li>Each section\'s week is as even as it can be.</li><li>A job keeps its day unless a rule above moves it.</li></ol></div>' +
    '<h2 class="pv-h">New days <span>' + fresh.length + ' jobs with no day yet</span></h2>' + fresh.map(j => line(j, '<b>' + now(j) + '</b>: ' + esc(plan.why[j.id]) + '. First due tomorrow or later.')).join('') +
    '<h2 class="pv-h">Moves <span>' + moved.length + ' jobs that have a day</span></h2>' + moved.map(j => line(j, esc(was(j)) + ' to <b>' + now(j) + '</b>: ' + esc(plan.why[j.id]) + '. Saved today, a Wednesday: ' + gap(j) + ' days between its last clean and its next.')).join('') +
    '<h2 class="pv-h">Monthly, first dates <span>' + monthly.length + ' jobs every 4 weeks</span></h2>' + monthly.map(j => line(j, '<b>' + now(j) + ', starting in week ' + plan.week[j.id] + '</b>: ' + esc(plan.why[j.id]) + '. Then every 4 weeks.')).join('') +
    '<h2 class="pv-h">Stays <span>' + stays.length + ' jobs</span></h2><p class="pv-note">' + stays.map(j => esc(j.text) + ' (' + now(j) + ')').join(' · ') + '</p>' +
    '<div class="pv-save"><span class="hint">Saved 5 at a time, so a lost signal never leaves it half done without saying so.</span><button class="btn dark">Confirm ' + (fresh.length + moved.length + monthly.length) + ' changes</button></div>');
}

/* ---------- tracking: who did, who missed, fairly ---------- */
const weeks = ['2 to 8 Nov', '9 to 15 Nov', '16 to 22 Nov', '23 to 29 Nov'];
const missed = [   // made-up misses of jobs that come round, with who the plan had on that section that day
  { job: 'Clean the drawers', sec: 'Grill', when: ['Mon 9 Nov', 'Mon 16 Nov'], on: ['Ann', 'Ann, Bo'], wk: [1, 2] },
  { job: 'Clean out the salad fridge', sec: 'Fryers', when: ['Tue 24 Nov'], on: ['Dee'], wk: [3] },
  { job: 'Clean behind the pizza ovens', sec: 'Hot larder', when: ['Wed 18 Nov'], on: ['Lou, Vic'], wk: [2] }
];
const unable = [{ job: 'Deep clean the oil filter machine', sec: 'Hot larder', when: 'Thu 5 Nov', note: 'No degreaser', by: 'Lou' }];
const secs = [['Grill', [2, 2, 2, 2], [2, 1, 1, 2]], ['Pans', [1, 1, 1, 1], [1, 1, 1, 1]], ['Fryers', [5, 5, 5, 5], [5, 5, 5, 4]], ['Hot larder', [7, 7, 7, 7], [6, 7, 6, 7]]];   // name, due per week, done per week
const people = [   // days the plan had them on a section with cleaning, jobs they ticked, their sections' jobs that come round on those days: done of due, misses
  ['Ann', 14, 'Grill', 61, 6, 8, ['Clean the drawers: Mon 9 Nov, Mon 16 Nov']], ['Bo', 11, 'Grill, Pans', 44, 9, 10, ['Clean the drawers: Mon 16 Nov']],
  ['Dee', 12, 'Fryers', 57, 19, 20, ['Clean out the salad fridge: Tue 24 Nov']], ['Lou', 13, 'Hot larder', 66, 25, 26, ['Clean behind the pizza ovens: Wed 18 Nov']],
  ['Vic', 9, 'Hot larder, Pans', 38, 15, 16, ['Clean behind the pizza ovens: Wed 18 Nov']], ['Kit', 3, 'Fryers', 9, 0, 0, []]
];
const fair = '<div class="pv-rules"><b>How this is counted, so it is fair:</b><ul><li>A person counts only for days the plan had them on that section.</li><li>A missed job belongs to everyone who was on that section that day, not to one person.</li><li>Shared kitchen jobs belong to nobody.</li><li>A job marked Unable to complete, with its reason, is not a miss.</li><li>Missed means not ticked by midnight.</li><li>Nobody is ranked. Names are in alphabetical order.</li></ul></div>';
const tot = secs.reduce((a, s) => [a[0] + s[1].reduce((x, y) => x + y, 0), a[1] + s[2].reduce((x, y) => x + y, 0)], [0, 0]);
// T-A: by job. The jobs that were missed, with their dates and who was on.
function tA() {
  return page('A. By job', 'Admin · Reports · Records · Cleaning',
    '<h1 class="pv-title">Cleaning, the last 4 weeks</h1><p class="pv-sub">2 to 29 November. Weekly and monthly jobs only: the nightly lists are in each day\'s record.</p>' +
    '<div class="pv-row"><div><b>Jobs that come round</b><small>Counted from the day Cleaning was switched on.</small></div><div class="pv-num">' + tot[1] + ' of ' + tot[0] + ' done</div></div>' +
    '<h2 class="pv-h">Missed <span>' + missed.reduce((n, m) => n + m.when.length, 0) + ' times, ' + missed.length + ' jobs</span></h2>' +
    missed.map(m => '<div class="pv-row"><div><b>' + esc(m.job) + '</b><small>' + esc(m.sec) + '</small>' + m.when.map((w, i) => '<small>' + esc(w) + ' · on ' + esc(m.sec) + ' that day: ' + esc(m.on[i]) + '</small>').join('') + '</div><div class="pv-num">' + m.when.length + '</div></div>').join('') +
    '<h2 class="pv-h">Unable to complete <span>not a miss</span></h2>' + unable.map(u => '<div class="pv-row"><div><b>' + esc(u.job) + '</b><small>' + esc(u.sec) + ' · ' + esc(u.when) + ' · ' + esc(u.by) + ': "' + esc(u.note) + '"</small></div><div></div></div>').join('') + fair);
}
// T-B: by section, week by week. The section is the unit; people show when a week is opened.
function tB() {
  return page('B. By section', 'Admin · Reports · Records · Cleaning',
    '<h1 class="pv-title">Cleaning by section</h1><p class="pv-sub">Jobs that come round, done out of due, for each of the last 4 weeks. Tap a week to see what was missed and who was on.</p>' +
    '<div class="pv-scroll"><table class="pv-grid"><thead><tr><th>Section</th>' + weeks.map(w => '<th>' + w + '</th>').join('') + '</tr></thead><tbody>' +
    secs.map(s => '<tr><th>' + s[0] + '</th>' + s[1].map((due, i) => { const m = missed.filter(x => x.sec === s[0] && x.wk.includes(i)); return '<td><b>' + s[2][i] + ' of ' + due + '</b>' + (m.length ? m.map(x => '<small class="pv-note">Missed: ' + esc(x.job) + '</small>').join('') : s[2][i] < due ? '<small class="pv-note">1 unable to complete</small>' : '<small class="pv-note">All done</small>') + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>' +
    '<h2 class="pv-h">Grill, 16 to 22 Nov <span>opened</span></h2><div class="pv-row"><div><b>Clean the drawers</b><small>Missed Mon 16 Nov. On Grill that day: Ann, Bo.</small><small>Done that week on Grill: Clean behind the grill (Bo, Tue 17 Nov 22:10).</small></div><div class="pv-num">1 of 2</div></div>' + fair);
}
// T-C: by person. What each person did, and what was missed on their days, never ranked.
function tC() {
  return page('C. By person', 'Admin · Reports · Team · Cleaning',
    '<h1 class="pv-title">Cleaning by person</h1><p class="pv-sub">2 to 29 November. In alphabetical order, never ranked.</p>' + fair +
    people.sort((a, b) => a[0].localeCompare(b[0])).map(p => '<div class="pv-row"><div><b>' + p[0] + '</b><small>On a section for ' + p[1] + ' days: ' + p[2] + '</small>' +
      (p[1] < 5 ? '<small>Not enough days yet to say anything fair.</small>' : '<small>Ticked ' + p[3] + ' jobs. On those days, the jobs that come round on their section: ' + p[4] + ' of ' + p[5] + ' done.</small>' + (p[6].length ? p[6].map(m => '<small>Missed on a day they were on: ' + esc(m) + '</small>').join('') : '<small>Nothing missed on their days.</small>')) + '</div><div class="pv-num">' + (p[1] < 5 ? '' : p[3]) + '</div></div>').join(''));
}

const pages = { 'p-a': pA(), 'p-b': pB(), 'p-c': pC(), 't-a': tA(), 't-b': tB(), 't-c': tC() };
Object.keys(pages).forEach(k => fs.writeFileSync(path.join(OUT, k + '.html'), pages[k]));
fs.writeFileSync(path.join(OUT, 'plan.json'), JSON.stringify({ note: 'planner.js on the built-in lists with example kinds and weights (jobs.js)', quiet: plan.quiet, kitchenLoadSunToSat: plan.load.kitchen, sectionLoad: plan.load.sections, gaveWay: plan.gave,
  jobs: picked.map(j => ({ job: j.text, section: secName(j), kind: j.kind, weight: W[j.w], was: was(j) || 'no day', now: now(j), week: plan.week[j.id] || undefined, why: plan.why[j.id] })) }, null, 1) + '\n');
console.log('pages written. moved ' + moved.length + ', new ' + fresh.length + ', monthly ' + monthly.length + ', stays ' + stays.length + '; Friday and Saturday ' + plan.quiet.used + ' of ' + plan.quiet.most + '; tracking ' + tot[1] + ' of ' + tot[0]);

if (process.env.SHOTS) (async () => {
  const L = require(path.resolve(OUT, '../../../tests/lib'));
  const b = await L.chromium.launch(L.chromeOpts()), out = {};
  for (const k of Object.keys(pages)) for (const width of [390, 1280]) {
    const ctx = await b.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1 }), p = await ctx.newPage(), errs = [];
    p.on('pageerror', e => errs.push(String(e)));
    await p.goto('file://' + path.join(OUT, k + '.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(250);
    out[k + '-' + width] = await p.evaluate(() => ({ sideways: document.documentElement.scrollWidth > innerWidth, screensLong: Math.round(document.documentElement.scrollHeight / innerHeight * 10) / 10,
      under44: [...document.querySelectorAll('button, select, input[type="text"]')].filter(e => e.getClientRects().length && (e.getBoundingClientRect().height < 44)).length }));
    if (errs.length) out[k + '-' + width].errors = errs;
    await p.screenshot({ path: path.join(OUT, k + '-' + width + '.png') });
    if (width === 390) await p.screenshot({ path: path.join(OUT, k + '-390-full.png'), fullPage: true });
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify({ kind: 'Preview (schematic pages, not the book)', viewports: '390 and 1280 wide, 844 tall', results: out }, null, 1) + '\n');
  console.log(JSON.stringify(out));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
