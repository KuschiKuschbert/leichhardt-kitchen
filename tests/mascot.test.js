// The kitchen mascot on Home (owner, 9 Nov 2026; docs/kitchen-mascot.md). Each person has their own shuffled set of
// all 11 actions on this device. The first Home view of the kitchen day plays today's action once at the right end of
// the Welcome row, then the Welcome pose rests. A tap replays today's action and never draws a new one. The full name
// always wins, missing art leaves Home as it was, nothing on the work pages, no reads. Synthetic staff only.
const L = require('./lib');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/');
const LONG = 'Alexandria Catherine Montgomery Williams';
function fixture(name) {
  const cfg = L.seed()[key(['config', 'main'])];
  if (name) cfg.people = cfg.people.map(p => p.id === 'ann' ? { ...p, name } : p);
  cfg.kitSecs = [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }];
  // A full day with no shift moment at 14:00, so the welcome stays on its ordinary words (docs/staff-personalisation-options/brief.md).
  cfg.kitShifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 1260 }];
  return { [key(['config', 'main'])]: cfg, [key(['team', day])]: { day, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }],
    br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' } };
}
const st = p => p.evaluate(() => window.LK_MASCOT ? window.LK_MASCOT.state() : null);
const rec = (p, id = 'ann') => p.evaluate(id => JSON.parse(localStorage.getItem('lk.mascot.' + id) || 'null'), id);
const sheets = p => p.__sheets.length;
const geometry = p => p.evaluate(() => ['#rtitle', '.wall-date', '#hm-day', '#hm-with'].map(s => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? [s, Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : [s]; }));
async function go(p, hash) { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 500); }
async function run(p, ms) { await p.clock.runFor(ms); await L.settle(p, 150); }
const realErrors = p => p.errors.filter(e => !/Failed to load resource/.test(e));

