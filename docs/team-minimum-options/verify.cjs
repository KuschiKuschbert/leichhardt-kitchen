// Measures the three minimum previews (docs/team-minimum-options/brief.md): screenshots, the first and working screen,
// the Save dock height, where the warning sits, the find and fix tasks, and the states. Made-up data only.
// Run from tests/ with the test server up:  CHROME=<headless shell> node ../docs/team-minimum-options/verify.cjs [a b c mix]
const path = require('path');
const L = require(path.resolve(__dirname, '../../tests/lib'));
const OUT = __dirname, BASE = 'http://127.0.0.1:8777/docs/team-minimum-options/';
const designs = process.argv.slice(2).length ? process.argv.slice(2) : ['a', 'b', 'c'];
async function page(b, d, qs, w) {
  const ctx = await b.newContext({ viewport: { width: w || 390, height: 844 }, deviceScaleFactor: 1, locale: 'en-GB' }); // 24-hour time boxes, as on a phone set to 24-hour time
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE + d + '.html?shot=1' + (qs ? '&' + qs : '')); await p.waitForSelector('.tx-grid, .tk-row'); await p.waitForTimeout(150);
  p.errs = errs; return p;
}
// Is a node's text on screen, not under the Save dock or the tab bar, not scrolled off?
const seen = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(), dock = document.querySelector('.ts-save'), tab = document.querySelector('.ts-tabbar');
  let bottom = innerHeight; if (tab && tab.getClientRects().length && getComputedStyle(tab).display !== 'none') bottom = Math.min(bottom, tab.getBoundingClientRect().top);
  const inDock = dock && dock.contains(e); if (dock && !inDock) bottom = Math.min(bottom, dock.getBoundingClientRect().top);
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), onScreen: r.height > 0 && r.top >= 0 && r.bottom <= bottom + 0.5 }; };
async function measure(p) {
  return p.evaluate(seen => {
    seen = eval('(' + seen + ')');
    const dock = document.querySelector('.ts-save').getBoundingClientRect(), tab = document.querySelector('.ts-tabbar');
    const tabTop = tab && getComputedStyle(tab).display !== 'none' ? tab.getBoundingClientRect().top : innerHeight;
    const rows = [...document.querySelectorAll('.tx-row')], head = document.querySelector('.tx-ghead').getBoundingClientRect();
    const top = head.top <= 120 ? head.bottom : 0, bottom = Math.min(dock.top, tabTop);
    const warnSel = ['.ta-warn', '.tb-line', '.tc-now', '.tx-sh .tm-short'].find(s => document.querySelector(s));
    return { dockH: Math.round(dock.height), rowsVisible: rows.filter(e => { const r = e.getBoundingClientRect(); return r.top >= top - 0.5 && r.bottom <= bottom + 0.5; }).length,
      warn: warnSel ? Object.assign({ sel: warnSel, text: document.querySelector(warnSel).innerText.replace(/\s+/g, ' ').trim() }, seen(warnSel)) : null, pageH: document.documentElement.scrollHeight,
      overflow: document.documentElement.scrollWidth > innerWidth, boardRows: [...document.querySelectorAll('.tm-brow2')].map(e => seen('.tm-brow2:nth-of-type(' + ([...e.parentNode.children].indexOf(e) + 1) + ')')) };
  }, seen.toString());
}
const toWorking = p => p.evaluate(() => { const h = document.querySelector('.tx-ghead'); window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 66); });
async function pickIn(p, sel, label) { await p.locator(sel).click(); await p.waitForTimeout(380); await p.locator('.ts-sheet button', { hasText: label }).first().click(); await p.waitForTimeout(120); }
(async () => {
  const b = await L.start(), out = {};
  for (const d of designs) {
    const r = out[d] = {};
    // first screen and working screen, admin at 390 and 1280, sous chef at 390
    for (const [label, qs, w] of [['admin-390', '', 390], ['team-390', 'team=1', 390], ['admin-1280', '', 1280]]) {
      const p = await page(b, d, qs, w);
      r[label] = { first: await measure(p) }; await p.screenshot({ path: path.join(OUT, d + '-' + label + '.png') });
      await toWorking(p); await p.waitForTimeout(120); r[label].working = await measure(p);
      if (label === 'admin-390') await p.screenshot({ path: path.join(OUT, d + '-working-390.png') });
      r[label].errors = p.errs; await p.context().close();
    }
    // the find task: taps until the words that name the short time are on screen (open people top to bottom for A)
    { const p = await page(b, d, '', 390); let taps = 0, found = await measure(p);
      // A: open people top to bottom until the details name a short time (scrolling is not counted). B and C: the
      // working screen (the service heads at the top), no tap. The plan's short time, not the board's now.
      if (d === 'a') { for (const id of ['sam', 'ari', 'bea', 'cal', 'dev']) { await p.locator('[data-a="bench-open"][data-id="' + id + '"]').click(); taps++; await p.waitForTimeout(100); await p.evaluate(() => { const w = document.querySelector('.ta-warn'); if (w) w.scrollIntoView({ block: 'center' }); }); found = await measure(p); if (found.warn && /Short/.test(found.warn.text) && found.warn.onScreen) break; } }
      else { await toWorking(p); await p.waitForTimeout(100); found = await p.evaluate(seen => { seen = eval('(' + seen + ')'); const sel = document.querySelector('.tb-line') ? '.tb-line' : '.tx-sh .tm-short'; const e = document.querySelector(sel); return e ? { warn: Object.assign({ text: e.innerText.replace(/\s+/g, ' ').trim() }, seen(sel)) } : { warn: null }; }, seen.toString()); }
      r.find = { taps, onScreen: !!(found.warn && found.warn.onScreen), text: found.warn && found.warn.text };
      await p.screenshot({ path: path.join(OUT, d + '-find-390.png') });
      // the fix: Sam K's break to 19:30, Hal's to 19:00, then Save. Each picker is open plus choose.
      let ft = 0;
      // Sam K's details may be open already from the find task (A): then no tap is needed to open them
      if (!await p.locator('.ts-bench[aria-label*="Sam K"]').count()) { await p.locator('[data-a="bench-open"][data-id="sam"]').click(); ft++; }
      await p.waitForTimeout(100); await pickIn(p, '.ts-bench [data-a="br-at"][data-i="0"]', '19:30'); ft += 2;
      await p.locator('[data-a="bench-open"][data-id="hal"]').click(); ft++; await p.waitForTimeout(100); await pickIn(p, '.ts-bench [data-a="br-at"][data-i="0"]', '19:00'); ft += 2;
      const before = await measure(p); await p.screenshot({ path: path.join(OUT, d + '-fixed-draft-390.png') });
      await p.locator('[data-a="save"]').click(); ft++; await p.waitForTimeout(800);
      r.fix = { taps: ft, warnAfterEdit: before.warn && before.warn.text, warnAfterSave: (await measure(p)).warn };
      await p.context().close(); }
    // states: the saved plan loading, a quiet day, no minimum set, a refused Save
    for (const [label, qs] of [['loading', 'state=loading&open=sam'], ['quiet', 'quiet=1&open=sam'], ['nomin', 'nomin=1&open=sam']]) {
      const p = await page(b, d, qs, 390); r[label] = await measure(p); await p.screenshot({ path: path.join(OUT, d + '-' + label + '-390.png'), fullPage: true }); await p.context().close();
    }
    // the combined preview only: a short time already over (19:30), a half-done fix (only Sam K moved), the rows marked
    if (d === 'mix') {
      { const p = await page(b, d, 'at=1170', 390); r.past = await measure(p); await p.context().close(); }
      { const p = await page(b, d, 'open=sam', 390); await pickIn(p, '.ts-bench [data-a="br-at"][data-i="0"]', '19:30'); r.halfFix = await measure(p);
        r.halfFix.tags = await p.evaluate(() => [...document.querySelectorAll('.tx-tag')].map(e => e.closest('.tx-row').dataset.id));
        await p.evaluate(() => { const h = document.querySelector('.tx-ghead'); window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 66); }); await p.waitForTimeout(100);
        await p.screenshot({ path: path.join(OUT, 'mix-halffix-390.png') }); await p.context().close(); }
      { const p = await page(b, d, '', 390); r.tags = await p.evaluate(() => [...document.querySelectorAll('.tx-tag')].map(e => e.closest('.tx-row').dataset.id)); r.boardVisible = (await measure(p)).boardRows.filter(x => x && x.onScreen).length; await p.context().close(); }
      { const p = await page(b, d, 'quiet=1&at=1050', 390); r.quietEarly = await measure(p); await p.screenshot({ path: path.join(OUT, 'mix-quiet-early-390.png') }); await p.context().close(); }
    }
    { const p = await page(b, d, 'page=kitchen', 390); r.kitchen = { pageH: await p.evaluate(() => document.documentElement.scrollHeight), overflow: await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), errors: p.errs };
      await p.screenshot({ path: path.join(OUT, d + '-kitchen-390.png'), fullPage: true }); await p.context().close(); }
  }
  require('fs').writeFileSync(path.join(OUT, 'verify-' + designs.join('') + '.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, (k, v) => k === 'boardRows' ? undefined : v, 1).slice(0, 9000));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
