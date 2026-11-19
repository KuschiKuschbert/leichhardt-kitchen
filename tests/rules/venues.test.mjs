/* Two admins at a venue (19 Nov 2026, docs/venues.md), on the real emulator, at both venues.
   Leichhardt's shape: the owner and the platform owner are one person (PLATFORM_EMAIL is OWNER_EMAIL, PLATFORM_ID is
   empty), so every rule is as it was. A second venue's shape: the venue's head chef is the owner (OWNER_EMAIL with the
   headId PIN), the platform owner is admin through his own profile there (PLATFORM_EMAIL with PLATFORM_ID's PIN), and
   the venue's admin can neither change, lock out nor reset the PIN of that profile. Every role at each venue: signed
   out, the kitchen PIN alone, staff, view only, functions only, sous chef, head chef PIN, venue admin, platform owner
   PIN, platform admin, and a wrong or unverified Google account. Made-up names and emails only. */
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { anonContext, adminGrant, nextFour } from './device-auth-fixtures.mjs';
setLogLevel('silent');

const PIN = '000000', K = `kitchens/${PIN}/`, NOW = Date.now();
const TEMPLATE = readFileSync(process.env.RULES || new URL('../../firestore.rules', import.meta.url), 'utf8');
// The publish workflow's fill (.github/workflows/publish-rules.yml, Fill in the template), as text.
export function fill(src, { pin, owner, platform, platformId }) {
  return src.replaceAll('KITCHEN_PIN', pin).replaceAll('OWNER_EMAIL', owner).replaceAll('PLATFORM_EMAIL', platform).replaceAll('PLATFORM_ID', platformId);
}
const hash = id => createHash('sha256').update('lk:' + id + ':1111').digest('hex');
const person = (id, role) => ({ id, name: id.toUpperCase(), role, active: true });
let n = 0, fails = 0;
async function check(label, fn, yes = true) {
  n++;
  try { await (yes ? assertSucceeds(fn()) : assertFails(fn())); console.log('PASS ' + label); }
  catch (e) { fails++; console.log('FAIL ' + label + ': ' + String(e.message || e).split('\n')[0].slice(0, 160)); }
}

async function venue(name, { owner, platform, platformId, cfg }) {
  const env = await initializeTestEnvironment({ projectId: 'demo-venue-' + name, firestore: { rules: fill(TEMPLATE, { pin: PIN, owner, platform, platformId }) } });
  await env.clearFirestore();
  const off = fn => env.withSecurityRulesDisabled(c => fn(c.firestore()));
  const put = (path, data) => off(d => setDoc(doc(d, K + path), data));
  const roster = c => Object.fromEntries(['people', 'headId', 'staffIds', 'sousIds', 'fnIds', 'fnOnlyIds'].map(k => [k, c[k]]));
  await off(async d => {
    await setDoc(doc(d, K + 'config/main'), cfg); await setDoc(doc(d, K + 'login/roster'), roster(cfg)); await setDoc(doc(d, K + 'config/admins'), {});
    for (const id of cfg.staffIds) { await setDoc(doc(d, K + 'pinset/' + id), { at: 1 }); await setDoc(doc(d, K + 'staffpins/' + id), { hash: hash(id) }); }
    await setDoc(doc(d, K + 'days/2020-01-01/items/private'), { text: 'Sample line', done: false });
    await setDoc(doc(d, 'publicBook/index'), { r: {} });
  });
  const db = uid => anonContext(env, uid).firestore();
  const google = (uid, email, x = {}) => env.authenticatedContext(uid, { email, email_verified: true, auth_time: Math.floor(Date.now() / 1000), firebase: { sign_in_provider: 'google.com' }, ...x }).firestore();
  async function issue(uid, id) {
    await put('tries/' + id, { uid, tok: hash(id), at: Timestamp.fromMillis(Date.now()) });
    await setDoc(doc(db(uid), K + 'sessions/' + uid), { by: id, pinAt: 1, exp: nextFour(Date.now()), at: serverTimestamp(), issuedAt: serverTimestamp(), mode: 'personal', v: 2 });
    return (await getDoc(doc(db(uid), K + 'sessions/' + uid))).data();
  }
  const grant = (g, googleUid, uid, s) => setDoc(doc(g, K + 'adminDevices/' + uid), { ...adminGrant(s, { googleUid }), at: serverTimestamp() });
  return { env, off, put, roster, db, google, issue, grant, cfg };
}
const privateRead = d => getDoc(doc(d, K + 'days/2020-01-01/items/private'));
const admins = d => getDoc(doc(d, K + 'config/admins'));

