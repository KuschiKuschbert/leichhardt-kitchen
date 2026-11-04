// The Save button tells the whole story (4 Nov 2026, Saving A in docs/loading-feedback-options/brief.md, LF-06 and
// LF-12): Saving... once, on the button, at its own width; Saved with a tick for 1.2 s, only once the server answered,
// then the form does what it did before; one line after 4 s while the save waits for the signal; a failure turns the
// button into Try again with a red line under it that stays until the next try or an edit. Checked on the ping editor,
// the guide editor and the staff list's Save bar, with the stand-in holding, failing and refusing writes. Words typed
// while Saved shows are kept (pings, guides, minutes).
const L = require('./lib');
const { R, ok } = L.results();

const SLOW = 'Waiting for the signal. Keep the book open.';
const now = p => p.evaluate(() => Date.now());
// stop the page's clock a moment ahead, so the 1.2 s of Saved can be looked at before it runs on (the clock runs on
// while this asks, so a moment that has already gone is tried again further on)
const pause = async p => { for (let i = 1; ; i++) { try { return await p.clock.pauseAt(await now(p) + 300 * i); } catch (e) { if (i > 4) throw e; } } };
// the button's words, its state and the lines under it, read in one go
const btn = (p, sel) => p.evaluate(s => {
  const b = document.querySelector(s); if (!b) return null;
  return { text: b.textContent.trim(), disabled: b.disabled, busy: b.getAttribute('aria-busy'), done: !!b.querySelector('.ink-icon[data-state="done"]'), spin: !!b.querySelector('.ink-icon[data-state="busy"], .ink-icon[data-state="still"]'), width: Math.round(b.getBoundingClientRect().width) };
}, sel);
// the line under the button row that holds the button: its words, role and whether it is the red error style
const under = (p, sel) => p.evaluate(s => {
  const b = document.querySelector(s), row = b && b.closest('.btn-row'), e = row && row.nextElementSibling;
  if (!e || !e.textContent.trim()) return null;
  return { text: e.textContent.trim(), role: e.getAttribute('role'), err: e.classList.contains('p-err'), red: getComputedStyle(e).color };
}, sel);
// a wait that times out is a failed check further on, not the end of the file
const wait = (p, fn, arg, ms) => L.waitFor(p, fn, arg, ms).catch(() => false);
const count = (p, scope, word) => p.evaluate(([s, w]) => ((document.querySelector(s) || {}).innerText || '').split(w).length - 1, [scope, word]);

