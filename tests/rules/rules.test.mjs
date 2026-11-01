/*
  Checks firestore.rules on the Firestore emulator, with made-up values in place of KITCHEN_PIN and OWNER_EMAIL.
  Run from tests/rules/:  npm install  then  npm test   (firebase-tools starts the emulator; Java is needed).
  Nothing here touches the real book. Every check is a write the rules must allow or refuse.
*/
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import { createHash } from 'crypto';
import { anonContext, dailySession, adminGrant, seedOwnerDevice, nextFour } from './device-auth-fixtures.mjs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const PIN = '000000', OWNER = 'headchef@test.local';
const rules = readFileSync(process.env.RULES || path.join(here, '..', '..', 'firestore.rules'), 'utf8').replace(/KITCHEN_PIN/g, PIN).replace(/OWNER_EMAIL/g, OWNER);
const sha = s => createHash('sha256').update(s).digest('hex');
const pins = { sam: '1111', ann: '2222', bo: '3333', hd: '4444' };
const hash = (id, pin) => sha('lk:' + id + ':' + pin);
const K = 'kitchens/' + PIN + '/';
// today in kitchen time (UTC+10): staff write only yesterday's, today's and tomorrow's lists (22 Oct 2026)
const TODAY = new Date(Date.now() + 10 * 3600000).toISOString().slice(0, 10), OLD = '2026-01-05';
const mins = x => Object.assign({ no: 1, v: 1, status: 'draft', date: '2026-10-19', start: '14:00', loc: 'Kitchen', guests: '', chair: 'sam', taker: 'sam', next: '', decisions: 'Fryer oil every Monday', menu: '', safety: '', dates: '', other: '', att: [{ id: 'ann', st: 'present' }], acts: [], removed: false }, x || {});
const PEOPLE = [{ id: 'sam', name: 'Sam', role: 'sous', active: true }, { id: 'ann', name: 'Ann', role: 'staff', active: true }, { id: 'bo', name: 'Bo', role: 'staff', ping: true, active: true }, { id: 'cal', name: 'Cal', role: 'staff', active: true }, { id: 'hd', name: 'Hedy', role: 'head', active: true }];

const env = await initializeTestEnvironment({ projectId: 'demo-test', firestore: { rules } });
await env.clearFirestore();
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + 'config/main'), {
    people: PEOPLE,
    sousIds: ['sam', 'hd'], pingIds: ['sam', 'bo', 'hd'], staffIds: ['sam', 'ann', 'bo', 'cal', 'hd'], headId: 'hd', showBadges: true
  });
  for (const id of Object.keys(pins)) { await setDoc(doc(db, K + 'staffpins/' + id), { hash: hash(id, pins[id]) }); await setDoc(doc(db, K + 'pinset/' + id), { at: 1 }); }
  await setDoc(doc(db, K + 'notes/n-sam'), { text: 'Sam ping', tag: 'none', start: '2026-10-19', until: '2026-10-19', dows: [], removed: false, by: 'sam' });
  await setDoc(doc(db, K + 'notes/n-bo'), { text: 'Bo ping', tag: 'none', start: '2026-10-19', until: '2026-10-19', dows: [], removed: false, by: 'bo' });
  await setDoc(doc(db, K + 'sections/larder'), { name: 'Larder', uses: 3, hidden: false, by: 'ann', old: 'a field the book no longer writes' });
  await setDoc(doc(db, K + 'activity/ann'), { name: 'Ann', visits: 2, legacy: 1 });
  await setDoc(doc(db, K + 'learned/slice-onions'), { text: 'Slice onions', uses: 3, hidden: false });
  await setDoc(doc(db, K + 'minutes/m1'), mins({ status: 'published', pubAt: 1 }));
  await setDoc(doc(db, K + 'minutes/m2'), mins({ no: 2, v: 2, status: 'published', pubAt: 2 }));
  await setDoc(doc(db, K + 'minutes/d1'), mins({ no: 3, status: 'draft' }));
  await setDoc(doc(db, K + 'ordlearned/milk'), { text: 'Milk', uses: 4, hidden: false });
  await setDoc(doc(db, K + 'learnlog/2026-10-18'), { at: 1, who: 'server', kind: 'nightly' });
});

const anon = env.unauthenticatedContext().firestore();
const owner = anonContext(env, 'owner').firestore();
await seedOwnerDevice(env, {uid:'owner',headId:'hd'});

/* A staff write the way the book does it since PIN sessions (phase 2, 22 Oct 2026): the person's phone has a session
   (opened with their PIN, at their current PIN time) and every document carries "by". pin: the PIN typed (a wrong one
   opens no session); as: the id written as "by" (normally the same person). The test phones' sessions are planted with
   the rules off (the try and the session themselves are checked in the sessions part below), and follow the person's
   current pinset time, so a reset PIN in a check is honoured as it is on a real phone. */
const wPhones = {};
function wPhone(uid) { return wPhones[uid] || (wPhones[uid] = env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' } }).firestore()); }
async function W(ops, o) {
  const id = o.id, right = !o.pin || o.pin === pins[id], uid = 'w-' + id + (right ? '' : '-wrong'), db = wPhone(uid);
  if (right) await env.withSecurityRulesDisabled(async ctx => {
    const c = ctx.firestore(), ps = await getDoc(doc(c, K + 'pinset/' + id));
    if (ps.exists()) await setDoc(doc(c, K + 'sessions/' + uid), dailySession(id, {pinAt:ps.data().at}));
  });
  const b = writeBatch(db);
  for (const [p, data, merge] of ops) b.set(doc(db, K + p), Object.assign({ by: o.as || id }, data), merge ? { merge: true } : {});
  return b.commit();
}
/* The older way, switched off in phase 2: a write-only proof of the PIN in the same batch, from a phone with no session. */
function Wproof(ops, o) {
  const b = writeBatch(anon), id = o.id;
  b.set(doc(anon, K + 'proofs/' + id), { tok: hash(id, o.pin || pins[id]), at: serverTimestamp() });
  for (const [p, data] of ops) b.set(doc(anon, K + p), Object.assign({ by: id }, data));
  return b.commit();
}
const line = x => Object.assign({ text: 'Slice onions', station: 'Larder', qty: '2 tubs', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: 1, done: false, deleted: false }, x || {});
const note = x => Object.assign({ text: 'Ping', tag: 'none', start: '2026-10-19', until: '2026-10-19', dows: [], removed: false }, x || {});
const guide = x => Object.assign({ title: 'Fryer', cat: 'cleaning', sum: '', steps: 'Drain it.', kw: '', text: '', thumb: '', file: '', pages: 0, dims: [], v: 1, removed: false }, x || {});

let fails = 0, n = 0;
async function ok(p, allowed, msg) {
  n++;
  try { await (allowed ? assertSucceeds(p) : assertFails(p)); console.log('PASS ' + msg); }
  catch (e) { fails++; console.log('FAIL ' + msg + ' (' + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')'); }
}

// the staff lock
await ok(W([['days/' + TODAY + '/items/a1', line()]], { id: 'ann' }), true, 'right PIN: a prep line is saved');
await ok(W([['days/' + OLD + '/items/a1', line()]], { id: 'ann' }), false, 'lines: staff cannot write a list long past');
await ok(W([['days/' + OLD + '/items/s1', line({ addedById: 'sam' })]], { id: 'sam' }), true, 'lines: a sous chef writes any day');
await ok(W([['days/' + TODAY + '/items/a9', line({ addedById: 'bo' })]], { id: 'ann' }), false, 'lines: a new line written as someone else is refused');
await ok(W([['days/' + TODAY + '/items/a1', { done: true, doneBy: 'Bo', doneById: 'bo', doneAt: 5 }, true]], { id: 'ann' }), false, 'lines: a tick put on someone else is refused');
await ok(W([['days/' + TODAY + '/items/a1', { done: true, doneBy: 'Ann', doneById: 'ann', doneAt: 5 }, true]], { id: 'ann' }), true, 'lines: Ann ticks as Ann');
await ok(W([['days/2026-10-19/items/a2', line()]], { id: 'ann', pin: '9999' }), false, 'wrong PIN: refused');
await ok(W([['days/2026-10-19/items/a3', line()]], { id: 'ann', as: 'sam' }), false, 'spoofed by: Ann\'s session with by Sam is refused');
await ok(Wproof([['days/' + TODAY + '/items/a4', line()]], { id: 'ann' }), false, 'phase 2: the older PIN proof no longer writes, even with the right PIN');
await ok(setDoc(doc(anon, K + 'proofs/ann'), { tok: hash('ann', '2222'), at: serverTimestamp() }), false, 'phase 2: a PIN proof cannot be written at all');
await ok(setDoc(doc(anon, K + 'days/2026-10-19/items/a5'), line({ by: 'ann' })), false, 'no session: refused');

// who may set a PIN: only people on the list (staffIds), once
const setPin = id => { const phone = wPhone('setup'); const b = writeBatch(phone); b.set(doc(phone, K + 'staffpins/' + id), { hash: hash(id, '4444') }); b.set(doc(phone, K + 'pinset/' + id), { at: 1 }); return b.commit(); };
// the set-up window (22 Oct 2026): no window, or one that has run out, means no first PIN
await ok(setPin('cal'), false, 'PIN set: no set-up window for Cal yet, refused');
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { pinOpen: { cal: Date.now() - 60000 } }, { merge: true }); });
await ok(setPin('cal'), false, 'PIN set: a window that ran out a minute ago, refused');
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { pinOpen: { cal: Date.now() + 1800000 } }, { merge: true }); });
await ok(setPin('cal'), true, 'PIN set: a listed person with an open window sets one');
await ok(setPin('zed'), false, 'PIN set: an id that is not on the list is refused (no minting a writer)');
await ok(setPin('ann'), false, 'PIN set: an existing PIN cannot be overwritten');
await ok(W([['days/2026-10-19/items/a6', line()]], { id: 'zed', pin: '4444' }), false, 'minted id: cannot write');
await ok(setDoc(doc(owner, K + 'staffpins/old-hand'), { hash: hash('old-hand', '5555'), setAt: 1, name: 'Old Hand' }), true, 'PIN set: the head chef copies a stored PIN as it is (move to a new kitchen PIN), even for an id no longer on the list');

// config: a sous chef may change the people list and staffIds, never sousIds or pingIds
await ok(W([['config/main', { people: [{ id: 'sam', name: 'Sam', role: 'sous', active: true }, { id: 'ann', name: 'Ann', role: 'staff', active: true }, { id: 'dee', name: 'Dee', role: 'staff', active: true }], staffIds: ['sam', 'ann', 'dee', 'hd'], updated: 1, updatedBy: 'Sam' }, true]], { id: 'sam' }), true, 'config: a sous chef adds a person and their id to staffIds');
await ok(W([['config/main', { people: [{ id: 'sam', name: 'Sam', role: 'sous', active: true }, { id: 'ann', name: 'Ann', role: 'staff', active: true }], staffIds: ['sam', 'ann'], updated: 2, updatedBy: 'Sam' }, true]], { id: 'sam' }), false, 'config: a sous chef cannot take the head chef off staffIds');
await ok(W([['config/main', { pinOpen: { dee: Date.now() + 86400000 } }, true]], { id: 'sam' }), true, 'config: a sous chef opens a new person\'s PIN set-up window');
await ok(W([['config/main', { pinOpen: { dee: Date.now() + 86400000 } }, true]], { id: 'ann' }), false, 'config: staff cannot open a PIN set-up window');
await ok(W([['config/main', { sousIds: ['sam', 'ann'], updated: 1, updatedBy: 'Sam' }, true]], { id: 'sam' }), false, 'config: a sous chef cannot change sousIds');
await ok(W([['config/main', { pingIds: ['sam', 'ann'], updated: 1, updatedBy: 'Sam' }, true]], { id: 'sam' }), false, 'config: a sous chef cannot change pingIds');
await ok(W([['config/main', { people: [{ id: 'ann', name: 'Ann', role: 'staff', active: true }], updated: 1, updatedBy: 'Ann' }, true]], { id: 'ann' }), false, 'config: staff cannot change the people list');
await ok(setDoc(doc(owner, K + 'config/main'), { people: PEOPLE, headId:'hd', sousIds: ['sam'], pingIds: ['sam', 'bo'], staffIds: ['sam', 'ann', 'bo', 'cal','hd'], showBadges: false }), true, 'config: the head chef writes everything');

// activity: a person's own tally, or the head chef or a sous chef for anyone
await ok(W([['activity/ann', { name: 'Ann', visits: increment(1) }, true]], { id: 'ann' }), true, 'activity: own tally (an older field on the record does not get in the way)');
await ok(W([['activity/bo', { name: 'Bo', visits: increment(5) }, true]], { id: 'ann' }), false, 'activity: staff cannot write someone else\'s tally');
await ok(W([['activity/bo', { name: 'Bo', ticked: increment(-1) }, true]], { id: 'sam' }), true, 'activity: a sous chef untick adjusts the ticker\'s tally');
await ok(W([['activity/ann', { name: 'Ann', extra: 'x' }, true]], { id: 'ann' }), false, 'activity: only the known fields');

// shift pings: write your own, change your own; the head chef and sous chefs change anyone's
await ok(W([['notes/n-bo2', note({ author: 'bo' })]], { id: 'bo' }), true, 'pings: a person ticked for Pings writes one');
await ok(W([['notes/n-tm1', note({ author: 'sam', tm: 900 })]], { id: 'sam' }), true, 'pings: one with its own time of day (15:00, 22 Oct 2026)');
await ok(W([['notes/n-tm1', { tm: null, upd: 3 }, true]], { id: 'sam' }), true, 'pings: its time taken away again (null)');
await ok(W([['notes/n-tm2', note({ author: 'sam', tm: 1440 })]], { id: 'sam' }), false, 'pings: a time past 23:59 is refused');
await ok(W([['notes/n-tm3', note({ author: 'sam', tm: '15:00' })]], { id: 'sam' }), false, 'pings: a time that is not a number is refused');
await ok(W([['notes/n-tm4', note({ author: 'sam', tm: 90.5 })]], { id: 'sam' }), false, 'pings: a time must be whole minutes');
await ok(W([['notes/n-ann', note()]], { id: 'ann' }), false, 'pings: someone not ticked cannot');
await ok(W([['notes/n-bo', { removed: true, upd: 2 }, true]], { id: 'bo' }), true, 'pings: Bo removes Bo\'s ping');
await ok(W([['notes/n-sam', { removed: true, upd: 2 }, true]], { id: 'bo' }), false, 'pings: Bo cannot remove Sam\'s ping');
await ok(W([['notes/n-bo2', { text: 'Changed', upd: 2 }, true]], { id: 'sam' }), true, 'pings: a sous chef edits anyone\'s ping');
await ok(W([['notes/n-bo2', { text: 'Changed back', upd: 3 }, true]], { id: 'bo' }), true, 'pings: the writer can still change it after a sous chef\'s edit (author is kept)');
await ok(W([['notes/n-bo2', { text: 'Nope', upd: 4 }, true]], { id: 'ann' }), false, 'pings: someone else still cannot');
await ok(setDoc(doc(owner, K + 'notes/n-bo2'), note({ text: 'Head chef edit' })), true, 'pings: the head chef edits anyone\'s ping');
await ok(setDoc(doc(anon, K + 'notes/n-bo'), { by: 'sam', text: 'Allergen: none today', upd: 9 }, { merge: true }), false, 'pings: no session, posing as a sous chef, refused');
await ok(W([['notes/n-bo', { text: 'Allergen: none today', upd: 9 }, true]], { id: 'sam', pin: '9999' }), false, 'pings: a sous chef\'s id with a wrong PIN, refused');
await ok(W([['notes/n-bo', { text: 'Allergen: none today', upd: 9 }, true]], { id: 'bo', as: 'sam' }), false, 'pings: Bo\'s session, written as Sam, refused');

