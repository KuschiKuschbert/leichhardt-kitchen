// The chosen open notebook: one responsive add form, readable jobs and the same lazy Done read.
// Synthetic chef jobs only. Permissions and every save/recovery path remain in todo.test.js.
const L = require('./lib');
const { R, ok } = L.results();
const fsKey = p => ['kitchens', L.PIN].concat(p).join('/');
const job = (id, values) => ({ [fsKey(['todos', id])]: Object.assign({ text: 'Job ' + id, st: 'open', due: '', for: '', from: 'sam', at: L.NOW - 3600000, doneAt: 0, doneBy: '', upd: L.NOW - 3600000, by: 'sam' }, values) });
const fixture = Object.assign({},
  job('hood', { text: 'Book the hood clean', due: '2020-01-01' }),
  job('tongs', { text: 'Order new tongs', for: 'sam' }),
  job('roster', { text: 'Check next week\'s roster' }),
  job('seals', { text: 'Call the fridge tech about the cool room door seal' }),
  job('labels', { text: 'Restock labels for the evening service' }),
  job('long', { text: 'Restock-the-' + 'x'.repeat(160), due: '2026-09-30', for: 'sam' }),
  job('done', { text: 'Fixed the dishwasher', st: 'done', doneAt: L.NOW - 7200000, doneBy: 'sam' }));
