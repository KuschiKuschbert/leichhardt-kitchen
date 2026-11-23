// Wastage review drafts stay with their own recorder and date through the 04:00 lock and deliberate handover.
const L = require('./lib');
const { R, ok } = L.results();
const assert = require('node:assert/strict');
const sunday = '2026-11-22', monday = '2026-11-23';
const midnight = Date.parse(`${monday}T00:00:00+10:00`), cutoff = midnight + 4 * 3600000;
const root = `kitchens/${L.PIN}/`, sundayPath = root + 'waste/' + sunday, mondayPath = root + 'waste/' + monday;
const sundaySaved = { avoidable: 'Sunday saved main waste', change: 'Sunday saved change', reviewBy: 'Jo', reviewAt: midnight - 60000 };
const mondaySaved = { avoidable: 'Monday saved main waste', change: 'Monday saved change', reviewBy: 'Lee', reviewAt: midnight + 60000 };
const draft = { avoidable: 'Count the unsaved trays after service', change: 'Use the unsaved smaller batch plan' };
const mondayDraft = { avoidable: 'Keep the new-day unsaved note', change: 'Use the new-day unsaved plan' };
const sheet = '.w-sheet [data-review-day]', resume = `.w-sheet [data-p="w-rv-resume"][data-d="${sunday}"]`;
const save = '.w-sheet [data-p="wreview"][data-v="page"]', changePerson = '[data-p="who-change"]';
const fields = { avoidable: '.w-sheet #w-ra', change: '.w-sheet #w-rc' };

async function open(b, { mode = 'shared', who = 'sam', admin = false, sameDay = false, extra = {} } = {}) {
  const p = await L.open(b, '#/waste', { who, admin, deviceMode: mode, clock: sameDay ? cutoff - 60000 : midnight - 35000,
    width: 390, height: 844, touch: true, extra: { [sundayPath]: sundaySaved, [mondayPath]: mondaySaved, ...extra } });
  await L.waitFor(p, () => LK_PREP.privateAccess() && !LK_PREP.unsent() && !!document.querySelector('[data-p="w-rv"]'));
  return p;
}

async function edit(p, day, words = draft) {
  await L.wReview(p);
  assert.equal(await p.locator(sheet).getAttribute('data-review-day'), day);
  for (const [name, selector] of Object.entries(fields)) await p.locator(selector).fill(words[name]);
  assert.equal(await p.locator(save).isEnabled(), true);
  assert.equal(await p.evaluate(() => LK_PREP.dirtyForUpdate()), true);
  await p.locator('.w-sheet [data-p="w-rv-close"]').click();
  await L.waitFor(p, () => !document.querySelector('.w-sheet'));
}

async function advanceTo(p, time, keepActive) {
  // 04:00 is four hours after midnight. Give the shared screen activity inside each ten-minute idle window.
  // Chromium can suppress mouse moves to the same point. Shift generates a real keydown without changing the form.
  if (keepActive) await p.keyboard.press('Shift');
  let left = time - await p.evaluate(() => LK_TIME.now());
  const eightMinutes = 8 * 60000;
  while (keepActive && left > eightMinutes) {
    await p.clock.fastForward(eightMinutes);
    await p.keyboard.press('Shift');
    left = time - await p.evaluate(() => LK_TIME.now());
  }
  if (left > 0) await p.clock.fastForward(left);
  assert.equal(await p.evaluate(() => LK_PREP.privateAccess()), true, 'the original PIN remains active before 04:00');
}

async function lock(p, by, identity, ms = 90000) {
  await p.clock.runFor(ms);
  // Activity checks expiry between the scheduled 15-second checks as well.
  await p.keyboard.press('Shift');
  await p.clock.runFor(100);
  await L.waitFor(p, () => !!LK_PREP.workLock() && !LK_PREP.privateAccess() && !!document.querySelector('#pf1'));
  assert.deepEqual(await p.evaluate(() => LK_PREP.workLock()), { person: by, identity, reason: 'daily' });
  assert.equal(await p.evaluate(() => LK_PREP.dirtyForUpdate()), true, 'unsaved Wastage work blocks reload while locked');
  assert.equal(await p.evaluate(() => !window.dispatchEvent(new Event('beforeunload', { cancelable: true }))), true);
  assert.equal(await p.locator('.w-sheet').count(), 0);
  assert.equal(await p.evaluate(words => words.some(word => document.documentElement.outerHTML.includes(word)), [...Object.values(draft), ...Object.values(mondayDraft)]), false);
}

