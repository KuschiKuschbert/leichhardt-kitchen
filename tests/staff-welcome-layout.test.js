// The named welcome keeps staff context visible, including a complete long name at enlarged text.
// Synthetic records only. Real-font geometry is separate from always-run fallback and shared-header checks.
const fs = require('fs'), L = require('./lib');
const { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/');
const LONG = 'Alexandria Catherine Montgomery-Smythe J';
const FONTS = 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&family=Caveat:wght@700&display=swap';
function fixture(name) {
  const cfg = L.seed()[key(['config', 'main'])];
  cfg.people = cfg.people.map(p => p.id === 'ann' ? { ...p, name } : p).concat([{ id: 'jo', name: 'Jo', role: 'staff', active: true, add: true, tick: true }]);
  cfg.staffIds = ['ann', 'sam', 'bo', 'jo'];
  cfg.kitSecs = [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }];
  cfg.kitShifts = [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }];
  return { [key(['config', 'main'])]: cfg, [key(['team', day])]: { day,
    on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'larder' }, { id: 'jo', sh: 'lunch', sec: 'sauce' }],
    br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }, { id: 'sam', sh: 'lunch', at: 840, len: 30 }],
    v: 1, at: L.NOW - 3600000, upd: L.NOW - 3600000, by: 'sam' } };
}
async function realFonts(p) {
  // Optional local CSS contains the same official font faces as the app. CI uses its normal Google Fonts URL.
  // Neither path reads design previews or changes the application's presentation rules.
  if (process.env.LK_WELCOME_TEST_FONTS) await p.addStyleTag({ content: fs.readFileSync(process.env.LK_WELCOME_TEST_FONTS, 'utf8') });
  else {
    await p.context().unroute(/fonts\.(googleapis|gstatic)\.com/);
    if (!await p.addStyleTag({ url: FONTS }).then(() => true, () => false)) return false;
  }
  return p.evaluate(() => Promise.race([
    Promise.all(['700 24px Caveat', '400 16px Barlow', '700 16px "Barlow Condensed"'].map(f => document.fonts.load(f))).then(a => a.every(v => v.length > 0)),
    new Promise(r => setTimeout(() => r(false), 8000))
  ]));
}
const homeGeometry = p => p.evaluate(() => {
  const h = document.querySelector('#rtitle'), own = document.querySelector('#hm-day'), team = document.querySelector('#hm-with');
  const limit = document.querySelector('.tabbar').getBoundingClientRect().top;
  const b = e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
  const range = document.createRange(); range.selectNodeContents(h);
  const hb = h.getBoundingClientRect(), text = [...range.getClientRects()];
  // Caveat's font box extends vertically beyond its line box even for the unchanged short heading.
  // Check actual horizontal text bounds and that overflow is not clipped, rather than asserting font metrics.
  return { heading: h.textContent, named: h.classList.contains('hm-welcome'), nameFits: text.every(r => r.left >= hb.left - 1 && r.right <= hb.right + 1) && getComputedStyle(h).overflowY === 'visible',
    own: b(own), team: b(team), visible: [...document.querySelectorAll('#hm-with-body .hm-tp')].filter(e => e.getBoundingClientRect().bottom <= limit + 0.5).length,
    fullTeam: document.querySelector('#hm-full-team > summary').getBoundingClientRect().bottom <= limit + 0.5,
    section: document.querySelector('[data-hm-priority="section"]').textContent,
    overflow: document.documentElement.scrollWidth > innerWidth };
});
(async () => {
  const browser = await L.start(); let p;
  async function step(label, task) {
    try { await task(); } catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }
  const open = async (name, options = {}) => {
    // Compare the same ordinary prefix for every name so random copy cannot change the density baseline.
    p = await L.open(browser, '#/', { who: 'ann', width: 390, height: 844, extra: fixture(name), wait: 1200, init: () => { Math.random = () => 0; }, ...options });
    await L.waitFor(p, () => document.querySelectorAll('#hm-with-body .hm-tp').length === 3, null, 6000);
  };
  let short;
  for (const name of ['Ann', 'Ana María O’Neill', LONG]) await step('real fonts ' + name, async () => {
    await open(name, { settings: { text: 'xlarge' } });
    if (!await realFonts(p)) {
      console.log('SKIP welcome density: real fonts unavailable; fallback checks still run.'); return;
    }
    await L.settle(p, 250);
    const g = await homeGeometry(p);
    ok(g.named && g.heading === 'Welcome, ' + name && g.nameFits, 'real fonts: complete display name stays inside its heading (' + name + ')');
    ok(g.visible === 3 && g.fullTeam, 'real fonts: three scheduled coworkers and full-team control remain above the phone tabs (' + JSON.stringify(g) + ')');
    ok(!g.overflow && /Larder/.test(g.section), 'real fonts: personal section remains visible without sideways scroll');
    if (name === 'Ann') short = g;
    else if (name === LONG && short) ok(Math.abs(g.own.top - short.own.top) <= 2 && Math.abs(g.own.height - short.own.height) <= 1 && Math.abs(g.team.height - short.team.height) <= 1,
      'real fonts: compact full-name heading preserves the ordinary enlarged-text card geometry within two pixels');
  });
  for (const name of [LONG, 'अदिति शर्मा', '李明', 'W'.repeat(40)]) await step('fallback ' + name, async () => {
    await open(name, { settings: { text: 'xlarge' } });
    const g = await homeGeometry(p);
    ok(g.named && g.heading === 'Welcome, ' + name && g.nameFits && !g.overflow, 'fallback: full name is readable and wraps without horizontal clipping (' + name + ')');
    ok(/Larder/.test(g.section), 'fallback: the personal section remains available');
    if (name === LONG) ok(g.visible === 3, 'fallback: the representative 40-character name preserves three visible coworkers at enlarged text');
  });
  for (const size of [{ width: 390 }, { width: 390, text: 'xlarge' }, { width: 768 }, { width: 1280 }, { width: 1400 }, { width: 1440 }]) await step('shared header ' + size.width + ' ' + (size.text || 'normal'), async () => {
    const { width, text } = size;
    await open(LONG, { width, height: width === 390 ? 844 : 1000, deviceMode: 'shared', settings: text ? { text } : {} });
    const header = await p.evaluate(() => {
      const buttons = [...document.querySelectorAll('.wtop-icons button,.wtop-icons a')].filter(e => e.getClientRects().length);
      const brand = document.querySelector('.wtop-brand .rb-mark').getBoundingClientRect(), icons = document.querySelector('.wtop-icons').getBoundingClientRect();
      return { visible: buttons.every(e => { const b = e.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth + 1 && b.width >= 43 && b.height >= 43; }),
        separate: brand.right <= icons.left + 1,
        identity: document.querySelector('.wtop-who').getAttribute('aria-label'), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    ok(header.visible && header.separate && !header.overflow && header.identity.includes(LONG), width + '/' + (text || 'normal') + ': long-name shared header keeps logo and controls separate, reachable and fully labelled (' + JSON.stringify(header) + ')');
    await p.click('.wtop-who');
    ok((await L.txt(p, '.wm-me-n b')) === LONG && (await L.txt(p, '.wm-out b')).includes(LONG), width + ': one tap reveals the complete name and named sign-out action');
  });
  await step('seasonal named Home', async () => {
    await open('Ann', { settings: { text: 'xlarge' } });
    const loaded = await realFonts(p);
    if (!loaded) console.log('Seasonal welcome uses fallback fonts; its collision checks still run.');
    await L.waitFor(p, () => !!window.KB_SEASONAL && !!window.KB_EFFECTS);
    const facts = () => p.evaluate(() => {
      const text = [...document.querySelectorAll('.wall-main > .wall-h,.wall-main > .wall-date')].flatMap(e => {
        const range = document.createRange(); range.selectNodeContents(e); return [...range.getClientRects()];
      });
      const ornaments = [...document.querySelectorAll('.wall-main > .kb-hang .kb-hang-item')].filter(e => e.getClientRects().length);
      const hit = ornaments.some(e => { const a = e.getBoundingClientRect(); return text.some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top); });
      return { hit, visible: ornaments.length, note: !!document.querySelector('.kb-season-note'), ambient: KB_EFFECTS.status().ambientCount,
        heading: document.querySelector('#rtitle').textContent, named: document.querySelector('#rtitle').classList.contains('hm-welcome'), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    async function theme(selection, motion = 'gentle') {
      await p.evaluate(value => KB_SEASONAL.configure(value), { selection, motion, density: 'festive' });
      await L.waitFor(p, id => document.querySelector('#app').dataset.kbTheme === id, selection);
      await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    }
    for (const name of ['Ann', 'Ana María O’Neill', LONG]) {
      if (name !== 'Ann') {
        await p.evaluate(([cfg, roster, name]) => {
          const c = JSON.parse(JSON.stringify(__fake.dump()[cfg]));
          c.people.forEach(person => { if (person.id === 'ann') person.name = name; });
          __fake.write(cfg, c);
          __fake.write(roster, Object.fromEntries(['people', 'staffIds', 'sousIds', 'headId', 'fnIds', 'fnOnlyIds'].filter(k => c[k] !== undefined).map(k => [k, c[k]])));
        }, [key(['config', 'main']), key(['login', 'roster']), name]);
        await L.waitFor(p, n => document.querySelector('#rtitle.hm-welcome')?.textContent.endsWith(', ' + n), name);
        const renamed = await facts();
        ok(!renamed.hit && renamed.note && !renamed.overflow, 'active celebration stays clear immediately after live rename to ' + name);
      }
      for (const id of ['in-diwali', 'np-tihar', 'ph-lunar-new-year', 'bali-galungan']) {
        await theme(id);
        const f = await facts();
        ok(!f.hit && f.note && f.ambient > 0 && !f.overflow && f.named && f.heading.endsWith(', ' + name),
          id + ': complete enlarged welcome and date stay clear while celebration note and ambience remain (' + name + ')');
      }
    }
    await theme('np-tihar', 'still');
    const still = await facts();
    ok(!still.hit && still.note && !still.overflow, 'Still preserves the complete welcome and seasonal explanation without an overlap');
    await p.setViewportSize({ width: 1280, height: 1000 });
    await theme('np-tihar');
    const desktop = await facts();
    ok(!desktop.hit && desktop.note && desktop.ambient > 0 && !desktop.overflow, 'desktop long welcome also stays clear of seasonal ornaments');
  });
  await step('seasonal neutral Home', async () => {
    p = await L.open(browser, '#/', { who: '', width: 390, height: 844, seasonal: { selection: 'np-tihar', motion: 'gentle', density: 'festive' }, wait: 1200 });
    await L.waitFor(p, () => document.querySelector('#app')?.dataset.kbTheme === 'np-tihar');
    ok(await p.evaluate(() => !document.querySelector('#rtitle.hm-welcome') && document.querySelector('#rtitle').textContent === 'Pick a docket' &&
      [...document.querySelectorAll('.kb-hang-item')].filter(e => e.getClientRects().length).length > 0 &&
      !!document.querySelector('.kb-season-note') && KB_EFFECTS.status().ambientCount > 0), 'neutral Home keeps its anchored ornaments, explanation and ambience');
  });
  const lists = [];
  for (const name of ['Ann', LONG]) await step('Prep unchanged ' + name, async () => {
    p = await L.open(browser, '#/prep', { who: 'ann', width: 390, height: 844, extra: fixture(name), wait: 1200 });
    await L.waitFor(p, () => !!document.querySelector('.nb-left .nb-row'), null, 6000);
    lists.push(await p.evaluate(() => {
      const add = document.querySelector('.nb-addline').getBoundingClientRect();
      return { addTop: add.top, rows: [...document.querySelectorAll('.nb-left .nb-row')].map(e => { const r = e.getBoundingClientRect(); return { top: r.top, height: r.height }; }) };
    }));
    ok(!await L.overflow(p), 'Prep: display name adds no horizontal scroll (' + name + ')');
  });
  ok(lists.length === 2 && JSON.stringify(lists[0]) === JSON.stringify(lists[1]), 'changing display-name length preserves Prep row positions and Add region');
  await browser.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
