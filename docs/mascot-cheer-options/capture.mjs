/* Review-only capture for the mascot cheer designs: the real app with a review-only injection, the click
 * tests' Firebase stand-in and made-up people. Nothing here runs in the live book.
 * From the repo root: python3 -m http.server 8765 &  then
 * cd tests && CHROME=<headless shell> BASE=http://127.0.0.1:8765/ node ../docs/mascot-cheer-options/capture.mjs [A B C M] */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'docs/mascot-cheer-options'), OUT = path.join(DIR, 'evidence');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/'; process.env.BASE = BASE;
const L = require(path.join(ROOT, 'tests/lib'));
const WANT = process.argv.slice(2).length ? process.argv.slice(2) : ['A', 'B', 'C'];
const FILM = process.env.FILM !== '0';
const key = p => ['kitchens', L.PIN, ...p].join('/'), day = L.ymd(new Date(L.NOW));
const people = [{ id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true }, { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true }, { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true }];
const cfg = { people, staffIds: ['ann', 'sam', 'bo'], sousIds: ['sam'], showBadges: true, staffSee: { cleaning: true }, kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }], kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }] };
const plan = { day, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'dinner', sec: 'larder' }], br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' };
const fixture = { [key(['config', 'main'])]: cfg, [key(['team', day])]: plan };
const item = (id, text, station, qty) => ({ [key(['days', day, 'items', id])]: { text, station, qty, recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 1800000, done: false, deleted: false } });
const LONG = Object.assign({}, fixture, item('i7', 'Pick and wash flat leaf parsley for the garnish', 'Cold larder and garnish', '2 tubs'), item('i8', 'Portion and label the smoked trout for the function', 'Cold larder and garnish', '40'),
  { [key(['config', 'main'])]: Object.assign({}, cfg, { kitSecs: cfg.kitSecs.concat([{ id: 'cold', name: 'Cold larder and garnish' }]) }), [key(['team', day])]: Object.assign({}, plan, { on: [{ id: 'ann', sh: 'lunch', sec: 'cold' }, { id: 'sam', sh: 'lunch', sec: 'grill' }] }) });
const fonts = [['Barlow', 400, 'docs/kitchen-mascot/assets/fonts/barlow-400.ttf'], ['Barlow', 600, 'docs/kitchen-mascot/assets/fonts/barlow-600.ttf'], ['Barlow', 700, 'docs/kitchen-mascot/assets/fonts/barlow-700.ttf'], ['Barlow Condensed', 700, 'docs/kitchen-mascot/assets/fonts/barlow-condensed-700.ttf'], ['Caveat', 700, 'docs/order-list-options/assets/WnznHAc5bAfYB2QRah7pcpNvOx-pjRV6SII.ttf']];
const css = fonts.map(([f, w], i) => `@font-face{font-family:'${f}';font-weight:${w};font-style:normal;src:url(https://fonts.gstatic.com/cheer-font-${i}.ttf) format('truetype')}`).join('\n');
async function installFonts(c) { await c.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: css })); await c.route(/fonts\.gstatic\.com/, r => { const i = Number(r.request().url().match(/cheer-font-(\d)/)?.[1]); return r.fulfill({ status: 200, contentType: 'font/ttf', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(ROOT, fonts[i][2])) }); }); }

