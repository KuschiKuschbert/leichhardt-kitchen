// One-tap cancellation for the requested roles. All records and people here are made up.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results();
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const day = L.ymd(new Date(L.NOW)), at = t => M.kat(day, M.hmMin(t));
const cfg = {
  people: [
    { id: 'sam', name: 'Sam', role: 'sous', add: true, tick: true, del: true, active: true, fn: false },
    { id: 'ann', name: 'Ann', role: 'staff', add: true, tick: true, del: false, active: true, fn: false },
    { id: 'bo', name: 'Bo', role: 'head', add: true, tick: true, del: true, active: true, fn: false },
    { id: 'fay', name: 'Fay', role: 'fnc', add: false, tick: false, del: false, active: true, fn: true }
  ], headId: 'bo', sousIds: ['sam', 'bo'], pingIds: ['sam', 'bo'], fnIds: ['fay'], staffIds: ['sam', 'ann', 'bo', 'fay'], showBadges: true
};
function fixture(od = day, date = day) {
  const when = t => M.kat(date, M.hmMin(t));
  const f = M.derive({ v: 1, status: 'confirmed', name: 'Alpha booking', date, start: when('18:00'), loc: 'Example area', guests: 30, mode: 'stag',
    lines: [{ rid: 'pizza-platter', name: 'Pizza Platter', qty: 3, u: [0, 0, 1], unit: 'platter', spec: '', fp: '' }, { rid: 'aussie-platter', name: 'Aussie Platter', qty: 2, u: [0, 1], unit: 'platter', spec: '', fp: '' }],
    rounds: [{ at: when('18:30'), note: 'First' }, { at: when('19:00'), note: 'Last' }], notes: 'Saved service notes', kc: 'Saved kitchen comment', kcBy: 'fay', kcAt: L.NOW - 3600000,
    cBy: 'fay', cAt: 1, confBy: 'fay', confAt: 1, by: 'fay', upd: 1, was: {}, chg: [], od });
  const x = {
    [key(['config', 'main'])]: cfg,
    [key(['functions', 'alpha'])]: f,
    [key(['functions', 'other'])]: M.derive(Object.assign({}, f, { name: 'Other booking', lines: [f.lines[1]] })),
    [key(['fncontact', 'alpha'])]: { cname: 'Private example', phone: '0400 000 000', email: 'private@example.com', upd: 1 },
    [key(['staffpins', 'fay'])]: { hash: L.sha('lk:fay:5151') }, [key(['pinset', 'fay'])]: { at: 1 },
    [key(['drinks', 'fay'])]: { kind: 'flat', by: 'fay', at: 1 }
  };
  for (const l of f.lines) x[key(['days', date, 'items', 'fn-alpha-' + l.rid])] = { text: l.name, qty: l.qty + ' platters', station: 'Functions', recipe: l.rid, fn: 'alpha', dupOk: true, done: true, doneAt: 1, doneById: 'ann', deleted: false, addedBy: 'Fay', addedById: 'fay', addedAt: 1 };
  x[key(['orders', od, 'lines', 'fn-alpha'])] = { text: 'Function stock', qty: '5 platters', recipes: [], fn: 'alpha', dupOk: true, ordered: true, orderedAt: 1, deleted: false, addedBy: 'Fay', addedById: 'fay', addedAt: 1 };
  return x;
}
const dump = p => p.evaluate(() => window.__fake.dump());
const waitStatus = (p, status) => L.waitFor(p, v => window.__fake.dump()[v.key].status === v.status && !window.LK_FN.statusBusy('alpha'), { key: key(['functions', 'alpha']), status });
const button = (kind = 'fn', action = 'cancel') => '[data-' + kind + '="status"][data-id="alpha"][data-v="' + action + '"]';

