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
/* Today's team, step 4 (head chef, 7 Nov 2026): every section allocated or worked counts for training. teamsum/main
   holds the last 30 days' shifts worked per person and section (the chef's plans and each cook's own picks and moves),
   each person's usual section per weekday and shift from the last 8 weeks' plans, and who is In training on which
   section. Read by the chefs' pages (1 read), never by staff. Costs about 56 reads for the plans and one per person
   per day for the picks (about 360 for 12 people). */
export const TEAM_DAYS = 30, TEAM_WEEKS = 8;
const byId = list => list.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
const print = (prep, orders) => createHash('sha256').update(JSON.stringify([byId(prep), byId(orders)])).digest('hex').slice(0, 24);
const hash = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex').slice(0, 24);
/* Plan B 4.2 (7 Nov 2026, docs/firestore-usage.md): a normal night reads the lines of the last REUSE_DAYS days and of the
   older prep and order days a past-day fix names (config/main.pastEdit), and takes every other day from the published
   generation (analysisDaily, 1 read a day instead of its 40 to 90 lines). A day is read again whenever anything that
   goes into it may have changed: the code that works it out (CODE), the record links (references), its supplier
   orders, deliveries or functions (side, a fingerprint per day), its dashboard row or its digest. A full run reads
   every day: on Sundays (kitchen time), with options.full, after a past transfer fix (its stamp names no day) or a
   stamp that cannot tell. Past prep, order and (since 7 Nov 2026, wDays) wastage fixes name their days. */
