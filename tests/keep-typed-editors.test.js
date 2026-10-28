// Nothing typed in an editor goes without asking (28 Oct 2026, keep-typed-work). The recipe form and the drawing
// editor: the first change while "Changes not saved yet" shows brings the kept changes back, so what is typed or drawn
// then is kept too; Remove on an ingredient or a Pass label with something in it, Open this version over changes, Open
// theirs after a clash, Throw them away on a kept drawing and back to worked-out allergens over hand-set ones ask a
// second tap; Save is off and saves nothing on an untouched recipe or drawing. Chef to-do: Change on another job, Cancel
// and Remove over changes ask first, the job already open carries on, and an unchanged Save changes saves nothing. The
// line menu's Remove line finds its line after the list redrew, and a sign-out closes the menu. Supplier order: a reload
// asks over a draft, a staff list saved on another phone keeps it, and an unchanged item or supplier saves nothing.
// Delivery received: Clear form over typed readings asks first. Manage functions: an untouched form saves nothing.
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
    await p.click('[data-mg="hand"][data-v="0"]'); await L.settle(p, 150);
    ok(had > 0 && await notes() === had && await txt(p, '[data-mg="hand"][data-v="0"]') === 'Tap again: hand-set allergens go', 'allergens: the first tap on Worked out from the ingredients keeps the hand-set ones and their notes');
    await fits(p, 'allergens armed at 390');
    await p.click('[data-mg="hand"][data-v="0"]'); await L.settle(p, 150);
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
    ok(await p.inputValue('#mg-yield') === 'MINE yield' && await txt(p, '[data-mg="theirs"]') === 'Tap again: yours here go', 'another device: the first tap on Open theirs keeps what was typed here');
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
    ok(!!(await p.$('[data-dw="theirs"]')) && await S(p, () => window.LK_DRAW.dirty() && window.LK_DRAW.state().d.els.length === 2) && await txt(p, '[data-dw="theirs"]') === 'Tap again: yours here go', 'drawing: the first tap on Open theirs keeps the part added here');
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
    ok(await box(p) === 'Order 8 new tongs' && !!(await p.$('[data-p="todo-del"][data-id="t2"]')) && await txt(p, '[data-p="todo-del"][data-id="t2"]') === 'Not saved. Tap again', 'to-do: Remove on the job open with changes asks first');
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
    // a person who may not open supplier orders any more loses it (privacy)
    await S(p, ([k, v]) => window.__fake.write(k, v), [fsKey(['config', 'main']), Object.assign({}, c, { headId: '', sousIds: ['sam'], staffIds: ['sam', 'ann'] })]);
    await L.settle(p, 600);
    ok(!(await S(p, () => window.LK_SUP.hasDraft())) && await asks(p) === false, 'supplier: a person who may not open it any more loses the draft');
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

  // ---------- the armed words fit at every width ----------
  for (const w of [768, 1280]) {
    await safe(w + ' widths', async () => {
      p = await L.open(b, '#/manage/r/burger', { who: 'ann', extra: cfg(), width: w, height: 900, wait: 1400 });
      await editor(p);
      await p.click('[data-mg="ing-del"][data-i="0"]'); await L.settle(p, 150);
      await p.click('[data-mg="hand"][data-v="0"]'); await L.settle(p, 150);
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
