/* Records (head chef, 13 Nov 2026, docs/smart-book-options/brief.md): each finished kitchen day's food safety summary,
   worked out by the nightly analysis job and kept on that day's row of analysis/dashboard (admin only), so the admin
   Records page opens with one read and a finished day's food safety part needs no more.

   cleanDay() reads a past day with the Cleaning page's own code, js/cleaning-core.js (24 Nov 2026; until then a copy
   lived here): a task due that day is Done, Missed, Unable to complete (with its note), Awaiting Pass check, or an
   event task (service, prep and service, food, use) that is never Missed. Past cleaning records cannot change (the rules
   let a completion be written only on its own day), so a counted day stays counted. When the core changes how a past
   day reads, bump CLEAN_V with it, so the nightly job counts every day again (tests/cleaning-core.test.js holds the
   results; the analysis job's CODE fingerprint covers the core too).

   Results by section (head chef, 26 Nov 2026, docs/cleaning-tracking-options/brief.md, step 1 of 4). CLEAN_V 2:
   - A day is counted only from the day the nightly run first finds Cleaning switched on for the team (cleanFrom, kept
     in analysis/current and on the board). Every other day is { cv, nc: 1 }: not counted. The run sees the switch once,
     at 03:00, so the day it was switched on is not counted and the next one is.
   - Each weekly or monthly job due that day (core.round(): the jobs whose row says how often) is kept one by one in r,
     by its root id, so a job that was moved keeps one history: its section, done, missed, unable or awaiting, and for
     a done job who did it and when. rn holds their whole counts; Unable to complete is apart from rn.due. Nightly jobs
     are in the whole-day counts above and not in r. Weekly Pack down steps are in r.
   - ro: for each section with a missed weekly or monthly job, who was on that section that day, as facts with their
     source: the chef's plan or a cook's own pick, each with its shift. Three states: listed, nobody, not kept (the
     run reads 8 weeks of plans and 30 days of picks). No judgement of who "closed": the page decides what to show. */
import { createRequire } from 'node:module';
const core = createRequire(import.meta.url)('../js/cleaning-core.js');
export const CLEAN_V = 2;
const ZONE = 10 * 3600000; // Queensland, UTC+10, no daylight saving
const LIST = 8;            // names kept per list; the counts are always whole
const ROUND = 40;          // weekly and monthly jobs kept per day; rn and rN are always whole
const STINTS = 12;         // people kept per section in ro
export function at(day, min) { const a = day.split('-'); return Date.UTC(+a[0], a[1] - 1, +a[2]) - ZONE + (min || 0) * 60000; }
export const dow = ms => new Date(ms + ZONE).getUTCDay();
export const clock = ms => { const d = new Date(ms + ZONE), p = n => (n < 10 ? '0' : '') + n; return p(d.getUTCHours()) + ':' + p(d.getUTCMinutes()); };
const text = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
const temp = v => typeof v === 'number' && Number.isFinite(v) && v >= -100 && v <= 100 ? v : null; // as recorded, never rounded or judged
export const qldDay = t => new Date(t + ZONE).toISOString().slice(0, 10);
const QLD = { at, dow, day: qldDay }; // the kitchen clock the core reads days with, as LK_TIME on a phone
export const due = (task, day) => core.due(task, day, QLD);
// A day the count does not cover: before the nightly run first found Cleaning switched on, or while it is off.
export const notCounted = () => ({ cv: CLEAN_V, nc: 1 });
// Who did a job that day and when: the latest tick or check recorded for it (the worker a shared screen asked for,
// else the signed-in recorder).
function doer(task, day, mine) {
  const last = mine.filter(r => r.task === task.id && typeof r.doneAt === 'number' && r.doneAt > 0).sort((a, b) => b.doneAt - a.doneAt)[0];
  return last ? { by: text(last.worker, 60) || text(last.doneBy, 60), at: clock(last.doneAt) } : { by: '', at: '' };
}
/* Who was on a section on a day, as facts: { n: name, sh: shift id, by: 'p' from the chef's plan or 'k' from a cook's
   own pick } (objects, because Firestore keeps no list inside a list).
   k: 'l' listed, 'n' nobody, 'x' not kept (the day is older than the plans the run read). pk 0 when the picks for
   that day were not read (older than 30 days), so only the plan is listed. team: { plans, picks, names, from: { plans,
   picks } }. Matched by section id: a section's name can change. A pick record marked auto with no log is the plan's
   own section copied to the phone (tmApply in js/prep.js), not a pick: it is skipped, so nobody is listed twice or
   given a pick they did not make. A log entry is always the person's own move. */