export const REUSE_DAYS = 14;
const CODE = hash(['../js/analysis-core.js', './dashboard.mjs', './analysis.mjs'].map(f => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n'));
// the past days a stamp names as changed since `since`, like pastChanged() in js/prep.js: [] none, null cannot tell
function namedSince(pe, kind, since) {
  const p = +pe[kind] || 0, days = pe[kind + 'Days'];
  if (p <= since) return [];
  if (pe[kind + 'For'] !== p || !Array.isArray(days) || (+pe[kind + 'Prev'] || 0) > since) return null;
  return days.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
}
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
  const old = await K.collection('analysis').doc('current').get(), prev = old.exists ? old.data() : {};
  const health = await K.collection('analysis').doc('health').get();
  const isDay = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
  /* Plan B 4.1 (7 Nov 2026, docs/firestore-usage.md). The days before the book's first written day are empty, so they are
     not read again: 4 reads a day, about 280 a night until the 90-day window moves past the start (mid-January 2027).
     The first day is kept in analysis/current (first). A full run reads every day of the window again: on Sundays
     (kitchen time), with options.full, or when the first day is not known yet. It also catches a line written into a
     day before the first, and sweeps analysisDaily (below). */
  const full = !!options.full || new Date(at + 36000000).getUTCDay() === 0 || !isDay(prev.first);
  const skipBefore = full ? '' : prev.first;
  let first = '';
  const refs = await read(K.collection('references'));
  const suppliers = await read(K.collection('suppliers'));
  const recipes = await read(K.collection('recipes'));
  const guides = await read(K.collection('guides'));
  // For the Dashboard's Needs you: the people, sections and assessments the Review desk counts with (1 read + 1 per record).
  const cfgSnap = await K.collection('config').doc('main').get(); reads += 1;
  const cfg = cfgSnap.exists ? cfgSnap.data() : {};
  const training = await read(K.collection('training'));
  const refsPrint = hash(byId(refs));
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
  const days = [], dash = [], digests = [], side = {}, kept = {};
  const sideOf = day => hash([byId(orders.filter(x => x.day === day)), byId(deliveries.filter(x => x.day === day)), byId(functions.filter(x => x.date === day))]);
  const indexRef = K.collection('digest').doc('_index'), indexSnap = await indexRef.get(); reads += 1;
  const before = (indexSnap.exists && indexSnap.data().days) || {};
  // Plan B 4.2: which days can come from the published generation instead of their lines
  const pe = (cfg && cfg.pastEdit) || {}, since = +prev.at || 0, fixed = new Set();
  let reuse = !full && !!prev.generation && prev.code === CODE && prev.refsPrint === refsPrint && prev.days === window && since > 0;
  for (const kind of ['p', 'o', 'w']) { const d = reuse ? namedSince(pe, kind, since) : []; if (d === null) reuse = false; else d.forEach(x => fixed.add(x)); }
  if (reuse && (+pe.x || 0) > since) reuse = false;
  const oldRows = {}, oldDays = {};
  if (reuse && window > REUSE_DAYS) {
    const ob = await K.collection('analysis').doc('dashboard').get(); reads += 1;
    if (ob.exists && ob.data().generation === prev.generation) (ob.data().days || []).forEach(r => { if (r && isDay(r.day)) oldRows[r.day] = r; });
    const want = [];
    for (let i = window; i > REUSE_DAYS; i--) {
      const day = shift(today, -i);
      if (fixed.has(day) || (skipBefore && day < skipBefore) || !oldRows[day] || (prev.side || {})[day] !== sideOf(day) || (i <= DIGEST_DAYS && !before[day])) continue;
      want.push(day);
    }
    if (reads + want.length > budget) throw new Error('analysis-read-budget');
    const got = want.length ? await K.firestore.getAll(...want.map(d => K.collection('analysisDaily').doc(prev.generation + '_' + d))) : [];
    reads += want.length;
    got.forEach((sn, k) => { if (sn.exists && sn.data().day === want[k]) oldDays[want[k]] = sn.data(); });
  }
  let reused = 0;
  // Read the rolling window to pick up late corrections. Never trust an earlier learnlog claim as freshness.
  for (let i = window; i >= 1; i--) {
    const day = shift(today, -i), input = {};
    side[day] = sideOf(day);
    if (oldDays[day]) {
      // taken as published: lines unchanged by any fix the stamps name, and nothing else that goes into it changed
      if (!first && isDay(prev.first) && day >= prev.first) first = day;
      if (i <= DIGEST_DAYS) kept[day] = before[day];
      days.push(oldDays[day]); dash.push(oldRows[day]); reused++;
      continue;
    }
    for (const [source, col, sub] of [['prep', 'days', 'items'], ['orders', 'orders', 'lines'], ['waste', 'waste', 'lines'], ['transfers', 'transfers', 'lines']]) {
      input[source] = skipBefore && day < skipBefore ? [] : await read(K.collection(col).doc(day).collection(sub));
    }
    if (!first && (input.prep.length || input.orders.length || input.waste.length || input.transfers.length)) first = day;
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
  const teamFrom = shift(today, -7 * TEAM_WEEKS), shiftFrom = shift(today, -TEAM_DAYS);
  const plans = await read(K.collection('team').where('day', '>=', teamFrom).where('day', '<=', to));
  const picks = await read(K.collection('shifts').where('day', '>=', shiftFrom).where('day', '<=', to));
  // plain objects for Firestore (the shared code builds them without a prototype)
  const teamsum = JSON.parse(JSON.stringify({ v: 1, at, day: today, from: shiftFrom, to,
    days: core.teamStints(plans, picks, Array.isArray(cfg.kitSecs) ? cfg.kitSecs : [], shiftFrom, to),
    usual: core.teamUsual(plans, today, TEAM_WEEKS), learn: core.teamLearning(training, people, secs) }));
  if (bytes(teamsum) > 700000) throw new Error('analysis-teamsum-too-large');
  for (let i = 0; i < days.length; i += 8) {
    const batch = K.firestore.batch();
    for (const day of days.slice(i, i + 8)) batch.set(K.collection('analysisDaily').doc(generation + '_' + day.day), day);
    await batch.commit();
  }
  const batch = K.firestore.batch();
  for (const [n, data] of publications) batch.set(K.collection('analysis').doc('range-' + n), data);
  batch.set(K.collection('analysis').doc('dashboard'), board);
  batch.set(K.collection('teamsum').doc('main'), teamsum);
  batch.set(K.collection('analysis').doc('current'), { v: 1, generation, at, from, to, days: window, reads, references: refs.length, suppliers: suppliers.length, inventory, comparisonOnly: true, previous: prev.generation || '', previousFrom: isDay(prev.from) ? prev.from : '', previousTo: isDay(prev.to) ? prev.to : '', first, full, reused, code: CODE, refsPrint, side });
  batch.set(K.collection('analysis').doc('health'), { at, status: 'ok', generation, reads });
  await batch.commit();
  // The day digests, once everything above is published: only the days whose lines changed. A day taken from the
  // published generation keeps its digest as it is.
  const after = Object.assign({}, kept), write = [];
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
  /* Plan B 4.1: the generation before them is deleted by name, from the window analysis/current kept for it
     (previousFrom, previousTo: about 90 deletes and no reads). Reading every analysisDaily id cost up to 400 reads a
     night. That sweep still runs on a full run, after a cleanup that did not finish, and when the window is not known
     (a record from before this change), so a run that wrote its days and then failed leaves nothing behind for long. */
  const keep = new Set([generation, prev.generation || '']), drop = prev.previous || '';
  const pending = health.exists && health.data().cleanup === 'pending', named = isDay(prev.previousFrom) && isDay(prev.previousTo) && prev.previousFrom <= prev.previousTo;
  const cleanup = full || pending || (drop && !named) ? 'swept' : drop ? 'named' : 'none';
  let removed = 0;
  try {
    let refs = [];
    if (cleanup === 'swept') refs = (await K.collection('analysisDaily').select().limit(400).get()).docs.filter(d => !keep.has(d.id.split('_')[0])).map(d => d.ref);
    else if (cleanup === 'named' && !keep.has(drop)) for (let d = prev.previousFrom, n = 0; d <= prev.previousTo && n < 120; d = shift(d, 1), n++) refs.push(K.collection('analysisDaily').doc(drop + '_' + d));
    for (let i = 0; i < refs.length; i += 400) { const b = K.firestore.batch(); refs.slice(i, i + 400).forEach(r => b.delete(r)); await b.commit(); }
    removed = refs.length;
  } catch (e) { await K.collection('analysis').doc('health').set({ at, status: 'ok', generation, reads, cleanup: 'pending' }).catch(() => {}); }
  return { days: window, reads, full, first, reused, cleanup, removed, digests: { written: write.length, deleted: gone.length }, team: { days: teamsum.days.length, plans: plans.length, picks: picks.length } };
}