// sizes and shapes
await ok(W([['days/2026-10-19/items/b1', line({ station: 'x'.repeat(41) })]], { id: 'ann' }), false, 'prep line: section over 40 characters refused');
await ok(W([['days/2026-10-19/items/b2', line({ qty: 'x'.repeat(41) })]], { id: 'ann' }), false, 'prep line: amount over 40 characters refused');
await ok(W([['orders/' + TODAY + '/lines/o1', { text: 'Milk', qty: '6 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: 1, ordered: false, deleted: false }]], { id: 'ann' }), true, 'order line: saved');
await ok(W([['orders/' + TODAY + '/lines/o1', { ordered: true, orderedBy: 'Ann', orderedAt: 5 }, true]], { id: 'ann' }), false, 'order line: staff cannot tick it as ordered');
await ok(W([['orders/' + TODAY + '/lines/o1', { ordered: true, orderedBy: 'Sam', orderedAt: 5 }, true]], { id: 'sam' }), true, 'order line: a sous chef ticks it as ordered');
await ok(W([['orders/' + TODAY + '/lines/o1', { ordered: false, orderedBy: '', orderedAt: 0 }, true]], { id: 'ann' }), false, 'order line: staff cannot untick it');
await ok(W([['orders/2026-10-19/lines/o2', { text: 'Milk', qty: 'x'.repeat(41), recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: 1, ordered: false, deleted: false }]], { id: 'ann' }), false, 'order line: amount over 40 characters refused');
await ok(W([['sections/fryer', { name: 'Fryer', uses: increment(1), lastUsed: 1, lastBy: 'Ann' }, true]], { id: 'ann' }), true, 'sections: a new section is counted');
await ok(W([['sections/fryer', { name: 'Fryer', bogus: 1 }, true]], { id: 'ann' }), false, 'sections: only the known fields');
await ok(W([['sections/larder', { uses: increment(1), lastUsed: 2, lastBy: 'Ann' }, true]], { id: 'ann' }), true, 'sections: a use is counted on a record with an older field');
await ok(W([['sections/larder', { hidden: true }, true]], { id: 'ann' }), false, 'sections: staff cannot hide one');
await ok(W([['sections/larder', { hidden: true }, true]], { id: 'sam' }), true, 'sections: a sous chef can');
await ok(W([['learned/slice-onions', { hidden: true }, true]], { id: 'ann' }), false, 'learned: staff cannot hide an item');
await ok(W([['learned/slice-onions', { hidden: true }, true]], { id: 'sam' }), true, 'learned: a sous chef hides an item');
await ok(W([['learned/slice-onions', { uses: 99 }, true]], { id: 'sam' }), false, 'learned: a sous chef cannot change the counts');
await ok(W([['learned/new-item', { text: 'New', uses: 1 }]], { id: 'sam' }), false, 'learned: a phone cannot add an item');
await ok(setDoc(doc(owner, K + 'learned/slice-onions'), { hidden: true }, { merge: true }), true, 'learned: the head chef can');
await ok(W([['misses/laksa', { q: 'laksa', n: increment(1), last: 1, lastBy: 'Ann' }, true]], { id: 'ann' }), true, 'misses: an empty search is counted');
await ok(W([['misses/laksa', { q: 'laksa', junk: 'x' }, true]], { id: 'ann' }), false, 'misses: only the known fields');
await ok(W([['views/barra', { name: 'Barramundi', n: increment(2), last: 1 }, true]], { id: 'ann' }), true, 'views: a card open is counted');
await ok(W([['views/barra', { name: 'Barramundi', n: 1, junk: 'x' }, true]], { id: 'ann' }), false, 'views: only the known fields');
await ok(setDoc(doc(owner, K + 'guides/g1'), guide({ thumb: 'data:image/webp;base64,AAAA' })), true, 'guides: a picture thumbnail is accepted');
await ok(setDoc(doc(owner, K + 'guides/g2'), guide({ thumb: 'https://example.com/x.png' })), false, 'guides: a thumbnail that is not a picture is refused');
await ok(setDoc(doc(owner, K + 'guides/g1/pages/0'), { img: 'data:image/jpeg;base64,AAAA', v: 1, n: 0 }), true, 'guides: a page picture is accepted');
await ok(setDoc(doc(owner, K + 'guides/g1/pages/1'), { img: 'javascript:alert(1)', v: 1, n: 1 }), false, 'guides: a page that is not a picture is refused');

// meeting minutes: only the head chef writes them and the hist copies, with the size caps
await ok(setDoc(doc(owner, K + 'minutes/m3'), mins({ no: 4 })), true, 'minutes: the head chef writes a draft');
await ok(setDoc(doc(owner, K + 'minutes/m3'), mins({ no: 4, status: 'published', pubAt: 3 })), true, 'minutes: and publishes it');
await ok(setDoc(doc(owner, K + 'minutes/m3/hist/1'), mins({ no: 4, status: 'published', pubAt: 3 })), true, 'minutes: the frozen copy of version 1 is written');
await ok(setDoc(doc(owner, K + 'minutes/m3/hist/1'), mins({ no: 4, status: 'published', decisions: 'Changed' })), false, 'minutes: a hist copy cannot be changed');
await ok(setDoc(doc(owner, K + 'minutes/m3'), mins({ no: 4, status: 'published', decisions: 'x'.repeat(1201) })), false, 'minutes: decisions over 1200 characters refused');
await ok(setDoc(doc(owner, K + 'minutes/m3'), mins({ no: 4, status: 'live' })), false, 'minutes: a status outside draft and published refused');
await ok(W([['minutes/m4', mins({ no: 5 })]], { id: 'sam' }), false, 'minutes: a sous chef cannot write minutes');
await ok(W([['minutes/m1', { removed: true }, true]], { id: 'sam' }), false, 'minutes: a sous chef cannot remove minutes');
await ok(deleteDoc(doc(owner, K + 'minutes/m1')), false, 'minutes: never deleted, only flagged');
// sign-offs: once, by the person, for the current published version, never changed
await ok(W([['minutes/m1/signs/1_ann', { v: 1, st: 'present', at: 5, name: 'Ann' }]], { id: 'ann' }), true, 'sign-off: Ann signs version 1 of published minutes');
await ok(W([['minutes/m1/signs/1_ann', { v: 1, st: 'present', at: 6 }]], { id: 'ann' }), false, 'sign-off: cannot be changed');
await ok(deleteDoc(doc(owner, K + 'minutes/m1/signs/1_ann')), false, 'sign-off: cannot be deleted, not even by the head chef');
await ok(W([['minutes/m1/signs/1_bo', { v: 1, st: 'apology', at: 5 }]], { id: 'ann' }), false, 'sign-off: Ann cannot sign for Bo (id must match the writer)');
await ok(W([['minutes/m2/signs/1_ann', { v: 1, st: 'present', at: 5 }]], { id: 'ann' }), false, 'sign-off: an old version cannot be signed once version 2 is published');
await ok(W([['minutes/m2/signs/2_ann', { v: 2, st: 'present', at: 5 }]], { id: 'ann' }), true, 'sign-off: the current version can');
await ok(W([['minutes/d1/signs/1_ann', { v: 1, st: 'present', at: 5 }]], { id: 'ann' }), false, 'sign-off: a draft cannot be signed');
await ok(W([['minutes/m1/signs/1_sam', { v: 1, st: 'late', at: 5 }]], { id: 'sam' }), false, 'sign-off: st outside present, apology, absent refused');
await ok(setDoc(doc(owner, K + 'minutes/m1/signs/1_bo'), { v: 1, st: 'apology', at: 5, by: 'bo' }), true, 'sign-off: the head chef copies one as it is (move to a new kitchen PIN)');
// who has seen a shift ping: one record per person, ping and day, never changed
await ok(W([['notes/n-sam/seen/2026-10-19_ann', { day: '2026-10-19', at: 5 }]], { id: 'ann' }), true, 'seen: Ann marks a ping seen today');
await ok(W([['notes/n-sam/seen/2026-10-19_ann', { day: '2026-10-19', at: 6 }]], { id: 'ann' }), false, 'seen: the record cannot be changed');
await ok(W([['notes/n-sam/seen/2026-10-19_bo', { day: '2026-10-19', at: 5 }]], { id: 'ann' }), false, 'seen: Ann cannot mark it seen for Bo');
await ok(W([['notes/n-sam/seen/2026-10-20_ann', { day: '2026-10-19', at: 5 }]], { id: 'ann' }), false, 'seen: the id must carry the day in the record');
await ok(setDoc(doc(owner, K + 'notes/n-sam/seen/2026-10-19_sam'), { day: '2026-10-19', at: 5, by: 'sam' }), true, 'seen: the head chef copies one as it is (move to a new kitchen PIN)');
// what the order list learned, and the learning log
await ok(W([['ordlearned/cream', { text: 'Cream', uses: 1, hidden: false }]], { id: 'ann' }), false, 'ordlearned: a phone cannot add an item (the nightly job writes it)');
await ok(W([['ordlearned/milk', { uses: 99 }, true]], { id: 'sam' }), false, 'ordlearned: a sous chef cannot change the counts');
await ok(W([['ordlearned/blank', { text: '', uses: 1, hidden: false }]], { id: 'ann' }), false, 'ordlearned: an empty text is refused');
await ok(W([['ordlearned/milk', { hidden: 'yes' }, true]], { id: 'sam' }), false, 'ordlearned: hidden must be true or false');
await ok(W([['ordlearned/milk', { hidden: true }, true]], { id: 'sam' }), true, 'ordlearned: a sous chef hides an item');
await ok(deleteDoc(doc(anon, K + 'ordlearned/milk')), false, 'ordlearned: not deleted from a phone');
await ok(W([['learnlog/2026-10-19', { at: 5, who: 'ann', kind: 'phone' }]], { id: 'ann' }), false, 'learnlog: a phone cannot claim a day (the nightly job does)');
await ok(setDoc(doc(owner, K + 'learnlog/2026-10-19'), { at: 5, who: 'owner', kind: 'copy' }), true, 'learnlog: the head chef account can (move to a new kitchen PIN)');
await ok(W([['learnlog/2026-10-18', { at: 6 }, true]], { id: 'ann' }), false, 'learnlog: a claimed day cannot be changed');
await ok(W([['learnlog/2026-10-21', { who: 'ann' }]], { id: 'ann' }), false, 'learnlog: at must be a number');
// kitchen mail: a person writes to the head chef; only the head chef reads it, ticks it done or marks it seen
const mail = x => Object.assign({ from: 'ann', cat: 'equipment', pri: 'today', text: 'Fryer 2 thermostat reads 20 degrees low', at: 5, done: false, seen: false }, x || {});
const stat = { seen: false, done: false };
await ok(W([['mail/k1', mail()], ['mailstat/k1', stat]], { id: 'ann' }), true, 'mail: Ann sends a mail with its status record');
await ok(W([['mail/k2', mail({ from: 'bo' })], ['mailstat/k2', stat]], { id: 'ann' }), false, 'mail: Ann cannot send as Bo (from must be the writer)');
await ok(W([['mail/k3', mail()], ['mailstat/k3', stat]], { id: 'ann', pin: '9999' }), false, 'mail: wrong PIN refused');
await ok(W([['mail/k4', mail({ cat: 'gossip' })], ['mailstat/k4', stat]], { id: 'ann' }), false, 'mail: an unknown category is refused');
await ok(W([['mail/k5', mail({ pri: 'now' })], ['mailstat/k5', stat]], { id: 'ann' }), false, 'mail: an unknown priority is refused');
await ok(W([['mail/k6', mail({ text: '' })], ['mailstat/k6', stat]], { id: 'ann' }), false, 'mail: an empty message is refused');
await ok(W([['mail/k7', mail({ text: 'x'.repeat(601) })], ['mailstat/k7', stat]], { id: 'ann' }), false, 'mail: more than 600 characters is refused');
await ok(W([['mail/k8', mail({ done: true })], ['mailstat/k8', stat]], { id: 'ann' }), false, 'mail: a new mail cannot arrive already done');
await ok(W([['mail/k9', mail({ extra: 'x' })], ['mailstat/k9', stat]], { id: 'ann' }), false, 'mail: no fields beyond the message');
await ok(W([['mailstat/k10', stat]], { id: 'ann' }), false, 'mailstat: no status record without its mail');
await ok(W([['mailstat/k1', { seen: true, done: true }, true]], { id: 'ann' }), false, 'mailstat: the sender cannot mark their own mail done');
await ok(W([['mail/k1', { done: true, doneAt: 6 }, true]], { id: 'sam' }), false, 'mail: a sous chef cannot tick mail done');
await ok(getDoc(doc(anon, K + 'mail/k1')), false, 'mail: a PIN holder cannot read a mail');
await ok(getDocs(collection(anon, K + 'mail')), false, 'mail: a PIN holder cannot list the mail');
await ok(getDoc(doc(anon, K + 'mailstat/k1')), false, 'mailstat: the sender cannot read while signed out its status by id');
await ok(getDocs(collection(anon, K + 'mailstat')), false, 'mailstat: nobody but the head chef lists the status records');
await ok(getDocs(collection(env.authenticatedContext('other', { email: 'someone@test.local', email_verified: true }).firestore(), K + 'mail')), false, 'mail: another Google account cannot list the mail');
await ok(getDocs(collection(owner, K + 'mail')), true, 'mail: the head chef lists the mail');
await ok(updateDoc(doc(owner, K + 'mail/k1'), { seen: true, seenAt: 7 }), true, 'mail: the head chef marks it seen');
await ok(updateDoc(doc(owner, K + 'mail/k1'), { done: true, doneAt: 8, pri: 'week' }), true, 'mail: the head chef ticks it done and changes the priority');
await ok(updateDoc(doc(owner, K + 'mail/k1'), { text: 'Changed' }), false, 'mail: the message itself cannot be changed, not even by the head chef');
await ok(updateDoc(doc(owner, K + 'mail/k1'), { from: 'bo' }), false, 'mail: the sender cannot be changed');
await ok(updateDoc(doc(owner, K + 'mailstat/k1'), { seen: true, done: true }), true, 'mailstat: the head chef updates the status');
await ok(updateDoc(doc(owner, K + 'mailstat/k1'), { note: 'x' }), false, 'mailstat: holds nothing but seen and done');
await ok(deleteDoc(doc(owner, K + 'mail/k1')), false, 'mail: never deleted');
await ok(setDoc(doc(owner, K + 'mail/k20'), mail({ from: 'bo', by: 'bo', done: true, doneAt: 9, seen: true, seenAt: 8 })), true, 'mail: the head chef copies one as it is (move to a new kitchen PIN)');
// sous chefs read and tick off mail only while the head chef has it switched on (config/main sousMail, 23 Oct 2026)
await ok(W([['mail/k30', mail()], ['mailstat/k30', stat]], { id: 'ann' }), true, 'mail: Ann sends another mail');
await ok(W([['mail/k30', { done: true, doneAt: 6 }, true], ['mailstat/k30', { done: true }, true]], { id: 'sam' }), false, 'sous mail off: a sous chef cannot tick it');
await ok(getDocs(query(collection(wPhone('w-sam'), K + 'mail'), where('done', '==', false))), false, 'sous mail off: a sous chef cannot list the mail');
await ok(W([['config/main', { sousMail: true }, true]], { id: 'sam' }), false, 'sous mail: a sous chef cannot switch it on');
await ok(setDoc(doc(owner, K + 'config/main'), { sousMail: true }, { merge: true }), true, 'sous mail: the head chef switches it on');
await ok(getDocs(query(collection(wPhone('w-sam'), K + 'mail'), where('done', '==', false))), true, 'sous mail on: a sous chef with a PIN session lists the open mail');
await ok(getDoc(doc(wPhone('w-sam'), K + 'mail/k30')), true, 'sous mail on: and reads one');
await ok(getDocs(collection(wPhone('w-ann'), K + 'mail')), false, 'sous mail on: staff with a session still cannot list it');
await ok(getDoc(doc(anon, K + 'mail/k30')), false, 'sous mail on: the kitchen PIN alone still reads nothing');
await ok(W([['mail/k30', { done: true, doneAt: 6, pri: 'week' }, true], ['mailstat/k30', { done: true }, true]], { id: 'sam' }), true, 'sous mail on: a sous chef ticks it done and changes the priority');
await ok(W([['mail/k30', { seen: true, seenAt: 7 }, true]], { id: 'sam' }), false, 'sous mail on: seen stays for the head chef');
await ok(W([['mailstat/k30', { seen: true }, true]], { id: 'sam' }), false, 'sous mail on: nor the seen on its status');
await ok(W([['mail/k30', { text: 'Changed' }, true]], { id: 'sam' }), false, 'sous mail on: the message cannot be changed');
await ok(W([['mail/k30', { done: false, doneAt: 0 }, true]], { id: 'ann' }), false, 'sous mail on: staff still cannot tick it');
await ok(W([['mail/k30', { done: false, doneAt: 0 }, true]], { id: 'sam', pin: '9999' }), false, 'sous mail on: a wrong PIN cannot tick it');
await ok(setDoc(doc(owner, K + 'config/main'), { sousMail: false }, { merge: true }), true, 'sous mail: the head chef switches it off');
await ok(getDoc(doc(wPhone('w-sam'), K + 'mail/k30')), false, 'sous mail off again: the sous chef reads nothing');
// the drinks run: each person writes only their own usual drink; everyone with the kitchen PIN reads them
const drink = x => Object.assign({ kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: 'Extra hot', other: 'Coke No Sugar', at: 5 }, x || {});
await ok(W([['drinks/ann', drink()]], { id: 'ann' }), true, 'drinks: Ann saves her usual');
await ok(W([['drinks/ann', drink({ kind: 'long', milk: '' })]], { id: 'ann' }), true, 'drinks: Ann changes her usual');
await ok(W([['drinks/bo', drink()]], { id: 'ann' }), false, 'drinks: Ann cannot set Bo\'s usual');
await ok(W([['drinks/ann', drink()]], { id: 'ann', pin: '9999' }), false, 'drinks: wrong PIN refused');
await ok(setDoc(doc(anon, K + 'drinks/ann'), drink({ by: 'ann' })), false, 'drinks: no session refused');
await ok(W([['drinks/ann', drink({ note: 'x'.repeat(41) })]], { id: 'ann' }), false, 'drinks: a note over 40 characters is refused');
await ok(W([['drinks/ann', drink({ other: 'x'.repeat(61) })]], { id: 'ann' }), false, 'drinks: something else over 60 characters is refused');
await ok(W([['drinks/ann', drink({ kind: 7 })]], { id: 'ann' }), false, 'drinks: the drink must be words');
await ok(W([['drinks/ann', drink({ cold: 'cokens' })]], { id: 'ann' }), true, 'drinks: Ann adds a soft drink');
await ok(W([['drinks/ann', drink({ cold: 'x'.repeat(13) })]], { id: 'ann' }), false, 'drinks: a soft drink id over 12 characters is refused');
await ok(W([['drinks/ann', drink({ price: 5 })]], { id: 'ann' }), false, 'drinks: no fields beyond the drink');
await ok(W([['drinks/ann', drink({ at: 'now' })]], { id: 'ann' }), false, 'drinks: the time must be a number');
await ok(getDocs(collection(anon, K + 'drinks')), false, 'drinks: a PIN holder cannot read while signed out the team\'s drinks');
await ok(deleteDoc(doc(anon, K + 'drinks/ann')), false, 'drinks: staff cannot delete one');
await ok(setDoc(doc(owner, K + 'drinks/old-hand'), drink({ by: 'old-hand' })), true, 'drinks: the head chef copies one as it is (move to a new kitchen PIN)');

// kitchen sections: each person writes only their own section for the day, shifts/<day>_<id>
const sh = x => Object.assign({ day: '2026-10-21', sec: 'grill', name: 'Grill', auto: false, at: 1 }, x || {});
await ok(W([['shifts/2026-10-21_ann', sh()]], { id: 'ann' }), true, 'shifts: Ann picks Grill for the day');
await ok(W([['shifts/2026-10-21_ann', sh({ sec: 'pass', name: 'Pass', at: 2 })]], { id: 'ann' }), true, 'shifts: Ann changes to Pass');
await ok(W([['shifts/2026-10-21_bo', sh()]], { id: 'ann' }), false, 'shifts: Ann cannot pick for Bo');
await ok(W([['shifts/2026-10-20_ann', sh()]], { id: 'ann' }), false, 'shifts: the record id must be the day and the writer');
await ok(W([['shifts/2026-10-21_ann', sh()]], { id: 'ann', pin: '9999' }), false, 'shifts: wrong PIN refused');
await ok(setDoc(doc(anon, K + 'shifts/2026-10-21_ann'), sh({ by: 'ann' })), false, 'shifts: no session refused');
await ok(W([['shifts/2026-10-21_ann', sh({ name: 'x'.repeat(41) })]], { id: 'ann' }), false, 'shifts: a section name over 40 characters is refused');
await ok(W([['shifts/2026-10-21_ann', sh({ score: 5 })]], { id: 'ann' }), false, 'shifts: no fields beyond the section');
await ok(W([['shifts/2026-10-21_ann', sh({ at: 'now' })]], { id: 'ann' }), false, 'shifts: the time must be a number');
await ok(W([['shifts/2026-10-21_sam', sh({ sec: 'sous', name: 'Sous chef', auto: true })]], { id: 'sam' }), true, 'shifts: a sous chef is given their role');
await ok(getDocs(collection(anon, K + 'shifts')), false, 'shifts: a PIN holder cannot read while signed out who is on which section');
await ok(deleteDoc(doc(anon, K + 'shifts/2026-10-21_ann')), false, 'shifts: staff cannot delete one');
await ok(setDoc(doc(owner, K + 'shifts/2026-10-01_old-hand'), sh({ day: '2026-10-01', by: 'old-hand' })), true, 'shifts: the head chef copies one as it is (move to a new kitchen PIN)');
await ok(W([['config/main', { kitSecs: [{ id: 'grill', name: 'Grill', off: false }] }, true]], { id: 'sam' }), false, 'config: a sous chef cannot change the kitchen sections');
await ok(setDoc(doc(owner, K + 'config/main'), { kitSecs: [{ id: 'grill', name: 'Grill', off: false }] }, { merge: true }), true, 'config: the head chef sets the kitchen sections');
// the head chef's book: recipes changed or added in the book (#/manage)
const rec = (x, r) => Object.assign({ r: Object.assign({ id: 'burger', kind: 'main', no: '02', forLine: 'Plate', name: 'Chicken Burger', yield: 'Per plate', ingredients: [{ q: '1', name: 'Burger bun', tags: ['Gluten'] }], pins: [], sections: [{ title: 'Cooking', steps: ['Toast the bun.'] }] }, r || {}), v: 1, upd: Date.now(), src: 'book', base: 'abcd1234', removed: false }, x || {});
const pie = x => rec(Object.assign({ src: 'new', base: '' }, x || {}), { id: 'pie', name: 'Pie' });
// earlier checks replace config/main: the head chef's own name is set again here
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { headId: 'hd', sousIds: ['sam', 'hd'], staffIds: ['sam', 'ann', 'bo', 'cal', 'hd'] }, { merge: true }); });
function ownerBatch(ops) { const b = writeBatch(owner); for (const [p, data, merge] of ops) b.set(doc(owner, K + p), data, merge ? { merge: true } : {}); return b.commit(); }
await ok(getDoc(doc(anon, K + 'book/index')), true, 'book: a PIN holder reads the index');
await ok(W([['recipes/burger', rec()], ['book/index', { r: { burger: 1 } }, true]], { id: 'hd' }), true, 'book: the head chef by PIN saves a changed recipe with the index');
await ok(getDoc(doc(anon, K + 'recipes/burger')), true, 'book: a PIN holder reads a changed recipe');
await ok(W([['recipes/burger', rec({ v: 2 })], ['book/index', { r: { burger: 2 } }, true], ['recipes/burger/hist/1', { was: rec(), at: 1 }]], { id: 'hd' }), true, 'book: the next version, its earlier version kept, the index in step (the largest batch)');
await ok(W([['recipes/burger', rec({ v: 2 })], ['book/index', { r: { burger: 2 } }, true]], { id: 'hd' }), false, 'book: a save made from an old copy (the same version again) is refused');
await ok(W([['recipes/burger', rec({ v: 3 })]], { id: 'hd' }), false, 'book: a save without the index in the same batch is refused');
await ok(W([['recipes/burger', rec({ v: 3 })], ['book/index', { r: { burger: 4 } }, true]], { id: 'hd' }), false, 'book: the index and the recipe must say the same version');
await ok(W([['recipes/pie', pie()], ['book/index', { r: { pie: 1 } }, true]], { id: 'sam' }), true, 'book: a sous chef can change recipes');
await env.withSecurityRulesDisabled(async ctx => { await deleteDoc(doc(ctx.firestore(), K + 'recipes/pie')); });
await ok(W([['recipes/pie', pie()], ['book/index', { r: { pie: 1 } }, true]], { id: 'ann' }), false, 'book: staff cannot change recipes');
await ok(W([['book/index', { r: { pie: 1 } }, true]], { id: 'ann' }), false, 'book: staff cannot change the index');
await ok(W([['recipes/pie', pie()], ['book/index', { r: { pie: 1 } }, true]], { id: 'ann', as: 'hd' }), false, 'book: staff writing as the head chef (spoofed by) is refused');
await ok(W([['recipes/pie', pie()], ['book/index', { r: { pie: 1 } }, true]], { id: 'hd', pin: '9999' }), false, 'book: the head chef with a wrong PIN is refused');
await ok(setDoc(doc(anon, K + 'recipes/pie'), pie({ by: 'hd' })), false, 'book: no PIN session is refused');
await ok(W([['recipes/pie', pie()], ['book/index', { r: { pie: 1 } }, true]], { id: 'hd' }), true, 'book: the head chef adds a new recipe');
await ok(ownerBatch([['recipes/pie', pie({ v: 2 })], ['book/index', { r: { pie: 2 } }, true]]), true, 'book: the head chef\'s Google account saves with nobody signed in');
await ok(ownerBatch([['recipes/pie', pie({ v: 3, by: 'hd' })], ['book/index', { r: { pie: 3 } }, true]]), true, 'book: the Google account with the head chef signed in');
await ok(ownerBatch([['recipes/pie', pie({ v: 4, by: 'sam' })], ['book/index', { r: { pie: 4 } }, true]]), false, 'book: the head chef\'s device with a sous chef signed in is refused');
await ok(ownerBatch([['recipes/moved', rec({ v: 7 }, { id: 'moved' })]]), true, 'book: the Google account copies a recipe as it is (move to a new kitchen PIN)');
await ok(W([['recipes/pie', pie({ v: 4, price: 12 })], ['book/index', { r: { pie: 4 } }, true]], { id: 'hd' }), false, 'book: no fields beyond the recipe record (no prices)');
await ok(W([['recipes/pie', rec({ v: 4, src: 'new' }, { id: 'pie', name: 'Pie', cost: 3 })], ['book/index', { r: { pie: 4 } }, true]], { id: 'hd' }), false, 'book: no fields beyond the recipe fields');
await ok(W([['recipes/pie', rec({ v: 4 }, { id: 'burger' })], ['book/index', { r: { pie: 4 } }, true]], { id: 'hd' }), false, 'book: the recipe id must match the record');
await ok(W([['recipes/Bad_Id', rec({}, { id: 'Bad_Id' })], ['book/index', { r: { Bad_Id: 1 } }, true]], { id: 'hd' }), false, 'book: a recipe id must be lower case words joined by -');
await ok(W([['recipes/pie', rec({ v: 4 }, { id: 'pie', name: 'x'.repeat(81) })], ['book/index', { r: { pie: 4 } }, true]], { id: 'hd' }), false, 'book: a name over 80 characters is refused');
await ok(W([['recipes/pie', rec({ v: 4 }, { id: 'pie', name: 'Pie', kind: 'drink' })], ['book/index', { r: { pie: 4 } }, true]], { id: 'hd' }), false, 'book: the kind must be one the book knows');
await ok(W([['recipes/pie', rec({ v: 4, removed: true }, { id: 'pie', name: 'Pie' })], ['book/index', { r: { pie: 4 } }, true]], { id: 'hd' }), true, 'book: the head chef hides a recipe');
await ok(W([['recipes/pie', rec({ v: 5, off: true }, { id: 'pie', name: 'Pie' })], ['book/index', { r: { pie: 5 } }, true]], { id: 'hd' }), true, 'book: the head chef goes back to the book file\'s copy (off)');
await ok(W([['recipes/pie', rec({ v: 6, off: 'yes' }, { id: 'pie', name: 'Pie' })], ['book/index', { r: { pie: 6 } }, true]], { id: 'hd' }), false, 'book: off must be true or false');
await ok(deleteDoc(doc(owner, K + 'recipes/pie')), false, 'book: a recipe is never deleted');
await ok(setDoc(doc(owner, K + 'recipes/burger/hist/1'), { was: rec(), at: 2 }), false, 'book: an earlier version cannot be changed');
await ok(deleteDoc(doc(owner, K + 'recipes/burger/hist/1')), false, 'book: an earlier version cannot be deleted');
await ok(W([['recipes/burger/hist/9', { was: rec(), at: 1 }]], { id: 'ann' }), false, 'book: staff cannot write an earlier version');
await ok(ownerBatch([['book/index', { cost: 1 }, true]]), false, 'book: no fields beyond the index fields');
await ok(ownerBatch([['book/index', { menu: [{ title: 'Snacks', ids: ['pie'] }] }, true]]), true, 'book: the head chef sets the menu order');
// the head chef's drawings: same lock and versions as the recipes, the index d in step
const dw = x => Object.assign({ rid: 'burger', slot: 'plate', name: 'Burger plate', vb: '-110 -110 220 220', k: 1, surf: { fam: 'plate', size: 30 }, els: [{ t: 'item', a: 'rump@1', x: 0, y: 0, sx: 1, sy: 1, r: 0 }], defs: '{}', svgS: '<circle cx="0" cy="0" r="100" fill="#FFFFFF"/>', svgF: '<circle cx="0" cy="0" r="20" fill="#8E5A22"/>', alt: 'Top-down drawing', v: 1, upd: Date.now(), removed: false }, x || {});
await ok(W([['drawings/burger-plate', dw()], ['recipes/burger', rec({ v: 3 }, { art: '@burger-plate' })], ['recipes/burger/hist/2', { was: rec({ v: 2 }), at: 1 }], ['book/index', { d: { 'burger-plate': 1 }, r: { burger: 3 } }, true]], { id: 'hd' }), true, 'drawings: the head chef saves a drawing and links it on the recipe in one batch (the largest batch)');
await ok(getDoc(doc(anon, K + 'drawings/burger-plate')), true, 'drawings: a PIN holder reads a drawing');
await ok(W([['drawings/burger-plate', dw({ v: 2 })], ['drawings/burger-plate/hist/1', { was: dw(), at: 1 }], ['book/index', { d: { 'burger-plate': 2 } }, true]], { id: 'hd' }), true, 'drawings: the next version with the earlier one kept');
await ok(W([['drawings/burger-plate', dw({ v: 2 })], ['book/index', { d: { 'burger-plate': 2 } }, true]], { id: 'hd' }), false, 'drawings: a save made from an old copy is refused');
await ok(W([['drawings/burger-plate', dw({ v: 3 })]], { id: 'hd' }), false, 'drawings: a save without the index is refused');
await ok(W([['drawings/new-one', dw()], ['book/index', { d: { 'new-one': 1 } }, true]], { id: 'sam' }), true, 'drawings: a sous chef can save a drawing');
await env.withSecurityRulesDisabled(async ctx => { await deleteDoc(doc(ctx.firestore(), K + 'drawings/new-one')); });
await ok(W([['drawings/new-one', dw()], ['book/index', { d: { 'new-one': 1 } }, true]], { id: 'ann' }), false, 'drawings: staff cannot save a drawing');
await ok(W([['drawings/new-one', dw({ script: 'x' })], ['book/index', { d: { 'new-one': 1 } }, true]], { id: 'hd' }), false, 'drawings: no fields beyond the drawing fields');
await ok(W([['drawings/new-one', dw({ slot: 'poster' })], ['book/index', { d: { 'new-one': 1 } }, true]], { id: 'hd' }), false, 'drawings: the slot must be plate, pan, side or build');
await ok(W([['drawings/new-one', dw({ svgF: 'x'.repeat(300001) })], ['book/index', { d: { 'new-one': 1 } }, true]], { id: 'hd' }), false, 'drawings: the food layer is capped at 300 000 characters');
await ok(W([['drawings/Bad_Id', dw()], ['book/index', { d: { Bad_Id: 1 } }, true]], { id: 'hd' }), false, 'drawings: an id must be lower case words joined by -');
await ok(ownerBatch([['drawings/new-one', dw()], ['book/index', { d: { 'new-one': 1 } }, true]]), true, 'drawings: the head chef\'s Google account saves a drawing');
await ok(deleteDoc(doc(owner, K + 'drawings/new-one')), false, 'drawings: a drawing is never deleted');
await ok(setDoc(doc(owner, K + 'drawings/burger-plate/hist/1'), { was: dw(), at: 2 }), false, 'drawings: an earlier version cannot be changed');
// Draw it for me: the head chef's picks of a library drawing for an ingredient name, saved with the drawing
await ok(W([['drawings/burger-plate', dw({ v: 3 })], ['drawings/burger-plate/hist/2', { was: dw({ v: 2 }), at: 1 }], ['book/index', { d: { 'burger-plate': 3 } }, true], ['book/matches', { m: { 'cowboy butter': 'butter-disc' }, upd: 1 }, true]], { id: 'hd' }), true, 'matches: the head chef saves a pick with the drawing');
await ok(getDoc(doc(anon, K + 'book/matches')), true, 'matches: a PIN holder reads the picks');
await ok(W([['book/matches', { m: { 'rum butterscotch': 'butterscotch-pool' }, upd: 2 }, true]], { id: 'hd' }), true, 'matches: the next pick is added (merge)');
await ok(ownerBatch([['book/matches', { m: { cornbread: 'cornbread' }, upd: 3 }, true]]), true, 'matches: the head chef\'s Google account saves a pick');
await ok(W([['book/matches', { m: { x: 'y' }, upd: 1 }, true]], { id: 'sam' }), true, 'matches: a sous chef can save a pick');
await ok(W([['book/matches', { m: { x: 'y' }, upd: 1 }, true]], { id: 'ann' }), false, 'matches: staff cannot save a pick');
await ok(W([['book/matches', { m: { x: 'y' }, upd: 1 }, true]], { id: 'ann', as: 'hd' }), false, 'matches: staff writing as the head chef is refused');
await ok(W([['book/matches', { m: { x: 'y' }, upd: 1, cost: 2 }, true]], { id: 'hd' }), false, 'matches: no fields beyond the picks');
await ok(W([['book/matches', { m: 'cornbread', upd: 1 }]], { id: 'hd' }), false, 'matches: the picks are a map');
await ok(deleteDoc(doc(owner, K + 'book/matches')), false, 'matches: never deleted');
// reuse: the head chef's templates (drawtpl) and own library pieces and servingware (drawlib)
const tpl = x => Object.assign({ name: 'Pub split', slot: 'plate', surf: { fam: 'plate', size: 30 }, els: [{ t: 'item', a: 'rump@1', x: 0, y: 30, sx: 1, sy: 1, r: 0 }], defs: '{}', vb: '-110 -110 220 220', svgS: '<circle cx="0" cy="0" r="100" fill="#FFFFFF"/>', svgF: '', v: 1, upd: 1, removed: false }, x || {});
const lib = x => Object.assign({ type: 'item', name: 'House slaw', cat: 'veg', kw: 'slaw', role: 'salad', form: 'piece', n: 1, w: 40, h: 30, body: '<circle cx="0" cy="0" r="15" fill="#F1EEDC"/>', side: { s: 'mound', h: 9, c: '#F1EEDC' }, v: 1, upd: 1, removed: false }, x || {});
await ok(W([['drawtpl/pub-split-1', tpl()]], { id: 'hd' }), true, 'templates: the head chef saves a template');
await ok(getDoc(doc(anon, K + 'drawtpl/pub-split-1')), true, 'templates: a PIN holder reads a template');
await ok(W([['drawtpl/pub-split-1', tpl({ v: 2, removed: true })]], { id: 'hd' }), true, 'templates: the next version (hidden)');
await ok(W([['drawtpl/pub-split-1', tpl({ v: 2 })]], { id: 'hd' }), false, 'templates: a save from an old copy is refused');
await ok(W([['drawtpl/other-1', tpl()]], { id: 'sam' }), true, 'templates: a sous chef can save a template');
await ok(W([['drawtpl/other-1', tpl()]], { id: 'ann' }), false, 'templates: staff cannot save a template');
await ok(W([['drawtpl/other-1', tpl({ slot: 'poster' })]], { id: 'hd' }), false, 'templates: the slot must be plate, pan, side or build');
await ok(W([['drawtpl/other-1', tpl({ svgF: 'x'.repeat(300001) })]], { id: 'hd' }), false, 'templates: the drawing is capped at 300 000 characters');
await ok(W([['drawtpl/other-1', tpl({ rid: 'burger' })]], { id: 'hd' }), false, 'templates: no fields beyond the template fields');
await ok(ownerBatch([['drawtpl/moved-1', tpl({ v: 4 })]]), true, 'templates: the Google account copies one as it is (move to a new kitchen PIN)');
await ok(deleteDoc(doc(owner, K + 'drawtpl/pub-split-1')), false, 'templates: never deleted');
await ok(W([['drawlib/house-slaw-1', lib()]], { id: 'hd' }), true, 'own library: the head chef saves a piece');
await ok(W([['drawlib/pub-oval-1', { type: 'surf', name: 'Pub oval', p: { fam: 'plate', shape: 'oval', size: 34 }, v: 1, upd: 1, removed: false }]], { id: 'hd' }), true, 'own library: the head chef saves servingware');
await ok(getDoc(doc(anon, K + 'drawlib/house-slaw-1')), true, 'own library: a PIN holder reads a piece');
await ok(W([['drawlib/house-slaw-1', lib({ v: 2, name: 'House slaw, red' })]], { id: 'hd' }), true, 'own library: the next version of a piece');
await ok(W([['drawlib/other-1', lib()]], { id: 'sam' }), true, 'own library: a sous chef can save a piece');
await ok(W([['drawlib/other-1', lib()]], { id: 'ann', as: 'hd' }), false, 'own library: staff writing as the head chef is refused');
await ok(W([['drawlib/other-1', lib({ type: 'picture' })]], { id: 'hd' }), false, 'own library: a piece or servingware only');
await ok(W([['drawlib/other-1', lib({ body: '' })]], { id: 'hd' }), false, 'own library: a piece needs its drawing');
await ok(W([['drawlib/other-1', lib({ body: 'x'.repeat(100001) })]], { id: 'hd' }), false, 'own library: a piece is capped at 100 000 characters');
await ok(W([['drawlib/other-1', lib({ price: 4 })]], { id: 'hd' }), false, 'own library: no fields beyond the library fields');
await ok(deleteDoc(doc(owner, K + 'drawlib/house-slaw-1')), false, 'own library: never deleted');
// Functions (21 Oct 2026): only people ticked for Manage functions (fnIds, owner only) or the Google account write
const fpins = { fay: '5151', finn: '5252', fox: '5353', gone: '5454' };
Object.assign(pins, fpins);
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + 'config/main'), { fnIds: ['fay', 'finn'], staffIds: ['sam', 'ann', 'bo', 'cal', 'hd', 'fay', 'finn', 'fox'] }, { merge: true });
  for (const id of Object.keys(fpins)) { await setDoc(doc(db, K + 'staffpins/' + id), { hash: hash(id, fpins[id]) }); await setDoc(doc(db, K + 'pinset/' + id), { at: 1 }); }
});
const T0 = Date.UTC(2026, 9, 24, 8, 0);   // 18:00 in Brisbane
const fnc = x => Object.assign({ v: 1, status: 'draft', name: 'Smith 50th', date: '2026-10-24', start: T0, loc: 'Beer garden', guests: 60, mode: 'stag',
  lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 3, u: [0, 0, 0] },
    { rid: 'aussie-platter', name: 'Aussie Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 4, u: [0, 0, 1, 1] },
    { rid: 'pizza-platter', name: 'Pizza Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 5, u: [1, 1, 2, 2, 2] }],
  rounds: [{ at: T0 + 1800000, note: '' }, { at: T0 + 3600000, note: '' }, { at: T0 + 5400000, note: '' }],
  notes: '', kc: '', kcBy: '', kcAt: 0, first: T0 + 1800000, last: T0 + 5400000, from: T0 - 18 * 3600000, until: T0 + 7200000, kq: 0,
  was: {}, chg: [], cBy: 'fay', cAt: 1, upd: 1 }, x || {});
await ok(W([['functions/f1', fnc()]], { id: 'fay' }), true, 'functions: a coordinator ticked for Manage functions saves a draft');
await ok(W([['functions/f1', fnc()]], { id: 'fay' }), false, 'functions: the same first save again (a double tap) is refused, no second copy');
await ok(W([['functions/f1', fnc({ v: 2, status: 'confirmed', confBy: 'fay', confAt: 2 })], ['functions/f1/hist/1', { was: fnc(), at: 2, what: 'Confirmed' }], ['fncontact/f1', { cname: 'Jo Smith', phone: '0400 000 000', email: 'jo@example.com', upd: 2 }]], { id: 'fay' }), true, 'functions: confirmed with its earlier version and contact in one batch');
await ok(W([['functions/f1', fnc({ v: 3, status: 'confirmed', kc: 'Cake at 20:00', kcBy: 'finn', kcAt: 3 })]], { id: 'finn' }), true, 'functions: a second coordinator adds the kitchen comment as themselves');
await ok(W([['functions/f1', fnc({ v: 3, status: 'confirmed' })]], { id: 'fay' }), false, 'functions: a save from an old copy is refused (someone saved first)');
await ok(W([['functions/f1', fnc({ v: 4, status: 'confirmed', kc: 'Cake at 20:30', kcBy: 'finn', kcAt: 4 })]], { id: 'fay' }), false, 'functions: the kitchen comment cannot be put under someone else\'s name');
await ok(W([['functions/f1', fnc({ v: 4, status: 'confirmed', kc: 'Cake at 20:00', kcBy: 'finn', kcAt: 3, lines: [Object.assign({}, fnc().lines[0], { u: [0, 0] })] })]], { id: 'fay' }), false, 'functions: confirmed rounds that do not add up to the booked number are refused');
await ok(W([['functions/fr1', fnc({ status: 'confirmed', lines: [Object.assign({}, fnc().lines[0], { u: [0, 0, 3] })] })]], { id: 'fay' }), true, 'functions: a platter in a round that does not exist is the page\'s check (the rules check every line adds up; 12 lines leave no room for more)');
await ok(W([['functions/fr2', fnc({ status: 'confirmed', lines: [Object.assign({}, fnc().lines[0], { u: [0, 0, -1] })] })]], { id: 'fay' }), true, 'functions: a minus round is the page\'s check too');
await ok(W([['functions/f1', fnc({ v: 4, status: 'confirmed', kc: 'Cake at 20:00', kcBy: 'finn', kcAt: 3, lines: [Object.assign({}, fnc().lines[0], { qty: 2.5, u: [0, 0, 0] })] })]], { id: 'fay' }), false, 'functions: half a platter is refused');
await ok(W([['functions/f1', fnc({ v: 4, status: 'confirmed', kc: 'Cake at 20:00', kcBy: 'finn', kcAt: 3, lines: [Object.assign({}, fnc().lines[0], { qty: 0, u: [] })] })]], { id: 'fay' }), false, 'functions: a confirmed line has at least one platter');
await ok(W([['functions/f1', fnc({ v: 4, status: 'confirmed', kc: 'Cake at 20:00', kcBy: 'finn', kcAt: 3, rounds: [{ at: T0 + 5400000 }, { at: T0 + 3600000 }, { at: T0 + 1800000 }], first: T0 + 5400000, last: T0 + 1800000 })]], { id: 'fay' }), false, 'functions: a first round later than the last is refused');
await ok(W([['functions/f1', fnc({ v: 4, status: 'confirmed', kc: 'Cake at 20:00', kcBy: 'finn', kcAt: 3, guests: 0 })]], { id: 'fay' }), false, 'functions: confirmed needs a guest count');
await ok(W([['functions/fg', fnc({ status: 'confirmed', guests: 0, gu: true })]], { id: 'fay' }), true, 'functions: or guests ticked Not known yet');
await ok(W([['functions/ft', fnc({ status: 'confirmed', mode: 'all', start: 0, st: true, rounds: [{ at: 0, note: '' }], first: 0, last: 0, until: T0, lines: [Object.assign({}, fnc().lines[0], { u: [0, 0, 0] })] })]], { id: 'fay' }), true, 'functions: confirmed with the start time TBC');
await ok(W([['functions/fu', fnc({ status: 'confirmed', start: 0 })]], { id: 'fay' }), false, 'functions: confirmed with no start needs TBC ticked');
await ok(W([['functions/fo', fnc({ od: '2026-10-18' })]], { id: 'fay' }), true, 'functions: the order day is kept on the function');
await ok(W([['functions/fp', fnc({ od: 'x'.repeat(11) })]], { id: 'fay' }), false, 'functions: the order day is a date');
await ok(W([['functions/fh', fnc({ status: 'draft', gu: 'yes' })]], { id: 'fay' }), false, 'functions: Not known yet is a yes or no');
await ok(W([['functions/f1', fnc({ v: 4, status: 'confirmed', kc: 'Cake at 20:00', kcBy: 'finn', kcAt: 3, mode: 'all' })]], { id: 'fay' }), false, 'functions: all at once is one round');
await ok(W([['functions/f1', fnc({ v: 4, status: 'confirmed', kc: 'Cake at 20:00', kcBy: 'finn', kcAt: 3, price: 300 })]], { id: 'fay' }), false, 'functions: no fields beyond the function fields (no prices)');
await ok(W([['functions/f1', fnc({ v: 4, status: 'confirmed', kc: 'Cake at 20:00', kcBy: 'finn', kcAt: 3, phone: '0400' })]], { id: 'fay' }), false, 'functions: no phone on the kitchen copy');
await ok(W([['functions/f2', fnc()]], { id: 'fox' }), false, 'functions: a coordinator without the tick cannot save');
await ok(W([['functions/f2', fnc()]], { id: 'ann' }), false, 'functions: staff cannot save');
await ok(W([['functions/f2', fnc()]], { id: 'hd' }), false, 'functions: the head chef by PIN needs the tick too');
await ok(W([['functions/f2', fnc()]], { id: 'ann', as: 'fay' }), false, 'functions: staff writing as a coordinator is refused');
await ok(W([['fncontact/f1', { cname: 'X', phone: '1', email: '', upd: 5 }]], { id: 'ann' }), false, 'functions: staff cannot change a contact');
await ok(ownerBatch([['functions/f3', fnc()]]), true, 'functions: the Google account saves a function');
// 25 Oct: chefs cancel without full function editing or contacts. History and side effects remain one batch.
{
  const cfgBefore = (await getDoc(doc(owner, K + 'config/main'))).data();
  const source = fnc({ status: 'confirmed', confBy: 'fay', confAt: 2, od: TODAY, by: 'fay' });
  const seedStatus = async (id, f = source) => env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), K + 'functions/' + id), f));
  const cancel = (f, by, x = {}) => Object.assign({}, f, { status: 'cancelled', v: f.v + 1, by, canBy: by, canAt: Date.now(), upd: Date.now(), od: '', chg: [] }, x);
  const undo = (f, old, by, x = {}) => Object.assign({}, f, { status: 'confirmed', v: f.v + 1, by, upd: Date.now(), od: old.od || '', kq: old.kq, chg: [] }, x);
  const statusOps = (id, before, after, h = before) => [['functions/' + id, after], ['functions/' + id + '/hist/' + before.v, { was: h, by: after.by, at: after.upd, what: 'Status changed' }]];
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), K + 'config/main'), { sousIds: ['sam'] }, { merge: true }));
  await seedStatus('cancel-sous');
  let c = cancel(source, 'sam'); c.canAt = c.upd;
  await ok(W(statusOps('cancel-sous', source, c), { id: 'sam' }), true, 'cancel access: a sous chef cancels in one audited batch without the Functions tick');
  await ok(W(statusOps('cancel-sous', source, c), { id: 'sam' }), false, 'cancel access: a repeated cancellation cannot overwrite the saved version');
  await ok(W(statusOps('cancel-sous', c, undo(c, source, 'hd')), { id: 'hd' }), false, 'cancel access: another chef cannot undo someone else\'s cancellation');
  await ok(W(statusOps('cancel-sous', c, undo(c, source, 'sam', { guests: 99 })), { id: 'sam' }), false, 'cancel access: Undo cannot change guests or other booking details');
  await ok(W(statusOps('cancel-sous', c, undo(c, source, 'sam')), { id: 'sam' }), true, 'cancel access: the same sous chef restores the preceding booking within two minutes');
  await seedStatus('cancel-head');
  c = cancel(source, 'hd'); c.canAt = c.upd;
  await ok(W(statusOps('cancel-head', source, c), { id: 'hd' }), true, 'cancel access: headId works even when not in sousIds or fnIds');
  await ok(W(statusOps('cancel-head', c, undo(c, source, 'hd')), { id: 'hd' }), true, 'cancel access: the head chef also has their own Undo');
  await seedStatus('cancel-staff');
  c = cancel(source, 'ann'); c.canAt = c.upd;
  await ok(W(statusOps('cancel-staff', source, c), { id: 'ann' }), false, 'cancel access: ordinary staff cannot cancel');
  c = cancel(source, 'sam'); c.canAt = c.upd;
  await ok(W(statusOps('cancel-staff', source, c), { id: 'ann', as: 'sam' }), false, 'cancel access: a staff PIN cannot impersonate a sous chef');
  await ok(W([['functions/cancel-staff', c]], { id: 'sam' }), false, 'cancel access: a chef cannot cancel without the matching history in the same batch');
  await ok(W(statusOps('cancel-staff', source, Object.assign({}, c, { notes: 'Overwritten' })), { id: 'sam' }), false, 'cancel access: cancellation cannot quietly edit notes');
  await ok(W(statusOps('cancel-staff', source, c, Object.assign({}, source, { guests: 99 })), { id: 'sam' }), false, 'cancel access: the history must be the actual previous booking');
  await ok(W(statusOps('cancel-staff', source, c).concat([['fncontact/cancel-staff', { cname: 'X', phone: '', email: '', upd: c.upd, by: 'sam' }]]), { id: 'sam' }), false, 'cancel access: cancellation does not grant contact writes');
  await ok(W([['functions/cancel-new', source]], { id: 'sam' }), false, 'cancel access: cancellation does not grant function creation');
  await ok(W(statusOps('cancel-staff', source, Object.assign({}, source, { v: 2, by: 'sam', loc: 'Changed' })), { id: 'sam' }), false, 'cancel access: cancellation does not grant general function editing');
  await seedStatus('cancel-manager');
  c = cancel(source, 'fay'); c.canAt = c.upd;
  await ok(W(statusOps('cancel-manager', source, c), { id: 'fay' }), true, 'cancel access: existing function managers retain cancellation');
  await seedStatus('cancel-admin');
  c = cancel(source, ''); c.canAt = c.upd;
  await ok(ownerBatch(statusOps('cancel-admin', source, c)), true, 'cancel access: the verified admin cancels');
  await seedStatus('cancel-expired');
  const expired = cancel(source, 'sam', { canAt: Date.now() - 130000, upd: Date.now() - 130000 }); expired.canAt = expired.upd;
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, K + 'functions/cancel-expired'), expired);
    await setDoc(doc(db, K + 'functions/cancel-expired/hist/1'), { was: source, by: 'sam', at: expired.upd, what: 'Cancelled' });
    await setDoc(doc(db, K + 'sessions/cancel-only'), dailySession('sam'));
  });
  await ok(W(statusOps('cancel-expired', expired, undo(expired, source, 'sam')), { id: 'sam' }), false, 'cancel access: Undo ends after two minutes');
  await ok(getDoc(doc(anonContext(env,'cancel-only').firestore(), K + 'fncontact/f1')), false, 'cancel access: a chef with a PIN session still cannot read contacts without the Functions tick');
  const futureDay = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), baseAt = Date.now() + 7 * 86400000;
  const largest = fnc({ status: 'confirmed', by: 'fay', confBy: 'fay', confAt: 2, date: futureDay, od: futureDay, start: baseAt,
    lines: Array.from({ length: 12 }, (_, i) => ({ rid: 'large-' + i, name: 'Platter ' + i, unit: 'platter', spec: '', fp: '', qty: 40, u: Array.from({ length: 40 }, (_, n) => Math.floor(n / 5)) })),
    rounds: Array.from({ length: 8 }, (_, i) => ({ at: baseAt + i * 1200000, note: '' })), first: baseAt, last: baseAt + 7 * 1200000, until: baseAt + 8 * 1200000, kq: baseAt + 8 * 1200000 });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, K + 'functions/cancel-largest'), largest);
    for (let i = 0; i < 12; i++) await setDoc(doc(db, K + 'days/' + futureDay + '/items/cancel-large-' + i), line({ text: 'Function platter', addedById: 'fay', done: true, doneAt: 1, doneById: 'ann', fn: 'cancel-largest', dupOk: true }));
    await setDoc(doc(db, K + 'orders/' + futureDay + '/lines/cancel-largest'), line({ text: 'Function stock', addedById: 'fay', ordered: true, orderedAt: 1, fn: 'cancel-largest', dupOk: true }));
  });
  const largeCancel = cancel(largest, 'sam'); largeCancel.canAt = largeCancel.upd;
  const sideEffects = on => Array.from({ length: 12 }, (_, i) => ['days/' + futureDay + '/items/cancel-large-' + i, { deleted: on }, true]).concat([['orders/' + futureDay + '/lines/cancel-largest', { deleted: on }, true]]);
  await ok(W(statusOps('cancel-largest', largest, largeCancel).concat(sideEffects(true)), { id: 'sam' }), true, 'cancel access: 12 platter lines, 8 rounds, history and all prep/order cleanup fit one rules-checked batch');
  await ok(W(statusOps('cancel-largest', largeCancel, undo(largeCancel, largest, 'sam')).concat(sideEffects(false)), { id: 'sam' }), true, 'cancel access: the largest Undo also fits the rules budget and keeps completed ticks');
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), K + 'config/main'), { sousIds: [] }, { merge: true }));
  await ok(W(statusOps('cancel-staff', source, cancel(source, 'sam')), { id: 'sam' }), false, 'cancel access: taking away the chef permission stops the next cancellation');
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), K + 'config/main'), { sousIds: cfgBefore.sousIds }, { merge: true }));
}
await ok(deleteDoc(doc(owner, K + 'functions/f1')), false, 'functions: never deleted');
await ok(W([['functions/f1/hist/1', { was: fnc(), at: 9, what: 'x' }]], { id: 'fay' }), false, 'functions: an earlier version cannot be changed');
await ok(W([['functions/f1/hist/7', { was: fnc(), at: 9, what: 'x' }]], { id: 'fay' }), false, 'functions: a history copy for a later version cannot be planted early');
await ok(getDoc(doc(anon, K + 'functions/f1')), false, 'functions: a PIN holder cannot read while signed out the kitchen copy');
await ok(getDoc(doc(anon, K + 'fncontact/f1')), false, 'functions: nobody reads a contact with only the kitchen PIN (22 Oct 2026, S9)');
await ok(getDocs(collection(anon, K + 'fncontact')), false, 'functions: nobody lists the contacts with only the kitchen PIN');
await ok(getDocs(collection(owner, K + 'fncontact')), true, 'functions: the Google account lists them (backup, PIN move)');
{
  const L6 = Array.from({ length: 12 }, (_, i) => ({ rid: 'p' + i, name: 'Platter ' + i, unit: 'platter', spec: 'Per platter.', fp: 'abcdef', qty: 40, u: Array.from({ length: 40 }, (_, k) => k % 8) }));
  const R8 = Array.from({ length: 8 }, (_, i) => ({ at: T0 + i * 600000, note: 'Round note' }));
  const big = fnc({ status: 'confirmed', lines: L6, rounds: R8, first: T0, last: T0 + 7 * 600000, kc: 'x'.repeat(2000), kcBy: 'fay', kcAt: 1, notes: 'n'.repeat(1000) });
  await ok(W([['functions/f8', big], ['fncontact/f8', { cname: 'Jo', phone: '0400 000 000', email: 'jo@example.com', upd: 1 }]], { id: 'fay' }), true, 'functions: the largest booking (12 platter lines over 8 rounds, 480 platters) is checked in full');
  await ok(W([['functions/f8', Object.assign({}, big, { v: 2 })], ['functions/f8/hist/1', { was: big, at: 2, what: 'Changed' }], ['fncontact/f8', { cname: 'Jo', phone: '0400 000 001', email: 'jo@example.com', upd: 2 }]], { id: 'fay' }), true, 'functions: the largest booking saved again with its earlier version and contact (the largest batch)');
  await ok(W([['functions/f9', fnc({ status: 'draft', lines: L6.concat([L6[0]]) })]], { id: 'fay' }), false, 'functions: at most 12 platter lines');
}
// a coordinator's tick taken away (owner save): the next save is refused; someone taken off the list cannot write at all
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { fnIds: ['finn'] }, { merge: true }); });
await ok(W([['functions/f1', fnc({ v: 4, status: 'confirmed', kc: 'Cake at 20:00', kcBy: 'finn', kcAt: 3 })]], { id: 'fay' }), false, 'functions: tick taken away: the next save is refused');
await ok(W([['days/' + TODAY + '/items/fay1', line({ addedById: 'fay' })]], { id: 'fay' }), true, 'functions: tick taken away: still on the list, so still writes the prep list');
await ok(W([['functions/f1', fnc({ v: 4, status: 'cancelled', kc: 'Cake at 20:00', kcBy: 'finn', kcAt: 3, canBy: 'finn', canAt: 5 })]], { id: 'finn' }), true, 'functions: the other coordinator cancels it');
await ok(W([['days/2026-10-19/items/gone1', line()]], { id: 'gone' }), false, 'staff lock: someone taken off the list cannot write with their old PIN');
await ok(W([['functions/f1', fnc({ v: 5, status: 'cancelled' })]], { id: 'fay', as: 'fay' }), false, 'functions: a coordinator cannot give themselves the tick back by writing anyway');
await ok(W([['config/main', { fnIds: ['finn', 'fay'] }, true]], { id: 'sam' }), false, 'functions: a sous chef cannot change who manages functions');
await ok(W([['config/main', { fnIds: ['finn', 'fay'] }, true]], { id: 'finn' }), false, 'functions: a coordinator cannot give anyone the tick');
// Functions: rounds ticked as sent (22 Oct 2026)
const sent = x => Object.assign({ fid: 'f1', at: T0 + 1800000, day: '2026-10-24', sent: true, sentAt: Date.now(), sentBy: 'ann' }, x || {});
const sid = 'fnsent/f1_' + (T0 + 1800000);
await ok(W([[sid, sent()]], { id: 'ann' }), true, 'sent: Ann ticks a round as sent, as herself');
await ok(W([['fnsent/f1_123', sent()]], { id: 'ann' }), false, 'sent: the record id must be the function and the round time');
await ok(W([['fnsent/f1_' + (T0 + 3600000), sent({ at: T0 + 3600000, sentBy: 'sam' })]], { id: 'ann' }), false, 'sent: Ann cannot tick in someone else\'s name');
await ok(W([[sid, sent({ sent: false })]], { id: 'bo' }), false, 'sent: Bo cannot take back Ann\'s tick');
await ok(W([[sid, sent({ sent: false })]], { id: 'ann' }), true, 'sent: Ann takes her own tick back within 2 minutes (a mis-tap)');
await ok(W([[sid, sent({ sentBy: 'bo', sentAt: Date.now() })]], { id: 'bo' }), true, 'sent: Bo ticks it again');
await ok(W([[sid, sent({ sent: false, sentBy: 'bo' })]], { id: 'sam' }), true, 'sent: a sous chef may take any tick back');
await ok(W([['fnsent/f1_' + (T0 + 5400000), sent({ at: T0 + 5400000, price: 1 })]], { id: 'ann' }), false, 'sent: no other fields');
await ok(setDoc(doc(anon, K + 'fnsent/f1_' + (T0 + 5400000)), sent({ at: T0 + 5400000, by: 'ann' })), false, 'sent: no tick without a PIN');
await ok(deleteDoc(doc(owner, K + sid)), false, 'sent: never deleted');
// A change to a past day stamps config/main.pastEdit (22 Oct 2026), so other phones read their saved past days again
await ok(W([['config/main', { pastEdit: { p: Date.now() } }, true]], { id: 'sam' }), true, 'pastEdit: a sous chef stamps a past prep change');
await ok(W([['config/main', { pastEdit: { p: Date.now(), o: Date.now() } }, true]], { id: 'hd' }), true, 'pastEdit: the head chef with their PIN stamps prep and orders');
await ok(W([['config/main', { pastEdit: { p: Date.now() } }, true]], { id: 'ann' }), false, 'pastEdit: staff cannot stamp it');
await ok(W([['config/main', { pastEdit: { p: Date.now() }, pingIds: ['ann'] }, true]], { id: 'sam' }), false, 'pastEdit: nothing else may change in the same write');
await ok(W([['config/main', { pastEdit: { z: 1 } }, true]], { id: 'sam' }), false, 'pastEdit: only p, o, n and x');
// the head chef's Google account stamps a past transfer change (x, 23 Oct 2026); a sous chef's next stamp keeps it in the map
await ok(setDoc(doc(owner, K + 'config/main'), { pastEdit: { x: Date.now() } }, { merge: true }), true, 'pastEdit: the Google account stamps a past transfer change (x)');
await ok(W([['config/main', { pastEdit: { p: Date.now() } }, true]], { id: 'sam' }), true, 'pastEdit: a sous chef still stamps prep with x in the map');
await ok(W([['config/main', { pastEdit: { x: 'now' } }, true]], { id: 'sam' }), false, 'pastEdit: the transfers stamp is a number');
await ok(W([['config/main', { pastEdit: { n: Date.now() } }, true]], { id: 'sam' }), true, 'pastEdit: a sous chef stamps a change to today\'s shift pings (n)');
await ok(W([['config/main', { pastEdit: { n: 'now' } }, true]], { id: 'sam' }), false, 'pastEdit: the pings stamp is a number');
await ok(W([['config/main', { pastEdit: { n: Date.now() } }, true]], { id: 'ann' }), false, 'pastEdit: staff cannot stamp the pings');
await ok(W([['config/main', { pastEdit: { p: 'soon' } }, true]], { id: 'sam' }), false, 'pastEdit: times are numbers');
// Wastage (22 Oct 2026): today's lines with the kitchen PIN, past days only for the head chef's Google account,
// the review written by the head chef or a sous chef, the nightly summary read only
const kday = ms => new Date(ms + 36000000).toISOString().slice(0, 10);
// isToday() in the rules lets a day in from 23:45 the night before and keeps it until 00:15 after, so "yesterday"
// and "tomorrow" are taken 24 hours and 30 minutes away: a run between 23:45 and 00:15 kitchen time still gets a day
// outside that window (just after midnight that is the day before yesterday)
const WT = kday(Date.now()), WY = kday(Date.now() - 88200000), WN = kday(Date.now() + 88200000);
const wline = x => Object.assign({ text: 'Chips', amount: 2, unit: 'kg', reason: 'excess', action: '', station: 'Fryer', addedBy: 'Ann', addedById: 'ann', addedAt: 1, deleted: false }, x || {});
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + 'waste/' + WT + '/lines/t1'), wline());
  await setDoc(doc(db, K + 'waste/' + WY + '/lines/y1'), wline({ text: 'Rice' }));
  await setDoc(doc(db, K + 'waste/' + WY), { avoidable: 'Rice', change: 'Cook less rice', reviewBy: 'Sam', reviewAt: 1 });
  await setDoc(doc(db, K + 'summary/waste'), { day: WT, items: [] });
});
await ok(getDoc(doc(anon, K + 'waste/' + WT + '/lines/t1')), false, 'waste: today\'s entry is read with the kitchen PIN');
await ok(getDocs(collection(anon, K + 'waste/' + WT + '/lines')), false, 'waste: today\'s list is read with the kitchen PIN');
await ok(getDoc(doc(anon, K + 'waste/' + WY + '/lines/y1')), false, 'waste: yesterday\'s entry is refused with only the kitchen PIN');
await ok(getDocs(collection(anon, K + 'waste/' + WY + '/lines')), false, 'waste: yesterday\'s list is refused with only the kitchen PIN');
await ok(getDocs(collection(anon, K + 'waste/' + WN + '/lines')), false, 'waste: tomorrow\'s list is refused too');
await ok(getDocs(collection(anon, K + 'waste/nonsense/lines')), false, 'waste: a day that is not a date is refused');
await ok(getDocs(collection(owner, K + 'waste/' + WY + '/lines')), true, 'waste: the head chef\'s Google account reads past days');
await ok(W([['waste/' + WT + '/lines/t2', wline()]], { id: 'ann' }), true, 'waste: Ann logs an entry today');
await ok(W([['waste/' + WT + '/lines/t1', wline({ deleted: true }), true]], { id: 'ann' }), false, 'waste: Ann cannot remove an entry');
await ok(W([['waste/' + WT + '/lines/t1', { deleted: true, deletedBy: 'Sam', deletedAt: 5 }, true]], { id: 'sam' }), false, 'waste: a sous chef cannot remove Ann\'s entry (head chef decision, 22 Oct 2026)');
await ok(W([['waste/' + WT + '/lines/s1', wline({ addedBy: 'Sam', addedById: 'sam', addedAt: Date.now() })]], { id: 'sam' }), true, 'waste: Sam logs an entry');
await ok(W([['waste/' + WT + '/lines/s1', { deleted: true, deletedBy: 'Sam', deletedAt: Date.now() }, true]], { id: 'sam' }), true, 'waste: Sam undoes his own entry straight after');
await ok(W([['waste/' + WT + '/lines/s1', { amount: 9 }, true]], { id: 'sam' }), false, 'waste: Sam cannot change the amount');
await ok(W([['waste/' + WT + '/lines/s2', wline({ addedBy: 'Sam', addedById: 'sam', addedAt: Date.now() - 600000 })]], { id: 'sam' }), true, 'waste: an entry Sam logged 10 minutes ago');
await ok(W([['waste/' + WT + '/lines/s2', { deleted: true, deletedBy: 'Sam', deletedAt: Date.now() }, true]], { id: 'sam' }), false, 'waste: Sam cannot undo it 10 minutes later');
await ok(updateDoc(doc(owner, K + 'waste/' + WY + '/lines/y1'), { deleted: true, deletedBy: 'Head chef', deletedAt: 5 }), true, 'waste: the head chef\'s Google account removes a past entry');
await ok(getDoc(doc(anon, K + 'waste/' + WY)), false, 'waste review: everyone cannot read while signed out it (the note on the prep list)');
await ok(W([['waste/' + WT, { avoidable: 'Chips', change: '' }, true]], { id: 'ann' }), false, 'waste review: staff cannot write it');
await ok(W([['waste/' + WT, { avoidable: 'Chips', change: 'Fewer chips' }, true]], { id: 'sam' }), true, 'waste review: a sous chef writes it');
await ok(W([['waste/' + WT, { avoidable: 'Chips', change: '' }, true]], { id: 'ann', as: 'sam' }), false, 'waste review: Ann cannot write it as Sam');
await ok(setDoc(doc(owner, K + 'waste/' + WY), { avoidable: 'Rice', change: 'Half a batch', reviewBy: 'Head chef', reviewAt: 2 }, { merge: true }), true, 'waste review: the head chef writes it from the admin panel');
await ok(getDoc(doc(anon, K + 'summary/waste')), false, 'summary: the phones read the wastage summary');
// usage counts (22 Oct 2026): one record a day per phone, counts only, written as the person, read only by the head chef
const dly = x => Object.assign({ day: '2026-10-21', tag: 'abc123', sg: { quick: { s: 1, t: 2, d: 0 } }, pf: { lcp: [1, 0, 0, 0, 0] }, at: 5 }, x || {});
await ok(W([['daily/2026-10-21_abc123', dly()]], { id: 'ann' }), true, 'daily: a phone sends its counts as the person signed in');
await ok(setDoc(doc(anon, K + 'daily/2026-10-21_zzz'), dly({ tag: 'zzz' })), false, 'daily: no PIN session, refused');
await ok(W([['daily/2026-10-21_other', dly()]], { id: 'ann' }), false, 'daily: the id must be the day and the tag');
await ok(W([['daily/2026-10-21_abc124', dly({ tag: 'abc124', text: 'Slice onions' })]], { id: 'ann' }), false, 'daily: no other fields (no text)');
await ok(getDoc(doc(anon, K + 'daily/2026-10-21_abc123')), false, 'daily: a PIN holder cannot read the counts');
await ok(getDoc(doc(owner, K + 'daily/2026-10-21_abc123')), true, 'daily: the head chef\'s Google account reads them');
await ok(W([['summary/waste', { day: WT, items: [] }]], { id: 'sam' }), false, 'summary: no phone writes it, not even a sous chef');
await ok(setDoc(doc(owner, K + 'summary/waste'), { day: WT, items: [] }), true, 'summary: the head chef may copy it (moving the kitchen PIN)');
// Transfers between venues (23 Oct 2026): like wastage, today's lines with the kitchen PIN and past days only for the
// head chef's Google account. Tighter than wastage: only the known fields, a day near today, the writer's own id, no
// time ahead, and Remove, Put back and Undo change only the removed fields
const xline = x => Object.assign({ dir: 'out', venue: 'Riviera', person: 'Jo', text: 'Butter', amount: 2, unit: 'kg', note: '', addedBy: 'Ann', addedById: 'ann', addedAt: 1, deleted: false }, x || {});
const XT = 'transfers/' + WT + '/lines/', XY = 'transfers/' + WY + '/lines/';
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + XT + 't1'), xline());
  await setDoc(doc(db, K + XY + 'y1'), xline({ dir: 'in', text: 'Eggs', amount: 30, unit: 'pieces' }));
});
await ok(getDoc(doc(anon, K + XT + 't1')), false, 'transfers: today\'s line is read with the kitchen PIN');
await ok(getDocs(collection(anon, K + 'transfers/' + WT + '/lines')), false, 'transfers: today\'s list is read with the kitchen PIN');
await ok(getDoc(doc(anon, K + XY + 'y1')), false, 'transfers: yesterday\'s line is refused with only the kitchen PIN');
await ok(getDocs(collection(anon, K + 'transfers/' + WY + '/lines')), false, 'transfers: yesterday\'s list is refused with only the kitchen PIN');
await ok(getDocs(collection(anon, K + 'transfers/' + WN + '/lines')), false, 'transfers: tomorrow\'s list is refused too');
await ok(getDocs(collection(anon, K + 'transfers/nonsense/lines')), false, 'transfers: a day that is not a date is refused');
await ok(getDocs(collection(wPhone('w-sam'), K + 'transfers/' + WY + '/lines')), false, 'transfers: a sous chef\'s phone cannot read past days either');
await ok(getDocs(collection(owner, K + 'transfers/' + WY + '/lines')), true, 'transfers: the head chef\'s Google account reads past days');
await ok(W([[XT + 't2', xline({ addedAt: Date.now() })]], { id: 'ann' }), true, 'transfers: Ann logs one another venue took from us');
await ok(W([[XT + 't3', xline({ dir: 'in', person: '', addedAt: Date.now() })]], { id: 'ann' }), true, 'transfers: and one we took from them (who gave it may be left blank)');
await ok(W([[XT + 't4', xline({ tst: true })]], { id: 'ann' }), true, 'transfers: practice mode marks it (tst)');
await ok(W([['transfers/' + kday(Date.now() - 86400000) + '/lines/t5', xline()]], { id: 'ann' }), true, 'transfers: a line for yesterday, sent after midnight (no signal), still lands');
await ok(W([[XT + 't6', xline({ venue: 'x'.repeat(40), person: 'x'.repeat(40), text: 'x'.repeat(80), note: 'x'.repeat(120), addedBy: 'x'.repeat(80), amount: 99999.5, unit: 'boxes' })]], { id: 'ann' }), true, 'transfers: every box filled to its cap is fine');
await ok(W([[XT + 't7', xline({ unit: 'packs', addedAt: Date.now() + 600000 })]], { id: 'ann' }), true, 'transfers: a phone clock 10 minutes fast is fine');
await ok(setDoc(doc(anon, K + XT + 'n1'), xline({ by: 'ann' })), false, 'transfers: no PIN session, refused');
await ok(W([[XT + 'n2', xline()]], { id: 'ann', pin: '9999' }), false, 'transfers: wrong PIN, refused');
await ok(W([[XT + 'n3', xline({ addedBy: 'Sam', addedById: 'sam' })]], { id: 'ann', as: 'sam' }), false, 'transfers: spoofed by: Ann\'s session with by Sam is refused');
await ok(W([[XT + 'n4', xline({ addedBy: 'Bo', addedById: 'bo' })]], { id: 'ann' }), false, 'transfers: a line written as someone else is refused');
await ok(W([['transfers/' + OLD + '/lines/n5', xline()]], { id: 'ann' }), false, 'transfers: staff cannot log on a day long past');
await ok(W([['transfers/' + OLD + '/lines/n6', xline({ addedBy: 'Sam', addedById: 'sam' })]], { id: 'sam' }), false, 'transfers: nor can a sous chef');
await ok(W([[XT + 'n7', xline({ venue: 'x'.repeat(41) })]], { id: 'ann' }), false, 'transfers: a venue over 40 characters is refused');
await ok(W([[XT + 'n8', xline({ venue: '' })]], { id: 'ann' }), false, 'transfers: so is no venue');
await ok(W([[XT + 'n9', xline({ person: 'x'.repeat(41) })]], { id: 'ann' }), false, 'transfers: who came for it, over 40 characters');
await ok(W([[XT + 'n10', xline({ text: '' })]], { id: 'ann' }), false, 'transfers: an empty item is refused');
await ok(W([[XT + 'n11', xline({ text: 'x'.repeat(81) })]], { id: 'ann' }), false, 'transfers: an item over 80 characters');
await ok(W([[XT + 'n12', xline({ note: 'x'.repeat(121) })]], { id: 'ann' }), false, 'transfers: a note over 120 characters');
await ok(W([[XT + 'n13', xline({ addedBy: 'x'.repeat(81) })]], { id: 'ann' }), false, 'transfers: a name over 80 characters');
await ok(W([[XT + 'n14', xline({ amount: '2' })]], { id: 'ann' }), false, 'transfers: the amount is a number, not text');
await ok(W([[XT + 'n15', xline({ amount: 0 })]], { id: 'ann' }), false, 'transfers: the amount is more than 0');
await ok(W([[XT + 'n16', xline({ amount: 100000 })]], { id: 'ann' }), false, 'transfers: and under 100000');
await ok(W([[XT + 'n17', xline({ unit: 'portions' })]], { id: 'ann' }), false, 'transfers: a unit off the list (portions is for wastage)');
await ok(W([[XT + 'n18', xline({ dir: 'lent' })]], { id: 'ann' }), false, 'transfers: out or in only');
await ok(W([[XT + 'n19', xline({ price: 3.5 })]], { id: 'ann' }), false, 'transfers: no other fields (never a price)');
await ok(W([[XT + 'n20', xline({ deleted: true })]], { id: 'ann' }), false, 'transfers: a new line is not removed');
await ok(W([[XT + 'n21', xline({ addedAt: Date.now() + 3600000 })]], { id: 'ann' }), false, 'transfers: a time an hour ahead is refused (it would stretch the Undo)');
await ok(W([[XT + 'n22', xline({ tst: 'yes' })]], { id: 'ann' }), false, 'transfers: practice mode is true or false');
await ok(W([[XT + 't2', { deleted: true, deletedBy: 'Ann', deletedAt: Date.now() }, true]], { id: 'ann' }), false, 'transfers: Ann cannot remove one, not even her own straight after');
await ok(W([[XT + 't2', { deleted: true, deletedBy: 'Sam', deletedAt: Date.now() }, true]], { id: 'sam' }), false, 'transfers: a sous chef cannot remove Ann\'s');
await ok(W([[XT + 's1', xline({ addedBy: 'Sam', addedById: 'sam', addedAt: Date.now() })]], { id: 'sam' }), true, 'transfers: Sam logs one');
await ok(W([[XT + 's1', { deleted: true, deletedBy: 'S'.repeat(81), deletedAt: Date.now() }, true]], { id: 'sam' }), false, 'transfers: Sam\'s Undo names him in 80 characters or fewer');
await ok(W([[XT + 's1', { deleted: true, deletedBy: 'Sam', deletedAt: 'now' }, true]], { id: 'sam' }), false, 'transfers: Sam\'s Undo time is a number');
await ok(W([[XT + 's1', { deleted: true, deletedBy: 'Sam', deletedAt: Date.now() }, true]], { id: 'sam' }), true, 'transfers: Sam undoes his own straight after');
await ok(W([[XT + 's1', { amount: 9 }, true]], { id: 'sam' }), false, 'transfers: Sam cannot change the amount');
await ok(W([[XT + 's2', xline({ addedBy: 'Sam', addedById: 'sam', addedAt: Date.now() - 600000 })]], { id: 'sam' }), true, 'transfers: one Sam logged 10 minutes ago');
await ok(W([[XT + 's2', { deleted: true, deletedBy: 'Sam', deletedAt: Date.now() }, true]], { id: 'sam' }), false, 'transfers: Sam cannot undo it 10 minutes later');
await ok(updateDoc(doc(owner, K + XY + 'y1'), { deleted: true, deletedBy: 'Head chef', deletedAt: 5 }), true, 'transfers: the head chef\'s Google account removes a past line');
await ok(updateDoc(doc(owner, K + XY + 'y1'), { deleted: false, deletedBy: '', deletedAt: 0 }), true, 'transfers: and puts it back');
await ok(updateDoc(doc(owner, K + XY + 'y1'), { deleted: true, deletedBy: 'Hedy', deletedAt: 6, by: 'hd' }), true, 'transfers: also with a PIN signed in on that device (by)');
await ok(updateDoc(doc(owner, K + XY + 'y1'), { amount: 9 }), false, 'transfers: the Google account cannot change the amount');
await ok(updateDoc(doc(owner, K + XY + 'y1'), { deleted: 'yes' }), false, 'transfers: removed is true or false');
await ok(updateDoc(doc(owner, K + XY + 'y1'), { deleted: true, deletedBy: 'H'.repeat(81), deletedAt: 7 }), false, 'transfers: who removed it is 80 characters or fewer');
await ok(updateDoc(doc(owner, K + XY + 'y1'), { deleted: true, deletedBy: 'Head chef', deletedAt: 'now' }), false, 'transfers: when it was removed is a number');
await ok(setDoc(doc(owner, K + 'transfers/' + OLD + '/lines/c1'), xline({ by: 'ann', station: 'Larder', old: 1 })), true, 'transfers: the head chef copies a line as it is (moving the kitchen PIN), older fields too');
const xgone = xline({ by: 'sam', deleted: true, deletedBy: 'Head chef', deletedAt: 5, old: 1 });
await ok(setDoc(doc(owner, K + 'transfers/' + OLD + '/lines/c2'), xgone), true, 'transfers: and a removed one, with who removed it and when');
await ok(setDoc(doc(owner, K + 'transfers/' + OLD + '/lines/c2'), xgone), true, 'transfers: a move tried again copies it over itself');
await ok(deleteDoc(doc(owner, K + XY + 'y1')), false, 'transfers: never deleted, not even by the head chef');
await ok(W([['config/main', { pastEdit: { x: Date.now() } }, true]], { id: 'ann' }), true, 'returns: staff may invalidate cached transfer history');
await ok(W([['config/main', { pastEdit: { p: Date.now() } }, true]], { id: 'ann' }), false, 'returns: staff cannot invalidate unrelated prep history');
// Physical returns: old loans stay visible through a bounded open-only query.
const loanDay = OLD, loanPath = 'transfers/' + loanDay + '/lines/loan-return';
const loanIndex = 'transferOpen/' + loanDay + '_loan-return';
let loanRecord = xline({ by: 'ann' });
const indexRecord = (record, day = loanDay, lineId = 'loan-return') => ({ date: day, lineId, record, open: !record.deleted && !record.returned });
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + loanPath), loanRecord);
  await setDoc(doc(db, K + loanIndex), indexRecord(loanRecord));
});
await ok(getDocs(query(collection(anon, K + 'transferOpen'), where('open', '==', true))), false, 'returns: the open query includes older loans');
await ok(getDocs(collection(anon, K + 'transferOpen')), false, 'returns: the complete return history stays private');
const returnFields = (id = 'ann', time = Date.now()) => ({ returned: true, returnedBy: id, returnedById: id, returnedAt: time });
async function returnLoan(fields, id = 'ann', altered = {}) {
  const next = { ...loanRecord, ...fields, ...altered, by: id };
  return W([[loanPath, { ...fields, ...altered }, true], [loanIndex, indexRecord(next)]], { id });
}
await ok(W([[loanPath, returnFields(), true]], { id: 'ann' }), false, 'returns: a return without the matching index is refused');
await ok(returnLoan(returnFields(), 'ann', { amount: 99 }), false, 'returns: a return cannot alter the original quantity');
await ok(returnLoan(returnFields('bo')), false, 'returns: cannot claim another person confirmed it');
await ok(returnLoan(returnFields('ann', Date.now() + 600000)), false, 'returns: cannot give a return a future time');
await ok(setDoc(doc(anon, K + loanIndex), indexRecord(loanRecord)), false, 'returns: no PIN session cannot write the open index');
await ok(W([[loanIndex, indexRecord({ ...loanRecord, amount: 99 })]], { id: 'ann' }), false, 'returns: a forged open snapshot is refused');
let fields = returnFields();
await ok(returnLoan(fields), true, 'returns: a staff PIN returns an older loan in one batch');
loanRecord = { ...loanRecord, ...fields, by: 'ann' };
await ok(getDoc(doc(anon, K + loanIndex)), false, 'returns: a completed loan is hidden from open readers');
await ok(getDoc(doc(owner, K + loanIndex)), true, 'returns: the head chef can read completed history');
await ok(returnLoan(returnFields()), false, 'returns: two phones cannot re-stamp an already returned loan');
const unreturn = { returned: false, returnedBy: '', returnedById: '', returnedAt: 0 };
await ok(returnLoan(unreturn, 'bo'), false, 'returns: another staff member cannot undo the confirmation');
await ok(returnLoan(unreturn), true, 'returns: the confirmer may undo a mis-tap');
loanRecord = { ...loanRecord, returned: true, returnedById: 'ann', returnedBy: 'ann', returnedAt: Date.now() - 600000 };
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + loanPath), loanRecord);
  await setDoc(doc(db, K + loanIndex), indexRecord(loanRecord));
});
await ok(returnLoan(unreturn), false, 'returns: staff Undo expires after two minutes');
await ok(returnLoan(unreturn, 'sam'), true, 'returns: a chef may reopen an older confirmation');
const fresh = xline({ by: 'ann', addedAt: Date.now() });
await ok(W([['transfers/' + WT + '/lines/new-loan', fresh], ['transferOpen/' + WT + '_new-loan', indexRecord(fresh, WT, 'new-loan')]], { id: 'ann' }), true, 'returns: a new loan and its index are saved together');

