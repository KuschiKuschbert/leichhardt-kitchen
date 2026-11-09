// Home distinguishes current work from Your day; a desktop festival uses width without losing its explanation.
// Synthetic records and the existing per-tab celebration test hook, never a saved festival choice.
const L = require('./lib'), M = require('../js/functions'), { R, ok } = L.results();
const day = L.ymd(new Date(L.NOW)), key = p => ['kitchens', L.PIN].concat(p).join('/');
function booking(min, name) {
  const at = M.kat(day, min);
  return M.derive({ v: 1, status: 'confirmed', name, date: day, start: at, st: false, loc: '', guests: 40, gu: false, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at, note: '' }], lines: [{ rid: 'pizza-platter', name: 'Pizza Platter', unit: 'platter', spec: '', fp: '', qty: 2, u: M.toU([2]) }], was: {}, chg: [], cBy: 'sam', cAt: L.NOW - 86400000, confBy: 'sam', confAt: L.NOW - 86400000, by: 'sam', upd: L.NOW - 3600000 });
}
const extra = {
  [key(['config', 'main'])]: { ...L.seed()[key(['config', 'main'])], staffIds: ['ann', 'sam', 'bo'], kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }], kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 1020 }] },
  [key(['team', day])]: { day, on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }], br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }], v: 1, by: 'sam', at: L.NOW - 3600000, upd: L.NOW - 3600000 },
  [key(['functions', 'near'])]: booking(850, 'Example near service'), [key(['functions', 'later'])]: booking(990, 'Example later service')
};
async function pair(p, selector, outline) {
  return p.locator(selector).first().evaluate((e, outline) => {
    const rgba = s => (s.match(/[\d.]+/g) || []).map(Number);
    const lum = s => rgba(s).slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((n, x, i) => n + x * [.2126, .7152, .0722][i], 0);
    const style = getComputedStyle(e); let bg = outline ? e.parentElement : e, layers = [], composed = [255, 255, 255];
    while (bg) { layers.unshift(rgba(getComputedStyle(bg).backgroundColor)); bg = bg.parentElement; }
    layers.forEach(c => { const alpha = c.length > 3 ? c[3] : 1; composed = composed.map((n, i) => c[i] * alpha + n * (1 - alpha)); });
    const a = lum(outline ? style.outlineColor : style.color), b = lum('rgb(' + composed.join(', ') + ')');
    return { ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), outline: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  }, outline);
}
async function theme(p, id) {
  await p.evaluate(selection => KB_SEASONAL.configure({ selection, motion: 'still', density: 'festive' }), id);
  await L.waitFor(p, selected => document.querySelector('.kb-season-note')?.dataset.kbSeason === selected && KB_CELEBRATION_TICKER.status().fontsReady, id, 8000);
}
(async () => {
  const b = await L.start(); let p;
  async function step(name, fn) {
    try { await fn(); }
    catch (e) { ok(false, name + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length && !await L.overflow(p), name + ': no page errors or horizontal overflow ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }
  for (const width of [390, 768, 1280]) await step('work colour ' + width, async () => {
    p = await L.open(b, '#/', { who: 'ann', width, height: 900, extra, wait: 1200 });
    await L.waitFor(p, () => document.querySelectorAll('#hm-board .hm-a').length >= 2);
    const colours = await p.evaluate(() => ['#hm-day', '#hm-board'].map(s => getComputedStyle(document.querySelector(s)).backgroundColor));
    ok(colours[0] !== colours[1], width + ': Your day and Now and next have distinct surfaces');
    for (const selector of ['#hm-board .hm-bt', '#hm-board .hm-t', '#hm-board .hm-s', '#hm-board .hm-tm', '#hm-board .hm-a.is-hot .hm-n', '#hm-board .hm-a:not(.is-hot) .hm-s']) {
      const value = await pair(p, selector); ok(value.ratio >= 4.5, width + ': work text and urgent labels remain legible ' + selector + ' (' + value.ratio.toFixed(2) + ')');
    }
    ok((await pair(p, '#hm-day .hm-t')).ratio >= 4.5, width + ': Your day remains readable');
    await p.locator('#hm-board .hm-a').first().focus(); const focus = await pair(p, '#hm-board .hm-a', true);
    ok(focus.ratio >= 3 && focus.outline !== 'none' && focus.width >= 2, width + ': keyboard focus remains visible against the work surface');
  });
  for (const width of [1100, 1280, 1440]) await step('desktop festival ' + width, async () => {
    p = await L.open(b, '#/', { who: 'ann', width, height: 900, extra, wait: 1000 });
    await L.waitFor(p, () => !!window.KB_SEASONAL && !!document.querySelector('.hm'));
    for (const id of ['in-diwali', 'np-tihar', 'ph-lunar-new-year']) {
      await theme(p, id);
      const g = await p.evaluate(() => {
        const r = s => { const x = document.querySelector(s).getBoundingClientRect(); return { left: x.left, right: x.right, top: x.top, bottom: x.bottom, width: x.width, height: x.height }; };
        return { note: r('.kb-season-note'), heading: r('.kb-season-heading'), ticker: r('[data-kb-ticker]'), work: r('.hm') };
      });
      ok(Math.abs(g.note.left - g.work.left) <= 1 && Math.abs(g.note.right - g.work.right) <= 1, width + '/' + id + ': celebration spans the Home content width');
      ok(g.heading.right <= g.ticker.left + 1 && g.note.height <= Math.max(g.heading.height, g.ticker.height) + 24 && g.note.bottom <= g.work.top + 1, width + '/' + id + ': heading and explanation share a thin row without covering staff information');
      const languages = [], heights = [];
      for (let i = 0; i < 6; i++) {
        const line = await p.evaluate(() => {
          const e = document.querySelector('.kb-season-note .kb-ticker-line[aria-hidden="false"]'), n = document.querySelector('.kb-season-note'), r = e.getBoundingClientRect(), b = n.getBoundingClientRect();
          const id = n.dataset.kbSeason, locale = e.lang;
          return { locale, complete: e.textContent === KB_CELEBRATION_COPY.events[id][locale], inside: r.left >= b.left && r.right <= b.right + 1 && r.top >= b.top && r.bottom <= b.bottom + 1 && e.scrollHeight <= e.clientHeight + 1, height: b.height };
        });
        languages.push(line.locale); heights.push(line.height);
        ok(line.complete && line.inside, width + '/' + id + '/' + line.locale + ': full explanation remains visible without clipping');
        await p.evaluate(() => KB_CELEBRATION_TICKER.next());
      }
      ok(new Set(languages).size === 6 && Math.max(...heights) - Math.min(...heights) < 1, width + '/' + id + ': all six languages retain a stable banner height');
    }
    await p.locator('.wtop-who').focus(); await p.keyboard.press('Enter');
    ok(await p.locator('.wm-wrap').isVisible(), width + ': chef-hat menu still opens by keyboard');
    await p.keyboard.press('Escape');
  });
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
