// Real-app comparison with synthetic records and the existing official fonts.
// CHROME=/usr/bin/chromium node docs/staff-personalisation-options/capture-welcomes.cjs
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../..'), L = require(path.join(ROOT, 'tests/lib'));
const server = require(path.join(ROOT, 'tests/serve'));
const OUT = path.join(__dirname, 'random-welcomes'), BASE = 'http://127.0.0.1:8781/';
const clock = Date.parse('2026-11-09T04:00:00Z'), day = '2026-11-09';
const key = bits => ['kitchens', L.PIN].concat(bits).join('/');
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

async function inspect(p) {
 return p.evaluate(()=>{
  const rect=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return{top:+r.top.toFixed(2),height:+r.height.toFixed(2),bottom:+r.bottom.toFixed(2)}};
  const tab=document.querySelector('.tabbar'),limit=tab&&getComputedStyle(tab).display!=='none'?tab.getBoundingClientRect().top:innerHeight;
  const rows=[...document.querySelectorAll('.hm-coworkers > li')],summary=document.querySelector('#hm-full-team > summary'),heading=document.querySelector('#rtitle');
  const headingLines=[...document.querySelectorAll('.wall-main > .wall-h,.wall-main > .wall-date')].flatMap(e=>{const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()]});
  const ornaments=[...document.querySelectorAll('.kb-hang-item')].filter(e=>e.getClientRects().length);
  const seasonal={theme:document.querySelector('#app')?.dataset.kbTheme||'off',visibleOrnaments:ornaments.length,note:!!document.querySelector('.kb-season-note'),ambient:window.KB_EFFECTS?.status().ambientCount||0,
   overlap:ornaments.some(e=>{const a=e.getBoundingClientRect();return headingLines.some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)})};
  return{heading:heading?.textContent||'',headingRect:rect('#rtitle'),headingFont:heading?getComputedStyle(heading).font:null,ownDay:rect('#hm-day'),team:rect('#hm-with'),seasonal,
   visibleCoworkers:rows.filter(e=>e.getBoundingClientRect().bottom<=limit).length,totalCoworkers:rows.length,viewportLimit:limit,
   fullTeamVisible:!!summary&&summary.getBoundingClientRect().bottom<=limit,overflow:document.documentElement.scrollWidth>innerWidth,
   dayText:document.querySelector('#hm-day')?.textContent||'',teamText:document.querySelector('#hm-with')?.textContent||'',
   name:window.LK_PREP?.whoName?.()||'',fonts:[...document.fonts].filter(f=>['Barlow','Barlow Condensed','Caveat'].includes(f.family.replaceAll('"',''))).map(f=>({family:f.family,weight:f.weight,status:f.status})),
   topbarLabels:[...document.querySelectorAll('.wtop [aria-label]')].map(e=>e.getAttribute('aria-label'))};
 });
}

(async () => {
  const fontPath = process.env.LK_WELCOME_TEST_FONTS;
  if (!fontPath) throw new Error('Set LK_WELCOME_TEST_FONTS to locally supplied official font CSS.');
  const css = fs.readFileSync(fontPath, 'utf8'), records = [];
  const baseline = cp.execFileSync('git', ['show', '7f85629:js/app.js'], { cwd: ROOT }).toString();
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => server.listen(8781, '127.0.0.1', r));
  const browser = await L.start(), context = browser.newContext.bind(browser);
  let before = false;
  browser.newContext = async options => {
    const ctx = await context(options);
    if (before) await ctx.route('**/js/app.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: baseline }));
    return ctx;
  };
  try {
    for (const width of [390, 768, 1280]) for (const variant of ['ordinary', 'tihar', 'long-large']) for (const phase of ['before', 'after']) {
      before = phase === 'before';
      const name = variant === 'long-large' ? 'Alexandria Catherine Montgomery-Smythe J' : 'Ann';
      const id = phase + '-' + variant + '-' + width;
      const p = await L.open(browser, '#/', { base: BASE, who: 'ann', extra: fixture(name), clock, width, height: width === 390 ? 844 : 1000, wait: 1300,
        settings: variant === 'long-large' ? { text: 'xlarge' } : {}, seasonal: { selection: variant === 'ordinary' ? 'off' : 'auto', motion: 'still' },
        init: () => { Math.random = () => 0.3; } });
      await p.addStyleTag({ content: css }); await p.evaluate(() => document.fonts.ready);
      await L.waitFor(p, () => document.querySelectorAll('.hm-coworkers > li').length === 3);
      if (variant === 'long-large') await p.evaluate(() => KB_SEASONAL.configure({ selection: 'fun-star-wars-day', motion: 'still' }));
      await L.settle(p, 300);
      const measured = await inspect(p);
      records.push({ id, phase, width, variant, ...measured, errors: p.errors });
      if (width !== 768 && variant !== 'ordinary') await p.screenshot({ path: path.join(OUT, id + '.png') });
      await p.context().close();
    }
    const prep = [];
    for (const phase of ['before', 'after']) {
      before = phase === 'before';
      const p = await L.open(browser, '#/prep', { base: BASE, who: 'ann', extra: fixture('Ann'), clock, width: 390, height: 844, wait: 1500 });
      await p.addStyleTag({ content: css }); await p.evaluate(() => document.fonts.ready);
      await L.waitFor(p, () => !!document.querySelector('.nb-left .nb-row'));
      prep.push({ phase, ...await p.evaluate(() => {
        const add = document.querySelector('.nb-addline').getBoundingClientRect();
        const rows = [...document.querySelectorAll('.nb-left .nb-row')].map(e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
        return { addTop: add.top, visibleRows: rows.filter(r => r.top >= 0 && r.bottom <= add.top).length, rows };
      }), errors: p.errors });
      await p.context().close();
    }
    const result = { baseline: '7f85629', method: 'Full app, synthetic Firebase records, official app fonts supplied locally, 390x844 and 768/1280x1000. Baseline swaps only original app.js. No layout DOM edits.', sourceHash: require('crypto').createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'js/app.js'))).digest('hex'), records, prep };
    fs.writeFileSync(path.join(OUT, 'measurements.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(records.map(r => ({ id: r.id, greeting: r.heading, headingHeight: r.headingRect.height, teamTop: r.team.top, visibleCoworkers: r.visibleCoworkers, prep: r.prep, errors: r.errors, overflow: r.overflow })));
    if (records.some(r => r.errors.length || r.overflow || r.seasonal.overlap)) throw new Error('Capture errors or overflow');
  } finally { await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exit(1); });