// PIN sessions (22 Oct 2026): a phone signed in anonymously writes a PIN try first (one per person every 20 s), then
// opens a session if that try was right; writes go through the session
const phone = id => env.authenticatedContext(id, { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const ph1 = phone('ph1'), ph2 = phone('ph2'), ph3 = phone('ph3');
await env.withSecurityRulesDisabled(async ctx => { const db = ctx.firestore(); await setDoc(doc(db, K + 'pinset/ann'), { at: 111 }); await setDoc(doc(db, K + 'pinset/bo'), { at: 222 }); });
const tryPin = (db, id, pin, uid) => setDoc(doc(db, K + 'tries/' + id), { tok: hash(id, pin), at: serverTimestamp(), uid });
const sess = (db, uid, id, x) => setDoc(doc(db, K + 'sessions/' + uid), Object.assign({ by: id, pinAt: id === 'ann' ? 111 : 222, exp: nextFour(Date.now()), at: serverTimestamp(),issuedAt:serverTimestamp(),mode:'personal',v:2 }, x || {}));
await ok(tryPin(anon, 'ann', '2222', 'ph1'), false, 'sessions: a try needs a signed-in phone');
await ok(tryPin(ph1, 'ann', '2222', 'ph2'), false, 'sessions: a try is written as the phone itself');
await ok(tryPin(ph1, 'ann', '2222', 'ph1'), true, 'sessions: Ann\'s phone writes a PIN try');
await ok(tryPin(ph1, 'ann', '2222', 'ph1'), false, 'sessions: a second try within 20 seconds is refused');
await ok(sess(ph2, 'ph2', 'ann'), false, 'sessions: another phone cannot use Ann\'s try');
await ok(sess(ph1, 'ph1', 'ann', { exp: Date.now() + 40 * 86400000 }), false, 'sessions: a session cannot run beyond the next 04:00');
await ok(sess(ph1, 'ph1', 'ann', { pinAt: 5 }), false, 'sessions: the session must name Ann\'s PIN time');
await ok(sess(ph1, 'ph1', 'ann'), true, 'sessions: the right try opens a session');
await ok(setDoc(doc(ph1, K + 'days/' + TODAY + '/items/sx1'), line({ by: 'ann', addedById: 'ann' })), true, 'sessions: Ann writes a line through her session');
await ok(setDoc(doc(ph2, K + 'days/' + TODAY + '/items/sx2'), line({ by: 'ann', addedById: 'ann' })), false, 'sessions: another phone cannot write as Ann');
await ok(setDoc(doc(ph1, K + 'days/' + TODAY + '/items/sx3'), line({ by: 'bo', addedById: 'bo' })), false, 'sessions: Ann\'s session cannot write as Bo');
await ok(tryPin(ph3, 'bo', '9999', 'ph3'), true, 'sessions: a wrong try is written (and counts)');
await ok(sess(ph3, 'ph3', 'bo'), false, 'sessions: a wrong try opens no session');
await ok(tryPin(ph3, 'bo', '3333', 'ph3'), false, 'sessions: and the next try waits 20 seconds');
await ok(getDoc(doc(ph2, K + 'sessions/ph1')), false, 'sessions: a phone cannot read another phone\'s session');
await ok(getDoc(doc(ph1, K + 'tries/ann')), false, 'sessions: nobody reads a try');
await ok(sess(ph1, 'ph1', 'ann', { exp: nextFour(Date.now()) }), true, 'sessions: a running session keeps its 04:00 deadline');
await env.withSecurityRulesDisabled(async ctx => { await deleteDoc(doc(ctx.firestore(), K + 'pinset/ann')); });
await ok(setDoc(doc(ph1, K + 'days/' + TODAY + '/items/sx4'), line({ by: 'ann', addedById: 'ann' })), false, 'sessions: after Reset PIN the session writes nothing');
await env.withSecurityRulesDisabled(async ctx => { const db = ctx.firestore(); await setDoc(doc(db, K + 'pinset/ann'), { at: 333 }); await setDoc(doc(db, K + 'staffpins/ann'), { hash: hash('ann', '7777') }); });
await ok(setDoc(doc(ph1, K + 'days/' + TODAY + '/items/sx5'), line({ by: 'ann', addedById: 'ann' })), false, 'sessions: nor after a new PIN (a new PIN time)');
await ok(sess(ph1, 'ph1', 'ann', { pinAt: 333, exp: Date.now() + 20 * 86400000 }), false, 'sessions: and cannot move on to the new PIN without a try');
await ok(deleteDoc(doc(ph1, K + 'sessions/ph1')), true, 'sessions: the phone ends its own session (Sign out)');
await ok(deleteDoc(doc(ph2, K + 'sessions/ph3')), false, 'sessions: not another phone\'s');
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'staffpins/ann'), { hash: hash('ann', '2222') }); });
await ok(setDoc(doc(ph2, K + 'tries/cal'), { tok: 'short', at: serverTimestamp(), uid: 'ph2' }), false, 'sessions: a try must carry a full PIN fingerprint');
await ok(setDoc(doc(ph2, K + 'tries/cal'), { tok: hash('cal', '1234'), at: serverTimestamp(), uid: 'ph2', pin: '1234' }), false, 'sessions: a try takes no other fields');
await ok(setDoc(doc(ph2, K + 'tries/cal'), { tok: hash('cal', '1234'), at: Timestamp.fromMillis(Date.now() - 60000), uid: 'ph2' }), false, 'sessions: a try is stamped with the server\'s time');
// a session that ran out, and one for someone taken off the list, write nothing (planted with the rules off)
const ph4 = phone('ph4'), ph5 = phone('ph5');
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + 'sessions/ph4'), dailySession('bo',{pinAt:222,exp:Date.now()-1000}));
  await setDoc(doc(db, K + 'pinset/zed'), { at: 444 }); await setDoc(doc(db, K + 'staffpins/zed'), { hash: hash('zed', '5555') });
  await setDoc(doc(db, K + 'sessions/ph5'), dailySession('zed',{pinAt:444}));
});
await ok(setDoc(doc(ph4, K + 'days/' + TODAY + '/items/sx6'), line({ by: 'bo', addedById: 'bo' })), false, 'sessions: a session that ran out writes nothing');
await ok(sess(ph4, 'ph4', 'bo', { exp: Date.now() + 86400000 }), false, 'sessions: and cannot be moved forward');
await ok(setDoc(doc(ph5, K + 'days/' + TODAY + '/items/sx7'), line({ by: 'zed', addedById: 'zed' })), false, 'sessions: someone off the list (Stopped working here) writes nothing with a session');
await ok(tryPin(ph5, 'zed', '5555', 'ph5'), true, 'sessions: their try may be written');
await ok(setDoc(doc(ph5, K + 'sessions/ph5'), { by: 'zed', pinAt: 444, exp: Date.now() + 86400000, at: serverTimestamp() }), false, 'sessions: but opens no session, even with the right PIN');
await ok(getDoc(doc(ph1, K + 'sessions/ph1')), true, 'sessions: a phone reads its own session');
// Function contacts and minutes drafts (22 Oct 2026, review S9): a contact is read only through a function manager's PIN
// session or by the Google account; a minutes draft only by the Google account
const ph6 = phone('ph6'), ph7 = phone('ph7'), ph8 = phone('ph8'), ph9 = phone('ph9');
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + 'config/main'), { fnIds: ['finn'] }, { merge: true });
  await setDoc(doc(db, K + 'pinset/finn'), { at: 555 });
  await setDoc(doc(db, K + 'sessions/ph6'), dailySession('finn',{pinAt:555}));
  await setDoc(doc(db, K + 'sessions/ph7'), dailySession('ann',{pinAt:333}));
  await setDoc(doc(db, K + 'sessions/ph8'), dailySession('finn',{pinAt:555,exp:Date.now()-1000}));
});
await ok(getDoc(doc(ph6, K + 'fncontact/f1')), true, 'contacts: a function manager reads one through their PIN session');
await ok(getDoc(doc(owner, K + 'fncontact/f1')), true, 'contacts: the Google account reads one');
await ok(getDoc(doc(ph7, K + 'fncontact/f1')), false, 'contacts: staff with a session cannot');
await ok(getDoc(doc(ph8, K + 'fncontact/f1')), false, 'contacts: nor a manager whose session ran out');
await ok(getDoc(doc(ph9, K + 'fncontact/f1')), false, 'contacts: nor a phone with no session');
await ok(getDocs(collection(ph6, K + 'fncontact')), false, 'contacts: a manager still cannot list them');
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { fnIds: [] }, { merge: true }); });
await ok(getDoc(doc(ph6, K + 'fncontact/f1')), false, 'contacts: once the Functions tick is taken away, not even the manager');
await env.withSecurityRulesDisabled(async ctx => { const db = ctx.firestore(); await setDoc(doc(db, K + 'config/main'), { fnIds: ['finn'] }, { merge: true }); await setDoc(doc(db, K + 'pinset/finn'), { at: 556 }); });
await ok(getDoc(doc(ph6, K + 'fncontact/f1')), false, 'contacts: nor after their PIN is reset');
const minQ = (db, f, op, v) => getDocs(query(collection(db, K + 'minutes'), where(f, op, v)));
await ok(getDoc(doc(anon, K + 'minutes/d1')), false, 'minutes: a draft cannot be read with only the kitchen PIN');
await ok(getDoc(doc(ph7, K + 'minutes/d1')), false, 'minutes: nor through a PIN session');
await ok(getDoc(doc(anon, K + 'minutes/m1')), false, 'minutes: published minutes cannot be read while signed out');
await ok(minQ(anon, 'pubAt', '>=', 1), false, 'minutes: the kitchen lists the published minutes, asking by pubAt');
await ok(minQ(anon, 'date', '>=', '2026-01-01'), false, 'minutes: a list by date could hold drafts, so it is refused');
await ok(getDocs(collection(anon, K + 'minutes')), false, 'minutes: so is the whole collection');
await ok(minQ(owner, 'date', '>=', '2026-01-01'), true, 'minutes: the Google account lists them all, drafts too');
await ok(setDoc(doc(owner, K + 'minutes/m9'), mins({ no: 9, status: 'draft', pubAt: 5 })), false, 'minutes: a draft never carries pubAt');
await ok(getDocs(collection(anon, K + 'minutes/m1/signs')), false, 'minutes: the sign-offs cannot be listed with only the kitchen PIN');
// Sign-off reads (27 Oct 2026). From 26 Oct (#387) only the Google account could read them, so nobody could sign on a PIN: the
// Sign button, the bell's dot and the start of the shift all wait for the person's own sign-off, signed or not yet. A person
// reads their own by id (<version>_<their id>). The register lists every sign-off: the Google account, and the chefs
// (sousIds, headId) on their own PIN session.
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { headId: 'hd', sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo', 'cal', 'hd'] }, { merge: true }); });
async function signPhone(id, exp) {
  const uid = 'sg-' + id + (exp ? '-old' : '');
  await env.withSecurityRulesDisabled(async ctx => { const c = ctx.firestore(), ps = await getDoc(doc(c, K + 'pinset/' + id)); await setDoc(doc(c, K + 'sessions/' + uid), dailySession(id,{pinAt:ps.data().at,...(exp?{exp}:{})})); });
  return wPhone(uid);
}
const sgAnn = await signPhone('ann'), sgBo = await signPhone('bo'), sgSam = await signPhone('sam'), sgHd = await signPhone('hd'), sgOld = await signPhone('ann', Date.now() - 1000);
const signGet = (db, p) => getDoc(doc(db, K + 'minutes/' + p)), signList = db => getDocs(collection(db, K + 'minutes/m1/signs'));
await ok(signGet(sgAnn, 'm1/signs/1_ann'), true, 'sign-off read: Ann reads her own sign-off by id');
await ok(signGet(sgAnn, 'm3/signs/1_ann'), true, 'sign-off read: and asks for one she has not made yet (so the Sign button shows)');
await ok(signGet(sgAnn, 'm2/signs/2_ann'), true, 'sign-off read: her own for version 2');
await ok(signGet(sgAnn, 'm1/signs/1_bo'), false, 'sign-off read: Ann cannot read Bo\'s');
await ok(signGet(sgBo, 'm1/signs/1_ann'), false, 'sign-off read: nor Bo Ann\'s');
await ok(signGet(sgAnn, 'm1/signs/x_ann'), false, 'sign-off read: the version in front of the id is digits');
await ok(signGet(sgAnn, 'm1/signs/1_ann_x'), false, 'sign-off read: the id ends with her own id, nothing after it');
await ok(signGet(sgAnn, 'm1/signs/ann'), false, 'sign-off read: an id with no version is refused');
await ok(signGet(sgOld, 'm1/signs/1_ann'), false, 'sign-off read: not with a session that ran out');
await ok(signGet(anon, 'm1/signs/1_ann'), false, 'sign-off read: not with only the kitchen PIN');
await ok(signList(sgAnn), false, 'sign-off read: staff cannot list the sign-offs');
await ok(getDocs(query(collection(sgAnn, K + 'minutes/m1/signs'), where('by', '==', 'ann'))), false, 'sign-off read: not even their own by a query');
await ok(signList(sgSam), true, 'sign-off register: a sous chef on their PIN session lists the sign-offs');
await ok(signList(sgHd), true, 'sign-off register: so does the head chef by PIN (headId, not in sousIds)');
await ok(signList(owner), true, 'sign-off register: so does the Google account');
await ok(signGet(sgSam, 'm1/signs/1_ann'), true, 'sign-off register: a sous chef reads one person\'s sign-off');
await ok(getDocs(collection(env.authenticatedContext('other', { email: 'someone@test.local', email_verified: true }).firestore(), K + 'minutes/m1/signs')), false, 'sign-off register: not another Google account');
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { sousIds: [] }, { merge: true }); });
await ok(signList(sgSam), false, 'sign-off register: not a sous chef taken off sousIds');
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { sousIds: ['sam'] }, { merge: true }); });
// reading opened nothing for writes: a sign-off is still made once, by the person, never changed or deleted
await ok(W([['minutes/m1/signs/1_ann', { v: 1, st: 'present', at: 7 }]], { id: 'ann' }), false, 'sign-off write: still cannot be changed');
await ok(W([['minutes/m3/signs/1_ann', { v: 1, st: 'present', at: 7 }]], { id: 'sam' }), false, 'sign-off write: a sous chef cannot sign for Ann');
await ok(deleteDoc(doc(sgSam, K + 'minutes/m1/signs/1_ann')), false, 'sign-off write: a sous chef cannot delete one');
await ok(W([['minutes/m3/signs/1_ann', { v: 1, st: 'present', at: 7, name: 'Ann' }]], { id: 'ann' }), true, 'sign-off write: Ann still signs as herself');
// the chef to-do list (23 Oct 2026): only the head chef (Google account, or their PIN as headId) and the sous chefs
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { headId: 'hd', sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo', 'cal', 'hd'] }, { merge: true }); });
const todo = x => Object.assign({ text: 'Book the hood clean', st: 'open', due: '', for: '', from: 'sam', at: 5, doneAt: 0, doneBy: '', upd: 5 }, x || {});
const todoQ = db => getDocs(query(collection(db, K + 'todos'), where('st', '==', 'open')));
await ok(W([['todos/t1', todo()]], { id: 'sam' }), true, 'todos: a sous chef adds a job');
await ok(W([['todos/t2', todo({ from: 'hd', due: '2026-10-30', for: 'sam' })]], { id: 'hd' }), true, 'todos: the head chef by PIN (headId, not in sousIds) adds one');
await ok(W([['todos/t3', todo({ from: 'ann' })]], { id: 'ann' }), false, 'todos: staff cannot add one');
await ok(W([['todos/t4', todo({ from: 'hd' })]], { id: 'sam' }), false, 'todos: a sous chef cannot add one as someone else');
await ok(W([['todos/t5', todo({ text: '' })]], { id: 'sam' }), false, 'todos: an empty job is refused');
await ok(W([['todos/t6', todo({ text: 'x'.repeat(301) })]], { id: 'sam' }), false, 'todos: more than 300 characters is refused');
await ok(W([['todos/t7', todo({ st: 'later' })]], { id: 'sam' }), false, 'todos: an unknown state is refused');
await ok(W([['todos/t8', todo({ due: 'Friday' })]], { id: 'sam' }), false, 'todos: the due day is a date');
await ok(W([['todos/t9', todo({ extra: 'x' })]], { id: 'sam' }), false, 'todos: no fields beyond the job');
await ok(W([['todos/t10', todo({ st: 'done', doneAt: 6, doneBy: 'hd' })]], { id: 'sam' }), false, 'todos: a new job cannot arrive ticked by someone else');
await ok(W([['todos/t1', todo({ from: 'sam', text: 'x' })]], { id: 'sam', pin: '9999' }), false, 'todos: a wrong PIN cannot change one');
await ok(todoQ(wPhone('w-sam')), true, 'todos: a sous chef with a PIN session lists the open jobs');
await ok(todoQ(wPhone('w-hd')), true, 'todos: so does the head chef by PIN');
await ok(todoQ(owner), true, 'todos: so does the Google account');
await ok(W([['activity/ann', { lastSeen: 1 }, true]], { id: 'ann' }), true, 'todos: (Ann opens a session)');
await ok(todoQ(wPhone('w-ann')), false, 'todos: staff with a session cannot list them');
await ok(getDoc(doc(wPhone('w-ann'), K + 'todos/t1')), false, 'todos: nor read one');
await ok(todoQ(anon), false, 'todos: nor the kitchen PIN alone');
await ok(getDocs(collection(env.authenticatedContext('other', { email: 'someone@test.local', email_verified: true }).firestore(), K + 'todos')), false, 'todos: nor another Google account');
await ok(W([['todos/t1', { st: 'done', doneAt: 7, doneBy: 'sam', upd: 7 }, true]], { id: 'sam' }), true, 'todos: a sous chef ticks a job, named as the one who did it');
await ok(W([['todos/t2', { st: 'done', doneAt: 7, doneBy: 'hd', upd: 7 }, true]], { id: 'sam' }), false, 'todos: a sous chef cannot tick one in someone else\'s name');
await ok(W([['todos/t2', { st: 'done', doneAt: 7, doneBy: 'hd', upd: 7 }, true]], { id: 'hd' }), true, 'todos: the head chef by PIN ticks one');
// who ticked is only ever the writer or left as it was (review, 23 Oct 2026): no two-step way round it
await ok(W([['todos/t2', { doneBy: 'cal', upd: 7 }, true]], { id: 'sam' }), false, 'todos: a sous chef cannot name someone else as who ticked a done job');
await ok(W([['todos/t2', { doneBy: '', upd: 7 }, true]], { id: 'sam' }), false, 'todos: nor blank it');
await ok(W([['todos/t2', { doneAt: 99, upd: 7 }, true]], { id: 'sam' }), false, 'todos: nor change when it was ticked');
await ok(W([['todos/t2', { st: 'done', doneAt: 98, doneBy: 'sam', upd: 7 }, true]], { id: 'sam' }), true, 'todos: ticking it again as himself (two phones at once) names him');
await ok(W([['todos/t2', { st: 'done', doneAt: 7, doneBy: 'hd', upd: 7 }, true]], { id: 'hd' }), true, 'todos: (the head chef ticks it again)');
await ok(W([['todos/t13', todo({ doneBy: 'hd' })]], { id: 'sam' }), false, 'todos: a new open job cannot carry someone\'s tick');
await ok(W([['todos/t13', todo({ st: 'done', doneAt: 6, doneBy: '' })]], { id: 'sam' }), false, 'todos: nor arrive done with no one named');
await ok(W([['todos/t14', todo()]], { id: 'sam' }), true, 'todos: (Sam adds another job)');
await ok(W([['todos/t14', { doneBy: 'hd', upd: 7 }, true]], { id: 'sam' }), false, 'todos: an open job cannot be given someone\'s tick');
await ok(W([['todos/t14', { st: 'done', doneAt: 7, doneBy: '', upd: 7 }, true]], { id: 'sam' }), false, 'todos: nor be ticked with no one named');
await ok(W([['todos/t2', { st: 'open', upd: 8 }, true]], { id: 'sam' }), false, 'todos: a done job cannot be reopened still naming who ticked it');
await ok(W([['todos/t15', todo()]], { id: 'sam' }), true, 'todos: (Sam adds a job)');
await ok(W([['todos/t15', { st: 'done', doneAt: 20, doneBy: 'hd', upd: 20 }, true]], { id: 'hd' }), true, 'todos: (the head chef ticks it on her phone)');
await ok(W([['todos/t15', { st: 'gone', upd: 21 }, true]], { id: 'sam' }), true, 'todos: Sam, still seeing it open, removes it');
await ok(W([['todos/t15', { st: 'open', doneAt: 0, doneBy: '', upd: 22 }, true]], { id: 'sam' }), true, 'todos: and his Undo puts it back open, naming no one');
await ok(W([['todos/t2', { text: 'Changed while done', upd: 8 }, true]], { id: 'sam' }), true, 'todos: the words of a done job can be changed (a change saved from an older copy), keeping its tick');
// phone pushes for order cut-offs (24 Oct 2026): push addresses written by chefs, read by nobody but the server
const pushX = x => Object.assign({ tok: 'fcm-token-1', at: 5, ua: 'Android' }, x || {});
await ok(W([['push/p-sam', pushX()]], { id: 'sam' }), true, 'push: a sous chef turns pushes on for their phone');
await ok(W([['push/p-hd', pushX({ tok: 'fcm-token-2' })]], { id: 'hd' }), true, 'push: so does the head chef by PIN');
await ok(W([['push/p-ann', pushX()]], { id: 'ann' }), false, 'push: staff cannot');
await ok(W([['push/p-x', pushX()]], { id: 'sam', as: 'hd' }), false, 'push: a sous chef cannot write one as the head chef');
await ok(W([['push/p-x', pushX()]], { id: 'sam', pin: '9999' }), false, 'push: not with a wrong PIN');
await ok(W([['push/p-x', pushX({ tok: '' })]], { id: 'sam' }), false, 'push: an empty address is refused');
await ok(W([['push/p-x', pushX({ tok: 'x'.repeat(501) })]], { id: 'sam' }), false, 'push: an address over 500 characters is refused');
await ok(W([['push/p-x', pushX({ name: 'Sam' })]], { id: 'sam' }), false, 'push: no other fields');
await ok(setDoc(doc(owner, K + 'push/p-own'), pushX({ by: 'owner' })), true, 'push: the Google account writes one as owner');
await ok(setDoc(doc(owner, K + 'push/p-own2'), pushX({ by: 'sam' })), false, 'push: but not in a chef\'s name');
await ok(setDoc(doc(anon, K + 'push/p-x'), pushX({ by: 'owner' })), false, 'push: the kitchen PIN alone cannot write as owner');
await ok(getDoc(doc(wPhone('w-sam'), K + 'push/p-sam')), false, 'push: a chef cannot read even their own address back');
await ok(getDocs(collection(owner, K + 'push')), false, 'push: nor can the Google account list them');
await ok(deleteDoc(doc(wPhone('w-sam'), K + 'push/p-hd')), false, 'push: a sous chef cannot remove the head chef\'s phone');
await ok(deleteDoc(doc(wPhone('w-ann'), K + 'push/p-sam')), false, 'push: staff cannot remove one');
await ok(deleteDoc(doc(wPhone('w-sam'), K + 'push/p-sam')), true, 'push: a sous chef turns their own off');
await ok(deleteDoc(doc(owner, K + 'push/p-hd')), true, 'push: the Google account removes any');
const tick = (sid, x) => Object.assign({ day: '2026-10-24', sid, on: true, at: 5 }, x || {});
await ok(W([['cutdone/2026-10-24_pfd', tick('pfd')]], { id: 'sam' }), true, 'cutdone: a sous chef ticks off a supplier order');
await ok(W([['cutdone/2026-10-24_veg', tick('veg')]], { id: 'hd' }), true, 'cutdone: so does the head chef by PIN');
await ok(setDoc(doc(owner, K + 'cutdone/2026-10-24_chk'), tick('chk', { by: 'owner' })), true, 'cutdone: and the Google account');
await ok(W([['cutdone/2026-10-24_veg', tick('veg', { on: false, at: 6 })]], { id: 'sam' }), true, 'cutdone: a tick can be taken off again');
await ok(W([['cutdone/2026-10-24_pfd', tick('pfd')]], { id: 'ann' }), false, 'cutdone: staff cannot');
await ok(W([['cutdone/2026-10-24_pfd', tick('pfd')]], { id: 'sam', as: 'hd' }), false, 'cutdone: a chef cannot tick in another chef\'s name');
await ok(W([['cutdone/2026-10-24_pfd', tick('pfd')]], { id: 'sam', pin: '9999' }), false, 'cutdone: not with a wrong PIN');
await ok(W([['cutdone/2026-10-24_veg', tick('pfd')]], { id: 'sam' }), false, 'cutdone: the record id is the day and the supplier');
await ok(W([['cutdone/friday_pfd', tick('pfd', { day: 'friday' })]], { id: 'sam' }), false, 'cutdone: the day is a date');
await ok(W([['cutdone/2026-10-24_PFD!', tick('PFD!')]], { id: 'sam' }), false, 'cutdone: the supplier id is a plain id');
await ok(W([['cutdone/2026-10-24_pfd', tick('pfd', { on: 'yes' })]], { id: 'sam' }), false, 'cutdone: on is true or false');
await ok(W([['cutdone/2026-10-24_pfd', tick('pfd', { at: 'now' })]], { id: 'sam' }), false, 'cutdone: at is a time');
await ok(W([['cutdone/2026-10-24_pfd', tick('pfd', { note: 'x' })]], { id: 'sam' }), false, 'cutdone: no other fields');
await ok(deleteDoc(doc(owner, K + 'cutdone/2026-10-24_pfd')), false, 'cutdone: never deleted');
const tickQ = db => getDocs(query(collection(db, K + 'cutdone'), where('day', 'in', ['2026-10-24', '2026-10-25'])));
await ok(tickQ(wPhone('w-sam')), true, 'cutdone: a sous chef with a PIN session reads the ticks');
await ok(tickQ(wPhone('w-hd')), true, 'cutdone: so does the head chef by PIN');
await ok(tickQ(owner), true, 'cutdone: and the Google account');
await ok(tickQ(wPhone('w-ann')), false, 'cutdone: staff with a session cannot read them');
await ok(tickQ(anon), false, 'cutdone: nor the kitchen PIN alone');
await ok(deleteDoc(doc(wPhone('w-sam'), K + 'push/p-gone')), true, 'push: Turn pushes off still works once the server has removed the address');
await ok(getDoc(doc(owner, K + 'pushsent/2026-10-24')), false, 'pushsent: only the server reads what it sent');
await ok(setDoc(doc(owner, K + 'pushsent/2026-10-24'), { sent: {} }), false, 'pushsent: and only the server writes it');
await ok(W([['todos/t2', { st: 'open', doneAt: 0, doneBy: '', upd: 8 }, true]], { id: 'sam' }), true, 'todos: a sous chef unticks the head chef\'s tick');
await ok(W([['todos/t1', { text: 'Book the hood clean for Monday', upd: 8 }, true]], { id: 'hd' }), true, 'todos: any chef changes the words');
await ok(W([['todos/t1', { from: 'hd', upd: 8 }, true]], { id: 'hd' }), false, 'todos: who wrote it never changes');
await ok(W([['todos/t1', { at: 1, upd: 8 }, true]], { id: 'sam' }), false, 'todos: nor when');
await ok(W([['todos/t1', { st: 'gone', upd: 9 }, true]], { id: 'hd' }), true, 'todos: the head chef removes a job Sam ticked (kept as gone, with who ticked it and when)');
await ok(W([['todos/t1', { doneAt: 99, upd: 9 }, true]], { id: 'hd' }), false, 'todos: a removed job keeps its tick time');
await ok(W([['todos/t1', { st: 'done', doneAt: 99, upd: 10 }, true]], { id: 'hd' }), false, 'todos: Undo cannot bring it back done at another time');
await ok(W([['todos/t1', { st: 'done', doneAt: 7, upd: 10 }, true]], { id: 'hd' }), true, 'todos: Undo puts it back as done, still named as Sam\'s tick');
await ok(W([['todos/t1', { st: 'open', doneAt: 0, doneBy: '', upd: 11 }, true]], { id: 'ann' }), false, 'todos: staff cannot untick');
await ok(deleteDoc(doc(owner, K + 'todos/t1')), false, 'todos: never deleted, not even by the head chef');
await ok(setDoc(doc(owner, K + 'todos/t11'), { text: 'From the Google device', st: 'open', due: '', for: '', from: '', at: 12, doneAt: 0, doneBy: '', upd: 12 }), true, 'todos: the Google account adds one with no PIN writer');
await ok(W([['todos/t11', { st: 'done', doneAt: 13, doneBy: 'sam', upd: 13 }, true]], { id: 'sam' }), true, 'todos: a sous chef ticks a job the Google account wrote');
await ok(setDoc(doc(owner, K + 'todos/t12'), { text: 'Bare copy' }), false, 'todos: even the Google account keeps to the fields (a job always has its state)');
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { sousIds: [] }, { merge: true }); });
await ok(todoQ(wPhone('w-sam')), false, 'todos: a sous chef taken off sousIds reads nothing more');
await ok(W([['todos/t11', { st: 'open', doneAt: 0, doneBy: '', upd: 14 }, true]], { id: 'sam' }), false, 'todos: nor writes');
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { sousIds: ['sam', 'hd'] }, { merge: true }); });
// the owner probe
await ok(getDoc(doc(owner, K + 'config/admins')), true, 'admins: the head chef may read the probe');
await ok(getDoc(doc(anon, K + 'config/admins')), false, 'admins: nobody else may');
await ok(getDoc(doc(env.authenticatedContext('other', { email: 'someone@test.local', email_verified: true }).firestore(), K + 'config/admins')), false, 'admins: another Google account may not');

await env.cleanup();
console.log((fails ? fails + ' failed' : 'All passed') + ' of ' + n + ' rules checks.');
process.exit(fails ? 1 : 0);