async function unlock(p, who, pin) {
  // A handover clears the recorder before the name chooser has finished drawing.
  if (await p.evaluate(id => LK_PREP.state.who !== id, who)) await p.locator(`.p-name[data-id="${who}"]`).click();
  await L.waitFor(p, id => LK_PREP.state.who === id && LK_PREP.state.pinStep === 'enter' && !!document.querySelector('#pf1'), who);
  await p.locator('#pf1').fill(pin);
  const signedIn = id => LK_PREP.state.who === id && LK_PREP.privateAccess() && !LK_PREP.workLock();
  await L.waitFor(p, id => (LK_PREP.state.who === id && LK_PREP.privateAccess()) || /goes in by itself/.test(LK_PREP.state.pinMsg), who, 12000);
  if (await p.evaluate(() => /goes in by itself/.test(LK_PREP.state.pinMsg))) await p.clock.runFor(22000);
  await L.waitFor(p, signedIn, who, 12000);
  if (await p.evaluate(() => location.hash !== '#/waste')) await p.evaluate(() => { location.hash = '#/waste'; });
  await L.waitFor(p, () => !!document.querySelector('.w-page'));
}

async function scope(p) {
  return p.evaluate(() => {
    const { identity, issuedAt } = LK_PREP.book().writeContext();
    return { identity, issuedAt: issuedAt?.toMillis ? issuedAt.toMillis() : issuedAt };
  });
}

async function datedReviews(p) {
  return p.evaluate(([sundayPath, mondayPath]) => ({
    writes: __fake.writes.flat().filter(op => [sundayPath, mondayPath].includes(op.path)).map(op => op.path),
    sunday: __fake.dump()[sundayPath], monday: __fake.dump()[mondayPath],
  }), [sundayPath, mondayPath]);
}

async function showDraft(p, day, words = draft) {
  await L.wReview(p);
  if (await p.locator(sheet).getAttribute('data-review-day') !== day) {
    await p.locator(day === sunday ? resume : '.w-sheet [data-p="w-rv-today"]').click();
  }
  assert.equal(await p.locator(sheet).getAttribute('data-review-day'), day);
  for (const [name, selector] of Object.entries(fields)) assert.equal(await p.locator(selector).inputValue(), words[name]);
  assert.equal(await p.locator(save).isEnabled(), true);
}

async function saveDraft(p, day, by, name) {
  await p.locator(save).click();
  await L.waitFor(p, ({ path, avoidable }) => !LK_PREP.unsent() && __fake.dump()[path]?.avoidable === avoidable,
    { path: day === sunday ? sundayPath : mondayPath, avoidable: draft.avoidable });
  const records = await datedReviews(p), record = day === sunday ? records.sunday : records.monday;
  assert.deepEqual(records.writes, [day === sunday ? sundayPath : mondayPath]);
  assert.deepEqual(record, { ...draft, by, reviewBy: name, reviewAt: record.reviewAt });
  assert.ok(record.reviewAt >= cutoff);
  if (day === sunday) assert.deepEqual(records.monday, mondaySaved);
  else assert.deepEqual(records.sunday, sundaySaved);
}

async function withoutDraft(p) {
  await L.waitFor(p, () => !!document.querySelector('[data-p="w-rv"]'));
  await L.wReview(p);
  assert.equal(await p.locator(resume).count(), 0);
  assert.equal(await p.locator(sheet).getAttribute('data-review-day'), monday);
  for (const [name, selector] of Object.entries(fields)) assert.equal(await p.locator(selector).inputValue(), mondaySaved[name]);
  assert.equal(await p.locator(save).isEnabled(), false);
  assert.deepEqual(await datedReviews(p), { writes: [], sunday: sundaySaved, monday: mondaySaved });
  await p.locator('.w-sheet [data-p="w-rv-close"]').click();
}

