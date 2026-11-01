// The Chef's Desk keeps chapter navigation, focused reviews and real saves usable together.
const L = require('./lib'), C = require('../js/analysis-core');
const { R, ok } = L.results();
const path = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const day = L.ymd(new Date(L.NOW - 86400000));
const reference = { alias: 'Milk', label: 'Milk', recipeId: 'laksa', supplierId: '', itemId: '', guideId: '', v: 1, at: L.NOW, by: 'owner' };
const daily = C.daily(day, { prep: [
  { id: 'slaw', text: 'House slaw', recipe: 'slaw', station: 'Grill', done: true, doneById: 'ann' },
  { id: 'herbs', text: 'Chop herbs', station: 'Grill', done: true, doneById: 'ann' }
] }, [{ ...reference, id: 'ai-milk' }]);
const aggregate = C.aggregate([daily]);
const extra = {
  [path('config', 'main')]: { ...L.seed()[path('config', 'main')], kitSecs: [{ id: 'grill', name: 'Grill' }] },
  [path('analysis', 'current')]: { generation: 'desk', at: L.NOW, from: day, to: day, days: 1 },
  [path('analysis', 'health')]: { status: 'ok', at: L.NOW },
  [path('analysisDaily', 'desk_' + day)]: daily,
  [path('references', 'ai-milk')]: reference
};
for (const n of [7, 30, 90]) extra[path('analysis', 'range-' + n)] = {
  ...aggregate, generation: 'desk', at: L.NOW, from: day, to: day, days: 1,
  dates: [{ day, counts: daily.counts }], totalItems: aggregate.items.length
};

async function chapter(p, group, tab) {
  if (await p.locator('[data-k="ai-section"] + .ux-picker-trigger').isVisible()) await L.pick(p, '[data-k="ai-section"]', group);
  else await p.click('[data-p="a-group"][data-g="' + group + '"]');
  await L.settle(p, 150);
  await L.adminTab(p, tab);
}

async function checkLayout(p, width, group) {
  const layout = await p.evaluate(() => {
    const frame = document.querySelector('.p-admin.ad-admin'), layout = frame && frame.querySelector('.ad-layout');
    const rail = layout && layout.querySelector(':scope > .a-nav'), main = layout && layout.querySelector(':scope > .ad-main');
    const heading = main && main.querySelector('.ad-heading'), title = heading && heading.querySelector('.ad-title');
    const tabs = main && main.querySelector('.a-tabs'), jumps = main && main.querySelector('.a-onpage');
    const a = rail && rail.getBoundingClientRect(), b = main && main.getBoundingClientRect();
    const current = rail && rail.querySelector('.a-group[aria-current="page"]');
    return {
      frame: !!frame && !!rail && !!main,
      chapter: !!title && !!title.textContent.trim() && !!heading.querySelector('.ad-eyebrow') && !!current && current.getAttribute('data-g'),
      localNavigation: !!rail && !!tabs && !!jumps && !rail.contains(tabs) && !rail.contains(jumps),
      beside: !!a && !!b && a.width > 0 && a.right <= b.left + 1 && b.right <= innerWidth + 1,
      chapterTargets: !!rail && [...rail.querySelectorAll('.a-group')].filter(el => el.getClientRects().length).every(el => el.getBoundingClientRect().height >= 44)
    };
  });
  ok(layout.frame && layout.chapter === group && layout.localNavigation, width + ': ' + group + ' uses the shared chapter layout with local page controls in its main content');
  if (width >= 1100) ok(layout.beside && layout.chapterTargets, width + ': ' + group + ' content stays clear of the chapter rail and its accessible targets');
  ok(!(await L.overflow(p)), width + ': ' + group + ' chapter fits without sideways scrolling');
}

