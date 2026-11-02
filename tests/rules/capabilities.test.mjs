// Canonical staff capabilities, checked with real SDK requests and synthetic records only.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, writeBatch, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';
setLogLevel('silent');
const model = createRequire(import.meta.url)('../../js/functions.js');
const source = process.env.RULES || new URL('../../firestore.rules', import.meta.url);
const rules = readFileSync(source, 'utf8').replaceAll('KITCHEN_PIN', '000000').replaceAll('OWNER_EMAIL', 'headchef@test.local');
const env = await initializeTestEnvironment({ projectId: 'demo-staff-capabilities', firestore: { rules } });
const K = 'kitchens/000000/', NOW = Date.now(), day = new Date(NOW + 36000000).toISOString().slice(0, 10);
const people = ['view', 'add', 'tick', 'del', 'staff', 'lead', 'sous', 'head', 'fn'].map(id => ({ id, name: id, role: id === 'view' ? 'view' : id === 'fn' ? 'fnc' : id === 'sous' || id === 'head' || id === 'lead' ? id : 'staff', active: true, add: id !== 'view' && id !== 'fn', tick: id !== 'view' && id !== 'fn', del: true }));
const config = { people, staffIds: people.map(p => p.id), sousIds: ['head', 'sous'], headId: 'head', fnIds: ['fn', 'view'], fnOnlyIds: ['fn'],
  addIds: ['add', 'staff', 'lead'], tickIds: ['tick', 'staff', 'lead'], delIds: ['del', 'lead'] };
