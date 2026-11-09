/* Review-only actual-app capture for the mascot cycle designs. Firebase stand-in, synthetic people.
 * From the repo root: python3 -m http.server 8765 &  then
 * cd tests && CHROME=<headless shell> BASE=http://127.0.0.1:8765/ node ../docs/mascot-cycle-options/capture.mjs */
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), fs = require('fs'), path = require('path');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, 'docs/mascot-cycle-options'), OUT = path.join(DIR, 'evidence');
const BASE = process.env.BASE || 'http://127.0.0.1:8765/'; process.env.BASE = BASE;
const L = require(path.join(ROOT, 'tests/lib'));
const key = p => ['kitchens', L.PIN, ...p].join('/'), day = L.ymd(new Date(L.NOW));
const people = [{ id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true }, { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true }, { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true }];
const cfg = { people, staffIds: ['ann', 'sam', 'bo'], sousIds: ['sam'], kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }], kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }] };
const plan = { day, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'dinner', sec: 'larder' }], br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }], v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' };
const fixture = { [key(['config', 'main'])]: cfg, [key(['team', day])]: plan };
const fonts = [['Barlow', 400, 'docs/kitchen-mascot/assets/fonts/barlow-400.ttf'], ['Barlow', 600, 'docs/kitchen-mascot/assets/fonts/barlow-600.ttf'], ['Barlow', 700, 'docs/kitchen-mascot/assets/fonts/barlow-700.ttf'], ['Barlow Condensed', 700, 'docs/kitchen-mascot/assets/fonts/barlow-condensed-700.ttf'], ['Caveat', 700, 'docs/order-list-options/assets/WnznHAc5bAfYB2QRah7pcpNvOx-pjRV6SII.ttf']];
const css = fonts.map(([f, w], i) => `@font-face{font-family:'${f}';font-weight:${w};font-style:normal;src:url(https://fonts.gstatic.com/cycle-font-${i}.ttf) format('truetype')}`).join('\n');
async function installFonts(c) { await c.route(/fonts\.googleapis\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: css })); await c.route(/fonts\.gstatic\.com/, r => { const i = Number(r.request().url().match(/cycle-font-(\d)/)?.[1]); return r.fulfill({ status: 200, contentType: 'font/ttf', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(path.join(ROOT, fonts[i][2])) }); }); }
const result = { kind: 'Preview: actual application with review-only injection; synthetic Firebase stand-in. Not delivered app behaviour.', date: new Date().toISOString(), viewports: [[390, 844], [768, 1024], [1280, 900]], screens: [], geometry: [], checks: [], limitations: ['The preview keys each person by display name; an implementation keys by staff id.', 'Hidden tab is simulated with a test-owned document.hidden getter.', 'No staff usability study, physical kitchen legibility, native offline or saved-shell claim.'] };
const record = (name, pass, detail = {}) => { result.checks.push({ name, pass: !!pass, ...detail }); if (!pass) console.warn('CHECK FAILED: ' + name, JSON.stringify(detail)); };
const st = p => p.evaluate(() => LK_MASCOT_CYCLE.state());
async function go(p, hash) { await p.evaluate(h => { location.hash = h; scrollTo(0, 0); }, hash); await L.settle(p, 600); }
async function geometry(p) { return p.evaluate(() => { const nodes = {}; ['.wtop', '.tabbar', '#rtitle', '.wall-date', '#hm-day', '#hm-with', '#hm-board', '#hm-prep', '#hm-full-team'].forEach(s => { const e = document.querySelector(s); if (e) { const r = e.getBoundingClientRect(); nodes[s] = { x: r.x, y: r.y + scrollY, width: r.width, height: r.height, text: e.textContent.trim().replace(/\s+/g, ' ') }; } }); return { nodes, scrollWidth: document.documentElement.scrollWidth, bill: window.__fake.bill.length }; }); }
function compare(label, width, a, b) { const changes = Object.keys(a.nodes).filter(s => JSON.stringify(a.nodes[s]) !== JSON.stringify(b.nodes[s])); result.geometry.push({ label, width, unchanged: !changes.length, changes, scrollWidth: b.scrollWidth, extraFirestoreCalls: b.bill - a.bill }); record(`${label} ${width} keeps every Home rectangle`, !changes.length, { changes }); record(`${label} ${width} adds no Firestore calls`, b.bill === a.bill); record(`${label} ${width} no sideways scroll`, b.scrollWidth <= width); }
async function shot(p, name, width, note) { const data = await p.evaluate(() => { const m = document.querySelector('.mc-mascot'), r = m?.getBoundingClientRect(); return { mascot: r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null, state: LK_MASCOT_CYCLE.state() }; }); data.file = `evidence/${name}-${width}.png`; data.note = note; data.errors = p.errors.filter(e => !e.startsWith('console:')); await p.screenshot({ path: path.join(OUT, `${name}-${width}.png`), clip: { x: 0, y: 0, width, height: Math.min(520, width === 390 ? 520 : 460) } }); result.screens.push(data); record(`${name} ${width} no JS exceptions`, !data.errors.length, { errors: data.errors }); return data; }
async function openHome(b, width, height, extra = fixture) { const p = await L.open(b, '#/', { who: 'ann', extra, width, height, wait: 1200 }); await p.evaluate(() => document.fonts.ready); await L.waitFor(p, () => /Larder/.test(document.querySelector('#hm-day')?.textContent || ''), null, 6000); await p.addStyleTag({ url: BASE + 'docs/mascot-cycle-options/candidate.css' }); await p.addScriptTag({ url: BASE + 'docs/mascot-cycle-options/candidate.js' }); return p; }
async function install(p, d) { await p.evaluate(d => LK_MASCOT_CYCLE.install(d), d); await L.settle(p, 300); }
const run = (p, ms) => p.clock.runFor(ms).then(() => L.settle(p, 150));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await L.start(), nc = b.newContext.bind(b);
  b.newContext = async o => { const c = await nc(o), np = c.newPage.bind(c); c.newPage = async () => { await installFonts(c); return np(); }; return c; };
  try {
    // The shuffled set, as pure logic: three rounds for two people.
    const p0 = await openHome(b, 390, 844);
    const sim = await p0.evaluate(() => ({ ann: LK_MASCOT_CYCLE.simulate('Ann', 33), bo: LK_MASCOT_CYCLE.simulate('Bo', 33), all: LK_MASCOT_CYCLE.ALL }));
    for (const [who, seq] of [['Ann', sim.ann], ['Bo', sim.bo]]) {
      for (let r = 0; r < 3; r++) { const block = seq.slice(r * 11, r * 11 + 11); record(`${who} round ${r + 1} shows all 11 once`, new Set(block).size === 11 && block.every(x => sim.all.includes(x)), { block }); }
      record(`${who} never shows one action two days running`, seq.every((x, i) => i === 0 || x !== seq[i - 1]), { seq });
    }
    record('Ann and Bo have their own order', sim.ann.join() !== sim.bo.join(), { ann: sim.ann.slice(0, 11), bo: sim.bo.slice(0, 11) });
    result.sequence = { ann: sim.ann, bo: sim.bo };
    await p0.context().close();

    for (const [width, height] of result.viewports) {
      for (const d of ['A', 'B', 'C']) {
        const p = await openHome(b, width, height);
        const before = await geometry(p); await install(p, d);
        await run(p, d === 'C' ? 200 : 1100);
        compare(`${d} Home`, width, before, await geometry(p));
        const lower = d.toLowerCase();
        if (d !== 'C') await shot(p, `${lower}-playing`, width, `Design ${d}: first Home view of the day, today's action part way through.`);
        await run(p, 4500);
        let s = await st(p);
        if (d !== 'C') record(`${d} ${width} plays once then rests`, s.player && !s.player.playing && s.player.settled && s.player.plays === 1 && !s.player.scheduled, { s: s.player });
        else record(`C ${width} nothing plays or loads by itself`, s.player && s.player.plays === 0 && !s.player.atlasLoaded, { s: s.player });
        await shot(p, `${lower}-rest`, width, `Design ${d}: at rest${d === 'A' ? ' on the neutral Welcome still' : d === 'B' ? " on today's action still" : ' on the Idle still, waiting for a tap'}.`);
        compare(`${d} Home at rest`, width, before, await geometry(p));
        if (d !== 'A') {
          const box = await p.locator('.mc-mascot').boundingBox(); record(`${d} ${width} tap target at least 44 px`, box.width >= 44 && box.height >= 44, { box });
          await p.locator('.mc-mascot').click(); await run(p, 1000); s = await st(p);
          record(`${d} ${width} tap plays today's action`, s.player.playing && s.player.atlasLoaded, { s: s.player, label: s.label });
          if (width === 390) await shot(p, `${lower}-tapped`, width, `Design ${d}: tapped, today's action playing.`);
          await run(p, 4500); s = await st(p); record(`${d} ${width} tap play rests again`, !s.player.playing && !s.player.scheduled);
        }
        if (width === 390) {
          const rec1 = await p.evaluate(() => LK_MASCOT_CYCLE.record('Ann'));
          await go(p, '#/prep'); s = await st(p); record(`${d} not on Prep`, !s.mounted && s.omitted === 'home-only');
          await go(p, '#/'); await run(p, 1200); s = await st(p);
          record(`${d} return Home the same day stays still`, s.player && s.player.plays === 0 && !s.player.atlasLoaded, { s: s.player });
          const rec2 = await p.evaluate(() => LK_MASCOT_CYCLE.record('Ann'));
          record(`${d} return Home keeps today's action`, rec1.today === rec2.today && rec2.bag.length === rec1.bag.length, { rec1, rec2 });
          if (d === 'B') record('B names today’s action for screen readers', s.label.includes(LK_NAMES(rec2.today)), { label: s.label });
          // Next kitchen day: mark the record as drawn yesterday, then come back to Home.
          await p.evaluate(() => { const r = LK_MASCOT_CYCLE.record('Ann'); r.day = '2000-01-01'; localStorage.setItem('lk.mascot.cycle.Ann', JSON.stringify(r)); });
          await go(p, '#/recipes'); await go(p, '#/'); await run(p, 400);
          if (d === 'C') { s = await st(p); record('C next day still waits for a tap', s.player.plays === 0 && !s.player.atlasLoaded); await p.locator('.mc-mascot').click(); await run(p, 400); }
          const rec3 = await p.evaluate(() => LK_MASCOT_CYCLE.record('Ann')); s = await st(p);
          record(`${d} next day takes the next action from the set`, rec3.today !== rec2.today && rec3.bag.length === rec2.bag.length - 1 && s.player.plays === 1, { rec2, rec3, s: s.player });
          // Hidden tab part way through: ends at once on the rest image.
          await p.evaluate(() => { const r = LK_MASCOT_CYCLE.record('Ann'); r.day = '2000-01-02'; localStorage.setItem('lk.mascot.cycle.Ann', JSON.stringify(r)); });
          await go(p, '#/recipes'); await go(p, '#/');
          if (d === 'C') await p.locator('.mc-mascot').click();
          await run(p, 700);
          await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
          await run(p, 300); s = await st(p); record(`${d} hidden tab ends the play on the rest image`, !s.player.playing && !s.player.scheduled && s.player.settled, { s: s.player });
        }
        await p.context().close();
      }
    }
    // Edge cases at 390 px.
    for (const d of ['A', 'B', 'C']) {
      const r = await openHome(b, 390, 844); await r.emulateMedia({ reducedMotion: 'reduce' }); await install(r, d); if (d !== 'A') { await r.locator('.mc-mascot').click(); } await run(r, 1500);
      const s = await st(r); record(`${d} reduced motion shows a still, loads no atlas`, s.mounted && !s.player.atlasLoaded && s.player.plays === 0, { s: s.player }); if (d === 'B') await shot(r, 'b-reduced-motion', 390, 'Design B under reduced motion: today’s action as a still.'); await r.context().close();
      const x = await openHome(b, 390, 844); await x.context().route('**/docs/kitchen-mascot/assets/*', q => q.abort()); const before = await geometry(x); await install(x, d); if (d === 'C') { await x.locator('.mc-mascot').click().catch(() => {}); } await run(x, 1500);
      const sx = await st(x); record(`${d} missing art leaves Home as it was`, !sx.mounted && sx.omitted === 'artwork-unavailable', { s: sx }); compare(`${d} missing art`, 390, before, await geometry(x)); await x.context().close();
    }
    // Round 2 break-it repairs, design A (and B for the double tap).
    const hid = await openHome(b, 390, 844);
    await hid.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); });
    await install(hid, 'A'); await run(hid, 1200); let sh = await st(hid);
    record('A first view while the screen is hidden: rest image, nothing played', sh.player && sh.player.plays === 0 && sh.player.settled, { s: sh.player });
    const recH = await hid.evaluate(() => LK_MASCOT_CYCLE.record('Ann')); record('A hidden view leaves today unplayed', recH.today && !recH.played, { recH });
    await hid.evaluate(() => { delete document.hidden; }); await go(hid, '#/recipes'); await go(hid, '#/'); await run(hid, 1000); sh = await st(hid);
    const recH2 = await hid.evaluate(() => LK_MASCOT_CYCLE.record('Ann'));
    record('A next visible view the same day plays the same action', sh.player.plays === 1 && recH2.today === recH.today && recH2.played, { s: sh.player, recH2 });
    await hid.context().close();
    const ref = await openHome(b, 390, 844);
    await ref.evaluate(() => { Storage.prototype.setItem = function () { throw new Error('QuotaExceededError'); }; localStorage.removeItem('lk.mascot.cycle.Ann'); });
    await install(ref, 'A'); await run(ref, 4500); let sr = await st(ref); record('A storage refused: first view plays once', sr.player.plays === 1, { s: sr.player });
    await go(ref, '#/recipes'); await go(ref, '#/'); await run(ref, 1000); sr = await st(ref); record('A storage refused: return Home stays still', sr.player && sr.player.plays === 0 && !sr.player.atlasLoaded, { s: sr.player });
    await ref.context().close();
    const art = await openHome(b, 390, 844); const block = q => q.abort(); await art.context().route('**/docs/kitchen-mascot/assets/*', block);
    await install(art, 'A'); await run(art, 1200); const sa = await st(art); const recA = await art.evaluate(() => LK_MASCOT_CYCLE.record('Ann'));
    record('A missing art leaves today unplayed', !sa.mounted && recA.today && !recA.played, { s: sa, recA });
    await art.context().unroute('**/docs/kitchen-mascot/assets/*', block); await go(art, '#/recipes'); await go(art, '#/'); await run(art, 1000); const sa2 = await st(art);
    const recA2 = await art.evaluate(() => LK_MASCOT_CYCLE.record('Ann'));
    record('A art back the same day: the same action plays', sa2.player && sa2.player.plays === 1 && recA2.today === recA.today, { s: sa2.player });
    await art.context().close();
    const dbl = await openHome(b, 390, 844); await install(dbl, 'B'); await run(dbl, 4500);
    await dbl.locator('.mc-mascot').dblclick(); await run(dbl, 600); const sd = await st(dbl);
    record('B double tap replays once at normal speed', sd.player.plays === 2 && sd.player.frame <= 3, { s: sd.player });
    await dbl.context().close();
    const extra = JSON.parse(JSON.stringify(fixture)); extra[key(['config', 'main'])].people[0].name = 'Alexandria Catherine Montgomery Williams';
    const ln = await openHome(b, 390, 844, extra); const lb = await geometry(ln); await install(ln, 'A'); const ls = await st(ln); record('Long name: mascot omitted, name kept', !ls.mounted && ls.omitted === 'no-spare-heading-space', { s: ls }); compare('Long name', 390, lb, await geometry(ln)); await ln.context().close();
    const sea = await openHome(b, 390, 844); await sea.evaluate(() => window.KB_SEASONAL?.configure({ selection: 'in-diwali' })); await L.settle(sea, 450); const sb = await geometry(sea); await install(sea, 'A'); await run(sea, 1100); compare('A with Diwali', 390, sb, await geometry(sea)); await shot(sea, 'a-seasonal-playing', 390, 'Design A playing beside the Diwali celebration art.'); await sea.context().close();
  } finally { await b.close(); fs.writeFileSync(path.join(DIR, 'verification.json'), JSON.stringify(result, null, 2) + '\n'); }
  const failures = result.checks.filter(c => !c.pass);
  console.log(JSON.stringify({ screens: result.screens.length, checks: result.checks.length, failures: failures.map(f => f.name) }, null, 2));
  if (failures.length) process.exit(1);
}
function LK_NAMES(id) { return { idle: 'Idle', welcome: 'Welcome', 'look-around': 'Look around', 'recipe-reading': 'Recipe reading', 'ready-to-cook': 'Ready to cook', smash: 'Smash', flip: 'Flip', build: 'Build', burger: 'Serve', walk: 'Walk', smoker: 'At the smoker' }[id]; }
main().catch(e => { console.error(e); process.exit(1); });
