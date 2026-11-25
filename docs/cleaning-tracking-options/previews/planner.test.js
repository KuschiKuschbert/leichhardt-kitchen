// The planner behind the previews, checked with node: node docs/cleaning-tracking-options/previews/planner.test.js
const assert = require('assert');
const P = require('./planner.js'), J = require('./jobs.js');
const chosen = id => /^sc-/.test(id) && !['sc-pans-01', 'sc-grill-03', 'sc-gen-03'].includes(id);
const jobs = J.jobs(chosen), r = P.plan(jobs), by = id => jobs.find(j => j.id === id);
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
ok(JSON.stringify(P.plan(J.jobs(chosen))) === JSON.stringify(r), 'the same jobs give the same plan');
ok(jobs.filter(j => !j.move).every(j => r.days[j.id] === undefined), 'a job that was not chosen is never given a day');
ok(jobs.filter(j => /^pd-/.test(j.id) || /^c\d/.test(j.id)).every(j => !j.move), 'Pack down steps and the general list are never chosen here');
const quiet = id => r.days[id].some(d => d === 5 || d === 6);
ok(jobs.filter(j => j.move && quiet(j.id)).every(j => j.w === 1), 'Friday and Saturday take light jobs only');
ok(r.quiet.used <= r.quiet.most && r.quiet.most === Math.floor(r.quiet.of * 0.1), 'Friday and Saturday hold at most a tenth of the jobs that come round');
const heavyDays = {}; jobs.filter(j => j.w === 3 && j.sec).forEach(j => (j.move ? r.days[j.id] : j.days).forEach(d => { const k = j.sec + d; heavyDays[k] = (heavyDays[k] || 0) + 1; }));
ok(Object.values(heavyDays).every(v => v === 1), 'no section has two heavy jobs on one day');
const shelves = jobs.filter(j => j.move && j.kind === 'Shelves').map(j => r.days[j.id][0]);
ok(new Set(shelves).size === 1, 'every shelves job lands on one day (' + shelves.join(',') + ')');
ok(r.gave.length >= 1 && r.gave.every(id => /not on the/.test(r.why[id])), 'a job kept off its kind\'s day says why');
const unset = P.plan([{ id: 'a', sec: 'Grill', kind: '', w: 0, per: 1, days: [], move: true }, ...[0, 1, 2, 3, 4].map(d => ({ id: 'f' + d, sec: 'Grill', kind: '', w: 3, per: 1, days: [d], move: false }))]);
ok(unset.days.a.every(d => d !== 5 && d !== 6), 'a job with no weight is never put on Friday or Saturday, even when every other day is heavier');
const twice = P.plan([{ id: 't', sec: 'Grill', kind: '', w: 2, per: 2, days: [], move: true }]).days.t;
ok(twice.length === 2 && Math.min(Math.abs(twice[0] - twice[1]), 7 - Math.abs(twice[0] - twice[1])) >= 2, 'a job on two days a week has them at least two days apart (' + twice + ')');
const months = jobs.filter(j => j.move && j.every === 28).map(j => r.week[j.id]);
ok(months.length === 3 && new Set(months).size === 3, 'the three monthly jobs start in different weeks (' + months + ')');
ok(by('sc-hot-04').days.join() === r.days['sc-hot-04'].join() && by('sc-grill-01').days.join() === r.days['sc-grill-01'].join(), 'a job with no reason to move keeps its day');
// leaving one line out of a proposal: the page checks the rest again and says what it breaks
const notes = P.check(jobs, r.days);
ok(notes.length === 1 && /is on Friday and is not marked light/.test(notes[0]), 'the whole proposal breaks none of its own rules, and names the one job already on Friday that is not marked light (' + notes.join('; ') + ')');
const without = Object.assign({}, r.days); delete without['sc-hot-02'];
ok(P.check(jobs, without).some(m => /Hot larder is at weight/.test(m)), 'with one line left out, the check says which day is now too heavy (' + P.check(jobs, without).join('; ') + ')');
// same kind on the same day is a choice: off, the week is spread by load alone
const apart = P.plan(J.jobs(chosen), { together: false });
const perDay = d => jobs.filter(j => !j.every && (j.move ? apart.days[j.id] : j.days.length < 7 ? j.days : []).includes(d)).length;
ok(new Set(jobs.filter(j => j.move && j.kind === 'Shelves').map(j => apart.days[j.id][0])).size > 1, 'with same-kind days off, shelves jobs are not pulled onto one day');
ok(P.check(jobs, apart.days).length === 1, 'the plan with same-kind days off also breaks no rule');
ok(jobs.filter(j => j.move && j.days.length && j.days.length < 7).every(j => apart.days[j.id].every(d => (d !== 5 && d !== 6) || j.days.includes(d))) && jobs.filter(j => j.move && j.days.length && j.days.length < 7).every(j => r.days[j.id].every(d => (d !== 5 && d !== 6) || j.days.includes(d))), 'a job that has a day is never moved onto Friday or Saturday');
ok(jobs.filter(j => j.move).every(j => !/not on the/.test(apart.why[j.id])), 'with same-kind days off, no reason speaks of a kind\'s day');
ok(jobs.filter(j => j.move && j.days.length && j.days.length < 7).every(j => j.days.join() === apart.days[j.id].join()), 'with same-kind days off, every job that has a day keeps it');
// a job every few days has no weekday: it gets a start day, never a weekday, and says it will reach Friday and Saturday
const few = P.plan([{ id: 'a', sec: 'Grill', kind: '', w: 3, per: 1, days: [], every: 3, move: true }, { id: 'b', sec: 'Grill', kind: '', w: 1, per: 1, days: [], every: 3, move: true }, { id: 'c', sec: 'Pans', kind: '', w: 1, per: 1, days: [], every: 3, move: true }]);
ok(few.days.a === undefined && few.days.b === undefined && few.start.a !== few.start.b && few.start.c === 1 && [few.start.a, few.start.b].every(n => n >= 1 && n <= 3) && /reaches Friday and Saturday/.test(few.why.a), 'two jobs every 3 days in one section start on different days after the save, never the night it is saved, get no weekday, and say they reach Friday and Saturday (' + few.start.a + ',' + few.start.b + ')');
const fort = P.plan([{ id: 'a', sec: 'Grill', kind: '', w: 3, per: 1, days: [], every: 14, move: true }, { id: 'b', sec: 'Grill', kind: '', w: 3, per: 1, days: [], every: 14, move: true }, { id: 'c', sec: 'Grill', kind: '', w: 2, per: 1, days: [], every: 10, move: true }]);
ok(fort.days.a.length === 1 && fort.days.a.every(d => d !== 5 && d !== 6) && fort.week.a !== fort.week.b && [fort.week.a, fort.week.b].every(n => n === 1 || n === 2) && fort.start.a === undefined && fort.days.c === undefined && fort.start.c === 1, 'a job every 2 weeks keeps one weekday off Friday and Saturday and gets a starting week, 1 or 2; a job every 10 days gets a start day only (' + fort.days.a + ' week ' + fort.week.a + ', ' + fort.days.b + ' week ' + fort.week.b + ')');
ok(jobs.filter(j => j.every > 1 && j.every % 7).every(j => !j.move && r.days[j.id] === undefined), 'the one job every few days in the book\'s lists is a Pack down step and is never touched');
// a new job proposed for today is due tonight: the page leaves it out by default, and the rest still breaks no rule
const WED = 3, late = P.tonight(jobs, r.days, WED), open = Object.assign({}, r.days); late.forEach(id => delete open[id]);
ok(late.join() === 'new-pans-fridge' && P.tonight(jobs, apart.days, WED).length === 0, 'saved on a Wednesday, one new job would be due tonight with same-kind days on, and none with them off (' + late + ')');
ok(P.check(jobs, open).length === 1 && /is on Friday and is not marked light/.test(P.check(jobs, open)[0]), 'with same-kind days on and the job due tonight left out, as that page is drawn, no rule is broken');
ok(jobs.filter(j => j.move && j.days.length).every(j => P.tonight(jobs, r.days, j.days[0]).indexOf(j.id) < 0), 'a job that already has a day is never called due tonight: a move starts tomorrow');
// the switch after a save: Off never moves a job that has a day, so it puts none back either
const saved = J.jobs(chosen).map(j => r.days[j.id] && !j.every ? Object.assign(j, { days: r.days[j.id].slice() }) : j), back = P.plan(saved, { together: false });
ok(saved.filter(j => j.move && !j.every).every(j => j.days.join() === back.days[j.id].join()), 'after a save with same-kind days on, choosing off moves no job and puts none back');
console.log('with same-kind days: ' + [0, 1, 2, 3, 4, 5, 6].map(d => jobs.filter(j => !j.every && (j.move ? r.days[j.id] : j.days.length < 7 ? j.days : []).includes(d)).length).join(',') + '; without: ' + [0, 1, 2, 3, 4, 5, 6].map(perDay).join(',') + '; moved without: ' + jobs.filter(j => j.move && j.days.length && j.days.length < 7 && j.days.join() !== apart.days[j.id].join()).length);
console.log('PASS planner: ' + n + ' checks');
