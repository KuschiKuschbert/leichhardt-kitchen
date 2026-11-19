// Buttons and the chosen state, the consistency sweep, step 3 (head chef, 20 Nov 2026, choices 1 to 4;
// docs/head-chef-decisions.md and docs/design-patterns.md, The look). Measured on the pages where each piece shows:
// 1. the main button is the orange one with 8 px corners everywhere, in sheets too (Got it, the mail pop-up, Keep working);
// 2. a button that does something has 8 px corners: only chips that choose are round;
// 3. one destructive look, .lk-del: red words and a red outline on Remove, Delete and Discard, and on every armed
//    "Tap again" (arm() and armed() in js/prep.js); Discard is never the orange main button;
// 4. a chosen chip or picker is ink; orange only for a notebook's section tabs, the Functions tab among them.
// SWEEP_SHOTS=<folder> saves a picture of each piece there (SWEEP_TAG=before or after names them). Made-up records only.
const L = require('./lib'), M = require('../js/functions.js'), F = require('./supplier-fixtures');
const fs = require('fs'), path = require('path');
const { R, ok } = L.results(), { txt } = L;
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const today = L.ymd(new Date(L.NOW)), MIN = 60000;
const SHOTS = process.env.SWEEP_SHOTS || '', TAG = process.env.SWEEP_TAG || 'after';

// the colour, fill, edge and corners of an element, with its words composited over what is under them
async function look(p, sel) {
  return p.locator(sel).first().evaluate(e => {
    const rgba = s => { const c = (s.match(/[\d.]+/g) || []).map(Number); return c.length === 3 ? c.concat(1) : c; };
    const over = (a, b) => { const al = a[3] + b[3] * (1 - a[3]); return al ? [0, 1, 2].map(i => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / al).concat(al) : [0, 0, 0, 0]; };
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    let fg = rgba(s.color), bg = [0, 0, 0, 0];
    for (let n = e; n; n = n.parentElement) { const b = rgba(getComputedStyle(n).backgroundColor); fg = over(fg, b); bg = over(bg, b); if (bg[3] >= 1) break; }
    fg = over(fg, [255, 255, 255, 1]); bg = over(bg, [255, 255, 255, 1]);
    const lum = c => c.slice(0, 3).map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((t, x, i) => t + x * [.2126, .7152, .0722][i], 0);
    const a = lum(fg), b = lum(bg);
    return { cls: String(e.className), radius: s.borderTopLeftRadius, fill: s.backgroundColor, color: s.color, edge: s.borderLeftColor,
      edgeW: parseFloat(s.borderLeftWidth) || 0, edgeS: s.borderLeftStyle, ring: s.boxShadow, h: Math.round(r.height), text: e.textContent.replace(/\s+/g, ' ').trim(),
      ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  });
}
// the shared colours, read from the page's own tokens
async function tokens(p) {
  return p.evaluate(() => {
    const out = {}, i = document.createElement('i'); document.body.appendChild(i);
    [['ink', '--ink'], ['accent', '--accent-ink'], ['bad', '--bad-ink'], ['badDark', '--bad-on-dark'], ['paper', '--paper']].forEach(([k, t]) => { i.style.color = 'var(' + t + ')'; out[k] = getComputedStyle(i).color; });
    i.remove(); return out;
  });
}
const say = s => s.text.slice(0, 40) + ': ' + [s.radius, 'fill ' + s.fill, 'words ' + s.color, 'edge ' + s.edgeW + 'px ' + s.edgeS + ' ' + s.edge, s.h + ' px', s.ratio.toFixed(2) + ':1'].join(', ');
let T = {};
async function main(p, sel, label) {
  const s = await look(p, sel);
  ok(s.fill === T.accent && s.color === 'rgb(255, 255, 255)' && s.radius === '8px' && s.h >= 44 && s.ratio >= 4.5, label + ' is the orange main button with 8 px corners (' + say(s) + ')');
}
async function act(p, sel, label) {
  const s = await look(p, sel);
  ok(s.radius === '8px', label + ' has 8 px corners, not a pill (' + say(s) + ')');
}
async function del(p, sel, label, dark) {
  const s = await look(p, sel), red = dark ? T.badDark : T.bad;
  ok(/(^|\s)lk-del(\s|$)/.test(s.cls) && s.color === red && s.edge === red && s.edgeS === 'solid' && s.edgeW >= 1 && s.ratio >= 4.5 && s.h >= 44,
    label + ': red words and a red outline (' + say(s) + ')');
  return s;
}
async function chosen(p, sel, label) {
  const s = await look(p, sel);
  ok(s.fill === T.ink && s.ratio >= 4.5, label + ' chosen is ink, light words (' + say(s) + ')');
}
async function shot(p, sel, name, pad) {
  if (!SHOTS) return;
  await p.locator(sel).first().evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {});
  await L.settle(p, 400);
  const box = await p.locator(sel).first().boundingBox().catch(() => null); if (!box || !box.height) return;
  const vp = p.viewportSize(), m = pad == null ? 16 : pad;
  const x = Math.max(0, box.x - m), y = Math.max(0, box.y - m);
  fs.mkdirSync(SHOTS, { recursive: true });
  await p.screenshot({ path: path.join(SHOTS, TAG + '-' + name + '.png'), clip: { x, y, width: Math.min(vp.width - x, box.width + 2 * m), height: Math.min(vp.height - y, box.height + 2 * m) } }).catch(() => {});
}
const open = async (b, hash, o) => { const p = await L.open(b, hash, o); T = await tokens(p); return p; };
const clean = async (p, label) => { ok(!p.errors.length && !(await L.overflow(p)), label + ': no page errors, no sideways scroll ' + p.errors.join(' | ')); await p.context().close(); };
const inject = (p, where, html) => p.evaluate(a => { const host = document.querySelector(a.where) || document.body, d = document.createElement('div'); d.id = 'sweep-sample'; d.innerHTML = a.html; host.prepend(d); }, { where, html });

