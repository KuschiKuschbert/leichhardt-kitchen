// After the tap (5 Nov 2026, docs/action-feedback.md, the mix of A and C chosen by the head chef): a Save says Saving...
// on its button, then Saved with a tick for 1.2 s once the server answered, then is off; the thing that changed wears a
// small green stamp, "Saved 14:02", until the page is left or it changes again; a switched-off outlined button looks
// off, so Undo unsaved changes no longer looks live; a failed save says Try again. Checked on the order cut-offs (the
// head chef's case) and the recipe editor, with the stand-in holding, then failing, writes. Suppliers and people are
// synthetic.
const L = require('./lib');
const { R, ok } = L.results(), { txt } = L;
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const CFG = fsKey(['config', 'main']);
const P = (id, name, role) => ({ id, name, role, add: true, tick: true, del: role !== 'staff', active: true });
const people = [P('sam', 'Sam', 'sous'), P('ann', 'Ann', 'head'), P('bo', 'Bo', 'staff')];
const cfg = cuts => ({ [CFG]: Object.assign({ people, headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], staffIds: ['sam', 'ann', 'bo'], showBadges: true, pinOpen: { sam: 0, ann: 0, bo: 0 } }, cuts ? { cutoffs: cuts } : {}) });
const CUTS = [{ id: 'coast', name: 'Coast Seafood', dd: [1], at: 840, pre: 1, lead: 240 }, { id: 'pfd', name: 'PFD', dd: [1, 2, 3, 4, 5, 6], at: 840, pre: 1, lead: 240 }];
const STAMP = /^Saved \d\d:\d\d$/;
// the line under the cut-off buttons after a save: its stamp, its words, colour and size
const doneLine = p => p.evaluate(() => {
  const e = document.querySelector('.a-cut .cut-msg .cut-done'); if (!e) return null;
  const cs = getComputedStyle(e);
  return { stamp: (e.querySelector('.lk-stamp') || {}).textContent || '', text: e.textContent.trim(), color: cs.color, size: parseFloat(cs.fontSize) };
});
const now = p => p.evaluate(() => Date.now());
// stop the page's clock a moment ahead, so the 1.2 s of Saved can be looked at before it runs on
const pause = async p => { for (let i = 1; ; i++) { try { return await p.clock.pauseAt(await now(p) + 300 * i); } catch (e) { if (i > 4) throw e; } } };
const wait = (p, fn, arg, ms) => L.waitFor(p, fn, arg, ms).catch(() => false);
const btn = (p, sel) => p.evaluate(s => {
  const b = document.querySelector(s); if (!b) return null;
  return { text: b.textContent.trim(), disabled: b.disabled, busy: b.getAttribute('aria-busy'), done: !!b.querySelector('.ink-icon[data-state="done"]'), sv: b.getAttribute('data-sv'), color: getComputedStyle(b).color, border: getComputedStyle(b).borderTopColor };
}, sel);
// the stamps on supplier cards (the line under the buttons has its own, read by doneLine)
const stamps = (p, scope) => p.evaluate(s => [...document.querySelectorAll(s + ' .cut-ed .lk-stamp')].map(e => {
  const card = e.closest('.cut-ed'), name = card && card.querySelector('input[data-k^="cut-n"]');
  return (name ? name.value + ': ' : '') + e.textContent.trim();
}), scope);

