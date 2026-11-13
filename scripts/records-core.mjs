/* Records (head chef, 13 Nov 2026, docs/smart-book-options/brief.md): each finished kitchen day's food safety summary,
   worked out by the nightly analysis job and kept on that day's row of analysis/dashboard (admin only), so the admin
   Records page opens with one read and a finished day's food safety part needs no more.

   cleanDay() follows js/cleaning.js for a past day (cleaningDue() in js/prep.js, flowSummary() and flowState() in
   js/cleaning.js): a task due that day is Done, Missed, Unable to complete (with its note), Awaiting Pass check, or an
   event task (service, prep and service, food, use) that is never Missed. Past cleaning records cannot change (the rules
   let a completion be written only on its own day), so a counted day stays counted. When js/cleaning.js changes how a
   past day reads, change this file and CLEAN_V together (docs/open-work.md, Bringing the code in line). */
export const CLEAN_V = 1;
const ZONE = 10 * 3600000; // Queensland, UTC+10, no daylight saving
const LIST = 8;            // names kept per list; the counts are always whole
export const isDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
export function at(day, min) { const a = day.split('-'); return Date.UTC(+a[0], a[1] - 1, +a[2]) - ZONE + (min || 0) * 60000; }
export const dow = ms => new Date(ms + ZONE).getUTCDay();
export const clock = ms => { const d = new Date(ms + ZONE), p = n => (n < 10 ? '0' : '') + n; return p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };
const text = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const temp = v => typeof v === 'number' && Number.isFinite(v) && v >= -100 && v <= 100 ? v : null; // as recorded, never rounded or judged

export function due(task, day) {
  const t = at(day), repeat = task && task.plan && task.plan.repeat;
  return !!task && task.from <= t && task.until > t && Array.isArray(task.dows) && task.dows.indexOf(dow(t)) >= 0 &&
    (!repeat || (!!repeat.anchor && isDay(repeat.anchor) && t >= at(repeat.anchor) && ((t - at(repeat.anchor)) / 86400000) % repeat.days === 0));
}
const EVENTS = ['service', 'prep-service', 'food', 'use'];
export function cleanDay(tasks, done, day) {
  const out = { cv: CLEAN_V, due: 0, done: 0, miss: [], missN: 0, unable: [], unableN: 0, wait: [], waitN: 0, ev: 0, evRec: 0 };
  const mine = (done || []).filter(r => r && r.day === day);
  (tasks || []).filter(task => due(task, day)).forEach(task => {
    const name = text(task.text, 80) || 'A cleaning task';
    out.due++;
    if (!task.plan) {
      const r = mine.filter(x => x.task === task.id)[0];
      if (r && r.done) out.done++; else { out.missN++; if (out.miss.length < LIST) out.miss.push(name); }
      return;
    }
    const timing = task.plan.timing, slots = [], recs = mine.filter(x => x.task === task.id && x.flow);
    const add = slot => { if (slots.indexOf(slot) < 0) slots.push(slot); };
    if (timing === 'daily') add('daily');
    if (timing === 'close') add('close');
    if (timing === 'food') { add('start'); add('close'); }
    recs.forEach(r => add(r.flow.slot));
    let complete = 0, awaiting = 0, blocked = null;
    slots.forEach(slot => {
      const r = recs.filter(x => x.flow.slot === slot)[0], state = (r && r.flow.status) || 'pending';
      if (state === 'complete') complete++; else if (state === 'awaiting') awaiting++; else if (state === 'blocked' && !blocked) blocked = r;
    });
    const events = EVENTS.indexOf(timing) >= 0;
    if (blocked) { out.unableN++; if (out.unable.length < LIST) out.unable.push({ t: name, n: text(blocked.flow.note, 120) }); }
    else if (awaiting) { out.waitN++; if (out.wait.length < LIST) out.wait.push(name); }
    else if (!events && slots.length && complete === slots.length) out.done++;
    else if (events) { out.ev++; if (complete) out.evRec++; }
    else { out.missN++; if (out.miss.length < LIST) out.miss.push(name); }
  });
  return out;
}
// A day's deliveries as recorded: time, supplier, temperatures (as recorded, never judged), note and who received it
export function dayDeliveries(list, day) {
  return (list || []).filter(r => r && r.day === day && !r.tst && typeof r.receivedAt === 'number')
    .sort((a, b) => a.receivedAt - b.receivedAt).slice(0, 40)
    .map(r => ({ at: clock(r.receivedAt), s: text(r.supplier, 60), c: temp(r.chilled), f: temp(r.frozen), n: text(r.note, 160), by: text(r.receivedBy, 60) }));
}
