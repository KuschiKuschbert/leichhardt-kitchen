// Reuse plates and grow the library (js/draw.js, js/manage.js, 21 Oct 2026). A new drawing starts from a copy of the
// book's own drawing (its standard plate becomes real servingware), splits into pieces, and pieces become library
// pieces the search finds. A template and a drawing used for another recipe are copies: the original never changes. An
// SVG file is cleaned before it is used. Servingware is saved as a preset. Templates and pieces can be hidden on the
// manage page. With SHOTS=1 the drawings are saved to tests/shots/.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const path = require('path'), fs = require('fs'), SHOTS = process.env.SHOTS ? path.join(__dirname, 'shots') : '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
const wait = (p, fn, arg, t) => L.waitFor(p, fn, arg, t || 8000).catch(() => false);
const store = p => p.evaluate(() => window.__fake.dump());
const S = p => p.evaluate(() => { const w = window.LK_DRAW.state(); return { surf: w.d.surf, from: w.d.from, els: JSON.parse(JSON.stringify(w.d.els)), sel: w.sel.slice(), msg: w.msg, panel: w.panel }; });
const errs = p => p.errors.filter(e => !/Failed to load resource/.test(e));
// a Saved toast not counted yet (the last one stays 4 s, and a fast computer saves again before it goes), then it is counted
const saved = p => wait(p, () => { const t = document.querySelector('.mg-toasts .p-toast'); if (!t || t.dataset.read || !/Saved/.test(t.textContent)) return false; t.dataset.read = '1'; return true; }, null, 10000);
const shot = async (p, name) => { if (SHOTS) await (await p.$('.dw-svg')).screenshot({ path: path.join(SHOTS, 'reuse-' + name + '.png') }); };
const BAD_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><script>window.__bad=1</script><style>circle{fill:red}</style>' +
  '<rect x="0" y="0" width="100" height="50" rx="10" fill="#C99A62" onclick="window.__bad=2"/><image href="x.png" width="10" height="10"/><circle cx="50" cy="25" r="15" fill="url(#g)" stroke="#5E2010"/></svg>';

