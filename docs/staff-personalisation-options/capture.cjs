/* Design evidence only. Synthetic Firebase fixtures and transient DOM proposals.
   Run from this checkout: CHROME=/usr/bin/chromium node docs/staff-personalisation-options/capture.cjs
   This does not change application sources or contact the kitchen database. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../..'), L = require(path.join(ROOT, 'tests/lib'));
const server = require(path.join(ROOT, 'tests/serve'));
const OUT = path.join(__dirname, 'previews');
const BASE = 'http://127.0.0.1:8780/';
const clock = Date.parse('2026-11-09T04:00:00Z'), day = '2026-11-09';
const key = bits => ['kitchens', L.PIN].concat(bits).join('/');
const fontsDir = '/tmp/lk-personalisation-fonts';
const fontsUrl = 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&family=Caveat:wght@700&display=swap';
function download(url, file) {
  if (!fs.existsSync(file)) cp.execFileSync('curl', ['-fsS', '--max-time', '30', url, '-o', file]);
  return fs.readFileSync(file);
}
function fontCss() {
  fs.mkdirSync(fontsDir, { recursive: true });
  const css = download(fontsUrl, path.join(fontsDir, 'fonts.css')).toString();
  return css.replace(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, (_, url) => {
    const bytes = download(url, path.join(fontsDir, path.basename(new URL(url).pathname)));
    return 'url(data:font/ttf;base64,' + bytes.toString('base64') + ')';
  });
}
function fixture(name) {
  const records = {
    [key(['config', 'main'])]: { people: [
      { id: 'ann', name, role: 'staff', active: true, add: true, tick: true },
      { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
      { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true },
      { id: 'jo', name: 'Jo', role: 'staff', active: true, add: true, tick: true }
    ], staffIds: ['ann', 'sam', 'bo', 'jo'], sousIds: ['sam'],
    kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }],
    kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }] },
    [key(['team', day])]: { day,
      on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'larder' }, { id: 'jo', sh: 'lunch', sec: 'sauce' }],
      br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }, { id: 'sam', sh: 'lunch', at: 840, len: 30 }],
      v: 1, at: clock - 3600000, upd: clock - 3600000, by: 'sam' }
  };
  [['Slice onions', 'Larder', '2 tubs'], ['Pick coriander', 'Larder', ''], ['Portion rump', 'Grill', '20'], ['Make gravy', 'Sauce', '5 L'], ['Laksa', 'Sauce', '1 batch'], ['Wash bok choy', 'Larder', '']].forEach(([text, station, qty], i) => {
    records[key(['days', day, 'items', 'preview-' + i])] = { text, station, qty, recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: clock - 3600000 + i * 1000, done: false, deleted: false };
  });
  return records;
}
async function proposal(p, concept, name) {
  await p.evaluate(({ concept, name }) => {
    const h = document.querySelector('#rtitle'), date = document.querySelector('.wall-date');
    if (concept === 'a') {
      h.textContent = 'Welcome, ' + name;
      h.style.overflowWrap = 'anywhere';
      date.textContent = 'Monday, 9 November · 14:00';
    }
    if (concept === 'b') {
      h.textContent = 'Monday, 9 November';
      h.style.cssText = 'font: 600 1rem/1.4 var(--body);margin:0 0 1rem;text-transform:none;color:var(--ink)';
      date.remove();
      const board = document.querySelector('#hm-day-h');
      board.textContent = 'Welcome, ' + name;
      board.style.cssText = 'font:700 2rem/1.1 Caveat,cursive;letter-spacing:0;text-transform:none;overflow-wrap:anywhere';
      const label = document.createElement('span');
      label.textContent = 'Your day';
      label.style.cssText = 'display:block;font:700 .7rem/1.2 var(--display);text-transform:uppercase;letter-spacing:.16em;margin-bottom:2px';
      board.prepend(label);
      board.parentElement.style.alignItems = 'center';
      board.style.minWidth = '0';
    }
    if (concept === 'c') {
      date.textContent = 'Welcome, ' + name + ' · 9 November · 14:00';
      date.style.overflowWrap = 'anywhere';
    }
  }, { concept, name });
}
async function geometry(p) {
  return p.evaluate(() => {
    const rect = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { top: +r.top.toFixed(2), height: +r.height.toFixed(2), bottom: +r.bottom.toFixed(2) }; };
    const tab = document.querySelector('.tabbar'), limit = tab && getComputedStyle(tab).display !== 'none' ? tab.getBoundingClientRect().top : innerHeight;
    const rows = [...document.querySelectorAll('.hm-coworkers > li')];
    return { header: rect('#rtitle'), ownDay: rect('#hm-day'), team: rect('#hm-with'),
      visibleCoworkers: rows.filter(e => e.getBoundingClientRect().bottom <= limit).length,
      totalCoworkers: rows.length, viewportLimit: limit,
      overflow: document.documentElement.scrollWidth > innerWidth,
      fullTeamAvailable: !!document.querySelector('#hm-full-team > summary'),
      fullTeamVisible: document.querySelector('#hm-full-team > summary').getBoundingClientRect().bottom <= limit,
      name: window.LK_PREP.whoName(),
      fontLoaded: document.fonts.check('700 20px Caveat') && document.fonts.check('400 16px Barlow') };
  });
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const css = fontCss(), edgeOnly = process.env.EDGE_ONLY === '1';
  const records = edgeOnly ? JSON.parse(fs.readFileSync(path.join(__dirname, 'measurements.json'))).records.filter(r => r.scenario === 'usual name') : [];
  await new Promise(r => server.listen(8780, '127.0.0.1', r));
  const browser = await L.start();
  try {
    for (const width of edgeOnly ? [] : [390, 768, 1280]) for (const concept of ['baseline', 'a', 'b', 'c']) {
      const p = await L.open(browser, '#/', { base: BASE, who: 'ann', extra: fixture('Ann'), clock, width, height: width === 390 ? 844 : 1000, wait: 1400 });
      await p.addStyleTag({ content: css });
      await p.evaluate(() => document.fonts.ready);
      await L.waitFor(p, () => document.querySelectorAll('.hm-coworkers > li').length === 3, null, 6000);
      await proposal(p, concept, 'Ann');
      await p.screenshot({ path: path.join(OUT, concept + '-' + width + '.png'), fullPage: false });
      const measured = await geometry(p);
      await p.click('#hm-full-team > summary');
      measured.fullTeamOpensInOneTap = await p.locator('#hm-full-team').evaluate(e => e.open);
      records.push({ concept, width, scenario: 'usual name', ...measured, errors: p.errors });
      console.log(concept + '-' + width + '.png');
      await p.context().close();
    }
    for (const name of ['Alexandria Catherine Montgomery-Smythe J', 'अदिति शर्मा']) for (const concept of ['a', 'b', 'c']) {
      const p = await L.open(browser, '#/', { base: BASE, who: 'ann', extra: fixture(name), clock, width: 390, height: 844, wait: 1400 });
      await p.addStyleTag({ content: css }); await p.evaluate(() => document.fonts.ready);
      await L.waitFor(p, () => document.querySelectorAll('.hm-coworkers > li').length === 3, null, 6000);
      await proposal(p, concept, name);
      const scenario = name.startsWith('Alex') ? 'long' : 'unicode';
      await p.screenshot({ path: path.join(OUT, concept + '-' + scenario + '-390.png') });
      records.push({ concept, width: 390, scenario, ...await geometry(p), errors: p.errors });
      await p.context().close();
    }
    for (const name of ['Ann', 'Alexandria Catherine Montgomery-Smythe J']) for (const concept of ['baseline', 'a', 'b', 'c']) {
      const p = await L.open(browser, '#/', { base: BASE, who: 'ann', extra: fixture(name), clock, width: 390, height: 844, wait: 1400 });
      await p.addStyleTag({ content: css }); await p.evaluate(() => document.fonts.ready);
      await L.waitFor(p, () => document.querySelectorAll('.hm-coworkers > li').length === 3, null, 6000);
      await p.evaluate(() => document.documentElement.setAttribute('data-text', 'xlarge'));
      await proposal(p, concept, name);
      const scenario = name === 'Ann' ? 'large-text' : 'long-large-text';
      await p.screenshot({ path: path.join(OUT, concept + '-' + scenario + '-390.png') });
      records.push({ concept, width: 390, scenario, ...await geometry(p), errors: p.errors });
      await p.context().close();
    }
    fs.writeFileSync(path.join(__dirname, 'measurements.json'), JSON.stringify({ source: '29258e6', method: 'Chromium runtime with synthetic Firebase fixtures; proposals applied to transient DOM only; genuine Barlow and Caveat fonts from Google Fonts. Long-name fixture is 40 characters. Enlarged text uses the existing xlarge setting (125%).', limits: 'Preview layout evidence only. No production authentication, role enforcement, save/recovery or screen-reader verification. Home proposals do not touch work pages.', records }, null, 2) + '\n');
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exit(1); });