const todoReads = p => p.evaluate(() => (window.__fake.reads || []).filter(k => /\/todos(\/|$)/.test(k)).length);
const state = p => p.evaluate(() => ({
  forms: document.querySelectorAll('.todo-add').length,
  text: document.querySelector('[data-k="todo-text"]').value,
  due: document.querySelector('[data-k="todo-due"]').value,
  assigned: (document.querySelector('[data-p="todo-for"][aria-pressed="true"]') || {}).dataset?.v
}));
async function ready(p) {
  await L.waitFor(p, () => document.querySelectorAll('[data-lv="todo"] .todo-row').length === 6, null, 6000);
}
async function layout(p) {
  return p.evaluate(() => {
    const rect = selector => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const details = document.querySelector('.todo-more');
    const dates = [...document.querySelectorAll('[data-lv="todo"] .todo-row')].filter(row => row.querySelector('.todo-due')).map(row => {
      const text = row.querySelector('.todo-text').getBoundingClientRect(), due = row.querySelector('.todo-due').getBoundingClientRect();
      return due.top >= text.bottom - 1;
    });
    const targets = [...document.querySelectorAll('[data-lv="todo"] [data-p="todo-tick"], [data-lv="todo"] [data-p="todo-edit"], [data-lv="todo"] [data-p="todo-del"]')].map(e => {
      const r = e.getBoundingClientRect(); return { action: e.dataset.p, width: r.width, height: r.height };
    });
    return {
      notebook: !!document.querySelector('.todo-page.todo-notebook .todo-book .todo-bookhead'),
      forms: document.querySelectorAll('.todo-add').length,
      work: rect('.todo-work'), form: rect('.todo-add'), list: rect('.todo-list'),
      spine: rect('.todo-spine'), decorativeSpine: !!document.querySelector('.todo-spine[aria-hidden="true"]'),
      doneInWork: !!document.querySelector('.todo-work .todo-donebox'),
      details: !!details && details.getClientRects().length > 0,
      blankDisabled: !!document.querySelector('[data-p="todo-save"]:disabled'), dates, targets
    };
  });
}
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    const p = await L.open(b, '#/todo', { who: 'sam', extra: fixture, width, wait: 1200 });
    await ready(p);
    const m = await layout(p);
    ok(m.notebook && m.forms === 1 && m.doneInWork && m.decorativeSpine, width + ': one notebook, one add form and Done inside the jobs sheet; spine is decorative');
    if (width >= 1100) {
      ok(!!m.work && !!m.form && m.form.x >= m.work.right - 1 && m.form.y < m.work.bottom && m.work.y < m.form.bottom && !!m.spine && m.spine.width > 0, width + ': the add form is beside the jobs, joined by a visible spine');
    } else {
      ok(!!m.work && !!m.form && !!m.list && m.form.bottom <= m.list.y + 1 && Math.abs(m.form.x - m.work.x) <= 2 && (!m.spine || m.spine.width === 0 || m.spine.height === 0), width + ': one sheet puts the add form above the jobs and hides the spine');
    }
    ok(m.details === (width >= 1100) && m.blankDisabled, width + ': blank optional details follow the layout and Add is disabled');
    ok(m.dates.length === 2 && m.dates.every(Boolean), width + ': each due date sits beneath its job words');
    const small = m.targets.filter(t => t.width < 44 || t.height < 44);
    ok(m.targets.length === 18 && small.length === 0, width + ': tick, Change and Remove have at least 44 by 44 px hit areas' + (small.length ? ' (' + JSON.stringify(small) + ')' : ''));
    const over = await L.overflow(p);
    ok(!over, width + ': the notebook has no sideways scroll (' + over + ')');

    // Stress the rendered date label too: the production formatter currently uses short weekday/month words.
    await p.evaluate(() => {
      document.documentElement.setAttribute('data-text', 'xlarge');
      const row = document.querySelector('[data-p="todo-tick"][data-id="long"]').closest('.todo-row');
      row.querySelector('.todo-due').textContent = 'Was due Wednesday 30 September 2026';
    });
    await L.settle(p, 150);
    const wrapping = await p.evaluate(() => {
      const row = document.querySelector('[data-p="todo-tick"][data-id="long"]').closest('.todo-row');
      const text = row.querySelector('.todo-text'), due = row.querySelector('.todo-due'), body = row.querySelector('.todo-body');
      const range = document.createRange(); range.selectNodeContents(text);
      const tr = text.getBoundingClientRect(), dr = due.getBoundingClientRect(), br = body.getBoundingClientRect();
      return range.getClientRects().length > 1 && text.scrollWidth <= text.clientWidth + 1 && due.scrollWidth <= due.clientWidth + 1 && dr.top >= tr.bottom - 1 && dr.right <= br.right + 1;
    });
    const largeOver = await L.overflow(p);
    ok(wrapping && !largeOver, width + ': long words and a long date wrap beneath the job at the largest text size (' + largeOver + ')');
    ok(p.errors.length === 0, width + ': no page errors ' + p.errors.join(' | '));
    await p.context().close();
  }

  // Resize the active draft through both layouts. The optional choices and a service redraw use the same state.
  const p = await L.open(b, '#/todo', { who: 'sam', extra: fixture, width: 390, wait: 1200 });
  await ready(p);
  await p.fill('[data-k="todo-text"]', 'Call the fridge tech before the evening service');
  await p.fill('[data-k="todo-due"]', '2026-11-13');
  await L.tap(p, '[data-p="todo-for"][data-v="sam"]'); await L.settle(p, 150);
  const expected = { forms: 1, text: 'Call the fridge tech before the evening service', due: '2026-11-13', assigned: 'sam' };
  ok(JSON.stringify(await state(p)) === JSON.stringify(expected), 'draft: words, date and assignee are held by the one add form');
  const before = await todoReads(p);
  for (const width of [1280, 768, 390]) {
    await p.setViewportSize({ width, height: 844 }); await L.settle(p, 180);
    ok(JSON.stringify(await state(p)) === JSON.stringify(expected), 'draft: one form retains every choice after resizing to ' + width);
  }
  ok(before === 1 && await todoReads(p) === before && !(await p.$('[data-lv="tododone"]')), 'reads: resizing reads neither open jobs again nor the unopened Done list');
  await p.evaluate(k => {
    document.querySelector('[data-k="todo-text"]').dataset.redrawProbe = 'before';
    window.__fake.write(k, { text: 'Slice onions', station: 'Larder', qty: '', recipe: '', addedBy: 'Ann', addedById: 'ann', addedAt: Date.now(), done: false, deleted: false });
  }, fsKey(['days', L.ymd(new Date(L.NOW)), 'items', 'notebook-redraw']));
  await L.waitFor(p, () => !document.querySelector('[data-k="todo-text"]').dataset.redrawProbe, null, 4000);
  ok(JSON.stringify(await state(p)) === JSON.stringify(expected), 'draft: an unrelated service redraw retains words, date and assignee in one form');
  ok(await todoReads(p) === before, 'reads: the service redraw keeps Done lazy and reuses the current open list');
  await p.click('.todo-donebox summary');
  await L.waitFor(p, () => !!document.querySelector('[data-lv="tododone"] [data-id="done"]'), null, 6000);
  ok(await todoReads(p) === before + 1, 'reads: opening Done makes its first read and shows the completed fixture job');
  ok(JSON.stringify(await state(p)) === JSON.stringify(expected), 'draft: opening Done keeps the same unfinished job and optional choices');
  ok(p.errors.length === 0, 'draft: no page errors ' + p.errors.join(' | '));
  await p.context().close();
  await b.close();
  L.report(R);
})().catch(e => { console.log(R.join('\n')); console.error(e); process.exit(1); });