(async () => {
  const b = await L.start();
  let p, s, w;
  const open = async (hash, extra) => {
    const pg = await L.open(b, hash, { who: 'ann', extra: Object.assign({}, extra || {}, cfg()), wait: 1200, width: 1280, height: 900 });
    await wait(pg, () => !!document.querySelector('.dw-svg') && !!window.LK_DRAW, null, 20000);
    return pg;
  };

  // a new plate drawing for the burger: Start from offers the book's drawing; its plate becomes real servingware
  p = await open('#/manage/draw/new/burger/plate');
  await wait(p, () => !!document.querySelector('.dw-start [data-dw="from"][data-v="book:burger"]'));
  ok(/Start from a copy of the book's drawing/.test(await txt(p, '.dw-start summary') || '') && !(await p.$eval('.dw-start', e => e.open)) && await p.$('.dw-panel #dw-q') !== null, 'start from: one closed line offers the book\'s drawing of the burger, with the library open below');
  await p.click('.dw-start summary'); await L.settle(p, 150);
  await p.click('.dw-start [data-dw="from"][data-v="book:burger"]');
  await wait(p, () => window.LK_DRAW.state().d.els.length === 1);
  w = await S(p);
  ok(w.els.length === 1 && w.els[0].t === 'raw' && w.surf.fam === 'plate' && w.surf.size === 30 && w.from === 'book:burger', 'book drawing: one picture on a real 30 cm plate (' + JSON.stringify(w.surf) + ')');
  ok(await p.evaluate(() => { const d = window.LK_DRAW.state().d; return !/r="100" fill="#FFFFFF"/.test(d.defs[d.els[0].a]); }), 'book drawing: the book\'s own plate is taken out of the picture (the servingware is drawn under it)');
  ok(!(await p.$('.dw-start')), 'start from: the choice goes once something is on the drawing');
  await shot(p, 'book-burger');
  // swap the servingware: the picture stays
  await p.click('[data-dw="panel"][data-v="ware"]'); await L.settle(p, 200);
  await p.click('[data-dw="wfam"][data-v="board"]'); await L.settle(p, 200);
  await p.click('.dw-ware [data-dw="ware"][data-v="0"]'); await L.settle(p, 300);
  w = await S(p);
  ok(w.surf.fam === 'board' && w.els.length === 1, 'book drawing: the plate swaps for a board, the food stays');
  await p.click('[data-dw="undo"]'); await L.settle(p, 200);
  // split into pieces
  await p.click('.dw-el[data-i="0"]'); await L.settle(p, 200);
  ok(await p.$('.dw-selbar [data-dw="split"]') !== null, 'split: offered for the picture');
  await p.click('.dw-selbar [data-dw="split"]'); await L.settle(p, 400);
  w = await S(p);
  ok(w.els.length > 5 && w.els.every(e => e.t === 'raw' && e.bx), 'split: the picture is ' + w.els.length + ' pieces, each with its own box');
  const bx = await p.evaluate(() => { const r = window.LK_DRAW.render, d = window.LK_DRAW.state().d; return d.els.map(e => r.bbox(e)); });
  ok(bx.every(q => q[0] > -125 && q[2] < 125 && q[1] > -125 && q[3] < 125), 'split: every piece stays where it was on the plate');
  await shot(p, 'split');
  // a piece as a library piece: picked, named, saved; the search finds it
  await p.click('[data-dw="many"]'); await L.settle(p, 100);
  await p.click('[data-dw="panel"][data-v="parts"]'); await L.settle(p, 200);
  const n = w.els.length;
  await p.click('.dw-parts [data-dw="pick"][data-v="' + (n - 1) + '"]'); await L.settle(p, 100);
  await p.click('.dw-parts [data-dw="pick"][data-v="' + (n - 2) + '"]'); await L.settle(p, 100);
  await p.click('.dw-selbar [data-dw="piece"]'); await L.settle(p, 200);
  ok(await p.$('#dw-h-pc') !== null && await p.$('.dw-pc-prev svg') !== null, 'library piece: the form shows what will be saved');
  await p.fill('[data-dwf="pc.name"]', 'Leichhardt burger top');
  await p.selectOption('[data-dwf="pc.cat"]', 'bread');
  await p.fill('[data-dwf="pc.kw"]', 'house bun lid');
  await p.click('[data-dw="pc-save"]');
  await saved(p);
  s = await store(p);
  const libKey = Object.keys(s).find(k => /\/drawlib\//.test(k)), libDoc = libKey && s[libKey];
  ok(!!libDoc && libDoc.type === 'item' && libDoc.name === 'Leichhardt burger top' && libDoc.cat === 'bread' && libDoc.by === 'ann' && libDoc.v === 1 && /<(path|circle|ellipse|rect)/.test(libDoc.body), 'library piece: saved to drawlib by Ann, version 1, with its drawing');
  ok(await p.evaluate(() => window.LK_LIB.search('leichhardt burger top').some(it => it.name === 'Leichhardt burger top' && it.mine) && window.LK_LIB.search('house bun lid').length > 0), 'library piece: the search finds it by its name and its words');
  ok(await p.$('.dw-tile[data-v^="my-"]') !== null, 'library piece: shown in the library');
  // save as a template
  await p.click('[data-dw="panel"][data-v="tpl"]'); await L.settle(p, 200);
  await p.fill('[data-dwf="tplname"]', 'Burger and chips, pieces');
  await p.click('[data-dw="tpl-save"]');
  await saved(p);
  s = await store(p);
  const tplKey = Object.keys(s).find(k => /\/drawtpl\//.test(k)), tplDoc = tplKey && s[tplKey];
  ok(!!tplDoc && tplDoc.name === 'Burger and chips, pieces' && tplDoc.slot === 'plate' && tplDoc.els.length === n && tplDoc.els.every(e => !e.ing) && tplDoc.v === 1, 'template: saved to drawtpl with every part, without labels');
  ok(!errs(p).length, 'book drawing and pieces: no page errors ' + errs(p).join(' | '));
  const store1 = s;
  await p.context().close();

  // another recipe starts from the template: a copy; changing it leaves the template as it was
  p = await open('#/manage/draw/new/rump-250/plate', store1);
  await wait(p, () => !!document.querySelector('.dw-start [data-dw="from"][data-v^="tpl:"]'), null, 10000);
  ok(await p.$('.dw-start [data-dw="from"][data-v^="tpl:"]') !== null && /a template/.test(await txt(p, '.dw-start summary') || ''), 'template: offered to a new drawing for another recipe');
  await p.click('.dw-start summary'); await L.settle(p, 150);
  await p.click('.dw-start [data-dw="from"][data-v^="tpl:"]');
  await wait(p, () => window.LK_DRAW.state().d.els.length > 0);
  w = await S(p);
  ok(w.els.length === n && /^tpl:/.test(w.from), 'template: the new drawing starts with a copy of it');
  await p.click('.dw-el[data-i="0"]'); await L.settle(p, 100);
  await p.click('.dw-selbar [data-dw="del"]'); await L.settle(p, 200);
  await p.click('[data-dw="save"]'); await saved(p);
  s = await store(p);
  ok((s[tplKey] || {}).els.length === n && (s[tplKey] || {}).v === 1, 'template: a drawing made from it and changed leaves the template as it was');
  ok((s[fsKey(['drawings', 'rump-250-plate'])] || {}).els.length === n - 1, 'template: the copy is saved as the rump\'s own drawing');
  await shot(p, 'from-template');
  ok(!errs(p).length, 'template: no page errors ' + errs(p).join(' | '));
  const store2 = s;
  await p.context().close();

  // Use for another recipe: a copy of the rump's drawing opens for the 500 g rump; the rump's stays as it was
  p = await open('#/manage/draw/rump-250-plate', store2);
  await wait(p, () => window.LK_DRAW.state().d.els.length > 0, null, 10000);
  await p.click('[data-dw="panel"][data-v="reuse"]'); await L.settle(p, 200);
  await p.selectOption('[data-dwf="reuse"]', 'rump-500');
  await p.click('[data-dw="reuse-go"]');
  await wait(p, () => { const d = window.LK_DRAW.state().d; return !!d && d.rid === 'rump-500' && d.els.length > 0; }, null, 10000);
  w = await S(p);
  ok(/#\/manage\/draw\/new\/rump-500\/plate\/d:rump-250-plate$/.test(p.url()) && w.els.length === n - 1 && w.from === 'd:rump-250-plate', 'use for another recipe: a copy opens for the 500 g rump (' + p.url().split('#')[1] + ', ' + w.els.length + ' of ' + (n - 1) + ', ' + w.from + ')');
  await p.click('[data-dw="save"]'); await saved(p);
  s = await store(p);
  ok((s[fsKey(['drawings', 'rump-500-plate'])] || {}).v === 1 && (s[fsKey(['drawings', 'rump-250-plate'])] || {}).v === 1, 'use for another recipe: saved as the 500 g rump\'s drawing, the first one unchanged');
  ok(!errs(p).length, 'use for another recipe: no page errors ' + errs(p).join(' | '));
  const store2b = s;
  await p.context().close();

  // an SVG file: cleaned (no script, style, picture, event or url()), then a library piece on the drawing
  p = await open('#/manage/draw/new/pie/plate', store2b);
  await p.setInputFiles('[data-dwf="svgfile"]', { name: 'house-pie-lid.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(BAD_SVG) });
  await wait(p, () => !!document.querySelector('#dw-h-pc'));
  ok(await p.$eval('[data-dwf="pc.name"]', e => e.value) === 'house pie lid', 'SVG import: the form opens, named from the file');
  await p.click('[data-dw="pc-save"]'); await saved(p);
  s = await store(p);
  const imp = Object.keys(s).filter(k => /\/drawlib\//.test(k)).map(k => s[k]).find(x => x.name === 'house pie lid') || {};
  ok(/<rect/.test(imp.body || '') && !/script|style|image|onclick|url\(|__bad/i.test(imp.body || ''), 'SVG import: saved with its shapes and nothing else');
  ok(!(await p.evaluate(() => window.__bad)) && !(await p.evaluate(() => !!document.querySelector('.dw-svg script, .dw-svg image, .dw-svg [onclick]'))), 'SVG import: nothing from the file runs');
  w = await S(p);
  ok(w.els.some(e => /^my-/.test(e.a)), 'SVG import: the new piece is put on the drawing');
  ok(await p.evaluate(() => window.LK_LIB.search('house pie lid').length > 0), 'SVG import: the search finds it');
  // too big a file is refused
  await p.setInputFiles('[data-dwf="svgfile"]', { name: 'big.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">' + '<rect x="0" y="0" width="1" height="1"/>'.repeat(3000) + '</svg>') });
  await wait(p, () => /100 kB/.test((document.querySelector('.dw-bar .p-err') || {}).textContent || ''));
  ok(/100 kB at most/.test(await txt(p, '.dw-bar .p-err') || ''), 'SVG import: a file over 100 kB is refused');
  // servingware saved as a preset
  await p.click('[data-dw="panel"][data-v="ware"]'); await L.settle(p, 200);
  await p.click('[data-dw="ware-save"]'); await L.settle(p, 100);
  await p.fill('[data-dwf="wname"]', 'Pie plate, cream');
  await p.click('[data-dw="ware-save-go"]'); await saved(p);
  s = await store(p);
  const ware = Object.keys(s).filter(k => /\/drawlib\//.test(k)).map(k => s[k]).find(x => x.type === 'surf') || {};
  ok(ware.name === 'Pie plate, cream' && ware.p && ware.p.fam === 'plate', 'servingware: saved as a preset');
  ok(await p.$('[data-dw="wfam"][data-v="saved"]') !== null && await p.$('.dw-ware [data-dw="ware"]') !== null, 'servingware: offered under Saved');
  ok(!errs(p).length, 'SVG and servingware: no page errors ' + errs(p).join(' | '));
  const store3 = s;
  await p.context().close();

  // a pan and a side view from the book's own drawings
  p = await open('#/manage/draw/new/rice/pan');
  w = await p.evaluate(() => { const r = window.LK_DRAW.bookSource('pan', 'rice'); return r && { surf: r.surf, n: r.els.length, k: r.els[0].sx }; });
  ok(!!w && w.surf.shape === 'gn' && w.n === 1 && w.k > 1, 'book pan: the food goes into a real GN pan, sized to it');
  w = await p.evaluate(() => { const r = window.LK_DRAW.bookSource('side', 'pie'); return r && { surf: r.surf, n: r.els.length }; });
  ok(!!w && w.surf.fam === 'none' && w.n === 1, 'book side view: one picture');
  await p.context().close();

  // the manage page: Templates and Made in the book list them; Hide takes one out of the editor
  p = await L.open(b, '#/manage', { who: 'ann', extra: Object.assign({}, store3, cfg()), wait: 1200 });
  await wait(p, () => !!document.querySelector('[data-mg="chip"][data-v="templates"]'), null, 10000);
  await p.click('[data-mg="chip"][data-v="templates"]');
  await wait(p, () => !!document.querySelector('[data-mg="mine-hide"]'));
  ok(/Burger and chips, pieces/.test(await txt(p, '.mg-list') || ''), 'manage: Templates lists the template');
  await p.click('[data-mg="mine-hide"]'); await L.settle(p, 100);
  await p.click('[data-mg="mine-hide"]');
  await wait(p, () => /hidden/.test((document.querySelector('.mg-list') || {}).textContent || ''));
  s = await store(p);
  const tpl2 = s[tplKey] || {};
  ok(tpl2.removed === true && tpl2.v === 2 && tpl2.els.length === n, 'manage: Hide (tapped twice) saves version 2, hidden, the rest kept');
  await p.click('[data-mg="chip"][data-v="mylib"]');
  await wait(p, () => /Leichhardt burger top/.test((document.querySelector('.mg-list') || {}).textContent || ''));
  ok(/Leichhardt burger top/.test(await txt(p, '.mg-list') || '') && /Pie plate, cream/.test(await txt(p, '.mg-list') || ''), 'manage: Made in the book lists the pieces and the servingware');
  ok(!errs(p).length, 'manage: no page errors ' + errs(p).join(' | '));
  const store4 = s;
  await p.context().close();
  p = await open('#/manage/draw/new/burger/plate', store4);
  await wait(p, () => !!window.LK_DRAW.mine().loaded, null, 10000);
  await L.settle(p, 300);
  ok(!(await p.$('.dw-start [data-dw="from"][data-v^="tpl:"]')), 'manage: a hidden template is not offered any more');
  await p.context().close();

  // staff never reach any of it: the rules refuse a template or a piece from a sous chef
  p = await L.open(b, '#/', { who: 'bo', extra: cfg(), wait: 1200 });
  const refused = await p.evaluate(() => { const api = window.LK_PREP.book(); return api.ready().then(() => api.W([['set', api.docRef('drawtpl', 'sneaky-1'), { name: 'x', slot: 'plate', surf: {}, els: [], defs: '{}', vb: '', svgS: '', svgF: '', v: 1, upd: 1, removed: false }]])).then(() => 'saved', e => e && e.code); });
  ok(refused === 'permission-denied', 'staff cannot save a template (' + refused + ')');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
