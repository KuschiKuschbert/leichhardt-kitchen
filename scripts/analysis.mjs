// Rebuild replaceable daily contributions. Publish a complete generation only after every read succeeds.
import { createRequire } from 'node:module';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { dashDay } from './dashboard.mjs';
const core = createRequire(import.meta.url)('../js/analysis-core.js');
const shift = (day, n) => new Date(Date.parse(day + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const bytes = x => Buffer.byteLength(JSON.stringify(x));
/* Day digests (Plan B 2.1, 5 Nov 2026, docs/firestore-usage.md): one record per past kitchen day, digest/<day>, holding
   that day's prep and order lines as this run read them. The phones then read a past day for 1 read instead of one per
   line (40 to 60 a day). Built from the lines this run reads anyway, so the only extra read is digest/_index, which keeps
   a fingerprint per day: only days whose lines changed are written (about 60 the first night, then 1 to 3), and a day
   that left the window is deleted. A day too large for one record gets none, and the phones read its lines. */
export const DIGEST_DAYS = 60;
const byId = list => list.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const print = (prep, orders) => createHash('sha256').update(JSON.stringify([byId(prep), byId(orders)])).digest('hex').slice(0, 24);
export async function analyse(K, options = {}) {
  const at = options.at || Date.now(), today = new Date(at + 36000000).toISOString().slice(0, 10);
  const window = options.days || 90, budget = options.budget || 15000;
  if (!Number.isInteger(window) || window < 1 || window > 90) throw new Error('invalid-analysis-window');
  const from = shift(today, -window), to = shift(today, -1), generation = at.toString(36) + randomBytes(4).toString('hex');
  let reads = 0;
  async function read(q) {
    const remaining = budget - reads;
    if (remaining < 1) throw new Error('analysis-read-budget');
    const sn = await q.limit(remaining + 1).get(); reads += Math.max(1, sn.size);
    if (reads > budget) throw new Error('analysis-read-budget');
    return sn.docs.map(d => ({ ...d.data(), id: d.id }));
  }
  const old = await K.collection('analysis').doc('current').get();
  const refs = await read(K.collection('references'));
  const suppliers = await read(K.collection('suppliers'));
  const recipes = await read(K.collection('recipes'));
  const guides = await read(K.collection('guides'));
  // For the Dashboard's Needs you: the people, sections and assessments the Review desk counts with (1 read + 1 per record).
  const cfgSnap = await K.collection('config').doc('main').get(); reads += 1;
  const cfg = cfgSnap.exists ? cfgSnap.data() : {};
  const training = await read(K.collection('training'));
  const bundled = { window: {} };
  runInNewContext(readFileSync(new URL('../js/data.js', import.meta.url), 'utf8'), bundled, { timeout: 1000 });
  const recipeIds = new Set(bundled.window.LK_DATA.recipes.map(r => r.id));
  recipes.forEach(r => { if (r.removed) recipeIds.delete(r.id); else recipeIds.add(r.id); });
  const inventory = { recipes: recipeIds.size, uploadedGuides: guides.filter(g => !g.removed).length, bundledGuides: 2, supplierItems: suppliers.reduce((n, s) => n + (s.items || []).filter(x => !x.archived).length, 0), references: refs.length };
  const orders = [];
  for (const supplier of suppliers) {
    const records = await read(K.collection('suppliers').doc(supplier.id).collection('orders').where('day', '>=', from).where('day', '<=', to));
    for (const record of records) for (const [i, line] of (record.lines || []).entries()) orders.push({ ...line, sid: supplier.id, day: record.day, id: record.id + ':' + i, text: line.name, tst: record.tst || line.tst });
  }
  const deliveries = await read(K.collection('deliveries').where('day', '>=', from).where('day', '<=', to));
  const functions = await read(K.collection('functions').where('date', '>=', from).where('date', '<=', to));
  const days = [], dash = [], digests = [];
  // Read the whole rolling window to pick up late corrections. Never trust an earlier learnlog claim as freshness.
  for (let i = window; i >= 1; i--) {
    const day = shift(today, -i), input = {};
    for (const [source, col, sub] of [['prep', 'days', 'items'], ['orders', 'orders', 'lines'], ['waste', 'waste', 'lines'], ['transfers', 'transfers', 'lines']]) {
      input[source] = await read(K.collection(col).doc(day).collection(sub));
    }
    if (i <= DIGEST_DAYS) digests.push({ day, prep: byId(input.prep), orders: byId(input.orders) });
    input.supplierOrders = orders.filter(x => x.day === day);
    input.deliveries = deliveries.filter(x => x.day === day);
    input.functions = functions.filter(x => x.date === day);
    const contribution = core.daily(day, input, refs);
    // Fail visibly rather than quietly dropping large days or claiming incomplete coverage.
    if (bytes(contribution) > 700000) throw new Error('analysis-day-too-large');
    days.push(contribution);
    dash.push(dashDay(day, input));
  }
  const publications = [];
  for (const n of [7, 30, 90]) {
    const selected = days.slice(-n), all = core.aggregate(selected);
    const items = all.items.slice(0, 200), totalItems = all.items.length;
    const data = { v: 1, generation, at, from: selected[0].day, to, days: selected.length,
      ...all, items, totalItems, truncated: totalItems > items.length,
      dates: selected.map(d => ({ day: d.day, counts: d.counts, excluded: d.excluded, quality: d.quality })) };
    if (bytes(data) > 700000) throw new Error('analysis-summary-too-large');
    publications.push([String(n), data]);
  }
  // The admin Dashboard reads this one record (one read) instead of 60 days of lines. Admin only, like every analysis record.
  const board = { v: 1, generation, at, from, to, days: dash };
  // Needs you: the Review desk's two queues, counted with the same shared code (js/analysis-core.js). Counts only, no names.
  const pub = Object.fromEntries(publications);
  const people = (Array.isArray(cfg.people) ? cfg.people : []).filter(p => p && typeof p.id === 'string' && p.active !== false).map(p => ({ id: p.id, name: String(p.name || '') }));
  const secs = (Array.isArray(cfg.kitSecs) ? cfg.kitSecs : []).filter(x => x && !x.off && typeof x.name === 'string' && x.name.trim()).map(x => x.name);
  const queue = core.trainingQueue(pub['30'], training, people, secs);
  board.needs = { links: core.linkQueue(pub['90'], refs).length, training: queue.length, inTraining: queue.filter(o => o.assessment && o.assessment.status === 'in-training').length };
  if (bytes(board) > 700000) throw new Error('analysis-dashboard-too-large');
  for (let i = 0; i < days.length; i += 8) {
    const batch = K.firestore.batch();
    for (const day of days.slice(i, i + 8)) batch.set(K.collection('analysisDaily').doc(generation + '_' + day.day), day);
    await batch.commit();
  }
  const batch = K.firestore.batch();
  for (const [n, data] of publications) batch.set(K.collection('analysis').doc('range-' + n), data);
  batch.set(K.collection('analysis').doc('dashboard'), board);
  batch.set(K.collection('analysis').doc('current'), { v: 1, generation, at, from, to, days: window, reads, references: refs.length, suppliers: suppliers.length, inventory, comparisonOnly: true, previous: old.exists ? old.data().generation : '' });
  batch.set(K.collection('analysis').doc('health'), { at, status: 'ok', generation, reads });
  await batch.commit();
  // The day digests, once everything above is published: only the days whose lines changed.
  const indexRef = K.collection('digest').doc('_index'), indexSnap = await indexRef.get(); reads += 1;
  const before = (indexSnap.exists && indexSnap.data().days) || {}, after = {}, write = [];
  for (const d of digests) {
    const fp = print(d.prep, d.orders), record = { v: 1, day: d.day, at, prep: d.prep, orders: d.orders };
    if (bytes(record) > 700000) continue;   // no digest: the phones read this day's lines
    after[d.day] = fp;
    if (before[d.day] !== fp) write.push(record);
  }
  const gone = Object.keys(before).filter(day => !after[day] && /^\d{4}-\d{2}-\d{2}$/.test(day));
  for (let i = 0; i < write.length; i += 8) {
    const b = K.firestore.batch();
    for (const record of write.slice(i, i + 8)) b.set(K.collection('digest').doc(record.day), record);
    await b.commit();
  }
  const last = K.firestore.batch();
  gone.forEach(day => last.delete(K.collection('digest').doc(day)));
  last.set(indexRef, { v: 1, at, days: after });
  await last.commit();
  // Keep the published generation and its predecessor. A reader can finish an evidence request during refresh.
  const keep = new Set([generation, old.exists ? old.data().generation : '']);
  try {
  const obsolete = await K.collection('analysisDaily').select().limit(400).get();
  const gone = obsolete.docs.filter(d => !keep.has(d.id.split('_')[0]));
  for (let i = 0; i < gone.length; i += 400) { const b = K.firestore.batch(); gone.slice(i, i + 400).forEach(d => b.delete(d.ref)); await b.commit(); }
  } catch (e) { await K.collection('analysis').doc('health').set({ at, status: 'ok', generation, reads, cleanup: 'pending' }).catch(() => {}); }
  return { days: window, reads, digests: { written: write.length, deleted: gone.length } };
}