(async () => {
  const b = await L.start(); let p;
  try {
    for (const o of [{ who: 'sam', label: 'sous chef' }, { who: 'bo', label: 'head chef' }, { who: 'fay', label: 'function manager' }, { who: '', admin: true, label: 'admin' }]) {
      p = await L.open(b, '#/fn', Object.assign({ extra: fixture() }, o));
      await L.waitFor(p, () => !!document.querySelector('[data-fn="status"][data-id="alpha"]'));
      await p.click(button()); await waitStatus(p, 'cancelled');
      let s = await dump(p), f = s[key(['functions', 'alpha'])];
      ok(f.canBy === (o.admin ? s[key(['config', 'main'])].headId : o.who) && f.v === 2 && f.status === 'cancelled', o.label + ': one click cancels as the signed-in person, including the daily admin PIN');
      ok(s[key(['functions', 'alpha', 'hist', '1'])].was.status === 'confirmed' && s[key(['functions', 'other'])].status === 'confirmed', o.label + ': immutable history is kept and the other function is unchanged');
      ok(f.notes === 'Saved service notes' && f.lines[0].qty === 3 && s[key(['days', day, 'items', 'fn-alpha-pizza-platter'])].deleted, o.label + ': cancellation keeps the booking and removes its prep work');
      ok(s[key(['orders', day, 'lines', 'fn-alpha'])].deleted && s[key(['orders', day, 'lines', 'fn-alpha'])].ordered && s[key(['days', day, 'items', 'fn-alpha-pizza-platter'])].done, o.label + ': order and prep ticks survive cancellation');
      if (o.who === 'sam') {
        await L.waitFor(p, () => !!document.querySelector('.p-toasts .p-toast-btn'));
        await p.click('.p-toasts .p-toast-btn');
      } else { await p.click(button('fn', 'undo')); }
      await waitStatus(p, 'confirmed'); s = await dump(p);
      ok(s[key(['functions', 'alpha'])].v === 3 && s[key(['functions', 'alpha'])].lines[0].qty === 3 && !s[key(['days', day, 'items', 'fn-alpha-pizza-platter'])].deleted && !s[key(['orders', day, 'lines', 'fn-alpha'])].deleted, o.label + ': Undo restores the function and its work in one action');
      ok(!(await p.evaluate(() => window.__fake.readLog.some(k => /\/fncontact\//.test(k)))), o.label + ': quick cancellation and Undo never read contacts');
      ok(p.errors.length === 0, o.label + ': no page errors ' + p.errors.join(' | '));
      await p.close();
    }

    p = await L.open(b, '#/fn', { who: 'ann', extra: fixture() });
    await L.waitFor(p, () => /Alpha booking/.test(document.querySelector('.fn-page').textContent));
    ok(!(await p.$('[data-fn="status"]')), 'staff: no cancellation control');
    const denied = await p.evaluate(async data => {
      const api = window.LK_PREP.book(), f = Object.assign({}, data, { status: 'cancelled', v: 2, by: 'ann', canBy: 'ann', canAt: window.LK_TIME.now(), upd: window.LK_TIME.now() });
      try { await api.W([['set', api.docRef('functions', 'alpha'), f]]); return false; } catch (e) { return e.code === 'permission-denied'; }
    }, fixture()[key(['functions', 'alpha'])]);
    ok(denied && (await dump(p))[key(['functions', 'alpha'])].status === 'confirmed', 'staff: a direct cancellation write is also refused');
    await p.close();

    // Manager list and form both use the one-click action. It cancels the saved booking, preserving form edits.
    p = await L.open(b, '#/functions', { who: 'fay', extra: fixture() });
    await L.waitFor(p, () => !!document.querySelector('[data-fe="status"][data-id="alpha"]'));
    await p.click(button('fe')); await waitStatus(p, 'cancelled');
    ok((await dump(p))[key(['functions', 'alpha'])].status === 'cancelled', 'manager list: cancel is available without opening the edit form');
    await p.close();
    p = await L.open(b, '#/functions/alpha', { who: 'fay', extra: fixture() });
    await L.waitFor(p, () => !!document.querySelector('[data-fe="status"]'));
    await p.fill('[data-ff="notes"]', 'Local unsaved notes');
    await p.fill('[data-ff="startT"]', '17:45');
    await p.click(button('fe')); await waitStatus(p, 'cancelled');
    ok((await dump(p))[key(['functions', 'alpha'])].notes === 'Saved service notes' && await p.inputValue('[data-ff="notes"]') === 'Local unsaved notes' && await p.evaluate(() => window.LK_FE.dirty()), 'form: cancellation does not silently save or discard local edits');
    await p.click(button('fe', 'undo')); await waitStatus(p, 'confirmed');
    ok(await p.inputValue('[data-ff="notes"]') === 'Local unsaved notes', 'form: Undo also keeps local edits');
    await p.close();

    // A server read failure must not queue a cancellation from an old copy.
    p = await L.open(b, '#/fn', { who: 'sam', extra: fixture() });
    await L.waitFor(p, () => !!document.querySelector('[data-fn="status"][data-id="alpha"]'));
    await p.evaluate(() => { window.__fake.failReads = /\/functions\/alpha$/; });
    await p.click(button());
    await L.waitFor(p, () => !window.LK_FN.statusBusy('alpha') && /Not changed/.test(document.body.textContent));
    ok((await dump(p))[key(['functions', 'alpha'])].status === 'confirmed', 'offline: failed server reads leave the function confirmed');
    await p.close();

    // Hold only the write, after the fresh read. A second action cannot add another batch.
    p = await L.open(b, '#/fn', { who: 'sam', extra: fixture() });
    await L.waitFor(p, () => !!document.querySelector('[data-fn="status"][data-id="alpha"]'));
    await p.evaluate(() => {
      const book = window.LK_PREP.book;
      window.LK_PREP.book = function () { const api = book(), W = api.W; api.W = function (ops) { window.__fake.mode = 'hold'; return W(ops); }; return api; };
    });
    await p.click(button());
    await L.waitFor(p, () => window.LK_FN.statusBusy('alpha') && window.__fake.mode === 'hold');
    await p.evaluate(() => window.LK_FN.setStatus(window.LK_FN.list().find(f => f.id === 'alpha'), false));
    ok(await p.evaluate(() => window.LK_FN.list().find(f => f.id === 'alpha').status === 'confirmed' && !document.body.textContent.includes('Alpha booking: cancelled.')) && await p.$eval(button(), e => e.disabled), 'pending: no success or second cancellation before the server acknowledges');
    await p.evaluate(() => { window.__fake.mode = 'ok'; window.__fake.release(); });
    await waitStatus(p, 'cancelled');
    const cancellations = await p.evaluate(() => window.__fake.writes.filter(batch => batch.some(op => /\/functions\/alpha$/.test(op.path))).length);
    ok(cancellations === 1, 'pending: repeated taps write one cancellation batch');
    await p.close();

    // A simultaneous edit after the read is protected by the version check on the atomic batch.
    p = await L.open(b, '#/fn', { who: 'sam', extra: fixture() });
    await L.waitFor(p, () => !!document.querySelector('[data-fn="status"][data-id="alpha"]'));
    await p.evaluate(k => {
      const book = window.LK_PREP.book;
      window.LK_PREP.book = function () { const api = book(), W = api.W; api.W = function (ops) { const old = window.__fake.dump()[k]; window.__fake.write(k, Object.assign({}, old, { v: 2, notes: 'Another device saved this' })); return W(ops); }; return api; };
    }, key(['functions', 'alpha']));
    await p.click(button());
    await L.waitFor(p, () => !window.LK_FN.statusBusy('alpha') && /Not changed/.test(document.body.textContent));
    let s = await dump(p);
    ok(s[key(['functions', 'alpha'])].status === 'confirmed' && s[key(['functions', 'alpha'])].notes === 'Another device saved this' && !s[key(['functions', 'alpha', 'hist', '1'])], 'conflict: a simultaneous edit survives and no partial history or cleanup is saved');
    await p.close();

    const past = M.addDays(day, -1);
    p = await L.open(b, '#/fn', { who: 'sam', extra: fixture(past) });
    await L.waitFor(p, () => !!document.querySelector('[data-fn="status"][data-id="alpha"]'));
    await p.click(button()); await waitStatus(p, 'cancelled');
    s = await dump(p);
    const notice = key(['orders', day, 'lines', 'fn-alpha-x' + day.replace(/-/g, '')]);
    ok(s[notice] && /Function cancelled/.test(s[notice].text) && !s[key(['orders', past, 'lines', 'fn-alpha'])].deleted, 'past order: cancellation creates a correction notice without changing order history');
    await p.click(button('fn', 'undo')); await waitStatus(p, 'confirmed'); s = await dump(p);
    ok(s[notice].deleted && Object.values(s).some(v => v.fn === 'alpha' && /^Function restored/.test(v.text || '') && !v.deleted), 'past order: Undo removes the stale cancel notice and adds a restoration notice');
    await p.close();

    // The existing access tick is explicit, searchable and independent of the kitchen role.
    p = await L.open(b, '#/admin', { who: '', admin: true, extra: fixture(), width: 1280 });
    await L.adminTab(p, 'people');
    await L.waitFor(p, () => !!document.querySelector('[aria-label="Create and edit functions for Sam"]'));
    ok(!!(await p.$('[aria-label="Create and edit functions for Sam"]')), 'access: the checkbox clearly names create and edit access for that person');
    await p.evaluate(() => [...document.querySelectorAll('[aria-label="Create and edit functions for Sam"]')].find(e => e.getClientRects().length).click());
    await p.click('[data-p="a-save"]');
    await L.waitFor(p, k => window.__fake.dump()[k].fnIds.includes('sam'), key(['config', 'main']));
    const granted = await dump(p);
    ok(granted[key(['config', 'main'])].people.find(x => x.id === 'sam').role === 'sous', 'access: saving the checkbox grants Functions and preserves the existing role');
    for (const width of [390, 768, 1280]) { await p.setViewportSize({ width, height: 900 }); await L.settle(p, 100); ok(!(await L.overflow(p)), 'access: the clear checkbox label fits at ' + width + ' px'); }
    await p.close();
    p = await L.open(b, '#/functions/new', { who: 'sam', extra: granted });
    await L.waitFor(p, () => !!document.querySelector('[data-ff="name"]'));
    ok(!!(await p.$('[data-ff="name"]')), 'access: the checked person can open Create Functions with their own PIN');
    await p.close(); p = null;
  } finally { if (p && !p.isClosed()) await p.close(); await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exitCode = 1; });