// Leichhardt's shape: one owner, PLATFORM_ID empty. Every role keeps what it had.
{
  const OWNER = 'owner@test.local';
  const cfg = { people: [person('head', 'head'), person('sous', 'sous'), person('staff', 'staff'), person('view', 'view'), person('fn', 'fnc')],
    headId: 'head', staffIds: ['head', 'sous', 'staff', 'view', 'fn'], sousIds: ['head', 'sous'], pingIds: ['head', 'sous'], fnIds: ['fn'], fnOnlyIds: ['fn'],
    addIds: ['staff'], tickIds: ['staff'], delIds: [], pinOpen: {} };
  const V = await venue('leichhardt', { owner: OWNER, platform: OWNER, platformId: '', cfg });
  try {
    const owner = V.google('google-owner', OWNER), wrong = V.google('google-wrong', 'other@test.local'), unverified = V.google('google-unverified', OWNER, { email_verified: false });
    await check('Leichhardt, signed out: the public recipe index only', () => getDoc(doc(V.env.unauthenticatedContext().firestore(), 'publicBook/index')));
    await check('Leichhardt, signed out: no kitchen settings', () => getDoc(doc(V.env.unauthenticatedContext().firestore(), K + 'config/main')), false);
    await check('Leichhardt, the kitchen PIN alone: no private records', () => privateRead(V.db('pin-only')), false);
    await check('Leichhardt, the kitchen PIN alone: the name picker roster', () => getDoc(doc(V.db('pin-only'), K + 'login/roster')));
    const staff = await V.issue('d-staff', 'staff'), view = await V.issue('d-view', 'view'), fn = await V.issue('d-fn', 'fn'), sous = await V.issue('d-sous', 'sous');
    await check('Leichhardt, staff: reads the kitchen', () => privateRead(V.db('d-staff')));
    await check('Leichhardt, view only: reads the kitchen', () => privateRead(V.db('d-view')));
    await check('Leichhardt, functions only: no kitchen records', () => privateRead(V.db('d-fn')), false);
    await check('Leichhardt, staff: not admin', () => admins(V.db('d-staff')), false);
    await check('Leichhardt, sous chef: not admin', () => admins(V.db('d-sous')), false);
    await check('Leichhardt, sous chef: takes a staff member off the list', () => updateDoc(doc(V.db('d-sous'), K + 'config/main'), { staffIds: cfg.staffIds.filter(x => x !== 'view'), by: 'sous' }));
    await V.off(d => setDoc(doc(d, K + 'config/main'), cfg));
    const head = await V.issue('d-head', 'head');
    await check('Leichhardt, head chef PIN alone: not admin', () => admins(V.db('d-head')), false);
    await check('Leichhardt, the owner\'s Google alone verifies itself', () => admins(owner));
    await check('Leichhardt, the owner\'s Google alone: no private records', () => privateRead(owner), false);
    await check('Leichhardt, a wrong Google account: not the owner', () => admins(wrong), false);
    await check('Leichhardt, an unverified Google account cannot grant', () => V.grant(unverified, 'google-unverified', 'd-head', head), false);
    await check('Leichhardt, the owner cannot grant a staff session', () => V.grant(owner, 'google-owner', 'd-staff', staff), false);
    await check('Leichhardt, the owner grants the head chef\'s session', () => V.grant(owner, 'google-owner', 'd-head', head));
    const admin = V.db('d-head');
    await check('Leichhardt, admin: reads config/admins', () => admins(admin));
    await check('Leichhardt, admin: changes anyone\'s lists', () => updateDoc(doc(admin, K + 'config/main'), { addIds: ['staff', 'view'], by: 'head' }));
    await check('Leichhardt, admin: opens a PIN set-up window', () => updateDoc(doc(admin, K + 'config/main'), { 'pinOpen.staff': Date.now() + 60000, by: 'head' }));
    await check('Leichhardt, admin: resets a staff PIN', () => { const b = writeBatch(admin); b.delete(doc(admin, K + 'staffpins/view')); b.delete(doc(admin, K + 'pinset/view')); return b.commit(); });
    await check('Leichhardt, admin: ends another device\'s session', () => deleteDoc(doc(admin, K + 'sessions/d-view')));
    await check('Leichhardt, admin: writes the roster', () => setDoc(doc(admin, K + 'login/roster'), V.roster(cfg)));
    await check('Leichhardt, the owner\'s Google takes back a grant', () => deleteDoc(doc(owner, K + 'adminDevices/d-other')));
    await check('Leichhardt, admin: may delete the kitchen settings, as before', () => deleteDoc(doc(admin, K + 'config/main')));
    void view; void fn; void sous;
  } finally { await V.env.cleanup(); }
}

