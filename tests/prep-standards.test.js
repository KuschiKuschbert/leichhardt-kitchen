// Head-owned section standards: normal prep typing, complete Before service reference and one management room.
// Every person, quantity and instruction here is a synthetic fixture. These checks never contact live Firestore.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const CFG = key('config', 'main'), day = L.ymd(new Date(L.NOW));
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: 'ann', name: 'Ann', role: 'head', active: true, add: true, tick: true, del: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true, del: false }
];
const sections = [{ id: 'larder', name: 'Larder', off: false }, { id: 'grill', name: 'Grill', off: false }];
function standard(sectionId, name, aliases, minimum, unit, patch) {
  return Object.assign({ sectionId, name, aliases, minimum, unit, instruction: 'Synthetic head-chef instruction.', recipe: '', archived: false, v: 1, at: L.NOW - 60000, by: 'ann' }, patch || {});
}
function fixture(patch) {
  return Object.assign({
    [CFG]: { people: JSON.parse(JSON.stringify(people)), headId: 'ann', sousIds: ['sam', 'ann'], staffIds: ['sam', 'ann', 'bo'], fnIds: [], fnOnlyIds: [], addIds: ['sam', 'ann', 'bo'], tickIds: ['sam', 'ann', 'bo'], delIds: ['sam', 'ann'], kitSecs: sections, showBadges: true, prepStandardsEnabled: true },
    [key('prepStandards', 'onions')]: standard('larder', 'Slice onions', ['onions', 'sliced onions'], 4, 'tubs'),
    [key('prepStandards', 'slaw')]: standard('larder', 'Slaw', ['coleslaw'], 2, 'tubs'),
    [key('prepStandards', 'herb')]: standard('larder', 'Herb sauce', ['sauce'], 1, 'L'),
    [key('prepStandards', 'tomato')]: standard('larder', 'Tomato sauce', ['sauce'], 2, 'L'),
    [key('prepStandards', 'lemons')]: standard('larder', 'Lemon wedges', ['lemons'], 0, 'trays'),
    [key('prepStandards', 'salt')]: standard('larder', 'Seasoning salt', ['salt'], null, 'kg'),
    [key('prepStandards', 'archived')]: standard('larder', 'Archived relish', ['relish'], 3, 'tubs', { archived: true }),
    [key('prepStandards', 'grill-onions')]: standard('grill', 'Grilled onions', ['onions'], 2, 'tubs'),
    [key('days', day, 'items', 'slaw-done')]: { text: 'Slaw', station: 'Larder', qty: '1 tub', recipe: '', done: true, deleted: false, addedBy: 'Ann', addedById: 'ann', addedAt: L.NOW - 120000, doneBy: 'Bo', doneById: 'bo', doneAt: L.NOW - 60000 }
  }, patch || {});
}
function catalogue(activeCount, archivedCount) {
  const extra = fixture();
  for (let i = 0; i < activeCount; i++) extra[key('prepStandards', 'extra-' + String(i).padStart(4, '0'))] = standard('larder', 'Synthetic extra ' + i, [], 1, 'tub');
  for (let i = 0; i < (archivedCount || 0); i++) extra[key('prepStandards', 'old-' + String(i).padStart(4, '0'))] = standard('larder', 'Synthetic archived ' + i, [], 1, 'tub', { archived: true });
  return extra;
}
const sectionInit = { content: 'localStorage.setItem("lk.sec.bo", ' + JSON.stringify(JSON.stringify({ d: day, sec: 'larder', name: 'Larder' })) + ');' };
const countReads = p => p.evaluate(() => (__fake.reads || []).filter(x => /\/prepStandards(?:\/|$)/.test(x)).length);
const dump = p => p.evaluate(() => __fake.dump());
const hint = p => p.locator('#ps-hint').textContent();
const field = name => '[data-ps-field="' + name + '"]';
const action = (name, id) => '[data-ps="' + name + '"]' + (id ? '[data-id="' + id + '"]' : '');
async function room(p, admin) {
  if (admin) await L.adminTab(p, 'prep-standards');
  else await p.click('[data-p="c-group"][data-g="prep"]');
  await L.waitFor(p, () => !!document.querySelector('[data-ps-field="section"]'), null, 8000);
  await L.settle(p, 250);
}
async function reference(p) {
  await p.click('[data-p="ps-view"][data-v="reference"]');
  await L.waitFor(p, () => !!document.querySelector('[data-ps-field="reference-section"]'), null, 8000);
  await L.settle(p, 250);
}
async function openAdd(p, text) {
  await L.pLog(p);
  await p.fill('#p-section', 'Larder');
  await p.fill('#p-text', text || 'onions');
  await L.waitFor(p, () => /Minimum|standard|Choose|matching/i.test((document.querySelector('#ps-hint') || {}).textContent || ''), null, 8000);
  await L.settle(p, 200);
}
async function archiveConfirmation(p) {
  await room(p); await p.locator(action('edit', 'onions')).click();
  await p.locator(action('archive')).click();
  ok(!(await dump(p))[key('prepStandards', 'onions')].archived, 'the first item’s archive confirmation makes no write');
  await p.locator(action('edit', 'slaw')).click();
  ok((await p.locator(action('archive')).innerText()) === 'Archive standard', 'another item cannot inherit an earlier archive confirmation');
  await p.locator(action('archive')).click(); await L.settle(p, 300);
  ok(!(await dump(p))[key('prepStandards', 'slaw')].archived, 'the first archive tap on the second item still requires its own confirmation');
}
async function visit(browser, label, options, fn) {
  let p;
  try {
    const o = Object.assign({ who: 'bo', extra: fixture(), init: sectionInit, width: 390, height: 844, wait: 1400 }, options || {});
    p = await L.open(browser, o.hash || '#/prep', o);
    await fn(p);
    ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | '));
  } catch (error) { ok(false, label + ': ' + String(error.message || error).split('\n')[0]); }
  finally { if (p) await p.context().close(); }
}

