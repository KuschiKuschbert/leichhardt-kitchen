/*
  Function sent, lines off (head chef, 14 Nov 2026, docs/fn-sent-tidy-options/brief.md). Run by nightly-learn.mjs at
  03:00 kitchen time, before the learning.

  The phones already show a sent function's open lines as off the lists (js/prep.js fnOffMark()). This takes them off for
  good, the way Remove does, with "Function sent" as who removed them, so the morning rollover never copies them and every
  record agrees. It asks js/functions.js the same questions the phones ask (allSentAt(), lineOff()), so the screen and the
  server never disagree: a function is all sent once every round has a Sent tick made on its day, no more than 4 hours
  before the round.

  It catches up over the last 7 days (a skipped night is done the next), touches only open lines that are not kept (Put
  back sets keep), and is safe to run twice. Each write carries the line's update time as a precondition, so a tick or a
  Put back made at the same moment is never overwritten: that line is left for the next night.

  Reads: one query of the last 7 days' Sent ticks; one read per function that has them; then, for each function that is
  all sent, four small queries a day from its day to today (prep lines by fn and by fnFor, order lines by id and by the
  root a rolled copy keeps): at least one read each, so about 8 to 36 reads a function a night, for 7 nights. Writes only
  lines that come off. When a past day changed, config/main.pastEdit is stamped (p for prep, o for orders), so a phone
  holding that day reads it again.
*/
import { FieldPath } from 'firebase-admin/firestore';
import { createRequire } from 'module';
const FN = createRequire(import.meta.url)('../js/functions.js');

const WINDOW = 7, MAX_DAYS = 9;
const ZONE = 10 * 3600000;
const pad = n => (n < 10 ? '0' : '') + n;
function shift(day, n) { const [y, m, d] = day.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.getUTCFullYear() + '-' + pad(t.getUTCMonth() + 1) + '-' + pad(t.getUTCDate()); }
function kitchenDay(ms) { const d = new Date(ms + ZONE); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }

// K: kitchens/<PIN>. today: the kitchen day (YYYY-MM-DD). Returns { functions, prep, orders, kept, skipped }.
export async function tidySentFunctions(K, today, opts = {}) {
  const t = opts.now || Date.now(), ID = FieldPath.documentId();
  const sent = await K.collection('fnsent').where('day', '>=', shift(today, -WINDOW)).get();
  const recs = {}, fids = new Set();
  sent.docs.forEach(d => { const x = d.data(); recs[d.id] = x; if (x && x.fid) fids.add(x.fid); });
  const rec = k => recs[k];
  const fns = [];
  for (const fid of fids) {
    const sn = await K.collection('functions').doc(fid).get();
    if (sn.exists) fns.push(Object.assign({}, sn.data(), { id: fid }));
  }
  const out = { functions: 0, prep: 0, orders: 0, kept: 0, skipped: 0 }, pastP = new Set(), pastO = new Set();
  async function take(doc, kind, day) {
    const x = Object.assign({}, doc.data(), { id: doc.id });
    if (x.keep && !x.deleted) { out.kept++; return; }
    if (!FN.lineOff(x, kind, fns, rec)) return;
    try {
      await doc.ref.update({ deleted: true, deletedBy: 'Function sent', deletedAt: t }, { lastUpdateTime: doc.updateTime });
      out[kind === 'p' ? 'prep' : 'orders']++;
      if (day < today) (kind === 'p' ? pastP : pastO).add(day);
    } catch (e) { out.skipped++; }   // changed since it was read (a tick, a Put back): left for the next night
  }
  for (const f of fns) {
    if (!FN.allSentAt(f, rec)) continue;
    out.functions++;
    const key = ('fn-' + f.id).slice(0, 120);
    for (let i = 0, day = f.date; i < MAX_DAYS && day <= today; i++, day = shift(day, 1)) {
      const items = K.collection('days').doc(day).collection('items'), lines = K.collection('orders').doc(day).collection('lines');
      const found = await Promise.all([
        items.where('fn', '==', f.id).get(),
        items.where('fnFor', 'array-contains', f.id).get(),
        lines.where(ID, '>=', key).where(ID, '<=', key + '').get(),
        lines.where('root', '>=', key).where('root', '<=', key + '').get()
      ]);
      const seen = new Set();
      for (const [j, sn] of found.entries()) for (const doc of sn.docs) {
        const kind = j < 2 ? 'p' : 'o', k = kind + doc.id;
        if (seen.has(k)) continue; seen.add(k);
        await take(doc, kind, day);
      }
    }
  }
  // a past day changed: the phones holding it read it again (js/prep.js markPast(), config/main.pastEdit)
  const stamp = {};
  if (pastP.size) stamp.p = t;
  if (pastO.size) stamp.o = t;
  if (Object.keys(stamp).length) await K.collection('config').doc('main').set({ pastEdit: stamp }, { merge: true });
  return out;
}

export { kitchenDay };
