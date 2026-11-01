/* Shared prep reports on the real emulator. Authenticated recorder and reported worker stay separate. */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';

setLogLevel('silent');
const PIN = '000000', OWNER = 'headchef@test.local', K = `kitchens/${PIN}/`;
const source = process.env.RULES || new URL('../../firestore.rules', import.meta.url);
const rules = readFileSync(source, 'utf8').replaceAll('KITCHEN_PIN', PIN).replaceAll('OWNER_EMAIL', OWNER);
const env = await initializeTestEnvironment({ projectId: 'demo-prep-attribution', firestore: { rules } });
await env.clearFirestore();
const NOW = Date.now(), MIN = 60000, DAY = 86400000;
const today = new Date(NOW + 10 * 3600000).toISOString().slice(0, 10);
const role = (id, name, type, extra = {}) => ({ id, name, role: type, add: true, tick: true, del: false, active: true, ...extra });
const people = [role('hd', 'Hedy', 'head'), role('sam', 'Sam', 'sous'), role('ann', 'Ann', 'staff'), role('bo', 'Bo', 'staff'), role('lou', 'Lou', 'lead'),
  role('vic', 'Vic', 'view', { add: false, tick: false }), role('fay', 'Fay', 'fnc', { add: false, tick: false, fn: true }), role('past', 'Past worker', 'staff', { active: false })];
const ids = people.filter(p => p.active).map(p => p.id);
const cfg = { people, staffIds: ids, sousIds: ['hd', 'sam'], headId: 'hd', fnIds: ['fay'], fnOnlyIds: ['fay'] };
const roles = [
  { id: 'signedout', who: '', auth: false, allowed: false },
  { id: 'anonymous', who: '', auth: true, allowed: false },
  { id: 'expired', who: 'ann', auth: true, expired: true, allowed: false },
  { id: 'ann', who: 'ann', auth: true, allowed: true },
  { id: 'lou', who: 'lou', auth: true, allowed: true },
  // Per-person add/tick flags remain page-enforced, as in the current rules/client-shapes contract.
  { id: 'vic', who: 'vic', auth: true, allowed: true },
  { id: 'fay', who: 'fay', auth: true, allowed: false },
  { id: 'sam', who: 'sam', auth: true, allowed: true },
  { id: 'headpin', who: 'hd', auth: true, allowed: true },
  { id: 'owner', who: 'hd', auth: true, admin: true, allowed: true },
  { id: 'ownstaff', who: 'ann', auth: true, admin: true, allowed: true },
  { id: 'tablet', who: 'bo', auth: true, allowed: true }
];
// Google identity is separate from operational authentication. Only the head's exact device session has a grant;
// the remembered-Google staff case remains an ordinary staff session.
const dbs = Object.fromEntries(roles.map(r => [r.id, r.auth ? anonContext(env, r.id).firestore() : env.unauthenticatedContext().firestore()]));
const path = id => `days/${today}/items/${id}`;
const base = () => ({ text: 'Slice onions', station: 'Larder', qty: '2 tubs', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: NOW - MIN, done: false, deleted: false, by: 'ann' });
const report = (who = 'ann', changes = {}) => ({ done: true, doneBy: people.find(p => p.id === who)?.name || '', doneById: who, doneAt: NOW,
  preparedBy: 'Bo', preparedById: 'bo', preparedAt: NOW, by: who, ...changes });
