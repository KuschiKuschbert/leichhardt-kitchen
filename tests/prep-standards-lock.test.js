// The head chef's standards draft and pending save belong to the original PIN session's person.
// Synthetic people and records only. These journeys exercise the existing daily lock and handover contract.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const CFG = key('config', 'main'), STANDARD = key('prepStandards', 'onions');
const day = L.ymd(new Date(L.NOW)), cutoff = Date.parse(day + 'T04:00:00+10:00');
const instruction = '[Synthetic original instruction]';
function fixture() {
  return {
    [CFG]: {
      people: [
        { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true },
        { id: 'ann', name: 'Ann', role: 'head', add: true, tick: true, del: true, active: true },
        { id: 'bo', name: 'Bo', role: 'staff', add: true, tick: true, del: false, active: true }
      ],
      headId: 'ann', sousIds: ['sam', 'ann'], staffIds: ['sam', 'ann', 'bo'], fnIds: [], fnOnlyIds: [],
      addIds: ['sam', 'ann', 'bo'], tickIds: ['sam', 'ann', 'bo'], delIds: ['sam', 'ann'],
      kitSecs: [{ id: 'larder', name: 'Larder', off: false }, { id: 'grill', name: 'Grill', off: false }], showBadges: true
    },
    [STANDARD]: { sectionId: 'larder', name: 'Slice onions', aliases: ['onions'], minimum: 4, unit: 'tubs',
      instruction, recipe: '', archived: false, v: 1, at: cutoff - 3600000, by: 'ann' },
    [key('prepStandards', 'patties')]: { sectionId: 'grill', name: 'Portion patties', aliases: ['patties'], minimum: 20, unit: 'portions',
      instruction: '[Synthetic saved grill instruction]', recipe: '', archived: false, v: 1, at: cutoff - 3600000, by: 'ann' }
  };
}
async function openEditor(p) {
  await p.locator('[data-p="c-group"][data-g="prep"]').click();
  await L.waitFor(p, () => !!document.querySelector('[data-ps="edit"][data-id="onions"]'), null, 8000);
  await p.locator('[data-ps="edit"][data-id="onions"]').click();
  await L.waitFor(p, () => !!document.querySelector('[data-ps-field="instruction"]'), null, 8000);
}
async function unlock(p, who, pin) {
  const name = p.locator('.p-name[data-id="' + who + '"]');
  if (await name.count() && await name.isVisible()) await name.click();
  await p.locator('#pf1').fill(pin);
  await L.waitFor(p, who => LK_PREP.privateAccess() && LK_PREP.state.who === who, who, 8000);
  await L.settle(p, 250);
}
async function journey(browser, label, options, run) {
  let p;
  try {
    p = await L.open(browser, '#/chef', Object.assign({ who: 'ann', deviceMode: 'shared', extra: fixture(), wait: 1200 }, options || {}));
    await openEditor(p);
    await run(p);
    ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | '));
  } catch (error) {
    ok(false, label + ': ' + String(error.message || error).split('\n')[0]);
  } finally { if (p) await p.context().close(); }
}