async function checkFocusedTask(p, width, name) {
  const task = await p.evaluate(() => {
    const editor = document.querySelector('.ai-editor'), queue = document.querySelector('.ai-queue');
    const picker = document.querySelector('.a-section-picker'), heading = editor && editor.querySelector('.ai-task-heading');
    const actions = editor && editor.querySelector('.ai-task-actions'), nav = document.querySelector('.tabbar');
    const detail = document.querySelector('.ai-detail'), back = document.querySelector('.wtop [data-act="back"]');
    const controls = actions ? [...actions.querySelectorAll('[data-ai="save"], [data-ai="save-next"]')] : [];
    const visible = el => !!el && !!el.getClientRects().length && getComputedStyle(el).display !== 'none';
    const limit = visible(nav) ? nav.getBoundingClientRect().top : innerHeight;
    const detailBox = detail && detail.getBoundingClientRect(), backBox = back && back.getBoundingClientRect();
    const backTarget = backBox && document.elementFromPoint(backBox.left + backBox.width / 2, backBox.top + backBox.height / 2);
    return {
      editor: visible(editor), focused: !!heading && document.activeElement === heading,
      detailInView: !!detailBox && detailBox.top >= -1 && detailBox.top < limit,
      backInView: visible(back) && backBox.top >= 0 && backBox.bottom <= innerHeight && backBox.width >= 44 && backBox.height >= 44 && back.contains(backTarget),
      queueHidden: !visible(queue), pickerHidden: !visible(picker),
      actions: controls.length > 0 && controls.every(el => {
        const r = el.getBoundingClientRect();
        return r.width >= 44 && r.height >= 44 && r.top >= 0 && r.bottom <= limit + 1;
      })
    };
  });
  ok(task.editor && task.focused && task.detailInView, width + ': ' + name + ' opens its focused heading without scrolling the start of the detail off screen');
  if (width < 1100) ok(task.queueHidden && task.backInView, width + ': ' + name + ' gives the task the reading space and keeps the header Back visible and reachable');
  if (width < 720) ok(task.pickerHidden && task.actions, width + ': ' + name + ' hides the chapter picker and keeps 44 px Save actions visible above the kitchen navigation');
  ok(!(await L.overflow(p)), width + ': ' + name + ' editor fits without sideways scrolling');
}

async function checkDateClearance(p, name) {
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await L.settle(p, 100);
  const clearance = await p.evaluate(() => {
    const field = document.getElementById('ai-day').getBoundingClientRect(), actions = document.querySelector('.ai-task-actions').getBoundingClientRect();
    const top = Math.max(0, document.querySelector('.wtop').getBoundingClientRect().bottom);
    return { ok: field.top >= top && field.bottom <= actions.top + 1 && actions.top < innerHeight, top: field.top, bottom: field.bottom, actions: actions.top, header: top, scroll: scrollY };
  });
  ok(clearance.ok, name + ': the last required training field can scroll clear of the fixed Save area' + (clearance.ok ? '' : ' ' + JSON.stringify(clearance)));
}

async function checkLearningJump(browser, text) {
  const name = '390 Learning ' + (text === 'xlarge' ? 'extra large' : 'normal text');
  const p = await L.open(browser, '#/admin', { admin: true, adminPage: 'learning', who: '', width: 390, height: 844, settings: { text }, wait: 1600 });
  await L.adminTab(p, 'learning');
  await L.waitFor(p, () => document.querySelectorAll('.a-onpage [data-p="jump"]').length > 0);
  const longest = await p.locator('.a-onpage [data-p="jump"]').evaluateAll(nodes => nodes.map(el => ({
    id: el.getAttribute('data-v'), label: el.textContent.replace(/^\d+\s*/, '').trim()
  })).sort((a, b) => b.label.length - a.label.length)[0]);
  await p.click('[data-p="aj-open"]');
  await p.click('#aj-sheet [data-aj="go"][data-v="' + longest.id + '"]');
  await L.settle(p, 600);
  const revealed = await p.evaluate(id => {
    const heading = document.getElementById(id).getBoundingClientRect(), picker = document.querySelector('.a-nav').getBoundingClientRect();
    const limit = document.querySelector('.tabbar').getBoundingClientRect().top;
    return heading.top >= picker.bottom - 1 && heading.top < limit && !document.querySelector('#aj-sheet');
  }, longest.id);
  ok(revealed, name + ': choosing the longest real section name reveals its heading below the chapter picker');
  const fits = await p.evaluate(label => {
    const control = document.querySelector('.a-jumpbtn'), current = control.querySelector('.a-jumpcur');
    const r = control.getBoundingClientRect(), c = current.getBoundingClientRect();
    return r.width >= 44 && r.height >= 44 && r.left >= -1 && r.right <= innerWidth + 1 &&
      c.left >= r.left && c.right <= r.right + 1 && current.scrollWidth <= current.clientWidth + 1 && current.textContent.trim() === label;
  }, longest.label);
  ok(fits, name + ': the longest current jump label fits the phone within a 44 px target');
  await p.click('[data-p="aj-open"]');
  ok(await p.locator('#aj-sheet [role="dialog"]').isVisible(), name + ': the jump control remains tappable after showing the long current label');
  await p.keyboard.press('Escape');
  ok(!(await L.overflow(p)) && p.errors.length === 0, name + ': the actual jump flow has no sideways scroll or browser errors ' + p.errors.join(' | '));
  await p.context().close();
}

