// Roster and focus: each row has its own service/section pickers and named Edit breaks workbench.
// All people, plans, PIN sessions and failures below use the browser's Firebase stand-in.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), tomorrow = L.ymd(new Date(L.NOW + 86400000));
const CFG = key('config', 'main'), TEAM = key('team', today);
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: 'ann', name: 'Ann', role: 'head', active: true, add: true, tick: true, del: true },
  { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true }
];
const shifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }];
const sections = [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }, { id: 'larder', name: 'Larder' }];
const plan = day => ({ day, on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'bo', sh: 'lunch', sec: 'larder' }, { id: 'bo', sh: 'dinner', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'pans' }, { id: 'sam', sh: 'dinner', sec: 'grill' }],
  br: [{ id: 'ann', sh: 'lunch', at: 825, len: 45 }, { id: 'ann', sh: 'dinner', at: 1140, len: 30 }, { id: 'sam', sh: 'lunch', at: 870, len: 30 }, { id: 'sam', sh: 'dinner', at: 1140, len: 150 }],
  v: 1, by: 'sam', at: L.NOW - 3600000, upd: L.NOW - 3600000 });
const fixture = () => ({ [CFG]: { people, headId: 'ann', sousIds: ['sam', 'ann'], staffIds: ['sam', 'ann', 'bo'], kitShifts: shifts, kitSecs: sections }, [TEAM]: plan(today), [key('team', tomorrow)]: plan(tomorrow) });
const fullDate = d => new Date(d + 'T12:00:00+10:00').toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'long', day: 'numeric', month: 'long' });
const click = async (p, s) => { await p.locator(s).first().click(); await L.settle(p, 150); };
const person = (p, id) => p.locator('aside.tm-detail-workbench[data-id="' + id + '"]');
const focused = (p, id) => person(p, id).count().then(n => n === 1);
const field = k => 'select[data-k="' + k + '"]';
const value = (p, k) => p.locator(field(k)).inputValue();
const saved = p => p.evaluate(k => __fake.dump()[k], TEAM);
const readCount = p => p.evaluate(() => __fake.reads.filter(k => /\/(team|teamsum)(\/|$)/.test(k)).length);
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('.tm-work [data-p="tm-whole"]'), null, 7000); }
async function details(p, id) { if (!await focused(p, id)) await click(p, '[data-p="tm-focus"][data-id="' + id + '"]'); }
async function pick(p, k, v) { if (!k.startsWith('tm-sec:') && !k.startsWith('tm-row-sh:')) await details(p, k.split(':')[1]); await L.pick(p, field(k), String(v)); }
const service = async (p, id, sh) => { if (await p.locator('[data-p="tm-whole"]').getAttribute('aria-pressed') === 'true') await click(p, '[data-p="tm-whole"]'); await pick(p, 'tm-row-sh:' + id, sh); };
async function membership(p, id, sh) { await service(p, id, sh); await details(p, id); await click(p, '[data-p="tm-on"][data-id="' + id + '"][data-sh="' + sh + '"]'); }
async function chefPlan(p) { await click(p, '[data-p="c-group"][data-g="team"]'); const tab = p.locator('[data-p="c-tab"][data-t="plan"]'); if (await tab.getAttribute('aria-pressed') !== 'true') await tab.click(); await ready(p); }
async function day(p, d) {
  if (!await p.locator('.tm-weeknav').isVisible()) await click(p, '[data-p="tm-date-toggle"]');
  for (let n = 0; n < 3 && !await p.locator('[data-p="tm-day"][data-day="' + d + '"]').count(); n++) await click(p, '[data-p="tm-week-next"]');
  await click(p, '[data-p="tm-day"][data-day="' + d + '"]'); await ready(p);
}
async function assertQuiet(p, label) {
  const roster = await p.locator('.tm-people').evaluateAll(lists => lists.map(e => ({ names: [...e.querySelectorAll('.tm-person-name')].map(n => n.textContent), open: e.querySelectorAll('details[open]').length, text: e.innerText })));
  ok(roster.length === 1 && roster[0].names.slice().sort().join() === 'Ann,Bo,Sam' && roster[0].open === 0, label + ': one collapsed roster contains each person once');
  ok(roster.length === 1 && people.every(x => (roster[0].text.match(new RegExp(x.name, 'g')) || []).length === 1) && !/Choose a section/.test(roster[0].text), label + ': collapsed rows avoid repeated names and repeated assignment instructions');
  ok(await p.locator('.tm-worksheet').count() === 1 && !await p.locator('[data-p="tm-section"], [data-p="tm-assign"]').count(), label + ': one person worksheet replaces global section-selection mode');
  ok(await p.locator('.tm-person-row').evaluateAll(es => es.length === 3 && es.every(e => { const sections = e.querySelectorAll('select[data-k^="tm-sec:"]'), services = e.querySelectorAll('select[data-k^="tm-row-sh:"]'); return sections.length === 1 && services.length === 1 && !sections[0].closest('details') && !sections[0].querySelector('option[value="__off"]') && !!sections[0].querySelector('option[value=""]'); })), label + ': each person has one inline service picker and one section picker with a distinct no-section choice');
  ok(await p.locator('.tm-person-row').count() === 3 && await p.locator('.tm-details, .tm-detail-workbench[data-id]').count() === 0 && await p.locator('[data-p="tm-focus"]').evaluateAll(es => es.length === 3 && es.every(e => e.textContent.trim() === 'Edit breaks')), label + ': every row has explicit Edit breaks and starts without another open editor');
  ok(await p.locator('[data-p="tm-save"]').count() === 1 && await p.locator('[data-p="tm-save"]').innerText() === 'Save ' + fullDate(today) && await p.evaluate(() => {
    const roster = document.querySelector('.tm-people'), save = document.querySelector('.tm-focus-save'), book = document.querySelector('.tm-notebook');
    return !!save && !!book && book.contains(save) && !!(roster.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING) && !!save.querySelector('[data-p="tm-save"]');
  }), label + ': the single dated Save follows the roster within the notebook save area');
}

