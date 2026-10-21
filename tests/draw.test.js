// The drawing editor (#/manage/draw, js/draw.js, 21 Oct 2026): only the head chef opens it. Pieces from the library go
// on the plate, move, size, turn, copy, delete, layer and recolour; undo and redo; the servingware swaps under the food.
// A saved drawing shows on the card and the Pass with labels made from its parts, opens again part by part, reaches a
// fresh phone, keeps its own copy of each piece when the library changes, and anything unsafe in it is taken out.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], showBadges: true } });
const wait = (p, fn, arg, t) => L.waitFor(p, fn, arg, t || 8000).catch(() => false);
const store = p => p.evaluate(() => window.__fake.dump());
const W = p => p.evaluate(() => { const w = window.LK_DRAW.state(); return { n: w.d.els.length, sel: w.sel.slice(), els: JSON.parse(JSON.stringify(w.d.els)), surf: w.d.surf, undo: w.undo.length, redo: w.redo.length }; });
const toastText = p => txt(p, '.mg-toasts .p-toast');
// every library file is there once the library is complete; until then a missing one is not this file's fault
const LIBDONE = (() => { const fs = require('fs'), path = require('path'), src = fs.readFileSync(path.join(__dirname, '..', 'js', 'library.js'), 'utf8'), m = src.match(/L\.files = \[([^\]]*)\]/); return !!m && m[1].split(',').every(x => fs.existsSync(path.join(__dirname, '..', 'js', 'lib', x.trim().replace(/'/g, '') + '.js'))); })();
const errs = p => p.errors.filter(e => LIBDONE || !/Failed to load resource/.test(e));
async function centreOf(p, sel) { const b = await p.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; }

(async () => {
  const b = await L.start();
  let p, s, w;

  // staff: the page says only the head chef, and neither the editor nor the library is downloaded
  p = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'bo', extra: cfg(), wait: 1400 });
  await L.settle(p, 400);
  ok(/Only the head chef/.test(await txt(p, '#rtitle') || ''), 'staff: #/manage/draw says only the head chef can change recipes');
  ok(!p.urls.some(u => /js\/(draw|library|smart)\.js|js\/lib\//.test(u)), 'staff: the drawing editor, the library and the smart creator are never downloaded');
  await p.context().close();

  // the head chef draws the burger's plate (a computer, so the canvas and the library sit side by side)
  p = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'ann', extra: cfg(), wait: 1400, width: 1280, height: 900 });
  await wait(p, () => !!document.querySelector('.dw-svg'), null, 15000);
  ok(await p.$('.dw-svg') !== null && await p.$('.dw-panel #dw-q') !== null, 'new drawing: the canvas opens with the library');
  ok(await p.evaluate(() => !!document.querySelector('.dw-surf circle, .dw-surf path')), 'new drawing: a dinner plate is under it');
  await p.fill('#dw-q', 'rump'); await L.settle(p, 300);
  ok(await p.$('.dw-tile[data-v="rump"]') !== null, 'library search: rump finds the rump steak');
  await p.click('.dw-tile[data-v="rump"]'); await L.settle(p, 200);
  await p.fill('#dw-q', 'schnitty'); await L.settle(p, 300);
  ok(await p.$('.dw-tile[data-v="chicken-schnitzel"]') !== null, 'library search: a search word (schnitty) finds the schnitzel');
  await p.click('.dw-tile[data-v="chicken-schnitzel"]'); await L.settle(p, 200);
  w = await W(p);
  ok(w.n === 2 && w.els[0].a === 'rump@1' && w.els[1].a === 'chicken-schnitzel@1', 'two pieces on the plate');
  ok(Math.hypot(w.els[0].x - w.els[1].x, w.els[0].y - w.els[1].y) > 20, 'the second piece finds its own spot on the plate');
  ok(/Not saved yet/.test(await txt(p, '.dw-bar .mg-state') || '') && await p.evaluate(() => window.LK_MG.dirty() && window.LK_PREP.unsaved()), 'a change is not saved yet, and sign out waits for it');

  // move with the mouse
  const before = (await W(p)).els[1];
  const c0 = await centreOf(p, '.dw-el[data-i="1"]');
  await p.mouse.move(c0[0], c0[1]); await p.mouse.down(); await p.mouse.move(c0[0] + 40, c0[1] + 30, { steps: 5 }); await p.mouse.up(); await L.settle(p, 200);
  w = await W(p);
  ok(w.els[1].x > before.x + 5 && w.els[1].y > before.y + 5 && w.els[1].fixed === true, 'drag: the piece moves, and is marked as placed by hand');
  // size with the corner handle, turn with the top handle
  const sz = await centreOf(p, '.dw-size');
  await p.mouse.move(sz[0], sz[1]); await p.mouse.down(); await p.mouse.move(sz[0] + 50, sz[1] + 40, { steps: 5 }); await p.mouse.up(); await L.settle(p, 200);
  w = await W(p);
  ok(w.els[1].sx > 1.1 && Math.abs(w.els[1].sx - w.els[1].sy) < 0.01, 'size handle: bigger, in proportion');
  const tn = await centreOf(p, '.dw-turn'), el1 = await centreOf(p, '.dw-el[data-i="1"]');
  await p.mouse.move(tn[0], tn[1]); await p.mouse.down(); await p.mouse.move(el1[0] + 120, el1[1], { steps: 6 }); await p.mouse.up(); await L.settle(p, 200);
  w = await W(p);
  ok(Math.abs(w.els[1].r) > 30, 'turn handle: the piece turns (' + w.els[1].r + ' degrees)');
  // copy, flip, layers, delete, undo and redo
  await p.click('[data-dw="dup"]'); await L.settle(p, 150);
  w = await W(p); ok(w.n === 3 && w.sel[0] === 2, 'Duplicate makes a copy and picks it');
  await p.click('[data-dw="flip"]'); await L.settle(p, 150);
  w = await W(p); ok(w.els[2].flip === true, 'Flip');
  await p.click('[data-dw="back"]'); await L.settle(p, 150);
  w = await W(p); ok(w.els[0].a === 'chicken-schnitzel@1' && w.els[0].flip === true && w.sel[0] === 0, 'Back puts the picked piece behind the others');
  await p.click('[data-dw="front"]'); await L.settle(p, 150);
  w = await W(p); ok(w.els[2].flip === true && w.sel[0] === 2, 'Front brings it forward again');
  await p.click('[data-dw="del"]'); await L.settle(p, 150);
  w = await W(p); ok(w.n === 2, 'Delete');
  await p.click('[data-dw="undo"]'); await L.settle(p, 150);
  w = await W(p); ok(w.n === 3, 'Undo brings the piece back');
  await p.click('[data-dw="redo"]'); await L.settle(p, 150);
  w = await W(p); ok(w.n === 2, 'Redo takes it away again');
  // keyboard: arrows move the picked piece
  await p.evaluate(() => { window.LK_DRAW.state().sel = [0]; });
  await p.focus('.dw-svg'); const x0 = (await W(p)).els[0].x;
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('Shift+ArrowRight'); await L.settle(p, 100);
  ok(Math.abs((await W(p)).els[0].x - x0 - 11) < 0.01, 'keys: arrows move the picked piece (1, and 10 with Shift)');
  await p.keyboard.press('Control+z'); await L.settle(p, 100);
  ok(Math.abs((await W(p)).els[0].x - x0 - 1) < 0.01, 'keys: Ctrl+Z undoes');
  // colours: a whole piece in a sauce colour, then back
  await p.evaluate(() => { window.LK_DRAW.state().sel = [0]; }); await p.click('[data-dw="none"]').catch(() => {});
  await p.evaluate(() => { window.LK_DRAW.state().sel = [0]; window.LK_DRAW.state().panel = 'colour'; window.LK_DRAW.changed(); });
  await L.settle(p, 150);
  await p.fill('#dw-tint', 'mushroom'); await p.press('#dw-tint', 'Enter'); await p.locator('#dw-tint').dispatchEvent('change'); await L.settle(p, 150);
  w = await W(p); ok(w.els[0].cm && Object.keys(w.els[0].cm).length > 0, 'Colours: the piece takes the mushroom sauce colour');
  await p.click('[data-dw="cmreset"]'); await L.settle(p, 150);
  w = await W(p); ok(!w.els[0].cm, 'Colours: back to its own colours');
  // the label: which ingredient the piece is
  await p.evaluate(() => { const st = window.LK_DRAW.state(); st.sel = [1]; st.panel = 'label'; window.LK_DRAW.changed(); });
  await L.settle(p, 150);
  await p.click('[data-dw="setIng"][data-v="Crumbed chicken thigh"]'); await L.settle(p, 150);
  w = await W(p); ok(w.els[1].ing === 'Crumbed chicken thigh', 'Which ingredient: the schnitzel is labelled Crumbed chicken thigh');
  // text, line and shapes
  await p.click('[data-dw="text"]'); await L.settle(p, 150);
  await p.fill('[data-dwf="el.s"]', 'Pass side'); await L.settle(p, 150);
  w = await W(p); ok(w.els[w.n - 1].t === 'text' && w.els[w.n - 1].s === 'Pass side', 'Text: a label with words');
  await p.click('[data-dw="arrow"]'); await L.settle(p, 150);
  w = await W(p); ok(w.els[w.n - 1].t === 'line' && w.els[w.n - 1].arrow, 'Arrow');
  await p.click('[data-dw="ellipse"]'); await L.settle(p, 150);
  w = await W(p); ok(w.els[w.n - 1].t === 'ellipse', 'Oval');
  await p.click('[data-dw="del"]'); await L.settle(p, 150);
  // the servingware swaps under the food
  await p.click('[data-dw="panel"][data-v="ware"]'); await L.settle(p, 200);
  await p.click('[data-dw="wfam"][data-v="board"]'); await L.settle(p, 200);
  const nBefore = (await W(p)).n;
  await p.click('.dw-ware .dw-tile >> nth=0'); await L.settle(p, 200);
  w = await W(p); ok(w.surf.fam === 'board' && w.n === nBefore, 'Servingware: a board goes under the food, the food stays');
  await p.click('[data-dw="wfam"][data-v="plate"]'); await L.settle(p, 150);
  await p.click('.dw-ware .dw-tile >> nth=0'); await L.settle(p, 200);
  w = await W(p); ok(w.surf.fam === 'plate' && w.surf.size === 30, 'Servingware: back to the dinner plate');
  // in this recipe, not on the plate yet: one tap adds it, labelled
  const chip = await p.$('.dw-miss .chip');
  ok(chip !== null, 'the ingredients not on the plate yet show as chips');
  // check the drawing
  await p.click('[data-dw="check"]'); await L.settle(p, 150);
  ok(/not on the plate/.test(await txt(p, '.dw-check') || '') && /has no label/.test(await txt(p, '.dw-check') || ''), 'Check the drawing: names an ingredient not on the plate and a part with no label');
  ok(errs(p).length === 0, 'editing: no page errors ' + errs(p).join(' | '));
  const nSaved = (await W(p)).n;

  // save: the drawing, its link on the recipe and the Pass labels made from its parts
  await p.click('[data-dw="save"]');
  await wait(p, () => /Saved\. Version 1/.test((document.querySelector('.mg-toasts .p-toast') || {}).textContent || ''));
  ok(/Saved\. Version 1/.test(await toastText(p) || ''), 'save: Saved. Version 1.');
  ok(/#\/manage\/draw\/burger-plate$/.test(p.url()), 'save: the page is now the drawing\'s own');
  s = await store(p);
  const dw = s[fsKey(['drawings', 'burger-plate'])] || {};
  ok(dw.v === 1 && dw.slot === 'plate' && dw.rid === 'burger' && dw.by === 'ann' && Array.isArray(dw.els) && dw.els.length === nSaved, 'save: drawings/burger-plate, version 1 by Ann, with its parts');
  ok(/data-surf/.test('') || (dw.svgS.length > 50 && dw.svgF.length > 50), 'save: the flat drawing is saved with it');
  const defs = JSON.parse(dw.defs || '{}');
  ok(defs['rump@1'] && defs['chicken-schnitzel@1'], 'save: a copy of each library piece is kept with the drawing');
  ok(/Top-down drawing of Chicken Burger on a dinner plate 30 cm/.test(dw.alt || ''), 'save: words for screen readers (' + (dw.alt || '').slice(0, 80) + ')');
  const rb = s[fsKey(['recipes', 'burger'])] || {};
  ok(rb.r && rb.r.art === '@burger-plate', 'save: the recipe points to the drawing');
  ok(rb.r && rb.r.pins.length === 1 && rb.r.pins[0].label === 'Crumbed chicken thigh' && rb.r.pins[0].ing === 'Crumbed chicken thigh' && rb.r.pins[0].tags.indexOf('Gluten') >= 0, 'save: the Pass label is made from the labelled part, with its allergens');
  const ix = s[fsKey(['book', 'index'])] || {};
  ok(ix.d && ix.d['burger-plate'] === 1 && ix.r && ix.r.burger === 1, 'save: book/index has the drawing and the recipe');
  // the card and the Pass show it
  await p.goto(L.BASE + '#/r/burger'); await L.settle(p, 800);
  ok(await p.evaluate(() => !!document.querySelector('.stage svg.art [data-surf]')), 'the Pass: the burger shows the new drawing');
  ok(await p.evaluate(() => document.querySelectorAll('.stage .pin').length) === 1, 'the Pass: one label, from the drawing');
  await p.emulateMedia({ media: 'print' });
  ok(await p.evaluate(() => { const s = document.querySelector('svg.art'); return !!s && s.getBoundingClientRect().width > 50; }), 'print: the drawing prints with the card');
  await p.emulateMedia({ media: 'screen' });
  // open it again: every part is back
  await p.goto(L.BASE + '#/manage/draw/burger-plate'); await wait(p, () => !!(window.LK_DRAW && window.LK_DRAW.open() && document.querySelector('.dw-svg')));
  w = await W(p);
  ok(w.n === nSaved && w.els[1].ing === 'Crumbed chicken thigh', 'open again: every part is back, with its label');
  // a newer library drawing never changes the saved one, until asked
  await p.evaluate(() => { const it = window.LK_LIB.get('rump'); it.v = 2; });
  await p.goto(L.BASE + '#/manage'); await L.settle(p, 200);
  await p.goto(L.BASE + '#/manage/draw/burger-plate'); await wait(p, () => !!document.querySelector('.dw-svg'));
  ok(/Newer library drawings/.test(await txt(p, '.dw') || '') && (await W(p)).els.some(e => e.a === 'rump@1'), 'library changed: the drawing keeps its own copy and offers the newer one');
  ok(errs(p).length === 0, 'head chef: no page errors ' + errs(p).join(' | '));
  const saved = await store(p);
  await p.context().close();

  // a fresh phone gets the drawing; anything unsafe in a drawing is taken out
  const bad = Object.assign({}, saved[fsKey(['drawings', 'burger-plate'])], { svgF: saved[fsKey(['drawings', 'burger-plate'])].svgF + '<script>window.__bad=1</script><image href="x.png" onload="window.__bad=2"/><circle cx="0" cy="0" r="3" onclick="window.__bad=3" fill="url(#x)"/>' });
  p = await L.open(b, '#/r/burger', { who: 'bo', extra: Object.assign(cfg(), { [fsKey(['book', 'index'])]: saved[fsKey(['book', 'index'])], [fsKey(['recipes', 'burger'])]: saved[fsKey(['recipes', 'burger'])], [fsKey(['drawings', 'burger-plate'])]: bad }), wait: 1400 });
  await wait(p, () => !!document.querySelector('.stage svg.art [data-surf]'));
  ok(await p.evaluate(() => !!document.querySelector('.stage svg.art [data-surf]')), 'a fresh phone: the burger shows the head chef\'s drawing');
  ok(await p.evaluate(() => !document.querySelector('.stage svg.art script, .stage svg.art image, .stage svg.art [onclick], .stage svg.art [onload]') && !window.__bad && !/url\(/.test(document.querySelector('.stage svg.art').innerHTML)), 'a fresh phone: scripts, images, events and url() are taken out');
  await p.reload(); await L.settle(p, 1200);
  ok(await p.evaluate(() => !!document.querySelector('.stage svg.art [data-surf]')), 'next start: the drawing comes from this phone\'s copy');
  ok(p.errors.length === 0, 'fresh phone: no page errors ' + p.errors.join(' | '));
  await p.context().close();

  // a side view: labels on the drawing itself, and the card shows it From the side
  p = await L.open(b, '#/manage/draw/new/burger/side', { who: 'ann', extra: cfg(), wait: 1400, width: 1280, height: 900 });
  await wait(p, () => !!document.querySelector('.dw-svg'), null, 15000);
  await p.evaluate(() => { window.LK_DRAW.addItem('rump', { x: 0, y: -10, ing: 'Crumbed chicken thigh' }); window.LK_DRAW.addItem('sausage', { x: 30, y: -30, ing: 'Burger bun' }); });
  await p.click('[data-dw="labels"]'); await L.settle(p, 200);
  w = await W(p);
  ok(w.els.filter(e => e.t === 'text' && e.auto).length === 2 && w.els.some(e => e.t === 'text' && e.s === 'Burger bun' && e.lx != null), 'Label everything: a label with a line for each part');
  await p.click('[data-dw="save"]');
  await wait(p, () => /Saved/.test((document.querySelector('.mg-toasts .p-toast') || {}).textContent || ''));
  s = await store(p);
  ok((s[fsKey(['recipes', 'burger'])] || { r: {} }).r.side === '@burger-side' && /<text/.test((s[fsKey(['drawings', 'burger-side'])] || {}).svgF || ''), 'side view: saved with its labels, the recipe points to it');
  await p.goto(L.BASE + '#/r/burger'); await L.settle(p, 800);
  ok(await p.evaluate(() => { const s = document.querySelector('.side-art svg'); return !!s && !!s.querySelector('[data-surf]') && /Side view of Chicken Burger/.test(s.getAttribute('aria-label') || ''); }), 'side view: the card shows it From the side, with its words for screen readers');
  ok(errs(p).length === 0, 'side view: no page errors ' + errs(p).join(' | '));
  await p.context().close();

  // an ingredient renamed in the recipe form: its Pass label and its parts on the plate follow it
  p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: Object.assign(cfg(), { [fsKey(['book', 'index'])]: saved[fsKey(['book', 'index'])], [fsKey(['recipes', 'burger'])]: saved[fsKey(['recipes', 'burger'])], [fsKey(['drawings', 'burger-plate'])]: saved[fsKey(['drawings', 'burger-plate'])] }), wait: 1400 });
  // the form first shows the recipe from js/data.js; wait for the saved one (with its drawing) to come in over it
  await wait(p, () => !!document.querySelector('[data-mg="draw"][data-v="burger-plate"]'), null, 10000);
  ok(await p.$('[data-mg="draw"][data-v="burger-plate"]') !== null && await p.$('[data-mg="draw"][data-v="new:side"]') !== null, 'recipe form: Change this drawing and Draw the side view in the book');
  const k = await p.evaluate(() => [...document.querySelectorAll('[data-f$=".name"][data-f^="ing."]')].findIndex(x => x.value === 'Crumbed chicken thigh'));
  await p.fill('[data-f="ing.' + k + '.name"]', 'Crumbed thigh'); await L.settle(p, 500);
  await p.click('[data-mg="save"]'); await wait(p, () => /Saved/.test((document.querySelector('.mg-toasts .p-toast') || {}).textContent || ''));
  s = await store(p);
  const pin = ((s[fsKey(['recipes', 'burger'])] || { r: {} }).r.pins || [])[0] || {};
  ok(pin.label === 'Crumbed thigh' && pin.ing === 'Crumbed thigh', 'rename: the Pass label made from the drawing follows the new name');
  await p.click('[data-mg="draw"][data-v="burger-plate"]');
  await wait(p, () => !!(window.LK_DRAW && window.LK_DRAW.open() && document.querySelector('.dw-svg')), null, 15000);
  ok((await W(p)).els.some(e => e.ing === 'Crumbed thigh'), 'rename: the part on the plate follows it too');
  ok(errs(p).length === 0, 'rename: no page errors ' + errs(p).join(' | '));
  await p.context().close();

  // a phone-sized screen: the canvas stays in view above the tools, nothing scrolls sideways
  p = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'ann', extra: cfg(), wait: 1400, touch: true });
  await wait(p, () => !!document.querySelector('.dw-svg'), null, 15000);
  ok(!(await L.overflow(p)), 'phone: no sideways scroll');
  await p.click('.dw-tile[data-dw="add"] >> nth=0'); await L.settle(p, 200);
  ok((await W(p)).n === 1, 'phone: a tap on a library drawing puts it on the plate');
  await p.context().close();

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
