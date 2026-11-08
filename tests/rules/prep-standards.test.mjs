/* Section prep standards: role boundaries, complete field validation and stale-editor protection on real rules.
   Synthetic kitchen and people only. Staff read standards; only the current head chef may change them. */
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, documentId, getDoc, getDocs, limit, orderBy, query, setDoc, setLogLevel, startAfter, updateDoc, where } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';

setLogLevel('silent');
const PIN = '000000', OWNER = 'headchef@test.local', K = 'kitchens/' + PIN + '/';
const rules = readFileSync(process.env.RULES || new URL('../../firestore.rules', import.meta.url), 'utf8')
  .replaceAll('KITCHEN_PIN', PIN).replaceAll('OWNER_EMAIL', OWNER);

async function main() {
  const env = await initializeTestEnvironment({ projectId: 'demo-prep-standards', firestore: { rules } });
  let checks = 0, failures = 0;
  const time = Date.now(), ids = ['head', 'sous', 'staff', 'lead', 'view', 'function', 'wrong-label'];
  const record = patch => Object.assign({ sectionId: 'larder', name: 'Sliced onions', aliases: ['onions', 'slice onions'],
    minimum: 4, unit: 'tubs', instruction: 'Check the labelled prepared tubs.', recipe: 'test-onions', archived: false,
    v: 1, at: time, by: 'head' }, patch || {});
  const phone = id => anonContext(env, id).firestore();
  const ref = (db, id) => doc(db, K + 'prepStandards/' + id);
  async function check(promise, allowed, label) {
    checks++;
    try { await (allowed ? assertSucceeds(promise) : assertFails(promise)); }
    catch (error) {
      failures++;
      console.error('FAIL prep standards: ' + label + ' (' + String(error?.message || error).split('\n')[0].slice(0, 220) + ')');
    }
  }
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, K + 'config/main'), { staffIds: ids, headId: 'head', sousIds: ['head', 'sous'],
        fnIds: ['function'], fnOnlyIds: ['function'], kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }],
        people: [{ id: 'wrong-label', name: 'Test label', role: 'head', active: true }] });
      for (const id of [...ids, 'removed']) {
        await setDoc(doc(db, K + 'pinset/' + id), { at: 1 });
        await setDoc(doc(db, K + 'sessions/' + id), dailySession(id, { at: time }));
      }
      await setDoc(doc(db, K + 'sessions/expired'), dailySession('head', { at: time - 86400000 }));
      await setDoc(doc(db, K + 'sessions/reset'), dailySession('head', { pinAt: 0, at: time }));
      await setDoc(doc(db, K + 'prepStandards/existing'), record());
      await setDoc(doc(db, K + 'prepStandards/archived'), record({ archived: true }));
      for (const [id, sectionId, archived] of [['cursor-a', 'paging', false], ['cursor-b', 'paging', true], ['cursor-c', 'paging', false], ['cursor-d', 'other-section', false]]) {
        await setDoc(doc(db, K + 'prepStandards/' + id), record({ sectionId, archived }));
      }
    });
    await seedOwnerDevice(env, { pin: PIN, uid: 'admin', headId: 'head', at: time });
    const head = phone('head'), admin = phone('admin'), staff = phone('staff');
    const roles = [
      ['head chef', head, true, true, 'head'], ['verified admin', admin, true, true, 'head'],
      ['sous chef', phone('sous'), true, false, 'sous'], ['staff', staff, true, false, 'staff'],
      ['lead', phone('lead'), true, false, 'lead'], ['view only', phone('view'), true, false, 'view'],
      ['editable head role label', phone('wrong-label'), true, false, 'wrong-label'],
      ['functions only', phone('function'), false, false, 'function'],
      ['removed member', phone('removed'), false, false, 'removed'],
      ['expired head session', phone('expired'), false, false, 'head'],
      ['reset head PIN', phone('reset'), false, false, 'head'],
      ['anonymous device without PIN', phone('unknown'), false, false, 'head'],
      ['signed out', env.unauthenticatedContext().firestore(), false, false, 'head'],
      ['Google owner alone', env.authenticatedContext('google-owner', { email: OWNER, email_verified: true,
        firebase: { sign_in_provider: 'google.com' } }).firestore(), false, false, 'head'],
      ['Google identity on head device UID', env.authenticatedContext('head', { email: OWNER, email_verified: true,
        firebase: { sign_in_provider: 'google.com' } }).firestore(), false, false, 'head']
    ];
    for (const [index, [label, db, reads, writes, by]] of roles.entries()) {
      await check(getDoc(ref(db, 'existing')), reads, label + ' reads a standard');
      await check(getDoc(ref(db, 'absent')), reads, label + ' checks an absent standard');
      await check(getDocs(query(collection(db, K + 'prepStandards'), where('sectionId', '==', 'larder'), where('archived', '==', false), orderBy(documentId()), limit(101))), reads,
        label + ' reads the first active section page');
      await check(getDocs(query(collection(db, K + 'prepStandards'), where('sectionId', '==', 'larder'), where('archived', '==', false), orderBy(documentId()), startAfter('existing'), limit(101))), reads,
        label + ' reads the next active section page');
      await check(getDocs(query(collection(db, K + 'prepStandards'), where('sectionId', '==', 'larder'), orderBy(documentId()), limit(101))), reads,
        label + ' reads the first management section page');
      await check(getDocs(query(collection(db, K + 'prepStandards'), where('sectionId', '==', 'larder'), orderBy(documentId()), startAfter('existing'), limit(101))), reads,
        label + ' reads the next management section page');
      await check(setDoc(ref(db, 'role-' + index), record({ by })), writes, label + ' creates a standard');
      await check(updateDoc(ref(db, 'existing'), { instruction: 'Test change', v: 2, by }), writes,
        label + ' updates a standard');
      // Keep each role's attempted update independent, including the two valid writers.
      await env.withSecurityRulesDisabled(context => setDoc(ref(context.firestore(), 'existing'), record()));
      await check(deleteDoc(ref(db, 'existing')), false, label + ' cannot hard-delete a standard');
    }
    const page = (db, active, after = '', size = 101) => getDocs(query(collection(db, K + 'prepStandards'), where('sectionId', '==', 'paging'),
      ...(active ? [where('archived', '==', false)] : []), orderBy(documentId()), ...(after ? [startAfter(after)] : []), limit(size)));
    const sameIds = (snapshot, ids) => {
      if (JSON.stringify(snapshot.docs.map(item => item.id)) !== JSON.stringify(ids)) throw Error('Unexpected page ids');
    };
    await check(page(staff, true, '', 1).then(snapshot => sameIds(snapshot, ['cursor-a'])), true, 'active first page follows stable document-id order');
    await check(page(staff, true, 'cursor-a').then(snapshot => sameIds(snapshot, ['cursor-c'])), true, 'active cursor excludes archived items, prior page and another section');
    await check(page(head, false, 'cursor-a').then(snapshot => sameIds(snapshot, ['cursor-b', 'cursor-c'])), true, 'management cursor includes archived items in the selected section');
    await check(page(head, false, 'cursor-c').then(snapshot => sameIds(snapshot, [])), true, 'management cursor at the end returns a complete empty page');
    await check(page(staff, true, 'cursor-b').then(snapshot => sameIds(snapshot, ['cursor-c'])), true, 'a saved cursor need not still be an active item');
    await check(setDoc(ref(staff, 'spoof-head'), record()), false, 'staff cannot spoof the head recorder');
    await check(setDoc(ref(phone('sous'), 'sous-spoof-head'), record()), false, 'sous cannot spoof the head recorder');
    await check(setDoc(ref(admin, 'empty-author'), record({ by: '' })), false, 'admin cannot omit its current recorder');
    await check(setDoc(ref(admin, 'other-author'), record({ by: 'sous' })), false, 'admin cannot record a different person');
    await check(setDoc(ref(head, 'head-other-author'), record({ by: 'staff' })), false, 'head cannot record a different person');

    const versions = ref(head, 'versions');
    await check(setDoc(versions, record()), true, 'first save starts at revision one');
    await check(setDoc(versions, record({ name: 'Stale edit' })), false, 'unchanged revision cannot overwrite a saved item');
    await check(setDoc(versions, record({ v: 3 })), false, 'skipped revision refused');
    await check(setDoc(versions, record({ v: 2, minimum: 2 })), true, 'next revision accepted');
    await check(setDoc(versions, record({ v: 2, minimum: 3 })), false, 'second editor using the previous revision refused');
    await check(setDoc(versions, record({ v: 3, archived: true })), true, 'head archives the item');
    await check(getDoc(ref(staff, 'versions')), true, 'archiving does not turn the standard into a hidden permission bypass');
    await check(setDoc(versions, record({ v: 4, archived: false })), true, 'head restores the item');
    await check(setDoc(versions, record({ v: 5, sectionId: 'grill' })), false, 'section identity cannot change');
    await check(setDoc(versions, record({ v: 5, name: 'Thinly sliced onions' })), true, 'renaming preserves item identity');
    await check(setDoc(ref(admin, 'versions'), record({ v: 6, name: 'Updated by owner' })), true, 'owner uses the next revision and current head recorder');
    await check(setDoc(ref(admin, 'versions'), record({ v: 6, name: 'Stale owner edit' })), false, 'owner also obeys stale-edit protection');
    await check(updateDoc(versions, { minimum: 3 }), false, 'merge cannot evade the revision guard');
    await check(updateDoc(versions, { minimum: 3, v: 7, by: 'head' }), true, 'valid partial update still validates the complete resulting document');

    for (const [id, patch] of [['unset', { minimum: null }], ['zero', { minimum: 0 }], ['fraction', { minimum: 0.25 }],
      ['no-aliases', { aliases: [] }], ['no-instruction-recipe', { instruction: '', recipe: '' }]]) {
      await check(setDoc(ref(head, id), record(patch)), true, 'valid ' + id + ' standard');
    }
    await check(Promise.all([getDoc(ref(head, 'unset')), getDoc(ref(head, 'zero'))]).then(([unset, zero]) => {
      if (unset.data().minimum !== null || zero.data().minimum !== 0) throw Error('Unset and zero minimums were conflated');
    }), true, 'null and zero minimums survive distinctly');
    const aliases = Array.from({ length: 12 }, (_, i) => 'Alias ' + i);
    await check(setDoc(ref(head, 'max-aliases'), record({ aliases })), true, 'all twelve approved aliases accepted');
    for (let index = 0; index < 12; index++) {
      const bad = aliases.slice(); bad[index] = { text: 'not a string' };
      await check(setDoc(ref(head, 'bad-alias-' + index), record({ aliases: bad })), false, 'alias ' + index + ' is validated');
    }
    await check(setDoc(ref(head, 'x'.repeat(80)), record({ sectionId: 's'.repeat(80), name: 'n'.repeat(160),
      aliases: Array.from({ length: 12 }, (_, i) => String(i).padEnd(160, 'a')), minimum: 1000000,
      unit: 'u'.repeat(40), instruction: 'i'.repeat(500), recipe: 'r'.repeat(160), at: 0 })), true, 'document at every allowed length and quantity bound');

    const invalid = [
      [{ sectionId: '' }, 'empty section id'], [{ sectionId: 'larder/other' }, 'unsafe section id'],
      [{ sectionId: 's'.repeat(81) }, 'overlong section id'], [{ sectionId: 1 }, 'non-string section id'],
      [{ name: '' }, 'empty name'], [{ name: '   ' }, 'blank name'], [{ name: '\t\n' }, 'whitespace name'],
      [{ name: 'x'.repeat(161) }, 'overlong name'], [{ name: 1 }, 'non-string name'],
      [{ aliases: {} }, 'non-list aliases'], [{ aliases: [...aliases, 'Too many'] }, 'thirteen aliases'],
      [{ aliases: [''] }, 'empty alias'], [{ aliases: ['   '] }, 'blank alias'], [{ aliases: ['\t'] }, 'whitespace alias'],
      [{ aliases: ['x'.repeat(161)] }, 'overlong alias'],
      [{ minimum: -1 }, 'negative minimum'], [{ minimum: 1000000.1 }, 'minimum over limit'],
      [{ minimum: '4' }, 'string minimum'], [{ minimum: false }, 'boolean minimum'],
      [{ minimum: Number.NaN }, 'NaN minimum'], [{ minimum: Number.POSITIVE_INFINITY }, 'infinite minimum'],
      [{ unit: '' }, 'empty unit'], [{ unit: '   ' }, 'blank unit'], [{ unit: '\n' }, 'whitespace unit'],
      [{ unit: 'x'.repeat(41) }, 'overlong unit'], [{ unit: 1 }, 'non-string unit'],
      [{ instruction: 'x'.repeat(501) }, 'overlong instruction'], [{ instruction: [] }, 'non-string instruction'],
      [{ recipe: 'https://example.test' }, 'recipe URL'], [{ recipe: '../other' }, 'recipe path'],
      [{ recipe: 'x'.repeat(161) }, 'overlong recipe'], [{ recipe: 1 }, 'non-string recipe'],
      [{ archived: 'false' }, 'non-boolean archive'], [{ v: 0 }, 'zero revision'], [{ v: 2 }, 'creation above first revision'],
      [{ v: 1.5 }, 'fractional revision'], [{ at: -1 }, 'negative timestamp'], [{ at: time + 3600000 }, 'future timestamp'],
      [{ at: 'now' }, 'string timestamp'], [{ at: Number.NaN }, 'NaN timestamp'],
      [{ at: Number.POSITIVE_INFINITY }, 'infinite timestamp'], [{ unexpected: true }, 'unexpected field']
    ];
    for (const [patch, label] of invalid) await check(setDoc(ref(admin, 'invalid'), record(patch)), false, label + ' refused even for owner');
    for (const field of Object.keys(record())) {
      const missing = record(); delete missing[field];
      await check(setDoc(ref(head, 'missing-' + field), missing), false, 'required field ' + field + ' cannot be omitted');
    }
    await check(setDoc(ref(head, 'bad id'), record()), false, 'document id uses the safe grammar');
    await check(setDoc(ref(head, 'x'.repeat(81)), record()), false, 'document id length is bounded');
    console.log((failures ? 'FAIL' : 'PASS') + ' prep standards: ' + checks + ' real-rules checks, ' + failures + ' failed.');
  } finally {
    await env.cleanup();
  }
  if (failures) process.exit(1);
}
main().catch(error => { console.error(error); process.exit(1); });