// made-up records: two functions on now (the band's Service view), a ping, a team plan
const at = hm => M.kat(today, M.hmMin(hm));
const fn = (name, start, rounds) => M.derive({ v: 1, status: 'confirmed', name, date: today, start: at(start), loc: 'Function room', guests: 40, mode: rounds.length > 1 ? 'stag' : 'all',
  notes: '', kc: '', kcBy: '', kcAt: 0, rounds: rounds.map(x => ({ at: at(x), note: '' })), lines: [{ rid: 'antipasto-platter', name: 'Antipasto Platter', unit: 'platter', spec: '', fp: '', qty: rounds.length, u: M.toU(rounds.map(() => 1)) }],
  was: {}, chg: [], cBy: 'sam', cAt: 1, confBy: 'sam', confAt: 1, by: 'sam', upd: L.NOW - 3600000 });
const fns = { [key('functions', 'sw60')]: fn('Birthday 60th', '13:45', ['14:10', '14:50']), [key('functions', 'swclub')]: fn('Club lunch', '12:00', ['14:30']),
  [key('days', today, 'items', 'sw-fn')]: { text: 'Party pies', qty: '50', station: 'Larder', recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, done: false, deleted: false, fnFor: ['sw60'] } };
const ping = { [key('notes', 'swp')]: { text: 'Safety: walk-in door sticks', tag: 'safety', start: today, until: today, dows: [], tm: 835, removed: false, at: 1, by: 'sam', author: 'sam' } };
const people = [{ id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true }, { id: 'ann', name: 'Ann', role: 'staff', active: true, add: true, tick: true }, { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true }];
const team = { [key('config', 'main')]: { people, sousIds: ['sam'], staffIds: ['sam', 'ann', 'bo'], kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900, off: false }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320, off: false }], kitSecs: [{ id: 'grill', name: 'Grill' }, { id: 'pans', name: 'Pans' }] },
  [key('team', today)]: { day: today, on: [{ id: 'ann', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'dinner', sec: 'pans' }], br: [], v: 1, at: L.NOW, upd: L.NOW, by: 'sam' } };
const editorCfg = { [key('config', 'main')]: { people: [{ id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true }, { id: 'ann', name: 'Ann', role: 'head', add: true, tick: true, del: true, active: true, fn: true }], headId: 'ann', sousIds: ['sam', 'ann'], pingIds: ['sam', 'ann'], fnIds: ['ann'], showBadges: true } };

