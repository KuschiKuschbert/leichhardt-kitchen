/* Records (head chef, 13 Nov 2026, docs/smart-book-options/brief.md): each finished kitchen day's food safety summary,
   worked out by the nightly analysis job and kept on that day's row of analysis/dashboard (admin only), so the admin
   Records page opens with one read and a finished day's food safety part needs no more.

   cleanDay() reads a past day with the Cleaning page's own code, js/cleaning-core.js (24 Nov 2026; until then a copy
   lived here): a task due that day is Done, Missed, Unable to complete (with its note), Awaiting Pass check, or an
   event task (service, prep and service, food, use) that is never Missed. Past cleaning records cannot change (the rules
   let a completion be written only on its own day), so a counted day stays counted. When the core changes how a past
   day reads, bump CLEAN_V with it, so the nightly job counts every day again (tests/cleaning-core.test.js holds the
   results; the analysis job's CODE fingerprint covers the core too). */
import { createRequire } from 'node:module';
const core = createRequire(import.meta.url)('../js/cleaning-core.js');
export const CLEAN_V = 1;
const ZONE = 10 * 3600000; // Queensland, UTC+10, no daylight saving
const LIST = 8;            // names kept per list; the counts are always whole
export function at(day, min) { const a = day.split('-'); return Date.UTC(+a[0], a[1] - 1, +a[2]) - ZONE + (min || 0) * 60000; }
export const dow = ms => new Date(ms + ZONE).getUTCDay();
export const clock = ms => { const d = new Date(ms + ZONE), p = n => (n < 10 ? '0' : '') + n; return p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };
const text = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const temp = v => typeof v === 'number' && Number.isFinite(v) && v >= -100 && v <= 100 ? v : null; // as recorded, never rounded or judged
export const qldDay = t => new Date(t + ZONE).toISOString().slice(0, 10);
const QLD = { at, dow, day: qldDay }; // the kitchen clock the core reads days with, as LK_TIME on a phone
export const due = (task, day) => core.due(task, day, QLD);
export function cleanDay(tasks, done, day) {
  const out = { cv: CLEAN_V, due: 0, done: 0, miss: [], missN: 0, unable: [], unableN: 0, wait: [], waitN: 0, ev: 0, evRec: 0 };
  const mine = (done || []).filter(r => r && r.day === day);
  (tasks || []).filter(task => due(task, day)).forEach(task => {
    const name = text(task.text, 80) || 'A cleaning task', p = core.past(task, day, mine);
    out.due++;
    if (p.state === 'done') out.done++;
    else if (p.state === 'blocked') { out.unableN++; if (out.unable.length < LIST) out.unable.push({ t: name, n: text(p.note, 120) }); }
    else if (p.state === 'awaiting') { out.waitN++; if (out.wait.length < LIST) out.wait.push(name); }
    else if (p.state === 'event') { out.ev++; if (p.recorded) out.evRec++; }
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

/* Cooling (head chef, 14 Nov 2026, "Yes yes": keep each day's Operandio cooling confirmations). The book keeps only the
   current batch (cooling/current, cooling/recorded), replaced by the next day's first Start (from 10:00). The nightly
   job (03:00) reads both and puts the batch on the row of its day: who started each stage and who confirmed each stage
   recorded in Operandio, with the times. The temperatures themselves are in Operandio. A day is decided once:
   batch (the times), none (no batch was started: the current one is older), gone (a newer batch replaced it before a
   nightly run could keep it) or before (the book did not keep cooling yet). */
const ms = v => !v ? 0 : typeof v.toMillis === 'function' ? v.toMillis() : typeof v === 'number' ? v : typeof v.seconds === 'number' ? v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1000000) : 0;
export function coolBatchDay(current) { const t = current && (Number.isInteger(current.windowAt) ? current.windowAt : ms(current.firstAt)); return t ? qldDay(t) : ''; }
export function coolDay(current, recorded, day, names, firstRun, yesterday) {
  const bd = coolBatchDay(current);
  if (firstRun && day < yesterday && bd !== day) return { k: 'before' };
  if (!bd || bd < day) return { k: 'none' };
  if (bd > day) return { k: 'gone' };
  const who = id => typeof id === 'string' && id ? (names[id] || 'Someone') : '';
  const at = v => { const t = ms(v); return t ? clock(t) : ''; };
  const rec = recorded && recorded.run === current.run ? recorded : {};
  return { k: 'batch', start: at(current.firstAt), by: who(current.firstBy), s2: at(current.secondAt), s2by: current.secondAt ? who(current.secondBy) : '',
    r1: at(rec.firstAt), r1by: rec.firstAt ? who(rec.firstBy) : '', r2: at(rec.secondAt), r2by: rec.secondAt ? who(rec.secondBy) : '' };
}