const VIEWS = [[390, 844], [768, 1024], [1280, 900]].filter(v => !process.env.ONLY || process.env.ONLY.split(',').includes(String(v[0])));
const commit = (() => { try { return execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD']).toString().trim(); } catch (_) { return ''; } })();
const result = { kind: 'Preview: the real application with a review-only injection and a synthetic Firebase stand-in. Not delivered app behaviour.', source: commit, role: 'staff (Ann), Lunch on Larder; sous chef (Sam) for Orders', fonts: 'local Barlow, Barlow Condensed and Caveat', date: new Date().toISOString(), viewports: VIEWS, designs: WANT, checks: [], geometry: [], measures: {}, screens: [], films: [], art: {}, limitations: ['The preview finds a finish line by reading the page before and after a tick. An implementation takes it from the tick handler and the write\'s own answer.', 'The server\'s answer is modelled by the stand-in (hold, deny, release). No real network, no saved shell, no service worker.', 'No staff usability study, no physical kitchen legibility, no screen reader in use.', 'The shared tablet\'s Who did this? sheet was not exercised.'] };
const record = (name, pass, detail = {}) => { result.checks.push({ name, pass: !!pass, ...detail }); if (!pass) console.warn('CHECK FAILED: ' + name, JSON.stringify(detail).slice(0, 400)); };
const flags = { reduced: false };
const run = (p, ms) => p.clock.runFor(ms).then(() => L.settle(p, 150));
const st = p => p.evaluate(() => LK_CHEER.state());
const errs = p => p.errors.filter(e => !e.startsWith('console:'));

async function openAt(b, hash, width, height, o = {}) {
  flags.reduced = !!o.reduced;
  const p = await L.open(b, hash, { who: o.who || 'ann', extra: o.extra || fixture, width, height, wait: 1200 });
  flags.reduced = false;
  if (o.blockArt) await p.context().route(/kitchen-mascot\/assets\/.*\.(png|webp)$/, r => r.abort());
  if (o.text) await p.evaluate(t => document.documentElement.setAttribute('data-text', t), o.text);
  await p.evaluate(() => document.fonts.ready); await L.settle(p, 500);
  await p.addStyleTag({ url: BASE + 'docs/mascot-cheer-options/candidate.css' });
  await p.addScriptTag({ url: BASE + 'docs/mascot-cheer-options/cheer-core.js' });
  await p.addScriptTag({ url: BASE + 'docs/mascot-cheer-options/candidate.js' });
  if (o.design) { await p.evaluate(d => LK_CHEER.install(d), o.design); await L.settle(p, 400); }
  return p;
}
const tick = async (p, id, wait = 350) => { await p.click(`button.nb-box[data-id="${id}"]`); await L.settle(p, wait); };

// Every rectangle that matters to the work, in page coordinates, plus what a tap can reach.
const geo = p => p.evaluate(() => {
  const o = {}, R = e => { const r = e.getBoundingClientRect(); return [r.x, r.y + scrollY, r.width, r.height].map(v => Math.round(v * 10) / 10); }, add = (k, e) => { if (e) o[k] = R(e); };
  add('header', document.querySelector('.nb-ph')); add('count', document.querySelector('.nb-prog'));
  document.querySelectorAll('.nb .nb-hd').forEach(h => add('sec:' + h.firstElementChild.textContent.trim(), h));
  document.querySelectorAll('li.nb-row').forEach(li => add('row:' + li.id, li));
  add('dock', document.querySelector('.wk-dock')); add('tabbar', document.querySelector('.tabbar')); add('empty', document.querySelector('.nb-body > .nb-empty'));
  ['#rtitle', '.wall-date', '#hm-day', '#hm-with', '#hm-board', '#hm-prep'].forEach(s => add(s, document.querySelector(s)));
  document.querySelectorAll('.hm-sec').forEach(a => add('hm:' + a.dataset.hmSec, a));
  const slip = document.querySelector('.p-toasts .p-toast[data-toast="new"]'); add('slip', slip); add('undo', slip && slip.querySelector('.p-toast-btn'));
  const dock = document.querySelector('.wk-dock'), bar = document.querySelector('.tabbar'), top = document.querySelector('.wtop');
  // The floor is whatever sits fixed over the bottom of the list: the slip, the Add dock and the tab bar on a phone.
  const low = e => e && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().top > innerHeight / 2 && getComputedStyle(e).position === 'fixed';
  const floor = Math.min(...[slip, low(dock) ? dock : null, low(bar) ? bar : null].filter(Boolean).map(e => e.getBoundingClientRect().top), innerHeight), roof = top ? top.getBoundingClientRect().bottom : 0;
  const rows = [...document.querySelectorAll('li.nb-row')].filter(li => { const r = li.getBoundingClientRect(); return r.top >= roof - 0.5 && r.bottom <= floor + 0.5; }).length;
  const undoInView = [...document.querySelectorAll('ul.nb-done button.nb-undo')].filter(e => { const r = e.getBoundingClientRect(); return r.top >= roof - 0.5 && r.bottom <= floor + 0.5; }).length;
  return { rects: o, rowsInView: rows, undoInView, scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight, bill: window.__fake.bill.length };
});
function diff(a, b, skip = []) { const keys = new Set([...Object.keys(a.rects), ...Object.keys(b.rects)]); return [...keys].filter(k => !skip.some(s => k === s || k.startsWith(s))).filter(k => !a.rects[k] || !b.rects[k] || a.rects[k].some((v, i) => Math.abs(v - b.rects[k][i]) > 0.6)); }
const contrast = p => p.evaluate(() => {
  const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const bgOf = e => { for (let x = e; x; x = x.parentElement) { const c = getComputedStyle(x).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(255,255,255)'; };
  const one = e => { if (!e) return null; const fg = getComputedStyle(e).color, bg = bgOf(e), a = lum(fg), b = lum(bg); return { fg, bg, ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100, size: getComputedStyle(e).fontSize, weight: getComputedStyle(e).fontWeight }; };
  return { say: one(document.querySelector('.ck-say')), bubble: one(document.querySelector('.ck-bubble .ck-line')), sub: one(document.querySelector('.ck-bubble .ck-sub')), flag: one(document.querySelector('.ck-flag .ck-line')) };
});
async function shot(p, name, width, note) { const file = `evidence/${name}-${width}.png`; await p.screenshot({ path: path.join(DIR, file) }); result.screens.push({ file, note }); record(`${name} ${width} no JS exceptions`, !errs(p).length, { errors: errs(p) }); }
// A short film in real time (the bar slides on a CSS transition, which a stepped clock would not show).
async function film(p, name, ms, act) {
  if (!FILM) return;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cheer-')), t0 = Date.now(); let i = 0;
  await act();
  while (Date.now() - t0 < ms) { await p.screenshot({ path: path.join(tmp, `f${String(i++).padStart(3, '0')}.png`) }); }
  const fps = Math.max(4, Math.round(i / ((Date.now() - t0) / 1000)));
  try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f%03d.png'), '-vf', 'split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', path.join(OUT, name + '.gif')]); result.films.push({ file: `evidence/${name}.gif`, frames: i, fps, note: 'Real time, phone width.' }); } catch (e) { result.films.push({ file: name, error: String(e).slice(0, 200) }); }
  fs.rmSync(tmp, { recursive: true, force: true });
}

// The same walk for the baseline and each design: an ordinary tick, the tick that finishes a section, the
// rest of the list, then the settled page and Home.
async function walk(b, d, width, height) {
  const p = await openAt(b, '#/prep', width, height, { design: d || undefined }), tag = (d || 'base').toLowerCase(), steps = {};
  steps.start = await geo(p);
  if (width === 390 || d) await shot(p, `${tag}-prep-start`, width, 'Prep before any tick.');
  await tick(p, 'i1'); steps.ordinary = await geo(p);
  if (d) { const s = await st(p); record(`${d} ${width} an ordinary tick does not cheer`, !s.said.length && !s.cheer, { said: s.said }); }
  if (width === 390) await shot(p, `${tag}-ordinary`, width, 'An ordinary tick: the slip names the line, as today.');
  await tick(p, 'i4'); await run(p, 9500);
  await tick(p, 'i5'); await run(p, 1300); steps.section = await geo(p);
  await shot(p, `${tag}-section`, width, 'The tick that finishes Sauce (2 of 2).');
  if (d) { const s = await st(p); if (/B|R/.test(d)) record(`${d} ${width} says nothing on the work page while lines are left`, !s.said.length, { said: s.said }); else record(`${d} ${width} cheers the finished section once, by name`, s.said.length === 1 && /Sauce/.test(s.said[0].text), { said: s.said }); result.measures[`${d}-${width}-contrast-section`] = await contrast(p); }
  await run(p, 4500);
  if (d) { const s = await st(p); record(`${d} ${width} every sprite has settled, no timers left`, Object.values(s.sprites).filter(Boolean).every(x => !x.playing && !x.scheduled), { sprites: s.sprites }); }
  const n0 = d ? (await st(p)).said.length : 0;
  await tick(p, 'i3'); await run(p, 1300);
  if (d) { const s = await st(p); record(`${d} ${width} a section of one line is an ordinary tick: no cheer`, s.said.length === n0, { said: s.said }); if (width === 390) await shot(p, `${tag}-one-line-section`, width, 'Grill has one line: ticking it is an ordinary tick.'); }
  await run(p, 9500);
  await tick(p, 'i2', 250); await run(p, 9500);
  await tick(p, 'i6'); await run(p, 1300); steps.list = await geo(p);
  await shot(p, `${tag}-list`, width, 'The tick that finishes the whole list.');
  await run(p, 5000); steps.settled = await geo(p);
  await shot(p, `${tag}-list-settled`, width, 'The finished list, after the ticked lines have left.');
  if (d) { const s = await st(p); record(`${d} ${width} cheers the finished list`, s.said.some(x => x.kind === 'list'), { said: s.said }); record(`${d} ${width} no redraw loop`, !s.storm); result.art[`${d}-${width}`] = [...new Set(s.requests.map(u => u.split('/').pop()))]; result.measures[`${d}-${width}-contrast-list`] = await contrast(p); result.measures[`${d}-${width}-said`] = s.said; }
  await p.evaluate(() => { location.hash = '#/'; scrollTo(0, 0); }); await L.settle(p, 900); steps.homeDone = await geo(p);
  await shot(p, `${tag}-home-done`, width, 'Home with prep finished.');
  await p.context().close();
  const h = await openAt(b, '#/', width, height, { design: d || undefined }); await L.settle(h, 500); steps.home = await geo(h);
  await shot(h, `${tag}-home`, width, 'Home at the start of the shift.');
  await h.context().close();
  return steps;
}

// B speaks only when a whole list is done, so its edge checks use a list of one line.
const TWO = Object.assign({}, fixture, Object.fromEntries(['i1', 'i2', 'i3', 'i6'].map(i => [key(['days', day, 'items', i]), undefined])));
async function edges(b, d) {
  const W = 390, H = 844, fx = /B|R/.test(d) ? TWO : fixture, total = /B|R/.test(d) ? 2 : 6;
  // Make gravy first (an ordinary tick, sent), then Laksa is the tick that finishes Sauce (and, for B, the list).
  const pre = async p => { await tick(p, 'i4'); await run(p, 9500); }, FIN = 'i5';
  const cheering = p => p.evaluate(() => !!document.querySelector('.ck-say, .ck-flag, .ck-note-done, .ck-card'));
  // Undo takes the cheer back: the finish line is not true any more.
  let p = await openAt(b, '#/prep', W, H, { design: d, extra: fx });
  await pre(p); await tick(p, FIN); await run(p, 600); const before = await st(p);
  await p.click('.p-toasts .p-toast[data-toast="new"] .p-toast-btn'); await L.settle(p, 500);
  const after = await st(p), shows = await cheering(p);
  record(`${d} Undo takes the cheer back`, before.said.length === 1 && !after.cheer && !shows, { cheer: after.cheer, shows });
  if (d === 'A') await shot(p, 'a-undone', W, 'After Undo: the book says Unticked, the cheer is gone.');
  await p.context().close();

  // A tick that has not reached the server is never cheered. When the answer comes, it is.
  p = await openAt(b, '#/prep', W, H, { design: d, extra: fx });
  await pre(p); await p.evaluate(() => { window.__fake.mode = 'hold'; });
  await tick(p, FIN); await run(p, 1500);
  let s = await st(p); const quiet = !(await cheering(p));
  record(`${d} a tick waiting to be sent is not cheered`, !s.said.length && s.cheer && !s.cheer.shown && quiet && !s.sent, { said: s.said, sent: s.sent });
  await shot(p, `${tag(d)}-held`, W, 'The finishing tick has not reached the server: no cheer.');
  await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); }); await run(p, 700);
  s = await st(p);
  record(`${d} the cheer comes once the server has answered`, s.said.length === 1 && s.sent, { said: s.said, sent: s.sent });
  await shot(p, `${tag(d)}-released`, W, 'The server answered: the cheer shows.');
  await p.context().close();

  // A refused write: the book's red failure stays, nothing is cheered.
  p = await openAt(b, '#/prep', W, H, { design: d, extra: fx });
  await pre(p); await p.evaluate(() => { window.__fake.mode = 'deny'; });
  await tick(p, FIN); await run(p, 1500);
  s = await st(p); const bad = await p.evaluate(() => ({ slip: document.querySelector('.p-toasts .p-toast[data-toast="new"]')?.textContent.slice(0, 120) || '', red: !!document.querySelector('.p-toast-bad'), say: !!document.querySelector('.ck-say, .ck-flag, .ck-note-done, .ck-card') }));
  record(`${d} a refused tick is not cheered`, !s.said.length && !bad.say, { said: s.said, bad });
  if (d === 'A') await shot(p, 'a-refused', W, 'The server refused the tick: the book says so, no cheer.');
  await p.context().close();

  // Another phone finishes the section: this screen shows the count, and cheers nothing it did not do.
  p = await openAt(b, '#/prep', W, H, { design: d, extra: fx });
  for (const id of ['i4', FIN]) { await p.evaluate(([path, now]) => { const cur = window.__fake.dump()[path]; window.__fake.write(path, Object.assign({}, cur, { done: true, doneBy: 'Bo', doneById: 'bo', doneAt: now, preparedBy: 'Bo', preparedById: 'bo', preparedAt: now })); }, [key(['days', day, 'items', id]), L.NOW]); await run(p, 500); }
  await run(p, 600);
  s = await st(p); const other = await p.evaluate(() => ({ count: document.querySelector('.nb-prog')?.textContent, say: !!document.querySelector('.ck-say, .ck-flag') }));
  record(`${d} another phone's tick is counted but not cheered here`, new RegExp('2 of ' + total).test(other.count || '') && !s.said.length && !other.say, { other, said: s.said });
  await p.context().close();

  // Reduced motion: the words stay, nothing moves, no animation sheet is fetched.
  p = await openAt(b, '#/prep', W, H, { design: d, reduced: true, extra: fx });
  await pre(p); await tick(p, FIN); await run(p, 1500); s = await st(p);
  record(`${d} reduced motion keeps the words and plays nothing`, s.said.length === 1 && Object.values(s.sprites).filter(Boolean).every(x => !x.plays) && !s.requests.some(u => /sheet/.test(u)), { said: s.said, requests: s.requests.map(u => u.split('/').pop()) });
  await shot(p, `${tag(d)}-reduced-motion`, W, 'Reduced motion: a still and the words.');
  await p.context().close();

  // Missing art: the words stay and the work is where it was.
  const baseP = await openAt(b, '#/prep', W, H, { extra: fx }); await pre(baseP); await tick(baseP, FIN); await run(baseP, 1300); const g0 = await geo(baseP); await baseP.context().close();
  p = await openAt(b, '#/prep', W, H, { design: d, blockArt: true, extra: fx });
  await pre(p); await tick(p, FIN); await run(p, 1300); s = await st(p); const g1 = await geo(p);
  const moved = diff(g0, g1, ['slip', 'undo'].concat(/B|M|R|S/.test(d) ? ['empty'] : [])), words = await p.evaluate(() => (document.querySelector('.ck-say, .ck-flag, .ck-note .ck-bubble, .ck-card .ck-bubble')?.textContent || ''));
  record(`${d} missing art keeps the words and moves no work`, !!words && !moved.length, { words, moved });
  await shot(p, `${tag(d)}-no-art`, W, 'The artwork did not load: the words still show.');
  await p.context().close();

  // Long names and Extra large text: the slip, the flag and the bubble stay on the page.
  for (const text of ['', 'xlarge']) {
    p = await openAt(b, '#/prep', W, H, { design: d, extra: LONG, text });
    await tick(p, 'i7'); await run(p, 9500); await tick(p, 'i8'); await run(p, 1300); const g = await geo(p), fit = await p.evaluate(() => [...document.querySelectorAll('.ck-say, .ck-flag, .ck-bubble, .ck-head, .ck-body')].every(e => { const r = e.getBoundingClientRect(); return r.left >= -0.5 && r.right <= innerWidth + 0.5; }));
    record(`${d} long names${text ? ', Extra large text' : ''}: no sideways scroll, cheer stays on the page`, g.scrollW <= W && fit, { scrollW: g.scrollW, fit });
    result.measures[`${d}-long${text ? '-xlarge' : ''}`] = { slip: g.rects.slip, undo: g.rects.undo };
    if (g.rects.undo) record(`${d} long names${text ? ', Extra large text' : ''}: Undo keeps a 44 px target`, g.rects.undo[2] >= 44 && g.rects.undo[3] >= 44, { undo: g.rects.undo });
    await shot(p, `${tag(d)}-long${text ? '-xlarge' : ''}`, W, `A 47 letter line in a long section name${text ? ', Extra large text' : ''}.`);
    await p.context().close();
  }

  if (/B|M/.test(d)) for (const text of ['', 'xlarge']) {
    p = await openAt(b, '#/', W, H, { design: d, extra: LONG, text }); await L.settle(p, 500);
    const g = await geo(p), note = await p.evaluate(() => { const n = document.querySelector('#hm-prep .ck-note'), r = n && n.getBoundingClientRect(); return n ? { text: n.textContent, right: r.right, height: r.height } : null; });
    record(`${d} Home note with a long section name${text ? ', Extra large text' : ''}: stays on the page`, !!note && note.right <= W + 0.5 && g.scrollW <= W, { note, scrollW: g.scrollW });
    result.measures[`${d}-home-long${text ? '-xlarge' : ''}`] = note;
    await shot(p, `${tag(d)}-home-long${text ? '-xlarge' : ''}`, W, `Home with a 23 letter section name${text ? ', Extra large text' : ''}.`);
    await p.context().close();
  }
  if (/B|M/.test(d)) {
    // An empty list: the mascot stands beside the book's own sentence and adds no words.
    const none = Object.assign({}, fixture, Object.fromEntries(['i1', 'i2', 'i3', 'i4', 'i5', 'i6'].map(i => [key(['days', day, 'items', i]), undefined])));
    p = await openAt(b, '#/prep', W, H, { design: d, extra: none }); await L.settle(p, 500);
    const host = await p.evaluate(() => { const n = document.querySelector('.ck-note-empty'); return n ? { words: !!n.querySelector('.ck-bubble'), book: document.querySelector('.nb-body > .nb-empty')?.textContent || '' } : null; });
    record(`${d} an empty list gets the mascot beside the book's own sentence, no new words`, !!host && !host.words && /Nothing written/.test(host.book), { host });
    await shot(p, `${tag(d)}-empty`, W, 'An empty list: he looks around beside the book\'s own sentence.');
    await p.context().close();
  }
  if (/R|S/.test(d)) {
    // A section chip: Larder's own tab is emptied while Grill and Sauce still have lines. No card.
    p = await openAt(b, '#/prep', W, H, { design: d });
    await p.click('button.nb-tab[data-v="Larder"]'); await L.settle(p, 400);
    for (const id of ['i1', 'i2', 'i6']) await tick(p, id, 200);
    await run(p, 5000); s = await st(p);
    const tab = await p.evaluate(() => ({ card: !!document.querySelector('.ck-card'), book: document.querySelector('.nb-body > .nb-empty')?.textContent || '' }));
    record(`${d} a finished section chip is not a finished list: no card`, !tab.card && !s.said.some(x => x.kind === 'list') && /Nothing left to do in Larder/.test(tab.book), { tab, said: s.said });
    await shot(p, `${tag(d)}-section-chip`, W, 'The Larder chip with Larder finished and other sections open: the book\'s own words, no card.');
    await p.context().close();
    // A reload on a finished list: the card is the list's state, as a still, and nothing is said again.
    p = await openAt(b, '#/prep', W, H, { design: d, extra: Object.assign({}, fixture, Object.fromEntries(['i1', 'i2', 'i3', 'i4', 'i5', 'i6'].map(i => [key(['days', day, 'items', i]), Object.assign({}, { text: i, station: 'Larder', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, deleted: false }, { done: true, doneBy: 'Bo', doneById: 'bo', doneAt: L.NOW - 600000, preparedBy: 'Bo', preparedById: 'bo', preparedAt: L.NOW - 600000 })]))) });
    await run(p, 1200); s = await st(p);
    const again = await p.evaluate(() => !!document.querySelector('.ck-card'));
    record(`${d} a finished list opened later shows the card as a still and says nothing again`, again && !s.said.length && Object.values(s.sprites).filter(Boolean).every(x => !x.plays), { again, said: s.said });
    await p.context().close();
  }
  if (d === 'S') {
    // The likely kitchen case: a long line name in a one-word section. The sentence is dropped, the slip is today's.
    const fxLong = Object.assign({}, fixture, { [key(['days', day, 'items', 'i5'])]: { text: 'Pick and wash flat leaf parsley for the garnish', station: 'Sauce', qty: '2 tubs', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 1800000, done: false, deleted: false } });
    for (const text of ['', 'xlarge']) {
      const b0 = await openAt(b, '#/prep', W, H, { extra: fxLong, text }); await pre(b0); await tick(b0, FIN); await run(b0, 1300); const h0 = (await geo(b0)).rects.slip; await b0.context().close();
      p = await openAt(b, '#/prep', W, H, { design: d, extra: fxLong, text }); await pre(p); await tick(p, FIN); await run(p, 1300); const h1 = (await geo(p)).rects.slip; s = await st(p);
      record(`S a long line name in a one-word section${text ? ', Extra large text' : ''}: the slip is exactly today's height`, h0 && h1 && Math.abs(h0[3] - h1[3]) < 0.6, { today: h0 && h0[3], got: h1 && h1[3], said: s.said });
      result.measures[`S-longline${text ? '-xlarge' : ''}`] = { today: h0 && h0[3], got: h1 && h1[3], said: s.said.length };
      await shot(p, `s-long-line${text ? '-xlarge' : ''}`, W, `A 47 letter line in Sauce${text ? ', Extra large text' : ''}: the ticked name wraps, so no sentence is added.`);
      await p.context().close();
    }
  }
  // Two sections finished in quick succession, then away: one head on the slip, nothing left running.
  p = await openAt(b, '#/prep', W, H, { design: d });
  for (const id of ['i4', 'i5', 'i1', 'i2', 'i6']) await tick(p, id, 120);
  await run(p, 700); s = await st(p);
  record(`${d} quick ticks: each finished section said once, no stacked sprites`, s.said.length === (/B|R/.test(d) ? 0 : 2) && s.kept.filter(k => k === 'slip-head').length <= 1, { said: s.said, kept: s.kept });
  // A line added to a finished section and ticked again does not cheer a second time that day.
  if (!/B|R/.test(d)) {
    const n = s.said.length;
    await p.evaluate(([path, now]) => window.__fake.write(path, { text: 'Chop chives', station: 'Sauce', qty: '', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: now, done: false, deleted: false }), [key(['days', day, 'items', 'i9']), L.NOW]);
    await run(p, 9500); await tick(p, 'i9'); await run(p, 900); s = await st(p);
    record(`${d} a section finished a second time the same day is not cheered again`, s.said.length === n, { said: s.said });
  }
  await p.evaluate(() => { location.hash = '#/orders'; }); await L.settle(p, 900); s = await st(p);
  record(`${d} leaving the page stops every sprite`, Object.values(s.sprites).filter(Boolean).every(x => !x.playing && !x.scheduled), { kept: s.kept });
  await p.context().close();

  if (d === 'A') {
    // The owner's own example, as a later step: a line this person marked On it, then ticked.
    p = await openAt(b, '#/prep', W, H, {}); await p.evaluate(() => LK_CHEER.install('A', { mine: true })); await L.settle(p, 300);
    await p.click('#nbr-i4 [data-p="onit"]'); await run(p, 9500);
    await tick(p, 'i4'); await run(p, 900); s = await st(p);
    record('A (later step) started then finished: one line of words, no clip', s.said.length === 1 && s.said[0].kind === 'mine' && Object.values(s.sprites).filter(Boolean).every(x => !x.plays), { said: s.said });
    await shot(p, 'a-started-finished', W, 'A later step, the owner\'s own example: On it, then ticked by the same person.');
    await p.context().close();
  }
  // Orders, as the sous chef who may tick them: the same rule on another page.
  p = await openAt(b, '#/orders', W, H, { design: d, who: 'sam' });
  await tick(p, 'o1'); await run(p, 600); const one = await st(p);
  await tick(p, 'o2'); await run(p, 1300); s = await st(p);
  record(`${d} Orders: only the last line ordered cheers`, !one.said.length && s.said.length === 1 && s.said[0].kind === 'list', { said: s.said });
  await shot(p, `${tag(d)}-orders-done`, W, 'Orders, sous chef: every line ordered.');
  await p.context().close();
}
const tag = d => d.toLowerCase();

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await L.start(), nc = b.newContext.bind(b);
  b.newContext = async o => { const c = await nc(Object.assign({}, o, flags.reduced ? { reducedMotion: 'reduce' } : {})), np = c.newPage.bind(c); c.newPage = async () => { await installFonts(c); return np(); }; return c; };
  const hard = setTimeout(() => { console.error('HARD TIMEOUT'); fs.writeFileSync(path.join(DIR, 'verification.partial.json'), JSON.stringify(result, null, 1)); process.exit(3); }, Number(process.env.LIMIT || 1500000));
  try {
    for (const [width, height] of VIEWS) {
      const base = await walk(b, null, width, height);
      result.measures[`base-${width}`] = { rowsInView: Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v.rowsInView])), slip: base.ordinary.rects.slip, header: base.start.rects.header };
      for (const d of WANT) {
        const got = await walk(b, d, width, height);
        for (const step of Object.keys(base)) {
          const a = base[step], c = got[step], skip = ['slip', 'undo'].concat(/B|M|R|S/.test(d) && /list|settled|homeDone/.test(step) ? ['empty'] : []), changes = diff(a, c, skip);
          const slipDelta = a.rects.slip && c.rects.slip ? Math.round((c.rects.slip[3] - a.rects.slip[3]) * 10) / 10 : null;
          result.geometry.push({ design: d, width, step, changes, rowsInView: [a.rowsInView, c.rowsInView], undoInView: [a.undoInView, c.undoInView], slipHeight: a.rects.slip && c.rects.slip ? [a.rects.slip[3], c.rects.slip[3]] : null, slipDelta, pageHeight: [a.scrollH, c.scrollH], scrollW: c.scrollW, extraFirestoreCalls: c.bill - a.bill, undo: c.rects.undo || null });
          const allowed = /B|M/.test(d) ? ['#hm-prep', 'hm:', '#hm-board'] : [];
          record(`${d} ${width} ${step}: every work rectangle stays put`, !changes.filter(k => !allowed.some(s => k.startsWith(s))).length, { changes });
          record(`${d} ${width} ${step}: no sideways scroll`, c.scrollW <= width, { scrollW: c.scrollW });
          record(`${d} ${width} ${step}: no extra Firestore calls`, c.bill === a.bill, { base: a.bill, got: c.bill });
          record(`${d} ${width} ${step}: the same lines in view`, a.rowsInView === c.rowsInView, { base: a.rowsInView, got: c.rowsInView });
          if (/R|S/.test(d) && /list|settled/.test(step)) record(`${d} ${width} ${step}: the same Done today Undo links in view`, a.undoInView === c.undoInView, { base: a.undoInView, got: c.undoInView });
          if (c.rects.undo) record(`${d} ${width} ${step}: Undo keeps a 44 px target`, c.rects.undo[2] >= 44 && c.rects.undo[3] >= 44, { undo: c.rects.undo });
        }
      }
    }
    for (const d of WANT) await edges(b, d);
    // Films at phone width: the finishing tick in real time.
    for (const d of WANT) {
      const p = await openAt(b, '#/prep', 390, 844, { design: d });
      await tick(p, 'i4'); await run(p, 9500);
      await film(p, `${tag(d)}-section`, 4200, () => p.click('button.nb-box[data-id="i5"]'));
      for (const id of ['i3', 'i1', 'i2']) await tick(p, id, 200);
      await run(p, 9500);
      await film(p, `${tag(d)}-list`, 6500, () => p.click('button.nb-box[data-id="i6"]'));
      await p.context().close();
    }
    const size = f => { try { return fs.statSync(path.join(ROOT, 'docs/kitchen-mascot/assets', f)).size; } catch (_) { return 0; } };
    result.art.bytes = Object.fromEntries(['manifest.json', 'welcome-still.png', 'burger-still.png', 'look-around-still.png', 'burger-sheet-compact.webp'].map(f => [f, size(f)]));
  } finally {
    clearTimeout(hard);
    result.summary = { checks: result.checks.length, failed: result.checks.filter(c => !c.pass).map(c => c.name), screens: result.screens.length, films: result.films.length };
    fs.writeFileSync(path.join(DIR, process.env.VERIFY || 'verification.json'), JSON.stringify(result, null, 1));
    console.log(JSON.stringify(result.summary, null, 1));
    await Promise.race([b.close(), new Promise(r => setTimeout(r, 5000))]);
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