const put = async (id, data) => env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), K + path(id)), data));
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + 'config/main'), cfg);
  for (const p of people) await setDoc(doc(db, K + 'pinset/' + p.id), { at: 1 });
  for (const r of roles) if (r.who) await setDoc(doc(db, K + 'sessions/' + r.id), dailySession(r.who, { at: r.expired ? NOW - DAY : NOW - MIN, mode: r.id === 'tablet' ? 'shared' : 'personal' }));
});
await seedOwnerDevice(env, { uid: 'owner', headId: 'hd', at: NOW - MIN });
let n = 0, fails = 0;
async function check(label, fn, allowed = true) {
  n++;
  try { await (allowed ? assertSucceeds(fn()) : assertFails(fn())); console.log('PASS ' + label); }
  catch (e) { fails++; console.log('FAIL ' + label + ': ' + String(e.message || e).split('\n')[0].slice(0, 180)); }
}
const write = (id, data, who = 'ann') => updateDoc(doc(dbs[who], K + path(id)), data);
try {
  for (const r of roles) {
    const id = 'matrix-' + r.id; await put(id, base());
    await check('reported prep completion keeps existing rule-level writer access: ' + r.id, () => write(id, report(r.who), r.id), r.allowed);
  }
  await put('self', base());
  await check('personal phone reports its own worker and authenticated recorder', () => write('self', report('ann', { preparedBy: 'Ann', preparedById: 'ann' })));
  await put('legacy', base());
  await check('old client tick without new metadata remains allowed', () => write('legacy', { done: true, doneBy: 'Ann', doneById: 'ann', doneAt: NOW, by: 'ann' }));
  const invalid = [
    ['unknown worker', { preparedById: 'missing' }], ['inactive worker', { preparedById: 'past', preparedBy: 'Past worker' }],
    ['functions-only worker', { preparedById: 'fay', preparedBy: 'Fay' }], ['empty worker id', { preparedById: '' }],
    ['empty worker name', { preparedBy: '' }], ['blank worker name', { preparedBy: '   ' }], ['oversized worker name', { preparedBy: 'a'.repeat(81) }],
    ['non-string worker name', { preparedBy: 7 }], ['non-string worker id', { preparedById: 7 }], ['oversized worker id', { preparedById: 'a'.repeat(81) }],
    ['missing cycle stamp', { preparedAt: 0 }], ['wrong cycle stamp', { preparedAt: NOW - 1 }], ['non-numeric cycle stamp', { preparedAt: String(NOW) }],
    ['spoofed recorder', { doneById: 'bo' }], ['spoofed writer', { by: 'bo' }]
  ];
  for (const [label, changes] of invalid) {
    const id = 'invalid-' + n; await put(id, base());
    await check('new report rejects ' + label, () => write(id, report('ann', changes)), false);
  }
  await check('new open line cannot invent completed worker metadata', () => setDoc(doc(dbs.ann, K + path('new-open')), { ...base(), preparedBy: 'Bo', preparedById: 'bo', preparedAt: NOW }), false);
  await check('new open line accepts explicit empty metadata', () => setDoc(doc(dbs.ann, K + path('new-empty')), { ...base(), preparedBy: '', preparedById: '', preparedAt: 0 }));
  await put('fixed', { ...base(), ...report() });
  for (const changes of [{ preparedBy: 'Sam', preparedById: 'sam' }, { preparedAt: NOW - 1 }, { preparedBy: '', preparedById: '', preparedAt: 0 }, { doneBy: 'Bo', doneById: 'bo' }]) {
    await check('already-done report and recorder stay immutable: ' + Object.keys(changes).join(','), () => write('fixed', { ...changes, by: 'ann' }), false);
  }
  await check('unrelated urgent edit preserves a completed report', () => write('fixed', { urgent: true, by: 'ann' }));
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), K + 'config/main'), { ...cfg, staffIds: ids.filter(id => id !== 'bo') }));
  await check('historical completed report survives the worker leaving', () => write('fixed', { urgent: false, by: 'ann' }));
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), K + 'config/main'), cfg));
  const clear = { done: false, doneBy: '', doneById: '', doneAt: 0, preparedBy: '', preparedById: '', preparedAt: 0, by: 'ann' };
  await check('authenticated recorder can Undo another worker report within two minutes', () => write('fixed', clear));
  await put('not-recorder', { ...base(), ...report() });
  await check('reported worker does not inherit recorder Undo permission', () => write('not-recorder', { ...clear, by: 'bo' }, 'tablet'), false);
  await put('late', { ...base(), ...report('ann', { doneAt: NOW - 3 * MIN, preparedAt: NOW - 3 * MIN }) });
  await check('ordinary recorder cannot Undo after the current time limit', () => write('late', clear), false);
  await check('sous chef retains late Undo', () => write('late', { ...clear, by: 'sam' }, 'sam'));
  await put('old-undo', { ...base(), ...report() });
  await check('old client Undo may carry unchanged old metadata inertly', () => write('old-undo', { done: false, doneBy: '', doneById: '', doneAt: 0, by: 'ann' }));
  await check('old client re-tick may carry unchanged old metadata with a new doneAt', () => write('old-undo', { done: true, doneBy: 'Ann', doneById: 'ann', doneAt: NOW + 20, by: 'ann' }));
  const legacy = (await getDoc(doc(dbs.ann, K + path('old-undo')))).data();
  await check('carried report stamp differs from legacy re-tick completion stamp', () => Promise.resolve(legacy.preparedAt !== legacy.doneAt ? true : Promise.reject(new Error('stale report became current'))));
  await put('open-stale', { ...base(), preparedBy: 'Bo', preparedById: 'bo', preparedAt: NOW - MIN });
  await check('new client re-tick replaces stale metadata with the new worker cycle', () => write('open-stale', report('ann', { preparedBy: 'Sam', preparedById: 'sam' })));
  await check('admin backup may preserve historical report data and its original recorder', () => setDoc(doc(dbs.owner, K + 'days/2020-01-01/items/copy'), { ...base(), ...report('ann', { preparedById: 'former', preparedBy: 'Former worker', doneAt: 1, preparedAt: 1 }) }));
  console.log(`${fails} failed of ${n} prep attribution rule checks`);
} finally { await env.cleanup(); }
if (fails) process.exitCode = 1;
