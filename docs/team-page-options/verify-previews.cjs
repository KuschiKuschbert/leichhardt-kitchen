// Verification of isolated design sketches, never the operational application.
// --focus-only runs the additional shared-control and C last-row reachability pass.
const fs = require('fs'), path = require('path'), http = require('http'), crypto = require('crypto');
const ROOT = process.env.TEAM_PREVIEW_ROOT || path.resolve(__dirname, '../..');
const { chromium } = require(process.env.TEAM_PREVIEW_PLAYWRIGHT || path.join(ROOT, 'tests/node_modules/playwright-core'));
const OUT = path.join(ROOT, 'docs/team-page-options');
const PORT = Number(process.env.TEAM_PREVIEW_PORT || 8794), HEIGHT = 844;
const fonts = [ ['Barlow', '400', 'barlow.woff2'], ['Barlow', '600', 'barlow-600.woff2'], ['Barlow', '700', 'barlow-700.woff2'], ['Barlow Condensed', '700', 'barlow-condensed.woff2'], ['Caveat', '700', 'caveat.woff2'] ];
const evidence = { environment: { kind: 'Isolated, in-memory, synthetic prototypes', reproduction: 'Install existing test dependencies with cd tests && npm ci; from the repository root run node docs/team-page-options/verify-previews.cjs --ready. TEAM_PREVIEW_PLAYWRIGHT may point to an existing playwright-core installation; TEAM_PREVIEW_ROOT and TEAM_PREVIEW_PORT are optional overrides.', viewportHeight: HEIGHT, fonts: 'Original local Barlow, Barlow Condensed and Caveat faces', taskCount: 'Native picker open + option choice count as two tap-equivalent actions; scroll and typing excluded. Save includes acknowledgement.' }, measurements: [], tasks: [], stateChecks: [], adversarial: [], limitations: ['No production records, Firebase persistence, server permissions, device locks, handover or reload recovery are tested.', 'Browser checks and role-based design review do not establish actual kitchen task frequency or staff usability.'] };
let browser, server, activePage;
function check(condition, name, detail) { evidence.adversarial.push({ name, pass: !!condition, ...(detail === undefined ? {} : { detail }) }); }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
async function frame(p) { await p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
async function until(p, fn, arg, timeout = 3000) { const end = Date.now() + timeout; while (!await p.evaluate(fn, arg)) { if (Date.now() > end) throw Error('Preview wait timed out'); await new Promise(r => setTimeout(r, 35)); } }
async function snapshot(p) { return p.evaluate(() => typeof preview.snapshot === 'function' ? preview.snapshot() : preview.snapshot); }
async function api(p, method, value) { await p.evaluate(({ method, value }) => window.preview[method](value), { method, value }); await frame(p); }
async function fontsReady(p) {
  await p.addStyleTag({ content: fonts.map(([family, weight, file]) => `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:block;src:url('/docs/cleaning-chef-options/fonts/${file}') format('woff2')}`).join('\n') });
  return p.evaluate(async items => { for (const [family, weight] of items) await document.fonts.load(`${weight} 16px '${family}'`); await document.fonts.ready; return items.map(([family, weight]) => ({ family, weight, loaded: document.fonts.check(`${weight} 16px '${family}'`) })); }, fonts);
}
async function open(option, width = 390, frameType = 'team') {
  const context = await browser.newContext({ viewport: { width, height: HEIGHT }, deviceScaleFactor: 1, timezoneId: 'Australia/Brisbane', reducedMotion: 'reduce' });
  await context.route('**/*', r => { const u = new URL(r.request().url()); return ['127.0.0.1', 'localhost'].includes(u.hostname) || ['data:', 'blob:'].includes(u.protocol) ? r.continue() : r.abort(); });
  const p = await context.newPage(); p.errors = []; p.on('pageerror', e => p.errors.push(e.message));
  await p.goto(`http://127.0.0.1:${PORT}/docs/team-page-options/preview.html?design=${option.toUpperCase()}&frame=${frameType}`, { waitUntil: 'load' });
  await until(p, () => !!window.preview); p.loadedFonts = await fontsReady(p); await frame(p); activePage = p; return p;
}
async function close(p) { await p.context().close(); if (activePage === p) activePage = null; }
const action = (name, attrs = '') => `[data-action="${name}"]${attrs}`;
const person = (name, id, extra = '') => action(name, `[data-person="${id}"]${extra}`);
async function press(p, selector, counter) { const el = p.locator(selector).first(); await el.scrollIntoViewIfNeeded(); await el.click(); if (counter) counter.taps++; await frame(p); }
async function choose(p, selector, value, counter) { const el = p.locator(selector).first(); await el.scrollIntoViewIfNeeded(); await el.focus(); await el.selectOption(String(value)); if (counter) counter.taps += 2; await frame(p); }
async function stage(p, name, counter) { const el = p.locator(action('stage', `[data-stage="${name}"]`)).first(); if (await el.count() && await el.isVisible() && await el.getAttribute('aria-pressed') !== 'true' && !await el.evaluate(e => e.classList.contains('active') || e.getAttribute('aria-current') === 'step')) await press(p, action('stage', `[data-stage="${name}"]`), counter); }
async function date(p, day, counter) { const el = p.locator(action('date', `[data-date="${day}"]`)); if ((!await el.count() || !await el.isVisible()) && await p.locator(action('toggle-dates')).count()) await press(p, action('toggle-dates'), counter); await press(p, action('date', `[data-date="${day}"]`), counter); }
function membership(record, id, service) { return record && record.on.find(x => x.id === id && x.sh === service); }
async function sectionChange(p, id, service, section, counter) { await stage(p, 'assignments', counter); const view = p.locator(person('service', id)); if (await view.inputValue() !== service) await choose(p, person('service', id), service, counter); await choose(p, person('section', id, `[data-service="${service}"]`), section, counter); }
async function save(p, counter) { await stage(p, 'review', counter); await press(p, action('save'), counter); await until(p, () => preview.snapshot().saveState.status !== 'saving', null, 3000); }
async function stageTextContainment(p) {
  return p.evaluate(() => [...document.querySelectorAll('.steps button')].flatMap(button => {
    const box=button.getBoundingClientRect(); if(!box.width||!box.height)return [];
    const walker=document.createTreeWalker(button,NodeFilter.SHOW_TEXT), records=[]; let text;
    while(text=walker.nextNode()){
      const label=text.textContent.trim();if(!label)continue; const start=text.textContent.indexOf(label),range=document.createRange();range.setStart(text,start);range.setEnd(text,start+label.length);
      for(const ink of range.getClientRects()){
        const spill={left:Math.max(0,box.left-ink.left),right:Math.max(0,ink.right-box.right),top:Math.max(0,box.top-ink.top),bottom:Math.max(0,ink.bottom-box.bottom)};
        records.push({stage:button.dataset.stage,label,fontSize:getComputedStyle(text.parentElement).fontSize,button:{left:box.left,top:box.top,width:box.width,height:box.height,right:box.right,bottom:box.bottom},ink:{left:ink.left,top:ink.top,width:ink.width,height:ink.height,right:ink.right,bottom:ink.bottom},widthExcess:Math.max(0,ink.width-box.width),spill,contained:Object.values(spill).every(x=>x<=.5)});
      }
    }
    return records;
  }));
}
async function verifyStageContainment() {
  evidence.stageRepairs=[];
  for(const frameType of['team','chef'])for(const long of[false,true]){
    const p=await open('b',390,frameType);try{
      await p.evaluate(()=>{document.documentElement.dataset.text='xlarge';});if(long)await api(p,'stressLongLabels');await frame(p);
      const afterGeometry=await measure(p),after=afterGeometry.stageLabels;
      // Reconstruct only the previous three-column property; font size and every other style stay current.
      await p.locator('.steps').evaluate(e=>{e.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';});await frame(p);
      const before=await stageTextContainment(p),beforeGeometry=await measure(p);
      check(before.some(x=>x.label==='Assignments'&&!x.contained),`B/${frameType}/${long?'long':'xlarge'}: prior three-column property reproduces the visible text spill`,before.filter(x=>x.label==='Assignments'));
      await p.locator('.steps').evaluate(e=>{e.style.removeProperty('grid-template-columns');});await frame(p);
      check(after.length>0&&after.every(x=>x.contained)&&after.filter(x=>x.label==='Assignments').every(x=>parseFloat(x.fontSize)===20)&&after.every(x=>x.button.height>=44),`B/${frameType}/${long?'long':'xlarge'}: visible labels fit their actual buttons at20px with44px targets`,after);
      evidence.stageRepairs.push({frame:frameType,long,beforeReconstruction:{note:'Only the former three-column grid property is restored in this isolated page; original voted evidence stays archived separately.',stageLabels:before,firstRowTop:beforeGeometry.firstRowTop,completeInitialRows:beforeGeometry.completeInitialRows},after:{stageLabels:after,firstRowTop:afterGeometry.firstRowTop,completeInitialRows:afterGeometry.completeInitialRows},errors:p.errors});
    }finally{await close(p);}
  }
}

async function measure(p) {
  const geometry = await p.evaluate(() => {
    const visible = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden],details:not([open]) > :not(summary)'); };
    const rows = [...document.querySelectorAll('.person-row')].filter(visible), bottomLayers = [...document.querySelectorAll('body *')].filter(e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.position === 'fixed' && r.width > innerWidth * .5 && r.height > 0 && r.top > innerHeight * .5 && r.bottom >= innerHeight - 1; });
    let bottom = Math.min(innerHeight, ...bottomLayers.map(e => e.getBoundingClientRect().top)); const dock = document.querySelector('.save-area'); if (dock && getComputedStyle(dock).position === 'sticky') { const d = dock.getBoundingClientRect(); if (d.top > 0 && d.top < bottom && d.bottom <= innerHeight + 1) bottom = Math.min(bottom, d.top); }
    const save = document.querySelector('[data-action="save"]'), saveBox = save && save.getBoundingClientRect();
    const rowRecords = rows.map(e => { const r = e.getBoundingClientRect(); const service = e.querySelector('[data-action="service"]'), section = e.querySelector('[data-action="section"]'); return { person: e.dataset.person, top: r.top, bottom: r.bottom, height: r.height, serviceInside: !!service && e.contains(service), sectionInside: !!section && e.contains(section) }; });
    const controls = [...document.querySelectorAll('button,select,input,summary,a[href]')].filter(visible).map(e => { const target = e.matches('input[type="checkbox"],input[type="radio"]') ? e.closest('label') || e : e; const r = target.getBoundingClientRect(); return { label: e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].textContent.trim()) || e.textContent.trim(), action: e.dataset.action || e.tagName.toLowerCase(), width: r.width, height: r.height, disabled: !!e.disabled }; });
    return { rowCount: rows.length, firstRowTop: rowRecords[0] && rowRecords[0].top, completeInitialRows: rowRecords.filter(r => r.top >= 0 && r.bottom <= bottom).length, visibleBottom: bottom, saveTop: saveBox && saveBox.top, saveVisible: !!saveBox && saveBox.top >= 0 && saveBox.bottom <= innerHeight && !!save && save.contains(document.elementFromPoint(saveBox.left + saveBox.width / 2, saveBox.top + saveBox.height / 2)), rows: rowRecords, smallTargets: controls.filter(r => r.width < 43.5 || r.height < 43.5), overflow: document.documentElement.scrollWidth > innerWidth + 1, rootFont: getComputedStyle(document.documentElement).fontSize, bodyFont: getComputedStyle(document.body).fontSize };
  });
  geometry.stageLabels=await stageTextContainment(p); geometry.stageLabelSpills=geometry.stageLabels.filter(x=>!x.contained); return geometry;
}
async function contrast(p) {
  return p.evaluate(() => {
    const rgba = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; };
    const over = (a, b) => { const alpha = a[3] + b[3] * (1 - a[3]); return [0, 1, 2].map(i => alpha ? (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / alpha : 0).concat(alpha); };
    const lum = c => c.slice(0, 3).map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((s, x, i) => s + x * [.2126, .7152, .0722][i], 0);
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const tests = [], unresolved = [], walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim(), e = node.parentElement;
      if (!text || !e || ['SCRIPT', 'STYLE', 'OPTION'].includes(e.tagName) || e.closest('[hidden],details:not([open]) > :not(summary)')) continue;
      const box = e.getBoundingClientRect(), style = getComputedStyle(e);
      if (!box.width || !box.height || style.visibility === 'hidden' || style.display === 'none') continue;
      let opacity = 1, bg = [255, 255, 255, 1], chain = [], complex = false;
      for (let a = e; a; a = a.parentElement) chain.unshift(a);
      for (const a of chain) { const s = getComputedStyle(a), colour = rgba(s.backgroundColor); opacity *= Number(s.opacity); if (s.backgroundImage !== 'none') complex = true; if (colour) bg = over(colour, bg); }
      let fg = rgba(style.color); if (!fg) { unresolved.push({ text: text.slice(0, 70), reason: 'Unsupported computed text colour' }); continue; }
      fg[3] *= opacity; fg = over(fg, bg);
      const size = parseFloat(style.fontSize), large = size >= 24 || size >= 18.66 && Number(style.fontWeight) >= 700, required = large ? 3 : 4.5;
      const item = { text: text.slice(0, 70), ratio: Number(ratio(fg, bg).toFixed(3)), required, size, disabled: !!e.closest(':disabled') };
      if (complex) unresolved.push({ ...item, reason: 'Background image or gradient needs visual sampling' }); else tests.push(item);
    }
    return { checked: tests.length, minimum: tests.length ? Math.min(...tests.map(x => x.ratio)) : null, failures: tests.filter(x => x.ratio + .001 < x.required && !x.disabled), disabledBelowThreshold: tests.filter(x => x.ratio + .001 < x.required && x.disabled), unresolved };
  });
}
async function scene(option, width, size = 'normal', stress = false, frameType = 'team') {
  const p = await open(option, width, frameType); try {
    if (size === 'xlarge') await p.evaluate(() => { document.documentElement.dataset.text = 'xlarge'; });
    if (stress) await api(p, 'stressLongLabels');
    await frame(p); await p.evaluate(() => scrollTo(0, 0));
    const geometry = await measure(p), colours = await contrast(p), name = `preview-${option}-${frameType}-${width}${size === 'xlarge' ? '-xlarge' : ''}${stress ? '-long' : ''}`;
    await p.screenshot({ path: path.join(OUT, name + '.png') }); await p.screenshot({ path: path.join(OUT, name + '-full.png'), fullPage: true });
    evidence.measurements.push({ option, frame: frameType, width, size, stress, geometry, contrast: colours, fonts: p.loadedFonts, errors: p.errors, screenshot: name + '.png' });
    check(!geometry.overflow && !geometry.smallTargets.length && !geometry.stageLabelSpills.length && !p.errors.length && !colours.failures.length && geometry.rowCount === 8 && new Set(geometry.rows.map(r => r.person)).size === 8 && geometry.rows.every(r => r.serviceInside && r.sectionInside), `${option}/${frameType}/${width}/${size}${stress ? '/long' : ''}: unique row controls, layout, targets, text contrast and script errors`, { overflow: geometry.overflow, smallTargets: geometry.smallTargets, stageLabelSpills: geometry.stageLabelSpills, contrastFailures: colours.failures, errors: p.errors });
    check(p.loadedFonts.every(f => f.loaded), `${option}/${width}/${size}: original fonts loaded`);
  } finally { await close(p); }
}
async function control(p, selector, value, counter) {
  const el = p.locator(selector).first(), tag = await el.evaluate(e => e.tagName);
  if (tag === 'SELECT') return choose(p, selector, value, counter);
  await el.scrollIntoViewIfNeeded(); await el.click(); if (counter) counter.taps++;
  await el.fill(String(value)); await el.press('Tab'); await frame(p);
  if (counter) counter.note = 'Time entry uses one field activation with typing excluded, unlike a picker-option path.';
}
async function breakEditor(p, id, service, counter) {
  await stage(p, 'breaks', counter);
  const view = p.locator(person('service', id));
  if (await view.count() && await view.isVisible() && await view.inputValue() !== service) await choose(p, person('service', id), service, counter);
  const field = p.locator(person('break-time', id, `[data-service="${service}"][data-index="0"]`));
  if ((!await field.count() || !await field.isVisible()) && await p.locator(person('edit-breaks', id)).count()) await press(p, person('edit-breaks', id), counter);
}
async function tools(p, counter) { const summary = p.locator(action('toggle-tools')); if (await summary.count() && !await summary.evaluate(e => !!e.closest('details').open)) await press(p, action('toggle-tools'), counter); }
async function checkbox(p, selector, value, counter) { const el = p.locator(selector).first(); if (await el.isChecked() !== value) { await el.setChecked(value); if (counter) counter.taps++; await frame(p); } }
async function verifyInteractions(option) {
  const p = await open(option, 390);
  const initial = await snapshot(p), today = initial.selectedDate, tomorrow = new Date(Date.parse(today + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10);
  const label = name => `${option}: ${name}`;
  const reset = () => api(p, 'reset');
  async function task(name, fn) {
    await reset(); const count = { taps: 0 }, before = await snapshot(p);
    try { await fn(count, before); const after = await snapshot(p); evidence.tasks.push({ option, name, ...count, before: { selectedDate: before.selectedDate, version: before.version }, after }); }
    catch (e) { check(false, label(name), e.message); evidence.tasks.push({ option, name, ...count, error: e.message }); }
  }
  try {
    await task('Correct section on current service and Save', async (count, before) => {
      await sectionChange(p, 'ann', 'lunch', 'grill', count); await save(p, count); const s = await snapshot(p);
      check(membership(s.saved[today], 'ann', 'lunch').sec === 'grill' && membership(s.saved[today], 'ann', 'dinner').sec === membership(before.saved[today], 'ann', 'dinner').sec, label('current-service correction preserves Dinner and acknowledges the dated save'));
    });
    await task('Correct section on another service and Save', async (count, before) => {
      await sectionChange(p, 'ann', 'dinner', 'pans', count); await save(p, count); const s = await snapshot(p);
      check(membership(s.saved[today], 'ann', 'dinner').sec === 'pans' && membership(s.saved[today], 'ann', 'lunch').sec === membership(before.saved[today], 'ann', 'lunch').sec, label('row service context sends the correction to Dinner without overwriting Lunch'));
    });
    await task('Add two people to Lunch and Dinner and Save', async (count) => {
      await press(p, action('show-add'), count); await checkbox(p, person('add-person', 'jo'), true, count); await checkbox(p, person('add-person', 'kai'), true, count); await checkbox(p, action('add-shift', '[data-service="dinner"]'), true, count); await press(p, action('add-staff'), count); await save(p, count); const s = await snapshot(p);
      check(['jo', 'kai'].every(id => ['lunch', 'dinner'].every(sh => membership(s.saved[today], id, sh))), label('Add staff includes exactly the chosen people and services before one shared Save'));
    });
    await task('Correct an existing break and Save', async count => {
      await breakEditor(p, 'ann', 'lunch', count); const field = p.locator(person('break-time', 'ann', '[data-service="lunch"][data-index="0"]'));
      const value = await field.getAttribute('type') === 'time' ? '14:00' : '840'; await control(p, person('break-time', 'ann', '[data-service="lunch"][data-index="0"]'), value, count); await save(p, count); const s = await snapshot(p);
      check(s.saved[today].br.some(b => b.id === 'ann' && b.sh === 'lunch' && b.at === 840 && b.len === 45), label('break correction preserves full duration and publishes only after Save'));
    });
    await task('Spread 30-minute breaks every15 minutes and Save', async count => {
      await tools(p, count); const service = p.locator(action('spread-service')); if (await service.inputValue() !== 'lunch') await choose(p, action('spread-service'), 'lunch', count);
      const start = p.locator(action('spread-start')); if (!['12:00', '720'].includes(await start.inputValue())) await control(p, action('spread-start'), await start.getAttribute('type') === 'time' ? '12:00' : '720', count);
      const len = p.locator(action('spread-length')); if (await len.inputValue() !== '30') await choose(p, action('spread-length'), '30', count);
      const groups = p.locator(action('spread-groups')); if (await groups.inputValue() !== '1') await choose(p, action('spread-groups'), '1', count);
      await choose(p, action('spread-gap'), '15', count); await press(p, action('spread'), count);
      const draft = await snapshot(p); check(draft.drafts[today].br.some(b => b.id === 'bo' && b.len === 150) && draft.drafts[today].br.some(b => b.id === 'ann' && b.sh === 'dinner' && b.at === 1140), label('Spread retains long splits and other-service breaks'));
      await stage(p, 'review', count); const warning = await p.locator('#preview-root').innerText(); check(/overlap|check[^\n]*(split|break)|split[^\n]*break/i.test(warning), label('the retained split overlapping a spread meal break has an explicit warning'));
      await save(p, count);
    });
    await task('Select another date in the loaded week', async count => { await date(p, tomorrow, count); const s = await snapshot(p); check(s.selectedDate === tomorrow && !s.drafts[tomorrow].on.some(o => o.id === 'ann'), label('date selection uses only that date’s selected people')); });
    await task('Select another row service view', async (count, before) => { await choose(p, person('service', 'ann'), 'dinner', count); const s = await snapshot(p); check(s.rowServiceViews[today].ann === 'dinner' && same(s.drafts, before.drafts) && same(s.saved, before.saved), label('service VIEW change never adds/removes membership or saves')); });

    await reset(); const savedBefore = await snapshot(p); await breakEditor(p, 'ann', 'lunch');
    const time = p.locator(person('break-time', 'ann', '[data-service="lunch"][data-index="0"]'));
    const boardBefore = await p.locator('.live-board').innerText(); await control(p, person('break-time', 'ann', '[data-service="lunch"][data-index="0"]'), await time.getAttribute('type') === 'time' ? '15:00' : '900');
    const draftBreak = await snapshot(p); check(same(draftBreak.saved, savedBefore.saved) && await p.locator('.live-board').innerText() === boardBefore, label('saved break board ignores an unfinished break-time edit'));
    await p.screenshot({ path: path.join(OUT, `preview-${option}-draft-break-390.png`), fullPage: true });

    await reset(); const beforeView = await snapshot(p); await choose(p, person('service', 'ann'), 'dinner'); await choose(p, person('service', 'sam'), 'smoker');
    let s = await snapshot(p); check(same(s.drafts, beforeView.drafts) && same(s.saved, beforeView.saved) && s.rowServiceViews[today].ann === 'dinner' && s.rowServiceViews[today].sam === 'smoker', label('two row-service view selections remain independent from membership'));
    await sectionChange(p, 'ann', 'lunch', ''); s = await snapshot(p); check(membership(s.drafts[today], 'ann', 'lunch').sec === '' && s.drafts[today].br.some(b => b.id === 'ann' && b.sh === 'lunch' && b.at === 825), label('No section keeps that service membership and break'));
    await choose(p, person('service', 'gia'), 'lunch'); check(await p.locator(person('section', 'gia', '[data-service="lunch"]')).isDisabled(), label('off-service section cannot silently masquerade as No section'));
    await press(p, person('add-service', 'gia')); s = await snapshot(p); check(!!membership(s.drafts[today], 'gia', 'lunch') && !!membership(s.drafts[today], 'gia', 'dinner'), label('explicit Add service retains another-service membership'));
    await breakEditor(p, 'gia', 'lunch'); await press(p, person('remove-service', 'gia')); s = await snapshot(p); check(!membership(s.drafts[today], 'gia', 'lunch') && !!membership(s.drafts[today], 'gia', 'dinner') && await p.locator('.person-row[data-person="gia"]').count() === 1, label('explicit removal affects only the viewed service'));

    await reset(); await sectionChange(p, 'ann', 'dinner', 'pans'); await date(p, tomorrow); const futureSaved = (await snapshot(p)).saved[tomorrow]; await sectionChange(p, 'jo', 'lunch', 'grill'); await date(p, today); s = await snapshot(p);
    check(s.rowServiceViews[today].ann === 'dinner' && membership(s.drafts[today], 'ann', 'dinner').sec === 'pans' && membership(s.drafts[tomorrow], 'jo', 'lunch').sec === 'grill', label('date switches retain separate drafts and person-service contexts'));
    check(same(s.saved[today], savedBefore.saved[today]) && same(s.saved[tomorrow], futureSaved), label('date navigation never publishes either draft'));

    for (const mode of ['hold', 'fail', 'conflict']) {
      await reset(); await sectionChange(p, 'ann', 'lunch', 'grill'); await api(p, 'setSaveMode', mode); const unsent = await snapshot(p); await stage(p, 'review'); await press(p, action('save'));
      if (mode === 'hold') {
        await until(p, () => preview.snapshot().saveState.status === 'saving'); s = await snapshot(p);
        check(same(s.saved, unsent.saved) && s.saveState.status === 'saving' && await p.locator(action('save')).isDisabled(), label('held Save stays pending, unpublished and guarded against repetition'));
        await p.evaluate(() => { const save = document.querySelector('[data-action="save"]'); save.click(); save.click(); }); await api(p, 'releaseSave'); await until(p, () => preview.snapshot().saveState.status !== 'saving'); s = await snapshot(p);
        check(s.version[today] === unsent.version[today] + 1 && s.saveState.status === 'saved', label('repeated held Save acknowledges exactly one version'));
      } else {
        await until(p, () => preview.snapshot().saveState.status !== 'saving'); s = await snapshot(p);
        const statusContrast = await contrast(p); evidence.stateChecks.push({ option, state: mode, contrast: statusContrast }); check(!statusContrast.failures.length, label(`${mode} status text retains readable contrast`), statusContrast.failures);
        await p.screenshot({ path: path.join(OUT, `preview-${option}-${mode}-save-390.png`) });
        check(s.saveState.status === mode && same(s.drafts[today].on, unsent.drafts[today].on) && same(s.drafts[today].br, unsent.drafts[today].br), label(`${mode} Save retains the unsent draft and truthful failure state`));
        if (mode === 'fail') { check(same(s.saved, unsent.saved), label('failed Save does not publish the draft')); await api(p, 'setSaveMode', 'ok'); await save(p); s = await snapshot(p); check(s.saveState.status === 'saved' && membership(s.saved[today], 'ann', 'lunch').sec === 'grill', label('retry acknowledges the retained draft only after success')); }
        else { const beforeRefresh = s; await press(p, action('refresh')); check(same((await snapshot(p)).drafts[today], beforeRefresh.drafts[today]), label('conflict Refresh keeps the losing draft until a second deliberate tap')); await press(p, action('refresh')); s = await snapshot(p); check(same(s.drafts[today].on, s.saved[today].on), label('confirmed conflict recovery reloads the simulated newer saved plan')); }
      }
    }
    await reset(); await stage(p, 'assignments'); const beforeKeyboard = await snapshot(p), native = p.locator(person('service', 'ann')); await native.focus(); await native.press('ArrowDown'); await native.press('Enter'); await frame(p); s = await snapshot(p);
    check(s.rowServiceViews[today].ann !== 'lunch' && same(s.drafts, beforeKeyboard.drafts), label('keyboard can choose the row’s service without a pointer'));
    const focused = await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-action')); check(focused === 'service', label('row-service redraw retains keyboard focus'));
    for (const scenario of ['loading', 'failed-read', 'empty', 'unknown', 'malformed-breaks', 'past']) {
      await reset(); await api(p, 'setScenario', scenario); const text = await p.locator('#preview-root').innerText(), saves = p.locator(action('save'));
      check(scenario === 'empty' ? /empty|nobody|no (people|staff)|who.s working/i.test(text) : scenario === 'past' ? /read.only|past/i.test(text) : scenario === 'loading' ? /checking|loading/i.test(text) : scenario === 'failed-read' ? /could not|unavailable|failed/i.test(text) : /check|unknown|could not|unavailable/i.test(text), label(`${scenario} state uses explicit words instead of an invented confirmed count`));
      if (['loading', 'failed-read', 'past'].includes(scenario)) check(!await saves.count() || await saves.first().isDisabled(), label(`${scenario} state cannot save an unchecked or past plan`));
    }
    await reset(); check(!p.errors.length, label('all exercised preview tasks have no browser errors'), p.errors);
  } finally { await close(p); }
}

async function controlContrast(p, selector) {
  const el = p.locator(selector).first(); await el.scrollIntoViewIfNeeded(); await el.focus(); await p.keyboard.press('Tab'); await p.keyboard.press('Shift+Tab'); await frame(p);
  return el.evaluate(e => {
    const parse = value => { const m = value.match(/rgba?\(([^)]+)\)/), a = m && m[1].split(/[ ,/]+/).map(Number); return a ? [a[0], a[1], a[2], a.length > 3 ? a[3] : 1] : null; };
    const over = (a, b) => [0,1,2].map(i => a[i] * a[3] + b[i] * (1 - a[3])).concat(1);
    const lum = c => c.slice(0,3).map(x => x/255).map(x => x<=.04045 ? x/12.92 : ((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
    const ratio = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
    const background = node => { const chain=[]; for(let a=node;a;a=a.parentElement)chain.unshift(a); return chain.reduce((bg,a)=>{const c=parse(getComputedStyle(a).backgroundColor); return c?over(c,bg):bg;},[255,255,255,1]); };
    const s=getComputedStyle(e), outer=background(e.parentElement), fill=background(e), border=parse(s.borderTopColor), outline=parse(s.outlineColor), boundary=border&&border[3]&&parseFloat(s.borderTopWidth)>0?over(border,outer):fill;
    return { action:e.dataset.action,label:e.getAttribute('aria-label')||e.textContent.trim(),outer,fill,border:s.borderTopColor,borderWidth:s.borderTopWidth,boundaryContrast:ratio(boundary,outer),outline:s.outlineColor,outlineStyle:s.outlineStyle,outlineWidth:parseFloat(s.outlineWidth),focusVisible:e.matches(':focus-visible'),focused:document.activeElement===e,focusContrast:outline?ratio(over(outline,outer),outer):null };
  });
}
async function verifyFocusAndOcclusion() {
  evidence.focusControls=[]; evidence.occlusion=[];
  for(const width of[390,768,1280]){
    const p=await open('a',width); try{
      await sectionChange(p,'ann','lunch','grill');
      for(const selector of[person('service','ann'),person('section','ann','[data-service="lunch"]'),action('date','[data-date="2026-11-10"]'),action('save'),action('toggle-board')]){
        const result=await controlContrast(p,selector); evidence.focusControls.push({design:'a',width,...result});
        check(result.boundaryContrast>=3 && result.focusContrast>=3 && result.outlineWidth>=3 && result.focusVisible && result.focused,`Shared controls/${width}/${result.action}: boundary and visible focus contrast`,result);
      }
      check(await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),`Shared controls/${width}: reduced-motion preference honoured`);
    }finally{await close(p);}
  }
  for(const stress of['normal','xlarge','long']){
    const p=await open('c',390); try{
      if(stress!=='normal')await p.evaluate(()=>{document.documentElement.dataset.text='xlarge';});
      if(stress==='long')await api(p,'stressLongLabels');
      await p.evaluate(()=>{if(document.activeElement)document.activeElement.blur();scrollTo(0,0);}); await frame(p);
      const target=p.locator('.person-row').last().locator('[data-action="service"]'), id=await target.getAttribute('data-person');
      let tabs=0;
      for(;tabs<100;tabs++){if(await p.evaluate(id=>document.activeElement&&document.activeElement.dataset.action==='service'&&document.activeElement.dataset.person===id,id))break;await p.keyboard.press('Tab');}
      const result={stress,id,tabs};
      for(const name of['service','section']){
        if(name==='section')await p.keyboard.press('Tab'); await frame(p);
        const box=await p.evaluate(()=>{const e=document.activeElement,r=e.getBoundingClientRect(),dock=document.querySelector('.save-area').getBoundingClientRect(),nav=document.querySelector('.phone-nav').getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{action:e.dataset.action,top:r.top,bottom:r.bottom,saveTop:dock.top,navTop:nav.top,hit:e===hit||e.contains(hit),focusVisible:e.matches(':focus-visible')};});
        result[name]=box; check(box.action===name&&box.top>=0&&box.bottom<=Math.min(box.saveTop,box.navTop)+.5&&box.hit&&box.focusVisible,`C/${stress}/last ${name}: keyboard reaches an unobscured control`,box);
      }
      for(const name of['service','section']){
        const el=p.locator(`.person-row[data-person="${id}"] [data-action="${name}"]`); await el.evaluate(e=>e.scrollIntoView({block:'center'})); await frame(p);
        await el.click({timeout:2500}); await p.keyboard.press('Escape');
        check(true,`C/${stress}/last ${name}: pointer click reaches the control after deliberate scroll`);
      }
      await p.screenshot({path:path.join(OUT,`preview-c-last-row-${stress}-390.png`)}); evidence.occlusion.push(result);
      check(!p.errors.length,`C/${stress}: last-row keyboard/pointer path has no browser errors`,p.errors);
    }finally{await close(p);}
  }
  evidence.limitations.push('Control contrast samples computed rendered colours and native focus outlines in Chromium; OS-native option-menu rendering, touch motor performance and full WCAG conformance are not established.');
}

async function verifyAdditionalContexts() {
  evidence.focusControls=[];
  for(const option of['b','c'])for(const width of[390,768,1280]){
    const p=await open(option,width);try{
      await sectionChange(p,'ann','lunch','grill');
      if(option==='b')await stage(p,'review');
      const selectors=option==='b'?[action('stage','[data-stage="review"]'),action('save')]:[action('toggle-dates'),action('save')];
      for(const selector of selectors){const result=await controlContrast(p,selector);evidence.focusControls.push({design:option,width,...result});check(result.boundaryContrast>=3&&result.focusContrast>=3&&result.outlineWidth>=3&&result.focusVisible&&result.focused,`${option}/${width}/${result.action}: new-context boundary and visible focus contrast`,result);}
      check(!p.errors.length,`${option}/${width}: new-context controls have no browser errors`,p.errors);
    }finally{await close(p);}
  }
}

async function verifyStageBoundary() {
  evidence.stageBoundaries=[];
  const widths=(process.env.TEAM_STAGE_WIDTHS||'401,700,701').split(',').map(Number);
  for(const frameType of['team','chef'])for(const width of widths){
    const p=await open('b',width,frameType);try{
      await p.evaluate(()=>{document.documentElement.dataset.text='xlarge';});await frame(p);
      const geometry=await measure(p);evidence.stageBoundaries.push({frame:frameType,width,stageLabels:geometry.stageLabels,firstRowTop:geometry.firstRowTop,completeInitialRows:geometry.completeInitialRows,errors:p.errors});
      check(geometry.stageLabels.length>0&&geometry.stageLabels.every(x=>x.contained)&&geometry.stageLabels.every(x=>x.button.height>=44)&&!p.errors.length,`B/${frameType}/${width}: largest-text visible stage labels fit actual buttons`,geometry.stageLabels.filter(x=>x.label==='Assignments'));
    }finally{await close(p);}
  }
}

async function main() {
  if (!process.argv.includes('--ready')) throw Error('Captures require explicit --ready after the lead confirms prototypes are ready.');
  const fingerprint = () => Object.fromEntries(['preview.js', 'preview.css', 'preview.html'].map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT, name))).digest('hex')]));
  evidence.environment.prototypeHashes = fingerprint();
  const evidenceName = process.argv.includes('--stage-boundary') ? 'stage-boundary.json' : process.argv.includes('--stage-containment') ? 'b-stage-containment.json' : process.argv.includes('--extra-controls') ? 'new-context-controls.json' : process.argv.includes('--focus-only') ? 'focus-controls.json' : 'preview-verification.json';
  server = http.createServer((req, res) => { const u = new URL(req.url, 'http://localhost'), rel = decodeURIComponent(u.pathname), file = path.resolve(ROOT, '.' + rel); if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; } fs.readFile(file, (err, bytes) => { if (err) { res.writeHead(404); res.end(); return; } const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' }; res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(bytes); }); });
  await new Promise(r => server.listen(PORT, '127.0.0.1', r)); browser = await chromium.launch({ executablePath: process.env.TEAM_PREVIEW_CHROME || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try { if (process.argv.includes('--stage-boundary')) { await verifyStageBoundary(); } else if (process.argv.includes('--stage-containment')) { await verifyStageContainment(); } else if (process.argv.includes('--extra-controls')) { await verifyAdditionalContexts(); } else if (process.argv.includes('--focus-only')) { await verifyFocusAndOcclusion(); } else if (process.argv.includes('--behaviour-smoke')) { evidence.environment.status = 'Behaviour smoke while prototypes are being refined'; for (const option of ['a', 'b', 'c']) await verifyInteractions(option); } else if (process.argv.includes('--smoke')) { evidence.environment.status = 'Smoke snapshot while prototypes are being refined'; for (const option of ['a', 'b', 'c']) for (const width of [390, 1280]) await scene(option, width); } else { for (const option of ['a', 'b', 'c']) { for (const frameType of ['team', 'chef']) { for (const width of [390, 768, 1280]) await scene(option, width, 'normal', false, frameType); await scene(option, 390, 'xlarge', false, frameType); await scene(option, 390, 'xlarge', true, frameType); } await verifyInteractions(option); } } }
  finally { if (activePage) await close(activePage).catch(() => {}); await browser.close(); await new Promise(r => server.close(r)); fs.writeFileSync(path.join(OUT, evidenceName), JSON.stringify(evidence, null, 2) + '\n'); }
  check(same(fingerprint(), evidence.environment.prototypeHashes), 'All captures used one unchanged prototype source set'); fs.writeFileSync(path.join(OUT, evidenceName), JSON.stringify(evidence, null, 2) + '\n');
  const fails = evidence.adversarial.filter(x => !x.pass); console.log(JSON.stringify({ scenes: evidence.measurements.length, checks: evidence.adversarial.length, failures: fails }, null, 2)); if (fails.length) process.exitCode = 1;
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
