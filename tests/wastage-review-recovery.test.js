// Wastage keeps independent calendar-date drafts within one Brisbane PIN session.
const assert = require('node:assert/strict');
const L = require('./lib');

const sunday = '2026-11-22';
const monday = '2026-11-23';
const midnight = Date.parse(monday + 'T00:00:00+10:00');
const opening = midnight - 35000;
const root = `kitchens/${L.PIN}`;
const sundayKey = `${root}/waste/${sunday}`;
const mondayKey = `${root}/waste/${monday}`;
const sundaySaved = { avoidable: 'Sunday soup review', change: 'Sunday saved prep', reviewBy: 'Jo', reviewAt: opening - 40000, by: 'jo' };
const mondaySaved = { avoidable: 'Monday bread review', change: 'Monday saved prep', reviewBy: 'Lee', reviewAt: midnight + 100, by: 'lee' };
const sundayDraft = 'Sunday draft: finish the soup in half batches';
const mondayDraft = 'Monday draft: count the bread before lunch';
const adminDraft = 'Admin draft: update the bread order';
const sundayLine = 'Sunday trimmings';
const mondayLine = 'Monday bread ends';
const sheet = '.w-sheet [data-review-day]';
const opener = '[data-p="w-rv"]';
const log = '[data-p="w-log"]';
const resume = `.w-sheet [data-p="w-rv-resume"][data-d="${sunday}"]`;
const back = '.w-sheet [data-p="w-rv-today"]';
const close = '.w-sheet [data-p="w-rv-close"].sheet-x';
const save = '.w-sheet [data-p="wreview"][data-v="page"]';

function fixture(admin) {
  return {
    admin, who: admin ? '' : 'sam', width: admin ? 1280 : 390, touch: !admin, clock: opening,
    extra: {
      [`${root}/waste/${L.ymd(new Date(L.NOW))}/lines/w1`]: undefined,
      [sundayKey]: sundaySaved,
      [mondayKey]: mondaySaved,
      [`${sundayKey}/lines/trim`]: { text: sundayLine, amount: 0.5, unit: 'kg', reason: 'prep', addedAt: opening - 2000, addedBy: 'Jo', by: 'jo' },
      [`${mondayKey}/lines/bread`]: { text: mondayLine, amount: 3, unit: 'pcs', reason: 'excess', addedAt: midnight + 500, addedBy: 'Lee', by: 'lee' },
    },
  };
}

async function assess(p) {
  return p.evaluate(({ sundayKey, mondayKey }) => {
    const form = document.querySelector('.w-sheet [data-review-day]');
    const b = form?.querySelector('[data-p="wreview"]');
    const records = __fake.dump();
    return {
      day: LK_TIME.day(LK_TIME.now()), issuance: localStorage.getItem('lk.prep.sess'),
      dirty: LK_PREP.dirtyForUpdate(), access: LK_PREP.privateAccess(),
      logDate: document.querySelector('.w-page .nb-date')?.innerText,
      status: document.querySelector('[data-p="w-rv"]')?.innerText,
      lines: [...document.querySelectorAll('.w-page .w-row .nb-t strong')].map(el => el.innerText),
      date: form?.dataset.reviewDay,
      avoidable: form?.querySelector('#w-ra')?.value,
      change: form?.querySelector('#w-rc')?.value,
      label: b?.innerText, disabled: b?.disabled, pending: b?.getAttribute('aria-busy'),
      message: form?.querySelector('.w-rv-status')?.innerText,
      receipt: document.querySelector('.p-toast-msg')?.innerText,
      saved: [records[sundayKey], records[mondayKey]],
      reads: __fake.reads.filter(k => k === sundayKey || k === mondayKey),
      writes: __fake.writes.flat().filter(w => w.path === sundayKey || w.path === mondayKey).map(w => w.path),
    };
  }, { sundayKey, mondayKey });
}

function formDate(p, date) {
  return L.waitFor(p, day => document.querySelector('.w-sheet [data-review-day]')?.dataset.reviewDay === day, date);
}

function waitLabel(p, label) {
  return L.waitFor(p, text => document.querySelector('.w-sheet [data-p="wreview"]')?.innerText === text, label);
}

function tap(p, selector) {
  return p.locator(selector).tap();
}

function dispatch(p, selector) {
  return p.locator(selector).dispatchEvent('click');
}

async function assertDraft(p, date, avoidable, change) {
  await formDate(p, date);
  const view = await assess(p);
  assert.equal(view.avoidable, avoidable);
  assert.equal(view.change, change);
  assert.equal(await p.locator('.w-sheet[role="dialog"]').count(), 1);
  return view;
}