async function fixture(b, label, options, run) {
  const p = await open(b, options);
  try {
    await run(p);
    assert.deepEqual(p.errors, []);
    ok(true, label);
  } catch (error) {
    ok(false, label + ': ' + error.message);
    console.log(await p.evaluate(() => ({ hash: location.hash, who: LK_PREP.state.who, private: LK_PREP.privateAccess(),
      dirty: LK_PREP.dirtyForUpdate(), lock: LK_PREP.workLock(), pinMessage: LK_PREP.state.pinMsg,
      pending: LK_PREP.unsent(), text: document.querySelector('.w-sheet')?.innerText })));
    console.log(error.stack);
  } finally { await p.context().close(); }
}

(async () => {
  const b = await L.start();
  try {
    for (const { mode, who, pin, otherPin, name, admin, sameDay } of [
      { mode: 'personal', who: 'sam', pin: '1111', otherPin: '2222', name: 'Sam' },
      { mode: 'shared', who: 'head', pin: '4444', otherPin: '1111', name: 'Head chef', admin: true },
      { mode: 'personal', who: 'sam', pin: '1111', otherPin: '2222', name: 'Sam', sameDay: true },
    ]) {
      await fixture(b, `${mode} ${sameDay ? 'current date' : 'earlier date'} stays private until a fresh original PIN and explicitly saves once`,
        { mode, who, admin, sameDay }, async p => {
          const day = sameDay ? monday : sunday, original = await scope(p);
          if (admin) await L.waitFor(p, () => LK_PREP.ownerHere());
          await edit(p, day);
          if (!sameDay) await advanceTo(p, cutoff - 60000, mode === 'shared');
          await lock(p, who, original.identity);
          if (admin) await L.waitFor(p, async () => !LK_PREP.ownerHere() && !(await LK_PREP.book().ready()).ownerAuth.currentUser);
          await p.locator('#pf1').fill(otherPin);
          await L.waitFor(p, () => LK_PREP.state.pinMsg === 'That PIN is not right.' && !LK_PREP.state.pf1 && !LK_PREP.unsent());
          assert.equal(await p.evaluate(() => LK_PREP.privateAccess()), false);
          assert.equal(await p.locator('.w-sheet').count(), 0);
          await unlock(p, who, pin);
          const fresh = await scope(p);
          assert.equal(fresh.identity, original.identity);
          assert.ok(fresh.issuedAt >= cutoff && fresh.issuedAt > original.issuedAt);
          if (admin) assert.equal(await p.evaluate(() => LK_PREP.ownerHere()), false);
          await showDraft(p, day);
          assert.deepEqual(await datedReviews(p), { writes: [], sunday: sundaySaved, monday: mondaySaved });
          await saveDraft(p, day, who, name);
        });
    }

    const config = L.seed()[root + 'config/main'];
    const secondChef = { ...config, sousIds: [...config.sousIds, 'ann'], people: config.people.map(p => p.id === 'ann' ? { ...p, role: 'sous' } : p) };
    await fixture(b, 'confirmed handover discards the earlier draft for the next chef and for the original chef when they return',
      { extra: { [root + 'config/main']: secondChef } }, async p => {
        const original = await scope(p);
        await edit(p, sunday);
        await advanceTo(p, cutoff - 60000, true);
        await lock(p, 'sam', original.identity);
        await p.locator(changePerson).click();
        assert.match(await p.locator(changePerson).innerText(), /Discard work and change person/i);
        assert.equal(await p.evaluate(() => LK_PREP.workLock()?.person === 'sam' && LK_PREP.dirtyForUpdate()), true);
        await p.locator(changePerson).click();
        await L.waitFor(p, () => !LK_PREP.workLock() && !LK_PREP.dirtyForUpdate());
        await unlock(p, 'ann', '2222');
        await withoutDraft(p);
        await L.notYou(p);
        await L.waitFor(p, () => !LK_PREP.privateAccess());
        await unlock(p, 'sam', '1111');
        await withoutDraft(p);
      });

    await fixture(b, 'the former sous chef can authenticate as staff after demotion and cannot open the earlier draft', {}, async p => {
      const original = await scope(p);
      await edit(p, sunday);
      await advanceTo(p, cutoff - 60000, true);
      await lock(p, 'sam', original.identity);
      await p.evaluate(root => {
        const store = __fake.dump();
        for (const rel of ['config/main', 'login/roster']) {
          const path = root + rel, old = store[path];
          __fake.write(path, { ...old, sousIds: old.sousIds.filter(id => id !== 'sam'), people: old.people.map(person => person.id === 'sam' ? { ...person, role: 'staff' } : person) });
        }
      }, root);
      await unlock(p, 'sam', '1111');
      await L.waitFor(p, () => !LK_PREP.state.config.sousIds.includes('sam') && !document.querySelector('[data-p="w-rv"]'));
      assert.equal(await p.locator('.w-sheet').count(), 0);
      assert.equal(await p.evaluate(words => words.some(word => document.documentElement.outerHTML.includes(word)), Object.values(draft)), false);
      assert.deepEqual(await datedReviews(p), { writes: [], sunday: sundaySaved, monday: mondaySaved });
    });

    for (const [waitingFor, otherDraft] of [['check', false], ['acknowledgement', false], ['acknowledgement', true]]) {
      await fixture(b, `04:00 protects an earlier review awaiting ${waitingFor}${otherDraft ? ' alongside a new-day draft' : ''}`, {}, async p => {
        const original = await scope(p);
        await edit(p, sunday);
        await advanceTo(p, cutoff - 60000, true);
        if (otherDraft) await edit(p, monday, mondayDraft);
        await showDraft(p, sunday);
        await p.evaluate(({ path, waitingFor }) => {
          const fs = LK_PREP.book().fs(), run = fs.runTransaction;
          window.__reviewTransaction = run;
          const hold = value => new Promise(resolve => { window.__releaseReview = () => resolve(value); });
          fs.runTransaction = (db, work) => {
            let scoped = false;
            return run.call(fs, db, tx => work({
              get: ref => {
                scoped = (Array.isArray(ref.path) ? ref.path.join('/') : ref.path) === path;
                const read = tx.get(ref);
                return scoped && waitingFor === 'check' ? read.then(hold) : read;
              },
              set: (...args) => tx.set(...args),
            })).then(value => scoped && waitingFor === 'acknowledgement' ? hold(value) : value);
          };
        }, { path: sundayPath, waitingFor });
        // Stage the save just before 04:00 without spending the interval in browser calls.
        await p.clock.pauseAt(cutoff - 1000);
        assert.equal(await p.evaluate(() => LK_PREP.privateAccess()), true, 'the original PIN remains active before 04:00');
        await p.locator(save).click();
        await p.clock.runFor(100);
        await L.waitFor(p, () => typeof window.__releaseReview === 'function' && LK_PREP.unsent());
        const beforeLock = await datedReviews(p);
        assert.deepEqual(beforeLock.writes, waitingFor === 'check' ? [] : [sundayPath]);
        await lock(p, 'sam', original.identity, 3000);
        if (waitingFor === 'acknowledgement') {
          await p.locator(changePerson).click();
          await p.locator(changePerson).click();
          assert.equal(await p.evaluate(() => LK_PREP.unsent() && LK_PREP.workLock()?.person === 'sam' && LK_PREP.blockedRecorder() === 'sam'), true);
          assert.equal(await p.locator('.w-sheet').count(), 0);
        }
        await p.evaluate(() => window.__releaseReview());
        await L.waitFor(p, () => !LK_PREP.unsent());
        await p.clock.resume();
        assert.deepEqual(await datedReviews(p), beforeLock);
        if (waitingFor === 'check') {
          await unlock(p, 'sam', '1111');
          await showDraft(p, sunday);
          assert.match(await p.locator(save).innerText(), /Try again/i);
          // Restore the original SDK method before the chef explicitly tries again.
          await p.evaluate(() => { LK_PREP.book().fs().runTransaction = window.__reviewTransaction; });
          await saveDraft(p, sunday, 'sam', 'Sam');
        } else {
          assert.deepEqual(beforeLock.sunday, { ...draft, by: 'sam', reviewBy: 'Sam', reviewAt: beforeLock.sunday.reviewAt });
          assert.deepEqual(beforeLock.monday, mondaySaved);
          assert.equal(await p.evaluate(() => LK_PREP.dirtyForUpdate()), otherDraft);
          await p.locator(changePerson).click();
          if (otherDraft) {
            assert.match(await p.locator(changePerson).innerText(), /Discard work and change person/i);
            await unlock(p, 'sam', '1111');
            await showDraft(p, monday, mondayDraft);
          } else await L.waitFor(p, () => !LK_PREP.workLock() && !LK_PREP.dirtyForUpdate());
        }
      });
    }
  } finally { await b.close(); }
  L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
