/*
  The head chef's device with its daily PIN and owner grant saves after a sous chef (27 Oct 2026).
  Every recipe and drawing save writes book/index with merge, Draw it for me merges book/matches, and a Sent tick merges
  onto the round's record. W() in js/prep.js mirrors book/index and book/matches to publicBook in the same batch. A merge
  keeps the by already stored, so when a sous chef saved last the rules (bookBy(), the Sent rule) refused the head
  chef's next save, every time. W() now sends by '' on that device. The batches here are the book's own shapes
  (js/manage.js, js/draw.js, js/smart.js, js/functions.js, xWrite in js/prep.js) through a copy of W(), so a change to
  W() or to those rules that brings the refusal back shows here. Run with the other rules checks: npm test.
*/
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { anonContext, dailySession, adminGrant, seedOwnerDevice, nextFour } from './device-auth-fixtures.mjs';
import { readFileSync } from 'node:fs';

const PIN = '000000', OWNER = 'headchef@test.local', K = 'kitchens/' + PIN + '/';
const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8').replaceAll('KITCHEN_PIN', PIN).replaceAll('OWNER_EMAIL', OWNER);
const env = await initializeTestEnvironment({ projectId: 'demo-owner-saves', firestore: { rules } });
await env.clearFirestore();
const NOW = Date.now(), TODAY = new Date(NOW + 10 * 3600000).toISOString().slice(0, 10), T0 = Date.parse(TODAY + 'T08:00:00Z');
// Hedy is the head chef (headId), Sam a sous chef, Ann staff, Fay a function manager
const CFG = { people: [{ id: 'hd', role: 'head' }, { id: 'sam', role: 'sous' }, { id: 'ann', role: 'staff' }, { id: 'fay', role: 'fnc' }],
  headId: 'hd', sousIds: ['hd', 'sam'], pingIds: ['hd', 'sam'], staffIds: ['hd', 'sam', 'ann', 'fay'], fnIds: ['fay'], fnOnlyIds: ['fay'] };
