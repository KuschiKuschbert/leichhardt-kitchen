// A report read captured before a manual repair must not replace its acknowledged wording afterward.
const L = require('./lib');
const { R, ok } = L.results();
const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const yesterday = L.ymd(new Date(L.NOW - 86400000));
const cases = [
  { source: 'prep', report: 'insights', state: 'stats', collection: 'days', child: 'items', id: 'proof-cache-prep', before: 'Cut brine', original: 'Cut brie', after: 'Cut brie for service' },
  { source: 'orders', report: 'team', state: 'ordStats', collection: 'orders', child: 'lines', id: 'proof-cache-order', before: 'Brine wedges', original: 'Brie wedges', after: 'Brie wedges for service' }
];

(async () => {
  const b = await L.start();
  try {
    for (const c of cases) {
      const path = key(c.collection, yesterday, c.child, c.id), collection = key(c.collection, yesterday, c.child);
      const fixture = { text: c.before, orig: c.original, qty: '2 trays', addedBy: 'Sam', addedById: 'sam', addedAt: L.NOW - 86400000, deleted: false, by: 'sam' };
      if (c.source === 'prep') Object.assign(fixture, { station: 'Larder', recipe: 'laksa', done: true });
      else Object.assign(fixture, { recipes: ['laksa'], ordered: true });
      const p = await L.open(b, '#/admin', { admin: true, who: '', width: 1280, extra: { [path]: fixture }, wait: 1500 });
      try {
        await L.adminTab(p, 'proofreader');
        await L.waitFor(p, () => {
          const s = LK_PREP.state;
          return !!document.querySelector('.pr-workspace') && s.stats && !s.stats.loading && s.ordStats && !s.ordStats.loading;
        });
        await p.locator('[data-pr="review"]').evaluateAll((nodes, value) => {
          const button = nodes.find(el => el.getAttribute('data-value') === value);
          if (!button) throw Error('Missing correction ' + value);
          button.click();
        }, c.source + '/' + yesterday + '/' + c.id);
        await p.click('[data-pr="edit"]'); await p.fill('#pr-text', c.after);
        await L.adminTab(p, c.report);
        await p.evaluate(({ collection, id }) => {
          const fs = LK_PREP.book().fs(), original = fs.getDocs;
          const held = window.__proofHeldRead = { captured: false, released: false, text: '' };
          fs.getDocs = function (ref) {
            const result = original(ref);
            if ((ref.path || []).join('/') !== collection) return result;
            fs.getDocs = original;
            return result.then(snapshot => new Promise(resolve => {
              held.captured = true;
              const row = snapshot.docs.find(doc => doc.id === id);
              held.text = row && row.data().text;
              held.release = () => { held.released = true; resolve(snapshot); };
            }));
          };
        }, { collection, id: c.id });
        await p.locator('[data-p="stats-refresh"]').first().click();
        await L.waitFor(p, () => window.__proofHeldRead.captured);
        ok(await p.evaluate(before => window.__proofHeldRead.text === before, c.before), c.source + ': legacy Refresh captured the old saved wording before repair');
        await p.click('.pr-resume [data-pr="resume"]');
        ok(await p.inputValue('#pr-text') === c.after && await p.evaluate(name => LK_PREP.state[name].loading, c.state), c.source + ': Resume retains the proposed correction while its report Refresh is still pending');
        await p.click('[data-pr="save"]');
        await L.waitFor(p, () => /Correction saved/.test((document.querySelector('.pr-status') || {}).textContent || '') && !LK_PROOFREADER.busy());
        ok(await p.evaluate(({ path, after }) => window.__fake.dump()[path].text === after && !window.__proofHeldRead.released, { path, after: c.after }), c.source + ': repair acknowledges before the earlier report snapshot is released');
        await p.evaluate(() => window.__proofHeldRead.release());
        await L.waitFor(p, name => { const st = LK_PREP.state[name]; return st && !st.loading && !st.busy; }, c.state);
        await L.settle(p, 200);
        const cache = await p.evaluate(({ source, name, day, id }) => {
          const st = LK_PREP.state[name], rows = source === 'prep' ? st.days[day] || [] : st.raw || [];
          const row = rows.find(x => x.id === id && (source === 'prep' || x.date === day));
          return row && { text: row.text, v: row.proofV };
        }, { source: c.source, name: c.state, day: yesterday, id: c.id });
        ok(cache && cache.text === c.after && cache.v === 1, c.source + ': the late pre-repair report answer cannot overwrite the acknowledged cache ' + JSON.stringify(cache));
        const rowText = await p.evaluate(value => {
          const button = [...document.querySelectorAll('.pr-list [data-pr="review"]')].find(el => el.getAttribute('data-value') === value);
          return button && button.textContent;
        }, c.source + '/' + yesterday + '/' + c.id);
        ok(!!rowText && rowText.includes(c.after) && !rowText.includes(c.before), c.source + ': the correction queue keeps the acknowledged wording after the old report read finishes');
        ok(!p.errors.length, c.source + ': no browser errors ' + p.errors.join(' | '));
      } finally { await p.context().close(); }
    }
  } finally { await b.close(); }
  L.report(R);
})();
