// The admin Dashboard's numbers for one finished kitchen day, built by the nightly analysis job from the lines it
// already reads (no extra reads). Counted the way the admin Insights and Wastage pages count, so the numbers agree:
// written lines are not rolled copies, ticked counts every ticked line, rolled counts carried-over copies, and the
// time to tick is from writing a line to ticking it. Deleted lines and practice lines (tst) are left out.
// Waste is lines and amounts only: never prices (the repository is public and AVC Live costs stay out of the book).
const SEC = 'General';
const text = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 80);
const live = x => x && !x.deleted && !x.tst;
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
const rolledN = x => Math.max(0, (x.rolled || 0) - (x.ahead ? 1 : 0));

export function dashDay(day, input) {
  const p = { n: 0, w: 0, t: 0, r: 0, sec: {}, mins: {} };
  for (const x of input.prep || []) {
    if (!live(x)) continue;
    p.n++;
    const sec = text(x.station) || SEC;
    if (x.rolled) { if (rolledN(x)) p.r++; }
    else { p.w++; bump(p.sec, sec); }
    if (x.done) {
      p.t++;
      // Minutes from written to ticked, per section, so any period and section can take a true median.
      if (!x.rolled && typeof x.addedAt === 'number' && typeof x.doneAt === 'number' && x.doneAt > x.addedAt) {
        (p.mins[sec] = p.mins[sec] || []).push(Math.max(1, Math.round((x.doneAt - x.addedAt) / 60000)));
      }
    }
  }
  const w = { n: 0, reason: {}, sec: {}, items: {} };
  for (const x of input.waste || []) {
    if (!live(x)) continue;
    w.n++;
    bump(w.reason, text(x.reason) || 'none');
    bump(w.sec, text(x.station) || SEC);
    const name = text(x.text);
    if (!name) continue;
    // One row per item and unit. An amount that is not a number is counted as a line only.
    const unit = text(x.unit), key = name.toLowerCase() + '|' + unit.toLowerCase();
    const it = w.items[key] = w.items[key] || { t: name, u: unit, a: 0, n: 0 };
    it.n++;
    if (typeof x.amount === 'number' && Number.isFinite(x.amount) && x.amount > 0) it.a = Math.round((it.a + x.amount) * 1000) / 1000;
  }
  const x = { out: 0, in: 0 };
  for (const t of input.transfers || []) { if (live(t)) bump(x, t.dir === 'in' ? 'in' : 'out'); }
  return { day, p, w: { n: w.n, reason: w.reason, sec: w.sec, items: Object.values(w.items) }, x };
}

