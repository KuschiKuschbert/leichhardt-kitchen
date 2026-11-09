// Quiet notebook: one roster, section-first assignment and a person's own Edit breaks controls.
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
const plan = day => ({ day, on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'ann', sh: 'dinner', sec: 'pans' }, { id: 'bo', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'pans' }, { id: 'sam', sh: 'dinner', sec: 'grill' }],
  br: [{ id: 'ann', sh: 'lunch', at: 825, len: 45 }, { id: 'ann', sh: 'dinner', at: 1140, len: 30 }, { id: 'sam', sh: 'lunch', at: 870, len: 30 }, { id: 'sam', sh: 'dinner', at: 1140, len: 150 }],
  v: 1, by: 'sam', at: L.NOW - 3600000, upd: L.NOW - 3600000 });
const fixture = () => ({ [CFG]: { people, headId: 'ann', sousIds: ['sam', 'ann'], staffIds: ['sam', 'ann', 'bo'], kitShifts: shifts, kitSecs: sections }, [TEAM]: plan(today), [key('team', tomorrow)]: plan(tomorrow) });
const fullDate = d => new Date(d + 'T12:00:00+10:00').toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'long', day: 'numeric', month: 'long' });
const click = async (p, s) => { await p.locator(s).first().click(); await L.settle(p, 150); };
const person = (p, id) => p.locator('details.tm-person-details[data-id="' + id + '"]');
const field = k => 'select[data-k="' + k + '"]';
const value = (p, k) => p.locator(field(k)).inputValue();
const saved = p => p.evaluate(k => __fake.dump()[k], TEAM);
const readCount = p => p.evaluate(() => __fake.reads.filter(k => /\/(team|teamsum)(\/|$)/.test(k)).length);
async function ready(p) { await L.waitFor(p, () => !!document.querySelector('.tm-work [data-p="tm-whole"]'), null, 7000); }
async function details(p, id) { if (!await person(p, id).evaluate(e => e.open)) await click(p, 'details.tm-person-details[data-id="' + id + '"] > summary'); }
async function pick(p, k, v) { await details(p, k.split(':')[1]); await L.pick(p, field(k), String(v)); }
async function chefPlan(p) { await click(p, '[data-p="c-group"][data-g="team"]'); const tab = p.locator('[data-p="c-tab"][data-t="plan"]'); if (await tab.getAttribute('aria-pressed') !== 'true') await tab.click(); await ready(p); }
async function day(p, d) {
  for (let n = 0; n < 3 && !await p.locator('[data-p="tm-day"][data-day="' + d + '"]').count(); n++) await click(p, '[data-p="tm-week-next"]');
  await click(p, '[data-p="tm-day"][data-day="' + d + '"]'); await ready(p);
}
async function assertQuiet(p, label) {
  const roster = await p.locator('.tm-people').evaluateAll(lists => lists.map(e => ({ names: [...e.querySelectorAll('.tm-person-name')].map(n => n.textContent), open: e.querySelectorAll('details[open]').length, text: e.innerText })));
  ok(roster.length === 1 && roster[0].names.slice().sort().join() === 'Ann,Bo,Sam' && roster[0].open === 0, label + ': one collapsed roster contains each person once');
  ok(roster.length === 1 && people.every(x => (roster[0].text.match(new RegExp(x.name, 'g')) || []).length === 1) && !/Choose a section/.test(roster[0].text), label + ': collapsed rows avoid repeated names and repeated assignment instructions');
  ok(await p.locator('.tm-person-row').count() === 3 && await p.locator('.tm-details').count() === 0 && await p.locator('details.tm-person-details > summary').evaluateAll(es => es.length === 3 && es.every(e => e.textContent.trim() === 'Edit breaks')), label + ': every row has an explicit Edit breaks disclosure and no second editor');
  ok(await p.locator('[data-p="tm-save"]').count() === 1 && await p.locator('[data-p="tm-save"]').innerText() === 'Save ' + fullDate(today) && await p.evaluate(() => {
    const roster = document.querySelector('.tm-people'), save = document.querySelector('.tm-save'), tools = document.querySelector('details.tm-batch');
    return !!tools && !!(roster.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(save.compareDocumentPosition(tools) & Node.DOCUMENT_POSITION_FOLLOWING);
  }), label + ': the single dated Save follows the roster before secondary tools');
}

async function layouts(p, label) {
  for (const width of [390, 768, 1280]) for (const size of ['normal', 'xlarge']) {
    await p.setViewportSize({ width, height: 900 }); await p.evaluate(s => document.documentElement.dataset.text = s, size); await L.settle(p, 150);
    const small = await p.locator('.tm-person-pick, .tm-person-details > summary, .tm-section-choices button, .tm-weeknav button, [data-p="tm-save"], .tm-batch > summary').evaluateAll(es => es.filter(e => e.getClientRects().length).map(e => ({ label: e.textContent.trim(), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })).filter(e => e.w < 43.5 || e.h < 43.5));
    ok(!await L.overflow(p) && !small.length, label + ' ' + width + ' ' + size + ': no sideways page scroll and visible planner controls remain 44 px ' + JSON.stringify(small));
  }
}

(async () => {
  const b = await L.start();
  let p = await L.open(b, '#/team', { who: 'sam', extra: fixture(), wait: 1000 }); await ready(p);
  await assertQuiet(p, 'Direct sous-chef');
  ok(/Grill/.test(await p.locator('[data-p="tm-assign"][data-id="ann"]').innerText()) && /13:45|14:30/.test(await p.locator('.tm-person-row').filter({ has: person(p, 'ann') }).innerText()), 'collapsed row: the current section and planned break remain legible');
  const reads = await readCount(p), original = await saved(p);
  await click(p, '[data-p="tm-section"][data-v="pans"]');
  await click(p, '[data-p="tm-assign"][data-id="ann"]');
  ok(await value(p, 'tm-sec:ann') === 'pans' && /2/.test(await p.locator('[data-p="tm-section"][data-v="pans"]').innerText()), 'section move: the draft picker and section count update together');
  await click(p, '[data-p="tm-assign"][data-id="ann"]');
  ok(await value(p, 'tm-sec:ann') === '' && await value(p, 'tm-at:ann:0') === '825' && await p.locator('[data-p="tm-on"][data-id="ann"]').getAttribute('aria-pressed') === 'true', 'clear section: attendance and that shift\'s break are retained');
  await details(p, 'ann');
  ok(await person(p, 'ann').evaluate(e => e.open) && !await person(p, 'sam').evaluate(e => e.open) && !await person(p, 'bo').evaluate(e => e.open), 'Edit breaks: only the selected person opens');
  await pick(p, 'tm-at:ann:0', 840);
  ok(await value(p, 'tm-at:ann:0') === '840' && await person(p, 'ann').evaluate(e => e.open), 'visible picker: an actual break-time choice changes the draft and keeps its disclosure open');
  await click(p, '[data-p="tm-section"][data-v="grill"]'); await click(p, '[data-p="tm-assign"][data-id="ann"]');
  ok(await person(p, 'ann').evaluate(e => e.open) && await value(p, 'tm-at:ann:0') === '840', 'section redraw: the open person and unfinished break edit survive');
  await click(p, '[data-p="tm-sh"][data-v="dinner"]');
  ok(!await person(p, 'ann').evaluate(e => e.open) && await value(p, 'tm-sec:ann') === 'pans' && await value(p, 'tm-at:ann:0') === '1140', 'shift switch: Dinner has its own closed disclosure, section and unchanged break');
  await details(p, 'sam');
  ok(await value(p, 'tm-len:sam:0') === '150', 'Dinner: the original long split remains available in Sam\'s controls');
  await click(p, '[data-p="tm-sh"][data-v="lunch"]');
  ok(await person(p, 'ann').evaluate(e => e.open) && !await person(p, 'sam').evaluate(e => e.open) && await value(p, 'tm-at:ann:0') === '840', 'shift return: Lunch restores its own open person and draft');
  await day(p, tomorrow);
  ok(!await person(p, 'ann').evaluate(e => e.open), 'date switch: another date starts with its own closed disclosures');
  await details(p, 'bo'); await day(p, today);
  ok(await person(p, 'ann').evaluate(e => e.open) && !await person(p, 'bo').evaluate(e => e.open) && await value(p, 'tm-at:ann:0') === '840', 'date return: the original open person and break draft are restored');
  await day(p, tomorrow);
  ok(await person(p, 'bo').evaluate(e => e.open) && !await person(p, 'ann').evaluate(e => e.open), 'second date return: the future date restores only its own open person');
  await day(p, today);
  await p.fill('[data-k="tm-q"]', 'Ann'); await L.settle(p, 300);
  await p.evaluate(() => { const q = document.querySelector('[data-k="tm-q"]'); q.focus(); q.setSelectionRange(1, 2); window.__quietSearch = q; window.__quietDetails = document.querySelector('details.tm-person-details[data-id="ann"]'); });
  await p.clock.fastForward(60000); await L.settle(p, 180);
  ok(await p.evaluate(() => document.querySelector('details.tm-person-details[data-id="ann"]') === __quietDetails && __quietDetails.open), 'minute tick: the open person disclosure keeps its exact DOM node');
  await p.evaluate(() => dispatchEvent(new Event('focus'))); await L.settle(p, 180);
  const clockState = await p.evaluate(() => ({ focus: document.activeElement === __quietSearch, search: document.querySelector('[data-k="tm-q"]') === __quietSearch, value: __quietSearch.value === 'Ann', selection: __quietSearch.selectionStart === 1 && __quietSearch.selectionEnd === 2, details: document.querySelector('details.tm-person-details[data-id="ann"]') === __quietDetails, open: __quietDetails.open }));
  ok(Object.values(clockState).every(Boolean), 'clock paint: typing, focus, selection and the actual search node are retained ' + JSON.stringify(clockState));
  await p.setViewportSize({ width: 768, height: 900 }); await L.settle(p, 150);
  ok(await person(p, 'ann').evaluate(e => e.open) && await value(p, 'tm-at:ann:0') === '840', 'resize: the open disclosure and draft remain intact');
  await p.fill('[data-k="tm-q"]', ''); await L.settle(p, 150);
  await details(p, 'ann'); await click(p, '[data-p="tm-on"][data-id="ann"]');
  ok(await p.locator('[data-p="tm-on"][data-id="ann"]').getAttribute('aria-pressed') === 'false' && !await p.locator(field('tm-at:ann:0')).count(), 'membership removal: removing Lunch also removes its Lunch break controls');
  await click(p, '[data-p="tm-sh"][data-v="dinner"]');
  ok(await value(p, 'tm-sec:ann') === 'pans' && await value(p, 'tm-at:ann:0') === '1140', 'membership removal: the person\'s other shift and break remain intact');
  await click(p, '[data-p="tm-whole"]');
  ok(/Dinner/.test(await p.locator('.tm-dayperson').filter({ hasText: 'Ann' }).innerText()) && !/Lunch/.test(await p.locator('.tm-dayperson').filter({ hasText: 'Ann' }).innerText()), 'Whole day: the shared draft reviews attendance across shifts');
  ok(await readCount(p) === reads && JSON.stringify(await saved(p)) === JSON.stringify(original), 'local work: disclosures, assignment, dates, shifts, resize and clock add no reads or writes');
  await click(p, '[data-p="tm-sh"][data-v="lunch"]'); await details(p, 'ann');
  await p.evaluate(() => { __fake.mode = 'hold'; }); await click(p, '[data-p="tm-save"]');
  await p.focus('details.tm-person-details[data-id="ann"] > summary');
  await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
  await L.waitFor(p, k => __fake.dump()[k].v === 2, TEAM, 6000); await L.settle(p, 150);
  ok(await person(p, 'ann').evaluate(e => e.open) && await p.evaluate(() => document.activeElement.matches('details.tm-person-details[data-id="ann"] > summary')), 'Save acknowledgement: the focused person disclosure survives the confirmed redraw');
  ok(!(await saved(p)).on.some(x => x.id === 'ann' && x.sh === 'lunch') && (await saved(p)).br.some(x => x.id === 'ann' && x.sh === 'dinner' && x.at === 1140) && /saved/i.test(await p.locator('.tm-save').innerText()), 'dated Save: the one shared Save publishes membership and preserves the other shift\'s break');
  ok(!p.errors.length, 'editing journey: no browser errors ' + p.errors.join(' | '));
  await p.context().close();

  // The shared page must stay quiet in both chefs' actual entry points and at supported sizes.
  for (const route of ['#/team', '#/chef']) for (const who of ['sam', 'ann']) {
    p = await L.open(b, route, { who, extra: fixture(), wait: 900 });
    if (route === '#/chef') await chefPlan(p); else await ready(p);
    const label = route + ' ' + who;
    await assertQuiet(p, label);
    await layouts(p, label);
    await p.focus('details.tm-person-details[data-id="ann"] > summary'); await p.keyboard.press('Enter'); await L.settle(p, 150);
    ok(await person(p, 'ann').evaluate(e => e.open) && await p.evaluate(() => document.activeElement.matches('details.tm-person-details[data-id="ann"] > summary')), label + ': keyboard opens the labelled person without moving focus');
    ok(!p.errors.length && await p.evaluate(() => !__fake.refused.length), label + ': no browser errors or refused reads');
    await p.context().close();
  }
  p = await L.open(b, '#/admin', { admin: true, who: '', extra: fixture(), adminPage: '', wait: 1200 });
  await p.evaluate(() => location.hash = '#/team'); await ready(p);
  await assertQuiet(p, 'Verified admin entry'); await layouts(p, 'Verified admin entry');
  ok(await p.evaluate(() => LK_PREP.privateAccess() && !__fake.refused.length) && !p.errors.length, 'verified admin: the daily head PIN session and device grant can use the shared planner');
  await p.context().close();
  p = await L.open(b, '#/team', { who: 'bo', extra: fixture(), wait: 900 });
  ok(!await p.locator('.tm-person-details, [data-p="tm-assign"], [data-p="tm-save"], .tm-weeknav').count(), 'staff: direct entry exposes no planner or edit controls');
  await p.evaluate(() => location.hash = '#/chef'); await L.settle(p, 300);
  ok(!await p.locator('.tm-person-details, [data-p="tm-assign"], [data-p="tm-save"], [data-p="c-tab"][data-t="plan"]').count() && !p.errors.length, 'staff: the chef route cannot expose the Plan editor');
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