async function layouts(p, label) {
  for (const width of [390, 768, 1280]) for (const size of ['normal', 'xlarge']) {
    await p.setViewportSize({ width, height: 900 }); await p.evaluate(s => document.documentElement.dataset.text = s, size); await L.settle(p, 150);
    const small = await p.locator('.tm-person-head .ux-picker-trigger, [data-p="tm-focus"], .tm-weeknav button, [data-p="tm-date-toggle"], [data-p="tm-save"], .tm-batch > summary').evaluateAll(es => es.filter(e => e.getClientRects().length).map(e => ({ label: e.textContent.trim(), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })).filter(e => e.w < 43.5 || e.h < 43.5));
    ok(!await L.overflow(p) && !small.length, label + ' ' + width + ' ' + size + ': no sideways page scroll and visible planner controls remain 44 px ' + JSON.stringify(small));
    if (width === 1280 && size === 'normal') ok(await p.locator('.tm-nbook').evaluate(e => { const work = e.querySelector('.tm-focus-grid'), spine = e.querySelector('.tm-nspine'); return !!work && e.querySelectorAll('.tm-worksheet').length === 1 && e.querySelectorAll('.tm-people').length === 1 && e.querySelectorAll('.tm-detail-workbench').length === 1 && work.getBoundingClientRect().width >= e.getBoundingClientRect().width - 60 && (!spine || getComputedStyle(spine).display === 'none'); }), label + ': desktop writing region spans the notebook with one roster and one contextual workbench');
  }
}

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), wait: 1000 }); await ready(p);
  await assertQuiet(p, 'Direct sous-chef');
  ok(await value(p, 'tm-sec:ann') === 'grill' && /13:45|14:30/.test(await p.locator('.tm-person-row[data-id="ann"]').innerText()), 'collapsed row: the current section and planned break remain legible');
  const reads = await readCount(p), original = await saved(p);
  await pick(p, 'tm-sec:ann', 'pans');
  ok(await value(p, 'tm-sec:ann') === 'pans' && !await focused(p, 'ann'), 'section move: the inline picker changes the draft without opening detailed controls');
  await pick(p, 'tm-sec:ann', '');
  await details(p, 'ann');
  ok(await value(p, 'tm-sec:ann') === '' && await value(p, 'tm-at:ann:0') === '825' && await p.locator('[data-p="tm-on"][data-id="ann"]').getAttribute('aria-pressed') === 'true', 'clear section: attendance and that shift\'s break are retained');
  await details(p, 'ann');
  ok(await focused(p, 'ann') && !await focused(p, 'sam') && !await focused(p, 'bo'), 'Edit breaks: only the selected person opens');
  await pick(p, 'tm-at:ann:0', 840);
  ok(await value(p, 'tm-at:ann:0') === '840' && await focused(p, 'ann'), 'visible picker: an actual break-time choice changes the draft and keeps its workbench open');
  await pick(p, 'tm-sec:ann', 'grill');
  ok(await focused(p, 'ann') && await value(p, 'tm-at:ann:0') === '840', 'section redraw: the open person and unfinished break edit survive');
  await service(p, 'ann', 'dinner');
  ok(await focused(p, 'ann') && await value(p, 'tm-sec:ann') === 'pans' && await value(p, 'tm-at:ann:0') === '1140' && await value(p, 'tm-row-sh:sam') === 'lunch', 'service switch: Ann\'s workbench shows Dinner without changing another person\'s service or breaks');
  await service(p, 'sam', 'dinner');
  await details(p, 'sam');
  ok(await value(p, 'tm-len:sam:0') === '150', 'Dinner: the original long split remains available in Sam\'s controls');
  await service(p, 'ann', 'lunch'); await details(p, 'ann');
  ok(await focused(p, 'ann') && !await focused(p, 'sam') && await value(p, 'tm-at:ann:0') === '840' && await value(p, 'tm-row-sh:sam') === 'dinner', 'service return: Lunch restores Ann\'s draft while Sam retains his independent Dinner view');
  await day(p, tomorrow);
  ok(!await focused(p, 'ann'), 'date switch: another date starts without today\'s focused person');
  await details(p, 'bo'); await day(p, today);
  ok(await focused(p, 'ann') && !await focused(p, 'bo') && await value(p, 'tm-at:ann:0') === '840', 'date return: the original focused person and break draft are restored');
  await day(p, tomorrow);
  ok(await focused(p, 'bo') && !await focused(p, 'ann'), 'second date return: the future date restores only its own focused person');
  await day(p, today);
  await membership(p, 'bo', 'lunch');
  ok(await p.locator(field('tm-sec:bo')).isDisabled() && await p.locator('[data-p="tm-on"][data-id="bo"]').getAttribute('aria-pressed') === 'false', 'explicit removal: Remove Lunch changes only the selected membership');
  await membership(p, 'bo', 'lunch');
  ok(await value(p, 'tm-sec:bo') === 'larder' && await p.locator('[data-p="tm-on"][data-id="bo"]').getAttribute('aria-pressed') === 'true' && await focused(p, 'bo'), 'explicit Add: Lunch returns with its known section and the selected person stays focused');
  await details(p, 'ann');
  await p.fill('[data-k="tm-q"]', 'Ann'); await L.settle(p, 300);
  await p.evaluate(() => { const q = document.querySelector('[data-k="tm-q"]'); q.focus(); q.setSelectionRange(1, 2); window.__quietSearch = q; window.__quietDetails = document.querySelector('.tm-detail-workbench[data-id="ann"]'); });
  await p.clock.fastForward(60000); await L.settle(p, 180);
  ok(await p.evaluate(() => document.querySelector('.tm-detail-workbench[data-id="ann"]') === __quietDetails && __quietDetails.isConnected), 'minute tick: the focused workbench keeps its exact DOM node');
  await p.evaluate(() => dispatchEvent(new Event('focus'))); await L.settle(p, 180);
  const clockState = await p.evaluate(() => ({ focus: document.activeElement === __quietSearch, search: document.querySelector('[data-k="tm-q"]') === __quietSearch, value: __quietSearch.value === 'Ann', selection: __quietSearch.selectionStart === 1 && __quietSearch.selectionEnd === 2, details: document.querySelector('.tm-detail-workbench[data-id="ann"]') === __quietDetails, open: __quietDetails.isConnected }));
  ok(Object.values(clockState).every(Boolean), 'clock paint: typing, focus, selection and the actual search node are retained ' + JSON.stringify(clockState));
  await p.setViewportSize({ width: 768, height: 900 }); await L.settle(p, 150);
  ok(await focused(p, 'ann') && await value(p, 'tm-at:ann:0') === '840', 'resize: the focused workbench and draft remain intact');
  await p.fill('[data-k="tm-q"]', ''); await L.settle(p, 150);
  await membership(p, 'ann', 'lunch');
  ok(await p.locator(field('tm-sec:ann')).isDisabled() && !await p.locator(field('tm-at:ann:0')).count(), 'explicit removal: Remove Lunch removes that service and its breaks');
  await service(p, 'ann', 'dinner');
  ok(await value(p, 'tm-sec:ann') === 'pans' && await value(p, 'tm-at:ann:0') === '1140', 'inline removal: Dinner and its meal break remain unchanged');
  await membership(p, 'ann', 'lunch'); await pick(p, 'tm-sec:ann', 'grill');
  await details(p, 'ann'); await click(p, '[data-p="tm-addbr"][data-id="ann"]');
  await pick(p, 'tm-at:ann:0', 840); await pick(p, 'tm-len:ann:0', 45);
  await click(p, '[data-p="tm-on"][data-id="ann"]');
  ok(await p.locator('[data-p="tm-on"][data-id="ann"]').getAttribute('aria-pressed') === 'false' && !await p.locator(field('tm-at:ann:0')).count(), 'membership removal: removing Lunch also removes its Lunch break controls');
  await service(p, 'ann', 'dinner');
  ok(await value(p, 'tm-sec:ann') === 'pans' && await value(p, 'tm-at:ann:0') === '1140', 'membership removal: the person\'s other shift and break remain intact');
  await click(p, '[data-p="tm-whole"]');
  ok(/Dinner/.test(await p.locator('.tm-dayperson').filter({ hasText: 'Ann' }).innerText()) && !/Lunch/.test(await p.locator('.tm-dayperson').filter({ hasText: 'Ann' }).innerText()), 'Whole day: the shared draft reviews attendance across shifts');
  ok(await readCount(p) === reads && JSON.stringify(await saved(p)) === JSON.stringify(original), 'local work: disclosures, assignment, dates, shifts, resize and clock add no reads or writes');
  await service(p, 'ann', 'lunch'); await details(p, 'ann');
  await p.evaluate(() => { __fake.mode = 'hold'; }); await click(p, '[data-p="tm-save"]');
  const detailsHeld = await p.locator('[data-p="tm-focus"][data-id="ann"]').isDisabled();
  await p.focus('[data-k="tm-q"]');
  await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
  await L.waitFor(p, k => __fake.dump()[k].v === 2, TEAM, 6000); await L.settle(p, 150);
  ok(detailsHeld && await focused(p, 'ann') && await p.evaluate(() => document.activeElement.matches('[data-k="tm-q"]')), 'Save acknowledgement: Edit breaks is disabled while pending; the person and enabled search focus survive the confirmed redraw');
  ok(!(await saved(p)).on.some(x => x.id === 'ann' && x.sh === 'lunch') && (await saved(p)).br.some(x => x.id === 'ann' && x.sh === 'dinner' && x.at === 1140) && /saved/i.test(await p.locator('.tm-save').innerText()), 'dated Save: the one shared Save publishes membership and preserves the other shift\'s break');
  ok(!p.errors.length, 'editing journey: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // An empty day can add several people and services together, before individual worksheet corrections.
  const empty = fixture(); delete empty[TEAM];
  p = await L.open(b, '#/team', { who: 'sam', extra: empty, wait: 900 }); await ready(p);
  const quickPerson = id => 'input[data-k="tm-quick-person:' + id + '"]';
  const quickShift = sh => 'input[data-k="tm-quick-shift:' + sh + '"]';
  ok(!await p.locator('.tm-person-row').count() && await p.locator(quickPerson('ann')).isVisible() && await p.locator('[data-p="tm-quick-add"]').isDisabled(), 'empty day: staff selection replaces a blank worksheet and Add requires a person');
  ok(await p.locator(quickShift('lunch')).isChecked() && !await p.locator(quickShift('dinner')).isChecked(), 'empty day: the currently selected service is preselected explicitly');
  const emptyReads = await readCount(p), emptyWrites = await p.evaluate(() => __fake.writes.length);
  await p.locator(quickPerson('ann')).check(); await p.locator(quickPerson('bo')).check(); await p.locator(quickShift('dinner')).check();
  await click(p, '[data-p="tm-quick-add"]');
  ok(await p.locator('.tm-person-row').count() === 2 && await value(p, 'tm-sec:ann') === '' && await value(p, 'tm-sec:bo') === '' && !await p.locator(field('tm-sec:sam')).count() && await p.locator(quickPerson('sam')).count() === 1, 'bulk Add: selected staff enter Lunch together while unselected people stay in the chooser');
  await pick(p, 'tm-sec:ann', 'grill'); await service(p, 'ann', 'dinner'); await service(p, 'bo', 'dinner');
  ok(await value(p, 'tm-sec:ann') === '' && await value(p, 'tm-sec:bo') === '', 'bulk Add: both selected people are also on the explicitly chosen Dinner service');
  await pick(p, 'tm-sec:ann', 'pans'); await details(p, 'ann'); await click(p, '[data-p="tm-addbr"][data-id="ann"]');
  await pick(p, 'tm-at:ann:0', 1140); await pick(p, 'tm-len:ann:0', 45);
  await click(p, '[data-p="tm-whole"]');
  const addedDay = await p.locator('.tm-dayperson').filter({ hasText: 'Ann' }).innerText();
  ok(/Lunch/.test(addedDay) && /Grill/.test(addedDay) && /Dinner/.test(addedDay) && /Pans/.test(addedDay) && /19:00/.test(addedDay), 'bulk Add: sections and a service-specific break remain editable after the quick membership step');
  ok(await readCount(p) === emptyReads && await p.evaluate(n => __fake.writes.length === n, emptyWrites) && !await saved(p), 'bulk Add: names, services, sections and breaks remain one local draft until Save');
  await click(p, '[data-p="tm-save"]'); await L.waitFor(p, k => !!__fake.dump()[k], TEAM, 6000);
  const added = await saved(p);
  ok(added.on.length === 4 && added.on.every(o => ['ann', 'bo'].includes(o.id) && o.sec !== '__off') && added.br.some(x => x.id === 'ann' && x.sh === 'dinner' && x.at === 1140 && x.len === 45), 'bulk Add Save: one dated record persists only the chosen people, both services and the corrected break');
  await service(p, 'ann', 'lunch');
  ok(!await p.locator('.tm-quick-add').isVisible() && await p.locator('.tm-focus-toolbar [data-p="tm-add-staff"]').isVisible(), 'nonempty day: adding another group remains discoverable through the labelled Add staff control');
  ok(!p.errors.length, 'bulk Add: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // The shared page must stay quiet in both chefs' actual entry points and at supported sizes.
  for (const route of ['#/team', '#/chef']) for (const who of ['sam', 'ann']) {
    p = await L.open(b, route, { who, extra: fixture(), wait: 900 });
    if (route === '#/chef') await chefPlan(p); else await ready(p);
    const label = route + ' ' + who;
    await assertQuiet(p, label);
    await layouts(p, label);
    await p.focus('[data-p="tm-focus"][data-id="ann"]'); await p.keyboard.press('Enter'); await L.settle(p, 150);
    ok(await focused(p, 'ann') && await p.evaluate(() => document.activeElement.matches('[data-p="tm-focus"][data-id="ann"]')), label + ': keyboard opens the named workbench without moving focus');
    ok(!p.errors.length && await p.evaluate(() => !__fake.refused.length), label + ': no browser errors or refused reads');
    await p.context().close();
  }
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: fixture(), adminPage: '', wait: 1200 });
  await p.evaluate(() => location.hash = '#/team'); await ready(p);
  await assertQuiet(p, 'Verified admin entry'); await layouts(p, 'Verified admin entry');
  ok(await p.evaluate(() => LK_PREP.privateAccess() && !__fake.refused.length) && !p.errors.length, 'verified admin: the daily head PIN session and device grant can use the shared planner');
  await p.context().close();
  p = await L.open(b, '#/team', { who: 'bo', extra: fixture(), wait: 900 });
  ok(!await p.locator('.tm-detail-workbench, .tm-person-section, [data-p="tm-save"], .tm-weeknav').count(), 'staff: direct entry exposes no planner or edit controls');
  await p.evaluate(() => location.hash = '#/chef'); await L.settle(p, 300);
  ok(!await p.locator('.tm-detail-workbench, .tm-person-section, [data-p="tm-save"], [data-p="c-tab"][data-t="plan"]').count() && !p.errors.length, 'staff: the chef route cannot expose the Plan editor');
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