(async () => {
  const b = await L.start(); let p = null;
  async function open(o = {}) {
    // Math.random 0 keeps the varied welcome on Welcome, the words this mascot's layout checks were measured with.
    p = await L.open(b, '#/', { who: 'ann', width: 390, height: 844, extra: fixture(o.name), wait: 1200, init: () => { Math.random = () => 0; }, ...o });
    p.__sheets = []; p.on('request', r => { if (/art\/mascot\/.*sheet/.test(r.url())) p.__sheets.push(r.url()); });
    await L.waitFor(p, () => !!document.querySelector('#rtitle.hm-welcome'), null, 6000);
    return p;
  }
  async function step(label, task) {
    try { await task(); } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!realErrors(p).length, label + ': no browser errors ' + realErrors(p).join(' | ')); await p.context().close(); p = null; } }
  }
  const mounted = () => L.waitFor(p, () => !!(window.LK_MASCOT && window.LK_MASCOT.state() && window.LK_MASCOT.state().rest), null, 6000);

  await step('shuffle', async () => {
    await open(); await mounted();
    const o = await p.evaluate(() => ({ ann: LK_MASCOT.order('ann', 33), sam: LK_MASCOT.order('sam', 33), all: LK_MASCOT.actions }));
    ok(o.all.length === 11, 'eleven actions');
    for (let r = 0; r < 3; r++) { const s = o.ann.slice(r * 11, r * 11 + 11); ok(new Set(s).size === 11, `round ${r + 1} shows all 11 once: ${s.join(',')}`); }
    ok(o.ann.every((x, i) => !i || x !== o.ann[i - 1]), 'no action two days running over 33 days');
    ok(o.ann.join() !== o.sam.join(), 'each person has their own order');
  });

  await step('first view, return, tap, next day', async () => {
    await open(); await mounted();
    let s = await st(p); const r1 = await rec(p);
    ok(s.playing && s.plays === 1, 'the first Home view of the day plays today’s action: ' + JSON.stringify(s));
    ok(r1 && r1.today && r1.bag.length === 10 && r1.day === day, 'today’s action drawn from a full set of 11: ' + JSON.stringify(r1));
    const box = await p.locator('.mascot').boundingBox(), h = await p.locator('#rtitle').boundingBox(), bar = await p.locator('.wtop').boundingBox();
    // The corner takes the largest size that clears every word: 64 x 85 px, or 48 x 64 px when a word is within
    // 12 px of the larger one. The date line is the day's own ("Wednesday 11 November · 14:00") and the tests'
    // stand-in fonts differ from machine to machine: on GitHub's runner, wider, a Wednesday's date reaches the
    // larger one (red there every Wednesday before, 11 Nov 2026). So the words are measured here, the way
    // corner() in js/mascot.js measures them, and each answer has its one size.
    const fit = await p.evaluate(() => {
      const m = document.querySelector('.mascot'), t = document.querySelector('#rtitle'), d = document.querySelector('.wall-date'), next = d.nextElementSibling;
      const bottom = Math.min(d.getBoundingClientRect().bottom + 4, next ? next.getBoundingClientRect().top - 4 : Infinity), left = t.getBoundingClientRect().right - 64, top = bottom - 64 * 4 / 3;
      const words = e => { const out = [], w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (!n.textContent.trim()) continue; const r = document.createRange(); r.selectNodeContents(n); out.push(...r.getClientRects()); } return out; };
      return { spot: m.getAttribute('data-spot'), reach: words(t).concat(words(d)).some(r => r.right > left - 12 && r.left < left + 64 + 12 && r.bottom > top && r.top < bottom), date: d.textContent };
    });
    ok(fit.spot === 'corner' && (fit.reach ? box.width === 48 && Math.round(box.height) === 64 : box.width === 64 && Math.round(box.height) === 85), 'mascot is 64 x 85 px in the corner on a phone, or 48 x 64 px when a word reaches the larger one: ' + JSON.stringify([fit, box]));
    ok(Math.abs(box.x + box.width - (h.x + h.width)) < 1, 'it stands at the right end of the Welcome row');
    ok(box.y >= bar.y + bar.height, 'it stays under the top bar');
    ok(await p.evaluate(() => !document.querySelector('#rtitle .mascot') && document.querySelector('#rtitle').textContent === 'Welcome, Ann'), 'the heading reads only the name');
    ok(await p.locator('.mascot').getAttribute('aria-label') === 'Kitchen mascot, play again', 'the button says what a tap does');
    await run(p, 5000); s = await st(p);
    ok(!s.playing && !s.scheduled && s.rest === 'rest', 'one pass, then the Welcome pose rests');
    ok((await rec(p)).played === true, 'today is marked as played once the action finished');
    await go(p, '#/prep'); ok(!(await p.locator('.mascot').count()), 'no mascot on Prep');
    await go(p, '#/recipes'); ok(!(await p.locator('.mascot').count()), 'no mascot on Recipes');
    const n = sheets(p);
    await go(p, '#/'); await mounted(); await run(p, 1500); s = await st(p);
    ok(s.plays === 0 && sheets(p) === n, 'a return to Home the same day stays still and loads no sprite sheet');
    const r2 = await rec(p), before = await p.evaluate(() => window.__fake.bill.length);
    await p.locator('.mascot').click(); await run(p, 400); s = await st(p);
    ok(s.playing && s.clip === r1.today, 'a tap replays today’s action');
    await p.locator('.mascot').click(); await run(p, 200);
    ok((await st(p)).plays === 1, 'a second tap while it plays does nothing');
    await run(p, 5000);
    const r3 = await rec(p); ok(JSON.stringify(r3) === JSON.stringify(r2), 'a tap never draws a new action or changes the set');
    ok(await p.evaluate(b => window.__fake.bill.length === b, before), 'a tap and a full play read nothing from Firestore');
    // The next kitchen day takes the next action from the set.
    await p.evaluate(() => { const r = JSON.parse(localStorage.getItem('lk.mascot.ann')); r.day = '2000-01-01'; localStorage.setItem('lk.mascot.ann', JSON.stringify(r)); });
    await go(p, '#/recipes'); await go(p, '#/'); await mounted(); await run(p, 300);
    const r4 = await rec(p); s = await st(p);
    ok(s.plays === 1 && r4.today !== r3.today && r4.bag.length === 9 && r4.day === day, 'the next kitchen day plays the next action: ' + JSON.stringify(r4));
  });

  await step('midnight in Queensland', async () => {
    await open({ clock: L.NOW + (9 * 60 + 59) * 60000 }); await mounted(); await run(p, 5000);
    const r1 = await rec(p); ok(r1.played && r1.day === day, '23:59 plays today’s action');
    await run(p, 2 * 60000); await go(p, '#/recipes'); await go(p, '#/'); await mounted(); await run(p, 300);
    const r2 = await rec(p), s = await st(p);
    ok(r2.day !== day && r2.today !== r1.today && s.plays === 1, 'after midnight the next Home view plays the next action: ' + JSON.stringify(r2));
  });

  await step('reduced motion', async () => {
    await open(); await p.emulateMedia({ reducedMotion: 'reduce' }); await go(p, '#/recipes');
    await p.evaluate(() => localStorage.removeItem('lk.mascot.ann')); await go(p, '#/'); await mounted(); await run(p, 1500);
    let s = await st(p); ok(s.plays === 0 && !s.playing && sheets(p) === 0, 'reduced motion: no play and no sprite sheet');
    await p.locator('.mascot').click(); await run(p, 400); s = await st(p);
    ok(s.rest === 'still' && sheets(p) === 0, 'a tap shows today’s pose as a still');
    await run(p, 2200); ok((await st(p)).rest === 'rest', 'then the Welcome pose comes back');
  });

  await step('hidden first view', async () => {
    await open({ init: () => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); } });
    await mounted(); await run(p, 1500);
    let s = await st(p), r = await rec(p);
    ok(s.plays === 0 && r && r.today && !r.played, 'a first view while the screen is hidden plays nothing and keeps today unplayed');
    await p.evaluate(() => { delete document.hidden; }); await go(p, '#/recipes'); await go(p, '#/'); await mounted(); await run(p, 300);
    s = await st(p); const r2 = await rec(p);
    ok(s.plays === 1 && r2.today === r.today, 'the next visible view the same day plays the same action');
  });

  await step('storage refused', async () => {
    await open({ init: () => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (String(k).indexOf('lk.mascot.') === 0) throw new Error('QuotaExceededError'); return set.call(this, k, v); }; } });
    await mounted(); await run(p, 5000);
    ok((await st(p)).plays === 1, 'plays once with storage refused');
    await go(p, '#/recipes'); await go(p, '#/'); await mounted(); await run(p, 1000);
    ok((await st(p)).plays === 0, 'a return to Home stays still with storage refused');
  });

  // Missing art removes the mascot when the blocked download fails, which is network time, not the page clock:
  // wait for it to go rather than for a fixed time.
  await step('missing art', async () => {
    p = await L.open(b, '#/', { who: 'ann', width: 390, height: 844, extra: fixture(), wait: 1200, init: () => { Math.random = () => 0; }, block: 'art/mascot/' });
    await L.waitFor(p, () => !!window.LK_MASCOT, null, 6000); await L.waitFor(p, () => !document.querySelector('.mascot-host'), null, 10000); await run(p, 1500);
    ok(!(await p.locator('.mascot').count()), 'missing art: no mascot');
    const r = await rec(p); ok(!r || !r.played, 'missing art leaves today unplayed');
    ok(await p.evaluate(() => !document.querySelector('.mascot-host')), 'Home is left exactly as it was');
    // New welcome words or a seasonal change move a mascot that is there; they never start another download.
    let asks = 0; p.on('request', q => { if (/art\/mascot\//.test(q.url())) asks++; });
    await p.evaluate(() => { window.dispatchEvent(new Event('lk-greet')); document.dispatchEvent(new Event('kb-seasonal-state')); });
    await run(p, 1500);
    ok(asks === 0 && !(await p.locator('.mascot').count()), 'a new greeting or seasonal change does not try the missing art again (' + asks + ' requests)');
  });

  for (const [w, h] of [[390, 844], [768, 1024], [1280, 900]]) await step('layout ' + w, async () => {
    p = await L.open(b, '#/', { who: 'ann', width: w, height: h, extra: fixture(), wait: 1200, init: () => { Math.random = () => 0; }, block: 'art/mascot/' });
    await L.waitFor(p, () => !!window.LK_MASCOT, null, 6000); await L.waitFor(p, () => !document.querySelector('.mascot-host'), null, 10000); await run(p, 600); const plain = await geometry(p); await p.context().close();
    await open({ width: w, height: h }); await mounted(); await run(p, 600);
    ok(JSON.stringify(await geometry(p)) === JSON.stringify(plain), `${w} px: every Home rectangle stays where it was`);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${w} px: no sideways scroll`);
    const box = await p.locator('.mascot').boundingBox(); ok(box && box.width >= 44 && box.height >= 44, `${w} px: the tap target is at least 44 px`);
    const hat = await p.locator('.wtop-who').boundingBox(); ok(!hat || box.y - (hat.y + hat.height) >= 8, `${w} px: at least 8 px clear of the chef hat`);
  });

  // Text widths depend on the font the test machine stands in for Caveat, so this checks the rule itself: the mascot
  // is either left out or clear of every word of the name and date. 'Left out' is forced with a wide name below.
  const clearOfWords = () => p.evaluate(() => {
    const m = document.querySelector('.mascot'); if (!m || m.hidden) return 'left out';
    const b = m.getBoundingClientRect(), out = [];
    for (const el of [document.querySelector('#rtitle'), document.querySelector('.wall-date')]) { const r = document.createRange(); r.selectNodeContents(el); out.push(...r.getClientRects()); }
    return out.every(r => r.right <= b.left || r.bottom <= b.top || r.top >= b.bottom) ? 'clear' : 'covers a word';
  });
  for (const w of [390, 768]) await step('long name ' + w, async () => {
    await open({ name: LONG, width: w, height: w === 390 ? 844 : 1024 }); await L.waitFor(p, () => !!window.LK_MASCOT, null, 6000); await run(p, 600);
    const c = await clearOfWords(); ok(c === 'clear' || c === 'left out', `${w} px, 40-character name: the mascot never covers a word (${c})`);
    ok(await p.evaluate(n => document.querySelector('#rtitle').textContent === 'Welcome, ' + n, LONG), 'the full name shows');
  });
  // When the words fill the corner (owner, 10 Nov 2026): the Your day card (B), then room in the heading (A), and
  // only a word that cannot wrap leaves it out. Each place keeps clear of every word; B moves nothing on Home.
  const spot = () => p.evaluate(() => { const m = document.querySelector('.mascot'); return !m || m.hidden ? 'left out' : m.getAttribute('data-spot'); });
  const room = () => p.evaluate(() => document.querySelector('#rtitle').classList.contains('mascot-room'));
  const WIDE = 'WWWWWWWWWWWWW'; // one word that cannot wrap, wider than the space left of the corner
  await step('words fill the corner: on the Your day card', async () => {
    p = await L.open(b, '#/', { who: 'ann', width: 390, height: 844, extra: fixture(WIDE), wait: 1200, init: () => { Math.random = () => 0; }, block: 'art/mascot/' });
    await L.waitFor(p, () => !!window.LK_MASCOT, null, 6000); await L.waitFor(p, () => !document.querySelector('.mascot-host'), null, 10000); await run(p, 600); const plain = await geometry(p); await p.context().close();
    await open({ name: WIDE }); await mounted(); await run(p, 600);
    ok(await spot() === 'card' && !(await room()), 'the corner is full, so it stands on the Your day card: ' + await spot());
    ok(await clearOfWords() === 'clear', 'it covers no word of the welcome or date');
    ok(JSON.stringify(await geometry(p)) === JSON.stringify(plain), 'every Home rectangle stays where it was');
    const m = await p.locator('.mascot').boundingBox(), card = await p.locator('#hm-day').boundingBox(), clock = await p.locator('.hm-clock').boundingBox();
    const title = await p.locator('.hm-bt').boundingBox(), bar = await p.locator('.wtop').boundingBox();
    ok([48, 44].includes(m.width) && m.x + m.width <= clock.x - 11 && m.x >= title.x + title.width, '48 or 44 px wide, between the card title and its clock: ' + JSON.stringify(m));
    ok(m.y < card.y && m.y + m.height > card.y && m.y >= bar.y + bar.height, 'it peeks over the card top, under the top bar');
    ok(m.x >= card.x + card.width / 2 + 23, 'it stays clear of the card pin');
    ok((await st(p)).plays === 1, 'today’s action plays there');
    await p.locator('.mascot').click(); await run(p, 300);
    ok((await st(p)).playing, 'a tap on the card replays it');
    ok(await p.evaluate(n => document.querySelector('#rtitle').textContent === 'Welcome, ' + n, WIDE), 'the full name shows');
  });
  for (const [label, clock] of [['08:30', 'T08:30:00+10:00'], ['Wednesday 30 September', '2026-09-30T14:00:00+10:00']]) await step('a wider date line: still on the card (' + label + ')', async () => {
    const at = label === '08:30' ? Date.parse(day + clock) : Date.parse(clock);
    await open({ name: WIDE, clock: at }); await mounted(); await run(p, 600);
    ok(await spot() === 'card' && !(await room()), 'the card still takes it: ' + await spot());
    ok(await clearOfWords() === 'clear', 'it covers no word of the welcome or date');
  });
  await step('words fill the corner and no Your day card: room in the heading and date', async () => {
    // Functions-only Home has no Your day card, so a name that fills the corner makes the words wrap before it.
    const cfg = fixture(WIDE)[key(['config', 'main'])];
    cfg.people = cfg.people.map(x => x.id === 'ann' ? { ...x, role: 'fnc', add: false, tick: false, fn: true } : x);
    cfg.fnOnlyIds = ['ann']; cfg.fnIds = ['ann']; cfg.addIds = ['sam', 'bo']; cfg.tickIds = ['sam', 'bo'];
    const long = { width: 390, height: 844, extra: { [key(['config', 'main'])]: cfg } };
    p = await L.open(b, '#/', { who: 'ann', wait: 1200, init: () => { Math.random = () => 0; }, block: 'art/mascot/', ...long });
    await L.waitFor(p, () => !!window.LK_MASCOT, null, 6000); await L.waitFor(p, () => !document.querySelector('.mascot-host'), null, 10000); await run(p, 600); const plain = await geometry(p); await p.context().close();
    await open(long); await mounted(); await run(p, 600);
    ok(!(await p.locator('#hm-day:not([hidden])').count()), 'Functions-only Home has no Your day card');
    ok(await spot() === 'room', 'neither the corner nor the card is free, so the words make room: ' + await spot());
    ok(await p.evaluate(() => document.querySelector('#rtitle').classList.contains('mascot-room') && document.querySelector('.wall-date').classList.contains('mascot-room')), 'the heading and date both keep the room');
    ok(await clearOfWords() === 'clear', 'it covers no word');
    const grew = (await geometry(p))[0][4] - plain[0][4];
    ok(grew >= 0 && grew <= 60, 'the heading grows by one line at most: ' + grew + ' px');
    ok(await p.evaluate(n => document.querySelector('#rtitle').textContent === 'Welcome, ' + n, WIDE), 'the full name shows');
    await go(p, '#/recipes');
    await go(p, '#/'); await mounted();
    ok((await spot()) === 'room', 'back on Home it makes room again');
    await p.evaluate(() => LK_MASCOT.unmount());
    ok(await p.evaluate(() => !document.querySelector('.mascot-room')), 'without the mascot the heading and date are as they were');
  });

  await step('two people on one device', async () => {
    await open(); await mounted(); const ann = await rec(p); await p.context().close();
    p = await L.open(b, '#/', { who: 'sam', width: 390, height: 844, extra: fixture(), wait: 1200, init: { content: 'localStorage.setItem("lk.mascot.ann", ' + JSON.stringify(JSON.stringify(ann)) + ');' } });
    await L.waitFor(p, () => !!(window.LK_MASCOT && window.LK_MASCOT.state()), null, 6000); await run(p, 300);
    const sam = await rec(p, 'sam'), ann2 = await rec(p, 'ann');
    ok(sam && sam.today && sam.bag.length === 10, 'Sam gets their own set');
    ok(JSON.stringify(ann2) === JSON.stringify(ann), 'Ann’s set on this device is untouched');
  });

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
