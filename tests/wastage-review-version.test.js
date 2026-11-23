// The same save contract in the sous chef's live sheet and the head chef's dated report.
const assert = require('node:assert/strict');
const path = require('node:path');
const L = require('./lib');
const { R, ok } = L.results();
const button = '[data-p="wreview"]';
const draft = 'Reduce early batches for shared prep';
const today = L.ymd(new Date(L.NOW));
const yesterday = L.ymd(new Date(L.NOW - 86400000));
const initial = { avoidable: 'Morning review', change: 'Review after service', reviewBy: 'Jo', reviewAt: L.NOW - 60000 };
const second = { avoidable: 'Second chef measured the waste', change: 'Keep the line plan', reviewBy: 'Jo', reviewAt: L.NOW };
const third = { avoidable: 'Third chef checked the quantity', change: 'Use the updated plan', reviewBy: 'Lee', reviewAt: L.NOW + 60000 };

async function assess(p, key) {
  return p.evaluate(key => {
    const b = document.querySelector('[data-p="wreview"]');
    return { label: b?.innerText, pending: b?.getAttribute('aria-busy'), disabled: b?.disabled, input: document.querySelector('#w-ra')?.value,
      message: document.querySelector('.w-rv-status')?.innerText, saved: __fake.dump()[key],
      reads: __fake.reads.filter(x => x === key).length, writes: __fake.writes.flat().filter(x => x.path === key).length };
  }, key);
}

function repeatSave(p) {
  return p.locator(button).dispatchEvent('click');
}

async function waitLabel(p, label) {
  await L.waitFor(p, expected => document.querySelector('[data-p="wreview"]')?.innerText === expected, label);
}

async function capture(p, name) {
  if (!process.env.WASTAGE_PROOF_DIR) return;
  if (name.endsWith('-new-conflict')) await L.waitFor(p, selector => !document.querySelector(selector)?.disabled, button);
  await p.evaluate(selector => document.querySelector(selector)?.scrollIntoView({ block: 'nearest' }), button);
  await p.screenshot({ path: path.join(process.env.WASTAGE_PROOF_DIR, name + '.png') });
}