(async () => {
  const b = await L.start();
  let p;
  try {
    /* ---------- the order cut-offs: the head chef's Google device ---------- */
    p = await L.open(b, '#/admin', { admin: true, who: '', extra: cfg(CUTS), wait: 2000 });
    await L.adminTab(p, 'cutoffs');
    await wait(p, () => !!document.querySelector('[data-k="cut-t0"]'), null, 10000);
    // a live outlined button and a switched-off one do not look the same
    const undoOff = await btn(p, '[data-p="cut-undo"]'), addOn = await btn(p, '[data-p="cut-add"]');
    ok(undoOff && addOn && undoOff.disabled && !addOn.disabled && undoOff.color !== addOn.color && undoOff.border !== addOn.border, 'off looks off: Undo unsaved changes, switched off, is not drawn like the live Add a supplier (' + JSON.stringify([undoOff, addOn]) + ')');
    await p.fill('[data-k="cut-t0"]', '15:00'); await L.settle(p, 200);
    let s = await btn(p, '[data-p="cut-save"]');
    ok(s && !s.disabled && s.text === 'Save cut-offs', 'cut-offs: a change turns Save cut-offs on (' + JSON.stringify(s) + ')');
    const undoOn = await btn(p, '[data-p="cut-undo"]');
    ok(undoOn && !undoOn.disabled && undoOn.color === addOn.color, 'cut-offs: Undo unsaved changes is on and looks on');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await p.click('[data-p="cut-save"]'); await L.settle(p, 200);
    s = await btn(p, '[data-p="cut-save"]');
    ok(s && /^Saving\.\.\.$/.test(s.text) && s.disabled && s.busy === 'true', 'cut-offs: the button says Saving..., off and busy (' + JSON.stringify(s) + ')');
    ok(await p.evaluate(() => (document.querySelector('.a-cut').innerText.match(/Saving/g) || []).length) === 1, 'cut-offs: Saving... shows once, on the button, not again in a grey line under it');
    await pause(p);
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await wait(p, () => !window.LK_PREP.state.cutBusy);
    s = await btn(p, '[data-p="cut-save"]');
    ok(s && s.text === 'Saved' && s.done && s.disabled && s.sv === 'done', 'cut-offs: once the server answers, the button says Saved with a tick (' + JSON.stringify(s) + ')');
    let st = await stamps(p, '.a-cut');
    ok(st.length === 1 && /^Coast Seafood: /.test(st[0]) && STAMP.test(st[0].replace(/^Coast Seafood: /, '')), 'cut-offs: the supplier that changed wears the stamp, the other does not (' + st.join(' | ') + ')');
    let line = await doneLine(p);
    ok(line && STAMP.test(line.stamp) && /The sous chefs see the new cut-offs now\.$/.test(line.text) && line.color === 'rgb(28, 29, 31)' && line.size >= 16, 'cut-offs: under the buttons, the stamp and what it means, full size in ink, not the small grey line (' + JSON.stringify(line) + ')');
    const undoAfter = await btn(p, '[data-p="cut-undo"]');
    ok(undoAfter && undoAfter.disabled && undoAfter.color === undoOff.color, 'cut-offs: Undo unsaved changes is off and looks off beside Saved');
    await p.clock.runFor(1300); await L.settle(p, 100);
    s = await btn(p, '[data-p="cut-save"]');
    ok(s && s.text === 'Save cut-offs' && s.disabled && !s.sv, 'cut-offs: after 1.2 s the button is Save cut-offs again, off (' + JSON.stringify(s) + ')');
    ok((await stamps(p, '.a-cut')).length === 1 && STAMP.test(((await doneLine(p)) || {}).stamp || ''), 'cut-offs: the stamps stay by the buttons and on the card after Saved has gone');
    await p.clock.resume();
    ok((await p.evaluate(k => window.__fake.dump()[k].cutoffs.map(c => c.at).join(), CFG)) === '900,840', 'cut-offs: one save, Coast at 15:00');
    // the supplier changes again: its stamp goes and Save comes on, without a redraw of the box being typed in
    await p.fill('[data-k="cut-t0"]', '15:30'); await L.settle(p, 200);
    ok(!(await stamps(p, '.a-cut')).length && !(await doneLine(p)) && !(await btn(p, '[data-p="cut-save"]')).disabled, 'cut-offs: typing again takes the stamps off and turns Save on');
    ok(await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-k') === 'cut-t0'), 'cut-offs: the cursor stays in the box');
    // a failed save: Try again, and a red line that stays
    await p.evaluate(() => { window.__fake.mode = 'fail'; });
    await p.click('[data-p="cut-save"]');
    await wait(p, () => !window.LK_PREP.state.cutBusy);
    await L.settle(p, 150);
    s = await btn(p, '[data-p="cut-save"]');
    ok(s && s.text === 'Try again' && !s.disabled && s.sv === 'fail', 'cut-offs failed: the button says Try again (' + JSON.stringify(s) + ')');
    ok(await p.evaluate(() => { const e = document.querySelector('.a-cut .cut-msg .p-err'); return !!e && e.getAttribute('role') === 'alert' && /Could not save/.test(e.textContent); }), 'cut-offs failed: a red line says why');
    ok(!(await stamps(p, '.a-cut')).length, 'cut-offs failed: no stamp');
    await p.evaluate(() => { window.__fake.mode = 'ok'; });
    await p.click('[data-p="cut-save"]');
    await wait(p, () => !window.LK_PREP.state.cutBusy);
    await L.settle(p, 150);
    ok((await stamps(p, '.a-cut')).length === 1 && !(await p.$('.a-cut .cut-msg .p-err')), 'cut-offs: Try again saves, the stamp is back and the red line goes');
    // leaving the page takes the stamp with it
    await L.adminTab(p, 'kitchen-home'); await L.adminTab(p, 'cutoffs'); await L.settle(p, 200);
    ok(!(await stamps(p, '.a-cut')).length, 'cut-offs: back on the page later, the stamp has gone');
    ok(!(await L.overflow(p)), 'cut-offs: fits a phone');
    ok(p.errors.length === 0, 'cut-offs: no page errors ' + p.errors.join(' | '));
    await p.context().close();

    /* ---------- the recipe editor: Sam, a sous chef ---------- */
    p = await L.open(b, '#/manage/r/aioli', { who: 'sam', extra: cfg(), wait: 1400 });
    await wait(p, () => !!document.getElementById('mg-name'), null, 8000);
    await L.reveal(p, '#mg-yield'); await p.fill('#mg-yield', '800 ml batch'); await L.settle(p, 200);
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await p.click('[data-mg="save"]'); await L.settle(p, 200);
    s = await btn(p, '[data-mg="save"]');
    ok(s && /^Saving\.\.\.$/.test(s.text) && s.disabled && s.busy === 'true', 'recipe: Saving... on the button (' + JSON.stringify(s) + ')');
    await pause(p);
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await wait(p, () => { const b = document.querySelector('[data-mg="save"]'); return b && b.getAttribute('aria-busy') !== 'true'; });
    s = await btn(p, '[data-mg="save"]');
    ok(s && s.text === 'Saved' && s.done && s.disabled && s.sv === 'done', 'recipe: once the server answers, Save says Saved with a tick (' + JSON.stringify(s) + ')');
    const bar = await p.evaluate(() => { const e = document.querySelector('.mg-state'); return { stamp: (e.querySelector('.lk-stamp') || {}).textContent || '', text: e.textContent.trim() }; });
    ok(STAMP.test(bar.stamp) && /Version 1\.$/.test(bar.text) && !/Saved\. Version/.test(bar.text), 'recipe: the bar wears the stamp and says the version (' + JSON.stringify(bar) + ')');
    await p.clock.runFor(1300); await L.settle(p, 100);
    s = await btn(p, '[data-mg="save"]');
    ok(s && s.text === 'Save' && s.disabled && !s.sv, 'recipe: after 1.2 s Save is off again (' + JSON.stringify(s) + ')');
    ok(STAMP.test(await txt(p, '.mg-state .lk-stamp') || ''), 'recipe: the stamp stays');
    await p.clock.resume();
    await L.chapter(p, 'card');
    ok(!/Save to make the change/.test(await txt(p, '.mg-ch[data-ch="card"]') || ''), 'recipe: with nothing to save, "Save to make the change" is not shown');
    // an edit takes the stamp away and turns Save on
    await L.chapter(p, 'card'); await L.reveal(p, '#mg-yield'); await p.fill('#mg-yield', '900 ml batch'); await L.settle(p, 200);
    ok(!(await p.$('.mg-state .lk-stamp')) && /Not saved yet/.test(await txt(p, '.mg-state') || '') && !(await btn(p, '[data-mg="save"]')).disabled, 'recipe: typing again takes the stamp off and turns Save on');
    await p.evaluate(() => { window.__fake.mode = 'fail'; });
    await p.click('[data-mg="save"]');
    await wait(p, () => { const b = document.querySelector('[data-mg="save"]'); return b && b.getAttribute('aria-busy') !== 'true' && /Try again|Save/.test(b.textContent); });
    await L.settle(p, 200);
    s = await btn(p, '[data-mg="save"]');
    ok(s && s.text === 'Try again' && !s.disabled, 'recipe failed: Save says Try again (' + JSON.stringify(s) + ')');
    ok(p.errors.length === 0, 'recipe: no page errors ' + p.errors.join(' | '));
    await p.context().close();

    /* ---------- step 2a: the slip names the line, Undo says Undone, new lines wear "New 14:02" ---------- */
    const slip = p => p.evaluate(() => { const e = document.querySelector('.p-toast[data-toast="new"] .p-toast-msg') || document.querySelector('.p-toast .p-toast-msg'); return e ? e.textContent.trim() : ''; });
    const newStamp = (p, sel) => p.evaluate(s => { const r = document.querySelector(s); const e = r && r.querySelector('.lk-stamp.is-new'); return e ? e.textContent.trim() : ''; }, sel);
    const rowOf = (p, text) => p.evaluate(t => { const r = [...document.querySelectorAll('.nb-row')].find(x => (x.querySelector('.nb-t') || {}).textContent && x.querySelector('.nb-t').textContent.indexOf(t) === 0); return r ? (r.id ? '#' + r.id : '[data-ln="' + r.getAttribute('data-ln') + '"]') : ''; }, text);
    p = await L.open(b, '#/prep', { wait: 1500 });
    await L.pLog(p);
    await p.fill('#p-section', 'Sauce'); await p.fill('#p-text', 'Slice tomatoes'); await p.press('#p-text', 'Enter'); await L.settle(p, 300);
    ok(/^Added Slice tomatoes to Sauce$/.test(await slip(p)), 'prep: the slip names the line and its section (' + await slip(p) + ')');
    const long = 'Brunoise of shallots, chives and tarragon for the bearnaise tonight';
    await p.fill('#p-section', 'Sauce'); await p.fill('#p-text', long); await p.press('#p-text', 'Enter'); await L.settle(p, 300);
    let sl = await slip(p);
    ok(/\u2026 to Sauce$/.test(sl) && sl.length < 60, 'prep: a long name is cut, and "to Sauce" still shows (' + sl + ')');
    await L.tap(p, '.p-sheet .sheet-x[data-p="p-log-close"]'); await L.settle(p, 300);
    let sel = await rowOf(p, 'Slice tomatoes');
    ok(sel && STAMP.test((await newStamp(p, sel)).replace(/^New/, 'Saved')), 'prep: the new line wears "New HH:MM" on the list (' + await newStamp(p, sel) + ')');
    ok(!(await newStamp(p, '#nbr-i1')), 'prep: a line added earlier wears no stamp');
    // Undo says what it undid
    await p.click('.p-toast[data-toast="new"] [data-p="toast-act"]'); await L.settle(p, 300);
    ok(/^Undone: added Brunoise/.test(await slip(p)), 'prep: Undo says Undone and names what it undid (' + await slip(p) + ')');
    // tick, then untick by tapping again: both name the line
    const tk = await p.evaluate(() => { const b = [...document.querySelectorAll('.nb-row:not(.is-done) .nb-box[data-p="tick"]:not([disabled])')][0]; const t = b.closest('.nb-row').querySelector('.nb-t').firstChild.textContent.trim(); b.click(); return { id: b.getAttribute('data-id'), t }; });
    await L.settle(p, 300);
    ok((await slip(p)) === 'Ticked ' + tk.t, 'prep: Ticked names the line (' + await slip(p) + ')');
    await p.click('.nb-box[data-p="tick"][data-id="' + tk.id + '"]'); await L.settle(p, 300);
    ok((await slip(p)) === 'Unticked ' + tk.t + '. It is open again.', 'prep: a second tap says Unticked and the line (' + await slip(p) + ')');
    // the stamp goes after 2 minutes
    await p.clock.runFor(121000); await L.settle(p, 200);
    sel = await rowOf(p, 'Slice tomatoes');
    ok(sel && !(await newStamp(p, sel)), 'prep: after 2 minutes the New stamp has gone');
    ok(p.errors.length === 0, 'prep: no page errors ' + p.errors.join(' | '));
    await p.context().close();

    p = await L.open(b, '#/orders', { wait: 1500 });
    await L.oLog(p);
    await p.fill('#o-text', 'Butter'); await p.press('#o-text', 'Enter'); await L.settle(p, 400);
    ok(/^Added Butter to the order list$/.test(await slip(p)), 'orders: the slip names the line (' + await slip(p) + ')');
    await L.tap(p, '.o-sheet .sheet-x[data-p="o-log-close"]'); await L.settle(p, 300);
    sel = await rowOf(p, 'Butter');
    ok(sel && /^New \d\d:\d\d$/.test(await newStamp(p, sel)), 'orders: the new line wears "New HH:MM" (' + (sel && await newStamp(p, sel)) + ')');
    ok(p.errors.length === 0, 'orders: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  } finally {
    await b.close();
  }
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
