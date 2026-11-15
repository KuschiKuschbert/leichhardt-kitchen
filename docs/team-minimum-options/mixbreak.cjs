const { chromium } = require('/home/user/leichhardt-kitchen/tests/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8777/docs/team-minimum-options/mix.html?shot=1';
// The skeptic's follow-up break-it script on the combined preview (docs/team-minimum-options/brief.md).
const SP = __dirname + '/breakit-mix-';
const exe = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
async function open(b, qs, w) {
  const ctx = await b.newContext({ viewport: { width: w || 390, height: 844 }, locale: 'en-GB' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(BASE + (qs ? '&' + qs : '')); await p.waitForSelector('.tx-grid'); await p.waitForTimeout(150); p.errs = errs; return p;
}
const state = p => p.evaluate(() => ({
  line: (document.querySelector('.tb-line') || {}).innerText || '',
  marked: [...document.querySelectorAll('.tx-row')].filter(r => r.querySelector('.tx-tag')).map(r => r.querySelector('.ts-name').innerText + ' [' + r.querySelector('.tx-brk span').innerText + ']'),
  spells: TM.C.spells(TM.plan(), TM.mins, { from: TM.clock, byShift: true }).map(s => [TM.hhmm(s.from), TM.hhmm(s.to), 'low ' + s.low, 'roster ' + s.roster, s.steps.map(x => x.n + '@' + TM.hhmm(x.at)).join(' '), s.awayNames.join(',')]),
  dockH: Math.round(document.querySelector('.ts-save').getBoundingClientRect().height),
}));
const set = (p, list) => p.evaluate(list => { list.forEach(([id, i, at, len]) => TM.setBreak(id, i, at, len)); TM.redraw(); }, list);
(async () => {
  const b = await chromium.launch({ executablePath: exe }); const out = {};
  // R1. three round-2 faults on the mix
  { const p = await open(b, ''); out.saved = await state(p); await set(p, [['sam', 0, 1170]]); out.halfFix = await state(p);
    await set(p, [['hal', 0, 1140]]); out.fullFix = await state(p); await p.context().close(); }
  { const p = await open(b, '');
    await p.evaluate(() => { const n = { sam: 'Samantha Kowalczyk-Brown', dev: 'Devendra Ramasubramanian', fen: 'Fenella Ashworth-Lloyd', hal: 'Halvard Christophersen', eli: 'Elisabetta Montgomery' };
      TM.people.forEach(x => { if (n[x.id]) x.name = n[x.id]; }); TM.setBreak('eli', 0, 1110); TM.redraw(); });
    out.long = await state(p);
    out.long.board = await p.evaluate(() => { const d = document.querySelector('.ts-save').getBoundingClientRect(); return [...document.querySelectorAll('.tm-brow2')].map(e => e.querySelector('b').innerText.slice(0, 8) + ':' + (e.getBoundingClientRect().bottom <= d.top)); });
    await p.evaluate(() => { const h = document.querySelector('.tx-ghead'); window.scrollTo(0, h.getBoundingClientRect().top + scrollY - 66); }); await p.waitForTimeout(100);
    out.long.rows = await p.evaluate(() => { const d = document.querySelector('.ts-save').getBoundingClientRect(), h = document.querySelector('.tx-ghead').getBoundingClientRect();
      return [...document.querySelectorAll('.tx-row')].filter(e => { const r = e.getBoundingClientRect(); return r.top >= h.bottom - .5 && r.bottom <= d.top + .5; }).length + ' rows; heights ' + [...document.querySelectorAll('.tx-row')].map(e => Math.round(e.getBoundingClientRect().height)).join(','); });
    await p.screenshot({ path: SP + 'long.png' }); await p.context().close(); }
  { const p = await open(b, 'quiet=1'); out.quiet1830 = await state(p);
    out.quietCountAt1110 = await p.evaluate(() => TM.C.inAt(TM.plan(), 1110).inn.length);
    await p.screenshot({ path: SP + 'quiet-1830.png' }); await p.context().close(); }
  { const p = await open(b, 'quiet=1&at=1050'); out.quiet1730 = await state(p); await p.context().close(); }
  // R2. new short time later in the evening after a fix
  { const p = await open(b, ''); await set(p, [['sam', 0, 1170], ['hal', 0, 1170], ['fen', 0, 1170]]); out.newLater = await state(p); await p.context().close(); }
  // R3. two short times, clock before both (17:00): dinner 18:30 one and a second at 19:45 (ari, bea, gia 19:45 for 30)
  { const p = await open(b, 'at=1020'); await set(p, [['ari', 0, 1185, 30], ['bea', 0, 1185, 30], ['gia', 0, 1185, 30]]); out.twoShort = await state(p); await p.context().close(); }
  // three short times
  { const p = await open(b, 'at=1020'); await set(p, [['ari', 0, 1185, 30], ['bea', 0, 1185, 30], ['gia', 0, 1185, 30], ['eli', 0, 1080, 30]]);
    await p.evaluate(() => { TM.plan().br.push({ id: 'ari', sh: 'dinner', at: 1050, len: 30 }, { id: 'bea', sh: 'dinner', at: 1050, len: 30 }); TM.redraw(); });
    out.threeShort = await state(p); await p.context().close(); }
  // R4. a person with two breaks: Ari keeps the 14:30 split and gets a second break inside the short time
  { const p = await open(b, ''); await p.evaluate(() => { TM.plan().br.push({ id: 'ari', sh: 'dinner', at: 1110, len: 30 }); TM.redraw(); });
    out.twoBreaks = await state(p); await p.context().close(); }
  // R5. a person on two services at the busy time: a Function shift 17:00 to 22:00 overlapping Dinner, Cal only on Function, Ari on both
  { const p = await open(b, ''); await p.evaluate(() => { TM.D.services.push({ id: 'fn', name: 'Function', from: 1020, to: 1320 }); TM.plan().on.push({ id: 'cal', sh: 'fn', sec: '' }, { id: 'ari', sh: 'fn', sec: '' }); TM.redraw(); });
    out.overlap = await state(p);
    out.overlap.dinnerOnly = await p.evaluate(() => { const c = TM.C.inAt(TM.plan(), 1110); return c.inn.map(x => x.name).join(','); });
    await p.context().close(); }
  // same, with a busy time on Function too (need 2, 18:00 to 20:00): which service does the line name?
  { const p = await open(b, 'at=1020'); await p.evaluate(() => { TM.D.services.push({ id: 'fn', name: 'Function', from: 1020, to: 1320 }); TM.plan().on.push({ id: 'cal', sh: 'fn', sec: '' }); TM.mins.length = 0; TM.mins.push({ id: 'm3', from: 1080, to: 1200, n: 10 }); TM.redraw(); });
    out.fnWindow = await state(p); await p.context().close(); }
  // R6. mark on a person whose break is outside the short time; clock inside the short time after Dev returns (18:45)
  { const p = await open(b, 'at=1125'); out.at1845 = await state(p); await p.context().close(); }
  // R7. a long spell with many steps (lowest step hidden?)
  { const p = await open(b, 'at=1020'); await set(p, [['ari', 0, 1080, 120], ['bea', 0, 1080, 120], ['gia', 0, 1080, 30], ['dev', 0, 1095, 30], ['fen', 0, 1125, 30], ['hal', 0, 1125, 30], ['sam', 0, 1125, 30]]);
    out.manySteps = await state(p); await p.screenshot({ path: SP + 'steps.png' }); await p.context().close(); }
  // R8. failed save, sous chef, loading
  { const p = await open(b, 'fail=1'); await set(p, [['sam', 0, 1170]]); await p.locator('[data-a="save"]').click(); await p.waitForTimeout(800);
    out.fail = await p.evaluate(() => document.querySelector('.ts-save').innerText.replace(/\s+/g, ' ')); out.failMarks = (await state(p)).marked; await p.context().close(); }
  { const p = await open(b, 'state=loading'); out.loading = await state(p); await p.context().close(); }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