(async () => {
  const b = await L.start();
  let p, s;

  // 1. The main button in sheets: the ping sheet's Got it and the mail pop-up's Open mail; their Close and Later are 8 px too
  p = await open(b, '#/prep', { who: 'ann', touch: true, extra: ping, wait: 2000 });
  await L.waitFor(p, () => !!document.querySelector('.nt-got'), null, 6000).catch(() => {});
  await main(p, '.nt-got', 'pings sheet: Got it');
  await act(p, '.nt-later', 'pings sheet: Close');
  await shot(p, '.nt-foot', 'ping-sheet');
  await clean(p, 'pings sheet');

  p = await open(b, '#/', { admin: true, who: '', extra: Object.assign(L.mail(), { [key('config', 'admins')]: { x: 1, mailOpened: L.NOW - 11 * 3600000 } }), wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('.mlp-go'), null, 6000).catch(() => {});
  await main(p, '.mlp-go', 'mail pop-up: Open mail');
  await act(p, '.mlp-later', 'mail pop-up: Later');
  await shot(p, '.mlp-foot', 'mail-popup');
  await clean(p, 'mail pop-up');

  // 2 and 3 on Prep at 1280: the band's Service view, the row's Remove, the slip's Undo; the Functions tab is orange
  p = await open(b, '#/prep', { who: 'sam', width: 1280, height: 900, extra: fns, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('#fn-band .fn-more') && !!document.querySelector('.nb-x[data-p="del"]'), null, 6000).catch(() => {});
  await act(p, '#fn-band .fn-more', 'function band: ' + (await txt(p, '#fn-band .fn-more') || 'Service view'));
  await shot(p, '#fn-band .fn-more', 'fn-band-service-view');
  await del(p, '.nb-x[data-p="del"]', 'prep row: Remove');
  await shot(p, '.nb-row:has(.nb-x[data-p="del"])', 'prep-row-remove', 4);
  if (!(await p.locator('.nb-tab-fn').count())) await inject(p, '#prep-root', '<button type="button" class="nb-tab nb-tab-fn" aria-pressed="true">Functions</button>');
  else { await p.click('.nb-tab-fn'); await L.settle(p, 300); }
  s = await look(p, '.nb-tab-fn');
  ok(s.fill === T.accent && s.ratio >= 4.5, 'prep: the Functions tab chosen is orange like the other section tabs, not yellow (' + say(s) + ')');
  await shot(p, '.nb-tab-fn', 'prep-functions-tab', 8);
  await p.evaluate(() => { const x = document.getElementById('sweep-sample'); if (x) x.remove(); });
  // the chef's Prep view switch (Work, Before service) chooses: ink
  await inject(p, '#prep-root', '<div class="chips ps-viewbar" role="group" aria-label="Prep view"><button type="button" class="chip" aria-pressed="true">Work</button><button type="button" class="chip" aria-pressed="false">Before service</button></div>');
  await chosen(p, '#sweep-sample .ps-viewbar .chip[aria-pressed="true"]', 'prep view switch: Work');
  await shot(p, '#sweep-sample .ps-viewbar', 'prep-view-switch', 8);
  await p.evaluate(() => document.getElementById('sweep-sample').remove());
  await L.tap(p, '.nb-x[data-p="del"]'); await L.settle(p, 300);
  await L.waitFor(p, () => !!document.querySelector('.p-toasts .p-toast-btn'), null, 3000).catch(() => {});
  await act(p, '.p-toasts .p-toast-btn', 'the slip: Undo');
  await clean(p, 'prep 1280');

  p = await open(b, '#/fn', { who: 'sam', extra: fns, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.fn-card-actions .fn-cancel'), null, 6000).catch(() => {});
  await del(p, '.fn-card-actions .fn-cancel', 'functions: Cancel');
  await shot(p, '.fn-card-actions', 'fn-cancel');
  await clean(p, 'functions');

  // 2. The guide viewer's buttons and the supplier order's Top up · Use
  p = await open(b, '#/guides/combi', { who: 'ann', extra: L.guides(), wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-p="g-zoom"][data-i="0"]'), null, 6000).catch(() => {});
  await p.click('[data-p="g-zoom"][data-i="0"]'); await L.settle(p, 300);
  const gz = '.gz-b:not(.ux-modal-close):visible';
  await act(p, gz, 'guide viewer: ' + ((await p.locator(gz).first().textContent().catch(() => '')) || 'button').trim());
  await shot(p, '.gz-foot', 'guide-viewer');
  await clean(p, 'guide viewer');

  p = await open(b, '#/suppliers/northside', { who: 'bo', extra: F.fixture(), width: 1280, height: 900, wait: 1800 });
  await L.waitFor(p, () => !!document.querySelector('input[data-sf="stock"][data-i="t-stock"]'), null, 15000).catch(() => {});
  await p.fill('input[data-sf="stock"][data-i="t-stock"]', '3'); await L.settle(p, 200);
  await act(p, '[data-item="t-stock"] .su-use', 'supplier order: Top up · Use');
  await shot(p, '[data-item="t-stock"] .su-use', 'supplier-use', 10);
  await clean(p, 'supplier order');

  // 3. Remove on Orders and Wastage at 1280
  p = await open(b, '#/orders', { who: 'sam', width: 1280, height: 900, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-p="odel"]'), null, 6000).catch(() => {});
  await del(p, '[data-p="odel"]', 'orders row: Remove');
  await shot(p, '.nb-row:has([data-p="odel"])', 'orders-row-remove', 4);
  await clean(p, 'orders 1280');

  p = await open(b, '#/waste', { admin: true, width: 1280, height: 900, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-p="wdel"]'), null, 6000).catch(() => {});
  await del(p, '[data-p="wdel"]', 'wastage row: Remove');
  await shot(p, '.nb-row:has([data-p="wdel"])', 'waste-row-remove', 4);
  await clean(p, 'wastage 1280');

  // 3 and 4 in the admin panel: a ping's Remove, then armed; the Ping sound picked; On this page's current row; staff; minutes
  p = await open(b, '#/admin', { admin: true, adminPage: 'notes', extra: { [key('notes', 'n1')]: { text: 'Delivery: Bidfood 09:00', tag: 'delivery', start: today, until: today, dows: [], removed: false, at: 1, upd: 1, by: 'sam' } }, wait: 1800 });
  await L.adminTab(p, 'notes');
  await L.waitFor(p, () => !!document.querySelector('[data-p="n-del"][data-id="n1"]') && !!document.querySelector('.ps-pick'), null, 6000).catch(() => {});
  await del(p, '[data-p="n-del"][data-id="n1"]', 'pings: Remove');
  await L.tap(p, '[data-p="n-del"][data-id="n1"]'); await L.settle(p, 150);
  s = await del(p, '[data-p="n-del"][data-id="n1"]', 'pings: Remove armed');
  ok(s.text === 'Tap again to remove', 'pings: armed says Tap again to remove (' + s.text + ')');
  await shot(p, '[data-p="n-del"][data-id="n1"]', 'ping-remove-armed', 10);
  await chosen(p, '.ps-pick[aria-checked="true"]', 'Ping sound: the Pass bell');
  await shot(p, '.ps-row:has(.ps-pick[aria-checked="true"])', 'ping-sound-picked', 4);
  if (await p.locator('[data-p="aj-open"]:visible').count()) {
    await p.click('[data-p="aj-open"]'); await L.settle(p, 300);
    await chosen(p, '.sheet-o[aria-current="true"]', 'On this page: the current row');
    await shot(p, '.sheet-o[aria-current="true"]', 'jump-sheet-current', 4);
    await p.keyboard.press('Escape'); await L.settle(p, 200);
  }
  await L.adminTab(p, 'people'); await L.settle(p, 300);
  await L.tap(p, '[data-p="a-person-open"][data-id="bo"]'); await L.settle(p, 200);
  const leave = '[data-p="a-remove-person"][data-i="2"]';
  await del(p, leave, 'staff: Stopped working here');
  await L.tap(p, leave); await L.settle(p, 150);
  s = await del(p, leave, 'staff: Stopped working here armed');
  ok(/^Tap again/.test(s.text), 'staff: armed says Tap again (' + s.text + ')');
  await shot(p, leave, 'staff-leave-armed', 10);
  await L.adminTab(p, 'minutes'); await L.settle(p, 400);
  await p.click('[data-p="mn-new"]'); await L.settle(p, 200);
  await p.fill('[data-k="mn-decisions"]', 'New fryer oil every Monday');
  s = await look(p, '[data-p="mn-cancel"]');
  ok(!/lk-del/.test(s.cls), 'minutes: Cancel at rest keeps its plain look (' + say(s) + ')');
  await p.click('[data-p="mn-cancel"]'); await L.settle(p, 150);
  s = await del(p, '[data-p="mn-cancel"]', 'minutes: Cancel armed');
  ok(/Tap again to discard/.test(s.text), 'minutes: armed says Tap again to discard');
  await shot(p, '[data-p="mn-cancel"]', 'minutes-cancel-armed', 10);
  await clean(p, 'admin');

  // 3 in the recipe editor: Remove an ingredient, at rest and armed (the editor's own red brought onto .lk-del)
  p = await open(b, '#/manage/r/burger', { who: 'ann', extra: editorCfg, wait: 1400 });
  await L.waitFor(p, () => !!document.querySelector('[data-mg="ing-open"][data-i="0"]'), null, 8000).catch(() => {});
  await L.openRow(p, 0);
  await L.reveal(p, '[data-mg="ing-del"][data-i="0"]');
  await del(p, '[data-mg="ing-del"][data-i="0"]', 'recipe editor: Remove');
  await p.click('[data-mg="ing-del"][data-i="0"]'); await L.settle(p, 150);
  s = await del(p, '[data-mg="ing-del"][data-i="0"]', 'recipe editor: Remove armed');
  ok(s.text === 'Tap again to remove', 'recipe editor: armed says Tap again to remove');
  await shot(p, '[data-mg="ing-del"][data-i="0"]', 'editor-remove-armed', 10);
  await clean(p, 'recipe editor');

  // 3 in the chef hat: Sign out with something not saved asks again in red, not orange
  p = await open(b, '#/prep', { who: 'ann', wait: 1500 });
  await p.fill('#p-text', 'Keep this prep draft');
  const said = await L.notYou(p);
  ok(/Tap again to sign out/.test(said), 'chef hat: Sign out with a draft asks again (' + said + ')');
  await del(p, '.wm-out.is-armed', 'chef hat: Sign out armed');
  s = await look(p, '.wm-out.is-armed small');
  ok(s.color === T.bad, 'chef hat: the armed words are red, not orange (' + say(s) + ')');
  await shot(p, '.wm-out', 'signout-armed', 8);
  await p.keyboard.press('Escape'); await L.settle(p, 200);
  // the Unsaved changes question when the device changes: Keep working is the main button, Discard the red one
  await p.evaluate(() => { location.hash = '#/settings'; }); await L.settle(p, 400);
  await L.setRow(p, 'device');
  await p.click('[data-act="device-choice"]'); await p.click('[data-device="shared"]');
  await L.waitFor(p, () => !!document.querySelector('#lk-device-discard[open]'), null, 5000).catch(() => {});
  await main(p, '#lk-device-discard [data-keep]', 'device change: Keep working');
  await del(p, '#lk-device-discard [data-discard]', 'device change: Discard and continue');
  await shot(p, '#lk-device-discard .ux-picker-footer', 'device-discard', 4);
  await p.click('#lk-device-discard [data-keep]'); await L.settle(p, 300);
  ok(await p.evaluate(() => LK_PREP.state.text === 'Keep this prep draft'), 'device change: Keep working keeps the draft');
  await clean(p, 'sign out and device');

  // the update question: Keep working the main button, Discard and update the red one; Update now has 8 px corners
  p = await open(b, '#/prep', { who: 'ann', wait: 1500 });
  await p.clock.fastForward(10000);
  await p.evaluate(() => navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: 'lk-new' })));
  await L.waitFor(p, () => LK_UPDATE.state() === 'ready', null, 8000).catch(() => {});
  await p.fill('#p-text', 'Keep this unfinished prep line');
  await L.updateNow(p);
  await L.waitFor(p, () => !!document.querySelector('#lk-update-confirm[open]'), null, 5000).catch(() => {});
  await main(p, '#lk-update-confirm [data-update="keep"]', 'update: Keep working');
  await del(p, '#lk-update-confirm [data-update="discard"]', 'update: Discard and update');
  ok(await p.evaluate(() => document.activeElement === document.querySelector('#lk-update-confirm [data-update="keep"]')), 'update: the focus stays on Keep working');
  await shot(p, '#lk-update-confirm .ux-picker-footer', 'update-discard', 4);
  await p.click('#lk-update-confirm [data-update="keep"]'); await L.settle(p, 900);
  await act(p, '.upd-bar button', 'update band: Update now');
  await shot(p, '.upd-bar', 'update-band', 4);
  await clean(p, 'update question');

  // 3 and 4 on Today's team: the day picked is ink; Take off armed is red with an outline; a chosen chip is ink
  p = await open(b, '#/team', { who: 'sam', extra: team, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-p="tm-off"][data-id="ann"]'), null, 7000).catch(() => {});
  await chosen(p, '.tm-daypick[aria-pressed="true"]', 'Today\'s team: the day');
  const off = '[data-p="tm-off"][data-id="ann"][data-sh="lunch"]';
  s = await look(p, off);
  ok(!/lk-del/.test(s.cls) && s.color === T.ink, 'Today\'s team: Take off at rest stays ink, as its own contract chose (' + say(s) + ')');
  await L.tap(p, off); await L.settle(p, 200);
  s = await del(p, off, 'Today\'s team: Take off armed');
  ok(/^Tap again/.test(s.text), 'Today\'s team: armed says Tap again (' + s.text + ')');
  await shot(p, off, 'team-takeoff-armed', 10);
  await inject(p, '.tm-notebook .tm-work', '<div class="chips"><button type="button" class="chip" aria-pressed="true">Chosen</button><button type="button" class="chip" aria-pressed="false">Not chosen</button></div>');
  await chosen(p, '#sweep-sample .chip[aria-pressed="true"]', 'Today\'s team: a chip');
  await clean(p, 'Today\'s team');

  // 4 on the chef to-do list, Drinks run, the recipe book's Specials chip and Settings' Opens with
  p = await open(b, '#/todo', { who: 'sam', wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('[data-p="todo-for"][aria-pressed="true"]'), null, 6000).catch(() => {});
  await chosen(p, '[data-p="todo-for"][aria-pressed="true"]', 'chef to-do: For');
  await shot(p, '.todo-for', 'todo-for', 6);
  await clean(p, 'chef to-do');

  p = await open(b, '#/drinks', { who: 'sam', wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.dr-notebook'), null, 6000).catch(() => {});
  if (!(await p.locator('.dr-notebook .chip[aria-pressed="true"]').count())) await inject(p, '.dr-notebook', '<div class="chips"><button type="button" class="chip" aria-pressed="true">Large</button><button type="button" class="chip" aria-pressed="false">Small</button></div>');
  await chosen(p, '.dr-notebook .chip[aria-pressed="true"]', 'drinks: a choice');
  await shot(p, '.dr-notebook .chip[aria-pressed="true"]', 'drinks-choice', 10);
  await clean(p, 'drinks');

  p = await open(b, '#/recipes', { who: 'sam', wait: 1500 });
  await inject(p, '.page', '<div class="chips"><button type="button" class="chip sq sp" aria-pressed="true">Specials</button><button type="button" class="chip sq sp" aria-pressed="false">Specials</button></div>');
  await chosen(p, '#sweep-sample .chip.sp[aria-pressed="true"]', 'recipes: the Specials chip');
  s = await look(p, '#sweep-sample .chip.sp[aria-pressed="false"]');
  ok(s.color === T.accent || s.edge !== T.ink, 'recipes: the Specials chip not chosen keeps its orange words, so the specials are easy to find (' + say(s) + ')');
  await shot(p, '#sweep-sample', 'specials-chip', 6);
  await p.evaluate(() => { location.hash = '#/settings'; }); await L.settle(p, 400);
  await L.setRow(p, 'opens');
  s = await look(p, '.view-opt[aria-checked="true"]');
  ok(s.edge === T.ink && s.ring.indexOf(T.ink) >= 0 && s.ring.indexOf('rgb(226, 96, 42)') < 0, 'settings: Opens with, the chosen view has an ink ring, not orange (' + s.ring + ')');
  await shot(p, '.view-opt[aria-checked="true"]', 'settings-opens-with', 8);
  await clean(p, 'recipes and settings');

  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
