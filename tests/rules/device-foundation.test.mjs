// Temporary rollout rules retain the existing client while enabling device-bound v2 sessions and grants.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { anonymousClaims, nextFour, adminGrant } from './device-auth-fixtures.mjs';
setLogLevel('silent');
const PIN = '000000', OWNER = 'headchef@test.local', K = `kitchens/${PIN}/`, NOW = Date.now();
if (!process.env.RULES) throw new Error('Set RULES to the compatible foundation rules file. This rollout check is separate from the strict-policy suite.');
const source = process.env.RULES;
const rules = readFileSync(source, 'utf8').replaceAll('KITCHEN_PIN', PIN).replaceAll('OWNER_EMAIL', OWNER);
const env = await initializeTestEnvironment({ projectId: 'demo-device-foundation', firestore: { rules } });
await env.clearFirestore();
const google = env.authenticatedContext('google-owner', { email: OWNER, email_verified: true, auth_time: Math.floor(NOW / 1000), firebase: { sign_in_provider: 'google.com' } }).firestore();
const anon = uid => env.authenticatedContext(uid, anonymousClaims).firestore();
const raw = env.unauthenticatedContext().firestore();
const config = { headId: 'head', people: [{ id: 'head', name: 'Head', role: 'head', active: true }, { id: 'ann', name: 'Ann', role: 'staff', active: true }], staffIds: ['head', 'ann'], sousIds: ['head'], fnOnlyIds: [] };
const hash = id => createHash('sha256').update('lk:' + id + ':1111').digest('hex');
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + 'config/main'), config); await setDoc(doc(db, K + 'config/admins'), {});
  for (const id of ['head', 'ann']) { await setDoc(doc(db, K + 'pinset/' + id), { at: 1 }); await setDoc(doc(db, K + 'staffpins/' + id), { hash: hash(id) }); }
  await setDoc(doc(db, K + 'sessions/legacy-staff'), { by: 'ann', pinAt: 1, exp: NOW + 30 * 86400000, at: Timestamp.fromMillis(NOW) });
  await setDoc(doc(db, K + 'days/2026-01-01/items/old'), { text: 'Example past prep', done: false });
});
let n = 0;
const yes = async p => { await assertSucceeds(p); n++; }, no = async p => { await assertFails(p); n++; };
try {
  await yes(getDoc(doc(google, K + 'days/2026-01-01/items/old')));
  await yes(getDoc(doc(anon('legacy-staff'), K + 'config/main')));
  await yes(setDoc(doc(anon('legacy-staff'), K + 'sessions/legacy-staff'), { by: 'ann', pinAt: 1, exp: NOW + 30 * 86400000, at: serverTimestamp() }));
  const device = anon('new-primary');
  await yes(setDoc(doc(device, K + 'tries/head'), { uid: 'new-primary', tok: hash('head'), at: serverTimestamp() }));
  await yes(setDoc(doc(device, K + 'sessions/new-primary'), { by: 'head', pinAt: 1, exp: nextFour(Date.now()), at: serverTimestamp(), issuedAt: serverTimestamp(), mode: 'personal', v: 2 }));
  const session = (await getDoc(doc(device, K + 'sessions/new-primary'))).data();
  await yes(setDoc(doc(google, K + 'adminDevices/new-primary'), { ...adminGrant(session), at: serverTimestamp() }));
  await yes(getDoc(doc(device, K + 'config/admins')));
  await no(setDoc(doc(device, K + 'adminDevices/forged'), { ...adminGrant(session), at: serverTimestamp() }));
  await no(getDoc(doc(raw, K + 'days/2026-01-01/items/old')));
  await no(getDoc(doc(anon('no-pin'), K + 'days/2026-01-01/items/old')));
  console.log(`${n} foundation compatibility/grant checks passed.`);
} finally { await env.cleanup(); }
