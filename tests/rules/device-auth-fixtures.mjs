// Explicit daily device-auth fixtures. Negative expired/reset/missing cases remain the caller's responsibility.
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
export const anonymousClaims = { firebase: { sign_in_provider: 'anonymous' } };
export const anonContext = (env, uid) => env.authenticatedContext(uid, anonymousClaims);
export function nextFour(ms) { return Math.floor((ms + 21600000) / 86400000) * 86400000 + 86400000 - 21600000; }
export function dailySession(by, { pinAt = 1, at = Date.now(), exp, mode = 'personal' } = {}) {
  return { by, pinAt, exp: exp === undefined ? nextFour(at) : exp, at: Timestamp.fromMillis(at), issuedAt: Timestamp.fromMillis(at), mode, v: 2 };
}
export function adminGrant(session, { googleUid = 'google-owner', at = Date.now() } = {}) {
  return { by: session.by, pinAt: session.pinAt, issuedAt: session.issuedAt, exp: session.exp, googleUid, at: Timestamp.fromMillis(at), v: 2 };
}
export async function seedOwnerDevice(env, { pin = '000000', uid = 'owner', headId, googleUid = 'google-owner', at = Date.now(), mode = 'personal' } = {}) {
  if (!headId) throw new Error('The owner-device fixture needs an explicit canonical headId.');
  const root = `kitchens/${pin}/`, session = dailySession(headId, { at, mode });
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore(), config = await getDoc(doc(db, root + 'config/main'));
    if (!config.exists() || config.data().headId !== headId || !(config.data().staffIds || []).includes(headId)) throw new Error('Seed the canonical headId and active staffIds before its owner-device grant.');
    const set = await getDoc(doc(db, root + 'pinset/' + headId));
    if (!set.exists()) throw new Error('Seed the head PIN version before its owner-device grant.');
    session.pinAt = set.data().at;
    await setDoc(doc(db, root + 'sessions/' + uid), session);
    await setDoc(doc(db, root + 'adminDevices/' + uid), adminGrant(session, { googleUid, at }));
  });
  return session;
}
