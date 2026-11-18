// Function times are typed (head chef, 18 Nov 2026, docs/fn-time-picker-options/brief.md): the device clock box looked
// "like it was 1998" and showed PM on a 12-hour laptop. 1830, 0630, 18 and 6:30pm are read as they are, always 24-hour;
// 630 asks Morning or evening? and is never guessed; a time the book cannot read is named; none of them saves, prints
// or moves the rounds until it is clear. On a laptop Event start and First round at drop a list of times under the box.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const store = page => page.evaluate(() => window.__fake.dump());
const today = L.ymd(new Date(L.NOW));
const PEOPLE = [{ id: 'fay', name: 'Fay', role: 'fnc', add: false, tick: false, del: false, fn: true, active: true }];
const base = {
  [fsKey(['config', 'main'])]: { people: PEOPLE, sousIds: [], pingIds: [], staffIds: ['fay'], fnIds: ['fay'], showBadges: true },
  [fsKey(['staffpins', 'fay'])]: { hash: L.sha('lk:fay:5151') }, [fsKey(['pinset', 'fay'])]: { at: 1 },
  [fsKey(['drinks', 'fay'])]: { kind: 'flat', at: 1, by: 'fay' }
};
const setV = async (p, sel, v) => { await p.fill(sel, v); await p.$eval(sel, e => e.dispatchEvent(new Event('change', { bubbles: true }))); await L.settle(p, 80); };
const val = (p, k) => p.inputValue('[data-ff="' + k + '"]');
const say = (p, k) => p.$eval('#fe-ts-' + k, e => e.textContent).catch(() => '');
const focusOn = p => p.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('data-ff') || a.textContent || a.tagName) : ''; });
const saved = async p => Object.keys(await store(p)).filter(k => k.startsWith(fsKey(['functions']) + '/'));
async function form(b, w, o) {
  // from the list, so browser Back has somewhere to go
  const p = await L.open(b, '#/functions', Object.assign({ who: 'fay', extra: base, wait: 1500, width: w }, o || {}));
  await p.goto(L.BASE + '#/functions/new');
  await L.waitFor(p, () => !!document.querySelector('[data-ff="startT"]'));
  await p.fill('[data-ff="name"]', 'Smith 50th');
  await setV(p, '[data-ff="date"]', today);
  return p;
}

