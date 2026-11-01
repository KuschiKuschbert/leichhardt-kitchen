// Shared Prep reports who prepared a job without changing the authenticated recorder, the normal sheet or Undo.
// Personal phones keep one-tap ticks. All records and PINs below belong to the Firebase stand-in.
const L = require('./lib'), M = require('../js/functions.js');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const today = L.ymd(new Date(L.NOW)), tomorrow = M.addDays(today, 1);
const itemKey = (id, day = today) => key('days', day, 'items', id);
const actor = (id, name, extra = {}) => ({ id, name, role: 'staff', active: true, add: true, tick: true, del: false, ...extra });
const people = [actor('sam', 'Sam', { role: 'sous', del: true }), actor('ann', 'Ann'), actor('bo', 'Bo'), actor('lee', 'Lee'),
  actor('vic', 'Vic', { role: 'view', add: false, tick: false }), actor('disabled', 'Read only', { tick: false }),
  actor('fay', 'Fay', { role: 'fnc' }), actor('off', 'Inactive', { active: false }), actor('removed', 'Removed from membership')];
const config = { people, staffIds: people.filter(p => !['off', 'removed'].includes(p.id)).map(p => p.id), sousIds: ['sam'], fnIds: ['fay'], fnOnlyIds: ['fay'], showBadges: true };
function fixture(extra = {}) {
  const at = hm => M.kat(today, M.hmMin(hm));
  const docs = {
    [key('config', 'main')]: config,
    [key('learned', 'mise-onions')]: { text: 'Mise onions', uses: 6, typed: 6, secs: { larder: { name: 'Larder', n: 6 } }, dow: {}, qtys: { '2-tubs': { q: '2 tubs', n: 4 } } },
    [key('functions', 'example')]: M.derive({ v: 1, status: 'confirmed', name: 'Example function', date: today, start: at('18:00'), loc: 'Beer garden', guests: 20,
      mode: 'all', notes: '', kc: '', kcBy: '', kcAt: 0, rounds: [{ at: at('18:30'), note: '' }],
      lines: [{ rid: 'aussie-platter', name: 'Aussie Platter', unit: 'platter', spec: 'Per platter.', fp: '', qty: 2, u: M.toU([2]) }],
      was: {}, chg: [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: 'fay', upd: L.NOW - 3600000 }),
    [itemKey('fn-example')]: { text: 'Aussie Platter', qty: '2 platters', station: 'Functions', recipe: 'aussie-platter', fn: 'example', dupOk: true,
      addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000, done: false, deleted: false }
  };
  for (const p of people) {
    docs[key('pinset', p.id)] = { at: 1 };
    docs[key('drinks', p.id)] = { kind: 'flat', size: 'reg', at: L.NOW - 86400000, by: p.id };
  }
  return { ...docs, ...extra };
}
function init() {
  if (sessionStorage.getItem('prepAttributionFixture')) return;
  sessionStorage.setItem('prepAttributionFixture', '1');
  const day = new Date(Date.now() + 10 * 3600000).toISOString().slice(0, 10);
  localStorage.setItem('lk.prep.here', JSON.stringify({ d: day, ids: ['bo', 'sam', 'vic', 'disabled', 'fay', 'off', 'removed', 'missing'] }));
  localStorage.setItem('lk.fn.fold', day);
}
const item = (p, id, day = today) => p.evaluate(k => window.__fake.dump()[k] || {}, itemKey(id, day));
const writes = (p, id) => p.evaluate(k => window.__fake.writes.flat().filter(op => op.path === k), itemKey(id));
const completionWrites = async (p, id) => (await writes(p, id)).filter(op => op.data.done === true);
const names = (p, group) => p.locator('#pt-sheet .pt-' + group + ' [data-pt="choose"]').evaluateAll(es => es.map(e => e.getAttribute('data-id')));
async function tick(p, id = 'i1', words = false) {
  await p.locator('#nbr-' + id + (words ? ' .nb-tt' : ' .nb-box')).click();
  await L.settle(p, 250);
}
async function choose(p, id) {
  let choice = p.locator('#pt-sheet [data-pt="choose"][data-id="' + id + '"]');
  if (!(await choice.count()) || !(await choice.isVisible())) {
    await p.locator('#pt-sheet [data-pt="others"]').click(); await L.settle(p, 150);
  }
  await choice.click(); await L.settle(p, 400);
}
const current = p => p.evaluate(() => ({ who: LK_PREP.state.who, uid: LK_PREP.state.uid, authed: LK_PREP.state.authed,
  session: localStorage.getItem('lk.prep.sess'), here: localStorage.getItem('lk.prep.here') }));
const visible = async (p, selector) => !!(await p.locator(selector).count()) && await p.locator(selector).first().isVisible();
const prepared = (d, worker, recorder) => d.done === true && d.preparedById === worker && d.doneById === recorder && d.by === recorder && d.preparedAt > 0 && d.preparedAt === d.doneAt;
async function open(b, options = {}) {
  return L.open(b, '#/prep', { who: 'ann', touch: true, settings: { shared: true }, extra: fixture(), init, wait: 1500, ...options });
}

(async () => {
  const b = await L.start(); let p;
  async function step(label, run) {
    try { await run(); }
    catch (e) { ok(false, label + ': ' + String(e.message || e).split('\n')[0]); }
    finally { if (p) { ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | ')); await p.context().close(); p = null; } }
  }

  // The overlay uses the existing responsive sheet and does not insert or move normal prep rows.
  for (const width of [390, 720, 768, 1280]) await step('sheet ' + width, async () => {
    p = await open(b, { width, height: width === 390 ? 844 : 1000 });
    const before = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.nb-left .nb-row')].map(e => e.id),
      second: document.querySelector('#nbr-i2').getBoundingClientRect().top,
      folded: localStorage.getItem('lk.fn.fold'), band: document.querySelector('#fn-band').textContent }));
    ok(await visible(p, '.nb-tabs') && await visible(p, '#p-text') && !!(await p.$('.nb-right #nb-donebox')), width + ': native sections, Add and Handy remain');
    if (width === 390) ok(!!(await p.$('details.nb-start-l:not([open])')) && await visible(p, '.nb-qadd [data-p="quick"]'), 'phone: collapsed Start here and normal Quick add remain');
    await tick(p);
    const shape = await p.evaluate(() => {
      const wrap = document.getElementById('pt-sheet'), e = wrap && wrap.querySelector('[role="dialog"]');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, vw: innerWidth, vh: innerHeight,
        modal: e.getAttribute('aria-modal'), outside: !document.getElementById('prep-root').contains(wrap),
        focus: e.contains(document.activeElement), text: e.textContent,
        targets: [...e.querySelectorAll('button:not(:disabled)')].filter(x => x.getClientRects().length).map(x => { const q = x.getBoundingClientRect(); return q.height; }) };
    });
    ok(!!shape && shape.modal === 'true' && shape.outside && shape.focus, width + ': native modal is outside the prep root and receives focus');
    if (!shape) return;
    ok(/Who did this\?/.test(shape.text) && /Slice onions/.test(shape.text) && /2 tubs/.test(shape.text), width + ': dialog identifies the exact task and amount');
    ok(shape.left >= -1 && shape.right <= width + 1 && shape.targets.every(h => h >= 44), width + ': dialog fits and choices retain 44 px targets');
    ok(width < 720 ? Math.abs(shape.bottom - shape.vh) <= 1 : shape.width <= 422 && shape.top > 0 && shape.bottom < shape.vh && Math.abs((shape.left + shape.right) / 2 - width / 2) <= 1,
      width + ': phone bottom sheet or centred tablet/desktop dialog');
    const during = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.nb-left .nb-row')].map(e => e.id), second: document.querySelector('#nbr-i2').getBoundingClientRect().top }));
    ok(JSON.stringify(before.rows) === JSON.stringify(during.rows) && Math.abs(before.second - during.second) <= 1, width + ': opening attribution neither inserts nor shifts prep tasks');
    const focusable = '#pt-sheet button:not(:disabled):visible';
    await p.locator(focusable).last().focus(); await p.keyboard.press('Tab');
    ok(await p.evaluate(() => document.querySelector('#pt-sheet [role="dialog"]').contains(document.activeElement)), width + ': Tab stays within the dialog');
    await p.locator(focusable).first().focus(); await p.keyboard.press('Shift+Tab');
    ok(await p.evaluate(() => document.querySelector('#pt-sheet [role="dialog"]').contains(document.activeElement)), width + ': Shift+Tab stays within the dialog');
    await p.keyboard.press('Escape'); await L.settle(p, 300);
    ok(!(await p.$('#pt-sheet')) && !(await item(p, 'i1')).done && !(await completionWrites(p, 'i1')).length, width + ': Escape cancels without a completion');
    ok(await p.evaluate(() => document.activeElement.matches('#nbr-i1 .nb-box')), width + ': Escape returns focus to the original tick');
    ok(await p.evaluate(old => localStorage.getItem('lk.fn.fold') === old.folded && document.querySelector('#fn-band').textContent === old.band, before), width + ': function fold strip is unchanged');
    ok(!(await L.overflow(p)), width + ': no sideways scroll');
  });

  await step('shared attribution and recorder Undo', async () => {
    p = await open(b); const auth = await current(p);
    await tick(p, 'i1', true);
    ok(JSON.stringify(await names(p, 'recent')) === JSON.stringify(['ann', 'bo', 'sam', 'vic', 'disabled']), 'recent choices follow authentic device history and omit inactive, removed and function-only names');
    await p.locator('#pt-sheet [data-pt="others"]').click(); await L.settle(p, 150);
    ok(JSON.stringify(await names(p, 'others')) === JSON.stringify(['lee']), 'Others holds the remaining eligible active member only');
    ok(!(await p.$('#pf1')) && !(await completionWrites(p, 'i1')).length, 'opening names and Others neither asks for a PIN nor completes');
    await choose(p, 'lee');
    const d = await item(p, 'i1');
    ok(prepared(d, 'lee', 'ann') && d.preparedBy === 'Lee' && d.doneBy === 'Ann', 'one name tap saves the reported worker, authenticated recorder and matching cycle time');
    ok(JSON.stringify(await current(p)) === JSON.stringify(auth), 'choosing a worker changes no login, session, UID or genuine sign-in recency');
    ok((await completionWrites(p, 'i1')).length === 1 && !(await p.$('#pt-sheet')), 'one name tap makes one completion and closes the picker');
    await p.locator('.p-toast:not(.p-toast-old) .p-toast-btn').click(); await L.settle(p, 350);
    const undone = await item(p, 'i1');
    ok(undone.done === false && !undone.preparedBy && !undone.preparedById && !undone.preparedAt && !undone.doneById && !(await p.$('#pt-sheet')), 'the staff recorder can use native Undo and clears all attribution without another picker');
    await tick(p, 'i2'); await choose(p, 'vic');
    ok(prepared(await item(p, 'i2'), 'vic', 'ann'), 'a view-only member may be reported as the physical worker without gaining write access');
    await p.locator('.nb-tab-fn').click(); await L.settle(p, 200);
    await tick(p, 'fn-example'); await choose(p, 'bo');
    ok(prepared(await item(p, 'fn-example'), 'bo', 'ann'), 'the existing Functions prep tab uses the same reported-worker flow');
  });

  await step('cancel Back and backdrop', async () => {
    p = await open(b);
    await tick(p, 'i1', true); await p.locator('#pt-sheet [data-pt="cancel"]').click(); await L.settle(p, 300);
    ok(!(await item(p, 'i1')).done && !(await p.$('#pt-sheet')) && await p.evaluate(() => document.activeElement.matches('#nbr-i1 .nb-box')), 'Cancel on a word-tap leaves the job open and focuses its keyboard tick');
    await tick(p); await p.goBack(); await L.settle(p, 350);
    ok(!(await p.$('#pt-sheet')) && await p.evaluate(() => location.hash === '#/prep') && !(await item(p, 'i1')).done, 'native Back closes only the attribution sheet');
    await tick(p); await p.locator('#pt-sheet .sheet-bg').click({ position: { x: 5, y: 5 } }); await L.settle(p, 300);
    ok(!(await p.$('#pt-sheet')) && !(await completionWrites(p, 'i1')).length, 'backdrop cancellation makes no completion');
  });

  await step('personal phone and unrelated work', async () => {
    p = await open(b, { settings: {} });
    await tick(p, 'i1'); await tick(p, 'i2', true);
    ok(!(await p.$('#pt-sheet')) && prepared(await item(p, 'i1'), 'ann', 'ann') && prepared(await item(p, 'i2'), 'ann', 'ann'), 'personal-phone boxes and words stay one tap and record self attribution');
    await p.fill('#p-text', 'Wash parsley'); await p.fill('#p-section', 'Larder'); await p.fill('#p-qty', '2 bunches'); await p.press('#p-text', 'Enter'); await L.settle(p, 350);
    ok(await p.evaluate(() => Object.values(__fake.dump()).some(x => x && x.text === 'Wash parsley' && x.qty === '2 bunches' && x.addedById === 'ann' && !x.preparedById)), 'normal Add retains item, section, quantity and creator without a doer picker');
    await p.goto(L.BASE + '#/waste'); await L.settle(p, 500);
    await p.fill('#w-text', 'Carrot trimmings'); await p.fill('#w-amt', '0.2');
    await p.evaluate(() => (document.querySelector('.w-rchips [data-v="prep"]') || document.querySelector('[data-p="wreason"][data-v="prep"]')).click());
    await p.locator('.w-add .nb-addbtn').click(); await L.settle(p, 350);
    ok(!(await p.$('#pt-sheet')) && await p.evaluate(() => Object.values(__fake.dump()).some(x => x && x.text === 'Carrot trimmings' && x.addedById === 'ann' && !x.preparedById)), 'Wastage retains its ordinary logging flow and logger');
  });

  await step('genuine sign-ins reorder choices', async () => {
    p = await open(b); const initial = (await current(p)).here;
    await p.locator('[data-p="who-change"]').first().click(); await L.settle(p, 300);
    await p.locator('.p-name[data-id="bo"]').click(); await L.settle(p, 250);
    await p.fill('#pf1', '9999'); await L.settle(p, 500);
    ok(await p.evaluate(old => localStorage.getItem('lk.prep.here') === old, initial), 'a wrong personal PIN never updates device sign-in recency');
    await p.clock.runFor(21000); await p.fill('#pf1', '3333'); await L.settle(p, 1000);
    await tick(p);
    ok((await names(p, 'recent')).slice(0, 3).join(',') === 'bo,ann,sam', 'a successful personal sign-in moves that authenticated member to the front');
    await p.keyboard.press('Escape'); await L.settle(p, 200);
    await p.reload(); await L.settle(p, 1200); await tick(p);
    ok((await names(p, 'recent')).slice(0, 3).join(',') === 'bo,ann,sam', 'restoring the genuine session preserves the recency order');
  });

  // Another device or an access change cannot turn an open picker into a write for a different task or identity.
  for (const kind of ['completed', 'deleted', 'quantity changed', 'worker removed', 'recorder revoked', 'sign out', 'route', 'date']) await step('stale ' + kind, async () => {
    p = await open(b, kind === 'date' ? { who: 'sam', extra: fixture({ [itemKey('i1', tomorrow)]: { text: 'Tomorrow onions', qty: '1 tub', station: 'Larder', done: false, deleted: false, addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW } }) } : {}); await tick(p);
    if (['completed', 'deleted', 'quantity changed'].includes(kind)) await p.evaluate(({ k, kind, at }) => {
      const old = __fake.dump()[k]; __fake.write(k, { ...old, ...(kind === 'deleted' ? { deleted: true } : kind === 'quantity changed' ? { qty: '9 tubs' } : { done: true, doneBy: 'Sam', doneById: 'sam', doneAt: at }) });
    }, { k: itemKey('i1'), kind, at: L.NOW + 1 });
    if (kind === 'worker removed' || kind === 'recorder revoked') await p.evaluate(({ k, kind }) => {
      const c = __fake.dump()[k]; __fake.write(k, { ...c, people: c.people.map(x => x.id === (kind === 'worker removed' ? 'bo' : 'ann') ? { ...x, ...(kind === 'worker removed' ? { active: false } : { tick: false }) } : x) });
    }, { k: key('config', 'main'), kind });
    if (kind === 'sign out') await p.evaluate(() => LK_PREP.signOut(true, true));
    if (kind === 'route') await p.goto(L.BASE + '#/orders');
    if (kind === 'date') await p.evaluate(day => { const e = document.getElementById('p-day'); e.value = day; e.dispatchEvent(new Event('change', { bubbles: true })); }, tomorrow);
    await L.settle(p, 350);
    const choice = p.locator('#pt-sheet [data-pt="choose"][data-id="bo"]');
    if (await choice.count() && await choice.isVisible() && await choice.isEnabled()) await choice.click();
    await L.settle(p, 300);
    ok(!(await completionWrites(p, 'i1')).length, kind + ': stale choice makes no completion write');
    const d = await item(p, 'i1');
    if (kind === 'completed') ok(d.doneById === 'sam' && d.doneAt === L.NOW + 1 && !d.preparedById, 'another device\'s completion is not overwritten');
    if (kind === 'deleted') ok(d.deleted === true && !d.done, 'a deleted line stays removed and unticked');
    if (kind === 'quantity changed') ok(d.qty === '9 tubs' && !d.done, 'a changed quantity must be reviewed before the job can be ticked');
    if (kind === 'date') ok(!(await item(p, 'i1', tomorrow)).done && !(await p.$('#pt-sheet')), 'changing the viewed date closes attribution without writing a same-ID job');
    if (kind === 'sign out') ok(!(await p.$('#pt-sheet')) && !(await p.$('.nb-row')), 'sign-out removes the picker and private list');
  });

  await step('connection failure and retry', async () => {
    p = await open(b); await tick(p);
    await p.evaluate(() => { __fake.mode = 'fail'; }); await choose(p, 'bo');
    ok(!(await item(p, 'i1')).done && !!(await p.$('#pt-sheet [data-pt="retry"]')), 'a failed save leaves the item open and offers retry in its task context');
    ok(!/Ticked/.test(await L.txt(p, '.p-toast') || ''), 'a refused connection is never announced as a successful tick');
    await p.evaluate(() => { __fake.mode = 'ok'; }); await p.locator('#pt-sheet [data-pt="retry"]').click(); await L.settle(p, 500);
    ok(prepared(await item(p, 'i1'), 'bo', 'ann') && !(await p.$('#pt-sheet')), 'retry saves the same selected worker and recorder once the signal returns');
  });

  await step('pending and acknowledgement deduplication', async () => {
    p = await open(b); await tick(p); await p.evaluate(() => { __fake.mode = 'hold'; });
    await p.locator('#pt-sheet [data-pt="choose"][data-id="bo"]').click(); await L.settle(p, 250);
    await p.evaluate(() => { document.querySelector('#pt-sheet [data-pt="choose"][data-id="bo"]')?.click(); document.querySelector('#nbr-i1 .nb-box')?.click(); });
    ok((await completionWrites(p, 'i1')).length === 1 && await p.evaluate(() => LK_PREP.unsent()), 'repeated taps during a pending write create one completion and keep unsent state');
    ok(!/Ticked/.test(await L.txt(p, '.p-toast') || ''), 'a locally pending snapshot is not announced as success');
    ok(await p.locator('#nbr-i1 .nb-box').getAttribute('aria-pressed') === 'false' && !(await p.$('.nb-done [data-ln="' + today + '/i1"]')), 'a locally pending completion stays visibly open until acknowledged');
    await p.keyboard.press('Escape'); await p.goBack(); await L.settle(p, 250);
    ok(!!(await p.$('#pt-sheet')) && await p.evaluate(() => location.hash === '#/prep'), 'Escape and native Back keep the task context while its save is pending');
    await p.evaluate(() => __fake.ack()); await L.settle(p, 250);
    await p.evaluate(() => { document.querySelector('#pt-sheet [data-pt="choose"][data-id="bo"]')?.click(); document.querySelector('#nbr-i1 .nb-box')?.click(); });
    ok((await completionWrites(p, 'i1')).length === 1, 'listener acknowledgement while the promise waits cannot submit the completion twice');
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); }); await L.settle(p, 500);
    ok(prepared(await item(p, 'i1'), 'bo', 'ann') && (await completionWrites(p, 'i1')).length === 1 && !(await p.$('#pt-sheet')), 'one acknowledged save retains both identities and closes normally');
  });

  await step('lost acknowledgement', async () => {
    p = await open(b); await tick(p);
    const before = await p.evaluate(k => (__fake.dump()[k] || {}).ticked || 0, key('activity', 'ann'));
    await p.evaluate(target => {
      const fs = LK_PREP.book().fs(), original = fs.writeBatch;
      fs.writeBatch = function (...args) {
        const batch = original.apply(this, args), update = batch.update, commit = batch.commit; let selected = false;
        batch.update = function (ref, data) { const path = Array.isArray(ref.path) ? ref.path.join('/') : ref.path; if (path === target && data.done === true) selected = true; return update.call(this, ref, data); };
        batch.commit = function () { return commit.call(this).then(value => { if (selected && !window.__lostPrepAck) { window.__lostPrepAck = true; return Promise.reject({ code: 'unavailable' }); } return value; }); };
        return batch;
      };
    }, itemKey('i1'));
    await choose(p, 'bo');
    ok(await p.evaluate(() => window.__lostPrepAck === true), 'the test loses the acknowledgement after the target completion reaches the server');
    const retry = p.locator('#pt-sheet [data-pt="retry"]');
    if (await retry.count() && await retry.isEnabled()) { await retry.click(); await L.settle(p, 500); }
    const attempts = await completionWrites(p, 'i1');
    ok(prepared(await item(p, 'i1'), 'bo', 'ann') && !(await p.$('#pt-sheet')), 'a saved completion with a lost acknowledgement is reconciled without a false stale failure');
    ok(new Set(attempts.map(x => x.data.preparedAt)).size === 1, 'lost acknowledgement retains the same logical completion cycle');
    ok(await p.evaluate(({ k, before }) => ((__fake.dump()[k] || {}).ticked || 0) - before === 1, { k: key('activity', 'ann'), before }), 'lost acknowledgement credits the recorder exactly once');
  });

  await step('enlarged phone text', async () => {
    p = await open(b, { settings: { shared: true, text: 'xlarge' } }); await tick(p);
    await p.locator('#pt-sheet [data-pt="others"]').click(); await L.settle(p, 150);
    const cancel = p.locator('#pt-sheet button[data-pt="cancel"]'); await cancel.scrollIntoViewIfNeeded();
    ok(await cancel.evaluate(e => { const r = e.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.height >= 44 && r.top >= 0 && r.bottom <= innerHeight && (hit === e || e.contains(hit)); }), 'extra-large phone text keeps Cancel fully reachable with a 44 px target');
    ok(!(await L.overflow(p)), 'extra-large phone choices do not cause sideways overflow');
    await cancel.click(); await L.settle(p, 250);
    ok(!(await item(p, 'i1')).done, 'enlarged-text cancellation still leaves the task open');
  });

  await step('native line details keep both identities', async () => {
    p = await open(b, { who: 'sam' }); await tick(p); await choose(p, 'bo');
    await p.locator('#nbr-i1 .nb-more').click(); await L.settle(p, 200);
    const detail = await p.locator('#lm-sheet').innerText();
    ok(/Bo/.test(detail) && /Sam/.test(detail) && !/Written by Bo/.test(detail), 'the existing mobile line menu distinguishes the reported worker from its recorder');
    await p.keyboard.press('Escape'); await L.settle(p, 200);
    ok(!(await p.$('#lm-sheet')) && !(await p.$('#pt-sheet')), 'the native line menu still closes independently of attribution');
  });

  await step('legacy stale metadata and worker Undo limits', async () => {
    const legacy = { text: 'Slice onions', station: 'Larder', qty: '2 tubs', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 3600000,
      done: true, doneBy: 'Ann', doneById: 'ann', doneAt: L.NOW - 1000, preparedBy: 'Bo', preparedById: 'bo', preparedAt: L.NOW - 60000, deleted: false, by: 'ann' };
    p = await open(b, { who: 'bo', extra: fixture({ [itemKey('i1')]: legacy }) });
    const done = p.locator('.nb-done [data-ln="' + today + '/i1"]');
    ok((await done.locator('.nb-dw').innerText()).includes('Ann') && !(await done.locator('.nb-dw').innerText()).includes('Bo'), 'an old-client re-tick ignores inherited attribution from another completion cycle');
    ok(!(await done.locator('[data-p="tick"]').count()), 'being the reported worker does not grant the authenticated recorder\'s native Undo');
    await p.context().close(); p = await open(b, { settings: {}, extra: fixture({ [itemKey('i1')]: { ...legacy, done: false, doneAt: 0, doneBy: '', doneById: '' } }) });
    await tick(p);
    ok(prepared(await item(p, 'i1'), 'ann', 'ann'), 'a new personal-phone completion replaces stale legacy metadata with its own cycle');
  });

  for (const who of ['vic', 'fay']) await step('actor permissions ' + who, async () => {
    p = await open(b, { who });
    const button = p.locator('#nbr-i1 .nb-box');
    if (await button.count()) ok(await button.isDisabled(), who + ': the native tick stays disabled');
    await p.evaluate(() => document.querySelector('#nbr-i1 .nb-box')?.click()); await L.settle(p, 200);
    ok(!(await p.$('#pt-sheet')) && !(await completionWrites(p, 'i1')).length, who + ': an ineligible actor cannot open attribution or complete work');
  });

  await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
