/*
  Checks firestore.rules on the Firestore emulator, with made-up values in place of KITCHEN_PIN and OWNER_EMAIL.
  Run from tests/rules/:  npm install  then  npm test   (firebase-tools starts the emulator; Java is needed).
  Nothing here touches the real book. Every check is a write the rules must allow or refuse.
*/
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, writeBatch, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import { createHash } from 'crypto';
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
  for (const id of Object.keys(pins)) await setDoc(doc(db, K + 'staffpins/' + id), { hash: hash(id, pins[id]) });
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
await ok(W([['notes/n-bo2', note({ author: 'bo' })]], { id: 'bo' }), true, 'pings: a person ticked for Pings writes one');
await ok(W([['notes/n-ann', note()]], { id: 'ann' }), false, 'pings: someone not ticked cannot');
await ok(W([['notes/n-bo', { removed: true, upd: 2 }, true]], { id: 'bo' }), true, 'pings: Bo removes Bo\'s ping');
await ok(W([['notes/n-sam', { removed: true, upd: 2 }, true]], { id: 'bo' }), false, 'pings: Bo cannot remove Sam\'s ping');
await ok(W([['notes/n-bo2', { text: 'Changed', upd: 2 }, true]], { id: 'sam' }), true, 'pings: a sous chef edits anyone\'s ping');
await ok(W([['notes/n-bo2', { text: 'Changed back', upd: 3 }, true]], { id: 'bo' }), true, 'pings: the writer can still change it after a sous chef\'s edit (author is kept)');
await ok(W([['notes/n-bo2', { text: 'Nope', upd: 4 }, true]], { id: 'ann' }), false, 'pings: someone else still cannot');
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
await ok(W([['ordlearned/cream', { text: 'Cream', uses: 1, hidden: false }]], { id: 'ann' }), true, 'ordlearned: a PIN holder adds an item');
await ok(W([['ordlearned/blank', { text: '', uses: 1, hidden: false }]], { id: 'ann' }), false, 'ordlearned: an empty text is refused');
await ok(W([['ordlearned/milk', { hidden: 'yes' }, true]], { id: 'sam' }), false, 'ordlearned: hidden must be true or false');
await ok(W([['ordlearned/milk', { hidden: true }, true]], { id: 'sam' }), true, 'ordlearned: a sous chef hides an item');
await ok(deleteDoc(doc(anon, K + 'ordlearned/milk')), false, 'ordlearned: not deleted from a phone');
await ok(W([['learnlog/2026-10-19', { at: 5, who: 'ann', kind: 'phone' }]], { id: 'ann' }), true, 'learnlog: a day is claimed once');
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
await ok(getDoc(doc(anon, K + 'mailstat/k1')), true, 'mailstat: the sender reads its status by id');
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
// the drinks run: each person writes only their own usual drink; everyone with the kitchen PIN reads them
const drink = x => Object.assign({ kind: 'flat', size: 'reg', milk: 'oat', shot: '', sugar: '1', note: 'Extra hot', other: 'Coke No Sugar', at: 5 }, x || {});
await ok(W([['drinks/ann', drink()]], { id: 'ann' }), true, 'drinks: Ann saves her usual');
await ok(W([['drinks/ann', drink({ kind: 'long', milk: '' })]], { id: 'ann' }), true, 'drinks: Ann changes her usual');
await ok(W([['drinks/bo', drink()]], { id: 'ann' }), false, 'drinks: Ann cannot set Bo\'s usual');
await ok(W([['drinks/ann', drink()]], { id: 'ann', pin: '9999' }), false, 'drinks: wrong PIN refused');
await ok(setDoc(doc(anon, K + 'drinks/ann'), drink({ by: 'ann' })), false, 'drinks: no proof refused');
await ok(W([['drinks/ann', drink({ note: 'x'.repeat(41) })]], { id: 'ann' }), false, 'drinks: a note over 40 characters is refused');
await ok(W([['drinks/ann', drink({ other: 'x'.repeat(61) })]], { id: 'ann' }), false, 'drinks: something else over 60 characters is refused');
await ok(W([['drinks/ann', drink({ kind: 7 })]], { id: 'ann' }), false, 'drinks: the drink must be words');
await ok(W([['drinks/ann', drink({ cold: 'cokens' })]], { id: 'ann' }), true, 'drinks: Ann adds a soft drink');
await ok(W([['drinks/ann', drink({ cold: 'x'.repeat(13) })]], { id: 'ann' }), false, 'drinks: a soft drink id over 12 characters is refused');
await ok(W([['drinks/ann', drink({ price: 5 })]], { id: 'ann' }), false, 'drinks: no fields beyond the drink');
await ok(W([['drinks/ann', drink({ at: 'now' })]], { id: 'ann' }), false, 'drinks: the time must be a number');
await ok(getDocs(collection(anon, K + 'drinks')), true, 'drinks: a PIN holder reads the team\'s drinks');
await ok(deleteDoc(doc(anon, K + 'drinks/ann')), false, 'drinks: staff cannot delete one');
await ok(setDoc(doc(owner, K + 'drinks/old-hand'), drink({ by: 'old-hand' })), true, 'drinks: the head chef copies one as it is (move to a new kitchen PIN)');

