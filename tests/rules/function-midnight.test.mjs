// Deterministic clock variation: the emulator executes the production predicates with request.time pinned.
// This checks the otherwise time-dependent midnight boundary; the normal suites retain the real emulator clock.
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, writeBatch, setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { anonContext, dailySession } from './device-auth-fixtures.mjs';
setLogLevel('silent');
const model = createRequire(import.meta.url)('../../js/functions.js');
const today = model.kday(Date.now()), pinned = Date.parse(today + 'T14:00:30Z'), cancelAt = pinned - 60000;
const cancelledDay = model.kday(cancelAt), undoDay = model.kday(pinned), future = model.addDays(undoDay, 2), start = model.kat(future, 1080);
const template = readFileSync(process.env.RULES || new URL('../../firestore.rules', import.meta.url), 'utf8');
const rules = template.replaceAll('KITCHEN_PIN', '000000').replaceAll('OWNER_EMAIL', 'headchef@test.local')
  .replaceAll('request.time', 'timestamp.value("' + new Date(pinned).toISOString() + '")');
const env = await initializeTestEnvironment({ projectId: 'demo-function-midnight', firestore: { rules } });
const K = 'kitchens/000000/', id = 'midnight';
const before = { v: 1, status: 'confirmed', name: 'Synthetic midnight', date: future, start, loc: '', guests: 20, mode: 'all',
  lines: [{ rid: 'pizza', name: 'Pizza', unit: 'platter', qty: 1, u: [0] }], rounds: [{ at: start }], notes: '', kc: '', kcBy: '', kcAt: 0,
  od: cancelledDay, first: start, last: start, from: start - 64800000, until: start + 7200000, kq: start + 7200000,
  was: {}, chg: [], cBy: 'fn', cAt: cancelAt, confBy: 'fn', confAt: cancelAt, by: 'fn', upd: cancelAt };
before.effects = model.effects(before, id);
const cancelled = { ...before, v: 2, status: 'cancelled', od: '', canBy: 'sous', canAt: cancelAt, upd: cancelAt, by: 'sous' };
const restored = { ...cancelled, v: 3, status: 'confirmed', od: cancelledDay, upd: pinned, by: 'sous' };
try {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    for (const [path, value] of Object.entries({
      'config/main': { headId: 'head', sousIds: ['sous'], staffIds: ['head', 'sous'], fnIds: [], addIds: [], tickIds: [], delIds: [] },
      'pinset/sous': { at: 1 }, 'sessions/sous': dailySession('sous', { at: cancelAt - 60000 }),
      ['functions/' + id]: cancelled, ['functions/' + id + '/hist/1']: { was: before, at: cancelAt, by: 'sous' },
      ['days/' + future + '/items/fn-midnight-pizza']: { ...before.effects.prep['fn-midnight-pizza'], done: true, doneAt: 1, doneById: 'head', deleted: true }
    })) await setDoc(doc(db, K + path), value);
  });
  const db = anonContext(env, 'sous').firestore(), suffix = d => d.replace(/-/g, '');
  const batch = (noticeDay, extra = {}) => {
    const b = writeBatch(db);
    b.set(doc(db, K + 'functions/' + id), restored); b.set(doc(db, K + 'functions/' + id + '/hist/2'), { was: cancelled, at: pinned, by: 'sous' });
    b.set(doc(db, K + 'days/' + future + '/items/fn-midnight-pizza'), { ...before.effects.prep['fn-midnight-pizza'], deleted: false, addedBy: 'Sous', addedById: 'sous', addedAt: pinned, by: 'sous' }, { merge: true });
    b.set(doc(db, K + 'orders/' + noticeDay + '/lines/fn-midnight-x' + suffix(noticeDay)), { ...before.effects.restore, deleted: true, deletedBy: 'Sous', deletedAt: pinned, by: 'sous', ...extra }, { merge: true });
    b.set(doc(db, K + 'orders/' + undoDay + '/lines/fn-midnight-r' + suffix(undoDay)), { ...before.effects.restore, deleted: false, addedBy: 'Sous', addedById: 'sous', addedAt: pinned, by: 'sous' }, { merge: true });
    return b.commit();
  };
  await assertFails(batch(cancelledDay, { text: 'Unapproved words' }));
  await assertFails(batch(undoDay));
  await assertSucceeds(batch(cancelledDay));
  console.log('PASS pinned-clock source variation: 3 midnight Undo checks (canonical bodies, actual cancellation day, order-day equality). Real-time rules remain covered separately.');
} finally { await env.cleanup(); }