// A second venue's shape: the venue's head chef owns it, the platform owner has his own profile 'plat'.
{
  const HEAD = 'headchef@venue.test', PLATFORM = 'platform@test.local';
  const cfg = { people: [person('hc', 'head'), person('plat', 'sous'), person('sous', 'sous'), person('staff', 'staff'), person('view', 'view'), person('fn', 'fnc')],
    headId: 'hc', staffIds: ['hc', 'plat', 'sous', 'staff', 'view', 'fn'], sousIds: ['hc', 'plat', 'sous'], pingIds: ['hc', 'plat'], fnIds: ['fn'], fnOnlyIds: ['fn'],
    addIds: ['plat', 'staff'], tickIds: ['plat', 'staff'], delIds: ['plat'], pinOpen: {} };
  const V = await venue('second', { owner: HEAD, platform: PLATFORM, platformId: 'plat', cfg });
  try {
    const head = V.google('google-head', HEAD), plat = V.google('google-plat', PLATFORM), wrong = V.google('google-wrong', 'other@test.local');
    const unverified = V.google('google-unverified', PLATFORM, { email_verified: false });
    await check('venue, signed out: no kitchen settings', () => getDoc(doc(V.env.unauthenticatedContext().firestore(), K + 'config/main')), false);
    await check('venue, the kitchen PIN alone: no private records', () => privateRead(V.db('pin-only')), false);
    const sStaff = await V.issue('d-staff', 'staff'); await V.issue('d-view', 'view'); await V.issue('d-fn', 'fn'); await V.issue('d-sous', 'sous');
    await check('venue, staff: reads the kitchen', () => privateRead(V.db('d-staff')));
    await check('venue, view only: reads the kitchen', () => privateRead(V.db('d-view')));
    await check('venue, functions only: no kitchen records', () => privateRead(V.db('d-fn')), false);
    await check('venue, staff: not admin', () => admins(V.db('d-staff')), false);
    const sHead = await V.issue('d-head', 'hc'), sPlat = await V.issue('d-plat', 'plat');
    await check('venue, head chef PIN alone: not admin', () => admins(V.db('d-head')), false);
    await check('venue, platform owner PIN alone: not admin', () => admins(V.db('d-plat')), false);
    await check('venue, platform owner PIN alone: reads the kitchen as himself', () => privateRead(V.db('d-plat')));
    await check('venue, the platform owner\'s Google alone verifies itself', () => admins(plat));
    await check('venue, the platform owner\'s Google alone: no private records', () => privateRead(plat), false);
    await check('venue, a wrong Google account: not an admin', () => admins(wrong), false);
    await check('venue, the venue owner cannot grant the platform owner\'s session', () => V.grant(head, 'google-head', 'd-plat', sPlat), false);
    await check('venue, the platform owner cannot grant the head chef\'s session', () => V.grant(plat, 'google-plat', 'd-head', sHead), false);
    await check('venue, the platform owner cannot grant a staff session', () => V.grant(plat, 'google-plat', 'd-staff', sStaff), false);
    await check('venue, an unverified platform account cannot grant', () => V.grant(unverified, 'google-unverified', 'd-plat', sPlat), false);
    await check('venue, the venue owner grants the head chef\'s session', () => V.grant(head, 'google-head', 'd-head', sHead));
    await check('venue, the platform owner grants his own profile\'s session', () => V.grant(plat, 'google-plat', 'd-plat', sPlat));
    const vAdmin = V.db('d-head'), pAdmin = V.db('d-plat');
    await check('venue admin: reads config/admins', () => admins(vAdmin));
    await check('platform admin: reads config/admins', () => admins(pAdmin));
    await check('platform admin: reads the kitchen', () => privateRead(pAdmin));
    // What the venue admin runs as before: his kitchen, his people, everyone but the platform owner's profile.
    await check('venue admin: changes a setting', () => updateDoc(doc(vAdmin, K + 'config/main'), { showBadges: false, by: 'hc' }));
    await check('venue admin: changes other people\'s lists', () => updateDoc(doc(vAdmin, K + 'config/main'), { addIds: ['plat', 'staff', 'view'], by: 'hc' }));
    await check('venue admin: opens another person\'s PIN set-up window', () => updateDoc(doc(vAdmin, K + 'config/main'), { 'pinOpen.view': Date.now() + 60000, by: 'hc' }));
    await check('venue admin: resets another person\'s PIN', () => { const b = writeBatch(vAdmin); b.delete(doc(vAdmin, K + 'staffpins/view')); b.delete(doc(vAdmin, K + 'pinset/view')); return b.commit(); });
    await check('venue admin: ends another person\'s device session', () => deleteDoc(doc(vAdmin, K + 'sessions/d-view')));
    await check('venue admin: writes the roster with the platform owner on it', () => setDoc(doc(vAdmin, K + 'login/roster'), V.roster(cfg)));
    // What the venue admin cannot do to the platform owner's profile.
    const without = list => list.filter(x => x !== 'plat');
    await check('venue admin cannot take the platform owner off the list', () => updateDoc(doc(vAdmin, K + 'config/main'), { staffIds: without(cfg.staffIds), by: 'hc' }), false);
    await check('venue admin cannot make the platform owner functions only', () => updateDoc(doc(vAdmin, K + 'config/main'), { fnOnlyIds: ['fn', 'plat'], by: 'hc' }), false);
    await check('venue admin cannot change the platform owner\'s role', () => updateDoc(doc(vAdmin, K + 'config/main'), { sousIds: without(cfg.sousIds), by: 'hc' }), false);
    await check('venue admin cannot change the platform owner\'s ticks', () => updateDoc(doc(vAdmin, K + 'config/main'), { delIds: [], by: 'hc' }), false);
    await check('venue admin cannot change the platform owner\'s pings', () => updateDoc(doc(vAdmin, K + 'config/main'), { pingIds: ['hc'], by: 'hc' }), false);
    await check('venue admin cannot make the platform owner head chef', () => updateDoc(doc(vAdmin, K + 'config/main'), { headId: 'plat', by: 'hc' }), false);
    await check('venue admin cannot open the platform owner\'s PIN set-up window', () => updateDoc(doc(vAdmin, K + 'config/main'), { 'pinOpen.plat': Date.now() + 60000, by: 'hc' }), false);
    await check('venue admin cannot reset the platform owner\'s PIN', () => deleteDoc(doc(vAdmin, K + 'staffpins/plat')), false);
    await check('venue admin cannot clear the platform owner\'s PIN time', () => deleteDoc(doc(vAdmin, K + 'pinset/plat')), false);
    await check('venue admin cannot replace the platform owner\'s PIN', () => setDoc(doc(vAdmin, K + 'staffpins/plat'), { hash: hash('other') }), false);
    await check('venue admin cannot replace the platform owner\'s PIN time', () => setDoc(doc(vAdmin, K + 'pinset/plat'), { at: 9 }), false);
    await check('venue admin cannot end the platform owner\'s device session', () => deleteDoc(doc(vAdmin, K + 'sessions/d-plat')), false);
    await check('the venue owner\'s Google cannot take back the platform owner\'s grant', () => deleteDoc(doc(head, K + 'adminDevices/d-plat')), false);
    await check('venue admin cannot write a roster without the platform owner', () => setDoc(doc(vAdmin, K + 'login/roster'), V.roster({ ...cfg, staffIds: without(cfg.staffIds) })), false);
    await check('venue admin cannot delete the kitchen settings', () => deleteDoc(doc(vAdmin, K + 'config/main')), false);
    await check('the venue owner\'s fresh Google cannot open the platform owner\'s window', () => updateDoc(doc(head, K + 'config/main'), { 'pinOpen.plat': Date.now() + 60000, by: 'hc' }), false);
    await check('the venue owner\'s fresh Google cannot reset the platform owner\'s PIN', () => deleteDoc(doc(head, K + 'staffpins/plat')), false);
    await check('a sous chef cannot take the platform owner off the list', () => updateDoc(doc(V.db('d-sous'), K + 'config/main'), { staffIds: without(cfg.staffIds), by: 'sous' }), false);
    await check('a sous chef still takes a staff member off the list', () => updateDoc(doc(V.db('d-sous'), K + 'config/main'), { staffIds: cfg.staffIds.filter(x => x !== 'staff'), by: 'sous' }));
    // The platform owner changes his own profile; the venue owner still recovers his own head chef PIN.
    await check('platform admin: changes his own ticks', () => updateDoc(doc(pAdmin, K + 'config/main'), { delIds: [], by: 'plat' }));
    await check('platform admin: opens his own PIN set-up window', () => updateDoc(doc(pAdmin, K + 'config/main'), { 'pinOpen.plat': Date.now() + 60000, by: 'plat' }));
    await check('the venue owner\'s fresh Google resets the head chef PIN window', () => updateDoc(doc(head, K + 'config/main'), { 'pinOpen.hc': Date.now() + 60000, by: 'hc' }));
    // A new head chef: the venue admin moves headId; the platform owner stays admin, the old head chef does not.
    await check('venue admin: makes another person head chef', () => updateDoc(doc(vAdmin, K + 'config/main'), { headId: 'sous', by: 'hc' }));
    await check('the old head chef\'s grant stops at once', () => admins(vAdmin), false);
    await check('the platform owner is still admin', () => admins(pAdmin));
    await check('platform admin: may delete the kitchen settings', () => deleteDoc(doc(pAdmin, K + 'config/main')));
  } finally { await V.env.cleanup(); }
}
console.log(`${fails} failed of ${n} venue rule checks`);
if (fails) process.exitCode = 1;