async function waitMonday(p) {
  await L.waitFor(p, line => [...document.querySelectorAll('.w-page .w-row .nb-t strong')].some(el => el.innerText === line), mondayLine);
  await L.waitFor(p, () => /Saved by Lee/.test(document.querySelector('[data-p="w-rv"]')?.innerText));
  const view = await assess(p);
  assert.equal(view.logDate, '23 November 2026');
  assert.deepEqual(view.lines, [mondayLine]);
}

async function beforeMidnight(p) {
  await L.waitFor(p, line => [...document.querySelectorAll('.w-page .w-row .nb-t strong')].some(el => el.innerText === line), sundayLine);
  await L.wReview(p);
  await formDate(p, sunday);
  assert.equal(await p.inputValue('#w-ra'), sundaySaved.avoidable);
  assert.equal(await p.inputValue('#w-rc'), sundaySaved.change);
  await p.fill('#w-ra', sundayDraft);
  const before = await assess(p);
  assert.equal(before.day, sunday);
  assert.equal(before.avoidable, sundayDraft);
  assert.equal(before.disabled, false);
  assert.equal(before.dirty, true);
  assert.equal(before.access, true);
  assert.ok(before.issuance);
  return before.issuance;
}

async function crossMidnight(p, issuance) {
  const currentTime = await p.evaluate(() => LK_TIME.now());
  assert.ok(currentTime < midnight);
  await p.clock.fastForward(midnight - currentTime + 1250);
  const after = await assess(p);
  assert.equal(after.day, monday);
  assert.equal(after.issuance, issuance);
  assert.equal(after.access, true);
  assert.equal(after.dirty, true, 'a meaningful Sunday draft must still protect the tab from updating immediately after Brisbane midnight');
  assert.deepEqual(after.writes, []);
  assert.deepEqual(after.saved, [sundaySaved, mondaySaved]);
}

async function checkVersionedSave(p) {
  await p.evaluate(key => { __fake.quiet = true; __fake.denyReads = new RegExp(key + '$'); }, sundayKey);
  const before = await assess(p);
  await tap(p, save);
  await waitLabel(p, 'Try again');
  const denied = await assertDraft(p, sunday, sundayDraft, sundaySaved.change);
  assert.match(denied.message, /Could not check/);
  assert.deepEqual(denied.writes, []);
  assert.deepEqual(denied.reads, [...before.reads, sundayKey]);

  const second = { ...sundaySaved, avoidable: 'Second Sunday review', change: 'Keep the later soup plan', reviewAt: midnight + 2000 };
  const third = { ...sundaySaved, avoidable: 'Third Sunday review', change: 'Use Lee’s soup plan', reviewBy: 'Lee', reviewAt: midnight + 3000, by: 'lee' };
  await p.evaluate(({ sundayKey, second }) => { __fake.denyReads = null; __fake.write(sundayKey, second); }, { sundayKey, second });
  await p.clock.pauseAt(await p.evaluate(() => Date.now() + 1000));
  await dispatch(p, save);
  await p.clock.runFor(40);
  await waitLabel(p, 'Replace review');
  const conflict = await assertDraft(p, sunday, sundayDraft, second.change);
  assert.match(conflict.message, /Jo saved a review/);
  assert.equal(conflict.disabled, true);
  await dispatch(p, save);
  await p.clock.runFor(40);
  const duplicate = await assess(p);
  assert.deepEqual(duplicate.reads, conflict.reads);
  assert.deepEqual(duplicate.writes, []);
  await p.clock.runFor(500);
  await p.clock.resume();

  await p.evaluate(() => { __fake.liteCommitDelay = 1200; });
  await tap(p, save);
  await waitLabel(p, 'Saving...');
  const pending = await assess(p);
  assert.equal(pending.pending, 'true');
  assert.equal(pending.dirty, true);
  assert.deepEqual(pending.saved, [second, mondaySaved]);
  assert.deepEqual(pending.writes, []);
  await p.evaluate(({ sundayKey, third }) => __fake.write(sundayKey, third), { sundayKey, third });
  await waitLabel(p, 'Replace review');
  const changed = await assertDraft(p, sunday, sundayDraft, third.change);
  assert.match(changed.message, /Lee saved a review/);
  assert.deepEqual(changed.saved, [third, mondaySaved]);
  assert.deepEqual(changed.writes, []);

  await p.evaluate(key => { __fake.liteCommitDelay = 0; __fake.deny = new RegExp(key + '$'); }, sundayKey);
  await tap(p, save);
  await waitLabel(p, 'Try again');
  const refused = await assess(p);
  assert.equal(refused.avoidable, sundayDraft);
  assert.match(refused.message, /Could not save/);
  assert.deepEqual(refused.saved, [third, mondaySaved]);
  assert.deepEqual(refused.writes, [sundayKey]);

  await p.evaluate(() => { __fake.deny = null; __fake.liteCommitDelay = 1200; });
  await tap(p, save);
  await waitLabel(p, 'Replace review');
  await tap(p, save);
  await waitLabel(p, 'Saving...');
  await tap(p, back);
  assert.equal((await assertDraft(p, monday, mondayDraft, mondaySaved.change)).label, 'Save the review');
  await L.waitFor(p, key => __fake.dump()[key]?.by === 'sam', sundayKey);
  await L.waitFor(p, () => document.querySelector('.p-toast-msg')?.innerText === 'Review saved for 22 November 2026');
  const accepted = await assertDraft(p, monday, mondayDraft, mondaySaved.change);
  assert.equal(accepted.label, 'Save the review');
  assert.equal(accepted.receipt, 'Review saved for 22 November 2026');
  assert.deepEqual(accepted.writes, [sundayKey, sundayKey]);
  assert.equal(accepted.saved[0].avoidable, sundayDraft);
  assert.equal(accepted.saved[0].change, third.change);
  assert.equal(accepted.saved[0].reviewBy, 'Sam');
  assert.ok(accepted.saved[0].reviewAt >= midnight);
  assert.deepEqual(accepted.saved[1], mondaySaved);
  assert.equal(accepted.dirty, true);

  await p.evaluate(() => { __fake.liteCommitDelay = 0; });
  await tap(p, save);
  await waitLabel(p, 'Saved');
  const savedToday = await assess(p);
  assert.match(savedToday.receipt || '', /Review saved for today/i);
  assert.deepEqual(savedToday.writes, [sundayKey, sundayKey, mondayKey]);
  assert.equal(savedToday.saved[1].avoidable, mondayDraft);
  assert.equal(savedToday.saved[1].change, mondaySaved.change);
  assert.equal(savedToday.saved[1].by, 'sam');
  assert.deepEqual(savedToday.saved[0], accepted.saved[0]);
  assert.equal(savedToday.dirty, false);
  await p.locator(sheet).waitFor({ state: 'detached' });
  assert.match((await assess(p)).status, /Saved by Sam/);
  assert.equal(await p.locator(opener).getByText('Earlier draft inside').count(), 0);
}