(async () => {
  const b = await L.start();
  let p;
  try {
    /* ---------- Shift pings (the sous chef on a phone) ---------- */
    p = await L.open(b, '#/recipes', { who: 'sam' });
    await L.chef(p, 'pings');
    await L.tap(p, '[data-p="n-new"]');
    await wait(p, () => !!document.querySelector('[data-k="n-text"]'));
    await p.fill('[data-k="n-text"]', 'Barramundi is off until Thursday');
    const idle = await btn(p, '[data-p="n-save"]');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await L.tap(p, '[data-p="n-save"]');
    let s = await btn(p, '[data-p="n-save"]');
    ok(s && /^Saving\.\.\.$/.test(s.text) && s.disabled && s.busy === 'true' && s.spin, 'ping: the button says Saving... with the ink, off and busy (' + JSON.stringify(s) + ')');
    ok(s && idle && s.width === idle.width, 'ping: the button keeps its width while it saves (' + (idle && idle.width) + ' then ' + (s && s.width) + ')');
    ok(await count(p, '.n-edit', 'Saving') === 1, 'ping: Saving... shows once, on the button, not again under it (' + await count(p, '.n-edit', 'Saving') + ')');
    ok(!(await under(p, '[data-p="n-save"]')), 'ping: nothing under the button in the first seconds');
    await p.evaluate(() => window.__fake.ack());
    await L.settle(p, 150);
    s = await btn(p, '[data-p="n-save"]');
    ok(s && !s.done && /Saving/.test(s.text), 'ping: the listener hearing the write is not Saved (' + JSON.stringify(s) + ')');
    await p.clock.runFor(4200);
    let u = await under(p, '[data-p="n-save"]');
    ok(u && u.text === SLOW && u.role === 'status' && !u.err, 'ping: after 4 s one line under the button says to keep the book open (' + JSON.stringify(u) + ')');
    ok(await count(p, '.n-edit', 'Saving') === 1, 'ping: still one Saving... after 4 s');
    // the server answers: Saved with a tick for 1.2 s, then the editor closes as before
    await pause(p);
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await wait(p, () => !window.LK_PREP.state.nSaving);
    s = await btn(p, '[data-p="n-save"]');
    ok(s && s.done && /^Saved$/.test(s.text) && s.disabled && s.busy === 'false', 'ping: once the server answers, the button says Saved with a tick, off (' + JSON.stringify(s) + ')');
    ok(s && idle && s.width === idle.width, 'ping: Saved keeps the same width (' + (s && s.width) + ')');
    ok(!(await under(p, '[data-p="n-save"]')), 'ping: the waiting line goes once it is saved');
    ok(await p.evaluate(() => window.LK_PREP.state.nOpen), 'ping: the editor stays open while it says Saved');
    await p.clock.runFor(1300);
    await wait(p, () => !window.LK_PREP.state.nOpen);
    ok(await p.evaluate(() => /^Saved\. Shows:/.test(window.LK_PREP.state.nMsg)), 'ping: after 1.2 s the editor closes and says what it shows');
    ok(/^Saved\. Shows:/.test(await L.txt(p, '.n-lst .saved') || '') && !(await p.$('.n-lst .p-err')), 'ping: the confirmation is the grey status line, not an error');
    await p.clock.resume();
    ok(await p.evaluate(() => Object.entries(window.__fake.dump()).filter(([k, v]) => /\/notes\/[^/]+$/.test(k) && v.text === 'Barramundi is off until Thursday').length) === 1, 'ping: one ping is written');

    // no signal: Try again and a red line that stays
    await L.tap(p, '[data-p="n-new"]');
    await wait(p, () => !!document.querySelector('[data-k="n-text"]'));
    await p.fill('[data-k="n-text"]', 'Fryer two is down');
    await p.evaluate(() => { window.__fake.mode = 'fail'; });
    await L.tap(p, '[data-p="n-save"]');
    await wait(p, () => !window.LK_PREP.state.nSaving);
    s = await btn(p, '[data-p="n-save"]'); u = await under(p, '[data-p="n-save"]');
    ok(s && s.text === 'Try again' && !s.disabled && !s.done, 'ping failed: the button says Try again and is on (' + JSON.stringify(s) + ')');
    ok(u && u.err && u.role === 'alert' && /Could not save\. Check the connection and try again\./.test(u.text), 'ping failed: a red line under the button says why (' + JSON.stringify(u) + ')');
    await p.clock.runFor(15000); await L.settle(p, 200);
    u = await under(p, '[data-p="n-save"]');
    ok(u && u.err && (await btn(p, '[data-p="n-save"]')).text === 'Try again', 'ping failed: Try again and the red line are still there 15 s later');
    ok(await p.inputValue('[data-k="n-text"]') === 'Fryer two is down', 'ping failed: the words are kept');
    // an edit takes the failure away
    await p.fill('[data-k="n-text"]', 'Fryer two is down until Friday');
    await L.settle(p, 150);
    s = await btn(p, '[data-p="n-save"]'); u = await under(p, '[data-p="n-save"]');
    ok(s && s.text === 'Save ping' && !u, 'ping failed: an edit puts the button back to Save ping and the red line goes (' + JSON.stringify(s) + ', ' + JSON.stringify(u) + ')');
    // refused, then the retry works
    await p.evaluate(() => { window.__fake.mode = 'deny'; });
    await L.tap(p, '[data-p="n-save"]');
    await wait(p, () => !window.LK_PREP.state.nSaving);
    u = await under(p, '[data-p="n-save"]');
    ok(u && u.err && /^Not saved\. Only the head chef and the sous chefs write pings/.test(u.text) && (await btn(p, '[data-p="n-save"]')).text === 'Try again', 'ping refused: Try again, and the red line says who may write pings (' + JSON.stringify(u) + ')');
    await p.evaluate(() => { window.__fake.mode = 'ok'; });
    await L.tap(p, '[data-p="n-save"]');
    await wait(p, () => { const b = document.querySelector('[data-p="n-save"]'); return !!(b && b.querySelector('.ink-icon[data-state="done"]')); });
    ok(!(await under(p, '[data-p="n-save"]')), 'ping retry: the red line goes once it is saved');
    await wait(p, () => !window.LK_PREP.state.nOpen, null, 4000);
    ok(await p.evaluate(() => Object.values(window.__fake.dump()).filter(v => v && v.text === 'Fryer two is down until Friday').length) === 1, 'ping retry: the ping is written once');
    // another ping opened while Saved shows: Saved ends there, and the new form's Save is never held
    await wait(p, () => window.LK_PREP.state.notes && window.LK_PREP.state.notes.some(n => n.text === 'Fryer two is down until Friday'));
    const fryer = await p.evaluate(() => window.LK_PREP.state.notes.find(n => n.text === 'Fryer two is down until Friday').id);
    await L.tap(p, '[data-p="n-new"]');
    await wait(p, () => !!document.querySelector('[data-k="n-text"]'));
    await p.fill('[data-k="n-text"]', 'Walk-in is at 4 degrees');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await L.tap(p, '[data-p="n-save"]');
    await pause(p);
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await wait(p, () => { const b = document.querySelector('[data-p="n-save"]'); return !!(b && b.querySelector('.ink-icon[data-state="done"]')); });
    await L.tap(p, '[data-p="n-edit"][data-id="' + fryer + '"]');
    s = await btn(p, '[data-p="n-save"]');
    ok(s && s.text === 'Save changes' && !s.done && await p.inputValue('[data-k="n-text"]') === 'Fryer two is down until Friday', 'ping: Edit on another ping while Saved shows opens it with its own Save changes (' + JSON.stringify(s) + ')');
    await p.clock.resume();
    await p.fill('[data-k="n-text"]', 'Fryer two is back on');
    s = await btn(p, '[data-p="n-save"]');
    ok(s && !s.disabled, 'ping: its Save is on as soon as it changes, not held by the other ping\'s Saved');
    await L.tap(p, '[data-p="n-save"]');
    await wait(p, () => !window.LK_PREP.state.nOpen, null, 4000);
    ok(await p.evaluate(id => { const d = window.__fake.dump(); return Object.entries(d).some(([k, v]) => k.endsWith('/notes/' + id) && v.text === 'Fryer two is back on') && Object.values(d).some(v => v && v.text === 'Walk-in is at 4 degrees'); }, fryer), 'ping: both saves are in the store');
    // words typed while Saved shows are never lost: Saved ends, the editor stays open with them as a change to the
    // ping just saved, and the next save changes that ping (no second ping)
    await L.tap(p, '[data-p="n-new"]');
    await wait(p, () => !!document.querySelector('[data-k="n-text"]'));
    await p.fill('[data-k="n-text"]', 'Oysters in at 15:00');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await L.tap(p, '[data-p="n-save"]');
    await pause(p);
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await wait(p, () => { const b = document.querySelector('[data-p="n-save"]'); return !!(b && b.querySelector('.ink-icon[data-state="done"]')); });
    await p.type('[data-k="n-text"]', ', shuck to order');
    await p.clock.runFor(1500);
    await L.settle(p, 100);
    s = await btn(p, '[data-p="n-save"]');
    ok(await p.evaluate(() => window.LK_PREP.state.nOpen) && await p.inputValue('[data-k="n-text"]') === 'Oysters in at 15:00, shuck to order', 'ping typed during Saved: the editor stays open with the words (' + await p.inputValue('[data-k="n-text"]').catch(() => 'closed') + ')');
    ok(s && s.text === 'Save changes' && !s.disabled && !s.done, 'ping typed during Saved: Saved ends and Save changes is on for the new words (' + JSON.stringify(s) + ')');
    await p.clock.resume();
    await L.tap(p, '[data-p="n-save"]');
    await wait(p, () => !window.LK_PREP.state.nOpen, null, 4000);
    ok(await p.evaluate(() => { const v = Object.entries(window.__fake.dump()).filter(([k, x]) => /\/notes\/[^/]+$/.test(k) && /^Oysters in at 15:00/.test(x.text)); return v.length === 1 && v[0][1].text === 'Oysters in at 15:00, shuck to order'; }), 'ping typed during Saved: the next save changes the same ping, no second one');
    ok(!(await L.overflow(p)), 'ping: no sideways scroll at 390 px');
    ok(p.errors.length === 0, 'ping: no page errors ' + p.errors.join(' | '));
    await p.context().close();

    /* ---------- the guide editor (the head chef on a laptop) ---------- */
    p = await L.open(b, '#/admin', { admin: true, width: 1280, height: 900 });
    await L.adminTab(p, 'guides');
    const guide = async (title) => {
      await p.click('[data-p="g-new"]');
      await p.fill('#g-title', title);
      await L.choose(p, '[data-p="g-fcat"][data-v="cleaning"]');
      await p.fill('#g-steps', 'Drain the oil.\nWipe the basin.');
    };
    await guide('Fryer oil change, nights');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await p.click('[data-p="g-save"]');
    s = await btn(p, '[data-p="g-save"]');
    ok(s && /^Saving\.\.\.$/.test(s.text) && s.disabled && s.busy === 'true', 'guide: the button says Saving... (' + JSON.stringify(s) + ')');
    await p.clock.runFor(4200);
    u = await under(p, '[data-p="g-save"]');
    ok(u && u.text === SLOW && u.role === 'status', 'guide: after 4 s one line under the button (' + JSON.stringify(u) + ')');
    await p.evaluate(() => window.__fake.ack()); await L.settle(p, 150);
    ok(!(await btn(p, '[data-p="g-save"]')).done, 'guide: the listener hearing the write is not Saved');
    await pause(p);
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await wait(p, () => { const b = document.querySelector('[data-p="g-save"]'); return !!(b && b.querySelector('.ink-icon[data-state="done"]')); });
    s = await btn(p, '[data-p="g-save"]');
    ok(s && s.text === 'Saved' && s.disabled && !!(await p.$('.g-edit')), 'guide: Saved with a tick, the editor still open (' + JSON.stringify(s) + ')');
    await p.clock.runFor(1300);
    await wait(p, () => window.LK_PREP.state.gf === null);
    ok(/Saved "Fryer oil change, nights"/.test(await p.evaluate(() => window.LK_PREP.state.gMsg)), 'guide: after 1.2 s the editor closes and says it is saved');
    await p.clock.resume();

    await guide('Grill clean down');
    await p.evaluate(() => { window.__fake.mode = 'deny'; });
    await p.click('[data-p="g-save"]');
    await wait(p, () => window.LK_PREP.state.gf && !window.LK_PREP.state.gf.saving);
    s = await btn(p, '[data-p="g-save"]'); u = await under(p, '[data-p="g-save"]');
    ok(s && s.text === 'Try again' && !s.disabled, 'guide refused: the button says Try again (' + JSON.stringify(s) + ')');
    ok(u && u.err && u.role === 'alert' && /refused/.test(u.text), 'guide refused: the red line is under the button (' + JSON.stringify(u) + ')');
    await p.evaluate(() => { window.__fake.mode = 'ok'; });
    await p.click('[data-p="g-save"]');
    await wait(p, () => window.LK_PREP.state.gf === null, null, 4000);
    ok(/Saved "Grill clean down"/.test(await p.evaluate(() => window.LK_PREP.state.gMsg)), 'guide retry: Try again saves it');
    // steps typed while Saved shows are never lost, and the next save changes the same guide
    await guide('Slicer clean');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await p.click('[data-p="g-save"]');
    await pause(p);
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await wait(p, () => { const b = document.querySelector('[data-p="g-save"]'); return !!(b && b.querySelector('.ink-icon[data-state="done"]')); });
    await p.focus('#g-steps'); await p.keyboard.press('Control+End'); await p.keyboard.type('\nUnplug it first.');
    await p.clock.runFor(1500);
    await L.settle(p, 100);
    ok(!!(await p.$('.g-edit')) && /Unplug it first\.$/.test(await p.inputValue('#g-steps').catch(() => '')), 'guide typed during Saved: the editor stays open with the words');
    s = await btn(p, '[data-p="g-save"]');
    ok(s && s.text === 'Save changes' && !s.disabled, 'guide typed during Saved: Save changes is on for the new words (' + JSON.stringify(s) + ')');
    await p.clock.resume();
    await L.tap(p, '[data-p="g-save"]');
    await wait(p, () => window.LK_PREP.state.gf === null, null, 4000);
    ok(await p.evaluate(() => { const v = Object.entries(window.__fake.dump()).filter(([k, x]) => /\/guides\/[^/]+$/.test(k) && x.title === 'Slicer clean'); return v.length === 1 && /Unplug it first\.$/.test(v[0][1].steps); }), 'guide typed during Saved: the next save changes the same guide, no second one');
    // minutes: words typed while Saved shows on a draft are kept, and the next save changes the same draft
    await L.adminTab(p, 'minutes');
    await wait(p, () => !!document.querySelector('[data-p="mn-new"]'));
    await p.click('[data-p="mn-new"]');
    await wait(p, () => !!document.querySelector('[data-k="mn-decisions"]'));
    await p.fill('[data-k="mn-decisions"]', 'Probe every chicken');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await p.click('[data-p="mn-draft"]');
    await pause(p);
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await wait(p, () => { const b = document.querySelector('[data-p="mn-draft"]'); return !!(b && b.querySelector('.ink-icon[data-state="done"]')); });
    await p.focus('[data-k="mn-decisions"]'); await p.keyboard.press('Control+End'); await p.keyboard.type('\nLabel every tub');
    await p.clock.runFor(1500);
    await L.settle(p, 100);
    ok(!!(await p.$('.mn-form')) && /Label every tub$/.test(await p.inputValue('[data-k="mn-decisions"]').catch(() => '')), 'minutes typed during Saved: the form stays open with the words');
    s = await btn(p, '[data-p="mn-draft"]');
    ok(s && s.text === 'Save draft' && !s.disabled, 'minutes typed during Saved: Save draft is on for the new words (' + JSON.stringify(s) + ')');
    await p.clock.resume();
    await L.tap(p, '[data-p="mn-draft"]');
    await wait(p, () => !document.querySelector('.mn-form'), null, 4000);
    ok(await p.evaluate(() => { const v = Object.entries(window.__fake.dump()).filter(([k, x]) => /\/minutes\/[^/]+$/.test(k) && /^Probe every chicken/.test(x.decisions || '')); return v.length === 1 && /Label every tub$/.test(v[0][1].decisions) && v[0][1].status === 'draft'; }), 'minutes typed during Saved: the next save changes the same draft, no second one');
    ok(p.errors.length === 0, 'guide: no page errors ' + p.errors.join(' | '));
    await p.context().close();

    /* ---------- the staff list's Save bar (the sous chef's Manage staff) ---------- */
    p = await L.open(b, '#/prep', { wait: 1500 });
    await L.chef(p, 'staff');
    const add = async name => {
      await p.click('[data-p="a-add-person"]');
      await p.locator('[data-a="name"]').last().fill(name);
      await p.locator('[data-a="name"]').last().blur();
      await L.settle(p, 100);
    };
    await add('Cy');
    await p.evaluate(() => { window.__fake.mode = 'hold'; });
    await p.click('[data-p="a-save"]');
    s = await btn(p, '[data-p="a-save"]');
    ok(s && /^Saving\.\.\.$/.test(s.text) && s.disabled && s.busy === 'true', 'staff: the Save bar button says Saving... (' + JSON.stringify(s) + ')');
    ok(await count(p, '.a-savebar', 'Saving') === 1, 'staff: Saving... shows once in the Save bar (' + await count(p, '.a-savebar', 'Saving') + ')');
    await p.clock.runFor(4200);
    u = await under(p, '[data-p="a-save"]');
    ok(u && u.text === SLOW && u.role === 'status', 'staff: after 4 s one line under the button (' + JSON.stringify(u) + ')');
    await pause(p);
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await wait(p, () => !window.LK_PREP.state.busy);
    s = await btn(p, '[data-p="a-save"]');
    ok(s && s.done && s.text === 'Saved' && s.disabled, 'staff: Saved with a tick once the server answers (' + JSON.stringify(s) + ')');
    ok(await p.evaluate(() => { const e = document.querySelector('.a-savebar'); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; }), 'staff: the Save bar stays in sight while it says Saved');
    await p.clock.runFor(1300);
    await wait(p, () => /Saved\. Everyone sees the changes now\./.test((document.querySelector('.a-savebar .saved') || {}).textContent || ''));
    s = await btn(p, '[data-p="a-save"]');
    ok(s && s.text === 'Save changes' && s.disabled, 'staff: after 1.2 s the button is Save changes again, off, with the grey confirmation under it');
    await p.clock.resume();

    await add('Di');
    await p.evaluate(() => { window.__fake.mode = 'fail'; });
    await p.click('[data-p="a-save"]');
    await wait(p, () => !window.LK_PREP.state.busy);
    s = await btn(p, '[data-p="a-save"]'); u = await under(p, '[data-p="a-save"]');
    ok(s && s.text === 'Try again' && !s.disabled, 'staff failed: the button says Try again (' + JSON.stringify(s) + ')');
    ok(u && u.err && u.role === 'alert' && /^Could not save\. Check the connection\.$/.test(u.text), 'staff failed: a red line under it, not grey (' + JSON.stringify(u) + ')');
    await p.clock.runFor(15000); await L.settle(p, 200);
    ok((await under(p, '[data-p="a-save"]') || {}).err, 'staff failed: the red line stays');
    await p.evaluate(() => { window.__fake.mode = 'ok'; });
    await p.click('[data-p="a-save"]');
    await wait(p, () => /Saved\. Everyone sees/.test((document.querySelector('.a-savebar .saved') || {}).textContent || ''), null, 4000);
    ok(await p.evaluate(() => (Object.entries(window.__fake.dump()).find(([k]) => /\/config\/main$/.test(k))[1].people || []).some(x => x.name === 'Di')), 'staff retry: Try again saves the new person');
    ok(!(await L.overflow(p)), 'staff: no sideways scroll at 390 px');
    ok(p.errors.length === 0, 'staff: no page errors ' + p.errors.join(' | '));
    await p.context().close();
  } finally {
    await b.close();
  }
  L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); console.log('1 failed of ' + (R.length + 1)); process.exit(1); });