async function check(browser, admin) {
  const surface = admin ? 'admin' : 'page', date = admin ? yesterday : today, key = `kitchens/${L.PIN}/waste/${date}`;
  const p = await L.open(browser, admin ? '#/admin' : '#/waste', {
    admin, who: admin ? '' : 'sam', width: admin ? 1280 : 390, touch: !admin, extra: { [key]: initial },
  });
  try {
    if (admin) {
      await L.adminTab(p, 'waste');
      await p.click('[data-p="wh-view"][data-v="reviews"]');
      await p.click('[data-p="rv-day"][data-d="-1"]');
      assert.equal(await p.inputValue('[data-k="wh-review-date"]'), date);
    } else await L.wReview(p);
    await L.waitFor(p, () => !!document.querySelector('[data-p="wreview"]'));
    await p.fill('#w-ra', draft);
    const before = await assess(p, key);
    await p.evaluate(key => { __fake.quiet = true; __fake.stall = new RegExp(key + '$'); }, key);
    const save = () => admin ? p.locator(button).click() : p.locator(button).tap();
    await save();
    await waitLabel(p, 'Checking...');
    await repeatSave(p);
    await L.settle(p, 4200);
    const checking = await assess(p, key);
    ok(checking.disabled && checking.pending === 'true' && checking.reads === before.reads + 1 && checking.writes === 0,
      surface + ': a repeated tap while checking makes only one read and sends no write');
    await capture(p, surface + '-checking');
    await L.settle(p, 2000);
    await waitLabel(p, 'Try again');
    ok(/Could not check/.test((await assess(p, key)).message), surface + ': a held read times out into a local retry');

    await p.evaluate(key => { __fake.stall = null; __fake.denyReads = new RegExp(key + '$'); }, key);
    await save();
    await waitLabel(p, 'Try again');
    const denied = await assess(p, key);
    ok(denied.reads === checking.reads + 1 && denied.writes === 0 && denied.input === draft && /Could not check/.test(denied.message),
      surface + ': a denied read sends zero writes and keeps the exact draft');
    await capture(p, surface + '-read-refused');

    await p.evaluate(({ key, second }) => { __fake.denyReads = null; __fake.write(key, second); }, { key, second });
    await p.clock.pauseAt(await p.evaluate(() => Date.now() + 1000));
    await repeatSave(p);
    await p.clock.runFor(40);
    await waitLabel(p, 'Replace review');
    const conflict = await assess(p, key);
    ok(conflict.writes === 0 && conflict.input === draft && /Jo saved a review/.test(conflict.message),
      surface + ': a change with the same saved name still requires explicitly replacing that version');
    await repeatSave(p);
    await p.clock.runFor(40);
    const duplicate = await assess(p, key);
    ok(conflict.disabled && duplicate.reads === conflict.reads && duplicate.writes === 0,
      surface + ': an immediate second tap still cannot accept a newly painted Replace action');
    await p.clock.runFor(500);
    await p.clock.resume();

    await p.evaluate(() => { __fake.liteCommitDelay = 1200; });
    await save();
    await waitLabel(p, 'Saving...');
    await repeatSave(p);
    await p.evaluate(({ key, third }) => __fake.write(key, third), { key, third });
    await L.settle(p, 1450);
    await waitLabel(p, 'Replace review');
    const changed = await assess(p, key);
    ok(changed.writes === 0 && changed.saved.avoidable === third.avoidable && /Lee saved a review/.test(changed.message) && changed.input === draft,
      surface + ': a third writer between the transaction read and commit needs fresh consent');
    await capture(p, surface + '-new-conflict');

    await p.evaluate(key => { __fake.liteCommitDelay = 0; __fake.deny = new RegExp(key + '$'); }, key);
    await save();
    await waitLabel(p, 'Try again');
    const refused = await assess(p, key);
    ok(refused.writes === 1 && refused.saved.avoidable === third.avoidable && refused.input === draft && /Could not save/.test(refused.message),
      surface + ': a refused write leaves the draft beside Try again');
    await capture(p, surface + '-write-refused');

    await p.evaluate(() => { __fake.deny = null; });
    await save();
    await waitLabel(p, 'Replace review');
    await save();
    await waitLabel(p, 'Saved');
    const saved = await assess(p, key);
    ok(saved.writes === refused.writes + 1 && saved.saved.avoidable === draft &&
      saved.saved.change === third.change && saved.saved.by === (admin ? 'head' : 'sam'),
      surface + ': one fresh approval commits once, with the original device recorder and latest untouched field');
    ok(!p.errors.length && !(await L.overflow(p)), surface + ': the real app shell has no browser errors or horizontal overflow');
    await capture(p, surface + '-saved');
  } finally {
    await p.context().close();
  }
}

async function checkInterruption(browser) {
  const key = `kitchens/${L.PIN}/waste/${today}`;
  const p = await L.open(browser, '#/waste', { who: 'sam', extra: { [key]: initial } });
  try {
    await L.wReview(p);
    await p.fill('#w-ra', draft);
    await p.clock.pauseAt(await p.evaluate(() => Date.now() + 1000));
    await repeatSave(p);
    await waitLabel(p, 'Checking...');
    await p.evaluate(() => document.querySelector('.w-sheet [data-p="w-rv-close"]').click());
    await p.clock.runFor(50);
    const closed = await assess(p, key);
    ok(!closed.label && closed.writes === 0, 'leaving the sheet before the check completes prevents any write');
    await p.clock.resume();
    await L.wReview(p);
    await waitLabel(p, 'Try again');
    ok((await assess(p, key)).input === draft, 'reopening the original form keeps the draft available for an explicit retry');
  } finally {
    await p.context().close();
  }
}

(async () => {
  const browser = await L.start();
  try {
    await check(browser, false);
    await check(browser, true);
    await checkInterruption(browser);
  } finally {
    await browser.close();
  }
  L.report(R);
})().catch(error => { console.log(R.join('\n')); console.error(error); process.exitCode = 1; });
