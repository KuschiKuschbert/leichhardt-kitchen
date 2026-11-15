// Measures the section previews (docs/team-sections-options/brief.md). Preview only: made-up data, fallback fonts,
// an imitation of the admin shell. Counts real taps (window.__taps counts every button, link or input tap), complete
// person rows, row heights, sideways scroll, visible targets under 44 px, page errors and the Save states.
// Run from the repo root:  CHROME=<headless shell> node docs/team-sections-options/verify.cjs [designs]
const path = require('path'), fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../../tests/node_modules/playwright-core'));
const server = require(path.resolve(__dirname, '../../tests/serve'));
const PORT = 8779, BASE = 'http://127.0.0.1:' + PORT + '/docs/team-sections-options/';
const designs = (process.argv[2] || 'a,b,c').split(',');
const out = { source: 'Preview', note: 'Made-up data, fallback fonts, imitation admin shell (first row about 600 px down at 390 px).', results: {} };
let fails = 0, checks = 0;
const ok = (c, m) => { checks++; if (!c) { fails++; console.log('FAIL ' + m); } return !!c; };

async function measure(p) {
  return p.evaluate(() => {
    const rows = [...document.querySelectorAll('.ta-row, .tb-grid tbody tr:not(.tb-benchrow), .tc-row, .tx-row')];
    const save = document.querySelector('.ts-save'), bar = document.querySelector('.ts-tabbar'), top = document.querySelector('.ts-top');
    let bottom = innerHeight;
    if (bar && getComputedStyle(bar).display !== 'none') bottom = Math.min(bottom, bar.getBoundingClientRect().top);
    if (save) { const r = save.getBoundingClientRect(); if (r.top < bottom && r.top > 0) bottom = r.top; }
    const topLine = top ? top.getBoundingClientRect().bottom : 0;
    const full = rows.filter(e => { const r = e.getBoundingClientRect(); return r.top >= topLine - 0.5 && r.bottom <= bottom + 0.5; }).length;
    const small = [...document.querySelectorAll('button, a, input, summary')].filter(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width && r.height && cs.visibility !== 'hidden' && !e.closest('.ts-design-switch') && !e.closest('.ts-top') && (r.height < 43.5 || r.width < 43.5) && !e.classList.contains('ts-link'); }).map(e => (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 30));
    return { complete: full, firstTop: rows[0] ? Math.round(rows[0].getBoundingClientRect().top + scrollY) : null, rowH: rows.slice(0, 3).map(e => Math.round(e.getBoundingClientRect().height)), sideways: document.documentElement.scrollWidth > innerWidth, small: [...new Set(small)].slice(0, 6), pageH: document.documentElement.scrollHeight };
  });
}
async function working(p) {
  // the working screen: the first row just under the sticky top bar
  await p.evaluate(() => { const r = document.querySelector('.ta-row, .tb-grid thead, .tc-start, .tx-say'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 76); });
  await p.waitForTimeout(80);
  return (await measure(p)).complete;
}
const state = p => p.evaluate(() => JSON.parse(JSON.stringify(window.TS.on)));
const want = p => p.evaluate(() => window.TS.want);
async function chooseIn(p, label) {
  await p.waitForTimeout(360);   // the picker ignores taps for 350 ms after it opens (the double-tap guard)
  const b = p.locator('.ts-sheet button[data-i]').filter({ hasText: new RegExp('^' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first();
  await b.click(); await p.waitForTimeout(360);   // a person's pace: the next tap is not part of a double tap
}
async function sectionsTask(p, d) {
  const w = await want(p), names = await p.evaluate(() => Object.fromEntries(window.TS.sections.map(s => [s.id, s.name])));
  await p.evaluate(() => { window.__taps = 0; });
  if (d === 'c') {
    await p.click('[data-a="go"]');
    for (let n = 0; n < 40 && await p.locator('.tc-sheet').count(); n++) {
      const head = await p.locator('.tc-sheet h3').innerText(), [who, svc] = head.split(' · ');
      const ids = await p.evaluate(([who, svc]) => [window.TS.people.find(x => x.name === who).id, window.TS.services.find(s => s.name === svc).id], [who, svc]);
      const target = names[w[ids[0]][ids[1]]];
      const same = p.locator('.tc-sheet .tc-same');
      if (await same.count() && (await same.innerText()).endsWith(': ' + target)) { await same.click(); await p.waitForTimeout(30); }
      else await p.locator('.tc-sheet .tc-opts button').filter({ hasText: new RegExp('^' + target + '$') }).first().click();
      await p.waitForTimeout(30);
    }
  } else {
    for (const pid of Object.keys(w)) for (const sh of Object.keys(w[pid])) {
      const cur = (await state(p))[pid][sh];
      if (cur === w[pid][sh]) continue;
      await p.click('[data-a="pick"][data-id="' + pid + '"][data-sh="' + sh + '"]'); await chooseIn(p, names[w[pid][sh]]);
    }
  }
  await p.click('[data-a="save"]');
  await p.waitForFunction(() => /Saved/.test(document.querySelector('.ts-save').innerText) && !/Saving/.test(document.querySelector('.ts-save').innerText));
  const taps = await p.evaluate(() => window.__taps), s = await state(p);
  const right = Object.keys(w).every(pid => Object.keys(w[pid]).every(sh => s[pid][sh] === w[pid][sh]));
  return { taps, right, said: await p.locator('.ts-said').innerText() };
}
async function breakTask(p) {
  // open Ari's Dinner break details from the opening state
  await p.evaluate(() => { window.__taps = 0; });
  const open = p.locator('[data-a="bench-open"][data-id="ari"]'); await open.click(); await p.waitForTimeout(40);
  if (!/Dinner/.test(await p.locator('.ts-bench header b').innerText())) { await p.click('.ts-bench [data-a="bench-sh"][data-sh="dinner"]'); await p.waitForTimeout(40); }
  return { taps: await p.evaluate(() => window.__taps), named: await p.locator('.ts-bench header b').innerText() };
}
async function fixOne(p, d) {
  // after everything is set and saved, Eli's Dinner becomes Grill, then Save
  await p.evaluate(() => { window.__taps = 0; });
  if (d === 'c') {
    await p.click('[data-a="change"][data-id="eli"]');
    for (let n = 0; n < 6 && await p.locator('.tc-sheet').count(); n++) {
      const head = await p.locator('.tc-sheet h3').innerText();
      if (/Dinner/.test(head)) await p.locator('.tc-sheet .tc-opts button').filter({ hasText: /^Grill$/ }).first().click();
      else await p.locator('.tc-sheet .tc-opts button[aria-selected="true"]').first().click();
      await p.waitForTimeout(30);
    }
  } else { await p.click('[data-a="pick"][data-id="eli"][data-sh="dinner"]'); await chooseIn(p, 'Grill'); }
  await p.click('[data-a="save"]');
  await p.waitForFunction(() => /Saved/.test(document.querySelector('.ts-save').innerText) && !/Saving/.test(document.querySelector('.ts-save').innerText));
  return { taps: await p.evaluate(() => window.__taps), right: (await state(p)).eli.dinner === 'grill' };
}

(async () => {
  const srv = await new Promise(res => { const s = server.listen(PORT, '127.0.0.1', () => res(s)); });
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--hide-scrollbars'] });
  for (const d of designs) {
    const R = out.results[d] = {};
    for (const fx of ['three', 'double']) for (const shell of ['admin', 'team']) for (const width of [390, 768, 1280]) {
      const p = await b.newPage({ viewport: { width, height: width === 390 ? 844 : width === 768 ? 1024 : 844 } }), errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.goto(BASE + d + '.html?fx=' + fx + (shell === 'team' ? '&team=1' : '') + '&shot=1');
      await p.waitForTimeout(150);
      const m = await measure(p); m.working = await working(p);
      const k = fx + '-' + shell + '-' + width; R[k] = m;
      if (width === 390) await p.screenshot({ path: path.join(__dirname, d + '-' + fx + '-' + shell + '-390.png') });
      if (width === 1280 && shell === 'admin' && fx === 'three') await p.screenshot({ path: path.join(__dirname, d + '-three-admin-1280.png') });
      ok(!m.sideways, d + ' ' + k + ' no sideways scroll'); ok(!m.small.length, d + ' ' + k + ' targets 44 px: ' + m.small.join(', '));
      if (shell === 'admin' && width === 390) {
        await p.evaluate(() => window.scrollTo(0, 0));
        R[k].sections = await sectionsTask(p, d); ok(R[k].sections.right, d + ' ' + k + ' sections task ends with the wanted sections');
        await p.evaluate(() => { const r = document.querySelector('.ta-row, .tb-grid thead, .tc-start, .tx-say'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 76); });
        await p.screenshot({ path: path.join(__dirname, d + '-' + fx + '-done-390.png') });
        R[k].fixOne = await fixOne(p, d); ok(R[k].fixOne.right, d + ' ' + k + ' one correction');
      }
      ok(!errs.length, d + ' ' + k + ' no page errors ' + errs.join('; '));
      await p.close();
    }
    // break details, fresh page
    let p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(BASE + d + '.html?fx=three'); await p.waitForTimeout(100);
    R.breaks = await breakTask(p); ok(/Ari · Dinner/.test(R.breaks.named), d + ' break details name Ari Dinner');
    await p.evaluate(() => { const r = document.querySelector('.ts-bench'); window.scrollTo(0, r.getBoundingClientRect().top + scrollY - 200); });
    await p.screenshot({ path: path.join(__dirname, d + '-breaks-390.png') });
    await p.close();
    // Save waits, then is refused: never Saved early, work kept, words say so
    p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(BASE + d + '.html?fx=double&hold=1'); await p.waitForTimeout(100);
    if (d === 'c') { await p.click('[data-a="go"]'); await p.locator('.tc-sheet .tc-opts button').filter({ hasText: /^Grill$/ }).first().click(); await p.click('.tc-sheet [data-a="close"]'); }
    else { await p.click('[data-a="pick"][data-id="ari"][data-sh="lunch"]'); await chooseIn(p, 'Grill'); }
    await p.click('[data-a="save"]'); await p.waitForTimeout(80);
    const held = await p.locator('.ts-save').innerText();
    ok(/Saving/.test(held) && !/✓ Saved/.test(held) && await p.locator('[data-a="save"]').isDisabled(), d + ' held Save shows Saving and stays off');
    await p.evaluate(() => window.__release()); await p.waitForTimeout(60);
    const doneWords = await p.locator('.ts-said').innerText();
    ok(/Saved Tuesday 17 November at 13:05/.test(doneWords) && /Still no section: /.test(doneWords), d + ' Save names the services still without a section');
    R.savedWords = doneWords; await p.close();
    p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(BASE + d + '.html?fx=double&fail=1'); await p.waitForTimeout(100);
    if (d === 'c') { await p.click('[data-a="go"]'); await p.locator('.tc-sheet .tc-opts button').filter({ hasText: /^Grill$/ }).first().click(); await p.click('.tc-sheet [data-a="close"]'); }
    else { await p.click('[data-a="pick"][data-id="ari"][data-sh="lunch"]'); await chooseIn(p, 'Grill'); }
    await p.click('[data-a="save"]'); await p.waitForTimeout(700);
    ok(/Not saved\. Changes kept\./.test(await p.locator('.ts-save').innerText()) && (await state(p)).ari.lunch === 'grill' && await p.locator('.ts-said[role="alert"]').count() === 1, d + ' refused Save keeps the work and says so');
    await p.screenshot({ path: path.join(__dirname, d + '-fail-390.png') });
    await p.close();
    // long name and long sections, largest text
    p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(BASE + d + '.html?fx=three&long=1'); await p.evaluate(() => { document.documentElement.setAttribute('data-text', 'xlarge'); }); await p.waitForTimeout(100);
    const mjk = await p.evaluate(() => { const ch = document.querySelector('[data-id="mjk"]'); return !!ch; });
    await p.evaluate(() => { const e = document.querySelector('[data-id="mjk"]'); if (e) e.scrollIntoView({ block: 'center' }); });
    R.long = await measure(p); ok(!R.long.sideways && mjk, d + ' long name and largest text: no sideways scroll');
    await p.screenshot({ path: path.join(__dirname, d + '-long-xlarge-390.png') });
    await p.close();
  }
  // C only: Back and Close keep what was chosen; the sheet names the person and service
  if (designs.includes('c')) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(BASE + 'c.html?fx=double'); await p.waitForTimeout(100);
    await p.click('[data-a="go"]'); await p.locator('.tc-sheet .tc-opts button').filter({ hasText: /^Grill$/ }).first().click();
    const second = await p.locator('.tc-sheet h3').innerText();
    await p.click('.tc-sheet [data-a="back"]'); const back = await p.locator('.tc-sheet h3').innerText();
    await p.click('.tc-sheet [data-a="close"]');
    ok(second === 'Ari · Dinner' && back === 'Ari · Lunch' && (await state(p)).ari.lunch === 'grill' && /Set 1 section\. 13 still no section\. Not saved yet\./.test(await p.locator('.tc-start').innerText()), 'c Back steps to the named cell; Close keeps the choice and says it is not saved');
    await p.click('[data-a="go"]'); await p.waitForTimeout(60);
    await p.screenshot({ path: path.join(__dirname, 'c-sheet-390.png') });
    await p.close();
  }

  // The combined preview only: the council's conditions
  if (designs.includes('mix')) {
    let p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(BASE + 'mix.html?fx=double'); await p.waitForTimeout(100);
    await p.click('[data-a="pick"][data-id="ari"][data-sh="lunch"]'); await chooseIn(p, 'Grill');
    ok((await state(p)).ari.dinner === '', 'mix: choosing Ari Lunch leaves Ari Dinner on No section (no automatic fill)');
    await p.click('[data-a="pick"][data-id="ari"][data-sh="dinner"]');
    const first = await p.locator('.ts-sheet button[data-i]').first().innerText();
    ok(first === 'Same as Lunch: Grill', 'mix: the Dinner picker offers Same as Lunch: Grill first (' + first + ')');
    await p.screenshot({ path: path.join(__dirname, 'mix-same-390.png') });
    await p.waitForTimeout(360); await p.locator('.ts-sheet button[data-i]').first().click(); await p.waitForTimeout(40);
    ok(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-sh') === 'dinner' && document.activeElement.getAttribute('data-id') === 'ari'), 'mix: after a pick, focus returns to the cell that opened it');
    // a double tap on a cell must not choose the option that appears under the finger
    const cell = p.locator('[data-a="pick"][data-id="hal"][data-sh="lunch"]'); await cell.scrollIntoViewIfNeeded(); const box = await cell.boundingBox();
    await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(110); await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(80);
    ok((await state(p)).hal.lunch === '' && await p.locator('.ts-sheet').count() === 1, 'mix: a double tap 110 ms apart opens the picker and chooses nothing');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    // a double tap on an option chooses once; the second tap does not open the cell underneath
    await p.click('[data-a="pick"][data-id="hal"][data-sh="dinner"]'); await p.waitForTimeout(360);
    const opt = await p.locator('.ts-sheet button[data-i]').filter({ hasText: /^Pans$/ }).boundingBox();
    await p.mouse.click(opt.x + opt.width / 2, opt.y + opt.height / 2); await p.waitForTimeout(110); await p.mouse.click(opt.x + opt.width / 2, opt.y + opt.height / 2); await p.waitForTimeout(80);
    ok((await state(p)).hal.dinner === 'pans' && await p.locator('.ts-sheet').count() === 0, 'mix: a double tap on an option chooses once and opens nothing underneath');
    ok(await p.locator('.ts-sheet').count() === 0 && (await state(p)).hal.lunch === '', 'mix: Escape closes the picker with no change');
    ok((await state(p)).ari.dinner === 'grill', 'mix: Same as Lunch sets only Ari Dinner, when chosen');
    const greens = await p.evaluate(() => { const done = getComputedStyle(document.documentElement).getPropertyValue('--done-ink').trim(); const probe = document.createElement('i'); probe.style.color = done; document.body.appendChild(probe); const c = getComputedStyle(probe).color; probe.remove();
      return [...document.querySelectorAll('.ts-book *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && getComputedStyle(e).color === c && !e.closest('.ts-bhead')).map(e => e.textContent.trim()); });
    ok(!greens.length, 'mix: no green words in the draft before Save (' + greens.join(' | ') + ')');
    await p.close();
    p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(BASE + 'mix.html?fx=double&at=1080'); await p.waitForTimeout(100);
    await p.evaluate(() => { window.__taps = 0; }); await p.click('[data-a="bench-open"][data-id="ari"]'); await p.waitForTimeout(40);
    out.results.mix.breaksAt1800 = { taps: await p.evaluate(() => window.__taps), named: await p.locator('.ts-bench header b').innerText() };
    ok(out.results.mix.breaksAt1800.named === 'Ari · Dinner' && out.results.mix.breaksAt1800.taps === 1, 'mix: at 18:00 Breaks opens on Dinner in one tap');
    await p.close();
    p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(BASE + 'mix.html?fx=double&chefs=1'); await p.waitForTimeout(100);
    const chefCell = await p.locator('[data-a="pick"][data-id="gus"][data-sh="lunch"]').innerText(), say = await p.locator('.tx-say').innerText();
    await p.click('[data-a="pick"][data-id="ari"][data-sh="lunch"]'); await chooseIn(p, 'Grill'); await p.click('[data-a="save"]');
    await p.waitForFunction(() => /Saved Tuesday/.test((document.querySelector('.ts-said') || {}).textContent || ''));
    const said = await p.locator('.ts-said').innerText();
    ok(/Head chef/.test(chefCell) && /Lunch 7, Dinner 7/.test(say) && !/Gus|Sam K/.test(said), 'mix: chef rows read Head chef, are not counted and are not listed as missing (' + say + ')');
    await p.screenshot({ path: path.join(__dirname, 'mix-chefs-390.png') });
    await p.close();
  }
  await b.close(); srv.close();
  out.fails = fails; out.checks = checks;
  fs.writeFileSync(path.join(__dirname, 'verify-' + designs.join('') + '.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify(out.results, (k, v) => k === 'small' && !v.length ? undefined : v));
  console.log(fails ? fails + ' FAILED' : 'all checks pass');
})().catch(e => { console.error(e); process.exit(1); });