async function checkStaleActivation(p) {
  const before = await assess(p);
  await p.clock.pauseAt(await p.evaluate(() => Date.now() + 1000));
  await dispatch(p, save);
  await waitLabel(p, 'Checking...');
  assert.deepEqual((await assess(p)).reads, [...before.reads, sundayKey]);
  await dispatch(p, back);
  await assertDraft(p, monday, mondayDraft, mondaySaved.change);
  await dispatch(p, resume);
  await assertDraft(p, sunday, sundayDraft, sundaySaved.change);
  await p.clock.runFor(80);
  await p.clock.resume();
  await L.waitFor(p, () => document.querySelector('.w-sheet [data-p="wreview"]')?.getAttribute('aria-busy') === 'false');
  const stale = await assertDraft(p, sunday, sundayDraft, sundaySaved.change);
  assert.deepEqual(stale.reads, [...before.reads, sundayKey]);
  assert.deepEqual(stale.writes, [], 'a preflight from an earlier activation cannot stage a write after switching away and back');
  assert.deepEqual(stale.saved, [sundaySaved, mondaySaved]);
  assert.equal(stale.dirty, true);
}

async function checkClosed(browser) {
  const p = await L.open(browser, '#/waste', fixture(false));
  try {
    const issuance = await beforeMidnight(p);
    await p.locator(close).tap();
    await p.locator(sheet).waitFor({ state: 'detached' });
    await crossMidnight(p, issuance);
    await tap(p, log);
    await p.locator('.w-sheet #w-text').waitFor();
    await waitMonday(p);
    await p.keyboard.press('Escape');
    await p.locator('.w-sheet').waitFor({ state: 'detached' });
    assert.match((await assess(p)).status, /Earlier draft inside/);
    assert.equal(await p.locator(opener).count(), 1);
    assert.equal(await p.locator('[data-p="w-rv-resume"]').count(), 0);
    const earlierReads = (await assess(p)).reads;
    await tap(p, opener);
    assert.equal((await assertDraft(p, monday, mondaySaved.avoidable, mondaySaved.change)).disabled, true);
    assert.equal(await p.locator(resume).innerText(), 'Resume draft for 22 November 2026');
    await p.fill('#w-ra', mondayDraft);
    await tap(p, resume);
    const earlier = await assertDraft(p, sunday, sundayDraft, sundaySaved.change);
    assert.match(await p.locator(back).innerText(), /Back to today’s review/);
    assert.equal(earlier.logDate, '23 November 2026');
    assert.match(earlier.status, /Saved by Lee/);
    assert.deepEqual(earlier.lines, [mondayLine]);
    assert.deepEqual(earlier.reads, earlierReads, 'opening and switching use the day already shown and the retained base');
    assert.match(await p.locator(sheet).innerText(), /22 November 2026/);
    assert.match(await p.locator(sheet).innerText(), /Last saved by Jo/);
    await checkStaleActivation(p);
    await checkVersionedSave(p);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.context().close();
  }
}

