// The owner controls rollout; switching it off keeps ordinary prep and unfinished catalogue work intact.
// All records and people are synthetic. The browser uses the Firebase stand-in only.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const CFG = key('config', 'main'), ITEM = key('prepStandards', 'onions');
const day = L.ymd(new Date(L.NOW));
const sectionInit = { content: 'localStorage.setItem("lk.sec.bo", ' + JSON.stringify(JSON.stringify({ d: day, sec: 'larder', name: 'Larder' })) + ');' };
function fixture(enabled) {
  const config = {
    people: [
      { id: 'ann', name: 'Ann', role: 'head', active: true, add: true, tick: true, del: true },
      { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
      { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true, del: false }
    ],
    headId: 'ann', sousIds: ['ann', 'sam'], staffIds: ['ann', 'sam', 'bo'],
    fnIds: [], fnOnlyIds: [], addIds: ['ann', 'sam', 'bo'], tickIds: ['ann', 'sam', 'bo'], delIds: ['ann', 'sam'],
    kitSecs: [{ id: 'larder', name: 'Larder', off: false }], showBadges: true
  };
  if (enabled !== undefined) config.prepStandardsEnabled = enabled;
  return { [CFG]: config, [ITEM]: { sectionId: 'larder', name: 'Slice onions', aliases: ['onions'], minimum: 4, unit: 'tubs',
    instruction: '[Synthetic saved instruction]', recipe: '', archived: false, v: 1, at: L.NOW - 60000, by: 'ann' } };
}
const reads = p => p.evaluate(() => __fake.reads.filter(path => /\/prepStandards(?:\/|$)/.test(path)).length);
const saved = p => p.evaluate(key => __fake.dump()[key], CFG);
const switchWrites = p => p.evaluate(key => __fake.writes.flat().filter(op => op.path === key && Object.hasOwn(op.data || {}, 'prepStandardsEnabled') && Object.keys(op.data).every(k => ['prepStandardsEnabled', 'by'].includes(k))), CFG);
async function liveSwitch(p, on) {
  await p.evaluate(([key, on]) => { const c = __fake.dump()[key]; __fake.write(key, Object.assign({}, c, { prepStandardsEnabled: on })); }, [CFG, on]);
  await L.waitFor(p, on => LK_PREP.state.config.prepStandardsEnabled === on, on);
  await L.settle(p, 150);
}
async function room(p, admin) {
  if (admin) await L.adminTab(p, 'prep-standards');
  else await p.locator('[data-p="c-group"][data-g="prep"]').click();
  await L.waitFor(p, () => !!document.querySelector('[data-ps="edit"][data-id="onions"]'), null, 8000);
}
async function enter(p) {
  await L.pLog(p);
  await p.fill('#p-section', 'Larder');
  await p.fill('#p-text', 'onions');
  await p.fill('#p-qty', '2 half tubs');
}
async function journey(browser, label, route, options, run) {
  let p;
  try {
    p = await L.open(browser, route, Object.assign({ who: 'bo', extra: fixture(), init: sectionInit, wait: 1000 }, options));
    await run(p);
    ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | '));
  } catch (error) { ok(false, label + ': ' + String(error.message || error).split('\n')[0]); }
  finally { if (p) await p.context().close(); }
}

(async () => {
  const browser = await L.start();
  await journey(browser, 'default off', '#/prep', {}, async p => {
    ok(!(await p.locator('.ps-viewbar').count()), 'an absent rollout setting adds no Work / Before service row');
    await enter(p);
    ok(!(await p.locator('#ps-hint').innerText()).trim(), 'ordinary prep entry has no minimum guidance before rollout');
    ok(await reads(p) === 0 && !p.urls.some(url => /\/prep-standards\.js/.test(url)), 'default off loads no standards module or catalogue records for staff');
    const values = await p.evaluate(() => ({ text: document.querySelector('#p-text').value, qty: document.querySelector('#p-qty').value, storedText: LK_PREP.state.text, storedQty: LK_PREP.state.qty, button: !document.querySelector('.nb-addbtn').disabled }));
    ok(values.text === 'onions' && values.qty === '2 half tubs' && values.button, 'ordinary free-text prep and its combined amount remain usable while standards are off (' + JSON.stringify(values) + ')');
  });

  await journey(browser, 'live staff rollout', '#/prep', { extra: fixture(false) }, async p => {
    await enter(p);
    await liveSwitch(p, true);
    await L.waitFor(p, () => /Minimum ready before service/.test((document.querySelector('#ps-hint') || {}).textContent || ''), null, 8000);
    ok(/4 tubs/.test(await p.locator('#ps-hint').innerText()) && await p.locator('.ps-viewbar').count() === 1,
      'enabling reaches an already open staff Add sheet through the existing config listener');
    ok(await p.inputValue('#p-text') === 'onions' && await p.inputValue('#p-qty') === '2 half tubs', 'enabling never rewrites the current name or amount');
    await liveSwitch(p, false);
    const afterOff = await reads(p);
    ok(!(await p.locator('.ps-viewbar').count()) && !(await p.locator('#ps-hint').innerText()).trim(), 'disabling removes the service switch and current matching hint immediately');
    ok(await p.inputValue('#p-text') === 'onions' && await p.inputValue('#p-qty') === '2 half tubs' && await p.locator('.p-sheet').isVisible(),
      'disabling leaves the staff Add sheet and its original draft open');
    await p.fill('#p-text', 'onions for service');
    await p.fill('#p-section', 'Larder');
    await L.settle(p, 150);
    ok(await reads(p) === afterOff, 'typing after disabling makes no standards query');
    await p.evaluate(key => __fake.write(key, Object.assign({}, __fake.dump()[key], { minimum: 9, v: 2 })), ITEM);
    await p.locator('[data-p="p-log-close"]').first().click();
    await liveSwitch(p, true);
    await p.locator('[data-p="ps-view"][data-v="reference"]').click();
    await L.waitFor(p, () => !!document.querySelector('.ps-reference'), null, 8000);
    ok(/Slice onions/.test(await p.locator('.ps-reference').innerText()) && /9 tubs/.test(await p.locator('.ps-reference').innerText()) && await reads(p) > afterOff,
      're-enabling reloads current standards rather than using the minimum cached before rollout was paused');
    await liveSwitch(p, false);
    ok(!(await p.locator('.ps-reference, .ps-viewbar').count()) && await p.locator('.nb-addline').isVisible(), 'disabling while checking a section returns to ordinary work');
    await liveSwitch(p, true);
    ok(await p.locator('[data-p="ps-view"][data-v="work"]').getAttribute('aria-pressed') === 'true', 're-enabling starts on Work instead of reopening the previous reference');
  });

  await journey(browser, 'owner rollout acknowledgement', '#/admin', { admin: true, who: 'ann' }, async p => {
    await room(p, true);
    ok(await p.locator('#ps-rollout').count() === 1 && !(await p.locator('#ps-rollout').isChecked()), 'the verified admin sees the unchecked rollout switch beside the catalogue');
    const before = await saved(p);
    await p.evaluate(() => { __fake.mode = 'hold'; });
    await p.locator('#ps-rollout').check();
    await L.waitFor(p, () => LK_PREP.unsent() && document.querySelector('#ps-rollout').disabled);
    ok(/saving|waiting|not sent/i.test(await p.locator('#ps-rollout-status').innerText()),
      'the switch waits for acknowledgement and does not report rollout saved early');
    await p.evaluate(() => { const e = document.querySelector('#ps-rollout'); e.dispatchEvent(new Event('change', { bubbles: true })); });
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
    await L.waitFor(p, key => __fake.dump()[key].prepStandardsEnabled === true && !LK_PREP.unsent(), CFG, 8000);
    ok((await switchWrites(p)).length === 1 && await p.locator('#ps-rollout').isChecked() && /on|available|enabled/i.test(await p.locator('#ps-rollout-status').innerText()),
      'one acknowledged owner write enables rollout, even after a repeated pending change event');
    const after = await saved(p);
    ok(JSON.stringify(after.people) === JSON.stringify(before.people) && JSON.stringify(after.kitSecs) === JSON.stringify(before.kitSecs) && after.by === 'ann',
      'the rollout write merges only its setting and current recorder, keeping kitchen configuration intact');
    await p.evaluate(() => { __fake.mode = 'deny'; });
    await p.locator('#ps-rollout').click();
    await L.waitFor(p, () => !document.querySelector('#ps-rollout').disabled && /not saved|could not|cannot|refused/i.test(document.querySelector('#ps-rollout-status').textContent), null, 8000);
    ok((await saved(p)).prepStandardsEnabled === true && await p.locator('#ps-rollout').isChecked(), 'a refused disable keeps rollout on and restores the saved checkbox value');
    await p.evaluate(() => { __fake.mode = 'ok'; });
    await p.locator('#ps-rollout').uncheck();
    await L.waitFor(p, key => __fake.dump()[key].prepStandardsEnabled === false && !LK_PREP.unsent(), CFG);
    ok(await p.locator('[data-ps="edit"][data-id="onions"]').count() === 1, 'a successful disable keeps the management catalogue available');
  });

  await journey(browser, 'rollout preserves manager work', '#/admin', { admin: true, who: 'ann', extra: fixture(true) }, async p => {
    await room(p, true);
    await p.locator('[data-ps="edit"][data-id="onions"]').click();
    await p.fill('[data-ps-field="instruction"]', '[Synthetic unfinished instruction]');
    await p.locator('#ps-rollout').uncheck();
    await L.waitFor(p, key => __fake.dump()[key].prepStandardsEnabled === false && !LK_PREP.unsent(), CFG);
    ok(await p.inputValue('[data-ps-field="instruction"]') === '[Synthetic unfinished instruction]' && await p.evaluate(() => LK_PREP_STANDARDS.unsaved()),
      'turning rollout off retains the manager’s separate unsaved catalogue draft');
    ok(await p.evaluate(key => __fake.dump()[key].instruction, ITEM) === '[Synthetic saved instruction]', 'the rollout switch does not save or replace the catalogue edit');
  });

  await journey(browser, 'ordinary config save preserves rollout', '#/admin', { admin: true, who: 'ann', extra: fixture(true) }, async p => {
    await L.kitchenRow(p, 'badges');
    await p.locator('[data-a="badges"]').uncheck();
    await p.locator('[data-p="a-save"]').click();
    await L.waitFor(p, key => __fake.dump()[key].showBadges === false && !LK_PREP.unsent(), CFG, 8000);
    ok((await saved(p)).prepStandardsEnabled === true, 'an ordinary full admin config save retains the current rollout flag');
  });

  for (const who of ['ann', 'sam']) await journey(browser, who + ' PIN catalogue access', '#/chef', { who }, async p => {
    await room(p, false);
    ok(!(await p.locator('#ps-rollout').count()) && /Slice onions/.test(await p.locator('.ps-manager').innerText()),
      who + ': PIN chef can prepare or read standards while rollout is off, without an admin switch');
    const before = (await switchWrites(p)).length;
    await p.evaluate(() => { const e = document.createElement('input'); e.type = 'checkbox'; e.id = 'ps-rollout'; e.setAttribute('data-p', 'ps-rollout'); e.setAttribute('data-k', 'ps-rollout'); e.checked = true; document.querySelector('.ps-manager').append(e); e.dispatchEvent(new Event('change', { bubbles: true })); });
    await L.settle(p, 150);
    ok((await switchWrites(p)).length === before && (await saved(p)).prepStandardsEnabled !== true, who + ': a forged rollout control cannot gain owner authority');
  });
  await browser.close(); L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
