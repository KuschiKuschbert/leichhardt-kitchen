// List actions preserve saved bookings and audit history. People and bookings here are made up.
const L = require('./lib'), M = require('../js/functions.js'), { R, ok } = L.results();
const key = id => ['kitchens', L.PIN, 'functions', id].join('/');
const cfgKey = ['kitchens', L.PIN, 'config/main'].join('/');
const day = L.ymd(new Date(L.NOW));
function fixture() {
  const base = M.derive({ v: 1, status: 'draft', name: 'Example draft', date: day, start: 0, loc: 'Garden', guests: 0, mode: 'all', lines: [], rounds: [], notes: 'Keep these notes', kc: '', kcBy: '', kcAt: 0, was: {}, chg: [], cBy: 'fay', cAt: 1, by: 'fay', upd: 1, od: '' });
  return {
    [cfgKey]: { people: [{ id: 'fay', name: 'Fay', role: 'fnc', active: true }, { id: 'ann', name: 'Ann', role: 'staff', active: true }], staffIds: ['fay', 'ann'], fnIds: ['fay'], fnOnlyIds: ['fay'] },
    [key('draft')]: base,
    [['kitchens', L.PIN, 'pinset/fay'].join('/')]: { at: 1 },
    [['kitchens', L.PIN, 'staffpins/fay'].join('/')]: { hash: L.sha('lk:fay:5151') },
    [key('cancelled')]: Object.assign({}, base, { status: 'cancelled', name: 'Example cancelled' }),
    [key('active')]: M.derive(Object.assign({}, base, { status: 'confirmed', name: 'Example active', start: M.kat(day, 1080), guests: 20, confAt: 1, rounds: [{ at: M.kat(day, 1110), note: '' }], lines: [{ rid: 'pizza-platter', name: 'Pizza platter', qty: 1, unit: 'platter', u: [0], spec: '', fp: '' }] })),
    [['kitchens', L.PIN, 'fncontact/draft'].join('/')]: { cname: 'Customer', phone: '0400 000 000', email: 'example@example.com', upd: 1 }
  };
}
const button = (id, action = 'remove-row') => '[data-fe="' + action + '"][data-id="' + id + '"]';
const dump = p => p.evaluate(() => __fake.dump());
async function list(b, width = 390) {
  const p = await L.open(b, '#/functions', { who: 'fay', extra: fixture(), width });
  await L.waitFor(p, () => !!document.querySelector('[data-fe="remove-row"]'));
  return p;
}
(async () => {
  const b = await L.start(); let p;
  try {
    for (const width of [390, 768, 1280]) {
      p = await list(b, width);
      ok(!!await p.$(button('draft')) && !await p.$(button('active')) && !!await p.$('[data-fe="status"][data-id="active"]'), width + ': draft has Delete and active booking has Cancel');
      ok(!await L.overflow(p), width + ': actions fit without sideways scrolling');
      ok(await p.locator(button('draft')).evaluate(button => {
        const bar = button.closest('li').getBoundingClientRect(), action = button.getBoundingClientRect();
        const link = button.closest('li').querySelector('.fe-row').getBoundingClientRect();
        return action.left >= link.right - 1 && action.top >= bar.top && action.bottom <= bar.bottom && Math.abs((action.top + action.bottom - bar.top - bar.bottom) / 2) < 2;
      }), width + ': Delete is at the right end inside the same function bar');
      ok(await p.locator('[data-fe="status"][data-id="active"]').evaluate(button => {
        const bar = button.closest('li').getBoundingClientRect(), action = button.getBoundingClientRect();
        return action.top >= bar.top && action.bottom <= bar.bottom && action.left > bar.left + bar.width / 2;
      }), width + ': Cancel is inline at the right end of the function bar');
      if (process.env.LK_ACTION_SHOTS) await p.screenshot({ path: '/tmp/function-actions-' + width + '.png', fullPage: true });
      await p.click('[data-fe="chip"][data-v="cancelled"]');
      ok(!!await p.$(button('cancelled')), width + ': cancelled card has Delete');
      await p.context().close(); p = null;
    }
    p = await list(b);
    const before = await dump(p);
    await p.focus(button('draft')); await p.keyboard.press('Enter');
    ok(!(await dump(p))[key('draft')].removed && /Tap again to delete/.test(await p.locator(button('draft')).innerText()), 'first tap only asks for confirmation on the same card');
    ok(await p.$eval(button('draft'), e => e === document.activeElement && /Tap again/.test(e.getAttribute('aria-label'))), 'confirmation keeps keyboard focus and announces its second action');
    await p.keyboard.press('Enter');
    await L.waitFor(p, k => __fake.dump()[k].removed === true, key('draft'));
    let data = await dump(p);
    ok(data[key('draft')].v === 2 && JSON.stringify(data[key('draft') + '/hist/1'].was) === JSON.stringify(before[key('draft')]), 'deletion keeps an exact previous version');
    ok(data[key('draft')].notes === 'Keep these notes' && JSON.stringify(data[key('active')]) === JSON.stringify(before[key('active')]), 'deletion preserves details and other bookings');
    ok(JSON.stringify(data[['kitchens', L.PIN, 'fncontact/draft'].join('/')]) === JSON.stringify(before[['kitchens', L.PIN, 'fncontact/draft'].join('/')]), 'customer contact is untouched');
    ok(!await p.$('a.fe-row[href="#/functions/draft"]'), 'deleted function leaves normal list');
    await p.click('[data-fe="chip"][data-v="all"]');
    ok(!await p.$('a.fe-row[href="#/functions/draft"]'), 'All excludes deleted functions');
    await p.click('[data-fe="chip"][data-v="deleted"]');
    await p.click(button('draft', 'restore-row'));
    await L.waitFor(p, k => __fake.dump()[k].removed === false, key('draft'));
    data = await dump(p);
    ok(data[key('draft')].status === 'cancelled' && data[key('draft')].v === 3 && data[key('draft') + '/hist/2'].was.removed, 'Restore retains deletion history and leaves booking cancelled');
    await p.click('[data-fe="chip"][data-v="cancelled"]');
    ok(!!await p.$('a.fe-row[href="#/functions/draft"]') && !await p.$('[data-fe="status"][data-id="draft"][data-v="undo"]'), 'restored booking is listed as cancelled without service Undo');
    ok(!await p.evaluate(() => __fake.readLog.some(k => /\/fncontact\//.test(k))), 'list actions never read contacts');
    ok(!p.errors.length, 'delete and restore cause no page errors');
    await p.context().close(); p = null;

    p = await list(b);
    await p.evaluate(() => { __fake.failReads = /\/functions\/draft$/; });
    await p.click(button('draft')); await p.click(button('draft')); await L.settle(p, 400);
    ok(!(await dump(p))[key('draft')].removed && !(await dump(p))[key('draft') + '/hist/1'], 'failed server read makes no change or history');
    await p.context().close(); p = null;

    p = await list(b);
    await p.evaluate(k => {
      const book = LK_PREP.book;
      LK_PREP.book = function () {
        const api = book(), write = api.W;
        api.W = function (ops) {
          __fake.write(k, Object.assign({}, __fake.dump()[k], { v: 2, notes: 'Changed elsewhere' }));
          return write(ops);
        };
        return api;
      };
    }, key('draft'));
    await p.click(button('draft')); await p.click(button('draft')); await L.settle(p, 400);
    data = await dump(p);
    ok(!data[key('draft')].removed && data[key('draft')].notes === 'Changed elsewhere' && !data[key('draft') + '/hist/2'], 'stale list cannot delete a newer booking');
    await p.context().close(); p = null;

    p = await list(b);
    await p.evaluate(() => { __fake.mode = 'deny'; });
    await p.click(button('draft')); await p.click(button('draft')); await L.settle(p, 400);
    data = await dump(p);
    ok(!data[key('draft')].removed && !data[key('draft') + '/hist/1'] && /Not changed/.test(await p.locator('body').innerText()), 'refused write preserves booking and shows failure');
    await p.context().close(); p = null;

    p = await list(b);
    await p.evaluate(() => {
      const book = LK_PREP.book;
      LK_PREP.book = function () { const api = book(), write = api.W; api.W = function (ops) { __fake.mode = 'hold'; return write(ops); }; return api; };
    });
    await p.click(button('draft')); await p.click(button('draft')); await L.settle(p, 150);
    ok(await p.$eval(button('draft'), e => e.disabled) && !/Deleted from the list/.test(await p.locator('body').innerText()), 'pending deletion disables repeated taps and has no premature success');
    await p.evaluate(() => { __fake.mode = 'ok'; __fake.release(); });
    await L.waitFor(p, k => __fake.dump()[k].removed, key('draft'));
    ok(await p.evaluate(k => __fake.writes.filter(batch => batch.some(op => op.path === k)).length === 1, key('draft')), 'repeated taps save exactly one deletion version');
    await p.context().close(); p = null;

    p = await list(b);
    await p.click(button('draft'));
    await p.evaluate(k => __fake.write(k, Object.assign({}, __fake.dump()[k], { fnIds: [] })), cfgKey);
    await L.settle(p, 350);
    ok(!await p.$('[data-fe="remove-row"]') && !(await dump(p))[key('draft')].removed, 'revoking edit permission removes list actions before confirmation');
    await p.context().close(); p = null;
  } finally { if (p && !p.isClosed()) await p.context().close(); await b.close(); }
  L.report(R);
})().catch(e => { console.error(e); process.exitCode = 1; });