const dbs = Object.fromEntries(people.map(p => [p.id, anonContext(env, p.id).firestore()]));
const prep = extra => ({ text: 'Synthetic prep', station: '', qty: '2 kg', addedBy: 'staff', addedById: 'staff', addedAt: NOW - 600000, done: false, deleted: false, by: 'staff', ...extra });
const order = extra => ({ text: 'Synthetic order', station: '', qty: '2 kg', addedBy: 'staff', addedById: 'staff', addedAt: NOW - 600000, ordered: false, deleted: false, by: 'staff', ...extra });
const put = async (path, value) => env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), K + path), value));
let n = 0, fails = 0;
async function check(label, fn, allowed) { n++; try { await (allowed ? assertSucceeds(fn()) : assertFails(fn())); console.log('PASS ' + label); } catch (e) { fails++; console.log('FAIL ' + label + ': ' + String(e.message || e).split('\n')[0].slice(0, 160)); } }
try {
  await env.clearFirestore(); await put('config/main', config);
  for (const p of people) { await put('pinset/' + p.id, { at: 1 }); await put('sessions/' + p.id, dailySession(p.id)); }
  await seedOwnerDevice(env, { uid: 'admin', headId: 'head' }); dbs.admin = anonContext(env, 'admin').firestore();
  for (const id of Object.keys(dbs)) {
    const actor = id === 'admin' ? 'head' : id, add = ['head', 'admin', 'add', 'staff', 'lead'].includes(id), tick = ['head', 'admin', 'tick', 'staff', 'lead'].includes(id), del = ['head', 'admin', 'del', 'lead'].includes(id);
    const p = `days/${day}/items/${id}`, o = `orders/${day}/lines/${id}`;
    await check(id + ': create prep follows Add', () => setDoc(doc(dbs[id], K + p), prep({ by: actor, addedById: actor, addedAt: NOW })), add);
    await check(id + ': create order follows Add', () => setDoc(doc(dbs[id], K + o), order({ by: actor, addedById: actor, addedAt: NOW })), add);
    await put(p, prep()); await put(o, order());
    await check(id + ': tick prep follows Tick', () => updateDoc(doc(dbs[id], K + p), { done: true, doneAt: NOW, doneBy: actor, doneById: actor, by: actor }), tick);
    await put(p, prep());
    await check(id + ': change prep words follows Add', () => updateDoc(doc(dbs[id], K + p), { text: 'Changed prep', by: actor }), add);
    await check(id + ': remove another prep line follows Delete', () => updateDoc(doc(dbs[id], K + p), { deleted: true, deletedBy: actor, deletedAt: NOW, by: actor }), del);
    await check(id + ': remove another order line needs chef and Delete', () => updateDoc(doc(dbs[id], K + o), { deleted: true, deletedBy: actor, deletedAt: NOW, by: actor }), ['head', 'admin'].includes(id));
    await check(id + ': log wastage follows Add', () => setDoc(doc(dbs[id], K + `waste/${day}/lines/${id}`), { text: 'Synthetic waste', amount: 1, unit: 'kg', reason: 'excess', by: actor }), add);
    const xp = `transfers/${day}/lines/${id}`, ix = `transferOpen/${day}_${id}`;
    const x = { dir: 'out', venue: 'Synthetic venue', person: 'Synthetic person', text: 'Synthetic stock', amount: 1, unit: 'kg', note: '', addedBy: actor, addedById: actor, addedAt: NOW, deleted: false, by: actor };
    await check(id + ': log transfer follows Add', () => { const b = writeBatch(dbs[id]); b.set(doc(dbs[id], K + xp), x); b.set(doc(dbs[id], K + ix), { date: day, lineId: id, record: x, open: true, by: actor }); return b.commit(); }, add);
    await put(xp, x); await put(ix, { date: day, lineId: id, record: x, open: true, by: actor });
    await check(id + ': confirm return follows Tick', () => { const b = writeBatch(dbs[id]), next = { ...x, returned: true, returnedBy: actor, returnedById: actor, returnedAt: NOW }; b.set(doc(dbs[id], K + xp), next); b.set(doc(dbs[id], K + ix), { date: day, lineId: id, record: next, open: false, by: actor }); return b.commit(); }, tick);
    await check(id + ': recording delivery keeps its all-login exception', () => setDoc(doc(dbs[id], K + 'deliveries/' + id), { day, receivedAt: NOW - 1000, recordedAt: NOW, supplier: 'Synthetic supplier', chilled: 0, frozen: -18, note: '', receivedBy: actor, receivedById: actor, by: actor }), true);
  }
  const start = Date.parse(day + 'T08:00:00Z'), fid = 'capability-event';
  const fn = { v: 1, status: 'confirmed', name: 'Synthetic event', date: day, start, loc: 'Room', guests: 20, mode: 'all', lines: [{ rid: 'pizza', name: 'Pizza', unit: 'platter', spec: '', fp: '', qty: 1, u: [0] }], rounds: [{ at: start, note: '' }], notes: '', kc: '', kcBy: '', kcAt: 0, first: start, last: start, from: start - 64800000, until: start + 7200000, kq: start + 7200000, was: {}, chg: [], cBy: 'view', cAt: NOW, confBy: 'view', confAt: NOW, by: 'view', upd: NOW };
  fn.effects = model.effects(fn, fid);
  fn.od = day;
  const legacy = { ...fn }; delete legacy.effects;
  await check('an old editor cannot create an unprepared booking after strict publication', () => setDoc(doc(dbs.view, K + 'functions/legacy-create'), legacy), false);
  await check('an old owner editor also cannot create an unprepared booking', () => setDoc(doc(dbs.admin, K + 'functions/legacy-owner-create'), legacy), false);
  const copied = { ...fn, v: 7, effects: model.effects(fn, 'prepared-copy') };
  await check('admin copies a prepared booking with its saved version and canonical effects', () => setDoc(doc(dbs.admin, K + 'functions/prepared-copy'), copied), true);
  await check('the prepared copied booking retains the complete effects and saved version', async () => { const d = (await getDoc(doc(dbs.admin, K + 'functions/prepared-copy'))).data(); if (d.v !== 7 || JSON.stringify(d.effects) !== JSON.stringify(copied.effects)) throw Error('Prepared copy changed.'); }, true);
  const generated = { ...fn.effects.prep['fn-' + fid + '-pizza'], deleted: false, addedBy: 'Functions', addedById: 'view', addedAt: NOW, by: 'view' };
  const generatedOrder = { ...fn.effects.order, deleted: false, addedBy: 'Functions', addedById: 'view', addedAt: NOW, by: 'view' };
  const fp = `days/${day}/items/fn-${fid}-pizza`, fo = `orders/${day}/lines/fn-${fid}`;
  await check('separate Functions authority retains generated prep and order batch for View only', () => { const b = writeBatch(dbs.view); b.set(doc(dbs.view, K + 'functions/' + fid), fn); b.set(doc(dbs.view, K + fp), generated); b.set(doc(dbs.view, K + fo), generatedOrder); return b.commit(); }, true);
  await check('Functions authority never grants an unpaired kitchen edit', () => updateDoc(doc(dbs.view, K + fp), { text: 'Unpaired change', by: 'view' }), false);
  await check('an old full booking save cannot erase canonical effects', () => setDoc(doc(dbs.view, K + 'functions/' + fid), { ...legacy, v: 2 }), false);
  const cancelAt = Date.now(), cancelled = { ...fn, v: 2, status: 'cancelled', canBy: 'sous', canAt: cancelAt, upd: cancelAt, od: '', by: 'sous' };
  for (const [label, path, extra, create] of [
    ['prep text', fp, { text: 'Unapproved words' }], ['prep qty', fp, { qty: '900 kg' }], ['prep recipe', fp, { recipe: 'other' }],
    ['new arbitrary prep identity', fp + '-other', {}, true], ['order text', fo, { text: 'Unapproved order' }], ['new arbitrary order identity', fo + '-other', {}, true]
  ]) {
    await env.withSecurityRulesDisabled(c => deleteDoc(doc(c.firestore(), K + 'functions/' + fid + '/hist/1')));
    cancelled.canAt = cancelled.upd = Date.now();
    await put('functions/' + fid, fn); await put(fp, generated); await put(fo, generatedOrder);
    await check('status-only chef cannot smuggle ' + label, () => { const b = writeBatch(dbs.sous); b.set(doc(dbs.sous, K + 'functions/' + fid), cancelled); b.set(doc(dbs.sous, K + 'functions/' + fid + '/hist/1'), { was: fn, at: cancelled.upd, by: 'sous', what: 'Cancelled' }); const value = { ...generated, deleted: true, deletedAt: cancelled.upd, deletedBy: 'sous', by: 'sous', ...extra, ...(create ? { addedBy: 'sous', addedById: 'sous', addedAt: cancelled.upd } : {}) }; b.set(doc(dbs.sous, K + path), value, { merge: !create }); return b.commit(); }, false);
  }
  await env.withSecurityRulesDisabled(c => deleteDoc(doc(c.firestore(), K + 'functions/' + fid + '/hist/1')));
  cancelled.canAt = cancelled.upd = Date.now();
  await put('functions/' + fid, fn); await put(fp, generated); await put(fo, generatedOrder);
  await check('chef cancellation with no ordinary Add or Functions grant retains its paired effects', () => { const b = writeBatch(dbs.sous); b.set(doc(dbs.sous, K + 'functions/' + fid), cancelled); b.set(doc(dbs.sous, K + 'functions/' + fid + '/hist/1'), { was: fn, at: cancelled.upd, by: 'sous', what: 'Cancelled' }); b.update(doc(dbs.sous, K + fp), { deleted: true, deletedBy: 'sous', deletedAt: cancelled.upd, by: 'sous' }); b.update(doc(dbs.sous, K + fo), { deleted: true, deletedBy: 'sous', deletedAt: cancelled.upd, by: 'sous' }); return b.commit(); }, true);
  for (const actor of ['sous', 'view']) {
    const id = 'largest-' + actor, at = Date.now() + 7 * 86400000, date = new Date(at + 36000000).toISOString().slice(0, 10);
    const large = { ...fn, mode: 'stag', date, od: date, start: at, first: at, last: at + 7 * 1200000, until: at + 8 * 1200000, kq: at + 8 * 1200000,
      lines: Array.from({ length: 12 }, (_, i) => ({ rid: 'platter-' + i, name: 'Platter ' + i, unit: 'platter', qty: 40, u: Array.from({ length: 40 }, (_, j) => Math.floor(j / 5)) })),
      rounds: Array.from({ length: 8 }, (_, i) => ({ at: at + i * 1200000, note: '' })) };
    large.effects = model.effects(large, id);
    const fullEditorBatch = (previous, next) => { const b = writeBatch(dbs.view);
      b.set(doc(dbs.view, K + 'functions/' + id), next);
      if (previous) b.set(doc(dbs.view, K + `functions/${id}/hist/${previous.v}`), { was: previous, at: next.upd, by: 'view' });
      b.set(doc(dbs.view, K + 'fncontact/' + id), { cname: 'Synthetic contact', phone: '', email: '', upd: next.upd, by: 'view' });
      for (const [key, body] of Object.entries(next.effects.prep)) b.set(doc(dbs.view, K + `days/${date}/items/${key}`), { ...body, deleted: false, addedBy: 'view', addedById: 'view', addedAt: next.upd, by: 'view' }, { merge: true });
      b.set(doc(dbs.view, K + `orders/${date}/lines/fn-${id}`), { ...next.effects.order, deleted: false, addedBy: 'view', addedById: 'view', addedAt: next.upd, by: 'view' }, { merge: true }); return b.commit(); };
    if (actor === 'view') await check('View+Functions creates the largest booking with 12 generated lines, order and contact', () => fullEditorBatch(null, large), true);
    else await put('functions/' + id, large);
    for (const [key, body] of Object.entries(large.effects.prep)) await put(`days/${date}/items/${key}`, { ...body, done: true, doneAt: 1, doneById: 'tick', deleted: false, addedById: 'view', addedAt: NOW });
    await put(`orders/${date}/lines/fn-${id}`, { ...large.effects.order, ordered: true, orderedAt: 1, deleted: false, addedById: 'view', addedAt: NOW });
    const statusBatch = (before, after) => { const b = writeBatch(dbs[actor]); b.set(doc(dbs[actor], K + 'functions/' + id), after); b.set(doc(dbs[actor], K + 'functions/' + id + '/hist/' + before.v), { was: before, by: actor, at: after.upd, what: 'Status changed' });
      const change = after.status === 'cancelled' ? { deleted: true, deletedBy: actor, deletedAt: after.upd, by: actor } : { deleted: false, addedBy: actor, addedById: actor, addedAt: after.upd, by: actor };
      for (const [key, body] of Object.entries(large.effects.prep)) b.set(doc(dbs[actor], K + `days/${date}/items/${key}`), { ...body, ...change }, { merge: true });
      b.set(doc(dbs[actor], K + `orders/${date}/lines/fn-${id}`), { ...large.effects.order, ...change }, { merge: true }); return b.commit(); };
    const t = Date.now(), c = { ...large, v: 2, status: 'cancelled', canBy: actor, canAt: t, upd: t, by: actor, od: '' };
    await check(actor + ': largest 12-line/8-round cancellation fits the exception budget', () => statusBatch(large, c), true);
    const restored = { ...c, v: 3, status: 'confirmed', upd: Date.now(), od: large.od, by: actor };
    await check(actor + ': largest 12-line/8-round Undo retains completion history', () => statusBatch(c, restored), true);
    if (actor === 'view') {
      const edited = { ...restored, v: 4, name: 'Changed synthetic largest event', upd: Date.now(), by: 'view' }; edited.effects = model.effects(edited, id);
      await check('View+Functions edits the largest booking with history, 12 generated lines, order and contact', () => fullEditorBatch(restored, edited), true);
    }
  }
  {
    const id = 'past-order', future = new Date(Date.now() + 2 * 86400000 + 36000000).toISOString().slice(0, 10), past = new Date(Date.now() - 2 * 86400000 + 36000000).toISOString().slice(0, 10);
    const before = { ...fn, date: future, od: past }; before.effects = model.effects(before, id);
    await put('functions/' + id, before);
    const prepId = Object.keys(before.effects.prep)[0], suffix = day.replace(/-/g, '');
    await put(`days/${future}/items/${prepId}`, { ...before.effects.prep[prepId], deleted: false, done: true, doneById: 'tick', doneAt: 1 });
    const t = Date.now(), after = { ...before, status: 'cancelled', v: 2, canBy: 'sous', canAt: t, upd: t, od: '', by: 'sous' };
    await check('status-only chef preserves a past order and creates its canonical cancellation notice', () => { const b = writeBatch(dbs.sous);
      b.set(doc(dbs.sous, K + 'functions/' + id), after); b.set(doc(dbs.sous, K + `functions/${id}/hist/1`), { was: before, by: 'sous', at: t });
      b.set(doc(dbs.sous, K + `days/${future}/items/${prepId}`), { ...before.effects.prep[prepId], deleted: true, deletedBy: 'sous', deletedAt: t, by: 'sous' }, { merge: true });
      b.set(doc(dbs.sous, K + `orders/${day}/lines/fn-${id}-x${suffix}`), { ...before.effects.cancel, deleted: false, addedBy: 'sous', addedById: 'sous', addedAt: t, by: 'sous' }, { merge: true }); return b.commit(); }, true);
    const at = Date.now(), restored = { ...after, status: 'confirmed', v: 3, upd: at, od: past, by: 'sous' };
    await check('status-only chef Undo preserves canonical correction notices and prior completion', () => { const b = writeBatch(dbs.sous);
      b.set(doc(dbs.sous, K + 'functions/' + id), restored); b.set(doc(dbs.sous, K + `functions/${id}/hist/2`), { was: after, by: 'sous', at });
      b.set(doc(dbs.sous, K + `days/${future}/items/${prepId}`), { ...before.effects.prep[prepId], deleted: false, addedBy: 'sous', addedById: 'sous', addedAt: at, by: 'sous' }, { merge: true });
      b.set(doc(dbs.sous, K + `orders/${day}/lines/fn-${id}-x${suffix}`), { ...before.effects.restore, deleted: true, deletedBy: 'sous', deletedAt: at, by: 'sous' }, { merge: true });
      b.set(doc(dbs.sous, K + `orders/${day}/lines/fn-${id}-r${suffix}`), { ...before.effects.restore, deleted: false, addedBy: 'sous', addedById: 'sous', addedAt: at, by: 'sous' }, { merge: true }); return b.commit(); }, true);
    const missingId = 'missing-effects', missingFn = { ...before }; delete missingFn.effects;
    const missingBodies = model.effects(missingFn, missingId), missingKey = Object.keys(missingBodies.prep)[0];
    await put('functions/' + missingId, missingFn); await put(`days/${future}/items/${missingKey}`, { ...missingBodies.prep[missingKey], deleted: false });
    await check('an unprepared legacy booking grants no status-only line fallback', () => { const b = writeBatch(dbs.sous), when = Date.now();
      b.set(doc(dbs.sous, K + 'functions/' + missingId), { ...missingFn, status: 'cancelled', v: 2, canBy: 'sous', canAt: when, upd: when, od: '', by: 'sous' });
      b.set(doc(dbs.sous, K + `functions/${missingId}/hist/1`), { was: missingFn, by: 'sous', at: when });
      b.update(doc(dbs.sous, K + `days/${future}/items/${missingKey}`), { deleted: true, deletedBy: 'sous', deletedAt: when, by: 'sous' }); return b.commit(); }, false);
  }
  for (const extra of [{ text: 'Smuggled words' }, { deleted: true }, { urgent: true }, { addedById: 'tick', addedAt: NOW }]) {
    await put(`days/${day}/items/mixed`, prep());
    await check('Tick cannot carry unrelated fields: ' + Object.keys(extra).join(','), () => updateDoc(doc(dbs.tick, K + `days/${day}/items/mixed`), { done: true, doneAt: NOW, doneById: 'tick', by: 'tick', ...extra }), false);
  }
  for (const kind of ['days', 'orders']) {
    const path = `${kind}/${day}/${kind === 'days' ? 'items' : 'lines'}/own`;
    for (const [label, extra, allowed] of [['own recent add', { addedById: 'add', addedAt: Date.now() }, true], ['other recorder', { addedById: 'staff', addedAt: NOW }, false], ['old add', { addedById: 'add', addedAt: NOW - 180000 }, false], ['future timestamp', { addedById: 'add', addedAt: NOW + 60000 }, false]]) {
      await put(path, (kind === 'days' ? prep : order)(extra));
      await check(kind + ': Undo ' + label, () => updateDoc(doc(dbs.add, K + path), { deleted: true, deletedBy: 'add', deletedAt: NOW, by: 'add' }), allowed);
    }
    await put(path, (kind === 'days' ? prep : order)());
    await check(kind + ': Add cannot claim original recorder', () => updateDoc(doc(dbs.add, K + path), { addedById: 'add', addedAt: NOW, by: 'add' }), false);
  }
  await check('sous chef cannot grant canonical Add', () => updateDoc(doc(dbs.sous, K + 'config/main'), { addIds: ['sous'], by: 'sous' }), false);
  await put('config/main', { ...config, people: people.map(p => ({ ...p, add: true, tick: true, del: true })) });
  await check('edited people flags do not grant Add', () => setDoc(doc(dbs.view, K + `days/${day}/items/forged`), prep({ by: 'view', addedById: 'view' })), false);
  await put('config/main', { ...config, addIds: [] });
  await check('canonical Add removal applies immediately', () => setDoc(doc(dbs.add, K + `days/${day}/items/revoked`), prep({ by: 'add', addedById: 'add' })), false);
  const missing = { ...config }; delete missing.addIds; delete missing.tickIds; delete missing.delIds;
  await put('config/main', missing);
  await check('missing canonical lists fail closed', () => setDoc(doc(dbs.staff, K + `days/${day}/items/missing`), prep({ by: 'staff', addedById: 'staff' })), false);
  await put('config/main', config);
  await check('an old full config save cannot erase canonical lists', () => setDoc(doc(dbs.admin, K + 'config/main'), missing), false);
} finally { await env.cleanup(); }
console.log(fails + ' failed of ' + n + ' canonical capability checks');
if (fails) process.exit(1);