const privateWrites = p => p.evaluate(() => window.__fake.writes.flat().filter(x => /\/(references|training)\//.test(x.path)).length);

(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/admin', { admin: true, adminPage: '', who: '', width, height: 900, extra, wait: 1600 });
    await L.adminTab(p, 'references');
    await L.waitFor(p, () => !!document.querySelector('[data-ai="review-reference"][data-value="ref:recipe:slaw"]'));
    await checkLayout(p, width, 'review');
    await p.click('[data-ai="review-reference"][data-value="ref:recipe:slaw"]');
    await L.waitFor(p, () => !!document.querySelector('[data-ai="save"]') && !document.querySelector('[data-ai="save"]').disabled);
    await checkFocusedTask(p, width, 'item review');
    const options = p.locator('[data-ai-disclosure="reference-options"]');
    if (!(await options.evaluate(el => el.open))) await options.locator('summary').click();
    const label = 'Desk draft ' + width;
    await p.fill('#ai-label', label);
    await p.click('.wtop [data-act="back"]');
    await L.settle(p, 150);
    ok(await p.locator('.ai-resume [data-ai="resume"]').isVisible() && await p.locator('.ai-editor:visible').count() === 0, width + ': contextual Back exposes the retained draft in its review queue');
    if (width < 720) ok(await p.locator('.a-section-picker').isVisible(), width + ': returning to the queue restores the section picker');

    for (const [group, tab] of [['reports', 'analysis'], ['records', 'reference-records'], ['today', 'minutes'], ['settings', 'tools']]) {
      await chapter(p, group, tab);
      await checkLayout(p, width, group);
      ok(await p.locator('.ai-resume [data-ai="resume"]').isVisible(), width + ': the unfinished review remains reachable in ' + group);
    }
    ok(await privateWrites(p) === 0, width + ': chapter navigation never saves a private draft');
    await p.click('.ai-resume [data-ai="resume"]');
    ok(await p.inputValue('#ai-alias') === 'House slaw' && await p.inputValue('#ai-recipeId') === 'slaw' && await p.inputValue('#ai-label') === label, width + ': Resume retains the recorded name, explicit recipe identity and edited reference name');
    await p.click('[data-ai="save"]');
    await L.waitFor(p, label => Object.values(window.__fake.dump()).some(r => r && r.alias === 'House slaw' && r.label === label && r.recipeId === 'slaw'), label);
    const savedLink = await p.evaluate(() => Object.values(window.__fake.dump()).find(r => r && r.alias === 'House slaw' && r.recipeId === 'slaw'));
    ok(savedLink.by === 'owner' && savedLink.v === 1 && !await p.evaluate(() => LK_PREP.unsaved()), width + ': the acknowledged Save retains the existing owner and revision contract');

    await L.adminTab(p, 'training');
    await p.click('[data-ai="new-training"]');
    await checkFocusedTask(p, width, 'training assessment');
    await L.pick(p, '#ai-personId', 'ann');
    await L.pick(p, '#ai-section', 'Grill');
    await L.pick(p, '#ai-status', 'in-training');
    await L.pick(p, '#ai-assessorId', 'sam');
    if (width < 720) await checkDateClearance(p, String(width));
    await p.click('[data-ai="save"]');
    await L.waitFor(p, () => Object.entries(window.__fake.dump()).some(([key, value]) => /\/training\/[^/]+$/.test(key) && value.personId === 'ann'));
    const assessment = await p.evaluate(() => Object.entries(window.__fake.dump()).find(([key, value]) => /\/training\/[^/]+$/.test(key) && value.personId === 'ann')[1]);
    ok(assessment.section === 'Grill' && !assessment.recipeId && assessment.status === 'in-training' && assessment.assessorId === 'sam' && assessment.by === 'owner', width + ': training saves the explicitly chosen section, outcome and assessor');
    if (width < 720) {
      await chapter(p, 'settings', 'tools');
      await p.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
      await L.waitFor(p, () => !!document.querySelector('.upd-bar'));
      await p.evaluate(() => scrollTo(0, 700));
      await L.settle(p, 150);
      const updateClear = await p.evaluate(() => {
        const update = document.querySelector('.upd-bar').getBoundingClientRect(), picker = document.querySelector('.a-nav').getBoundingClientRect();
        return picker.top >= update.bottom - 1 && picker.bottom <= innerHeight;
      });
      ok(updateClear, width + ': the sticky chapter picker remains readable below an offered app update');
    }
    ok(!(await L.overflow(p)), width + ': completed review flows fit without sideways scrolling');
    ok(p.errors.length === 0, width + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  const queuePage = await L.open(b, '#/admin', { admin: true, adminPage: 'references', who: '', width: 390, height: 844, extra, wait: 1600 });
  await L.waitFor(queuePage, () => !!document.querySelector('.ai-reference-candidates [data-ai="review-reference"]'));
  const firstTarget = await queuePage.evaluate(() => {
    const row = document.querySelector('.ai-reference-candidates [data-ai="review-reference"]'), r = row.getBoundingClientRect();
    const top = Math.max(0, document.querySelector('.wtop').getBoundingClientRect().bottom), limit = document.querySelector('.tabbar').getBoundingClientRect().top;
    const centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const shown = Math.min(r.bottom, limit) - Math.max(r.top, top);
    return { usable: scrollY < 1 && r.width >= 44 && r.height >= 44 && shown >= 44 && centre.y >= top && centre.y < limit && row.contains(document.elementFromPoint(centre.x, centre.y)),
      top: r.top, bottom: r.bottom, limit, shown };
  });
  ok(firstTarget.usable, '390 normal text: the first review row offers a visible 44 px target above the kitchen navigation without scrolling' + (firstTarget.usable ? '' : ' ' + JSON.stringify(firstTarget)));
  await queuePage.context().close();
  const p = await L.open(b, '#/admin', { admin: true, adminPage: 'training', who: '', width: 390, height: 844, settings: { text: 'xlarge' }, extra, wait: 1600 });
  ok(await p.evaluate(() => document.documentElement.getAttribute('data-text') === 'xlarge'), '390 extra large: the app uses its largest reading setting');
  await L.adminTab(p, 'training');
  await p.click('[data-ai="new-training"]');
  await checkFocusedTask(p, 390, 'extra large training assessment');
  await L.pick(p, '#ai-personId', 'ann');
  await L.pick(p, '#ai-section', 'Grill');
  await L.pick(p, '#ai-status', 'confirmed');
  await L.pick(p, '#ai-assessorId', 'sam');
  await checkDateClearance(p, '390 extra large');
  await p.click('[data-ai="save"]');
  await L.waitFor(p, () => Object.entries(window.__fake.dump()).some(([key, value]) => /\/training\/[^/]+$/.test(key) && value.personId === 'ann' && value.status === 'confirmed'));
  ok(await p.locator('.ai-editor:visible').count() === 0 && !(await L.overflow(p)), '390 extra large: the visible Save completes the explicit assessment and returns to a fitting queue');
  ok(p.errors.length === 0, '390 extra large: no browser errors ' + p.errors.join(' | '));
  await p.context().close();
  for (const text of ['normal', 'xlarge']) await checkLearningJump(b, text);
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