(async () => {
  const browser = await L.start();
  await journey(browser, 'daily standards draft', { clock: cutoff - 60000 }, async p => {
    const original = await p.evaluate(() => ({ identity: LK_PREP.book().identity(), uid: LK_PREP.state.uid }));
    await p.fill('[data-ps-field="instruction"]', '[Synthetic retained head-chef draft]');
    ok(await p.evaluate(() => LK_PREP_STANDARDS.unsaved() && LK_PREP.unsaved()), 'a changed standards draft reaches the shared unsaved-work guard');
    await p.clock.runFor(90000); await L.settle(p, 300);
    const locked = await p.evaluate(() => ({ access: LK_PREP.privateAccess(), lock: LK_PREP.workLock(), held: LK_PREP.state.lockHasDraft,
      visible: !!document.querySelector('[data-ps-field="instruction"]'), draft: LK_PREP_STANDARDS.draft() }));
    ok(!locked.access && !locked.visible && locked.lock && locked.lock.person === 'ann' && locked.lock.identity === original.identity && locked.held,
      '04:00 hides the standards editor and binds its unfinished work to the original head chef');
    ok(locked.draft && locked.draft.instruction === '[Synthetic retained head-chef draft]', 'daily locking retains the original standards draft in memory');
    await unlock(p, 'ann', '2222');
    await L.waitFor(p, () => !!document.querySelector('[data-ps-field="instruction"]'), null, 8000);
    ok(await p.inputValue('[data-ps-field="instruction"]') === '[Synthetic retained head-chef draft]' && await p.evaluate(() => LK_PREP_STANDARDS.unsaved()),
      'the same head-chef PIN restores the unsaved instruction after the daily boundary');
    ok(await p.evaluate(k => __fake.dump()[k].instruction, STANDARD) === instruction, 'locking and restoring a draft do not save it automatically');
  });

  await journey(browser, 'standards draft handover', { clock: cutoff - 60000 }, async p => {
    await p.fill('[data-ps-field="instruction"]', '[Synthetic draft to discard]');
    await p.clock.runFor(90000); await L.settle(p, 300);
    await p.locator('[data-p="who-change"]').click(); await L.settle(p, 150);
    ok(await p.evaluate(() => LK_PREP.state.who === 'ann' && LK_PREP.workLock() && LK_PREP_STANDARDS.unsaved()) &&
      /Discard work and change person/.test(await p.locator('[data-p="who-change"]').innerText()),
    'the first handover tap retains the head-chef draft and asks for explicit discard');
    await p.locator('[data-p="who-change"]').click(); await L.settle(p, 250);
    ok(await p.evaluate(() => !LK_PREP_STANDARDS.unsaved() && !LK_PREP_STANDARDS.draft() && !LK_PREP.workLock()),
      'the confirmed handover clears the previous person’s standards draft and lock');
    await unlock(p, 'bo', '3333');
    ok(!(await p.locator('[data-ps-field="instruction"], [data-ps="save"]').count()) &&
      !/Synthetic draft to discard/.test(await p.locator('body').innerText()),
    'ordinary staff cannot see or save the previous head chef’s discarded editor');
    ok(await p.evaluate(k => __fake.dump()[k].instruction, STANDARD) === instruction, 'discarded draft leaves the saved standard intact');
  });

  await journey(browser, 'pending standards save', { clock: cutoff - 60000 }, async p => {
    await p.fill('[data-ps-field="instruction"]', '[Synthetic original-recorder save]');
    await p.evaluate(() => { __fake.mode = 'hold'; });
    await p.locator('[data-ps="save"]').click();
    await L.waitFor(p, () => LK_PREP_STANDARDS.busy() && LK_PREP.unsent(), null, 8000);
    await p.clock.runFor(90000); await L.settle(p, 300);
    ok(await p.evaluate(() => !LK_PREP.privateAccess() && !document.querySelector('[data-ps-field="instruction"]') && LK_PREP.blockedRecorder() === 'ann'),
      'a pending standards save remains hidden behind its original head-chef PIN');
    await p.locator('[data-p="who-change"]').click(); await p.locator('[data-p="who-change"]').click();
    ok(await p.evaluate(() => LK_PREP.unsent() && LK_PREP_STANDARDS.busy() && LK_PREP.state.who === 'ann' && !LK_PREP.signOut(true)),
      'handover and forced sign-out cannot discard or transfer a pending standard');
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); }); await L.settle(p, 200);
    await unlock(p, 'ann', '2222');
    await L.waitFor(p, k => !LK_PREP.unsent() && !LK_PREP_STANDARDS.busy() && (__fake.dump()[k] || {}).instruction === '[Synthetic original-recorder save]', STANDARD, 10000);
    const saved = await p.evaluate(k => __fake.dump()[k], STANDARD);
    ok(saved.by === 'ann' && saved.v === 2 && saved.sectionId === 'larder', 'the original head chef completes exactly the retained revision under their own recorder');
    await p.evaluate(() => { __fake.release(); __fake.ack(); }); await L.settle(p, 250);
    ok(await p.evaluate(k => __fake.dump()[k].v, STANDARD) === 2, 'late acknowledgement does not save the same standards revision twice');
  });

  await journey(browser, 'pending standards save after stale cache', { deviceMode: 'personal' }, async p => {
    const pending = '[Synthetic long-pending standard]';
    await p.fill('[data-ps-field="instruction"]', pending);
    await p.evaluate(() => { __fake.mode = 'hold'; });
    await p.locator('[data-ps="save"]').click();
    await L.waitFor(p, () => LK_PREP_STANDARDS.busy() && LK_PREP.unsent(), null, 8000);
    const before = await p.evaluate(() => __fake.reads.filter(path => /\/prepStandards$/.test(path)).length);
    await p.clock.fastForward(31 * 60000);
    await p.evaluate(() => { LK_PREP_STANDARDS.render(); }); await L.settle(p, 300);
    const held = await p.evaluate(() => ({ reads: __fake.reads.filter(path => /\/prepStandards$/.test(path)).length,
      busy: LK_PREP_STANDARDS.busy(), unsent: LK_PREP.unsent(), draft: LK_PREP_STANDARDS.draft() }));
    ok(held.reads === before, 'a stale standards cache does not issue another section query while its Save awaits acknowledgement');
    ok(held.busy && held.unsent && held.draft && held.draft.instruction === pending,
      'a redraw after thirty minutes preserves the original pending standards draft');
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
    await L.waitFor(p, k => !LK_PREP.unsent() && !LK_PREP_STANDARDS.busy() && (__fake.dump()[k] || {}).v === 2, STANDARD, 10000);
    const saved = await p.evaluate(k => __fake.dump()[k], STANDARD);
    ok(saved.instruction === pending && saved.by === 'ann' && !await p.evaluate(() => LK_PREP_STANDARDS.unsaved()),
      'the original pending standard completes after the stale-cache redraw without replacing its instruction or recorder');
    await p.evaluate(() => { __fake.release(); __fake.ack(); }); await L.settle(p, 250);
    ok(await p.evaluate(k => __fake.dump()[k].v, STANDARD) === 2, 'late acknowledgement after a stale-cache redraw does not save a second revision');
  });

  await journey(browser, 'canonical standards authority removal', {}, async p => {
    await p.fill('[data-ps-field="instruction"]', '[Synthetic draft after authority removal]');
    await p.evaluate(() => { window.__oldStandardsSave = document.querySelector('[data-ps="save"]'); });
    await p.evaluate(k => { const c = JSON.parse(JSON.stringify(__fake.dump()[k])); c.headId = 'sam'; __fake.write(k, c); }, CFG);
    await L.waitFor(p, () => LK_PREP.state.config && LK_PREP.state.config.headId === 'sam' && !document.querySelector('[data-ps="save"]'), null, 8000);
    ok(!(await p.locator('[data-ps-field="instruction"]').count()), 'removing canonical head ownership hides the editor even while its editable role label still says head');
    const before = await p.evaluate(() => __fake.writes.filter(ops => ops.some(x => /\/prepStandards\//.test(x.path))).length);
    await p.evaluate(() => { LK_PREP_STANDARDS.click(window.__oldStandardsSave); }); await L.settle(p, 200);
    const after = await p.evaluate(() => __fake.writes.filter(ops => ops.some(x => /\/prepStandards\//.test(x.path))).length);
    ok(after === before && await p.evaluate(k => __fake.dump()[k].instruction, STANDARD) === instruction,
      'a stale standards Save control cannot write after canonical head authority is removed');
    ok(await p.locator('[data-ps-field="section"]').isEnabled(), 'a retained private draft does not block read-only section navigation');
    await L.pick(p, '[data-ps-field="section"]', 'grill');
    await L.waitFor(p, () => !!document.querySelector('[data-ps="edit"][data-id="patties"]'), null, 8000);
    await p.locator('[data-ps="edit"][data-id="patties"]').click();
    ok(/Synthetic saved grill instruction/.test(await p.locator('.ps-editor').innerText()) && !(await p.locator('[data-ps="save"]').count()),
      'the former head chef can read a saved standard in another section without regaining edit controls');
    ok(await p.evaluate(() => { const d = LK_PREP_STANDARDS.draft(); return d && d.id === 'onions' && d.sectionId === 'larder' &&
      d.instruction === '[Synthetic draft after authority removal]' && LK_PREP_STANDARDS.unsaved(); }),
    'read-only navigation preserves the unfinished original item and section');
    await p.evaluate(k => { const c = JSON.parse(JSON.stringify(__fake.dump()[k])); c.headId = 'ann'; __fake.write(k, c); }, CFG);
    await L.waitFor(p, () => !!document.querySelector('[data-ps-field="instruction"]'), null, 8000);
    ok(await p.inputValue('[data-ps-field="section"]') === 'larder' && await p.inputValue('[data-ps-field="name"]') === 'Slice onions' &&
      await p.inputValue('[data-ps-field="instruction"]') === '[Synthetic draft after authority removal]',
    'restoring canonical head authority resumes the retained original draft in its own section');
    ok(await p.evaluate(k => __fake.dump()[k].instruction, STANDARD) === instruction, 'restoring authority does not save the retained draft automatically');
  });
  await browser.close(); L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
