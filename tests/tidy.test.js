// The JS tidy-up (usability U16): the popups keep Tab inside them through one shared trapTab(). (The print buttons
// and printWith() went on 20 Oct 2026, with print and share; tests/chef-menu.test.js checks none is left.)
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
(async () => {
  const b = await L.start();
  let p;
  // pings popup: Tab from the last control goes to the first, Shift+Tab from the first to the last
  const note = {}; note[fsKey(['notes', 'n1'])] = { text: 'Safety: fryer 2 is out', tag: 'safety', start: today, until: today, dows: [], removed: false, at: 1, by: 'sam' };
  p = await L.open(b, '#/prep', { who: 'ann', extra: note, wait: 2000 });
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
