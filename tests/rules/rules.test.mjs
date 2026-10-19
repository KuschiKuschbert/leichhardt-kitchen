/*
  Checks firestore.rules on the Firestore emulator, with made-up values in place of KITCHEN_PIN and OWNER_EMAIL.
  Run from tests/rules/:  npm install  then  npm test   (firebase-tools starts the emulator; Java is needed).
  Nothing here touches the real book. Every check is a write the rules must allow or refuse.
*/
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, writeBatch, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const PIN = '000000', OWNER = 'headchef@test.local';
const rules = readFileSync(process.env.RULES || path.join(here, '..', '..', 'firestore.rules'), 'utf8').replace(/KITCHEN_PIN/g, PIN).replace(/OWNER_EMAIL/g, OWNER);
const sha = s => createHash('sha256').update(s).digest('hex');
const pins = { sam: '1111', ann: '2222', bo: '3333' };
const hash = (id, pin) => sha('lk:' + id + ':' + pin);
const K = 'kitchens/' + PIN + '/';
const PEOPLE = [{ id: 'sam', name: 'Sam', role: 'sous', active: true }, { id: 'ann', name: 'Ann', role: 'staff', active: true }, { id: 'bo', name: 'Bo', role: 'staff', ping: true, active: true }, { id: 'cal', name: 'Cal', role: 'staff', active: true }];

const env = await initializeTestEnvironment({ projectId: 'demo-test', firestore: { rules } });
await env.clearFirestore();
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, K + 'config/main'), {
    people: PEOPLE,
    sousIds: ['sam'], pingIds: ['sam', 'bo'], staffIds: ['sam', 'ann', 'bo', 'cal'], showBadges: true
  });
  for (const id of Object.keys(pins)) await setDoc(doc(db, K + 'staffpins/' + id), { hash: hash(id, pins[id]) });
  await setDoc(doc(db, K + 'notes/n-sam'), { text: 'Sam ping', tag: 'none', start: '2026-10-19', until: '2026-10-19', dows: [], removed: false, by: 'sam' });
  await setDoc(doc(db, K + 'notes/n-bo'), { text: 'Bo ping', tag: 'none', start: '2026-10-19', until: '2026-10-19', dows: [], removed: false, by: 'bo' });
  await setDoc(doc(db, K + 'sections/larder'), { name: 'Larder', uses: 3, hidden: false, by: 'ann', old: 'a field the book no longer writes' });
  await setDoc(doc(db, K + 'activity/ann'), { name: 'Ann', visits: 2, legacy: 1 });
  await setDoc(doc(db, K + 'learned/slice-onions'), { text: 'Slice onions', uses: 3, hidden: false });
});

const anon = env.unauthenticatedContext().firestore();
const owner = env.authenticatedContext('owner', { email: OWNER, email_verified: true }).firestore();

/* A staff write the way the book does it: the proof and the document in one batch, with "by" on the document.
   pin: the PIN typed; as: the id written as "by" (normally the same person); at: the proof's time (normally the server's). */
