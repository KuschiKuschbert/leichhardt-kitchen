// Nothing typed in an editor goes without asking (28 Oct 2026, keep-typed-work). The recipe form and the drawing
// editor: the first change while "Changes not saved yet" shows brings the kept changes back, so what is typed or drawn
// then is kept too; Remove on an ingredient or a Pass label with something in it, Open this version over changes, Open
// theirs after a clash, Throw them away on a kept drawing and back to worked-out allergens over hand-set ones ask a
// second tap; Save is off and saves nothing on an untouched recipe or drawing. Chef to-do: Change on another job, Cancel
// and Remove over changes ask first, the job already open carries on, and an unchanged Save changes saves nothing. The
// line menu's Remove line finds its line after the list redrew, and a sign-out closes the menu. Supplier order: a reload
// asks over a draft, a staff list saved on another phone keeps it, and an unchanged item or supplier saves nothing.
// Delivery received: Clear form over typed readings asks first. Manage functions: an untouched form saves nothing.
// Since 29 Oct 2026: a button, a link box or a label dragged while the kept box shows; an armed Remove after Up; Save on
// a recipe flagged "The book file changed"; a part's words, an arrow key and Delete while the kept drawing box shows;
// a hand-over with an editor open leaves no draft; Clear form with a keyboard; Manage catalogue losing its edit rights;
// Load theirs and Split evenly again ask first; and Update now's second tap with no Reload site? box on each page.
const L = require('./lib');
const F = require('./supplier-fixtures');
const M = require('../js/functions.js');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const today = L.ymd(new Date(L.NOW));
const P = (id, name, role, x) => Object.assign({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true }, x || {});
const cfg = () => ({ [fsKey(['config', 'main'])]: { people: [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head', { fn: true }), P('bo', 'Bo', 'staff')], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], fnIds: ['ann'], showBadges: true } });
const fnDoc = name => ({ v: 1, status: 'draft', name, date: today, start: M.kat(today, 1080), guests: 20, gu: false, st: false, loc: 'Dining room', mode: 'all',
  rounds: [{ at: M.kat(today, 1110), note: '' }], lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 2, u: M.toU([2]) }],
  notes: '', kc: '', by: 'ann', upd: L.NOW - 3600000, cAt: L.NOW - 86400000, cBy: 'ann' });
const T = (id, x) => ({ [fsKey(['todos', id])]: Object.assign({ text: 'Job ' + id, st: 'open', due: '', for: '', from: 'sam', at: L.NOW - 3600000, doneAt: 0, doneBy: '', upd: L.NOW - 3600000, by: 'sam' }, x) });
const jobs = () => Object.assign({}, T('t1', { text: 'Book the hood clean' }), T('t2', { text: 'Order new tongs', at: L.NOW - 1800000 }));
const S = (p, f, a) => p.evaluate(f, a);
const go = async (p, hash) => { await p.evaluate(h => { location.hash = h; }, hash); await L.settle(p, 300); };
const wait = (p, fn, arg, t) => L.waitFor(p, fn, arg, t || 8000).then(() => true, () => false);
const store = p => p.evaluate(() => window.__fake.dump());
const draft = (p, k) => p.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
const toastNow = (p, sel) => p.evaluate(s => { const t = document.querySelector(s || '.mg-toasts .p-toast'); return t ? t.textContent : ''; }, sel);
const editor = p => wait(p, () => !!document.getElementById('mg-name'));
const canvas = p => wait(p, () => !!document.querySelector('.dw-svg'), null, 15000);
const disabled = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.disabled : null; }, sel);
// a reload or closing the tab: true when the page asks first
const asks = p => p.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; });
// a button left on by an older page: the save itself must refuse too
const force = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.disabled = false; e.click(); return true; }, sel);
const fits = async (p, label) => { const o = await L.overflow(p); ok(!o, label + ': no sideways scroll' + (o ? ' (' + o + ')' : '')); };
const quiet = (p, label) => ok(p.errors.length === 0, label + ': no page errors ' + p.errors.join(' | '));
async function safe(label, fn) { try { await fn(); } catch (e) { ok(false, label + ' threw ' + String(e).split('\n')[0]); } }

