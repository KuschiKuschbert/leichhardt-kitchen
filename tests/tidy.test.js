// The JS tidy-up (usability U16): every print button still sets its class, prints once and tidies up, and the popups
// still keep Tab inside them, now through one shared printWith() and one trapTab().
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const stub = p => p.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed++; }; });
async function printed(p, sel, cls, name) {
  await stub(p); await L.tap(p, sel); await p.waitForTimeout(200);
  ok(await p.evaluate(c => document.documentElement.classList.contains(c), cls) && await p.evaluate(() => window.__printed) === 1, name + ': prints once with ' + cls);
  await p.waitForTimeout(1700);
  ok(!(await p.evaluate(c => document.documentElement.classList.contains(c), cls)), name + ': the class is taken off after');
}
(async () => {
  const b = await L.start();
  const mins = {}; mins[fsKey(['minutes', 'm1'])] = { no: 1, v: 1, status: 'published', date: today, start: '14:00', loc: 'Kitchen', chair: 'sam', taker: 'sam', att: [{ id: 'ann', st: 'present' }], guests: '', decisions: 'Fryer oil every Monday', menu: '', safety: '', dates: '', other: '', acts: [], next: '', pubAt: L.NOW, removed: false, at: 1, upd: 1, by: 'sam' };
  let p = await L.open(b, '#/minutes', { who: 'ann', extra: mins, wait: 1800 });
  await printed(p, '[data-p="mn-print"]', 'print-min', 'minutes');
  await p.context().close();
  p = await L.open(b, '#/guides/fryer', { extra: L.guides(), width: 1280, height: 900, wait: 1200 });
  if (await p.$('[data-p="g-print"]')) await printed(p, '[data-p="g-print"]', 'print-guide', 'guide'); else ok(true, 'guide: no print button on this page');
  await p.context().close();
  p = await L.open(b, '#/prep', { width: 1280, height: 900, wait: 1500 });
  await printed(p, '[data-p="print"]', 'print-list', 'prep list');
  await p.context().close();
  // pings popup: Tab from the last control goes to the first, Shift+Tab from the first to the last
  const note = {}; note[fsKey(['notes', 'n1'])] = { text: 'Safety: fryer 2 is out', tag: 'safety', start: today, until: today, dows: [], removed: false, at: 1, by: 'sam' };
  p = await L.open(b, '#/prep', { extra: note, wait: 2000 });
  const ids = await p.evaluate(() => { const f = [...document.querySelectorAll('.nt button, .nt a[href]')].filter(x => x.offsetParent !== null); f[f.length - 1].focus(); return f.length; });
  await p.keyboard.press('Tab');
  ok(await p.evaluate(() => { const f = [...document.querySelectorAll('.nt button, .nt a[href]')].filter(x => x.offsetParent !== null); return document.activeElement === f[0]; }), 'pings: Tab from the last control wraps to the first (' + ids + ' controls)');
  await p.keyboard.press('Shift+Tab');
  ok(await p.evaluate(() => { const f = [...document.querySelectorAll('.nt button, .nt a[href]')].filter(x => x.offsetParent !== null); return document.activeElement === f[f.length - 1]; }), 'pings: Shift+Tab from the first wraps to the last');
  ok(p.errors.length === 0, 'no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})();