const rulesOff = fn => env.withSecurityRulesDisabled(async c => fn(c.firestore()));
await rulesOff(async db => {
  await setDoc(doc(db, K + 'config/main'), CFG);
  for (const id of CFG.staffIds) {
    await setDoc(doc(db, K + 'pinset/' + id), { at: 1 });
    await setDoc(doc(db, K + 'sessions/u-' + id), dailySession(id,{at:NOW}));
  }
});
const phone = id => env.authenticatedContext('u-' + id, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const DB = { owner: anonContext(env,'g-owner').firestore(), sam: phone('sam'), ann: phone('ann') };
// the by W() sends: the PIN session's person, '' on the head chef's Google device. OLD is the W() before 27 Oct 2026,
// which left by out there (kept only to show the refusal it caused).
await seedOwnerDevice(env,{uid:'g-owner',headId:'hd',at:NOW});
const BY = { owner: 'hd', sam: 'sam', ann: 'ann' }, OLD = 'old';

/* W() from js/prep.js: by added to every set and update (a by the caller set wins), and the public mirror of a
   recipe, a drawing, book/index and book/matches in the same batch, with the same data and merge. */
function W(who, ops) {
  const db = DB[who === OLD ? 'owner' : who], by = who === OLD ? undefined : BY[who], b = writeBatch(db);
  for (const [kind, path, d, merge] of ops) {
    const ref = doc(db, K + path), parts = (K + path).split('/');
    const data = by === undefined ? d : Object.assign({ by }, d);
    const pub = parts.length === 4 && ({ book: 'publicBook', recipes: 'publicRecipes', drawings: 'publicDrawings' })[parts[2]];
    if (pub && (parts[2] !== 'book' || parts[3] === 'index' || parts[3] === 'matches')) {
      const m = doc(db, pub + '/' + parts[3]);
      if (kind === 'upd') b.update(m, data); else b.set(m, data, merge ? { merge: true } : {});
    }
    if (kind === 'upd') b.update(ref, data); else b.set(ref, data, merge ? { merge: true } : {});
  }
  return b.commit();
}
let fails = 0, n = 0;
function check(cond, msg, seen) { n++; if (cond) console.log('PASS ' + msg); else { fails++; console.log('FAIL ' + msg + ' (' + JSON.stringify(seen) + ')'); } }
async function server(path) { let v = null; await rulesOff(async db => { const s = await getDoc(doc(db, path)); v = s.exists() ? s.data() : null; }); return v; }

async function ok(p, allowed, msg) {
  n++;
  try { await (allowed ? assertSucceeds(p) : assertFails(p)); console.log('PASS ' + msg); }
  catch (e) { fails++; console.log('FAIL ' + msg + ' (' + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')'); }
}

// a recipe save (js/manage.js save()): the recipe set, the index merged, the earlier version kept
const recipe = (id, v, extra) => Object.assign({ r: { id, kind: 'main', name: 'Recipe ' + id, yield: 'Per plate', ingredients: [], pins: [], sections: [] }, v, upd: Date.now(), src: 'new', base: '', removed: false }, extra || {});
async function saveRecipe(who, id, extra) {
  const cur = await server(K + 'recipes/' + id), v = (cur ? cur.v : 0) + 1, t = Date.now(), rec = recipe(id, v, extra);
  const ops = [['set', 'recipes/' + id, rec], ['set', 'book/index', { r: { [id]: v }, upd: t }, true]];
  if (cur) { const was = {}; ['r', 'v', 'upd', 'by', 'src', 'base', 'removed', 'off'].forEach(k => { if (cur[k] !== undefined) was[k] = cur[k]; }); ops.push(['set', `recipes/${id}/hist/${cur.v}`, { was, at: t }]); }
  return W(who, ops);
}
// a drawing save (js/draw.js commit()): the drawing, its earlier version, the recipe's link (js/manage.js patchRecipe()),
// the index, and the Draw it for me picks (js/smart.js pendingOps())
const drawing = (rid, v) => ({ rid, slot: 'plate', name: 'Plate', vb: '-110 -110 220 220', k: 1, surf: { fam: 'plate', size: 30 }, els: [], defs: '{}', svgS: '<circle cx="0" cy="0" r="100" fill="#FFFFFF"/>', svgF: '<circle cx="0" cy="0" r="20" fill="#8E5A22"/>', alt: 'Top-down drawing', from: '', layout: { auto: 1 }, v, upd: Date.now(), removed: false });
async function saveDrawing(who, id, rid, pick) {
  const cur = await server(K + 'drawings/' + id), v = (cur ? cur.v : 0) + 1, t = Date.now();
  const rc = await server(K + 'recipes/' + rid), rv = rc.v + 1;
  const ops = [['set', 'drawings/' + id, drawing(rid, v)]];
  if (cur) { const was = {}; Object.keys(cur).forEach(k => { if (k !== 'by') was[k] = cur[k]; }); ops.push(['set', `drawings/${id}/hist/${cur.v}`, { was, at: t }]); }
  const was = {}; ['r', 'v', 'upd', 'by', 'src', 'base', 'removed', 'off'].forEach(k => { if (rc[k] !== undefined) was[k] = rc[k]; });
  ops.push(['set', 'recipes/' + rid, recipe(rid, rv, { r: Object.assign({}, rc.r, { art: '@' + id }) })], ['set', `recipes/${rid}/hist/${rc.v}`, { was, at: t }]);
  ops.push(['set', 'book/index', { d: { [id]: v }, r: { [rid]: rv }, upd: t }, true]);
  if (pick) ops.push(['set', 'book/matches', { m: pick, upd: t }, true]);
  return W(who, ops);
}

// 1. recipes: Sam saves, then the head chef's Google device saves the same recipe and a new one
await ok(saveRecipe('sam', 'burger'), true, 'book: Sam (sous chef) saves the burger, version 1');
check((await server(K + 'book/index')).by === 'sam', 'book: the index now names Sam', (await server(K + 'book/index')).by);
await ok(saveRecipe(OLD, 'burger'), false, 'book: the old W() (by left out) keeps Sam\'s id in the merged index, so the head chef\'s save is refused (why W() sends by empty)');
await ok(saveRecipe('owner', 'burger'), true, 'book: the head chef\'s Google device saves the burger after Sam, version 2');
const idx = await server(K + 'book/index'), pub = await server('publicBook/index');
check(idx.by === 'hd' && !!pub && pub.by === 'hd' && idx.r.burger === 2 && pub.r.burger === 2, 'book: the index and its public copy say version 2, saved by the head PIN identity', [idx.by, pub && pub.by]);
await ok(saveRecipe('sam', 'soup'), true, 'book: Sam adds a new recipe, the soup');
await ok(saveRecipe('owner', 'pie'), true, 'book: then the head chef\'s Google device adds a new recipe, the pie');
await ok(saveRecipe('sam', 'burger'), true, 'book: Sam saves the burger again after the head chef, version 3');

// 2. drawings and picks: Sam saves a drawing with a pick, then the head chef's Google device saves the next one
await ok(saveDrawing('sam', 'soup-plate', 'soup', { leek: 'leek-1' }), true, 'drawings: Sam saves the soup\'s plate with a pick');
await ok(saveDrawing(OLD, 'soup-plate', 'soup', { onion: 'onion-ring' }), false, 'drawings: the old W() is refused after Sam (index and picks keep his id)');
await ok(saveDrawing('owner', 'soup-plate', 'soup', { onion: 'onion-ring' }), true, 'drawings: the head chef\'s Google device saves the next version with a pick (the largest batch)');
await ok(W('sam', [['set', 'book/matches', { m: { chive: 'chive-1' }, upd: Date.now() }, true]]), true, 'matches: Sam saves a pick on its own');
await ok(W(OLD, [['set', 'book/matches', { m: { dill: 'dill-1' }, upd: Date.now() }, true]]), false, 'matches: the old W() is refused after Sam');
await ok(W('owner', [['set', 'book/matches', { m: { dill: 'dill-1' }, upd: Date.now() }, true]]), true, 'matches: the head chef\'s Google device saves a pick after Sam');
const mt = await server(K + 'book/matches');
check(mt.by === 'hd' && mt.m.chive === 'chive-1' && mt.m.dill === 'dill-1', 'matches: Sam\'s pick is kept, saved by the head PIN identity', mt);

// 3. a Sent tick (js/functions.js tickSent()): Ann ticks, takes it back, then the head chef's Google device ticks it
const at = T0 + 1800000, sid = `fnsent/f1_${at}`, sent = (on, sentBy, sentAt) => ({ fid: 'f1', at, day: TODAY, sent: on, sentAt, sentBy });
const annAt = Date.now();
await ok(W('ann', [['set', sid, sent(true, 'ann', annAt), true]]), true, 'sent: Ann ticks a round sent');
await ok(W('ann', [['set', sid, sent(false, 'ann', annAt), true]]), true, 'sent: Ann takes it back within 2 minutes');
await ok(W(OLD, [['set', sid, sent(true, 'hd', Date.now()), true]]), false, 'sent: the old W() is refused (the record still names Ann)');
await ok(W('owner', [['set', sid, sent(true, 'hd', Date.now()), true]]), true, 'sent: the head chef\'s Google device ticks the round Ann took back');

// 4. transfers (xWrite() in js/prep.js): the open copy must match the line as W() writes it, by included
const xline = { dir: 'out', venue: 'Riviera', person: 'Jo', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Ann', addedById: 'ann', addedAt: Date.now(), deleted: false };
function xWrite(who, id, data, original) {
  const record = Object.assign({}, original || {}, data);
  record.by = BY[who];
  return W(who, [[original ? 'upd' : 'set', `transfers/${TODAY}/lines/${id}`, Object.assign({}, data)],
    ['set', `transferOpen/${TODAY}_${id}`, { date: TODAY, lineId: id, record, open: !record.deleted && !record.returned }]]);
}
await ok(xWrite('ann', 'x1', xline), true, 'transfers: Ann logs a line with its open copy');
let xl = await server(K + `transfers/${TODAY}/lines/x1`);
await ok(xWrite('owner', 'x1', { deleted: true, deletedBy: 'Head chef', deletedAt: Date.now() }, xl), true, 'transfers: the head chef\'s Google device removes Ann\'s line, the open copy in step');
xl = await server(K + `transfers/${TODAY}/lines/x1`);
await ok(xWrite('owner', 'x1', { deleted: false, deletedBy: '', deletedAt: 0 }, xl), true, 'transfers: and puts it back');
xl = await server(K + `transfers/${TODAY}/lines/x1`);
await ok(xWrite('owner', 'x1', { returned: true, returnedBy: 'Head chef', returnedById: 'hd', returnedAt: Date.now() }, xl), true, 'transfers: and marks it returned');

// 5. a function cancel and its Undo (js/functions.js setStatus()), with the prep and order lines in the same batch
const fnRec = { v: 1, status: 'confirmed', name: 'Smith 50th', date: TODAY, start: T0, loc: 'Deck', guests: 30, mode: 'all',
  lines: [{ rid: 'pizza', name: 'Pizza Platter', unit: 'platter', spec: '', fp: '', qty: 2, u: [0, 0] }], rounds: [{ at: T0, note: '' }],
  notes: '', kc: '', kcBy: '', kcAt: 0, od: TODAY, first: T0, last: T0, from: T0 - 18 * 3600000, until: T0 + 7200000, kq: T0 + 7200000,
  was: {}, chg: [], cBy: 'fay', cAt: NOW - 86400000, confBy: 'fay', confAt: NOW - 86400000, by: 'fay', upd: NOW - 86400000 };
const pline = { text: 'Pizza Platter: Smith 50th, at 18:00', qty: '2 platters', station: 'Functions', recipe: 'pizza', fn: 'f2', dupOk: true };
const oline = { text: 'Function stock: Smith 50th', qty: '2 platters', recipes: ['pizza'], fn: 'f2', dupOk: true };
await rulesOff(async db => {
  await setDoc(doc(db, K + 'functions/f2'), fnRec);
  await setDoc(doc(db, K + `days/${TODAY}/items/fn-f2-pizza`), { ...pline, deleted: false, addedBy: 'Fay', addedById: 'fay', addedAt: NOW - 86400000, by: 'fay' });
  await setDoc(doc(db, K + `orders/${TODAY}/lines/fn-f2`), { ...oline, deleted: false, addedBy: 'Fay', addedById: 'fay', addedAt: NOW - 86400000, by: 'fay' });
});
async function setStatus(who, undo) {
  const before = await server(K + 'functions/f2'), me = BY[who], t = Date.now(), f = JSON.parse(JSON.stringify(before));
  if (undo) { const h = await server(K + `functions/f2/hist/${before.v - 1}`); f.od = h.was.od || ''; f.kq = h.was.kq; }
  f.status = undo ? 'confirmed' : 'cancelled'; f.v = before.v + 1; f.upd = t; f.by = me;
  if (!undo) { f.canBy = me; f.canAt = t; f.od = ''; }
  const what = undo ? 'Cancellation undone' : 'Cancelled';
  f.chg = [{ at: t, by: me, what }].concat((before.chg || []).slice(0, 7));
  return W(who, [['set', 'functions/f2', f], ['set', `functions/f2/hist/${before.v}`, { was: before, at: t, what }],
    ['set', `days/${TODAY}/items/fn-f2-pizza`, undo ? { ...pline, deleted: false, addedBy: 'Head chef', addedById: me, addedAt: t } : { ...pline, deleted: true, deletedBy: 'Head chef', deletedAt: t }, true],
    ['set', `orders/${TODAY}/lines/fn-f2`, undo ? { ...oline, deleted: false, addedBy: 'Head chef', addedById: me, addedAt: t } : { ...oline, deleted: true, deletedBy: 'Head chef', deletedAt: t }, true]]);
}
await ok(setStatus('owner', false), true, 'functions: the head chef\'s Google device cancels Fay\'s function (batch of 4)');
await ok(setStatus('owner', true), true, 'functions: and undoes it within 2 minutes');

await env.cleanup();
console.log(fails ? fails + ' of ' + n + ' owner save checks FAILED' : n + ' owner save checks passed.');
if (fails) process.exit(1);