(async () => {
  const b = await L.start();
  let p;

  // ---------- the recipe form: Save with nothing changed, typing while the kept box shows ----------
  await safe('recipe form', async () => {
    p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: cfg(), wait: 1400 });
    await editor(p);
    ok(await disabled(p, '[data-mg="save"]') === true, 'recipe form: Save is off on an untouched recipe');
    await force(p, '[data-mg="save"]'); await L.settle(p, 1200);
    ok(!(await store(p))[fsKey(['recipes', 'burger'])], 'recipe form: an untouched recipe saves nothing, even from a Save left on (the file\'s copy keeps winning)');
    await p.fill('#mg-name', 'Chicken Burger ONE'); await L.settle(p, 700);
    ok(await disabled(p, '[data-mg="save"]') === false, 'recipe form: typing one change turns Save on');
    ok(((await draft(p, 'lk.mg.draft.burger')) || { e: { d: {} } }).e.d.name === 'Chicken Burger ONE', 'recipe form: the change is kept on this device');
    await go(p, '#/manage'); await go(p, '#/manage/r/burger'); await editor(p);
    ok(!!(await p.$('.mg-kept')) && await p.inputValue('#mg-name') !== 'Chicken Burger ONE', 'kept box: the form opens on the saved recipe, with Changes not saved yet');
    await p.click('#mg-yield'); await L.settle(p, 150); await p.keyboard.type(' TWO'); await L.settle(p, 700);
    const d1 = await draft(p, 'lk.mg.draft.burger');
    ok(!(await p.$('.mg-kept')) && await p.inputValue('#mg-name') === 'Chicken Burger ONE' && /TWO$/.test(await p.inputValue('#mg-yield')), 'kept box: a tap in a box brings the kept changes back, and what is typed goes on them');
    ok(!!d1 && d1.e.d.name === 'Chicken Burger ONE' && /TWO$/.test(d1.e.d.yield), 'kept box: what is typed then is kept on this device with the kept changes (draft yield ' + (d1 && JSON.stringify(d1.e.d.yield)) + ')');
    await go(p, '#/r/burger');
    ok(/kept as a draft/.test(await toastNow(p)), 'kept box: leaving says the changes are kept, and they are');
    // a button that changes the recipe while the box shows: the kept changes come back first, and the tap does nothing else
    await go(p, '#/manage/r/burger'); await editor(p);
    const n0 = await S(p, () => document.querySelectorAll('.mg-ing').length);
    await p.click('[data-mg="ing-add"]'); await L.settle(p, 200);
    ok(!(await p.$('.mg-kept')) && await p.inputValue('#mg-name') === 'Chicken Burger ONE' && await S(p, () => document.querySelectorAll('.mg-ing').length) === n0, 'kept box: Add an ingredient while it shows brings the kept changes back, with no row added to the saved copy');
    ok(/kept changes are back/.test(await toastNow(p)), 'kept box: the toast says the kept changes are back in the form');
    quiet(p, 'recipe form');
    await p.context().close();
  });

  // ---------- the recipe form: allergens set by hand, ingredients and Pass labels ----------
  await safe('recipe rows', async () => {
    p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: cfg(), wait: 1400 });
    await editor(p);
    // back to worked out from the ingredients drops the hand-set allergens and their notes: a second tap
    const notes = () => S(p, () => [...document.querySelectorAll('[data-f^="handfrom."]')].map(e => e.value).filter(Boolean).length);
    const had = await notes();
    await L.choose(p, '[data-mg="hand"][data-v="0"]'); await L.settle(p, 150);
    ok(had > 0 && await notes() === had && await txt(p, '[data-mg="hand"][data-v="0"]') === 'Tap again: hand-set allergens go', 'allergens: the first tap on Worked out from the ingredients keeps the hand-set ones and their notes');
    await fits(p, 'allergens armed at 390');
    await L.choose(p, '[data-mg="hand"][data-v="0"]'); await L.settle(p, 150);
    ok(await S(p, () => document.querySelectorAll('[data-f^="hand."]').length) === 0, 'allergens: the second tap works them out from the ingredients');
    // an ingredient with words in it: Remove asks first; an empty row goes in one tap
    const ings = () => S(p, () => document.querySelectorAll('.mg-ing').length);
    const i0 = await ings();
    await p.click('[data-mg="ing-del"][data-i="0"]'); await L.settle(p, 150);
    ok(await ings() === i0 && await txt(p, '[data-mg="ing-del"][data-i="0"]') === 'Tap again to remove' && /^Tap again to remove/.test(await p.getAttribute('[data-mg="ing-del"][data-i="0"]', 'aria-label')), 'ingredients: the first tap on Remove keeps a filled ingredient and says Tap again to remove');
    await fits(p, 'ingredient Remove armed at 390');
    await p.click('[data-mg="ing-del"][data-i="0"]'); await L.settle(p, 150);
    ok(await ings() === i0 - 1, 'ingredients: the second tap removes it');
    await p.click('[data-mg="ing-add"]'); await L.settle(p, 150);
    await p.click('[data-mg="ing-del"][data-i="' + (i0 - 1) + '"]'); await L.settle(p, 150);
    ok(await ings() === i0 - 1, 'ingredients: an empty row added by mistake goes in one tap');
    quiet(p, 'recipe rows');
    await p.context().close();
  });
  await safe('recipe labels', async () => {
    p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: cfg(), wait: 1400 });
    await editor(p);
    // a Pass label with words: Remove this label asks first
    const pins = () => S(p, () => document.querySelectorAll('.mg-pinrow').length);
    const p0 = await pins();
    await p.click('.mg-pinrow [data-mg="pin-pick"][data-i="0"]'); await L.settle(p, 150);
    await p.click('[data-mg="pin-del"][data-i="0"]'); await L.settle(p, 150);
    ok(p0 > 0 && await pins() === p0 && await txt(p, '[data-mg="pin-del"][data-i="0"]') === 'Tap again to remove', 'Pass labels: the first tap on Remove this label keeps it and says Tap again to remove');
    await p.click('[data-mg="pin-del"][data-i="0"]'); await L.settle(p, 150);
    ok(await pins() === p0 - 1, 'Pass labels: the second tap removes it');
    quiet(p, 'recipe labels');
    await p.context().close();
  });

  // ---------- the recipe form: Open this version and Open theirs over changes ----------
  await safe('recipe versions', async () => {
    const old = { r: { id: 'burger', kind: 'main', no: '1', forLine: 'Plate', name: 'Old Burger v1', yield: 'Per plate', ingredients: [{ q: '1', name: 'Bun' }], pins: [] }, v: 1, upd: L.NOW - 9e6, src: 'book', base: '', removed: false, by: 'ann' };
    const cur = { r: { id: 'burger', kind: 'main', no: '1', forLine: 'Plate', name: 'Chicken Burger', yield: 'Per plate', ingredients: [{ q: '1', name: 'Bun' }, { q: '1', name: 'Chicken' }], pins: [] }, v: 2, upd: L.NOW - 3e6, src: 'book', base: '', removed: false, by: 'ann' };
    const ex = Object.assign(cfg(), { [fsKey(['recipes', 'burger'])]: cur, [fsKey(['recipes', 'burger', 'hist', '1'])]: { was: old, at: L.NOW - 3e6 }, [fsKey(['book', 'index'])]: { r: { burger: 2 }, upd: L.NOW - 3e6 } });
    p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: ex, wait: 1400 });
    await editor(p);
    await p.fill('#mg-name', 'Chicken Burger UNSAVED'); await L.settle(p, 600);
    await p.click('[data-mg="hist"]');
    await wait(p, () => !!document.querySelector('[data-mg="hist-use"]'));
    await p.click('[data-mg="hist-use"]'); await L.settle(p, 300);
    ok(await p.inputValue('#mg-name') === 'Chicken Burger UNSAVED' && await txt(p, '[data-mg="hist-use"]') === 'Not saved. Tap again', 'earlier versions: Open this version over changes asks first and keeps them');
    ok(((await draft(p, 'lk.mg.draft.burger')) || { e: { d: {} } }).e.d.name === 'Chicken Burger UNSAVED', 'earlier versions: the kept draft is still the changes');
    await p.click('[data-mg="hist-use"]'); await L.settle(p, 300);
    ok(await p.inputValue('#mg-name') === 'Old Burger v1', 'earlier versions: the second tap puts the version in the form');
    await p.click('[data-mg="undo-all"]'); await p.click('[data-mg="undo-all"]'); await L.settle(p, 200);
    await p.fill('#mg-yield', 'MINE yield'); await L.settle(p, 600);
    await S(p, ([k, v]) => window.__fake.write(k, v), [fsKey(['recipes', 'burger']), Object.assign({}, cur, { v: 3, r: Object.assign({}, cur.r, { name: 'Chicken Burger Theirs' }), upd: L.NOW - 60000 })]);
    await p.click('[data-mg="save"]');
    await wait(p, () => !!document.querySelector('[data-mg="theirs"]'));
    await p.click('[data-mg="theirs"]'); await L.settle(p, 300);
    ok(await p.inputValue('#mg-yield') === 'MINE yield' && await txt(p, '[data-mg="theirs"]') === 'Tap again: your changes go', 'another device: the first tap on Open theirs keeps what was typed here');
    await fits(p, 'Open theirs armed at 390');
    await p.click('[data-mg="theirs"]'); await L.settle(p, 300);
    ok(await p.inputValue('#mg-name') === 'Chicken Burger Theirs', 'another device: the second tap opens theirs');
    quiet(p, 'recipe versions');
    await p.context().close();
  });

  // ---------- the drawing editor ----------
  const keptDrawing = async () => {
    const q = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'ann', extra: cfg(), wait: 1500 });
    await canvas(q);
    await S(q, () => { window.LK_DRAW.addItem('rump'); document.querySelector('.wtop [data-act="back"]').click(); });
    await editor(q);
    await go(q, '#/manage/draw/new/burger/plate');
    await wait(q, () => !!document.querySelector('[data-dw="kept-use"]'), null, 15000);
    return q;
  };
  await safe('drawing kept', async () => {
    p = await keptDrawing();
    await p.click('[data-dw="kept-drop"]'); await L.settle(p, 200);
    ok(!!(await draft(p, 'lk.dw.draft.new-burger-plate')) && await txt(p, '[data-dw="kept-drop"]') === 'Tap again to throw them away', 'drawing: the first tap on Throw them away keeps the kept drawing');
    await fits(p, 'drawing Throw them away armed at 390');
    await p.click('[data-dw="kept-drop"]'); await L.settle(p, 200);
    ok(!(await draft(p, 'lk.dw.draft.new-burger-plate')) && !(await p.$('.mg-kept')), 'drawing: the second tap throws it away');
    quiet(p, 'drawing kept');
    await p.context().close();
  });
  await safe('drawing kept 2', async () => {
    p = await keptDrawing();
    await S(p, () => { window.LK_DRAW.addItem('rump'); }); await L.settle(p, 700);
    ok(!(await p.$('.mg-kept')) && await S(p, () => window.LK_DRAW.state().d.els.length) === 2, 'drawing: a piece added while the kept box shows goes on the kept drawing');
    await go(p, '#/manage/r/burger');
    const d2 = await draft(p, 'lk.dw.draft.new-burger-plate');
    ok(!!d2 && d2.els.length === 2 && /kept as a draft/.test(await toastNow(p)), 'drawing: leaving keeps both parts on this device (draft parts ' + (d2 && d2.els.length) + ')');
    quiet(p, 'drawing kept 2');
    await p.context().close();
  });
  await safe('drawing kept 3', async () => {
    p = await keptDrawing();
    const bx = await p.$eval('.dw-svg', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await p.mouse.click(bx.x, bx.y); await L.settle(p, 300);
    ok(!(await p.$('.mg-kept')) && await S(p, () => window.LK_DRAW.state().d.els.length) === 1 && /kept drawing is back/.test(await toastNow(p)), 'drawing: a touch on the drawing while the kept box shows brings the kept drawing back');
    quiet(p, 'drawing kept 3');
    await p.context().close();
  });

  await safe('drawing save', async () => {
    p = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'ann', extra: cfg(), wait: 1500 });
    await canvas(p);
    await S(p, () => { window.LK_DRAW.addItem('rump'); });
    await p.click('[data-dw="save"]');
    await wait(p, () => /\/manage\/draw\/burger-plate$/.test(location.hash) && !window.LK_DRAW.state().saving, null, 10000);
    await L.settle(p, 600);
    ok(await disabled(p, '[data-dw="save"]') === true, 'drawing: after Saved. Version 1, Save is off');
    await force(p, '[data-dw="save"]'); await L.settle(p, 1500);
    ok(((await store(p))[fsKey(['drawings', 'burger-plate'])] || {}).v === 1, 'drawing: Save on an untouched saved drawing saves no new version');
    // an arrow key moves the part and draws only the canvas: the bar follows
    await S(p, () => { window.LK_DRAW.state().sel = [0]; document.querySelector('.dw-svg').focus(); });
    await p.keyboard.press('ArrowRight'); await L.settle(p, 300);
    ok(await disabled(p, '[data-dw="save"]') === false && /Not saved yet/.test(await txt(p, '.dw-bar .mg-state') || ''), 'drawing: a part moved with an arrow key turns Save on, and the bar says Not saved yet');
    quiet(p, 'drawing save');
    await p.context().close();
  });
  await safe('drawing clash', async () => {
    p = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'ann', extra: cfg(), wait: 1500 });
    await canvas(p);
    await S(p, () => { window.LK_DRAW.addItem('rump'); });
    await p.click('[data-dw="save"]');
    await wait(p, () => /\/manage\/draw\/burger-plate$/.test(location.hash) && !window.LK_DRAW.state().saving, null, 10000);
    await L.settle(p, 600);
    await S(p, () => { window.LK_DRAW.addItem('rump'); }); await L.settle(p, 300);
    // a clash: their version 2 is on the server. Open theirs asks first, since the part added here would go
    await S(p, k => { const s = window.__fake.dump()[k]; window.__fake.write(k, Object.assign({}, s, { v: 2, upd: s.upd + 1 })); }, fsKey(['drawings', 'burger-plate']));
    await p.click('[data-dw="save"]');
    await wait(p, () => !!document.querySelector('[data-dw="theirs"]'), null, 10000);
    await p.click('[data-dw="theirs"]'); await L.settle(p, 200);
    ok(!!(await p.$('[data-dw="theirs"]')) && await S(p, () => window.LK_DRAW.dirty() && window.LK_DRAW.state().d.els.length === 2) && await txt(p, '[data-dw="theirs"]') === 'Tap again: your changes go', 'drawing: the first tap on Open theirs keeps the part added here');
    await p.click('[data-dw="theirs"]'); await L.settle(p, 200);
    ok(!(await p.$('[data-dw="theirs"]')) && !(await S(p, () => window.LK_DRAW.dirty())), 'drawing: the second tap opens theirs');
    quiet(p, 'drawing clash');
    await p.context().close();
  });

  // ---------- Chef to-do ----------
  const todoPage = async () => {
    const q = await L.open(b, '#/todo', { who: 'sam', extra: jobs(), wait: 1500 });
    await wait(q, () => document.querySelectorAll('[data-lv="todo"] .todo-row').length === 2);
    return q;
  };
  const box = q => q.$eval('[data-k="todo-text"]', e => e.value);
  // t2 open with Change, its words changed (on the old book the first Change opens it at once)
  const changed = async (q, words) => {
    await q.click('[data-p="todo-edit"][data-id="t2"]'); await L.settle(q, 200);
    await q.fill('[data-k="todo-text"]', words); await L.settle(q, 150);
  };
  await safe('to-do change', async () => {
    p = await todoPage();
    await p.fill('[data-k="todo-text"]', 'Call the plumber about the floor drain'); await L.settle(p, 150);
    await p.click('[data-p="todo-edit"][data-id="t2"]'); await L.settle(p, 200);
    ok(await box(p) === 'Call the plumber about the floor drain' && await txt(p, '[data-p="todo-edit"][data-id="t2"]') === 'Not saved. Tap again' && await S(p, () => window.LK_PREP.unsaved()), 'to-do: Change on a job over a half-typed new job asks first and keeps the words');
    await fits(p, 'to-do Change armed at 390');
    await p.click('[data-p="todo-edit"][data-id="t2"]'); await L.settle(p, 200);
    ok(await box(p) === 'Order new tongs', 'to-do: the second tap opens the job');
    quiet(p, 'to-do change');
    await p.context().close();
  });
  await safe('to-do save', async () => {
    p = await todoPage();
    await p.click('[data-p="todo-edit"][data-id="t2"]'); await L.settle(p, 200);
    // opened and not changed: Save changes is off and saves nothing
    const writes = () => S(p, () => window.__fake.writes.length), w0 = await writes();
    ok(await disabled(p, '[data-p="todo-save"]') === true, 'to-do: Save changes is off on a job not changed');
    await force(p, '[data-p="todo-save"]'); await L.settle(p, 600);
    ok(await writes() === w0 && !/Job saved/.test(await txt(p, '.p-toast') || ''), 'to-do: an unchanged Save changes writes nothing');
    await p.fill('[data-k="todo-text"]', 'Order 6 new tongs'); await L.settle(p, 150);
    ok(await disabled(p, '[data-p="todo-save"]') === false, 'to-do: a change turns Save changes on');
    // the job already open carries on with its changes
    await p.click('[data-p="todo-edit"][data-id="t2"]'); await L.settle(p, 200);
    ok(await box(p) === 'Order 6 new tongs', 'to-do: Change on the job already open keeps its changes, in one tap');
    quiet(p, 'to-do save');
    await p.context().close();
  });
  await safe('to-do cancel', async () => {
    p = await todoPage();
    await changed(p, 'Order 6 new tongs');
    await p.click('[data-p="todo-cancel"]'); await L.settle(p, 150);
    ok(await box(p) === 'Order 6 new tongs' && await txt(p, '[data-p="todo-cancel"]') === 'Tap again to discard', 'to-do: Cancel over a changed job asks first');
    await p.click('[data-p="todo-cancel"]'); await L.settle(p, 150);
    ok(await box(p) === '' && !(await p.$('[data-p="todo-cancel"]')), 'to-do: the second tap on Cancel discards');
    quiet(p, 'to-do cancel');
    await p.context().close();
  });
  await safe('to-do remove', async () => {
    p = await todoPage();
    // Remove on the job open with changes: Undo would bring back the saved job, not the words, so it asks first
    await changed(p, 'Order 8 new tongs');
    await p.click('[data-p="todo-del"][data-id="t2"]'); await L.settle(p, 200);
    ok(await box(p) === 'Order 8 new tongs' && !!(await p.$('[data-p="todo-del"][data-id="t2"]')) && await txt(p, '[data-p="todo-del"][data-id="t2"]') === 'Not saved. Tap again to remove', 'to-do: Remove on the job open with changes asks first, and says what the second tap does');
    await p.click('[data-p="todo-del"][data-id="t2"]'); await L.settle(p, 400);
    ok(!(await p.$('[data-p="todo-del"][data-id="t2"]')) && /Removed/.test(await txt(p, '.p-toast') || ''), 'to-do: the second tap removes it, with Undo');
    quiet(p, 'to-do remove');
    await p.context().close();
  });

  // ---------- the line menu after the list redrew ----------
  await safe('line menu', async () => {
    p = await L.open(b, '#/prep', { wait: 1500 });
    const ids = await S(p, () => [...document.querySelectorAll('.nb-row .nb-more')].map(x => x.getAttribute('data-id')).filter(x => x !== 'i1'));
    const tick = (id, patch) => S(p, ([k, x]) => { const d = JSON.parse(localStorage.getItem('fake.fs'))[k]; window.__fake.write(k, Object.assign(d, x)); }, [fsKey(['days', today, 'items', id]), patch]);
    const id = ids[0];
    await p.click('[data-lm="open"][data-id="' + id + '"]'); await L.settle(p, 150);
    await S(p, () => { window.__oldRow = document.querySelector('.nb-row'); });
    await tick('i1', { done: true, doneBy: 'Ann', doneById: 'ann', doneAt: L.NOW });
    const redrew = await wait(p, () => !document.body.contains(window.__oldRow), null, 5000);
    await p.click('#lm-sheet .lm-act'); await L.settle(p, 600);
    ok(redrew && ((await store(p))[fsKey(['days', today, 'items', id])] || {}).deleted === true && /Undo/.test(await txt(p, '.p-toast') || ''), 'line menu: Remove line removes the line after another phone\'s tick drew the list again, with Undo');
    // the line was removed on another phone meanwhile: it says so, and acts on nothing
    const id2 = ids[1];
    await p.click('[data-lm="open"][data-id="' + id2 + '"]'); await L.settle(p, 150);
    await S(p, i => { window.__oldRow = document.getElementById('nbr-' + i); }, id2);
    await tick(id2, { deleted: true, deletedBy: 'Ann' });
    await wait(p, () => !document.body.contains(window.__oldRow), null, 5000);
    await p.click('#lm-sheet .lm-act'); await L.settle(p, 300);
    ok(/That line has changed/.test(await S(p, () => [...document.querySelectorAll('.p-toast')].map(t => t.textContent).join(' '))), 'line menu: a line removed elsewhere says That line has changed. Try again.');
    // a sign-out takes the menu with the person
    await p.click('[data-lm="open"][data-id="' + ids[2] + '"]'); await L.settle(p, 150);
    await S(p, () => window.LK_PREP.signOut(true, true)); await L.settle(p, 300);
    ok(!(await p.$('#lm-sheet')), 'line menu: a sign-out closes it, so the next person never taps it');
    quiet(p, 'line menu');
    await p.context().close();
  });

  // ---------- Supplier order ----------
  const qty = 'input[data-sf="qty"][data-i="t-stock"]';
  await safe('supplier draft', async () => {
    p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), wait: 1800 });
    await wait(p, s => !!document.querySelector(s), qty, 15000);
    ok(await asks(p) === false, 'supplier: with nothing typed a reload does not ask');
    await p.fill(qty, '4 kg'); await L.settle(p, 200);
    ok(await asks(p) === true, 'supplier: a reload or closing the tab asks first over an order draft');
    await go(p, '#/orders');
    ok(await asks(p) === true, 'supplier: on another page the draft in this tab still asks first');
    await go(p, '#/suppliers/northside'); await wait(p, s => !!document.querySelector(s), qty, 15000);
    // a staff list saved on another phone (a new starter) is not a hand-over: the draft stays
    const c = (await store(p))[fsKey(['config', 'main'])];
    await S(p, ([k, v]) => window.__fake.write(k, v), [fsKey(['config', 'main']), Object.assign({}, c, { people: c.people.concat([P('zed', 'Zed', 'staff')]), staffIds: c.staffIds.concat(['zed']) })]);
    await L.settle(p, 600);
    ok(await p.$eval(qty, e => e.value) === '4 kg' && await S(p, () => window.LK_SUP.hasDraft()), 'supplier: a new starter saved on another phone keeps the order typed here');
    // Revocation hides the form and preserves the original work until explicit discard.
    await S(p, ([k, v]) => window.__fake.write(k, v), [fsKey(['config', 'main']), Object.assign({}, c, { headId: '', sousIds: ['sam'], staffIds: ['sam', 'ann'] })]);
    await L.settle(p, 600);
    ok(await S(p, () => !!LK_PREP.workLock() && !LK_PREP.privateAccess() && LK_SUP.hasDraft()) && await asks(p) === true && !(await p.$(qty)), 'supplier: revoked access hides the form and keeps the original draft behind the lock');
    await S(p, () => LK_PREP.signOut(true)); await L.settle(p, 300);
    ok(!(await S(p, () => LK_SUP.hasDraft())) && await asks(p) === false, 'supplier: explicit discard clears the revoked person\'s retained draft');
    quiet(p, 'supplier draft');
    await p.context().close();
  });
  await safe('supplier catalogue', async () => {
    p = await L.open(b, '#/suppliers/northside/manage', { who: 'bo', extra: F.fixture(), wait: 1800 });
    await wait(p, () => !!document.querySelector('[data-su="edit"][data-i="t-stock"]'), null, 15000);
    await p.click('[data-su="edit"][data-i="t-stock"]'); await wait(p, () => !!document.querySelector('[data-sf="par"]'));
    ok(await disabled(p, '[data-su="save-item"]') === true, 'supplier: Save changes is off on an item not changed');
    await force(p, '[data-su="save-item"]'); await L.settle(p, 800);
    ok(((await store(p))[F.key(['suppliers', 'northside'])] || {}).v === 1, 'supplier: an unchanged item saves no new catalogue revision');
    await p.fill('[data-sf="par"]', '11'); await L.settle(p, 100);
    ok(await disabled(p, '[data-su="save-item"]') === false, 'supplier: a new par turns Save changes on');
    await fits(p, 'supplier item editor at 390');
    quiet(p, 'supplier item');
    await p.context().close();
  });
  await safe('supplier settings', async () => {
    p = await L.open(b, '#/suppliers/northside/manage', { who: 'bo', extra: F.fixture(), wait: 1800 });
    await wait(p, () => !!document.querySelector('[data-su="supplier-settings"]'), null, 15000);
    await p.click('[data-su="supplier-settings"]'); await wait(p, () => !!document.querySelector('[data-sf="supplierName"]'));
    ok(await disabled(p, '[data-su="save-supplier"]') === true, 'supplier: Save supplier is off on settings not changed');
    await force(p, '[data-su="save-supplier"]'); await L.settle(p, 800);
    ok(((await store(p))[F.key(['suppliers', 'northside'])] || {}).v === 1, 'supplier: unchanged settings save no new revision');
    await p.fill('[data-sf="supplierName"]', 'Northside Test Foods Two'); await L.settle(p, 100);
    ok(await disabled(p, '[data-su="save-supplier"]') === false, 'supplier: a new name turns Save supplier on');
    quiet(p, 'supplier settings');
    await p.context().close();
  });

  // ---------- Delivery received ----------
  for (const w of [390, 768, 1280]) {
    await safe(w + ' delivery', async () => {
      p = await L.open(b, '#/deliveries', { width: w, height: w > 400 ? 900 : 844, wait: 1500 });
      await wait(p, () => !!document.querySelector('#dl-supplier'), null, 10000);
      await p.click('[data-dl="clear"]'); await L.settle(p, 150);
      ok(await txt(p, '[data-dl="clear"]') === 'Clear form', w + ' delivery: an untouched form clears in one tap');
      await p.fill('#dl-supplier', 'Valley Veg'); await p.fill('#dl-chilled', '4'); await L.settle(p, 150);
      await p.click('[data-dl="clear"]'); await L.settle(p, 150);
      ok(await p.inputValue('#dl-supplier') === 'Valley Veg' && await p.inputValue('#dl-chilled') === '4' && await txt(p, '[data-dl="clear"]') === 'Tap again to clear', w + ' delivery: Clear form over typed readings asks first');
      await fits(p, w + ' delivery Clear armed');
      await p.click('[data-dl="clear"]'); await L.settle(p, 150);
      ok(await p.inputValue('#dl-supplier') === '' && await p.inputValue('#dl-chilled') === '', w + ' delivery: the second tap clears');
      quiet(p, w + ' delivery');
      await p.context().close();
    });
  }

  // ---------- Manage functions ----------
  await safe('functions', async () => {
    const ex = Object.assign(cfg(), { [fsKey(['functions', 'test'])]: fnDoc('Test booking') });
    const fnWrites = q => q.evaluate(() => window.__fake.writes.filter(ops => ops.some(o => /\/functions\//.test(o.path))).length);
    p = await L.open(b, '#/functions/new', { who: 'ann', extra: ex, wait: 1500 });
    await wait(p, () => !!document.querySelector('#fe-name'), null, 10000);
    ok(await disabled(p, '[data-fe="save"]') === true, 'functions: Save draft is off on an untouched new form');
    await force(p, '[data-fe="save"]'); await L.settle(p, 800);
    ok(await fnWrites(p) === 0, 'functions: an untouched new form saves no empty draft');
    await p.fill('#fe-phone', '0400 000 000'); await L.settle(p, 150);
    ok(await disabled(p, '[data-fe="save"]') === false, 'functions: a phone number typed in a new form turns Save draft on');
    await p.context().close();
    p = await L.open(b, '#/functions/test', { who: 'ann', extra: ex, wait: 1500 });
    await wait(p, () => (document.querySelector('#fe-name') || {}).value === 'Test booking', null, 10000);
    ok(await disabled(p, '[data-fe="save"]') === true, 'functions: Save draft is off on a saved function not changed');
    await force(p, '[data-fe="save"]'); await L.settle(p, 800);
    ok(((await store(p))[fsKey(['functions', 'test'])] || {}).v === 1 && await fnWrites(p) === 0, 'functions: an unchanged save writes no new version');
    await p.fill('#fe-name', 'Test booking two'); await L.settle(p, 150);
    ok(await disabled(p, '[data-fe="save"]') === false, 'functions: a change turns Save draft on');
    await p.click('[data-fe="save"]');
    await wait(p, k => (window.__fake.dump()[k] || {}).v === 2, fsKey(['functions', 'test']), 8000);
    ok(((await store(p))[fsKey(['functions', 'test'])] || {}).name === 'Test booking two', 'functions: the change saves as version 2');
    await fits(p, 'function form at 390');
    quiet(p, 'functions');
    await p.context().close();
  });

  // ---------- 29 Oct 2026 review: the kept box, row arms, the book file, hand-overs, keyboards and clashes ----------
  const names = q => S(q, () => [...document.querySelectorAll('[data-f^="ing."][data-f$=".name"]')].map(e => e.value));
  // a recipe with changes kept on this device, opened again: the kept box shows
  const keptRecipe = async (name, o) => {
    const q = await L.open(b, '#/manage/r/burger', Object.assign({ who: 'ann', extra: cfg(), wait: 1400 }, o || {}));
    await editor(q);
    await q.fill('#mg-name', name); await L.settle(q, 700);
    await go(q, '#/manage'); await go(q, '#/manage/r/burger'); await editor(q);
    return q;
  };
  await safe('recipe kept buttons', async () => {
    p = await keptRecipe('Chicken Burger KEPT');
    const o0 = await names(p);
    ok(!!(await p.$('.mg-kept')), 'kept buttons: the kept box shows');
    // Down leaves the focus where it is: the kept changes come back, and the move waits for a tap of its own
    await p.click('[data-mg="ing-down"][data-i="0"]'); await L.settle(p, 200);
    ok(!(await p.$('.mg-kept')) && await p.inputValue('#mg-name') === 'Chicken Burger KEPT' && JSON.stringify(await names(p)) === JSON.stringify(o0), 'kept buttons: Down while the box shows brings the kept changes back and moves nothing on the saved copy');
    await p.click('[data-mg="ing-down"][data-i="0"]'); await L.settle(p, 700);
    const o1 = await names(p);
    ok(o1[0] === o0[1] && o1[1] === o0[0], 'kept buttons: the next Down moves the ingredient');
    await go(p, '#/r/burger');
    const dk = await draft(p, 'lk.mg.draft.burger');
    ok(/kept as a draft/.test(await toastNow(p)) && !!dk && dk.e.d.name === 'Chicken Burger KEPT' && dk.e.d.ingredients[0].name === o0[1], 'kept buttons: leaving keeps the kept name and the move (draft ' + (dk && dk.e.d.ingredients[0].name) + ')');
    // a recipe link box tapped while the box shows keeps the focus, so what is typed goes in it
    await go(p, '#/manage/r/burger'); await editor(p);
    await p.click('#mg-link-1'); await L.settle(p, 200);
    ok(!(await p.$('.mg-kept')) && await S(p, () => document.activeElement && document.activeElement.id) === 'mg-link-1', 'kept buttons: a tap in a recipe link box brings the kept changes back and keeps the focus there');
    await p.keyboard.type('Ranch'); await L.settle(p, 150);
    ok(/Ranch$/.test(await p.inputValue('#mg-link-1')), 'kept buttons: what is typed then goes in the link box');
    quiet(p, 'recipe kept buttons');
    await p.context().close();
  });
  await safe('recipe kept drag', async () => {
    p = await keptRecipe('Chicken Burger DRAG');
    const at = () => S(p, () => { const e = document.querySelector('.mg-pin[data-i="0"]'); return e ? e.style.left + ',' + e.style.top : ''; });
    await p.locator('.mg-pin[data-i="0"]').scrollIntoViewIfNeeded();
    const a0 = await at(), bx = await p.$eval('.mg-pin[data-i="0"]', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await p.mouse.move(bx.x, bx.y); await p.mouse.down(); await p.mouse.move(bx.x + 40, bx.y + 30, { steps: 5 }); await p.mouse.up(); await L.settle(p, 300);
    ok(!(await p.$('.mg-kept')) && await p.inputValue('#mg-name') === 'Chicken Burger DRAG' && await at() === a0, 'kept drag: a Pass label dragged while the box shows brings the kept changes back, and the saved copy\'s label does not move (' + a0 + ' then ' + await at() + ')');
    await go(p, '#/r/burger');
    const dk = await draft(p, 'lk.mg.draft.burger');
    ok(!!dk && dk.e.d.name === 'Chicken Burger DRAG', 'kept drag: leaving keeps the kept changes');
    quiet(p, 'recipe kept drag');
    await p.context().close();
  });
  await safe('recipe row arm', async () => {
    p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: cfg(), wait: 1400 });
    await editor(p);
    const o0 = await names(p);
    // Remove on row 3 asks; Up moves it; the ingredient now in row 3 never asked, so its Remove asks first
    await p.click('[data-mg="ing-del"][data-i="2"]'); await L.settle(p, 150);
    await p.click('[data-mg="ing-up"][data-i="2"]'); await L.settle(p, 150);
    ok(await txt(p, '[data-mg="ing-del"][data-i="2"]') === 'Remove', 'row arm: after Up, the row now in that place reads Remove, not Tap again (' + await txt(p, '[data-mg="ing-del"][data-i="2"]') + ')');
    await p.click('[data-mg="ing-del"][data-i="2"]'); await L.settle(p, 150);
    ok((await names(p)).length === o0.length && (await names(p))[2] === o0[1], 'row arm: one tap on its Remove keeps ' + o0[1] + ' and asks first');
    await p.click('[data-mg="ing-del"][data-i="2"]'); await L.settle(p, 150);
    ok((await names(p)).length === o0.length - 1 && (await names(p)).indexOf(o0[1]) < 0, 'row arm: the second tap removes it');
    quiet(p, 'recipe row arm');
    await p.context().close();
  });
  await safe('recipe book file', async () => {
    const r = { id: 'burger', kind: 'main', no: '1', forLine: 'Plate', name: 'Chicken Burger', yield: 'Per plate', ingredients: [{ q: '1', name: 'Burger bun' }, { q: '1', name: 'Crumbed chicken thigh' }], pins: [] };
    const ex = Object.assign(cfg(), { [fsKey(['recipes', 'burger'])]: { r, v: 2, upd: L.NOW - 9e6, src: 'book', base: 'stale-fingerprint', removed: false, by: 'ann' }, [fsKey(['book', 'index'])]: { r: { burger: 2 }, upd: L.NOW - 9e6 } });
    p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: ex, wait: 1400 });
    await wait(p, () => /The book file changed/.test(document.querySelector('#mg-root').textContent));
    ok(/The book file changed/.test(await txt(p, '#mg-root') || '') && /Save to keep this version/.test(await txt(p, '#mg-root') || '') && await disabled(p, '[data-mg="save"]') === false, 'book file changed: the note says Save keeps this version, and Save is on with nothing typed');
    await p.click('[data-mg="save"]');
    await wait(p, k => (window.__fake.dump()[k] || {}).v === 3, fsKey(['recipes', 'burger']), 8000);
    const rec = (await store(p))[fsKey(['recipes', 'burger'])] || {};
    await L.settle(p, 500);
    ok(rec.v === 3 && rec.base && rec.base !== 'stale-fingerprint' && !/The book file changed/.test(await txt(p, '#mg-root') || ''), 'book file changed: Save keeps this version against the new file, and the flag goes (v ' + rec.v + ')');
    ok(await disabled(p, '[data-mg="save"]') === true, 'book file changed: then Save is off again');
    quiet(p, 'recipe book file');
    await p.context().close();
  });
  await safe('recipe allergens match', async () => {
    p = await L.open(b, '#/manage/r/flank', { who: 'ann', extra: cfg(), wait: 1400 });
    await editor(p);
    const hand = () => S(p, () => document.querySelectorAll('[data-f^="hand."]').length);
    await L.choose(p, '[data-mg="hand"][data-v="1"]'); await L.settle(p, 150);
    const n1 = await hand();
    await L.choose(p, '[data-mg="hand"][data-v="0"]'); await L.settle(p, 150);
    ok(n1 > 0 && await hand() === 0, 'allergens: set by hand as the ingredients give them, Worked out from the ingredients goes back in one tap (' + n1 + ' then ' + await hand() + ')');
    quiet(p, 'recipe allergens match');
    await p.context().close();
  });

  // the drawing editor: a part's words typed, an arrow key while the kept box shows, and the bar after a typed label
  await safe('drawing kept part', async () => {
    p = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'ann', extra: cfg(), wait: 1500 });
    await canvas(p);
    await S(p, () => { window.LK_DRAW.addItem('rump'); });
    await p.click('[data-dw="text"]'); await L.settle(p, 200);
    await p.click('[data-dw="save"]');
    await wait(p, () => /\/manage\/draw\/burger-plate$/.test(location.hash) && !window.LK_DRAW.state().saving, null, 10000);
    await L.settle(p, 600);
    const els = () => S(p, () => window.LK_DRAW.state().d.els.map(e => e.t === 'text' ? 'text:' + e.s : e.t));
    const ti = (await els()).findIndex(x => /^text:/.test(x));
    const pickPart = async i => {
      if (!(await p.$('[data-dw="pick"][data-v="' + i + '"]'))) { await p.click('[data-dw="panel"][data-v="parts"]'); await L.settle(p, 150); }
      await p.click('[data-dw="pick"][data-v="' + i + '"]'); await L.settle(p, 150);
    };
    const changeIt = async () => { await p.click('[data-dw="panel"][data-v="edit"]'); await L.settle(p, 150); };
    // a saved drawing: words typed in a label turn Save on, and the bar says so, with only the drawing drawn again
    await pickPart(ti); await changeIt();
    await p.fill('[data-dwf="el.s"]', 'Label two'); await L.settle(p, 200);
    ok(await disabled(p, '[data-dw="save"]') === false && /Not saved yet/.test(await txt(p, '.dw-bar .mg-state') || ''), 'drawing: words typed in a label turn Save on, and the bar says Not saved yet (' + await txt(p, '.dw-bar .mg-state') + ')');
    await p.fill('[data-dwf="el.s"]', 'Label'); await L.settle(p, 200);
    ok(await disabled(p, '[data-dw="save"]') === true, 'drawing: the words back as they were, Save is off again');
    // a change kept on this device, and the drawing opened again: the kept box shows
    await S(p, () => { window.LK_DRAW.addItem('rump'); }); await L.settle(p, 700);
    await S(p, () => { document.querySelector('.wtop [data-act="back"]').click(); }); await editor(p);
    await go(p, '#/manage/draw/burger-plate');
    await wait(p, () => !!document.querySelector('[data-dw="kept-use"]'), null, 15000);
    const kept = await S(p, () => window.LK_DRAW.state().d.kept.els.length);
    await pickPart(ti); await changeIt();
    await p.click('[data-dwf="el.s"]'); await L.settle(p, 300);
    ok(!(await p.$('.mg-kept')) && (await els()).length === kept && !(await p.$('[data-dwf="el.s"]')), 'drawing: a tap in a picked part\'s words while the kept box shows brings the kept drawing back, and the box of the saved copy\'s part goes');
    // the label may sit in another place in the kept drawing (a piece added goes under the labels)
    const tk = (await els()).findIndex(x => /^text:/.test(x));
    await pickPart(tk); await changeIt();
    await p.fill('[data-dwf="el.s"]', 'Label for chips'); await L.settle(p, 700);
    const dk = await draft(p, 'lk.dw.draft.burger-plate');
    ok((await els())[tk] === 'text:Label for chips' && !!dk && dk.els[tk].s === 'Label for chips', 'drawing: the words typed then go on the kept drawing, and are kept on this device (' + JSON.stringify(await els()) + ')');
    // the kept box again: an arrow key on a part picked in Parts brings the kept drawing back and moves nothing
    await S(p, () => { document.querySelector('.wtop [data-act="back"]').click(); }); await editor(p);
    await go(p, '#/manage/draw/burger-plate');
    await wait(p, () => !!document.querySelector('[data-dw="kept-use"]'), null, 15000);
    const x0 = await S(p, () => window.LK_DRAW.state().d.kept.els[0].x);
    await pickPart(0);
    await S(p, () => document.querySelector('.dw-svg').focus());
    await p.keyboard.press('ArrowRight'); await L.settle(p, 300);
    ok(!(await p.$('.mg-kept')) && await S(p, () => window.LK_DRAW.state().d.els[0].x) === x0 && await S(p, () => window.LK_DRAW.state().sel.length) === 0, 'drawing: an arrow key while the kept box shows brings the kept drawing back, and moves nothing');
    const reopen = async () => {
      await S(p, () => { document.querySelector('.wtop [data-act="back"]').click(); }); await editor(p);
      await go(p, '#/manage/draw/burger-plate');
      await wait(p, () => !!document.querySelector('[data-dw="kept-use"]'), null, 15000);
    };
    // Delete on a part picked in Parts: the kept drawing comes back as one undo step, and nothing goes
    await reopen();
    const n0 = await S(p, () => window.LK_DRAW.state().d.kept.els.length);
    await pickPart(0);
    await S(p, () => document.querySelector('.dw-svg').focus());
    await p.keyboard.press('Delete'); await L.settle(p, 300);
    ok(!(await p.$('.mg-kept')) && (await els()).length === n0 && await S(p, () => window.LK_DRAW.state().undo.length) === 1, 'drawing: Delete while the kept box shows brings the kept drawing back as one undo step, and takes nothing away');
    // words that reach a picked part's box with no tap first (a keyboard's suggestion): the same, and the box goes
    await reopen();
    await pickPart(ti); await changeIt();
    await S(p, () => { const t = document.querySelector('[data-dwf="el.s"]'); t.value = 'Ghost'; t.dispatchEvent(new Event('input', { bubbles: true })); });
    await L.settle(p, 300);
    ok(!(await p.$('.mg-kept')) && !(await p.$('[data-dwf="el.s"]')) && (await els()).indexOf('text:Ghost') < 0, 'drawing: words put in a picked part\'s box with no tap first bring the kept drawing back, and go on no part (' + JSON.stringify(await els()) + ')');
    quiet(p, 'drawing kept part');
    await p.context().close();
  });

  // a hand-over with an editor open: what was changed goes with the person, and the next one finds no kept box
  await safe('hand-over editors', async () => {
    p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: cfg(), settings: { shared: true }, wait: 1400 });
    await editor(p);
    await p.fill('#mg-name', 'Chicken Burger SECRET'); await L.settle(p, 700);
    await p.click('.wtop-who'); await L.settle(p, 150);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 200);
    await p.click('.wm [data-who="out"]'); await L.settle(p, 900);
    const toasts = await S(p, () => [...document.querySelectorAll('.p-toast')].map(t => t.textContent).join(' | '));
    ok(!(await S(p, () => window.LK_PREP.state.who)) && !(await draft(p, 'lk.mg.draft.burger')) && !/kept as a draft/.test(toasts), 'hand-over: Sign out with a recipe changed leaves no draft on the device (' + toasts + ')');
    await go(p, '#/prep');
    await L.waitFor(p, () => !!document.querySelector('.p-name[data-id="sam"]'), null, 8000);
    await p.click('.p-name[data-id="sam"]'); await L.settle(p, 300);
    await p.fill('#pf1', '1111'); await L.settle(p, 1500);
    await go(p, '#/manage/r/burger'); await editor(p);
    ok(await S(p, () => window.LK_PREP.state.who) === 'sam' && !(await p.$('.mg-kept')) && await p.inputValue('#mg-name') === 'Chicken Burger', 'hand-over: the next sous chef opens Burger with no kept changes from the last person');
    quiet(p, 'hand-over recipe');
    await p.context().close();
    // the idle lock with a drawing changed
    p = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'ann', extra: cfg(), settings: { shared: true }, wait: 1500 });
    await canvas(p);
    await S(p, () => { window.LK_DRAW.addItem('rump'); }); await L.settle(p, 700);
    ok(!!(await draft(p, 'lk.dw.draft.new-burger-plate')), 'hand-over: the drawing is kept on the device while Ann works');
    await S(p, () => window.LK_PREP.signOut(true, true)); await L.settle(p, 900);
    ok(!(await draft(p, 'lk.dw.draft.new-burger-plate')) && !/kept as a draft/.test(await toastNow(p)), 'hand-over: the idle lock with a drawing changed leaves no drawing draft');
    quiet(p, 'hand-over drawing');
    await p.context().close();
    // the idle lock with a function's start time typed and not taken yet (it is taken when the box is left)
    p = await L.open(b, '#/functions/new', { who: 'ann', extra: cfg(), settings: { shared: true }, wait: 1500 });
    await wait(p, () => !!document.querySelector('#fe-name'), null, 10000);
    await p.fill('#fe-name', 'Smith 50th'); await L.settle(p, 200);
    await S(p, () => { const t = document.querySelector('[data-ff="startT"]'); t.value = '18:30'; t.dispatchEvent(new Event('input', { bubbles: true })); });
    await S(p, () => window.LK_PREP.signOut(true, true)); await L.settle(p, 900);
    ok(!(await draft(p, 'lk.fe.draft.new')), 'hand-over: the idle lock with a start time half typed leaves no function draft (the customer\'s booking)');
    quiet(p, 'hand-over function');
    await p.context().close();
  });

  // Delivery received with a keyboard: the first Enter on Clear form keeps the focus on it, so the second clears
  await safe('delivery keyboard', async () => {
    p = await L.open(b, '#/deliveries', { wait: 1500 });
    await wait(p, () => !!document.querySelector('#dl-supplier'), null, 10000);
    await p.fill('#dl-supplier', 'Valley Veg'); await p.fill('#dl-chilled', '4'); await L.settle(p, 150);
    await p.focus('[data-dl="clear"]'); await p.keyboard.press('Enter'); await L.settle(p, 150);
    ok(await S(p, () => (document.activeElement || {}).getAttribute && document.activeElement.getAttribute('data-dl')) === 'clear' && await txt(p, '[data-dl="clear"]') === 'Tap again to clear', 'delivery keyboard: the first Enter keeps the focus on Clear form, which says Tap again to clear');
    await p.keyboard.press('Enter'); await L.settle(p, 150);
    ok(await p.inputValue('#dl-supplier') === '', 'delivery keyboard: the second Enter clears the form');
    quiet(p, 'delivery keyboard');
    await p.context().close();
  });

  // Supplier order: Manage catalogue opened from the order page, then the head chef moved to someone else
  await safe('supplier rights', async () => {
    p = await L.open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), wait: 1800 });
    await wait(p, s => !!document.querySelector(s), qty, 15000);
    await p.click('[data-su="manage"]'); await wait(p, () => !!document.querySelector('[data-su="edit"][data-i="t-stock"]'), null, 10000);
    await p.click('[data-su="edit"][data-i="t-stock"]'); await wait(p, () => !!document.querySelector('[data-sf="par"]'));
    await p.fill('[data-sf="par"]', '11'); await L.settle(p, 150);
    ok(await S(p, () => window.LK_SUP.dirty()), 'supplier rights: a changed par counts as not saved');
    const c = (await store(p))[F.key(['config', 'main'])];
    await S(p, ([k, v]) => window.__fake.write(k, v), [F.key(['config', 'main']), Object.assign({}, c, { headId: 'sam' })]);
    await L.settle(p, 700);
    ok(!(await S(p, () => window.LK_SUP.dirty())) && !(await p.$('[data-sf="par"]')) && await asks(p) === false, 'supplier rights: Bo may still read but not change the catalogue: the open item form goes, and a reload does not ask');
    await S(p, ([k, v]) => window.__fake.write(k, v), [F.key(['config', 'main']), c]);
    await L.settle(p, 700);
    ok(!(await p.$('[data-sf="par"]')) && !(await S(p, () => window.LK_SUP.dirty())), 'supplier rights: Bo made head chef again does not get the old form back');
    quiet(p, 'supplier rights');
    await p.context().close();
  });

  // Manage functions: Load theirs over changes asks first, a split by hand asks before it goes even, a time half typed counts
  await safe('functions clash', async () => {
    const ex = Object.assign(cfg(), { [fsKey(['functions', 'test'])]: fnDoc('Test booking') });
    p = await L.open(b, '#/functions/test', { who: 'ann', extra: ex, wait: 1500 });
    await wait(p, () => (document.querySelector('#fe-name') || {}).value === 'Test booking', null, 10000);
    await S(p, () => { const t = document.querySelector('[data-ff="startT"]'); t.value = '18:30'; t.dispatchEvent(new Event('input', { bubbles: true })); });
    ok(await disabled(p, '[data-fe="save"]') === false, 'functions: a start time typed and not taken yet turns Save draft on');
    await S(p, () => { const t = document.querySelector('[data-ff="startT"]'); t.value = '18:00'; t.dispatchEvent(new Event('change', { bubbles: true })); }); await L.settle(p, 300);
    await p.fill('#fe-name', 'Smith wedding'); await L.settle(p, 200);
    await S(p, ([k, v]) => window.__fake.write(k, v), [fsKey(['functions', 'test']), Object.assign(fnDoc('Test booking (theirs)'), { v: 2, by: 'sam', upd: L.NOW - 60000 })]);
    await p.click('[data-fe="save"]');
    await wait(p, () => !!document.querySelector('[data-fe="theirs"]'), null, 10000);
    await p.click('[data-fe="theirs"]'); await L.settle(p, 300);
    ok(await p.inputValue('#fe-name') === 'Smith wedding' && await txt(p, '[data-fe="theirs"]') === 'Tap again: your changes go' && !!(await draft(p, 'lk.fe.draft.test')), 'functions: the first tap on Load theirs keeps the changes here and asks again');
    await fits(p, 'functions Load theirs armed at 390');
    await p.click('[data-fe="theirs"]');
    await wait(p, () => (document.querySelector('#fe-name') || {}).value === 'Test booking (theirs)', null, 8000);
    ok(await p.inputValue('#fe-name') === 'Test booking (theirs)', 'functions: the second tap loads theirs');
    quiet(p, 'functions clash');
    await p.context().close();
  });
  await safe('functions split', async () => {
    const day0 = today, f = fnDoc('Staggered');
    Object.assign(f, { mode: 'stag', rounds: [{ at: M.kat(day0, 1110), note: '' }, { at: M.kat(day0, 1140), note: '' }, { at: M.kat(day0, 1170), note: '' }], lines: [Object.assign({}, f.lines[0], { qty: 6, u: M.toU([1, 1, 4]) })] });
    p = await L.open(b, '#/functions/stag', { who: 'ann', extra: Object.assign(cfg(), { [fsKey(['functions', 'stag'])]: f }), wait: 1500 });
    await wait(p, () => !!document.querySelector('[data-ff="a0_2"]'), null, 10000);
    const grid = () => S(p, () => [0, 1, 2].map(r => document.querySelector('[data-ff="a0_' + r + '"]').value).join(','));
    await p.click('[data-fe="even"]'); await L.settle(p, 200);
    ok(await grid() === '1,1,4' && await txt(p, '[data-fe="even"]') === 'Tap again to split evenly', 'functions: a split by hand keeps its numbers on the first tap of Split evenly again (' + await grid() + ')');
    await p.click('[data-fe="even"]'); await L.settle(p, 200);
    ok(await grid() === '2,2,2', 'functions: the second tap splits evenly (' + await grid() + ')');
    quiet(p, 'functions split');
    await p.context().close();
  });

  // Update now's explicit discard decision covers the independent editors without another browser question.
  const UPD = [
    ['Delivery received', '#/deliveries', { wait: 1500 }, '#dl-chilled', q => q.fill('#dl-chilled', '4')],
    ['Supplier order', '#/suppliers/northside', { who: 'bo', extra: F.fixture(), wait: 1800 }, qty, q => q.fill(qty, '4 kg')],
    ['Manage recipes', '#/manage/r/burger', { who: 'ann', extra: cfg(), wait: 1400 }, '#mg-name', q => q.fill('#mg-name', 'Chicken Burger UPD')],
    ['Manage functions', '#/functions/new', { who: 'ann', extra: cfg(), wait: 1500 }, '#fe-name', q => q.fill('#fe-name', 'Jones wedding')],
    ['the drawing editor', '#/manage/draw/new/burger/plate', { who: 'ann', extra: cfg(), wait: 1500 }, '.dw-svg', q => S(q, () => { window.LK_DRAW.addItem('rump'); })]
  ];
  for (const [label, hash, o, sel, type] of UPD) {
    await safe('update now ' + label, async () => {
      p = await L.open(b, hash, o);
      let asked = 0;
      p.on('dialog', d => { asked++; d.dismiss().catch(() => {}); });
      await wait(p, s => !!document.querySelector(s), sel, 15000);
      await type(p); await L.settle(p, 500);
      ok(await asks(p), label + ': a change here makes a reload ask first');
      await p.clock.fastForward(10000);
      await S(p, () => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
      await wait(p, () => !!document.querySelector('.upd-bar'), null, 3000);
      await S(p, () => { window.__mark = 1; });
      await p.click('.upd-bar button'); await L.settle(p, 1500);
      ok(await p.locator('#lk-update-confirm[open]').count() === 1, label + ': Update now offers Keep working or Discard and update');
      await p.click('#lk-update-confirm [data-update="discard"]');
      await L.waitFor(p, () => window.__mark !== 1, null, 15000).catch(() => {});
      const gone = await S(p, () => window.__mark !== 1).catch(() => true);
      ok(gone && asked === 0, label + ': confirmed discard updates, with no Reload site? box (' + asked + ' asked)');
      await p.context().close();
    });
  }

  // ---------- the armed words fit at every width ----------
  for (const w of [768, 1280]) {
    await safe(w + ' widths', async () => {
      p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: cfg(), width: w, height: 900, wait: 1400 });
      await editor(p);
      await p.click('[data-mg="ing-del"][data-i="0"]'); await L.settle(p, 150);
      await L.choose(p, '[data-mg="hand"][data-v="0"]'); await L.settle(p, 150);
      ok(await txt(p, '[data-mg="hand"][data-v="0"]') === 'Tap again: hand-set allergens go', w + ' recipe form: the allergen chip asks again');
      await fits(p, w + ' recipe form armed');
      await p.context().close();
      p = await L.open(b, '#/todo', { who: 'sam', extra: jobs(), width: w, height: 900, wait: 1500 });
      await wait(p, () => document.querySelectorAll('[data-lv="todo"] .todo-row').length === 2);
      await p.fill('[data-k="todo-text"]', 'Half typed job'); await p.click('[data-p="todo-edit"][data-id="t2"]'); await L.settle(p, 150);
      ok(await txt(p, '[data-p="todo-edit"][data-id="t2"]') === 'Not saved. Tap again', w + ' to-do: Change asks again');
      await fits(p, w + ' to-do armed');
      await p.context().close();
      p = await keptDrawingAt(w);
      await p.click('[data-dw="kept-drop"]'); await L.settle(p, 150);
      ok(await txt(p, '[data-dw="kept-drop"]') === 'Tap again to throw them away', w + ' drawing: Throw them away asks again');
      await fits(p, w + ' drawing armed');
      quiet(p, w + ' widths');
      await p.context().close();
    });
  }
  async function keptDrawingAt(w) {
    const q = await L.open(b, '#/manage/draw/new/burger/plate', { who: 'ann', extra: cfg(), width: w, height: 900, wait: 1500 });
    await canvas(q);
    await S(q, () => { window.LK_DRAW.addItem('rump'); document.querySelector('.wtop [data-act="back"]').click(); });
    await editor(q);
    await go(q, '#/manage/draw/new/burger/plate');
    await wait(q, () => !!document.querySelector('[data-dw="kept-drop"]'), null, 15000);
    return q;
  }

  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