async function checkOpen(browser) {
  const p = await L.open(browser, '#/waste', fixture(true));
  try {
    const issuance = await beforeMidnight(p);
    await crossMidnight(p, issuance);
    await assertDraft(p, sunday, sundayDraft, sundaySaved.change);
    await p.locator(save).click();
    await waitLabel(p, 'Saved');
    const saved = await assess(p);
    assert.match(saved.receipt || '', /Review saved for 22 November 2026/);
    assert.deepEqual(saved.writes, [sundayKey]);
    assert.equal(saved.saved[0].by, 'head');
    assert.equal(saved.saved[0].reviewBy, 'Head chef');
    assert.equal(saved.saved[0].avoidable, sundayDraft);
    assert.equal(saved.saved[0].change, sundaySaved.change);
    assert.deepEqual(saved.saved[1], mondaySaved);
    await p.locator(sheet).waitFor({ state: 'detached' });
    await waitMonday(p);
    assert.doesNotMatch((await assess(p)).status, /Earlier draft inside/);

    await p.locator(opener).click();
    await formDate(p, monday);
    await p.fill('#w-ra', mondayDraft);
    await p.keyboard.press('Escape');
    await L.waitFor(p, () => document.activeElement?.getAttribute('data-p') === 'w-rv');
    await p.evaluate(() => { location.hash = '#/admin'; });
    await L.adminTab(p, 'waste');
    await p.locator('[data-p="wh-view"][data-v="reviews"]').click();
    await p.locator('[data-p="rv-day"][data-d="-1"]').click();
    assert.equal(await p.inputValue('[data-k="wh-review-date"]'), sunday);
    assert.equal(await p.inputValue('#w-ra'), sundayDraft);
    await p.fill('#w-ra', adminDraft);
    await p.evaluate(() => { location.hash = '#/waste'; });
    await p.locator(opener).click();
    await assertDraft(p, monday, mondayDraft, mondaySaved.change);
    await p.keyboard.press('Escape');
    await p.locator(sheet).waitFor({ state: 'detached' });
    await p.evaluate(() => { location.hash = '#/admin'; });
    await L.waitFor(p, draft => document.querySelector('.a-rvform #w-ra')?.value === draft, adminDraft);
    assert.equal(await p.inputValue('[data-k="wh-review-date"]'), sunday);
    assert.deepEqual((await assess(p)).writes, [sundayKey]);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.context().close();
  }
}

async function checkWhitespace(browser) {
  const p = await L.open(browser, '#/waste', fixture(false));
  try {
    await L.wReview(p);
    await formDate(p, sunday);
    await p.fill('#w-ra', `  ${sundaySaved.avoidable}\n`);
    assert.equal((await assess(p)).disabled, true);
    assert.equal((await assess(p)).dirty, false);
    const currentTime = await p.evaluate(() => LK_TIME.now());
    await p.clock.fastForward(midnight - currentTime + 1250);
    await tap(p, close);
    await tap(p, opener);
    await assertDraft(p, monday, mondaySaved.avoidable, mondaySaved.change);
    assert.equal(await p.locator(resume).count(), 0);
    const today = await assess(p);
    assert.doesNotMatch(today.status, /Earlier draft inside/);
    assert.equal(today.dirty, false);
    assert.deepEqual(today.writes, []);
    assert.deepEqual(p.errors, []);
  } finally {
    await p.context().close();
  }
}

(async () => {
  const browser = await L.start();
  try {
    await checkClosed(browser);
    console.log('PASS same-session Brisbane midnight, dated review routing, stale preflight, conflict, refusal and separate acknowledgements');
    await checkOpen(browser);
    console.log('PASS open Sunday sheet past midnight, dated head-chef acknowledgement, focus return and independent Admin draft');
    await checkWhitespace(browser);
    console.log('PASS a whitespace-only edit never becomes an earlier draft');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
