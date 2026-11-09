/* Actual #/orders runtime, synthetic Firebase only. Run with:
   NODE_PATH=/path/to/tests/node_modules CHROME=/usr/bin/chromium node docs/order-list-options/capture-implementation.cjs
   This script serves this checkout itself. It changes no runtime or test files. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '../..');
const L = require(path.join(root, 'tests/lib.js'));
const F = require(path.join(root, 'tests/supplier-fixtures.js'));
const clock = Date.parse('2026-11-09T04:00:00Z'); // 14:00 Queensland.
const today = '2026-11-09';
const yesterday = '2026-11-08';
const previews = path.join(__dirname, 'previews');
const key = F.key;

function fixture() {
  const extra = F.fixture();
  for (const p of Object.keys(L.seed(extra))) {
    if (/\/orders\/[^/]+\/lines\//.test(p) || /\/suppliers\/[^/]+\/orders\//.test(p)) extra[p] = undefined;
  }
  const config = extra[key(['config', 'main'])];
  config.cutoffs = [
    { id: 'northside', name: 'Northside Test Foods', dd: [2], at: 900, pre: 1, lead: 240 },
    { id: 'west-bay', name: 'West Bay Test Supply', dd: [2], at: 960, pre: 1, lead: 240 }
  ];
  const product = (name, i) => ({ ...F.items[0], id: 'fixture-' + i, name, aliases: [], par: '',
    pack: '', parUnit: '', orderUnit: '', factor: 0,
    source: { file: 'synthetic-order-sheet.pdf', page: 1, row: i + 1, name, par: '' } });
  extra[key(['suppliers', 'northside'])] = { name: 'Northside Test Foods', cutoffId: 'northside', v: 1,
    items: ['Milk', 'Cream', 'Butter', 'Eggs'].map(product), at: clock - 86400000, by: 'sam' };
  extra[key(['suppliers', 'west-bay'])] = { name: 'West Bay Test Supply', cutoffId: 'west-bay', v: 1,
    items: ['Plain flour', 'Tomatoes'].map(product), at: clock - 86400000, by: 'sam' };
  const records = [
    ['Milk', '6 L', ''], ['Brioche buns', '4 packs', ''], ['Coriander', '2 bunches', ''],
    ['Eggs', '2 trays', 'out'], ['Plain flour', '5 kg', ''], ['Cream', '2 L', 'out'],
    ['Tomatoes', '3 kg', ''], ['Butter', '2 kg', 'low']
  ];
  records.forEach(([text, qty, need], i) => {
    const id = 'baseline-' + i;
    extra[key(['orders', today, 'lines', id])] = { text, qty, need, recipes: [], addedBy: 'Ann',
      addedById: 'ann', addedAt: clock - 3600000 + i * 60000, ordered: false, deleted: false,
      ...(text === 'Butter' ? { rolled: 1, since: yesterday, rolledFrom: yesterday,
        root: 'baseline-butter-old', from: 'baseline-butter-old', origBy: 'Ann', addedAt: clock - 86400000 } : {}) };
  });
  return extra;
}

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ttf': 'font/ttf' };
function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
      fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
        res.end(req.method === 'HEAD' ? undefined : data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function fonts(page, base) {
  const css = fs.readFileSync(path.join(__dirname, 'assets/fonts.css'), 'utf8')
    .replace(/url\(([^)]+)\)/g, (_, file) => 'url(' + base + 'docs/order-list-options/assets/' + file.replace(/["']/g, '') + ')');
  await page.addStyleTag({ content: css });
  const loaded = await page.evaluate(async () => {
    const faces = ['400 16px Barlow', '600 16px Barlow', '700 16px Barlow',
      '600 16px "Barlow Condensed"', '700 16px "Barlow Condensed"', '600 16px Caveat', '700 16px Caveat'];
    await Promise.all(faces.map(font => document.fonts.load(font)));
    await document.fonts.ready;
    return faces.map(font => ({ font, loaded: document.fonts.check(font) }));
  });
  if (loaded.some(f => !f.loaded)) throw new Error('Required font did not load');
  await L.settle(page, 500);
  return loaded;
}

async function measure(page) {
  return page.evaluate(() => {
    const round = n => Math.round(n * 100) / 100;
    const box = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height),
        top: round(r.top), bottom: round(r.bottom) };
    };
    const topbar = document.querySelector('.wtop');
    const dock = document.querySelector('.o-page .wk-dock');
    const tabbar = document.querySelector('.tabbar');
    const visible = el => el && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0;
    const dockFixed = visible(dock) && ['fixed', 'sticky'].includes(getComputedStyle(dock).position);
    const tabsFixed = visible(tabbar) && ['fixed', 'sticky'].includes(getComputedStyle(tabbar).position);
    const top = topbar ? topbar.getBoundingClientRect().bottom : 0;
    const bottom = Math.min(innerHeight, dockFixed ? dock.getBoundingClientRect().top : innerHeight,
      tabsFixed ? tabbar.getBoundingClientRect().top : innerHeight);
    const rows = [...document.querySelectorAll('.o-main .nb-row')].map(el => {
      const r = el.getBoundingClientRect();
      const name = el.querySelector('.nb-t');
      const rect = box(el);
      return { id: el.querySelector('[data-id]')?.getAttribute('data-id') || el.id,
        text: name ? name.textContent.trim() : el.textContent.trim(), ...rect,
        fullyVisible: r.top >= top && r.bottom <= bottom && r.width > 0,
        intersectsUsableViewport: r.bottom > top && r.top < bottom && r.width > 0 };
    });
    const bands = [...document.querySelectorAll('.cut-band')].filter(el => el.getBoundingClientRect().height > 0).map(box);
    return { viewport: { width: innerWidth, height: innerHeight }, scrollY, topbar: box(topbar), dock: box(dock),
      dockPosition: dock ? getComputedStyle(dock).position : null, tabbar: box(tabbar),
      usableViewport: { top: round(top), bottom: round(bottom), height: round(bottom - top) },
      cutoffFold: box(document.querySelector('.o-cut-fold')), cutoffSummary: box(document.querySelector('.o-cut-fold > summary')),
      cutoffSummaryText: document.querySelector('.o-cut-fold > summary')?.innerText.trim(),
      cutoffTitle: document.querySelector('.o-cut-copy strong') ? { text: document.querySelector('.o-cut-copy strong').textContent.trim(), clientWidth: document.querySelector('.o-cut-copy strong').clientWidth, scrollWidth: document.querySelector('.o-cut-copy strong').scrollWidth } : null,
      cutoffSummaryNameTruncated: !!document.querySelector('.o-cut-name') && document.querySelector('.o-cut-name').scrollWidth > document.querySelector('.o-cut-name').clientWidth,
      cutoffAbsoluteTime: document.querySelector('.o-cut-at') ? { text: document.querySelector('.o-cut-at').textContent.trim(), ...box(document.querySelector('.o-cut-at')) } : null,
      principalTargets: [...document.querySelectorAll('.o-cut-fold > summary, .o-page [data-p="o-write"], .o-main [data-p="otick"]')].map(el => ({ action: el.getAttribute('data-p'), ...box(el) })),
      cutoffOpen: !!document.querySelector('.o-cut-fold')?.open,
      cutoffActions: [...document.querySelectorAll('.o-cut-fold [data-p="cut-tick"]')].map(el => ({ label: el.textContent.trim(), ...box(el) })),
      cutoffBands: bands, totalCutoffBandHeight: round(bands.reduce((n, b) => n + b.height, 0)),
      firstRequestTop: rows[0]?.top ?? null, rows,
      fullyVisibleRequestRows: rows.filter(r => r.fullyVisible).length,
      partiallyVisibleRequestRows: rows.filter(r => r.intersectsUsableViewport && !r.fullyVisible).length,
      totalRequestRows: rows.length,
      supplierGroupingShown: !!document.querySelector('.o-sups'),
      orderedTodayCount: document.querySelector('.nb-prog')?.textContent.trim(),
      horizontalOverflowPx: Math.max(0, document.documentElement.scrollWidth - innerWidth) };
  });
}

async function checkTasks(page) {
  await page.locator('.o-cut-fold > summary').focus();
  await page.keyboard.press('Enter');
  if (!(await page.locator('.o-cut-fold').evaluate(el => el.open))) throw new Error('Keyboard Enter did not open cut-offs');
  await page.keyboard.press('Space');
  if (await page.locator('.o-cut-fold').evaluate(el => el.open)) throw new Error('Keyboard Space did not close cut-offs');
  await page.locator('[data-p="o-write"]').click();
  await L.settle(page, 250);
  if (!(await page.locator('.o-sheet[role="dialog"]').count())) throw new Error('Add sheet did not open');
  await page.locator('#o-text').fill('Baseline task check');
  await page.locator('#o-qty').fill('1 kg');
  await page.locator('.o-sheet button[type="submit"]').click();
  await L.settle(page, 500);
  const added = await page.evaluate(() => Object.values(window.__fake.dump()).some(x => x && x.text === 'Baseline task check' && !x.deleted));
  if (!added) throw new Error('Add task did not save');
  await page.keyboard.press('Escape');
  await L.settle(page, 200);
  await page.locator('.o-main [data-p="otick"][data-id="baseline-1"]').first().click();
  await L.settle(page, 400);
  const ordered = await page.evaluate(p => window.__fake.dump()[p]?.ordered === true, key(['orders', today, 'lines', 'baseline-1']));
  if (!ordered) throw new Error('Ordered task did not save');
  await page.locator('.o-cut-fold > summary').click();
  await page.locator('[data-p="cut-tick"]').first().click();
  await L.settle(page, 400);
  const supplierSaved = await page.evaluate(p => window.__fake.dump()[p]?.on === true, key(['cutdone', today + '_northside']));
  if (!supplierSaved) throw new Error('Supplier confirmation task did not save');
  return { entryToAddFormTaps: 1, addThroughSubmitTaps: 2, markItemOrderedTaps: 1, confirmSupplierFromClosedTaps: 2,
    keyboardDisclosureEnterSpace: true, verifiedWithRealControls: true, typingExcluded: true, formCloseExcluded: true,
    note: 'Count begins on the Orders page. Add keeps its sheet open after submission. Item Ordered is chef-only.' };
}

(async () => {
  fs.mkdirSync(previews, { recursive: true });
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await L.start();
  const captures = [];
  const sourceHashes = Object.fromEntries(['js/prep.js', 'css/app.css'].map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')]));
  let tasks;
  try {
    const scenarios = [
      { role: 'chef', who: 'sam', width: 390, height: 844 },
      { role: 'chef', who: 'sam', width: 768, height: 1024 },
      { role: 'chef', who: 'sam', width: 1280, height: 900 },
      { role: 'staff', who: 'ann', width: 390, height: 844 },
      { role: 'chef', who: 'sam', width: 390, height: 844, text: 'xlarge' },
      { role: 'chef', who: 'sam', width: 390, height: 844, state: 'overdue' },
      { role: 'chef', who: 'sam', width: 390, height: 844, text: 'xlarge', state: 'overdue' },
      { role: 'chef', who: 'sam', width: 390, height: 844, state: 'long-name' }
    ];
    for (const scenario of scenarios) {
      const {role, who, width, height, text, state} = scenario;
      const extra = fixture();
      if (state === 'overdue') extra[key(['config', 'main'])].cutoffs.forEach(c => { c.at -= 180; });
      if (state === 'long-name') extra[key(['config', 'main'])].cutoffs[0].name = 'Northside Test Foods and Commercial Kitchen Supply';
      const page = await L.open(browser, '#/orders', { base, who, width, height, extra, clock,
        settings: text ? { text } : {}, touch: width === 390, wait: 1600 });
      await L.waitFor(page, () => document.querySelectorAll('.o-main .nb-row').length === 8, null, 8000);
      if (role === 'chef') await L.waitFor(page, () => !!document.querySelector('.o-cut-fold'), null, 8000);
      const loadedFonts = await fonts(page, base);
      const states = role === 'chef' ? ['closed', 'open'] : ['plain'];
      for (const disclosure of states) {
        if (disclosure === 'open') {
          await page.locator('.o-cut-fold > summary').click();
          await L.settle(page, 200);
        }
        await page.evaluate(() => scrollTo(0, 0));
        await L.settle(page, 200);
        const screenshot = 'previews/built-' + role + '-' + width + (text ? '-' + text : '') + (state ? '-' + state : '') + '-' + disclosure + '.png';
        const measurements = await measure(page);
        if (measurements.cutoffTitle && measurements.cutoffTitle.scrollWidth > measurements.cutoffTitle.clientWidth) throw new Error('Cut-off count title truncated: ' + screenshot);
        if (measurements.horizontalOverflowPx || page.errors.length) throw new Error('Layout overflow or browser error: ' + screenshot);
        if (measurements.principalTargets.some(b => b.width < 44 || b.height < 44)) throw new Error('Principal target below44px: ' + screenshot);
        if (disclosure === 'open' && measurements.cutoffActions.some(b => b.width < 44 || b.height < 44)) throw new Error('Supplier target below44px: ' + screenshot);
        await page.screenshot({ path: path.join(__dirname, screenshot), fullPage: false, animations: 'disabled' });
        captures.push({ role, text: text || 'normal', state: state || 'normal', disclosure, screenshot, ...measurements, loadedFonts, pageErrors: page.errors.slice() });
        console.log(screenshot + ': ' + measurements.fullyVisibleRequestRows + ' full rows, summary ' + (measurements.cutoffSummary?.height || 0) + ' px, overflow ' + measurements.horizontalOverflowPx);
      }
      if (role === 'chef' && width === 390 && !state && !text) {
        await page.locator('.o-cut-fold > summary').click();
        tasks = await checkTasks(page);
      }
      await page.context().close();
    }
    const output = { sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
      sourceWorkingTree: 'Implementation changes under review; commit above is the base before these uncommitted runtime changes.',
      sourceHashes,
      kind: 'Actual implemented app C with synthetic Firebase fixtures', route: '#/orders',
      clock: { iso: new Date(clock).toISOString(), kitchenDate: today, kitchenTime: '14:00', timezone: 'Australia/Brisbane' },
      fixture: { requests: 8, completedRequests: 0, earlierRequests: 1,
        low: ['Butter'], out: ['Cream', 'Eggs'], supplierCutoffs: ['Northside Test Foods 15:00', 'West Bay Test Supply 16:00'] },
      measurementDefinition: 'Unscrolled CSS pixels. A request row counts only when its entire bounding box lies below the top bar and above the fixed Add dock or tab bar, or viewport bottom when those controls are not fixed. The summary and full disclosure have independent bounding boxes. Screenshot normal content exactly matches baseline; overdue and long-name scenarios only vary the named cutoff fields.',
      limitations: ['Synthetic records and Firebase SDK stand-in; no live kitchen data or server verification.',
        'The only page style injection loads bundled copies of Barlow, Barlow Condensed and Caveat. Runtime DOM and layout CSS are unchanged.',
        'Large text uses the app existing xlarge setting at 125 percent.',
        'The runtime derives Used in recipe links for Eggs, Cream, Plain flour and Butter from its shipped recipe book. These links are retained.',
        'Chromium with device scale factor 1 and overlay-style hidden scrollbars; browser chrome, virtual keyboard and device safe areas are not simulated.',
        'The app clock starts at 14:00 and advances normally for a few seconds during each capture.',
        'Visible-row counts describe these eight synthetic requests, names, font sizes and cut-offs; they are not a density guarantee for every kitchen list.'],
      tasks, captures };
    fs.writeFileSync(path.join(__dirname, 'implementation-measurements.json'), JSON.stringify(output, null, 2) + '\n');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exit(1); });
