const { chromium } = require('/home/user/leichhardt-kitchen/tests/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8777/docs/team-minimum-options/';
// The skeptic's round 2 break-it script (docs/team-minimum-options/brief.md). Screenshots go beside it as breakit-*.png.
const SP = __dirname + '/breakit-';
const exe = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const txt = (p, s) => p.evaluate(s => [...document.querySelectorAll(s)].map(e => e.innerText.replace(/\s+/g, ' ').trim()), s);
async function open(b, d, qs, w) {
  const ctx = await b.newContext({ viewport: { width: w || 390, height: 844 }, locale: 'en-GB' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE + d + '.html?shot=1' + (qs ? '&' + qs : '')); await p.waitForSelector('.tx-grid'); await p.waitForTimeout(150); p.errs = errs; return p;
}
// set breaks directly in the preview's draft (same path as the pickers: TM.setBreak) and redraw
const setBr = (p, pid, at) => p.evaluate(([pid, at]) => { TM.setBreak(pid, 0, at); TM.redraw(); }, [pid, at]);
(async () => {
  const b = await chromium.launch({ executablePath: exe });
  const out = {};
  // 1. Failed save after the full fix
  for (const d of ['a', 'b', 'c']) {
    const p = await open(b, d, 'fail=1&open=sam');
    await setBr(p, 'sam', 1170); await setBr(p, 'hal', 1140);
    await p.evaluate(() => { TM.focus = { pid: 'sam' }; TM.redraw(); });
    await p.locator('[data-a="save"]').click(); await p.waitForTimeout(800);
    out['fail-' + d] = { dock: await txt(p, '.ts-save'), warnA: await txt(p, '.ta-warn'), boardNow: await txt(p, '.tc-now'), heads: await txt(p, '.tx-sh'), board: await txt(p, '.tm-board') };
    await p.screenshot({ path: SP + d + '-fail.png' });
    await p.context().close();
  }
  // 2. Partial fix: only Sam K moved to 19:30. Is the day still short, and what does each design say?
  for (const d of ['a', 'b', 'c']) {
    const p = await open(b, d, 'open=sam');
    await setBr(p, 'sam', 1170);
    const sp = await p.evaluate(() => TM.spells('draft').map(s => [TM.hhmm(s.from), TM.hhmm(s.to), s.low, s.high, s.awayNames.join(',')]));
    await p.evaluate(() => document.querySelector('.ts-bench').scrollIntoView({ block: 'center' })); await p.waitForTimeout(100);
    out['partial-' + d] = { spells: sp, warnA: await txt(p, '.ta-warn'), dockLine: await txt(p, '.tb-line'), heads: await txt(p, '.tx-sh'), tags: await txt(p, '.tc-tag') };
    await p.screenshot({ path: SP + d + '-partial.png' });
    await p.context().close();
  }
  // 3. Long names and five away at once in B: dock height, rows visible, board rows visible, Save on screen
  for (const d of ['a', 'b', 'c']) {
    const p = await open(b, d, '');
    await p.evaluate(() => {
      const names = { sam: 'Samantha Kowalczyk-Brown', dev: 'Devendra Ramasubramanian', fen: 'Fenella Ashworth-Lloyd', hal: 'Halvard Christophersen', eli: 'Elisabetta Montgomery' };
      TM.people.forEach(x => { if (names[x.id]) x.name = names[x.id]; });
      TM.setBreak('eli', 0, 1110); // Eli's lunch break moved into dinner: five away at 18:30
      TM.redraw();
    });
    const m = await p.evaluate(() => {
      const dock = document.querySelector('.ts-save').getBoundingClientRect(), save = document.querySelector('[data-a="save"]').getBoundingClientRect();
      const rows = [...document.querySelectorAll('.tm-brow2')].map(e => { const r = e.getBoundingClientRect(); return [e.querySelector('b').innerText, Math.round(r.top), Math.round(r.bottom), r.bottom <= dock.top]; });
      return { dockTop: Math.round(dock.top), dockH: Math.round(dock.height), saveTop: Math.round(save.top), saveBottom: Math.round(save.bottom), boardRows: rows, line: (document.querySelector('.tb-line') || {}).innerText };
    });
    // working screen
    await p.evaluate(() => { const h = document.querySelector('.tx-ghead'); window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 66); }); await p.waitForTimeout(100);
    m.workingRows = await p.evaluate(() => { const dock = document.querySelector('.ts-save').getBoundingClientRect(), head = document.querySelector('.tx-ghead').getBoundingClientRect();
      return { headH: Math.round(head.height), rows: [...document.querySelectorAll('.tx-row')].filter(e => { const r = e.getBoundingClientRect(); return r.top >= head.bottom - 0.5 && r.bottom <= dock.top + 0.5; }).length }; });
    out['long-' + d] = m;
    await p.screenshot({ path: SP + d + '-long.png' });
    await p.context().close();
  }
  // 4. Two short times: Sam K's break moved to 20:00 with Gia's split into the late rush
  for (const d of ['a', 'b', 'c']) {
    const p = await open(b, d, '');
    await p.evaluate(() => { TM.setBreak('ari', 0, 1140, 30); TM.setBreak('bea', 0, 1140, 30); TM.setBreak('gia', 0, 1140, 30); TM.redraw(); });
    out['two-' + d] = { spells: await p.evaluate(() => TM.spells('draft').map(s => [TM.hhmm(s.from), TM.hhmm(s.to), s.low, s.high, s.awayNames.join(',')])), line: await txt(p, '.tb-line'), heads: await txt(p, '.tx-sh'), tags: await txt(p, '.tc-tag') };
    await p.context().close();
  }
  // 5. C: sous chef screen after the fix, before Save: board versus heads on one screen
  { const p = await open(b, 'c', 'team=1');
    await setBr(p, 'sam', 1170); await setBr(p, 'hal', 1140);
    out['c-team-draft'] = { now: await txt(p, '.tc-now'), heads: await txt(p, '.tx-sh'), dock: await txt(p, '.ts-save p'),
      pos: await p.evaluate(() => ['.tc-now', '.tx-ghead'].map(s => { const r = document.querySelector(s).getBoundingClientRect(); return [s, Math.round(r.top), Math.round(r.bottom)]; })) };
    await p.screenshot({ path: SP + 'c-team-draft.png' }); await p.context().close(); }
  // 6. Quiet day with nobody on break: is it still "short", and does any design blame a break?
  for (const d of ['a', 'b', 'c']) {
    const p = await open(b, d, 'quiet=1&open=sam');
    await p.evaluate(() => { ['sam', 'dev', 'hal'].forEach(id => TM.setBreak(id, 0, 1260 - 30)); TM.redraw(); });
    out['quiet-nobreak-' + d] = { spells: await p.evaluate(() => TM.spells('draft').map(s => [TM.hhmm(s.from), TM.hhmm(s.to), s.low, s.high, s.awayNames.join(',')])), warnA: await txt(p, '.ta-warn'), line: await txt(p, '.tb-line'), heads: await txt(p, '.tx-sh .tm-short'), now: await txt(p, '.tc-now') };
    await p.context().close();
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