function W(ops, o) {
  const b = writeBatch(anon), id = o.id, at = o.at || serverTimestamp();
  b.set(doc(anon, K + 'proofs/' + id), { tok: hash(id, o.pin || pins[id]), at });
  for (const [p, data, merge] of ops) b.set(doc(anon, K + p), Object.assign({ by: o.as || id }, data), merge ? { merge: true } : {});
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
await ok(W([['days/2026-10-19/items/a1', line()]], { id: 'ann' }), true, 'right PIN: a prep line is saved');
await ok(W([['days/2026-10-19/items/a2', line()]], { id: 'ann', pin: '9999' }), false, 'wrong PIN: refused');
await ok(W([['days/2026-10-19/items/a3', line()]], { id: 'ann', as: 'sam' }), false, 'spoofed by: Ann\'s proof with by Sam is refused');
await ok(W([['days/2026-10-19/items/a4', line()]], { id: 'ann', at: Timestamp.fromMillis(Date.now() - 60000) }), false, 'replayed proof: an old proof time is refused');
await ok(setDoc(doc(anon, K + 'days/2026-10-19/items/a5'), line({ by: 'ann' })), false, 'no proof: refused');

// who may set a PIN: only people on the list (staffIds), once
const setPin = id => { const b = writeBatch(anon); b.set(doc(anon, K + 'staffpins/' + id), { hash: hash(id, '4444') }); b.set(doc(anon, K + 'pinset/' + id), { at: 1 }); return b.commit(); };
await ok(setPin('cal'), true, 'PIN set: a listed person without a PIN sets one');
await ok(setPin('zed'), false, 'PIN set: an id that is not on the list is refused (no minting a writer)');
await ok(setPin('ann'), false, 'PIN set: an existing PIN cannot be overwritten');
await ok(W([['days/2026-10-19/items/a6', line()]], { id: 'zed', pin: '4444' }), false, 'minted id: cannot write');
await ok(setDoc(doc(owner, K + 'staffpins/old-hand'), { hash: hash('old-hand', '5555'), setAt: 1, name: 'Old Hand' }), true, 'PIN set: the head chef copies a stored PIN as it is (move to a new kitchen PIN), even for an id no longer on the list');

// config: a sous chef may change the people list and staffIds, never sousIds or pingIds
await ok(W([['config/main', { people: [{ id: 'sam', name: 'Sam', role: 'sous', active: true }, { id: 'ann', name: 'Ann', role: 'staff', active: true }, { id: 'dee', name: 'Dee', role: 'staff', active: true }], staffIds: ['sam', 'ann', 'dee'], updated: 1, updatedBy: 'Sam' }, true]], { id: 'sam' }), true, 'config: a sous chef adds a person and their id to staffIds');
await ok(W([['config/main', { sousIds: ['sam', 'ann'], updated: 1, updatedBy: 'Sam' }, true]], { id: 'sam' }), false, 'config: a sous chef cannot change sousIds');
await ok(W([['config/main', { pingIds: ['sam', 'ann'], updated: 1, updatedBy: 'Sam' }, true]], { id: 'sam' }), false, 'config: a sous chef cannot change pingIds');
await ok(W([['config/main', { people: [{ id: 'ann', name: 'Ann', role: 'staff', active: true }], updated: 1, updatedBy: 'Ann' }, true]], { id: 'ann' }), false, 'config: staff cannot change the people list');
await ok(setDoc(doc(owner, K + 'config/main'), { people: PEOPLE, sousIds: ['sam'], pingIds: ['sam', 'bo'], staffIds: ['sam', 'ann', 'bo', 'cal'], showBadges: false }), true, 'config: the head chef writes everything');

// activity: a person's own tally, or the head chef or a sous chef for anyone
await ok(W([['activity/ann', { name: 'Ann', visits: increment(1) }, true]], { id: 'ann' }), true, 'activity: own tally (an older field on the record does not get in the way)');
await ok(W([['activity/bo', { name: 'Bo', visits: increment(5) }, true]], { id: 'ann' }), false, 'activity: staff cannot write someone else\'s tally');
await ok(W([['activity/bo', { name: 'Bo', ticked: increment(-1) }, true]], { id: 'sam' }), true, 'activity: a sous chef untick adjusts the ticker\'s tally');
await ok(W([['activity/ann', { name: 'Ann', extra: 'x' }, true]], { id: 'ann' }), false, 'activity: only the known fields');

// shift pings: write your own, change your own; the head chef and sous chefs change anyone's
await ok(W([['notes/n-bo2', note()]], { id: 'bo' }), true, 'pings: a person ticked for Pings writes one');
await ok(W([['notes/n-ann', note()]], { id: 'ann' }), false, 'pings: someone not ticked cannot');
await ok(W([['notes/n-bo', { removed: true, upd: 2 }, true]], { id: 'bo' }), true, 'pings: Bo removes Bo\'s ping');
await ok(W([['notes/n-sam', { removed: true, upd: 2 }, true]], { id: 'bo' }), false, 'pings: Bo cannot remove Sam\'s ping');
await ok(W([['notes/n-bo2', { text: 'Changed', upd: 2 }, true]], { id: 'sam' }), true, 'pings: a sous chef edits anyone\'s ping');
await ok(setDoc(doc(owner, K + 'notes/n-bo2'), note({ text: 'Head chef edit' })), true, 'pings: the head chef edits anyone\'s ping');

// sizes and shapes
await ok(W([['days/2026-10-19/items/b1', line({ station: 'x'.repeat(41) })]], { id: 'ann' }), false, 'prep line: section over 40 characters refused');
await ok(W([['days/2026-10-19/items/b2', line({ qty: 'x'.repeat(41) })]], { id: 'ann' }), false, 'prep line: amount over 40 characters refused');
await ok(W([['orders/2026-10-19/lines/o1', { text: 'Milk', qty: '6 L', recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: 1, ordered: false, deleted: false }]], { id: 'ann' }), true, 'order line: saved');
await ok(W([['orders/2026-10-19/lines/o2', { text: 'Milk', qty: 'x'.repeat(41), recipes: [], addedBy: 'Ann', addedById: 'ann', addedAt: 1, ordered: false, deleted: false }]], { id: 'ann' }), false, 'order line: amount over 40 characters refused');
await ok(W([['sections/fryer', { name: 'Fryer', uses: increment(1), lastUsed: 1, lastBy: 'Ann' }, true]], { id: 'ann' }), true, 'sections: a new section is counted');
await ok(W([['sections/fryer', { name: 'Fryer', bogus: 1 }, true]], { id: 'ann' }), false, 'sections: only the known fields');
await ok(W([['sections/larder', { uses: increment(1), lastUsed: 2, lastBy: 'Ann' }, true]], { id: 'ann' }), true, 'sections: a use is counted on a record with an older field');
await ok(W([['sections/larder', { hidden: true }, true]], { id: 'ann' }), false, 'sections: staff cannot hide one');
await ok(W([['sections/larder', { hidden: true }, true]], { id: 'sam' }), true, 'sections: a sous chef can');
await ok(W([['learned/slice-onions', { hidden: true }, true]], { id: 'ann' }), false, 'learned: staff cannot hide an item');
await ok(setDoc(doc(owner, K + 'learned/slice-onions'), { hidden: true }, { merge: true }), true, 'learned: the head chef can');
await ok(W([['misses/laksa', { q: 'laksa', n: increment(1), last: 1, lastBy: 'Ann' }, true]], { id: 'ann' }), true, 'misses: an empty search is counted');
await ok(W([['misses/laksa', { q: 'laksa', junk: 'x' }, true]], { id: 'ann' }), false, 'misses: only the known fields');
await ok(W([['views/barra', { name: 'Barramundi', n: increment(2), last: 1 }, true]], { id: 'ann' }), true, 'views: a card open is counted');
await ok(W([['views/barra', { name: 'Barramundi', n: 1, junk: 'x' }, true]], { id: 'ann' }), false, 'views: only the known fields');
await ok(setDoc(doc(owner, K + 'guides/g1'), guide({ thumb: 'data:image/webp;base64,AAAA' })), true, 'guides: a picture thumbnail is accepted');
await ok(setDoc(doc(owner, K + 'guides/g2'), guide({ thumb: 'https://example.com/x.png' })), false, 'guides: a thumbnail that is not a picture is refused');
await ok(setDoc(doc(owner, K + 'guides/g1/pages/0'), { img: 'data:image/jpeg;base64,AAAA', v: 1, n: 0 }), true, 'guides: a page picture is accepted');
await ok(setDoc(doc(owner, K + 'guides/g1/pages/1'), { img: 'javascript:alert(1)', v: 1, n: 1 }), false, 'guides: a page that is not a picture is refused');

await env.cleanup();
console.log((fails ? fails + ' failed' : 'All passed') + ' of ' + n + ' rules checks.');
process.exit(fails ? 1 : 0);