export function rostered(day, sec, team) {
  if (!team || !team.from || day < team.from.plans) return { s: sec, k: 'x' };
  const w = [], seen = {}, name = id => text((team.names || {})[id], 60) || 'Someone';
  const add = (id, sh, src) => { const k = id + '|' + sh + '|' + src; if (typeof id !== 'string' || !id || seen[k]) return; seen[k] = 1; w.push({ n: name(id), sh: text(sh, 40), by: src }); };
  (team.plans || []).forEach(t => { if (t && t.day === day && Array.isArray(t.on)) t.on.forEach(o => { if (o && o.sec === sec) add(o.id, o.sh, 'p'); }); });
  const pk = day >= team.from.picks;
  if (pk) (team.picks || []).forEach(x => {
    if (!x || x.day !== day) return;
    const log = Array.isArray(x.log) ? x.log : [];
    if (log.length) log.forEach(l => { if (l && l.sec === sec) add(x.by, l.sh, 'k'); }); else if (x.sec === sec && x.auto !== true) add(x.by, x.sh, 'k');
  });
  return { s: sec, k: w.length ? 'l' : 'n', pk: pk ? 1 : 0, w: w.slice(0, STINTS) };
}
export function cleanDay(tasks, done, day, team) {
  const out = { cv: CLEAN_V, due: 0, done: 0, miss: [], missN: 0, unable: [], unableN: 0, wait: [], waitN: 0, ev: 0, evRec: 0,
    r: [], rN: 0, rn: { due: 0, done: 0, miss: 0, unable: 0, wait: 0 } };
  const mine = (done || []).filter(r => r && r.day === day), missedIn = [];
  (tasks || []).filter(task => due(task, day)).forEach(task => {
    const name = text(task.text, 80) || 'A cleaning task', p = core.past(task, day, mine);
    out.due++;
    if (p.state === 'done') out.done++;
    else if (p.state === 'blocked') { out.unableN++; if (out.unable.length < LIST) out.unable.push({ t: name, n: text(p.note, 120) }); }
    else if (p.state === 'awaiting') { out.waitN++; if (out.wait.length < LIST) out.wait.push(name); }
    else if (p.state === 'event') { out.ev++; if (p.recorded) out.evRec++; }
    else { out.missN++; if (out.miss.length < LIST) out.miss.push(name); }
    // a weekly or monthly job, kept one by one under its root id (a moved job is a new revision with the same root)
    if (p.state === 'event' || !core.round(task)) return;
    const st = p.state === 'done' ? 'd' : p.state === 'blocked' ? 'u' : p.state === 'awaiting' ? 'w' : 'm', sec = task.shared ? '' : text(task.section, 40);
    out.rN++;
    if (st === 'u') out.rn.unable++; else { out.rn.due++; out.rn[st === 'd' ? 'done' : st === 'w' ? 'wait' : 'miss']++; }
    if (st === 'm' && sec && missedIn.indexOf(sec) < 0) missedIn.push(sec);
    if (out.r.length >= ROUND) return;
    const row = { k: text(task.root, 120) || text(task.id, 120), t: name, s: sec, sn: sec ? text(task.sectionName, 40) : '', st };
    if (st === 'd') Object.assign(row, doer(task, day, mine));
    if (st === 'u') row.n = text(p.note, 120);
    out.r.push(row);
  });
  if (team && missedIn.length) out.ro = missedIn.slice(0, 12).map(sec => rostered(day, sec, team));
  return out;
}
// When the board would be too large, the one-by-one detail goes and the whole counts stay; cut says so.
export function trimClean(c) { if (c && !c.nc && (c.r || c.ro)) { delete c.r; delete c.ro; c.cut = 1; } return c; }
/* The board (analysis/dashboard) has one size limit for everything on it. If its rows would pass `limit` bytes the
   cleaning detail is dropped, oldest day first, until they fit; the whole counts stay. A trimmed day is carried as
   counted like any other, so its detail does not come back. Returns how many days were trimmed. */
export function fitClean(rows, limit, bytes) {
  let n = 0;
  for (let i = 0; i < rows.length && bytes(rows) > limit; i++) { const c = rows[i] && rows[i].fs && rows[i].fs.c; if (c && !c.nc && (c.r || c.ro)) { trimClean(c); n++; } }
  return n;
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