(async () => {
  const b = await L.start();

  // 1. a laptop: the list under Event start, typed times read as they are, 630 asked and never guessed
  let p = await form(b, 1280);
  await p.click('[data-ff="startT"]'); await L.settle(p, 80);
  ok(await p.$eval('[data-ff="startT"]', e => e.getAttribute('role') === 'combobox' && e.getAttribute('aria-expanded') === 'true') && !!(await p.$('#fe-tl[role="listbox"]')), 'laptop: clicking Event start opens the list of times');
  ok(await p.$$eval('#fe-tl .fe-tl-o', x => x.length) === 96 && !(await p.$('#fe-tl .is-near')), 'laptop: every 15 minutes of the day, nothing marked while the box is empty');
  await p.keyboard.type('18'); await L.settle(p, 60);
  ok(await p.$eval('#fe-tl .is-near', e => e.getAttribute('data-t')).catch(() => '') === '18:00', 'laptop: typing 18 opens the list at 18:00');
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
  ok(await p.$eval('[data-ff="startT"]', e => { const id = e.getAttribute('aria-activedescendant'); const o = id && document.getElementById(id); return o && o.classList.contains('is-cur') && o.getAttribute('data-t'); }) === '18:15', 'laptop: the arrow keys move the marked row and the box says which');
  await p.keyboard.press('Enter'); await L.settle(p, 150);
  ok(await val(p, 'startT') === '18:15' && !(await p.$('#fe-tl')) && await focusOn(p) === 'startT', 'laptop: Enter takes 18:15, closes the list and keeps the focus in the box');
  ok(await val(p, 'foodT') === '18:15', 'laptop: food follows the start');
  // click a row
  await p.fill('[data-ff="startT"]', ''); await p.keyboard.type('1'); await L.settle(p, 60);
  await p.click('#fe-tl .fe-tl-o[data-t="19:30"]'); await L.settle(p, 150);
  ok(await val(p, 'startT') === '19:30' && await val(p, 'foodT') === '19:30' && !(await p.$('#fe-tl')), 'laptop: a click on 19:30 in the list takes it');
  // Escape closes only the list
  await p.fill('[data-ff="startT"]', ''); await p.keyboard.type('183'); await L.settle(p, 60);
  await p.keyboard.press('Escape'); await L.settle(p, 60);
  ok(!(await p.$('#fe-tl')) && await val(p, 'startT') === '183' && await focusOn(p) === 'startT', 'laptop: Escape closes the list and keeps what was typed');
  await p.keyboard.press('Tab'); await L.settle(p, 150);
  ok(/Cannot read "183"\. Type it like 1830\./.test(await txt(p, '#fe-root') || '') && await p.$eval('[data-ff="startT"]', e => e.classList.contains('is-bad') && e.getAttribute('aria-invalid') === 'true'), 'laptop: 183 is named in red, never taken');
  await p.click('[data-fe="save"]'); await L.settle(p, 200);
  ok(!(await saved(p)).length && /Event start: cannot read "183"/.test(await txt(p, '.fe-probs') || ''), 'Save draft: refused while a time cannot be read, and says why');
  // 630: asked, the focus goes to the question
  await p.click('[data-ff="startT"]'); await p.fill('[data-ff="startT"]', ''); await p.keyboard.type('630'); await L.settle(p, 60);
  ok(await p.$$eval('#fe-tl .fe-tl-o', x => x.map(e => e.getAttribute('data-t')).join(',')) === '06:30,18:30', 'laptop: typing 630 leaves only 06:30 and 18:30 in the list');
  await p.keyboard.press('Tab'); await L.settle(p, 200);
  ok(await p.$eval('[data-ff="startT"]', e => e.classList.contains('is-ask')) && /Morning or evening\?/.test(await txt(p, '#fe-root') || ''), '630: the box asks Morning or evening?');
  ok(await focusOn(p) === '06:30 morning', '630: Tab goes to the first answer, not off the page');
  ok(await val(p, 'foodT') === '' && /time to come/.test(await txt(p, '#fe-live') || ''), '630: food and the bar wait, never a guessed 06:30');
  await p.click('[data-fe="print"]'); await L.settle(p, 200);
  ok(/Event start: 06:30 or 18:30\? Pick morning or evening\./.test(await txt(p, '.fe-probs') || ''), 'Print: refused while morning or evening is not picked');
  await p.click('[data-fe="save"]'); await L.settle(p, 200);
  ok(!(await saved(p)).length, 'Save draft: refused while morning or evening is not picked');
  ok(!(await p.$('#fe-tl')), '630: the question shows, not the list, when the box has focus again');
  ok(await focusOn(p) === 'startT', 'Save draft refused: the focus goes back to Event start');
  await p.keyboard.press('Tab'); await L.settle(p, 100);
  await p.keyboard.press('Tab'); await L.settle(p, 60);
  ok(await focusOn(p) === '18:30 evening', '630: Tab, Tab reaches the second answer');
  await p.keyboard.press('Enter'); await L.settle(p, 200);
  ok(await val(p, 'startT') === '18:30' && await val(p, 'foodT') === '18:30' && !/Morning or evening/.test(await txt(p, '#fe-root') || ''), '630: Enter on 18:30 evening takes it, food follows');
  // read as typed, no question
  await setV(p, '[data-ff="startT"]', '0630'); ok(await val(p, 'startT') === '06:30', '0630 is 06:30, no question');
  await setV(p, '[data-ff="startT"]', '6:30pm'); ok(await val(p, 'startT') === '18:30', '6:30pm is 18:30');
  await setV(p, '[data-ff="startT"]', '19'); ok(await val(p, 'startT') === '19:00', '19 is 19:00');
  await setV(p, '[data-ff="startT"]', '18.45'); ok(await val(p, 'startT') === '18:45', '18.45 is 18:45');
  // a round box: no list, the time said back while it is typed
  await L.pick(p, '#fe-platter', 'pizza-platter'); await L.settle(p, 150);
  await setV(p, '[data-ff="qty0"]', '6');
  await p.click('[data-fe="mode"][data-v="stag"]'); await L.settle(p, 250);
  ok(await p.$$eval('.fe-grid [data-ff^="rt"]', x => x.map(e => e.value).join(',')) === '18:45,19:15,19:45', 'staggered: rounds every 30 minutes from 18:45');
  await p.click('[data-ff="rt2"]'); await L.settle(p, 60);
  ok(!(await p.$('#fe-tl')), 'a round box opens no list (the round grid scrolls)');
  await p.fill('[data-ff="rt2"]', ''); await p.keyboard.type('2010'); await L.settle(p, 60);
  ok(await say(p, 'rt2') === '20:10 evening', 'a round box says the time back as it is typed');
  await p.keyboard.press('Tab'); await L.settle(p, 150);
  ok(await val(p, 'rt2') === '20:10', 'a round time typed by hand is taken');
  await p.click('[data-fe="save"]'); await L.settle(p, 300);
  const f = Object.entries(await store(p)).filter(([k]) => k.startsWith(fsKey(['functions']) + '/') && !k.includes('/hist/'))[0];
  ok(!!f && f[1].status === 'draft' && f[1].start > 0 && f[1].rounds.length === 3, 'Save draft: saved once every time is clear');
  await p.context().close();

  // 2. a phone: no list, the time said back under the box; Back with 630 keeps it and asks again
  p = await form(b, 390, { touch: true });
  await p.click('[data-ff="startT"]'); await L.settle(p, 80);
  ok(!(await p.$('#fe-tl')), 'phone: no list (a phone keyboard would cover it)');
  await p.keyboard.type('1830'); await L.settle(p, 60);
  ok(await say(p, 'startT') === '18:30 evening', 'phone: 1830 is said back as 18:30 evening while typing');
  await p.fill('[data-ff="startT"]', ''); await p.keyboard.type('630'); await L.settle(p, 60);
  ok(await say(p, 'startT') === '06:30 or 18:30?', 'phone: 630 says it could be either while typing');
  await p.evaluate(() => { const el = document.querySelector('[data-ff="startT"]'); el.focus(); history.back(); });
  await L.waitFor(p, () => !document.querySelector('[data-ff="startT"]'));
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('lk.fe.draft.new') || 'null'));
  ok(kept && kept.d.startT === '630', 'Back: the unclear 630 is kept as typed, not as 06:30');
  await p.goto(L.BASE + '#/functions/new'); await L.waitFor(p, () => !!document.querySelector('[data-ff="startT"]'));
  ok(await val(p, 'startT') === '630' && /Morning or evening\?/.test(await txt(p, '#fe-root') || ''), 'reopened: 630 is back and still asks');
  await p.tap('[data-fe="tpick"][data-v="18:30"]'); await L.settle(p, 200);
  ok(await val(p, 'startT') === '18:30', 'phone: a tap on 18:30 evening takes it');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), 'phone: no sideways scroll');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