// kitchen sections: each person writes only their own section for the day, shifts/<day>_<id>
const sh = x => Object.assign({ day: '2026-10-21', sec: 'grill', name: 'Grill', auto: false, at: 1 }, x || {});
await ok(W([['shifts/2026-10-21_ann', sh()]], { id: 'ann' }), true, 'shifts: Ann picks Grill for the day');
await ok(W([['shifts/2026-10-21_ann', sh({ sec: 'pass', name: 'Pass', at: 2 })]], { id: 'ann' }), true, 'shifts: Ann changes to Pass');
await ok(W([['shifts/2026-10-21_bo', sh()]], { id: 'ann' }), false, 'shifts: Ann cannot pick for Bo');
await ok(W([['shifts/2026-10-20_ann', sh()]], { id: 'ann' }), false, 'shifts: the record id must be the day and the writer');
await ok(W([['shifts/2026-10-21_ann', sh()]], { id: 'ann', pin: '9999' }), false, 'shifts: wrong PIN refused');
await ok(setDoc(doc(anon, K + 'shifts/2026-10-21_ann'), sh({ by: 'ann' })), false, 'shifts: no proof refused');
await ok(W([['shifts/2026-10-21_ann', sh({ name: 'x'.repeat(41) })]], { id: 'ann' }), false, 'shifts: a section name over 40 characters is refused');
await ok(W([['shifts/2026-10-21_ann', sh({ score: 5 })]], { id: 'ann' }), false, 'shifts: no fields beyond the section');
await ok(W([['shifts/2026-10-21_ann', sh({ at: 'now' })]], { id: 'ann' }), false, 'shifts: the time must be a number');
await ok(W([['shifts/2026-10-21_sam', sh({ sec: 'sous', name: 'Sous chef', auto: true })]], { id: 'sam' }), true, 'shifts: a sous chef is given their role');
await ok(getDocs(collection(anon, K + 'shifts')), true, 'shifts: a PIN holder reads who is on which section');
await ok(deleteDoc(doc(anon, K + 'shifts/2026-10-21_ann')), false, 'shifts: staff cannot delete one');
await ok(setDoc(doc(owner, K + 'shifts/2026-10-01_old-hand'), sh({ day: '2026-10-01', by: 'old-hand' })), true, 'shifts: the head chef copies one as it is (move to a new kitchen PIN)');
await ok(W([['config/main', { kitSecs: [{ id: 'grill', name: 'Grill', off: false }] }, true]], { id: 'sam' }), false, 'config: a sous chef cannot change the kitchen sections');
await ok(setDoc(doc(owner, K + 'config/main'), { kitSecs: [{ id: 'grill', name: 'Grill', off: false }] }, { merge: true }), true, 'config: the head chef sets the kitchen sections');
// the head chef's book: recipes changed or added in the book (#/manage)
const rec = (x, r) => Object.assign({ r: Object.assign({ id: 'burger', kind: 'main', no: '02', forLine: 'Plate', name: 'Chicken Burger', yield: 'Per plate', ingredients: [{ q: '1', name: 'Burger bun', tags: ['Gluten'] }], pins: [], sections: [{ title: 'Cooking', steps: ['Toast the bun.'] }] }, r || {}), v: 1, upd: Date.now(), src: 'book', base: 'abcd1234', removed: false }, x || {});
const pie = x => rec(Object.assign({ src: 'new', base: '' }, x || {}), { id: 'pie', name: 'Pie' });
// earlier checks replace config/main: the head chef's own name is set again here
await env.withSecurityRulesDisabled(async ctx => { await setDoc(doc(ctx.firestore(), K + 'config/main'), { headId: 'hd', sousIds: ['sam', 'hd'] }, { merge: true }); });
function ownerBatch(ops) { const b = writeBatch(owner); for (const [p, data, merge] of ops) b.set(doc(owner, K + p), data, merge ? { merge: true } : {}); return b.commit(); }
await ok(getDoc(doc(anon, K + 'book/index')), true, 'book: a PIN holder reads the index');
await ok(W([['recipes/burger', rec()], ['book/index', { r: { burger: 1 } }, true]], { id: 'hd' }), true, 'book: the head chef by PIN saves a changed recipe with the index');
await ok(getDoc(doc(anon, K + 'recipes/burger')), true, 'book: a PIN holder reads a changed recipe');
await ok(W([['recipes/burger', rec({ v: 2 })], ['book/index', { r: { burger: 2 } }, true], ['recipes/burger/hist/1', { was: rec(), at: 1 }]], { id: 'hd' }), true, 'book: the next version, its earlier version kept, the index in step (the largest batch)');
await ok(W([['recipes/burger', rec({ v: 2 })], ['book/index', { r: { burger: 2 } }, true]], { id: 'hd' }), false, 'book: a save made from an old copy (the same version again) is refused');
await ok(W([['recipes/burger', rec({ v: 3 })]], { id: 'hd' }), false, 'book: a save without the index in the same batch is refused');
await ok(W([['recipes/burger', rec({ v: 3 })], ['book/index', { r: { burger: 4 } }, true]], { id: 'hd' }), false, 'book: the index and the recipe must say the same version');
await ok(W([['recipes/pie', pie()], ['book/index', { r: { pie: 1 } }, true]], { id: 'sam' }), false, 'book: a sous chef cannot change recipes');
await ok(W([['recipes/pie', pie()], ['book/index', { r: { pie: 1 } }, true]], { id: 'ann' }), false, 'book: staff cannot change recipes');
await ok(W([['book/index', { r: { pie: 1 } }, true]], { id: 'ann' }), false, 'book: staff cannot change the index');
await ok(W([['recipes/pie', pie()], ['book/index', { r: { pie: 1 } }, true]], { id: 'ann', as: 'hd' }), false, 'book: staff writing as the head chef (spoofed by) is refused');
await ok(W([['recipes/pie', pie()], ['book/index', { r: { pie: 1 } }, true]], { id: 'hd', pin: '9999' }), false, 'book: the head chef with a wrong PIN is refused');
await ok(setDoc(doc(anon, K + 'recipes/pie'), pie({ by: 'hd' })), false, 'book: no PIN proof is refused');
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
// the owner probe
await ok(getDoc(doc(owner, K + 'config/admins')), true, 'admins: the head chef may read the probe');
await ok(getDoc(doc(anon, K + 'config/admins')), false, 'admins: nobody else may');
await ok(getDoc(doc(env.authenticatedContext('other', { email: 'someone@test.local', email_verified: true }).firestore(), K + 'config/admins')), false, 'admins: another Google account may not');

await env.cleanup();
console.log((fails ? fails + ' failed' : 'All passed') + ' of ' + n + ' rules checks.');
process.exit(fails ? 1 : 0);
