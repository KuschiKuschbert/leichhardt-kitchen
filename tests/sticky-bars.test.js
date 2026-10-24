// The bars that stick to the top of the screen (24 Oct 2026). With the update strip and the function strip both up,
// the recipe search sits under both of them, not 46 px under the update strip; a jump on a recipe card lands below the
// function strip; on a tablet return uses the existing header, with no fixed Zoom out overlay.
const L = require('./lib');
const M = require('../js/functions.js');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const at = (ymd, hm) => M.kat(ymd, M.hmMin(hm));
// a confirmed function today at 18:30, so the band shows and the strip pins once it has scrolled away
function fn() {
  const f = { v: 1, status: 'confirmed', name: 'Smith 50th', date: today, start: at(today, '18:00'), loc: 'Beer garden', guests: 60, mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0,
    rounds: [{ at: at(today, '18:30'), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 3, u: M.toU([3]) }],
    was: {}, chg: [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: 'fay', upd: L.NOW - 3600000 };
  return { [fsKey(['functions', 'smith'])]: M.derive(f) };
}
const box = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; }, sel);

(async () => {
  const b = await L.start();
  let p;

  // the recipe search under both strips
  p = await L.open(b, '#/recipes', { wait: 1800, extra: fn() });
  await L.waitFor(p, () => { const e = document.getElementById('fn-band'); return e && !e.hidden; }, null, 8000).catch(() => {});
  await p.click('.chip[data-act="kind"]').catch(() => {}); await L.settle(p, 200);   // a real tap: the book only reloads by itself before anyone touches it
  await p.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
  await L.waitFor(p, () => !!document.querySelector('.upd-bar'), null, 3000).catch(() => {});
  await p.evaluate(() => window.scrollTo(0, 1400)); await L.settle(p, 400);
  const st = await box(p, '.fn-strip'), up = await box(p, '.upd-bar'), fb = await box(p, '.find-bar');
  ok(!!st && !!up && !!fb, 'both strips and the search are on screen (' + JSON.stringify({ st, up, fb }) + ')');
  ok(st && up && up.top >= st.bottom - 1, 'the update strip sits under the function strip');
  ok(up && fb && fb.top >= up.bottom - 1, 'the search sits under the update strip, not behind it (' + (fb && fb.top) + ' against ' + (up && up.bottom) + ')');
  ok(!(await L.overflow(p)), 'no sideways scroll with both strips');
  ok(p.errors.length === 0, 'strips: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a jump on a recipe card lands below the function strip
  p = await L.open(b, '#/r/barra', { wait: 1800, extra: fn() });
  await L.waitFor(p, () => { const e = document.getElementById('fn-band'); return e && !e.hidden; }, null, 8000).catch(() => {});
  const chip = await p.$('.jumps [data-act="jump"]:last-child, .jumps a:last-child, .jumps button:last-child');
  if (chip) { await chip.click(); await L.settle(p, 600); }
  const tgt = await p.evaluate(() => { const c = document.querySelector('.jumps [data-act="jump"]:last-child, .jumps a:last-child, .jumps button:last-child'); const id = c && (c.getAttribute('data-val') || (c.getAttribute('href') || '').replace(/^.*#/, '')); const e = id && (document.getElementById(id) || document.querySelector('.jump-at')); return e ? Math.round(e.getBoundingClientRect().top) : null; });
  const st2 = await box(p, '.fn-strip');
  ok(!!chip && tgt != null && (!st2 || tgt >= st2.bottom - 1), 'recipe card: the jump lands below the function strip (' + tgt + ' against ' + (st2 && st2.bottom) + ')');
  await p.context().close();

  // a tablet: return occupies the existing header instead of overlaying the recipe
  p = await L.open(b, '#/r/barra', { wait: 1500, width: 768, height: 1024, touch: true });
  const z = await box(p, '.wtop [data-act="back"]');
  ok(z && z.w === 44 && z.h === 44 && await p.locator('.zoombar').count() === 0, '768: a compact header arrow replaces the floating Zoom out control (' + JSON.stringify(z) + ')');
  ok(!(await L.overflow(p)), '768: no sideways scroll');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