(async () => {
  const browser = await L.start();
  for (const width of [390, 768, 1280]) {
    await visit(browser, 'typing at ' + width, { width, height: width === 390 ? 844 : 900 }, async p => {
      ok(await countReads(p) === 0, width + ': opening ordinary Work does not read standards');
      await openAdd(p);
      await L.waitFor(p, () => /4 tubs/.test((document.querySelector('#ps-hint') || {}).textContent || ''));
      ok(/Slice onions/.test(await hint(p)) && /Minimum.*before service/i.test(await hint(p)), width + ': an approved full alias identifies the canonical item and minimum');
      ok(await p.inputValue('#p-qty') === '', width + ': the minimum never fills the amount to make');
      const before = await countReads(p);
      await p.fill('#p-qty', '1.5 kg');
      for (const value of ['on', 'onions', 'sauce', 'unlisted task', 'onions']) await p.fill('#p-text', value);
      await L.settle(p, 250);
      ok(await countReads(p) === before, width + ': typing and matching use the loaded section without another read');
      ok(await p.inputValue('#p-qty') === '1.5 kg', width + ': text edits preserve the exact combined quantity and unit');
      ok(!(await L.overflow(p)), width + ': Add and its minimum fit without sideways scroll');
      await p.keyboard.press('Escape');
      await reference(p);
      await L.waitFor(p, () => !!document.querySelector('[data-ps="add"][data-id="lemons"]'));
      ok(!(await L.overflow(p)), width + ': the complete reference fits without sideways scroll');
      const small = await p.locator('[data-ps]:visible, [data-p="ps-view"]:visible').evaluateAll(es => es.filter(e => !e.disabled).filter(e => { const r = e.getBoundingClientRect(); return r.width < 43.9 || r.height < 43.9; }).map(e => e.textContent.trim()));
      ok(!small.length, width + ': new reference actions have 44 px targets (' + small.join(', ') + ')');
    });
  }

  await visit(browser, 'matching choices and sections', {}, async p => {
    await openAdd(p, 'onions');
    await L.waitFor(p, () => /4 tubs/.test((document.querySelector('#ps-hint') || {}).textContent || ''));
    await p.fill('#p-qty', '2 kg'); await p.fill('#p-text', 'sauce');
    await L.waitFor(p, () => document.querySelectorAll('#ps-hint [data-ps="choose"]').length === 2);
    ok(!/Minimum.*(?:1 L|2 L)/i.test(await hint(p)), 'ambiguous aliases offer both items without assigning a minimum');
    await p.locator('#ps-hint ' + action('choose', 'herb')).click();
    ok(await p.inputValue('#p-text') === 'Herb sauce' && await p.inputValue('#p-qty') === '2 kg', 'explicit choice fills the canonical name and preserves the entered amount/unit');
    await p.fill('#p-text', 'on');
    ok(await p.locator('#ps-hint ' + action('choose')).count() > 0 && !/Minimum.*4 tubs/i.test(await hint(p)), 'a partial name asks for a choice rather than assigning the first minimum');
    await p.fill('#p-text', 'oninos');
    ok(await p.locator('#ps-hint ' + action('choose', 'onions')).count() === 1 && !await p.locator('#ps-hint [data-ps-match]').count(), 'a likely typing error offers an explicit choice without guessing its minimum');
    await p.fill('#p-text', 'onions'); await p.fill('#p-section', 'Grill');
    await L.waitFor(p, () => /Grilled onions/.test((document.querySelector('#ps-hint') || {}).textContent || ''));
    ok(/2 tubs/.test(await hint(p)) && !/4 tubs/.test(await hint(p)) && await p.inputValue('#p-qty') === '2 kg', 'changing sections replaces the hint and preserves the entered quantity');
    await p.fill('#p-section', 'Unconfigured section');
    ok(!/2 tubs|4 tubs/.test(await hint(p)), 'a free-text section without a configured ID cannot retain the previous standard');
    await p.fill('#p-section', 'Larder'); await p.fill('#p-text', 'Clean bench');
    ok(/No.*(?:match|standard)|not.*(?:match|standard)|ordinary prep/i.test(await hint(p)), 'unlisted prep remains an explicit ordinary free-text line');
  });

  await visit(browser, 'complete reference and blank amount', {}, async p => {
    await reference(p); await L.waitFor(p, () => !!document.querySelector('[data-ps="add"][data-id="salt"]'));
    const content = await p.locator('#prep-root').textContent();
    ok(/Slaw/.test(content) && /Lemon wedges/.test(content) && /Seasoning salt/.test(content), 'reference includes ticked and absent items');
    ok(/Already on today’s prep/.test(content), 'reference identifies existing open work before staff add another request');
    ok(!/Archived relish/.test(content), 'archived standards are omitted from the active staff reference');
    ok(/0 trays/.test(content) && /To come/.test(content), 'explicit zero and an unset minimum remain distinct');
    await p.locator(action('add', 'lemons')).click();
    await L.waitFor(p, () => !!document.querySelector('#p-text'));
    ok(await p.inputValue('#p-text') === 'Lemon wedges' && await p.inputValue('#p-qty') === '' && await p.inputValue('#p-section') === 'Larder', 'Add from reference sets item/section and leaves amount blank');
    await p.fill('#p-qty', '1 tray'); await p.keyboard.press('Escape'); await reference(p);
    await p.locator(action('add', 'salt')).click(); await L.settle(p, 150);
    ok(await p.evaluate(() => LK_PREP.state.text === 'Lemon wedges' && LK_PREP.state.qty === '1 tray'), 'adding another reference item cannot discard an unfinished prep request');
  });

  await visit(browser, 'unavailable standards', { failReads: '/prepStandards$' }, async p => {
    await openAdd(p, 'onions');
    await L.waitFor(p, () => /unavailable|Could not|could not|failed/i.test((document.querySelector('#ps-hint') || {}).textContent || ''));
    ok(!/4 tubs|No standards|No items|Nothing here/.test(await hint(p)), 'failed first read is not an empty catalogue or a guessed minimum');
    await p.fill('#p-qty', '2 tubs');
    ok(await p.inputValue('#p-text') === 'onions' && await p.inputValue('#p-qty') === '2 tubs', 'ordinary prep entry remains usable when standards cannot load');
  });

  await visit(browser, 'failed refresh retains labelled copy', {}, async p => {
    await reference(p); await L.waitFor(p, () => !!document.querySelector('[data-ps="add"][data-id="onions"]'));
    await p.evaluate(() => { __fake.failReads = /\/prepStandards$/; });
    await p.locator('.ps-reference ' + action('refresh')).click();
    await L.waitFor(p, () => /last complete copy/i.test((document.querySelector('.ps-reference') || {}).textContent || ''));
    const content = await p.locator('.ps-reference').textContent();
    ok(/Slice onions/.test(content) && /unavailable/i.test(content) && /out of date/i.test(content), 'a refresh failure retains the last complete list with an explicit stale warning');
    ok(await p.locator(action('add', 'onions')).isDisabled(), 'a failed refresh cannot pass stale guidance into a new request');
  });

  const paged = catalogue(101, 205);
  await visit(browser, 'complete active pagination', { extra: paged }, async p => {
    await openAdd(p, 'onions');
    await L.waitFor(p, () => !!document.querySelector('#ps-hint [data-ps-match="onions"]'), null, 8000);
    ok(/4 tubs/.test(await hint(p)) && await countReads(p) === 2, 'a later-page standard matches after two active pages, without querying archived history');
    await p.keyboard.press('Escape'); await reference(p);
    ok(/107 items to check/.test(await p.locator('.ps-reference').textContent()), 'Before service counts every active standard across the loaded pages');
    await p.fill('#lv-q-ps-reference-larder', 'Synthetic extra 100');
    ok(await p.locator('[data-ps-standard="extra-0100"]').count() === 1 && await countReads(p) === 2, 'reference search reaches a later-page item without another query');
    ok(!/Synthetic archived/.test(await p.locator('.ps-reference').textContent()), 'archived history never enters the active reference');
  });

  await visit(browser, 'later active page unavailable', { extra: paged }, async p => {
    await p.evaluate(() => { __fake.failReads = { test: path => /\/prepStandards$/.test(path) && __fake.reads.filter(x => /\/prepStandards$/.test(x)).length > 1 }; });
    await openAdd(p, 'Synthetic extra 0');
    await L.waitFor(p, () => /unavailable/i.test((document.querySelector('#ps-hint') || {}).textContent || ''), null, 8000);
    ok(!await p.locator('#ps-hint [data-ps-match]').count(), 'failure on a later page cannot turn a first-page item into authoritative guidance');
    await p.keyboard.press('Escape'); await reference(p);
    ok(!await p.locator(action('add')).count() && !/No active standards/.test(await p.locator('.ps-reference').textContent()), 'a partial first load is neither a complete reference nor an empty section');
  });

  await visit(browser, 'management loads additional pages', { hash: '#/chef', who: 'ann', extra: paged }, async p => {
    await room(p); await L.waitFor(p, () => !!document.querySelector('[data-ps="more"]'), null, 8000);
    ok(await countReads(p) === 1 && /100 standards loaded.*More are available/s.test(await p.locator('.ps-manager').textContent()), 'management opens one bounded page and labels the remaining catalogue');
    ok(await p.locator(action('new')).isEnabled(), 'a full first page does not prevent the head chef adding a standard');
    await p.fill('#lv-q-ps-manage-larder', 'Synthetic extra 100');
    ok(!await p.locator(action('edit', 'extra-0100')).count(), 'management search does not claim an unloaded later item');
    await p.locator(action('more')).click();
    await L.waitFor(p, () => !!document.querySelector('[data-ps="edit"][data-id="extra-0100"]'), null, 8000);
    ok(await countReads(p) === 2 && await p.inputValue('#lv-q-ps-manage-larder') === 'Synthetic extra 100', 'Load next 100 keeps the search and exposes the requested later item');
    await p.locator(action('edit', 'extra-0100')).click(); await p.fill(field('instruction'), 'Synthetic instruction on another page');
    await p.locator(action('save')).click();
    await L.waitFor(p, k => (__fake.dump()[k] || {}).v === 2, key('prepStandards', 'extra-0100'));
    ok((await dump(p))[key('prepStandards', 'extra-0100')].instruction === 'Synthetic instruction on another page', 'an item loaded on a later management page remains editable');
  });

  const oversized = catalogue(1001);
  await visit(browser, 'active guidance overflow', { extra: oversized }, async p => {
    await openAdd(p, 'onions');
    await L.waitFor(p, () => /more than 1,?000|complete list could not/i.test((document.querySelector('#ps-hint') || {}).textContent || ''), null, 8000);
    ok(!await p.locator('#ps-hint [data-ps-match]').count(), 'a bounded incomplete catalogue cannot supply an authoritative match');
    await p.keyboard.press('Escape'); await reference(p);
    ok(!await p.locator(action('add')).count() && /1,?000/.test(await p.locator('.ps-reference').textContent()), 'overflow is visible and never presented as a complete empty section');
  });
  await visit(browser, 'overflow section stays manageable', { hash: '#/chef', who: 'ann', extra: oversized }, async p => {
    await room(p); await L.waitFor(p, () => !!document.querySelector('[data-ps="more"]'), null, 8000);
    ok(await p.locator(action('new')).isEnabled() && await countReads(p) === 1, 'the staff guidance ceiling leaves the bounded management catalogue usable');
    await p.fill('#lv-q-ps-manage-larder', 'Synthetic extra 0'); await p.locator(action('edit', 'extra-0000')).click();
    await p.fill(field('instruction'), 'Synthetic correction in large catalogue');
    ok(await p.locator(action('save')).isEnabled(), 'the head chef can correct loaded standards even when the whole section exceeds the staff guidance ceiling');
  });

  for (const width of [390, 768, 1280]) {
    await visit(browser, 'head Prep room at ' + width, { hash: '#/chef', who: 'ann', width, height: width === 390 ? 844 : 900 }, async p => {
      await room(p); await L.waitFor(p, () => !!document.querySelector('[data-ps="edit"][data-id="onions"]'));
      ok(await p.locator('.ad-layout .a-group[data-g="prep"][aria-current="page"]').count() === 1 && await p.locator('.a-group').count() === 5, width + ': standards have a separate fifth management room');
      ok(!await p.locator('.pnav [aria-current="page"], .tabbar [aria-current="page"]').count(), width + ': the management room does not select the service Prep tab');
      await p.locator(action('edit', 'onions')).click();
      ok(await p.locator(action('save')).isDisabled(), width + ': unchanged standards cannot be saved');
      ok(!(await L.overflow(p)), width + ': catalogue and editor fit without sideways scroll');
    });
  }

  await visit(browser, 'archive confirmation belongs to its item', { hash: '#/chef', who: 'ann' }, archiveConfirmation);

  await visit(browser, 'head standard saves', { hash: '#/chef', who: 'ann' }, async p => {
    await room(p); await p.locator(action('new')).click();
    await p.fill(field('name'), 'Synthetic citrus dressing'); await p.fill(field('minimum'), '3'); await p.fill(field('unit'), 'large tubs');
    await p.fill(field('aliases'), 'citrus dressing\ncitrus mix'); await p.fill(field('instruction'), 'Synthetic head-chef check instruction.');
    await p.locator(action('save')).click();
    await L.waitFor(p, () => Object.entries(__fake.dump()).some(([k, x]) => /\/prepStandards\/[^/]+$/.test(k) && x.name === 'Synthetic citrus dressing'));
    let pair = Object.entries(await dump(p)).find(([k, x]) => /\/prepStandards\/[^/]+$/.test(k) && x.name === 'Synthetic citrus dressing');
    ok(pair && pair[1].minimum === 3 && pair[1].unit === 'large tubs' && pair[1].aliases.join('|') === 'citrus dressing|citrus mix' && pair[1].sectionId === 'larder' && pair[1].v === 1 && pair[1].by === 'ann', 'a new standard saves the confirmed quantity, unit, aliases, section and canonical author');
    await L.settle(p, 1400);
    const id = pair[0].split('/').pop();
    await p.locator(action('edit', id)).click(); await p.fill(field('minimum'), '0'); await p.locator(action('save')).click();
    await L.waitFor(p, k => (__fake.dump()[k] || {}).v === 2, pair[0]);
    ok((await dump(p))[pair[0]].minimum === 0, 'saving zero keeps an explicit minimum');
    await L.settle(p, 1400); await p.fill(field('minimum'), ''); await p.locator(action('save')).click();
    await L.waitFor(p, k => (__fake.dump()[k] || {}).v === 3, pair[0]);
    ok((await dump(p))[pair[0]].minimum === null, 'clearing a minimum stores null rather than zero');
    await L.settle(p, 1400); await p.locator(action('archive')).click(); await L.settle(p, 100);
    ok(!(await dump(p))[pair[0]].archived, 'the first archive tap does not remove a standard');
    await p.locator(action('archive')).click(); await L.waitFor(p, k => !!(__fake.dump()[k] || {}).archived, pair[0]);
    ok((await dump(p))[pair[0]].v === 4, 'confirmed archive preserves the document and advances its version');
    await L.settle(p, 1400); await p.locator(action('restore')).click();
    await L.waitFor(p, k => (__fake.dump()[k] || {}).v === 5, pair[0]);
    ok(!(await dump(p))[pair[0]].archived, 'restoring a standard keeps the same identity and advances its saved revision');
  });

  await visit(browser, 'stale edit retains draft', { hash: '#/chef', who: 'ann' }, async p => {
    await room(p); await p.locator(action('edit', 'onions')).click(); await p.fill(field('instruction'), 'Unsaved local instruction');
    await p.evaluate(k => __fake.write(k, Object.assign({}, __fake.dump()[k], { v: 2, instruction: 'Newer saved instruction' })), key('prepStandards', 'onions'));
    await p.locator(action('save')).click();
    await L.waitFor(p, () => !LK_PREP_STANDARDS.busy());
    ok(await p.inputValue(field('instruction')) === 'Unsaved local instruction' && await p.evaluate(() => LK_PREP_STANDARDS.unsaved()), 'a version refusal keeps the original dirty draft');
    const saved = (await dump(p))[key('prepStandards', 'onions')];
    ok(saved.v === 2 && saved.instruction === 'Newer saved instruction', 'a stale save cannot overwrite the newer standard');
  });

  await visit(browser, 'verified owner standards', { hash: '#/admin', admin: true, who: 'ann', adminPage: 'inbox' }, async p => {
    await room(p, true); await p.locator(action('edit', 'onions')).click();
    await p.fill(field('instruction'), 'Synthetic owner check'); await p.locator(action('save')).click();
    await L.waitFor(p, k => (__fake.dump()[k] || {}).instruction === 'Synthetic owner check', key('prepStandards', 'onions'));
    ok((await dump(p))[key('prepStandards', 'onions')].by === 'ann', 'verified admin uses the same editor and canonical head recorder');
  });

  const spoof = fixture(); spoof[CFG].people.find(x => x.id === 'sam').role = 'head';
  await visit(browser, 'sous remains read only', { hash: '#/chef', who: 'sam', extra: spoof }, async p => {
    await room(p); await L.waitFor(p, () => /Slice onions/.test(document.querySelector('.a-pane').textContent));
    ok(!await p.locator(action('new') + ',' + action('save') + ',' + action('archive')).count(), 'an editable Head role label does not grant the sous canonical edit rights');
    ok(await p.locator('[data-ps-field="name"], [data-ps-field="minimum"], [data-ps-field="instruction"]').count() === 0, 'sous panel presents standards without editable fields');
  });

  const viewOnly = fixture(); viewOnly[CFG].addIds = ['sam', 'ann'];
  await visit(browser, 'staff without Add', { extra: viewOnly }, async p => {
    await reference(p); await L.waitFor(p, () => /Slice onions/.test(document.querySelector('#prep-root').textContent));
    ok(!await p.locator(action('add')).count(), 'view-only prep staff can read standards without gaining Add');
  });

  const noSections = fixture(); noSections[CFG].kitSecs = [];
  await visit(browser, 'no configured sections', { extra: noSections }, async p => {
    ok(await p.locator('[data-p="ps-view"][data-v="reference"]').count() === 1, 'Before service remains discoverable before the head chef configures sections');
    await p.locator('[data-p="ps-view"][data-v="reference"]').click();
    await L.waitFor(p, () => /No configured sections/.test(document.querySelector('#prep-root').textContent), null, 8000);
    ok(await countReads(p) === 0 && !await p.locator(action('add')).count(), 'missing section setup has a clear next step and makes no standards query');
  });

  const functionsOnly = fixture(); functionsOnly[CFG].fnOnlyIds = ['bo']; functionsOnly[CFG].fnIds = ['bo'];
  functionsOnly[CFG].people.find(x => x.id === 'bo').role = 'fnc';
  await visit(browser, 'functions-only access', { extra: functionsOnly }, async p => {
    ok(!await p.locator('[data-p="ps-view"], [data-ps="add"], [data-ps="save"]').count() && await countReads(p) === 0, 'Functions-only login cannot open or read prep standards');
  });
  await visit(browser, 'signed-out access', { who: '', noTok: true }, async p => {
    ok(!await p.locator('[data-p="ps-view"], [data-ps="add"], [data-ps="save"]').count() && await countReads(p) === 0, 'signed-out screen cannot open or read prep standards');
  });

  const unsafe = fixture(), markup = '<img id="ps-injected" src=x onerror="window.__psInjected=1">';
  unsafe[key('prepStandards', 'onions')].instruction = markup;
  await visit(browser, 'standard text escaping', { extra: unsafe }, async p => {
    await reference(p); await L.waitFor(p, () => /ps-injected/.test(document.querySelector('#prep-root').textContent));
    ok(await p.locator('#ps-injected').count() === 0 && !await p.evaluate(() => !!window.__psInjected), 'head-entered instruction markup renders as text, never an element or handler');
  });

  await browser.close(); L.report(R);
})().catch(error => { console.error(error); process.exit(1); });
