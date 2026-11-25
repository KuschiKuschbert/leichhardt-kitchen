/* The three rule orders across many made-up weightings (26 Nov 2026): node docs/cleaning-tracking-options/previews/many.js
   The head chef has not set a weight or a kind for any job, so one example proves little. This draws 2,000 sets of
   weights (and, in the second block, kinds too) with a seeded generator, plans each with the three orders under his day
   levels, and counts how each order leaves each section's heaviest night against the plan that keeps every day
   (same-kind off), which places the same new jobs. Same seed, same numbers. */
const P = require('./planner.js'), J = require('./jobs.js');
const chosen = id => /^sc-/.test(id) && !['sc-pans-01', 'sc-grill-03', 'sc-gen-03'].includes(id);
const LEVEL = [3, 3, 2, 3, 3, 1, 1], KINDS = ['Drawers', 'Behind equipment', 'Fridges', 'Shelves', 'Floors', 'Equipment'], RUNS = 2000;
const orders = { 'days kept (same-kind off)': { level: LEVEL, together: false }, 'kind first': { level: LEVEL }, 'section first': { level: LEVEL, order: 'section' }, 'fewest moves': { level: LEVEL, order: 'fewest' } };
let seed = 20261126; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const cost = j => j.w >= 1 && j.w <= 3 ? j.w : 2;
const worst = (jobs, days) => { const s = {}; jobs.forEach(j => { if (!j.sec || j.every) return; ((days && days[j.id]) || (j.days.length < 7 ? j.days : [])).forEach(d => { s[j.sec] = s[j.sec] || [0, 0, 0, 0, 0, 0, 0]; s[j.sec][d] += cost(j); }); }); const o = {}; Object.keys(s).forEach(k => { o[k] = Math.max.apply(null, s[k]); }); return o; };
const week = (jobs, days) => [0, 1, 2, 3, 4].map(d => jobs.filter(j => !j.every && ((days && j.move ? days[j.id] : j.days.length < 7 ? j.days : []) || []).includes(d)).length);
function block(title, kindsToo) {
  const tot = {}; Object.keys(orders).forEach(k => { tot[k] = { heavier: 0, lighter: 0, same: 0, moved: 0, spread: 0, noFit: 0, noFitRuns: 0, shared: 0, kinds: 0, top: 0, again: 0, againJobs: 0, againNew: 0 }; });
  for (let n = 0; n < RUNS; n++) {
    const base = J.jobs(chosen); base.filter(j => j.move).forEach(j => { j.w = 1 + Math.floor(rnd() * 3); if (kindsToo) j.kind = KINDS[Math.floor(rnd() * KINDS.length)]; });
    let kept = null;
    Object.keys(orders).forEach(k => {
      const jobs = base.map(j => Object.assign({}, j, { days: j.days.slice() })), r = P.plan(jobs, orders[k]), w = worst(jobs, r.days), t = tot[k];
      if (!kept) kept = w;
      const secs = Object.keys(w), up = secs.some(s => w[s] > (kept[s] || 0)), down = secs.some(s => w[s] < (kept[s] || 0));
      t.heavier += up ? 1 : 0; t.lighter += down && !up ? 1 : 0; t.same += !up && !down ? 1 : 0;
      t.top += Math.max.apply(null, secs.map(s => w[s]));
      t.moved += jobs.filter(j => j.move && j.days.length && j.days.length < 7 && j.days.join() !== r.days[j.id].join()).length;
      const wk = week(jobs, r.days); t.spread += Math.max.apply(null, wk) - Math.min.apply(null, wk);
      const nf = jobs.filter(j => j.move && /No day fits/.test(r.why[j.id] || '')).length; t.noFit += nf; t.noFitRuns += nf ? 1 : 0;
      // the plan is saved, a chef adds one job, and plans again: with every job chosen, and with only the new job
      const saved = jobs.map(j => Object.assign({}, j, { days: r.days[j.id] && !j.every ? r.days[j.id].slice() : j.days.slice() }));
      const extra = { id: 'added', text: 'A job added later', sec: ['Grill', 'Pans', 'Fryers, salads and dessert', 'Hot larder'][n % 4], kind: KINDS[n % KINDS.length], w: 1 + (n % 3), per: 1, days: [], every: 0, move: true };
      const again = P.plan(saved.concat([extra]), orders[k]), stirred = saved.filter(j => j.move && !j.every && j.days.length && j.days.length < 7 && j.days.join() !== again.days[j.id].join()).length;
      t.again += stirred ? 1 : 0; t.againJobs += stirred;
      const justNew = P.plan(saved.concat([extra]), Object.assign({}, orders[k], { only: 'new' }));
      t.againNew += saved.filter(j => j.move && !j.every && j.days.length && j.days.length < 7 && justNew.days[j.id] !== undefined).length ? 1 : 0;
      const ks = [...new Set(jobs.filter(j => j.move && !j.every && j.kind).map(j => j.kind))].filter(kd => new Set(jobs.filter(j => j.move && !j.every && j.kind === kd).map(j => j.sec)).size > 1);
      t.kinds += ks.length; t.shared += ks.filter(kd => { const m = {}; jobs.filter(j => j.move && !j.every && j.kind === kd).forEach(j => r.days[j.id].forEach(d => { (m[d] = m[d] || new Set()).add(j.sec); })); return Object.values(m).some(x => x.size > 1); }).length;
    });
  }
  console.log('\n' + title + ' (' + RUNS + ' runs)');
  console.log('| Order | Some section\'s heaviest night heavier than with days kept | None heavier, some lighter | No change | Kitchen\'s heaviest section night, average | Dated jobs moved, average of 15 | Busiest less quietest day, Sunday to Thursday, average | Kinds in 2+ sections with a shared day | Runs where a job fits no day | One job added after a save, planned again: runs where a saved job moves | The same, planning only the new job |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  Object.keys(orders).forEach(k => { const t = tot[k], pc = v => Math.round(v / RUNS * 100) + '%'; console.log('| ' + [k, pc(t.heavier), pc(t.lighter), pc(t.same), (t.top / RUNS).toFixed(1), (t.moved / RUNS).toFixed(1), (t.spread / RUNS).toFixed(1), Math.round(t.shared / t.kinds * 100) + '%', t.noFitRuns + ' of ' + RUNS, pc(t.again), pc(t.againNew)].join(' | ') + ' |'); });
}
block('Weights drawn at random, kinds as in jobs.js', false);
block('Weights and kinds both drawn at random', true);
