// Drawn on save (head chef, 21 Oct 2026): a recipe saved with an empty drawing slot gets it drawn by itself, and a
// changed card has the book-made drawings of the dishes that use it drawn again, keeping parts moved by hand. The book's
// own drawings are never touched.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
const wait = (p, fn, arg, t) => L.waitFor(p, fn, arg, t || 8000).catch(() => false);
const store = p => p.evaluate(() => window.__fake.dump());
const editor = p => wait(p, () => !!document.getElementById('mg-name'));
const toasts = p => p.evaluate(() => Array.from(document.querySelectorAll('.mg-toasts .p-toast')).map(t => t.textContent).join(' | '));
const errs = p => p.errors.filter(e => !/Failed to load resource/.test(e));

(async () => {
  const b = await L.start();
  let p, s;

  // a new batch recipe: saved, then its GN pan is drawn from its card by itself, linked and labelled
  p = await L.open(b, '#/manage/new', { who: 'ann', extra: cfg(), wait: 1400 });
  await editor(p);
  await p.fill('#mg-name', 'Pickled Chillies');
  await p.selectOption('#mg-kind', 'batch');
  for (const [q, name] of [['500 g', 'Red chillies (sliced)'], ['300 ml', 'Cider vinegar'], ['200 g', 'Caster sugar'], ['10 g', 'Mustard seed']]) {
    await p.click('[data-mg="ing-add"]'); await L.settle(p, 150);
    const k = await p.evaluate(() => document.querySelectorAll('.mg-ing').length - 1);
    await p.fill('[data-f="ing.' + k + '.q"]', q); await p.fill('[data-f="ing.' + k + '.name"]', name);
  }
  await p.fill('#mg-ss-0', 'Simmer the vinegar, sugar and mustard seed to a syrup.\nAdd the sliced chillies.');
  await L.settle(p, 200);
  await p.click('[data-mg="save"]');
  await wait(p, () => /Drawn:/.test(Array.from(document.querySelectorAll('.mg-toasts .p-toast')).map(t => t.textContent).join(' ')), null, 30000);
  ok(/Drawn: GN pan\./.test(await toasts(p)), 'new recipe: saved, then its GN pan is drawn (' + await toasts(p) + ')');
  s = await store(p);
  const pan = s[fsKey(['drawings', 'pickled-chillies-pan'])] || {}, rec = (s[fsKey(['recipes', 'pickled-chillies'])] || {});
  ok(pan.v === 1 && pan.layout && pan.layout.auto && pan.els.length === 1 && pan.els[0].made === 'pickled-chillies', 'new recipe: the pan is one part made from its card, marked as drawn by the book');
  ok(rec.r && rec.r.art === '@pickled-chillies-pan' && rec.v === 2 && (rec.r.pins || []).some(x => x.label === 'Red chillies'), 'new recipe: the recipe links to it and has its Pass labels (version 2)');
  // by hue: the rings red strokes, the syrup a gold fill
  const hue = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), mx = Math.max(...c), mn = Math.min(...c), d = mx - mn; if (!d) return -1; const x = mx === c[0] ? (c[1] - c[2]) / d % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; return (x * 60 + 360) % 360; };
  const rings = [...String(pan.svgF || '').matchAll(/<circle[^>]*fill="none"[^>]*stroke="(#[0-9A-Fa-f]{6})"/g)].map(m => hue(m[1])), fills = [...String(pan.svgF || '').matchAll(/<rect[^>]*fill="(#[0-9A-Fa-f]{6})"/g)].map(m => hue(m[1]));
  ok(rings.some(h => h >= 0 && (h <= 15 || h >= 345)) && fills.some(h => h >= 30 && h <= 50), 'new recipe: red chilli rings in a gold syrup (' + JSON.stringify({ rings: rings.slice(0, 3), fills }) + ')');
  // the open form took the new version: saving it again is not a clash
  await p.fill('#mg-yield', '1 kg batch'); await L.settle(p, 150);
  await p.click('[data-mg="save"]');
  await wait(p, () => /Version 3/.test(Array.from(document.querySelectorAll('.mg-toasts .p-toast')).map(t => t.textContent).join(' ')), null, 15000);
  await L.settle(p, 1500);
  ok(/Version 3/.test(await toasts(p)) && !(await p.$('[data-mg="mine"]')), 'new recipe: the form saves again as version 3, no clash with the drawing\'s link');
  s = await store(p);
  const rec3 = s[fsKey(['recipes', 'pickled-chillies'])] || { r: {} };
  ok(rec3.v === 3 && rec3.r.art === '@pickled-chillies-pan' && rec3.r.yield === '1 kg batch' && (s[fsKey(['drawings', 'pickled-chillies-pan'])] || {}).v === 1, 'new recipe: the second save keeps the link, and its pan, drawn the same, is not saved again');
  ok(!errs(p).length, 'new recipe: no page errors ' + errs(p).join(' | '));
  await p.context().close();

  // a new dish: its plate and its side view are drawn, the side view standing on that plate
  p = await L.open(b, '#/manage/new', { who: 'ann', extra: cfg(), wait: 1400 });
  await editor(p);
  await p.fill('#mg-name', 'Rump on Mash');
  await p.selectOption('#mg-kind', 'main');
  for (const [q, name] of [['250 g', 'Rump steak (chargrilled)'], ['150 g', 'Mash'], ['50 ml', 'Pepper sauce']]) {
    await p.click('[data-mg="ing-add"]'); await L.settle(p, 150);
    const k = await p.evaluate(() => document.querySelectorAll('.mg-ing').length - 1);
    await p.fill('[data-f="ing.' + k + '.q"]', q); await p.fill('[data-f="ing.' + k + '.name"]', name);
  }
  await L.settle(p, 200);
  await p.click('[data-mg="save"]');
  await wait(p, () => /Drawn:/.test(Array.from(document.querySelectorAll('.mg-toasts .p-toast')).map(t => t.textContent).join(' ')), null, 30000);
  ok(/Drawn: plate and side view\./.test(await toasts(p)), 'new dish: its plate and side view are drawn (' + await toasts(p) + ')');
  s = await store(p);
  const rm = (s[fsKey(['recipes', 'rump-on-mash'])] || { r: {} }).r, sd = s[fsKey(['drawings', 'rump-on-mash-side'])] || {};
  ok(rm.art === '@rump-on-mash-plate' && rm.side === '@rump-on-mash-side' && (s[fsKey(['drawings', 'rump-on-mash-plate'])] || {}).v === 1 && sd.v === 1 && sd.layout && sd.layout.auto, 'new dish: the recipe links to both');
  ok((rm.pins || []).some(x => x.label === 'Rump steak') && (rm.pins || []).some(x => x.label === 'Pepper sauce'), 'new dish: Pass labels for its ingredients');
  ok(!errs(p).length, 'new dish: no page errors ' + errs(p).join(' | '));
  await p.context().close();

  // the wings drawn by Draw it for me and saved, with the wings moved by hand
  p = await L.open(b, '#/manage/draw/new/wings/plate', { who: 'ann', extra: cfg(), wait: 1200, width: 1280, height: 900 });
  await wait(p, () => !!document.querySelector('[data-dw="sm-draw"]'), null, 20000);
  await p.click('[data-dw="sm-draw"]');
  await wait(p, () => window.LK_DRAW.state().d.els.length > 0 && !!document.querySelector('.dw-smart-note'), null, 10000);
  // moved by hand with the arrow keys, a library piece (the wings) and a part drawn from a card (the Cowboy candy) alike
  const nudge = async ing => {
    const at = await p.evaluate(ing => { const W = window.LK_DRAW.state(), i = W.d.els.findIndex(e => e.ing === ing); W.sel = [i]; window.LK_DRAW.redraw(); return { t: W.d.els[i].t, x: W.d.els[i].x, y: W.d.els[i].y }; }, ing);
    await p.focus('.dw-svg');
    for (let n = 0; n < 3; n++) await p.keyboard.press('Shift+ArrowRight');
    await p.keyboard.press('Shift+ArrowDown');
    await L.settle(p, 600);
    const el = await p.evaluate(ing => window.LK_DRAW.state().d.els.find(e => e.ing === ing), ing);
    return { at, el, ok: !!el.fixed && el.x === Math.round((at.x + 30) * 10) / 10 && el.y === Math.round((at.y + 10) * 10) / 10 };
  };
  const cc = await nudge('Cowboy candy');
  ok(cc.at.t === 'raw' && cc.ok, 'wings: a part drawn from a card, moved by hand, is marked to stay (' + JSON.stringify({ at: cc.at, x: cc.el.x, y: cc.el.y, fixed: cc.el.fixed }) + ')');
  for (let n = 0; n < 4; n++) await p.keyboard.press('Control+z');
  await L.settle(p, 300);
  ok(await p.evaluate(() => !window.LK_DRAW.state().d.els.find(e => e.ing === 'Cowboy candy').fixed), 'wings: Undo (once per nudge) puts the Cowboy candy back where the book drew it');
  const wg = await nudge('Chicken wings'), moved = wg.el;
  ok(wg.ok, 'wings: the wings moved by hand are marked to stay');
  await p.click('[data-dw="save"]');
  await wait(p, () => /Saved/.test((document.querySelector('.mg-toasts .p-toast') || {}).textContent || ''));
  s = await store(p);
  const w1 = s[fsKey(['drawings', 'wings-plate'])] || {}, cc1 = (w1.els || []).find(e => e.made === 'cowboy-candy') || {};
  ok(w1.v === 1 && w1.layout && w1.layout.auto && !!cc1.ms, 'wings: drawn by the book and saved, its Cowboy candy drawn from the card');
  await p.context().close();

  // the Cowboy candy card changes: the wings are drawn again with the new candy, the wings stay where they were put
  p = await L.open(b, '#/manage/r/cowboy-candy', { who: 'ann', extra: Object.assign({}, s, cfg()), wait: 1400 });
  await editor(p);
  await p.click('[data-mg="ing-add"]'); await L.settle(p, 150);
  const k = await p.evaluate(() => document.querySelectorAll('.mg-ing').length - 1);
  await p.fill('[data-f="ing.' + k + '.q"]', '200 g'); await p.fill('[data-f="ing.' + k + '.name"]', 'Red capsicum (sliced)');
  await L.settle(p, 200);
  await p.click('[data-mg="save"]');
  await wait(p, () => /Redrawn:/.test(Array.from(document.querySelectorAll('.mg-toasts .p-toast')).map(t => t.textContent).join(' ')), null, 30000);
  ok(/Redrawn: Fried Chicken Wings/.test(await toasts(p)), 'changed card: the wings are drawn again (' + await toasts(p) + ')');
  s = await store(p);
  const w2 = s[fsKey(['drawings', 'wings-plate'])] || {}, cc2 = (w2.els || []).find(e => e.made === 'cowboy-candy') || {}, wing = (w2.els || []).find(e => e.ing === 'Chicken wings') || {};
  ok(w2.v === 2 && cc2.ms && cc2.ms !== cc1.ms && (s[fsKey(['drawings', 'wings-plate', 'hist', '1'])] || {}).was, 'changed card: a new version of the wings with the new Cowboy candy, the old one kept');
  ok(wing.fixed && wing.x === moved.x && wing.y === moved.y, 'changed card: the wings moved by hand stay where they were put');
  // the book's own drawings are never touched: the riblets use the same card and have no drawing of their own
  ok(!Object.keys(s).some(k2 => /\/drawings\/riblets/.test(k2)) && !Object.keys(s).some(k2 => /\/drawings\/cowboy-candy/.test(k2)), 'changed card: the riblets and the card itself keep the book\'s own drawings');
  ok(!errs(p).length, 'changed card: no page errors ' + errs(p).join(' | '));
  await p.context().close();

  // a topper card to come written for the first time: the French schnitzel, until now the book's own drawing, is drawn
  // from the new card and links to it
  p = await L.open(b, '#/manage/new/french-topper', { who: 'ann', extra: cfg(), wait: 1400 });
  await editor(p);
  await p.fill('#mg-name', 'French Topper');
  for (const [q, name] of [['40 g', 'Brie (sliced)'], ['¼', 'Avocado (sliced)'], ['2 rashers', 'Bacon'], ['40 ml', 'Béarnaise']]) {
    await p.click('[data-mg="ing-add"]'); await L.settle(p, 150);
    const k2 = await p.evaluate(() => document.querySelectorAll('.mg-ing').length - 1);
    await p.fill('[data-f="ing.' + k2 + '.q"]', q); await p.fill('[data-f="ing.' + k2 + '.name"]', name);
  }
  await L.settle(p, 200);
  await p.click('[data-mg="save"]');
  await wait(p, () => /Redrawn:/.test(Array.from(document.querySelectorAll('.mg-toasts .p-toast')).map(t => t.textContent).join(' ')), null, 30000);
  ok(/Redrawn: Chicken Schnitzel French/.test(await toasts(p)), 'topper card: the French schnitzel is drawn from it (' + await toasts(p) + ')');
  s = await store(p);
  const fr = (s[fsKey(['recipes', 'schnitzel-french'])] || { r: {} }).r, frd = s[fsKey(['drawings', 'schnitzel-french-plate'])] || {};
  ok(fr.art === '@schnitzel-french-plate' && frd.v === 1 && frd.layout && frd.layout.auto && (frd.els || []).some(e => e.made === 'french-topper'), 'topper card: the schnitzel links to a book-made plate with a part drawn from the card');
  ok(!Object.keys(s).some(k2 => /\/(recipes|drawings)\/schnitzel-(mexican|americana)/.test(k2)), 'topper card: the Mexican and Americana schnitzels, whose cards are still to come, keep the book\'s own drawings');
  ok(!errs(p).length, 'topper card: no page errors ' + errs(p).join(' | '));
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
