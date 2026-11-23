const L = require('./lib');
const schedule = require('../js/cleaning-schedule');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW));
const kitchen = 'kitchens/' + L.PIN + '/';
const task = id => {
  const draft = schedule.drafts().find(value => value.plan.template === id);
  return { ...draft, sectionName: '', root: id, prev: '', next: '', from: L.NOW - 86400000, until: 253402178400000,
    at: L.NOW - 2 * 86400000, by: 'sam' };
};
const action = name => '[data-cln="flow-' + name + '"]';
const records = (p, collection) => p.evaluate(path =>
  Object.entries(__fake.dump()).filter(([key]) => key.includes('/' + path + '/')).map(([, value]) => value), collection);

async function holdWrite(p) {
  await p.evaluate(() => {
    const fs = LK_PREP.book().fs(), original = fs.writeBatch;
    window.__releaseClean = null;
    fs.writeBatch = function () {
      const batch = original.apply(fs, arguments), commit = batch.commit;
      batch.commit = function () {
        fs.writeBatch = original;
        return new Promise((resolve, reject) => {
          window.__releaseClean = accept => accept ? commit.apply(batch, arguments).then(resolve, reject) : reject({ code: 'unavailable' });
        });
      };
      return batch;
    };
  });
}

async function pressAndWait(p, button) {
  await holdWrite(p);
  await button.press('Enter');
  await L.waitFor(p, () => typeof window.__releaseClean === 'function' && !!document.querySelector('.cln-plan-row.is-pending'));
}

function buttonState(panel, name) {
  return panel.evaluate((element, name) => {
    const button = element.querySelector('[data-cln="flow-' + name + '"]');
    return button && { text: button.textContent, disabled: button.disabled, busy: button.getAttribute('aria-busy') };
  }, name);
}

function pending(state, text) { return state && state.text === text && state.disabled && state.busy === 'true'; }

(async () => {
  const oven = task('c01'), food = task('c11'), recordedAt = L.NOW - 30000;
  food.plan.verifiers = ['sam'];
  const extra = {
    [kitchen + 'cleaningTasks/c01']: oven,
    [kitchen + 'cleaningTasks/c11']: food,
    [kitchen + 'cleaningDone/' + day + '_c11__start']: { day, task: 'c11', done: false, version: 1, by: 'ann',
      doneAt: recordedAt, doneById: 'ann', doneBy: 'Ann', workerId: 'ann', worker: 'Ann',
      flow: { slot: 'start', kind: 'start', status: 'awaiting', checked: food.plan.checks, note: 'Original checks', verifiedBy: '', verifiedAt: 0 } }
  };
  const b = await L.start();
  const p = await L.open(b, '#/cleaning', { who: 'sam', extra });
  try {
    await p.locator('[data-cln="group"][data-group="general"]').click();
    await p.locator('.cln-task-detail[data-id="c01"]').click();
    const panel = p.locator('.cln-plan-row[data-id="c01"] .cln-occurrence'), checks = panel.locator('[data-cln-check]'), note = panel.locator('[data-cln-note]');
    await checks.first().check();
    await note.fill('Checks to finish after this save');
    ok(await panel.locator(action('perform')).isDisabled(), 'incomplete required checks keep Record done disabled');
    await pressAndWait(p, panel.locator(action('save')));
    const saving = await buttonState(panel, 'save'), record = await buttonState(panel, 'perform');
    ok(pending(saving, 'Saving checks...'), 'partial save puts pending feedback on the pressed Save checks action');
    ok(record && record.disabled && !record.busy && record.text === 'Record done', 'an incomplete Record done has no pending label');
    ok(await panel.locator('h4 span').textContent() === 'Not sent' && !(await records(p, 'cleaningActions')).length,
      'partial save stays Not sent with no acknowledgement or audit event');
    await panel.locator(action('save')).evaluate(button => {
      button.disabled = false;
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      button.disabled = true;
    });
    await p.evaluate(() => window.__releaseClean(false));
    await panel.locator('.p-err').waitFor();
    ok(await checks.first().isChecked() && await note.inputValue() === 'Checks to finish after this save' &&
      !(await records(p, 'cleaningActions')).length && await panel.locator(action('save')).isEnabled(),
      'refused partial save and duplicate dispatch keep the work and write no audit event');
    await panel.locator(action('save')).press('Enter');
    await L.waitFor(p, () => document.querySelector('.cln-occurrence .lk-stamp')?.textContent.includes('Saved checks for'));
    const partial = (await records(p, 'cleaningDone')).find(value => value.task === 'c01');
    ok(partial && !partial.done && partial.flow.checked.length === 1 && (await records(p, 'cleaningActions')).length === 1,
      'explicit retry saves the partial checks in one audit event and leaves the task incomplete');

    for (const check of await checks.all()) await check.check();
    await pressAndWait(p, panel.locator(action('perform')));
    ok(pending(await buttonState(panel, 'perform'), 'Recording...') && (await buttonState(panel, 'save'))?.text === 'Save checks',
      'Record done owns the pending label after all required checks are complete');
    ok(await panel.locator('h4 span').textContent() === 'Not sent' && (await records(p, 'cleaningActions')).length === 1,
      'a held Record done shows no premature completion');
    await p.evaluate(() => window.__releaseClean(true));
    await L.waitFor(p, () => document.querySelector('.cln-occurrence .lk-stamp')?.textContent.includes('done.'));
    ok((await records(p, 'cleaningDone')).some(value => value.task === 'c01' && value.done) &&
      (await records(p, 'cleaningActions')).length === 2, 'Record done acknowledges exactly one new action');

    await p.locator('.cln-task-detail[data-id="c11"]').click();
    const foodPanels = p.locator('.cln-plan-row[data-id="c11"] .cln-occurrence');
    await pressAndWait(p, foodPanels.first().locator(action('verify')));
    ok(pending(await buttonState(foodPanels.first(), 'verify'), 'Saving Pass check...'),
      'the pressed Pass action stays visible and owns its pending label');
    ok((await buttonState(foodPanels.last(), 'perform'))?.text === 'Record done' &&
      await foodPanels.last().locator('h4 span').textContent() === 'Checks pending',
      'another slot on the same task retains its own ordinary status during Pass verification');
    ok((await records(p, 'cleaningDone')).some(value => value.task === 'c11' && value.flow.status === 'awaiting'),
      'a held Pass acknowledgement does not complete the task');
    await p.evaluate(() => window.__releaseClean(true));
    await L.waitFor(p, () => Array.from(document.querySelectorAll('.cln-occurrence .lk-stamp'))
      .some(element => element.textContent.includes('Pass check saved for')));
    const verified = (await records(p, 'cleaningDone')).find(value => value.task === 'c11');
    ok(verified.done && verified.workerId === 'ann' && verified.doneAt === recordedAt &&
      verified.flow.verifiedBy === 'sam' && (await records(p, 'cleaningActions')).length === 3,
      'acknowledged Pass verification preserves the original cleaner and records one checker action');
    ok(p.errors.length === 0, 'cleaning action states have no page errors');
  } finally {
    await p.context().close();
    await b.close();
  }
  L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
