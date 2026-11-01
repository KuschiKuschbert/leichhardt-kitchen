// Real privacy locks hide lazy editors without losing the original person's drafts or pending save callbacks.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...p) => ['kitchens', L.PIN, ...p].join('/');
const day = L.ymd(new Date(L.NOW)), cutoff = Date.parse(day + 'T04:00:00+10:00');
const person = (id, name, role) => ({ id, name, role, active: true, add: true, tick: true, del: role !== 'staff' });
const extra = { [key('config', 'main')]: {
  people: [person('ann', 'Ann', 'head'), person('sam', 'Sam', 'sous'), person('bo', 'Bo', 'staff')],
  headId: 'ann', staffIds: ['ann', 'sam', 'bo'], sousIds: ['ann', 'sam'], pingIds: ['ann', 'sam'], fnIds: ['ann', 'sam'], showBadges: true
} };
const cases = [
  { name: 'recipe', hash: '#/manage/r/burger', field: '#mg-name', save: '[data-mg="save"]', value: 'Private recipe draft', module: 'LK_MG' },
  { name: 'function', hash: '#/functions/new', field: '#fe-name', save: '[data-fe="save"]', value: 'Private function draft', module: 'LK_FE' },
  { name: 'drawing', hash: '#/manage/draw/new/burger/plate', field: '.dw-svg', save: '[data-dw="save"]', module: 'LK_DRAW' }
];
async function prepare(b, c, boundary) {
  const p = await L.open(b, c.hash, { who: 'ann', deviceMode: boundary === 'idle' ? 'shared' : 'personal', extra,
    width: c.name === 'drawing' ? 1280 : 390, clock: boundary === 'daily' ? cutoff - 60000 : L.NOW, wait: 900 });
  await L.waitFor(p, s => !!document.querySelector(s), c.field, 15000);
  if (c.name === 'drawing') {
    await p.fill('#dw-q', 'rump');
    await p.click('.dw-tile[data-v="rump"]');
    await p.click('[data-dw="dup"]');
  } else {
    await p.fill(c.field, c.value);
    if (c.name === 'function') await p.fill('[data-ff="phone"]', '0400 000 000');
  }
  await L.settle(p, 500);
  return p;
}
async function unlock(p, id = 'ann', pin = '2222') {
  const name = p.locator('.p-name[data-id="' + id + '"]');
  if (await name.count() && await name.isVisible()) await name.click();
  await p.fill('#pf1', pin);
  await L.waitFor(p, expected => LK_PREP.privateAccess() && LK_PREP.state.who === expected, id, 8000);
}
async function snapshot(p, c) {
  if (c.name === 'drawing') return p.evaluate(() => {
    const w = LK_DRAW.state(); return JSON.stringify({ d: w.d, sel: w.sel, undo: w.undo, redo: w.redo, view: w.view, panel: w.panel, q: w.q });
  });
  return p.evaluate(sel => [...document.querySelectorAll(sel)].map(el => [el.getAttribute('data-f') || el.getAttribute('data-ff'), el.value]), c.name === 'recipe' ? '[data-f]' : '[data-ff]');
}
async function lock(p, boundary) {
  await p.evaluate(() => { window.__editorMark = 1; if (document.activeElement) document.activeElement.blur(); });
  await p.clock.fastForward(boundary === 'daily' ? 90000 : 11 * 60000);
  await L.waitFor(p, () => !!LK_PREP.workLock() && !LK_PREP.privateAccess());
  await L.settle(p, 250);
}
(async () => {
  const b = await L.start();
  for (const c of cases) for (const boundary of ['daily', 'idle']) {
    const label = c.name + ' ' + boundary, p = await prepare(b, c, boundary);
    const before = await snapshot(p, c);
    ok(await p.evaluate(mod => window[mod].dirty(), c.module), label + ': actual changes begin dirty');
    await lock(p, boundary);
    ok(!(await p.locator(c.field).count()) && await p.evaluate(() => window.__editorMark === 1), label + ': lock hides the editor without reloading its work');
    ok(await p.evaluate(mod => window[mod].dirty() && LK_PREP.dirtyForUpdate() && LK_PREP.blockedRecorder() === 'ann', c.module), label + ': hidden work stays dirty and bound to its original person');
    const other = p.locator('.p-name[data-id="sam"]');
    if (await other.count() && await other.isVisible() && await other.isEnabled()) await other.click();
    ok(await p.evaluate(() => !LK_PREP.privateAccess() && LK_PREP.workLock().person === 'ann') && !(await p.locator(c.field).count()), label + ': another person cannot open or replace the hidden draft');
    await unlock(p);
    await L.waitFor(p, s => !!document.querySelector(s), c.field, 8000);
    ok(JSON.stringify(await snapshot(p, c)) === JSON.stringify(before), label + ': the same-person PIN restores the exact active draft and editor state');
    ok(await p.evaluate(mod => window[mod].dirty(), c.module), label + ': returning work remains unsaved until its actual save');
    ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  for (const c of cases) {
    const label = c.name + ' pending daily', p = await prepare(b, c, 'daily');
    await p.evaluate(() => { __fake.mode = 'hold'; });
    await p.click(c.save);
    await L.waitFor(p, () => LK_PREP.unsent(), null, 8000);
    await lock(p, 'daily');
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
    await L.settle(p, 300);
    ok(await p.evaluate(() => LK_PREP.unsent() && !LK_PREP.privateAccess() && window.__editorMark === 1), label + ': acknowledgement and callbacks wait behind the original PIN');
    ok(!(await p.locator(c.field).count()) && !(await p.locator('.mg-toasts .p-toast, .fe-toasts .p-toast').count()), label + ': pending completion exposes neither the editor nor a success toast');
    await unlock(p);
    await L.waitFor(p, () => !LK_PREP.unsent(), null, 15000);
    await L.waitFor(p, s => !!document.querySelector(s), c.field, 8000);
    await L.settle(p, 500);
    const saved = await p.evaluate(name => Object.entries(__fake.dump()).filter(([path, data]) => {
      if (!data || data.by !== 'ann') return false;
      if (name === 'recipe') return /\/recipes\/burger$/.test(path) && data.r && data.r.name === 'Private recipe draft';
      if (name === 'function') return /\/functions\/[^/]+$/.test(path) && data.name === 'Private function draft';
      return /\/drawings\/[^/]+$/.test(path) && data.els && data.els.length === 2;
    }).length, c.name);
    ok(saved === 1, label + ': the original payload is saved once as its original writer');
    ok(await p.evaluate(mod => !window[mod].dirty(), c.module), label + ': the acknowledgement updates the retained editor to its saved baseline');
    ok(!(await p.locator(c.save).isEnabled()), label + ': the restored unchanged editor cannot create a duplicate save');
    ok(!p.errors.length, label + ': no browser errors ' + p.errors.join(' | '));
    await p.context().close();
  }
  // A deliberate discard on a shared screen still clears private contacts before the next permitted manager arrives.
  const c = cases[1], p = await prepare(b, c, 'idle');
  await p.click('.wtop-who'); await p.click('.wm [data-who="out"]'); await p.click('.wm [data-who="out"]');
  await p.evaluate(() => { location.hash = '#/prep'; }); await L.settle(p, 400);
  await unlock(p, 'sam', '1111');
  await p.evaluate(() => { location.hash = '#/functions/new'; });
  await L.waitFor(p, () => !!document.querySelector('#fe-name'));
  ok(await p.inputValue('#fe-name') === '' && await p.inputValue('[data-ff="phone"]') === '' && !await p.evaluate(() => LK_FE.dirty()), 'explicit hand-over gives the next permitted manager a clean function and contact form');
  await p.context().close(); await b.close(); L.report(R);
})().catch(e => { console.error(e); console.log(R.join('\n')); process.exit(1); });
